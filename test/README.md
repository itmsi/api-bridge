# Testing

Folder ini berisi test files untuk proyek API Boilerplate.

## 🧪 Testing Framework

Anda dapat menggunakan testing framework pilihan Anda, seperti:

- **Jest** - JavaScript testing framework
- **Mocha** - Feature-rich JavaScript test framework
- **Supertest** - HTTP assertions for API testing
- **Chai** - BDD/TDD assertion library

## 📦 Setup Testing (Contoh dengan Jest)

### Install Dependencies

```bash
npm install --save-dev jest supertest
```

### Update package.json

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "jest": {
    "testEnvironment": "node",
    "coveragePathIgnorePatterns": ["/node_modules/"]
  }
}
```

## 📝 Test Structure

```
test/
├── unit/              # Unit tests
│   ├── utils/
│   ├── services/
│   └── repositories/
├── integration/       # Integration tests
│   ├── api/
│   └── database/
├── e2e/              # End-to-end tests
├── fixtures/         # Test data
└── helpers/          # Test utilities
```

## ✍️ Writing Tests

### Unit Test Example

```javascript
// test/unit/utils/response.test.js
const { baseResponse } = require('../../../src/utils/response');

describe('Response Utils', () => {
  let res;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  test('baseResponse should return success response', () => {
    baseResponse(res, { data: 'test' });
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: 'test'
    });
  });
});
```

### API Integration Test Example

```javascript
// test/integration/api/auth.test.js
const request = require('supertest');
const app = require('../../../src/app');

describe('Auth API', () => {
  describe('POST /api/auth/login', () => {
    test('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
    });

    test('should fail with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
```

### Repository Test Example

```javascript
// test/integration/database/user.repository.test.js
const repository = require('../../../src/modules/users/postgre_repository');
const db = require('../../../src/config/database');

describe('User Repository', () => {
  beforeAll(async () => {
    // Setup test database
    await db.migrate.latest();
  });

  afterAll(async () => {
    // Cleanup
    await db.migrate.rollback();
    await db.destroy();
  });

  beforeEach(async () => {
    // Clean table
    await db('users').del();
  });

  test('should create user', async () => {
    const userData = {
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashedpassword'
    };

    const user = await repository.create(userData);

    expect(user).toHaveProperty('id');
    expect(user.email).toBe(userData.email);
    expect(user.name).toBe(userData.name);
  });

  test('should find user by id', async () => {
    const userData = {
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashedpassword'
    };

    const createdUser = await repository.create(userData);
    const foundUser = await repository.findById(createdUser.id);

    expect(foundUser).toBeDefined();
    expect(foundUser.id).toBe(createdUser.id);
  });
});
```

## 🏃 Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- auth.test.js
```

## 📊 Test Coverage

Aim for at least 80% code coverage:

```bash
npm run test:coverage
```

Coverage report akan tersimpan di `coverage/` folder.

## 🎯 Best Practices

1. **Arrange-Act-Assert (AAA) Pattern**
   ```javascript
   test('should do something', () => {
     // Arrange
     const input = 'test';
     
     // Act
     const result = functionToTest(input);
     
     // Assert
     expect(result).toBe('expected');
   });
   ```

2. **Test Isolation**
   - Each test should be independent
   - Use `beforeEach` and `afterEach` for setup/teardown
   - Don't rely on test execution order

3. **Descriptive Test Names**
   ```javascript
   // ✅ Good
   test('should return 404 when user not found', () => {});
   
   // ❌ Bad
   test('user test', () => {});
   ```

4. **Mock External Dependencies**
   ```javascript
   jest.mock('../../../src/config/database');
   ```

5. **Test Edge Cases**
   - Null/undefined values
   - Empty arrays/objects
   - Invalid inputs
   - Boundary values

## 🔧 Testing Utilities

Buat helper functions di `test/helpers/`:

```javascript
// test/helpers/auth.helper.js
const jwt = require('jsonwebtoken');

const generateTestToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '1h'
  });
};

const createTestUser = async (overrides = {}) => {
  const defaultUser = {
    email: 'test@example.com',
    name: 'Test User',
    password: 'password123'
  };
  
  return await userRepository.create({
    ...defaultUser,
    ...overrides
  });
};

module.exports = {
  generateTestToken,
  createTestUser
};
```

## 📚 Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

Happy Testing! 🧪

