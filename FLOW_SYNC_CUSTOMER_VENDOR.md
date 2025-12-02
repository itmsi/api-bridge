# Flow Sync Get Data Customer dan Vendor

## Deskripsi Umum

Sistem menggunakan **On-Demand Incremental Sync** untuk memastikan data customer dan vendor selalu up-to-date. Flow ini bekerja dengan pola: **Cache → Database → NetSuite API → Sync ke Database**.

Ketika ada request untuk mendapatkan data, sistem akan:
1. Cek cache terlebih dahulu (jika ada, langsung return)
2. Jika cache miss, ambil dari database
3. Otomatis hit ke NetSuite API untuk cek data terbaru
4. Bandingkan data dari NetSuite dengan data di database
5. Sync hanya data yang lebih baru ke database
6. Invalidate cache dan return data terbaru

---

## Flow Sync Customer

### Endpoint
- **Route**: `POST /api/customers/get`
- **File Route**: `src/modules/customer/index.js` (line 12)
- **Handler**: `src/modules/customer/handler.js` (function `getAll`, line 46-261)

### Alur Proses

#### 1. Request Masuk
```46:50:src/modules/customer/handler.js
const getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, email, name, netsuite_id } = req.body;
    
    Logger.info('[CUSTOMERS/GET] Request received', { page, limit, email, name, netsuite_id });
```

#### 2. Build Filters & Generate Cache Key
```52:63:src/modules/customer/handler.js
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
```

#### 3. Check Cache (Cache HIT)
```65:76:src/modules/customer/handler.js
    // Check cache first
    let cachedData = await getCache(cacheKey);
    if (cachedData) {
      Logger.info(`[CUSTOMERS/GET] Cache HIT for customer list: ${cacheKey}`);
      // Transform cached items untuk response
      const transformedCachedItems = cachedData.items?.map(item => transformCustomerForResponse(item)) || [];
      return baseResponse(res, { 
        items: transformedCachedItems,
        pagination: cachedData.pagination,
        fromCache: true,
      });
    }
```

**Jika cache HIT**: Langsung return data dari cache, tidak perlu sync.

#### 4. Cache MISS - Get dari Database
```78:85:src/modules/customer/handler.js
    // Cache miss, get from DB
    Logger.info(`[CUSTOMERS/GET] Cache MISS for customer list: ${cacheKey}`);
    let data = await repository.findAll(filters, page, limit);
    Logger.info(`[CUSTOMERS/GET] Data from DB: ${data?.items?.length || 0} items`);

    // Check if data is empty
    const isEmpty = !data || !data.items || (Array.isArray(data.items) && data.items.length === 0);
    Logger.info(`[CUSTOMERS/GET] Is DB empty: ${isEmpty}`);
```

#### 5. On-Demand Sync dari NetSuite

##### 5.1. Get Max Last Modified dari Database
```93:104:src/modules/customer/handler.js
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
```

**Tujuan**: Mendapatkan tanggal modifikasi terakhir dari database untuk digunakan sebagai parameter `lastmodified` saat fetch dari NetSuite.

##### 5.2. Format Last Modified Parameter
```106:118:src/modules/customer/handler.js
      // 2. Hit ke NetSuite untuk mendapatkan data terbaru
      // Format lastmodified: "DD/MM/YYYY" (hanya tanggal, tanpa waktu)
      let lastmodifiedParam = null;
      if (dbMaxDate) {
        const dbDate = new Date(dbMaxDate);
        const day = String(dbDate.getDate()).padStart(2, '0');
        const month = String(dbDate.getMonth() + 1).padStart(2, '0');
        const year = dbDate.getFullYear();
        lastmodifiedParam = `${day}/${month}/${year}`;
        Logger.info(`[CUSTOMERS/GET] Format lastmodified param: ${lastmodifiedParam}`);
      } else {
        Logger.info(`[CUSTOMERS/GET] DB kosong, akan fetch semua data dari NetSuite`);
      }
```

**Tujuan**: Format tanggal menjadi format yang diminta NetSuite API (`DD/MM/YYYY`). Jika DB kosong, akan fetch semua data.

##### 5.3. Fetch Data dari NetSuite API
```120:149:src/modules/customer/handler.js
      // 3. Fetch data dari NetSuite (page pertama)
      let netSuiteResponse = null;
      try {
        Logger.info(`[CUSTOMERS/GET] Hitting NetSuite API...`, { pageIndex: 0, pageSize: 50, lastmodified: lastmodifiedParam });
        netSuiteResponse = await netSuiteService.getCustomersPage({
        pageIndex: 0,
        pageSize: 50,
        lastmodified: lastmodifiedParam,
      });
        Logger.info(`[CUSTOMERS/GET] NetSuite response received: ${netSuiteResponse?.items?.length || 0} items`);
        Logger.info(`[CUSTOMERS/GET] NetSuite response details:`, {
          hasMore: netSuiteResponse?.hasMore,
          totalResults: netSuiteResponse?.totalResults,
          pageIndex: netSuiteResponse?.pageIndex,
          pageSize: netSuiteResponse?.pageSize,
        });
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
        throw netsuiteError;
      }
```

**Tujuan**: Hit ke NetSuite API untuk mendapatkan data yang dimodifikasi setelah tanggal `lastmodifiedParam`. Fetch page pertama dengan pageSize 50.

##### 5.4. Bandingkan dan Filter Data yang Lebih Baru
```151:166:src/modules/customer/handler.js
      // 4. Bandingkan dan sync data yang lebih baru
      if (netSuiteResponse && netSuiteResponse.items && netSuiteResponse.items.length > 0) {
        const itemsToSync = [];
        
        for (const item of netSuiteResponse.items) {
          const itemModifiedDate = item.last_modified_netsuite ? new Date(item.last_modified_netsuite) : null;
          const dbMaxModifiedDate = dbMaxDate ? new Date(dbMaxDate) : null;
          
          // Jika item lebih baru dari DB max atau DB kosong, tambahkan ke list sync
          if (!dbMaxModifiedDate || (itemModifiedDate && itemModifiedDate > dbMaxModifiedDate)) {
            itemsToSync.push(item);
            Logger.info(`[CUSTOMERS/GET] Item akan di-sync: netsuite_id=${item.netsuite_id}, last_modified=${item.last_modified_netsuite}`);
          } else {
            Logger.info(`[CUSTOMERS/GET] Item di-skip (tidak lebih baru): netsuite_id=${item.netsuite_id}, last_modified=${item.last_modified_netsuite}`);
          }
        }
```

**Tujuan**: Bandingkan setiap item dari NetSuite dengan `dbMaxDate`. Hanya item yang `last_modified_netsuite` lebih baru dari `dbMaxDate` yang akan di-sync.

##### 5.5. Upsert Data ke Database
```168:193:src/modules/customer/handler.js
        // 5. Upsert data yang lebih baru ke DB
        if (itemsToSync.length > 0) {
          try {
            Logger.info(`[CUSTOMERS/GET] Syncing ${itemsToSync.length} customer(s) from NetSuite to DB`);
          await repository.batchUpsert(itemsToSync);
            syncedCount = itemsToSync.length;
            Logger.info(`[CUSTOMERS/GET] Successfully synced ${syncedCount} customer(s) to DB`);
          
          // Invalidate cache
          await deleteCacheByPattern('customer:list:*');
          for (const item of itemsToSync) {
            await deleteCache(CACHE_KEYS.CUSTOMER(item.netsuite_id));
          }
            Logger.info(`[CUSTOMERS/GET] Cache invalidated`);
          
          // Set header untuk indikasi sync
          res.setHeader('X-Sync-Triggered', 'true');
          res.setHeader('X-Synced-Count', itemsToSync.length.toString());
          } catch (dbSyncError) {
            Logger.error('[CUSTOMERS/GET] Error syncing data to DB:', {
              message: dbSyncError?.message,
              stack: dbSyncError?.stack,
              itemsCount: itemsToSync.length,
            });
            throw dbSyncError;
          }
        } else {
          Logger.info(`[CUSTOMERS/GET] Tidak ada data baru dari NetSuite untuk di-sync`);
        }
```

**Tujuan**: 
- Upsert data yang lebih baru ke database menggunakan `batchUpsert`
- Invalidate cache untuk memastikan data terbaru di-fetch pada request berikutnya
- Set header `X-Sync-Triggered` dan `X-Synced-Count` untuk indikasi bahwa sync terjadi

#### 6. Re-fetch Data dari Database (Setelah Sync)
```228:233:src/modules/customer/handler.js
    // Setelah sync, ambil ulang data dari DB untuk memastikan data terbaru
    if (syncedCount > 0) {
      Logger.info(`[CUSTOMERS/GET] Re-fetching data from DB setelah sync...`);
      data = await repository.findAll(filters, page, limit);
      Logger.info(`[CUSTOMERS/GET] Data setelah sync: ${data?.items?.length || 0} items`);
    }
```

**Tujuan**: Jika ada data yang di-sync, ambil ulang data dari database untuk memastikan response mengandung data terbaru.

#### 7. Set Cache & Return Response
```235:256:src/modules/customer/handler.js
    // Set cache jika ada data
    const finalIsEmpty = !data || !data.items || (Array.isArray(data.items) && data.items.length === 0);
    if (!finalIsEmpty) {
      await setCache(cacheKey, data, CACHE_TTL.CUSTOMER_LIST);
      Logger.info(`[CUSTOMERS/GET] Cache set untuk key: ${cacheKey}`);
    }

    // Return empty response jika data kosong
    if (finalIsEmpty) {
      Logger.info(`[CUSTOMERS/GET] Returning empty response`);
      return emptyDataResponse(res, page, limit, true);
    }

    // Transform items untuk response
    const transformedItems = data.items.map(item => transformCustomerForResponse(item));
    
    Logger.info(`[CUSTOMERS/GET] Returning data: ${transformedItems.length} items`);
    return baseResponse(res, { 
      items: transformedItems,
      pagination: data.pagination,
      fromCache: false,
    });
```

**Tujuan**: Set cache untuk request berikutnya dan return response dengan data terbaru.

---

## Flow Sync Vendor

### Endpoint
- **Route**: `POST /api/vendors/get`
- **File Route**: `src/modules/vendor/index.js` (line 11)
- **Handler**: `src/modules/vendor/handler.js` (function `getAll`, line 44-259)

### Alur Proses

Flow sync vendor **IDENTIK** dengan flow sync customer. Perbedaannya hanya pada:
- Module name: `vendor` vs `customer`
- Service: `getNetSuiteVendorService()` vs `getNetSuiteCustomerService()`
- Method: `getVendorsPage()` vs `getCustomersPage()`
- Cache keys: `VENDOR_LIST` vs `CUSTOMER_LIST`

#### 1. Request Masuk
```44:48:src/modules/vendor/handler.js
const getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, email, name, netsuite_id } = req.body;
    
    Logger.info('[VENDORS/GET] Request received', { page, limit, email, name, netsuite_id });
```

#### 2. Check Cache
```63:74:src/modules/vendor/handler.js
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
```

#### 3. Get dari Database
```76:83:src/modules/vendor/handler.js
    // Cache miss, get from DB
    Logger.info(`[VENDORS/GET] Cache MISS for vendor list: ${cacheKey}`);
    let data = await repository.findAll(filters, page, limit);
    Logger.info(`[VENDORS/GET] Data from DB: ${data?.items?.length || 0} items`);

    // Check if data is empty
    const isEmpty = !data || !data.items || (Array.isArray(data.items) && data.items.length === 0);
    Logger.info(`[VENDORS/GET] Is DB empty: ${isEmpty}`);
```

#### 4. On-Demand Sync dari NetSuite

##### 4.1. Get Max Last Modified dari Database
```91:102:src/modules/vendor/handler.js
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
```

##### 4.2. Format Last Modified Parameter
```104:116:src/modules/vendor/handler.js
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
```

##### 4.3. Fetch Data dari NetSuite API
```118:147:src/modules/vendor/handler.js
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
```

##### 4.4. Bandingkan dan Filter Data yang Lebih Baru
```149:164:src/modules/vendor/handler.js
      // 4. Bandingkan dan sync data yang lebih baru
      if (netSuiteResponse && netSuiteResponse.items && netSuiteResponse.items.length > 0) {
        const itemsToSync = [];
        
        for (const item of netSuiteResponse.items) {
          const itemModifiedDate = item.last_modified_netsuite ? new Date(item.last_modified_netsuite) : null;
          const dbMaxModifiedDate = dbMaxDate ? new Date(dbMaxDate) : null;
          
          // Jika item lebih baru dari DB max atau DB kosong, tambahkan ke list sync
          if (!dbMaxModifiedDate || (itemModifiedDate && itemModifiedDate > dbMaxModifiedDate)) {
            itemsToSync.push(item);
            Logger.info(`[VENDORS/GET] Item akan di-sync: netsuite_id=${item.netsuite_id}, last_modified=${item.last_modified_netsuite}`);
          } else {
            Logger.info(`[VENDORS/GET] Item di-skip (tidak lebih baru): netsuite_id=${item.netsuite_id}, last_modified=${item.last_modified_netsuite}`);
          }
        }
```

##### 4.5. Upsert Data ke Database
```166:191:src/modules/vendor/handler.js
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
```

#### 5. Re-fetch Data dari Database
```226:231:src/modules/vendor/handler.js
    // Setelah sync, ambil ulang data dari DB untuk memastikan data terbaru
    if (syncedCount > 0) {
      Logger.info(`[VENDORS/GET] Re-fetching data from DB setelah sync...`);
      data = await repository.findAll(filters, page, limit);
      Logger.info(`[VENDORS/GET] Data setelah sync: ${data?.items?.length || 0} items`);
    }
```

#### 6. Set Cache & Return Response
```233:254:src/modules/vendor/handler.js
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
```

---

## Ringkasan Flow Diagram

```
Request GET Customer/Vendor
    │
    ├─► Check Cache
    │   ├─► Cache HIT → Return dari Cache (tidak sync)
    │   └─► Cache MISS → Continue
    │
    ├─► Get dari Database
    │
    ├─► On-Demand Sync (jika cache miss)
    │   ├─► Get max last_modified_netsuite dari DB
    │   ├─► Format lastmodified param (DD/MM/YYYY)
    │   ├─► Hit NetSuite API dengan lastmodified param
    │   ├─► Bandingkan: item.last_modified_netsuite > dbMaxDate?
    │   ├─► Filter items yang lebih baru
    │   ├─► Batch Upsert ke Database
    │   └─► Invalidate Cache
    │
    ├─► Re-fetch dari Database (jika ada sync)
    │
    ├─► Set Cache
    │
    └─► Return Response
```

---

## Key Points

1. **On-Demand Sync**: Sync hanya terjadi ketika cache miss, tidak setiap request
2. **Incremental Sync**: Hanya sync data yang lebih baru dari `last_modified_netsuite` terakhir di database
3. **Cache First Strategy**: Cache di-check terlebih dahulu untuk performa optimal
4. **Error Handling**: Jika sync error, request tetap berhasil dengan data dari database (tidak fail)
5. **Header Indicators**: Response header `X-Sync-Triggered` dan `X-Synced-Count` menunjukkan apakah sync terjadi

---

## File References

### Customer
- **Handler**: `src/modules/customer/handler.js` (line 46-261)
- **Route**: `src/modules/customer/index.js` (line 12)
- **Repository**: `src/modules/customer/postgre_repository.js`
- **Service**: `src/services/netsuite/customer-service.js`

### Vendor
- **Handler**: `src/modules/vendor/handler.js` (line 44-259)
- **Route**: `src/modules/vendor/index.js` (line 11)
- **Repository**: `src/modules/vendor/postgre_repository.js`
- **Service**: `src/services/netsuite/vendor-service.js`

### Utilities
- **Cache**: `src/utils/cache.js`
- **Incremental Sync Helper**: `src/utils/incremental-sync.js` (line 97-281)

