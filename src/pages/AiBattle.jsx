import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';
import { queryAiKnowledge } from '../cnbAipvp/aiQuery';
import { aiBattleReply } from '../cnbAipvp/aiReply';
import { Swords } from 'lucide-react';
import MarkdownMessage from '@/components/MarkdownMessage';

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
  const [currentSpeakerIndex, setCurrentSpeakerIndex] = useState(0);
  const [debateMessages, setDebateMessages] = useState([]);
  const [assignedRoles, setAssignedRoles] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  // 新增：缓存固定的发言顺序（startBattle 时构建一次）
  const [speakerOrder, setSpeakerOrder] = useState([]);

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
      const { repopath: rp, userTopic: ut } = location.state;
      if (rp) setRepopath(rp);
      if (ut) setUserTopic(ut);
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
        }
      } catch (error) {
        console.error('解析角色分配信息失败:', error);
      }
    }
  }, [location.state]);

  // 新增：监听索引/轮次变化，自动调用下一个发言人（解决异步更新问题）
  useEffect(() => {
    if (!isBattleStarted || isBattlePaused || currentRound >= 3 || isRequesting) return;
    // 排除初始状态（currentSpeakerIndex=0 且无消息时，已在 startBattle 调用过）
    if (debateMessages.length === 0 && currentSpeakerIndex === 0) return;
    // 延迟 2 秒调用（保持发言间隔）
    const timer = setTimeout(() => {
      nextSpeaker();
    }, 2000);
    return () => clearTimeout(timer);
  }, [currentSpeakerIndex, currentRound, isBattleStarted, isBattlePaused, isRequesting]);

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
  };

  // 核心修复：nextSpeaker 仅负责当前发言人逻辑，下一轮通过 useEffect 触发
  const nextSpeaker = async () => {
    if (isBattlePaused || currentRound >= 3 || isRequesting) return;
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
        if (nextRound >= 3) {
          setIsRequesting(false);
          return; // 辩论结束
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
        if (nextRound >= 3) {
          setIsRequesting(false);
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
    { id: 'repopath', label: repopath || '知识库路径' },
    { id: 'mode', label: '5v5模式' },
    { id: 'userTopic', label: userTopic || '辩论主题' },
    {
      id: 'start',
      label: isLoading ? '准备中...' : '开始辩论',
      onClick: startBattle,
      disabled: isLoading || isBattleStarted,
      className: isLoading || isBattleStarted
        ? "bg-gray-400 cursor-not-allowed text-white"
        : "bg-green-500 hover:bg-green-600 text-white"
    },
    ...(isBattleStarted ? [
      {
        id: 'pause',
        label: isBattlePaused ? '继续' : '暂停',
        onClick: togglePauseBattle,
        className: "bg-yellow-500 hover:bg-yellow-600 text-white"
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
    const [hasAnimated, setHasAnimated] = useState(false);
    useEffect(() => setHasAnimated(true), []);

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
      <div className="mx-auto max-w-6xl">
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
              <p>辩论尚未开始</p>
              <p className="text-sm mt-2">请点击"开始辩论"按钮启动5v5 AI对战</p>
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
    </div>
  );
};

export default AiBattle;