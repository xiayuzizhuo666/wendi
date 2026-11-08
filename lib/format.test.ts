import { describe, expect, it } from "vitest";
import { formatDuration, maskKey, safeFilename, sourceNumber, wordCount } from "./format";
import type { ReportDoc, Source } from "@/types";

const source = (id: string): Source => ({
  id,
  title: id,
  url: `https://example.com/${id}`,
  site: "example.com",
  snippet: "",
  type: "web",
  accessedAt: 1,
  credibility: "medium",
  score: 1,
});

describe("format helpers", () => {
  it("formats durations from seconds to hours", () => {
    expect(formatDuration(0)).toBe("0 秒");
    expect(formatDuration(65_000)).toBe("1 分 05 秒");
    expect(formatDuration(3_725_000)).toBe("1 小时 2 分");
  });

  it("masks keys without exposing the middle", () => {
    expect(maskKey("")).toBe("");
    expect(maskKey("short")).toBe("••••••");
    expect(maskKey("sk-1234567890abcdef")).toBe("sk-1••••••cdef");
  });

  it("finds source numbers and sanitizes filenames", () => {
    expect(sourceNumber([source("a"), source("b")], "b")).toBe(2);
    expect(sourceNumber([source("a")], "missing")).toBe(0);
    expect(safeFilename("问底 / 报告:测试")).toBe("问底 - 报告-测试");

    const noTitle = safeFilename("");
    expect(noTitle).toBe("问底报告");
  });

  it("counts words across report block types", () => {
    const report = {
      sections: [{
        blocks: [
          { type: "p", text: "一二三" },
          { type: "h3", text: "标题" },
          { type: "keyline", text: "关键" },
          { type: "callout", title: "提示", text: "内容" },
          { type: "list", items: ["甲", "乙"] },
          { type: "quote", text: "引用" },
          { type: "table", headers: ["列"], rows: [["值"]] },
          { type: "steps", items: [{ title: "步骤", text: "说明" }] },
        ],
      }],
    } as unknown as ReportDoc;

    expect(wordCount(report)).toBe(3 + 2 + 2 + 4 + 2 + 2 + 1 + 4);
  });
});
