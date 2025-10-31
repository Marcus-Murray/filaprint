/**
 * Filament Management Service
 *
 * Handles business logic for:
 * - Filament inventory management
 * - AMS integration
 * - RFID detection and matching
 * - Usage tracking
 * - Optimal humidity calculation by material
 */

import {
  ManufacturerDB,
  FilamentProductDB,
  FilamentDB,
  FilamentUsageDB,
} from '../database/filamentServices.js';
import { createLogger } from '../utils/logger.js';
import { CustomError } from '../middleware/errorHandler.js';
import type {
  Filament,
  FilamentProduct,
  Manufacturer,
} from '../database/schema.js';

const logger = createLogger('filament-service');

export interface CreateFilamentData {
  userId: string;
  productId?: string;
  manufacturerId?: string;
  // RFID data (from AMS)
  rfidUid?: string;
  rfidTagType?: string;
  rfidTrayIdName?: string;
  rfidTrayInfoCols?: string;
  rfidTrayInfoName?: string;
  // Manual entry (if no RFID)
  name: string;
  brand?: string;
  material: string;
  color: string;
  diameter?: number;
  weight: number;
  remainingWeight?: number;
  nozzleTemperature?: number;
  bedTemperature?: number;
  optimalHumidity?: number;
  // AMS integration
  amsSlot?: number;
  printerId?: string;
  status?: 'active' | 'low' | 'empty' | 'stored';
  lowThreshold?: number;
  purchaseDate?: string;
  purchasePrice?: number;
  purchaseCurrency?: string;
  supplier?: string;
  notes?: string;
}

export interface UpdateFilamentData {
  name?: string;
  brand?: string;
  material?: string;
  color?: string;
  diameter?: number;
  weight?: number;
  remainingWeight?: number;
  nozzleTemperature?: number;
  bedTemperature?: number;
  optimalHumidity?: number;
  amsSlot?: number;
  printerId?: string;
  status?: 'active' | 'low' | 'empty' | 'stored';
  lowThreshold?: number;
  purchaseDate?: string;
  purchasePrice?: number;
  purchaseCurrency?: string;
  supplier?: string;
  notes?: string;
}

export interface MaterialProperties {
  optimalHumidityMin: number;
  optimalHumidityMax: number;
  optimalHumidityRecommended: number;
  nozzleTemperatureRecommended: number;
  bedTemperatureRecommended: number;
}

/**
 * Calculate optimal humidity for a material type
 */
export function getMaterialOptimalHumidity(material: string): MaterialProperties {
  const humidityRanges: Record<
    string,
    { min: number; max: number; recommended: number }
  > = {
    PLA: { min: 30, max: 50, recommended: 40 },
    'PLA+': { min: 30, max: 50, recommended: 40 },
    'PLA Pro': { min: 30, max: 50, recommended: 40 },
    PETG: { min: 20, max: 40, recommended: 30 },
    PET: { min: 20, max: 40, recommended: 30 },
    ABS: { min: 10, max: 30, recommended: 20 },
    ASA: { min: 10, max: 30, recommended: 20 },
    TPU: { min: 10, max: 30, recommended: 20 },
    TPU85: { min: 10, max: 30, recommended: 20 },
    TPU95: { min: 10, max: 30, recommended: 20 },
    PC: { min: 5, max: 15, recommended: 10 },
    NYLON: { min: 5, max: 15, recommended: 10 },
    PA: { min: 5, max: 15, recommended: 10 },
    PAHT: { min: 5, max: 15, recommended: 10 },
    WOOD: { min: 30, max: 50, recommended: 40 },
    METAL: { min: 30, max: 50, recommended: 40 },
    CF: { min: 10, max: 30, recommended: 20 }, // Carbon Fiber
    GF: { min: 10, max: 30, recommended: 20 }, // Glass Fiber
  };

  const temps: Record<
    string,
    { nozzle: number; bed: number }
  > = {
    PLA: { nozzle: 210, bed: 60 },
    'PLA+': { nozzle: 215, bed: 60 },
    'PLA Pro': { nozzle: 220, bed: 60 },
    PETG: { nozzle: 240, bed: 80 },
    PET: { nozzle: 240, bed: 80 },
    ABS: { nozzle: 250, bed: 100 },
    ASA: { nozzle: 260, bed: 100 },
    TPU: { nozzle: 230, bed: 60 },
    TPU85: { nozzle: 230, bed: 60 },
    TPU95: { nozzle: 240, bed: 60 },
    PC: { nozzle: 290, bed: 110 },
    NYLON: { nozzle: 260, bed: 85 },
    PA: { nozzle: 260, bed: 85 },
    PAHT: { nozzle: 270, bed: 100 },
    WOOD: { nozzle: 210, bed: 60 },
    METAL: { nozzle: 220, bed: 60 },
    CF: { nozzle: 260, bed: 100 },
    GF: { nozzle: 250, bed: 85 },
  };

  const humidity = humidityRanges[material] || { min: 30, max: 50, recommended: 40 };
  const temperature = temps[material] || { nozzle: 210, bed: 60 };

  return {
    optimalHumidityMin: humidity.min,
    optimalHumidityMax: humidity.max,
    optimalHumidityRecommended: humidity.recommended,
    nozzleTemperatureRecommended: temperature.nozzle,
    bedTemperatureRecommended: temperature.bed,
  };
}

/**
 * Match RFID data to product catalog or create new filament entry
 */
export async function matchRfidToFilament(
  rfidData: {
    uid: string;
    tagType?: string;
    trayIdName?: string;
    trayInfoCols?: string;
    trayInfoName?: string;
  },
  userId: string
): Promise<Filament | null> {
  try {
    // First, check if we already have a filament with this RFID UID
    const existingFilament = await FilamentDB.findByRfidUid(rfidData.uid);
    if (existingFilament && existingFilament.userId === userId) {
      return existingFilament;
    }

    // Try to match by material name from RFID
    if (rfidData.trayInfoName) {
      // Search products by material name
      const products = await FilamentProductDB.findAll({
        search: rfidData.trayInfoName,
      });

      if (products.length > 0) {
        // Found matching product, create filament entry
        const product = products[0];
        const materialProps = getMaterialOptimalHumidity(product.material);

        const filament = await FilamentDB.create({
          id: `filament_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          userId,
          productId: product.id,
          manufacturerId: product.manufacturerId,
          rfidUid: rfidData.uid,
          rfidTagType: rfidData.tagType,
          rfidTrayIdName: rfidData.trayIdName,
          rfidTrayInfoCols: rfidData.trayInfoCols,
          rfidTrayInfoName: rfidData.trayInfoName,
          name: product.name,
          brand: undefined, // Will be populated from product
          material: product.material as any,
          color: rfidData.trayInfoCols || product.color,
          diameter: product.diameter,
          weight: product.weight,
          remainingWeight: product.weight, // Assume full spool
          nozzleTemperature: product.nozzleTemperatureRecommended || materialProps.nozzleTemperatureRecommended,
          bedTemperature: product.bedTemperatureRecommended || materialProps.bedTemperatureRecommended,
          optimalHumidity: product.optimalHumidityRecommended || materialProps.optimalHumidityRecommended,
          status: 'stored',
          lowThreshold: 100,
          purchaseCurrency: 'NZD',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        return filament;
      }
    }

    // No match found - return null so user can manually create
    return null;
  } catch (error) {
    logger.error('Failed to match RFID to filament', { error, rfidData });
    throw error;
  }
}

export class FilamentService {
  /**
   * Get all filaments for a user
   */
  async getUserFilaments(
    userId: string,
    filters?: {
      status?: 'active' | 'low' | 'empty' | 'stored';
      printerId?: string;
      material?: string;
    }
  ): Promise<Filament[]> {
    try {
      return await FilamentDB.findByUserId(userId, filters);
    } catch (error) {
      logger.error('Failed to get user filaments', { error, userId });
      throw new CustomError('Failed to retrieve filaments', 500);
    }
  }

  /**
   * Get a single filament by ID
   */
  async getFilamentById(filamentId: string, userId: string): Promise<Filament> {
    try {
      const filament = await FilamentDB.findById(filamentId);
      if (!filament) {
        throw new CustomError('Filament not found', 404);
      }
      if (filament.userId !== userId) {
        throw new CustomError('Access denied', 403);
      }
      return filament;
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      logger.error('Failed to get filament by ID', { error, filamentId });
      throw new CustomError('Failed to retrieve filament', 500);
    }
  }

  /**
   * Create a new filament
   * Includes AMS slot conflict validation
   */
  async createFilament(data: CreateFilamentData): Promise<Filament> {
    try {
      // Validate AMS slot assignment if slot is provided
      if (data.amsSlot !== undefined && data.printerId !== undefined) {
        // For new filaments, use empty string as ID (will check for any existing filament in slot)
        const validation = await this.validateAmsSlotAssignment(
          '', // New filament - no ID yet
          data.printerId,
          data.amsSlot,
          data.userId
        );

        if (!validation.valid && validation.conflict) {
          throw new CustomError(
            `AMS slot ${data.amsSlot} is already assigned to "${validation.conflict.name}" (${validation.conflict.material} ${validation.conflict.color})`,
            409, // Conflict status code
            'AMS_SLOT_CONFLICT'
          );
        }
      }
      // If productId is provided, fetch product for defaults
      let product: FilamentProduct | null = null;
      if (data.productId) {
        product = await FilamentProductDB.findById(data.productId);
        if (product) {
          // Use product data as defaults if not provided
          data.material = data.material || product.material;
          data.color = data.color || product.color;
          data.diameter = data.diameter || product.diameter;
          data.weight = data.weight || product.weight;
          data.remainingWeight = data.remainingWeight ?? data.weight ?? product.weight;

          if (!data.nozzleTemperature) {
            data.nozzleTemperature = product.nozzleTemperatureRecommended;
          }
          if (!data.bedTemperature) {
            data.bedTemperature = product.bedTemperatureRecommended;
          }
          if (!data.optimalHumidity) {
            data.optimalHumidity = product.optimalHumidityRecommended;
          }

          if (!data.brand && product.manufacturerId) {
            const manufacturer = await ManufacturerDB.findById(product.manufacturerId);
            if (manufacturer) {
              data.brand = manufacturer.name;
            }
          }
        }
      }

      // If material provided but no optimal humidity, calculate it
      if (data.material && !data.optimalHumidity) {
        const materialProps = getMaterialOptimalHumidity(data.material);
        data.optimalHumidity = materialProps.optimalHumidityRecommended;

        if (!data.nozzleTemperature) {
          data.nozzleTemperature = materialProps.nozzleTemperatureRecommended;
        }
        if (!data.bedTemperature) {
          data.bedTemperature = materialProps.bedTemperatureRecommended;
        }
      }

      const filament = await FilamentDB.create({
        id: `filament_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        userId: data.userId,
        productId: data.productId,
        manufacturerId: data.manufacturerId || product?.manufacturerId,
        rfidUid: data.rfidUid,
        rfidTagType: data.rfidTagType,
        rfidTrayIdName: data.rfidTrayIdName,
        rfidTrayInfoCols: data.rfidTrayInfoCols,
        rfidTrayInfoName: data.rfidTrayInfoName,
        name: data.name,
        brand: data.brand,
        material: data.material as any,
        color: data.color,
        diameter: data.diameter || 1.75,
        weight: data.weight,
        remainingWeight: data.remainingWeight ?? data.weight,
        nozzleTemperature: data.nozzleTemperature,
        bedTemperature: data.bedTemperature,
        optimalHumidity: data.optimalHumidity,
        amsSlot: data.amsSlot,
        printerId: data.printerId,
        status: data.status || 'stored',
        lowThreshold: data.lowThreshold || 100,
        purchaseDate: data.purchaseDate,
        purchasePrice: data.purchasePrice,
        purchaseCurrency: data.purchaseCurrency || 'NZD',
        supplier: data.supplier,
        notes: data.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      logger.info('Filament created', { filamentId: filament.id, userId: data.userId });
      return filament;
    } catch (error) {
      logger.error('Failed to create filament', { error, data });
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError('Failed to create filament', 500);
    }
  }

  /**
   * Update a filament
   */
  async updateFilament(
    filamentId: string,
    userId: string,
    data: UpdateFilamentData
  ): Promise<Filament> {
    try {
      // Verify ownership
      const filament = await FilamentDB.findById(filamentId);
      if (!filament) {
        throw new CustomError('Filament not found', 404);
      }
      if (filament.userId !== userId) {
        throw new CustomError('Access denied', 403);
      }

      // Validate AMS slot assignment if slot is being set/changed
      if (data.amsSlot !== undefined) {
        const printerIdToUse = data.printerId || filament.printerId;
        if (printerIdToUse) {
          const validation = await this.validateAmsSlotAssignment(
            filamentId,
            printerIdToUse,
            data.amsSlot,
            userId
          );

          if (!validation.valid && validation.conflict) {
            throw new CustomError(
              `AMS slot ${data.amsSlot} is already assigned to "${validation.conflict.name}" (${validation.conflict.material} ${validation.conflict.color})`,
              409, // Conflict status code
              'AMS_SLOT_CONFLICT'
            );
          }
        }
      }

      // If material changed, recalculate optimal humidity
      if (data.material && data.material !== filament.material) {
        const materialProps = getMaterialOptimalHumidity(data.material);
        data.optimalHumidity = materialProps.optimalHumidityRecommended;

        if (!data.nozzleTemperature) {
          data.nozzleTemperature = materialProps.nozzleTemperatureRecommended;
        }
        if (!data.bedTemperature) {
          data.bedTemperature = materialProps.bedTemperatureRecommended;
        }
      }

      return await FilamentDB.update(filamentId, data as any);
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      logger.error('Failed to update filament', { error, filamentId });
      throw new CustomError('Failed to update filament', 500);
    }
  }

  /**
   * Delete a filament
   */
  async deleteFilament(filamentId: string, userId: string): Promise<void> {
    try {
      // Verify ownership
      const filament = await FilamentDB.findById(filamentId);
      if (!filament) {
        throw new CustomError('Filament not found', 404);
      }
      if (filament.userId !== userId) {
        throw new CustomError('Access denied', 403);
      }

      await FilamentDB.delete(filamentId);
      logger.info('Filament deleted', { filamentId, userId });
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      logger.error('Failed to delete filament', { error, filamentId });
      throw new CustomError('Failed to delete filament', 500);
    }
  }

  /**
   * Record filament usage
   */
  async recordUsage(
    filamentId: string,
    userId: string,
    weightUsed: number,
    printJobId?: string
  ): Promise<void> {
    try {
      // Verify ownership
      const filament = await FilamentDB.findById(filamentId);
      if (!filament) {
        throw new CustomError('Filament not found', 404);
      }
      if (filament.userId !== userId) {
        throw new CustomError('Access denied', 403);
      }

      // Record usage
      await FilamentUsageDB.create({
        id: `usage_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        filamentId,
        printJobId,
        weightUsed,
        usageDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });

      // Update remaining weight
      await FilamentDB.updateRemainingWeight(filamentId, weightUsed);

      logger.info('Filament usage recorded', { filamentId, weightUsed });
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      logger.error('Failed to record filament usage', { error, filamentId });
      throw new CustomError('Failed to record usage', 500);
    }
  }

  /**
   * Get low filament alerts for a user
   */
  async getLowFilamentAlerts(userId: string): Promise<Filament[]> {
    try {
      return await FilamentDB.getLowFilaments(userId);
    } catch (error) {
      logger.error('Failed to get low filament alerts', { error, userId });
      throw new CustomError('Failed to retrieve low filament alerts', 500);
    }
  }

  /**
   * Get all manufacturers
   */
  async getManufacturers(): Promise<Manufacturer[]> {
    try {
      return await ManufacturerDB.findAll();
    } catch (error) {
      logger.error('Failed to get manufacturers', { error });
      throw new CustomError('Failed to retrieve manufacturers', 500);
    }
  }

  /**
   * Get filament products catalog
   */
  async getFilamentProducts(filters?: {
    manufacturerId?: string;
    material?: string;
    color?: string;
    supplier?: string;
    available?: boolean;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
  }): Promise<FilamentProduct[]> {
    try {
      return await FilamentProductDB.findAll(filters);
    } catch (error) {
      logger.error('Failed to get filament products', { error, filters });
      throw new CustomError('Failed to retrieve filament products', 500);
    }
  }

  /**
   * Get filament by AMS slot (user-scoped, enterprise-grade security)
   * Returns null if no filament found or filament belongs to different user
   */
  async getFilamentByAmsSlot(
    printerId: string,
    slot: number,
    userId: string
  ): Promise<Filament | null> {
    try {
      // Validate slot number
      if (slot < 1 || slot > 4) {
        logger.warn('Invalid AMS slot number', { slot, printerId, userId });
        return null;
      }

      // Use user-scoped query for security
      const filament = await FilamentDB.findByAmsSlotAndUser(printerId, slot, userId);

      if (!filament) {
        logger.debug('No filament found in AMS slot', { printerId, slot, userId });
        return null;
      }

      logger.debug('Found filament in AMS slot', {
        filamentId: filament.id,
        printerId,
        slot,
        material: filament.material,
        color: filament.color,
      });

      return filament;
    } catch (error) {
      logger.error('Failed to get filament by AMS slot', { error, printerId, slot, userId });
      throw new CustomError('Failed to retrieve filament from AMS slot', 500);
    }
  }

  /**
   * Get all filaments assigned to AMS slots for a printer (user-scoped)
   * Returns map of slot number to filament
   */
  async getFilamentsByPrinter(
    printerId: string,
    userId: string
  ): Promise<Map<number, Filament>> {
    try {
      const filaments = await FilamentDB.findByPrinterAndUser(printerId, userId);
      const slotMap = new Map<number, Filament>();

      filaments.forEach(filament => {
        if (filament.amsSlot) {
          slotMap.set(filament.amsSlot, filament);
        }
      });

      return slotMap;
    } catch (error) {
      logger.error('Failed to get filaments by printer', { error, printerId, userId });
      throw new CustomError('Failed to retrieve filaments for printer', 500);
    }
  }

  /**
   * Validate AMS slot assignment (check for conflicts)
   * Returns true if slot is available or assigned to this filament
   */
  async validateAmsSlotAssignment(
    filamentId: string,
    printerId: string,
    slot: number,
    userId: string
  ): Promise<{ valid: boolean; conflict?: Filament }> {
    try {
      // Validate slot number
      if (slot < 1 || slot > 4) {
        return { valid: false };
      }

      // Check if another filament is already in this slot
      const existingFilament = await FilamentDB.findByAmsSlotAndUser(printerId, slot, userId);

      if (!existingFilament) {
        // Slot is available
        return { valid: true };
      }

      // For new filaments (empty ID), any existing filament is a conflict
      if (!filamentId || filamentId.trim() === '') {
        return {
          valid: false,
          conflict: existingFilament,
        };
      }

      if (existingFilament.id === filamentId) {
        // Same filament - no conflict
        return { valid: true };
      }

      // Conflict - another filament is in this slot
      logger.warn('AMS slot conflict detected', {
        filamentId,
        printerId,
        slot,
        existingFilamentId: existingFilament.id,
      });

      return {
        valid: false,
        conflict: existingFilament,
      };
    } catch (error) {
      logger.error('Failed to validate AMS slot assignment', { error, filamentId, printerId, slot });
      throw new CustomError('Failed to validate AMS slot assignment', 500);
    }
  }
}

export const filamentService = new FilamentService();

