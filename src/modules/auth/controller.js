const service = require('./service');
const { baseResponse, errorResponse } = require('../../utils/response');

/**
 * Controller layer untuk HTTP request/response handling OAuth2 Authentication
 */

/**
 * OAuth2 Token endpoint
 * POST /api/v1/bridge/auth/token
 * 
 * Grant types supported:
 * - client_credentials: Get access token using client_key and client_secret
 * - refresh_token: Refresh access token using refresh_token
 */
const getToken = async (req, res) => {
  try {
    const { grant_type, client_id, client_secret, refresh_token } = req.body;
    
    // Validate grant_type
    if (!grant_type) {
      return errorResponse(res, {
        error: 'invalid_request',
        error_description: 'grant_type is required',
      }, 400);
    }
    
    // Handle client_credentials grant
    if (grant_type === 'client_credentials') {
      if (!client_id || !client_secret) {
        return errorResponse(res, {
          error: 'invalid_request',
          error_description: 'client_id and client_secret are required for client_credentials grant',
        }, 400);
      }
      
      const tokens = await service.generateTokens(client_id, client_secret);
      
      return baseResponse(res, tokens);
    }
    
    // Handle refresh_token grant
    if (grant_type === 'refresh_token') {
      if (!refresh_token) {
        return errorResponse(res, {
          error: 'invalid_request',
          error_description: 'refresh_token is required for refresh_token grant',
        }, 400);
      }
      
      const tokens = await service.refreshAccessToken(refresh_token);
      
      return baseResponse(res, tokens);
    }
    
    // Unsupported grant_type
    return errorResponse(res, {
      error: 'unsupported_grant_type',
      error_description: `Grant type '${grant_type}' is not supported`,
    }, 400);
    
  } catch (error) {
    return errorResponse(res, {
      error: 'invalid_client',
      error_description: error.message || 'Invalid client credentials',
    }, 401);
  }
};

/**
 * Alternative endpoint for getting token (supports form data and query params)
 * POST /api/v1/bridge/auth/token
 * GET /api/v1/bridge/auth/token?grant_type=client_credentials&client_id=...&client_secret=...
 */
const getTokenAlternative = async (req, res) => {
  try {
    // Support both body and query parameters
    const grant_type = req.body.grant_type || req.query.grant_type;
    const client_id = req.body.client_id || req.query.client_id || req.body.client_key || req.query.client_key;
    const client_secret = req.body.client_secret || req.query.client_secret;
    const refresh_token = req.body.refresh_token || req.query.refresh_token;
    
    // Also support Basic Auth header for client credentials
    let basicAuthClientId = null;
    let basicAuthClientSecret = null;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Basic ')) {
      const authString = Buffer.from(req.headers.authorization.split(' ')[1], 'base64').toString();
      const [id, secret] = authString.split(':');
      basicAuthClientId = id;
      basicAuthClientSecret = secret;
    }
    
    // Use Basic Auth credentials if provided and no body/query credentials
    const finalClientId = client_id || basicAuthClientId;
    const finalClientSecret = client_secret || basicAuthClientSecret;
    
    if (!grant_type) {
      return errorResponse(res, {
        error: 'invalid_request',
        error_description: 'grant_type is required',
      }, 400);
    }
    
    // Handle client_credentials grant
    if (grant_type === 'client_credentials') {
      if (!finalClientId || !finalClientSecret) {
        return errorResponse(res, {
          error: 'invalid_request',
          error_description: 'client_id and client_secret are required for client_credentials grant',
        }, 400);
      }
      
      const tokens = await service.generateTokens(finalClientId, finalClientSecret);
      
      return baseResponse(res, tokens);
    }
    
    // Handle refresh_token grant
    if (grant_type === 'refresh_token') {
      if (!refresh_token) {
        return errorResponse(res, {
          error: 'invalid_request',
          error_description: 'refresh_token is required for refresh_token grant',
        }, 400);
      }
      
      const tokens = await service.refreshAccessToken(refresh_token);
      
      return baseResponse(res, tokens);
    }
    
    // Unsupported grant_type
    return errorResponse(res, {
      error: 'unsupported_grant_type',
      error_description: `Grant type '${grant_type}' is not supported`,
    }, 400);
    
  } catch (error) {
    return errorResponse(res, {
      error: 'invalid_client',
      error_description: error.message || 'Invalid client credentials',
    }, 401);
  }
};

/**
 * Revoke token endpoint
 * POST /api/v1/bridge/auth/revoke
 */
const revokeToken = async (req, res) => {
  try {
    const { refresh_token } = req.body;
    
    if (!refresh_token) {
      return errorResponse(res, {
        error: 'invalid_request',
        error_description: 'refresh_token is required',
      }, 400);
    }
    
    const result = await service.revokeToken(refresh_token);
    
    return baseResponse(res, result, 'Token revoked successfully');
  } catch (error) {
    return errorResponse(res, {
      error: 'invalid_request',
      error_description: error.message || 'Failed to revoke token',
    }, 400);
  }
};

module.exports = {
  getToken,
  getTokenAlternative,
  revokeToken,
};

