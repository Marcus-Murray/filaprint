# Filament Management System Redesign

## Problem Statement

Current issues:
1. **Location-based filtering is limiting** - Users in NZ can buy from Amazon, etc.
2. **Limited catalog** - Only seeing fraction of major manufacturers' products (eSUN has 40+ colors, seeing only a few)
3. **No easy way to add custom filaments** - Users can't manually add filaments not in catalog
4. **Catalog vs Inventory confusion** - Mixing reference catalog with user's actual inventory

## Research Findings

### Best Practices from E-Commerce & 3D Printing Tools:
1. **Separate Catalog from Inventory** - Reference catalog should be extensive but separate from user's actual inventory
2. **User-Generated Content** - Users should be able to add their own products
3. **Global Perspective** - Catalog should not be limited by location
4. **Simple Manual Entry** - Quick "Add Custom Filament" button
5. **Smart Defaults** - Auto-fill common properties based on material type

## Proposed Solution

### Architecture Changes

#### 1. **Remove Location-Based Filtering from Catalog**
- Catalog should show ALL available products globally
- Remove supplier filtering based on location
- Keep supplier info but don't filter by it

#### 2. **Three-Tier System**

```
┌─────────────────────────────────────────────┐
│  CATALOG (Reference)                        │
│  - Extensive product database               │
│  - All manufacturers globally               │
│  - Searchable, browsable                    │
│  - "Suggest to add to catalog" feature      │
└─────────────────────────────────────────────┘
              ↓ (Add to Inventory)
┌─────────────────────────────────────────────┐
│  MY INVENTORY (User's Actual Spools)        │
│  - Real spools in possession                │
│  - Tracked by weight, AMS slot, etc.        │
│  - Low filament alerts                      │
│  - Usage tracking                           │
└─────────────────────────────────────────────┘
              ↓ (Link)
┌─────────────────────────────────────────────┐
│  CUSTOM FILAMENTS (User-Added)              │
│  - Manual entries not in catalog            │
│  - Can suggest to be added to catalog       │
│  - Full customization                       │
└─────────────────────────────────────────────┘
```

#### 3. **New UI/UX**

##### Catalog Page
- **Search Bar** - Global search across all products
- **Filters**:
  - Manufacturer (chips)
  - Material (chips)
  - Color (chips)
  - Price Range
  - Remove: Location, Supplier filtering
- **Actions**:
  - "Add to My Inventory" button
  - "Add Missing Product" button (for users to suggest products)
- **Layout**: Grid view with product cards

##### Inventory Page (Current "My Inventory")
- Keep as is - list of user's actual spools
- Add "Quick Add Custom" button at top
- Show: remaining weight, status, AMS slot, purchase info

##### Add Custom Filament Modal
Two modes:
1. **Quick Add** - Minimal fields:
   - Name (required)
   - Material (dropdown, required)
   - Color (required)
   - Remaining Weight (default 1000g)
   - Brand (optional)

2. **Advanced Add** - All fields:
   - Name, Brand, Material, Color
   - Weight, Remaining Weight
   - Temperatures (auto-filled based on material)
   - Humidity (auto-filled based on material)
   - Purchase info
   - AMS slot
   - Notes

### Implementation Plan

#### Phase 1: Remove Location Dependencies
- [ ] Remove `userCountry` state and detection
- [ ] Remove location badge from catalog
- [ ] Remove supplier filtering based on location
- [ ] Update backend to return all products

#### Phase 2: Expand Catalog Data
- [ ] Complete eSUN catalog (40+ colors)
- [ ] Add more Polymaker variants
- [ ] Add more manufacturers' complete catalogs
- [ ] Seed script generates comprehensive products

#### Phase 3: Add Custom Filament UI
- [ ] Add "Add Custom Filament" button to inventory page
- [ ] Create modal with Quick/Advanced modes
- [ ] Form with smart defaults
- [ ] Auto-fill temps/humidity based on material
- [ ] Validation and error handling

#### Phase 4: Catalog Enhancements
- [ ] Remove location-based supplier filtering
- [ ] Keep supplier chips for reference only
- [ ] Add "Suggest Product" feature for missing items
- [ ] Improve search (fuzzy matching, autocomplete)

### Code Changes Needed

#### Frontend (`FilamentsPage.tsx`)
1. Remove `userCountry` state and location detection
2. Remove location badge UI
3. Remove supplier filtering based on country
4. Add "Add Custom Filament" button
5. Create "AddCustomFilamentModal" component

#### Backend
1. Update `seedFilamentData.ts` to generate complete catalogs
2. Remove location-based filtering in `filaments.ts` routes
3. Update `manufacturerProducts.ts` with complete product lists

#### Database
- Keep current schema (supports user-added filaments)
- No changes needed - already handles custom entries

## Benefits

1. **User Empowerment** - Users can add any filament they own
2. **Global Perspective** - No artificial location restrictions
3. **Comprehensive Catalog** - Extensive reference database
4. **Flexibility** - Quick add for common use, advanced for detailed tracking
5. **Future-Proof** - "Suggest Product" crowd-sources catalog growth

## Migration Notes

- Existing user filaments remain unchanged
- Location preference can be removed from localStorage
- No database migration required
- Backward compatible with existing inventory

