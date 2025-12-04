/**
 * Environment Utility
 * Menentukan environment (sandbox/production) berdasarkan port
 */

const { AsyncLocalStorage } = require('async_hooks');

// AsyncLocalStorage untuk menyimpan request context
const environmentContext = new AsyncLocalStorage();

const SANDBOX_PORT = parseInt(process.env.APP_PORT_SANDBOX || '3000', 10);
const PRODUCTION_PORT = parseInt(process.env.APP_PORT_PRODUCTION || '3001', 10);

/**
 * Get environment type berdasarkan port
 * @param {number} port - Port number
 * @returns {string} 'sandbox' atau 'production'
 */
const getEnvironmentByPort = (port) => {
  const portNum = typeof port === 'string' ? parseInt(port, 10) : port;
  
  if (portNum === SANDBOX_PORT) {
    return 'sandbox';
  } else if (portNum === PRODUCTION_PORT) {
    return 'production';
  }
  
  // Default fallback
  return process.env.NODE_ENV === 'production' ? 'production' : 'sandbox';
};

/**
 * Get current environment dari process atau request context
 * @returns {string} 'sandbox' atau 'production'
 */
const getCurrentEnvironment = () => {
  // Cek dari AsyncLocalStorage (request context) terlebih dahulu
  const context = environmentContext.getStore();
  if (context && context.environment) {
    return context.environment;
  }
  
  // Fallback ke environment variable jika ada
  if (process.env.APP_ENVIRONMENT) {
    return process.env.APP_ENVIRONMENT;
  }
  
  // Fallback ke port yang digunakan
  const currentPort = parseInt(process.env.APP_PORT || process.env.PORT || '3000', 10);
  return getEnvironmentByPort(currentPort);
};

/**
 * Check apakah environment adalah sandbox
 * @param {string} env - Environment type (optional)
 * @returns {boolean}
 */
const isSandbox = (env = null) => {
  const environment = env || getCurrentEnvironment();
  return environment === 'sandbox';
};

/**
 * Check apakah environment adalah production
 * @param {string} env - Environment type (optional)
 * @returns {boolean}
 */
const isProduction = (env = null) => {
  const environment = env || getCurrentEnvironment();
  return environment === 'production';
};

/**
 * Get port untuk environment tertentu
 * @param {string} env - 'sandbox' atau 'production'
 * @returns {number}
 */
const getPortForEnvironment = (env) => {
  if (env === 'sandbox') {
    return SANDBOX_PORT;
  } else if (env === 'production') {
    return PRODUCTION_PORT;
  }
  return SANDBOX_PORT; // default
};

/**
 * Run function dengan environment context
 * @param {string} environment - Environment name
 * @param {Function} fn - Function to run
 * @returns {*} Result of function
 */
const runWithEnvironment = (environment, fn) => {
  return environmentContext.run({ environment }, fn);
};

module.exports = {
  getEnvironmentByPort,
  getCurrentEnvironment,
  isSandbox,
  isProduction,
  getPortForEnvironment,
  runWithEnvironment,
  environmentContext,
  SANDBOX_PORT,
  PRODUCTION_PORT,
};

