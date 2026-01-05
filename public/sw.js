const CACHE_NAME = 'proxy-cache-v2';
const TARGET_HOST = 'cnb.cdn-go.cn';
const AVATAR_DOMAIN = 'cnb.cool';
const WECHAT_DOMAIN = 'localhost.weixin.qq.com';
const LOGIN_PATH = '/login/wx_do_login';

// ========== JS 魔改函数 ==========
function modifyJavaScript(code) {
  console.log('[SW-MODIFY] 开始修改 JavaScript，大小:', code.length, '字节');
  
  let modified = code;
  let changes = 0;
  
  // 1. 检测是否包含目标模式
  const patterns = {
    hasAhFunction: /(?:function\s+ah|ah\s*=\s*function|const\s+ah\s*=|let\s+ah\s*=|var\s+ah\s*=)/i,
    has418: /418|检测|anti-crawler|防爬/i,
    hasDebugger: /debugger/i,
    hasThrowError: /throw\s+(?:new\s+)?Error\([^)]*\)/i
  };
  
  const detected = {};
  for (const [key, pattern] of Object.entries(patterns)) {
    detected[key] = pattern.test(modified);
  }
  
  console.log('[SW-MODIFY] 检测结果:', detected);
  
  // 2. 修改 ah 函数（所有可能的写法）
  const ahPatterns = [
    // function ah(...) { ... }
    /function\s+ah\s*\([^)]*\)\s*\{[\s\S]*?\}/g,
    // ah = function(...) { ... }
    /(?:const|let|var)\s+ah\s*=\s*function\s*\([^)]*\)\s*\{[\s\S]*?\}/g,
    // ah = (...)=> { ... }
    /(?:const|let|var)\s+ah\s*=\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\}/g,
    // ah: function(...) { ... }
    /ah\s*:\s*function\s*\([^)]*\)\s*\{[\s\S]*?\}/g,
    // export function ah(...) { ... }
    /export\s+(?:default\s+)?function\s+ah\s*\([^)]*\)\s*\{[\s\S]*?\}/g
  ];
  
  ahPatterns.forEach((pattern, idx) => {
    const matches = modified.match(pattern);
    if (matches) {
      console.log(`[SW-MODIFY] 替换 ah 函数[模式${idx}]:`, matches.length);
      modified = modified.replace(
        pattern,
        `function ah(e){console.debug("[SW-BYPASS] ah bypassed");return false}`
      );
      changes++;
    }
  });
  
  // 3. 替换所有错误抛出（特别是 418 错误）
  const errorPatterns = [
    /throw\s+(?:new\s+)?Error\([^)]*(?:418|检测|anti-crawler|防爬|debug)[^)]*\)/gi,
    /throw\s+(?:new\s+)?TypeError\([^)]*(?:418|检测)[^)]*\)/gi,
    /throw\s+(?:new\s+)?ReferenceError\([^)]*(?:418|检测)[^)]*\)/gi,
    /console\.error\([^)]*(?:418|检测)[^)]*\)/gi,
    /alert\([^)]*(?:418|检测)[^)]*\)/gi
  ];
  
  errorPatterns.forEach(pattern => {
    const matches = modified.match(pattern);
    if (matches) {
      console.log(`[SW-MODIFY] 替换错误语句:`, matches.length);
      modified = modified.replace(
        pattern,
        `console.log("[SW-BYPASS] Error bypassed")`
      );
      changes++;
    }
  });
  
  // 4. 移除 debugger 语句
  if (detected.hasDebugger) {
    const debuggerMatches = modified.match(/debugger\s*;/g);
    if (debuggerMatches) {
      console.log('[SW-MODIFY] 移除 debugger:', debuggerMatches.length);
      modified = modified.replace(/debugger\s*;/g, '/* debugger removed by sw */');
      changes++;
    }
  }
  
  // 5. 注入全局保护代码
  if (changes > 0) {
    console.log(`[SW-MODIFY] 进行了 ${changes} 处修改，注入保护`);
    
    const protectCode = `
// ========== [SW-BYPASS INJECTION - ${new Date().toISOString()}] ==========
(function() {
  try {
    // 全局 ah 函数重写
    if (typeof window !== 'undefined') {
      // 创建不可修改的 ah 函数
      const originalAh = window.ah;
      const fakeAh = function(e) {
        console.debug("[SW-BYPASS] Global ah intercept:", e);
        return false;
      };
      
      // 多重保护
      Object.defineProperty(window, 'ah', {
        value: fakeAh,
        writable: false,
        configurable: false,
        enumerable: true
      });
      
      // 保护其他可能的变体
      ['_ah', '__ah', 'ahCheck', 'ah_check'].forEach(name => {
        if (!window[name]) {
          Object.defineProperty(window, name, {
            value: fakeAh,
            writable: false,
            configurable: false
          });
        }
      });
      
      // 拦截可能的动态创建
      const originalCreateElement = document.createElement;
      document.createElement = function(tag) {
        const element = originalCreateElement.call(this, tag);
        if (tag === 'script') {
          const originalSetAttribute = element.setAttribute;
          element.setAttribute = function(name, value) {
            if (name === 'src' && value && value.includes('runtime.js')) {
              console.log('[SW-BYPASS] Blocked runtime.js script creation');
              return;
            }
            return originalSetAttribute.call(this, name, value);
          };
        }
        return element;
      };
      
      console.log("[SW-BYPASS] Protection injected successfully");
    }
  } catch(err) {
    console.warn("[SW-BYPASS] Injection error:", err);
  }
})();
// =====================================================================
`;
    
    // 在文件开头注入保护代码
    modified = protectCode + '\n' + modified;
  }
  
  console.log(`[SW-MODIFY] 修改完成，大小变化: ${code.length} -> ${modified.length}`);
  return modified;
}

// ========== Service Worker 事件 ==========

// 安装时激活
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker 安装');
  event.waitUntil(self.skipWaiting());
});

// 激活时清理旧缓存并接管
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker 激活');
  event.waitUntil(
    Promise.all([
      caches.keys().then(cacheNames => 
        Promise.all(
          cacheNames.filter(name => name !== CACHE_NAME).map(name => {
            console.log('[SW] 删除旧缓存:', name);
            return caches.delete(name);
          })
        )
      ),
      self.clients.claim()
    ])
  );
});

// 拦截所有请求
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const currentOrigin = self.location.origin;
  
  console.log('[SW-FETCH] 拦截请求:', {
    url: url.href,
    method: event.request.method,
    mode: event.request.mode,
    type: event.request.destination
  });
  
  const runtimeJsReg = /\/runtime\.js(?:\?.*)?$/i;
  const isTargetRuntimeJs = url.hostname === TARGET_HOST && runtimeJsReg.test(url.pathname + url.search);
  
  if (isTargetRuntimeJs) {
    console.log('[SW-TARGET] 模糊匹配到目标 JS 文件:', url.href);
    event.respondWith(handleTargetJS(event));
    return;
  }
  
  // 2. 拦截登录请求，重定向到当前域名
  const isLoginRequest = url.hostname === AVATAR_DOMAIN && 
                         url.pathname.startsWith(LOGIN_PATH) && 
                         event.request.mode === 'navigate';
  
  if (isLoginRequest) {
    console.log('[SW-REDIRECT] 拦截登录导航请求:', url.href);
    const newLoginUrl = new URL(url.pathname + url.search, currentOrigin).href;
    event.respondWith(Response.redirect(newLoginUrl, 302));
    return;
  }
  
  // 3. 处理微信域名请求
  if (url.hostname.includes(WECHAT_DOMAIN) && event.request.method === 'GET') {
    event.respondWith(handleWechatRequest(event, currentOrigin));
    return;
  }
  
  // 4. 处理头像缓存
  if (url.hostname.includes(AVATAR_DOMAIN) && 
      url.pathname.includes('/avatar/') && 
      event.request.method === 'GET') {
    event.respondWith(handleAvatarRequest(event));
    return;
  }
  
  // 5. 拦截其他可能的 JS 文件（额外检查）
  if (event.request.destination === 'script' || 
      url.pathname.endsWith('.js') ||
      event.request.headers.get('Accept')?.includes('javascript')) {
    console.log('[SW-JS] 检测到 JS 请求，检查是否需要修改:', url.href);
    event.respondWith(handlePotentialJS(event));
    return;
  }
});

// ========== 请求处理函数 ==========

// 处理目标 JS 文件
async function handleTargetJS(event) {
  try {
    // 首先尝试从缓存获取
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(event.request);
    
    if (cachedResponse) {
      console.log('[SW-CACHE] 从缓存返回目标 JS');
      return cachedResponse;
    }
    
    // 获取原始文件
    console.log('[SW-FETCH] 获取原始 JS 文件');
    const response = await fetch(event.request);
    
    if (!response.ok) {
      console.error('[SW-ERROR] 获取失败:', response.status);
      return response;
    }
    
    // 修改 JavaScript
    const originalText = await response.text();
    console.log('[SW-MODIFY] 原始 JS 大小:', originalText.length);
    
    const modifiedText = modifyJavaScript(originalText);
    
    // 创建新响应
    const newResponse = new Response(modifiedText, {
      status: 200,
      statusText: 'OK',
      headers: new Headers({
        'Content-Type': 'application/javascript; charset=utf-8',
        'X-SW-Modified': 'true',
        'X-SW-Timestamp': Date.now().toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      })
    });
    
    // 缓存修改后的版本
    console.log('[SW-CACHE] 缓存修改后的 JS');
    await cache.put(event.request, newResponse.clone());
    
    return newResponse;
    
  } catch (error) {
    console.error('[SW-ERROR] 处理目标 JS 失败:', error);
    return fetch(event.request);
  }
}

// 处理潜在的 JS 文件
async function handlePotentialJS(event) {
  try {
    // 先正常获取
    const response = await fetch(event.request);
    
    if (!response.ok || 
        !response.headers.get('Content-Type')?.includes('javascript')) {
      return response;
    }
    
    // 检查是否需要修改
    const text = await response.text();
    
    // 检查是否包含目标模式
    const needsModification = 
      /function\s+ah|ah\s*=\s*function|418|检测|anti-crawler|debugger/i.test(text);
    
    if (needsModification) {
      console.log('[SW-MODIFY] 检测到需要修改的其他 JS 文件:', event.request.url);
      const modifiedText = modifyJavaScript(text);
      
      return new Response(modifiedText, {
        status: 200,
        headers: new Headers(response.headers)
      });
    }
    
    return response;
    
  } catch (error) {
    console.error('[SW-ERROR] 处理 JS 失败:', error);
    return fetch(event.request);
  }
}

// 处理微信请求（保持原有逻辑）
async function handleWechatRequest(event, currentOrigin) {
  try {
    const response = await fetch(event.request);
    const clonedResponse = response.clone();
    const text = await clonedResponse.text();

    if (text.includes('redirect_uri') && text.includes(LOGIN_PATH)) {
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        const modifiedText = text.replace(
          new RegExp(`https://${AVATAR_DOMAIN}${LOGIN_PATH}`, 'g'),
          `${currentOrigin}${LOGIN_PATH}`
        );
        return new Response(modifiedText, {
          headers: response.headers,
          status: response.status,
          statusText: response.statusText
        });
      }

      const replaceRedirectUri = (obj) => {
        if (typeof obj !== 'object' || obj === null) return;
        Object.keys(obj).forEach(key => {
          if (key === 'redirect_uri' || key === 'redirect_url') {
            if (typeof obj[key] === 'string' && obj[key].includes(`${AVATAR_DOMAIN}${LOGIN_PATH}`)) {
              obj[key] = obj[key].replace(
                new RegExp(`https://${AVATAR_DOMAIN}${LOGIN_PATH}`, 'g'),
                `${currentOrigin}${LOGIN_PATH}`
              );
              console.log('[SW-WECHAT] 替换 redirect:', obj[key]);
            }
          } else {
            replaceRedirectUri(obj[key]);
          }
        });
      };

      replaceRedirectUri(data);
      return new Response(JSON.stringify(data), {
        headers: response.headers,
        status: response.status,
        statusText: response.statusText
      });
    }

    return response;
  } catch (error) {
    console.warn('[SW-WECHAT] 处理微信请求失败:', error);
    return fetch(event.request);
  }
}

// 处理头像请求
async function handleAvatarRequest(event) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(event.request);
    if (cachedResponse) return cachedResponse;
    
    const fetchResponse = await fetch(event.request, { 
      mode: 'no-cors', 
      credentials: 'omit' 
    });
    
    if (fetchResponse && fetchResponse.type === 'opaque') {
      await cache.put(event.request, fetchResponse.clone());
    }
    
    return fetchResponse;
  } catch (error) {
    console.warn('[SW-AVATAR] 处理头像请求失败:', error);
    return fetch(event.request);
  }
}

// ========== 消息处理 ==========
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SW_DEBUG') {
    console.log('[SW-MESSAGE] 收到调试消息:', event.data);
    // 可以在这里添加调试功能
  }
});

console.log('[SW] Service Worker 加载完成');
