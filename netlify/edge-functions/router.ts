// netlify/edge-functions/proxy-handler.ts
import type { Context } from "@netlify/edge-functions";

// 仅保留需要的代理规则
const PROXY_CONFIG = {
  "/cnbapi": "https://api.cnb.cool",
  "/cnbmain": "https://cnb.cool"
};

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

  // 检查是否匹配需要的代理路径
  const prefixes = Object.keys(PROXY_CONFIG);
  for (const prefix of prefixes) {
    if (path === prefix || path.startsWith(prefix + '/')) {
      targetBaseUrl = PROXY_CONFIG[prefix as keyof typeof PROXY_CONFIG];
      matchedPrefix = prefix;
      break;
    }
  }

  // 如果找到匹配的代理规则
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

      // 设置必要的代理头
      proxyRequest.headers.set("Host", targetUrl.host);
      const clientIp = context.ip || request.headers.get('x-nf-client-connection-ip') || "";
      proxyRequest.headers.set('X-Forwarded-For', clientIp);
      proxyRequest.headers.set('X-Forwarded-Host', url.host);
      proxyRequest.headers.set('X-Forwarded-Proto', url.protocol.replace(':', ''));

      // 发起代理请求
      const response = await fetch(proxyRequest);

      // 创建新响应
      const newResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });

      // 设置 CORS 头
      newResponse.headers.set('Access-Control-Allow-Origin', '*');
      newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

      // 移除可能导致问题的安全头
      newResponse.headers.delete('Content-Security-Policy');
      newResponse.headers.delete('X-Frame-Options');

      // 处理重定向
      if (response.status >= 300 && response.status < 400 && response.headers.has('location')) {
        const location = response.headers.get('location')!;
        const redirectedUrl = new URL(location, targetUrl);
        
        // 如果重定向到代理目标的同域，转换为代理路径
        if (redirectedUrl.origin === targetUrl.origin) {
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
