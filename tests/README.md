# Testing Guide

## Overview

This directory contains comprehensive tests for the FilaPrint printer-filament integration system.

## Test Structure

```
tests/
├── setup.ts                 # Jest global setup
├── unit/                    # Unit tests (isolated components)
│   └── printJobService.test.ts
├── integration/             # Integration tests (component interactions)
│   └── mqttPrintCompletion.test.ts
└── e2e/                     # End-to-end tests (full flows)
```

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### With Coverage
```bash
npm run test:coverage
```

### Watch Mode
```bash
npm run test:watch
```

### CI Mode
```bash
npm run test:ci
```

## Manual Testing

### Simulate Print Completion
```bash
npm run test:print-completion
```

This script simulates a print completion event without requiring an actual print. Useful for testing the full flow.

**Prerequisites:**
- Server must be running
- Printer must exist in database
- Filament assigned to AMS slot 1

## Test Coverage

Target: **80%+ coverage**

Current coverage areas:
- ✅ PrintJobService methods
- ✅ Filament matching logic
- ✅ Event handling
- ✅ Edge cases
- ✅ Error handling

## Writing Tests

### Unit Test Template
```typescript
describe('FeatureName', () => {
  beforeEach(() => {
    // Setup
  });

  it('should do something', () => {
    // Arrange
    // Act
    // Assert
  });
});
```

### Integration Test Template
```typescript
describe('Feature Integration', () => {
  it('should handle full flow', async () => {
    // Setup dependencies
    // Execute flow
    // Verify results
  });
});
```

## Mocking

**When to Mock:**
- External dependencies (MQTT, database)
- Network requests
- File system operations
- Timers

**Don't Mock:**
- Business logic
- Utility functions
- Internal transformations

## Best Practices

1. **AAA Pattern:** Arrange, Act, Assert
2. **Isolation:** Each test should be independent
3. **Clear Names:** Test names should describe what they test
4. **One Assertion:** Focus on one thing per test
5. **Edge Cases:** Test boundaries and error conditions

## Troubleshooting

### Tests Not Running
- Check Jest config paths
- Verify TypeScript compilation
- Ensure test files match pattern: `*.test.ts` or `*.spec.ts`

### Import Errors
- Check module paths in Jest config
- Verify file extensions (.js vs .ts)
- Check tsconfig paths

### Mock Issues
- Ensure mocks are reset in `beforeEach`
- Check mock implementation matches real interface
- Verify mock is called before use

