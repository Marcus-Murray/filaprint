/**
 * Encryption utility for sensitive data
 * Uses AES-256-GCM for encryption at rest
 */

import crypto from 'crypto';
import { createLogger } from './logger.js';

const logger = createLogger('encryption');
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Get encryption key from environment or generate a master key
 * In production, this should be stored in a secure key management service
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env['ENCRYPTION_KEY'];

  if (!envKey) {
    logger.warn('ENCRYPTION_KEY not set - using default (INSECURE for production)');
    // Generate deterministic key from a constant (INSECURE - only for development)
    return crypto
      .createHash('sha256')
      .update('FilaPrint-Default-Key-Change-In-Production')
      .digest();
  }

  // Key should be 32 bytes (256 bits) - hash if longer or pad if shorter
  const keyBuffer = Buffer.from(envKey, 'utf-8');
  if (keyBuffer.length === KEY_LENGTH) {
    return keyBuffer;
  }

  return crypto.createHash('sha256').update(keyBuffer).digest();
}

/**
 * Encrypt sensitive data
 */
export function encrypt(text: string): string {
  if (!text) {
    return text;
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();

    // Return format: iv:tag:encrypted
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
  } catch (error) {
    logger.error('Encryption failed', { error });
    throw new Error('Failed to encrypt sensitive data');
  }
}

/**
 * Decrypt sensitive data
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) {
    return encryptedData;
  }

  // Check if data is already encrypted (has the format iv:tag:encrypted)
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    // Assume data is not encrypted (for backwards compatibility during migration)
    logger.warn('Decrypting unencrypted data - this should be migrated');
    return encryptedData;
  }

  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    logger.error('Decryption failed', { error });
    throw new Error('Failed to decrypt sensitive data');
  }
}

/**
 * Check if data is encrypted
 */
export function isEncrypted(data: string): boolean {
  return data.split(':').length === 3;
}


