import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';

const TopBar = () => {
  const [pinnedArticles, setPinnedArticles] = useState([]);
  const [currentArticleIndex, setCurrentArticleIndex] = useState(0);

  // 从本地存储加载置顶文章
  useEffect(() => {
    const savedPinnedArticles = localStorage.getItem('pinnedArticles');
    if (savedPinnedArticles) {
      try {
        const parsedArticles = JSON.parse(savedPinnedArticles);
        setPinnedArticles(parsedArticles);
      } catch (e) {
        console.error('解析置顶文章数据失败', e);
      }
    }
  }, []);

  // 轮播效果
  useEffect(() => {
    if (pinnedArticles.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentArticleIndex((prevIndex) => 
        (prevIndex + 1) % pinnedArticles.length
      );
    }, 5000); // 每5秒切换一次

    return () => clearInterval(interval);
  }, [pinnedArticles.length]);

  if (pinnedArticles.length === 0) {
    return null;
  }

  const currentArticle = pinnedArticles[currentArticleIndex];

  return (
    <Card className="mb-4 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full mr-2"></div>
          <div className="text-sm font-medium text-gray-500 mr-4">置顶</div>
          <div className="flex-1 min-w-0">
            <div className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
              {currentArticle.title}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TopBar;
