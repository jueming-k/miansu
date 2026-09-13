/* ════════════════════════════════════════════════════
   面溯 · 共享运行时
   - 主题切换 / 导航注入 / Store / Toast / 工具函数
   - LLM 与 ASR：接口签名完整，真实实现留 TODO 占位
   ════════════════════════════════════════════════════ */

const NS = 'miansu:';
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* 版本标记 —— 部署后打开「设置」页底部即可看到，
   用来确认线上跑的到底是不是刚拖上去的那一版（避免拖漏 / CDN 缓存误判）。 */
const APP_BUILD = { ver: 'v2.0.5', at: '2026-09-13', feat: 'v2.0.5：①把 8 页 head 里的页面级样式合并进 styles.css，修复软导航回首页时 .hero/.wk-grid 丢失导致的排版错乱（被误认为退回旧版本）；②html{scrollbar-gutter:stable} 消除切页时滚动条增减造成的左右抖动；③移除 LIVE 徽章与设置页 DEMO/LIVE 开关，AI 不可用时静默降级不再暴露状态牌；④关于页：删除 Prompt 透明墙、能力边界卡改白底（深色主题下深底深字看不见）.' };

/* 说话人标签归一化：容忍 AI 回「说话人一」「Speaker 1」等写法 */
const CN_DIGITS = { '一':'1','二':'2','三':'3','四':'4','五':'5','六':'6','七':'7','八':'8','九':'9','十':'10' };
function normSpeakerKey(k) {
  const s = String(k ?? '');
  const m = s.match(/\d+|[一二三四五六七八九十]/);
  if (!m) return s.trim();
  return CN_DIGITS[m[0]] || m[0];
}

/* ══════ 工具函数 ══════ */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const today = () => new Date().toISOString().slice(0, 10);
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* 日期辅助：统一按本地时区解析，避免 toISOString 的 UTC 偏移 */
const WD = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const parseDate = s => new Date(String(s).slice(0, 10) + 'T00:00:00');
const weekday = s => WD[parseDate(s).getDay()];
const mdOf = s => { const d = parseDate(s); return `${d.getMonth() + 1}月${d.getDate()}日`; };
const dayNum = s => parseDate(s).getDate();

/* ══════ Store（localStorage，按命名空间隔离） ══════ */
const Store = {
  _read(k, d) { try { return JSON.parse(localStorage.getItem(NS + k)) ?? d; } catch { return d; } },
  _write(k, v) { localStorage.setItem(NS + k, JSON.stringify(v)); },

  jobs: {
    all() { return Store._read('jobs', null) ?? Store.jobs.seed(); },
    add(j) { const a = Store.jobs.all(); a.unshift({ id: uid(), ...j }); Store._write('jobs', a); return a[0]; },
    get(id) { return Store.jobs.all().find(x => x.id === id); },
    update(id, patch) { const a = Store.jobs.all().map(x => x.id === id ? { ...x, ...patch } : x); Store._write('jobs', a); },
    remove(id) { Store._write('jobs', Store.jobs.all().filter(x => x.id !== id)); },
    clear() { Store._write('jobs', []); },
    /* 仅清除「示例面试记录」（靠公司名识别），保留用户自己添加的真实数据 */
    clearSeed() {
      const SEED = ['星澜科技', '云图智能', '明澈数字', '禾风科技', '澜图互动', '光年引擎'];
      Store._write('jobs', Store.jobs.all().filter(j => !SEED.includes(j.company)));
    },
    /* 演示种子：6 家公司 / AI 产品实习生
       date = 投递日期；interviewAt + interviewTime + place = 下一场安排（为空表示暂无） */
    seed() {
      const s = [
        { company: '星澜科技', role: 'AI 产品实习生', date: '2026-07-02', stage: 'HR 面', result: '已 Offer',
          resume: 'v3 · RAG 向', note: '三面追问 RAG 评估指标，答得一般但项目细节扎实',
          interviewAt: '', interviewTime: '', place: '' },
        { company: '云图智能', role: 'AI 产品实习生', date: '2026-07-08', stage: '二面', result: '进行中',
          resume: 'v3 · RAG 向', note: 'Agent 工具调用设计题现场画了流程',
          interviewAt: '2026-09-02', interviewTime: '10:00', place: '线上 · 飞书会议' },
        { company: '明澈数字', role: 'AI 产品实习生', date: '2026-07-12', stage: '一面', result: '进行中',
          resume: 'v2', note: '',
          interviewAt: '2026-09-04', interviewTime: '14:30', place: '北京市大兴区 · 亦庄总部' },
        { company: '禾风科技', role: 'AI 产品实习生', date: '2026-07-15', stage: '笔试', result: '进行中',
          resume: 'v2', note: '',
          interviewAt: '2026-09-08', interviewTime: '19:00', place: '线上 · 视频会议' },
        { company: '澜图互动', role: 'AI 产品实习生', date: '2026-07-19', stage: '投递', result: '等待中',
          resume: 'v3 · RAG 向', note: '',
          interviewAt: '', interviewTime: '', place: '' },
        { company: '光年引擎', role: 'AI 产品实习生', date: '2026-07-22', stage: '一面', result: '等待中',
          resume: 'v3 · RAG 向', note: '',
          interviewAt: '2026-09-11', interviewTime: '15:00', place: '线上 · 视频会议' },
      ].map(x => ({ id: uid(), ...x }));
      Store._write('jobs', s);
      localStorage.setItem(NS + 'seedVer', '2');
      return s;
    },

    /* 补齐缺失字段，不动已有数据 */
    normalize(j) {
      return { interviewAt: '', interviewTime: '', place: '', ...j };
    }
  },

  reviews: {
    all() { return Store._read('reviews', {}); },
    get(jid) { return Store.reviews.all()[jid] ?? null; },
    set(jid, data) { const a = Store.reviews.all(); a[jid] = { ...(a[jid] || {}), ...data, updatedAt: today() }; Store._write('reviews', a); }
  },

  /* ══════ v2.0 追问 Agent 状态（只增不改，前缀仍 miansu:） ══════
     threads：按 jobId 存追问线程 { probes, answers, skipped, swaps, draft, stage, dropped, lastFill }
     agentlog：每次 Agent 调用一条，最多保留 50 条，设置页可查看/导出 */
  threads: {
    all() { return Store._read('threads', {}); },
    get(jid) { return Store.threads.all()[jid] ?? null; },
    set(jid, data) { const a = Store.threads.all(); a[jid] = { ...(a[jid] || {}), ...data, updatedAt: today() }; Store._write('threads', a); },
    remove(jid) { const a = Store.threads.all(); delete a[jid]; Store._write('threads', a); }
  },

  agentlog: {
    all() { return Store._read('agentlog', []); },
    add(entry) { const a = Store.agentlog.all(); a.unshift(entry); if (a.length > 50) a.length = 50; Store._write('agentlog', a); },
    clear() { Store._write('agentlog', []); }
  },

  settings: {
    /* v1.9.0：AI 代理换成本站同域 Edge Function（/ai）。
       历史原因：v1.8.2 依赖 Cloudflare Worker（*.workers.dev），国内网络经常不可达，
       访客打开主站正常、一调 AI 就 fetch 失败，「每个人都能用真 AI」根本不成立。
       现在 Endpoint 是相对路径 /ai，与站点同域 —— 主站打得开，代理就一定通。
       代理 Key 优先级：访客自填 Key > 站点服务端共用 Key。
       两者都没有时，代理返回 501，前端静默回落 DEMO（不弹错误吓人）。 */
    all() {
      const DEFAULTS = { mode: 'live', endpoint: '/ai', key: '', model: 'deepseek-v4-flash' };
      let saved = Store._read('settings', null);
      /* 一次性迁移（v1.9.0）：
         ① 旧 endpoint 指向 workers.dev（或空）→ 换成同域 /ai
         ② 只要迁移过就不再重复写，尊重用户后续在设置页的手动改动 */
      if (saved && localStorage.getItem(NS + 'settingsV3') !== '1') {
        const old = saved.endpoint || '';
        if (!old || /workers\.dev|localhost/i.test(old)) {
          saved = { ...saved, endpoint: '/ai' };
        }
        if (!saved.mode) saved = { ...saved, mode: 'live' };
        Store._write('settings', saved);
        localStorage.setItem(NS + 'settingsV3', '1');
      }
      if (!saved) return { ...DEFAULTS };
      return { ...DEFAULTS, ...saved };
    },
    set(patch) { const s = { ...Store.settings.all(), ...patch }; Store._write('settings', s); return s; }
  },

  /* 本地账号：纯前端没有安全账号方案，这里只做身份标识，不做鉴权 */
  account: {
    all() { return Store._read('account', { name: '', loggedAt: '', seedCleared: false }); },
    get name() { return Store.account.all().name || ''; },
    get isIn() { return !!Store.account.all().name; },
    get seedCleared() { return !!Store.account.all().seedCleared; },
    set(patch) { const a = { ...Store.account.all(), ...patch }; Store._write('account', a); return a; },
    login(name) {
      const a = { name: String(name).trim().slice(0, 16), loggedAt: today(), seedCleared: true };
      Store._write('account', a);
      Store.jobs.clearSeed();   // 登录即清示例，进入用户自己的空间
      return a;
    },
    logout() { Store._write('account', { name: '', loggedAt: '', seedCleared: false }); }
  },

  reset() { ['jobs', 'reviews', 'settings'].forEach(k => localStorage.removeItem(NS + k)); }
};

/* ══════ 常量 ══════ */
const STAGES = ['投递', '笔试', '一面', '二面', '三面', 'HR 面'];
const STAGE_COLORS = ['#7b6cff', '#4ba3f0', '#39d3e6', '#f5a742', '#ff7a45', '#3ec97a'];

/* ══════ Toast ══════ */
const Toast = {
  _box: null,
  _ensure() {
    if (!this._box) {
      this._box = document.createElement('div');
      this._box.className = 'toast-wrap';
      document.body.appendChild(this._box);
    }
    return this._box;
  },
  show(msg, kind = 'ok', ms = 2400) {
    const icons = { ok: '✓', err: '✕', info: 'ℹ', warn: '!' };
    const el = document.createElement('div');
    el.className = 'toast';
    const c = { err: 'var(--bad)', ok: 'var(--ok)', warn: 'var(--warn)' }[kind] || 'var(--accent)';
    el.innerHTML = `<span style="color:${c}">${icons[kind] || '✓'}</span><span>${esc(msg)}</span>`;
    this._ensure().appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(10px)';
      el.style.transition = 'all .3s'; setTimeout(() => el.remove(), 300); }, ms);
  }
};

/* ══════════════════════════════════════════
   网络层 —— 把 fetch 的所有边界情况（DNS / CORS / SSL / 超时）集中处理，
   失败时自动回退到 DEMO 模式并抛用户友好错（不再抛冷冰冰的 "Failed to fetch"）。
   ══════════════════════════════════════════ */
const Net = {
  /* 一次 POST，用完即弃。失败抛 {code:'NETWORK'}，业务层识别后回退 DEMO */
  async fetchLive(body, { timeout = 22000 } = {}) {
    const s = Store.settings.all();
    if (!s.endpoint) throw { code: 'NO_ENDPOINT', message: 'AI 代理地址未配置' };
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeout);
    try {
      const res = await fetch(s.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${s.key || ''}` },
        body: JSON.stringify({ model: s.model, ...body }),
        signal: ac.signal
      });
      clearTimeout(t);
      /* 501 = 代理在线，但服务端没配共用 Key、访客也没填 Key */
      if (res.status === 501) {
        throw { code: 'NO_KEY', message: 'AI 代理未配置可用 Key（NO_SERVER_KEY）' };
      }
      return res;
    } catch (err) {
      clearTimeout(t);
      if (err && err.code === 'NO_KEY') throw err;
      // 真正网络层错误（DNS / 连接失败 / CORS preflight 失败 / 超时）
      throw { code: 'NETWORK', message: err.message || String(err) };
    }
  },

  /* 问代理一句话：服务端有没有配共用 Key？（GET，不消耗任何额度）
     用于「访客一进站就知道能不能用真 AI」，不需要他做任何配置。 */
  async health(timeout = 6000) {
    const s = Store.settings.all();
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeout);
    try {
      const res = await fetch(s.endpoint, { method: 'GET', signal: ac.signal });
      clearTimeout(t);
      if (!res.ok) return { ok: false, status: res.status };
      const d = await res.json().catch(() => null);
      return { ok: true, serverKey: !!(d && d.serverKey), model: d?.model || s.model };
    } catch (e) {
      clearTimeout(t);
      return { ok: false, reason: e.name || 'NetworkError' };
    }
  },

  /* 主动探测 endpoint 是否可达。状态码 2xx/4xx/5xx 都算「连上了」
     （401/403/404 都说明代理层响应了 CORS + 网关），只有 NetworkError 才算不通 */
  async probe(timeout = 5000) {
    const s = Store.settings.all();
    if (!s.endpoint) return { ok: false, reason: 'no-endpoint' };
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeout);
    try {
      const res = await fetch(s.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${s.key || ''}` },
        body: JSON.stringify({ model: s.model, messages: [{ role: 'user', content: 'ping' }], max_tokens: 1 }),
        signal: ac.signal
      });
      clearTimeout(t);
      if (res.status === 501) return { ok: false, reason: 'no-server-key', status: 501 };
      return { ok: res.status > 0 && res.status < 500, status: res.status };
    } catch (err) {
      clearTimeout(t);
      return { ok: false, reason: err.name || 'NetworkError', message: err.message };
    }
  },

  /* 当 fetch 失败时自动切 DEMO 并刷新 UI（badge / 模式徽章 / 选项状态） */
  fallbackToDemo(reason, silent = false) {
    const cur = Store.settings.all();
    if (cur.mode === 'demo') return;
    Store.settings.set({ mode: 'demo' });
    document.dispatchEvent(new CustomEvent('miansu:network-fallback', { detail: { reason } }));
    /* 如果在 settings.html，更新开关状态 */
    const sw = document.getElementById('swMode');
    if (sw) sw.classList.remove('on');
    const tag = document.getElementById('modeTag');
    if (tag) { tag.textContent = 'DEMO'; tag.className = 'tag'; }
    const eff = document.getElementById('effTag');
    if (eff) {
      eff.textContent = 'DEMO（AI 代理不可达，已自动回退）';
      eff.className = 'tag tag-warn';
    }
    /* 顶部导航徽章 */
    const badge = document.getElementById('modeBadge');
    if (badge) { badge.textContent = 'DEMO'; badge.className = 'tag tag-warn'; badge.title = 'AI 代理暂不可用，已自动回退'; }
    /* 顶部小黄条：让用户一进站就知道发生了什么。
       silent=true 用于「进站体检」场景 —— 没配共用 Key 是预期内的，不该吓唬访客 */
    if (!silent) showNetWarn(reason);
  }
};

/* 顶部小黄条：告诉用户 AI 代理连不上，已经自动回退 DEMO，且不要反复骚扰 */
let _netWarnHideAt = 0;
function showNetWarn(reason) {
  /* 短时间内只出现一次（如 30 秒内）。否则连续点击会一直飘 */
  if (Date.now() < _netWarnHideAt) return;
  _netWarnHideAt = Date.now() + 30 * 1000;
  const old = document.getElementById('netWarn');
  if (old) old.remove();
  const el = document.createElement('div');
  el.className = 'net-warn';
  el.id = 'netWarn';
  el.innerHTML = `
    <span style="font-size:16px">⚠</span>
    <span><b>AI 代理连接失败</b>，已自动切回 DEMO 演示模式。<span class="mono small" style="opacity:.75">${esc(String(reason || '').slice(0, 80))}</span></span>
    <a href="settings.html" style="color:var(--accent);font-weight:700;text-decoration:none;white-space:nowrap">去设置 →</a>
    <span class="net-warn-x" onclick="document.getElementById('netWarn')?.remove()">✕</span>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 12 * 1000);
}

/* ══════════════════════════════════════════
   LLM 客户端 —— 接口签名完整，真实实现留 TODO
   TODO(接入 DeepSeek)：浏览器无法直连官方接口（无 CORS 响应头 + Key 明文暴露），
   需自建代理层转发 SSE。届时补全下方 fetch 逻辑，业务层零改动。
   ══════════════════════════════════════════ */
const LLM = {
  get mode() { const s = Store.settings.all(); return (s.mode === 'live' && s.endpoint) ? 'live' : 'demo'; },

  /**
   * @param {{role:string,content:string}[]} messages
   * @param {{onThink?:(c:string)=>void, onToken?:(c:string)=>void, maxTokens?:number}} handlers
   * @returns {Promise<{text:string, think:string, truncated:boolean, mode:string}>}
   *   返回完整正文（不只靠 onToken 累积）—— 回调若被异常打断，调用方仍拿得到内容，
   *   不会出现「弹窗说生成成功、正文却是空的」。
   */
  async chat(messages, handlers = {}) {
    /* deepseek-v4-flash 是推理模型：会先吐大段 reasoning_content 再吐 content，
       两者共用 max_tokens。给 2048 时思考链就把额度吃光 → finish_reason:'length'
       → 正文 0 字。默认给到 8192。 */
    const { onThink, onToken, maxTokens = 8192 } = handlers;

    if (this.mode === 'live') {
      let res;
      try {
        res = await Net.fetchLive({ messages, stream: true, max_tokens: maxTokens });
      } catch (e) {
        if (e.code === 'NETWORK' || e.code === 'NO_ENDPOINT' || e.code === 'NO_KEY') {
          /* 没配 Key 是预期内的常态（静默回退），真断网才提示 */
          Net.fallbackToDemo(e.message, e.code === 'NO_KEY');
          document.dispatchEvent(new CustomEvent('miansu:chat-fallback', { detail: { reason: e.message } }));
          return this.chat(messages, handlers);  // 自动用 DEMO 重试一次，不再骚扰用户
        }
        throw new Error('AI 代理错误：' + e.message);
      }
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`代理返回 ${res.status}${text ? ': ' + text.slice(0, 200) : ''}`);
      }
      const reader = res.body.getReader(); const dec = new TextDecoder();
      let buf = '';
      let text = '', think = '', truncated = false;
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        // 兼容 CRLF / LF 两种行尾；清掉残留 \r，防止下一轮 'data: ' 前缀匹配失败
        const lines = buf.split(/\r?\n/); buf = lines.pop();
        for (let line of lines) {
          line = line.trim();
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (payload === '[DONE]') return { text, think, truncated, mode: 'live' };
          /* 只有 JSON 解析放进 try：渲染回调（onToken/onThink）的异常必须外泄。
             以前把回调包进 try/catch，一旦 md() 抛错，每个 chunk 都被静默吞掉，
             表现为「弹窗提示生成成功，页面却一片空白」。 */
          let ch;
          try { ch = JSON.parse(payload).choices?.[0] || {}; } catch (e) { continue; }
          if (ch.finish_reason === 'length') truncated = true;
          const delta = ch.delta || {};
          if (delta.reasoning_content) { think += delta.reasoning_content; onThink?.(delta.reasoning_content); }
          if (delta.content) { text += delta.content; onToken?.(delta.content); }
        }
      }
      return { text, think, truncated, mode: 'live' };
    }

    /* ── DEMO 占位：结构化示例语料 + 打字机，保证流程可完整演示 ── */
    const last = [...messages].reverse().find(m => m.role === 'user')?.content || '';
    const think = `【占位 · 未接入真实模型】\n已接收用户消息 ${last.length} 字。\n真实接入后此处为 DeepSeek reasoning_content 流式思考链。\n当前按场景返回结构化示例语料，用于验证 UI 渲染与交互链路。`;
    for (const ch of think) { onThink?.(ch); await sleep(4); }

    const body = this._demoBody(messages, last);
    for (const ch of body) { onToken?.(ch); await sleep(8); }
    return { text: body, think, truncated: false, mode: 'demo' };
  },

  _demoBody(messages, userMsg) {
    const sys = messages.find(m => m.role === 'system')?.content || '';
    if (sys.includes('求职策略顾问'))
      return `## 诊断结论\n\n> 以下内容为**占位示例**，用于验证排版。接入模型后将基于你的真实漏斗数据生成。\n\n**最大流失环节：投递 → 笔试（示例）**\n\n1. **优先级 P0 · 简历版本拆分**\n   当前 6 家使用 3 个简历版本，无法定位哪版更有效。建议固定一版投放 10 家后再做对照。\n\n2. **优先级 P1 · 补 RAG 评估口径**\n   面试中反复被追问评估指标，说明项目描述里缺少量化结论。\n\n3. **优先级 P2 · 建立投递节奏**\n   7 月投递集中在中旬，建议每周固定 5 家，便于观察转化周期。\n\n---\n\n*本段为 UI 占位文本，不代表真实诊断。*`;

    if (sys.includes('面试'))
      return `## 一、亮点\n- 能主动拆解 RAG 链路并指出召回瓶颈\n- 项目细节扎实，被追问三次未露怯\n\n## 二、知识盲区\n- 评估指标只答出准确率，未覆盖召回收敛与人工抽检\n- 对 Agent 工具调用失败兜底缺少设计\n\n## 三、改进建议\n- 准备一套「指标—业务目标」映射话术\n- 补一个工具调用失败降级的案例\n\n## 四、下一步\n- 24 小时内整理本题标准答案\n- 复习召回优化三种手段并各配一个例子`;

    return `【占位示例输出】\n\n此处为模型返回内容占位。真实接入后将基于以下输入生成：\n\n${userMsg.slice(0, 120)}${userMsg.length > 120 ? '…' : ''}\n\n---\n*DEMO 模式 · 未调用真实模型*`;
  },

  /* 判定匿名说话人角色：给定每个「说话人N」标签及其代表性发言，让模型判断是「我」还是「面试官」 */
  /* 判定匿名说话人（说话人1/2…）谁是面试官、谁是我。
     依据是语义而非序号奇偶：提问方=面试官，回答方=我。 */
  async identifySpeakers(samples) {
    if (this.mode !== 'live') throw new Error('AI 识别说话人需 LIVE 模式（设置页开启真实模型）');
    const sys = [
      '你是面试逐字稿的说话人判别器。',
      '输入会给出若干匿名说话人标签（如「说话人1」「说话人2」）以及每个人的多条发言。',
      '请判断每个标签是「我」（候选人/求职者）还是「面试官」。',
      '判定依据：',
      '· 提问、追问、介绍公司与团队、施加压力、评价对方回答的一方 → 面试官',
      '· 自我介绍、回答提问、陈述项目经历与个人成果、向公司反问的一方 → 我',
      '必须依据发言内容判断，不要按标签序号猜测。',
      '正常面试只有两方：一位面试官、一位我，因此多个标签必须判为不同角色，不能同为面试官也不能同为我；若两人内容可区分，须分别判为不同角色。',
      '返回严格的 JSON 对象，键必须与给定标签完全一致（如 "说话人1"），值为 "我" 或 "面试官"，不要输出任何解释文字。',
      '示例：{"说话人1":"面试官","说话人2":"我"}'
    ].join('\n');
    // 每个说话人取前 5 条、每条最多 160 字，给足判据（之前只给 1 条太单薄）
    const user = samples.map(s => `【${s.label}】\n${s.text}`).join('\n\n');
    let res;
    try {
      res = await Net.fetchLive({
        messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
        stream: false,
        max_tokens: 4096          // 推理模型要留出思考链的空间，否则 JSON 被截断 → 解析失败
      });
    } catch (e) {
      if (e.code === 'NETWORK' || e.code === 'NO_ENDPOINT' || e.code === 'NO_KEY') {
        Net.fallbackToDemo(e.message, e.code === 'NO_KEY');
        document.dispatchEvent(new CustomEvent('miansu:chat-fallback', { detail: { reason: e.message, from: 'identify' } }));
        throw new Error(
          e.code === 'NO_KEY'
            ? 'AI 尚未开通：服务端没有配置共用 Key。请在「设置」页填入你自己的 DeepSeek Key 后重试。'
            : 'AI 代理连接失败，已自动切回 DEMO。可在上方手动指定角色，或到「设置」检查代理状态后再试'
        );
      }
      throw e;
    }
    if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error(`代理返回 ${res.status}${t ? ': ' + t.slice(0, 160) : ''}`); }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    const m = content.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('AI 未返回可解析的说话人映射');
    const raw = JSON.parse(m[0]);
    // 按传入标签逐一匹配 AI 回值（容忍「说话人一」/「Speaker 1」等写法），判不出则跳过，交用户手动
    const table = {};
    for (const s0 of samples) {
      let val = null;
      for (const k in raw) { if (normSpeakerKey(k) === normSpeakerKey(s0.label)) { val = raw[k]; break; } }
      const v = String(val ?? '').trim();
      if (/面试|interviewer|\bhr\b/i.test(v)) table[s0.label] = '面试官';
      else if (/我|候选|应聘|interviewee|candidate/i.test(v)) table[s0.label] = '我';
    }
    return table;
  },

  /* 流式渲染器 */
  makeRenderer(box) {
    let raw = '';
    return {
      push(c) { raw += c; box.innerHTML = md(raw) + '<span class="caret"></span>'; },
      done() { box.innerHTML = md(raw); }
    };
  }
};

/* ══════════════════════════════════════════
   ASR 客户端 —— 浏览器端 transformers.js 加载本地 Whisper（Xenova/whisper-base）
   转写全程在用户浏览器本地完成，不调用任何云端 API、不消耗 DeepSeek Key。
   首次需下载约 40MB 模型权重（已配置国内 HuggingFace 镜像 hf-mirror.com 规避直连不稳定）。
   ══════════════════════════════════════════ */
/* 可选模型：中文精度 whisper-small 明显优于 base/tiny（后者中文易产生幻觉，
   出现"与录音内容不符"的文本）。权衡是体积与速度，故开放给用户自选。 */
const ASR_MODELS = {
  small: { id: 'Xenova/whisper-small', label: 'whisper-small', size: '~250MB', note: '中文最准 · 首次下载较慢' },
  base:  { id: 'Xenova/whisper-base',  label: 'whisper-base',  size: '~80MB',  note: '较快 · 中文一般' },
  tiny:  { id: 'Xenova/whisper-tiny',  label: 'whisper-tiny',  size: '~40MB',  note: '最快 · 中文较差' }
};

const ASR = {
  _pipe: null,
  _modelKey: null,
  async _load(modelKey = 'small', onProgress = () => {}) {
    if (this._pipe && this._modelKey === modelKey) return;
    this._pipe = null;                       // 切换模型时释放旧 pipeline
    onProgress(3);
    const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1');
    env.allowLocalModels = false;
    env.hub.url = 'https://hf-mirror.com';   // 国内镜像拉取模型权重
    onProgress(10);
    this._pipe = await pipeline('automatic-speech-recognition', ASR_MODELS[modelKey].id, {
      progress_callback: (p) => {
        if (p.status === 'progress' && p.total) {
          onProgress(10 + Math.round((p.loaded / p.total) * 82));
        }
      }
    });
    this._modelKey = modelKey;
    onProgress(94);
  },
  async transcribe(file, onProgress = () => {}, modelKey = 'small') {
    await this._load(modelKey, onProgress);
    onProgress(95);
    const audio = await readAudio(file);
    const out = await this._pipe(
      { audio, sampling_rate: 16000 },
      { chunk_length_s: 30, stride_length_s: 5, language: 'chinese', task: 'transcribe' }
    );
    onProgress(100);
    return parseTranscript(stripHallucination(out.text));
  }
};

/* Whisper 在静音/噪音段常输出循环重复或与音频无关的固定套话（幻觉）。
   这里做一层轻量清洗：剔除高频重复片段、以及 Whisper 常见的版权/字幕套话。 */
function stripHallucination(text) {
  let s = (text || '').trim();
  if (!s) return '';
  // 1) 去掉 Whisper 常见幻觉套话
  s = s.replace(/(字幕|翻譯|翻译)?(?:由|提供)[^。\n]{0,20}(?:字幕组|志愿者|社群|社区)[^。\n]{0,20}。?/g, '')
       .replace(/请(?:您)?(?:点赞|订阅|关注)(?:我的)?(?:频道|视频|公众号)[^。\n]{0,10}。?/g, '')
       .replace(/\b(BBC|Amara\.org|Subtitles? by)\b[^\n。]{0,30}。?/gi, '');
  // 2) 折叠连续重复句（同一句出现 3 次以上只留一次）
  const parts = s.split(/(?<=[。！？!?])/).map(x => x.trim()).filter(Boolean);
  const seen = new Map(), kept = [];
  for (const p of parts) {
    const n = (seen.get(p) || 0) + 1;
    seen.set(p, n);
    if (n <= 2) kept.push(p);
  }
  return (kept.length ? kept.join('') : s).trim();
}

// 解码音频文件并重采样为 16kHz 单声道（Whisper 输入要求）
async function readAudio(file) {
  const arr = await file.arrayBuffer();
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  const decoded = await ctx.decodeAudioData(arr.slice(0));
  const len = Math.max(1, Math.ceil(decoded.duration * 16000));
  const offline = new OfflineAudioContext(1, len, 16000);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start();
  const rendered = await offline.startRendering();
  return rendered.getChannelData(0);
}

/* ══════════════════════════════════════════
   粘贴逐字稿解析器
   兼容手机录音 App / 讯飞 / 飞书妙记等常见导出版式：
     面试官：你好          [面试官] 你好        （面试官）你好
     00:00:12  我：你好    [00:03] 面试官: 你好   - 面试官：你好
   策略：只认「已知说话人别名」+「方/圆括号包裹的标签」，避免把普通冒号句误判成说话人。
   未识别到任何说话人标记时，全部归入「我」，用户可在逐字稿区点击标签手动切换。
   ══════════════════════════════════════════ */
const WHO_ALIAS = {
  '面试官': '面试官', '面试管': '面试官', 'interviewer': '面试官', 'hr': '面试官',
  '考官': '面试官', '提问': '面试官', '问': '面试官', '面': '面试官', '官方': '面试官',
  '我': '我', 'me': '我', 'candidate': '我', '候选人': '我', '应聘者': '我',
  '回答': '我', '答': '我', '自己': '我', '本人': '我', 'interviewee': '我'
};

function parseTranscriptText(raw) {
  // 行首时间戳：00:03 / 00:00:28 / [00:12] / (00:05) / - 00:03 等
  const TS_LEAD = /^\s*(?:[-*•]\s*)?(?:\[\s*)?\(?\s*\d{1,2}:\d{2}(?::\d{2})?\s*\)?(?:\s*\])?[\s.\-–—]*/;
  // 括号标签：方/圆/中文方头/直角/书名号/角括号，如 [面试官] (HR) 【说话人1】
  const B_OPEN  = '[\\(\\[\\u3010\\u300c\\u300e\\uff3b\\u3008\\u300a<]';
  const B_CLOSE = '[\\)\\]\\u3011\\u300d\\u300f\\uff3d\\u3009\\u300b>]';
  // 已知别名 / 括号标签 / 带冒号的陌生标签 —— m[1]=括号内标签，m[2]=冒号前标签
  const HEAD = new RegExp(
    `^\\s*(?:[-*•]\\s*)?(?:${B_OPEN}\\s*([^:：\\n]{1,12}?)\\s*${B_CLOSE}|([^\\s:：\\n]{1,8})\\s*[:：])\\s*`
  );
  // 匿名说话人标签（可无冒号）：「说话人1 00:00:28 你好吗」「Speaker 1 hello」
  const SPK_LABEL = /^\s*(?:说话人|发言者|发言人|speaker|spk)\s*([0-9]+|[一二三四五六七八九十]+)/i;
  const CN_NUM = { '一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10 };
  const normN = n => /^[0-9]+$/.test(n) ? parseInt(n, 10) : (CN_NUM[n] || 1);

  // 别名按长度倒序，保证「面试官」优先于「面」
  const ALIAS_KEYS = Object.keys(WHO_ALIAS).sort((a, b) => b.length - a.length);
  // 某些 App 把标签单独放一行（如「说话人1 00:00:28」之后换行才是文本）。
  // 先把这类「标签独占一行」识别出来，避免把后续文本全算到「我」。
  const ALIAS_ONLY = new RegExp(`^\\s*(?:[-*•]\\s*)?(?:${ALIAS_KEYS.join('|')})\\s*$`, 'i');
  // 别名 + 空白/冒号（后常跟时间戳，无冒号）：「面试官 00:00:28 你好」「我 00:01:02 我觉得…」
  const ALIAS_LEAD = new RegExp(`^\\s*(?:[-*•]\\s*)?(${ALIAS_KEYS.join('|')})(?=\\s|$|[:：])`, 'i');

  function trySpeaker(s) {
    // 1) 括号标签 / 带冒号的已知标签
    const m = s.match(HEAD);
    if (m) {
      const tag = (m[1] || m[2] || '').trim();
      const hit = WHO_ALIAS[tag] || WHO_ALIAS[tag.toLowerCase()];
      if (hit) return { who: hit, text: s.slice(m[0].length).trim() };

      // 匿名标签：说话人1 / 说话人一 / Speaker 1（冒号或括号均可）
      const spk = tag.match(/^(?:说话人|发言者|发言人|speaker|spk)\s*([0-9]+|[一二三四五六七八九十]+)$/i);
      if (spk) return { who: `说话人${normN(spk[1])}`, text: s.slice(m[0].length).trim() };

      // 括号里的陌生标签（如 [张三]）：沿用原设计，括号具有明确标签语义
      if (m[1]) {
        const t = tag.replace(/[（(]/g, '(').replace(/[）)]/g, ')');
        if (t) return { who: t, text: s.slice(m[0].length).trim() };
      }
    }
    // 2) 匿名标签无冒号
    const sm = s.match(SPK_LABEL);
    if (sm) return { who: `说话人${normN(sm[1])}`, text: s.slice(sm[0].length).trim() };
    // 3) 别名开头（后接空白或冒号，常跟时间戳）
    const am = s.match(ALIAS_LEAD);
    if (am) {
      const hit = WHO_ALIAS[am[1]] || WHO_ALIAS[am[1].toLowerCase()];
      if (hit) return { who: hit, text: s.slice(am[0].length).trim() };
    }
    // 4) 单独一行的别名（如「面试官」「我」独占一行）
    if (ALIAS_ONLY.test(s)) {
      const tag = s.replace(/^\s*(?:[-*•]\s*)?/, '').trim();
      const hit = WHO_ALIAS[tag] || WHO_ALIAS[tag.toLowerCase()];
      if (hit) return { who: hit, text: '' };
    }
    return null;
  }

  const out = [];
  let cur = '我';
  const lines = (raw || '').replace(/\r\n?/g, '\n').split('\n');

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;

    // 剥掉行首装饰（时间戳 / 列表符）
    let s = line.replace(TS_LEAD, '').trim();
    if (!s) continue;
    s = s.replace(/^\s*[-*•]\s*/, '').trim();

    const ex = trySpeaker(s);
    let who = null, text = '';
    if (ex) {
      who = ex.who;
      text = ex.text.replace(TS_LEAD, '').trim(); // 去掉标签后紧跟的时间戳
      // 标签独占一行且没有同文本 → 把后续非空行归到该说话人，直到遇到下一个标签
      if (!text) {
        const buf = [];
        while (i + 1 < lines.length) {
          const next = lines[i + 1].trim();
          if (!next) { i++; continue; }
          const ns = next.replace(TS_LEAD, '').trim().replace(/^\s*[-*•]\s*/, '').trim();
          if (trySpeaker(ns)) break;
          buf.push(next.replace(TS_LEAD, '').trim().replace(/^\s*[-*•]\s*/, '').trim());
          i++;
        }
        text = buf.join(' ').trim();
      }
    } else {
      text = s;
    }

    if (!text) continue;
    cur = who || cur;

    // 超长行按句末标点切分，避免一整段糊在一起
    const parts = text.length > 60
      ? text.split(/(?<=[。！？!?；;])/).map(x => x.trim()).filter(Boolean)
      : [text];
    for (const t of parts) out.push({ who: cur, text: t });
  }
  return out;
}

/* 无说话人标签的纯文本（最常见场景：从备忘录/笔记直接复制的面试记录）。
   直接整段丢给「我」会让 AI 总结全归因自己，是错误的。
   退而求其次：按自然段落（空行）切分为「轮次」，交替指派 面试官/我（面试通常由面试官开场）。
   角色可能偶判反，但结构对了，用户点气泡即可校正——比「全是我」有用得多。 */
function autoSplitUnlabeled(raw) {
  const blocks = (raw || '').replace(/\r\n?/g, '\n').split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  if (!blocks.length) return [];
  let turns = blocks;
  // 没有空行分段：退回按句号切分，每两句并为一轮
  if (turns.length === 1) {
    const sents = blocks[0].split(/(?<=[。！？!?；;])/).map(s => s.trim()).filter(Boolean);
    turns = [];
    for (let i = 0; i < sents.length; i += 2) turns.push(sents.slice(i, i + 2).join(''));
  }
  const out = [];
  turns.forEach((t, i) => {
    const who = i % 2 === 0 ? '面试官' : '我';
    const parts = t.length > 60 ? t.split(/(?<=[。！？!?；;])/).map(x => x.trim()).filter(Boolean) : [t];
    parts.forEach(p => out.push({ who, text: p }));
  });
  return out;
}

// Whisper 不区分说话人：按标点切句，统一标记「我」，用户可在界面手动校对改 who
function parseTranscript(text) {
  const clean = (text || '').trim();
  if (!clean) return [];
  return clean
    .split(/(?<=[。！？!?；;])/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(t => ({ who: '我', text: t }));
}

/* ══════ 极简 Markdown 渲染（够用即可） ══════ */
function md(src) {
  return esc(src)
    .replace(/^### (.*)$/gm, '<h3 style="font-size:15px;font-weight:800;margin:16px 0 7px">$1</h3>')
    .replace(/^## (.*)$/gm, '<h2 style="font-size:17px;font-weight:800;margin:18px 0 8px">$1</h2>')
    .replace(/^&gt; (.*)$/gm, '<blockquote style="margin:10px 0;padding:9px 15px;border-left:3px solid var(--accent);background:var(--accent-soft);border-radius:0 10px 10px 0;color:var(--tx2)">$1</blockquote>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--tx);font-weight:700">$1</strong>')
    .replace(/^\d+\. /gm, '<br>$&')
    .replace(/^- /gm, '&nbsp;&nbsp;• ')
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid var(--line);margin:16px 0">')
    .replace(/\n/g, '<br>');
}

/* ══════ 导航统一注入 ══════ */
const NAV = [
  { key: 'index',    href: 'index.html',    label: '首页' },
  { key: 'records',  href: 'records.html',  label: '面试记录' },
  { key: 'detail',   href: 'detail.html',   label: '录音转写' },
  { key: 'review',   href: 'review.html',   label: '面试复盘' },
  { key: 'resume',   href: 'resume.html',   label: '改简历' },
  { key: 'about',    href: 'about.html',    label: '关于项目' },
  { key: 'settings', href: 'settings.html', label: '设置' },
];

function renderNav(current) {
  /* v2.0.3：静态页导航已带完整控件（LIVE/主题/头像/汉堡/m-menu），
     这里只原地更新激活态与登录态，绝不重建整棵导航。
     原来的 replaceWith 重建是首屏"导航闪烁 + 菜单平移"的根源：
     静态残缺版 nav-right 只有 34px（1 个头像），JS 版 233px（5 控件），
     app.js 一下载完菜单就被推挤平移 99px；网络稍慢时肉眼可见。 */
  const live = document.querySelector('nav.navbar');
  if (live) {
    live.querySelectorAll('.menu a, .m-menu a').forEach(a => {
      const key = (a.getAttribute('href') || '').replace('.html', '') || 'index';
      const on = key === current;
      a.classList.toggle('on', on);
      if (a.parentElement && a.parentElement.classList.contains('m-menu')) {
        a.style.fontWeight = on ? '700' : '500';
        a.style.color = on ? 'var(--tx)' : 'var(--nav-tx)';
      }
    });
    /* 登录态头像（静态页只能预置未登录态） */
    const isIn = (typeof Store !== 'undefined' && Store.account) ? Store.account.isIn : false;
    const accName = (typeof Store !== 'undefined' && Store.account) ? Store.account.name : '';
    const av = live.querySelector('.avatar-btn');
    if (av) {
      av.classList.toggle('on', isIn);
      av.title = isIn ? esc(accName) + ' · 个人中心' : '登录 / 个人中心';
      if (isIn && accName) av.textContent = accName.slice(0, 1).toUpperCase();
      else av.innerHTML = '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    }
    return;
  }

  /* 兜底：页面上没有导航时才构建（正常不会走到） */
  const host = $('[data-nav]');
  if (!host) return;
  const dark = document.documentElement.getAttribute('data-theme') !== 'light';
  const safeMode = (typeof LLM !== 'undefined' && LLM.mode) ? LLM.mode : 'demo';
  const isIn = (typeof Store !== 'undefined' && Store.account) ? Store.account.isIn : false;
  const accName = (typeof Store !== 'undefined' && Store.account) ? Store.account.name : '';
  const html = `
  <nav class="navbar">
    <div class="nav-in">
      <a class="brand" href="index.html">
        <div class="logo serif">溯</div>
        <div>
          <div class="brand-name serif">面溯</div>
          <span class="brand-sub">INTERVIEW REVIEW</span>
        </div>
      </a>
      <div class="menu">
        ${NAV.map(n => `<a href="${n.href}"${n.key === current ? ' class="on"' : ''}>${n.label}</a>`).join('')}
      </div>
      <div class="nav-right">
        <button class="icon-btn" data-theme-toggle title="切换深浅主题">
          <svg data-icon-moon width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="display:${dark ? 'none' : 'block'}"><path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
          <svg data-icon-sun width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="display:${dark ? 'block' : 'none'}"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
        </button>
        <a class="btn btn-on-bg btn-sm btn-main-hide" href="settings.html">配置 Key</a>
        <a class="avatar-btn${isIn ? ' on' : ''}" href="profile.html"
           title="${isIn ? esc(accName) + ' · 个人中心' : '登录 / 个人中心'}">
          ${isIn ? esc(accName.slice(0, 1).toUpperCase())
            : `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`}
        </a>
        <button class="burger" data-burger><span></span><span></span><span></span></button>
      </div>
    </div>
    <div class="m-menu" data-mobile-menu style="display:none;flex-direction:column;padding:10px 20px 18px;border-top:1px solid var(--line)">
      ${NAV.map(n => `<a href="${n.href}" style="padding:11px 4px;font-size:15px;font-weight:${n.key === current ? '700' : '500'};color:${n.key === current ? 'var(--tx)' : 'var(--nav-tx)'}">${n.label}</a>`).join('')}
    </div>
  </nav>`;
  /* 用 replaceWith 而非 outerHTML —— 更稳健，避免旧 host 引用与新 DOM 错位 */
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  host.replaceWith(wrap.firstElementChild);
}

/* ══════ 主题切换 ══════ */
(function themeInit() {
  const KEY = 'miansu-theme';
  const saved = localStorage.getItem(KEY);
  if (saved) document.documentElement.setAttribute('data-theme', saved);

  /* v2.0.3：初始同步日/月图标（静态导航的图标写死为默认深色主题态，
     若用户存了 light 主题，首帧图标会错，这里在首帧前纠正） */
  const syncThemeIcons = () => {
    const cur = document.documentElement.getAttribute('data-theme') !== 'light';
    document.querySelectorAll('[data-icon-moon]').forEach(el => el.style.display = cur ? 'none' : 'block');
    document.querySelectorAll('[data-icon-sun]').forEach(el => el.style.display = cur ? 'block' : 'none');
  };
  syncThemeIcons();

  document.addEventListener('click', e => {
    if (!e.target.closest('[data-theme-toggle]')) return;
    /* 默认(深蓝紫底) ⇄ light(浅蓝底) */
    const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(KEY, next);
    syncThemeIcons();
  });
})();

/* ══════ 移动端菜单 ══════ */
document.addEventListener('click', e => {
  if (!e.target.closest('[data-burger]')) return;
  const m = $('[data-mobile-menu]');
  if (m) m.style.display = m.style.display === 'flex' ? 'none' : 'flex';
});

/* ══════ 滚动入场动画 ══════ */
const io = new IntersectionObserver(en => {
  en.forEach(x => { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } });
}, { threshold: .1 });
function bindReveal() { $$('.fade').forEach(el => io.observe(el)); }

/* ══════ 数据迁移 ══════
   v1 示例数据没有 interviewAt / place 字段，会让首页时间轴空白。
   仅当现有数据仍是未改动的示例（6 条且含星澜科技）时自动重建，
   用户自己录入的记录一律保留、只补字段。 */
(function migrate() {
  if (localStorage.getItem(NS + 'seedVer') === '2') return;
  const jobs = Store._read('jobs', null);
  const untouchedSeed = jobs && jobs.length === 6
    && jobs.some(j => j.company === '星澜科技')
    && !jobs.some(j => 'interviewAt' in j);

  if (!jobs || !jobs.length || untouchedSeed) {
    Store.jobs.seed();
  } else {
    Store._write('jobs', jobs.map(Store.jobs.normalize));
  }
  localStorage.setItem(NS + 'seedVer', '2');
})();

/* ════════════════════════════════════════════════
   v2.0 追问式复盘 Agent（三阶段：探针 → 追问 → 收敛）
   - 纯数据层，不碰 DOM；UI 编排在 review.html
   - 调用链：Net.fetchLive 直连代理。不用 LLM.chat 的原因：它不转发
     temperature，而五层降级的第 1 层必须把 temperature 真正传给模型
   - 五层降级：JSON 约束 → extractJSON → schema 校验 → 自动重试 1 次
     → 备用数据兜底，任何一层失败都不白屏
   - 每次调用写 miansu:agentlog（≤50 条）；token 为估算值
     （中英混排约 2 字符 ≈ 1 token）
   ════════════════════════════════════════════════ */
const Agent = {
  /* 8 个 AI 目标字段（与 review.html 的 data-f 一一对应） */
  FIELDS: ['point', 'strength', 'gap', 'better', 'knowledge', 'expression', 'next', 'wrongbook'],
  TARGETS: ['knowledge', 'gap', 'point', 'better'],

  /* 模板插值：用 split/join 而不是 replace，避免 transcript 里的 $ 符号被误当替换模式 */
  fill(tpl, vars) {
    return Object.entries(vars).reduce((s, [k, v]) => s.split(`{${k}}`).join(String(v)), tpl);
  },

  /* P4 · 探针（交接包 §5 原样） */
  P4: `你是面试复盘专家。阅读面试逐字稿，找出候选人「说得含糊、明显答漏、或经不起追问」的地方，向他提问，帮他挖出真正的知识漏洞。

要求：
1. 输出 3 个问题，按价值从高到低排序。
2. 每个问题的 quote 必须是逐字稿中真实出现过的原句，一字不改；找不到原句就不要问这条。
3. question 要具体到能逼出细节，禁止「能再说说吗」这类空问法。
4. target 只能是 knowledge / gap / point / better 之一。
5. draft 里 8 个字段全部输出，没把握的留空串，不要编。
6. 只输出 JSON，不要 markdown 代码块，不要任何解释性文字。
7. 必须输出一个 JSON 对象，禁止输出数组，也禁止再包一层其它结构。
8. draft 的键必须使用英文 point / strength / gap / better / knowledge / expression / next / wrongbook，禁止使用任何中文键名，也不得增删键。

顶层结构必须严格如下：
{"probes":[{"id":"p1","quote":"...","question":"...","target":"knowledge"}],"draft":{"point":"","strength":"","gap":"","better":"","knowledge":"","expression":"","next":"","wrongbook":""}}

逐字稿：
{transcript}

我卡壳的问题：
{stuck}`,

  /* P5 · 收敛（交接包 §5 原样） */
  P5: `你是面试复盘专家。根据逐字稿与候选人对你追问的回答，产出一份结构化复盘。

要求：
1. 输出 8 个字段的 JSON：point / strength / gap / better / knowledge / expression / next / wrongbook。
2. 每个字段 2-3 条，具体、可行动，禁止「需要加强学习」这类空话。
3. better 要真的重写一版答案，不是评价原答案。
4. wrongbook 输出可直接复习的知识点清单，每条一句话。
5. 只输出 JSON，不要 markdown 代码块，不要任何解释性文字。
6. 必须输出一个 JSON 对象，禁止输出数组，也禁止再包一层其它结构。
7. 键必须使用英文 point / strength / gap / better / knowledge / expression / next / wrongbook，禁止使用任何中文键名，也不得增删键。

顶层结构必须严格如下：
{"point":"","strength":"","gap":"","better":"","knowledge":"","expression":"","next":"","wrongbook":""}

逐字稿：
{transcript}

追问与回答：
{qa}`,

  /* P4b · 换一个问题（单条重新生成，与探针同温 0.7 保多样性） */
  P4b: `你是面试复盘专家。针对下面这个追问目标，生成 1 个新的追问。

要求：
1. 只输出 1 个 JSON 对象：{"question":"…","quote":"…","target":"…"}。
2. quote 必须是逐字稿中真实出现过的原句，一字不改；找不到原句就不要输出这条。
3. question 要具体到能逼出细节，禁止「能再说说吗」这类空问法。
4. target 只能是 knowledge / gap / point / better 之一。
5. 不要与「已有的追问」重复。
6. 只输出 JSON，不要 markdown 代码块，不要任何解释性文字。
7. 必须输出一个 JSON 对象，禁止输出数组，也禁止再包一层其它结构。
8. 键必须使用英文 question / quote / target，禁止使用任何中文键名，也不得增删键。

顶层结构必须严格如下：
{"question":"","quote":"","target":"knowledge"}

已有的追问：
{existing}

逐字稿：
{transcript}

我卡壳的问题：
{stuck}`,

  /* ── 层 2：JSON 提取（先取 ```json 代码块，失败则取首个 { 到最后一个 }，再 parse）── */
  extractJSON(s) {
    const src = String(s || '');
    const block = src.match(/```(?:json)?\s*([\s\S]*?)```/);
    const body = block ? block[1] : src.slice(src.indexOf('{'), src.lastIndexOf('}') + 1);
    try { return JSON.parse(body); } catch { return null; }
  },

  /* ── 层 3：schema 校验（探针）──
     probes 数组 ≤3 条、target 合法、quote 必须在逐字稿中真实出现（去空格子串匹配，
     防止 AI 编造）。命中失败的条目丢弃（dropped 计数），一条不剩则整体判无效。
     id 重新按序归一为 p1..pN，保证 answers 键稳定。 */
  validateProbe(data, transcript) {
    if (!data || typeof data !== 'object' || !Array.isArray(data.probes)) return null;
    const tNorm = String(transcript || '').replace(/\s+/g, '');
    const kept = [];
    let seen = 0;
    for (const p of data.probes) {
      if (!p || typeof p !== 'object') continue;
      seen++;
      const quote = String(p.quote || '').trim();
      const question = String(p.question || '').trim();
      const target = String(p.target || '').trim();
      if (!quote || !question) continue;
      if (!Agent.TARGETS.includes(target)) continue;
      if (tNorm && !tNorm.includes(quote.replace(/\s+/g, ''))) continue;
      kept.push({ id: 'p' + (kept.length + 1), quote, question, target });
      if (kept.length >= 3) break;
    }
    if (!kept.length) return null;
    const draft = {};
    Agent.FIELDS.forEach(k => {
      draft[k] = (data.draft && typeof data.draft[k] === 'string') ? data.draft[k].trim() : '';
    });
    return { probes: kept, draft, dropped: Math.max(0, seen - kept.length) };
  },

  /* ── 层 3：schema 校验（收敛）：8 字段对象，全空视为无效 ── */
  validateReview(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    const review = {};
    let n = 0;
    Agent.FIELDS.forEach(k => {
      const v = typeof data[k] === 'string' ? data[k].trim() : '';
      review[k] = v;
      if (v) n++;
    });
    return n ? review : null;
  },

  /* ── 层 3：schema 校验（换一个问题）：单条 {question, quote, target} ── */
  validateSwap(data, transcript) {
    if (!data || typeof data !== 'object') return null;
    const quote = String(data.quote || '').trim();
    const question = String(data.question || '').trim();
    const target = String(data.target || '').trim();
    if (!quote || !question || !Agent.TARGETS.includes(target)) return null;
    const tNorm = String(transcript || '').replace(/\s+/g, '');
    if (tNorm && !tNorm.includes(quote.replace(/\s+/g, ''))) return null;
    return { quote, question, target };
  },

  /* ── 上下文管理：逐字稿截断到 max 字，超长取头部+尾部各一半 ── */
  truncate(text, max = 8000) {
    const s = String(text || '');
    if (s.length <= max) return s;
    const half = Math.floor(max / 2);
    return s.slice(0, half) + '\n……（中间内容过长，已省略）……\n' + s.slice(-half);
  },

  /* ── 问答摘要：每轮压到 150 字内；超过 6 轮时更早的轮次压缩成一段 ── */
  summarizeQA(qa) {
    const list = (qa || []).filter(x => x && x.question);
    if (!list.length) return '（无追问回答）';
    const cap = (s, n) => String(s || '').trim().slice(0, n);
    const rows = list.map((x, i) => `${i + 1}. 问：${cap(x.question, 150)}\n   答：${cap(x.answer || '（跳过）', 150)}`);
    if (rows.length <= 6) return rows.join('\n');
    const early = list.slice(0, -6)
      .map((x, i) => `${i + 1}. 问：${cap(x.question, 60)} 答：${cap(x.answer || '（跳过）', 60)}`)
      .join('；');
    return `更早的追问摘要：${early}\n\n${rows.slice(-6).join('\n')}`;
  },

  /* ── 单次流式调用：直连 Net.fetchLive，temperature 直达 DeepSeek ──
     response_format 也一并带上：当前代理层（functions/ai.js，禁止改动）只透传
     temperature、不透传 response_format，五层降级不依赖它；代理升级后自动生效。
     超时放宽到 60s：推理模型吐思考链较慢，22s 默认值容易误杀。 */
  async jsonCall(messages, { temperature = 0.3, maxTokens = 8192 } = {}) {
    const res = await Net.fetchLive({
      messages,
      stream: true,
      max_tokens: maxTokens,
      temperature,
      response_format: { type: 'json_object' }
    }, { timeout: 60000 });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`代理返回 ${res.status}${t ? ': ' + t.slice(0, 160) : ''}`);
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '', raw = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split(/\r?\n/); buf = lines.pop();
      for (let line of lines) {
        line = line.trim();
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') return raw;
        let ch;
        try { ch = JSON.parse(payload).choices?.[0] || {}; } catch { continue; }
        const delta = ch.delta || {};
        if (delta.content) raw += delta.content;   // reasoning_content 不并入正文
      }
    }
    return raw;
  },

  /* ── 通用 JSON 请求：一次调用，校验失败自动重试 1 次（temperature 降到 0）── */
  async agentJSON(messages, validate, { temperature = 0.3, maxTokens = 8192 } = {}) {
    let raw = await Agent.jsonCall(messages, { temperature, maxTokens });
    let data = Agent.extractJSON(raw);
    if (!validate(data)) {
      raw = await Agent.jsonCall(
        [...messages, { role: 'user', content: '上一次输出不是合法 JSON，请只输出 JSON。' }],
        { temperature: 0, maxTokens }
      );
      data = Agent.extractJSON(raw);
    }
    return { raw, data, ok: !!validate(data) };
  },

  /* ── 可观测日志（token 为估算值）── */
  _log(jobId, stage, ok, err, t0, tokInSrc, rawOut = '') {
    const s = Store.settings.all();
    const est = t => Math.ceil((typeof t === 'string' ? t : JSON.stringify(t)).length / 2);
    Store.agentlog.add({
      ts: new Date().toISOString().replace('T', ' ').slice(0, 19),
      jobId, stage,
      model: (LLM.mode === 'live') ? (s.model || '') : 'demo',
      ms: Date.now() - t0,
      tokIn: est(tokInSrc), tokOut: est(rawOut),
      ok,
      err: String(err || '').slice(0, 120)
    });
  },
  _logDemo(jobId, stage, note) {
    Store.agentlog.add({
      ts: new Date().toISOString().replace('T', ' ').slice(0, 19),
      jobId, stage, model: 'demo', ms: 0, tokIn: 0, tokOut: 0, ok: true,
      err: String(note || '').slice(0, 120)
    });
  },

  /* live 时才发起调用；返回 { attempted, ok, data, raw, err }。
     网络失败沿用 Net.fallbackToDemo 自动切 DEMO 并弹黄条。 */
  async _attempt(messages, validate, { temperature }) {
    if (LLM.mode !== 'live') return { attempted: false, ok: false, data: null, raw: '', err: 'DEMO 模式' };
    let ok = false, data = null, raw = '', err = '';
    try {
      const r = await Agent.agentJSON(messages, validate, { temperature });
      raw = r.raw;
      if (r.ok) { ok = true; data = r.data; }
      else err = 'JSON 校验失败（已自动重试 1 次）';
    } catch (e) {
      if (e && (e.code === 'NETWORK' || e.code === 'NO_ENDPOINT' || e.code === 'NO_KEY')) {
        Net.fallbackToDemo(e.message, e.code === 'NO_KEY');
        err = e.code === 'NO_KEY' ? '未配置 Key' : '代理连接失败';
      } else {
        err = e.message || String(e);
      }
    }
    return { attempted: true, ok, data, raw, err };
  },

  /* ── DEMO 占位：从逐字稿真实句子构造 3 条追问 ──
     quote 直接截取原文（去空格后必是子串），保证「quote 能在逐字稿搜到」的自检
     在 DEMO 模式下也成立。逐字稿为空时退回用卡壳问题造句。 */
  demoProbe(transcript, stuck) {
    const src = String(String(transcript || '').trim() ? transcript : (stuck || '')).trim();
    const sents = src.split(/\n+/).map(s => s.trim()).filter(s => s.replace(/\s+/g, '').length >= 8);
    const picks = [];
    if (sents.length) {
      picks.push(sents[0], sents[Math.floor(sents.length / 2)], sents[sents.length - 1]);
      let i = 0;
      while (picks.length < 3 && i < sents.length) {
        const s = sents[i++];
        if (!picks.includes(s)) picks.push(s);
      }
    }
    const DEFS = [
      { target: 'knowledge', q: '这条回答背后的知识点，你能完整讲清楚吗？如果面试官再往下追问一层，你会怎么接？' },
      { target: 'gap', q: '现在回头看这句话，当时的回答缺了什么关键信息？' },
      { target: 'point', q: '你觉得面试官问这个，真正想考察的是什么能力？' }
    ];
    const probes = picks.slice(0, 3).map((s, i) => ({
      id: 'p' + (i + 1),
      quote: s,
      question: '（DEMO 示例追问）' + DEFS[i % 3].q,
      target: DEFS[i % 3].target
    }));
    const draft = {
      point: '（DEMO）本场主要考察项目细节与基础知识的衔接',
      strength: '（DEMO）能完整讲述项目链路，被追问未露怯',
      gap: stuck ? '（DEMO）卡壳点：' + String(stuck).split('\n')[0].slice(0, 50) : '（DEMO）部分追问缺少量化支撑',
      better: '（DEMO）建议按「结论—依据—例子」结构重述核心项目',
      knowledge: '（DEMO）把被追问的知识点整理成错题本卡片',
      expression: '（DEMO）结论前置，先说答案再展开',
      next: '（DEMO）24 小时内补全卡壳问题的标准答案',
      wrongbook: '（DEMO）待复习：本次所有被追问的知识点'
    };
    return { probes, draft, dropped: 0 };
  },

  /* ── DEMO 占位：换一个问题（挑一句还没被用过的原句）── */
  demoSwap(transcript, stuck, existing) {
    const used = String(existing || '');
    const src = String(String(transcript || '').trim() ? transcript : (stuck || '')).trim();
    const sents = src.split(/\n+/).map(s => s.trim()).filter(s => s.replace(/\s+/g, '').length >= 8);
    const quote = sents.find(s => !used.includes(s)) || sents[0] || '';
    if (!quote) return null;
    return {
      quote,
      question: '（DEMO 示例追问）换个角度：如果让你现在重新回答，你会怎么补充这一点？',
      target: 'gap'
    };
  },

  /* ── DEMO 占位：收敛（结合用户回答拼占位复盘，保证流程可完整演示）── */
  demoConverge(stuck, qa, draft) {
    const a1 = (qa && qa[0] && qa[0].answer) || '';
    const d = draft || {};
    return {
      point: d.point || '（DEMO）本场主要考察项目细节与基础知识的衔接',
      strength: d.strength || '（DEMO）能完整讲述项目链路，被追问未露怯',
      gap: d.gap || (stuck ? '（DEMO）卡壳点：' + String(stuck).split('\n')[0].slice(0, 50) : '（DEMO）部分追问缺少量化支撑'),
      better: d.better || '（DEMO）建议按「结论—依据—例子」结构重述核心项目',
      knowledge: d.knowledge || '（DEMO）把被追问的知识点整理成错题本卡片',
      expression: d.expression || (a1 ? '（DEMO）追问补充：' + a1.slice(0, 40) : '（DEMO）结论前置，先说答案再展开'),
      next: d.next || '（DEMO）24 小时内补全卡壳问题的标准答案',
      wrongbook: d.wrongbook || '（DEMO）待复习：本次所有被追问的知识点'
    };
  },

  /* ═══ 阶段一 · 探针：3 问 + draft。失败走 DEMO 占位，绝不抛错 ═══ */
  async runProbe({ jobId, transcript, stuck, filled = '' }) {
    const t0 = Date.now();
    const messages = [
      {
        role: 'system',
        content: Agent.fill(Agent.P4, {
          transcript: Agent.truncate(transcript, 8000),
          stuck: stuck || '（未填写）'
        })
      },
      { role: 'user', content: `已填写的字段（非空才列出，写 draft 时可参考）：\n${filled || '（暂无）'}` }
    ];
    const r = await Agent._attempt(messages, d => Agent.validateProbe(d, transcript), { temperature: 0.7 });
    if (r.ok) { Agent._log(jobId, 'probe', true, '', t0, messages); return { ...r.data, fallback: false, demo: false }; }
    if (r.attempted) Agent._log(jobId, 'probe', false, r.err, t0, messages);
    /* 层 5 兜底：用逐字稿真实句子构造占位追问，流程永不白屏 */
    Agent._logDemo(jobId, 'probe', r.attempted ? '降级 DEMO 占位数据' : 'DEMO 模式');
    return { ...Agent.demoProbe(transcript, stuck), fallback: true, demo: true };
  },

  /* ═══ 阶段二 · 换一个问题（单条重新生成）═══ */
  async swapProbe({ jobId, transcript, stuck, existing = '' }) {
    const t0 = Date.now();
    const messages = [
      {
        role: 'system',
        content: Agent.fill(Agent.P4b, {
          existing: existing || '（无）',
          transcript: Agent.truncate(transcript, 6000),
          stuck: stuck || '（未填写）'
        })
      },
      { role: 'user', content: '请输出 1 个新的追问 JSON。' }
    ];
    const r = await Agent._attempt(messages, d => Agent.validateSwap(d, transcript), { temperature: 0.7 });
    if (r.ok) { Agent._log(jobId, 'thread', true, '', t0, messages); return { probe: r.data, fallback: false, demo: false }; }
    if (r.attempted) Agent._log(jobId, 'thread', false, r.err, t0, messages);
    Agent._logDemo(jobId, 'thread', r.attempted ? '降级 DEMO 占位数据' : 'DEMO 模式');
    return { probe: Agent.demoSwap(transcript, stuck, existing), fallback: true, demo: true };
  },

  /* ═══ 阶段三 · 收敛：结合问答重写 8 字段 ═══
     失败降级：live 拿回过正文 → 走 mapSections 正则解析（解析到几个算几个）；
     网络失败或 DEMO → 走占位收敛。两种情况都不抛错。 */
  async runConverge({ jobId, transcript, stuck, qa, draft, mapFallback }) {
    const t0 = Date.now();
    const messages = [
      {
        role: 'system',
        content: Agent.fill(Agent.P5, {
          transcript: Agent.truncate(transcript, 8000),
          qa: Agent.summarizeQA(qa)
        })
      },
      { role: 'user', content: `我卡壳的问题：\n${stuck || '（未填写）'}\n\nAI 先填的草稿（供参考，可修正）：\n${JSON.stringify(draft || {})}` }
    ];
    const r = await Agent._attempt(messages, Agent.validateReview, { temperature: 0.3 });
    if (r.ok) { Agent._log(jobId, 'converge', true, '', t0, messages, r.raw); return { review: r.data, fallback: false, demo: false }; }
    if (r.attempted) Agent._log(jobId, 'converge', false, r.err, t0, messages, r.raw);
    if (r.attempted && r.raw) {
      /* 层 5：v1 的 mapSections 正则解析 markdown，解析到几个算几个（mapSections 由 review.html 传入） */
      const mapped = (typeof mapFallback === 'function' && mapFallback(r.raw)) || {};
      const review = {};
      Agent.FIELDS.forEach(k => { review[k] = (mapped && mapped[k]) ? String(mapped[k]).trim() : ''; });
      Agent._logDemo(jobId, 'converge', '五层降级：正则解析');
      return { review, fallback: true, demo: false };
    }
    Agent._logDemo(jobId, 'converge', r.attempted ? '降级 DEMO 占位数据' : 'DEMO 模式');
    return { review: Agent.demoConverge(stuck, qa, draft), fallback: true, demo: true };
  }
};

/* ══════ 页面入口 ══════ */
const App = {
  mount(current) {
    enableSoftNav();        // 接管站内链接为 SPA 软导航（仅首次注册）
    renderNav(current);
    bindReveal();
    syncAiAvailability();   // 进站体检：不阻塞渲染，异步决定 LIVE / DEMO
  }
};

/* ── 进站体检 ────────────────────────────────────────────────
   目标：访客什么都不用配，打开就能用真 AI。
   逻辑：问同域代理一句「你有没有共用 Key？」（GET /ai，0 消耗）
     · 有共用 Key        → 保持 LIVE，徽章显示「真 AI」
     · 没有，且访客没自填 → 静默切 DEMO（不弹黄条，不吓人）
     · 访客自己填了 Key   → 直接 LIVE，用他自己的 Key
   ------------------------------------------------------------ */
async function syncAiAvailability() {
  const s = Store.settings.all();
  /* v1.9.13 修复：不再因 localStorage 残留的 mode:'demo' 直接 return。
     本站目标是「服务端配好共用 Key，访客零配置即用真 AI」，所以无论本地残留什么 mode，
     都先问一次服务端有没有共用 Key；有就强制拉回 LIVE（并清掉脏 demo 残留），
     没有才静默回退 DEMO。否则旧版 fallbackToDemo 把 mode 持久化成 demo 后，
     刷新也永远走占位、再也不调真 AI。 */
  if (s.key) { markAiBadge('LIVE', '已使用你在设置页填写的 Key'); return; }
  const h = await Net.health().catch(() => ({ ok: false }));
  if (h.ok && h.serverKey) {
    if (Store.settings.all().mode !== 'live') Store.settings.set({ mode: 'live' });
    markAiBadge('LIVE', '已接入真实模型（共用 Key）');
    return;
  }
  /* 服务端没配共用 Key —— 预期内常态，静默回退 */
  Net.fallbackToDemo(h.ok ? 'no-server-key' : (h.reason || 'unreachable'), true);
}

function markAiBadge(text, title) {
  const badge = document.getElementById('modeBadge');
  if (!badge) return;
  badge.textContent = text;
  /* 保持导航栏风格（透明底 + 背景反色），不套 tag-ok 的绿底，
     否则在深色导航上会糊成一团 */
  badge.className = 'tag';
  badge.title = title;
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindReveal);
else bindReveal();

/* ══════ SPA 软导航：导航栏常驻 DOM，仅内容区淡入淡出 ═══════
   为什么不用浏览器原生跨文档 View Transitions：sticky+blur 的玻璃导航栏被命名进过渡快照会
   位移/闪烁，且依赖较新浏览器；部分浏览器静默降级为硬跳反而更突兀。
   本方案：拦截站内 <a>，淡出当前内容→替换内容（导航栏节点绝不重建）→淡入，零白屏、零等待、
   导航条纹丝不动，所有现代浏览器一致生效。 */
let _softBusy = false, _navReady = false;
const _wait = ms => new Promise(r => setTimeout(r, ms));
const _docCache = new Map();

async function _getDoc(href) {
  const path = new URL(href, location.href).pathname;
  if (_docCache.has(path)) return _docCache.get(path);
  try {
    const res = await fetch(href);
    if (!res.ok) return null;
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    _docCache.set(path, doc);
    return doc;
  } catch { return null; }
}

function _inlineScript(doc) {
  const s = [...doc.querySelectorAll('script')].find(x => !x.src && x.textContent.trim());
  return s ? s.textContent : '';
}

/* 仅替换「非导航栏」的内容节点，导航栏节点原样保留 */
function _swapContent(doc) {
  const navbar = document.querySelector('nav.navbar');
  const next = [];
  doc.body.childNodes.forEach(n => {
    if (n.nodeType !== 1) return;
    if (n.matches('nav.navbar') || n.hasAttribute('data-nav')) return;
    next.push(n.cloneNode(true));
  });
  [...document.body.childNodes].forEach(n => {
    if (n === navbar) return;
    if (n.nodeType === 1 && (n.matches('nav.navbar') || n.hasAttribute('data-nav'))) return;
    n.remove();
  });
  next.forEach(n => document.body.appendChild(n));
  const t = doc.querySelector('title');
  if (t) document.title = t.textContent;
}

async function softNavigate(href, opts = {}) {
  if (_softBusy) return;
  _softBusy = true;
  try {
    const doc = await _getDoc(href);
    if (!doc) { location.href = href; return; }   // 兜底：拉取失败则硬跳
    /* 线上已发新版、当前标签页却还在跑旧脚本（SPA 软导航永不重载 app.js，
       老标签页会永远停留在发版前的行为）→ 对比目标页 meta 版本与本地 APP_BUILD，
       不一致就硬刷新接管。发版时 8 个页面的 <meta name="app-build"> 必须与
       APP_BUILD.ver 同步更新。 */
    const nv = doc.querySelector('meta[name="app-build"]')?.content;
    if (nv && nv !== APP_BUILD.ver) { location.replace(href); return; }
    document.body.classList.add('soft-out');
    await _wait(140);
    _swapContent(doc);
    if (opts.push !== false) history.pushState({ spa: 1 }, '', href);
    window.scrollTo(0, 0);
    const script = _inlineScript(doc);
    if (script) { try { new Function(script)(); } catch (e) { console.error('[软导航] 页面脚本执行失败:', e); } }
    document.body.classList.remove('soft-out');
    requestAnimationFrame(() => document.body.classList.add('soft-in'));
    setTimeout(() => document.body.classList.remove('soft-in'), 360);
    bindReveal();   // SPA 切换后内容已替换/动态渲染完成，重新观察 fade 元素触发入场
  } finally {
    _softBusy = false;
  }
}

function enableSoftNav() {
  if (_navReady) return;
  _navReady = true;
  window.__SPA = true;
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (_softBusy) { e.preventDefault(); return; }
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || a.hasAttribute('download') || a.target === '_blank') return;
    const url = new URL(href, location.href);
    if (url.origin !== location.origin) return;             // 外链不接管
    if (url.pathname === location.pathname && url.search === location.search) return;  // 同页不接管
    e.preventDefault();
    softNavigate(href);
  });
  window.addEventListener('popstate', () => softNavigate(location.href, { push: false }));
}
