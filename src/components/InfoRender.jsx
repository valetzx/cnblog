import React, { useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import CachedAvatar from '@/components/CachedAvatar';
import AddCommit from '@/cnbRepos/addCommit';
import { formatDate } from '@/cnbUtils/dateFormatter';
import { User, Clock } from 'lucide-react';
import CommitRender from '@/components/CommitRender';
import RandomBackground from '@/components/RandomBG';

const InfoRenderer = ({
  issue,
  hideStateLabels,
  onImageClick
}) => {
  // 随机颜色生成函数
  const getRandomColor = () => {
    // 排除黑色和接近黑色的颜色
    const colors = [
      'blue', 'indigo', 'purple', 'pink', 'red', 'orange', 'green', 'teal', 'cyan'
    ];
    const shades = ['600', '700', '800'];

    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const randomShade = shades[Math.floor(Math.random() * shades.length)];

    return `${randomColor}-${randomShade}`;
  };

  // 生成随机渐变颜色
  const [randomGradientColors] = React.useState(() => {
    const color1 = getRandomColor();
    const color2 = getRandomColor();
    const color3 = getRandomColor();

    // 确保三个颜色不完全相同
    let finalColor2 = color2;
    let finalColor3 = color3;

    if (color1 === color2) {
      finalColor2 = getRandomColor();
    }
    if (color1 === color3 || finalColor2 === color3) {
      finalColor3 = getRandomColor();
    }

    return {
      from: color1,
      via: finalColor2,
      to: finalColor3
    };
  });
  // 提取文章中的第一张图片作为标题背景
  const extractFirstImage = (body) => {
    if (!body) return null;
    const imgRegex = /<img[^>]*src="([^"]+)"[^>]*>/g;
    const match = imgRegex.exec(body);
    if (!match) return null;
    const src = match[1];
    // 检查是否为 cnb-md-image__upload 类的图片
    const isUploadImage = body.includes('cnb-md-image__upload') && body.includes(src);
    if (isUploadImage) {
      return `https://m.wbiao.cn/mallapi/wechat/picReverseUrl?url=https://cnb.cool${src}`;
    }

    return src;
  };

  // 使用 useMemo 缓存标题背景图片，避免每次渲染都重新计算
  const titleBackgroundImage = React.useMemo(() =>
    extractFirstImage(issue.body),
    [issue.body]
  );

  // 处理 issue body 中的图片
  const processIssueBody = React.useCallback((body) => {
    if (!body) return '';

    // 提取并替换图片标签
    let processedBody = body;

    // 处理 cnb-md-image__upload 类的图片
    processedBody = processedBody.replace(
      /<img(?=[^>]*class="[^"]*cnb-md-image__upload[^"]*")(?=[^>]*src="([^"]+)")[^>]*>/g,
      (_, src) => `![image](https://m.wbiao.cn/mallapi/wechat/picReverseUrl?url=https://cnb.cool${src})`
    );

    // 处理其他图片标签
    processedBody = processedBody.replace(
      /<img[^>]*src="([^"]+)"[^>]*>/g,
      (_, src) => `![image](${src})`
    );

    return processedBody;
  }, []);

  // 使用 useMemo 缓存处理后的 body 内容
  const processedBody = React.useMemo(() =>
    processIssueBody(issue.body),
    [issue.body, processIssueBody]
  );

  // 处理图片点击事件 - 直接传递图片 URL，由父组件处理
  const handleImageClick = (imageUrl) => {
    onImageClick(imageUrl);
  };

  // Markdown 渲染组件配置
  const markdownComponents = {
    h1: ({node, ...props}) => {
      const id = props.children.toString().toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-');
      return <h1 id={id} className="text-2xl font-bold mt-6 mb-4 text-gray-800 dark:text-gray-100 break-words" {...props} />;
    },
    h2: ({node, ...props}) => {
      const id = props.children.toString().toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-');
      return <h2 id={id} className="text-xl font-bold mt-5 mb-3 text-gray-800 dark:text-gray-100 break-words" {...props} />;
    },
    h3: ({node, ...props}) => {
      const id = props.children.toString().toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-');
      return <h3 id={id} className="text-lg font-bold mt-4 mb-2 text-gray-800 dark:text-gray-100 break-words" {...props} />;
    },
    h4: ({node, ...props}) => {
      const id = props.children.toString().toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-');
      return <h4 id={id} className="text-base font-bold mt-3 mb-2 text-gray-800 dark:text-gray-100 break-words" {...props} />;
    },
    h5: ({node, ...props}) => {
      const id = props.children.toString().toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-');
      return <h5 id={id} className="text-sm font-bold mt-2 mb-1 text-gray-800 dark:text-gray-100 break-words" {...props} />;
    },
    h6: ({node, ...props}) => {
      const id = props.children.toString().toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-');
      return <h6 id={id} className="text-xs font-bold mt-2 mb-1 text-gray-800 dark:text-gray-100 break-words" {...props} />;
    },
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
        onClick={() => handleImageClick(props.src)}
      />
    ),
    code: ({node, ...props}) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm dark:bg-slate-700 break-all" {...props} />,
    pre: ({node, ...props}) => <pre className="bg-gray-100 p-3 rounded-lg overflow-x-auto my-3 dark:bg-slate-700" {...props} />,
    blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-300 pl-4 italic my-3 dark:border-slate-600 break-words" {...props} />,
    table: ({node, ...props}) => <table className="min-w-full border-collapse border border-gray-300 my-3 dark:border-slate-600" {...props} />,
    th: ({node, ...props}) => <th className="border border-gray-300 px-3 py-2 bg-gray-50 font-medium dark:border-slate-600 dark:bg-slate-700 break-words" {...props} />,
    td: ({node, ...props}) => <td className="border border-gray-300 px-3 py-2 dark:border-slate-600 break-words" {...props} />,
  };

  return (
    <div className="pb-4">
      <div className="max-w-5xl mx-auto">
        {/* 标题和内容一体化区域 */}
        <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700">
          {/* 标题背景区域 */}
          {titleBackgroundImage && (
            <div className="relative min-h-64 md:min-h-80 overflow-hidden">
              {/* 背景图片带高斯模糊和透明度渐变 */}
              <img
                src={titleBackgroundImage}
                alt="文章标题背景"
                className="absolute inset-0 w-full h-full object-cover blur-lg rounded-t-lg"
                style={{
                  maskImage: 'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%, rgba(0,0,0,1) 90%)',
                  WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%, rgba(0,0,0,1) 90%)'
                }}
              />
              <RandomBackground
                className="blur-3xl rounded-t-lg"
              />
              <div
                className="absolute inset-0 flex items-end"
              >
                <div className="p-4 md:p-6 text-white w-full">
                  <h1 className="text-2xl md:text-4xl font-bold mb-3 md:mb-4 break-words leading-tight">{issue.title}</h1>
                  <div className="flex flex-wrap items-center gap-2 md:gap-4 text-white/90 text-sm md:text-base">
                    <div className="flex items-center">
                      <User size={14} className="mr-1 md:mr-2" />
                      <a
                        href={`/user/${issue.author?.username}`}
                        className="font-medium hover:text-white transition-colors"
                        onClick={(e) => {
                          e.preventDefault();
                          window.location.hash = `/user/${issue.author?.username}`;
                        }}
                      >
                        {issue.author?.nickname || issue.author?.username}
                      </a>
                    </div>
                    <div className="flex items-center">
                      <Clock size={14} className="mr-1 md:mr-2" />
                      <span className="font-medium">{formatDate(issue.updated_at)}</span>
                    </div>
                    {!hideStateLabels && (
                      <span className={`px-2 py-1 md:px-3 md:py-1 rounded-full text-xs md:text-sm font-medium ${
                        issue.state === 'open'
                          ? 'bg-green-200/90 text-green-900'
                          : 'bg-red-200/90 text-red-900'
                      }`}>
                        {issue.state === 'open' ? '开启' : '关闭'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <style jsx>{`
                @keyframes flow {
                  0% {
                    transform: translateX(-100%);
                  }
                  100% {
                    transform: translateX(100%);
                  }
                }
                .animate-flow {
                  animation: flow 6s ease-in-out infinite;
                }
              `}</style>
            </div>
          )}

          {/* 文章内容区域 */}
          <div className="p-4">
            {!titleBackgroundImage && (
              <>
                <h1 className="text-2xl md:text-4xl font-bold text-gray-800 dark:text-gray-100 mb-4 md:mb-6 break-words leading-tight">
                  {issue.title}
                </h1>

                <div className="flex flex-wrap items-center gap-3 md:gap-6 mb-6 md:mb-8 pb-4 md:pb-6 border-b border-gray-200 dark:border-slate-700">
                  <div className="flex items-center">
                    <User size={14} className="text-gray-600 dark:text-gray-300 mr-1 md:mr-2" />
                    <a
                      href={`/user/${issue.author?.username}`}
                      className="font-medium text-gray-800 dark:text-gray-200 hover:text-indigo-500 transition-colors text-sm md:text-base"
                      onClick={(e) => {
                        e.preventDefault();
                        window.location.hash = `/user/${issue.author?.username}`;
                      }}
                    >
                      {issue.author?.nickname || issue.author?.username}
                    </a>
                  </div>
                  <div className="flex items-center">
                    <Clock size={14} className="text-gray-600 dark:text-gray-300 mr-1 md:mr-2" />
                    <span className="font-medium text-gray-800 dark:text-gray-200 text-sm md:text-base">{formatDate(issue.updated_at)}</span>
                  </div>
                  {!hideStateLabels && (
                    <span className={`px-2 py-1 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium ${
                      issue.state === 'open'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                    }`}>
                      {issue.state === 'open' ? '开启' : '关闭'}
                    </span>
                  )}
                </div>
              </>
            )}

            <div className="prose prose-lg max-w-none dark:prose-invert prose-headings:font-bold prose-headings:text-gray-800 dark:prose-headings:text-gray-100 prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-a:text-indigo-500 dark:prose-a:text-blue-400 prose-blockquote:border-l-indigo-400 dark:prose-blockquote:border-l-indigo-300 prose-code:bg-gray-100 dark:prose-code:bg-slate-700 prose-pre:bg-gray-100 dark:prose-pre:bg-slate-700">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {processedBody}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>

      {/* 图片预览模态框 - 已移至父组件 */}
      {/* <ImagePreview
        images={previewImages}
        initialIndex={currentImageIndex}
        isOpen={isPreviewOpen}
        onClose={handleClosePreview}
      /> */}
    </div>
  );
};

export default InfoRenderer;
