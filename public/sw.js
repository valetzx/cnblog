const CACHE_NAME = 'avatar-cache-v1';
const AVATAR_DOMAIN = 'cnb.cool';
const WECHAT_DOMAIN = 'localhost.weixin.qq.com';
const LOGIN_PATH = '/login/wx_do_login';

// 安装时强制激活
self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  event.waitUntil(self.skipWaiting());
});

// 激活时接管所有客户端
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(
    Promise.all([
      caches.keys().then(cacheNames => 
        Promise.all(cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name)))
      ),
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const currentOrigin = self.location.origin; // 当前域名（如 https://cnb.wx.onmicrosoft.cn）
  const isLoginRequest = url.hostname === AVATAR_DOMAIN && url.pathname.startsWith(LOGIN_PATH);

  // 1. 拦截原登录请求，直接302重定向到当前域名
  if (isLoginRequest && event.request.mode === 'navigate') {
    console.log('拦截到登录导航请求，强制重定向:', url.href);
    // 构造当前域名的登录URL
    const newLoginUrl = new URL(url.pathname + url.search, currentOrigin).href;
    // 返回302重定向响应，强制浏览器跳转
    event.respondWith(Response.redirect(newLoginUrl, 302));
    return;
  }

  // 2. 处理微信域名请求（重点强化redirect_uri替换）
  if (url.hostname.includes(WECHAT_DOMAIN) && event.request.method === 'GET') {
    event.respondWith(handleWechatRequest(event, currentOrigin));
    return;
  }

  // 3. 处理头像缓存（保持不变）
  if (url.hostname.includes(AVATAR_DOMAIN) && url.pathname.includes('/avatar/') && event.request.method === 'GET') {
    event.respondWith(
      (async () => {
        try {
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(event.request);
          if (cachedResponse) return cachedResponse;
          const fetchResponse = await fetch(event.request, { mode: 'no-cors', credentials: 'omit' });
          if (fetchResponse && fetchResponse.type === 'opaque') await cache.put(event.request, fetchResponse.clone());
          return fetchResponse;
        } catch (error) {
          console.warn('处理头像请求失败:', error);
          return fetch(event.request);
        }
      })()
    );
  }
});

// 处理微信请求：强化redirect_uri替换逻辑
async function handleWechatRequest(event, currentOrigin) {
  try {
    const response = await fetch(event.request);
    const clonedResponse = response.clone();
    const text = await clonedResponse.text();

    // 匹配所有包含登录路径的redirect_uri（不局限于特定apiname）
    if (text.includes('redirect_uri') && text.includes(LOGIN_PATH)) {
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.warn('解析微信响应失败，尝试直接替换文本中的redirect_uri:', e);
        // 如果JSON解析失败，直接替换文本中的域名
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

      // JSON解析成功时，递归替换所有可能的redirect_uri
      const replaceRedirectUri = (obj) => {
        if (typeof obj !== 'object' || obj === null) return;
        Object.keys(obj).forEach(key => {
          if (key === 'redirect_uri' || key === 'redirect_url') {
            if (typeof obj[key] === 'string' && obj[key].includes(`${AVATAR_DOMAIN}${LOGIN_PATH}`)) {
              obj[key] = obj[key].replace(
                new RegExp(`https://${AVATAR_DOMAIN}${LOGIN_PATH}`, 'g'),
                `${currentOrigin}${LOGIN_PATH}`
              );
              console.log('替换微信响应中的redirect:', obj[key]);
            }
          } else {
            replaceRedirectUri(obj[key]); // 递归处理嵌套对象
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
    console.warn('处理微信请求失败:', error);
    return fetch(event.request);
  }
}