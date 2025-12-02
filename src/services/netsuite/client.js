const axios = require('axios');
const { Logger } = require('../../utils/logger');
const { NETSUITE_CONFIG, validateConfig, getRestletUrl } = require('../../config/netsuite');
const { getOAuthService } = require('./oauth');
const { metrics } = require('../../config/prometheus');

/**
 * NetSuite API Client Service
 * Menangani semua komunikasi dengan NetSuite RESTlet API
 */
class NetSuiteClient {
  constructor(module = 'unknown') {
    this.baseUrl = NETSUITE_CONFIG.baseUrl;
    this.restletUrl = getRestletUrl();
    this.timeout = NETSUITE_CONFIG.timeout;
    this.oauthService = getOAuthService();
    this.module = module;
  }

  /**
   * Make authenticated request ke NetSuite API
   */
  async request(method, params = {}, body = null) {
    const validation = validateConfig();
    if (!validation.valid) {
      throw new Error(`NetSuite configuration error: ${validation.error}`);
    }

    const oauthValidation = this.oauthService.validateCredentials();
    if (!oauthValidation.valid) {
      throw new Error(`OAuth credentials error: ${oauthValidation.error}`);
    }

    try {
      // Build URL - support custom script and deploy
      let baseUrl = this.restletUrl;
      if (params.script && params.deploy) {
        // Build custom URL dengan script dan deploy yang berbeda
        baseUrl = `${this.baseUrl}/app/site/hosting/restlet.nl?script=${params.script}&deploy=${params.deploy}`;
        // Remove script and deploy from params untuk tidak duplikat di query string
        const { script, deploy, ...otherParams } = params;
        params = otherParams;
      }

      const url = new URL(baseUrl);
      if (params && Object.keys(params).length > 0) {
        Object.keys(params).forEach((key) => {
          url.searchParams.append(key, params[key]);
        });
      }

      // Generate OAuth header
      const authHeader = this.oauthService.getAuthorizationHeader(
        url.toString(),
        method
      );

      // Prepare request config
      const config = {
        method,
        url: url.toString(),
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        timeout: this.timeout,
      };

      // Add body untuk POST/PUT requests
      if (body && (method === 'POST' || method === 'PUT')) {
        config.data = body;
      }

      // Track request start time untuk metrics
      const startTime = Date.now();

      // Make request
      const response = await axios(config);

      // Calculate duration
      const duration = (Date.now() - startTime) / 1000;

      // Track metrics
      metrics.sync.netsuiteRequests.inc({
        module: this.module || 'unknown',
        status: response.status >= 200 && response.status < 300 ? 'success' : 'error',
      });

      Logger.info(`NetSuite API ${method} request successful`, {
        url: url.toString(),
        status: response.status,
        duration,
      });

      return {
        success: true,
        data: response.data,
        status: response.status,
        headers: response.headers,
      };
    } catch (error) {
      // Track error metrics
      metrics.sync.netsuiteRequests.inc({
        module: this.module || 'unknown',
        status: 'error',
      });

      Logger.error('NetSuite API request failed', {
        method,
        url: this.restletUrl,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      throw new Error(
        `NetSuite API error: ${error.message}${error.response?.data ? ` - ${JSON.stringify(error.response.data)}` : ''}`
      );
    }
  }

  /**
   * GET request ke NetSuite API
   */
  async get(params = {}) {
    return this.request('GET', params);
  }

  /**
   * POST request ke NetSuite API
   */
  async post(body, params = {}) {
    return this.request('POST', params, body);
  }

  /**
   * PUT request ke NetSuite API
   */
  async put(body, params = {}) {
    return this.request('PUT', params, body);
  }
}

// Singleton instance
let clientInstance = null;

/**
 * Get NetSuite client instance
 * Singleton pattern - reuse instance untuk efisiensi
 */
const getNetSuiteClient = (module = 'unknown') => {
  if (!clientInstance) {
    clientInstance = new NetSuiteClient(module);
  } else if (clientInstance.module !== module) {
    // Update module jika berbeda
    clientInstance.module = module;
  }
  return clientInstance;
};

module.exports = {
  NetSuiteClient,
  getNetSuiteClient,
};

