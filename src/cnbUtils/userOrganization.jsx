// 导入indexedDB工具函数
import {
  saveUserGroups,
  getUserGroupsFromCache,
  getCacheMetadata
} from './indexedDB';

// 导入存储参数工具
import { getStoragePaginationParams } from './storageParams';

/**
 * 获取用户组织列表，支持缓存优先策略
 * @param {Object} options - 请求选项
 * @param {string} options.username - 用户名，从路由参数获取
 * @param {number} options.page - 页码，默认为 1
 * @param {number} options.pageSize - 每页数量，默认为 10
 * @param {boolean} options.forceRefresh - 是否强制刷新，默认为 false
 * @param {string} options.userId - 用户ID，用于缓存分类
 * @returns {Promise<Array>} 用户组织列表
 */
export const getUserOrganizations = async ({
  username,
  page = 1,
  pageSize = 10,
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
        const cachedData = await getUserGroupsFromCache(page, pageSize, targetUserId);
        if (cachedData.groups.length > 0) {
          console.log('从缓存获取用户组织成功');

          // 异步发起网络请求更新缓存
          fetchAndUpdateCache({ username, page, pageSize, session, userId: targetUserId }).catch(error => {
            console.warn('后台更新缓存失败:', error);
          });

          return cachedData.groups;
        }
      } catch (cacheError) {
        console.warn('从缓存获取数据失败，尝试网络请求:', cacheError);
      }
    }

    // 从网络获取数据
    const response = await fetch(`${import.meta.env.VITE_CNBCOOKIE_API_URL}/users/${username}/groups?page=${page}&page_size=${pageSize}`, {
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
    const groups = data || [];

    // 保存到缓存
    if (groups.length > 0) {
      try {
        await saveUserGroups(groups, targetUserId);
        console.log('用户组织已保存到缓存');
      } catch (saveError) {
        console.warn('保存到缓存失败:', saveError);
      }
    }

    return groups;
  } catch (error) {
    console.error('获取用户组织失败:', error);

    // 如果网络请求失败，尝试从缓存获取数据
    try {
      const cachedData = await getUserGroupsFromCache(page, pageSize, userId || username);
      if (cachedData.groups.length > 0) {
        console.log('网络请求失败，使用缓存数据');
        return cachedData.groups;
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
    const metadata = await getCacheMetadata('user_groups');
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
    const response = await fetch(`${import.meta.env.VITE_CNBCOOKIE_API_URL}/users/${username}/groups?page=${page}&page_size=${pageSize}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_CNBCOOKIE}`,
        'Accept': 'application/vnd.cnb.web+json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      const groups = data || [];

      if (groups.length > 0) {
        await saveUserGroups(groups, userId);
        console.log('后台静默更新缓存成功');
      }
    }
  } catch (error) {
    console.warn('后台静默更新缓存失败:', error);
  }
};

/**
 * 格式化组织数据用于UI显示
 * @param {Array} groups - 原始组织数据
 * @returns {Array} 格式化后的组织数据
 */
export const formatOrganizationsForDisplay = (groups) => {
  return groups.map(group => ({
    id: group.id,
    name: group.name,
    remark: group.remark || '',
    description: group.description || '',
    site: group.site || '',
    email: group.email || '',
    domain: group.domain || '',
    freeze: group.freeze || false,
    wechatMp: group.wechat_mp || '',
    createdAt: group.created_at,
    updatedAt: group.updated_at,
    followCount: group.follow_count || 0,
    memberCount: group.member_count || 0,
    allMemberCount: group.all_member_count || 0,
    subGroupCount: group.sub_group_count || 0,
    subRepoCount: group.sub_repo_count || 0,
    subMissionCount: group.sub_mission_count || 0,
    subRegistryCount: group.sub_registry_count || 0,
    allSubGroupCount: group.all_sub_group_count || 0,
    allSubRepoCount: group.all_sub_repo_count || 0,
    allSubMissionCount: group.all_sub_mission_count || 0,
    allSubRegistryCount: group.all_sub_registry_count || 0,
    hasSubGroup: group.has_sub_group || false,
    path: group.path,
    pinned: group.pinned || false,
    pinnedTime: group.pinned_time
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
 * 格式化数字显示，超过1000显示K单位
 * @param {number} num - 数字
 * @returns {string} 格式化后的数字
 */
export const formatNumber = (num) => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};
