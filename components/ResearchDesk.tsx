import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  Database,
  FileText,
  Info,
  Loader2,
  Pause,
  PenLine,
  Play,
  Quote,
  RotateCcw,
  Scale,
  Search,
  Settings2,
  ShieldCheck,
  SquareStack,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { ClaimStance, ResearchEvent, ResearchRun, StageId } from "@/types";
import { DEPTHS, resolveReading, STYLES } from "@/data/reading";
import { deriveCredibility, trustLevelLabel } from "@/lib/credibility";
import { sourceGradeLabel } from "@/lib/source-grade";
import { formatClock, formatDuration, formatNumber } from "@/lib/format";

interface ResearchDeskProps {
  run: ResearchRun;
  onBack: () => void;
  onPause: () => void;
  onResume: () => void;
  onOpenReport: (reportId: string) => void;
  onOpenSettings: () => void;
}

const STAGES: { id: StageId; label: string; short: string }[] = [
  { id: "intake", label: "拆题", short: "拆题" },
  { id: "bare", label: "先看一眼", short: "先看" },
  { id: "search", label: "找资料", short: "找料" },
  { id: "evidence", label: "找证据", short: "取证" },
  { id: "verify", label: "对证据", short: "核对" },
  { id: "frameworks", label: "选透镜", short: "透镜" },
  { id: "debate", label: "反方上桌", short: "反方" },
  { id: "outline", label: "搭结构", short: "结构" },
  { id: "write", label: "写成读物", short: "写作" },
  { id: "qa", label: "可信度检查", short: "检查" },
  { id: "typeset", label: "排版", short: "排版" },
];

const TYPE_LABELS: Record<string, string> = {
  encyclopedia: "百科",
  paper: "论文",
  official: "官方",
  repository: "仓库",
  community: "社区",
  web: "网页",
  book: "书籍",
};

const STANCE_LABELS: Record<ClaimStance, string> = { support: "支持", oppose: "质疑", neutral: "中性" };
const CONFIDENCE_LABELS = { high: "高", medium: "中", low: "低" } as const;

function stageState(run: ResearchRun, id: StageId) {
  return run.stages.find((stage) => stage.id === id) ?? { id, status: "pending", detail: "", count: undefined };
}

function currentStage(run: ResearchRun) {
  return run.stages.find((stage) => stage.status === "active") ?? run.stages.find((stage) => stage.status === "error");
}

function completedStages(run: ResearchRun): number {
  return run.stages.filter((stage) => stage.status === "done" || stage.status === "skipped").length;
}

function eventIcon(kind: ResearchEvent["kind"]) {
  if (kind === "search") return Search;
  if (kind === "claim") return FileText;
  if (kind === "conflict") return Scale;
  if (kind === "debate") return Quote;
  if (kind === "write") return PenLine;
  if (kind === "qa") return ShieldCheck;
  if (kind === "error") return AlertTriangle;
  if (kind === "done") return Check;
  if (kind === "stage") return Check;
  if (kind === "source") return Database;
  return Info;
}

function toneClass(tone: ResearchEvent["tone"]): string {
  if (tone === "good") return "text-jade";
  if (tone === "warn") return "text-gold";
  if (tone === "bad") return "text-vermilion";
  return "text-ink-muted";
}

export function ResearchDesk({ run, onBack, onPause, onResume, onOpenReport, onOpenSettings }: ResearchDeskProps) {
  const [now, setNow] = useState(Date.now());
  const [panel, setPanel] = useState<"sources" | "claims" | "conflicts">("sources");
  const [pausing, setPausing] = useState(false);
  const [notifyState, setNotifyState] = useState<NotificationPermission | "unsupported">(() =>
    typeof Notification !== "undefined" ? Notification.permission : "unsupported",
  );
  const reading = resolveReading(run.reading, run.depth);
  const credibility = run.credibility ?? deriveCredibility({
    sources: run.sources,
    claims: run.claims,
    conflicts: run.conflicts,
    debates: run.debates,
    gaps: run.synthesis?.gaps ?? [],
    limitations: run.qa?.limitations ?? [],
    qa: run.qa ?? { score: 0, verdict: "", checks: [], limitations: [] },
    completedAt: run.updatedAt,
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (run.status !== "running") setPausing(false);
  }, [run.status]);

  const completed = completedStages(run);
  const progress = Math.round((completed / STAGES.length) * 100);
  const active = currentStage(run);
  const elapsed = (run.stats.endedAt ?? now) - (run.stats.startedAt || run.createdAt);
  const sourceTypes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const source of run.sources) counts.set(source.type, (counts.get(source.type) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [run.sources]);
  const latestEvents = run.events.slice(-36).reverse();
  const outline = run.outline;
  const writtenIds = new Set((run.sections ?? []).map((section) => section.id));

  const requestNotify = async () => {
    if (typeof Notification === "undefined") return;
    try {
      const permission = await Notification.requestPermission();
      setNotifyState(permission);
      if (permission === "granted") toast.success("已开启：报告完成后会发送浏览器通知");
      if (permission === "denied") toast.warning("浏览器已阻止通知，可以在地址栏的站点设置里重新开启");
    } catch {
      toast.error("无法请求通知权限");
    }
  };

  const pause = () => {
    setPausing(true);
    onPause();
  };

  return (
    <div className="min-h-dvh bg-paper">
      <header className="no-print sticky top-0 z-40 border-b border-rule bg-paper/92 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1500px] items-center justify-between gap-3 px-4 md:h-16 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex size-8 shrink-0 items-center justify-center border border-rule text-ink-muted transition-colors hover:border-ink hover:text-ink"
              aria-label="返回首页"
            >
              <ArrowLeft size={15} />
            </button>
            <div className="min-w-0">
              <p className="truncate font-serif-cn text-[14px] text-ink md:text-[15px]">{run.topic}</p>
              <p className="mt-0.5 text-[11px] text-ink-muted">
                {run.status === "running" ? "问底进行中" : run.status === "paused" ? "已暂停" : run.status === "error" ? "已中断" : "已完成"}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-3 border-r border-rule pr-4 text-[11px] text-ink-muted sm:flex">
              <span>用时 {formatDuration(elapsed)}</span>
              <span className="hidden md:inline">{formatNumber(run.stats.inputTokens + run.stats.outputTokens)} tokens</span>
              <span className="hidden md:inline">{run.stats.estimatedCost > 0.001 ? `¥${run.stats.estimatedCost.toFixed(2)}` : "按模型计费"}</span>
            </div>

            {notifyState === "default" ? (
              <button
                type="button"
                onClick={requestNotify}
                className="hidden items-center gap-1.5 rounded-full border border-rule px-3 py-1.5 text-[11px] text-ink-muted transition-colors hover:border-ink hover:text-ink md:flex"
              >
                <Bell size={11} /> 完成后通知我
              </button>
            ) : notifyState === "granted" ? (
              <span className="hidden items-center gap-1 text-[11px] text-ink-muted md:flex">
                <Check size={11} /> 通知已开
              </span>
            ) : null}

            <button
              type="button"
              onClick={onOpenSettings}
              className="flex size-8 items-center justify-center border border-rule text-ink-muted transition-colors hover:border-ink hover:text-ink"
              aria-label="模型设置"
            >
              <Settings2 size={14} />
            </button>

            {run.status === "running" ? (
              <button
                type="button"
                onClick={pause}
                disabled={pausing}
                className="inline-flex h-8 items-center gap-1.5 border border-ink/25 px-3 text-[10.5px] text-ink transition-colors hover:border-vermilion hover:text-vermilion disabled:opacity-50"
              >
                {pausing ? <Loader2 size={12} className="animate-spin" /> : <Pause size={12} />}
                {pausing ? "暂停中" : "暂停"}
              </button>
            ) : run.status === "paused" || run.status === "error" ? (
              <button
                type="button"
                onClick={onResume}
                className="inline-flex h-8 items-center gap-1.5 bg-ink px-3 text-[10.5px] text-paper-raised transition-colors hover:bg-vermilion-deep"
              >
                <Play size={12} /> 继续
              </button>
            ) : run.reportId ? (
              <button
                type="button"
                onClick={() => onOpenReport(run.reportId!)}
                className="inline-flex h-8 items-center gap-1.5 bg-ink px-3 text-[10.5px] text-paper-raised transition-colors hover:bg-vermilion-deep"
              >
                打开报告 <ArrowUpRight size={12} />
              </button>
            ) : null}
          </div>
        </div>
        <div className="h-px w-full bg-rule">
          <div className="h-px bg-vermilion transition-[width] duration-500" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 pb-16 pt-5 md:px-8 md:pt-8">
        <div className="lg:hidden">
          <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            {STAGES.map((stage, index) => {
              const state = stageState(run, stage.id);
              const isActive = state.status === "active";
              const isDone = state.status === "done" || state.status === "skipped";
              return (
                <div
                  key={stage.id}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] ${
                    isActive
                      ? "border-vermilion bg-vermilion-wash/50 text-vermilion-deep"
                      : isDone
                        ? "border-ink/20 bg-paper-raised text-ink"
                        : "border-rule text-ink-muted"
                  }`}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <span>{stage.short}</span>
                  {isActive ? <span className="size-1.5 animate-pulse rounded-full bg-vermilion" /> : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid gap-5 lg:grid-cols-[212px_minmax(0,1fr)_365px] lg:items-start lg:gap-7">
          <aside className="hidden lg:sticky lg:top-24 lg:block">
            <div className="flex items-baseline justify-between border-b border-rule pb-2">
              <p className="text-[12px] text-ink">进度</p>
              <span className="text-[11px] text-ink-muted">{completed}/{STAGES.length}</span>
            </div>
            <div className="relative mt-3">
              <div className="absolute bottom-3 left-[7px] top-3 w-px bg-rule" />
              {STAGES.map((stage, index) => {
                const state = stageState(run, stage.id);
                const isActive = state.status === "active";
                const isDone = state.status === "done" || state.status === "skipped";
                const isError = state.status === "error";
                return (
                  <div key={stage.id} className="relative flex gap-3 py-2.5 pl-0">
                    <span
                      className={`relative z-10 mt-1 flex size-[15px] shrink-0 items-center justify-center rounded-full border ${
                        isError
                          ? "border-vermilion bg-vermilion text-paper-raised"
                          : isActive
                            ? "border-vermilion bg-paper"
                            : isDone
                              ? "border-ink bg-ink text-paper-raised"
                              : "border-rule-strong bg-paper"
                      }`}
                    >
                      {isError ? <X size={9} /> : isDone ? <Check size={9} /> : isActive ? <span className="size-1.5 animate-pulse rounded-full bg-vermilion" /> : null}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className={`font-mono text-[8px] ${isActive || isError ? "text-vermilion" : "text-ink-muted"}`}>{String(index + 1).padStart(2, "0")}</span>
                        <span className={`font-sans text-[11.5px] ${isActive ? "font-semibold text-ink" : isDone ? "text-ink" : "text-ink-muted"}`}>{stage.label}</span>
                      </div>
                      {state.detail && (isActive || isError || isDone) ? (
                        <p className={`mt-0.5 line-clamp-2 text-[9.5px] leading-relaxed ${isError ? "text-vermilion" : "text-ink-muted"}`}>{state.detail}</p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 border-t border-rule pt-3">
              <p className="text-[12px] text-ink">概况</p>
              <div className="mt-2 space-y-2 text-[11px]">
                <div className="flex justify-between gap-2">
                  <span className="text-ink-muted">来源</span>
                  <span className="text-ink">{run.sources.length}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-ink-muted">证据</span>
                  <span className="text-ink">{run.claims.length}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-ink-muted">分歧</span>
                  <span className="text-ink">{run.conflicts.length}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-ink-muted">已写</span>
                  <span className="text-ink">
                    {(run.sections ?? []).length}/{outline?.sections.length ?? "—"}
                  </span>
                </div>
              </div>
            </div>
          </aside>

          <main className="min-w-0">
            <section className="border-y border-rule py-6">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-ink-muted">
                  <span>
                    {run.scene === "life" ? "生活" : "学习"} · {STYLES[reading.style].label} · {DEPTHS[reading.depth].label}
                  </span>
                  <span>{run.status === "running" ? "问底进行中" : run.status === "paused" ? "已暂停" : run.status === "error" ? "需要处理" : "已完成"}</span>
                </div>

                <h1 className="mt-5 max-w-[720px] font-serif-cn text-[30px] leading-[1.15] tracking-[-0.04em] text-ink md:text-[42px]">{run.topic}</h1>
                <p className="mt-3 max-w-[620px] font-serif-cn text-[13px] leading-[1.85] text-ink-muted md:text-[14.5px]">
                  {run.plan?.oneLiner ?? "正在判断这是哪类问题，并设计这次研究要回答的核心问题。"}
                </p>

                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-muted">
                  <span>{run.providerLabel} · {run.model || "模型待定"}</span>
                  {run.plan?.type ? <span>{run.plan.type}</span> : null}
                  <span>{run.sources.length} 个来源</span>
                  <span>{run.claims.length} 条证据</span>
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between border-t border-ink/20 pt-3">
                    <div className="flex items-center gap-2">
                      {run.status === "running" ? <span className="size-2 animate-pulse rounded-full bg-vermilion" /> : null}
                      <span className="font-sans text-[12px] font-medium text-ink">
                        {active ? STAGES.find((stage) => stage.id === active.id)?.label : run.status === "complete" ? "问底完成" : "等待开始"}
                      </span>
                      <span className="font-mono text-[9px] text-ink-muted">{active?.detail || (run.status === "paused" ? "研究已暂停，回来后可以从断点继续" : "")}</span>
                    </div>
                    <span className="font-mono text-[9px] text-ink-muted">{progress}%</span>
                  </div>
                  <div className="mt-2 h-1 w-full bg-rule">
                    <div className="h-1 bg-vermilion transition-[width] duration-500" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>
            </section>

            {run.status === "error" ? (
              <section className="mt-4 border border-vermilion/40 bg-vermilion-wash/40 p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0 text-vermilion" />
                  <div>
                    <p className="font-sans text-[13px] font-semibold text-vermilion-deep">问底中断</p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">{run.error || "未知错误。"}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={onResume} className="inline-flex h-8 items-center gap-1.5 bg-ink px-3 text-[10.5px] text-paper-raised hover:bg-vermilion-deep">
                        <RotateCcw size={12} /> 从断点重试
                      </button>
                      <button type="button" onClick={onOpenSettings} className="inline-flex h-8 items-center gap-1.5 border border-ink/25 px-3 text-[10.5px] text-ink hover:border-ink">
                        <Settings2 size={12} /> 检查模型设置
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {run.status === "paused" ? (
              <section className="mt-4 border border-gold/40 bg-gold-wash/40 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-sans text-[13px] font-semibold text-ink">问底已暂停</p>
                    <p className="mt-1 text-[11px] text-ink-muted">已保留当前阶段的产出。继续时会从断点开始，不会重复消耗已完成的调用。</p>
                  </div>
                  <button type="button" onClick={onResume} className="inline-flex h-9 items-center gap-1.5 bg-ink px-4 text-[11px] text-paper-raised hover:bg-vermilion-deep">
                    <Play size={12} /> 继续问底
                  </button>
                </div>
              </section>
            ) : null}

            {outline ? (
              <section className="mt-4 border border-rule bg-paper-raised p-4 md:p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SquareStack size={14} className="text-vermilion" />
                    <p className="font-sans text-[12.5px] font-semibold text-ink">成稿进度</p>
                  </div>
                  <span className="text-[11px] text-ink-muted">
                    {(run.sections ?? []).length}/{outline.sections.length} 节
                  </span>
                </div>
                <div className="mt-3 grid gap-px border border-rule bg-rule sm:grid-cols-2">
                  {outline.sections.map((section) => {
                    const written = writtenIds.has(section.id ?? "");
                    const isWriting = run.stages.find((stage) => stage.id === "write")?.status === "active" && !written && (run.sections ?? []).length === outline.sections.findIndex((item) => item.id === section.id);
                    return (
                      <div key={section.id ?? section.title} className="flex items-start gap-2 bg-paper px-3 py-2.5">
                        <span className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full text-[8px] ${written ? "bg-ink text-paper-raised" : isWriting ? "bg-vermilion text-paper-raised" : "border border-rule text-ink-muted"}`}>
                          {written ? <Check size={9} /> : isWriting ? <Loader2 size={9} className="animate-spin" /> : null}
                        </span>
                        <div className="min-w-0">
                          <p className={`truncate text-[11px] ${written ? "text-ink" : "text-ink-muted"}`}>{section.title}</p>
                          <p className="mt-0.5 text-[10px] text-ink-muted">{section.kicker}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            <section className="mt-4 border border-rule bg-paper-raised">
              <div className="flex items-center justify-between border-b border-rule px-4 py-3">
                <div className="flex items-center gap-2">
                  <PenLine size={14} className="text-vermilion" />
                  <p className="font-sans text-[12.5px] font-semibold text-ink">问底日志</p>
                </div>
                <span className="text-[11px] text-ink-muted">{run.events.length} 条记录</span>
              </div>
              <div className="max-h-[520px] overflow-y-auto px-4 py-2">
                {latestEvents.length === 0 ? (
                  <div className="flex items-center gap-2 py-8 text-[11px] text-ink-muted">
                    <Loader2 size={13} className="animate-spin" /> 问底刚启动，正在准备第一轮问题…
                  </div>
                ) : (
                  latestEvents.map((event) => {
                    const Icon = eventIcon(event.kind);
                    return (
                      <div key={event.id} className="grid grid-cols-[54px_20px_1fr] gap-2 border-b border-rule py-2.5 last:border-b-0">
                        <span className="font-mono text-[8px] leading-5 text-ink-muted">{formatClock(event.at)}</span>
                        <span className={`mt-1 flex size-4 items-center justify-center rounded-full border border-rule bg-paper ${toneClass(event.tone)}`}>
                          <Icon size={9} />
                        </span>
                        <div className="min-w-0">
                          <p className={`text-[11px] leading-5 ${event.tone === "bad" ? "text-vermilion" : event.tone === "warn" ? "text-gold" : "text-ink"}`}>{event.title}</p>
                          {event.detail ? <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-ink-muted">{event.detail}</p> : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {run.qa ? (
              <section className="mt-4 border border-rule bg-paper-raised p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={15} className="text-jade" />
                    <p className="font-sans text-[12.5px] font-semibold text-ink">可信度 · {trustLevelLabel(credibility.level)}</p>
                  </div>
                  <span className="text-[11px] text-ink-muted">5 个信号</span>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">{credibility.summary}</p>
                <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
                  {credibility.signals.map((signal) => (
                    <div key={signal.id} className="flex items-baseline justify-between gap-2 border-t border-rule pt-1.5">
                      <span className="text-[10px] text-ink-muted">{signal.label}</span>
                      <span className="font-mono text-[9px] text-ink">{trustLevelLabel(signal.level)}</span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </main>

          <aside className="min-w-0 lg:sticky lg:top-24">
            <div className="border border-rule bg-paper-raised">
              <div className="grid grid-cols-3 border-b border-rule">
                {(
                  [
                    ["sources", "来源", run.sources.length],
                    ["claims", "证据", run.claims.length],
                    ["conflicts", "分歧", run.conflicts.length],
                  ] as const
                ).map(([id, label, count]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPanel(id)}
                    className={`flex items-center justify-center gap-1.5 border-r border-rule py-2.5 last:border-r-0 text-[11px] transition-colors ${
                      panel === id ? "bg-ink text-paper-raised" : "text-ink-muted hover:bg-paper-deep hover:text-ink"
                    }`}
                  >
                    {label} <span className={panel === id ? "text-paper/60" : "text-ink-muted"}>{count}</span>
                  </button>
                ))}
              </div>

              <div className="max-h-[calc(100dvh-250px)] overflow-y-auto px-4 py-3">
                {panel === "sources" ? (
                  run.sources.length === 0 ? (
                    <EmptyPanel icon={Search} text="检索结果会出现在这里。" sub="问底正在查询预置信息源与网页。" />
                  ) : (
                    <div>
                      <div className="mb-2 flex flex-wrap gap-1">
                        {sourceTypes.map(([type, count]) => (
                          <span key={type} className="rounded-full border border-rule px-2 py-0.5 text-[10px] text-ink-muted">
                            {TYPE_LABELS[type] ?? type} {count}
                          </span>
                        ))}
                      </div>
                      {run.sources.map((source, index) => (
                        <div key={source.id} className="border-b border-rule py-3 last:border-b-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-[8px] text-vermilion">{String(index + 1).padStart(2, "0")}</span>
                            <span className="stamp text-ink-muted">{TYPE_LABELS[source.type] ?? source.type}</span>
                            {source.verified ? (
                              <span className="inline-flex items-center gap-0.5 font-mono text-[7.5px] text-jade">
                                <ShieldCheck size={9} /> 已读
                              </span>
                            ) : null}
                            <span className="ml-auto font-mono text-[7.5px] text-ink-muted">{Math.round(source.score)}</span>
                          </div>
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="mt-1 block font-sans text-[11.5px] font-medium leading-snug text-ink transition-colors hover:text-vermilion"
                          >
                            {source.title}
                          </a>
                          <p className="mt-0.5 text-[10px] text-ink-muted">
                            {source.site} · {sourceGradeLabel(source)}
                            {source.publishedAt ? ` · ${source.publishedAt}` : ""}
                          </p>
                          {source.snippet ? <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-ink-muted">{source.snippet}</p> : null}
                        </div>
                      ))}
                    </div>
                  )
                ) : null}

                {panel === "claims" ? (
                  run.claims.length === 0 ? (
                    <EmptyPanel icon={FileText} text="证据账本还是空的。" sub="取证阶段会逐条摘出主张、原话与出处。" />
                  ) : (
                    run.claims
                      .slice()
                      .reverse()
                      .map((claim) => {
                        const sourceIndex = run.sources.findIndex((source) => source.id === claim.sourceId);
                        return (
                          <div key={claim.id} className="border-b border-rule py-3 last:border-b-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-mono text-[8px] text-vermilion">S{sourceIndex + 1}</span>
                              <span className={`stamp ${claim.stance === "support" ? "text-jade" : claim.stance === "oppose" ? "text-vermilion" : "text-ink-muted"}`}>{STANCE_LABELS[claim.stance]}</span>
                              <span className="font-mono text-[7.5px] text-ink-muted">{CONFIDENCE_LABELS[claim.confidence]}置信</span>
                            </div>
                            <p className="mt-1.5 text-[10.5px] leading-relaxed text-ink-soft">{claim.text}</p>
                            {claim.quote ? (
                              <details className="mt-1.5">
                                <summary className="cursor-pointer text-[10px] text-ink-muted hover:text-ink">原文</summary>
                                <p className="mt-1 border-l-2 border-rule pl-2 text-[9.5px] leading-relaxed text-ink-muted">“{claim.quote}”</p>
                              </details>
                            ) : null}
                          </div>
                        );
                      })
                  )
                ) : null}

                {panel === "conflicts" ? (
                  <div>
                    {run.conflicts.length === 0 ? (
                      <EmptyPanel icon={Scale} text="还没有发现明确分歧。" sub="如果证据一致，这里会保持空白，而不是强行制造反方。" />
                    ) : (
                      run.conflicts.map((conflict) => (
                        <div key={conflict.id} className="border-b border-rule py-3 last:border-b-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-sans text-[11.5px] font-semibold leading-snug text-ink">{conflict.topic}</p>
                            <span className="font-mono text-[7.5px] text-ink-muted">{CONFIDENCE_LABELS[conflict.confidence]}</span>
                          </div>
                          <div className="mt-1.5 space-y-1">
                            {conflict.positions.map((position) => (
                              <p key={position.label} className="text-[9.5px] leading-relaxed text-ink-muted">
                                <span className="font-medium text-ink-soft">{position.label}：</span>
                                {position.argument}
                              </p>
                            ))}
                          </div>
                          <p className="mt-1.5 text-[9.5px] leading-relaxed text-ink-soft">{conflict.verdict}</p>
                        </div>
                      ))
                    )}
                    {run.debates.length > 0 ? (
                      <div className="mt-4 border-t border-ink pt-3">
                        <p className="text-[11px] text-ink-muted">正反论证</p>
                        {run.debates.map((debate) => (
                          <div key={debate.id} className="mt-2 border border-rule bg-paper p-3">
                            <p className="font-serif-cn text-[12px] leading-snug text-ink">{debate.question}</p>
                            <p className="mt-1.5 text-[9.5px] leading-relaxed text-jade">支持：{debate.pro.thesis}</p>
                            <p className="mt-1 text-[9.5px] leading-relaxed text-vermilion">反对：{debate.contra.thesis}</p>
                            <p className="mt-1.5 border-t border-rule pt-1.5 text-[9.5px] leading-relaxed text-ink-muted">{debate.verdict}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="flex items-center justify-between border-t border-rule px-4 py-2.5">
                <span className="text-[10px] text-ink-muted">
                  {run.stats.calls} 次调用 · {formatNumber(run.stats.inputTokens + run.stats.outputTokens)} tokens
                </span>
                <button
                  type="button"
                  onClick={() => setPanel(panel === "sources" ? "claims" : "sources")}
                  className="inline-flex items-center gap-1 text-[8px] text-ink-muted hover:text-vermilion"
                >
                  切换 <ChevronDown size={9} />
                </button>
              </div>
            </div>

            <div className="mt-4 px-1">
              <p className="text-[10px] leading-relaxed text-ink-muted">
                可以返回首页，问底会在后台继续；刷新或关闭标签页会暂停，回来可从断点继续。
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function EmptyPanel({ icon: Icon, text, sub }: { icon: typeof Search; text: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <Icon size={18} className="text-ink-muted/60" />
      <p className="mt-2 text-[11px] text-ink">{text}</p>
      <p className="mt-1 max-w-[220px] text-[9.5px] leading-relaxed text-ink-muted">{sub}</p>
    </div>
  );
}
