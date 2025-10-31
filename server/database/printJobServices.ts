/**
 * Print Job Database Operations
 *
 * Handles CRUD operations for print jobs and filament usage tracking
 */

import { eq, and, desc } from 'drizzle-orm';
import { db } from './index.js';
import { printJobs, filamentUsage, type PrintJob, type NewPrintJob, type FilamentUsage, type NewFilamentUsage } from './schema.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('print-job-db');

export class PrintJobDB {
  /**
   * Create a new print job
   */
  static async create(job: NewPrintJob): Promise<PrintJob> {
    try {
      const result = await db.insert(printJobs).values(job).returning();
      if (!result[0]) {
        throw new Error('Failed to create print job - no result returned');
      }
      logger.debug('Print job created', { jobId: job.id, printerId: job.printerId });
      return result[0];
    } catch (error) {
      logger.error('Failed to create print job', { error, jobId: job.id });
      throw error;
    }
  }

  /**
   * Find print job by ID
   */
  static async findById(jobId: string): Promise<PrintJob | null> {
    try {
      const result = await db
        .select()
        .from(printJobs)
        .where(eq(printJobs.id, jobId))
        .limit(1);
      return result[0] || null;
    } catch (error) {
      logger.error('Failed to find print job by ID', { error, jobId });
      throw error;
    }
  }

  /**
   * Find print jobs by user ID
   */
  static async findByUserId(userId: string, limit?: number): Promise<PrintJob[]> {
    try {
      const baseQuery = db
        .select()
        .from(printJobs)
        .where(eq(printJobs.userId, userId))
        .orderBy(desc(printJobs.createdAt));

      if (limit && limit > 0) {
        return await baseQuery.limit(limit);
      }

      return await baseQuery;
    } catch (error) {
      logger.error('Failed to find print jobs by user ID', { error, userId });
      throw error;
    }
  }

  /**
   * Find print jobs by printer ID
   */
  static async findByPrinterId(printerId: string, limit?: number): Promise<PrintJob[]> {
    try {
      const baseQuery = db
        .select()
        .from(printJobs)
        .where(eq(printJobs.printerId, printerId))
        .orderBy(desc(printJobs.createdAt));

      if (limit && limit > 0) {
        return await baseQuery.limit(limit);
      }

      return await baseQuery;
    } catch (error) {
      logger.error('Failed to find print jobs by printer ID', { error, printerId });
      throw error;
    }
  }

  /**
   * Update print job
   */
  static async update(jobId: string, updates: Partial<NewPrintJob>): Promise<PrintJob> {
    try {
      const result = await db
        .update(printJobs)
        .set({ ...updates, updatedAt: new Date().toISOString() })
        .where(eq(printJobs.id, jobId))
        .returning();

      if (!result[0]) {
        throw new Error(`Print job with ID ${jobId} not found`);
      }

      logger.debug('Print job updated', { jobId });
      return result[0];
    } catch (error) {
      logger.error('Failed to update print job', { error, jobId });
      throw error;
    }
  }

  /**
   * Delete print job (cascade will handle filament_usage cleanup)
   */
  static async delete(jobId: string): Promise<void> {
    try {
      await db.delete(printJobs).where(eq(printJobs.id, jobId));
      logger.debug('Print job deleted', { jobId });
    } catch (error) {
      logger.error('Failed to delete print job', { error, jobId });
      throw error;
    }
  }
}

export class FilamentUsageDB {
  /**
   * Create a new filament usage record
   */
  static async create(usage: NewFilamentUsage): Promise<FilamentUsage> {
    try {
      const result = await db.insert(filamentUsage).values(usage).returning();
      if (!result[0]) {
        throw new Error('Failed to create filament usage - no result returned');
      }
      logger.debug('Filament usage recorded', {
        usageId: usage.id,
        filamentId: usage.filamentId,
        weightUsed: usage.weightUsed
      });
      return result[0];
    } catch (error) {
      logger.error('Failed to create filament usage', { error, usageId: usage.id });
      throw error;
    }
  }

  /**
   * Find usage records by filament ID
   */
  static async findByFilamentId(filamentId: string): Promise<FilamentUsage[]> {
    try {
      return await db
        .select()
        .from(filamentUsage)
        .where(eq(filamentUsage.filamentId, filamentId))
        .orderBy(desc(filamentUsage.usageDate));
    } catch (error) {
      logger.error('Failed to find filament usage by filament ID', { error, filamentId });
      throw error;
    }
  }

  /**
   * Find usage records by print job ID
   */
  static async findByPrintJobId(printJobId: string): Promise<FilamentUsage[]> {
    try {
      return await db
        .select()
        .from(filamentUsage)
        .where(eq(filamentUsage.printJobId, printJobId))
        .orderBy(desc(filamentUsage.usageDate));
    } catch (error) {
      logger.error('Failed to find filament usage by print job ID', { error, printJobId });
      throw error;
    }
  }

  /**
   * Get total usage for a filament
   */
  static async getTotalUsage(filamentId: string): Promise<number> {
    try {
      const usages = await this.findByFilamentId(filamentId);
      return usages.reduce((total, usage) => total + usage.weightUsed, 0);
    } catch (error) {
      logger.error('Failed to get total usage for filament', { error, filamentId });
      throw error;
    }
  }
}

