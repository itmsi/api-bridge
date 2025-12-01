# NetSuite Scripts Configuration

Sistem konfigurasi script ID NetSuite yang disimpan di database, memungkinkan setiap module dan operation memiliki script ID yang berbeda. Sistem ini lebih fleksibel dibandingkan menyimpan script ID di `.env` file.

## 📋 Daftar Isi

1. [Setup Awal](#setup-awal)
2. [Cara Menggunakan](#cara-menggunakan)
3. [Menambah Script ID untuk Module Baru](#menambah-script-id-untuk-module-baru)
4. [Mengubah Script ID yang Sudah Ada](#mengubah-script-id-yang-sudah-ada)
5. [Menggunakan di Service](#menggunakan-di-service)
6. [Contoh Implementasi Module Baru](#contoh-implementasi-module-baru)
7. [API Endpoints](#api-endpoints)

---

## 🚀 Setup Awal

### 1. Jalankan Migration

Jalankan migration untuk membuat tabel `netsuite_scripts`:

```bash
npm run migrate
```

### 2. Jalankan Seeder (Opsional)

Jalankan seeder untuk menambahkan data default berdasarkan Postman collection:

```bash
npm run seed
```

Seeder akan menambahkan konfigurasi default:
- `customer:read` → script 472
- `customer:create` → script 472
- `customer:update` → script 472
- `customer:getPage` → script 532

---

## 📖 Cara Menggunakan

### Struktur Database

Tabel `netsuite_scripts` memiliki struktur berikut:

```sql
CREATE TABLE netsuite_scripts (
  id SERIAL PRIMARY KEY,
  module VARCHAR(100) NOT NULL,        -- Nama module (e.g., 'customer', 'order')
  operation VARCHAR(100) NOT NULL,      -- Nama operation (e.g., 'read', 'create', 'getPage')
  script_id VARCHAR(50) NOT NULL,       -- NetSuite Script ID
  deployment_id VARCHAR(50) DEFAULT '1', -- NetSuite Deployment ID
  description TEXT,                      -- Deskripsi
  is_active BOOLEAN DEFAULT true,       -- Status aktif
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(module, operation)
);
```

### Format Module dan Operation

- **Module**: Nama module dalam lowercase (e.g., `customer`, `order`, `item`, `invoice`)
- **Operation**: Nama operation dalam lowercase (e.g., `read`, `create`, `update`, `getPage`, `search`, `sync`)

---

## ➕ Menambah Script ID untuk Module Baru

### Metode 1: Via API (Recommended)

Gunakan endpoint POST untuk menambahkan script configuration:

```bash
curl -X POST http://localhost:3000/api/admin/netsuite-scripts \
  -H "Content-Type: application/json" \
  -H "X-Client-Key: your-api-key" \
  -H "X-Client-Secret: your-api-secret" \
  -d '{
    "module": "order",
    "operation": "getPage",
    "script_id": "533",
    "deployment_id": "1",
    "description": "Get Order Page - Get paginated order list from NetSuite",
    "is_active": true
  }'
```

### Metode 2: Via Database (Direct SQL)

```sql
INSERT INTO netsuite_scripts (module, operation, script_id, deployment_id, description, is_active)
VALUES ('order', 'getPage', '533', '1', 'Get Order Page - Get paginated order list from NetSuite', true);
```

### Metode 3: Via Code (Repository)

```javascript
const netsuiteScriptsRepo = require('./modules/netsuite_scripts');

// Upsert script configuration
await netsuiteScriptsRepo.upsertScriptConfig({
  module: 'order',
  operation: 'getPage',
  script_id: '533',
  deployment_id: '1',
  description: 'Get Order Page - Get paginated order list from NetSuite',
  is_active: true
});
```

### Contoh: Menambah Multiple Operations untuk Module Baru

```javascript
const netsuiteScriptsRepo = require('./modules/netsuite_scripts');

const orderScripts = [
  {
    module: 'order',
    operation: 'read',
    script_id: '474',
    deployment_id: '1',
    description: 'Order (Read) - Read order from NetSuite',
    is_active: true
  },
  {
    module: 'order',
    operation: 'create',
    script_id: '474',
    deployment_id: '1',
    description: 'Order (Create) - Create new order in NetSuite',
    is_active: true
  },
  {
    module: 'order',
    operation: 'update',
    script_id: '474',
    deployment_id: '1',
    description: 'Order (Update) - Update order in NetSuite',
    is_active: true
  },
  {
    module: 'order',
    operation: 'getPage',
    script_id: '533',
    deployment_id: '1',
    description: 'Get Order Page - Get paginated order list from NetSuite',
    is_active: true
  },
  {
    module: 'order',
    operation: 'sync',
    script_id: '534',
    deployment_id: '1',
    description: 'Order Sync - Sync orders from NetSuite',
    is_active: true
  }
];

// Insert semua sekaligus
for (const script of orderScripts) {
  await netsuiteScriptsRepo.upsertScriptConfig(script);
}
```

---

## ✏️ Mengubah Script ID yang Sudah Ada

### Metode 1: Via API (Recommended)

Gunakan endpoint PUT untuk mengupdate script configuration:

```bash
curl -X PUT http://localhost:3000/api/admin/netsuite-scripts/customer/getPage \
  -H "Content-Type: application/json" \
  -H "X-Client-Key: your-api-key" \
  -H "X-Client-Secret: your-api-secret" \
  -d '{
    "script_id": "535",
    "deployment_id": "1",
    "description": "Get Customer Page - Updated script ID",
    "is_active": true
  }'
```

### Metode 2: Via Database (Direct SQL)

```sql
UPDATE netsuite_scripts
SET 
  script_id = '535',
  deployment_id = '1',
  description = 'Get Customer Page - Updated script ID',
  updated_at = NOW()
WHERE module = 'customer' AND operation = 'getPage';
```

### Metode 3: Via Code (Repository)

```javascript
const netsuiteScriptsRepo = require('./modules/netsuite_scripts');

// Update script configuration
await netsuiteScriptsRepo.upsertScriptConfig({
  module: 'customer',
  operation: 'getPage',
  script_id: '535',  // Script ID baru
  deployment_id: '1',
  description: 'Get Customer Page - Updated script ID',
  is_active: true
});
```

**Catatan**: Sistem menggunakan caching (5 menit), jadi perubahan akan terlihat setelah cache expired atau setelah restart aplikasi.

---

## 🔧 Menggunakan di Service

### 1. Import getScriptConfig

```javascript
const { getScriptConfig } = require('../../config/netsuite');
```

### 2. Gunakan di Method Service

```javascript
async getCustomersPage(params = {}) {
  try {
    // ... build request body ...

    // Get script config from database
    const scriptConfig = await getScriptConfig('customer', 'getPage');
    
    // Use script_id and deployment_id dari config
    const response = await this.client.post(requestBody, {
      script: scriptConfig.script_id,
      deploy: scriptConfig.deployment_id,
    });

    // ... process response ...
  } catch (error) {
    // ... error handling ...
  }
}
```

### 3. Contoh Lengkap untuk Multiple Operations

```javascript
const { getNetSuiteClient } = require('./client');
const { logger } = require('../../utils/logger');
const { getScriptConfig } = require('../../config/netsuite');

class NetSuiteOrderService {
  constructor() {
    this.client = getNetSuiteClient('order');
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId) {
    try {
      logger().info(`Fetching order from NetSuite: ${orderId}`);

      // Get script config untuk operation 'read'
      const scriptConfig = await getScriptConfig('order', 'read');
      
      const response = await this.client.get({
        orderId,
        operation: 'read',
        script: scriptConfig.script_id,
        deploy: scriptConfig.deployment_id,
      });

      if (response.success && response.data) {
        return this.transformOrderData(response.data);
      }

      return null;
    } catch (error) {
      logger().error(`Error fetching order ${orderId} from NetSuite:`, error);
      throw error;
    }
  }

  /**
   * Get orders dengan pagination
   */
  async getOrdersPage(params = {}) {
    try {
      const { pageIndex = 0, pageSize = 50, lastmodified = null } = params;

      const requestBody = {
        pageSize,
        pageIndex,
        ...(lastmodified && { lastmodified }),
      };

      // Get script config untuk operation 'getPage'
      const scriptConfig = await getScriptConfig('order', 'getPage');
      
      const response = await this.client.post(requestBody, {
        script: scriptConfig.script_id,
        deploy: scriptConfig.deployment_id,
      });

      if (response.success && response.data) {
        return this.transformOrderListResponse(response.data);
      }

      return {
        items: [],
        hasMore: false,
        totalResults: 0,
      };
    } catch (error) {
      logger().error('Error fetching orders page from NetSuite:', error);
      throw error;
    }
  }

  /**
   * Create order
   */
  async createOrder(orderData) {
    try {
      logger().info('Creating order in NetSuite');

      const requestBody = this.transformOrderToNetSuiteFormat(orderData);

      // Get script config untuk operation 'create'
      const scriptConfig = await getScriptConfig('order', 'create');
      
      const response = await this.client.post(requestBody, {
        operation: 'create',
        script: scriptConfig.script_id,
        deploy: scriptConfig.deployment_id,
      });

      if (response.success && response.data) {
        return this.transformOrderData(response.data);
      }

      throw new Error('Failed to create order in NetSuite');
    } catch (error) {
      logger().error('Error creating order in NetSuite:', error);
      throw error;
    }
  }

  /**
   * Sync orders
   */
  async syncOrders(params = {}) {
    try {
      const { since = null, pageIndex = 0, pageSize = 500 } = params;

      const requestBody = {
        pageSize,
        pageIndex,
        ...(since && { lastmodified: since }),
      };

      // Get script config untuk operation 'sync'
      const scriptConfig = await getScriptConfig('order', 'sync');
      
      const response = await this.client.post(requestBody, {
        script: scriptConfig.script_id,
        deploy: scriptConfig.deployment_id,
      });

      if (response.success && response.data) {
        return this.transformOrderListResponse(response.data);
      }

      return {
        items: [],
        hasMore: false,
        totalResults: 0,
      };
    } catch (error) {
      logger().error('Error syncing orders from NetSuite:', error);
      throw error;
    }
  }
}
```

---

## 📝 Contoh Implementasi Module Baru

### Step 1: Tambahkan Script Configurations

```javascript
// File: scripts/setup-order-scripts.js
const netsuiteScriptsRepo = require('../src/modules/netsuite_scripts');

async function setupOrderScripts() {
  const orderScripts = [
    {
      module: 'order',
      operation: 'read',
      script_id: '474',
      deployment_id: '1',
      description: 'Order (Read) - Read order from NetSuite',
      is_active: true
    },
    {
      module: 'order',
      operation: 'create',
      script_id: '474',
      deployment_id: '1',
      description: 'Order (Create) - Create new order in NetSuite',
      is_active: true
    },
    {
      module: 'order',
      operation: 'getPage',
      script_id: '533',
      deployment_id: '1',
      description: 'Get Order Page - Get paginated order list from NetSuite',
      is_active: true
    },
    {
      module: 'order',
      operation: 'sync',
      script_id: '534',
      deployment_id: '1',
      description: 'Order Sync - Sync orders from NetSuite',
      is_active: true
    }
  ];

  for (const script of orderScripts) {
    await netsuiteScriptsRepo.upsertScriptConfig(script);
    console.log(`✓ Added script config: ${script.module}:${script.operation} → ${script.script_id}`);
  }

  console.log('✅ All order scripts configured!');
}

setupOrderScripts().catch(console.error);
```

### Step 2: Buat Service dengan Script Config

```javascript
// File: src/services/netsuite/order-service.js
const { getNetSuiteClient } = require('./client');
const { logger } = require('../../utils/logger');
const { getScriptConfig } = require('../../config/netsuite');

class NetSuiteOrderService {
  constructor() {
    this.client = getNetSuiteClient('order');
  }

  async getOrdersPage(params = {}) {
    try {
      const { pageIndex = 0, pageSize = 50, lastmodified = null } = params;

      const requestBody = {
        pageSize,
        pageIndex,
        ...(lastmodified && { lastmodified }),
      };

      // Get script config dari database
      const scriptConfig = await getScriptConfig('order', 'getPage');
      
      const response = await this.client.post(requestBody, {
        script: scriptConfig.script_id,
        deploy: scriptConfig.deployment_id,
      });

      if (response.success && response.data) {
        return this.transformOrderListResponse(response.data);
      }

      return { items: [], hasMore: false, totalResults: 0 };
    } catch (error) {
      logger().error('Error fetching orders page from NetSuite:', error);
      throw error;
    }
  }

  // ... methods lainnya ...
}

module.exports = { NetSuiteOrderService };
```

### Step 3: Gunakan di Handler

```javascript
// File: src/modules/order/handler.js
const { getNetSuiteOrderService } = require('../../services/netsuite/order-service');

const searchFromNetSuite = async (req, res) => {
  try {
    const { pageIndex = 0, pageSize = 50, lastmodified = null } = req.body;

    const netSuiteService = getNetSuiteOrderService();
    const response = await netSuiteService.getOrdersPage({
      pageIndex,
      pageSize,
      lastmodified,
    });

    return baseResponse(res, response);
  } catch (error) {
    return errorResponse(res, error);
  }
};
```

---

## 🌐 API Endpoints

### Get All Script Configurations

```bash
GET /api/admin/netsuite-scripts?page=1&limit=50&module=customer&operation=getPage
```

### Get Script Config by Module and Operation

```bash
GET /api/admin/netsuite-scripts/customer/getPage
```

### Get All Scripts for a Module

```bash
GET /api/admin/netsuite-scripts/module/customer
```

### Create/Update Script Config

```bash
POST /api/admin/netsuite-scripts
Content-Type: application/json

{
  "module": "order",
  "operation": "getPage",
  "script_id": "533",
  "deployment_id": "1",
  "description": "Get Order Page",
  "is_active": true
}
```

### Update Script Config

```bash
PUT /api/admin/netsuite-scripts/customer/getPage
Content-Type: application/json

{
  "script_id": "535",
  "deployment_id": "1",
  "description": "Updated description",
  "is_active": true
}
```

### Delete Script Config (Soft Delete)

```bash
DELETE /api/admin/netsuite-scripts/customer/getPage
```

---

## 💡 Tips dan Best Practices

### 1. Naming Convention

- **Module**: Gunakan lowercase, singular (e.g., `customer`, `order`, `item`)
- **Operation**: Gunakan camelCase atau lowercase (e.g., `getPage`, `read`, `create`, `update`, `sync`)

### 2. Caching

- Script config di-cache selama 5 menit
- Jika mengubah script ID, tunggu cache expired atau restart aplikasi
- Atau clear cache manual jika diperlukan

### 3. Fallback

- Jika script config tidak ditemukan di database, sistem akan menggunakan default dari `.env` (`NETSUITE_SCRIPT_ID`)
- Pastikan selalu ada fallback untuk production

### 4. Error Handling

- Sistem akan fallback ke default jika database error
- Log warning akan muncul jika script config tidak ditemukan

### 5. Testing

- Test dengan script ID yang berbeda untuk setiap operation
- Pastikan script ID yang digunakan valid di NetSuite
- Test fallback behavior jika database tidak tersedia

---

## 🔍 Query Examples

### Get All Active Scripts

```sql
SELECT * FROM netsuite_scripts WHERE is_active = true ORDER BY module, operation;
```

### Get Scripts for Specific Module

```sql
SELECT * FROM netsuite_scripts WHERE module = 'customer' AND is_active = true;
```

### Get Script for Specific Operation

```sql
SELECT * FROM netsuite_scripts 
WHERE module = 'customer' AND operation = 'getPage' AND is_active = true;
```

### Update Script ID

```sql
UPDATE netsuite_scripts
SET script_id = '535', updated_at = NOW()
WHERE module = 'customer' AND operation = 'getPage';
```

### Disable Script (Soft Delete)

```sql
UPDATE netsuite_scripts
SET is_active = false, updated_at = NOW()
WHERE module = 'customer' AND operation = 'getPage';
```

---

## ❓ FAQ

### Q: Apakah perlu restart aplikasi setelah mengubah script ID?

A: Tidak perlu restart, tapi perlu menunggu cache expired (5 menit) atau clear cache manual.

### Q: Bagaimana jika script ID tidak ditemukan di database?

A: Sistem akan menggunakan default dari `.env` file (`NETSUITE_SCRIPT_ID`).

### Q: Bisakah satu module menggunakan script ID yang berbeda untuk setiap operation?

A: Ya, itu adalah tujuan utama sistem ini. Setiap `module:operation` bisa punya script ID berbeda.

### Q: Bagaimana cara melihat script config yang sedang aktif?

A: Gunakan endpoint `GET /api/admin/netsuite-scripts` atau query database langsung.

### Q: Apakah bisa menggunakan deployment ID yang berbeda?

A: Ya, setiap script config bisa punya `deployment_id` yang berbeda.

---

## 📚 Related Documentation

- [NetSuite Integration Guide](../../../NETSUITE_INTEGRATION.md)
- [API Documentation](../../../README.md)
- [Swagger Documentation](../../../README.md#swagger-documentation)

---

**Last Updated**: 2025-01-02

