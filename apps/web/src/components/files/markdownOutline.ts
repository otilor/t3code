import type { MarkdownChunk } from "@t3tools/shared/markdownChunks";
import { maskMarkdownFrontmatter } from "@t3tools/shared/markdownFrontmatter";

export interface MarkdownOutlineEntry {
  readonly level: number;
  /** The heading as it reads, which is also how it is found among the rendered headings. */
  readonly text: string;
  /** The chunk that renders this heading. */
  readonly chunkIndex: number;
  /** Earlier headings in the same chunk with the same text. */
  readonly occurrence: number;
}

// Same opener rule as the Markdown splitter: a backtick fence's info string has no backtick.
const FENCE_OPEN = /^ {0,3}(`{3,}(?![^`\n]*`)|~{3,})/;
const FENCE_CLOSE = /^ {0,3}(`{3,}|~{3,})[ \t]*$/;
const ATX_HEADING = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const SETEXT_UNDERLINE = /^ {0,3}(=+|-+)[ \t]*$/;
const PARAGRAPH_LINE = /^ {0,3}(?![>#*+\-|]|\d+[.)]\s|`{3}|~{3})\S/;
const AUTOLINK = /<((?:[A-Za-z][A-Za-z0-9+.-]{1,31}:[^\s<>]*)|(?:[^\s<>@]+@[^\s<>@]+))>/g;
const ENTITIES: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/** Heading text as it reads, without inline Markdown syntax. */
export function plainHeadingText(source: string): string {
  return source
    .replace(AUTOLINK, "$1")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/!?\[([^\]]*)\]\[[^\]]*\]/g, "$1")
    .replace(/<\/?[A-Za-z][^>]*>/g, "")
    .replace(/(\*\*|__|\*|_|~~|`)(.+?)\1/g, "$2")
    .replace(/\\([\\`*_{}[\]()#+\-.!~|<>])/g, "$1")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, name: string) => {
      if (name[0] !== "#") return ENTITIES[name.toLowerCase()] ?? match;
      const code =
        name[1] === "x" || name[1] === "X" ? parseInt(name.slice(2), 16) : Number(name.slice(1));
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    })
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
    const seen = new Map<string, number>();
    const push = (level: number, text: string) => {
      if (!text) return;
      const occurrence = seen.get(text) ?? 0;
      seen.set(text, occurrence + 1);
      entries.push({ level, text, chunkIndex, occurrence });
    };
    const text = chunkIndex === 0 ? maskMarkdownFrontmatter(chunk.text) : chunk.text;
    /** The open paragraph, which a setext underline turns into a heading. */
    let previous: string | null = null;
    for (const line of text.split(/\r\n|\r|\n/)) {
      if (fence !== null) {
        const close = FENCE_CLOSE.exec(line);
        if (close && close[1]![0] === fence[0] && close[1]!.length >= fence.length) fence = null;
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
        push(atx[1]!.length, plainHeadingText(atx[2] ?? ""));
        previous = null;
        continue;
      }
      const setext = SETEXT_UNDERLINE.exec(line);
      if (setext && previous !== null) {
        push(setext[1]![0] === "=" ? 1 : 2, plainHeadingText(previous));
        previous = null;
        continue;
      }
      if (!PARAGRAPH_LINE.test(line)) previous = null;
      else previous = previous === null ? line : `${previous} ${line.trim()}`;
    }
  }
  return entries;
}

/** Finds an entry among a chunk's rendered headings by its text, so skipped headings cannot shift it. */
export function findRenderedHeading(
  chunkElement: Element,
  entry: MarkdownOutlineEntry,
): HTMLElement | null {
  let remaining = entry.occurrence;
  for (const heading of chunkElement.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6")) {
    if ((heading.textContent ?? "").replace(/\s+/g, " ").trim() !== entry.text) continue;
    if (remaining === 0) return heading;
    remaining -= 1;
  }
  return null;
}
