import { useState, useEffect } from 'react';
import { loadRoles, getRoleDetail } from './loadRoles';

/**
 * 分配正反方角色
 * @param {string} mode - 分配模式：'random' 随机分配，'select' 用户选择
 * @param {Array} selectedRoles - 用户选择的角色ID数组（仅在select模式使用）
 * @param {string} rolePool - 角色池路径
 * @returns {Promise<Object>} 分配结果，包含正方和反方角色列表
 */
export async function assignRoles(mode = 'random', selectedRoles = [], rolePool = 'wss/knowledge/battle') {
  try {
    // 1. 加载所有可用角色
    const allRoles = await loadRoles(rolePool);

    if (allRoles.length < 10) {
      throw new Error(`可用角色数量不足，需要至少10个角色，当前只有 ${allRoles.length} 个`);
    }

    let proSide = [];
    let conSide = [];

    if (mode === 'random') {
      // 2. 随机分配模式
      const shuffledRoles = [...allRoles].sort(() => Math.random() - 0.5);

      // 前5个作为正方，后5个作为反方
      proSide = shuffledRoles.slice(0, 5);
      conSide = shuffledRoles.slice(5, 10);

    } else if (mode === 'select' && selectedRoles.length === 10) {
      // 3. 用户选择模式
      const selectedRoleDetails = await Promise.all(
        selectedRoles.map(roleId => getRoleDetail(roleId, rolePool))
      );

      // 前5个作为正方，后5个作为反方
      proSide = selectedRoleDetails.slice(0, 5);
      conSide = selectedRoleDetails.slice(5, 10);

    } else {
      throw new Error('无效的分配模式或选择的角色数量不正确');
    }

    // 4. 返回分配结果
    return {
      proSide: proSide.map(role => ({
        id: role.id,
        name: role.name,
        avatar: role.avatar,
        prompt: role.prompt,
        side: 'pro'
      })),
      conSide: conSide.map(role => ({
        id: role.id,
        name: role.name,
        avatar: role.avatar,
        prompt: role.prompt,
        side: 'con'
      })),
      allRoles: allRoles // 返回所有可用角色用于选择器
    };

  } catch (error) {
    console.error('分配角色失败:', error);
    throw error;
  }
}

/**
 * React Hook for 角色分配
 * @param {string} rolePool - 角色池路径
 * @returns {Object} 角色分配状态和方法
 */
export function useRoleAssignment(rolePool = 'wss/knowledge/battle') {
  const [roles, setRoles] = useState([]);
  const [assignedRoles, setAssignedRoles] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 加载所有角色
  useEffect(() => {
    const loadAllRoles = async () => {
      try {
        setLoading(true);
        const allRoles = await loadRoles(rolePool);
        setRoles(allRoles);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadAllRoles();
  }, [rolePool]);

  // 分配角色方法
  const assign = async (mode = 'random', selectedRoles = []) => {
    try {
      setLoading(true);
      const result = await assignRoles(mode, selectedRoles, rolePool);
      setAssignedRoles(result);
      setError(null);

      // 保存到本地存储
      localStorage.setItem('assignRoles', JSON.stringify(formatAssignment(result)));

      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    roles,
    assignedRoles,
    loading,
    error,
    assign,
    reset: () => setAssignedRoles(null)
  };
}

/**
 * 格式化输出角色分配结果
 * @param {Object} assignment - 分配结果
 * @returns {Array} 格式化数组，包含所有角色的详细信息
 */
export function formatAssignment(assignment) {
  if (!assignment) return [];
  const proRoles = assignment.proSide.map((role, index) => ({
    part: index + 1,
    side: 'pro',
    name: role.name,
    avatar: role.avatar,
    prompt: role.prompt
  }));

  const conRoles = assignment.conSide.map((role, index) => ({
    part: index + 6,
    side: 'con',
    name: role.name,
    avatar: role.avatar,
    prompt: role.prompt
  }));

  return [...proRoles, ...conRoles];
}

export default assignRoles;
