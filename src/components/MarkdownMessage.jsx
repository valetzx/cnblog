import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MarkdownMessage = ({ content, onImageClick }) => {
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
        onClick={() => onImageClick && onImageClick(props.src)}
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
    <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-bold prose-headings:text-gray-800 dark:prose-headings:text-gray-100 prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-a:text-indigo-500 dark:prose-a:text-blue-400 prose-blockquote:border-l-indigo-400 dark:prose-blockquote:border-l-indigo-300 prose-code:bg-gray-100 dark:prose-code:bg-slate-700 prose-pre:bg-gray-100 dark:prose-pre:bg-slate-700">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownMessage;
