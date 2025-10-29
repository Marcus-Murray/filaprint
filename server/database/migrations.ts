import { sql } from 'drizzle-orm';
import { db } from './index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('database-migrations');

export async function runMigrations(): Promise<void> {
  try {
    logger.info('Running database migrations...');

    // Create users table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_login_at TEXT,
        failed_login_attempts INTEGER NOT NULL DEFAULT 0,
        locked_until TEXT
      )
    `);

    // Create printers table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS printers (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        name TEXT NOT NULL,
        model TEXT NOT NULL,
        serial_number TEXT NOT NULL UNIQUE,
        ip_address TEXT NOT NULL,
        access_code TEXT NOT NULL,
        description TEXT,
        mqtt_host TEXT NOT NULL,
        mqtt_port INTEGER NOT NULL DEFAULT 8883,
        mqtt_username TEXT NOT NULL DEFAULT 'bblp',
        mqtt_password TEXT NOT NULL,
        mqtt_keepalive INTEGER NOT NULL DEFAULT 60,
        mqtt_reconnect_period INTEGER NOT NULL DEFAULT 5000,
        mqtt_connect_timeout INTEGER NOT NULL DEFAULT 30000,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure missing MQTT columns exist on older databases
    const printersInfo = (await db.all(
      sql`PRAGMA table_info('printers')`
    )) as Array<{ name: string }>;
    const existingColumns = new Set(printersInfo.map(c => c.name));

    if (!existingColumns.has('mqtt_keepalive')) {
      await db.run(
        sql`ALTER TABLE printers ADD COLUMN mqtt_keepalive INTEGER NOT NULL DEFAULT 60`
      );
    }
    if (!existingColumns.has('mqtt_reconnect_period')) {
      await db.run(
        sql`ALTER TABLE printers ADD COLUMN mqtt_reconnect_period INTEGER NOT NULL DEFAULT 5000`
      );
    }
    if (!existingColumns.has('mqtt_connect_timeout')) {
      await db.run(
        sql`ALTER TABLE printers ADD COLUMN mqtt_connect_timeout INTEGER NOT NULL DEFAULT 30000`
      );
    }

    // Create live_data table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS live_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        printer_id TEXT NOT NULL REFERENCES printers(id),
        timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        data TEXT NOT NULL
      )
    `);

    // Create filaments table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS filaments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        color TEXT,
        diameter INTEGER NOT NULL,
        weight INTEGER,
        remaining_weight INTEGER,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create print_jobs table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS print_jobs (
        id TEXT PRIMARY KEY,
        printer_id TEXT NOT NULL REFERENCES printers(id),
        user_id TEXT NOT NULL REFERENCES users(id),
        filament_id TEXT REFERENCES filaments(id),
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'printing', 'paused', 'completed', 'failed')),
        progress INTEGER NOT NULL DEFAULT 0,
        start_time TEXT,
        end_time TEXT,
        duration INTEGER,
        file_url TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create audit_logs table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        user_id TEXT REFERENCES users(id),
        event TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        user_agent TEXT
      )
    `);

    // Create refresh_tokens table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token TEXT NOT NULL UNIQUE,
        user_id TEXT NOT NULL REFERENCES users(id),
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await db.run(
      sql`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`
    );
    await db.run(
      sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`
    );
    await db.run(
      sql`CREATE INDEX IF NOT EXISTS idx_printers_user_id ON printers(user_id)`
    );
    await db.run(
      sql`CREATE INDEX IF NOT EXISTS idx_printers_serial_number ON printers(serial_number)`
    );
    await db.run(
      sql`CREATE INDEX IF NOT EXISTS idx_live_data_printer_id ON live_data(printer_id)`
    );
    await db.run(
      sql`CREATE INDEX IF NOT EXISTS idx_live_data_timestamp ON live_data(timestamp)`
    );
    await db.run(
      sql`CREATE INDEX IF NOT EXISTS idx_filaments_user_id ON filaments(user_id)`
    );
    await db.run(
      sql`CREATE INDEX IF NOT EXISTS idx_print_jobs_printer_id ON print_jobs(printer_id)`
    );
    await db.run(
      sql`CREATE INDEX IF NOT EXISTS idx_print_jobs_user_id ON print_jobs(user_id)`
    );
    await db.run(
      sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)`
    );
    await db.run(
      sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)`
    );
    await db.run(
      sql`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)`
    );
    await db.run(
      sql`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token)`
    );

    logger.info('Database migrations completed successfully');
  } catch (error) {
    logger.error('Failed to run database migrations', { error });
    throw error;
  }
}
