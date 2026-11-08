import { describe, expect, it } from "vitest";
import { gradeRank, sourceGrade, sourceGradeLabel } from "./source-grade";
import type { Source } from "@/types";

function source(overrides: Partial<Source> = {}): Source {
  return {
    id: "s1",
    title: "示例来源",
    url: "https://example.com/a",
    site: "example.com",
    snippet: "",
    type: "web",
    accessedAt: 1,
    credibility: "medium",
    score: 1,
    ...overrides,
  };
}

describe("sourceGrade", () => {
  it("grades official, academic, media, organization, community, and unknown hosts", () => {
    expect(sourceGrade(source({ url: "https://www.gov.cn/zhengce" }))).toBe("L1");
    expect(sourceGrade(source({ url: "https://arxiv.org/abs/1234" }))).toBe("L2");
    expect(sourceGrade(source({ url: "https://www.xinhuanet.com/world" }))).toBe("L3");
    expect(sourceGrade(source({ url: "https://www.who.int/news" }))).toBe("L1");
    expect(sourceGrade(source({ url: "https://example.org/report" }))).toBe("L4");
    expect(sourceGrade(source({ url: "https://www.zhihu.com/question/1" }))).toBe("L5");
    expect(sourceGrade(source({ url: "https://unknown.example/a", credibility: "low" }))).toBe("L6");
  });

  it("keeps an explicit grade and honors source type", () => {
    expect(sourceGrade(source({ grade: "L2", url: "https://unknown.example/a" }))).toBe("L2");
    expect(sourceGrade(source({ type: "paper", url: "https://unknown.example/a" }))).toBe("L2");
    expect(sourceGrade(source({ type: "official", url: "https://unknown.example/a" }))).toBe("L1");
  });

  it("maps grades to labels and order", () => {
    expect(sourceGradeLabel(source({ url: "https://www.gov.cn/a" }))).toBe("官方 / 法规");
    expect(gradeRank("L1")).toBeLessThan(gradeRank("L6"));
    expect(gradeRank("L6")).toBe(5);
  });
});
