import { useGT } from "gt-react";
import { useRef } from "react";

import { cn } from "~/lib/utils";
import type { MarkdownOutlineEntry } from "./markdownOutline";

const DASH_WIDTHS = ["w-4", "w-3", "w-2"] as const;

/**
 * A column of dashes, one per heading, in the top-left corner of a Markdown preview.
 * Hovering it opens the full outline; clicking a heading jumps to it.
 */
export function MarkdownOutlineRail(props: {
  readonly entries: readonly MarkdownOutlineEntry[];
  readonly activeIndex: number;
  readonly onSelect: (index: number) => void;
}) {
  const gt = useGT();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const minLevel = Math.min(...props.entries.map((entry) => entry.level));
  const depthOf = (entry: MarkdownOutlineEntry) => Math.min(entry.level - minLevel, 2);

  const revealActive = () => {
    panelRef.current
      ?.querySelector<HTMLElement>("[data-active]")
      ?.scrollIntoView({ block: "nearest" });
  };

  return (
    <div className="pointer-events-none absolute top-6 left-6 z-10">
      <nav
        aria-label={gt("Outline", { $context: "headings of a document" })}
        className="group pointer-events-auto relative select-none"
        onMouseEnter={revealActive}
        onFocus={revealActive}
      >
        <div
          aria-hidden
          className="flex max-h-[70vh] flex-col items-start gap-2 overflow-hidden rounded-md px-1.5 py-2"
        >
          {props.entries.map((entry, index) => (
            <span
              key={`${entry.chunkIndex}:${entry.ordinal}`}
              className={cn(
                "h-0.5 shrink-0 rounded-full transition-[width,background-color] duration-200 ease-out motion-reduce:transition-none",
                index === props.activeIndex
                  ? "w-5 bg-primary"
                  : cn(DASH_WIDTHS[depthOf(entry)], "bg-muted-foreground/45"),
              )}
            />
          ))}
        </div>
        <div
          ref={panelRef}
          className="invisible absolute top-0 left-0 max-h-[70vh] w-72 origin-top-left scale-95 overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground opacity-0 shadow-lg transition-[opacity,scale,visibility] duration-150 ease-out group-focus-within:visible group-focus-within:scale-100 group-focus-within:opacity-100 group-hover:visible group-hover:scale-100 group-hover:opacity-100 motion-reduce:transition-none"
        >
          {props.entries.map((entry, index) => {
            const active = index === props.activeIndex;
            return (
              <button
                key={`${entry.chunkIndex}:${entry.ordinal}`}
                type="button"
                data-active={active || undefined}
                aria-current={active ? "location" : undefined}
                onClick={(event) => {
                  props.onSelect(index);
                  // Focus inside keeps the panel open; let it close once the pointer leaves.
                  event.currentTarget.blur();
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md py-1 pr-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                  active ? "font-medium text-foreground" : "text-muted-foreground",
                )}
                style={{ paddingLeft: `${0.5 + depthOf(entry) * 0.75}rem` }}
              >
                <span
                  aria-hidden
                  className={cn(
                    "h-0.5 shrink-0 rounded-full",
                    active ? "w-4 bg-primary" : "w-2.5 bg-muted-foreground/45",
                  )}
                />
                <span className="truncate">{entry.text}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
