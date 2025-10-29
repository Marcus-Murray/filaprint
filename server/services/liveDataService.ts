import { createLogger } from '../utils/logger.js';
import { logDatabaseOperation } from '../middleware/auditLogger.js';
import { H2DLiveData } from './mqttService.js';

const logger = createLogger('live-data-service');

// In-memory storage for live data (will be replaced with database)
interface LiveDataStore {
  [printerId: string]: {
    current: H2DLiveData | null;
    history: H2DLiveData[];
    lastUpdated: string;
  };
}

// Live Data Storage Service
export class LiveDataService {
  private dataStore: LiveDataStore = {};
  private maxHistorySize = 1000; // Keep last 1000 data points per printer

  /**
   * Store live data from printer
   */
  async storeLiveData(liveData: H2DLiveData): Promise<void> {
    try {
      const printerId = liveData.printerId;

      // Initialize printer data if not exists
      if (!this.dataStore[printerId]) {
        this.dataStore[printerId] = {
          current: null,
          history: [],
          lastUpdated: new Date().toISOString(),
        };
      }

      // Update current data
      this.dataStore[printerId].current = liveData;
      this.dataStore[printerId].lastUpdated = liveData.timestamp;

      // Add to history
      this.dataStore[printerId].history.push(liveData);

      // Trim history if too large
      if (this.dataStore[printerId].history.length > this.maxHistorySize) {
        this.dataStore[printerId].history = this.dataStore[
          printerId
        ].history.slice(-this.maxHistorySize);
      }

      logger.debug('Stored live data', {
        printerId,
        timestamp: liveData.timestamp,
        status: liveData.status.status,
        temperature: liveData.temperatures.nozzle1,
      });

      logDatabaseOperation('create', 'live_data', printerId, {
        timestamp: liveData.timestamp,
        status: liveData.status.status,
      });
    } catch (error) {
      logger.error('Failed to store live data', {
        error,
        printerId: liveData.printerId,
      });
      throw error;
    }
  }

  /**
   * Get current live data for a printer
   */
  async getCurrentLiveData(printerId: string): Promise<H2DLiveData | null> {
    try {
      const printerData = this.dataStore[printerId];
      if (!printerData) {
        logger.warn('No data found for printer', { printerId });
        return null;
      }

      logDatabaseOperation('read', 'live_data', printerId, {
        current: !!printerData.current,
        lastUpdated: printerData.lastUpdated,
      });

      return printerData.current;
    } catch (error) {
      logger.error('Failed to get current live data', { error, printerId });
      throw error;
    }
  }

  /**
   * Get live data history for a printer
   */
  async getLiveDataHistory(
    printerId: string,
    limit: number = 100,
    startTime?: string,
    endTime?: string
  ): Promise<H2DLiveData[]> {
    try {
      const printerData = this.dataStore[printerId];
      if (!printerData) {
        logger.warn('No data found for printer', { printerId });
        return [];
      }

      let history = [...printerData.history];

      // Filter by time range if provided
      if (startTime || endTime) {
        history = history.filter(data => {
          const dataTime = new Date(data.timestamp);
          if (startTime && dataTime < new Date(startTime)) return false;
          if (endTime && dataTime > new Date(endTime)) return false;
          return true;
        });
      }

      // Sort by timestamp (newest first) and limit
      history = history
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        .slice(0, limit);

      logDatabaseOperation('read', 'live_data_history', printerId, {
        limit,
        startTime,
        endTime,
        returnedCount: history.length,
      });

      return history;
    } catch (error) {
      logger.error('Failed to get live data history', { error, printerId });
      throw error;
    }
  }

  /**
   * Get all printers with current data
   */
  async getAllPrintersData(): Promise<
    { printerId: string; data: H2DLiveData | null; lastUpdated: string }[]
  > {
    try {
      const results = Object.entries(this.dataStore).map(
        ([printerId, printerData]) => ({
          printerId,
          data: printerData.current,
          lastUpdated: printerData.lastUpdated,
        })
      );

      logDatabaseOperation('read', 'all_printers_data', undefined, {
        printerCount: results.length,
      });

      return results;
    } catch (error) {
      logger.error('Failed to get all printers data', { error });
      throw error;
    }
  }

  /**
   * Get printer statistics
   */
  async getPrinterStatistics(printerId: string): Promise<{
    totalDataPoints: number;
    firstDataPoint: string | null;
    lastDataPoint: string | null;
    averageTemperature: number;
    averageHumidity: number;
    printTime: number;
  }> {
    try {
      const printerData = this.dataStore[printerId];
      if (!printerData || printerData.history.length === 0) {
        return {
          totalDataPoints: 0,
          firstDataPoint: null,
          lastDataPoint: null,
          averageTemperature: 0,
          averageHumidity: 0,
          printTime: 0,
        };
      }

      const history = printerData.history;
      const totalDataPoints = history.length;
      const firstDataPoint = history[0]?.timestamp || null;
      const lastDataPoint = history[history.length - 1]?.timestamp || null;

      // Calculate averages
      const temperatures = history.map(
        data => (data.temperatures.nozzle1 + data.temperatures.nozzle2) / 2
      );
      const humidities = history.map(data => data.humidity.average);

      const averageTemperature =
        temperatures.reduce((sum, temp) => sum + temp, 0) / temperatures.length;
      const averageHumidity =
        humidities.reduce((sum, hum) => sum + hum, 0) / humidities.length;

      // Calculate total print time
      const printTime = history.reduce((total, data) => {
        if (data.status.status === 'printing') {
          return total + (data.progress.remainingTime || 0);
        }
        return total;
      }, 0);

      logDatabaseOperation('read', 'printer_statistics', printerId, {
        totalDataPoints,
        averageTemperature: Math.round(averageTemperature),
        averageHumidity: Math.round(averageHumidity),
      });

      return {
        totalDataPoints,
        firstDataPoint,
        lastDataPoint,
        averageTemperature: Math.round(averageTemperature),
        averageHumidity: Math.round(averageHumidity),
        printTime,
      };
    } catch (error) {
      logger.error('Failed to get printer statistics', { error, printerId });
      throw error;
    }
  }

  /**
   * Clean up old data
   */
  async cleanupOldData(maxAgeHours: number = 24): Promise<void> {
    try {
      const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
      let cleanedCount = 0;

      Object.keys(this.dataStore).forEach(printerId => {
        const printerData = this.dataStore[printerId];
        if (!printerData) return;

        const originalLength = printerData.history.length;

        printerData.history = printerData.history.filter(
          data => new Date(data.timestamp) > cutoffTime
        );

        cleanedCount += originalLength - printerData.history.length;
      });

      logger.info('Cleaned up old live data', {
        maxAgeHours,
        cleanedDataPoints: cleanedCount,
      });

      logDatabaseOperation('delete', 'old_live_data', undefined, {
        maxAgeHours,
        cleanedCount,
      });
    } catch (error) {
      logger.error('Failed to cleanup old data', { error });
      throw error;
    }
  }

  /**
   * Get data store status
   */
  getDataStoreStatus(): {
    totalPrinters: number;
    totalDataPoints: number;
    memoryUsage: string;
  } {
    const totalPrinters = Object.keys(this.dataStore).length;
    const totalDataPoints = Object.values(this.dataStore).reduce(
      (sum, printerData) => sum + printerData.history.length,
      0
    );

    // Estimate memory usage (rough calculation)
    const estimatedMemoryUsage = totalDataPoints * 0.5; // ~0.5KB per data point
    const memoryUsage =
      estimatedMemoryUsage > 1024
        ? `${(estimatedMemoryUsage / 1024).toFixed(2)} MB`
        : `${estimatedMemoryUsage.toFixed(2)} KB`;

    return {
      totalPrinters,
      totalDataPoints,
      memoryUsage,
    };
  }

  /**
   * Clear all data for a printer
   */
  async clearPrinterData(printerId: string): Promise<void> {
    try {
      if (this.dataStore[printerId]) {
        delete this.dataStore[printerId];
        logger.info('Cleared all data for printer', { printerId });

        logDatabaseOperation('delete', 'printer_data', printerId, {
          action: 'clear_all_data',
        });
      }
    } catch (error) {
      logger.error('Failed to clear printer data', { error, printerId });
      throw error;
    }
  }

  /**
   * Clear all data
   */
  async clearAllData(): Promise<void> {
    try {
      const printerCount = Object.keys(this.dataStore).length;
      this.dataStore = {};

      logger.info('Cleared all live data', { printerCount });

      logDatabaseOperation('delete', 'all_live_data', undefined, {
        printerCount,
      });
    } catch (error) {
      logger.error('Failed to clear all data', { error });
      throw error;
    }
  }
}

// Export singleton instance
export const liveDataService = new LiveDataService();
