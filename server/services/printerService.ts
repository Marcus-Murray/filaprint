import { createLogger } from '../utils/logger.js';
import { logDatabaseOperation } from '../middleware/auditLogger.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import { bambuMQTTService, BambuMQTTConfig, H2DLiveData } from './mqttService.js';
import { liveDataService } from './liveDataService.js';
import { PrinterDB, LiveDataDB } from '../database/services.js';
import type {
  Printer,
  NewPrinter,
  LiveData as LiveDataType,
} from '../database/schema.js';
import type { Request as ExpressRequest } from 'express';

const logger = createLogger('printer-service');

// Printer Configuration
export interface PrinterConfig {
  id: string;
  name: string;
  model: string;
  serialNumber: string;
  ipAddress: string;
  accessCode: string;
  description?: string;
  userId: string;
  mqttConfig: BambuMQTTConfig;
}

// Printer Status
export interface PrinterStatus {
  id: string;
  name: string;
  model: string;
  serialNumber: string;
  connectionStatus: 'connected' | 'disconnected' | 'error' | 'connecting';
  lastSeen: string;
  liveData: H2DLiveData | null; // Live data from MQTT
  error?: string;
}

// Printer Management Service
export class PrinterService {
  private printerStatuses: Map<string, PrinterStatus> = new Map();
  private connectionHandlers: Map<string, (status: PrinterStatus) => void> =
    new Map();

  constructor() {
    this.setupMQTTEventHandlers();
  }

  /**
   * Add a new printer
   */
  async addPrinter(config: PrinterConfig, req?: Express.Request): Promise<Printer> {
    try {
      logger.info('Adding new printer', {
        name: config.name,
        serialNumber: config.serialNumber,
        userId: config.userId,
      });

      // Check if printer already exists
      const existingPrinter = await PrinterDB.findBySerialNumber(
        config.serialNumber
      );
      if (existingPrinter) {
        throw new Error(
          `Printer with serial number ${config.serialNumber} already exists`
        );
      }

      // Create printer in database with encrypted sensitive fields
      const newPrinter: NewPrinter = {
        id: config.id,
        userId: config.userId,
        name: config.name,
        model: config.model,
        serialNumber: config.serialNumber,
        ipAddress: config.ipAddress,
        accessCode: encrypt(config.accessCode),
        description: config.description,
        mqttHost: config.mqttConfig.host,
        mqttPort: config.mqttConfig.port,
        mqttUsername: config.mqttConfig.username,
        mqttPassword: encrypt(config.mqttConfig.password),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const printer = await PrinterDB.create(newPrinter);

      // Initialize printer status
      const status: PrinterStatus = {
        id: printer.id,
        name: printer.name,
        model: printer.model,
        serialNumber: printer.serialNumber,
        connectionStatus: 'disconnected',
        lastSeen: new Date().toISOString(),
        liveData: null,
      };

      this.printerStatuses.set(printer.id, status);

      // Log database operation
      logDatabaseOperation(
        'create',
        'printer',
        printer.id,
        {
          name: printer.name,
          serialNumber: printer.serialNumber,
          userId: printer.userId,
        },
        req
      );

      logger.info('Printer added successfully', {
        printerId: printer.id,
        name: printer.name,
        serialNumber: printer.serialNumber,
      });

      return printer;
    } catch (error) {
      logger.error('Failed to add printer', {
        error,
        name: config.name,
        serialNumber: config.serialNumber,
      });
      throw error;
    }
  }

  /**
   * Remove a printer
   */
  async removePrinter(printerId: string, req?: Express.Request): Promise<void> {
    try {
      logger.info('Removing printer', { printerId });

      // Disconnect printer if connected
      await this.disconnectPrinter(printerId);

      // Remove from database
      await PrinterDB.delete(printerId);

      // Remove from status tracking
      this.printerStatuses.delete(printerId);

      // Log database operation
      logDatabaseOperation('delete', 'printer', printerId, undefined, req);

      logger.info('Printer removed successfully', { printerId });
    } catch (error) {
      logger.error('Failed to remove printer', { error, printerId });
      throw error;
    }
  }

  /**
   * Load all printers on startup and attempt to connect them
   */
  async loadPrintersOnStartup(): Promise<void> {
    try {
      logger.info('Loading printers on startup...');
      const printers = await PrinterDB.findAll();

      logger.info(`Found ${printers.length} printer(s) to load`);

      // Initialize status for each printer
      for (const printer of printers) {
        const status: PrinterStatus = {
          id: printer.id,
          name: printer.name,
          model: printer.model,
          serialNumber: printer.serialNumber,
          connectionStatus: 'disconnected',
          lastSeen: new Date().toISOString(),
          liveData: null,
        };
        this.printerStatuses.set(printer.id, status);
      }

      // Attempt to auto-connect all printers
      // Note: We'll try to connect, but failures are non-fatal
      const connectPromises = printers.map(async (printer) => {
        try {
          logger.info(`Attempting to auto-connect printer: ${printer.name} (${printer.id})`);
          await this.connectPrinter(printer.id);
          logger.info(`Successfully auto-connected printer: ${printer.name}`);
        } catch (error) {
          logger.warn(`Failed to auto-connect printer ${printer.name}:`, {
            error: error instanceof Error ? error.message : error,
            printerId: printer.id,
          });
          // Update status to error but don't throw
          const status = this.printerStatuses.get(printer.id);
          if (status) {
            status.connectionStatus = 'error';
            status.error = error instanceof Error ? error.message : 'Connection failed';
            this.printerStatuses.set(printer.id, status);
          }
        }
      });

      await Promise.allSettled(connectPromises);

      const connectedCount = Array.from(this.printerStatuses.values()).filter(
        (s) => s.connectionStatus === 'connected'
      ).length;

      logger.info(`Startup complete: ${connectedCount}/${printers.length} printer(s) connected`);
    } catch (error) {
      logger.error('Failed to load printers on startup', { error });
      // Don't throw - we want the server to start even if this fails
    }
  }

  /**
   * Get all printers
   */
  async getAllPrinters(): Promise<Printer[]> {
    try {
      const printers = await PrinterDB.findAll();
      logger.debug('Retrieved all printers', { count: printers.length });
      return printers;
    } catch (error) {
      logger.error('Failed to get all printers', { error });
      throw error;
    }
  }

  /**
   * Get printer by ID
   */
  async getPrinterById(printerId: string): Promise<Printer | null> {
    try {
      const printer = await PrinterDB.findById(printerId);
      logger.debug('Retrieved printer by ID', { printerId, found: !!printer });
      return printer;
    } catch (error) {
      logger.error('Failed to get printer by ID', { error, printerId });
      throw error;
    }
  }

  /**
   * Update printer configuration
   */
  async updatePrinter(
    printerId: string,
    updates: Partial<PrinterConfig>,
    req?: ExpressRequest
  ): Promise<Printer> {
    try {
      logger.info('Updating printer', {
        printerId,
        updates: Object.keys(updates),
      });

      // Get current printer
      const currentPrinter = await PrinterDB.findById(printerId);
      if (!currentPrinter) {
        throw new Error(`Printer with ID ${printerId} not found`);
      }

      // Prepare database updates
      const dbUpdates: Partial<NewPrinter> = {
        updatedAt: new Date().toISOString(),
      };

      if (updates.name) dbUpdates.name = updates.name;
      if (updates.model) dbUpdates.model = updates.model;
      if (updates.ipAddress) dbUpdates.ipAddress = updates.ipAddress;
      if (updates.accessCode)
        dbUpdates.accessCode = encrypt(updates.accessCode);
      if (updates.description !== undefined)
        dbUpdates.description = updates.description;
      if (updates.mqttConfig) {
        dbUpdates.mqttHost = updates.mqttConfig.host;
        dbUpdates.mqttPort = updates.mqttConfig.port;
        dbUpdates.mqttUsername = updates.mqttConfig.username;
        dbUpdates.mqttPassword = encrypt(updates.mqttConfig.password);
      }

      // Update in database
      const updatedPrinter = await PrinterDB.update(printerId, dbUpdates);

      // Update status if name changed
      if (updates.name && this.printerStatuses.has(printerId)) {
        const status = this.printerStatuses.get(printerId)!;
        status.name = updates.name;
        this.printerStatuses.set(printerId, status);
      }

      // Log database operation
      logDatabaseOperation(
        'update',
        'printer',
        printerId,
        {
          updates: Object.keys(updates),
        },
        req
      );

      logger.info('Printer updated successfully', {
        printerId,
        updates: Object.keys(updates),
      });

      return updatedPrinter;
    } catch (error) {
      logger.error('Failed to update printer', { error, printerId });
      throw error;
    }
  }

  /**
   * Connect to printer
   */
  async connectPrinter(printerId: string): Promise<void> {
    try {
      logger.info('Connecting to printer', { printerId });

      const printer = await PrinterDB.findById(printerId);
      if (!printer) {
        throw new Error(`Printer with ID ${printerId} not found`);
      }

      // Update status to connecting
      const status = this.printerStatuses.get(printerId);
      if (status) {
        status.connectionStatus = 'connecting';
        this.printerStatuses.set(printerId, status);
      }

      // Configure MQTT connection with decrypted credentials
      const mqttConfig: BambuMQTTConfig = {
        host: printer.mqttHost,
        port: printer.mqttPort,
        username: printer.mqttUsername,
        password: decrypt(printer.mqttPassword),
        serialNumber: printer.serialNumber,
        accessCode: decrypt(printer.accessCode),
      };

      // Connect to MQTT
      await bambuMQTTService.connect(mqttConfig);

      // Subscribe to printer topics
      await bambuMQTTService.subscribeToTopics(printer.serialNumber);

      // Update status to connected
      if (status) {
        status.connectionStatus = 'connected';
        status.lastSeen = new Date().toISOString();
        delete status.error;
        this.printerStatuses.set(printerId, status);
      }

      logger.info('Printer connected successfully', {
        printerId,
        serialNumber: printer.serialNumber,
      });
    } catch (error) {
      logger.error('Failed to connect to printer', { error, printerId });

      // Update status to error
      const status = this.printerStatuses.get(printerId);
      if (status) {
        status.connectionStatus = 'error';
        status.error = error instanceof Error ? error.message : 'Unknown error';
        this.printerStatuses.set(printerId, status);
      }

      throw error;
    }
  }

  /**
   * Disconnect from printer
   */
  async disconnectPrinter(printerId: string): Promise<void> {
    try {
      logger.info('Disconnecting from printer', { printerId });

      const printer = await PrinterDB.findById(printerId);
      if (!printer) {
        logger.warn('Printer not found for disconnection', { printerId });
        return;
      }

      // Disconnect MQTT
      await bambuMQTTService.disconnect();

      // Update status
      const status = this.printerStatuses.get(printerId);
      if (status) {
        status.connectionStatus = 'disconnected';
        status.lastSeen = new Date().toISOString();
        this.printerStatuses.set(printerId, status);
      }

      logger.info('Printer disconnected successfully', {
        printerId,
        serialNumber: printer.serialNumber,
      });
    } catch (error) {
      logger.error('Failed to disconnect from printer', { error, printerId });
      throw error;
    }
  }

  /**
   * Get printer status
   * Creates a default status if one doesn't exist (for newly added printers)
   * Includes latest live data if available
   */
  async getPrinterStatus(printerId: string): Promise<PrinterStatus | null> {
    let status = this.printerStatuses.get(printerId);

    // If status doesn't exist, try to create one from the printer database
    if (!status) {
      try {
        const printer = await PrinterDB.findById(printerId);
        if (printer) {
          status = {
            id: printer.id,
            name: printer.name,
            model: printer.model,
            serialNumber: printer.serialNumber,
            connectionStatus: 'disconnected',
            lastSeen: new Date().toISOString(),
            liveData: null,
          };
          this.printerStatuses.set(printerId, status);
          logger.debug('Created default status for printer', { printerId });
        }
      } catch (error) {
        logger.error('Failed to get printer for status creation', { error, printerId });
      }
    }

    // If printer is connected, try to get latest live data
    if (status && status.connectionStatus === 'connected') {
      try {
        const printer = await PrinterDB.findById(printerId);
        if (printer) {
          const liveData = await liveDataService.getCurrentLiveData(printer.serialNumber);
          if (liveData) {
            status.liveData = liveData;
            status.lastSeen = liveData.timestamp || status.lastSeen;
          }
        }
      } catch (error) {
        logger.debug('Failed to fetch live data for status', { error, printerId });
        // Don't throw - status is still valid without live data
      }
    }

    return status || null;
  }

  /**
   * Get all printer statuses with live data
   */
  async getAllPrinterStatuses(): Promise<PrinterStatus[]> {
    const statuses = Array.from(this.printerStatuses.values());

    // For each connected printer, try to fetch latest live data
    const statusesWithLiveData = await Promise.all(
      statuses.map(async (status) => {
        if (status.connectionStatus === 'connected') {
          try {
            const printer = await PrinterDB.findById(status.id);
            if (printer) {
              const liveData = await liveDataService.getCurrentLiveData(printer.serialNumber);
              if (liveData) {
                return {
                  ...status,
                  liveData,
                  lastSeen: liveData.timestamp || status.lastSeen,
                };
              }
            }
          } catch (error) {
            logger.debug('Failed to fetch live data for status', { error, printerId: status.id });
            // Return status without live data update
          }
        }
        return status;
      })
    );

    return statusesWithLiveData;
  }

  /**
   * Send command to printer
   */
  async sendCommand(
    printerId: string,
    command: string,
    params: any = {}
  ): Promise<void> {
    try {
      logger.info('Sending command to printer', {
        printerId,
        command,
        params,
      });

      const printer = await PrinterDB.findById(printerId);
      if (!printer) {
        throw new Error(`Printer with ID ${printerId} not found`);
      }

      // Check if printer is connected
      const status = this.printerStatuses.get(printerId);
      if (!status || status.connectionStatus !== 'connected') {
        throw new Error(`Printer ${printerId} is not connected`);
      }

      // Send command via MQTT (sendCommand takes command and payload, not serialNumber)
      await bambuMQTTService.sendCommand(command, params);

      logger.info('Command sent successfully', {
        printerId,
        command,
        serialNumber: printer.serialNumber,
      });
    } catch (error) {
      logger.error('Failed to send command to printer', {
        error,
        printerId,
        command,
      });
      throw error;
    }
  }

  /**
   * Get live data for printer
   */
  async getLiveData(printerId: string): Promise<any> {
    try {
      const printer = await PrinterDB.findById(printerId);
      if (!printer) {
        throw new Error(`Printer with ID ${printerId} not found`);
      }

      // Get live data from service
      const liveData = await liveDataService.getCurrentLiveData(printer.serialNumber);

      // Store in database for historical tracking
      if (liveData) {
        await LiveDataDB.create({
          id: `live_data_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
          printerId: printer.id,
          timestamp: new Date().toISOString(),
          data: JSON.stringify(liveData),
          createdAt: new Date().toISOString(),
        });
      }

      return liveData;
    } catch (error) {
      logger.error('Failed to get live data', { error, printerId });
      throw error;
    }
  }

  /**
   * Get live data history for printer
   */
  async getLiveDataHistory(
    printerId: string,
    limit: number = 100
  ): Promise<any[]> {
    try {
      const printer = await PrinterDB.findById(printerId);
      if (!printer) {
        throw new Error(`Printer with ID ${printerId} not found`);
      }

      // Get from database
      const history = await LiveDataDB.findByPrinterId(printerId, limit);
      return history.map((record: LiveDataType) => ({
        timestamp: record.timestamp,
        data: JSON.parse(record.data),
      }));
    } catch (error) {
      logger.error('Failed to get live data history', { error, printerId });
      throw error;
    }
  }

  /**
   * Setup MQTT event handlers
   * This is called once in constructor to register the handler for all printers
   */
  private setupMQTTEventHandlers(): void {
    // Register handler for live data updates (only once)
    // The handler ID must be unique - use a constant to avoid duplicate registrations
    const handlerId = 'printerService';

    // Check if handler already exists to avoid duplicate registrations
    if (this.messageHandlerRegistered) {
      logger.debug('MQTT message handler already registered');
      return;
    }

      bambuMQTTService.onMessage(handlerId, async (liveData: H2DLiveData) => {
      try {
        logger.debug('Received live data from MQTT', {
          printerId: liveData.printerId,
          timestamp: liveData.timestamp,
          status: liveData.status?.status,
        });

        // Store live data in the service (uses serialNumber as printerId)
        await liveDataService.storeLiveData(liveData);

        // Find printer by serial number (liveData.printerId is the serialNumber)
        const printer = await this.findPrinterBySerialNumber(liveData.printerId);

        if (printer) {
          logger.debug('Found printer for live data update', {
            printerId: printer.id,
            serialNumber: printer.serialNumber,
          });

          // Update printer status with live data
          const status = this.printerStatuses.get(printer.id);
          if (status) {
            status.liveData = liveData;
            status.lastSeen = liveData.timestamp || new Date().toISOString();
            this.printerStatuses.set(printer.id, status);

            logger.debug('Updated printer status with live data', {
              printerId: printer.id,
              hasLiveData: !!liveData,
            });

            // Notify connection handlers
            const handler = this.connectionHandlers.get(printer.id);
            if (handler) {
              handler(status);
            }
          } else {
            logger.warn('No printer status found for printer', {
              printerId: printer.id,
              serialNumber: printer.serialNumber,
            });
          }
        } else {
          logger.warn('No printer found for serial number', {
            serialNumber: liveData.printerId,
          });
        }
      } catch (error) {
        logger.error('Error handling live data update', {
          error,
          printerId: liveData.printerId,
        });
      }
    });

    this.messageHandlerRegistered = true;
    logger.info('MQTT message handler registered for printerService');
  }

  private messageHandlerRegistered = false;

  /**
   * Find printer by serial number
   */
  private async findPrinterBySerialNumber(
    serialNumber: string
  ): Promise<Printer | null> {
    try {
      return await PrinterDB.findBySerialNumber(serialNumber);
    } catch (error) {
      logger.error('Failed to find printer by serial number', {
        error,
        serialNumber,
      });
      return null;
    }
  }

  /**
   * Register connection status handler
   */
  onConnectionStatusChange(
    printerId: string,
    handler: (status: PrinterStatus) => void
  ): void {
    this.connectionHandlers.set(printerId, handler);
  }

  /**
   * Unregister connection status handler
   */
  offConnectionStatusChange(printerId: string): void {
    this.connectionHandlers.delete(printerId);
  }
}

// Export singleton instance
export const printerService = new PrinterService();
