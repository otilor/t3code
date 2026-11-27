import { describe, expect, it } from "vite-plus/test";

import { buildMarkdownOutline, plainHeadingText } from "./markdownOutline";

const chunk = (text: string) => ({ text, lines: text.split("\n").length });
const headings = (...texts: string[]) =>
  buildMarkdownOutline(texts.map(chunk)).map(({ level, text, chunkIndex, occurrence }) => [
    level,
    text,
    chunkIndex,
    occurrence,
  ]);

describe("buildMarkdownOutline", () => {
  it("lists ATX headings with their chunk", () => {
    expect(headings("# Title\n\nText\n\n## Part ##", "### Deep")).toEqual([
      [1, "Title", 0, 0],
      [2, "Part", 0, 0],
      [3, "Deep", 1, 0],
    ]);
  });

  it("counts repeated heading text within a chunk", () => {
    expect(headings("## Notes\n\n## Notes", "## Notes")).toEqual([
      [2, "Notes", 0, 0],
      [2, "Notes", 0, 1],
      [2, "Notes", 1, 0],
    ]);
  });

  it("skips headings inside fences, even across chunks", () => {
    expect(headings("```md\n# Not a heading", "## Still code\n```\n# Real")).toEqual([
      [1, "Real", 1, 0],
    ]);
  });

  it("does not open a fence on inline code that only looks like one", () => {
    expect(headings("```a``` is inline\n\n# After")).toEqual([[1, "After", 0, 0]]);
  });

  it("keeps a fence open past a line with text after the backticks", () => {
    expect(headings("```\n``` not a close\n# Inside\n```\n# Outside")).toEqual([
      [1, "Outside", 0, 0],
    ]);
  });

  it("reads setext headings, including multi-line ones", () => {
    expect(headings("One\ntwo\n===\n\nSub\n---\n\n---")).toEqual([
      [1, "One two", 0, 0],
      [2, "Sub", 0, 0],
    ]);
  });

  it("ignores front matter, whatever its line endings", () => {
    expect(headings("---\ntitle: x\n---\n# Doc")).toEqual([[1, "Doc", 0, 0]]);
    expect(headings("--- \rtitle: x\r---\r# Doc")).toEqual([[1, "Doc", 0, 0]]);
  });

  it("keeps autolink headings", () => {
    expect(headings("# <https://example.com>\n\n## Next")).toEqual([
      [1, "https://example.com", 0, 0],
      [2, "Next", 0, 0],
    ]);
  });

  it("leaves out headings with no readable text", () => {
    expect(headings("#\n\n## After")).toEqual([[2, "After", 0, 0]]);
  });
});

describe("plainHeadingText", () => {
  it("drops inline syntax", () => {
    expect(plainHeadingText("**Bold** `code` [link](https://x.y) and _em_")).toBe(
      "Bold code link and em",
    );
  });

  it("decodes entities the way the renderer shows them", () => {
    expect(plainHeadingText("Q&amp;A &lt;tags&gt; &#169; &copy; &hellip;")).toBe(
      "Q&A <tags> © © …",
    );
  });

  it("replaces out-of-range numeric references instead of throwing", () => {
    expect(plainHeadingText("Big &#1114112; &#x110000; &#0;")).toBe("Big � � �");
    expect(() => buildMarkdownOutline([chunk("# &#99999999999;")])).not.toThrow();
  });

  it("reads an image as its alt text", () => {
    expect(plainHeadingText("![Diagram](diagram.png) overview")).toBe("Diagram overview");
  });
});
