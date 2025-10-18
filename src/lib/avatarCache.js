// 头像缓存工具函数
export class AvatarCache {
  static CACHE_NAME = 'avatar-cache-v1';

  // 初始化缓存
  static async init() {
    if ('caches' in window) {
      try {
        await caches.open(this.CACHE_NAME);
        console.log('Avatar cache initialized');
      } catch (error) {
        console.error('Failed to initialize avatar cache:', error);
      }
    }
  }

  // 缓存头像
  static async cacheAvatar(url) {
    if (!('caches' in window)) return null;

    try {
      const cache = await caches.open(this.CACHE_NAME);
      const response = await fetch(url, {
        mode: 'no-cors',
        credentials: 'omit'
      });

      // no-cors模式下，响应是opaque的，ok属性总是false
      // 但我们可以检查response.type来判断是否成功
      if (response.type === 'opaque') {
        await cache.put(url, response.clone());
        return response;
      }
    } catch (error) {
      console.warn('Failed to cache avatar:', url, error);
    }
    return null;
  }

  // 获取缓存的头像
  static async getCachedAvatar(url) {
    if (!('caches' in window)) return null;

    try {
      const cache = await caches.open(this.CACHE_NAME);
      const cachedResponse = await cache.match(url);

      if (cachedResponse) {
        return cachedResponse;
      }
    } catch (error) {
      console.warn('Failed to get cached avatar:', error);
    }
    return null;
  }

  // 清除缓存
  static async clearCache() {
    if ('caches' in window) {
      try {
        await caches.delete(this.CACHE_NAME);
        console.log('Avatar cache cleared');
      } catch (error) {
        console.error('Failed to clear avatar cache:', error);
      }
    }
  }
}
