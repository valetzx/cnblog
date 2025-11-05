import { useState, useEffect } from 'react';

// 历史数据存储键名
const HISTORY_STORAGE_KEY = 'aiBattleHistory';

/**
 * 保存AI回答到历史记录
 * @param {Object} aiResponse - AI响应对象
 * @param {string} side - 阵营：'pro' 或 'con'
 * @param {string} roleName - 角色名称
 * @returns {Promise<void>}
 */
export async function saveAIResponse(aiResponse, side, roleName) {
  try {
    // 获取现有历史记录
    const existingHistory = getHistory();

    // 创建新的历史记录项
    const newEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      side,
      roleName,
      content: aiResponse.content,
      time_taken: aiResponse.time_taken
    };

    // 添加到历史记录
    const updatedHistory = [...existingHistory, newEntry];

    // 保存到本地存储
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));

  } catch (error) {
    console.error('保存AI回答失败:', error);
    throw error;
  }
}

/**
 * 获取所有历史记录
 * @returns {Array} 历史记录数组
 */
export function getHistory() {
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('获取历史记录失败:', error);
    return [];
  }
}

/**
 * 清空历史记录
 */
export function clearHistory() {
  localStorage.removeItem(HISTORY_STORAGE_KEY);
}

/**
 * 获取特定格式的历史记录
 * @returns {Array} 格式化的历史记录数组
 */
export function getFormattedHistory() {
  const history = getHistory();

  if (history.length === 0) {
    return [];
  }

  // 按照写入顺序构建JSON数据，并添加历史序号
  const formattedHistory = history.map((entry, index) => {
    if (entry.side === 'pro') {
      return {
        "历史": index + 1,
        "正方": entry.roleName,
        "发言": entry.content
      };
    } else if (entry.side === 'con') {
      return {
        "历史": index + 1,
        "反方": entry.roleName,
        "发言": entry.content
      };
    }
    return null;
  }).filter(Boolean);

  return formattedHistory;
}

export default {
  saveAIResponse,
  getHistory,
  clearHistory,
  getFormattedHistory
};
