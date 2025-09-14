import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const HightLightxt = () => {
  const [text, setText] = useState('');
  const [keywords, setKeywords] = useState('');
  const [highlightedText, setHighlightedText] = useState('');
  const [stats, setStats] = useState({
    totalWords: 0,
    paragraphs: 0,
    matches: 0,
    foundKeywords: [],
    notFoundKeywords: []
  });

  // 预设关键词模板
  const presetKeywords = [
    "重要,关键,核心",
    "问题,错误,异常",
    "解决方案,建议,方法",
    "时间,日期,计划"
  ];

  // 实时计算文本统计信息
  useMemo(() => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const paragraphs = text.trim() ? text.split(/\n+/).filter(p => p.trim()).length : 0;
    
    setStats(prev => ({
      ...prev,
      totalWords: words,
      paragraphs
    }));
  }, [text]);

  // 处理高亮逻辑
  const handleHighlight = () => {
    if (!text || !keywords) {
      setHighlightedText(text);
      setStats(prev => ({
        ...prev,
        matches: 0,
        foundKeywords: [],
        notFoundKeywords: keywords.split(',').map(k => k.trim()).filter(k => k)
      }));
      return;
    }

    const keywordList = keywords.split(',').map(k => k.trim()).filter(k => k);
    let highlighted = text;
    let totalMatches = 0;
    const foundKeywords = new Set();
    const notFoundKeywords = [];

    // 按长度排序关键词，优先匹配长词
    keywordList.sort((a, b) => b.length - a.length);

    keywordList.forEach(keyword => {
      const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      const matches = highlighted.match(regex);
      
      if (matches) {
        foundKeywords.add(keyword);
        totalMatches += matches.length;
        highlighted = highlighted.replace(regex, `<mark class="bg-yellow-300 rounded px-1">$1</mark>`);
      } else {
        notFoundKeywords.push(keyword);
      }
    });

    setHighlightedText(highlighted);
    setStats(prev => ({
      ...prev,
      matches: totalMatches,
      foundKeywords: Array.from(foundKeywords),
      notFoundKeywords
    }));
  };

  // 应用预设关键词
  const applyPreset = (preset) => {
    setKeywords(preset);
  };

  // 处理输入变化
  const handleTextChange = (e) => {
    setText(e.target.value);
  };

  const handleKeywordsChange = (e) => {
    setKeywords(e.target.value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-300 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <Card className="shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardTitle className="text-2xl md:text-3xl font-bold">文本高亮搜索工具</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 左侧输入区域 */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3">输入文本</h2>
                  <textarea
                    value={text}
                    onChange={handleTextChange}
                    placeholder="在此输入您要处理的文本..."
                    className="w-full h-64 p-4 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>
                
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3">搜索关键词</h2>
                  <Input
                    value={keywords}
                    onChange={handleKeywordsChange}
                    placeholder="输入关键词，多个关键词请用逗号分隔"
                    className="mb-4 rounded-lg"
                  />
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {presetKeywords.map((preset, index) => (
                      <Button
                        key={index}
                        onClick={() => applyPreset(preset)}
                        variant="outline"
                        className="rounded-full text-sm hover:bg-blue-100 transition-all duration-200 hover:-translate-y-0.5"
                      >
                        {preset}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <Button 
                  onClick={handleHighlight}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-md transition-all duration-300 hover:shadow-lg"
                >
                  高亮关键词
                </Button>
              </div>
              
              {/* 右侧输出区域 */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3">高亮结果</h2>
                  <div 
                    className="w-full h-64 p-4 border border-gray-300 rounded-xl shadow-sm bg-white overflow-auto"
                    dangerouslySetInnerHTML={{ __html: highlightedText || '高亮结果显示在这里...' }}
                  />
                </div>
                
                <div className="bg-gray-50 p-4 rounded-xl">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3">统计信息</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      <p className="text-sm text-gray-500 dark:text-gray-400">字数</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalWords}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      <p className="text-sm text-gray-500 dark:text-gray-400">段落数</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.paragraphs}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      <p className="text-sm text-gray-500 dark:text-gray-400">匹配数</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.matches}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      <p className="text-sm text-gray-500 dark:text-gray-400">关键词数</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.foundKeywords.length + stats.notFoundKeywords.length}</p>
                    </div>
                  </div>
                  
                  {stats.foundKeywords.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">找到的关键词:</p>
                      <div className="flex flex-wrap gap-2">
                        {stats.foundKeywords.map((keyword, index) => (
                          <Badge key={index} className="bg-green-100 text-green-800 rounded-full px-3 py-1 dark:bg-green-900 dark:text-green-100">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {stats.notFoundKeywords.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">未找到的关键词:</p>
                      <div className="flex flex-wrap gap-2">
                        {stats.notFoundKeywords.map((keyword, index) => (
                          <Badge key={index} className="bg-red-100 text-red-800 rounded-full px-3 py-1 dark:bg-red-900 dark:text-red-100">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HightLightxt;
