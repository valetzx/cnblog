import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';

const defaultPinnedArticles = [
  {
    id: 1,
    title: '欢迎使用 CNB 云原生构建',
    link: '/#/long/01101000%2001110100%2001110100%2001110000%2001110011%2000111010%2000101111%2000101111%2001100011%2001101110%2001100010%2000101110%2001100011%2001101111%2001101111%2001101100%2000101111',
  },
  {
    id: 2,
    title: '查看文档',
    link: 'https://docs.cnb.cool',
  },
  {
    id: 3,
    title: '常见问题解答',
    link: '/#/ideas',
  },
];

const PinnedArticleCard = ({ article, onClick }) => {
  const [pinnedArticles, setPinnedArticles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // 从 localStorage 中读取 homepageData
    const homepageData = localStorage.getItem('homepageData');

    // 解析 homepageData 并筛选 state=open 的条目
    let randomOpenItem = null;
    if (homepageData) {
      try {
        const parsedHomepageData = JSON.parse(homepageData);
        if (Array.isArray(parsedHomepageData.issues)) {
          const openItems = parsedHomepageData.issues.filter(item => item.state === 'open');
          if (openItems.length > 0) {
            randomOpenItem = openItems[Math.floor(Math.random() * openItems.length)];
          }
        }
      } catch (error) {
        console.error('Failed to parse homepageData from localStorage', error);
      }
    }

    // 合并默认数据和随机条目
    const mergedPinnedArticles = [...defaultPinnedArticles];
    if (randomOpenItem) {
      mergedPinnedArticles.push({
        id: Date.now(), // 使用时间戳作为唯一 ID
        title: randomOpenItem.title,
        link: `/#/info/${randomOpenItem.number}`,
      });
    }

    setPinnedArticles(mergedPinnedArticles);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % pinnedArticles.length);
        setIsAnimating(false);
      }, 500); // 动画持续时间
    }, 5000); // 5秒切换一次
    return () => clearInterval(interval);
  }, [pinnedArticles.length]);

  if (!pinnedArticles.length) return null;

  const currentArticle = pinnedArticles[currentIndex];

  const handleClick = () => {
    if (onClick) {
      onClick(currentArticle);
    } else if (currentArticle.link) {
      window.open(currentArticle.link, '_blank');
    }
  };

  return (
    <Card className="mb-4 overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={handleClick}>
      <CardContent className="p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full mr-2"></div>
          <div className="text-sm font-medium text-gray-500 mr-4">置顶</div>
          <div className="flex-1 min-w-0">
            <div
              className={`truncate text-sm font-medium text-gray-900 dark:text-gray-100 transition-opacity duration-300 ${
                isAnimating ? 'opacity-0' : 'opacity-100'
              }`}
            >
              {currentArticle.title}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PinnedArticleCard;
export { defaultPinnedArticles };
