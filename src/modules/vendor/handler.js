const repository = require('./postgre_repository');
const syncRepository = require('../sync/postgre_repository');
const { baseResponse, errorResponse, emptyDataResponse } = require('../../utils/response');
const { getCache, setCache, deleteCache, generateCacheKey, CACHE_KEYS, CACHE_TTL, deleteCacheByPattern } = require('../../utils/cache');
const { Logger } = require('../../utils/logger');
const { getNetSuiteVendorService } = require('../../services/netsuite/vendor-service');

/**
 * Transform vendor data untuk response
 * Menambahkan entityId dan companyName dari data JSON
 */
const transformVendorForResponse = (vendor) => {
  if (!vendor) return null;
  
  // Extract entityId dan companyName dari data JSON
  let entityId = '';
  let companyName = '';
  
  if (vendor.data) {
    try {
      const dataObj = typeof vendor.data === 'string' ? JSON.parse(vendor.data) : vendor.data;
      entityId = dataObj.entityId || dataObj.entityid || '';
      companyName = dataObj.companyName || dataObj.companyname || '';
    } catch (e) {
      // Jika data bukan JSON valid, gunakan fallback
      Logger.warn(`[VENDORS/GET] Failed to parse vendor data for id ${vendor.id}:`, e);
    }
  }
  
  return {
    id: vendor.id,
    name: vendor.name || '',
    email: vendor.email || '',
    phone: vendor.phone || '',
    entityId: entityId || vendor.name || '',
    companyName: companyName || vendor.name || '',
  };
};

/**
 * Get all vendors dengan pagination dan filtering
 * Implementasi on-demand incremental sync: cache -> DB -> sync from NetSuite
 */
const getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, email, name, netsuite_id } = req.body;
    
    Logger.info('[VENDORS/GET] Request received', { page, limit, email, name, netsuite_id });
    
    // Build filters
    const filters = {};
    if (email) filters.email = email;
    if (name) filters.name = name;
    if (netsuite_id) filters.netsuite_id = netsuite_id;

    // Generate cache key
    const cacheKey = generateCacheKey(CACHE_KEYS.VENDOR_LIST(''), {
      page,
      limit,
      ...filters,
    });

    // Check cache first
    let cachedData = await getCache(cacheKey);
    if (cachedData) {
      Logger.info(`[VENDORS/GET] Cache HIT for vendor list: ${cacheKey}`);
      // Transform cached items untuk response
      const transformedCachedItems = cachedData.items?.map(item => transformVendorForResponse(item)) || [];
      return baseResponse(res, { 
        items: transformedCachedItems,
        pagination: cachedData.pagination,
        fromCache: true,
      });
    }

    // Cache miss, get from DB
    Logger.info(`[VENDORS/GET] Cache MISS for vendor list: ${cacheKey}`);
    let data = await repository.findAll(filters, page, limit);
    Logger.info(`[VENDORS/GET] Data from DB: ${data?.items?.length || 0} items`);

    // Check if data is empty
    const isEmpty = !data || !data.items || (Array.isArray(data.items) && data.items.length === 0);
    Logger.info(`[VENDORS/GET] Is DB empty: ${isEmpty}`);

    // Otomatis hit ke NetSuite dan sync data yang lebih baru
    let syncedCount = 0;
    try {
      const netSuiteService = getNetSuiteVendorService();
      Logger.info(`[VENDORS/GET] NetSuite service initialized`);
      
      // 1. Get max last_modified_netsuite dari DB
      let dbMaxDate = null;
      try {
        dbMaxDate = await repository.getMaxLastModified();
        Logger.info(`[VENDORS/GET] DB max last_modified_netsuite: ${dbMaxDate || 'null (DB kosong)'}`);
      } catch (dbError) {
        Logger.error('[VENDORS/GET] Error getting max last_modified from DB:', {
          message: dbError?.message,
          stack: dbError?.stack,
        });
        throw dbError;
      }
      
      // 2. Hit ke NetSuite untuk mendapatkan data terbaru
      // Format lastmodified: "DD/MM/YYYY" (hanya tanggal, tanpa waktu)
      let lastmodifiedParam = null;
      if (dbMaxDate) {
        const dbDate = new Date(dbMaxDate);
        const day = String(dbDate.getDate()).padStart(2, '0');
        const month = String(dbDate.getMonth() + 1).padStart(2, '0');
        const year = dbDate.getFullYear();
        lastmodifiedParam = `${day}/${month}/${year}`;
        Logger.info(`[VENDORS/GET] Format lastmodified param: ${lastmodifiedParam}`);
      } else {
        Logger.info(`[VENDORS/GET] DB kosong, akan fetch semua data dari NetSuite`);
      }
      
      // 3. Fetch data dari NetSuite (page pertama)
      let netSuiteResponse = null;
      try {
        Logger.info(`[VENDORS/GET] Hitting NetSuite API...`, { pageIndex: 0, pageSize: 50, lastmodified: lastmodifiedParam });
        netSuiteResponse = await netSuiteService.getVendorsPage({
          pageIndex: 0,
          pageSize: 50,
          lastmodified: lastmodifiedParam,
        });
        Logger.info(`[VENDORS/GET] NetSuite response received: ${netSuiteResponse?.items?.length || 0} items`);
        Logger.info(`[VENDORS/GET] NetSuite response details:`, {
          hasMore: netSuiteResponse?.hasMore,
          totalResults: netSuiteResponse?.totalResults,
          pageIndex: netSuiteResponse?.pageIndex,
          pageSize: netSuiteResponse?.pageSize,
        });
      } catch (netsuiteError) {
        Logger.error('[VENDORS/GET] Error fetching from NetSuite API:', {
          message: netsuiteError?.message || 'Unknown error',
          stack: netsuiteError?.stack,
          name: netsuiteError?.name,
          code: netsuiteError?.code,
          response: netsuiteError?.response ? {
            status: netsuiteError.response.status,
            statusText: netsuiteError.response.statusText,
            data: netsuiteError.response.data,
          } : null,
        });
        throw netsuiteError;
      }
      
      // 4. Bandingkan dan sync data yang lebih baru
      if (netSuiteResponse && netSuiteResponse.items && netSuiteResponse.items.length > 0) {
        const itemsToSync = [];
        
        for (const item of netSuiteResponse.items) {
          const itemModifiedDate = item.last_modified_netsuite ? new Date(item.last_modified_netsuite) : null;
          const dbMaxModifiedDate = dbMaxDate ? new Date(dbMaxDate) : null;
          
          // Jika item lebih baru atau sama dengan DB max atau DB kosong, tambahkan ke list sync
          if (!dbMaxModifiedDate || (itemModifiedDate && itemModifiedDate >= dbMaxModifiedDate)) {
            itemsToSync.push(item);
            Logger.info(`[VENDORS/GET] Item akan di-sync: netsuite_id=${item.netsuite_id}, last_modified=${item.last_modified_netsuite}`);
          } else {
            Logger.info(`[VENDORS/GET] Item di-skip (tidak lebih baru): netsuite_id=${item.netsuite_id}, last_modified=${item.last_modified_netsuite}`);
          }
        }
        
        // 5. Upsert data yang lebih baru ke DB
        if (itemsToSync.length > 0) {
          try {
            Logger.info(`[VENDORS/GET] Syncing ${itemsToSync.length} vendor(s) from NetSuite to DB`);
            await repository.batchUpsert(itemsToSync);
            syncedCount = itemsToSync.length;
            Logger.info(`[VENDORS/GET] Successfully synced ${syncedCount} vendor(s) to DB`);
          
            // Invalidate cache
            await deleteCacheByPattern('vendor:list:*');
            for (const item of itemsToSync) {
              await deleteCache(CACHE_KEYS.VENDOR(item.netsuite_id));
            }
            Logger.info(`[VENDORS/GET] Cache invalidated`);
          
            // Set header untuk indikasi sync
            res.setHeader('X-Sync-Triggered', 'true');
            res.setHeader('X-Synced-Count', itemsToSync.length.toString());
          } catch (dbSyncError) {
            Logger.error('[VENDORS/GET] Error syncing data to DB:', {
              message: dbSyncError?.message,
              stack: dbSyncError?.stack,
              itemsCount: itemsToSync.length,
            });
            throw dbSyncError;
          }
        } else {
          Logger.info(`[VENDORS/GET] Tidak ada data baru dari NetSuite untuk di-sync`);
        }
      } else {
        Logger.info(`[VENDORS/GET] NetSuite response kosong atau tidak ada items`);
      }
    } catch (syncError) {
      // Log error dengan detail lengkap
      Logger.error('[VENDORS/GET] Error syncing data from NetSuite:', {
        message: syncError?.message || 'Unknown error',
        stack: syncError?.stack,
        name: syncError?.name,
        code: syncError?.code,
        response: syncError?.response ? {
          status: syncError.response.status,
          statusText: syncError.response.statusText,
          data: syncError.response.data,
          headers: syncError.response.headers,
        } : null,
        request: syncError?.request ? {
          method: syncError.request.method,
          url: syncError.request.url,
          headers: syncError.request.headers,
        } : null,
        config: syncError?.config ? {
          url: syncError.config.url,
          method: syncError.config.method,
          timeout: syncError.config.timeout,
        } : null,
        fullError: syncError,
      });
      // Continue without failing the request
    }

    // Setelah sync, ambil ulang data dari DB untuk memastikan data terbaru
    if (syncedCount > 0) {
      Logger.info(`[VENDORS/GET] Re-fetching data from DB setelah sync...`);
      data = await repository.findAll(filters, page, limit);
      Logger.info(`[VENDORS/GET] Data setelah sync: ${data?.items?.length || 0} items`);
    }

    // Set cache jika ada data
    const finalIsEmpty = !data || !data.items || (Array.isArray(data.items) && data.items.length === 0);
    if (!finalIsEmpty) {
      await setCache(cacheKey, data, CACHE_TTL.VENDOR_LIST || CACHE_TTL.CUSTOMER_LIST);
      Logger.info(`[VENDORS/GET] Cache set untuk key: ${cacheKey}`);
    }

    // Return empty response jika data kosong
    if (finalIsEmpty) {
      Logger.info(`[VENDORS/GET] Returning empty response`);
      return emptyDataResponse(res, page, limit, true);
    }

    // Transform items untuk response
    const transformedItems = data.items.map(item => transformVendorForResponse(item));
    
    Logger.info(`[VENDORS/GET] Returning data: ${transformedItems.length} items`);
    return baseResponse(res, { 
      items: transformedItems,
      pagination: data.pagination,
      fromCache: false,
    });
  } catch (error) {
    Logger.error('[VENDORS/GET] Error:', error);
    return errorResponse(res, error);
  }
};

/**
 * Get vendor by ID
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
 * Get vendor by NetSuite ID
 */
const getByNetSuiteId = async (req, res) => {
  try {
    const { netsuite_id } = req.params;
    
    // Check cache first
    const cacheKey = CACHE_KEYS.VENDOR ? CACHE_KEYS.VENDOR(netsuite_id) : `vendor:${netsuite_id}`;
    let cachedData = await getCache(cacheKey);
    
    if (cachedData) {
      Logger.info(`Cache HIT for vendor: ${netsuite_id}`);
      return baseResponse(res, { 
        ...cachedData,
        fromCache: true,
      });
    }

    // Cache miss, check DB
    let data = await repository.findByNetSuiteId(netsuite_id);
    
    if (data) {
      // Update cache
      await setCache(cacheKey, data, CACHE_TTL.VENDOR || CACHE_TTL.CUSTOMER);
      return baseResponse(res, data);
    }
    
    return emptyDataResponse(res, 1, 0, false);
  } catch (error) {
    return errorResponse(res, error);
  }
};

/**
 * Search vendors dari NetSuite dengan POST (Get Vendor Page)
 * Format: { pageSize, pageIndex, lastmodified }
 */
const searchFromNetSuite = async (req, res) => {
  try {
    const { 
      page = null, 
      pageIndex = null, 
      pageSize = 50, 
      since = null, 
      lastmodified = null,
      netsuite_id = null 
    } = req.body;

    // Convert old format to new format
    const finalPageIndex = pageIndex !== null ? pageIndex : (page !== null ? page - 1 : 0);
    const finalLastModified = lastmodified || since;

    Logger.info('Searching vendors from NetSuite', { 
      pageIndex: finalPageIndex, 
      pageSize, 
      lastmodified: finalLastModified, 
      netsuite_id 
    });

    const netSuiteService = getNetSuiteVendorService();
    const response = await netSuiteService.getVendorsPage({
      pageIndex: finalPageIndex,
      pageSize,
      lastmodified: finalLastModified,
      netsuite_id,
    });

    // Check if response is empty
    if (!response || (response.items && Array.isArray(response.items) && response.items.length === 0)) {
      return emptyDataResponse(res, finalPageIndex + 1, pageSize || 0, true);
    }

    return baseResponse(res, response);
  } catch (error) {
    Logger.error('Error searching vendors from NetSuite:', error);
    return errorResponse(res, error);
  }
};

module.exports = {
  getAll,
  getById,
  getByNetSuiteId,
  searchFromNetSuite,
};

