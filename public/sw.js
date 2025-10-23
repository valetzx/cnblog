const CACHE_NAME = 'avatar-cache-v1';
const AVATAR_DOMAIN = 'cnb.cool';
const WECHAT_DOMAIN = 'localhost.weixin.qq.com';

// 安装Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  event.waitUntil(self.skipWaiting());
});

// 激活Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(self.clients.claim());
});

// 拦截fetch请求
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 处理微信域名请求
  if (url.hostname.includes(WECHAT_DOMAIN) && event.request.method === 'GET') {
    event.respondWith(handleWechatRequest(event));
    return;
  }

  // 只处理头像请求
  if (url.hostname.includes(AVATAR_DOMAIN) &&
      url.pathname.includes('/avatar/') &&
      event.request.method === 'GET') {

    event.respondWith(
      (async () => {
        try {
          // 首先尝试从缓存获取
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(event.request);

          if (cachedResponse) {
            console.log('Serving avatar from cache:', url.pathname);
            return cachedResponse;
          }

          // 如果没有缓存，则获取并缓存
          console.log('Fetching and caching avatar:', url.pathname);
          const fetchResponse = await fetch(event.request, {
            mode: 'no-cors',
            credentials: 'omit'
          });

          // 只缓存成功的响应
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

// 处理微信请求
async function handleWechatRequest(event) {
  try {
    // 获取原始响应
    const response = await fetch(event.request);

    // 克隆响应以便读取和修改
    const clonedResponse = response.clone();

    // 尝试解析响应内容
    const text = await clonedResponse.text();

    // 检查是否包含目标JSON结构
    if (text.includes('"apiname": "qrconnectfastauthorize"') &&
        text.includes('"redirect_uri": "https://cnb.cool/')) {

      console.log('Found wechat authorize response, modifying redirect_uri');

      // 解析JSON
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.warn('Failed to parse wechat response as JSON:', e);
        return response;
      }

      // 检查是否包含jsdata和redirect_uri
      if (data && data.jsdata && data.jsdata.redirect_uri) {
        // 获取当前域名
        const currentDomain = self.location.hostname;

        // 替换redirect_uri中的域名
        data.jsdata.redirect_uri = data.jsdata.redirect_uri.replace(
          'https://cnb.cool/',
          `https://${currentDomain}/`
        );

        console.log('Modified redirect_uri:', data.jsdata.redirect_uri);

        // 创建新的响应
        const modifiedResponse = new Response(JSON.stringify(data), {
          headers: response.headers,
          status: response.status,
          statusText: response.statusText
        });

        return modifiedResponse;
      }
    }

    // 如果没有匹配的内容，返回原始响应
    return response;

  } catch (error) {
    console.warn('Failed to handle wechat request:', error);
    return fetch(event.request);
  }
}

// 清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
