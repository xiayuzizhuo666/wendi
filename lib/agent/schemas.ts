import { z } from "zod";

const confidence = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const map: Record<string, string> = { 高: "high", 中: "medium", 低: "low", 高置信: "high", 中置信: "medium", 低置信: "low" };
    return map[value.trim()] ?? value.trim().toLowerCase();
  },
  z.enum(["high", "medium", "low"]),
);

const stance = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const map: Record<string, string> = { 支持: "support", 反对: "oppose", 中立: "neutral", 中性: "neutral", 质疑: "oppose" };
    return map[value.trim()] ?? value.trim().toLowerCase();
  },
  z.enum(["support", "oppose", "neutral"]),
);

const objectKind = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const raw = value.trim().toLowerCase();
    const map: Record<string, string> = {
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
      其他: "other",
    };
    return map[raw] ?? raw;
  },
  z.enum(["concept", "product", "company", "person", "event", "phenomenon", "book", "work", "other"]),
);

const sectionRole = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const map: Record<string, string> = {
      开场: "hook",
      定义: "definition",
      来路: "origin",
      历史: "origin",
      机制: "mechanism",
      坐标: "landscape",
      版图: "landscape",
      交汇: "intersection",
      反方: "debate",
      争议: "debate",
      推演: "future",
      未来: "future",
      收束: "bottom",
      结尾: "bottom",
      说明: "credibility",
      可信度: "credibility",
    };
    return map[value.trim()] ?? value.trim().toLowerCase();
  },
  z.enum(["hook", "definition", "origin", "mechanism", "landscape", "intersection", "debate", "future", "bottom", "credibility", "other"]),
);

const claimAxis = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const map: Record<string, string> = {
      纵向: "vertical",
      来路: "vertical",
      历史: "vertical",
      横向: "horizontal",
      版图: "horizontal",
      交汇: "intersection",
      反方: "opposition",
      批评: "opposition",
      背景: "context",
    };
    return map[value.trim()] ?? value.trim().toLowerCase();
  },
  z.enum(["vertical", "horizontal", "intersection", "opposition", "context"]),
);

const claimKind = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const map: Record<string, string> = { 事实: "fact", 解释: "interpretation", 判断: "interpretation", 预测: "prediction", 观点: "interpretation" };
    return map[value.trim()] ?? value.trim().toLowerCase();
  },
  z.enum(["fact", "interpretation", "prediction"]),
);

export const planSchema = z.object({
  oneLiner: z.string().min(4).max(180),
  type: z.string().max(40).default("概念"),
  objectKind: objectKind.optional(),
  subject: z
    .object({
      title: z.string().max(180).optional(),
      author: z.string().max(120).optional(),
      year: z.string().max(30).optional(),
    })
    .optional(),
  audience: z.string().max(120).default("聪明的非专家"),
  questions: z
    .array(z.object({ id: z.string().max(20).optional(), question: z.string().min(4).max(200), why: z.string().max(240).default("") }))
    .min(3)
    .max(8),
  queries: z
    .array(
      z.object({
        query: z.string().min(2).max(180),
        intent: z.string().max(40).default("definition"),
        sources: z.array(z.string()).default([]),
      }),
    )
    .min(3)
    .max(10),
  searchQueryEn: z.string().max(180).optional(),
  cautions: z.array(z.string().max(200)).max(6).default([]),
});

export const bareSchema = z.object({
  text: z.string().min(50).max(900),
  assumptions: z.array(z.string().max(200)).max(5).default([]),
  analogies: z.array(z.string().max(200)).max(4).default([]),
});

export const claimsSchema = z.object({
  claims: z
    .array(
      z.object({
        sourceId: z.string().min(1).max(20),
        claim: z.string().min(4).max(260),
        quote: z.string().max(400).default(""),
        kind: claimKind.default("fact"),
        confidence: confidence.default("medium"),
        stance: stance.default("neutral"),
        axis: claimAxis.default("context"),
        topic: z.string().max(80).default(""),
      }),
    )
    .max(20),
});

export const synthesisSchema = z.object({
  consensus: z
    .array(
      z.object({
        topic: z.string().max(80),
        summary: z.string().min(4).max(400),
        evidenceIds: z.array(z.string()).default([]),
        confidence: confidence.default("medium"),
      }),
    )
    .max(8)
    .default([])
    .catch([]),
  conflicts: z
    .array(
      z.object({
        topic: z.string().max(100),
        positions: z
          .array(
            z.object({
              label: z.string().max(60),
              argument: z.string().min(4).max(500),
              evidenceIds: z.array(z.string()).default([]),
            }),
          )
          .min(2)
          .max(4),
        whyItMatters: z.string().max(400).default(""),
        verdict: z.string().max(500).default(""),
        confidence: confidence.default("medium"),
        evidenceIds: z.array(z.string()).default([]),
      }),
    )
    .max(6)
    .default([])
    .catch([]),
  gaps: z.array(z.string().max(300)).max(8).default([]).catch([]),
  sourceNotes: z
    .array(z.object({ sourceId: z.string(), note: z.string().max(300), bias: z.string().max(200).optional() }))
    .max(12)
    .default([])
    .catch([]),
  answerMap: z
    .array(
      z.object({
        questionId: z.string().max(20),
        answer: z.string().min(2).max(600),
        confidence: confidence.default("medium"),
        evidenceIds: z.array(z.string()).default([]),
      }),
    )
    .max(8)
    .default([])
    .catch([]),
  synthesisNote: z.string().max(1200).default("").catch(""),
});

export const frameworksSchema = z.object({
  frameworks: z
    .array(
      z.object({
        name: z.string().min(2).max(40),
        why: z.string().min(4).max(400),
        reveals: z.string().min(4).max(500),
      }),
    )
    .min(1)
    .max(4),
});

export const debatesSchema = z.object({
  debates: z
    .array(
      z.object({
        question: z.string().min(4).max(240),
        pro: z.object({
          label: z.string().max(40).default("支持方"),
          thesis: z.string().min(4).max(400),
          points: z
            .array(z.object({ text: z.string().min(4).max(500), evidenceIds: z.array(z.string()).default([]) }))
            .min(1)
            .max(5),
        }),
        contra: z.object({
          label: z.string().max(40).default("反方"),
          thesis: z.string().min(4).max(400),
          points: z
            .array(z.object({ text: z.string().min(4).max(500), evidenceIds: z.array(z.string()).default([]) }))
            .min(1)
            .max(5),
        }),
        verdict: z.string().min(4).max(700),
        confidence: confidence.default("medium"),
        changeMyMind: z.string().max(600).default(""),
      }),
    )
    .min(1)
    .max(3),
});

const figureBriefs = z
  .object({
    timeline: z
      .object({
        title: z.string().max(80).default("时间线"),
        events: z
          .array(
            z.object({
              date: z.string().max(40),
              title: z.string().max(120),
              detail: z.string().max(300).default(""),
              sourceId: z.string().max(20).optional(),
            }),
          )
          .min(3)
          .max(10),
      })
      .optional(),
    conceptMap: z
      .object({
        title: z.string().max(80).default("概念地图"),
        center: z.string().max(60),
        nodes: z
          .array(z.object({ id: z.string().max(30).optional(), label: z.string().max(60), relation: z.string().max(120), weight: z.number().min(1).max(5).optional() }))
          .min(4)
          .max(9),
      })
      .optional(),
    matrix: z
      .object({
        title: z.string().max(80).default("对比矩阵"),
        columns: z.array(z.string().max(60)).min(2).max(5),
        rows: z
          .array(z.object({ label: z.string().max(60), values: z.array(z.string().max(300)).min(2).max(5), note: z.string().max(200).optional() }))
          .min(2)
          .max(7),
      })
      .optional(),
  })
  .default({});

export const outlineSchema = z.object({
  title: z.string().min(4).max(80),
  subtitle: z.string().max(100).default(""),
  oneLiner: z.string().min(10).max(220),
  tldr: z.array(z.string().min(10).max(300)).min(2).max(4),
  keyQuestions: z.array(z.string().max(200)).min(2).max(6),
  tags: z.array(z.string().max(30)).max(6).default([]),
  sections: z
    .array(
      z.object({
        id: z.string().max(20).optional(),
        role: sectionRole.default("other"),
        title: z.string().min(2).max(60),
        kicker: z.string().max(40).default(""),
        purpose: z.string().max(300).default(""),
        takeaway: z.string().max(200).default(""),
        points: z.array(z.string().max(220)).min(1).max(6),
        evidenceIds: z.array(z.string()).default([]),
        figureId: z.string().max(40).optional(),
      }),
    )
    .min(4)
    .max(9),
  figureBriefs,
});

function normalizeBlockCandidate(raw: unknown): unknown {
  if (typeof raw === "string") return raw.trim() ? { type: "p", text: raw } : null;
  if (!raw || typeof raw !== "object") return raw;
  const block = { ...(raw as Record<string, unknown>) };
  const rawType = typeof block.type === "string" ? block.type.trim().toLowerCase() : "";
  const typeMap: Record<string, string> = {
    paragraph: "p",
    text: "p",
    heading: "h3",
    subheading: "h3",
    subhead: "h3",
    bullet: "list",
    bullets: "list",
    unordered_list: "list",
    "unordered-list": "list",
    ordered_list: "list",
    "ordered-list": "list",
    checklist: "list",
    blockquote: "quote",
    note: "callout",
    tip: "callout",
    warning: "callout",
    insight: "callout",
    summary: "keyline",
    image: "figure",
  };
  const type = typeMap[rawType] ?? rawType;
  if (!type) {
    if (typeof block.text === "string" && block.text.trim()) return { type: "p", text: block.text };
    return raw;
  }
  if (type === "list" && !Array.isArray(block.items)) {
    const source = Array.isArray(block.bullets) ? block.bullets : Array.isArray(block.points) ? block.points : [];
    block.items = source
      .map((item) => (typeof item === "string" ? item : item && typeof item === "object" && "text" in item ? String((item as { text: unknown }).text) : ""))
      .filter((item): item is string => Boolean(item));
  }
  if (type === "callout") {
    block.tone = typeof block.tone === "string" ? block.tone : "insight";
    if (!block.text && typeof block.content === "string") block.text = block.content;
    if (!block.text && typeof block.title === "string") block.text = block.title;
  }
  if (type === "quote" && !block.text && typeof block.content === "string") block.text = block.content;
  if (type === "mythFact" && !Array.isArray(block.items) && Array.isArray(block.pairs)) block.items = block.pairs;
  if (type === "scenario" && !Array.isArray(block.items) && Array.isArray(block.scenarios)) block.items = block.scenarios;
  if (type === "furtherReading" && !Array.isArray(block.items) && Array.isArray(block.readings)) block.items = block.readings;
  if (type === "judgment" && !block.confidence) block.confidence = "medium";
  if (type === "figure" && !block.figureId && typeof block.id === "string") block.figureId = block.id;
  if (typeof block.text === "string") {
    const maxText =
      type === "h3" ? 150 : type === "keyline" ? 280 : type === "quote" ? 1900 : type === "callout" || type === "judgment" ? 2300 : 5900;
    block.text = block.text.trim().slice(0, maxText);
  }
  if (type === "list" && Array.isArray(block.items)) {
    block.items = block.items.slice(0, 10).map((item) => String(item ?? "").slice(0, 780));
  }
  if (type === "callout" && typeof block.title === "string") block.title = block.title.slice(0, 110);
  return { ...block, type };
}

const blockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("p"), text: z.string().min(2).max(6000) }),
  z.object({ type: z.literal("h3"), text: z.string().min(1).max(160) }),
  z.object({
    type: z.literal("callout"),
    tone: z.enum(["insight", "warning", "note", "question"]).default("insight"),
    title: z.string().max(120).optional(),
    text: z.string().min(2).max(2400),
  }),
  z.object({ type: z.literal("list"), ordered: z.boolean().default(false), items: z.array(z.string().min(1).max(800)).min(2).max(10) }),
  z.object({ type: z.literal("quote"), text: z.string().min(2).max(2000), attribution: z.string().max(160).optional(), sourceId: z.string().max(20).optional() }),
  z.object({
    type: z.literal("table"),
    headers: z.array(z.string().max(120)).min(2).max(5),
    rows: z.array(z.array(z.string().max(500)).min(2).max(5)).min(1).max(10),
    caption: z.string().max(300).optional(),
  }),
  z.object({ type: z.literal("figure"), figureId: z.string().max(40) }),
  z.object({ type: z.literal("keyline"), text: z.string().min(2).max(300) }),
  z.object({
    type: z.literal("steps"),
    items: z.array(z.object({ title: z.string().max(100), text: z.string().max(800) })).min(2).max(8),
  }),
  z.object({
    type: z.literal("judgment"),
    label: z.string().max(80).optional(),
    text: z.string().min(2).max(2400),
    confidence: confidence.default("medium"),
    changeMyMind: z.string().max(1200).optional(),
  }),
  z.object({
    type: z.literal("mythFact"),
    items: z
      .array(z.object({ myth: z.string().min(2).max(800), fact: z.string().min(2).max(800), note: z.string().max(500).optional() }))
      .min(1)
      .max(4),
  }),
  z.object({
    type: z.literal("furtherReading"),
    items: z
      .array(
        z.object({
          title: z.string().min(1).max(200),
          author: z.string().max(160).optional(),
          why: z.string().min(2).max(500),
          url: z.string().max(700).optional(),
        }),
      )
      .min(1)
      .max(6),
  }),
  z.object({
    type: z.literal("scenario"),
    items: z
      .array(z.object({ name: z.string().min(1).max(100), text: z.string().min(2).max(1000), signal: z.string().min(2).max(500) }))
      .min(2)
      .max(4),
  }),
]);

export const sectionSchema = z.object({
  blocks: z
    .array(z.any())
    .transform((items) =>
      items
        .map(normalizeBlockCandidate)
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
        .filter((item) => blockSchema.safeParse(item).success)
        .slice(0, 24),
    )
    .pipe(z.array(blockSchema).min(2).max(24)),
});

export const rerankSchema = z.object({
  scores: z
    .array(
      z.object({
        id: z.string().min(1).max(20),
        relevance: z.coerce.number().min(0).max(5),
        note: z.string().max(160).optional(),
      }),
    )
    .min(1)
    .max(80),
});

export const qaSchema = z.object({
  score: z.number().min(0).max(100),
  verdict: z.string().max(300),
  checks: z
    .array(
      z.object({
        id: z.string().max(20).optional(),
        label: z.string().max(60),
        status: z.preprocess(
          (value) => {
            if (typeof value !== "string") return value;
            const map: Record<string, string> = { 通过: "pass", 警告: "warn", 不通过: "fail", 失败: "fail", 提醒: "warn" };
            return map[value.trim()] ?? value.trim().toLowerCase();
          },
          z.enum(["pass", "warn", "fail"]),
        ),
        note: z.string().max(400).default(""),
      }),
    )
    .min(4)
    .max(20),
  limitations: z.array(z.string().max(300)).max(8).default([]),
});
