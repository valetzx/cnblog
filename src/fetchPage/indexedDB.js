// 加载更多功能的IndexedDB工具函数
export const openLoadMoreDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('cnb_load_more', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 创建问题数据表
      if (!db.objectStoreNames.contains('issues')) {
        const store = db.createObjectStore('issues', { keyPath: ['repo', 'number'] });
        store.createIndex('repo_page', ['repo', 'page'], { unique: false });
        store.createIndex('updated_at', 'updated_at', { unique: false });
        store.createIndex('state', 'state', { unique: false });
      }

      // 创建页面元数据表
      if (!db.objectStoreNames.contains('page_metadata')) {
        const store = db.createObjectStore('page_metadata', { keyPath: ['repo', 'page'] });
        store.createIndex('repo', 'repo', { unique: false });
        store.createIndex('last_updated', 'last_updated', { unique: false });
      }
    };
  });
};

// 保存加载更多的问题数据
export const saveLoadMoreIssues = async (repo, page, issues) => {
  try {
    const db = await openLoadMoreDB();
    const transaction = db.transaction(['issues', 'page_metadata'], 'readwrite');
    const issuesStore = transaction.objectStore('issues');
    const metadataStore = transaction.objectStore('page_metadata');

    // 保存所有问题
    for (const issue of issues) {
      const issueData = {
        ...issue,
        repo: repo,
        page: page,
        cached_at: new Date().toISOString()
      };
      issuesStore.put(issueData);
    }

    // 保存页面元数据
    const metadata = {
      repo: repo,
      page: page,
      count: issues.length,
      last_updated: new Date().toISOString()
    };
    metadataStore.put(metadata);

    await transaction.done;
    return issues.length;
  } catch (error) {
    console.error('保存加载更多数据失败:', error);
    throw error;
  }
};

// 从缓存获取指定页面和仓库的问题
export const getLoadMoreIssuesFromCache = async (repo, page) => {
  try {
    const db = await openLoadMoreDB();
    const transaction = db.transaction(['issues'], 'readonly');
    const store = transaction.objectStore('issues');
    const index = store.index('repo_page');

    const request = index.getAll([repo, page]);

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        resolve(event.target.result || []);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('从缓存获取加载更多数据失败:', error);
    return [];
  }
};

// 检查指定页面是否已缓存
export const isPageCached = async (repo, page) => {
  try {
    const db = await openLoadMoreDB();
    const transaction = db.transaction(['page_metadata'], 'readonly');
    const store = transaction.objectStore('page_metadata');

    const request = store.get([repo, page]);

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        resolve(!!event.target.result);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('检查页面缓存状态失败:', error);
    return false;
  }
};

// 获取指定仓库已缓存的最大页面号
export const getMaxCachedPage = async (repo) => {
  try {
    const db = await openLoadMoreDB();
    const transaction = db.transaction(['page_metadata'], 'readonly');
    const store = transaction.objectStore('page_metadata');
    const index = store.index('repo');

    const request = index.getAll(repo);

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const pages = event.target.result;
        if (pages.length === 0) {
          resolve(0);
        } else {
          const maxPage = Math.max(...pages.map(p => p.page));
          resolve(maxPage);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('获取最大缓存页面失败:', error);
    return 0;
  }
};

// 清除指定仓库的缓存数据
export const clearLoadMoreCache = async (repo = null) => {
  try {
    const db = await openLoadMoreDB();
    const transaction = db.transaction(['issues', 'page_metadata'], 'readwrite');
    const issuesStore = transaction.objectStore('issues');
    const metadataStore = transaction.objectStore('page_metadata');

    if (repo) {
      // 清除指定仓库的数据
      const issuesIndex = issuesStore.index('repo');
      const metadataIndex = metadataStore.index('repo');

      // 清除问题数据
      const issuesRequest = issuesIndex.openCursor(IDBKeyRange.only(repo));
      issuesRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      // 清除元数据
      const metadataRequest = metadataIndex.openCursor(IDBKeyRange.only(repo));
      metadataRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    } else {
      // 清除所有数据
      await issuesStore.clear();
      await metadataStore.clear();
    }

    await transaction.done;
  } catch (error) {
    console.error('清除加载更多缓存失败:', error);
    throw error;
  }
};
