/**
 * Print Job Service
 *
 * Handles print completion events from MQTT and automatically:
 * - Creates print job records
 * - Matches filaments by AMS slot
 * - Records filament usage
 * - Updates inventory
 */

import { createLogger } from '../utils/logger.js';
import { CustomError } from '../middleware/errorHandler.js';
import { bambuMQTTService } from './mqttService.js';
import type { H2DPrintCompletionData, H2DFilamentConsumption } from './mqttService.js';
import { PrinterDB } from '../database/services.js';
import { PrintJobDB, FilamentUsageDB } from '../database/printJobServices.js';
import { FilamentDB } from '../database/filamentServices.js';
import { filamentService } from './filamentService.js';
import type { PrintJob, NewPrintJob, NewFilamentUsage } from '../database/schema.js';
import type { Filament } from '../database/schema.js';

const logger = createLogger('print-job-service');

export interface PrintCompletionEvent {
  printerId: string; // Serial number from MQTT
  completionData: H2DPrintCompletionData;
  liveData: {
    printerId: string;
    currentPrint?: {
      filename?: string;
      jobName?: string;
      gcodeState?: string;
    };
  };
}

export class PrintJobService {
  private isListening = false;

  constructor() {
    // Service will be initialized on first use
  }

  /**
   * Initialize the service and start listening for print completion events
   */
  startListening(): void {
    if (this.isListening) {
      logger.warn('Print job service is already listening for events');
      return;
    }

    bambuMQTTService.on('print:completed', async (event: PrintCompletionEvent) => {
      try {
        await this.handlePrintCompletion(event);
      } catch (error) {
        logger.error('Error handling print completion', {
          error,
          printerId: event.printerId,
          filename: event.completionData.filename
        });
        // Don't throw - we don't want to break the event system
      }
    });

    this.isListening = true;
    logger.info('Print job service started listening for print completion events');
  }

  /**
   * Stop listening for print completion events
   */
  stopListening(): void {
    if (!this.isListening) {
      return;
    }

    bambuMQTTService.removeAllListeners('print:completed');
    this.isListening = false;
    logger.info('Print job service stopped listening for events');
  }

  /**
   * Handle print completion event
   * Main orchestration method
   */
  private async handlePrintCompletion(event: PrintCompletionEvent): Promise<void> {
    const { printerId: serialNumber, completionData, liveData } = event;

    logger.info('Processing print completion', {
      serialNumber,
      status: completionData.status,
      filename: completionData.filename,
    });

    // Step 1: Find printer by serial number to get printer ID and user ID
    const printer = await PrinterDB.findBySerialNumber(serialNumber);
    if (!printer) {
      logger.warn('Printer not found for print completion', { serialNumber });
      return; // Can't process without printer record
    }

    // Step 2: Create print job record
    const printJob = await this.createPrintJob(printer.id, printer.userId, completionData, liveData);

    // Step 3: Match filaments and record usage (only if completed successfully)
    if (completionData.status === 'completed' && completionData.actualFilament && completionData.actualFilament.length > 0) {
      await this.recordFilamentUsage(printer.id, printer.userId, printJob.id, completionData.actualFilament);
    } else if (completionData.status === 'completed') {
      logger.warn('Print completed but no filament consumption data available', {
        printJobId: printJob.id,
        serialNumber,
      });
    }

    logger.info('Print completion processed successfully', {
      printJobId: printJob.id,
      serialNumber,
    });
  }

  /**
   * Create a print job record in the database
   */
  private async createPrintJob(
    printerId: string,
    userId: string,
    completionData: H2DPrintCompletionData,
    liveData: PrintCompletionEvent['liveData']
  ): Promise<PrintJob> {
    const jobId = `print_job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();

    // Calculate end time based on duration if available
    let endTime: string | undefined = now;
    if (completionData.duration) {
      // Estimate start time (duration in seconds)
      const startTimeMs = Date.now() - (completionData.duration * 1000);
      endTime = new Date(startTimeMs + completionData.duration * 1000).toISOString();
    }

    const newJob: NewPrintJob = {
      id: jobId,
      userId,
      printerId,
      name: completionData.filename || completionData.jobName || 'Unknown Print',
      description: completionData.errorMessage || undefined,
      status: completionData.status === 'completed' ? 'completed' :
              completionData.status === 'failed' ? 'failed' : 'cancelled',
      progress: completionData.status === 'completed' ? 100 :
                completionData.layersCompleted && completionData.totalLayers
                  ? Math.round((completionData.layersCompleted / completionData.totalLayers) * 100)
                  : 0,
      startTime: completionData.duration ? new Date(Date.now() - (completionData.duration * 1000)).toISOString() : undefined,
      endTime,
      duration: completionData.duration,
      estimatedFilament: completionData.estimatedFilament,
      createdAt: now,
      updatedAt: now,
    };

    return await PrintJobDB.create(newJob);
  }

  /**
   * Match filaments by AMS slot and record usage
   */
  private async recordFilamentUsage(
    printerId: string,
    userId: string,
    printJobId: string,
    filamentConsumption: H2DFilamentConsumption[]
  ): Promise<void> {
    logger.info('Recording filament usage', {
      printJobId,
      printerId,
      consumptionCount: filamentConsumption.length,
    });

    for (const consumption of filamentConsumption) {
      try {
        // Skip if no slot or weight data
        if (!consumption.slot || !consumption.weight || consumption.weight <= 0) {
          logger.debug('Skipping filament consumption - missing slot or weight', {
            slot: consumption.slot,
            weight: consumption.weight,
          });
          continue;
        }

        // Find filament by AMS slot (and optionally AMS serial number if provided)
        // NOTE: This will NOT automatically assign filaments - it only records usage if filament is already assigned
        const filament = await FilamentDB.findByAmsSlotAndUser(printerId, consumption.slot, userId);

        if (!filament) {
          logger.warn('No filament found for AMS slot - skipping automatic usage tracking', {
            printerId,
            slot: consumption.slot,
            userId,
            message: 'Filament must be manually assigned to AMS slot before usage tracking works',
          });
          // Continue processing other slots - don't fail the whole job
          // This is intentional: we don't auto-assign filaments to prevent mismatches
          continue;
        }

        // Record usage
        await this.createFilamentUsageRecord(
          filament.id,
          printJobId,
          consumption.weight,
          consumption
        );

        // Update filament inventory (deduct weight, update status)
        await this.updateFilamentInventory(filament, consumption.weight);

        logger.info('Filament usage recorded', {
          filamentId: filament.id,
          filamentName: filament.name,
          slot: consumption.slot,
          weightUsed: consumption.weight,
          printJobId,
        });
      } catch (error) {
        logger.error('Failed to record filament usage for slot', {
          error,
          slot: consumption.slot,
          printJobId,
        });
        // Continue processing other slots
      }
    }
  }

  /**
   * Create a filament usage record
   */
  private async createFilamentUsageRecord(
    filamentId: string,
    printJobId: string,
    weightUsed: number,
    consumption: H2DFilamentConsumption
  ): Promise<void> {
    const usageId = `usage_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();

    const newUsage: NewFilamentUsage = {
      id: usageId,
      filamentId,
      printJobId,
      weightUsed,
      usageDate: now,
      notes: consumption.material
        ? `Automatic usage from print job. Material: ${consumption.material}, Color: ${consumption.color || 'N/A'}`
        : 'Automatic usage from print job',
    };

    await FilamentUsageDB.create(newUsage);
  }

  /**
   * Update filament inventory after usage
   * Enterprise-grade: Handles status transitions and prevents negative weights
   */
  private async updateFilamentInventory(
    filament: Filament,
    weightUsed: number
  ): Promise<void> {
    const currentRemaining = filament.remainingWeight || 0;
    const newRemaining = Math.max(0, currentRemaining - weightUsed);

    // Determine new status based on remaining weight
    let newStatus: 'active' | 'low' | 'empty' | 'stored' = filament.status;

    if (newRemaining <= 0) {
      newStatus = 'empty';
    } else if (newRemaining < 100) {
      newStatus = 'low';
    } else if (newRemaining < 1000 && filament.status === 'active') {
      // If below standard spool weight (1000g), mark as low
      newStatus = 'low';
    } else if (newRemaining >= 1000 && filament.status !== 'stored') {
      // If back to full weight or above, ensure it's active
      newStatus = 'active';
    }

    // Update filament using filamentService for consistency
    try {
      await FilamentDB.update(filament.id, {
        remainingWeight: newRemaining,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });

      logger.info('Filament inventory updated after print', {
        filamentId: filament.id,
        filamentName: filament.name,
        oldRemaining: currentRemaining,
        newRemaining,
        weightUsed,
        oldStatus: filament.status,
        newStatus,
      });

      // Log warning if filament is getting low or empty
      if (newStatus === 'low') {
        logger.warn('Filament is running low', {
          filamentId: filament.id,
          filamentName: filament.name,
          remainingWeight: newRemaining,
        });
      } else if (newStatus === 'empty') {
        logger.warn('Filament is now empty', {
          filamentId: filament.id,
          filamentName: filament.name,
        });
      }
    } catch (error) {
      logger.error('Failed to update filament inventory', {
        error,
        filamentId: filament.id,
        weightUsed,
      });
      throw error; // Re-throw to allow caller to handle
    }
  }

  /**
   * Get print jobs for a user
   */
  async getPrintJobsByUser(userId: string, limit?: number): Promise<PrintJob[]> {
    try {
      return await PrintJobDB.findByUserId(userId, limit);
    } catch (error) {
      logger.error('Failed to get print jobs by user', { error, userId });
      throw new CustomError('Failed to retrieve print jobs', 500);
    }
  }

  /**
   * Get print jobs for a printer
   */
  async getPrintJobsByPrinter(printerId: string, limit?: number): Promise<PrintJob[]> {
    try {
      return await PrintJobDB.findByPrinterId(printerId, limit);
    } catch (error) {
      logger.error('Failed to get print jobs by printer', { error, printerId });
      throw new CustomError('Failed to retrieve print jobs', 500);
    }
  }

  /**
   * Get print job by ID
   */
  async getPrintJobById(jobId: string): Promise<PrintJob | null> {
    try {
      return await PrintJobDB.findById(jobId);
    } catch (error) {
      logger.error('Failed to get print job by ID', { error, jobId });
      throw new CustomError('Failed to retrieve print job', 500);
    }
  }
}

// Export singleton instance
export const printJobService = new PrintJobService();

