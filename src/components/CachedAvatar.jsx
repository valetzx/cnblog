import React, { useState, useEffect } from 'react';

const CachedAvatar = ({ username, nickname, className = "", size = "s" }) => {
  const [imgError, setImgError] = useState(false);
  const avatarUrl = `https://cnb.cool/users/${username}/avatar/${size}`;
  const initial = nickname?.charAt(0) || username?.charAt(0) || '匿';

  const handleImageError = () => {
    setImgError(true);
  };

  return (
    <div className={`relative ${className}`}>
      {!imgError ? (
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
