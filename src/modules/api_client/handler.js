const repository = require('./postgre_repository');
const { baseResponse, errorResponse, emptyDataResponse } = require('../../utils/response');
const { Logger } = require('../../utils/logger');

/**
 * Get all API clients
 */
const getAll = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const data = await repository.findAll(page, limit);
    
    // Check if data is empty
    if (!data || !data.items || (Array.isArray(data.items) && data.items.length === 0)) {
      return emptyDataResponse(res, page, limit, true);
    }
    
    return baseResponse(res, data);
  } catch (error) {
    return errorResponse(res, error);
  }
};

/**
 * Get API client by ID
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const client = await repository.findById(id);
    
    if (!client) {
      return emptyDataResponse(res, 1, 0, false);
    }
    
    // Jangan return client_secret untuk security
    const { client_secret, ...safeClient } = client;
    
    return baseResponse(res, safeClient);
  } catch (error) {
    return errorResponse(res, error);
  }
};

/**
 * Register new API client
 */
const register = async (req, res) => {
  try {
    const { name, description, api_url, ip_whitelist, rate_limit_per_minute, rate_limit_per_hour, notes } = req.body;

    if (!name || !api_url) {
      return errorResponse(res, { message: 'Name dan API URL diperlukan' }, 400);
    }

    // Check if API URL already registered
    const existing = await repository.findByApiUrl(api_url);
    if (existing) {
      return errorResponse(res, { message: 'API URL sudah terdaftar' }, 400);
    }

    // Create new API client
    const client = await repository.create({
      name,
      description,
      api_url,
      ip_whitelist: ip_whitelist || null,
      rate_limit_per_minute: rate_limit_per_minute || 100,
      rate_limit_per_hour: rate_limit_per_hour || 1000,
      notes,
    });

    Logger.info(`New API client registered: ${client.name} (${client.api_url})`);

    // Return dengan client_secret (hanya sekali saat register)
    return baseResponse(res, {
      id: client.id,
      name: client.name,
      description: client.description,
      api_url: client.api_url,
      client_key: client.client_key,
      client_secret: client.client_secret, // Hanya di return saat register
      is_active: client.is_active,
      rate_limit_per_minute: client.rate_limit_per_minute,
      rate_limit_per_hour: client.rate_limit_per_hour,
      created_at: client.created_at,
    }, 'API client berhasil didaftarkan. Simpan client_key dan client_secret dengan aman!', 201);
  } catch (error) {
    Logger.error('Error registering API client:', error);
    return errorResponse(res, error);
  }
};

/**
 * Update API client
 */
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updated = await repository.update(id, updateData);

    if (!updated) {
      return emptyDataResponse(res, 1, 0, false);
    }

    // Jangan return client_secret
    const { client_secret, ...safeClient } = updated;

    return baseResponse(res, safeClient, 'API client berhasil diupdate');
  } catch (error) {
    return errorResponse(res, error);
  }
};

/**
 * Regenerate client secret
 */
const regenerateSecret = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await repository.regenerateSecret(id);

    if (!updated) {
      return emptyDataResponse(res, 1, 0, false);
    }

    Logger.info(`Client secret regenerated for: ${updated.name}`);

    // Return new secret (hanya sekali saat regenerate)
    return baseResponse(res, {
      id: updated.id,
      client_key: updated.client_key,
      client_secret: updated.client_secret, // Hanya di return saat regenerate
    }, 'Client secret berhasil di-regenerate. Simpan secret baru dengan aman!');
  } catch (error) {
    return errorResponse(res, error);
  }
};

/**
 * Delete API client
 */
const remove = async (req, res) => {
  try {
    const { id } = req.params;

    const client = await repository.findById(id);
    if (!client) {
      return emptyDataResponse(res, 1, 0, false);
    }

    await repository.remove(id);

    Logger.info(`API client deleted: ${client.name}`);

    return baseResponse(res, null, 'API client berhasil dihapus');
  } catch (error) {
    return errorResponse(res, error);
  }
};

/**
 * Toggle active status
 */
const toggleStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const client = await repository.findById(id);
    if (!client) {
      return emptyDataResponse(res, 1, 0, false);
    }

    const updated = await repository.update(id, {
      is_active: !client.is_active,
    });

    const { client_secret, ...safeClient } = updated;

    return baseResponse(res, safeClient, `API client berhasil di-${updated.is_active ? 'aktifkan' : 'nonaktifkan'}`);
  } catch (error) {
    return errorResponse(res, error);
  }
};

module.exports = {
  getAll,
  getById,
  register,
  update,
  regenerateSecret,
  remove,
  toggleStatus,
};

