// Dragons Alliance IDE — agent health (Electron main process).
//
// Reads the live .jsonl transcript of a Claude agent and derives goal attainment
// + detected problems, so the Agents cockpit can show a health badge and (via
// Autopilot) auto-nudge a stuck agent's terminal. Pure main-process module —
// node builtins only. Heuristic, not ground truth (best-effort transcript read).
//
// Transcript shape (see sessions.ts): records of type "user"/"assistant".
//   - assistant.message.content[] holds tool_use{id,name,input} blocks.
//   - a tool_result comes back as a "user" record whose content[] carries
//     {type:"tool_result", tool_use_id, is_error?, content} blocks.

import * as fs from "node:fs";

import type { AgentHealth, AgentProblem } from "../shared/ipc.js";

const STALL_MS = 5 * 60 * 1000; // no activity for >5 min → stalled
const FRESH_ERROR_MS = 2 * 60 * 1000; // an error younger than this makes status "error"
const WORKING_MS = 60 * 1000; // last activity within 60s → actively working
const MAX_PROBLEMS = 8;

type ToolUse = { name: string; input: any; ts: number };

/** Tail-read the final ~512KB of a transcript, dropping the partial leading line.
 *  Same idea as getTranscript in sessions.ts, kept deliberately simple. */
function tailRead(file: string): { text: string; mtimeMs: number } {
  const st = fs.statSync(file);
  const size = st.size;
  const window = 512 * 1024;
  const offset = Math.max(0, size - window);
  const len = size - offset;
  const fd = fs.openSync(file, "r");
  let text = "";
  try {
    const buf = Buffer.allocUnsafe(len);
    fs.readSync(fd, buf, 0, len, offset);
    text = buf.toString("utf8");
    if (offset > 0) {
      // drop the (almost certainly) partial first line
      const nl = text.indexOf("\n");
      text = nl >= 0 ? text.slice(nl + 1) : "";
    }
  } finally {
    fs.closeSync(fd);
  }
  return { text, mtimeMs: st.mtimeMs };
}

/** Flatten a tool_result block's content to plain text. */
function resultText(block: any): string {
  const c = block?.content;
  if (typeof c === "string") return c;
  if (Array.isArray(c)) {
    return c
      .filter((x: any) => x && typeof x === "object" && x.type === "text")
      .map((x: any) => x.text || "")
      .join("\n");
  }
  return "";
}

export function agentHealth(file: string): AgentHealth {
  try {
    const { text, mtimeMs } = tailRead(file);

    const toolUses = new Map<string, ToolUse>(); // id → tool_use
    let toolCount = 0;
    let errorCount = 0;
    let lastTodos: any[] | null = null;
    let lastActivityMs = 0;
    let cwdFull = "";
    // raw problems in chronological order; { kind, detail, ts, sig }
    const raw: (AgentProblem & { sig: string })[] = [];

    for (const rawLine of text.split("\n")) {
      const line = rawLine.trim();
      if (!line) continue;
      if (line.length > 200_000) continue; // skip pathological (base64 attachment) lines
      let d: any;
      try {
        d = JSON.parse(line);
      } catch {
        continue;
      }
      const ts = Date.parse(d.timestamp) || 0;
      if (ts) lastActivityMs = ts;

      if (d.type === "assistant") {
        cwdFull = d.cwd || cwdFull;
        const cont = d.message?.content;
        if (!Array.isArray(cont)) continue;
        for (const b of cont) {
          if (!b || typeof b !== "object" || b.type !== "tool_use") continue;
          toolCount += 1;
          if (b.id) toolUses.set(b.id, { name: b.name, input: b.input || {}, ts });
          if (b.name === "TodoWrite" && Array.isArray(b.input?.todos)) {
            lastTodos = b.input.todos;
          }
        }
      } else if (d.type === "user") {
        const cont = d.message?.content ?? d.content;
        if (!Array.isArray(cont)) continue;
        for (const b of cont) {
          if (!b || typeof b !== "object" || b.type !== "tool_result") continue;
          if (b.is_error !== true) continue;
          errorCount += 1;
          const src = b.tool_use_id ? toolUses.get(b.tool_use_id) : undefined;
          if (src && src.name === "Bash") {
            const cmd = String(src.input?.command ?? "").slice(0, 120);
            raw.push({ kind: "bash-fail", detail: cmd || "bash command failed", ts, sig: "Bash" });
          } else {
            const detail = resultText(b).slice(0, 120) || "tool error";
            raw.push({ kind: "tool-error", detail, ts, sig: src?.name || "tool" });
          }
        }
      }
    }

    // mtime reflects the REAL last write; fold it in unconditionally so a huge/
    // unparseable tail line (e.g. a base64 image tool_result) can't make a
    // seconds-fresh agent look stalled.
    lastActivityMs = Math.max(lastActivityMs, mtimeMs);
    const now = Date.now();
    const stalled = now - lastActivityMs > STALL_MS;

    // --- goalPct ---
    // Only TodoWrite completion means "done". The no-todos fallback is a
    // tool-SUCCESS ratio (did tools error), NOT goal completion — it must never
    // reach 100/"done", else a mid-task agent running clean tools looks finished
    // and Autopilot stops watching it. Cap it at 95.
    let goalPct: number;
    let todosDone = false;
    if (lastTodos && lastTodos.length) {
      const total = lastTodos.length;
      const completed = lastTodos.filter((t: any) => t?.status === "completed").length;
      goalPct = (completed / total) * 100;
      todosDone = completed === total;
    } else if (toolCount > 0) {
      goalPct = Math.min(95, ((toolCount - errorCount) / toolCount) * 100);
    } else {
      goalPct = 0;
    }
    goalPct = Math.max(0, Math.min(100, goalPct));

    // --- problems (collapse repeated tool errors, newest first, cap MAX_PROBLEMS) ---
    const sigCount = new Map<string, number>();
    for (const p of raw) sigCount.set(p.sig, (sigCount.get(p.sig) || 0) + 1);

    const problems: AgentProblem[] = [];
    const collapsed = new Set<string>();
    for (let i = raw.length - 1; i >= 0; i--) {
      const p = raw[i];
      if ((sigCount.get(p.sig) || 0) >= 2) {
        if (collapsed.has(p.sig)) continue; // already represented once
        collapsed.add(p.sig);
        problems.push({
          kind: "repeat-error",
          detail: `${p.sig} failed ${sigCount.get(p.sig)}×: ${p.detail}`,
          ts: p.ts,
        });
      } else {
        problems.push({ kind: p.kind, detail: p.detail, ts: p.ts });
      }
      if (problems.length >= MAX_PROBLEMS) break;
    }
    if (stalled) problems.unshift({ kind: "stall", detail: "no activity > 5 min", ts: lastActivityMs });

    // --- status ---
    const hasFreshError = problems.some(
      (p) =>
        (p.kind === "tool-error" || p.kind === "bash-fail" || p.kind === "repeat-error") &&
        now - p.ts < FRESH_ERROR_MS,
    );
    let status: AgentHealth["status"];
    if (todosDone) status = "done"; // completion is a TodoWrite signal only
    else if (hasFreshError) status = "error";
    else if (stalled) status = "stalled";
    else if (now - lastActivityMs < WORKING_MS) status = "working";
    else status = "idle";

    return { goalPct, status, problems: problems.slice(0, MAX_PROBLEMS), lastActivityMs, cwd_full: cwdFull };
  } catch {
    return { goalPct: 0, status: "idle", problems: [], lastActivityMs: 0 };
  }
}
