const axios = require('axios');
const { Logger } = require('../../utils/logger');
const { getNetSuiteConfig, validateConfig, getRestletUrl } = require('../../config/netsuite');
const { getOAuthService } = require('./oauth');
const { metrics } = require('../../config/prometheus');
const { getCurrentEnvironment } = require('../../utils/environment');

/**
 * NetSuite API Client Service
 * Menangani semua komunikasi dengan NetSuite RESTlet API
 * Support multiple environments: sandbox dan production
 */
class NetSuiteClient {
  constructor(module = 'unknown', env = null) {
    this.environment = env || getCurrentEnvironment();
    this.config = getNetSuiteConfig(this.environment);
    this.baseUrl = this.config.baseUrl;
    this.restletUrl = getRestletUrl(this.environment);
    this.timeout = this.config.timeout;
    this.oauthService = getOAuthService(this.environment);
    this.module = module;
  }

  /**
   * Make authenticated request ke NetSuite API
   */
  async request(method, params = {}, body = null) {
    const validation = validateConfig(this.environment);
    if (!validation.valid) {
      throw new Error(`NetSuite configuration error (${this.environment}): ${validation.error}`);
    }

    const oauthValidation = this.oauthService.validateCredentials();
    if (!oauthValidation.valid) {
      throw new Error(`OAuth credentials error (${this.environment}): ${oauthValidation.error}`);
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

// Singleton instances per environment
const clientInstances = {
  sandbox: null,
  production: null,
};

/**
 * Get NetSuite client instance untuk environment tertentu
 * Singleton pattern per environment - reuse instance untuk efisiensi
 * @param {string} module - Module name
 * @param {string} env - Environment name (optional, defaults to current environment)
 * @returns {NetSuiteClient} NetSuite client instance
 */
const getNetSuiteClient = (module = 'unknown', env = null) => {
  const environment = env || getCurrentEnvironment();
  
  if (!clientInstances[environment]) {
    clientInstances[environment] = new NetSuiteClient(module, environment);
  } else if (clientInstances[environment].module !== module) {
    // Update module jika berbeda
    clientInstances[environment].module = module;
  }
  
  return clientInstances[environment];
};

module.exports = {
  NetSuiteClient,
  getNetSuiteClient,
};

