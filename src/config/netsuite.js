/**
 * NetSuite API Configuration
 * Credentials disimpan di environment variables untuk keamanan
 * Script ID disimpan di database untuk fleksibilitas per module/operation
 * Support multiple environments: sandbox dan production
 */

const { getCache, setCache } = require('../utils/cache');
const netsuiteScriptsRepo = require('../modules/netsuite_scripts');
const { getCurrentEnvironment } = require('../utils/environment');

// NetSuite Configuration untuk Sandbox
const NETSUITE_SANDBOX_CONFIG = {
  baseUrl: process.env.NETSUITE_SANDBOX_BASE_URL || process.env.NETSUITE_BASE_URL || 'https://11970733-sb1.restlets.api.netsuite.com',
  scriptId: process.env.NETSUITE_SANDBOX_SCRIPT_ID || process.env.NETSUITE_SCRIPT_ID || '472',
  deploymentId: process.env.NETSUITE_SANDBOX_DEPLOYMENT_ID || process.env.NETSUITE_DEPLOYMENT_ID || '1',
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
const NETSUITE_PRODUCTION_CONFIG = {
  baseUrl: process.env.NETSUITE_PRODUCTION_BASE_URL || 'https://11970733.restlets.api.netsuite.com',
  scriptId: process.env.NETSUITE_PRODUCTION_SCRIPT_ID || '472',
  deploymentId: process.env.NETSUITE_PRODUCTION_DEPLOYMENT_ID || '1',
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
 * @param {string} env - Environment name (optional)
 * @returns {string} Restlet URL
 */
const getRestletUrl = (env = null) => {
  const config = getNetSuiteConfig(env);
  return `${config.baseUrl}/app/site/hosting/restlet.nl?script=${config.scriptId}&deploy=${config.deploymentId}`;
};

/**
 * Get script configuration from database dengan caching
 * Sekarang menggunakan script ID per module (bukan per operation)
 * @param {string} module - Module name (e.g., 'customer', 'order')
 * @param {string} operation - Operation name (optional, untuk backward compatibility)
 * @param {string} env - Environment name (optional)
 * @returns {Promise<{script_id: string, deployment_id: string}|null>}
 */
const getScriptConfig = async (module, operation = null, env = null) => {
  const environment = env || getCurrentEnvironment();
  const config = getNetSuiteConfig(environment);
  
  try {
    // Check cache first - cache key berdasarkan module dan environment
    const cacheKey = `netsuite:script:${environment}:${module}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return cached;
    }

    // Get from database - ambil script ID per module (bukan per operation)
    // Note: Database connection akan menggunakan environment yang sesuai
    const scriptConfig = await netsuiteScriptsRepo.getScriptConfigByModule(module);
    
    if (scriptConfig) {
      const result = {
        script_id: scriptConfig.script_id,
        deployment_id: scriptConfig.deployment_id,
      };
      
      // Cache the result
      await setCache(cacheKey, result, SCRIPT_CONFIG_CACHE_TTL);
      
      return result;
    }

    // Fallback to default if not found in DB
    return {
      script_id: config.scriptId,
      deployment_id: config.deploymentId,
    };
  } catch (error) {
    // If database error, fallback to default
    console.warn(`Error getting script config from DB for ${module} (${environment}), using default:`, error.message);
    return {
      script_id: config.scriptId,
      deployment_id: config.deploymentId,
    };
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

