import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, BookOpen, Clock3, FileText, Loader2, Trash2, X } from "lucide-react";
import type { ReportDoc, ResearchRun } from "@/types";
import { SAMPLES } from "@/data/samples";
import { formatDate, relativeTime } from "@/lib/format";

interface LibrarySheetProps {
  open: boolean;
  onClose: () => void;
  reports: ReportDoc[];
  runs: ResearchRun[];
  onOpenSample: (slug: string) => void;
  onOpenReport: (id: string) => void;
  onOpenRun: (id: string) => void;
  onDeleteReport: (id: string) => void;
  onStartNew: () => void;
}

const STATUS_LABEL: Record<ResearchRun["status"], string> = {
  running: "进行中",
  paused: "已暂停",
  complete: "已完成",
  error: "出错",
  cancelled: "已取消",
};

export function LibrarySheet({
  open,
  onClose,
  reports,
  runs,
  onOpenSample,
  onOpenReport,
  onOpenRun,
  onDeleteReport,
  onStartNew,
}: LibrarySheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  const activeRuns = runs.filter((run) => run.status === "running" || run.status === "paused" || run.status === "error");
  const finishedRuns = runs.filter((run) => run.status === "complete" && run.reportId);
  const unlistedFinishedRuns = finishedRuns.filter((run) => !reports.some((report) => report.id === run.reportId));

  return createPortal(
    <div className="no-print fixed inset-0 z-[85] flex justify-end">
      <button type="button" className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" aria-label="关闭报告库" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="报告库"
        className="relative flex h-full w-full max-w-[620px] flex-col border-l border-rule bg-paper-raised shadow-2xl animate-fade-in"
      >
        <div className="flex items-center justify-between border-b border-rule px-5 py-4 md:px-7">
          <div>
            <h2 className="font-serif-cn text-[24px] tracking-[-0.03em] text-ink">报告库</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-paper-deep hover:text-ink"
            aria-label="关闭"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6 md:px-7">
          {activeRuns.length > 0 ? (
            <section className="mb-8">
              <div className="flex items-center justify-between">
                <p className="text-[12px] text-ink">进行中的问底</p>
                <span className="text-[11px] text-ink-muted">{activeRuns.length}</span>
              </div>
              <div className="mt-3 divide-y divide-rule border-y border-rule">
                {activeRuns.map((run) => (
                  <button
                    key={run.id}
                    type="button"
                    onClick={() => onOpenRun(run.id)}
                    className="flex w-full items-center justify-between gap-4 py-3.5 text-left transition-colors hover:bg-paper"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-serif-cn text-[15px] text-ink">{run.topic}</p>
                      <p className="mt-1 flex items-center gap-2 text-[11px] text-ink-muted">
                        <span className={run.status === "error" ? "text-vermilion" : "text-jade"}>{STATUS_LABEL[run.status]}</span>
                        <span>·</span>
                        <span>{relativeTime(run.updatedAt)}</span>
                        <span>·</span>
                        <span>{run.scene === "life" ? "生活" : "学习"}</span>
                      </p>
                    </div>
                    {run.status === "running" ? <Loader2 size={14} className="animate-spin text-vermilion" /> : <ArrowUpRight size={14} className="text-ink-muted" />}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <div className="flex items-center justify-between">
              <p className="text-[12px] text-ink">我的报告</p>
              <span className="text-[11px] text-ink-muted">{reports.length + unlistedFinishedRuns.length}</span>
            </div>
            {reports.length === 0 && finishedRuns.length === 0 ? (
              <div className="mt-3 border border-dashed border-rule-strong px-5 py-8 text-center">
                <FileText size={20} className="mx-auto text-ink-muted-soft" />
                <p className="mt-3 font-serif-cn text-[16px] text-ink">还没有自己的报告</p>
                <p className="mx-auto mt-1 max-w-[260px] text-[11px] leading-relaxed text-ink-muted">
                  先读一份样例，或者回到问底，写下你好奇的那件事。
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onStartNew();
                  }}
                  className="mt-4 inline-flex h-9 items-center gap-1.5 bg-ink px-4 text-[11px] text-paper-raised transition-colors hover:bg-vermilion-deep"
                >
                  去问底 <ArrowUpRight size={12} />
                </button>
              </div>
            ) : (
              <div className="mt-3 divide-y divide-rule border-y border-rule">
                {reports.map((report) => (
                  <div key={report.id} className="group flex items-start justify-between gap-3 py-4">
                    <button type="button" onClick={() => onOpenReport(report.id)} className="min-w-0 flex-1 text-left">
                      <p className="truncate font-serif-cn text-[16px] leading-snug text-ink transition-colors group-hover:text-vermilion">{report.title}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-ink-muted">
                        <span>{report.meta.scene === "life" ? "生活" : "学习"}</span>
                        <span>·</span>
                        <span>{formatDate(report.meta.completedAt)}</span>
                        <span>·</span>
                        <span>{report.meta.readingMinutes} 分钟</span>
                        <span>·</span>
                        <span>{report.sources.length} 个来源</span>
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("删除这份报告？此操作不可撤销。")) onDeleteReport(report.id);
                      }}
                      className="mt-0.5 flex size-7 shrink-0 items-center justify-center border border-transparent text-ink-muted transition-colors hover:border-vermilion/30 hover:bg-vermilion-wash/40 hover:text-vermilion"
                      aria-label={`删除 ${report.title}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                {unlistedFinishedRuns
                  .map((run) => (
                    <button
                      key={run.id}
                      type="button"
                      onClick={() => (run.reportId ? onOpenReport(run.reportId) : onOpenRun(run.id))}
                      className="flex w-full items-center justify-between gap-3 py-4 text-left"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-serif-cn text-[15px] text-ink">{run.topic}</p>
                        <p className="mt-1 flex items-center gap-2 text-[11px] text-ink-muted">
                          <Clock3 size={9} />
                          {relativeTime(run.updatedAt)}
                        </p>
                      </div>
                      <ArrowUpRight size={13} className="text-ink-muted" />
                    </button>
                  ))}
              </div>
            )}
          </section>

          <section className="mt-9">
            <div className="flex items-center justify-between">
              <p className="text-[12px] text-ink">样例报告</p>
            </div>
            <div className="mt-3 divide-y divide-rule border-y border-rule">
              {SAMPLES.map((sample) => (
                <button
                  key={sample.slug}
                  type="button"
                  onClick={() => onOpenSample(sample.slug)}
                  className="group flex w-full items-start justify-between gap-4 py-4 text-left"
                >
                  <div className="min-w-0">
                    <p className="truncate font-serif-cn text-[16px] text-ink transition-colors group-hover:text-vermilion">{sample.report.title}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-ink-muted">
                      <span>{sample.report.meta.scene === "life" ? "生活" : "学习"}</span>
                      <span>·</span>
                      <span>{sample.report.meta.readingMinutes} 分钟</span>
                      <span>·</span>
                      <span>{sample.report.meta.sourceCount} 个来源</span>
                    </p>
                  </div>
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center border border-rule text-ink-muted transition-colors group-hover:border-vermilion group-hover:text-vermilion">
                    <BookOpen size={12} />
                  </span>
                </button>
              ))}
            </div>
          </section>

        </div>

        <div className="border-t border-rule bg-paper px-5 py-4 md:px-7">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] text-ink-muted">报告保存在本机浏览器，不会上传到服务器。</p>
            <button
              type="button"
              onClick={() => {
                onClose();
                onStartNew();
              }}
              className="inline-flex h-9 items-center gap-1.5 bg-ink px-4 text-[11px] text-paper-raised transition-colors hover:bg-vermilion-deep"
            >
              新问底 <ArrowUpRight size={12} />
            </button>
          </div>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
