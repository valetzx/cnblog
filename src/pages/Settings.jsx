import { Input } from '@/components/ui/input';
import { CardContent, CardHeader, Card, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { SelectItem, Select, SelectContent, SelectValue, SelectTrigger } from '@/components/ui/select';
import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from '@/components/ui/sonner';

const Settings = ({ isDialog = false, onClose }) => {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    sortOption: 'updated_desc',
    filterOption: 'all',
    cnbToken: '',
    apiUrl: '',
    baseRepo: '',
    pageNum: 1,
    sizeNum: 20,
    hideIssueNumbers: true,
    hideStateLabels: true,
  });
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [progress, setProgress] = useState(0);

  // 页面加载时从本地存储获取设置
  useEffect(() => {
    const savedSettings = localStorage.getItem('settingsData');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  // 在组件挂载时恢复页面透明度
  useEffect(() => {
    document.body.style.opacity = '1';
    document.body.style.transition = 'none';
  }, []);

  window.addEventListener('storage', (event) => {
    if (event.key === 'settingsUpdated') {
      // 执行更新逻辑
    }
  });

  // 清除缓存函数
  const clearCache = async () => {
    setIsClearingCache(true);
    setProgress(0);

    // 初始化统计计数器
    let localStorageCount = 0;
    let cookiesCount = 0;
    let indexedDBCount = 0;
    let sessionStorageCount = 0;

    // 随机生成清理时间
    const duration = Math.random() * 680 + 1200;
    const startTime = Date.now();

    // 进度条动画
    const interval = setInterval(async () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);

      if (elapsed >= duration) {
        clearInterval(interval);

        // 实际清理缓存并统计数量
        // 清理 localStorage
        localStorageCount = Object.keys(localStorage).length;
        localStorage.clear();

        // 清理 cookies
        if (document.cookie) {
          cookiesCount = document.cookie.split(';').length;
          document.cookie.split(';').forEach(cookie => {
            const [name] = cookie.split('=');
            document.cookie = `${name.trim()}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
          });
        }

        // 清理 indexedDB
        if (window.indexedDB) {
          try {
            const databases = await window.indexedDB.databases();
            indexedDBCount = databases.length;
            for (const db of databases) {
              if (db.name) {
                window.indexedDB.deleteDatabase(db.name);
              }
            }
          } catch (error) {
            console.warn('清理 indexedDB 时出错:', error);
          }
        }

        // 清理 sessionStorage
        sessionStorageCount = Object.keys(sessionStorage).length;
        sessionStorage.clear();

        // 重置设置状态
        setSettings({
          sortOption: 'updated_desc',
          filterOption: 'all',
          cnbToken: '',
          apiUrl: '',
          baseRepo: '',
          pageNum: 1,
          sizeNum: 20,
          hideIssueNumbers: true,
          hideStateLabels: true,
        });

        setIsClearingCache(false);
        setProgress(0);

        // 显示清理完成toast通知，使用自定义进度条样式
        toast.success(`清理完成！共清理了 ${localStorageCount} 条浏览器储存, ${cookiesCount} 条 Cookie, ${indexedDBCount} 条 IndexedDB。`, {
          duration: 5000,
          position: 'top-right',
        });
      }
    }, 50);
  };

  // 确认清理缓存
  const confirmClearCache = () => {
    toast.warning('确定要清理所有缓存数据吗？此操作不可恢复！', {
      duration: 6000,
      position: 'top-center',
      action: {
        label: '确认',
        onClick: () => {
          toast.dismiss();
          clearCache();
        }
      },
      cancel: {
        label: '取消',
        onClick: () => toast.dismiss()
      }
    });
  };

  const handleSave = () => {
    // 保存设置到本地存储
    localStorage.setItem('settingsData', JSON.stringify(settings));
    
    // 发送存储变化事件通知其他页面
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'settingsUpdated',
      newValue: Date.now().toString()
    }));

    // 如果存在 onClose 回调，调用它（例如关闭对话框）
    if (isDialog && onClose) {
      onClose();
    }

    // 如果不是对话框模式，保存后返回首页
    if (!isDialog) {
      navigate('/');
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className={isDialog ? "" : "min-h-screen p-4"}>
      <div className={isDialog ? "" : "max-w-2xl mx-auto"}>
        {!isDialog && (
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">设置</h1>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={confirmClearCache}
                disabled={isClearingCache}
              >
                {isClearingCache ? '清理中...' : '清除缓存'}
              </Button>
              <Button onClick={handleSave}>保存并返回</Button>
            </div>
          </div>
        )}
        
        {isClearingCache && (
          <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">正在清理缓存...</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <motion.div
                className="bg-blue-500 h-2 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-gray-800 dark:text-gray-200">应用设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">主题设置</h3>
              <div className="flex items-center justify-between">
                <Label htmlFor="dark-mode" className="text-gray-800 dark:text-gray-200">深色模式</Label>
                <Switch
                  id="dark-mode"
                  checked={theme === 'dark'}
                  onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">认证设置</h3>
              <div className="space-y-2">
                <Label htmlFor="cnb-token" className="text-gray-800 dark:text-gray-200">CNB Token</Label>
                <Input
                  id="cnb-token"
                  type="password"
                  value={settings.cnbToken}
                  onChange={(e) => handleSettingChange('cnbToken', e.target.value)}
                  placeholder="请输入 CNB Token（必须）"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  用于访问 CNB API 的认证令牌
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">显示设置</h3>
              <div className="space-y-2">
                <Label className="text-gray-800 dark:text-gray-200">排序方式</Label>
                <Select value={settings.sortOption} onValueChange={(value) => handleSettingChange('sortOption', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="number_asc">编号 ⬆️</SelectItem>
                    <SelectItem value="number_desc">编号 ⬇️</SelectItem>
                    <SelectItem value="updated_asc">更新时间 ⬆️</SelectItem>
                    <SelectItem value="updated_desc">更新时间 ⬇️</SelectItem>
                    <SelectItem value="comments_asc">评论数 ⬆️</SelectItem>
                    <SelectItem value="comments_desc">评论数 ⬇️</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-gray-800 dark:text-gray-200">状态筛选</Label>
                <Select value={settings.filterOption} onValueChange={(value) => handleSettingChange('filterOption', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="open">开启</SelectItem>
                    <SelectItem value="closed">关闭</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="hide-issue-numbers" className="text-gray-800 dark:text-gray-200">隐藏问题编号</Label>
                  <Switch
                    id="hide-issue-numbers"
                    checked={settings.hideIssueNumbers}
                    onCheckedChange={(checked) => handleSettingChange('hideIssueNumbers', checked)}
                  />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  隐藏首页问题卡片中的编号显示
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="hide-state-labels" className="text-gray-800 dark:text-gray-200">隐藏状态标签</Label>
                  <Switch
                    id="hide-state-labels"
                    checked={settings.hideStateLabels}
                    onCheckedChange={(checked) => handleSettingChange('hideStateLabels', checked)}
                  />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  隐藏首页问题卡片中的开启/关闭状态标签
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">API 设置</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="api-url" className="text-gray-800 dark:text-gray-200">API URL</Label>
                  <Input
                    id="api-url"
                    value={settings.apiUrl}
                    onChange={(e) => handleSettingChange('apiUrl', e.target.value)}
                    placeholder="请输入 API URL"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="base-repo" className="text-gray-800 dark:text-gray-200">默认仓库</Label>
                  <Input
                    id="base-repo"
                    value={settings.baseRepo}
                    onChange={(e) => handleSettingChange('baseRepo', e.target.value)}
                    placeholder="请输入主页需要渲染的Issue仓库，例：cnb/feedback"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="page-num" className="text-gray-800 dark:text-gray-200">默认页码</Label>
                  <Input
                    id="page-num"
                    type="number"
                    min="1"
                    value={settings.pageNum}
                    onChange={(e) => handleSettingChange('pageNum', parseInt(e.target.value) || 1)}
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    加载时的默认起始页码
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="page-size" className="text-gray-800 dark:text-gray-200">默认每页数量</Label>
                  <Input
                    id="page-size"
                    type="number"
                    min="1"
                    max="100"
                    value={settings.sizeNum}
                    onChange={(e) => handleSettingChange('sizeNum', parseInt(e.target.value) || 20)}
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    每次加载的页面数量（1-100）
                  </p>
                </div>
              </div>
            </div>
            
            {isDialog && (
              <div className="flex justify-end pt-4">
                <Button onClick={handleSave}>保存设置</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
