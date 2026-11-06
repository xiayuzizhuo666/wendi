import type { ProviderConfig, ProviderId, ProviderPreset, SearchProvider } from "@/types";

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: "deepseek",
    label: "DeepSeek",
    monogram: "DS",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    models: ["deepseek-chat", "deepseek-reasoner", "deepseek-v4-pro"],
    note: "性价比高，中文长文稳定；推理模型更慢但更适合争议分析。",
    pricing: { input: 2, output: 8 },
  },
  {
    id: "qwen",
    label: "通义千问",
    monogram: "QW",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    defaultModel: "qwen-plus",
    models: ["qwen-plus", "qwen-max", "qwen-turbo", "qwen-long"],
    note: "阿里云百炼兼容模式；qwen-long 适合长资料，qwen-max 适合分析与写作。",
    pricing: { input: 0.8, output: 2 },
  },
  {
    id: "kimi",
    label: "Kimi",
    monogram: "KM",
    baseUrl: "https://api.moonshot.cn/v1",
    defaultModel: "moonshot-v1-128k",
    models: ["moonshot-v1-128k", "moonshot-v1-32k", "kimi-k2-0905-preview"],
    note: "长上下文见长；具体模型名以你账号的模型列表为准。",
    pricing: { input: 12, output: 12 },
  },
  {
    id: "glm",
    label: "智谱 GLM",
    monogram: "GL",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    defaultModel: "glm-4-plus",
    models: ["glm-4-plus", "glm-4-air", "glm-4-flash"],
    note: "中文表达自然；glm-4-flash 适合做检索摘要，plus 适合成稿。",
    pricing: { input: 5, output: 5 },
  },
  {
    id: "doubao",
    label: "豆包 / 方舟",
    monogram: "DB",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    defaultModel: "",
    models: [],
    note: "火山方舟使用「推理接入点 ID」作为模型名，请从控制台复制。",
    pricing: { input: 0.8, output: 2 },
  },
  {
    id: "siliconflow",
    label: "SiliconFlow",
    monogram: "SF",
    baseUrl: "https://api.siliconflow.cn/v1",
    defaultModel: "deepseek-ai/DeepSeek-V3",
    models: ["deepseek-ai/DeepSeek-V3", "Qwen/Qwen2.5-72B-Instruct", "meta-llama/Llama-3.3-70B-Instruct"],
    note: "聚合多家开源模型；模型名以控制台为准。",
    pricing: { input: 1, output: 4 },
  },
  {
    id: "minimax",
    label: "MiniMax",
    monogram: "MM",
    baseUrl: "https://api.minimax.chat/v1",
    defaultModel: "MiniMax-M2",
    models: ["MiniMax-M2", "abab6.5s-chat"],
    note: "长文本与角色化表达较强；模型名以控制台为准。",
    pricing: { input: 1, output: 8 },
  },
  {
    id: "mock",
    label: "开发模拟",
    monogram: "MK",
    baseUrl: "",
    defaultModel: "mock-1",
    models: ["mock-1"],
    note: "仅用于本地界面与流程测试，不调用真实模型，也不产生研究结论。",
    pricing: { input: 0, output: 0 },
  },
  {
    id: "custom",
    label: "自定义兼容端点",
    monogram: "API",
    baseUrl: "",
    defaultModel: "",
    models: [],
    note: "仅支持公网 HTTPS 的 OpenAI 兼容 /chat/completions 端点。",
  },
];

export const PROVIDER_ORDER: ProviderId[] = [
  "deepseek",
  "qwen",
  "kimi",
  "glm",
  "doubao",
  "siliconflow",
  "minimax",
  "custom",
];

export const SEARCH_PROVIDERS: { id: SearchProvider; label: string; note: string; placeholder: string }[] = [
  { id: "none", label: "不额外配置", note: "使用问底预置的免费信息源（维基、arXiv、OpenAlex、Crossref、GitHub、HN、网页检索）。", placeholder: "" },
  { id: "deepseek", label: "DeepSeek 搜索", note: "中文网页覆盖好；key 留空时自动复用 DeepSeek 模型 key。", placeholder: "DeepSeek API Key（可留空）" },
  { id: "bocha", label: "博查 Bocha", note: "中文网页搜索覆盖较好，适合政策、消费、社会话题。", placeholder: "博查 API Key" },
  { id: "tavily", label: "Tavily", note: "英文与通用网页检索，结果干净。", placeholder: "在此粘贴 Tavily Key" },
  { id: "firecrawl", label: "Firecrawl", note: "搜索 + 网页正文抓取，适合资料型研究。", placeholder: "在此粘贴 Firecrawl Key" },
  { id: "serper", label: "Serper", note: "Google 搜索结果，覆盖面广。", placeholder: "Serper API Key" },
];

export const DEFAULT_PROVIDER_CONFIG: ProviderConfig = {
  providerId: "deepseek",
  model: "deepseek-chat",
  apiKey: "",
  search: { provider: "none", apiKey: "" },
};

export function getProviderPreset(id: ProviderId): ProviderPreset {
  return PROVIDER_PRESETS.find((item) => item.id === id) ?? PROVIDER_PRESETS[0];
}

export function providerLabel(id: ProviderId): string {
  return getProviderPreset(id).label;
}

export function estimateCost(providerId: ProviderId, inputTokens: number, outputTokens: number): number {
  const pricing = getProviderPreset(providerId).pricing;
  if (!pricing) return 0;
  return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
}
