import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { db } from './index.js';
import {
  users,
  printers,
  printerStatus,
  liveData,
  refreshTokens,
  auditLogs,
  type User,
  type NewUser,
  type Printer,
  type NewPrinter,
  type PrinterStatus as PrinterStatusType,
  type NewPrinterStatus,
  type LiveData as LiveDataType,
  type NewLiveData,
  type RefreshToken,
  type NewRefreshToken,
  type AuditLog,
  type NewAuditLog,
} from './schema.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('database-service');

// User Database Operations
export class UserDB {
  static async create(user: NewUser): Promise<User> {
    try {
      const result = await db.insert(users).values(user).returning();
      logger.debug('User created in database', {
        userId: user.id,
        username: user.username,
      });
      if (!result[0]) {
        throw new Error('Failed to create user - no result returned');
      }
      return result[0];
    } catch (error) {
      logger.error('Failed to create user in database', {
        error,
        userId: user.id,
      });
      throw error;
    }
  }

  static async findById(id: string): Promise<User | null> {
    try {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      return result[0] || null;
    } catch (error) {
      logger.error('Failed to find user by ID', { error, userId: id });
      throw error;
    }
  }

  static async findByUsername(username: string): Promise<User | null> {
    try {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);
      return result[0] || null;
    } catch (error) {
      logger.error('Failed to find user by username', { error, username });
      throw error;
    }
  }

  static async findByEmail(email: string): Promise<User | null> {
    try {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      return result[0] || null;
    } catch (error) {
      logger.error('Failed to find user by email', { error, email });
      throw error;
    }
  }

  static async findByUsernameOrEmail(identifier: string): Promise<User | null> {
    try {
      // Use parameterized queries to prevent SQL injection
      // Drizzle ORM handles parameterization automatically with eq() operator
      const usernameResult = await db
        .select()
        .from(users)
        .where(eq(users.username, identifier))
        .limit(1);

      if (usernameResult.length > 0 && usernameResult[0]) {
        return usernameResult[0];
      }

      const emailResult = await db
        .select()
        .from(users)
        .where(eq(users.email, identifier))
        .limit(1);

      return emailResult[0] ?? null;
    } catch (error) {
      logger.error('Failed to find user by username or email', {
        error,
        identifier,
      });
      throw error;
    }
  }

  static async update(id: string, updates: Partial<NewUser>): Promise<User> {
    try {
      const result = await db
        .update(users)
        .set({ ...updates, updatedAt: new Date().toISOString() })
        .where(eq(users.id, id))
        .returning();

      if (result.length === 0 || !result[0]) {
        throw new Error(`User with ID ${id} not found`);
      }

      logger.debug('User updated in database', { userId: id });
      return result[0];
    } catch (error) {
      logger.error('Failed to update user in database', { error, userId: id });
      throw error;
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      await db.delete(users).where(eq(users.id, id));
      logger.debug('User deleted from database', { userId: id });
    } catch (error) {
      logger.error('Failed to delete user from database', {
        error,
        userId: id,
      });
      throw error;
    }
  }

  static async findAll(): Promise<User[]> {
    try {
      const result = await db
        .select()
        .from(users)
        .orderBy(desc(users.createdAt));
      logger.debug('Retrieved all users from database', {
        count: result.length,
      });
      return result;
    } catch (error) {
      logger.error('Failed to retrieve all users from database', { error });
      throw error;
    }
  }
}

// Printer Database Operations
export class PrinterDB {
  static async create(printer: NewPrinter): Promise<Printer> {
    try {
      const result = await db.insert(printers).values(printer).returning();
      logger.debug('Printer created in database', {
        printerId: printer.id,
        name: printer.name,
      });
      if (!result[0]) {
        throw new Error('Failed to create printer - no result returned');
      }
      return result[0];
    } catch (error) {
      logger.error('Failed to create printer in database', {
        error,
        printerId: printer.id,
      });
      throw error;
    }
  }

  static async findById(id: string): Promise<Printer | null> {
    try {
      const result = await db
        .select()
        .from(printers)
        .where(eq(printers.id, id))
        .limit(1);
      return result[0] || null;
    } catch (error) {
      logger.error('Failed to find printer by ID', { error, printerId: id });
      throw error;
    }
  }

  static async findBySerialNumber(
    serialNumber: string
  ): Promise<Printer | null> {
    try {
      const result = await db
        .select()
        .from(printers)
        .where(eq(printers.serialNumber, serialNumber))
        .limit(1);
      return result[0] || null;
    } catch (error) {
      logger.error('Failed to find printer by serial number', {
        error,
        serialNumber,
      });
      throw error;
    }
  }

  static async findByUserId(userId: string): Promise<Printer[]> {
    try {
      const result = await db
        .select()
        .from(printers)
        .where(eq(printers.userId, userId))
        .orderBy(desc(printers.createdAt));
      logger.debug('Retrieved printers for user', {
        userId,
        count: result.length,
      });
      return result;
    } catch (error) {
      logger.error('Failed to find printers by user ID', { error, userId });
      throw error;
    }
  }

  static async findAll(): Promise<Printer[]> {
    try {
      const result = await db
        .select()
        .from(printers)
        .orderBy(desc(printers.createdAt));
      logger.debug('Retrieved all printers from database', {
        count: result.length,
      });
      return result;
    } catch (error) {
      logger.error('Failed to retrieve all printers from database', { error });
      throw error;
    }
  }

  static async update(
    id: string,
    updates: Partial<NewPrinter>
  ): Promise<Printer> {
    try {
      const result = await db
        .update(printers)
        .set({ ...updates, updatedAt: new Date().toISOString() })
        .where(eq(printers.id, id))
        .returning();

      if (result.length === 0 || !result[0]) {
        throw new Error(`Printer with ID ${id} not found`);
      }

      logger.debug('Printer updated in database', { printerId: id });
      return result[0];
    } catch (error) {
      logger.error('Failed to update printer in database', {
        error,
        printerId: id,
      });
      throw error;
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      await db.delete(printers).where(eq(printers.id, id));
      logger.debug('Printer deleted from database', { printerId: id });
    } catch (error) {
      logger.error('Failed to delete printer from database', {
        error,
        printerId: id,
      });
      throw error;
    }
  }
}

// Printer Status Database Operations
export class PrinterStatusDB {
  static async create(status: NewPrinterStatus): Promise<PrinterStatusType> {
    try {
      const result = await db.insert(printerStatus).values(status).returning();
      logger.debug('Printer status created in database', {
        statusId: status.id,
        printerId: status.printerId,
      });
      if (!result[0]) {
        throw new Error('Failed to create printer status - no result returned');
      }
      return result[0];
    } catch (error) {
      logger.error('Failed to create printer status in database', {
        error,
        statusId: status.id,
      });
      throw error;
    }
  }

  static async findByPrinterId(
    printerId: string
  ): Promise<PrinterStatusType | null> {
    try {
      const result = await db
        .select()
        .from(printerStatus)
        .where(eq(printerStatus.printerId, printerId))
        .limit(1);
      return result[0] || null;
    } catch (error) {
      logger.error('Failed to find printer status by printer ID', {
        error,
        printerId,
      });
      throw error;
    }
  }

  static async updateByPrinterId(
    printerId: string,
    updates: Partial<NewPrinterStatus>
  ): Promise<PrinterStatusType> {
    try {
      const result = await db
        .update(printerStatus)
        .set({ ...updates, updatedAt: new Date().toISOString() })
        .where(eq(printerStatus.printerId, printerId))
        .returning();

      if (result.length === 0 || !result[0]) {
        throw new Error(`Printer status for printer ID ${printerId} not found`);
      }

      logger.debug('Printer status updated in database', { printerId });
      return result[0];
    } catch (error) {
      logger.error('Failed to update printer status in database', {
        error,
        printerId,
      });
      throw error;
    }
  }

  static async deleteByPrinterId(printerId: string): Promise<void> {
    try {
      await db
        .delete(printerStatus)
        .where(eq(printerStatus.printerId, printerId));
      logger.debug('Printer status deleted from database', { printerId });
    } catch (error) {
      logger.error('Failed to delete printer status from database', {
        error,
        printerId,
      });
      throw error;
    }
  }
}

// Live Data Database Operations
export class LiveDataDB {
  static async create(data: NewLiveData): Promise<LiveDataType> {
    try {
      const result = await db.insert(liveData).values(data).returning();
      logger.debug('Live data created in database', {
        dataId: data.id,
        printerId: data.printerId,
      });
      if (!result[0]) {
        throw new Error('Failed to create live data - no result returned');
      }
      return result[0];
    } catch (error) {
      logger.error('Failed to create live data in database', {
        error,
        dataId: data.id,
      });
      throw error;
    }
  }

  static async findByPrinterId(
    printerId: string,
    limit: number = 100
  ): Promise<LiveDataType[]> {
    try {
      const result = await db
        .select()
        .from(liveData)
        .where(eq(liveData.printerId, printerId))
        .orderBy(desc(liveData.timestamp))
        .limit(limit);

      logger.debug('Retrieved live data for printer', {
        printerId,
        count: result.length,
      });
      return result;
    } catch (error) {
      logger.error('Failed to find live data by printer ID', {
        error,
        printerId,
      });
      throw error;
    }
  }

  static async findByPrinterIdAndTimeRange(
    printerId: string,
    startTime: string,
    endTime: string,
    limit: number = 100
  ): Promise<LiveDataType[]> {
    try {
      const result = await db
        .select()
        .from(liveData)
        .where(
          and(
            eq(liveData.printerId, printerId),
            gte(liveData.timestamp, startTime),
            lte(liveData.timestamp, endTime)
          )
        )
        .orderBy(desc(liveData.timestamp))
        .limit(limit);

      logger.debug('Retrieved live data for printer in time range', {
        printerId,
        count: result.length,
      });
      return result;
    } catch (error) {
      logger.error('Failed to find live data by printer ID and time range', {
        error,
        printerId,
      });
      throw error;
    }
  }

  static async getLatestByPrinterId(
    printerId: string
  ): Promise<LiveDataType | null> {
    try {
      const result = await db
        .select()
        .from(liveData)
        .where(eq(liveData.printerId, printerId))
        .orderBy(desc(liveData.timestamp))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      logger.error('Failed to get latest live data by printer ID', {
        error,
        printerId,
      });
      throw error;
    }
  }

  static async deleteOldData(maxAgeHours: number = 24): Promise<number> {
    try {
      const cutoffTime = new Date(
        Date.now() - maxAgeHours * 60 * 60 * 1000
      ).toISOString();
      const result = await db
        .delete(liveData)
        .where(lte(liveData.timestamp, cutoffTime));

      logger.info('Deleted old live data from database', {
        maxAgeHours,
        deletedCount: result.changes || 0,
      });

      return result.changes || 0;
    } catch (error) {
      logger.error('Failed to delete old live data from database', { error });
      throw error;
    }
  }
}

// Refresh Token Database Operations
export class RefreshTokenDB {
  static async create(token: NewRefreshToken): Promise<RefreshToken> {
    try {
      const result = await db.insert(refreshTokens).values(token).returning();
      logger.debug('Refresh token created in database', {
        userId: token.userId,
      });
      if (!result[0]) {
        throw new Error('Failed to create refresh token - no result returned');
      }
      return result[0];
    } catch (error) {
      logger.error('Failed to create refresh token in database', {
        error,
        userId: token.userId,
      });
      throw error;
    }
  }

  static async findByToken(token: string): Promise<RefreshToken | null> {
    try {
      const result = await db
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.token, token))
        .limit(1);
      return result[0] || null;
    } catch (error) {
      logger.error('Failed to find refresh token', { error });
      throw error;
    }
  }

  static async deleteByToken(token: string): Promise<void> {
    try {
      await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
      logger.debug('Refresh token deleted from database');
    } catch (error) {
      logger.error('Failed to delete refresh token from database', { error });
      throw error;
    }
  }

  static async deleteByUserId(userId: string): Promise<void> {
    try {
      await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
      logger.debug('Refresh tokens deleted for user', { userId });
    } catch (error) {
      logger.error('Failed to delete refresh tokens for user', {
        error,
        userId,
      });
      throw error;
    }
  }

  static async deleteExpired(): Promise<number> {
    try {
      const now = new Date().toISOString();
      const result = await db
        .delete(refreshTokens)
        .where(lte(refreshTokens.expiresAt, now));

      logger.info('Deleted expired refresh tokens', {
        deletedCount: result.changes || 0,
      });
      return result.changes || 0;
    } catch (error) {
      logger.error('Failed to delete expired refresh tokens', { error });
      throw error;
    }
  }
}

// Audit Log Database Operations
export class AuditLogDB {
  static async create(log: NewAuditLog): Promise<AuditLog> {
    try {
      const result = await db.insert(auditLogs).values(log).returning();
      logger.debug('Audit log created in database', {
        logId: log.id,
        eventType: log.eventType,
      });
      if (!result[0]) {
        throw new Error('Failed to create audit log - no result returned');
      }
      return result[0];
    } catch (error) {
      logger.error('Failed to create audit log in database', {
        error,
        logId: log.id,
      });
      throw error;
    }
  }

  static async findByUserId(
    userId: string,
    limit: number = 100
  ): Promise<AuditLog[]> {
    try {
      const result = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.userId, userId))
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit);

      logger.debug('Retrieved audit logs for user', {
        userId,
        count: result.length,
      });
      return result;
    } catch (error) {
      logger.error('Failed to find audit logs by user ID', { error, userId });
      throw error;
    }
  }

  static async findByPrinterId(
    printerId: string,
    limit: number = 100
  ): Promise<AuditLog[]> {
    try {
      const result = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.printerId, printerId))
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit);

      logger.debug('Retrieved audit logs for printer', {
        printerId,
        count: result.length,
      });
      return result;
    } catch (error) {
      logger.error('Failed to find audit logs by printer ID', {
        error,
        printerId,
      });
      throw error;
    }
  }

  static async findByEventType(
    eventType: string,
    limit: number = 100
  ): Promise<AuditLog[]> {
    try {
      const result = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.eventType, eventType))
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit);

      logger.debug('Retrieved audit logs for event type', {
        eventType,
        count: result.length,
      });
      return result;
    } catch (error) {
      logger.error('Failed to find audit logs by event type', {
        error,
        eventType,
      });
      throw error;
    }
  }

  static async deleteOldLogs(maxAgeDays: number = 30): Promise<number> {
    try {
      const cutoffTime = new Date(
        Date.now() - maxAgeDays * 24 * 60 * 60 * 1000
      ).toISOString();
      const result = await db
        .delete(auditLogs)
        .where(lte(auditLogs.createdAt, cutoffTime));

      logger.info('Deleted old audit logs', {
        maxAgeDays,
        deletedCount: result.changes || 0,
      });

      return result.changes || 0;
    } catch (error) {
      logger.error('Failed to delete old audit logs', { error });
      throw error;
    }
  }
}
