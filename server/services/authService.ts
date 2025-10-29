import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createLogger } from '../utils/logger.js';
import { logAuthEvent } from '../middleware/auditLogger.js';
import { CustomError } from '../middleware/errorHandler.js';
import { UserDB, RefreshTokenDB } from '../database/services.js';
import { initializeDatabase } from '../database/index.js';
import type { User, NewUser } from '../database/schema.js';

const logger = createLogger('auth-service');

// User types (re-exported from schema)
export type { User, NewUser };

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  role?: 'admin' | 'user';
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  userId: string;
  username: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

// Authentication Service
export class AuthService {
  // Configuration
  private readonly saltRounds = 12;
  private readonly accessTokenExpiry = '15m';
  private readonly refreshTokenExpiry = '7d';
  private readonly maxFailedAttempts = 5;
  private readonly lockoutDuration = 30 * 60 * 1000; // 30 minutes

  constructor() {
    this.initializeDatabase();
  }

  /**
   * Initialize database and create default admin
   */
  private async initializeDatabase(): Promise<void> {
    try {
      await initializeDatabase();
      await this.createDefaultAdmin();
    } catch (error) {
      logger.error('Failed to initialize database', { error });
      throw error;
    }
  }

  /**
   * Register a new user
   */
  async register(
    userData: CreateUserData,
    req?: any
  ): Promise<{ user: Omit<User, 'passwordHash'>; tokens: AuthTokens }> {
    try {
      logger.info('User registration attempt', {
        username: userData.username,
        email: userData.email,
        role: userData.role || 'user',
      });

      // Validate input
      this.validateUserData(userData);

      // Check if user already exists
      const existingUser = await UserDB.findByUsernameOrEmail(
        userData.username
      );
      if (existingUser) {
        throw new CustomError('User already exists', 409, 'USER_EXISTS');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(
        userData.password,
        this.saltRounds
      );

      // Create user
      const userId = this.generateUserId();
      const now = new Date().toISOString();

      const newUser: NewUser = {
        id: userId,
        username: userData.username,
        email: userData.email,
        passwordHash,
        role: userData.role || 'user',
        isActive: true,
        createdAt: now,
        updatedAt: now,
        failedLoginAttempts: 0,
      };

      // Store user in database
      const user = await UserDB.create(newUser);

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Log successful registration
      logAuthEvent(
        'register',
        userId,
        {
          username: userData.username,
          email: userData.email,
          role: user.role,
        },
        req
      );

      logger.info('User registered successfully', {
        userId,
        username: userData.username,
        role: user.role,
      });

      // Return user without password hash
      const { passwordHash: _, ...userWithoutPassword } = user;
      return {
        user: userWithoutPassword,
        tokens,
      };
    } catch (error) {
      logger.error('User registration failed', {
        error,
        username: userData.username,
      });
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(
    credentials: LoginCredentials,
    req?: any
  ): Promise<{ user: Omit<User, 'passwordHash'>; tokens: AuthTokens }> {
    try {
      logger.info('User login attempt', { username: credentials.username });

      // Find user
      const user = await UserDB.findByUsernameOrEmail(credentials.username);
      if (!user) {
        await this.handleFailedLogin(credentials.username, req);
        throw new CustomError(
          'Invalid credentials',
          401,
          'INVALID_CREDENTIALS'
        );
      }

      // Check if user is locked
      if (this.isUserLocked(user)) {
        throw new CustomError(
          'Account is temporarily locked due to too many failed attempts',
          423,
          'ACCOUNT_LOCKED'
        );
      }

      // Check if user is active
      if (!user.isActive) {
        throw new CustomError(
          'Account is deactivated',
          403,
          'ACCOUNT_DEACTIVATED'
        );
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(
        credentials.password,
        user.passwordHash
      );
      if (!isPasswordValid) {
        await this.handleFailedLogin(credentials.username, req, user);
        throw new CustomError(
          'Invalid credentials',
          401,
          'INVALID_CREDENTIALS'
        );
      }

      // Reset failed login attempts and update last login
      await UserDB.update(user.id, {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date().toISOString(),
      });

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Log successful login
      logAuthEvent(
        'login',
        user.id,
        {
          username: user.username,
          role: user.role,
          lastLoginAt: new Date().toISOString(),
        },
        req
      );

      logger.info('User logged in successfully', {
        userId: user.id,
        username: user.username,
        role: user.role,
      });

      // Return user without password hash
      const { passwordHash: _, ...userWithoutPassword } = user;
      return {
        user: userWithoutPassword,
        tokens,
      };
    } catch (error) {
      logger.error('User login failed', {
        error,
        username: credentials.username,
      });
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string, req?: any): Promise<AuthTokens> {
    try {
      logger.info('Token refresh attempt');

      // Verify refresh token
      const decoded = jwt.verify(
        refreshToken,
        process.env['JWT_SECRET'] || 'fallback-secret'
      ) as JwtPayload;

      // Check if refresh token exists in database
      const storedToken = await RefreshTokenDB.findByToken(refreshToken);
      if (!storedToken || storedToken.userId !== decoded.userId) {
        throw new CustomError(
          'Invalid refresh token',
          401,
          'INVALID_REFRESH_TOKEN'
        );
      }

      // Check if token is expired
      if (new Date(storedToken.expiresAt) < new Date()) {
        await RefreshTokenDB.deleteByToken(refreshToken);
        throw new CustomError(
          'Refresh token expired',
          401,
          'REFRESH_TOKEN_EXPIRED'
        );
      }

      // Get user
      const user = await UserDB.findById(decoded.userId);
      if (!user || !user.isActive) {
        throw new CustomError(
          'User not found or inactive',
          401,
          'USER_NOT_FOUND'
        );
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      // Remove old refresh token
      await RefreshTokenDB.deleteByToken(refreshToken);

      logger.info('Token refreshed successfully', { userId: user.id });

      return tokens;
    } catch (error) {
      logger.error('Token refresh failed', { error });
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(refreshToken: string, req?: any): Promise<void> {
    try {
      logger.info('User logout attempt');

      // Remove refresh token from database
      const storedToken = await RefreshTokenDB.findByToken(refreshToken);
      if (storedToken) {
        await RefreshTokenDB.deleteByToken(refreshToken);
        logAuthEvent('logout', storedToken.userId, undefined, req);
        logger.info('User logged out successfully', {
          userId: storedToken.userId,
        });
      }
    } catch (error) {
      logger.error('User logout failed', { error });
      throw error;
    }
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      const decoded = jwt.verify(
        token,
        process.env['JWT_SECRET'] || 'fallback-secret'
      ) as JwtPayload;

      // Check if user still exists and is active
      const user = await UserDB.findById(decoded.userId);
      if (!user || !user.isActive) {
        throw new CustomError(
          'User not found or inactive',
          401,
          'USER_NOT_FOUND'
        );
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new CustomError('Invalid token', 401, 'INVALID_TOKEN');
      }
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(
    userId: string
  ): Promise<Omit<User, 'passwordHash'> | null> {
    try {
      const user = await UserDB.findById(userId);
      if (!user) return null;

      const { passwordHash: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      logger.error('Failed to get user by ID', { error, userId });
      throw new CustomError(
        'Failed to retrieve user',
        500,
        'USER_RETRIEVAL_ERROR',
        true,
        error
      );
    }
  }

  /**
   * Update user password
   */
  async updatePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    req?: any
  ): Promise<void> {
    try {
      const user = await UserDB.findById(userId);
      if (!user) {
        throw new CustomError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.passwordHash
      );
      if (!isCurrentPasswordValid) {
        throw new CustomError(
          'Current password is incorrect',
          400,
          'INVALID_CURRENT_PASSWORD'
        );
      }

      // Validate new password
      this.validatePassword(newPassword);

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, this.saltRounds);

      // Update user in database
      await UserDB.update(userId, { passwordHash: newPasswordHash });

      logAuthEvent('password_reset', userId, undefined, req);

      logger.info('Password updated successfully', { userId });
    } catch (error) {
      logger.error('Password update failed', { error, userId });
      throw error;
    }
  }

  /**
   * Generate JWT tokens
   */
  private async generateTokens(user: User): Promise<AuthTokens> {
    const jwtSecret = process.env['JWT_SECRET'] || 'fallback-secret';

    // Create payload
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    // Generate access token
    const accessToken = jwt.sign(payload, jwtSecret, {
      expiresIn: this.accessTokenExpiry,
    });

    // Generate refresh token
    const refreshToken = jwt.sign(payload, jwtSecret, {
      expiresIn: this.refreshTokenExpiry,
    });

    // Store refresh token in database
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7); // 7 days

    await RefreshTokenDB.create({
      token: refreshToken,
      userId: user.id,
      expiresAt: refreshTokenExpiry.toISOString(),
      createdAt: new Date().toISOString(),
    });

    // Calculate expiry time
    const expiresIn = 15 * 60; // 15 minutes in seconds

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Validate user data
   */
  private validateUserData(userData: CreateUserData): void {
    if (!userData.username || userData.username.length < 3) {
      throw new CustomError(
        'Username must be at least 3 characters long',
        400,
        'INVALID_USERNAME'
      );
    }

    if (!userData.email || !this.isValidEmail(userData.email)) {
      throw new CustomError('Invalid email format', 400, 'INVALID_EMAIL');
    }

    this.validatePassword(userData.password);

    if (userData.role && !['admin', 'user'].includes(userData.role)) {
      throw new CustomError('Invalid role', 400, 'INVALID_ROLE');
    }
  }

  /**
   * Validate password
   */
  private validatePassword(password: string): void {
    if (!password || password.length < 8) {
      throw new CustomError(
        'Password must be at least 8 characters long',
        400,
        'INVALID_PASSWORD'
      );
    }

    // Check for at least one uppercase, lowercase, number, and special character
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      throw new CustomError(
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        400,
        'INVALID_PASSWORD'
      );
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Handle failed login attempt
   */
  private async handleFailedLogin(
    username: string,
    req?: any,
    user?: User
  ): Promise<void> {
    logAuthEvent('failed_login', user?.id, { username }, req);

    if (user) {
      const newFailedAttempts = user.failedLoginAttempts + 1;
      let updates: Partial<NewUser> = {
        failedLoginAttempts: newFailedAttempts,
      };

      if (newFailedAttempts >= this.maxFailedAttempts) {
        updates.lockedUntil = new Date(
          Date.now() + this.lockoutDuration
        ).toISOString();

        logger.warn('User account locked due to too many failed attempts', {
          userId: user.id,
          username: user.username,
          failedAttempts: newFailedAttempts,
          lockedUntil: updates.lockedUntil,
        });
      }

      await UserDB.update(user.id, updates);
    }
  }

  /**
   * Check if user is locked
   */
  private isUserLocked(user: User): boolean {
    if (!user.lockedUntil) return false;

    const lockUntil = new Date(user.lockedUntil);
    const now = new Date();

    if (now < lockUntil) {
      return true;
    }

    // Lock has expired, reset it
    UserDB.update(user.id, {
      lockedUntil: null,
      failedLoginAttempts: 0,
    });
    return false;
  }

  /**
   * Generate unique user ID
   */
  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Create default admin user
   */
  private async createDefaultAdmin(): Promise<void> {
    try {
      const adminExists = await UserDB.findByUsername('admin');
      if (adminExists) return;

      const adminPassword = process.env['ADMIN_PASSWORD'] || 'Admin123!';
      const passwordHash = await bcrypt.hash(adminPassword, this.saltRounds);

      const adminUser: NewUser = {
        id: 'admin_default',
        username: 'admin',
        email: 'admin@filaprint.com',
        passwordHash,
        role: 'admin',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        failedLoginAttempts: 0,
      };

      await UserDB.create(adminUser);

      logger.info('Default admin user created', {
        username: adminUser.username,
        email: adminUser.email,
      });
    } catch (error) {
      logger.error('Failed to create default admin user', { error });
    }
  }

  /**
   * Get all users (admin only)
   */
  async getAllUsers(): Promise<Omit<User, 'passwordHash'>[]> {
    const users = await UserDB.findAll();
    return users.map(user => {
      const { passwordHash: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }

  /**
   * Update user role (admin only)
   */
  async updateUserRole(
    userId: string,
    newRole: 'admin' | 'user',
    req?: any
  ): Promise<void> {
    const user = await UserDB.findById(userId);
    if (!user) {
      throw new CustomError('User not found', 404, 'USER_NOT_FOUND');
    }

    const oldRole = user.role;
    await UserDB.update(userId, { role: newRole });

    logger.info('User role updated', {
      userId,
      username: user.username,
      oldRole,
      newRole,
    });
  }

  /**
   * Deactivate user (admin only)
   */
  async deactivateUser(userId: string, req?: any): Promise<void> {
    const user = await UserDB.findById(userId);
    if (!user) {
      throw new CustomError('User not found', 404, 'USER_NOT_FOUND');
    }

    await UserDB.update(userId, { isActive: false });

    // Remove all refresh tokens for this user
    await RefreshTokenDB.deleteByUserId(userId);

    logger.info('User deactivated', {
      userId,
      username: user.username,
    });
  }
}

// Export singleton instance
export const authService = new AuthService();
