const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
const { NETSUITE_CONFIG } = require('../../config/netsuite');

/**
 * OAuth 1.0 Service untuk NetSuite API
 * Mengimplementasikan HMAC-SHA256 signature sesuai dengan Postman collection
 */
class NetSuiteOAuthService {
  constructor() {
    this.oauth = OAuth({
      consumer: {
        key: NETSUITE_CONFIG.oauth.consumerKey,
        secret: NETSUITE_CONFIG.oauth.consumerSecret,
      },
      signature_method: NETSUITE_CONFIG.oauth.signatureMethod,
      hash_function(baseString, key) {
        return crypto
          .createHmac('sha256', key)
          .update(baseString)
          .digest('base64');
      },
    });
  }

  /**
   * Generate OAuth authorization header
   * Sesuai dengan konfigurasi Postman collection
   */
  getAuthorizationHeader(url, method) {
    const token = {
      key: NETSUITE_CONFIG.oauth.token,
      secret: NETSUITE_CONFIG.oauth.tokenSecret,
    };

    // Parse URL untuk mendapatkan base URL dan query params
    const urlObj = new URL(url);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;

    // Prepare request data untuk OAuth signing
    // NetSuite includes query params in signature
    const requestData = {
      url: baseUrl,
      method,
    };

    // Add query parameters untuk signing
    if (urlObj.search) {
      requestData.data = {};
      urlObj.searchParams.forEach((value, key) => {
        requestData.data[key] = value;
      });
    }

    // Authorize request
    const authData = this.oauth.authorize(requestData, token);

    // Build Authorization header dengan realm
    const realm = NETSUITE_CONFIG.oauth.realm;
    const params = [];

    params.push(`realm="${realm}"`);
    params.push(`oauth_consumer_key="${authData.oauth_consumer_key}"`);
    params.push(`oauth_token="${authData.oauth_token}"`);
    params.push(`oauth_signature_method="${authData.oauth_signature_method}"`);
    params.push(`oauth_timestamp="${authData.oauth_timestamp}"`);
    params.push(`oauth_nonce="${authData.oauth_nonce}"`);
    params.push(`oauth_version="${NETSUITE_CONFIG.oauth.version}"`);
    params.push(`oauth_signature="${encodeURIComponent(authData.oauth_signature)}"`);

    return `OAuth ${params.join(', ')}`;
  }

  /**
   * Validate OAuth credentials
   */
  validateCredentials() {
    if (!NETSUITE_CONFIG.oauth.consumerKey || !NETSUITE_CONFIG.oauth.consumerSecret) {
      return { valid: false, error: 'Consumer credentials are missing' };
    }

    if (!NETSUITE_CONFIG.oauth.token || !NETSUITE_CONFIG.oauth.tokenSecret) {
      return { valid: false, error: 'Token credentials are missing' };
    }

    return { valid: true };
  }
}

// Singleton instance
let oauthServiceInstance = null;

/**
 * Get OAuth service instance
 */
const getOAuthService = () => {
  if (!oauthServiceInstance) {
    oauthServiceInstance = new NetSuiteOAuthService();
  }
  return oauthServiceInstance;
};

module.exports = {
  NetSuiteOAuthService,
  getOAuthService,
};

