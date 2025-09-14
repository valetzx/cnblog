import React, { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Search, X } from 'lucide-react';

const TagFilter = ({ tags, selectedTag, onTagChange, onSearchResults }) => {
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchKey, setSearchKey] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef(null);

  // 从所有问题中提取唯一标签
  const uniqueTags = [...new Set(tags.flatMap(issue => 
    issue.labels?.map(label => label.name) || []
  ))].filter(tag => tag);

  // 实时搜索功能
  useEffect(() => {
    // 添加函数存在性检查
    if (!onSearchResults) return;

    if (searchKey.trim() === '') {
      // 如果搜索关键词为空，显示所有数据
      onSearchResults('all');
      return;
    }

    // 本地过滤 homepageData 数据
    const filtered = tags.filter(issue => 
      issue.title?.toLowerCase().includes(searchKey.toLowerCase()) ||
      issue.number?.toString().includes(searchKey) ||
      issue.labels?.some(label => label.name.toLowerCase().includes(searchKey.toLowerCase()))
    );
    
    onSearchResults(filtered);
  }, [searchKey, tags, onSearchResults]);

  // 搜索功能
  const handleSearch = async (keyword) => {
    if (!keyword.trim()) {
      // 如果搜索关键词为空，重置显示所有数据
      onTagChange('all');
      return;
    }

    setIsSearching(true);
    try {
      // 从本地存储获取 API 配置
      const apiUrl = localStorage.getItem('VITE_API_URL') || import.meta.env.VITE_API_URL;
      const baseRepo = localStorage.getItem('VITE_BASE_REPO') || import.meta.env.VITE_BASE_REPO;
      const cnbToken = localStorage.getItem('cnbToken') || import.meta.env.VITE_CNB_TOKEN;
      const pageNum = localStorage.getItem('pageNum') || 1;
      const sizeNum = localStorage.getItem('sizeNum') || 20;

      // 检查必要配置是否存在
      if (!apiUrl || !baseRepo || !cnbToken) {
        console.error('缺少必要的 API 配置');
        return;
      }

      const openResponse = await fetch(`${apiUrl}/${baseRepo}/-/issues?page=${pageNum}&page_size=${sizeNum}&keyword=${encodeURIComponent(keyword)}`, {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${cnbToken}`
        }
      });

      if (!openResponse.ok) {
        throw new Error(`HTTP error! status: ${openResponse.status}`);
      }

      const data = await openResponse.json();
      // 将搜索结果传递给父组件处理
      if (onSearchResults) {
        onSearchResults(data);
      }
    } catch (err) {
      console.error('搜索失败:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    handleSearch(searchKey);
  };

  const handleSearchClear = () => {
    setSearchKey('');
    setIsSearchExpanded(false);
    onTagChange('all');
    if (onSearchResults) {
      onSearchResults('all');
    }
  };

  const handleWheel = (e) => {
    if (containerRef.current) {
      containerRef.current.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setScrollLeft(containerRef.current.scrollLeft);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 2; // 拖动速度
    containerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleSearchIconClick = () => {
    setIsSearchExpanded(true);
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 100);
  };

  return (
    <div
      ref={containerRef}
      className="mb-4 w-full overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex space-x-2 min-w-max">
        {/* 搜索按钮 */}
        {isSearchExpanded ? (
          <form onSubmit={handleSearchSubmit} className="flex items-center">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchKey}
                onChange={(e) => setSearchKey(e.target.value)}
                placeholder="搜索关键字..."
                className="px-3 py-1.5 text-sm rounded-full border border-gray-300 focus:outline-none pr-8"
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
            <button
              type="submit"
              disabled={isSearching}
              className="ml-2 px-3 py-1.5 text-sm rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {isSearching ? '搜索中...' : '搜索'}
            </button>
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
        
        {uniqueTags.map((tag) => (
          <button
            key={tag}
            onClick={() => onTagChange(tag === selectedTag ? 'all' : tag)}
            className={cn(
              "px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors",
              selectedTag === tag
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700"
            )}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TagFilter;
