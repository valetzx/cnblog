import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import IdeasTop from '@/components/ideasTop';

const Ideas = () => {
  const cnbToken = localStorage.getItem('cnbToken') || import.meta.env.VITE_CNB_TOKEN; 
  const [messages, setMessages] = useState([
    {
      id: 1,
      content: '您好！我的数据库里有许多关于 CNB 的内容，尝试问问怎么迁移到 CNB 吧。',
      sender: 'ai',
      timestamp: new Date(Date.now() - 300000)
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollAreaRef = useRef(null);
  const [knowledgeRepo, setKnowledgeRepo] = useState('cnb/docs');
  const [useKnowledgeRepo, setUseKnowledgeRepo] = useState(true);
  const [preprompt, setPrePrompt] = useState('');

  // 处理聊天记录搜索
  const handleSearchHistory = (searchKey) => {
    // 模拟搜索逻辑
    console.log('搜索聊天记录:', searchKey);
  };

  // 处理预设提示词切换
  const handlePresetPrompt = (mode) => {
    switch (mode) {
  // 处理预设提示词切换
      case 'translate':
        setPrePrompt('检查我以下输入的文本，不管我发送什么都将执行，在中文与英文之间相互翻译，语言尽量简练：');
        setUseKnowledgeRepo(false);
        break;
      case 'diet':
        setPrePrompt('请作为我的健康饮食助手，根据以下输入提供营养建议或健康食谱：');
        setUseKnowledgeRepo(true);
        setKnowledgeRepo('valetzx/github/HowToCook');
        break;
      case 'explain':
        setPrePrompt('请用简单易懂的语言解释以下文字内容：');
        setUseKnowledgeRepo(false);
        break;
      case 'default':
        setPrePrompt('');
        setUseKnowledgeRepo(true);
        setKnowledgeRepo('cnb/docs');
        break;
      default:
        break;
    }
  };

  // 根据知识库类型和是否使用知识库生成初始对话文字
  const getInitialMessage = () => {
    if (!useKnowledgeRepo) {
      return '您好！当前未启用知识库搜索哦，当然也是可以与我对话的！';
    }
    
    switch (knowledgeRepo) {
      case 'cnb/docs':
        return '您好！我的数据库里有许多关于 CNB 的内容，尝试问问怎么迁移到 CNB 吧。';
      case 'examples/ecosystem/web-interview':
        return '您好！我是您的前端面试助手，我可以帮您准备面试问题、技术概念和编程挑战。';
      case 'valetzx/github/HowToCook':
        return '您好！我是您的健康饮食助手，我可以为您提供营养建议和健康食谱。';
      default:
        return '您好！我的数据库里有许多关于 CNB 的内容，尝试问问怎么迁移到 CNB 吧。';
    }
  };

  // 当知识库类型或是否使用知识库发生变化时，更新初始对话文字
  useEffect(() => {
    const initialMessage = getInitialMessage();
    setMessages([
      {
        id: 1,
        content: initialMessage,
        sender: 'ai',
        timestamp: new Date(Date.now() - 300000)
      }
    ]);
  }, [knowledgeRepo, useKnowledgeRepo]);

  // 滚动到底部的函数
  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  };

  // 当消息更新时滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (inputValue.trim() === '' || isStreaming) return;
    
    // 添加用户消息
    const userMessage = {
      id: messages.length + 1,
      content: inputValue,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // 保存用户问题
    const question = inputValue;
    setInputValue('');
    setIsStreaming(true);
    
    try {
      if (useKnowledgeRepo) {
        // 使用知识库检索
        // 第一步：查询知识库
        const knowledgeResponse = await fetch(
          `https://db0kqspitke0bs.database.nocode.cn/functions/v1/cnbapi/${knowledgeRepo}/-/knowledge/base/query`,
          {
            method: 'POST',
            headers: {
              'accept': 'application/vnd.cnb.api+json',
              'Authorization': `Bearer ${cnbToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              query: question,
              score_threshold: 0,
              top_k: 5
            })
          }
        );
        
        if (!knowledgeResponse.ok) {
          throw new Error(`知识库查询失败: ${knowledgeResponse.status}`);
        }
        
        const knowledgeData = await knowledgeResponse.json();
        
        // 提取所有 chunk 内容
        const chunks = knowledgeData.map(item => item.chunk).join('\n\n');
        
        // 构建 RAG 提示
        const ragPrompt = `基于以下知识库内容回答用户问题：
知识库内容：
${chunks}
用户问题：${question}

请基于上述知识库内容，准确、详细地回答用户的问题。如果知识库中没有相关信息，请明确说明。
在回答的最后，请添加一个"参考资料"部分，列出回答中引用的相关资料链接。`;
        
        const thinkingMessage = {
          id: messages.length + 2,
          content: '正在思考中...',
          sender: 'ai',
          timestamp: new Date(),
          isStreaming: true
        };
        
        setMessages(prev => [...prev, thinkingMessage]);
        
        // 第二步：调用 AI 接口
        const aiResponse = await fetch(
          'https://db0kqspitke0bs.database.nocode.cn/functions/v1/cnbapi/cnb/docs/-/ai/chat/completions',
          {
            method: 'POST',
            headers: {
              'accept': 'application/json',
              'Authorization': `Bearer ${cnbToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              messages: [
                {
                  content: ragPrompt,
                  role: 'user'
                }
              ],
              model: 'gpt-3.5-turbo',
              stream: true
            })
          }
        );
        
        if (!aiResponse.ok || !aiResponse.body) {
          throw new Error(`AI 响应失败: ${aiResponse.status}`);
        }
        
        // 处理流式响应
        const reader = aiResponse.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';
        let messageId = thinkingMessage.id;
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  break;
                }
                
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                    const content = parsed.choices[0].delta.content;
                    fullContent += content;
                    
                    // 更新消息内容
                    setMessages(prev => prev.map(msg => 
                      msg.id === messageId 
                        ? { ...msg, content: fullContent }
                        : msg
                    ));
                  }
                } catch (e) {
                  console.log('解析流数据失败:', e);
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
        
        // 更新最终消息状态
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, isStreaming: false }
            : msg
        ));
      } else {
        const thinkingMessage = {
          id: messages.length + 2,
          content: '正在思考中...',
          sender: 'ai',
          timestamp: new Date(),
          isStreaming: true
        };
        
        setMessages(prev => [...prev, thinkingMessage]);
        
        const aiResponse = await fetch(
          'https://db0kqspitke0bs.database.nocode.cn/functions/v1/aifree',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${cnbToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              q: `${preprompt}${question}`
            })
          }
        );
        
        if (!aiResponse.ok) {
          throw new Error(`响应失败: ${aiResponse.status}`);
        }
        
        const text = await aiResponse.text();
        let fullContent = '';
        
        try {
          // 尝试解析为 JSON
          const aiData = JSON.parse(text);
          // 提取 Q/A 格式中的回答部分
          if (aiData.response) {
            fullContent = aiData.response;
          } else if (aiData.result) {
            fullContent = aiData.result;
          } else {
            // 如果是 Q/A 格式，提取 A: 后面的内容
            const match = text.match(/A:\s*(.*)/s);
            if (match && match[1]) {
              fullContent = match[1].trim();
            } else {
              fullContent = text;
            }
          }
        } catch (e) {
          // 如果不是有效的 JSON，检查是否是 Q/A 格式
          const match = text.match(/A:\s*(.*)/s);
          if (match && match[1]) {
            fullContent = match[1].trim();
          } else {
            // 如果不是 Q/A 格式，直接使用返回的文本
            fullContent = text || '抱歉，我没有理解您的问题。';
          }
        }
        
        // 更新消息内容
        setMessages(prev => prev.map(msg => 
          msg.id === thinkingMessage.id 
            ? { ...msg, content: fullContent, isStreaming: false }
            : msg
        ));
      }
    } catch (error) {
      console.error('处理请求时出错:', error);
      // 显示错误消息
      const errorMessage = {
        id: messages.length + 2,
        content: `抱歉，处理您的请求时出现错误: ${error.message}`,
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Markdown 组件
  const MarkdownComponents = {
    h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-800 dark:text-gray-100 break-words" {...props} />,
    h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-5 mb-3 text-gray-800 dark:text-gray-100 break-words" {...props} />,
    h3: ({node, ...props}) => <h3 className="text-lg font-bold mt-4 mb-2 text-gray-800 dark:text-gray-100 break-words" {...props} />,
    p: ({node, ...props}) => <p className="mb-3 leading-relaxed text-gray-700 dark:text-gray-300 break-words" {...props} />,
    ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3 text-gray-700 dark:text-gray-300 break-words" {...props} />,
    ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-3 text-gray-700 dark:text-gray-300 break-words" {...props} />,
    li: ({node, ...props}) => <li className="mb-1 text-gray-700 dark:text-gray-300 break-words" {...props} />,
    a: ({node, ...props}) => <a className="text-blue-600 hover:underline dark:text-blue-400 break-all" {...props} />,
    code: ({node, ...props}) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm dark:bg-slate-700 dark:text-gray-100 break-all" {...props} />,
    pre: ({node, ...props}) => <pre className="bg-gray-100 p-3 rounded-lg overflow-x-auto my-3 dark:bg-slate-700 dark:text-gray-100" {...props} />,
    blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-300 pl-4 italic my-3 dark:border-slate-600 dark:text-gray-300 break-words" {...props} />,
    table: ({node, ...props}) => <table className="min-w-full border-collapse border border-gray-300 my-3 dark:border-slate-600" {...props} />,
    th: ({node, ...props}) => <th className="border border-gray-300 px-3 py-2 bg-gray-50 font-medium dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 break-words" {...props} />,
    td: ({node, ...props}) => <td className="border border-gray-300 px-3 py-2 dark:border-slate-600 dark:text-gray-300 break-words" {...props} />,
  };

  return (
    <div className="flex flex-col min-h-screen h-[calc(100vh-4rem)] md:h-[calc(100vh-1rem)] overflow-y-auto p-2 sm:p-4 pb-10 max-w-7xl mx-auto w-full bg-gray-50 dark:bg-slate-900 rounded-lg">
      {/* IdeasTop 父容器 */}
      <div className="w-full min-w-0 overflow-x-visible">
        <IdeasTop
          onSearchHistory={handleSearchHistory}
          onPresetPrompt={handlePresetPrompt}
        />
      </div>
      
      {/* 聊天区域和输入框容器 */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          {/* 聊天消息区域 */}
          <div className="flex-1 overflow-hidden mb-4">
            <ScrollArea className="h-full pr-4" ref={scrollAreaRef}>
              <div className="space-y-4 py-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex max-w-[85%] sm:max-w-[80%] ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                        <AvatarFallback className="dark:bg-slate-700 dark:text-gray-100">
                          {message.sender === 'user' ? '我' : '她'}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`mx-2 ${message.sender === 'user' ? 'text-right' : 'text-left'} min-w-0`}>
                        <div
                          className={`inline-block px-4 py-2 rounded-2xl ${
                            message.sender === 'user'
                              ? 'bg-blue-500 text-white rounded-tr-none'
                              : 'bg-gray-200 text-gray-800 dark:bg-slate-700 dark:text-gray-100 rounded-tl-none'
                          } ${message.isStreaming ? 'animate-pulse' : ''} break-words`}
                        >
                          {message.sender === 'ai' ? (
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={MarkdownComponents}
                            >
                              {message.content}
                            </ReactMarkdown>
                          ) : (
                            message.content
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          
          {/* 输入框和知识库选择器 */}
          <Card className="border-0 rounded-none bg-transparent dark:bg-transparent mt-auto">
            <CardContent className="p-0 p-b-8">
              {/* 输入框和发送按钮 */}
              <div className="flex items-end space-x-2">
                <div className="flex-1">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="输入你的想法..."
                    className="w-full resize-none dark:bg-slate-800 dark:text-gray-100 dark:border-slate-700"
                    disabled={isStreaming}
                  />
                </div>
                <Button 
                  onClick={handleSend} 
                  size="icon"
                  disabled={inputValue.trim() === '' || isStreaming}
                  className="h-10 w-10 dark:bg-slate-700 dark:hover:bg-slate-600"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              {/* 知识库选择器 */}
              <div className="md:hidden flex items-center gap-2 mt-2">
                <Select value={knowledgeRepo} onValueChange={setKnowledgeRepo}>
                  <SelectTrigger className="flex-1 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-100">
                    <SelectValue placeholder="选择知识库" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                    <SelectItem value="cnb/docs" className="dark:hover:bg-slate-700 dark:text-gray-100">CNB文档</SelectItem>
                    <SelectItem value="examples/ecosystem/web-interview" className="dark:hover:bg-slate-700 dark:text-gray-100">前端面试指南</SelectItem>
                    <SelectItem value="valetzx/github/HowToCook" className="dark:hover:bg-slate-700 dark:text-gray-100">健康饮食菜谱</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  variant={useKnowledgeRepo ? "default" : "outline"}
                  size="sm"
                  className={`px-3 py-2 rounded-md transition-all duration-200 ${
                    useKnowledgeRepo 
                      ? 'bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'
                      : 'border border-blue-500 text-blue-500 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-slate-800'
                  }`}
                  onClick={() => setUseKnowledgeRepo(!useKnowledgeRepo)}
                >
                  <span className="text-xs">{useKnowledgeRepo ? "已启用检索" : "检索知识库"}</span>
                </Button>
              </div>
              
              {/* 桌面端知识库选择器 */}
              <div className="hidden md:flex items-center gap-2 mt-2">
                <Select value={knowledgeRepo} onValueChange={setKnowledgeRepo}>
                  <SelectTrigger className="w-[200px] dark:bg-slate-800 dark:border-slate-700 dark:text-gray-100">
                    <SelectValue placeholder="选择知识库" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                    <SelectItem value="cnb/docs" className="dark:hover:bg-slate-700 dark:text-gray-100">CNB文档</SelectItem>
                    <SelectItem value="examples/ecosystem/web-interview" className="dark:hover:bg-slate-700 dark:text-gray-100">前端面试指南</SelectItem>
                    <SelectItem value="valetzx/github/HowToCook" className="dark:hover:bg-slate-700 dark:text-gray-100">健康饮食菜谱</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  variant={useKnowledgeRepo ? "default" : "outline"}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md transition-all duration-200 ${
                    useKnowledgeRepo 
                      ? 'bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'
                      : 'border border-blue-500 text-blue-500 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-slate-800'
                  }`}
                  onClick={() => setUseKnowledgeRepo(!useKnowledgeRepo)}
                >
                  <span>{useKnowledgeRepo ? "已启用检索" : "检索知识库"}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Ideas;
