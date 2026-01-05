// netlify/edge-functions/proxy-handler.ts
import type { Context } from "@netlify/edge-functions";

// ==================== JS 修改函数 ====================
function modifyJavaScript(code: string): string {
  console.log('🔧 修改 JavaScript，长度:', code.length);
  
  let modified = code;
  
  // ========== 1. 核心：修改 ah 函数 ==========
  // 合并所有 ah 函数模式为一个
  const ahPattern = /(?:function\s+ah|ah\s*=\s*function)\s*\([^)]*\)\s*\{[\s\S]*?\}/g;
  
  const ahMatches = modified.match(ahPattern);
  if (ahMatches && ahMatches.length > 0) {
    console.log('✅ 找到并替换 ah 函数:', ahMatches.length);
    modified = modified.replace(
      ahPattern,
      'function ah(e) { console.debug("[BYPASS] ah check bypassed"); return false; }'
    );
  }
  
  // ========== 2. 移除 throw 错误 ==========
  // 合并所有 throw 错误模式
  const throwPattern = /throw\s+(?:new\s+)?Error\([^)]*(?:418|debug|检测)[^)]*\)/g;
  
  const throwMatches = modified.match(throwPattern);
  if (throwMatches && throwMatches.length > 0) {
    console.log('✅ 移除 throw 错误:', throwMatches.length);
    modified = modified.replace(
      throwPattern,
      'console.error("[BYPASS] Error bypassed")'
    );
  }
  
  // ========== 3. 移除 debugger ==========
  const debuggerMatches = modified.match(/debugger\s*;/g);
  if (debuggerMatches && debuggerMatches.length > 0) {
    console.log('✅ 移除 debugger:', debuggerMatches.length);
    modified = modified.replace(/debugger\s*;/g, '/* debugger removed */');
  }
  
  // ========== 4. 检查是否有修改 ==========
  if (code !== modified) {
    console.log('🔄 代码已被修改，注入保护代码');
    
    // 只注入必要的保护代码
    const injectCode = `
// ========== [INJECTED BY PROXY] ==========
try {
  if (typeof window !== 'undefined') {
    window.ah = function(e) { return false; };
    Object.defineProperty(window, 'ah', { writable: false });
  }
} catch(e) {}
// ========================================
`;
    
    modified = injectCode + '\n' + modified;
  }
  
  return modified;
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

      // ========== 核心：检查并修改 JavaScript 响应 ==========
      const contentType = response.headers.get('content-type') || '';
      const isJavaScript = contentType.includes('javascript') || 
                          path.endsWith('.js') ||
                          /\.js(?:\?|$)/.test(path) ||
                          url.search.includes('.js');
      
      // 检查文件扩展名（包括查询参数中的 .js）
      const hasJsExtension = /\.js(?:\?.*)?$/i.test(path);
      
      if ((isJavaScript || hasJsExtension) && response.ok) {
        console.log('🔍 检测到 JavaScript 文件，开始修改...');
        
        try {
          const originalText = await response.text();
          console.log(`📄 JS 文件大小: ${originalText.length} 字符`);
          
          // 检查是否包含目标模式
          const hasAhFunction = /function\s+ah|ah\s*=\s*function/.test(originalText);
          const has418Error = /418/.test(originalText);
          const hasDebugger = /debugger/.test(originalText);
          
          if (hasAhFunction || has418Error || hasDebugger) {
            console.log('🎯 检测到需要修改的模式:', {
              hasAhFunction,
              has418Error,
              hasDebugger
            });
            
            const modifiedText = modifyJavaScript(originalText);
            
            // 创建新响应
            const newResponse = new Response(modifiedText, {
              status: response.status,
              headers: new Headers(response.headers)
            });
            
            // 设置必要的头
            newResponse.headers.set('Content-Type', 'application/javascript; charset=utf-8');
            newResponse.headers.set('Access-Control-Allow-Origin', '*');
            newResponse.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
            newResponse.headers.set('Access-Control-Allow-Headers', '*');
            
            // 移除可能的安全头
            newResponse.headers.delete('Content-Security-Policy');
            newResponse.headers.delete('X-Frame-Options');
            newResponse.headers.delete('X-Content-Type-Options');
            
            // 禁用缓存以确保获取修改后的版本
            newResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
            newResponse.headers.set('Pragma', 'no-cache');
            newResponse.headers.set('Expires', '0');
            
            console.log('✅ JavaScript 修改完成并返回');
            return newResponse;
          } else {
            console.log('ℹ️ 未检测到需要修改的模式，返回原始内容');
          }
        } catch (error) {
          console.error('❌ 修改 JavaScript 时出错:', error);
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
