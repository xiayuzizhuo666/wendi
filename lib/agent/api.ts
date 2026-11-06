import type { Scene, SearchConfig, Source } from "@/types";

export interface PageContent {
  title: string;
  text: string;
  siteName: string;
  publishedAt?: string;
  description?: string;
  url: string;
}

export class ResearchApiError extends Error {
  code: string;

  constructor(message: string, code = "research_api_error") {
    super(message);
    this.name = "ResearchApiError";
    this.code = code;
  }
}

function withTimeout(signal: AbortSignal | undefined, ms: number): AbortSignal {
  const timeout = AbortSignal.timeout(ms);
  if (!signal) return timeout;
  return AbortSignal.any([signal, timeout]);
}

async function postJson<T>(path: string, body: unknown, signal: AbortSignal | undefined, timeoutMs: number): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/functions/v1/app${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: withTimeout(signal, timeoutMs),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ResearchApiError("无法连接研究服务，请检查网络或稍后重试。", "network_error");
  }

  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; error?: string; message?: string; sources?: unknown; warnings?: unknown }
    | null;

  if (!response.ok || !payload?.ok) {
    throw new ResearchApiError(payload?.message || "研究服务返回了错误。", payload?.error || "research_api_error");
  }
  return payload as T;
}

export async function searchSources(
  queries: string[],
  scene: Scene,
  search: SearchConfig,
  signal?: AbortSignal,
  subject?: { title?: string; author?: string },
  demoToken?: string,
  deepseekQuery?: string,
): Promise<{ sources: Omit<Source, "id" | "accessedAt">[]; warnings: string[] }> {
  const payload = await postJson<{
    sources: Omit<Source, "id" | "accessedAt">[];
    warnings: string[];
  }>(
    "/search",
    {
      queries,
      scene,
      allowWeb: true,
      subject,
      demoToken,
      deepseekQuery,
      search: { provider: search.provider, apiKey: search.provider === "none" ? "" : search.apiKey },
    },
    signal,
    120_000,
  );
  return {
    sources: Array.isArray(payload.sources) ? payload.sources : [],
    warnings: Array.isArray(payload.warnings) ? payload.warnings : [],
  };
}

export async function fetchSource(url: string, signal?: AbortSignal, maxChars = 20_000): Promise<PageContent> {
  const payload = await postJson<PageContent & { ok?: boolean }>("/fetch", { url, maxChars }, signal, 40_000);
  if (!payload.text) throw new ResearchApiError("这个页面没有可提取的正文。", "empty_page");
  return payload;
}

export async function checkUrls(urls: string[], signal?: AbortSignal): Promise<{ url: string; status: number; ok: boolean }[]> {
  const payload = await postJson<{ results: { url: string; status: number; ok: boolean }[] }>("/check", { urls }, signal, 45_000);
  return payload.results;
}
