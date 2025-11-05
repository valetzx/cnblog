import React, { useState, useEffect } from 'react';

const DEFAULT_PROMPT = `请根据以下内容提供详细的总结和分析：`;

/**
 * AI总结函数
 * @param {string} prompt - 提示词内容
 * @returns {Promise<{content: string, reasoning_content: string, time_taken: number}>} 返回AI响应结果
 */
async function aiSummary(prompt = DEFAULT_PROMPT) {
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
    let reasoning_content = '';

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

              // 收集思考内容
              if (parsed.search_info && parsed.search_info.mindmap) {
                reasoning_content += JSON.stringify(parsed.search_info.mindmap) + ' ';
              }

              // 处理自定义信息
              if (parsed.customized_info) {
                reasoning_content += parsed.customized_info + ' ';
              }

              // 处理过程信息
              if (parsed.processes) {
                reasoning_content += JSON.stringify(parsed.processes) + ' ';
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
      reasoning_content: reasoning_content.trim(),
      time_taken
    };

  } catch (error) {
    console.error('AI Summary Error:', error);
    throw error;
  }
}

export default aiSummary;
