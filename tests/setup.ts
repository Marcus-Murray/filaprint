/**
 * Jest Test Setup
 *
 * Global test configuration and mocks
 */

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to silence console in tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Set test timeout
jest.setTimeout(10000);

// Mock environment variables
process.env['NODE_ENV'] = 'test';
process.env['JWT_SECRET'] = 'test-jwt-secret-for-testing-only';
process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret-for-testing-only';
process.env['DATABASE_URL'] = ':memory:';
process.env['CLIENT_URL'] = 'http://localhost:5173';

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

