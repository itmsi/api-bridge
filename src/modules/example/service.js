const repository = require('./repository');

/**
 * Service layer untuk business logic
 * Memisahkan business logic dari controller
 */

/**
 * Get all items dengan pagination
 */
const getAllItems = async (page = 1, limit = 10) => {
  return await repository.findAll(page, limit);
};

/**
 * Get single item by ID
 */
const getItemById = async (id) => {
  return await repository.findById(id);
};

/**
 * Create new item
 */
const createItem = async (data) => {
  return await repository.create(data);
};

/**
 * Update existing item
 */
const updateItem = async (id, data) => {
  return await repository.update(id, data);
};

/**
 * Soft delete item
 */
const deleteItem = async (id) => {
  return await repository.remove(id);
};

/**
 * Restore soft deleted item
 */
const restoreItem = async (id) => {
  return await repository.restore(id);
};

module.exports = {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  restoreItem,
};

