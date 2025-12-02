const repository = require('./repository');
const syncRepository = require('../sync/repository');
const { getCache, setCache, deleteCache, generateCacheKey, CACHE_KEYS, CACHE_TTL, deleteCacheByPattern } = require('../../utils/cache');
const { publishSyncJob } = require('../../utils/rabbitmq-sync');
const { Logger } = require('../../utils/logger');
const { getNetSuiteVendorService } = require('../../services/netsuite/vendor-service');

/**
 * Service layer untuk business logic Vendor
 * Memisahkan business logic dari controller
 */

/**
 * Transform vendor data untuk response
 */
const transformVendorForResponse = (vendor) => {
  if (!vendor) return null;
  
  let entityId = '';
  let companyName = '';
  
  if (vendor.data) {
    try {
      const dataObj = typeof vendor.data === 'string' ? JSON.parse(vendor.data) : vendor.data;
      entityId = dataObj.entityId || dataObj.entityid || '';
      companyName = dataObj.companyName || dataObj.companyname || '';
    } catch (e) {
      Logger.warn(`[VENDORS/SERVICE] Failed to parse vendor data for id ${vendor.id}:`, e);
    }
  }
  
  return {
    id: vendor.netsuite_id,
    name: vendor.name || '',
    email: vendor.email || '',
    phone: vendor.phone || '',
    entityId: entityId || vendor.name || '',
    companyName: companyName || vendor.name || '',
  };
};

/**
 * Sync vendors dari NetSuite ke database
 */
const syncVendorsFromNetSuite = async (dbMaxDate) => {
  const netSuiteService = getNetSuiteVendorService();
  const syncPageSize = 50;
  let allItemsToSync = [];
  let shouldContinueSync = false;
  
  try {
    Logger.info(`[VENDORS/SERVICE] Hitting NetSuite API (page pertama untuk cek)...`, { 
      pageIndex: 0, 
      pageSize: syncPageSize, 
      lastmodified: dbMaxDate 
    });
    
    const firstPageResponse = await netSuiteService.getVendorsPage({
      pageIndex: 0,
      pageSize: syncPageSize,
      lastmodified: dbMaxDate,
    });
    
    Logger.info(`[VENDORS/SERVICE] NetSuite response received: ${firstPageResponse?.items?.length || 0} items`);
    
    if (firstPageResponse && firstPageResponse.items && firstPageResponse.items.length > 0) {
      const firstItem = firstPageResponse.items[0];
      const firstItemModifiedDate = firstItem.last_modified_netsuite ? new Date(firstItem.last_modified_netsuite) : null;
      const dbMaxModifiedDate = dbMaxDate ? new Date(dbMaxDate) : null;
      
      if (!dbMaxModifiedDate || (firstItemModifiedDate && firstItemModifiedDate >= dbMaxModifiedDate)) {
        allItemsToSync.push(...firstPageResponse.items);
        Logger.info(`[VENDORS/SERVICE] Ada data baru! ${firstPageResponse.items.length} item(s) dari halaman pertama akan di-sync`);
        shouldContinueSync = firstPageResponse.hasMore || false;
      } else {
        Logger.info(`[VENDORS/SERVICE] Tidak ada data baru, skip sync`);
        shouldContinueSync = false;
      }
    } else {
      shouldContinueSync = false;
    }
  } catch (firstPageError) {
    Logger.error('[VENDORS/SERVICE] Error fetching first page from NetSuite API:', {
      message: firstPageError?.message || 'Unknown error',
      stack: firstPageError?.stack,
    });
    throw firstPageError;
  }
  
  // Fetch halaman selanjutnya jika ada
  let currentPageIndex = 1;
  while (shouldContinueSync) {
    try {
      Logger.info(`[VENDORS/SERVICE] Hitting NetSuite API...`, { 
        pageIndex: currentPageIndex, 
        pageSize: syncPageSize, 
        lastmodified: dbMaxDate 
      });
      
      const netSuiteResponse = await netSuiteService.getVendorsPage({
        pageIndex: currentPageIndex,
        pageSize: syncPageSize,
        lastmodified: dbMaxDate,
      });
      
      Logger.info(`[VENDORS/SERVICE] NetSuite response received: ${netSuiteResponse?.items?.length || 0} items`);
      
      if (netSuiteResponse && netSuiteResponse.items && netSuiteResponse.items.length > 0) {
        allItemsToSync.push(...netSuiteResponse.items);
        Logger.info(`[VENDORS/SERVICE] ${netSuiteResponse.items.length} item(s) dari halaman ${currentPageIndex} ditambahkan ke list sync`);
        
        shouldContinueSync = netSuiteResponse.hasMore || false;
        if (shouldContinueSync) {
          currentPageIndex++;
        }
      } else {
        shouldContinueSync = false;
      }
    } catch (netsuiteError) {
      Logger.error('[VENDORS/SERVICE] Error fetching from NetSuite API:', {
        message: netsuiteError?.message || 'Unknown error',
        stack: netsuiteError?.stack,
      });
      shouldContinueSync = false;
      throw netsuiteError;
    }
  }
  
  // Upsert semua data ke DB
  if (allItemsToSync.length > 0) {
    Logger.info(`[VENDORS/SERVICE] Syncing ${allItemsToSync.length} vendor(s) from NetSuite to DB`);
    await repository.batchUpsert(allItemsToSync);
    Logger.info(`[VENDORS/SERVICE] Successfully synced ${allItemsToSync.length} vendor(s) to DB`);
    
    // Invalidate cache
    await deleteCacheByPattern('vendor:list:*');
    for (const item of allItemsToSync) {
      await deleteCache(CACHE_KEYS.CUSTOMER(item.netsuite_id));
    }
    Logger.info(`[VENDORS/SERVICE] Cache invalidated`);
  }
  
  return allItemsToSync.length;
};

/**
 * Get all vendors dengan pagination dan filtering
 * Implementasi on-demand incremental sync: cache -> DB -> sync from NetSuite
 */
const getAllVendors = async (pageIndex = 0, pageSize = 50, lastmodified = null, netsuite_id = null) => {
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
    Logger.info(`[VENDORS/SERVICE] Cache HIT for vendor list: ${cacheKey}`);
    const transformedCachedItems = cachedData.items?.map(item => transformVendorForResponse(item)) || [];
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
  Logger.info(`[VENDORS/SERVICE] Cache MISS for vendor list: ${cacheKey}`);
  let syncedCount = 0;
  
  try {
    // Get max last_modified_netsuite dari DB
    let dbMaxDate = null;
    try {
      dbMaxDate = await repository.getMaxLastModified();
      Logger.info(`[VENDORS/SERVICE] DB max last_modified_netsuite: ${dbMaxDate || 'null (DB kosong)'}`);
    } catch (dbError) {
      Logger.error('[VENDORS/SERVICE] Error getting max last_modified from DB:', {
        message: dbError?.message,
        stack: dbError?.stack,
      });
      throw dbError;
    }
    
    // Sync dari NetSuite
    syncedCount = await syncVendorsFromNetSuite(dbMaxDate);
  } catch (syncError) {
    Logger.error('[VENDORS/SERVICE] Error syncing data from NetSuite:', {
      message: syncError?.message || 'Unknown error',
      stack: syncError?.stack,
    });
    // Continue without failing
  }

  // Ambil data dari DB
  Logger.info(`[VENDORS/SERVICE] Fetching data from DB...`);
  let data = await repository.findAll(filters, pageIndex + 1, pageSize);
  Logger.info(`[VENDORS/SERVICE] Data from DB: ${data?.items?.length || 0} items`);

  // Set cache jika ada data
  const finalIsEmpty = !data || !data.items || (Array.isArray(data.items) && data.items.length === 0);
  if (!finalIsEmpty) {
    await setCache(cacheKey, data, CACHE_TTL.CUSTOMER_LIST);
    Logger.info(`[VENDORS/SERVICE] Cache set untuk key: ${cacheKey}`);
  }

  // Transform items untuk response
  const transformedItems = finalIsEmpty ? [] : data.items.map(item => transformVendorForResponse(item));
  
  // Calculate pagination info
  const totalRows = data?.pagination?.total || transformedItems.length;
  const totalPages = data?.pagination?.totalPages || (totalRows > 0 ? Math.ceil(totalRows / pageSize) : 0);
  
  Logger.info(`[VENDORS/SERVICE] Returning data: ${transformedItems.length} items, totalRows: ${totalRows}, totalPages: ${totalPages}`);
  
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
 * Get vendor by ID
 */
const getVendorById = async (id) => {
  return await repository.findById(id);
};

/**
 * Get vendor by NetSuite ID dengan on-demand sync
 */
const getVendorByNetSuiteId = async (netsuite_id) => {
  // Check cache first
  const cacheKey = CACHE_KEYS.CUSTOMER(netsuite_id);
  let cachedData = await getCache(cacheKey);
  
  if (cachedData) {
    Logger.info(`[VENDORS/SERVICE] Cache HIT for vendor: ${netsuite_id}`);
    
    // Check if stale (older than 12 hours)
    const maxStalenessHours = 12;
    const isStale = !cachedData.last_modified_netsuite ||
      (new Date() - new Date(cachedData.last_modified_netsuite)) > (maxStalenessHours * 60 * 60 * 1000);
    
    let jobId = null;
    if (isStale) {
      // Trigger sync in background
      const result = await publishSyncJob('vendor', 'incremental_sync', {
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
      const result = await publishSyncJob('vendor', 'incremental_sync', {
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
  const { jobId } = await publishSyncJob('vendor', 'incremental_sync', {
    since: null,
    page: 1,
    pageSize: 1,
    netsuite_id,
  });
  
  // Create job record
  await syncRepository.createSyncJob({
    job_id: jobId,
    module: 'vendor',
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
 * Create vendor di NetSuite dan sync ke database lokal
 */
const createVendor = async (vendorData) => {
  Logger.info('Creating vendor in NetSuite', { companyname: vendorData.companyname });

  const netSuiteService = getNetSuiteVendorService();
  const createdVendor = await netSuiteService.createVendor(vendorData);

  if (!createdVendor) {
    throw new Error('Gagal membuat vendor di NetSuite');
  }

  // Upsert ke database lokal
  const localVendor = await repository.upsert({
    netsuite_id: createdVendor.netsuite_id,
    name: createdVendor.name,
    email: createdVendor.email,
    phone: createdVendor.phone,
    data: createdVendor.data,
    last_modified_netsuite: createdVendor.last_modified_netsuite,
  });

  // Invalidate cache
  await deleteCache(CACHE_KEYS.CUSTOMER(createdVendor.netsuite_id));
  await deleteCacheByPattern('vendor:list:*');

  Logger.info(`Vendor created successfully: ${createdVendor.netsuite_id}`);

  return localVendor;
};

/**
 * Update vendor di NetSuite dan sync ke database lokal
 */
const updateVendor = async (internalid, vendorData) => {
  if (!internalid) {
    throw new Error('internalid diperlukan untuk update vendor');
  }

  Logger.info(`Updating vendor in NetSuite: ${internalid}`);

  const netSuiteService = getNetSuiteVendorService();
  const updatedVendor = await netSuiteService.updateVendor(internalid, vendorData);

  if (!updatedVendor) {
    throw new Error('Gagal mengupdate vendor di NetSuite');
  }

  // Upsert ke database lokal
  const localVendor = await repository.upsert({
    netsuite_id: updatedVendor.netsuite_id,
    name: updatedVendor.name,
    email: updatedVendor.email,
    phone: updatedVendor.phone,
    data: updatedVendor.data,
    last_modified_netsuite: updatedVendor.last_modified_netsuite,
  });

  // Invalidate cache
  await deleteCache(CACHE_KEYS.CUSTOMER(updatedVendor.netsuite_id));
  await deleteCacheByPattern('vendor:list:*');

  Logger.info(`Vendor updated successfully: ${updatedVendor.netsuite_id}`);

  return localVendor;
};

/**
 * Read vendor langsung dari NetSuite
 */
const readVendorFromNetSuite = async (vendorId) => {
  if (!vendorId) {
    throw new Error('vendorId diperlukan untuk read vendor dari NetSuite');
  }

  Logger.info(`Reading vendor from NetSuite: ${vendorId}`);

  const netSuiteService = getNetSuiteVendorService();
  const vendor = await netSuiteService.getVendor(vendorId);

  if (!vendor) {
    return null;
  }

  // Sync ke database lokal jika vendor ditemukan
  const localVendor = await repository.upsert({
    netsuite_id: vendor.netsuite_id,
    name: vendor.name,
    email: vendor.email,
    phone: vendor.phone,
    data: vendor.data,
    last_modified_netsuite: vendor.last_modified_netsuite,
  });

  // Update cache
  await setCache(CACHE_KEYS.CUSTOMER(vendor.netsuite_id), localVendor, CACHE_TTL.CUSTOMER);

  return localVendor;
};

/**
 * Search vendors dari NetSuite
 */
const searchVendorsFromNetSuite = async (pageIndex, pageSize, lastmodified, netsuite_id) => {
  Logger.info('Searching vendors from NetSuite', { 
    pageIndex, 
    pageSize, 
    lastmodified, 
    netsuite_id 
  });

  const netSuiteService = getNetSuiteVendorService();
  const response = await netSuiteService.getVendorsPage({
    pageIndex,
    pageSize,
    lastmodified,
    netsuite_id,
  });

  return response;
};

module.exports = {
  getAllVendors,
  getVendorById,
  getVendorByNetSuiteId,
  createVendor,
  updateVendor,
  readVendorFromNetSuite,
  searchVendorsFromNetSuite,
  transformVendorForResponse,
};

