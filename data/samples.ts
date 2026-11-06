import type { ReportDoc } from "@/types";
import { bayesSample } from "./samples-bayes";
import { greatnessSample } from "./samples-greatness";
import { preparedDishesSample } from "./samples-prepared";

const ACCESSED = Date.parse("2026-11-01T09:00:00+08:00");

const mcpSample: ReportDoc = {
  id: "sample-mcp",
  topic: "MCP（Model Context Protocol）",
  title: "MCP：让模型从「会说」到「能做事」",
  subtitle: "一份给非协议工程师的 MCP 研究笔记",
  oneLiner:
    "MCP 是一套开放协议，让 AI 应用用统一方式连接外部工具、数据和服务；它不生产智能，只负责把上下文送进模型，把动作送出去。",
  tldr: [
    "MCP 的价值不在模型，而在接口标准化：它把「每个模型 × 每个工具」的重复适配，收敛成一套可复用的连接方式。",
    "它用 host / client / server 三层和 tools / resources / prompts 三类原语组织能力；真正难的不是连上，而是权限边界与信任。",
    "短期它更像开发者工具与 agent 框架的共同底座，而不是一夜之间统一所有软件的「USB-C」；安全与治理是下一阶段的主线。",
  ],
  keyQuestions: [
    "MCP 到底解决了谁的什么问题？",
    "它和 function calling、插件、RAG 是什么关系？",
    "为什么是 Anthropic 先推，后来 OpenAI 等也接？",
    "它真的安全吗？风险具体在哪？",
    "如果我要学，第一步应该做什么？",
  ],
  tags: ["AI 协议", "Agent", "工具调用", "上下文工程"],
  meta: {
    readingMinutes: 18,
    wordCount: 6240,
    sourceCount: 7,
    confidence: "medium",
    completedAt: ACCESSED,
    model: "样例报告",
    scene: "study",
    depth: "deep",
  },
  reading: { style: "explain", depth: "deep" },
  objectKind: "concept",
  coverMotif: "arcs",
  frameworks: [
    {
      name: "纵轴—横轴",
      why: "MCP 既有一段清晰的技术史，也有一张正在成形的竞争版图；只讲历史会漏掉当下，只讲对比会看不懂它为什么长成这样。",
      reveals: "它不是凭空出现的标准，而是「工具调用」这条路线走到一定阶段后，对接口碎片化的一次集中回应。",
    },
    {
      name: "第一性原理",
      why: "协议的价值最终要回到「减少了多少次重复适配、增加了多少可组合性」这两个问题上。",
      reveals: "MCP 的收益主要发生在集成层，而不是模型能力层；把它当成「让模型更聪明」的方案会失望。",
    },
    {
      name: "钢人论证",
      why: "支持者说它是 AI 的 USB-C，反对者说它只是又一个被大厂推动的抽象层；两边最强的理由都值得摆上桌面。",
      reveals: "它很可能成为一个重要的共同底座，但「统一」不等于「安全」，也不等于「所有场景都该用」。",
    },
  ],
  bareThinking: {
    text: "第一眼看到 MCP，最容易把它误解成「又一个插件标准」。但插件标准解决的是「某个平台怎么接服务」，MCP 解决的是「AI 应用怎么在运行时发现并调用外部能力」。这两个问题的层级不一样：前者是平台功能，后者是应用与工具之间的契约。真正值得追问的是，当契约变成公共基础设施，谁来为第三方 server 的行为负责？",
    assumptions: [
      "假设「标准化接口」一定带来更低的集成成本；但标准本身也有学习和维护成本。",
      "假设「更多工具」等于「更强能力」；但工具越多，模型选错、权限过大和被内容操纵的风险也越高。",
    ],
    analogies: ["USB-C 是发布会爱用的类比，但 USB-C 只解决物理接口，MCP 还要解决信任与权限。"],
  },
  debates: [
    {
      id: "d1",
      question: "MCP 会成为 AI 应用的「USB-C」吗？",
      pro: {
        label: "支持方",
        thesis: "只要工具生态继续碎片化，一个开放、可组合、被多家客户端采用的连接协议就有网络效应。",
        points: [
          { text: "它把 N×M 的定制适配变成 N+M 的公共接口，集成成本随生态扩大而下降。[[s1]]", evidenceIds: ["s1"] },
          { text: "从 IDE、桌面 AI 应用到 agent 框架，客户端侧已经出现跨厂商采用，说明它不只是 Anthropic 的内部约定。[[s4]][[s5]]", evidenceIds: ["s4", "s5"] },
        ],
      },
      contra: {
        label: "反方",
        thesis: "统一接口不等于统一生态；大厂完全可以在支持 MCP 的同时保留自己的私有能力与分发入口。",
        points: [
          { text: "协议只规定「怎么连」，不规定「连上之后谁负责」；第三方 server 的权限、质量和安全无法由协议自动保证。[[s6]]", evidenceIds: ["s6"] },
          { text: "工具描述、资源内容和模型输出都可能成为注入通道；连接越多，攻击面越大。[[s6]]", evidenceIds: ["s6"] },
        ],
      },
      verdict:
        "更稳妥的判断是：MCP 有机会成为「工具连接层」的事实标准之一，但不会自动成为所有 AI 上下文的统一入口。它的上限取决于客户端覆盖面与安全治理，而不是协议本身有多优雅。",
      confidence: "medium",
      changeMyMind:
        "如果未来 12—18 个月内，主流的操作系统、浏览器和企业数据平台都把 MCP 作为一等公民，并且出现可审计的权限与供应链标准，我会把判断上调。反之，如果多数客户端只把它当「可选的插件通道」，它就会停留在开发者工具层。",
    },
  ],
  sections: [
    {
      id: "s1",
      number: "01",
      title: "先把定义说窄一点",
      kicker: "一句话定义",
      blocks: [
        {
          type: "p",
          text: "MCP（Model Context Protocol）是一套开放协议，规定 AI 应用如何发现、调用外部工具，如何读取外部资源，如何复用预置的工作流。它不训练模型，也不替模型思考；它解决的是「模型如何可靠地接触到模型之外的东西」。[[s2]]",
        },
        {
          type: "callout",
          tone: "insight",
          title: "一句话记住",
          text: "Function calling 让模型「会点菜」；MCP 让整个应用「有一套统一的点菜、上菜和后厨接口」。一个管表达，一个管连接。",
        },
        {
          type: "p",
          text: "这个区分很重要。很多关于 MCP 的讨论把它和「模型能力」混在一起，仿佛接上 MCP，模型就突然会查数据库、会发邮件、会操作浏览器。实际上，模型仍然只会生成文本或结构化的调用意图；真正执行动作的是宿主应用和它背后的工具。MCP 做的是把「有哪些工具、怎么调用、返回什么」这件事标准化。",
        },
        {
          type: "p",
          text: "所以，MCP 的第一层价值是**降低集成成本**，第二层价值才是**让能力可组合**。如果只看到第一层，它像一个更规范的插件系统；看到第二层，它才像 AI 应用的基础设施。",
        },
      ],
    },
    {
      id: "s2",
      number: "02",
      title: "它从哪来：一次「接口税」的集体止痛",
      kicker: "纵向脉络",
      blocks: [
        {
          type: "p",
          text: "在 MCP 出现之前，AI 应用接工具的方式基本是「一家一议」：每个模型提供方有自己的 function calling 格式，每个应用有自己的工具注册方式，每个数据源又有自己的鉴权和返回结构。结果是一个典型的 N×M 问题——N 个模型、M 个工具，就要维护 N×M 套适配。[[s1]]",
        },
        {
          type: "p",
          text: "Anthropic 在 2024 年 11 月发布 MCP 时，用了一个很聪明的类比：把它想成 AI 应用的 USB-C 接口。这个类比不一定严谨，但它准确抓住了痛点——大家不想再为每一种组合重新焊一根线。[[s1]]",
        },
        {
          type: "quote",
          text: "把 MCP 想成 AI 应用的 USB-C 接口：不是让设备更聪明，而是让设备之间更容易接上。",
          attribution: "对 Anthropic 发布公告中类比的一种转述",
          sourceId: "s1",
        },
        {
          type: "p",
          text: "但 MCP 并不是第一个尝试。更早的插件体系、各家 agent 框架的工具抽象、以及模型侧的 function calling，都在解决相邻的问题。MCP 的时机优势在于三件事同时发生：agent 从演示走向真实工作流；工具调用成为模型的基础能力；以及一个开放、可自托管、跨语言的协议正好填上了「应用与工具之间」的空缺。",
        },
        {
          type: "h3",
          text: "为什么是现在，而不是更早？",
        },
        {
          type: "list",
          ordered: false,
          items: [
            "**需求侧**：AI 应用开始需要读文件、查数据库、调 API、操作浏览器，单靠 prompt 已经不够。",
            "**供给侧**：模型侧的 function calling 逐渐稳定，应用侧需要一层比「每家自己写适配」更通用的连接方式。",
            "**生态侧**：开源实现和自托管 server 降低了参与门槛，协议不必先等某个巨头把平台做出来。",
          ],
        },
        {
          type: "p",
          text: "这也解释了为什么它先由 Anthropic 推动，后来 OpenAI 的 Agents SDK、以及大量 IDE 与桌面应用开始支持：大家不一定想在协议层站队，但都希望少写一点重复的适配代码。[[s4]][[s5]]",
        },
      ],
    },
    {
      id: "s3",
      number: "03",
      title: "它怎么运作：三层、三类原语、两种传输",
      kicker: "机制拆解",
      blocks: [
        {
          type: "p",
          text: "MCP 的结构可以先用一句话概括：**宿主（host）里运行客户端（client），客户端连接服务器（server），服务器把外部系统的能力暴露成三类原语。** [[s2]]",
        },
        {
          type: "figure",
          figureId: "fig-concept",
        },
        {
          type: "h3",
          text: "三层：谁负责什么",
        },
        {
          type: "table",
          headers: ["角色", "它是什么", "它负责什么"],
          rows: [
            ["Host", "你直接使用的 AI 应用，例如桌面助手、IDE、agent 工作台", "管理会话、模型、权限和用户体验；决定要不要连接某个 server"],
            ["Client", "Host 内部与某个 server 保持一对一会话的连接器", "协商能力、转发请求、处理通知与生命周期"],
            ["Server", "独立进程或远程服务，包装文件、数据库、API 等外部能力", "声明自己提供什么工具/资源/提示词，并执行调用"],
          ],
        },
        {
          type: "p",
          text: "把 server 想成「带权限的适配器」比想成「插件」更准确。插件通常运行在宿主内部，权限边界模糊；MCP server 可以是一个独立进程、一个远程服务，甚至是别人写的第三方代码。它带来的能力越大，越需要被当作第三方依赖来对待。",
        },
        {
          type: "h3",
          text: "三类原语：做事、读料、走流程",
        },
        {
          type: "list",
          ordered: false,
          items: [
            "**Tools（工具）**：模型可以发起的动作，例如查询数据库、发送请求、创建文件。工具通常有输入 schema，调用结果会回到模型上下文。",
            "**Resources（资源）**：可以被读取的上下文，例如文件、记录、网页内容。资源更像「资料」，不一定产生副作用。",
            "**Prompts（提示词）**：由 server 预置的工作流或模板，让用户/宿主以一致方式发起某类任务。",
          ],
        },
        {
          type: "callout",
          tone: "note",
          title: "一个容易被忽略的细节",
          text: "MCP 不只让模型「调用工具」。它还允许 server 在运行过程中发送通知、请求用户确认，甚至发起采样请求。能力越双向，信任边界越重要。",
        },
        {
          type: "h3",
          text: "两种传输：本地与远程",
        },
        {
          type: "p",
          text: "本地 server 常用 stdio 传输：宿主启动一个子进程，通过标准输入输出交换 JSON-RPC 消息。远程 server 则使用可流式 HTTP 传输，适合多用户、集中部署和统一鉴权。[[s3]] 两种方式共享同一套消息语义，但部署与安全模型完全不同：本地 server 更像「你电脑上的一个程序」，远程 server 更像「一个你需要登录和审计的第三方服务」。",
        },
        {
          type: "p",
          text: "协议本身用 JSON-RPC 组织请求、响应和通知，连接开始时双方会协商能力与版本。这个设计不复杂，真正的复杂度在「能力协商之后」：谁有权调用、调用结果是否可信、出错时谁负责。",
        },
      ],
    },
    {
      id: "s4",
      number: "04",
      title: "它在版图里的位置：不是替代，而是叠加",
      kicker: "横向对比",
      blocks: [
        {
          type: "p",
          text: "把 MCP 和 function calling、插件、RAG 放在一张表里，最容易产生的误解是「谁取代谁」。它们其实处在不同层：function calling 是模型表达调用意图的方式；插件是某个平台把外部服务接进来的机制；RAG 是一种把资料检索进上下文的模式；MCP 则是应用与工具之间的连接协议。",
        },
        {
          type: "figure",
          figureId: "fig-matrix",
        },
        {
          type: "h3",
          text: "和 function calling：一个管「说」，一个管「接」",
        },
        {
          type: "p",
          text: "模型通过 function calling 生成一个结构化的调用请求，但「这个请求发给谁、用什么鉴权、返回结果怎么格式化」并不是 function calling 规定的事。MCP 把这些应用层的问题接了过去。所以它们不是竞争关系：MCP 客户端通常仍然依赖模型的 function calling 能力来决定何时调用哪个工具。",
        },
        {
          type: "h3",
          text: "和 RAG：连接协议不解决检索质量",
        },
        {
          type: "p",
          text: "RAG 的核心是「找对资料、放对上下文」；MCP 的核心是「用统一方式把资料和工具接进来」。一个 MCP server 可以暴露检索工具，但检索的召回率、切分策略、引用准确性仍然要单独设计。把 MCP 当成 RAG 的替代品，会让系统看起来更整齐，却不会让答案更可靠。",
        },
        {
          type: "callout",
          tone: "warning",
          title: "别把「能连上」当成「能信任」",
          text: "MCP 让连接变便宜，也让「接错东西」变便宜。一个来源不明的 server、一个权限过大的 token、一段被注入的工具描述，都可能让模型做出你没授权的动作。",
        },
      ],
    },
    {
      id: "s5",
      number: "05",
      title: "证据与争议： adoption 很快，治理还在补课",
      kicker: "反方与证据",
      blocks: [
        {
          type: "p",
          text: "从公开资料看，MCP 的采用速度确实快：Anthropic 发布后，MCP 客户端目录里出现了桌面应用、IDE、agent 框架等多类宿主；OpenAI 的 Agents SDK 也提供了 MCP 接入能力。[[s4]][[s5]] 这说明它至少跨过了「只有一家在用」的门槛。",
        },
        {
          type: "figure",
          figureId: "fig-timeline",
        },
        {
          type: "p",
          text: "但「采用快」不等于「成熟」。MCP 规范自己就把若干安全问题列为部署时必须处理的风险，包括混淆代理（confused deputy）、token 透传、会话劫持等；这些问题的共同点是：协议可以把消息传对，但不能替你做授权判断。[[s6]]",
        },
        {
          type: "h3",
          text: "最强的反方：它可能只是一个「可选的插件通道」",
        },
        {
          type: "p",
          text: "反方最有力的论点不是「MCP 没用」，而是「MCP 可能停在开发者工具层」。如果主流客户端只把它当作众多连接方式之一，如果企业数据平台仍然要求私有连接器，如果每个大厂都在支持 MCP 的同时保留自己的私有能力，那么 MCP 会成为一种重要的兼容层，却未必成为统一入口。",
        },
        {
          type: "p",
          text: "这个反方不能被一句「生态会赢」打发。它提示我们区分两种成功：**协议被采用**，和**协议成为默认**。前者已经发生，后者还没有。",
        },
        {
          type: "h3",
          text: "另一个争议：USB-C 类比掩盖了什么",
        },
        {
          type: "p",
          text: "USB-C 类比之所以好用，是因为它把「接口统一」的收益讲得非常直观；但它也掩盖了 MCP 特有的问题：USB-C 不会在你插上线之后，自己决定读取哪个文件、向哪个地址发请求。MCP 连接的是有语义、有权限、有副作用的工具。接口统一只解决了「怎么接」，没有解决「接上之后能做什么」。",
        },
        {
          type: "callout",
          tone: "question",
          title: "判断一条 MCP 新闻值不值得关注",
          text: "问三个问题：它增加了哪类宿主？它解决了什么权限/审计问题？它让哪个原本需要定制适配的场景变成可复用？如果三个都答不上来，可能只是「又接了一个工具」。",
        },
      ],
    },
    {
      id: "s6",
      number: "06",
      title: "对你意味着什么：三类人的下一步",
      kicker: "落地建议",
      blocks: [
        {
          type: "h3",
          text: "如果你是开发者",
        },
        {
          type: "p",
          text: "先把 MCP 当成「带权限的适配层」，不要当成「万能插件」。第一个 server 建议从只读能力开始：读一个目录、查一张表、取一个网页的正文。只读 server 能让你把协议、传输、错误处理和权限边界跑通，而不会一上来就把危险动作交给模型。",
        },
        {
          type: "steps",
          items: [
            { title: "跑通一个最小 server", text: "用官方 SDK 暴露一个只读工具，确认 host 能发现、调用并拿到结构化结果。" },
            { title: "加上边界", text: "限制可访问的路径/表/域名，给每次调用打日志，明确哪些动作需要用户确认。" },
            { title: "再谈组合", text: "当你有一个稳定、可审计的 server 之后，再考虑把多个 server 组合成工作流。" },
          ],
        },
        {
          type: "h3",
          text: "如果你是普通用户",
        },
        {
          type: "p",
          text: "你不需要理解 JSON-RPC，但需要建立一个直觉：**连接一个 MCP server，等于把一个外部程序接进你的 AI 助手。** 只连接你信任来源的 server；对「读取全部文件」「访问所有网页」「代你发消息」这类权限保持警惕；重要操作要求二次确认。",
        },
        {
          type: "h3",
          text: "如果你只是想学明白",
        },
        {
          type: "p",
          text: "不要从「写一个万能连接器」开始。先读官方文档里的 host/client/server 模型，再跑一个示例 server，观察一次完整的请求与响应；最后读安全最佳实践，理解为什么「协议正确」不等于「系统安全」。这条路径比背概念更能建立判断力。",
        },
        {
          type: "keyline",
          text: "先写一个只读 server，再谈万能连接器。",
        },
      ],
    },
    {
      id: "s7",
      number: "07",
      title: "怎么继续学：一条七天的最小路径",
      kicker: "学习路径",
      blocks: [
        {
          type: "p",
          text: "下面这条路径假设你会一点编程，但没接触过 MCP。目标不是成为协议专家，而是能独立判断一个 MCP 方案是否靠谱。",
        },
        {
          type: "steps",
          items: [
            { title: "第 1 天：读模型", text: "只读官方文档的 host/client/server 与三类原语，画出你自己的结构图。" },
            { title: "第 2 天：跑示例", text: "跑通一个官方示例 server，用宿主连接它，观察工具列表与调用结果。" },
            { title: "第 3 天：看消息", text: "抓一次 JSON-RPC 请求与响应，理解 initialize、tools/list、tools/call 的顺序。" },
            { title: "第 4 天：加权限", text: "给示例 server 加上路径或域名白名单，故意触发一次拒绝，观察错误如何回到模型。" },
            { title: "第 5 天：读安全", text: "读规范的安全最佳实践，列出你认为最重要的三个风险。" },
            { title: "第 6 天：做一个小工具", text: "写一个只读 server，解决你自己的一个小问题，例如查本地笔记或读一个公开 API。" },
            { title: "第 7 天：写复盘", text: "用 500 字回答：MCP 帮你省掉了哪段适配？又引入了哪类新风险？" },
          ],
        },
        {
          type: "h3",
          text: "延伸阅读",
        },
        {
          type: "list",
          ordered: false,
          items: [
            "Anthropic 的 MCP 发布公告：理解它最初想解决什么问题。[[s1]]",
            "MCP 官方文档的架构与概念页：建立 host/client/server 的准确模型。[[s2]]",
            "MCP 规范与安全最佳实践：理解协议边界与部署风险。[[s3]][[s6]]",
            "OpenAI Agents SDK 的 MCP 文档：看另一个生态如何接入。[[s4]]",
            "MCP 客户端目录：观察真实宿主如何分布。[[s5]]",
          ],
        },
      ],
    },
    {
      id: "s8",
      number: "08",
      title: "方法与局限",
      kicker: "研究说明",
      blocks: [
        {
          type: "p",
          text: "这份样例使用了纵轴—横轴、第一性原理和钢人论证三副透镜：纵轴看它如何从「接口碎片化」中长出来，横轴把它和 function calling、插件、RAG 放在同一张桌上，钢人论证则把支持和反对 MCP 的最强理由都摆出来。",
        },
        {
          type: "p",
          text: "主要局限有三个。第一，公开资料以官方文档、规范和项目仓库为主，独立实证研究仍然偏少；第二，采纳规模缺少统一口径的量化数据，本报告只能描述方向，不能给出精确份额；第三，安全风险在快速演变，报告中的风险清单不是穷举。",
        },
        {
          type: "callout",
          tone: "note",
          title: "证据强度",
          text: "关于「MCP 是什么、怎么运作」的部分证据较强，因为有一手规范与官方文档；关于「它会不会成为统一标准」的部分属于判断，置信度中等，需要持续观察。",
        },
      ],
    },
  ],
  figures: [
    {
      id: "fig-timeline",
      type: "timeline",
      title: "MCP 的关键节点",
      caption: "从发布到生态扩张：协议本身变化不算快，变化快的是宿主与 server 的数量。",
      data: {
        events: [
          { date: "2024.11", title: "Anthropic 发布 MCP", detail: "提出开放协议与 host/client/server 模型。", sourceId: "s1" },
          { date: "2025.03", title: "OpenAI Agents SDK 接入", detail: "另一个主流 agent 开发生态开始支持 MCP。", sourceId: "s4" },
          { date: "2025.06", title: "规范修订", detail: "补充结构化工具输出、授权与安全实践等内容。", sourceId: "s3" },
          { date: "2025 下半年", title: "宿主与 server 扩张", detail: "IDE、桌面应用、agent 框架与工具目录持续增加。", sourceId: "s5" },
          { date: "2026", title: "治理成为主线", detail: "讨论从「能不能连」转向「谁能连、能做什么、如何审计」。", sourceId: "s6" },
        ],
      },
    },
    {
      id: "fig-concept",
      type: "conceptMap",
      title: "MCP 的结构",
      caption: "宿主管理体验与权限，客户端负责一对一会话，服务器把外部能力包装成三类原语。",
      data: {
        center: "MCP",
        nodes: [
          { id: "host", label: "Host / 宿主", relation: "管理会话、模型与权限", weight: 3 },
          { id: "client", label: "Client / 客户端", relation: "与 server 一对一连接", weight: 2 },
          { id: "server", label: "Server / 服务器", relation: "包装外部能力", weight: 3 },
          { id: "tools", label: "Tools / 工具", relation: "可执行的动作", weight: 3 },
          { id: "resources", label: "Resources / 资源", relation: "可读取的上下文", weight: 2 },
          { id: "prompts", label: "Prompts / 提示词", relation: "预置工作流", weight: 1 },
          { id: "transport", label: "Transport / 传输", relation: "stdio 或流式 HTTP", weight: 2 },
          { id: "systems", label: "外部系统", relation: "文件、数据库、API", weight: 3 },
        ],
      },
    },
    {
      id: "fig-matrix",
      type: "matrix",
      title: "四种「让模型连接外部」的思路",
      caption: "它们不在同一层：MCP 是连接协议，function calling 是模型能力，插件是平台机制，RAG 是检索模式。",
      data: {
        columns: ["它解决什么", "谁来做适配", "典型风险"],
        rows: [
          { label: "MCP", values: ["跨应用、跨进程连接工具与数据", "server 作者 + 宿主客户端", "第三方 server 权限与投毒"] },
          { label: "Function calling", values: ["让模型发出结构化调用意图", "模型提供方 + 应用", "误调用、参数错误"] },
          { label: "插件", values: ["把外部服务接进某个平台", "平台 + 服务方", "平台锁定、审核风险"] },
          { label: "RAG", values: ["把相关资料检索进上下文", "应用/检索管线", "召回不准、引用失真"] },
        ],
      },
    },
  ],
  sources: [
    {
      id: "s1",
      title: "Introducing the Model Context Protocol",
      url: "https://www.anthropic.com/news/model-context-protocol",
      site: "Anthropic",
      snippet: "Anthropic 发布 MCP 的官方公告，提出开放协议与 USB-C 类比。",
      type: "official",
      publishedAt: "2024-11-25",
      accessedAt: ACCESSED,
      credibility: "high",
      score: 98,
      verified: true,
    },
    {
      id: "s2",
      title: "MCP Documentation — Introduction",
      url: "https://modelcontextprotocol.io/docs/getting-started/intro",
      site: "Model Context Protocol",
      snippet: "MCP 官方文档：host/client/server 架构、三类原语与基本概念。",
      type: "official",
      publishedAt: "2026-01-01",
      accessedAt: ACCESSED,
      credibility: "high",
      score: 97,
      verified: true,
    },
    {
      id: "s3",
      title: "MCP Specification (2025-06-18)",
      url: "https://modelcontextprotocol.io/specification/2025-06-18",
      site: "Model Context Protocol",
      snippet: "协议规范：JSON-RPC、传输、生命周期、能力协商与工具调用。",
      type: "official",
      publishedAt: "2025-06-18",
      accessedAt: ACCESSED,
      credibility: "high",
      score: 96,
      verified: true,
    },
    {
      id: "s4",
      title: "OpenAI Agents SDK — MCP",
      url: "https://openai.github.io/openai-agents-python/mcp/",
      site: "OpenAI",
      snippet: "OpenAI Agents SDK 的 MCP 接入文档，展示客户端如何连接 MCP server。",
      type: "official",
      publishedAt: "2025-03-11",
      accessedAt: ACCESSED,
      credibility: "high",
      score: 92,
      verified: true,
    },
    {
      id: "s5",
      title: "MCP Clients",
      url: "https://modelcontextprotocol.io/clients",
      site: "Model Context Protocol",
      snippet: "官方客户端目录，列出支持 MCP 的宿主应用与开发工具。",
      type: "official",
      publishedAt: "2026-01-01",
      accessedAt: ACCESSED,
      credibility: "medium",
      score: 84,
      verified: true,
    },
    {
      id: "s6",
      title: "MCP Security Best Practices",
      url: "https://modelcontextprotocol.io/specification/2025-06-18/basic/security_best_practices",
      site: "Model Context Protocol",
      snippet: "规范中的安全最佳实践，讨论混淆代理、token 透传与会话风险。",
      type: "official",
      publishedAt: "2025-06-18",
      accessedAt: ACCESSED,
      credibility: "high",
      score: 95,
      verified: true,
    },
    {
      id: "s7",
      title: "modelcontextprotocol/modelcontextprotocol",
      url: "https://github.com/modelcontextprotocol/modelcontextprotocol",
      site: "GitHub",
      snippet: "MCP 规范与文档的公开仓库。",
      type: "repository",
      publishedAt: "2024-11-25",
      accessedAt: ACCESSED,
      credibility: "high",
      score: 90,
      verified: true,
    },
  ],
  qa: {
    score: 86,
    verdict: "可交付；关于架构与机制的部分证据较强，关于「是否会成为统一标准」的判断仍需观察。",
    checks: [
      { id: "q1", label: "信息充分性", status: "pass", note: "7 个来源，覆盖官方公告、规范、文档、仓库与客户端目录。" },
      { id: "q2", label: "一手来源", status: "pass", note: "核心事实均能回溯到 Anthropic、MCP 官方文档或规范。" },
      { id: "q3", label: "对立/批评视角", status: "warn", note: "安全与治理的批评主要来自规范自身，独立第三方研究偏少。" },
      { id: "q4", label: "引用覆盖", status: "pass", note: "事实性段落均带引用；判断性段落明确标注为分析。" },
      { id: "q5", label: "逻辑跳跃", status: "pass", note: "区分了「协议被采用」和「协议成为默认」两种成功。" },
      { id: "q6", label: "伪对立", status: "pass", note: "没有把支持/反方压成二选一，保留了中间判断。" },
      { id: "q7", label: "反方压力测试", status: "pass", note: "把「只是可选插件通道」作为最强反方单独展开。" },
      { id: "q8", label: "剩余不确定性", status: "pass", note: "明确标注采纳规模缺少统一口径，判断置信度为中。" },
      { id: "q9", label: "可行动性", status: "pass", note: "分别给出开发者、普通用户、学习者的下一步。" },
      { id: "q10", label: "表达质量", status: "pass", note: "未使用套话；类比均标注为类比，不作为证据。" },
    ],
    limitations: [
      "公开资料以官方文档、规范和项目仓库为主，独立实证研究仍然偏少。",
      "采纳规模缺少统一口径的量化数据，报告只描述方向，不给出精确份额。",
      "安全风险在快速演变，风险清单不是穷举。",
    ],
  },
  methodologyNote:
    "本报告使用纵轴—横轴、第一性原理与钢人论证三副透镜；检索优先一手来源；质检重点检查引用覆盖、反方压力测试与证据门槛对称性。",
  limitations: [
    "官方资料占比高，独立批评视角仍然不足。",
    "采纳数据缺少统一口径，置信度为中。",
    "安全风险清单会随生态变化而过时。",
  ],
  sample: true,
};

export interface SampleEntry {
  slug: string;
  report: ReportDoc;
  blurb: string;
  accent: "vermilion" | "jade" | "gold";
}

export const SAMPLES: SampleEntry[] = [
  {
    slug: "mcp",
    report: mcpSample,
    blurb: "从接口碎片化到 Agent 底座：一份不吹不黑的 MCP 研究笔记。",
    accent: "vermilion",
  },
  {
    slug: "bayes",
    report: bayesSample,
    blurb: "从医学检测到蒙提霍尔：把反直觉的概率讲成一张表。",
    accent: "jade",
  },
  {
    slug: "prepared-dishes",
    report: preparedDishesSample,
    blurb: "定义、标准、营养与知情权：一份不站队的预制菜判断清单。",
    accent: "gold",
  },
  {
    slug: "greatness",
    report: greatnessSample,
    blurb: "目标、踏脚石与新奇性：一本 AI 研究者写的创新反面教材。",
    accent: "vermilion",
  },
];

export function getSample(slug: string): SampleEntry | undefined {
  return SAMPLES.find((item) => item.slug === slug || item.report.id === slug);
}
