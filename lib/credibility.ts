import type { Claim, Conflict, Credibility, Debate, QAResult, Source, TrustLevel, TrustSignal } from "@/types";

export interface CredibilityInput {
  sources: Source[];
  claims?: Claim[];
  conflicts?: Conflict[];
  debates?: Debate[];
  gaps?: string[];
  limitations?: string[];
  qa: QAResult;
  completedAt?: number;
}

const LEVEL_TEXT: Record<TrustLevel, string> = {
  strong: "较强",
  fair: "中等",
  limited: "有限",
};

export function trustLevelLabel(level: TrustLevel): string {
  return LEVEL_TEXT[level];
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function statusValue(status: "pass" | "warn" | "fail"): number {
  return status === "pass" ? 1 : status === "warn" ? 0.5 : 0;
}

function checkScore(qa: QAResult, keywords: string[], fallback = 0.5): number {
  const matched = qa.checks.filter((check) => keywords.some((keyword) => check.label.includes(keyword)));
  if (matched.length === 0) return fallback;
  return matched.reduce((sum, check) => sum + statusValue(check.status), 0) / matched.length;
}

function levelFor(score: number): TrustLevel {
  return score >= 0.68 ? "strong" : score >= 0.42 ? "fair" : "limited";
}

function firstCheckNote(qa: QAResult, keywords: string[]): string {
  const check = qa.checks.find((item) => keywords.some((keyword) => item.label.includes(keyword)));
  return check?.note ?? "";
}

function validDate(value?: string): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function deriveCredibility(input: CredibilityInput): Credibility {
  const sources = input.sources ?? [];
  const claims = input.claims ?? [];
  const conflicts = input.conflicts ?? [];
  const debates = input.debates ?? [];
  const gaps = input.gaps ?? [];
  const limitations = input.limitations ?? input.qa.limitations ?? [];
  const totalSources = Math.max(1, sources.length);
  const highSources = sources.filter((source) => source.credibility === "high").length;
  const verifiedSources = sources.filter((source) => source.verified).length;
  const typeCount = new Set(sources.map((source) => source.type)).size;
  const citationScore = checkScore(input.qa, ["引用覆盖", "引用完整性"]);
  const sourceScore = clamp(
    0.4 * (highSources / totalSources) +
      0.2 * Math.min(typeCount / 4, 1) +
      0.2 * (verifiedSources / totalSources) +
      0.2 * citationScore,
  );
  const sourceNote =
    sources.length === 0
      ? "没有记录来源；这份读物的证据基础无法判断。"
      : `${sources.length} 个来源、${typeCount} 种类型；${highSources} 个高可信，${verifiedSources} 个已打开正文。${firstCheckNote(input.qa, ["引用覆盖", "引用完整性"])}`;

  const opposingClaims = claims.filter((claim) => claim.stance === "oppose").length;
  const counterScore = clamp(
    0.3 * Math.min(debates.length, 1) +
      0.25 * Math.min(conflicts.length / 2, 1) +
      0.2 * Math.min(opposingClaims / 3, 1) +
      0.25 * checkScore(input.qa, ["对立视角", "对立/批评视角", "反方压力测试"]),
  );
  const counterNote =
    `${debates.length} 场正反辩论，${conflicts.length} 个争议条目${opposingClaims > 0 ? `，${opposingClaims} 条反方证据` : ""}。` +
    firstCheckNote(input.qa, ["对立视角", "对立/批评视角", "反方压力测试"]);

  const factClaims = claims.filter((claim) => claim.kind === "fact").length;
  const factRatio = claims.length > 0 ? factClaims / claims.length : 0.55;
  const transparencyScore = clamp(
    0.45 * citationScore +
      0.35 * checkScore(input.qa, ["叙事构造", "逻辑跳跃", "伪对立", "表达质量"]) +
      0.2 * Math.min(factRatio * 1.2, 1),
  );
  const transparencyNote =
    `${claims.length > 0 ? `${claims.length} 条证据中 ${factClaims} 条事实、${claims.length - factClaims} 条解释/预测` : "证据账本未随读物保存"}；` +
    firstCheckNote(input.qa, ["引用覆盖", "叙事构造", "逻辑跳跃"]);

  const unknownScore = clamp(
    0.45 * checkScore(input.qa, ["剩余不确定性", "不确定性披露"]) +
      0.2 * Math.min(gaps.length / 2, 1) +
      0.2 * Math.min(limitations.length / 3, 1) +
      0.15 * Math.min(conflicts.length / 2, 1),
  );
  const unknownNote = `记录了 ${gaps.length} 个证据缺口、${limitations.length} 条局限、${conflicts.length} 个争议。`;

  const now = new Date(input.completedAt ?? Date.now()).getTime();
  const threeYearsAgo = now - 3 * 365 * 24 * 60 * 60 * 1000;
  const dated = sources.map((source) => validDate(source.publishedAt)).filter((value): value is number => value !== null);
  const recent = dated.filter((value) => value >= threeYearsAgo).length;
  const datedRatio = sources.length > 0 ? dated.length / sources.length : 0;
  const freshness = dated.length > 0 ? 0.7 * (recent / dated.length) + 0.3 * datedRatio : 0;
  const changeMyMind = debates.filter((debate) => debate.changeMyMind.trim().length > 0).length;
  const falsifiabilityScore = clamp(
    0.35 * freshness + 0.4 * Math.min(changeMyMind, 1) + 0.25 * checkScore(input.qa, ["不确定性披露", "剩余不确定性"]),
  );
  const falsifiabilityNote = `${dated.length} 个来源有明确日期，${recent} 个在近三年内；${changeMyMind} 个争议写明了什么会改变判断。`;

  const signals: TrustSignal[] = [
    { id: "sources", label: "来源硬度", level: levelFor(sourceScore), note: sourceNote },
    { id: "counter", label: "反方强度", level: levelFor(counterScore), note: counterNote },
    { id: "transparency", label: "推断透明度", level: levelFor(transparencyScore), note: transparencyNote },
    { id: "unknowns", label: "未知与争议", level: levelFor(unknownScore), note: unknownNote },
    { id: "falsifiability", label: "时效与可证伪", level: levelFor(falsifiabilityScore), note: falsifiabilityNote },
  ];

  const average = (sourceScore + counterScore + transparencyScore + unknownScore + falsifiabilityScore) / signals.length;
  const draftPenalty = limitations.some((text) => /草稿|不完整|未完成|结构不稳定|截断/.test(text)) ? 0.2 : 0;
  const failPenalty = Math.min(0.15, input.qa.checks.filter((check) => check.status === "fail").length * 0.05);
  const citationCheck = input.qa.checks.find((check) => check.label.includes("引用覆盖"));
  const citationPenalty = citationCheck && citationCheck.status !== "pass" ? 0.08 : 0;
  const penalty = Math.min(0.35, draftPenalty + failPenalty + citationPenalty);
  const adjustedLevel = levelFor(clamp(average - penalty));
  const level = penalty > 0 && adjustedLevel === "strong" ? "fair" : adjustedLevel;
  const weakest = [...signals].sort((a, b) => {
    const rank = { limited: 0, fair: 1, strong: 2 };
    return rank[a.level] - rank[b.level];
  })[0];
  const baseSummary =
    level === "strong"
      ? `整体可信度较高；五个信号里最需要留意的是「${weakest.label}」。`
      : level === "fair"
        ? `整体可信度中等；「${weakest.label}」是当前最需要留意的一项。`
        : `整体可信度有限；「${weakest.label}」是目前最薄弱的一项，结论应谨慎使用。`;
  const penaltyReasons = [
    draftPenalty > 0 ? "存在未完成章节" : "",
    citationPenalty > 0 ? "引用覆盖偏低" : "",
    failPenalty > 0 ? "后台检查有未通过项" : "",
  ].filter(Boolean);
  const summary = penaltyReasons.length > 0 ? `${baseSummary} ${penaltyReasons.join("、")}，整体置信度已下调。` : baseSummary;

  return { level, summary, signals };
}
