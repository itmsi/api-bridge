const db = require('../../config/database');
const { pgCore } = require('../../config/database');
const crypto = require('crypto');

const TABLE_NAME = 'api_clients';

/**
 * Generate client key dan secret
 */
const generateCredentials = () => {
  const clientKey = `apikey_${crypto.randomBytes(16).toString('hex')}`;
  const clientSecret = crypto.randomBytes(32).toString('hex');
  return { clientKey, clientSecret };
};

/**
 * Find all API clients dengan pagination
 */
const findAll = async (page = 1, limit = 50) => {
  const offset = (page - 1) * limit;
  
  const data = await db(TABLE_NAME)
    .select('id', 'name', 'description', 'api_url', 'client_key', 'is_active', 'rate_limit_per_minute', 'rate_limit_per_hour', 'created_at', 'updated_at', 'last_used_at')
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset);
    
  const totalResult = await db(TABLE_NAME)
    .count('id as count')
    .first();
    
  // Handle case when table is empty or count returns null/undefined
  const total = totalResult?.count ? parseInt(totalResult.count) : 0;
  const totalPages = total > 0 ? Math.ceil(total / limit) : 0;
    
  return {
    items: data || [],
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
      totalPages: totalPages
    }
  };
};

/**
 * Find API client by ID
 */
const findById = async (id) => {
  return await db(TABLE_NAME)
    .where({ id })
    .first();
};

/**
 * Find API client by client_key
 */
const findByClientKey = async (clientKey) => {
  return await db(TABLE_NAME)
    .where({ client_key: clientKey, is_active: true })
    .first();
};

/**
 * Find API client by API URL
 */
const findByApiUrl = async (apiUrl) => {
  return await db(TABLE_NAME)
    .where({ api_url: apiUrl })
    .first();
};

/**
 * Create new API client
 */
const create = async (data) => {
  const { clientKey, clientSecret } = generateCredentials();
  
  // Prepare ip_whitelist for JSONB column
  // Use pgCore.raw() to explicitly convert array to JSONB
  let ipWhitelist = null;
  if (data.ip_whitelist !== null && data.ip_whitelist !== undefined) {
    if (Array.isArray(data.ip_whitelist) && data.ip_whitelist.length > 0) {
      // Use raw SQL to ensure proper JSONB conversion
      // pgCore.raw() with parameter binding
      ipWhitelist = pgCore.raw('?::jsonb', [JSON.stringify(data.ip_whitelist)]);
    } else if (typeof data.ip_whitelist === 'string') {
      // If it's a string, try to parse it
      try {
        const parsed = JSON.parse(data.ip_whitelist);
        if (Array.isArray(parsed) && parsed.length > 0) {
          ipWhitelist = pgCore.raw('?::jsonb', [JSON.stringify(parsed)]);
        }
      } catch (e) {
        ipWhitelist = null;
      }
    }
  }
  
  const [created] = await db(TABLE_NAME)
    .insert({
      name: data.name,
      description: data.description || null,
      api_url: data.api_url,
      client_key: clientKey,
      client_secret: clientSecret,
      is_active: data.is_active !== undefined ? data.is_active : true,
      ip_whitelist: ipWhitelist,
      rate_limit_per_minute: data.rate_limit_per_minute || 100,
      rate_limit_per_hour: data.rate_limit_per_hour || 1000,
      notes: data.notes || null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning('*');
    
  return created;
};

/**
 * Update API client
 */
const update = async (id, data) => {
  const updateData = {
    updated_at: new Date(),
  };
  
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.api_url !== undefined) updateData.api_url = data.api_url;
  if (data.is_active !== undefined) updateData.is_active = data.is_active;
  
  // Handle ip_whitelist for JSONB column
  if (data.ip_whitelist !== undefined) {
    if (data.ip_whitelist === null) {
      updateData.ip_whitelist = null;
    } else if (Array.isArray(data.ip_whitelist) && data.ip_whitelist.length > 0) {
      // Use raw SQL to ensure proper JSONB conversion
      // pgCore.raw() with parameter binding
      updateData.ip_whitelist = pgCore.raw('?::jsonb', [JSON.stringify(data.ip_whitelist)]);
    } else if (typeof data.ip_whitelist === 'string') {
      try {
        const parsed = JSON.parse(data.ip_whitelist);
        if (Array.isArray(parsed) && parsed.length > 0) {
          updateData.ip_whitelist = pgCore.raw('?::jsonb', [JSON.stringify(parsed)]);
        } else {
          updateData.ip_whitelist = null;
        }
      } catch (e) {
        updateData.ip_whitelist = null;
      }
    } else {
      updateData.ip_whitelist = null;
    }
  }
  
  if (data.rate_limit_per_minute !== undefined) updateData.rate_limit_per_minute = data.rate_limit_per_minute;
  if (data.rate_limit_per_hour !== undefined) updateData.rate_limit_per_hour = data.rate_limit_per_hour;
  if (data.notes !== undefined) updateData.notes = data.notes;
  
  const [updated] = await db(TABLE_NAME)
    .where({ id })
    .update(updateData)
    .returning('*');
    
  return updated;
};

/**
 * Regenerate client secret
 */
const regenerateSecret = async (id) => {
  const newSecret = crypto.randomBytes(32).toString('hex');
  
  const [updated] = await db(TABLE_NAME)
    .where({ id })
    .update({
      client_secret: newSecret,
      updated_at: new Date(),
    })
    .returning('*');
    
  return updated;
};

/**
 * Delete API client
 */
const remove = async (id) => {
  return await db(TABLE_NAME)
    .where({ id })
    .del();
};

/**
 * Update last used timestamp
 */
const updateLastUsed = async (clientKey) => {
  await db(TABLE_NAME)
    .where({ client_key: clientKey })
    .update({
      last_used_at: new Date(),
    });
};

/**
 * Verify client credentials
 */
const verifyCredentials = async (clientKey, clientSecret) => {
  const client = await findByClientKey(clientKey);
  
  if (!client) {
    return { valid: false, error: 'Invalid client key' };
  }
  
  if (!client.is_active) {
    return { valid: false, error: 'Client is inactive' };
  }
  
  if (client.client_secret !== clientSecret) {
    return { valid: false, error: 'Invalid client secret' };
  }
  
  return { valid: true, client };
};

module.exports = {
  findAll,
  findById,
  findByClientKey,
  findByApiUrl,
  create,
  update,
  regenerateSecret,
  remove,
  updateLastUsed,
  verifyCredentials,
  generateCredentials,
};

