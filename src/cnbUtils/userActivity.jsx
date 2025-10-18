// 导入indexedDB工具函数
import {
  saveUserActivities,
  getUserActivitiesFromCache,
  getCacheMetadata
} from './indexedDB';

// 导入存储参数工具
import { getStoragePaginationParams } from './storageParams';

/**
 * 构建日期格式为：YYYYMMDDHHMM-0-0
 * 日期取当前时间减去1分钟
 * @returns {string} 格式化后的日期字符串
 */
const buildDatePosition = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - 1);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}${month}${day}-${hours}-${minutes}`;
};

/**
 * 获取用户动态，支持缓存优先策略
 * @param {Object} options - 请求选项
 * @param {number} options.page - 页码，默认为 1
 * @param {number} options.pageSize - 每页数量，默认为 20
 * @param {boolean} options.forceRefresh - 是否强制刷新，默认为 false
 * @param {number} options.daysAgo - 多少天前，默认为1天
 * @returns {Promise<Array>} 用户动态列表
 */
export const getUserActivities = async ({
  page = 1,
  pageSize = 20,
  forceRefresh = false,
  daysAgo = 1
} = {}) => {
  try {
    // 从localStorage获取session
    const session = localStorage.getItem('CNBSESSION');

    if (!session) {
      throw new Error('未找到用户session，请先登录');
    }

    // 从存储获取分页参数，覆盖默认值
    const storageParams = getStoragePaginationParams();
    page = storageParams.page;
    pageSize = storageParams.pageSize;

    // 构建日期位置
    const nextPosition = buildDatePosition();

    // 如果不是强制刷新，先尝试从缓存获取
    if (!forceRefresh) {
      try {
        const cachedData = await getUserActivitiesFromCache(page, pageSize);
        if (cachedData.activities.length > 0) {
          console.log('从缓存获取用户动态成功');

          // 异步发起网络请求更新缓存
          fetchAndUpdateCache({ page, pageSize, session, daysAgo }).catch(error => {
            console.warn('后台更新缓存失败:', error);
          });

          return cachedData.activities;
        }
      } catch (cacheError) {
        console.warn('从缓存获取数据失败，尝试网络请求:', cacheError);
      }
    }

    // 从网络获取数据
    const response = await fetch(`${import.meta.env.VITE_CNBCOOKIE_API_URL}/user/dashboard/activity/workflow?next_position=${nextPosition}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_CNBCOOKIE}`,
        'session': session
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const activities = data.activity_workflow_datas || [];

    // 保存到缓存
    if (activities.length > 0) {
      try {
        await saveUserActivities(activities);
        console.log('用户动态已保存到缓存');
      } catch (saveError) {
        console.warn('保存到缓存失败:', saveError);
      }
    }

    return activities;
  } catch (error) {
    console.error('获取用户动态失败:', error);

    // 如果网络请求失败，尝试从缓存获取数据
    try {
      const cachedData = await getUserActivitiesFromCache(page, pageSize);
      if (cachedData.activities.length > 0) {
        console.log('网络请求失败，使用缓存数据');
        return cachedData.activities;
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
const fetchAndUpdateCache = async ({ page, pageSize, session, daysAgo = 3 }) => {
  try {
    // 检查缓存是否需要更新（比如超过一定时间）
    const metadata = await getCacheMetadata('user_activity');
    const now = new Date();

    // 如果缓存存在且未过期（比如5分钟内），则不更新
    if (metadata && metadata.last_updated) {
      const lastUpdated = new Date(metadata.last_updated);
      const diffInMinutes = (now - lastUpdated) / (1000 * 60);
      if (diffInMinutes < 5) {
        return; // 缓存还很新鲜，不需要更新
      }
    }

    // 构建日期位置
    const nextPosition = buildDatePosition(daysAgo);

    // 发起网络请求更新缓存
    const response = await fetch(`${import.meta.env.VITE_CNBCOOKIE_API_URL}/user/dashboard/activity/workflow?next_position=${nextPosition}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_CNBCOOKIE}`,
        'session': session
      }
    });

    if (response.ok) {
      const data = await response.json();
      const activities = data.activity_workflow_datas || [];

      if (activities.length > 0) {
        await saveUserActivities(activities);
        console.log('后台静默更新缓存成功');
      }
    }
  } catch (error) {
    console.warn('后台静默更新缓存失败:', error);
  }
};

/**
 * 格式化动态数据用于UI显示
 * @param {Array} activities - 原始动态数据
 * @returns {Array} 格式化后的动态数据
 */
export const formatActivitiesForDisplay = (activities) => {
  return activities.map(activity => ({
    id: `${activity.created_at}-${activity.activity_type}-${activity.user?.id || 'unknown'}`,
    createdAt: activity.created_at,
    activityType: activity.activity_type,
    user: {
      id: activity.user?.id,
      username: activity.user?.username,
      nickname: activity.user?.nickname || activity.user?.username,
      avatar: activity.user?.avatar || `https://cnb.cool/users/${activity.user?.username}/avatar/s`
    },
    repo: activity.repo ? {
      id: activity.repo.id,
      name: activity.repo.name,
      description: activity.repo.description || '',
      path: activity.repo.path,
      webUrl: activity.repo.site || `https://cnb.cool/${activity.repo.path}`,
      languages: activity.repo.languages || {},
      visibility: activity.repo.visibility_level || 'Public'
    } : null,
    release: activity.release ? {
      title: activity.release.title,
      tag: activity.release.tag,
      commitHash: activity.release.commit_hash
    } : null
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
};

/**
 * 获取活动类型的中文描述
 * @param {string} activityType - 活动类型
 * @returns {string} 中文描述
 */
export const getActivityTypeLabel = (activityType) => {
  const typeMap = {
    'create_repo': '创建仓库',
    'user_create_release': '创建发布',
    'fork_repo': '复刻仓库',
    'star_repo': '星标仓库',
    'watch_repo': '关注仓库',
    'create_issue': '创建Issue',
    'comment_issue': '评论Issue',
    'merge_request': '合并请求',
    'push_code': '推送代码',
    'create_branch': '创建分支',
    'delete_branch': '删除分支',
    'create_tag': '创建标签',
    'delete_tag': '删除标签'
  };

  return typeMap[activityType] || activityType;
};

/**
 * 获取主要编程语言
 * @param {Object} languages - 语言对象
 * @returns {string} 主要语言名称
 */
export const getPrimaryLanguage = (languages) => {
  if (!languages || typeof languages !== 'object') return '';

  // 如果 languages 对象有 language 属性
  if (languages.language) {
    return languages.language;
  }

  // 如果是其他格式的语言对象，返回第一个键
  const keys = Object.keys(languages);
  return keys.length > 0 ? keys[0] : '';
};
