const { errorResponse } = require('../utils/response');
const apiClientRepository = require('../modules/api_client/postgre_repository');

/**
 * Middleware untuk validasi API Key Authentication
 * Client harus mengirim client_key dan client_secret di header
 */
const verifyApiKey = async (req, res, next) => {
  try {
    // Get client_key dan client_secret dari header
    const clientKey = req.headers['x-client-key'] || req.headers['x-api-key'] || req.query.client_key;
    const clientSecret = req.headers['x-client-secret'] || req.headers['x-api-secret'] || req.query.client_secret;

    if (!clientKey || !clientSecret) {
      return errorResponse(res, {
        message: 'API key authentication required. Provide X-Client-Key and X-Client-Secret headers.',
      }, 401);
    }

    // Verify credentials
    const verification = await apiClientRepository.verifyCredentials(clientKey, clientSecret);

    if (!verification.valid) {
      return errorResponse(res, {
        message: verification.error || 'Invalid API credentials',
      }, 401);
    }

    // Check IP whitelist jika ada
    // DISABLED: IP whitelist validation temporarily disabled
    // if (verification.client.ip_whitelist && Array.isArray(verification.client.ip_whitelist)) {
    //   const clientIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    //   const forwardedIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim();
    //   const actualIp = forwardedIp || clientIp;

    //   if (!verification.client.ip_whitelist.includes(actualIp)) {
    //     return errorResponse(res, {
    //       message: 'IP address not whitelisted',
    //     }, 403);
    //   }
    // }

    // Update last used timestamp
    await apiClientRepository.updateLastUsed(clientKey);

    // Attach client info to request
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
      message: 'API key authentication error',
      error: error.message,
    }, 500);
  }
};

module.exports = {
  verifyApiKey,
};

