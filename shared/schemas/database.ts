import { sqliteTable, text, integer, real, blob } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Users table with security considerations
export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  passwordHash: text('password_hash').notNull(), // bcrypt hash
  salt: text('salt').notNull(), // Additional salt for extra security
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  isEmailVerified: integer('is_email_verified', { mode: 'boolean' }).notNull().default(false),
  emailVerificationToken: text('email_verification_token'),
  passwordResetToken: text('password_reset_token'),
  passwordResetExpires: text('password_reset_expires'),
  lastLoginAt: text('last_login_at'),
  failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
  lockedUntil: text('locked_until'),
  twoFactorSecret: text('two_factor_secret'), // For future MFA implementation
  twoFactorEnabled: integer('two_factor_enabled', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
});

// User sessions for security tracking
export const userSessions = sqliteTable('user_sessions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(), // JWT token
  refreshToken: text('refresh_token').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  lastUsedAt: text('last_used_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  ipAddress: text('ip_address').notNull(),
  userAgent: text('user_agent').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true)
});

// Printers table
export const printers = sqliteTable('printers', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  model: text('model').notNull(), // H2D, X1C, P1S, A1
  ipAddress: text('ip_address').notNull(),
  accessCode: text('access_code').notNull(), // Encrypted access code
  serialNumber: text('serial_number'),
  description: text('description'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  lastConnectedAt: text('last_connected_at'),
  connectionStatus: text('connection_status').notNull().default('disconnected'), // connected, disconnected, error
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
});

// Live data storage for real-time monitoring
export const liveData = sqliteTable('live_data', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  printerId: text('printer_id').notNull().references(() => printers.id, { onDelete: 'cascade' }),
  data: blob('data').notNull(), // JSON data as blob for performance
  messageType: text('message_type').notNull(), // status, progress, error, complete
  timestamp: text('timestamp').notNull().default(sql`CURRENT_TIMESTAMP`),
  connectionStatus: text('connection_status').notNull().default('disconnected')
});

// AMS2 Pro humidity tracking
export const ams2Humidity = sqliteTable('ams2_humidity', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  printerId: text('printer_id').notNull().references(() => printers.id, { onDelete: 'cascade' }),
  slot1Humidity: real('slot_1_humidity'),
  slot2Humidity: real('slot_2_humidity'),
  slot3Humidity: real('slot_3_humidity'),
  slot4Humidity: real('slot_4_humidity'),
  averageHumidity: real('average_humidity'),
  timestamp: text('timestamp').notNull().default(sql`CURRENT_TIMESTAMP`)
});

// Filament inventory management
export const filaments = sqliteTable('filaments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  brand: text('brand').notNull(),
  material: text('material').notNull(), // PLA, PETG, ABS, TPU, ASA, etc.
  color: text('color').notNull(),
  weight: real('weight').notNull(), // Total weight in grams
  remainingWeight: real('remaining_weight').notNull(), // Remaining weight in grams
  diameter: real('diameter').notNull(), // Filament diameter in mm
  nozzleTemperature: integer('nozzle_temperature').notNull(), // Recommended nozzle temp
  bedTemperature: integer('bed_temperature').notNull(), // Recommended bed temp
  amsSlot: integer('ams_slot'), // AMS slot number (1-4)
  status: text('status').notNull().default('stored'), // active, low, empty, stored
  purchaseDate: text('purchase_date'),
  purchasePrice: real('purchase_price'),
  notes: text('notes'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
});

// Print jobs queue
export const printJobs = sqliteTable('print_jobs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  printerId: text('printer_id').notNull().references(() => printers.id, { onDelete: 'cascade' }),
  filamentId: text('filament_id').notNull().references(() => filaments.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').notNull().default('queued'), // queued, printing, paused, completed, failed, cancelled
  priority: text('priority').notNull().default('normal'), // low, normal, high, urgent
  estimatedTime: integer('estimated_time'), // Estimated print time in seconds
  actualTime: integer('actual_time'), // Actual print time in seconds
  progress: real('progress').notNull().default(0), // Print progress percentage (0-100)
  layerHeight: real('layer_height'),
  infillPercentage: real('infill_percentage'),
  printSpeed: real('print_speed'),
  supportEnabled: integer('support_enabled', { mode: 'boolean' }).default(false),
  raftEnabled: integer('raft_enabled', { mode: 'boolean' }).default(false),
  gcodeFile: text('gcode_file'), // Path to G-code file
  stlFile: text('stl_file'), // Path to STL file
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
});

// Print history for analytics
export const printHistory = sqliteTable('print_history', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  printerId: text('printer_id').notNull().references(() => printers.id, { onDelete: 'cascade' }),
  filamentId: text('filament_id').notNull().references(() => filaments.id, { onDelete: 'cascade' }),
  jobId: text('job_id').references(() => printJobs.id),
  name: text('name').notNull(),
  status: text('status').notNull(), // completed, failed, cancelled
  duration: integer('duration').notNull(), // Print duration in seconds
  filamentUsed: real('filament_used').notNull(), // Filament used in grams
  success: integer('success', { mode: 'boolean' }).notNull(),
  errorMessage: text('error_message'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`)
});

// Security audit logs
export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(), // login, logout, create_printer, delete_filament, etc.
  resource: text('resource').notNull(), // user, printer, filament, job, etc.
  resourceId: text('resource_id'), // ID of the affected resource
  ipAddress: text('ip_address').notNull(),
  userAgent: text('user_agent').notNull(),
  success: integer('success', { mode: 'boolean' }).notNull(),
  details: blob('details'), // JSON details as blob
  timestamp: text('timestamp').notNull().default(sql`CURRENT_TIMESTAMP`)
});

// System settings and configuration
export const systemSettings = sqliteTable('system_settings', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  key: text('key').notNull().unique(),
  value: blob('value').notNull(), // JSON value as blob
  description: text('description'),
  isEncrypted: integer('is_encrypted', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
});

// API rate limiting tracking
export const rateLimits = sqliteTable('rate_limits', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  identifier: text('identifier').notNull(), // IP address or user ID
  endpoint: text('endpoint').notNull(),
  requestCount: integer('request_count').notNull().default(1),
  windowStart: text('window_start').notNull(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`)
});

// Database indexes for performance
export const indexes = {
  // User indexes
  usersEmailIdx: 'idx_users_email',
  usersUsernameIdx: 'idx_users_username',
  usersActiveIdx: 'idx_users_active',

  // Session indexes
  sessionsTokenIdx: 'idx_sessions_token',
  sessionsUserIdIdx: 'idx_sessions_user_id',
  sessionsExpiresIdx: 'idx_sessions_expires',

  // Printer indexes
  printersUserIdIdx: 'idx_printers_user_id',
  printersActiveIdx: 'idx_printers_active',
  printersStatusIdx: 'idx_printers_status',

  // Live data indexes
  liveDataPrinterIdx: 'idx_live_data_printer_id',
  liveDataTimestampIdx: 'idx_live_data_timestamp',

  // Filament indexes
  filamentsUserIdIdx: 'idx_filaments_user_id',
  filamentsStatusIdx: 'idx_filaments_status',
  filamentsAmsSlotIdx: 'idx_filaments_ams_slot',

  // Print job indexes
  printJobsUserIdIdx: 'idx_print_jobs_user_id',
  printJobsPrinterIdx: 'idx_print_jobs_printer_id',
  printJobsStatusIdx: 'idx_print_jobs_status',
  printJobsPriorityIdx: 'idx_print_jobs_priority',

  // Audit log indexes
  auditLogsUserIdIdx: 'idx_audit_logs_user_id',
  auditLogsActionIdx: 'idx_audit_logs_action',
  auditLogsTimestampIdx: 'idx_audit_logs_timestamp',

  // Rate limit indexes
  rateLimitsIdentifierIdx: 'idx_rate_limits_identifier',
  rateLimitsEndpointIdx: 'idx_rate_limits_endpoint'
};

// Export all tables and indexes
export const schema = {
  users,
  userSessions,
  printers,
  liveData,
  ams2Humidity,
  filaments,
  printJobs,
  printHistory,
  auditLogs,
  systemSettings,
  rateLimits,
  indexes
};


