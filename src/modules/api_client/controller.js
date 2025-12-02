const service = require('./service');
const { baseResponse, errorResponse, emptyDataResponse } = require('../../utils/response');

/**
 * Controller layer untuk HTTP request/response handling API Client
 */

/**
 * Get all API clients
 */
const getAll = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const data = await service.getAllClients(page, limit);
    
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
    const client = await service.getClientById(id);
    
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

    const client = await service.registerClient({
      name,
      description,
      api_url,
      ip_whitelist,
      rate_limit_per_minute,
      rate_limit_per_hour,
      notes,
    });

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
    if (error.message === 'API URL sudah terdaftar') {
      return errorResponse(res, { message: error.message }, 400);
    }
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

    const updated = await service.updateClient(id, updateData);

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

    const updated = await service.regenerateClientSecret(id);

    if (!updated) {
      return emptyDataResponse(res, 1, 0, false);
    }

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

    const client = await service.deleteClient(id);
    
    if (!client) {
      return emptyDataResponse(res, 1, 0, false);
    }

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

    const updated = await service.toggleClientStatus(id);

    if (!updated) {
      return emptyDataResponse(res, 1, 0, false);
    }

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

