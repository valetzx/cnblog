import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// 创建全局事件系统用于跨组件通信
const ScrollbarEvents = {
  listeners: new Set(),
  onCenterButtonClick(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  },
  triggerCenterButtonClick() {
    this.listeners.forEach(callback => callback());
  }
};

// 导出事件系统供外部使用
export { ScrollbarEvents };

const Scrollbars = ({ onCenterButtonClick }) => {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const timeoutRef = useRef(null);
  const trackRef = useRef(null);
  const thumbRef = useRef(null);

  // 处理中心按钮点击
  const handleCenterButtonClick = () => {
    showScrollbar();

    // 优先使用传入的回调函数
    if (onCenterButtonClick) {
      onCenterButtonClick();
    }

    // 触发全局事件
    ScrollbarEvents.triggerCenterButtonClick();
  };

  // 显示滚动条并设置自动隐藏
  const showScrollbar = () => {
    setIsVisible(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (!isInteracting) {
      timeoutRef.current = setTimeout(() => setIsVisible(false), 2000);
    }
  };

  // 计算并更新滑块高度和位置的核心函数
  const updateScrollbar = () => {
    showScrollbar();

    // 获取准确的滚动数据
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;
    const contentHeight = scrollHeight - clientHeight;

    if (contentHeight <= 0) return;

    // 计算滚动百分比
    const scrollPercentage = scrollTop / contentHeight;
    
    // 计算滑块高度比例 (可视区域/内容高度)
    const thumbRatio = Math.min(1, clientHeight / scrollHeight);
    
    // 设置CSS变量
    document.documentElement.style.setProperty('--scroll-percentage', scrollPercentage);
    document.documentElement.style.setProperty('--thumb-ratio', thumbRatio);
    document.documentElement.style.setProperty('--document-height', scrollHeight + 'px');
  };

  // 处理事件监听和路由变化
  useEffect(() => {
    // 路由变化/组件更新时立即更新一次（添加延迟确保DOM已更新）
    const timer = setTimeout(() => {
      updateScrollbar();
    }, 100); // 增加延迟确保动画容器已完全渲染

    // 页面加载完成后更新
    const handleLoad = () => {
      updateScrollbar();
    };

    // 滚动时更新
    const handleScroll = () => {
      updateScrollbar();
    };

    // 鼠标移动时显示滚动条
    const handleMouseMove = () => {
      showScrollbar();
    };

    // 窗口大小变化时更新
    const handleResize = () => {
      updateScrollbar();
    };

    // 监听自定义的动画完成事件
    const handleAnimationComplete = () => {
      setTimeout(() => {
        updateScrollbar();
      }, 50);
    };

    // 添加事件监听
    window.addEventListener('load', handleLoad);
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);
    window.addEventListener('animationComplete', handleAnimationComplete);

    // 清理函数
    return () => {
      clearTimeout(timer);
      window.removeEventListener('load', handleLoad);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('animationComplete', handleAnimationComplete);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isInteracting, location.pathname]);

  // 处理拖拽交互
  const handleInteractionStart = () => {
    setIsInteracting(true);
    showScrollbar();
  };

  const handleInteractionEnd = () => {
    setIsInteracting(false);
    showScrollbar();
  };

  return (
    <>
      {/* 全局CSS样式 */}
      <style>{`
        :root {
          --scrollbar-track-height: min(max(60vh, 120px), 300px);
          /* 滑块高度范围修改为 50px-300px */
          --scrollbar-thumb-height: clamp(50px, calc(var(--scrollbar-track-height) * var(--thumb-ratio, 0.3)), 200px);
          --scroll-percentage: 0;
          --thumb-ratio: 0.3;
        }

        .global-scrollbar {
          position: fixed;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 1000;
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
        }

        .global-scrollbar.visible {
          opacity: 1;
          pointer-events: auto;
        }

        .scrollbar-track {
          width: 6px;
          height: var(--scrollbar-track-height);
          background: rgba(156, 163, 175, 0.15);
          border-radius: 3px;
          position: relative;
          transition: background-color 0.2s ease;
        }

        .scrollbar-track:hover {
          background: rgba(156, 163, 175, 0.25);
        }

        .scrollbar-button {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          width: 9px;
          height: 9px;
          cursor: pointer;
          opacity: 0.5;
          transition: opacity 0.2s ease, transform 0.2s ease;
          z-index: 99;
          overflow: hidden;
        }

        .scrollbar-button.top {
          top: -22px;
        }

        .scrollbar-button.top::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 86.6%;
          background: rgba(156, 163, 175, 0.6);
          clip-path: polygon(50% 0, 100% 100%, 0 100%);
          border-radius: 2px;
        }

        .scrollbar-button.bottom {
          bottom: -16px;
        }

        .scrollbar-button.bottom::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 86.6%;
          background: rgba(156, 163, 175, 0.6);
          clip-path: polygon(50% 100%, 100% 0, 0 0);
          border-radius: 2px;
        }

        /* 中心圆形按钮样式 */
        .scrollbar-center-button {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          width: 8px;
          height: 8px;
          background: rgba(156, 163, 175, 0.4);
          border-radius: 50%;
          cursor: pointer;
          opacity: 0.5;
          transition: all 0.2s ease;
          z-index: 98;
          top: -10px;
        }

        .scrollbar-center-button:hover {
          opacity: 1;
          background: rgba(156, 163, 175, 0.7);
          transform: translateX(-50%) scale(1.3);
        }

        .scrollbar-center-button:active {
          transform: translateX(-50%) scale(1.1);
        }

        .dark .scrollbar-button.top::after,
        .dark .scrollbar-button.bottom::after {
          background: rgba(107, 114, 128, 0.6);
        }

        .dark .scrollbar-button:hover {
          opacity: 0.8;
        }

        .dark .scrollbar-center-button {
          background: rgba(107, 114, 128, 0.4);
        }

        .dark .scrollbar-center-button:hover {
          background: rgba(107, 114, 128, 0.7);
        }

        .scrollbar-thumb {
          position: absolute;
          width: 8.5px;
          height: var(--scrollbar-thumb-height);
          background: rgba(156, 163, 175, 0.5);
          border-radius: 5px;
          left: 50%;
          transform: translateX(-50%);
          top: calc((var(--scrollbar-track-height) - var(--scrollbar-thumb-height)) * var(--scroll-percentage));
          transition: all 0.1s ease;
          cursor: pointer;
          backdrop-filter: blur(4px);
        }

        .scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.7);
          transform: translateX(-50%) scale(1.1);
        }

        .scrollbar-thumb:active {
          background: rgba(156, 163, 175, 0.8);
          transform: translateX(-50%) scale(1.05);
        }

        .dark .scrollbar-track {
          background: rgba(107, 114, 128, 0.15);
        }

        .dark .scrollbar-track:hover {
          background: rgba(107, 114, 128, 0.25);
        }

        .dark .scrollbar-thumb {
          background: rgba(107, 114, 128, 0.5);
        }

        .dark .scrollbar-thumb:hover {
          background: rgba(107, 114, 128, 0.7);
        }

        .dark .scrollbar-thumb:active {
          background: rgba(107, 114, 128, 0.8);
        }
      `}</style>

      {/* 滚动条组件 */}
      <div
        className={`global-scrollbar ${isVisible ? 'visible' : ''}`}
        ref={trackRef}
      >
        <div className="scrollbar-track">
          {/* 顶部按钮 - 快速到顶 */}
          <div
            className="scrollbar-button top"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              showScrollbar();
            }}
          />

          {/* 中心圆形按钮 - 可自定义功能 */}
          <div
            className="scrollbar-center-button"
            onClick={handleCenterButtonClick}
            title="自定义功能"
          />

          {/* 底部按钮 - 快速到底 */}
          <div
            className="scrollbar-button bottom"
            onClick={() => {
              const scrollHeight = document.documentElement.scrollHeight;
              const clientHeight = window.innerHeight;
              window.scrollTo({ top: scrollHeight - clientHeight, behavior: 'smooth' });
              showScrollbar();
            }}
          />

          <div
            className="scrollbar-thumb"
            ref={thumbRef}
            onMouseDown={(e) => {
              handleInteractionStart();
              e.preventDefault();

              const track = trackRef.current;
              const thumb = thumbRef.current;
              const startY = e.clientY;
              const startTop = parseFloat(getComputedStyle(thumb).top);
              const trackHeight = track.offsetHeight;
              const thumbHeight = thumb.offsetHeight;
              const maxTop = trackHeight - thumbHeight;

              const handleMouseMove = (moveEvent) => {
                const deltaY = moveEvent.clientY - startY;
                let newTop = startTop + deltaY;
                newTop = Math.max(0, Math.min(newTop, maxTop));

                const scrollPercentage = newTop / maxTop;
                const scrollHeight = document.documentElement.scrollHeight;
                const clientHeight = window.innerHeight;
                const targetScroll = scrollPercentage * (scrollHeight - clientHeight);

                window.scrollTo({ top: targetScroll, behavior: 'auto' });
              };

              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                handleInteractionEnd();
              };

              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
            onClick={(e) => {
              e.stopPropagation();
              const track = trackRef.current;
              const trackRect = track.getBoundingClientRect();
              const clickY = e.clientY - trackRect.top;
              const clickPercentage = clickY / trackRect.height;
              const scrollHeight = document.documentElement.scrollHeight;
              const clientHeight = window.innerHeight;
              const targetScroll = clickPercentage * (scrollHeight - clientHeight);
              window.scrollTo({ top: targetScroll, behavior: 'smooth' });
            }}
          />
        </div>
      </div>
    </>
  );
};

export default Scrollbars;