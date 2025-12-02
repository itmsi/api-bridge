# Testing Endpoint Customer

Dokumen ini menjelaskan cara menggunakan file testing untuk endpoint `/api/customers/get` dan troubleshooting masalah sync.

## File Testing

### 1. `customers-get.test.sh`
Script bash untuk testing endpoint menggunakan curl.

**Usage:**
```bash
# Menggunakan default values
./test/customers-get.test.sh

# Atau dengan custom environment variables
BASE_URL=http://localhost:9575 \
X_CLIENT_KEY=your_api_key \
X_CLIENT_SECRET=your_api_secret \
./test/customers-get.test.sh
```

**Output:**
- HTTP status code
- Response body (formatted dengan jq jika tersedia)
- Sync headers (X-Sync-Triggered, X-Job-Id, X-Sync-Reason)

### 2. `customers-get.test.js`
Script JavaScript untuk testing endpoint menggunakan axios.

**Usage:**
```bash
# Menggunakan default values
node test/customers-get.test.js

# Atau dengan custom environment variables
BASE_URL=http://localhost:9575 \
X_CLIENT_KEY=your_api_key \
X_CLIENT_SECRET=your_api_secret \
node test/customers-get.test.js
```

**Output:**
- HTTP status code
- Response headers (termasuk sync headers)
- Response body dengan analisis data
- Informasi pagination

### 3. `debug-sync-issue.js`
Script untuk mendiagnosis masalah sync customer dari NetSuite.

**Usage:**
```bash
node test/debug-sync-issue.js
```

**Fitur:**
- Check database (customers table, sync tracker, sync jobs)
- Check NetSuite connection
- Check NetSuite script configuration
- Check incremental sync logic
- Check RabbitMQ configuration

## Troubleshooting: Data Tidak Tampil dan Tidak Sync

### Masalah 1: Data Tidak Tampil di Response

**Kemungkinan Penyebab:**
1. Database kosong (belum ada data customer)
2. Sync belum pernah berjalan
3. Filter tidak sesuai

**Solusi:**
1. Cek database:
```sql
SELECT COUNT(*) FROM customers WHERE is_deleted = false;
SELECT * FROM customers LIMIT 10;
```

2. Cek sync tracker:
```sql
SELECT * FROM sync_tracker WHERE module = 'customer';
```

3. Trigger manual sync:
```bash
curl -X POST 'http://localhost:9575/api/admin/sync/customer' \
  -H 'X-Client-Key: your_api_key' \
  -H 'X-Client-Secret: your_api_secret'
```

### Masalah 2: Sync Tidak Berjalan

**Kemungkinan Penyebab:**
1. Consumer RabbitMQ tidak berjalan
2. RabbitMQ tidak terhubung
3. Sync job gagal di-publish
4. Script ID atau Deployment ID tidak valid

**Solusi:**

1. **Pastikan Consumer Berjalan:**
```bash
# Start consumer
npm run consumer

# Atau dengan PM2
pm2 start src/scripts/start-consumer.js --name consumer
```

2. **Cek RabbitMQ Connection:**
```bash
# Cek environment variables
echo $RABBITMQ_HOST
echo $RABBITMQ_PORT
echo $RABBITMQ_USER
echo $RABBITMQ_VHOST

# Test connection ke RabbitMQ
# (gunakan RabbitMQ management UI atau CLI)
```

3. **Cek Sync Jobs:**
```sql
SELECT * FROM sync_jobs 
WHERE module = 'customer' 
ORDER BY created_at DESC 
LIMIT 10;
```

4. **Cek Script Configuration:**
```sql
SELECT * FROM netsuite_scripts 
WHERE module = 'customer' AND operation = 'getPage';
```

Script ID harus sesuai dengan yang ada di Postman collection:
- Script ID: `532`
- Deployment ID: `1`

Jika tidak ada di database, tambahkan:
```sql
INSERT INTO netsuite_scripts (module, operation, script_id, deployment_id, is_active)
VALUES ('customer', 'getPage', '532', '1', true);
```

### Masalah 3: NetSuite API Error

**Kemungkinan Penyebab:**
1. OAuth credentials tidak valid
2. Script ID atau Deployment ID salah
3. Format request tidak sesuai
4. NetSuite API timeout

**Solusi:**

1. **Cek OAuth Credentials:**
```bash
echo $NETSUITE_CONSUMER_KEY
echo $NETSUITE_CONSUMER_SECRET
echo $NETSUITE_TOKEN
echo $NETSUITE_TOKEN_SECRET
echo $NETSUITE_REALM
```

2. **Test NetSuite Connection Manual:**
```bash
# Test dengan endpoint search
curl -X POST 'http://localhost:9575/api/customers/search' \
  -H 'X-Client-Key: your_api_key' \
  -H 'X-Client-Secret: your_api_secret' \
  -H 'Content-Type: application/json' \
  -d '{
    "pageSize": 10,
    "pageIndex": 0
  }'
```

3. **Cek Log Aplikasi:**
```bash
# Cek log aplikasi
tail -f logs/application/2025/12/1/app.log

# Cek log listener
tail -f logs/listener/2025/12/1/listener-01-12-2025.txt
```

### Masalah 4: Format Date lastmodified

**Catatan:**
- Format date untuk `lastmodified` harus: `DD/MM/YYYY` (contoh: `21/11/2025`)
- Jika menggunakan ISO format, akan dikonversi otomatis oleh service

**Test dengan lastmodified:**
```bash
curl -X POST 'http://localhost:9575/api/customers/search' \
  -H 'X-Client-Key: your_api_key' \
  -H 'X-Client-Secret: your_api_secret' \
  -H 'Content-Type: application/json' \
  -d '{
    "pageSize": 50,
    "pageIndex": 0,
    "lastmodified": "21/11/2025"
  }'
```

## Alur Sync

1. **Request ke `/api/customers/get`:**
   - Cek cache → jika ada, return dari cache
   - Jika tidak ada, ambil dari database
   - Check apakah data stale (lebih dari 12 jam)
   - Jika stale atau kosong, trigger incremental sync

2. **Incremental Sync:**
   - Hit NetSuite API untuk mendapatkan max lastModifiedDate
   - Bandingkan dengan max lastModifiedDate di database
   - Jika NetSuite lebih baru, publish sync job ke RabbitMQ

3. **Sync Job Processing:**
   - Consumer membaca job dari RabbitMQ
   - Fetch data dari NetSuite dengan pagination
   - Upsert data ke database
   - Update sync tracker

## Checklist Debugging

- [ ] Database memiliki data customer?
- [ ] Sync tracker ada dan last_sync_at terisi?
- [ ] Consumer RabbitMQ sedang berjalan?
- [ ] RabbitMQ connection berhasil?
- [ ] Script ID dan Deployment ID benar di database?
- [ ] OAuth credentials valid?
- [ ] NetSuite API bisa diakses?
- [ ] Log aplikasi tidak ada error?
- [ ] Sync jobs di database status-nya apa?

## Endpoint Testing

### Test Endpoint Get Customers
```bash
curl -X POST 'http://localhost:9575/api/customers/get' \
  -H 'accept: application/json' \
  -H 'X-Client-Key: apikey_f488c471cb741aff3e13f51bcb069d1c' \
  -H 'X-Client-Secret: 2954f3647730280c23715f64c9434e0945385b195c597809e9db5e81e7d62e3f' \
  -H 'Content-Type: application/json' \
  -d '{
    "page": 1,
    "limit": 10,
    "email": null,
    "name": null,
    "netsuite_id": null
  }'
```

### Test Endpoint Search NetSuite (Direct)
```bash
curl -X POST 'http://localhost:9575/api/customers/search' \
  -H 'accept: application/json' \
  -H 'X-Client-Key: your_api_key' \
  -H 'X-Client-Secret: your_api_secret' \
  -H 'Content-Type: application/json' \
  -d '{
    "pageSize": 50,
    "pageIndex": 0,
    "lastmodified": "21/11/2025"
  }'
```

### Test Manual Sync
```bash
curl -X POST 'http://localhost:9575/api/admin/sync/customer' \
  -H 'X-Client-Key: your_api_key' \
  -H 'X-Client-Secret: your_api_secret'
```

## Tips

1. **Gunakan debug script** untuk mendapatkan informasi lengkap tentang status sistem
2. **Cek log aplikasi** untuk melihat error detail
3. **Test NetSuite connection** secara langsung dengan endpoint `/api/customers/search`
4. **Pastikan consumer berjalan** sebelum melakukan request yang akan trigger sync
5. **Cek sync jobs table** untuk melihat apakah job sudah dibuat dan status-nya

