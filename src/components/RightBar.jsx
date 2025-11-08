import React, { useState, useEffect, useRef } from 'react';
import { List, ChevronLeft, Pin, RefreshCw, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import CnbLogo from '@/cnbUtils/cnbLogo';

// 目录项组件
const TocItem = ({ level, text, onClick, isActive }) => {
  const paddingLeft = level * 12; // 根据层级增加缩进

  return (
    <div
      className={`cursor-pointer py-1 px-2 rounded-md transition-colors ${
        isActive
          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
          : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300'
      }`}
      style={{ paddingLeft: `${paddingLeft}px` }}
      onClick={onClick}
    >
      <span className="text-sm font-medium truncate">{text}</span>
    </div>
  );
};

// 独立的目录组件
const TableOfContents = ({ headings, onHeadingClick, onPinClick, isCollapsed }) => {
  const [activeHeading, setActiveHeading] = useState('');

  // 独立的滚动监听，不影响父组件
  useEffect(() => {
    if (headings.length === 0) return;

    let timeoutId = null;
    let lastActiveHeading = '';

    const handleScroll = () => {
      // 使用防抖减少频繁触发
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        const scrollPosition = window.scrollY + 100;
        let currentActive = '';

        for (let i = headings.length - 1; i >= 0; i--) {
          const element = document.getElementById(headings[i].id);
          if (element && element.offsetTop <= scrollPosition) {
            currentActive = headings[i].id;
            break;
          }
        }

        // 只有当激活的标题确实发生变化时才更新状态
        if (currentActive !== lastActiveHeading) {
          lastActiveHeading = currentActive;
          setActiveHeading(currentActive);
        }
      }, 100); // 100ms防抖延迟
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [headings]);

  if (!headings || headings.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <List size={16} className="text-indigo-500 mr-2" />
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">目录</h3>
        </div>
        {/* 折叠/展开按钮 - 显示在目录文字末尾 */}
        <button
          onClick={onPinClick}
          className={`p-1 transition-colors ${
            !isCollapsed
              ? 'text-indigo-500'
              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
          }`}
        >
          <Pin size={16} className={`transition-transform ${isCollapsed ? '' : 'rotate-45'}`} />
        </button>
      </div>
      <div className="space-y-1 max-h-96 overflow-y-auto">
        {headings.map((heading, index) => (
          <TocItem
            key={index}
            level={heading.level}
            text={heading.text}
            isActive={activeHeading === heading.id}
            onClick={() => {
              const element = document.getElementById(heading.id);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
                setActiveHeading(heading.id);
              }
              if (onHeadingClick) {
                onHeadingClick(heading.id);
              }
            }}
          />
        ))}
      </div>
    </div>
  );
};

// 提取标题的函数
export const extractHeadings = (body) => {
  if (!body) return [];

  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const matches = [];
  let match;

  while ((match = headingRegex.exec(body)) !== null) {
    const level = match[1].length; // # 的数量表示层级
    const text = match[2].trim();
    const id = text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-');

    matches.push({
      level,
      text,
      id
    });
  }

  return matches;
};

// 翻转卡片组件
const FlipCard = () => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      className="relative w-full h-20 cursor-pointer"
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
    >
      {/* 卡片容器 */}
      <div className={`absolute inset-0 w-full h-full transition-transform duration-500 transform ${
        isFlipped ? 'rotate-y-180' : ''
      }`}>
        {/* 正面 */}
        <div className={`absolute inset-0 w-full h-full bg-[#FF5C35] rounded-lg flex flex-col justify-center text-white font-medium ${
          isFlipped ? 'opacity-0' : 'opacity-100'
        } transition-opacity duration-300`}>
          <div className="px-4">
            <div className="flex items-center mb-2">
              <h3 className="text-lg font-bold mr-2">公众号</h3>
              <div className="bg-white text-[#FF5C35] rounded px-2 py-0.5 text-xs font-semibold">
                微信
              </div>
            </div>
            <h4 className="text-sm font-normal">
              快人一步获取最新内容 ▶
            </h4>
          </div>
          {/* 右半边的CnbLogo - 用于动画 */}
          <div className="absolute right-2 top-0 bottom-0 w-1/3 flex items-center justify-center">
            <CnbLogo
              className={`text-white/80 transition-all duration-500 ${
                isFlipped
                  ? 'scale-50 text-[#FF5C35] translate-x-[-60px] translate-y-[-10px] z-50'
                  : ''
              }`}
              style={{
                filter: "blur(1.5px)",
                width: "48px",
                height: "48px"
              }}
            />
          </div>
        </div>

        {/* 反面 */}
        <div className={`absolute inset-0 w-full h-full bg-[#FF5C35] rounded-lg flex flex-col justify-center text-white font-medium transform rotate-y-180 ${
          isFlipped ? 'opacity-100' : 'opacity-0'
        } transition-opacity duration-300`}>
          <div className="px-4">
            <div className="flex items-center mb-2">
              <h3 className="text-lg font-bold mr-2">扫一扫</h3>
            </div>
            <h4 className="text-sm font-normal">
              不错过精彩文章 ▶
            </h4>
          </div>
          {/* 在 CnbLogo 上方添加圆角图片 */}
          <div className="absolute right-2 top-2 w-1/3 flex items-center justify-center">
            <img
              src="https://m.wbiao.cn/mallapi/wechat/picReverseUrl?url=https://cnb.cool/cnb/feedback/-/imgs/KqBEytcuU2y1S28sfn9VgD/05e2dd68-d5b7-467c-bf24-945eb8397dd7.png"
              alt="公众号二维码"
              className="w-16 h-16 rounded-sm object-cover"
            />
            {/* 动画logo的目标位置 - 在二维码中间 */}
            <div className="absolute inset-0 m-auto w-4 h-4 bg-white rounded-sm flex items-center justify-center">
              <CnbLogo
                className={`text-[#FF5C35] transition-all duration-500 ${
                  isFlipped
                    ? 'opacity-100 scale-75'
                    : 'opacity-0 scale-50'
                }`}
                style={{
                  width: "16px",
                  height: "16px"
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 新增的 Issue 卡片组件
const IssueCard = () => {
  const [issues, setIssues] = useState([]);
  const [randomTitle, setRandomTitle] = useState('');
  const [settings, setSettings] = useState({ baseRepo: '' });
  const [isRefreshing, setIsRefreshing] = useState(false); 
  const [selectedLabel, setSelectedLabel] = useState(''); 
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 刷新随机标题的函数
  const refreshRandomTitle = () => {
    setIsRefreshing(true); // 开始刷新动画
    setError(null);

    const homepageData = localStorage.getItem('homepageData');
    if (homepageData) {
      try {
        const parsedData = JSON.parse(homepageData);
        const allIssues = parsedData.allIssues || parsedData.issues || [];

        // 获取所有不重复的标签
        const allLabels = [...new Set(allIssues.flatMap(issue =>
          issue.labels ? issue.labels.map(label => label.name) : []
        ))];

        if (allLabels.length > 0) {
          // 随机选择一个标签
          const randomIndex = Math.floor(Math.random() * allLabels.length);
          const selectedLabelName = allLabels[randomIndex];
          setRandomTitle(selectedLabelName);
          setSelectedLabel(selectedLabelName);

          // 筛选包含该标签的issue
          const filteredIssues = allIssues.filter(issue =>
            issue.labels && issue.labels.some(label => label.name === selectedLabelName)
          );

          setIssues(filteredIssues.slice(0, 5)); // 只显示前5个
        } else {
          setIssues(allIssues.slice(0, 5)); // 如果没有标签，显示所有issue的前5个
          setRandomTitle('热门讨论');
        }
      } catch (error) {
        console.error('解析 homepageData 数据失败:', error);
        setError('数据解析失败');
      }
    } else {
      setError('暂无数据');
    }

    // 500ms后停止动画
    setTimeout(() => {
      setIsRefreshing(false);
      setIsLoading(false);
    }, 500);
  };

  useEffect(() => {
    refreshRandomTitle();

    // 监听localStorage变化
    const handleStorageChange = (e) => {
      if (e.key === 'homepageData' || e.key === 'settingsData') {
        refreshRandomTitle();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // 从 localStorage 获取 settings 数据
  useEffect(() => {
    const settingsData = localStorage.getItem('settingsData');
    if (settingsData) {
      try {
        const parsedSettings = JSON.parse(settingsData);
        setSettings(parsedSettings);
      } catch (error) {
        console.error('解析 settings 数据失败:', error);
      }
    }
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700 mt-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <Tag size={16} className="text-indigo-500 mr-2" />
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">加载中...</h3>
          </div>
        </div>
        <div className="space-y-2">
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-gray-200 dark:bg-slate-600 rounded"></div>
              <div className="h-4 bg-gray-200 dark:bg-slate-600 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700 mt-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <Tag size={16} className="text-indigo-500 mr-2" />
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">更多标签</h3>
          </div>
          <button
            onClick={refreshRandomTitle}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="刷新"
          >
            <RefreshCw
              size={16}
              className={`transition-transform duration-500 ${isRefreshing ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700 mt-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <Tag size={16} className="text-indigo-500 mr-2" />
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">更多标签</h3>
          </div>
          <button
            onClick={refreshRandomTitle}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="刷新"
          >
            <RefreshCw
              size={16}
              className={`transition-transform duration-500 ${isRefreshing ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
          <p className="text-sm">暂无更多内容</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700 mt-2">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
        <Tag size={16} className="text-indigo-500 mr-2" />
        <h3 className="font-semibold text-gray-800 dark:text-gray-200">
          {randomTitle || '热门讨论'}
        </h3>
        </div>
        {/* 刷新按钮 */}
        <button
          onClick={refreshRandomTitle}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          title="刷新标签"
        >
          <RefreshCw
            size={16}
            className={`transition-transform duration-500 ${isRefreshing ? 'animate-spin' : ''}`}
          />
        </button>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {issues.map((issue, index) => (
          <Link
            key={index}
            to={`/info/${issue.number}/${settings.baseRepo}`}
            className="flex flex-col h-full p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-2">
              {issue.title}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

const RightBar = ({
  headings = [],
  onHeadingClick,
  children
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const rightBarRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  // 检测窗口宽度，只在较小屏幕时自动隐藏
  useEffect(() => {
    const checkWindowSize = () => {
      const windowWidth = window.innerWidth;
      // 当窗口宽度小于1300px时自动隐藏右侧栏（更宽松的阈值）
      setIsCollapsed(windowWidth < 1300);
    };

    // 初始检查
    checkWindowSize();

    // 监听窗口大小变化
    window.addEventListener('resize', checkWindowSize);

    return () => {
      window.removeEventListener('resize', checkWindowSize);
    };
  }, []);

  // 处理鼠标进入右侧边缘
  const handleRightEdgeHover = () => {
    if (isCollapsed) {
      setIsHovering(true);
      // 清除之前的超时
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    }
  };

  // 处理鼠标离开
  const handleMouseLeave = () => {
    if (isCollapsed) {
      // 设置延迟隐藏
      hoverTimeoutRef.current = setTimeout(() => {
        setIsHovering(false);
      }, 300);
    }
  };

  // 处理鼠标进入右侧栏
  const handleRightBarEnter = () => {
    // 清除隐藏超时
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  };

  // 清理超时
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      {/* 右侧边缘悬停区域 - 只在折叠时显示 */}
      {isCollapsed && (
        <div
          className="fixed right-0 top-0 h-full w-12 z-50 cursor-pointer"
          onMouseEnter={handleRightEdgeHover}
          onMouseLeave={handleMouseLeave}
        />
      )}

      {/* 右侧栏内容 - 始终使用悬浮模式样式 */}
      <div
        ref={rightBarRef}
        className={`transition-all duration-300 fixed right-4 top-0 h-screen z-40 transform w-80 max-w-sm ${
          isCollapsed
            ? isHovering
              ? 'opacity-100 translate-x-0'
              : 'opacity-0 translate-x-8 pointer-events-none'
            : 'opacity-100 translate-x-0'
        } p-4 overflow-y-auto`}
        onMouseEnter={handleRightBarEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* 目录区域 */}
        <TableOfContents
          headings={headings}
          onHeadingClick={onHeadingClick}
          onPinClick={() => setIsCollapsed(!isCollapsed)}
          isCollapsed={isCollapsed}
        />

        {/* 翻转卡片 - 独立的卡片，位于目录下方 */}
        <div className="mt-2">
          <FlipCard />
        </div>

        {/* 新增的 Issue 卡片 */}
        <IssueCard />

        {/* 其他右侧栏内容 */}
        {children}
      </div>
    </>
  );
};

export default RightBar;
