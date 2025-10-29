import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger.js';
import { sanitizeLogData } from '../utils/logger.js';

const logger = createLogger('error-handler');

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
  details?: unknown;
}

export class CustomError extends Error implements AppError {
  public statusCode: number;
  public isOperational: boolean;
  public code: string;
  public details?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    details?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = (req.headers['x-request-id'] as string) || 'unknown';

  // Log error details
  logger.error('Error occurred', {
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode,
      details: sanitizeLogData(error.details),
    },
    request: {
      method: req.method,
      url: req.url,
      headers: sanitizeLogData(req.headers),
      body: sanitizeLogData(req.body),
      query: sanitizeLogData(req.query),
      params: sanitizeLogData(req.params),
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    },
    requestId,
  });

  // Determine status code
  const statusCode = error.statusCode || 500;

  // Determine if error is operational
  const isOperational = error.isOperational !== false;

  // Prepare error response
  const errorResponse = {
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: isOperational ? error.message : 'An unexpected error occurred',
      details:
        process.env['NODE_ENV'] === 'development' ? error.details : undefined,
      timestamp: new Date().toISOString(),
      requestId,
    },
  };

  // Send error response
  res.status(statusCode).json(errorResponse);
};

// Async error wrapper
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Validation error handler
export const validationErrorHandler = (error: unknown): CustomError => {
  if (error instanceof Error && 'issues' in error) {
    return new CustomError(
      'Validation failed',
      400,
      'VALIDATION_ERROR',
      true,
      error
    );
  }

  return new CustomError(
    'Invalid input data',
    400,
    'INVALID_INPUT',
    true,
    error
  );
};

// Database error handler
export const databaseErrorHandler = (error: unknown): CustomError => {
  if (error instanceof Error) {
    // SQLite specific errors
    if (error.message.includes('UNIQUE constraint failed')) {
      return new CustomError(
        'Resource already exists',
        409,
        'DUPLICATE_RESOURCE',
        true
      );
    }

    if (error.message.includes('FOREIGN KEY constraint failed')) {
      return new CustomError(
        'Referenced resource does not exist',
        400,
        'INVALID_REFERENCE',
        true
      );
    }

    if (error.message.includes('NOT NULL constraint failed')) {
      return new CustomError(
        'Required field is missing',
        400,
        'MISSING_REQUIRED_FIELD',
        true
      );
    }
  }

  return new CustomError(
    'Database operation failed',
    500,
    'DATABASE_ERROR',
    true,
    error
  );
};

// MQTT error handler
export const mqttErrorHandler = (error: unknown): CustomError => {
  if (error instanceof Error) {
    if (error.message.includes('ECONNREFUSED')) {
      return new CustomError(
        'Printer connection refused',
        503,
        'PRINTER_CONNECTION_REFUSED',
        true
      );
    }

    if (error.message.includes('ETIMEDOUT')) {
      return new CustomError(
        'Printer connection timeout',
        504,
        'PRINTER_CONNECTION_TIMEOUT',
        true
      );
    }

    if (error.message.includes('Authentication failed')) {
      return new CustomError(
        'Printer authentication failed',
        401,
        'PRINTER_AUTHENTICATION_FAILED',
        true
      );
    }
  }

  return new CustomError(
    'MQTT communication error',
    500,
    'MQTT_ERROR',
    true,
    error
  );
};
