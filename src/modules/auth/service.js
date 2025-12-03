const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const repository = require('./repository');
const apiClientRepository = require('../api_client/repository');
const { Logger } = require('../../utils/logger');

/**
 * Service layer untuk business logic OAuth2 Authentication
 */

/**
 * Parse expires_in string (e.g., "1h", "30d") to seconds
 */
const parseExpiresIn = (expiresIn) => {
  if (!expiresIn) return 3600; // Default 1 hour
  
  const units = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };
  
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return 3600;
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  return value * (units[unit] || 1);
};

/**
 * Generate access token and refresh token
 */
const generateTokens = async (clientKey, clientSecret) => {
  // Verify client credentials
  const verification = await apiClientRepository.verifyCredentials(clientKey, clientSecret);
  
  if (!verification.valid) {
    throw new Error(verification.error || 'Invalid client credentials');
  }
  
  const client = verification.client;
  
  // Generate JTI for access token
  const jti = crypto.randomUUID();
  
  // Get expiration times from environment
  const accessTokenExpiresIn = parseExpiresIn(process.env.OAUTH2_ACCESS_TOKEN_EXPIRES_IN || '1h');
  const refreshTokenExpiresIn = parseExpiresIn(process.env.OAUTH2_REFRESH_TOKEN_EXPIRES_IN || '30d');
  
  // Create access token payload
  const accessTokenPayload = {
    sub: client.client_key,
    client_id: client.id,
    client_name: client.name,
    jti: jti,
    type: 'access_token',
    exp: Math.floor(Date.now() / 1000) + accessTokenExpiresIn,
    iat: Math.floor(Date.now() / 1000),
  };
  
  // Sign access token
  const jwtSecret = process.env.OAUTH2_SECRET || process.env.JWT_SECRET || 'default-secret';
  const accessToken = jwt.sign(accessTokenPayload, jwtSecret, { algorithm: 'HS256' });
  
  // Calculate refresh token expiration date
  const refreshTokenExpiresAt = new Date(Date.now() + (refreshTokenExpiresIn * 1000));
  
  // Create refresh token in database
  const refreshTokenData = await repository.create({
    api_client_id: client.id,
    jti: jti,
    expires_at: refreshTokenExpiresAt,
  });
  
  // Update last used timestamp
  await apiClientRepository.updateLastUsed(clientKey);
  
  Logger.info(`OAuth2 tokens generated for client: ${client.name} (${client.client_key})`);
  
  return {
    access_token: accessToken,
    refresh_token: refreshTokenData.refresh_token,
    token_type: 'Bearer',
    expires_in: accessTokenExpiresIn,
    refresh_token_expires_in: refreshTokenExpiresIn,
  };
};

/**
 * Refresh access token using refresh token
 */
const refreshAccessToken = async (refreshToken) => {
  // Validate refresh token
  const validation = await repository.isValid(refreshToken);
  
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid refresh token');
  }
  
  const tokenRecord = validation.token;
  
  // Get client info
  const client = await apiClientRepository.findById(tokenRecord.api_client_id);
  
  if (!client || !client.is_active) {
    throw new Error('Client is inactive or not found');
  }
  
  // Revoke old refresh token
  await repository.revoke(refreshToken);
  
  // Generate new tokens
  const newTokens = await generateTokens(client.client_key, client.client_secret);
  
  Logger.info(`OAuth2 tokens refreshed for client: ${client.name} (${client.client_key})`);
  
  return newTokens;
};

/**
 * Revoke refresh token
 */
const revokeToken = async (refreshToken) => {
  const revoked = await repository.revoke(refreshToken);
  
  if (!revoked) {
    throw new Error('Refresh token not found or already revoked');
  }
  
  Logger.info(`OAuth2 refresh token revoked: ${refreshToken.substring(0, 10)}...`);
  
  return { message: 'Token revoked successfully' };
};

/**
 * Verify access token
 */
const verifyAccessToken = async (accessToken) => {
  try {
    const jwtSecret = process.env.OAUTH2_SECRET || process.env.JWT_SECRET || 'default-secret';
    const decoded = jwt.verify(accessToken, jwtSecret);
    
    // Check if token is access token
    if (decoded.type !== 'access_token') {
      return { valid: false, error: 'Invalid token type' };
    }
    
    // Get client info
    const client = await apiClientRepository.findById(decoded.client_id);
    
    if (!client || !client.is_active) {
      return { valid: false, error: 'Client is inactive or not found' };
    }
    
    // Check if refresh token for this jti is revoked
    const refreshTokenRecord = await repository.findByJti(decoded.jti);
    
    if (refreshTokenRecord && refreshTokenRecord.is_revoked) {
      return { valid: false, error: 'Token has been revoked' };
    }
    
    return { valid: true, decoded, client };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return { valid: false, error: 'Token has expired' };
    }
    if (error.name === 'JsonWebTokenError') {
      return { valid: false, error: 'Invalid token' };
    }
    return { valid: false, error: error.message };
  }
};

module.exports = {
  generateTokens,
  refreshAccessToken,
  revokeToken,
  verifyAccessToken,
};

