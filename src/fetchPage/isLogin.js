import { useState, useEffect, useCallback } from 'react';

const useLoginStatus = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckedDate, setLastCheckedDate] = useState(null);

  // 验证CNBSESSION的有效性
  const validateCnbSession = useCallback(async (session) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_CNBCOOKIE_API_URL}/user`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_CNBCOOKIE}`,
          'Accept': 'application/vnd.cnb.web+json',
          'session': `${session}`
        }
      });

      const data = await response.json();

      if (data.errcode === 16) {
        // 登录失效，清除本地存储
        localStorage.removeItem('CNBSESSION');
        localStorage.removeItem('currentUser');
        setIsLoggedIn(false);
        return false;
      }

      if (!data.errcode) {
        // 登录有效，记录验证日期
        const today = new Date().toDateString();
        localStorage.setItem('cnbcheckAt', today);
        setLastCheckedDate(today);
        setIsLoggedIn(true);
        return true;
      }

      // 其他错误情况
      setIsLoggedIn(false);
      return false;
    } catch (error) {
      console.error('验证会话失败:', error);
      setIsLoggedIn(false);
      return false;
    }
  }, []);

  // 检查登录状态
  const checkLoginStatus = useCallback(async () => {
    const session = localStorage.getItem('CNBSESSION');
    const lastChecked = localStorage.getItem('cnbcheckAt');
    const today = new Date().toDateString();

    // 如果今天已经检查过，不再重复检查
    if (lastChecked === today) {
      setLastCheckedDate(today);
      setIsLoggedIn(!!session);
      return;
    }

    if (!session) {
      setIsLoggedIn(false);
      return;
    }

    setIsChecking(true);
    try {
      await validateCnbSession(session);
    } finally {
      setIsChecking(false);
    }
  }, [validateCnbSession]);

  // 手动刷新登录状态
  const refreshLoginStatus = useCallback(() => {
    localStorage.removeItem('cnbcheckAt');
    checkLoginStatus();
  }, [checkLoginStatus]);

  // 组件挂载时检查登录状态
  useEffect(() => {
    const lastChecked = localStorage.getItem('cnbcheckAt');
    setLastCheckedDate(lastChecked);

    checkLoginStatus();
  }, [checkLoginStatus]);

  return {
    isLoggedIn,
    isChecking,
    lastCheckedDate,
    checkLoginStatus,
    refreshLoginStatus
  };
};

export default useLoginStatus;
