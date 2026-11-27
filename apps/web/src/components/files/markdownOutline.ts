import type { MarkdownChunk } from "@t3tools/shared/markdownChunks";

export interface MarkdownOutlineEntry {
  readonly level: number;
  readonly text: string;
  /** The chunk that renders this heading. */
  readonly chunkIndex: number;
  /** Which heading of its chunk this is, so it can be found among the rendered h1–h6. */
  readonly ordinal: number;
}

const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})/;
const ATX_HEADING = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const SETEXT_UNDERLINE = /^ {0,3}(=+|-+)[ \t]*$/;
const PARAGRAPH_LINE = /^ {0,3}(?![>#*+\-|]|\d+[.)]\s|`{3}|~{3})\S/;
const FRONTMATTER = /^(?:﻿)?---\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/;

/** Heading text as it reads, without inline Markdown syntax. */
export function plainHeadingText(source: string): string {
  return source
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/!?\[([^\]]*)\]\[[^\]]*\]/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/(\*\*|__|\*|_|~~|`)(.+?)\1/g, "$2")
    .replace(/\\([\\`*_{}[\]()#+\-.!~|<>])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** Lists the ATX and setext headings of each chunk, skipping fenced code and front matter. */
export function buildMarkdownOutline(
  chunks: readonly MarkdownChunk[],
): readonly MarkdownOutlineEntry[] {
  const entries: MarkdownOutlineEntry[] = [];
  let fence: string | null = null;
  for (const [chunkIndex, chunk] of chunks.entries()) {
    let ordinal = 0;
    const text = chunkIndex === 0 ? chunk.text.replace(FRONTMATTER, "") : chunk.text;
    const lines = text.split(/\r\n|\r|\n/);
    /** The open paragraph, which a setext underline turns into a heading. */
    let previous: string | null = null;
    for (const line of lines) {
      if (fence !== null) {
        const close = FENCE_OPEN.exec(line);
        if (close && close[1]![0] === fence[0] && close[1]!.length >= fence.length) fence = null;
        previous = null;
        continue;
      }
      const open = FENCE_OPEN.exec(line);
      if (open) {
        fence = open[1]!;
        previous = null;
        continue;
      }
      const atx = ATX_HEADING.exec(line);
      if (atx) {
        const headingText = plainHeadingText(atx[2] ?? "");
        if (headingText) {
          entries.push({ level: atx[1]!.length, text: headingText, chunkIndex, ordinal });
        }
        // An empty "#" still renders an h1, so it still takes an ordinal.
        ordinal += 1;
        previous = null;
        continue;
      }
      const setext = SETEXT_UNDERLINE.exec(line);
      if (setext && previous !== null) {
        const headingText = plainHeadingText(previous);
        entries.push({
          level: setext[1]![0] === "=" ? 1 : 2,
          text: headingText,
          chunkIndex,
          ordinal,
        });
        ordinal += 1;
        previous = null;
        continue;
      }
      if (!PARAGRAPH_LINE.test(line)) previous = null;
      else previous = previous === null ? line : `${previous} ${line.trim()}`;
    }
  }
  return entries;
}
