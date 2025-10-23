// 导入indexedDB工具函数
import {
  saveUserTodoIssues,
  getUserTodoIssuesFromCache,
  getCacheMetadata
} from './indexedDB';

// 导入存储参数工具
import { getStoragePaginationParams } from './storageParams';

/**
 * 获取用户待办事项（issue列表），支持缓存优先策略
 * @param {Object} options - 请求选项
 * @param {string} options.todoStatus - 待办状态，默认为 'pending'
 * @param {number} options.page - 页码，默认为 1
 * @param {number} options.pageSize - 每页数量，默认为 20
 * @param {boolean} options.forceRefresh - 是否强制刷新，默认为 false
 * @returns {Promise<Array>} 用户待办的issue列表
 */
export const getUserTodoIssues = async ({
  todoStatus = 'pending',
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
        const cachedData = await getUserTodoIssuesFromCache(todoStatus, page, pageSize);
        if (cachedData.issues.length > 0) {
          console.log('从缓存获取用户待办事项成功');

          // 异步发起网络请求更新缓存
          fetchAndUpdateCache({ todoStatus, page, pageSize, session }).catch(error => {
            console.warn('后台更新缓存失败:', error);
          });

          return cachedData.issues;
        }
      } catch (cacheError) {
        console.warn('从缓存获取数据失败，尝试网络请求:', cacheError);
      }
    }

    // 从网络获取数据
    const response = await fetch(`${import.meta.env.VITE_CNBCOOKIE_API_URL}/user/dashboard/todo/issue?todoStatus=${todoStatus}&page=${page}&page_size=${pageSize}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_CNBCOOKIE}`,
        'Accept': 'application/vnd.cnb.web+json',
        'session': session
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const issues = data.issue_datas || [];

    // 保存到缓存
    if (issues.length > 0) {
      try {
        await saveUserTodoIssues(issues, todoStatus);
        console.log('用户待办事项已保存到缓存');
      } catch (saveError) {
        console.warn('保存到缓存失败:', saveError);
      }
    }

    return issues;
  } catch (error) {
    console.error('获取用户待办事项失败:', error);

    // 如果网络请求失败，尝试从缓存获取数据
    try {
      const cachedData = await getUserTodoIssuesFromCache(todoStatus, page, pageSize);
      if (cachedData.issues.length > 0) {
        console.log('网络请求失败，使用缓存数据');
        return cachedData.issues;
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
const fetchAndUpdateCache = async ({ todoStatus, page, pageSize, session }) => {
  try {
    // 检查缓存是否需要更新（比如超过一定时间）
    const metadata = await getCacheMetadata(`user_todo_${todoStatus}`);
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
    const response = await fetch(`${import.meta.env.VITE_CNBCOOKIE_API_URL}/user/dashboard/todo/issue?todoStatus=${todoStatus}&page=${page}&page_size=${pageSize}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_CNBCOOKIE}`,
        'Accept': 'application/vnd.cnb.web+json',
        'session': session
      }
    });

    if (response.ok) {
      const data = await response.json();
      const issues = data.issue_datas || [];

      if (issues.length > 0) {
        await saveUserTodoIssues(issues, todoStatus);
        console.log('后台静默更新缓存成功');
      }
    }
  } catch (error) {
    console.warn('后台静默更新缓存失败:', error);
  }
};

/**
 * 格式化issue数据用于UI显示
 * @param {Array} issues - 原始issue数据
 * @returns {Array} 格式化后的issue数据
 */
export const formatIssuesForDisplay = (issues) => {
  return issues.map(issue => ({
    id: issue.todo_id || `${issue.slug}-${issue.number}`,
    title: issue.title,
    slug: issue.slug,
    number: issue.number,
    creator: issue.creator ? issue.creator.nickname || issue.creator.username : '未知用户',
    createdTime: issue.created_time,
    updatedTime: issue.updated_time,
    state: issue.state,
    labels: issue.labels || [],
    commentCount: issue.comment_count || 0,
    pinned: issue.pinned || false
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
