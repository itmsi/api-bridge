# API Bridge Implementation - Dokumentasi

Dokumen ini menjelaskan implementasi API Bridge sesuai dengan konsep yang dijelaskan di `consep.md`.

## Overview

Sistem API Bridge telah diimplementasikan dengan komponen-komponen berikut:

1. ✅ Database migrations untuk customers, sync_tracker, sync_jobs, failed_jobs
2. ✅ Redis cache utilities dan config
3. ✅ RabbitMQ service dengan DLX dan retry queues
4. ✅ Customer module dengan repository, handler, dan routes
5. ✅ Sync worker untuk customer dengan incremental sync logic
6. ✅ Admin endpoints untuk trigger sync manual dan check job status
7. ✅ On-demand incremental sync logic (cache -> DB -> queue)
8. ✅ Prometheus metrics untuk sync jobs dan cache

## Struktur File

### Database Migrations

```
src/repository/postgres/migrations/
├── 20250102000001_create_customers_table.js
├── 20250102000002_create_sync_tracker_table.js
├── 20250102000003_create_sync_jobs_table.js
└── 20250102000004_create_failed_jobs_table.js
```

### Modules

```
src/modules/
├── customer/
│   ├── postgre_repository.js    # Repository untuk customer CRUD & upsert
│   ├── handler.js                # Handler dengan on-demand sync logic
│   └── index.js                  # Routes untuk customer endpoints
└── sync/
    ├── postgre_repository.js     # Repository untuk sync tracker, jobs, failed jobs
    ├── handler.js                # Handler untuk admin sync endpoints
    └── index.js                  # Routes untuk admin endpoints
```

### Utils

```
src/utils/
├── cache.js                      # Redis cache utilities dengan metrics
└── rabbitmq-sync.js              # RabbitMQ service dengan DLX & retry queues
```

### Config

```
src/config/
├── redis.js                      # Redis connection config
└── prometheus.js                 # Updated dengan sync & cache metrics
```

### Workers

```
src/job/
└── customer_sync_worker.js       # Sync worker untuk customer module
```

## Setup & Installation

### 1. Install Dependencies

Tambahkan package redis ke `package.json`:

```bash
npm install redis
```

### 2. Environment Variables

Tambahkan konfigurasi berikut ke file `.env`:

```env
# Redis Configuration
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# RabbitMQ Configuration (sudah ada)
RABBITMQ_ENABLED=true
RABBITMQ_URL=amqp://guest:guest@localhost:9505

# NetSuite API Configuration (TODO: tambahkan sesuai implementasi)
NETSUITE_ACCOUNT_ID=your_account_id
NETSUITE_CONSUMER_KEY=your_consumer_key
NETSUITE_CONSUMER_SECRET=your_consumer_secret
NETSUITE_TOKEN_ID=your_token_id
NETSUITE_TOKEN_SECRET=your_token_secret
```

### 3. Database Migrations

Jalankan migrations untuk membuat tabel-tabel yang diperlukan:

```bash
npm run migrate
```

### 4. Start Services

**Start API Server:**

```bash
npm start
# atau untuk development
npm run dev
```

**Start Sync Workers:**

Di terminal terpisah:

```bash
npm run consumer
```

## API Endpoints

### Customer Endpoints

#### GET `/api/v1/customers`
Get all customers dengan pagination dan filtering.

**Query Parameters:**
- `page` (optional, default: 1)
- `limit` (optional, default: 10)
- `email` (optional, filter by email)
- `name` (optional, filter by name)
- `netsuite_id` (optional, filter by NetSuite ID)

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  },
  "fromCache": false
}
```

**Headers:**
- `X-Sync-Triggered: true` - Jika sync job di-trigger karena data stale

#### GET `/api/v1/customers/:id`
Get customer by ID.

#### GET `/api/v1/customers/netsuite/:netsuite_id`
Get customer by NetSuite ID dengan on-demand sync.

**Response (202 jika data tidak ditemukan):**
```json
{
  "success": false,
  "message": "Customer tidak ditemukan. Sync job telah di-trigger.",
  "jobId": "uuid-here"
}
```

### Admin Sync Endpoints

#### POST `/admin/sync`
Trigger manual sync untuk module.

**Request Body:**
```json
{
  "module": "customer",
  "since": "2025-01-01T00:00:00Z",  // optional
  "type": "incremental_sync"         // optional, default: incremental_sync
}
```

**Response (202):**
```json
{
  "success": true,
  "data": {
    "jobId": "uuid-here",
    "module": "customer",
    "status": "pending",
    "params": {...}
  },
  "message": "Sync job telah di-trigger"
}
```

#### GET `/admin/sync/job/:jobId`
Get sync job status.

#### GET `/admin/sync/status/:module`
Get sync tracker status untuk module.

#### GET `/admin/sync/failed`
Get list failed jobs.

**Query Parameters:**
- `module` (optional, filter by module)
- `page` (optional, default: 1)
- `limit` (optional, default: 50)

#### POST `/admin/sync/failed/:jobId/retry`
Retry failed job.

## RabbitMQ Topology

### Exchanges

- `ns.jobs` (topic) - Main exchange untuk sync jobs
- `ns.dlx` (direct) - Dead letter exchange

### Queues

- `ns.sync.customer` - Main queue untuk customer sync
- `ns.dlx.customer` - DLX queue untuk customer
- `ns.retry.customer.1` - Retry queue (1 second delay)
- `ns.retry.customer.2` - Retry queue (10 seconds delay)
- `ns.retry.customer.3` - Retry queue (1 minute delay)

### Message Format

```json
{
  "jobId": "uuid",
  "module": "customer",
  "type": "incremental_sync",
  "params": {
    "since": "2025-01-01T00:00:00Z",
    "page": 1,
    "pageSize": 500,
    "netsuite_id": "optional"
  },
  "attempts": 0,
  "timestamp": "2025-01-02T10:00:00Z"
}
```

## Redis Cache Keys

- `customer:{netsuite_id}` - Single customer (TTL: 12 hours)
- `customer:list:page:{hash}` - Customer list (TTL: 5 minutes)
- `sync:lastSync:{module}` - Last sync timestamp (no expiration)

## Monitoring Metrics

Prometheus metrics yang tersedia:

### Sync Metrics

- `api_bridge_sync_jobs_processed_total{module, status}` - Total sync jobs processed
- `api_bridge_sync_jobs_failed_total{module}` - Total failed sync jobs
- `api_bridge_netsuite_requests_total{module, status}` - Total NetSuite API requests
- `api_bridge_sync_duration_seconds{module, type}` - Sync duration histogram

### Cache Metrics

- `api_bridge_redis_cache_hits_total{key_pattern}` - Total cache hits
- `api_bridge_redis_cache_misses_total{key_pattern}` - Total cache misses

## Workflow On-Demand Incremental Sync

1. **Client Request**: GET `/api/v1/customers/netsuite/:netsuite_id`
2. **Check Cache**: API checks Redis cache first
   - **HIT**: Return cached data (check if stale, trigger sync if needed)
   - **MISS**: Continue to step 3
3. **Check DB**: API checks PostgreSQL database
   - **FOUND**: Return DB data, update cache, check if stale
   - **NOT FOUND**: Continue to step 4
4. **Trigger Sync**: Enqueue incremental sync job to RabbitMQ
   - Create `sync_jobs` record
   - Return 202 Accepted with jobId
5. **Worker Process**: Worker consumes job from queue
   - Fetch data from NetSuite API
   - Upsert to PostgreSQL
   - Update `sync_tracker`
   - Invalidate/update Redis cache

## NetSuite API Integration

**TODO**: Implementasi koneksi ke NetSuite API di `customer_sync_worker.js`.

Function `fetchNetSuiteCustomers()` perlu diimplementasikan dengan:

- SOAP/SuiteTalk API, atau
- REST API dengan Token Based Authentication (TBA) atau OAuth2

Contoh implementasi yang diharapkan:

```javascript
const fetchNetSuiteCustomers = async (params) => {
  // 1. Authenticate dengan NetSuite
  // 2. Build search query dengan lastModifiedDate filter
  // 3. Execute search dengan pagination
  // 4. Transform response ke format yang diharapkan
  // 5. Return { items, hasMore, totalResults }
};
```

## Next Steps

1. ✅ Database migrations sudah dibuat
2. ✅ Redis cache sudah diimplementasikan
3. ✅ RabbitMQ dengan DLX sudah diimplementasikan
4. ✅ Sync worker sudah dibuat (perlu implementasi NetSuite API)
5. ⏳ Implementasi koneksi ke NetSuite API
6. ⏳ Implementasi cron job untuk scheduled sync
7. ⏳ Buat Swagger/OpenAPI documentation
8. ⏳ Testing dengan NetSuite sandbox
9. ⏳ Load testing dan tuning

## Notes

- Worker hanya akan start jika `RABBITMQ_ENABLED=true` dan `RABBITMQ_URL` terkonfigurasi
- Redis cache akan di-disable jika `REDIS_ENABLED=false` atau koneksi gagal
- Semua sync operations menggunakan upsert berdasarkan `netsuite_id` untuk idempotency
- Retry mechanism menggunakan exponential backoff melalui retry queues
- Failed jobs akan masuk ke DLX setelah 3 attempts

