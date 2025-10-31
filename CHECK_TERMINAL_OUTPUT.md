# How to Check Server Terminal Output

## Quick Guide

### Option 1: VS Code/Cursor Terminal (Recommended)

1. **Look at the bottom of VS Code/Cursor**
   - Click on the **TERMINAL** tab (usually at the bottom)
   - You should see one or more terminal panes

2. **Find the server terminal**
   - Look for a terminal showing output like:
     ```
     [0] 🚀 FilaPrint server running on port 3000
     [1] VITE ready in 1234 ms
     ```
   - OR search for "npm run dev:full" in the terminal output

3. **Scroll up in that terminal**
   - Look for messages starting with `✅ MQTT connected - First message structure:`
   - This appears **only on the first MQTT message** after server restart

### Option 2: Force New Debug Output

Since the debug message only shows on the **first** MQTT message, you can force it by:

1. **Disconnect your printer** in the UI (Printers page → click "Disconnect")
2. **Wait 5 seconds**
3. **Reconnect your printer** (click "Connect")
4. **Check the terminal** - you should now see the debug output

### Option 3: Check Log Files Directly

You can read the log file directly:

```powershell
# View last 100 lines
Get-Content logs\combined4.log -Tail 100

# Search for MQTT structure
Get-Content logs\combined4.log -Tail 500 | Select-String -Pattern "First message|chamberFields|amsStructure"
```

## What to Look For

When you see the debug output, look for:

```json
{
  "topic": "device/.../report",
  "nozzle1Value": 220,    ← Right nozzle temp
  "nozzle2Value": 25,     ← Left nozzle temp
  "chamberFields": {
    "print_chamber_temper": null,    ← Check these values
    "print_chamber_temp": null,      ← If all null, chamber not in MQTT
    "root_chamber_temper": 32        ← Might be here!
  },
  "amsStructure": {
    "keys": ["ams", "tray", ...],    ← Shows AMS structure
    "tray_type": "array",            ← Type of humidity data
    "tray_sample": {...}             ← Sample of actual data
  }
}
```

## Still Can't Find It?

If you can't see the terminal:

1. **Stop the servers** (press `Ctrl+C` in the terminal)
2. **Restart them**:
   ```powershell
   npm run dev:full
   ```
3. **Watch the terminal output** as the server starts
4. **Wait for "✅ MQTT connected"** message (appears when printer sends first data)

---

**Need Help?** Share a screenshot of your terminal and I can help identify the right output!




