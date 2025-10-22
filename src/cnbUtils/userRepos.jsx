// 导入indexedDB工具函数
import {
  saveUserRepos,
  getUserReposFromCache,
  getCacheMetadata
} from './indexedDB';

// 导入存储参数工具
import { getStoragePaginationParams } from './storageParams';

/**
 * 获取用户仓库列表，支持缓存优先策略
 * @param {Object} options - 请求选项
 * @param {string} options.username - 用户名，从路由参数获取
 * @param {number} options.page - 页码，默认为 1
 * @param {number} options.pageSize - 每页数量，默认为 20
 * @param {boolean} options.forceRefresh - 是否强制刷新，默认为 false
 * @param {string} options.userId - 用户ID，用于缓存分类
 * @returns {Promise<Array>} 用户仓库列表
 */
export const getUserRepos = async ({
  username,
  page = 1,
  pageSize = 20,
  forceRefresh = false,
  userId = null
} = {}) => {
  try {
    // 从localStorage获取session
    const session = localStorage.getItem('CNBSESSION');

    if (!username) {
      throw new Error('用户名不能为空');
    }

    // 从存储获取分页参数，覆盖默认值
    const storageParams = getStoragePaginationParams();
    page = storageParams.page;
    pageSize = storageParams.pageSize;

    // 如果没有提供userId，尝试从session或username获取
    const targetUserId = userId || username;

    // 如果不是强制刷新，先尝试从缓存获取
    if (!forceRefresh) {
      try {
        const cachedData = await getUserReposFromCache(page, pageSize, targetUserId);
        if (cachedData.repos.length > 0) {
          console.log('从缓存获取用户仓库成功');

          // 异步发起网络请求更新缓存
          fetchAndUpdateCache({ username, page, pageSize, session, userId: targetUserId }).catch(error => {
            console.warn('后台更新缓存失败:', error);
          });

          return cachedData.repos;
        }
      } catch (cacheError) {
        console.warn('从缓存获取数据失败，尝试网络请求:', cacheError);
      }
    }

    // 从网络获取数据
    const response = await fetch(`${import.meta.env.VITE_CNBCOOKIE_API_URL}/users/${username}/repos?page=${page}&page_size=${pageSize}&role=Owner&order_by=last_updated_at&desc=true`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_CNBCOOKIE}`,
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const repos = data || [];

    // 保存到缓存
    if (repos.length > 0) {
      try {
        await saveUserRepos(repos, targetUserId);
        console.log('用户仓库已保存到缓存');
      } catch (saveError) {
        console.warn('保存到缓存失败:', saveError);
      }
    }

    return repos;
  } catch (error) {
    console.error('获取用户仓库失败:', error);

    // 如果网络请求失败，尝试从缓存获取数据
    try {
      const cachedData = await getUserReposFromCache(page, pageSize, userId || username);
      if (cachedData.repos.length > 0) {
        console.log('网络请求失败，使用缓存数据');
        return cachedData.repos;
      }
    } catch (cacheError) {
      console.warn('从缓存获取备用数据也失败:', cacheError);
    }

    throw error;
  }
};

/**
 * 异步获取并更新缓存（后台静默更新）
 */
const fetchAndUpdateCache = async ({ username, page, pageSize, session, userId }) => {
  try {
    // 检查缓存是否需要更新（比如超过一定时间）
    const metadata = await getCacheMetadata('user_repos');
    const now = new Date();

    // 如果缓存存在且未过期（比如5分钟内），则不更新
    if (metadata && metadata.last_updated) {
      const lastUpdated = new Date(metadata.last_updated);
      const diffInMinutes = (now - lastUpdated) / (1000 * 60);
      if (diffInMinutes < 5) {
        return; // 缓存还很新鲜，不需要更新
      }
    }

    // 发起网络请求更新缓存
    const response = await fetch(`${import.meta.env.VITE_CNBCOOKIE_API_URL}/users/${username}/repos?page=${page}&page_size=${pageSize}&role=Owner&order_by=last_updated_at&desc=true`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_CNBCOOKIE}`,
      }
    });

    if (response.ok) {
      const data = await response.json();
      const repos = data || [];

      if (repos.length > 0) {
        await saveUserRepos(repos, userId);
        console.log('后台静默更新缓存成功');
      }
    }
  } catch (error) {
    console.warn('后台静默更新缓存失败:', error);
  }
};

/**
 * 格式化仓库数据用于UI显示
 * @param {Array} repos - 原始仓库数据
 * @returns {Array} 格式化后的仓库数据
 */
export const formatReposForDisplay = (repos) => {
  return repos.map(repo => ({
    id: repo.id,
    name: repo.name,
    path: repo.path,
    description: repo.description || '',
    webUrl: repo.web_url,
    starCount: repo.star_count || 0,
    forkCount: repo.fork_count || 0,
    openIssueCount: repo.open_issue_count || 0,
    languages: repo.languages || {},
    languageColor: (repo.languages?.color || repo.language_color || ''),
    visibility: repo.visibility_level || 'Private',
    createdAt: repo.created_at,
    updatedAt: repo.updated_at,
    lastUpdatedAt: repo.last_updated_at,
    access: repo.access || 'Guest',
    stared: repo.stared || false,
    pinned: repo.pinned || false
  }));
};

/**
 * 获取主要编程语言
 * @param {Object} languages - 语言对象
 * @returns {string} 主要语言名称
 */
export const getPrimaryLanguage = (languages) => {
  if (!languages || !languages.language) return '';
  return languages.language;
};

/**
 * 格式化日期显示
 * @param {string} dateString - ISO日期字符串
 * @returns {string} 格式化后的日期
 */
export const formatDisplayDate = (dateString) => {
  if (!dateString) return '未知时间';

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
};
