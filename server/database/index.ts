import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { createLogger } from '../utils/logger.js';
import * as schema from './schema.js';
import { runMigrations } from './migrations.js';

const logger = createLogger('database');

// Database configuration
const DATABASE_PATH = process.env['DATABASE_URL'] || './database.db';
const DATABASE_URL = DATABASE_PATH.replace('sqlite:', '');

// Create SQLite connection
const sqlite = new Database(DATABASE_URL);

// Enable WAL mode for better concurrency
sqlite.pragma('journal_mode = WAL');

// Enable foreign keys
sqlite.pragma('foreign_keys = ON');

// Create Drizzle instance
export const db = drizzle(sqlite, { schema });

// Database connection test
export const testConnection = (): boolean => {
  try {
    const result = sqlite.prepare('SELECT 1 as test').get() as { test: number };
    logger.info('Database connection successful', {
      database: DATABASE_URL,
      test: result.test,
    });
    return true;
  } catch (error) {
    logger.error('Database connection failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      database: DATABASE_URL,
    });
    return false;
  }
};

// Initialize database tables
export const initializeDatabase = async (): Promise<void> => {
  try {
    logger.info('Initializing database...');
    await runMigrations();

    // Test connection
    if (testConnection()) {
      logger.info('Database initialization completed successfully');
    } else {
      throw new Error('Database connection test failed');
    }
  } catch (error) {
    logger.error('Database initialization failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
};

// Close database connection
export const closeDatabase = (): void => {
  try {
    sqlite.close();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('SIGINT received, closing database connection');
  closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, closing database connection');
  closeDatabase();
  process.exit(0);
});

export default db;
