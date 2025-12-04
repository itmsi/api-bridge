/**
 * Migration Script untuk semua environment
 * Menjalankan migrasi ke database sandbox dan production
 */

const knex = require('knex');
const knexfile = require('../knexfile');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.blue}${'='.repeat(50)}${colors.reset}\n${colors.blue}${msg}${colors.reset}\n${colors.blue}${'='.repeat(50)}${colors.reset}\n`),
};

/**
 * Run migrations untuk environment tertentu
 */
const runMigrations = async (env) => {
  const config = knexfile[env];
  
  if (!config) {
    log.error(`Configuration not found for environment: ${env}`);
    return { success: false, env, error: 'Configuration not found' };
  }

  log.info(`Connecting to ${env} database...`);
  log.info(`  Host: ${config.connection.host}:${config.connection.port}`);
  log.info(`  Database: ${config.connection.database}`);
  log.info(`  User: ${config.connection.user}`);

  const db = knex(config);

  try {
    // Test connection
    await db.raw('SELECT 1');
    log.success(`Connected to ${env} database`);

    // Run migrations
    log.info(`Running migrations for ${env}...`);
    const [batchNo, logOutput] = await db.migrate.latest();

    if (logOutput.length === 0) {
      log.info(`No new migrations to run for ${env}`);
    } else {
      log.success(`Migrations completed for ${env} (batch ${batchNo})`);
      logOutput.forEach((migration) => {
        log.info(`  ✓ ${migration}`);
      });
    }

    await db.destroy();
    return { success: true, env, batchNo, migrations: logOutput };
  } catch (error) {
    log.error(`Migration failed for ${env}: ${error.message}`);
    await db.destroy();
    return { success: false, env, error: error.message };
  }
};

/**
 * Main function
 */
const main = async () => {
  log.title('Database Migration - All Environments');

  const args = process.argv.slice(2);
  const environments = [];

  // Parse arguments
  if (args.includes('--sandbox') || args.includes('-s')) {
    environments.push('sandbox');
  }
  if (args.includes('--production') || args.includes('-p')) {
    environments.push('netsuite_production');
  }
  if (args.includes('--all') || args.includes('-a') || environments.length === 0) {
    // Default: run for all environments
    environments.push('sandbox', 'netsuite_production');
  }

  // Remove duplicates
  const uniqueEnvs = [...new Set(environments)];

  log.info(`Environments to migrate: ${uniqueEnvs.join(', ')}\n`);

  const results = [];

  // Run migrations sequentially untuk setiap environment
  for (const env of uniqueEnvs) {
    const result = await runMigrations(env);
    results.push(result);
    console.log(''); // Empty line between environments
  }

  // Summary
  log.title('Migration Summary');
  
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  if (successful.length > 0) {
    log.success(`Successfully migrated ${successful.length} environment(s):`);
    successful.forEach((r) => {
      log.success(`  ✓ ${r.env} (batch ${r.batchNo || 'N/A'})`);
    });
  }

  if (failed.length > 0) {
    log.error(`Failed to migrate ${failed.length} environment(s):`);
    failed.forEach((r) => {
      log.error(`  ✗ ${r.env}: ${r.error}`);
    });
  }

  console.log('');

  // Exit dengan code error jika ada yang gagal
  if (failed.length > 0) {
    process.exit(1);
  }
};

// Run migrations
main().catch((error) => {
  log.error(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});

