import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useNavigate, Link } from 'react-router-dom';
import { saveUserInfo, clearUserInfo } from '@/cnbUtils/indexedDB';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';

const SimpleSettings = ({ onClose }) => {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    baseRepo: '',
    pageNum: 1,
    sizeNum: 20,
  });
  const [cnbSession, setCnbSession] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [qrCodeData, setQrCodeData] = useState(null); // 新增：二维码数据
  const [pollingInterval, setPollingInterval] = useState(null); // 新增：轮询间隔

  // 页面加载时从本地存储获取设置
  useEffect(() => {
    const savedSettings = localStorage.getItem('settingsData');
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      setSettings({
        baseRepo: parsedSettings.baseRepo || '',
        pageNum: parsedSettings.pageNum || 1,
        sizeNum: parsedSettings.sizeNum || 20,
      });
    }

    // 获取 CNBSESSION
    const savedCnbSession = localStorage.getItem('CNBSESSION');
    if (savedCnbSession) {
      setCnbSession(savedCnbSession);
    }

    // 检查是否有用户信息
    const savedUser = localStorage.getItem('current_user');
    if (savedUser) {
      setUserInfo(JSON.parse(savedUser));
    }

    // 组件卸载时清除轮询
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, []);

  // 获取登录状态识别码
  const getLoginState = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_CNBCOOKIE_API_URL}/login/state`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_CNBCOOKIE}`
        }
      });

      if (!response.ok) {
        throw new Error(`获取识别码失败: ${response.status}`);
      }

      const data = await response.json();
      return data.state;
    } catch (error) {
      console.error('获取识别码失败:', error);
      throw new Error('获取识别码失败，请重试');
    }
  };

  // 检查登录状态
  const checkLoginStatus = async (state) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_CNBCOOKIE_API_URL}/login/state/${state}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_CNBCOOKIE}`
        }
      });

      if (!response.ok) {
        return null;
      }

      // 首先检查响应头中是否有CNBSESSION
      const setCookieHeader = response.headers.get('Set-Cookie');
      if (setCookieHeader && setCookieHeader.includes('CNBSESSION=')) {
        // 提取CNBSESSION值
        const sessionMatch = setCookieHeader.match(/CNBSESSION=([^;]+)/);
        if (sessionMatch && sessionMatch[1]) {
          return sessionMatch[1];
        }
      }

      // 如果响应头中没有，尝试从响应体中获取
      const responseData = await response.json();

      // 检查响应体中是否有_cookies.CNBSESSION
      if (responseData._cookies && responseData._cookies.CNBSESSION) {
        return responseData._cookies.CNBSESSION;
      }

      // 如果响应体中没有_cookies，检查是否有直接的CNBSESSION字段
      if (responseData.CNBSESSION) {
        return responseData.CNBSESSION;
      }

      return null;
    } catch (error) {
      console.error('检查登录状态失败:', error);
      return null;
    }
  };

  // 开始扫码登录流程
  const startQrCodeLogin = async () => {
    try {
      setIsLoading(true);

      // 获取识别码
      const state = await getLoginState();

      // 生成二维码URL
      const qrCodeUrl = `https://cnb.cool/login/wx/jump?ticket=${state}`;
      setQrCodeData({
        url: qrCodeUrl,
        state: state
      });

      // 开始轮询检查登录状态
      const interval = setInterval(async () => {
        const session = await checkLoginStatus(state);
        if (session) {
          clearInterval(interval);
          setPollingInterval(null);

          // 使用获取到的session进行登录
          setCnbSession(session);

          // 自动保存设置，直接传递session避免state更新延迟问题
          setTimeout(() => {
            handleSaveWithSession(session);
          }, 100);

          // 关闭二维码弹窗
          setQrCodeData(null);
        }
      }, 3000);

      setPollingInterval(interval);

    } catch (error) {
      toast.error(error.message);
      setQrCodeData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // 关闭二维码弹窗
  const closeQrCodeModal = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    setQrCodeData(null);
  };

  const validateCnbSession = async (session) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_CNBCOOKIE_API_URL}/user`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_CNBCOOKIE}`,
          'session': `${session}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const userData = await response.json();
      return userData;
    } catch (error) {
      console.error('CNBSESSION验证失败:', error);
      throw new Error('CNBSESSION验证失败，请检查是否正确');
    }
  };

  const handleSave = async () => {
    // 如果提供了CNBSESSION且用户未登录，则进行登录验证
    if (cnbSession && !userInfo) {
      setIsLoading(true);
      try {
        // 验证CNBSESSION
        const userData = await validateCnbSession(cnbSession);

        // 保存用户信息到indexedDB
        await saveUserInfo(userData, cnbSession);
        setUserInfo(userData);

        // 显示成功消息
        toast.success(`登录成功！欢迎 ${userData.nickname || userData.username}`);
      } catch (error) {
        toast.error(error.message);
        return; // 验证失败时不继续保存其他设置
      } finally {
        setIsLoading(false);
      }
    }
    // 如果清空了CNBSESSION且用户已登录，则执行退出登录
    else if (!cnbSession && userInfo) {
      try {
        await clearUserInfo();
        setUserInfo(null);
        toast.info('已退出登录');
      } catch (error) {
        console.error('清除用户信息失败:', error);
      }
    }

    // 获取现有设置
    const existingSettings = JSON.parse(localStorage.getItem('settingsData') || '{}');

    // 合并设置
    const updatedSettings = {
      ...existingSettings,
      baseRepo: settings.baseRepo,
      pageNum: settings.pageNum,
      sizeNum: settings.sizeNum,
    };

    // 保存设置到本地存储
    localStorage.setItem('settingsData', JSON.stringify(updatedSettings));

    // 单独保存 CNBSESSION 到本地存储
    localStorage.setItem('CNBSESSION', cnbSession);

    // 发送存储变化事件通知其他页面
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'settingsUpdated',
      newValue: Date.now().toString()
    }));

    // 关闭弹窗
    if (onClose) {
      onClose();
    }
  };

  const handleSaveWithSession = async (session) => {
    if (session && !userInfo) {
      setIsLoading(true);
      try {
        // 验证CNBSESSION
        const userData = await validateCnbSession(session);

        // 保存用户信息到indexedDB
        await saveUserInfo(userData, session);
        setUserInfo(userData);

        // 显示成功消息
        toast.success(`登录成功！欢迎 ${userData.nickname || userData.username}`);
      } catch (error) {
        toast.error(error.message);
        return; // 验证失败时不继续保存其他设置
      } finally {
        setIsLoading(false);
      }
    } else if (!session && userInfo) {
      // 如果清空了CNBSESSION且用户已登录，则执行退出登录
      try {
        await clearUserInfo();
        setUserInfo(null);
        toast.info('已退出登录');
      } catch (error) {
        console.error('清除用户信息失败:', error);
      }
    }

    // 获取现有设置
    const existingSettings = JSON.parse(localStorage.getItem('settingsData') || '{}');

    // 合并设置
    const updatedSettings = {
      ...existingSettings,
      baseRepo: settings.baseRepo,
      pageNum: settings.pageNum,
      sizeNum: settings.sizeNum,
    };

    // 保存设置到本地存储
    localStorage.setItem('settingsData', JSON.stringify(updatedSettings));

    // 单独保存 CNBSESSION 到本地存储
    localStorage.setItem('CNBSESSION', session);

    // 发送存储变化事件通知其他页面
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'settingsUpdated',
      newValue: Date.now().toString()
    }));

    // 关闭弹窗
    if (onClose) {
      onClose();
    }
  };

  const handleLogout = async () => {
    if (onClose) {
      onClose();
    }
    toast.warning('确定要退出登录啦？T^T', {
      duration: 6000,
      position: 'top-right',
      action: {
        label: '确认',
        onClick: async () => {
          toast.dismiss();
          try {
            await clearUserInfo();
            setCnbSession('');
            setUserInfo(null);
            toast.info('已退出登录');
          } catch (error) {
            console.error('退出登录失败:', error);
          }
        }
      },
      cancel: {
        label: '取消',
        onClick: () => toast.dismiss()
      }
    });
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleMoreSettings = () => {
    if (onClose) {
      onClose();
    }
    navigate('/settings');
  };

  return (
    <div className="space-y-6">
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
        <h3 className="text-lg font-medium">用户登录</h3>
        {userInfo ? (
          <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center space-x-3">
              <img
                src={`https://cnb.cool/users/${userInfo.username}/avatar/s`}
                alt={userInfo.nickname || userInfo.username}
                className="w-10 h-10 rounded-full"
              />
              <div>
                <p className="font-medium">{userInfo.nickname || userInfo.username}</p>
                <p className="text-sm text-gray-500">@{userInfo.username}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => {
              if (onClose) onClose();
              navigate('/user');
            }} className="mr-2">
              用户主页
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              退出登录
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="cnb-session">CNBSESSION</Label>
            <div className="flex items-center gap-2">
              <Input
                id="cnb-session"
                type="password"
                value={cnbSession}
                onChange={(e) => setCnbSession(e.target.value)}
                placeholder="请输入 cookie 中的 CNBSESSION 值"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="default"
                onClick={() => {
                  // TODO: 实现扫码登录功能
                  startQrCodeLogin();
                }}
                title="扫码登录"
              >
                扫码登录
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">主页仓库</h3>
        <div className="space-y-2">
          <Label htmlFor="base-repo">默认仓库</Label>
          <Input
            id="base-repo"
            value={settings.baseRepo}
            onChange={(e) => handleSettingChange('baseRepo', e.target.value)}
            placeholder="请输入主页需要渲染的 issue 仓库，例：cnb/feedback"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">分页设置</h3>
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
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-4">
        <Button variant="secondary" onClick={handleMoreSettings}>
          更多设置
        </Button>
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? '验证中...' : '保存设置'}
        </Button>
      </div>

      {/* 二维码登录弹窗 */}
      <Dialog open={!!qrCodeData} onOpenChange={(open) => !open && closeQrCodeModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>扫码登录</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            <div className="bg-white p-4 rounded-lg border">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeData?.url || '')}`}
                alt="登录二维码"
                className="w-48 h-48"
              />
            </div>
            <p className="text-sm text-gray-500 text-center">
              请使用微信扫描上方二维码进行登录
            </p>
            <p className="text-xs text-gray-400 text-center">
              登录成功后会自动关闭此窗口
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SimpleSettings;
