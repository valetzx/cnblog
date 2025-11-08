// 文章数据的IndexedDB工具函数
export const openArticleDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('article_db', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 创建文章数据表
      if (!db.objectStoreNames.contains('articles')) {
        const store = db.createObjectStore('articles', { keyPath: 'nub' });
        store.createIndex('tag', 'tag', { unique: false });
        store.createIndex('cached_at', 'cached_at', { unique: false });
      }

      // 创建元数据表
      if (!db.objectStoreNames.contains('article_metadata')) {
        const store = db.createObjectStore('article_metadata', { keyPath: 'key' });
      }
    };
  });
};

// 保存文章数据到IndexedDB
export const saveArticles = async (articles) => {
  try {
    console.log('开始保存文章数据到IndexedDB，文章数量:', articles.length);

    // 检查数据格式
    if (!Array.isArray(articles)) {
      throw new Error('articles参数必须是数组');
    }

    // 检查每个文章对象是否包含必需的nub字段，如果没有则生成一个
    const processedArticles = articles.map((article, index) => {
      if (!article.nub) {
        console.warn('文章缺少nub字段，自动生成唯一ID:', index);
        // 生成基于时间戳和索引的唯一ID
        return {
          ...article,
          nub: `auto_${Date.now()}_${index}`
        };
      }
      return article;
    });

    const db = await openArticleDB();
    const transaction = db.transaction(['articles', 'article_metadata'], 'readwrite');
    const articlesStore = transaction.objectStore('articles');
    const metadataStore = transaction.objectStore('article_metadata');

    // 保存所有文章
    for (const article of processedArticles) {
      const articleData = {
        ...article,
        cached_at: new Date().toISOString()
      };
      articlesStore.put(articleData);
    }

    // 保存元数据
    const metadata = {
      key: 'last_updated',
      value: new Date().toISOString(),
      count: processedArticles.length
    };
    metadataStore.put(metadata);

    // 使用Promise等待事务完成
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log('文章数据保存成功，保存了', processedArticles.length, '篇文章');
        resolve(processedArticles.length);
      };
      transaction.onerror = (event) => {
        console.error('IndexedDB事务错误:', event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error('保存文章数据失败:', error);
    console.error('错误详情:', error.message);
    if (error.name === 'ConstraintError') {
      console.error('可能是nub字段重复或格式问题');
    }
    throw error;
  }
};

// 从IndexedDB获取所有文章数据
export const getArticlesFromDB = async () => {
  try {
    const db = await openArticleDB();
    const transaction = db.transaction(['articles'], 'readonly');
    const store = transaction.objectStore('articles');

    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        resolve(event.target.result || []);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('从数据库获取文章数据失败:', error);
    return [];
  }
};

// 检查是否有缓存的文章数据
export const hasCachedArticles = async () => {
  try {
    const db = await openArticleDB();
    const transaction = db.transaction(['articles'], 'readonly');
    const store = transaction.objectStore('articles');

    const request = store.count();

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        resolve(event.target.result > 0);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('检查缓存文章数据失败:', error);
    return false;
  }
};

// 清除所有文章数据
export const clearArticleCache = async () => {
  try {
    const db = await openArticleDB();
    const transaction = db.transaction(['articles', 'article_metadata'], 'readwrite');
    const articlesStore = transaction.objectStore('articles');
    const metadataStore = transaction.objectStore('article_metadata');

    await articlesStore.clear();
    await metadataStore.clear();

    // 使用Promise等待事务完成
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('清除文章缓存失败:', error);
    throw error;
  }
};
