import React, { useState, useRef, useEffect } from 'react';
import { motion, useScroll, useTransform, useInView } from "framer-motion";

const PhotoAlbum = () => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);
  const [page, setPage] = useState(1);

  function useParallax(value, distance) {
    return useTransform(value, [0, 1], [-distance, distance]);
  }

  useEffect(() => {
    // 模拟加载照片数据
    const loadPhotos = () => {
      try {
        const mockPhotos = [
          {
            id: 1,
            title: 'PINK',
            url: 'https://nocode.meituan.com/photo/search?keyword=landscape&width=400&height=300',
            description: '美丽的自然风景照片'
          },
          {
            id: 2,
            title: 'NIGHT',
            url: 'https://nocode.meituan.com/photo/search?keyword=city,night&width=400&height=300',
            description: '繁华的城市夜景'
          },
          {
            id: 3,
            title: 'NATURAL',
            url: 'https://nocode.meituan.com/photo/search?keyword=nature,mountain&width=400&height=300',
            description: '壮丽的自然风光'
          },
          {
            id: 4,
            title: 'SUN',
            url: 'https://nocode.meituan.com/photo/search?keyword=sunset,beach&width=400&height=300',
            description: '美丽的海边日落'
          },
          {
            id: 5,
            title: 'FOREST',
            url: 'https://nocode.meituan.com/photo/search?keyword=forest,path&width=400&height=300',
            description: '幽静的森林小径'
          }
        ];
        setPhotos(mockPhotos);
        setLoading(false);
      } catch (err) {
        setError('加载照片失败');
        setLoading(false);
      }
    };
    loadPhotos();
  }, [page]);

  const Image = ({ photo }) => {
    const imageRef = useRef(null);
    const isInView = useInView(imageRef, {
      once: false,
      amount: 0.8,
      margin: "0px 0px -50px 0px"
    });

    const { scrollYProgress } = useScroll({
      target: imageRef,
      offset: ["start end", "end start"]
    });

    const y = useParallax(scrollYProgress, 100);

    return (
      <section className="img-container">
        <div ref={imageRef} className="photo-wrapper">
          <motion.div
            className="image-container"
            whileHover={{
              filter: "blur(2px)",
              transition: { duration: 0.3 }
            }}
          >
            <img
              src={photo.url}
              alt={photo.title}
              className="photo-image mx-auto object-cover"
            />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.5 }}
            className="photo-title"
          >
            {photo.title}
          </motion.h2>

          <motion.p
            className="photo-description"
            initial={{ opacity: 0.1, y: 0 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 10, y: 20 }}
            transition={{ duration: 0.8 }}
          >
            {photo.description}
          </motion.p>
        </div>
      </section>
    );
  };

  if (loading && page === 1) {
    return <div className="flex justify-center items-center h-screen text-xl">加载中...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-xl text-red-500">{error}</div>;
  }

  return (
    <div className="relative h-screen">
      <motion.div
        ref={containerRef}
        className="h-screen overflow-y-scroll"
        style={{ scrollSnapType: "y mandatory" }}
      >
        {photos.map((photo) => (
          <Image key={photo.id} photo={photo} />
        ))}
      </motion.div>
      <style jsx>{`
        html {
          scroll-snap-type: y mandatory;
        }
        .img-container {
          height: 100vh;
          scroll-snap-align: start;
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
        }
        .photo-wrapper {
          width: 300px;
          height: 400px;
          margin: 20px;
          overflow: hidden;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(255, 0, 0, 0.1);
          position: relative; /* 新增：作为文字定位的参照 */
        }
        .photo-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .photo-title {
          color: white;
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          position: absolute;
          bottom: 20px;
          left: 20px;
          z-index: 1;
          text-shadow:
            2px 3px 4px rgba(37, 59, 255, 0.8);
            -5px -5px 5px rgba(95, 37, 255, 0.8);
          padding: 4px 8px;
        }
        .image-container {
          position: relative;
          width: 100%;
          height: 100%;
        }
        .photo-description {
          position: absolute;
          bottom: 0px;
          left: 18px;
          right: 20px;
          color: white;
          font-size: 0.8rem;
          padding: 8px 12px;
          border-radius: 4px;
          z-index: 2;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};

export default PhotoAlbum;
