import SettingsPage from '@/pages/Settings';
import UserSettings from '@/components/UserSettings';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { SquarePlus, Home, Compass, Settings, Swords, Archive } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { DialogContent, DialogTitle, Dialog, DialogHeader, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { getUserInfo } from '@/cnbUtils/indexedDB';
import { toast } from '@/components/ui/sonner';
import useLoginStatus from '@/fetchPage/isLogin';
import CnbLogo from '@/cnbUtils/cnbLogo';

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isPressingW, setIsPressingW] = useState(false);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [pressTimer, setPressTimer] = useState(null);
  const [progress, setProgress] = useState(0);
  const [userInfo, setUserInfo] = useState(null);
  const [announcementShown, setAnnouncementShown] = useState(false);
  const announcementDisplayedRef = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();

  // 使用登录状态hook
  const { isLoggedIn, isChecking, lastCheckedDate, checkLoginStatus, refreshLoginStatus } = useLoginStatus();

  // 监听登录状态变化，如果登录失效则显示错误提示
  useEffect(() => {
    if (isLoggedIn === false && lastCheckedDate) {
      // 只有在确实检查过登录状态且登录失效时才显示错误
      toast.error('CNB登录已失效', {
        description: '请重新登录以继续使用',
        duration: 10000,
        position: 'bottom-right'
      });
    }
  }, [isLoggedIn, lastCheckedDate]);

  // 页面加载时显示公告
  useEffect(() => {
    const hasSeenAnnouncement = localStorage.getItem('noteshowAt');
    const today = new Date().toDateString();

    if (hasSeenAnnouncement !== 'never' && hasSeenAnnouncement !== today && !announcementDisplayedRef.current) {
      announcementDisplayedRef.current = true;

      toast.info('祝大家2026新年快乐！马到成功！马上发财！', {
        duration: 10000,
        position: 'top-center',
        action: {
          label: '确认',
          onClick: () => {
            //window.open('', '_blank');
            localStorage.setItem('noteshowAt', 'today');
            setAnnouncementShown(true);
            toast.dismiss();
          }
        },
        cancel: {
          label: '取消',
          onClick: () => {
            const today = new Date().toDateString();
            localStorage.setItem('noteshowAt', today);
            setAnnouncementShown(true);
            toast.dismiss();
          }
        },
        onDismiss: () => {
          localStorage.setItem('noteshowAt', '');
          setAnnouncementShown(true);
        }
      });

      setAnnouncementShown(true);
    }
  }, []);

  // 加载用户信息
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const user = await getUserInfo();
        setUserInfo(user);
      } catch (error) {
        console.error('加载用户信息失败:', error);
      }
    };

    loadUserInfo();

    // 监听存储变化事件，以便在其他页面登录/登出时更新状态
    const handleStorageChange = (event) => {
      if (event.key === 'settingsUpdated') {
        loadUserInfo();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    let requestId = null;

    const handleKeyDown = (e) => {
      if (e.key === 'w' || e.key === 'W') {
        if (e.repeat) return; // 忽略重复事件
        setIsPressingW(true);
        const startTime = Date.now();
        const updateProgress = () => {
          const elapsed = Date.now() - startTime;
          const newProgress = Math.min((elapsed / 1500) * 100, 100);
          setProgress(newProgress);
          if (newProgress < 100) {
            requestId = requestAnimationFrame(updateProgress);
          } else {
            setShowEasterEgg(true);
          }
        };
        requestId = requestAnimationFrame(updateProgress);
        setPressTimer(requestId);
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'w' || e.key === 'W') {
        setIsPressingW(false);
        if (requestId) {
          cancelAnimationFrame(requestId);
          setPressTimer(null);
          setProgress(0);
        }
      }
    };

    if (isHovering) {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
    } else {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (requestId) {
        cancelAnimationFrame(requestId);
        setProgress(0);
      }
      setIsPressingW(false);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (requestId) cancelAnimationFrame(requestId);
    };
  }, [isHovering]);

  return (
    <>
      {/* 桌面端侧边栏 - 固定定位 */}
      <div className="hidden md:flex flex-col fixed top-0 left-0 h-screen bg-white dark:bg-card border-r border-gray-200 dark:border-slate-700 transition-all duration-300 z-40"
           style={{ width: collapsed ? '64px' : '256px' }}>

        {/* 可滚动区域 */}
        <div className="flex-1 overflow-y-auto">
          {/* 顶部内容 */}
          <div className="p-4">
            {/* Logo */}
            <div className="mb-2">
              <div className="flex items-center justify-center">
                <div className="flex items-center justify-center p-3 rounded-lg transition-colors">
                  <CnbLogo colorScheme="auto" width="32px" height="32px" />
                </div>
              </div>
            </div>
          
            {/* 导航项 */}
            <nav className="space-y-2">
              <Link
                to="/"
                className="flex items-center justify-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Home size={24} className={`flex-shrink-0 ${location.pathname === '/' ? 'text-[#838EF8]' : ''}`} />
                {!collapsed && <span className="ml-3 whitespace-nowrap text-gray-800 dark:text-gray-200">主页</span>}
              </Link>
            
              <Link
                to="/user"
                className="flex items-center justify-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Compass size={24} className={`flex-shrink-0 ${location.pathname === '/user' ? 'text-[#838EF8]' : ''}`} />
                {!collapsed && <span className="ml-3 whitespace-nowrap text-gray-800 dark:text-gray-200">探索</span>}
              </Link>
            
              <Link
                to="/commit"
                className="flex items-center justify-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Archive size={24} className={`flex-shrink-0 ${location.pathname === '/commit' || location.pathname === '/aibattle' || location.pathname === '/start' ? 'text-[#838EF8]' : ''}`} />
                {!collapsed && <span className="ml-3 whitespace-nowrap text-gray-800 dark:text-gray-200">更多</span>}
              </Link>
            </nav>
          </div>

          {/* 底部信息 - 只在展开时显示，隐藏在按钮区域后方 */}
          {!collapsed && (
            <div className="relative min-h-[20vh]">
              {/* 占位空间，确保有足够的滚动距离 */}
              <div className="h-[75vh]"></div>

              {/* 底部信息内容 - 绝对定位在按钮区域后方 */}
              <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  {/* 1 */}
                  <div className="flex justify-between items-center mb-1 px-8">
                    <div className="font-medium">关于作者</div>
                    <a href="https://cnb.cool/wss/apps/open-cnb" target="_blank" rel="noopener noreferrer" className="hover:text-[#838EF8] transition-colors">
                      开源地址
                    </a>
                  </div>

                  {/* 2 */}
                  <div className="flex justify-between items-center mb-1 px-8">
                    <div className="font-medium">友情链接</div>
                    <a href="https://cnb.cool" target="_blank" rel="noopener noreferrer" className="hover:text-[#838EF8] transition-colors">
                      官方站点
                    </a>
                  </div>

                  {/* 4 */}
                  <div className="flex justify-between items-center mb-1 px-8">
                    <a href="https://cnb.nocode.host" target="_blank" rel="noopener noreferrer" className="hover:text-[#838EF8] transition-colors">
                      跳转源站
                    </a>
                    <a href="/#/localstorage" rel="noopener noreferrer" className="hover:text-[#838EF8] transition-colors">
                      储存工具
                    </a>
                  </div>

                  {/* 3 */}
                  <div className="flex justify-between items-center mb-1 px-8">
                    <a href="https://cnb.nocode.host/#/info/1648/cnb/feedback" target="_blank" rel="noopener noreferrer" className="hover:text-[#838EF8] transition-colors">
                      更新日志
                    </a>
                    <a href="/#/info/1648/cnb/feedback" rel="noopener noreferrer" className="hover:text-[#838EF8] transition-colors">
                      项目反馈
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* 底部按钮区域 - 固定在底部 */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-700 mt-auto">
          <div className="relative">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="flex items-center justify-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors w-full mb-2"
              onMouseEnter={() => {
                setShowTooltip(true);
                setIsHovering(true);
              }}
              onMouseLeave={() => {
                setShowTooltip(false);
                setIsHovering(false);
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="flex-shrink-0"
              >
                {collapsed ? (
                  <path d="m9 18 6-6-6-6" />
                ) : (
                  <path d="m15 18-6-6 6-6" />
                )}
              </svg>
              {!collapsed && <span className="ml-3 whitespace-nowrap text-gray-800 dark:text-gray-200">收起</span>}
            </button>
            <AnimatePresence>
              {showTooltip && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="absolute left-full ml-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-md shadow-lg z-50 whitespace-nowrap top-[+6px]"
                >
                  {isPressingW ? (
                    <>
                      <div>按住 [W] 开始思索</div>
                      <div className="w-full bg-gray-600 rounded-full h-1.5 mt-1">
                        <motion.div
                          className="bg-indigo-500 h-1.5 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.1 }}
                        />
                      </div>
                    </>
                  ) : (
                    '按住 [W] 开始思索'
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="ghost"
                className="flex items-center justify-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors w-full"
              >
                {userInfo ? (
                  <>
                    <img
                      src={userInfo.avatar_url || `https://cnb.cool/users/${userInfo.username}/avatar/s`}
                      alt={userInfo.nickname || userInfo.username}
                      className="max-w-6 max-h-6 rounded-full object-contain"
                    />
                    {!collapsed && (
                      <span className="ml-3 whitespace-nowrap text-gray-800 dark:text-gray-200">
                        {userInfo.nickname || userInfo.username}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <Settings size={24} className="flex-shrink-0" />
                    {!collapsed && <span className="ml-3 whitespace-nowrap text-gray-800 dark:text-gray-200">设置</span>}
                  </>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-w-2xl max-h-[90vh] overflow-y-auto w-[90vw] sm:w-auto sm:min-w-[500px] rounded-lg [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] p-0">
              <DialogHeader className="p-6 pb-0">
                <DialogTitle>设置</DialogTitle>
              </DialogHeader>
              <div className="p-6 pt-4">
                <UserSettings onClose={() => setSettingsOpen(false)} />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 移动端底部导航栏 - 固定定位，不会随页面滚动而移动 */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-card border-t border-gray-200 dark:border-slate-700 z-50">
        <div className="flex justify-around items-center p-2">
          <Link 
            to="/" 
            className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors min-w-[60px]"
          >
            <Home size={24} className={location.pathname === '/' ? 'text-[#838EF8]' : ''} />
          </Link>
          
          <Link 
            to="/user" 
            className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors min-w-[60px]"
          >
            <Compass size={24} className={location.pathname === '/user' ? 'text-[#838EF8]' : ''} />
          </Link>
          
          <Link 
            to="/commit" 
            className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors min-w-[60px]"
          >
            <Archive size={24} className={location.pathname === '/commit' || location.pathname === '/aibattle' || location.pathname === '/start' ? 'text-[#838EF8]' : ''} />
          </Link>
          
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors min-w-[60px] h-auto"
              >
                {userInfo ? (
                  <img
                    src={userInfo.avatar_url || `https://cnb.cool/users/${userInfo.username}/avatar/s`}
                    alt={userInfo.nickname || userInfo.username}
                    className="max-w-6 max-h-6 rounded-full object-contain"
                  />
                ) : (
                  <Settings size={24} />
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-w-2xl max-h-[90vh] overflow-y-auto w-[90vw] sm:w-auto sm:min-w-[500px] rounded-lg [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] p-0">
              <DialogHeader className="p-6 pb-0">
                <DialogTitle>设置</DialogTitle>
              </DialogHeader>
              <div className="p-6 pt-4">
                <UserSettings isDialog={true} onClose={() => setSettingsOpen(false)} />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <Dialog open={showEasterEgg} onOpenChange={setShowEasterEgg}>
        <DialogContent className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-4 rounded-md shadow-md">
          <DialogHeader>
            <DialogTitle>发现彩蛋！</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            <p>恭喜你发现了彩蛋！🎉</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Sidebar;
