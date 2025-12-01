/**
 * NetSuite API Configuration
 * Credentials disimpan di environment variables untuk keamanan
 */

const NETSUITE_CONFIG = {
  // Base URL dari Postman collection
  baseUrl: process.env.NETSUITE_BASE_URL || 'https://11970733-sb1.restlets.api.netsuite.com',
  
  // Restlet script configuration
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
 * Get Restlet endpoint URL
 */
const getRestletUrl = () => {
  return `${NETSUITE_CONFIG.baseUrl}/app/site/hosting/restlet.nl?script=${NETSUITE_CONFIG.scriptId}&deploy=${NETSUITE_CONFIG.deploymentId}`;
};

module.exports = {
  NETSUITE_CONFIG,
  validateConfig,
  getRestletUrl,
};

