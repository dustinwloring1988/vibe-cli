#!/usr/bin/env node

/**
 * Test script for log functionality
 */

import { logger } from '../logging';

/**
 * Run log tests
 */
async function runTests(): Promise<void> {
  console.log('Testing logging functionality...');

  // Test basic logging
  logger.debug('This is a debug message');
  logger.info('This is an info message');
  logger.warn('This is a warning message', { context: 'test-context' });
  logger.error('This is an error message', { error: 'test-error' });

  // Test tool execution logging
  for (let i = 0; i < 100; i++) {
    // Simulate tool executions to test log rotation
    const success = i % 10 !== 0; // Make every 10th call fail for testing
    const result = {
      success,
      ...(success ? {} : { error: `Test error #${i}` }),
    };

    logger.logToolExecution(
      `testTool${i % 5}`,
      { testArg: i, testBool: i % 2 === 0 },
      result,
      i * 10
    );

    // Small delay to see the logging in action
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  console.log('Log tests completed. Check the logs directory for results.');
}

// Run the tests
runTests().catch(error => {
  console.error('Error running log tests:', error);
  process.exit(1);
});
