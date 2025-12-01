# Example Module

Module contoh yang bisa dijadikan template untuk membuat module baru.

## 📁 Struktur File

```
src/modules/example/
├── handler.js              # Request handlers / Controllers
├── postgre_repository.js   # Database operations
├── validation.js           # Input validation rules
├── index.js               # Route definitions
└── README.md              # Dokumentasi module (ini)
```

## 🎯 Fitur

Module ini mendemonstrasikan:
- ✅ CRUD operations (Create, Read, Update, Delete)
- ✅ Soft delete dengan restore functionality
- ✅ Pagination untuk list data
- ✅ Input validation dengan express-validator
- ✅ Error handling yang konsisten
- ✅ Response format yang standar
- ✅ Database operations dengan Knex.js
- ✅ Swagger/OpenAPI documentation

## 📊 Database Schema

Tabel `examples`:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (auto-generated) |
| name | VARCHAR(100) | Nama item (required) |
| description | TEXT | Deskripsi item (optional) |
| status | VARCHAR(20) | Status: active/inactive |
| created_at | TIMESTAMP | Waktu pembuatan |
| updated_at | TIMESTAMP | Waktu update terakhir |
| deleted_at | TIMESTAMP | Waktu soft delete (nullable) |

Indexes:
- `idx_examples_deleted_at` - untuk soft delete queries
- `idx_examples_status` - untuk filter by status
- `idx_examples_created_at` - untuk sorting

## 🔌 API Endpoints

### 1. Get All Examples (with pagination)
```http
GET /api/examples?page=1&limit=10
```

**Query Parameters:**
- `page` (optional): Halaman yang ingin ditampilkan (default: 1)
- `limit` (optional): Jumlah item per halaman (default: 10, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "Example 1",
        "description": "Description",
        "status": "active",
        "created_at": "2025-01-01T00:00:00.000Z",
        "updated_at": "2025-01-01T00:00:00.000Z",
        "deleted_at": null
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```

### 2. Get Example by ID
```http
GET /api/examples/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Example 1",
    "description": "Description",
    "status": "active",
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-01T00:00:00.000Z",
    "deleted_at": null
  }
}
```

### 3. Create Example
```http
POST /api/examples
Content-Type: application/json

{
  "name": "New Example",
  "description": "Description of new example",
  "status": "active"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "New Example",
    "description": "Description of new example",
    "status": "active",
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-01T00:00:00.000Z",
    "deleted_at": null
  },
  "message": "Data berhasil dibuat"
}
```

### 4. Update Example
```http
PUT /api/examples/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description",
  "status": "inactive"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Updated Name",
    "description": "Updated description",
    "status": "inactive",
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-01T10:00:00.000Z",
    "deleted_at": null
  },
  "message": "Data berhasil diupdate"
}
```

### 5. Delete Example (Soft Delete)
```http
DELETE /api/examples/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Data berhasil dihapus"
}
```

### 6. Restore Deleted Example
```http
POST /api/examples/:id/restore
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Example",
    "description": "Description",
    "status": "active",
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-01T10:00:00.000Z",
    "deleted_at": null
  },
  "message": "Data berhasil direstore"
}
```

## 📝 Validation Rules

### Create Validation
- `name`: Required, 3-100 characters
- `description`: Optional, max 500 characters
- `status`: Optional, must be 'active' or 'inactive'

### Update Validation
- `id`: Required, must be valid UUID
- `name`: Optional, 3-100 characters
- `description`: Optional, max 500 characters
- `status`: Optional, must be 'active' or 'inactive'

## 🔄 Cara Menggunakan sebagai Template

### 1. Copy Module
```bash
cp -r src/modules/example src/modules/your-module
```

### 2. Rename Files (Find & Replace)
Ganti semua occurrence dari:
- `examples` → `your_table_name`
- `Example` → `YourModule`
- `/api/examples` → `/api/your-endpoint`

### 3. Update Database Migration
```bash
npm run migrate:make create_your_table
```

Edit migration file sesuai kebutuhan.

### 4. Update Routes
Edit `src/routes/V1/index.js`:
```javascript
const yourModule = require('../../modules/your-module')
routing.use(`${API_TAG}/your-endpoint`, yourModule)
```

### 5. Update Swagger (Optional)
- Copy `src/static/path/example.js` → `src/static/path/your-module.js`
- Copy `src/static/schema/example.js` → `src/static/schema/your-module.js`
- Update `src/static/index.js` untuk import schema dan path

### 6. Run Migration & Seeder
```bash
npm run migrate
npm run seed
```

## 🧪 Testing

Test endpoints dengan curl atau Postman:

```bash
# Create
curl -X POST http://localhost:3000/api/examples \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Example","description":"Test","status":"active"}'

# Get All
curl http://localhost:3000/api/examples?page=1&limit=10

# Get by ID
curl http://localhost:3000/api/examples/{id}

# Update
curl -X PUT http://localhost:3000/api/examples/{id} \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name"}'

# Delete
curl -X DELETE http://localhost:3000/api/examples/{id}

# Restore
curl -X POST http://localhost:3000/api/examples/{id}/restore
```

## 🔐 Menambahkan Authentication

Uncomment middleware `verifyToken` di `index.js`:

```javascript
const { verifyToken } = require('../../middlewares');

router.get('/', verifyToken, listValidation, handleValidationErrors, handler.getAll);
```

## 📚 Best Practices

1. **Repository Pattern**: Semua database logic ada di `postgre_repository.js`
2. **Error Handling**: Selalu gunakan try-catch dan return consistent response
3. **Validation**: Validasi input sebelum masuk ke handler
4. **Soft Delete**: Gunakan `deleted_at` untuk soft delete
5. **Pagination**: Implement pagination untuk list endpoints
6. **Indexes**: Tambahkan index untuk kolom yang sering di-query
7. **Timestamps**: Selalu include created_at, updated_at, deleted_at
8. **UUID**: Gunakan UUID untuk primary key
9. **Documentation**: Update Swagger documentation

## 🎯 Tips

- Gunakan singular untuk nama module, plural untuk endpoint
- Keep handlers thin, move logic to repository
- Use consistent naming convention
- Add comments untuk logic yang kompleks
- Write clear error messages
- Test all endpoints before deploying

---

Module ini adalah template dasar. Sesuaikan dengan kebutuhan project Anda! 🚀

