const CACHE_NAME = 'avatar-cache-v1';
const AVATAR_DOMAIN = 'cnb.cool';
const WECHAT_DOMAIN = 'localhost.weixin.qq.com';

// 安装Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  event.waitUntil(self.skipWaiting());
});

// 激活Service Worker（合并清理旧缓存和接管客户端逻辑）
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(
    Promise.all([
      // 清理旧缓存
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
      // 立即接管所有客户端
      self.clients.claim()
    ])
  );
});

// 拦截fetch请求
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 处理微信域名请求（包含端口也会匹配，因为hostname不含端口）
  if (url.hostname.includes(WECHAT_DOMAIN) && event.request.method === 'GET') {
    event.respondWith(handleWechatRequest(event));
    return;
  }

  // 处理头像请求缓存
  if (url.hostname.includes(AVATAR_DOMAIN) &&
      url.pathname.includes('/avatar/') &&
      event.request.method === 'GET') {

    event.respondWith(
      (async () => {
        try {
          // 优先从缓存获取
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(event.request);

          if (cachedResponse) {
            console.log('Serving avatar from cache:', url.pathname);
            return cachedResponse;
          }

          // 缓存新请求
          console.log('Fetching and caching avatar:', url.pathname);
          const fetchResponse = await fetch(event.request, {
            mode: 'no-cors',
            credentials: 'omit'
          });

          // 只缓存成功的不透明响应（no-cors模式下的正常响应类型）
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

// 处理微信请求并替换redirect_uri
async function handleWechatRequest(event) {
  try {
    const response = await fetch(event.request);
    const clonedResponse = response.clone();
    const text = await clonedResponse.text();

    // 匹配目标响应结构
    if (text.includes('"apiname": "qrconnectfastauthorize"') &&
        text.includes('"redirect_uri": "https://cnb.cool')) {

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.warn('Failed to parse wechat response as JSON:', e);
        return response;
      }

      // 替换redirect_uri中的域名
      if (data && data.jsdata && data.jsdata.redirect_uri) {
        // 获取当前域名（含端口，无端口则自动省略）
        const currentDomain = self.location.host; 
        // 正则匹配"https://cnb.cool"（后面可跟斜杠或直接结束，避免误匹配）
        const regex = /https:\/\/cnb\.cool(?=\/|$)/; 
        
        data.jsdata.redirect_uri = data.jsdata.redirect_uri.replace(
          regex, 
          `https://${currentDomain}`
        );

        console.log('Modified redirect_uri:', data.jsdata.redirect_uri);

        // 返回修改后的响应
        return new Response(JSON.stringify(data), {
          headers: response.headers,
          status: response.status,
          statusText: response.statusText
        });
      }
    }

    // 不匹配则返回原始响应
    return response;

  } catch (error) {
    console.warn('Failed to handle wechat request:', error);
    return fetch(event.request);
  }
}