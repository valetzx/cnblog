// indexedDB工具函数
export const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('cnb_user_db', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const oldVersion = event.oldVersion;

      // 创建或升级用户信息表
      if (!db.objectStoreNames.contains('user_info')) {
        const store = db.createObjectStore('user_info', { keyPath: 'id' });
        store.createIndex('username', 'username', { unique: false });
        store.createIndex('cnb_session', 'cnb_session', { unique: true });
        store.createIndex('user_id', 'user_id', { unique: false }); // 新增用户ID索引
      }

      // 创建用户创建内容表
      if (!db.objectStoreNames.contains('user_created')) {
        const createdStore = db.createObjectStore('user_created', { keyPath: 'id' });
        createdStore.createIndex('todo_id', 'todo_id', { unique: true });
        createdStore.createIndex('slug_number', ['slug', 'number'], { unique: true });
        createdStore.createIndex('updated_time', 'updated_time', { unique: false });
        createdStore.createIndex('todo_status', 'todo_status', { unique: false });
        createdStore.createIndex('user_id', 'user_id', { unique: false }); // 新增用户ID索引
      }

      // 创建用户待办事项表
      if (!db.objectStoreNames.contains('user_todo')) {
        const todoStore = db.createObjectStore('user_todo', { keyPath: 'id' });
        todoStore.createIndex('todo_id', 'todo_id', { unique: true });
        todoStore.createIndex('slug_number', ['slug', 'number'], { unique: true });
        todoStore.createIndex('updated_time', 'updated_time', { unique: false });
        todoStore.createIndex('todo_status', 'todo_status', { unique: false });
        todoStore.createIndex('user_id', 'user_id', { unique: false }); // 新增用户ID索引
      }

      // 创建用户关注仓库表
      if (!db.objectStoreNames.contains('user_starred')) {
        const starredStore = db.createObjectStore('user_starred', { keyPath: 'id' });
        starredStore.createIndex('star_time', 'star_time', { unique: false });
        starredStore.createIndex('pinned', 'pinned', { unique: false });
        starredStore.createIndex('user_id', 'user_id', { unique: false }); // 新增用户ID索引
      }

      // 创建用户动态表
      if (!db.objectStoreNames.contains('user_activity')) {
        const activityStore = db.createObjectStore('user_activity', { keyPath: 'id' });
        activityStore.createIndex('created_at', 'created_at', { unique: false });
        activityStore.createIndex('activity_type', 'activity_type', { unique: false });
        activityStore.createIndex('user_id', 'user_id', { unique: false });
      }

      // 创建缓存元数据表
      if (!db.objectStoreNames.contains('cache_metadata')) {
        const metadataStore = db.createObjectStore('cache_metadata', { keyPath: 'key' });
        metadataStore.createIndex('type', 'type', { unique: false });
        metadataStore.createIndex('user_id', 'user_id', { unique: false }); // 新增用户ID索引
      }

      // 在数据库升级部分添加用户工作空间表
      // 创建用户工作空间表
      if (!db.objectStoreNames.contains('user_workspaces')) {
        const workspacesStore = db.createObjectStore('user_workspaces', { keyPath: 'id' });
        workspacesStore.createIndex('pipeline_id', 'pipeline_id', { unique: true });
        workspacesStore.createIndex('sn', 'sn', { unique: false });
        workspacesStore.createIndex('slug', 'slug', { unique: false });
        workspacesStore.createIndex('status', 'status', { unique: false });
        workspacesStore.createIndex('create_time', 'create_time', { unique: false });
        workspacesStore.createIndex('user_name', 'user_name', { unique: false });
        workspacesStore.createIndex('user_id', 'user_id', { unique: false }); // 新增用户ID索引
      }

      // 创建用户任务集表
      if (!db.objectStoreNames.contains('user_missions')) {
        const missionsStore = db.createObjectStore('user_missions', { keyPath: 'id' });
        missionsStore.createIndex('path', 'path', { unique: true });
        missionsStore.createIndex('name', 'name', { unique: false });
        missionsStore.createIndex('visibility_level', 'visibility_level', { unique: false });
        missionsStore.createIndex('created_at', 'created_at', { unique: false });
        missionsStore.createIndex('updated_at', 'updated_at', { unique: false });
        missionsStore.createIndex('stared', 'stared', { unique: false });
        missionsStore.createIndex('pinned', 'pinned', { unique: false });
        missionsStore.createIndex('user_id', 'user_id', { unique: false }); // 新增用户ID索引
      }

      // 创建用户组织表
      if (!db.objectStoreNames.contains('user_groups')) {
        const groupsStore = db.createObjectStore('user_groups', { keyPath: 'id' });
        groupsStore.createIndex('path', 'path', { unique: true });
        groupsStore.createIndex('name', 'name', { unique: false });
        groupsStore.createIndex('access_role', 'access_role', { unique: false });
        groupsStore.createIndex('created_at', 'created_at', { unique: false });
        groupsStore.createIndex('updated_at', 'updated_at', { unique: false });
        groupsStore.createIndex('pinned', 'pinned', { unique: false });
        groupsStore.createIndex('freeze', 'freeze', { unique: false });
        groupsStore.createIndex('user_id', 'user_id', { unique: false }); // 新增用户ID索引
      }

      // 创建用户仓库表
      if (!db.objectStoreNames.contains('user_repos')) {
        const reposStore = db.createObjectStore('user_repos', { keyPath: 'id' });
        reposStore.createIndex('path', 'path', { unique: true });
        reposStore.createIndex('name', 'name', { unique: false });
        reposStore.createIndex('visibility_level', 'visibility_level', { unique: false });
        reposStore.createIndex('created_at', 'created_at', { unique: false });
        reposStore.createIndex('updated_at', 'updated_at', { unique: false });
        reposStore.createIndex('last_updated_at', 'last_updated_at', { unique: false });
        reposStore.createIndex('stared', 'stared', { unique: false });
        reposStore.createIndex('pinned', 'pinned', { unique: false });
        reposStore.createIndex('access', 'access', { unique: false });
        reposStore.createIndex('user_id', 'user_id', { unique: false }); // 新增用户ID索引
      }

      // 创建用户代码活动表
      if (!db.objectStoreNames.contains('user_code_activities')) {
        const codeActivitiesStore = db.createObjectStore('user_code_activities', { keyPath: 'id' });
        codeActivitiesStore.createIndex('username', 'username', { unique: false });
        codeActivitiesStore.createIndex('date', 'date', { unique: false });
        codeActivitiesStore.createIndex('created_at', 'created_at', { unique: false });
        codeActivitiesStore.createIndex('user_id', 'user_id', { unique: false });
      }
    };
  });
};

export const saveUserInfo = async (userInfo, cnbSession) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['user_info'], 'readwrite');
    const store = transaction.objectStore('user_info');

    // 保存用户信息，同时存储CNBSESSION
    const userData = {
      ...userInfo,
      cnb_session: cnbSession,
      avatar_url: `https://cnb.cool/users/${userInfo.username}/avatar/s`,
      updated_at: new Date().toISOString(),
      user_id: userInfo.id || userInfo.username // 添加用户ID字段
    };

    await store.put(userData);
    await transaction.done;

    // 同时存储到localStorage以便快速访问
    localStorage.setItem('currentUser', JSON.stringify(userData));

    return userData;
  } catch (error) {
    console.error('保存用户信息失败:', error);
    throw error;
  }
};

export const getUserInfo = async (userId = null) => {
  try {
    // 首先尝试从localStorage获取（更快）
    const cachedUser = localStorage.getItem('currentUser');
    if (cachedUser) {
      const userData = JSON.parse(cachedUser);
      // 如果指定了用户ID且匹配，或者没有指定用户ID，则返回
      if (!userId || userData.user_id === userId || userData.username === userId || userData.id === userId) {
        return userData;
      }
    }

    // 如果没有缓存或用户ID不匹配，从indexedDB获取
    const db = await openDB();
    const transaction = db.transaction(['user_info'], 'readonly');
    const store = transaction.objectStore('user_info');

    if (userId) {
      // 按用户ID查询
      const index = store.index('user_id');
      const request = index.get(userId);

      return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          resolve(event.target.result || null);
        };
        request.onerror = () => reject(request.error);
      });
    } else {
      // 向后兼容：获取第一个用户记录
      const request = store.openCursor();

      return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            resolve(cursor.value);
          } else {
            resolve(null);
          }
        };
        request.onerror = () => reject(request.error);
      });
    }
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return null;
  }
};

// 新增：按用户ID获取用户信息
export const getUserInfoById = async (userId) => {
  return getUserInfo(userId);
};

// 新增：获取所有用户信息
export const getAllUserInfo = async () => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['user_info'], 'readonly');
    const store = transaction.objectStore('user_info');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        resolve(event.target.result || []);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('获取所有用户信息失败:', error);
    return [];
  }
};

export const clearUserInfo = async () => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['user_info'], 'readwrite');
    const store = transaction.objectStore('user_info');

    await store.clear();
    await transaction.done;

    // 同时清除localStorage
    localStorage.removeItem('currentUser');

    localStorage.removeItem('CNBSESSION');
  } catch (error) {
    console.error('清除用户信息失败:', error);
    throw error;
  }
};

// 保存用户创建的内容到缓存
export const saveUserCreatedIssues = async (issues, todoStatus = 'pending') => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['user_created', 'cache_metadata'], 'readwrite');
    const store = transaction.objectStore('user_created');
    const metadataStore = transaction.objectStore('cache_metadata');

    // 保存所有issue
    for (const issue of issues) {
      const issueData = {
        id: `${issue.slug}-${issue.number}-${todoStatus}`,
        todo_id: issue.todo_id || `${issue.slug}-${issue.number}`,
        slug: issue.slug,
        number: issue.number,
        title: issue.title,
        creator: issue.creator,
        created_time: issue.created_time,
        updated_time: issue.updated_time,
        state: issue.state,
        labels: issue.labels || [],
        comment_count: issue.comment_count || 0,
        pinned: issue.pinned || false,
        todo_status: todoStatus,
        cached_at: new Date().toISOString()
      };
      await store.put(issueData);
    }

    // 保存缓存元数据
    const metadata = {
      key: `user_created_${todoStatus}`,
      type: 'user_created',
      last_updated: new Date().toISOString(),
      count: issues.length,
      todo_status: todoStatus
    };
    await metadataStore.put(metadata);

    await transaction.done;
    return issues.length;
  } catch (error) {
    console.error('保存用户创建内容失败:', error);
    throw error;
  }
};

// 从缓存获取用户创建的内容
export const getUserCreatedIssuesFromCache = async (todoStatus = 'pending', page = 1, pageSize = 20) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['user_created'], 'readonly');
    const store = transaction.objectStore('user_created');
    const index = store.index('todo_status');

    // 获取指定状态的所有issue
    const request = index.getAll(IDBKeyRange.only(todoStatus));

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const allIssues = event.target.result;
        // 按更新时间降序排序
        allIssues.sort((a, b) => new Date(b.updated_time) - new Date(a.updated_time));

        // 分页处理
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        const paginatedIssues = allIssues.slice(start, end);

        resolve({
          issues: paginatedIssues,
          total: allIssues.length,
          page,
          pageSize,
          hasMore: end < allIssues.length
        });
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('从缓存获取用户创建内容失败:', error);
    return { issues: [], total: 0, page, pageSize, hasMore: false };
  }
};

// 保存用户关注的仓库到缓存
export const saveUserStarredRepos = async (repos) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['user_starred', 'cache_metadata'], 'readwrite');
    const store = transaction.objectStore('user_starred');
    const metadataStore = transaction.objectStore('cache_metadata');

    // 保存所有关注的仓库
    for (const repo of repos) {
      const repoData = {
        id: repo.id,
        name: repo.name,
        path: repo.path,
        description: repo.description || '',
        web_url: repo.web_url,
        star_count: repo.star_count || 0,
        fork_count: repo.fork_count || 0,
        open_issue_count: repo.open_issue_count || 0,
        languages: repo.languages || {},
        last_updated_at: repo.updated_at,
        star_time: repo.star_time,
        pinned: repo.pinned || false,
        cached_at: new Date().toISOString()
      };
      await store.put(repoData);
    }

    // 保存缓存元数据
    const metadata = {
      key: 'user_starred',
      type: 'user_starred',
      last_updated: new Date().toISOString(),
      count: repos.length
    };
    await metadataStore.put(metadata);

    await transaction.done;
    return repos.length;
  } catch (error) {
    console.error('保存用户关注仓库失败:', error);
    throw error;
  }
};

// 从缓存获取用户关注的仓库
export const getUserStarredReposFromCache = async (page = 1, pageSize = 20) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['user_starred'], 'readonly');
    const store = transaction.objectStore('user_starred');

    // 获取所有关注的仓库
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const allRepos = event.target.result;
        // 按星标时间降序排序
        allRepos.sort((a, b) => new Date(b.star_time) - new Date(a.star_time));

        // 分页处理
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        const paginatedRepos = allRepos.slice(start, end);

        resolve({
          repos: paginatedRepos,
          total: allRepos.length,
          page,
          pageSize,
          hasMore: end < allRepos.length
        });
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('从缓存获取用户关注仓库失败:', error);
    return { repos: [], total: 0, page, pageSize, hasMore: false };
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

// 清除指定状态的用户创建内容缓存
export const clearUserCreatedCache = async (todoStatus = null) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['user_created', 'cache_metadata'], 'readwrite');
    const store = transaction.objectStore('user_created');
    const metadataStore = transaction.objectStore('cache_metadata');

    if (todoStatus) {
      // 清除指定状态的缓存
      const index = store.index('todo_status');
      const request = index.openCursor(IDBKeyRange.only(todoStatus));

      return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            // 删除对应的元数据
            metadataStore.delete(`user_created_${todoStatus}`);
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      });
    } else {
      // 清除所有缓存
      await store.clear();
      const metadataCursor = metadataStore.openCursor(IDBKeyRange.bound('user_created_', 'user_created_~'));

      return new Promise((resolve, reject) => {
        metadataCursor.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            if (cursor.key.startsWith('user_created_')) {
              cursor.delete();
            }
            cursor.continue();
          } else {
            resolve();
          }
        };
        metadataCursor.onerror = () => reject(metadataCursor.error);
      });
    }
  } catch (error) {
    console.error('清除用户创建内容缓存失败:', error);
    throw error;
  }
};

// 清除用户关注仓库缓存
export const clearUserStarredCache = async () => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['user_starred', 'cache_metadata'], 'readwrite');
    const store = transaction.objectStore('user_starred');
    const metadataStore = transaction.objectStore('cache_metadata');

    // 清除所有缓存
    await store.clear();
    await metadataStore.delete('user_starred');
    await transaction.done;
  } catch (error) {
    console.error('清除用户关注仓库缓存失败:', error);
    throw error;
  }
};

// 保存用户待办事项到缓存
export const saveUserTodoIssues = async (issues, todoStatus = 'pending') => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['user_todo', 'cache_metadata'], 'readwrite');
    const store = transaction.objectStore('user_todo');
    const metadataStore = transaction.objectStore('cache_metadata');

    // 保存所有待办issue
    for (const issue of issues) {
      const issueData = {
        id: `${issue.slug}-${issue.number}-${todoStatus}`,
        todo_id: issue.todo_id || `${issue.slug}-${issue.number}`,
        slug: issue.slug,
        number: issue.number,
        title: issue.title,
        creator: issue.creator,
        created_time: issue.created_time,
        updated_time: issue.updated_time,
        state: issue.state,
        labels: issue.labels || [],
        comment_count: issue.comment_count || 0,
        pinned: issue.pinned || false,
        todo_status: todoStatus,
        cached_at: new Date().toISOString()
      };
      await store.put(issueData);
    }

    // 保存缓存元数据
    const metadata = {
      key: `user_todo_${todoStatus}`,
      type: 'user_todo',
      last_updated: new Date().toISOString(),
      count: issues.length,
      todo_status: todoStatus
    };
    await metadataStore.put(metadata);

    await transaction.done;
    return issues.length;
  } catch (error) {
    console.error('保存用户待办事项失败:', error);
    throw error;
  }
};

// 从缓存获取用户待办事项
export const getUserTodoIssuesFromCache = async (todoStatus = 'pending', page = 1, pageSize = 20) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['user_todo'], 'readonly');
    const store = transaction.objectStore('user_todo');
    const index = store.index('todo_status');

    // 获取指定状态的所有待办issue
    const request = index.getAll(IDBKeyRange.only(todoStatus));

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const allIssues = event.target.result;
        // 按更新时间降序排序
        allIssues.sort((a, b) => new Date(b.updated_time) - new Date(a.updated_time));

        // 分页处理
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        const paginatedIssues = allIssues.slice(start, end);

        resolve({
          issues: paginatedIssues,
          total: allIssues.length,
          page,
          pageSize,
          hasMore: end < allIssues.length
        });
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('从缓存获取用户待办事项失败:', error);
    return { issues: [], total: 0, page, pageSize, hasMore: false };
  }
};

// 清除指定状态的用户待办事项缓存
export const clearUserTodoCache = async (todoStatus = null) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['user_todo', 'cache_metadata'], 'readwrite');
    const store = transaction.objectStore('user_todo');
    const metadataStore = transaction.objectStore('cache_metadata');

    if (todoStatus) {
      // 清除指定状态的缓存
      const index = store.index('todo_status');
      const request = index.openCursor(IDBKeyRange.only(todoStatus));

      return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            // 删除对应的元数据
            metadataStore.delete(`user_todo_${todoStatus}`);
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      });
    } else {
      // 清除所有缓存
      await store.clear();
      const metadataCursor = metadataStore.openCursor(IDBKeyRange.bound('user_todo_', 'user_todo_~'));

      return new Promise((resolve, reject) => {
        metadataCursor.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            if (cursor.key.startsWith('user_todo_')) {
              cursor.delete();
            }
            cursor.continue();
          } else {
            resolve();
          }
        };
        metadataCursor.onerror = () => reject(metadataCursor.error);
      });
    }
  } catch (error) {
    console.error('清除用户待办事项缓存失败:', error);
    throw error;
  }
};

// 保存用户动态到缓存
export const saveUserActivities = async (activities) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['user_activity', 'cache_metadata'], 'readwrite');
    const store = transaction.objectStore('user_activity');
    const metadataStore = transaction.objectStore('cache_metadata');

    // 保存所有动态
    for (const activity of activities) {
      const activityData = {
        id: `${activity.created_at}-${activity.activity_type}-${activity.user?.id || 'unknown'}`,
        created_at: activity.created_at,
        activity_type: activity.activity_type,
        user: activity.user,
        repo: activity.repo || null,
        release: activity.release || null,
        cached_at: new Date().toISOString()
      };
      await store.put(activityData);
    }

    // 保存缓存元数据
    const metadata = {
      key: 'user_activity',
      type: 'user_activity',
      last_updated: new Date().toISOString(),
      count: activities.length
    };
    await metadataStore.put(metadata);

    await transaction.done;
    return activities.length;
  } catch (error) {
    console.error('保存用户动态失败:', error);
    throw error;
  }
};

// 从缓存获取用户动态
export const getUserActivitiesFromCache = async (page = 1, pageSize = 20) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['user_activity'], 'readonly');
    const store = transaction.objectStore('user_activity');

    // 获取所有动态
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const allActivities = event.target.result;
        // 按创建时间降序排序
        allActivities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // 分页处理
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        const paginatedActivities = allActivities.slice(start, end);

        resolve({
          activities: paginatedActivities,
          total: allActivities.length,
          page,
          pageSize,
          hasMore: end < allActivities.length
        });
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('从缓存获取用户动态失败:', error);
    return { activities: [], total: 0, page, pageSize, hasMore: false };
  }
};

// 清除用户动态缓存
export const clearUserActivityCache = async () => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['user_activity', 'cache_metadata'], 'readwrite');
    const store = transaction.objectStore('user_activity');
    const metadataStore = transaction.objectStore('cache_metadata');

    // 清除所有缓存
    await store.clear();
    await metadataStore.delete('user_activity');
    await transaction.done;
  } catch (error) {
    console.error('清除用户动态缓存失败:', error);
    throw error;
  }
};

// 保存用户工作空间到缓存
export const saveUserWorkspaces = async (workspaces) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['user_workspaces', 'cache_metadata'], 'readwrite');
    const store = transaction.objectStore('user_workspaces');
    const metadataStore = transaction.objectStore('cache_metadata');

    // 保存所有工作空间
    for (const workspace of workspaces) {
      const workspaceData = {
        id: workspace.pipeline_id || `${workspace.sn}-${workspace.create_time}`,
        pipeline_id: workspace.pipeline_id,
        sn: workspace.sn,
        user_name: workspace.user_name,
        slug: workspace.slug,
        repo_id: workspace.repo_id,
        branch: workspace.branch,
        workspace_path: workspace.workspace,
        status: workspace.status,
        create_time: workspace.create_time,
        duration: workspace.duration,
        repo_url: workspace.repo_url,
        file_count: workspace.file_count,
        file_list: workspace.file_list,
        stash_count: workspace.stash_count,
        commit_count: workspace.commit_count,
        remote_stash_count: workspace.remote_stash_count,
        latest_sha: workspace.latest_sha,
        restore_id: workspace.restore_id,
        business_id: workspace.business_id,
        single_stash: workspace.single_stash,
        is_preview: workspace.is_preview,
        ssh: workspace.ssh,
        jetbrainsList: workspace.jetbrainsList || [],
        cached_at: new Date().toISOString()
      };
      await store.put(workspaceData);
    }

    // 保存缓存元数据
    const metadata = {
      key: 'user_workspaces',
      type: 'user_workspaces',
      last_updated: new Date().toISOString(),
      count: workspaces.length
    };
    await metadataStore.put(metadata);

    await transaction.done;
    return workspaces.length;
  } catch (error) {
    console.error('保存用户工作空间失败:', error);
    throw error;
  }
};

// 从缓存获取用户工作空间
export const getUserWorkspacesFromCache = async (page = 1, pageSize = 20) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['user_workspaces'], 'readonly');
    const store = transaction.objectStore('user_workspaces');

    // 获取所有工作空间
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const allWorkspaces = event.target.result;
        // 按创建时间降序排序
        allWorkspaces.sort((a, b) => new Date(b.create_time) - new Date(a.create_time));

        // 分页处理
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        const paginatedWorkspaces = allWorkspaces.slice(start, end);

        resolve({
          workspaces: paginatedWorkspaces,
          total: allWorkspaces.length,
          page,
          pageSize,
          hasMore: end < allWorkspaces.length
        });
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('从缓存获取用户工作空间失败:', error);
    return { workspaces: [], total: 0, page, pageSize, hasMore: false };
  }
};

// 清除用户工作空间缓存
export const clearUserWorkspacesCache = async () => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['user_workspaces', 'cache_metadata'], 'readwrite');
    const store = transaction.objectStore('user_workspaces');
    const metadataStore = transaction.objectStore('cache_metadata');

    // 清除所有缓存
    await store.clear();
    await metadataStore.delete('user_workspaces');
    await transaction.done;
  } catch (error) {
    console.error('清除用户工作空间缓存失败:', error);
    throw error;
  }
};

// 保存用户任务集到缓存
export const saveUserMissions = async (missions, userId = null) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['user_missions', 'cache_metadata'], 'readwrite');
    const store = transaction.objectStore('user_missions');
    const metadataStore = transaction.objectStore('cache_metadata');

    // 保存所有任务集
    for (const mission of missions) {
      const missionData = {
        id: mission.id,
        name: mission.name,
        description: mission.description || '',
        freeze: mission.freeze || false,
        visibility_level: mission.visibility_level,
        created_at: mission.created_at,
        updated_at: mission.updated_at,
        path: mission.path,
        access: mission.access,
        stared: mission.stared || false,
        star_time: mission.star_time,
        pinned: mission.pinned || false,
        pinned_time: mission.pinned_time,
        cached_at: new Date().toISOString(),
        user_id: userId // 添加用户ID字段
      };
      await store.put(missionData);
    }

    // 保存缓存元数据
    const metadata = {
      key: userId ? `user_missions_${userId}` : 'user_missions',
      type: 'user_missions',
      last_updated: new Date().toISOString(),
      count: missions.length,
      user_id: userId // 添加用户ID字段
    };
    await metadataStore.put(metadata);

    await transaction.done;
    return missions.length;
  } catch (error) {
    console.error('保存用户任务集失败:', error);
    throw error;
  }
};

// 从缓存获取用户任务集
export const getUserTasksFromCache = async (page = 1, pageSize = 20, userId = null) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['user_missions'], 'readonly');
    const store = transaction.objectStore('user_missions');

    let allMissions;

    if (userId) {
      // 按用户ID过滤
      const index = store.index('user_id');
      const request = index.getAll(userId);

      allMissions = await new Promise((resolve, reject) => {
        request.onsuccess = (event) => resolve(event.target.result || []);
        request.onerror = () => reject(request.error);
      });
    } else {
      // 获取所有任务集（向后兼容）
      const request = store.getAll();

      allMissions = await new Promise((resolve, reject) => {
        request.onsuccess = (event) => resolve(event.target.result || []);
        request.onerror = () => reject(request.error);
      });
    }

    // 按创建时间降序排序
    allMissions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // 分页处理
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedMissions = allMissions.slice(start, end);

    return {
      missions: paginatedMissions,
      total: allMissions.length,
      page,
      pageSize,
      hasMore: end < allMissions.length
    };
  } catch (error) {
    console.error('从缓存获取用户任务集失败:', error);
    return { missions: [], total: 0, page, pageSize, hasMore: false };
  }
};

// 清除用户任务集缓存
export const clearUserMissionsCache = async () => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['user_missions', 'cache_metadata'], 'readwrite');
    const store = transaction.objectStore('user_missions');
    const metadataStore = transaction.objectStore('cache_metadata');

    // 清除所有缓存
    await store.clear();
    await metadataStore.delete('user_missions');
    await transaction.done;
  } catch (error) {
    console.error('清除用户任务集缓存失败:', error);
    throw error;
  }
};

// 保存用户组织到缓存
export const saveUserGroups = async (groups, userId = null) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['user_groups', 'cache_metadata'], 'readwrite');
    const store = transaction.objectStore('user_groups');
    const metadataStore = transaction.objectStore('cache_metadata');

    // 保存所有组织
    for (const group of groups) {
      const groupData = {
        id: group.id,
        name: group.name,
        remark: group.remark || '',
        description: group.description || '',
        site: group.site || '',
        email: group.email || '',
        domain: group.domain || '',
        freeze: group.freeze || false,
        wechat_mp: group.wechat_mp || '',
        created_at: group.created_at,
        updated_at: group.updated_at,
        follow_count: group.follow_count || 0,
        member_count: group.member_count || 0,
        all_member_count: group.all_member_count || 0,
        sub_group_count: group.sub_group_count || 0,
        sub_repo_count: group.sub_repo_count || 0,
        sub_mission_count: group.sub_mission_count || 0,
        sub_registry_count: group.sub_registry_count || 0,
        all_sub_group_count: group.all_sub_group_count || 0,
        all_sub_repo_count: group.all_sub_repo_count || 0,
        all_sub_mission_count: group.all_sub_mission_count || 0,
        all_sub_registry_count: group.all_sub_registry_count || 0,
        has_sub_group: group.has_sub_group || false,
        path: group.path,
        access_role: group.access_role,
        pinned: group.pinned || false,
        pinned_time: group.pinned_time,
        cached_at: new Date().toISOString(),
        user_id: userId // 添加用户ID字段
      };
      await store.put(groupData);
    }

    // 保存缓存元数据
    const metadata = {
      key: userId ? `user_groups_${userId}` : 'user_groups',
      type: 'user_groups',
      last_updated: new Date().toISOString(),
      count: groups.length,
      user_id: userId // 添加用户ID字段
    };
    await metadataStore.put(metadata);

    await transaction.done;
    return groups.length;
  } catch (error) {
    console.error('保存用户组织失败:', error);
    throw error;
  }
};

// 从缓存获取用户组织
export const getUserGroupsFromCache = async (page = 1, pageSize = 20, userId = null) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['user_groups'], 'readonly');
    const store = transaction.objectStore('user_groups');

    let allGroups;

    if (userId) {
      // 按用户ID过滤
      const index = store.index('user_id');
      const request = index.getAll(userId);

      allGroups = await new Promise((resolve, reject) => {
        request.onsuccess = (event) => resolve(event.target.result || []);
        request.onerror = () => reject(request.error);
      });
    } else {
      // 获取所有组织（向后兼容）
      const request = store.getAll();

      allGroups = await new Promise((resolve, reject) => {
        request.onsuccess = (event) => resolve(event.target.result || []);
        request.onerror = () => reject(request.error);
      });
    }

    // 按创建时间降序排序
    allGroups.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // 分页处理
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedGroups = allGroups.slice(start, end);

    return {
      groups: paginatedGroups,
      total: allGroups.length,
      page,
      pageSize,
      hasMore: end < allGroups.length
    };
  } catch (error) {
    console.error('从缓存获取用户组织失败:', error);
    return { groups: [], total: 0, page, pageSize, hasMore: false };
  }
};

// 清除用户组织缓存
export const clearUserGroupsCache = async () => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['user_groups', 'cache_metadata'], 'readwrite');
    const store = transaction.objectStore('user_groups');
    const metadataStore = transaction.objectStore('cache_metadata');

    // 清除所有缓存
    await store.clear();
    await metadataStore.delete('user_groups');
    await transaction.done;
  } catch (error) {
    console.error('清除用户组织缓存失败:', error);
    throw error;
  }
};

// 保存用户仓库到缓存
export const saveUserRepos = async (repos, userId = null) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['user_repos', 'cache_metadata'], 'readwrite');
    const store = transaction.objectStore('user_repos');
    const metadataStore = transaction.objectStore('cache_metadata');

    // 保存所有仓库
    for (const repo of repos) {
      const repoData = {
        id: repo.id,
        name: repo.name,
        path: repo.path,
        description: repo.description || '',
        web_url: repo.web_url,
        star_count: repo.star_count || 0,
        fork_count: repo.fork_count || 0,
        open_issue_count: repo.open_issue_count || 0,
        languages: repo.languages || {}, // 保存语言颜色
        language_color: repo.languages?.color || '',
        visibility_level: repo.visibility_level || 'Private',
        created_at: repo.created_at,
        updated_at: repo.updated_at,
        last_updated_at: repo.last_updated_at,
        access: repo.access || 'Guest',
        stared: repo.stared || false,
        pinned: repo.pinned || false,
        cached_at: new Date().toISOString(),
        user_id: userId // 添加用户ID字段
      };
      await store.put(repoData);
    }

    // 保存缓存元数据
    const metadata = {
      key: userId ? `user_repos_${userId}` : 'user_repos',
      type: 'user_repos',
      last_updated: new Date().toISOString(),
      count: repos.length,
      user_id: userId // 添加用户ID字段
    };
    await metadataStore.put(metadata);

    await transaction.done;
    return repos.length;
  } catch (error) {
    console.error('保存用户仓库失败:', error);
    throw error;
  }
};

// 从缓存获取用户仓库
export const getUserReposFromCache = async (page = 1, pageSize = 20, userId = null) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['user_repos'], 'readonly');
    const store = transaction.objectStore('user_repos');

    let allRepos;

    if (userId) {
      // 按用户ID过滤
      const index = store.index('user_id');
      const request = index.getAll(userId);

      allRepos = await new Promise((resolve, reject) => {
        request.onsuccess = (event) => resolve(event.target.result || []);
        request.onerror = () => reject(request.error);
      });
    } else {
      // 获取所有仓库（向后兼容）
      const request = store.getAll();

      allRepos = await new Promise((resolve, reject) => {
        request.onsuccess = (event) => resolve(event.target.result || []);
        request.onerror = () => reject(request.error);
      });
    }

    // 按更新时间降序排序
    allRepos.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    // 分页处理
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedRepos = allRepos.slice(start, end);

    return {
      repos: paginatedRepos,
      total: allRepos.length,
      page,
      pageSize,
      hasMore: end < allRepos.length
    };
  } catch (error) {
    console.error('从缓存获取用户仓库失败:', error);
    return { repos: [], total: 0, page, pageSize, hasMore: false };
  }
};

// 清除用户仓库缓存
export const clearUserReposCache = async () => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['user_repos', 'cache_metadata'], 'readwrite');
    const store = transaction.objectStore('user_repos');
    const metadataStore = transaction.objectStore('cache_metadata');

    // 清除所有缓存
    await store.clear();
    await metadataStore.delete('user_repos');
    await transaction.done;
  } catch (error) {
    console.error('清除用户仓库缓存失败:', error);
    throw error;
  }
};

// 保存用户代码活动到缓存
export const saveUserCodeActivities = async (activities, username, date = null) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['user_code_activities', 'cache_metadata'], 'readwrite');
    const store = transaction.objectStore('user_code_activities');
    const metadataStore = transaction.objectStore('cache_metadata');

    // 生成唯一ID
    const activityId = `${username}-${date || 'all'}`;

    // 保存代码活动数据
    const activityData = {
      id: activityId,
      username: username,
      date: date,
      activities: activities,
      created_at: new Date().toISOString(),
      user_id: username // 使用username作为user_id
    };

    await store.put(activityData);

    // 保存缓存元数据
    const metadata = {
      key: `user_code_activities_${username}`,
      type: 'user_code_activities',
      last_updated: new Date().toISOString(),
      count: 1,
      user_id: username
    };
    await metadataStore.put(metadata);

    await transaction.done;
    return 1;
  } catch (error) {
    console.error('保存用户代码活动失败:', error);
    throw error;
  }
};

// 从缓存获取用户代码活动
export const getUserCodeActivitiesFromCache = async (username, date = null) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['user_code_activities'], 'readonly');
    const store = transaction.objectStore('user_code_activities');

    let activityId;
    if (date) {
      activityId = `${username}-${date}`;
    } else {
      // 如果没有指定日期，获取最新的活动数据
      const index = store.index('username');
      const request = index.getAll(username);

      const allActivities = await new Promise((resolve, reject) => {
        request.onsuccess = (event) => resolve(event.target.result || []);
        request.onerror = () => reject(request.error);
      });

      // 按创建时间降序排序，返回最新的
      allActivities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return allActivities.length > 0 ? allActivities[0] : null;
    }

    // 获取指定日期的活动数据
    return await store.get(activityId);
  } catch (error) {
    console.error('从缓存获取用户代码活动失败:', error);
    return null;
  }
};

// 清除用户代码活动缓存
export const clearUserCodeActivitiesCache = async (username = null) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['user_code_activities', 'cache_metadata'], 'readwrite');
    const store = transaction.objectStore('user_code_activities');
    const metadataStore = transaction.objectStore('cache_metadata');

    if (username) {
      // 清除指定用户的缓存
      const index = store.index('username');
      const request = index.openCursor(IDBKeyRange.only(username));

      return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            // 删除对应的元数据
            metadataStore.delete(`user_code_activities_${username}`);
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      });
    } else {
      // 清除所有缓存
      await store.clear();
      await metadataStore.delete('user_code_activities');
    }

    await transaction.done;
  } catch (error) {
    console.error('清除用户代码活动缓存失败:', error);
    throw error;
  }
};
