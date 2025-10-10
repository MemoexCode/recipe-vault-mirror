/**
 * Simple Client-Side Cache
 * Prevents redundant API calls during same session
 */

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

class SimpleCache {
  constructor() {
    this.cache = new Map();
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  get(key) {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    // Check if cache is still valid
    if (Date.now() - item.timestamp > CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  clear(key) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  clearAll() {
    this.cache.clear();
  }
}

export default new SimpleCache();