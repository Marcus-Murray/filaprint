import { createLogger } from '../utils/logger.js';
import { logDatabaseOperation } from '../middleware/auditLogger.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import { bambuMQTTService, BambuMQTTConfig } from './mqttService.js';
import { liveDataService } from './liveDataService.js';
import { PrinterDB, LiveDataDB } from '../database/services.js';
import type {
  Printer,
  NewPrinter,
  LiveData as LiveDataType,
} from '../database/schema.js';

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
  liveData: any; // Will be H2DLiveData when available
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
  async addPrinter(config: PrinterConfig, req?: any): Promise<Printer> {
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
  async removePrinter(printerId: string, req?: any): Promise<void> {
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
    req?: any
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

    return status || null;
  }

  /**
   * Get all printer statuses
   */
  getAllPrinterStatuses(): PrinterStatus[] {
    return Array.from(this.printerStatuses.values());
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
      const liveData = liveDataService.getCurrentLiveData(printer.serialNumber);

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
   */
  private setupMQTTEventHandlers(): void {
    // Handle live data updates
    // bambuMQTTService.onLiveData((serialNumber, data) => {
    // Find printer by serial number
    // this.findPrinterBySerialNumber(serialNumber).then(printer => {
    //   if (printer) {
    //     // Update live data in service
    //     liveDataService.storeLiveData(serialNumber, data);
    //     // Update printer status
    //     const status = this.printerStatuses.get(printer.id);
    //     if (status) {
    //       status.liveData = data;
    //       status.lastSeen = new Date().toISOString();
    //       this.printerStatuses.set(printer.id, status);
    //       // Notify connection handlers
    //       const handler = this.connectionHandlers.get(printer.id);
    //       if (handler) {
    //         handler(status);
    //       }
    //     }
    //   }
    // });
    // });
    // Handle connection status changes
    // bambuMQTTService.onConnectionStatus((serialNumber, isConnected) => {
    // this.findPrinterBySerialNumber(serialNumber).then(printer => {
    //   if (printer) {
    //     const status = this.printerStatuses.get(printer.id);
    //     if (status) {
    //       status.connectionStatus = isConnected
    //         ? 'connected'
    //         : 'disconnected';
    //       status.lastSeen = new Date().toISOString();
    //       this.printerStatuses.set(printer.id, status);
    //       // Notify connection handlers
    //       const handler = this.connectionHandlers.get(printer.id);
    //       if (handler) {
    //         handler(status);
    //       }
    //     }
    //   }
    // });
    // });
  }

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
