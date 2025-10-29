import React, { useRef, useEffect, useState } from 'react';

const RandomBackground = ({
  className = '',
  gridSize = 20,
  clickToUpdate = true,
  children
}) => {
  const containerRef = useRef(null);
  const [shapes, setShapes] = useState([]);

  // 随机颜色数组
  const colors = [
    '#2563eb', '#1d4ed8', '#1e40af', '#4f46e5', '#4338ca', '#3730a3',
    '#9333ea', '#7e22ce', '#6b21a8', '#db2777', '#be185d', '#9d174d',
    '#dc2626', '#b91c1c', '#991b1b', '#fb923c', '#f97316', '#ea580c',
    '#c2410c', '#9a3412', '#16a34a', '#15803d', '#166534', '#0d9488',
    '#0f766e', '#115e59', '#0891b2', '#0e7490', '#155e75', '#FFFFFF'
  ];

  // 生成随机形状
  const generateShapes = () => {
    const newShapes = [];

    for (let i = 0; i < gridSize; i++) {
      const shape = {
        id: i,
        width: Math.random() * 40 + 60, // 60-100vmin
        height: Math.random() * 40 + 60, // 60-100vmin
        translateX: (Math.random() * 240 - 120) + '%', // -120% to 120%
        translateY: (Math.random() * 160 - 80) + '%', // -80% to 80%
        scale: Math.random() * 2 + 0.8, // 0.8-2.8
        skew: Math.random() * 45 + 'deg', // 0-45deg
        opacity: Math.random() * 0.4 + 0.5, // 0.5-0.9
        color: colors[Math.floor(Math.random() * colors.length)],
        top: (Math.random() * 160 - 80) + '%', // -80% to 80%
        left: (Math.random() * 160 - 80) + '%', // -80% to 80%
        animationDuration: (Math.random() * 20 + 6.1) + 's', // 6.1-26.1s
        animationDelay: (-Math.random() * 2 - 0.5) + 's', // -0.5 to -2.5s
        // 生成随机多边形clip-path
        clipPath: generateRandomPolygon()
      };
      newShapes.push(shape);
    }

    setShapes(newShapes);
  };

  // 生成随机多边形
  const generateRandomPolygon = () => {
    const points = [];

    // 生成6个随机点
    for (let i = 0; i < 6; i++) {
      const x = i < 3 ?
        Math.random() * (i === 0 ? 30 : i === 1 ? 30 : 40) + (i === 0 ? 0 : i === 1 ? 30 : 60) :
        Math.random() * (i === 3 ? 40 : i === 4 ? 30 : 30) + (i === 3 ? 60 : i === 4 ? 30 : 0);

      const y = i < 3 ?
        Math.random() * (i === 0 ? 50 : i === 1 ? 30 : 50) + (i === 0 ? 0 : i === 1 ? 0 : 0) :
        Math.random() * 50 + 50;

      points.push(`${x.toFixed(1)}% ${y.toFixed(1)}%`);
    }

    return `polygon(${points.join(', ')})`;
  };

  // 初始化形状
  useEffect(() => {
    generateShapes();
  }, [gridSize]);

  // 点击更新形状
  const handleClick = () => {
    if (clickToUpdate) {
      generateShapes();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden ${className}`}
      onClick={handleClick}
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        backgroundColor: 'transparent',
        backdropFilter: 'blur(150px)',
        WebkitBackdropFilter: 'blur(150px)',
        opacity: 0.8
      }}
    >
      {/* 背景模糊层 */}
      <div
        className="absolute inset-0 backdrop-blur-[100px]"
        style={{
          top: '-100%',
          left: '-100%',
          right: '-100%',
          bottom: '-100%',
          zIndex: 1,
          opacity: 0.7
        }}
      />

      {/* 随机形状 */}
      {shapes.map((shape) => (
        <div
          key={shape.id}
          className="absolute transform-gpu"
          style={{
            width: `${shape.width}vmin`,
            height: `${shape.height}vmin`,
            transform: `translate(${shape.translateX}, ${shape.translateY}) scale(${shape.scale}) skew(${shape.skew})`,
            clipPath: shape.clipPath,
            background: shape.color,
            opacity: shape.opacity,
            top: shape.top,
            left: shape.left,
            animation: `colorChange ${shape.animationDuration} infinite ${shape.animationDelay} linear alternate`,
            zIndex: 2
          }}
        />
      ))}

      {/* 子内容 */}
      <div className="relative z-10">
        {children}
      </div>

      <style>{`
        @keyframes colorChange {
          100% {
            left: 0;
            top: 0;
            filter: hue-rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default RandomBackground;
