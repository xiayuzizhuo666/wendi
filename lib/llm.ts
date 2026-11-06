import type { ChatMessage, LLMUsage, ProviderConfig } from "@/types";
export type { ChatMessage } from "@/types";

export class LLMError extends Error {
  code: string;
  status?: number;

  constructor(message: string, code = "llm_error", status?: number) {
    super(message);
    this.name = "LLMError";
    this.code = code;
    this.status = status;
  }
}

interface ChatOptions {
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  retries?: number;
  demoToken?: string;
}

export interface ChatResult {
  text: string;
  usage: LLMUsage;
  model?: string;
}

function combineSignals(signal?: AbortSignal): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(new DOMException("timeout", "TimeoutError")), 240_000);
  const onAbort = () => controller.abort(signal?.reason);
  if (signal) {
    if (signal.aborted) controller.abort(signal.reason);
    else signal.addEventListener("abort", onAbort, { once: true });
  }
  return {
    signal: controller.signal,
    cleanup: () => {
      window.clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
    },
  };
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("aborted", "AbortError"));
      return;
    }
    const timer = window.setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new DOMException("aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

const FRIENDLY_ERRORS: Record<string, string> = {
  invalid_request: "模型请求参数不被接受，请检查模型名与账号权限。",
  unauthorized: "API key 无效或已过期，请到模型控制台重新生成。",
  forbidden: "这个 key 没有调用该模型的权限，或账号被限制。",
  rate_limited: "模型服务请求过于频繁或额度不足，请稍后再试。",
  upstream_error: "模型服务暂时不可用，请稍后再试。",
  timeout: "模型响应超时，请换一个更快的模型或稍后重试。",
  network_error: "无法连接模型服务，请检查网络或代理设置。",
  service_not_configured: "站点后端尚未就绪，请稍后重试。",
  demo_not_configured: "演示模式尚未配置，请联系站点维护者。",
  invalid_demo_token: "演示会话已失效，请重新输入邀请码。",
  demo_limit: "演示额度已用完，请稍后再试。",
};

export async function chatOnce(
  config: ProviderConfig,
  apiKey: string,
  messages: ChatMessage[],
  options: ChatOptions = {},
): Promise<ChatResult> {
  if (!options.demoToken?.trim() && !apiKey.trim()) throw new LLMError("还没有配置模型 API key。", "missing_key");
  if (!config.model.trim()) throw new LLMError("还没有填写模型名。", "missing_model");

  const retries = options.retries ?? 2;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const { signal, cleanup } = combineSignals(options.signal);
    try {
      const response = await fetch("/functions/v1/app/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: config.providerId,
          baseUrl: config.baseUrl || undefined,
          apiKey: options.demoToken ? "" : apiKey,
          demoToken: options.demoToken,
          model: config.model,
          messages,
          temperature: options.temperature ?? 0.4,
          maxTokens: options.maxTokens ?? 4096,
          json: options.json ?? false,
        }),
        signal,
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; text?: string; usage?: Partial<LLMUsage>; error?: string; message?: string; model?: string }
        | null;

      if (!response.ok || !payload?.ok || typeof payload.text !== "string") {
        const code = payload?.error ?? (response.status === 401 ? "unauthorized" : response.status === 429 ? "rate_limited" : "upstream_error");
        const message = payload?.message || FRIENDLY_ERRORS[code] || "模型调用失败。";
        const retryable = response.status === 429 || response.status >= 500;
        if (retryable && attempt < retries) {
          lastError = new LLMError(message, code, response.status);
          await sleep(900 * Math.pow(2, attempt), options.signal);
          continue;
        }
        throw new LLMError(message, code, response.status);
      }

      return {
        text: payload.text,
        usage: {
          inputTokens: payload.usage?.inputTokens ?? 0,
          outputTokens: payload.usage?.outputTokens ?? 0,
        },
        model: payload.model,
      };
    } catch (error) {
      cleanup();
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      if (error instanceof LLMError) throw error;
      lastError = error;
      if (attempt < retries) {
        await sleep(900 * Math.pow(2, attempt), options.signal);
        continue;
      }
    } finally {
      cleanup();
    }
  }

  const message = lastError instanceof Error ? lastError.message : "模型调用失败。";
  throw new LLMError(message || FRIENDLY_ERRORS.network_error, "network_error");
}

export async function testConnection(config: ProviderConfig, apiKey: string): Promise<string> {
  const result = await chatOnce(
    config,
    apiKey,
    [
      { role: "system", content: "你是一个连接测试助手。只回复两个字：已连。" },
      { role: "user", content: "测试连接。" },
    ],
    { temperature: 0, maxTokens: 16, retries: 0 },
  );
  return result.text.trim() || "已连";
}
