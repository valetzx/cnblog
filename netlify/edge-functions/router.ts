// netlify/edge-functions/proxy-handler.ts
import type { Context } from "@netlify/edge-functions";

// 代理规则
const PROXY_CONFIG = {
  "/cnbapi": "https://api.cnb.cool",
  "/cnbmain": "https://cnb.cool"
};

// 需要处理资源路径的内容类型
const CONTENT_TYPES_TO_REWRITE = [
  "text/html",
  "text/css",
  "application/xhtml+xml",
  "application/javascript",
  "text/javascript"
];

export default async (request: Request, context: Context) => {
  // 处理 CORS 预检请求
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
        "Access-Control-Max-Age": "86400"
      }
    });
  }

  const url = new URL(request.url);
  const path = url.pathname;

  // 查找匹配的代理配置
  let targetBaseUrl: string | null = null;
  let matchedPrefix: string | null = null;
  const prefixes = Object.keys(PROXY_CONFIG);
  
  for (const prefix of prefixes) {
    if (path === prefix || path.startsWith(prefix + '/')) {
      targetBaseUrl = PROXY_CONFIG[prefix as keyof typeof PROXY_CONFIG];
      matchedPrefix = prefix;
      break;
    }
  }

  if (targetBaseUrl && matchedPrefix) {
    // 构造目标 URL
    const remainingPath = path.substring(matchedPrefix.length);
    const targetUrlString = targetBaseUrl.replace(/\/$/, '') + remainingPath;
    const targetUrl = new URL(targetUrlString);
    targetUrl.search = url.search;

    try {
      // 创建代理请求
      const proxyRequest = new Request(targetUrl.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: 'manual'
      });

      // 设置代理头
      proxyRequest.headers.set("Host", targetUrl.host);
      const clientIp = context.ip || request.headers.get('x-nf-client-connection-ip') || "";
      proxyRequest.headers.set('X-Forwarded-For', clientIp);
      proxyRequest.headers.set('X-Forwarded-Host', url.host);
      proxyRequest.headers.set('X-Forwarded-Proto', url.protocol.replace(':', ''));
      
      // 移除 Accept-Encoding 避免压缩内容无法处理
      proxyRequest.headers.delete('accept-encoding');

      // 发起代理请求
      const response = await fetch(proxyRequest);
      const contentType = response.headers.get('content-type') || '';

      // 判断是否需要重写资源路径
      const needRewrite = CONTENT_TYPES_TO_REWRITE.some(type => contentType.includes(type));
      let responseContent = response.body;

      if (needRewrite) {
        // 读取响应内容
        const content = await response.text();
        const targetHost = targetUrl.host; // 目标服务器域名（如 api.cnb.cool）
        const proxyPath = matchedPrefix;   // 代理路径（如 /cnbapi）

        // 重写规则：替换各种形式的资源路径
        let rewrittenContent = content
          // 1. 替换绝对路径（带协议）：https://api.cnb.cool/xxx.css → /cnbapi/xxx.css
          .replace(new RegExp(`(https?:\\/\\/)${targetHost}(\\/[^'"]*)`, 'gi'), `${proxyPath}$2`)
          
          // 2. 替换协议相对路径：//api.cnb.cool/xxx.css → /cnbapi/xxx.css
          .replace(new RegExp(`(\\\\?)//${targetHost}(\\/[^'"]*)`, 'gi'), `${proxyPath}$2`)
          
          // 3. 替换根路径：/xxx.css → /cnbapi/xxx.css（确保不影响其他域名的根路径）
          .replace(new RegExp(`(href|src|url)\\(['"]\\/(?!\\/)`, 'gi'), `$1('${proxyPath}/`)
          
          // 4. 处理 CSS 中的 url() 格式：url(/xxx.css) → url(/cnbapi/xxx.css)
          .replace(new RegExp(`url\\(['"]?\\/${targetHost}(\\/[^'")]*)['"]?\\)`, 'gi'), `url(${proxyPath}$1)`)
          .replace(new RegExp(`url\\(['"]?\\/(?!\\/)`, 'gi'), `url('${proxyPath}/`);

        responseContent = new Blob([rewrittenContent], { type: contentType });
      }

      // 创建新响应
      const newResponse = new Response(responseContent, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });

      // 设置 CORS 头
      newResponse.headers.set('Access-Control-Allow-Origin', '*');
      newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

      // 移除可能阻止代理的安全头
      newResponse.headers.delete('Content-Security-Policy');
      newResponse.headers.delete('Content-Security-Policy-Report-Only');
      newResponse.headers.delete('X-Frame-Options');

      // 处理重定向（将目标服务器的重定向转换为代理路径）
      if (response.status >= 300 && response.status < 400 && response.headers.has('location')) {
        const location = response.headers.get('location')!;
        const redirectedUrl = new URL(location, targetUrl);
        
        if (redirectedUrl.origin === targetUrl.origin) {
          // 同域重定向：转换为代理路径
          const newLocation = `${url.origin}${matchedPrefix}${redirectedUrl.pathname}${redirectedUrl.search}`;
          newResponse.headers.set('Location', newLocation);
        }
      }

      return newResponse;

    } catch (error) {
      context.log("代理请求失败:", error);
      return new Response("代理请求失败", {
        status: 502,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'text/plain;charset=UTF-8'
        }
      });
    }
  }

  // 无匹配规则时交由 Netlify 处理
  return;
};
