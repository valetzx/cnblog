import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const Sitemap = () => {
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') || 'xml';
  const shouldDownload = searchParams.get('down') !== null;

  useEffect(() => {
    // 获取所有导航项作为内容
    const navItems = [
      { to: '/', title: 'Home', description: '首页' },
      { to: '/ideas', title: 'Ideas', description: 'AI对话' },
      { to: '/commit', title: 'Commit', description: '文章卡片' },
      { to: '/jobplan', title: 'Jobplan', description: 'AI任务拆解' },
      { to: '/settings', title: 'Settings', description: '站点设置' },
      { to: '/user', title: 'User', description: '用户' },
      { to: '/repo', title: 'Repo', description: '仓库' },
      { to: '/mission', title: 'Mission', description: '任务' },
      { to: '/aibattle', title: 'Aibattle', description: 'AI辩论赛' },
      { to: '/start', title: 'Start', description: 'AI辩论赛角色分配' },
      { to: '/long', title: 'LongUrlConverter', description: '长链接转换器' },
      { to: '/overallview', title: 'OverallView', description: '全景视图工具' },
    ];

    let content = '';
    let mimeType = '';
    let fileName = '';

    if (type === 'rss') {
      // 生成RSS 2.0格式
      content = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>金桔猪 CNB·工作台</title>
    <link>${window.location.origin}</link>
    <description>金桔猪的博客</description>
    <language>zh-cn</language>
    <pubDate>${new Date().toUTCString()}</pubDate>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <generator>React App</generator>
    ${navItems.map(item => `
    <item>
      <title>${item.title}</title>
      <link>${window.location.origin}/#${item.to}</link>
      <description>${item.description}</description>
      <pubDate>${new Date().toUTCString()}</pubDate>
      <guid>${window.location.origin}/#${item.to}</guid>
    </item>`).join('')}
  </channel>
</rss>`;
      mimeType = 'application/rss+xml';
      fileName = 'feed.rss';
    } else {
      // 生成XML sitemap格式
      content = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${navItems.map(item => `
    <url>
      <loc>${window.location.origin}/#${item.to}</loc>
      <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
      <changefreq>daily</changefreq>
      <priority>0.8</priority>
    </url>`).join('')}
</urlset>`;
      mimeType = 'application/xml';
      fileName = 'sitemap.xml';
    }

    // 创建Blob
    const blob = new Blob([content], { type: mimeType });
    const blobUrl = URL.createObjectURL(blob);

    if (shouldDownload) {
      // 自动下载
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // 清理 blob URL
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 100);
    } else {
      // 直接跳转到 blob URL
      window.location.href = blobUrl;
    }
  }, [type, shouldDownload]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">
          {type === 'rss' ? 'RSS Feed' : 'Sitemap'}
        </h1>
        <p className="text-gray-600">
          正在处理{type === 'rss' ? 'RSS 2.0' : 'XML'}文件...
        </p>
      </div>
    </div>
  );
};

export default Sitemap;
