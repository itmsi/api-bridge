const redis = require('redis');
const { Logger } = require('../utils/logger');

const REDIS_ENABLED = process.env.REDIS_ENABLED === 'true';
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || null;
const REDIS_DB = parseInt(process.env.REDIS_DB || '0', 10);

let redisClient = null;

/**
 * Connect to Redis
 */
const connectRedis = async () => {
  if (!REDIS_ENABLED) {
    Logger.info('Redis is disabled, skipping connection');
    return null;
  }

  // If already connected, return existing client
  if (redisClient && redisClient.isReady) {
    return redisClient;
  }

  try {
    const client = redis.createClient({
      socket: {
        host: REDIS_HOST,
        port: REDIS_PORT,
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            Logger.error('Redis reconnection failed after 10 retries');
            return new Error('Redis reconnection failed');
          }
          return Math.min(retries * 100, 3000);
        }
      },
      password: REDIS_PASSWORD || undefined,
      database: REDIS_DB,
    });

    client.on('error', (err) => {
      Logger.error('Redis Client Error:', err);
    });

    client.on('connect', () => {
      Logger.info(`Redis client connecting to ${REDIS_HOST}:${REDIS_PORT}`);
    });

    client.on('ready', () => {
      Logger.info(`Redis client ready on ${REDIS_HOST}:${REDIS_PORT}`);
    });

    client.on('reconnecting', () => {
      Logger.info('Redis client reconnecting...');
    });

    await client.connect();
    redisClient = client;
    return client;
  } catch (error) {
    Logger.error('Error connecting to Redis:', error);
    redisClient = null;
    return null;
  }
};

/**
 * Get Redis client instance
 */
const getRedisClient = () => {
  return redisClient;
};

/**
 * Check if Redis is enabled and connected
 */
const isRedisReady = () => {
  return REDIS_ENABLED && redisClient && redisClient.isReady;
};

/**
 * Close Redis connection
 */
const closeRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
  isRedisReady,
  closeRedis,
  REDIS_ENABLED,
};

