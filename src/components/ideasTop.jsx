import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const IdeasTop = ({ onPresetPrompt, onSearchHistory }) => {
  const [searchKey, setSearchKey] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [presetMode, setPresetMode] = useState('default');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef(null);

  const handleSearchClear = () => {
    setSearchKey('');
    setIsSearchExpanded(false);
    onSearchHistory('');
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setIsSearching(true);
    onSearchHistory(searchKey);
    setIsSearching(false);
  };

  const handlePresetPrompt = (mode) => {
    if (presetMode === mode) {
      setPresetMode('default');
      onPresetPrompt('default');
    } else {
      setPresetMode(mode);
      onPresetPrompt(mode);
    }
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
    <div className="w-full min-w-0 overflow-x-auto pb-2 [scrollbar-width:'none']">
      <div className="flex items-center space-x-2 flex-nowrap">
        {/* 搜索按钮 - 点击展开式 */}
        {isSearchExpanded ? (
          <form onSubmit={handleSearchSubmit} className="flex items-center flex-shrink-0">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchKey}
                onChange={(e) => setSearchKey(e.target.value)}
                placeholder="搜索聊天记录..."
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
              className={cn(
                "ml-2 px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors flex-shrink-0",
                "bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
              )}
            >
              {isSearching ? '搜索中...' : '搜索'}
            </button>
          </form>
        ) : (
          <button
            onClick={handleSearchIconClick}
            className={cn(
              "px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors flex items-center flex-shrink-0",
              "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700"
            )}
          >
            <Search size={16} className="mr-1" />
            搜索
          </button>
        )}

        {/* 预设提示词按钮 */}
        <button
          onClick={() => handlePresetPrompt('translate')}
          className={cn(
            "px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors flex-shrink-0",
            presetMode === 'translate'
              ? "bg-blue-500 text-white"
              : "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700"
          )}
        >
          翻译模式
        </button>
        <button
          onClick={() => handlePresetPrompt('diet')}
          className={cn(
            "px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors flex-shrink-0",
            presetMode === 'diet'
              ? "bg-blue-500 text-white"
              : "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700"
          )}
        >
          饮食助手
        </button>
        <button
          onClick={() => handlePresetPrompt('explain')}
          className={cn(
            "px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors flex-shrink-0",
            presetMode === 'explain'
              ? "bg-blue-500 text-white"
              : "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700"
          )}
        >
          解释预设
        </button>
      </div>
    </div>
  );
};

export default IdeasTop;
