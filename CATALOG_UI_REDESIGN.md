# Catalog UI Redesign - Hierarchical Selection Pattern

## Problem Analysis (Chain-of-Thought)

### Current State:
- **Issue**: Visual overload - showing 229+ products in a grid
- **Pain Point**: Too much information at once
- **User Goal**: Find specific filament (manufacturer → material → color)

### Optimal Solution:
**Progressive Disclosure Pattern** - Step-by-step selection reduces cognitive load

## Research-Based Design Principles

### 1. Progressive Disclosure
- Show only relevant options at each step
- Reduce decision fatigue
- Guide users through selection naturally

### 2. Hierarchical Navigation
```
Step 1: Manufacturer Selection
  ↓
Step 2: Material Selection (filtered by manufacturer)
  ↓
Step 3: Color Selection (filtered by manufacturer + material)
  ↓
Step 4: Product Details & Add to Inventory
```

### 3. Visual Design Principles
- **Clear visual hierarchy**: Steps should be obvious
- **Breadcrumb navigation**: Show current path
- **Large clickable areas**: Easy selection on mobile
- **Color swatches**: Visual color representation
- **Empty states**: Helpful guidance when no selection

## Proposed UI Design

### Step 1: Select Manufacturer
- Large manufacturer cards/logos
- Grid layout (2-3 columns on desktop)
- Search/quick filter at top
- Visual: Card-based with manufacturer name and logo/icon

### Step 2: Select Material
- Filtered materials for selected manufacturer
- Chip/button selection
- Show count: "5 materials available"
- Visual: Pill/chip buttons

### Step 3: Select Color
- Grid of color swatches
- Large, clickable color squares
- Color name below swatch
- Price visible if available
- Visual: Color grid with names

### Step 4: Product Summary & Add
- Selected: Manufacturer > Material > Color
- Price display
- Product details
- "Add to Inventory" button
- Option to go back/change selection

## Implementation Plan

### Component Structure
```
<CatalogWizard>
  <Step1_Manufacturer />
  <Step2_Material />
  <Step3_Color />
  <Step4_Summary />
</CatalogWizard>
```

### State Management
- `selectedManufacturer` - stores manufacturer ID
- `selectedMaterial` - stores material type
- `selectedColor` - stores color string
- `currentStep` - 1-4 for navigation
- Filter products progressively at each step

### UX Enhancements
1. **Breadcrumb Trail**: Show "Manufacturer > Material > Color"
2. **Quick Reset**: "Start Over" button at any step
3. **Search Integration**: Still allow search but filter results
4. **Mobile Optimization**: Stack steps vertically on mobile
5. **Loading States**: Show spinners during filtering

## Benefits

1. **Reduced Cognitive Load**: Only see relevant options
2. **Faster Selection**: Guided path to desired product
3. **Better Mobile UX**: Large tap targets
4. **Scalable**: Works with 1000+ products
5. **Intuitive**: Matches mental model (manufacturer → material → color)

