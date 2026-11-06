import type { ReportDoc, Source } from "@/types";

export function formatDate(value: number): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

export function formatShortDate(value: number): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date(value))
    .replaceAll("/", ".");
}

export function formatClock(value: number): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    return `${hours} 小时 ${minutes % 60} 分`;
  }
  if (minutes > 0) return `${minutes} 分 ${seconds.toString().padStart(2, "0")} 秒`;
  return `${seconds} 秒`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("zh-CN").format(value);
}

export function maskKey(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "••••••";
  return `${key.slice(0, 4)}••••••${key.slice(-4)}`;
}

export function sourceNumber(sources: Source[], id: string): number {
  const index = sources.findIndex((source) => source.id === id);
  return index >= 0 ? index + 1 : 0;
}

export function wordCount(report: ReportDoc): number {
  return report.sections.reduce((sum, section) => {
    return (
      sum +
      section.blocks.reduce((blockSum, block) => {
        if (block.type === "p" || block.type === "h3" || block.type === "keyline") return blockSum + block.text.length;
        if (block.type === "callout") return blockSum + block.text.length + (block.title?.length ?? 0);
        if (block.type === "list") return blockSum + block.items.join("").length;
        if (block.type === "quote") return blockSum + block.text.length;
        if (block.type === "table") return blockSum + block.rows.flat().join("").length;
        if (block.type === "steps") return blockSum + block.items.map((item) => item.title + item.text).join("").length;
        return blockSum;
      }, 0)
    );
  }, 0);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(text: string, filename: string, mime = "text/plain;charset=utf-8"): void {
  downloadBlob(new Blob([text], { type: mime }), filename);
}

export function downloadJson(value: unknown, filename: string): void {
  downloadText(JSON.stringify(value, null, 2), filename, "application/json;charset=utf-8");
}

export function safeFilename(value: string): string {
  return value.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim().slice(0, 80) || "问底报告";
}

export function relativeTime(value: number): string {
  const diff = Date.now() - value;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return formatShortDate(value);
}
