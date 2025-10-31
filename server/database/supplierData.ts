/**
 * Global Filament Suppliers Data
 *
 * Top 20 online filament suppliers with geographic information
 * Supports country-based filtering for local suppliers
 */

export interface Supplier {
  id: string;
  name: string;
  domain: string; // e.g., '3dea.co.nz'
  website: string; // Full URL
  countries: string[]; // ISO country codes or names where they operate
  regions: string[]; // Regions (e.g., 'APAC', 'EU', 'NA', 'Global')
  primaryCountry?: string; // Primary base country
}

/**
 * Top 20 Global Filament Suppliers
 */
export const FILAMENT_SUPPLIERS: Supplier[] = [
  // New Zealand
  {
    id: '3dea',
    name: '3DEA',
    domain: '3dea.co.nz',
    website: 'https://3dea.co.nz',
    countries: ['NZ', 'New Zealand'],
    regions: ['APAC'],
    primaryCountry: 'NZ',
  },

  // Australia
  {
    id: 'x3d',
    name: 'X3D',
    domain: 'x3d.com.au',
    website: 'https://x3d.com.au',
    countries: ['AU', 'Australia'],
    regions: ['APAC'],
    primaryCountry: 'AU',
  },

  // USA - Major Players
  {
    id: 'matterhackers',
    name: 'MatterHackers',
    domain: 'matterhackers.com',
    website: 'https://www.matterhackers.com',
    countries: ['US', 'United States'],
    regions: ['NA', 'Global'],
    primaryCountry: 'US',
  },
  {
    id: 'amazon',
    name: 'Amazon',
    domain: 'amazon.com',
    website: 'https://amazon.com',
    countries: ['US', 'GB', 'AU', 'NZ', 'CA', 'DE', 'FR', 'IT', 'ES', 'JP', 'United States', 'United Kingdom', 'Australia', 'New Zealand', 'Canada', 'Germany', 'France', 'Italy', 'Spain', 'Japan'],
    regions: ['NA', 'EU', 'APAC', 'Global'],
    primaryCountry: 'US',
  },
  {
    id: 'microcenter',
    name: 'Micro Center (Inland)',
    domain: 'microcenter.com',
    website: 'https://www.microcenter.com',
    countries: ['US', 'United States'],
    regions: ['NA'],
    primaryCountry: 'US',
  },
  {
    id: 'zyltech',
    name: 'ZYLtech',
    domain: 'zyltech.com',
    website: 'https://zyltech.com',
    countries: ['US', 'United States'],
    regions: ['NA'],
    primaryCountry: 'US',
  },
  {
    id: '3dsolutech',
    name: '3D Solutech',
    domain: '3dsolutech.com',
    website: 'https://3dsolutech.com',
    countries: ['US', 'United States'],
    regions: ['NA'],
    primaryCountry: 'US',
  },
  {
    id: 'ninjatek',
    name: 'NinjaTek',
    domain: 'ninjatek.com',
    website: 'https://ninjatek.com',
    countries: ['US', 'United States'],
    regions: ['NA', 'Global'],
    primaryCountry: 'US',
  },
  {
    id: 'proto-pasta',
    name: 'Proto-pasta',
    domain: 'proto-pasta.com',
    website: 'https://www.proto-pasta.com',
    countries: ['US', 'United States'],
    regions: ['NA', 'Global'],
    primaryCountry: 'US',
  },

  // Europe
  {
    id: 'colorfabb',
    name: 'ColorFabb',
    domain: 'colorfabb.com',
    website: 'https://colorfabb.com',
    countries: ['NL', 'Netherlands', 'BE', 'Belgium', 'DE', 'Germany', 'FR', 'France', 'GB', 'United Kingdom'],
    regions: ['EU', 'Global'],
    primaryCountry: 'NL',
  },
  {
    id: 'fillamentum',
    name: 'Fillamentum',
    domain: 'fillamentum.com',
    website: 'https://fillamentum.com',
    countries: ['CZ', 'Czech Republic', 'DE', 'Germany', 'FR', 'France', 'GB', 'United Kingdom'],
    regions: ['EU', 'Global'],
    primaryCountry: 'CZ',
  },
  {
    id: 'formfutura',
    name: 'Formfutura',
    domain: 'formfutura.com',
    website: 'https://formfutura.com',
    countries: ['NL', 'Netherlands', 'BE', 'Belgium', 'DE', 'Germany'],
    regions: ['EU'],
    primaryCountry: 'NL',
  },
  {
    id: 'fiberlogy',
    name: 'Fiberlogy',
    domain: 'fiberlogy.com',
    website: 'https://fiberlogy.com',
    countries: ['PL', 'Poland', 'DE', 'Germany', 'GB', 'United Kingdom'],
    regions: ['EU', 'Global'],
    primaryCountry: 'PL',
  },
  {
    id: '3dprima',
    name: '3D Prima',
    domain: '3dprima.com',
    website: 'https://3dprima.com',
    countries: ['SE', 'Sweden', 'NO', 'Norway', 'DK', 'Denmark', 'FI', 'Finland'],
    regions: ['EU'],
    primaryCountry: 'SE',
  },
  {
    id: 'realfilament',
    name: 'Real Filament',
    domain: 'realfilament.com',
    website: 'https://realfilament.com',
    countries: ['ES', 'Spain', 'PT', 'Portugal', 'FR', 'France'],
    regions: ['EU'],
    primaryCountry: 'ES',
  },

  // Asia-Pacific
  {
    id: 'overture',
    name: 'Overture',
    domain: 'overture3d.com',
    website: 'https://overture3d.com',
    countries: ['CN', 'China', 'US', 'United States', 'AU', 'Australia', 'NZ', 'New Zealand'],
    regions: ['APAC', 'NA', 'Global'],
    primaryCountry: 'CN',
  },
  {
    id: 'esun',
    name: 'eSUN',
    domain: 'esun3d.net',
    website: 'https://www.esun3d.net',
    countries: ['CN', 'China', 'US', 'United States', 'AU', 'Australia', 'NZ', 'New Zealand'],
    regions: ['APAC', 'NA', 'Global'],
    primaryCountry: 'CN',
  },
  {
    id: 'sunlu',
    name: 'Sunlu',
    domain: 'sunlu.com',
    website: 'https://www.sunlu.com',
    countries: ['CN', 'China', 'US', 'United States', 'AU', 'Australia', 'NZ', 'New Zealand'],
    regions: ['APAC', 'NA', 'Global'],
    primaryCountry: 'CN',
  },

  // Global/International
  {
    id: 'prusament',
    name: 'Prusament',
    domain: 'prusa3d.com',
    website: 'https://www.prusa3d.com',
    countries: ['CZ', 'Czech Republic', 'US', 'United States', 'GB', 'United Kingdom', 'DE', 'Germany', 'AU', 'Australia', 'NZ', 'New Zealand'],
    regions: ['EU', 'NA', 'APAC', 'Global'],
    primaryCountry: 'CZ',
  },
  {
    id: 'polymaker',
    name: 'Polymaker',
    domain: 'polymaker.com',
    website: 'https://polymaker.com',
    countries: ['CN', 'China', 'US', 'United States', 'GB', 'United Kingdom', 'AU', 'Australia', 'NZ', 'New Zealand'],
    regions: ['APAC', 'NA', 'EU', 'Global'],
    primaryCountry: 'CN',
  },
];

/**
 * Get suppliers for a specific country
 */
export function getSuppliersByCountry(country: string): Supplier[] {
  const countryUpper = country.toUpperCase();
  const countryLower = country.toLowerCase();

  return FILAMENT_SUPPLIERS.filter(supplier => {
    return supplier.countries.some(c =>
      c.toUpperCase() === countryUpper ||
      c.toLowerCase() === countryLower ||
      c.toLowerCase().includes(countryLower) ||
      countryLower.includes(c.toLowerCase())
    );
  });
}

/**
 * Get suppliers for a region
 */
export function getSuppliersByRegion(region: string): Supplier[] {
  const regionUpper = region.toUpperCase();
  return FILAMENT_SUPPLIERS.filter(supplier =>
    supplier.regions.some(r => r.toUpperCase() === regionUpper)
  );
}

/**
 * Get all supplier domains
 */
export function getAllSupplierDomains(): string[] {
  return FILAMENT_SUPPLIERS.map(s => s.domain).filter(Boolean);
}

/**
 * Find supplier by domain
 */
export function findSupplierByDomain(domain: string): Supplier | undefined {
  return FILAMENT_SUPPLIERS.find(s =>
    s.domain.toLowerCase() === domain.toLowerCase() ||
    s.website.toLowerCase().includes(domain.toLowerCase())
  );
}

