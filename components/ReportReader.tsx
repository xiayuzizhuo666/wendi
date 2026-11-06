import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  ArrowUp,
  ArrowUpRight,
  Copy,
  Download,
  ExternalLink,
  FileJson,
  Loader2,
  Menu,
  Printer,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { ReportDoc, ReportSection, SectionRole, Source } from "@/types";
import { resolveReading, STYLES } from "@/data/reading";
import { deriveCredibility, trustLevelLabel } from "@/lib/credibility";
import { sourceGradeLabel } from "@/lib/source-grade";
import { clamp, downloadJson, formatDate, safeFilename, sourceNumber } from "@/lib/format";
import { useTypstPdf } from "@/lib/typst/useTypstPdf";
import { TitleText } from "@/components/report/TitleText";
import { ReportBlocks } from "./report/Blocks";
import { DebatePanel } from "./report/Figures";

interface ReportReaderProps {
  report: ReportDoc;
  onBack: () => void;
}

const TYPE_LABELS: Record<Source["type"], string> = {
  encyclopedia: "百科",
  paper: "论文",
  official: "官方 / 规范",
  repository: "代码仓库",
  community: "社区",
  web: "网页",
  book: "书籍",
};

const CONFIDENCE_LABELS = { high: "高", medium: "中", low: "低" } as const;

const TOC_GROUPS: { label: string; roles: SectionRole[] }[] = [
  { label: "问题与定义", roles: ["hook", "definition"] },
  { label: "来路与机制", roles: ["origin", "mechanism"] },
  { label: "版图与交汇", roles: ["landscape", "intersection"] },
  { label: "争议与推演", roles: ["debate", "future"] },
  { label: "收束与说明", roles: ["bottom", "credibility", "other"] },
];

function inferSectionRole(section: ReportSection, index: number): SectionRole {
  if (section.role) return section.role;
  const text = `${section.kicker} ${section.title}`;
  if (/定义|是什么|一句话/.test(text)) return "definition";
  if (/来路|起源|脉络|历史|从哪来/.test(text)) return "origin";
  if (/机制|运作|原理|怎么/.test(text)) return "mechanism";
  if (/版图|横向|对比|位置|利益相关/.test(text)) return "landscape";
  if (/交汇|交叉|为什么是/.test(text)) return "intersection";
  if (/争议|反方|批评|证据/.test(text)) return "debate";
  if (/影响|意味着|改变|建议|落地/.test(text)) return "future";
  if (/收束|追问|判断|行动|路径|学习/.test(text)) return "bottom";
  if (/方法|说明|局限|可信度|质检/.test(text)) return "credibility";
  return index === 0 ? "hook" : "other";
}

export function ReportReader({ report, onBack }: ReportReaderProps) {
  const pdf = useTypstPdf(report);
  const [progress, setProgress] = useState(0);
  const [activeId, setActiveId] = useState(report.sections[0]?.id ?? "");
  const [tocOpen, setTocOpen] = useState(false);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [sourceListOpen, setSourceListOpen] = useState(false);
  const sources = report.sources;
  const reading = resolveReading(report.reading, report.meta.depth);
  const credibility =
    report.credibility ??
    deriveCredibility({
      sources,
      debates: report.debates,
      gaps: report.limitations,
      limitations: report.limitations,
      qa: report.qa,
      completedAt: report.meta.completedAt,
    });
  const sectionRoles = new Map(report.sections.map((section, index) => [section.id, inferSectionRole(section, index)]));

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [report.id]);

  useEffect(() => {
    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollable > 0 ? clamp(window.scrollY / scrollable, 0, 1) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const elements = report.sections
      .map((section) => document.getElementById(`section-${section.id}`))
      .filter((element): element is HTMLElement => Boolean(element));
    if (elements.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) setActiveId(visible[0].target.id.replace("section-", ""));
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: [0.1, 0.4, 0.7] },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [report.sections]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("链接已复制");
    } catch {
      toast.error("复制失败，请手动复制地址栏链接");
    }
  };

  const cite = (id: string) => setSourceId(id);
  const firstDebateAfter = useMemo(() => {
    const index = report.sections.findIndex(
      (section, sectionIndex) =>
        (section.role ?? inferSectionRole(section, sectionIndex)) === "debate" || section.id === "s5" || section.title.includes("争议"),
    );
    return index >= 0 ? index : Math.min(4, report.sections.length - 2);
  }, [report.sections]);

  return (
    <div className="min-h-dvh bg-paper">
      <div className="no-print fixed inset-x-0 top-0 z-50 h-[3px] bg-transparent">
        <div className="h-full bg-vermilion transition-[width] duration-150" style={{ width: `${progress * 100}%` }} />
      </div>

      <header className="no-print sticky top-[3px] z-40 border-b border-rule bg-paper/92 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-3 px-4 md:h-16 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex size-8 shrink-0 items-center justify-center border border-rule text-ink-muted transition-colors hover:border-ink hover:text-ink"
              aria-label="返回"
            >
              <ArrowLeft size={15} />
            </button>
            <div className="min-w-0">
              <p className="truncate font-serif-cn text-[14px] leading-tight text-ink md:text-[15px]">{report.title}</p>
              <p className="mt-0.5 text-[11px] text-ink-muted">
                {report.reading ? `${STYLES[reading.style].label} · ` : ""}
                {report.meta.readingMinutes} 分钟
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSourceListOpen(true)}
              className="hidden items-center gap-1.5 rounded-full border border-rule px-3 py-1.5 text-[11px] text-ink-muted transition-colors hover:border-ink hover:text-ink sm:flex"
            >
              来源 {sources.length}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex size-8 items-center justify-center border border-rule text-ink-muted transition-colors hover:border-ink hover:text-ink"
              aria-label="打印 / 另存为 PDF"
              title="打印 / 另存为 PDF"
            >
              <Printer size={14} />
            </button>
            <button
              type="button"
              onClick={() => {
                downloadJson(report, `${safeFilename(report.title)}.json`);
                toast.success("报告 JSON 已下载");
              }}
              className="hidden size-8 items-center justify-center border border-rule text-ink-muted transition-colors hover:border-ink hover:text-ink sm:flex"
              aria-label="下载 JSON"
              title="下载 JSON"
            >
              <FileJson size={14} />
            </button>
            <button
              type="button"
              onClick={copyLink}
              className="hidden size-8 items-center justify-center border border-rule text-ink-muted transition-colors hover:border-ink hover:text-ink sm:flex"
              aria-label="复制链接"
              title="复制链接"
            >
              <Copy size={14} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (pdf.status === "ready") pdf.downloadPdf();
                else if (pdf.status === "error") window.print();
                else if (pdf.status === "idle") pdf.retry();
              }}
              disabled={pdf.status === "compiling"}
              className="inline-flex h-8 items-center gap-1.5 bg-ink px-3 text-[10.5px] font-medium text-paper-raised transition-colors hover:bg-vermilion-deep disabled:cursor-wait disabled:opacity-70"
            >
              {pdf.status === "compiling" ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              {pdf.status === "compiling" ? "正在排版" : pdf.status === "ready" ? "下载 PDF" : pdf.status === "error" ? "打印 PDF" : "生成 PDF"}
            </button>
            <button
              type="button"
              onClick={() => setTocOpen((value) => !value)}
              className="flex size-8 items-center justify-center border border-rule text-ink-muted transition-colors hover:border-ink hover:text-ink lg:hidden"
              aria-label="目录"
              aria-expanded={tocOpen}
            >
              <Menu size={15} />
            </button>
          </div>
        </div>
        {pdf.status === "error" && pdf.message ? (
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-vermilion/30 bg-vermilion-wash/60 px-4 py-2 text-center text-[10.5px] text-vermilion-deep">
            <span>{pdf.message}</span>
            <button type="button" onClick={() => window.print()} className="underline underline-offset-2">打印网页版</button>
            <button type="button" onClick={pdf.downloadTyp} className="underline underline-offset-2">下载 .typ</button>
            <button type="button" onClick={pdf.retry} className="underline underline-offset-2">重试排版</button>
          </div>
        ) : null}
      </header>

      {tocOpen ? (
        <div className="no-print border-b border-rule bg-paper-raised px-5 py-4 lg:hidden">
          <p className="kicker mb-3">目录</p>
          <div className="grid gap-1">
            {report.sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => {
                  document.getElementById(`section-${section.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  setTocOpen(false);
                }}
                className={`flex items-baseline gap-3 py-1.5 text-left text-[12px] ${activeId === section.id ? "text-vermilion" : "text-ink-muted"}`}
              >
                <span className="font-mono text-[9px]">{section.number}</span>
                {section.title}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="report-layout mx-auto grid max-w-[1120px] grid-cols-1 gap-10 px-5 pb-20 pt-8 md:px-8 lg:grid-cols-[180px_minmax(0,760px)] lg:items-start lg:gap-14 lg:pt-12">
        <aside className="no-print hidden lg:sticky lg:top-24 lg:block">
          <p className="text-[12px] text-ink-muted">目录</p>
          <div className="mt-4 space-y-4">
            {TOC_GROUPS.map((group) => {
              const sections = report.sections.filter((section) => group.roles.includes(sectionRoles.get(section.id) ?? "other"));
              if (sections.length === 0) return null;
              return (
                <div key={group.label}>
                  <p className="mb-1.5 text-[11px] text-ink-muted-soft">{group.label}</p>
                  <nav className="border-l border-rule">
                    {sections.map((section) => (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => document.getElementById(`section-${section.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                        className={`group flex w-full items-baseline gap-3 border-l-2 py-2 pl-3 pr-2 text-left transition-colors ${
                          activeId === section.id
                            ? "border-vermilion text-ink"
                            : "border-transparent text-ink-muted hover:border-rule-strong hover:text-ink"
                        }`}
                      >
                        <span className={`font-mono text-[8.5px] ${activeId === section.id ? "text-vermilion" : "text-ink-muted-soft"}`}>
                          {section.number}
                        </span>
                        <span className="text-[11px] leading-snug">{section.title}</span>
                      </button>
                    ))}
                  </nav>
                </div>
              );
            })}
          </div>
          <div className="mt-8 border-t border-rule pt-4">
            <p className="text-[12px] text-ink-muted">阅读进度</p>
            <div className="mt-3 h-px w-full bg-rule">
              <div className="h-px bg-vermilion" style={{ width: `${progress * 100}%` }} />
            </div>
            <p className="mt-3 text-[11px] text-ink-muted">
              {report.meta.readingMinutes} 分钟 · {report.meta.wordCount.toLocaleString()} 字 · {sources.length} 个来源
            </p>
          </div>
        </aside>

        <article className="print-report min-w-0">
          <header className="border-b border-rule pb-8">
            <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-ink-muted">
              <span>{report.tags.slice(0, 3).join(" · ")}</span>
              <div className="flex items-center gap-3">
                {report.sample ? <span>样例</span> : null}
                <span>可信度 {trustLevelLabel(credibility.level)}</span>
              </div>
            </div>

            <h1 className="mt-6 max-w-[700px] font-serif-cn text-[38px] leading-[1.1] tracking-[-0.045em] text-ink md:text-[52px]">
              <TitleText text={report.title} />
            </h1>
            <p className="mt-4 max-w-[620px] font-serif-cn text-[17px] leading-[1.65] text-ink-muted md:text-[18px]">{report.subtitle}</p>
            <p className="mt-5 max-w-[620px] font-serif-cn text-[15px] leading-[1.9] text-ink-soft md:text-[16px]">{report.oneLiner}</p>

            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-ink-muted">
              <span>{report.meta.readingMinutes} 分钟</span>
              <span>{report.meta.wordCount.toLocaleString()} 字</span>
              <span>{sources.length} 个来源</span>
              <span>{formatDate(report.meta.completedAt)}</span>
            </div>
          </header>

          <section className="mt-10 border-y border-rule py-6">
            <p className="text-[12px] text-ink-muted">如果你只读三句话</p>
            <ol className="mt-4 space-y-3">
              {report.tldr.map((item, index) => (
                <li key={item} className="grid grid-cols-[20px_1fr] gap-3">
                  <span className="text-[11px] text-ink-muted">{index + 1}.</span>
                  <p className="font-serif-cn text-[15px] leading-[1.85] text-ink-soft md:text-[16px]">{item}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-10 border-b border-rule pb-8">
            <p className="text-[12px] text-ink-muted">这篇报告想回答</p>
            <div className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {report.keyQuestions.map((question, index) => (
                <div key={question} className="flex items-baseline gap-2.5 border-t border-rule pt-2.5">
                  <span className="text-[11px] text-ink-muted">{index + 1}.</span>
                  <p className="font-serif-cn text-[13.5px] leading-[1.7] text-ink-soft">{question}</p>
                </div>
              ))}
            </div>
          </section>

          {report.bareThinking ? (
            <section className="print-keep mt-10 rounded-xl bg-paper-deep px-5 py-5">
              <p className="text-[12px] text-ink-muted">读之前，我先记下</p>
              <p className="mt-3 font-serif-cn text-[14.5px] leading-[1.9] text-ink-soft">{report.bareThinking.text}</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-[11px] text-ink-muted">需要检验的假设</p>
                  <ul className="mt-2 space-y-1.5">
                    {report.bareThinking.assumptions.map((item) => (
                      <li key={item} className="text-[11px] leading-relaxed text-ink-muted">— {item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] text-ink-muted">先记下的类比</p>
                  <ul className="mt-2 space-y-1.5">
                    {report.bareThinking.analogies.map((item) => (
                      <li key={item} className="text-[11px] leading-relaxed text-ink-muted">— {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          ) : null}

          {report.sections.map((section, index) => {
            return (
            <div key={section.id}>
              <section id={`section-${section.id}`} className="scroll-mt-28 pt-12">
                <div className="report-section-header border-t border-rule pt-4">
                  <div className="flex items-baseline gap-3">
                    <span className="text-[11px] text-ink-muted">{section.number}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-ink-muted">{section.kicker}</p>
                      <h2 className="mt-1 font-serif-cn text-[26px] leading-[1.2] tracking-[-0.035em] text-ink md:text-[32px]">{section.title}</h2>
                    </div>
                  </div>
                  {section.takeaway ? (
                    <p className="mt-2 font-serif-cn text-[12px] leading-[1.8] text-ink-muted">
                      读完带走：{section.takeaway}
                    </p>
                  ) : null}
                </div>
                <div className="report-body md:pl-[34px]">
                  <ReportBlocks blocks={section.blocks} sources={sources} figures={report.figures} onCite={cite} />
                </div>
              </section>
              {index === firstDebateAfter && report.debates.length > 0 ? (
                <div className="md:pl-[34px]">
                  {report.debates.map((debate, debateIndex) => (
                    <DebatePanel key={debate.id} debate={debate} index={debateIndex + 1} sources={sources} onCite={cite} />
                  ))}
                </div>
              ) : null}
            </div>
            );
          })}

          <section className="mt-16 border-t border-rule pt-5">
            <h2 className="font-serif-cn text-[26px] leading-tight tracking-[-0.03em]">这份报告是怎么做出来的</h2>

            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {report.frameworks.map((framework) => (
                <div key={framework.name} className="border-t border-rule pt-3">
                  <p className="text-[12.5px] font-medium text-ink">{framework.name}</p>
                  <p className="mt-2 text-[11.5px] leading-relaxed text-ink-muted">{framework.why}</p>
                  <p className="mt-3 text-[11.5px] leading-relaxed text-ink-soft">{framework.reveals}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 border-t border-rule pt-4">
              <div className="flex items-center gap-2">
                <ShieldCheck size={15} className="text-ink-muted" />
                <span className="text-[12.5px] font-medium text-ink">五个可信度信号</span>
              </div>
              <p className="mt-3 text-[11.5px] leading-relaxed text-ink-muted">{credibility.summary}</p>
              <div className="grid gap-px border-t border-rule bg-rule sm:grid-cols-2">
                {credibility.signals.map((signal) => (
                  <div key={signal.id} className="bg-paper px-4 py-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11.5px] font-medium text-ink">{signal.label}</p>
                      <span className="text-[11px] text-ink-muted">{trustLevelLabel(signal.level)}</span>
                    </div>
                    <p className="mt-1.5 text-[10.5px] leading-relaxed text-ink-muted">{signal.note}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8">
              <p className="text-[12px] text-ink-muted">这份报告的局限</p>
              <ul className="mt-3 space-y-2 border-t border-rule pt-3">
                {report.limitations.map((limitation) => (
                  <li key={limitation} className="flex gap-3 text-[11.5px] leading-relaxed text-ink-muted">
                    <span className="mt-2 size-1 shrink-0 rounded-full bg-vermilion" />
                    {limitation}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="mt-14 border-t border-rule pt-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="font-serif-cn text-[24px] leading-tight tracking-[-0.03em]">来源</h2>
              <button
                type="button"
                onClick={() => setSourceListOpen(true)}
                className="inline-flex items-center gap-1.5 text-[11px] text-ink-muted hover:text-ink"
              >
                打开来源列表 <ArrowUpRight size={12} />
              </button>
            </div>
            <ol className="mt-5 divide-y divide-rule border-y border-rule">
              {sources.map((source, index) => (
                <li key={source.id} className="grid grid-cols-[26px_1fr_auto] items-start gap-3 py-3.5">
                  <button
                    type="button"
                    onClick={() => setSourceId(source.id)}
                    className="text-[11px] text-ink-muted hover:text-ink"
                  >
                    {index + 1}
                  </button>
                  <div className="min-w-0">
                    <button type="button" onClick={() => setSourceId(source.id)} className="block text-left font-sans text-[12.5px] font-medium text-ink hover:text-vermilion">
                      {source.title}
                    </button>
                    <p className="mt-0.5 truncate text-[11px] text-ink-muted">
                      {source.site} · {TYPE_LABELS[source.type]} · {sourceGradeLabel(source)} · {source.publishedAt ?? "日期未知"}
                    </p>
                  </div>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-0.5 flex size-6 items-center justify-center text-ink-muted transition-colors hover:text-vermilion"
                    aria-label={`打开 ${source.title}`}
                  >
                    <ExternalLink size={12} />
                  </a>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-12 border-t border-rule pt-6">
            <p className="text-[11px] leading-relaxed text-ink-muted">{report.methodologyNote}</p>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] text-ink-muted">
                问底 · {formatDate(report.meta.completedAt)}
              </p>
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="inline-flex items-center gap-1.5 text-[10px] text-ink-muted hover:text-ink"
              >
                回到开头 <ArrowUp size={11} />
              </button>
            </div>
          </section>
        </article>

      </div>

      {(sourceId || sourceListOpen) ? (
        <SourceDrawer
          report={report}
          activeId={sourceId}
          listMode={sourceListOpen && !sourceId}
          onSelect={setSourceId}
          onClose={() => {
            setSourceId(null);
            setSourceListOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function SourceDrawer({
  report,
  activeId,
  listMode,
  onSelect,
  onClose,
}: {
  report: ReportDoc;
  activeId: string | null;
  listMode: boolean;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const source = activeId ? report.sources.find((item) => item.id === activeId) : null;

  useEffect(() => {
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
  }, [onClose]);

  return createPortal(
    <div className="no-print fixed inset-0 z-[80] flex justify-end">
      <button type="button" className="absolute inset-0 bg-ink/35 backdrop-blur-[2px]" aria-label="关闭来源" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-[460px] flex-col border-l border-rule bg-paper-raised shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between border-b border-rule px-5 py-4">
          <div>
            <p className="font-serif-cn text-[17px] text-ink">{listMode ? `来源 · ${report.sources.length}` : "来源详情"}</p>
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

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {source ? (
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-ink-muted">来源 {sourceNumber(report.sources, source.id)}</span>
                <span className="text-[11px] text-ink-muted">{TYPE_LABELS[source.type]}</span>
                <span className="text-[11px] text-ink-muted">{sourceGradeLabel(source)}</span>
                {source.verified ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-ink-muted">
                    <ShieldCheck size={10} /> 已打开正文
                  </span>
                ) : null}
              </div>
              <h3 className="mt-5 font-serif-cn text-[24px] leading-[1.3] tracking-[-0.02em] text-ink">{source.title}</h3>
              <p className="mt-2 text-[11px] text-ink-muted">
                {source.site} · {source.publishedAt ?? "日期未知"} · 可信度 {CONFIDENCE_LABELS[source.credibility]}
              </p>
              {source.snippet ? (
                <p className="mt-5 border-l-2 border-rule pl-4 text-[12px] leading-[1.85] text-ink-soft">{source.snippet}</p>
              ) : null}
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-6 inline-flex items-center gap-2 border border-ink bg-ink px-4 py-2.5 text-[11.5px] text-paper-raised transition-colors hover:bg-vermilion-deep"
              >
                打开原文 <ExternalLink size={13} />
              </a>
              <p className="mt-3 break-all font-mono text-[8.5px] leading-relaxed text-ink-muted">{source.url}</p>

              <div className="mt-8 border-t border-rule pt-4">
                <p className="text-[11px] leading-relaxed text-ink-muted">
                  点击正文中的编号可随时回到这里。引用只代表「该来源说了这句话」，不代表问底为它的全部立场背书。
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {report.sources.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className="grid w-full grid-cols-[28px_1fr_auto] items-start gap-2 border-b border-rule px-1 py-3 text-left transition-colors last:border-b-0 hover:bg-paper"
                >
                  <span className="text-[11px] text-ink-muted">{index + 1}</span>
                  <span>
                    <span className="block font-sans text-[12.5px] font-medium text-ink">{item.title}</span>
                    <span className="mt-0.5 block text-[11px] text-ink-muted">{item.site} · {TYPE_LABELS[item.type]} · {sourceGradeLabel(item)}</span>
                  </span>
                  {item.verified ? <ShieldCheck size={12} className="mt-0.5 text-jade" /> : <span className="mt-1 size-1 rounded-full bg-rule-strong" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>,
    document.body,
  );
}
