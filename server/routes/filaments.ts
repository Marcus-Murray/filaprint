/**
 * Filament Management API Routes
 *
 * Handles:
 * - User filament inventory CRUD
 * - Filament product catalog access
 * - Manufacturer listing
 * - AMS integration
 * - Usage tracking
 */

import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { filamentService } from '../services/filamentService.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createFilamentSchema = z.object({
  productId: z.string().optional(),
  manufacturerId: z.string().optional(),
  rfidUid: z.string().optional(),
  rfidTagType: z.string().optional(),
  rfidTrayIdName: z.string().optional(),
  rfidTrayInfoCols: z.string().optional(),
  rfidTrayInfoName: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  brand: z.string().optional(),
  material: z.enum(['PLA', 'PETG', 'ABS', 'TPU', 'ASA', 'PC', 'NYLON', 'WOOD', 'METAL', 'PET', 'PLA+', 'PLA Pro', 'TPU95', 'TPU85', 'PA', 'PAHT', 'CF', 'GF']),
  color: z.string().min(1, 'Color is required'),
  diameter: z.number().positive().optional(),
  weight: z.number().positive('Weight must be positive'),
  remainingWeight: z.number().min(0).optional(),
  nozzleTemperature: z.number().int().min(100).max(400).optional(),
  bedTemperature: z.number().int().min(20).max(150).optional(),
  optimalHumidity: z.number().min(0).max(100).optional(),
  amsSlot: z.number().int().min(1).max(4).optional(),
  printerId: z.string().optional(),
  status: z.enum(['active', 'low', 'empty', 'stored']).optional(),
  lowThreshold: z.number().positive().optional(),
  purchaseDate: z.string().optional(),
  purchasePrice: z.number().nonnegative().optional(),
  purchaseCurrency: z.string().optional(),
  supplier: z.string().optional(),
  notes: z.string().optional(),
});

const updateFilamentSchema = createFilamentSchema.partial().extend({
  name: z.string().min(1).optional(),
  material: z.enum(['PLA', 'PETG', 'ABS', 'TPU', 'ASA', 'PC', 'NYLON', 'WOOD', 'METAL', 'PET', 'PLA+', 'PLA Pro', 'TPU95', 'TPU85', 'PA', 'PAHT', 'CF', 'GF']).optional(),
  color: z.string().min(1).optional(),
});

const recordUsageSchema = z.object({
  weightUsed: z.number().positive('Weight used must be positive'),
  printJobId: z.string().optional(),
});

// Get all user filaments
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const status = req.query['status'] as string | undefined;
    const printerId = req.query['printerId'] as string | undefined;
    const material = req.query['material'] as string | undefined;

    const filaments = await filamentService.getUserFilaments(userId, {
      status: status as any,
      printerId,
      material,
    });

    res.json({
      success: true,
      data: filaments,
      count: filaments.length,
    });
  })
);

// Get low filament alerts
router.get(
  '/alerts',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const lowFilaments = await filamentService.getLowFilamentAlerts(userId);

    res.json({
      success: true,
      data: lowFilaments,
      count: lowFilaments.length,
    });
  })
);

// Get single filament by ID
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const filamentId = req.params['id'] as string;

    const filament = await filamentService.getFilamentById(filamentId, userId);

    res.json({
      success: true,
      data: filament,
    });
  })
);

// Get filament by AMS slot
router.get(
  '/ams/:printerId/:slot',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const printerId = req.params['printerId'] as string;
    const slot = parseInt(req.params['slot'] as string, 10);

    if (isNaN(slot) || slot < 1 || slot > 4) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid AMS slot (must be 1-4)' },
      });
    }

    const filament = await filamentService.getFilamentByAmsSlot(
      printerId,
      slot,
      userId
    );

    res.json({
      success: true,
      data: filament,
    });
  })
);

// Create new filament
router.post(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const validatedData = createFilamentSchema.parse(req.body);

    const filament = await filamentService.createFilament({
      ...validatedData,
      userId,
    });

    res.status(201).json({
      success: true,
      data: filament,
      message: 'Filament created successfully',
    });
  })
);

// Update filament
router.put(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const filamentId = req.params['id'] as string;
    const validatedData = updateFilamentSchema.parse(req.body);

    const filament = await filamentService.updateFilament(
      filamentId,
      userId,
      validatedData
    );

    res.json({
      success: true,
      data: filament,
      message: 'Filament updated successfully',
    });
  })
);

// Delete filament
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const filamentId = req.params['id'] as string;

    await filamentService.deleteFilament(filamentId, userId);

    res.json({
      success: true,
      message: 'Filament deleted successfully',
    });
  })
);

// Record filament usage
router.post(
  '/:id/usage',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const filamentId = req.params['id'] as string;
    const validatedData = recordUsageSchema.parse(req.body);

    await filamentService.recordUsage(
      filamentId,
      userId,
      validatedData.weightUsed,
      validatedData.printJobId
    );

    res.json({
      success: true,
      message: 'Usage recorded successfully',
    });
  })
);

// Get manufacturers catalog
router.get(
  '/catalog/manufacturers',
  (process.env.NODE_ENV === 'development' ? optionalAuth : authenticate),
  asyncHandler(async (req, res) => {
    const manufacturers = await filamentService.getManufacturers();

    res.json({
      success: true,
      data: manufacturers,
      count: manufacturers.length,
    });
  })
);

// Get all unique materials, colors, and suppliers for filters
router.get(
  '/catalog/filter-options',
  (process.env.NODE_ENV === 'development' ? optionalAuth : authenticate),
  asyncHandler(async (req, res) => {
    const { FilamentProductDB } = await import('../database/filamentServices.js');
    const { FILAMENT_SUPPLIERS, getSuppliersByCountry, getAllSupplierDomains } = await import('../database/supplierData.js');

    const allProducts = await FilamentProductDB.findAll();

    // Get country from query param, header, or default to NZ
    const country = (req.query['country'] as string) ||
                    (req.headers['x-user-country'] as string) ||
                    'NZ'; // Default to New Zealand

    const materials = Array.from(new Set(allProducts.map(p => p.material))).sort();
    const colors = Array.from(new Set(allProducts.map(p => p.color))).sort();

    // Get suppliers by country - show local suppliers first, then global ones
    const localSuppliers = getSuppliersByCountry(country);
    const allSupplierDomains = getAllSupplierDomains();
    const productsSuppliers = Array.from(new Set(allProducts.map(p => p.supplier).filter(Boolean))).sort();

    // Prioritize local suppliers, then add any other suppliers found in products
    const prioritizedSuppliers: string[] = [];

    // Add local suppliers first
    localSuppliers.forEach(supplier => {
      if (supplier.domain && !prioritizedSuppliers.includes(supplier.domain)) {
        prioritizedSuppliers.push(supplier.domain);
      }
    });

    // Add other suppliers from products (that aren't already added)
    productsSuppliers.forEach(supplier => {
      if (supplier && !prioritizedSuppliers.includes(supplier)) {
        prioritizedSuppliers.push(supplier);
      }
    });

    res.json({
      success: true,
      data: {
        materials,
        colors,
        suppliers: prioritizedSuppliers,
        country, // Return detected/default country
      },
    });
  })
);

// Get filament products catalog
router.get(
  '/catalog/products',
  (process.env.NODE_ENV === 'development' ? optionalAuth : authenticate),
  asyncHandler(async (req, res) => {
    const manufacturerId = req.query['manufacturerId'] as string | undefined;
    const material = req.query['material'] as string | undefined;
    const color = req.query['color'] as string | undefined;
    const supplier = req.query['supplier'] as string | undefined;
    const available = req.query['available'] === 'true' ? true : req.query['available'] === 'false' ? false : undefined;
    const search = req.query['search'] as string | undefined;
    const minPrice = req.query['minPrice'] ? parseFloat(req.query['minPrice'] as string) : undefined;
    const maxPrice = req.query['maxPrice'] ? parseFloat(req.query['maxPrice'] as string) : undefined;

    let products = await filamentService.getFilamentProducts({
      manufacturerId,
      material,
      color,
      supplier,
      available,
      search,
      minPrice: isNaN(minPrice!) ? undefined : minPrice,
      maxPrice: isNaN(maxPrice!) ? undefined : maxPrice,
    });

    // Fallback: if no products exist (e.g., fresh DB), seed and retry once
    if (!products || products.length === 0) {
      try {
        const { seedFilamentData } = await import('../database/seedFilamentData.js');
        await seedFilamentData();
        products = await filamentService.getFilamentProducts({
          manufacturerId,
          material,
          color,
          supplier,
          available,
          search,
          minPrice: isNaN(minPrice!) ? undefined : minPrice,
          maxPrice: isNaN(maxPrice!) ? undefined : maxPrice,
        });
      } catch (e) {
        // ignore seeding error; we'll just return empty list
      }
    }

    res.json({
      success: true,
      data: products,
      count: products.length,
    });
  })
);

export default router;
