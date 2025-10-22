// 评论缓存工具函数
import { openDB } from './indexedDB';

// 打开评论数据库
export const openCommentDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('cnb_comments_db', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 创建评论存储表
      if (!db.objectStoreNames.contains('comments')) {
        const store = db.createObjectStore('comments', { keyPath: 'id' });
        store.createIndex('repopath_issue', ['repopath', 'issueNumber'], { unique: false });
        store.createIndex('created_at', 'created_at', { unique: false });
        store.createIndex('repopath', 'repopath', { unique: false });
        store.createIndex('issueNumber', 'issueNumber', { unique: false });
      }

      // 创建缓存元数据表
      if (!db.objectStoreNames.contains('comment_metadata')) {
        const metadataStore = db.createObjectStore('comment_metadata', { keyPath: 'key' });
        metadataStore.createIndex('repopath_issue', ['repopath', 'issueNumber'], { unique: true });
        metadataStore.createIndex('last_updated', 'last_updated', { unique: false });
      }
    };
  });
};

// 保存评论数据到缓存
export const saveCommentsToCache = async (comments, repopath, issueNumber) => {
  try {
    const db = await openCommentDB();
    const transaction = db.transaction(['comments', 'comment_metadata'], 'readwrite');
    const store = transaction.objectStore('comments');
    const metadataStore = transaction.objectStore('comment_metadata');

    // 保存所有评论
    for (const comment of comments) {
      const commentData = {
        id: comment.id,
        repopath: repopath,
        issueNumber: issueNumber,
        body: comment.body,
        author: comment.author,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        cached_at: new Date().toISOString()
      };
      await store.put(commentData);
    }

    // 保存缓存元数据
    const metadataKey = `${repopath}-${issueNumber}`;
    const metadata = {
      key: metadataKey,
      repopath: repopath,
      issueNumber: issueNumber,
      last_updated: new Date().toISOString(),
      count: comments.length,
      cached_at: new Date().toISOString()
    };
    await metadataStore.put(metadata);

    await transaction.done;
    return comments.length;
  } catch (error) {
    console.error('保存评论到缓存失败:', error);
    throw error;
  }
};

// 从缓存获取评论数据，支持按创建时间或更新时间排序
export const getCommentsFromCache = async (repopath, issueNumber, sortBy = 'created_at', sortOrder = 'desc') => {
  try {
    const db = await openCommentDB();
    const transaction = db.transaction(['comments'], 'readonly');
    const store = transaction.objectStore('comments');
    const index = store.index('repopath_issue');

    // 获取指定仓库和issue的所有评论
    const request = index.getAll([repopath, issueNumber]);

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const comments = event.target.result;
        // 按指定字段和顺序排序
        comments.sort((a, b) => {
          const dateA = new Date(a[sortBy]);
          const dateB = new Date(b[sortBy]);
          return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });
        resolve(comments);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('从缓存获取评论失败:', error);
    return [];
  }
};

// 获取缓存元数据
export const getCommentCacheMetadata = async (repopath, issueNumber) => {
  try {
    const db = await openCommentDB();
    const transaction = db.transaction(['comment_metadata'], 'readonly');
    const store = transaction.objectStore('comment_metadata');
    const index = store.index('repopath_issue');

    const request = index.get([repopath, issueNumber]);

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        resolve(event.target.result || null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('获取评论缓存元数据失败:', error);
    return null;
  }
};

export const isCommentCacheValid = async (repopath, issueNumber) => {
  try {
    const metadata = await getCommentCacheMetadata(repopath, issueNumber);
    if (!metadata) return false;

    const cacheTime = new Date(metadata.last_updated);
    const now = new Date();
    const diffInHours = (now - cacheTime) / (100 * 60 * 60);

    return diffInHours < 1;
  } catch (error) {
    console.error('检查缓存有效性失败:', error);
    return false;
  }
};

// 清除指定仓库和issue的评论缓存
export const clearCommentCache = async (repopath, issueNumber) => {
  try {
    const db = await openCommentDB();
    const transaction = db.transaction(['comments', 'comment_metadata'], 'readwrite');
    const store = transaction.objectStore('comments');
    const metadataStore = transaction.objectStore('comment_metadata');
    const index = store.index('repopath_issue');

    // 删除评论数据
    const request = index.openCursor(IDBKeyRange.only([repopath, issueNumber]));

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          // 删除元数据
          const metadataKey = `${repopath}-${issueNumber}`;
          metadataStore.delete(metadataKey);
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('清除评论缓存失败:', error);
    throw error;
  }
};

// 处理评论数据，提取图片等信息
export const processCommentData = (comment) => {
  let body = comment.body || '';
  const images = [];

  // 提取 cnb-md-image__upload 类的图片
  body = body.replace(/<img(?=[^>]*class="[^"]*cnb-md-image__upload[^"]*")(?=[^>]*src="([^"]+)")[^>]*>/g, (_, src) => {
    images.push(`https://images.weserv.nl?url=https://cnb.cool${src}`);
    return '';
  });

  // 处理其他图片
  body = body.replace(/<img[^>]*src="([^"]+)"[^>]*>/g, (_, src) => {
    images.push(src);
    return '';
  });

  body = body.replace(/<[^>]+>/g, '');

  return {
    commentId: comment.id,
    title: comment.author?.nickname || comment.author?.username || '匿名用户',
    username: comment.author?.username || 'anonymous',
    description: body.trim() || '无文本内容',
    images,
    createdAt: comment.created_at,
    updatedAt: comment.updated_at || comment.created_at // 添加updatedAt字段
  };
};
