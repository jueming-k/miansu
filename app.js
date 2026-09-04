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
const APP_BUILD = { ver: 'v1.9.21', at: '2026-09-02 13:15', feat: '根治「老标签页永远跑旧代码」：SPA 软导航从不重载 app.js，发版后用户若不硬刷新，老标签页会一直停留在旧行为（本次 v1.9.18→20 连续三轮"修了还说空白"的直接元凶之一）。现在 8 个页面 head 都带 <meta name="app-build">，softNavigate 拉取目标页时发现版本与本地 APP_BUILD 不一致 → 自动硬刷新接管。发版时 meta 与 APP_BUILD.ver 必须同步更新。' };

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
  const host = $('[data-nav]');
  /* SPA 软导航：导航栏节点常驻 DOM，仅更新激活态，绝不重建 → 纹丝不动、零位移 */
  const live = document.querySelector('nav.navbar');
  if (window.__SPA && live && !host) {
    live.querySelectorAll('.menu a, .m-menu a').forEach(a => {
      const key = (a.getAttribute('href') || '').replace('.html', '') || 'index';
      const on = key === current;
      a.classList.toggle('on', on);
      if (a.parentElement && a.parentElement.classList.contains('m-menu')) {
        a.style.fontWeight = on ? '700' : '500';
        a.style.color = on ? 'var(--tx)' : 'var(--nav-tx)';
      }
    });
    return;
  }
  if (!host) return;
  /* 默认（无 data-theme）= 深蓝紫底；显式 light = 浅蓝底 */
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
        <span class="tag" id="modeBadge"
              style="background:var(--nav-h);color:var(--on-bg);border-color:transparent"
              title="${safeMode === 'live' ? '已接入代理' : '未接入真实模型'}">${safeMode === 'live' ? 'LIVE' : 'DEMO'}</span>
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

  document.addEventListener('click', e => {
    if (!e.target.closest('[data-theme-toggle]')) return;
    /* 默认(深蓝紫底) ⇄ light(浅蓝底) */
    const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(KEY, next);
    document.querySelectorAll('[data-icon-moon]').forEach(el => el.style.display = next === 'dark' ? 'none' : 'block');
    document.querySelectorAll('[data-icon-sun]').forEach(el => el.style.display = next === 'dark' ? 'block' : 'none');
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
