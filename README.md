# 面溯 MianSu — AI 面试复盘工具

> 把「AI 一次给结论」改成「会追问的复盘 Agent」。
> 在线体验：<https://miansu.pages.dev/>

面试结束之后，大多数人只知道「感觉面得不好」，说不清差在哪。面溯做的事是：让 AI 像面试官一样，从你的面试逐字稿里找到答得含糊的地方，追问你，再基于你的回答生成一份结构化复盘。

---

## 它解决什么问题

1. **复盘没有抓手**：录音听完就完了，没人告诉你哪句话答虚了。
2. **AI 直接给结论没用**：一键生成的复盘，用户看完就忘。被追问过一次的知识漏洞，下次面试才不会再卡。
3. **面试录音太敏感**：不敢往云端传。

---

## 核心设计（v2.0）

### 三阶段 Agent 链路

| 阶段 | 做什么 | 关键约束 |
|---|---|---|
| **探针 probe** | 从逐字稿里定位说得含糊 / 答漏的地方，生成 3 个具体问题 | 每个问题必须附带一段**逐字稿原文引用**，子串校验不通过就作废 |
| **追问 thread** | 用户逐条回答，也可以跳过或换一个问题 | 单条最多换 2 次 |
| **收敛 converge** | 结合问答重写 8 个复盘字段 | **不覆盖用户已手填的内容** |

### 五层降级（保证任何情况下都不白屏）

```
输出结构硬约束 → 提取 JSON → schema 校验（含逐字稿子串校验）
  → 失败自动重试 1 次（temperature 归 0）→ 正则分段兜底
```

前四层都失败时，用正则从模型输出里尽力解析，解析到几个字段算几个。

### 可观测

每次 AI 调用写入 `miansu:agentlog`（最多 50 条），记录阶段、耗时、token 与失败原因，设置页可查看并导出 JSON。

**实测数据（2026-09-13 ~ 09-14，用户真实操作导出）**

| 阶段 | 次数 | 平均耗时 | 结果 |
|---|---|---|---|
| 探针 probe | 5 | 23.6s | 全部成功 |
| 追问 thread | 1 | 10.3s | 成功 |
| 收敛 converge | 5 | 22.4s | 全部成功 |

一次走完「探针 → 追问 → 收敛」的完整深挖约 54s。

---

## 隐私与工程取舍

- **转写在浏览器里完成**：本地 Whisper（[transformers.js](https://huggingface.co/docs/transformers.js)，默认 `whisper-small`，可切 base/tiny），音频与逐字稿不上传。另提供「直接粘贴逐字稿」旁路——手机录音 App 自带转写质量普遍更高，零等待。
- **API Key 不落前端**：DeepSeek 调用经同域 Edge Function（`/ai`）转发，前端只认相对路径。
- **数据全在本地**：`localStorage`，统一 `miansu:` 命名空间（jobs / reviews / threads / agentlog / settings / account）。

---

## 技术栈

- **前端**：原生 HTML + CSS + JavaScript，零框架、零构建、零运行时依赖
- **数据层**：localStorage
- **LLM**：DeepSeek（`stream: true` SSE 流式，解析 `reasoning_content` 思考链）
- **ASR**：浏览器本地 Whisper（transformers.js / WASM）
- **代理**：Cloudflare Pages Functions（`functions/ai.js`），与站点同域
- **部署**：GitHub → Cloudflare Pages 自动构建
- **可视化**：漏斗与转化率纯 CSS + DOM 手绘，未引入图表库

---

## 目录结构

```
.
├── index.html      首页（周历 + 数据概览）
├── records.html    面试记录（投递流水账）
├── detail.html     录音转写（本地 Whisper / 粘贴逐字稿）
├── review.html     面试复盘（6 模块结构化表 + 三阶段 Agent）
├── resume.html     改简历
├── about.html      关于项目（架构决策、能力边界）
├── settings.html   设置（代理配置、数据导入导出、AI 调用记录）
├── profile.html    个人中心
├── app.js          全部逻辑（Store / LLM / Agent / Net）
├── styles.css      全部样式（CSS 变量驱动深浅双主题）
├── functions/
│   └── ai.js       DeepSeek 代理（Edge Function，伺服 /ai）
└── _headers        Cloudflare Pages 响应头（HTML no-store）
```

---

## 本地运行

```bash
python3 -m http.server 8000
# 打开 http://127.0.0.1:8000
```

> 本地没有 `/ai` 代理，AI 功能会**静默降级**到占位数据——不弹错、不白屏，流程照样能走完。想跑真实模型，请在设置页填自己的 endpoint 与 Key，或部署到 Cloudflare Pages（服务端共用 Key 已配置）。

---

## 能力边界（如实说明）

- 这是**三阶段结构化 LLM 编排**，不是自主智能体（没有 ReAct 循环 / Function Calling）。
- AI 输出由模型生成，可能出错，需自行判断后再用于真实面试决策。
- 数据存在本地浏览器，换设备或清缓存会丢失，重要内容请在设置页导出备份。
- `localStorage` 账号只做界面识别，**不设密码、不做鉴权**。

---

## 计划中

- [ ] 构建面试回答评测集，量化「AI 指出的问题 vs 人工标注」一致率
- [ ] 优化收敛阶段耗时波动（当前 13s ~ 30s，差异主要来自逐字稿长度）
- [ ] 本地转写区分说话人（当前需人工指定）
