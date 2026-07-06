# Idle Recap — Design Spec (dragons-alliance-ide implementation notes)

**Date:** 2026-07-06
**Scope:** same mechanism as claude-dashboard's idle-recap spec (see
`claude-dashboard/docs/superpowers/specs/2026-07-06-idle-recap-design.md` for
the full shared rule, recap content format, per-kind data model, edge cases,
and rationale — not duplicated here). This file only covers what's specific to
this app's architecture.
**Status:** approved by user, pending implementation plan.

## Why this app needs less new work

Most of the shared design is already infrastructure that exists here:
- Focus/blur tracking per pane already exists (`TerminalPane.tsx`, via
  `.xterm-helper-textarea` focus/blur → `focused` state).
- `agentHealth()` (`src/main/agenthealth.ts`) already derives
  status/goalPct/errors/stall from the transcript — the shared spec's status
  vocabulary is a direct port of this, not a new implementation.
- A 3s poll per claude terminal (`fetchTermSession` → `TermSession`) already
  tail-reads the same transcript for the existing info-bar (model/ctx/capacity).
- `.term-infobar` already exists per terminal (claude and shell) as the render
  target.
- `understanding`/`goalPct` are already forwarded through `sessionForTerm` per
  the 2026-07-03 per-terminal-info-bar work.

## What's new here

- **`AgentHealth` type (`src/shared/ipc.ts`) + `agentHealth()`:** add
  `lastThinking?: string` — one more branch in the existing tail-read loop
  (already iterates `assistant.message.content[]`; add a check for
  `type === "thinking"`, keep the last match). No new file read.
- **Fold into `TERM_SESSION`, not a new IPC channel:** add the same fields
  (`status`, `lastError`, `lastThinking`) to the existing `TermSession`
  payload/IPC handler rather than introducing a second endpoint — it's the
  same underlying transcript read, already polled every 3s.
- **`TerminalPane.tsx`:**
  - `lastActivityRef`, bumped in the existing `xt.onData(d => ...)` (user
    input) and the existing `window.dai.term.onData` callback (process
    output) — one line added to each, no new listeners.
  - New `useIdleRecap` hook (same shape as claude-dashboard's, shared concept):
    for claude terminals, it has **zero extra network cost** — the `sess`
    object from the existing 3s poll already carries every field once folded
    in per above; the hook only decides *when* to surface what's already
    there. For shell terminals: reads `xtermRef.current.buffer.active` tail,
    same as the web version, no backend call.
  - Render: new row inside the existing `.term-infobar` (present for both
    claude and shell terminals today). `Understanding` reuses the exact
    `.pr-bars` grounding-bar CSS class from `ProjectRail.tsx` as-is — no new
    styles.
- **Master pane:** included, same hook, same rendering, no special-case (per
  user's explicit choice — differs from the initial recommendation to
  exclude it).

## Net new code estimate

One field added to a shared type, one branch in an existing transcript loop,
two one-line ref updates in existing callbacks, one new hook (~40 lines,
conceptually shared with claude-dashboard's), one new JSX block reusing an
existing CSS class. No new IPC channel, no new poll loop, no new backend
module.

## Verification

`npm run build` (main + preload + renderer must all pass), then `npm run
start` and confirm: idle a claude terminal and a shell terminal past 2 minutes
unfocused, recap row appears once in each with real fields; refocus clears it;
retype resets the cycle. CDP-driven check optional (existing pattern in this
repo — see project CLAUDE.md "Verify a change").
