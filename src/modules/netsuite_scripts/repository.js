const db = require('../../config/database');

const TABLE_NAME = 'netsuite_scripts';

/**
 * Repository layer untuk database operations NetSuite Scripts
 */

/**
 * Get script configuration by module and operation (legacy - untuk backward compatibility)
 */
const getScriptConfig = async (module, operation) => {
  return await db(TABLE_NAME)
    .where({ 
      module, 
      operation, 
      is_active: true 
    })
    .first();
};

/**
 * Get script configuration by module only (per module, bukan per operation)
 * Mengambil script ID pertama yang aktif untuk module tersebut
 */
const getScriptConfigByModule = async (module) => {
  return await db(TABLE_NAME)
    .where({ 
      module, 
      is_active: true 
    })
    .first();
};

/**
 * Get all script configurations
 */
const getAllScriptConfigs = async () => {
  return await db(TABLE_NAME)
    .where({ is_active: true })
    .select('*');
};

/**
 * Get script configuration by ID
 */
const getScriptConfigById = async (id) => {
  return await db(TABLE_NAME)
    .where({ id, is_active: true })
    .first();
};

/**
 * Create script configuration
 */
const createScriptConfig = async (data) => {
  const [created] = await db(TABLE_NAME)
    .insert({
      ...data,
      is_active: data.is_active !== undefined ? data.is_active : true,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning('*');
  return created;
};

/**
 * Update script configuration
 */
const updateScriptConfig = async (id, data) => {
  const [updated] = await db(TABLE_NAME)
    .where({ id })
    .update({
      ...data,
      updated_at: new Date(),
    })
    .returning('*');
  return updated;
};

/**
 * Delete script configuration (soft delete)
 */
const deleteScriptConfig = async (id) => {
  const [updated] = await db(TABLE_NAME)
    .where({ id })
    .update({
      is_active: false,
      updated_at: new Date(),
    })
    .returning('*');
  return updated;
};

module.exports = {
  getScriptConfig,
  getScriptConfigByModule,
  getAllScriptConfigs,
  getScriptConfigById,
  createScriptConfig,
  updateScriptConfig,
  deleteScriptConfig,
};

