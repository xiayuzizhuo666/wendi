import type { ReactNode } from "react";
import type { Source } from "@/types";
import { sourceNumber } from "@/lib/format";

const TOKEN = /\[\[(s\d+)\]\]|\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;

interface RichTextProps {
  text: string;
  sources: Source[];
  onCite?: (sourceId: string) => void;
}

export function RichText({ text, sources, onCite }: RichTextProps) {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  for (const match of text.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push(text.slice(cursor, index));
    const [raw, citation, bold, code, linkLabel, linkHref] = match;

    if (citation) {
      const number = sourceNumber(sources, citation);
      nodes.push(
        <button
          key={`c-${key++}`}
          type="button"
          onClick={() => onCite?.(citation)}
          className="mx-0.5 inline-flex -translate-y-1 items-center rounded-sm border border-rule px-1 font-mono text-[9px] leading-[1.5] text-ink-muted transition-colors hover:border-vermilion hover:bg-vermilion-wash hover:text-vermilion-deep"
          aria-label={`查看来源 ${number || "未知"}`}
          title={`查看来源 ${number || "未知"}`}
        >
          {number || "?"}
        </button>,
      );
    } else if (bold) {
      nodes.push(
        <strong key={`b-${key++}`} className="font-semibold text-ink">
          {bold}
        </strong>,
      );
    } else if (code) {
      nodes.push(
        <code key={`m-${key++}`} className="rounded-sm bg-paper-deep px-1 py-0.5 font-mono text-[0.88em] text-ink">
          {code}
        </code>,
      );
    } else if (linkLabel && linkHref) {
      nodes.push(
        <a
          key={`a-${key++}`}
          href={linkHref}
          target="_blank"
          rel="noreferrer noopener"
          className="text-vermilion-deep underline decoration-vermilion/40 underline-offset-2 hover:decoration-vermilion"
        >
          {linkLabel}
        </a>,
      );
    } else {
      nodes.push(raw);
    }
    cursor = index + raw.length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <>{nodes}</>;
}
