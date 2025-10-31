# Filament Management API Testing Guide

## 📋 Prerequisites

1. **Start the server**: `npm run dev:full` or restart your existing server
2. **Login**: Get a JWT token by logging in through the UI or API
3. **Token**: Store it for API calls (Authorization: Bearer <token>)

## 🔑 Authentication

All filament endpoints require authentication. Include the JWT token in the Authorization header:

```bash
Authorization: Bearer <your-jwt-token>
```

## 📝 Available Endpoints

### 1. Get All User Filaments
```bash
GET http://localhost:3000/api/filaments
```

**Query Parameters:**
- `status` (optional): Filter by status (`active`, `low`, `empty`, `stored`)
- `printerId` (optional): Filter by printer
- `material` (optional): Filter by material type

**Example:**
```bash
curl -X GET "http://localhost:3000/api/filaments?status=low" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Get Low Filament Alerts
```bash
GET http://localhost:3000/api/filaments/alerts
```

Returns all filaments below their low threshold.

### 3. Get Single Filament
```bash
GET http://localhost:3000/api/filaments/:id
```

### 4. Get Filament by AMS Slot
```bash
GET http://localhost:3000/api/filaments/ams/:printerId/:slot
```

Example: `/api/filaments/ams/printer_123/1` (slot 1-4)

### 5. Create New Filament
```bash
POST http://localhost:3000/api/filaments
Content-Type: application/json
```

**Body:**
```json
{
  "name": "3DEA PLA Black",
  "brand": "3DEA",
  "material": "PLA",
  "color": "Black",
  "weight": 1000,
  "remainingWeight": 850,
  "diameter": 1.75,
  "nozzleTemperature": 210,
  "bedTemperature": 60,
  "optimalHumidity": 40,
  "status": "active",
  "lowThreshold": 100,
  "supplier": "3dea.co.nz",
  "purchasePrice": 27.90,
  "purchaseCurrency": "NZD"
}
```

**With Product Catalog:**
```json
{
  "productId": "prod_123456",
  "weight": 1000,
  "remainingWeight": 1000,
  "status": "stored",
  "supplier": "3dea.co.nz",
  "purchasePrice": 29.90
}
```

**With RFID (AMS detected):**
```json
{
  "rfidUid": "ABC123DEF456",
  "rfidTagType": "NFC",
  "rfidTrayIdName": "Tray-1",
  "rfidTrayInfoCols": "Black",
  "rfidTrayInfoName": "PLA",
  "name": "Auto-detected PLA",
  "weight": 1000,
  "remainingWeight": 1000
}
```

### 6. Update Filament
```bash
PUT http://localhost:3000/api/filaments/:id
Content-Type: application/json
```

**Body:** (all fields optional)
```json
{
  "remainingWeight": 750,
  "status": "low",
  "amsSlot": 2,
  "printerId": "printer_123"
}
```

### 7. Delete Filament
```bash
DELETE http://localhost:3000/api/filaments/:id
```

### 8. Record Filament Usage
```bash
POST http://localhost:3000/api/filaments/:id/usage
Content-Type: application/json
```

**Body:**
```json
{
  "weightUsed": 25.5,
  "printJobId": "job_123" // optional
}
```

This automatically:
- Records the usage
- Updates remaining weight
- Updates status if below threshold

### 9. Get Manufacturers Catalog
```bash
GET http://localhost:3000/api/filaments/catalog/manufacturers
```

Returns all manufacturers (3DEA, Bambu Lab, Polymaker, etc.)

### 10. Get Product Catalog
```bash
GET http://localhost:3000/api/filaments/catalog/products
```

**Query Parameters:**
- `manufacturerId` (optional): Filter by manufacturer
- `material` (optional): Filter by material (PLA, PETG, etc.)
- `available` (optional): Filter by availability (true/false)
- `search` (optional): Search by name, color, or SKU

**Examples:**
```bash
# Get all PLA products
GET /api/filaments/catalog/products?material=PLA

# Search for black filaments
GET /api/filaments/catalog/products?search=black

# Get 3DEA products
GET /api/filaments/catalog/products?manufacturerId=mfr_123
```

## 🧪 Testing Checklist

- [ ] Start server and verify seed data was created (check server logs)
- [ ] Get manufacturers catalog
- [ ] Get product catalog
- [ ] Create a filament (manual entry)
- [ ] Create a filament (from product catalog)
- [ ] Get all filaments
- [ ] Update filament (change weight, status)
- [ ] Record usage (should auto-update weight and status)
- [ ] Get low filament alerts
- [ ] Get filament by AMS slot
- [ ] Delete filament

## 💡 Expected Behavior

### On Server Start:
- Database migrations run automatically
- If manufacturers table is empty, seed data is populated
- You'll see logs like: `✅ Filament data seeded successfully` or `✅ Filament catalog already populated (X manufacturers)`

### Material Humidity Calculation:
- When creating/updating a filament, if `material` is provided but `optimalHumidity` is not, it will be calculated automatically
- PLA: 40% recommended
- PETG: 30% recommended
- ABS/ASA: 20% recommended
- PC/NYLON: 10% recommended
- etc.

### Usage Tracking:
- Recording usage automatically:
  - Reduces `remainingWeight`
  - Updates `status` if below `lowThreshold` → becomes "low"
  - Updates `status` to "empty" if `remainingWeight` reaches 0

## 🐛 Troubleshooting

**No manufacturers in catalog:**
- Check server logs for seeding errors
- Manually run: Import and call `seedFilamentData()` from `server/database/seedFilamentData.ts`

**401 Unauthorized:**
- Make sure you're logged in and have a valid JWT token
- Check token expiry

**404 Not Found:**
- Verify server is running on correct port (default: 3000)
- Check route paths match exactly

**500 Internal Server Error:**
- Check server logs for detailed error messages
- Verify database migrations ran successfully
- Check database file exists and is accessible




