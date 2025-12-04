const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
const { getNetSuiteConfig } = require('../../config/netsuite');
const { getCurrentEnvironment } = require('../../utils/environment');

/**
 * OAuth 1.0 Service untuk NetSuite API
 * Mengimplementasikan HMAC-SHA256 signature sesuai dengan Postman collection
 * Support multiple environments: sandbox dan production
 */
class NetSuiteOAuthService {
  constructor(env = null) {
    this.environment = env || getCurrentEnvironment();
    this.config = getNetSuiteConfig(this.environment);
    
    this.oauth = OAuth({
      consumer: {
        key: this.config.oauth.consumerKey,
        secret: this.config.oauth.consumerSecret,
      },
      signature_method: this.config.oauth.signatureMethod,
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
      key: this.config.oauth.token,
      secret: this.config.oauth.tokenSecret,
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
    const realm = this.config.oauth.realm;
    const params = [];

    params.push(`realm="${realm}"`);
    params.push(`oauth_consumer_key="${authData.oauth_consumer_key}"`);
    params.push(`oauth_token="${authData.oauth_token}"`);
    params.push(`oauth_signature_method="${authData.oauth_signature_method}"`);
    params.push(`oauth_timestamp="${authData.oauth_timestamp}"`);
    params.push(`oauth_nonce="${authData.oauth_nonce}"`);
    params.push(`oauth_version="${this.config.oauth.version}"`);
    params.push(`oauth_signature="${encodeURIComponent(authData.oauth_signature)}"`);

    return `OAuth ${params.join(', ')}`;
  }

  /**
   * Validate OAuth credentials
   */
  validateCredentials() {
    if (!this.config.oauth.consumerKey || !this.config.oauth.consumerSecret) {
      return { valid: false, error: `Consumer credentials are missing for ${this.environment}` };
    }

    if (!this.config.oauth.token || !this.config.oauth.tokenSecret) {
      return { valid: false, error: `Token credentials are missing for ${this.environment}` };
    }

    return { valid: true };
  }
}

// Singleton instances per environment
const oauthServiceInstances = {
  sandbox: null,
  production: null,
};

/**
 * Get OAuth service instance untuk environment tertentu
 * @param {string} env - Environment name (optional, defaults to current environment)
 * @returns {NetSuiteOAuthService} OAuth service instance
 */
const getOAuthService = (env = null) => {
  const environment = env || getCurrentEnvironment();
  
  if (!oauthServiceInstances[environment]) {
    oauthServiceInstances[environment] = new NetSuiteOAuthService(environment);
  }
  
  return oauthServiceInstances[environment];
};

module.exports = {
  NetSuiteOAuthService,
  getOAuthService,
};

