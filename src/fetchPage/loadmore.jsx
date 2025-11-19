import React, { useState, useEffect, useCallback } from 'react';
import { saveLoadMoreIssues, getLoadMoreIssuesFromCache, isPageCached, getMaxCachedPage } from './indexedDB';
import { LoadingSpinner } from '@/fetchPage/LoadingSpinner';

// 加载更多组件
export const useLoadMore = (settings, issues, setIssues, closedIssues, setClosedIssues, allIssues, setAllIssues) => {
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [maxCachedPage, setMaxCachedPage] = useState(0);
  const [retryCount, setRetryCount] = useState(0); // 重试计数器
  const [showExtendedLoading, setShowExtendedLoading] = useState(false);

  // 检查是否到达页面底部
  const checkScrollBottom = useCallback(() => {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
    const clientHeight = document.documentElement.clientHeight || window.innerHeight;

    // 距离底部100px时触发加载
    return scrollTop + clientHeight >= scrollHeight - 100;
  }, []);

  // 检查是否有可用的缓存页面
  const checkAvailableCachePages = useCallback(async () => {
    if (!settings.baseRepo) return 0;

    try {
      const maxPage = await getMaxCachedPage(settings.baseRepo);
      setMaxCachedPage(maxPage);
      return maxPage;
    } catch (error) {
      return 0;
    }
  }, [settings.baseRepo]);

  // 计算当前加载超时时间
  const getLoadingTimeout = useCallback(() => {
    if (retryCount === 0) return 0; // 第一次不延迟
    if (retryCount === 1) return 6000; // 第二次失败后延迟6秒
    return 12000; // 第三次及以后失败后延迟12秒
  }, [retryCount]);

  // 加载更多数据
  const loadMoreData = useCallback(async () => {
    if (loadingMore || !hasMore || !settings.baseRepo) return;

    setLoadingMore(true);
    const nextPage = currentPage + 1;

    try {
      // 首先检查缓存中是否有该页面数据
      const isCached = await isPageCached(settings.baseRepo, nextPage);
      let newOpenIssues = [];
      let newClosedIssues = [];

      if (isCached) {
        // 从缓存获取数据
        const cachedIssues = await getLoadMoreIssuesFromCache(settings.baseRepo, nextPage);
        // 分离开启和关闭状态的问题
        newOpenIssues = cachedIssues.filter(issue => issue.state === 'open');
        newClosedIssues = cachedIssues.filter(issue => issue.state === 'closed');
      } else {
        // 从API获取开启状态的问题
        const openResponse = await fetch(
          `${settings.apiUrl}/${settings.baseRepo}/-/issues?page=${nextPage}&page_size=${settings.sizeNum}`,
          {
            headers: {
              'accept': 'application/json',
              'Authorization': `Bearer ${settings.cnbToken}`
            }
          }
        );

        // 从API获取关闭状态的问题
        const closedResponse = await fetch(
          `${settings.apiUrl}/${settings.baseRepo}/-/issues?page=${nextPage}&page_size=${settings.sizeNum}&state=closed`,
          {
            headers: {
              'accept': 'application/json',
              'Authorization': `Bearer ${settings.cnbToken}`
            }
          }
        );

        if (!openResponse.ok) {
          throw new Error(`HTTP error! status: ${openResponse.status}`);
        }

        if (!closedResponse.ok) {
          throw new Error(`HTTP error! status: ${closedResponse.status}`);
        }

        newOpenIssues = await openResponse.json();
        newClosedIssues = await closedResponse.json();

        // 保存到缓存（合并开启和关闭状态的问题）
        const allNewIssues = [...newOpenIssues, ...newClosedIssues];
        if (allNewIssues.length > 0) {
          await saveLoadMoreIssues(settings.baseRepo, nextPage, allNewIssues);
          // 更新最大缓存页面
          if (nextPage > maxCachedPage) {
            setMaxCachedPage(nextPage);
          }
        }
      }

      if (newOpenIssues.length > 0 || newClosedIssues.length > 0) {
        // 更新所有状态
        setIssues(prev => [...prev, ...newOpenIssues]);
        setClosedIssues(prev => [...prev, ...newClosedIssues]);
        setAllIssues(prev => [...prev, ...newOpenIssues, ...newClosedIssues]);
        setCurrentPage(nextPage);
        setRetryCount(0); // 重置重试计数器
        setShowExtendedLoading(false); // 重置延长加载状态
      } else {
        // 没有更多数据
        setHasMore(false);
        setRetryCount(0); // 重置重试计数器
        setShowExtendedLoading(false); // 重置延长加载状态
      }
    } catch (error) {
      // 加载更多数据失败，增加重试计数
      const newRetryCount = retryCount + 1;
      setRetryCount(newRetryCount);

      // 如果重试次数超过3次，停止加载
      if (newRetryCount >= 3) {
        setHasMore(false);
        setShowExtendedLoading(false);
      } else {
        // 设置延长加载状态
        setShowExtendedLoading(true);

        // 设置超时后自动重置加载状态
        const timeout = getLoadingTimeout();
        if (timeout > 0) {
          setTimeout(() => {
            setLoadingMore(false);
            setShowExtendedLoading(false);
          }, timeout);
        } else {
          setLoadingMore(false);
        }
      }
    }
  }, [loadingMore, hasMore, currentPage, settings, setIssues, setClosedIssues, setAllIssues, maxCachedPage, retryCount, getLoadingTimeout]);

  // 监听滚动事件
  useEffect(() => {
    const handleScroll = () => {
      if (checkScrollBottom() && hasMore && !loadingMore) {
        loadMoreData();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [checkScrollBottom, hasMore, loadingMore, loadMoreData]);

  // 初始化时检查缓存页面信息
  useEffect(() => {
    const initializeCacheInfo = async () => {
      if (!settings.baseRepo) return;

      try {
        // 获取已缓存的最大页面
        const maxPage = await getMaxCachedPage(settings.baseRepo);
        setMaxCachedPage(maxPage);

        // 如果有缓存数据，设置当前页面为最大缓存页面
        if (maxPage > 0) {
          setCurrentPage(maxPage);
        }
      } catch (error) {
        // 初始化缓存信息失败
      }
    };

    initializeCacheInfo();
  }, [settings.baseRepo]);

  // 重置状态当仓库或设置改变时
  useEffect(() => {
    setCurrentPage(1);
    setHasMore(true);
    setLoadingMore(false);
    setMaxCachedPage(0);
    setRetryCount(0);
    setShowExtendedLoading(false);
  }, [settings.baseRepo, settings.sizeNum]);

  return { loadingMore: loadingMore || showExtendedLoading, hasMore, retryCount };
};

// 加载更多指示器组件
export const LoadMoreIndicator = ({ loadingMore, hasMore, retryCount = 0 }) => {
  // 获取备案信息
  const beiAn = import.meta.env.VITE_BEI_AN;

  if (!hasMore) {
    // 如果没有更多内容，显示备案信息（如果存在）
    return (
      <div className="text-center py-4">
        <div className="text-gray-500 mb-2">刷新页面获取更多</div>
        {beiAn && (
          <a
            href="https://beian.miit.gov.cn/#/Integrated/recordQuery"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            {beiAn}
          </a>
        )}
      </div>
    );
  }

  // 根据重试次数显示不同的加载消息
  const getLoadingMessage = () => {
    if (retryCount === 0) return "加载中...";
    if (retryCount === 1) return "正在重试加载 (6秒)...";
    return "正在重试加载 (12秒)...";
  };

  return (
    <div className="text-center py-4">
      {loadingMore ? (
        <div className="flex flex-col items-center justify-center">
          <LoadingSpinner message={getLoadingMessage()} />
        </div>
      ) : (
        <div className="text-gray-500">
          {beiAn ? (
            <a
              href="https://beian.miit.gov.cn/#/Integrated/recordQuery"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#838EF8]"
            >
              {beiAn}
            </a>
          ) : (
            "滚动加载更多"
          )}
        </div>
      )}
    </div>
  );
};
