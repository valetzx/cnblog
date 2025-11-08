import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import CachedAvatar from '@/components/CachedAvatar';
import AddCommit from '@/cnbRepos/addCommit';
import { formatDate } from '@/cnbUtils/dateFormatter';

const CommitRender = ({
  comments = [],
  repopath,
  number,
  onCommentAdded,
  onImageClick
}) => {
  const [sortOrder, setSortOrder] = useState('desc'); 

  // 排序评论函数
  const sortComments = (commentsToSort) => {
    return [...commentsToSort].sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  };

  // 处理排序按钮点击
  const handleSortClick = () => {
    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
  };

  // 获取排序后的评论
  const sortedComments = sortComments(comments);

  // 评论卡片组件
  const CommentCard = ({ card }) => (
    <div key={card.commentId} className="border-b border-dashed border-gray-200 dark:border-slate-600 pb-4 last:border-b-0">
      <div className="flex flex-col h-full">
        <div className="pb-3">
          <div className="flex items-center text-lg gap-2">
            <CachedAvatar
              username={card.username}
              nickname={card.title}
            />
            <div className="flex flex-col">
              <a
                href={`/user/${card.username}`}
                className="truncate text-gray-800 dark:text-gray-100 transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.hash = `/user/${card.username}`;
                }}
              >
                {card.title}
              </a>
              <span className="text-xs text-gray-500 font-normal dark:text-gray-400">
                {formatDate(card.createdAt)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex-grow">
          <div className="prose max-w-none dark:prose-invert">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-800 dark:text-gray-100 break-words" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-5 mb-3 text-gray-800 dark:text-gray-100 break-words" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-lg font-bold mt-4 mb-2 text-gray-800 dark:text-gray-100 break-words" {...props} />,
                p: ({node, ...props}) => <p className="mb-3 leading-relaxed text-gray-700 dark:text-gray-300 break-words" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3 text-gray-700 dark:text-gray-300 break-words" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-3 text-gray-700 dark:text-gray-300 break-words" {...props} />,
                li: ({node, ...props}) => <li className="mb-1 text-gray-700 dark:text-gray-300 break-words" {...props} />,
                a: ({node, ...props}) => <a className="text-indigo-400 hover:underline dark:text-blue-400 break-all" {...props} />,
                img: ({node, ...props}) => (
                  <img
                    {...props}
                    loading="lazy" // 添加懒加载
                    decoding="async" // 异步解码
                    className="max-w-full h-auto rounded-lg my-2 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => onImageClick(props.src)}
                  />
                ),
                code: ({node, ...props}) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm dark:bg-slate-700 break-all" {...props} />,
                pre: ({node, ...props}) => <pre className="bg-gray-100 p-3 rounded-lg overflow-x-auto my-3 dark:bg-slate-700" {...props} />,
                blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-300 pl-4 italic my-3 dark:border-slate-600 break-words" {...props} />,
                table: ({node, ...props}) => <table className="min-w-full border-collapse border border-gray-300 my-3 dark:border-slate-600" {...props} />,
                th: ({node, ...props}) => <th className="border border-gray-300 px-3 py-2 bg-gray-50 font-medium dark:border-slate-600 dark:bg-slate-700 break-words" {...props} />,
                td: ({node, ...props}) => <td className="border border-gray-300 px-3 py-2 dark:border-slate-600 break-words" {...props} />,
              }}
            >
              {card.description}
            </ReactMarkdown>
          </div>
          {card.images && card.images.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              {card.images.slice(0, 4).map((img, imgIndex) => (
                <img
                  src={img}
                  alt={`评论图片 ${imgIndex + 1}`}
                  className="rounded-md object-cover w-full h-24 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => onImageClick(img)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto pb-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-none">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
            评论
          </h2>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={handleSortClick}
              className="flex items-center space-x-2 border-gray-300 dark:border-slate-500 hover:border-indigo-400 transition-colors"
            >
              <span>{sortOrder === 'desc' ? '时间倒序' : '时间正序'}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {sortOrder === 'desc' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 13l5 5m0 0l5-5m-5 5V6" />
                )}
              </svg>
            </Button>
            <AddCommit
              repopath={repopath}
              number={number}
              onCommentAdded={onCommentAdded}
            />
          </div>
        </div>
        <div className="space-y-4">
          {sortedComments.map((card) => (
            <CommentCard key={card.commentId} card={card} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CommitRender;
