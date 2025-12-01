# Scripts

Folder ini berisi utility scripts dan automation scripts untuk proyek.

## 📁 Available Scripts

Saat ini tersedia:
- `src/scripts/start-consumer.js` - RabbitMQ consumer starter

## 🔧 Menambahkan Script Baru

### Database Scripts

**Contoh: Database Backup Script**

```javascript
// scripts/backup-database.js
const { exec } = require('child_process');
const path = require('path');

const DB_HOST = process.env.DB_HOST_PROD || 'localhost';
const DB_NAME = process.env.DB_NAME_PROD || 'database';
const DB_USER = process.env.DB_USER_PROD || 'postgres';
const BACKUP_DIR = path.join(__dirname, '../backups');

const timestamp = new Date().toISOString().replace(/:/g, '-');
const backupFile = path.join(BACKUP_DIR, `backup-${timestamp}.sql`);

const command = `pg_dump -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} -f ${backupFile}`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`Backup error: ${error}`);
    return;
  }
  console.log(`Database backup created: ${backupFile}`);
});
```

Usage:
```bash
node scripts/backup-database.js
```

### Data Migration Scripts

**Contoh: Data Import Script**

```javascript
// scripts/import-data.js
const fs = require('fs');
const csv = require('csv-parser');
const db = require('../src/config/database');

const importCSV = async (filePath, tableName) => {
  const results = [];
  
  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      try {
        await db(tableName).insert(results);
        console.log(`Imported ${results.length} records to ${tableName}`);
      } catch (error) {
        console.error('Import error:', error);
      } finally {
        await db.destroy();
      }
    });
};

// Usage
const [,, filePath, tableName] = process.argv;
importCSV(filePath, tableName);
```

Usage:
```bash
node scripts/import-data.js data.csv users
```

### Cleanup Scripts

**Contoh: Clean Temp Files**

```javascript
// scripts/cleanup-temp.js
const fs = require('fs').promises;
const path = require('path');

const TEMP_DIR = path.join(__dirname, '../uploads/temp');
const MAX_AGE_HOURS = 24;

const cleanupOldFiles = async () => {
  try {
    const files = await fs.readdir(TEMP_DIR);
    const now = Date.now();
    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(TEMP_DIR, file);
      const stats = await fs.stat(filePath);
      const ageHours = (now - stats.mtime.getTime()) / (1000 * 60 * 60);

      if (ageHours > MAX_AGE_HOURS) {
        await fs.unlink(filePath);
        deletedCount++;
        console.log(`Deleted: ${file}`);
      }
    }

    console.log(`Cleanup complete. Deleted ${deletedCount} files.`);
  } catch (error) {
    console.error('Cleanup error:', error);
  }
};

cleanupOldFiles();
```

Setup cron job:
```bash
# Run cleanup every day at 2 AM
0 2 * * * node /path/to/scripts/cleanup-temp.js
```

### Seed Data Scripts

**Contoh: Generate Test Data**

```javascript
// scripts/generate-test-data.js
const { faker } = require('@faker-js/faker');
const db = require('../src/config/database');

const generateUsers = async (count = 100) => {
  const users = [];

  for (let i = 0; i < count; i++) {
    users.push({
      email: faker.internet.email(),
      name: faker.person.fullName(),
      password: '$2b$12$hashedpassword', // Pre-hashed password
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  await db('users').insert(users);
  console.log(`Generated ${count} test users`);
};

const generateProducts = async (count = 500) => {
  const products = [];

  for (let i = 0; i < count; i++) {
    products.push({
      name: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      price: faker.commerce.price(),
      stock: faker.number.int({ min: 0, max: 1000 }),
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  await db('products').insert(products);
  console.log(`Generated ${count} test products`);
};

const run = async () => {
  try {
    await generateUsers(100);
    await generateProducts(500);
  } catch (error) {
    console.error('Error generating test data:', error);
  } finally {
    await db.destroy();
  }
};

run();
```

Usage:
```bash
node scripts/generate-test-data.js
```

### Maintenance Scripts

**Contoh: Check Health**

```javascript
// scripts/health-check.js
const axios = require('axios');

const API_URL = process.env.APP_BASE_URL || 'http://localhost:3000';

const checkHealth = async () => {
  try {
    const response = await axios.get(`${API_URL}/`);
    
    if (response.status === 200) {
      console.log('✅ API is healthy');
      console.log('Uptime:', response.data.data.uptimes, 'seconds');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ API is down:', error.message);
    process.exit(1);
  }
};

checkHealth();
```

## 📝 Script Template

```javascript
#!/usr/bin/env node
/**
 * Script Name: your-script-name
 * Description: What this script does
 * Usage: node scripts/your-script.js [arguments]
 */

require('dotenv').config();
const db = require('../src/config/database');

const main = async () => {
  try {
    console.log('Script started...');
    
    // Your script logic here
    
    console.log('Script completed successfully');
  } catch (error) {
    console.error('Script error:', error);
    process.exit(1);
  } finally {
    // Cleanup
    if (db) await db.destroy();
  }
};

// Run script if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
```

## 🔒 Best Practices

1. **Error Handling**: Always handle errors properly
2. **Logging**: Add clear console logs for progress
3. **Cleanup**: Close database connections and file handles
4. **Documentation**: Add comments and usage instructions
5. **Environment Variables**: Use .env for configuration
6. **Exit Codes**: Use proper exit codes (0 for success, 1 for error)

## 📚 Useful NPM Packages for Scripts

- `commander` - CLI argument parsing
- `inquirer` - Interactive prompts
- `ora` - Terminal spinners
- `chalk` - Colored terminal output
- `csv-parser` - CSV file parsing
- `exceljs` - Excel file handling
- `@faker-js/faker` - Generate fake data

## 🔗 Resources

- [Node.js Child Process](https://nodejs.org/api/child_process.html)
- [Node.js File System](https://nodejs.org/api/fs.html)
- [Commander.js](https://github.com/tj/commander.js)

---

Happy Scripting! 🚀

