import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logPerformance } from '../middleware/auditLogger.js';
import { PerformanceTimer } from '../utils/logger.js';

const router = Router();

// Health check endpoint
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const timer = new PerformanceTimer('health-check');

    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
      },
      environment: process.env['NODE_ENV'] || 'development',
      version: '1.0.0',
    };

    const loggerInstance = (req as any).logger || console;
    timer.log(loggerInstance, 'info');
    logPerformance('health-check', timer.end(), healthStatus, req);

    res.json(healthStatus);
  })
);

// Detailed health check
router.get(
  '/detailed',
  asyncHandler(async (req, res) => {
    const timer = new PerformanceTimer('detailed-health-check');

    const detailedHealth = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      environment: process.env['NODE_ENV'] || 'development',
      version: '1.0.0',
      dependencies: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      services: {
        database: 'connected', // This would be checked against actual DB
        mqtt: 'disconnected', // This would be checked against MQTT status
      },
    };

    const loggerInstance = (req as any).logger || console;
    timer.log(loggerInstance, 'info');
    logPerformance('detailed-health-check', timer.end(), detailedHealth, req);

    res.json(detailedHealth);
  })
);

// Readiness check
router.get(
  '/ready',
  asyncHandler(async (req, res) => {
    const timer = new PerformanceTimer('readiness-check');

    // Check if all required services are ready
    const checks = {
      database: true, // This would check actual DB connection
      mqtt: false, // This would check MQTT connection
      storage: true, // This would check file system access
    };

    const isReady = Object.values(checks).every(check => check === true);

    const readinessStatus = {
      ready: isReady,
      timestamp: new Date().toISOString(),
      checks,
    };

    const loggerInstance = (req as any).logger || console;
    timer.log(loggerInstance, 'info');
    logPerformance('readiness-check', timer.end(), readinessStatus, req);

    res.status(isReady ? 200 : 503).json(readinessStatus);
  })
);

// Liveness check
router.get(
  '/live',
  asyncHandler(async (req, res) => {
    const timer = new PerformanceTimer('liveness-check');

    const livenessStatus = {
      alive: true,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };

    const loggerInstance = (req as any).logger || console;
    timer.log(loggerInstance, 'info');
    logPerformance('liveness-check', timer.end(), livenessStatus, req);

    res.json(livenessStatus);
  })
);

export { router as healthRouter };
