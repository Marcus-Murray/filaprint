import mqtt, { MqttClient } from 'mqtt';
import { EventEmitter } from 'events';
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

// Real-time filament usage during printing
export interface H2DFilamentUsage {
  slot: number; // AMS slot (1-4)
  remainingLength?: number; // Remaining filament length in mm (from tray.remain)
  totalLength?: number; // Total filament length (usually 330000mm = 330m)
  usedLength?: number; // Calculated: totalLength - remainingLength
  usedPercentage?: number; // Calculated: (usedLength / totalLength) * 100
  material?: string; // Material type from tray
  color?: string; // Filament color (hex code)
  isActive?: boolean; // Is this slot currently being used (from tray_now)
}

export interface H2DStatusData {
  status: 'idle' | 'printing' | 'paused' | 'error' | 'completed' | 'homing' | 'leveling' | 'heating' | 'cooling';
  errorCode?: string;
  errorMessage?: string;
  detailedStatus?: string; // Human-readable status like "Homing toolhead", "Auto leveling bed"
}

// Filament consumption data from MQTT (for print completion)
export interface H2DFilamentConsumption {
  slot?: number; // AMS slot number (1-4)
  length?: number; // Filament length used in mm
  weight?: number; // Filament weight used in grams
  material?: string; // Material type
  color?: string; // Filament color
  diameter?: number; // Filament diameter in mm (typically 1.75)
}

// Print completion data
export interface H2DPrintCompletionData {
  status: 'completed' | 'failed' | 'cancelled';
  filename?: string;
  jobName?: string;
  duration?: number; // Print duration in seconds
  estimatedFilament?: number; // Estimated filament in grams (from slicer)
  actualFilament?: H2DFilamentConsumption[]; // Actual filament used (from printer)
  layersCompleted?: number;
  totalLayers?: number;
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
  currentPrint?: {
    filename?: string;
    jobName?: string;
    gcodeState?: string;
  };
  printCompletion?: H2DPrintCompletionData; // Added for print completion detection
  filamentUsage?: H2DFilamentUsage[]; // Real-time filament usage per slot
}

// Bambu Labs MQTT Service
export class BambuMQTTService extends EventEmitter {
  private client: MqttClient | null = null;
  private config: BambuMQTTConfig | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private messageHandlers: Map<string, (data: H2DLiveData) => void> = new Map();
  // Store the last raw MQTT message for debugging
  private lastRawMessage: {
    topic: string;
    timestamp: string;
    data: unknown;
    allKeys: string[];
    printKeys?: string[];
  } | null = null;
  // Track previous print status to detect completion
  private previousPrintStatus: Map<string, string> = new Map(); // printerId -> previous status

  constructor() {
    super(); // Call EventEmitter constructor first
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
   * Commands must follow Bambu Labs format:
   * - print commands: { print: { sequence_id: "0", command: "pause|resume|stop" } }
   * - bed commands: { bed: { sequence_id: "0", command: "home" } }
   * - other commands: structured according to Bambu Labs API
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

      // Map our command names to Bambu Labs format
      let bambuCommand: Record<string, unknown>;
      const sequenceId = String(payload.sequence_id || Date.now());

      // Print control commands
      if (command === 'pause_print' || command === 'pause') {
        bambuCommand = {
          print: {
            sequence_id: sequenceId,
            command: 'pause',
          },
        };
      } else if (command === 'resume_print' || command === 'resume') {
        bambuCommand = {
          print: {
            sequence_id: sequenceId,
            command: 'resume',
          },
        };
      } else if (command === 'stop_print' || command === 'stop') {
        bambuCommand = {
          print: {
            sequence_id: sequenceId,
            command: 'stop',
          },
        };
      } else if (command === 'home') {
        // Home command structure
        const axis = (payload.axis as string) || 'all';
        bambuCommand = {
          system: {
            sequence_id: sequenceId,
            command: 'home',
            ...(axis !== 'all' && { axis }),
          },
        };
      } else if (command === 'start_leveling' || command === 'level') {
        // Bed leveling command
        bambuCommand = {
          system: {
            sequence_id: sequenceId,
            command: 'calibration',
            calibration_type: 'line',
          },
        };
      } else {
        // Custom command - use payload directly or wrap it
        bambuCommand = payload && Object.keys(payload).length > 0
          ? payload
          : { [command]: { sequence_id: sequenceId } };
      }

      const message = JSON.stringify(bambuCommand);

      logger.info('Sending command to printer', {
        originalCommand: command,
        bambuCommand,
        topic,
      });

      this.client.publish(topic, message, error => {
        if (error) {
          logger.error('Failed to send command', {
            error: error.message,
            command,
            bambuCommand,
          });
          throw mqttErrorHandler(error);
        } else {
          logger.info('Command sent successfully', {
            command,
            bambuCommand: JSON.stringify(bambuCommand),
          });
          logMQTTEvent('message_sent', this.config!.serialNumber, {
            command,
            bambuCommand,
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

      // Store the raw message for debug endpoint
      this.lastRawMessage = {
        topic,
        timestamp: new Date().toISOString(),
        data,
        allKeys: Object.keys(data),
        printKeys: data.print ? Object.keys(data.print) : undefined,
      };

      // Log the raw data structure for debugging (only first message, then suppress)
      // Use minimal logging to avoid console spam
      if (!this.lastDataStructure) {
        const summary = {
          topic,
          rootKeys: Object.keys(data).length,
          hasPrint: !!data.print,
          printKeys: data.print ? Object.keys(data.print).length : 0,
          nozzleTemper: typeof data.print?.nozzle_temper,
          nozzle1Value: data.print?.nozzle_temper?.[0] || data.print?.nozzle_temper?.nozzle_temp_1 || data.print?.nozzle_temp_1 || 'N/A',
          nozzle2Value: data.print?.nozzle_temper?.[1] || data.print?.nozzle_temper?.nozzle_temp_2 || data.print?.nozzle_temp_2 || 'N/A',
          bedTemp: data.print?.bed_temper || 'N/A',
          chamberTemp: data.print?.chamber_temper || data.print?.chamber_temp || data.chamber_temper || data.chamber_temp || data.chamber || 'N/A',
          chamberFields: {
            print_chamber_temper: data.print?.chamber_temper,
            print_chamber_temp: data.print?.chamber_temp,
            print_chamber: data.print?.chamber,
            root_chamber_temper: data.chamber_temper,
            root_chamber_temp: data.chamber_temp,
            root_chamber: data.chamber,
          },
          hasAMS: !!data.ams,
          amsStructure: data.ams ? {
            keys: Object.keys(data.ams),
            has_ams_tray: !!data.ams.ams?.tray,
            has_tray: !!data.ams.tray,
            tray_type: Array.isArray(data.ams.tray) ? 'array' : typeof data.ams.tray,
            tray_sample: data.ams.tray && Array.isArray(data.ams.tray) ? data.ams.tray[0] : 'N/A',
          } : 'N/A',
          printProgress: data.print?.mc_percent || 'N/A',
          remainingTimeMinutes: data.print?.mc_remaining_time || 'N/A',
          printStage: data.print?.mc_print_stage || 'N/A',
        };

        // Only log summary, not full data
        logger.info('MQTT data structure summary', summary);
        console.log('✅ MQTT connected - First message structure:');
        console.log(JSON.stringify(summary, null, 2));

        this.lastDataStructure = JSON.stringify(Object.keys(data));
      }
      this.parseCount++;

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
        message: message.toString().substring(0, 200), // First 200 chars only
      });
      return null;
    }
  }

  private lastDataStructure: string | null = null;
  private parseCount = 0;

  /**
   * Parse status report data
   */
  private parseStatusReport(data: any, serialNumber: string): H2DLiveData {
    const now = new Date().toISOString();

    // Try multiple possible structures for nozzle temperatures
    // IMPORTANT: Based on user feedback, Bambu data has nozzle1 = Right, nozzle2 = Left
    // We'll parse both and swap in the return statement
    const nozzleTemp = data.print?.nozzle_temper;
    let nozzle1Data = 0;  // This is Right physically
    let nozzle2Data = 0;  // This is Left physically

    // Try object structure first
    if (nozzleTemp && typeof nozzleTemp === 'object') {
      // Try various field name patterns - nozzle_temp_1 might be an array index or object
      if (Array.isArray(nozzleTemp)) {
        nozzle1Data = nozzleTemp[0] || 0;
        nozzle2Data = nozzleTemp[1] || 0;
      } else {
        // Object with named properties
        nozzle1Data = nozzleTemp.nozzle_temp_1 || nozzleTemp.nozzle_1 || nozzleTemp.nozzle1 ||
                     nozzleTemp[0] || nozzleTemp.temp1 || nozzleTemp.right || 0;
        nozzle2Data = nozzleTemp.nozzle_temp_2 || nozzleTemp.nozzle_2 || nozzleTemp.nozzle2 ||
                     nozzleTemp[1] || nozzleTemp.temp2 || nozzleTemp.left || 0;
      }
    } else if (typeof nozzleTemp === 'number') {
      // Single value - this is the active nozzle temperature
      nozzle1Data = nozzleTemp;
    }

    // Try device.extruder.info structure (ACTUAL location in raw MQTT data!)
    // device.extruder.info[0] = Right nozzle, info[1] = Left nozzle
    // The 'info' field contains encoded temperature (e.g., 79 = 79°C, 30 = 30°C)
    // Also check 'temp' field which might need decoding
    if (data.print?.device?.extruder?.info && Array.isArray(data.print.device.extruder.info)) {
      const nozzleInfo = data.print.device.extruder.info;

      // Debug log the raw values with ALL fields
      logger.info('Extruder info array - ALL FIELDS', {
        length: nozzleInfo.length,
        nozzle0_all: nozzleInfo[0],
        nozzle1_all: nozzleInfo[1],
        nozzle0_keys: nozzleInfo[0] ? Object.keys(nozzleInfo[0]) : [],
        nozzle1_keys: nozzleInfo[1] ? Object.keys(nozzleInfo[1]) : [],
      });

      // Nozzle temperatures from device.extruder.info[].temp
      // Right nozzle (info[0]): temp = 17694990 → 17694990 / 65536 ≈ 270°C
      // Left nozzle (info[1]): temp = 74 → already in degrees
      if (nozzleInfo[0]?.temp !== undefined) {
        const tempValue = Number(nozzleInfo[0].temp);
        if (tempValue > 300) {
          // Encoded: divide by 65536
          nozzle1Data = Math.round(tempValue / 65536); // Right nozzle (active)
        } else if (tempValue >= 0 && tempValue <= 300) {
          nozzle1Data = Math.round(tempValue); // Already in degrees
        }
      }
      if (nozzleInfo[1]?.temp !== undefined) {
        const tempValue = Number(nozzleInfo[1].temp);
        if (tempValue > 300) {
          // Encoded: divide by 65536
          nozzle2Data = Math.round(tempValue / 65536); // Left nozzle (inactive)
        } else if (tempValue >= 0 && tempValue <= 300) {
          nozzle2Data = Math.round(tempValue); // Already in degrees
        }
      }

      // Fallback: check 'info' field (might be the actual temp)
      if (nozzle1Data === 0 && nozzleInfo[0]?.info !== undefined) {
        const infoValue = Number(nozzleInfo[0].info);
        if (!isNaN(infoValue) && infoValue >= 0 && infoValue <= 300) {
          nozzle1Data = infoValue;
        } else if (infoValue > 300) {
          const decoded = infoValue / 65536;
          if (decoded >= 0 && decoded <= 300) {
            nozzle1Data = decoded;
          }
        }
      }
      if (nozzle2Data === 0 && nozzleInfo[1]?.info !== undefined) {
        const infoValue = Number(nozzleInfo[1].info);
        if (!isNaN(infoValue) && infoValue >= 0 && infoValue <= 300) {
          nozzle2Data = infoValue;
        } else if (infoValue > 300) {
          const decoded = infoValue / 65536;
          if (decoded >= 0 && decoded <= 300) {
            nozzle2Data = decoded;
          }
        }
      }
    }

    // Also try device.nozzle structure as fallback (some data might be there)
    if ((nozzle1Data === 0 || nozzle2Data === 0) && data.print?.device?.nozzle?.info && Array.isArray(data.print.device.nozzle.info)) {
      const nozzleInfo = data.print.device.nozzle.info;

      if (nozzle1Data === 0 && nozzleInfo[0]?.tm !== undefined && nozzleInfo[0].tm >= 0) {
        nozzle1Data = nozzleInfo[0].tm;
      }
      if (nozzle2Data === 0 && nozzleInfo[1]?.tm !== undefined && nozzleInfo[1].tm >= 0) {
        nozzle2Data = nozzleInfo[1].tm;
      }
    }

    // Also try direct access at print level
    if (nozzle1Data === 0 && data.print?.nozzle_temp_1 !== undefined) nozzle1Data = data.print.nozzle_temp_1;
    if (nozzle2Data === 0 && data.print?.nozzle_temp_2 !== undefined) nozzle2Data = data.print.nozzle_temp_2;
    if (nozzle1Data === 0 && data.print?.nozzle_1 !== undefined) nozzle1Data = data.print.nozzle_1;
    if (nozzle2Data === 0 && data.print?.nozzle_2 !== undefined) nozzle2Data = data.print.nozzle_2;

    // If we have single nozzle_temper (active nozzle), only use it if device.nozzle.info didn't provide values
    // device.nozzle.info is more accurate as it includes both active and inactive nozzles
    if (nozzleTemp && typeof nozzleTemp === 'number' && nozzleTemp > 0) {
      // Only use this if we don't have values from device.nozzle.info (which is more accurate)
      if (nozzle1Data === 0 || (nozzleTemp > nozzle1Data && nozzle2Data === 0)) {
        nozzle1Data = nozzleTemp;
      }
      // The inactive nozzle should already be set from device.nozzle.info (includes warm inactive nozzles)
    }

    // Try root level
    if (nozzle1Data === 0 && data.nozzle_temper) {
      if (typeof data.nozzle_temper === 'object') {
        nozzle1Data = data.nozzle_temper.nozzle_temp_1 || data.nozzle_temper.nozzle_1 || 0;
        nozzle2Data = data.nozzle_temper.nozzle_temp_2 || data.nozzle_temper.nozzle_2 || 0;
      } else if (typeof data.nozzle_temper === 'number') {
        nozzle1Data = data.nozzle_temper;
      }
    }

    // IMPORTANT: Based on user feedback and UI mapping:
    // - nozzle1Data in Bambu data = Right nozzle physically
    // - nozzle2Data in Bambu data = Left nozzle physically
    // - UI "Left Nozzle" displays nozzle1 value
    // - UI "Right Nozzle" displays nozzle2 value
    // So we need: nozzle1 (UI Left) = nozzle2Data (Bambu Left), nozzle2 (UI Right) = nozzle1Data (Bambu Right)
    const leftNozzle = nozzle2Data;   // Bambu's nozzle2 = Left nozzle
    const rightNozzle = nozzle1Data;  // Bambu's nozzle1 = Right nozzle

    // Chamber temperature - check multiple possible locations
    // PRIORITY: data.print.device.ctc.info.temp (CTC = Chamber Temperature Control)
    let chamber = 0;

    // Debug log chamber temp sources with ALL values
    logger.info('Chamber temp sources - ALL FIELDS', {
      ctc_info_temp: data.print?.device?.ctc?.info?.temp,
      ctc_info_full: data.print?.device?.ctc?.info,
      ctc_state: data.print?.device?.ctc?.state,
      device_ctc_full: data.print?.device?.ctc,
      print_info_temp: data.print?.info?.temp,
      print_info_full: data.print?.info,
      chamber_temper: data.print?.chamber_temper,
      chamber_temp: data.print?.chamber_temp,
      device_bed_temp: data.print?.device?.bed_temp,
      device_bed_info: data.print?.device?.bed?.info,
    });

    // Chamber temperature: ctc_info_temp = 3932220 → 3932220 / 65536 ≈ 60°C
    if (data.print?.device?.ctc?.info?.temp !== undefined) {
      const ctcTemp = Number(data.print.device.ctc.info.temp);
      if (!isNaN(ctcTemp) && ctcTemp > 0) {
        if (ctcTemp > 100) {
          // Encoded: divide by 65536
          chamber = Math.round(ctcTemp / 65536);
        } else if (ctcTemp >= 0 && ctcTemp <= 100) {
          chamber = Math.round(ctcTemp); // Already in degrees
        }
      }
    }

    // Fallback: try print.info.temp (same encoding)
    if (chamber === 0 && data.print?.info?.temp !== undefined) {
      const infoTemp = Number(data.print.info.temp);
      if (!isNaN(infoTemp) && infoTemp > 0) {
        if (infoTemp > 100) {
          chamber = Math.round(infoTemp / 65536);
        } else if (infoTemp >= 0 && infoTemp <= 100) {
          chamber = Math.round(infoTemp);
        }
      }
    }

    // If still 0, try other locations as fallback
    if (chamber === 0 || isNaN(chamber)) {
      chamber = Number(data.print?.chamber_temper) ||
                Number(data.print?.chamber_temp) ||
                Number(data.print?.chamber_temperature) ||
                Number(data.print?.chamber) ||
                Number(data.chamber_temper) ||
                Number(data.chamber_temp) ||
                Number(data.chamber_temperature) ||
                Number(data.chamber) ||
                Number(data.print?.print?.chamber_temper) ||
                Number(data.print?.print?.chamber_temp) ||
                0;

      // Ensure it's a valid number
      if (isNaN(chamber) || chamber < 0 || chamber > 100) {
        chamber = 0;
      }
    }

    // Map to our interface: nozzle1 = Left (UI), nozzle2 = Right (UI)
    return {
      timestamp: now,
      printerId: serialNumber,
      temperatures: {
        nozzle1: leftNozzle,   // Left nozzle (displays as "Left Nozzle" in UI)
        nozzle2: rightNozzle,  // Right nozzle (displays as "Right Nozzle" in UI)
        bed: (() => {
          // User reports bed is 90°C - need to find correct field and decoding
          let bedTemp = 0;

          // Try device.bed.info.temp first (might be encoded)
          if (data.print?.device?.bed?.info?.temp !== undefined) {
            const bedInfoTemp = Number(data.print.device.bed.info.temp);
            if (bedInfoTemp > 0) {
              if (bedInfoTemp > 120) {
                // Try different decoding methods
                const decoded1 = bedInfoTemp / 65536;
                const decoded2 = bedInfoTemp / 100000;
                if (decoded1 >= 0 && decoded1 <= 120) {
                  bedTemp = decoded1;
                } else if (decoded2 >= 0 && decoded2 <= 120) {
                  bedTemp = decoded2;
                }
              } else {
                bedTemp = bedInfoTemp; // Already in degrees
              }
            }
          }

          // Try device.bed_temp (alternative location)
          if (bedTemp === 0 && data.print?.device?.bed_temp !== undefined) {
            const deviceBedTemp = Number(data.print.device.bed_temp);
            if (deviceBedTemp > 0) {
              if (deviceBedTemp > 120) {
                const decoded = deviceBedTemp / 65536;
                if (decoded >= 0 && decoded <= 120) {
                  bedTemp = decoded;
                }
              } else if (deviceBedTemp >= 0 && deviceBedTemp <= 120) {
                bedTemp = deviceBedTemp;
              }
            }
          }

          // Try bed_temper (might be encoded or direct)
          if (bedTemp === 0 && data.print?.bed_temper !== undefined) {
            const bedTemper = Number(data.print.bed_temper);
            if (bedTemper > 0) {
              if (bedTemper > 120) {
                // Try decoding
                const decoded = bedTemper / 65536;
                if (decoded >= 0 && decoded <= 120) {
                  bedTemp = decoded;
                }
              } else if (bedTemper >= 0 && bedTemper <= 120) {
                bedTemp = bedTemper; // Direct value
              }
            }
          }

          // Final fallback - log what we tried
          if (bedTemp === 0) {
            logger.warn('Bed temp is 0, tried all sources', {
              device_bed_info_temp: data.print?.device?.bed?.info?.temp,
              device_bed_temp: data.print?.device?.bed_temp,
              bed_temper: data.print?.bed_temper,
            });
          }

          return Math.round(bedTemp); // Whole numbers only
        })(),
        chamber,
      },
      humidity: this.parseAMSHumidity(data),
      filamentUsage: this.parseFilamentUsage(data),
      progress: {
        percentage: data.print?.mc_percent || data.mc_percent || data.print?.progress || 0,
        // mc_remaining_time is in MINUTES (keep as-is, formatTime will handle conversion)
        remainingTime: (data.print?.mc_remaining_time || data.mc_remaining_time || data.print?.remaining_time || 0),
        currentLayer: data.print?.layer_num || data.layer_num || data.print?.current_layer || 0,
        totalLayers: data.print?.total_layer_num || data.total_layer_num || data.print?.total_layers || 0,
      },
      status: {
        status: this.mapPrinterStatus(
          data.print?.mc_print_stage || data.mc_print_stage || data.print?.stage,
          data.print?.gcode_state || data.gcode_state
        ),
        errorCode: data.print?.mc_error_code || data.mc_error_code,
        errorMessage: data.print?.mc_error_msg || data.mc_error_msg,
        detailedStatus: this.getDetailedStatus(
          data.print?.gcode_state || data.gcode_state,
          data.print?.mc_print_stage || data.mc_print_stage
        ),
      },
      connectionStatus: 'connected',
      currentPrint: {
        // Prefer subtask_name (original filename like "3D Benchy by CreativeTools") over gcode_file (processed .gcode path)
        filename: data.print?.subtask_name ||
                  data.print?.job_name ||
                  data.subtask_name ||
                  data.job_name ||
                  data.print?.filename ||
                  data.filename ||
                  // Fallback to gcode_file but extract just the name without path/extension
                  (data.print?.gcode_file || data.gcode_file
                    ? (data.print?.gcode_file || data.gcode_file).split('/').pop()?.replace(/\.gcode$/, '') || undefined
                    : undefined),
        jobName: data.print?.subtask_name || data.print?.job_name || data.subtask_name || data.job_name,
        gcodeState: data.print?.gcode_state || data.gcode_state,
      },
    };

    // Detect print completion and add completion data
    const currentStatus = result.status.status;
    const previousStatus = this.previousPrintStatus.get(serialNumber);
    const completionData = this.detectPrintCompletion(currentStatus, previousStatus, result, data);

    if (completionData) {
      result.printCompletion = completionData;
      // Emit event for print completion handlers
      this.emit('print:completed', {
        printerId: serialNumber,
        completionData,
        liveData: result,
      });

      logger.info('Print completion detected', {
        printerId: serialNumber,
        status: completionData.status,
        filename: completionData.filename,
      });
    }

    // Update previous status for next comparison
    this.previousPrintStatus.set(serialNumber, currentStatus);

    return result;
  }

  /**
   * Parse status update data
   */
  private parseStatusUpdate(data: any, serialNumber: string): H2DLiveData {
    const now = new Date().toISOString();

    // Try multiple possible structures for nozzle temperatures (same as parseStatusReport)
    const nozzleTemp = data.nozzle_temper || data.print?.nozzle_temper;
    let nozzle1 = 0;  // Right nozzle
    let nozzle2 = 0;  // Left nozzle

    if (nozzleTemp) {
      if (typeof nozzleTemp === 'object') {
        nozzle1 = nozzleTemp.nozzle_1 || nozzleTemp.nozzle1 || nozzleTemp[0] || nozzleTemp.temp1 || 0;
        nozzle2 = nozzleTemp.nozzle_2 || nozzleTemp.nozzle2 || nozzleTemp[1] || nozzleTemp.temp2 || 0;
      } else if (typeof nozzleTemp === 'number') {
        // Single value - this is the active nozzle temperature
        nozzle1 = nozzleTemp;
      }
    }

    // Nozzle temperatures from device.extruder.info[].temp
    // Right nozzle (info[0]): temp = 17694990 → 17694990 / 65536 ≈ 270°C
    // Left nozzle (info[1]): temp = 74 → already in degrees
    if (data.print?.device?.extruder?.info && Array.isArray(data.print.device.extruder.info)) {
      const nozzleInfo = data.print.device.extruder.info;

      // Use 'temp' field - primary source
      if (nozzleInfo[0]?.temp !== undefined) {
        const tempValue = Number(nozzleInfo[0].temp);
        if (tempValue > 300) {
          // Encoded: divide by 65536
          nozzle1 = Math.round(tempValue / 65536); // Right nozzle (active)
        } else if (tempValue >= 0 && tempValue <= 300) {
          nozzle1 = Math.round(tempValue); // Already in degrees
        }
      }
      if (nozzleInfo[1]?.temp !== undefined) {
        const tempValue = Number(nozzleInfo[1].temp);
        if (tempValue > 300) {
          // Encoded: divide by 65536
          nozzle2 = Math.round(tempValue / 65536); // Left nozzle (inactive)
        } else if (tempValue >= 0 && tempValue <= 300) {
          nozzle2 = Math.round(tempValue); // Already in degrees
        }
      }
    }

    // Also try device.nozzle structure as fallback
    if ((nozzle1 === 0 || nozzle2 === 0) && data.print?.device?.nozzle?.info && Array.isArray(data.print.device.nozzle.info)) {
      const nozzleInfo = data.print.device.nozzle.info;

      if (nozzle1 === 0 && nozzleInfo[0]?.tm !== undefined && nozzleInfo[0].tm >= 0) {
        nozzle1 = nozzleInfo[0].tm;
      }
      if (nozzle2 === 0 && nozzleInfo[1]?.tm !== undefined && nozzleInfo[1].tm >= 0) {
        nozzle2 = nozzleInfo[1].tm;
      }
    }

    // Also try direct access
    if (nozzle1 === 0 && data.nozzle_1) nozzle1 = data.nozzle_1;
    if (nozzle2 === 0 && data.nozzle_2) nozzle2 = data.nozzle_2;
    if (nozzle1 === 0 && data.print?.nozzle_1) nozzle1 = data.print.nozzle_1;
    if (nozzle2 === 0 && data.print?.nozzle_2) nozzle2 = data.print.nozzle_2;

    // If we only have single nozzle_temper, use it for active and check device.nozzle for inactive
    if (nozzleTemp && typeof nozzleTemp === 'number') {
      if (nozzle1 === 0) nozzle1 = nozzleTemp;
      // Try to get inactive nozzle from device.nozzle.info
      if (data.print?.device?.nozzle?.info && Array.isArray(data.print.device.nozzle.info)) {
        const nozzleInfo = data.print.device.nozzle.info;
        for (let i = 0; i < nozzleInfo.length; i++) {
          if (nozzleInfo[i]?.tm !== undefined && nozzleInfo[i].tm !== nozzleTemp) {
            nozzle2 = nozzleInfo[i].tm;
            break;
          }
        }
      }
    }

    // IMPORTANT: Same mapping as parseStatusReport
    // - nozzle1 in Bambu data = Right nozzle physically
    // - nozzle2 in Bambu data = Left nozzle physically
    // - UI "Left Nozzle" displays nozzle1 value
    // - UI "Right Nozzle" displays nozzle2 value
    // So: nozzle1 (UI Left) = nozzle2 (Bambu Left), nozzle2 (UI Right) = nozzle1 (Bambu Right)
    const leftNozzle = nozzle2;   // Bambu's nozzle2 = Left
    const rightNozzle = nozzle1;  // Bambu's nozzle1 = Right

    // Chamber temperature - check multiple possible locations (same as parseStatusReport)
    // PRIORITY: data.print.device.ctc.info.temp (CTC = Chamber Temperature Control)
    let chamber = 0;

    // Chamber temperature: ctc_info_temp = 3932220 → 3932220 / 65536 ≈ 60°C
    if (data.print?.device?.ctc?.info?.temp !== undefined) {
      const ctcTemp = Number(data.print.device.ctc.info.temp);
      if (!isNaN(ctcTemp) && ctcTemp > 0) {
        if (ctcTemp > 100) {
          // Encoded: divide by 65536
          chamber = Math.round(ctcTemp / 65536);
        } else if (ctcTemp >= 0 && ctcTemp <= 100) {
          chamber = Math.round(ctcTemp); // Already in degrees
        }
      }
    }

    // Fallback: try print.info.temp (same encoding)
    if (chamber === 0 && data.print?.info?.temp !== undefined) {
      const infoTemp = Number(data.print.info.temp);
      if (!isNaN(infoTemp) && infoTemp > 0) {
        if (infoTemp > 100) {
          chamber = Math.round(infoTemp / 65536);
        } else if (infoTemp >= 0 && infoTemp <= 100) {
          chamber = Math.round(infoTemp);
        }
      }
    }

    // If still 0, try other locations as fallback
    if (chamber === 0 || isNaN(chamber)) {
      chamber = Number(data.print?.chamber_temper) ||
                Number(data.print?.chamber_temp) ||
                Number(data.print?.chamber_temperature) ||
                Number(data.print?.chamber) ||
                Number(data.chamber_temper) ||
                Number(data.chamber_temp) ||
                Number(data.chamber_temperature) ||
                Number(data.chamber) ||
                Number(data.print?.print?.chamber_temper) ||
                Number(data.print?.print?.chamber_temp) ||
                0;

      // Ensure it's a valid number
      if (isNaN(chamber) || chamber < 0 || chamber > 100) {
        chamber = 0;
      }
    }

    return {
      timestamp: now,
      printerId: serialNumber,
      temperatures: {
        nozzle1: leftNozzle,   // Left nozzle (displays as "Left Nozzle" in UI)
        nozzle2: rightNozzle,  // Right nozzle (displays as "Right Nozzle" in UI)
        bed: data.bed_temper || data.print?.bed_temper || 0,
        chamber,
      },
      humidity: this.parseAMSHumidity(data),
      filamentUsage: this.parseFilamentUsage(data),
      progress: {
        percentage: data.mc_percent || data.print?.mc_percent || data.progress || 0,
        // mc_remaining_time is in MINUTES (keep as-is)
        remainingTime: (data.mc_remaining_time || data.print?.mc_remaining_time || data.remaining_time || 0),
        currentLayer: data.layer_num || data.print?.layer_num || data.current_layer || 0,
        totalLayers: data.total_layer_num || data.print?.total_layer_num || data.total_layers || 0,
      },
      status: {
        status: this.mapPrinterStatus(
          data.mc_print_stage || data.print?.mc_print_stage || data.stage,
          data.gcode_state || data.print?.gcode_state
        ),
        errorCode: data.mc_error_code || data.print?.mc_error_code,
        errorMessage: data.mc_error_msg || data.print?.mc_error_msg,
        detailedStatus: this.getDetailedStatus(
          data.gcode_state || data.print?.gcode_state,
          data.mc_print_stage || data.print?.mc_print_stage
        ),
      },
      connectionStatus: 'connected',
      currentPrint: {
        // Prefer subtask_name (original filename) over gcode_file (processed .gcode path)
        filename: data.subtask_name ||
                  data.job_name ||
                  data.print?.subtask_name ||
                  data.print?.job_name ||
                  data.filename ||
                  data.print?.filename ||
                  // Fallback to gcode_file but extract just the name without path/extension
                  (data.gcode_file || data.print?.gcode_file
                    ? (data.gcode_file || data.print?.gcode_file).split('/').pop()?.replace(/\.gcode$/, '') || undefined
                    : undefined),
        jobName: data.subtask_name || data.print?.subtask_name || data.job_name || data.print?.job_name,
        gcodeState: data.gcode_state || data.print?.gcode_state,
      },
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
        // mc_remaining_time is in MINUTES (keep as-is)
        remainingTime: (data.mc_remaining_time || 0),
        currentLayer: data.layer_num || 0,
        totalLayers: data.total_layer_num || 0,
      },
      status: {
        status: this.mapPrinterStatus(
          data.mc_print_stage,
          data.gcode_state
        ),
        errorCode: data.mc_error_code,
        errorMessage: data.mc_error_msg,
        detailedStatus: this.getDetailedStatus(
          data.gcode_state,
          data.mc_print_stage
        ),
      },
      connectionStatus: 'connected',
      currentPrint: {
        filename: data.gcode_file || data.filename,
        jobName: data.subtask_name || data.job_name,
        gcodeState: data.gcode_state,
      },
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
      humidity: this.parseAMSHumidity(data),
      filamentUsage: this.parseFilamentUsage(data),
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
   * Extract filament consumption data from MQTT message
   * Research required: Document actual field names from Bambu Labs MQTT
   */
  private extractFilamentConsumption(data: unknown): H2DFilamentConsumption[] | undefined {
    try {
      const msg = data as Record<string, unknown>;
      const consumption: H2DFilamentConsumption[] = [];

      // Try to find filament usage in print data
      // NOTE: This is a placeholder - actual field names need to be documented from real MQTT messages
      const printData = msg.print as Record<string, unknown> | undefined;

      if (!printData) {
        return undefined;
      }

      // Try various possible structures for filament consumption
      // Structure 1: print.ams.ams[].tray[] with consumption data
      if (printData.ams && typeof printData.ams === 'object') {
        const amsData = printData.ams as Record<string, unknown>;
        const amsArray = (amsData.ams as unknown[]) || [];
        const trays = (amsData.tray as unknown[]) || [];

        // Check trays for consumption data
        trays.forEach((tray, index) => {
          if (tray && typeof tray === 'object') {
            const trayData = tray as Record<string, unknown>;
            const slot = index + 1;

            // Try to find consumption fields (field names to be confirmed)
            const length = trayData.length_used as number | undefined;
            const weight = trayData.weight_used as number | undefined;
            const material = trayData.material as string | undefined;
            const color = trayData.color as string | undefined;

            if (length !== undefined || weight !== undefined) {
              consumption.push({
                slot,
                length,
                weight,
                material,
                color,
                diameter: 1.75, // Default, could be extracted if available
              });
            }
          }
        });
      }

      // Structure 2: Direct filament usage in print object
      if (printData.filament_used && Array.isArray(printData.filament_used)) {
        const filamentUsed = printData.filament_used as unknown[];
        filamentUsed.forEach((item, index) => {
          if (item && typeof item === 'object') {
            const itemData = item as Record<string, unknown>;
            consumption.push({
              slot: (itemData.slot as number) || index + 1,
              length: itemData.length as number | undefined,
              weight: itemData.weight as number | undefined,
              material: itemData.material as string | undefined,
              color: itemData.color as string | undefined,
              diameter: (itemData.diameter as number) || 1.75,
            });
          }
        });
      }

      // Structure 3: Single filament consumption value
      if (consumption.length === 0 && printData.filament_weight) {
        consumption.push({
          slot: (printData.ams_slot as number) || undefined,
          weight: printData.filament_weight as number,
          length: printData.filament_length as number | undefined,
        });
      }

      return consumption.length > 0 ? consumption : undefined;
    } catch (error) {
      logger.debug('Failed to extract filament consumption', { error });
      return undefined;
    }
  }

  /**
   * Detect print completion by comparing current and previous status
   */
  private detectPrintCompletion(
    currentStatus: string,
    previousStatus: string | undefined,
    liveData: H2DLiveData,
    rawData: unknown
  ): H2DPrintCompletionData | undefined {
    // Detect transition from printing to completed/failed/cancelled
    const wasPrinting = previousStatus === 'printing' || previousStatus === 'paused';
    const isComplete = currentStatus === 'completed';
    const isFailed = currentStatus === 'error' || currentStatus === 'failed';
    const isCancelled = currentStatus === 'idle' && wasPrinting && liveData.progress?.percentage !== 100;

    if (!wasPrinting || (!isComplete && !isFailed && !isCancelled)) {
      return undefined;
    }

    const msg = rawData as Record<string, unknown>;
    const printData = msg.print as Record<string, unknown> | undefined;

    // Extract completion data
    const completionData: H2DPrintCompletionData = {
      status: isComplete ? 'completed' : isFailed ? 'failed' : 'cancelled',
      filename: liveData.currentPrint?.filename,
      jobName: liveData.currentPrint?.jobName,
      layersCompleted: liveData.progress?.currentLayer,
      totalLayers: liveData.progress?.totalLayers,
      errorCode: liveData.status?.errorCode,
      errorMessage: liveData.status?.errorMessage,
    };

    // Try to extract duration (may be in print.mc_timelapse or print.print_time)
    if (printData) {
      const durationMinutes = (printData.mc_timelapse as number) ||
                             (printData.print_time as number) ||
                             (printData.mc_print_time as number);
      if (durationMinutes) {
        completionData.duration = Math.round(durationMinutes * 60); // Convert minutes to seconds
      }

      // Try to extract estimated filament (from slicer)
      const estimatedFilament = (printData.mc_remaining_time as number) ||
                                (printData.filament_weight_estimate as number);
      if (estimatedFilament) {
        completionData.estimatedFilament = estimatedFilament;
      }
    }

    // Extract actual filament consumption
    const actualFilament = this.extractFilamentConsumption(rawData);
    if (actualFilament && actualFilament.length > 0) {
      completionData.actualFilament = actualFilament;
    }

    return completionData;
  }

  /**
   * Parse AMS humidity data with proper slot mapping
   * Handles cases where trays may have IDs or may not be ordered by physical slot
   *
   * AMS2 Pro structure from real MQTT data:
   * - print.ams.ams[0].humidity = "3" (raw value, may need conversion)
   * - print.ams.ams[0].humidity_raw = "25" (percentage as string)
   * - print.ams.ams[0].tray[] = array of trays, each with id="0","1","2","3" (strings, 0-indexed)
   * - AMS reports single humidity value, not per-tray
   */
  private parseAMSHumidity(data: any): H2DHumidityData {
    const result: H2DHumidityData = {
      slot1: 0,
      slot2: 0,
      slot3: 0,
      slot4: 0,
      average: 0,
    };

    // Try to get AMS humidity (AMS2 Pro reports one humidity for the unit, not per-tray)
    // Extract AMS data - try multiple structures
    // Structure can be: print.ams.ams[0] OR print.ams (when tray_now is at this level)
    const amsData = data.print?.ams?.ams?.[0] || data.ams?.ams?.[0] || data.print?.ams || data.ams;

    // Try humidity_raw first (percentage), then humidity (may need conversion)
    let amsHumidity = 0;
    if (amsData) {
      // humidity_raw is usually the percentage as string (e.g., "25" = 25%)
      const humidityRaw = amsData.humidity_raw;
      if (humidityRaw !== undefined && humidityRaw !== null) {
        amsHumidity = Number(humidityRaw) || 0;
      } else {
        // Fallback to humidity field (may be raw value that needs conversion)
        const humidity = amsData.humidity;
        if (humidity !== undefined && humidity !== null) {
          const humidityNum = Number(humidity);
          // If value is very small (< 100), might be percentage already
          // If larger, might need conversion (e.g., divide by 10)
          amsHumidity = humidityNum < 100 ? humidityNum : humidityNum / 10;
        }
      }
    }

    // Extract trays to determine which slots have filament
    const extractTrays = (): any[] => {
      const trays =
        data.print?.ams?.ams?.[0]?.tray ||
        data.print?.ams?.tray ||
        data.ams?.ams?.tray ||
        data.ams?.tray ||
        data.tray ||
        [];

      return Array.isArray(trays) ? trays : [];
    };

    const trays = extractTrays();

    // If we have AMS humidity and trays, prioritize tray_now for active slot
    if (amsHumidity > 0 && trays.length > 0) {
      // FIRST: Check tray_now - this is the most reliable indicator of which slot is actively printing
      // tray_now can be at multiple levels:
      // 1. data.print.ams.tray_now (AMS object level)
      // 2. data.print.ams.ams[0].tray_now (first AMS unit)
      // 3. data.ams.tray_now (root level)
      let trayNow: string | number | undefined =
        data.print?.ams?.tray_now ||  // Check at AMS object level first
        amsData?.tray_now ||           // Check in extracted amsData
        data.ams?.tray_now;            // Check root AMS

      // If still not found, try accessing it through the AMS array structure
      if (trayNow === undefined || trayNow === null) {
        const amsArray = data.print?.ams?.ams || data.ams?.ams;
        if (Array.isArray(amsArray) && amsArray.length > 0) {
          trayNow = amsArray[0]?.tray_now;
        }
      }

      if (trayNow !== undefined && trayNow !== null) {
        const activeTrayId = Number(trayNow);
        if (!isNaN(activeTrayId) && activeTrayId >= 0 && activeTrayId <= 3) {
          // tray_now uses 0-indexed tray IDs: 0=slot1, 1=slot2, 2=slot3, 3=slot4
          const slotNum = activeTrayId + 1;
          if (slotNum === 1) result.slot1 = amsHumidity;
          else if (slotNum === 2) result.slot2 = amsHumidity;
          else if (slotNum === 3) result.slot3 = amsHumidity;
          else if (slotNum === 4) result.slot4 = amsHumidity;

          logger.info('Assigned AMS humidity to active slot from tray_now', {
            trayNow,
            activeTrayId,
            slotNum,
            humidity: amsHumidity,
            amsDataLocation: amsData?.tray_now !== undefined ? 'amsData.tray_now' : 'amsArray[0].tray_now',
          });
        } else {
          logger.warn('tray_now value is out of range', {
            trayNow,
            activeTrayId,
            amsHumidity,
          });
        }
      } else {
        logger.warn('tray_now not found in AMS data', {
          amsDataKeys: amsData ? Object.keys(amsData) : [],
          amsHumidity,
          hasTrays: trays.length > 0,
        });
      }

      // FALLBACK: If tray_now didn't work, check all trays for filament and assign humidity
      // This handles cases where multiple slots have filament
      const hasAnyHumidity = result.slot1 > 0 || result.slot2 > 0 || result.slot3 > 0 || result.slot4 > 0;
      if (!hasAnyHumidity) {
        for (const tray of trays) {
          if (!tray || typeof tray !== 'object') continue;

          // Get tray ID (0-3, where 0=slot1, 1=slot2, 2=slot3, 3=slot4)
          const trayIdStr = tray.id || tray.tray_id || tray.tray_idx;
          if (trayIdStr === undefined || trayIdStr === null) continue;

          const trayId = Number(trayIdStr);
          if (isNaN(trayId) || trayId < 0 || trayId > 3) continue;

          // Check if tray has filament (remain > 0, state indicates active, etc.)
          const hasFilament =
            (tray.remain !== undefined && Number(tray.remain) > 0) ||
            (tray.state !== undefined && Number(tray.state) !== 11); // State 11 = empty

          if (hasFilament) {
            // Map to slot (trayId 0 = slot1, 1 = slot2, 2 = slot3, 3 = slot4)
            const slotNum = trayId + 1;

            // Only assign if slot doesn't already have humidity
            if (slotNum === 1 && result.slot1 === 0) result.slot1 = amsHumidity;
            else if (slotNum === 2 && result.slot2 === 0) result.slot2 = amsHumidity;
            else if (slotNum === 3 && result.slot3 === 0) result.slot3 = amsHumidity;
            else if (slotNum === 4 && result.slot4 === 0) result.slot4 = amsHumidity;
          }
        }
      }
    }

    // Calculate average from all non-zero values
    const validHumidities = [result.slot1, result.slot2, result.slot3, result.slot4].filter(
      h => h > 0
    );
    result.average =
      validHumidities.length > 0
        ? validHumidities.reduce((sum, h) => sum + h, 0) / validHumidities.length
        : amsHumidity > 0 ? amsHumidity : 0; // Use AMS humidity as average if no slots assigned

    return result;
  }

  /**
   * Parse real-time filament usage from AMS tray data
   * Extracts remaining length from tray.remain and calculates usage
   */
  private parseFilamentUsage(data: any): H2DFilamentUsage[] | undefined {
    try {
      const usage: H2DFilamentUsage[] = [];

      // Get tray_now to identify active slot - check same locations as humidity parsing
      // tray_now is at data.print.ams.tray_now (AMS object level), not inside the ams array
      let trayNow: string | number | undefined =
        data.print?.ams?.tray_now ||  // Check at AMS object level first (most reliable)
        data.ams?.tray_now;            // Check root AMS

      // If still not found, try accessing it through the AMS array structure
      if (trayNow === undefined || trayNow === null) {
        const amsArray = data.print?.ams?.ams || data.ams?.ams;
        if (Array.isArray(amsArray) && amsArray.length > 0) {
          trayNow = amsArray[0]?.tray_now;
        }
      }

      const activeTrayId = (trayNow !== undefined && trayNow !== null)
        ? Number(trayNow)
        : null;

      // Validate activeTrayId (0-3, where 0=slot1, 3=slot4)
      const validActiveTrayId = (activeTrayId !== null && !isNaN(activeTrayId) && activeTrayId >= 0 && activeTrayId <= 3)
        ? activeTrayId
        : null;

      // Extract trays - try multiple locations
      const trays =
        data.print?.ams?.ams?.[0]?.tray ||
        data.print?.ams?.tray ||
        firstAms.tray ||
        amsData.tray ||
        data.ams?.tray ||
        data.tray ||
        [];

      if (!Array.isArray(trays) || trays.length === 0) {
        return undefined;
      }

      // Process each tray
      for (const tray of trays) {
        if (!tray || typeof tray !== 'object') continue;

        // Get tray ID (0-indexed: 0=slot1, 1=slot2, 2=slot3, 3=slot4)
        const trayIdStr = tray.id || tray.tray_id || tray.tray_idx;
        if (trayIdStr === undefined || trayIdStr === null) continue;

        const trayId = Number(trayIdStr);
        if (isNaN(trayId) || trayId < 0 || trayId > 3) continue;

        const slot = trayId + 1; // Convert to 1-indexed slot number

        // Check if this is the active slot BEFORE filtering
        const isActive = validActiveTrayId !== null && trayId === validActiveTrayId;

        // Extract remaining length (tray.remain: -1 = empty, positive = remaining in meters)
        // Example: remain = 61 means 61m remaining
        const remain = tray.remain !== undefined ? Number(tray.remain) : null;
        // total_len is usually 330000mm (330m) for full spool
        const totalLen = tray.total_len !== undefined ? Number(tray.total_len) : 330000;

        // Include tray if:
        // 1. It has filament (remain > 0), OR
        // 2. It's the active slot (even if empty/low, we want to show it)
        const hasFilament = remain !== null && remain > 0;
        if (!hasFilament && !isActive) continue;

        // Calculate usage
        // remain appears to be in meters (based on typical values: 61 = ~61m remaining)
        // But need to verify with real data - for now, try both interpretations
        // totalLen is in mm (330000mm = 330m)
        //
        // If remain=61 and total_len=330000, then:
        // - If remain is in meters: remainingLength = 61 * 1000 = 61000mm
        // - If remain is already in mm: remainingLength = 61mm (unlikely for full spool)
        //
        // Based on typical spool sizes, remain is likely in meters * 1000, so:
        // remain=61 → 61m remaining → 61000mm
        // But let's check if remain could be directly in mm for partial spools
        let remainingLength = 0;
        if (hasFilament) {
          // remain is likely in meters (61 = 61m), convert to mm
          // However, if remain value seems too small (< 100), it might already be in mm
          remainingLength = remain >= 100 ? (remain * 1000) : remain;
        }
        const totalLength = totalLen; // Already in mm (330000mm)
        const usedLength = totalLength - remainingLength;
        const usedPercentage = totalLength > 0 ? (usedLength / totalLength) * 100 : 0;

        usage.push({
          slot,
          remainingLength,
          totalLength,
          usedLength: Math.max(0, usedLength), // Ensure non-negative
          usedPercentage: Math.max(0, Math.min(100, usedPercentage)), // Clamp 0-100
          material: tray.tray_type || undefined,
          color: tray.tray_color || tray.cols?.[0] || undefined,
          isActive,
        });

        // Log active slot detection for debugging
        if (isActive) {
          logger.debug('Identified active filament slot', {
            slot,
            trayId,
            trayNow,
            validActiveTrayId,
            remainingLength,
            usedPercentage: Math.max(0, Math.min(100, usedPercentage)),
          });
        }
      }

      return usage.length > 0 ? usage : undefined;
    } catch (error) {
      logger.debug('Failed to parse filament usage', { error });
      return undefined;
    }
  }

  /**
   * Calculate average humidity from AMS slots
   */
  private calculateAverageHumidity(trays: any[]): number {
    if (!trays || trays.length === 0) return 0;

    const validHumidities = trays
      .map(tray => tray.humidity || tray.humid)
      .filter(humidity => typeof humidity === 'number' && humidity > 0);

    if (validHumidities.length === 0) return 0;

    return (
      validHumidities.reduce((sum, humidity) => sum + humidity, 0) /
      validHumidities.length
    );
  }

  /**
   * Map printer status from Bambu Labs format to our format
   * Bambu Labs uses mc_print_stage values:
   * 0 = idle, 1 = printing, 2 = paused, 3 = error, 4 = completed
   * Also check gcode_state for more detailed status
   */
  private mapPrinterStatus(
    stage: number | undefined,
    gcodeState?: string
  ): 'idle' | 'printing' | 'paused' | 'error' | 'completed' | 'homing' | 'leveling' | 'heating' | 'cooling' {
    // Check gcode_state first for more detailed status
    if (gcodeState) {
      const stateLower = gcodeState.toLowerCase();
      const stateUpper = gcodeState.toUpperCase();

      // Check for specific states in order of specificity
      if (stateLower.includes('homing') || stateUpper.includes('HOME')) return 'homing';
      if (stateLower.includes('level') || stateLower.includes('leveling') || stateUpper.includes('BED_LEV')) return 'leveling';
      if (stateLower.includes('heat') || stateLower.includes('heating') || stateUpper.includes('PREHEAT')) return 'heating';
      if (stateLower.includes('cool') || stateLower.includes('cooling')) return 'cooling';
      if (stateUpper === 'FINISH' || stateUpper === 'COMPLETE') return 'completed';
      if (stateLower.includes('pause')) return 'paused';
      if (stateLower.includes('error') || stateLower.includes('fail')) return 'error';
      if (stateLower.includes('print') || stateUpper === 'RUNNING' || stateUpper === 'SLICING') return 'printing';
      if (stateUpper === 'IDLE' || stateUpper === 'UNKNOWN') return 'idle';
    }

    // Fall back to mc_print_stage
    if (stage === undefined || stage === null) return 'idle';

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
   * Get detailed status message from gcode_state and stage
   * Maps Bambu Labs gcode_state values to user-friendly status messages
   */
  private getDetailedStatus(gcodeState?: string, stage?: number): string | undefined {
    if (gcodeState) {
      const stateUpper = gcodeState.toUpperCase();

      // Map gcode_state to user-friendly messages
      // Common Bambu Labs gcode_state values:
      if (stateUpper === 'IDLE' || stateUpper === 'UNKNOWN') {
        return 'Idle';
      }
      if (stateUpper === 'FINISH') {
        return 'Print Completed';
      }
      if (stateUpper === 'RUNNING' || stateUpper === 'SLICING' || stateUpper.includes('PRINT')) {
        return 'Printing';
      }
      if (stateUpper === 'PAUSE' || stateUpper.includes('PAUSE')) {
        return 'Paused';
      }
      if (stateUpper.includes('HOME') || stateUpper.includes('HOMING')) {
        return 'Homing Toolhead';
      }
      if (stateUpper.includes('LEVEL') || stateUpper.includes('LEVELING') || stateUpper.includes('BED_LEV')) {
        return 'Auto Bed Leveling';
      }
      if (stateUpper.includes('HEAT') || stateUpper.includes('HEATING') || stateUpper.includes('PREHEAT')) {
        return 'Heating Bed/Nozzle';
      }
      if (stateUpper.includes('COOL') || stateUpper.includes('COOLING')) {
        return 'Cooling Down';
      }
      if (stateUpper.includes('CHANGE') || stateUpper.includes('FILAMENT')) {
        return 'Changing Filament';
      }
      if (stateUpper.includes('SCAN') || stateUpper.includes('CALIBRAT')) {
        return 'Calibrating/Scanning';
      }
      if (stateUpper.includes('ERROR') || stateUpper.includes('FAIL')) {
        return 'Error';
      }

      // If we don't recognize it, format it nicely
      return gcodeState
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }

    // Map stage to user-friendly message
    switch (stage) {
      case 0:
        return 'Idle';
      case 1:
        return 'Printing';
      case 2:
        return 'Paused';
      case 3:
        return 'Error';
      case 4:
        return 'Print Completed';
      default:
        return undefined;
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
   * IMPORTANT: This is called AFTER subscribeToTopics, which is called AFTER connect
   * We only want to set up handlers once per client instance
   */
  private setupMQTTEventHandlers(): void {
    if (!this.client) return;

    // Prevent multiple registrations - remove existing listeners first
    this.client.removeAllListeners('message');
    this.client.removeAllListeners('error');
    this.client.removeAllListeners('close');
    this.client.removeAllListeners('offline');
    this.client.removeAllListeners('reconnect');

    this.client.on('message', (topic, message) => {
      try {
        logger.info('Received MQTT message', {
          topic,
          messageSize: message.length,
          handlersRegistered: this.messageHandlers.size,
        });

        const liveData = this.parseH2DData(topic, message);
        if (liveData) {
          logger.info('Parsed live data successfully', {
            printerId: liveData.printerId,
            status: liveData.status?.status,
            temperature: liveData.temperatures?.nozzle1,
          });

          logMQTTEvent('message_received', liveData.printerId, {
            topic,
            dataSize: message.length,
          });

          // Notify all registered handlers
          if (this.messageHandlers.size === 0) {
            logger.warn('No message handlers registered! Live data will not be stored.');
          }

          this.messageHandlers.forEach((handler, handlerId) => {
            try {
              logger.info('Calling message handler', { handlerId });
              handler(liveData);
            } catch (error) {
              logger.error('Error in message handler', { error, topic, handlerId });
            }
          });

          // Print completion events are already emitted in parseStatusReport
          // but we can also emit here if needed for other parser methods
        } else {
          logger.debug('Failed to parse live data from message', { topic });
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
   * Get the last raw MQTT message for debugging
   */
  getLastRawMessage(): typeof this.lastRawMessage {
    return this.lastRawMessage;
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
