// indexedDB工具函数
export const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('cnb_repo_db', 1);
  
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const oldVersion = event.oldVersion;

      // 创建仓库分支信息表
      if (!db.objectStoreNames.contains('repo_branches')) {
        const store = db.createObjectStore('repo_branches', { keyPath: 'id' });
        store.createIndex('repo_path', 'repo_path', { unique: false });
        store.createIndex('ref', 'ref', { unique: true });
        store.createIndex('target_hash', 'target_hash', { unique: false });
        store.createIndex('is_head', 'is_head', { unique: false });
      }

      // 创建仓库文件信息表
      if (!db.objectStoreNames.contains('repo_files')) {
        const store = db.createObjectStore('repo_files', { keyPath: 'id' });
        store.createIndex('repo_path', 'repo_path', { unique: false });
        store.createIndex('branch_hash', 'branch_hash', { unique: false });
        store.createIndex('path', 'path', { unique: false });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('is_directory', 'is_directory', { unique: false });
        // 添加复合索引，确保不同仓库的文件不会混在一起
        store.createIndex('repo_branch', ['repo_path', 'branch_hash'], { unique: false });
      }

      // 创建缓存元数据表
      if (!db.objectStoreNames.contains('cache_metadata')) {
        const store = db.createObjectStore('cache_metadata', { keyPath: 'key' });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('repo_path', 'repo_path', { unique: false });
      }
    };
  });
};

// 保存仓库分支信息
export const saveRepoBranches = async (repoPath, branches) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['repo_branches', 'cache_metadata'], 'readwrite');
    const store = transaction.objectStore('repo_branches');
    const metadataStore = transaction.objectStore('cache_metadata');

    // 保存所有分支
    for (const branch of branches) {
      const branchData = {
        id: `${repoPath}-${branch.ref}`,
        repo_path: repoPath,
        ref: branch.ref,
        target_hash: branch.target_hash,
        target_type: branch.target_type,
        target_date: branch.target_date,
        is_head: branch.is_head,
        is_protected: branch.is_protected,
        cached_at: new Date().toISOString()
      };
      await store.put(branchData);
    }

    // 保存缓存元数据
    const metadata = {
      key: `repo_branches_${repoPath.replace(/[\/]/g, '_')}`,
      type: 'repo_branches',
      repo_path: repoPath,
      last_updated: new Date().toISOString(),
      count: branches.length
    };
    await metadataStore.put(metadata);

    await transaction.done;
    return branches.length;
  } catch (error) {
    console.error('保存仓库分支信息失败:', error);
    throw error;
  }
};

// 从缓存获取仓库分支信息
export const getRepoBranchesFromCache = async (repoPath) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['repo_branches'], 'readonly');
    const store = transaction.objectStore('repo_branches');
    const index = store.index('repo_path');

    const request = index.getAll(IDBKeyRange.only(repoPath));

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const branches = event.target.result;
        resolve(branches);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('从缓存获取仓库分支信息失败:', error);
    return [];
  }
};

// 保存仓库文件信息
export const saveRepoFiles = async (repoPath, branchHash, files) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['repo_files', 'cache_metadata'], 'readwrite');
    const store = transaction.objectStore('repo_files');
    const metadataStore = transaction.objectStore('cache_metadata');

    // 保存所有文件
    for (const file of files) {
      const isDirectory = file.path.endsWith('/') || file.entries;
      const fileData = {
        id: `${repoPath}-${branchHash}-${file.path}`,
        repo_path: repoPath,
        branch_hash: branchHash,
        path: file.path,
        name: file.name,
        is_directory: isDirectory,
        last_commit: file.last_commit,
        cached_at: new Date().toISOString()
      };
      await store.put(fileData);
    }

    // 保存缓存元数据
    const metadata = {
      key: `repo_files_${repoPath.replace(/[\/]/g, '_')}_${branchHash}`,
      type: 'repo_files',
      repo_path: repoPath,
      branch_hash: branchHash,
      last_updated: new Date().toISOString(),
      count: files.length
    };
    await metadataStore.put(metadata);

    await transaction.done;
    return files.length;
  } catch (error) {
    console.error('保存仓库文件信息失败:', error);
    throw error;
  }
};

// 从缓存获取仓库文件信息
export const getRepoFilesFromCache = async (repoPath, branchHash) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['repo_files'], 'readonly');
    const store = transaction.objectStore('repo_files');

    // 使用复合索引查询特定仓库和分支的文件
    const index = store.index('repo_branch');
    const keyRange = IDBKeyRange.only([repoPath, branchHash]);

    const request = index.getAll(keyRange);

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const files = event.target.result;
        resolve(files);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('从缓存获取仓库文件信息失败:', error);
    return [];
  }
};

// 清除指定仓库的缓存
export const clearRepoCache = async (repoPath) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['repo_branches', 'repo_files', 'cache_metadata'], 'readwrite');
    const branchesStore = transaction.objectStore('repo_branches');
    const filesStore = transaction.objectStore('repo_files');
    const metadataStore = transaction.objectStore('cache_metadata');

    // 清除分支缓存
    const branchesIndex = branchesStore.index('repo_path');
    const branchesRequest = branchesIndex.openCursor(IDBKeyRange.only(repoPath));

    await new Promise((resolve, reject) => {
      branchesRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      branchesRequest.onerror = () => reject(branchesRequest.error);
    });

    // 清除文件缓存
    const filesIndex = filesStore.index('repo_path');
    const filesRequest = filesIndex.openCursor(IDBKeyRange.only(repoPath));

    await new Promise((resolve, reject) => {
      filesRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      filesRequest.onerror = () => reject(filesRequest.error);
    });

    // 清除元数据缓存
    const metadataCursor = metadataStore.openCursor();
    await new Promise((resolve, reject) => {
      metadataCursor.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.repo_path === repoPath) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      metadataCursor.onerror = () => reject(metadataCursor.error);
    });

    await transaction.done;
  } catch (error) {
    console.error('清除仓库缓存失败:', error);
    throw error;
  }
};

// 获取缓存元数据
export const getCacheMetadata = async (key) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['cache_metadata'], 'readonly');
    const store = transaction.objectStore('cache_metadata');

    return await store.get(key);
  } catch (error) {
    console.error('获取缓存元数据失败:', error);
    return null;
  }
};
