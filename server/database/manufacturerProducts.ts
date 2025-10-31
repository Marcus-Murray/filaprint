/**
 * Comprehensive Product Catalog for Major Manufacturers
 *
 * Real product data for top filament brands including:
 * - eSUN (PLA+, PETG, TPU, specialty filaments)
 * - Polymaker (PolyTerra, PolyMax, specialty lines)
 * - Bambu Lab (Bambu Filament)
 * - Prusament (PLA, PETG, specialty materials)
 * - Overture (PLA Pro, PETG, specialty)
 */

export interface ProductSpec {
  name: string;
  material: string;
  color: string;
  sku?: string;
  price?: number;
}

// eSUN Products - Comprehensive catalog
export const ESUN_PRODUCTS: ProductSpec[] = [
  // PLA+ Standard Colors (40+ colors)
  { name: 'eSUN PLA+', material: 'PLA+', color: 'Black', sku: 'ESUN-PLA+-BLK' },
  { name: 'eSUN PLA+', material: 'PLA+', color: 'White', sku: 'ESUN-PLA+-WHT' },
  { name: 'eSUN PLA+', material: 'PLA+', color: 'Red', sku: 'ESUN-PLA+-RED' },
  { name: 'eSUN PLA+', material: 'PLA+', color: 'Blue', sku: 'ESUN-PLA+-BLU' },
  { name: 'eSUN PLA+', material: 'PLA+', color: 'Green', sku: 'ESUN-PLA+-GRN' },
  { name: 'eSUN PLA+', material: 'PLA+', color: 'Yellow', sku: 'ESUN-PLA+-YLW' },
  { name: 'eSUN PLA+', material: 'PLA+', color: 'Orange', sku: 'ESUN-PLA+-ORG' },
  { name: 'eSUN PLA+', material: 'PLA+', color: 'Purple', sku: 'ESUN-PLA+-PUR' },
  { name: 'eSUN PLA+', material: 'PLA+', color: 'Pink', sku: 'ESUN-PLA+-PNK' },
  { name: 'eSUN PLA+', material: 'PLA+', color: 'Gray', sku: 'ESUN-PLA+-GRY' },
  { name: 'eSUN PLA+', material: 'PLA+', color: 'Silver', sku: 'ESUN-PLA+-SLV' },
  { name: 'eSUN PLA+', material: 'PLA+', color: 'Gold', sku: 'ESUN-PLA+-GLD' },
  { name: 'eSUN PLA+', material: 'PLA+', color: 'Transparent', sku: 'ESUN-PLA+-CLR' },
  { name: 'eSUN PLA+', material: 'PLA+', color: 'Apricot', sku: 'ESUN-PLA+-APR' },
  { name: 'eSUN PLA+', material: 'PLA+', color: 'Bone White', sku: 'ESUN-PLA+-BON' },
  { name: 'eSUN PLA+', material: 'PLA+', color: 'Brown', sku: 'ESUN-PLA+-BRN' },
  { name: 'eSUN PLA+', material: 'PLA+', color: 'Beige', sku: 'ESUN-PLA+-BEI' },
  { name: 'eSUN PLA+', material: 'PLA+', color: 'Dark Blue', sku: 'ESUN-PLA+-DAB' },
  { name: 'eSUN PLA+', material: 'PLA+', color: 'Fire Engine Red', sku: 'ESUN-PLA+-FRE' },
  { name: 'eSUN PLA+', material: 'PLA+', color: 'Grass Green', sku: 'ESUN-PLA+-GRG' },
  { name: 'eSUN PLA+', material: 'PLA+', color: 'Haze Blue', sku: 'ESUN-PLA+-HAZ' },
  { name: 'eSUN PLA+', material: 'PLA+', color: 'Holly Green', sku: 'ESUN-PLA+-HOL' },
  { name: 'eSUN PLA+', material: 'PLA+', color: 'Jade Green', sku: 'ESUN-PLA+-JAD' },
  { name: 'eSUN PLA+', material: 'PLA+', color: 'Light Blue', sku: 'ESUN-PLA+-LIG' },
  { name: 'eSUN PLA+', material: 'PLA+', color: 'Light Brown', sku: 'ESUN-PLA+-LIB' },
  { name: 'eSUN PLA+', material: 'PLA+', color: 'Milky White', sku: 'ESUN-PLA+-MIW' },
  { name: 'eSUN PLA+', material: 'PLA+', color: 'Mint Green', sku: 'ESUN-PLA+-MIG' },
  { name: 'eSUN PLA+', material: 'PLA+', color: 'Mustard Green', sku: 'ESUN-PLA+-MUG' },
  { name: 'eSUN PLA+', material: 'PLA+', color: 'Olive Green', sku: 'ESUN-PLA+-OLG' },
  { name: 'eSUN PLA+', material: 'PLA+', color: 'Peak Green', sku: 'ESUN-PLA+-PEG' },
  { name: 'eSUN PLA+', material: 'PLA+', color: 'Pine Green', sku: 'ESUN-PLA+-PIG' },
  { name: 'eSUN PLA+', material: 'PLA+', color: 'Space Blue', sku: 'ESUN-PLA+-SPB' },
  { name: 'eSUN PLA+', material: 'PLA+', color: 'Warm White', sku: 'ESUN-PLA+-WAW' },
  { name: 'eSUN PLA+', material: 'PLA+', color: 'Very Peri', sku: 'ESUN-PLA+-VEP' },
  { name: 'eSUN PLA+', material: 'PLA+', color: 'RGB Red', sku: 'ESUN-PLA+-RGBR' },
  { name: 'eSUN PLA+', material: 'PLA+', color: 'RGB Green', sku: 'ESUN-PLA+-RGBG' },
  { name: 'eSUN PLA+', material: 'PLA+', color: 'RGB Blue', sku: 'ESUN-PLA+-RGBB' },

  // eSUN PETG Products
  { name: 'eSUN PETG', material: 'PETG', color: 'Black', sku: 'ESUN-PETG-BLK' },
  { name: 'eSUN PETG', material: 'PETG', color: 'White', sku: 'ESUN-PETG-WHT' },
  { name: 'eSUN PETG', material: 'PETG', color: 'Red', sku: 'ESUN-PETG-RED' },
  { name: 'eSUN PETG', material: 'PETG', color: 'Blue', sku: 'ESUN-PETG-BLU' },
  { name: 'eSUN PETG', material: 'PETG', color: 'Green', sku: 'ESUN-PETG-GRN' },
  { name: 'eSUN PETG', material: 'PETG', color: 'Yellow', sku: 'ESUN-PETG-YLW' },
  { name: 'eSUN PETG', material: 'PETG', color: 'Transparent', sku: 'ESUN-PETG-CLR' },
  { name: 'eSUN PETG', material: 'PETG', color: 'Gray', sku: 'ESUN-PETG-GRY' },
  { name: 'eSUN PETG', material: 'PETG', color: 'Orange', sku: 'ESUN-PETG-ORG' },
  { name: 'eSUN PETG', material: 'PETG', color: 'Purple', sku: 'ESUN-PETG-PUR' },

  // eSUN TPU Products
  { name: 'eSUN TPU', material: 'TPU', color: 'Black', sku: 'ESUN-TPU-BLK' },
  { name: 'eSUN TPU', material: 'TPU', color: 'White', sku: 'ESUN-TPU-WHT' },
  { name: 'eSUN TPU', material: 'TPU', color: 'Transparent', sku: 'ESUN-TPU-CLR' },

  // eSUN Specialty Products
  { name: 'eSUN ABS', material: 'ABS', color: 'Black', sku: 'ESUN-ABS-BLK' },
  { name: 'eSUN ABS', material: 'ABS', color: 'White', sku: 'ESUN-ABS-WHT' },
  { name: 'eSUN ABS', material: 'ABS', color: 'Red', sku: 'ESUN-ABS-RED' },
  { name: 'eSUN ABS', material: 'ABS', color: 'Blue', sku: 'ESUN-ABS-BLU' },
  { name: 'eSUN ABS+', material: 'ABS', color: 'Black', sku: 'ESUN-ABS+-BLK' },
  { name: 'eSUN PLA-UV Color Change', material: 'PLA', color: 'UV Color Change', sku: 'ESUN-PLAUV-CLR' },
  { name: 'eSUN PLA Tough', material: 'PLA', color: 'Black', sku: 'ESUN-PLAT-BLK' },
];

// Polymaker Products - Expanded catalog
export const POLYMAKER_PRODUCTS: ProductSpec[] = [
  // PolyTerra PLA - Eco-friendly matte finish
  { name: 'PolyTerra PLA', material: 'PLA', color: 'Black', sku: 'PM-TER-BLK' },
  { name: 'PolyTerra PLA', material: 'PLA', color: 'White', sku: 'PM-TER-WHT' },
  { name: 'PolyTerra PLA', material: 'PLA', color: 'Red', sku: 'PM-TER-RED' },
  { name: 'PolyTerra PLA', material: 'PLA', color: 'Blue', sku: 'PM-TER-BLU' },
  { name: 'PolyTerra PLA', material: 'PLA', color: 'Green', sku: 'PM-TER-GRN' },
  { name: 'PolyTerra PLA', material: 'PLA', color: 'Yellow', sku: 'PM-TER-YLW' },
  { name: 'PolyTerra PLA', material: 'PLA', color: 'Orange', sku: 'PM-TER-ORG' },
  { name: 'PolyTerra PLA', material: 'PLA', color: 'Purple', sku: 'PM-TER-PUR' },
  { name: 'PolyTerra PLA', material: 'PLA', color: 'Gray', sku: 'PM-TER-GRY' },
  { name: 'PolyTerra PLA', material: 'PLA', color: 'Brown', sku: 'PM-TER-BRN' },

  // PolyMax PLA - High performance
  { name: 'PolyMax PLA', material: 'PLA', color: 'Black', sku: 'PM-MAX-BLK' },
  { name: 'PolyMax PLA', material: 'PLA', color: 'White', sku: 'PM-MAX-WHT' },
  { name: 'PolyMax PLA', material: 'PLA', color: 'Red', sku: 'PM-MAX-RED' },
  { name: 'PolyMax PLA', material: 'PLA', color: 'Blue', sku: 'PM-MAX-BLU' },
  { name: 'PolyMax PLA', material: 'PLA', color: 'Green', sku: 'PM-MAX-GRN' },

  // PolyMax PETG - High performance PETG
  { name: 'PolyMax PETG', material: 'PETG', color: 'Black', sku: 'PM-PETG-BLK' },
  { name: 'PolyMax PETG', material: 'PETG', color: 'Clear', sku: 'PM-PETG-CLR' },
  { name: 'PolyMax PETG', material: 'PETG', color: 'Blue', sku: 'PM-PETG-BLU' },
  { name: 'PolyMax PETG', material: 'PETG', color: 'Red', sku: 'PM-PETG-RED' },

  // PolyLite Series
  { name: 'PolyLite ABS', material: 'ABS', color: 'Black', sku: 'PM-ABS-BLK' },
  { name: 'PolyLite ABS', material: 'ABS', color: 'White', sku: 'PM-ABS-WHT' },
  { name: 'PolyLite ABS', material: 'ABS', color: 'Red', sku: 'PM-ABS-RED' },
  { name: 'PolyLite PC', material: 'PC', color: 'Black', sku: 'PM-PC-BLK' },
  { name: 'PolyLite PC', material: 'PC', color: 'Clear', sku: 'PM-PC-CLR' },

  // PolyFlex TPU
  { name: 'PolyFlex TPU', material: 'TPU', color: 'Black', sku: 'PM-TPU-BLK' },
  { name: 'PolyFlex TPU', material: 'TPU', color: 'White', sku: 'PM-TPU-WHT' },
  { name: 'PolyFlex TPU', material: 'TPU', color: 'Clear', sku: 'PM-TPU-CLR' },

  // Specialty Materials
  { name: 'PolyMide PA12', material: 'PA', color: 'Natural', sku: 'PM-PA12-NAT' },
  { name: 'PolyMide PA12-CF', material: 'CF', color: 'Black', sku: 'PM-PA12CF-BLK' },
  { name: 'PolyWood', material: 'WOOD', color: 'Natural Wood', sku: 'PM-WOOD-NAT' },
];

// Bambu Lab Products - Expanded catalog
export const BAMBU_LAB_PRODUCTS: ProductSpec[] = [
  // PLA Basic - Standard finish
  { name: 'Bambu PLA Basic', material: 'PLA', color: 'Black', sku: 'BB-PLA-BLK' },
  { name: 'Bambu PLA Basic', material: 'PLA', color: 'White', sku: 'BB-PLA-WHT' },
  { name: 'Bambu PLA Basic', material: 'PLA', color: 'Blue', sku: 'BB-PLA-BLU' },
  { name: 'Bambu PLA Basic', material: 'PLA', color: 'Red', sku: 'BB-PLA-RED' },
  { name: 'Bambu PLA Basic', material: 'PLA', color: 'Green', sku: 'BB-PLA-GRN' },
  { name: 'Bambu PLA Basic', material: 'PLA', color: 'Yellow', sku: 'BB-PLA-YLW' },
  { name: 'Bambu PLA Basic', material: 'PLA', color: 'Orange', sku: 'BB-PLA-ORG' },
  { name: 'Bambu PLA Basic', material: 'PLA', color: 'Purple', sku: 'BB-PLA-PUR' },
  { name: 'Bambu PLA Basic', material: 'PLA', color: 'Pink', sku: 'BB-PLA-PNK' },
  { name: 'Bambu PLA Basic', material: 'PLA', color: 'Gray', sku: 'BB-PLA-GRY' },

  // PLA Matte - Matte finish
  { name: 'Bambu PLA Matte', material: 'PLA', color: 'Black', sku: 'BB-MAT-BLK' },
  { name: 'Bambu PLA Matte', material: 'PLA', color: 'White', sku: 'BB-MAT-WHT' },
  { name: 'Bambu PLA Matte', material: 'PLA', color: 'Blue', sku: 'BB-MAT-BLU' },
  { name: 'Bambu PLA Matte', material: 'PLA', color: 'Red', sku: 'BB-MAT-RED' },
  { name: 'Bambu PLA Matte', material: 'PLA', color: 'Green', sku: 'BB-MAT-GRN' },
  { name: 'Bambu PLA Matte', material: 'PLA', color: 'Yellow', sku: 'BB-MAT-YLW' },
  { name: 'Bambu PLA Matte', material: 'PLA', color: 'Orange', sku: 'BB-MAT-ORG' },

  // PETG
  { name: 'Bambu PETG', material: 'PETG', color: 'Black', sku: 'BB-PETG-BLK' },
  { name: 'Bambu PETG', material: 'PETG', color: 'Clear', sku: 'BB-PETG-CLR' },
  { name: 'Bambu PETG', material: 'PETG', color: 'Blue', sku: 'BB-PETG-BLU' },
  { name: 'Bambu PETG', material: 'PETG', color: 'White', sku: 'BB-PETG-WHT' },
  { name: 'Bambu PETG', material: 'PETG', color: 'Red', sku: 'BB-PETG-RED' },

  // PLA Support
  { name: 'Bambu PLA Support', material: 'PLA', color: 'Natural', sku: 'BB-SUP-NAT' },

  // Specialty
  { name: 'Bambu PAHT-CF', material: 'CF', color: 'Black', sku: 'BB-PAHT-BLK' },
];

// Prusament Products - Expanded catalog
export const PRUSAMENT_PRODUCTS: ProductSpec[] = [
  // PLA - Standard colors
  { name: 'Prusament PLA', material: 'PLA', color: 'Jet Black', sku: 'PRU-PLA-JBK' },
  { name: 'Prusament PLA', material: 'PLA', color: 'Vanilla White', sku: 'PRU-PLA-VWH' },
  { name: 'Prusament PLA', material: 'PLA', color: 'Prusa Orange', sku: 'PRU-PLA-ORG' },
  { name: 'Prusament PLA', material: 'PLA', color: 'Signal Red', sku: 'PRU-PLA-RED' },
  { name: 'Prusament PLA', material: 'PLA', color: 'Azure Blue', sku: 'PRU-PLA-AZU' },
  { name: 'Prusament PLA', material: 'PLA', color: 'Pearl Green', sku: 'PRU-PLA-PGR' },
  { name: 'Prusament PLA', material: 'PLA', color: 'Panther Pink', sku: 'PRU-PLA-PNK' },

  // PLA Special effects
  { name: 'Prusament PLA', material: 'PLA', color: 'Marble', sku: 'PRU-PLA-MRB' },
  { name: 'Prusament PLA', material: 'PLA', color: 'Galaxy Silver', sku: 'PRU-PLA-GAL' },
  { name: 'Prusament PLA', material: 'PLA', color: 'Crystal Clear', sku: 'PRU-PLA-CLR' },

  // PETG
  { name: 'Prusament PETG', material: 'PETG', color: 'Prusa Orange', sku: 'PRU-PETG-ORG' },
  { name: 'Prusament PETG', material: 'PETG', color: 'Prusa Galaxy Black', sku: 'PRU-PETG-GBX' },
  { name: 'Prusament PETG', material: 'PETG', color: 'Prusa Galaxy Purple', sku: 'PRU-PETG-GPU' },
  { name: 'Prusament PETG', material: 'PETG', color: 'Crystal Clear', sku: 'PRU-PETG-CLR' },
  { name: 'Prusament PETG', material: 'PETG', color: 'Jet Black', sku: 'PRU-PETG-BLK' },

  // ASA
  { name: 'Prusament ASA', material: 'ASA', color: 'Black', sku: 'PRU-ASA-BLK' },
  { name: 'Prusament ASA', material: 'ASA', color: 'Ivory White', sku: 'PRU-ASA-WHT' },
  { name: 'Prusament ASA', material: 'ASA', color: 'Signal Red', sku: 'PRU-ASA-RED' },
  { name: 'Prusament ASA', material: 'ASA', color: 'Prusa Orange', sku: 'PRU-ASA-ORG' },

  // PC & PC Blend
  { name: 'Prusament PC Blend', material: 'PC', color: 'Black', sku: 'PRU-PC-BLK' },
  { name: 'Prusament PC Blend', material: 'PC', color: 'Natural', sku: 'PRU-PC-NAT' },
  { name: 'Prusament Polycarbonate', material: 'PC', color: 'White', sku: 'PRU-PC-WHT' },

  // Specialty
  { name: 'Prusament PVB', material: 'PLA', color: 'Clear', sku: 'PRU-PVB-CLR' },
];

// Overture Products - Expanded catalog
export const OVERTURE_PRODUCTS: ProductSpec[] = [
  // PLA Pro - Premium PLA
  { name: 'Overture PLA Pro', material: 'PLA', color: 'Black', sku: 'OVT-PLAP-BLK' },
  { name: 'Overture PLA Pro', material: 'PLA', color: 'White', sku: 'OVT-PLAP-WHT' },
  { name: 'Overture PLA Pro', material: 'PLA', color: 'Blue', sku: 'OVT-PLAP-BLU' },
  { name: 'Overture PLA Pro', material: 'PLA', color: 'Red', sku: 'OVT-PLAP-RED' },
  { name: 'Overture PLA Pro', material: 'PLA', color: 'Green', sku: 'OVT-PLAP-GRN' },
  { name: 'Overture PLA Pro', material: 'PLA', color: 'Yellow', sku: 'OVT-PLAP-YLW' },
  { name: 'Overture PLA Pro', material: 'PLA', color: 'Orange', sku: 'OVT-PLAP-ORG' },
  { name: 'Overture PLA Pro', material: 'PLA', color: 'Purple', sku: 'OVT-PLAP-PUR' },
  { name: 'Overture PLA Pro', material: 'PLA', color: 'Pink', sku: 'OVT-PLAP-PNK' },
  { name: 'Overture PLA Pro', material: 'PLA', color: 'Gray', sku: 'OVT-PLAP-GRY' },

  // Standard PLA
  { name: 'Overture PLA', material: 'PLA', color: 'Black', sku: 'OVT-PLA-BLK' },
  { name: 'Overture PLA', material: 'PLA', color: 'White', sku: 'OVT-PLA-WHT' },
  { name: 'Overture PLA', material: 'PLA', color: 'Red', sku: 'OVT-PLA-RED' },
  { name: 'Overture PLA', material: 'PLA', color: 'Blue', sku: 'OVT-PLA-BLU' },

  // PETG
  { name: 'Overture PETG', material: 'PETG', color: 'Black', sku: 'OVT-PETG-BLK' },
  { name: 'Overture PETG', material: 'PETG', color: 'Clear', sku: 'OVT-PETG-CLR' },
  { name: 'Overture PETG', material: 'PETG', color: 'White', sku: 'OVT-PETG-WHT' },
  { name: 'Overture PETG', material: 'PETG', color: 'Red', sku: 'OVT-PETG-RED' },
  { name: 'Overture PETG', material: 'PETG', color: 'Blue', sku: 'OVT-PETG-BLU' },
  { name: 'Overture PETG', material: 'PETG', color: 'Green', sku: 'OVT-PETG-GRN' },

  // TPU
  { name: 'Overture TPU', material: 'TPU', color: 'Black', sku: 'OVT-TPU-BLK' },
  { name: 'Overture TPU', material: 'TPU', color: 'White', sku: 'OVT-TPU-WHT' },
  { name: 'Overture TPU', material: 'TPU', color: 'Clear', sku: 'OVT-TPU-CLR' },

  // ABS
  { name: 'Overture ABS', material: 'ABS', color: 'Black', sku: 'OVT-ABS-BLK' },
  { name: 'Overture ABS', material: 'ABS', color: 'White', sku: 'OVT-ABS-WHT' },
  { name: 'Overture ABS', material: 'ABS', color: 'Red', sku: 'OVT-ABS-RED' },

  // Specialty
  { name: 'Overture Matte PLA', material: 'PLA', color: 'Black', sku: 'OVT-MAT-BLK' },
  { name: 'Overture Matte PLA', material: 'PLA', color: 'White', sku: 'OVT-MAT-WHT' },
];

// Sunlu Products - Expanded catalog
export const SUNLU_PRODUCTS: ProductSpec[] = [
  // PLA Standard
  { name: 'Sunlu PLA', material: 'PLA', color: 'Black', sku: 'SUN-PLA-BLK' },
  { name: 'Sunlu PLA', material: 'PLA', color: 'White', sku: 'SUN-PLA-WHT' },
  { name: 'Sunlu PLA', material: 'PLA', color: 'Red', sku: 'SUN-PLA-RED' },
  { name: 'Sunlu PLA', material: 'PLA', color: 'Blue', sku: 'SUN-PLA-BLU' },
  { name: 'Sunlu PLA', material: 'PLA', color: 'Green', sku: 'SUN-PLA-GRN' },
  { name: 'Sunlu PLA', material: 'PLA', color: 'Yellow', sku: 'SUN-PLA-YLW' },
  { name: 'Sunlu PLA', material: 'PLA', color: 'Orange', sku: 'SUN-PLA-ORG' },
  { name: 'Sunlu PLA', material: 'PLA', color: 'Purple', sku: 'SUN-PLA-PUR' },
  { name: 'Sunlu PLA', material: 'PLA', color: 'Pink', sku: 'SUN-PLA-PNK' },
  { name: 'Sunlu PLA', material: 'PLA', color: 'Gray', sku: 'SUN-PLA-GRY' },

  // PLA+
  { name: 'Sunlu PLA+', material: 'PLA+', color: 'Black', sku: 'SUN-PLAP-BLK' },
  { name: 'Sunlu PLA+', material: 'PLA+', color: 'White', sku: 'SUN-PLAP-WHT' },
  { name: 'Sunlu PLA+', material: 'PLA+', color: 'Red', sku: 'SUN-PLAP-RED' },
  { name: 'Sunlu PLA+', material: 'PLA+', color: 'Blue', sku: 'SUN-PLAP-BLU' },
  { name: 'Sunlu PLA+', material: 'PLA+', color: 'Green', sku: 'SUN-PLAP-GRN' },

  // PETG
  { name: 'Sunlu PETG', material: 'PETG', color: 'Black', sku: 'SUN-PETG-BLK' },
  { name: 'Sunlu PETG', material: 'PETG', color: 'Clear', sku: 'SUN-PETG-CLR' },
  { name: 'Sunlu PETG', material: 'PETG', color: 'White', sku: 'SUN-PETG-WHT' },
  { name: 'Sunlu PETG', material: 'PETG', color: 'Red', sku: 'SUN-PETG-RED' },
  { name: 'Sunlu PETG', material: 'PETG', color: 'Blue', sku: 'SUN-PETG-BLU' },

  // ABS
  { name: 'Sunlu ABS', material: 'ABS', color: 'Black', sku: 'SUN-ABS-BLK' },
  { name: 'Sunlu ABS', material: 'ABS', color: 'White', sku: 'SUN-ABS-WHT' },
  { name: 'Sunlu ABS', material: 'ABS', color: 'Red', sku: 'SUN-ABS-RED' },

  // TPU
  { name: 'Sunlu TPU', material: 'TPU', color: 'Black', sku: 'SUN-TPU-BLK' },
  { name: 'Sunlu TPU', material: 'TPU', color: 'Clear', sku: 'SUN-TPU-CLR' },
];

// ColorFabb Products - Expanded catalog
export const COLORFABB_PRODUCTS: ProductSpec[] = [
  // PLA/PHA - Bio-based
  { name: 'ColorFabb PLA/PHA', material: 'PLA', color: 'Black', sku: 'CF-PLA-BLK' },
  { name: 'ColorFabb PLA/PHA', material: 'PLA', color: 'White', sku: 'CF-PLA-WHT' },
  { name: 'ColorFabb PLA/PHA', material: 'PLA', color: 'Neon Orange', sku: 'CF-PLA-NEO' },
  { name: 'ColorFabb PLA/PHA', material: 'PLA', color: 'Signal Red', sku: 'CF-PLA-RED' },
  { name: 'ColorFabb PLA/PHA', material: 'PLA', color: 'Azure Blue', sku: 'CF-PLA-BLU' },
  { name: 'ColorFabb PLA/PHA', material: 'PLA', color: 'Panther Pink', sku: 'CF-PLA-PNK' },
  { name: 'ColorFabb PLA/PHA', material: 'PLA', color: 'Pearl Green', sku: 'CF-PLA-GRN' },

  // XT - Premium PETG
  { name: 'ColorFabb XT', material: 'PETG', color: 'Black', sku: 'CF-XT-BLK' },
  { name: 'ColorFabb XT', material: 'PETG', color: 'Crystal Clear', sku: 'CF-XT-CLR' },
  { name: 'ColorFabb XT', material: 'PETG', color: 'White', sku: 'CF-XT-WHT' },
  { name: 'ColorFabb XT', material: 'PETG', color: 'Signal Red', sku: 'CF-XT-RED' },
  { name: 'ColorFabb XT', material: 'PETG', color: 'Azure Blue', sku: 'CF-XT-BLU' },

  // HT - High Temperature PETG
  { name: 'ColorFabb HT', material: 'PETG', color: 'Black', sku: 'CF-HT-BLK' },
  { name: 'ColorFabb HT', material: 'PETG', color: 'Crystal Clear', sku: 'CF-HT-CLR' },

  // nGen - Modified PET
  { name: 'ColorFabb nGen', material: 'PET', color: 'Black', sku: 'CF-NGEN-BLK' },
  { name: 'ColorFabb nGen', material: 'PET', color: 'White', sku: 'CF-NGEN-WHT' },
  { name: 'ColorFabb nGen', material: 'PET', color: 'Signal Red', sku: 'CF-NGEN-RED' },

  // Specialty Fill Materials
  { name: 'ColorFabb WoodFill', material: 'WOOD', color: 'Natural Wood', sku: 'CF-WOOD-NAT' },
  { name: 'ColorFabb MetalFill', material: 'METAL', color: 'Bronze', sku: 'CF-MET-BRZ' },
  { name: 'ColorFabb MetalFill', material: 'METAL', color: 'Copper', sku: 'CF-MET-CPR' },
  { name: 'ColorFabb MetalFill', material: 'METAL', color: 'Steel', sku: 'CF-MET-STL' },
];

/**
 * Get all products for a specific manufacturer
 */
export function getProductsForManufacturer(manufacturerName: string): ProductSpec[] {
  const name = manufacturerName.toLowerCase();

  if (name.includes('esun') || name === 'esun') {
    return ESUN_PRODUCTS;
  }
  if (name.includes('polymaker') || name === 'polymaker') {
    return POLYMAKER_PRODUCTS;
  }
  if (name.includes('bambu lab') || name === 'bambu lab') {
    return BAMBU_LAB_PRODUCTS;
  }
  if (name.includes('prusament') || name === 'prusament') {
    return PRUSAMENT_PRODUCTS;
  }
  if (name.includes('overture') || name === 'overture') {
    return OVERTURE_PRODUCTS;
  }
  if (name.includes('sunlu') || name === 'sunlu') {
    return SUNLU_PRODUCTS;
  }
  if (name.includes('colorfabb') || name === 'colorfabb') {
    return COLORFABB_PRODUCTS;
  }

  return [];
}

/**
 * Check if manufacturer has specific product catalog
 */
export function hasProductCatalog(manufacturerName: string): boolean {
  return getProductsForManufacturer(manufacturerName).length > 0;
}

