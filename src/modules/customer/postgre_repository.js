const db = require('../../config/database');

const TABLE_NAME = 'customers';

/**
 * Find all customers with pagination dan filtering
 */
const findAll = async (filters = {}, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  
  let query = db(TABLE_NAME)
    .select('*')
    .where({ is_deleted: false });

  // Apply filters
  if (filters.email) {
    query = query.where('email', 'ilike', `%${filters.email}%`);
  }
  if (filters.name) {
    query = query.where('name', 'ilike', `%${filters.name}%`);
  }
  if (filters.netsuite_id) {
    query = query.where('netsuite_id', filters.netsuite_id);
  }

  const data = await query
    .orderBy('updated_at', 'desc')
    .limit(limit)
    .offset(offset);
    
  const totalResult = await db(TABLE_NAME)
    .where({ is_deleted: false })
    .modify((queryBuilder) => {
      if (filters.email) {
        queryBuilder.where('email', 'ilike', `%${filters.email}%`);
      }
      if (filters.name) {
        queryBuilder.where('name', 'ilike', `%${filters.name}%`);
      }
      if (filters.netsuite_id) {
        queryBuilder.where('netsuite_id', filters.netsuite_id);
      }
    })
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
 * Find customer by ID
 */
const findById = async (id) => {
  return await db(TABLE_NAME)
    .where({ id, is_deleted: false })
    .first();
};

/**
 * Find customer by NetSuite ID
 */
const findByNetSuiteId = async (netsuiteId) => {
  return await db(TABLE_NAME)
    .where({ netsuite_id: netsuiteId, is_deleted: false })
    .first();
};

/**
 * Upsert customer (insert atau update berdasarkan netsuite_id)
 * Hanya update jika last_modified_netsuite lebih baru
 */
const upsert = async (customerData) => {
  const {
    netsuite_id,
    name,
    email,
    phone,
    data,
    last_modified_netsuite,
  } = customerData;

  // Check existing customer
  const existing = await db(TABLE_NAME)
    .where({ netsuite_id })
    .first();

  const now = new Date();
  const netsuiteModifiedDate = last_modified_netsuite 
    ? new Date(last_modified_netsuite) 
    : now;

  if (existing) {
    // Update hanya jika data dari NetSuite lebih baru
    const existingModifiedDate = existing.last_modified_netsuite 
      ? new Date(existing.last_modified_netsuite) 
      : new Date(0);

    if (netsuiteModifiedDate <= existingModifiedDate) {
      // Data tidak lebih baru, skip update
      return existing;
    }

    // Update customer
    const [updated] = await db(TABLE_NAME)
      .where({ netsuite_id })
      .update({
        name,
        email,
        phone,
        data,
        last_modified_netsuite: netsuiteModifiedDate,
        updated_at: now,
      })
      .returning('*');

    return updated;
  } else {
    // Insert new customer
    const [created] = await db(TABLE_NAME)
      .insert({
        netsuite_id,
        name,
        email,
        phone,
        data,
        last_modified_netsuite: netsuiteModifiedDate,
        created_at: now,
        updated_at: now,
      })
      .returning('*');

    return created;
  }
};

/**
 * Batch upsert customers
 */
const batchUpsert = async (customers) => {
  const results = [];
  
  // Use transaction untuk atomic operation
  return await db.transaction(async (trx) => {
    for (const customer of customers) {
      const result = await upsert(customer);
      results.push(result);
    }
    return results;
  });
};

/**
 * Get last modified timestamp untuk customer tertentu
 */
const getLastModified = async (netsuiteId) => {
  const customer = await db(TABLE_NAME)
    .select('last_modified_netsuite')
    .where({ netsuite_id: netsuiteId, is_deleted: false })
    .first();
  
  return customer ? customer.last_modified_netsuite : null;
};

/**
 * Get maximum last_modified_netsuite untuk semua customers
 */
const getMaxLastModified = async () => {
  const result = await db(TABLE_NAME)
    .max('last_modified_netsuite as max_date')
    .where({ is_deleted: false })
    .first();
  
  return result ? result.max_date : null;
};

module.exports = {
  findAll,
  findById,
  findByNetSuiteId,
  upsert,
  batchUpsert,
  getLastModified,
  getMaxLastModified,
};

