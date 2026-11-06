import { mockChat } from "./mock.ts";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ProviderRoute {
  baseUrl: string;
  authStyle: "bearer" | "x-api-key";
}

const PROVIDERS: Record<string, ProviderRoute> = {
  deepseek: { baseUrl: "https://api.deepseek.com/v1", authStyle: "bearer" },
  qwen: { baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", authStyle: "bearer" },
  kimi: { baseUrl: "https://api.moonshot.cn/v1", authStyle: "bearer" },
  glm: { baseUrl: "https://open.bigmodel.cn/api/paas/v4", authStyle: "bearer" },
  doubao: { baseUrl: "https://ark.cn-beijing.volces.com/api/v3", authStyle: "bearer" },
  siliconflow: { baseUrl: "https://api.siliconflow.cn/v1", authStyle: "bearer" },
  minimax: { baseUrl: "https://api.minimax.chat/v1", authStyle: "bearer" },
};

const CUSTOM_HOSTS = [
  "api.deepseek.com",
  "dashscope.aliyuncs.com",
  "api.moonshot.cn",
  "open.bigmodel.cn",
  "ark.cn-beijing.volces.com",
  "api.siliconflow.cn",
  "api.minimax.chat",
  "api.openai.com",
  "openrouter.ai",
  "api.together.xyz",
  "api.groq.com",
  "api.mistral.ai",
  "api.x.ai",
];

export class ProxyError extends Error {
  code: string;
  status: number;

  constructor(code: string, status = 502) {
    super(code);
    this.name = "ProxyError";
    this.code = code;
    this.status = status;
  }
}

function resolveRoute(providerId: string, customBaseUrl?: string): ProviderRoute {
  const fixed = PROVIDERS[providerId];
  if (fixed) return fixed;
  if (providerId !== "custom" || !customBaseUrl) throw new ProxyError("unsupported_provider", 400);

  let url: URL;
  try {
    url = new URL(customBaseUrl);
  } catch {
    throw new ProxyError("invalid_base_url", 400);
  }
  if (url.protocol !== "https:") throw new ProxyError("https_required", 400);
  if (url.username || url.password) throw new ProxyError("invalid_base_url", 400);
  const host = url.hostname.toLowerCase();
  if (!CUSTOM_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))) {
    throw new ProxyError("host_not_allowed", 400);
  }
  return { baseUrl: customBaseUrl.replace(/\/+$/, ""), authStyle: "bearer" };
}

function upstreamMessage(status: number): string {
  if (status === 401) return "API key 无效或已过期。";
  if (status === 403) return "这个 key 没有调用该模型的权限。";
  if (status === 429) return "模型服务请求过于频繁或额度不足。";
  if (status === 400) return "模型不接受这次请求参数，请检查模型名与配置。";
  if (status >= 500) return "模型服务暂时不可用。";
  return "模型调用失败。";
}

function statusCodeToError(status: number): ProxyError {
  if (status === 401) return new ProxyError("unauthorized", 401);
  if (status === 403) return new ProxyError("forbidden", 403);
  if (status === 429) return new ProxyError("rate_limited", 429);
  if (status === 400) return new ProxyError("invalid_request", 400);
  return new ProxyError("upstream_error", status >= 500 ? 503 : 502);
}

function extractContent(payload: unknown): string {
  const data = payload as {
    choices?: { message?: { content?: string | { text?: string; type?: string }[] } }[];
  };
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === "string" ? part : part?.text ?? ""))
      .filter(Boolean)
      .join("");
  }
  return "";
}

function extractUsage(payload: unknown): { inputTokens: number; outputTokens: number } {
  const usage = (payload as { usage?: Record<string, number> })?.usage ?? {};
  return {
    inputTokens: Number(usage.prompt_tokens ?? usage.input_tokens ?? 0) || 0,
    outputTokens: Number(usage.completion_tokens ?? usage.output_tokens ?? 0) || 0,
  };
}

export interface ProxyChatOptions {
  providerId: string;
  baseUrl?: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  signal?: AbortSignal;
}

export interface ProxyChatResult {
  text: string;
  usage: { inputTokens: number; outputTokens: number };
  model: string;
}

export async function proxyChat(options: ProxyChatOptions): Promise<ProxyChatResult> {
  if (options.providerId === "mock") return mockChat(options);
  const route = resolveRoute(options.providerId, options.baseUrl);
  const endpoint = `${route.baseUrl}/chat/completions`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (route.authStyle === "x-api-key") headers["x-api-key"] = options.apiKey;
  else headers.Authorization = `Bearer ${options.apiKey}`;

  const baseBody: Record<string, unknown> = {
    model: options.model,
    messages: options.messages,
    temperature: Math.min(2, Math.max(0, options.temperature ?? 0.4)),
    max_tokens: Math.min(16_384, Math.max(16, options.maxTokens ?? 4096)),
    stream: false,
  };

  const timeout = AbortSignal.timeout(240_000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;

  const call = async (body: Record<string, unknown>) =>
    fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal,
      redirect: "follow",
    });

  let response = await call(options.json ? { ...baseBody, response_format: { type: "json_object" } } : baseBody);

  if (response.status === 400 && options.json) {
    const firstError = await response.text().catch(() => "");
    if (/response_format|json_object|json mode/i.test(firstError)) {
      response = await call(baseBody);
    }
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    const error = statusCodeToError(response.status);
    if (detail && /invalid|expired|quota|balance|model/i.test(detail) && detail.length < 300) {
      // Keep the error code stable; the client maps it to a friendly Chinese message.
      error.message = upstreamMessage(response.status);
    }
    throw error;
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ProxyError("invalid_upstream_response", 502);
  }

  const text = extractContent(payload).trim();
  if (!text) throw new ProxyError("empty_upstream_response", 502);
  const model = (payload as { model?: string })?.model || options.model;

  return { text, usage: extractUsage(payload), model };
}
