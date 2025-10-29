/**
 * Migration script to encrypt existing plaintext credentials
 * Run: npx tsx scripts/migrate-encryption.ts
 */

import { db } from '../server/database/index.js';
import { printers } from '../server/database/schema.js';
import { encrypt, isEncrypted } from '../server/utils/encryption.js';
import { eq } from 'drizzle-orm';
import { createLogger } from '../server/utils/logger.js';

const logger = createLogger('encryption-migration');

async function migrateEncryption(): Promise<void> {
  try {
    logger.info('Starting encryption migration...');

    // Get all printers
    const allPrinters = await db.select().from(printers);

    let migrated = 0;
    let alreadyEncrypted = 0;
    let errors = 0;

    for (const printer of allPrinters) {
      try {
        const updates: Partial<typeof printers.$inferInsert> = {};
        let needsUpdate = false;

        // Check and encrypt accessCode
        if (printer.accessCode && !isEncrypted(printer.accessCode)) {
          updates.accessCode = encrypt(printer.accessCode);
          needsUpdate = true;
          logger.info(`Migrating accessCode for printer ${printer.id}`);
        }

        // Check and encrypt mqttPassword
        if (printer.mqttPassword && !isEncrypted(printer.mqttPassword)) {
          updates.mqttPassword = encrypt(printer.mqttPassword);
          needsUpdate = true;
          logger.info(`Migrating mqttPassword for printer ${printer.id}`);
        }

        if (needsUpdate) {
          await db
            .update(printers)
            .set({ ...updates, updatedAt: new Date().toISOString() })
            .where(eq(printers.id, printer.id));
          migrated++;
          logger.info(`Successfully migrated printer ${printer.id}`);
        } else {
          alreadyEncrypted++;
        }
      } catch (error) {
        errors++;
        logger.error(`Failed to migrate printer ${printer.id}`, { error });
      }
    }

    logger.info('Migration completed', {
      total: allPrinters.length,
      migrated,
      alreadyEncrypted,
      errors,
    });

    if (migrated > 0) {
      logger.info(
        `✅ Successfully encrypted credentials for ${migrated} printers`
      );
    }
    if (alreadyEncrypted > 0) {
      logger.info(
        `ℹ️  ${alreadyEncrypted} printers already had encrypted credentials`
      );
    }
    if (errors > 0) {
      logger.warn(`⚠️  ${errors} printers had errors during migration`);
    }
  } catch (error) {
    logger.error('Migration failed', { error });
    process.exit(1);
  }
}

migrateEncryption()
  .then(() => {
    logger.info('Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Migration script failed', { error });
    process.exit(1);
  });


