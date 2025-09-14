import { Input } from '@/components/ui/input';
import { CardContent, CardHeader, Card as SettingsCard, Card, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { SelectItem, Select, SelectContent, SelectValue, SelectTrigger } from '@/components/ui/select';
import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
const Settings = ({ isDialog = false, onClose }) => {
  const { theme, setTheme } = useTheme();
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

  const handleSave = () => {
    // 保存设置到本地存储
    localStorage.setItem('settingsData', JSON.stringify(settings));
    
    // 发送存储变化事件通知其他页面
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'settingsUpdated',
      newValue: Date.now().toString()
    }));

    // 添加淡出动画(暂时不淡出)
    //document.body.style.opacity = '0';
    //document.body.style.transition = 'opacity 0.5s ease';

    // 动画完成后刷新页面(暂时不刷新)
    //setTimeout(() => {
    //  window.location.reload();
    //}, 500);

    // 如果存在 onClose 回调，调用它（例如关闭对话框）
    if (isDialog && onClose) {
      onClose();
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
            <h1 className="text-2xl font-bold text-gray-800">设置</h1>
            <Button onClick={handleSave}>保存并返回</Button>
          </div>
        )}
        
        <Card>
          <CardHeader>
            <CardTitle>应用设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">主题设置</h3>
              <div className="flex items-center justify-between">
                <Label htmlFor="dark-mode">深色模式</Label>
                <Switch
                  id="dark-mode"
                  checked={theme === 'dark'}
                  onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">认证设置</h3>
              <div className="space-y-2">
                <Label htmlFor="cnb-token">CNB Token</Label>
                <Input
                  id="cnb-token"
                  type="password"
                  value={settings.cnbToken}
                  onChange={(e) => handleSettingChange('cnbToken', e.target.value)}
                  placeholder="请输入 CNB Token（必须）"
                />
                <p className="text-sm text-gray-500">
                  用于访问 CNB API 的认证令牌
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">显示设置</h3>
              <div className="space-y-2">
                <Label>排序方式</Label>
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
                <Label>状态筛选</Label>
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
                  <Label htmlFor="hide-issue-numbers">隐藏问题编号</Label>
                  <Switch
                    id="hide-issue-numbers"
                    checked={settings.hideIssueNumbers}
                    onCheckedChange={(checked) => handleSettingChange('hideIssueNumbers', checked)}
                  />
                </div>
                <p className="text-sm text-gray-500">
                  隐藏首页问题卡片中的编号显示
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="hide-state-labels">隐藏状态标签</Label>
                  <Switch
                    id="hide-state-labels"
                    checked={settings.hideStateLabels}
                    onCheckedChange={(checked) => handleSettingChange('hideStateLabels', checked)}
                  />
                </div>
                <p className="text-sm text-gray-500">
                  隐藏首页问题卡片中的开启/关闭状态标签
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">API 设置</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="api-url">API URL</Label>
                  <Input
                    id="api-url"
                    value={settings.apiUrl}
                    onChange={(e) => handleSettingChange('apiUrl', e.target.value)}
                    placeholder="请输入 API URL"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="base-repo">Base Repository</Label>
                  <Input
                    id="base-repo"
                    value={settings.baseRepo}
                    onChange={(e) => handleSettingChange('baseRepo', e.target.value)}
                    placeholder="请输入 Base Repository"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="page-num">默认页码</Label>
                  <Input
                    id="page-num"
                    type="number"
                    min="1"
                    value={settings.pageNum}
                    onChange={(e) => handleSettingChange('pageNum', parseInt(e.target.value) || 1)}
                  />
                  <p className="text-sm text-gray-500">
                    加载时的默认起始页码
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="page-size">默认每页数量</Label>
                  <Input
                    id="page-size"
                    type="number"
                    min="1"
                    max="100"
                    value={settings.sizeNum}
                    onChange={(e) => handleSettingChange('sizeNum', parseInt(e.target.value) || 20)}
                  />
                  <p className="text-sm text-gray-500">
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
