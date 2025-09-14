import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink, RefreshCw, RotateCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const MovieCard = () => {
  const [movieData, setMovieData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAutoRotate, setIsAutoRotate] = useState(false);
  const [rotationSpeed, setRotationSpeed] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMovieData = async () => {
      setLoading(true);
      setError('');
      try {
        // Check if data exists in localStorage
        const storedData = localStorage.getItem('moviecardData');
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          const storedMovie = parsedData[0];
          const storedDate = new Date(storedMovie.createdAt);
          const currentDate = new Date();
          const diffTime = currentDate - storedDate;
          const diffDays = diffTime / (1000 * 60 * 60 * 24);

          // If data is less than 1 day old, use it
          if (diffDays < 1 && storedMovie.createdAt) {
            setMovieData({
              mov_id: storedMovie.movieId,
              mov_title: storedMovie.title,
              mov_text: storedMovie.description,
              mov_pic: storedMovie.images[0],
              mov_intro: storedMovie.movintro,
              mov_director: storedMovie.movdirector,
              mov_year: storedMovie.movyear,
              mov_rating: storedMovie.movrating,
              mov_type: storedMovie.movtype,
              mov_link: storedMovie.movlink
            });
            setLoading(false);
            return;
          }
        }

        // Fetch new data if data is expired or not found
        const response = await fetch('https://db0kqspitke0bs.database.nocode.cn/functions/v1/dailymovie/api?app_key=pub_23020990025', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzQ2OTc5MjAwLCJleHAiOjE5MDQ3NDU2MDB9.x3Bk3pABXuoZMNrOw-SwCwO-R5QaUjtvy3jR-op1gZ8'
          }
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setMovieData(data);
        // Store data in localStorage as an array
        const movieCardData = [{
          movieId: data.mov_id,
          title: data.mov_title,
          description: data.mov_text,
          tags: ["电影"],
          images: [data.mov_pic],
          movintro: data.mov_intro,
          movdirector: data.mov_director,
          movyear: data.mov_year,
          movrating: data.mov_rating,
          movtype: data.mov_type,
          createdAt: new Date().toISOString()
        }];
        localStorage.setItem('moviecardData', JSON.stringify(movieCardData));
      } catch (err) {
        setError(`加载失败: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchMovieData();
  }, [refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleOpenInNewTab = () => {
    if (movieData?.mov_link) {
      window.open(movieData.mov_link, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
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

  if (!movieData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500 text-xl">暂无电影数据</div>
      </div>
    );
  }

  return (
    <div className="break-inside-avoid">
      <Card
        className="w-full max-w-4xl mx-auto cursor-pointer hover:shadow-lg transition-shadow"
        onClick={() => setIsDialogOpen(true)}
      >
        <CardContent className="p-0">
          <img
            src={movieData.mov_pic}
            alt={movieData.mov_title}
            className="w-full h-auto rounded-t-lg object-cover"
          />
          <div className="p-6">
            <h2 className="text-2xl font-bold">{movieData.mov_title}</h2>
            <p className="text-gray-600 mt-2">{movieData.mov_text}</p>
            <div className="flex items-center justify-between mt-4">
              <span className="inline-block bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-md">电影</span>
              <a href="https://www.cikeee.cc/" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-gray-700">来自此刻电影</a>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto mx-6">
          <DialogHeader className="sticky top-0 bg-background z-10">
            <DialogTitle>{movieData.mov_title}</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <p className="text-gray-600">{movieData.mov_text}</p>
            <div className="flex items-center justify-between mt-4">
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">导演</span>
                <span>{movieData.mov_director}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">年份</span>
                <span>{movieData.mov_year}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">评分</span>
                <span>{movieData.mov_rating}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">类型</span>
                <span>{movieData.mov_type?.join(', ')}</span>
              </div>
            </div>
            <div className="mt-4">
              <h3 className="font-semibold mb-2">剧情简介</h3>
              <p className="text-gray-600 whitespace-pre-line">{movieData.mov_intro}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MovieCard;
