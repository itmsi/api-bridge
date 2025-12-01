const crypto = require('crypto');
const { getRedisClient, isRedisReady } = require('../config/redis');
const { logger } = require('./logger');
const { metrics } = require('../config/prometheus');

/**
 * Get key pattern dari cache key untuk metrics
 */
const getKeyPattern = (key) => {
  if (key.startsWith('customer:')) {
    if (key.includes(':list:')) return 'customer:list';
    if (key.match(/^customer:[^:]+$/)) return 'customer:single';
  }
  if (key.startsWith('sync:')) return 'sync:tracker';
  return 'other';
};

/**
 * Generate cache key dengan hash untuk list queries
 */
const generateCacheKey = (prefix, params = {}) => {
  if (Object.keys(params).length === 0) {
    return prefix;
  }
  const paramsStr = JSON.stringify(params);
  const hash = crypto.createHash('md5').update(paramsStr).digest('hex').substring(0, 8);
  return `${prefix}:${hash}`;
};

/**
 * Get value from cache
 */
const getCache = async (key) => {
  if (!isRedisReady()) {
    return null;
  }

  try {
    const client = getRedisClient();
    const value = await client.get(key);
    if (value) {
      // Track cache hit
      const keyPattern = getKeyPattern(key);
      metrics.cache.cacheHits.inc({ key_pattern: keyPattern });
      return JSON.parse(value);
    }
    // Track cache miss
    const keyPattern = getKeyPattern(key);
    metrics.cache.cacheMisses.inc({ key_pattern: keyPattern });
    return null;
  } catch (error) {
    logger().error(`Redis GET error for key ${key}:`, error);
    // Track cache miss on error
    const keyPattern = getKeyPattern(key);
    metrics.cache.cacheMisses.inc({ key_pattern: keyPattern });
    return null;
  }
};

/**
 * Set value to cache
 */
const setCache = async (key, value, ttlSeconds = null) => {
  if (!isRedisReady()) {
    return false;
  }

  try {
    const client = getRedisClient();
    const serialized = JSON.stringify(value);
    
    if (ttlSeconds) {
      await client.setEx(key, ttlSeconds, serialized);
    } else {
      await client.set(key, serialized);
    }
    
    return true;
  } catch (error) {
    logger().error(`Redis SET error for key ${key}:`, error);
    return false;
  }
};

/**
 * Delete cache key
 */
const deleteCache = async (key) => {
  if (!isRedisReady()) {
    return false;
  }

  try {
    const client = getRedisClient();
    await client.del(key);
    return true;
  } catch (error) {
    logger().error(`Redis DEL error for key ${key}:`, error);
    return false;
  }
};

/**
 * Delete cache keys by pattern
 */
const deleteCacheByPattern = async (pattern) => {
  if (!isRedisReady()) {
    return false;
  }

  try {
    const client = getRedisClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
    return true;
  } catch (error) {
    logger().error(`Redis DEL pattern error for ${pattern}:`, error);
    return false;
  }
};

/**
 * Cache key constants
 */
const CACHE_KEYS = {
  CUSTOMER: (netsuiteId) => `customer:${netsuiteId}`,
  CUSTOMER_LIST: (paramsHash) => `customer:list:page:${paramsHash}`,
  SYNC_LAST_SYNC: (module) => `sync:lastSync:${module}`,
};

/**
 * Cache TTL constants (in seconds)
 */
const CACHE_TTL = {
  CUSTOMER: 12 * 60 * 60, // 12 hours
  CUSTOMER_LIST: 5 * 60, // 5 minutes
  SYNC_LAST_SYNC: null, // no expiration
};

module.exports = {
  getCache,
  setCache,
  deleteCache,
  deleteCacheByPattern,
  generateCacheKey,
  CACHE_KEYS,
  CACHE_TTL,
};

