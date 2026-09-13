/**
 * 面溯 · Workers 入口
 * -------------------------------------------------------------
 * 静态资产（8 页 + css/js/favicon）由 wrangler.jsonc 的 assets 配置直接服务；
 * 未命中静态资产的请求（即 /ai）进入这里，转给 functions/ai.js 的 handler。
 * functions/ai.js 与 Netlify/EdgeOne 版业务逻辑一致：GET 健康检查 / POST SSE 透传。
 */
import { onRequest } from './functions/ai.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/ai' || url.pathname === '/ai/') {
      return onRequest({ request, env, params: {}, ctx });
    }
    const resp = await env.ASSETS.fetch(request);
    /* v2.0.4：HTML 一律 no-store —— 部署后浏览器绝不能再吐旧页面
       （此前 max-age=0+must-revalidate 仍有浏览器本地旧条目不回源验证的口子）。
       js/css 由页面以 ?v=版本号 引用，版本变了 URL 就变，天然免疫旧缓存。 */
    if (url.pathname === '/' || url.pathname.endsWith('.html')) {
      const r = new Response(resp.body, resp);
      r.headers.set('Cache-Control', 'no-store, max-age=0');
      return r;
    }
    return resp;
  }
};
