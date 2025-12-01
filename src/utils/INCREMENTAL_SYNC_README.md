# Incremental Sync Utility

Fungsi reusable untuk implementasi **Incremental Sync (Last Updated Sync)** yang dapat digunakan di semua module.

## Konsep

Fungsi ini mengimplementasikan konsep incremental sync dengan cara:
1. **Hit ke API NetSuite** untuk cek lastupdate all data (mendapatkan max lastModifiedDate)
2. **Cek data lastupdate** yang ada di DB internal (mendapatkan max last_modified_netsuite)
3. **Sync data** yang lebih besar dari lastupdate-nya jika diperlukan

## Penggunaan

### Basic Usage

```javascript
const { checkAndTriggerIncrementalSync } = require('../../utils/incremental-sync');
const { getNetSuiteCustomerService } = require('../../services/netsuite/customer-service');
const repository = require('./postgre_repository');
const syncRepository = require('../sync/postgre_repository');

// Di dalam handler GET
const syncResult = await checkAndTriggerIncrementalSync({
  module: 'customer',
  netSuiteService: getNetSuiteCustomerService(),
  repository: repository,
  syncRepository: syncRepository,
  maxStalenessHours: 12, // Optional, default: 12
  pageSize: 500, // Optional, default: 500
});

if (syncResult.syncTriggered) {
  res.setHeader('X-Sync-Triggered', 'true');
  res.setHeader('X-Job-Id', syncResult.jobId);
}
```

### Advanced Usage dengan Custom Function

```javascript
const { checkAndTriggerIncrementalSync, getMaxLastModifiedFromNetSuite } = require('../../utils/incremental-sync');

// Gunakan custom function untuk mendapatkan max lastModifiedDate
const syncResult = await checkAndTriggerIncrementalSync({
  module: 'item',
  netSuiteService: getNetSuiteItemService(),
  repository: itemRepository,
  syncRepository: syncRepository,
  getMaxLastModifiedFromNetSuite: async () => {
    // Custom logic untuk mendapatkan max lastModifiedDate
    return await getMaxLastModifiedFromNetSuite(getNetSuiteItemService(), 5, 500);
  },
  maxStalenessHours: 24,
  pageSize: 1000,
});
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `module` | string | Yes | - | Nama module (e.g., 'customer', 'item') |
| `netSuiteService` | Object | Yes | - | Instance NetSuite service |
| `repository` | Object | Yes | - | Repository dengan method `getMaxLastModified()` |
| `syncRepository` | Object | Yes | - | Repository untuk sync tracker |
| `maxStalenessHours` | number | No | 12 | Maksimal jam sebelum data dianggap stale |
| `pageSize` | number | No | 500 | Ukuran page untuk fetch dari NetSuite |
| `getMaxLastModifiedFromNetSuite` | Function | No | null | Custom function untuk mendapatkan max lastModifiedDate |
| `forceSync` | boolean | No | false | Force sync meskipun data tidak stale |
| `syncType` | string | No | 'incremental_sync' | Tipe sync: 'incremental_sync' atau 'full_sync' |

## Return Value

```javascript
{
  shouldSync: boolean,        // Apakah sync perlu dilakukan
  syncTriggered: boolean,     // Apakah sync sudah di-trigger
  jobId: string|null,         // ID job jika sync di-trigger
  netsuiteMaxDate: string|null, // Max lastModifiedDate dari NetSuite (ISO string)
  dbMaxDate: string|null,     // Max lastModifiedDate dari DB (ISO string)
  reason: string,             // Alasan mengapa sync di-trigger atau tidak
  lastSyncAt: string|null     // Last sync time dari sync tracker (ISO string)
}
```

## Requirements

### Repository Requirements

Repository harus memiliki method:
- `getMaxLastModified()` - Mengembalikan max `last_modified_netsuite` dari database

Contoh implementasi:
```javascript
const getMaxLastModified = async () => {
  const result = await db(TABLE_NAME)
    .max('last_modified_netsuite as max_date')
    .where({ is_deleted: false })
    .first();
  
  return result ? result.max_date : null;
};
```

### NetSuite Service Requirements

NetSuite service harus memiliki salah satu method berikut:
- `searchCustomers(params)` - Untuk customer service
- `getCustomersPage(params)` - Untuk customer service
- `search(params)` - Generic search method
- `getPage(params)` - Generic get page method
- `getAll(params)` - Generic get all method

Atau gunakan custom function `getMaxLastModifiedFromNetSuite` untuk logic khusus.

## Contoh Implementasi di Module Lain

### Item Module

```javascript
// src/modules/item/handler.js
const { checkAndTriggerIncrementalSync } = require('../../utils/incremental-sync');
const { getNetSuiteItemService } = require('../../services/netsuite/item-service');
const repository = require('./postgre_repository');
const syncRepository = require('../sync/postgre_repository');

const getAll = async (req, res) => {
  try {
    // ... get data dari cache/DB ...
    
    // Check dan trigger incremental sync
    if (data && data.pagination && data.pagination.total > 0) {
      const syncResult = await checkAndTriggerIncrementalSync({
        module: 'item',
        netSuiteService: getNetSuiteItemService(),
        repository: repository,
        syncRepository: syncRepository,
        maxStalenessHours: 24, // Items mungkin lebih jarang update
        pageSize: 500,
      });

      if (syncResult.syncTriggered) {
        res.setHeader('X-Sync-Triggered', 'true');
        res.setHeader('X-Job-Id', syncResult.jobId);
      }
    }
    
    return baseResponse(res, data);
  } catch (error) {
    return errorResponse(res, error);
  }
};
```

## Notes

- Fungsi ini akan secara otomatis:
  - Membandingkan max lastModifiedDate dari NetSuite dengan DB
  - Mengecek apakah data stale berdasarkan `last_sync_at` dari sync tracker
  - Trigger sync job jika diperlukan
  - Membuat job record di database

- Sync akan di-trigger jika:
  - Data tidak ada di DB tapi ada di NetSuite
  - Belum pernah sync sebelumnya
  - Data stale (lebih dari `maxStalenessHours` jam)
  - Ada data di NetSuite yang lebih baru dari DB
  - `forceSync = true`

- Sync tidak akan di-trigger jika:
  - Data masih fresh (kurang dari `maxStalenessHours` jam)
  - Tidak ada data baru di NetSuite
  - DB sudah up-to-date dengan NetSuite

