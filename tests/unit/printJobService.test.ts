/**
 * Unit Tests for PrintJobService
 *
 * Tests the print completion handling and filament usage recording logic
 */

import { PrintJobService } from '../../server/services/printJobService.js';
import { PrintJobDB, FilamentUsageDB } from '../../server/database/printJobServices.js';
import { PrinterDB } from '../../server/database/services.js';
import { FilamentDB } from '../../server/database/filamentServices.js';
import { bambuMQTTService } from '../../server/services/mqttService.js';
import type { H2DPrintCompletionData, H2DFilamentConsumption } from '../../server/services/mqttService.js';

// Mock dependencies
jest.mock('../../server/database/printJobServices.js');
jest.mock('../../server/database/services.js');
jest.mock('../../server/database/filamentServices.js');
jest.mock('../../server/services/mqttService.js', () => {
  const EventEmitter = require('events');
  const mockEmitter = new EventEmitter();
  return {
    bambuMQTTService: mockEmitter,
  };
});

describe('PrintJobService', () => {
  let printJobService: PrintJobService;
  let mockMQTTService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Get the mocked MQTT service instance
    const mqttModule = require('../../server/services/mqttService.js');
    mockMQTTService = mqttModule.bambuMQTTService;
    printJobService = new PrintJobService();
  });

  describe('startListening', () => {
    it('should register event listener for print:completed events', () => {
      const mockOn = jest.spyOn(mockMQTTService, 'on');

      printJobService.startListening();

      expect(mockOn).toHaveBeenCalledWith('print:completed', expect.any(Function));
      expect((printJobService as any).isListening).toBe(true);
    });

    it('should not register multiple listeners', () => {
      const mockOn = jest.spyOn(mockMQTTService, 'on');

      printJobService.startListening();
      printJobService.startListening();

      expect(mockOn).toHaveBeenCalledTimes(1);
    });
  });

  describe('stopListening', () => {
    it('should remove event listeners', () => {
      const mockRemoveAllListeners = jest.spyOn(mockMQTTService, 'removeAllListeners');

      printJobService.startListening();
      printJobService.stopListening();

      expect(mockRemoveAllListeners).toHaveBeenCalledWith('print:completed');
      expect((printJobService as any).isListening).toBe(false);
    });

    it('should not throw if not listening', () => {
      expect(() => printJobService.stopListening()).not.toThrow();
    });
  });

  describe('handlePrintCompletion', () => {
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

    const mockCompletionData: H2DPrintCompletionData = {
      status: 'completed',
      filename: 'test_print.gcode',
      jobName: 'Test Print',
      duration: 3600, // 1 hour in seconds
      estimatedFilament: 50,
      actualFilament: [
        {
          slot: 1,
          weight: 25.5,
          length: 5000,
          material: 'PLA',
          color: 'Black',
          diameter: 1.75,
        },
      ],
      layersCompleted: 100,
      totalLayers: 100,
    };

    const mockEvent = {
      printerId: 'TEST123456',
      completionData: mockCompletionData,
      liveData: {
        printerId: 'TEST123456',
        currentPrint: {
          filename: 'test_print.gcode',
          jobName: 'Test Print',
        },
      },
    };

    it('should handle print completion successfully', async () => {
      // Arrange
      (PrinterDB.findBySerialNumber as jest.Mock).mockResolvedValue(mockPrinter);
      (PrintJobDB.create as jest.Mock).mockResolvedValue({
        id: 'job_123',
        ...mockCompletionData,
        userId: mockPrinter.userId,
        printerId: mockPrinter.id,
        status: 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      (FilamentDB.findByAmsSlotAndUser as jest.Mock).mockResolvedValue({
        id: 'filament_123',
        userId: mockPrinter.userId,
        printerId: mockPrinter.id,
        amsSlot: 1,
        name: 'PLA Black',
        material: 'PLA',
        color: 'Black',
        remainingWeight: 1000,
        weight: 1000,
        status: 'active',
      });
      (FilamentDB.update as jest.Mock).mockResolvedValue({
        id: 'filament_123',
        remainingWeight: 974.5,
        status: 'active',
      });
      (FilamentUsageDB.create as jest.Mock).mockResolvedValue({
        id: 'usage_123',
        filamentId: 'filament_123',
        printJobId: 'job_123',
        weightUsed: 25.5,
        usageDate: new Date().toISOString(),
      });

      // Act
      await (printJobService as any).handlePrintCompletion(mockEvent);

      // Assert
      expect(PrinterDB.findBySerialNumber).toHaveBeenCalledWith('TEST123456');
      expect(PrintJobDB.create).toHaveBeenCalled();
      expect(FilamentDB.findByAmsSlotAndUser).toHaveBeenCalledWith(
        mockPrinter.id,
        1,
        mockPrinter.userId
      );
      expect(FilamentUsageDB.create).toHaveBeenCalled();
      expect(FilamentDB.update).toHaveBeenCalled();
    });

    it('should handle missing printer gracefully', async () => {
      // Arrange
      (PrinterDB.findBySerialNumber as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect((printJobService as any).handlePrintCompletion(mockEvent)).resolves.not.toThrow();
      expect(PrintJobDB.create).not.toHaveBeenCalled();
    });

    it('should handle missing filament for slot gracefully', async () => {
      // Arrange
      (PrinterDB.findBySerialNumber as jest.Mock).mockResolvedValue(mockPrinter);
      (PrintJobDB.create as jest.Mock).mockResolvedValue({
        id: 'job_123',
        userId: mockPrinter.userId,
        printerId: mockPrinter.id,
        status: 'completed',
      });
      (FilamentDB.findByAmsSlotAndUser as jest.Mock).mockResolvedValue(null);

      // Act
      await (printJobService as any).handlePrintCompletion(mockEvent);

      // Assert
      expect(PrintJobDB.create).toHaveBeenCalled();
      expect(FilamentDB.findByAmsSlotAndUser).toHaveBeenCalled();
      expect(FilamentUsageDB.create).not.toHaveBeenCalled();
    });

    it('should skip consumption entries without slot or weight', async () => {
      // Arrange
      const incompleteData: H2DPrintCompletionData = {
        ...mockCompletionData,
        actualFilament: [
          { slot: 1, weight: 25.5 }, // Valid
          { slot: undefined, weight: 10 }, // Invalid - no slot
          { slot: 2, weight: undefined }, // Invalid - no weight
          { slot: 3, weight: 0 }, // Invalid - zero weight
        ],
      };

      (PrinterDB.findBySerialNumber as jest.Mock).mockResolvedValue(mockPrinter);
      (PrintJobDB.create as jest.Mock).mockResolvedValue({
        id: 'job_123',
        userId: mockPrinter.userId,
        printerId: mockPrinter.id,
      });
      (FilamentDB.findByAmsSlotAndUser as jest.Mock).mockResolvedValue({
        id: 'filament_123',
        userId: mockPrinter.userId,
        printerId: mockPrinter.id,
        amsSlot: 1,
        remainingWeight: 1000,
        status: 'active',
      });

      // Act
      await (printJobService as any).handlePrintCompletion({
        ...mockEvent,
        completionData: incompleteData,
      });

      // Assert - should only process slot 1
      expect(FilamentDB.findByAmsSlotAndUser).toHaveBeenCalledTimes(1);
      expect(FilamentDB.findByAmsSlotAndUser).toHaveBeenCalledWith(
        mockPrinter.id,
        1,
        mockPrinter.userId
      );
    });

    it('should handle failed prints without filament recording', async () => {
      // Arrange
      const failedData: H2DPrintCompletionData = {
        ...mockCompletionData,
        status: 'failed',
        errorCode: 'E001',
        errorMessage: 'Print failed',
      };

      (PrinterDB.findBySerialNumber as jest.Mock).mockResolvedValue(mockPrinter);
      (PrintJobDB.create as jest.Mock).mockResolvedValue({
        id: 'job_123',
        userId: mockPrinter.userId,
        printerId: mockPrinter.id,
        status: 'failed',
      });

      // Act
      await (printJobService as any).handlePrintCompletion({
        ...mockEvent,
        completionData: failedData,
      });

      // Assert
      expect(PrintJobDB.create).toHaveBeenCalled();
      expect(FilamentDB.findByAmsSlotAndUser).not.toHaveBeenCalled();
      expect(FilamentUsageDB.create).not.toHaveBeenCalled();
    });

    it('should update filament status correctly based on remaining weight', async () => {
      // Arrange
      (PrinterDB.findBySerialNumber as jest.Mock).mockResolvedValue(mockPrinter);
      (PrintJobDB.create as jest.Mock).mockResolvedValue({
        id: 'job_123',
        userId: mockPrinter.userId,
        printerId: mockPrinter.id,
      });

      // Test case 1: Remaining < 100g -> status = 'low'
      (FilamentDB.findByAmsSlotAndUser as jest.Mock).mockResolvedValueOnce({
        id: 'filament_123',
        userId: mockPrinter.userId,
        printerId: mockPrinter.id,
        amsSlot: 1,
        remainingWeight: 150,
        weight: 1000,
        status: 'active',
      });

      const highUsageData: H2DPrintCompletionData = {
        ...mockCompletionData,
        actualFilament: [{ slot: 1, weight: 60 }], // Would bring to 90g remaining
      };

      await (printJobService as any).handlePrintCompletion({
        ...mockEvent,
        completionData: highUsageData,
      });

      expect(FilamentDB.update).toHaveBeenCalledWith(
        'filament_123',
        expect.objectContaining({
          remainingWeight: 90,
          status: 'low',
        })
      );
    });
  });

  describe('getPrintJobsByUser', () => {
    it('should retrieve print jobs for a user', async () => {
      const mockJobs = [
        { id: 'job_1', userId: 'user_123', status: 'completed' },
        { id: 'job_2', userId: 'user_123', status: 'failed' },
      ];

      (PrintJobDB.findByUserId as jest.Mock).mockResolvedValue(mockJobs);

      const result = await printJobService.getPrintJobsByUser('user_123');

      expect(result).toEqual(mockJobs);
      expect(PrintJobDB.findByUserId).toHaveBeenCalledWith('user_123', undefined);
    });

    it('should respect limit parameter', async () => {
      (PrintJobDB.findByUserId as jest.Mock).mockResolvedValue([]);

      await printJobService.getPrintJobsByUser('user_123', 10);

      expect(PrintJobDB.findByUserId).toHaveBeenCalledWith('user_123', 10);
    });
  });

  describe('getPrintJobsByPrinter', () => {
    it('should retrieve print jobs for a printer', async () => {
      const mockJobs = [{ id: 'job_1', printerId: 'printer_123' }];
      (PrintJobDB.findByPrinterId as jest.Mock).mockResolvedValue(mockJobs);

      const result = await printJobService.getPrintJobsByPrinter('printer_123');

      expect(result).toEqual(mockJobs);
      expect(PrintJobDB.findByPrinterId).toHaveBeenCalledWith('printer_123', undefined);
    });
  });
});

