/**
 * NetSuite API Configuration
 * Credentials disimpan di environment variables untuk keamanan
 * Script ID disimpan di database untuk fleksibilitas per module/operation
 */

const { getCache, setCache } = require('../utils/cache');
const netsuiteScriptsRepo = require('../modules/netsuite_scripts');

const NETSUITE_CONFIG = {
  // Base URL dari Postman collection
  baseUrl: process.env.NETSUITE_BASE_URL || 'https://11970733-sb1.restlets.api.netsuite.com',
  
  // Default Restlet script configuration (fallback jika tidak ada di DB)
  scriptId: process.env.NETSUITE_SCRIPT_ID || '472',
  deploymentId: process.env.NETSUITE_DEPLOYMENT_ID || '1',
  
  // OAuth 1.0 Credentials
  oauth: {
    consumerKey: process.env.NETSUITE_CONSUMER_KEY || '',
    consumerSecret: process.env.NETSUITE_CONSUMER_SECRET || '',
    token: process.env.NETSUITE_TOKEN || '',
    tokenSecret: process.env.NETSUITE_TOKEN_SECRET || '',
    realm: process.env.NETSUITE_REALM || '11970733_SB1',
    signatureMethod: 'HMAC-SHA256',
    version: '1.0',
  },
  
  // API Configuration
  timeout: parseInt(process.env.NETSUITE_TIMEOUT || '30000', 10), // 30 seconds default
  
  // Enable/Disable NetSuite integration
  enabled: process.env.NETSUITE_ENABLED === 'true',
};

// Cache TTL untuk script config (5 menit)
const SCRIPT_CONFIG_CACHE_TTL = 5 * 60; // 5 minutes in seconds

/**
 * Validate NetSuite configuration
 */
const validateConfig = () => {
  if (!NETSUITE_CONFIG.enabled) {
    return { valid: false, error: 'NetSuite is not enabled' };
  }

  if (!NETSUITE_CONFIG.oauth.consumerKey || !NETSUITE_CONFIG.oauth.consumerSecret) {
    return { valid: false, error: 'NetSuite OAuth consumer credentials are missing' };
  }

  if (!NETSUITE_CONFIG.oauth.token || !NETSUITE_CONFIG.oauth.tokenSecret) {
    return { valid: false, error: 'NetSuite OAuth token credentials are missing' };
  }

  if (!NETSUITE_CONFIG.oauth.realm) {
    return { valid: false, error: 'NetSuite realm is missing' };
  }

  return { valid: true };
};

/**
 * Get Restlet endpoint URL (default/legacy)
 */
const getRestletUrl = () => {
  return `${NETSUITE_CONFIG.baseUrl}/app/site/hosting/restlet.nl?script=${NETSUITE_CONFIG.scriptId}&deploy=${NETSUITE_CONFIG.deploymentId}`;
};

/**
 * Get script configuration from database dengan caching
 * Sekarang menggunakan script ID per module (bukan per operation)
 * @param {string} module - Module name (e.g., 'customer', 'order')
 * @param {string} operation - Operation name (optional, untuk backward compatibility)
 * @returns {Promise<{script_id: string, deployment_id: string}|null>}
 */
const getScriptConfig = async (module, operation = null) => {
  try {
    // Check cache first - cache key hanya berdasarkan module sekarang
    const cacheKey = `netsuite:script:${module}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return cached;
    }

    // Get from database - ambil script ID per module (bukan per operation)
    const config = await netsuiteScriptsRepo.getScriptConfigByModule(module);
    
    if (config) {
      const result = {
        script_id: config.script_id,
        deployment_id: config.deployment_id,
      };
      
      // Cache the result
      await setCache(cacheKey, result, SCRIPT_CONFIG_CACHE_TTL);
      
      return result;
    }

    // Fallback to default if not found in DB
    return {
      script_id: NETSUITE_CONFIG.scriptId,
      deployment_id: NETSUITE_CONFIG.deploymentId,
    };
  } catch (error) {
    // If database error, fallback to default
    console.warn(`Error getting script config from DB for ${module}, using default:`, error.message);
    return {
      script_id: NETSUITE_CONFIG.scriptId,
      deployment_id: NETSUITE_CONFIG.deploymentId,
    };
  }
};

/**
 * Get Restlet endpoint URL dengan script config dari database
 * @param {string} module - Module name
 * @param {string} operation - Operation name (optional, untuk backward compatibility)
 * @returns {Promise<string>}
 */
const getRestletUrlWithConfig = async (module, operation = null) => {
  const config = await getScriptConfig(module, operation);
  return `${NETSUITE_CONFIG.baseUrl}/app/site/hosting/restlet.nl?script=${config.script_id}&deploy=${config.deployment_id}`;
};

module.exports = {
  NETSUITE_CONFIG,
  validateConfig,
  getRestletUrl,
  getScriptConfig,
  getRestletUrlWithConfig,
};

