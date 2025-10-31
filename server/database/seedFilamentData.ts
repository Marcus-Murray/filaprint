/**
 * Seed Filament Manufacturers and Products Database
 *
 * Populates the database with:
 * - Top 40+ filament manufacturers
 * - Product catalog with pricing in NZD
 * - Material-specific properties (optimal humidity, temperatures)
 * - AMS/RFID compatibility information
 */

import { db } from './index.js';
import { manufacturers, filamentProducts } from './schema.js';
import { createLogger } from '../utils/logger.js';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { FILAMENT_SUPPLIERS, findSupplierByDomain } from './supplierData.js';
import { getProductsForManufacturer, hasProductCatalog } from './manufacturerProducts.js';

// Get direct SQLite access for DELETE operations
const DATABASE_PATH = process.env['DATABASE_URL'] || './database.db';
const DATABASE_URL = DATABASE_PATH.replace('sqlite:', '');
const sqlite = new Database(DATABASE_URL);

const logger = createLogger('seed-filament-data');

// Material-specific optimal humidity ranges (percentage)
const MATERIAL_HUMIDITY: Record<string, { min: number; max: number; recommended: number }> = {
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

// Top 40+ Filament Manufacturers
const MANUFACTURERS_DATA = [
  // Major Global Manufacturers
  { name: 'Bambu Lab', country: 'China', website: 'https://bambulab.com', amsCompatible: true, rfidEnabled: true },
  { name: 'Polymaker', country: 'China/USA', website: 'https://polymaker.com', amsCompatible: true, rfidEnabled: false },
  { name: 'Prusament', country: 'Czech Republic', website: 'https://www.prusa3d.com', amsCompatible: true, rfidEnabled: false },
  { name: 'eSUN', country: 'China', website: 'https://www.esun3d.net', amsCompatible: true, rfidEnabled: false },
  { name: 'HATCHBOX', country: 'USA', website: 'https://www.hatchbox3d.com', amsCompatible: true, rfidEnabled: false },
  { name: 'Overture', country: 'China', website: 'https://overture3d.com', amsCompatible: true, rfidEnabled: false },
  { name: 'MatterHackers', country: 'USA', website: 'https://www.matterhackers.com', amsCompatible: true, rfidEnabled: false },
  { name: 'ColorFabb', country: 'Netherlands', website: 'https://colorfabb.com', amsCompatible: true, rfidEnabled: false },
  { name: 'Fillamentum', country: 'Czech Republic', website: 'https://fillamentum.com', amsCompatible: true, rfidEnabled: false },
  { name: 'Tianse', country: 'China', website: 'https://tianse.com', amsCompatible: true, rfidEnabled: false },
  { name: 'Sunlu', country: 'China', website: 'https://www.sunlu.com', amsCompatible: true, rfidEnabled: false },
  { name: 'Polymaker', country: 'China/USA', website: 'https://polymaker.com', amsCompatible: true, rfidEnabled: false },
  { name: 'Inland', country: 'USA', website: 'https://www.microcenter.com', amsCompatible: true, rfidEnabled: false },
  { name: 'Amazon Basics', country: 'USA', website: 'https://amazon.com', amsCompatible: true, rfidEnabled: false },
  { name: 'Tecbears', country: 'China', website: 'https://tecbears.com', amsCompatible: true, rfidEnabled: false },
  { name: 'ERYONE', country: 'China', website: 'https://eryone.com', amsCompatible: true, rfidEnabled: false },
  { name: 'Coex', country: 'USA', website: 'https://coexllc.com', amsCompatible: true, rfidEnabled: false },
  { name: 'SUNLU', country: 'China', website: 'https://www.sunlu.com', amsCompatible: true, rfidEnabled: false },
  { name: 'ZYLtech', country: 'USA', website: 'https://zyltech.com', amsCompatible: true, rfidEnabled: false },
  { name: '3DEA', country: 'New Zealand', website: 'https://3dea.co.nz', amsCompatible: true, rfidEnabled: false },
  // Additional Manufacturers
  { name: 'NinjaTek', country: 'USA', website: 'https://ninjatek.com', amsCompatible: true, rfidEnabled: false },
  { name: 'Taulman', country: 'USA', website: 'https://taulman3d.com', amsCompatible: true, rfidEnabled: false },
  { name: 'Proto-pasta', country: 'USA', website: 'https://www.proto-pasta.com', amsCompatible: true, rfidEnabled: false },
  { name: 'Verbatim', country: 'USA', website: 'https://www.verbatim.com', amsCompatible: true, rfidEnabled: false },
  { name: 'Formfutura', country: 'Netherlands', website: 'https://formfutura.com', amsCompatible: true, rfidEnabled: false },
  { name: '3D-Fuel', country: 'USA', website: 'https://3dfuel.com', amsCompatible: true, rfidEnabled: false },
  { name: 'Fiberlogy', country: 'Poland', website: 'https://fiberlogy.com', amsCompatible: true, rfidEnabled: false },
  { name: 'Bondtech', country: 'Sweden', website: 'https://bondtech.se', amsCompatible: true, rfidEnabled: false },
  { name: 'Extrudr', country: 'Austria', website: 'https://extrudr.com', amsCompatible: true, rfidEnabled: false },
  { name: 'TreeD Filaments', country: 'Germany', website: 'https://treed-filaments.de', amsCompatible: true, rfidEnabled: false },
  { name: 'BASF Ultrafuse', country: 'Germany', website: 'https://ultrafuse3d.com', amsCompatible: true, rfidEnabled: false },
  { name: 'Kexcelled', country: 'China', website: 'https://kexcelled.com', amsCompatible: true, rfidEnabled: false },
  { name: '3D Solutech', country: 'USA', website: 'https://3dsolutech.com', amsCompatible: true, rfidEnabled: false },
  { name: '3D Prima', country: 'Sweden', website: 'https://3dprima.com', amsCompatible: true, rfidEnabled: false },
  { name: 'Real Filament', country: 'Spain', website: 'https://realfilament.com', amsCompatible: true, rfidEnabled: false },
  { name: 'X3D', country: 'Australia', website: 'https://x3d.com.au', amsCompatible: true, rfidEnabled: false },
  { name: 'Reprapper', country: 'China', website: 'https://reprapper.com', amsCompatible: true, rfidEnabled: false },
  { name: 'YOUSU', country: 'China', website: 'https://yousu.com', amsCompatible: true, rfidEnabled: false },
  { name: 'Flashforge', country: 'China', website: 'https://www.flashforge.com', amsCompatible: true, rfidEnabled: false },
  { name: 'Creality', country: 'China', website: 'https://www.creality.com', amsCompatible: true, rfidEnabled: false },
  { name: 'OVERTURE', country: 'China', website: 'https://overture3d.com', amsCompatible: true, rfidEnabled: false },
  { name: 'Duramic', country: 'USA', website: 'https://duramic3d.com', amsCompatible: true, rfidEnabled: false },
  { name: 'Polymaker', country: 'China/USA', website: 'https://polymaker.com', amsCompatible: true, rfidEnabled: false },
  { name: 'iSanmate', country: 'China', website: 'https://isanmate.com', amsCompatible: true, rfidEnabled: false },
];

// Standard colors and materials combinations
const STANDARD_COLORS = [
  'Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Purple', 'Pink',
  'Silver', 'Gold', 'Transparent', 'Clear', 'Natural', 'Gray', 'Grey', 'Brown',
  'Ivory', 'Beige', 'Cyan', 'Magenta', 'Lime', 'Navy', 'Maroon', 'Teal',
];

const MATERIALS = ['PLA', 'PETG', 'ABS', 'TPU', 'ASA', 'PC', 'NYLON', 'PA', 'WOOD', 'METAL'];

// Temperature presets by material
const MATERIAL_TEMPS: Record<string, { nozzle: { min: number; max: number; rec: number }; bed: { min: number; max: number; rec: number } }> = {
  PLA: { nozzle: { min: 190, max: 220, rec: 210 }, bed: { min: 50, max: 70, rec: 60 } },
  'PLA+': { nozzle: { min: 205, max: 225, rec: 215 }, bed: { min: 50, max: 70, rec: 60 } },
  'PLA Pro': { nozzle: { min: 210, max: 230, rec: 220 }, bed: { min: 50, max: 70, rec: 60 } },
  PETG: { nozzle: { min: 220, max: 250, rec: 240 }, bed: { min: 70, max: 90, rec: 80 } },
  PET: { nozzle: { min: 220, max: 250, rec: 240 }, bed: { min: 70, max: 90, rec: 80 } },
  ABS: { nozzle: { min: 230, max: 260, rec: 250 }, bed: { min: 80, max: 110, rec: 100 } },
  ASA: { nozzle: { min: 240, max: 270, rec: 260 }, bed: { min: 80, max: 110, rec: 100 } },
  TPU: { nozzle: { min: 220, max: 240, rec: 230 }, bed: { min: 50, max: 70, rec: 60 } },
  TPU85: { nozzle: { min: 220, max: 240, rec: 230 }, bed: { min: 50, max: 70, rec: 60 } },
  TPU95: { nozzle: { min: 230, max: 250, rec: 240 }, bed: { min: 50, max: 70, rec: 60 } },
  PC: { nozzle: { min: 270, max: 310, rec: 290 }, bed: { min: 90, max: 120, rec: 110 } },
  NYLON: { nozzle: { min: 240, max: 270, rec: 260 }, bed: { min: 70, max: 100, rec: 85 } },
  PA: { nozzle: { min: 240, max: 270, rec: 260 }, bed: { min: 70, max: 100, rec: 85 } },
  PAHT: { nozzle: { min: 250, max: 280, rec: 270 }, bed: { min: 80, max: 110, rec: 100 } },
  WOOD: { nozzle: { min: 190, max: 220, rec: 210 }, bed: { min: 50, max: 70, rec: 60 } },
  METAL: { nozzle: { min: 210, max: 230, rec: 220 }, bed: { min: 50, max: 70, rec: 60 } },
  CF: { nozzle: { min: 240, max: 270, rec: 260 }, bed: { min: 80, max: 110, rec: 100 } },
  GF: { nozzle: { min: 230, max: 260, rec: 250 }, bed: { min: 70, max: 100, rec: 85 } },
};

// Price ranges in NZD (approximate from 3dea.co.nz and market research)
const PRICE_RANGES: Record<string, { base: number; premium: number }> = {
  PLA: { base: 25.90, premium: 45.90 },
  'PLA+': { base: 29.90, premium: 49.90 },
  PETG: { base: 27.90, premium: 47.90 },
  ABS: { base: 28.90, premium: 48.90 },
  TPU: { base: 44.90, premium: 64.90 },
  ASA: { base: 39.90, premium: 59.90 },
  PC: { base: 59.90, premium: 89.90 },
  NYLON: { base: 54.90, premium: 84.90 },
  PA: { base: 54.90, premium: 84.90 },
  WOOD: { base: 34.90, premium: 54.90 },
  METAL: { base: 49.90, premium: 79.90 },
  CF: { base: 64.90, premium: 94.90 },
  GF: { base: 59.90, premium: 89.90 },
};

/**
 * Get supplier domain for a manufacturer
 * Maps manufacturers to their primary suppliers
 */
function getSupplierForManufacturer(manufacturerName: string): string | null {
  // Direct manufacturer-to-supplier mappings
  if (manufacturerName === '3DEA') {
    return '3dea.co.nz';
  }
  if (manufacturerName === 'Amazon Basics') {
    return 'amazon.com';
  }
  if (manufacturerName === 'OVERTURE' || manufacturerName === 'Overture') {
    return 'overture3d.com';
  }
  if (manufacturerName === 'Polymaker') {
    return 'polymaker.com';
  }
  if (manufacturerName === 'Prusament') {
    return 'prusa3d.com';
  }
  if (manufacturerName === 'eSUN') {
    return 'esun3d.net';
  }
  if (manufacturerName === 'Sunlu' || manufacturerName === 'SUNLU') {
    return 'sunlu.com';
  }
  if (manufacturerName === 'ColorFabb') {
    return 'colorfabb.com';
  }
  if (manufacturerName === 'Fillamentum') {
    return 'fillamentum.com';
  }
  if (manufacturerName === 'MatterHackers') {
    return 'matterhackers.com';
  }
  if (manufacturerName === 'Inland') {
    return 'microcenter.com';
  }

  // Try to find by manufacturer name in supplier data
  const supplier = FILAMENT_SUPPLIERS.find(s =>
    s.name.toLowerCase() === manufacturerName.toLowerCase()
  );

  return supplier?.domain || null;
}

export async function seedFilamentData(): Promise<void> {
  try {
    logger.info('Starting filament data seeding...');

    // Ensure migrations have run first
    try {
      const { runMigrations } = await import('./migrations.js');
      await runMigrations();
      logger.info('Migrations completed (or already up to date)');
    } catch (migrationError: any) {
      logger.warn('Migration check failed, continuing anyway', { error: migrationError?.message });
      // Continue - migrations might have already run
    }

    // Clear existing data using direct SQLite for efficiency
    try {
      sqlite.prepare('DELETE FROM filament_products').run();
      sqlite.prepare('DELETE FROM manufacturers').run();
    } catch (clearError: any) {
      logger.warn('Error clearing existing data (tables may not exist yet)', { error: clearError?.message });
      // Continue - tables might not exist yet
    }

    const manufacturerIds: Record<string, string> = {};

    // Deduplicate manufacturers by name (case-insensitive)
    const uniqueManufacturers = new Map<string, typeof MANUFACTURERS_DATA[0]>();
    for (const mfr of MANUFACTURERS_DATA) {
      const key = mfr.name.toLowerCase();
      if (!uniqueManufacturers.has(key)) {
        uniqueManufacturers.set(key, mfr);
      }
    }

    // Insert manufacturers (using INSERT OR IGNORE to handle any remaining duplicates)
    for (const manufacturer of uniqueManufacturers.values()) {
      // Check if manufacturer already exists
      const existing = await db.select().from(manufacturers).where(eq(manufacturers.name, manufacturer.name)).limit(1);

      if (existing.length > 0) {
        // Use existing ID
        manufacturerIds[manufacturer.name] = existing[0]!.id;
        logger.info(`Using existing manufacturer: ${manufacturer.name}`);
      } else {
        // Insert new manufacturer
        const id = `mfr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        manufacturerIds[manufacturer.name] = id;

        await db.insert(manufacturers).values({
          id,
          name: manufacturer.name,
          country: manufacturer.country,
          website: manufacturer.website,
          amsCompatible: manufacturer.amsCompatible,
          rfidEnabled: manufacturer.rfidEnabled,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    logger.info(`Inserted ${Object.keys(manufacturerIds).length} manufacturers`);

    // Generate products for each manufacturer (using unique list)
    let productCount = 0;
    for (const manufacturer of uniqueManufacturers.values()) {
      const mfrId = manufacturerIds[manufacturer.name];
      if (!mfrId) continue;

      // Check if manufacturer has specific product catalog
      const catalogProducts = getProductsForManufacturer(manufacturer.name);
      const productsToGenerate = catalogProducts.length > 0 ? catalogProducts : [];

      // If no catalog, generate random products (fallback)
      if (productsToGenerate.length === 0) {
        const numRandomProducts = Math.floor(Math.random() * 3) + 3;
        for (let i = 0; i < numRandomProducts; i++) {
          const material = MATERIALS[Math.floor(Math.random() * MATERIALS.length)]!;
          const color = STANDARD_COLORS[Math.floor(Math.random() * STANDARD_COLORS.length)]!;

          const temps = MATERIAL_TEMPS[material];
          if (!temps) {
            logger.warn(`Missing temperature data for material: ${material}, skipping product`);
            continue;
          }

          const humidity = MATERIAL_HUMIDITY[material] || MATERIAL_HUMIDITY['PLA']!;
          const priceRange = PRICE_RANGES[material] || PRICE_RANGES['PLA']!;

          // Vary pricing slightly
          const priceVariation = (Math.random() - 0.5) * 5; // ±2.50 NZD
          const nzdPrice = Math.round((priceRange.base + priceVariation) * 100) / 100;

          const sku = `${manufacturer.name.substring(0, 3).toUpperCase()}-${material}-${color.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;

          await db.insert(filamentProducts).values({
            id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            manufacturerId: mfrId,
            sku,
            name: `${manufacturer.name} ${material} ${color}`,
            material: material as any,
            color,
            diameter: 1.75,
            weight: 1000,
            nozzleTemperatureMin: temps.nozzle.min,
            nozzleTemperatureMax: temps.nozzle.max,
            nozzleTemperatureRecommended: temps.nozzle.rec,
            bedTemperatureMin: temps.bed.min,
            bedTemperatureMax: temps.bed.max,
            bedTemperatureRecommended: temps.bed.rec,
            optimalHumidityMin: humidity.min,
            optimalHumidityMax: humidity.max,
            optimalHumidityRecommended: humidity.recommended,
            amsCompatible: manufacturer.amsCompatible,
            rfidEnabled: manufacturer.rfidEnabled,
            nzdPrice,
            currency: 'NZD',
            available: true,
            supplier: getSupplierForManufacturer(manufacturer.name),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });

          productCount++;
        }
      } else {
        // Use catalog products
        logger.info(`Generating ${productsToGenerate.length} products for ${manufacturer.name} from catalog`);

        for (const productSpec of productsToGenerate) {
          const temps = MATERIAL_TEMPS[productSpec.material];
          if (!temps) {
            logger.warn(`Missing temperature data for material: ${productSpec.material}, skipping product`);
            continue;
          }

          const humidity = MATERIAL_HUMIDITY[productSpec.material] || MATERIAL_HUMIDITY['PLA']!;
          const priceRange = PRICE_RANGES[productSpec.material] || PRICE_RANGES['PLA']!;

          // Vary pricing slightly
          const priceVariation = (Math.random() - 0.5) * 5; // ±2.50 NZD
          const nzdPrice = productSpec.price || Math.round((priceRange.base + priceVariation) * 100) / 100;

          const sku = productSpec.sku || `${manufacturer.name.substring(0, 3).toUpperCase()}-${productSpec.material}-${productSpec.color.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;

          await db.insert(filamentProducts).values({
            id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            manufacturerId: mfrId,
            sku,
            name: productSpec.name,
            material: productSpec.material as any,
            color: productSpec.color,
            diameter: 1.75,
            weight: 1000,
            nozzleTemperatureMin: temps.nozzle.min,
            nozzleTemperatureMax: temps.nozzle.max,
            nozzleTemperatureRecommended: temps.nozzle.rec,
            bedTemperatureMin: temps.bed.min,
            bedTemperatureMax: temps.bed.max,
            bedTemperatureRecommended: temps.bed.rec,
            optimalHumidityMin: humidity.min,
            optimalHumidityMax: humidity.max,
            optimalHumidityRecommended: humidity.recommended,
            amsCompatible: manufacturer.amsCompatible,
            rfidEnabled: manufacturer.rfidEnabled,
            nzdPrice,
            currency: 'NZD',
            available: true,
            supplier: getSupplierForManufacturer(manufacturer.name),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });

          productCount++;
        }
      }
    }

    logger.info(`Seeded ${productCount} filament products`);
    logger.info('Filament data seeding completed successfully');
  } catch (error) {
    logger.error('Failed to seed filament data', { error });
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedFilamentData()
    .then(() => {
      logger.info('Seeding complete');
      process.exit(0);
    })
    .catch(error => {
      logger.error('Seeding failed', { error });
      process.exit(1);
    });
}

