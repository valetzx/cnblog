import { saveUserCodeActivities, getUserCodeActivitiesFromCache } from './indexedDB';

// 获取用户代码活动
export const getUserCodeActivities = async (username, date = null) => {
  try {
    // 首先尝试从缓存获取
    const cachedData = await getUserCodeActivitiesFromCache(username, date);
    if (cachedData) {
      return cachedData.activities;
    }

    // 如果没有缓存数据，从API获取
    const currentDate = date || new Date().toISOString().slice(0, 7).replace(/-/g, ''); 
    const apiUrl = `${import.meta.env.VITE_CNBCOOKIE_API_URL}/users/${username}/activities?date=${currentDate}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_CNBCOOKIE}`,
        'Accept': 'application/vnd.cnb.web+json',
      }
    });

    if (!response.ok) {
      throw new Error(`获取代码活动失败: ${response.status} ${response.statusText}`);
    }

    const activitiesData = await response.json();

    // 保存到缓存
    await saveUserCodeActivities(activitiesData, username, currentDate);

    return activitiesData;
  } catch (error) {
    console.error('获取用户代码活动失败:', error);
    throw error;
  }
};

// 格式化代码活动数据用于显示
export const formatCodeActivitiesForDisplay = (activitiesData) => {
  if (!activitiesData) return null;

  const {
    repo_count = 0,
    group_count = 0,
    pull_request_count = 0,
    issues_count = 0,
    commit_count = 0,
    code_review_count = 0,
    private_score = 0,
    repos = [],
    commits = [],
    pull_requests = [],
    issues = []
  } = activitiesData;

  // 按创建时间排序仓库
  const sortedRepos = [...repos].sort((a, b) =>
    new Date(b.create_at || b.created_at) - new Date(a.create_at || a.created_at)
  );

  // 按提交次数排序提交记录
  const sortedCommits = [...commits].sort((a, b) => b.time - a.time);

  return {
    summary: {
      repo_count,
      group_count,
      pull_request_count,
      issues_count,
      commit_count,
      code_review_count,
      private_score
    },
    repos: sortedRepos,
    commits: sortedCommits,
    pull_requests,
    issues
  };
};

// 获取主要语言颜色（如果有）
export const getLanguageColor = (languages) => {
  if (!languages || typeof languages !== 'object') return '#6c757d';

  // 返回第一个语言的颜色，如果没有则返回默认颜色
  const firstLanguage = Object.keys(languages)[0];
  return languages[firstLanguage]?.color || '#6c757d';
};

// 格式化日期
export const formatActivityDate = (dateString) => {
  if (!dateString) return '';

  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// 获取仓库路径的显示名称
export const getRepoDisplayName = (repoPath) => {
  if (!repoPath) return '';
  const parts = repoPath.split('/');
  return parts.length > 1 ? parts[1] : repoPath;
};

// 生成时间线数据
export const generateTimelineData = (activitiesData) => {
  const formattedData = formatCodeActivitiesForDisplay(activitiesData);
  if (!formattedData) return [];

  const timeline = [];
  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString('zh-CN', { year: 'numeric', month: 'long' });

  // 添加提交统计
  if (formattedData.summary.commit_count > 0) {
    timeline.push({
      type: 'commit_summary',
      date: currentMonth,
      title: `提交了 ${formattedData.summary.commit_count} 次 代码`,
      data: formattedData.commits.slice(0, 5) // 显示前5个提交最多的仓库
    });
  }

  // 添加合并请求统计
  if (formattedData.summary.pull_request_count > 0) {
    timeline.push({
      type: 'pull_request_summary',
      date: currentMonth,
      title: `创建了 ${formattedData.summary.pull_request_count} 个 合并请求`,
      data: formattedData.pull_requests.slice(0, 5) // 显示前5个合并请求
    });
  }

  // 添加Issue统计
  if (formattedData.summary.issues_count > 0) {
    timeline.push({
      type: 'issue_summary',
      date: currentMonth,
      title: `创建了 ${formattedData.summary.issues_count} 个 ISSUE`,
      data: formattedData.issues.slice(0, 5) // 显示前5个Issue
    });
  }

  // 添加仓库创建记录
  if (formattedData.repos.length > 0) {
    timeline.push({
      type: 'repo_creation',
      date: currentMonth,
      title: `创建了 ${formattedData.repos.length} 个 代码仓库`,
      data: formattedData.repos.slice(0, 10) // 显示前10个最新创建的仓库
    });
  }

  // 添加具体的提交记录
  if (formattedData.commits && Array.isArray(formattedData.commits)) {
    formattedData.commits.forEach(commit => {
      if (commit.time > 0 && commit.detail?.path) {
        timeline.push({
          type: 'commit_detail',
          date: currentMonth,
          title: `${commit.detail.path} ${commit.time}次 提交`,
          repoPath: commit.detail.path,
          commitCount: commit.time
        });
      }
    });
  }

  // 添加具体的合并请求记录
  if (formattedData.pull_requests && Array.isArray(formattedData.pull_requests)) {
    formattedData.pull_requests.forEach(pr => {
      if (pr.time > 0 && pr.detail?.path) {
        timeline.push({
          type: 'pull_request_detail',
          date: currentMonth,
          title: `${pr.detail.path} ${pr.time}个 合并请求`,
          repoPath: pr.detail.path,
          prCount: pr.time
        });
      }
    });
  }

  // 添加具体的Issue记录
  if (formattedData.issues && Array.isArray(formattedData.issues)) {
    formattedData.issues.forEach(issue => {
      if (issue.time > 0 && issue.detail?.path) {
        timeline.push({
          type: 'issue_detail',
          date: currentMonth,
          title: `${issue.detail.path} ${issue.time}个 ISSUE`,
          repoPath: issue.detail.path,
          issueCount: issue.time
        });
      }
    });
  }

  // 添加具体的仓库创建记录
  if (formattedData.repos && Array.isArray(formattedData.repos)) {
    formattedData.repos.forEach(repo => {
      if (repo.detail?.path) {
        timeline.push({
          type: 'repo_detail',
          date: formatActivityDate(repo.create_at || repo.created_at),
          title: `创建仓库 ${repo.detail.path}`,
          repoPath: repo.detail.path,
          repoName: repo.detail.name,
          description: repo.detail.description
        });
      }
    });
  }

  // 按日期排序时间线
  const sortedTimeline = timeline.sort((a, b) => {
    // 让汇总信息显示在前面
    if (a.type.includes('summary') || a.type.includes('creation')) return -1;
    if (b.type.includes('summary') || b.type.includes('creation')) return 1;

    // 其他按日期排序
    return new Date(b.date) - new Date(a.date);
  });

  // 过滤掉非汇总信息和非创建信息的条目
  return sortedTimeline.filter(item =>
    item.type.includes('summary') || item.type.includes('creation')
  );
};
