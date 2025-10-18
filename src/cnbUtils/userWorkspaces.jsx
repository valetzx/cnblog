// 导入indexedDB工具函数
import {
  saveUserWorkspaces,
  getUserWorkspacesFromCache,
  getCacheMetadata
} from './indexedDB';

// 导入存储参数工具
import { getStoragePaginationParams } from './storageParams';

/**
 * 获取用户工作空间列表，支持缓存优先策略
 * @param {Object} options - 请求选项
 * @param {string} options.slug - 仓库slug，默认为空
 * @param {string} options.branch - 分支名称，默认为空
 * @param {string} options.status - 工作空间状态，默认为空
 * @param {number} options.page - 页码，默认为 1
 * @param {number} options.pageSize - 每页数量，默认为 20
 * @param {boolean} options.forceRefresh - 是否强制刷新，默认为 false
 * @returns {Promise<Array>} 用户工作空间列表
 */
export const getUserWorkspaces = async ({
  slug = '',
  branch = '',
  status = '',
  page = 1,
  pageSize = 20,
  forceRefresh = false
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

    // 如果不是强制刷新，先尝试从缓存获取
    if (!forceRefresh) {
      try {
        const cachedData = await getUserWorkspacesFromCache(page, pageSize);
        if (cachedData.workspaces.length > 0) {
          console.log('从缓存获取用户工作空间成功');

          // 异步发起网络请求更新缓存
          fetchAndUpdateCache({ slug, branch, status, page, pageSize, session }).catch(error => {
            console.warn('后台更新缓存失败:', error);
          });

          return cachedData.workspaces;
        }
      } catch (cacheError) {
        console.warn('从缓存获取数据失败，尝试网络请求:', cacheError);
      }
    }

    // 构建查询参数
    const params = new URLSearchParams();
    if (slug) params.append('slug', slug);
    if (branch) params.append('branch', branch);
    if (status) params.append('status', status);
    params.append('page', page.toString());
    params.append('pageSize', pageSize.toString());

    // 从网络获取数据
    const response = await fetch(`${import.meta.env.VITE_CNBCOOKIE_API_URL}/workspace/list?${params.toString()}`, {
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
    const workspaces = data.list || [];

    // 保存到缓存
    if (workspaces.length > 0) {
      try {
        await saveUserWorkspaces(workspaces);
        console.log('用户工作空间已保存到缓存');
      } catch (saveError) {
        console.warn('保存到缓存失败:', saveError);
      }
    }

    return workspaces;
  } catch (error) {
    console.error('获取用户工作空间失败:', error);

    // 如果网络请求失败，尝试从缓存获取数据
    try {
      const cachedData = await getUserWorkspacesFromCache(page, pageSize);
      if (cachedData.workspaces.length > 0) {
        console.log('网络请求失败，使用缓存数据');
        return cachedData.workspaces;
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
const fetchAndUpdateCache = async ({ slug, branch, status, page, pageSize, session }) => {
  try {
    // 检查缓存是否需要更新（比如超过一定时间）
    const metadata = await getCacheMetadata('user_workspaces');
    const now = new Date();

    // 如果缓存存在且未过期（比如5分钟内），则不更新
    if (metadata && metadata.last_updated) {
      const lastUpdated = new Date(metadata.last_updated);
      const diffInMinutes = (now - lastUpdated) / (1000 * 60);
      if (diffInMinutes < 5) {
        return; // 缓存还很新鲜，不需要更新
      }
    }

    // 构建查询参数
    const params = new URLSearchParams();
    if (slug) params.append('slug', slug);
    if (branch) params.append('branch', branch);
    if (status) params.append('status', status);
    params.append('page', page.toString());
    params.append('pageSize', pageSize.toString());

    // 发起网络请求更新缓存
    const response = await fetch(`${import.meta.env.VITE_CNBCOOKIE_API_URL}/workspace/list?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_CNBCOOKIE}`,
        'session': session
      }
    });

    if (response.ok) {
      const data = await response.json();
      const workspaces = data.list || [];

      if (workspaces.length > 0) {
        await saveUserWorkspaces(workspaces);
        console.log('后台静默更新缓存成功');
      }
    }
  } catch (error) {
    console.warn('后台静默更新缓存失败:', error);
  }
};

/**
 * 格式化工作空间数据用于UI显示
 * @param {Array} workspaces - 原始工作空间数据
 * @returns {Array} 格式化后的工作空间数据
 */
export const formatWorkspacesForDisplay = (workspaces) => {
  return workspaces.map(workspace => ({
    id: workspace.pipeline_id || `${workspace.sn}-${workspace.create_time}`,
    pipelineId: workspace.pipeline_id,
    sn: workspace.sn,
    userName: workspace.user_name,
    slug: workspace.slug,
    repoId: workspace.repo_id,
    branch: workspace.branch,
    workspacePath: workspace.workspace,
    status: workspace.status,
    createTime: workspace.create_time,
    duration: workspace.duration,
    repoUrl: workspace.repo_url,
    fileCount: workspace.file_count || 0,
    fileList: workspace.file_list || [],
    stashCount: workspace.stash_count || 0,
    commitCount: workspace.commit_count || 0,
    remoteStashCount: workspace.remote_stash_count || 0,
    latestSha: workspace.latest_sha,
    restoreId: workspace.restore_id,
    businessId: workspace.business_id,
    singleStash: workspace.single_stash || 0,
    isPreview: workspace.is_preview || 0,
    ssh: workspace.ssh || false,
    jetbrainsList: workspace.jetbrainsList || []
  }));
};

/**
 * 格式化持续时间显示
 * @param {number} seconds - 持续时间（秒）
 * @returns {string} 格式化后的持续时间
 */
export const formatDuration = (seconds) => {
  if (!seconds) return '0秒';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}小时${minutes}分${secs}秒`;
  } else if (minutes > 0) {
    return `${minutes}分${secs}秒`;
  } else {
    return `${secs}秒`;
  }
};

/**
 * 获取状态对应的中文描述和颜色
 * @param {string} status - 工作空间状态
 * @returns {Object} 状态描述和颜色
 */
export const getStatusInfo = (status) => {
  const statusMap = {
    'running': { label: '运行中', color: 'bg-green-100 text-green-800' },
    'closed': { label: '已关闭', color: 'bg-gray-100 text-gray-800' },
    'pending': { label: '等待中', color: 'bg-yellow-100 text-yellow-800' },
    'failed': { label: '失败', color: 'bg-red-100 text-red-800' },
    'starting': { label: '启动中', color: 'bg-blue-100 text-blue-800' },
    'stopping': { label: '停止中', color: 'bg-orange-100 text-orange-800' }
  };

  return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
};
