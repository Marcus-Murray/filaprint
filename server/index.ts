import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createLogger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { securityMiddleware } from './middleware/security.js';
import { auditLogger } from './middleware/auditLogger.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { printerRouter } from './routes/printers.js';
import { filamentRouter } from './routes/filaments.js';
import { printJobRouter } from './routes/printJobs.js';

// Load environment variables
dotenv.config();

const app = express();
const logger = createLogger('server');
const PORT = process.env['PORT'] || 3000;

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
const allowedOrigins = process.env['CLIENT_URL']
  ? process.env['CLIENT_URL'].split(',').map((url) => url.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.indexOf(origin) !== -1 || process.env['NODE_ENV'] === 'development') {
        callback(null, true);
      } else {
        logger.warn('CORS blocked origin', { origin, allowedOrigins });
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
  })
);

// Rate limiting - more lenient in development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Much higher limit in development
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health';
  },
});

app.use(limiter);

// Compression middleware
app.use(compression());

// Logging middleware
app.use(
  morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim()),
    },
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security middleware
app.use(securityMiddleware);

// Audit logging middleware
app.use(auditLogger);

// API routes
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/printers', printerRouter);
app.use('/api/filaments', filamentRouter);
app.use('/api/print-jobs', printJobRouter);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'FilaPrint API Server',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found.',
      timestamp: new Date().toISOString(),
      requestId: (req.headers['x-request-id'] as string) || 'unknown',
    },
  });
});

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 FilaPrint server running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env['NODE_ENV'] || 'development'}`);
  logger.info(
    `🔒 Security: ${process.env['NODE_ENV'] === 'production' ? 'enabled' : 'development mode'}`
  );
});

export default app;
