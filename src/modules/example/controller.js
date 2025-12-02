const service = require('./service');
const { baseResponse, errorResponse, emptyDataResponse } = require('../../utils/response');

/**
 * Controller layer untuk HTTP request/response handling
 * Hanya menangani request/response, business logic ada di service
 */

/**
 * Get all items with pagination
 */
const getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const data = await service.getAllItems(page, limit);
    
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
 * Get single item by ID
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await service.getItemById(id);
    
    if (!data) {
      return emptyDataResponse(res, 1, 0, false);
    }
    
    return baseResponse(res, data);
  } catch (error) {
    return errorResponse(res, error);
  }
};

/**
 * Create new item
 */
const create = async (req, res) => {
  try {
    const data = await service.createItem(req.body);
    return baseResponse(res, data, 'Data berhasil dibuat', 201);
  } catch (error) {
    return errorResponse(res, error);
  }
};

/**
 * Update existing item
 */
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await service.updateItem(id, req.body);
    
    if (!data) {
      return emptyDataResponse(res, 1, 0, false);
    }
    
    return baseResponse(res, data, 'Data berhasil diupdate');
  } catch (error) {
    return errorResponse(res, error);
  }
};

/**
 * Soft delete item
 */
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await service.deleteItem(id);
    
    if (!result) {
      return emptyDataResponse(res, 1, 0, false);
    }
    
    return baseResponse(res, null, 'Data berhasil dihapus');
  } catch (error) {
    return errorResponse(res, error);
  }
};

/**
 * Restore soft deleted item
 */
const restore = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await service.restoreItem(id);
    
    if (!data) {
      return emptyDataResponse(res, 1, 0, false);
    }
    
    return baseResponse(res, data, 'Data berhasil direstore');
  } catch (error) {
    return errorResponse(res, error);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  restore
};

