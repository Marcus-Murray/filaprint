import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger.js';
import { sanitizeLogData } from '../utils/logger.js';
import { generateRequestId } from '../utils/logger.js';

const logger = createLogger('security');

// Security middleware
export const securityMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Generate request ID
  const requestId = generateRequestId();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);

  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=()'
  );

  // Remove server identification
  res.removeHeader('X-Powered-By');

  // Log security events
  if (req.url.includes('..') || req.url.includes('//')) {
    logger.warn('Potential path traversal attempt', {
      requestId,
      ip: req.ip,
      url: req.url,
      userAgent: req.get('User-Agent'),
    });
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /onload=/i,
    /onerror=/i,
    /onclick=/i,
    /eval\(/i,
    /expression\(/i,
  ];

  const checkSuspiciousContent = (obj: unknown): boolean => {
    if (typeof obj === 'string') {
      return suspiciousPatterns.some(pattern => pattern.test(obj));
    }

    if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj).some(checkSuspiciousContent);
    }

    return false;
  };

  if (checkSuspiciousContent(req.body) || checkSuspiciousContent(req.query)) {
    logger.warn('Potential XSS attempt detected', {
      requestId,
      ip: req.ip,
      url: req.url,
      body: sanitizeLogData(req.body),
      query: sanitizeLogData(req.query),
      userAgent: req.get('User-Agent'),
    });
  }

  next();
};

// Input validation middleware
export const validateInput = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = req.headers['x-request-id'] as string;

  // Check request size
  const contentLength = parseInt(req.get('Content-Length') || '0', 10);
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (contentLength > maxSize) {
    logger.warn('Request size exceeds limit', {
      requestId,
      contentLength,
      maxSize,
      ip: req.ip,
      url: req.url,
    });

    res.status(413).json({
      error: {
        code: 'REQUEST_TOO_LARGE',
        message: 'Request size exceeds maximum allowed size',
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
    return;
  }

  // Validate JSON content type
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const contentType = req.get('Content-Type');
    if (contentType && !contentType.includes('application/json')) {
      logger.warn('Invalid content type', {
        requestId,
        contentType,
        ip: req.ip,
        url: req.url,
      });

      res.status(400).json({
        error: {
          code: 'INVALID_CONTENT_TYPE',
          message: 'Content-Type must be application/json',
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }
  }

  next();
};

// SQL injection prevention middleware
export const preventSQLInjection = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = req.headers['x-request-id'] as string;

  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /(--|\#|\/\*|\*\/)/,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
    /(\b(OR|AND)\s+['"]\s*=\s*['"])/i,
    /(UNION\s+SELECT)/i,
    /(DROP\s+TABLE)/i,
    /(DELETE\s+FROM)/i,
    /(INSERT\s+INTO)/i,
    /(UPDATE\s+SET)/i,
  ];

  const checkSQLInjection = (obj: unknown): boolean => {
    if (typeof obj === 'string') {
      return sqlPatterns.some(pattern => pattern.test(obj));
    }

    if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj).some(checkSQLInjection);
    }

    return false;
  };

  if (
    checkSQLInjection(req.body) ||
    checkSQLInjection(req.query) ||
    checkSQLInjection(req.params)
  ) {
    logger.warn('Potential SQL injection attempt detected', {
      requestId,
      ip: req.ip,
      url: req.url,
      body: sanitizeLogData(req.body),
      query: sanitizeLogData(req.query),
      params: sanitizeLogData(req.params),
      userAgent: req.get('User-Agent'),
    });

    res.status(400).json({
      error: {
        code: 'INVALID_INPUT',
        message: 'Invalid input detected',
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
    return;
  }

  next();
};

// Rate limiting per user (if authenticated)
export const userRateLimit = (
  _req: Request,
  _res: Response,
  next: NextFunction
): void => {
  // This would be implemented with a more sophisticated rate limiting system
  // For now, we'll just pass through
  next();
};

// IP whitelist middleware (for admin endpoints)
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestId = req.headers['x-request-id'] as string;
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (!allowedIPs.includes(clientIP)) {
      logger.warn('IP not in whitelist', {
        requestId,
        clientIP,
        allowedIPs,
        url: req.url,
        userAgent: req.get('User-Agent'),
      });

      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    next();
  };
};
