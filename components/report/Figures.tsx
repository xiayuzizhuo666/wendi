import type { Debate, ReportFigure, Source } from "@/types";
import { sourceNumber } from "@/lib/format";
import { RichText } from "./RichText";

interface FigureViewProps {
  figure: ReportFigure;
  index: number;
  sources: Source[];
  onCite?: (sourceId: string) => void;
}

export function FigureView({ figure, index, sources, onCite }: FigureViewProps) {
  return (
    <figure className="my-10">
      <div className="flex items-baseline justify-between gap-4 border-t-2 border-ink pt-2.5">
        <span className="kicker">图示 {String(index).padStart(2, "0")}</span>
        <span className="kicker text-ink-soft">{figure.title}</span>
      </div>
      <div className="mt-5">
        {figure.type === "timeline" && <TimelineFigure figure={figure} sources={sources} onCite={onCite} />}
        {figure.type === "conceptMap" && <ConceptMapFigure figure={figure} />}
        {figure.type === "matrix" && <MatrixFigure figure={figure} />}
        {figure.type === "evidence" && <MatrixFigure figure={figure} />}
        {figure.type === "debate" && <MatrixFigure figure={figure} />}
      </div>
      <figcaption className="mt-4 border-t border-rule pt-2 text-[11.5px] leading-relaxed text-ink-muted">
        {figure.caption}
      </figcaption>
    </figure>
  );
}

function TimelineFigure({
  figure,
  sources,
  onCite,
}: {
  figure: ReportFigure;
  sources: Source[];
  onCite?: (sourceId: string) => void;
}) {
  const events = figure.data.events ?? [];
  return (
    <div className="border-y border-rule">
      {events.map((event, index) => (
        <div
          key={`${event.date}-${event.title}`}
          className="grid grid-cols-[74px_1fr] gap-3 md:grid-cols-[112px_1fr] md:gap-5"
        >
          <div className="py-4 font-mono text-[10.5px] leading-5 tracking-wide text-ink-muted md:text-[11px]">
            {event.date}
          </div>
          <div className={`relative border-l border-rule py-4 pl-5 md:pl-6 ${index === 0 ? "" : ""}`}>
            <span className="absolute -left-[4px] top-[22px] size-[7px] rounded-full border border-paper bg-vermilion" />
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <h4 className="font-sans text-[14px] font-semibold text-ink">{event.title}</h4>
              {event.sourceId ? (
                <button
                  type="button"
                  onClick={() => onCite?.(event.sourceId!)}
                  className="font-mono text-[9px] text-ink-muted underline decoration-rule underline-offset-2 hover:text-vermilion"
                >
                  [{sourceNumber(sources, event.sourceId)}]
                </button>
              ) : null}
            </div>
            <p className="mt-1 max-w-[560px] text-[12.5px] leading-relaxed text-ink-muted">{event.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ConceptMapFigure({ figure }: { figure: ReportFigure }) {
  const nodes = figure.data.nodes ?? [];
  const center = figure.data.center ?? "中心";
  const cx = 360;
  const cy = 212;
  const rx = 246;
  const ry = 132;

  return (
    <div className="overflow-hidden rounded-sm border border-rule bg-paper-raised">
      <svg viewBox="0 0 720 424" className="h-auto w-full" role="img" aria-label={figure.title}>
        <defs>
          <pattern id={`grid-${figure.id}`} width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#D9D0BE" strokeWidth="0.45" opacity="0.55" />
          </pattern>
        </defs>
        <rect width="720" height="424" fill={`url(#grid-${figure.id})`} />
        <circle cx={cx} cy={cy} r="54" fill="#1E1B16" />
        <text x={cx} y={cy - 2} textAnchor="middle" fill="#FBF8F1" fontFamily="var(--font-sans)" fontSize="15" fontWeight="600">
          {center}
        </text>
        <text x={cx} y={cy + 18} textAnchor="middle" fill="#B9AE99" fontFamily="var(--font-mono)" fontSize="8" letterSpacing="1.2">
          PROTOCOL
        </text>

        {nodes.map((node, index) => {
          const angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2 - Math.PI / 2;
          const x = cx + Math.cos(angle) * rx;
          const y = cy + Math.sin(angle) * ry;
          const cardW = 138;
          const cardH = 52;
          const left = x - cardW / 2;
          const top = y - cardH / 2;
          const anchorX = x < cx - 20 ? left + cardW : x > cx + 20 ? left : x;
          const anchorY = y < cy - 20 ? top + cardH : y > cy + 20 ? top : y;
          return (
            <g key={node.id}>
              <line
                x1={cx}
                y1={cy}
                x2={anchorX}
                y2={anchorY}
                stroke={index % 3 === 0 ? "#B23A2E" : "#B9AE99"}
                strokeWidth={index % 3 === 0 ? 1 : 0.75}
                strokeDasharray={index % 3 === 0 ? "0" : "3 3"}
                opacity="0.75"
              />
              <rect
                x={left}
                y={top}
                width={cardW}
                height={cardH}
                rx="2"
                fill="#FBF8F1"
                stroke={index % 3 === 0 ? "#B23A2E" : "#D9D0BE"}
                strokeWidth="0.8"
              />
              <text x={x} y={top + 21} textAnchor="middle" fill="#1E1B16" fontFamily="var(--font-sans)" fontSize="11.5" fontWeight="600">
                {node.label}
              </text>
              <text x={x} y={top + 37} textAnchor="middle" fill="#706A5D" fontFamily="var(--font-sans)" fontSize="8.5">
                {node.relation}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function MatrixFigure({ figure }: { figure: ReportFigure }) {
  const columns = figure.data.columns ?? [];
  const rows = figure.data.rows ?? [];
  return (
    <div className="overflow-x-auto border-y border-rule">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className="border-b border-rule">
            <th className="w-[126px] py-3 pr-4 text-[11px] font-medium text-ink-muted">
              视角
            </th>
            {columns.map((column) => (
              <th key={column} className="px-4 py-3 text-[11px] font-medium text-ink-muted">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={row.label} className="border-b border-rule last:border-b-0 hover:bg-paper-raised/60">
              <th className="py-4 pr-4 align-top font-sans text-[12.5px] font-semibold text-ink">
                <span className="mr-2 inline-block size-1.5 rounded-full bg-vermilion align-middle" />
                {row.label}
              </th>
              {row.values.map((value, valueIndex) => (
                <td key={`${row.label}-${valueIndex}`} className="px-4 py-4 align-top text-[12.5px] leading-relaxed text-ink-soft">
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DebatePanel({
  debate,
  index,
  sources,
  onCite,
}: {
  debate: Debate;
  index: number;
  sources: Source[];
  onCite?: (sourceId: string) => void;
}) {
  return (
    <section className="my-12 border-t-2 border-ink pt-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="kicker">争议场 {String(index).padStart(2, "0")}</span>
        <span className="kicker text-ink-muted">把最强反方放在台面上</span>
      </div>
      <h3 className="mt-3 font-serif-cn text-[25px] leading-tight text-ink md:text-[30px]">{debate.question}</h3>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <DebateSideCard side={debate.pro} tone="pro" sources={sources} onCite={onCite} />
        <DebateSideCard side={debate.contra} tone="contra" sources={sources} onCite={onCite} />
      </div>

      <div className="mt-4 border border-ink bg-paper-raised p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="stamp text-vermilion">目前的判断</span>
          <span className="kicker">置信度 {debate.confidence === "high" ? "高" : debate.confidence === "medium" ? "中" : "低"}</span>
        </div>
        <p className="mt-3 font-serif-cn text-[16px] leading-[1.9] text-ink-soft">{debate.verdict}</p>
        <div className="mt-4 border-t border-rule pt-3">
          <p className="kicker mb-1.5">什么会改变这个判断</p>
          <p className="text-[12.5px] leading-relaxed text-ink-muted">{debate.changeMyMind}</p>
        </div>
      </div>
    </section>
  );
}

function DebateSideCard({
  side,
  tone,
  sources,
  onCite,
}: {
  side: Debate["pro"];
  tone: "pro" | "contra";
  sources: Source[];
  onCite?: (sourceId: string) => void;
}) {
  const isPro = tone === "pro";
  return (
    <div className={`border p-5 ${isPro ? "border-jade/35 bg-jade-wash/45" : "border-vermilion/35 bg-vermilion-wash/40"}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className={`stamp ${isPro ? "text-jade" : "text-vermilion"}`}>{side.label}</span>
        <span className="text-[11px] text-ink-muted">{isPro ? "支持方最强论证" : "反对方最强论证"}</span>
      </div>
      <p className="mt-3 font-serif-cn text-[15px] leading-[1.85] text-ink">{side.thesis}</p>
      <ul className="mt-4 space-y-3">
        {side.points.map((point, index) => (
          <li key={`${point.text}-${index}`} className="grid grid-cols-[18px_1fr] gap-2 text-[12.5px] leading-relaxed text-ink-soft">
            <span className={`font-mono text-[10px] ${isPro ? "text-jade" : "text-vermilion"}`}>{String(index + 1).padStart(2, "0")}</span>
            <span>
              <RichText text={point.text} sources={sources} onCite={onCite} />
              {point.evidenceIds.length > 0 && !/\[\[s\d+\]\]/.test(point.text) ? (
                <span className="ml-1 inline-flex gap-1 align-baseline">
                  {point.evidenceIds.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onCite?.(id)}
                      className="font-mono text-[9px] text-ink-muted underline decoration-rule underline-offset-2 hover:text-vermilion"
                    >
                      [{sourceNumber(sources, id)}]
                    </button>
                  ))}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
