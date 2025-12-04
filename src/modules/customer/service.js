const repository = require('./repository');
const syncRepository = require('../sync/repository');
const { getCache, setCache, deleteCache, generateCacheKey, CACHE_KEYS, CACHE_TTL, deleteCacheByPattern } = require('../../utils/cache');
const { publishSyncJob } = require('../../utils/rabbitmq-sync');
const { Logger } = require('../../utils/logger');
const { getNetSuiteCustomerService } = require('../../services/netsuite/customer-service');

/**
 * Service layer untuk business logic Customer
 * Memisahkan business logic dari controller
 */

/**
 * Transform customer data untuk response
 */
const transformCustomerForResponse = (customer) => {
  if (!customer) return null;
  
  let entityId = '';
  let companyName = '';
  
  if (customer.data) {
    try {
      const dataObj = typeof customer.data === 'string' ? JSON.parse(customer.data) : customer.data;
      entityId = dataObj.entityId || dataObj.entityid || '';
      companyName = dataObj.companyName || dataObj.companyname || '';
    } catch (e) {
      Logger.warn(`[CUSTOMERS/SERVICE] Failed to parse customer data for id ${customer.id}:`, e);
    }
  }
  
  return {
    id: customer.netsuite_id,
    name: customer.name || '',
    email: customer.email || '',
    phone: customer.phone || '',
    entityId: entityId || customer.name || '',
    companyName: companyName || customer.name || '',
  };
};

/**
 * Sync customers dari NetSuite ke database
 */
const syncCustomersFromNetSuite = async (dbMaxDate) => {
  const netSuiteService = getNetSuiteCustomerService();
  const syncPageSize = 50;
  let allItemsToSync = [];
  let shouldContinueSync = false;
  
  // Jika DB kosong (dbMaxDate null), kita harus sync semua data
  const isDbEmpty = !dbMaxDate;
  
  try {
    Logger.info(`[CUSTOMERS/SERVICE] Hitting NetSuite API (page pertama untuk cek)...`, { 
      pageIndex: 0, 
      pageSize: syncPageSize, 
      lastmodified: dbMaxDate || 'null (DB kosong - akan sync semua data)',
      isDbEmpty
    });
    
    // Jika DB kosong, jangan pass lastmodified parameter agar NetSuite return semua data
    const requestParams = {
      pageIndex: 0,
      pageSize: syncPageSize,
    };
    
    // Hanya pass lastmodified jika DB tidak kosong
    if (!isDbEmpty) {
      requestParams.lastmodified = dbMaxDate;
    }
    
    const firstPageResponse = await netSuiteService.getCustomersPage(requestParams);
    
    Logger.info(`[CUSTOMERS/SERVICE] NetSuite response received: ${firstPageResponse?.items?.length || 0} items`);
    
    if (firstPageResponse && firstPageResponse.items && firstPageResponse.items.length > 0) {
      // Jika DB kosong, langsung sync semua data yang diterima
      if (isDbEmpty) {
        allItemsToSync.push(...firstPageResponse.items);
        Logger.info(`[CUSTOMERS/SERVICE] DB kosong - Ada data dari NetSuite! ${firstPageResponse.items.length} item(s) dari halaman pertama akan di-sync`);
        shouldContinueSync = firstPageResponse.hasMore || false;
      } else {
        // DB tidak kosong, cek apakah ada data baru
        const firstItem = firstPageResponse.items[0];
        const firstItemModifiedDate = firstItem.last_modified_netsuite ? new Date(firstItem.last_modified_netsuite) : null;
        const dbMaxModifiedDate = dbMaxDate ? new Date(dbMaxDate) : null;
        
        if (!dbMaxModifiedDate || (firstItemModifiedDate && firstItemModifiedDate >= dbMaxModifiedDate)) {
          allItemsToSync.push(...firstPageResponse.items);
          Logger.info(`[CUSTOMERS/SERVICE] Ada data baru! ${firstPageResponse.items.length} item(s) dari halaman pertama akan di-sync`);
          shouldContinueSync = firstPageResponse.hasMore || false;
        } else {
          Logger.info(`[CUSTOMERS/SERVICE] Tidak ada data baru, skip sync`);
          shouldContinueSync = false;
        }
      }
    } else {
      if (isDbEmpty) {
        Logger.info(`[CUSTOMERS/SERVICE] DB kosong tapi NetSuite tidak mengembalikan data`);
      }
      shouldContinueSync = false;
    }
  } catch (firstPageError) {
    Logger.error('[CUSTOMERS/SERVICE] Error fetching first page from NetSuite API:', {
      message: firstPageError?.message || 'Unknown error',
      stack: firstPageError?.stack,
    });
    throw firstPageError;
  }
  
  // Fetch halaman selanjutnya jika ada
  let currentPageIndex = 1;
  while (shouldContinueSync) {
    try {
      Logger.info(`[CUSTOMERS/SERVICE] Hitting NetSuite API...`, { 
        pageIndex: currentPageIndex, 
        pageSize: syncPageSize, 
        lastmodified: isDbEmpty ? 'null (DB kosong)' : dbMaxDate 
      });
      
      // Jika DB kosong, jangan pass lastmodified parameter
      const requestParams = {
        pageIndex: currentPageIndex,
        pageSize: syncPageSize,
      };
      
      // Hanya pass lastmodified jika DB tidak kosong
      if (!isDbEmpty) {
        requestParams.lastmodified = dbMaxDate;
      }
      
      const netSuiteResponse = await netSuiteService.getCustomersPage(requestParams);
      
      Logger.info(`[CUSTOMERS/SERVICE] NetSuite response received: ${netSuiteResponse?.items?.length || 0} items`);
      
      if (netSuiteResponse && netSuiteResponse.items && netSuiteResponse.items.length > 0) {
        allItemsToSync.push(...netSuiteResponse.items);
        Logger.info(`[CUSTOMERS/SERVICE] ${netSuiteResponse.items.length} item(s) dari halaman ${currentPageIndex} ditambahkan ke list sync`);
        
        shouldContinueSync = netSuiteResponse.hasMore || false;
        if (shouldContinueSync) {
          currentPageIndex++;
        }
      } else {
        shouldContinueSync = false;
      }
    } catch (netsuiteError) {
      Logger.error('[CUSTOMERS/SERVICE] Error fetching from NetSuite API:', {
        message: netsuiteError?.message || 'Unknown error',
        stack: netsuiteError?.stack,
      });
      shouldContinueSync = false;
      throw netsuiteError;
    }
  }
  
  // Upsert semua data ke DB
  if (allItemsToSync.length > 0) {
    Logger.info(`[CUSTOMERS/SERVICE] Syncing ${allItemsToSync.length} customer(s) from NetSuite to DB`);
    await repository.batchUpsert(allItemsToSync);
    Logger.info(`[CUSTOMERS/SERVICE] Successfully synced ${allItemsToSync.length} customer(s) to DB`);
    
    // Invalidate cache
    await deleteCacheByPattern('customer:list:*');
    for (const item of allItemsToSync) {
      await deleteCache(CACHE_KEYS.CUSTOMER(item.netsuite_id));
    }
    Logger.info(`[CUSTOMERS/SERVICE] Cache invalidated`);
  }
  
  return allItemsToSync.length;
};

/**
 * Get all customers dengan pagination dan filtering
 * Implementasi on-demand incremental sync: cache -> DB -> sync from NetSuite
 */
const getAllCustomers = async (pageIndex = 0, pageSize = 50, lastmodified = null, netsuite_id = null) => {
  // Build filters
  const filters = {};
  if (netsuite_id) filters.netsuite_id = netsuite_id;
  if (lastmodified) filters.lastmodified = lastmodified;

  // Generate cache key
  const cacheKey = generateCacheKey(CACHE_KEYS.CUSTOMER_LIST(''), {
    pageIndex,
    pageSize,
    lastmodified,
    ...filters,
  });

  // Check cache first
  let cachedData = await getCache(cacheKey);
  if (cachedData) {
    Logger.info(`[CUSTOMERS/SERVICE] Cache HIT for customer list: ${cacheKey}`);
    const transformedCachedItems = cachedData.items?.map(item => transformCustomerForResponse(item)) || [];
    return {
      success: true,
      pageIndex,
      pageSize,
      totalRows: cachedData.pagination?.total || transformedCachedItems.length,
      totalPages: cachedData.pagination?.totalPages || (transformedCachedItems.length > 0 ? 1 : 0),
      items: transformedCachedItems,
      fromCache: true,
    };
  }

  // Cache miss, sync dulu dari NetSuite jika diperlukan
  Logger.info(`[CUSTOMERS/SERVICE] Cache MISS for customer list: ${cacheKey}`);
  let syncedCount = 0;
  
  try {
    // Get max last_modified_netsuite dari DB
    let dbMaxDate = null;
    try {
      dbMaxDate = await repository.getMaxLastModified();
      Logger.info(`[CUSTOMERS/SERVICE] DB max last_modified_netsuite: ${dbMaxDate || 'null (DB kosong)'}`);
    } catch (dbError) {
      Logger.error('[CUSTOMERS/SERVICE] Error getting max last_modified from DB:', {
        message: dbError?.message,
        stack: dbError?.stack,
      });
      throw dbError;
    }
    
    // Sync dari NetSuite
    syncedCount = await syncCustomersFromNetSuite(dbMaxDate);
  } catch (syncError) {
    Logger.error('[CUSTOMERS/SERVICE] Error syncing data from NetSuite:', {
      message: syncError?.message || 'Unknown error',
      stack: syncError?.stack,
    });
    // Continue without failing
  }

  // Ambil data dari DB
  Logger.info(`[CUSTOMERS/SERVICE] Fetching data from DB...`);
  let data = await repository.findAll(filters, pageIndex + 1, pageSize);
  Logger.info(`[CUSTOMERS/SERVICE] Data from DB: ${data?.items?.length || 0} items`);

  // Set cache jika ada data
  const finalIsEmpty = !data || !data.items || (Array.isArray(data.items) && data.items.length === 0);
  if (!finalIsEmpty) {
    await setCache(cacheKey, data, CACHE_TTL.CUSTOMER_LIST);
    Logger.info(`[CUSTOMERS/SERVICE] Cache set untuk key: ${cacheKey}`);
  }

  // Transform items untuk response
  const transformedItems = finalIsEmpty ? [] : data.items.map(item => transformCustomerForResponse(item));
  
  // Calculate pagination info
  const totalRows = data?.pagination?.total || transformedItems.length;
  const totalPages = data?.pagination?.totalPages || (totalRows > 0 ? Math.ceil(totalRows / pageSize) : 0);
  
  Logger.info(`[CUSTOMERS/SERVICE] Returning data: ${transformedItems.length} items, totalRows: ${totalRows}, totalPages: ${totalPages}`);
  
  return {
    success: true,
    pageIndex,
    pageSize,
    totalRows: totalRows,
    totalPages: totalPages,
    items: transformedItems,
    syncedCount,
  };
};

/**
 * Get customer by ID
 */
const getCustomerById = async (id) => {
  return await repository.findById(id);
};

/**
 * Get customer by NetSuite ID dengan on-demand sync
 */
const getCustomerByNetSuiteId = async (netsuite_id) => {
  // Check cache first
  const cacheKey = CACHE_KEYS.CUSTOMER(netsuite_id);
  let cachedData = await getCache(cacheKey);
  
  if (cachedData) {
    Logger.info(`[CUSTOMERS/SERVICE] Cache HIT for customer: ${netsuite_id}`);
    
    // Check if stale (older than 12 hours)
    const maxStalenessHours = 12;
    const isStale = !cachedData.last_modified_netsuite ||
      (new Date() - new Date(cachedData.last_modified_netsuite)) > (maxStalenessHours * 60 * 60 * 1000);
    
    let jobId = null;
    if (isStale) {
      // Trigger sync in background
      const result = await publishSyncJob('customer', 'incremental_sync', {
        since: cachedData.last_modified_netsuite,
        page: 1,
        pageSize: 1,
        netsuite_id,
      });
      jobId = result.jobId;
    }
    
    return {
      data: { ...cachedData, fromCache: true },
      syncTriggered: isStale,
      jobId,
    };
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
    
    let jobId = null;
    if (isStale) {
      const result = await publishSyncJob('customer', 'incremental_sync', {
        since: data.last_modified_netsuite,
        page: 1,
        pageSize: 1,
        netsuite_id,
      });
      jobId = result.jobId;
    }
    
    return {
      data,
      syncTriggered: isStale,
      jobId,
    };
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
  
  return {
    data: null,
    syncTriggered: true,
    jobId,
  };
};

/**
 * Create customer di NetSuite dan sync ke database lokal
 */
const createCustomer = async (customerData) => {
  Logger.info('Creating customer in NetSuite', { companyname: customerData.companyname });

  const netSuiteService = getNetSuiteCustomerService();
  const createdCustomer = await netSuiteService.createCustomer(customerData);

  if (!createdCustomer) {
    throw new Error('Gagal membuat customer di NetSuite');
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

  return localCustomer;
};

/**
 * Update customer di NetSuite dan sync ke database lokal
 */
const updateCustomer = async (internalid, customerData) => {
  if (!internalid) {
    throw new Error('internalid diperlukan untuk update customer');
  }

  Logger.info(`Updating customer in NetSuite: ${internalid}`);

  const netSuiteService = getNetSuiteCustomerService();
  const updatedCustomer = await netSuiteService.updateCustomer(internalid, customerData);

  if (!updatedCustomer) {
    throw new Error('Gagal mengupdate customer di NetSuite');
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

  return localCustomer;
};

/**
 * Read customer langsung dari NetSuite
 */
const readCustomerFromNetSuite = async (customerId) => {
  if (!customerId) {
    throw new Error('customerId diperlukan untuk read customer dari NetSuite');
  }

  Logger.info(`Reading customer from NetSuite: ${customerId}`);

  const netSuiteService = getNetSuiteCustomerService();
  const customer = await netSuiteService.getCustomer(customerId);

  if (!customer) {
    return null;
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

  return localCustomer;
};

/**
 * Search customers dari NetSuite
 */
const searchCustomersFromNetSuite = async (pageIndex, pageSize, lastmodified, netsuite_id) => {
  Logger.info('Searching customers from NetSuite', { 
    pageIndex, 
    pageSize, 
    lastmodified, 
    netsuite_id 
  });

  const netSuiteService = getNetSuiteCustomerService();
  const response = await netSuiteService.getCustomersPage({
    pageIndex,
    pageSize,
    lastmodified,
    netsuite_id,
  });

  return response;
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  getCustomerByNetSuiteId,
  createCustomer,
  updateCustomer,
  readCustomerFromNetSuite,
  searchCustomersFromNetSuite,
  transformCustomerForResponse,
};

