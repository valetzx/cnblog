import React, { useState, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Mission = () => {
  const [selectedTag, setSelectedTag] = useState('mission');
  const [searchKey, setSearchKey] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef(null);

  // 标签定义
  const tags = [
    { id: 'mission', label: '任务' },
    { id: 'activity', label: '活动' },
  ];

  // 处理搜索清除
  const handleSearchClear = () => {
    setSearchKey('');
    setIsSearchExpanded(false);
  };

  // 处理搜索图标点击
  const handleSearchIconClick = () => {
    setIsSearchExpanded(true);
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 100);
  };

  // 处理标签点击
  const handleTagClick = (tagId) => {
    setSelectedTag(tagId);
  };

  return (
    <div className="min-h-screen p-2 sm:p-4 pb-10">
      <div className="mx-auto">
        {/* 标签过滤器 */}
        <div className="mb-4 w-full overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
          <div className="flex space-x-2 min-w-max">
            {/* 搜索按钮 */}
            {isSearchExpanded ? (
              <form className="flex items-center">
                <div className="relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchKey}
                    onChange={(e) => setSearchKey(e.target.value)}
                    placeholder="搜索任务内容..."
                    className="px-3 py-1.5 text-sm rounded-full border border-gray-300 dark:border-gray-600 focus:outline-none pr-8"
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

            {/* 标签按钮 */}
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => handleTagClick(tag.id)}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors",
                  selectedTag === tag.id
                    ? "bg-indigo-500 text-white"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700"
                )}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Mission;
