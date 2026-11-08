import { describe, expect, it } from "vitest";
import { deriveCredibility, trustLevelLabel } from "./credibility";
import type { Claim, Conflict, Debate, QAResult, Source } from "@/types";

function source(index: number, overrides: Partial<Source> = {}): Source {
  return {
    id: `s${index}`,
    title: `来源 ${index}`,
    url: `https://www.gov.cn/source-${index}`,
    site: "www.gov.cn",
    snippet: "",
    type: "official",
    publishedAt: "2025-01-01",
    accessedAt: Date.now(),
    credibility: "high",
    score: 4,
    verified: true,
    ...overrides,
  };
}

function claim(index: number, overrides: Partial<Claim> = {}): Claim {
  return {
    id: `c${index}`,
    text: `事实 ${index}`,
    quote: "",
    sourceId: `s${index}`,
    kind: "fact",
    confidence: "high",
    stance: "support",
    topic: "示例",
    axis: "vertical",
    ...overrides,
  };
}

function qa(overrides: Partial<QAResult> = {}): QAResult {
  return {
    score: 96,
    verdict: "通过",
    checks: [
      { id: "citation", label: "引用覆盖", status: "pass", note: "引用覆盖 92%" },
      { id: "counter", label: "对立视角", status: "pass", note: "正反双方均有证据" },
      { id: "logic", label: "逻辑跳跃", status: "pass", note: "未发现明显跳跃" },
      { id: "uncertainty", label: "不确定性披露", status: "pass", note: "已写明未知" },
      { id: "craft", label: "叙事构造", status: "pass", note: "结构完整" },
    ],
    limitations: [],
    ...overrides,
  };
}

const debate: Debate = {
  id: "d1",
  question: "这个判断成立吗？",
  pro: { label: "支持方", thesis: "支持", points: [{ text: "支持证据", evidenceIds: ["s1"] }] },
  contra: { label: "反对方", thesis: "反对", points: [{ text: "反对证据", evidenceIds: ["s2"] }] },
  verdict: "尚无定论",
  confidence: "medium",
  changeMyMind: "出现新的随机试验会改变判断",
};

const conflict: Conflict = {
  id: "cf1",
  topic: "争议",
  positions: [
    { label: "支持", argument: "一方观点", evidenceIds: ["s1"] },
    { label: "反方", argument: "另一方观点", evidenceIds: ["s2"] },
  ],
  whyItMatters: "影响结论",
  verdict: "保留争议",
  confidence: "medium",
  evidenceIds: ["s1", "s2"],
};

describe("deriveCredibility", () => {
  it("produces five signals and a strong level for a well-sourced report", () => {
    const result = deriveCredibility({
      sources: Array.from({ length: 10 }, (_, index) => source(index + 1)),
      claims: Array.from({ length: 10 }, (_, index) => claim(index + 1)),
      conflicts: [conflict],
      debates: [debate],
      gaps: ["一个证据缺口"],
      qa: qa(),
      completedAt: Date.now(),
    });

    expect(result.signals).toHaveLength(5);
    expect(result.level).toBe("strong");
    expect(result.summary).toContain("可信度较高");
  });

  it("lowers the level when the report has no sources and failed checks", () => {
    const result = deriveCredibility({
      sources: [],
      claims: [],
      conflicts: [],
      debates: [],
      gaps: [],
      qa: qa({
        score: 30,
        verdict: "不通过",
        checks: [
          { id: "citation", label: "引用覆盖", status: "fail", note: "没有引用" },
          { id: "counter", label: "对立视角", status: "fail", note: "没有反方" },
          { id: "logic", label: "逻辑跳跃", status: "fail", note: "跳跃" },
          { id: "uncertainty", label: "不确定性披露", status: "fail", note: "没有披露" },
          { id: "craft", label: "叙事构造", status: "fail", note: "结构不完整" },
        ],
      }),
      completedAt: Date.now(),
    });

    expect(result.level).toBe("limited");
    expect(result.summary).toContain("可信度有限");
    expect(result.signals.every((signal) => signal.level === "limited")).toBe(true);
  });

  it("labels trust levels", () => {
    expect(trustLevelLabel("strong")).toBe("较强");
    expect(trustLevelLabel("fair")).toBe("中等");
    expect(trustLevelLabel("limited")).toBe("有限");
  });
});
