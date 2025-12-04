const db = require('../../config/database');
const crypto = require('crypto');

const TABLE_NAME = 'oauth2_refresh_tokens';

/**
 * Repository layer untuk database operations OAuth2 Refresh Token
 */

/**
 * Create refresh token
 */
const create = async (data) => {
  const refreshToken = crypto.randomBytes(64).toString('hex');
  
  const [created] = await db(TABLE_NAME)
    .insert({
      api_client_id: data.api_client_id,
      refresh_token: refreshToken,
      jti: data.jti,
      expires_at: data.expires_at,
      is_revoked: false,
      created_at: new Date(),
    })
    .returning('*');
    
  return { ...created, refresh_token: refreshToken };
};

/**
 * Find refresh token by token string
 */
const findByToken = async (refreshToken) => {
  return await db(TABLE_NAME)
    .where({ refresh_token: refreshToken })
    .first();
};

/**
 * Find refresh token by jti (including revoked tokens)
 * Used to check if access token should be invalidated
 */
const findByJti = async (jti) => {
  return await db(TABLE_NAME)
    .where({ jti })
    .first();
};

/**
 * Revoke refresh token
 */
const revoke = async (refreshToken) => {
  const [updated] = await db(TABLE_NAME)
    .where({ refresh_token: refreshToken })
    .where('is_revoked', false)
    .update({
      is_revoked: true,
      revoked_at: new Date(),
    })
    .returning('*');
    
  return updated;
};

/**
 * Revoke all tokens for a client
 */
const revokeAllByClientId = async (apiClientId) => {
  return await db(TABLE_NAME)
    .where({ api_client_id: apiClientId })
    .where('is_revoked', false)
    .update({
      is_revoked: true,
      revoked_at: new Date(),
    });
};

/**
 * Delete expired tokens
 */
const deleteExpired = async () => {
  return await db(TABLE_NAME)
    .where('expires_at', '<', new Date())
    .del();
};

/**
 * Check if refresh token is valid (not revoked and not expired)
 */
const isValid = async (refreshToken) => {
  const token = await findByToken(refreshToken);
  
  if (!token) {
    return { valid: false, error: 'Refresh token not found' };
  }
  
  if (token.is_revoked) {
    return { valid: false, error: 'Refresh token has been revoked' };
  }
  
  if (new Date(token.expires_at) < new Date()) {
    return { valid: false, error: 'Refresh token has expired' };
  }
  
  return { valid: true, token };
};

module.exports = {
  create,
  findByToken,
  findByJti,
  revoke,
  revokeAllByClientId,
  deleteExpired,
  isValid,
};

