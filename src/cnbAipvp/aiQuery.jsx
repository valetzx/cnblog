import React, { useState, useEffect } from 'react';

/** 使用方式
 * import { queryAiKnowledge } from './cnbAipvp/aiQuery';
 * const aiKnowledge = await queryAiKnowledge("仓库路径", "当前论题");
 */
// 独立的工具函数，可以在任何地方使用
export const processAiKnowledge = (queryData) => {
  if (!queryData || typeof queryData !== 'object') {
    return '';
  }

  // 过滤掉 _cookies 等元数据，只处理数字键的对象
  const chunks = Object.entries(queryData)
    .filter(([key]) => !isNaN(key)) // 只处理数字键
    .sort(([a], [b]) => parseInt(a) - parseInt(b)) // 按顺序排序
    .map(([, value]) => value.chunk) // 提取 chunk 内容
    .filter(chunk => chunk && typeof chunk === 'string'); // 过滤有效字符串

  // 将所有 chunk 内容连接起来
  const knowledgeContent = chunks.join('\n\n');
  if (knowledgeContent) {
    try {
      localStorage.setItem('battleQuery', knowledgeContent);
    } catch (error) {
      console.warn('无法保存到本地存储:', error);
    }
  }

  return knowledgeContent;
};

// 直接查询函数，可以在非 React 环境中使用
export const queryAiKnowledge = async (repopath, userTopic) => {
  if (!repopath || !userTopic) {
    throw new Error('缺少必要参数: repopath 或 userTopic');
  }

  try {
    const apiUrl = `${import.meta.env.VITE_CNBCOOKIE_API_URL}/${repopath}/-/knowledge/base/query`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_CNBCOOKIE}`,
        'Accept': 'application/vnd.cnb.web+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: userTopic })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return processAiKnowledge(result);

  } catch (error) {
    console.error('知识库查询失败:', error);
    throw error;
  }
};

// React Hook 方式（如果需要在 React 组件中使用）
export const useAiQuery = (repopath, userTopic) => {
  const [aiKnowledge, setAiKnowledge] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAiKnowledge = async () => {
      if (!repopath || !userTopic) return;

      setLoading(true);
      setError(null);

      try {
        const knowledge = await queryAiKnowledge(repopath, userTopic);
        setAiKnowledge(knowledge);

      } catch (err) {
        setError(err.message);
        console.error('知识库查询失败:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAiKnowledge();
  }, [repopath, userTopic]);

  return { aiKnowledge, loading, error };
};

// 默认导出主要查询函数
export default queryAiKnowledge;
