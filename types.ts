export type Scene = "study" | "life";
export type Depth = "quick" | "deep" | "root";
export type NarrativeStyle = "explain" | "detective" | "light";

export interface ReadingConfig {
  style: NarrativeStyle;
  depth: Depth;
  focus?: string;
}

export type ObjectKind = "concept" | "product" | "company" | "person" | "event" | "phenomenon" | "book" | "work" | "other";

export type SectionRole = "hook" | "definition" | "origin" | "mechanism" | "landscape" | "intersection" | "debate" | "future" | "bottom" | "credibility" | "other";

export type SourceGrade = "L1" | "L2" | "L3" | "L4" | "L5" | "L6";
export type ClaimAxis = "vertical" | "horizontal" | "intersection" | "opposition" | "context";

export type ProviderId =
  | "deepseek"
  | "qwen"
  | "kimi"
  | "glm"
  | "doubao"
  | "siliconflow"
  | "minimax"
  | "custom"
  | "mock";

export type SearchProvider = "none" | "deepseek" | "bocha" | "tavily" | "firecrawl" | "serper";

export interface ProviderPreset {
  id: ProviderId;
  label: string;
  monogram: string;
  baseUrl: string;
  defaultModel: string;
  models: string[];
  note: string;
  authStyle?: "bearer" | "x-api-key";
  pricing?: { input: number; output: number };
}

export interface SearchConfig {
  provider: SearchProvider;
  apiKey: string;
}

export interface ProviderConfig {
  providerId: ProviderId;
  model: string;
  apiKey: string;
  baseUrl?: string;
  search: SearchConfig;
}

export type SourceType = "encyclopedia" | "paper" | "official" | "repository" | "community" | "web" | "book";

export interface Source {
  id: string;
  title: string;
  url: string;
  site: string;
  snippet: string;
  type: SourceType;
  publishedAt?: string;
  accessedAt: number;
  credibility: "high" | "medium" | "low";
  score: number;
  query?: string;
  verified?: boolean;
  httpStatus?: number;
  content?: string;
  grade?: SourceGrade;
  bias?: string;
  via?: string;
  relevance?: number;
}

export type ClaimKind = "fact" | "interpretation" | "prediction";
export type ClaimStance = "support" | "oppose" | "neutral";
export type Confidence = "high" | "medium" | "low";

export interface Claim {
  id: string;
  text: string;
  quote: string;
  sourceId: string;
  kind: ClaimKind;
  confidence: Confidence;
  stance: ClaimStance;
  topic: string;
  axis?: ClaimAxis;
}

export interface ConflictPosition {
  label: string;
  argument: string;
  evidenceIds: string[];
}

export interface Conflict {
  id: string;
  topic: string;
  positions: ConflictPosition[];
  whyItMatters: string;
  verdict: string;
  confidence: Confidence;
  evidenceIds: string[];
}

export interface DebateSide {
  label: string;
  thesis: string;
  points: { text: string; evidenceIds: string[] }[];
}

export interface Debate {
  id: string;
  question: string;
  pro: DebateSide;
  contra: DebateSide;
  verdict: string;
  confidence: Confidence;
  changeMyMind: string;
}

export interface FrameworkChoice {
  name: string;
  why: string;
  reveals: string;
}

export interface ResearchPlan {
  topic: string;
  oneLiner: string;
  type: string;
  objectKind?: ObjectKind;
  focus?: string;
  subject?: { title?: string; author?: string; year?: string };
  audience: string;
  questions: { id: string; question: string; why: string }[];
  queries: { query: string; intent: string; sources: string[] }[];
  searchQueryEn?: string;
  cautions: string[];
}

export interface BareThinking {
  text: string;
  assumptions: string[];
  analogies: string[];
}

export interface Synthesis {
  consensus: { topic: string; summary: string; evidenceIds: string[]; confidence: Confidence }[];
  conflicts: Omit<Conflict, "id">[];
  gaps: string[];
  sourceNotes: { sourceId: string; note: string; bias?: string }[];
  answerMap: { questionId: string; answer: string; confidence: Confidence; evidenceIds: string[] }[];
  synthesisNote: string;
}

export interface OutlineSection {
  id: string;
  title: string;
  kicker: string;
  purpose: string;
  role?: SectionRole;
  takeaway?: string;
  points: string[];
  evidenceIds: string[];
  figureId?: string;
}

export interface ReportOutline {
  title: string;
  subtitle: string;
  oneLiner: string;
  tldr: string[];
  keyQuestions: string[];
  tags: string[];
  sections: OutlineSection[];
  figureBriefs: {
    timeline?: { title: string; events: { date: string; title: string; detail: string; sourceId?: string }[] };
    conceptMap?: { title: string; center: string; nodes: { id?: string; label: string; relation: string; weight?: number }[] };
    matrix?: { title: string; columns: string[]; rows: { label: string; values: string[]; note?: string }[] };
  };
}

export type ReportBlock =
  | { type: "p"; text: string }
  | { type: "h3"; text: string }
  | { type: "callout"; tone: "insight" | "warning" | "note" | "question"; title?: string; text: string }
  | { type: "list"; ordered?: boolean; items: string[] }
  | { type: "quote"; text: string; attribution?: string; sourceId?: string }
  | { type: "table"; headers: string[]; rows: string[][]; caption?: string }
  | { type: "figure"; figureId: string }
  | { type: "keyline"; text: string }
  | { type: "steps"; items: { title: string; text: string }[] }
  | { type: "judgment"; label?: string; text: string; confidence: Confidence; changeMyMind?: string }
  | { type: "mythFact"; items: { myth: string; fact: string; note?: string }[] }
  | { type: "furtherReading"; items: { title: string; author?: string; why: string; url?: string }[] }
  | { type: "scenario"; items: { name: string; text: string; signal: string }[] };

export interface ReportSection {
  id: string;
  number: string;
  title: string;
  kicker: string;
  role?: SectionRole;
  takeaway?: string;
  blocks: ReportBlock[];
}

export type FigureType = "timeline" | "conceptMap" | "matrix" | "evidence" | "debate";

export interface ReportFigure {
  id: string;
  type: FigureType;
  title: string;
  caption: string;
  data: {
    events?: { date: string; title: string; detail: string; sourceId?: string }[];
    center?: string;
    nodes?: { id: string; label: string; relation: string; weight?: number }[];
    columns?: string[];
    rows?: { label: string; values: string[]; note?: string }[];
  };
}

export type QAStatus = "pass" | "warn" | "fail";

export interface QACheck {
  id: string;
  label: string;
  status: QAStatus;
  note: string;
}

export interface QAResult {
  score: number;
  verdict: string;
  checks: QACheck[];
  limitations: string[];
}

export type TrustLevel = "strong" | "fair" | "limited";

export interface TrustSignal {
  id: string;
  label: string;
  level: TrustLevel;
  note: string;
}

export interface Credibility {
  level: TrustLevel;
  summary: string;
  signals: TrustSignal[];
}

export interface ReportSubject {
  kind: ObjectKind;
  title: string;
  author?: string;
  year?: string;
  note?: string;
}

export interface ReportMeta {
  readingMinutes: number;
  wordCount: number;
  sourceCount: number;
  confidence: Confidence;
  completedAt: number;
  model: string;
  scene: Scene;
  depth: Depth;
}

export interface ReportDoc {
  id: string;
  topic: string;
  title: string;
  subtitle: string;
  oneLiner: string;
  tldr: string[];
  keyQuestions: string[];
  tags: string[];
  meta: ReportMeta;
  reading?: ReadingConfig;
  objectKind?: ObjectKind;
  subject?: ReportSubject;
  credibility?: Credibility;
  coverMotif: string;
  sections: ReportSection[];
  figures: ReportFigure[];
  sources: Source[];
  frameworks: FrameworkChoice[];
  bareThinking?: BareThinking;
  debates: Debate[];
  qa: QAResult;
  methodologyNote: string;
  limitations: string[];
  sample?: boolean;
}

export type StageId =
  | "intake"
  | "bare"
  | "search"
  | "evidence"
  | "verify"
  | "frameworks"
  | "debate"
  | "outline"
  | "write"
  | "qa"
  | "typeset";

export type StageStatus = "pending" | "active" | "done" | "skipped" | "error";

export interface StageState {
  id: StageId;
  status: StageStatus;
  detail: string;
  count?: number;
  startedAt?: number;
  endedAt?: number;
}

export type EventKind =
  | "stage"
  | "search"
  | "source"
  | "claim"
  | "conflict"
  | "debate"
  | "write"
  | "qa"
  | "system"
  | "done"
  | "error";

export interface ResearchEvent {
  id: string;
  at: number;
  kind: EventKind;
  title: string;
  detail?: string;
  tone?: "default" | "good" | "warn" | "bad";
}

export interface RunStats {
  inputTokens: number;
  outputTokens: number;
  calls: number;
  estimatedCost: number;
  startedAt: number;
  endedAt?: number;
}

export type RunStatus = "running" | "paused" | "complete" | "error" | "cancelled";

export interface ResearchRun {
  id: string;
  topic: string;
  scene: Scene;
  depth: Depth;
  reading?: ReadingConfig;
  objectKind?: ObjectKind;
  status: RunStatus;
  createdAt: number;
  updatedAt: number;
  stages: StageState[];
  events: ResearchEvent[];
  sources: Source[];
  claims: Claim[];
  conflicts: Conflict[];
  debates: Debate[];
  frameworks: FrameworkChoice[];
  bareThinking?: BareThinking;
  plan?: ResearchPlan;
  synthesis?: Synthesis;
  outline?: ReportOutline;
  sections?: ReportSection[];
  qa?: QAResult;
  credibility?: Credibility;
  reportId?: string;
  stats: RunStats;
  error?: string;
  providerLabel: string;
  model: string;
  resumeFrom?: StageId;
}

export interface AppSettings {
  provider: ProviderConfig;
  rememberKey: boolean;
}

export interface LLMUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMRequest {
  providerId: ProviderId;
  baseUrl?: string;
  authStyle?: "bearer" | "x-api-key";
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
}

export interface SearchRequest {
  queries: string[];
  scene: Scene;
  search: SearchConfig;
  allowWeb?: boolean;
}

export interface SearchResponse {
  sources: Omit<Source, "id" | "accessedAt">[];
  warnings: string[];
}
