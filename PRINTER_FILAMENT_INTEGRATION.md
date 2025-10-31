# Printer-Filament Manager Integration Plan

## Overview
Future integration to automatically update filament inventory when print jobs complete, using real-time MQTT data from Bambu Labs H2D printers.

## Current State
- ✅ Filament inventory management system
- ✅ `filamentUsage` table for tracking usage
- ✅ MQTT service receiving live data from printers
- ✅ Print job tracking system
- ✅ Batch update capabilities for grouped spools

## Integration Architecture

### Data Flow
```
Printer (MQTT) → LiveDataService → PrintJobService → FilamentService → Database
```

### Key Components

#### 1. MQTT Data Parsing
- Extract filament consumption from MQTT messages
- Track weight consumed during printing
- Monitor AMS slot usage for automatic filament detection

#### 2. Print Job Completion Handler
**Location**: `server/services/printJobService.ts` (to be created/enhanced)

**Functionality**:
- Listen for print completion events from MQTT
- Extract actual filament used (from MQTT or calculate from print data)
- Automatically deduct from active filament inventory
- Create `filamentUsage` record
- Update filament `remainingWeight`

#### 3. Real-Time Inventory Updates
**Triggers**:
- Print job completion
- Print job cancellation (partial usage)
- Print failure (partial usage)

**Logic**:
```typescript
// Pseudo-code for integration
async function handlePrintCompletion(printJob: PrintJob, mqttData: H2DLiveData) {
  // 1. Get filament used (from MQTT or estimate)
  const filamentUsed = calculateFilamentUsed(mqttData);

  // 2. Find active filament (by AMS slot or printer assignment)
  const activeFilament = await findActiveFilament(
    printJob.printerId,
    mqttData.amsSlot
  );

  // 3. Deduct from inventory
  await filamentService.recordUsage({
    filamentId: activeFilament.id,
    printJobId: printJob.id,
    weightUsed: filamentUsed
  });

  // 4. Update filament status (empty, low, active)
  await filamentService.updateFilamentStatus(activeFilament.id);
}
```

#### 4. AMS Slot Detection
- Match AMS slot from MQTT data to filament inventory
- Automatically select correct filament for usage tracking
- Handle multi-color prints (track all used filaments)

## Implementation Steps

### Phase 1: MQTT Data Enhancement
1. **Extract Filament Data from MQTT**
   - Parse filament consumption from print data
   - Track AMS slot usage
   - Capture actual vs estimated filament usage

### Phase 2: Print Job Service Integration
1. **Create Print Completion Handler**
   - Subscribe to print completion events
   - Extract filament consumption data
   - Trigger inventory updates

2. **Implement Usage Calculation**
   - Use MQTT reported values (if available)
   - Fallback to G-code analysis
   - Consider print failures/partial prints

### Phase 3: Inventory Auto-Updates
1. **Automatic Deduction**
   - Update `remainingWeight` on print completion
   - Handle grouped spools (deduct from most-used)
   - Auto-update status (empty/low/active)

2. **Usage History**
   - Create `filamentUsage` records automatically
   - Link to print jobs for analytics
   - Track consumption patterns

### Phase 4: Advanced Features
1. **Smart Filament Selection**
   - Auto-select filament based on AMS slot
   - Warn if filament running low before print
   - Suggest filament alternatives

2. **Predictive Analytics**
   - Estimate filament remaining after prints
   - Alert before running out mid-print
   - Track cost per print

## Database Schema (Already Exists)
```sql
-- filamentUsage table already supports this:
- filamentId (links to filament)
- printJobId (links to print job)
- weightUsed (grams consumed)
- usageDate (timestamp)
```

## API Endpoints (To Be Enhanced)
- `POST /api/print-jobs/:id/complete` - Auto-deduct filament
- `GET /api/filaments/usage/:filamentId` - View usage history
- `POST /api/filaments/auto-update` - Manual trigger (for testing)

## Configuration Options
```typescript
interface AutoUpdateConfig {
  enabled: boolean;           // Toggle auto-updates
  deductOnCompletion: boolean; // Deduct on successful prints
  deductOnFailure: boolean;    // Deduct on failed prints
  estimateIfMissing: boolean;  // Estimate if MQTT data unavailable
  updateStatus: boolean;        // Auto-update filament status
}
```

## Error Handling
- Handle missing filament data gracefully
- Support manual correction of auto-deductions
- Log all automatic updates for audit trail
- Warn user if filament not found in inventory

## Testing Strategy
1. Unit tests for usage calculation
2. Integration tests with mock MQTT data
3. End-to-end tests with real print completions
4. Edge cases: partial prints, failures, multi-color

## Future Enhancements
- **RFID Integration**: Auto-identify filaments via AMS2 Pro RFID
- **Multi-Color Prints**: Track all filaments used in single print
- **Material Consumption Analytics**: Cost analysis per print/material
- **Predictive Reordering**: Auto-suggest when to reorder filaments
- **Batch Printing**: Handle multiple prints with same filament

---

**Status**: Planned for future implementation
**Priority**: High (after core filament management is stable)
**Estimated Effort**: 2-3 weeks for full integration

