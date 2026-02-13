/**
 * Analytics Cache Utility
 * Simple in-memory cache with TTL for analytics data
 */

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Get cached data by key
 * @param {String} key - Cache key
 * @returns {*} Cached data or null if expired/not found
 */
function getCachedData(key) {
  const cached = cache.get(key);

  if (!cached) {
    return null;
  }

  // Check if cache has expired
  const now = Date.now();
  if (now - cached.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }

  return cached.data;
}

/**
 * Set cached data with key
 * @param {String} key - Cache key
 * @param {*} data - Data to cache
 */
function setCachedData(key, data) {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

/**
 * Clear specific cache key
 * @param {String} key - Cache key to clear
 */
function clearCache(key) {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

/**
 * Clear all expired cache entries
 */
function clearExpiredCache() {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      cache.delete(key);
    }
  }
}

// Periodically clear expired cache (every 10 minutes)
setInterval(clearExpiredCache, 10 * 60 * 1000);

module.exports = {
  getCachedData,
  setCachedData,
  clearCache,
  CACHE_TTL
};
