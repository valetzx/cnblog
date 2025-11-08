import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';
import { clearCommentCache } from '@/cnbUtils/commentCache';

const AddComment = ({ repopath, number, onCommentAdded }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!commentText.trim()) {
      toast.error('评论内容不能为空');
      return;
    }

    setIsSubmitting(true);

    try {
      // 从环境变量获取API配置
      const apiUrl = import.meta.env.VITE_CNBCOOKIE_API_URL;
      const cnbToken = import.meta.env.VITE_CNBCOOKIE;

      // 从localStorage获取CNBSESSION
      const cnbSession = localStorage.getItem('CNBSESSION');

      if (!cnbSession) {
        throw new Error('未找到登录状态，请确保已登录');
      }

      const response = await fetch(
        `${apiUrl}/${repopath}/-/issues/${number}/comments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cnbToken}`,
            'session': cnbSession
          },
          body: JSON.stringify({
            body: commentText.trim()
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP错误: ${response.status} ${response.statusText}`
        );
      }

      // 检查响应是否有内容，避免解析空响应体
      const contentType = response.headers.get('content-type');
      let result = null;

      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      }

      toast.success('评论发表成功');
      setCommentText('');
      setIsOpen(false);

      // 清除对应仓库和issue的评论缓存，确保下次加载时获取最新数据
      try {
        await clearCommentCache(repopath, number);
      } catch (cacheError) {
        console.warn('清除评论缓存失败:', cacheError);
      }

      // 通知父组件评论已添加
      if (onCommentAdded) {
        onCommentAdded(result);
      }

    } catch (error) {
      console.error('发表评论失败:', error);
      toast.error(`发表评论失败: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="ml-2 border-gray-300 dark:border-slate-500 hover:border-indigo-400 transition-colors">
          新增评论
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto rounded-lg">
        <DialogHeader>
          <DialogTitle>发表评论</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="comment" className="text-sm font-medium">
              评论内容
            </label>
            <Textarea
              id="comment"
              placeholder="请输入您的评论内容..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="min-h-[200px] resize-y"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !commentText.trim()}
            >
              {isSubmitting ? '发表中...' : '发表评论'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddComment;
