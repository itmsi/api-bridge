/**
 * Test script untuk endpoint POST /api/customers/get
 * 
 * Usage:
 *   node test/customers-get.test.js
 * 
 * Environment variables:
 *   BASE_URL - Base URL API (default: http://localhost:9575)
 *   X_CLIENT_KEY - API Client Key
 *   X_CLIENT_SECRET - API Client Secret
 */

const axios = require('axios');

// Konfigurasi
const BASE_URL = process.env.BASE_URL || 'http://localhost:9575';
const API_KEY = process.env.X_CLIENT_KEY || 'apikey_f488c471cb741aff3e13f51bcb069d1c';
const API_SECRET = process.env.X_CLIENT_SECRET || '2954f3647730280c23715f64c9434e0945385b195c597809e9db5e81e7d62e3f';

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
  console.log('\n' + '='.repeat(50));
  log(title, 'cyan');
  console.log('='.repeat(50) + '\n');
}

function logTest(testName) {
  log(`\nTest: ${testName}`, 'yellow');
  console.log('-'.repeat(50));
}

/**
 * Test endpoint dengan berbagai skenario
 */
async function runTests() {
  logSection('Testing POST /api/customers/get');

  // Test 1: Basic request dengan pagination
  logTest('Basic request dengan pagination');
  try {
    const response = await axios.post(
      `${BASE_URL}/api/customers/get`,
      {
        page: 1,
        limit: 10,
        email: null,
        name: null,
        netsuite_id: null,
      },
      {
        headers: {
          'accept': 'application/json',
          'X-Client-Key': API_KEY,
          'X-Client-Secret': API_SECRET,
          'Content-Type': 'application/json',
        },
      }
    );

    log(`✓ HTTP Status: ${response.status}`, 'green');
    log('✓ Response Headers:', 'green');
    console.log(JSON.stringify(response.headers, null, 2));

    // Check sync headers
    if (response.headers['x-sync-triggered']) {
      log(`✓ Sync Triggered: ${response.headers['x-sync-triggered']}`, 'green');
      log(`✓ Job ID: ${response.headers['x-job-id']}`, 'green');
      log(`✓ Sync Reason: ${response.headers['x-sync-reason']}`, 'green');
    } else {
      log('⚠ Sync tidak di-trigger (mungkin data masih fresh atau tidak ada data di NetSuite)', 'yellow');
    }

    log('✓ Response Body:', 'green');
    console.log(JSON.stringify(response.data, null, 2));

    // Analyze response
    if (response.data && response.data.data) {
      const data = response.data.data;
      if (data.items && Array.isArray(data.items)) {
        log(`\n✓ Data ditemukan: ${data.items.length} items`, 'green');
        if (data.pagination) {
          log(`✓ Total: ${data.pagination.total} items`, 'green');
          log(`✓ Page: ${data.pagination.page}/${data.pagination.totalPages}`, 'green');
        }
      } else {
        log('⚠ Data kosong atau format tidak sesuai', 'yellow');
      }
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    if (error.response) {
      log(`✗ Status: ${error.response.status}`, 'red');
      log('✗ Response:', 'red');
      console.log(JSON.stringify(error.response.data, null, 2));
    }
  }

  // Test 2: Request dengan filter email
  logTest('Request dengan filter email');
  try {
    const response = await axios.post(
      `${BASE_URL}/api/customers/get`,
      {
        page: 1,
        limit: 10,
        email: 'test@example.com',
        name: null,
        netsuite_id: null,
      },
      {
        headers: {
          'accept': 'application/json',
          'X-Client-Key': API_KEY,
          'X-Client-Secret': API_SECRET,
          'Content-Type': 'application/json',
        },
      }
    );

    log(`✓ HTTP Status: ${response.status}`, 'green');
    log('✓ Response:', 'green');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    if (error.response) {
      log(`✗ Status: ${error.response.status}`, 'red');
      console.log(JSON.stringify(error.response.data, null, 2));
    }
  }

  // Test 3: Request dengan filter netsuite_id
  logTest('Request dengan filter netsuite_id');
  try {
    const response = await axios.post(
      `${BASE_URL}/api/customers/get`,
      {
        page: 1,
        limit: 10,
        email: null,
        name: null,
        netsuite_id: '123',
      },
      {
        headers: {
          'accept': 'application/json',
          'X-Client-Key': API_KEY,
          'X-Client-Secret': API_SECRET,
          'Content-Type': 'application/json',
        },
      }
    );

    log(`✓ HTTP Status: ${response.status}`, 'green');
    log('✓ Response:', 'green');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    if (error.response) {
      log(`✗ Status: ${error.response.status}`, 'red');
      console.log(JSON.stringify(error.response.data, null, 2));
    }
  }

  logSection('Testing selesai!');
  log('\nCatatan:', 'yellow');
  console.log('- Jika data tidak tampil, cek apakah sync job sudah berjalan');
  console.log('- Cek log aplikasi untuk melihat error atau warning');
  console.log('- Pastikan consumer RabbitMQ sedang berjalan: npm run consumer');
  console.log('- Cek database untuk melihat apakah ada data di tabel customers');
  console.log('- Cek sync_jobs table untuk melihat status sync job');
}

// Run tests
runTests().catch((error) => {
  log(`\n✗ Fatal Error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

