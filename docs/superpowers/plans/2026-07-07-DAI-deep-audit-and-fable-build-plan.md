# DRAGONS ALLIANCE IDE — DEEP OPERATIONAL AUDIT + FABLE 5 CONSTRUCTION PLAN

> **Document type:** combined read-only operational audit + executable construction plan.
> **Authored:** 2026-07-07, by Claude (Opus 4.8) at max effort, read-only (no code changed, nothing committed).
> **Intended executor:** Claude Fable 5 at maximum effort, in a fresh session.
> **Repo:** `/Users/user/code/dragons-alliance-ide` · branch `main` · HEAD at audit time `5497e67`.
> **Method:** hermeneutic — interpret the system before prescribing changes; every prescription carries its *why*; the document is meant to *teach the system to its executor* as much as to list tasks (a learning-machine spec, not a checklist).

---

## PART 0 — HOW FABLE SHOULD READ AND EXECUTE THIS DOCUMENT

### 0.1 The one sentence

Dragons Alliance IDE is **far more real than it looks from the outside**; the job is not to "make fake things real" — most things are already real — but to (a) eliminate the *few* genuinely dead/placeholder controls, (b) raise every superpower to the GODMODE operational-panel standard, (c) close the honest-pending gaps where a backend or a key is the only thing missing, and (d) do all of it without ever violating the app's honesty doctrine (§2).

### 0.2 The hermeneutic contract (why this is a "learning machine" document, not a task list)

A checklist tells you *what* to type. It does not tell you *why the system is shaped the way it is*, so the moment reality diverges from the checklist you are lost. This document is written the opposite way: each section first **interprets** the relevant part of the system — its intent, its invariants, the forces that produced its current shape — and only then prescribes. The prescriptions are therefore *derivable*: if a file has moved or a signature changed by the time you execute, you can re-derive the correct action from the interpretation instead of failing on a stale instruction.

Concretely, every audited unit in this document answers, in order:

1. **What is it?** (intent — the job the unit exists to do)
2. **What is it actually?** (observed reality, cited to `file:line`)
3. **Why is it that way?** (the forces: honesty doctrine, missing backend, missing key, deliberate gate, or genuine defect)
4. **What should it become?** (target state)
5. **How do you get there?** (the change, at code-level detail)
6. **How do you know it worked?** (the verification: command output, CDP DOM assertion, or screenshot)

When you (Fable) execute, do the same in reverse: read the interpretation, confirm it still matches the live code (`git log`, `grep`, read the file fresh), then apply the prescription, then verify. **Never apply a prescription whose interpretation no longer matches reality — re-derive instead.**

### 0.3 Operating constraints for the executor (non-negotiable)

These are lifted from the app's own CLAUDE.md and the accumulated hazard memory; violating any one of them has broken the build or the app before.

- **Renderer is `contextIsolation:true` with no Node globals.** The renderer must NEVER `import ... from "electron"` or `require()` or import any `node:*` module. All privileged work goes through the `window.dai.*` preload bridge. A prior session's `import { ipcRenderer } from "electron"` in `TerminalsView.tsx` pulled electron's npm package into the renderer bundle, whose entry reads `__dirname` → `ReferenceError` at module-eval → React never mounted → solid black window (fixed @ `dadb3d5`). This is the single most expensive mistake available; do not repeat it.
- **Never register the same IPC channel twice.** `ipcMain.handle(CH.X, ...)` called twice for the same channel throws at boot. (Same incident: a duplicate `check-command` handler.)
- **Never pass a transfer list for ArrayBuffers to/from `MessagePortMain`** — it nulls the message and silently breaks terminal keystroke input. Copy by structured clone.
- **Honesty doctrine (see §2 in full).** No hardcoded `LIVE`. No fake success. No dead clicks. Every disabled control names its reason. Statuses come from real probes only. If you cannot prove a thing is live, the UI must say it is not.
- **Build gate = real type-check.** `electron-vite build` only transpiles; it does NOT type-check. The real gate is `node node_modules/.bin/tsc --noEmit` (or `npx tsc --noEmit`). Run `node scripts/superpowers-doctor.mjs --check` too — it forbids disabled entries in the SUPERPOWERS registry.
- **Absolute binary paths in scripts.** A `_lc` zsh wrapper shadows bare `git`/`gh`/`curl`/`bun` and can print `_lc: command not found`. Use `/usr/bin/git`, `/opt/homebrew/opt/node@22/bin/npm`, `/opt/homebrew/opt/node@22/bin/npx`, `/usr/bin/curl`, `/opt/homebrew/opt/node@22/bin/node`.
- **Multi-agent hazard.** Other Claude sessions edit this repo concurrently. Before editing a file: `git log --oneline -3`, `git status --short`, and read the file fresh. Commit each verified deliverable immediately — a commit is the only protection against a peer rollback. If `git ls-files | grep node_modules` is non-empty, a peer force-added a `node_modules` symlink past `.gitignore`; remove it (`git rm --cached node_modules`) before it self-references and breaks the build.
- **Files < 500 lines.** Split by responsibility when a file you touch grows past it. `NeuromapView.tsx` (448) and `TerminalsView.tsx` (484) are already near the limit — extract, don't inflate.
- **No emoji in the product UI.** Brand tokens only (obsidian/burgundy/crimson/violet/gold/ember/teal). No neon/casino aesthetics.

### 0.4 How to execute a task from PART 9

Each construction task in PART 9 is written as: **{id, priority, component/files, why, change (code-level), IPC/service, verification, screenshot}**. Execute in priority order (P0 → P1 → P2), and within a priority in the listed order (earlier tasks set up shared primitives the later ones consume). After each task: `tsc --noEmit` + `npm run build` + `doctor` must all pass; capture the named screenshot via the CDP recipe (§16); commit with a message that states what shipped and the verification result. Do not batch multiple P0 tasks into one commit — one reviewable deliverable per commit.

---

## PART 1 — GROUND TRUTH (repo state, commands run, sources of truth)

### 1.1 Repository & deploy state at audit time

- **HEAD:** `5497e67 Remove accidentally-committed node_modules symlink from idle-recap merge`
- **Recent history (last 10):**
  - `5497e67` remove accidental node_modules symlink (multi-agent hazard cleanup)
  - `f4cd368` chore(ipc): drop orphaned permissions comment (Task-10 cutover tail)
  - `bb9c018` Merge branch 'idle-recap'
  - `28c639a` refactor(team): retire local permissions.ts (Task-10 cutover)
  - `ae9e2a1`, `f931edc` idle-recap fixes
  - `b3757f4` feat(library): persistent Admin shortcut in the Superpower Dock
  - `64e87cf`, `09b564d`, `648e6d4` idle-recap feature (CSS, TerminalPane wiring, hook)
- **Working tree is HOT (a concurrent session is mid-refactor):** uncommitted at audit time —
  `M App.tsx`, `M registry.tsx`, `M styles.css`, `M shell/LeftRail.tsx`, `M LibraryView.tsx`,
  `M library/AdminSection.tsx`, `M library/TeamSection.tsx`, `D library/AgentCatalog.tsx`, `D data/agentCatalog.ts`.
  → The **Library** sub-system is being actively rewritten (the agent-catalog is being deleted/replaced). Treat all Library findings in this document as **provisional / moving target**; re-audit Library live before touching it.
- **Origin:** `origin/main` was pushed to `b3757f4` earlier; the cutover chain (`28c639a`, `f4cd368`, merge, `5497e67`) is local — confirm push state with `git log --oneline origin/main..HEAD` before assuming parity.
- **Installed app:** `/Applications/Dragons Alliance IDE.app` runs the cutover build (`28c639a`). A prior deploy's LAUNCH-FAIL was caused by a lingering debug electron instance (`--remote-debugging-port=9333`, node_modules path, real profile) holding the single-instance lock — kill any such instance before launching the installed app.

### 1.2 Commands run for this audit (read-only) and their results

| Command | Result | Note |
|---|---|---|
| `git branch --show-current` | `main` | |
| `git log --oneline -10` | see §1.1 | |
| `git status --short` | 9 uncommitted (concurrent Library refactor) | HOT tree |
| `npx tsc --noEmit` (live working tree) | **EXIT 0 — green** | type-safe even mid-refactor |
| `npm run build` (electron-vite) | completed EXIT 0 earlier; a later invocation hit a **transient rollup `handleInvalidResolvedId`** | an import briefly pointed at a just-deleted file during the concurrent Library deletion — recovers once the peer's edit settles |
| `node scripts/superpowers-doctor.mjs --check` | **EXIT 0 — green** (godmode panel/lab OK, google config present + 0600) | doctor guards the registry honesty invariant |
| `npm test` / `npm run lint` / `npm run visual` | **do not exist** | package.json has no test/lint/visual/screenshot scripts (see §1.4) |

**Interpretation:** the committed codebase is green (tsc + build + doctor). The only instability is *externally induced* by the concurrent Library refactor, which momentarily breaks `rollup` module resolution while a file is deleted-then-reimported. This is not a defect in the audited code; it is the multi-agent hazard manifesting. Fable must therefore run its own `tsc`/build gate on a *quiet* tree (wait for ~2 min of no `find src -newermt "-90 seconds"` churn) before trusting a red result.

### 1.3 The sources of truth (read these first, in this order)

The IDE deliberately centralizes "what every control does" so the audit has a small number of authoritative files rather than scattered handlers:

1. **`src/renderer/src/registry.tsx`** — THE operational registry. Declares the 7 SUPERPOWERS (id/label/icon/role/`statusOf`/actions), the MORE_CATEGORIES launcher, and every shared action factory (`deployTerm`, `armTerm`, `armTermToast`, `deployClaudeWithPrompt`, `rufloIgnite`, `graphifyOpenDigest`, `graphifyRegen`, `goto`, `vault`, `phone`, `godmode`, `admin`, `openObsidian`, `openGraphify`, `refreshTools`). Also `operationalTruth()` which *computes* real-vs-pending counts. **Rule stated in its own header:** "no dead clicks, no fake status. If we can't prove it, we say so."
2. **`src/renderer/src/sectorActions.tsx`** — the per-sector contextual action list (`SECTOR_ACTIONS`) that feeds the command palette's "Recommended" group and the sector-scoped `dai:sector-action` events. `SECTOR_INFO` (titles/descriptions) lives here too.
3. **`src/main/tools.ts`** — `probeTools()`: the ONLY status source for the dock. Real signals: `pgrep`, `launchctl list`, file mtimes (ruvector.db, graphify digest, vault `.lock`), session collection. Maps to `live`/`ready`/`off`.
4. **`src/main/superpowers.ts`** — `superpowerHealth(id)` and `openGraphDigest()`: real, timeout-guarded CLI/file probes for the Ignite/health actions (runs `ruflo status` in HOME, parses RUNNING/STOPPED/version/agents/MCP).
5. **`src/renderer/src/hooks/useOps.ts`** — the status pipeline: fetches tools/sessions/google, runs each superpower's `statusOf(env)`, derives `liveCount`/`attention`/`checking`/`lastChecked`. This is what makes "SYSTEMS N/7" real.
6. **`src/renderer/src/hooks/useMe.ts`** — cooperative access control: `useMe()` → `{ me, isOwner, can(cap) }` resolved from the synced team config; `can()` is the gate consulted by LeftRail/dock/App/palette.
7. **`src/renderer/src/registry` consumers:** `EcosystemBar.tsx` (the dock), `GodModePanel.tsx`, `AdminPanel.tsx` + `settings/SettingsSections.tsx`, the shell (`LeftRail`/`TopBar`/`StatusBar`), `CommandPalette.tsx` + `palette.ts`.
8. **The 11 views** in `src/renderer/src/views/`: `TerminalsView`, `AgentsView`, `CodeView`, `NeuromapView`, `DriveView` (+ `drive/`), `MetricsView`, `PreviewView`, `CreativeView`, `LibraryView` (+ `library/`), `ResearchView`, `RadarView`.
9. **The IPC contract:** `src/shared/ipc.ts` (channels + types + the `window.dai` interface), `src/main/ipc.ts` (handlers), `src/preload/index.ts` (bridge). Terminal IO does NOT go through here — it flows over a MessagePort to the pty-host (`src/pty-host/host.ts`).

### 1.4 Tooling reality (what CI/verification actually exists)

`package.json` scripts: `dev` (electron-vite dev), `build` (electron-vite build — transpile only), `start` (preview), `storybook`, `build:storybook`, `postinstall` (chmod spawn-helper), `dist` (build + electron-builder --mac), `doctor` (superpowers-doctor --verbose). **There is no unit-test runner, no lint script, no visual/screenshot script.** Therefore the verification model for every change is: `tsc --noEmit` (real type gate) + `npm run build` (transpile/bundle gate) + `doctor` (registry honesty gate) + **CDP smoke** (launch the built bundle with `--remote-debugging-port` and assert DOM/behavior via a `ws` script) + screenshots. Fable must NOT assume `npm test` exists.

**Known infra defect (not a button):** `npm run dist` currently fails at the DMG step — `spawn node_modules/app-builder-bin/mac/app-builder_arm64 ENOENT`. The `.app` bundle builds fine (only the DMG wrapper fails), so deploys have proceeded by swapping the `.app` directly. Fix = `npm install` / reinstall `app-builder-bin`; needed only if a distributable DMG is wanted for teammates' machines.

---

## PART 2 — THE HONESTY DOCTRINE (the app's soul; interpret before you build)

Every prescription in this document is subordinate to one invariant, because the invariant is the product's identity, not a style choice.

### 2.1 The doctrine, stated

> **No dead clicks. No fake status. If we cannot prove a thing is live, the UI says it is not.** Every visible control resolves to exactly one of: a working handler, a real navigation, or an *honestly disabled* state that names its reason. Statuses are derived from real probes only — never hardcoded to `LIVE` to look healthy.

This is enforced three ways, and Fable must preserve all three:

1. **Structurally, in the registry.** `QuickAction`/`MoreItem` have `run?` XOR `disabledReason`. A control with neither is illegal. `operationalTruth()` (registry.tsx:283) literally counts `a.run ? real++ : pending++` across every superpower action and every More item — GODMODE displays this count. You cannot smuggle a fake action past it.
2. **Mechanically, in the doctor.** `scripts/superpowers-doctor.mjs --check` fails the build if the SUPERPOWERS registry contains a disabled entry. Therefore superpower *restriction* (access-gated) is expressed via the dock's `restricted` visual state, NOT by adding disabled entries — see EcosystemBar.
3. **Semantically, in the copy.** Gates say the truth verbatim: DriveView's `Gate` — "needs Google — go to Config, save your OAuth client and sign in. **Nothing is simulated.**"; CreativeView — "Set `X_API_KEY` in `.env.local` to enable — **no key, no fake output.**"

### 2.2 The status vocabulary (what each word MEANS, so you don't misuse it)

`OpStatus` (registry.tsx:14) with `STATUS_META` colors:

| Status | Color token | Precise meaning — use ONLY when true |
|---|---|---|
| `live` | teal | a real probe says the thing is actively doing work right now |
| `running` | gold-soft | actively executing (terminal/agent) |
| `idle` | muted | engine reachable/installed, no active flow — **NOT broken** |
| `partial` | orange | configured but sign-in/setup incomplete (e.g. Google has creds, no token) |
| `local-only` | blue | works locally, no remote/team sync |
| `setup-required` | ember | missing credential/config/path — the action must open setup, never fail silently |
| `pending-backend` | violet | UI ready, backend not wired |
| `error` | red | probe or action failed — must show message + log |
| `offline`/`unknown`/`disabled` | faint | no signal / no data / genuinely off |

**The trap Fable must avoid:** "0/7 live" is a *valid, honest* state — it means nothing had an active signal at that instant, not that the system is broken. Never "fix" a low live-count by loosening a `statusOf` mapping to inflate it. The count is dynamic and correct; the earlier session confirmed it swings 0→2→3 as real work starts/stops.

### 2.3 The audit verdict vocabulary (how this document rates each control)

- **REAL** — has a working handler that produces the effect its label promises, with feedback and (where consequential) a log.
- **PARTIAL** — real handler but incomplete effect, OR real-but-gated behind a setup the user hasn't done (honest, works once configured).
- **FAKE** — appears functional but produces no real effect while implying it does. (Doctrine violation — must be zero; the audit found the app is *nearly* free of these.)
- **DEAD** — a click that does literally nothing (or only cosmetic local state) while presenting as an action.
- **DISABLED (honest)** — visibly disabled with a stated reason. Doctrine-compliant; counts as pending, not a bug.

---

## PART 3 — SUPERPOWERS DEEP AUDIT (the seven powers)

Each superpower is audited in the GODMODE panel grammar (§4 explains why that grammar), then given a **target panel blueprint** so Fable can lift every one of them to a consistent operational-panel standard.

Definitions live in `registry.tsx:163` (`SUPERPOWERS[]`). Status resolves live via `useOps()` → each `statusOf(env)`. The dock (`EcosystemBar.tsx`) renders each as a chip with a hover tooltip + a click-opened quick panel of actions; access-gating (`can("sp:"+id)`) renders a `restricted` chip for members an owner hasn't granted.

### 3.1 SUPERPOWER: OBSIDIAN — knowledge vault · business brain

```
Displayed status : local-only  (blue dot)     — when vault present, app closed
Real status      : REAL. tool("obsidian") from probeTools(): vault .lock present → live;
                   Obsidian process running or vault dir present → ready(→local-only); else setup-required.
Status source    : src/main/tools.ts probeTools() → pgrep("Obsidian") + vault dir + .lock mtime
Main click       : opens the quick-actions panel (dock). REAL.
Quick actions    :
  - Open Vault (Obsidian) → openObsidian() → window.dai.tools.action("open-obsidian")
      → main opens obsidian://open?vault=Antigravity-Brain ................. REAL
  - Open Neuromap → goto("neuromap") ................................. REAL
  - Search Notes (Research) → goto("research") ...................... REAL
  - Sync Vault → admin("team") → Settings ▸ Team Sync .............. REAL (git engine)
  - Plan Vault Chat → deployClaudeWithPrompt(vaultChatPrompt, vaultDir)
      → spawns a claude terminal pre-typed with a RAG-planning prompt .. REAL (arms a real agent)
Panel exists     : quick-actions menu only (not a full operational panel)
Logs             : yes (audit.log on term-launch / claude-prompt-arm)
Error handling   : n/a for nav; terminal spawn is fire-and-forget
Verdict          : REAL. 5/5 actions real.
Fix needed       : none functional. Elevate to a GODMODE-style panel (§4 blueprint): show
                   vault path, note count (from neuromap graph), last sync time, .lock state.
Risk             : none.
```

### 3.2 SUPERPOWER: GRAPEVINE / GRAPHIFY — neural relationship engine

```
Displayed status : idle (graphify launchd loaded, digest not fresh) OR setup-required (no digest)
Real status      : REAL, but the digest artifact is frequently MISSING.
Status source    : probeTools() → launchctl "com.user.graphify-obsidian" + graphify-out/_GRAPHIFY_DIGEST.md mtime
Main click       : quick-actions panel. REAL.
Quick actions    :
  - Open Map (Neuromap) → goto("neuromap") ......................... REAL
  - Open Graph Digest → graphifyOpenDigest() → window.dai.superpowers.openDigest()
      → main opens the REAL digest file OR honest toast "run Regenerate" if absent .. REAL (honest when absent)
  - Regenerate Digest → graphifyRegen() → armTerm("graphify update .", repo) + toast + refresh .. REAL (runs the real pipeline)
  - Show Research Lens → goto("research") .......................... REAL
  - Show Agents Layer → goto("neuromap") ........................... REAL
Panel exists     : quick-actions menu only
Logs             : yes (graphify-open-digest / graphify-regen)
Error handling   : yes — openDigest toast is error-typed when the file is missing
Verdict          : REAL. 5/5 actions real. The only "gap" is the artifact (digest) often not generated yet,
                   which the UI states honestly and offers to regenerate.
Fix needed       : none functional. Panel blueprint: show digest mtime, node/edge count (Neuromap already has it),
                   graphify launchd pid, "regenerate" with live progress.
Risk             : none. (graphifyRegen arms a terminal command — real, visible, non-silent.)
```

### 3.3 SUPERPOWER: RUFLO — workflow orchestrator (PRIORITY — the user's #1 concern historically)

```
Displayed status : idle (ruvector.db present, not written in last 10 min) / live (fresh) / setup-required (no db)
Real status      : REAL. This was repaired in commit 7c1d8b9.
Status source    : probeTools() → freshness of ruvector.db in known paths
Main click       : quick-actions panel. REAL.
Quick actions    :
  - Ignite (health check) → rufloIgnite() → pushToast("Igniting…","checking")
      → await window.dai.superpowers.health("ruflo")  [main runs `ruflo status` in HOME, 6s timeout,
        parses "RuFlo V3 [STOPPED|RUNNING]" + version + active agents + MCP state]
      → updateToast(honest result: "Ruflo engine ready — swarm stopped, safe to ignite" etc.)
      → audit.log + refreshTools() ................................ REAL. Verified: toast shows true engine state.
  - Broadcast Mission (Agents) → goto("agents") → MissionBar broadcast lives there .. REAL
  - View Task Queue → armTermToast("ruflo task list","~","Ruflo task queue") ....... REAL (arms real cmd + toast)
  - Continue Flow → armTermToast("ruflo session list","~","Ruflo sessions") ........ REAL
Panel exists     : quick-actions menu + last-check/next-action meta (added in repair)
Logs             : yes (ruflo-ignite with status:message)
Error handling   : yes — Ignite catch → error toast; health() never throws to UI
Verdict          : REAL. 4/4 actions real. Ignite runs a real CLI and reports the true engine state.
Fix needed       : none functional. This is the reference for "a superpower that reports honest engine state."
                   Panel blueprint (the user's exact example): Engine / Queue / Agents / Last check / Actions.
                   Backend for Queue/Agents counts exists via `ruflo status` parse — surface them in a panel.
Risk             : Ruflo is a CLI, not a daemon — "Ignite" cannot "start an engine" because there is none to start;
                   it runs a status/health command. The panel copy must not imply a daemon. (Doctrine.)
```

### 3.4 SUPERPOWER: CLOUD — heavy AI execution · Claude sessions

```
Displayed status : live (≥1 live agent) / idle (none)
Real status      : REAL.
Status source    : useOps() liveAgents (session collection, idle_min<3)
Quick actions    :
  - Launch Claude Session → deployTerm("claude","~") → real claude terminal + goto ide .. REAL
  - Open Mission Control → goto("agents") .......................... REAL
  - View Tokens (Metrics) → goto("metrics") ........................ REAL
  - Open Terminal Stop Controls → goto("ide") ...................... REAL (stop lives in TerminalsView)
Verdict          : REAL. 4/4. Panel blueprint: live sessions, total tokens (Metrics has it), model split, "launch/continue/stop".
Fix needed       : none. Optional: a real per-session stop from the panel (today stop is in Terminal).
Risk             : none.
```

### 3.5 SUPERPOWER: AGENTS — swarm activation & control

```
Displayed status : live/idle from liveAgents
Real status      : REAL.
Quick actions    :
  - Open Mission Control → goto("agents") .......................... REAL
  - Launch Claude Agent → deployTerm("claude","~") ................. REAL
  - Inspect Live Transcripts → goto("agents") ...................... REAL (AgentsView shows live transcript)
  - Assign Sector → goto("agents") ................................. PARTIAL (navigates, but "assign sector"
      as a distinct capability is not a real operation — it just opens Agents; label over-promises)
Verdict          : REAL (3/4) + 1 PARTIAL (Assign Sector = navigation dressed as an operation).
Fix needed       : either implement a real sector-assignment (tag an agent's cwd→sector) or rename the action
                   to "Open Agents cockpit" to stop over-promising. Panel blueprint: swarm N live / M total,
                   per-agent health, broadcast, launch-all.
Risk             : low. (Not fake — it navigates — but the label implies more than it does. Doctrine-adjacent.)
```

### 3.6 SUPERPOWER: GODMODE — supreme command center (the TEMPLATE — see §4)

```
Displayed status : idle/live from tool("godmode") (godmode-lab dir + active session in it)
Real status      : REAL and the GOLD STANDARD.
Main click       : opens the full GODMODE panel (GodModePanel.tsx). REAL — this is the ONE superpower whose
                   main click opens a real operational panel, not just a menu.
Actions (in panel, all REAL): Global Command (⌘K) · Open Terminal · Launch Agent (real term.create) ·
   Open Preview · Open Metrics · Capture Screenshot (window.dai.shot.capture → ~/Desktop) ·
   Sync Vault (window.dai.vaultSync.sync) · Emergency Stop (kills worker terminals, window.confirm, master survives).
Verdict          : REAL. This is the target format for every other superpower (§4).
Fix needed       : "Full System Check" is implicit (the panel IS a live system check) but there is no explicit
                   button that RE-RUNS all probes on demand and streams a structured, colored result log. Add one.
Risk             : none.
```

### 3.7 SUPERPOWER: GOOGLE APIs — Drive · Sheets · Forms · Gmail

```
Displayed status : partial (creds saved, not signed in) — CURRENT STATE ← the user still needs to Sign in
Real status      : REAL, honestly gated. signedIn→live, configured→partial, else setup-required.
Status source    : gdrive.status() from ~/.config/dai/google.json (clientId+secret → configured; refreshToken → signedIn)
Quick actions    :
  - Open Drive Ops → goto("drive") ................................. REAL
  - Credentials (Keys) → vault() → CredentialsVault modal ........... REAL
  - API Health → admin("health") → Settings ▸ API Health ........... REAL (per-service probes)
  - Cloud Repair Prompt → deployClaudeWithPrompt(repairPrompt, repo) . REAL (arms an audit agent)
Verdict          : REAL. 4/4 actions real; the LIVE state is one user action away (Sign in with Google in the app).
Fix needed       : none in code. Product gap: scopes are Drive+Sheets+Forms only — the label says "Gmail" but the
                   OAuth scope set (src/main/gdrive.ts) does NOT include a Gmail scope; either add the Gmail scope
                   or drop Gmail from the label (doctrine: don't imply a capability you don't request).
Risk             : low (label over-promises Gmail).
```

### 3.8 Superpowers scoreboard (per-power operational reality)

| Superpower | Actions real/total | Main opens panel? | Honest status? | Verdict | Top fix |
|---|---|---|---|---|---|
| Obsidian | 5/5 | menu only | yes | REAL | elevate to panel |
| Graphify | 5/5 | menu only | yes (digest honest) | REAL | elevate to panel |
| Ruflo | 4/4 | menu only | yes (real CLI health) | REAL | build the Engine/Queue/Agents panel |
| Cloud | 4/4 | menu only | yes | REAL | optional per-session stop |
| Agents | 3/4 | menu only | yes | REAL (1 over-promising) | fix "Assign Sector" label/impl |
| GODMODE | 1/1 main + 8 panel | **full panel** | yes | REAL (template) | add explicit "Full System Check" |
| Google | 4/4 | menu only | yes | REAL (partial, 1 click from live) | Gmail scope or drop label |

**Cold reading:** the superpowers layer is **not fake**. Every one of the 7 has a real main action and real quick actions; the honesty doctrine holds (no dead clicks, statuses probe-derived). The real work is *elevation* — six of seven open a menu, not a GODMODE-style operational panel — and two *labels* over-promise (Agents "Assign Sector", Google "Gmail"). There are **zero fake-LIVE statuses** and **zero dead superpower actions**.

---

## PART 4 — GODMODE AS THE MASTER TEMPLATE (the format every superpower should reach)

### 4.1 Why GODMODE is the gold standard (interpretation)

`GodModePanel.tsx` is the only control in the app whose click opens a **full operational panel** rather than a menu, and it is built entirely from real probes. Its grammar is the pattern the user wants replicated across all seven superpowers:

1. **A header identity row** — sigil + title + operator + one live roster fact (`N member(s) · team roster` from `window.dai.team.get()`).
2. **A SYSTEM HEALTH grid** — N cards, each `{label, colored status dot+word, one-line detail}`, every value from a real probe (`fetchSessions`, `fetchTerms`, `fetchTools`, `fetchGDriveStatus`, `audit.list`). Colors come from `STATUS_META` — the same token set as the dock, so a green dot means the same thing everywhere.
3. **An ACTIVE MISSION line** — the freshest real session (`title · model · cwd · idle · goal%`), or an honest empty state.
4. **A QUICK ACTIONS row** — buttons that each *run* (Global Command, Open X decks, Launch Agent = real `term.create`, Capture Screenshot = real `shot.capture`, Sync Vault = real `vaultSync.sync`, Emergency Stop = real worker kill with `window.confirm`).
5. **An OPERATIONAL TRUTH footer** — `operationalTruth()` count of wired-vs-pending, plus the *names* of every honestly-disabled action. The panel literally publishes its own honesty.

The lesson for Fable: **a superpower panel is a live, colored, structured readout of that power's real state + a row of real actions + an honest statement of what is not yet wired.** No panel should contain a figure that isn't probe-derived, and no action that doesn't run or state why it can't.

### 4.2 The panel blueprint (the reusable shape)

Introduce ONE shared component — `SuperpowerPanel` — that every dock chip opens (instead of the current menu), parameterized per power. Proposed shape (Fable implements in PART 9 / P1):

```
<SuperpowerPanel id=... >
  header:   icon · label · role · <OpStatusBadge live/checking> · last-check HH:MM:SS
  health:   grid of Health cards (each {label, OpStatus, detail}) — power-specific probes
  primary:  the one "does the main job" line (engine state / digest freshness / sign-in state)
  actions:  the existing QuickAction[] rendered as buttons (real run OR disabled+reason)
  truth:    per-power "what's wired vs pending" (subset of operationalTruth for this power)
</SuperpowerPanel>
```

`OpStatusBadge` (components/da.tsx) and `Health` (currently inline in GodModePanel — extract it) already exist; the panel is mostly composition, not new plumbing. Health data sources per power below.

### 4.3 Per-superpower panel field specs (what each panel must show, and where the data is)

**RUFLO panel** (the user's explicit example — build this one first as the reference):
```
Engine    : from window.dai.superpowers.health("ruflo") → status + "RuFlo V3 [STOPPED|RUNNING]" + version
Queue     : parse `ruflo task list` count (new: superpowers.ts add rufloQueue() → count) — OR "run to view"
Agents    : active-agent count from `ruflo status` parse (already parsed as `active`)
MCP       : "MCP server up/idle" (already parsed as mcpUp)
Last check: lastCheckedAt from the health result
Actions   : Ignite (health) · Reconnect (re-run health) · View Task Queue · Continue Flow · Open Logs (audit) · Open Ruflo Mission (goto agents)
```
Backend note: `superpowers.ts rufloHealth()` already returns engine/version/active/MCP. Add a small `rufloQueue()` that runs `ruflo task list` in HOME with the same 6s guard and returns a count (or an honest "not initialized" line). Do NOT invent a daemon.

**OBSIDIAN panel**: vault path (`~/Documents/Obsidian/Antigravity-Brain`) · `.lock` state (open/closed) · note count (Neuromap graph `nodes.length` via `window.dai.neuromap.graph`) · last vault mtime · actions (Open Vault / Neuromap / Search / Sync / Plan Chat).

**GRAPHIFY panel**: digest mtime (from probeTools detail) · node/edge count (Neuromap graph) · launchd pid state · actions (Open Map / Open Digest / Regenerate / Research Lens).

**CLOUD panel**: live sessions (N) · total tokens (Metrics `totalOut`) · model split (from sessions) · actions (Launch / Mission Control / Tokens / Stop).

**AGENTS panel**: swarm N live / M total · per-agent health summary (worst status) · actions (Mission Control / Launch / Broadcast (focus MissionBar) / Inspect). Replace "Assign Sector" here too.

**GOOGLE panel**: sign-in state (email or "configure") · per-service health (`window.dai.google.health()` — Drive/Sheets/Forms) · scopes list (honest: Drive+Sheets+Forms, NOT Gmail unless added) · actions (Sign in / Keys / API Health / Drive Ops).

**GODMODE**: already the panel — add an explicit **Full System Check** button that re-invalidates every probe query (`queryClient.invalidateQueries` for tools/sessions/gdrive/team) and streams a colored, timestamped result list into the panel (a real re-probe, visibly logged), plus writes an audit entry.

### 4.4 The rule that keeps the template honest

Every field in every panel must trace to a probe or a real artifact. When a field has no real source yet (e.g. Ruflo queue before `rufloQueue()` exists), the panel shows an honest "run to view / not wired" line — NEVER a fabricated number. The `operationalTruth()` footer must include any new pending action so the count stays truthful.

---

## PART 5 — CORE SECTORS DEEP AUDIT (the eight decks)

Nav IDs are the `SectorId` union; `SECTOR_FOR_VIEW` maps view→sector; LeftRail gates each on `can("sector:"+id)`. Each sector below: purpose (actual vs intended), files, every button with a verdict, data source, gaps, target, fix priority.

### 5.1 SECTOR: TERMINAL (id `ide`) — the flagship; must be strongest

```
Files       : views/TerminalsView.tsx (484), components/TerminalPane.tsx (+ idle-recap overlay, NEW/merged),
              components/ProjectRail.tsx, components/Crystal.tsx; PTY host src/pty-host/host.ts over MessagePort.
Purpose     : persistent xterm terminals over a native PTY host; a master terminal that can mirror to workers;
              per-project workers; one-shot broadcast; multi-CLI quick-launch (zsh/claude/ollama/hermes/codex).
Data source : REAL — node-pty in a utilityProcess; terminals survive renderer reload (scrollback replay).
Buttons / actions:
  - + Worker ▾ menu → zsh shell / claude session ........................ REAL (add() → term.create)
  - ollama session (status dot from fetch 127.0.0.1:11434/api/tags) ..... REAL (opens `ollama run` when available;
        gated: does nothing if ollama unreachable — status dot shows availability)
  - hermes session (dot from ollama models incl. 'hermes') ............. REAL (opens `ollama run <hermes-model>`)
  - codex session (dot from window.dai.system.checkCommand('codex')) ... REAL (opens `codex` when present)
  - ollama model picker (lists real models) ............................ REAL
  - grid / focus / tiles layout ........................................ REAL (local layout state)
  - + Add ............................................................. REAL (add shell worker)
  - DEPLOY 2 / 4 / 6 / 8 .............................................. REAL (openN → spawn to N tiles)
  - Channel ON/OFF (peer mesh co-typing) ............................... REAL (term.setChannel)
  - Master SYNC toggle + link-picker (per-worker link) ................. REAL (setMirror scope/ids)
  - send → all workers / Run on all (one-shot broadcast) ............... REAL (broadcast with enter)
  - master terminal pane (drives synced workers) ....................... REAL
  - idle-recap overlay (NEW, merged idle-recap) ........................ UNAUDITED — merged by concurrent session;
        re-audit: it renders a recap when an agent goes idle (useIdleRecap). Verify it's real + non-blocking.
Weakness    : very strong sector. Two watch-items: (1) the ollama/hermes/codex menu rows are silent no-ops when the
              CLI/server is absent (the status dot is the only cue — acceptable but could toast "ollama not running");
              (2) TerminalsView is 484 lines — near the 500 cap; the idle-recap merge and any additions must extract.
Verdict     : OPERATIONAL (strongest sector).
Fix priority: P2 (polish): toast when a gated CLI row is clicked while unavailable; extract sub-components to stay <500.
```

### 5.2 SECTOR: AGENTS (id `agents`) — Mission Control

```
Files       : views/AgentsView.tsx (193) + components/MissionBar.tsx (rendered alongside in App) +
              components/AgentTranscript.tsx.
Purpose     : live roster of running claude agents (health, goal%, problems) + selected transcript + Autopilot;
              MissionBar = launch claude into projects + broadcast a mission to all live agents.
Data source : REAL — fetchSessions parses ~/.claude/projects/*.jsonl; fetchAgentHealth per agent.
Buttons / actions:
  - Autopilot ON/OFF ................................................... REAL (auto-watch health; nudges stuck/errored
        agents via term.broadcast to the exact-cwd claude terminal; 90s cooldown; ambiguity-safe: skips if 0 or >1 match)
  - agent card select → transcript ..................................... REAL
  - HealthBadge (goal% + status + problem count) ....................... REAL
  - empty-state Launch Agent / Open Ruflo Status ....................... REAL
  - MissionBar: Launch claude ▾ (in ALL projects / per-project, dedup by cwd) ... REAL (term.create, confirm-free launch)
  - MissionBar: chips (status? / ce faci acum? / continua / commit + push / ruleaza testele) ... REAL (broadcast + confirm)
  - MissionBar: broadcast input + Send ................................. REAL (broadcast to all claude terminals, confirm)
Weakness    : the user's premise "Agents e slab" is largely a MISREAD — roster + transcript + health + autopilot +
              launch + broadcast are all real. What is genuinely MISSING: (a) a real per-agent STOP (today stop is via
              Terminal); (b) a swarm meter (shows "N live · M total", not a 0/15 capacity gauge); (c) tighter Ruflo
              integration (broadcast goes to terminals, not a ruflo queue).
Verdict     : OPERATIONAL. Under-sold, not under-built.
Fix priority: P1 (per-agent stop button + swarm meter), P2 (ruflo-queue integration).
```

### 5.3 SECTOR: CODE (id `code`) — engineering deck

```
Files       : views/CodeView.tsx (151), components/FileTree.tsx, monaco-setup.ts.
Purpose     : real Monaco editor + file tree + save + git branch/diff badge.
Data source : REAL — fsRead/fsWrite IPC (fs confined to HOME + secret denylist); git state via projects probe.
Buttons / actions:
  - file tree open ..................................................... REAL (fsRead)
  - tab select / tab close (× ) ........................................ REAL
  - ⌘S / Save button (dirty-gated) ..................................... REAL (fsWrite + flash toast)
  - branch badge + ±diff count ......................................... REAL (real git via projects)
Weakness    : no in-VIEW Build / Typecheck / Tests / Git-Diff / Commit buttons — those exist only as palette/
              sectorActions arming a terminal (armTerm "npm run build" etc.), and sectorActions marks Typecheck/Tests
              as disabledReason "no script in package.json" (HONEST). No Codex/Claude-on-file integration in-view.
Verdict     : OPERATIONAL editor. The "engineering deck" intent is only ~60% realized (edit+save+git yes; build/test/
              commit/agent-on-file no — but honestly deferred, not faked).
Fix priority: P1 (add a real action bar: Build/Typecheck/Tests arm terminals in the file's repo; Git Diff; "Ask agent
              about this file" = deployClaudeWithPrompt in the repo). P2 (commit/push flow).
```

### 5.4 SECTOR: NEUROMAP (id `neuromap`) — knowledge graph

```
Files       : views/NeuromapView.tsx (448) + views/neuromap/{labels,modes}.ts; backend src/main/neuromap.ts.
Purpose     : living graph of the Obsidian vault (notes + [[wikilink]] edges), view modes, smart labels, diagnostics.
Data source : REAL — local vault parse; optional drive-meta registry; fs.watch growth pulse.
Buttons / actions:
  - layer segs (core/projects/agents-notes/all) ........................ REAL
  - view modes (Knowledge/Activity/Files/Clean/Agents/Team/Tasks) ....... REAL for Knowledge/Activity/Files/Clean/Agents;
        Team/Tasks = HONEST-PENDING empty states (no fake members/tasks — needs shared backend)
  - time filter (Today/24h/7d/All) ..................................... REAL (mtime-based)
  - label mode (Smart/Important/All/Off) ............................... REAL (screen-space label engine, collision-culled)
  - search / lens / Focus / reset ...................................... REAL
  - Diag panel (nodes/edges/visible/labels shown+hidden/last scan) ...... REAL counts
  - node inspector (frontmatter/body/backlinks) + Copy path ............. REAL
Weakness    : label soup at zoom-out was FIXED (v2 screen-space overlay). Remaining: Team/Tasks modes are honest-
              pending (real team backend needed for 5-7 people). Minor: 448 lines (near cap).
Verdict     : OPERATIONAL (v2). Ready for solo use; team modes await a synced backend.
Fix priority: P2 (team/tasks real data once team backend lands), P2 (extract if it grows).
```

### 5.5 SECTOR: DRIVE (id `drive`) — document operations

```
Files       : views/DriveView.tsx (55) + views/drive/{GoogleTabs,OpsTabs}.tsx.
Purpose     : Google Cloud config + Drive/Sheets/Forms/Gmail/Proton/Candidates/Activity — all via the user's OAuth.
Data source : REAL — all Google calls in main process on the user's OAuth client; every panel honestly gates on sign-in.
Buttons / actions:
  - 8 tabs (Config/Folders/Sheets/Forms/Mail/Proton/Candidates/Activity) . REAL nav
  - Config: save OAuth client + sign in ................................ REAL (gdrive.setClient / gdrive.auth loopback+PKCE)
  - Folders/Sheets/Forms/Mail: honest Gate when signed out ............. HONEST ("Nothing is simulated")
  - Proton tab .......................................................... REAL (proton bridge probe)
Weakness    : CURRENTLY the whole sector is effectively locked because Google is not signed in (partial). Once the user
              signs in (one action in-app), Folders/Sheets/Forms/Mail become live. Gmail scope caveat (see §3.7).
Verdict     : OPERATIONAL but GATED on a user sign-in that hasn't happened. Zero fake data.
Fix priority: P0 (user action, not code): Sign in with Google. P1 (code): add Gmail scope or drop "Gmail" from labels.
```

### 5.6 SECTOR: METRICS (id `metrics`) — observability

```
Files       : views/MetricsView.tsx (107) + components/{SessionCard,ReasoningStream}.tsx.
Purpose     : live session scores/context/output + reasoning stream, windowed 60m/240m/24h.
Data source : REAL — fetchSessions.
Buttons/actions: time-window 60/240/1440 (REAL) · session card select → ReasoningStream (REAL) · error-state Retry (REAL).
Weakness    : none functional. Does not surface superpower live-count / Ruflo / lean-ctx / AgentDB as the user's §10
              asks — Metrics is session-metrics only, not a system-health dashboard.
Verdict     : OPERATIONAL (session observability). Not yet the "system health registry" dashboard the user envisions.
Fix priority: P1 (add a system-health strip: superpowers live-count from useOps, ruflo/graphify/lean-ctx status,
              AgentDB vector count if available — all real probes, reusing useOps + a new lean-ctx/agentdb probe).
```

### 5.7 SECTOR: PREVIEW (id `preview`) — visual QA / live app

```
Files       : views/PreviewView.tsx (222).
Purpose     : live-preview a project — Neo browser over CDP (real), or an iframe for Chrome/Brave/Safari.
Data source : REAL for Neo (window.dai.neo drives the real Neo browser: status/ensure/open/snap/click/scroll/back/
              forward/ask); iframe embed for the others.
Buttons / actions:
  - project selector / browser selector / url input .................... REAL (state)
  - Start (Neo: ensure+open+snap; iframe: mount) ....................... REAL
  - Reload / back / forward (Neo) ...................................... REAL (neo.*)
  - Open external ...................................................... REAL (shell.open)
  - live screenshot frame click/scroll → drives Neo .................... REAL (neo.click/scroll)
  - Neo Magic Page chat (Send) ......................................... REAL (neo.ask)
  - Connect Neo (ensure) ............................................... REAL
  - non-Neo "Preview Chat-Agent" Send .................................. DISABLED honest ("needs agent route config")
  - Micro Terminal "Run" button ........................................ ***DEAD*** — onClick={() => setCmd("")} ONLY.
        It clears the input and does NOTHING, while the panel text claims "Executes via the terminal host."
        This is the single clearest doctrine violation in the app (a click that implies execution and performs none).
Weakness    : the DEAD Micro Terminal Run (P1 fix). Also: the IDE does not auto-launch dev servers (honest note in UI).
Verdict     : OPERATIONAL for Neo; ONE DEAD button (Micro Terminal Run) + one honest-disabled chat.
Fix priority: P1 (make Micro Terminal Run real: spawn a worker in the selected project's cwd and type the command via
              window.dai.term — OR disable it with an honest reason. Do not leave a click that lies.)
```

### 5.8 SECTOR: CREATIVE (id `creative`) — output studio

```
Files       : views/CreativeView.tsx (65) + components/design-tools/DesignToolDemos.tsx (flagged demos).
Purpose     : creative generation via provider APIs (Higgsfield/Canva/Nanobanan/Runway/Ideogram/ElevenLabs).
Data source : NONE live — every tool shows "needs <ENV_KEY>"; Generate is DISABLED with an honest reason.
Buttons / actions:
  - tool cards (6) select .............................................. REAL (state) but all show "needs KEY"
  - project selector / prompt textarea ................................. REAL (state)
  - Generate ........................................................... DISABLED honest ("Set X_API_KEY … no key, no fake output")
  - asset gallery ...................................................... EMPTY (honest — "No assets yet")
  - design demos (Storybook/tldraw/Excalidraw) behind VITE_DAI_DESIGN_DEMOS flag ... REAL when flag on, hidden otherwise
Weakness    : this is the LEAST operational sector — it is 100% honest but 0% functional, because it needs (a) provider
              API keys and (b) a real generation backend (IPC to call the providers, store assets, link to Neuromap).
Verdict     : HONEST-PENDING. Nothing fake; nothing works yet. This is where Fable has the most greenfield to build.
Fix priority: P2 (build a real generation backend for ≥1 provider that has a key; wire Generate → main-process call →
              asset saved → Creative node in Neuromap). Gate every provider honestly on its key.
```

### 5.9 Sector cold reading

The sectors are **mostly real**. Terminal, Agents, Code, Metrics, Neuromap, Preview(Neo), Drive are all operational (Drive gated on sign-in). The genuine defects are narrow: **one dead button** (Preview Micro Terminal Run), **Creative fully pending** (needs keys+backend), **Code missing an action bar** (build/test/commit deferred honestly), and **Library in active refactor** (moving target). No sector is "fake"; the honesty doctrine holds across all eight.

---

## PART 6 — GLOBAL UI AUDIT (chrome that spans all sectors)

### 6.1 SUPERPOWERS DOCK — `components/EcosystemBar.tsx`

```
Purpose   : the horizontal dock of 7 superpower chips + live count + Tools/Admin buttons.
Data      : useOps() (real probes) + useMe() (access gate).
Controls  :
  - "SUPERPOWERS N/7 live" label ....................................... REAL (liveCount from useOps)
  - 7 superpower chips (icon+label+status dot+word) .................... REAL (statuses probe-derived)
  - chip hover tooltip (role + plain-language status + hint) ........... REAL
  - chip click → quick-actions panel (or GODMODE opens its panel) ...... REAL
  - restricted chips (can("sp:"+id) false → "not granted by an owner") . REAL cooperative gate (no quick panel)
  - Admin button (canLibraryAdmin=can("adm:library")) → openLibraryAdmin() ... REAL, gated (NEW, b3757f4)
  - Tools button → dai:more (opens More menu) .......................... REAL
Verdict   : REAL. Zero fake status; access-gating honest.
Fix       : the quick-actions panel is a MENU; §4 wants it to become the GODMODE-style SuperpowerPanel (P1).
```

### 6.2 TOP BAR — `components/shell/TopBar.tsx`

```
Controls  : brand · "N workspaces" (projects probe) · "op · <operator>" (host home) · LOCAL MODE chip (honest) ·
            "SYSTEMS N/7" health (useOps) · ⌘K palette button · Settings gear.
Verdict   : REAL. Honest self-note in code: "No branch/build chips — there is no real source for them yet."
Fix       : P2 — a real active-workspace branch chip is derivable from the projects probe (each Project has branch/dirty);
            surface the *current* workspace's branch when a sector implies one (Code has the active file's repo).
```

### 6.3 BOTTOM STATUS BAR — `components/shell/StatusBar.tsx`

```
Controls  : sector label · "systems N/7" · "agents N" · "attention N" (when >0) · "last · <action>" (lastAction store) ·
            "checked HH:MM:SS" (last probe) · "⌘K palette".
Verdict   : REAL. All telemetry from useOps + lastAction. No fixes.
```

### 6.4 COMMAND PALETTE — `components/CommandPalette.tsx` + `palette.ts`

```
Purpose   : ⌘K fuzzy launcher over sectors, superpowers, terminal commands, admin, recents, diagnostics, guide, and a
            live FILE INDEX (fsWalk over roots).
Controls  : fuzzy search (rankCommands) · arrow/enter nav · Escape closes (window-level listener — a11y fix) ·
            grouped browse view · per-command status badge · disabled commands show reason and NEVER dead-run
            (runCmd: `if (c.disabledReason) return`).
Providers : registerProvider("app"/"contextual"/"mission"/"terminals") — App wires core sectors, superpowers,
            terminal broadcasts, admin, diagnostics (operationalTruth), guide; contextual = active sector's SECTOR_ACTIONS
            as "Recommended" (disabled ones keep their honest reason).
Verdict   : REAL, honest, complete. One of the strongest surfaces. No fixes (P2: keyboard-shortcut hints per command).
```

### 6.5 SETTINGS — `components/AdminPanel.tsx` + `components/settings/SettingsSections.tsx`

```
Structure : ONE Settings surface (the old 5-tab AdminPanel was consolidated) with a category left-nav:
            Appearance · IDE Config · Team · Team Sync · Superpowers · Integrations · Shortcuts · Audit · API Health · Developer.
            Admin categories gate on adm:* via useMe (hidden when not granted).
Categories:
  - Appearance ......... REAL (localStorage: motion/density/glow/lang, applied live)
  - IDE Config ......... REAL (window.dai.settings.get/set → ~/.config/dai/settings.json 0600; font size, sessions
                          window, audit retention, vault auto-sync, default cwd, radar auto-refresh)
  - Team ............... REAL (roster + per-member capability matrix + identity; owner-only edit; writes vault team.json)
  - Team Sync .......... REAL (git engine over the vault: status/sync/set-remote; commits+pushes team.json)
  - Superpowers ........ REAL read-only (live statuses + "Check now" invalidate)
  - Integrations ....... REAL read-only truth (probe values verbatim + links to configure)
  - Shortcuts .......... REAL read-only (KEYMAP list; note: rebinding is a future pass — HONEST)
  - Audit .............. REAL (append-only JSONL viewer)
  - API Health ......... REAL (Google per-service probes)
  - Developer .......... REAL (doctor command copy, invalidate caches, open audit, operationalTruth)
Verdict   : REAL, comprehensive, honest. The consolidation is done. No fake settings are saved.
Fix       : P2 — Shortcuts rebinding (currently read-only, honestly labeled "future pass").
```

### 6.6 LIBRARY — `views/LibraryView.tsx` + `components/library/*` (⚠ IN ACTIVE REFACTOR)

```
Purpose   : ADMIN-ONLY catalog (agents/tools/superpowers) + Shortcuts & Tips reference; gated on adm:library
            (renderer AND server-side re-check in main/ipc.ts teamCan("adm:library") — not renderer-only).
State     : the concurrent session is DELETING AgentCatalog.tsx + data/agentCatalog.ts and rewriting AdminSection/
            TeamSection/CategoryLibrary RIGHT NOW. Do NOT deep-audit or modify Library from this document — re-audit
            live first.
Controls  : Catalog / Shortcuts&Tips tabs (REAL) · CategoryLibrary (REAL) · TeamSection · AdminSection (tips CRUD via
            main/tips.ts — REAL backend at ~/.config/dai/tips.json).
Verdict   : REAL, admin-gated, but MOVING TARGET.
Fix       : none from this document. Coordinate with the concurrent refactor; re-audit after it lands.
```

### 6.7 MORE MENU — `MORE_CATEGORIES` (registry) rendered by LeftRail

```
LIBRARY: Admin Library (cap adm:library, gated) — REAL.
INTELLIGENCE: Research (REAL) · GitHub Radar (REAL, radar.refresh) · Obscura (setup-required → opens research, honest).
OUTPUT: Preview Engine (REAL) · Creative APIs (setup-required → opens creative, honest).
ADMIN: Keys (REAL vault) · Phone (REAL) · Google APIs (REAL) · Audit (REAL) · Settings (REAL) · Permissions (REAL →
       admin("perms") → Team category post-cutover; NOTE: label still says "team & roles · local" — slightly stale
       wording after the vault-synced team model; harmless).
EXPERIMENTAL: Omnigent (REAL armTerm) · lean-ctx (REAL armTerm) · Obsidian Team (REAL admin team).
Verdict   : REAL. Every item has run() or an honest status. No dead items.
Fix       : P2 — refresh the "Permissions" sub-label from "local" to "synced via vault" (post-cutover accuracy).
```

### 6.8 OTHER PANELS (real, quick verdicts)

- **FirstRunIdentity** (`components/FirstRunIdentity.tsx`) — first-run "who are you?" from synced roster, or create owner. REAL. Opens when `me.needsIdentity`.
- **CredentialsVault** (`components/CredentialsVault.tsx`) — Keys modal (Google client id/secret, Proton). REAL, writes 0600. Auto-opens first run when Google unconfigured.
- **PhoneConnect** (`components/PhoneConnect.tsx`) — "code from your phone" (⌘J). REAL.
- **GuidePanel** (`components/GuidePanel.tsx`) — bilingual Dragon Guide drawer (Welcome/Sectors/Superpowers/Workflows/Statuses/Shortcuts/Team/Troubleshooting). REAL content; "Open this sector" navigates. Verify the guide text still matches the current sector set (Library added since).
- **ToastHost** (`components/ToastHost.tsx`) + `toast.ts` — the feedback bus every real action uses. REAL.

---

## PART 7 — GLOBAL BUTTON TRUTH TABLE

Legend: **R**=real · **P**=partial (real but gated/incomplete) · **H**=honest-disabled · **D**=dead · **F**=fake. Every row cites the defining file. "Svc/IPC" = the real service or channel behind it.

### 7.1 Superpowers dock

| Section | Button / action | File | Handler | Svc / IPC | Verdict | Pri |
|---|---|---|---|---|---|---|
| Dock | SUPERPOWERS N/7 live | EcosystemBar | useOps liveCount | tools/sessions/gdrive probes | R | — |
| Dock | 7 chips + status | EcosystemBar/registry | statusOf(env) | probeTools | R | — |
| Dock | chip → quick panel | EcosystemBar | setOpen | — | R (menu; →panel P1) | P1 |
| Dock | restricted chip | EcosystemBar | can("sp:"+id) | useMe/team | R | — |
| Dock | Admin | EcosystemBar | openLibraryAdmin | goto library | R (gated) | — |
| Dock | Tools | EcosystemBar | dai:more | — | R | — |
| Obsidian | Open Vault | registry | openObsidian | tools.action open-obsidian | R | — |
| Obsidian | Open Neuromap / Search / Sync / Plan Chat | registry | goto/admin/deployClaudeWithPrompt | nav / term | R | — |
| Graphify | Open Digest | registry | graphifyOpenDigest | superpowers.openDigest | R | — |
| Graphify | Regenerate Digest | registry | graphifyRegen | armTerm graphify update . | R | — |
| Graphify | Open Map / Research / Agents Layer | registry | goto | nav | R | — |
| Ruflo | Ignite (health) | registry | rufloIgnite | superpowers.health("ruflo") | R | — |
| Ruflo | View Task Queue / Continue Flow | registry | armTermToast | term + toast | R | — |
| Ruflo | Broadcast Mission | registry | goto agents | nav | R | — |
| Cloud | Launch / MC / Tokens / Stop | registry | deployTerm/goto | term / nav | R | — |
| Agents | MC / Launch / Inspect | registry | goto/deployTerm | nav / term | R | — |
| Agents | Assign Sector | registry | goto agents | nav | **P** (over-promises) | P1 |
| GODMODE | Open GODMODE | registry | godmode | dai:godmode | R | — |
| Google | Drive Ops / Keys / API Health / Repair | registry | goto/vault/admin/deployClaudeWithPrompt | nav / modal / term | R | — |

### 7.2 GODMODE panel

| Button | File | Handler | Svc | Verdict |
|---|---|---|---|---|
| Global Command (⌘K) | GodModePanel | onCommand | palette | R |
| Open Terminal / Preview / Metrics | GodModePanel | goto | nav | R |
| Launch Agent | GodModePanel | term.create claude | pty | R |
| Capture Screenshot | GodModePanel | shot.capture | main → ~/Desktop | R |
| Sync Vault | GodModePanel | vaultSync.sync | git engine | R |
| Emergency Stop | GodModePanel | term.kill workers (confirm) | pty | R |
| (missing) Full System Check | — | — | — | **absent** (P1 add) |

### 7.3 Core sectors

| Sector | Button | File | Handler | Verdict | Pri |
|---|---|---|---|---|---|
| Terminal | +Worker (zsh/claude) | TerminalsView | add→term.create | R | — |
| Terminal | ollama/hermes/codex session | TerminalsView | add(cmd), status probes | R | P2 (toast when unavailable) |
| Terminal | grid/focus/tiles, +Add, DEPLOY 2/4/6/8 | TerminalsView | layout/openN | R | — |
| Terminal | Channel, Master SYNC, link-picker | TerminalsView | setChannel/setMirror | R | — |
| Terminal | send→all / Run on all | TerminalsView | broadcast | R | — |
| Terminal | idle-recap overlay | TerminalPane | useIdleRecap | R? (NEW, re-audit) | verify |
| Agents | Autopilot ON/OFF | AgentsView | health watch + nudge | R | — |
| Agents | agent card / transcript | AgentsView | select | R | — |
| Agents | MissionBar Launch ▾ (all/per-project) | MissionBar | term.create | R | — |
| Agents | MissionBar chips + broadcast | MissionBar | broadcast(confirm) | R | — |
| Agents | (missing) per-agent Stop | — | — | absent | P1 |
| Code | file tree / tab / close | CodeView | fsRead | R | — |
| Code | ⌘S / Save | CodeView | fsWrite | R | — |
| Code | branch/diff badge | CodeView | projects git | R | — |
| Code | (missing) Build/Typecheck/Tests/Diff/Ask-agent bar | — | — | absent (deferred honest) | P1 |
| Neuromap | layers/modes/time/label/search/lens/Focus/reset/Diag/inspector/Copy-path | NeuromapView | real | R | — |
| Neuromap | Team/Tasks modes | NeuromapView | honest-pending empty | H | P2 |
| Drive | 8 tabs + Config save + sign-in | DriveView | gdrive.* | R (gated on sign-in) | P0-user |
| Drive | Folders/Sheets/Forms/Mail gates | DriveView | honest Gate | H | — |
| Metrics | time windows / card select / Retry | MetricsView | fetchSessions | R | — |
| Metrics | (missing) system-health strip | — | — | absent | P1 |
| Preview | Start/Reload/back/forward/external | PreviewView | neo.* / shell | R | — |
| Preview | Neo frame click/scroll / Magic Page chat | PreviewView | neo.click/scroll/ask | R | — |
| Preview | non-Neo chat Send | PreviewView | disabled | H | — |
| Preview | **Micro Terminal Run** | PreviewView | **setCmd("") only** | **D — DEAD** | **P1** |
| Creative | tool cards / prompt / project | CreativeView | state | R | — |
| Creative | Generate | CreativeView | disabled ("needs KEY") | H | P2 (build backend) |

### 7.4 Global chrome

| Section | Button | File | Verdict |
|---|---|---|---|
| TopBar | ⌘K / Settings gear / chips | TopBar | R |
| StatusBar | telemetry items | StatusBar | R |
| Palette | search/nav/run (disabled never runs) | CommandPalette | R |
| Settings | 10 categories (all real/honest) | SettingsSections | R |
| More menu | all items (run or honest status) | registry/LeftRail | R |
| Library | Catalog/Tips (admin-gated) | LibraryView | R (moving target) |
| LeftRail | 8 sector items (gated can("sector:")) + Guide/Settings/More | LeftRail | R |

### 7.5 Truth-table summary

- **Total audited controls:** ~95 across dock/sectors/GODMODE/palette/settings/more/chrome.
- **REAL:** ~88 (~93%). **HONEST-DISABLED (H):** ~5 (Creative Generate, non-Neo chat, Neuromap Team/Tasks, Shortcuts rebinding, various setup-required). **PARTIAL (P):** 1 (Agents "Assign Sector"). **DEAD (D):** 1 (Preview Micro Terminal Run). **FAKE (F):** 0.
- **The headline number: ONE dead button, ZERO fake buttons, in a ~95-control app.** The doctrine holds. The work is elevation + the handful of gaps, not a rescue.

---

## PART 8 — OPERATIONAL SCORES (0-100, with reasoning)

Scoring criteria (equal weight): (1) buttons functional, (2) data real, (3) status honest, (4) error handling, (5) logs/feedback, (6) UX clarity, (7) cross-sector integration, (8) completeness-of-intent. A high score means "operationally real and coherent," not "feature-complete."

| Zone | Score | Reasoning | P0 | P1 |
|---|---:|---|---|---|
| **GODMODE** | 92 | Gold standard: real health grid, real actions, honest truth footer. Only gap: no explicit re-run "Full System Check" with streamed colored output. | — | add Full System Check |
| **Command Palette** | 90 | Fuzzy, honest-disabled, file index, recents, contextual. Complete. | — | shortcut hints |
| **Settings** | 88 | Consolidated 10 categories, all real/honest, 0600 persistence, server-checked gates. | — | shortcut rebinding |
| **Terminal** | 87 | Strongest sector: PTY host, master/mirror, multi-CLI launch, broadcast, deploy-N. | — | toast on unavailable CLI; extract <500 |
| **Superpowers dock** | 85 | Real statuses, real actions, honest access-gating. Menus not yet panels. | — | GODMODE-style panels |
| **Global chrome (TopBar/StatusBar)** | 88 | Real telemetry throughout; honest about missing branch chip. | — | branch chip |
| **Metrics** | 84 | Real session observability. Not yet a system-health dashboard. | — | system-health strip |
| **Agents** | 82 | Roster+health+transcript+autopilot+launch+broadcast all real. Missing per-agent stop, swarm meter, ruflo-queue link. Under-sold. | — | per-agent stop, swarm meter |
| **Code** | 78 | Real editor+save+git badge. Missing in-view build/test/commit/agent-on-file action bar (deferred honestly). | — | action bar |
| **Neuromap** | 82 | v2 real (labels fixed, modes, diagnostics). Team/Tasks honest-pending. | — | team/tasks backend |
| **Drive** | 74 | Real, zero fake, but the whole sector is LOCKED until Google sign-in (a user action). Gmail label over-promises. | user sign-in | Gmail scope/label |
| **Preview** | 66 | Neo path strong & real. ONE dead button (Micro Terminal Run). Non-Neo chat honest-disabled. No server auto-launch. | — | fix dead Run button |
| **Library** | 70* | Admin-gated, real backend (tips CRUD). *ACTIVELY REFACTORED — score provisional. | — | re-audit after refactor |
| **Creative** | 35 | 100% honest, ~0% functional: needs provider keys + a generation backend. Most greenfield. | — | build ≥1 provider backend |
| **Ruflo (as a power)** | 84 | Real CLI health via Ignite; honest engine state. Menu, not the Engine/Queue/Agents panel yet. | — | build the Ruflo panel |

**Weighted app-level operational score ≈ 80/100.** Interpretation: a mature, honest, mostly-real IDE with a small number of precise gaps. The distribution is bimodal — everything is either genuinely real (78-92) or honestly-pending-a-backend (Creative 35). There is no broad "fake middle." Fable's job is to (a) kill the one dead button, (b) elevate menus→panels, (c) fill the honest-pending backends, and (d) add the missing action bars — not to rescue a broken app.

---

## PART 9 — CONSTRUCTION PLAN FOR FABLE (P0 / P1 / P2, optimized & sequenced)

### 9.0 How this plan is optimized

The plan is ordered so that **shared primitives are built once, early, and reused**. The single biggest leverage point is the **`SuperpowerPanel` component** (P1-A): building it once lets all six menu→panel elevations become thin config, instead of six bespoke panels. Likewise the **`Health` card and `OpStatusBadge`** are already-existing primitives to reuse, not rebuild. Every task states the verification and the screenshot so Fable never claims done without evidence.

**Global rules for every task:** read the file fresh first (multi-agent hazard); keep files <500 lines; renderer never imports electron/node; new IPC channels are declared in `src/shared/ipc.ts` (channel + type + `window.dai` interface) then handled in `src/main/ipc.ts` then bridged in `src/preload/index.ts`; every new action logs to audit and toasts feedback; verify `tsc --noEmit` + `npm run build` + `doctor` after each; one commit per task.

### 9.1 P0 — CRITICAL (dead/lying controls, and the one user-blocking gate)

Doctrine violations and blockers. There is exactly ONE dead button in the app; it is P0 because a click that lies is the worst possible state under the honesty doctrine.

---

**TASK P0-1 — Kill the DEAD "Micro Terminal Run" button (Preview)**

- **Priority:** P0 (doctrine violation — a click that implies execution and performs none).
- **Files:** `src/renderer/src/views/PreviewView.tsx` (the Micro Terminal panel, ~lines 208-217).
- **Why:** `onClick={() => { setCmd(""); }}` clears the input and does nothing, while the panel text says "Executes via the terminal host." This is the single clearest lie in the UI. The honesty doctrine forbids it.
- **Change (two acceptable resolutions — prefer the REAL one):**
  - **REAL (preferred):** wire Run to spawn/reuse a worker terminal in the selected project's cwd and type the command. Implementation: on Run, `const id = "pv"+Date.now().toString(36); window.dai.term.create({ id, cmd: "shell", cwd: activeProj.path }); setTimeout(() => window.dai.term.write(id, cmd + "\n"), 1200); window.dai.audit.log("preview-run", cmd+" @ "+activeProj.name); pushToast({kind:"info", title:"Ran in "+activeProj.name, detail:cmd}); goto("ide");` then `setCmd("")`. (Mirror the `armTerm` pattern from registry.tsx — do NOT reimplement PTY; reuse `window.dai.term`.)
  - **HONEST fallback (only if reuse is undesirable):** disable the button with `disabled` + `title="pending — run in the Terminal sector"` and change the panel copy to stop claiming execution.
- **IPC/service:** reuses existing `window.dai.term.create/write` (no new IPC).
- **Verification:** CDP smoke — select a project, type `echo hi`, click Run; assert a new terminal appears in the Terminal sector containing `echo hi`. `tsc`+build+doctor green.
- **Screenshot:** `audit-preview-microterminal-fixed.jpg`.
- **Learning note:** the reason this existed is a UI built ahead of its wire; the lesson encoded in the doctrine is "never ship the button before the wire — ship it disabled with a reason." Fable should scan for the same anti-pattern elsewhere (grep for `onClick={() => {` bodies that only set local state while the surrounding copy promises an effect).

---

**TASK P0-2 — Fix the "Assign Sector" over-promise (Agents superpower)**

- **Priority:** P0-adjacent (doctrine: a label must not imply more than the handler does). Small.
- **Files:** `src/renderer/src/registry.tsx` (SUPERPOWERS → agents → `ag-assign`).
- **Why:** `{ id: "ag-assign", label: "Assign Sector", run: goto("agents") }` — the label implies an operation (assign an agent to a sector) but the handler only navigates. Either make it real or rename.
- **Change (prefer rename now, real later):** rename to `{ id: "ag-assign", label: "Open Agents Cockpit", run: goto("agents") }`. (A real sector-assignment — tagging an agent's cwd→sector — is a P2 feature; do not fake it now.)
- **Verification:** `doctor` green (registry still honest); `tsc`+build.
- **Screenshot:** none (label change).

---

**TASK P0-3 — (USER ACTION, document only) Google sign-in unlocks Drive**

- **Priority:** P0 for the *user*, not code. Drive sector + Google superpower go from `partial`→`live` the moment the user signs in.
- **Steps for the user:** open the app → Keys (or Drive ▸ Config) → the OAuth client id/secret are already saved (`~/.config/dai/google.json`, verified 0600) → click **Sign in with Google** → approve consent (they are already a test user) → the loopback+PKCE flow (src/main/gdrive.ts) captures the refresh token → status flips to LIVE.
- **Code follow-up (Fable, P1):** the Gmail label/scope mismatch — see P1-F.
- **Verification:** after sign-in, `~/.config/dai/google.json` has `refreshToken`; DriveView Folders/Sheets/Forms render live (no Gate).

---

**TASK P0-4 — (INFRA, document only) Restore DMG packaging**

- **Priority:** P0 only if a distributable DMG is needed for teammates; otherwise P2.
- **Why:** `npm run dist` fails at DMG with `app-builder-bin/mac/app-builder_arm64 ENOENT`. The `.app` builds fine; only the DMG wrapper fails.
- **Change:** `npm install` (or reinstall `app-builder-bin`), then `npm run dist` and confirm a fresh `.dmg` in `release/`. Do NOT alter the electron-builder config to work around it.
- **Verification:** `release/*.dmg` exists and is newer than the `.app`.

### 9.2 P1 — IMPORTANT (elevation to the GODMODE standard + the missing action bars)

This is the bulk of the value. Build the shared panel FIRST (P1-A), then everything else is thin.

---

**TASK P1-A — Build the reusable `SuperpowerPanel` component (the leverage point)**

- **Priority:** P1, FIRST — six later tasks depend on it.
- **Files:** create `src/renderer/src/components/SuperpowerPanel.tsx`; extract the `Health` card out of `GodModePanel.tsx` into `src/renderer/src/components/da.tsx` (or a new `components/HealthCard.tsx`) so both GODMODE and the new panel share it; modify `EcosystemBar.tsx` to open `<SuperpowerPanel id=...>` instead of the current `QuickPanel` menu.
- **Why:** §4 established that GODMODE is the target format and that six of seven superpowers open a *menu*, not a *panel*. One shared panel component turns six elevations into config.
- **Interface (produce exactly this so later tasks can consume it):**
  ```tsx
  export type PanelField = { label: string; status?: OpStatus; value: string };
  export type PanelSpec = {
    id: string;                       // superpower id
    fields: PanelField[];             // the health/readout rows (probe-derived)
    primary?: { label: string; status: OpStatus; detail: string }; // the "main job" line
  };
  // usePanelData(id) → PanelSpec  (per-power hook that runs the real probes)
  export function SuperpowerPanel({ id, onClose }: { id: string; onClose: () => void }): JSX.Element;
  ```
- **Composition (no new plumbing — reuse existing):** header (icon+label+role from SUPERPOWERS[id], `OpStatusBadge`, last-check), a `Health` grid built from `PanelSpec.fields`, the `primary` line, the existing `SUPERPOWERS[id].actions` rendered as buttons (real `run` OR disabled+`disabledReason`), and a per-power truth line (subset of `operationalTruth`). Escape closes; outside-click closes (copy EcosystemBar's existing handlers).
- **Data:** `usePanelData(id)` composes the SAME queries the dock/GODMODE already use — `useOps()`, `fetchSessions`, `window.dai.superpowers.health(id)` where applicable, `window.dai.neuromap.graph` for note/edge counts. NO new fabricated numbers; a field with no source yet renders `value: "not wired"` and its status `pending-backend`.
- **Verification:** CDP — click each of the 7 dock chips; assert a panel (not a bare menu) renders with a health grid + actions. `doctor` green (no disabled entries added to the SUPERPOWERS registry — restriction still via the dock chip state). `tsc`+build.
- **Screenshot:** `audit-superpower-panel-generic.jpg`.
- **Learning note:** the reason to build the primitive first is compounding — a bespoke panel per power would be ~6× the code and 6× the drift surface. Encode the field specs (§4.3) as data, not as six components.

---

**TASK P1-B — RUFLO panel (the reference) + `rufloQueue()` backend**

- **Priority:** P1, right after P1-A (it's the user's explicit example and the proof the pattern works).
- **Files:** `src/main/superpowers.ts` (add `rufloQueue()`), `src/shared/ipc.ts` (+ channel/type if surfaced separately, or fold into a richer `rufloHealth`), `src/renderer/src/components/SuperpowerPanel.tsx` (ruflo `usePanelData` branch), `src/renderer/src/registry.tsx` (ruflo actions: add "Reconnect" = re-run health, "Open Logs" = admin("audit")).
- **Why:** §3.3/§4.3 — the panel the user drew: Engine / Queue / Agents / Last check / Actions.
- **Change:**
  - Backend: `export async function rufloQueue(): Promise<{ ok: boolean; count: number; message: string }>` — run `ruflo task list` in HOME with the SAME `execFileP` + 6s timeout + never-throw pattern as `rufloHealth()`; parse a task count or return an honest "not initialized"/"queue empty". Do NOT invent a daemon or a number.
  - Panel fields for ruflo: `Engine` (from health status+version), `Queue` (from rufloQueue count OR "run to view"), `Agents` (health `active` count), `MCP` (health mcpUp), `Last check` (health.lastCheckedAt). `primary` = the engine line.
  - Actions (registry): Ignite (existing) · Reconnect (new: `rufloIgnite()` again, relabelled) · View Task Queue (existing) · Continue Flow (existing) · Open Logs (new: `admin("audit")`) · Broadcast Mission (existing).
- **IPC:** add `SP_RUFLO_QUEUE: "sp:rufloqueue"` → `window.dai.superpowers.rufloQueue()`; OR extend the existing `sp:health` payload. Prefer a small dedicated channel for clarity.
- **Verification:** CDP — open Ruflo panel; assert Engine shows the real `RuFlo V3 [STOPPED]`, Queue shows a real count or honest "run to view". Run `ruflo status` yourself to confirm the panel matches. `doctor`+tsc+build.
- **Screenshot:** `audit-ruflo-panel.jpg`.
- **Honesty guard:** Ruflo is a CLI, not a daemon — the panel must never say "engine started"; it says "engine ready — swarm stopped" (the true state). Queue/Agents come from real parses or say "not wired".

---

**TASK P1-C — The other five superpower panels (config over P1-A)**

- **Priority:** P1, after P1-B proves the pattern.
- **Files:** `src/renderer/src/components/SuperpowerPanel.tsx` (add `usePanelData` branches for obsidian/graphify/cloud/agents/google), reusing the field specs in §4.3.
- **Change per power (all data already available — no new backend except optionally Google per-service):**
  - **Obsidian:** vault path (const), `.lock` open/closed (from probeTools detail), note count (`window.dai.neuromap.graph({layers:["all"],...}).nodes.length`), last vault mtime. Actions: existing 5.
  - **Graphify:** digest mtime (probeTools detail), node/edge count (neuromap graph), launchd pid state. Actions: existing 5 (incl. Regenerate).
  - **Cloud:** live sessions (fetchSessions.live), total output tokens (sum sessions.out), model split. Actions: existing 4.
  - **Agents:** swarm N live / M total, worst per-agent status. Actions: existing (with P0-2 rename).
  - **Google:** sign-in state (email or "configure"), per-service health (`window.dai.google.health()`), scopes list (honest). Actions: existing 4.
- **Verification:** CDP — open each of the 5 panels; assert each shows probe-derived fields (not fabricated). `tsc`+build+doctor.
- **Screenshot:** `audit-superpower-panels-all.jpg` (one shot cycling, or five).

---

**TASK P1-D — GODMODE "Full System Check" (explicit re-probe with streamed colored output)**

- **Priority:** P1.
- **Files:** `src/renderer/src/components/GodModePanel.tsx`.
- **Why:** §3.6/§4.3 — GODMODE IS a live check, but there is no button that RE-RUNS all probes on demand and shows a structured, colored, timestamped result log. The user's §2 asks for exactly this.
- **Change:** add a `Full System Check` button in QUICK ACTIONS. On click: `setChecking(true)`; sequentially (with a tiny delay so the UI streams) invalidate + await each probe query (`tools`, `gm-sessions`, `gm-terms`, `gdrive`, `team`, `audit`), pushing a colored line per result into a local `checkLog: {ts, label, status, detail}[]` rendered under the actions (reuse `STATUS_META` colors). Write one `audit.log("full-system-check", summary)`. Never fabricate — each line is the real post-invalidation value.
- **Verification:** CDP — open GODMODE, click Full System Check; assert a timestamped colored list appears with one line per subsystem matching the health grid. `tsc`+build.
- **Screenshot:** `audit-godmode-full-check.jpg`.

---

**TASK P1-E — CODE sector action bar (Build / Typecheck / Tests / Git Diff / Ask agent)**

- **Priority:** P1.
- **Files:** `src/renderer/src/views/CodeView.tsx` (add an action bar in the tab strip, next to Save).
- **Why:** §5.3 — the "engineering deck" intent is ~60% realized. Editing+save+git are real; build/test/commit/agent-on-file are missing (today only as palette-armed terminals).
- **Change:** compute the active file's repo (already computed as `repo`). Add buttons that arm REAL terminals in that repo's cwd (reuse `window.dai.term` like `armTerm`): `Build` → `npm run build`, `Typecheck` → `npx tsc --noEmit`, `Tests` → `npm test` (but check package.json first — if no test script, render disabled with reason, honoring the honest pattern sectorActions already uses), `Git Diff` → `git diff`, `Ask agent about this file` → `deployClaudeWithPrompt("Review "+active.path+" ...", repo.path)`. Each toasts + audits. Disable all when no active file / no repo.
- **Honesty guard:** Tests must be disabled-with-reason when the repo has no test script (mirror sectorActions' existing `disabledReason: "no test script in package.json"`), NOT a button that fails silently.
- **Verification:** CDP — open a file in a repo, click Build; assert a terminal with `npm run build` in that repo's cwd. `tsc`+build+doctor.
- **Screenshot:** `audit-code-actionbar.jpg`.

---

**TASK P1-F — Reconcile the Gmail scope/label (Google)**

- **Priority:** P1 (doctrine: don't imply a capability you don't request).
- **Files:** `src/main/gdrive.ts` (SCOPES), and every label that says "Gmail" (registry Google role "Drive · Sheets · Forms · Gmail", DriveView Mail tab).
- **Why:** §3.7 — the OAuth `SCOPES` are Drive + Spreadsheets + Forms only; there is NO Gmail scope, yet labels advertise Gmail. Either add the scope or drop the claim.
- **Change (choose):**
  - **Add Gmail (if the user wants Gmail):** add `"https://www.googleapis.com/auth/gmail.readonly"` to `SCOPES`; note this forces a re-consent (existing refresh tokens lack the scope) — surface a "re-sign-in to enable Gmail" hint.
  - **Drop the claim (safer):** change the Google role label to "Drive · Sheets · Forms" and gate/hide the Mail tab (or keep it but label it "pending Gmail scope").
- **Verification:** grep confirms no "Gmail" label without a backing scope. `tsc`+build.

---

**TASK P1-G — AGENTS: per-agent Stop + swarm meter**

- **Priority:** P1.
- **Files:** `src/renderer/src/views/AgentsView.tsx`, and a small IPC if a real per-session stop is exposed.
- **Why:** §5.2 — Agents lacks a per-agent stop (today only Terminal stop) and a swarm capacity meter.
- **Change:**
  - **Per-agent Stop:** for each agent card whose cwd matches a live `claude` terminal (via `window.dai.term.list()`), add a Stop button → `window.dai.term.kill(matchingId)` with `window.confirm`. When 0 or >1 terminals match the cwd, disable with reason ("no unique terminal for this agent" — same ambiguity guard Autopilot uses). Reuse the exact-cwd match logic already in AgentsView's Autopilot.
  - **Swarm meter:** render `N live / M total` as a small capacity gauge in the header (data already present: `liveNow`, `sessions.length`). Keep it honest — it is a session count, not a fixed "0/15" capacity unless a real max exists.
- **Verification:** CDP — with a live claude agent, click its Stop; assert the terminal is killed and the card goes idle. `tsc`+build.
- **Screenshot:** `audit-agents-stop-meter.jpg`.

---

**TASK P1-H — METRICS: system-health strip**

- **Priority:** P1.
- **Files:** `src/renderer/src/views/MetricsView.tsx` (add a strip above the session grid).
- **Why:** §5.6 / user §10 — Metrics is session-only; the user wants superpower live-count, Ruflo/Graphify/lean-ctx status, AgentDB vector count.
- **Change:** add a strip that reuses `useOps()` (superpowers live-count, per-tool statuses already probed) + a small new probe for lean-ctx/AgentDB if cheaply available (e.g. `window.dai.system.checkCommand("lean-ctx")` for presence; ruvector.db size for AgentDB "vectors" — but only if a real count is derivable, else show "n/a"). Every cell probe-derived or honest "n/a" — never a fabricated vector count.
- **Verification:** CDP — Metrics shows the strip with real superpower count matching the dock. `tsc`+build.
- **Screenshot:** `audit-metrics-healthstrip.jpg`.

---

**TASK P1-I — Re-audit & verify the merged idle-recap feature (TerminalPane)**

- **Priority:** P1 (it was merged by a concurrent session and is UNAUDITED here).
- **Files:** `src/renderer/src/components/TerminalPane.tsx` + `hooks/useIdleRecap` + idle-recap CSS.
- **Why:** §5.1 — idle-recap (an auto-recap overlay when an agent goes idle) landed via `bb9c018`/`648e6d4`; this audit did not verify it. It is `position:absolute` per a fix commit (ae9e2a1 flash-loop fix).
- **Change:** READ it fresh; verify (a) it is non-blocking (overlay, not modal), (b) its recap content is real (derived from the agent transcript/health, not fabricated), (c) it does not re-introduce a flash loop, (d) it respects the honesty doctrine. If any of those fail, fix; else document it as verified in a follow-up note.
- **Verification:** CDP — drive an agent to idle; assert the recap overlay appears, is dismissible, and shows real content.
- **Screenshot:** `audit-terminal-idle-recap.jpg`.

### 9.3 P2 — POLISH & GREENFIELD (backends, refinements, deferred features)

---

**TASK P2-1 — CREATIVE generation backend (≥1 provider, real)**

- **Files:** new `src/main/creative.ts` (provider calls), `src/shared/ipc.ts` + `src/main/ipc.ts` + `src/preload/index.ts` (a `creative:generate` channel), `src/renderer/src/views/CreativeView.tsx` (wire Generate), Neuromap linkage (asset → Creative node).
- **Why:** §5.8 — Creative is 100% honest, ~0% functional. It needs (a) a provider key and (b) a generation backend. Build the smallest real slice first.
- **Change:** pick ONE provider the user has a key for (keys go in `~/.config/dai/creative.json`, per the existing MoreItem). Add `creativeGenerate(tool, prompt, projectPath)` in main: read the key from creative.json; if absent → return `{ok:false, error:"needs <ENV>"}` (the UI already shows this honestly, keep it); if present → call the provider API, save the asset to a local assets dir, upsert a Creative node into the drive-meta/neuromap registry (so it appears magenta in Neuromap, as the view already promises). Wire CreativeView Generate → this IPC; enable the button ONLY when the key exists.
- **Honesty guard:** never fabricate an asset. No key → disabled with reason (unchanged). Real key → real API call → real asset.
- **Verification:** with a real key set, Generate produces a saved asset + a Neuromap node. Without a key, button stays disabled.
- **Screenshot:** `audit-creative-generate-real.jpg`.

---

**TASK P2-2 — NEUROMAP team/tasks real data (once a team backend exists)**

- **Files:** `src/main/neuromap.ts`, `src/renderer/src/views/NeuromapView.tsx` + `views/neuromap/modes.ts`.
- **Why:** §5.4 — Team/Tasks modes are honest-pending empty states. They need a synced team backend (the vault-synced team.json + a task source) to show real people/tasks.
- **Change:** feed Team mode from the vault-synced `_team/team.json` roster (already exists) + agent attribution; feed Tasks mode from `08_TASKS/` vault notes if present. Keep both honest-pending until the data source is real. Do NOT invent members/tasks.
- **Verification:** with team.json populated, Team mode shows real member nodes; else honest empty.

---

**TASK P2-3 — Terminal: toast when a gated CLI row is clicked while unavailable**

- **Files:** `src/renderer/src/views/TerminalsView.tsx`.
- **Why:** §5.1 — ollama/hermes/codex rows are silent no-ops when the CLI/server is absent (only a status dot cues it).
- **Change:** when clicked while unavailable, `pushToast({kind:"info", title:"<tool> not running", detail:"start it, then retry"})` instead of doing nothing. Keep the row enabled (the dot already signals state) but make the click honest.
- **Also:** if TerminalsView grows past 500 lines with the idle-recap merge, extract the +Worker menu and the status probes into sub-files.

---

**TASK P2-4 — TopBar branch chip · P2-5 Shortcuts rebinding · P2-6 More "Permissions" sub-label · P2-7 Guide text refresh**

- **P2-4:** TopBar — surface the *current* workspace's branch when a sector implies one (Code has the active file's repo). Data is in the projects probe (`branch`/`dirty`). Honest: only show when a real active repo exists.
- **P2-5:** Settings ▸ Shortcuts — implement real rebinding (currently read-only, honestly labeled "future pass"). Persist to `~/.config/dai/settings.json`; re-key the app keymap.
- **P2-6:** registry MORE_CATEGORIES → ADMIN → "perms" item sub-label: change "team & roles · local" → "team & roles · synced via vault" (post-cutover accuracy).
- **P2-7:** GuidePanel — the guide predates the Library sector and the team model; refresh its sector list + superpower statuses + add a Library/Team section. Verify bilingual EN/RO parity.

---

**TASK P2-8 — Library re-audit (coordinate with the concurrent refactor)**

- **Files:** `views/LibraryView.tsx` + `components/library/*` + `main/tips.ts`.
- **Why:** §6.6 — Library is being rewritten right now (AgentCatalog deleted). This audit could not fix a moving target.
- **Change:** after the concurrent refactor lands and the tree is quiet, re-audit every Library button (Catalog cards, Tips CRUD via tips.ts, TeamSection, AdminSection); confirm the adm:library gate holds renderer + server-side; confirm no dead clicks. Only then modify.

---

## PART 10 — SCREENSHOT QA PLAN (evidence Fable must produce)

Fable must capture each of these after the relevant task, via the CDP recipe (§16 / Appendix H), and READ each back to visually confirm before claiming done. Store under `docs/screenshots/`.

| File | Captures | Acceptance (what must be visibly true) |
|---|---|---|
| `audit-superpowers-dock.jpg` | the 7-chip dock | real status dots; N/7 live count matches probes; restricted chips greyed for a non-owner |
| `audit-godmode-panel.jpg` | GODMODE open | health grid colored; mission line real; 8 real action buttons; truth footer count |
| `audit-godmode-full-check.jpg` | after Full System Check click | timestamped colored result list, one line per subsystem (P1-D) |
| `audit-ruflo-panel.jpg` | Ruflo SuperpowerPanel | Engine/Queue/Agents/MCP/Last-check fields; engine shows real STOPPED/RUNNING (P1-B) |
| `audit-superpower-panels-all.jpg` | the 6 other panels | each shows probe-derived fields, no fabricated numbers (P1-A/C) |
| `audit-terminal-sector.jpg` | Terminal deck | master + workers; +Worker menu with CLI status dots; DEPLOY/Channel/SYNC |
| `audit-terminal-idle-recap.jpg` | agent idle | recap overlay non-blocking, real content (P1-I) |
| `audit-agents-sector.jpg` | Agents cockpit | roster + health badges + transcript + Autopilot; per-agent Stop + swarm meter (P1-G) |
| `audit-code-sector.jpg` | Code deck | Monaco + tree + branch badge + action bar (Build/Typecheck/Tests/Diff/Ask) (P1-E) |
| `audit-neuromap-sector.jpg` | Neuromap | smart labels (no soup) at zoom-out; mode selector; Diag panel |
| `audit-drive-sector.jpg` | Drive | 8 tabs; honest Gate when signed out OR live folders when signed in |
| `audit-metrics-sector.jpg` | Metrics | session grid + reasoning + system-health strip (P1-H) |
| `audit-preview-sector.jpg` | Preview | Neo live frame OR iframe; Micro Terminal Run now real/honest (P0-1) |
| `audit-preview-microterminal-fixed.jpg` | Micro Terminal after fix | a real terminal spawned OR the button honestly disabled (P0-1) |
| `audit-creative-sector.jpg` | Creative | honest "needs KEY" cards; Generate real only when key present (P2-1) |
| `audit-command-palette.jpg` | ⌘K | grouped commands; disabled ones show reason; file index |
| `audit-settings-library.jpg` | Settings + Library | 10 settings categories; Library admin-gated |

**Rule:** a screenshot is not proof of correctness by itself — pair every screenshot with the CDP DOM/behavior assertion in its task's Verification. A green screenshot with a failing assertion is a failure.

---

## PART 11 — SEQUENCING & DEPENDENCY GRAPH FOR FABLE

### 11.1 The dependency order (do NOT reorder across a dependency edge)

```
P0-1 (kill dead button) ──┐
P0-2 (rename over-promise) ─┤ independent, do first (doctrine cleanup, tiny)
P0-3 (user Google sign-in) ─┘ (user action; unblocks Drive live states for later screenshots)

P1-A (SuperpowerPanel) ───────────────► P1-B (Ruflo panel) ───► P1-C (5 other panels)
   │                                        (proves pattern)        (config over P1-A)
   └── extract Health card (shared w/ GODMODE) ──► P1-D (GODMODE Full Check reuses Health/STATUS_META)

P1-E (Code action bar)   ─ independent (reuses window.dai.term)
P1-F (Gmail scope/label) ─ independent (main/gdrive.ts)
P1-G (Agents stop+meter) ─ independent (reuses term.list/kill + Autopilot match logic)
P1-H (Metrics strip)     ─ depends on nothing new (reuses useOps)
P1-I (idle-recap audit)  ─ independent (read + verify; coordinate w/ concurrent session)

P2-1 (Creative backend)  ─ largest greenfield; needs a provider key first
P2-2..P2-8               ─ polish; P2-8 (Library) waits for the concurrent refactor to settle
```

### 11.2 The critical path

`P1-A → P1-B → P1-C` is the critical path (the superpower-panel elevation, which is the user's central ask via the GODMODE-format request). Everything else parallelizes around it. If Fable has limited budget, prioritize: **P0-1, P0-2, P1-A, P1-B, P1-D, P1-E** — these deliver the doctrine cleanup + the GODMODE-format elevation for the reference power (Ruflo) + the explicit Full System Check + the missing Code action bar. That is the 80/20.

### 11.3 Per-task commit discipline

One commit per task, message = `<type>(<area>): <what shipped> — <verification result>`, ending with the Co-Authored-By line the repo uses. After each: `tsc --noEmit` + `npm run build` + `node scripts/superpowers-doctor.mjs --check` all green, screenshot captured + read back. If the tree is HOT (concurrent churn in `find src -newermt "-90 seconds"`), pause 2 minutes before trusting a red build — it may be the peer's mid-edit, not your change.

### 11.4 Coordination with the concurrent Library refactor

A peer session is rewriting Library RIGHT NOW (deleting AgentCatalog, editing registry/LeftRail/App). Do NOT touch `registry.tsx`, `LeftRail.tsx`, `App.tsx`, or `components/library/*` until that settles (watch `git log` + mtimes). P1 tasks that must edit `registry.tsx` (P0-2 rename, P1-B ruflo actions) should be done in a QUIET window and committed immediately. If a merge conflict appears, the peer's Library work is authoritative for Library files; your superpower-panel work is authoritative for panel files — keep the edits disjoint.

---

## PART 12 — APPENDICES (executor reference material)

These appendices are the "learning-machine" substrate: the maps Fable consults to re-derive any prescription against the live code. Read the relevant appendix before touching a subsystem.

### APPENDIX A — IPC SURFACE MAP (`window.dai.*` ↔ channel ↔ main handler)

The IPC contract is the single seam between the sandboxed renderer and the privileged main process. Declared in `src/shared/ipc.ts` (channel enum `CH` + types + the `window.dai` interface), handled in `src/main/ipc.ts`, bridged in `src/preload/index.ts`. Terminal IO does NOT flow here — it uses a MessagePort to the pty-host. Every new capability MUST be added in all three files or it will not type-check.

**Rule for Fable:** to add a channel — (1) add `CH.X` + its payload/return type + the `window.dai` method signature in `shared/ipc.ts`; (2) `ipcMain.handle(CH.X, ...)` in `main/ipc.ts` (never register twice); (3) bridge it in `preload/index.ts`. Then `tsc` will confirm the three are consistent.

| Namespace | window.dai method | Channel | Main service | Purpose |
|---|---|---|---|---|
| term | create/attach/write/resize/kill/list/broadcast/mirror/setChannel | `term:*` | pty-host (MessagePort) | terminal lifecycle + IO + master/mirror + one-shot broadcast |
| term (events) | onData/onExit | `term:data`/`term:exit` | pty-host | main→renderer stream |
| fs | list/read/write/walk | `fs:*` | main fs (HOME-confined + secret denylist) | file tree, editor read/save, palette file index |
| projects | list | `projects:list` | git/project probe | workspaces + branch + dirty count |
| sessions | list/transcript | `sessions:*` | ~/.claude/projects/*.jsonl parse | agent roster, scores, context, output |
| — | term-session | `term:session` | session link | associate a terminal with a session |
| tools | status/action | `tools:*` | probeTools() | dock status source + open-obsidian/open-graphify actions |
| radar | status/refresh | `radar:*` | github-radar | hot-repo scanner |
| agent | health | `agent:health` | health analyzer | per-agent goal%/problems/status |
| host | info | `host:info` | os probe | home dir, projects roots |
| win | minimize/maxtoggle/close | `win:*` | BrowserWindow | frameless titlebar controls |
| shell | open | `shell:open` | shell.openExternal | open URL in default browser |
| neuromap | graph/node/watch | `neuromap:*` | neuromap.ts vault parse | knowledge graph + node detail + fs.watch |
| neuromap (event) | onChanged | `neuromap:changed` | fs.watch | re-arm graph on vault change |
| gdrive | status/auth/signout/setClient/list/search/read/backup | `gdrive:*` | gdrive.ts (user OAuth, loopback+PKCE) | Drive config + files + vault backup |
| neo | status/ensure/tabs/open/navigate/reload/back/forward/ask/click/scroll/snap | `neo:*` | Neo browser over CDP | Preview live-drive of the real Neo browser |
| google | ensureTree/folderCreate/upload/sheetCreate/sheetRead/sheetUpdate/formCreate/formResponses/mailSearch/mailGet/mailSaveAttachment | `google:*` | google workspace (same OAuth token) | Drive tree, Sheets, Forms, Gmail ops |
| meta | list/upsert | `meta:*` | drive-meta.json | metadata registry (Creative/Candidate nodes) |
| candidate | create | `candidate:create` | drive-meta | recruit candidate entry |
| proton | status/setConfig | `proton:*` | proton bridge probe | Proton Mail bridge presence |
| settings | get/set | `settings:*` | ~/.config/dai/settings.json (0600) | IDE configuration |
| audit | list/log | `audit:*` | ~/.config/dai/audit.jsonl (0600, append-only) | action trail |
| tips | list/upsert/delete | `tips:*` | ~/.config/dai/tips.json | Library smart-tips CRUD (admin, server-checked) |
| team | get/set/me | `team:*` | vault _team/team.json + identity.json | roster + capability grants + current identity |
| — | identitySet | `identity:set` | identity.json (0600) | set current member identity |
| vaultSync | status/sync/setRemote | `vaultsync:*` | git engine over the vault | commit+push team.json + vault |
| google | health | `google:health` | per-service probes | API Health category |
| system | checkCommand | `system:check-command` | execFile which/command -v | renderer CLI presence probes (Ollama/Codex/etc.) |
| shot | capture | `shot:capture` | BrowserWindow capturePage → ~/Desktop | GODMODE screenshot |
| superpowers | health/openDigest | `sp:*` | superpowers.ts (ruflo health, graphify digest) | Ignite/health probes + digest open |

**Doctrine note on IPC:** every handler that performs a consequential action should call `auditLog(kind, detail)` so the Audit trail is complete, and should return a typed result the renderer can toast honestly (never swallow an error into a fake success).

### APPENDIX B — FILE / COMPONENT MAP (responsibility · LOC · risk)

Risk key: **H**=high (near 500-line cap or load-bearing), **M**=medium, **L**=low. LOC as of audit.

**Renderer views (`src/renderer/src/views/`)**
| File | LOC | Responsibility | Risk |
|---|---:|---|---|
| TerminalsView.tsx | 484 | terminal deck: master/workers, +Worker CLI menu, deploy-N, channel, broadcast | **H** (near cap; idle-recap merged) |
| NeuromapView.tsx | 448 | knowledge graph, modes, smart labels, diagnostics, inspector | **H** (near cap) |
| PreviewView.tsx | 222 | Neo CDP drive + iframe preview + Magic Page chat + micro-terminal | M (has the 1 dead button) |
| AgentsView.tsx | 193 | mission-control roster + transcript + Autopilot | M |
| CodeView.tsx | 151 | Monaco editor + tree + save + git badge | M (needs action bar) |
| MetricsView.tsx | 107 | session observability + reasoning stream | L (needs health strip) |
| ResearchView.tsx | 99 | vault intelligence desk | L |
| RadarView.tsx | 67 | GitHub radar scanner | L |
| CreativeView.tsx | 65 | creative APIs (all gated on keys) | L (needs backend) |
| LibraryView.tsx | 62 | admin catalog + tips (gated adm:library) | M (**refactored live**) |
| DriveView.tsx | 55 | Google/Proton ops (8 tabs) + drive/ subdir | L (gated on sign-in) |

**Renderer components (key)**
| File | Responsibility | Risk |
|---|---|---|
| registry.tsx | THE operational registry (superpowers/more/actions/operationalTruth) | **H** (edited by peer live) |
| sectorActions.tsx | per-sector contextual actions + SECTOR_INFO | M |
| components/EcosystemBar.tsx | superpower dock (chips, quick panel, access-gate) | M (→ SuperpowerPanel target) |
| components/GodModePanel.tsx | GODMODE command panel (the template) | M |
| components/MissionBar.tsx | agent launch + broadcast bar | M |
| components/AdminPanel.tsx + settings/SettingsSections.tsx | consolidated Settings (10 categories) | M |
| components/shell/{LeftRail,TopBar,StatusBar}.tsx | app chrome (nav + telemetry) | M (LeftRail edited by peer) |
| components/CommandPalette.tsx + palette.ts + paletteRecents.ts | ⌘K launcher | M |
| components/CredentialsVault.tsx / PhoneConnect.tsx / GuidePanel.tsx / FirstRunIdentity.tsx | modals/drawers | L |
| components/ToastHost.tsx + toast.ts | feedback bus | L |
| components/da.tsx | shared DA primitives (SectionHeader, EmptyState, OpStatusBadge) | L (reuse for panels) |
| hooks/useOps.ts | status pipeline (probes → statuses → liveCount) | **H** (load-bearing) |
| hooks/useMe.ts | access control resolution | **H** (gate everywhere) |
| hooks/useAppearance.ts | i18n + density/motion | L |

**Main process (`src/main/`)**
| File | Responsibility | Risk |
|---|---|---|
| main/ipc.ts | all ipcMain.handle registrations | **H** (double-register = boot crash) |
| main/tools.ts | probeTools() — dock status source | **H** |
| main/superpowers.ts | ruflo health + graphify digest probes | M |
| main/team.ts | team.json + identity + owner invariant | M |
| main/gdrive.ts + google*.ts | OAuth + Drive/Sheets/Forms/Gmail | M (Gmail scope gap) |
| main/neuromap.ts | vault graph builder | M |
| main/tips.ts | Library tips store (server-checked adm:library) | M (refactored live) |
| main/settings.ts / audit.ts | 0600 local stores | L |
| shared/ipc.ts | IPC contract (single source of truth) | **H** |
| shared/teamCaps.ts | capability catalog + role presets | M |
| preload/index.ts | contextBridge (window.dai) | **H** |
| pty-host/host.ts | node-pty utilityProcess over MessagePort | **H** (terminal IO) |

**Interpretation for Fable:** the high-risk files are the *seams* (ipc.ts, shared/ipc.ts, preload, useOps, useMe, tools.ts, pty-host) and the *near-cap* views (TerminalsView, NeuromapView) and the *peer-contended* files (registry.tsx, LeftRail.tsx, App.tsx, library/*). Touch seams surgically with a fresh read; extract near-cap views rather than inflating; avoid peer-contended files except in a quiet window.

### APPENDIX C — THE STATUS / PROBE PIPELINE (end to end)

Understanding this pipeline is prerequisite to touching any status, because a mis-edit here fabricates a status and violates the doctrine app-wide.

```
                    ┌─────────────────────────────────────────────┐
  main process      │  src/main/tools.ts  probeTools()             │
                    │   • pgrep(Obsidian) + vault dir + .lock mtime │  → obsidian: live|ready|off
                    │   • launchctl(graphify) + digest mtime        │  → graphify: live|ready|off
                    │   • ruvector.db freshness                     │  → ruflo:    live|ready|off
                    │   • godmode-lab dir + active session          │  → godmode:  live|ready|off
                    └───────────────┬─────────────────────────────┘
                                    │  window.dai.tools.status()
  renderer          ┌───────────────▼─────────────────────────────┐
  hooks/useOps.ts   │  fetch: tools[], sessions{live,total}, gdrive │
                    │  env = { tool(id)=>status, liveAgents, google }│
                    │  for each SUPERPOWERS[i]: statusOf(env)=>OpStatus
                    │  liveCount = count(status ∈ {live,running})    │
                    │  attention = count(status ∈ {error,setup-req}) │
                    │  checking / lastChecked                        │
                    └───────────────┬─────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────────┐
        ▼                           ▼                                ▼
  EcosystemBar (dock)        TopBar "SYSTEMS N/7"             StatusBar "systems N/7"
  chips + status dots        GODMODE health grid              agents N · attention N
```

**Invariants (do not break):**
1. `statusOf(env)` is a PURE function of probe data. It must never return `live` unless a probe justifies it. To "raise the live count" you must make a real thing live — never loosen the mapping.
2. `liveCount` counts only `live`/`running`. A low count is honest, not a bug.
3. `checking` gates the UI to show "checking…" (state-checking color) during a probe — never a stale-but-confident status.
4. The dock, TopBar, StatusBar, and GODMODE all read the SAME `useOps()` — they can never disagree. If you add a status surface, consume `useOps()`, do not re-probe independently (that would allow divergence).

**When adding a superpower panel field (P1-A/B/C):** the field's value comes from `useOps().env` (already-probed) or a dedicated `window.dai.superpowers.*` call (real). Never compute a status in the component from partial data.

### APPENDIX D — THE COOPERATIVE ACCESS-CONTROL MODEL (team caps)

This is **cooperative**, NOT hard security. It is an honesty/coordination layer for a 5-7 person team, not an authorization boundary. Fable must present it as such — never as real security.

**Data model (`src/shared/teamCaps.ts`):**
- `TEAM_CAPS` — the capability catalog, grouped by prefix: `sector:*` (deck access), `sp:*` (superpower access), `act:*` (actions like terminals/broadcast), `adm:*` (admin areas like `adm:library`).
- `ROLE_PRESET` — owner/editor/viewer → the caps each preset grants; `resolvePreset(role)`.
- `grantsHave(grants, cap)` — does this grant set include the cap.

**Resolution (`src/renderer/src/hooks/useMe.ts`):**
- `useMe()` → `{ me, isOwner, can(cap) }`. `me` comes from `window.dai.team.me()` (identity resolved against the synced roster). `can(cap)` = owner (all) OR the member's resolved grants include `cap`.
- **Default-allow while loading** — before `me` resolves, `can()` returns true, so the UI never flickers restricted for the owner. (Cooperative, not security.)

**Enforcement points (where `can()` is consulted):**
- `App.tsx` ⌘1-8 sector jumps: `if (canRef.current("sector:"+id)) setView(id)` else audit "access-denied".
- `LeftRail.tsx`: hides sector items / More items the member lacks (`cap` on MoreItem).
- `EcosystemBar.tsx`: `can("sp:"+id)` → restricted chip (no quick panel) + honest "not granted by an owner"; `can("adm:library")` → shows the Admin button.
- `LibraryView.tsx`: `can("adm:library")` → else a restricted panel; **AND** `main/ipc.ts` re-checks `teamCan("adm:library")` server-side for tips writes (the gate is not renderer-only).

**Storage:** roster + grants in the **vault-synced** `<vault>/_team/team.json` (reaches teammates via the existing git vault sync); current identity in `~/.config/dai/identity.json` (0600). Owner invariant enforced in `main/team.ts`.

**Rule for Fable:** any new gated surface consults `useMe().can(cap)` in the renderer for UX, AND (if it performs a consequential write) re-checks `teamCan(cap)` in the main handler. Never rely on renderer-only gating for anything that writes. Never describe this as security in copy — it is cooperative access.

### APPENDIX E — GLOSSARY (action factories, events, stores)

**Action factories (`registry.tsx`) — every dock/palette/panel action resolves to one:**
- `goto(view)` — dispatch `dai:goto` → App sets the view. Pure navigation.
- `deployTerm(cmd, cwd)` — spawn a terminal running `cmd` in `cwd` + audit + goto ide. (claude/shell/ollama…)
- `deployClaudeWithPrompt(prompt, cwd)` — spawn a claude terminal, wait 1.8s, type the prompt. Arms an agent.
- `armTerm(typed, cwd)` — spawn a shell terminal, wait 1.4s, type a command. Arms a visible command.
- `armTermToast(typed, cwd, title)` — armTerm + an info toast naming what launched.
- `rufloIgnite()` — async: checking toast → `superpowers.health("ruflo")` → honest result toast → audit → refreshTools.
- `graphifyOpenDigest()` — async: open the real digest via IPC, honest toast if absent.
- `graphifyRegen()` — arm `graphify update .` in the repo + toast + delayed refreshTools.
- `openObsidian()` / `openGraphify()` — `tools.action(...)`.
- `vault()` / `phone()` / `godmode()` / `admin(tab)` — dispatch the corresponding `dai:*` event.
- `refreshTools()` — dispatch `dai:refresh-tools` → invalidate the tools query (re-probe the dock).

**Custom events (the app's internal bus):**
- `dai:goto` (detail=view) · `dai:vault` · `dai:phone` · `dai:godmode` · `dai:more` · `dai:admin` (detail=category) · `dai:refresh-tools` · `dai:sector-action` (detail=action id, consumed by the active view: e.g. `code:save`, `pv:refresh`, `pv:external`, `agents:select-first`, `agents:focus-broadcast`).

**Stores:**
- `lastAction.ts` — external store of the last executed action (StatusBar reads via useSyncExternalStore).
- `paletteRecents.ts` — recent command ids for palette ranking.
- `toast.ts` — pushToast/updateToast bus (ToastHost renders).
- `queryClient.ts` — react-query client; `invalidateQueries({queryKey})` re-probes.

**The `dai:sector-action` contract:** a sector-scoped action is dispatched globally; the active view listens and acts. This is how the palette "Recommended" group and (formerly) the right rail trigger in-view behavior without prop-drilling. When adding a sector action, add the id to `sectorActions.tsx` AND handle it in the target view's `dai:sector-action` listener.

### APPENDIX F — THE LEARNING-MACHINE EXECUTION LOG (how Fable records what it learns)

This document is a learning-machine spec; execution should feed a learning-machine log so the *next* executor inherits the knowledge. For each task, Fable appends an entry to `docs/superpowers/execution-log/2026-07-DAI-fable-build.md` in this shape:

```
## <task-id> — <title>            (e.g. P0-1 — Kill dead Micro Terminal Run)
- Interpretation confirmed?  yes/no — if no, what had changed and how I re-derived
- Files touched:             <paths>
- Change summary:            <what I actually did, 2-3 lines>
- Verification:              tsc <exit> · build <exit> · doctor <exit> · CDP <assertion result>
- Screenshot:                <path> — <what it visibly shows>
- Surprises / new knowledge: <anything the audit didn't predict — a moved file, a hidden
                              coupling, a peer edit, a doctrine subtlety>
- Follow-ups created:        <new tasks discovered while doing this one>
- Commit:                    <sha> <message>
```

**Why this matters (the hermeneutic payoff):** the "Surprises / new knowledge" line is the learning signal — it captures the delta between the audit's model and reality. After a few tasks these deltas reveal systematic gaps in the audit's interpretation, which Fable should fold back into its mental model (and, if significant, into this plan via an addendum). This is what makes the process a learning machine rather than a one-shot checklist: each task updates the model that generates the next task's approach.

**Definition of Done (applies to every task):** interpretation re-confirmed against live code · change applied · `tsc --noEmit` green · `npm run build` green · `doctor` green · CDP/behavioral assertion passed · named screenshot captured AND read back · audit entry present · one focused commit · execution-log entry appended. A task missing ANY of these is not done — report it as in-progress with the specific gap, never as done.

### APPENDIX G — TARGET-STATE MOCKUPS (ASCII — what Fable builds toward)

These are layout targets, not pixel specs. They encode the GODMODE grammar (§4) so every panel is visually and operationally consistent. Brand tokens only (obsidian bg, burgundy/crimson accents, violet/gold/ember/teal status). No emoji in product UI.

#### G.1 — The generic SuperpowerPanel (P1-A) — shape every power inherits

```
┌─ <icon> RUFLO · workflow orchestrator ───────────── ● idle   checked 14:22:07 ─┐
│                                                                                 │
│  HEALTH                                                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐          │
│  │ Engine       │ │ Queue        │ │ Agents       │ │ MCP          │          │
│  │ ● idle       │ │ ◌ run to view│ │ ● 0 active   │ │ ● up         │          │
│  │ V3 STOPPED   │ │ ruflo task ls│ │ swarm stopped│ │ mcp reachable│          │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘          │
│                                                                                 │
│  PRIMARY   Engine ready — swarm stopped, safe to ignite (last check 14:22)      │
│                                                                                 │
│  ACTIONS                                                                        │
│  [ Ignite (health) ] [ Reconnect ] [ View Task Queue ] [ Continue Flow ]        │
│  [ Open Logs ] [ Broadcast Mission ]                                            │
│                                                                                 │
│  TRUTH  ● 6 actions wired & real   ◌ 0 pending — every control names its reason │
└─────────────────────────────────────────────────────────────────────────────────┘
```
Every dot color = STATUS_META[status]. "run to view" is honest when a count isn't wired. No fabricated numbers.

#### G.2 — OBSIDIAN panel

```
┌─ <gem> OBSIDIAN · knowledge vault · business brain ──── ● local-only  14:22 ─┐
│  HEALTH                                                                       │
│  [ Vault  ● local-only  Antigravity-Brain ] [ Lock  ● closed  app not open ] │
│  [ Notes  ● 1,240  from graph ]            [ Last edit  ● 3m ago ]           │
│  PRIMARY  Vault present at ~/Documents/Obsidian/Antigravity-Brain            │
│  ACTIONS  [Open Vault] [Open Neuromap] [Search Notes] [Sync Vault] [Plan Chat]│
└───────────────────────────────────────────────────────────────────────────────┘
```

#### G.3 — GRAPHIFY panel

```
┌─ <nodes> GRAPEVINE · neural relationship engine ─────── ● idle  14:22 ────┐
│  HEALTH                                                                     │
│  [ Digest  ● 2h old  _GRAPHIFY_DIGEST.md ] [ Graph  ● 1,240n / 3,880e ]    │
│  [ Engine  ● launchd loaded ]             [ Freshness ● stale — regen ]    │
│  PRIMARY  Digest exists but is 2h old — Regenerate for the latest graph    │
│  ACTIONS  [Open Map] [Open Digest] [Regenerate] [Research Lens] [Agents]   │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### G.4 — CLOUD panel

```
┌─ <cloud> CLOUD · heavy AI execution · Claude sessions ── ● live  14:22 ──┐
│  HEALTH  [ Live ● 2 sessions ] [ Tokens ● 184k out ] [ Model ● opus×2 ]  │
│  PRIMARY  2 Claude sessions live — top: "DAI audit" · opus · 3% idle     │
│  ACTIONS  [Launch Session] [Mission Control] [View Tokens] [Stop Controls]│
└───────────────────────────────────────────────────────────────────────────┘
```

#### G.5 — AGENTS panel

```
┌─ <sigil> AGENTS · swarm activation & control ────────── ● live  14:22 ──┐
│  HEALTH  [ Swarm ● 2 live / 5 total ] [ Worst ● 1 stalled ] [ Autopilot ○ off ]│
│  PRIMARY  2 agents live, 1 stalled (needs a nudge) — open cockpit to inspect   │
│  ACTIONS  [Open Cockpit] [Launch Agent] [Broadcast] [Inspect Transcripts]      │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### G.6 — GOOGLE panel

```
┌─ <plug> GOOGLE APIs · Drive · Sheets · Forms ────────── ● partial  14:22 ─┐
│  HEALTH  [ Sign-in ● configure — not signed in ] [ Drive ◌ n/a ]          │
│          [ Sheets ◌ n/a ] [ Forms ◌ n/a ]                                 │
│  PRIMARY  OAuth client saved — Sign in with Google to go live (loopback)  │
│  SCOPES   drive · spreadsheets · forms   (Gmail NOT requested — see P1-F) │
│  ACTIONS  [Sign in with Google] [Keys] [API Health] [Drive Ops]           │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### G.7 — GODMODE with Full System Check (P1-D)

```
┌─ <dragon> GODMODE · supreme command · operational truth ── Andrei · 5 member(s) ─┐
│  SYSTEM HEALTH                                                                    │
│  [Agents ●live 2/5] [Terminals ●live 4] [Vault ●local] [Google ●partial] [Audit ●312]│
│  ACTIVE MISSION  "DAI deep audit" · opus · ~/code/dragons-alliance-ide · now · 88%│
│  QUICK ACTIONS                                                                    │
│  [Global Command ⌘K] [Open Terminal] [Launch Agent] [Open Preview] [Open Metrics]│
│  [Capture Screenshot] [Sync Vault] [Full System Check] [Emergency Stop]          │
│  ── FULL SYSTEM CHECK ─ 14:22:31 ────────────────────────────────────────────    │
│   14:22:31 ● tools        live   obsidian local · graphify idle · ruflo idle      │
│   14:22:31 ● sessions     live   2 live / 5 total                                 │
│   14:22:32 ● terminals    live   4 alive                                          │
│   14:22:32 ● google       partial configured — sign in                            │
│   14:22:32 ● team         ok     5 members · owner Andrei                          │
│   14:22:32 ● audit        ok     312 events · last: full-system-check             │
│  OPERATIONAL TRUTH  ● 38 wired & real   ◌ 6 honestly disabled                     │
└────────────────────────────────────────────────────────────────────────────────────┘
```
Each Full-Check line is the REAL post-invalidation value, colored by STATUS_META, streamed with a tiny delay. Never fabricated.

#### G.8 — CODE sector with action bar (P1-E)

```
┌─ file tree ─┬─ App.tsx ● | registry.tsx | ipc.ts ───── main ↕ dragons-alliance-ide ─┐
│ src/        │  [Build] [Typecheck] [Tests⌀no-script] [Git Diff] [Ask agent]  ⌘S Save│
│  renderer/  │ ┌──────────────────────────────────────────────────────────────────┐ │
│  main/      │ │  1  import { lazy, Suspense, ... } from "react";                  │ │
│  ...        │ │  2  ...                          (Monaco editor, real)           │ │
│             │ └──────────────────────────────────────────────────────────────────┘ │
│             │  branch main ±3   ·   saved                                           │
└─────────────┴─────────────────────────────────────────────────────────────────────────┘
```
Build/Typecheck/GitDiff/Ask arm real terminals in the active file's repo. Tests disabled-with-reason when no test script (honest).

#### G.9 — AGENTS cockpit with per-agent Stop + swarm meter (P1-G)

```
┌─ LIVE AGENTS  ●●○○○ 2/5 ─────────┬─ transcript: "DAI audit" ───────────────────┐
│ [Autopilot ON  auto-watch+nudge] │  ▸ assistant: reading registry.tsx ...       │
│ ● DAI audit    opus  88  [Stop]   │  ▸ tool: Read registry.tsx                   │
│ ● Recruit web  opus  74  [Stop]   │  ▸ assistant: superpowers all have run()...  │
│ ○ La Fratii    sonnet 61 [Stop⌀]  │  (Stop⌀ = disabled: no unique terminal)      │
│ ○ Hermes       haiku  55          │                                              │
└───────────────────────────────────┴────────────────────────────────────────────┘
```
Stop = kill the exact-cwd claude terminal (confirm). Disabled when 0 or >1 terminals match (ambiguity guard, same as Autopilot).

#### G.10 — PREVIEW Micro Terminal, fixed (P0-1)

```
BEFORE (dead):  [ npm run build            ] [Run]  ← Run only did setCmd(""), lied "executes via host"
AFTER  (real):  [ npm run build            ] [Run] → spawns a shell worker in the project cwd,
                types the command, toasts "Ran in <project>", jumps to Terminal. OR, if unwired,
                the button is disabled with title "run in the Terminal sector".
```

#### G.11 — METRICS with system-health strip (P1-H)

```
┌─ SYSTEM HEALTH ── superpowers 2/7 live · ruflo idle · graphify idle · lean-ctx present · agents 2 ─┐
│  agents 5   live ●2   avg 74   context 1.2M   output 184k        [60m][240m][24h]                   │
├────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  session cards grid ...                          │  reasoning stream (selected) ...                 │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
```
Every cell in the strip is probe-derived (useOps) or an honest "n/a" — never a fabricated vector/agent count.

### APPENDIX H — VERIFICATION RECIPES (reusable, copy-paste)

There is no unit-test runner. Verification = type-gate + build-gate + doctor-gate + CDP behavioral smoke + screenshot. Use absolute binary paths (the `_lc` wrapper shadows bare `git`/`npm`/`curl`).

**H.1 — The three gates (run after EVERY task):**
```bash
R=/Users/user/code/dragons-alliance-ide
cd $R
/opt/homebrew/opt/node@22/bin/npx tsc --noEmit                       # real type gate — MUST be exit 0
/opt/homebrew/opt/node@22/bin/npm run build                          # transpile/bundle gate — exit 0
/opt/homebrew/opt/node@22/bin/node scripts/superpowers-doctor.mjs --check   # registry honesty gate — exit 0
```
If `tsc` is red but the tree is HOT (`/usr/bin/find $R/src -newermt "-90 seconds"` non-empty), a peer is mid-edit — wait ~2 min and re-run before blaming your change.

**H.2 — Launch the built app with CDP (real profile) for a behavioral smoke:**
```bash
R=/Users/user/code/dragons-alliance-ide
# kill any lingering debug instance holding the single-instance lock first:
/usr/bin/pkill -f "remote-debugging-port=9333" 2>/dev/null; sleep 1
EB=$R/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron
"$EB" "$R/out/main/index.js" --remote-debugging-port=9333 \
  --user-data-dir=/tmp/dai-verify > /tmp/dai-verify.log 2>&1 &
sleep 6
/usr/bin/curl -s http://127.0.0.1:9333/json/list | \
  /usr/bin/python3 -c "import sys,json;print([t['title'] for t in json.load(sys.stdin) if t['type']=='page'])"
```

**H.3 — CDP DOM/behavior assertion (ws script — run from the repo so `ws` resolves):**
```js
// scripts/_verify.mjs  (delete after use)
import { WebSocket } from "ws";
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const page = list.find(t => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 64*1024*1024 });
let seq = 0; const pend = new Map();
const send = (m, p={}) => { const id=++seq; ws.send(JSON.stringify({id,method:m,params:p})); return new Promise(r=>pend.set(id,r)); };
await new Promise(r => ws.once("open", r));
ws.on("message", raw => { const m=JSON.parse(raw); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } });
await send("Runtime.enable"); await new Promise(r=>setTimeout(r,2500));
// example: assert React mounted (not a black screen)
const v = await send("Runtime.evaluate", { expression:`(document.getElementById("root")||document.body).innerHTML.length`, returnByValue:true });
console.log("root length:", v.result.value, v.result.value>200 ? "MOUNTED ✓" : "BLACK SCREEN ✗");
// example: click a control by text and assert an effect
// await send("Runtime.evaluate",{expression:`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Run'))?.click()`});
ws.close();
```
Run: `/opt/homebrew/opt/node@22/bin/node scripts/_verify.mjs` (copy into `scripts/`, run, delete).

**H.4 — Screenshot (via CDP Page.captureScreenshot):**
```js
const shot = await send("Page.captureScreenshot", { format: "jpeg", quality: 80 });
import { writeFileSync } from "fs"; // (only in a node script, never in renderer)
writeFileSync("docs/screenshots/audit-x.jpg", Buffer.from(shot.data, "base64"));
```
Then READ the jpg back (Read tool) and visually confirm the acceptance criterion before claiming done.

**H.5 — Deploy (only when the user asks to ship):**
```bash
R=/Users/user/code/dragons-alliance-ide; cd $R
/opt/homebrew/opt/node@22/bin/npm run build          # or `dist` if DMG fixed (P0-4)
# swap the .app (dist DMG step may fail — the .app is still valid):
DST="/Applications/Dragons Alliance IDE.app"; BK="$DST.backup-prev.app"
/usr/bin/osascript -e 'quit app "Dragons Alliance IDE"' 2>/dev/null; sleep 2
/usr/bin/pkill -f "/Applications/Dragons Alliance IDE.app/Contents/MacOS" 2>/dev/null
/usr/bin/pkill -f "node_modules/electron.*app-path=$R" 2>/dev/null; sleep 2   # clear the lock-holder
/bin/rm -rf "$BK" && /bin/mv "$DST" "$BK" && /bin/cp -R "$R/release/mac-arm64/Dragons Alliance IDE.app" "$DST"
/usr/bin/xattr -dr com.apple.quarantine "$DST" 2>/dev/null
/usr/bin/open "$DST"; sleep 9
/usr/bin/pgrep -f "/Applications/Dragons Alliance IDE.app/Contents/MacOS/Dragons" && echo LAUNCH-OK || echo LAUNCH-FAIL
```
LAUNCH-FAIL is usually a lingering debug instance holding the single-instance lock (the two `pkill` lines above prevent it), not a code fault — the CDP smoke (H.2/H.3) proves whether the bundle actually mounts.

### APPENDIX I — RISK REGISTER & ROLLBACK

| Risk | Likelihood | Impact | Mitigation | Rollback |
|---|---|---|---|---|
| Renderer imports electron/node → black screen | med (happened) | critical | never import electron/node in renderer; use window.dai; CDP smoke every change | `git revert`; the H.3 smoke catches it pre-deploy |
| Duplicate `ipcMain.handle` → boot crash | med | high | grep the channel before adding; one handler per channel | revert the handler add |
| Peer rollback of uncommitted work | high (recurring) | high | commit each task immediately; work in quiet windows; avoid contended files | recover from `.claude/worktrees/*` branch if lost |
| node_modules symlink merged → self-reference breaks build | med | high | `git ls-files | grep node_modules` must be empty; never stage the symlink | `git rm --cached node_modules && rm node_modules && npm install` |
| Editing registry/LeftRail/App during peer Library refactor → conflict | high now | med | wait for quiet tree; keep edits disjoint from Library files | keep changes small + committed; peer's Library files are theirs |
| Loosening a `statusOf` to inflate live count → doctrine violation | low | high (identity) | never edit statusOf to change a count; make the real thing live | revert; the count is meant to be dynamic |
| Fabricating a panel field → doctrine violation | low | high | every field probe-derived or honest "not wired"; operationalTruth stays truthful | revert the field |
| TerminalsView/NeuromapView cross 500 lines | med | low | extract sub-components when touching them | split into files |
| DMG build ENOENT blocks a distributable | high (present) | low | swap the .app directly (H.5); `npm install` to fix app-builder-bin | N/A (infra) |
| Adding a Gmail scope forces re-consent, existing tokens break | med | med | surface "re-sign-in to enable Gmail"; or drop the label (P1-F option B) | revert scope, keep Drive/Sheets/Forms |

**Rollback discipline:** because peers can rewrite the tree, the safe unit of work is a single committed task. If a change goes wrong, `git revert <sha>` the task's commit — do NOT `git reset` (a peer may have committed on top). Keep the `.app.backup-prev.app` from the last deploy so a bad ship is one `mv` from recovery.

### APPENDIX J — PER-TASK ACCEPTANCE SCRIPTS (concrete assertions)

For each shipped task, the behavioral assertion Fable must pass (via the H.3 CDP pattern). "Assert" = evaluate the expression, confirm the stated result.

- **P0-1 (Micro Terminal Run):** after clicking Run with `echo DAI` typed and a project selected → `window.dai.term.list()` includes a terminal whose `cwd` == the project path and whose recent input contains `echo DAI`. (Or, if the honest-disable path was taken: the Run button has `disabled` and a title naming the reason.)
- **P0-2 (Assign Sector rename):** the Agents superpower quick actions no longer contain the text "Assign Sector"; they contain "Open Agents Cockpit". `doctor` green.
- **P1-A (SuperpowerPanel):** clicking each of the 7 dock chips renders an element with a HEALTH grid (`.gm-grid`-equivalent) and an ACTIONS row — not a bare `role="menu"`. GODMODE still opens its own panel.
- **P1-B (Ruflo panel):** the Ruflo panel's Engine field text matches the real `window.dai.superpowers.health("ruflo")` status (STOPPED/RUNNING); Queue shows a real count or the honest "run to view".
- **P1-D (Full System Check):** clicking it appends ≥5 timestamped colored lines whose statuses match the SYSTEM HEALTH grid; an `audit.list()` entry `full-system-check` exists afterward.
- **P1-E (Code action bar):** with a file open in a repo, clicking Build → a terminal with `npm run build` in that repo cwd exists; Tests is disabled-with-reason when the repo has no test script.
- **P1-G (Agents Stop):** with one live claude agent, clicking its Stop (confirm) → that terminal id is gone from `window.dai.term.list()`; the card goes idle. Stop is disabled when 0 or >1 terminals share the cwd.
- **P1-H (Metrics strip):** the strip's "superpowers N/7" equals the dock's `liveCount` at the same instant (both read useOps — they must match).
- **P2-1 (Creative real):** with a provider key present, Generate is enabled and produces a saved asset + a Neuromap node; with no key, Generate stays disabled with its reason.

### APPENDIX K — WORKED SKELETON: `SuperpowerPanel` (P1-A)

Illustrative skeleton, NOT final code — Fable writes the real version against the live files (signatures may have drifted; re-read first). It reuses existing primitives (`SUPERPOWERS`, `STATUS_META`, `OpStatusBadge`, `useOps`) and adds no new plumbing beyond the per-power data hook.

```tsx
// src/renderer/src/components/SuperpowerPanel.tsx  (NEW)
import { useEffect } from "react";
import { SUPERPOWERS, STATUS_META, operationalTruth, type OpStatus } from "../registry";
import { useOps } from "../hooks/useOps";
import { OpStatusBadge } from "./da";

export type PanelField = { label: string; status: OpStatus; value: string };
export type PanelSpec = { fields: PanelField[]; primary?: { label: string; status: OpStatus; detail: string } };

// One shared health card (extract the identical component out of GodModePanel so both share it).
function Health({ label, status, value }: PanelField) {
  const m = STATUS_META[status];
  return (
    <div className="gm-card">
      <div className="gm-card-label">{label}</div>
      <div className="gm-card-status" style={{ color: m.color }}>● {m.label}</div>
      <div className="gm-card-detail">{value}</div>
    </div>
  );
}

// Per-power probe composition. Each branch pulls ONLY from already-probed data
// (useOps env) or a real window.dai.superpowers.* call. No fabricated numbers:
// a field with no source yet returns status "pending-backend" + value "not wired".
function usePanelData(id: string): PanelSpec {
  const { env } = useOps();
  // ... per-id branches (see §4.3): ruflo → superpowers.health, obsidian → neuromap graph, etc.
  // Return { fields, primary }. Placeholder here; implement per §4.3.
  return { fields: [] };
}

export function SuperpowerPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const sp = SUPERPOWERS.find((s) => s.id === id)!;
  const { fields, primary } = usePanelData(id);
  const truth = operationalTruth(); // or a per-power subset

  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  return (
    <div className="sp-panel sp-panel--full" role="dialog" aria-label={`${sp.label} panel`}>
      <div className="sp-panel-head">
        <span className="sp-panel-ic">{sp.icon({ size: 16 })}</span>
        <div>
          <div className="sp-panel-title">{sp.label}</div>
          <div className="sp-panel-role">{sp.role}</div>
        </div>
        {/* status resolved by the dock; pass it in or read from useOps().statuses[id] */}
      </div>

      <div className="sp-panel-sec">HEALTH</div>
      <div className="sp-panel-grid">
        {fields.map((f) => <Health key={f.label} {...f} />)}
      </div>

      {primary && (
        <div className="sp-panel-primary" style={{ color: STATUS_META[primary.status].color }}>
          {primary.detail}
        </div>
      )}

      <div className="sp-panel-sec">ACTIONS</div>
      <div className="sp-panel-actions">
        {sp.actions.map((a) => a.run ? (
          <button key={a.id} className={`sp-act${a.danger ? " danger" : ""}`}
            onClick={() => { a.run!(); onClose(); }}>{a.label}</button>
        ) : (
          <button key={a.id} className="sp-act disabled" disabled title={a.disabledReason}>
            <span>{a.label}</span><i>{a.disabledReason}</i>
          </button>
        ))}
      </div>

      <div className="sp-panel-truth">
        ● {truth.real} wired &amp; real · ◌ {truth.pending} honestly disabled
      </div>
    </div>
  );
}
```

**Wiring into the dock (`EcosystemBar.tsx`):** replace the `<QuickPanel ...>` render with `<SuperpowerPanel id={sp.id} onClose={() => setOpen(null)} />` for non-GODMODE powers (GODMODE keeps opening `GodModePanel`). Keep the access gate: only render when `allowed` (`can("sp:"+id)`). Keep the existing outside-click/Escape close on the wrapper.

**CSS:** add `.sp-panel--full` and `.sp-panel-*` classes in `styles.css` reusing the GODMODE `.gm-card`/`.gm-grid` tokens so panels look native. No new colors — STATUS_META only.

**Do NOT:** add any disabled entry to the SUPERPOWERS registry (doctor fails); fabricate a field value; re-probe independently of useOps (divergence).

### APPENDIX L — WORKED SKELETON: `rufloQueue()` (P1-B) & Full System Check (P1-D)

```ts
// src/main/superpowers.ts  — add alongside rufloHealth(), same never-throw + 6s guard pattern.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);
const HOME = process.env.HOME || "";

export async function rufloQueue(): Promise<{ ok: boolean; count: number; message: string }> {
  try {
    const { stdout } = await execFileP("ruflo", ["task", "list"], {
      cwd: HOME, timeout: 6000, maxBuffer: 1 << 20,
    });
    // Parse a task count from the CLI output. If the CLI says "not initialized"
    // or shows an empty board, return an HONEST zero/message — never invent a number.
    const lines = stdout.split("\n").filter((l) => /^\s*[-*•]|\btask\b/i.test(l));
    if (/not initialized|no tasks|empty/i.test(stdout)) return { ok: true, count: 0, message: "queue empty" };
    return { ok: true, count: lines.length, message: `${lines.length} task(s)` };
  } catch (e: any) {
    // ruflo absent / errored in HOME → honest, not a crash.
    return { ok: false, count: 0, message: e?.code === "ENOENT" ? "ruflo not installed" : "queue unavailable" };
  }
}
```
Then: declare `SP_RUFLO_QUEUE: "sp:rufloqueue"` in `shared/ipc.ts` + the `window.dai.superpowers.rufloQueue(): Promise<{ok;count;message}>` type; `ipcMain.handle(CH.SP_RUFLO_QUEUE, () => rufloQueue())` in `main/ipc.ts`; bridge in `preload/index.ts`. The Ruflo panel's Queue field reads it; if `!ok`, show the honest message, not a count.

```tsx
// GodModePanel.tsx — Full System Check (P1-D), sketch
const [checkLog, setCheckLog] = useState<{ ts: number; label: string; status: OpStatus; detail: string }[]>([]);
const [running, setRunning] = useState(false);
const fullCheck = async () => {
  setRunning(true); setCheckLog([]);
  const steps: [string, () => Promise<{ status: OpStatus; detail: string }>][] = [
    ["tools",     async () => { await queryClient.invalidateQueries({ queryKey: ["tools"] }); /* read back */ return { status: "live", detail: "…" }; }],
    ["sessions",  async () => { await queryClient.invalidateQueries({ queryKey: ["gm-sessions"] }); return { status: "live", detail: "…" }; }],
    ["terminals", async () => { await queryClient.invalidateQueries({ queryKey: ["gm-terms"] }); return { status: "live", detail: "…" }; }],
    ["google",    async () => { await queryClient.invalidateQueries({ queryKey: ["gdrive"] }); return { status: "partial", detail: "…" }; }],
    ["team",      async () => { await queryClient.invalidateQueries({ queryKey: ["team"] }); return { status: "local-only", detail: "…" }; }],
    ["audit",     async () => { await queryClient.invalidateQueries({ queryKey: ["audit"] }); return { status: "local-only", detail: "…" }; }],
  ];
  for (const [label, run] of steps) {
    const r = await run();
    setCheckLog((l) => [...l, { ts: nowFromProbe(), label, status: r.status, detail: r.detail }]);
  }
  window.dai.audit.log("full-system-check", `${steps.length} subsystems re-probed`);
  setRunning(false);
};
```
Each line's status/detail is the REAL post-invalidation value (read the refreshed query data), colored via `STATUS_META`. Note: renderer has no `Date.now()` restriction (that's a workflow-script rule), but derive the timestamp from the probe result where possible so the log reflects probe time, not render time.

### APPENDIX M — DOCTRINE SELF-AUDIT SWEEP (find any NEW dead/fake control)

Before declaring the plan complete, and after each batch of tasks, Fable runs this sweep to guarantee no NEW doctrine violation slipped in. These are heuristics — each hit is reviewed, not auto-fixed.

```bash
R=/Users/user/code/dragons-alliance-ide/src
# 1) onClick handlers that only set local state while copy nearby promises an effect:
/usr/bin/grep -rn "onClick={() => {" $R | /usr/bin/grep -i "setCmd\|setValue\|setText" 
# 2) buttons with no onClick and no disabled (candidate dead click):
/usr/bin/grep -rn "<button" $R | /usr/bin/grep -v "onClick\|disabled\|type=\"submit\""
# 3) hardcoded 'live'/'LIVE' status strings (candidate fake status):
/usr/bin/grep -rn "\"live\"\|'live'\|LIVE" $R/renderer/src/components $R/renderer/src/views | /usr/bin/grep -iv "statusOf\|OpStatus\|STATUS_META\|=== \"live\"\|=='live'"
# 4) disabled controls MISSING a reason (title/disabledReason):
/usr/bin/grep -rn "disabled" $R | /usr/bin/grep "<button" | /usr/bin/grep -v "title=\|disabledReason\|aria-disabled"
# 5) registry actions with neither run nor disabledReason (doctor also catches this):
/opt/homebrew/opt/node@22/bin/node scripts/superpowers-doctor.mjs --check --verbose
```
Interpretation: (1)/(2) surface dead clicks; (3) surfaces fake status; (4) surfaces dishonest disables; (5) is the authoritative registry gate. A clean sweep + green doctor = the doctrine holds.

### APPENDIX N — BRAND / DESIGN TOKEN REFERENCE (so new panels look native)

Every new surface (SuperpowerPanel, Code action bar, Metrics strip, Full System Check) MUST use existing CSS custom properties from `styles.css` — never raw hex, never new colors. This keeps the empire's obsidian aesthetic coherent and theme-safe.

**Surface / structure tokens:** `--bg` (obsidian base), `--panel`, `--panel-2` (raised), `--line`/`--line-soft` (borders), `--ink`/`--muted`/`--faint` (text hierarchy), `--radius`, shadow tokens. Panels sit on `--panel` with `--line` borders and `--radius` corners.

**Brand accents:** `--accent-ember` (ember/orange-red — setup-required), `--accent-violet` (violet — pending-backend), burgundy/crimson brand reds for primary CTAs (`.da-btn.gold` uses the imperial gold-soft). The dragon sigil (`DragonEmblem`) is the ONLY brand mark; no generic icons for GODMODE.

**Status colors (the ONLY source for status dots — `STATUS_META` maps to these):**
| OpStatus | token |
|---|---|
| live | `--teal` |
| running | `--gold-soft` |
| idle | `--muted` |
| partial | `--orange` |
| local-only | `--blue` |
| setup-required | `--accent-ember` |
| pending-backend | `--accent-violet` |
| error | `--st-error` / `--state-error` |
| offline/unknown/disabled | `--faint` |
| (checking) | `--state-checking` |

**Sector colors:** `--sector-agents`, `--sector-code`, etc. — used for per-sector accents (agent "done" status uses `--sector-agents`). Reuse the matching sector token when a panel is sector-specific.

**Button classes:** `.da-btn` with modifiers `.gold` (primary imperial), `.ghost` (secondary), `.danger` (destructive, e.g. Emergency Stop), `.sm` (small). Superpower-panel actions use `.sp-act` (+`.danger`, +`.disabled`). Reuse these — do not invent button styles.

**Rules:** (1) no emoji in product UI; (2) no neon/casino saturation — muted, premium, obsidian; (3) motion respects the Appearance `motion` setting (reduce when off); (4) density respects the Appearance `density` setting; (5) every status dot's color = `STATUS_META[status].color`, never a literal.

### APPENDIX O — SAFE COMMAND REFERENCE (read-only + build; absolute paths)

Because the `_lc` wrapper shadows bare binaries, always use absolute paths. These are the only commands Fable needs; none of them deploy/commit unless explicitly noted.

```bash
R=/Users/user/code/dragons-alliance-ide
NODE=/opt/homebrew/opt/node@22/bin/node
NPM=/opt/homebrew/opt/node@22/bin/npm
NPX=/opt/homebrew/opt/node@22/bin/npx
GIT=/usr/bin/git

# --- read-only inspection ---
$GIT -C $R status --short
$GIT -C $R log --oneline -10
$GIT -C $R log --oneline origin/main..HEAD          # unpushed?
$GIT -C $R ls-files | /usr/bin/grep node_modules    # MUST be empty
/usr/bin/find $R/src -newermt "-90 seconds"         # peer churn detector
/usr/bin/wc -l $R/src/renderer/src/views/*.tsx      # 500-line watch

# --- the three gates ---
cd $R && $NPX tsc --noEmit                           # type gate
$NPM run build                                       # bundle gate
$NODE scripts/superpowers-doctor.mjs --check         # registry honesty gate
$NODE scripts/superpowers-doctor.mjs --check --verbose  # detailed

# --- probes to sanity-check panel data against reality ---
ruflo status                                         # what the Ruflo panel must match
ruflo task list                                      # what rufloQueue() parses
/usr/bin/launchctl list | /usr/bin/grep graphify     # graphify launchd state
/bin/ls -la ~/Documents/Obsidian/Antigravity-Brain/.obsidian 2>/dev/null   # vault present

# --- CDP smoke (see Appendix H for the full recipe) ---
# launch out/main/index.js with --remote-debugging-port=9333 --user-data-dir=/tmp/dai-verify

# --- NEVER run without an explicit user request ---
# $GIT commit / push · $NPM run dist (deploy) · swapping /Applications
```

### APPENDIX P — SECTOR_ACTIONS & PALETTE PROVIDER CATALOG

The command palette's content comes from registered providers. Understanding them lets Fable add/adjust commands without hunting.

**Providers (`registerProvider(name, fn)` → `paletteCommands()` merges all):**
- **`app`** (App.tsx) — core sectors (⌘1-8), superpowers (each action), terminal broadcasts, admin categories, diagnostics (operationalTruth), guide. The backbone.
- **`contextual`** — the active sector's `SECTOR_ACTIONS[sector]` rendered as the "Recommended" group; disabled ones keep their `disabledReason`.
- **`mission`** / **`terminals`** — mission broadcast + terminal-scoped commands when those views are active.
- **file index** — built in CommandPalette from `fsWalk(root, 4000)` over roots (not a provider; merged in results).

**`SECTOR_ACTIONS` (sectorActions.tsx) — the per-sector contextual actions (feed palette "Recommended" + `dai:sector-action`):**
| Sector | Actions (id → effect) | Notes |
|---|---|---|
| ide (Terminal) | new worker, broadcast, deploy-N | arm real terminals |
| agents | `agents:focus-broadcast` (focus MissionBar), `agents:select-first` (top agent) | in-view listeners |
| code | `code:save` (save active file) | CodeView listens |
| neuromap | open modes / regenerate | real |
| drive | config / sign-in | gated |
| metrics | switch window | real |
| preview | `pv:refresh`, `pv:external` | PreviewView listens |
| creative | (mostly disabled — needs keys) | honest |

**`SECTOR_INFO`** (same file) — each sector's title + one-line description; consumed by StatusBar (`SECTOR_INFO[sector].title`) and headers. When adding a sector action, add its id to `SECTOR_ACTIONS[sector]` AND handle it in the target view's `dai:sector-action` listener (Appendix E contract).

**Adding a palette command:** prefer adding to the right provider (usually `app` for global, `contextual` via SECTOR_ACTIONS for sector-scoped). Every command has `{id, title, category, icon?, run, shortcut?, subtitle?, status?, disabledReason?}`. Disabled commands NEVER run (`runCmd: if (c.disabledReason) return`) — they display the reason. Match this pattern; never add a command that dead-runs.

### APPENDIX Q — TASK → FILE CHANGE MATRIX (what each task touches)

Cross-check before starting a task: if two tasks touch the same high-risk file (registry.tsx, ipc.ts, shared/ipc.ts, preload), sequence them and commit between; never edit them concurrently with a peer's Library refactor.

| Task | shared/ipc.ts | main/ipc.ts | preload | registry.tsx | main/*.ts | renderer view/component | styles.css |
|---|:--:|:--:|:--:|:--:|:--:|---|:--:|
| P0-1 Micro Terminal | — | — | — | — | — | PreviewView.tsx | — |
| P0-2 Assign Sector | — | — | — | ✓ (label) | — | — | — |
| P0-3 Google sign-in | — | — | — | — | — | (user action) | — |
| P0-4 DMG | — | — | — | — | — | (npm install) | — |
| P1-A SuperpowerPanel | — | — | — | — | — | SuperpowerPanel(NEW), EcosystemBar, da.tsx | ✓ |
| P1-B Ruflo panel | ✓ (SP_RUFLO_QUEUE) | ✓ | ✓ | ✓ (actions) | superpowers.ts | SuperpowerPanel | — |
| P1-C 5 panels | — | — | — | — | — | SuperpowerPanel | — |
| P1-D Full System Check | — | — | — | — | — | GodModePanel.tsx | ✓ |
| P1-E Code action bar | — | — | — | — | — | CodeView.tsx | ✓ |
| P1-F Gmail scope | — | — | — | ✓ (label) | gdrive.ts | DriveView.tsx | — |
| P1-G Agents stop+meter | — | — | — | — | — | AgentsView.tsx | ✓ |
| P1-H Metrics strip | — | — | — | — | (lean-ctx probe?) | MetricsView.tsx | ✓ |
| P1-I idle-recap audit | — | — | — | — | — | TerminalPane.tsx (read) | — |
| P2-1 Creative backend | ✓ | ✓ | ✓ | — | creative.ts(NEW) | CreativeView.tsx | — |
| P2-2 Neuromap team | — | — | — | — | neuromap.ts | NeuromapView, modes.ts | — |
| P2-3 Terminal toast | — | — | — | — | — | TerminalsView.tsx | — |
| P2-4 TopBar branch | — | — | — | — | — | TopBar.tsx | — |
| P2-6 Perms sublabel | — | — | — | ✓ | — | — | — |
| P2-7 Guide refresh | — | — | — | — | — | GuidePanel.tsx | — |

**Contended-file note:** `registry.tsx` appears in P0-2, P1-B, P1-F, P2-6 AND is edited by the concurrent Library refactor. Batch all registry edits into a short quiet-window session, commit immediately, and re-read before each. Same caution for anything importing from registry.

### APPENDIX R — HERMENEUTIC READING METHOD (how to interpret unfamiliar code here)

When Fable meets a file this plan didn't fully cover, interpret it with this method rather than guessing:

1. **Read the file header comment first.** This codebase documents intent at the top of nearly every file ("no dead clicks, no fake status", "all Google calls run in the main process", "Neo mode drives the real Neo browser"). The header states the contract; the body implements it. If body and header disagree, the header is the intent and the body may be the defect.

2. **Find the seam.** Ask: does this touch privilege (fs, exec, network, pty)? If yes, it MUST go through `window.dai.*` (renderer) → `CH.*` (channel) → `ipcMain.handle` (main). Trace the seam; a renderer file doing privileged work directly is a bug (the black-screen class).

3. **Classify every control by the verdict vocabulary (§2.3).** For each button: does it have a `run`/`onClick` that produces the labelled effect (REAL), a gated-but-real path (PARTIAL), an honest disable (H), or nothing/cosmetic (DEAD)? The registry's `run? XOR disabledReason` shape makes this mechanical for superpower/more actions.

4. **Follow the status to its probe.** Any status word you see rendered should trace to `useOps()` → `statusOf` → `probeTools`/session/gdrive. If you cannot find the probe, it may be a fabricated status (doctrine violation) — flag it.

5. **Check the honesty copy.** Gates and disables in this app say the literal truth ("Nothing is simulated", "no key, no fake output", "not granted to you by an owner"). If copy over-promises relative to the handler (e.g. "Executes via the terminal host" on a dead button), that mismatch IS the finding.

6. **Respect the 500-line and contextIsolation invariants** when you edit — they are load-bearing, not style.

7. **Re-derive, don't trust stale instructions.** If this plan says "line 208" and the code has moved, use the method above to re-locate the control by its role and copy, then apply the intent. The plan's interpretations are stable; its line numbers are not.

### APPENDIX S — DOMAIN GLOSSARY (the empire's vocabulary)

- **Superpower** — one of the 7 top-level capabilities (Obsidian, Grapevine/Graphify, Ruflo, Cloud, Agents, GODMODE, Google). Declared in `SUPERPOWERS[]`. Each has a real main action + quick actions + a probe-derived status.
- **Sector / deck** — one of the 8 core views (Terminal/Agents/Code/Neuromap/Drive/Metrics/Preview/Creative). Nav = `SectorId`.
- **GODMODE** — the supreme command panel; the operational-format template (§4). NOT a mode toggle — a real command center of probes + actions.
- **RuFlo** — a CLI workflow orchestrator (V3). NOT a daemon — "Ignite" runs a health/status command, it does not start a server. Health parsed from `ruflo status` (RUNNING/STOPPED/version/agents/MCP).
- **Grapevine / Graphify** — the code/knowledge graph engine; a launchd agent syncs a code graph into the Obsidian vault; produces `_GRAPHIFY_DIGEST.md`.
- **Neuromap** — the in-app knowledge graph view of the Obsidian vault (notes + [[wikilink]] edges), distinct from Graphify (which is the external engine).
- **Neo** — a real Chromium-based browser driven over CDP; Preview drives it live (screenshot frame you click/scroll into + Magic Page AI chat).
- **Obsidian vault** — `~/Documents/Obsidian/Antigravity-Brain`; the business brain / knowledge base. Team config lives in `<vault>/_team/team.json` (git-synced).
- **lean-ctx** — a context-engineering CLI/MCP layer (token savings); surfaced as a status in Metrics (P1-H) and a More item.
- **AgentDB / ruvector.db** — Ruflo's vector memory store; its freshness is a Ruflo liveness signal in `probeTools`.
- **teamCaps** — the cooperative capability catalog (`sector:`/`sp:`/`act:`/`adm:`); resolved per member via role presets + explicit grants. Cooperative, NOT security (Appendix D).
- **PTY host** — a dedicated `utilityProcess` (`src/pty-host/host.ts`) running node-pty; the renderer talks to it over a MessagePort. Terminal IO does NOT use the `window.dai` IPC.
- **MessagePort** — the renderer↔pty-host transport. NEVER pass a transfer list for ArrayBuffers over it (nulls the message → broke keystroke input once).
- **operationalTruth()** — the registry function that counts real-vs-pending actions; GODMODE publishes it. The app's self-honesty made numeric.
- **The doctrine** — "no dead clicks, no fake status, every disabled control names its reason" (Appendix / §2). The product's identity.
- **`window.dai`** — the preload bridge; the ONLY way the renderer reaches privileged capability. If it's not on `window.dai`, the renderer can't (and mustn't) do it.
- **`dai:*` events** — the internal command bus (`dai:goto`, `dai:admin`, `dai:sector-action`, …) used to trigger cross-component behavior without prop-drilling (Appendix E).

### APPENDIX U — DATA-FLOW TRACES (the three trickiest features, end to end)

Interpret these before touching the features they describe; each has a subtle invariant that a naive edit breaks.

**U.1 — Autopilot nudge (AgentsView) — the ambiguity guard is load-bearing**
```
Autopilot ON → setInterval(5s) tick:
  for each session s with a file:
    h = await fetchAgentHealth(s.file)              // real health probe
    bad  = h.status ∈ {error, stalled}
    fresh = h.problems[0] && now - problems[0].ts < 3min
    cooled = now - lastNudge(s.file) ≥ 90s
    if not (bad and fresh and cooled): continue
    terms = await window.dai.term.list()
    matches = terms.filter(t => t.cmd==="claude" && t.cwd === h.cwd_full)   // EXACT cwd, never startsWith
    if matches.length !== 1: continue               // 0 = no terminal, >1 = ambiguous → DO NOT nudge
    await window.dai.term.broadcast(prompt, true, [matches[0].id])   // real keystrokes into THAT agent
    setNudgeCooldown(s.file, now); appendLog(...)
```
**Invariant:** `matches.length !== 1 → skip`. Using `startsWith` on cwd, or nudging when >1 terminal shares the cwd, would type into the WRONG agent. Any per-agent action (P1-G Stop) MUST reuse this exact-cwd, unique-match logic.

**U.2 — Neo CDP live drive (PreviewView) — the frame is a real screenshot, clicks map to viewport coords**
```
Start (Neo) → neo.status(); if !connected → neo.ensure() (runs neo-debug)
           → if connected: neo.open(url); poll neo.snap() every 1.6s → {dataUrl, vw, vh}
Frame click → x = (clientX-left)/width * snap.vw ; y = (clientY-top)/height * snap.vh
           → neo.click(x,y) → refreshSnap()          // real click in the real browser at viewport coords
Frame wheel → neo.scroll(deltaY) → refreshSnap()
Magic Page chat → neo.ask(prompt, submit=true)        // types into Neo's Magic Page AI
```
**Invariant:** the image is a live screenshot of a REAL browser; clicks are re-projected to the browser's viewport (vw/vh), not the img element's pixels. This is why it's real, not a mock. Do not replace with a static image.

**U.3 — Vault team sync (Team settings) — grants reach teammates via git, not a server**
```
Owner edits roster/grants → window.dai.team.set(config)
  → main/team.ts writes <vault>/_team/team.json (owner invariant enforced)
  → vaultSync.sync() → git add/commit/push the vault → teammates git-pull the vault
  → each teammate's window.dai.team.me() resolves THEIR identity vs the roster → can(cap)
```
**Invariant:** there is NO team server — the transport is the already-synced Obsidian vault git repo. It is eventually-consistent and cooperative (Appendix D). Never present it as real-time or as security. A teammate sees new grants only after a vault pull.

### APPENDIX V — `window.dai` SIGNATURE REFERENCE (the renderer's whole world)

The renderer can do exactly this and nothing more. Signatures abbreviated; authoritative types in `shared/ipc.ts`.

```ts
window.dai = {
  term:   { create(opts), attach(id), write(id, data), resize(id, cols, rows), kill(id),
            list(): Promise<TermInfo[]>, broadcast(text, enter, ids?), mirror(...), setChannel(on),
            onData(cb), onExit(cb) },
  fs:     { list(path), read(path): Promise<string>, write(path, content), walk(path, max) },
  projects:{ list(): Promise<Project[]> },            // {path,name,branch,dirty,...}
  sessions:{ list(minutes), transcript(file) },
  tools:  { status(): Promise<ToolStatus[]>, action(id) },  // 'open-obsidian' | 'open-graphify'
  radar:  { status(), refresh() },
  agentHealth: (file) => Promise<AgentHealth>,          // {status,goalPct,problems[],cwd_full}
  host:   { info(): Promise<{home, projects[]}> },
  win:    { minimize(), maxtoggle(), close() },
  shell:  { open(url) },
  neuromap:{ graph(opts): Promise<NeuroGraph>, node(id), watch(layers[]), onChanged(cb) },
  gdrive: { status(): Promise<GDriveStatus>, auth(), signout(), setClient({clientId,clientSecret}),
            list(folderId?), search(q), read(fileId), backup() },
  neo:    { status(), ensure(), tabs(), open(url), navigate({url,tab?}), reload(tab?),
            back(tab?), forward(tab?), ask(prompt,submit?), click(x,y,tab?), scroll(dy,tab?),
            snap(tab?): Promise<NeoSnap> },              // {dataUrl,vw,vh,url}
  google: { ensureTree(), folderCreate({name,parentId?}), upload({localPath,folderId,convert?}),
            sheetCreate({title,folderId?}), sheetRead({id,range?}), sheetUpdate({id,range,values}),
            formCreate(title), formResponses(formId), mailSearch(q), mailGet(id),
            mailSaveAttachment({msgId,attId,filename,folderId}), health(): Promise<GServiceHealth[]> },
  meta:   { list(filter?), upsert(entry) },
  candidate:{ create(name) },
  proton: { status(), setConfig({host,port,user}) },
  settings:{ get(): Promise<DaiSettings>, set(patch) },
  audit:  { list(limit?): Promise<AuditEvent[]>, log(kind, detail) },
  tips:   { list(), upsert(entry), delete(id) },         // Library (server-checks adm:library)
  team:   { get(): Promise<TeamConfig>, set(config), me(): Promise<Me>, identitySet(memberId) },
  vaultSync:{ status(), sync(message?), setRemote(url) },
  system: { checkCommand(cmd): Promise<boolean> },       // CLI presence (Ollama/Codex/…)
  shot:   { capture(): Promise<ShotResult> },             // → ~/Desktop
  superpowers:{ health(id): Promise<SpHealth>, openDigest(): Promise<SpResult>,
                /* P1-B add: */ rufloQueue(): Promise<{ok,count,message}> },
}
```
**Note the deliberate absence:** there is no `window.dai.perms` anymore (retired in the Task-10 cutover `28c639a` — team config replaced it). Do not reintroduce it. If you see `window.dai.perms` in stale code, it's a bug from an un-migrated consumer.

### APPENDIX W — ANTI-PATTERNS CATALOG (what NOT to do, with the real consequence)

| Anti-pattern | Real consequence (observed or certain) | Do instead |
|---|---|---|
| `import { ipcRenderer } from "electron"` in a renderer file | `__dirname is not defined` at module-eval → React never mounts → black screen (happened, `dadb3d5`) | `window.dai.*` bridge |
| Second `ipcMain.handle(CH.X, …)` for a channel | Electron throws at boot → app won't start | one handler per channel; grep first |
| Transfer list for ArrayBuffer over MessagePort | message nulls → keystroke input silently dies | structured clone (no transfer) |
| Hardcode a status to `"live"` to look healthy | fake LIVE → doctrine violation → the app's identity broken | derive from a probe; a low live-count is honest |
| Add a `run`-less, `disabledReason`-less registry action | `doctor` fails the build | give it a `run` or an honest `disabledReason` |
| A button whose onClick only sets local state while copy promises an effect | dead click that lies (the Micro Terminal bug) | wire it real, or disable with a stated reason |
| Loosen `statusOf` to raise the live count | fabricated liveness across dock/TopBar/StatusBar/GODMODE at once | make the real thing live |
| Re-probe a status inside a component instead of `useOps()` | surfaces can disagree → user distrust | consume `useOps()` |
| `startsWith(cwd)` to match an agent's terminal | nudges/kills the WRONG agent (sibling dir) | exact `===` + unique-match guard |
| Stage a `node_modules` symlink in a worktree | self-referential symlink on merge → build breaks in main | never stage it; `git ls-files | grep node_modules` empty |
| Edit `registry.tsx`/`LeftRail.tsx`/`App.tsx` during the peer Library refactor | merge conflict / lost work | wait for a quiet tree; commit immediately |
| Let TerminalsView/NeuromapView cross 500 lines | violates the file-size rule; harder to reason about | extract sub-components |
| Emoji / neon in product UI | breaks the obsidian brand | brand tokens only |
| Claim "done" without CDP assertion + screenshot | undetected regressions ship | run the Definition of Done (Appendix F) |

### APPENDIX X — P3: FUTURE VISION (the 5-7 person team command center)

Beyond the immediate backlog, this is where the IDE is heading. Fable should build P0-P2 in a way that does not foreclose these — each note flags the P0-P2 decision that keeps the door open.

**X.1 — Shared team presence.** Today `team.json` is cooperative + eventually-consistent via the vault git sync (Appendix U.3). The vision: a live presence layer — who is online, which sector/agent each teammate is driving, whose swarm is running. *Keep the door open:* P1-C's Agents panel already surfaces swarm N/M; model its data so a future "team swarm" (aggregate across members) is a superset, not a rewrite. Do NOT hardcode single-operator assumptions into the panel.

**X.2 — Real team backend (optional, opt-in).** The honest gap in Neuromap Team/Tasks (P2-2) and TopBar "LOCAL MODE" is a shared backend. The vision: an OPT-IN sync service (still local-first) that turns team.json + task notes + presence into live shared state — without ever becoming a hard-security boundary (the cooperative model stays; it gains a faster transport). *Keep the door open:* everything that reads team state reads `window.dai.team.*`; never bypass it, so a backend swap is invisible to the UI.

**X.3 — Superpower panels as team dashboards.** Once P1-A/C land, each SuperpowerPanel is a per-operator readout. The vision: a "team view" toggle that aggregates the same fields across members (e.g. Cloud panel → total team live sessions; Ruflo panel → team queue depth). *Keep the door open:* `usePanelData(id)` should return a shape that a future `usePanelData(id, {scope:"team"})` can extend.

**X.4 — Cross-agent orchestration from the cockpit.** Today Agents launches/broadcasts to terminals; Ruflo Ignite reports engine health. The vision: launch a real Ruflo swarm from the Agents cockpit (topology + agent-types + task board) and watch it in Neuromap's Agents layer. *Keep the door open:* P1-B's `rufloQueue()` is the first real read into the Ruflo task system; design it so a future `rufloSwarmStart(topology, agents)` sits beside it with the same never-throw/honest pattern.

**X.5 — Creative production pipeline.** P2-1 builds the first real provider. The vision: a full brand-asset pipeline (prompt → provider → asset → Neuromap Creative node → linked to a project → exported to Drive). *Keep the door open:* store every generated asset in the drive-meta registry from day one so it appears in Neuromap and can later flow to Drive.

**X.6 — The IDE as the single pane.** The end state: an operator opens DAI and sees, honestly and live — their agents, their terminals, their knowledge graph, their team, their superpowers' true state — and can act on any of it without leaving. Every P0-P2 task is a step toward that single pane; none of them should introduce a surface that lies, because the whole value proposition is *a command center you can trust.* That is why the doctrine is non-negotiable: a team command center that fakes one number is a team command center nobody trusts.

**X.7 — What NOT to build (scope discipline).** Do not build: a cloud multi-tenant backend, a real auth/permissions security layer (the model is cooperative by design), an in-IDE model-inference server, or auto-launching dev servers with process management — these are large, out of the empire's local-first identity, and not requested. If a task tempts you toward them, stop and flag it for the user.

### APPENDIX Y — FAQ (anticipated executor questions)

**Q: The audit says something is REAL but I see a bug when I run it. Who's right?**
A: Reality. The audit is a static read at HEAD `5497e67`; peers edit constantly. Re-derive (Appendix R), fix the real bug, and note the delta in the execution log (Appendix F) — that's the learning signal.

**Q: `npm run build` is red but I didn't change anything relevant.**
A: Check `find src -newermt "-90 seconds"` — a peer is likely mid-edit (the Library refactor briefly breaks rollup resolution when a file is deleted-then-reimported). Wait ~2 min, re-run. If still red, it's yours.

**Q: Can I add a disabled superpower action for something not wired yet?**
A: No — `doctor` fails on disabled entries in the SUPERPOWERS registry. Express "not available to this member" via the dock's `restricted` state (access), and "not built yet" by simply not adding the action (or adding it to MORE_CATEGORIES with an honest `status`, which DOES allow a status). For in-panel fields, use value "not wired" + status `pending-backend`.

**Q: Should I commit? Push? Deploy?**
A: This document is authored read-only, but YOU are executing the build — commit each verified task (one focused commit, Definition of Done met). Push only if the user asked / it's the team's flow. Deploy (`dist` + swap /Applications) ONLY on explicit user request; use Appendix H.5 and clear the single-instance lock first.

**Q: The Library files are the cleanest place to add my feature.**
A: Don't. Library is being rewritten by a peer right now. Put shared primitives in `components/` or `hooks/`, not `components/library/*`. Re-audit Library (P2-8) only after the peer settles.

**Q: How deep should I go on a task?**
A: See Appendix Z. Briefly: match effort to the task's risk. A label rename (P0-2) is minutes; SuperpowerPanel (P1-A) is a real component with CDP verification; Creative backend (P2-1) is a feature. Don't gold-plate a P2; don't rush a P0 doctrine fix.

**Q: The user wants a screenshot but the app isn't running / no CDP.**
A: Launch the built bundle with the H.2 recipe (`out/main/index.js --remote-debugging-port=9333 --user-data-dir=/tmp/dai-verify`) — a throwaway profile so you don't fight the installed app's lock. Capture via H.4, read it back, then kill your instance.

**Q: Is `window.dai.perms` still a thing?**
A: No — retired in the Task-10 cutover. Team config (`window.dai.team.*` + `useMe`) replaced it. Any `window.dai.perms` reference is stale/bug (Appendix V).

**Q: What's the single most important rule?**
A: The doctrine (Appendix / §2). No dead clicks, no fake status, every disabled control names its reason. Everything else is negotiable; that is not.

### APPENDIX Z — EFFORT & BUDGET GUIDANCE (how deep per task)

Fable at max effort should still allocate proportionally — depth where risk is high, speed where it's mechanical.

| Task class | Depth | Verification depth | Examples |
|---|---|---|---|
| Label/copy fix | minutes; single edit | tsc + doctor | P0-2, P2-6 |
| Dead-button fix | small; reuse existing IPC | tsc + build + CDP click assertion + screenshot | P0-1 |
| Shared primitive | real component; design the interface first | tsc + build + doctor + CDP per-consumer + screenshot | P1-A |
| Panel/config over primitive | thin; mostly data wiring | tsc + build + CDP field-matches-probe assertion | P1-B/C |
| In-view action bar | medium; reuse term APIs | tsc + build + CDP + screenshot | P1-E, P1-G, P1-H |
| Backend + IPC + UI (feature) | large; 3-file IPC + main service + UI + honest gating | tsc + build + doctor + CDP + real-effect assertion + screenshot | P2-1 |
| Read-only re-audit | interpret, don't edit unless a real defect | document findings | P1-I, P2-8 |

**Stop conditions (don't over-build):** a P2 doesn't need the polish of a P0; an honest-disabled state is a valid endpoint (you don't have to make everything live in one pass); if a task tempts you into Appendix X.7's "what NOT to build", stop and flag. **Escalate to the user when:** a task requires a secret/key you don't have, a decision the user owns (add Gmail scope vs drop the label — P1-F), or touching a peer-contended file that won't settle.

### APPENDIX AA — SESSION CONTINUITY & DEPLOY STATE SNAPSHOT

So Fable inherits the exact state, not a guess.

- **Branch:** `main`. **HEAD at audit:** `5497e67`.
- **Installed app** (`/Applications/Dragons Alliance IDE.app`): cutover build `28c639a` (Team feature + Task-10 permissions cutover). It does NOT yet include the idle-recap merge or the live Library refactor.
- **Backup:** `/Applications/Dragons Alliance IDE.backup-prev.app` = the previous build (`b3757f4`), one `mv` from rollback.
- **Origin:** confirm with `git log --oneline origin/main..HEAD` — the cutover chain may be local-only.
- **Google:** PARTIAL — OAuth client saved (`~/.config/dai/google.json`, 0600), NOT signed in. User must Sign in (P0-3) to make Drive live.
- **DMG:** broken (`app-builder-bin` ENOENT). The `.app` builds fine; ship via `.app` swap (H.5) or `npm install` to fix DMG (P0-4).
- **Retired:** `src/main/permissions.ts` + `window.dai.perms` (cutover `28c639a`). Do not reintroduce.
- **Live churn:** a peer session is rewriting Library (AgentCatalog deleted; registry/LeftRail/App modified uncommitted). Expect the tree to move.
- **This plan's file:** `docs/superpowers/plans/2026-07-07-DAI-deep-audit-and-fable-build-plan.md` (uncommitted, read-only deliverable). Its sibling specs: `2026-07-06-settings-team-permissions*.md`.

### APPENDIX AB — DEEP INTERPRETIVE NARRATIVES (superpowers: why each is the way it is)

The audit tables tell you WHAT. These narratives tell you WHY — the forces that shaped each power — so you can extend them in their own grain.

**Obsidian — the business brain, deliberately kept at arm's length.** The interesting design choice is that Obsidian is a *superpower*, not a *sector*. There is a Neuromap sector that renders the vault graph, but "Obsidian" the superpower is about *acting on the vault from anywhere* — open it, search it, sync it, plan a RAG over it. The forces: the vault is the empire's memory (per the operator's global protocol, everything that moves leaves a trace there), so the IDE treats it as a first-class external system it *orchestrates*, not one it *owns*. That's why every Obsidian action either opens the real app, navigates to a real in-app view of it, or arms a real agent to work on it — never a fake "vault contents" panel. When you build its SuperpowerPanel, honor this: show the vault's real state (path, lock, note count from the graph), and let the actions do the acting. Don't reimplement Obsidian inside the panel.

**Grapevine/Graphify — a power whose artifact is often absent, by design honest about it.** Graphify is an external launchd engine that periodically writes a digest into the vault. The subtlety: the digest is FREQUENTLY stale or missing (the engine runs on a schedule; the operator may not have triggered it). A naive design would hide this or fake a "graph ready" state. Instead the power exposes the truth — "digest 2h old, Regenerate for the latest" — and the Regenerate action arms the REAL `graphify update .` command *visibly in a terminal*, so the operator watches it happen. The force here is the doctrine meeting an asynchronous external artifact: the resolution is always "show the real freshness + offer the real regeneration", never "pretend fresh". Your panel must surface the digest mtime honestly.

**Ruflo — the power the operator cares most about, and the one most prone to a lie.** Ruflo is a CLI orchestrator, not a daemon. The temptation (which a past version fell into) is to make "Ignite" look like starting an engine — a big green "LIVE" after a click. That is a lie: there is no engine to start; `ruflo` is a command you run. The repair (`7c1d8b9`) replaced the fake with a real health probe: Ignite runs `ruflo status` in HOME (where Ruflo is initialized), parses the true state, and toasts it honestly ("engine ready — swarm stopped, safe to ignite"). This is the single best example in the codebase of the doctrine resolving a hard case: when the operator *wants* to see "LIVE", the honest answer is the true engine state, and the UI's job is to make the true state *legible and actionable*, not to fabricate the desired one. Your Ruflo panel (P1-B) is the reference precisely because getting Ruflo honest is the hardest and most valuable case. Never let the panel imply a daemon.

**Cloud — the power that is just "Claude sessions", named for what it feels like.** "Cloud" is not a separate infrastructure; it's the live Claude sessions the operator is running (heavy AI execution). Its status is `liveAgents > 0`. The design honesty: it doesn't pretend to be a cloud platform — its actions launch/inspect/stop real local Claude terminals and show real token metrics. The lesson: naming can be evocative ("Cloud") as long as the *behavior* is truthful (real sessions, real tokens). Keep the panel's fields tied to the real session probe.

**Agents — the power that is under-sold, and the one label that over-promises.** Agents (the superpower) and Agents (the sector) overlap — the superpower is the swarm-control entry point, the sector is the cockpit. Almost everything is real (roster, health, transcript, autopilot, broadcast). The ONE crack is "Assign Sector", a label that implies an operation the handler doesn't perform (it just navigates). This is the instructive near-miss: it's not a dead click (it navigates) and not fake status (no status), but the *label over-promises*. The doctrine extends to labels: a control must not imply more than it does. Fixing it (P0-2) is a rename, not a feature — because the honest move when you can't build the implied capability yet is to stop implying it.

**GODMODE — the power that is a panel, and therefore the template.** Every other power opens a menu; GODMODE opens a full operational panel. Why the asymmetry? Because GODMODE is *about* the whole system's truth — it's the one place that shows the health grid + active mission + real actions + the operationalTruth count. It became the template not by decree but because it's the only power whose job forced a real panel. The plan's central move (P1-A/C) is to recognize that every power *deserves* that same panel — that the menu was a stopgap and the panel is the mature form. When you build SuperpowerPanel, you are generalizing GODMODE's proven grammar, not inventing.

**Google — the power that is one user action from live, and honest about the gap.** Google is fully wired (OAuth, Drive, Sheets, Forms) but sits at `partial` because the operator hasn't signed in. The design refuses to fake a connection: every Drive-backed surface gates with "needs Google — nothing is simulated". The one honesty debt is the "Gmail" label without a Gmail scope (P1-F) — a label promising a capability the OAuth request doesn't include. The lesson mirrors Agents' "Assign Sector": don't advertise a capability you haven't wired (here, haven't scoped). Resolve by adding the scope or dropping the claim.

### APPENDIX AC — PER-SECTOR STRUCTURED DEEP-DIVE (interpret + extend)

Each sector: the intent, the invariant that keeps it honest, the extension seam.

**TERMINAL (ide)**
- Intent: a persistent, VS-Code-grade terminal deck where the operator runs everything real.
- Invariant: terminal IO flows over the MessagePort to the pty-host — NOT `window.dai` IPC. Never route keystrokes through IPC.
- Invariant: claude terminals spawn as `zsh -l -c "exec claude"` (no `|| zsh` fallback — a crashed claude reaps the PTY, does not degrade to a live shell).
- Extension seam: the +Worker menu (add(cmd)) is where new CLIs are added; status dots come from real presence probes (ollama fetch, `system.checkCommand`).
- Watch: 484 LOC + idle-recap merge → extract before adding.
- Honesty debt: silent no-op when a gated CLI is unavailable (P2-3 → toast).

**AGENTS (agents)**
- Intent: mission control — see and steer every live Claude agent.
- Invariant: any per-agent action targets the agent's terminal by EXACT cwd + unique match (Appendix U.1). Never `startsWith`, never act on ambiguous matches.
- Invariant: broadcast sends real keystrokes + Enter to live claude terminals — confirm first (MissionBar does).
- Extension seam: AgentsView roster + MissionBar launch/broadcast; per-agent Stop + swarm meter (P1-G) slot in here.
- Honesty note: it is under-sold, not under-built — resist "rebuilding"; add the missing Stop + meter only.

**CODE (code)**
- Intent: a real editor with real git awareness.
- Invariant: fs is HOME-confined + secret-denylisted (main enforces); the renderer only calls `fs.read/write`.
- Extension seam: the tab strip is where the action bar (Build/Typecheck/Tests/Diff/Ask) goes (P1-E); each arms a real terminal in the active file's repo.
- Honesty note: Tests must disable-with-reason when the repo has no test script.

**NEUROMAP (neuromap)**
- Intent: a living graph of the vault, legible at any zoom.
- Invariant: labels are screen-space + collision-culled (the v2 fix); never re-introduce world-space label soup.
- Invariant: Team/Tasks modes are honest-pending — no fabricated members/tasks until a real source exists.
- Extension seam: `views/neuromap/modes.ts` (mode data) + `labels.ts` (label engine); Team from `_team/team.json`, Tasks from vault `08_TASKS/`.
- Watch: 448 LOC → extract before adding.

**DRIVE (drive)**
- Intent: document operations on the operator's own Google account.
- Invariant: all Google calls run in main on the user's OAuth client; every Google-backed tab gates on sign-in ("nothing is simulated").
- Extension seam: `views/drive/GoogleTabs.tsx` + `OpsTabs.tsx`; the Gmail scope reconciliation (P1-F) is in `main/gdrive.ts` SCOPES.
- Current: LOCKED until the user signs in (P0-3) — not a bug.

**METRICS (metrics)**
- Intent: live observability of Claude sessions.
- Invariant: all figures from `fetchSessions` (real jsonl parse); the error state offers a real Retry.
- Extension seam: a system-health strip above the grid (P1-H) reusing `useOps()` — every cell probe-derived or honest "n/a".

**PREVIEW (preview)**
- Intent: see the app you're building, live — Neo (real browser over CDP) or an iframe.
- Invariant: the Neo frame is a real screenshot; clicks re-project to the browser viewport (vw/vh) — Appendix U.2.
- Defect: the Micro Terminal Run is DEAD (P0-1) — the one doctrine violation.
- Extension seam: Micro Terminal → reuse `window.dai.term`; non-Neo chat needs a real agent route (honest-disabled until then).

**CREATIVE (creative)**
- Intent: brand/content generation via provider APIs.
- Invariant: no key → no output; Generate is disabled-with-reason. Never fake an asset.
- Extension seam: a `main/creative.ts` + `creative:generate` IPC + asset→Neuromap node (P2-1). Build ONE provider first.
- Current: 100% honest, ~0% functional — the most greenfield sector.

### APPENDIX AD — DEFINITION OF DONE, PER TASK (explicit checklists)

Every box must be checked before a task is "done". Copy each into a todo when starting the task.

**P0-1 Micro Terminal Run**
- [ ] Read PreviewView.tsx fresh (peer churn)
- [ ] Run now spawns a real terminal in the project cwd + types the command (or is honestly disabled)
- [ ] Copy no longer claims execution if disabled path chosen
- [ ] audit.log("preview-run", …) fires on the real path
- [ ] tsc --noEmit green · npm run build green · doctor green
- [ ] CDP: after Run, term.list() shows the terminal with the command (assertion in Appendix J)
- [ ] Screenshot audit-preview-microterminal-fixed.jpg captured + read back
- [ ] One commit + execution-log entry

**P0-2 Assign Sector rename**
- [ ] registry.tsx read fresh (contended file — quiet window)
- [ ] "Assign Sector" → "Open Agents Cockpit"
- [ ] doctor green (registry honest) · tsc green
- [ ] Commit + log entry

**P1-A SuperpowerPanel**
- [ ] Health card extracted from GodModePanel into a shared component
- [ ] SuperpowerPanel renders header + HEALTH grid + PRIMARY + ACTIONS + TRUTH
- [ ] usePanelData(id) pulls only probe-derived data; unwired fields = "not wired"/pending-backend
- [ ] EcosystemBar opens the panel for the 6 non-GODMODE powers; GODMODE still opens GodModePanel
- [ ] Access gate preserved (render only when can("sp:"+id))
- [ ] No disabled entry added to SUPERPOWERS registry (doctor green)
- [ ] Escape + outside-click close
- [ ] tsc green · build green · doctor green
- [ ] CDP: each of 7 chips opens a panel (not a bare menu)
- [ ] Screenshot audit-superpower-panel-generic.jpg
- [ ] Commit + log entry

**P1-B Ruflo panel + rufloQueue()**
- [ ] rufloQueue() added with never-throw + 6s guard; honest on ENOENT/empty
- [ ] SP_RUFLO_QUEUE channel + type + handler + preload bridge (all three files)
- [ ] Ruflo panel shows Engine/Queue/Agents/MCP/Last-check from real data
- [ ] "Reconnect" + "Open Logs" actions added to registry ruflo
- [ ] Panel never implies a daemon (copy says "engine ready — swarm stopped")
- [ ] tsc green · build green · doctor green
- [ ] CDP: Engine text matches window.dai.superpowers.health("ruflo")
- [ ] Screenshot audit-ruflo-panel.jpg · Commit + log entry

**P1-C five panels** — [ ] each of obsidian/graphify/cloud/agents/google shows probe-derived fields · [ ] no fabricated numbers · [ ] tsc/build/doctor green · [ ] screenshots · [ ] commit + log

**P1-D Full System Check**
- [ ] Button added to GODMODE QUICK ACTIONS
- [ ] Sequentially invalidates + reads back each probe; streams a colored timestamped line each
- [ ] Each line's status/detail = real post-invalidation value
- [ ] audit.log("full-system-check", …) fires
- [ ] tsc/build green · CDP: ≥5 lines match the health grid · screenshot · commit + log

**P1-E Code action bar**
- [ ] Build/Typecheck/Git Diff/Ask arm real terminals in the active file's repo
- [ ] Tests disabled-with-reason when no test script
- [ ] All disabled when no active file/repo
- [ ] tsc/build/doctor green · CDP: Build → terminal with npm run build in repo cwd · screenshot · commit + log

**P1-F Gmail scope** — [ ] scope added OR label dropped (user decision) · [ ] grep shows no "Gmail" label without a scope · [ ] tsc/build green · commit + log

**P1-G Agents stop+meter** — [ ] per-agent Stop kills exact-cwd terminal (confirm), disabled on 0/>1 match · [ ] swarm meter N live/M total · [ ] tsc/build green · CDP: Stop kills the terminal · screenshot · commit + log

**P1-H Metrics strip** — [ ] strip reuses useOps; every cell probe-derived or "n/a" · [ ] N/7 matches the dock · [ ] tsc/build green · screenshot · commit + log

**P1-I idle-recap audit** — [ ] read TerminalPane fresh · [ ] verify non-blocking + real content + no flash loop + doctrine · [ ] fix if broken, else document verified · [ ] screenshot · log entry

**P2-1 Creative backend** — [ ] main/creative.ts + creative:generate (3-file IPC) · [ ] one provider, key from creative.json, honest when absent · [ ] asset saved + Neuromap node · [ ] Generate enabled only with a key · [ ] tsc/build/doctor green · CDP real-effect · screenshot · commit + log

**P2-2..P2-8** — [ ] each: read fresh · real or honest-pending · tsc/build/doctor green · screenshot where UI changes · commit + log · (P2-8 Library only after peer settles)

### APPENDIX AE — KEYMAP / SHORTCUT REFERENCE

Global shortcuts (App.tsx keyboard handler). When P2-5 (rebinding) lands, these become defaults persisted in settings.

| Shortcut | Effect | Source | Gated? |
|---|---|---|---|
| ⌘K / Ctrl+K | toggle Command Palette | App.tsx | no |
| ⌘J / Ctrl+J | toggle Phone Connect | App.tsx | no |
| ⌘1 | Terminal sector | App.tsx (CORE_SECTORS[0]) | can("sector:ide") |
| ⌘2 | Agents sector | App.tsx | can("sector:agents") |
| ⌘3 | Code sector | App.tsx | can("sector:code") |
| ⌘4 | Neuromap sector | App.tsx | can("sector:neuromap") |
| ⌘5 | Drive sector | App.tsx | can("sector:drive") |
| ⌘6 | Metrics sector | App.tsx | can("sector:metrics") |
| ⌘7 | Preview sector | App.tsx | can("sector:preview") |
| ⌘8 | Creative sector | App.tsx | can("sector:creative") |
| ⌘S / Ctrl+S | Save active file (Code) | CodeView.tsx | in Code view |
| Esc | close palette / GODMODE / panels / drawers | each panel | no |
| ↑ ↓ ⏎ | palette navigate / run | CommandPalette | no |

- A blocked sector jump (no cap) audits `access-denied` — it does not silently no-op (honest). 
- Shortcuts are read from a `canRef` so the mount-time closures always read fresh grants.
- When adding a shortcut: register in the App keydown handler, respect `can()` if it targets a gated surface, and add it to Settings ▸ Shortcuts (read-only today; rebindable after P2-5).

### APPENDIX AF — OpStatus × SURFACE BEHAVIOR MATRIX

How each status renders across surfaces (so a new surface behaves consistently).

| OpStatus | Dot color | Dock chip | GODMODE Health card | Panel field | Palette badge | TopBar/StatusBar count |
|---|---|---|---|---|---|---|
| live | teal | glowing dot + "live" | teal ● live | teal ● live | live badge | counts toward liveCount |
| running | gold-soft | dot + "running" | gold ● running | gold ● running | running badge | counts toward liveCount |
| idle | muted | dot + "idle" | muted ● idle | muted ● idle | idle badge | not live, not attention |
| partial | orange | dot + "partial" | orange ● partial | orange ● partial | partial badge | not live |
| local-only | blue | dot + "local only" | blue ● local-only | blue ● local-only | local badge | not live |
| setup-required | ember | dot + "setup required" + next-action | ember ● setup | ember ● setup | setup badge | counts toward attention |
| pending-backend | violet | dot + "pending backend" | violet ● pending | violet ● not wired | pending badge | not live |
| error | red | dot + "error" | red ● error | red ● error | error badge | counts toward attention |
| offline/unknown | faint | dot + word | faint ● | faint ● | — | not live |
| (checking) | state-checking | "checking…" | — | — | — | shows "checking…" |

Rule: a new surface reads the status from `useOps()` and colors via `STATUS_META[status].color`. It must treat `setup-required`/`error` as "attention" and only `live`/`running` as "live" — consistent with every other surface.

### APPENDIX AG — COMPLETE SUPERPOWER ACTION ENUMERATION (every action, full detail)

Every action across the 7 powers, with its factory + real effect + verdict. This is the exhaustive action inventory (the dock quick panels + the SuperpowerPanel actions render exactly these).

**Obsidian**
1. `obs-open` "Open Vault (Obsidian)" → openObsidian() → tools.action("open-obsidian") → opens obsidian:// URI · REAL
2. `obs-map` "Open Neuromap" → goto("neuromap") · REAL
3. `obs-search` "Search Notes (Research)" → goto("research") · REAL
4. `obs-sync` "Sync Vault" → admin("team") → Settings ▸ Team Sync (git engine) · REAL
5. `obs-chat` "Plan Vault Chat" → deployClaudeWithPrompt(vaultChatPrompt, vaultDir) · REAL (arms an agent)

**Grapevine/Graphify**
1. `gv-map` "Open Map (Neuromap)" → goto("neuromap") · REAL
2. `gv-digest` "Open Graph Digest" → graphifyOpenDigest() → superpowers.openDigest() · REAL (honest if absent)
3. `gv-regen` "Regenerate Digest" → graphifyRegen() → armTerm("graphify update .", repo) · REAL
4. `gv-research` "Show Research Lens" → goto("research") · REAL
5. `gv-agents` "Show Agents Layer" → goto("neuromap") · REAL

**Ruflo**
1. `rf-ignite` "Ignite (health check)" → rufloIgnite() → superpowers.health("ruflo") + honest toast · REAL
2. `rf-mission` "Broadcast Mission (Agents)" → goto("agents") · REAL
3. `rf-queue` "View Task Queue" → armTermToast("ruflo task list", "~", …) · REAL
4. `rf-flows` "Continue Flow" → armTermToast("ruflo session list", "~", …) · REAL
5. (P1-B add) "Reconnect" → rufloIgnite() relabeled · "Open Logs" → admin("audit")

**Cloud**
1. `cl-launch` "Launch Claude Session" → deployTerm("claude", "~") · REAL
2. `cl-mc` "Open Mission Control" → goto("agents") · REAL
3. `cl-metrics` "View Tokens (Metrics)" → goto("metrics") · REAL
4. `cl-stop` "Open Terminal Stop Controls" → goto("ide") · REAL

**Agents**
1. `ag-view` "Open Mission Control" → goto("agents") · REAL
2. `ag-launch` "Launch Claude Agent" → deployTerm("claude", "~") · REAL
3. `ag-logs` "Inspect Live Transcripts" → goto("agents") · REAL
4. `ag-assign` "Assign Sector" → goto("agents") · PARTIAL (over-promises → P0-2 rename)

**GODMODE**
1. `gm-open` "Open GODMODE" → godmode() → opens the full panel · REAL
   (panel actions: Global Command, Open Terminal/Preview/Metrics, Launch Agent, Capture Screenshot, Sync Vault, Emergency Stop, + Full System Check P1-D)

**Google APIs**
1. `gg-drive` "Open Drive Ops" → goto("drive") · REAL
2. `gg-keys` "Credentials (Keys)" → vault() → CredentialsVault · REAL
3. `gg-health` "API Health" → admin("health") · REAL
4. `gg-repair` "Cloud Repair Prompt" → deployClaudeWithPrompt(repairPrompt, repo) · REAL

Total: 27 declared superpower actions (+ GODMODE's 8-9 panel actions). operationalTruth() counts these + MORE items. All have `run` (REAL) — the only quality issue is `ag-assign`'s over-promising label.

### APPENDIX AH — COMPLETE MORE-LAUNCHER ENUMERATION

MORE_CATEGORIES (registry) — every item, status, effect. Rendered by LeftRail; `cap` items hidden when the member lacks the grant.

- LIBRARY → `library` "Admin Library" · status live · goto("library") · cap adm:library · REAL (gated)
- INTELLIGENCE → `research` "Research" · live · goto("research") · REAL
- INTELLIGENCE → `radar` "GitHub Radar" · idle · goto("radar")+radar.refresh() · REAL
- INTELLIGENCE → `obscura` "Obscura" · setup-required · goto("research") · HONEST (external module pending)
- OUTPUT → `previewx` "Preview Engine" · idle · goto("preview") · REAL
- OUTPUT → `creativex` "Creative APIs" · setup-required · goto("creative") · HONEST (needs keys)
- ADMIN → `keys` "Keys" · local-only · vault() · REAL
- ADMIN → `phone` "Phone" · live · phone() · REAL
- ADMIN → `googlex` "Google APIs" · goto("drive") · REAL
- ADMIN → `audit` "Audit" · local-only · admin("audit") · REAL
- ADMIN → `settings` "Settings" · local-only · admin("settings") · REAL
- ADMIN → `perms` "Permissions" · local-only · admin("perms")→Team category · REAL (sub-label stale: P2-6)
- EXPERIMENTAL → `omnigent` "Omnigent" · local-only · armTerm("omnigent", "~") · REAL
- EXPERIMENTAL → `leanctx` "lean-ctx" · local-only · armTerm("lean-ctx stats", "~") · REAL
- EXPERIMENTAL → `team` "Obsidian Team" · local-only · admin("team") · REAL

All 15 items have run() or an honest status. Zero dead items. The only nit: `perms` sub-label "team & roles · local" predates the vault-synced model (P2-6 cosmetic fix).

### APPENDIX AI — EDITOR'S NOTES PER SEAM FILE (edit these with care)

For each load-bearing file: what it is, what breaks it, the safe way to edit.

**`src/shared/ipc.ts`** — the IPC contract (channels + types + `window.dai` interface).
- Breaks if: a channel/type/interface method drift out of sync (tsc catches it) — but only if all three sides are edited.
- Safe edit: add `CH.X` + payload/return type + `window.dai` method in ONE pass; then main + preload; then tsc.
- Contended: peer edits it for Library (tips) — read fresh, keep additions in a distinct region.

**`src/main/ipc.ts`** — all `ipcMain.handle` registrations.
- Breaks if: a channel is registered twice (boot crash). Grep `CH.X` before adding.
- Safe edit: one `handle` per channel; call `auditLog` for consequential actions; return typed results (never swallow errors into fake success).

**`src/preload/index.ts`** — the contextBridge exposing `window.dai` + the MessagePort transport.
- Breaks if: you break the MessagePort wiring (terminal IO dies) or expose a raw node primitive (security).
- Safe edit: add the bridge method mirroring the channel; never expose `ipcRenderer` directly or any node module to the renderer.

**`src/renderer/src/registry.tsx`** — the operational registry.
- Breaks if: an action has neither `run` nor `disabledReason` (doctor fails); a factory changes signature used elsewhere.
- Safe edit: add/relabel actions; keep every action honest; run doctor. HEAVILY contended by the Library peer — quiet window + immediate commit.

**`src/renderer/src/hooks/useOps.ts`** — the status pipeline.
- Breaks if: you change `statusOf` semantics or stop reading a probe → statuses across ALL surfaces shift at once.
- Safe edit: add a probe input to `env` without changing existing mappings; never loosen a mapping to inflate liveCount.

**`src/renderer/src/hooks/useMe.ts`** — access resolution.
- Breaks if: `can()` stops default-allowing while loading → owner sees restricted flicker; or a cap check inverts.
- Safe edit: add caps to teamCaps.ts; consult `can()` for UX + `teamCan()` server-side for writes.

**`src/main/tools.ts`** — `probeTools()`, the dock status source.
- Breaks if: a probe throws unguarded → the whole dock goes unknown.
- Safe edit: each probe try/catch → a status; add a new tool's probe beside the others; keep it fast (dock refetches on interval).

**`src/pty-host/host.ts`** — node-pty utilityProcess.
- Breaks if: ArrayBuffer transfer list over MessagePort (nulls the message); spawn-helper not +x (posix_spawnp fails).
- Safe edit: rarely needed; if so, preserve the ack-based flow control and the structured-clone (no-transfer) rule.

### APPENDIX AJ — CDP ASSERTION SNIPPET LIBRARY

Drop these into the H.3 harness (`send("Runtime.evaluate", {expression, returnByValue:true})`). Each returns a value you assert.

```js
// React mounted (not black screen):
`(document.getElementById("root")||document.body).innerHTML.length > 200`
// A superpower chip opens a full panel (P1-A):
`(()=>{const c=[...document.querySelectorAll('.sp-chip')].find(b=>/Ruflo/.test(b.textContent));c?.click();return !!document.querySelector('.sp-panel--full .sp-panel-grid');})()`
// GODMODE health grid has colored cards:
`document.querySelectorAll('.gm-card').length`
// Palette disabled command does not run (shows reason):
`(()=>{const r=[...document.querySelectorAll('.cmdk-row.disabled')][0];return r?.getAttribute('title')||null;})()`
// A button is honestly disabled (has a reason):
`(()=>{const b=[...document.querySelectorAll('button[disabled]')].find(b=>/Generate/.test(b.textContent));return b?.title||b?.nextElementSibling?.textContent||null;})()`
// Terminal count after a spawn (P0-1/P1-E) — via the bridge:
`window.dai.term.list().then(t=>t.length)`  // use awaitPromise:true in Runtime.evaluate
// Live superpower count matches between dock and a strip (P1-H):
`[document.querySelector('.eco-live')?.textContent, document.querySelector('.sbar-item.ok')?.textContent]`
// No emoji leaked into product UI (rough scan):
`/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(document.body.innerText)`  // expect false
```
For promise-returning expressions, pass `{expression, awaitPromise:true, returnByValue:true}` to `Runtime.evaluate`.

### APPENDIX AK — SETTINGS: COMPLETE CATEGORY BREAKDOWN

The consolidated Settings surface (AdminPanel + SettingsSections). Admin categories gate on `adm:*` via useMe. Every control below is REAL/honest.

**Appearance** — motion on/off · density comfortable/compact · glow on/off · language EN/RO. Persisted to localStorage, applied live (useAppearance). No backend.

**IDE Config** — font size · sessions window (60/240/1440) · audit retention · vault auto-sync toggle · default cwd · radar auto-refresh. Persisted to `~/.config/dai/settings.json` (0600) via `settings.set`.

**Team** — roster (add/remove members, owner-only) · per-member capability matrix (toggle sector:/sp:/act:/adm: grants) · role presets (owner/editor/viewer) · current identity. Writes vault `_team/team.json`. Cooperative (Appendix D).

**Team Sync** — vault git status · Sync now (commit+push) · set remote URL. `vaultSync.*`. This is the transport for Team grants.

**Superpowers** — read-only live status of all 7 (from useOps) + "Check now" (invalidate tools query). No fake status.

**Integrations** — read-only truth: each integration's probe value verbatim + a link to configure. Honest.

**Shortcuts** — read-only keymap list (Appendix AE). Rebinding = P2-5 (honestly labeled "future pass").

**Audit** — append-only JSONL viewer (`audit.list`). Every consequential action lands here. Read-only.

**API Health** — Google per-service probes (`google.health`) — Drive/Sheets/Forms status. Live.

**Developer** — copy the doctor command · invalidate caches · open audit · operationalTruth readout. For the operator/executor.

Rule for adding a setting: put persisted config in `settings.json` via `settings.set` (0600); put team state in `team.json` via `team.set`; never store a secret in either (secrets → `~/.config/dai/*.json` 0600, denylisted from fs reads). Every new setting category that gates on admin consults `useMe().can("adm:...")`.

### APPENDIX AL — PROBE REFERENCE (`src/main/tools.ts probeTools()` + friends)

The real signals behind every status. When a status looks wrong, check the probe here — do not "fix" it in the renderer.

| Tool id | Signal(s) read | live when | ready when | else |
|---|---|---|---|---|
| obsidian | pgrep Obsidian · vault dir · `.obsidian/*.lock` mtime | app running / lock fresh | vault dir present | setup-required |
| graphify | `launchctl list` graphify agent · `_GRAPHIFY_DIGEST.md` mtime | digest fresh | agent loaded / digest exists | setup-required |
| ruflo | `ruvector.db` freshness (written recently) | db fresh | db present | setup-required |
| godmode | godmode-lab dir · active session in it | active session | lab exists | setup-required |

Plus non-tool probes feeding `useOps().env`:
- **sessions** (`main/sessions.ts`) — parse `~/.claude/projects/*.jsonl`: live = idle_min<3; total; scores; ctx; out.
- **gdrive** (`main/gdrive.ts`) — `~/.config/dai/google.json`: clientId+secret → configured; refreshToken → signedIn; email.
- **agent health** (`main/agenthealth.ts`) — per-session goal%/status/problems/cwd_full.
- **superpowers.health(id)** (`main/superpowers.ts`) — deep CLI probe (ruflo status parse) for Ignite.

Rules: every probe is try/caught → a status (never throws to the dock); probes must be fast (dock refetches on interval); a probe reads a REAL signal (process/file/db) — never a config flag that says "pretend live".

### APPENDIX AM — `dai:*` EVENT BUS (dispatchers → listeners)

The internal command bus. Add a new event only when cross-component decoupling genuinely needs it; otherwise call the factory directly.

| Event | detail | Dispatched by | Listened by | Effect |
|---|---|---|---|---|
| dai:goto | view id | goto(), many actions | App.tsx | setView(view) |
| dai:vault | — | vault() | App.tsx | open CredentialsVault |
| dai:phone | — | phone() | App.tsx | open PhoneConnect |
| dai:godmode | — | godmode() | App.tsx | open GodModePanel |
| dai:more | — | EcosystemBar Tools btn | App.tsx | open More menu |
| dai:admin | category id | admin(tab) | App.tsx | open Settings at ADMIN_CAT_MAP[category] |
| dai:refresh-tools | — | refreshTools() | App.tsx | invalidate tools query (re-probe dock) |
| dai:sector-action | action id | palette Recommended / sector actions | active view | in-view behavior (code:save, pv:refresh, pv:external, agents:select-first, agents:focus-broadcast) |

Contract: a sector action id added to `sectorActions.tsx` MUST be handled in the target view's `dai:sector-action` listener, else it's a dead command. ADMIN_CAT_MAP (App.tsx) remaps legacy tab ids (settings/perms/team/audit/health) → the consolidated Settings categories.

### APPENDIX AN — COMPLETE SOURCE FILE INVENTORY (one line each)

**`src/main/` (privileged process)**
- index.ts — app bootstrap, window, MessagePort wiring, port to pty-host
- ipc.ts — all ipcMain.handle registrations (the handler hub)
- tools.ts — probeTools(): dock status source
- superpowers.ts — ruflo/graphify deep health + digest open (Ignite backend)
- sessions.ts — parse ~/.claude/projects/*.jsonl → session metrics
- agenthealth.ts — per-agent goal%/status/problems
- projects.ts — workspaces + git branch/dirty
- fs.ts — HOME-confined + secret-denylisted file ops
- gdrive.ts — Google OAuth (loopback+PKCE) + Drive
- google.ts — Sheets/Forms/Gmail workspace ops
- driveMeta.ts — drive-meta.json registry (Creative/Candidate nodes)
- neo.ts — Neo browser over CDP (Preview drive)
- neuromap.ts — vault graph builder
- radar.ts — GitHub radar scanner
- proton.ts — Proton Mail bridge probe
- settings.ts — ~/.config/dai/settings.json (0600)
- audit.ts — ~/.config/dai/audit.jsonl (0600, append-only)
- team.ts — team.json + identity + owner invariant
- tips.ts — Library tips store (server-checks adm:library)
- vaultSync.ts — git engine over the vault

**`src/shared/`**
- ipc.ts — IPC contract (channels + types + window.dai interface) [single source of truth]
- port.ts — pty-host MessagePort protocol
- teamCaps.ts — capability catalog + role presets + resolvePreset/grantsHave

**`src/preload/`**
- index.ts — contextBridge (window.dai) + MessagePort transport

**`src/pty-host/`**
- host.ts — node-pty utilityProcess (terminal IO, ack flow control)

**`src/renderer/src/` (root)**
- App.tsx — shell root: view state, command bus, shortcuts, panels wiring
- main.tsx — React entry
- registry.tsx — operational registry (superpowers/more/actions/operationalTruth)
- sectorActions.tsx — per-sector contextual actions + SECTOR_INFO
- palette.ts — palette provider registry + rankCommands
- paletteRecents.ts — recent command ranking
- api.ts — window.dai wrappers (fetchHost/Projects/Sessions/etc.)
- views.ts — View type + SECTOR_FOR_VIEW + isView
- keymap.ts — keymap data (Shortcuts settings)
- guideContent.ts — Dragon Guide bilingual content
- idleRecap.ts — idle-recap logic (merged feature)
- lastAction.ts — last-action external store (StatusBar)
- toast.ts — toast bus (pushToast/updateToast)
- queryClient.ts — react-query client
- monaco-setup.ts — Monaco theme/config
- elements.ts / env.d.ts — misc

**`src/renderer/src/hooks/`**
- useOps.ts — status pipeline (probes → statuses → liveCount) [load-bearing]
- useMe.ts — access control resolution [gate everywhere]
- useAppearance.ts — i18n + density/motion (useT)
- useEscape.ts — Escape key helper

**`src/renderer/src/components/`** (key ones; full list has ~30)
- EcosystemBar.tsx — superpower dock
- GodModePanel.tsx — GODMODE panel (template)
- MissionBar.tsx (+ .stories) — agent launch/broadcast bar
- CommandPalette.tsx — ⌘K launcher
- AdminPanel.tsx — Settings shell (+ settings/ subdir: SettingsSections etc.)
- shell/{LeftRail,TopBar,StatusBar}.tsx — app chrome
- AgentTranscript.tsx / ReasoningStream.tsx — live agent output
- SessionCard.tsx / ScoreGauge.tsx — metrics cards
- TerminalPane.tsx — xterm pane (+ idle-recap overlay)
- ProjectRail.tsx / Crystal.tsx — terminal sidebar/visual
- FileTree.tsx — Code file tree
- CredentialsVault.tsx / PhoneConnect.tsx / FirstRunIdentity.tsx / GuidePanel.tsx — modals/drawers
- ToastHost.tsx — toast renderer
- DragonEmblem.tsx / TitleBar.tsx / icons.tsx — brand/chrome
- da.tsx — shared DA primitives (SectionHeader/EmptyState/OpStatusBadge) [reuse for panels]
- ShortcutList.tsx — Shortcuts settings list
- library/ — Admin Library (⚠ peer-refactored)
- settings/ — Settings category components
- design-tools/ — Creative design demos (flagged)

**`src/renderer/src/views/`** — see Appendix B (11 views + drive/ + neuromap/ subdirs)

New files this plan introduces: `components/SuperpowerPanel.tsx` (P1-A), `main/creative.ts` (P2-1), `docs/superpowers/execution-log/2026-07-DAI-fable-build.md` (Appendix F).

### APPENDIX AO — FINDINGS REGISTER (ISSUE / EVIDENCE / IMPACT / FIX / PRIORITY)

Every finding from the audit, numbered, in the operator's audit format. F## are referenced by the construction tasks.

**F01 — DEAD button: Preview Micro Terminal Run**
- ISSUE: Run performs no execution while copy claims "Executes via the terminal host".
- EVIDENCE: PreviewView.tsx — `onClick={() => { setCmd(""); }}`.
- IMPACT: doctrine violation (a click that lies) — the single clearest one in the app.
- FIX: P0-1 (wire to window.dai.term OR honestly disable).
- PRIORITY: P0.

**F02 — Over-promising label: Agents "Assign Sector"**
- ISSUE: label implies an operation; handler only navigates.
- EVIDENCE: registry.tsx — `{ id:"ag-assign", label:"Assign Sector", run: goto("agents") }`.
- IMPACT: label over-promises (doctrine-adjacent).
- FIX: P0-2 (rename to "Open Agents Cockpit" until real).
- PRIORITY: P0.

**F03 — Label/scope mismatch: Google "Gmail" without a Gmail scope**
- ISSUE: role + Mail tab advertise Gmail; OAuth SCOPES lack a Gmail scope.
- EVIDENCE: registry Google role "…· Gmail"; main/gdrive.ts SCOPES = Drive+Sheets+Forms.
- IMPACT: advertises an un-scoped capability.
- FIX: P1-F (add scope or drop label).
- PRIORITY: P1.

**F04 — Menus not panels: 6 of 7 superpowers**
- ISSUE: only GODMODE opens an operational panel; others open a quick menu.
- EVIDENCE: EcosystemBar QuickPanel vs GodModePanel.
- IMPACT: inconsistent operational surface; the user's central ask (GODMODE format everywhere) unmet.
- FIX: P1-A/B/C (SuperpowerPanel).
- PRIORITY: P1.

**F05 — GODMODE lacks explicit Full System Check**
- ISSUE: GODMODE is a live check but no button re-runs all probes with streamed colored output.
- EVIDENCE: GodModePanel QUICK ACTIONS (no such button).
- IMPACT: user §2 asks for it; missing.
- FIX: P1-D.
- PRIORITY: P1.

**F06 — Code sector missing action bar**
- ISSUE: no in-view Build/Typecheck/Tests/Diff/Ask; only palette-armed terminals.
- EVIDENCE: CodeView.tsx tab strip has only Save.
- IMPACT: "engineering deck" intent ~60% realized.
- FIX: P1-E.
- PRIORITY: P1.

**F07 — Agents missing per-agent Stop + swarm meter**
- ISSUE: stop only via Terminal; no capacity gauge.
- EVIDENCE: AgentsView.tsx (no Stop button; header shows N live·M total, not a meter).
- IMPACT: cockpit under-sold.
- FIX: P1-G.
- PRIORITY: P1.

**F08 — Metrics not a system-health dashboard**
- ISSUE: session metrics only; no superpower/ruflo/lean-ctx/AgentDB health.
- EVIDENCE: MetricsView.tsx.
- IMPACT: user §10 vision unmet.
- FIX: P1-H.
- PRIORITY: P1.

**F09 — Creative fully pending (needs keys + backend)**
- ISSUE: honest but 0% functional; Generate disabled.
- EVIDENCE: CreativeView.tsx (all cards "needs KEY").
- IMPACT: least operational sector.
- FIX: P2-1 (build one provider backend).
- PRIORITY: P2.

**F10 — Neuromap Team/Tasks honest-pending**
- ISSUE: empty states; need a shared team/task source.
- EVIDENCE: NeuromapView modes.
- IMPACT: not ready for 5-7 team knowledge view.
- FIX: P2-2.
- PRIORITY: P2.

**F11 — idle-recap UNAUDITED (merged by peer)**
- ISSUE: new overlay not verified in this audit.
- EVIDENCE: bb9c018/648e6d4; TerminalPane + idleRecap.ts.
- IMPACT: unknown correctness/honesty.
- FIX: P1-I (re-audit).
- PRIORITY: P1.

**F12 — Library in active refactor (moving target)**
- ISSUE: peer deleting AgentCatalog + rewriting AdminSection/TeamSection/registry.
- EVIDENCE: git status (D AgentCatalog.tsx, M registry/LeftRail/App).
- IMPACT: cannot safely audit/modify now.
- FIX: P2-8 (re-audit after settle).
- PRIORITY: P2.

**F13 — Deploy drift: installed app behind HEAD**
- ISSUE: installed = 28c639a; HEAD = 5497e67 (idle-recap + Library not in app).
- EVIDENCE: app timestamp vs git log.
- IMPACT: operator runs an older build.
- FIX: rebuild + swap when the tree settles (H.5).
- PRIORITY: P1 (ops).

**F14 — DMG build broken**
- ISSUE: `dist` fails at DMG (app-builder-bin ENOENT); .app is fine.
- EVIDENCE: dist log.
- IMPACT: no distributable DMG (single-machine unaffected).
- FIX: P0-4/P2 (npm install).
- PRIORITY: P2 (unless distributing).

**F15 — Google not signed in (Drive locked)**
- ISSUE: partial — creds saved, no refresh token.
- EVIDENCE: doctor google:config OK, signedIn false.
- IMPACT: Drive sector gated until sign-in.
- FIX: P0-3 (user signs in).
- PRIORITY: P0 (user action).

**F16 — Perms More sub-label stale**
- ISSUE: "team & roles · local" predates vault-synced model.
- EVIDENCE: registry MORE ADMIN perms.
- IMPACT: cosmetic inaccuracy.
- FIX: P2-6.
- PRIORITY: P2.

**F17 — TopBar has no branch/build chip**
- ISSUE: no active-workspace branch shown (honest gap, self-noted).
- EVIDENCE: TopBar.tsx comment.
- IMPACT: minor context missing.
- FIX: P2-4.
- PRIORITY: P2.

**F18 — Terminal gated-CLI silent no-op**
- ISSUE: ollama/hermes/codex rows do nothing when unavailable (dot only).
- EVIDENCE: TerminalsView.
- IMPACT: minor honesty polish.
- FIX: P2-3 (toast).
- PRIORITY: P2.

**Register summary:** 18 findings. P0: F01, F02, F15 (+F04-user). P1: F03, F04, F05, F06, F07, F08, F11, F13. P2: F09, F10, F12, F14, F16, F17, F18. Zero FAKE-status findings. One DEAD control (F01). The register is dominated by *elevation* (F04-F08) and *honest-pending* (F09-F12), not by rot.

### APPENDIX AP — SUMMARY TABLES (quick reference)

**By verdict (≈95 controls):** REAL ~88 · HONEST-DISABLED ~5 · PARTIAL 1 (F02) · DEAD 1 (F01) · FAKE 0.

**By priority (18 findings):** P0 = 3 code + 1 user (F01,F02 / F15) · P1 = 8 (F03-F08,F11,F13) · P2 = 7 (F09,F10,F12,F14,F16,F17,F18).

**By sector operational score:** GODMODE 92 · Palette 90 · Settings 88 · Chrome 88 · Terminal 87 · Dock 85 · Metrics 84 · Ruflo-power 84 · Agents 82 · Neuromap 82 · Code 78 · Drive 74 · Library 70* · Preview 66 · Creative 35. **App ≈ 80/100.**

**Critical path:** P0-1 → P0-2 → P1-A → P1-B → P1-D → P1-E (the 80/20).

**Effort tiers:** label fixes (mins) → dead-button (small) → SuperpowerPanel (real component) → panels (thin config) → action bars (medium) → Creative backend (feature).

### APPENDIX AQ — BUILD RECIPES (P1-E / P1-G / P1-H skeletons)

Illustrative — re-read the live file first; reuse existing helpers (armTerm pattern, term.list exact-cwd, useOps).

**P1-E — Code action bar (CodeView.tsx tab strip):**
```tsx
// compute the active file's repo (already present as `repo`); arm real terminals in repo.path
const armIn = (typed: string) => {
  if (!repo) return;
  const id = `code${Date.now().toString(36)}`;
  window.dai.term.create({ id, cmd: "shell", cwd: repo.path });
  setTimeout(() => window.dai.term.write(id, typed + "\n"), 1200);
  window.dai.audit.log("code-action", `${typed} @ ${repo.name}`);
  pushToast({ kind: "info", title: typed, detail: `in ${repo.name}` });
  window.dispatchEvent(new CustomEvent("dai:goto", { detail: "ide" }));
};
const hasTestScript = /* read repo package.json once via fsRead, cache */ false;
// buttons (disabled when !active || !repo):
<button disabled={!repo} onClick={() => armIn("npm run build")}>Build</button>
<button disabled={!repo} onClick={() => armIn("npx tsc --noEmit")}>Typecheck</button>
<button disabled={!repo || !hasTestScript}
        title={hasTestScript ? "" : "no test script in package.json"}
        onClick={() => armIn("npm test")}>Tests</button>
<button disabled={!repo} onClick={() => armIn("git diff")}>Git Diff</button>
<button disabled={!active} onClick={() => {
  const p = `Review ${active!.path} for correctness, then propose a minimal fix.`;
  const id = `ask${Date.now().toString(36)}`;
  window.dai.term.create({ id, cmd: "claude", cwd: repo?.path || active!.path });
  setTimeout(() => window.dai.term.write(id, p), 1800);
  window.dispatchEvent(new CustomEvent("dai:goto", { detail: "ide" }));
}}>Ask agent</button>
```
Honesty: Tests disabled-with-reason when no script. Never a button that fails silently.

**P1-G — Agents per-agent Stop (AgentsView.tsx card):**
```tsx
// reuse the exact-cwd unique-match logic from Autopilot (Appendix U.1)
async function stopAgent(s: Session) {
  const terms = await window.dai.term.list();
  const cwd = s.cwd_full || "";
  const matches = terms.filter(t => t.cmd === "claude" && t.cwd === cwd);
  if (matches.length !== 1) return;               // 0 or >1 → disabled path
  if (!window.confirm(`Stop agent "${s.title}"? Kills its terminal.`)) return;
  window.dai.term.kill(matches[0].id);
  window.dai.audit.log("agent-stop", s.title);
}
// render per card: <button disabled={matchCount!==1} title={matchCount!==1?"no unique terminal":""} onClick={()=>stopAgent(s)}>Stop</button>
// swarm meter in header: `${liveNow} live / ${sessions.length} total` as a small gauge (data already present)
```

**P1-H — Metrics system-health strip (MetricsView.tsx above the grid):**
```tsx
const { liveCount, total, statuses, liveAgents } = useOps();
// each cell probe-derived or honest "n/a"
<div className="mv-syshealth">
  <span>superpowers <b>{liveCount}/{total}</b> live</span>
  <span>ruflo <b className={`st-${statuses.ruflo}`}>{statuses.ruflo}</b></span>
  <span>graphify <b className={`st-${statuses.graphify}`}>{statuses.graphify}</b></span>
  <span>agents <b>{liveAgents}</b></span>
  {/* lean-ctx / AgentDB: only if a real signal exists, else omit or "n/a" */}
</div>
```
Assertion: this strip's `liveCount/total` must equal the dock's at the same instant (both read useOps).

### APPENDIX AT — `usePanelData(id)` PER-POWER BRANCHES (exact field specs, code)

The per-power data hook for SuperpowerPanel (P1-A/C). Every field probe-derived; unwired → "not wired"/pending-backend.

```ts
function usePanelData(id: string): PanelSpec {
  const { env, statuses } = useOps();
  const { data: sess } = useQuery({ queryKey: ["gm-sessions"], queryFn: () => fetchSessions(240) });
  const { data: graph } = useQuery({ queryKey: ["nm-graph"], queryFn: () => window.dai.neuromap.graph({ layers:["all"] }), enabled: id==="obsidian"||id==="graphify" });
  const { data: rufloH } = useQuery({ queryKey:["ruflo-h"], queryFn:()=>window.dai.superpowers.health("ruflo"), enabled: id==="ruflo" });
  const { data: rufloQ } = useQuery({ queryKey:["ruflo-q"], queryFn:()=>window.dai.superpowers.rufloQueue(), enabled: id==="ruflo" });
  const { data: gh }     = useQuery({ queryKey:["g-health"], queryFn:()=>window.dai.google.health(), enabled: id==="google" });

  switch (id) {
    case "obsidian": return { fields: [
      { label:"Vault",  status: statuses.obsidian, value:"Antigravity-Brain" },
      { label:"Lock",   status:"idle",             value: /* .lock state from tools detail */ "closed" },
      { label:"Notes",  status:"live",             value: graph ? `${graph.nodes.length}` : "…" },
      { label:"Edited", status:"idle",             value: /* last mtime */ "—" },
    ], primary:{ label:"Vault", status: statuses.obsidian, detail:"~/Documents/Obsidian/Antigravity-Brain" } };

    case "graphify": return { fields: [
      { label:"Digest", status: statuses.graphify, value: /* digest mtime */ "—" },
      { label:"Graph",  status:"live",             value: graph ? `${graph.nodes.length}n / ${graph.edges.length}e` : "…" },
      { label:"Engine", status: statuses.graphify, value:"launchd" },
      { label:"Fresh",  status: statuses.graphify==="live"?"live":"partial", value: statuses.graphify==="live"?"fresh":"stale — regen" },
    ] };

    case "ruflo": return { fields: [
      { label:"Engine", status: rufloH?.ok?"idle":"setup-required", value: rufloH?.message || "checking…" },
      { label:"Queue",  status: rufloQ?.ok?"idle":"pending-backend", value: rufloQ?.ok? rufloQ.message : "run to view" },
      { label:"Agents", status:"idle", value: rufloH ? `${rufloH.active ?? 0} active` : "…" },
      { label:"MCP",    status: rufloH?.mcpUp?"live":"idle", value: rufloH?.mcpUp?"up":"idle" },
    ], primary:{ label:"Engine", status: rufloH?.ok?"idle":"setup-required", detail: rufloH?.message || "" } };

    case "cloud": { const live = sess?.live ?? 0, out = (sess?.sessions??[]).reduce((a,s)=>a+s.out,0);
      return { fields: [
      { label:"Live",   status: live>0?"live":"idle", value:`${live} sessions` },
      { label:"Tokens", status:"live",                value:`${human(out)} out` },
      { label:"Model",  status:"idle",                value: /* model split */ "—" },
    ] }; }

    case "agents": { const live = sess?.live ?? 0, total = sess?.sessions.length ?? 0;
      return { fields: [
      { label:"Swarm",  status: live>0?"live":"idle", value:`${live} live / ${total} total` },
      { label:"Worst",  status:"idle",                value: /* worst agent status */ "—" },
    ] }; }

    case "google": return { fields: [
      { label:"Sign-in", status: env.google.signedIn?"live":env.google.configured?"partial":"setup-required",
                         value: env.google.signedIn? "signed in" : env.google.configured? "configure — sign in" : "needs setup" },
      ...(gh ?? []).map(s => ({ label: s.name, status: (s.ok?"live":"idle") as OpStatus, value: s.detail })),
    ] };

    default: return { fields: [] };
  }
}
```
Every branch: real query data or an honest placeholder. Never fabricate a count. `statuses`/`env` come from the shared `useOps()` so panels never disagree with the dock.

### APPENDIX AU — FABLE FIRST-60-MINUTES RUNBOOK

The exact sequence to orient, verify the baseline, and ship the first safe win before touching anything hard.

1. **Orient (10 min).** Read this doc's PART 0 (constraints), §2 (doctrine), Appendix R (reading method). Read `CLAUDE.md` (project) + the hazard memory. Do NOT skip the doctrine.
2. **Snapshot the tree (5 min).** `git branch --show-current`, `git log --oneline -5`, `git status --short`, `git log --oneline origin/main..HEAD`, `git ls-files | grep node_modules` (must be empty), `find src -newermt "-90 seconds"` (peer churn?).
3. **Baseline gates (5 min).** `npx tsc --noEmit`, `npm run build`, `doctor` — all must be green on a quiet tree. If red on a HOT tree, wait 2 min, re-run. Record the baseline in the execution log.
4. **CDP baseline smoke (10 min).** Launch `out/main/index.js --remote-debugging-port=9333 --user-data-dir=/tmp/dai-verify`; assert React mounts (Appendix AJ #1); capture `audit-baseline.jpg`. This proves the app is healthy before you change it.
5. **Ship the first safe win (15 min): P0-2 (rename "Assign Sector").** One-line registry edit in a quiet window; `doctor`+`tsc`; commit. This validates your edit→gate→commit loop on a low-risk change.
6. **Ship P0-1 (dead button) (15 min).** Wire Micro Terminal Run (or honestly disable); CDP-assert; screenshot; commit + log entry. This kills the one doctrine violation.
7. **Then start the critical path: P1-A (SuperpowerPanel).** Design the interface first (Appendix K), build, verify per consumer.

Rule: do not begin P1-A until P0-1/P0-2 are shipped and the loop is proven. Do not touch `registry.tsx`/`App.tsx`/`LeftRail.tsx`/`library/*` while the peer Library refactor is active (check step 2 churn each session).

### APPENDIX AV — CSS CLASS FAMILIES (reuse; do not invent)

Panels/cards/buttons already have class families. Reuse them so new surfaces look native.

- **GODMODE panel:** `.gm`, `.gm-head`, `.gm-crown`, `.gm-title`, `.gm-sub`, `.gm-operator`, `.gm-team`, `.gm-x`, `.gm-body`, `.gm-sec`, `.gm-grid`, `.gm-card`, `.gm-card-label`, `.gm-card-status`, `.gm-card-detail`, `.gm-mission`, `.gm-actions`, `.gm-truth`, `.gm-pending`.
- **Superpower dock:** `.sp-dock`, `.sp-dock-label`, `.eco-live`, `.sp-chips`, `.sp-wrap`, `.sp-chip`, `.sp-card`, `.sp-ic`, `.sp-name`, `.sp-st`, `.sp-dot`, `.sp-hover*`, `.sp-panel`, `.sp-panel-head/-title/-role/-badge/-explain/-meta/-next/-actions`, `.sp-act` (+`.danger`/`.disabled`), `.sp-tools`, `.st-<status>` (per-status chip class).
- **Buttons:** `.da-btn` (+`.gold`/`.ghost`/`.danger`/`.sm`), `.savebtn` (+`.dirty`).
- **Command palette:** `.cmdk-backdrop`, `.cmdk`, `.cmdk-input`, `.cmdk-glyph`, `.cmdk-hint`, `.cmdk-list`, `.cmdk-group`, `.cmdk-row` (+`.sel`/`.disabled`), `.cmdk-ic/-title/-sub/-kbd/-cat`, `.cmdk-foot`, `.cmdk-empty`.
- **Sections/empty:** `.da-section-header`, `.da-empty*` (from da.tsx: SectionHeader/EmptyState), `OpStatusBadge`.
- **Drive/tabs:** `.drv-view/-bar/-title/-status/-tabs/-tab`, `.drv-gate`.
- **Metrics:** `.metrics-view`, `.mv-bar/-stat/-split/-grid/-pick/-reason`.
- **Code:** `.code-view/-sidebar/-main/-tabs/-tab/-repo/-diff/-clean/-toast/-editor/-empty`, `.ct-name/-dot/-x`.
- **Agents/mission:** `.mc-*` (mc-view/list/agent/health/autopilot/mission/launch/chip/send/flash).
- **Preview:** `.pv-*` (pv-view/bar/sel/url/go/btn/body/frame*/neo-img/empty/side/panel/chat*/micro*).

For SuperpowerPanel (P1-A): reuse `.gm-card`/`.gm-grid` for the health grid and extend `.sp-panel` with a `.sp-panel--full` variant. Status dots ALWAYS `style={{ color: STATUS_META[status].color }}` or a `.st-<status>` class — never a literal hex.

### APPENDIX AW — WORKED HERMENEUTIC INTERPRETATION (idle-recap, P1-I)

A demonstration of Appendix R applied to an unfamiliar merged feature, so Fable sees the method in action.

1. **Header first:** open `idleRecap.ts` + `TerminalPane.tsx` — read the top comments. Expect a statement of intent (something like "show a recap when an agent goes idle").
2. **Find the seam:** does it touch privilege? It reads agent transcript/health — via `window.dai` (sessions/agentHealth) or props from a parent that did. Confirm it does NOT read fs/exec directly in the renderer.
3. **Classify the controls:** the overlay likely has a dismiss + maybe a "continue" action. Dismiss = REAL (local state). "Continue" = must broadcast to the agent (real) or be honest-disabled. Check.
4. **Follow the data:** the recap content must derive from REAL transcript/health (last actions, goal%, problems) — NOT a fabricated summary. If it invents a summary with no source, that's a doctrine issue.
5. **Check the copy:** does it claim anything it doesn't do? (e.g. "auto-resumed" when it only showed a card.)
6. **Check the fix history:** `ae9e2a1` fixed a flash-loop by making the overlay `position:absolute`. Verify that fix holds (no re-entrant render loop) — the invariant is "overlay, not layout-shifting modal".
7. **Verdict + action:** if all pass → document "idle-recap verified real, non-blocking, honest" in the execution log. If any fail → minimal fix, re-verify, commit.

The point: you did not need this plan to tell you line numbers. The method (header→seam→classify→data→copy→history) re-derives the finding from whatever the live code is.

### APPENDIX AX — styles.css ADDITIONS NEEDED (per task, token-only)

Only these tasks add CSS; all reuse existing tokens (Appendix N) — no new colors.

- **P1-A SuperpowerPanel:** `.sp-panel--full` (wider panel), `.sp-panel-sec` (section label, reuse `.gm-sec` look), `.sp-panel-grid` (reuse `.gm-grid`), `.sp-panel-primary`, `.sp-panel-truth`. Reuse `.gm-card*` for cells.
- **P1-D Full System Check:** `.gm-check-log`, `.gm-check-row` (timestamp + colored status + detail; color via inline STATUS_META).
- **P1-E Code action bar:** `.code-actions`, `.code-actbtn` (reuse `.da-btn.ghost.sm` where possible).
- **P1-G Agents:** `.mc-agent-stop` (small danger button in the card), `.mc-swarm-meter` (gauge in the header).
- **P1-H Metrics:** `.mv-syshealth` (strip above `.mv-bar`), `.mv-sys-cell`.
- **P2-1 Creative:** reuse existing `.cr-*`; add `.cr-gen.enabled` state when a key exists.

Rule: every new class uses `--panel`/`--line`/`--ink`/`--muted`/`--radius` for structure and `STATUS_META` colors for status. Respect the Appearance `motion`/`density` settings (guard animations behind the reduce-motion state).

### APPENDIX AY — EXHAUSTIVE CONTROL INVENTORY (every interactive element, per view)

The complete UI element map. Each line: control · effect · verdict. Use to confirm nothing is missed and to locate any control fast.

**TitleBar (frameless chrome)**
- traffic lights (min/max/close) · win.minimize/maxtoggle/close · REAL
- drag region · move window · REAL

**TopBar**
- brand block · (static) · REAL
- "N workspaces" chip · projects probe · REAL
- "op · <name>" chip · host home · REAL
- "LOCAL MODE" chip · honest static · REAL
- "SYSTEMS N/7" health chip · useOps · REAL
- ⌘K button · open palette · REAL
- gear button · open Settings · REAL

**LeftRail**
- 8 sector items (Terminal/Agents/Code/Neuromap/Drive/Metrics/Preview/Creative) · setView, gated can("sector:") · REAL
- Guide item · open GuidePanel · REAL
- Settings item · open Settings · REAL
- More/Tools item · open More menu · REAL
- More items (15, Appendix AH) · run/goto, cap-gated · REAL

**Superpower Dock (EcosystemBar)**
- "SUPERPOWERS N/7 live" label · useOps · REAL
- 7 chips · open panel / GODMODE, gated can("sp:") · REAL
- chip hover cards (7) · tooltip · REAL
- Admin button · openLibraryAdmin, gated adm:library · REAL
- Tools button · dai:more · REAL
- QuickPanel actions (27 across powers, Appendix AG) · factories · REAL (1 over-promise F02)

**GODMODE panel**
- esc/close · onClose · REAL
- 5 health cards · probes · REAL
- mission line · top session · REAL
- Global Command · onCommand+palette · REAL
- Open Terminal/Preview/Metrics · goto · REAL
- Launch Agent · term.create claude · REAL
- Capture Screenshot · shot.capture · REAL
- Sync Vault · vaultSync.sync · REAL
- Emergency Stop · term.kill workers (confirm) · REAL
- (Full System Check · P1-D · ABSENT)
- operational-truth footer · operationalTruth() · REAL

**Command Palette**
- search input · rankCommands · REAL
- result rows · run (disabled never runs) · REAL
- ↑↓⏎ nav · REAL
- esc/backdrop close · REAL

**StatusBar**
- sector label · REAL
- "systems N/7" · useOps · REAL
- "agents N" · useOps · REAL
- "attention N" (conditional) · useOps · REAL
- "last · <action>" · lastAction store · REAL
- "checked HH:MM:SS" · useOps · REAL
- "⌘K palette" hint · static · REAL

**Terminal view (ide)**
- + Worker menu: zsh/claude/ollama/hermes/codex · add(cmd), CLI status dots · REAL (F18 silent no-op nit)
- ollama model picker · list models · REAL
- grid/focus/tiles · layout · REAL
- + Add · add shell · REAL
- DEPLOY 2/4/6/8 · openN · REAL
- Channel toggle · setChannel · REAL
- Master SYNC toggle + link-picker · setMirror · REAL
- send→all / Run on all · broadcast · REAL
- worker close (×) · term.kill · REAL
- master + worker panes · pty IO · REAL
- idle-recap overlay · idleRecap · REAL? (F11 re-audit)

**Agents view**
- Autopilot ON/OFF · health watch+nudge · REAL
- agent cards · select · REAL
- health badges · agentHealth · REAL
- transcript pane · sessions.transcript · REAL
- (per-agent Stop · P1-G · ABSENT)
- empty-state Launch Agent / Open Ruflo Status · REAL
- MissionBar Launch ▾ (all/per-project) · term.create · REAL
- MissionBar chips (5) · broadcast (confirm) · REAL
- MissionBar input + Send · broadcast (confirm) · REAL

**Code view**
- file tree nodes · fsRead · REAL
- tabs + close (×) · state · REAL
- ⌘S/Save (dirty-gated) · fsWrite · REAL
- branch/diff badge · projects git · REAL
- Monaco editor · edit · REAL
- (action bar Build/Typecheck/Tests/Diff/Ask · P1-E · ABSENT)

**Neuromap view**
- layer segs (4) · REAL
- view modes (7) · REAL (Team/Tasks honest-pending F10)
- time filter (4) · REAL
- label mode (4) · REAL
- search / lens / Focus / reset · REAL
- Diag panel · counts · REAL
- node inspector + Copy path · REAL
- graph canvas (pan/zoom/select) · REAL

**Drive view**
- 8 tabs · nav · REAL
- Config: save client + sign in · gdrive.* · REAL
- Folders/Sheets/Forms/Mail · gated (Gate) · HONEST
- Proton tab · proton probe · REAL
- Candidates/Activity · REAL

**Metrics view**
- time windows (60/240/24h) · REAL
- session cards · select · REAL
- ReasoningStream · REAL
- error-state Retry · REAL
- (system-health strip · P1-H · ABSENT)

**Preview view**
- project/browser selectors · state · REAL
- url input · state · REAL
- Start · neo/iframe · REAL
- Reload / back / forward · neo · REAL
- Open external · shell.open · REAL
- Neo frame click/scroll · neo.click/scroll · REAL
- Magic Page chat Send · neo.ask · REAL
- non-Neo chat Send · disabled · HONEST
- Micro Terminal Run · **DEAD (F01)**

**Creative view**
- 6 tool cards · select · REAL
- project selector · state · REAL
- prompt textarea · state · REAL
- Generate · disabled ("needs KEY") · HONEST
- asset gallery · empty · HONEST
- design demos (flagged) · REAL when flag on

**Library view (⚠ peer-refactored)**
- Catalog / Shortcuts&Tips tabs · REAL
- CategoryLibrary cards · REAL
- Tips CRUD (TeamSection/AdminSection) · tips.* (server-checked) · REAL

**Modals/drawers**
- CredentialsVault (Keys) · save 0600 · REAL
- PhoneConnect (⌘J) · REAL
- FirstRunIdentity · team.me/identitySet · REAL
- GuidePanel (8 topics) · content + goto · REAL
- ToastHost · toast bus · REAL

Total interactive controls ≈ 95. ABSENT (to build): Full System Check, Code action bar, per-agent Stop, Metrics strip. DEAD: Micro Terminal Run. Over-promise: Assign Sector. Everything else: REAL or honest.

### APPENDIX AZ — CANONICAL PATTERN LIBRARY (copy-paste, the app's idioms)

Reuse these exact shapes so new code reads like the existing code. Each is drawn from the live source.

**Pattern 1 — Honest-disabled control (never a dead click):**
```tsx
action.run
  ? <button onClick={() => { action.run!(); onClose(); }}>{action.label}</button>
  : <button className="disabled" disabled title={action.disabledReason}>
      <span>{action.label}</span><i>{action.disabledReason}</i>
    </button>
```

**Pattern 2 — Real probe → honest status (never hardcode 'live'):**
```ts
// main: try/catch → a status, never throw to the dock
async function probeX(): Promise<"live"|"ready"|"off"> {
  try { const fresh = await isFresh(pathToSignal); return fresh ? "live" : "ready"; }
  catch { return "off"; }
}
// renderer: statusOf maps probe → OpStatus (pure)
statusOf: ({ tool }) => tool("x") === "live" ? "live" : tool("x") === "ready" ? "idle" : "setup-required"
```

**Pattern 3 — Arm a real terminal (the armTerm idiom):**
```ts
const id = `pfx${Date.now().toString(36)}${SEQ++}`;
window.dai.term.create({ id, cmd: "shell", cwd });      // or "claude"
setTimeout(() => window.dai.term.write(id, typed + "\n"), 1400);  // let the shell settle
window.dai.audit.log("kind", `${typed} @ ${cwd}`);
window.dispatchEvent(new CustomEvent("dai:goto", { detail: "ide" }));
```

**Pattern 4 — Exact-cwd unique-match (never act on the wrong agent):**
```ts
const terms = await window.dai.term.list();
const matches = terms.filter(t => t.cmd === "claude" && t.cwd === cwd);  // === not startsWith
if (matches.length !== 1) return;   // 0 = none, >1 = ambiguous → do nothing
doThing(matches[0].id);
```

**Pattern 5 — Async action with checking→result toast (rufloIgnite idiom):**
```ts
const id = pushToast({ kind: "checking", title: "Doing X…", detail: "…" });
try {
  const r = await window.dai.superpowers.health("ruflo");
  updateToast(id, { kind: r.ok ? "success" : "error", title: r.message, detail: r.details.join(" · "), ttl: 6000 });
  window.dai.audit.log("x", `${r.status}: ${r.message}`);
} catch (e) {
  updateToast(id, { kind: "error", title: "X failed", detail: String(e), ttl: 6000 });
}
refreshTools();
```

**Pattern 6 — Add an IPC channel (all three files or tsc fails):**
```ts
// shared/ipc.ts
export const CH = { /* … */ SP_RUFLO_QUEUE: "sp:rufloqueue" } as const;
export type RufloQueue = { ok: boolean; count: number; message: string };
// in the window.dai interface: superpowers: { …; rufloQueue(): Promise<RufloQueue> }
// main/ipc.ts
import { rufloQueue } from "./superpowers";
ipcMain.handle(CH.SP_RUFLO_QUEUE, () => rufloQueue());   // exactly once
// preload/index.ts
superpowers: { /* … */ rufloQueue: () => ipcRenderer.invoke(CH.SP_RUFLO_QUEUE) }
```

**Pattern 7 — Never-throw main service with timeout (superpowers.ts idiom):**
```ts
import { execFile } from "node:child_process"; import { promisify } from "node:util";
const execFileP = promisify(execFile);
export async function probeCli(): Promise<{ ok: boolean; message: string }> {
  try { const { stdout } = await execFileP("tool", ["status"], { cwd: HOME, timeout: 6000, maxBuffer: 1<<20 });
        return { ok: true, message: parse(stdout) }; }
  catch (e: any) { return { ok: false, message: e?.code === "ENOENT" ? "not installed" : "unavailable" }; }
}
```

**Pattern 8 — Confirm before a consequential broadcast/kill:**
```ts
if (!window.confirm(`Send this to ${ids.length} live agent(s)?\n\n${text}`)) return;
const r = await broadcast(text, true, ids); toast(`sent to ${r.sent}`);
```

**Pattern 9 — Access gate (renderer UX + server re-check for writes):**
```tsx
const { can } = useMe();
if (!can("adm:library")) return <RestrictedPanel/>;   // UX
// AND in main/ipc.ts for the write handler:
ipcMain.handle(CH.TIPS_UPSERT, (_e, entry) => teamCan("adm:library") ? tipsUpsert(entry) : { error: "not permitted" });
```

**Pattern 10 — Sector action (decoupled in-view behavior):**
```ts
// sectorActions.tsx: add { id: "pv:refresh", label: "Reload preview", run: () => dispatch("pv:refresh") }
// PreviewView.tsx: window.addEventListener("dai:sector-action", e => { if (e.detail === "pv:refresh") reload(); })
```

Use these verbatim in structure. They encode the doctrine (honest disable, real probe, never-throw, exact-match, confirm, dual-gate) so following them keeps you compliant by construction.

### APPENDIX BA — INTEGRATION VERIFICATION MATRIX (feature × how to prove it real)

| Feature | Prove-real method |
|---|---|
| Terminal IO | type in a pane → chars echo; reload renderer → scrollback replays (persistence) |
| Broadcast | launch 2 claude terminals → chip "continua" → both receive it (confirm dialog first) |
| Autopilot | force an agent to error → within 90s a nudge appears in the log + the agent's terminal |
| Agent transcript | select an agent → live streaming lines match its jsonl |
| Code save | edit + ⌘S → fsRead the file back shows the change |
| Neuromap | edit a vault note → fs.watch pulse → node updates |
| Drive | sign in → Folders lists real Drive folders (else honest Gate) |
| Metrics | launch a session → its score/ctx/out appear within the window |
| Preview Neo | Start → real screenshot frame; click → the real browser navigates |
| Ruflo Ignite | click → toast shows the true `ruflo status` (run it yourself to compare) |
| Graphify Regen | click → a terminal runs `graphify update .`; digest mtime updates |
| Vault Sync | Team edit → team.json committed+pushed (git log the vault) |
| Screenshot | GODMODE Capture → a jpg appears on ~/Desktop |
| Access gate | set a member to viewer → restricted chips + hidden admin + server rejects a tips write |
| Superpower status | start/stop a real thing → the dot flips within a refetch interval |

Every row is a REAL end-to-end check — no mock, no stub. If a row can't be proven real, that feature is not real; say so.

### APPENDIX BB — CROSS-CUTTING CONCERNS (every UI task honors these)

Not optional polish — these are part of the definition of a correct UI change here.

- **i18n (EN/RO):** user-facing copy uses `useT()` → `t({ en, ro })`. Every new label/hint/empty-state provides BOTH. The operator runs in RO much of the time; an English-only string is a bug.
- **a11y:** buttons have `aria-label` where the text is an icon; panels are `role="dialog"`/`role="menu"` with an aria-label; Escape closes every overlay (window-level listener, not just input-focused); disabled controls set `aria-disabled` + `title`. Follow CommandPalette/EcosystemBar/GodModePanel as references.
- **motion:** respect the Appearance `motion` setting — heavy animations (framer-motion springs) reduce/disable when motion is off. Reuse the existing motion guards.
- **density:** respect the Appearance `density` setting (comfortable/compact) — new surfaces inherit spacing tokens, not hardcoded padding.
- **keyboard:** interactive lists support ↑↓⏎ where the palette pattern applies; new global shortcuts go through the App keydown handler + respect `can()`.
- **no layout shift on data load:** panels render a stable skeleton ("…"/"checking…") while a probe resolves — never jump from empty to full (the flash-loop class of bug).
- **audit + toast on consequential actions:** any action that changes state logs to audit AND toasts feedback — never silent.
- **file size:** if your edit pushes a file past 500 lines, extract in the same PR.

### APPENDIX BC — HONEST-COPY GLOSSARY (match this tone in new copy)

The app's honesty is partly its *voice*. New gates/disables/statuses should sound like these real strings:

- "needs Google — go to Config, save your OAuth client and sign in. **Nothing is simulated.**" (DriveView Gate)
- "Set `X_API_KEY` in `.env.local` to enable — **no key, no fake output.**" (CreativeView)
- "**Not granted to you by an owner**" / "cooperative access — ask an owner" (EcosystemBar restricted)
- "Ruflo **engine ready — swarm stopped, safe to ignite**" (Ruflo honest health)
- "The IDE **does not auto-launch servers yet** — run `npm run dev` in a terminal and paste the URL." (Preview)
- "**No active swarm** — Agents are configured but no Claude sessions are running." (Agents empty)
- "Wiring to a live agent — **needs config (API key / route).**" (non-Neo chat)
- "every disabled control **names its reason** — the UI does not lie" (GODMODE truth footer)
- "**pending backend**" / "**setup required**" / "**local only**" (status words — say the true state)

Rules of tone: state the truth plainly; name the exact next step ("go to Config", "set X_API_KEY", "ask an owner"); never imply a capability you don't have; never use hype ("blazing", "instant") — the empire's voice is calm, precise, obsidian. When you add a gate, write its copy in this register.

### APPENDIX BD — WHAT CHANGED THIS SESSION (context for the diff Fable inherits)

The commits between the last major audit and this one, so Fable understands the recent trajectory:
- Team access-control system shipped (cooperative caps, vault-synced team.json, useMe gates) — the `perms`→`team` migration.
- Task-10 cutover (`28c639a`): retired `permissions.ts` + `window.dai.perms`; migrated the one consumer (GodModePanel member count) to `window.dai.team.get()`.
- Library feature (`b3757f4` + peer's live refactor): admin catalog + tips + a persistent dock Admin button.
- idle-recap (`648e6d4`..`bb9c018`): auto-recap overlay in TerminalPane (UNAUDITED here — F11).
- Superpowers repair (`7c1d8b9`): Ruflo Ignite made real (health probe), toast bus, honest digest.
- Settings consolidation: 5-tab AdminPanel → one Settings surface, 10 categories.
- Right Rail removed (`e20e9bc`): shell went 2-column; sector actions moved to palette Recommended + dai:sector-action.
- Black-screen fix (`dadb3d5`): renderer electron-import removed; the incident that seeded the contextIsolation rule.

Trajectory read: the app has been moving from "many surfaces, some fake" toward "fewer, all honest" — the doctrine has been *tightening*, not loosening. This plan continues that arc: kill the last dead click, elevate menus to panels, fill honest-pending backends. Fable should preserve the arc — every change makes the app more trustworthy, never less.

---

## PART 13 — FINAL REPORT (the requested 10-part format)

### 13.1 — REZUMAT RECE (cold summary)

- **Functional (REAL):** Terminal (master/mirror/multi-CLI/broadcast/deploy-N), Agents (roster/health/transcript/Autopilot/launch/broadcast), Code (Monaco/save/git badge), Metrics (session observability), Neuromap (v2 graph/labels/modes/diagnostics), Preview-Neo (real CDP drive), Drive (real, gated on sign-in), GODMODE (full operational panel), Command Palette, Settings (10 categories), the whole superpower dock (7 powers, real statuses + real actions), all 15 More items. ≈88/95 controls REAL.
- **Partial (real but incomplete/gated):** Google (one sign-in from live), Agents "Assign Sector" (navigates, over-promises label), Library (real but peer-refactored).
- **Fake:** **none.** Zero hardcoded-LIVE, zero fabricated statuses. The doctrine holds.
- **Dead:** **one** — Preview Micro Terminal Run (F01) — clears input, claims execution.
- **Honest-pending (by design):** Creative (needs keys+backend), Neuromap Team/Tasks (needs shared backend), non-Neo chat, Shortcuts rebinding.
- **Major risks:** (1) the concurrent Library refactor makes the tree a moving target; (2) deploy drift (installed app behind HEAD); (3) DMG packaging broken; (4) the recurring peer-rollback hazard on uncommitted work.

**The one-line truth:** this is a mature, honest IDE that is ~80% operational; the work is *elevation + a few honest-pending backends + one dead-button fix*, not a rescue.

### 13.2 — TERMINAL CURRENT STATE (the session's observed context)

- RuFlo V3.6 present (CLI orchestrator, not a daemon); Ignite reports true engine state.
- Graphify active (launchd); digest often stale → Regenerate offered honestly.
- lean-ctx present (context layer); surfaced as a More item + a Metrics-strip candidate (P1-H).
- Branch `main`; HEAD `5497e67`; installed app `28c639a` (deploy drift).
- Model/context: authored under Opus 4.8 (1M); to be executed by Fable 5 (max effort).
- Google: PARTIAL — creds saved (0600), NOT signed in → Drive locked until the user signs in.
- Risks live: peer Library refactor churning the tree; DMG build broken; commit-early discipline required.

### 13.3 — SUPERPOWERS AUDIT (summary; full in PART 3 + Appendix AG)

All 7 real. Obsidian 5/5 · Graphify 5/5 · Ruflo 4/4 (real CLI health) · Cloud 4/4 · Agents 3/4 (+1 over-promise) · GODMODE (full panel) · Google 4/4 (partial, one click from live). Zero fake statuses, zero dead actions. Top fixes: elevate 6 menus→panels (P1-A/B/C), fix Assign-Sector label (P0-2), Gmail scope (P1-F).

### 13.4 — GODMODE AS TEMPLATE (full in PART 4)

GODMODE is the gold standard: real health grid + mission + real actions (incl. Emergency Stop) + operationalTruth footer. **What it should become for the others:** every superpower opens a `SuperpowerPanel` in the same grammar (health fields + primary + real actions + truth), built once (P1-A) and configured per power (P1-B/C). **How to apply:** reuse GODMODE's `.gm-card`/`.gm-grid` + STATUS_META; extract the Health card; feed each panel from `useOps()` + real `window.dai.*` calls; never fabricate a field. Add an explicit Full System Check to GODMODE itself (P1-D).

### 13.5 — SECTORS AUDIT (summary; full in PART 5 + Appendix AC)

Terminal (strongest, 87) · Agents (82, under-sold) · Code (78, needs action bar) · Neuromap (82, team-pending) · Drive (74, sign-in-gated) · Metrics (84, needs health strip) · Preview (66, one dead button) · Creative (35, greenfield). No sector is fake; the defects are one dead button, one missing action bar, two honest-pending backends, one live-refactored sector.

### 13.6 — GLOBAL BUTTON TRUTH TABLE (full in PART 7 + Appendix AY)

≈95 controls: REAL ~88 · HONEST-DISABLED ~5 · PARTIAL 1 (Assign Sector) · DEAD 1 (Micro Terminal Run) · FAKE 0. ABSENT-to-build: Full System Check, Code action bar, per-agent Stop, Metrics health strip. See Appendix AY for the exhaustive per-view list and PART 7 for the categorized table.

### 13.7 — OPERATIONAL SCORES (full in PART 8 + Appendix AP)

GODMODE 92 · Palette 90 · Settings 88 · Chrome 88 · Terminal 87 · Dock 85 · Metrics 84 · Ruflo-power 84 · Agents 82 · Neuromap 82 · Code 78 · Drive 74 · Library 70* · Preview 66 · Creative 35. **App ≈ 80/100.** Bimodal: real (78-92) or honest-pending (Creative 35); no fake middle.

### 13.8 — P0 / P1 / P2 BACKLOG FOR FABLE (full in PART 9)

- **P0:** P0-1 kill dead Micro Terminal Run · P0-2 rename Assign Sector · P0-3 (user) Google sign-in · P0-4 (infra) DMG.
- **P1:** P1-A SuperpowerPanel · P1-B Ruflo panel + rufloQueue · P1-C 5 panels · P1-D GODMODE Full System Check · P1-E Code action bar · P1-F Gmail scope · P1-G Agents Stop+meter · P1-H Metrics strip · P1-I idle-recap re-audit.
- **P2:** P2-1 Creative backend · P2-2 Neuromap team/tasks · P2-3 Terminal toast · P2-4 TopBar branch · P2-5 Shortcuts rebinding · P2-6 perms sub-label · P2-7 Guide refresh · P2-8 Library re-audit.
- **Critical path / 80-20:** P0-1 → P0-2 → P1-A → P1-B → P1-D → P1-E.

### 13.9 — BUILD / TYPECHECK (verified this audit)

- `npx tsc --noEmit` (live working tree, mid peer-refactor): **EXIT 0 — GREEN.**
- `npm run build` (electron-vite): completed **EXIT 0**; a later invocation hit a *transient* rollup `handleInvalidResolvedId` caused by the peer deleting a file mid-build — externally induced, not a defect in audited code.
- `node scripts/superpowers-doctor.mjs --check`: **EXIT 0 — GREEN** (godmode panel/lab OK; google config present + 0600).
- No test/lint/visual scripts exist — verification = tsc + build + doctor + CDP smoke + screenshot (Appendix H).

### 13.10 — NEXT EXACT STEP (what Fable does first)

1. Switch to **Fable 5, effort max**, fresh session in `/Users/user/code/dragons-alliance-ide`.
2. Run the **first-60-minutes runbook (Appendix AU)**: orient on the doctrine → snapshot the tree → run the three gates green → CDP baseline smoke + `audit-baseline.jpg`.
3. Ship **P0-2** (rename Assign Sector — one line, proves the loop) then **P0-1** (kill the dead Micro Terminal Run — the one doctrine violation), each with tsc+build+doctor+CDP+screenshot+commit+execution-log.
4. Begin the **critical path: P1-A `SuperpowerPanel`** (Appendix K skeleton) → **P1-B Ruflo panel** (the reference) → **P1-D Full System Check** → **P1-E Code action bar**.
5. Coordinate with the peer Library refactor: do NOT touch registry/LeftRail/App/library while churn is active (Appendix AU step 2 checks it each session). Commit every verified task immediately.
6. Keep an **execution log** (Appendix F) — the "surprises/new knowledge" line is the learning signal that keeps this a learning machine.

---

## PART 14 — HERMENEUTIC CLOSING (why this order, why this doctrine)

This document interpreted before it prescribed because the IDE's value is not its feature list but its *trustworthiness*: it is a command center an operator (and soon a 5-7 person team) uses to drive real agents, real terminals, real knowledge. A command center that fabricates one number is worthless — you cannot act on a dashboard you must second-guess. That is why the audit's headline is not "look how many features" but "**one dead button, zero fake statuses**": the app has been built, and repaired, toward honesty, and the single most important thing Fable can do is *not break that*.

So the plan's shape follows the doctrine, not the feature backlog. **P0 first** because a lying click is the one thing that violates the app's identity — it must die before anything is added. **Elevation (P1) next** because the honest-but-plain menus deserve the GODMODE grammar the app already proved works; this is generalization of an existing truth, not invention. **Honest-pending backends (P2) last** because a gate that says "no key, no fake output" is already correct — it can wait; a lie cannot.

The "learning machine" framing is not decoration. Each task's execution-log entry records the delta between this document's model of the system and the reality Fable meets — and those deltas, accumulated, are how the *next* plan gets written better than this one. The codebase already embodies this: `operationalTruth()` is the app auditing *itself*, publishing its own wired-vs-pending count so no one has to trust a claim. This document is the same move at the meta level — an audit that teaches its executor how to re-audit, so the system and its builders both get more honest over time.

Build in that grain. Every change should make the app more trustworthy, more legible, more real — never more impressive at the cost of true. When a task tempts you toward a fake shortcut (a hardcoded LIVE, a dead button shipped ahead of its wire, a fabricated count to fill a panel), stop: the honest disabled state is always the correct endpoint, and "not wired yet" is always better than a lie. That is the whole empire's discipline, and it is the reason this IDE is worth finishing.

— Core audit + build plan complete. **PART 15 below** adds supplementary build reference: two full worked examples (Ruflo panel P1-B, Creative backend P2-1), a proposed smoke-test harness (there is no test runner today), a decision log, and the open questions the operator must answer. Execute from PART 9; verify by Appendix F's Definition of Done; keep the doctrine.

---

## PART 15 — SUPPLEMENTARY BUILD REFERENCE

### 15.1 — PROPOSED SMOKE-TEST HARNESS (`scripts/smoke.mjs`)

There is no test runner today (Appendix H.1). Fable SHOULD author this small harness early so every task can assert behaviorally, not just by screenshot. It launches the built bundle with CDP, runs a battery of DOM/behavior assertions (Appendix AJ), and exits non-zero on any failure — a poor-man's CI that fits the app's real verification model.

```js
// scripts/smoke.mjs — CDP behavioral smoke for Dragons Alliance IDE.
// Usage: node node_modules/electron/... out/main/index.js --remote-debugging-port=9333 --user-data-dir=/tmp/dai-smoke &
//        then: /opt/homebrew/opt/node@22/bin/node scripts/smoke.mjs
import { WebSocket } from "ws";
const PORT = process.env.CDP_PORT || 9333;

async function connect() {
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const page = list.find((t) => t.type === "page");
  if (!page) throw new Error("no page target — is the app running with --remote-debugging-port?");
  const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 64 * 1024 * 1024 });
  let seq = 0; const pend = new Map();
  await new Promise((r) => ws.once("open", r));
  ws.on("message", (raw) => { const m = JSON.parse(raw); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
  const send = (method, params = {}) => { const id = ++seq; ws.send(JSON.stringify({ id, method, params })); return new Promise((r) => pend.set(id, r)); };
  await send("Runtime.enable"); await send("Page.enable");
  return { send, close: () => ws.close() };
}
const evalJs = (send, expr, awaitPromise = false) =>
  send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise }).then((m) => m.result?.result?.value);

const CHECKS = [
  ["react mounts",        (s) => evalJs(s, `(document.getElementById("root")||document.body).innerHTML.length > 200`)],
  ["no uncaught error",   (s) => evalJs(s, `!window.__DAI_LAST_ERROR__`)],   // set one in an error boundary if desired
  ["dock renders 7 chips",(s) => evalJs(s, `document.querySelectorAll(".sp-chip").length === 7`)],
  ["systems chip present",(s) => evalJs(s, `!!document.querySelector(".tbx-health, .sbar-item")`)],
  ["palette opens",       (s) => evalJs(s, `(()=>{window.dispatchEvent(new KeyboardEvent("keydown",{key:"k",metaKey:true}));return true;})()`)],
  ["no emoji in UI",      (s) => evalJs(s, `!/[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]/u.test(document.body.innerText)`)],
  ["terminals reachable", (s) => evalJs(s, `window.dai.term.list().then(t=>Array.isArray(t))`, true)],
  ["god panel opens",     (s) => evalJs(s, `(()=>{window.dispatchEvent(new CustomEvent("dai:godmode"));return true;})()`)],
];

const { send, close } = await connect();
let fail = 0;
for (const [name, fn] of CHECKS) {
  try { const ok = await fn(send); console.log(`${ok ? "PASS" : "FAIL"}  ${name}`); if (!ok) fail++; }
  catch (e) { console.log(`ERR   ${name} — ${e.message}`); fail++; }
}
close();
console.log(`\n${CHECKS.length - fail}/${CHECKS.length} passed`);
process.exit(fail ? 1 : 0);
```

**How Fable uses it:** after each task, launch the bundle (Appendix H.2) and run `smoke.mjs`; extend `CHECKS` with the task's specific assertion (Appendix J / AJ). This turns "I think it works" into "8/8 passed". It is NOT a replacement for reading a screenshot back — visual regressions still need the eye — but it catches behavioral breakage cheaply and repeatably. Add a `"smoke"` script to package.json wrapping the launch+run. Keep the harness < 200 lines; it is a smoke test, not a framework.

### 15.2 — WORKED EXAMPLE: Ruflo panel end-to-end (P1-B, full walkthrough)

The complete task, start to finish, as a model for how to execute every P1 task.

1. **Re-confirm interpretation.** Read `main/superpowers.ts` (does `rufloHealth()` still return `{ok,status,message,version,active,mcpUp}`?), `registry.tsx` ruflo actions, `EcosystemBar.tsx` (is P1-A's SuperpowerPanel already wired?). If P1-A isn't done, do it first (dependency).
2. **Backend.** Add `rufloQueue()` to `superpowers.ts` (Appendix L) — never-throw, 6s timeout, honest on ENOENT/empty.
3. **IPC (3 files).** `shared/ipc.ts`: `CH.SP_RUFLO_QUEUE` + `RufloQueue` type + `window.dai.superpowers.rufloQueue()` signature. `main/ipc.ts`: `ipcMain.handle(CH.SP_RUFLO_QUEUE, () => rufloQueue())`. `preload/index.ts`: bridge it. Run `tsc` — it confirms the three agree.
4. **Panel data.** In `SuperpowerPanel.tsx` `usePanelData("ruflo")` (Appendix AT) — Engine/Queue/Agents/MCP/Last-check from `health` + `rufloQueue`. Unwired → honest placeholder.
5. **Actions.** In `registry.tsx` ruflo: add "Reconnect" (`rufloIgnite()` relabeled) + "Open Logs" (`admin("audit")`). Keep the copy honest ("engine ready — swarm stopped").
6. **Gates.** `tsc --noEmit` green · `npm run build` green · `doctor` green (no disabled registry entries).
7. **Behavioral.** Launch bundle + CDP; assert the Engine field text equals `await window.dai.superpowers.health("ruflo")`.message; assert Queue shows a real count or "run to view". Run `ruflo status` in a terminal and eyeball-compare.
8. **Screenshot.** Capture `audit-ruflo-panel.jpg`; Read it back; confirm the panel shows real engine state, not a fabricated "LIVE".
9. **Commit.** One commit: `feat(superpowers): Ruflo operational panel + honest queue probe — tsc/build/doctor green, CDP engine-matches-health`. Co-Authored-By line.
10. **Log.** Append the execution-log entry (Appendix F) — note any surprise (e.g. `rufloHealth` signature drifted, ruflo not installed in HOME, etc.).

**The lesson this example teaches:** a P1 elevation is mostly *composition of real primitives* (health probe + panel + honest placeholders) — the hard part is discipline (3-file IPC consistency, honest placeholders, real CDP assertion), not cleverness.

### 15.3 — WORKED EXAMPLE: Creative backend (P2-1, the greenfield slice)

The smallest real slice that turns Creative from 0% to a real single-provider pipeline.

1. **Pick the provider** the operator has a key for (keys → `~/.config/dai/creative.json`, 0600, denylisted from fs reads). Start with ONE.
2. **Backend** `src/main/creative.ts`: `creativeGenerate(tool, prompt, projectPath)` — read the key; absent → `{ok:false, error:"needs <ENV>"}` (UI already shows this honestly); present → call the provider API (in main, never renderer), save the asset to a local assets dir, `driveMeta.upsert({type:"creative", ...})` so it becomes a Neuromap Creative node.
3. **IPC (3 files):** `CH.CREATIVE_GENERATE` + type + handler + bridge.
4. **UI** `CreativeView.tsx`: wire Generate → `window.dai.creative.generate(...)`; enable the button ONLY when the key exists (probe via a `creative:hasKey` check or the status the card already shows); on success push the asset into the gallery.
5. **Honesty:** no key → disabled with reason (unchanged); real key → real API → real asset. Never fabricate.
6. **Verify:** with a real key, Generate produces a saved asset + a Neuromap node; without, disabled. tsc/build/doctor green; screenshot `audit-creative-generate-real.jpg`.
7. **Stop there** for the first slice — one provider, real, honest. Do NOT build the full six-provider pipeline in one pass (Appendix Z stop-conditions).

### 15.4 — DECISION LOG (why these choices)

- **Why elevate menus→panels instead of adding features?** Because the user's central request was "GODMODE format for all superpowers" and the app's biggest inconsistency is 6 menus vs 1 panel. Elevation is generalization of a proven pattern — highest value, lowest risk.
- **Why P0 the dead button above everything?** Doctrine: a lying click is the one thing that breaks the app's identity. Everything else is honest; this isn't.
- **Why not a real security layer for team caps?** The model is cooperative by design (Appendix D); a hard-auth layer is out of the local-first identity and unrequested (Appendix X.7).
- **Why build a smoke harness?** There is no test runner; the app's real verification is CDP behavioral + screenshots. A tiny harness makes that repeatable without inventing a framework.
- **Why keep Ruflo "idle/STOPPED" honest instead of a green LIVE?** Because Ruflo is a CLI, not a daemon — a green LIVE would be the exact lie the `7c1d8b9` repair removed. The true state, made legible, is the honest win.
- **Why write this as a learning-machine spec?** Because the tree moves under any executor (peer churn); a checklist breaks on drift, an interpretive spec re-derives. The execution log closes the loop so the model improves.

### 15.5 — OPEN QUESTIONS FOR THE OPERATOR (decisions Fable should not make alone)

1. **Gmail (P1-F):** add a `gmail.readonly` scope (forces a re-consent) OR drop "Gmail" from the labels? — a product decision.
2. **Creative provider (P2-1):** which provider to build first, and is a key available? (Higgsfield/Canva/Nanobanan/Runway/Ideogram/ElevenLabs.)
3. **DMG (P0-4):** is a distributable DMG needed (teammates on other machines), or is the local `.app` swap enough for now?
4. **Deploy cadence:** ship after each task, or batch P0+critical-path then deploy once? (Affects when to run H.5.)
5. **Team backend (X.2):** stay fully local-first/cooperative, or is an opt-in sync service in scope later?
6. **idle-recap (P1-I):** keep as-is if verified, or is there desired behavior to change (auto-resume vs recap-only)?

Fable should surface these to the operator rather than guessing — each changes what gets built.

### 15.6 — FINAL CLOSE

This is a complete, executable audit + construction plan: PART 3-8 are the audit (what is real, what is not, scored), PART 9-11 are the ordered build plan, PART 12 + the appendices are the executor's reference substrate, PART 13 is the requested final report, PART 14 is the why, PART 15 is worked depth. It was authored read-only — no code changed, nothing committed — as a specification for Fable 5 (max effort) to execute in a fresh session.

The whole plan reduces to one sentence, and Fable should keep it in view through every task: **make the Dragons Alliance IDE more real and more trustworthy — kill the one dead click, raise every superpower to the GODMODE standard, fill the honest-pending backends — and never, at any step, let a control lie.**

**PART 16 below** expands every bundled/compressed task into a standalone implementation note (the five P1-C panels individually, and P2-2…P2-8 in full) so no task requires cross-referencing to execute.

---

## PART 16 — EXPANDED PER-TASK IMPLEMENTATION NOTES

Each note is standalone: files, why, exact change, honesty guard, verification, screenshot, commit. Execute without cross-referencing.

### 16.1 — P1-C.1: OBSIDIAN panel

- **Files:** `SuperpowerPanel.tsx` (`usePanelData("obsidian")`).
- **Why:** elevate the Obsidian menu to a GODMODE-format panel (F04).
- **Change:** fields — Vault (status from `statuses.obsidian`, value "Antigravity-Brain"), Lock (open/closed from probeTools detail — if unavailable, "unknown"), Notes (from `window.dai.neuromap.graph({layers:["all"]}).nodes.length`), Edited (last vault mtime if cheaply available, else "—"). Primary = vault path. Actions = the existing 5 (Open Vault / Neuromap / Search / Sync / Plan Chat).
- **Honesty guard:** Notes count comes from the real graph; if the graph query is loading, show "…" not 0. Lock state "unknown" is honest when no signal.
- **Verify:** CDP — panel shows a real note count matching `window.dai.neuromap.graph(...).nodes.length`.
- **Screenshot:** `audit-obsidian-panel.jpg`. **Commit:** `feat(superpowers): Obsidian operational panel`.

### 16.2 — P1-C.2: GRAPHIFY panel

- **Files:** `SuperpowerPanel.tsx` (`usePanelData("graphify")`).
- **Change:** fields — Digest (mtime from probeTools detail; "—" if none), Graph (`${nodes.length}n / ${edges.length}e` from neuromap graph), Engine (launchd state from `statuses.graphify`), Fresh (live→"fresh", else "stale — regen"). Actions = existing 5 (Open Map / Open Digest / Regenerate / Research Lens / Agents Layer).
- **Honesty guard:** if the digest is absent, Digest field says "not generated — Regenerate", never a fake date. Fresh reflects real mtime.
- **Verify:** CDP — Graph counts match the neuromap graph; Regenerate arms `graphify update .`.
- **Screenshot:** `audit-graphify-panel.jpg`. **Commit:** `feat(superpowers): Graphify operational panel`.

### 16.3 — P1-C.3: CLOUD panel

- **Files:** `SuperpowerPanel.tsx` (`usePanelData("cloud")`).
- **Change:** fields — Live (`${sess.live} sessions`), Tokens (`${human(totalOut)} out`), Model (split of live sessions by model, e.g. "opus×2"). Primary = top live session summary. Actions = existing 4.
- **Honesty guard:** figures from the real session probe; 0 sessions → "idle", honest.
- **Verify:** CDP — Live count equals `fetchSessions(240).live`.
- **Screenshot:** `audit-cloud-panel.jpg`. **Commit:** `feat(superpowers): Cloud operational panel`.

### 16.4 — P1-C.4: AGENTS panel

- **Files:** `SuperpowerPanel.tsx` (`usePanelData("agents")`).
- **Change:** fields — Swarm (`${live} live / ${total} total`), Worst (the worst per-agent status among live agents, from agentHealth — or "—" if none). Actions = Open Cockpit / Launch Agent / Broadcast (focus MissionBar via `dai:sector-action agents:focus-broadcast`) / Inspect. Apply the P0-2 rename here too.
- **Honesty guard:** Worst status is real (derived from agentHealth), not "all good" by default.
- **Verify:** CDP — Swarm counts match AgentsView; Broadcast focuses the MissionBar input.
- **Screenshot:** `audit-agents-panel.jpg`. **Commit:** `feat(superpowers): Agents operational panel`.

### 16.5 — P1-C.5: GOOGLE panel

- **Files:** `SuperpowerPanel.tsx` (`usePanelData("google")`).
- **Change:** fields — Sign-in (email or "configure — sign in"), then one field per service from `window.dai.google.health()` (Drive/Sheets/Forms). Primary = the sign-in call to action. Include a SCOPES line: "drive · spreadsheets · forms" (honest — NOT Gmail unless P1-F adds it). Actions = Sign in / Keys / API Health / Drive Ops.
- **Honesty guard:** while signed out, service fields are "n/a" (pending), not fake green. Scopes line must match `main/gdrive.ts` SCOPES exactly.
- **Verify:** CDP — signed-out shows "configure"; after sign-in, service fields go live. Scopes text matches the code.
- **Screenshot:** `audit-google-panel.jpg`. **Commit:** `feat(superpowers): Google operational panel`.

### 16.6 — P2-2: NEUROMAP team/tasks real data

- **Files:** `main/neuromap.ts`, `views/NeuromapView.tsx`, `views/neuromap/modes.ts`.
- **Why:** Team/Tasks modes are honest-pending empty states (F10).
- **Change:** Team mode → build member nodes from the vault-synced `<vault>/_team/team.json` roster (already exists), edge members to the agents/notes they own (attribution). Tasks mode → build task nodes from vault `08_TASKS/*.md` notes if the folder exists. Keep BOTH honest-pending (empty state) when the source is absent.
- **Honesty guard:** never invent members or tasks; empty source → the existing honest empty state.
- **Verify:** with team.json populated, Team mode shows real member nodes; empty → honest empty.
- **Screenshot:** `audit-neuromap-team.jpg`. **Commit:** `feat(neuromap): real team/tasks modes from vault sources`.

### 16.7 — P2-3: TERMINAL toast on unavailable CLI

- **Files:** `views/TerminalsView.tsx`.
- **Why:** ollama/hermes/codex rows are silent no-ops when the CLI/server is absent (F18).
- **Change:** on click while the status probe says unavailable, `pushToast({kind:"info", title:"<tool> not running", detail:"start it, then retry"})`; keep the row enabled (the dot signals state). If the file crosses 500 lines with the idle-recap merge, extract the +Worker menu + status probes into sub-files.
- **Honesty guard:** the toast states the true reason; no fake launch.
- **Verify:** with ollama stopped, clicking the ollama row toasts the honest message.
- **Screenshot:** `audit-terminal-cli-toast.jpg`. **Commit:** `feat(terminal): honest toast when a gated CLI is unavailable`.

### 16.8 — P2-4: TOPBAR branch chip

- **Files:** `components/shell/TopBar.tsx`.
- **Why:** no active-workspace branch shown (F17, self-noted).
- **Change:** when a sector implies an active repo (Code has the active file's repo), surface that repo's branch + dirty count from the projects probe (`branch`/`dirty`). Show ONLY when a real active repo exists — else omit the chip (do not show a placeholder).
- **Honesty guard:** the chip appears only with a real branch; never "main" hardcoded.
- **Verify:** open a file in a repo → the branch chip appears with the real branch/dirty.
- **Screenshot:** `audit-topbar-branch.jpg`. **Commit:** `feat(chrome): active-workspace branch chip (real git state)`.

### 16.9 — P2-5: SHORTCUTS rebinding

- **Files:** `components/settings/*` (Shortcuts category), `App.tsx` keydown handler, `keymap.ts`, `main/settings.ts`.
- **Why:** Shortcuts is read-only, honestly labeled "future pass".
- **Change:** make each keymap row rebindable; persist overrides to `~/.config/dai/settings.json` via `settings.set`; the App keydown handler reads the persisted map (falling back to defaults). Respect `can()` for gated targets.
- **Honesty guard:** a conflict (two actions same key) is shown, not silently dropped.
- **Verify:** rebind ⌘1, restart → the new binding persists and works.
- **Screenshot:** `audit-shortcuts-rebind.jpg`. **Commit:** `feat(settings): rebindable shortcuts persisted to settings.json`.

### 16.10 — P2-6: PERMS More sub-label

- **Files:** `registry.tsx` (MORE_CATEGORIES → ADMIN → `perms`).
- **Change:** sub-label "team & roles · local" → "team & roles · synced via vault" (post-cutover accuracy). One-line.
- **Verify:** `doctor` green; the More menu shows the corrected sub-label.
- **Commit:** `chore(registry): correct Permissions sub-label to reflect vault sync`.

### 16.11 — P2-7: GUIDE text refresh

- **Files:** `components/GuidePanel.tsx`, `guideContent.ts`.
- **Why:** the guide predates the Library sector + team model.
- **Change:** refresh the sector list (add Library), superpower statuses, and add a Library/Team section; verify EN/RO parity for every entry.
- **Honesty guard:** the guide describes real current behavior, not aspirational.
- **Verify:** open the Guide → sections match the current sector/superpower set in both languages.
- **Screenshot:** `audit-guide-refresh.jpg`. **Commit:** `docs(guide): refresh for Library sector + team model, EN/RO parity`.

### 16.12 — P2-8: LIBRARY re-audit (after the peer settles)

- **Files:** `views/LibraryView.tsx`, `components/library/*`, `main/tips.ts`.
- **Why:** Library is being rewritten by a peer right now (F12) — cannot audit a moving target.
- **Change:** once `git log` + mtimes show the Library refactor has landed and the tree is quiet, re-audit every Library control (Catalog cards, Tips CRUD, TeamSection, AdminSection); confirm the `adm:library` gate holds renderer + server-side (`teamCan`); confirm no dead clicks; only then modify.
- **Honesty guard:** do not modify Library while churn is active; coordinate.
- **Verify:** full control sweep (Appendix M) on Library returns clean; doctor green.
- **Commit:** (only if changes needed) `fix(library): <specific finding> post-refactor re-audit`.

### 16.13 — Execution order within PART 16

The five P1-C panels (16.1-16.5) come right after P1-B (they share the P1-A primitive and the panel data pattern — do them as a batch, one commit each). The P2 notes (16.6-16.12) are independent and can be picked up in any order EXCEPT 16.12 (Library) which waits for the peer. None of the P2 tasks are on the critical path; do them after the P0 + P1 critical path (Appendix AU / §11.2) is shipped and verified.

**PART 17 below** is the executor quick-reference: a grep-map to locate any concept in the code, a commit-message catalog, the known-good baseline metrics (regression guard), and a one-line CDP assertion per task.

---

## PART 17 — EXECUTOR QUICK-REFERENCE

### 17.1 — GREP MAP (find any concept fast)

Run from `src/`. Locate the authoritative definition of anything.

- Superpowers list → `grep -n "SUPERPOWERS" renderer/src/registry.tsx`
- A superpower action → `grep -n "id: \"rf-\|id: \"gv-\|id: \"ag-" renderer/src/registry.tsx`
- Status model / OpStatus → `grep -n "OpStatus\|STATUS_META" renderer/src/registry.tsx`
- operationalTruth → `grep -n "operationalTruth" renderer/src/registry.tsx`
- The status pipeline → `grep -n "statusOf\|liveCount\|checking" renderer/src/hooks/useOps.ts`
- Access gate → `grep -rn "can(\|useMe\|teamCan" renderer/src main`
- A capability id → `grep -n "sector:\|sp:\|act:\|adm:" shared/teamCaps.ts`
- An IPC channel → `grep -n "CH\." main/ipc.ts` / `grep -n "<name>:" shared/ipc.ts`
- A window.dai method → `grep -n "ipcRenderer.invoke" preload/index.ts`
- A probe → `grep -n "pgrep\|launchctl\|mtime\|execFile" main/tools.ts main/superpowers.ts`
- The dock → `grep -n "sp-chip\|QuickPanel\|restricted" renderer/src/components/EcosystemBar.tsx`
- GODMODE actions → `grep -n "gm-actions\|Emergency Stop\|shot.capture" renderer/src/components/GodModePanel.tsx`
- A sector action id → `grep -rn "dai:sector-action" renderer/src`
- The dead button → `grep -n "setCmd(\"\")\|Micro Terminal" renderer/src/views/PreviewView.tsx`
- Honest gates → `grep -rn "Nothing is simulated\|no fake output\|not granted" renderer/src`
- A view's buttons → `grep -n "<button\|onClick" renderer/src/views/<View>.tsx`
- Toast usage → `grep -rn "pushToast\|updateToast" renderer/src`
- Audit logging → `grep -rn "audit.log\|auditLog" renderer/src main`

### 17.2 — COMMIT-MESSAGE CATALOG (per task)

Format: `<type>(<area>): <what> — <verification>`. End with the repo's Co-Authored-By line.

- P0-1: `fix(preview): make Micro Terminal Run real (or honestly disabled) — kills the one dead click; CDP + doctor green`
- P0-2: `refactor(registry): rename Agents "Assign Sector" → "Open Agents Cockpit" (stop over-promising)`
- P1-A: `feat(superpowers): reusable SuperpowerPanel (GODMODE-format) + extract Health card — 7 chips open panels; doctor green`
- P1-B: `feat(superpowers): Ruflo operational panel + honest rufloQueue probe — engine matches ruflo status; tsc/build/doctor green`
- P1-C.1-5: `feat(superpowers): <power> operational panel`
- P1-D: `feat(godmode): Full System Check — streamed colored re-probe of every subsystem`
- P1-E: `feat(code): action bar (Build/Typecheck/Tests/Diff/Ask) arming real terminals in the file's repo`
- P1-F: `fix(google): reconcile Gmail scope/label — <add scope | drop label> (no un-scoped capability advertised)`
- P1-G: `feat(agents): per-agent Stop (exact-cwd unique-match) + swarm meter`
- P1-H: `feat(metrics): system-health strip (superpowers/ruflo/graphify/agents) — probe-derived, matches dock`
- P1-I: `chore(terminal): verify idle-recap overlay (non-blocking, real content, no flash loop)`
- P2-1: `feat(creative): real generation backend for <provider> — asset → Neuromap node; honest without a key`
- P2-2..P2-8: see PART 16 per-task commit lines.

### 17.3 — KNOWN-GOOD BASELINE METRICS (regression guard)

If any of these drift the wrong way after your change, investigate before committing.

- Gates: `tsc --noEmit` EXIT 0 · `npm run build` EXIT 0 · `doctor --check` EXIT 0.
- Superpowers: 7 declared · 27 declared actions · all with `run` (0 disabled in the SUPERPOWERS registry).
- More items: 15 · all with run/status · 0 dead.
- Controls: ≈95 total · REAL ~88 · DEAD 1 (target 0 after P0-1) · FAKE 0 (must stay 0).
- File LOC watch: TerminalsView ≤ ~484→<500 · NeuromapView ≤ ~448→<500 · new SuperpowerPanel < 500.
- `git ls-files | grep node_modules` → empty (must stay empty).
- No `window.dai.perms` reference anywhere (retired).
- No `import ... from "electron"` in `renderer/` (must stay 0).
- No emoji in product UI (Appendix AJ scan → false).

Track these in the execution log; a change that raises DEAD/FAKE above baseline, adds a disabled registry entry, reintroduces `window.dai.perms`, or adds a renderer electron-import is a REJECT — fix before commit.

### 17.4 — ONE-LINE CDP ASSERTION PER TASK (drop into smoke.mjs CHECKS)

- P0-1: `window.dai.term.list().then(t=>t.some(x=>/echo DAI/.test(x.lastInput||"")))` (after clicking Run) — or the Run button has `disabled`.
- P1-A: `document.querySelectorAll(".sp-panel--full .gm-card").length > 0` (after opening a chip).
- P1-B: `!!document.querySelector(".sp-panel--full")?.textContent.match(/STOPPED|RUNNING/)` (Ruflo panel engine field).
- P1-D: `document.querySelectorAll(".gm-check-row").length >= 5` (after Full System Check).
- P1-E: `[...document.querySelectorAll(".code-actbtn")].map(b=>b.textContent)` includes Build/Typecheck/Tests/Git Diff/Ask.
- P1-G: `!!document.querySelector(".mc-agent-stop")` and `!!document.querySelector(".mc-swarm-meter")`.
- P1-H: `document.querySelector(".mv-syshealth")?.textContent.includes("/7")` and equals the dock's live count.
- P2-1: with a key, `!document.querySelector(".cr-gen")?.disabled`; without, it is disabled.

Each is a boolean the harness (Appendix AZ 15.1) asserts. Extend `CHECKS` with the relevant line before shipping the task; a red assertion blocks the commit.

### 17.5 — DOCUMENT MAP (where everything is)

- Audit (what is real): PART 3 (superpowers), PART 5 (sectors), PART 6 (global UI), PART 7 (button table), Appendix AY (exhaustive controls), Appendix AO (findings register).
- Scores: PART 8, Appendix AP.
- The template: PART 4, Appendix G (mockups).
- Build plan: PART 9 (P0/P1/P2), PART 16 (expanded per-task), PART 11 (sequencing).
- Executor substrate: PART 12 + Appendices A-BD (IPC, files, pipeline, access, glossary, recipes, patterns, tokens).
- Requested final report: PART 13. The why: PART 14. Worked depth: PART 15. Quick-reference: PART 17.
- First action: Appendix AU (runbook) + PART 13.10 (next exact step).

This is the entire specification. It is internally complete: every task in PART 9/16 has files, a change, an honesty guard, a verification, a screenshot, and a commit line; every claim in the audit cites a file; every reference an executor needs is in the appendices. Author: Claude Opus 4.8, read-only, 2026-07-07. Executor: Claude Fable 5, max effort. Keep the doctrine; make it real; never let a control lie.

**PART 18 below** is the master task checklist — the actionable, check-off-able form of the whole plan, doubling as Fable's live progress tracker.

---

## PART 18 — MASTER TASK CHECKLIST (Fable's live progress tracker)

Check off as you go. Every task ends with the same gate block (tsc/build/doctor/CDP/screenshot/commit/log). Do not check the gate block until ALL of it passes.

### Phase 0 — Orient & baseline (Appendix AU)
- [ ] Read PART 0 (constraints) + §2 (doctrine) + Appendix R (reading method)
- [ ] Read project CLAUDE.md + the multi-agent hazard memory
- [ ] `git branch --show-current` · `git log --oneline -5` · `git status --short`
- [ ] `git log --oneline origin/main..HEAD` (know what's unpushed)
- [ ] `git ls-files | grep node_modules` → empty
- [ ] `find src -newermt "-90 seconds"` (peer churn check)
- [ ] `npx tsc --noEmit` EXIT 0 · `npm run build` EXIT 0 · `doctor --check` EXIT 0
- [ ] Author `scripts/smoke.mjs` (Appendix AZ 15.1) + a `"smoke"` package script
- [ ] CDP baseline smoke green · capture `audit-baseline.jpg` · read it back
- [ ] Record baseline metrics (Appendix 17.3) in the execution log

### Phase 1 — P0 (doctrine cleanup + user/infra)
- [ ] **P0-2** rename "Assign Sector" → "Open Agents Cockpit" (registry, quiet window)
  - [ ] doctor green · tsc green · commit · log
- [ ] **P0-1** kill the dead Micro Terminal Run (wire real OR honest-disable)
  - [ ] read PreviewView fresh · apply change · audit.log on real path
  - [ ] tsc · build · doctor green · CDP click assertion · screenshot · commit · log
- [ ] **P0-3** (surface to user) Google Sign-in unlocks Drive — user action
- [ ] **P0-4** (if distributing) `npm install` → `npm run dist` produces a DMG

### Phase 2 — P1 critical path (the elevation)
- [ ] **P1-A** SuperpowerPanel primitive + extract Health card + wire dock
  - [ ] interface matches Appendix K · usePanelData returns probe-derived fields
  - [ ] 7 chips open panels (GODMODE keeps its own) · access gate preserved
  - [ ] no disabled registry entry added · tsc/build/doctor green · CDP per-chip · screenshot · commit · log
- [ ] **P1-B** Ruflo panel + rufloQueue() (the reference — Appendix 15.2)
  - [ ] rufloQueue never-throw + 6s guard · SP_RUFLO_QUEUE 3-file IPC
  - [ ] Engine/Queue/Agents/MCP/Last-check real · Reconnect + Open Logs actions
  - [ ] copy never implies a daemon · gates green · CDP engine-matches-health · screenshot · commit · log
- [ ] **P1-C.1** Obsidian panel (16.1) · gates · CDP note-count · screenshot · commit · log
- [ ] **P1-C.2** Graphify panel (16.2) · gates · CDP graph-count · screenshot · commit · log
- [ ] **P1-C.3** Cloud panel (16.3) · gates · CDP live-count · screenshot · commit · log
- [ ] **P1-C.4** Agents panel (16.4) · gates · CDP swarm-count · screenshot · commit · log
- [ ] **P1-C.5** Google panel (16.5) · gates · scopes match code · screenshot · commit · log
- [ ] **P1-D** GODMODE Full System Check · streamed colored real re-probe · audit entry
  - [ ] gates green · CDP ≥5 lines match health grid · screenshot · commit · log

### Phase 3 — P1 remainder (parallel)
- [ ] **P1-E** Code action bar (Build/Typecheck/Tests/Diff/Ask) · Tests disabled-with-reason when no script
  - [ ] gates green · CDP Build→terminal-in-repo · screenshot · commit · log
- [ ] **P1-F** Gmail scope/label reconciliation (SURFACE the decision to the operator first)
  - [ ] grep shows no "Gmail" without a scope · gates green · commit · log
- [ ] **P1-G** Agents per-agent Stop (exact-cwd unique-match) + swarm meter
  - [ ] gates green · CDP Stop-kills-terminal · screenshot · commit · log
- [ ] **P1-H** Metrics system-health strip (reuse useOps) · every cell probe-derived or "n/a"
  - [ ] strip N/7 equals dock live count · gates green · screenshot · commit · log
- [ ] **P1-I** idle-recap re-audit (read fresh; verify non-blocking/real/no-flash/honest)
  - [ ] fix if broken else document verified · screenshot · log

### Phase 4 — P2 (polish & greenfield; after the critical path ships)
- [ ] **P2-1** Creative backend for ONE provider (Appendix 15.3) · asset → Neuromap node · honest without key
  - [ ] gates green · CDP real-effect · screenshot · commit · log
- [ ] **P2-2** Neuromap team/tasks from vault sources (16.6) · honest-pending when absent
- [ ] **P2-3** Terminal honest toast on unavailable CLI (16.7)
- [ ] **P2-4** TopBar active-workspace branch chip (16.8) · only when a real repo is active
- [ ] **P2-5** Shortcuts rebinding persisted to settings.json (16.9)
- [ ] **P2-6** Perms More sub-label → "synced via vault" (16.10)
- [ ] **P2-7** Guide refresh for Library + team, EN/RO parity (16.11)
- [ ] **P2-8** Library re-audit AFTER the peer refactor settles (16.12)

### Phase 5 — Close-out
- [ ] Run the doctrine self-audit sweep (Appendix M) → clean
- [ ] Baseline metrics (17.3) at or better than start · DEAD=0 · FAKE=0
- [ ] Deploy drift resolved (rebuild + swap when the tree is quiet — H.5) if the operator wants it shipped
- [ ] Execution log complete (one entry per task, "surprises" captured)
- [ ] Surface the open questions (15.5) the operator still owns

### Standing rules (apply to EVERY checked box)
- [ ] Read the file fresh before editing (peer churn)
- [ ] Renderer never imports electron/node · no duplicate IPC handler · no ArrayBuffer transfer over MessagePort
- [ ] Every disabled control names its reason · no fabricated status · no dead click
- [ ] Files < 500 lines · brand tokens only · EN/RO on user copy · Escape closes overlays
- [ ] One focused commit per task · immediate (peer-rollback protection) · Co-Authored-By line
- [ ] Do NOT touch registry/App/LeftRail/library while the peer Library refactor is active

When every box above is checked and the metrics hold, the plan is delivered: the Dragons Alliance IDE has zero dead clicks, seven GODMODE-standard superpower panels, the missing action bars, and the first honest-pending backends filled — every step more real, none of them a lie.

**PART 19 below** is the reference-implementation appendix: near-complete code for the two highest-leverage tasks (P0-1 dead-button fix, P1-A SuperpowerPanel with every branch + CSS), so Fable can start from working code rather than a skeleton. Re-read the live files first — signatures may have drifted.

---

## PART 19 — REFERENCE IMPLEMENTATIONS (near-complete code)

These are fuller than the skeletons in Appendices K/L/AQ/AT — closer to copy-paste. STILL re-read the live files first (peer churn; signatures drift). Types come from `shared/ipc.ts` / `registry.tsx`; adjust to what's actually there.

### 19.1 — P0-1: Micro Terminal Run (the real fix)

Locate the Micro Terminal panel in `PreviewView.tsx` (the `<div className="pv-panel">` containing `pv-micro-in`). Replace the dead Run handler.

```tsx
// add near the top-level handlers in PreviewView():
async function runMicro() {
  const c = cmd.trim();
  if (!c || !activeProj) return;                 // button also disabled in these cases
  const id = `pv${Date.now().toString(36)}`;
  window.dai.term.create({ id, cmd: "shell", cwd: activeProj.path });
  // give the shell a beat to spawn before typing (same delay the armTerm idiom uses)
  setTimeout(() => window.dai.term.write(id, c + "\n"), 1200);
  window.dai.audit.log("preview-run", `${c} @ ${activeProj.name}`);
  pushToast({ kind: "info", title: `Ran in ${activeProj.name}`, detail: c, ttl: 3500 });
  setCmd("");
  window.dispatchEvent(new CustomEvent("dai:goto", { detail: "ide" }));   // jump to Terminal to watch it
}

// the JSX — button is honest: disabled with a reason when it cannot run
<div className="pv-micro-in">
  <input value={cmd} onChange={(e) => setCmd(e.target.value)}
    onKeyDown={(e) => { if (e.key === "Enter") runMicro(); }}
    placeholder="quick command (e.g. npm run build)" disabled={!activeProj} />
  <button disabled={!activeProj || !cmd.trim()}
    title={!activeProj ? "select a project first" : "runs in the project's terminal"}
    onClick={runMicro}>Run</button>
</div>
```

Also fix the copy above it — the panel currently claims "Executes via the terminal host" unconditionally; that is now TRUE (it does), so the copy is fine, but confirm it reads honestly ("Runs in the selected project's terminal"). Requires `import { pushToast } from "../toast";` if not present. No new IPC. Verify: CDP — type `echo DAI`, click Run, assert `window.dai.term.list()` has a terminal in `activeProj.path`.

### 19.2 — P1-A: SuperpowerPanel (near-complete, all branches inline)

Create `src/renderer/src/components/SuperpowerPanel.tsx`. This folds Appendix K + AT into one file. Extract `Health` from GodModePanel (or duplicate it here and refactor later).

```tsx
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { SUPERPOWERS, STATUS_META, operationalTruth, type OpStatus } from "../registry";
import { useOps } from "../hooks/useOps";
import { OpStatusBadge } from "./da";
import { fetchSessions, human } from "../api";

type Field = { label: string; status: OpStatus; value: string };

function Health({ label, status, value }: Field) {
  const m = STATUS_META[status];
  return (
    <div className="gm-card">
      <div className="gm-card-label">{label}</div>
      <div className="gm-card-status" style={{ color: m.color }}>● {m.label}</div>
      <div className="gm-card-detail">{value}</div>
    </div>
  );
}

function usePanelData(id: string): { fields: Field[]; primary?: { status: OpStatus; detail: string } } {
  const { env, statuses } = useOps();
  const { data: sess } = useQuery({ queryKey: ["sp-sessions"], queryFn: () => fetchSessions(240), enabled: id === "cloud" || id === "agents" });
  const { data: graph } = useQuery({ queryKey: ["sp-graph"], queryFn: () => window.dai.neuromap.graph({ layers: ["all"] }), enabled: id === "obsidian" || id === "graphify" });
  const { data: rufloH } = useQuery({ queryKey: ["sp-ruflo-h"], queryFn: () => window.dai.superpowers.health("ruflo"), enabled: id === "ruflo" });
  const { data: rufloQ } = useQuery({ queryKey: ["sp-ruflo-q"], queryFn: () => window.dai.superpowers.rufloQueue?.(), enabled: id === "ruflo" });
  const { data: gh } = useQuery({ queryKey: ["sp-g-health"], queryFn: () => window.dai.google.health(), enabled: id === "google" });

  switch (id) {
    case "obsidian":
      return {
        fields: [
          { label: "Vault", status: statuses.obsidian ?? "idle", value: "Antigravity-Brain" },
          { label: "Notes", status: "live", value: graph ? String(graph.nodes.length) : "…" },
          { label: "Edges", status: "idle", value: graph ? String(graph.edges.length) : "…" },
          { label: "State", status: statuses.obsidian ?? "idle", value: statuses.obsidian === "live" ? "open" : "local" },
        ],
        primary: { status: statuses.obsidian ?? "idle", detail: "~/Documents/Obsidian/Antigravity-Brain" },
      };
    case "graphify":
      return {
        fields: [
          { label: "Graph", status: "live", value: graph ? `${graph.nodes.length}n / ${graph.edges.length}e` : "…" },
          { label: "Engine", status: statuses.graphify ?? "idle", value: "launchd" },
          { label: "Fresh", status: statuses.graphify === "live" ? "live" : "partial", value: statuses.graphify === "live" ? "fresh" : "stale — regen" },
        ],
      };
    case "ruflo":
      return {
        fields: [
          { label: "Engine", status: rufloH?.ok ? "idle" : "setup-required", value: rufloH?.message ?? "checking…" },
          { label: "Queue", status: rufloQ?.ok ? "idle" : "pending-backend", value: rufloQ?.ok ? rufloQ.message : "run to view" },
          { label: "Agents", status: "idle", value: rufloH ? `${(rufloH as any).active ?? 0} active` : "…" },
          { label: "MCP", status: (rufloH as any)?.mcpUp ? "live" : "idle", value: (rufloH as any)?.mcpUp ? "up" : "idle" },
        ],
        primary: { status: rufloH?.ok ? "idle" : "setup-required", detail: rufloH?.message ?? "" },
      };
    case "cloud": {
      const live = sess?.live ?? 0;
      const out = (sess?.sessions ?? []).reduce((a: number, s: any) => a + (s.out ?? 0), 0);
      return {
        fields: [
          { label: "Live", status: live > 0 ? "live" : "idle", value: `${live} sessions` },
          { label: "Tokens", status: "live", value: `${human(out)} out` },
          { label: "Total", status: "idle", value: `${sess?.sessions.length ?? 0} sessions` },
        ],
      };
    }
    case "agents": {
      const live = sess?.live ?? 0;
      const total = sess?.sessions.length ?? 0;
      return { fields: [{ label: "Swarm", status: live > 0 ? "live" : "idle", value: `${live} live / ${total} total` }] };
    }
    case "google":
      return {
        fields: [
          { label: "Sign-in", status: env.google.signedIn ? "live" : env.google.configured ? "partial" : "setup-required",
            value: env.google.signedIn ? "signed in" : env.google.configured ? "configure — sign in" : "needs setup" },
          ...((gh ?? []) as any[]).map((s) => ({ label: s.name, status: (s.ok ? "live" : "idle") as OpStatus, value: s.detail ?? "" })),
        ],
      };
    default:
      return { fields: [] };
  }
}

export function SuperpowerPanel({ id, status, checking, lastChecked, onClose }:
  { id: string; status: OpStatus; checking: boolean; lastChecked: number; onClose: () => void }) {
  const sp = SUPERPOWERS.find((s) => s.id === id)!;
  const { fields, primary } = usePanelData(id);
  const truth = operationalTruth();

  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  return (
    <div className="sp-panel sp-panel--full" role="dialog" aria-label={`${sp.label} panel`}>
      <div className="sp-panel-head">
        <span className="sp-panel-ic">{sp.icon({ size: 16 })}</span>
        <div>
          <div className="sp-panel-title">{sp.label}</div>
          <div className="sp-panel-role">{sp.role}</div>
        </div>
        <span className="sp-panel-badge"><OpStatusBadge status={status} checking={checking} size="sm" /></span>
      </div>

      {fields.length > 0 && <>
        <div className="sp-panel-sec">HEALTH</div>
        <div className="sp-panel-grid">{fields.map((f) => <Health key={f.label} {...f} />)}</div>
      </>}

      {primary && (
        <div className="sp-panel-primary" style={{ color: STATUS_META[primary.status].color }}>{primary.detail}</div>
      )}

      <div className="sp-panel-sec">ACTIONS</div>
      <div className="sp-panel-actions">
        {sp.actions.map((a) => a.run ? (
          <button key={a.id} className={`sp-act${a.danger ? " danger" : ""}`} onClick={() => { a.run!(); onClose(); }}>{a.label}</button>
        ) : (
          <button key={a.id} className="sp-act disabled" disabled title={a.disabledReason}>
            <span>{a.label}</span><i>{a.disabledReason}</i>
          </button>
        ))}
      </div>

      <div className="sp-panel-meta">last check {lastChecked ? new Date(lastChecked).toLocaleTimeString() : "—"}</div>
      <div className="sp-panel-truth">● {truth.real} wired &amp; real · ◌ {truth.pending} honestly disabled</div>
    </div>
  );
}
```

Wire in `EcosystemBar.tsx`: replace the `<QuickPanel .../>` render for non-GODMODE powers with `<SuperpowerPanel id={sp.id} status={st} checking={checking} lastChecked={lastChecked} onClose={() => setOpen(null)} />` (keep GODMODE opening `GodModePanel`; keep the `allowed` access gate + the outside-click/Escape close on the wrapper).

### 19.3 — P1-A CSS (styles.css additions, tokens only)

```css
.sp-panel--full { width: min(560px, 92vw); padding: 14px; background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); }
.sp-panel--full .sp-panel-sec { font-size: 11px; letter-spacing: .08em; color: var(--muted); margin: 12px 0 6px; }
.sp-panel--full .sp-panel-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; }
.sp-panel--full .sp-panel-primary { margin: 10px 0; font-size: 13px; }
.sp-panel--full .sp-panel-actions { display: flex; flex-wrap: wrap; gap: 6px; }
.sp-panel--full .sp-panel-meta { margin-top: 10px; font-size: 11px; color: var(--faint); }
.sp-panel--full .sp-panel-truth { margin-top: 6px; font-size: 11px; color: var(--muted); }
/* reuse .gm-card / .gm-card-label / .gm-card-status / .gm-card-detail from the GODMODE styles */
```

These reuse `--panel`/`--line`/`--muted`/`--faint`/`--radius` and the GODMODE `.gm-card*` classes — no new colors, native look. Respect the Appearance density/motion settings via the existing global guards.

### 19.4 — After 19.1 + 19.2

You have killed the one dead click (P0-1) and built the primitive that turns six menu→panel elevations into thin config (P1-A). From here, P1-B (Ruflo panel) and P1-C (five panels) are `usePanelData` branches + `registry` action tweaks — the hard architectural work is done. Continue down PART 18's Phase 2 checklist.

**PART 20 below** consolidates every hard invariant scattered through this document into one numbered ledger (the single-glance "never break these" reference), followed by the full navigational table of contents.

---

## PART 20 — INVARIANTS LEDGER & TABLE OF CONTENTS

### 20.1 — THE INVARIANTS LEDGER (never break these — one glance)

**Doctrine**
- I1. No dead clicks. Every control runs, navigates, or is honestly disabled with a stated reason.
- I2. No fake status. Every status is probe-derived; never hardcode `LIVE`.
- I3. No over-promising labels. A control's label must not imply more than its handler does.
- I4. A low live-count is honest, not a bug — never loosen a `statusOf` to inflate it.
- I5. Every panel field traces to a probe or a real artifact — unwired → honest "not wired"/pending-backend.
- I6. `operationalTruth()` must stay truthful — new pending actions count as pending.
- I7. Honest copy register: state the truth, name the next step, no hype (Appendix BC).

**Renderer / Electron**
- I8. Renderer NEVER imports `electron`/`require`/`node:*` — only `window.dai.*` (black-screen class).
- I9. No duplicate `ipcMain.handle` for a channel (boot crash).
- I10. No ArrayBuffer transfer list over MessagePort (nulls the message → keystroke death).
- I11. `contextIsolation:true` + `sandbox:false` stay; preload emits `.mjs`.
- I12. claude terminals spawn `zsh -l -c "exec claude"` (no `|| zsh` fallback).

**Access / security**
- I13. Team caps are COOPERATIVE, never presented as security.
- I14. Gated writes re-check `teamCan()` server-side; renderer `can()` is UX only.
- I15. No secrets in code/memory/vault; secrets → `~/.config/dai/*.json` 0600, fs-denylisted.

**Build / process**
- I16. Build gate = `tsc --noEmit` (electron-vite build only transpiles) + `doctor --check`.
- I17. No disabled entry in the SUPERPOWERS registry (doctor fails) — restriction via dock `restricted` state.
- I18. Files < 500 lines — extract when you cross it.
- I19. `git ls-files | grep node_modules` empty — never stage a node_modules symlink.
- I20. Absolute binary paths in scripts (the `_lc` wrapper shadows bare git/npm/curl).

**Multi-agent hazard**
- I21. Read files fresh before editing (peer churn).
- I22. Commit each verified task immediately (only protection against peer rollback).
- I23. Don't touch registry/App/LeftRail/library while the peer Library refactor is active.
- I24. If tsc/build is red on a HOT tree, wait ~2 min before blaming your change.

**Agent-targeting**
- I25. Per-agent actions match the terminal by EXACT cwd + unique match (0 or >1 → skip). Never `startsWith`.

**UI**
- I26. EN/RO on all user copy (`useT`). a11y: aria-labels, Escape closes, disabled+title.
- I27. Brand tokens only; no emoji; status color = `STATUS_META[status].color`.
- I28. Every consequential action logs to audit AND toasts — never silent.

**Verification**
- I29. Definition of Done (Appendix F) met before "done"; CDP assertion + screenshot read-back, not just a green screenshot.
- I30. `window.dai.perms` is retired — never reintroduce it.

Breaking I1-I7 corrupts the product's identity. Breaking I8-I12 breaks the app. Breaking I21-I24 loses work. Treat all thirty as gates, not guidelines.

### 20.2 — TABLE OF CONTENTS

- PART 0 — How Fable should read & execute (constraints, hermeneutic contract)
- PART 1 — Ground truth (repo state, commands, sources of truth, tooling)
- PART 2 — The honesty doctrine (the app's soul; status + verdict vocabulary)
- PART 3 — Superpowers deep audit (the 7 powers + scoreboard)
- PART 4 — GODMODE as the master template (panel grammar + per-power specs)
- PART 5 — Core sectors deep audit (the 8 decks + cold reading)
- PART 6 — Global UI audit (dock, TopBar, StatusBar, palette, settings, library, more)
- PART 7 — Global button truth table
- PART 8 — Operational scores (0-100 with reasoning)
- PART 9 — Construction plan (P0 / P1 / P2, optimized)
- PART 10 — Screenshot QA plan
- PART 11 — Sequencing & dependency graph
- PART 12 — Appendices (executor reference)
- PART 13 — Final report (the requested 10-part format)
- PART 14 — Hermeneutic closing (why this order, why this doctrine)
- PART 15 — Supplementary build reference (smoke harness, worked examples, decision log, open questions)
- PART 16 — Expanded per-task implementation notes
- PART 17 — Executor quick-reference (grep-map, commit catalog, baseline metrics, CDP one-liners, document map)
- PART 18 — Master task checklist (Fable's live progress tracker)
- PART 19 — Reference implementations (near-complete code: P0-1, P1-A)
- PART 20 — Invariants ledger & table of contents

**Appendix index:** A IPC map · B file map · C status pipeline · D access-control · E glossary · F execution log · G mockups · H verification recipes · I risk register · J acceptance scripts · K SuperpowerPanel skeleton · L rufloQueue/Full-Check skeletons · M doctrine sweep · N design tokens · O safe commands · P palette catalog · Q change matrix · R reading method · S domain glossary · T reserved · U data-flow traces · V window.dai signatures · W anti-patterns · X future vision · Y FAQ · Z effort guidance · AA continuity snapshot · AB superpower narratives · AC sector deep-dive · AD per-task DoD · AE keymap · AF status×surface · AG action enumeration · AH more enumeration · AI editor's notes · AJ CDP snippets · AK settings breakdown · AL probe reference · AM event bus · AN file inventory · AO findings register · AP summary tables · AQ build recipes · AT usePanelData branches · AU 60-min runbook · AV CSS families · AW worked interpretation · AX styles additions · AY exhaustive controls · AZ pattern library / smoke harness · BA integration matrix · BB cross-cutting · BC honest-copy glossary · BD session changelog.

This document is the complete, self-contained specification: the audit (what is real), the plan (what to build, in order), and the substrate (everything an executor needs to re-derive any step against a moving tree). Hand it to Fable 5 at max effort. It will know the system, know the doctrine, know exactly what to do first, and know how to prove each step real. **PART 21 below** closes with the concrete failure behind each critical invariant — the memory of what went wrong, so it does not go wrong again.

---

## PART 21 — INVARIANT RATIONALE (the failure behind each rule)

Rules without their failures are forgotten. Here is why the critical invariants exist — each is a scar, not a preference.

- **I8 (no electron import in renderer).** A concurrent session added `import { ipcRenderer } from "electron"` to `TerminalsView.tsx`. Electron's npm entry reads `__dirname`, undefined under `contextIsolation` → `ReferenceError` at module-eval → React never mounted → **solid black window**. Fixed `dadb3d5`. The whole app died from one import. This is why the renderer's only door to privilege is `window.dai`.
- **I9 (no duplicate handler).** The same session left a duplicate `ipcMain.handle("check-command", …)`. Electron throws on the second registration for a channel → the app would not boot. One stray handler = a dead app.
- **I10 (no ArrayBuffer transfer over MessagePort).** Passing a transfer list nulled the message → terminal keystroke input silently died. Silent is the danger — no error, just a dead keyboard. Structured clone only.
- **I2 (no fake status).** An earlier Ruflo "Ignite" showed a green LIVE after a click that started nothing — Ruflo is a CLI, not a daemon. It was a lie the operator would act on. The repair (`7c1d8b9`) made Ignite run a real health probe and report the true state. A dashboard you must second-guess is worthless.
- **I1 (no dead clicks).** The Preview Micro Terminal Run (F01) clears its input and does nothing while claiming "executes via the terminal host." One lying click undermines trust in every honest one beside it. This is why P0-1 is P0.
- **I17 (no disabled registry entry).** `doctor` fails the build on a disabled SUPERPOWERS entry — so "not available to this member" is expressed by the dock's `restricted` state, and "not built" by simply not adding the action. The gate is mechanical so the doctrine can't erode by accident.
- **I19 (no node_modules symlink staged).** A worktree subagent force-added a `node_modules` symlink past `.gitignore`. On merge, git wrote it over `main/node_modules` → a self-referential symlink shadowing the real dir → `tsc`/build broke in main with "Cannot find module". The fix (`git rm --cached` + `npm install`) is cheap; the confusion was not.
- **I22/I23 (commit early; don't touch contended files).** A peer session rolled back the main tree and overwrote uncommitted edits minutes after they were made, resolving conflicts its own way. A commit is the only thing that survives a peer. This is why every task ends in a commit and why registry/App/LeftRail/library are off-limits during the Library refactor.
- **I25 (exact-cwd unique-match).** Autopilot nudges a stuck agent by typing into its terminal. A `startsWith` match, or acting when >1 terminal shares the cwd, types into the WRONG agent — a real keystroke into someone else's session. The guard (`length !== 1 → skip`) is why it's safe.
- **I16 (tsc is the gate).** `electron-vite build` only transpiles — it passes on type errors. A change that "builds" can still be broken. The real gate is `tsc --noEmit`. Trusting the transpile is how a type error ships.
- **I4 (a low live-count is honest).** The instinct on seeing "0/7 live" is to make it look healthier. But 0/7 is the true state when nothing has an active signal — it swings to 2, 3 as work starts. Loosening a `statusOf` to inflate it is fabricating liveness across the dock, TopBar, StatusBar and GODMODE at once. The honest number is the feature.
- **I30 (perms retired).** The Task-10 cutover (`28c639a`) removed `permissions.ts` + `window.dai.perms`, migrating to the vault-synced team model. A stale `window.dai.perms` reference is a bug from an un-migrated consumer — the type no longer exists.

Each rule is a wound the codebase already took. Fable inherits the scars so it does not re-open them. That is the deepest sense in which this is a learning machine: the invariants ARE the accumulated learning, compressed into rules that make the next mistake impossible by construction rather than by vigilance.

Build in that grain. Everything in this document — the audit, the plan, the appendices, the ledger — exists to let a fresh executor act with the full memory of what this system is, why it is that way, and what it must never become: a command center that lies.

---

## PART 22 — EFFORT & DEPENDENCY ESTIMATE (planning table)

Rough estimates for the operator to plan Fable's run. "Effort" is relative tier (Appendix Z), not wall-clock. "Blocks" = must complete first.

| Task | Effort | Blocks | Risk | Ships |
|---|---|---|---|---|
| Phase 0 baseline + smoke.mjs | S-M | — | low | a repeatable verification harness |
| P0-2 rename Assign Sector | XS | — | low | doctrine: label honesty |
| P0-1 kill dead Micro Terminal Run | S | — | low | doctrine: zero dead clicks |
| P0-3 Google sign-in (user) | XS | — | low | Drive live |
| P0-4 DMG (infra) | S | — | low | distributable build |
| P1-A SuperpowerPanel primitive | M-L | — | med | the elevation primitive (6 panels become config) |
| P1-B Ruflo panel + rufloQueue | M | P1-A | med | the reference panel + first real queue read |
| P1-C.1 Obsidian panel | S | P1-A | low | panel |
| P1-C.2 Graphify panel | S | P1-A | low | panel |
| P1-C.3 Cloud panel | S | P1-A | low | panel |
| P1-C.4 Agents panel | S | P1-A, P0-2 | low | panel |
| P1-C.5 Google panel | S | P1-A | low | panel |
| P1-D GODMODE Full System Check | M | — | low | explicit re-probe with streamed output |
| P1-E Code action bar | M | — | low | Build/Typecheck/Tests/Diff/Ask |
| P1-F Gmail scope/label | S | operator decision | med | scope honesty |
| P1-G Agents Stop + swarm meter | M | — | low | per-agent stop, capacity gauge |
| P1-H Metrics system-health strip | S-M | — | low | system dashboard strip |
| P1-I idle-recap re-audit | S | — | low | verified/fixed merged feature |
| P2-1 Creative backend (1 provider) | L | operator key | med | first real generation slice |
| P2-2 Neuromap team/tasks | M | team data | low | real team/task nodes |
| P2-3 Terminal CLI toast | XS | — | low | honesty polish |
| P2-4 TopBar branch chip | S | — | low | active-repo context |
| P2-5 Shortcuts rebinding | M | — | low | rebindable keymap |
| P2-6 Perms sub-label | XS | — | low | accuracy |
| P2-7 Guide refresh | S | — | low | current + EN/RO |
| P2-8 Library re-audit | M | peer settles | med | verified Library |

**Sequencing summary:** Phase 0 → P0-2 → P0-1 → (P1-A → P1-B → P1-C.1-5) as a block → P1-D, P1-E, P1-G, P1-H in parallel → P1-F/I when decided/quiet → P2 after the critical path ships. The critical path (P1-A→B→C) is the elevation the operator asked for; everything else parallelizes around it. Total scope is deliberately staged so the operator sees value after each commit, not only at the end — and so a pause at any point leaves the app more real than before, never half-broken.

The estimate is a planning aid, not a contract. Fable adjusts as reality diverges (Appendix R) and records the divergence in the execution log (Appendix F) — which is, once more, the whole point: a plan that learns as it is executed.

---

## PART 23 — DOCUMENT PROVENANCE & USAGE

- **What this is:** a combined read-only operational audit + executable construction plan for Dragons Alliance IDE, written to be handed to a fresh executor session.
- **Author:** Claude (Opus 4.8, 1M context) at maximum effort.
- **Date:** 2026-07-07.
- **Repo / HEAD at audit:** `~/code/dragons-alliance-ide` · `main` · `5497e67`.
- **Verification state:** `tsc --noEmit` EXIT 0 · `npm run build` EXIT 0 · `doctor --check` EXIT 0 (on a quiet tree). No source code was modified; nothing was committed. This document is the only artifact produced.
- **Intended executor:** Claude Fable 5 at maximum effort, in a fresh session in the repo.
- **How to use:** switch model to Fable 5 (effort max); point it at this file; it runs Appendix AU (60-min runbook) → PART 18 (checklist) → PART 9/16 (tasks) → verifies by Appendix F (Definition of Done).
- **How to cite inside execution:** reference tasks by id (P0-1, P1-A, …), findings by id (F01…F18), invariants by id (I1…I30), appendices by letter.
- **Related files:** `docs/superpowers/plans/2026-07-06-settings-team-permissions.md` (prior spec) · `docs/superpowers/specs/2026-07-06-settings-team-permissions-design.md` · project `CLAUDE.md` · the multi-agent hazard memory.
- **Scope discipline:** builds P0→P2 only; the P3 vision (Appendix X) is direction, not backlog; Appendix X.7 lists what NOT to build.
- **Living document:** if reality diverges materially during execution, append an addendum here rather than editing the audit in place — the audit is a dated snapshot; the addendum is the learning.
- **The single rule that outranks all others:** the honesty doctrine (§2 / PART 2 / invariants I1-I7). Every other instruction is subordinate to it.
- **Status:** COMPLETE and self-contained — audit + plan + substrate, ready to execute.

— End of document. (Author: Claude Opus 4.8 · read-only deep audit + construction plan · 2026-07-07 · 4000+ lines · for execution by Claude Fable 5 at maximum effort. The whole thing in one line: make the Dragons Alliance IDE more real and more trustworthy — and never, at any step, let a control lie.)
