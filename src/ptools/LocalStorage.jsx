import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Trash2, RefreshCw, Search } from 'lucide-react';

const LocalStorage = () => {
  const [storageData, setStorageData] = useState({});
  const [searchKey, setSearchKey] = useState('');
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState('');

  // 加载本地存储数据
  const loadStorageData = () => {
    try {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        try {
          const value = localStorage.getItem(key);
          // 尝试解析JSON
          try {
            data[key] = JSON.parse(value);
          } catch {
            data[key] = value;
          }
        } catch (err) {
          data[key] = '无法读取数据';
        }
      }
      setStorageData(data);
      setError('');
    } catch (err) {
      setError('加载本地存储数据失败');
    }
  };

  // 初始化加载数据
  useEffect(() => {
    loadStorageData();
  }, []);

  // 复制到剪贴板
  const copyToClipboard = (key, value) => {
    try {
      navigator.clipboard.writeText(JSON.stringify(value, null, 2));
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 2000);
    } catch (err) {
      setError('复制失败');
    }
  };

  // 删除数据
  const deleteData = (key) => {
    try {
      localStorage.removeItem(key);
      loadStorageData();
    } catch (err) {
      setError('删除失败');
    }
  };

  // 清空所有数据
  const clearAllData = () => {
    if (confirm('确定要清空所有本地存储数据吗？此操作不可恢复！')) {
      try {
        localStorage.clear();
        loadStorageData();
      } catch (err) {
        setError('清空失败');
      }
    }
  };

  // 搜索过滤
  const filteredData = Object.entries(storageData).filter(([key]) => 
    key.toLowerCase().includes(searchKey.toLowerCase())
  );

  return (
    <div className="min-h-screen p-4 pb-10">
      <div className="mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>本地存储管理</span>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={loadStorageData}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  刷新
                </Button>
                <Button variant="destructive" onClick={clearAllData}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  清空所有
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-gray-500" />
                <Input
                  placeholder="搜索键名..."
                  value={searchKey}
                  onChange={(e) => setSearchKey(e.target.value)}
                  className="flex-1"
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredData.map(([key, value]) => (
            <Card key={key} className="flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium truncate" title={key}>
                  {key}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="flex-1 mb-4">
                  <pre className="text-xs bg-gray-100 dark:bg-slate-800 p-2 rounded overflow-auto max-h-32">
                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                  </pre>
                </div>
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(key, value)}
                    className="flex items-center"
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    {copiedKey === key ? '已复制' : '复制'}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteData(key)}
                    className="flex items-center"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    删除
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredData.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">没有找到匹配的数据</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocalStorage;
