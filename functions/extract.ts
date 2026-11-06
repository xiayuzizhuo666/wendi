const BLOCKED_HOSTS = [
  "localhost",
  "metadata.google.internal",
  "metadata",
  "instance-data",
];

const PRIVATE_PATTERNS = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^fe80:/i,
  /^fc00:/i,
  /^fd00:/i,
];

export function assertPublicUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("invalid_url");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("unsupported_protocol");
  if (url.username || url.password) throw new Error("credentials_in_url");
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host || BLOCKED_HOSTS.includes(host) || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("blocked_host");
  }
  if (PRIVATE_PATTERNS.some((pattern) => pattern.test(host))) throw new Error("blocked_host");
  return url;
}

export async function fetchWithRedirects(
  rawUrl: string,
  init: RequestInit,
  maxRedirects = 3,
): Promise<{ response: Response; url: string }> {
  let current = assertPublicUrl(rawUrl);
  for (let index = 0; index <= maxRedirects; index += 1) {
    const response = await fetch(current.toString(), { ...init, redirect: "manual" });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return { response, url: current.toString() };
      const next = new URL(location, current);
      assertPublicUrl(next.toString());
      current = next;
      continue;
    }
    return { response, url: current.toString() };
  }
  throw new Error("too_many_redirects");
}

export async function readTextLimited(response: Response, maxBytes = 3_000_000): Promise<string> {
  const declared = Number(response.headers.get("content-length") || "0");
  if (declared > maxBytes * 1.5) throw new Error("response_too_large");
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        if (total > maxBytes) {
          chunks.push(value.slice(0, Math.max(0, maxBytes - (total - value.byteLength))));
          await reader.cancel();
          break;
        }
        chunks.push(value);
      }
    }
  } finally {
    reader.releaseLock();
  }
  const merged = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0));
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(merged);
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  ldquo: "“",
  rdquo: "”",
  middot: "·",
  times: "×",
  copy: "©",
  reg: "®",
};

export function decodeEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&#(\d+);/g, (_, dec: string) => {
      const code = Number.parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&([a-z][a-z0-9]+);/gi, (match, name: string) => ENTITIES[name.toLowerCase()] ?? match);
}

export function stripTags(input: string): string {
  return decodeEntities(input.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

export function normalizeText(input: string, maxChars = 30_000): string {
  const text = decodeEntities(
    input
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<iframe[\s\S]*?<\/iframe>/gi, " ")
      .replace(/<form[\s\S]*?<\/form>/gi, " ")
      .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
      .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
      .replace(/<header[\s\S]*?<\/header>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6]|tr|section|article|blockquote)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text.slice(0, maxChars);
}

export interface ExtractedPage {
  title: string;
  text: string;
  siteName: string;
  publishedAt?: string;
  description?: string;
  url: string;
}

export function extractPage(html: string, url: string): ExtractedPage {
  const titleMatch =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const siteMatch = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i);
  const dateMatch =
    html.match(/<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+name=["']date["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<time[^>]+datetime=["']([^"']+)["']/i);
  const descMatch =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);

  const mainMatch =
    html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
    html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
    html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

  const title = titleMatch ? stripTags(titleMatch[1]) : new URL(url).hostname;
  const text = normalizeText(mainMatch ? mainMatch[1] : html);
  const siteName = siteMatch ? stripTags(siteMatch[1]) : new URL(url).hostname.replace(/^www\./, "");

  return {
    title: title.slice(0, 300),
    text,
    siteName: siteName.slice(0, 120),
    publishedAt: dateMatch ? stripTags(dateMatch[1]).slice(0, 40) : undefined,
    description: descMatch ? stripTags(descMatch[1]).slice(0, 600) : undefined,
    url,
  };
}
