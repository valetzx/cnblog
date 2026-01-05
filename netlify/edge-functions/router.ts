// netlify/edge-functions/proxy-handler.ts
import type { Context } from "@netlify/edge-functions";

// ==================== HTML 修改函数 ====================
function injectServiceWorkerCode(html: string): string {
  console.log('🔧 在所有页面注入 Service Worker 自动加载代码');
  
  const swInjectionCode = `
  <script>
  // 自动请求加载 sw.js
  (function() {
    // 检查是否是 Service Worker 文件本身
    if (window.location.pathname === '/sw.js') {
      return;
    }
    
    // 强制加载 sw.js（确保缓存被绕过）
    const swUrl = '/sw.js?' + Date.now();
    
    // 方法1: 直接 fetch 请求（确保文件被加载）
    fetch(swUrl, {
      cache: 'no-store',
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache'
      }
    }).then(response => {
      if (response.ok) {
        console.log('[SW] sw.js 已成功加载');
        return response.text();
      }
      throw new Error('SW 加载失败: ' + response.status);
    }).then(code => {
      // 成功加载代码（可选：检查代码长度等）
      console.log('[SW] sw.js 加载完成，大小:', code.length, '字节');
      
      // 尝试注册 Service Worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js', { scope: '/' })
          .then(registration => {
            console.log('[SW] Service Worker 注册成功，作用域:', registration.scope);
            
            // 如果有等待的 Service Worker，立即激活
            if (registration.waiting) {
              registration.waiting.postMessage({type: 'SKIP_WAITING'});
              console.log('[SW] 已跳过等待期');
            }
            
            // 监听更新
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed') {
                  console.log('[SW] 检测到新版本 Service Worker');
                }
              });
            });
          })
          .catch(error => {
            console.error('[SW] Service Worker 注册失败:', error);
          });
      }
    }).catch(error => {
      console.warn('[SW] sw.js 加载失败:', error);
    });
    
    // 方法2: 创建 script 标签预加载（确保被浏览器缓存）
    const preloadLink = document.createElement('link');
    preloadLink.rel = 'preload';
    preloadLink.as = 'script';
    preloadLink.href = swUrl;
    preloadLink.crossOrigin = 'anonymous';
    document.head.appendChild(preloadLink);
    
    // 方法3: 创建 script 标签执行（如果 SW 注册需要先加载代码）
    const script = document.createElement('script');
    script.src = swUrl;
    script.crossOrigin = 'anonymous';
    script.onload = function() {
      console.log('[SW] sw.js 脚本已执行');
    };
    script.onerror = function() {
      console.warn('[SW] sw.js 脚本加载失败');
    };
    
    // 延迟一点执行，避免阻塞页面
    setTimeout(() => {
      document.head.appendChild(script);
    }, 100);
  })();
  </script>
  `;
  
  // 查找 </head> 标签，在前面注入
  const headEndIndex = html.indexOf('</head>');
  if (headEndIndex !== -1) {
    return html.slice(0, headEndIndex) + swInjectionCode + html.slice(headEndIndex);
  }
  
  // 如果没有 head 标签，尝试在 body 开始处注入
  const bodyStartIndex = html.indexOf('<body');
  if (bodyStartIndex !== -1) {
    const bodyEndIndex = html.indexOf('>', bodyStartIndex) + 1;
    return html.slice(0, bodyEndIndex) + swInjectionCode + html.slice(bodyEndIndex);
  }
  
  // 如果都找不到，直接在最后注入
  return html + swInjectionCode;
}
// ==================== 主代理函数 ====================
export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const path = url.pathname;
  
  console.log(`🌐 处理请求: ${request.method} ${path}`);
  
  // 处理 CORS 预检请求
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Session",
        "Access-Control-Max-Age": "86400",
        "Access-Control-Allow-Credentials": "true"
      }
    });
  }

  // 不处理 sw.js
  if (path === "/sw.js") {
    return;
  }

  // 初始化代理目标
  let targetBaseUrl: string | null = null;
  let matchedPrefix: string | null = null;

  // 1. 优先匹配 /api 路径
  if (path === "/api" || path.startsWith("/api/")) {
    targetBaseUrl = "https://api.cnb.cool";
    matchedPrefix = "/api";
  } 
  // 2. 排除根路径，其他代理到 cnb.cool
  else if (path !== "/") {
    targetBaseUrl = "https://cnb.cool";
    matchedPrefix = "";
  }

  if (targetBaseUrl && matchedPrefix !== null) {
    try {
      // 构造目标URL
      const remainingPath = matchedPrefix 
        ? path.substring(matchedPrefix.length) 
        : path;
      const targetUrlString = targetBaseUrl.replace(/\/$/, '') + remainingPath;
      const targetUrl = new URL(targetUrlString);
      targetUrl.search = url.search;

      console.log(`🔄 代理到: ${targetUrl.toString()}`);

      // 准备请求头
      const proxyHeaders = new Headers(request.headers);
      
      // 处理 session
      const sessionValue = request.headers.get('session');
      if (sessionValue) {
        const existingCookie = proxyHeaders.get('Cookie') || '';
        const newCookie = existingCookie 
          ? `${existingCookie}; CNBSESSION=${sessionValue}` 
          : `CNBSESSION=${sessionValue}`;
        proxyHeaders.set('Cookie', newCookie);
      }

      // 清理无效的 Authorization 头
      const authHeader = proxyHeaders.get('Authorization');
      if (authHeader === 'Bearer undefined') {
        proxyHeaders.delete('Authorization');
      }

      // 设置必要的头
      proxyHeaders.set('Sec-Fetch-Site', 'same-origin');
      if (path === '/user' || /^\/login\/.*/.test(path)) {
        proxyHeaders.set('Accept', 'application/vnd.cnb.web+json');
      }

      // 创建代理请求
      const proxyRequest = new Request(targetUrl.toString(), {
        method: request.method,
        headers: proxyHeaders, 
        body: request.body,
        redirect: 'manual'
      });

      // 设置代理头
      proxyHeaders.set("Host", targetUrl.host);
      const clientIp = context.ip || request.headers.get('x-nf-client-connection-ip') || "";
      proxyHeaders.set('X-Forwarded-For', clientIp);
      proxyHeaders.set('X-Forwarded-Host', url.host);
      proxyHeaders.set('X-Forwarded-Proto', url.protocol.replace(':', ''));

      // 修改 Referer
      const newReferer = `${targetBaseUrl.replace(/\/$/, '')}${remainingPath}${url.search}`;
      proxyHeaders.set('Referer', newReferer);

      // 发起代理请求
      const response = await fetch(proxyRequest);
      
      // 处理 403 响应
      if (response.status === 403) {
        console.warn('⛔ 收到 403 响应，移交 Netlify 处理');
        return;
      }

      console.log(`📥 收到响应: ${response.status} ${response.statusText}`);

      // ========== 检查并修改 HTML 响应 ==========
      const isHtml = contentType.includes('text/html') || 
                     path.endsWith('.html') || 
                     (path === '/' && contentType.includes('text'));
      
      if (isHtml && response.ok) {
        console.log('🔍 检测到 HTML 页面，注入 Service Worker 加载代码');
        
        try {
          const originalHtml = await response.text();
          
          // 注入 Service Worker 自动加载代码
          const modifiedHtml = injectServiceWorkerCode(originalHtml);
          
          // 创建新响应
          const newResponse = new Response(modifiedHtml, {
            status: response.status,
            headers: new Headers(response.headers)
          });
          
          console.log('✅ HTML 页面注入完成');
          return newResponse;
        } catch (error) {
          console.error('❌ 修改 HTML 时出错:', error);
        }
      }
      // ========== 特殊处理 /login/ 路径 ==========
      if (/^\/login\/.*/.test(path)) {
        try {
          const originalData = await response.json();
          
          // 提取 Cookie 信息
          const cookies = response.headers.getSetCookie();
          const cookieData: Record<string, string> = {};
          cookies.forEach(cookie => {
            const [keyPart, ...valueParts] = cookie.split(';')[0].split('=');
            const key = keyPart?.trim();
            const value = valueParts.join('=').trim();
            
            if (key && (key === 'CNBSESSION' || key === 'csrfkey')) {
              cookieData[key] = value;
            }
          });
          
          // 合并数据
          const mergedData = {
            ...originalData,
            _cookies: cookieData 
          };
          
          const newResponse = new Response(JSON.stringify(mergedData), {
            status: response.status,
            statusText: response.statusText,
            headers: new Headers(response.headers)
          });
          
          // 设置 CORS 头
          newResponse.headers.set('Access-Control-Allow-Origin', '*');
          newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
          newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Session');
          
          // 移除安全头
          newResponse.headers.delete('Content-Security-Policy');
          newResponse.headers.delete('X-Frame-Options');
          newResponse.headers.set('Content-Type', 'application/json');
          
          return newResponse;
        } catch (error) {
          console.error('处理 /login/ 路径失败:', error);
        }
      }

      // ========== 普通响应处理 ==========
      const newResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });

      // 设置 CORS 头
      newResponse.headers.set('Access-Control-Allow-Origin', '*');
      newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Session');

      // 移除可能的安全头
      newResponse.headers.delete('Content-Security-Policy');
      newResponse.headers.delete('X-Frame-Options');

      // 处理重定向
      if (response.status >= 300 && response.status < 400 && response.headers.has('location')) {
        const location = response.headers.get('location')!;
        const redirectedUrl = new URL(location, targetUrl);
        
        if (redirectedUrl.origin === targetUrl.origin) {
          const newLocation = `${url.origin}${matchedPrefix}${redirectedUrl.pathname}${redirectedUrl.search}`;
          newResponse.headers.set('Location', newLocation);
        }
      }

      return newResponse;

    } catch (error) {
      console.error('❌ 代理请求失败:', error);
      return new Response(`代理请求失败: ${error.message}`, {
        status: 500,
        headers: {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
  
  console.log('ℹ️ 无匹配代理规则，由 Netlify 处理');
  return;
};
