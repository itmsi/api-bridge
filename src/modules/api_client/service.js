const repository = require('./repository');
const { Logger } = require('../../utils/logger');

/**
 * Service layer untuk business logic API Client
 */

/**
 * Get all API clients dengan pagination
 */
const getAllClients = async (page = 1, limit = 50) => {
  return await repository.findAll(page, limit);
};

/**
 * Get API client by ID
 */
const getClientById = async (id) => {
  return await repository.findById(id);
};

/**
 * Register new API client
 */
const registerClient = async (data) => {
  // Check if API URL already registered
  const existing = await repository.findByApiUrl(data.api_url);
  if (existing) {
    throw new Error('API URL sudah terdaftar');
  }

  // Create new API client
  const client = await repository.create({
    name: data.name,
    description: data.description,
    api_url: data.api_url,
    ip_whitelist: data.ip_whitelist || null,
    rate_limit_per_minute: data.rate_limit_per_minute || 100,
    rate_limit_per_hour: data.rate_limit_per_hour || 1000,
    notes: data.notes,
  });

  Logger.info(`New API client registered: ${client.name} (${client.api_url})`);

  return client;
};

/**
 * Update API client
 */
const updateClient = async (id, data) => {
  return await repository.update(id, data);
};

/**
 * Regenerate client secret
 */
const regenerateClientSecret = async (id) => {
  const updated = await repository.regenerateSecret(id);
  Logger.info(`Client secret regenerated for: ${updated.name}`);
  return updated;
};

/**
 * Delete API client
 */
const deleteClient = async (id) => {
  const client = await repository.findById(id);
  if (!client) {
    return null;
  }

  await repository.remove(id);
  Logger.info(`API client deleted: ${client.name}`);
  return client;
};

/**
 * Toggle active status
 */
const toggleClientStatus = async (id) => {
  const client = await repository.findById(id);
  if (!client) {
    return null;
  }

  const updated = await repository.update(id, {
    is_active: !client.is_active,
  });

  return updated;
};

module.exports = {
  getAllClients,
  getClientById,
  registerClient,
  updateClient,
  regenerateClientSecret,
  deleteClient,
  toggleClientStatus,
};

