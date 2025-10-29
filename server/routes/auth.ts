import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logAuthEvent } from '../middleware/auditLogger.js';
import {
  authService,
  CreateUserData,
  LoginCredentials,
} from '../services/authService.js';
import {
  authenticate,
  adminOnly,
  validateUserOwnership,
  authRateLimit,
  authSecurityHeaders,
  logAuthEvents,
} from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

// Apply security middleware to all auth routes
router.use(authSecurityHeaders);
router.use(logAuthEvents);

// Validation schemas
const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'user']).optional(),
});

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

const updateRoleSchema = z.object({
  role: z.enum(['admin', 'user']),
});

// Register new user
router.post(
  '/register',
  authRateLimit,
  asyncHandler(async (req, res) => {
    const validatedData = registerSchema.parse(req.body);

    const userData: CreateUserData = {
      username: validatedData.username,
      email: validatedData.email,
      password: validatedData.password,
      role: validatedData.role ?? 'user',
    };

    const result = await authService.register(userData, req);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: result.user,
        tokens: result.tokens,
      },
    });
  })
);

// Login user
router.post(
  '/login',
  authRateLimit,
  asyncHandler(async (req, res) => {
    const validatedData = loginSchema.parse(req.body);

    const credentials: LoginCredentials = {
      username: validatedData.username,
      password: validatedData.password,
    };

    const result = await authService.login(credentials, req);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
        tokens: result.tokens,
      },
    });
  })
);

// Refresh access token
router.post(
  '/refresh',
  authRateLimit,
  asyncHandler(async (req, res) => {
    const validatedData = refreshTokenSchema.parse(req.body);

    const tokens = await authService.refreshToken(
      validatedData.refreshToken,
      req
    );

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: tokens,
    });
  })
);

// Logout user
router.post(
  '/logout',
  authRateLimit,
  asyncHandler(async (req, res) => {
    const validatedData = refreshTokenSchema.parse(req.body);

    await authService.logout(validatedData.refreshToken, req);

    res.json({
      success: true,
      message: 'Logout successful',
    });
  })
);

// Get current user profile
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'],
        },
      });
    }

    const user = await authService.getUserById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'],
        },
      });
    }

    res.json({
      success: true,
      data: user,
    });
  })
);

// Update user password
router.put(
  '/me/password',
  authenticate,
  asyncHandler(async (req, res) => {
    const validatedData = updatePasswordSchema.parse(req.body);

    await authService.updatePassword(
      req.user!.userId,
      validatedData.currentPassword,
      validatedData.newPassword,
      req
    );

    res.json({
      success: true,
      message: 'Password updated successfully',
    });
  })
);

// Get all users (admin only)
router.get(
  '/users',
  authenticate,
  adminOnly,
  asyncHandler(async (req, res) => {
    const users = await authService.getAllUsers();

    res.json({
      success: true,
      data: users,
      count: users.length,
    });
  })
);

// Get user by ID (admin or own profile)
router.get(
  '/users/:userId',
  authenticate,
  validateUserOwnership('userId'),
  asyncHandler(async (req, res) => {
    const userId = req.params['userId'] as string;

    const user = await authService.getUserById(userId);

    if (!user) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'],
        },
      });
    }

    res.json({
      success: true,
      data: user,
    });
  })
);

// Update user role (admin only)
router.put(
  '/users/:userId/role',
  authenticate,
  adminOnly,
  asyncHandler(async (req, res) => {
    const userId = req.params['userId'] as string;
    const validatedData = updateRoleSchema.parse(req.body);

    await authService.updateUserRole(userId, validatedData.role, req);

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: { userId, role: validatedData.role },
    });
  })
);

// Deactivate user (admin only)
router.put(
  '/users/:userId/deactivate',
  authenticate,
  adminOnly,
  asyncHandler(async (req, res) => {
    const userId = req.params['userId'] as string;

    await authService.deactivateUser(userId, req);

    res.json({
      success: true,
      message: 'User deactivated successfully',
      data: { userId },
    });
  })
);

// Verify token endpoint
router.get(
  '/verify',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        user: req.user,
        valid: true,
      },
    });
  })
);

export { router as authRouter };
