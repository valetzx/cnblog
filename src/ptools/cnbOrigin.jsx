import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

export const fetchCnbImage = async (imagePath) => {
  try {
    const targetUrl = `https://db0kqspitke0bs.database.nocode.cn/functions/v1/cnbraw/${imagePath}`;
    const headers = {
      'Authorization': `Bearer ${import.meta.env.VITE_CNBCOOKIE}`,
    };
    const response = await fetch(targetUrl, { headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Error fetching image:', error);
    throw error;
  }
};

const CnbOrigin = () => {
  const { '*': path } = useParams();

  useEffect(() => {
    const loadImage = async () => {
      try {
        const blobUrl = await fetchCnbImage(path);
        window.location.href = blobUrl;
      } catch (error) {
        console.error('Error loading image:', error);
        // 可以在这里添加错误处理，比如显示错误页面
      }
    };

    loadImage();
  }, [path]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">图片加载中...</h1>
        <p className="text-gray-600">
          正在从 CNB 源获取图片: {path}
        </p>
      </div>
    </div>
  );
};

export default CnbOrigin;
