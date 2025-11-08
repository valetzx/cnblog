import { parse } from 'yaml';
import { roleDB } from './indexedDB';

// 默认头像路径
const DEFAULT_AVATAR = '/favicon.png';
const GIT_TREE_VERSION = 'main';
const CACHE_TTL = 30 * 60 * 1000; // 30分钟缓存时间

/**
 * 从网络加载角色配置
 */
async function loadRolesFromNetwork(rolePool = 'wss/knowledge/battle') {
  try {
    // 1. 获取角色配置列表
    const apiUrl = `${import.meta.env.VITE_CNBCOOKIE_API_URL}/${rolePool}/-/git/tree-info/${GIT_TREE_VERSION}/pvp`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_CNBCOOKIE}`,
        'Accept': 'application/vnd.cnb.web+json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`获取角色列表失败: ${response.status} ${response.statusText}`);
    }

    const treeData = await response.json();

    // 2. 提取角色文件名
    const roleFiles = treeData.entries
      .filter(entry => entry.name.endsWith('.yml'))
      .map(entry => ({
        filename: entry.name,
        roleId: entry.name.replace('.yml', '')
      }));

    // 3. 并行获取每个角色的详细配置
    const roles = await Promise.all(
      roleFiles.map(async ({ filename, roleId }) => {
        try {
          const roleUrl = `${import.meta.env.VITE_CNBCOOKIE_API_URL}/${rolePool}/-/git/raw/main/pvp/${filename}`;
          const roleResponse = await fetch(roleUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_CNBCOOKIE}`,
              'Accept': 'application/vnd.cnb.web+json',
            },
          });

          if (!roleResponse.ok) {
            console.warn(`获取角色 ${roleId} 配置失败: ${roleResponse.status}`);
            return null;
          }

          const yamlContent = await roleResponse.text();
          const roleConfig = parse(yamlContent);

          if (Array.isArray(roleConfig) && roleConfig.length > 0) {
            const roleData = roleConfig[0];
            // 使用默认头像如果头像为空
            const avatar = roleData.avatar?.src || DEFAULT_AVATAR;

            const role = {
              id: roleId,
              name: roleData.name || roleId,
              avatar: avatar,
              prompt: roleData.prompt || '',
              filename: filename
            };

            // 缓存单个角色
            try {
              await roleDB.setRole(role, CACHE_TTL);
            } catch (cacheError) {
              console.warn(`缓存角色 ${roleId} 失败:`, cacheError);
            }

            return role;
          }

          return null;
        } catch (error) {
          console.warn(`解析角色 ${roleId} 配置失败:`, error);
          return null;
        }
      })
    );

    // 4. 过滤掉失败的角色加载
    const validRoles = roles.filter(role => role !== null);
        
    // 缓存所有角色列表
    try {
      await roleDB.setMetadata('all_roles', {
        roles: validRoles,
        timestamp: Date.now(),
        expiresAt: Date.now() + CACHE_TTL
      });
    } catch (cacheError) {
      console.warn('缓存角色列表失败:', cacheError);
    }

    return validRoles;

  } catch (error) {
    console.error('从网络加载角色失败:', error);
    throw error;
  }
}

/**
 * 从缓存加载角色配置
 */
async function loadRolesFromCache() {
  try {
    // 检查缓存是否有效
    const metadata = await roleDB.getMetadata('all_roles');

    if (metadata && metadata.expiresAt > Date.now()) {
      console.log('从缓存加载角色数据');
      return metadata.roles;
    }

    // 缓存过期或不存在，尝试从单个角色缓存中重建
    const allCachedRoles = await roleDB.getAllRoles();
    if (allCachedRoles.length > 0) {
      console.log('从单个角色缓存重建角色列表');

      // 移除过期字段
      const roles = allCachedRoles.map(({ expiresAt, ...role }) => role);

      // 更新元数据
      await roleDB.setMetadata('all_roles', {
        roles,
        timestamp: Date.now(),
        expiresAt: Date.now() + CACHE_TTL
      });

      return roles;
    }

    return null;
  } catch (error) {
    console.warn('从缓存加载角色失败:', error);
    return null;
  }
}

/**
 * 加载角色配置
 * @param {string} rolePool - 角色池路径，默认为 'wss/knowledge/battle'
 * @param {boolean} forceRefresh - 是否强制刷新缓存
 * @returns {Promise<Array>} 角色配置数组
 */
export async function loadRoles(rolePool = 'wss/knowledge/battle', forceRefresh = false) {
  // 清除过期数据
  try {
    await roleDB.clearExpired();
  } catch (error) {
    console.warn('清除过期缓存数据失败:', error);
  }

  // 如果不强制刷新，先尝试从缓存加载
  if (!forceRefresh) {
    const cachedRoles = await loadRolesFromCache();
    if (cachedRoles) {
      return cachedRoles;
    }
  }

  // 缓存不存在或强制刷新，从网络加载
  console.log('从网络加载角色数据');
  return await loadRolesFromNetwork(rolePool);
}

/**
 * 获取单个角色的详细配置
 * @param {string} roleId - 角色ID
 * @param {string} rolePool - 角色池路径
 * @param {boolean} forceRefresh - 是否强制刷新缓存
 * @returns {Promise<Object>} 角色详细配置
 */
export async function getRoleDetail(roleId, rolePool = 'wss/knowledge/battle', forceRefresh = false) {
  // 如果不强制刷新，先尝试从缓存加载
  if (!forceRefresh) {
    try {
      const cachedRole = await roleDB.getRole(roleId);
      if (cachedRole) {
        console.log(`从缓存加载角色 ${roleId} 详细配置`);
        // 移除过期字段
        const { expiresAt, ...role } = cachedRole;
        return role;
      }
    } catch (error) {
      console.warn(`从缓存加载角色 ${roleId} 详细配置失败:`, error);
    }
  }

  // 缓存不存在或强制刷新，从网络加载
  try {
    const roleUrl = `${import.meta.env.VITE_CNBCOOKIE_API_URL}/${rolePool}/-/git/raw/main/pvp/${roleId}.yml`;

    const response = await fetch(roleUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_CNBCOOKIE}`,
        'Accept': 'application/vnd.cnb.web+json',
      },
    });

    if (!response.ok) {
      throw new Error(`获取角色 ${roleId} 详细配置失败: ${response.status}`);
    }

    const yamlContent = await response.text();
    const roleConfig = parse(yamlContent);
        
    if (Array.isArray(roleConfig) && roleConfig.length > 0) {
      const roleData = roleConfig[0];
      // 使用默认头像如果头像为空
      const avatar = roleData.avatar?.src || DEFAULT_AVATAR;

      const role = {
        id: roleId,
        name: roleData.name || roleId,
        avatar: avatar,
        prompt: roleData.prompt || '',
        ...roleData
      };

      // 缓存角色详细配置
      try {
        await roleDB.setRole(role, CACHE_TTL);
      } catch (cacheError) {
        console.warn(`缓存角色 ${roleId} 详细配置失败:`, cacheError);
      }

      return role;
    }

    throw new Error(`角色 ${roleId} 配置格式错误`);

  } catch (error) {
    console.error(`获取角色 ${roleId} 详细配置失败:`, error);
    throw error;
  }
}

// 默认导出主函数
export default loadRoles;
