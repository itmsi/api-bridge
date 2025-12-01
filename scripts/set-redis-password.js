#!/usr/bin/env node

/**
 * Script to set Redis password
 * Usage: node scripts/set-redis-password.js [password]
 * 
 * If password is not provided, it will use: Rubysa179596!
 */

const redis = require('redis');

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const NEW_PASSWORD = process.argv[2] || 'Rubysa179596!';

async function setRedisPassword() {
  let client = null;
  
  try {
    console.log(`\n🔐 Setting Redis Password...\n`);
    console.log(`Host: ${REDIS_HOST}:${REDIS_PORT}`);
    console.log(`New Password: ${'*'.repeat(NEW_PASSWORD.length)}\n`);

    // Try to connect without password first (in case Redis doesn't have password yet)
    try {
      client = redis.createClient({
        socket: {
          host: REDIS_HOST,
          port: REDIS_PORT,
        }
      });

      await client.connect();
      console.log('✅ Connected to Redis (no password required)');
    } catch (error) {
      // If connection fails, try with old password if provided
      const OLD_PASSWORD = process.env.REDIS_PASSWORD;
      if (OLD_PASSWORD) {
        console.log('⚠️  Connection failed, trying with old password...');
        client = redis.createClient({
          socket: {
            host: REDIS_HOST,
            port: REDIS_PORT,
          },
          password: OLD_PASSWORD
        });
        await client.connect();
        console.log('✅ Connected to Redis (with old password)');
      } else {
        throw error;
      }
    }

    // Set the new password
    await client.configSet('requirepass', NEW_PASSWORD);
    console.log('✅ Password set successfully!');

    // Test the new password
    await client.quit();
    console.log('🔄 Testing new password...');

    // Reconnect with new password
    client = redis.createClient({
      socket: {
        host: REDIS_HOST,
        port: REDIS_PORT,
      },
      password: NEW_PASSWORD
    });

    await client.connect();
    const pingResult = await client.ping();
    
    if (pingResult === 'PONG') {
      console.log('✅ Password test successful!');
      console.log('\n📝 Next steps:');
      console.log(`1. Update your .env file with:`);
      console.log(`   REDIS_PASSWORD=${NEW_PASSWORD}`);
      console.log('\n2. Restart your application\n');
    }

    await client.quit();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error setting Redis password:');
    console.error(`   ${error.message}\n`);
    
    if (error.message.includes('NOAUTH')) {
      console.log('💡 Tip: Redis requires authentication.');
      console.log('   If you forgot the password, you may need to:');
      console.log('   1. Stop Redis server');
      console.log('   2. Edit redis.conf and remove/comment requirepass line');
      console.log('   3. Restart Redis server');
      console.log('   4. Run this script again\n');
    }
    
    if (client) {
      try {
        await client.quit();
      } catch (e) {
        // Ignore quit errors
      }
    }
    
    process.exit(1);
  }
}

// Run the script
setRedisPassword();

