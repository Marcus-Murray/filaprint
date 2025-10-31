# Checking AMS Humidity Data Flow

## Quick Debug Steps

### 1. Check Browser Console
Open browser DevTools (F12) and look for:
- Any errors related to humidity or liveData
- Network requests to `/api/printers/statuses`

### 2. Check Network Tab
1. Open DevTools → Network tab
2. Filter for "statuses"
3. Click on a `/api/printers/statuses` request
4. Check Response → `data[0].liveData.humidity`
5. Look for:
```json
{
  "slot1": 45.2,
  "slot2": 43.8,
  "slot3": 46.1,
  "slot4": 44.5,
  "average": 44.9
}
```

### 3. Check Debug Endpoint
Visit (while logged in):
```
http://localhost:5173/api/debug/live-data?printerId=YOUR_PRINTER_ID
```

This will show:
- Raw MQTT message structure
- Current live data
- Humidity values if being parsed

### 4. Check Server Logs
The server should be logging the first MQTT message structure. Look for:
- `hasAMS: true`
- `amsStructure` with humidity values

## Common Issues

### If Humidity Shows "—" or 0%:
1. **Printer not connected**: Check connection status
2. **AMS not reporting**: Some AMS units may not report humidity until a slot is active
3. **Data structure mismatch**: MQTT data structure might be different than expected

### If No Live Data at All:
1. Check MQTT connection in server logs
2. Verify printer is sending status reports
3. Check if `/api/printers/statuses` returns empty liveData

## Expected Behavior

During a print:
- Humidity values should update every 2 seconds (Dashboard refresh rate)
- Values typically range from 20-60% RH
- Inactive slots may show 0% until filament is loaded

## Next Steps

If humidity isn't updating:
1. Share what you see in Network tab response
2. Share the debug endpoint output
3. Check if other live data (temperatures) are updating

