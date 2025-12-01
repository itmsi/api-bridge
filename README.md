# API Bridge - NetSuite Integration Platform

Platform API Bridge untuk integrasi dengan Oracle NetSuite dengan fitur sync otomatis, caching, dan monitoring yang lengkap.

## 📋 Daftar Isi

- [Overview](#overview)
- [Fitur Utama](#fitur-utama)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Konfigurasi](#konfigurasi)
- [Struktur Proyek](#struktur-proyek)
- [API Endpoints](#api-endpoints)
- [NetSuite Integration](#netsuite-integration)
- [Database Schema](#database-schema)
- [Caching & Sync Strategy](#caching--sync-strategy)
- [Authentication](#authentication)
- [Monitoring & Logging](#monitoring--logging)
- [Development](#development)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

API Bridge adalah platform middleware yang menghubungkan sistem eksternal dengan Oracle NetSuite melalui REST API. Platform ini menyediakan:

- **Sinkronisasi Data Otomatis**: Incremental sync dengan on-demand trigger
- **Caching Layer**: Redis cache untuk performa optimal
- **Message Queue**: RabbitMQ untuk async processing
- **API Client Management**: Sistem manajemen API client dengan rate limiting
- **Monitoring**: Prometheus metrics dan comprehensive logging

## ✨ Fitur Utama

### Core Features
- ✅ **NetSuite Integration**: OAuth 1.0 authentication dengan RESTlet API
- ✅ **Customer Sync**: Automatic & manual sync untuk customer data
- ✅ **Incremental Sync**: Sync hanya data yang berubah berdasarkan timestamp
- ✅ **On-Demand Sync**: Trigger sync otomatis saat data tidak ditemukan
- ✅ **Redis Caching**: Multi-layer caching dengan TTL management
- ✅ **RabbitMQ Queue**: Async job processing dengan DLX & retry mechanism
- ✅ **API Client Management**: Registration, authentication, dan rate limiting
- ✅ **Swagger Documentation**: Auto-generated API documentation

### Technical Features
- ✅ **PostgreSQL**: Database dengan Knex.js query builder
- ✅ **Migration & Seeding**: Database versioning system
- ✅ **Error Handling**: Comprehensive error handling dengan custom exceptions
- ✅ **Logging**: Winston logger dengan daily rotation
- ✅ **Prometheus Metrics**: Application metrics untuk monitoring
- ✅ **Docker Support**: Containerization untuk development & production
- ✅ **CI/CD Ready**: Jenkins & Bitbucket Pipelines configuration

## 📦 Prerequisites

Sebelum memulai, pastikan Anda sudah menginstall:

- **Node.js** (v14 atau lebih baru)
- **PostgreSQL** (v12 atau lebih baru)
- **Redis** (v6 atau lebih baru, untuk caching)
- **RabbitMQ** (v3.8 atau lebih baru, untuk message queue)
- **Docker & Docker Compose** (opsional, untuk containerization)

## 🚀 Installation

### 1. Clone Repository

```bash
git clone <repository-url>
cd api-bridge
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Copy file environment example:

```bash
cp environment.example .env
```

Edit file `.env` dan sesuaikan dengan konfigurasi Anda (lihat bagian [Konfigurasi](#konfigurasi)).

### 4. Database Setup

Jalankan migration untuk membuat struktur database:

```bash
npm run migrate
```

Jalankan seeder untuk data awal (opsional):

```bash
npm run seed
```

### 5. Start Development Server

```bash
npm run dev
```

Server akan berjalan di `http://localhost:9575` (atau sesuai `APP_PORT` di `.env`)

Akses dokumentasi API di `http://localhost:9575/documentation`

## ⚙️ Konfigurasi

### Environment Variables

File `.env` harus berisi konfigurasi berikut:

#### Application
```env
APP_NAME=API Bridge
NODE_ENV=development
APP_PORT=9575
APP_URL=http://localhost:9575
```

#### Database
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=api_bridge
```

#### Redis (Caching)
```env
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

#### RabbitMQ (Message Queue)
```env
RABBITMQ_ENABLED=true
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_EXCHANGE=sync_exchange
RABBITMQ_QUEUE=sync_queue
RABBITMQ_DLX=sync_dlx
RABBITMQ_RETRY_QUEUE=sync_retry
```

#### NetSuite API
```env
NETSUITE_ENABLED=true
NETSUITE_BASE_URL=https://your-account.restlets.api.netsuite.com
NETSUITE_SCRIPT_ID=472
NETSUITE_DEPLOYMENT_ID=1
NETSUITE_CONSUMER_KEY=your_consumer_key
NETSUITE_CONSUMER_SECRET=your_consumer_secret
NETSUITE_TOKEN=your_token
NETSUITE_TOKEN_SECRET=your_token_secret
NETSUITE_REALM=your_realm
NETSUITE_TIMEOUT=30000
```

#### JWT (Optional)
```env
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
```

#### Monitoring
```env
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090
```

## 📁 Struktur Proyek

```
api-bridge/
├── src/
│   ├── app.js                      # Express app configuration
│   ├── server.js                    # Server entry point
│   ├── knexfile.js                  # Knex configuration
│   │
│   ├── config/                      # Konfigurasi aplikasi
│   │   ├── database.js              # PostgreSQL connection
│   │   ├── redis.js                 # Redis connection
│   │   ├── rabbitmq.js              # RabbitMQ connection
│   │   ├── netsuite.js              # NetSuite configuration
│   │   ├── prometheus.js            # Prometheus metrics
│   │   └── index.js                 # Config exports
│   │
│   ├── modules/                     # Business logic modules
│   │   ├── customer/               # Customer module
│   │   │   ├── handler.js          # Request handlers
│   │   │   ├── postgre_repository.js # Database operations
│   │   │   └── index.js             # Routes
│   │   ├── api_client/             # API Client management
│   │   │   ├── handler.js
│   │   │   ├── postgre_repository.js
│   │   │   └── index.js
│   │   ├── sync/                   # Sync management
│   │   │   ├── handler.js
│   │   │   ├── postgre_repository.js
│   │   │   └── index.js
│   │   └── example/                # Example module (template)
│   │
│   ├── services/                    # External services
│   │   └── netsuite/               # NetSuite integration
│   │       ├── oauth.js             # OAuth 1.0 service
│   │       ├── client.js            # HTTP client
│   │       ├── customer-service.js  # Customer operations
│   │       └── index.js
│   │
│   ├── middlewares/                 # Custom middlewares
│   │   ├── api-key.js               # API key authentication
│   │   ├── token.js                 # JWT verification
│   │   ├── validation.js            # Input validation
│   │   ├── rate-limiter.js          # Rate limiting
│   │   └── prometheus.js            # Metrics middleware
│   │
│   ├── routes/                      # API routes
│   │   ├── index.js                 # Main routes
│   │   └── V1/                      # API version 1
│   │       └── index.js
│   │
│   ├── repository/                  # Database layer
│   │   └── postgres/
│   │       ├── migrations/          # Database migrations
│   │       └── seeders/             # Database seeders
│   │
│   ├── utils/                       # Utility functions
│   │   ├── response.js              # Standard API response
│   │   ├── cache.js                 # Redis cache utilities
│   │   ├── rabbitmq-sync.js         # RabbitMQ sync service
│   │   ├── logger.js                # Logging utility
│   │   └── ...
│   │
│   ├── job/                         # Background jobs
│   │   ├── customer_sync_worker.js # Customer sync worker
│   │   └── index.js
│   │
│   ├── listeners/                   # RabbitMQ listeners
│   │   ├── email_listener.js
│   │   └── index.js
│   │
│   ├── static/                      # Swagger documentation
│   │   ├── index.js                 # Swagger config
│   │   ├── path/                    # API path definitions
│   │   └── schema/                  # Schema definitions
│   │
│   └── scripts/                     # Utility scripts
│       └── start-consumer.js        # Start RabbitMQ consumer
│
├── docker/                          # Docker configurations
│   ├── Dockerfile
│   └── Dockerfile.dev
│
├── docs/                            # Additional documentation
├── logs/                            # Application logs
├── public/                          # Static files
├── uploads/                         # Uploaded files
│
├── .env                             # Environment variables
├── .env.example                     # Environment template
├── package.json
├── docker-compose.yml
├── docker-compose.dev.yml
└── README.md                        # This file
```

## 🔌 API Endpoints

### Customer Endpoints

#### Get All Customers
```http
GET /api/customers?page=1&limit=10&email=test@example.com&name=John
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `email` (optional): Filter by email
- `name` (optional): Filter by name
- `netsuite_id` (optional): Filter by NetSuite ID

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
  }
}
```

#### Get Customer by ID
```http
GET /api/customers/:id
```

#### Get Customer by NetSuite ID
```http
GET /api/customers/netsuite/:netsuite_id
```

#### Create Customer
```http
POST /api/customers
Content-Type: application/json

{
  "companyname": "Acme Corp",
  "email": "contact@acme.com",
  "phone": "+1234567890"
}
```

#### Update Customer
```http
PUT /api/customers
Content-Type: application/json

{
  "internalid": "123",
  "companyname": "Acme Corp Updated",
  "email": "newemail@acme.com"
}
```

#### Read Customer from NetSuite
```http
GET /api/customers/netsuite/read?customerId=123
```

#### Search Customers from NetSuite
```http
POST /api/customers/netsuite/search
Content-Type: application/json

{
  "page": 1,
  "pageSize": 500,
  "since": "2025-01-01T00:00:00Z",
  "netsuite_id": "123"
}
```

### API Client Management (Admin)

#### Get All API Clients
```http
GET /api/admin/api-clients?page=1&limit=50
```

#### Get API Client by ID
```http
GET /api/admin/api-clients/:id
```

#### Register New API Client
```http
POST /api/admin/api-clients
Content-Type: application/json

{
  "name": "Internal API - Order Service",
  "description": "API untuk order service",
  "api_url": "https://api.internal.com/order",
  "ip_whitelist": ["192.168.1.1", "10.0.0.1"],
  "rate_limit_per_minute": 100,
  "rate_limit_per_hour": 1000,
  "notes": "Production API"
}
```

**Response:**
```json
{
  "success": true,
  "message": "API client berhasil didaftarkan. Simpan client_key dan client_secret dengan aman!",
  "data": {
    "id": 1,
    "name": "Internal API - Order Service",
    "client_key": "apikey_abc123...",
    "client_secret": "def456...",
    "api_url": "https://api.internal.com/order",
    "is_active": true,
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

#### Update API Client
```http
PUT /api/admin/api-clients/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "is_active": false
}
```

#### Regenerate Client Secret
```http
POST /api/admin/api-clients/:id/regenerate-secret
```

#### Delete API Client
```http
DELETE /api/admin/api-clients/:id
```

#### Toggle Active Status
```http
POST /api/admin/api-clients/:id/toggle-status
```

### Sync Management (Admin)

#### Trigger Manual Sync
```http
POST /api/admin/sync/trigger
Content-Type: application/json

{
  "module": "customer",
  "type": "incremental_sync",
  "since": "2025-01-01T00:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Sync job telah di-trigger",
  "data": {
    "jobId": "job_123456",
    "module": "customer",
    "status": "pending",
    "params": {
      "since": "2025-01-01T00:00:00Z",
      "page": 1,
      "pageSize": 500
    }
  }
}
```

#### Get Sync Job Status
```http
GET /api/admin/sync/jobs/:jobId
```

#### Get Sync Status for Module
```http
GET /api/admin/sync/status/:module
```

#### Get Failed Jobs
```http
GET /api/admin/sync/failed-jobs?module=customer&page=1&limit=50
```

#### Retry Failed Job
```http
POST /api/admin/sync/failed-jobs/:jobId/retry
```

### Authentication

Untuk menggunakan API dengan authentication, tambahkan header berikut:

```http
X-Client-Key: your_client_key
X-Client-Secret: your_client_secret
```

Atau via query parameters:

```http
?client_key=your_client_key&client_secret=your_client_secret
```

## 🔗 NetSuite Integration

### Overview

Sistem menggunakan OAuth 1.0 untuk autentikasi dengan NetSuite RESTlet API. Lihat dokumentasi lengkap di [NETSUITE_INTEGRATION.md](./NETSUITE_INTEGRATION.md).

### Configuration

1. **Setup Integration di NetSuite:**
   - Setup > Integration > Manage Integrations
   - Create new integration
   - Copy Consumer Key & Consumer Secret

2. **Create Access Token:**
   - Setup > Users/Roles > Access Tokens
   - Create new access token
   - Copy Token ID & Token Secret

3. **Configure RESTlet:**
   - Customization > Scripting > Scripts > New
   - Create RESTlet script
   - Deploy script dan copy Script ID & Deployment ID

4. **Update .env:**
   ```env
   NETSUITE_ENABLED=true
   NETSUITE_BASE_URL=https://your-account.restlets.api.netsuite.com
   NETSUITE_SCRIPT_ID=472
   NETSUITE_DEPLOYMENT_ID=1
   NETSUITE_CONSUMER_KEY=your_consumer_key
   NETSUITE_CONSUMER_SECRET=your_consumer_secret
   NETSUITE_TOKEN=your_token
   NETSUITE_TOKEN_SECRET=your_token_secret
   NETSUITE_REALM=your_realm
   ```

### NetSuite Script Configuration

Sistem mendukung konfigurasi script ID NetSuite per module dan operation melalui database. Ini memungkinkan setiap module memiliki script ID yang berbeda untuk operasi yang berbeda.

**📚 Dokumentasi Lengkap**: [NetSuite Scripts Configuration Guide](./src/modules/netsuite_scripts/README.md)

**Fitur:**
- ✅ Script ID disimpan di database (bukan di `.env`)
- ✅ Setiap module/operation bisa punya script ID berbeda
- ✅ Mudah diubah tanpa restart aplikasi (dengan cache 5 menit)
- ✅ Fallback ke default dari `.env` jika tidak ada di database
- ✅ API endpoints untuk manage script configurations

**Quick Start:**
```bash
# 1. Jalankan migration
npm run migrate

# 2. Tambahkan script config via API
POST /api/admin/netsuite-scripts
{
  "module": "customer",
  "operation": "getPage",
  "script_id": "532",
  "deployment_id": "1"
}

# 3. Gunakan di service
const { getScriptConfig } = require('./config/netsuite');
const scriptConfig = await getScriptConfig('customer', 'getPage');
```

### Sync Strategy

Sistem menggunakan **incremental sync** dengan strategi berikut:

1. **On-Demand Sync**: Saat data tidak ditemukan, trigger sync otomatis
2. **Staleness Check**: Data dianggap stale setelah 12 jam
3. **Incremental Sync**: Hanya sync data yang berubah sejak last sync
4. **Batch Processing**: Process data dalam batch 500 records

## 💾 Database Schema

### Customers Table
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  netsuite_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  data JSONB,
  last_modified_netsuite TIMESTAMP,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### API Clients Table
```sql
CREATE TABLE api_clients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  api_url VARCHAR(500) NOT NULL,
  client_key VARCHAR(255) UNIQUE NOT NULL,
  client_secret VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  ip_whitelist JSONB,
  rate_limit_per_minute INTEGER DEFAULT 100,
  rate_limit_per_hour INTEGER DEFAULT 1000,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP
);
```

### Sync Tracker Table
```sql
CREATE TABLE sync_tracker (
  id SERIAL PRIMARY KEY,
  module VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(50),
  last_sync_at TIMESTAMP,
  last_synced_batch_max TIMESTAMP,
  remark TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Sync Jobs Table
```sql
CREATE TABLE sync_jobs (
  id SERIAL PRIMARY KEY,
  job_id VARCHAR(255) UNIQUE NOT NULL,
  module VARCHAR(100) NOT NULL,
  params JSONB,
  status VARCHAR(50) DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  last_error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Failed Jobs Table
```sql
CREATE TABLE failed_jobs (
  id SERIAL PRIMARY KEY,
  job_id VARCHAR(255) UNIQUE NOT NULL,
  module VARCHAR(100) NOT NULL,
  payload JSONB,
  error TEXT,
  stack_trace TEXT,
  attempts INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🗄️ Caching & Sync Strategy

### Caching Strategy

1. **Cache Keys:**
   - `customer:list:{hash}` - Customer list dengan filters
   - `customer:{netsuite_id}` - Single customer by NetSuite ID

2. **Cache TTL:**
   - Customer list: 1 hour
   - Single customer: 12 hours

3. **Cache Invalidation:**
   - Automatic invalidation saat data di-update
   - Pattern-based deletion untuk related cache

### Sync Flow

```
1. Request datang → Check cache
2. Cache miss → Check database
3. Data tidak ada → Trigger sync job
4. Sync job → Fetch dari NetSuite
5. Upsert ke database → Update cache
6. Return response
```

## 🔐 Authentication

### API Key Authentication

Sistem menggunakan API Key authentication untuk external clients:

1. **Register API Client** via admin endpoint
2. **Get credentials** (client_key & client_secret)
3. **Use credentials** di header atau query params

**Example:**
```bash
curl -X GET 'http://localhost:9575/api/customers' \
  -H 'X-Client-Key: apikey_abc123' \
  -H 'X-Client-Secret: def456'
```

### IP Whitelist (Currently Disabled)

IP whitelist validation dapat diaktifkan dengan uncomment code di `src/middlewares/api-key.js`.

## 📊 Monitoring & Logging

### Prometheus Metrics

Metrics tersedia di endpoint:
```
http://localhost:9575/metrics
```

**Available Metrics:**
- HTTP request duration
- HTTP request count
- Cache hit/miss ratio
- Sync job status
- Database connections

### Logging

Logs tersimpan di folder `logs/`:
- `logs/application/` - Application logs
- `logs/listener/` - RabbitMQ listener logs

**Log Format:**
- Daily rotation
- JSON format untuk production
- Human-readable untuk development

## 🛠️ Development

### Available Scripts

```bash
# Start development server
npm run dev

# Start production server
npm start

# Run database migrations
npm run migrate

# Rollback last migration
npm run migrate:rollback

# Create new migration
npm run migrate:make create_table_name

# Run seeders
npm run seed

# Create new seeder
npm run seed:make seeder_name

# Start RabbitMQ consumer
npm run consumer
```

### Creating New Module

1. **Copy example module:**
   ```bash
   cp -r src/modules/example src/modules/your_module
   ```

2. **Update files:**
   - Replace "example" dengan nama module Anda
   - Update table name di repository
   - Update routes di `src/routes/V1/index.js`

3. **Create migration:**
   ```bash
   npm run migrate:make create_your_table
   ```

4. **Update Swagger docs:**
   - Add paths di `src/static/path/your_module.js`
   - Add schemas di `src/static/schema/your_module.js`

### Code Style

- Use ESLint untuk code quality
- Follow existing code patterns
- Write descriptive comments
- Use async/await untuk async operations

## 🐳 Docker

### Development

```bash
docker-compose -f docker-compose.dev.yml up
```

### Production

```bash
docker-compose -f docker-compose.server.yml up -d
```

## 🚀 Deployment

### Manual Deployment

1. **Setup server:**
   ```bash
   ./setup-server.sh
   ```

2. **Configure environment:**
   ```bash
   cp environment.server .env
   # Edit .env sesuai production
   ```

3. **Deploy:**
   ```bash
   ./deploy-server.sh
   ```

### CI/CD

Sistem sudah dikonfigurasi untuk:
- **Jenkins**: Lihat `Jenkinsfile`
- **Bitbucket Pipelines**: Lihat `bitbucket-pipelines.yml`

## 🐛 Troubleshooting

### Common Issues

#### 1. Database Connection Error
```bash
# Check database is running
psql -h localhost -U postgres -d api_bridge

# Check connection string di .env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=api_bridge
```

#### 2. Redis Connection Error
```bash
# Check Redis is running
redis-cli ping

# Disable Redis jika tidak digunakan
REDIS_ENABLED=false
```

#### 3. RabbitMQ Connection Error
```bash
# Check RabbitMQ is running
rabbitmqctl status

# Disable RabbitMQ jika tidak digunakan
RABBITMQ_ENABLED=false
```

#### 4. NetSuite API Error
- Check credentials di `.env`
- Verify RESTlet script is deployed
- Check NetSuite account permissions

#### 5. Sync Job Stuck
```bash
# Check job status
GET /api/admin/sync/jobs/:jobId

# Retry failed job
POST /api/admin/sync/failed-jobs/:jobId/retry
```

## 📚 Additional Documentation

- [API Bridge Implementation](./API_BRIDGE_IMPLEMENTATION.md) - Detailed implementation guide
- [NetSuite Integration](./NETSUITE_INTEGRATION.md) - NetSuite integration guide
- [NetSuite Scripts Configuration](./src/modules/netsuite_scripts/README.md) - Cara mengelola script ID NetSuite per module
- [Quick Start Guide](./QUICKSTART.md) - Quick start tutorial
- [Contributing Guide](./CONTRIBUTING.md) - Contribution guidelines

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 👥 Contributors

See [CONTRIBUTORS.md](./CONTRIBUTORS.md) for list of contributors.

## 📞 Support

Untuk pertanyaan atau dukungan:
- Buat issue di GitHub
- Email: support@example.com

---

Made with ❤️ for seamless NetSuite integration
