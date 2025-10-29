import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger.js';
import { sanitizeLogData } from '../utils/logger.js';

const logger = createLogger('audit');

// Audit logging middleware
export const auditLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = req.headers['x-request-id'] as string;
  const startTime = Date.now();

  // Log request
  logger.info('Request received', {
    requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    headers: sanitizeLogData(req.headers),
    body: sanitizeLogData(req.body),
    query: sanitizeLogData(req.query),
    params: sanitizeLogData(req.params),
    timestamp: new Date().toISOString(),
  });

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function (body: unknown) {
    const duration = Date.now() - startTime;

    logger.info('Response sent', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      responseSize: JSON.stringify(body).length,
      timestamp: new Date().toISOString(),
    });

    return originalJson.call(this, body);
  };

  next();
};

// Security event logging
export const logSecurityEvent = (
  event: string,
  details: Record<string, unknown>,
  req: Request
): void => {
  const requestId = req.headers['x-request-id'] as string;

  logger.warn('Security event', {
    requestId,
    event,
    details: sanitizeLogData(details),
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
};

// Authentication event logging
export const logAuthEvent = (
  event: 'login' | 'logout' | 'register' | 'password_reset' | 'failed_login',
  userId?: string,
  details?: Record<string, unknown>,
  req?: Request
): void => {
  const requestId = (req?.headers['x-request-id'] as string) || 'unknown';

  logger.info('Authentication event', {
    requestId,
    event,
    userId,
    details: sanitizeLogData(details),
    ip: req?.ip,
    userAgent: req?.get('User-Agent'),
    timestamp: new Date().toISOString(),
  });
};

// Database operation logging
export const logDatabaseOperation = (
  operation: 'create' | 'read' | 'update' | 'delete',
  table: string,
  recordId?: string,
  details?: Record<string, unknown>,
  req?: Request
): void => {
  const requestId = (req?.headers['x-request-id'] as string) || 'unknown';

  logger.info('Database operation', {
    requestId,
    operation,
    table,
    recordId,
    details: sanitizeLogData(details),
    ip: req?.ip,
    userAgent: req?.get('User-Agent'),
    timestamp: new Date().toISOString(),
  });
};

// MQTT event logging
export const logMQTTEvent = (
  event:
    | 'connect'
    | 'disconnect'
    | 'message_received'
    | 'message_sent'
    | 'error',
  printerId?: string,
  details?: Record<string, unknown>,
  req?: Request
): void => {
  const requestId = (req?.headers['x-request-id'] as string) || 'unknown';

  logger.info('MQTT event', {
    requestId,
    event,
    printerId,
    details: sanitizeLogData(details),
    ip: req?.ip,
    userAgent: req?.get('User-Agent'),
    timestamp: new Date().toISOString(),
  });
};

// Performance logging
export const logPerformance = (
  operation: string,
  duration: number,
  details?: Record<string, unknown>,
  req?: Request
): void => {
  const requestId = (req?.headers['x-request-id'] as string) || 'unknown';

  logger.info('Performance metric', {
    requestId,
    operation,
    duration,
    details: sanitizeLogData(details),
    ip: req?.ip,
    userAgent: req?.get('User-Agent'),
    timestamp: new Date().toISOString(),
  });
};


