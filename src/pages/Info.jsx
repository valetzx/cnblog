import { Input } from '@/components/ui/input';
import { useParams } from 'react-router-dom';
import React, { useEffect, useState, useRef, useCallback, memo } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import AddCommit from '@/cnbRepos/addCommit';
import InfoRenderer from '@/components/InfoRender';
import CommitRender from '@/components/CommitRender';
import RightBar, { extractHeadings } from '@/components/RightBar';
import {
  saveCommentsToCache,
  getCommentsFromCache,
  isCommentCacheValid,
  processCommentData
} from '@/cnbUtils/commentCache';
import ImagePreview from '@/components/ImagePreview';
// 导入图片缓存工具
import {
  getImageUrlFromCache,
  saveImageUrlToCache,
  getBatchImageUrlsFromCache
} from '@/cnbUtils/imageCache';
import { LoadingSpinner } from '@/fetchPage/LoadingSpinner';

const MemoizedInfoRenderer = memo(InfoRenderer);
const MemoizedCommitRender = memo(CommitRender);

const Info = () => {
  const params = useParams();
  const repopath = params['*'] || ''; 
  const { number } = useParams();
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cards, setCards] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState(null);
  const [hideStateLabels, setHideStateLabels] = useState(false);
  const [sortOrder, setSortOrder] = useState('desc');
  const [sortBy, setSortBy] = useState('created_at');
  const [headings, setHeadings] = useState([]);
  const commentTimerRef = useRef(null);
  const displayedCommentIdsRef = useRef(new Set());
  
  // 图片预览状态 - 提升到组件级别
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewImages, setPreviewImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // 预加载的所有图片列表（文章图片 + 所有评论图片）
  const [allImages, setAllImages] = useState([]);
  const allImagesRef = useRef([]);

  // 从 HTML 内容中提取所有图片
  const extractAllImagesFromHTML = useCallback(async (html) => {
    if (!html) return [];

    const images = [];
    const imgRegex = /<img[^>]*src="([^"]+)"[^>]*>/g;
    let match;

    while ((match = imgRegex.exec(html)) !== null) {
      let src = match[1];
      let finalSrc = src;

      // 首先检查缓存中是否有正确的URL
      const cachedUrl = await getImageUrlFromCache(repopath, number, 'infoimg', src);

      if (cachedUrl) {
        // 使用缓存的正确URL
        finalSrc = cachedUrl;
      } else {
        // 处理 cnb-md-image__upload 类的图片
        if (html.includes('cnb-md-image__upload') && html.includes(src)) {
          finalSrc = `https://m.wbiao.cn/mallapi/wechat/picReverseUrl?url=https://cnb.cool${src}`;
          // 保存到缓存
          await saveImageUrlToCache(repopath, number, 'infoimg', src, finalSrc);
        }
      }

      images.push(finalSrc);
    }

    return images;
  }, [repopath, number]);

  // 从 Markdown 内容中提取所有图片
  const extractAllImagesFromMarkdown = useCallback(async (markdown) => {
    if (!markdown) return [];

    const images = [];
    // 匹配 Markdown 图片语法: ![alt](url)
    const markdownImgRegex = /!\[.*?\]\((.*?)\)/g;
    let match;

    while ((match = markdownImgRegex.exec(markdown)) !== null) {
      let src = match[1];
      let finalSrc = src;

      // 首先检查缓存中是否有正确的URL
      const cachedUrl = await getImageUrlFromCache(repopath, number, 'commiturl', src);

      if (cachedUrl) {
        // 使用缓存的正确URL
        finalSrc = cachedUrl;
      } else {
        // 处理 cnb-md-image__upload 类的图片
        if (src.includes('/uploads/') && src.includes('cnb-md-image__upload')) {
          finalSrc = `https://m.wbiao.cn/mallapi/wechat/picReverseUrl?url=https://cnb.cool${src}`;
          // 保存到缓存
          await saveImageUrlToCache(repopath, number, 'commiturl', src, finalSrc);
        }
      }

      images.push(finalSrc);
    }

    return images;
  }, [repopath, number]);

  // 更新所有图片列表
  const updateAllImages = useCallback(async (issueData, commentsData) => {
    const newAllImages = [];

    // 提取文章中的图片
    if (issueData?.body) {
      const articleImages = await extractAllImagesFromHTML(issueData.body);
      newAllImages.push(...articleImages);
    }

    // 提取所有评论中的图片
    if (commentsData && commentsData.length > 0) {
      for (const comment of commentsData) {
        // 评论的 Markdown 内容中的图片
        if (comment.description) {
          const markdownImages = await extractAllImagesFromMarkdown(comment.description);
          newAllImages.push(...markdownImages);
        }

        // 评论的附加图片
        if (comment.images && comment.images.length > 0) {
          newAllImages.push(...comment.images);
        }
      }
    }

    // 去重
    const uniqueImages = [...new Set(newAllImages)];
    setAllImages(uniqueImages);
    allImagesRef.current = uniqueImages;
  }, [extractAllImagesFromHTML, extractAllImagesFromMarkdown]);

  // 处理图片点击事件
  const handleImageClick = useCallback((imageUrl) => {
    const clickedImageIndex = allImagesRef.current.findIndex(img => img === imageUrl);
    if (clickedImageIndex >= 0) {
      setPreviewImages(allImagesRef.current);
      setCurrentImageIndex(clickedImageIndex);
      setIsPreviewOpen(true);
    }
  }, []);

  // 关闭预览
  const handleClosePreview = useCallback(() => {
    setIsPreviewOpen(false);
  }, []);


  const handleCommentAdded = useCallback(() => {
    // 目前为空，但使用useCallback确保引用稳定
  }, []);

  // 当 issue 或评论数据变化时，更新所有图片列表
  useEffect(() => {
    if (issue || cards.length > 0) {
      updateAllImages(issue, cards).catch(error => {
        console.error('更新图片列表失败:', error);
      });
    }
  }, [issue, cards, updateAllImages]);

  // 从浏览器存储中获取设置
  const [settings, setSettings] = useState(() => {
    const savedSettings = localStorage.getItem('settingsData');
    return savedSettings ? JSON.parse(savedSettings) : {
      pageNum: 1,
      sizeNum: 20,
      hideStateLabels: false
    };
  });
  
  // 监听存储变化
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === 'settingsData') {
        const newSettings = JSON.parse(event.newValue || '{}');
        setSettings(prev => ({ ...prev, ...newSettings }));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 当设置变化时更新状态
  useEffect(() => {
    setHideStateLabels(settings.hideStateLabels || false);
  }, [settings.hideStateLabels]);

  // 处理标题点击 - 使用原生JS滚动，避免状态更新
  const handleHeadingClick = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      // 不再设置activeHeading状态，避免重新渲染
    }
  };

  // 提取标题
  useEffect(() => {
    if (issue && issue.body) {
      const extractedHeadings = extractHeadings(issue.body);
      setHeadings(extractedHeadings);
    }
  }, [issue?.body]); // 只依赖issue.body而不是整个issue对象

  // 统一的错误显示组件
  const ErrorMessage = ({ message }) => (
    <div className="flex justify-center items-center h-screen">
      <div className="text-red-500 text-xl">加载失败: {message}</div>
    </div>
  );

  // 统一的空状态组件
  const EmptyState = ({ message }) => (
    <div className="flex justify-center items-center h-screen">
      <div className="text-gray-500 text-xl">{message}</div>
    </div>
  );

  // 显示评论通知
  const showCommentNotification = (comment) => {
    const { title, description } = comment;

    // 如果文字过多，则用...省略
    const truncatedDescription = description.length > 50
      ? `${description.substring(0, 47)}...`
      : description;

    // 显示通知，结构为 "名字：内容"
    toast.info(`${title}: ${truncatedDescription}`, {
      duration: 5800,
      position: 'bottom-right'
    });
  };

  // 启动评论通知定时器
  const startCommentNotificationTimer = () => {
    if (commentTimerRef.current) {
      clearInterval(commentTimerRef.current);
    }

    commentTimerRef.current = setInterval(async () => {
      if (cards.length === 0) return;

      try {
        // 获取所有未显示的评论
        const unshownComments = cards.filter(
          card => !displayedCommentIdsRef.current.has(card.commentId)
        );

        if (unshownComments.length === 0) {
          // 如果所有评论都已显示，停止当前定时器
          stopCommentNotificationTimer();

          // 等待1分钟（60000毫秒）后重新开始
          setTimeout(() => {
            displayedCommentIdsRef.current.clear();
            startCommentNotificationTimer();
          }, 60000);
          return;
        }

        const randomIndex = Math.floor(Math.random() * unshownComments.length);
        const selectedComment = unshownComments[randomIndex];
        showCommentNotification(selectedComment);
        // 标记为已显示
        displayedCommentIdsRef.current.add(selectedComment.commentId);

      } catch (error) {
        console.error('显示评论通知失败:', error);
      }
    }, 5000); // 每5秒执行一次
  };

  // 停止评论通知定时器
  const stopCommentNotificationTimer = () => {
    if (commentTimerRef.current) {
      clearInterval(commentTimerRef.current);
      commentTimerRef.current = null;
    }
  };

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      stopCommentNotificationTimer();
    };
  }, []);

  // 当评论数据变化时启动定时器
  useEffect(() => {
    if (cards.length > 0) {
      stopCommentNotificationTimer();
      displayedCommentIdsRef.current.clear();
      startCommentNotificationTimer();
    }

    return () => {
      stopCommentNotificationTimer();
    };
  }, [cards]);

  useEffect(() => {
    const fetchIssue = async () => {
      // 从本地存储获取 API 配置
      const apiUrl = settings.apiUrl || import.meta.env.VITE_API_URL;
      const baseRepo = settings.baseRepo || import.meta.env.VITE_BASE_REPO;
      const cnbToken = settings.cnbToken || import.meta.env.VITE_CNB_TOKEN;
      
      // 检查必要配置是否存在
      if (!baseRepo) {
        setError('缺少必要的 API 配置，请在设置中配置 API URL 和 Base Repository');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${apiUrl}/${repopath}/-/issues/${number}`, {
          headers: {
            'accept': 'application/json',
            'Authorization': `Bearer ${cnbToken}`
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setIssue(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (number) {
      fetchIssue();
    }
  }, [number, settings]);

  // 排序评论函数
  const sortComments = React.useCallback((commentsToSort) => {
    return [...commentsToSort].sort((a, b) => {
      const dateA = new Date(sortBy === 'updated_at' ? a.updatedAt || a.createdAt : a.createdAt);
      const dateB = new Date(sortBy === 'updated_at' ? b.updatedAt || b.createdAt : b.createdAt);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [sortOrder, sortBy]);

  // 加载评论
  const loadComments = async () => {
    if (commentsLoading) return;
    
    setCommentsLoading(true);
    setCommentsError(null);
    
    try {
      // 首先检查缓存是否有效
      const cacheValid = await isCommentCacheValid(repopath, number);

      if (cacheValid) {
        // 从缓存加载评论
        const cachedComments = await getCommentsFromCache(repopath, number, sortBy, sortOrder);
        if (cachedComments.length > 0) {
          // 处理所有缓存评论，确保按当前排序设置排序
          const processedComments = cachedComments.map(processCommentData);

          // 按指定字段和顺序排序
          setCards(sortComments(processedComments));
          setCommentsLoading(false);
          return;
        }
      }
      const apiUrl = settings.apiUrl || import.meta.env.VITE_API_URL;
      const baseRepo = settings.baseRepo || import.meta.env.VITE_BASE_REPO;
      const cnbToken = settings.cnbToken || import.meta.env.VITE_CNB_TOKEN;

      const existingIds = new Set(cards.filter(c => c.commentId).map(c => c.commentId));

      // 使用 pageNum 和 sizeNum 参数
      const res = await fetch(`${apiUrl}/${repopath}/-/issues/${number}/comments?page=${settings.pageNum}&page_size=${settings.sizeNum}`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${cnbToken}`
        },
        mode: 'cors'
      });
      
      if (!res.ok) {
        throw new Error(`HTTP错误: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      let updated = false;
      const newCards = [...cards];
      
      data.forEach(c => {
        if (existingIds.has(c.id)) return;
        
        const processedComment = processCommentData(c);
        newCards.push(processedComment);
        updated = true;
      });
      
      if (updated) {
        // 按创建时间排序，根据 sortOrder 决定顺序
        setCards(sortComments(newCards));

        // 保存到缓存
        await saveCommentsToCache(data, repopath, number);
      } else {
        // 使用toast提示而不是设置错误状态
        toast.error('没有新的评论可加载', { duration: 3000, position: 'top-right' });
      }
    } catch (err) {
      console.error('加载评论失败', err);
      setCommentsError(`加载失败: ${err.message}`);
    } finally {
      setCommentsLoading(false);
    }
  };

  // 页面加载时自动获取评论
  useEffect(() => {
    if (issue) {
      loadComments();
    }
  }, [issue]);

  // 监听排序状态变化，重新排序现有评论
  useEffect(() => {
    if (cards.length > 0) {
      setCards(prevCards => {
        const sorted = sortComments(prevCards);
        if (JSON.stringify(sorted) === JSON.stringify(prevCards)) {
          return prevCards;
        }
        return sorted;
      });
    }
  }, [sortOrder, sortBy, sortComments]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!issue) {
    return <EmptyState message="未找到相关信息" />;
  }

  return (
    <>
      <div className="w-full max-w-screen-lg mx-auto grid grid-cols-1 xl:grid-cols-5 gap-6 pb-4 px-4">
        {/* 主要内容区域 */}
        <div className="xl:col-span-4">
          {/* 文章内容区域 */}
          <MemoizedInfoRenderer
            issue={issue}
            hideStateLabels={hideStateLabels}
            onImageClick={handleImageClick}
          />

          {/* 评论区域 */}
          <MemoizedCommitRender
            comments={cards}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            repopath={repopath}
            number={issue.number}
            onCommentAdded={handleCommentAdded}
            onImageClick={handleImageClick}
          />
        </div>
          
        {/* 右侧目录区域 */}
        <div>
          <RightBar
            headings={headings}
            onHeadingClick={handleHeadingClick}
          />
        </div>
      </div>

      {/* 统一的图片预览模态框 */}
      <ImagePreview
        images={previewImages}
        initialIndex={currentImageIndex}
        isOpen={isPreviewOpen}
        onClose={handleClosePreview}
        repopath={repopath}
        number={number}
        imageType="infoimg"
      />
    </>
  );
};

export default Info;
