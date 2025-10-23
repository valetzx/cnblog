import { missionDB } from './indexedDB';

// 创建统一的请求头
const createHeaders = (session) => {
  const headers = {
    'Authorization': `Bearer ${import.meta.env.VITE_CNBCOOKIE}`,
    'Accept': 'application/vnd.cnb.web+json'
  };

  // 只有在有session时才添加session头
  if (session) {
    headers['session'] = session;
  }

  return headers;
};

// 获取看板标签列表
export const getMissionTags = async (missionPath, session) => {
  try {
    // 首先检查本地存储
    const cachedTags = await missionDB.getMissionTags(missionPath);
    if (cachedTags) {
      return cachedTags;
    }

    // 从API获取
    const headers = createHeaders(session);
    // 为POST请求添加Content-Type头
    headers['Content-Type'] = 'application/json';

    const response = await fetch(
      `${import.meta.env.VITE_CNBCOOKIE_API_URL}/${missionPath}/-/mission/view-list`,
      {
        method: 'GET',
        headers: headers
      }
    );

    if (!response.ok) {
      throw new Error(`获取看板标签失败: ${response.status}`);
    }

    const data = await response.json();
    console.log('API response data:', data);

    // 确保返回的是数组
    let tags = [];
    if (Array.isArray(data)) {
      tags = data;
    } else if (data && Array.isArray(data.views)) {
      tags = data.views;
    } else if (data && Array.isArray(data.data)) {
      tags = data.data;
    } else if (data && typeof data === 'object') {
      // 处理对象格式的数据，如 {"0": {...}, "1": {...}, ...}
      tags = Object.values(data).filter(item => item && typeof item === 'object' && !Array.isArray(item));
    } else {
      console.warn('Unexpected API response format:', data);
      tags = [];
    }

    // 存储到indexedDB
    await missionDB.storeMissionTags(missionPath, tags);

    return tags;
  } catch (error) {
    console.error('获取看板标签错误:', error);
    throw error;
  }
};

// 获取看板配置
export const getMissionConfig = async (missionPath, uuid, type, session) => {
  try {
    // 首先检查本地存储
    const cachedConfig = await missionDB.getMissionConfig(missionPath, uuid);
    if (cachedConfig) {
      return cachedConfig;
    }

    // 从API获取
    const headers = createHeaders(session);
    // 为POST请求添加Content-Type头
    headers['Content-Type'] = 'application/json';

    const response = await fetch(
      `${import.meta.env.VITE_CNBCOOKIE_API_URL}/${missionPath}/-/mission/view?id=${uuid}&viewType=${type}`,
      {
        method: 'GET',
        headers: headers
      }
    );

    if (!response.ok) {
      throw new Error(`获取看板配置失败: ${response.status}`);
    }

    const config = await response.json();

    // 存储到indexedDB
    await missionDB.storeMissionConfig(missionPath, uuid, config);

    return config;
  } catch (error) {
    console.error('获取看板配置错误:', error);
    throw error;
  }
};

// 获取字段配置
export const getFieldConfigs = async (missionPath, session) => {
  try {
    // 首先检查本地存储
    const cachedFieldConfigs = await missionDB.getFieldConfigs(missionPath);
    if (cachedFieldConfigs) {
      return cachedFieldConfigs;
    }

    // 从API获取
    const headers = createHeaders(session);
    // 为POST请求添加Content-Type头
    headers['Content-Type'] = 'application/json';

    const response = await fetch(
      `${import.meta.env.VITE_CNBCOOKIE_API_URL}/${missionPath}/-/mission-resource/fields?type=issues`,
      {
        method: 'GET',
        headers: headers
      }
    );

    if (!response.ok) {
      throw new Error(`获取字段配置失败: ${response.status}`);
    }

    const fieldConfigs = await response.json();

    // 存储到indexedDB
    await missionDB.storeFieldConfigs(missionPath, fieldConfigs);

    return fieldConfigs;
  } catch (error) {
    console.error('获取字段配置错误:', error);
    throw error;
  }
};

// 获取看板数据
export const getMissionData = async (missionPath, uuid, selectors, session) => {
  try {
    // 首先检查本地存储
    const cachedData = await missionDB.getMissionData(missionPath, uuid);
    if (cachedData) {
      return cachedData;
    }

    // 从API获取
    const headers = createHeaders(session);
    // 为POST请求添加Content-Type头
    headers['Content-Type'] = 'application/json';

    // 使用传入的selectors参数构建请求体
    const requestBody = {
      slugName: missionPath,
      selectors: selectors || [
        {
          field: "resource_type",
          operator: "contains",
          value: ["issues"]
        },
        {
          field: "state",
          operator: "equals",
          value: []
        },
        {
          field: "last_acted_at",
          operator: "equals",
          value: ["2025-09-20", "2025-10-20"]
        }
      ]
    };

    const response = await fetch(
      `${import.meta.env.VITE_CNBCOOKIE_API_URL}/${missionPath}/-/mission-resource/resources`,
      {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      throw new Error(`获取看板数据失败: ${response.status}`);
    }

    const data = await response.json();

    // 存储到indexedDB
    await missionDB.storeMissionData(missionPath, uuid, data);

    return data;
  } catch (error) {
    console.error('获取看板数据错误:', error);
    throw error;
  }
};

// 获取所有看板数据（一次性获取所有需要的数据）
export const getAllMissionData = async (missionPath, uuid, type, selectors, session) => {
  try {
    const [tags, config, fieldConfigs, data] = await Promise.all([
      getMissionTags(missionPath, session),
      getMissionConfig(missionPath, uuid, type, session),
      getFieldConfigs(missionPath, session),
      getMissionData(missionPath, uuid, selectors, session)
    ]);

    return {
      tags,
      config,
      fieldConfigs,
      data
    };
  } catch (error) {
    console.error('获取所有看板数据错误:', error);
    throw error;
  }
};
