import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRoleAssignment, formatAssignment } from '@/cnbAipvp/assignRoles';
import RoleSelector from '@/cnbAipvp/RoleSelector';
import { useNavigate } from 'react-router-dom';

// 电流特效样式
const electricStyles = `
@keyframes electricFlash {
  0% { opacity: 0; transform: scale(1); }
  20% { opacity: 0.6; transform: scale(1.01); }
  40% { opacity: 0.8; transform: scale(1.02); }
  60% { opacity: 0.7; transform: scale(1.01); }
  80% { opacity: 0.5; transform: scale(1); }
  100% { opacity: 0; transform: scale(1); }
}

.electric-effect {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 5; /* 特效层级 */
  animation: electricFlash 1.5s ease-in-out;
}

.electric-text {
  position: absolute;
  font-size: 1.2rem;
  font-weight: bold;
  text-shadow: 0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px rgba(255, 255, 255, 0.75);
  z-index: 6; /* 文字层级高于特效 */
  text-align: center;
  white-space: nowrap;
  animation: electricFlash 1.5s ease-in-out;
}

/* 正方文字样式和位置 */
.pro-electric-text {
  color: rgb(255, 102, 0);
  top: 30%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* 反方文字样式和位置 */
.con-electric-text {
  color:rgb(180, 101, 237);
  top: 30%;
  right: 50%;
  transform: translate(50%, -50%);
}

/* 添加动画填充模式，保持最后一帧状态 */
.electric-effect, .electric-text {
  animation-fill-mode: forwards;
}

`;

// 添加样式到文档
const styleSheet = document.createElement('style');
styleSheet.textContent = electricStyles;
document.head.appendChild(styleSheet);

/**
 * 对战配置组件
 */
const BattleConfig = ({
  repopath = '',
  onRepopathChange,
  userTopic = '',
  onUserTopicChange,
  maxRounds = 3,
  onMaxRoundsChange
}) => {
  // 如果repopath为空，设置默认值cnb/feedback
  React.useEffect(() => {
    if (!repopath && onRepopathChange) {
      onRepopathChange('cnb/feedback');
    }
  }, [repopath, onRepopathChange]);

  // 如果maxRounds为空，设置默认值3
  React.useEffect(() => {
    if (!maxRounds && onMaxRoundsChange) {
      onMaxRoundsChange(3);
    }
  }, [maxRounds, onMaxRoundsChange]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>对战配置</CardTitle>
        <CardDescription>
          本块内容必填，如果没有知识库需要填写默认的cnb/feedback，然后填写论题后选择角色
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="repopath">知识库路径</Label>
            <Input
              id="repopath"
              placeholder="例如: cnb/feedback"
              value={repopath}
              onChange={(e) => onRepopathChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="userTopic">辩论主题</Label>
            <Input
              id="userTopic"
              placeholder="例如: 人工智能是否应该取代人类工作"
              value={userTopic}
              onChange={(e) => onUserTopicChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxRounds">最大轮次</Label>
            <Input
              id="maxRounds"
              type="number"
              min="1"
              max="10"
              placeholder="例如: 3"
              value={maxRounds}
              onChange={(e) => onMaxRoundsChange(parseInt(e.target.value) || 3)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// 电流特效组件
const ElectricEffect = ({ side }) => {
  const [showEffect, setShowEffect] = useState(false);
  const [currentText, setCurrentText] = useState('');

  const battleTexts = [
    '不服来辩',
    '敢接招吗',
    '放马过来',
    '🙄',
    'Battle👊',
    '奉陪到底',
    '随时奉陪',
    '😠',
    '谁怕谁',
    '🤌',
    '尽管来吧',
    '三百回合',
    'Battle👊',
    '🤣',
    'Easy',
    '一决高下',
    '看招'
  ];

  const getRandomText = () => {
    const randomIndex = Math.floor(Math.random() * battleTexts.length);
    return battleTexts[randomIndex];
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.8) {
        setCurrentText(getRandomText());
        setShowEffect(true);
        setTimeout(() => setShowEffect(false), 1500);
      }
    }, 1500 + Math.random() * 4000);

    return () => clearInterval(interval);
  }, []);

  if (!showEffect) return null;

  // 将文字和特效分为同级元素
  return (
    <>
      <div className={`electric-effect ${side === 'pro' ? 'pro-electric' : 'con-electric'}`} />
      <div className={`electric-text ${side === 'pro' ? 'pro-electric-text' : 'con-electric-text'}`}>
        {currentText}
      </div>
    </>
  );
};

export default function RoleAssignment() {
  const { assignedRoles, loading, error, assign, reset } = useRoleAssignment();
  const [activeTab, setActiveTab] = useState('select');
  const [repopath, setRepopath] = useState('');
  const [userTopic, setUserTopic] = useState('');
  const [maxRounds, setMaxRounds] = useState(3);
  const [showRoleSelector, setShowRoleSelector] = useState(true);
  const navigate = useNavigate();

  // 处理用户选择完成
  const handleSelectionComplete = async (selectedRoles) => {
    try {
      await assign('select', selectedRoles);
      setShowRoleSelector(false); // 隐藏角色选择器
    } catch (err) {
      console.error('选择分配失败:', err);
    }
  };

  // 重置分配
  const handleReset = () => {
    reset();
    setShowRoleSelector(true); // 重新显示角色选择器
  };

  // 处理开始对战
  const handleStartBattle = () => {
    if (repopath && userTopic && assignedRoles) {
      // 跳转到AiBattle页面，携带参数
      navigate('/aibattle', {
        state: {
          repopath,
          userTopic,
          maxRounds
        }
      });
    } else {
      alert('请填写知识库路径和问题，并完成角色分配');
    }
  };

  return (
      <div className="min-h-screen p-2 sm:p-4 pb-10">
        {/* 对战配置 - 始终显示 */}
        <div className="mb-4">
          <BattleConfig
            repopath={repopath}
            onRepopathChange={setRepopath}
            userTopic={userTopic}
            onUserTopicChange={setUserTopic}
            maxRounds={maxRounds}
            onMaxRoundsChange={setMaxRounds}
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="select">
            {showRoleSelector && (
              <RoleSelector
                onSelectionComplete={handleSelectionComplete}
                repopath={repopath}
                onRepopathChange={setRepopath}
                userTopic={userTopic}
                onUserTopicChange={setUserTopic}
                maxRounds={maxRounds}
                onMaxRoundsChange={setMaxRounds}
              />
            )}
          </TabsContent>
        </Tabs>

        {/* 分配结果显示 */}
        {assignedRoles && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>分配结果</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                  >
                    重新分配
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleStartBattle}
                    disabled={!repopath || !userTopic}
                  >
                    开始对战
                  </Button>
                </div>
              </div>
              <CardDescription>
                角色分配完成，前5个为正方，后5个为反方
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 正方角色 */}
                <div>
                  <div className="space-y-3">
                    {assignedRoles.proSide.map((role, index) => (
                      <div key={role.id} className="relative flex items-center p-6 border rounded-lg overflow-hidden">
                        {/* 电流特效 */}
                        <ElectricEffect side="pro" />
                        {/* 正方头像布满右侧，向左渐变 */}
                        <div className="absolute right-0 top-0 bottom-0 w-full flex justify-end items-center">
                          <div className="relative h-full w-full">
                            <div className="absolute right-0 top-0 bottom-0 w-full bg-gradient-to-l from-orange-500/30 via-orange-500/10 to-transparent"></div>
                            <div className="h-full w-1/3 absolute right-0 top-1/2 transform -translate-y-1/2">
                              <div className="h-full w-full relative">
                                <img
                                  src={role.avatar}
                                  alt={role.name}
                                  className="h-full w-full object-cover"
                                  style={{
                                    maskImage: 'linear-gradient(to right, transparent 0%, black 100%)',
                                    WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 100%)'
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* 角色信息在左侧 */}
                        <div className="flex-1 z-10">
                          <p className="font-medium">{role.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 反方角色 */}
                <div>
                  <div className="space-y-3">
                    {assignedRoles.conSide.map((role, index) => (
                      <div key={role.id} className="relative flex items-center p-6 border rounded-lg overflow-hidden">
                        {/* 电流特效 */}
                        <ElectricEffect side="con" />
                        {/* 反方头像布满左侧，向右渐变 */}
                        <div className="absolute left-0 top-0 bottom-0 w-full flex justify-start items-center">
                          <div className="relative h-full w-full">
                            <div className="absolute left-0 top-0 bottom-0 w-full bg-gradient-to-r from-indigo-500/30 via-indigo-500/10 to-transparent"></div>
                            {/* 添加反方向的透明渐变 */}
                            <div className="absolute right-0 top-0 bottom-0 w-full bg-gradient-to-l from-transparent via-indigo-500/10 to-indigo-500/30"></div>
                            <div className="h-full w-1/3 absolute left-0 top-1/2 transform -translate-y-1/2">
                              <div className="h-full w-full relative">
                                <img
                                  src={role.avatar}
                                  alt={role.name}
                                  className="h-full w-full object-cover"
                                  style={{
                                    maskImage: 'linear-gradient(to left, transparent 0%, black 100%)',
                                    WebkitMaskImage: 'linear-gradient(to left, transparent 0%, black 100%)'
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* 角色信息在右侧 */}
                        <div className="flex-1 text-right z-10">
                          <p className="font-medium">{role.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
  );
}
