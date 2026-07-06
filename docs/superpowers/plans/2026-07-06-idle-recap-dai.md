# Idle Recap (dragons-alliance-ide) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After 2 minutes of no interaction with a terminal pane, show a small muted-gray inline recap (session/status/context/reason/understanding/last action/next) instead of a blank unfocused pane — once per idle cycle, cleared on refocus or new activity. Same mechanism as claude-dashboard's idle-recap (see that repo's plan/spec) — implement second, after claude-dashboard.

**Architecture:** Almost entirely additive on top of existing infra: `agentHealth()` already derives status/goalPct/errors from the transcript, focus/blur tracking already exists on `TerminalPane`, and a 3s poll (`fetchTermSession`) already carries `understanding`/`goalPct` per claude terminal. This plan (1) extends `agentHealth()`'s tail-read with two more fields (`lastThinking`, `lastAction`), (2) adds a `file` field to `TermSession` so the renderer can call the *already-wired* `window.dai.sessions.health(file)` on demand, and (3) adds a per-pane idle timer that fires that one call per idle cycle — no new IPC channel, no new poll loop.

**Tech Stack:** Electron 33 main process (TypeScript, node builtins only), React 19 renderer, xterm.js.

## Global Constraints

- Zero new dependencies, zero new IPC channels — reuse `CH.AGENT_HEALTH` (`window.dai.sessions.health`) which already exists and is already used by `AgentsView`/Autopilot.
- No new persistent storage, no new continuous poll loop (the existing 3s `fetchTermSession` poll is untouched; the recap fetch is a separate, idle-triggered, one-shot call).
- Idle threshold is fixed at 120000ms (2 minutes), defined once as `IDLE_MS`.
- Activity = user keystroke into a pane OR new PTY output for that pane. Either resets the pane's clock.
- Recap status vocabulary shown to the user: `running` / `idle` / `stalled` / `done` / `error` / `unknown` (internal `working` maps to `running` for display) — identical to claude-dashboard's.
- Master terminal pane gets the same recap mechanism as any other pane (no special-case exclusion) — per explicit user decision.
- Never fabricate a field — omit it if there's no real signal.
- No automated test suite exists in this project for terminal/UI behavior. Verification is `npm run build` (type-check across main/preload/renderer) plus a manual `npm run start` walkthrough — this is a deliberate adaptation to the existing project, not a shortcut.
- Full design rationale and shared field-by-field spec live in `docs/superpowers/specs/2026-07-06-idle-recap-design.md` (this repo) and its companion in `claude-dashboard/docs/superpowers/specs/2026-07-06-idle-recap-design.md`.
- **Do not touch** `src/main/ipc.ts` or `src/renderer/src/views/TerminalsView.tsx` beyond what's specified here — both have unrelated uncommitted changes from another in-progress session as of this plan's writing. Read-fresh before editing either.

---

### Task 1: Shared types — `src/shared/ipc.ts`

**Files:**
- Modify: `src/shared/ipc.ts:133-136` (`TermSession`)
- Modify: `src/shared/ipc.ts:165-172` (`AgentProblem`/`AgentHealth`)

**Interfaces:**
- Produces: `TermSession` now includes `file: string`. `AgentHealth` now includes `lastThinking?: string` and `lastAction?: string`.

- [ ] **Step 1: Add `file` to `TermSession`**

Replace (lines 133-136):

```ts
export type TermSession = {
  model: string; ctx: number; out: number; capacity: number; score: number;
  goalPct: number; understanding: number; ambiguous: boolean;
} | null;
```

with:

```ts
export type TermSession = {
  model: string; ctx: number; out: number; capacity: number; score: number;
  goalPct: number; understanding: number; ambiguous: boolean; file: string;
} | null;
```

- [ ] **Step 2: Add `lastThinking`/`lastAction` to `AgentHealth`**

Replace (lines 165-172):

```ts
export type AgentProblem = { kind: "tool-error" | "bash-fail" | "stall" | "repeat-error"; detail: string; ts: number };
export type AgentHealth = {
  goalPct: number;                                    // 0..100
  status: "working" | "stalled" | "error" | "done" | "idle";
  problems: AgentProblem[];
  lastActivityMs: number;
  cwd_full?: string;                                  // for terminal targeting (autopilot)
};
```

with:

```ts
export type AgentProblem = { kind: "tool-error" | "bash-fail" | "stall" | "repeat-error"; detail: string; ts: number };
export type AgentHealth = {
  goalPct: number;                                    // 0..100
  status: "working" | "stalled" | "error" | "done" | "idle";
  problems: AgentProblem[];
  lastActivityMs: number;
  cwd_full?: string;                                  // for terminal targeting (autopilot)
  lastThinking?: string;                              // last "thinking" block excerpt (idle-recap)
  lastAction?: string;                                // last tool_use or assistant text (idle-recap)
};
```

- [ ] **Step 3: Verify manually**

```bash
cd ~/code/dragons-alliance-ide && npm run build
```

Expected: clean build. `agentHealth()` and `sessionForTerm()` don't populate `lastThinking`/`lastAction`/`file` yet (that's Tasks 2-3) — but since all three new fields are optional (`?:`) on their types, omitting them is valid TypeScript and the build stays green. If it fails, re-check that both edits above added the fields as optional, not required.

- [ ] **Step 4: Commit**

```bash
cd ~/code/dragons-alliance-ide && /usr/bin/git add src/shared/ipc.ts && /usr/bin/git commit -m "Add idle-recap fields to TermSession/AgentHealth types"
```

---

### Task 2: `src/main/agenthealth.ts` — capture last thinking + last action

**Files:**
- Modify: `src/main/agenthealth.ts` (local variable declarations, ~line 68-72)
- Modify: `src/main/agenthealth.ts` (assistant-branch loop, ~line 88-99)
- Modify: `src/main/agenthealth.ts` (return statement, ~line 141)

**Interfaces:**
- Consumes: `AgentHealth` type (Task 1).
- Produces: `agentHealth(file)` now returns `lastThinking`/`lastAction` alongside its existing fields — consumed by Task 4's hook via the existing `fetchAgentHealth`.

- [ ] **Step 1: Add the two new locals**

Find (inside `agentHealth`, near the other `let` declarations):

```ts
    const toolUses = new Map<string, ToolUse>(); // id → tool_use
    let toolCount = 0;
    let errorCount = 0;
    let lastTodos: any[] | null = null;
    let lastActivityMs = 0;
    let cwdFull = "";
```

Replace with:

```ts
    const toolUses = new Map<string, ToolUse>(); // id → tool_use
    let toolCount = 0;
    let errorCount = 0;
    let lastTodos: any[] | null = null;
    let lastActivityMs = 0;
    let cwdFull = "";
    let lastThinking: string | undefined;
    let lastAction: string | undefined;
```

- [ ] **Step 2: Capture thinking/text/tool_use in the assistant branch**

Find:

```ts
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
```

Replace with:

```ts
      if (d.type === "assistant") {
        cwdFull = d.cwd || cwdFull;
        const cont = d.message?.content;
        if (!Array.isArray(cont)) continue;
        for (const b of cont) {
          if (!b || typeof b !== "object") continue;
          if (b.type === "thinking") {
            lastThinking = String(b.thinking || "").slice(0, 160);
            continue;
          }
          if (b.type === "text") {
            const t = String(b.text || "").trim();
            if (t) lastAction = t.slice(0, 160);
            continue;
          }
          if (b.type !== "tool_use") continue;
          toolCount += 1;
          if (b.id) toolUses.set(b.id, { name: b.name, input: b.input || {}, ts });
          if (b.name === "TodoWrite" && Array.isArray(b.input?.todos)) {
            lastTodos = b.input.todos;
          }
          const inp = b.input || {};
          const target = String(
            inp.file_path ?? inp.path ?? inp.command ?? inp.pattern ?? inp.query ?? inp.url ?? inp.description ?? "",
          ).slice(0, 120);
          lastAction = target ? `${b.name}: ${target}` : b.name;
        }
      } else if (d.type === "user") {
```

- [ ] **Step 3: Return the new fields**

Find:

```ts
    return { goalPct, status, problems: problems.slice(0, MAX_PROBLEMS), lastActivityMs, cwd_full: cwdFull };
```

Replace with:

```ts
    return {
      goalPct, status, problems: problems.slice(0, MAX_PROBLEMS), lastActivityMs, cwd_full: cwdFull,
      lastThinking, lastAction,
    };
```

- [ ] **Step 4: Verify manually**

```bash
cd ~/code/dragons-alliance-ide && npm run build
```

Expected: clean build (main + preload + renderer).

- [ ] **Step 5: Commit**

```bash
cd ~/code/dragons-alliance-ide && /usr/bin/git add src/main/agenthealth.ts && /usr/bin/git commit -m "Capture lastThinking/lastAction in agentHealth()"
```

---

### Task 3: `src/main/sessions.ts` — forward the transcript file path

**Files:**
- Modify: `src/main/sessions.ts:276-279` (`sessionForTerm` return)

**Interfaces:**
- Produces: `sessionForTerm(cwd)` now includes `file` in its returned `TermSession` — consumed by Task 4's hook (which passes it to `fetchAgentHealth`).

- [ ] **Step 1: Add `file` to the return**

Find:

```ts
  return {
    model: s.model, ctx: s.ctx, out: s.out, capacity: s.capacity, score: s.score,
    goalPct: s.goalPct, understanding: s.understanding, ambiguous: matches.length > 1,
  };
```

Replace with:

```ts
  return {
    model: s.model, ctx: s.ctx, out: s.out, capacity: s.capacity, score: s.score,
    goalPct: s.goalPct, understanding: s.understanding, ambiguous: matches.length > 1,
    file: s.file || "",
  };
```

- [ ] **Step 2: Verify manually**

```bash
cd ~/code/dragons-alliance-ide && npm run build
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
cd ~/code/dragons-alliance-ide && /usr/bin/git add src/main/sessions.ts && /usr/bin/git commit -m "Forward transcript file path in sessionForTerm"
```

---

### Task 4: `src/renderer/src/idleRecap.ts` (new hook)

**Files:**
- Create: `src/renderer/src/idleRecap.ts`

**Interfaces:**
- Consumes: `fetchAgentHealth` (existing, `src/renderer/src/api.ts:43`), `TermSession` (Task 1, re-exported from `api.ts:46`).
- Produces: `IDLE_MS`, `RecapView` type, `useIdleRecap(opts): RecapView | null` — consumed by Task 5.

- [ ] **Step 1: Write the hook**

Create `src/renderer/src/idleRecap.ts`:

```ts
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
 *  xterm scrollback buffer, no IPC call. */
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

  useEffect(() => {
    const tick = async () => {
      if (focused) {
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
      try {
        if (cmd === "claude") {
          const s = sessRef.current;
          if (!s?.file) {
            setRecap({ session: "claude", status: "unknown", context: "", lastAction: "", unavailable: true });
          } else {
            const h = await fetchAgentHealth(s.file);
            const status = h.status === "working" ? "running" : h.status;
            setRecap({
              session: "claude",
              status,
              context: s.ambiguous ? "· ambiguous (2+ sessions share this folder)" : "",
              reason: h.lastThinking,
              understanding: s.understanding,
              lastAction: h.lastAction || h.problems[0]?.detail || "",
              next: NEXT_BY_STATUS[h.status],
            });
          }
        } else {
          const line = lastBufferLine(xtermRef.current);
          setRecap({
            session: "shell",
            status: exitedRef.current ? "done" : "running",
            context: "",
            lastAction: line,
            unavailable: !line,
          });
        }
      } catch {
        setRecap({ session: cmd, status: "unknown", context: "", lastAction: "", unavailable: true });
      } finally {
        shownRef.current = true;
        fetchingRef.current = false;
      }
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [focused, cmd]);

  return recap;
}
```

- [ ] **Step 2: Verify manually**

```bash
cd ~/code/dragons-alliance-ide && npm run build
```

Expected: clean build (not yet wired into any component — that's Task 5).

- [ ] **Step 3: Commit**

```bash
cd ~/code/dragons-alliance-ide && /usr/bin/git add src/renderer/src/idleRecap.ts && /usr/bin/git commit -m "Add useIdleRecap hook"
```

---

### Task 5: Wire `TerminalPane.tsx`

**Files:**
- Modify: `src/renderer/src/components/TerminalPane.tsx`

**Interfaces:**
- Consumes: `useIdleRecap` (Task 4), `gradeColor` (existing export, `src/renderer/src/api.ts`, already imported by `ProjectRail.tsx`).

- [ ] **Step 1: Update imports**

Replace line 8:

```ts
import { Term, fetchTermSession, modelGrade, MODEL_KEYS, human, broadcast } from "../api";
```

with:

```ts
import { Term, fetchTermSession, modelGrade, MODEL_KEYS, human, broadcast, gradeColor } from "../api";
```

Add a new import line right after it (after the `Crystal`/`icons` imports, i.e. after line 10):

```ts
import { useIdleRecap } from "../idleRecap";
```

- [ ] **Step 2: Add activity/exit refs**

Right after `const [focused, setFocused] = useState(false);` (line 45), add:

```ts
  const lastActivityRef = useRef(Date.now());
  const exitedRef = useRef(false);
```

- [ ] **Step 3: Bump activity on user input**

Replace:

```ts
      xt.onData((d) => window.dai.term.write(term.id, d));
```

with:

```ts
      xt.onData((d) => {
        lastActivityRef.current = Date.now();
        window.dai.term.write(term.id, d);
      });
```

- [ ] **Step 4: Bump activity on process output, mark exit**

Replace:

```ts
      offData = window.dai.term.onData((tid, data) => {
        if (tid === term.id) xt.write(data, () => window.dai.term.ack(term.id, data.byteLength));
      });
      offExit = window.dai.term.onExit((tid) => {
        if (tid === term.id) {
          xt.writeln("\r\n\x1b[2m[ closed ]\x1b[0m");
          onStatus?.("closed");
        }
      });
```

with:

```ts
      offData = window.dai.term.onData((tid, data) => {
        if (tid !== term.id) return;
        lastActivityRef.current = Date.now();
        xt.write(data, () => window.dai.term.ack(term.id, data.byteLength));
      });
      offExit = window.dai.term.onExit((tid) => {
        if (tid === term.id) {
          exitedRef.current = true;
          xt.writeln("\r\n\x1b[2m[ closed ]\x1b[0m");
          onStatus?.("closed");
        }
      });
```

- [ ] **Step 5: Call the hook**

Right after `const grade = sess ? modelGrade(sess.model) : null;`, add:

```ts
  const recap = useIdleRecap({ cmd: term.cmd, focused, sess: sess ?? null, exitedRef, xtermRef, lastActivityRef });
```

- [ ] **Step 6: Render the recap block**

In the JSX, right after the closing `)}` of the claude/shell `.term-infobar` ternary (i.e. right before `<div className="term-body" ref={hostRef} onMouseDown={focusMe} />`), insert:

```tsx
      {recap && (
        <div className="term-recap">
          <span className="tr-tag">auto recap · idle 2m</span>
          {recap.unavailable ? (
            <span className="tr-line tr-muted">Recap unavailable — not enough activity yet.</span>
          ) : (
            <>
              <span className="tr-line"><b>Session:</b> {recap.session}</span>
              <span className="tr-line"><b>Status:</b> {recap.status}</span>
              {recap.context && <span className="tr-line">{recap.context}</span>}
              {recap.reason && <span className="tr-line"><b>Reason:</b> {recap.reason}</span>}
              {typeof recap.understanding === "number" && (
                <span className="pr-bar-row">
                  <span className="pr-bar-label">UNDR</span>
                  <span className="pr-bar">
                    <span className="pr-bar-fill" style={{ width: `${recap.understanding}%`, background: gradeColor(recap.understanding) }} />
                  </span>
                  <span className="pr-bar-val">{recap.understanding.toFixed(0)}%</span>
                </span>
              )}
              {recap.lastAction && <span className="tr-line"><b>Last action:</b> {recap.lastAction}</span>}
              {recap.next && <span className="tr-line"><b>Next:</b> {recap.next}</span>}
            </>
          )}
        </div>
      )}
```

- [ ] **Step 7: Verify manually**

```bash
cd ~/code/dragons-alliance-ide && npm run build
```

Expected: clean build (main + preload + renderer).

- [ ] **Step 8: Commit**

```bash
cd ~/code/dragons-alliance-ide && /usr/bin/git add src/renderer/src/components/TerminalPane.tsx && /usr/bin/git commit -m "Wire idle-recap into TerminalPane"
```

---

### Task 6: CSS for the recap block

**Files:**
- Modify: `src/renderer/src/styles.css` (insert after line 993)

- [ ] **Step 1: Add the CSS**

Insert after line 993 (`.ti-modelrow:hover { background: rgba(212,175,55,0.14); color: #fff; }`) and before the `/* rail per-project metric bars — grounding + goal */` comment:

```css
/* auto idle-recap (discreet, inline, one per idle cycle) */
.term-recap {
  flex: 0 0 auto; display: flex; flex-direction: column; gap: 2px;
  padding: 5px 12px; font-size: 10.5px; color: var(--faint);
  background: rgba(0,0,0,0.18); border-bottom: 1px solid var(--panel-border);
}
.tr-tag { text-transform: uppercase; letter-spacing: 0.08em; font-size: 8.5px; color: var(--faint); opacity: 0.7; }
.tr-line { color: var(--faint); }
.tr-line b { color: var(--faint); font-weight: 650; }
.tr-muted { font-style: italic; }
```

Note: the understanding bar in Task 5 reuses `.pr-bar-row`/`.pr-bar-label`/`.pr-bar`/`.pr-bar-fill`/`.pr-bar-val` — those already exist (lines 996-1001) and need no changes.

- [ ] **Step 2: Verify manually**

```bash
cd ~/code/dragons-alliance-ide && npm run build
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
cd ~/code/dragons-alliance-ide && /usr/bin/git add src/renderer/src/styles.css && /usr/bin/git commit -m "Add idle-recap CSS"
```

---

### Task 7: End-to-end verification

**Files:** none (verification only).

- [ ] **Step 1: Build and launch**

```bash
cd ~/code/dragons-alliance-ide && npm run build && npm run start
```

If the packaged app is already running in `/Applications`, quit it first (`osascript -e 'quit app "Dragons Alliance IDE"'`) — the single-instance lock will otherwise silently block `npm run start` from showing your new build.

- [ ] **Step 2: Manual walkthrough**

In the Terminals view, with at least one claude worker and one zsh worker open (plus the master):
1. Click into a pane (existing gold focus ring should appear).
2. Leave it unfocused for 2 minutes.
3. Confirm the small muted `[auto recap · idle 2m]` block appears under the info bar — real `Session`/`Status`/`Last action` (and `Reason`/`Understanding` for claude, if a thinking block exists in that agent's recent transcript tail).
4. Refocus the pane — confirm the recap disappears immediately.
5. Type in a still-idle other pane — confirm its recap (if shown) disappears and its 2-minute clock restarts, without affecting other panes.
6. Repeat steps 2-4 on the MASTER pane — confirm it gets a recap too.

Expected: all six checks pass, zero console errors (check via CDP if convenient: `electron . --remote-debugging-port=9333`, per this repo's existing verification pattern).
