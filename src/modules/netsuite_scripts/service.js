const repository = require('./repository');
const db = require('../../config/database');
const { Logger } = require('../../utils/logger');

/**
 * Service layer untuk business logic NetSuite Scripts
 */

/**
 * Get all script configurations dengan pagination dan filtering
 */
const getAllScripts = async (page = 1, limit = 50, filters = {}) => {
  try {
    const offset = (page - 1) * limit;
    let query = db('netsuite_scripts');
    
    // Apply filters
    if (filters.module) {
      query = query.where('module', filters.module);
    }
    if (filters.operation) {
      query = query.where('operation', filters.operation);
    }
    if (filters.is_active !== undefined) {
      query = query.where('is_active', filters.is_active);
    }
    
    // Get total count
    const totalResult = await query.clone().count('id as count').first();
    const total = totalResult?.count ? parseInt(totalResult.count) : 0;
    
    // Get data with pagination
    const items = await query
      .select('*')
      .orderBy('module', 'asc')
      .orderBy('operation', 'asc')
      .limit(limit)
      .offset(offset);
    
    const totalPages = total > 0 ? Math.ceil(total / limit) : 0;
    
    return {
      items: items || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        totalPages: totalPages
      }
    };
  } catch (error) {
    Logger.error('[NETSUITE_SCRIPTS/SERVICE] Error getting all scripts:', error);
    throw error;
  }
};

/**
 * Get script configuration by module and operation
 */
const getScriptByModuleAndOperation = async (module, operation) => {
  try {
    const script = await repository.getScriptConfig(module, operation);
    return script;
  } catch (error) {
    Logger.error(`[NETSUITE_SCRIPTS/SERVICE] Error getting script ${module}/${operation}:`, error);
    throw error;
  }
};

/**
 * Get all scripts for a module
 */
const getScriptsByModule = async (module) => {
  try {
    const scripts = await db('netsuite_scripts')
      .where({ module, is_active: true })
      .select('*')
      .orderBy('operation', 'asc');
    return scripts;
  } catch (error) {
    Logger.error(`[NETSUITE_SCRIPTS/SERVICE] Error getting scripts for module ${module}:`, error);
    throw error;
  }
};

/**
 * Create or update script configuration
 */
const upsertScript = async (data) => {
  try {
    const { module, operation } = data;
    
    // Check if script already exists
    const existing = await repository.getScriptConfig(module, operation);
    
    if (existing) {
      // Update existing script
      Logger.info(`[NETSUITE_SCRIPTS/SERVICE] Updating script ${module}/${operation}`);
      const updated = await repository.updateScriptConfig(existing.id, {
        script_id: data.script_id,
        deployment_id: data.deployment_id || '1',
        description: data.description,
        is_active: data.is_active !== undefined ? data.is_active : true,
      });
      return updated;
    } else {
      // Create new script
      Logger.info(`[NETSUITE_SCRIPTS/SERVICE] Creating new script ${module}/${operation}`);
      const created = await repository.createScriptConfig({
        module,
        operation,
        script_id: data.script_id,
        deployment_id: data.deployment_id || '1',
        description: data.description,
        is_active: data.is_active !== undefined ? data.is_active : true,
      });
      return created;
    }
  } catch (error) {
    Logger.error('[NETSUITE_SCRIPTS/SERVICE] Error upserting script:', error);
    throw error;
  }
};

/**
 * Update script configuration by module and operation
 */
const updateScript = async (module, operation, data) => {
  try {
    const existing = await repository.getScriptConfig(module, operation);
    
    if (!existing) {
      throw new Error(`Script configuration not found for ${module}/${operation}`);
    }
    
    const updated = await repository.updateScriptConfig(existing.id, {
      script_id: data.script_id,
      deployment_id: data.deployment_id,
      description: data.description,
      is_active: data.is_active,
    });
    
    return updated;
  } catch (error) {
    Logger.error(`[NETSUITE_SCRIPTS/SERVICE] Error updating script ${module}/${operation}:`, error);
    throw error;
  }
};

/**
 * Delete script configuration (soft delete)
 */
const deleteScript = async (module, operation) => {
  try {
    const existing = await repository.getScriptConfig(module, operation);
    
    if (!existing) {
      throw new Error(`Script configuration not found for ${module}/${operation}`);
    }
    
    const deleted = await repository.deleteScriptConfig(existing.id);
    return deleted;
  } catch (error) {
    Logger.error(`[NETSUITE_SCRIPTS/SERVICE] Error deleting script ${module}/${operation}:`, error);
    throw error;
  }
};

module.exports = {
  getAllScripts,
  getScriptByModuleAndOperation,
  getScriptsByModule,
  upsertScript,
  updateScript,
  deleteScript,
};

