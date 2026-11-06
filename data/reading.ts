import type { Depth, NarrativeStyle, ObjectKind, ReadingConfig, SectionRole } from "@/types";

export interface StyleMeta {
  id: NarrativeStyle;
  label: string;
  short: string;
  description: string;
  sample: string;
  bestFor: string;
  voice: string;
  opening: string;
  titles: string;
  titleExamples: string[];
  signature: string;
  pacing: string;
  ending: string;
  avoid: string;
}

export const STYLE_ORDER: NarrativeStyle[] = ["explain", "detective", "light"];

export const STYLES: Record<NarrativeStyle, StyleMeta> = {
  explain: {
    id: "explain",
    label: "讲透",
    short: "像朋友把一件事讲明白",
    description: "一条主线，因果推进。先让你看见问题，再一层层拆开。",
    sample: "你可能听过它，但真正的问题是：它为什么现在才被需要？",
    bestFor: "概念、书、复杂机制",
    voice: "像一个做过功课、会讲故事的朋友：有判断，但不端着；允许停顿、类比和一句吐槽。",
    opening: "用一个具体场景、困惑或反常识细节开场。不要用定义开场，也不要用“随着……的发展”。",
    titles: "小标题要像读者会问的问题，不要像论文目录；可以带一点口语。",
    titleExamples: ["它从哪来：一段有人的历史", "它怎么运转：拆开看", "两条线交汇：为什么是它，为什么是现在", "最强反方：它可能错在哪里"],
    signature: "因果推进：一个具体场景 → 一层层拆机制 → 回到开场的问题；长段与短句交替，至少一次回环呼应。",
    pacing: "一条主线推进；长段与短句交替；每个大段落后给读者一个可以喘气的具体例子。",
    ending: "回到开场的那个问题，给一个“现在能确认的底”，再留一个还没问到的问题。",
    avoid: "不要写成教科书、百科词条或咨询报告；不要连续三段都是抽象概括。",
  },
  detective: {
    id: "detective",
    label: "侦探",
    short: "从一个反常线索切入",
    description: "先给你一个不对劲的细节，再带着线索、假设和反证往下走。",
    sample: "有三个细节放在一起，怎么看都不对劲。",
    bestFor: "事件、争议、人物",
    voice: "像一个冷静的调查者：不急着下结论，先把线索摆出来；可以制造悬念，但不编造悬念。",
    opening: "用一个反常线索、矛盾数据或一句被反复引用但经不起推敲的话开场。",
    titles: "小标题可以有案件感，但不能标题党；每一个悬念后面都要有真实材料接住。",
    titleExamples: ["第一个不对劲的地方", "被忽略的线索", "最像真相的假设", "还差哪块拼图"],
    signature: "线索推进：先摆一个不对劲的细节 → 提出假设 → 用反证修正 → 给出更合理的解释；允许中途推翻自己，但不要故意藏答案。",
    pacing: "线索 → 假设 → 反证 → 更合理的解释；允许中途推翻自己，但不故意藏答案。",
    ending: "揭示目前最合理的判断，再指出哪个关键证据仍然缺失。",
    avoid: "不要为了悬念隐瞒已知答案；不要把推测写成案情；不要用“真相令人震惊”这类标题。",
  },
  light: {
    id: "light",
    label: "轻读",
    short: "短段、卡片、快问快答",
    description: "节奏轻，信息密度不低。适合先建立地图，再决定要不要深挖。",
    sample: "三句话：它是什么、谁在用、最大的坑在哪。",
    bestFor: "产品、趋势、生活话题",
    voice: "像一个说话利落、偶尔开玩笑的朋友：短句多，信息清楚，不装腔。",
    opening: "用三句话、一张图或一个快问快答开场；先给读者一张地图。",
    titles: "小标题短、具体、有动作感；可以用“它到底是什么”“谁在用它”“最大的坑”。",
    titleExamples: ["三句话认识它", "五个关键节点", "一张图看懂", "最大的坑", "下一步怎么挖"],
    signature: "地图先行：三句话或一张图开场 → 短段 + 对比卡/清单 → 用一句可带走的判断收尾；每 2—3 段换一种节奏。",
    pacing: "短段、列表、对比卡；每 2—3 段换一种节奏；不要连续大段论证。",
    ending: "给一张“你可以怎么用 / 怎么继续”的清单；不要用宏大总结收尾。",
    avoid: "不要为了轻快牺牲证据；不要用段子替代论证；不要把复杂问题压成一句口号。",
  },
};

export interface DepthMeta {
  id: Depth;
  label: string;
  short: string;
  minutes: string;
  words: string;
  sources: string;
  sections: string;
  calls: string;
  tokens: string;
  description: string;
}

export const DEPTH_ORDER: Depth[] = ["quick", "deep", "root"];

export const DEPTHS: Record<Depth, DepthMeta> = {
  quick: {
    id: "quick",
    label: "速览",
    short: "6—8 分钟",
    minutes: "6—8 分钟",
    words: "2,800—3,700 字",
    sources: "6—10 个来源",
    sections: "5 节正文",
    calls: "12—16 次调用",
    tokens: "约 50—80k token",
    description: "先建立地图：它是什么、从哪来、最大的争议和下一步。",
  },
  deep: {
    id: "deep",
    label: "深读",
    short: "15—20 分钟",
    minutes: "15—20 分钟",
    words: "6,800—9,000 字",
    sources: "12—16 个来源",
    sections: "9 节正文",
    calls: "20—26 次调用",
    tokens: "约 90—140k token",
    description: "默认档：纵轴、横轴和交汇都展开，读完能转述，也能继续追问。",
  },
  root: {
    id: "root",
    label: "追根",
    short: "25—30 分钟",
    minutes: "25—30 分钟",
    words: "11,000—13,500 字",
    sources: "18—24 个来源",
    sections: "9 节正文",
    calls: "28—36 次调用",
    tokens: "约 140—220k token",
    description: "把证据、反方和边界做到更细；正文仍然按读物写，不是论文。",
  },
};

export interface ObjectMeta {
  id: ObjectKind;
  label: string;
  short: string;
  examples: string[];
  vertical: string;
  horizontal: string;
  note: string;
}

export const OBJECT_ORDER: ObjectKind[] = ["concept", "product", "company", "person", "event", "phenomenon", "book", "work", "other"];

export const OBJECTS: Record<ObjectKind, ObjectMeta> = {
  concept: {
    id: "concept",
    label: "概念 / 技术",
    short: "概念",
    examples: ["MCP 到底是什么", "向量数据库怎么工作", "室温超导走到哪一步了"],
    vertical: "概念从哪来、谁提出、经历了哪些争论和范式变化。",
    horizontal: "相近概念、替代解释、适用边界，以及它最容易和什么混淆。",
    note: "最容易写成百科；必须给机制、误解和一个具体例子。",
  },
  product: {
    id: "product",
    label: "产品",
    short: "产品",
    examples: ["Notion 为什么能留住人", "一个突然火起来的新硬件"],
    vertical: "版本迭代、关键产品决策、用户增长与转折。",
    horizontal: "竞品、用户真实口碑、定价、生态位。",
    note: "用户声音优先于官方宣传；区分“能连上”和“真的好用”。",
  },
  company: {
    id: "company",
    label: "公司",
    short: "公司",
    examples: ["一家公司的转型是怎么发生的", "某家公司为什么被低估"],
    vertical: "创始人、融资、战略转向、组织变化。",
    horizontal: "商业模式、市场份额、竞争对手与监管环境。",
    note: "区分公司宣称、审计数据和第三方估计。",
  },
  person: {
    id: "person",
    label: "人物",
    short: "人物",
    examples: ["一个科学家的选择", "一位创作者为什么转向"],
    vertical: "个人经历、关键选择、公开言论与立场变化。",
    horizontal: "同代人对比、路线差异、争议与遗产。",
    note: "避免英雄化或妖魔化；把选择放回时代约束里。",
  },
  event: {
    id: "event",
    label: "事件",
    short: "事件",
    examples: ["一次引发争议的发布会", "一场政策调整的来龙去脉"],
    vertical: "前因、时间线、关键节点和后续影响。",
    horizontal: "各方叙事、调查证据、类似事件对比。",
    note: "先并列竞争性叙事，再做判断；不要把一方说法当事实。",
  },
  phenomenon: {
    id: "phenomenon",
    label: "现象",
    short: "现象",
    examples: ["为什么年轻人开始反向消费", "一个网络热词是怎么扩散的"],
    vertical: "现象何时出现、如何扩散、经历了哪些阶段。",
    horizontal: "类似现象、受影响群体、反例与替代解释。",
    note: "警惕只用一个宏观数据解释微观体验。",
  },
  book: {
    id: "book",
    label: "书",
    short: "书",
    examples: ["《为什么伟大不能被计划》讲了什么", "一本经典为什么现在仍值得读"],
    vertical: "作者轨迹、写作语境、与前作/时代的关系。",
    horizontal: "相近的书、学派、书评与批评。",
    note: "写读书报告，不是章节摘要；只用公开资料和短引用。",
  },
  work: {
    id: "work",
    label: "作品",
    short: "作品",
    examples: ["一部电影为什么被反复讨论", "一款游戏的设计选择"],
    vertical: "创作者轨迹、创作语境、版本/续作变化。",
    horizontal: "同类作品、流派、观众/玩家评价与批评。",
    note: "区分作品本身、创作者意图和观众解读。",
  },
  other: {
    id: "other",
    label: "其他",
    short: "其他",
    examples: ["一个说不清归类但很好奇的东西"],
    vertical: "按问题定制：它从哪来、经历了什么。",
    horizontal: "按问题定制：它和什么相似、差异在哪。",
    note: "明确标注非标准对象，不要硬套模板。",
  },
};

export interface PlannedSection {
  role: SectionRole;
  title: string;
  kicker: string;
  purpose: string;
  takeaway: string;
  wordTarget: number;
  figureId?: string;
}

const GENERAL_DEEP: PlannedSection[] = [
  { role: "hook", title: "一个不对劲的地方", kicker: "开场", purpose: "用一个具体场景、反差或问题把读者拉进来，说明为什么现在值得读。", takeaway: "读者知道这篇文章要追的问题。", wordTarget: 400 },
  { role: "definition", title: "一句话说清：它是什么，不是什么", kicker: "定义", purpose: "建立边界，拆掉三个常见混淆，给一个准确但不循环的定义。", takeaway: "读者能用一句话向别人解释它。", wordTarget: 600 },
  { role: "origin", title: "它从哪来：一段有人的历史", kicker: "来路", purpose: "讲清起源、关键人物、约束、转折和决策逻辑；写成故事，不写年表。", takeaway: "读者理解它为什么会长成今天这样。", wordTarget: 1000, figureId: "fig-timeline" },
  { role: "mechanism", title: "它怎么运转：拆开看", kicker: "机制", purpose: "拆机制、关键概念和一个生活类比，并说明类比在哪里不成立。", takeaway: "读者能复述它的基本运作方式。", wordTarget: 850, figureId: "fig-concept" },
  { role: "landscape", title: "它在版图里：和谁像，哪里不一样", kicker: "坐标", purpose: "对比相近概念/替代方案，给出用户真实声音或使用场景，说明它的生态位。", takeaway: "读者知道它和什么容易混淆、什么时候该用哪个。", wordTarget: 900, figureId: "fig-matrix" },
  { role: "intersection", title: "两条线交汇：为什么是它，为什么是现在", kicker: "交汇", purpose: "把纵向来路和横向坐标交叉，解释今天的优势/劣势分别来自哪里。", takeaway: "读者获得一个不能从单章得到的新判断。", wordTarget: 800 },
  { role: "debate", title: "最强反方：它可能错在哪里", kicker: "反方", purpose: "用钢人方式写出最强反方、证据缺口和什么会改变判断。", takeaway: "读者知道该保留哪些怀疑。", wordTarget: 800 },
  { role: "future", title: "接下来会怎样：三种可能", kicker: "推演", purpose: "给出最可能/最危险/最乐观三种走向，各配一个可观察信号；不适合时改为“它可能怎么演化”。", takeaway: "读者知道接下来该看什么信号。", wordTarget: 600 },
  { role: "bottom", title: "问到哪儿了：底与未解之谜", kicker: "收束", purpose: "总结目前能确认的底、合理判断和真正未知，给一句可以带走的判断。", takeaway: "读者知道该信什么、还该继续问什么。", wordTarget: 350 },
  { role: "credibility", title: "这篇报告的可信度", kicker: "说明", purpose: "用五个信号说明来源、反方、推断、未知和时效；保留来源清单与局限。", takeaway: "读者能判断这篇读物能信到什么程度。", wordTarget: 300 },
];

const BOOK_DEEP: PlannedSection[] = [
  { role: "hook", title: "这本书为什么值得现在读", kicker: "开场", purpose: "用一个具体问题、时代背景或阅读困惑开场，说明为什么现在读这本书。", takeaway: "读者知道这本书和当下的关系。", wordTarget: 500 },
  { role: "definition", title: "这本书在问什么", kicker: "问题", purpose: "说清作者的问题意识、核心主张和最容易误解的地方，不做章节摘要。", takeaway: "读者能用一句话说出这本书想解决什么。", wordTarget: 700 },
  { role: "origin", title: "作者从哪来，这本书怎么长出来", kicker: "来路", purpose: "讲作者轨迹、时代语境、写作动机和与前作/争论的关系。", takeaway: "读者理解这本书为什么由这个人、在这个时间写出来。", wordTarget: 1000, figureId: "fig-timeline" },
  { role: "mechanism", title: "论证怎么走：一张论证地图", kicker: "论证", purpose: "拆核心概念、推理链、关键例子和前提假设，让读者看见论证结构。", takeaway: "读者能复述作者的论证，而不是只记住金句。", wordTarget: 1100, figureId: "fig-concept" },
  { role: "landscape", title: "它在版图里：和哪些书/学派对话", kicker: "坐标", purpose: "对比相近的书、对立学派、作者没点名但真正在回应的人。", takeaway: "读者知道这本书在知识地图上的位置。", wordTarget: 1000, figureId: "fig-matrix" },
  { role: "intersection", title: "两条线交汇：为什么是这本书，为什么是现在", kicker: "交汇", purpose: "把作者轨迹和时代问题交叉，解释它填补了什么空白、又受什么限制。", takeaway: "读者获得一个超出书评摘要的判断。", wordTarget: 850 },
  { role: "debate", title: "最强的批评是什么", kicker: "反方", purpose: "整理书评、学术批评、反例和作者未回应的部分，给出克制的判断。", takeaway: "读者知道这本书最脆弱的地方。", wordTarget: 850 },
  { role: "future", title: "它改变了什么，还可能改变什么", kicker: "影响", purpose: "讲影响、误读、后续讨论和今天的相关性。", takeaway: "读者知道这本书在今天还有什么用。", wordTarget: 650 },
  { role: "bottom", title: "怎么读这本书 / 问到哪儿了", kicker: "读法", purpose: "给三种读法、值得带走的短句、读到哪一章可以停，以及下一步读什么。", takeaway: "读者知道该怎么读、接下来读什么。", wordTarget: 500 },
  { role: "credibility", title: "这篇读书报告的可信度", kicker: "说明", purpose: "说明来源、书评覆盖、引用边界和哪些判断是推断。", takeaway: "读者知道这篇读书报告的边界。", wordTarget: 300 },
];

const QUICK_GENERAL: PlannedSection[] = [
  { role: "hook", title: "一个值得追的问题", kicker: "开场", purpose: "用一个具体场景或问题开场，顺手给出定义和边界。", takeaway: "读者知道它是什么、为什么值得读。", wordTarget: 400 },
  { role: "origin", title: "它从哪来", kicker: "来路", purpose: "用一条简洁的时间线讲清起源、关键转折和为什么是现在。", takeaway: "读者理解它的来路。", wordTarget: 450, figureId: "fig-timeline" },
  { role: "mechanism", title: "它怎么运转，和谁不一样", kicker: "机制与坐标", purpose: "拆基本机制，并用一两个对比对象说明它的位置。", takeaway: "读者能复述机制和差异。", wordTarget: 550, figureId: "fig-concept" },
  { role: "intersection", title: "交汇处，以及最强的反方", kicker: "交汇与争议", purpose: "给出横纵交汇的判断，并认真处理最强反方。", takeaway: "读者知道该信什么、该怀疑什么。", wordTarget: 450 },
  { role: "bottom", title: "问到哪儿了", kicker: "收束", purpose: "总结底、未知和下一步。", takeaway: "读者知道接下来该看什么。", wordTarget: 350 },
  { role: "credibility", title: "这篇报告的可信度", kicker: "说明", purpose: "简要说明来源、反方、推断、未知和时效。", takeaway: "读者知道这篇读物的边界。", wordTarget: 300 },
];

const QUICK_BOOK: PlannedSection[] = [
  { role: "hook", title: "这本书为什么值得读", kicker: "开场", purpose: "用一个问题或时代背景开场，给出这本书的问题意识和一句话判断。", takeaway: "读者知道这本书在问什么。", wordTarget: 400 },
  { role: "origin", title: "作者与写作语境", kicker: "来路", purpose: "讲作者轨迹、写作动机和时代背景。", takeaway: "读者理解这本书的来路。", wordTarget: 450 },
  { role: "mechanism", title: "论证地图，以及它在版图里", kicker: "论证与坐标", purpose: "拆论证结构，并用相近书/学派定位它。", takeaway: "读者能复述论证和位置。", wordTarget: 600 },
  { role: "intersection", title: "交汇处，以及最强的批评", kicker: "交汇与批评", purpose: "把作者轨迹和时代问题交叉，并处理最强批评。", takeaway: "读者知道这本书的价值和脆弱处。", wordTarget: 500 },
  { role: "bottom", title: "怎么读，问到哪儿了", kicker: "读法", purpose: "给读法、短句、下一步读什么，以及仍未解决的问题。", takeaway: "读者知道该怎么读、接下来读什么。", wordTarget: 350 },
  { role: "credibility", title: "这篇读书报告的可信度", kicker: "说明", purpose: "说明来源、书评覆盖和引用边界。", takeaway: "读者知道这篇读书报告的边界。", wordTarget: 300 },
];

export function sectionPlan(objectKind: ObjectKind, depth: Depth): PlannedSection[] {
  if (depth === "quick") return objectKind === "book" || objectKind === "work" ? QUICK_BOOK : QUICK_GENERAL;
  const base = objectKind === "book" || objectKind === "work" ? BOOK_DEEP : GENERAL_DEEP;
  // 真实模型成稿通常比目标长约 7%，这里反算预算，保证最终时长落在档位内。
  if (depth === "deep") {
    return base.map((section) => ({
      ...section,
      wordTarget: Math.round(section.wordTarget * 0.93),
    }));
  }
  if (depth === "root") {
    return base.map((section) => ({
      ...section,
      wordTarget: Math.round(section.wordTarget * 1.45),
    }));
  }
  return base;
}

export function resolveReading(reading?: Partial<ReadingConfig>, depth?: Depth): ReadingConfig {
  const style = reading?.style && STYLES[reading.style] ? reading.style : "explain";
  const nextDepth = reading?.depth && DEPTHS[reading.depth] ? reading.depth : depth && DEPTHS[depth] ? depth : "deep";
  return {
    style,
    depth: nextDepth,
    focus: reading?.focus?.trim() || undefined,
  };
}

export function normalizeObjectKind(value: string | undefined | null): ObjectKind {
  const clean = (value ?? "").trim().toLowerCase();
  if (!clean) return "other";
  if ((OBJECT_ORDER as string[]).includes(clean)) return clean as ObjectKind;
  const map: Record<string, ObjectKind> = {
    概念: "concept",
    技术: "concept",
    科学: "concept",
    产品: "product",
    公司: "company",
    企业: "company",
    人物: "person",
    事件: "event",
    政策: "event",
    现象: "phenomenon",
    社会现象: "phenomenon",
    书: "book",
    书籍: "book",
    著作: "book",
    作品: "work",
    电影: "work",
    游戏: "work",
  };
  return map[clean] ?? (clean.includes("书") ? "book" : clean.includes("作品") ? "work" : "other");
}

export function styleLabel(style: NarrativeStyle): string {
  return STYLES[style]?.label ?? "讲透";
}

export function depthLabel(depth: Depth): string {
  return DEPTHS[depth]?.label ?? "深读";
}

export function objectLabel(kind: ObjectKind): string {
  return OBJECTS[kind]?.label ?? "其他";
}

export function roleLabel(role: SectionRole): string {
  const labels: Record<SectionRole, string> = {
    hook: "开场",
    definition: "定义",
    origin: "来路",
    mechanism: "机制",
    landscape: "坐标",
    intersection: "交汇",
    debate: "反方",
    future: "推演",
    bottom: "收束",
    credibility: "说明",
    other: "其他",
  };
  return labels[role] ?? "其他";
}
