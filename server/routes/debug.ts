import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { printerService as printerServiceInstance } from '../services/printerService.js';
import { liveDataService } from '../services/liveDataService.js';
import { bambuMQTTService } from '../services/mqttService.js';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { FilamentProductDB } from '../database/filamentServices.js';
import { seedFilamentData } from '../database/seedFilamentData.js';

const router = Router();

/**
 * Debug endpoint to check live data status
 * GET /api/debug/live-data
 */
router.get(
  '/live-data',
  authenticate,
  asyncHandler(async (req, res) => {
    const printerId = (req.query['printerId'] as string) || null;

    // Get all printer statuses
    const statuses = await printerServiceInstance.getAllPrinterStatuses();

    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      mqttStatus: bambuMQTTService.getConnectionStatus(),
      totalPrinters: statuses.length,
      printers: [],
    };

    for (const status of statuses) {
      const printerInfo: any = {
        id: status.id,
        name: status.name,
        serialNumber: status.serialNumber,
        connectionStatus: status.connectionStatus,
        hasLiveData: !!status.liveData,
        liveDataTimestamp: status.liveData?.timestamp || null,
      };

      // If specific printer requested or printer is connected
      if (!printerId || status.id === printerId) {
        // Try to get live data from service directly
        try {
          const liveDataFromService = await liveDataService.getCurrentLiveData(
            status.serialNumber
          );
          printerInfo.liveDataFromService = {
            exists: !!liveDataFromService,
            timestamp: liveDataFromService?.timestamp || null,
            status: liveDataFromService?.status?.status || null,
            temperature: liveDataFromService?.temperatures?.nozzle1 || null,
          };
        } catch (error: any) {
          printerInfo.liveDataFromServiceError = error.message;
        }

        // Check MQTT connection
        const mqttConfig = bambuMQTTService.getConfig();
        printerInfo.mqttConfig = {
          connected: bambuMQTTService.getConnectionStatus().connected,
          serialNumber: mqttConfig?.serialNumber || null,
          matchesPrinter: mqttConfig?.serialNumber === status.serialNumber,
        };

        // Include live data if available
        if (status.liveData) {
          printerInfo.liveData = {
            timestamp: status.liveData.timestamp,
            status: status.liveData.status?.status,
            temperatures: status.liveData.temperatures,
            progress: status.liveData.progress,
          };
        }
      }

      debugInfo.printers.push(printerInfo);
    }

    res.json({
      success: true,
      data: debugInfo,
    });
  })
);

/**
 * Debug endpoint to check MQTT service status
 * GET /api/debug/mqtt
 */
router.get(
  '/mqtt',
  authenticate,
  asyncHandler(async (req, res) => {
    const connectionStatus = bambuMQTTService.getConnectionStatus();
    const config = bambuMQTTService.getConfig();

    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        connected: connectionStatus.connected,
        printerId: connectionStatus.printerId,
        config: config
          ? {
              host: config.host,
              port: config.port,
              username: config.username,
              serialNumber: config.serialNumber,
              // Don't expose password
            }
          : null,
      },
    });
  })
);

/**
 * Debug endpoint to view recent server logs
 * GET /api/debug/logs
 */
router.get(
  '/logs',
  authenticate,
  asyncHandler(async (req, res) => {
    const lines = parseInt((req.query['lines'] as string) || '100');
    const logFile = join(process.cwd(), 'logs', 'combined.log');

    try {
      const logContent = await readFile(logFile, 'utf-8');
      const logLines = logContent.split('\n').slice(-lines);

      res.json({
        success: true,
        data: {
          totalLines: logContent.split('\n').length,
          requestedLines: lines,
          logs: logLines,
        },
      });
    } catch (error: any) {
      // If log file doesn't exist yet, return error
      res.status(404).json({
        success: false,
        error: {
          message: 'Log file not found. It will be created when logging starts.',
          path: logFile,
        },
      });
    }
  })
);

// Catalog stats (dev helper)
router.get(
  '/catalog/stats',
  asyncHandler(async (req, res) => {
    try {
      const products = await FilamentProductDB.findAll();
      res.json({ success: true, data: { productCount: products.length } });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: 'Failed to fetch stats' } });
    }
  })
);

// Seed catalog now (dev helper)
router.post(
  '/catalog/seed',
  asyncHandler(async (req, res) => {
    try {
      await seedFilamentData();
      const products = await FilamentProductDB.findAll();
      res.json({ success: true, data: { productCount: products.length } });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Seeding failed',
          details: error?.message || String(error),
          stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
        }
      });
    }
  })
);

// Dev-only: return catalog products without auth to verify data quickly
router.get(
  '/catalog/products',
  asyncHandler(async (req, res) => {
    try {
      let products = await FilamentProductDB.findAll();
      if (!products || products.length === 0) {
        // Fallback: fabricate a small sample list for development
        const now = Date.now();
        products = [
          { id: `sample_${now}_1`, manufacturerId: 'sample', sku: 'SMP-PLA-BLK', name: 'Sample PLA Black', material: 'PLA', color: 'Black', diameter: 1.75, weight: 1000, nozzleTemperatureRecommended: 210, bedTemperatureRecommended: 60, optimalHumidityRecommended: 40, amsCompatible: 1 as any, rfidEnabled: 0 as any, nzdPrice: 29.9, currency: 'NZD', available: 1 as any, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { id: `sample_${now}_2`, manufacturerId: 'sample', sku: 'SMP-PETG-CLR', name: 'Sample PETG Clear', material: 'PETG', color: 'Clear', diameter: 1.75, weight: 1000, nozzleTemperatureRecommended: 240, bedTemperatureRecommended: 80, optimalHumidityRecommended: 30, amsCompatible: 1 as any, rfidEnabled: 0 as any, nzdPrice: 34.9, currency: 'NZD', available: 1 as any, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { id: `sample_${now}_3`, manufacturerId: 'sample', sku: 'SMP-ABS-WHT', name: 'Sample ABS White', material: 'ABS', color: 'White', diameter: 1.75, weight: 1000, nozzleTemperatureRecommended: 250, bedTemperatureRecommended: 100, optimalHumidityRecommended: 20, amsCompatible: 1 as any, rfidEnabled: 0 as any, nzdPrice: 39.9, currency: 'NZD', available: 1 as any, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        ] as any;
      }
      res.json({ success: true, data: products, count: products.length });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: 'Failed to fetch products' } });
    }
  })
);

/**
 * Debug endpoint to show current live data structure
 * GET /api/debug/mqtt-structure
 * This shows the actual structure of the latest MQTT message received
 */
router.get(
  '/mqtt-structure',
  authenticate,
  asyncHandler(async (req, res) => {
    // Get latest live data from any connected printer
    const statuses = await printerServiceInstance.getAllPrinterStatuses();
    const connectedPrinters = statuses.filter(s => s.connectionStatus === 'connected');

    if (connectedPrinters.length === 0) {
      return res.json({
        success: true,
        message: 'No connected printers. Connect a printer first.',
        data: null,
      });
    }

    // Get the first connected printer's live data
    const printer = connectedPrinters[0];
    const liveData = printer.liveData;

    if (!liveData) {
      return res.json({
        success: true,
        message: 'No live data available yet. Wait for MQTT messages.',
        data: {
          printer: {
            id: printer.id,
            name: printer.name,
            serialNumber: printer.serialNumber,
            connectionStatus: printer.connectionStatus,
          },
        },
      });
    }

    // Return the parsed data structure
    res.json({
      success: true,
      data: {
        printer: {
          id: printer.id,
          name: printer.name,
          serialNumber: printer.serialNumber,
        },
        liveData: {
          timestamp: liveData.timestamp,
          temperatures: {
            nozzle1: liveData.temperatures?.nozzle1,
            nozzle2: liveData.temperatures?.nozzle2,
            bed: liveData.temperatures?.bed,
            chamber: liveData.temperatures?.chamber,
          },
          humidity: liveData.humidity,
          progress: liveData.progress,
          status: liveData.status,
        },
        analysis: {
          nozzle1Value: liveData.temperatures?.nozzle1,
          nozzle2Value: liveData.temperatures?.nozzle2,
          hasNozzle1: !!liveData.temperatures?.nozzle1 && liveData.temperatures.nozzle1 > 0,
          hasNozzle2: !!liveData.temperatures?.nozzle2 && liveData.temperatures.nozzle2 > 0,
          hasChamber: !!liveData.temperatures?.chamber && liveData.temperatures.chamber > 0,
          hasHumidity: !!(liveData.humidity && Object.values(liveData.humidity).some((v: any) => v > 0)),
          hasProgress: !!(liveData.progress?.percentage && liveData.progress.percentage > 0),
        },
      },
    });
  })
);

/**
 * Debug endpoint to show AMS slot mapping details
 * GET /api/debug/slot-mapping
 */
router.get(
  '/slot-mapping',
  process.env['NODE_ENV'] === 'production' ? authenticate : optionalAuth,
  asyncHandler(async (req, res) => {
    const rawMessage = bambuMQTTService.getLastRawMessage();

    if (!rawMessage) {
      return res.json({
        success: true,
        message: 'No raw MQTT message captured yet. Wait for an MQTT message to arrive.',
        data: null,
      });
    }

    // Extract AMS data from various possible locations
    const printAms = rawMessage.data.print?.ams;
    const rootAms = rawMessage.data.ams;

    // Try to find the AMS array
    const amsArray = printAms?.ams || rootAms?.ams || (Array.isArray(printAms) ? printAms : (Array.isArray(rootAms) ? rootAms : []));
    const firstAms = Array.isArray(amsArray) && amsArray.length > 0 ? amsArray[0] : (printAms || rootAms || {});

    // tray_now might be at the print.ams level, not inside the ams array
    const trayNowAtPrintLevel = printAms?.tray_now;

    // Extract tray_now value - check multiple locations
    const trayNow = firstAms.tray_now || trayNowAtPrintLevel || printAms?.tray_now || rootAms?.tray_now;
    const trayPre = firstAms.tray_pre || printAms?.tray_pre || rootAms?.tray_pre;
    const trayTar = firstAms.tray_tar || printAms?.tray_tar || rootAms?.tray_tar;

    // Extract humidity
    const humidityRaw = firstAms.humidity_raw;
    const humidity = firstAms.humidity;

    // Extract trays
    const trays = firstAms.tray || [];
    const trayDetails = Array.isArray(trays) ? trays.map((tray: any, index: number) => ({
      index,
      id: tray.id,
      tray_id: tray.tray_id,
      tray_idx: tray.tray_idx,
      remain: tray.remain,
      state: tray.state,
      tray_type: tray.tray_type,
      hasFilament: (tray.remain !== undefined && Number(tray.remain) > 0) || (tray.state !== undefined && Number(tray.state) !== 11),
    })) : [];

    // Calculate what slot should get humidity based on tray_now
    let mappedSlot = null;
    if (trayNow !== undefined && trayNow !== null) {
      const trayId = Number(trayNow);
      if (!isNaN(trayId) && trayId >= 0 && trayId <= 3) {
        mappedSlot = trayId + 1; // 0-indexed to 1-indexed slot number
      }
    }

    // Get current parsed humidity from live data service
    const serialNumber = bambuMQTTService.getConfig()?.serialNumber;
    let currentHumidity: any = null;
    if (serialNumber) {
      try {
        const liveData = await liveDataService.getCurrentLiveData(serialNumber);
        currentHumidity = liveData?.humidity;
      } catch (error) {
        // Ignore errors
      }
    }

    res.json({
      success: true,
      message: 'AMS Slot Mapping Debug Information',
      data: {
        timestamp: rawMessage.timestamp,
        topic: rawMessage.topic,

        // Raw AMS Data
        amsStructure: {
          hasPrintAms: !!printAms,
          hasRootAms: !!rootAms,
          amsArrayLength: Array.isArray(amsArray) ? amsArray.length : 0,
          firstAmsKeys: Object.keys(firstAms),
        },

        // Tray Now Values (Key for Active Slot)
        trayNowValues: {
          tray_now: trayNow,
          tray_pre: trayPre,
          tray_tar: trayTar,
          mappedSlot: mappedSlot,
          explanation: mappedSlot
            ? `tray_now="${trayNow}" → Slot ${mappedSlot} (0-indexed: ${Number(trayNow)} = Slot ${mappedSlot})`
            : 'tray_now not found or invalid',
        },

        // Humidity Values
        humidityData: {
          humidity_raw: humidityRaw,
          humidity: humidity,
          humidityValue: humidityRaw ? Number(humidityRaw) : (humidity ? Number(humidity) : null),
        },

        // Tray Details
        trayDetails,

        // Current Parsed Result
        currentHumidityMapping: currentHumidity || {
          slot1: 0,
          slot2: 0,
          slot3: 0,
          slot4: 0,
          average: 0,
        },

        // Instructions
        instructions: {
          step1: `tray_now value: "${trayNow}" → Should map to Slot ${mappedSlot || 'N/A'}`,
          step2: `Current humidity is: ${humidityRaw || humidity || 'N/A'}%`,
          step3: `Check "currentHumidityMapping" to see where humidity is actually assigned`,
          step4: `If slot is wrong, check the parseAMSHumidity function in mqttService.ts`,
        },

        // Full AMS data for inspection
        fullAmsData: firstAms,

        // RAW structure inspection - check all possible locations
        rawStructureInspection: {
          printAmsTrayNow: printAms?.tray_now,
          printAmsAms0TrayNow: printAms?.ams?.[0]?.tray_now,
          rootAmsTrayNow: rootAms?.tray_now,
          rootAmsAms0TrayNow: rootAms?.ams?.[0]?.tray_now,
          allPrintAmsKeys: printAms ? Object.keys(printAms) : [],
          allRootAmsKeys: rootAms ? Object.keys(rootAms) : [],
        },
      },
    });
  })
);

/**
 * Debug endpoint to extract AMS serial number from MQTT data
 * GET /api/debug/ams-serial
 */
router.get(
  '/ams-serial',
  process.env['NODE_ENV'] === 'production' ? authenticate : optionalAuth,
  asyncHandler(async (req, res) => {
    const rawMessage = bambuMQTTService.getLastRawMessage();

    if (!rawMessage) {
      return res.json({
        success: true,
        message: 'No raw MQTT message captured yet. Wait for an MQTT message to arrive.',
        data: null,
      });
    }

    // Search for AMS serial number in various possible locations
    const amsData = rawMessage.data.print?.ams || rawMessage.data.ams || {};
    const amsArray = Array.isArray(amsData.ams) ? amsData.ams : [amsData];

    const amsUnits: Array<{ serialNumber?: string; id?: string; index: number }> = [];

    for (let i = 0; i < amsArray.length; i++) {
      const ams = amsArray[i];
      if (!ams || typeof ams !== 'object') continue;

      // Try common serial number field names
      const serialNumber =
        ams.serial_number ||
        ams.serialNumber ||
        ams.sn ||
        ams.id ||
        ams.ams_id ||
        ams.unit_id;

      amsUnits.push({
        serialNumber: serialNumber || undefined,
        id: ams.id || String(i),
        index: i,
      });
    }

    res.json({
      success: true,
      message: 'AMS serial number extraction',
      data: {
        timestamp: rawMessage.timestamp,
        topic: rawMessage.topic,
        amsUnitsFound: amsUnits.length,
        amsUnits,
        rawAmsStructure: {
          hasPrintAms: !!rawMessage.data.print?.ams,
          hasRootAms: !!rawMessage.data.ams,
          amsKeys: Object.keys(amsData),
          firstAmsSample: amsArray[0] ? Object.keys(amsArray[0]).slice(0, 10) : null,
        },
        instructions: {
          step1: 'Look for "serialNumber" or "serial_number" in the amsUnits array above',
          step2: 'If found, use that value when assigning filaments to AMS slots',
          step3: 'If not found, AMS serial number may be embedded in topic or other fields',
          step4: 'Check the raw MQTT data at /api/debug/raw-mqtt for complete structure',
        },
      },
    });
  })
);

/**
 * Debug endpoint to show FULL raw MQTT message structure
 * GET /api/debug/raw-mqtt
 * This shows the COMPLETE raw JSON structure with ALL fields
 * Use this to find missing data like chamber temp, humidity, etc.
 */
router.get(
  '/raw-mqtt',
  optionalAuth, // Always use optionalAuth for debug routes
  asyncHandler(async (req, res) => {
    const rawMessage = bambuMQTTService.getLastRawMessage();

    if (!rawMessage) {
      return res.json({
        success: true,
        message: 'No raw MQTT message captured yet. Wait for an MQTT message to arrive.',
        data: null,
      });
    }

    // Helper function to search for specific field patterns
    const searchFields = (obj: any, patterns: string[], path = ''): string[] => {
      const found: string[] = [];
      if (typeof obj !== 'object' || obj === null) return found;

      for (const key in obj) {
        const currentPath = path ? `${path}.${key}` : key;
        const lowerKey = key.toLowerCase();

        // Check if this key matches any pattern
        for (const pattern of patterns) {
          if (lowerKey.includes(pattern.toLowerCase())) {
            found.push(`${currentPath} = ${JSON.stringify(obj[key])}`);
          }
        }

        // Recursively search nested objects
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          found.push(...searchFields(obj[key], patterns, currentPath));
        }
      }
      return found;
    };

    // Search for temperature-related fields
    const tempFields = searchFields(rawMessage.data, [
      'chamber', 'humidity', 'nozzle', 'temp', 'temper'
    ]);

    // Get all root-level keys
    const rootKeys = rawMessage.allKeys;

    // Get all keys in print object
    const printKeys = rawMessage.printKeys || [];

    // Check for AMS data
    const hasAMS = !!rawMessage.data.ams;
    const amsKeys = rawMessage.data.ams ? Object.keys(rawMessage.data.ams) : [];

    res.json({
      success: true,
      data: {
        timestamp: rawMessage.timestamp,
        topic: rawMessage.topic,
        summary: {
          totalRootKeys: rootKeys.length,
          totalPrintKeys: printKeys.length,
          hasPrint: !!rawMessage.data.print,
          hasAMS,
          amsKeys,
        },
        // Complete raw message structure (be careful - this can be large!)
        rawMessage: rawMessage.data,
        // Search results for fields we're looking for
        fieldSearch: {
          chamberFields: searchFields(rawMessage.data, ['chamber']),
          humidityFields: searchFields(rawMessage.data, ['humidity', 'humid']),
          nozzleFields: searchFields(rawMessage.data, ['nozzle']),
          tempFields, // All temperature-related fields
        },
        // Quick reference: all keys
        allKeys: {
          root: rootKeys,
          print: printKeys,
          ams: amsKeys,
        },
        // Sample values from common fields
        samples: {
          nozzle_temper: rawMessage.data.print?.nozzle_temper,
          nozzle_temp_1: rawMessage.data.print?.nozzle_temp_1,
          nozzle_temp_2: rawMessage.data.print?.nozzle_temp_2,
          bed_temper: rawMessage.data.print?.bed_temper,
          chamber: rawMessage.data.print?.chamber_temper || rawMessage.data.chamber_temper || rawMessage.data.chamber,
          ams: rawMessage.data.ams,
        },
      },
    });
  })
);

/**
 * Debug endpoint for temperature data specifically
 * GET /api/debug/temperatures
 * Shows all temperature-related fields from raw MQTT data
 */
router.get(
  '/temperatures',
  optionalAuth, // Always use optionalAuth for debug routes in development
  asyncHandler(async (req, res) => {
    const rawMessage = bambuMQTTService.getLastRawMessage();

    if (!rawMessage) {
      return res.json({
        success: true,
        message: 'No raw MQTT message captured yet.',
        data: null,
      });
    }

    const data = rawMessage.data;

    // Extract all possible temperature sources
    const temperatureData = {
      // Nozzle temperatures
      nozzle: {
        device_extruder_info: data.print?.device?.extruder?.info, // PRIMARY - This is where temps actually are!
        device_nozzle_info: data.print?.device?.nozzle?.info,
        nozzle_temper: data.print?.nozzle_temper,
        nozzle_temp_1: data.print?.nozzle_temp_1,
        nozzle_temp_2: data.print?.nozzle_temp_2,
        nozzle_1: data.print?.nozzle_1,
        nozzle_2: data.print?.nozzle_2,
      },

      // Bed temperature
      bed: {
        bed_temper: data.print?.bed_temper,
        bed_temp: data.bed_temper,
        device_bed_info: data.print?.device?.bed?.info,
        device_bed_temp: data.print?.device?.bed_temp,
      },

      // Chamber temperature
      chamber: {
        ctc_info_temp: data.print?.device?.ctc?.info?.temp,
        ctc_info: data.print?.device?.ctc?.info,
        ctc_state: data.print?.device?.ctc?.state,
        print_info_temp: data.print?.info?.temp,
        print_info: data.print?.info,
        chamber_temper: data.print?.chamber_temper,
        chamber_temp: data.print?.chamber_temp,
        chamber_temperature: data.print?.chamber_temperature,
        chamber: data.print?.chamber || data.chamber,
      },

      // All device info
      device_info: data.print?.device?.info,

      // Current parsed values (for comparison)
      currentParsed: null as any,
    };

    // Get current parsed values from live data service
    const serialNumber = bambuMQTTService.getConfig()?.serialNumber;
    if (serialNumber) {
      try {
        const liveData = await liveDataService.getCurrentLiveData(serialNumber);
        temperatureData.currentParsed = liveData?.temperatures || null;
      } catch (error) {
        // Ignore
      }
    }

    res.json({
      success: true,
      data: temperatureData,
      instructions: {
        step1: 'Check "nozzle.device_nozzle_info" array for tm and info fields',
        step2: 'Check "chamber.ctc_info_temp" for chamber temperature (might be encoded)',
        step3: 'Compare with "currentParsed" to see what we\'re currently reading',
        step4: 'If values are large numbers (>100), they might need decoding (divide by 100000)',
      },
    });
  })
);

export { router as debugRouter };
