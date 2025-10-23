const CACHE_NAME = 'avatar-cache-v1';
const AVATAR_DOMAIN = 'cnb.cool';
const WECHAT_DOMAIN = 'localhost.weixin.qq.com';
const LOGIN_PATH = '/login/wx_do_login';

// 安装Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  event.waitUntil(self.skipWaiting());
});

// 激活Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.clients.claim()
    ])
  );
});

// 拦截fetch请求
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const currentDomain = self.location.host;
  const currentOrigin = self.location.origin; 

  // 1. 优先处理登录请求：替换cnb.cool为当前域名
  if (url.pathname === LOGIN_PATH && url.hostname === AVATAR_DOMAIN) {
    event.respondWith(handleLoginRequest(event, currentOrigin));
    return;
  }

  // 2. 处理微信域名请求
  if (url.hostname.includes(WECHAT_DOMAIN) && event.request.method === 'GET') {
    event.respondWith(handleWechatRequest(event));
    return;
  }

  // 3. 处理头像请求缓存
  if (url.hostname.includes(AVATAR_DOMAIN) &&
      url.pathname.includes('/avatar/') &&
      event.request.method === 'GET') {
    event.respondWith(
      (async () => {
        try {
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(event.request);
          if (cachedResponse) {
            console.log('Serving avatar from cache:', url.pathname);
            return cachedResponse;
          }
          console.log('Fetching and caching avatar:', url.pathname);
          const fetchResponse = await fetch(event.request, {
            mode: 'no-cors',
            credentials: 'omit'
          });
          if (fetchResponse && fetchResponse.type === 'opaque') {
            await cache.put(event.request, fetchResponse.clone());
          }
          return fetchResponse;
        } catch (error) {
          console.warn('Failed to handle avatar request:', error);
          return fetch(event.request);
        }
      })()
    );
  }
});

// 处理登录请求：将cnb.cool替换为当前域名
async function handleLoginRequest(event, currentOrigin) {
  try {
    const originalUrl = new URL(event.request.url);
    // 构造新URL：用当前域名替换cnb.cool，保留路径和查询参数
    const newUrl = new URL(originalUrl.pathname + originalUrl.search, currentOrigin);

    console.log('Redirecting login request to:', newUrl.href);

    // 复制原请求的配置（方法、headers、credentials等）
    const requestOptions = {
      method: event.request.method,
      headers: event.request.headers,
      credentials: 'include', 
      mode: 'cors', 
      redirect: 'follow',
      cache: event.request.cache,
      referrer: event.request.referrer,
      referrerPolicy: event.request.referrerPolicy,
      integrity: event.request.integrity
    };

    const response = await fetch(newUrl.href, requestOptions);
    console.log('Login request handled, cookies set for current domain');
    return response;
  } catch (error) {
    console.warn('Failed to handle login request:', error);
    // 失败时 fallback 到原请求
    return fetch(event.request);
  }
}

// 处理微信请求并替换redirect_uri
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
        console.warn('Failed to parse wechat response as JSON:', e);
        return response;
      }

      if (data && data.jsdata && data.jsdata.redirect_uri) {
        const currentDomain = self.location.host; 
        const regex = /https:\/\/cnb\.cool(?=\/|$)/; 
        
        data.jsdata.redirect_uri = data.jsdata.redirect_uri.replace(
          regex, 
          `https://${currentDomain}`
        );

        console.log('Modified redirect_uri:', data.jsdata.redirect_uri);

        return new Response(JSON.stringify(data), {
          headers: response.headers,
          status: response.status,
          statusText: response.statusText
        });
      }
    }

    return response;

  } catch (error) {
    console.warn('Failed to handle wechat request:', error);
    return fetch(event.request);
  }
}