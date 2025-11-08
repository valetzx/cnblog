import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';
import { queryAiKnowledge } from '@/cnbAipvp/aiQuery';
import { aiBattleReply } from '@/cnbAipvp/aiReply';
import { Swords } from 'lucide-react';
import MarkdownMessage from '@/components/MarkdownMessage';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const AiBattle = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedTag, setSelectedTag] = useState('AiBattle');
  const [repopath, setRepopath] = useState('');
  const [userTopic, setUserTopic] = useState('');

  // 辩论状态
  const [isBattleStarted, setIsBattleStarted] = useState(false);
  const [isBattlePaused, setIsBattlePaused] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const [maxRounds, setMaxRounds] = useState(3); // 默认3轮
  const [currentSpeakerIndex, setCurrentSpeakerIndex] = useState(0);
  const [debateMessages, setDebateMessages] = useState([]);
  const [assignedRoles, setAssignedRoles] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isBattleFinished, setIsBattleFinished] = useState(false);
  // 场外求助状态
  const [showUserInputModal, setShowUserInputModal] = useState(false);
  const [userInputSide, setUserInputSide] = useState('pro'); // 默认正方
  const [userInputContent, setUserInputContent] = useState('');
  const [hasHandledUserInput, setHasHandledUserInput] = useState(false);
  // 新增：缓存固定的发言顺序（startBattle 时构建一次）
  const [speakerOrder, setSpeakerOrder] = useState([]);
  const animatedMessagesRef = useRef(new Set());

  const messagesEndRef = useRef(null);

  // 自动滚动
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [debateMessages]);

  // 解析角色并构建固定发言顺序
  useEffect(() => {
    if (location.state) {
      const { repopath: rp, userTopic: ut, maxRounds: mr } = location.state;
      if (rp) setRepopath(rp);
      if (ut) setUserTopic(ut);
      if (mr) setMaxRounds(mr);
    }

    const assignmentStr = localStorage.getItem('assignRoles');
    if (assignmentStr) {
      try {
        const roles = JSON.parse(assignmentStr);
        const proSide = roles.filter(role => role.side === 'pro');
        const conSide = roles.filter(role => role.side === 'con');

        const formattedRoles = {
          proSide: proSide.map(role => ({
            id: `pro-${role.part}`,
            name: role.name,
            side: 'pro',
            prompt: role.prompt,
            part: role.part
          })),
          conSide: conSide.map(role => ({
            id: `con-${role.part}`,
            name: role.name,
            side: 'con',
            prompt: role.prompt,
            part: role.part
          }))
        };
        setAssignedRoles(formattedRoles);

        // 提前构建发言顺序（仅构建一次）
        if (formattedRoles.proSide.length === 5 && formattedRoles.conSide.length === 5) {
          const sortedPro = [...formattedRoles.proSide].sort((a, b) => a.part - b.part);
          const sortedCon = [...formattedRoles.conSide].sort((a, b) => a.part - b.part);
          const order = [];
          for (let i = 0; i < 5; i++) {
            order.push(sortedPro[i]);
            order.push(sortedCon[i]);
          }
          setSpeakerOrder(order);

          // 检查是否满足自动启动条件
          const currentRepopath = repopath || (location.state?.repopath || '');
          const currentUserTopic = userTopic || (location.state?.userTopic || '');

          if (currentRepopath && currentUserTopic && !isBattleStarted && !isLoading) {
            const timer = setTimeout(() => {
              startBattle();
            }, 500);
            return () => clearTimeout(timer);
          }
        }
      } catch (error) {
        console.error('解析角色分配信息失败:', error);
      }
    }
  }, [location.state, repopath, userTopic]);

  // 新增：监听索引/轮次变化，自动调用下一个发言人（解决异步更新问题）
  useEffect(() => {
    if (!isBattleStarted || isBattlePaused || currentRound >= maxRounds || isRequesting || isBattleFinished) return;
    // 排除初始状态（currentSpeakerIndex=0 且无消息时，已在 startBattle 调用过）
    if (debateMessages.length === 0 && currentSpeakerIndex === 0) return;
    if (hasHandledUserInput) return;
    if (currentSpeakerIndex === 0 && currentRound > 0 && debateMessages.length > 0) {
      setShowUserInputModal(true);
      return;
    }
    // 延迟 2 秒调用（保持发言间隔）
    const timer = setTimeout(() => {
      nextSpeaker();
    }, 2000);
    return () => clearTimeout(timer);
  }, [currentSpeakerIndex, currentRound, isBattleStarted, isBattlePaused, isRequesting, isBattleFinished, debateMessages.length, hasHandledUserInput]);

  const startBattle = async () => {
    if (!repopath || !userTopic || !assignedRoles || speakerOrder.length === 0) {
      alert('请先完成角色分配（确保5v5）并设置知识库路径和问题');
      return;
    }

    // 角色完整性检查
    const allRoles = [...assignedRoles.proSide, ...assignedRoles.conSide];
    const invalidRole = allRoles.find(role => !role.name || !role.side || !role.prompt || !role.part);
    if (invalidRole) {
      alert('角色信息不完整，请重新分配角色');
      return;
    }

    localStorage.removeItem('aiBattleHistory');

    setIsLoading(true);
    setIsBattleStarted(true);
    setCurrentRound(0);
    setCurrentSpeakerIndex(0);
    setDebateMessages([]);

    try {
      await queryAiKnowledge(repopath, userTopic);
      // 初始调用一次 nextSpeaker（触发第一轮发言）
      await nextSpeaker();
    } catch (error) {
      console.error('开始辩论失败:', error);
      alert('开始辩论失败，请检查参数');
      setIsBattleStarted(false);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePauseBattle = () => {
    setIsBattlePaused(!isBattlePaused);
  };

  const resetBattle = () => {
    setIsBattleStarted(false);
    setIsBattlePaused(false);
    setCurrentRound(0);
    setCurrentSpeakerIndex(0);
    setDebateMessages([]);
    setSpeakerOrder([]);
    setIsBattleFinished(false); 
    setHasHandledUserInput(false);
    animatedMessagesRef.current.clear();
  };

  // 获取辩论历史记录
  const getHistory = () => {
    try {
      const history = localStorage.getItem('aiBattleHistory');
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('获取历史记录失败:', error);
      return [];
    }
  };

  // 保存用户发言到历史记录
  const saveUserInputToHistory = (side, content) => {
    try {
      const existingHistory = getHistory();
      const newEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        side,
        roleName: '场外用户',
        content,
        time_taken: 0
      };

      const updatedHistory = [...existingHistory, newEntry];
      localStorage.setItem('aiBattleHistory', JSON.stringify(updatedHistory));
      return newEntry;
    } catch (error) {
      console.error('保存用户发言失败:', error);
      return null;
    }
  };

  // 处理用户场外发言
  const handleUserInputSubmit = () => {
    if (!userInputContent.trim()) {
      alert('请输入发言内容');
      return;
    }

    // 保存到历史记录
    const userMessage = saveUserInputToHistory(userInputSide, userInputContent);

    if (userMessage) {
      // 添加到辩论消息中显示
      const newMessage = {
        id: userMessage.id,
        content: userMessage.content,
        speaker: '场外用户',
        side: userInputSide,
        round: currentRound + 1,
        timestamp: new Date().toLocaleTimeString()
      };
      setDebateMessages(prev => [...prev, newMessage]);
    }

    // 关闭弹窗并清空输入
    setShowUserInputModal(false);
    setUserInputContent('');
    setHasHandledUserInput(true);

    // 直接更新轮次和发言人索引，避免触发useEffect
    const nextRound = currentRound + 1;
    if (nextRound >= maxRounds) {
      setIsBattleFinished(true);
    } else {
      setCurrentRound(nextRound);
      setCurrentSpeakerIndex(0);
      // 延迟调用nextSpeaker开始新一轮
      setTimeout(() => {
        nextSpeaker();
      }, 1000);
    }
  };

  // 取消用户输入
  const handleUserInputCancel = () => {
    setShowUserInputModal(false);
    setUserInputContent('');
    // 标记已经处理过场外求助
    setHasHandledUserInput(true);

    // 直接更新轮次和发言人索引，避免触发useEffect
    const nextRound = currentRound + 1;
    if (nextRound >= maxRounds) {
      setIsBattleFinished(true);
    } else {
      setCurrentRound(nextRound);
      setCurrentSpeakerIndex(0);
      // 延迟调用nextSpeaker开始新一轮
      setTimeout(() => {
        nextSpeaker();
      }, 1000);
    }
  };

  // 核心修复：nextSpeaker 仅负责当前发言人逻辑，下一轮通过 useEffect 触发
  const nextSpeaker = async () => {
    if (isBattlePaused || currentRound >= maxRounds || isRequesting) return;
    setIsRequesting(true);

    // 直接使用缓存的 speakerOrder（无需重复构建）
    const currentSpeaker = speakerOrder[currentSpeakerIndex];
    if (!currentSpeaker) {
      console.error('未找到当前发言人');
      setIsRequesting(false);
      return;
    }

    // 优化历史发言格式：自然文本（AI 更易解析）
    const historyContext = debateMessages.map((msg, idx) => 
      `第${idx+1}轮 - ${msg.speaker}(${msg.side === 'pro' ? '正方' : '反方'}): ${msg.content}`
    ).join('\n\n');

    try {
      // 调用 AI 回复（传入优化后的上下文）
      const response = await aiBattleReply(
        userTopic,
        historyContext,
        currentSpeaker.name,
        currentSpeaker.side,
        currentSpeaker.prompt
      );

      // 添加新消息
      const newMessage = {
        id: Date.now(),
        content: response.content,
        speaker: currentSpeaker.name,
        side: currentSpeaker.side,
        round: currentRound + 1,
        timestamp: new Date().toLocaleTimeString()
      };
      setDebateMessages(prev => [...prev, newMessage]);

      // 计算下一个索引和轮次
      const nextIndex = currentSpeakerIndex + 1;
      let nextRound = currentRound;

      // 一轮结束（10个发言人）
      if (nextIndex >= speakerOrder.length) {
        nextRound = currentRound + 1;
        if (nextRound >= maxRounds) {
          setIsRequesting(false);
          setIsBattleFinished(true); // 标记辩论结束
          return;
        }
      }

      // 更新状态（仅更新，不直接调用 nextSpeaker）
      if (nextIndex >= speakerOrder.length) {
        setCurrentRound(nextRound);
        setCurrentSpeakerIndex(0);
      } else {
        setCurrentSpeakerIndex(nextIndex);
      }

    } catch (error) {
      console.error('AI 回复失败:', error);
      // 错误时仍更新索引，避免卡住
      const nextIndex = currentSpeakerIndex + 1;
      let nextRound = currentRound;

      if (nextIndex >= speakerOrder.length) {
        nextRound = currentRound + 1;
        if (nextRound >= maxRounds) {
          setIsRequesting(false);
          setIsBattleFinished(true); // 标记辩论结束
          return;
        }
      }

      if (nextIndex >= speakerOrder.length) {
        setCurrentRound(nextRound);
        setCurrentSpeakerIndex(0);
      } else {
        setCurrentSpeakerIndex(nextIndex);
      }

    } finally {
      // 释放请求锁
      setIsRequesting(false);
    }
  };

  // 标签定义（保持不变）
  const tags = [
    {
      id: 'start',
      label: isLoading ? '准备中...' : '开始辩论',
      onClick: startBattle,
      disabled: isLoading || isBattleStarted,
      className: isLoading || isBattleStarted
        ? "bg-gray-400 cursor-not-allowed text-white"
        : "bg-green-500 hover:bg-green-600 text-white"
    },
    { id: 'repopath', label: repopath || '知识库路径' },
    { id: 'mode', label: '5v5模式' },
    { id: 'userTopic', label: userTopic || '辩论主题' },
    ...(isBattleStarted ? [
      {
        id: 'pause',
        label: isBattlePaused ? '继续' : '暂停',
        onClick: togglePauseBattle,
        className: isBattlePaused ? "bg-green-500 hover:bg-green-600 text-white" : "bg-yellow-500 hover:bg-yellow-600 text-white"
      },
      {
        id: 'reset',
        label: '重置',
        onClick: resetBattle,
        className: "bg-red-500 hover:bg-red-600 text-white"
      },
      { id: 'round', label: `第${currentRound + 1}轮` },
      { id: 'speaker', label: `当前发言人: ${currentSpeakerIndex + 1}/10` }
    ] : [])
  ];

  // 消息组件（保持不变）
  const DebateMessage = ({ message }) => {
    const [hasAnimated, setHasAnimated] = useState(animatedMessagesRef.current.has(message.id));
    useEffect(() => {
      if (!animatedMessagesRef.current.has(message.id)) {
        animatedMessagesRef.current.add(message.id);
        setHasAnimated(true);
      }
    }, [message.id]);

    return (
      <div className={`flex ${message.side === 'pro' ? 'justify-start' : 'justify-end'} mb-4`}>
        <div className={`max-w-2xl p-4 rounded-lg transition-all duration-300 transform ${
          message.side === 'pro'
            ? 'bg-orange-100 text-orange-900 border-l-4 border-orange-500'
            : 'bg-purple-100 text-purple-900 border-r-4 border-purple-500'
        } ${hasAnimated ? 'translate-x-0 opacity-100' : message.side === 'pro' ? 'translate-x-[-20px] opacity-0' : 'translate-x-[20px] opacity-0'}`}>
          <div className="flex items-center mb-2">
            <span className="font-semibold">{message.speaker}</span>
            <span className="text-sm text-gray-500 ml-2">{message.timestamp}</span>
          </div>
          <MarkdownMessage content={message.content} />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-2 sm:p-4 pb-10">
      <div className="">
        <div className="mb-4 w-full overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
          <div className="flex space-x-2 min-w-max">
            {tags.map((tag) => (
              tag.onClick ? (
                <button key={tag.id} onClick={tag.onClick} disabled={tag.disabled}
                  className={cn("px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors", tag.className)}>
                  {tag.label}
                </button>
              ) : (
                <div key={tag.id} className={cn("px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors",
                  selectedTag === tag.id ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-gray-200")}>
                  {tag.label}
                </div>
              )
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 min-h-96">
          {debateMessages.length === 0 ? (
            <div className="text-center text-gray-500 py-20">
              <Swords size={48} className="mx-auto mb-4 opacity-50" />
              <p>战场准备中</p>
              <p className="text-sm mt-2">如果未自动开始，请检查论题及角色是否完整</p>
            </div>
          ) : (
            <div className="space-y-4">
              {debateMessages.map((message) => (
                <DebateMessage key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* 场外求助弹窗 */}
      {showUserInputModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">场外求助</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              第 {currentRound + 1} 轮辩论结束，请选择阵营并发言
            </p>

            <div className="space-y-4">
              {/* 阵营选择 */}
              <div>
                <label className="block text-sm font-medium mb-2">选择阵营</label>
                <Tabs
                  value={userInputSide}
                  onValueChange={setUserInputSide}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger
                      value="pro"
                      className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
                    >
                      正方
                    </TabsTrigger>
                    <TabsTrigger
                      value="con"
                      className="data-[state=active]:bg-purple-500 data-[state=active]:text-white"
                    >
                      反方
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* 发言内容 */}
              <div>
                <label className="block text-sm font-medium mb-2">发言内容</label>
                <textarea
                  value={userInputContent}
                  onChange={(e) => setUserInputContent(e.target.value)}
                  placeholder="请输入您的发言内容..."
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md resize-none dark:bg-slate-700 dark:text-white"
                  rows={4}
                />
              </div>

              {/* 操作按钮 */}
              <div className="flex space-x-3">
                <button
                  onClick={handleUserInputCancel}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                  跳过
                </button>
                <button
                  onClick={handleUserInputSubmit}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  发送
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiBattle;