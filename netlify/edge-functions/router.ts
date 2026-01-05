// netlify/edge-functions/proxy-handler.ts
import type { Context } from "@netlify/edge-functions";

// ==================== JS 修改函数 ====================
function modifyJavaScript(code: string): string {
  console.log('🔧 开始修改 JavaScript 代码，长度:', code.length);
  
  // 1. 修改 ah 函数（核心反调试检测）
  const ahPatterns = [
    // 模式1: function ah(e) { return 0 != (1 & e.mode) && 0 == (000 & e.flags) }
    /function\s+ah\s*\([^)]*\)\s*\{[\s\S]*?return\s+0\s*!=\s*\(\s*1\s*&\s*e\.mode\s*\)[\s\S]*?\}/g,
    
    // 模式2: ah = function(e) { return 0 != (1 & e.mode) && 0 == (000 & e.flags) }
    /ah\s*=\s*function\s*\([^)]*\)\s*\{[\s\S]*?return\s+0\s*!=\s*\(\s*1\s*&\s*e\.mode\s*\)[\s\S]*?\}/g,
    
    // 模式3: 任何 ah 函数定义
    /function\s+ah\s*\([^)]*\)\s*\{[^}]*\}/g,
    
    // 模式4: 任何 ah 函数表达式
    /ah\s*=\s*function\s*\([^)]*\)\s*\{[^}]*\}/g
  ];
  
  let modified = code;
  ahPatterns.forEach(pattern => {
    const matches = modified.match(pattern);
    if (matches && matches.length > 0) {
      console.log('✅ 找到 ah 函数，替换次数:', matches.length);
      modified = modified.replace(pattern, 'function ah(e){console.debug("[BYPASS] ah check bypassed");return false;}');
    }
  });
  
  // 2. 修改 am 函数中的检测逻辑
  const amModifications = [
    // 移除 throw Error(f(418))
    {
      pattern: /if\s*\(\s*ah\s*\(\s*e\s*\)\s*\)\s*\{[^}]*throw\s+Error\(f\(418\)\)[^}]*\}/g,
      replacement: 'if(ah(e)){console.warn("[BYPASS] Debug detection bypassed (418)");}'
    },
    // 移除其他 throw 语句
    {
      pattern: /throw\s+(?:new\s+)?Error\([^)]*418[^)]*\)/g,
      replacement: 'console.error("[BYPASS] Error 418 bypassed")'
    },
    {
      pattern: /throw\s+(?:new\s+)?Error\([^)]*debug[^)]*\)/gi,
      replacement: 'console.error("[BYPASS] Debug error bypassed")'
    },
    {
      pattern: /throw\s+(?:new\s+)?Error\([^)]*检测[^)]*\)/g,
      replacement: 'console.error("[BYPASS] 检测 bypassed")'
    }
  ];
  
  amModifications.forEach(mod => {
    const matches = modified.match(mod.pattern);
    if (matches && matches.length > 0) {
      console.log(`✅ 找到并替换检测逻辑: ${mod.pattern.toString().substring(0, 50)}...`);
      modified = modified.replace(mod.pattern, mod.replacement);
    }
  });
  
  // 3. 移除 debugger 语句
  const debuggerMatches = modified.match(/debugger\s*;/g);
  if (debuggerMatches && debuggerMatches.length > 0) {
    console.log('✅ 移除 debugger 语句:', debuggerMatches.length);
    modified = modified.replace(/debugger\s*;/g, '/* debugger removed */');
  }
  
  // 4. 修改控制台检测（如果有）
  const consolePatterns = [
    // 检测 console.log 是否被修改
    /if\s*\(\s*console\.log\.toString\(\)[\s\S]*?throw/g,
    /if\s*\(\s*console\.debug\.toString\(\)[\s\S]*?throw/g,
    /if\s*\(\s*console\.warn\.toString\(\)[\s\S]*?throw/g
  ];
  
  consolePatterns.forEach(pattern => {
    if (modified.match(pattern)) {
      console.log('✅ 找到控制台检测，绕过');
      modified = modified.replace(pattern, 'if(false /* console check bypassed */');
    }
  });
  
  // 5. 注入全局覆盖代码（确保万无一失）
  if (code !== modified) {
    const injectCode = `
// ==================== [INJECTED BY PROXY] ====================
try {
  // 全局覆盖 ah 函数
  if (typeof window !== 'undefined') {
    window.__original_ah = window.ah;
    window.ah = function(e) {
      console.debug('[PROXY-INJECTED] ah always returns false');
      return false;
    };
    Object.defineProperty(window, 'ah', {
      writable: false,
      configurable: false,
      enumerable: true
    });
  }
  
  // 防止 debugger 触发
  Function.prototype.constructor = new Proxy(Function.prototype.constructor, {
    apply(target, thisArg, args) {
      const code = args[0];
      if (typeof code === 'string' && code.includes('debugger')) {
        console.warn('[PROXY-INJECTED] debugger statement prevented');
        return function(){};
      }
      return target.apply(thisArg, args);
    }
  });
  
  console.log('[PROXY] JavaScript modifications applied successfully');
} catch(e) {
  console.error('[PROXY] Injection error:', e);
}
// =============================================================
`;
    
    // 在文件开头注入
    modified = injectCode + '\n' + modified;
  }
  
  console.log('🔧 JavaScript 修改完成');
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
