// 导入indexedDB工具函数
import {
  saveUserMissions,
  getUserTasksFromCache,
  getCacheMetadata
} from './indexedDB';

// 导入存储参数工具
import { getStoragePaginationParams } from './storageParams';

/**
 * 获取用户任务集列表，支持缓存优先策略
 * @param {Object} options - 请求选项
 * @param {string} options.username - 用户名，从路由参数获取
 * @param {number} options.page - 页码，默认为 1
 * @param {number} options.pageSize - 每页数量，默认为 20
 * @param {boolean} options.forceRefresh - 是否强制刷新，默认为 false
 * @param {string} options.userId - 用户ID，用于缓存分类
 * @returns {Promise<Array>} 用户任务集列表
 */
export const getUserMissions = async ({
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
        const cachedData = await getUserTasksFromCache(page, pageSize, targetUserId);
        if (cachedData.missions.length > 0) {
          console.log('从缓存获取用户任务集成功');

          // 异步发起网络请求更新缓存
          fetchAndUpdateCache({ username, page, pageSize, session, userId: targetUserId }).catch(error => {
            console.warn('后台更新缓存失败:', error);
          });

          return cachedData.missions;
        }
      } catch (cacheError) {
        console.warn('从缓存获取数据失败，尝试网络请求:', cacheError);
      }
    }

    // 从网络获取数据
    const response = await fetch(`${import.meta.env.VITE_CNBCOOKIE_API_URL}/users/${username}/missions?search=&page=${page}&page_size=${pageSize}&desc=false&orderBy=created_at&sortType=createdAt_descend`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_CNBCOOKIE}`,
        'Accept': 'application/vnd.cnb.web+json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const missions = data || [];

    // 保存到缓存
    if (missions.length > 0) {
      try {
        await saveUserMissions(missions, targetUserId);
        console.log('用户任务集已保存到缓存');
      } catch (saveError) {
        console.warn('保存到缓存失败:', saveError);
      }
    }

    return missions;
  } catch (error) {
    console.error('获取用户任务集失败:', error);

    // 如果网络请求失败，尝试从缓存获取数据
    try {
      const cachedData = await getUserTasksFromCache(page, pageSize, userId || username);
      if (cachedData.missions.length > 0) {
        console.log('网络请求失败，使用缓存数据');
        return cachedData.missions;
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
    const metadata = await getCacheMetadata('user_missions');
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
    const response = await fetch(`${import.meta.env.VITE_CNBCOOKIE_API_URL}/users/${username}/missions?search=&page=${page}&page_size=${pageSize}&desc=false&orderBy=created_at&sortType=createdAt_descend`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_CNBCOOKIE}`,
        'Accept': 'application/vnd.cnb.web+json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      const missions = data || [];

      if (missions.length > 0) {
        await saveUserMissions(missions, userId);
        console.log('后台静默更新缓存成功');
      }
    }
  } catch (error) {
    console.warn('后台静默更新缓存失败:', error);
  }
};

/**
 * 格式化任务集数据用于UI显示
 * @param {Array} missions - 原始任务集数据
 * @returns {Array} 格式化后的任务集数据
 */
export const formatMissionsForDisplay = (missions) => {
  return missions.map(mission => ({
    id: mission.id,
    name: mission.name,
    description: mission.description || '',
    freeze: mission.freeze || false,
    visibilityLevel: mission.visibility_level,
    createdAt: mission.created_at,
    updatedAt: mission.updated_at,
    path: mission.path,
    access: mission.access,
    stared: mission.stared || false,
    starTime: mission.star_time,
    pinned: mission.pinned || false,
    pinnedTime: mission.pinned_time
  }));
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

/**
 * 获取可见性级别的标签
 * @param {string} visibilityLevel - 可见性级别
 * @returns {string} 对应的中文标签
 */
export const getVisibilityLabel = (visibilityLevel) => {
  const visibilityMap = {
    'Public': '公开',
    'Private': '私有',
    'Internal': '内部'
  };
  return visibilityMap[visibilityLevel] || visibilityLevel;
};

/**
 * 获取访问权限的标签
 * @param {string} access - 访问权限
 * @returns {string} 对应的中文标签
 */
export const getAccessLabel = (access) => {
  const accessMap = {
    'Owner': '所有者',
    'Maintainer': '维护者',
    'Developer': '开发者',
    'Reporter': '报告者',
    'Guest': '访客'
  };
  return accessMap[access] || access;
};
