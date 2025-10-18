const CACHE_NAME = 'avatar-cache-v1';
const AVATAR_DOMAIN = 'cnb.cool';

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
