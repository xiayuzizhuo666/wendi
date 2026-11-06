# 问底 · Wendi

把一件好奇的事，问到底。

问底是一个面向学习、科研和日常好奇心的“读物生成器”：输入一个问题，选一种读感和深度，得到一份 6–30 分钟能读完、带来源、反方和可信度说明的完整读物，并可下载 PDF。

- 在线体验：<https://quaestio-ai-krtzz7phy1t.qoder.zone/>
- 样例 PDF：<https://quaestio-ai-krtzz7phy1t.qoder.zone/samples/mcp.pdf>
- 状态：2026 Qoder 高校创造力大赛 StudyHack 参赛作品，可运行原型

## 它解决什么

普通对话 AI 往往给的是一段“当时觉得懂了”的回答：关掉窗口讲不出来，也不知道该信哪一句。问底把一次好奇拆成一条完整链路：

`定题 → 检索 → 取证 → 交叉验证 → 反方 → 写作 → 可信度检查 → 排版`

它不替读者下结论，而是把证据、反方、未知和判断的边界摊开，让读者自己判断。

## 和普通对话 AI 的区别

- **结构**：默认 9 节结构（开场、定义、来路、机制、版图、交汇、反方、推演、收束）；书籍会切换为读书报告结构。
- **证据**：事实性段落可点回来源；来源按 L1 官方 / 法规、L2 学术 / 研究、L3 正规媒体、L4 机构 / 百科、L5 自媒体 / 社区、L6 未核验网页分级。
- **反方**：专设“争议场”，把支持方与反对方的最强论证放在同一张桌上，并写“什么会改变这个判断”。
- **读感**：三种读感 × 三档深度，同一套证据服务不同的学习节奏。
- **成品**：可下载 PDF、可打印、可在报告库回看，适合做笔记和分享。

## 三种读感 × 三档深度

| 读感 | 叙事方式 |
| --- | --- |
| 讲透 | 一条主线，因果推进；先看见问题，再一层层拆开 |
| 侦探 | 先给一个不对劲的细节，再带线索、假设和反证往下走 |
| 轻读 | 先建立地图，再决定要不要深挖 |

| 深度 | 阅读时间 |
| --- | --- |
| 速览 | 6–8 分钟 |
| 深读 | 15–20 分钟 |
| 追根 | 25–30 分钟 |

## 核心能力

- **对象路由**：概念、产品、公司、事件、人物、现象、书 / 作品；书籍输出读书报告，不写章节摘要。
- **来源分级与重排**：L1–L6 来源分级 + 0–5 relevance rerank，相关性优先、来源等级其次；web 来源按深度限额。
- **可信度信号**：来源硬度、反方强度、推断透明度、未知与争议、时效与可证伪。
- **Typst PDF**：在浏览器内排版 A4 成品，包含封面、目录、来源清单；不是网页截图。
- **演示模式**：邀请码换短期 token，模型固定、限额使用；key 只放在服务端 Secret，不进入前端。
- **BYOK**：用户也可以配置自己的 OpenAI-compatible API key；key 保存在浏览器本地，按请求转发，不落服务端。
- **本地报告库**：报告存在浏览器 IndexedDB，换设备不同步，这是有意的隐私取舍。

## 技术栈

- React 19 + TypeScript + Vite 8
- Tailwind CSS 4 + Shadcn UI primitives
- Qoder Sites Edge Function（Deno）
- DeepSeek / OpenAI-compatible Chat Completions
- DeepSeek Search、Wikipedia、OpenAlex 等检索源
- Typst WASM（`@myriaddreamin/typst.ts`）生成 PDF
- IndexedDB（`idb`）保存本地报告

## 本地运行

需要 Node.js `^22.13.0 || >=24.0.0`。

```sh
npm ci
npm run dev
```

打开 Vite 输出的本地地址。生产构建：

```sh
npm run build
npm run preview
```

Edge Function 的本地检查与运行需要 Deno：

```sh
npm run check:function
npm run dev:function
```

## 配置

前端不包含任何模型 key。演示模式的服务端变量：

```sh
DEMO_ACCESS_CODE=       # 邀请码，仅用于演示入口
DEEPSEEK_DEMO_KEY=      # 服务端演示 key，绝不提交到仓库
```

把这两个值配置在 Qoder Sites 的 Secrets / 服务端环境里，不要写进 `.env` 后提交仓库。`.env.example` 只保留空变量名。

BYOK 模式下，key 存在浏览器 `localStorage` 或 `sessionStorage`，请求时发送到同源 Edge Function；服务端不持久化 key，也不记录请求内容。

## 部署

1. `npm run build`，产物在 `dist/`。
2. 在 Qoder Sites 中把 `dist/` 作为静态站点目录，`functions/` 作为 Function 目录。
3. 在 Sites Settings 中配置 `DEMO_ACCESS_CODE` 和 `DEEPSEEK_DEMO_KEY`。
4. 发布后验证：首页样例、报告生成、来源点击、PDF 下载、演示模式额度提示。

## 目录结构

```text
.
├─ components/          # 首页、研究台、阅读器、演示弹窗等
├─ data/                # 读感、深度、provider 配置
├─ dev/                 # 本地 Function 调试入口
├─ docs/                # 产品与方法论文档
├─ functions/           # Qoder Sites Edge Function
│  ├─ handler.ts        # /llm、/search、/demo/session
│  ├─ sources.ts        # 检索聚合与来源清洗
│  ├─ extract.ts        # 正文抽取
│  └─ providers.ts      # 模型 provider
├─ lib/
│  ├─ agent/            # pipeline、prompts、schemas、API
│  ├─ typst/            # 浏览器内 Typst 排版
│  └─ source-grade.ts   # L1–L6 来源分级
├─ public/
│  ├─ fonts/            # 站点字体与 OFL 许可
│  └─ samples/          # 样例 PDF
├─ scripts/             # 构建与 Typst 测试脚本
├─ src/                 # 应用入口与样式
└─ vendor/              # 第三方样式与许可
```

## 质量与局限

已验证的代表性数据：

- 深读实测约 8,600 字 / 19 分钟；速览实测约 3,100 字 / 7 分钟。
- 单次成本约 ¥0.16–0.31。
- MCP 样例：7 个来源，6 个高可信，7 个已打开正文；0 个草稿节、0 个无效引用编号。

已知局限：

- 开放网页的正文抽取、付费墙、反爬会失败；报告会明确写“暂缺”，不编造。
- DeepSeek Search 当前只接受英文检索式；中文题目靠 plan 生成英文 `searchQueryEn`，中文长尾来源覆盖仍不足。
- 演示额度有限，适合一次完整体验；额度用尽可读样例或使用 BYOK。
- 没有账号体系，报告存在浏览器本地 IndexedDB，换设备不同步。

## License

本项目使用 **GNU Affero General Public License v3.0 only**（`AGPL-3.0-only`），见 [LICENSE](LICENSE)。

选择它的原因：问底是一个 Web 产品，AGPL 能覆盖“把修改后的版本作为网络服务提供”的场景，避免被直接闭源包装成 SaaS。若你需要闭源商用或其他授权，请通过 GitHub Issues 联系。

第三方组件、字体和 starter provenance 的许可见 [NOTICE](NOTICE)、[PROVENANCE.md](PROVENANCE.md) 以及 `vendor/`、`public/fonts/` 中的许可文件。
