# MQTT Filament Consumption Data Research

## Overview
This document tracks research into Bambu Labs H2D MQTT message structure for filament consumption data.

## Status: 🔍 RESEARCH REQUIRED

### Current Implementation
The code includes placeholder extraction logic that tries multiple possible data structures, but **actual field names need to be confirmed** from real MQTT messages.

### Methods to Extract Filament Data

#### Method 1: Analyze Real MQTT Messages
**Action Required:**
1. Run a print job to completion
2. Capture MQTT messages during and after print completion
3. Document the actual field structure
4. Update `extractFilamentConsumption()` with correct field names

**Debug Endpoint Available:**
```
GET /api/debug/raw-mqtt?printerId=<id>
```
This returns the last raw MQTT message structure.

#### Method 2: Check Bambu Labs Documentation
- Official API documentation (if available)
- Community forums/forums
- Open source projects using Bambu MQTT

#### Method 3: Trial and Error
- Try common field names (see below)
- Test with real prints
- Log all print completion messages

## Possible Field Structures

### Structure 1: AMS Tray-Based
```json
{
  "print": {
    "ams": {
      "ams": [
        {
          "tray": [
            {
              "slot": 1,
              "length_used": 1250.5,  // mm
              "weight_used": 15.2,     // grams
              "material": "PLA",
              "color": "Black"
            }
          ]
        }
      ]
    }
  }
}
```

### Structure 2: Direct Filament Array
```json
{
  "print": {
    "filament_used": [
      {
        "slot": 1,
        "length": 1250.5,
        "weight": 15.2,
        "material": "PLA",
        "color": "Black"
      }
    ]
  }
}
```

### Structure 3: Single Value
```json
{
  "print": {
    "ams_slot": 1,
    "filament_weight": 15.2,
    "filament_length": 1250.5,
    "filament_weight_estimate": 16.0
  }
}
```

### Structure 4: Print Time/Duration Fields
```json
{
  "print": {
    "mc_timelapse": 45,        // Duration in minutes?
    "print_time": 2700,        // Duration in seconds?
    "mc_print_time": 45        // Duration in minutes?
  }
}
```

## Detection Logic

### Print Completion Detection
Currently detects completion by status transitions:
- Previous status: `printing` or `paused`
- Current status: `completed`, `error`, `failed`, or `idle` (with progress < 100%)

### Status Mapping
```typescript
const statusMap = {
  'completed': 'completed',
  'error': 'failed',
  'failed': 'failed',
  'idle' (with wasPrinting): 'cancelled'
}
```

## Next Steps

1. ✅ **Completed**: Created interfaces for filament consumption
2. ✅ **Completed**: Added print completion detection logic
3. ✅ **Completed**: Added event emitter for completion events
4. ⚠️ **Pending**: Document actual MQTT field names from real prints
5. ⚠️ **Pending**: Update extraction logic with correct field names
6. ⚠️ **Pending**: Test with real print completions

## Testing Plan

### Test Case 1: Single Color Print
- Print a simple model with single filament
- Verify completion detection
- Verify filament consumption extraction
- Check AMS slot matching

### Test Case 2: Multi-Color Print
- Print a model with multiple filaments
- Verify all filaments tracked
- Verify correct slot assignments

### Test Case 3: Failed Print
- Start a print and cancel it
- Verify partial consumption calculation
- Verify status is 'cancelled'

### Test Case 4: Print Failure
- Trigger a print failure
- Verify error status
- Verify consumption if available

## Fallback Strategy

If MQTT doesn't provide consumption data:
1. **Use Estimated Values**: From slicer (if available in MQTT)
2. **Calculate from Progress**: Estimate based on completion percentage
3. **User Input**: Allow manual entry with prompt
4. **G-code Analysis**: Parse G-code file for E-axis movements (future)

## Related Files
- `server/services/mqttService.ts` - Main MQTT parsing logic
- `server/services/printJobService.ts` - Print completion handler (to be created)
- `server/routes/debug.ts` - Debug endpoint for MQTT inspection

