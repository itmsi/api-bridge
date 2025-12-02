# Modules Directory

Folder ini berisi semua business logic modules dari aplikasi. Setiap module merepresentasikan satu fitur atau domain dalam aplikasi.

## 📁 Struktur Module (MVC Pattern)

Setiap module sebaiknya memiliki struktur seperti berikut:

```
src/modules/namaModule/
├── index.js              # Routes (router definitions)
├── controller.js         # HTTP request/response handling
├── service.js            # Business logic (baru)
├── repository.js         # Database operations (rename dari postgre_repository.js)
├── validation.js         # Input validation rules
└── README.md            # Dokumentasi module (opsional)
```

### Penjelasan Layer:

1. **Controller** (`controller.js`): Menangani HTTP request/response, validasi input, dan memanggil service layer
2. **Service** (`service.js`): Berisi business logic, orchestration, dan transformasi data
3. **Repository** (`repository.js`): Hanya berisi operasi database, tidak ada business logic
4. **Validation** (`validation.js`): Rules untuk validasi input menggunakan express-validator
5. **Index** (`index.js`): Route definitions dan middleware setup

## 🏗️ Core Modules

### auth
Module untuk autentikasi pengguna (login, register, dll)

### users
Module untuk manajemen pengguna (CRUD users)

### sso (Optional)
Module untuk integrasi Single Sign-On dengan OAuth2/OIDC. Dapat dihapus jika tidak digunakan.

### helpers
Utility functions dan helper yang digunakan oleh berbagai module

## 📝 Cara Membuat Module Baru

### 1. Buat Folder Module

```bash
mkdir src/modules/namaModule
```

### 2. Buat File Controller (`controller.js`)

Controller menangani HTTP request/response dan memanggil service layer:

```javascript
const service = require('./service');
const { baseResponse, errorResponse, emptyDataResponse } = require('../../utils/response');

/**
 * Controller layer untuk HTTP request/response handling
 * Hanya menangani request/response, business logic ada di service
 */

const getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const data = await service.getAllItems(page, limit);
    
    if (!data || !data.items || (Array.isArray(data.items) && data.items.length === 0)) {
      return emptyDataResponse(res, page, limit, true);
    }
    
    return baseResponse(res, data);
  } catch (error) {
    return errorResponse(res, error);
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await service.getItemById(id);
    
    if (!data) {
      return emptyDataResponse(res, 1, 0, false);
    }
    
    return baseResponse(res, data);
  } catch (error) {
    return errorResponse(res, error);
  }
};

const create = async (req, res) => {
  try {
    const data = await service.createItem(req.body);
    return baseResponse(res, data, 'Data berhasil dibuat', 201);
  } catch (error) {
    return errorResponse(res, error);
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await service.updateItem(id, req.body);
    
    if (!data) {
      return emptyDataResponse(res, 1, 0, false);
    }
    
    return baseResponse(res, data, 'Data berhasil diupdate');
  } catch (error) {
    return errorResponse(res, error);
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await service.deleteItem(id);
    
    if (!result) {
      return emptyDataResponse(res, 1, 0, false);
    }
    
    return baseResponse(res, null, 'Data berhasil dihapus');
  } catch (error) {
    return errorResponse(res, error);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
};
```

### 3. Buat File Service (`service.js`)

Service berisi business logic dan orchestration:

```javascript
const repository = require('./repository');

/**
 * Service layer untuk business logic
 * Memisahkan business logic dari controller
 */

const getAllItems = async (page = 1, limit = 10) => {
  return await repository.findAll(page, limit);
};

const getItemById = async (id) => {
  return await repository.findById(id);
};

const createItem = async (data) => {
  // Business logic validation
  if (!data.name) {
    throw new Error('Name is required');
  }
  
  return await repository.create(data);
};

const updateItem = async (id, data) => {
  // Business logic validation
  const existing = await repository.findById(id);
  if (!existing) {
    return null;
  }
  
  return await repository.update(id, data);
};

const deleteItem = async (id) => {
  return await repository.remove(id);
};

module.exports = {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
};
```

### 4. Buat File Repository (`repository.js`)

Repository berisi query ke database (hanya operasi database, tidak ada business logic):

```javascript
const db = require('../../config/database');

const TABLE_NAME = 'your_table_name';

const findAll = async (page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  
  const data = await db(TABLE_NAME)
    .select('*')
    .where({ deleted_at: null })
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset);
    
  const total = await db(TABLE_NAME)
    .where({ deleted_at: null })
    .count('id as count')
    .first();
    
  return {
    data,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(total.count),
      totalPages: Math.ceil(total.count / limit)
    }
  };
};

const findById = async (id) => {
  return await db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .first();
};

const create = async (data) => {
  const [result] = await db(TABLE_NAME)
    .insert({
      ...data,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    })
    .returning('*');
  return result;
};

const update = async (id, data) => {
  const [result] = await db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .update({
      ...data,
      updated_at: db.fn.now()
    })
    .returning('*');
  return result;
};

const remove = async (id) => {
  // Soft delete
  const [result] = await db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .update({
      deleted_at: db.fn.now()
    })
    .returning('*');
  return result;
};

// Hard delete (optional)
const hardDelete = async (id) => {
  return await db(TABLE_NAME)
    .where({ id })
    .del();
};

module.exports = {
  findAll,
  findById,
  create,
  update,
  remove,
  hardDelete
};
```

### 5. Buat File Validation (`validation.js`)

Validation rules menggunakan express-validator:

```javascript
const { body, param, query } = require('express-validator');

const createValidation = [
  body('name')
    .notEmpty()
    .withMessage('Nama wajib diisi')
    .isLength({ min: 3, max: 100 })
    .withMessage('Nama harus antara 3-100 karakter'),
  body('email')
    .notEmpty()
    .withMessage('Email wajib diisi')
    .isEmail()
    .withMessage('Format email tidak valid'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Deskripsi maksimal 500 karakter'),
];

const updateValidation = [
  param('id')
    .notEmpty()
    .withMessage('ID wajib diisi')
    .isUUID()
    .withMessage('Format ID tidak valid'),
  body('name')
    .optional()
    .isLength({ min: 3, max: 100 })
    .withMessage('Nama harus antara 3-100 karakter'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Format email tidak valid'),
];

const getByIdValidation = [
  param('id')
    .notEmpty()
    .withMessage('ID wajib diisi')
    .isUUID()
    .withMessage('Format ID tidak valid'),
];

const listValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page harus berupa angka positif'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit harus antara 1-100'),
];

module.exports = {
  createValidation,
  updateValidation,
  getByIdValidation,
  listValidation
};
```

### 6. Buat File Index (`index.js`)

Export router dari module:

```javascript
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const {
  createValidation,
  updateValidation,
  getByIdValidation,
  listValidation
} = require('./validation');
// const { verifyToken } = require('../../middlewares');
const { validateMiddleware } = require('../../middlewares/validation');

// Routes
router.get(
  '/',
  listValidation,
  validateMiddleware,
  controller.getAll
);

router.get(
  '/:id',
  getByIdValidation,
  validateMiddleware,
  controller.getById
);

router.post(
  '/',
  createValidation,
  validateMiddleware,
  controller.create
);

router.put(
  '/:id',
  updateValidation,
  validateMiddleware,
  controller.update
);

router.delete(
  '/:id',
  getByIdValidation,
  validateMiddleware,
  controller.remove
);

module.exports = router;
```

### 7. Daftarkan Route di Main Routes

Edit file `src/routes/V1/index.js`:

```javascript
const yourModule = require('../../modules/yourModule');

// ... existing code ...

routing.use(`${API_TAG}/your-endpoint`, yourModule);
```

### 8. Buat Database Migration

Buat migration untuk table:

```bash
npm run migrate:make create_your_table
```

Edit file migration yang dibuat di `src/repository/postgres/migrations/`:

```javascript
exports.up = function(knex) {
  return knex.schema.createTable('your_table_name', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name', 100).notNullable();
    table.string('email', 100).unique();
    table.text('description');
    table.string('status', 20).defaultTo('active');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
    
    // Indexes
    table.index(['deleted_at']);
    table.index(['status']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('your_table_name');
};
```

Jalankan migration:

```bash
npm run migrate
```

### 9. Buat Seeder (Optional)

Buat seeder untuk data awal:

```bash
npm run seed:make your_table_seeder
```

Edit file seeder di `src/repository/postgres/seeders/`:

```javascript
exports.seed = async function(knex) {
  // Hapus data existing
  await knex('your_table_name').del();
  
  // Insert data
  await knex('your_table_name').insert([
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Example 1',
      email: 'example1@test.com',
      description: 'This is example 1',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Example 2',
      email: 'example2@test.com',
      description: 'This is example 2',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }
  ]);
};
```

Jalankan seeder:

```bash
npm run seed
```

## 🔒 Best Practices

### 1. MVC Pattern dengan Service Layer
Pisahkan kode menjadi 3 layer utama:
- **Controller**: Hanya menangani HTTP request/response
- **Service**: Berisi business logic dan orchestration
- **Repository**: Hanya operasi database

### 2. Repository Pattern
Pisahkan database logic ke repository layer untuk memudahkan testing dan maintenance.

### 3. Error Handling
Selalu gunakan try-catch dan return response yang konsisten:

```javascript
try {
  // logic
  return baseResponse(res, { data });
} catch (error) {
  return errorResponse(res, error);
}
```

### 4. Validation
Selalu validasi input dari user sebelum diproses:

```javascript
router.post(
  '/',
  verifyToken,
  createValidation,
  handleValidationErrors,
  handler.create
);
```

### 5. Soft Delete
Gunakan soft delete (deleted_at) untuk menjaga data integrity:

```javascript
const remove = async (id) => {
  return await db(TABLE_NAME)
    .where({ id })
    .update({ deleted_at: db.fn.now() });
};
```

### 6. Pagination
Selalu implement pagination untuk endpoint yang return list data:

```javascript
const findAll = async (page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  // ... query with limit and offset
};
```

### 7. Authentication
Gunakan middleware `verifyToken` untuk protected routes:

```javascript
router.get('/', verifyToken, controller.getAll);
```

### 8. Response Format
Gunakan standard response format dari utils:

```javascript
// Success
return baseResponse(res, { data }, 200);

// Error
return errorResponse(res, { message: 'Error message' }, 400);
```

## 📚 Utilities yang Tersedia

### Response Utils
- `baseResponse(res, data, statusCode)` - Success response
- `errorResponse(res, error, statusCode)` - Error response
- `paginationResponse(res, data, pagination)` - Paginated response

### Database Utils
- `db` - Knex instance untuk query
- `db.fn.now()` - Current timestamp
- `db.raw()` - Raw SQL query

### Validation Utils
- `handleValidationErrors` - Middleware untuk handle validation errors
- Express-validator methods: `body()`, `param()`, `query()`

### File Upload Utils
- `handleFileUpload` - Middleware untuk upload file
- `uploadToS3()` - Upload ke AWS S3
- `uploadToMinio()` - Upload ke MinIO

### Auth Utils
- `verifyToken` - Middleware untuk verify JWT token
- `hashPassword()` - Hash password dengan bcrypt
- `comparePassword()` - Compare password

## 🎯 Tips

1. **Naming Convention**: Gunakan camelCase untuk variable dan function, PascalCase untuk class
2. **File Naming**: Gunakan lowercase dengan underscore (snake_case) untuk file
3. **Endpoint Naming**: Gunakan plural untuk REST endpoint (e.g., `/users`, `/products`)
4. **Comments**: Tambahkan comment untuk logic yang kompleks
5. **Constants**: Simpan constant values di `src/utils/constant.js`
6. **Environment Variables**: Jangan hardcode config, gunakan `.env`
7. **Security**: Jangan expose sensitive data di response
8. **Logging**: Gunakan logger dari `src/utils/logger.js` untuk logging

## 📞 Support

Jika ada pertanyaan tentang cara membuat module, silakan buat issue di repository atau hubungi maintainer.

---

Happy Coding! 🚀

