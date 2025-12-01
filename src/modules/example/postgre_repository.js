const db = require('../../config/database');

const TABLE_NAME = 'examples';

/**
 * Find all items with pagination
 */
const findAll = async (page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  
  const data = await db(TABLE_NAME)
    .select('*')
    .where({ deleted_at: null })
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset);
    
  const totalResult = await db(TABLE_NAME)
    .where({ deleted_at: null })
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
 * Find single item by ID
 */
const findById = async (id) => {
  return await db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .first();
};

/**
 * Find by custom condition
 */
const findOne = async (conditions) => {
  return await db(TABLE_NAME)
    .where({ ...conditions, deleted_at: null })
    .first();
};

/**
 * Create new item
 */
const create = async (data) => {
  const [result] = await db(TABLE_NAME)
    .insert({
      ...data,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    })
    .returning('*');
  return result;
};

/**
 * Update existing item
 */
const update = async (id, data) => {
  const [result] = await db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .update({
      ...data,
      updated_at: db.fn.now()
    })
    .returning('*');
  return result;
};

/**
 * Soft delete item
 */
const remove = async (id) => {
  const [result] = await db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .update({
      deleted_at: db.fn.now()
    })
    .returning('*');
  return result;
};

/**
 * Restore soft deleted item
 */
const restore = async (id) => {
  const [result] = await db(TABLE_NAME)
    .where({ id })
    .whereNotNull('deleted_at')
    .update({
      deleted_at: null,
      updated_at: db.fn.now()
    })
    .returning('*');
  return result;
};

/**
 * Hard delete item (permanent)
 */
const hardDelete = async (id) => {
  return await db(TABLE_NAME)
    .where({ id })
    .del();
};

module.exports = {
  findAll,
  findById,
  findOne,
  create,
  update,
  remove,
  restore,
  hardDelete
};

