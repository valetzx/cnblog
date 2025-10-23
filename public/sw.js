const CACHE_NAME = 'avatar-cache-v1';
const AVATAR_DOMAIN = 'cnb.cool';
const WECHAT_DOMAIN = 'localhost.weixin.qq.com';
const LOGIN_PATH = '/login/wx_do_login';

// 安装时强制激活新的Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  event.waitUntil(self.skipWaiting()); // 跳过等待，立即激活
});

// 激活时接管所有客户端，并清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(
    Promise.all([
      caches.keys().then(cacheNames => 
        Promise.all(
          cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
        )
      ),
      self.clients.claim() // 立即接管所有页面
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const currentOrigin = self.location.origin; // 当前域名（含协议，如 https://xxx.com）

  // 1. 优先拦截登录请求（重点修正）
  if (
    url.hostname === AVATAR_DOMAIN && // 确保域名完全匹配 cnb.cool
    url.pathname.startsWith(LOGIN_PATH) && // 路径以目标路径开头（兼容可能的参数或后缀）
    event.request.method === 'GET'
  ) {
    console.log('拦截到目标登录请求:', url.href);
    event.respondWith(handleLoginRedirect(event, currentOrigin));
    return;
  }

  // 2. 处理微信域名请求（保持不变）
  if (url.hostname.includes(WECHAT_DOMAIN) && event.request.method === 'GET') {
    event.respondWith(handleWechatRequest(event));
    return;
  }

  // 3. 处理头像缓存（保持不变）
  if (url.hostname.includes(AVATAR_DOMAIN) &&
      url.pathname.includes('/avatar/') &&
      event.request.method === 'GET') {
    event.respondWith(
      (async () => {
        try {
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(event.request);
          if (cachedResponse) {
            console.log('从缓存返回头像:', url.pathname);
            return cachedResponse;
          }
          const fetchResponse = await fetch(event.request, { mode: 'no-cors', credentials: 'omit' });
          if (fetchResponse && fetchResponse.type === 'opaque') {
            await cache.put(event.request, fetchResponse.clone());
          }
          return fetchResponse;
        } catch (error) {
          console.warn('处理头像请求失败:', error);
          return fetch(event.request);
        }
      })()
    );
  }
});

// 处理登录请求：重定向到当前域名
async function handleLoginRedirect(event, currentOrigin) {
  try {
    const originalUrl = new URL(event.request.url);
    // 构造新URL：用当前域名替换 cnb.cool，保留完整路径和参数
    const newUrl = new URL(originalUrl.pathname + originalUrl.search, currentOrigin);
    console.log('登录请求重定向到:', newUrl.href); // 重点日志：确认新URL是否正确

    // 复制原请求的所有配置（确保导航请求正常处理）
    const requestInit = {
      method: event.request.method,
      headers: new Headers(event.request.headers), // 复制headers
      credentials: 'include', // 传递Cookie（如果有）
      mode: 'cors', // 同域请求用cors模式
      redirect: 'follow', // 跟随302重定向
      cache: event.request.cache,
      referrer: event.request.referrer,
      integrity: event.request.integrity
    };

    // 发起新请求（当前域名）
    const response = await fetch(newUrl.href, requestInit);

    // 日志：确认响应的域名和Cookie
    console.log('新登录请求响应域名:', new URL(response.url).hostname);
    console.log('响应的Set-Cookie:', response.headers.getAll('Set-Cookie'));

    return response;
  } catch (error) {
    console.error('登录请求重定向失败:', error);
    // 失败时返回原请求（避免页面崩溃）
    return fetch(event.request);
  }
}

// 处理微信请求（保持不变）
async function handleWechatRequest(event) {
  try {
    const response = await fetch(event.request);
    const clonedResponse = response.clone();
    const text = await clonedResponse.text();

    if (text.includes('"apiname": "qrconnectfastauthorize"') &&
        text.includes('"redirect_uri": "https://cnb.cool')) {

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.warn('解析微信响应失败:', e);
        return response;
      }

      if (data && data.jsdata && data.jsdata.redirect_uri) {
        const currentDomain = self.location.host;
        data.jsdata.redirect_uri = data.jsdata.redirect_uri.replace(
          /https:\/\/cnb\.cool(?=\/|$)/,
          `https://${currentDomain}`
        );
        console.log('修改redirect_uri:', data.jsdata.redirect_uri);
        return new Response(JSON.stringify(data), {
          headers: response.headers,
          status: response.status,
          statusText: response.statusText
        });
      }
    }

    return response;
  } catch (error) {
    console.warn('处理微信请求失败:', error);
    return fetch(event.request);
  }
}