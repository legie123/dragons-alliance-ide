// Agent live transcript — a scrolling feed of an agent's rendered events,
// polled from its source .jsonl. Part of the Mission-Control cockpit.
import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchTranscript, human } from "../api";
import type { TranscriptEvent } from "@shared/ipc";

const TOOL_ICON: Record<string, string> = {
  Read: "◦", Edit: "✎", Write: "✎", Bash: "⌘",
  Grep: "⌕", Glob: "⌕", TodoWrite: "☑", Task: "⚙", WebFetch: "◍",
};
const toolIcon = (tool?: string): string => (tool && TOOL_ICON[tool]) || "⚒";

// Lightweight inline sparkline from the last ~30 defined token counts.
function Sparkline({ events }: { events: TranscriptEvent[] }) {
  const pts = useMemo(() => {
    const vals = events
      .map((e) => e.tokens)
      .filter((t): t is number => typeof t === "number")
      .slice(-30);
    if (vals.length < 2) return null;
    const max = Math.max(...vals, 1);
    const w = 84;
    const h = 18;
    const step = w / (vals.length - 1);
    return vals
      .map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * h).toFixed(1)}`)
      .join(" ");
  }, [events]);

  if (!pts) return null;
  return (
    <svg className="mc-spark" width={84} height={18} viewBox="0 0 84 18" aria-hidden>
      <polyline
        points={pts}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const FILE_TOOLS = new Set(["Read", "Edit", "Write", "NotebookEdit"]);

function EventRow({ ev, onOpenFile }: { ev: TranscriptEvent; onOpenFile?: (p: string) => void }) {
  const badge =
    typeof ev.tokens === "number" ? (
      <span className="mc-ev-tok">{human(ev.tokens)}</span>
    ) : null;

  if (ev.kind === "prompt") {
    return (
      <div className="mc-ev mc-ev-prompt">
        <span className="mc-ev-pfx">▸ you</span>
        <span className="mc-ev-txt">{ev.text}</span>
        {badge}
      </div>
    );
  }
  if (ev.kind === "tool") {
    // Synergy: a file tool-call's target opens straight in the Code editor —
    // click what the agent touched to jump to it (monitor → edit).
    const openable = !!(onOpenFile && ev.tool && FILE_TOOLS.has(ev.tool) && ev.target?.startsWith("/"));
    return (
      <div className="mc-ev mc-ev-tool">
        <span className="mc-tool-ic">{toolIcon(ev.tool)}</span>
        <b className="mc-ev-toolname">{ev.tool}</b>
        {ev.target && (
          openable ? (
            <span className="mc-ev-target open" title="open in Code" onClick={() => onOpenFile!(ev.target!)}>
              {ev.target} ↗
            </span>
          ) : (
            <span className="mc-ev-target">{ev.target}</span>
          )
        )}
        {badge}
      </div>
    );
  }
  if (ev.kind === "thinking") {
    return (
      <div className="mc-ev mc-ev-thinking">
        <span className="mc-ev-txt">… {ev.text}</span>
      </div>
    );
  }
  // kind === "text"
  return (
    <div className="mc-ev mc-ev-text">
      <span className="mc-ev-txt">{ev.text}</span>
      {badge}
    </div>
  );
}

export function AgentTranscript({ file, title, onOpenFile }: { file: string | null; title?: string; onOpenFile?: (p: string) => void }) {
  const { data } = useQuery({
    queryKey: ["transcript", file],
    queryFn: () => fetchTranscript(file!, 100),
    enabled: !!file,
    refetchInterval: 1500,
  });

  const events = data?.events ?? [];
  const feedRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever new events arrive.
  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [events.length]);

  if (!file) {
    return (
      <div className="mc-transcript mc-transcript-empty">
        <span className="mc-hint">select an agent to watch it live</span>
      </div>
    );
  }

  return (
    <div className="mc-transcript">
      <div className="mc-transcript-head">
        <span className="mc-transcript-title">{title || "transcript"}</span>
        <Sparkline events={events} />
      </div>
      <div className="mc-feed" ref={feedRef}>
        {events.length === 0 ? (
          <div className="mc-hint">no recent activity</div>
        ) : (
          events.map((ev, i) => <EventRow key={`${ev.ts}-${i}`} ev={ev} onOpenFile={onOpenFile} />)
        )}
      </div>
    </div>
  );
}
