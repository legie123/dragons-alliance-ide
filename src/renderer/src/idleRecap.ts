import { useEffect, useRef, useState, type RefObject } from "react";
import type { Terminal } from "@xterm/xterm";
import { fetchAgentHealth, type TermSession } from "./api";

export const IDLE_MS = 120_000;

export type RecapView = {
  session: string;
  status: string;
  context: string;
  reason?: string;
  understanding?: number;
  lastAction: string;
  next?: string;
  unavailable?: boolean;
};

const NEXT_BY_STATUS: Record<string, string | undefined> = {
  error: "check the error above",
  stalled: "check whether the agent got stuck",
  done: "review the result",
  working: undefined,
  idle: undefined,
  running: undefined,
  unknown: undefined,
};

function lastBufferLine(xt: Terminal | null): string {
  if (!xt) return "";
  const buf = xt.buffer.active;
  const floor = Math.max(0, buf.length - 50);
  for (let i = buf.length - 1; i >= floor; i--) {
    const line = buf.getLine(i)?.translateToString(true).trim();
    if (line) return line.slice(0, 160);
  }
  return "";
}

/** Shows a recap once per idle cycle (2min, unfocused) for a terminal pane.
 *  Claude terminals: one on-demand agentHealth(file) fetch per cycle — model/
 *  ctx/understanding are already in `sess` from the existing 3s poll, reused
 *  here with zero extra cost. Shell terminals: pure client-side, reads the
 *  xterm scrollback buffer, no IPC call. The result is only applied if the pane
 *  is STILL idle+unfocused when the fetch resolves, so a refocus / keystroke
 *  mid-flight discards a stale card (no ~1s flash). */
export function useIdleRecap(opts: {
  cmd: string;
  focused: boolean;
  sess: TermSession;
  exitedRef: RefObject<boolean>;
  xtermRef: RefObject<Terminal | null>;
  lastActivityRef: RefObject<number>;
}): RecapView | null {
  const { cmd, focused, sess, exitedRef, xtermRef, lastActivityRef } = opts;
  const [recap, setRecap] = useState<RecapView | null>(null);
  const shownRef = useRef(false);
  const fetchingRef = useRef(false);
  const sessRef = useRef(sess);
  useEffect(() => { sessRef.current = sess; }, [sess]);
  const focusedRef = useRef(focused);
  useEffect(() => { focusedRef.current = focused; }, [focused]);

  useEffect(() => {
    let disposed = false;
    // Still eligible to SHOW a recap once the async fetch returns: pane still
    // unfocused, still idle past the threshold, and no new activity since the
    // fetch started. Re-checked after any await so mid-flight refocus/typing
    // discards a stale result instead of flashing it.
    const eligible = (startActivity: number) =>
      !disposed &&
      !focusedRef.current &&
      Date.now() - lastActivityRef.current >= IDLE_MS &&
      lastActivityRef.current === startActivity;

    const tick = async () => {
      if (focusedRef.current) {
        if (shownRef.current) { setRecap(null); shownRef.current = false; }
        return;
      }
      const idleFor = Date.now() - lastActivityRef.current;
      if (idleFor < IDLE_MS) {
        if (shownRef.current) { setRecap(null); shownRef.current = false; }
        return;
      }
      if (shownRef.current || fetchingRef.current) return;
      fetchingRef.current = true;
      const startActivity = lastActivityRef.current;
      try {
        let view: RecapView;
        if (cmd === "claude") {
          const s = sessRef.current;
          if (!s?.file) {
            view = { session: "claude", status: "unknown", context: "", lastAction: "", unavailable: true };
          } else {
            const h = await fetchAgentHealth(s.file);
            const status = h.status === "working" ? "running" : h.status;
            view = {
              session: "claude",
              status,
              context: s.ambiguous ? "· ambiguous (2+ sessions share this folder)" : "",
              reason: h.lastThinking,
              understanding: s.understanding,
              lastAction: h.lastAction || "",
              next: NEXT_BY_STATUS[h.status],
            };
          }
        } else {
          const line = lastBufferLine(xtermRef.current);
          const shellStatus = exitedRef.current ? "done" : "running";
          view = {
            session: "shell",
            status: shellStatus,
            context: "",
            lastAction: line,
            next: NEXT_BY_STATUS[shellStatus],
            unavailable: !line,
          };
        }
        if (eligible(startActivity)) { setRecap(view); shownRef.current = true; }
        else shownRef.current = false;
      } catch {
        if (eligible(startActivity)) {
          setRecap({ session: cmd, status: "unknown", context: "", lastAction: "", unavailable: true });
          shownRef.current = true;
        } else {
          shownRef.current = false;
        }
      } finally {
        fetchingRef.current = false;
      }
    };
    const id = setInterval(tick, 1000);
    return () => { disposed = true; clearInterval(id); };
  }, [cmd, xtermRef, lastActivityRef, exitedRef]);

  return recap;
}
