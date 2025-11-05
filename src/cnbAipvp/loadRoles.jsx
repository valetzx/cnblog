import { parse } from 'yaml';

// 默认头像路径
const DEFAULT_AVATAR = '/favicon.png';
const GIT_TREE_VERSION = 'main';
/**
 * 加载角色配置
 * @param {string} rolePool - 角色池路径，默认为 'wss/knowledge/battle'
 * @returns {Promise<Array>} 角色配置数组
 */
export async function loadRoles(rolePool = 'wss/knowledge/battle') {
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

            return {
              id: roleId,
              name: roleData.name || roleId,
              avatar: avatar,
              prompt: roleData.prompt || '',
              filename: filename
            };
          }

          return null;
        } catch (error) {
          console.warn(`解析角色 ${roleId} 配置失败:`, error);
          return null;
        }
      })
    );

    // 4. 过滤掉失败的角色加载
    return roles.filter(role => role !== null);
        
  } catch (error) {
    console.error('加载角色失败:', error);
    throw error;
  }
}

/**
 * 获取单个角色的详细配置
 * @param {string} roleId - 角色ID
 * @param {string} rolePool - 角色池路径
 * @returns {Promise<Object>} 角色详细配置
 */
export async function getRoleDetail(roleId, rolePool = 'wss/knowledge/battle') {
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

      return {
        id: roleId,
        name: roleData.name || roleId,
        avatar: avatar,
        prompt: roleData.prompt || '',
        ...roleData
      };
    }

    throw new Error(`角色 ${roleId} 配置格式错误`);

  } catch (error) {
    console.error(`获取角色 ${roleId} 详细配置失败:`, error);
    throw error;
  }
}

// 默认导出主函数
export default loadRoles;
