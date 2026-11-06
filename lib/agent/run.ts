import { z } from "zod";
import type {
  AppSettings,
  Claim,
  Conflict,
  Credibility,
  Debate,
  Depth,
  FrameworkChoice,
  NarrativeStyle,
  ObjectKind,
  OutlineSection,
  QACheck,
  QAResult,
  ReadingConfig,
  ReportBlock,
  ReportDoc,
  ReportFigure,
  ReportOutline,
  ReportSection,
  ResearchEvent,
  ResearchPlan,
  ResearchRun,
  Scene,
  SectionRole,
  Source,
  SourceType,
  Synthesis,
} from "@/types";
import { chatOnce, LLMError, type ChatMessage } from "@/lib/llm";
import { parseJsonLoose } from "@/lib/json";
import { estimateCost, providerLabel } from "@/data/providers";
import { DEPTHS, normalizeObjectKind, resolveReading, sectionPlan, STYLES } from "@/data/reading";
import { deriveCredibility, trustLevelLabel } from "@/lib/credibility";
import { gradeRank, sourceGrade } from "@/lib/source-grade";
import { fetchSource, ResearchApiError, searchSources } from "./api";
import {
  bareSchema,
  claimsSchema,
  debatesSchema,
  frameworksSchema,
  outlineSchema,
  planSchema,
  qaSchema,
  rerankSchema,
  sectionSchema,
  synthesisSchema,
} from "./schemas";
import {
  bareMessages,
  claimMessages,
  debateMessages,
  frameworkMessages,
  outlineMessages,
  planMessages,
  qaMessages,
  rerankMessages,
  sectionMessages,
  synthesisMessages,
} from "./prompts";

const STAGE_ORDER = ["intake", "bare", "search", "evidence", "verify", "frameworks", "debate", "outline", "write", "qa", "typeset"] as const;

const MAX_CALLS: Record<Depth, number> = { quick: 18, deep: 42, root: 58 };
const MAX_TOKENS: Record<Depth, number> = { quick: 300_000, deep: 900_000, root: 1_400_000 };

const BANNED = [
  "综上所述",
  "值得注意的是",
  "不难发现",
  "本质上",
  "换句话说",
  "这意味着",
  "首先，",
  "其次，",
  "最后，",
  "赋能",
  "抓手",
  "闭环",
  "底层逻辑",
];

const TYPE_LABELS: Record<SourceType, string> = {
  encyclopedia: "百科",
  paper: "论文",
  official: "官方/规范",
  repository: "代码仓库",
  community: "社区",
  web: "网页",
  book: "书籍",
};

export class AgentError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "AgentError";
    this.code = code;
  }
}

export interface RunResearchOptions {
  run: ResearchRun;
  settings: AppSettings;
  apiKey: string;
  demoToken?: string;
  signal: AbortSignal;
  onUpdate: (run: ResearchRun) => void;
  onReport: (report: ReportDoc) => void | Promise<void>;
}

function cloneRun(run: ResearchRun): ResearchRun {
  return {
    ...run,
    stages: run.stages.map((stage) => ({ ...stage })),
    events: [...run.events],
    sources: [...run.sources],
    claims: [...run.claims],
    conflicts: [...run.conflicts],
    debates: [...run.debates],
    frameworks: [...run.frameworks],
    sections: run.sections ? [...run.sections] : [],
    stats: { ...run.stats },
    plan: run.plan
      ? {
          ...run.plan,
          questions: run.plan.questions.map((item) => ({ ...item })),
          queries: run.plan.queries.map((item) => ({ ...item })),
          cautions: [...run.plan.cautions],
        }
      : undefined,
    bareThinking: run.bareThinking
      ? { ...run.bareThinking, assumptions: [...run.bareThinking.assumptions], analogies: [...run.bareThinking.analogies] }
      : undefined,
    synthesis: run.synthesis
      ? {
          ...run.synthesis,
          consensus: run.synthesis.consensus.map((item) => ({ ...item })),
          conflicts: run.synthesis.conflicts.map((item) => ({ ...item })),
          gaps: [...run.synthesis.gaps],
          sourceNotes: run.synthesis.sourceNotes.map((item) => ({ ...item })),
          answerMap: run.synthesis.answerMap.map((item) => ({ ...item })),
        }
      : undefined,
    outline: run.outline ? { ...run.outline, sections: run.outline.sections.map((item) => ({ ...item })) } : undefined,
    qa: run.qa ? { ...run.qa } : undefined,
  };
}

function textOfBlocks(blocks: ReportBlock[]): string {
  return blocks
    .map((block) => {
      if (block.type === "p" || block.type === "h3" || block.type === "keyline") return block.text;
      if (block.type === "callout") return block.text;
      if (block.type === "list") return block.items.join(" ");
      if (block.type === "quote") return block.text;
      if (block.type === "table") return block.rows.flat().join(" ");
      if (block.type === "steps") return block.items.map((item) => `${item.title}：${item.text}`).join(" ");
      if (block.type === "judgment") return [block.label, block.text, block.changeMyMind].filter(Boolean).join(" ");
      if (block.type === "mythFact") return block.items.map((item) => `${item.myth} ${item.fact} ${item.note ?? ""}`).join(" ");
      if (block.type === "furtherReading") return block.items.map((item) => `${item.title} ${item.why}`).join(" ");
      if (block.type === "scenario") return block.items.map((item) => `${item.name} ${item.text} ${item.signal}`).join(" ");
      return "";
    })
    .join("\n");
}

function sourceType(value: string): SourceType {
  return value === "paper" || value === "official" || value === "repository" || value === "community" || value === "encyclopedia" || value === "book"
    ? value
    : "web";
}

function sourceCredibility(value: string): "high" | "medium" | "low" {
  return value === "high" || value === "low" ? value : "medium";
}

function canonicalUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    for (const key of [...parsed.searchParams.keys()]) {
      if (/^(utm_|from|ref|source|spm|tag)/i.test(key)) parsed.searchParams.delete(key);
    }
    return parsed.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function isBookPageUrl(url: string): boolean {
  try {
    return BOOK_PAGE_HOST.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

function normalizeSource(raw: Omit<Source, "id" | "accessedAt">, id: string): Source {
  return {
    id,
    title: (raw.title || "未命名来源").slice(0, 260),
    url: raw.url,
    site: (raw.site || new URL(raw.url).hostname).slice(0, 120),
    snippet: (raw.snippet || "").slice(0, 600),
    type: sourceType(raw.type),
    publishedAt: raw.publishedAt,
    accessedAt: Date.now(),
    credibility: sourceCredibility(raw.credibility),
    score: Number.isFinite(raw.score) ? raw.score : 50,
    query: raw.query,
    grade: raw.grade,
    bias: raw.bias,
    via: raw.via,
    verified: false,
  };
}

const TOPIC_STOPWORDS = new Set(["什么", "到底", "是什", "的", "了吗", "怎么", "为什", "如何", "最新", "一个", "这个", "那个", "以及", "还是", "我们", "你的", "有什", "么关", "关系"]);
const ENGLISH_STOPWORDS = new Set(["the", "and", "for", "with", "from", "why", "what", "how", "book", "author", "review", "criticism", "evidence", "limitations", "argument", "study", "research", "paper"]);
const JUNK_TITLE = /(登录|注册|邮箱账号|账号登录|搜索结果|404|not found|access denied|验证码|下载客户端|请稍候|页面不存在|client challenge|just a moment|attention required|enable javascript|verify you are human|checking your browser)/i;
const JUNK_HOST = /(mail\.qq\.com|passport\.|login\.|account\.|accounts\.google\.|signin\.)/i;
const CHALLENGE_TEXT = /(client challenge|just a moment|enable javascript and cookies|verify you are human|checking your browser|cf-browser-verification)/i;
const BOOK_PAGE_HOST = /(^|\.)book\.douban\.com$|(^|\.)read\.douban\.com$|(^|\.)openlibrary\.org$|(^|\.)books\.google\.com$|(^|\.)goodreads\.com$/i;

function topicTokens(topic: string): string[] {
  const lowerTopic = topic.toLowerCase();
  const latin = (topic.match(/[A-Za-z][A-Za-z0-9.+#-]{1,}/g) ?? [])
    .map((token) => token.toLowerCase())
    .filter((token) => !ENGLISH_STOPWORDS.has(token));
  const chinese = [...topic].filter((char) => /[一-鿿]/.test(char));
  const bigrams: string[] = [];
  for (let index = 0; index < chinese.length - 1; index += 1) {
    const bigram = chinese[index] + chinese[index + 1];
    if (!TOPIC_STOPWORDS.has(bigram)) bigrams.push(bigram);
  }
  const aliases = lowerTopic.includes("mcp") ? ["model context protocol", "context protocol"] : [];
  return [...new Set([...latin, ...bigrams, ...aliases])].slice(0, 16);
}

function normalizeTitleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[\s《》〈〉「」『』"'“”‘’·:：|｜/\\\-—_()（）\[\]【】,.，。!！?？]/g, "")
    .slice(0, 48);
}

function coreTitle(topic: string): string | null {
  const match = topic.match(/《([^》]{2,40})》/);
  return match?.[1]?.trim() ?? null;
}

function isJunkSource(source: Source, topic: string): boolean {
  const title = source.title.toLowerCase();
  const topicLower = topic.toLowerCase();
  if (JUNK_HOST.test(source.url.toLowerCase())) return true;
  const junkTitle = JUNK_TITLE.test(title) || /^(首页|导航|登录|注册|搜索)$/.test(source.title.trim());
  if (!junkTitle) return false;
  return !/(登录|注册|邮箱|账号|首页|导航)/.test(topicLower);
}

function isRelevantSource(source: Source, tokens: string[], topic: string): boolean {
  if (isJunkSource(source, topic)) return false;
  if (tokens.length === 0) return true;
  const haystack = `${source.title} ${source.snippet}`.toLowerCase();
  const core = coreTitle(topic);
  if (core) {
    const normalizedCore = normalizeTitleKey(core);
    if (normalizeTitleKey(`${source.title} ${source.snippet}`).includes(normalizedCore)) return true;
    const hits = tokens.filter((token) => haystack.includes(token)).length;
    return hits >= Math.min(3, tokens.length);
  }
  return tokens.some((token) => haystack.includes(token));
}

function ruleRelevance(source: Source, tokens: string[], topic: string): number {
  const title = normalizeTitleKey(source.title);
  const body = normalizeTitleKey(`${source.title} ${source.snippet}`);
  const core = coreTitle(topic);
  let score = 0;
  if (core && title.includes(normalizeTitleKey(core))) score += 3;
  else if (core && body.includes(normalizeTitleKey(core))) score += 1;
  const titleHits = tokens.filter((token) => title.includes(token)).length;
  const bodyHits = tokens.filter((token) => body.includes(token)).length;
  score += Math.min(2, titleHits * 0.65);
  score += Math.min(1.5, bodyHits * 0.22);
  return Math.max(0, Math.min(5, score));
}

function selectSources(sources: Source[], depth: Depth, topic: string, focus: string[] = []): Source[] {
  const cap = depth === "root" ? 20 : depth === "deep" ? 14 : 8;
  const webQuota = depth === "root" ? 8 : depth === "deep" ? 6 : 4;
  const tokens = [...new Set([...topicTokens(topic), ...focus.flatMap((text) => topicTokens(text))])].slice(0, 40);
  const clean = sources.filter((source) => !isJunkSource(source, topic));
  const relevant = clean.filter((source) => isRelevantSource(source, tokens, topic));
  const pool = relevant.length > 0 ? relevant : clean.length > 0 ? clean : sources;
  const graded = pool.map((source) => {
    const reranked = typeof source.relevance === "number";
    return {
      ...source,
      grade: source.grade ?? sourceGrade(source),
      relevance: reranked ? source.relevance! : ruleRelevance(source, tokens, topic),
      reranked,
    };
  });
  const hasReranked = graded.some((source) => source.reranked);
  const filtered = hasReranked ? graded.filter((source) => source.reranked && source.relevance >= 2.5) : graded;
  const rankedFallback = [...graded]
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, Math.min(4, graded.length));
  const usable = filtered.length >= 3 ? filtered : rankedFallback;
  const sorted = [...usable].sort((a, b) => {
    const relevanceDiff = b.relevance - a.relevance;
    if (relevanceDiff !== 0) return relevanceDiff;
    const gradeDiff = gradeRank(a.grade) - gradeRank(b.grade);
    if (gradeDiff !== 0) return gradeDiff;
    const viaDiff = (a.via === "deepseek" ? 0 : 1) - (b.via === "deepseek" ? 0 : 1);
    if (viaDiff !== 0) return viaDiff;
    if (Boolean(a.verified) !== Boolean(b.verified)) return a.verified ? -1 : 1;
    return b.score - a.score;
  });
  const selected: Source[] = [];
  const seen = new Set<string>();
  const titleCounts = new Map<string, number>();
  const add = (source: Source): boolean => {
    const key = canonicalUrl(source.url);
    if (seen.has(key) || selected.length >= cap) return false;
    const titleKey = normalizeTitleKey(source.title);
    const titleLimit = source.type === "encyclopedia" ? 1 : 2;
    const dedupeTitle = source.type !== "official" && source.type !== "paper" && source.type !== "repository";
    if (dedupeTitle && titleKey.length >= 8 && (titleCounts.get(titleKey) ?? 0) >= titleLimit) return false;
    if (source.type === "encyclopedia" && tokens.length > 0 && !tokens.some((token) => source.title.toLowerCase().includes(token))) return false;
    seen.add(key);
    if (dedupeTitle && titleKey.length >= 8) titleCounts.set(titleKey, (titleCounts.get(titleKey) ?? 0) + 1);
    selected.push(source);
    return true;
  };
  let webCount = 0;
  const takeWeb = (list: Source[], limit: number) => {
    for (const source of list) {
      if (webCount >= limit) break;
      if (add(source)) webCount += 1;
    }
  };

  takeWeb(sorted.filter((source) => source.type === "web"), webQuota);
  for (const source of sorted.filter((item) => item.type !== "web")) add(source);
  for (const source of sorted) add(source);

  return selected.sort((a, b) => {
    const relevanceDiff = (b.relevance ?? ruleRelevance(b, tokens, topic)) - (a.relevance ?? ruleRelevance(a, tokens, topic));
    if (relevanceDiff !== 0) return relevanceDiff;
    const gradeDiff = gradeRank(a.grade ?? sourceGrade(a)) - gradeRank(b.grade ?? sourceGrade(b));
    if (gradeDiff !== 0) return gradeDiff;
    return b.score - a.score;
  });
}

function shouldFetch(source: Source): boolean {
  if (source.type === "repository" || source.type === "community" || source.type === "book") return false;
  return Boolean(source.url);
}

function groupQueries(plan: ResearchPlan, depth: Depth): string[][] {
  const queries = plan.queries.map((item) => item.query).filter(Boolean);
  const groupCount = depth === "root" ? 4 : depth === "deep" ? 3 : 2;
  const groups: string[][] = [];
  const size = Math.ceil(queries.length / groupCount);
  for (let index = 0; index < queries.length; index += size) groups.push(queries.slice(index, index + size));
  return groups.length > 0 ? groups : [["" + plan.oneLiner]];
}

function normalizeSourceId(value: string, sources: Source[]): string | null {
  const clean = value.trim().toLowerCase().replace(/^\[|\]$/g, "");
  const direct = sources.find((source) => source.id.toLowerCase() === clean || source.id.toLowerCase() === `s${clean}`);
  if (direct) return direct.id;
  const numeric = clean.match(/\d+/)?.[0];
  if (numeric) {
    const byNumber = sources.find((source) => source.id === `s${numeric}`);
    if (byNumber) return byNumber.id;
  }
  return null;
}

function normalizeIds(ids: string[], sources: Source[]): string[] {
  return [...new Set(ids.map((id) => normalizeSourceId(id, sources)).filter((id): id is string => Boolean(id)))];
}

function claimText(claim: Claim): string {
  return claim.text;
}

function fallbackPlan(topic: string, scene: Scene, depth: Depth, objectKind: ObjectKind = "concept"): ResearchPlan {
  const isBook = objectKind === "book" || objectKind === "work";
  const queries = isBook
    ? [
        `${topic} 作者 写作背景`,
        `${topic} 核心观点 论证`,
        `${topic} 书评 评价`,
        `${topic} 批评 争议`,
        `${topic} 同类 书 对比`,
        `${topic} 作者 访谈`,
      ]
    : scene === "life"
      ? [
          `${topic} 是什么 最新`,
          `${topic} 官方 文件 标准`,
          `${topic} 争议 风险`,
          `${topic} 对普通人 影响 怎么判断`,
          `${topic} 辟谣 专家`,
        ]
      : [
          `${topic} 是什么`,
          `${topic} 起源 历史`,
          `${topic} 原理 机制`,
          `${topic} 争议 批评`,
          `${topic} 对比 替代`,
          `${topic} 2026 最新`,
        ];
  return {
    topic,
    oneLiner: isBook ? `${topic} 是一本需要放在作者、时代与争论里读的书。` : `${topic} 是一个需要从定义、机制、证据与争议四个层面理解的概念。`,
    type: isBook ? "书/作品" : "概念",
    objectKind,
    audience: "聪明、好奇、没有专业背景的读者",
    questions: [
      { id: "q1", question: isBook ? "这本书在问什么，最容易误解的地方是什么？" : `它到底是什么，最容易和什么混淆？`, why: "先建立准确边界" },
      { id: "q2", question: "它从哪来，为什么是现在？", why: "理解时间脉络" },
      { id: "q3", question: isBook ? "作者的论证怎么走，哪一步最脆弱？" : "它怎么运作，关键机制是什么？", why: "避免只记住口号" },
      { id: "q4", question: "支持它的最强证据是什么，反方最强论点是什么？", why: "判断可信度" },
      { id: "q5", question: "对我意味着什么，我该怎么继续判断？", why: "把理解变成行动" },
    ],
    queries: queries.slice(0, depth === "root" ? 8 : depth === "deep" ? 6 : 4).map((query, index) => ({
      query,
      intent: index === 0 ? "definition" : index === 1 ? "origin" : index === 2 ? "mechanism" : index === 3 ? "criticism" : "practice",
      sources: ["wiki", "web"],
    })),
    cautions: ["区分事实与营销话术", "不要用单一来源下结论"],
  };
}

function fallbackSynthesis(claims: Claim[], plan: ResearchPlan): Synthesis {
  const byTopic = new Map<string, Claim[]>();
  for (const claim of claims) {
    const key = claim.topic || "整体判断";
    byTopic.set(key, [...(byTopic.get(key) ?? []), claim]);
  }
  const consensus: Synthesis["consensus"] = [];
  const conflicts: Synthesis["conflicts"] = [];
  for (const [topic, items] of byTopic) {
    const support = items.filter((item) => item.stance === "support");
    const oppose = items.filter((item) => item.stance === "oppose");
    if (support.length >= 2 && oppose.length === 0) {
      consensus.push({ topic, summary: support[0].text, evidenceIds: [...new Set(support.map((item) => item.sourceId))], confidence: "medium" });
    }
    if (support.length > 0 && oppose.length > 0) {
      conflicts.push({
        topic,
        positions: [
          { label: "支持", argument: support[0].text, evidenceIds: [...new Set(support.map((item) => item.sourceId))] },
          { label: "质疑", argument: oppose[0].text, evidenceIds: [...new Set(oppose.map((item) => item.sourceId))] },
        ],
        whyItMatters: "这决定我们该不该把这条说法当成事实。",
        verdict: "现有证据不足以判断方向，需要更多独立来源。",
        confidence: "low",
        evidenceIds: [...new Set(items.map((item) => item.sourceId))],
      });
    }
  }
  return {
    consensus: consensus.slice(0, 5),
    conflicts: conflicts.slice(0, 4),
    gaps: claims.length < 6 ? ["独立来源仍然不足，结论需要更多交叉验证。"] : ["部分关键机制缺少一手数据。"],
    sourceNotes: [],
    answerMap: plan.questions.map((question) => ({
      questionId: question.id,
      answer: "现有证据有限，报告在对应章节标注了不确定性。",
      confidence: "low",
      evidenceIds: [],
    })),
    synthesisNote: "证据综合模型没有返回结构化结果，以下是基于原始证据账本的保守整理。",
  };
}

function fallbackFrameworks(plan: ResearchPlan): FrameworkChoice[] {
  return [
    {
      name: "纵轴—横轴",
      why: "任何陌生概念都需要先看它从哪来，再看它今天和谁站在一起。",
      reveals: "时间线给出因果，横向对比给出位置；但它看不到具体机制。",
    },
    {
      name: "第一性原理",
      why: `如果 ${plan.type} 的说法听起来很宏大，就需要拆回机制、成本和约束。`,
      reveals: "能识别哪些承诺受物理/成本/组织约束，哪些只是叙事。",
    },
    {
      name: "钢人论证",
      why: "争议越大，越要把双方最强的版本写出来，而不是挑软柿子。",
      reveals: "能区分「证据支持」与「听起来有道理」，但需要足够多的独立来源。",
    },
  ];
}

function fallbackOutline(topic: string, scene: Scene, reading: ReadingConfig, plan: ResearchPlan, synthesis: Synthesis, claims: Claim[]): ReportOutline {
  const objectKind = plan.objectKind ?? "other";
  const contentPlan = sectionPlan(objectKind, reading.depth).filter((section) => section.role !== "credibility");
  const sections = contentPlan.map((planned, index) => ({
    id: `s${index + 1}`,
    role: planned.role,
    title: planned.title,
    kicker: planned.kicker,
    purpose: planned.purpose,
    takeaway: planned.takeaway,
    points: [
      synthesis.consensus[index % Math.max(1, synthesis.consensus.length)]?.summary ?? plan.questions[index]?.question ?? planned.purpose,
      claims[index * 2]?.text ?? "公开资料仍然有限，需要标注不确定性。",
      "给出一个读者能带走的判断或下一步。",
    ],
    evidenceIds: [
      ...new Set([
        ...(synthesis.consensus[index % Math.max(1, synthesis.consensus.length)]?.evidenceIds ?? []),
        ...claims.slice(index * 2, index * 2 + 2).map((claim) => claim.sourceId),
      ]),
    ],
    figureId: planned.figureId,
  }));
  const isBook = objectKind === "book" || objectKind === "work";
  return {
    title: isBook ? `${topic}：一份把它读透的读书报告` : `${topic}：一篇把它问到底的读物`,
    subtitle: isBook ? "作者、论证、批评与怎么读" : scene === "life" ? "它是什么，证据够不够，对你意味着什么" : "从来路到版图，再到交汇处",
    oneLiner: plan.oneLiner,
    tldr: [
      plan.oneLiner,
      synthesis.conflicts[0]?.verdict || "公开资料里最值得注意的不是结论，而是证据的强弱差异。",
      scene === "life" ? "先分清事实、营销与风险，再决定要不要行动。" : "先建立机制直觉，再去读一手资料。",
    ],
    keyQuestions: plan.questions.slice(0, 5).map((item) => item.question),
    tags: ["问底", DEPTHS[reading.depth].label, isBook ? "读书报告" : plan.type].slice(0, 4),
    sections,
    figureBriefs: {},
  };
}

type RawOutline = Omit<ReportOutline, "sections"> & {
  sections: Array<Omit<OutlineSection, "id"> & { id?: string }>;
};

function normalizeOutline(raw: RawOutline, plan: ResearchPlan, reading: ReadingConfig): ReportOutline {
  const objectKind = plan.objectKind ?? "other";
  const contentPlan = sectionPlan(objectKind, reading.depth).filter((section) => section.role !== "credibility");
  const byRole = new Map<SectionRole, RawOutline["sections"][number]>();
  for (const section of raw.sections) {
    if (section.role && section.role !== "other" && !byRole.has(section.role)) byRole.set(section.role, section);
  }
  const sections = contentPlan.map((planned, index) => {
    const candidate = byRole.get(planned.role) ?? raw.sections[index];
    return {
      id: `s${index + 1}`,
      role: planned.role,
      title: (candidate?.title || planned.title).slice(0, 60),
      kicker: (candidate?.kicker || planned.kicker).slice(0, 40),
      purpose: (candidate?.purpose || planned.purpose).slice(0, 300),
      takeaway: (candidate?.takeaway || planned.takeaway).slice(0, 200),
      points: candidate?.points?.length ? candidate.points.slice(0, 5) : [planned.purpose],
      evidenceIds: candidate?.evidenceIds ?? [],
      figureId: candidate?.figureId ?? planned.figureId,
    };
  });
  return {
    ...raw,
    title: raw.title.slice(0, 80),
    sections,
  };
}

function buildFigures(outline: ReportOutline, synthesis: Synthesis, claims: Claim[], sources: Source[]): ReportFigure[] {
  const figures: ReportFigure[] = [];
  const briefs = outline.figureBriefs;
  if (briefs.timeline && briefs.timeline.events.length >= 3) {
    const events = briefs.timeline.events
      .map((event) => ({ ...event, sourceId: event.sourceId ? normalizeSourceId(event.sourceId, sources) ?? undefined : undefined }))
      .filter((event) => event.title);
    if (events.length >= 3) {
      figures.push({
        id: "fig-timeline",
        type: "timeline",
        title: briefs.timeline.title || "关键节点",
        caption: "时间线只保留与研究问题相关的节点；没有可靠日期的阶段用阶段名标注。",
        data: { events },
      });
    }
  }
  if (briefs.conceptMap && briefs.conceptMap.nodes.length >= 4) {
    figures.push({
      id: "fig-concept",
      type: "conceptMap",
      title: briefs.conceptMap.title || "概念地图",
      caption: "关系图是理解工具，不是因果证明；箭头方向代表叙述上的依赖，不代表唯一因果。",
      data: {
        center: briefs.conceptMap.center,
        nodes: briefs.conceptMap.nodes.map((node, index) => ({
          id: node.id || `n${index + 1}`,
          label: node.label,
          relation: node.relation,
          weight: node.weight ?? 2,
        })),
      },
    });
  }
  if (briefs.matrix && briefs.matrix.rows.length >= 2) {
    figures.push({
      id: "fig-matrix",
      type: "matrix",
      title: briefs.matrix.title || "对比矩阵",
      caption: "矩阵用于并排比较，不等于打分排名；空白或「—」表示公开资料不足。",
      data: {
        columns: briefs.matrix.columns,
        rows: briefs.matrix.rows.map((row) => ({
          ...row,
          values: [...row.values, ...Array(Math.max(0, briefs.matrix!.columns.length - row.values.length)).fill("—")].slice(0, briefs.matrix!.columns.length),
        })),
      },
    });
  }

  if (figures.length === 0) {
    const rows = (synthesis.conflicts.length > 0 ? synthesis.conflicts : synthesis.consensus).slice(0, 3).map((item) => {
      const topic = "topic" in item ? item.topic : "整体判断";
      const support = claims.filter((claim) => claim.stance === "support" && (!claim.topic || claim.topic === topic)).slice(0, 2).map(claimText);
      const oppose = claims.filter((claim) => claim.stance === "oppose" && (!claim.topic || claim.topic === topic)).slice(0, 2).map(claimText);
      return {
        label: topic,
        values: [support.join("；") || "—", oppose.join("；") || "暂无明显反方", "confidence" in item ? `置信度 ${item.confidence}` : "置信度中"],
      };
    });
    figures.push({
      id: "fig-matrix",
      type: "matrix",
      title: "证据地图",
      caption: "这张图只呈现证据分布，不代表已经裁决；空白处就是下一步该补的证据。",
      data: {
        columns: ["支持证据", "反方/质疑", "目前判断"],
        rows: rows.length > 0 ? rows : [{ label: "整体", values: ["公开资料有限", "尚未形成明确反方", "暂不下强判断"] }],
      },
    });
  }
  return figures;
}

function sanitizeBlocks(blocks: ReportBlock[], sources: Source[], figures: ReportFigure[], claims: Claim[] = []): ReportBlock[] {
  const sourceIds = new Set(sources.map((source) => source.id));
  const figureIds = new Set(figures.map((figure) => figure.id));
  const claimSources = new Map(claims.map((claim) => [claim.id, claim.sourceId]));
  const cleanText = (text: string) =>
    text
      .replace(/\[\[(c\d+)\]\]/g, (match, id: string) => {
        const source = claimSources.get(id);
        return source && sourceIds.has(source) ? `[[${source}]]` : "";
      })
      .replace(/\[\[(s\d+)\]\]/g, (match, id: string) => (sourceIds.has(id) ? match : ""))
      .replace(/\s{2,}/g, " ")
      .trim();

  const nonNull = blocks
    .map((block): ReportBlock | null => {
      if (block.type === "p") return { ...block, text: cleanText(block.text) };
      if (block.type === "h3") return { ...block, text: cleanText(block.text) };
      if (block.type === "callout") return { ...block, text: cleanText(block.text), title: block.title ? cleanText(block.title) : undefined };
      if (block.type === "list") return { ...block, items: block.items.map(cleanText).filter(Boolean) };
      if (block.type === "quote") return { ...block, text: cleanText(block.text), sourceId: block.sourceId && sourceIds.has(block.sourceId) ? block.sourceId : undefined };
      if (block.type === "table") return { ...block, rows: block.rows.map((row) => row.map(cleanText)), headers: block.headers.map(cleanText) };
      if (block.type === "figure") return figureIds.has(block.figureId) ? block : null;
      if (block.type === "keyline") return { ...block, text: cleanText(block.text) };
      if (block.type === "steps") return { ...block, items: block.items.map((item) => ({ title: cleanText(item.title), text: cleanText(item.text) })) };
      if (block.type === "judgment") {
        return { ...block, label: block.label ? cleanText(block.label) : undefined, text: cleanText(block.text), changeMyMind: block.changeMyMind ? cleanText(block.changeMyMind) : undefined };
      }
      if (block.type === "mythFact") {
        return { ...block, items: block.items.map((item) => ({ myth: cleanText(item.myth), fact: cleanText(item.fact), note: item.note ? cleanText(item.note) : undefined })) };
      }
      if (block.type === "furtherReading") {
        return { ...block, items: block.items.map((item) => ({ ...item, title: cleanText(item.title), author: item.author ? cleanText(item.author) : undefined, why: cleanText(item.why) })) };
      }
      if (block.type === "scenario") {
        return { ...block, items: block.items.map((item) => ({ name: cleanText(item.name), text: cleanText(item.text), signal: cleanText(item.signal) })) };
      }
      return block;
    })
    .filter((block): block is ReportBlock => block !== null);
  return nonNull
    .filter((block) => {
      if (block.type === "list") return block.items.length > 0;
      if (block.type === "steps") return block.items.length > 0;
      if (block.type === "table") return block.rows.length > 0;
      return true;
    });
}

function fallbackSection(outlineSection: ReportOutline["sections"][number], sources: Source[], index: number): ReportSection {
  const cite = outlineSection.evidenceIds.slice(0, 2).map((id) => `[[${id}]]`).join("");
  return {
    id: outlineSection.id ?? `s${index + 1}`,
    number: String(index + 1).padStart(2, "0"),
    title: outlineSection.title,
    kicker: outlineSection.kicker,
    role: outlineSection.role,
    takeaway: outlineSection.takeaway,
    blocks: [
      { type: "p", text: `${outlineSection.purpose || outlineSection.title}。${cite ? `现有材料提供了若干线索${cite}，但这一节的结构化生成没有完成，下面先把可核查的要点列出来。` : "目前公开资料不足以完成这一节的论证，以下只是可核查的要点。"}` },
      { type: "list", ordered: false, items: outlineSection.points.map((point) => `${point}${cite}`) },
      { type: "callout", tone: "warning", title: "本节生成不完整", text: "模型没有返回合格的结构化内容。为了避免编造，本节保留为要点式草稿，并在方法部分标注这一限制。" },
    ],
  };
}

function countReportWords(sections: ReportSection[]): number {
  return sections.reduce(
    (sum, section) =>
      sum +
      section.blocks.reduce((blockSum, block) => {
        if (block.type === "p" || block.type === "h3" || block.type === "keyline") return blockSum + block.text.length;
        if (block.type === "callout") return blockSum + block.text.length;
        if (block.type === "list") return blockSum + block.items.join("").length;
        if (block.type === "quote") return blockSum + block.text.length;
        if (block.type === "table") return blockSum + block.rows.flat().join("").length;
        if (block.type === "steps") return blockSum + block.items.map((item) => item.title + item.text).join("").length;
        if (block.type === "judgment") return blockSum + block.text.length + (block.changeMyMind?.length ?? 0);
        if (block.type === "mythFact") return blockSum + block.items.reduce((itemSum, item) => itemSum + item.myth.length + item.fact.length + (item.note?.length ?? 0), 0);
        if (block.type === "furtherReading") return blockSum + block.items.reduce((itemSum, item) => itemSum + item.title.length + item.why.length, 0);
        if (block.type === "scenario") return blockSum + block.items.reduce((itemSum, item) => itemSum + item.name.length + item.text.length + item.signal.length, 0);
        return blockSum;
      }, 0),
    0,
  );
}

function deterministicQA(
  reportSections: ReportSection[],
  sources: Source[],
  claims: Claim[],
  conflicts: Conflict[],
  figures: ReportFigure[],
  depth: Depth,
  gaps: string[] = [],
  style: NarrativeStyle = "explain",
): QACheck[] {
  const checks: QACheck[] = [];
  const paragraphs = reportSections.flatMap((section) => section.blocks.filter((block): block is Extract<ReportBlock, { type: "p" }> => block.type === "p"));
  const cited = paragraphs.filter((block) => /\[\[s\d+\]\]/.test(block.text)).length;
  const citationRatio = paragraphs.length === 0 ? 0 : cited / paragraphs.length;
  const highSources = sources.filter((source) => source.credibility === "high").length;
  const types = new Set(sources.map((source) => source.type));
  const opposing = claims.some((claim) => claim.stance === "oppose") || conflicts.length > 0;
  const allText = reportSections.flatMap((section) => textOfBlocks(section.blocks)).join("\n");
  const banned = BANNED.filter((word) => allText.includes(word));
  const citedIds = [...allText.matchAll(/\[\[(s\d+)\]\]/g)].map((match) => match[1]);
  const sourceIds = new Set(sources.map((source) => source.id));
  const invalidCitations = citedIds.filter((id) => !sourceIds.has(id));
  const uncertaintyMarkers = [
    "证据不足",
    "暂缺",
    "无法判断",
    "无法确认",
    "不确定",
    "置信度",
    "推测",
    "尚未",
    "未知",
    "局限",
    "缺口",
    "没有足够证据",
  ].filter((marker) => allText.includes(marker));
  const lowConfidenceClaims = claims.filter((claim) => claim.confidence === "low").length;

  checks.push({
    id: "q1",
    label: "信息充分性",
    status: sources.length >= 3 && types.size >= 2 ? (highSources >= 1 ? "pass" : "warn") : "fail",
    note: `${sources.length} 个来源，${types.size} 种类型，${highSources} 个高可信来源。`,
  });
  checks.push({
    id: "q2",
    label: "一手来源",
    status: sources.some((source) => source.type === "official" || source.type === "paper" || source.type === "repository") ? "pass" : "warn",
    note: "优先检查官方文档、规范、论文或代码仓库。",
  });
  checks.push({
    id: "q3",
    label: "对立视角",
    status: opposing ? "pass" : "warn",
    note: opposing ? "证据账本或争议场中存在反对/质疑视角。" : "没有找到明确的反对视角，结论可能偏单边。",
  });
  checks.push({
    id: "q4",
    label: "引用覆盖",
    status: citationRatio >= 0.6 ? "pass" : citationRatio >= 0.35 ? "warn" : "fail",
    note: `${paragraphs.length} 个正文段落中，${cited} 个带引用（${Math.round(citationRatio * 100)}%）。`,
  });
  checks.push({
    id: "q5",
    label: "引用完整性",
    status: invalidCitations.length === 0 ? "pass" : "fail",
    note: invalidCitations.length === 0 ? "所有引用编号都能在来源清单中找到。" : `存在 ${invalidCitations.length} 个无效引用编号。`,
  });
  checks.push({
    id: "q6",
    label: "表达质量",
    status: banned.length === 0 ? "pass" : "warn",
    note: banned.length === 0 ? "未检测到高频 AI 套话。" : `检测到套话：${banned.slice(0, 5).join("、")}。`,
  });
  checks.push({
    id: "q7",
    label: "结构完整",
    status: reportSections.length >= 5 && figures.length >= 1 ? "pass" : "warn",
    note: `${reportSections.length} 节，${figures.length} 张图，${conflicts.length} 个争议条目。`,
  });
  const lengthBand =
    depth === "root"
      ? { min: 11250, max: 13500, label: "25—30 分钟 / 11,000—13,500 字" }
      : depth === "deep"
        ? { min: 6750, max: 9000, label: "15—20 分钟 / 6,800—9,000 字" }
        : { min: 2700, max: 3600, label: "6—8 分钟 / 2,800—3,700 字" };
  const contentWords = countReportWords(reportSections);
  const methodWords = depth === "quick" ? 450 : depth === "root" ? 1100 : 1000;
  const totalApprox = contentWords + methodWords;
  const minutes = Math.round(totalApprox / 450);
  checks.push({
    id: "q8",
    label: "篇幅与时长",
    status: totalApprox >= lengthBand.min && totalApprox <= lengthBand.max ? "pass" : "warn",
    note: `正文约 ${contentWords.toLocaleString()} 字，加可信度说明约 ${totalApprox.toLocaleString()} 字，约 ${minutes} 分钟；目标 ${lengthBand.label}。`,
  });
  checks.push({
    id: "q9",
    label: "来源质量",
    status: highSources / Math.max(1, sources.length) >= 0.4 ? "pass" : "warn",
    note: `高可信来源占比 ${Math.round((highSources / Math.max(1, sources.length)) * 100)}%。`,
  });
  const disclosureStatus: "pass" | "warn" | "fail" =
    uncertaintyMarkers.length >= 2
      ? "pass"
      : uncertaintyMarkers.length === 1 || gaps.length > 0 || lowConfidenceClaims > 0
        ? "warn"
        : "fail";
  checks.push({
    id: "q10",
    label: "不确定性披露",
    status: disclosureStatus,
    note:
      uncertaintyMarkers.length >= 2
        ? `正文出现 ${uncertaintyMarkers.length} 类不确定性表述${gaps.length > 0 ? `，并记录了 ${gaps.length} 个证据缺口` : ""}。`
        : uncertaintyMarkers.length === 1
          ? `正文只检测到 1 类不确定性表述（${uncertaintyMarkers[0]}），建议补充证据缺口或置信度说明。`
          : gaps.length > 0
            ? `系统记录了 ${gaps.length} 个证据缺口，但正文缺少不确定性表述；应把缺口写进报告。`
            : lowConfidenceClaims > 0
              ? `账本中有 ${lowConfidenceClaims} 条低置信证据，但正文没有相应说明。`
              : "正文没有检测到不确定性表述，也没有证据缺口或低置信证据记录。",
  });

  const openingBlock = paragraphs[0];
  const opening = openingBlock ? openingBlock.text.replace(/\[\[s\d+\]\]/g, "").trim() : "";
  const paperOpeners = ["随着", "本文", "在当今", "近年来", "首先", "众所周知", "不难发现"];
  const startsWithPaper = paperOpeners.some((word) => opening.startsWith(word));
  const hookSignal = /[?？]|[“”「」]|\d{2,4}|你|如果|先看|想象|假设|不对劲|矛盾/.test(opening);
  const openingStatus: "pass" | "warn" | "fail" = !opening
    ? "fail"
    : startsWithPaper || opening.length > 280
      ? "warn"
      : hookSignal
        ? "pass"
        : "warn";
  checks.push({
    id: "q11",
    label: "开场钩子",
    status: openingStatus,
    note: !opening
      ? "正文没有可检查的开场段落。"
      : startsWithPaper
        ? `开场以「${paperOpeners.find((word) => opening.startsWith(word))}」开头，像论文/报告；应改成具体场景、反差或问题。`
        : opening.length > 280
          ? `开场约 ${opening.length} 字，偏长；前 150 字内应先给钩子。`
          : hookSignal
            ? "开场包含具体场景、问题、反差或细节。"
            : "开场没有明显的钩子；建议加一个具体场景、反差或问题。",
  });

  const shortParagraphs = paragraphs.filter((block) => block.text.length < 90).length;
  const longParagraphs = paragraphs.filter((block) => block.text.length >= 160).length;
  const rhythmStatus: "pass" | "warn" =
    style === "light"
      ? shortParagraphs >= 2
        ? "pass"
        : "warn"
      : shortParagraphs >= 1 && longParagraphs >= 1
        ? "pass"
        : "warn";
  checks.push({
    id: "q12",
    label: "节奏变化",
    status: rhythmStatus,
    note: `${paragraphs.length} 个正文段落，短段 ${shortParagraphs} 个、长段 ${longParagraphs} 个；${STYLES[style].label}读感要求${
      style === "light" ? "短段为主" : "长短交替"
    }。`,
  });

  const concreteCount = paragraphs.filter((block) => /\d{2,4}|[“”「」]|年|月|日/.test(block.text)).length;
  const concreteThreshold = depth === "quick" ? 2 : 3;
  checks.push({
    id: "q13",
    label: "具体细节",
    status: concreteCount >= concreteThreshold ? "pass" : concreteCount > 0 ? "warn" : "fail",
    note: `${paragraphs.length} 个正文段落中，${concreteCount} 个包含日期、数字、原话或引文；建议至少 ${concreteThreshold} 个具体细节。`,
  });
  return checks;
}

function mergeQA(base: QACheck[], extra: QACheck[], limitations: string[]): QAResult {
  const merged = [...base, ...extra];
  const seen = new Set<string>();
  const checks = merged.filter((check) => {
    const key = check.label;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const score = Math.round(
    checks.reduce((sum, check) => sum + (check.status === "pass" ? 100 : check.status === "warn" ? 68 : 30), 0) / Math.max(1, checks.length),
  );
  const fails = checks.filter((check) => check.status === "fail");
  const warns = checks.filter((check) => check.status === "warn");
  return {
    score: Math.max(0, Math.min(100, score)),
    verdict:
      fails.length > 0
        ? `有 ${fails.length} 项硬性问题需要修正；当前版本可以阅读，但不应把结论当成定论。`
        : warns.length > 0
          ? `可交付；仍有 ${warns.length} 项需要读者注意的边界。`
          : "可交付；在现有证据范围内，引用与反方论证都较完整。",
    checks,
    limitations: [...new Set(limitations.filter(Boolean))].slice(0, 8),
  };
}

function methodSection(
  outline: ReportOutline,
  frameworks: FrameworkChoice[],
  synthesis: Synthesis,
  qa: QAResult,
  credibility: Credibility,
  sources: Source[],
  scene: Scene,
  objectKind: ObjectKind,
): ReportSection {
  const isBook = objectKind === "book" || objectKind === "work";
  const reportLabel = isBook ? "这篇读书报告" : "这篇读物";
  return {
    id: "method",
    number: String(outline.sections.length + 1).padStart(2, "0"),
    title: isBook ? "这篇读书报告的可信度" : "这篇报告的可信度",
    kicker: "说明",
    role: "credibility",
    takeaway: `读者能判断${isBook ? "这篇读书报告" : "这篇读物"}能信到什么程度。`,
    blocks: [
      {
        type: "p",
        text: `${reportLabel}由问底流程生成：从 ${sources.length} 个来源中提取证据，按 ${frameworks.map((item) => item.name).join("、")} 等透镜组织，最后用五个可信度信号检查。详细透镜与来源结构见文末「问底档案」。`,
      },
      {
        type: "h3",
        text: "可信度结论",
      },
      {
        type: "p",
        text: credibility.summary,
      },
      {
        type: "p",
        text: `五个信号——${credibility.signals.map((signal) => `${signal.label}（${trustLevelLabel(signal.level)}）`).join("、")}——的详细说明放在文末「问底档案」。`,
      },
      {
        type: "h3",
        text: "读者必须知道的局限",
      },
      {
        type: "list",
        ordered: false,
        items: qa.limitations.length > 0 ? qa.limitations : ["公开资料会随时间变化；报告中的判断有保质期。"],
      },
      ...(synthesis.gaps.length > 0
        ? ([
            {
              type: "p",
              text: `研究过程中仍然存在的证据缺口：${synthesis.gaps.join("；")}`,
            },
          ] as ReportBlock[])
        : []),
      ...(scene === "life"
        ? ([
            {
              type: "callout",
              tone: "warning",
              title: "边界声明",
              text: "这份报告不构成医疗、投资或法律建议。涉及健康、金钱与法律的决定，请咨询持证专业人士。",
            },
          ] as ReportBlock[])
        : []),
    ],
  };
}

function chooseConfidence(sources: Source[], conflicts: Conflict[], gaps: string[], qaScore: number): "high" | "medium" | "low" {
  if (sources.length < 4 || gaps.length >= 5 || qaScore < 50) return "low";
  if (sources.filter((source) => source.credibility === "high").length >= 2 && conflicts.length <= 1 && gaps.length <= 2 && qaScore >= 80) return "high";
  return "medium";
}

function coverMotif(topic: string): string {
  const hash = [...topic].reduce((sum, char) => (sum + char.codePointAt(0)!) % 997, 0);
  return hash % 3 === 0 ? "arcs" : hash % 3 === 1 ? "grid" : "orbit";
}

function buildReport(
  run: ResearchRun,
  outline: ReportOutline,
  sections: ReportSection[],
  figures: ReportFigure[],
  sources: Source[],
  frameworks: FrameworkChoice[],
  debates: Debate[],
  qa: QAResult,
  synthesis: Synthesis,
  limitations: string[],
  providerName: string,
  scene: Scene,
): ReportDoc {
  const words = countReportWords(sections);

  const confidence = run.providerLabel === "开发模拟" ? "low" : chooseConfidence(sources, run.conflicts, synthesis.gaps, qa.score);
  const reading = resolveReading(run.reading, run.depth);
  const objectKind = run.objectKind ?? run.plan?.objectKind ?? "other";
  const subject = run.plan?.subject
    ? {
        kind: objectKind,
        title: run.plan.subject.title || run.topic,
        author: run.plan.subject.author,
        year: run.plan.subject.year,
      }
    : undefined;
  const credibility =
    run.credibility ??
    deriveCredibility({
      sources,
      claims: run.claims,
      conflicts: run.conflicts,
      debates,
      gaps: synthesis.gaps,
      limitations: qa.limitations,
      qa,
      completedAt: Date.now(),
    });

  return {
    id: run.reportId || crypto.randomUUID(),
    topic: run.topic,
    title: outline.title,
    subtitle: outline.subtitle,
    oneLiner: outline.oneLiner,
    tldr: outline.tldr,
    keyQuestions: outline.keyQuestions,
    tags: outline.tags,
    reading,
    objectKind,
    subject,
    credibility,
    meta: {
      readingMinutes: Math.max(4, Math.min(60, Math.round(words / 450))),
      wordCount: words,
      sourceCount: sources.length,
      confidence,
      completedAt: Date.now(),
      model: `${providerName} / ${run.model}`,
      scene,
      depth: reading.depth,
    },
    coverMotif: coverMotif(run.topic),
    sections,
    figures,
    sources,
    frameworks,
    bareThinking: run.bareThinking,
    debates,
    qa,
    methodologyNote: `问底路径：拆题 → 多源检索 → 证据账本 → 交叉验证 → 钢人论证 → 成稿 → 可信度检查。使用 ${frameworks.map((item) => item.name).join("、")} 等透镜；共 ${sources.length} 个来源、${run.claims.length} 条证据。`,
    limitations: [...new Set([...qa.limitations, ...limitations].filter(Boolean))].slice(0, 10),
    sample: false,
  };
}

function resetFromFirstIncomplete(run: ResearchRun): ResearchRun {
  const next = cloneRun(run);
  const first = STAGE_ORDER.find((id) => next.stages.find((stage) => stage.id === id)?.status !== "done");
  if (!first) return next;
  const index = STAGE_ORDER.indexOf(first);
  const clear = (field: keyof ResearchRun) => {
    const value = next[field];
    if (Array.isArray(value)) (next as unknown as Record<string, unknown>)[field] = [];
  };
  if (index <= STAGE_ORDER.indexOf("intake")) {
    next.plan = undefined;
    next.bareThinking = undefined;
    next.sources = [];
    next.claims = [];
    next.synthesis = undefined;
    next.frameworks = [];
    next.conflicts = [];
    next.debates = [];
    next.outline = undefined;
    next.sections = [];
    next.qa = undefined;
    next.reportId = undefined;
  } else if (index <= STAGE_ORDER.indexOf("bare")) {
    next.bareThinking = undefined;
    next.sources = [];
    next.claims = [];
    next.synthesis = undefined;
    next.frameworks = [];
    next.conflicts = [];
    next.debates = [];
    next.outline = undefined;
    next.sections = [];
    next.qa = undefined;
    next.reportId = undefined;
  } else if (index <= STAGE_ORDER.indexOf("search")) {
    next.sources = [];
    next.claims = [];
    next.synthesis = undefined;
    next.frameworks = [];
    next.conflicts = [];
    next.debates = [];
    next.outline = undefined;
    next.sections = [];
    next.qa = undefined;
    next.reportId = undefined;
  } else if (index <= STAGE_ORDER.indexOf("evidence")) {
    next.claims = [];
    next.synthesis = undefined;
    next.frameworks = [];
    next.conflicts = [];
    next.debates = [];
    next.outline = undefined;
    next.sections = [];
    next.qa = undefined;
    next.reportId = undefined;
  } else if (index <= STAGE_ORDER.indexOf("verify")) {
    next.synthesis = undefined;
    next.frameworks = [];
    next.conflicts = [];
    next.debates = [];
    next.outline = undefined;
    next.sections = [];
    next.qa = undefined;
    next.reportId = undefined;
  } else if (index <= STAGE_ORDER.indexOf("frameworks")) {
    next.frameworks = [];
    next.debates = [];
    next.outline = undefined;
    next.sections = [];
    next.qa = undefined;
    next.reportId = undefined;
  } else if (index <= STAGE_ORDER.indexOf("debate")) {
    next.debates = [];
    next.outline = undefined;
    next.sections = [];
    next.qa = undefined;
    next.reportId = undefined;
  } else if (index <= STAGE_ORDER.indexOf("outline")) {
    next.outline = undefined;
    next.sections = [];
    next.qa = undefined;
    next.reportId = undefined;
  } else if (index <= STAGE_ORDER.indexOf("write")) {
    next.sections = [];
    next.qa = undefined;
    next.reportId = undefined;
  } else if (index <= STAGE_ORDER.indexOf("qa")) {
    next.qa = undefined;
    next.reportId = undefined;
  } else {
    next.reportId = undefined;
  }
  for (const stage of next.stages) {
    if (STAGE_ORDER.indexOf(stage.id) >= index) {
      stage.status = "pending";
      stage.detail = "";
      stage.count = undefined;
      stage.startedAt = undefined;
      stage.endedAt = undefined;
    }
  }
  clear("reportId");
  return next;
}

async function mapLimit<T, R>(items: T[], limit: number, run: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await run(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function runResearch(options: RunResearchOptions): Promise<ReportDoc | null> {
  let state = resetFromFirstIncomplete(options.run);
  state.status = "running";
  state.error = undefined;
  const settings = options.settings;
  const apiKey = options.apiKey;
  const scene = state.scene;
  const reading = resolveReading(state.reading, state.depth);
  state.reading = reading;
  state.depth = reading.depth;
  const depth = reading.depth;
  const providerName = providerLabel(settings.provider.providerId);
  let sourceCounter = state.sources.reduce((max, source) => {
    const match = source.id.match(/\d+/);
    return Math.max(max, match ? Number(match[0]) : 0);
  }, 0);
  let claimCounter = state.claims.length;
  let conflictCounter = state.conflicts.length;
  let figureCache: ReportFigure[] = [];
  const limitations: string[] = [];
  const mockMode = settings.provider.providerId === "mock";
  if (mockMode) limitations.push("本报告由本地开发模拟模型生成，仅用于界面与链路测试，不代表真实研究结论。");

  const commit = () => {
    state.updatedAt = Date.now();
    options.onUpdate(cloneRun(state));
  };

  const setStage = (id: ResearchRun["stages"][number]["id"], status: ResearchRun["stages"][number]["status"], detail: string, count?: number) => {
    const stage = state.stages.find((item) => item.id === id);
    if (!stage) return;
    stage.status = status;
    stage.detail = detail;
    if (count !== undefined) stage.count = count;
    if (status === "active" && !stage.startedAt) stage.startedAt = Date.now();
    if (status === "done" || status === "error" || status === "skipped") stage.endedAt = Date.now();
    commit();
  };

  const addEvent = (kind: ResearchEvent["kind"], title: string, detail?: string, tone: ResearchEvent["tone"] = "default", doCommit = true) => {
    state.events.push({
      id: crypto.randomUUID(),
      at: Date.now(),
      kind,
      title,
      detail,
      tone,
    });
    if (state.events.length > 160) state.events = state.events.slice(-160);
    if (doCommit) commit();
  };

  if (mockMode) addEvent("system", "开发模拟模式", "不会调用真实模型；报告内容仅用于测试检索、引用、排版与 PDF 链路。", "warn", false);

  const addUsage = (usage: { inputTokens: number; outputTokens: number }, model?: string) => {
    state.stats.calls += 1;
    state.stats.inputTokens += usage.inputTokens;
    state.stats.outputTokens += usage.outputTokens;
    state.stats.estimatedCost = estimateCost(settings.provider.providerId, state.stats.inputTokens, state.stats.outputTokens);
    if (model) state.model = model;
  };

  const checkBudget = () => {
    if (state.stats.calls >= MAX_CALLS[depth]) {
      throw new AgentError("budget_exceeded", `本次研究已达到 ${MAX_CALLS[depth]} 次模型调用的上限。已保留当前进度，可以打开报告库查看，或重新开始时选择快速档。`);
    }
    if (state.stats.inputTokens + state.stats.outputTokens >= MAX_TOKENS[depth]) {
      throw new AgentError("budget_exceeded", "本次研究已达到 token 预算上限。已保留当前进度，可以重新开始时选择快速档。");
    }
  };

  const callJson = async <S extends z.ZodTypeAny>(
    schema: S,
    messages: ChatMessage[],
    label: string,
    opts: { temperature?: number; maxTokens?: number } = {},
  ): Promise<z.infer<S>> => {
    checkBudget();
    const first = await chatOnce(settings.provider, apiKey, messages, {
      json: true,
      temperature: opts.temperature ?? 0.4,
      maxTokens: opts.maxTokens ?? 4096,
      signal: options.signal,
      demoToken: options.demoToken,
    });
    addUsage(first.usage, first.model);
    commit();

    const parse = (text: string): z.infer<S> | null => {
      try {
        const result = schema.safeParse(parseJsonLoose(text));
        return result.success ? result.data : null;
      } catch {
        return null;
      }
    };

    const parsed = parse(first.text);
    if (parsed) return parsed;

    addEvent("system", `${label}：正在修正输出格式`, "模型第一次返回的结构不符合要求，正在重试。", "warn");
    checkBudget();
    const repairMessages: ChatMessage[] = [
      ...messages,
      { role: "assistant", content: first.text.slice(0, 12_000) },
      { role: "user", content: "上面的输出不是合格的 JSON 或字段不符合要求。请只输出一个合法的 JSON 对象，严格包含前面要求的字段；不要解释，不要 Markdown 代码块。" },
    ];
    const second = await chatOnce(settings.provider, apiKey, repairMessages, {
      json: true,
      temperature: 0.2,
      maxTokens: Math.min(8192, (opts.maxTokens ?? 4096) + 1200),
      signal: options.signal,
      demoToken: options.demoToken,
    });
    addUsage(second.usage, second.model);
    const repaired = parse(second.text);
    if (!repaired) throw new AgentError("schema_error", `${label} 的模型输出结构不稳定。请重试，或换一个支持 JSON 输出的模型。`);
    return repaired;
  };

  const stageDone = (id: (typeof STAGE_ORDER)[number]) => state.stages.find((stage) => stage.id === id)?.status === "done";

  try {
    if (!stageDone("intake")) {
      setStage("intake", "active", "判断问题类型，设计研究问题…");
      const today = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" }).format(new Date());
      let plan: ResearchPlan;
      try {
        const raw = await callJson(planSchema, planMessages(state.topic, scene, reading, today), "定题", { temperature: 0.35, maxTokens: 3200 });
        plan = {
          topic: state.topic,
          oneLiner: raw.oneLiner,
          type: raw.type,
          objectKind: normalizeObjectKind(raw.objectKind ?? raw.type),
          focus: reading.focus,
          subject: raw.subject,
          audience: raw.audience,
          questions: raw.questions.map((item, index) => ({ id: item.id || `q${index + 1}`, question: item.question, why: item.why || "" })),
          queries: raw.queries,
          searchQueryEn: raw.searchQueryEn,
          cautions: raw.cautions,
        };
      } catch (error) {
        if (error instanceof AgentError && error.code === "schema_error") {
          plan = fallbackPlan(state.topic, scene, depth, "other");
          limitations.push("定题阶段模型输出结构不稳定，使用了保守的研究问题模板。");
          addEvent("system", "定题：使用保守模板", "模型输出结构不稳定，已切换到基础研究问题；后续证据链仍然可核查。", "warn");
        } else {
          throw error;
        }
      }
      state.plan = plan;
      state.objectKind = plan.objectKind;
      setStage("intake", "done", `已拆成 ${plan.questions.length} 个问题、${plan.queries.length} 条检索式`, plan.questions.length);
      addEvent("stage", "定题完成", plan.oneLiner, "good", false);
      commit();
    }

    if (!stageDone("bare")) {
      setStage("bare", "active", "先不急着下定义…");
      const plan = state.plan ?? fallbackPlan(state.topic, scene, depth);
      try {
        const bare = await callJson(bareSchema, bareMessages(state.topic, plan, scene, reading), "裸思", { temperature: 0.7, maxTokens: 1300 });
        state.bareThinking = bare;
      } catch {
        state.bareThinking = {
          text: "先把已有的常识判断放到一边：这个题目最容易被什么叙事带着走？哪些说法只是听起来顺，但缺少机制或数据支撑？先记住这些疑问，等证据回来再判断。",
          assumptions: ["假设标准化的连接方式一定会降低集成成本。", "假设更多工具等于更强能力。"],
          analogies: [],
        };
        limitations.push("裸思层生成失败，使用了保守的观察笔记。");
      }
      setStage("bare", "done", "已记录先验观察与待检验假设");
      commit();
    }

    if (!stageDone("search")) {
      const plan = state.plan ?? fallbackPlan(state.topic, scene, depth);
      setStage("search", "active", "正在检索第一组问题…");
      state.sources = [];
      state.claims = [];
      const existing = new Set<string>();
      const groups = groupQueries(plan, depth);
      const deepseekQuery =
        plan.searchQueryEn?.trim() ||
        plan.queries.find((item) => /[A-Za-z]/.test(item.query))?.query ||
        "";
      let successfulGroups = 0;
      for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
        setStage("search", "active", `第 ${groupIndex + 1}/${groups.length} 组检索：${groups[groupIndex].join(" · ")}`);
        try {
          const configuredSearch = settings.provider.search;
          const searchConfig =
            configuredSearch.provider === "deepseek" && !configuredSearch.apiKey.trim() && apiKey.trim()
              ? { provider: "deepseek" as const, apiKey }
              : configuredSearch;
          const result = await searchSources(
            groups[groupIndex],
            scene,
            searchConfig,
            options.signal,
            plan.subject,
            options.demoToken,
            groupIndex === 0 ? deepseekQuery : undefined,
          );
          successfulGroups += 1;
          let added = 0;
          for (const raw of result.sources) {
            if (!raw.url || !/^https?:\/\//i.test(raw.url)) continue;
            const key = canonicalUrl(raw.url);
            if (existing.has(key)) continue;
            existing.add(key);
            sourceCounter += 1;
            state.sources.push(normalizeSource(raw, `s${sourceCounter}`));
            added += 1;
          }
          if (result.warnings.length > 0) {
            for (const warning of result.warnings) {
              if (!limitations.includes(warning)) limitations.push(warning);
            }
          }
          addEvent("search", `第 ${groupIndex + 1} 组检索完成`, `新增 ${added} 个候选来源`, added > 0 ? "good" : "warn", false);
          setStage("search", "active", `已收集 ${state.sources.length} 个候选来源，继续下一组…`, state.sources.length);
        } catch (error) {
          addEvent("search", `第 ${groupIndex + 1} 组检索失败`, error instanceof Error ? error.message : "检索失败", "warn");
        }
      }

      if (state.sources.length === 0) {
        throw new AgentError("search_failed", "没有检索到可用来源。请检查网络，或换一个更具体的问法后重试。");
      }

      if (state.sources.length >= 4) {
        setStage("search", "active", `正在按题目相关度重排 ${Math.min(60, state.sources.length)} 个候选来源…`, state.sources.length);
        try {
          const rerankPool = [...state.sources].sort((a, b) => b.score - a.score).slice(0, 60);
          const ranked = await callJson(rerankSchema, rerankMessages(state.topic, plan, rerankPool), "相关性重排", {
            temperature: 0,
            maxTokens: 3000,
          });
          const byId = new Map(ranked.scores.map((item) => [item.id, item.relevance]));
          let rankedCount = 0;
          for (const source of state.sources) {
            const relevance = byId.get(source.id);
            if (typeof relevance === "number") {
              source.relevance = relevance;
              rankedCount += 1;
            }
          }
          addEvent("search", "相关性重排完成", `${rankedCount}/${state.sources.length} 个来源按题目相关度打分，低于 2.5 分的跑题来源会被过滤。`, "good", false);
        } catch {
          limitations.push("来源相关性重排失败，使用规则相关性排序。");
          addEvent("search", "相关性重排失败", "已退回规则相关性排序，报告仍可继续。", "warn", false);
        }
      }

      state.sources = selectSources(state.sources, depth, state.topic, [
        plan.subject?.title ?? "",
        plan.subject?.author ?? "",
        plan.oneLiner,
        ...plan.queries.map((item) => item.query),
      ]);
      commit();
      setStage("search", "active", `已筛选 ${state.sources.length} 个来源，正在打开正文…`, state.sources.length);

      const targets = state.sources.filter(shouldFetch).slice(0, depth === "root" ? 14 : depth === "deep" ? 10 : 6);
      let fetched = 0;
      let cursor = 0;
      await mapLimit(targets, 3, async (source) => {
        try {
          const page = await fetchSource(source.url, options.signal, 16_000);
          if (CHALLENGE_TEXT.test(page.text) || /client challenge|just a moment/i.test(page.title || "")) {
            source.title = "Client Challenge";
            source.verified = false;
            return;
          }
          source.title = page.title || source.title;
          source.site = page.siteName || source.site;
          source.publishedAt = page.publishedAt || source.publishedAt;
          source.content = page.text.slice(0, 16_000);
          source.verified = true;
          fetched += 1;
        } catch {
          source.verified = false;
        }
        cursor += 1;
        if (cursor % 2 === 0 || cursor === targets.length) {
          setStage("search", "active", `已打开 ${fetched}/${targets.length} 个来源正文…`, state.sources.length);
        }
      });
      state.sources = state.sources
        .filter((source) => !isJunkSource(source, state.topic))
        .map((source) => ({ ...source, type: isBookPageUrl(source.url) ? "book" : source.type }));
      const usable = state.sources.filter((source) => source.content && source.content.length > 200).length;
      setStage("search", "done", `${state.sources.length} 个来源，${usable} 个已读取正文`, state.sources.length);
      addEvent("stage", "检索完成", `${state.sources.length} 个来源进入证据账本，${usable} 个已读取正文`, "good", false);
      commit();
    }

    if (!stageDone("evidence")) {
      const plan = state.plan ?? fallbackPlan(state.topic, scene, depth);
      setStage("evidence", "active", "正在逐条摘取可核查的主张…");
      state.claims = [];
      claimCounter = 0;
      const batches: Source[][] = [];
      const batchSize = depth === "root" ? 4 : 3;
      for (let index = 0; index < state.sources.length; index += batchSize) batches.push(state.sources.slice(index, index + batchSize));

      const results = await mapLimit(batches, 2, async (batch, batchIndex) => {
        try {
          const raw = await callJson(
            claimsSchema,
            claimMessages({ sources: batch, plan, scene, maxClaimsPerSource: depth === "root" ? 5 : depth === "deep" ? 4 : 3 }),
            "取证",
            { temperature: 0.1, maxTokens: 4200 },
          );
          const claims: Claim[] = [];
          for (const item of raw.claims) {
            const sourceId = normalizeSourceId(item.sourceId, batch);
            if (!sourceId) continue;
            if (!item.claim || item.claim.length < 4) continue;
            claimCounter += 1;
            claims.push({
              id: `c${claimCounter}`,
              text: item.claim.slice(0, 300),
              quote: (item.quote || "").slice(0, 500),
              sourceId,
              kind: item.kind,
              confidence: item.confidence,
              stance: item.stance,
              axis: item.axis,
              topic: item.topic || "",
            });
          }
          return claims;
        } catch (error) {
          addEvent("claim", `第 ${batchIndex + 1} 批取证失败`, error instanceof Error ? error.message : "取证失败", "warn", false);
          return [] as Claim[];
        }
      });

      const seen = new Set<string>();
      for (const batchClaims of results) {
        for (const claim of batchClaims) {
          const key = `${claim.sourceId}:${claim.text.slice(0, 50)}`;
          if (seen.has(key)) continue;
          seen.add(key);
          state.claims.push(claim);
        }
        if (batchClaims.length > 0) {
          addEvent("claim", `新增 ${batchClaims.length} 条证据`, batchClaims[0].text.slice(0, 80), "default", false);
        }
      }
      commit();

      if (state.claims.length === 0) {
        // Fallback: build coarse claims from source snippets so the report still has citations.
        for (const source of state.sources) {
          if (!source.snippet) continue;
          claimCounter += 1;
          state.claims.push({
            id: `c${claimCounter}`,
            text: source.snippet.slice(0, 220),
            quote: source.snippet.slice(0, 300),
            sourceId: source.id,
            kind: "fact",
            confidence: "low",
            stance: "neutral",
            axis: "context",
            topic: "来源摘要",
          });
        }
        limitations.push("证据提取模型没有返回合格结果，部分证据退化为来源摘要级别。");
        addEvent("claim", "使用来源摘要兜底", "没有提取到结构化证据，已用来源摘要建立低置信度账本。", "warn");
      }
      if (state.claims.length < 5) limitations.push("本次提取到的独立证据较少，结论置信度受限。");
      setStage("evidence", "done", `已建立 ${state.claims.length} 条证据账本`, state.claims.length);
      commit();
    }

    if (!stageDone("verify")) {
      const plan = state.plan ?? fallbackPlan(state.topic, scene, depth);
      setStage("verify", "active", "在证据上找共识、分歧与缺口…");
      let synthesis: Synthesis;
      try {
        const raw = await callJson(synthesisSchema, synthesisMessages(state.claims, state.sources, plan), "交叉验证", { temperature: 0.25, maxTokens: 5200 });
        synthesis = {
          ...raw,
          conflicts: raw.conflicts.map((conflict) => ({
            ...conflict,
            evidenceIds: normalizeIds(conflict.evidenceIds, state.sources),
            positions: conflict.positions.map((position) => ({ ...position, evidenceIds: normalizeIds(position.evidenceIds, state.sources) })),
          })),
          consensus: raw.consensus.map((item) => ({ ...item, evidenceIds: normalizeIds(item.evidenceIds, state.sources) })),
          sourceNotes: raw.sourceNotes.filter((note) => state.sources.some((source) => source.id === note.sourceId)),
          answerMap: raw.answerMap.map((item) => ({ ...item, evidenceIds: normalizeIds(item.evidenceIds, state.sources) })),
        };
      } catch (error) {
        synthesis = fallbackSynthesis(state.claims, plan);
        limitations.push("交叉验证模型输出结构不稳定，已使用保守的证据汇总。");
        addEvent("conflict", "交叉验证使用保守汇总", error instanceof Error ? error.message : "结构不稳定", "warn");
      }
      state.synthesis = synthesis;
      conflictCounter = 0;
      state.conflicts = synthesis.conflicts.map((conflict) => {
        conflictCounter += 1;
        return { ...conflict, id: `cf${conflictCounter}` };
      });
      setStage("verify", "done", `${synthesis.consensus.length} 个共识 · ${synthesis.conflicts.length} 个分歧 · ${synthesis.gaps.length} 个缺口`, synthesis.conflicts.length);
      addEvent("conflict", "交叉验证完成", `发现 ${synthesis.conflicts.length} 个需要正面处理的分歧`, synthesis.conflicts.length > 0 ? "good" : "warn", false);
      commit();
    }

    if (!stageDone("frameworks")) {
      const plan = state.plan ?? fallbackPlan(state.topic, scene, depth);
      const synthesis = state.synthesis ?? fallbackSynthesis(state.claims, plan);
      setStage("frameworks", "active", "选择真正有区分力的透镜…");
      try {
        const raw = await callJson(frameworksSchema, frameworkMessages(state.topic, plan, synthesis, scene), "框架选型", { temperature: 0.4, maxTokens: 1600 });
        state.frameworks = raw.frameworks.slice(0, 3);
      } catch {
        state.frameworks = fallbackFrameworks(plan);
        limitations.push("框架选型失败，使用了默认的三副透镜。");
      }
      setStage("frameworks", "done", `使用 ${state.frameworks.map((item) => item.name).join(" / ")}`, state.frameworks.length);
      commit();
    }

    if (!stageDone("debate")) {
      setStage("debate", "active", "把最强反方放上桌…");
      if (state.conflicts.length === 0) {
        state.debates = [];
        setStage("debate", "skipped", "本题没有形成足够明确的分歧，未强行制造反方");
        addEvent("debate", "未发现足够明确的分歧", "报告会在正文中标注证据边界，而不是为了形式强行二选一。", "warn", false);
        commit();
      } else {
        try {
          const raw = await callJson(debatesSchema, debateMessages(state.conflicts.slice(0, 2), state.claims, state.sources, scene), "正反辩论", { temperature: 0.5, maxTokens: 3600 });
          state.debates = raw.debates.slice(0, 2).map((debate, index) => ({
            ...debate,
            id: `d${index + 1}`,
            pro: { ...debate.pro, points: debate.pro.points.map((point) => ({ ...point, evidenceIds: normalizeIds(point.evidenceIds, state.sources) })) },
            contra: { ...debate.contra, points: debate.contra.points.map((point) => ({ ...point, evidenceIds: normalizeIds(point.evidenceIds, state.sources) })) },
          }));
          setStage("debate", "done", `完成 ${state.debates.length} 场正反论证`, state.debates.length);
          addEvent("debate", "辩论完成", state.debates[0]?.verdict.slice(0, 100) ?? "", "good", false);
          commit();
        } catch {
          state.debates = state.conflicts.slice(0, 2).map((conflict, index) => ({
            id: `d${index + 1}`,
            question: conflict.topic,
            pro: { label: "支持方", thesis: conflict.positions[0]?.argument ?? "现有证据支持这一方向。", points: [{ text: conflict.positions[0]?.argument ?? "支持方观点", evidenceIds: conflict.positions[0]?.evidenceIds ?? [] }] },
            contra: { label: "反方", thesis: conflict.positions[1]?.argument ?? "现有证据不足以支持这一方向。", points: [{ text: conflict.positions[1]?.argument ?? "反方观点", evidenceIds: conflict.positions[1]?.evidenceIds ?? [] }] },
            verdict: conflict.verdict || "目前证据不足以判断方向。",
            confidence: conflict.confidence,
            changeMyMind: "出现新的独立数据或机制证据时，判断可能改变。",
          }));
          limitations.push("辩论生成失败，使用争议双方的原始论证作为替代。");
          setStage("debate", "done", "使用争议原始论证作为替代", state.debates.length);
          commit();
        }
      }
    }

    if (!stageDone("outline")) {
      const plan = state.plan ?? fallbackPlan(state.topic, scene, depth);
      const synthesis = state.synthesis ?? fallbackSynthesis(state.claims, plan);
      setStage("outline", "active", "设计读者能走完的结构…");
      let outline: ReportOutline;
      try {
        const raw = await callJson(
          outlineSchema,
          outlineMessages(state.topic, scene, reading, plan, synthesis, state.frameworks, state.claims, state.sources),
          "结构设计",
          { temperature: 0.4, maxTokens: 5600 },
        );
        const normalized = normalizeOutline(raw, plan, reading);
        outline = {
          ...normalized,
          sections: normalized.sections.map((section) => ({
            ...section,
            evidenceIds: normalizeIds(section.evidenceIds, state.sources),
          })),
          figureBriefs: normalized.figureBriefs
            ? {
                ...normalized.figureBriefs,
                conceptMap: normalized.figureBriefs.conceptMap
                  ? {
                      ...normalized.figureBriefs.conceptMap,
                      nodes: normalized.figureBriefs.conceptMap.nodes.map((node, index) => ({ ...node, id: node.id || `n${index + 1}` })),
                    }
                  : undefined,
              }
            : normalized.figureBriefs,
        };
      } catch {
        outline = fallbackOutline(state.topic, scene, reading, plan, synthesis, state.claims);
        limitations.push("结构设计失败，使用了基础章节结构。");
      }
      state.outline = outline;
      figureCache = buildFigures(outline, synthesis, state.claims, state.sources);
      setStage("outline", "done", `${outline.sections.length} 节正文 + 可信度说明，${figureCache.length} 张图`, outline.sections.length);
      commit();
    } else {
      const plan = state.plan ?? fallbackPlan(state.topic, scene, depth);
      const synthesis = state.synthesis ?? fallbackSynthesis(state.claims, plan);
      if (state.outline) figureCache = buildFigures(state.outline, synthesis, state.claims, state.sources);
    }

    if (!stageDone("write")) {
      const plan = state.plan ?? fallbackPlan(state.topic, scene, depth);
      const outline = state.outline ?? fallbackOutline(state.topic, scene, reading, plan, state.synthesis ?? fallbackSynthesis(state.claims, plan), state.claims);
      const existing = new Map((state.sections ?? []).map((section) => [section.id, section]));
      const written: ReportSection[] = outline.sections
        .map((section) => existing.get(section.id ?? ""))
        .filter((section): section is ReportSection => Boolean(section));
      const sectionsToWrite = outline.sections.filter((section) => !existing.has(section.id ?? ""));

      setStage("write", "active", `准备写 ${outline.sections.length} 节…`, written.length);
      for (let index = 0; index < sectionsToWrite.length; index += 1) {
        const outlineSection = sectionsToWrite[index];
        const position = outline.sections.findIndex((item) => item.id === outlineSection.id);
        const previous = written[written.length - 1];
        const previousTail = previous ? textOfBlocks(previous.blocks).slice(-500) : "";
        setStage("write", "active", `正在写第 ${position + 1}/${outline.sections.length} 节：${outlineSection.title}`, written.length);
        try {
          const planned = sectionPlan(plan.objectKind ?? "other", depth).filter((item) => item.role !== "credibility")[position];
          const wordTarget = planned?.wordTarget ?? (depth === "root" ? 1600 : depth === "deep" ? 1000 : 450);
          const tokenFactor = depth === "root" ? 0.9 : 0.78;
          const tokenFloor = depth === "root" ? 800 : depth === "deep" ? 600 : 400;
          const tokenCap = depth === "root" ? 1700 : depth === "deep" ? 1200 : 700;
          const maxTokens = Math.max(tokenFloor, Math.min(tokenCap, Math.round(wordTarget * tokenFactor)));
          const raw = await callJson(
            sectionSchema,
            sectionMessages({
              section: outlineSection,
              previousTail,
              plan,
              outline,
              claims: state.claims,
              sources: state.sources,
              scene,
              reading,
              wordTarget,
            }),
            `成稿：${outlineSection.title}`,
            { temperature: 0.5, maxTokens },
          );
          const section: ReportSection = {
            id: outlineSection.id ?? `s${position + 1}`,
            number: String(position + 1).padStart(2, "0"),
            title: outlineSection.title,
            kicker: outlineSection.kicker,
            role: outlineSection.role,
            takeaway: outlineSection.takeaway,
            blocks: sanitizeBlocks(raw.blocks, state.sources, figureCache, state.claims),
          };
          written.push(section);
          state.sections = [...written];
          addEvent("write", `完成第 ${position + 1} 节`, outlineSection.title, "good", false);
          setStage("write", "active", `已完成 ${written.length}/${outline.sections.length} 节`, written.length);
        } catch (error) {
          const fallback = fallbackSection(outlineSection, state.sources, position);
          written.push(fallback);
          state.sections = [...written];
          limitations.push(`「${outlineSection.title}」一节生成不完整，保留了要点式草稿。`);
          addEvent("write", `第 ${position + 1} 节改用要点草稿`, error instanceof Error ? error.message : "生成失败", "warn");
        }
      }
      setStage("write", "done", `完成 ${written.length} 节正文`, written.length);
      commit();
    }

    const plan = state.plan ?? fallbackPlan(state.topic, scene, depth);
    const outline = state.outline ?? fallbackOutline(state.topic, scene, reading, plan, state.synthesis ?? fallbackSynthesis(state.claims, plan), state.claims);
    const contentSections = state.sections ?? [];
    if (figureCache.length === 0) {
      figureCache = buildFigures(outline, state.synthesis ?? fallbackSynthesis(state.claims, plan), state.claims, state.sources);
    }

    if (!stageDone("qa")) {
      setStage("qa", "active", "跑证据、逻辑与引用检查…");
      const deterministic = deterministicQA(
        contentSections,
        state.sources,
        state.claims,
        state.conflicts,
        figureCache,
        depth,
        state.synthesis?.gaps ?? [],
        reading.style,
      );
      let qaChecks = deterministic;
      let qaScore = 0;
      let qaVerdict = "";
      let qaLimitations: string[] = [];
      if (depth !== "quick") {
        try {
          const raw = await callJson(
            qaSchema,
            qaMessages({
              outline,
              sections: contentSections.map((section) => ({ title: section.title, text: textOfBlocks(section.blocks) })),
              claims: state.claims,
              sources: state.sources,
              deterministic: deterministic.map((item) => ({ label: item.label, status: item.status, note: item.note })),
              scene,
              reading,
              objectKind: plan.objectKind ?? "other",
            }),
            "可信度检查",
            { temperature: 0.2, maxTokens: 3200 },
          );
          qaChecks = [
            ...deterministic,
            ...raw.checks.map((check, index) => ({ ...check, id: check.id ?? `llm-${index + 1}` })),
          ];
          qaScore = raw.score;
          qaVerdict = raw.verdict;
          qaLimitations = raw.limitations;
        } catch {
          qaLimitations.push("独立质检模型没有返回结构化结果，本报告主要依赖确定性检查。");
        }
      }
      const merged = mergeQA(deterministic, qaChecks.slice(deterministic.length), [...qaLimitations, ...limitations]);
      const finalQA: QAResult = {
        ...merged,
        score: qaScore > 0 ? Math.round((merged.score + qaScore) / 2) : merged.score,
        verdict: qaVerdict || merged.verdict,
      };
      const credibility = deriveCredibility({
        sources: state.sources,
        claims: state.claims,
        conflicts: state.conflicts,
        debates: state.debates,
        gaps: state.synthesis?.gaps ?? [],
        limitations: finalQA.limitations,
        qa: finalQA,
        completedAt: Date.now(),
      });
      state.qa = finalQA;
      state.credibility = credibility;
      setStage("qa", "done", `可信度：${trustLevelLabel(credibility.level)} · 5 个信号`);
      addEvent("qa", "可信度检查完成", credibility.summary, credibility.level === "limited" ? "warn" : "good", false);
      commit();
    }

    const qa = state.qa ?? mergeQA(
      deterministicQA(
        contentSections,
        state.sources,
        state.claims,
        state.conflicts,
        figureCache,
        depth,
        state.synthesis?.gaps ?? [],
        reading.style,
      ),
      [],
      limitations,
    );
    const credibility = state.credibility ?? deriveCredibility({
      sources: state.sources,
      claims: state.claims,
      conflicts: state.conflicts,
      debates: state.debates,
      gaps: state.synthesis?.gaps ?? [],
      limitations: qa.limitations,
      qa,
      completedAt: Date.now(),
    });
    state.credibility = credibility;

    const sections = [
      ...contentSections,
      methodSection(
        outline,
        state.frameworks,
        state.synthesis ?? fallbackSynthesis(state.claims, plan),
        qa,
        credibility,
        state.sources,
        scene,
        plan.objectKind ?? "other",
      ),
    ];
    const report = buildReport(
      { ...state, reportId: undefined },
      outline,
      sections,
      figureCache,
      state.sources,
      state.frameworks,
      state.debates,
      qa,
      state.synthesis ?? fallbackSynthesis(state.claims, plan),
      limitations,
      providerName,
      scene,
    );
    report.id = report.id || crypto.randomUUID();
    state.reportId = report.id;
    state.status = "complete";
    state.stats.endedAt = Date.now();
    setStage("typeset", "done", "报告已生成；打开阅读器即可在浏览器内排版 PDF");
    addEvent("done", "研究完成", `报告已生成，共 ${report.sections.length} 节、${report.sources.length} 个来源`, "good", false);
    commit();
    await options.onReport(report);
    return report;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      const active = state.stages.find((stage) => stage.status === "active");
      if (active) {
        active.detail = "已暂停";
      }
      state.status = "paused";
      addEvent("system", "研究已暂停", "已保留当前进度，回来可以继续。", "warn");
      commit();
      return null;
    }
    const message =
      error instanceof LLMError
        ? error.message
        : error instanceof ResearchApiError
          ? error.message
          : error instanceof AgentError
            ? error.message
            : "研究过程中出现未知错误。";
    const active = state.stages.find((stage) => stage.status === "active");
    if (active) {
      active.status = "error";
      active.detail = message;
      active.endedAt = Date.now();
    }
    state.status = "error";
    state.error = message;
    addEvent("error", "研究中断", message, "bad");
    commit();
    return null;
  }
}

export function stageLabel(id: string): string {
  const labels: Record<string, string> = {
    intake: "拆题",
    bare: "先看一眼",
    search: "找资料",
    evidence: "找证据",
    verify: "对证据",
    frameworks: "选透镜",
    debate: "反方上桌",
    outline: "搭结构",
    write: "写成读物",
    qa: "可信度检查",
    typeset: "排版",
  };
  return labels[id] ?? id;
}
