import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { fetchTranscript, TranscriptEvent } from "../api";

// Live feed of an agent's *thinking* blocks — the real "what is it reasoning about
// right now". Falls back to assistant text when the agent emits no thinking, so the
// panel is never dead when a session is streaming.
export function ReasoningStream({ file, title }: { file: string | null; title?: string }) {
  const { data } = useQuery({
    queryKey: ["reasoning", file],
    queryFn: () => fetchTranscript(file!, 60),
    enabled: !!file,
    refetchInterval: 1500,
  });

  const events = data?.events ?? [];
  const thinking = events.filter((e) => e.kind === "thinking" && e.text);
  const lines: TranscriptEvent[] =
    thinking.length > 0
      ? thinking
      : events.filter((e) => e.role === "assistant" && e.kind === "text" && e.text);

  const feedRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length, file]);

  return (
    <div className="reason-stream">
      <div className="reason-head">
        <span className="livedot" />
        LIVE REASONING
        {title ? <span className="reason-title">{title}</span> : null}
      </div>
      <div className="reason-feed" ref={feedRef}>
        {!file ? (
          <div className="empty">select an agent</div>
        ) : lines.length === 0 ? (
          <div className="empty">no reasoning captured (agent may not emit thinking)</div>
        ) : (
          <AnimatePresence initial={false}>
            {lines.map((e, i) => (
              <motion.div
                key={`${e.ts}-${i}`}
                className="reason-line"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
              >
                {e.text}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
