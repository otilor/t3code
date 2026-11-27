import { describe, expect, it } from "vite-plus/test";

import { buildMarkdownOutline, plainHeadingText } from "./markdownOutline";

const chunk = (text: string) => ({ text, lines: text.split("\n").length });

describe("buildMarkdownOutline", () => {
  it("lists ATX headings with their chunk and ordinal", () => {
    expect(
      buildMarkdownOutline([chunk("# Title\n\nText\n\n## Part ##"), chunk("### Deep")]),
    ).toEqual([
      { level: 1, text: "Title", chunkIndex: 0, ordinal: 0 },
      { level: 2, text: "Part", chunkIndex: 0, ordinal: 1 },
      { level: 3, text: "Deep", chunkIndex: 1, ordinal: 0 },
    ]);
  });

  it("skips headings inside fences, even across chunks", () => {
    expect(
      buildMarkdownOutline([chunk("```md\n# Not a heading"), chunk("## Still code\n```\n# Real")]),
    ).toEqual([{ level: 1, text: "Real", chunkIndex: 1, ordinal: 0 }]);
  });

  it("reads setext headings, including multi-line ones", () => {
    expect(buildMarkdownOutline([chunk("One\ntwo\n===\n\nSub\n---\n\n---")])).toEqual([
      { level: 1, text: "One two", chunkIndex: 0, ordinal: 0 },
      { level: 2, text: "Sub", chunkIndex: 0, ordinal: 1 },
    ]);
  });

  it("ignores front matter", () => {
    expect(buildMarkdownOutline([chunk("---\ntitle: x\n---\n# Doc")])).toEqual([
      { level: 1, text: "Doc", chunkIndex: 0, ordinal: 0 },
    ]);
  });

  it("keeps an empty heading's ordinal so later headings still line up", () => {
    expect(buildMarkdownOutline([chunk("#\n\n## After")])).toEqual([
      { level: 2, text: "After", chunkIndex: 0, ordinal: 1 },
    ]);
  });
});

describe("plainHeadingText", () => {
  it("drops inline syntax", () => {
    expect(plainHeadingText("**Bold** `code` [link](https://x.y) and _em_")).toBe(
      "Bold code link and em",
    );
  });
});
