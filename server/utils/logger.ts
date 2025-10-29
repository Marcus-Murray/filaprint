import winston from 'winston';
import path from 'path';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Create logger instance
export const createLogger = (service: string): winston.Logger => {
  return winston.createLogger({
    level: process.env['LOG_LEVEL'] || 'info',
    format: logFormat,
    defaultMeta: { service },
    transports: [
      // Console transport
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
          winston.format.printf(
            ({ timestamp, level, message, service, ...meta }) => {
              return `${timestamp} [${service}] ${level}: ${message} ${
                Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
              }`;
            }
          )
        ),
      }),
      // File transport for errors
      new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      // File transport for all logs
      new winston.transports.File({
        filename: path.join(logsDir, 'combined.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
    ],
  });
};

// Sanitize sensitive data from logs
export const sanitizeLogData = (data: unknown): unknown => {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'key',
    'authorization',
    'cookie',
    'session',
    'accessCode',
    'serialNumber',
  ];

  const sanitized = { ...data } as Record<string, unknown>;

  for (const key of sensitiveKeys) {
    if (key in sanitized) {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
};

// Request ID generator
export const generateRequestId = (): string => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};

// Performance timer
export class PerformanceTimer {
  private startTime: number;
  private label: string;

  constructor(label: string) {
    this.label = label;
    this.startTime = Date.now();
  }

  end(): number {
    const duration = Date.now() - this.startTime;
    return duration;
  }

  log(logger: winston.Logger, level: 'info' | 'warn' | 'error' = 'info'): void {
    const duration = this.end();
    logger[level](`${this.label} completed in ${duration}ms`);
  }
}
