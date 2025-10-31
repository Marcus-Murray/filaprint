import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logMQTTEvent } from '../middleware/auditLogger.js';
import { printerService, PrinterConfig } from '../services/printerService.js';
import { liveDataService } from '../services/liveDataService.js';
import { authenticate } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

// Validation schemas
const addPrinterSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  model: z.string().min(1, 'Model is required'),
  serialNumber: z.string().min(1, 'Serial number is required'),
  ipAddress: z.string().ip('Invalid IP address format'),
  accessCode: z.string().min(6, 'Access code must be at least 6 characters'),
  description: z.string().optional(),
  mqttConfig: z.object({
    host: z.string().min(1, 'MQTT host is required'),
    port: z.number().min(1).max(65535, 'Invalid port number'),
    username: z.string().min(1, 'MQTT username is required'),
    password: z.string().optional(), // Make MQTT password optional
    serialNumber: z.string().min(1, 'MQTT serial number is required'),
  }),
});

const updatePrinterSchema = z.object({
  name: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  ipAddress: z.string().ip('Invalid IP address format').optional(),
  accessCode: z.string().min(6).optional(),
  description: z.string().optional(),
  mqttConfig: z
    .object({
      host: z.string().min(1).optional(),
      port: z.number().min(1).max(65535).optional(),
      username: z.string().min(1).optional(),
      password: z.string().min(1).optional(),
      serialNumber: z.string().min(1).optional(),
    })
    .optional(),
});

const commandSchema = z.object({
  command: z.string().min(1, 'Command is required'),
  payload: z.record(z.unknown()).optional(),
});

// IMPORTANT: Specific routes must come BEFORE parameterized routes
// Get all printer statuses (must come before /:id routes)
router.get(
  '/statuses',
  authenticate,
  asyncHandler(async (req, res) => {
    const statuses = await printerService.getAllPrinterStatuses();
    res.json({ success: true, data: statuses, count: statuses.length });
  })
);

// Get all printers (authenticated)
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const printers = await printerService.getAllPrinters();

    res.json({
      success: true,
      data: printers,
      count: printers.length,
    });
  })
);

// Add new printer (authenticated)
router.post(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const validatedData = addPrinterSchema.parse(req.body);
    const userId = req.user!.userId;

    const printerConfig: PrinterConfig = {
      id: `printer_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      name: validatedData.name,
      model: validatedData.model,
      serialNumber: validatedData.serialNumber,
      ipAddress: validatedData.ipAddress,
      accessCode: validatedData.accessCode,
      description: validatedData.description ?? '',
      userId: userId,
      mqttConfig: {
        host: validatedData.mqttConfig.host,
        port: validatedData.mqttConfig.port,
        username: validatedData.mqttConfig.username,
        password: validatedData.mqttConfig.password || validatedData.accessCode, // Use access code as fallback
        serialNumber: validatedData.mqttConfig.serialNumber,
        accessCode: validatedData.accessCode,
        keepalive: 60,
        reconnectPeriod: 5000,
        connectTimeout: 15000,
      },
    };

    const printer = await printerService.addPrinter(printerConfig, req);

    res.status(201).json({
      success: true,
      message: 'Printer added successfully',
      data: printer,
    });
  })
);

// Update printer (authenticated)
router.put(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const id = req.params['id'] as string;
    const validatedData = updatePrinterSchema.parse(req.body);

    const updates: Partial<PrinterConfig> = {};
    if (validatedData.name) updates.name = validatedData.name;
    if (validatedData.model) updates.model = validatedData.model;
    if (validatedData.ipAddress) updates.ipAddress = validatedData.ipAddress;
    if (validatedData.accessCode) updates.accessCode = validatedData.accessCode;
    if (validatedData.description !== undefined)
      updates.description = validatedData.description;
    if (validatedData.mqttConfig) {
      updates.mqttConfig = {
        ...validatedData.mqttConfig,
        // Ensure accessCode present if required by type
        accessCode: validatedData.accessCode ?? undefined,
      } as any;
    }

    const printer = await printerService.updatePrinter(id, updates, req);

    res.json({
      success: true,
      message: 'Printer updated successfully',
      data: printer,
    });
  })
);

// IMPORTANT: All specific routes (with /:id/something) must come BEFORE /:id
// This is because Express matches routes in order, and /:id would match /:id/status if it comes first

// Get live data history for printer (authenticated) - must come before /:id/live-data
router.get(
  '/:id/live-data/history',
  authenticate,
  asyncHandler(async (req, res) => {
    const id = req.params['id'] as string;
    const limit = parseInt((req.query['limit'] as string) || '0') || 100;

    const history = await printerService.getLiveDataHistory(id, limit);

    res.json({
      success: true,
      data: history,
      count: history.length,
    });
  })
);

// Get live data for printer (authenticated)
router.get(
  '/:id/live-data',
  authenticate,
  asyncHandler(async (req, res) => {
    const id = req.params['id'] as string;
    const liveData = await printerService.getLiveData(id);

    res.json({
      success: true,
      data: liveData,
    });
  })
);

// Get printer status (authenticated)
router.get(
  '/:id/status',
  authenticate,
  asyncHandler(async (req, res) => {
    const id = req.params['id'] as string;
    const status = await printerService.getPrinterStatus(id);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: { code: 'PRINTER_NOT_FOUND', message: 'Printer not found' },
      });
    }

    res.json({ success: true, data: status });
  })
);

// Connect to printer (authenticated)
router.post(
  '/:id/connect',
  authenticate,
  asyncHandler(async (req, res) => {
    const id = req.params['id'] as string;

    await printerService.connectPrinter(id);

    res.json({
      success: true,
      message: 'Printer connection initiated',
    });
  })
);

// Disconnect from printer (authenticated)
router.post(
  '/:id/disconnect',
  authenticate,
  asyncHandler(async (req, res) => {
    const id = req.params['id'] as string;

    await printerService.disconnectPrinter(id);

    res.json({
      success: true,
      message: 'Printer disconnected successfully',
    });
  })
);

// Send command to printer (authenticated)
router.post(
  '/:id/command',
  authenticate,
  asyncHandler(async (req, res) => {
    const id = req.params['id'] as string;
    const validatedData = commandSchema.parse(req.body);

    await printerService.sendCommand(
      id,
      validatedData.command,
      validatedData.payload
    );

    res.json({
      success: true,
      message: 'Command sent successfully',
    });
  })
);

// Delete printer (authenticated)
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const id = req.params['id'] as string;

    await printerService.removePrinter(id, req);

    res.json({
      success: true,
      message: 'Printer removed successfully',
    });
  })
);

// Get printer by ID (authenticated) - MUST be LAST because it matches any /:id
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const id = req.params['id'] as string;
    const printer = await printerService.getPrinterById(id);

    if (!printer) {
      return res.status(404).json({
        success: false,
        error: { code: 'PRINTER_NOT_FOUND', message: 'Printer not found' },
      });
    }

    res.json({ success: true, data: printer });
  })
);

export { router as printerRouter };
