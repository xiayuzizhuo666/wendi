import { AlertTriangle, ArrowUpRight, BookOpen, Compass, HelpCircle, Info, Lightbulb, Scale } from "lucide-react";
import type { ReportBlock, ReportFigure, Source } from "@/types";
import { RichText } from "./RichText";
import { FigureView } from "./Figures";

interface ReportBlocksProps {
  blocks: ReportBlock[];
  sources: Source[];
  figures: ReportFigure[];
  onCite?: (sourceId: string) => void;
}

const CONFIDENCE_LABELS = { high: "高", medium: "中", low: "低" } as const;

const CALLOUT_STYLES: Record<
  string,
  { box: string; label: string; icon: typeof Lightbulb; iconBox: string }
> = {
  insight: {
    box: "border-vermilion/30 bg-vermilion-wash/45",
    label: "关键洞察",
    icon: Lightbulb,
    iconBox: "bg-vermilion text-paper-raised",
  },
  warning: {
    box: "border-gold/45 bg-gold-wash/55",
    label: "值得警惕",
    icon: AlertTriangle,
    iconBox: "bg-gold text-paper-raised",
  },
  note: {
    box: "border-blue-ink/25 bg-blue-wash/45",
    label: "补充说明",
    icon: Info,
    iconBox: "bg-blue-ink text-paper-raised",
  },
  question: {
    box: "border-jade/30 bg-jade-wash/45",
    label: "继续追问",
    icon: HelpCircle,
    iconBox: "bg-jade text-paper-raised",
  },
};

export function ReportBlocks({ blocks, sources, figures, onCite }: ReportBlocksProps) {
  return (
    <>
      {blocks.map((block, index) => {
        if (block.type === "p") {
          return (
            <p key={index} className="mt-5 font-serif-cn text-[16px] leading-[1.95] text-ink-soft md:text-[16.5px]">
              <RichText text={block.text} sources={sources} onCite={onCite} />
            </p>
          );
        }

        if (block.type === "h3") {
          return (
            <h3 key={index} className="mt-10 flex items-baseline gap-3 font-sans text-[17px] font-semibold leading-snug text-ink md:text-[18px]">
              <span className="mt-[7px] h-px w-5 shrink-0 bg-vermilion" aria-hidden="true" />
              <span>{block.text}</span>
            </h3>
          );
        }

        if (block.type === "callout") {
          const style = CALLOUT_STYLES[block.tone] ?? CALLOUT_STYLES.note;
          const Icon = style.icon;
          return (
            <aside key={index} className={`my-8 border p-5 md:p-6 ${style.box}`}>
              <div className="flex items-center gap-2.5">
                <span className={`flex size-7 items-center justify-center ${style.iconBox}`}>
                  <Icon size={14} strokeWidth={2.2} />
                </span>
                <div>
                  <p className="kicker">{style.label}</p>
                  {block.title ? <p className="mt-0.5 font-sans text-[13.5px] font-semibold text-ink">{block.title}</p> : null}
                </div>
              </div>
              <p className="mt-3 font-serif-cn text-[15px] leading-[1.9] text-ink-soft">
                <RichText text={block.text} sources={sources} onCite={onCite} />
              </p>
            </aside>
          );
        }

        if (block.type === "list") {
          const items = block.items.map((item, itemIndex) => (
            <li key={itemIndex} className="relative pl-5">
              <span className={`absolute left-0 top-[0.72em] ${block.ordered ? "font-mono text-[10px] text-vermilion" : "size-1 rounded-full bg-vermilion"}`}>
                {block.ordered ? `${itemIndex + 1}.` : ""}
              </span>
              <RichText text={item} sources={sources} onCite={onCite} />
            </li>
          ));
          return block.ordered ? (
            <ol key={index} className="mt-5 space-y-2.5 font-serif-cn text-[15.5px] leading-[1.85] text-ink-soft">
              {items}
            </ol>
          ) : (
            <ul key={index} className="mt-5 space-y-2.5 font-serif-cn text-[15.5px] leading-[1.85] text-ink-soft">
              {items}
            </ul>
          );
        }

        if (block.type === "quote") {
          return (
            <blockquote key={index} className="my-8 border-l-2 border-vermilion bg-paper-raised px-5 py-4 md:px-6">
              <p className="font-serif-cn text-[17px] leading-[1.9] text-ink">“{block.text}”</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {block.attribution ? <span className="text-[11px] text-ink-muted">—— {block.attribution}</span> : null}
                {block.sourceId ? (
                  <button
                    type="button"
                    onClick={() => onCite?.(block.sourceId!)}
                    className="font-mono text-[9px] text-ink-muted underline decoration-rule underline-offset-2 hover:text-vermilion"
                  >
                    查看来源
                  </button>
                ) : null}
              </div>
            </blockquote>
          );
        }

        if (block.type === "table") {
          return (
            <div key={index} className="my-8 overflow-x-auto border-y border-rule">
              <table className="w-full min-w-[560px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-rule">
                    {block.headers.map((header) => (
                      <th key={header} className="px-3 py-2.5 text-[11px] font-medium text-ink-muted first:pl-0 last:pr-0">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b border-rule last:border-b-0">
                      {row.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className={`px-3 py-3 align-top text-[12.5px] leading-relaxed first:pl-0 last:pr-0 ${
                            cellIndex === 0 ? "font-sans font-medium text-ink" : "text-ink-soft"
                          }`}
                        >
                          <RichText text={cell} sources={sources} onCite={onCite} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {block.caption ? <p className="border-t border-rule pt-2 text-[11px] text-ink-muted">{block.caption}</p> : null}
            </div>
          );
        }

        if (block.type === "figure") {
          const figure = figures.find((item) => item.id === block.figureId);
          if (!figure) return null;
          return <FigureView key={index} figure={figure} index={figures.indexOf(figure) + 1} sources={sources} onCite={onCite} />;
        }

        if (block.type === "keyline") {
          return (
            <div key={index} className="my-10 border-y border-ink py-6 text-center">
              <p className="kicker mb-3">记住这一句</p>
              <p className="font-serif-cn text-[22px] leading-[1.5] text-ink md:text-[27px]">{block.text}</p>
            </div>
          );
        }

        if (block.type === "steps") {
          return (
            <ol key={index} className="my-7 divide-y divide-rule border-y border-rule">
              {block.items.map((item, itemIndex) => (
                <li key={item.title} className="grid grid-cols-[34px_1fr] gap-4 py-4">
                  <span className="text-[11px] leading-6 text-ink-muted">{itemIndex + 1}</span>
                  <div>
                    <p className="font-sans text-[13.5px] font-semibold text-ink">{item.title}</p>
                    <p className="mt-1 font-serif-cn text-[14.5px] leading-[1.8] text-ink-soft">{item.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          );
        }

        if (block.type === "judgment") {
          return (
            <aside key={index} className="my-8 border border-ink bg-paper-raised p-5 md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule pb-3">
                <div className="flex items-center gap-2">
                  <Scale size={14} className="text-vermilion" />
                  <p className="kicker text-vermilion">{block.label || "我的判断"}</p>
                </div>
                <span className="text-[11px] text-ink-muted">
                  置信度 {CONFIDENCE_LABELS[block.confidence]}
                </span>
              </div>
              <p className="mt-4 font-serif-cn text-[16px] leading-[1.9] text-ink">
                <RichText text={block.text} sources={sources} onCite={onCite} />
              </p>
              {block.changeMyMind ? (
                <div className="mt-4 border-t border-rule pt-3">
                  <p className="text-[11px] text-ink-muted">什么会改变这个判断</p>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-muted">{block.changeMyMind}</p>
                </div>
              ) : null}
            </aside>
          );
        }

        if (block.type === "mythFact") {
          return (
            <div key={index} className="my-8 space-y-3">
              {block.items.map((item) => (
                <div key={item.myth} className="grid overflow-hidden border border-rule bg-paper-raised md:grid-cols-2">
                  <div className="border-l-2 border-vermilion bg-vermilion-wash/25 px-4 py-4 md:border-l-0 md:border-r md:border-vermilion/30">
                    <p className="kicker text-vermilion">常见误解</p>
                    <p className="mt-2 font-serif-cn text-[15px] leading-[1.8] text-ink-soft">{item.myth}</p>
                  </div>
                  <div className="border-l-2 border-jade bg-jade-wash/25 px-4 py-4">
                    <p className="kicker text-jade">更准确的说法</p>
                    <p className="mt-2 font-serif-cn text-[15px] leading-[1.8] text-ink-soft">{item.fact}</p>
                    {item.note ? <p className="mt-2 text-[10.5px] leading-relaxed text-ink-muted">{item.note}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          );
        }

        if (block.type === "furtherReading") {
          return (
            <div key={index} className="my-8 border border-rule bg-paper-raised">
              <div className="flex items-center gap-2 border-b border-rule px-4 py-3">
                <BookOpen size={14} className="text-vermilion" />
                <p className="kicker text-vermilion">继续阅读</p>
              </div>
              <div className="divide-y divide-rule">
                {block.items.map((item) => (
                  <div key={item.title} className="px-4 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-sans text-[12.5px] font-semibold text-ink">{item.title}</p>
                        {item.author ? <p className="mt-0.5 text-[10px] text-ink-muted">{item.author}</p> : null}
                      </div>
                      {item.url ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="mt-0.5 shrink-0 text-ink-muted transition-colors hover:text-vermilion"
                          aria-label={`打开 ${item.title}`}
                        >
                          <ArrowUpRight size={13} />
                        </a>
                      ) : null}
                    </div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-ink-muted">{item.why}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        if (block.type === "scenario") {
          return (
            <div key={index} className="my-8 grid gap-3 md:grid-cols-3">
              {block.items.map((item, itemIndex) => (
                <div key={item.name} className="flex flex-col border border-rule bg-paper-raised p-4">
                  <div className="flex items-center gap-2">
                    <Compass size={13} className={itemIndex === 1 ? "text-vermilion" : itemIndex === 2 ? "text-jade" : "text-gold"} />
                    <p className="text-[11px] text-ink-muted">剧本 {itemIndex + 1}</p>
                  </div>
                  <p className="mt-3 font-serif-cn text-[18px] leading-tight text-ink">{item.name}</p>
                  <p className="mt-2 flex-1 text-[11.5px] leading-[1.8] text-ink-muted">{item.text}</p>
                  <div className="mt-4 border-t border-rule pt-2.5">
                    <p className="text-[11px] text-ink-muted">观察信号</p>
                    <p className="mt-1 text-[10.5px] leading-relaxed text-ink-soft">{item.signal}</p>
                  </div>
                </div>
              ))}
            </div>
          );
        }

        return null;
      })}
    </>
  );
}
