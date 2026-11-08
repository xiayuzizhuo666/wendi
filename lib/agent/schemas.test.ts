import { describe, expect, it } from "vitest";
import { claimsSchema, planSchema, qaSchema, rerankSchema } from "./schemas";

describe("agent schemas", () => {
  it("normalizes Chinese object kinds and keeps a valid plan", () => {
    const plan = planSchema.parse({
      oneLiner: "一份关于预制菜的读物",
      type: "现象",
      objectKind: "现象",
      questions: [
        { question: "它为什么出现？", why: "背景" },
        { question: "争议在哪里？", why: "反方" },
        { question: "下一步看什么？", why: "行动" },
      ],
      queries: [
        { query: "预制菜 定义" },
        { query: "预制菜 争议" },
        { query: "预制菜 监管" },
      ],
    });

    expect(plan.objectKind).toBe("phenomenon");
    expect(plan.questions).toHaveLength(3);
    expect(plan.queries).toHaveLength(3);
  });

  it("normalizes Chinese claim fields and confidence labels", () => {
    const parsed = claimsSchema.parse({
      claims: [{
        sourceId: "s1",
        claim: "这是一个可以被核对的事实",
        kind: "事实",
        confidence: "高",
        stance: "反对",
        axis: "纵向",
      }],
    });

    expect(parsed.claims[0]).toMatchObject({
      kind: "fact",
      confidence: "high",
      stance: "oppose",
      axis: "vertical",
    });
  });

  it("accepts rerank scores as numbers or numeric strings and rejects out-of-range values", () => {
    expect(rerankSchema.parse({ scores: [{ id: "s1", relevance: "4.5" }] }).scores[0].relevance).toBe(4.5);
    expect(() => rerankSchema.parse({ scores: [{ id: "s1", relevance: 6 }] })).toThrow();
  });

  it("normalizes QA status words and requires at least four checks", () => {
    const parsed = qaSchema.parse({
      score: 90,
      verdict: "通过",
      checks: [
        { label: "引用覆盖", status: "通过", note: "ok" },
        { label: "对立视角", status: "警告", note: "weak" },
        { label: "逻辑跳跃", status: "不通过", note: "bad" },
        { label: "不确定性披露", status: "提醒", note: "ok" },
      ],
    });

    expect(parsed.checks.map((check) => check.status)).toEqual(["pass", "warn", "fail", "warn"]);
    expect(() => qaSchema.parse({ score: 90, verdict: "通过", checks: [] })).toThrow();
  });
});
