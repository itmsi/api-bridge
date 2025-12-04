/**
 * NetSuite API Configuration
 * Credentials disimpan di environment variables untuk keamanan
 * Script ID disimpan di database untuk fleksibilitas per module/operation
 * Support multiple environments: sandbox dan production
 */

const { getCache, setCache } = require('../utils/cache');
const netsuiteScriptsRepo = require('../modules/netsuite_scripts/repository');
const { getCurrentEnvironment } = require('../utils/environment');

// NetSuite Configuration untuk Sandbox
// Note: scriptId dan deploymentId sekarang diambil dari database (tabel netsuite_scripts)
// Environment variables NETSUITE_SANDBOX_SCRIPT_ID dan NETSUITE_PRODUCTION_SCRIPT_ID tidak digunakan lagi
const NETSUITE_SANDBOX_CONFIG = {
  baseUrl: process.env.NETSUITE_SANDBOX_BASE_URL || process.env.NETSUITE_BASE_URL || 'https://11970733-sb1.restlets.api.netsuite.com',
  scriptId: '472', // Legacy - tidak digunakan lagi, script_id diambil dari database
  deploymentId: '1', // Legacy - tidak digunakan lagi, deployment_id diambil dari database
  oauth: {
    consumerKey: process.env.NETSUITE_SANDBOX_CONSUMER_KEY || process.env.NETSUITE_CONSUMER_KEY || '',
    consumerSecret: process.env.NETSUITE_SANDBOX_CONSUMER_SECRET || process.env.NETSUITE_CONSUMER_SECRET || '',
    token: process.env.NETSUITE_SANDBOX_TOKEN || process.env.NETSUITE_TOKEN || '',
    tokenSecret: process.env.NETSUITE_SANDBOX_TOKEN_SECRET || process.env.NETSUITE_TOKEN_SECRET || '',
    realm: process.env.NETSUITE_SANDBOX_REALM || process.env.NETSUITE_REALM || '11970733_SB1',
    signatureMethod: 'HMAC-SHA256',
    version: '1.0',
  },
  timeout: parseInt(process.env.NETSUITE_SANDBOX_TIMEOUT || process.env.NETSUITE_TIMEOUT || '30000', 10),
  enabled: process.env.NETSUITE_SANDBOX_ENABLED === 'true' || process.env.NETSUITE_ENABLED === 'true',
};

// NetSuite Configuration untuk Production
// Note: scriptId dan deploymentId sekarang diambil dari database (tabel netsuite_scripts)
// Environment variables NETSUITE_SANDBOX_SCRIPT_ID dan NETSUITE_PRODUCTION_SCRIPT_ID tidak digunakan lagi
const NETSUITE_PRODUCTION_CONFIG = {
  baseUrl: process.env.NETSUITE_PRODUCTION_BASE_URL || 'https://11970733.restlets.api.netsuite.com',
  scriptId: '472', // Legacy - tidak digunakan lagi, script_id diambil dari database
  deploymentId: '1', // Legacy - tidak digunakan lagi, deployment_id diambil dari database
  oauth: {
    consumerKey: process.env.NETSUITE_PRODUCTION_CONSUMER_KEY || '',
    consumerSecret: process.env.NETSUITE_PRODUCTION_CONSUMER_SECRET || '',
    token: process.env.NETSUITE_PRODUCTION_TOKEN || '',
    tokenSecret: process.env.NETSUITE_PRODUCTION_TOKEN_SECRET || '',
    realm: process.env.NETSUITE_PRODUCTION_REALM || '11970733',
    signatureMethod: 'HMAC-SHA256',
    version: '1.0',
  },
  timeout: parseInt(process.env.NETSUITE_PRODUCTION_TIMEOUT || '30000', 10),
  enabled: process.env.NETSUITE_PRODUCTION_ENABLED === 'true',
};

// Legacy config untuk backward compatibility
const NETSUITE_CONFIG = NETSUITE_SANDBOX_CONFIG;

/**
 * Get NetSuite configuration untuk environment tertentu
 * @param {string} env - Environment name ('sandbox' atau 'production')
 * @returns {Object} NetSuite configuration object
 */
const getNetSuiteConfig = (env = null) => {
  const environment = env || getCurrentEnvironment();
  
  if (environment === 'production') {
    return NETSUITE_PRODUCTION_CONFIG;
  } else {
    return NETSUITE_SANDBOX_CONFIG;
  }
};

// Cache TTL untuk script config (5 menit)
const SCRIPT_CONFIG_CACHE_TTL = 5 * 60; // 5 minutes in seconds

/**
 * Validate NetSuite configuration untuk environment tertentu
 * @param {string} env - Environment name (optional)
 * @returns {Object} Validation result
 */
const validateConfig = (env = null) => {
  const config = getNetSuiteConfig(env);
  
  if (!config.enabled) {
    return { valid: false, error: `NetSuite is not enabled for ${env || getCurrentEnvironment()}` };
  }

  if (!config.oauth.consumerKey || !config.oauth.consumerSecret) {
    return { valid: false, error: 'NetSuite OAuth consumer credentials are missing' };
  }

  if (!config.oauth.token || !config.oauth.tokenSecret) {
    return { valid: false, error: 'NetSuite OAuth token credentials are missing' };
  }

  if (!config.oauth.realm) {
    return { valid: false, error: 'NetSuite realm is missing' };
  }

  return { valid: true };
};

/**
 * Get Restlet endpoint URL untuk environment tertentu
 * DEPRECATED: Gunakan getRestletUrlWithConfig() untuk mendapatkan URL dengan script_id dari database
 * @param {string} env - Environment name (optional)
 * @returns {string} Restlet URL
 * @deprecated Use getRestletUrlWithConfig() instead
 */
const getRestletUrl = (env = null) => {
  const config = getNetSuiteConfig(env);
  return `${config.baseUrl}/app/site/hosting/restlet.nl?script=${config.scriptId}&deploy=${config.deploymentId}`;
};

/**
 * Get script configuration from database dengan caching
 * Script ID selalu diambil dari database sesuai environment (sandbox/production)
 * Tidak menggunakan environment variable sebagai fallback
 * @param {string} module - Module name (e.g., 'customer', 'order')
 * @param {string} operation - Operation name (optional, untuk backward compatibility)
 * @param {string} env - Environment name (optional)
 * @returns {Promise<{script_id: string, deployment_id: string}>}
 * @throws {Error} Jika script config tidak ditemukan di database
 */
const getScriptConfig = async (module, operation = null, env = null) => {
  const environment = env || getCurrentEnvironment();
  
  try {
    // Check cache first - cache key berdasarkan module dan environment
    const cacheKey = `netsuite:script:${environment}:${module}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return cached;
    }

    // Get from database - ambil script ID per module (bukan per operation)
    // Note: Database connection akan menggunakan environment yang sesuai (sandbox/production)
    // berdasarkan port yang digunakan (AsyncLocalStorage context)
    const scriptConfig = await netsuiteScriptsRepo.getScriptConfigByModule(module);
    
    if (!scriptConfig) {
      throw new Error(`Script configuration not found in database for module: ${module}, environment: ${environment}. Please add script configuration via API: POST /api/v1/bridge/admin/netsuite-scripts`);
    }

    const result = {
      script_id: scriptConfig.script_id,
      deployment_id: scriptConfig.deployment_id || '1',
    };
    
    // Cache the result
    await setCache(cacheKey, result, SCRIPT_CONFIG_CACHE_TTL);
    
    return result;
  } catch (error) {
    // Log error dan throw - tidak fallback ke env variable
    console.error(`Error getting script config from DB for ${module} (${environment}):`, error.message);
    throw new Error(`Failed to get script configuration for ${module} (${environment}): ${error.message}. Please ensure script configuration exists in database.`);
  }
};

/**
 * Get Restlet endpoint URL dengan script config dari database
 * @param {string} module - Module name
 * @param {string} operation - Operation name (optional, untuk backward compatibility)
 * @param {string} env - Environment name (optional)
 * @returns {Promise<string>}
 */
const getRestletUrlWithConfig = async (module, operation = null, env = null) => {
  const environment = env || getCurrentEnvironment();
  const netsuiteConfig = getNetSuiteConfig(environment);
  const scriptConfig = await getScriptConfig(module, operation, environment);
  return `${netsuiteConfig.baseUrl}/app/site/hosting/restlet.nl?script=${scriptConfig.script_id}&deploy=${scriptConfig.deployment_id}`;
};

module.exports = {
  NETSUITE_CONFIG, // Legacy, backward compatibility
  NETSUITE_SANDBOX_CONFIG,
  NETSUITE_PRODUCTION_CONFIG,
  getNetSuiteConfig,
  validateConfig,
  getRestletUrl,
  getScriptConfig,
  getRestletUrlWithConfig,
};

