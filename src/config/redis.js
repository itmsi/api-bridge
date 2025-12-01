const redis = require('redis');
const { logger } = require('../utils/logger');

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
    logger().info('Redis is disabled, skipping connection');
    return null;
  }

  try {
    const client = redis.createClient({
      socket: {
        host: REDIS_HOST,
        port: REDIS_PORT,
      },
      password: REDIS_PASSWORD || undefined,
      database: REDIS_DB,
    });

    client.on('error', (err) => {
      logger().error('Redis Client Error:', err);
    });

    client.on('connect', () => {
      logger().info('Redis client connected');
    });

    await client.connect();
    redisClient = client;
    return client;
  } catch (error) {
    logger().error('Error connecting to Redis:', error);
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

