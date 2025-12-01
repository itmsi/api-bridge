const repository = require('./postgre_repository');
const syncRepository = require('../sync/postgre_repository');
const { baseResponse, errorResponse, emptyDataResponse } = require('../../utils/response');
const { getCache, setCache, deleteCache, generateCacheKey, CACHE_KEYS, CACHE_TTL, deleteCacheByPattern } = require('../../utils/cache');
const { publishSyncJob } = require('../../utils/rabbitmq-sync');
const { Logger } = require('../../utils/logger');
const { getNetSuiteCustomerService } = require('../../services/netsuite/customer-service');

/**
 * Get all customers dengan pagination dan filtering
 * Implementasi on-demand incremental sync: cache -> DB -> queue if stale
 */
const getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, email, name, netsuite_id } = req.query;
    
    // Build filters
    const filters = {};
    if (email) filters.email = email;
    if (name) filters.name = name;
    if (netsuite_id) filters.netsuite_id = netsuite_id;

    // Generate cache key
    const cacheKey = generateCacheKey(CACHE_KEYS.CUSTOMER_LIST(''), {
      page,
      limit,
      ...filters,
    });

    // Check cache first
    let cachedData = await getCache(cacheKey);
    if (cachedData) {
      Logger.info(`Cache HIT for customer list: ${cacheKey}`);
      return baseResponse(res, { 
        ...cachedData,
        fromCache: true,
      });
    }

    // Cache miss, get from DB
    Logger.info(`Cache MISS for customer list: ${cacheKey}`);
    const data = await repository.findAll(filters, page, limit);

    // Check if data is empty
    if (!data || !data.items || (Array.isArray(data.items) && data.items.length === 0)) {
      return emptyDataResponse(res, page, limit, true);
    }

    // Set cache
    await setCache(cacheKey, data, CACHE_TTL.CUSTOMER_LIST);

    // Check if data is stale dan trigger sync jika diperlukan
    const syncTracker = await syncRepository.getSyncTracker('customer');
    const maxStalenessHours = 12; // Consider data stale after 12 hours
    const shouldSync = !syncTracker || 
      !syncTracker.last_sync_at ||
      (new Date() - new Date(syncTracker.last_sync_at)) > (maxStalenessHours * 60 * 60 * 1000);

    if (shouldSync && data && data.pagination && data.pagination.total > 0) {
      // Trigger incremental sync in background
      const lastSync = syncTracker?.last_sync_at || syncTracker?.last_synced_batch_max;
      
      try {
        const { jobId } = await publishSyncJob('customer', 'incremental_sync', {
          since: lastSync,
          page: 1,
          pageSize: 500,
        });

        // Create job record
        await syncRepository.createSyncJob({
          job_id: jobId,
          module: 'customer',
          params: { since: lastSync, page: 1, pageSize: 500 },
          status: 'pending',
          attempts: 0,
        });

        Logger.info(`Triggered incremental sync job: ${jobId}`);
      } catch (syncError) {
        Logger.error('Error triggering sync:', syncError);
        // Continue without failing the request
      }

      // Return response with sync header
      res.setHeader('X-Sync-Triggered', 'true');
    }

    return baseResponse(res, { 
      ...data,
      fromCache: false,
    });
  } catch (error) {
    return errorResponse(res, error);
  }
};

/**
 * Get customer by ID
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await repository.findById(id);
    
    if (!data) {
      return emptyDataResponse(res, 1, 0, false);
    }
    
    return baseResponse(res, data);
  } catch (error) {
    return errorResponse(res, error);
  }
};

/**
 * Get customer by NetSuite ID dengan on-demand sync
 */
const getByNetSuiteId = async (req, res) => {
  try {
    const { netsuite_id } = req.params;
    
    // Check cache first
    const cacheKey = CACHE_KEYS.CUSTOMER(netsuite_id);
    let cachedData = await getCache(cacheKey);
    
    if (cachedData) {
      Logger.info(`Cache HIT for customer: ${netsuite_id}`);
      
      // Check if stale (older than 12 hours)
      const maxStalenessHours = 12;
      const isStale = !cachedData.last_modified_netsuite ||
        (new Date() - new Date(cachedData.last_modified_netsuite)) > (maxStalenessHours * 60 * 60 * 1000);
      
      if (isStale) {
        // Trigger sync in background
        const { jobId } = await publishSyncJob('customer', 'incremental_sync', {
          since: cachedData.last_modified_netsuite,
          page: 1,
          pageSize: 1,
          netsuite_id, // Specific customer sync
        });
        
        res.setHeader('X-Sync-Triggered', 'true');
        res.setHeader('X-Job-Id', jobId);
      }
      
      return baseResponse(res, { 
        ...cachedData,
        fromCache: true,
      });
    }

    // Cache miss, check DB
    let data = await repository.findByNetSuiteId(netsuite_id);
    
    if (data) {
      // Update cache
      await setCache(cacheKey, data, CACHE_TTL.CUSTOMER);
      
      // Check if stale
      const maxStalenessHours = 12;
      const isStale = !data.last_modified_netsuite ||
        (new Date() - new Date(data.last_modified_netsuite)) > (maxStalenessHours * 60 * 60 * 1000);
      
      if (isStale) {
        // Trigger sync
        const { jobId } = await publishSyncJob('customer', 'incremental_sync', {
          since: data.last_modified_netsuite,
          page: 1,
          pageSize: 1,
          netsuite_id,
        });
        
        res.setHeader('X-Sync-Triggered', 'true');
        res.setHeader('X-Job-Id', jobId);
      }
      
      return baseResponse(res, data);
    }
    
    // Not found in DB, trigger sync
    const { jobId } = await publishSyncJob('customer', 'incremental_sync', {
      since: null,
      page: 1,
      pageSize: 1,
      netsuite_id,
    });
    
    // Create job record
    await syncRepository.createSyncJob({
      job_id: jobId,
      module: 'customer',
      params: { since: null, page: 1, pageSize: 1, netsuite_id },
      status: 'pending',
      attempts: 0,
    });
    
    res.setHeader('X-Sync-Triggered', 'true');
    res.setHeader('X-Job-Id', jobId);
    
    return emptyDataResponse(res, 1, 0, false);
  } catch (error) {
    return errorResponse(res, error);
  }
};

/**
 * Create customer di NetSuite dan sync ke database lokal
 */
const create = async (req, res) => {
  try {
    const customerData = req.body;

    Logger.info('Creating customer in NetSuite', { companyname: customerData.companyname });

    // Create customer di NetSuite
    const netSuiteService = getNetSuiteCustomerService();
    const createdCustomer = await netSuiteService.createCustomer(customerData);

    if (!createdCustomer) {
      return errorResponse(res, { message: 'Gagal membuat customer di NetSuite' }, 500);
    }

    // Upsert ke database lokal
    const localCustomer = await repository.upsert({
      netsuite_id: createdCustomer.netsuite_id,
      name: createdCustomer.name,
      email: createdCustomer.email,
      phone: createdCustomer.phone,
      data: createdCustomer.data,
      last_modified_netsuite: createdCustomer.last_modified_netsuite,
    });

    // Invalidate cache
    await deleteCache(CACHE_KEYS.CUSTOMER(createdCustomer.netsuite_id));
    await deleteCacheByPattern('customer:list:*');

    Logger.info(`Customer created successfully: ${createdCustomer.netsuite_id}`);

    return baseResponse(res, localCustomer, 'Customer berhasil dibuat', 201);
  } catch (error) {
    Logger.error('Error creating customer:', error);
    return errorResponse(res, error);
  }
};

/**
 * Update customer di NetSuite dan sync ke database lokal
 */
const update = async (req, res) => {
  try {
    const { internalid } = req.body; // NetSuite internal ID
    const customerData = req.body;

    if (!internalid) {
      return errorResponse(res, { message: 'internalid diperlukan untuk update customer' }, 400);
    }

    Logger.info(`Updating customer in NetSuite: ${internalid}`);

    // Update customer di NetSuite
    const netSuiteService = getNetSuiteCustomerService();
    const updatedCustomer = await netSuiteService.updateCustomer(internalid, customerData);

    if (!updatedCustomer) {
      return errorResponse(res, { message: 'Gagal mengupdate customer di NetSuite' }, 500);
    }

    // Upsert ke database lokal
    const localCustomer = await repository.upsert({
      netsuite_id: updatedCustomer.netsuite_id,
      name: updatedCustomer.name,
      email: updatedCustomer.email,
      phone: updatedCustomer.phone,
      data: updatedCustomer.data,
      last_modified_netsuite: updatedCustomer.last_modified_netsuite,
    });

    // Invalidate cache
    await deleteCache(CACHE_KEYS.CUSTOMER(updatedCustomer.netsuite_id));
    await deleteCacheByPattern('customer:list:*');

    Logger.info(`Customer updated successfully: ${updatedCustomer.netsuite_id}`);

    return baseResponse(res, localCustomer, 'Customer berhasil diupdate');
  } catch (error) {
    Logger.error('Error updating customer:', error);
    return errorResponse(res, error);
  }
};

/**
 * Read customer langsung dari NetSuite (mirror dari "Customer (Read)" Postman)
 */
const readFromNetSuite = async (req, res) => {
  try {
    const { customerId } = req.query; // NetSuite Customer ID dari query params

    if (!customerId) {
      return errorResponse(res, { message: 'customerId diperlukan untuk read customer dari NetSuite' }, 400);
    }

    Logger.info(`Reading customer from NetSuite: ${customerId}`);

    const netSuiteService = getNetSuiteCustomerService();
    const customer = await netSuiteService.getCustomer(customerId);

    if (!customer) {
      return emptyDataResponse(res, 1, 0, false);
    }

    // Sync ke database lokal jika customer ditemukan
    const localCustomer = await repository.upsert({
      netsuite_id: customer.netsuite_id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      data: customer.data,
      last_modified_netsuite: customer.last_modified_netsuite,
    });

    // Update cache
    await setCache(CACHE_KEYS.CUSTOMER(customer.netsuite_id), localCustomer, CACHE_TTL.CUSTOMER);

    return baseResponse(res, localCustomer);
  } catch (error) {
    Logger.error('Error reading customer from NetSuite:', error);
    return errorResponse(res, error);
  }
};

/**
 * Search customers dari NetSuite dengan POST (Get Customer Page)
 */
const searchFromNetSuite = async (req, res) => {
  try {
    const { page = 1, pageSize = 500, since = null, netsuite_id = null } = req.body;

    Logger.info('Searching customers from NetSuite', { page, pageSize, since, netsuite_id });

    const netSuiteService = getNetSuiteCustomerService();
    const response = await netSuiteService.getCustomersPage({
      page,
      pageSize,
      since,
      netsuite_id,
    });

    // Check if response is empty
    if (!response || (response.items && Array.isArray(response.items) && response.items.length === 0)) {
      return emptyDataResponse(res, page, pageSize || 0, true);
    }

    return baseResponse(res, response);
  } catch (error) {
    Logger.error('Error searching customers from NetSuite:', error);
    return errorResponse(res, error);
  }
};

module.exports = {
  getAll,
  getById,
  getByNetSuiteId,
  readFromNetSuite,
  create,
  update,
  searchFromNetSuite,
};

