const db = require('../../config/database');

const TABLE_NAME = 'netsuite_scripts';

/**
 * Get script configuration by module and operation
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
 * Get all script configurations for a module
 */
const getScriptsByModule = async (module) => {
  return await db(TABLE_NAME)
    .where({ 
      module, 
      is_active: true 
    })
    .orderBy('operation');
};

/**
 * Get all active script configurations
 */
const getAllScripts = async () => {
  return await db(TABLE_NAME)
    .where({ is_active: true })
    .orderBy('module', 'operation');
};

/**
 * Create or update script configuration
 */
const upsertScriptConfig = async (data) => {
  const { module, operation, script_id, deployment_id = '1', description, is_active = true } = data;

  const existing = await db(TABLE_NAME)
    .where({ module, operation })
    .first();

  const now = new Date();

  if (existing) {
    // Update existing
    const [updated] = await db(TABLE_NAME)
      .where({ module, operation })
      .update({
        script_id,
        deployment_id,
        description,
        is_active,
        updated_at: now,
      })
      .returning('*');

    return updated;
  } else {
    // Insert new
    const [created] = await db(TABLE_NAME)
      .insert({
        module,
        operation,
        script_id,
        deployment_id,
        description,
        is_active,
        created_at: now,
        updated_at: now,
      })
      .returning('*');

    return created;
  }
};

/**
 * Delete script configuration (soft delete by setting is_active = false)
 */
const deleteScriptConfig = async (module, operation) => {
  const [updated] = await db(TABLE_NAME)
    .where({ module, operation })
    .update({
      is_active: false,
      updated_at: new Date(),
    })
    .returning('*');

  return updated;
};

module.exports = {
  getScriptConfig,
  getScriptsByModule,
  getAllScripts,
  upsertScriptConfig,
  deleteScriptConfig,
};

