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

    // Create manufacturers table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS manufacturers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        country TEXT,
        website TEXT,
        ams_compatible INTEGER NOT NULL DEFAULT 1,
        rfid_enabled INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create filament_products table (catalog)
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS filament_products (
        id TEXT PRIMARY KEY,
        manufacturer_id TEXT NOT NULL REFERENCES manufacturers(id) ON DELETE CASCADE,
        sku TEXT NOT NULL,
        name TEXT NOT NULL,
        material TEXT NOT NULL CHECK (material IN ('PLA', 'PETG', 'ABS', 'TPU', 'ASA', 'PC', 'NYLON', 'WOOD', 'METAL', 'PET', 'PLA+', 'PLA Pro', 'TPU95', 'TPU85', 'PA', 'PAHT', 'CF', 'GF')),
        color TEXT NOT NULL,
        diameter REAL NOT NULL DEFAULT 1.75,
        weight REAL NOT NULL DEFAULT 1000,
        nozzle_temperature_min INTEGER,
        nozzle_temperature_max INTEGER,
        nozzle_temperature_recommended INTEGER,
        bed_temperature_min INTEGER,
        bed_temperature_max INTEGER,
        bed_temperature_recommended INTEGER,
        optimal_humidity_min REAL,
        optimal_humidity_max REAL,
        optimal_humidity_recommended REAL,
        ams_compatible INTEGER NOT NULL DEFAULT 1,
        rfid_enabled INTEGER NOT NULL DEFAULT 0,
        nzd_price REAL,
        currency TEXT NOT NULL DEFAULT 'NZD',
        available INTEGER NOT NULL DEFAULT 1,
        supplier TEXT,
        image_url TEXT,
        description TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add supplier column to existing filament_products table if it doesn't exist
    const productsInfo = await db.all(sql`PRAGMA table_info('filament_products')`) as Array<{ name: string }>;
    const productsColumns = new Set(productsInfo.map(c => c.name));
    if (!productsColumns.has('supplier')) {
      await db.run(sql`ALTER TABLE filament_products ADD COLUMN supplier TEXT`);
    }

    // Check if old filaments table exists and migrate
    const filamentsInfo = await db.all(
      sql`PRAGMA table_info('filaments')`
    ) as Array<{ name: string }>;
    const existingFilamentsColumns = new Set(filamentsInfo.map(c => c.name));

    // Create or migrate filaments table
    const requiredFilamentColumns = [
      'id','user_id','name','material','color','weight','remaining_weight','diameter','status','created_at','updated_at'
    ];
    const isFilamentsHealthy = requiredFilamentColumns.every(c => existingFilamentsColumns.has(c));

    if (existingFilamentsColumns.size === 0 || !isFilamentsHealthy) {
      if (existingFilamentsColumns.size > 0 && !isFilamentsHealthy) {
        logger.info('Recreating filaments table with full schema (detected legacy schema)');
        await db.run(sql`DROP TABLE IF EXISTS filaments`);
      }
      // Table does not exist yet – create with enhanced schema
      await db.run(sql`
        CREATE TABLE IF NOT EXISTS filaments (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          product_id TEXT REFERENCES filament_products(id) ON DELETE SET NULL,
          manufacturer_id TEXT REFERENCES manufacturers(id) ON DELETE SET NULL,
          rfid_uid TEXT,
          rfid_tag_type TEXT,
          rfid_tray_id_name TEXT,
          rfid_tray_info_cols TEXT,
          rfid_tray_info_name TEXT,
          name TEXT NOT NULL,
          brand TEXT,
          material TEXT NOT NULL CHECK (material IN ('PLA', 'PETG', 'ABS', 'TPU', 'ASA', 'PC', 'NYLON', 'WOOD', 'METAL', 'PET', 'PLA+', 'PLA Pro', 'TPU95', 'TPU85', 'PA', 'PAHT', 'CF', 'GF')),
          color TEXT NOT NULL,
          diameter REAL NOT NULL DEFAULT 1.75,
          weight REAL NOT NULL,
          remaining_weight REAL NOT NULL,
          nozzle_temperature INTEGER,
          bed_temperature INTEGER,
          optimal_humidity REAL,
          ams_slot INTEGER CHECK (ams_slot IN (1, 2, 3, 4)),
          printer_id TEXT REFERENCES printers(id) ON DELETE SET NULL,
          ams_serial_number TEXT,
          status TEXT NOT NULL DEFAULT 'stored' CHECK (status IN ('active', 'low', 'empty', 'stored')),
          low_threshold REAL NOT NULL DEFAULT 100,
          purchase_date TEXT,
          purchase_price REAL,
          purchase_currency TEXT NOT NULL DEFAULT 'NZD',
          supplier TEXT,
          notes TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } else {
      // Table exists, just ensure new columns exist
      const columnsToAdd = [
        { name: 'product_id', sql: `ALTER TABLE filaments ADD COLUMN product_id TEXT REFERENCES filament_products(id) ON DELETE SET NULL` },
        { name: 'manufacturer_id', sql: `ALTER TABLE filaments ADD COLUMN manufacturer_id TEXT REFERENCES manufacturers(id) ON DELETE SET NULL` },
        { name: 'rfid_uid', sql: `ALTER TABLE filaments ADD COLUMN rfid_uid TEXT` },
        { name: 'rfid_tag_type', sql: `ALTER TABLE filaments ADD COLUMN rfid_tag_type TEXT` },
        { name: 'rfid_tray_id_name', sql: `ALTER TABLE filaments ADD COLUMN rfid_tray_id_name TEXT` },
        { name: 'rfid_tray_info_cols', sql: `ALTER TABLE filaments ADD COLUMN rfid_tray_info_cols TEXT` },
        { name: 'rfid_tray_info_name', sql: `ALTER TABLE filaments ADD COLUMN rfid_tray_info_name TEXT` },
        { name: 'brand', sql: `ALTER TABLE filaments ADD COLUMN brand TEXT` },
        { name: 'diameter', sql: `ALTER TABLE filaments ADD COLUMN diameter REAL NOT NULL DEFAULT 1.75` },
        { name: 'remaining_weight', sql: `ALTER TABLE filaments ADD COLUMN remaining_weight REAL NOT NULL DEFAULT 0` },
        { name: 'nozzle_temperature', sql: `ALTER TABLE filaments ADD COLUMN nozzle_temperature INTEGER` },
        { name: 'bed_temperature', sql: `ALTER TABLE filaments ADD COLUMN bed_temperature INTEGER` },
        { name: 'optimal_humidity', sql: `ALTER TABLE filaments ADD COLUMN optimal_humidity REAL` },
        { name: 'ams_slot', sql: `ALTER TABLE filaments ADD COLUMN ams_slot INTEGER` },
        { name: 'printer_id', sql: `ALTER TABLE filaments ADD COLUMN printer_id TEXT REFERENCES printers(id) ON DELETE SET NULL` },
        { name: 'ams_serial_number', sql: `ALTER TABLE filaments ADD COLUMN ams_serial_number TEXT` },
        { name: 'status', sql: `ALTER TABLE filaments ADD COLUMN status TEXT NOT NULL DEFAULT 'stored' CHECK (status IN ('active', 'low', 'empty', 'stored'))` },
        { name: 'low_threshold', sql: `ALTER TABLE filaments ADD COLUMN low_threshold REAL NOT NULL DEFAULT 100` },
        { name: 'purchase_date', sql: `ALTER TABLE filaments ADD COLUMN purchase_date TEXT` },
        { name: 'purchase_price', sql: `ALTER TABLE filaments ADD COLUMN purchase_price REAL` },
        { name: 'purchase_currency', sql: `ALTER TABLE filaments ADD COLUMN purchase_currency TEXT NOT NULL DEFAULT 'NZD'` },
        { name: 'supplier', sql: `ALTER TABLE filaments ADD COLUMN supplier TEXT` },
        { name: 'notes', sql: `ALTER TABLE filaments ADD COLUMN notes TEXT` },
        { name: 'created_at', sql: `ALTER TABLE filaments ADD COLUMN created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP` },
        { name: 'updated_at', sql: `ALTER TABLE filaments ADD COLUMN updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP` },
      ];

      for (const column of columnsToAdd) {
        if (!existingFilamentsColumns.has(column.name)) {
          await db.run(sql.raw(column.sql));
        }
      }
    }

    // Create filament_usage table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS filament_usage (
        id TEXT PRIMARY KEY,
        filament_id TEXT NOT NULL REFERENCES filaments(id) ON DELETE CASCADE,
        print_job_id TEXT REFERENCES print_jobs(id) ON DELETE SET NULL,
        weight_used REAL NOT NULL,
        usage_date TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create print_jobs table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS print_jobs (
        id TEXT PRIMARY KEY,
        printer_id TEXT NOT NULL REFERENCES printers(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'printing', 'paused', 'completed', 'failed', 'cancelled')),
        progress INTEGER NOT NULL DEFAULT 0,
        start_time TEXT,
        end_time TEXT,
        duration INTEGER,
        file_url TEXT,
        estimated_time INTEGER,
        estimated_filament REAL,
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

    // Only create filament indexes if the columns exist
    const filamentsInfoForIndexes = await db.all(
      sql`PRAGMA table_info('filaments')`
    ) as Array<{ name: string }>;
    const filamentColumns = new Set(filamentsInfoForIndexes.map(c => c.name));

    if (filamentColumns.has('product_id')) {
      await db.run(
        sql`CREATE INDEX IF NOT EXISTS idx_filaments_product_id ON filaments(product_id)`
      );
    }
    if (filamentColumns.has('printer_id')) {
      await db.run(
        sql`CREATE INDEX IF NOT EXISTS idx_filaments_printer_id ON filaments(printer_id)`
      );
    }
    if (filamentColumns.has('status')) {
      await db.run(
        sql`CREATE INDEX IF NOT EXISTS idx_filaments_status ON filaments(status)`
      );
    }
    await db.run(
      sql`CREATE INDEX IF NOT EXISTS idx_manufacturers_name ON manufacturers(name)`
    );
    await db.run(
      sql`CREATE INDEX IF NOT EXISTS idx_filament_products_manufacturer_id ON filament_products(manufacturer_id)`
    );
    await db.run(
      sql`CREATE INDEX IF NOT EXISTS idx_filament_products_material ON filament_products(material)`
    );
    await db.run(
      sql`CREATE INDEX IF NOT EXISTS idx_filament_usage_filament_id ON filament_usage(filament_id)`
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
