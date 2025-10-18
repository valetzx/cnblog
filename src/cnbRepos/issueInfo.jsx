import { Input } from '@/components/ui/input';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useParams } from 'react-router-dom';
import { CardContent, CardHeader, Card as SettingsCard, Card, CardTitle } from '@/components/ui/card';
import React, { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import ImagePreview from '@/components/ImagePreview';
import CachedAvatar from '@/components/CachedAvatar';

const Info = () => {
  const { number } = useParams();
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cards, setCards] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewImages, setPreviewImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [hideStateLabels, setHideStateLabels] = useState(false);
  
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

  // 统一的加载状态组件
  const LoadingSpinner = ({ message = "加载中..." }) => (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="flex justify-center mb-4">
        <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
      <p className="text-gray-600 dark:text-gray-400">{message}</p>
    </div>
  );

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

  useEffect(() => {
    const fetchIssue = async () => {
      // 从本地存储获取 API 配置
      const apiUrl = settings.apiUrl || import.meta.env.VITE_API_URL;
      const baseRepo = settings.baseRepo || import.meta.env.VITE_BASE_REPO;
      const cnbToken = settings.cnbToken || import.meta.env.VITE_CNB_TOKEN;
      
      // 检查必要配置是否存在
      if (!apiUrl || !baseRepo) {
        setError('缺少必要的 API 配置，请在设置中配置 API URL 和 Base Repository');
        setLoading(false);
        return;
      }
      
      // 检查 CNB Token 是否存在
      if (!cnbToken) {
        setError('缺少 CNB Token，请在设置中配置');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${apiUrl}/${baseRepo}/-/issues/${number}`, {
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

  // 加载评论
  const loadComments = async () => {
    if (commentsLoading) return;
    
    setCommentsLoading(true);
    setCommentsError(null);
    const apiUrl = settings.apiUrl || import.meta.env.VITE_API_URL;
    const baseRepo = settings.baseRepo || import.meta.env.VITE_BASE_REPO;
    const cnbToken = settings.cnbToken || import.meta.env.VITE_CNB_TOKEN;
    
    const existingIds = new Set(cards.filter(c => c.commentId).map(c => c.commentId));
    
    try {
      // 使用 pageNum 和 sizeNum 参数
      const res = await fetch(`${apiUrl}/${baseRepo}/-/issues/${number}/comments?page=${settings.pageNum}&page_size=${settings.sizeNum}`, {
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
          images,
          createdAt: c.created_at
        });
        updated = true;
      });
      
      if (updated) {
        // 按创建时间排序，最新的在前
        newCards.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setCards(newCards);
      } else {
        setCommentsError('没有新的评论可加载');
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
            className="rounded-full w-8 h-8 object-cover border border-gray-200"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="rounded-full w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-800 border border-blue-200 font-medium">
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

  // 处理 issue body 中的图片
  const processIssueBody = (body) => {
    if (!body) return '';
    
    // 提取并替换图片标签
    let processedBody = body;
    
    // 处理 cnb-md-image__upload 类的图片
    processedBody = processedBody.replace(
      /<img(?=[^>]*class="[^"]*cnb-md-image__upload[^"]*")(?=[^>]*src="([^"]+)")[^>]*>/g,
      (_, src) => `![image](https://images.weserv.nl?url=https://cnb.cool${src})`
    );
    
    // 处理其他图片标签
    processedBody = processedBody.replace(
      /<img[^>]*src="([^"]+)"[^>]*>/g,
      (_, src) => `![image](${src})`
    );
    
    return processedBody;
  };

  // 处理图片点击事件
  const handleImageClick = (images, index) => {
    setPreviewImages(images);
    setCurrentImageIndex(index);
    setIsPreviewOpen(true);
  };

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
    <div className="min-h-screen p-4 pb-10">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-4 break-words">{issue.title}</h1>
          
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <span className="text-gray-600 dark:text-gray-300 mr-2">作者:</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{issue.author?.nickname || issue.author?.username}</span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-600 dark:text-gray-300 mr-2">更新时间:</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{formatDate(issue.updated_at)}</span>
              </div>
            </div>
            
            {!hideStateLabels && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                issue.state === 'open'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
              }`}>
                {issue.state === 'open' ? '开启' : '关闭'}
              </span>
            )}
          </div>
          
          <div className="prose max-w-none dark:prose-invert">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-800 dark:text-gray-100 break-words" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-5 mb-3 text-gray-800 dark:text-gray-100 break-words" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-lg font-bold mt-4 mb-2 text-gray-800 dark:text-gray-100 break-words" {...props} />,
                p: ({node, ...props}) => <p className="mb-3 leading-relaxed text-gray-700 dark:text-gray-300 break-words" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3 text-gray-700 dark:text-gray-300 break-words" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-3 text-gray-700 dark:text-gray-300 break-words" {...props} />,
                li: ({node, ...props}) => <li className="mb-1 text-gray-700 dark:text-gray-300 break-words" {...props} />,
                a: ({node, ...props}) => <a className="text-blue-600 hover:underline dark:text-blue-400 break-all" {...props} />,
                img: ({node, ...props}) => (
                  <img 
                    {...props}
                    className="max-w-full h-auto rounded-lg my-2 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleImageClick([props.src], 0)}
                  />
                ),
                code: ({node, ...props}) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm dark:bg-slate-700 break-all" {...props} />,
                pre: ({node, ...props}) => <pre className="bg-gray-100 p-3 rounded-lg overflow-x-auto my-3 dark:bg-slate-700" {...props} />,
                blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-300 pl-4 italic my-3 dark:border-slate-600 break-words" {...props} />,
                table: ({node, ...props}) => <table className="min-w-full border-collapse border border-gray-300 my-3 dark:border-slate-600" {...props} />,
                th: ({node, ...props}) => <th className="border border-gray-300 px-3 py-2 bg-gray-50 font-medium dark:border-slate-600 dark:bg-slate-700 break-words" {...props} />,
                td: ({node, ...props}) => <td className="border border-gray-300 px-3 py-2 dark:border-slate-600 break-words" {...props} />,
              }}
            >
              {processIssueBody(issue.body)}
            </ReactMarkdown>
          </div>
        </div>

        {/* 评论区域 */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">评论</h2>
            <Button onClick={loadComments} disabled={commentsLoading}>
              {commentsLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  加载中...
                </span>
              ) : '刷新评论'}
            </Button>
          </div>
          
          {commentsError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 dark:bg-red-900 dark:border-red-700 dark:text-red-100">
              {commentsError}
            </div>
          )}
          
          {commentsLoading && cards.length === 0 ? (
            <LoadingSpinner message="正在加载评论..." />
          ) : cards.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 mb-4">暂无评论</p>
              <Button onClick={loadComments} disabled={commentsLoading}>
                {commentsLoading ? '加载中...' : '加载评论'}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {cards.map((card, index) => (
                <div key={card.commentId || index}>
                  <Card className="flex flex-col h-full hover:shadow-md transition-shadow duration-300 dark:bg-slate-700 dark:border-slate-600">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center text-lg gap-2">
                        <CachedAvatar
                          username={card.username} 
                          nickname={card.title}
                        />
                        <div className="flex flex-col">
                          <a
                            href={`/user/${card.username}`}
                            className="truncate text-gray-800 dark:text-gray-100 transition-colors"
                            onClick={(e) => {
                              e.preventDefault();
                              window.location.hash = `/user/${card.username}`;
                            }}
                          >
                            {card.title}
                          </a>
                          <span className="text-xs text-gray-500 font-normal dark:text-gray-400">
                            {formatDate(card.createdAt)}
                          </span>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <p className="text-gray-700 mb-4 dark:text-gray-300 break-words">{card.description}</p>
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
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <ImagePreview
        images={previewImages}
        initialIndex={currentImageIndex}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
};

export default Info;
