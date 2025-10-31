import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Users table
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'user'] }).notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  lastLoginAt: text('last_login_at'),
  failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
  lockedUntil: text('locked_until'),
});

// Printers table
export const printers = sqliteTable('printers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  model: text('model').notNull(),
  serialNumber: text('serial_number').notNull().unique(),
  ipAddress: text('ip_address').notNull(),
  accessCode: text('access_code').notNull(),
  description: text('description'),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  mqttHost: text('mqtt_host').notNull(),
  mqttPort: integer('mqtt_port').notNull().default(8883),
  mqttUsername: text('mqtt_username').notNull().default('bblp'),
  mqttPassword: text('mqtt_password').notNull(),
  mqttKeepalive: integer('mqtt_keepalive').notNull().default(60),
  mqttReconnectPeriod: integer('mqtt_reconnect_period').notNull().default(5000),
  mqttConnectTimeout: integer('mqtt_connect_timeout').notNull().default(30000),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Printer status table
export const printerStatus = sqliteTable('printer_status', {
  id: text('id').primaryKey(),
  printerId: text('printer_id')
    .notNull()
    .references(() => printers.id, { onDelete: 'cascade' }),
  connectionStatus: text('connection_status', {
    enum: ['connected', 'disconnected', 'error', 'connecting'],
  }).notNull(),
  lastSeen: text('last_seen').notNull(),
  liveData: text('live_data'), // JSON string
  errorMessage: text('error_message'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Live data table
export const liveData = sqliteTable('live_data', {
  id: text('id').primaryKey(),
  printerId: text('printer_id')
    .notNull()
    .references(() => printers.id, { onDelete: 'cascade' }),
  timestamp: text('timestamp').notNull(),
  data: text('data').notNull(), // JSON string
  createdAt: text('created_at').notNull(),
});

// Refresh tokens table
export const refreshTokens = sqliteTable('refresh_tokens', {
  token: text('token').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull(),
});

// Audit logs table
export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  eventType: text('event_type').notNull(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  printerId: text('printer_id').references(() => printers.id, {
    onDelete: 'set null',
  }),
  requestId: text('request_id'),
  details: text('details'), // JSON string
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  url: text('url'),
  method: text('method'),
  statusCode: integer('status_code'),
  createdAt: text('created_at').notNull(),
});

// Type definitions for better TypeScript support
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Printer = typeof printers.$inferSelect;
export type NewPrinter = typeof printers.$inferInsert;

export type PrinterStatus = typeof printerStatus.$inferSelect;
export type NewPrinterStatus = typeof printerStatus.$inferInsert;

export type LiveData = typeof liveData.$inferSelect;
export type NewLiveData = typeof liveData.$inferInsert;

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

// Filament manufacturers catalog
export const manufacturers = sqliteTable('manufacturers', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  country: text('country'),
  website: text('website'),
  amsCompatible: integer('ams_compatible', { mode: 'boolean' }).notNull().default(true),
  rfidEnabled: integer('rfid_enabled', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Filament product catalog (from manufacturers)
export const filamentProducts = sqliteTable('filament_products', {
  id: text('id').primaryKey(),
  manufacturerId: text('manufacturer_id').notNull().references(() => manufacturers.id, { onDelete: 'cascade' }),
  sku: text('sku').notNull(),
  name: text('name').notNull(),
  material: text('material', {
    enum: ['PLA', 'PETG', 'ABS', 'TPU', 'ASA', 'PC', 'NYLON', 'WOOD', 'METAL', 'PET', 'PLA+', 'PLA Pro', 'TPU95', 'TPU85', 'PA', 'PAHT', 'CF', 'GF'],
  }).notNull(),
  color: text('color').notNull(),
  diameter: real('diameter').notNull().default(1.75), // mm
  weight: real('weight').notNull().default(1000), // grams (1kg default)
  nozzleTemperatureMin: integer('nozzle_temperature_min'),
  nozzleTemperatureMax: integer('nozzle_temperature_max'),
  nozzleTemperatureRecommended: integer('nozzle_temperature_recommended'),
  bedTemperatureMin: integer('bed_temperature_min'),
  bedTemperatureMax: integer('bed_temperature_max'),
  bedTemperatureRecommended: integer('bed_temperature_recommended'),
  optimalHumidityMin: real('optimal_humidity_min'),
  optimalHumidityMax: real('optimal_humidity_max'),
  optimalHumidityRecommended: real('optimal_humidity_recommended'),
  amsCompatible: integer('ams_compatible', { mode: 'boolean' }).notNull().default(true),
  rfidEnabled: integer('rfid_enabled', { mode: 'boolean' }).notNull().default(false),
  nzdPrice: real('nzd_price'), // New Zealand Dollar price
  currency: text('currency').notNull().default('NZD'),
  available: integer('available', { mode: 'boolean' }).notNull().default(true),
  supplier: text('supplier'), // Supplier/retailer (e.g., '3dea.co.nz')
  imageUrl: text('image_url'),
  description: text('description'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// User filament inventory (actual spools owned)
export const filaments = sqliteTable('filaments', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  productId: text('product_id').references(() => filamentProducts.id, { onDelete: 'set null' }), // Link to catalog
  manufacturerId: text('manufacturer_id').references(() => manufacturers.id, { onDelete: 'set null' }),
  // RFID data from AMS
  rfidUid: text('rfid_uid'), // RFID chip unique ID
  rfidTagType: text('rfid_tag_type'), // NFC tag type from AMS
  rfidTrayIdName: text('rfid_tray_id_name'), // Tray identifier
  rfidTrayInfoCols: text('rfid_tray_info_cols'), // Color code from RFID
  rfidTrayInfoName: text('rfid_tray_info_name'), // Material name from RFID
  // Manual entry fields (if no RFID)
  name: text('name').notNull(),
  brand: text('brand'),
  material: text('material', {
    enum: ['PLA', 'PETG', 'ABS', 'TPU', 'ASA', 'PC', 'NYLON', 'WOOD', 'METAL', 'PET', 'PLA+', 'PLA Pro', 'TPU95', 'TPU85', 'PA', 'PAHT', 'CF', 'GF'],
  }).notNull(),
  color: text('color').notNull(),
  diameter: real('diameter').notNull().default(1.75),
  weight: real('weight').notNull(), // Total weight in grams
  remainingWeight: real('remaining_weight').notNull(), // Remaining weight in grams
  nozzleTemperature: integer('nozzle_temperature'), // Recommended nozzle temp
  bedTemperature: integer('bed_temperature'), // Recommended bed temp
  optimalHumidity: real('optimal_humidity'), // Optimal humidity % for this material
  // AMS integration
  amsSlot: integer('ams_slot'), // AMS slot number (1-4)
  printerId: text('printer_id').references(() => printers.id, { onDelete: 'set null' }), // Which printer's AMS
  amsSerialNumber: text('ams_serial_number'), // AMS Pro 2 serial number for more precise matching
  status: text('status', {
    enum: ['active', 'low', 'empty', 'stored'],
  }).notNull().default('stored'),
  lowThreshold: real('low_threshold').notNull().default(100), // Alert when below this (grams)
  purchaseDate: text('purchase_date'),
  purchasePrice: real('purchase_price'), // Purchase price in NZD
  purchaseCurrency: text('purchase_currency').notNull().default('NZD'),
  supplier: text('supplier'), // e.g., '3dea.co.nz'
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Filament usage tracking
export const filamentUsage = sqliteTable('filament_usage', {
  id: text('id').primaryKey(),
  filamentId: text('filament_id').notNull().references(() => filaments.id, { onDelete: 'cascade' }),
  printJobId: text('print_job_id').references(() => printJobs.id, { onDelete: 'set null' }),
  weightUsed: real('weight_used').notNull(), // Grams used
  usageDate: text('usage_date').notNull(),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
});

// Print jobs table (reference from above)
export const printJobs = sqliteTable('print_jobs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  printerId: text('printer_id').notNull().references(() => printers.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status', {
    enum: ['pending', 'printing', 'paused', 'completed', 'failed', 'cancelled'],
  }).notNull().default('pending'),
  progress: integer('progress').notNull().default(0), // 0-100
  startTime: text('start_time'),
  endTime: text('end_time'),
  duration: integer('duration'), // seconds
  fileUrl: text('file_url'),
  estimatedTime: integer('estimated_time'), // seconds
  estimatedFilament: real('estimated_filament'), // grams
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type Manufacturer = typeof manufacturers.$inferSelect;
export type NewManufacturer = typeof manufacturers.$inferInsert;

export type FilamentProduct = typeof filamentProducts.$inferSelect;
export type NewFilamentProduct = typeof filamentProducts.$inferInsert;

export type Filament = typeof filaments.$inferSelect;
export type NewFilament = typeof filaments.$inferInsert;

export type FilamentUsage = typeof filamentUsage.$inferSelect;
export type NewFilamentUsage = typeof filamentUsage.$inferInsert;

export type PrintJob = typeof printJobs.$inferSelect;
export type NewPrintJob = typeof printJobs.$inferInsert;


