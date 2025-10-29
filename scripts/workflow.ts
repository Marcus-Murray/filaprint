#!/usr/bin/env node

/**
 * FilaPrint Development Workflow Scripts
 *
 * This script provides comprehensive development workflow automation
 * including security scanning, code quality checks, testing, and deployment.
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Configuration
const CONFIG = {
  projectRoot: process.cwd(),
  logFile: 'logs/workflow.log',
  coverageThreshold: 80,
  complexityThreshold: 10,
  maxFileSize: 1000, // KB
  securityScanEnabled: true,
  qualityGatesEnabled: true,
  testTimeout: 30000
};

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

// Logging utility
function log(message: string, color: string = colors.white): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;

  console.log(`${color}${logMessage}${colors.reset}`);

  // Write to log file
  if (!existsSync('logs')) {
    execSync('mkdir -p logs', { stdio: 'inherit' });
  }

  try {
    writeFileSync(CONFIG.logFile, `${logMessage}\n`, { flag: 'a' });
  } catch (error) {
    console.error(`Failed to write to log file: ${error}`);
  }
}

// Error handling
function handleError(error: unknown, context: string): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  log(`❌ Error in ${context}: ${errorMessage}`, colors.red);
  process.exit(1);
}

// Security scanning functions
function runSecurityScan(): boolean {
  log('🛡️ Running security scan...', colors.yellow);

  try {
    // Dependency vulnerability scan
    log('Scanning dependencies for vulnerabilities...', colors.blue);
    execSync('npm audit --audit-level=moderate', { stdio: 'inherit' });

    // ESLint security rules
    log('Running ESLint security rules...', colors.blue);
    execSync('npx eslint . --ext .ts,.tsx --config .eslintrc.json', { stdio: 'inherit' });

    // TypeScript security checks
    log('Running TypeScript security checks...', colors.blue);
    execSync('npx tsc --noEmit --strict', { stdio: 'inherit' });

    log('✅ Security scan completed successfully', colors.green);
    return true;
  } catch (error) {
    handleError(error, 'security scan');
    return false;
  }
}

// Code quality checks
function runQualityChecks(): boolean {
  log('🔧 Running code quality checks...', colors.yellow);

  try {
    // Prettier formatting check
    log('Checking code formatting...', colors.blue);
    execSync('npx prettier --check .', { stdio: 'inherit' });

    // ESLint code quality rules
    log('Running ESLint code quality rules...', colors.blue);
    execSync('npx eslint . --ext .ts,.tsx --config .eslintrc.json', { stdio: 'inherit' });

    // TypeScript type checking
    log('Running TypeScript type checking...', colors.blue);
    execSync('npx tsc --noEmit', { stdio: 'inherit' });

    // Code complexity analysis
    log('Analyzing code complexity...', colors.blue);
    execSync('npx eslint . --ext .ts,.tsx --rule "complexity: [error, 10]"', { stdio: 'inherit' });

    log('✅ Code quality checks completed successfully', colors.green);
    return true;
  } catch (error) {
    handleError(error, 'code quality checks');
    return false;
  }
}

// Testing functions
function runUnitTests(): boolean {
  log('🧪 Running unit tests...', colors.yellow);

  try {
    execSync(`npx jest --config jest.config.js --coverage --coverageThreshold.global.lines=${CONFIG.coverageThreshold}`, {
      stdio: 'inherit',
      timeout: CONFIG.testTimeout
    });

    log('✅ Unit tests completed successfully', colors.green);
    return true;
  } catch (error) {
    handleError(error, 'unit tests');
    return false;
  }
}

function runIntegrationTests(): boolean {
  log('🔗 Running integration tests...', colors.yellow);

  try {
    execSync('npx jest --config jest.config.js --testPathPattern=integration', {
      stdio: 'inherit',
      timeout: CONFIG.testTimeout
    });

    log('✅ Integration tests completed successfully', colors.green);
    return true;
  } catch (error) {
    handleError(error, 'integration tests');
    return false;
  }
}

function runE2ETests(): boolean {
  log('🎭 Running E2E tests...', colors.yellow);

  try {
    execSync('npx playwright test', {
      stdio: 'inherit',
      timeout: CONFIG.testTimeout * 2
    });

    log('✅ E2E tests completed successfully', colors.green);
    return true;
  } catch (error) {
    handleError(error, 'E2E tests');
    return false;
  }
}

// Documentation generation
function generateDocumentation(): boolean {
  log('📚 Generating documentation...', colors.yellow);

  try {
    // Generate API documentation
    log('Generating API documentation...', colors.blue);
    execSync('npx swagger-jsdoc -d swagger.config.js -o docs/api/openapi.json', { stdio: 'inherit' });

    // Generate JSDoc documentation
    log('Generating JSDoc documentation...', colors.blue);
    execSync('npx jsdoc -c jsdoc.config.js', { stdio: 'inherit' });

    // Generate README
    log('Updating README...', colors.blue);
    execSync('npx readme-md-generator -y', { stdio: 'inherit' });

    log('✅ Documentation generated successfully', colors.green);
    return true;
  } catch (error) {
    handleError(error, 'documentation generation');
    return false;
  }
}

// Build functions
function buildProject(): boolean {
  log('🏗️ Building project...', colors.yellow);

  try {
    // Clean previous builds
    log('Cleaning previous builds...', colors.blue);
    execSync('rm -rf dist build', { stdio: 'inherit' });

    // Build client
    log('Building client...', colors.blue);
    execSync('npm run build:client', { stdio: 'inherit' });

    // Build server
    log('Building server...', colors.blue);
    execSync('npm run build:server', { stdio: 'inherit' });

    // Build shared
    log('Building shared...', colors.blue);
    execSync('npm run build:shared', { stdio: 'inherit' });

    log('✅ Project built successfully', colors.green);
    return true;
  } catch (error) {
    handleError(error, 'project build');
    return false;
  }
}

// Deployment functions
function deployToStaging(): boolean {
  log('🚀 Deploying to staging...', colors.yellow);

  try {
    // Run pre-deployment checks
    log('Running pre-deployment checks...', colors.blue);
    if (!runSecurityScan() || !runQualityChecks() || !runUnitTests()) {
      throw new Error('Pre-deployment checks failed');
    }

    // Build project
    if (!buildProject()) {
      throw new Error('Build failed');
    }

    // Deploy to staging
    log('Deploying to staging environment...', colors.blue);
    execSync('npm run deploy:staging', { stdio: 'inherit' });

    // Run post-deployment tests
    log('Running post-deployment tests...', colors.blue);
    execSync('npm run test:staging', { stdio: 'inherit' });

    log('✅ Staging deployment completed successfully', colors.green);
    return true;
  } catch (error) {
    handleError(error, 'staging deployment');
    return false;
  }
}

function deployToProduction(): boolean {
  log('🌟 Deploying to production...', colors.yellow);

  try {
    // Run comprehensive pre-deployment checks
    log('Running comprehensive pre-deployment checks...', colors.blue);
    if (!runSecurityScan() || !runQualityChecks() || !runUnitTests() || !runIntegrationTests() || !runE2ETests()) {
      throw new Error('Pre-deployment checks failed');
    }

    // Build project
    if (!buildProject()) {
      throw new Error('Build failed');
    }

    // Deploy to production
    log('Deploying to production environment...', colors.blue);
    execSync('npm run deploy:production', { stdio: 'inherit' });

    // Run post-deployment health checks
    log('Running post-deployment health checks...', colors.blue);
    execSync('npm run health:check', { stdio: 'inherit' });

    log('✅ Production deployment completed successfully', colors.green);
    return true;
  } catch (error) {
    handleError(error, 'production deployment');
    return false;
  }
}

// Main workflow functions
function runDevelopmentWorkflow(): void {
  log('🚀 Starting development workflow...', colors.cyan);

  const startTime = Date.now();

  try {
    // Run all checks
    const securityPassed = CONFIG.securityScanEnabled ? runSecurityScan() : true;
    const qualityPassed = CONFIG.qualityGatesEnabled ? runQualityChecks() : true;
    const testsPassed = runUnitTests();

    if (securityPassed && qualityPassed && testsPassed) {
      const duration = Date.now() - startTime;
      log(`✅ Development workflow completed successfully in ${duration}ms`, colors.green);
    } else {
      throw new Error('One or more workflow steps failed');
    }
  } catch (error) {
    handleError(error, 'development workflow');
  }
}

function runCIPipeline(): void {
  log('🔄 Starting CI pipeline...', colors.cyan);

  const startTime = Date.now();

  try {
    // Run comprehensive checks
    if (!runSecurityScan() || !runQualityChecks() || !runUnitTests() || !runIntegrationTests()) {
      throw new Error('CI pipeline checks failed');
    }

    // Generate documentation
    generateDocumentation();

    // Build project
    if (!buildProject()) {
      throw new Error('Build failed');
    }

    const duration = Date.now() - startTime;
    log(`✅ CI pipeline completed successfully in ${duration}ms`, colors.green);
  } catch (error) {
    handleError(error, 'CI pipeline');
  }
}

function runCDPipeline(): void {
  log('🚀 Starting CD pipeline...', colors.cyan);

  const startTime = Date.now();

  try {
    // Deploy to staging first
    if (!deployToStaging()) {
      throw new Error('Staging deployment failed');
    }

    // Wait for user confirmation for production
    log('Staging deployment successful. Ready for production deployment.', colors.yellow);
    log('Run "npm run deploy:production" to deploy to production.', colors.blue);

    const duration = Date.now() - startTime;
    log(`✅ CD pipeline completed successfully in ${duration}ms`, colors.green);
  } catch (error) {
    handleError(error, 'CD pipeline');
  }
}

// Command line interface
function main(): void {
  const command = process.argv[2];

  switch (command) {
    case 'dev':
      runDevelopmentWorkflow();
      break;
    case 'ci':
      runCIPipeline();
      break;
    case 'cd':
      runCDPipeline();
      break;
    case 'security':
      runSecurityScan();
      break;
    case 'quality':
      runQualityChecks();
      break;
    case 'test':
      runUnitTests();
      break;
    case 'test:integration':
      runIntegrationTests();
      break;
    case 'test:e2e':
      runE2ETests();
      break;
    case 'docs':
      generateDocumentation();
      break;
    case 'build':
      buildProject();
      break;
    case 'deploy:staging':
      deployToStaging();
      break;
    case 'deploy:production':
      deployToProduction();
      break;
    default:
      log('Available commands:', colors.cyan);
      log('  dev                 - Run development workflow', colors.white);
      log('  ci                  - Run CI pipeline', colors.white);
      log('  cd                  - Run CD pipeline', colors.white);
      log('  security            - Run security scan', colors.white);
      log('  quality             - Run code quality checks', colors.white);
      log('  test                - Run unit tests', colors.white);
      log('  test:integration    - Run integration tests', colors.white);
      log('  test:e2e            - Run E2E tests', colors.white);
      log('  docs                - Generate documentation', colors.white);
      log('  build               - Build project', colors.white);
      log('  deploy:staging       - Deploy to staging', colors.white);
      log('  deploy:production    - Deploy to production', colors.white);
      break;
  }
}

// Run main function
if (require.main === module) {
  main();
}

export {
  runSecurityScan,
  runQualityChecks,
  runUnitTests,
  runIntegrationTests,
  runE2ETests,
  generateDocumentation,
  buildProject,
  deployToStaging,
  deployToProduction,
  runDevelopmentWorkflow,
  runCIPipeline,
  runCDPipeline
};


