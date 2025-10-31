# Print Completion Testing Guide

## Overview

This guide covers testing the printer-filament integration, specifically the automatic print completion tracking and filament usage recording.

## Test Structure

### Unit Tests
Location: `tests/unit/printJobService.test.ts`

**Coverage:**
- Event listener setup/teardown
- Print completion handling
- Filament matching logic
- Edge cases (missing printer, missing filament, invalid data)
- Status transitions

**Run:**
```bash
npm run test:unit
```

### Integration Tests
Location: `tests/integration/mqttPrintCompletion.test.ts`

**Coverage:**
- End-to-end event flow
- Multi-filament print handling
- Database operations

**Run:**
```bash
npm run test:integration
```

### Manual Testing Script
Location: `scripts/test-print-completion.ts`

**Purpose:** Simulate a print completion event for manual testing

**Usage:**
```bash
# Set your printer serial number (optional, defaults to TEST123456)
export TEST_PRINTER_SERIAL=YOUR_SERIAL_NUMBER

# Run the simulation
npm run test:print-completion
```

**Requirements:**
1. Server must be running
2. Printer must exist in database with matching serial number
3. Filament must be assigned to AMS slot 1 for that printer

## Testing Scenarios

### Scenario 1: Successful Print Completion
1. Printer exists in database
2. Filament assigned to AMS slot 1
3. Print completes successfully
4. Filament consumption data available

**Expected Results:**
- ✅ Print job record created
- ✅ Filament usage recorded
- ✅ Filament inventory updated (weight deducted)
- ✅ Status updated if needed

### Scenario 2: Missing Printer
1. Serial number doesn't match any printer
2. Print completion event received

**Expected Results:**
- ⚠️ Warning logged
- ❌ No print job created
- ✅ System continues functioning

### Scenario 3: Missing Filament Assignment
1. Printer exists
2. No filament assigned to AMS slot
3. Print completes with filament usage

**Expected Results:**
- ✅ Print job created
- ⚠️ Warning logged for missing filament
- ✅ Other slots processed if available

### Scenario 4: Failed Print
1. Print fails/cancelled
2. Filament consumption data may or may not be available

**Expected Results:**
- ✅ Print job created with 'failed' or 'cancelled' status
- ❌ Filament usage NOT recorded
- ✅ System handles gracefully

### Scenario 5: Multi-Color Print
1. Multiple filaments used (slots 1, 2, 3)
2. Print completes successfully

**Expected Results:**
- ✅ All filaments matched and updated
- ✅ Multiple usage records created
- ✅ All linked to same print job

## Real-World Testing

### Prerequisites
1. **Setup:**
   - Server running
   - Printer connected via MQTT
   - At least one filament assigned to AMS slot

2. **Test Print:**
   - Start a small print (e.g., test cube)
   - Wait for completion OR cancel it
   - Check logs and database

### Verification Steps

**1. Check Server Logs:**
```
✅ Print completion detected
✅ Processing print completion
✅ Filament usage recorded
✅ Filament inventory updated
```

**2. Check Database:**

```sql
-- Print jobs
SELECT * FROM print_jobs ORDER BY created_at DESC LIMIT 1;

-- Filament usage
SELECT * FROM filament_usage ORDER BY usage_date DESC LIMIT 5;

-- Filament inventory
SELECT id, name, remaining_weight, status, ams_slot
FROM filaments
WHERE printer_id = 'your_printer_id';
```

**3. Check API:**

```bash
# Get recent print jobs
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/print-jobs

# Get filament usage
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/filaments/USAGE_ID
```

## Troubleshooting

### Issue: No print jobs created
**Check:**
- Is printer serial number matching?
- Is MQTT connected?
- Are print completion events being emitted?
- Check server logs for errors

### Issue: Filament not updated
**Check:**
- Is filament assigned to correct AMS slot?
- Does filament belong to correct user?
- Is consumption data in MQTT message?
- Check filament_usage table for records

### Issue: Negative weight
**Should not happen** - code prevents this with `Math.max(0, ...)`
If it does, check:
- Database constraints
- Race conditions (unlikely with SQLite)
- Manual edits

## Performance Testing

### Load Test Scenarios
1. **Rapid Completions:** Multiple prints completing quickly
2. **High Volume:** 100+ print jobs over time
3. **Concurrent Updates:** Multiple filaments updated simultaneously

**Metrics to Monitor:**
- Event processing time
- Database query time
- Memory usage
- Error rates

## Coverage Goals

- **Unit Tests:** 80%+ coverage
- **Integration Tests:** All critical paths
- **Edge Cases:** All documented scenarios
- **Real-World:** At least 5 successful print completions

## Next Steps

After successful testing:
1. ✅ Verify all test scenarios pass
2. ✅ Run coverage report: `npm run test:coverage`
3. ✅ Test with real printer prints
4. ✅ Monitor production logs
5. ✅ Document any edge cases found

## Notes

- Tests use mocks to avoid requiring actual MQTT connection
- Manual test script requires server to be running
- Integration tests can be run independently
- All tests should pass before deploying to production

