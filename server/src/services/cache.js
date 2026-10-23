// src/services/cache.js
// Cache-aside for the product catalog.
// A cache failure must not fail the API: the caller falls through to PostgreSQL.
// Writes delete the cached list and the one product so the next read is fresh.

const { redisClient } = require('../config/redis');

// Only the default catalog page is cached. Search and other pages hit the database.
const PRODUCT_LIST_KEY = 'products:default-list';
const TTL_SECONDS = 60;

/**
 * @param {string} productId
 */
const productKey = (productId) => `product:${productId ?? ''}`;

/**
 * @param {string} key
 * @returns {Promise<unknown | null>}
 */
const readCache = async (key) => {
  try {
    if (!redisClient?.isOpen) {
      return null;
    }
    const raw = await redisClient.get(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.error('❌ Cache read failed:', error?.message ?? error);
    return null;
  }
};

/**
 * @param {string} key
 * @param {unknown} value
 */
const writeCache = async (key, value) => {
  try {
    if (!redisClient?.isOpen) {
      return;
    }
    await redisClient.set(key, JSON.stringify(value ?? null), { EX: TTL_SECONDS });
  } catch (error) {
    console.error('❌ Cache write failed:', error?.message ?? error);
  }
};

/**
 * Drops the default product list and, when an id is given, that one product.
 * Call this after any change to price, name, stock, or active flag.
 * @param {string | null} [productId]
 */
const invalidateProducts = async (productId) => {
  try {
    if (!redisClient?.isOpen) {
      return;
    }
    const keys = [PRODUCT_LIST_KEY];
    if (productId) {
      keys.push(productKey(productId));
    }
    await redisClient.del(keys);
  } catch (error) {
    console.error('❌ Cache delete failed:', error?.message ?? error);
  }
};

module.exports = {
  PRODUCT_LIST_KEY,
  productKey,
  readCache,
  writeCache,
  invalidateProducts,
};
