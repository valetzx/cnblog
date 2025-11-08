import TagFilter from '@/components/TagFilter';
import { CardContent, CardHeader, Card, CardTitle } from '@/components/ui/card';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import ImagePreview from '@/components/ImagePreview';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import MovieCard from "./movieCard.jsx";
import ImgCardTemp from "./imgCardtemp.jsx";
import CachedAvatar from '@/components/CachedAvatar';
import { Link } from 'react-router-dom';
import { saveArticles, getArticlesFromDB, hasCachedArticles } from '@/fetchPage/articleDB';

// 智能瀑布流布局组件
const MasonryLayout = ({ children, className = '' }) => {
  return (
    <div className={`masonry min-columns-2 ${className}`}>
      {children}
    </div>
  );
};

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
  const [networkArticles, setNetworkArticles] = useState([]); // 网络获取的文章数据
  const [loadingArticles, setLoadingArticles] = useState(false); // 文章加载状态

  // 工具卡片数据
  const toolCards = [
    {
      nub: 1,
      name: 'AI辩论赛',
      img: 'https://m.wbiao.cn/mallapi/wechat/picReverseUrl?url=https://cnb.cool/wget/img/-/git/raw/main/ai/aibattle.png',
      describe: '智能AI辩论对战平台',
      tag: '小游戏',
      link: '/start',
      path: '/start'
    },
    {
      nub: 2,
      name: '任务分解器',
      img: 'https://m.wbiao.cn/mallapi/wechat/picReverseUrl?url=https://cnb.cool/wget/img/-/git/raw/main/ai/jobplain.png',
      describe: '智能任务分解与管理工具',
      tag: '工具',
      link: '/jobplan',
      path: '/jobplan'
    }
  ];

  // 获取工具标签数据
  const getToolTags = () => {
    // 从工具卡片数据中提取所有标签
    const toolTags = toolCards.flatMap(card => card.tag ? [card.tag] : []);
    // 从网络文章数据中提取所有标签
    const articleTags = networkArticles.flatMap(article => article.tag ? [article.tag] : []);
    const allTags = [...toolTags, ...articleTags];
    const uniqueTags = [...new Set(allTags)].filter(tag => tag);

    // 转换为标签过滤器格式
    return uniqueTags.map(tag => ({
      title: tag,
      number: tag,
      labels: [{ name: tag }]
    }));
  };

  // 检查是否是工具相关的标签
  const isToolTag = (tag) => {
    const toolTags = getToolTags().map(tagObj => tagObj.title);
    return toolTags.includes(tag);
  };

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
          images.push(`https://m.wbiao.cn/mallapi/wechat/picReverseUrl?url=https://cnb.cool${src}`);
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
    // 控制显示电影卡片（如果是电影标签或全部）
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
    ...getToolTags()  // 动态添加工具标签
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

  // 从网络获取文章数据
  const fetchNetworkArticles = async () => {
    if (loadingArticles) return;

    setLoadingArticles(true);
    try {
      // 首先检查本地数据库是否有缓存数据
      const hasCache = await hasCachedArticles();
      if (hasCache) {
        const cachedArticles = await getArticlesFromDB();
        setNetworkArticles(cachedArticles);
      }

      // 从网络获取最新数据
      const response = await fetch(`${import.meta.env.VITE_CNBCOOKIE_API_URL}/wget/img/-/git/raw/main/article.json`, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_CNBCOOKIE}`,
          'Accept': 'application/json',
        }
      });
      if (!response.ok) {
        throw new Error(`网络请求失败: ${response.status}`);
      }

      const networkData = await response.json();
      console.log('从网络获取的文章数据:', networkData);

      // 保存到IndexedDB
      try {
        const savedCount = await saveArticles(networkData);
        console.log('成功保存到IndexedDB的文章数量:', savedCount);
      } catch (saveError) {
        console.error('保存到IndexedDB失败:', saveError);
        // 继续更新UI状态，但记录错误
      }

      // 更新状态（无论保存是否成功都更新）
      setNetworkArticles(networkData);

    } catch (error) {
      console.error('获取网络文章数据失败:', error);
      // 如果网络请求失败，但本地有缓存数据，仍然使用缓存
      if (!networkArticles.length) {
        const cachedArticles = await getArticlesFromDB();
        setNetworkArticles(cachedArticles);
      }
    } finally {
      setLoadingArticles(false);
    }
  };

  // 页面加载时自动获取网络文章数据
  useEffect(() => {
    fetchNetworkArticles();
  }, []);

  return (
    <div className="min-h-screen p-2 sm:p-4 pb-10">
      <TagFilter
        tags={tagFilterTags}
        selectedTag={selectedTag}
        onTagChange={handleTagChange}
      />

      {/* 评论卡片容器（始终显示） */}
      <MasonryLayout className="gap-4 sm:gap-4">
        {/* 电影卡片（根据标签控制） */}
        {showMovieCard && (
          <div className="masonry-item">
            <MovieCard />
          </div>
        )}

        {/* 工具卡片（根据标签控制） */}
        {(isToolTag(selectedTag) || selectedTag === 'all') && (
          <>
            {[
              ...toolCards.filter(card =>
                selectedTag === 'all' || card.tag === selectedTag
              ),
              ...networkArticles.filter(article =>
                selectedTag === 'all' || article.tag === selectedTag
              )
            ].map((card, index) => (
              <div key={card.nub || index} className="masonry-item">
                {card.path?.startsWith('http') ? (
                  <a
                    href={card.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Card className="w-full hover:shadow-md transition-shadow flex flex-col h-full cursor-pointer">
                      <CardContent className="p-0 flex flex-col">
                        {/* 图片部分 */}
                        {card.img && (
                          <img
                            src={card.img}
                            alt={card.name}
                            className="w-full h-48 object-cover rounded-t-lg"
                          />
                        )}

                        {/* 内容部分 */}
                        <div className="p-4 flex flex-col flex-grow">
                          <CardHeader className="p-0 pb-2">
                            <CardTitle className="text-lg font-bold">
                              {card.name}
                            </CardTitle>
                          </CardHeader>

                          {/* 描述 */}
                          {card.describe && (
                            <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 whitespace-pre-line flex-grow">
                              {card.describe}
                            </p>
                          )}

                          {/* 标签和链接 */}
                          <div className="flex items-center justify-between mt-2">
                            {card.tag && (
                              <span className={`inline-block text-xs px-2 py-1 rounded-md ${
                                card.tag === '小游戏' ? 'bg-red-100 text-red-800' :
                                card.tag === '工具' ? 'bg-purple-100 text-purple-800' :
                                card.tag === '微信文章' ? 'bg-green-100 text-green-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {card.tag}
                              </span>
                            )}

                            {card.link?.startsWith('http') ? (
                              <a
                                href={card.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-gray-500 hover:text-[#838EF8] z-10 relative"
                                onClick={(e) => e.stopPropagation()}
                              >
                                查看详情
                              </a>
                            ) : (
                              <Link
                                to={card.link}
                                className="text-xs text-gray-500 hover:text-[#838EF8] z-10 relative"
                                onClick={(e) => e.stopPropagation()}
                              >
                                查看详情
                              </Link>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </a>
                ) : (
                  <Link
                    to={card.path}
                    className="block"
                  >
                    <Card className="w-full hover:shadow-md transition-shadow flex flex-col h-full cursor-pointer">
                      <CardContent className="p-0 flex flex-col">
                        {/* 图片部分 */}
                        {card.img && (
                          <img
                            src={card.img}
                            alt={card.name}
                            className="w-full h-48 object-cover rounded-t-lg"
                          />
                        )}

                        {/* 内容部分 */}
                        <div className="p-4 flex flex-col flex-grow">
                          <CardHeader className="p-0 pb-2">
                            <CardTitle className="text-lg font-bold">
                              {card.name}
                            </CardTitle>
                          </CardHeader>

                          {/* 描述 */}
                          {card.describe && (
                            <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 whitespace-pre-line flex-grow">
                              {card.describe}
                            </p>
                          )}

                          {/* 标签和链接 */}
                          <div className="flex items-center justify-between mt-2">
                            {card.tag && (
                              <span className={`inline-block text-xs px-2 py-1 rounded-md ${
                                card.tag === '小游戏' ? 'bg-red-100 text-red-800' :
                                card.tag === '工具' ? 'bg-purple-100 text-purple-800' :
                                card.tag === '微信文章' ? 'bg-green-100 text-green-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {card.tag}
                              </span>
                            )}

                            {card.link?.startsWith('http') ? (
                              <a
                                href={card.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-gray-500 hover:text-[#838EF8] z-10 relative"
                                onClick={(e) => e.stopPropagation()}
                              >
                                查看详情
                              </a>
                            ) : (
                              <Link
                                to={card.link}
                                className="text-xs text-gray-500 hover:text-[#838EF8] z-10 relative"
                                onClick={(e) => e.stopPropagation()}
                              >
                                查看详情
                              </Link>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )}
              </div>
            ))}
          </>
        )}

        {/* 评论卡片列表（根据标签控制） */}
        {selectedTag !== '电影' && !isToolTag(selectedTag) && filteredCards.map((card, index) => (
          <div key={card.commentId || index} className="masonry-item">
            <Card className="w-full hover:shadow-md transition-shadow flex flex-col h-full">
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
              <CardContent className="flex-grow">
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
          </div>
        ))}
      </MasonryLayout>
    </div>
  );
};

export default Commit;
