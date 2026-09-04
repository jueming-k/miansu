/**
 * 面溯 · AI 代理（Cloudflare Pages Function 版）
 * -------------------------------------------------------------
 * 迁移自 Netlify Edge Function（netlify/edge-functions/ai.js），业务逻辑 100% 一致：
 *   GET  /ai  → 健康检查（0 消耗）
 *   POST /ai  → 转发 DeepSeek，SSE 流式透传
 *
 * Cloudflare Pages Functions 约定：
 *   目录 functions/，文件 functions/ai.js → 路由 /ai
 *   handler：export async function onRequest(context)，context.request / context.env
 *   环境变量：Cloudflare Pages 控制台 → 项目 → Settings → Environment variables
 *     DEEPSEEK_API_KEY = sk-xxxx
 *
 * 前端无需改动：app.js 默认 endpoint 就是相对路径 /ai，与同域 Pages Function 打通。
 */
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const DEFAULT_MODEL = 'deepseek-v4-flash';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

/* ── 极简 IP 限流（单实例内存，兜底用）──────────────────── */
const WINDOW_MS = 60 * 1000;
const MAX_HITS = 30;
const hits = new Map();

function limited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > MAX_HITS;
}

function json(obj, status = 200, extra = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      ...CORS,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extra
    }
  });
}

/* ── 运行时无关的纯逻辑 ────────────────────────────────── */
async function _handle(request, env, ip) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const serverKey = env.DEEPSEEK_API_KEY || '';

  if (request.method === 'GET') {
    return json({
      ok: true,
      service: 'miansu-ai-proxy',
      host: 'cloudflare-pages',
      serverKey: !!serverKey,
      model: env.DEEPSEEK_MODEL || DEFAULT_MODEL
    });
  }

  if (request.method !== 'POST') return json({ error: { message: '仅支持 GET / POST' } }, 405);

  if (limited(ip)) {
    return json({ error: { message: '请求过于频繁，请稍后再试（每分钟 30 次上限）' } }, 429);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: { message: '请求体不是合法 JSON' } }, 400);
  }

  const auth = request.headers.get('authorization') || '';
  const feKey = auth.replace(/^Bearer\s+/i, '').trim();
  const key = serverKey || feKey || '';
  if (!key) {
    return json(
      { error: { message: 'NO_SERVER_KEY：服务端尚未配置共用 Key。访客可在「设置」页填自己的 Key。' } },
      501,
      { 'x-miansu-ai': 'no-key' }
    );
  }

  const m = Array.isArray(body.messages) ? body.messages : [];
  const isProbe = body.max_tokens === 1 && m.length === 1 && m[0] && m[0].content === 'ping';
  if (isProbe) {
    return json({ ok: true, probe: true, source: serverKey ? 'server-key' : (feKey ? 'user-key' : 'none') });
  }

  const payload = {
    model: body.model || env.DEEPSEEK_MODEL || DEFAULT_MODEL,
    messages: body.messages,
    stream: body.stream !== false,
    temperature: body.temperature ?? 0.7,
    max_tokens: body.max_tokens ?? 8192
  };

  let upstream;
  try {
    upstream = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    return json({ error: { message: '无法连接模型服务：' + (e && e.message ? e.message : String(e)) } }, 502);
  }

  const headers = new Headers(CORS);
  headers.set('Content-Type', upstream.headers.get('Content-Type') || 'application/json; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Miansu-AI', serverKey ? 'server-key' : (feKey ? 'user-key' : 'none'));

  return new Response(upstream.body, { status: upstream.status, headers });
}

/* Cloudflare Pages Functions handler */
export async function onRequest(context) {
  const { request, env } = context;
  const ip =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for') ||
    'unknown';
  return _handle(request, env || {}, ip);
}
