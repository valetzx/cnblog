import React, { useState, useRef, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Search, X, Kanban, Table, Calendar, Columns } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMissionTags, getAllMissionData } from '@/cnbMission/getMession';
import BoardView from '@/cnbMission/BoardView';

const Mission = () => {
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchKey, setSearchKey] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tags, setTags] = useState([]);
  const [missionData, setMissionData] = useState(null);
  const searchInputRef = useRef(null);

  // 滚动相关状态
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const boardViewContainerRef = useRef(null);
  const scrollThumbRef = useRef(null);

  // 获取missionPath - 使用通配符参数
  const missionPath = params['*'];
  // 获取当前选中的UUID
  const currentUuid = searchParams.get('uuid');
  // 获取当前选中的标签类型
  const currentTag = tags.find(tag => tag.id === currentUuid);
  const currentType = currentTag?.type || 'board';

  // 根据类型获取图标
  const getTypeIcon = (type) => {
    switch (type) {
      case 'board':
        return <Columns size={16} className="mr-1" />;
      case 'table':
        return <Table size={16} className="mr-1" />;
      case 'gantt':
        return <Calendar size={16} className="mr-1" />;
      default:
        return <Kanban size={16} className="mr-1" />;
    }
  };

  // 滚动条交互处理 - 竖向滚动控制BoardView横向滚动
  const handleScrollThumbMouseDown = (e) => {
    e.preventDefault();
    setIsScrolling(true);
    const startY = e.clientY;
    const startScroll = scrollPosition;

    const handleMouseMove = (moveEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const newScrollPosition = Math.max(0, Math.min(100, startScroll + (deltaY / 2)));
      setScrollPosition(newScrollPosition);

      // 控制BoardView的横向滚动
      if (boardViewContainerRef.current) {
        const scrollWidth = boardViewContainerRef.current.scrollWidth - boardViewContainerRef.current.clientWidth;
        const scrollLeft = (newScrollPosition / 100) * scrollWidth;
        boardViewContainerRef.current.scrollLeft = scrollLeft;
      }
    };

    const handleMouseUp = () => {
      setIsScrolling(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // 处理BoardView横向滚动
  const handleBoardViewScroll = () => {
    if (boardViewContainerRef.current && !isScrolling) {
      const { scrollLeft, scrollWidth, clientWidth } = boardViewContainerRef.current;
      const scrollPercentage = scrollWidth > clientWidth ? (scrollLeft / (scrollWidth - clientWidth)) * 100 : 0;
      setScrollPosition(scrollPercentage || 0);
    }
  };

  // 加载看板标签
  useEffect(() => {
    const loadMissionTags = async () => {
      if (!missionPath) {
        console.log('No mission path found');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        console.log('Loading mission tags for:', missionPath);
        const session = localStorage.getItem('CNBSESSION');
        console.log('Session:', session);

        const tagsData = await getMissionTags(missionPath, session);
        console.log('Tags data:', tagsData);
        console.log('Tags data type:', typeof tagsData);

        // 确保tagsData是数组，如果不是则转换为数组
        let processedTags = [];
        if (Array.isArray(tagsData)) {
          processedTags = tagsData;
        } else if (tagsData && typeof tagsData === 'object') {
          // 如果是对象，尝试提取可能的数组字段
          if (Array.isArray(tagsData.views)) {
            processedTags = tagsData.views;
          } else if (Array.isArray(tagsData.data)) {
            processedTags = tagsData.data;
          } else if (Array.isArray(tagsData.items)) {
            processedTags = tagsData.items;
          } else {
            // 如果不是数组，尝试将对象转换为数组
            processedTags = Object.values(tagsData);
          }
        }

        // 过滤掉undefined、null和无效的标签
        processedTags = processedTags.filter(tag =>
          tag && typeof tag === 'object' && tag.id && tag.name
        );

        console.log('Processed tags:', processedTags);

        // 显示所有类型的标签，不进行筛选
        console.log('All tags:', processedTags);

        setTags(processedTags);

        // 如果没有当前选中的UUID，使用第一个标签
        if (!currentUuid && processedTags.length > 0) {
          const firstTag = processedTags[0];
          console.log('Setting first tag as default:', firstTag.id);
          setSearchParams({ uuid: firstTag.id });
        }

      } catch (err) {
        console.error('加载看板标签错误:', err);
        setError(err.message || '加载标签失败');
      } finally {
        setIsLoading(false);
      }
    };

    loadMissionTags();
  }, [missionPath, setSearchParams]);

  // 加载看板数据（当UUID或missionPath变化时）
  useEffect(() => {
    const loadMissionData = async () => {
      if (!missionPath || !currentUuid) {
        console.log('No mission path or UUID found');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        console.log('Loading mission data for:', missionPath, 'UUID:', currentUuid);
        const session = localStorage.getItem('CNBSESSION');

        // 获取当前标签以确定类型
        const currentTag = tags.find(tag => tag.id === currentUuid);
        const type = currentTag?.type || 'board';

        const data = await getAllMissionData(missionPath, currentUuid, type, null, session);
        console.log('Mission data loaded:', data);

        setMissionData(data);

      } catch (err) {
        console.error('加载看板数据错误:', err);
        setError(err.message || '加载数据失败');
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUuid && tags.length > 0) {
      loadMissionData();
    }
  }, [missionPath, currentUuid, tags]);

  // 处理标签点击
  const handleTagClick = (tag) => {
    console.log('Tag clicked:', tag.id);
    setSearchParams({ uuid: tag.id });
  };

  // 处理搜索清除
  const handleSearchClear = () => {
    setSearchKey('');
    setIsSearchExpanded(false);
  };

  // 处理搜索图标点击
  const handleSearchIconClick = () => {
    setIsSearchExpanded(true);
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 100);
  };

  // 渲染看板内容
  const renderMissionContent = () => {
    if (!missionData) {
      return (
        <div className="text-gray-500 dark:text-gray-400">
          <div className="text-lg mb-2">选择看板标签查看详情</div>
          <div className="text-sm">点击上方的标签按钮加载数据</div>
        </div>
      );
    }

    const { config, data, fieldConfigs } = missionData;

    // 合并issues和pull_requests作为任务数据
    const allResources = [...(data?.issues || []), ...(data?.pull_requests || [])];
    const totalCount = allResources.length;

    // 根据视图类型渲染不同的内容
    if (currentType === 'board') {
      return (
        <BoardView
          ref={boardViewContainerRef}
          config={config}
          data={data}
          fieldConfigs={fieldConfigs}
        />
      );
    }

    // 默认视图（表格或其他类型）
    return (
      <div className="text-left">
        <div className="">
          {config?.description && (
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              {config.description}
            </p>
          )}
        </div>

        {/* 数据统计 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-700 p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500 dark:text-gray-400">总任务数</div>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {totalCount || 0}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-700 p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500 dark:text-gray-400">字段数量</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {fieldConfigs?.length || 0}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-700 p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500 dark:text-gray-400">视图类型</div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {currentType}
            </div>
          </div>
        </div>

        {/* 任务列表预览 */}
        {allResources.length > 0 && (
          <div className="bg-white dark:bg-slate-700 rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 dark:bg-slate-600 border-b border-gray-200 dark:border-slate-500">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                任务列表 ({totalCount})
              </h3>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-slate-500">
              {allResources.slice(0, 5).map((resource, index) => (
                <div key={index} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {resource.title || `任务 ${index + 1}`}
                      </h4>
                      {resource.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                          {resource.description}
                        </p>
                      )}
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        #{index + 1}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {allResources.length > 5 && (
              <div className="px-4 py-3 bg-gray-50 dark:bg-slate-600 border-t border-gray-200 dark:border-slate-500">
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  还有 {allResources.length - 5} 个任务...
                </div>
              </div>
            )}
          </div>
        )}

        {allResources.length === 0 && (
          <div className="bg-white dark:bg-slate-700 rounded-lg shadow p-8 text-center">
            <div className="text-gray-500 dark:text-gray-400">
              <div className="text-lg mb-2">暂无任务数据</div>
              <div className="text-sm">该看板目前没有任务</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <div className="text-gray-500">加载中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-2">加载失败</div>
          <div className="text-gray-500 text-sm mb-4">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-2 sm:p-4 pb-10 relative">
      <div className="mx-auto">
        {/* 标签过滤器 */}
        <div className="mb-4 w-full overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
          <div className="flex space-x-2 min-w-max">
            {/* 搜索按钮 */}
            {isSearchExpanded ? (
              <form className="flex items-center">
                <div className="relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchKey}
                    onChange={(e) => setSearchKey(e.target.value)}
                    placeholder="搜索任务内容..."
                    className="px-3 py-1.5 text-sm rounded-full border border-gray-300 dark:border-gray-600 focus:outline-none pr-8"
                    style={{ width: '200px' }}
                  />
                  <button
                    type="button"
                    onClick={handleSearchClear}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    <X size={16} />
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={handleSearchIconClick}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors flex items-center",
                  "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700"
                )}
              >
                <Search size={16} className="mr-1" />
                搜索
              </button>
            )}

            {/* 看板标签按钮 */}
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => handleTagClick(tag)}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors flex items-center",
                  currentUuid === tag.id
                    ? "bg-indigo-500 text-white"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700"
                )}
              >
                {getTypeIcon(tag.type)}
                {tag.name}
              </button>
            ))}
          </div>
        </div>

        {/* 内容区域 */}
        <div
          className="mission-content-container"
          style={{ overflowY: 'hidden', maxHeight: 'none' }}
        >
          {renderMissionContent()}
        </div>
      </div>

      {/* 透明竖向悬浮滚动条 */}
      <div className="mission-vertical-scrollbar">
        <div className="scrollbar-track">
          <div
            ref={scrollThumbRef}
            className="scrollbar-thumb"
            style={{ top: `${scrollPosition}%`, transform: 'translateX(-50%)' }}
            onMouseDown={handleScrollThumbMouseDown}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default Mission;
