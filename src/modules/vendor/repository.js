const db = require('../../config/database');
const { pgCore, getDbForEnvironment } = require('../../config/database');
const { getCurrentEnvironment } = require('../../utils/environment');

const TABLE_NAME = 'vendors';

/**
 * Repository layer untuk database operations Vendor
 * Hanya berisi operasi database, tidak ada business logic
 */

/**
 * Find all vendors with pagination dan filtering
 */
const findAll = async (filters = {}, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  
  let query = db(TABLE_NAME)
    .select('*')
    .where({ is_deleted: false });

  // Apply filters
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
 * Find vendor by ID
 */
const findById = async (id) => {
  return await db(TABLE_NAME)
    .where({ id, is_deleted: false })
    .first();
};

/**
 * Find vendor by NetSuite ID
 */
const findByNetSuiteId = async (netsuiteId) => {
  return await db(TABLE_NAME)
    .where({ netsuite_id: netsuiteId, is_deleted: false })
    .first();
};

/**
 * Upsert vendor (insert atau update berdasarkan netsuite_id)
 * Hanya update jika last_modified_netsuite lebih baru
 */
const upsert = async (vendorData, trx = null) => {
  const {
    netsuite_id,
    name,
    email,
    phone,
    data,
    last_modified_netsuite,
  } = vendorData;

  // Use transaction if provided, otherwise use regular db
  const queryBuilder = trx ? trx(TABLE_NAME) : db(TABLE_NAME);

  // Check existing vendor
  const existing = await queryBuilder
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

    // Update vendor
    const updateQuery = trx 
      ? trx(TABLE_NAME).where({ netsuite_id })
      : db(TABLE_NAME).where({ netsuite_id });
    
    const [updated] = await updateQuery
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
    // Insert new vendor
    const insertQuery = trx 
      ? trx(TABLE_NAME)
      : db(TABLE_NAME);
    
    const [created] = await insertQuery
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
 * Batch upsert vendors
 */
const batchUpsert = async (vendors) => {
  const results = [];
  
  // Get database connection untuk current environment
  const environment = getCurrentEnvironment();
  const dbConnection = getDbForEnvironment(environment);
  
  // Use transaction untuk atomic operation
  return await dbConnection.transaction(async (trx) => {
    for (const vendor of vendors) {
      const result = await upsert(vendor, trx);
      results.push(result);
    }
    return results;
  });
};

/**
 * Get last modified timestamp untuk vendor tertentu
 */
const getLastModified = async (netsuiteId) => {
  const vendor = await db(TABLE_NAME)
    .select('last_modified_netsuite')
    .where({ netsuite_id: netsuiteId, is_deleted: false })
    .first();
  
  return vendor ? vendor.last_modified_netsuite : null;
};

/**
 * Get maximum last_modified_netsuite untuk semua vendors
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

