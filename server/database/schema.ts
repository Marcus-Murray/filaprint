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


