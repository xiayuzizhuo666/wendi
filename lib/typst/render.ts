import type { Debate, ReportBlock, ReportDoc, ReportFigure, ReportSection, SectionRole, Source } from "../../types";
import { formatDate, sourceNumber } from "../format";
import { deriveCredibility, trustLevelLabel } from "../credibility";
import { sourceGradeLabel } from "../source-grade";

const INK = "#1E1B16";
const INK_SOFT = "#3B352B";
const MUTED = "#706A5D";
const RULE = "#D9D0BE";
const PAPER = "#F6F2E8";
const PAPER_RAISED = "#FBF8F1";
const VERMILION = "#B23A2E";
const VERMILION_WASH = "#F1DDD7";
const JADE = "#2F5D50";
const JADE_WASH = "#E1EBE5";
const GOLD = "#A77B32";
const GOLD_WASH = "#F2E8D2";
const BLUE = "#294B63";
const BLUE_WASH = "#E2EAF0";

const CONFIDENCE: Record<string, string> = { high: "高", medium: "中", low: "低" };
const TYPE_LABELS: Record<string, string> = {
  encyclopedia: "百科",
  paper: "论文",
  official: "官方/规范",
  repository: "代码仓库",
  community: "社区",
  web: "网页",
  book: "书籍",
};

function esc(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\//g, "\\/")
    .replace(/([#*_$@\[\]<>`~^%])/g, "\\$1")
    .replace(/^([=\-+])/, "\\$1")
    .trim();
}

function inline(text: string, sources: Source[]): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const tokens = cleaned.split(/(\[\[s\d+\]\]|\*\*[^*]+\*\*)/g);
  return tokens
    .map((token) => {
      if (/^\[\[s\d+\]\]$/.test(token)) {
        const id = token.slice(2, -2);
        const number = sourceNumber(sources, id);
        return number > 0 ? `#super[#text(size: 7.5pt, fill: rgb("${VERMILION}"))[${number}]]` : "";
      }
      if (/^\*\*[^*]+\*\*$/.test(token)) {
        return `*${esc(token.slice(2, -2))}*`;
      }
      return esc(token);
    })
    .join("");
}

function safeLink(url: string, label: string): string {
  const safeUrl = url.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `#link("${safeUrl}")[${esc(label)}]`;
}

function renderTable(headers: string[], rows: string[][], sources: Source[]): string {
  const columns = headers.length;
  const align = Array.from({ length: columns }, () => "left").join(", ");
  const header = headers.map((headerText) => `[#text(size: 8pt, fill: rgb("${MUTED}"), font: "Noto Sans SC")[${inline(headerText, sources)}]]`).join(", ");
  const body = rows
    .map((row) => {
      const cells = [...row];
      while (cells.length < columns) cells.push("—");
      return cells.slice(0, columns).map((cell) => `[${inline(cell, sources)}]`).join(", ");
    })
    .join(",\n  ");
  return `#table(
  columns: ${columns},
  inset: 6pt,
  stroke: none,
  align: (${align}),
  table.header(${header}),
  table.hline(stroke: 0.6pt + rgb("${INK}")),
  ${body},
  table.hline(stroke: 0.4pt + rgb("${RULE}")),
)`;
}

function renderCallout(block: Extract<ReportBlock, { type: "callout" }>, sources: Source[]): string {
  const styles: Record<string, [string, string, string]> = {
    insight: [VERMILION_WASH, VERMILION, "关键洞察"],
    warning: [GOLD_WASH, GOLD, "值得警惕"],
    note: [BLUE_WASH, BLUE, "补充说明"],
    question: [JADE_WASH, JADE, "继续追问"],
  };
  const [wash, accent, label] = styles[block.tone] ?? styles.note;
  return `#block(
  width: 100%,
  fill: rgb("${wash}"),
  breakable: false,
  stroke: (left: 2pt + rgb("${accent}")),
  inset: (x: 12pt, y: 10pt),
  radius: 2pt,
  above: 10pt,
  below: 10pt,
)[
  #text(size: 8pt, fill: rgb("${accent}"), tracking: 0.8pt)[${esc(label)}]
  #v(3pt)
  ${block.title ? `#text(size: 10pt)[*${esc(block.title)}*]\n  #v(2pt)\n  ` : ""}
  #text(size: 10pt, )[${inline(block.text, sources)}]
]
`;
}

function renderSteps(block: Extract<ReportBlock, { type: "steps" }>, sources: Source[]): string {
  const rows = block.items
    .map(
      (item, index) =>
        `[#text(size: 8pt, fill: rgb("${VERMILION}"))[${String(index + 1).padStart(2, "0")}]], [#text(size: 10pt)[*${esc(item.title)}*] #v(2pt) #text(size: 9.5pt, fill: rgb("${INK_SOFT}"))[${inline(item.text, sources)}]]`,
    )
    .join(",\n  ");
  return `#grid(
  columns: (24pt, 1fr),
  row-gutter: 8pt,
  ${rows},
)
`;
}

function renderJudgment(block: Extract<ReportBlock, { type: "judgment" }>, sources: Source[]): string {
  return `#block(
  width: 100%,
  fill: rgb("${PAPER_RAISED}"),
  stroke: 1pt + rgb("${INK}"),
  inset: 12pt,
  above: 12pt,
  below: 12pt,
)[
  #text(size: 8pt, fill: rgb("${VERMILION}"), tracking: 0.8pt)[${esc(block.label || "我的判断")} · 置信度 ${CONFIDENCE[block.confidence]}]
  #v(5pt)
  #text(size: 10.5pt, )[${inline(block.text, sources)}]
  ${block.changeMyMind ? `\n  #v(6pt)\n  #text(size: 8.5pt, fill: rgb("${MUTED}"))[什么会改变这个判断：${inline(block.changeMyMind, sources)}]` : ""}
]
`;
}

function renderMythFact(block: Extract<ReportBlock, { type: "mythFact" }>, sources: Source[]): string {
  const rows = block.items
    .map(
      (item) =>
        `[#text(size: 9pt, fill: rgb("${VERMILION}"))[*${esc(item.myth)}*]], [#text(size: 9.5pt)[${inline(item.fact, sources)}]${item.note ? ` #linebreak() #text(size: 8pt, fill: rgb("${MUTED}"))[${inline(item.note, sources)}]` : ""}]`,
    )
    .join(",\n  ");
  return `#block(breakable: false)[
  #table(
    columns: (1fr, 1.3fr),
    inset: 6pt,
    stroke: 0.4pt + rgb("${RULE}"),
    table.header([#text(size: 8pt, fill: rgb("${VERMILION}"))[常见误解]], [#text(size: 8pt, fill: rgb("${JADE}"))[更准确的说法]]),
    ${rows},
  )
]
#v(4pt)
`;
}

function renderFurtherReading(block: Extract<ReportBlock, { type: "furtherReading" }>, sources: Source[]): string {
  const items = block.items
    .map(
      (item) =>
        `[#text(size: 10pt)[*${esc(item.title)}*]${item.author ? ` #linebreak() #text(size: 8pt, fill: rgb("${MUTED}"))[${esc(item.author)}]` : ""} #linebreak() #text(size: 9pt, fill: rgb("${INK_SOFT}"))[${inline(item.why, sources)}]${item.url ? ` #linebreak() ${safeLink(item.url, "打开")}` : ""}]`,
    )
    .join(",\n  ");
  return `#block(
  width: 100%,
  fill: rgb("${PAPER_RAISED}"),
  stroke: 0.5pt + rgb("${RULE}"),
  inset: 12pt,
  above: 12pt,
  below: 12pt,
)[
  #text(size: 8pt, fill: rgb("${VERMILION}"), tracking: 0.8pt)[继续阅读]
  #v(5pt)
  #list(
    ${items},
  )
]
`;
}

function renderScenario(block: Extract<ReportBlock, { type: "scenario" }>, sources: Source[]): string {
  const items = block.items
    .map(
      (item, index) =>
        `block(
  width: 100%,
  fill: rgb("${PAPER_RAISED}"),
  stroke: 0.5pt + rgb("${RULE}"),
  inset: 10pt,
)[
  #text(size: 8pt, fill: rgb("${MUTED}"), tracking: 0.8pt)[剧本 ${String(index + 1).padStart(2, "0")}]
  #v(4pt)
  #text(size: 12pt, font: "Noto Sans SC")[${esc(item.name)}]
  #v(4pt)
  #text(size: 9.5pt, )[${inline(item.text, sources)}]
  #v(6pt)
  #text(size: 8pt, fill: rgb("${VERMILION}"))[观察信号]
  #linebreak()
  #text(size: 8.5pt, fill: rgb("${MUTED}"))[${inline(item.signal, sources)}]
]`,
    )
    .join(",\n  ");
  return `#grid(
  columns: ${block.items.length},
  gutter: 8pt,
  ${items},
)
`;
}

function renderFigure(figure: ReportFigure, sources: Source[]): string {
  let body = "";
  if (figure.type === "timeline") {
    const rows = (figure.data.events ?? [])
      .map(
        (event) =>
          `[#text(size: 8pt, fill: rgb("${MUTED}"))[${esc(event.date)}]], [#block(stroke: (left: 0.6pt + rgb("${RULE}")), inset: (left: 8pt))[#text(fill: rgb("${VERMILION}"))[●] #text(size: 9.5pt)[${inline(event.title, sources)}]${event.detail ? ` #linebreak() #text(size: 8.5pt, fill: rgb("${MUTED}"))[${inline(event.detail, sources)}]` : ""}]]`,
      )
      .join(",\n  ");
    body = `grid(columns: (62pt, 1fr), row-gutter: 6pt, align: (left + top, left + top), ${rows})`;
  } else if (figure.type === "conceptMap") {
    const nodes = figure.data.nodes ?? [];
    const rows = [
      `[#text(size: 9pt)[*${esc(figure.data.center ?? "中心")}*]], [—], [#text(size: 9pt, fill: rgb("${MUTED}"))[概念中心]]`,
      ...nodes.map(
        (node) => `[${esc(node.label)}], [${esc(node.relation)}], [#text(size: 8.5pt, fill: rgb("${MUTED}"))[与中心的连接]]`,
      ),
    ].join(",\n  ");
    body = `table(
  columns: (0.9fr, 1fr, 1.1fr),
  inset: 5pt,
  stroke: 0.3pt + rgb("${RULE}"),
  table.header([#text(size: 8pt, fill: rgb("${MUTED}"))[节点]], [#text(size: 8pt, fill: rgb("${MUTED}"))[关系]], [#text(size: 8pt, fill: rgb("${MUTED}"))[说明]]),
  ${rows},
)`;
  } else {
    body = renderTable(figure.data.columns ?? ["视角", "说明"], figure.data.rows?.map((row) => [row.label, ...row.values]) ?? [], sources).replace(/^#/, "");
  }

  return `#block(breakable: false)[
  #figure(
    ${body},
    caption: [${esc(figure.title)}。${esc(figure.caption)}],
  )
]
#v(4pt)
`;
}

function renderBlock(block: ReportBlock, sources: Source[], figures: ReportFigure[]): string {
  if (block.type === "p") {
    return `#par[${inline(block.text, sources)}]\n`;
  }
  if (block.type === "h3") {
    return `#heading(level: 2, outlined: true)[${inline(block.text, sources)}]\n`;
  }
  if (block.type === "callout") return renderCallout(block, sources);
  if (block.type === "list") {
    const fn = block.ordered ? "enum" : "list";
    return `#${fn}(\n${block.items.map((item) => `  [${inline(item, sources)}],`).join("\n")}\n)\n`;
  }
  if (block.type === "quote") {
    return `#block(
  width: 100%,
  stroke: (left: 2pt + rgb("${VERMILION}")),
  inset: (left: 12pt),
  above: 8pt,
  below: 8pt,
)[
  #text(size: 11.5pt, )[“${inline(block.text, sources)}”]
  ${block.attribution ? `\n  #v(2pt)\n  #text(size: 8pt, fill: rgb("${MUTED}"))[—— ${esc(block.attribution)}]` : ""}
]
`;
  }
  if (block.type === "table") {
    return `${renderTable(block.headers, block.rows, sources)}\n${block.caption ? `#text(size: 8pt, fill: rgb("${MUTED}"))[${inline(block.caption, sources)}]\n` : ""}`;
  }
  if (block.type === "figure") {
    const figure = figures.find((item) => item.id === block.figureId);
    return figure ? renderFigure(figure, sources) : "";
  }
  if (block.type === "keyline") {
    return `#block(
  width: 100%,
  stroke: (top: 1pt + rgb("${INK}"), bottom: 1pt + rgb("${INK}")),
  inset: (y: 12pt),
  above: 12pt,
  below: 12pt,
)[#align(center)[#text(size: 15pt, )[${inline(block.text, sources)}]]]
`;
  }
  if (block.type === "steps") return renderSteps(block, sources);
  if (block.type === "judgment") return renderJudgment(block, sources);
  if (block.type === "mythFact") return renderMythFact(block, sources);
  if (block.type === "furtherReading") return renderFurtherReading(block, sources);
  if (block.type === "scenario") return renderScenario(block, sources);
  return "";
}

function renderSection(section: ReportSection, report: ReportDoc): string {
  const accents: Record<SectionRole, string> = {
    hook: VERMILION,
    definition: INK,
    origin: VERMILION,
    mechanism: BLUE,
    landscape: GOLD,
    intersection: JADE,
    debate: VERMILION,
    future: BLUE,
    bottom: INK,
    credibility: MUTED,
    other: VERMILION,
  };
  const accent = accents[section.role ?? "other"] ?? VERMILION;
  const header = `#line(length: 100%, stroke: 1pt + rgb("${accent}"))
#v(4pt)
#text(size: 8pt, fill: rgb("${accent}"), tracking: 1pt, font: "Noto Sans SC")[${esc(section.kicker)}]
#v(12pt)
#heading(level: 1, outlined: true)[${esc(section.number)} / ${esc(section.title)}]
${section.takeaway ? `#v(2pt)\n#text(size: 9pt, fill: rgb("${MUTED}"))[读完带走：${inline(section.takeaway, report.sources)}]\n` : ""}
`;
  const [first, ...rest] = section.blocks;
  const firstMarkup = first ? renderBlock(first, report.sources, report.figures) : "";
  const restMarkup = rest.map((block) => renderBlock(block, report.sources, report.figures)).join("\n");
  if (!firstMarkup) return `${header}\n${restMarkup}\n`;
  return `#block(breakable: false)[
${header}
#v(6pt)
${firstMarkup}
]
${restMarkup}
`;
}

function renderDebates(debates: Debate[], sources: Source[]): string {
  if (debates.length === 0) return "";
  const sides = debates
    .map((debate, index) => {
      const side = (label: string, thesis: string, points: { text: string }[], wash: string, color: string, mark: string) => `block(
  width: 100%,
  fill: rgb("${wash}"),
  inset: 10pt,
  radius: 2pt,
)[
  #text(size: 8pt, fill: rgb("${color}"), tracking: 0.8pt)[${esc(label)}]
  #v(3pt)
  #text(size: 10pt, )[*${esc(thesis)}*]
  #v(3pt)
  #list(${points.map((point) => `[${inline(point.text, sources)}]`).join(", ")})
]`;
      return `#text(size: 8pt, fill: rgb("${VERMILION}"))[争议 ${String(index + 1).padStart(2, "0")}]
#heading(level: 2, outlined: false)[${esc(debate.question)}]
#grid(
  columns: (1fr, 1fr),
  gutter: 10pt,
  ${side(debate.pro.label || "支持方", debate.pro.thesis, debate.pro.points, JADE_WASH, JADE, "支持")},
  ${side(debate.contra.label || "反方", debate.contra.thesis, debate.contra.points, VERMILION_WASH, VERMILION, "反对")},
)
#block(
  width: 100%,
  fill: rgb("${PAPER_RAISED}"),
  stroke: 0.5pt + rgb("${INK}"),
  inset: 10pt,
  above: 10pt,
  below: 12pt,
)[
  #text(size: 8pt, fill: rgb("${VERMILION}"), tracking: 0.8pt)[目前的判断 · 置信度 ${CONFIDENCE[debate.confidence]}]
  #v(3pt)
  #text(size: 10pt, )[${inline(debate.verdict, sources)}]
  ${debate.changeMyMind ? `\n  #v(4pt)\n  #text(size: 8.5pt, fill: rgb("${MUTED}"))[什么会改变这个判断：${inline(debate.changeMyMind, sources)}]` : ""}
]`;
    })
    .join("\n#v(14pt)\n");

  return `#pagebreak()
#line(length: 100%, stroke: 1pt + rgb("${INK}"))
#v(4pt)
#text(size: 8pt, fill: rgb("${VERMILION}"), tracking: 1pt)[把最强反方放在台面上]
#v(12pt)
#heading(level: 1, outlined: true)[争议场]
#v(5pt)
${sides}
`;
}

function renderSources(report: ReportDoc): string {
  const items = report.sources
    .map((source, index) => {
      let host = source.url;
      try {
        host = new URL(source.url).hostname.replace(/^www\./, "");
      } catch {
        // Keep the raw URL.
      }
      return `#block(above: 6pt, below: 6pt)[
  #grid(
    columns: (24pt, 1fr),
    gutter: 6pt,
    [#text(size: 8pt, fill: rgb("${VERMILION}"))[${String(index + 1).padStart(2, "0")}]],
    [
      #text(size: 9.5pt)[${esc(source.title)}]
      #linebreak()
      #text(size: 7.5pt, fill: rgb("${MUTED}"))[${esc(TYPE_LABELS[source.type] ?? source.type)} · ${esc(sourceGradeLabel(source))} · ${esc(source.site)} · ${esc(source.publishedAt ?? "日期未知")}]
      #linebreak()
      #text(size: 7.5pt, fill: rgb("${MUTED}"))[${safeLink(source.url, "打开原文")} · ${esc(host)}]
    ],
  )
]`;
    })
    .join("\n");

  return `#pagebreak()
#line(length: 100%, stroke: 1pt + rgb("${INK}"))
#v(4pt)
#text(size: 8pt, fill: rgb("${VERMILION}"), tracking: 1pt)[Sources · ${report.sources.length}]
#v(12pt)
#heading(level: 1, outlined: true)[来源清单]
#v(5pt)
${items}
`;
}

function renderCredibility(report: ReportDoc): string {
  const credibility =
    report.credibility ??
    deriveCredibility({
      sources: report.sources,
      debates: report.debates,
      gaps: report.limitations,
      limitations: report.limitations,
      qa: report.qa,
      completedAt: report.meta.completedAt,
    });
  const rows = credibility.signals.map((signal) => {
    const color = signal.level === "strong" ? JADE : signal.level === "fair" ? GOLD : VERMILION;
    return `[${esc(signal.label)}], [#text(fill: rgb("${color}"))[${trustLevelLabel(signal.level)}]], [${esc(signal.note)}]`;
  });
  return `#pagebreak()
#line(length: 100%, stroke: 1pt + rgb("${INK}"))
#v(4pt)
#text(size: 8pt, fill: rgb("${VERMILION}"), tracking: 1pt)[Credibility · 5 signals]
#v(12pt)
#heading(level: 1, outlined: true)[可信度说明]
#v(5pt)
#par[${esc(credibility.summary)}]
#v(4pt)
#table(
  columns: (1.1fr, 0.55fr, 2.2fr),
  inset: 5pt,
  stroke: none,
  align: (left, left, left),
  table.header([#text(size: 8pt, fill: rgb("${MUTED}"))[信号]], [#text(size: 8pt, fill: rgb("${MUTED}"))[状态]], [#text(size: 8pt, fill: rgb("${MUTED}"))[怎么看]]),
  table.hline(stroke: 0.6pt + rgb("${INK}")),
  ${rows.join(",\n  ")},
  table.hline(stroke: 0.4pt + rgb("${RULE}")),
)
`;
}

function renderCover(report: ReportDoc): string {
  const tags = report.tags.slice(0, 4).join(" · ");
  const isBook = report.objectKind === "book" || report.objectKind === "work";
  const styleLabel = report.reading?.style === "detective" ? "侦探" : report.reading?.style === "light" ? "轻读" : "讲透";
  const credibility =
    report.credibility ??
    deriveCredibility({
      sources: report.sources,
      debates: report.debates,
      gaps: report.limitations,
      limitations: report.limitations,
      qa: report.qa,
      completedAt: report.meta.completedAt,
    });
  const bookMeta = isBook && report.subject
    ? `#v(0.18cm)\n  #text(size: 10pt, fill: rgb("${MUTED}"))[${esc(report.subject.author ?? "")}${report.subject.year ? ` · ${esc(report.subject.year)}` : ""}]`
    : "";
  const titleParts =
    Array.from(report.title).length >= 20 && report.title.includes("：")
      ? [report.title.slice(0, report.title.indexOf("：") + 1), report.title.slice(report.title.indexOf("：") + 1)]
      : [report.title];
  const titleMarkup =
    titleParts.length > 1
      ? `#text(size: 29pt, font: "Noto Sans SC")[${esc(titleParts[0])}]
#linebreak()
#text(size: 29pt, font: "Noto Sans SC")[${esc(titleParts[1])}]`
      : `#text(size: 29pt, font: "Noto Sans SC")[${esc(titleParts[0])}]`;
  return `#page(header: none, footer: none)[
  #set text(size: 10.5pt, fill: rgb("${INK}"))
  #v(0.4cm)
  #grid(
    columns: (1fr, auto),
    [#text(size: 8pt, fill: rgb("${VERMILION}"), tracking: 1pt)[问底 / ${isBook ? "读书报告" : "REPORT"} · ${styleLabel} · ${report.sample ? "SAMPLE" : "NEW"}]],
    [#text(size: 8pt, fill: rgb("${MUTED}"), tracking: 0.6pt)[${esc(formatDate(report.meta.completedAt))}]],
  )
  #v(2.6cm)
  #text(size: 8.5pt, fill: rgb("${VERMILION}"), tracking: 1.2pt)[${esc(tags)}]
  #v(0.5cm)
  #block[
    #set par(leading: 1.15em)
    ${titleMarkup}
  ]
  #v(0.5cm)
  #text(size: 13pt, fill: rgb("${MUTED}"))[${esc(report.subtitle)}]
  ${bookMeta}
  #v(1.1cm)
  #line(length: 100%, stroke: 1pt + rgb("${INK}"))
  #v(0.45cm)
  #text(size: 11.5pt, )[${esc(report.oneLiner)}]
  #v(3.2cm)
  #grid(
    columns: (1fr, 1fr, 1fr),
    [#text(size: 8pt, fill: rgb("${MUTED}"))[阅读] #linebreak() #text(size: 11pt)[${report.meta.readingMinutes} 分钟]],
    [#text(size: 8pt, fill: rgb("${MUTED}"))[来源] #linebreak() #text(size: 11pt)[${report.sources.length} 个]],
    [#text(size: 8pt, fill: rgb("${MUTED}"))[可信度] #linebreak() #text(size: 11pt)[${trustLevelLabel(credibility.level)}]],
  )
  #v(0.35cm)
  #line(length: 100%, stroke: 0.4pt + rgb("${RULE}"))
  #v(0.25cm)
  #text(size: 8pt, fill: rgb("${MUTED}"))[问底 · 把好奇心走到底 / 浏览器内 Typst 排版]
]
`;
}

export function renderTypst(report: ReportDoc): string {
  const headerTitle = report.title.slice(0, 34);
  const contentSections = report.sections;
  const debateAfter = contentSections.findIndex(
    (section) => section.role === "debate" || section.id === "s5" || section.title.includes("争议"),
  );
  const debateIndex = debateAfter >= 0 ? debateAfter : Math.min(4, contentSections.length - 2);
  let body = "";

  contentSections.forEach((section, index) => {
    if (index > 0) body += "#v(20pt)\n";
    body += renderSection(section, report);
    if (index === debateIndex && report.debates.length > 0) body += renderDebates(report.debates, report.sources);
  });
  if (report.debates.length > 0 && debateIndex < 0) body += renderDebates(report.debates, report.sources);

  return `#set page(
  paper: "a4",
  margin: (x: 2.2cm, y: 2.2cm),
)
#set text(font: "Noto Serif SC", size: 10.5pt, fill: rgb("${INK}"), lang: "zh", region: "cn")
#set par(justify: true, leading: 1.7em, spacing: 1.1em)
#set heading(numbering: none)
#set list(indent: 1.2em, body-indent: 0.6em, spacing: 0.45em)
#set enum(indent: 1.2em, body-indent: 0.6em, spacing: 0.45em)
#set figure(gap: 8pt)
#show heading: set text(font: "Noto Sans SC")
#show heading.where(level: 1): it => {
  block(above: 0pt, below: 10pt)[
    #text(size: 18pt, fill: rgb("${INK}"))[#it.body]
  ]
}
#show heading.where(level: 2): it => {
  block(above: 10pt, below: 4pt)[
    #text(fill: rgb("${VERMILION}"))[■]
    #h(4pt)
    #text(size: 11.5pt, fill: rgb("${INK}"))[#it.body]
  ]
}
#show link: set text(fill: rgb("${VERMILION}"))

${renderCover(report)}
#set page(
  paper: "a4",
  margin: (x: 2.2cm, y: 2.2cm),
  header: context {
    set text(size: 8pt, fill: rgb("${MUTED}"))
    grid(columns: (1fr, auto), [问底 · 把好奇心走到底], [${esc(headerTitle)}])
    v(-5pt)
    line(length: 100%, stroke: 0.3pt + rgb("${RULE}"))
  },
  footer: context {
    set text(size: 8pt, fill: rgb("${MUTED}"))
    align(center)[#counter(page).display("1 / 1")]
  },
)
#heading(level: 1, outlined: false)[目录]
#outline(title: none, indent: auto, depth: 2)
#v(8pt)
#text(size: 8pt, fill: rgb("${MUTED}"))[本篇读物由问底流程生成。带编号的上标指向来源清单；争议场保留最强反方，而不是稻草人。]
#pagebreak()
${body}
${renderCredibility(report)}
${renderSources(report)}
`;
}
