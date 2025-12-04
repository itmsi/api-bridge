/**
 * Server Entry Point
 * Handles process events and starts the Express application
 * Support multiple environments: sandbox dan production pada port berbeda
 */
// Load environment variables FIRST before requiring other modules
require('dotenv').config()

const { getPortForEnvironment, getCurrentEnvironment, SANDBOX_PORT, PRODUCTION_PORT } = require('./utils/environment')
const { pgCore, getDbForEnvironment } = require('./config/database')
const { connectRedis, isRedisReady, REDIS_ENABLED } = require('./config/redis')
const { connectRabbitMQ } = require('./config/rabbitmq')
const knexfile = require('./knexfile')

process.on('warning', (warning) => {
  console.warn(warning.name)
  console.warn(warning.message)
  console.warn(warning.stack)
})

const unhandledRejections = new Map()
process.on('unhandledRejection', (reason, promise) => {
  unhandledRejections.set(promise, reason)
  console.log(
    process.stderr.fd,
    `Caught rejection: ${promise}\n`
    + `Exception reason: ${reason}`
  )
})
process.on('rejectionHandled', (promise) => {
  unhandledRejections.delete(promise)
})

process.on('uncaughtException', (err, origin) => {
  console.log(
    process.stderr.fd,
    `Caught exception: ${err}\n`
    + `Exception origin: ${origin}`
  )
})

process.on('SIGTERM', () => {
  console.info('SIGTERM received')
})

/**
 * Test database connection untuk environment tertentu
 */
const testDatabaseConnection = async (env = null) => {
  try {
    const environment = env || getCurrentEnvironment()
    const db = getDbForEnvironment(environment)
    
    await db.raw('SELECT 1')
    
    // Get connection info
    let dbInfo = {}
    if (environment === 'sandbox') {
      const config = knexfile.sandbox
      dbInfo = config.connection
    } else if (environment === 'production') {
      const config = knexfile.netsuite_production
      dbInfo = config.connection
    } else {
      const envName = process.env.NODE_ENV || 'development'
      const config = knexfile[envName]
      dbInfo = config.connection
    }
    
    console.log(`✅ Database Connection (${environment}): CONNECTED`)
    console.log(`   Host: ${dbInfo.host}:${dbInfo.port}`)
    console.log(`   Database: ${dbInfo.database}`)
    console.log(`   User: ${dbInfo.user}`)
    return { connected: true, info: dbInfo, environment }
  } catch (error) {
    const environment = env || getCurrentEnvironment()
    console.log(`❌ Database Connection (${environment}): FAILED`)
    console.log(`   Error: ${error.message}`)
    return { connected: false, error: error.message, environment }
  }
}

/**
 * Test Redis connection
 */
const testRedisConnection = async () => {
  if (!REDIS_ENABLED) {
    console.log('⚠️  Redis: DISABLED')
    return { connected: false, enabled: false }
  }

  const REDIS_HOST = process.env.REDIS_HOST || 'localhost'
  const REDIS_PORT = process.env.REDIS_PORT || '6379'
  const REDIS_PASSWORD = process.env.REDIS_PASSWORD || null
  const REDIS_DB = process.env.REDIS_DB || '0'

  // Display password status (without showing actual password)
  const passwordStatus = REDIS_PASSWORD ? 'CONFIGURED' : 'NOT CONFIGURED'

  try {
    // Get Redis client instance
    const { getRedisClient } = require('./config/redis')
    let redisClient = getRedisClient()

    // If not connected yet, try to connect
    if (!redisClient) {
      console.log(`   Attempting to connect to Redis at ${REDIS_HOST}:${REDIS_PORT}...`)
      redisClient = await connectRedis()
      if (!redisClient) {
        console.log('❌ Redis Connection: FAILED')
        console.log(`   Host: ${REDIS_HOST}:${REDIS_PORT}`)
        console.log(`   Database: ${REDIS_DB}`)
        console.log(`   Password: ${passwordStatus}`)
        if (REDIS_PASSWORD) {
          console.log(`   ⚠️  Password authentication may have failed`)
        }
        console.log(`   Reason: Unable to establish connection`)
        return { connected: false, error: 'Unable to establish connection' }
      }
    }

    // Wait for connection to be ready with retry and timeout
    const maxRetries = 10
    const retryDelay = 500
    let retries = 0
    let connected = false
    let lastError = null

    while (retries < maxRetries && !connected) {
      if (redisClient) {
        try {
          // Check if client is ready
          if (redisClient.isReady) {
            // Test connection with ping (with timeout)
            const pingPromise = redisClient.ping()
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Ping timeout')), 2000)
            )
            
            await Promise.race([pingPromise, timeoutPromise])
            connected = true
            break
          } else {
            // Not ready yet, wait a bit
            await new Promise(resolve => setTimeout(resolve, retryDelay))
            retries++
          }
        } catch (error) {
          lastError = error
          // Check if it's an authentication error
          if (error.message && (error.message.includes('NOAUTH') || error.message.includes('password'))) {
            console.log('❌ Redis Connection: FAILED')
            console.log(`   Host: ${REDIS_HOST}:${REDIS_PORT}`)
            console.log(`   Database: ${REDIS_DB}`)
            console.log(`   Password: ${passwordStatus}`)
            console.log(`   Error: Authentication failed - Invalid password`)
            return { connected: false, error: 'Authentication failed - Invalid password' }
          }
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, retryDelay))
          retries++
        }
      } else {
        // No client, try to connect
        redisClient = await connectRedis()
        if (!redisClient) {
          break
        }
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        retries++
      }
    }

    if (connected && redisClient && redisClient.isReady) {
      console.log('✅ Redis Connection: CONNECTED')
      console.log(`   Host: ${REDIS_HOST}:${REDIS_PORT}`)
      console.log(`   Database: ${REDIS_DB}`)
      console.log(`   Password: ${passwordStatus}`)
      if (REDIS_PASSWORD) {
        console.log(`   ✅ Password authentication: SUCCESS`)
      }
      return { connected: true, host: REDIS_HOST, port: REDIS_PORT, passwordConfigured: !!REDIS_PASSWORD }
    } else {
      console.log('❌ Redis Connection: FAILED')
      console.log(`   Host: ${REDIS_HOST}:${REDIS_PORT}`)
      console.log(`   Database: ${REDIS_DB}`)
      console.log(`   Password: ${passwordStatus}`)
      if (lastError) {
        console.log(`   Error: ${lastError.message}`)
        if (lastError.message.includes('NOAUTH') || lastError.message.includes('password')) {
          console.log(`   ⚠️  Possible authentication issue - check REDIS_PASSWORD in .env`)
        }
      } else {
        console.log(`   Reason: Connection timeout after ${maxRetries} retries`)
      }
      return { connected: false, error: lastError?.message || 'Connection timeout' }
    }
  } catch (error) {
    console.log('❌ Redis Connection: FAILED')
    console.log(`   Host: ${REDIS_HOST}:${REDIS_PORT}`)
    console.log(`   Database: ${REDIS_DB}`)
    console.log(`   Password: ${passwordStatus}`)
    console.log(`   Error: ${error.message}`)
    if (error.code) {
      console.log(`   Error Code: ${error.code}`)
    }
    if (error.message && (error.message.includes('NOAUTH') || error.message.includes('password'))) {
      console.log(`   ⚠️  Authentication error - check REDIS_PASSWORD in .env`)
    }
    return { connected: false, error: error.message }
  }
}

/**
 * Test RabbitMQ connection
 */
const testRabbitMQConnection = async () => {
  const RABBITMQ_ENABLED = process.env.RABBITMQ_ENABLED === 'true'
  const RABBITMQ_URL = process.env.RABBITMQ_URL

  if (!RABBITMQ_ENABLED || !RABBITMQ_URL || RABBITMQ_URL === 'disabled') {
    console.log('⚠️  RabbitMQ: DISABLED')
    return { connected: false, enabled: false }
  }

  try {
    const { connection, channel } = await connectRabbitMQ()
    if (connection && channel) {
      // Extract host and port from URL
      const url = new URL(RABBITMQ_URL)
      console.log('✅ RabbitMQ Connection: CONNECTED')
      console.log(`   Host: ${url.hostname}:${url.port || '5672'}`)
      console.log(`   User: ${url.username || 'guest'}`)
      
      // Close connection after test
      await channel.close()
      await connection.close()
      
      return { connected: true, host: url.hostname, port: url.port || '5672' }
    } else {
      console.log('❌ RabbitMQ Connection: FAILED')
      return { connected: false }
    }
  } catch (error) {
    console.log('❌ RabbitMQ Connection: FAILED')
    console.log(`   Error: ${error.message}`)
    return { connected: false, error: error.message }
  }
}

/**
 * Test all connections and log status untuk environment tertentu
 */
const testAllConnections = async (env = null) => {
  const environment = env || getCurrentEnvironment()
  console.log(`\n🔍 Testing Connections (${environment})...\n`)
  console.log('='.repeat(50))
  
  const dbStatus = await testDatabaseConnection(environment)
  console.log('')
  
  // Wait a bit for Redis initialization from app.js to complete
  // Redis connection is async and may take time
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  const redisStatus = await testRedisConnection()
  console.log('')
  
  const rabbitmqStatus = await testRabbitMQConnection()
  console.log('')
  console.log('='.repeat(50))
  console.log('')
  
  return { dbStatus, redisStatus, rabbitmqStatus, environment }
}

/**
 * Create and start server untuk environment tertentu
 */
const startServer = async (env) => {
  // Set environment variable untuk app instance
  process.env.APP_ENVIRONMENT = env
  process.env.APP_PORT = getPortForEnvironment(env)
  
  // Clear module cache untuk app.js agar setiap environment menggunakan instance yang berbeda
  // Ini penting karena require() di-cache oleh Node.js
  const appPath = require.resolve('./app')
  if (require.cache[appPath]) {
    delete require.cache[appPath]
  }
  
  // Import app setelah environment variable di-set dan cache di-clear
  // Note: app.js akan menggunakan environment dari process.env
  const app = require('./app')
  
  const PORT = getPortForEnvironment(env)
  const APP_NAME = process.env.APP_NAME || 'API Bridge'
  
  // Test connections sebelum starting server
  await testAllConnections(env)
  
  return new Promise((resolve, reject) => {
    const server = app.listen(PORT, () => {
      console.log('')
      console.log(`🚀 Server Started Successfully (${env})!`)
      console.log('='.repeat(50))
      console.log(`📡 Server running on: http://localhost:${PORT}`)
      if (process.env.NODE_ENV === 'development') {
        console.log(`📚 API Documentation: http://localhost:${PORT}/documentation`);
      }
      console.log(`🌍 Environment: ${env}`)
      console.log(`🔧 NetSuite: ${env === 'sandbox' ? 'Sandbox' : 'Production'}`)
      console.log('='.repeat(50))
      console.log('')
      resolve(server)
    })
    
    server.on('error', (error) => {
      console.error(`❌ Failed to start server (${env}):`, error)
      reject(error)
    })
  })
}

/**
 * Main entry point
 * Start servers untuk sandbox dan production
 */
const main = async () => {
  const SANDBOX_ENABLED = process.env.NETSUITE_SANDBOX_ENABLED !== 'false'
  const PRODUCTION_ENABLED = process.env.NETSUITE_PRODUCTION_ENABLED !== 'false'
  
  const servers = []
  
  try {
    // Start Sandbox server
    if (SANDBOX_ENABLED) {
      console.log('\n🔄 Starting Sandbox Server...\n')
      const sandboxServer = await startServer('sandbox')
      servers.push({ env: 'sandbox', server: sandboxServer, port: SANDBOX_PORT })
    }
    
    // Start Production server
    if (PRODUCTION_ENABLED) {
      console.log('\n🔄 Starting Production Server...\n')
      const productionServer = await startServer('production')
      servers.push({ env: 'production', server: productionServer, port: PRODUCTION_PORT })
    }
    
    if (servers.length === 0) {
      console.error('❌ No servers enabled. Please enable at least one environment.')
      process.exit(1)
    }
    
    console.log('\n✅ All servers started successfully!')
    console.log('='.repeat(50))
    servers.forEach(({ env, port }) => {
      console.log(`   ${env.toUpperCase()}: http://localhost:${port}`)
    })
    console.log('='.repeat(50))
    console.log('')
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('\n⚠️  SIGTERM received, shutting down servers...')
      servers.forEach(({ env, server }) => {
        server.close(() => {
          console.log(`✅ Server (${env}) closed`)
        })
      })
      process.exit(0)
    })
    
    process.on('SIGINT', () => {
      console.log('\n⚠️  SIGINT received, shutting down servers...')
      servers.forEach(({ env, server }) => {
        server.close(() => {
          console.log(`✅ Server (${env}) closed`)
        })
      })
      process.exit(0)
    })
    
  } catch (error) {
    console.error('❌ Failed to start servers:', error)
    process.exit(1)
  }
}

// Start servers
main()
