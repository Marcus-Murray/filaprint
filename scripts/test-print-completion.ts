/**
 * Manual Test Script for Print Completion Simulation
 *
 * Simulates a print completion event for testing purposes
 * Usage: npm run test:print-completion
 *
 * This script allows you to test the print completion handler
 * without waiting for an actual print to complete.
 */

import { printJobService } from '../server/services/printJobService.js';
import { bambuMQTTService } from '../server/services/mqttService.js';
import type { H2DPrintCompletionData } from '../server/services/mqttService.js';

async function simulatePrintCompletion() {
  console.log('🧪 Simulating Print Completion Event...\n');

  // Ensure service is listening
  printJobService.startListening();

  // Simulate a completed print with filament usage
  const mockEvent = {
    printerId: process.env['TEST_PRINTER_SERIAL'] || 'TEST123456',
    completionData: {
      status: 'completed' as const,
      filename: 'test_benchy.gcode',
      jobName: 'Test Benchy',
      duration: 2700, // 45 minutes
      estimatedFilament: 50,
      actualFilament: [
        {
          slot: 1,
          weight: 25.5, // grams used
          length: 5000, // mm used
          material: 'PLA',
          color: 'Black',
          diameter: 1.75,
        },
      ],
      layersCompleted: 100,
      totalLayers: 100,
    } as H2DPrintCompletionData,
    liveData: {
      printerId: process.env['TEST_PRINTER_SERIAL'] || 'TEST123456',
      currentPrint: {
        filename: 'test_benchy.gcode',
        jobName: 'Test Benchy',
      },
    },
  };

  console.log('📤 Emitting print:completed event...');
  console.log('Event data:', JSON.stringify(mockEvent, null, 2));

  // Emit the event
  bambuMQTTService.emit('print:completed', mockEvent);

  console.log('\n✅ Event emitted successfully!');
  console.log('📝 Check the server logs and database for:');
  console.log('   - Print job record created');
  console.log('   - Filament usage recorded');
  console.log('   - Filament inventory updated');
  console.log('\n💡 Make sure you have:');
  console.log('   1. A printer with serial number:', process.env['TEST_PRINTER_SERIAL'] || 'TEST123456');
  console.log('   2. A filament assigned to AMS slot 1 for that printer');
  console.log('   3. The server running and connected to MQTT');
}

// Run if called directly
if (require.main === module) {
  simulatePrintCompletion()
    .then(() => {
      console.log('\n✨ Simulation complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Simulation failed:', error);
      process.exit(1);
    });
}

export { simulatePrintCompletion };

