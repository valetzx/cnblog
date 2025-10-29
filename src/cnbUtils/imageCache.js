// 图片缓存工具函数
import { openDB } from './indexedDB';

// 打开或创建图片缓存数据库
export const openImageDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('cnb_info_img', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 创建图片缓存表
      if (!db.objectStoreNames.contains('image_cache')) {
        const store = db.createObjectStore('image_cache', { keyPath: 'id' });
        store.createIndex('repopath_number', ['repopath', 'number'], { unique: false });
        store.createIndex('image_type', 'image_type', { unique: false });
        store.createIndex('original_url', 'original_url', { unique: false });
        store.createIndex('cached_at', 'cached_at', { unique: false });
      }
    };
  });
};

// 生成缓存ID
export const generateImageCacheId = (repopath, number, imageType, originalUrl) => {
  return `${repopath}-${number}-${imageType}-${btoa(originalUrl)}`;
};

// 保存图片URL到缓存
export const saveImageUrlToCache = async (repopath, number, imageType, originalUrl, correctUrl) => {
  try {
    const db = await openImageDB();
    const transaction = db.transaction(['image_cache'], 'readwrite');
    const store = transaction.objectStore('image_cache');

    const cacheId = generateImageCacheId(repopath, number, imageType, originalUrl);

    const imageData = {
      id: cacheId,
      repopath,
      number,
      image_type: imageType, // 'infoimg' 或 'commiturl'
      original_url: originalUrl,
      correct_url: correctUrl,
      cached_at: new Date().toISOString()
    };

    await store.put(imageData);
    await transaction.done;

    return true;
  } catch (error) {
    console.error('保存图片URL到缓存失败:', error);
    return false;
  }
};

// 从缓存获取图片URL
export const getImageUrlFromCache = async (repopath, number, imageType, originalUrl) => {
  try {
    const db = await openImageDB();
    const transaction = db.transaction(['image_cache'], 'readonly');
    const store = transaction.objectStore('image_cache');

    const cacheId = generateImageCacheId(repopath, number, imageType, originalUrl);

    const request = store.get(cacheId);

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const cachedData = event.target.result;
        if (cachedData && cachedData.correct_url) {
          resolve(cachedData.correct_url);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('从缓存获取图片URL失败:', error);
    return null;
  }
};

// 批量获取图片URL缓存
export const getBatchImageUrlsFromCache = async (repopath, number, imageType, originalUrls) => {
  try {
    const db = await openImageDB();
    const transaction = db.transaction(['image_cache'], 'readonly');
    const store = transaction.objectStore('image_cache');

    const results = {};

    for (const originalUrl of originalUrls) {
      const cacheId = generateImageCacheId(repopath, number, imageType, originalUrl);
      const request = store.get(cacheId);

      const result = await new Promise((resolve) => {
        request.onsuccess = (event) => {
          const cachedData = event.target.result;
          resolve(cachedData?.correct_url || null);
        };
        request.onerror = () => resolve(null);
      });

      results[originalUrl] = result;
    }

    await transaction.done;
    return results;
  } catch (error) {
    console.error('批量获取图片URL缓存失败:', error);
    return {};
  }
};

// 清除指定仓库和编号的图片缓存
export const clearImageCacheForIssue = async (repopath, number) => {
  try {
    const db = await openImageDB();
    const transaction = db.transaction(['image_cache'], 'readwrite');
    const store = transaction.objectStore('image_cache');
    const index = store.index('repopath_number');

    const keyRange = IDBKeyRange.bound(
      [repopath, number],
      [repopath, number]
    );

    const request = index.openCursor(keyRange);

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('清除图片缓存失败:', error);
    throw error;
  }
};

// 获取所有图片缓存
export const getAllImageCache = async () => {
  try {
    const db = await openImageDB();
    const transaction = db.transaction(['image_cache'], 'readonly');
    const store = transaction.objectStore('image_cache');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => resolve(event.target.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('获取所有图片缓存失败:', error);
    return [];
  }
};
