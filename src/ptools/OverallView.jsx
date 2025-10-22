import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink, RefreshCw, RotateCw } from 'lucide-react';
import { Viewer } from '@photo-sphere-viewer/core';
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin';
import { GyroscopePlugin } from '@photo-sphere-viewer/gyroscope-plugin';
import '@photo-sphere-viewer/core/index.css';

const OverallView = () => {
  const { url } = useParams();
  const [iframeUrl, setIframeUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAutoRotate, setIsAutoRotate] = useState(false);
  const [rotationSpeed, setRotationSpeed] = useState(1);
  const viewerRef = useRef(null);
  const viewerInstance = useRef(null);
  const rotationInterval = useRef(null);
  const hideNavbarTimeout = useRef(null);

  useEffect(() => {
    if (url) {
      try {
        // 将二进制字符串转换为普通字符串
        const binaryString = url.replace(/%20/g, ' ');
        const decodedUrl = binaryString.split(' ').map(bin => {
          return String.fromCharCode(parseInt(bin, 2));
        }).join('');
        
        // 验证URL格式
        new URL(decodedUrl);
        setIframeUrl(decodedUrl);
        setLoading(false);
      } catch (e) {
        setError('无效的URL格式');
        setLoading(false);
      }
    }
  }, [url]);

  // 初始化全景查看器
  useEffect(() => {
    if (viewerRef.current && iframeUrl) {
      // 销毁之前的实例
      if (viewerInstance.current) {
        viewerInstance.current.destroy();
      }

      // 创建新的查看器实例
      viewerInstance.current = new Viewer({
        container: viewerRef.current,
        panorama: iframeUrl,
        plugins: [
          [MarkersPlugin, {
            markers: [
              {
                id: 'marker-1',
                position: { yaw: 0, pitch: 0 },
                image: 'https://nocode.meituan.com/photo/search?keyword=pin&width=32&height=32',
                size: { width: 32, height: 32 },
                tooltip: '点击查看详情'
              }
            ]
          }],
          [GyroscopePlugin]
        ],
        navbar: [
          'zoom',
          'move',
          'markers',
          'gyroscope',
          'caption',
          'fullscreen'
        ],
        defaultLat: 0,
        defaultLng: 0,
        defaultZoomLvl: 1,
        mousewheel: true,
        mousemove: true,
        touchmoveTwoFingers: true
      });

      // 设置自动旋转
      if (isAutoRotate) {
        startAutoRotate();
      }

      // 添加鼠标移动事件监听器
      const container = viewerRef.current;
      const handleMouseMove = () => {
        // 显示导航栏
        if (viewerInstance.current) {
          viewerInstance.current.navbar.show();
        }
        // 清除之前的定时器
        if (hideNavbarTimeout.current) {
          clearTimeout(hideNavbarTimeout.current);
        }
        // 设置新的定时器，3秒后隐藏导航栏
        hideNavbarTimeout.current = setTimeout(() => {
          if (viewerInstance.current) {
            viewerInstance.current.navbar.hide();
          }
        }, 3000);
      };

      container.addEventListener('mousemove', handleMouseMove);

      // 清理函数
      return () => {
        container.removeEventListener('mousemove', handleMouseMove);
        if (hideNavbarTimeout.current) {
          clearTimeout(hideNavbarTimeout.current);
        }
      };
    }

    return () => {
      if (viewerInstance.current) {
        viewerInstance.current.destroy();
        viewerInstance.current = null;
      }
      if (rotationInterval.current) {
        clearInterval(rotationInterval.current);
        rotationInterval.current = null;
      }
    };
  }, [iframeUrl, isAutoRotate, rotationSpeed]);

  // 开始自动旋转
  const startAutoRotate = () => {
    if (viewerInstance.current && isAutoRotate) {
      if (rotationInterval.current) {
        clearInterval(rotationInterval.current);
      }
      
      rotationInterval.current = setInterval(() => {
        try {
          const currentPosition = viewerInstance.current.getPosition();
          viewerInstance.current.rotate({ 
            yaw: currentPosition.yaw - (rotationSpeed * 0.001), // 进一步减小步长
            pitch: currentPosition.pitch 
          });
        } catch (error) {
          console.error('自动旋转失败:', error);
          stopAutoRotate();
          setIsAutoRotate(false);
        }
      }, 10); // 增加间隔时间
    }
  };

  // 停止自动旋转
  const stopAutoRotate = () => {
    if (rotationInterval.current) {
      clearInterval(rotationInterval.current);
      rotationInterval.current = null;
    }
  };

  // 切换自动旋转状态
  const toggleAutoRotate = () => {
    setIsAutoRotate(!isAutoRotate);
    if (!isAutoRotate) {
      startAutoRotate();
    } else {
      stopAutoRotate();
    }
  };

  // 处理刷新
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    if (isAutoRotate) {
      stopAutoRotate();
      setTimeout(() => {
        if (isAutoRotate) {
          startAutoRotate();
        }
      }, 100);
    }
  };

  // 处理在新标签页打开
  const handleOpenInNewTab = () => {
    if (iframeUrl) {
      window.open(iframeUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <Card className="w-full h-[calc(100vh-2rem)]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>360° 全景视图</CardTitle>
          <div className="flex space-x-2">
            <div className="flex items-center space-x-2">
              <Label htmlFor="auto-rotate">自动旋转</Label>
              <Button
                variant={isAutoRotate ? "default" : "outline"}
                size="sm"
                onClick={toggleAutoRotate}
                className="flex items-center space-x-1"
              >
                <RotateCw className={`h-4 w-4 ${isAutoRotate ? 'animate-spin' : ''}`} />
                <span>{isAutoRotate ? '停止' : '开始'}</span>
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="rotation-speed">速度</Label>
              <Input
                id="rotation-speed"
                type="number"
                min="1"
                max="10"
                value={rotationSpeed}
                onChange={(e) => setRotationSpeed(parseInt(e.target.value) || 1)}
                className="w-16 text-center"
                disabled={!isAutoRotate}
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新
            </Button>
            <Button variant="outline" size="sm" onClick={handleOpenInNewTab}>
              <ExternalLink className="h-4 w-4 mr-2" />
              新窗口打开
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 h-[calc(100%-4rem)]">
          <div ref={viewerRef} className="w-full h-full" />
        </CardContent>
      </Card>
    </div>
  );
};

export default OverallView;
