# Quick Start Guide

Panduan cepat untuk memulai development dengan Express.js API Boilerplate.

## 🚀 Setup dalam 5 Menit

### 1. Clone & Install

```bash
git clone https://github.com/your-username/express-api-boilerplate.git
cd express-api-boilerplate
npm install
```

### 2. Setup Environment

```bash
cp environment.example .env
```

Edit `.env` dan update konfigurasi database:

```env
DB_HOST_DEV=localhost
DB_PORT_DEV=5432
DB_USER_DEV=postgres
DB_PASS_DEV=your_password
DB_NAME_DEV=your_database
```

### 3. Setup Database

```bash
# Buat database terlebih dahulu
createdb your_database

# Run migrations
npm run migrate
```

### 4. Start Development Server

```bash
npm run dev
```

Server berjalan di `http://localhost:3000` 🎉

API Documentation: `http://localhost:3000/documentation`

## 📝 Membuat Module Baru (Cara Cepat)

### Gunakan Example Module sebagai Template!

Boilerplate sudah include module `example` yang bisa langsung di-copy:

```bash
# Copy module example
cp -r src/modules/example src/modules/products

# Selesai! Tinggal customize
```

### Cara Manual: Membuat Module "Products" dari Scratch

#### 1. Buat Migration

```bash
npm run migrate:make create_products_table
```

Edit file migration:

```javascript
exports.up = function(knex) {
  return knex.schema.createTable('products', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name', 100).notNullable();
    table.text('description');
    table.decimal('price', 10, 2).notNullable();
    table.integer('stock').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('products');
};
```

Run migration:

```bash
npm run migrate
```

#### 2. Buat Module Files

Buat folder dan files:

```
src/modules/products/
├── index.js
├── handler.js
├── validation.js
└── postgre_repository.js
```

**handler.js**:

```javascript
const repository = require('./postgre_repository');
const { baseResponse, errorResponse } = require('../../utils/response');

const getAll = async (req, res) => {
  try {
    const data = await repository.findAll();
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

module.exports = { getAll, create };
```

**postgre_repository.js**:

```javascript
const db = require('../../config/database');

const findAll = async () => {
  return await db('products')
    .where({ deleted_at: null })
    .orderBy('created_at', 'desc');
};

const create = async (data) => {
  const [result] = await db('products')
    .insert(data)
    .returning('*');
  return result;
};

module.exports = { findAll, create };
```

**validation.js**:

```javascript
const { body } = require('express-validator');

const createValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('price').isNumeric().withMessage('Price must be number'),
];

module.exports = { createValidation };
```

**index.js**:

```javascript
const express = require('express');
const router = express.Router();
const handler = require('./handler');
const { createValidation } = require('./validation');
const { verifyToken } = require('../../middlewares');
const { handleValidationErrors } = require('../../middlewares/validation');

router.get('/', verifyToken, handler.getAll);
router.post('/', verifyToken, createValidation, handleValidationErrors, handler.create);

module.exports = router;
```

#### 3. Register Route

Edit `src/routes/V1/index.js`:

```javascript
const products = require('../../modules/products');

// ... existing code ...

routing.use(`${API_TAG}/products`, products);
```

Selesai! ✅

Test API:

```bash
# Login dulu untuk mendapatkan token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# Create product
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"Product 1","price":100000,"stock":10}'

# Get all products
curl http://localhost:3000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🎯 Next Steps

1. Baca [README.md](README.md) untuk dokumentasi lengkap
2. Lihat [src/modules/README.md](src/modules/README.md) untuk panduan module
3. Baca [CONTRIBUTING.md](CONTRIBUTING.md) untuk contribution guidelines

## 🔥 Tips

### Development Mode

```bash
npm run dev  # Auto-reload with nodemon
```

### Migration Commands

```bash
npm run migrate              # Run all migrations
npm run migrate:rollback     # Rollback last migration
npm run migrate:make <name>  # Create new migration
```

### Database Seeder

```bash
npm run seed              # Run all seeders
npm run seed:make <name>  # Create new seeder
```

### Docker Development

```bash
docker-compose -f docker-compose.dev.yml up
```

## 📚 Common Tasks

### Add New Endpoint

1. Tambahkan function di `handler.js`
2. Tambahkan validation (optional)
3. Register route di `index.js`

### Add Authentication

Gunakan middleware `verifyToken`:

```javascript
router.get('/protected', verifyToken, handler.getProtected);
```

### Add File Upload

Gunakan middleware `handleFileUpload`:

```javascript
const { handleFileUpload } = require('../../middlewares/fileUpload');

router.post('/upload', verifyToken, handleFileUpload, handler.upload);
```

### Custom Validation

```javascript
const { body, param } = require('express-validator');

const customValidation = [
  body('email').isEmail(),
  param('id').isUUID(),
];
```

## ❓ Troubleshooting

### Database Connection Error

```bash
# Pastikan PostgreSQL running
# Check credentials di .env
# Test connection:
psql -U postgres -d your_database
```

### Migration Error

```bash
# Rollback dan coba lagi
npm run migrate:rollback
npm run migrate
```

### Port Already in Use

```bash
# Change port di .env
APP_PORT=3001
```

## 🆘 Need Help?

- Check [README.md](README.md)
- Read [src/modules/README.md](src/modules/README.md)
- Create an issue on GitHub
- Check existing issues

---

Happy Coding! 🚀

