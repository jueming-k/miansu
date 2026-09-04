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
    return env.ASSETS.fetch(request);
  }
};
