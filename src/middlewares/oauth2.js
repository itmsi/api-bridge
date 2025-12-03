const { errorResponse } = require('../utils/response');
const authService = require('../modules/auth/service');

/**
 * Middleware untuk validasi OAuth2 Access Token
 * Client harus mengirim access token di Authorization header
 */
const verifyOAuth2Token = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, {
        error: 'invalid_token',
        error_description: 'Access token required. Provide Authorization: Bearer <token> header.',
      }, 401);
    }
    
    const accessToken = authHeader.split(' ')[1];
    
    if (!accessToken) {
      return errorResponse(res, {
        error: 'invalid_token',
        error_description: 'Access token is required',
      }, 401);
    }
    
    // Verify token
    const verification = await authService.verifyAccessToken(accessToken);
    
    if (!verification.valid) {
      return errorResponse(res, {
        error: 'invalid_token',
        error_description: verification.error || 'Invalid or expired access token',
      }, 401);
    }
    
    // Attach client info to request
    req.oauth2Client = verification.client;
    req.oauth2Decoded = verification.decoded;
    
    // Also attach as apiClient for backward compatibility (same structure as verifyApiKey)
    req.apiClient = {
      id: verification.client.id,
      name: verification.client.name,
      api_url: verification.client.api_url,
      rate_limit_per_minute: verification.client.rate_limit_per_minute,
      rate_limit_per_hour: verification.client.rate_limit_per_hour,
    };
    
    next();
  } catch (error) {
    return errorResponse(res, {
      error: 'invalid_token',
      error_description: error.message || 'Token verification failed',
    }, 401);
  }
};

module.exports = {
  verifyOAuth2Token,
};

