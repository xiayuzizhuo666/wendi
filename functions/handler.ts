import { assertPublicUrl, extractPage, fetchWithRedirects, readTextLimited } from "./extract.ts";
import { ProxyError, proxyChat, type ChatMessage } from "./providers.ts";
import { aggregateSearch } from "./sources.ts";

const MAX_LLM_BODY = 4_000_000;
const MAX_SEARCH_BODY = 80_000;
const MAX_FETCH_BODY = 12_000;
const MAX_CHECK_BODY = 40_000;

const FRIENDLY: Record<string, string> = {
  missing_key: "还没有配置模型 API key。",
  missing_model: "还没有填写模型名。",
  unsupported_provider: "这个模型提供方暂不支持，请换一个预置模型或使用受支持的自定义端点。",
  invalid_base_url: "自定义端点地址无效。",
  https_required: "自定义端点必须使用 HTTPS。",
  host_not_allowed: "这个自定义端点不在允许列表内。",
  unauthorized: "API key 无效或已过期。",
  forbidden: "这个 key 没有调用该模型的权限。",
  rate_limited: "模型服务请求过于频繁或额度不足。",
  invalid_request: "模型不接受这次请求参数，请检查模型名与配置。",
  upstream_error: "模型服务暂时不可用，请稍后再试。",
  empty_upstream_response: "模型返回了空内容，请重试。",
  invalid_upstream_response: "模型返回格式异常，请重试。",
  invalid_url: "网页地址无效。",
  unsupported_protocol: "只支持 http/https 网页。",
  credentials_in_url: "网页地址不能包含账号密码。",
  blocked_host: "出于安全原因，不能抓取这个地址。",
  response_too_large: "网页内容过大，已停止抓取。",
  too_many_redirects: "网页跳转次数过多。",
  fetch_failed: "网页抓取失败，可能是目标站点限制或网络问题。",
  timeout: "请求超时，请稍后重试。",
  invalid_json: "请求格式不正确。",
  body_too_large: "请求内容过大。",
  method_not_allowed: "请求方法不被允许。",
  demo_not_configured: "演示模式尚未配置，请联系站点维护者。",
  invalid_code: "邀请码不正确。",
  invalid_demo_token: "演示会话已失效，请重新输入邀请码。",
  demo_limit: "演示额度已用完，请稍后再试或联系站点维护者。",
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function errorResponse(code: string, status: number, extra?: Record<string, unknown>): Response {
  return json({ ok: false, error: code, message: FRIENDLY[code] ?? "请求失败。", ...(extra ?? {}) }, status);
}

async function readJson(request: Request, maxBytes: number): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (text.length > maxBytes) throw new ProxyError("body_too_large", 413);
  if (!text.trim()) throw new ProxyError("invalid_json", 400);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ProxyError("invalid_json", 400);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new ProxyError("invalid_json", 400);
  return parsed as Record<string, unknown>;
}

function asString(value: unknown, max = 500): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

const DEMO_TTL_MS = 20 * 60_000;
const DEMO_MAX_CALLS = 36;
const DEMO_ATTEMPT_LIMIT = 12;
const DEMO_ATTEMPT_WINDOW_MS = 10 * 60_000;
const DEMO_SESSION_LIMIT = 60;
const demoAttempts = new Map<string, { start: number; count: number }>();
const demoTokens = new Map<string, { calls: number; expiresAt: number }>();
let demoDay = "";
let demoSessionCount = 0;

function envValue(name: string): string {
  const deno = (globalThis as { Deno?: { env?: { get(key: string): string | undefined } } }).Deno;
  if (deno?.env?.get) return String(deno.env.get(name) ?? "").trim();
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return String(proc?.env?.[name] ?? "").trim();
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function signDemoPayload(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return base64Url(new Uint8Array(signature));
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}

function demoClientKey(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function allowDemoAttempt(request: Request): boolean {
  const key = demoClientKey(request);
  const now = Date.now();
  const bucket = demoAttempts.get(key);
  if (!bucket || now - bucket.start > DEMO_ATTEMPT_WINDOW_MS) {
    demoAttempts.set(key, { start: now, count: 1 });
    return true;
  }
  if (bucket.count >= DEMO_ATTEMPT_LIMIT) return false;
  bucket.count += 1;
  return true;
}

function allowDemoSession(): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (demoDay !== today) {
    demoDay = today;
    demoSessionCount = 0;
  }
  if (demoSessionCount >= DEMO_SESSION_LIMIT) return false;
  demoSessionCount += 1;
  return true;
}

async function createDemoToken(secret: string): Promise<{ token: string; expiresAt: number }> {
  const expiresAt = Date.now() + DEMO_TTL_MS;
  const payload = base64Url(
    new TextEncoder().encode(
      JSON.stringify({
        scope: "demo",
        exp: expiresAt,
        sid: crypto.randomUUID(),
      }),
    ),
  );
  const signature = await signDemoPayload(payload, secret);
  return { token: `${payload}.${signature}`, expiresAt };
}

async function verifyDemoToken(token: string, secret: string): Promise<{ expiresAt: number } | null> {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = await signDemoPayload(payload, secret);
  if (!constantTimeEqual(signature, expected)) return null;
  try {
    const parsed = JSON.parse(atob(payload.replaceAll("-", "+").replaceAll("_", "/"))) as {
      scope?: string;
      exp?: number;
    };
    if (parsed.scope !== "demo" || typeof parsed.exp !== "number" || parsed.exp <= Date.now()) return null;
    return { expiresAt: parsed.exp };
  } catch {
    return null;
  }
}

function useDemoToken(token: string, expiresAt: number): boolean {
  const now = Date.now();
  for (const [key, value] of demoTokens) {
    if (value.expiresAt <= now) demoTokens.delete(key);
  }
  const current = demoTokens.get(token);
  if (!current) {
    demoTokens.set(token, { calls: 1, expiresAt });
    return true;
  }
  if (current.calls >= DEMO_MAX_CALLS) return false;
  current.calls += 1;
  return true;
}

async function handleDemoSession(request: Request): Promise<Response> {
  const body = await readJson(request, 4_000);
  const code = asString(body.code, 80).trim();
  const expected = envValue("DEMO_ACCESS_CODE");
  if (!expected) throw new ProxyError("demo_not_configured", 503);
  if (!allowDemoAttempt(request)) throw new ProxyError("demo_limit", 429);
  if (!code || !constantTimeEqual(code, expected)) throw new ProxyError("invalid_code", 401);
  if (!allowDemoSession()) throw new ProxyError("demo_limit", 429);
  const demo = await createDemoToken(expected);
  return json({
    ok: true,
    token: demo.token,
    expiresAt: demo.expiresAt,
    model: "deepseek-flash",
    maxCalls: DEMO_MAX_CALLS,
  });
}

async function handleLLM(request: Request): Promise<Response> {
  const body = await readJson(request, MAX_LLM_BODY);
  let providerId = asString(body.providerId, 40);
  let apiKey = asString(body.apiKey, 500).trim();
  let model = asString(body.model, 160).trim();
  let baseUrl = asString(body.baseUrl, 400).trim();
  const jsonMode = asBoolean(body.json, false);
  const temperature = asNumber(body.temperature, 0.4);
  let maxTokens = Math.round(asNumber(body.maxTokens, 4096));
  const messagesRaw = Array.isArray(body.messages) ? body.messages : [];
  const demoToken = asString(body.demoToken, 2_000).trim();

  if (demoToken) {
    const accessCode = envValue("DEMO_ACCESS_CODE");
    const demoKey = envValue("DEEPSEEK_DEMO_KEY");
    if (!accessCode || !demoKey) throw new ProxyError("demo_not_configured", 503);
    const session = await verifyDemoToken(demoToken, accessCode);
    if (!session) throw new ProxyError("invalid_demo_token", 401);
    if (!useDemoToken(demoToken, session.expiresAt)) throw new ProxyError("demo_limit", 429);
    providerId = "deepseek";
    model = "deepseek-flash";
    baseUrl = "";
    apiKey = demoKey;
    maxTokens = Math.min(maxTokens, 8_192);
  }

  if (!apiKey) throw new ProxyError("missing_key", 400);
  if (!model) throw new ProxyError("missing_model", 400);
  if (!providerId) throw new ProxyError("unsupported_provider", 400);
  if (messagesRaw.length === 0 || messagesRaw.length > 24) throw new ProxyError("invalid_request", 400);

  const messages: ChatMessage[] = [];
  let totalChars = 0;
  for (const item of messagesRaw) {
    if (!item || typeof item !== "object") throw new ProxyError("invalid_request", 400);
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if (role !== "system" && role !== "user" && role !== "assistant") throw new ProxyError("invalid_request", 400);
    if (typeof content !== "string") throw new ProxyError("invalid_request", 400);
    totalChars += content.length;
    if (totalChars > 160_000) throw new ProxyError("body_too_large", 413);
    messages.push({ role, content });
  }

  const result = await proxyChat({
    providerId,
    baseUrl: baseUrl || undefined,
    apiKey,
    model,
    messages,
    temperature,
    maxTokens,
    json: jsonMode,
    signal: request.signal,
  });

  return json({ ok: true, text: result.text, usage: result.usage, model: result.model });
}

async function handleSearch(request: Request): Promise<Response> {
  const body = await readJson(request, MAX_SEARCH_BODY);
  const queriesRaw = Array.isArray(body.queries) ? body.queries : [];
  const queries = queriesRaw
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, 160))
    .filter(Boolean)
    .slice(0, 6);
  if (queries.length === 0) throw new ProxyError("invalid_request", 400);

  const scene = body.scene === "life" ? "life" : "study";
  const allowWeb = asBoolean(body.allowWeb, true);
  const searchRaw = body.search && typeof body.search === "object" ? (body.search as Record<string, unknown>) : {};
  const searchProvider = asString(searchRaw.provider, 30) || "none";
  const searchKey = asString(searchRaw.apiKey, 500);
  const demoToken = asString(body.demoToken, 2_000).trim();
  const requestedDeepseekQuery = asString(body.deepseekQuery, 180).trim();
  const deepseekQuery = requestedDeepseekQuery || queries.find((query) => /[A-Za-z]/.test(query)) || "";
  const subjectRaw = body.subject && typeof body.subject === "object" ? (body.subject as Record<string, unknown>) : {};
  const subjectTitle = asString(subjectRaw.title, 200);
  const subjectAuthor = asString(subjectRaw.author, 120);

  let deepseekKey = searchProvider === "deepseek" ? searchKey.trim() : "";
  if (demoToken) {
    const accessCode = envValue("DEMO_ACCESS_CODE");
    const demoKey = envValue("DEEPSEEK_DEMO_KEY");
    if (!accessCode || !demoKey) throw new ProxyError("demo_not_configured", 503);
    const session = await verifyDemoToken(demoToken, accessCode);
    if (!session) throw new ProxyError("invalid_demo_token", 401);
    if (!useDemoToken(demoToken, session.expiresAt)) throw new ProxyError("demo_limit", 429);
    deepseekKey = demoKey;
  }

  const result = await aggregateSearch({
    queries,
    scene,
    allowWeb,
    subject: subjectTitle ? { title: subjectTitle, author: subjectAuthor || undefined } : undefined,
    deepseekKey: deepseekKey || undefined,
    deepseekQuery: deepseekQuery || undefined,
    search: { provider: searchProvider, apiKey: searchKey || undefined },
  });

  return json({ ok: true, sources: result.sources, warnings: result.warnings });
}

async function handleFetch(request: Request): Promise<Response> {
  const body = await readJson(request, MAX_FETCH_BODY);
  const rawUrl = asString(body.url, 2_000);
  try {
    assertPublicUrl(rawUrl);
  } catch (error) {
    const code = error instanceof Error && FRIENDLY[error.message] ? error.message : "invalid_url";
    throw new ProxyError(code, 400);
  }
  const maxChars = Math.min(50_000, Math.max(2_000, Math.round(asNumber(body.maxChars, 24_000))));

  let response: Response;
  let finalUrl = rawUrl;
  try {
    const result = await fetchWithRedirects(rawUrl, {
      method: "GET",
      headers: {
        "User-Agent": "WendiResearch/1.0 (research report client)",
        Accept: "text/html,application/xhtml+xml,text/plain,application/json,application/xml;q=0.9,*/*;q=0.6",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      },
    });
    response = result.response;
    finalUrl = result.url;
  } catch (error) {
    if (error instanceof Error && FRIENDLY[error.message]) throw new ProxyError(error.message, 502);
    throw new ProxyError("fetch_failed", 502);
  }

  if (!response.ok) throw new ProxyError("fetch_failed", 502);

  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  if (contentType.includes("application/pdf") || contentType.startsWith("image/") || contentType.startsWith("video/") || contentType.startsWith("audio/")) {
    throw new ProxyError("fetch_failed", 415);
  }

  let text: string;
  try {
    text = await readTextLimited(response, 2_500_000);
  } catch (error) {
    if (error instanceof Error && FRIENDLY[error.message]) throw new ProxyError(error.message, 413);
    throw new ProxyError("response_too_large", 413);
  }

  if (contentType.includes("application/json") || contentType.includes("application/xml") || contentType.includes("text/plain")) {
    return json({
      ok: true,
      title: finalUrl,
      text: text.slice(0, maxChars),
      siteName: new URL(finalUrl).hostname.replace(/^www\./, ""),
      url: finalUrl,
    });
  }

  const page = extractPage(text, finalUrl);
  return json({
    ok: true,
    title: page.title,
    text: page.text.slice(0, maxChars),
    siteName: page.siteName,
    publishedAt: page.publishedAt,
    description: page.description,
    url: finalUrl,
  });
}

async function handleCheck(request: Request): Promise<Response> {
  const body = await readJson(request, MAX_CHECK_BODY);
  const urlsRaw = Array.isArray(body.urls) ? body.urls : [];
  const urls = urlsRaw
    .filter((item): item is string => typeof item === "string")
    .slice(0, 10);

  const results = await Promise.all(
    urls.map(async (rawUrl) => {
      try {
        const parsed = assertPublicUrl(rawUrl);
        const result = await fetchWithRedirects(parsed.toString(), {
          method: "HEAD",
          headers: { "User-Agent": "WendiResearch/1.0 (link check)" },
        }, 2);
        const ok = result.response.status >= 200 && result.response.status < 400;
        return { url: rawUrl, status: result.response.status, ok };
      } catch {
        return { url: rawUrl, status: 0, ok: false };
      }
    }),
  );

  return json({ ok: true, results });
}

export async function handler(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "");
    if (request.method === "GET" && path.endsWith("/health")) {
      return json({ ok: true, service: "wendi", time: new Date().toISOString() });
    }
    if (request.method !== "POST") return errorResponse("method_not_allowed", 405);

    if (path.endsWith("/demo/session")) return await handleDemoSession(request);
    if (path.endsWith("/llm")) return await handleLLM(request);
    if (path.endsWith("/search")) return await handleSearch(request);
    if (path.endsWith("/fetch")) return await handleFetch(request);
    if (path.endsWith("/check")) return await handleCheck(request);
    return json({ ok: false, error: "not_found", message: "接口不存在。" }, 404);
  } catch (error) {
    if (error instanceof ProxyError) {
      return errorResponse(error.code || "upstream_error", error.status || 502);
    }
    if (error instanceof DOMException && error.name === "TimeoutError") {
      return errorResponse("timeout", 504);
    }
    // Do not log request bodies, headers or credentials.
    console.error("wendi_function_error", error instanceof Error ? error.name : "unknown");
    return errorResponse("upstream_error", 502);
  }
}
