import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { authService, JwtPayload } from '../services/authService.js';
import { createLogger } from '../utils/logger.js';
import { logSecurityEvent } from '../middleware/auditLogger.js';
import { CustomError } from './errorHandler.js';

const logger = createLogger('auth-middleware');

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Authentication middleware - verifies JWT token
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new CustomError('No token provided', 401, 'NO_TOKEN');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      throw new CustomError('No token provided', 401, 'NO_TOKEN');
    }

    // Verify token
    const decoded = await authService.verifyToken(token);

    // Add user to request
    req.user = decoded;

    logger.debug('User authenticated', {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
    });

    next();
  } catch (error) {
    logger.warn('Authentication failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
    });

    logSecurityEvent(
      'authentication_failed',
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
      },
      req
    );

    next(error);
  }
};

/**
 * Authorization middleware - checks user role
 */
export const authorize = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new CustomError(
          'Authentication required',
          401,
          'AUTHENTICATION_REQUIRED'
        );
      }

      if (!allowedRoles.includes(req.user.role)) {
        logger.warn('Authorization failed - insufficient role', {
          userId: req.user.userId,
          username: req.user.username,
          userRole: req.user.role,
          requiredRoles: allowedRoles,
          ip: req.ip,
          url: req.url,
        });

        logSecurityEvent(
          'authorization_failed',
          {
            userId: req.user.userId,
            username: req.user.username,
            userRole: req.user.role,
            requiredRoles: allowedRoles,
            ip: req.ip,
            url: req.url,
          },
          req
        );

        throw new CustomError(
          'Insufficient permissions',
          403,
          'INSUFFICIENT_PERMISSIONS'
        );
      }

      logger.debug('User authorized', {
        userId: req.user.userId,
        username: req.user.username,
        role: req.user.role,
        requiredRoles: allowedRoles,
      });

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Admin only middleware
 */
export const adminOnly = authorize(['admin']);

/**
 * User or admin middleware
 */
export const userOrAdmin = authorize(['user', 'admin']);

/**
 * Optional authentication middleware - doesn't fail if no token
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      if (token) {
        try {
          const decoded = await authService.verifyToken(token);
          req.user = decoded;

          logger.debug('Optional authentication successful', {
            userId: decoded.userId,
            username: decoded.username,
            role: decoded.role,
          });
        } catch (error) {
          // Token is invalid, but we don't fail the request
          logger.debug('Optional authentication failed - invalid token', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    next();
  } catch (error) {
    // Don't fail the request for optional auth
    logger.debug('Optional authentication error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    next();
  }
};

/**
 * Rate limiting middleware for authentication endpoints
 * More strict than general rate limiting
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env['NODE_ENV'] === 'production' ? 5 : 20, // Much stricter for auth
  message: {
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please try again later.',
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

/**
 * Validate user ownership middleware
 */
export const validateUserOwnership = (userIdParam: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new CustomError(
          'Authentication required',
          401,
          'AUTHENTICATION_REQUIRED'
        );
      }

      const requestedUserId = req.params[userIdParam];

      // Admin can access any user's data
      if (req.user.role === 'admin') {
        next();
        return;
      }

      // Regular users can only access their own data
      if (req.user.userId !== requestedUserId) {
        logger.warn('User ownership validation failed', {
          userId: req.user.userId,
          username: req.user.username,
          requestedUserId,
          ip: req.ip,
          url: req.url,
        });

        logSecurityEvent(
          'ownership_validation_failed',
          {
            userId: req.user.userId,
            username: req.user.username,
            requestedUserId,
            ip: req.ip,
            url: req.url,
          },
          req
        );

        throw new CustomError(
          'Access denied - can only access your own data',
          403,
          'ACCESS_DENIED'
        );
      }

      logger.debug('User ownership validated', {
        userId: req.user.userId,
        username: req.user.username,
        requestedUserId,
      });

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check if user is active middleware
 */
export const requireActiveUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new CustomError(
        'Authentication required',
        401,
        'AUTHENTICATION_REQUIRED'
      );
    }

    const user = await authService.getUserById(req.user.userId);
    if (!user || !user.isActive) {
      logger.warn('Inactive user attempted access', {
        userId: req.user.userId,
        username: req.user.username,
        ip: req.ip,
        url: req.url,
      });

      logSecurityEvent(
        'inactive_user_access',
        {
          userId: req.user.userId,
          username: req.user.username,
          ip: req.ip,
          url: req.url,
        },
        req
      );

      throw new CustomError(
        'Account is deactivated',
        403,
        'ACCOUNT_DEACTIVATED'
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Security headers middleware for auth endpoints
 */
export const authSecurityHeaders = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Add security headers for authentication endpoints
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Prevent caching of auth responses
  res.setHeader(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate'
  );
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  next();
};

/**
 * Log authentication events middleware
 */
export const logAuthEvents = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const originalSend = res.send;

  res.send = function (data: any) {
    // Log successful authentication events
    if (req.url.includes('/login') && res.statusCode === 200) {
      logger.info('Authentication event logged', {
        event: 'login_success',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
      });
    }

    if (req.url.includes('/register') && res.statusCode === 201) {
      logger.info('Authentication event logged', {
        event: 'registration_success',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
      });
    }

    return originalSend.call(this, data);
  };

  next();
};
