import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Scrollbars from './Scrollbars';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const Layout = ({ children, className = "" }) => {
  const location = useLocation();
  const [navigationHistory, setNavigationHistory] = useState([location.pathname]);
  const [navigationDirection, setNavigationDirection] = useState("forward");

  // 检测导航方向
  useEffect(() => {
    const currentPath = location.pathname;

    setNavigationHistory(prev => {
      // 如果当前路径已经在历史记录中，说明是后退
      const existingIndex = prev.indexOf(currentPath);

      if (existingIndex !== -1 && existingIndex < prev.length - 1) {
        // 后退操作
        setNavigationDirection("backward");
        return prev.slice(0, existingIndex + 1);
      } else if (existingIndex === -1) {
        // 前进操作
        setNavigationDirection("forward");
        // 限制历史记录最多为3条
        const newHistory = [...prev, currentPath];
        if (newHistory.length > 2) {
          return newHistory.slice(-2);
        }
        return newHistory;
      }

      // 当前路径就是最后一个路径，保持方向不变
      return prev;
    });
  }, [location.pathname]);

  // 定义前进和后退动画 - 让两个页面同时可见
  const forwardAnimation = {
    initial: { x: "100%", opacity: 0.5 },
    animate: { x: 0, opacity: 1 },
    exit: { x: "-100%", opacity: 0.5 }
  };

  const backwardAnimation = {
    initial: { x: "-100%", opacity: 0.5 },
    animate: { x: 0, opacity: 1 },
    exit: { x: "100%", opacity: 0.5 }
  };

  const currentAnimation = navigationDirection === "forward" ? forwardAnimation : backwardAnimation;

  // 在动画完成后强制更新滚动条
  const handleAnimationComplete = () => {
    // 延迟执行以确保DOM已完全更新
    setTimeout(() => {
      // 触发滚动事件来更新滚动条
      window.dispatchEvent(new Event('scroll'));
      // 触发resize事件来更新滚动条
      window.dispatchEvent(new Event('resize'));
      // 触发自定义动画完成事件
      window.dispatchEvent(new Event('animationComplete'));
    }, 50);
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* 静态侧边栏 - 不参与动画 */}
      <Sidebar />

      {/* 主内容区域 - 包含动画 */}
      <main className={cn("flex-1 px-2 bg-gray-50 dark:bg-slate-900 md:ml-[64px] overflow-y-auto pb-10", className)}>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={location.pathname}
            initial={currentAnimation.initial}
            animate={currentAnimation.animate}
            exit={currentAnimation.exit}
            transition={{
              duration: 0.3,
              ease: "easeInOut"
            }}
            onAnimationComplete={handleAnimationComplete}
            style={{
              position: "relative",
              width: "100%",
              minHeight: "100%"
            }}
            className="layout-content"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 静态悬浮滚动条 - 不参与动画 */}
      <Scrollbars />
    </div>
  );
};

export default Layout;
