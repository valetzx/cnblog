import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getBatchImageUrlsFromCache } from '@/cnbUtils/imageCache';

const ImagePreview = ({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
  repopath = '',
  number = '',
  imageType = 'infoimg'
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [cachedImages, setCachedImages] = useState([]);
  const imageRef = useRef(null);

  // 从缓存获取图片URL
  const fetchCachedImages = useCallback(async () => {
    if (!repopath || !number || !images || images.length === 0) {
      setCachedImages(images || []);
      return;
    }

    try {
      const cachedUrls = await getBatchImageUrlsFromCache(repopath, number, imageType, images);
      const processedImages = images.map(url => cachedUrls[url] || url);
      setCachedImages(processedImages);
    } catch (error) {
      console.error('从缓存获取图片失败:', error);
      setCachedImages(images || []);
    }
  }, [repopath, number, imageType, images]);

  // 使用 useCallback 缓存事件处理函数
  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : cachedImages.length - 1));
  }, [cachedImages.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < cachedImages.length - 1 ? prev + 1 : 0));
  }, [cachedImages.length]);

  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.1, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev - 0.1, 0.5));
  }, []);

  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  }, [scale, position]);

  const handleMouseMove = useCallback((e) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, scale, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (!isOpen) return;
    
    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case 'ArrowLeft':
        handlePrevious();
        break;
      case 'ArrowRight':
        handleNext();
        break;
      case '+':
        handleZoomIn();
        break;
      case '-':
        handleZoomOut();
        break;
    }
  }, [isOpen, onClose, handlePrevious, handleNext, handleZoomIn, handleZoomOut]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    if (e.target === imageRef.current) {
      if (e.deltaY < 0) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    }
  }, [handleZoomIn, handleZoomOut]);

  // 使用 useMemo 缓存当前图片 URL，避免不必要的重新渲染
  const currentImageSrc = useMemo(() => {
    return cachedImages && cachedImages.length > 0 ? cachedImages[currentIndex] : '';
  }, [cachedImages, currentIndex]);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setScale(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      fetchCachedImages();
    }
  }, [isOpen, initialIndex, fetchCachedImages]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('wheel', handleWheel, { passive: false });
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('wheel', handleWheel);
      };
    }
  }, [isOpen, handleKeyDown, handleMouseMove, handleMouseUp, handleWheel]);

  if (!isOpen || !cachedImages || cachedImages.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/80">
      <div className="relative w-full h-full flex items-center justify-center">
        {/* 关闭按钮 */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-6 right-6 text-white hover:bg-white/20 z-60"
          onClick={onClose}
        >
          <X className="h-6 w-6" />
        </Button>

        {cachedImages.length > 1 && (
          <>
            {/* 上一张按钮 */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-6 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20 z-60"
              onClick={handlePrevious}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>

            {/* 下一张按钮 */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-6 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20 z-60"
              onClick={handleNext}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </>
        )}

        <div className="max-w-4xl max-h-[90vh] flex items-center justify-center z-50">
          <div className="relative">
            <img
              ref={imageRef}
              src={currentImageSrc}
              alt={`图片 ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain cursor-move"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                cursor: scale > 1 ? 'move' : 'default',
                transition: 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              }}
              onMouseDown={handleMouseDown}
            />
            
            {/* 工具栏 */}
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-3 bg-black/50 rounded-lg p-3 z-60">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={handleZoomOut}
                disabled={scale <= 0.5}
              >
                <ZoomOut className="h-5 w-5" />
              </Button>
              
              <span className="text-white flex items-center px-3">
                {Math.round(scale * 100)}%
              </span>

              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={handleZoomIn}
                disabled={scale >= 5}
              >
                <ZoomIn className="h-5 w-5" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={handleRotate}
              >
                <RotateCw className="h-5 w-5" />
              </Button>
            </div>

            {cachedImages.length > 1 && (
              <div className="fixed bottom-28 left-1/2 transform -translate-x-1/2 flex space-x-3 z-60">
                {cachedImages.map((_, index) => (
                  <button
                    key={index}
                    className={`w-2 h-2 rounded-full transition-all duration-200 hover:scale-125 ${
                      index === currentIndex
                        ? 'bg-white scale-125 shadow-lg'
                        : 'bg-white/50 hover:bg-white/80'
                    }`}
                    onClick={() => setCurrentIndex(index)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImagePreview;
