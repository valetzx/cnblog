// netlify/edge-functions/proxy-handler.ts
import type { Context } from "@netlify/edge-functions";

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

  // 初始化代理目标（默认无匹配）
  let targetBaseUrl: string | null = null;
  let matchedPrefix: string | null = null;

  // 1. 优先匹配 /api 路径（精确匹配或子路径）
  if (path === "/api" || path.startsWith("/api/")) {
    targetBaseUrl = "https://api.cnb.cool";
    matchedPrefix = "/api";
  } 
  // 2. 排除单独的根路径 /，其他非/api路径代理到cnb.cool
  else if (path !== "/") {
    targetBaseUrl = "https://cnb.cool";
    matchedPrefix = ""; // 空前缀表示使用完整路径
  }
  // 3. 根路径 / 不设置代理目标，直接交由Netlify处理

  // 有匹配的代理规则时处理代理
  if (targetBaseUrl && matchedPrefix !== null) {
    try {
      // 构造目标URL路径部分
      const remainingPath = matchedPrefix 
        ? path.substring(matchedPrefix.length) 
        : path;
      const targetUrlString = targetBaseUrl.replace(/\/$/, '') + remainingPath;
      const targetUrl = new URL(targetUrlString);
      targetUrl.search = url.search;

      // 处理session头，转换为CNBSESSION cookie
      const sessionValue = request.headers.get('session');
      const proxyHeaders = new Headers(request.headers);

      // 处理session转换为Cookie
      if (sessionValue) {
        // 如果已有Cookie，在原有基础上添加；否则直接设置
        const existingCookie = proxyHeaders.get('Cookie') || '';
        const newCookie = existingCookie 
          ? `${existingCookie}; CNBSESSION=${sessionValue}` 
          : `CNBSESSION=${sessionValue}`;
        proxyHeaders.set('Cookie', newCookie);
      }

      // 新增：处理authorization头（值为Bearer undefined时移除）
      const authHeader = proxyHeaders.get('Authorization');
      if (authHeader === 'Bearer undefined') {
        proxyHeaders.delete('Authorization');
      }
      proxyHeaders.set('Sec-Fetch-Site', 'same-origin');
      if (path === '/user' || /^\/login\/.*/.test(path)) {
        proxyHeaders.set('Accept', 'application/vnd.cnb.web+json');
      }
      const proxyRequest = new Request(targetUrl.toString(), {
        method: request.method,
        headers: proxyHeaders, 
        body: request.body,
        redirect: 'manual'
      });

      // 设置必要的代理头
      proxyRequest.headers.set("Host", targetUrl.host);
      const clientIp = context.ip || request.headers.get('x-nf-client-connection-ip') || "";
      proxyRequest.headers.set('X-Forwarded-For', clientIp);
      proxyRequest.headers.set('X-Forwarded-Host', url.host);
      proxyRequest.headers.set('X-Forwarded-Proto', url.protocol.replace(':', ''));

      // 改写 Referer 头为 targetBaseUrl 对应的路径
      const newReferer = `${targetBaseUrl.replace(/\/$/, '')}${remainingPath}${url.search}`;
      proxyRequest.headers.set('Referer', newReferer);
      proxyRequest.headers.set('referer', newReferer);

      // 发起代理请求
      const response = await fetch(proxyRequest);

      // 若返回403，移交Netlify处理
      if (response.status === 403) {
        return; // 不返回403响应，交由Netlify处理
      }

      // 创建新响应（非403状态正常返回）
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
        
        if (redirectedUrl.origin === targetUrl.origin) {
          const newLocation = `${url.origin}${matchedPrefix}${redirectedUrl.pathname}${redirectedUrl.search}`;
          newResponse.headers.set('Location', newLocation);
        }
      }

      // 为 /login/ 路径的所有请求处理返回的Cookie
      if (/^\/login\/.*/.test(path)) {
        const cookies = response.headers.getSetCookie();
        const cookieData: Record<string, string> = {};
        
        cookies.forEach(cookie => {
          const parts = cookie.split(';')[0].split('=');
          if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim();
            if (key === 'CNBSESSION' || key === 'csrfkey') {
              cookieData[key] = value;
            }
          }
        });
      }

      return newResponse;

    } catch (error) {
      return;
    }
  }

  // 无匹配规则时（包括根路径 /）交由 Netlify 处理
  return;
};
