const { publishSyncJob } = require('./rabbitmq-sync');
const { Logger } = require('./logger');

/**
 * Helper function untuk mendapatkan max lastModifiedDate dari NetSuite
 * dengan cara fetch beberapa page pertama dan ambil max-nya
 * 
 * @param {Object} netSuiteService - NetSuite service instance
 * @param {number} maxPages - Maksimal jumlah page yang akan di-fetch (default: 3)
 * @param {number} pageSize - Ukuran page (default: 500)
 * @returns {Promise<Date|null>} Max lastModifiedDate atau null
 */
const getMaxLastModifiedFromNetSuite = async (netSuiteService, maxPages = 3, pageSize = 500) => {
  try {
    let maxDate = null;
    let currentPage = 1;
    let hasMore = true;

    // Tentukan method yang akan digunakan
    let fetchMethod = null;
    if (typeof netSuiteService.searchCustomers === 'function') {
      fetchMethod = (params) => netSuiteService.searchCustomers(params);
    } else if (typeof netSuiteService.getCustomersPage === 'function') {
      fetchMethod = (params) => netSuiteService.getCustomersPage(params);
    } else if (typeof netSuiteService.search === 'function') {
      fetchMethod = (params) => netSuiteService.search(params);
    } else if (typeof netSuiteService.getPage === 'function') {
      fetchMethod = (params) => netSuiteService.getPage(params);
    } else if (typeof netSuiteService.getAll === 'function') {
      fetchMethod = (params) => netSuiteService.getAll(params);
    } else {
      Logger.warn('No suitable fetch method found in NetSuite service');
      return null;
    }

    while (hasMore && currentPage <= maxPages) {
      const response = await fetchMethod({ page: currentPage, pageSize });

      if (!response || !response.items || response.items.length === 0) {
        hasMore = false;
        break;
      }

      // Ambil max lastModifiedDate dari items di page ini
      const dates = response.items
        .map(item => item.last_modified_netsuite || item.lastModifiedDate || item.lastmodifieddate)
        .filter(Boolean)
        .map(date => new Date(date));

      if (dates.length > 0) {
        const pageMaxDate = new Date(Math.max(...dates));
        if (!maxDate || pageMaxDate > maxDate) {
          maxDate = pageMaxDate;
        }
      }

      hasMore = response.hasMore === true;
      currentPage++;
    }

    return maxDate;
  } catch (error) {
    Logger.error('Error getting max lastModifiedDate from NetSuite:', error);
    return null;
  }
};

/**
 * Fungsi reusable untuk Incremental Sync Check (Last Updated Sync)
 * 
 * Fungsi ini akan:
 * 1. Hit ke API NetSuite untuk cek lastupdate all data (mendapatkan max lastModifiedDate)
 * 2. Cek data lastupdate yang ada di DB internal (mendapatkan max last_modified_netsuite)
 * 3. Sync data lebih besar dari lastupdate-nya jika diperlukan
 * 
 * @param {Object} options - Konfigurasi untuk incremental sync check
 * @param {string} options.module - Nama module (e.g., 'customer', 'item', dll)
 * @param {Object} options.netSuiteService - Instance NetSuite service yang memiliki method search/get dengan pagination
 * @param {Object} options.repository - Repository yang memiliki method getMaxLastModified()
 * @param {Object} options.syncRepository - Repository untuk sync tracker
 * @param {number} options.maxStalenessHours - Maksimal jam sebelum data dianggap stale (default: 12)
 * @param {number} options.pageSize - Ukuran page untuk fetch dari NetSuite (default: 500)
 * @param {Function} options.getMaxLastModifiedFromNetSuite - Optional: custom function untuk mendapatkan max lastModifiedDate dari NetSuite
 * @param {boolean} options.forceSync - Force sync meskipun data tidak stale (default: false)
 * @param {string} options.syncType - Tipe sync: 'incremental_sync' atau 'full_sync' (default: 'incremental_sync')
 * 
 * @returns {Promise<Object>} Object dengan informasi sync:
 *   - shouldSync: boolean - apakah sync perlu dilakukan
 *   - syncTriggered: boolean - apakah sync sudah di-trigger
 *   - jobId: string|null - ID job jika sync di-trigger
 *   - netsuiteMaxDate: Date|null - Max lastModifiedDate dari NetSuite
 *   - dbMaxDate: Date|null - Max lastModifiedDate dari DB internal
 *   - reason: string - Alasan mengapa sync di-trigger atau tidak
 */
const checkAndTriggerIncrementalSync = async (options = {}) => {
  const {
    module,
    netSuiteService,
    repository,
    syncRepository,
    maxStalenessHours = 12,
    pageSize = 500,
    getMaxLastModifiedFromNetSuite = null,
    forceSync = false,
    syncType = 'incremental_sync',
  } = options;

  // Validasi required parameters
  if (!module) {
    throw new Error('Module name is required');
  }
  if (!netSuiteService) {
    throw new Error('NetSuite service is required');
  }
  if (!repository) {
    throw new Error('Repository is required');
  }
  if (!syncRepository) {
    throw new Error('Sync repository is required');
  }

  try {
    Logger.info(`Checking incremental sync for module: ${module}`);

    // 1. Get max lastModifiedDate dari DB internal
    let dbMaxDate = null;
    try {
      dbMaxDate = await repository.getMaxLastModified();
      if (dbMaxDate) {
        dbMaxDate = new Date(dbMaxDate);
      }
    } catch (error) {
      Logger.warn(`Error getting max lastModifiedDate from DB for ${module}:`, error);
      // Continue dengan dbMaxDate = null
    }

    // 2. Hit ke API NetSuite untuk cek lastupdate all data
    let netsuiteMaxDate = null;
    let netsuiteHasData = false;

    try {
      if (getMaxLastModifiedFromNetSuite && typeof getMaxLastModifiedFromNetSuite === 'function') {
        // Gunakan custom function jika disediakan
        netsuiteMaxDate = await getMaxLastModifiedFromNetSuite();
        if (netsuiteMaxDate) {
          netsuiteMaxDate = new Date(netsuiteMaxDate);
          netsuiteHasData = true;
        }
      } else {
        // Default: gunakan helper function untuk mendapatkan max lastModifiedDate
        // Fetch beberapa page pertama untuk mendapatkan max yang lebih akurat
        netsuiteMaxDate = await getMaxLastModifiedFromNetSuite(netSuiteService, 3, pageSize);
        if (netsuiteMaxDate) {
          netsuiteHasData = true;
        }
      }
    } catch (error) {
      Logger.error(`Error fetching max lastModifiedDate from NetSuite for ${module}:`, error);
      // Continue dengan netsuiteMaxDate = null
    }

    // 3. Get sync tracker untuk mendapatkan last sync time
    let syncTracker = null;
    try {
      syncTracker = await syncRepository.getSyncTracker(module);
    } catch (error) {
      Logger.warn(`Error getting sync tracker for ${module}:`, error);
    }

    // 4. Tentukan apakah perlu sync
    let shouldSync = false;
    let reason = '';

    if (forceSync) {
      shouldSync = true;
      reason = 'Force sync requested';
    } else if (!dbMaxDate && netsuiteHasData) {
      // Tidak ada data di DB tapi ada data di NetSuite
      shouldSync = true;
      reason = 'No data in DB but data exists in NetSuite';
    } else if (!syncTracker || !syncTracker.last_sync_at) {
      // Belum pernah sync
      shouldSync = true;
      reason = 'No previous sync found';
    } else {
      // Cek apakah data stale berdasarkan last_sync_at
      const lastSyncDate = new Date(syncTracker.last_sync_at);
      const now = new Date();
      const hoursSinceLastSync = (now - lastSyncDate) / (1000 * 60 * 60);

      if (hoursSinceLastSync > maxStalenessHours) {
        shouldSync = true;
        reason = `Data is stale (${hoursSinceLastSync.toFixed(2)} hours since last sync)`;
      } else if (netsuiteMaxDate && dbMaxDate && netsuiteMaxDate > dbMaxDate) {
        // Ada data di NetSuite yang lebih baru dari DB
        shouldSync = true;
        reason = `NetSuite has newer data (NetSuite: ${netsuiteMaxDate.toISOString()}, DB: ${dbMaxDate.toISOString()})`;
      } else if (netsuiteMaxDate && !dbMaxDate) {
        // Ada data di NetSuite tapi tidak ada di DB
        shouldSync = true;
        reason = 'NetSuite has data but DB is empty';
      }
    }

    // 5. Trigger sync jika diperlukan
    let syncTriggered = false;
    let jobId = null;

    if (shouldSync) {
      try {
        // Tentukan since date untuk incremental sync
        let sinceDate = null;
        
        if (syncType === 'incremental_sync') {
          // Gunakan last_sync_at atau last_synced_batch_max dari sync tracker
          sinceDate = syncTracker?.last_synced_batch_max 
            ? new Date(syncTracker.last_synced_batch_max)
            : syncTracker?.last_sync_at 
            ? new Date(syncTracker.last_sync_at)
            : dbMaxDate;
        } else {
          // Full sync, since = null
          sinceDate = null;
        }

        // Publish sync job
        const { jobId: newJobId } = await publishSyncJob(module, syncType, {
          since: sinceDate ? sinceDate.toISOString() : null,
          page: 1,
          pageSize: pageSize,
        });

        // Create job record
        await syncRepository.createSyncJob({
          job_id: newJobId,
          module: module,
          params: {
            since: sinceDate ? sinceDate.toISOString() : null,
            page: 1,
            pageSize: pageSize,
            type: syncType,
          },
          status: 'pending',
          attempts: 0,
        });

        syncTriggered = true;
        jobId = newJobId;

        Logger.info(`Incremental sync triggered for module ${module}: ${newJobId}`, {
          reason,
          since: sinceDate ? sinceDate.toISOString() : null,
        });
      } catch (error) {
        Logger.error(`Error triggering sync for module ${module}:`, error);
        // Continue tanpa throw error, return info bahwa sync gagal di-trigger
      }
    } else {
      Logger.info(`No sync needed for module ${module}`, {
        dbMaxDate: dbMaxDate ? dbMaxDate.toISOString() : null,
        netsuiteMaxDate: netsuiteMaxDate ? netsuiteMaxDate.toISOString() : null,
        lastSyncAt: syncTracker?.last_sync_at ? new Date(syncTracker.last_sync_at).toISOString() : null,
      });
    }

    return {
      shouldSync,
      syncTriggered,
      jobId,
      netsuiteMaxDate: netsuiteMaxDate ? netsuiteMaxDate.toISOString() : null,
      dbMaxDate: dbMaxDate ? dbMaxDate.toISOString() : null,
      reason,
      lastSyncAt: syncTracker?.last_sync_at ? new Date(syncTracker.last_sync_at).toISOString() : null,
    };
  } catch (error) {
    Logger.error(`Error in checkAndTriggerIncrementalSync for module ${module}:`, error);
    throw error;
  }
};

module.exports = {
  checkAndTriggerIncrementalSync,
  getMaxLastModifiedFromNetSuite,
};

