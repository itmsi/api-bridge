# Modules Directory

Folder ini berisi semua business logic modules dari aplikasi. Setiap module merepresentasikan satu fitur atau domain dalam aplikasi.

## 📁 Struktur Module

Setiap module sebaiknya memiliki struktur seperti berikut:

```
src/modules/namaModule/
├── index.js              # Export router dan handler
├── handler.js            # Request handlers / Controllers
├── validation.js         # Input validation rules
├── postgre_repository.js # Database operations
└── README.md            # Dokumentasi module (opsional)
```

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

### 2. Buat File Handler (`handler.js`)

Handler berisi logic untuk menangani HTTP request:

```javascript
const repository = require('./postgre_repository');
const { baseResponse, errorResponse } = require('../../utils/response');

const getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const data = await repository.findAll(page, limit);
    return baseResponse(res, { data });
  } catch (error) {
    return errorResponse(res, error);
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await repository.findById(id);
    
    if (!data) {
      return errorResponse(res, { message: 'Data tidak ditemukan' }, 404);
    }
    
    return baseResponse(res, { data });
  } catch (error) {
    return errorResponse(res, error);
  }
};

const create = async (req, res) => {
  try {
    const data = await repository.create(req.body);
    return baseResponse(res, { data }, 201);
  } catch (error) {
    return errorResponse(res, error);
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await repository.update(id, req.body);
    
    if (!data) {
      return errorResponse(res, { message: 'Data tidak ditemukan' }, 404);
    }
    
    return baseResponse(res, { data });
  } catch (error) {
    return errorResponse(res, error);
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await repository.remove(id);
    
    if (!result) {
      return errorResponse(res, { message: 'Data tidak ditemukan' }, 404);
    }
    
    return baseResponse(res, { message: 'Data berhasil dihapus' });
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

### 3. Buat File Repository (`postgre_repository.js`)

Repository berisi query ke database:

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

### 4. Buat File Validation (`validation.js`)

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

### 5. Buat File Index (`index.js`)

Export router dari module:

```javascript
const express = require('express');
const router = express.Router();
const handler = require('./handler');
const {
  createValidation,
  updateValidation,
  getByIdValidation,
  listValidation
} = require('./validation');
const { verifyToken } = require('../../middlewares');
const { handleValidationErrors } = require('../../middlewares/validation');

// Routes
router.get(
  '/',
  verifyToken,
  listValidation,
  handleValidationErrors,
  handler.getAll
);

router.get(
  '/:id',
  verifyToken,
  getByIdValidation,
  handleValidationErrors,
  handler.getById
);

router.post(
  '/',
  verifyToken,
  createValidation,
  handleValidationErrors,
  handler.create
);

router.put(
  '/:id',
  verifyToken,
  updateValidation,
  handleValidationErrors,
  handler.update
);

router.delete(
  '/:id',
  verifyToken,
  getByIdValidation,
  handleValidationErrors,
  handler.remove
);

module.exports = router;
```

### 6. Daftarkan Route di Main Routes

Edit file `src/routes/V1/index.js`:

```javascript
const yourModule = require('../../modules/yourModule');

// ... existing code ...

routing.use(`${API_TAG}/your-endpoint`, yourModule);
```

### 7. Buat Database Migration

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

### 8. Buat Seeder (Optional)

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

### 1. Repository Pattern
Pisahkan database logic ke repository layer untuk memudahkan testing dan maintenance.

### 2. Error Handling
Selalu gunakan try-catch dan return response yang konsisten:

```javascript
try {
  // logic
  return baseResponse(res, { data });
} catch (error) {
  return errorResponse(res, error);
}
```

### 3. Validation
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

### 4. Soft Delete
Gunakan soft delete (deleted_at) untuk menjaga data integrity:

```javascript
const remove = async (id) => {
  return await db(TABLE_NAME)
    .where({ id })
    .update({ deleted_at: db.fn.now() });
};
```

### 5. Pagination
Selalu implement pagination untuk endpoint yang return list data:

```javascript
const findAll = async (page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  // ... query with limit and offset
};
```

### 6. Authentication
Gunakan middleware `verifyToken` untuk protected routes:

```javascript
router.get('/', verifyToken, handler.getAll);
```

### 7. Response Format
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

