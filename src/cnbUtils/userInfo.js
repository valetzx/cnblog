// 从API获取用户信息
export const getUserInfoFromAPI = async (username) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_CNBCOOKIE_API_URL}/users/${username}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_CNBCOOKIE}`,
        'Accept': 'application/vnd.cnb.web+json'
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const userData = await response.json();
    return userData;
  } catch (error) {
    console.error('从API获取用户信息失败:', error);
    throw error;
  }
};

// 格式化API返回的用户数据
export const formatUserInfoFromAPI = (apiData) => {
  if (!apiData) return null;

  return {
    username: apiData.username || 'currentUser',
    avatar: apiData.avatar_url || `https://cnb.cool/users/${apiData.username}/avatar/s`,
    name: apiData.nickname || apiData.username,
    bio: apiData.bio || '暂无简介',
    followers: apiData.follower_count || 0,
    following: apiData.follow_count || 0,
    repositories: apiData.repo_count || 0,
    stars: apiData.stars_count || 0,
    site: apiData.site || '',
    joined: apiData.created_at || '',
    missions: apiData.mission_count || 0,
    registries: apiData.registry_count || 0,
    groups: apiData.group_count || 0,
    location: apiData.location || '',
    company: apiData.company || '',
    email: apiData.email || '',
    // 原始数据用于其他用途
    rawData: apiData
  };
};
