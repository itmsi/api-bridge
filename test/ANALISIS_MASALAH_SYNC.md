# Analisis Masalah: Data Tidak Tampil dan Tidak Sync

## Ringkasan Masalah

Endpoint `POST /api/customers/get` seharusnya:
1. Mengambil data dari database (atau cache)
2. Jika data stale/kosong, trigger sync ke NetSuite
3. NetSuite API dipanggil dengan format: `{ pageSize: 50, pageIndex: 0, lastmodified: "21/11/2025" }`

Tapi data tidak tampil dan tidak sync.

## Kemungkinan Penyebab

### 1. Script ID dan Deployment ID Tidak Sesuai

**Masalah:**
- Di Postman collection, script ID = `532`, deployment ID = `1`
- Tapi di database atau environment variable mungkin berbeda

**Solusi:**
```sql
-- Cek script config di database
SELECT * FROM netsuite_scripts 
WHERE module = 'customer' AND operation = 'getPage';

-- Jika tidak ada, tambahkan:
INSERT INTO netsuite_scripts (module, operation, script_id, deployment_id, is_active)
VALUES ('customer', 'getPage', '532', '1', true)
ON CONFLICT (module, operation) 
DO UPDATE SET script_id = '532', deployment_id = '1', is_active = true;
```

### 2. Consumer RabbitMQ Tidak Berjalan

**Masalah:**
- Sync job di-publish ke RabbitMQ, tapi tidak ada consumer yang memproses
- Data tidak masuk ke database karena job tidak diproses

**Solusi:**
```bash
# Start consumer
npm run consumer

# Atau dengan PM2
pm2 start src/scripts/start-consumer.js --name consumer

# Cek apakah consumer berjalan
pm2 list
# atau
ps aux | grep start-consumer
```

### 3. Format Request ke NetSuite Tidak Sesuai

**Masalah:**
- Format request sudah benar: `{ pageSize, pageIndex, lastmodified }`
- Tapi mungkin ada masalah di parsing response

**Test:**
```bash
# Test langsung ke NetSuite API
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

### 4. OAuth Credentials Tidak Valid

**Masalah:**
- OAuth credentials tidak valid atau expired
- NetSuite API menolak request

**Solusi:**
```bash
# Cek environment variables
echo $NETSUITE_CONSUMER_KEY
echo $NETSUITE_CONSUMER_SECRET
echo $NETSUITE_TOKEN
echo $NETSUITE_TOKEN_SECRET
echo $NETSUITE_REALM

# Pastikan semua terisi dan valid
```

### 5. Data di NetSuite Kosong atau Format Response Berbeda

**Masalah:**
- NetSuite mengembalikan data tapi format berbeda
- Transform function tidak bisa parse response

**Test:**
- Gunakan endpoint `/api/customers/search` untuk test langsung
- Cek log aplikasi untuk melihat response dari NetSuite

### 6. Sync Tidak Di-trigger Karena Data Tidak Stale

**Masalah:**
- Data dianggap masih fresh (kurang dari 12 jam)
- Sync tidak di-trigger meskipun data kosong

**Solusi:**
- Force sync dengan endpoint admin:
```bash
curl -X POST 'http://localhost:9575/api/admin/sync/customer' \
  -H 'X-Client-Key: your_api_key' \
  -H 'X-Client-Secret: your_api_secret'
```

## Langkah Debugging

### Step 1: Cek Database
```sql
-- Cek apakah ada data customer
SELECT COUNT(*) FROM customers WHERE is_deleted = false;

-- Cek sync tracker
SELECT * FROM sync_tracker WHERE module = 'customer';

-- Cek sync jobs
SELECT * FROM sync_jobs 
WHERE module = 'customer' 
ORDER BY created_at DESC 
LIMIT 10;
```

### Step 2: Cek Script Configuration
```sql
SELECT * FROM netsuite_scripts 
WHERE module = 'customer';
```

Pastikan ada entry untuk:
- `module = 'customer'`, `operation = 'getPage'`
- `script_id = '532'`, `deployment_id = '1'`

### Step 3: Test NetSuite Connection
```bash
# Gunakan debug script
node test/debug-sync-issue.js

# Atau test langsung
curl -X POST 'http://localhost:9575/api/customers/search' \
  -H 'X-Client-Key: your_api_key' \
  -H 'X-Client-Secret: your_api_secret' \
  -H 'Content-Type: application/json' \
  -d '{"pageSize": 10, "pageIndex": 0}'
```

### Step 4: Cek Consumer
```bash
# Pastikan consumer berjalan
npm run consumer

# Cek log consumer
tail -f logs/listener/2025/12/1/listener-01-12-2025.txt
```

### Step 5: Cek Log Aplikasi
```bash
# Cek log aplikasi
tail -f logs/application/2025/12/1/app.log

# Cari error atau warning
grep -i error logs/application/2025/12/1/app.log
grep -i "netsuite" logs/application/2025/12/1/app.log
```

## Bug yang Ditemukan dan Diperbaiki

### Bug di `getMaxLastModifiedFromNetSuite`

**Masalah:**
- Fungsi menggunakan `page` (1-based) padahal `getCustomersPage` lebih baik menggunakan `pageIndex` (0-based)

**Perbaikan:**
- Mengubah dari `{ page: currentPage, pageSize }` menjadi `{ pageIndex: currentPage - 1, pageSize }`

## Solusi Lengkap

1. **Pastikan Script Config Benar:**
```sql
INSERT INTO netsuite_scripts (module, operation, script_id, deployment_id, is_active)
VALUES ('customer', 'getPage', '532', '1', true)
ON CONFLICT (module, operation) 
DO UPDATE SET script_id = '532', deployment_id = '1', is_active = true;
```

2. **Start Consumer:**
```bash
npm run consumer
```

3. **Test Endpoint:**
```bash
# Gunakan test script
./test/customers-get.test.sh

# Atau manual
curl -X POST 'http://localhost:9575/api/customers/get' \
  -H 'X-Client-Key: your_api_key' \
  -H 'X-Client-Secret: your_api_secret' \
  -H 'Content-Type: application/json' \
  -d '{"page": 1, "limit": 10}'
```

4. **Monitor Sync:**
```sql
-- Cek sync jobs
SELECT * FROM sync_jobs 
WHERE module = 'customer' 
ORDER BY created_at DESC 
LIMIT 5;

-- Cek apakah data masuk
SELECT COUNT(*) FROM customers;
```

## Checklist

- [ ] Script ID dan Deployment ID benar di database (532, 1)
- [ ] Consumer RabbitMQ sedang berjalan
- [ ] OAuth credentials valid
- [ ] NetSuite API bisa diakses (test dengan `/api/customers/search`)
- [ ] Database memiliki data atau sync job berhasil dibuat
- [ ] Log aplikasi tidak ada error
- [ ] Sync tracker terupdate setelah sync

## File Testing yang Tersedia

1. `test/customers-get.test.sh` - Test dengan curl
2. `test/customers-get.test.js` - Test dengan axios
3. `test/debug-sync-issue.js` - Debug script lengkap
4. `test/README_CUSTOMER_TESTING.md` - Dokumentasi lengkap

Gunakan file-file ini untuk testing dan debugging masalah sync.

