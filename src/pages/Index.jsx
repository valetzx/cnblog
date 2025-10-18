import TagFilter from '@/components/TagFilter';
import PinnedArticleCard from '@/components/PinnedArticleCard';
import { CardContent, CardHeader, Card, CardTitle } from '@/components/ui/card';
import { Link, useNavigate } from 'react-router-dom';
import { defaultHomepageData } from '@/lib/homepageData';
import { SelectItem, Select, SelectContent, SelectValue, SelectTrigger } from '@/components/ui/select';
import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
const Index = () => {
  const navigate = useNavigate();
  const [issues, setIssues] = useState([]);
  const [closedIssues, setClosedIssues] = useState([]);
  const [allIssues, setAllIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [settings, setSettings] = useState({
    apiUrl: '',
    baseRepo: '',
    cnbToken: '',
    sortOption: 'updated_desc',
    filterOption: 'all',
    pageNum: 1,
    sizeNum: 20,
    hideIssueNumbers: true,
    hideStateLabels: true
  });
  const [displayIssues, setDisplayIssues] = useState([]);
  const [selectedTag, setSelectedTag] = useState('all');
  const [searchResults, setSearchResults] = useState('all');
  const [pinnedArticles, setPinnedArticles] = useState([]);

  // 页面加载时从本地存储获取设置
  useEffect(() => {
    const savedSettings = localStorage.getItem('settingsData');
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      // 合并设置，优先使用本地存储的值
      setSettings(prev => ({
        ...prev,
        ...parsedSettings,
        // 确保环境变量作为默认值
        apiUrl: parsedSettings.apiUrl || import.meta.env.VITE_API_URL || prev.apiUrl,
        baseRepo: parsedSettings.baseRepo || import.meta.env.VITE_BASE_REPO || prev.baseRepo,
        cnbToken: parsedSettings.cnbToken || import.meta.env.VITE_CNB_TOKEN || prev.cnbToken
      }));
    } else {
      // 本地没有设置数据时，使用环境变量初始化默认设置
      setSettings(prev => {
        const defaultSettings = {
          ...prev,
          baseRepo: import.meta.env.VITE_BASE_REPO || prev.baseRepo
        };

        // 将默认设置保存到本地存储
        localStorage.setItem('settingsData', JSON.stringify(defaultSettings));

        return defaultSettings;
      });
    }
    
    // 监听存储变化事件
    const handleStorageChange = (e) => {
      if (e.key === 'settingsUpdated') {
        const updatedSettings = localStorage.getItem('settingsData');
        if (updatedSettings) {
          setSettings(JSON.parse(updatedSettings));
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // 加载置顶文章
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

  // 检查本地是否有 homepageData，如果有则直接使用
  useEffect(() => {
    const cachedData = localStorage.getItem('homepageData');
    if (cachedData) {
      try {
        const { issues: cachedIssues, closedIssues: cachedClosedIssues, allIssues: cachedAllIssues } = JSON.parse(cachedData);
        setIssues(cachedIssues);
        setClosedIssues(cachedClosedIssues);
        setAllIssues(cachedAllIssues);
      } catch (e) {
        console.error('解析缓存数据失败', e);
      }
    } else {
      setIssues(defaultHomepageData.issues);
      setClosedIssues(defaultHomepageData.closedIssues);
      setAllIssues(defaultHomepageData.allIssues);
    }
  }, []);

  useEffect(() => {
    const fetchIssues = async () => {
      // 检查必要的设置是否完整，避免构建不完整的URL
      if (!settings.apiUrl || !settings.baseRepo || !settings.cnbToken) {
        console.log('设置不完整，跳过用户设置的API请求');
        return;
      }

      try {
        // 获取开启状态的问题
        const openResponse = await fetch(
          `${settings.apiUrl}/${settings.baseRepo}/-/issues?page=${settings.pageNum}&page_size=${settings.sizeNum}`,
          {
            headers: {
              'accept': 'application/json',
              'Authorization': `Bearer ${settings.cnbToken}`
            }
          }
        );

        // 获取关闭状态的问题
        const closedResponse = await fetch(
          `${settings.apiUrl}/${settings.baseRepo}/-/issues?page=${settings.pageNum}&page_size=${settings.sizeNum}&state=closed`,
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

        const openData = await openResponse.json();
        const closedData = await closedResponse.json();
        
        setIssues(openData);
        setClosedIssues(closedData);
        setAllIssues([...openData, ...closedData]);
        
        // 保存数据到缓存
        const cacheData = {
          issues: openData,
          closedIssues: closedData,
          allIssues: [...openData, ...closedData]
        };
        localStorage.setItem('homepageData', JSON.stringify(cacheData));
      } catch (err) {
        setError(`加载失败: ${err.message}`);
      }
    };

    // 静默请求API更新数据
    fetchIssues();
  }, [settings.baseRepo, settings.pageNum, settings.sizeNum]);

  // 处理搜索结果的回调函数
  const handleSearchResults = useCallback((results) => {
    setSearchResults(results);
  }, []);

  // 根据排序、筛选和标签选项更新显示的问题
  useEffect(() => {
    // 如果有搜索结果且不是'all'，直接使用搜索结果
    if (searchResults !== 'all') {
      setDisplayIssues(searchResults);
      return;
    }

    let filtered = [];
    
    switch (settings.filterOption) {
      case 'open':
        filtered = [...issues];
        break;
      case 'closed':
        filtered = [...closedIssues];
        break;
      case 'all':
      default:
        filtered = [...allIssues];
        break;
    }

    // 标签筛选
    if (selectedTag !== 'all') {
      filtered = filtered.filter(issue => 
        issue.labels?.some(label => label.name === selectedTag)
      );
    }

    // 排序逻辑
    switch (settings.sortOption) {
      case 'number_asc':
        filtered.sort((a, b) => a.number - b.number);
        break;
      case 'number_desc':
        filtered.sort((a, b) => b.number - a.number);
        break;
      case 'updated_asc':
        filtered.sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at));
        break;
      case 'updated_desc':
        filtered.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        break;
      case 'comments_asc':
        filtered.sort((a, b) => a.comment_count - b.comment_count);
        break;
      case 'comments_desc':
        filtered.sort((a, b) => b.comment_count - a.comment_count);
        break;
      default:
        break;
    }

    setDisplayIssues(filtered);
  }, [settings.sortOption, settings.filterOption, settings.hideIssueNumbers, settings.hideStateLabels, issues, closedIssues, allIssues, selectedTag, searchResults]);

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

  // 将十六进制颜色转换为HSL并调整亮度
  const getTextColorFromBg = (bgColor) => {
    const r = parseInt(bgColor.slice(1, 3), 16);
    const g = parseInt(bgColor.slice(3, 5), 16);
    const b = parseInt(bgColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#333333' : '#ffffff';
  };

// 渲染标签
const renderLabels = (labels, state, hideStateLabels) => {
  // 准备标签列表，根据设置决定是否添加状态标签
  let allLabels = [...(labels || [])];
  
  // 只有当不需要隐藏状态标签时，才添加状态标签到最前面
  if (!hideStateLabels) {
    const stateLabel = {
      name: state === 'open' ? '开启' : '关闭',
      color: state === 'open' ? '#dcfce7' : '#fee2e2'
    };
    allLabels = [stateLabel, ...allLabels];
  }
  
  if (allLabels.length === 0) return null;
  const isSingleLine = allLabels.length <= 3;
  
  return (
    <div className={`overflow-x-auto pb-2 -mx-2 px-2 overflow-y-hidden ${isSingleLine ? 'h-6' : ''}`}>
      <div className="flex flex-nowrap gap-0.5 min-w-max">
        {allLabels.map((label, index) => (
          <div
            key={index}
            className="px-2 py-0.5 text-xs rounded font-medium mr-1 cnb-label-item light shrink-0"
            style={{
              backgroundColor: label.color,
              color: getTextColorFromBg(label.color)
            }}
          >
            <span title={label.name}>{label.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

return (
  <div className="min-h-screen p-2 sm:p-4 pb-10">
    <div className="mx-auto">        
      <TagFilter 
        tags={allIssues} 
        selectedTag={selectedTag} 
        onTagChange={setSelectedTag}
        onSearchResults={handleSearchResults}
      />

      <PinnedArticleCard
        article={pinnedArticles[0]}
      />
      
      <div>
        {displayIssues.length > 0 ? (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 sm:gap-4 space-y-4">
            {displayIssues.map((issue) => (
              <div key={issue.number} className="break-inside-avoid">
                <Card className="w-full hover:shadow-md transition-shadow flex flex-col">
                  <Link to={`/info/${issue.number}/${settings.baseRepo}`} className="flex flex-col h-full">
                    <CardHeader className="pb-3 flex-shrink-0">
                      <CardTitle className="text-base sm:text-lg line-clamp-2">
                        {settings.hideIssueNumbers ? null : `#${issue.number} `}{issue.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow flex flex-col pb-2">
                      <div className="flex items-center justify-between mb-3 flex-shrink-0">
                        <div className="text-xs sm:text-sm text-gray-500">
                          更新于 {formatDate(issue.updated_at)}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600">
                          评论: {issue.comment_count}
                        </div>
                      </div>
                      <div className="mb-3 flex-grow">
                        {/* 传入状态和隐藏设置 */}
                        {renderLabels(issue.labels, issue.state, settings.hideStateLabels)}
                      </div>
                      {/* 移除原来单独的状态显示区域，逻辑已整合到标签中 */}
                    </CardContent>
                  </Link>
                </Card>
              </div>
            ))}
          </div>
        ) : (
            <div className="text-center py-8 text-gray-500">
              暂无问题
            </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default Index;
