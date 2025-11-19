import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MessageSquare, ChevronDown, ChevronUp, Copy } from 'lucide-react';
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
                pre: ({node, ...props}) => {
                  const [copied, setCopied] = React.useState(false);

                  const copyCode = async (event) => {
                    let codeContent = '';

                    // 更可靠的代码内容提取方法
                    const extractCodeFromPre = (preElement) => {
                      // 尝试从 code 标签中获取内容
                      const codeElement = preElement.querySelector('code');
                      if (codeElement) {
                        return codeElement.textContent || '';
                      }

                      // 如果没有 code 标签，尝试从文本内容中获取
                      return preElement.textContent || '';
                    };

                    // 获取当前点击的 pre 元素（通过事件冒泡找到最近的 pre 元素）
                    const getCurrentPreElement = (event) => {
                      // 从按钮向上查找最近的 pre 元素
                      const button = event.currentTarget;
                      const preElement = button.closest('.relative').querySelector('pre');
                      return preElement;
                    };

                    // 获取当前点击的 pre 元素
                    const preElement = getCurrentPreElement(event);
                    if (preElement) {
                      codeContent = extractCodeFromPre(preElement);
                    } else {
                      // 备用方案：尝试从 props 中提取
                      if (props.children && props.children[0]) {
                        const firstChild = props.children[0];

                        if (typeof firstChild === 'string') {
                          codeContent = firstChild;
                        } else if (firstChild.props && firstChild.props.children) {
                          if (typeof firstChild.props.children === 'string') {
                            codeContent = firstChild.props.children;
                          } else if (Array.isArray(firstChild.props.children)) {
                            codeContent = firstChild.props.children
                              .filter(child => typeof child === 'string')
                              .join('');
                          }
                        }
                      }
                    }

                    // 首先尝试使用现代的 Clipboard API
                    try {
                      // 检查权限状态
                      const permissionStatus = await navigator.permissions.query({ name: 'clipboard-write' });

                      if (permissionStatus.state === 'granted' || permissionStatus.state === 'prompt') {
                        await navigator.clipboard.writeText(codeContent);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                        return;
                      } else {
                        throw new Error('Clipboard permission not granted');
                      }
                    } catch (err) {
                      // 降级方案：使用传统的 execCommand 方法
                      try {
                        const textArea = document.createElement('textarea');
                        textArea.value = codeContent;
                        textArea.style.position = 'fixed';
                        textArea.style.opacity = '0';
                        document.body.appendChild(textArea);
                        textArea.select();

                        const successful = document.execCommand('copy');
                        document.body.removeChild(textArea);

                        if (successful) {
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        } else {
                          throw new Error('execCommand failed');
                        }
                      } catch (fallbackErr) {
                        // 最终备用方案：提示用户手动复制
                        alert(`无法自动复制，请手动选择并复制以下内容：\n\n${codeContent}`);
                      }
                    }
                  };

                  return (
                    <div className="relative group">
                      <pre className="bg-gray-100 p-3 rounded-lg overflow-x-auto my-3 dark:bg-slate-700" {...props} />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-slate-600/80 hover:bg-white dark:hover:bg-slate-500"
                        onClick={copyCode}
                      >
                        {copied ? (
                          <span className="text-xs">已复制</span>
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  );
                },
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
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center">
            <MessageSquare className="w-6 h-6 mr-2" /> <a>评论</a>
          </h2>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={handleSortClick}
              className="flex items-center space-x-2 border-gray-300 dark:border-slate-500 hover:border-indigo-400 transition-colors"
            >
              <span>{sortOrder === 'desc' ? '时间' : '时间'}</span>
              {sortOrder === 'desc' ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
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
