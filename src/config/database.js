/**
 * Database Configuration
 * PostgreSQL connection using Knex.js
 * Support multiple environments: sandbox dan production
 * 
 * Usage:
 * - const db = require('./config/database')
 * - const { pgCore, getDbForEnvironment } = require('./config/database')
 * 
 * Examples:
 * - db('table_name').select('*')  // uses current environment
 * - pgCore('table_name').where({ id: 1 })  // uses current environment
 * - const sandboxDb = getDbForEnvironment('sandbox')
 * - sandboxDb('table_name').select('*')
 */
const knex = require('knex');
const knexfile = require('../knexfile');
const { getCurrentEnvironment } = require('../utils/environment');

// Connection pools untuk setiap environment
const connections = {
  sandbox: null,
  production: null,
  development: null,
  staging: null,
};

/**
 * Initialize database connection untuk environment tertentu
 * @param {string} env - Environment name ('sandbox', 'production', 'development', 'staging')
 * @returns {Knex} Knex instance
 */
const initConnection = (env) => {
  // Map environment names
  let configEnv = env;
  if (env === 'production') {
    configEnv = 'netsuite_production';
  } else if (env === 'sandbox') {
    configEnv = 'sandbox';
  }
  
  const config = knexfile[configEnv];
  if (!config) {
    throw new Error(`Database configuration not found for environment: ${env}`);
  }
  
  if (!connections[env]) {
    connections[env] = knex(config);
  }
  
  return connections[env];
};

/**
 * Get database connection untuk environment tertentu
 * @param {string} env - Environment name (optional, defaults to current environment)
 * @returns {Knex} Knex instance
 */
const getDbForEnvironment = (env = null) => {
  const environment = env || getCurrentEnvironment();
  
  if (!connections[environment]) {
    return initConnection(environment);
  }
  
  return connections[environment];
};

// Initialize default connection berdasarkan current environment
const currentEnv = getCurrentEnvironment();
const pgCore = initConnection(currentEnv);

/**
 * Database function wrapper
 * Uses current environment's database connection
 * @param {string} tableName - Name of the table
 * @returns {Knex.QueryBuilder} Knex query builder instance
 */
const db = (tableName) => {
  const currentEnvironment = getCurrentEnvironment();
  const connection = getDbForEnvironment(currentEnvironment);
  return connection(tableName);
};

// Export db as default function (can be called directly)
// Export pgCore as named export for backward compatibility
// Export getDbForEnvironment untuk akses database berdasarkan environment
module.exports = db;
module.exports.pgCore = pgCore;
module.exports.db = db;
module.exports.getDbForEnvironment = getDbForEnvironment;
module.exports.initConnection = initConnection;
