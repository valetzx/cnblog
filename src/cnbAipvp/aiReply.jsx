import React, { useState, useEffect } from 'react';
import { getFormattedHistory } from './historyData';
import { getRoleDetail } from './loadRoles';
import { saveAIResponse } from './historyData';

// 获取角色分配信息的辅助函数
function getRoleAssignment() {
  try {
    const assignmentStr = localStorage.getItem('assignRoles');
    if (!assignmentStr) return null;

    // 解析JSON数组格式
    const roles = JSON.parse(assignmentStr);

    // 分离正方和反方角色
    const proSide = roles.filter(role => role.side === 'pro');
    const conSide = roles.filter(role => role.side === 'con');

    return {
      proSide,
      conSide
    };
  } catch (error) {
    console.error('解析角色分配信息失败:', error);
    return null;
  }
}

// 获取知识库内容的辅助函数
function getKnowledgeBase() {
  try {
    return localStorage.getItem('battleQuery') || '';
  } catch (error) {
    console.error('获取知识库内容失败:', error);
    return '';
  }
}

// 获取角色发言风格的辅助函数
async function getRoleStyles(roleNames, side) {
  try {
    const styles = [];
    for (const roleName of roleNames) {
      try {
        const roleDetail = await getRoleDetail(roleName, 'wss/knowledge/battle');
        styles.push({
          name: roleName,
          style: roleDetail.prompt || '以专业、理性的方式进行辩论'
        });
      } catch (error) {
        styles.push({
          name: roleName,
          style: '以专业、理性的方式进行辩论'
        });
      }
    }
    return styles;
  } catch (error) {
    console.error('获取角色风格失败:', error);
    return roleNames.map(name => ({
      name,
      style: '以专业、理性的方式进行辩论'
    }));
  }
}

// 构建BATTLE_PROMPT的主函数
async function buildBattlePrompt(userTopic, previousOutput = '', roleName = '', side = '', rolePrompt = '') {
  // 1. 获取角色分配信息
  const assignmentStr = localStorage.getItem('assignRoles');
  if (!assignmentStr) {
    throw new Error('未找到角色分配信息，请先分配角色');
  }

  // 2. 获取知识库内容
  const knowledgeBase = getKnowledgeBase();

  // 3. 获取历史发言
  const history = getFormattedHistory();

  // 4. 获取当前发言角色的风格 - 直接使用传入的rolePrompt
  let currentRoleStyle = '以专业、理性的方式进行辩论';
  if (rolePrompt) {
    currentRoleStyle = rolePrompt;
  } else if (roleName) {
    // 如果没有传入rolePrompt，但传入了roleName，尝试从本地存储获取
    try {
      const roles = JSON.parse(assignmentStr);
      const currentRole = roles.find(role => role.name === roleName);
      if (currentRole && currentRole.prompt) {
        currentRoleStyle = currentRole.prompt;
      }
    } catch (error) {
      console.warn(`从本地存储获取角色 ${roleName} 风格失败:`, error);
    }
  }

  // 5. 构建提示词
  const roles = JSON.parse(assignmentStr);
  const formattedRoles = roles.map(role =>
    `角色 ${role.part} (${role.side === 'pro' ? '正方' : '反方'}): ${role.name}\n`
  ).join('\n\n');

  const prompt = `
[场景]=
正在进行一个辩论赛，需要对"${userTopic}"观点，进行讨论。讨论分为正方和反方，正方支持"${userTopic}"，反方不支持"${userTopic}"观点。你作为“${roleName}”，发表你的看法

[角色阵营]=
${formattedRoles}

[知识库]=
${knowledgeBase}

[历史发言]=
${history.length > 0 ? JSON.stringify(history, null, 2) : '暂无历史发言，这是第一轮辩论'}

[当前发言角色]=
${roleName ? `${roleName} (${side === 'pro' ? '正方' : '反方'})` : '未知角色'}

[角色设定]=
${currentRoleStyle}

[问题]=
他们说：${previousOutput ? previousOutput : `你支持 ${userTopic} 吗？`}，你作为“${roleName}”你觉得呢？

请根据以上信息，以你现在的角色身份进行辩论发言。发言应该：
1. 严格遵守角色设定中的发言风格和要求，只发表自己的观点
2. 正方必须支持辩论观点，反方则不支持"${userTopic}"观点
3. 完全按照角色设定中的格式要求输出内容，不要输出别的角色的原文！
4. 回应历史发言中的论点
5. 文字简短（200字以下）简练有条理

`;

  return prompt;
}
/**
 * AI辩论发言函数
 * @param {string} userTopic - 用户输入的辩论主题
 * @param {string} previousOutput - 上一次AI的输出内容
 * @param {string} roleName - 当前发言的角色名称
 * @param {string} side - 阵营：'pro' 或 'con'
 * @param {string} rolePrompt - 角色提示信息
 * @returns {Promise<{content: string, time_taken: number}>} 返回AI响应结果
 */
async function aiBattleReply(userTopic, previousOutput = '', roleName = '', side = '', rolePrompt = '') {
  const startTime = Date.now();

  try {
    // 构建辩论提示词
    const prompt = await buildBattlePrompt(userTopic, previousOutput, roleName, side, rolePrompt);
    const apiUrl = `${import.meta.env.VITE_CNBCOOKIE_API_URL}/ai/chat/completions`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_CNBCOOKIE}`,
        'Accept': 'application/vnd.cnb.web+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'hunyuan-a13b',
        stream: true,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // 处理流式输出
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let content = '';
    let buffer = ''; // 添加缓冲区来处理不完整的JSON

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      buffer += chunk; // 将数据添加到缓冲区

      const lines = buffer.split('\n').filter(line => line.trim());
      buffer = lines.pop() || ''; // 保留最后一行不完整的数据

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.substring(6);

          if (data === '[DONE]') {
            break;
          }

          try {
            // 检查是否是完整的JSON
            if (data.trim() && isCompleteJSON(data)) {
              const parsed = JSON.parse(data);

              if (parsed.choices && parsed.choices[0].delta) {
                const delta = parsed.choices[0].delta;
                if (delta.content) {
                  content += delta.content;
                }
              }
            }
          } catch (e) {
            console.warn('Failed to parse JSON:', e, 'Data:', data);
          }
        }
      }
    }

    // 处理缓冲区中剩余的数据
    if (buffer.trim()) {
      try {
        const data = buffer.replace('data: ', '').trim();
        if (data && data !== '[DONE]' && isCompleteJSON(data)) {
          const parsed = JSON.parse(data);
          if (parsed.choices && parsed.choices[0].delta && parsed.choices[0].delta.content) {
            content += parsed.choices[0].delta.content;
          }
        }
      } catch (e) {
        console.warn('Failed to parse remaining buffer:', e);
      }
    }

    const endTime = Date.now();
    const time_taken = endTime - startTime;

    const result = {
      content: content.trim(),
      time_taken
    };

    // 保存到历史记录
    await saveAIResponse(result, side, roleName);

    return result;

  } catch (error) {
    console.error('AI Battle Reply Error:', error);
    throw error;
  }
}

/**
 * AI总结函数（保留原有功能）
 * @param {string} prompt - 提示词内容
 * @returns {Promise<{content: string, time_taken: number}>} 返回AI响应结果
 */
async function aiReply(prompt = BATTLE_PROMPT) {
  const startTime = Date.now();

  try {
    const apiUrl = `${import.meta.env.VITE_CNBCOOKIE_API_URL}/ai/chat/completions`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_CNBCOOKIE}`,
        'Accept': 'application/vnd.cnb.web+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'hunyuan-a13b',
        stream: true,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // 处理流式输出
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let content = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.substring(6);

          if (data === '[DONE]') {
            break;
          }

          try {
            const parsed = JSON.parse(data);

            if (parsed.choices && parsed.choices[0].delta) {
              const delta = parsed.choices[0].delta;

              if (delta.content) {
                content += delta.content;
              }
            }
          } catch (e) {
            console.warn('Failed to parse JSON:', e, 'Data:', data);
          }
        }
      }
    }

    const endTime = Date.now();
    const time_taken = endTime - startTime;

    return {
      content: content.trim(),
      time_taken
    };

  } catch (error) {
    console.error('AI Reply Error:', error);
    throw error;
  }
}

export default aiReply;
export { aiBattleReply, buildBattlePrompt };

// 检查是否是完整的JSON
function isCompleteJSON(data) {
  try {
    JSON.parse(data);
    return true;
  } catch (e) {
    return false;
  }
}
