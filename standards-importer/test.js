import dotenv from 'dotenv';
import { testConnection } from './utils/database.js';
import * as logger from './utils/logger.js';

dotenv.config();

async function runTests() {
  logger.section('HomeschoolHQ Standards Importer - Test Suite');

  let passed = 0;
  let failed = 0;

  // Test 1: Environment variables
  logger.info('Test 1: Checking environment variables...');
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    logger.success('✓ Environment variables configured');
    passed++;
  } else {
    logger.error('✗ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    failed++;
  }

  // Test 2: Database connection
  logger.info('Test 2: Testing database connection...');
  try {
    const connected = await testConnection();
    if (connected) {
      logger.success('✓ Database connection successful');
      passed++;
    } else {
      logger.error('✗ Cannot connect to database');
      failed++;
    }
  } catch (error) {
    logger.error('✗ Datection failed:', error.message);
    failed++;
  }

  // Summary
  logger.section('Test Results');
  logger.info(`Passed: ${passed}`);
  if (failed > 0) {
    logger.error(`Failed: ${failed}`);
  } else {
    logger.success(`Failed: ${failed}`);
  }

  if (failed === 0) {
    logger.success('\n🎉 All tests passed! Ready to import standards.');
  } else {
    logger.error('\n❌ Some tests failed. Please fix the issues above.');
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(error => {
  logger.error('Test suite crashed:', error.message);
  process.exit(1);
});
