import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Link as LinkIcon } from 'lucide-react';

const LongUrlConverter = () => {
  const { number } = useParams();
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [binaryResult, setBinaryResult] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // 将字符串转换为二进制表示
  const stringToBinary = (str) => {
    return str.split('').map(char => {
      const binary = char.charCodeAt(0).toString(2);
      return binary.padStart(8, '0');
    }).join(' ');
  };

  // 将二进制转换为字符串
  const binaryToString = (binary) => {
    try {
      return binary.split(' ').map(bin => {
        return String.fromCharCode(parseInt(bin, 2));
      }).join('');
    } catch (e) {
      return '';
    }
  };

  // 处理URL转换为二进制 
  const handleConvertToBinary = () => {
    if (!url) {
      setError('请输入有效的URL');
      return;
    }
    
    try {
      new URL(url); // 验证URL格式
      setBinaryResult(stringToBinary(url));
      setError('');
    } catch (e) {
      setError('请输入有效的URL格式，例如: https://nocode.cn');
    }
  };

  // 处理二进制转换为URL并跳转
  const handleConvertToUrl = () => {
    if (!number) return;
    
    try {
      const decodedUrl = binaryToString(number);
      new URL(decodedUrl); // 验证URL格式
      window.location.href = decodedUrl;
    } catch (e) {
      setError('无法解析二进制数据为有效URL');
    }
  };

  // 复制二进制结果到剪贴板
  const copyToClipboard = () => {
    navigator.clipboard.writeText(binaryResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 当访问 /long/二进制 时自动跳转
  useEffect(() => {
    if (number) {
      handleConvertToUrl();
    }
  }, [number]);

  // 当访问 /long 路径时显示转换界面
  if (!number) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="w-full max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>URL 二进制转换器</CardTitle>
              <CardDescription>将URL转换为二进制格式，或将二进制转换为URL</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="url">输入URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://nocode.cn"
                    className="flex-1"
                  />
                  <Button onClick={handleConvertToBinary}>
                    <LinkIcon className="h-4 w-4 mr-2" />
                    转换
                  </Button>
                </div>
              </div>
              
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {binaryResult && (
                <div className="space-y-2">
                  <Label>二进制结果</Label>
                  <div className="flex gap-2">
                    <Input
                      value={binaryResult}
                      readOnly
                      className="flex-1 font-mono"
                    />
                    <Button onClick={copyToClipboard} variant="outline">
                      {copied ? '已复制' : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500">
                    复制以上二进制字符串，访问 /long/二进制字符串 即可跳转到原始URL
                  </p>
                </div>
              )}
              
              <div className="bg-gray-100 dark:bg-slate-800 p-4 rounded-lg">
                <h3 className="font-medium mb-2">使用说明：</h3>
                <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-300">
                  <li>• 输入完整的URL（包含http://或https://）并点击转换</li>
                  <li>• 复制生成的二进制字符串</li>
                  <li>• 访问 /long/二进制字符串 即可跳转到原始URL</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>正在跳转...</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-500">
              正在解析二进制数据并跳转到目标URL...
            </p>
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="mt-4 flex justify-center">
              <Button onClick={() => navigate('/long')}>
                返回转换器
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LongUrlConverter;
