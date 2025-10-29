import SettingsPage from '@/pages/Settings';
import UserSettings from '@/components/UserSettings';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { SquarePlus, Home, Compass, Settings } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { DialogContent, DialogTitle, Dialog, DialogHeader, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { getUserInfo } from '@/cnbUtils/indexedDB';
import { toast } from '@/components/ui/sonner';

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

  // 页面加载时显示公告
  useEffect(() => {
    const hasSeenAnnouncement = localStorage.getItem('hasSeen1024Announcement');
    const today = new Date().toDateString();

    if (hasSeenAnnouncement !== 'never' && hasSeenAnnouncement !== today && !announcementDisplayedRef.current) {
      announcementDisplayedRef.current = true;

      toast.info('祝大家1024程序员节日快乐 !!! » 点击下方按钮查收惊喜', {
        duration: 30000,
        position: 'top-center',
        action: {
          label: '领取 1024GPU 额度',
          onClick: () => {
            window.open('https://cnb.cool/cnb/feedback/-/issues/2284', '_blank');
            localStorage.setItem('hasSeen1024Announcement', '');
            setAnnouncementShown(true);
          }
        },
        cancel: {
          label: '今日不再提示',
          onClick: () => {
            const today = new Date().toDateString();
            localStorage.setItem('hasSeen1024Announcement', today);
            setAnnouncementShown(true);
            toast.dismiss();
          }
        },
        onDismiss: () => {
          localStorage.setItem('hasSeen1024Announcement', '');
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
        {/* 顶部内容 */}
        <div className="flex-1 p-4">
          {/* Logo */}
          <div className="mb-2">
            <div className="flex items-center justify-center">
              <div className="flex items-center justify-center p-3 rounded-lg transition-colors">
                <svg
                  id="logo-monochrome"
                  style={{ width: "32px", height: "32px" }}
                  className=""
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                >
                  <g fill="none">
                    <path
                      d="M11.5286 1.87149C11.5769 1.73005 11.5356 1.5733 11.4233 1.47452C11.0472 1.14247 10.0965 0.443125 8.66911 0.339708C7.07054 0.223769 6.08089 0.652279 5.58096 0.969951C5.36531 1.10676 5.35326 1.41748 5.55499 1.57422L9.62723 4.73936C9.98617 5.01807 10.5125 4.8604 10.6591 4.43003L11.5286 1.87149Z"
                      fill="currentColor"
                    ></path>
                    <path
                      d="M1.49017 11.2664C1.32368 11.3781 1.24855 11.584 1.30235 11.7774C1.45724 12.3339 1.91868 13.4919 3.22833 14.5456C4.53797 15.5992 6.08738 15.7128 6.74962 15.6966C6.94764 15.692 7.12016 15.5617 7.17998 15.3724L9.79046 7.11064C9.97875 6.51425 9.31048 6.01386 8.79154 6.3626L1.49017 11.2664Z"
                      fill="currentColor"
                    ></path>
                    <path
                      d="M3.39813 2.54827C3.27013 2.49773 3.12683 2.50607 3.00579 2.57193C2.52256 2.83488 1.28526 3.64506 0.647135 5.30947C0.154627 6.59222 0.328071 8.01085 0.463488 8.70463C0.508009 8.9314 0.747306 9.06218 0.962489 8.97824L8.79485 5.92024C9.35414 5.70181 9.35646 4.91111 8.7981 4.6899L3.39813 2.54827Z"
                      fill="currentColor"
                    ></path>
                    <path
                      d="M15.0167 8.46843C15.243 8.62194 15.5528 8.48652 15.5922 8.21569C15.6961 7.49872 15.7861 6.25076 15.371 5.30933C14.8177 4.05487 13.8786 3.28133 13.433 2.9669C13.292 2.86766 13.1019 2.87786 12.9725 2.99241L10.9959 4.74541C10.6732 5.03154 10.7066 5.54492 11.0636 5.78746L15.0167 8.46936V8.46843Z"
                      fill="currentColor"
                    ></path>
                    <path
                      d="M9.49413 15.1604C9.47372 15.3937 9.67128 15.5866 9.90409 15.5616C10.6531 15.4813 12.1918 15.1841 13.3447 14.0827C14.467 13.0109 14.832 11.7384 14.9382 11.2319C14.9669 11.0951 14.9326 10.9528 14.8445 10.8442L11.3886 6.57909C11.0143 6.11719 10.2681 6.34535 10.2162 6.93757L9.49366 15.1604H9.49413Z"
                      fill="currentColor"
                    ></path>
                  </g>
                </svg>
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
              <SquarePlus size={24} className={`flex-shrink-0 ${location.pathname === '/commit' ? 'text-[#838EF8]' : ''}`} />
              {!collapsed && <span className="ml-3 whitespace-nowrap text-gray-800 dark:text-gray-200">更多</span>}
            </Link>
          </nav>
        </div>
        
        {/* 底部设置按钮 - 固定在底部 */}
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
            <SquarePlus size={24} className={location.pathname === '/commit' ? 'text-[#838EF8]' : ''} />
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
