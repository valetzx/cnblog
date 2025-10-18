import React, { useState, useEffect } from 'react';
import { AvatarCache } from '@/lib/avatarCache';

const CachedAvatar = ({ username, nickname, className = "", size = "s" }) => {
  const [imgError, setImgError] = useState(false);
  const [cachedResponse, setCachedResponse] = useState(null);
  const avatarUrl = `https://cnb.cool/users/${username}/avatar/${size}`;
  const initial = nickname?.charAt(0) || username?.charAt(0) || '匿';

  useEffect(() => {
    // 初始化缓存
    AvatarCache.init();

    // 尝试从缓存获取头像
    const loadCachedAvatar = async () => {
      try {
        const response = await AvatarCache.getCachedAvatar(avatarUrl);
        if (response) {
          setCachedResponse(response);
        } else {
          // 如果没有缓存，则获取并缓存
          const newResponse = await AvatarCache.cacheAvatar(avatarUrl);
          if (newResponse) {
            setCachedResponse(newResponse);
          }
        }
      } catch (error) {
        console.warn('Failed to load cached avatar:', error);
      }
    };

    loadCachedAvatar();
  }, [avatarUrl]);

  const handleImageError = () => {
    setImgError(true);
    setCachedResponse(null);
  };

  // 直接使用opaque响应创建图片URL
  const getImageUrl = () => {
    if (cachedResponse) {
      // 对于opaque响应，我们可以直接使用原始URL
      // 因为响应已经被缓存，浏览器会从缓存中获取
      return avatarUrl;
    }
    return avatarUrl;
  };

  return (
    <div className={`relative ${className}`}>
      {!imgError && cachedResponse ? (
        <img
          src={getImageUrl()}
          alt={`${nickname || username}的头像`}
          className="rounded-full w-8 h-8 object-cover border border-gray-200"
          onError={handleImageError}
          loading="lazy"
        />
      ) : !imgError ? (
        <img
          src={avatarUrl}
          alt={`${nickname || username}的头像`}
          className="rounded-full w-8 h-8 object-cover border border-gray-200"
          onError={handleImageError}
          loading="lazy"
        />
      ) : (
        <div className="rounded-full w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-800 border border-blue-200 font-medium">
          {initial}
        </div>
      )}
    </div>
  );
};

export default CachedAvatar;
