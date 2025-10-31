/**
 * Environment Variable Validation
 *
 * Ensures all required environment variables are set before server startup.
 * Fails fast if critical variables are missing.
 */

import { createLogger } from './logger.js';

const logger = createLogger('env-validation');

interface EnvConfig {
  required: string[];
  optional: Array<{ key: string; defaultValue: string }>;
}

const envConfig: EnvConfig = {
  required: [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
  ],
  optional: [
    { key: 'PORT', defaultValue: '3000' },
    { key: 'NODE_ENV', defaultValue: 'development' },
    { key: 'CLIENT_URL', defaultValue: 'http://localhost:5173' },
    { key: 'LOG_LEVEL', defaultValue: 'info' },
  ],
};

/**
 * Validate that all required environment variables are set
 * @throws Error if any required variable is missing
 */
export function validateEnvironment(): void {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const key of envConfig.required) {
    const value = process.env[key];
    if (!value || value.trim() === '') {
      missing.push(key);
    } else if (key.includes('SECRET') && value === 'fallback-secret') {
      warnings.push(`${key} is using insecure fallback value`);
    }
  }

  // Set optional defaults
  for (const { key, defaultValue } of envConfig.optional) {
    if (!process.env[key]) {
      process.env[key] = defaultValue;
      logger.info(`Using default value for ${key}: ${defaultValue}`);
    }
  }

  // Fail if required variables are missing
  if (missing.length > 0) {
    const errorMessage = `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please set these variables before starting the server.`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  // Warn about insecure values
  if (warnings.length > 0) {
    for (const warning of warnings) {
      logger.warn(`SECURITY WARNING: ${warning}`);
    }
    throw new Error(
      'Insecure environment variable configuration detected. ' +
      'Please set proper values for all SECRET variables.'
    );
  }

  // Validate secret strength
  const jwtSecret = process.env['JWT_SECRET']!;
  if (jwtSecret.length < 32) {
    logger.warn('JWT_SECRET is shorter than recommended (32 characters)');
  }

  const refreshSecret = process.env['JWT_REFRESH_SECRET']!;
  if (refreshSecret.length < 32) {
    logger.warn('JWT_REFRESH_SECRET is shorter than recommended (32 characters)');
  }

  logger.info('Environment validation passed');
}

/**
 * Get validated environment variable (throws if missing)
 */
export function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

/**
 * Get optional environment variable with default
 */
export function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

