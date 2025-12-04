const service = require('./service');
const { baseResponse, errorResponse, emptyDataResponse } = require('../../utils/response');
const { Logger } = require('../../utils/logger');

/**
 * Controller layer untuk HTTP request/response handling NetSuite Scripts
 */

/**
 * Get all script configurations
 */
const getAll = async (req, res) => {
  try {
    const { page = 1, limit = 50, module, operation, is_active } = req.query;
    
    const filters = {};
    if (module) filters.module = module;
    if (operation) filters.operation = operation;
    if (is_active !== undefined) filters.is_active = is_active === 'true';
    
    const data = await service.getAllScripts(parseInt(page), parseInt(limit), filters);
    
    if (!data || !data.items || (Array.isArray(data.items) && data.items.length === 0)) {
      return emptyDataResponse(res, parseInt(page), parseInt(limit), true);
    }
    
    return baseResponse(res, data);
  } catch (error) {
    Logger.error('[NETSUITE_SCRIPTS/GET] Error:', error);
    return errorResponse(res, error);
  }
};

/**
 * Get script configuration by module and operation
 */
const getByModuleAndOperation = async (req, res) => {
  try {
    const { module, operation } = req.params;
    const script = await service.getScriptByModuleAndOperation(module, operation);
    
    if (!script) {
      return emptyDataResponse(res, 1, 0, false);
    }
    
    return baseResponse(res, script);
  } catch (error) {
    Logger.error('[NETSUITE_SCRIPTS/GET] Error:', error);
    return errorResponse(res, error);
  }
};

/**
 * Get all scripts for a module
 */
const getByModule = async (req, res) => {
  try {
    const { module } = req.params;
    const scripts = await service.getScriptsByModule(module);
    
    if (!scripts || scripts.length === 0) {
      return emptyDataResponse(res, 1, 0, false);
    }
    
    return baseResponse(res, scripts);
  } catch (error) {
    Logger.error('[NETSUITE_SCRIPTS/GET] Error:', error);
    return errorResponse(res, error);
  }
};

/**
 * Create or update script configuration
 */
const create = async (req, res) => {
  try {
    const { module, operation, script_id, deployment_id, description, is_active } = req.body;
    
    // Validation
    if (!module || !operation || !script_id) {
      return errorResponse(res, { 
        message: 'module, operation, dan script_id harus diisi' 
      }, 400);
    }
    
    const script = await service.upsertScript({
      module,
      operation,
      script_id,
      deployment_id,
      description,
      is_active,
    });
    
    return baseResponse(res, script, 'NetSuite script configuration berhasil disimpan', 201);
  } catch (error) {
    Logger.error('[NETSUITE_SCRIPTS/POST] Error:', error);
    return errorResponse(res, error);
  }
};

/**
 * Update script configuration
 */
const update = async (req, res) => {
  try {
    const { module, operation } = req.params;
    const { script_id, deployment_id, description, is_active } = req.body;
    
    const script = await service.updateScript(module, operation, {
      script_id,
      deployment_id,
      description,
      is_active,
    });
    
    return baseResponse(res, script, 'NetSuite script configuration berhasil diupdate');
  } catch (error) {
    Logger.error('[NETSUITE_SCRIPTS/PUT] Error:', error);
    if (error.message.includes('not found')) {
      return errorResponse(res, error, 404);
    }
    return errorResponse(res, error);
  }
};

/**
 * Delete script configuration (soft delete)
 */
const remove = async (req, res) => {
  try {
    const { module, operation } = req.params;
    
    await service.deleteScript(module, operation);
    
    return baseResponse(res, null, 'NetSuite script configuration berhasil dihapus');
  } catch (error) {
    Logger.error('[NETSUITE_SCRIPTS/DELETE] Error:', error);
    if (error.message.includes('not found')) {
      return errorResponse(res, error, 404);
    }
    return errorResponse(res, error);
  }
};

module.exports = {
  getAll,
  getByModuleAndOperation,
  getByModule,
  create,
  update,
  remove,
};

