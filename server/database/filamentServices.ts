/**
 * Filament Database Services
 *
 * Handles all database operations for:
 * - Manufacturers catalog
 * - Filament products catalog
 * - User filament inventory
 * - Filament usage tracking
 */

import { eq, and, desc, sql, like, or } from 'drizzle-orm';
import { db } from './index.js';
import {
  manufacturers,
  filamentProducts,
  filaments,
  filamentUsage,
  type Manufacturer,
  type NewManufacturer,
  type FilamentProduct,
  type NewFilamentProduct,
  type Filament,
  type NewFilament,
  type FilamentUsage,
  type NewFilamentUsage,
} from './schema.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('filament-db-service');

// Manufacturer Database Operations
export class ManufacturerDB {
  static async findAll(): Promise<Manufacturer[]> {
    try {
      const result = await db.select().from(manufacturers).orderBy(manufacturers.name);
      return result;
    } catch (error) {
      logger.error('Failed to find all manufacturers', { error });
      throw error;
    }
  }

  static async findById(id: string): Promise<Manufacturer | null> {
    try {
      const result = await db.select().from(manufacturers).where(eq(manufacturers.id, id)).limit(1);
      return result[0] || null;
    } catch (error) {
      logger.error('Failed to find manufacturer by ID', { error, id });
      throw error;
    }
  }

  static async findByName(name: string): Promise<Manufacturer | null> {
    try {
      const result = await db
        .select()
        .from(manufacturers)
        .where(eq(manufacturers.name, name))
        .limit(1);
      return result[0] || null;
    } catch (error) {
      logger.error('Failed to find manufacturer by name', { error, name });
      throw error;
    }
  }

  static async create(manufacturer: NewManufacturer): Promise<Manufacturer> {
    try {
      const result = await db.insert(manufacturers).values(manufacturer).returning();
      if (!result[0]) {
        throw new Error('Failed to create manufacturer - no result returned');
      }
      return result[0];
    } catch (error) {
      logger.error('Failed to create manufacturer', { error });
      throw error;
    }
  }
}

// Filament Product Catalog Database Operations
export class FilamentProductDB {
  static async findAll(filters?: {
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
      const conditions = [];
      if (filters?.manufacturerId) {
        conditions.push(eq(filamentProducts.manufacturerId, filters.manufacturerId));
      }
      if (filters?.material) {
        conditions.push(eq(filamentProducts.material, filters.material as any));
      }
      if (filters?.color) {
        conditions.push(eq(filamentProducts.color, filters.color));
      }
      if (filters?.supplier) {
        conditions.push(eq(filamentProducts.supplier, filters.supplier));
      }
      if (filters?.available !== undefined) {
        conditions.push(eq(filamentProducts.available, filters.available));
      }
      if (filters?.minPrice !== undefined) {
        conditions.push(sql`${filamentProducts.nzdPrice} >= ${filters.minPrice}`);
      }
      if (filters?.maxPrice !== undefined) {
        conditions.push(sql`${filamentProducts.nzdPrice} <= ${filters.maxPrice}`);
      }
      if (filters?.search) {
        conditions.push(
          or(
            like(filamentProducts.name, `%${filters.search}%`),
            like(filamentProducts.color, `%${filters.search}%`),
            like(filamentProducts.sku, `%${filters.search}%`)
          )!
        );
      }

      let query = db.select().from(filamentProducts);
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const results = await query.orderBy(desc(filamentProducts.createdAt));
      return results;
    } catch (error) {
      logger.error('Failed to find filament products', { error, filters });
      throw error;
    }
  }

  static async findById(id: string): Promise<FilamentProduct | null> {
    try {
      const result = await db
        .select()
        .from(filamentProducts)
        .where(eq(filamentProducts.id, id))
        .limit(1);
      return result[0] || null;
    } catch (error) {
      logger.error('Failed to find filament product by ID', { error, id });
      throw error;
    }
  }

  static async findByMaterial(material: string): Promise<FilamentProduct[]> {
    try {
      return await db
        .select()
        .from(filamentProducts)
        .where(eq(filamentProducts.material, material as any))
        .orderBy(filamentProducts.name);
    } catch (error) {
      logger.error('Failed to find filament products by material', { error, material });
      throw error;
    }
  }

  static async create(product: NewFilamentProduct): Promise<FilamentProduct> {
    try {
      const result = await db.insert(filamentProducts).values(product).returning();
      if (!result[0]) {
        throw new Error('Failed to create filament product - no result returned');
      }
      return result[0];
    } catch (error) {
      logger.error('Failed to create filament product', { error });
      throw error;
    }
  }
}

// User Filament Inventory Database Operations
export class FilamentDB {
  static async findByUserId(userId: string, filters?: {
    status?: 'active' | 'low' | 'empty' | 'stored';
    printerId?: string;
    material?: string;
  }): Promise<Filament[]> {
    try {
      const conditions = [eq(filaments.userId, userId)];

      if (filters?.status) {
        conditions.push(eq(filaments.status, filters.status));
      }
      if (filters?.printerId) {
        conditions.push(eq(filaments.printerId, filters.printerId));
      }
      if (filters?.material) {
        conditions.push(eq(filaments.material, filters.material as any));
      }

      return await db
        .select()
        .from(filaments)
        .where(and(...conditions))
        .orderBy(desc(filaments.createdAt));
    } catch (error) {
      logger.error('Failed to find filaments by user ID', { error, userId });
      throw error;
    }
  }

  static async findById(id: string): Promise<Filament | null> {
    try {
      const result = await db.select().from(filaments).where(eq(filaments.id, id)).limit(1);
      return result[0] || null;
    } catch (error) {
      logger.error('Failed to find filament by ID', { error, id });
      throw error;
    }
  }

  static async findByRfidUid(rfidUid: string): Promise<Filament | null> {
    try {
      const result = await db
        .select()
        .from(filaments)
        .where(eq(filaments.rfidUid, rfidUid))
        .limit(1);
      return result[0] || null;
    } catch (error) {
      logger.error('Failed to find filament by RFID UID', { error, rfidUid });
      throw error;
    }
  }

  /**
   * Find filament by AMS slot and printer (for internal use)
   * For user-scoped queries, use FilamentService.getFilamentByAmsSlot() instead
   */
  static async findByAmsSlot(printerId: string, slot: number): Promise<Filament | null> {
    try {
      const result = await db
        .select()
        .from(filaments)
        .where(and(eq(filaments.printerId, printerId), eq(filaments.amsSlot, slot)))
        .limit(1);
      return result[0] || null;
    } catch (error) {
      logger.error('Failed to find filament by AMS slot', { error, printerId, slot });
      throw error;
    }
  }

  /**
   * Find filament by AMS slot with user scope (enterprise-grade security)
   */
  static async findByAmsSlotAndUser(
    printerId: string,
    slot: number,
    userId: string
  ): Promise<Filament | null> {
    try {
      const result = await db
        .select()
        .from(filaments)
        .where(
          and(
            eq(filaments.printerId, printerId),
            eq(filaments.amsSlot, slot),
            eq(filaments.userId, userId)
          )
        )
        .limit(1);
      return result[0] || null;
    } catch (error) {
      logger.error('Failed to find filament by AMS slot and user', { error, printerId, slot, userId });
      throw error;
    }
  }

  /**
   * Find all filaments in AMS slots for a printer (user-scoped)
   */
  static async findByPrinterAndUser(
    printerId: string,
    userId: string
  ): Promise<Filament[]> {
    try {
      return await db
        .select()
        .from(filaments)
        .where(
          and(
            eq(filaments.printerId, printerId),
            eq(filaments.userId, userId),
            sql`${filaments.amsSlot} IS NOT NULL`
          )
        )
        .orderBy(filaments.amsSlot);
    } catch (error) {
      logger.error('Failed to find filaments by printer and user', { error, printerId, userId });
      throw error;
    }
  }

  static async create(filament: NewFilament): Promise<Filament> {
    try {
      const result = await db.insert(filaments).values(filament).returning();
      if (!result[0]) {
        throw new Error('Failed to create filament - no result returned');
      }
      logger.info('Filament created', { filamentId: result[0].id, userId: filament.userId });
      return result[0];
    } catch (error) {
      logger.error('Failed to create filament', { error });
      throw error;
    }
  }

  static async update(id: string, updates: Partial<Filament>): Promise<Filament> {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      const result = await db
        .update(filaments)
        .set(updateData)
        .where(eq(filaments.id, id))
        .returning();

      if (!result[0]) {
        throw new Error(`Filament with ID ${id} not found`);
      }

      logger.info('Filament updated', { filamentId: id });
      return result[0];
    } catch (error) {
      logger.error('Failed to update filament', { error, id });
      throw error;
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      await db.delete(filaments).where(eq(filaments.id, id));
      logger.info('Filament deleted', { filamentId: id });
    } catch (error) {
      logger.error('Failed to delete filament', { error, id });
      throw error;
    }
  }

  static async updateRemainingWeight(id: string, weightUsed: number): Promise<Filament> {
    try {
      const filament = await this.findById(id);
      if (!filament) {
        throw new Error(`Filament with ID ${id} not found`);
      }

      const newRemainingWeight = Math.max(0, filament.remainingWeight - weightUsed);
      let newStatus = filament.status;

      // Update status based on remaining weight
      if (newRemainingWeight === 0) {
        newStatus = 'empty';
      } else if (newRemainingWeight < filament.lowThreshold) {
        newStatus = 'low';
      }

      return await this.update(id, {
        remainingWeight: newRemainingWeight,
        status: newStatus as any,
      });
    } catch (error) {
      logger.error('Failed to update filament remaining weight', { error, id, weightUsed });
      throw error;
    }
  }

  static async getLowFilaments(userId: string): Promise<Filament[]> {
    try {
      return await db
        .select()
        .from(filaments)
        .where(
          and(
            eq(filaments.userId, userId),
            sql`${filaments.remainingWeight} <= ${filaments.lowThreshold}`,
            sql`${filaments.status} != 'empty'`
          )
        )
        .orderBy(desc(filaments.remainingWeight));
    } catch (error) {
      logger.error('Failed to get low filaments', { error, userId });
      throw error;
    }
  }
}

// Filament Usage Tracking Database Operations
export class FilamentUsageDB {
  static async create(usage: NewFilamentUsage): Promise<FilamentUsage> {
    try {
      const result = await db.insert(filamentUsage).values(usage).returning();
      if (!result[0]) {
        throw new Error('Failed to create filament usage record - no result returned');
      }
      return result[0];
    } catch (error) {
      logger.error('Failed to create filament usage record', { error });
      throw error;
    }
  }

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

  static async getTotalUsage(filamentId: string): Promise<number> {
    try {
      const result = await db
        .select({ total: sql<number>`SUM(${filamentUsage.weightUsed})` })
        .from(filamentUsage)
        .where(eq(filamentUsage.filamentId, filamentId));

      return result[0]?.total || 0;
    } catch (error) {
      logger.error('Failed to get total filament usage', { error, filamentId });
      throw error;
    }
  }
}

