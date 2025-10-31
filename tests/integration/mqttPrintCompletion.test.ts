/**
 * Integration Tests for MQTT Print Completion Flow
 *
 * Tests the full flow from MQTT event to database records
 */

import { EventEmitter } from 'events';
import { printJobService } from '../../server/services/printJobService.js';

// Mock the MQTT service as EventEmitter
jest.mock('../../server/services/mqttService.js', () => {
  const EventEmitter = require('events');
  const mockEmitter = new EventEmitter();
  return {
    bambuMQTTService: mockEmitter,
  };
});

// Mock database modules
jest.mock('../../server/database/printJobServices.js', () => ({
  PrintJobDB: {
    create: jest.fn(),
  },
  FilamentUsageDB: {
    create: jest.fn(),
  },
}));

jest.mock('../../server/database/services.js', () => ({
  PrinterDB: {
    findBySerialNumber: jest.fn(),
  },
}));

jest.mock('../../server/database/filamentServices.js', () => ({
  FilamentDB: {
    findByAmsSlotAndUser: jest.fn(),
    update: jest.fn(),
  },
}));

// Import after mocking
const { PrintJobDB, FilamentUsageDB } = require('../../server/database/printJobServices.js');
const { PrinterDB } = require('../../server/database/services.js');
const { FilamentDB } = require('../../server/database/filamentServices.js');

describe('MQTT Print Completion Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the service instance
    (printJobService as any).isListening = false;
    printJobService.startListening();
  });

  afterEach(() => {
    printJobService.stopListening();
    jest.clearAllMocks();
  });

  it('should process print completion event end-to-end', async () => {
    // Arrange
    const mockPrinter = {
      id: 'printer_123',
      userId: 'user_456',
      serialNumber: 'TEST123456',
      name: 'Test Printer',
      model: 'Bambu Labs H2D',
      ipAddress: '192.168.1.100',
      accessCode: 'test_code',
      description: null,
      mqttHost: 'test.mqtt.host',
      mqttPort: 8883,
      mqttUsername: 'bblp',
      mqttPassword: 'test_password',
      mqttKeepalive: 60,
      mqttReconnectPeriod: 5000,
      mqttConnectTimeout: 30000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const mockFilament = {
      id: 'filament_123',
      userId: 'user_456',
      printerId: 'printer_123',
      amsSlot: 1,
      name: 'PLA Black',
      material: 'PLA',
      color: 'Black',
      remainingWeight: 1000,
      weight: 1000,
      status: 'active',
    };

    PrinterDB.findBySerialNumber.mockResolvedValue(mockPrinter);
    PrintJobDB.create.mockResolvedValue({
      id: 'job_123',
      userId: mockPrinter.userId,
      printerId: mockPrinter.id,
      status: 'completed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    FilamentDB.findByAmsSlotAndUser.mockResolvedValue(mockFilament);
    FilamentDB.update.mockResolvedValue({
      ...mockFilament,
      remainingWeight: 975,
      status: 'active',
    });
    FilamentUsageDB.create.mockResolvedValue({
      id: 'usage_123',
      filamentId: 'filament_123',
      printJobId: 'job_123',
      weightUsed: 25,
      usageDate: new Date().toISOString(),
    });

    // Act - Emit the event
    const event = {
      printerId: 'TEST123456',
      completionData: {
        status: 'completed' as const,
        filename: 'test_print.gcode',
        duration: 3600,
        actualFilament: [
          {
            slot: 1,
            weight: 25,
            material: 'PLA',
            color: 'Black',
          },
        ],
      },
      liveData: {
        printerId: 'TEST123456',
        currentPrint: {
          filename: 'test_print.gcode',
        },
      },
    };

    // Get the mocked MQTT service and emit event
    const { bambuMQTTService } = require('../../server/services/mqttService.js');
    bambuMQTTService.emit('print:completed', event);

    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 200));

    // Assert
    expect(PrinterDB.findBySerialNumber).toHaveBeenCalledWith('TEST123456');
    expect(PrintJobDB.create).toHaveBeenCalled();
    expect(FilamentDB.findByAmsSlotAndUser).toHaveBeenCalledWith(
      'printer_123',
      1,
      'user_456'
    );
    expect(FilamentDB.update).toHaveBeenCalled();
    expect(FilamentUsageDB.create).toHaveBeenCalled();
  });

  it('should handle multiple filaments in one print', async () => {
    // Arrange
    const mockPrinter = {
      id: 'printer_123',
      userId: 'user_456',
      serialNumber: 'TEST123456',
      name: 'Test Printer',
      model: 'Bambu Labs H2D',
      ipAddress: '192.168.1.100',
      accessCode: 'test_code',
      description: null,
      mqttHost: 'test.mqtt.host',
      mqttPort: 8883,
      mqttUsername: 'bblp',
      mqttPassword: 'test_password',
      mqttKeepalive: 60,
      mqttReconnectPeriod: 5000,
      mqttConnectTimeout: 30000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    PrinterDB.findBySerialNumber.mockResolvedValue(mockPrinter);
    PrintJobDB.create.mockResolvedValue({
      id: 'job_123',
      userId: mockPrinter.userId,
      printerId: mockPrinter.id,
    });

    const mockFilaments = [
      {
        id: 'filament_1',
        userId: 'user_456',
        printerId: 'printer_123',
        amsSlot: 1,
        remainingWeight: 1000,
        status: 'active',
      },
      {
        id: 'filament_2',
        userId: 'user_456',
        printerId: 'printer_123',
        amsSlot: 2,
        remainingWeight: 1000,
        status: 'active',
      },
    ];

    FilamentDB.findByAmsSlotAndUser
      .mockResolvedValueOnce(mockFilaments[0])
      .mockResolvedValueOnce(mockFilaments[1]);

    FilamentDB.update
      .mockResolvedValueOnce({ ...mockFilaments[0], remainingWeight: 980 })
      .mockResolvedValueOnce({ ...mockFilaments[1], remainingWeight: 985 });

    // Act
    const event = {
      printerId: 'TEST123456',
      completionData: {
        status: 'completed' as const,
        filename: 'multi_color_print.gcode',
        actualFilament: [
          { slot: 1, weight: 20, material: 'PLA', color: 'Black' },
          { slot: 2, weight: 15, material: 'PLA', color: 'White' },
        ],
      },
      liveData: {
        printerId: 'TEST123456',
      },
    };

    const { bambuMQTTService } = require('../../server/services/mqttService.js');
    bambuMQTTService.emit('print:completed', event);
    await new Promise(resolve => setTimeout(resolve, 200));

    // Assert - Both filaments should be processed
    expect(FilamentDB.findByAmsSlotAndUser).toHaveBeenCalledTimes(2);
    expect(FilamentDB.findByAmsSlotAndUser).toHaveBeenCalledWith('printer_123', 1, 'user_456');
    expect(FilamentDB.findByAmsSlotAndUser).toHaveBeenCalledWith('printer_123', 2, 'user_456');
    expect(FilamentDB.update).toHaveBeenCalledTimes(2);
  });
});
