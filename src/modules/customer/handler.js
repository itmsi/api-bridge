const repository = require('./postgre_repository');
const syncRepository = require('../sync/postgre_repository');
const { baseResponse, errorResponse, emptyDataResponse } = require('../../utils/response');
const { getCache, setCache, deleteCache, generateCacheKey, CACHE_KEYS, CACHE_TTL, deleteCacheByPattern } = require('../../utils/cache');
const { publishSyncJob } = require('../../utils/rabbitmq-sync');
const { Logger } = require('../../utils/logger');
const { getNetSuiteCustomerService } = require('../../services/netsuite/customer-service');
const { checkAndTriggerIncrementalSync } = require('../../utils/incremental-sync');

/**
 * Transform customer data untuk response
 * Menambahkan entityId dan companyName dari data JSON
 */
const transformCustomerForResponse = (customer) => {
  if (!customer) return null;
  
  // Extract entityId dan companyName dari data JSON
  let entityId = '';
  let companyName = '';
  
  if (customer.data) {
    try {
      const dataObj = typeof customer.data === 'string' ? JSON.parse(customer.data) : customer.data;
      entityId = dataObj.entityId || dataObj.entityid || '';
      companyName = dataObj.companyName || dataObj.companyname || '';
    } catch (e) {
      // Jika data bukan JSON valid, gunakan fallback
      Logger.warn(`[CUSTOMERS/GET] Failed to parse customer data for id ${customer.id}:`, e);
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
 * Get all customers dengan pagination dan filtering
 * Implementasi on-demand incremental sync: cache -> DB -> sync from NetSuite
 * Format request: { pageSize, pageIndex, lastmodified }
 * Format response: { success, pageIndex, pageSize, totalRows, totalPages, items }
 */
const getAll = async (req, res) => {
  try {
    // Hanya terima: pageSize, pageIndex, lastmodified, netsuite_id
    const { 
      pageIndex = 0, 
      pageSize = 50, 
      lastmodified = null,
      netsuite_id = null
    } = req.body;
    
    Logger.info('[CUSTOMERS/GET] Request received', { 
      pageIndex, 
      pageSize, 
      lastmodified,
      netsuite_id 
    });
    
    // Build filters (netsuite_id dan lastmodified dari request body)
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
      Logger.info(`[CUSTOMERS/GET] Cache HIT for customer list: ${cacheKey}`);
      // Transform cached items untuk response
      const transformedCachedItems = cachedData.items?.map(item => transformCustomerForResponse(item)) || [];
      // Return dengan format NetSuite pagination
      return res.status(200).json({
        success: true,
        pageIndex,
        pageSize,
        totalRows: cachedData.pagination?.total || transformedCachedItems.length,
        totalPages: cachedData.pagination?.totalPages || (transformedCachedItems.length > 0 ? 1 : 0),
        items: transformedCachedItems,
      });
    }

    // Cache miss, sync dulu dari NetSuite jika diperlukan
    Logger.info(`[CUSTOMERS/GET] Cache MISS for customer list: ${cacheKey}`);

    // Otomatis hit ke NetSuite dan sync data yang lebih baru
    let syncedCount = 0;
    try {
      const netSuiteService = getNetSuiteCustomerService();
      Logger.info(`[CUSTOMERS/GET] NetSuite service initialized`);
      
      // 1. Get max last_modified_netsuite dari DB
      let dbMaxDate = null;
      try {
        dbMaxDate = await repository.getMaxLastModified();
        Logger.info(`[CUSTOMERS/GET] DB max last_modified_netsuite: ${dbMaxDate || 'null (DB kosong)'}`);
      } catch (dbError) {
        Logger.error('[CUSTOMERS/GET] Error getting max last_modified from DB:', {
          message: dbError?.message,
          stack: dbError?.stack,
        });
        throw dbError;
      }
      
      // 3. Fetch halaman pertama dari NetSuite untuk cek apakah ada data baru
      const syncPageSize = 50; // Fixed page size untuk sync dari NetSuite
      let allItemsToSync = [];
      let shouldContinueSync = false;
      
      try {
        Logger.info(`[CUSTOMERS/GET] Hitting NetSuite API (page pertama untuk cek)...`, { 
          pageIndex: 0, 
          pageSize: syncPageSize, 
          lastmodified: dbMaxDate 
        });
        
        const firstPageResponse = await netSuiteService.getCustomersPage({
          pageIndex: 0,
          pageSize: syncPageSize,
          lastmodified: dbMaxDate,
        });
        
        Logger.info(`[CUSTOMERS/GET] NetSuite response received: ${firstPageResponse?.items?.length || 0} items`);
        
        // 4. Bandingkan item pertama dengan DB max sebelum looping
        if (firstPageResponse && firstPageResponse.items && firstPageResponse.items.length > 0) {
          const firstItem = firstPageResponse.items[0];
          const firstItemModifiedDate = firstItem.last_modified_netsuite ? new Date(firstItem.last_modified_netsuite) : null;
          const dbMaxModifiedDate = dbMaxDate ? new Date(dbMaxDate) : null;
          
          // Jika item pertama lebih baru atau sama dengan DB max atau DB kosong, lanjutkan sync
          if (!dbMaxModifiedDate || (firstItemModifiedDate && firstItemModifiedDate >= dbMaxModifiedDate)) {
            // Ada data baru, tambahkan semua item dari halaman pertama
            allItemsToSync.push(...firstPageResponse.items);
            Logger.info(`[CUSTOMERS/GET] Ada data baru! ${firstPageResponse.items.length} item(s) dari halaman pertama akan di-sync (item pertama: netsuite_id=${firstItem.netsuite_id}, last_modified=${firstItem.last_modified_netsuite})`);
            shouldContinueSync = firstPageResponse.hasMore || false;
          } else {
            // Item pertama lebih lama dari DB max, berarti tidak ada data baru
            Logger.info(`[CUSTOMERS/GET] Tidak ada data baru (item pertama: ${firstItem.last_modified_netsuite}, DB max: ${dbMaxDate}), skip sync`);
            shouldContinueSync = false;
          }
        } else {
          // Response kosong
          Logger.info(`[CUSTOMERS/GET] NetSuite response kosong, tidak ada data untuk di-sync`);
          shouldContinueSync = false;
        }
      } catch (firstPageError) {
        Logger.error('[CUSTOMERS/GET] Error fetching first page from NetSuite API:', {
          message: firstPageError?.message || 'Unknown error',
          stack: firstPageError?.stack,
        });
        throw firstPageError;
      }
      
      // 5. Jika ada data baru dan masih ada halaman berikutnya, lanjutkan looping untuk fetch halaman selanjutnya
      let currentPageIndex = 1; // Mulai dari page 1 karena page 0 sudah di-fetch
      while (shouldContinueSync) {
        try {
          Logger.info(`[CUSTOMERS/GET] Hitting NetSuite API...`, { 
            pageIndex: currentPageIndex, 
            pageSize: syncPageSize, 
            lastmodified: dbMaxDate 
          });
          
          const netSuiteResponse = await netSuiteService.getCustomersPage({
            pageIndex: currentPageIndex,
            pageSize: syncPageSize,
            lastmodified: dbMaxDate,
          });
          
          Logger.info(`[CUSTOMERS/GET] NetSuite response received: ${netSuiteResponse?.items?.length || 0} items`);
          
          if (netSuiteResponse && netSuiteResponse.items && netSuiteResponse.items.length > 0) {
            // Tambahkan semua item dari halaman ini
            allItemsToSync.push(...netSuiteResponse.items);
            Logger.info(`[CUSTOMERS/GET] ${netSuiteResponse.items.length} item(s) dari halaman ${currentPageIndex} ditambahkan ke list sync`);
            
            // Check if there are more pages
            shouldContinueSync = netSuiteResponse.hasMore || false;
            if (shouldContinueSync) {
              currentPageIndex++;
              Logger.info(`[CUSTOMERS/GET] Ada halaman selanjutnya, akan fetch page ${currentPageIndex}`);
            } else {
              Logger.info(`[CUSTOMERS/GET] Tidak ada halaman selanjutnya, selesai fetch dari NetSuite`);
            }
          } else {
            // No more items
            shouldContinueSync = false;
            Logger.info(`[CUSTOMERS/GET] NetSuite response kosong, selesai fetch`);
          }
        } catch (netsuiteError) {
          Logger.error('[CUSTOMERS/GET] Error fetching from NetSuite API:', {
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
          // Stop looping on error
          shouldContinueSync = false;
          throw netsuiteError;
        }
      }
      
      // 6. Upsert semua data yang lebih baru ke DB
      if (allItemsToSync.length > 0) {
        try {
          Logger.info(`[CUSTOMERS/GET] Syncing ${allItemsToSync.length} customer(s) from NetSuite to DB`);
          await repository.batchUpsert(allItemsToSync);
          syncedCount = allItemsToSync.length;
          Logger.info(`[CUSTOMERS/GET] Successfully synced ${syncedCount} customer(s) to DB`);
        
          // Invalidate cache
          await deleteCacheByPattern('customer:list:*');
          for (const item of allItemsToSync) {
            await deleteCache(CACHE_KEYS.CUSTOMER(item.netsuite_id));
          }
          Logger.info(`[CUSTOMERS/GET] Cache invalidated`);
        
          // Set header untuk indikasi sync
          res.setHeader('X-Sync-Triggered', 'true');
          res.setHeader('X-Synced-Count', allItemsToSync.length.toString());
        } catch (dbSyncError) {
          Logger.error('[CUSTOMERS/GET] Error syncing data to DB:', {
            message: dbSyncError?.message,
            stack: dbSyncError?.stack,
            itemsCount: allItemsToSync.length,
          });
          throw dbSyncError;
        }
      } else {
        Logger.info(`[CUSTOMERS/GET] Tidak ada data baru dari NetSuite untuk di-sync`);
      }
    } catch (syncError) {
      // Log error dengan detail lengkap
      Logger.error('[CUSTOMERS/GET] Error syncing data from NetSuite:', {
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

    // Ambil data dari DB (setelah sync jika ada, atau langsung jika tidak ada sync)
    Logger.info(`[CUSTOMERS/GET] Fetching data from DB...`);
    let data = await repository.findAll(filters, pageIndex + 1, pageSize);
    Logger.info(`[CUSTOMERS/GET] Data from DB: ${data?.items?.length || 0} items`);

    // Set cache jika ada data
    const finalIsEmpty = !data || !data.items || (Array.isArray(data.items) && data.items.length === 0);
    if (!finalIsEmpty) {
      await setCache(cacheKey, data, CACHE_TTL.CUSTOMER_LIST);
      Logger.info(`[CUSTOMERS/GET] Cache set untuk key: ${cacheKey}`);
    }

    // Transform items untuk response
    const transformedItems = finalIsEmpty ? [] : data.items.map(item => transformCustomerForResponse(item));
    
    // Calculate pagination info sesuai format NetSuite
    const totalRows = data?.pagination?.total || transformedItems.length;
    const totalPages = data?.pagination?.totalPages || (totalRows > 0 ? Math.ceil(totalRows / pageSize) : 0);
    
    Logger.info(`[CUSTOMERS/GET] Returning data: ${transformedItems.length} items, totalRows: ${totalRows}, totalPages: ${totalPages}`);
    
    // Return dengan format NetSuite pagination
    return res.status(200).json({
      success: true,
      pageIndex,
      pageSize,
      totalRows: totalRows,
      totalPages: totalPages,
      items: transformedItems,
    });
  } catch (error) {
    Logger.error('[CUSTOMERS/GET] Error:', error);
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
 * Format baru: { pageSize, pageIndex, lastmodified }
 */
const searchFromNetSuite = async (req, res) => {
  try {
    // Support both old format (page, since) and new format (pageIndex, lastmodified)
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

    Logger.info('Searching customers from NetSuite', { 
      pageIndex: finalPageIndex, 
      pageSize, 
      lastmodified: finalLastModified, 
      netsuite_id 
    });

    const netSuiteService = getNetSuiteCustomerService();
    const response = await netSuiteService.getCustomersPage({
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

