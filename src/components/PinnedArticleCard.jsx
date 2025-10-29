import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';

// 特定ID对应的图片URL映射
const specialArticleImages = {
  1: 'https://m.wbiao.cn/mallapi/wechat/picReverseUrl?url=https://cnb.cool/valetzx/ai/img/-/git/raw/main/4.png',
  2: 'https://m.wbiao.cn/mallapi/wechat/picReverseUrl?url=https://cnb.cool/valetzx/ai/img/-/git/raw/main/5.png'
};

const defaultPinnedArticles = [
  {
    id: 1,
    title: '祝1024程序员节日快乐',
    link: 'https://cnb.hsred.cn',
  },
  {
    id: 2,
    title: '欢迎使用 CNB 云原生构建',
    link: '/#/long/01101000%2001110100%2001110100%2001110000%2001110011%2000111010%2000101111%2000101111%2001100011%2001101110%2001100010%2000101110%2001100011%2001101111%2001101111%2001101100%2000101111',
  },
  {
    id: 3,
    title: '查看文档',
    link: 'https://docs.cnb.cool',
  },
  {
    id: 4,
    title: '常见问题解答',
    link: '/#/ideas',
  },
];

const PinnedArticleCard = ({ article, onClick }) => {
  const [pinnedArticles, setPinnedArticles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentImageId, setCurrentImageId] = useState(null);

  useEffect(() => {
    // 预加载所有特殊图片，添加缓存控制参数
    Object.values(specialArticleImages).forEach(imageUrl => {
      const img = new Image();
      img.src = imageUrl + (imageUrl.includes('?') ? '&' : '?') + 'cache=' + Date.now();
    });

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
      // 从localStorage获取设置
      const savedSettings = localStorage.getItem('settingsData');
      const settings = savedSettings ? JSON.parse(savedSettings) : {
        baseRepo: import.meta.env.VITE_BASE_REPO || ''
      };

      mergedPinnedArticles.push({
        id: Date.now(), // 使用时间戳作为唯一 ID
        title: randomOpenItem.title,
        link: `/#/info/${randomOpenItem.number}/${settings.baseRepo}`,
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

  // 监听当前文章变化，处理图片
  useEffect(() => {
    const currentArticle = pinnedArticles[currentIndex];
    if (currentArticle && specialArticleImages[currentArticle.id]) {
      setCurrentImageId(currentArticle.id);
    } else {
      setCurrentImageId(null);
    }
  }, [pinnedArticles, currentIndex]);

  if (!pinnedArticles.length) return null;

  const currentArticle = pinnedArticles[currentIndex];
  const hasSpecialImage = specialArticleImages[currentArticle.id];

  const handleClick = () => {
    if (onClick) {
      onClick(currentArticle);
    } else if (currentArticle.link) {
      window.open(currentArticle.link, '_blank');
    }
  };

  return (
    <Card className="mb-4 overflow-hidden cursor-pointer hover:shadow-md transition-shadow relative" onClick={handleClick}>
      <CardContent className="p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full mr-2"></div>
          <div className="text-sm font-medium text-gray-500 mr-4">置顶</div>
          <div className="flex-1 min-w-0">
            <div
              className={`truncate text-sm font-medium text-gray-900 dark:text-gray-100 transition-opacity duration-500 ${
                isAnimating ? 'opacity-0' : 'opacity-100'
              }`}
            >
              {currentArticle.title}
            </div>
          </div>
        </div>
      </CardContent>

      {/* 渐变图片效果 - 完全与文字同步 */}
      {currentImageId && (
        <div
          className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-transparent to-white/90 dark:to-gray-900/90"
          style={{
            maskImage: `linear-gradient(to right, transparent 0%, black 100%)`,
            WebkitMaskImage: `linear-gradient(to right, transparent 0%, black 100%)`
          }}
        >
          <img
            src={specialArticleImages[currentImageId]}
            alt=""
            className={`w-full h-full object-cover transition-opacity duration-500 ${
              isAnimating ? 'opacity-0' : 'opacity-90'
            }`}
            style={{
              maskImage: `linear-gradient(to right, transparent 0%, black 100%)`,
              WebkitMaskImage: `linear-gradient(to right, transparent 0%, black 100%)`
            }}
          />
        </div>
      )}
    </Card>
  );
};

export default PinnedArticleCard;
export { defaultPinnedArticles };
