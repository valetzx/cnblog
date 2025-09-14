import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink, RefreshCw } from 'lucide-react';

const WebView = () => {
  const { url } = useParams();
  const [iframeUrl, setIframeUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

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

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleOpenInNewTab = () => {
    if (iframeUrl) {
      window.open(iframeUrl, '_blank');
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

  return (
    <div className="min-h-screen p-4">
      <Card className="w-full h-[calc(100vh-2rem)]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        </CardHeader>
        <CardContent className="p-0 h-[calc(100%-4rem)]">
          <iframe
            key={refreshKey}
            src={iframeUrl}
            className="w-full h-full border-0 rounded-b-lg"
            title="网页预览"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            onLoad={() => setLoading(false)}
            onError={() => {
              setError('加载失败，请检查URL是否正确');
              setLoading(false);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default WebView;
