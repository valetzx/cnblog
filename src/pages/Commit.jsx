import TagFilter from '@/components/TagFilter';
import { CardContent, CardHeader, Card, CardTitle } from '@/components/ui/card';
import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import ImagePreview from '@/components/ImagePreview';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import MovieCard from "./movieCard.jsx";
import CachedAvatar from '@/components/CachedAvatar';
import { Link } from 'react-router-dom';

const Commit = () => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [selectedTag, setSelectedTag] = useState('all');
  const [searchResults, setSearchResults] = useState('all');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewImages, setPreviewImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showMovieCard, setShowMovieCard] = useState(true);
  const [showComments, setShowComments] = useState(true);

  // 处理图片点击事件 - 移动到组件顶层作用域
  const handleImageClick = (images, index) => {
    setPreviewImages(images);
    setCurrentImageIndex(index);
    setIsPreviewOpen(true);
  };

  const loadComments = async () => {
    // 防止重复加载
    if (loading) return;

    setLoading(true);
    setError(null);
    const apiUrl = `${import.meta.env.VITE_API_URL}/wss/apps/cnb-room/-/issues/3/comments?page=1&page_size=20`;
    const existingIds = new Set(cards.filter(c => c.commentId).map(c => c.commentId));

    try {
      const res = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_CNB_TOKEN}`
        },
        mode: 'cors'
      });
      if (!res.ok) throw new Error(`HTTP错误: ${res.status} ${res.statusText}`);
      const data = await res.json();
      let updated = false;
      const newCards = [...cards];

      data.forEach(c => {
        if (existingIds.has(c.id)) return;
        let body = c.body || '';
        const images = [];
        // 修复图片提取逻辑
        body = body.replace(/<img(?=[^>]*class="[^"]*cnb-md-image__upload[^"]*")(?=[^>]*src="([^"]+)")[^>]*>/g, (_, src) => {
          images.push(`https://images.weserv.nl?url=https://cnb.cool${src}`);
          return '';
        });
        // 处理其他图片
        body = body.replace(/<img[^>]*src="([^"]+)"[^>]*>/g, (_, src) => {
          images.push(src);
          return '';
        });
        body = body.replace(/<[^>]+>/g, '');
        
        newCards.push({
          commentId: c.id,
          title: c.author?.nickname || c.author?.username || '匿名用户',
          username: c.author?.username || 'anonymous',
          description: body.trim() || '无文本内容',
          tags: ['评论'],
          images,
          createdAt: c.created_at
        });
        updated = true;
      });
      

      if (updated) {
        // 按创建时间排序，最新的在前
        newCards.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setCards(newCards);
        // 将数据存储在 localStorage 中
        localStorage.setItem('commitpageData', JSON.stringify(newCards));
      } else if (initialLoad) {
        setError('没有评论可加载');
      } else {
        setError('没有新的评论可加载');
      }

      setInitialLoad(false);
    } catch (err) {
      setError(`加载失败: ${err.message}`);
      setInitialLoad(false);
    } finally {
      setLoading(false);
    }
  };

  // 页面加载时自动获取评论
  useEffect(() => {
    // 尝试从 localStorage 中读取数据
    const cachedData = localStorage.getItem('commitpageData');
    if (cachedData) {
      setCards(JSON.parse(cachedData));
      setInitialLoad(false);
    } else {
      loadComments();
    }
  }, []);

  // 处理搜索结果的回调函数
  const handleSearchResults = useCallback((results) => {
    setSearchResults(results);
  }, []);

  // 从卡片中提取所有标签
  const getAllTags = () => {
    // 安全地从 localStorage 中读取数据
    let commitpageData = [];
    
    try {
      const commitData = localStorage.getItem('commitpageData');
      if (commitData) {
        const parsed = JSON.parse(commitData);
        commitpageData = Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.error('解析 localStorage 数据失败:', error);
      commitpageData = [];
    }
    
    const allCards = [...commitpageData];
    const tags = allCards.flatMap(card => card.tags || []);
    return [...new Set(tags)].filter(tag => tag);
  };

  // 根据标签和搜索结果筛选卡片
  const getFilteredCards = () => {
    // 如果有搜索结果且不是'all'，直接使用搜索结果
    if (searchResults !== 'all') {
      return searchResults;
    }

    // 安全地从 localStorage 中读取数据
    let commitpageData = [];
    
    try {
      const commitData = localStorage.getItem('commitpageData');
      if (commitData) {
        const parsed = JSON.parse(commitData);
        commitpageData = Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.error('解析 localStorage 数据失败:', error);
      commitpageData = [];
    }
    
    let filtered = [...commitpageData];

    // 标签筛选
    if (selectedTag !== 'all') {
      filtered = filtered.filter(card =>
        card.tags?.includes(selectedTag)
      );
    }

    return filtered;
  };

  const filteredCards = getFilteredCards();

  // 处理标签切换
  const handleTagChange = (tag) => {
    setSelectedTag(tag);
    // 简化逻辑：只控制showMovieCard，评论卡片始终显示
    setShowMovieCard(tag === '电影' || tag === 'all');
  };

  // 替换原有的 tagFilterTags 生成逻辑
  const getAllTagsFromOriginalData = () => {
    const allTags = cards.flatMap(card => card.tags || []);
    return [...new Set(allTags)].filter(tag => tag);
  };

  const staticTags = [
    {
      title: '电影',
      number: 'movie',
      labels: [{ name: '电影' }]
    },
  ];

  const commentTags = getAllTagsFromOriginalData().map(tag => ({
    title: tag,
    number: tag,
    labels: [{ name: tag }]
  }));

  const tagFilterTags = [...staticTags, ...commentTags];

  // 头像组件
  const Avatar = ({ username, nickname, className = "" }) => {
    const [imgError, setImgError] = useState(false);
    const avatarUrl = `https://cnb.cool/users/${username}/avatar/s`;
    const initial = nickname?.charAt(0) || username?.charAt(0) || '匿';
    
    return (
      <div className={`relative ${className}`}>
        {!imgError ? (
          <img
            src={avatarUrl}
            alt={`${nickname || username}的头像`}
            className="rounded-full w-4 h-4 object-cover border border-gray-200"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="rounded-full w-4 h-4 flex items-center justify-center bg-blue-100 text-blue-800 border border-blue-200 font-medium">
            {initial}
          </div>
        )}
      </div>
    );
  };

  // 格式化日期
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen p-2 sm:p-4 pb-10">
      <TagFilter
        tags={tagFilterTags}
        selectedTag={selectedTag}
        onTagChange={handleTagChange}
      />

      {/* 评论卡片容器（始终显示） */}
      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 sm:gap-4 space-y-4">
        {/* 电影卡片（根据标签控制） */}
        {showMovieCard && (
          <div className="break-inside-avoid">
            <MovieCard />
          </div>
        )}

        {/* 评论卡片列表（根据标签控制） */}
        {selectedTag !== '电影' && filteredCards.map((card, index) => (
          <Card key={card.commentId || index} className="break-inside-avoid">
            <CardHeader className="pb-2">
              <div className="flex items-center space-x-2">
                <Link to={`/user/${card.username}`} className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                  <CachedAvatar username={card.username} nickname={card.title} />
                  <CardTitle className="text-base sm:text-lg cursor-pointer">{card.title}</CardTitle>
                </Link>
              </div>
              <div className="text-sm text-gray-500">
                {formatDate(card.createdAt)}
              </div>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line mb-2">{card.description}</p>
              {card.images && card.images.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {card.images.slice(0, 4).map((img, imgIndex) => (
                    <img
                      key={imgIndex}
                      src={img}
                      alt={`评论图片 ${imgIndex + 1}`}
                      className="rounded-md object-cover w-full h-24 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => handleImageClick(card.images, imgIndex)}
                    />
                  ))}
                </div>
              )}
              {card.tags?.length > 0 && (
                <div className="flex items-center justify-between mt-4">
                  {card.tags.map((tag, idx) => (
                    <span key={idx} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Commit;
