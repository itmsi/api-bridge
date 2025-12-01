# Contributing to Express.js API Boilerplate

Terima kasih atas minat Anda untuk berkontribusi pada proyek ini! 🎉

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Process](#development-process)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)

## 📜 Code of Conduct

Proyek ini mengikuti [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/). Dengan berpartisipasi, Anda diharapkan untuk menjunjung tinggi kode etik ini.

## 🤝 How Can I Contribute?

### Reporting Bugs

Jika Anda menemukan bug:

1. Pastikan bug belum pernah dilaporkan di [Issues](https://github.com/your-username/express-api-boilerplate/issues)
2. Jika belum, buat issue baru dengan label `bug`
3. Jelaskan bug dengan detail:
   - Langkah untuk reproduce
   - Expected behavior
   - Actual behavior
   - Screenshots (jika ada)
   - Environment (OS, Node version, dll)

### Suggesting Enhancements

Punya ide untuk improvement?

1. Cek dulu di [Issues](https://github.com/your-username/express-api-boilerplate/issues) apakah sudah ada yang mengusulkan
2. Buat issue baru dengan label `enhancement`
3. Jelaskan:
   - Use case
   - Benefit yang didapat
   - Possible implementation (opsional)

### Pull Requests

Kami sangat menghargai Pull Request Anda! Ikuti langkah berikut:

1. Fork repository
2. Buat branch baru (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

## 🔧 Development Process

### Setup Development Environment

```bash
# Clone repository
git clone https://github.com/your-username/express-api-boilerplate.git
cd express-api-boilerplate

# Install dependencies
npm install

# Copy environment file
cp environment.example .env

# Setup database
npm run migrate
npm run seed

# Run development server
npm run dev
```

### Branch Naming Convention

- `feature/` - Fitur baru (e.g., `feature/add-user-profile`)
- `fix/` - Bug fixes (e.g., `fix/login-error`)
- `docs/` - Dokumentasi (e.g., `docs/update-readme`)
- `refactor/` - Refactoring code (e.g., `refactor/auth-module`)
- `test/` - Menambah atau update tests (e.g., `test/user-api`)

## 📝 Coding Standards

### JavaScript Style Guide

Kami mengikuti [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript) dengan beberapa modifikasi.

#### General Rules

```javascript
// ✅ Good
const getUserById = async (id) => {
  const user = await repository.findById(id);
  return user;
};

// ❌ Bad
const getUserById=async(id)=>{
const user=await repository.findById(id)
return user
}
```

#### Naming Conventions

- **Variables & Functions**: camelCase
  ```javascript
  const userName = 'John';
  const getUserData = () => {};
  ```

- **Constants**: UPPER_SNAKE_CASE
  ```javascript
  const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
  const API_BASE_URL = 'https://api.example.com';
  ```

- **Classes**: PascalCase
  ```javascript
  class UserService {
    constructor() {}
  }
  ```

- **Files**: snake_case
  ```
  user_repository.js
  auth_handler.js
  ```

#### Code Organization

1. **Import Order**:
   ```javascript
   // 1. Node modules
   const express = require('express');
   const path = require('path');
   
   // 2. Project modules
   const { verifyToken } = require('./middlewares');
   const userHandler = require('./modules/users/handler');
   
   // 3. Config/Utils
   const config = require('./config');
   const { logger } = require('./utils');
   ```

2. **Function Structure**:
   ```javascript
   const functionName = async (param1, param2) => {
     // 1. Input validation
     if (!param1) {
       throw new Error('param1 is required');
     }
     
     // 2. Main logic
     const result = await someOperation(param1, param2);
     
     // 3. Return
     return result;
   };
   ```

3. **Error Handling**:
   ```javascript
   // Always use try-catch for async operations
   const handler = async (req, res) => {
     try {
       const data = await repository.getData();
       return baseResponse(res, { data });
     } catch (error) {
       return errorResponse(res, error);
     }
   };
   ```

#### Comments

```javascript
// ✅ Good - Explain WHY, not WHAT
// Calculate discount based on user tier to incentivize upgrades
const discount = calculateDiscount(userTier);

// ❌ Bad - States the obvious
// Get user by ID
const user = getUserById(id);
```

### Database

1. **Migrations**: Selalu buat migration untuk perubahan schema
   ```bash
   npm run migrate:make descriptive_name
   ```

2. **Soft Delete**: Gunakan `deleted_at` untuk soft delete
   ```javascript
   table.timestamp('deleted_at').nullable();
   ```

3. **Timestamps**: Selalu include created_at dan updated_at
   ```javascript
   table.timestamp('created_at').defaultTo(knex.fn.now());
   table.timestamp('updated_at').defaultTo(knex.fn.now());
   ```

4. **UUID**: Gunakan UUID untuk primary key
   ```javascript
   table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
   ```

### API Design

1. **Endpoint Naming**: Gunakan plural nouns
   ```
   GET    /api/users
   POST   /api/users
   GET    /api/users/:id
   PUT    /api/users/:id
   DELETE /api/users/:id
   ```

2. **HTTP Methods**:
   - `GET` - Read data
   - `POST` - Create data
   - `PUT` - Update entire resource
   - `PATCH` - Update partial resource
   - `DELETE` - Delete data

3. **Response Format**:
   ```javascript
   // Success
   {
     "success": true,
     "data": { ... },
     "message": "Optional message"
   }
   
   // Error
   {
     "success": false,
     "error": "Error message",
     "details": { ... }
   }
   ```

4. **Status Codes**:
   - `200` - OK
   - `201` - Created
   - `400` - Bad Request
   - `401` - Unauthorized
   - `403` - Forbidden
   - `404` - Not Found
   - `500` - Internal Server Error

## 📦 Commit Messages

Gunakan format [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: Fitur baru
- `fix`: Bug fix
- `docs`: Perubahan dokumentasi
- `style`: Formatting, missing semicolons, dll
- `refactor`: Refactoring code
- `test`: Menambah tests
- `chore`: Maintenance tasks

### Examples

```bash
# Feature
feat(auth): add password reset functionality

# Bug fix
fix(users): resolve duplicate email validation error

# Documentation
docs(readme): update installation instructions

# Refactoring
refactor(database): optimize query performance
```

## 🔍 Pull Request Process

### Before Submitting

1. ✅ Code mengikuti style guide
2. ✅ Semua tests passing
3. ✅ Tidak ada linter errors
4. ✅ Documentation updated (jika perlu)
5. ✅ Migration dan seeder berfungsi
6. ✅ No console.log atau debug code

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How to test the changes

## Checklist
- [ ] Code follows style guide
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated
- [ ] Migration created (if needed)
```

### Review Process

1. Maintainer akan review PR Anda
2. Jika ada changes requested, silakan update
3. Setelah approved, PR akan di-merge
4. Branch akan di-delete setelah merge

## 🧪 Testing

### Running Tests

```bash
npm test
```

### Writing Tests

Tambahkan tests untuk:
- New features
- Bug fixes
- Critical business logic

## 📚 Documentation

### Code Documentation

- Tambahkan JSDoc comments untuk functions
- Update README.md jika menambah feature
- Update API documentation di Swagger

### Example

```javascript
/**
 * Get user by ID
 * @param {string} id - User UUID
 * @returns {Promise<Object>} User object
 * @throws {Error} If user not found
 */
const getUserById = async (id) => {
  // implementation
};
```

## ❓ Questions?

Jika ada pertanyaan:

1. Check [Documentation](README.md)
2. Search [Issues](https://github.com/your-username/express-api-boilerplate/issues)
3. Create new issue dengan label `question`

## 🙏 Thank You!

Kontribusi Anda membuat proyek ini lebih baik untuk semua orang. Terima kasih! 🎉

---

Happy Contributing! 🚀

