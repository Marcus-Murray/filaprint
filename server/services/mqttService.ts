import mqtt, { MqttClient } from 'mqtt';
import { createLogger } from '../utils/logger.js';
import { logMQTTEvent } from '../middleware/auditLogger.js';
import { mqttErrorHandler } from '../middleware/errorHandler.js';

const logger = createLogger('mqtt-service');

// Bambu Labs H2D MQTT Configuration
export interface BambuMQTTConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  serialNumber: string;
  accessCode: string;
  keepalive?: number;
  reconnectPeriod?: number;
  connectTimeout?: number;
}

// H2D Data Types
export interface H2DTemperatureData {
  nozzle1: number;
  nozzle2: number;
  bed: number;
  chamber: number;
}

export interface H2DHumidityData {
  slot1: number;
  slot2: number;
  slot3: number;
  slot4: number;
  average: number;
}

export interface H2DProgressData {
  percentage: number;
  remainingTime: number;
  currentLayer: number;
  totalLayers: number;
}

export interface H2DStatusData {
  status: 'idle' | 'printing' | 'paused' | 'error' | 'completed';
  errorCode?: string;
  errorMessage?: string;
}

export interface H2DLiveData {
  timestamp: string;
  printerId: string;
  temperatures: H2DTemperatureData;
  humidity: H2DHumidityData;
  progress: H2DProgressData;
  status: H2DStatusData;
  connectionStatus: 'connected' | 'disconnected' | 'error';
}

// Bambu Labs MQTT Service
export class BambuMQTTService {
  private client: MqttClient | null = null;
  private config: BambuMQTTConfig | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private messageHandlers: Map<string, (data: H2DLiveData) => void> = new Map();

  constructor() {
    this.setupEventHandlers();
  }

  /**
   * Connect to Bambu Labs H2D printer via MQTT
   */
  async connect(config: BambuMQTTConfig): Promise<void> {
    try {
      this.config = config;

      logger.info('Connecting to Bambu Labs H2D printer', {
        host: config.host,
        port: config.port,
        serialNumber: config.serialNumber,
      });

      // MQTT connection options
      const mqttOptions = {
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        keepalive: config.keepalive || 60,
        reconnectPeriod: config.reconnectPeriod || 5000,
        connectTimeout: config.connectTimeout || 30000,
        clean: true,
        clientId: `filaprint_${config.serialNumber}_${Date.now()}`,
        protocol: 'mqtts' as const, // Use secure MQTT
        rejectUnauthorized: false, // For self-signed certificates
      };

      // Create MQTT client
      this.client = mqtt.connect(mqttOptions);

      // Set up connection promise
      return new Promise((resolve, reject) => {
        if (!this.client) {
          reject(new Error('Failed to create MQTT client'));
          return;
        }

        const connectTimeout = setTimeout(() => {
          reject(new Error('MQTT connection timeout'));
        }, 30000);

        this.client.on('connect', () => {
          clearTimeout(connectTimeout);
          this.isConnected = true;
          this.reconnectAttempts = 0;

          logger.info('Successfully connected to Bambu Labs H2D', {
            serialNumber: config.serialNumber,
            host: config.host,
          });

          logMQTTEvent('connect', config.serialNumber, {
            host: config.host,
            port: config.port,
          });

          resolve();
        });

        this.client.on('error', error => {
          clearTimeout(connectTimeout);
          logger.error('MQTT connection error', { error: error.message });
          reject(mqttErrorHandler(error));
        });
      });
    } catch (error) {
      logger.error('Failed to connect to Bambu Labs H2D', { error });
      throw mqttErrorHandler(error);
    }
  }

  /**
   * Disconnect from the printer
   */
  async disconnect(): Promise<void> {
    try {
      if (this.client && this.isConnected) {
        logger.info('Disconnecting from Bambu Labs H2D');

        this.client.end();
        this.isConnected = false;

        if (this.reconnectInterval) {
          clearInterval(this.reconnectInterval);
          this.reconnectInterval = null;
        }

        logMQTTEvent('disconnect', this.config?.serialNumber);

        logger.info('Successfully disconnected from Bambu Labs H2D');
      }
    } catch (error) {
      logger.error('Error disconnecting from printer', { error });
      throw mqttErrorHandler(error);
    }
  }

  /**
   * Subscribe to printer data topics
   */
  async subscribeToTopics(serialNumber?: string): Promise<void> {
    if (!this.client || !this.config) return;

    const targetSerialNumber = serialNumber || this.config.serialNumber;
    const topics = [
      `device/${targetSerialNumber}/report`, // Main status reports
      `device/${targetSerialNumber}/status`, // Status updates
      `device/${targetSerialNumber}/progress`, // Print progress
      `device/${targetSerialNumber}/ams`, // AMS2 Pro data
    ];

    for (const topic of topics) {
      this.client.subscribe(topic, error => {
        if (error) {
          logger.error(`Failed to subscribe to topic ${topic}`, {
            error: error.message,
          });
        } else {
          logger.info(`Subscribed to topic: ${topic}`);
        }
      });
    }

    // Set up MQTT event handlers after subscribing
    this.setupMQTTEventHandlers();
  }

  /**
   * Send command to printer
   */
  async sendCommand(
    command: string,
    payload: Record<string, unknown> = {}
  ): Promise<void> {
    if (!this.client || !this.isConnected || !this.config) {
      throw new Error('Not connected to printer');
    }

    try {
      const topic = `device/${this.config.serialNumber}/request`;
      const message = JSON.stringify({
        command,
        payload,
        timestamp: Date.now(),
      });

      logger.info('Sending command to printer', {
        command,
        topic,
        payload,
      });

      this.client.publish(topic, message, error => {
        if (error) {
          logger.error('Failed to send command', {
            error: error.message,
            command,
          });
          throw mqttErrorHandler(error);
        } else {
          logger.info('Command sent successfully', { command });
          logMQTTEvent('message_sent', this.config!.serialNumber, {
            command,
            payload,
          });
        }
      });
    } catch (error) {
      logger.error('Error sending command to printer', { error, command });
      throw mqttErrorHandler(error);
    }
  }

  /**
   * Parse H2D live data from MQTT message
   */
  private parseH2DData(topic: string, message: Buffer): H2DLiveData | null {
    try {
      const data = JSON.parse(message.toString());
      const serialNumber = this.config?.serialNumber || 'unknown';

      // Parse different types of messages
      if (topic.includes('/report')) {
        return this.parseStatusReport(data, serialNumber);
      } else if (topic.includes('/status')) {
        return this.parseStatusUpdate(data, serialNumber);
      } else if (topic.includes('/progress')) {
        return this.parseProgressUpdate(data, serialNumber);
      } else if (topic.includes('/ams')) {
        return this.parseAMSData(data, serialNumber);
      }

      return null;
    } catch (error) {
      logger.error('Failed to parse H2D data', {
        error,
        topic,
        message: message.toString(),
      });
      return null;
    }
  }

  /**
   * Parse status report data
   */
  private parseStatusReport(data: any, serialNumber: string): H2DLiveData {
    const now = new Date().toISOString();

    return {
      timestamp: now,
      printerId: serialNumber,
      temperatures: {
        nozzle1: data.print?.nozzle_temper?.nozzle_1 || 0,
        nozzle2: data.print?.nozzle_temper?.nozzle_2 || 0,
        bed: data.print?.bed_temper || 0,
        chamber: data.print?.chamber_temper || 0,
      },
      humidity: {
        slot1: data.ams?.ams?.tray[0]?.humidity || 0,
        slot2: data.ams?.ams?.tray[1]?.humidity || 0,
        slot3: data.ams?.ams?.tray[2]?.humidity || 0,
        slot4: data.ams?.ams?.tray[3]?.humidity || 0,
        average: this.calculateAverageHumidity(data.ams?.ams?.tray || []),
      },
      progress: {
        percentage: data.print?.mc_percent || 0,
        remainingTime: data.print?.mc_remaining_time || 0,
        currentLayer: data.print?.layer_num || 0,
        totalLayers: data.print?.total_layer_num || 0,
      },
      status: {
        status: this.mapPrinterStatus(data.print?.mc_print_stage),
        errorCode: data.print?.mc_error_code,
        errorMessage: data.print?.mc_error_msg,
      },
      connectionStatus: 'connected',
    };
  }

  /**
   * Parse status update data
   */
  private parseStatusUpdate(data: any, serialNumber: string): H2DLiveData {
    const now = new Date().toISOString();

    return {
      timestamp: now,
      printerId: serialNumber,
      temperatures: {
        nozzle1: data.nozzle_temper?.nozzle_1 || 0,
        nozzle2: data.nozzle_temper?.nozzle_2 || 0,
        bed: data.bed_temper || 0,
        chamber: data.chamber_temper || 0,
      },
      humidity: {
        slot1: data.ams?.tray[0]?.humidity || 0,
        slot2: data.ams?.tray[1]?.humidity || 0,
        slot3: data.ams?.tray[2]?.humidity || 0,
        slot4: data.ams?.tray[3]?.humidity || 0,
        average: this.calculateAverageHumidity(data.ams?.tray || []),
      },
      progress: {
        percentage: data.mc_percent || 0,
        remainingTime: data.mc_remaining_time || 0,
        currentLayer: data.layer_num || 0,
        totalLayers: data.total_layer_num || 0,
      },
      status: {
        status: this.mapPrinterStatus(data.mc_print_stage),
        errorCode: data.mc_error_code,
        errorMessage: data.mc_error_msg,
      },
      connectionStatus: 'connected',
    };
  }

  /**
   * Parse progress update data
   */
  private parseProgressUpdate(data: any, serialNumber: string): H2DLiveData {
    const now = new Date().toISOString();

    return {
      timestamp: now,
      printerId: serialNumber,
      temperatures: {
        nozzle1: 0,
        nozzle2: 0,
        bed: 0,
        chamber: 0,
      },
      humidity: {
        slot1: 0,
        slot2: 0,
        slot3: 0,
        slot4: 0,
        average: 0,
      },
      progress: {
        percentage: data.mc_percent || 0,
        remainingTime: data.mc_remaining_time || 0,
        currentLayer: data.layer_num || 0,
        totalLayers: data.total_layer_num || 0,
      },
      status: {
        status: this.mapPrinterStatus(data.mc_print_stage),
        errorCode: data.mc_error_code,
        errorMessage: data.mc_error_msg,
      },
      connectionStatus: 'connected',
    };
  }

  /**
   * Parse AMS2 Pro data
   */
  private parseAMSData(data: any, serialNumber: string): H2DLiveData {
    const now = new Date().toISOString();

    return {
      timestamp: now,
      printerId: serialNumber,
      temperatures: {
        nozzle1: 0,
        nozzle2: 0,
        bed: 0,
        chamber: 0,
      },
      humidity: {
        slot1: data.tray[0]?.humidity || 0,
        slot2: data.tray[1]?.humidity || 0,
        slot3: data.tray[2]?.humidity || 0,
        slot4: data.tray[3]?.humidity || 0,
        average: this.calculateAverageHumidity(data.tray || []),
      },
      progress: {
        percentage: 0,
        remainingTime: 0,
        currentLayer: 0,
        totalLayers: 0,
      },
      status: {
        status: 'idle',
      },
      connectionStatus: 'connected',
    };
  }

  /**
   * Calculate average humidity from AMS slots
   */
  private calculateAverageHumidity(trays: any[]): number {
    if (!trays || trays.length === 0) return 0;

    const validHumidities = trays
      .map(tray => tray.humidity)
      .filter(humidity => typeof humidity === 'number' && humidity > 0);

    if (validHumidities.length === 0) return 0;

    return (
      validHumidities.reduce((sum, humidity) => sum + humidity, 0) /
      validHumidities.length
    );
  }

  /**
   * Map printer status from Bambu Labs format to our format
   */
  private mapPrinterStatus(
    stage: number
  ): 'idle' | 'printing' | 'paused' | 'error' | 'completed' {
    switch (stage) {
      case 0:
        return 'idle';
      case 1:
        return 'printing';
      case 2:
        return 'paused';
      case 3:
        return 'error';
      case 4:
        return 'completed';
      default:
        return 'idle';
    }
  }

  /**
   * Set up event handlers
   */
  private setupEventHandlers(): void {
    // This will be called when the client is created
  }

  /**
   * Set up MQTT client event handlers
   */
  private setupMQTTEventHandlers(): void {
    if (!this.client) return;

    this.client.on('message', (topic, message) => {
      try {
        logger.debug('Received MQTT message', {
          topic,
          messageSize: message.length,
        });

        const liveData = this.parseH2DData(topic, message);
        if (liveData) {
          logMQTTEvent('message_received', liveData.printerId, {
            topic,
            dataSize: message.length,
          });

          // Notify all registered handlers
          this.messageHandlers.forEach(handler => {
            try {
              handler(liveData);
            } catch (error) {
              logger.error('Error in message handler', { error, topic });
            }
          });
        }
      } catch (error) {
        logger.error('Error processing MQTT message', { error, topic });
      }
    });

    this.client.on('error', error => {
      logger.error('MQTT client error', { error: error.message });
      logMQTTEvent('error', this.config?.serialNumber, {
        error: error.message,
      });
    });

    this.client.on('close', () => {
      logger.warn('MQTT connection closed');
      this.isConnected = false;
      this.handleReconnection();
    });

    this.client.on('offline', () => {
      logger.warn('MQTT client offline');
      this.isConnected = false;
    });

    this.client.on('reconnect', () => {
      logger.info('MQTT client reconnecting');
      this.reconnectAttempts++;
    });
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached');
      return;
    }

    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
    }

    this.reconnectInterval = setInterval(() => {
      if (!this.isConnected && this.config) {
        logger.info('Attempting to reconnect to printer', {
          attempt: this.reconnectAttempts + 1,
          maxAttempts: this.maxReconnectAttempts,
        });

        this.connect(this.config).catch(error => {
          logger.error('Reconnection failed', { error });
        });
      }
    }, 5000);
  }

  /**
   * Register a message handler
   */
  onMessage(handlerId: string, handler: (data: H2DLiveData) => void): void {
    this.messageHandlers.set(handlerId, handler);
  }

  /**
   * Unregister a message handler
   */
  offMessage(handlerId: string): void {
    this.messageHandlers.delete(handlerId);
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): { connected: boolean; printerId?: string } {
    const printerId = this.config?.serialNumber;
    return {
      connected: this.isConnected,
      ...(printerId ? { printerId } : {}),
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): BambuMQTTConfig | null {
    return this.config;
  }
}

// Export singleton instance
export const bambuMQTTService = new BambuMQTTService();
