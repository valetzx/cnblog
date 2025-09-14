import React from 'react';
import Sidebar from './Sidebar';
import { cn } from '@/lib/utils';

const Layout = ({ children, className = "" }) => {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-900">
      <Sidebar />
      {/* 添加左边距以避免被固定侧边栏遮挡，并设置overflow-y-auto允许上下滚动 */}
      {/* 添加pb-10以避免内容被底部导航栏遮挡 */}
      <main className={cn("flex-1 p-4 bg-gray-50 dark:bg-slate-900 md:ml-[64px] overflow-y-auto pb-10", className)}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
