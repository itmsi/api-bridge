/**
 * Debug script untuk troubleshooting masalah sync customer
 * 
 * Script ini akan membantu mendiagnosis kenapa data tidak sync dari NetSuite
 * 
 * Usage:
 *   node test/debug-sync-issue.js
 */

require('dotenv').config();
const db = require('../src/config/database');
const { getNetSuiteCustomerService } = require('../src/services/netsuite/customer-service');
const repository = require('../src/modules/customer/postgre_repository');
const syncRepository = require('../src/modules/sync/postgre_repository');
const { checkAndTriggerIncrementalSync } = require('../src/utils/incremental-sync');
const { Logger } = require('../src/utils/logger');

// Colors untuk console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(70));
  log(title, 'cyan');
  console.log('='.repeat(70) + '\n');
}

async function checkDatabase() {
  logSection('1. Checking Database');

  try {
    // Check customers table
    const customerCount = await db('customers').count('id as count').first();
    log(`✓ Total customers di database: ${customerCount.count}`, 'green');

    // Check max last modified
    const maxLastModified = await repository.getMaxLastModified();
    log(`✓ Max last_modified_netsuite: ${maxLastModified || 'Tidak ada data'}`, 'green');

    // Check sync tracker
    const syncTracker = await syncRepository.getSyncTracker('customer');
    if (syncTracker) {
      log(`✓ Last sync at: ${syncTracker.last_sync_at}`, 'green');
      log(`✓ Last synced batch max: ${syncTracker.last_synced_batch_max || 'N/A'}`, 'green');
      log(`✓ Status: ${syncTracker.status}`, 'green');
    } else {
      log('⚠ Sync tracker tidak ditemukan (belum pernah sync)', 'yellow');
    }

    // Check sync jobs
    const recentJobs = await db('sync_jobs')
      .where({ module: 'customer' })
      .orderBy('created_at', 'desc')
      .limit(5);

    log(`✓ Recent sync jobs: ${recentJobs.length}`, 'green');
    if (recentJobs.length > 0) {
      console.log('\nRecent jobs:');
      recentJobs.forEach((job, index) => {
        log(`  ${index + 1}. Job ID: ${job.job_id}`, 'blue');
        log(`     Status: ${job.status}`, 'blue');
        log(`     Created: ${job.created_at}`, 'blue');
        log(`     Attempts: ${job.attempts}`, 'blue');
        if (job.error_message) {
          log(`     Error: ${job.error_message}`, 'red');
        }
      });
    }
  } catch (error) {
    log(`✗ Error checking database: ${error.message}`, 'red');
    console.error(error);
  }
}

async function checkNetSuiteConnection() {
  logSection('2. Checking NetSuite Connection');

  try {
    const netSuiteService = getNetSuiteCustomerService();
    
    // Test connection dengan fetch page pertama
    log('Testing NetSuite connection...', 'yellow');
    const response = await netSuiteService.getCustomersPage({
      pageIndex: 0,
      pageSize: 10,
    });

    log(`✓ NetSuite connection berhasil`, 'green');
    log(`✓ Total items: ${response.items ? response.items.length : 0}`, 'green');
    log(`✓ Has more: ${response.hasMore || false}`, 'green');
    log(`✓ Total results: ${response.totalResults || 0}`, 'green');

    if (response.items && response.items.length > 0) {
      log('\n✓ Sample data dari NetSuite:', 'green');
      console.log(JSON.stringify(response.items[0], null, 2));
    } else {
      log('⚠ Tidak ada data di NetSuite atau format response tidak sesuai', 'yellow');
    }
  } catch (error) {
    log(`✗ Error connecting to NetSuite: ${error.message}`, 'red');
    console.error(error);
    
    if (error.message.includes('OAuth')) {
      log('\n⚠ Kemungkinan masalah:', 'yellow');
      log('  - OAuth credentials tidak valid', 'yellow');
      log('  - Cek environment variables: NETSUITE_CONSUMER_KEY, NETSUITE_CONSUMER_SECRET, NETSUITE_TOKEN, NETSUITE_TOKEN_SECRET', 'yellow');
    }
    
    if (error.message.includes('script') || error.message.includes('deploy')) {
      log('\n⚠ Kemungkinan masalah:', 'yellow');
      log('  - Script ID atau Deployment ID tidak valid', 'yellow');
      log('  - Cek database table netsuite_scripts untuk konfigurasi script', 'yellow');
    }
  }
}

async function checkIncrementalSync() {
  logSection('3. Checking Incremental Sync Logic');

  try {
    const netSuiteService = getNetSuiteCustomerService();
    
    log('Running incremental sync check...', 'yellow');
    const syncResult = await checkAndTriggerIncrementalSync({
      module: 'customer',
      netSuiteService: netSuiteService,
      repository: repository,
      syncRepository: syncRepository,
      maxStalenessHours: 12,
      pageSize: 500,
    });

    log(`✓ Should sync: ${syncResult.shouldSync}`, syncResult.shouldSync ? 'yellow' : 'green');
    log(`✓ Sync triggered: ${syncResult.syncTriggered}`, syncResult.syncTriggered ? 'green' : 'yellow');
    
    if (syncResult.jobId) {
      log(`✓ Job ID: ${syncResult.jobId}`, 'green');
    }
    
    log(`✓ Reason: ${syncResult.reason}`, 'blue');
    log(`✓ NetSuite max date: ${syncResult.netsuiteMaxDate || 'N/A'}`, 'blue');
    log(`✓ DB max date: ${syncResult.dbMaxDate || 'N/A'}`, 'blue');
    log(`✓ Last sync at: ${syncResult.lastSyncAt || 'N/A'}`, 'blue');

    if (!syncResult.syncTriggered && syncResult.shouldSync) {
      log('\n⚠ Sync seharusnya di-trigger tapi tidak terjadi!', 'red');
      log('  Kemungkinan masalah:', 'yellow');
      log('  - RabbitMQ tidak berjalan', 'yellow');
      log('  - Error saat publish sync job', 'yellow');
      log('  - Cek log aplikasi untuk detail error', 'yellow');
    }
  } catch (error) {
    log(`✗ Error checking incremental sync: ${error.message}`, 'red');
    console.error(error);
  }
}

async function checkRabbitMQ() {
  logSection('4. Checking RabbitMQ Configuration');

  try {
    const { RABBITMQ_HOST, RABBITMQ_PORT, RABBITMQ_USER, RABBITMQ_PASSWORD, RABBITMQ_VHOST } = process.env;
    
    log('RabbitMQ Configuration:', 'yellow');
    log(`  Host: ${RABBITMQ_HOST || 'N/A'}`, 'blue');
    log(`  Port: ${RABBITMQ_PORT || 'N/A'}`, 'blue');
    log(`  User: ${RABBITMQ_USER || 'N/A'}`, 'blue');
    log(`  VHost: ${RABBITMQ_VHOST || 'N/A'}`, 'blue');
    log(`  Password: ${RABBITMQ_PASSWORD ? '***' : 'N/A'}`, 'blue');

    log('\n⚠ Pastikan:', 'yellow');
    log('  - RabbitMQ server sedang berjalan', 'yellow');
    log('  - Consumer sedang berjalan: npm run consumer', 'yellow');
    log('  - Queue "sync_jobs" sudah dibuat', 'yellow');
  } catch (error) {
    log(`✗ Error checking RabbitMQ: ${error.message}`, 'red');
  }
}

async function checkNetSuiteScriptConfig() {
  logSection('5. Checking NetSuite Script Configuration');

  try {
    const netsuiteScriptsRepo = require('../src/modules/netsuite_scripts');
    
    const configs = await db('netsuite_scripts')
      .where({ module: 'customer' })
      .select('*');

    if (configs.length > 0) {
      log(`✓ Found ${configs.length} script configuration(s) for customer module:`, 'green');
      configs.forEach((config) => {
        console.log(`\n  Operation: ${config.operation}`);
        console.log(`  Script ID: ${config.script_id}`);
        console.log(`  Deployment ID: ${config.deployment_id}`);
        console.log(`  Active: ${config.is_active}`);
      });
    } else {
      log('⚠ Tidak ada script configuration untuk customer module', 'yellow');
      log('  Menggunakan default script ID dari environment variable', 'yellow');
    }
  } catch (error) {
    log(`✗ Error checking script config: ${error.message}`, 'red');
  }
}

async function runDiagnostics() {
  logSection('NetSuite Sync Diagnostics Tool');
  log('Mendiagnosis masalah sync customer dari NetSuite...\n', 'yellow');

  await checkDatabase();
  await checkNetSuiteConnection();
  await checkNetSuiteScriptConfig();
  await checkIncrementalSync();
  await checkRabbitMQ();

  logSection('Diagnostics Complete');
  log('\nRekomendasi:', 'yellow');
  log('1. Jika NetSuite connection gagal:', 'yellow');
  log('   - Cek OAuth credentials di environment variables', 'yellow');
  log('   - Cek script ID dan deployment ID di database', 'yellow');
  log('   - Test koneksi NetSuite secara manual dengan curl', 'yellow');
  
  log('\n2. Jika sync tidak di-trigger:', 'yellow');
  log('   - Pastikan data di NetSuite lebih baru dari data di DB', 'yellow');
  log('   - Atau data di DB kosong', 'yellow');
  log('   - Atau last_sync_at lebih dari 12 jam yang lalu', 'yellow');
  
  log('\n3. Jika sync di-trigger tapi data tidak masuk:', 'yellow');
  log('   - Pastikan consumer RabbitMQ sedang berjalan: npm run consumer', 'yellow');
  log('   - Cek log consumer untuk melihat error', 'yellow');
  log('   - Cek sync_jobs table untuk melihat status job', 'yellow');
  log('   - Cek log aplikasi di folder logs/', 'yellow');
  
  log('\n4. Untuk test manual sync:', 'yellow');
  log('   - Gunakan endpoint POST /api/admin/sync/customer untuk trigger manual sync', 'yellow');
  log('   - Atau gunakan endpoint POST /api/customers/search untuk test NetSuite connection', 'yellow');

  // Close database connection
  await db.destroy();
}

// Run diagnostics
runDiagnostics().catch((error) => {
  log(`\n✗ Fatal Error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

