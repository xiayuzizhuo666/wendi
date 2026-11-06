import { stripTags } from "./extract.ts";

export type SourceKind = "encyclopedia" | "paper" | "official" | "repository" | "community" | "web" | "book";

export interface SearchSource {
  title: string;
  url: string;
  site: string;
  snippet: string;
  type: SourceKind;
  publishedAt?: string;
  credibility: "high" | "medium" | "low";
  score: number;
  query?: string;
  via?: string;
}

export interface SearchOptions {
  queries: string[];
  scene: "study" | "life";
  allowWeb?: boolean;
  subject?: { title?: string; author?: string };
  deepseekKey?: string;
  deepseekQuery?: string;
  search?: { provider: string; apiKey?: string };
}

const USER_AGENT = "WendiResearch/1.0 (research report client)";
const cache = new Map<string, { expires: number; value: unknown }>();

function cached<T>(key: string, ttlMs: number, run: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expires > now) return Promise.resolve(hit.value as T);
  return run().then((value) => {
    if (cache.size > 240) cache.clear();
    cache.set(key, { expires: now + ttlMs, value });
    return value;
  });
}

async function fetchText(url: string, init: RequestInit = {}, timeoutMs = 12_000): Promise<string> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "User-Agent": USER_AGENT,
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(timeoutMs),
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const length = Number(response.headers.get("content-length") || "0");
  if (length > 2_000_000) throw new Error("response_too_large");
  return await response.text();
}

async function fetchJson<T>(url: string, init: RequestInit = {}, timeoutMs = 12_000): Promise<T> {
  const text = await fetchText(url, init, timeoutMs);
  return JSON.parse(text) as T;
}

function trimSnippet(value: string, max = 420): string {
  return stripTags(value).replace(/\s+/g, " ").trim().slice(0, max);
}

function normalizeDate(value: unknown): string | undefined {
  if (!value) return undefined;
  const text = String(value);
  const match = text.match(/(\d{4})[-/.](\d{1,2})(?:[-/.](\d{1,2}))?/);
  if (!match) return undefined;
  return `${match[1]}-${match[2].padStart(2, "0")}-${(match[3] ?? "01").padStart(2, "0")}`;
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "web";
  }
}

function hasChinese(value: string): boolean {
  return /[\u4e00-\u9fff]/.test(value);
}

function hasLatin(value: string): boolean {
  return /[a-z]{3,}/i.test(value);
}

async function searchWikipedia(query: string, lang: "zh" | "en"): Promise<SearchSource[]> {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&utf8=1&srlimit=3&srprop=snippet|timestamp`;
  return cached(`wiki:${lang}:${query}`, 10 * 60_000, async () => {
    const data = await fetchJson<{
      query?: { search?: { title: string; snippet: string; timestamp?: string }[] };
    }>(url);
    return (data.query?.search ?? []).map((item, index) => ({
      title: item.title,
      url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(item.title.replaceAll(" ", "_"))}`,
      site: lang === "zh" ? "维基百科" : "Wikipedia",
      snippet: trimSnippet(item.snippet, 460),
      type: "encyclopedia" as const,
      publishedAt: normalizeDate(item.timestamp),
      credibility: "high" as const,
      score: 82 - index * 4 + (lang === "zh" ? 3 : 0),
    }));
  });
}

async function searchArxiv(query: string): Promise<SearchSource[]> {
  if (!hasLatin(query) && !/[\u4e00-\u9fff]/.test(query)) return [];
  const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=3&sortBy=relevance&sortOrder=descending`;
  return cached(`arxiv:${query}`, 12 * 60_000, async () => {
    const xml = await fetchText(url);
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((match) => match[1]);
    return entries.map((entry, index) => {
      const id = entry.match(/<id>([\s\S]*?)<\/id>/)?.[1]?.trim() ?? "";
      const title = trimSnippet(entry.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "arXiv paper", 260);
      const summary = trimSnippet(entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1] ?? "", 560);
      const published = entry.match(/<published>([\s\S]*?)<\/published>/)?.[1];
      return {
        title,
        url: id.replace("http://", "https://"),
        site: "arXiv",
        snippet: summary,
        type: "paper" as const,
        publishedAt: normalizeDate(published),
        credibility: "high" as const,
        score: 79 - index * 3,
      };
    });
  });
}

function openAlexAbstract(index: Record<string, number[]> | null | undefined): string {
  if (!index) return "";
  const words: { word: string; position: number }[] = [];
  for (const [word, positions] of Object.entries(index)) {
    for (const position of positions) words.push({ word, position });
  }
  words.sort((a, b) => a.position - b.position);
  return words.slice(0, 120).map((item) => item.word).join(" ");
}

async function searchOpenAlex(query: string): Promise<SearchSource[]> {
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=4&sort=relevance_score:desc`;
  return cached(`openalex:${query}`, 12 * 60_000, async () => {
    const data = await fetchJson<{
      results?: {
        title?: string;
        doi?: string;
        publication_year?: number;
        abstract_inverted_index?: Record<string, number[]>;
        primary_location?: { landing_page_url?: string };
        cited_by_count?: number;
      }[];
    }>(url);
    return (data.results ?? []).map((item, index) => {
      const link = item.primary_location?.landing_page_url || item.doi || "";
      return {
        title: item.title || "OpenAlex work",
        url: link,
        site: "OpenAlex",
        snippet: trimSnippet(openAlexAbstract(item.abstract_inverted_index), 520) || "OpenAlex 收录的学术作品。",
        type: "paper" as const,
        publishedAt: item.publication_year ? `${item.publication_year}-01-01` : undefined,
        credibility: "high" as const,
        score: 77 - index * 3 + Math.min(4, Math.floor((item.cited_by_count ?? 0) / 500)),
      };
    }).filter((item) => Boolean(item.url));
  });
}

async function searchCrossref(query: string): Promise<SearchSource[]> {
  const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=3&select=DOI,title,issued,URL,abstract,container-title`;
  return cached(`crossref:${query}`, 12 * 60_000, async () => {
    const data = await fetchJson<{
      message?: {
        items?: {
          title?: string[];
          DOI?: string;
          URL?: string;
          abstract?: string;
          issued?: { "date-parts"?: number[][] };
          "container-title"?: string[];
        }[];
      };
    }>(url);
    return (data.message?.items ?? []).map((item, index) => ({
      title: item.title?.[0] || "Crossref work",
      url: item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : ""),
      site: item["container-title"]?.[0] || "Crossref",
      snippet: trimSnippet(item.abstract ?? "", 480) || "Crossref 收录的学术作品。",
      type: "paper" as const,
      publishedAt: normalizeDate(item.issued?.["date-parts"]?.[0]?.join("-")),
      credibility: "high" as const,
      score: 74 - index * 2,
    })).filter((item) => Boolean(item.url));
  });
}

const BOOK_FOCUS_STOPWORDS = new Set(["the", "and", "for", "with", "from", "why", "what", "how", "book", "books", "author", "review", "criticism", "evidence", "limitations", "argument"]);

function latinFocusTokens(text: string): string[] {
  return [...new Set((text.match(/[A-Za-z][A-Za-z0-9'-]{2,}/g) ?? []).map((token) => token.toLowerCase()).filter((token) => !BOOK_FOCUS_STOPWORDS.has(token)))];
}

function matchesBookFocus(title: string, authors: string[], tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const haystack = `${title} ${authors.join(" ")}`.toLowerCase();
  return tokens.filter((token) => haystack.includes(token)).length >= Math.min(2, tokens.length);
}

function compactBookQuery(query: string): string {
  return query
    .replace(/\b(19|20)\d{2}\b/g, " ")
    .replace(/\b(book|argument|stepping|stones|novelty|search|criticism|review|evidence|limitations|comparison|reception|study|research|paper)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 10)
    .join(" ");
}

async function searchOpenLibrary(query: string, focus = query): Promise<SearchSource[]> {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10&fields=key,title,author_name,first_publish_year,subject,edition_count`;
  const focusTokens = latinFocusTokens(focus);
  return cached(`openlibrary:${query}:${focusTokens.join(",")}`, 12 * 60_000, async () => {
    const data = await fetchJson<{
      docs?: {
        key?: string;
        title?: string;
        author_name?: string[];
        first_publish_year?: number;
        subject?: string[];
        edition_count?: number;
      }[];
    }>(url);
    return (data.docs ?? [])
      .filter((item) => item.key && item.title && matchesBookFocus(item.title, item.author_name ?? [], focusTokens))
      .map((item, index) => {
        const detail = [item.author_name?.slice(0, 3).join("、"), item.first_publish_year ? `${item.first_publish_year} 年` : "", item.edition_count ? `${item.edition_count} 个版本` : ""]
          .filter(Boolean)
          .join(" · ");
        return {
          title: item.title!,
          url: `https://openlibrary.org${item.key}`,
          site: "Open Library",
          snippet: [detail, item.subject?.slice(0, 5).join("、")].filter(Boolean).join(" · "),
          type: "book" as const,
          publishedAt: item.first_publish_year ? `${item.first_publish_year}-01-01` : undefined,
          credibility: "medium" as const,
          score: 76 - index * 2,
        };
      });
  });
}

async function searchGoogleBooks(query: string): Promise<SearchSource[]> {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5&printType=books`;
  return cached(`googlebooks:${query}`, 12 * 60_000, async () => {
    const data = await fetchJson<{
      items?: {
        id?: string;
        volumeInfo?: {
          title?: string;
          subtitle?: string;
          authors?: string[];
          publishedDate?: string;
          description?: string;
          infoLink?: string;
          canonicalVolumeLink?: string;
        };
      }[];
    }>(url);
    return (data.items ?? [])
      .filter((item) => item.volumeInfo?.title)
      .map((item, index) => {
        const info = item.volumeInfo!;
        return {
          title: [info.title, info.subtitle].filter(Boolean).join("："),
          url: info.infoLink || info.canonicalVolumeLink || `https://books.google.com/books?id=${item.id}`,
          site: "Google Books",
          snippet: trimSnippet([info.authors?.slice(0, 3).join("、"), info.publishedDate, info.description].filter(Boolean).join(" · "), 480),
          type: "book" as const,
          publishedAt: normalizeDate(info.publishedDate),
          credibility: "medium" as const,
          score: 78 - index * 2,
        };
      })
      .filter((item) => Boolean(item.url));
  });
}

async function searchGitHub(query: string): Promise<SearchSource[]> {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=3`;
  return cached(`github:${query}`, 10 * 60_000, async () => {
    const data = await fetchJson<{
      items?: { full_name?: string; html_url?: string; description?: string; stargazers_count?: number; updated_at?: string }[];
    }>(url, { headers: { Accept: "application/vnd.github+json" } });
    return (data.items ?? []).map((item, index) => ({
      title: item.full_name || "GitHub repository",
      url: item.html_url || "",
      site: "GitHub",
      snippet: trimSnippet(item.description ?? "", 400),
      type: "repository" as const,
      publishedAt: normalizeDate(item.updated_at),
      credibility: "medium" as const,
      score: 66 - index * 2 + Math.min(6, Math.floor((item.stargazers_count ?? 0) / 5000)),
    })).filter((item) => Boolean(item.url));
  });
}

async function searchHN(query: string): Promise<SearchSource[]> {
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=3`;
  return cached(`hn:${query}`, 10 * 60_000, async () => {
    const data = await fetchJson<{
      hits?: { title?: string; url?: string; objectID?: string; points?: number; created_at?: string }[];
    }>(url);
    return (data.hits ?? []).map((item, index) => ({
      title: item.title || "Hacker News discussion",
      url: item.url || `https://news.ycombinator.com/item?id=${item.objectID}`,
      site: "Hacker News",
      snippet: `社区讨论 · ${item.points ?? 0} points`,
      type: "community" as const,
      publishedAt: normalizeDate(item.created_at),
      credibility: "medium" as const,
      score: 58 - index * 2 + Math.min(6, Math.floor((item.points ?? 0) / 80)),
    }));
  });
}

function decodeDuckUrl(href: string): string {
  const cleaned = stripTags(href);
  if (cleaned.startsWith("//duckduckgo.com/l/")) {
    try {
      const url = new URL(`https:${cleaned}`);
      return url.searchParams.get("uddg") ?? cleaned;
    } catch {
      return cleaned;
    }
  }
  if (cleaned.startsWith("/l/")) {
    try {
      return new URL(cleaned, "https://duckduckgo.com").searchParams.get("uddg") ?? cleaned;
    } catch {
      return cleaned;
    }
  }
  return cleaned;
}

async function searchDuckDuckGo(query: string): Promise<SearchSource[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  return cached(`ddg:${query}`, 10 * 60_000, async () => {
    const html = await fetchText(url, { headers: { Accept: "text/html" } }, 13_000);
    const blocks = [...html.matchAll(/<div[^>]+class="[^"]*result[^"]*"[\s\S]*?<\/div>\s*<\/div>/gi)].slice(0, 6);
    const results: SearchSource[] = [];
    for (const block of blocks) {
      const source = block[0];
      const link = source.match(/<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
      if (!link) continue;
      const href = decodeDuckUrl(link[1]);
      if (!href.startsWith("http")) continue;
      const title = trimSnippet(link[2], 240);
      const snippet = trimSnippet(source.match(/class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/i)?.[1] ?? "", 420);
      results.push({
        title,
        url: href,
        site: safeHost(href),
        snippet,
        type: "web",
        credibility: "medium",
        score: 60 - results.length * 2,
      });
    }
    return results;
  });
}

function decodeHexSite(value: string): string {
  const text = value.trim();
  if (text.length < 8 || text.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(text)) return text;
  try {
    const bytes = new Uint8Array(text.match(/.{2}/g)!.map((pair) => Number.parseInt(pair, 16)));
    const decoded = new TextDecoder().decode(bytes).trim();
    return /[\u4e00-\u9fffA-Za-z]/.test(decoded) ? decoded : text;
  } catch {
    return text;
  }
}

async function searchDeepSeek(query: string, apiKey: string): Promise<SearchSource[]> {
  if (/[\u4e00-\u9fff]/.test(query)) return [];
  const data = await fetchJson<{
    results?: {
      title?: string;
      url?: string;
      snippet?: string;
      summary?: string;
      site_name?: string;
      date?: string;
      authority?: number;
    }[];
    data?: {
      results?: {
        title?: string;
        url?: string;
        snippet?: string;
        summary?: string;
        site_name?: string;
        date?: string;
        authority?: number;
      }[];
    };
  }>(
    "https://api.deepseek.com/v1/tools/search",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        query: query.slice(0, 128),
        ori_question: query.slice(0, 128),
        count: 8,
        need_content: false,
        localization: "223.5.5.5",
      }),
    },
    20_000,
  );
  const items = data.results ?? data.data?.results ?? [];
  return items
    .filter((item) => item.url && item.title)
    .map((item, index) => {
      const authority = Number(item.authority ?? 0);
      return {
        title: item.title!,
        url: item.url!,
        site: decodeHexSite(item.site_name || "") || safeHost(item.url!),
        snippet: trimSnippet(item.summary || item.snippet || "", 480),
        type: "web" as const,
        publishedAt: normalizeDate(item.date),
        credibility: authority >= 80 ? "high" : authority >= 50 ? "medium" : "low",
        score: 78 + Math.min(8, Math.floor(authority / 15)) - index * 2,
        query,
        via: "deepseek",
      };
    });
}

async function searchBing(query: string): Promise<SearchSource[]> {
  const url = `https://cn.bing.com/search?q=${encodeURIComponent(query)}&setlang=zh-Hans&cc=cn`;
  return cached(`bing:${query}`, 10 * 60_000, async () => {
    const html = await fetchText(url, { headers: { Accept: "text/html" } }, 13_000);
    const blocks = [...html.matchAll(/<li[^>]+class="[^"]*b_algo[^"]*"[\s\S]*?<\/li>/gi)].slice(0, 6);
    const results: SearchSource[] = [];
    for (const block of blocks) {
      const source = block[0];
      const h2 = source.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
      const link = h2?.[1]?.match(/<a[^>]+href="([^"]+)"[^>]*>/i);
      if (!link) continue;
      const href = stripTags(link[1]);
      if (!href.startsWith("http")) continue;
      const title = trimSnippet(h2?.[1]?.replace(/<a[^>]*>/i, "").replace(/<\/a>/i, "") ?? "", 240);
      const snippet = trimSnippet(source.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? "", 460);
      results.push({
        title,
        url: href,
        site: safeHost(href),
        snippet,
        type: "web",
        credibility: "medium",
        score: 62 - results.length * 2,
      });
    }
    return results;
  });
}

async function searchBocha(query: string, apiKey: string): Promise<SearchSource[]> {
  const data = await fetchJson<{
    data?: { webPages?: { value?: { name?: string; url?: string; snippet?: string; datePublished?: string; siteName?: string }[] } };
    webPages?: { value?: { name?: string; url?: string; snippet?: string; datePublished?: string; siteName?: string }[] };
  }>("https://api.bochaai.com/v1/web-search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ query, summary: true, count: 5, freshness: "noLimit" }),
  });
  const items = data.data?.webPages?.value ?? data.webPages?.value ?? [];
  return items.map((item, index) => ({
    title: item.name || "网页结果",
    url: item.url || "",
    site: item.siteName || safeHost(item.url || ""),
    snippet: trimSnippet(item.snippet ?? "", 460),
    type: "web" as const,
    publishedAt: normalizeDate(item.datePublished),
    credibility: "medium" as const,
    score: 71 - index * 2,
  })).filter((item) => Boolean(item.url));
}

async function searchTavily(query: string, apiKey: string): Promise<SearchSource[]> {
  const data = await fetchJson<{
    results?: { title?: string; url?: string; content?: string; published_date?: string }[];
  }>("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey, query, max_results: 5, search_depth: "basic", include_answer: false }),
  });
  return (data.results ?? []).map((item, index) => ({
    title: item.title || "网页结果",
    url: item.url || "",
    site: safeHost(item.url || ""),
    snippet: trimSnippet(item.content ?? "", 460),
    type: "web" as const,
    publishedAt: normalizeDate(item.published_date),
    credibility: "medium" as const,
    score: 72 - index * 2,
  })).filter((item) => Boolean(item.url));
}

async function searchFirecrawl(query: string, apiKey: string): Promise<SearchSource[]> {
  const data = await fetchJson<{
    data?: { title?: string; url?: string; description?: string; markdown?: string }[];
  }>("https://api.firecrawl.dev/v1/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ query, limit: 5 }),
  });
  return (data.data ?? []).map((item, index) => ({
    title: item.title || "网页结果",
    url: item.url || "",
    site: safeHost(item.url || ""),
    snippet: trimSnippet(item.description || item.markdown || "", 460),
    type: "web" as const,
    credibility: "medium" as const,
    score: 73 - index * 2,
  })).filter((item) => Boolean(item.url));
}

async function searchSerper(query: string, apiKey: string): Promise<SearchSource[]> {
  const data = await fetchJson<{
    organic?: { title?: string; link?: string; snippet?: string; date?: string }[];
  }>("https://google.serper.dev/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-KEY": apiKey },
    body: JSON.stringify({ q: query, num: 5, hl: "zh-cn" }),
  });
  return (data.organic ?? []).map((item, index) => ({
    title: item.title || "网页结果",
    url: item.link || "",
    site: safeHost(item.link || ""),
    snippet: trimSnippet(item.snippet ?? "", 460),
    type: "web" as const,
    publishedAt: normalizeDate(item.date),
    credibility: "medium" as const,
    score: 72 - index * 2,
  })).filter((item) => Boolean(item.url));
}

async function userWebSearch(query: string, provider: string, apiKey?: string): Promise<SearchSource[]> {
  if (!apiKey || provider === "none") return [];
  if (provider === "bocha") return searchBocha(query, apiKey);
  if (provider === "tavily") return searchTavily(query, apiKey);
  if (provider === "firecrawl") return searchFirecrawl(query, apiKey);
  if (provider === "serper") return searchSerper(query, apiKey);
  return [];
}

function sourceWantsPapers(query: string, scene: "study" | "life"): boolean {
  if (scene === "study") return true;
  return /研究|论文|科学|医学|健康|营养|成分|致癌|安全|实验|机制|原理|statistics|study|research|paper/i.test(query);
}

function sourceWantsCode(query: string): boolean {
  return /AI|模型|协议|开源|代码|框架|agent|MCP|数据库|算法|API|SDK|LLM|RAG/i.test(query);
}

function sourceWantsBooks(query: string): boolean {
  return /书评|读书|作者|这本书|《|\bbook\b|\bauthor\b|\bmemoir\b|\bnovel\b/i.test(query) && !/facebook/i.test(query);
}

async function mapLimit<T, R>(items: T[], limit: number, run: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await run(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

function canonical(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    for (const key of [...parsed.searchParams.keys()]) {
      if (/^(utm_|ref|source|spm)/i.test(key)) parsed.searchParams.delete(key);
    }
    return parsed.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

export interface AggregateResult {
  sources: SearchSource[];
  warnings: string[];
}

export async function aggregateSearch(options: SearchOptions): Promise<AggregateResult> {
  const queries = options.queries
    .map((query) => query.replace(/\s+/g, " ").trim().slice(0, 160))
    .filter(Boolean)
    .slice(0, 5);
  if (queries.length === 0) return { sources: [], warnings: ["没有可用的检索问题。"] };

  const warnings: string[] = [];
  const deepseekQuery = options.deepseekQuery?.trim() || "";
  if (options.deepseekKey && (!deepseekQuery || /[\u4e00-\u9fff]/.test(deepseekQuery))) {
    warnings.push("DeepSeek 搜索需要英文检索式，已跳过并回退其他来源。");
  }
  const tasks: { query: string; label: string; run: () => Promise<SearchSource[]> }[] = [];
  const bookQuery = [options.subject?.title, options.subject?.author].filter(Boolean).join(" ").trim();

  if (options.deepseekKey && deepseekQuery && !/[\u4e00-\u9fff]/.test(deepseekQuery)) {
    tasks.push({ query: deepseekQuery, label: "DeepSeek 搜索", run: () => searchDeepSeek(deepseekQuery, options.deepseekKey!) });
  }

  for (const query of queries) {
    tasks.push({ query, label: "维基百科", run: () => searchWikipedia(query, "zh") });
    if (hasLatin(query) || /MCP|AI|LLM|RAG|API|SDK|GPU|agent/i.test(query)) {
      tasks.push({ query, label: "Wikipedia", run: () => searchWikipedia(query, "en") });
    }
    tasks.push({ query, label: "OpenAlex", run: () => searchOpenAlex(query) });
    if (sourceWantsPapers(query, options.scene)) {
      tasks.push({ query, label: "arXiv", run: () => searchArxiv(query) });
      tasks.push({ query, label: "Crossref", run: () => searchCrossref(query) });
    }
    if (sourceWantsCode(query)) {
      tasks.push({ query, label: "GitHub", run: () => searchGitHub(query) });
      tasks.push({ query, label: "Hacker News", run: () => searchHN(query) });
    }
    if (!bookQuery && sourceWantsBooks(query)) {
      tasks.push({ query, label: "Open Library", run: () => searchOpenLibrary(query) });
      tasks.push({ query, label: "Google Books", run: () => searchGoogleBooks(query) });
    }
    if (options.allowWeb !== false) {
      tasks.push({ query, label: "Bing", run: () => searchBing(query) });
      tasks.push({ query, label: "DuckDuckGo", run: () => searchDuckDuckGo(query) });
      if (options.search?.provider && options.search.provider !== "none" && options.search.apiKey) {
        tasks.push({ query, label: "搜索 API", run: () => userWebSearch(query, options.search!.provider, options.search!.apiKey) });
      }
    }
  }

  if (bookQuery) {
    const rawBookSearchQuery = queries.find((query) => hasLatin(query) && sourceWantsBooks(query)) ?? bookQuery;
    const bookSearchQuery = hasLatin(rawBookSearchQuery) ? compactBookQuery(rawBookSearchQuery) : rawBookSearchQuery;
    const focus = [bookQuery, ...queries].join(" ");
    tasks.push({ query: bookSearchQuery, label: "Open Library", run: () => searchOpenLibrary(bookSearchQuery, focus) });
    tasks.push({ query: bookSearchQuery, label: "Google Books", run: () => searchGoogleBooks(bookSearchQuery) });
  }

  const results = await mapLimit(tasks, 6, async (task) => {
    try {
      const value = await task.run();
      return { task, value, error: null as string | null };
    } catch (error) {
      return { task, value: [] as SearchSource[], error: error instanceof Error ? error.message : "unknown" };
    }
  });

  for (const result of results) {
    if (result.error) {
      const label = result.task.label;
      if (!warnings.includes(`${label} 本次没有返回可用结果`)) warnings.push(`${label} 本次没有返回可用结果`);
    }
  }

  const byUrl = new Map<string, SearchSource>();
  for (const result of results) {
    for (const source of result.value) {
      if (!source.title || !source.url || !/^https?:\/\//i.test(source.url)) continue;
      const key = canonical(source.url);
      const existing = byUrl.get(key);
      const withQuery: SearchSource = {
        ...source,
        title: stripTags(source.title).slice(0, 260),
        snippet: stripTags(source.snippet).slice(0, 480),
        query: result.task.query,
      };
      if (!existing || existing.score < withQuery.score) byUrl.set(key, withQuery);
    }
  }

  const sources = [...byUrl.values()].sort((a, b) => b.score - a.score).slice(0, 32);
  if (sources.length === 0) warnings.push("所有信息源都没有返回结果，请检查网络或换一个更具体的问法。");
  return { sources, warnings };
}
