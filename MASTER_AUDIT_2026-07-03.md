# Dragons Alliance IDE - Master Audit - 2026-07-03

## Verdict
PARTIAL.

The app builds and the architecture is mostly solid, but it is not production-clean.
Typecheck is broken. Dev/security chain has high vulnerabilities. Several risky
actions execute without enough confirmation. Phone communication is an explicit stub.

## Tested
- `npm run build` - PASS.
- `npx tsc --noEmit` - FAIL.
- `npm audit --omit=dev` - PASS, 0 prod vulnerabilities.
- `npm audit` - FAIL, 13 vulnerabilities: 11 high, 1 moderate, 1 low.
- Local Electron launch with temp profile - PARTIAL. Renderer loaded and logged, but
  CDP page targets disappeared, so automated click verification is not certified.

## Current Dirty State
- Pre-existing dirty file: `src/main/sessions.ts`.
- Audit added: `MASTER_AUDIT_2026-07-03.md`.

## Critical Findings

### BROKEN: Typecheck fails
`npx tsc --noEmit` fails:
- `src/renderer/src/monaco-setup.ts`: Vite `?worker` imports lack TS declarations.
- `src/renderer/src/views/TerminalsView.tsx`: reads `m.mirror_scope`, but
  `ServerTerm` in `src/renderer/src/api.ts` omits `mirror_scope`.

Impact: CI/type safety is not real. Build passes because Vite transpiles, but TS
contract is broken.

### DANGEROUS: Electron dependency vulnerable
`npm audit` reports high vulnerabilities in Electron `33.4.11`.

Impact: shipped desktop app risk. This is not only dev noise because Electron is
the runtime.

Fix direction: upgrade Electron deliberately, then retest PTY utilityProcess,
preload path, packaging, and node-pty compatibility.

### DANGEROUS: Terminal broadcast lacks confirmation in Terminals view
`TerminalsView.quickSend()` sends input to visible workers without confirmation.

Impact: a pasted destructive command can run across multiple terminals.

Contrast: `MissionBar.send()` does confirm before broadcasting to Claude agents.

### DANGEROUS: Launch all Claude agents has no confirmation
`MissionBar.launchAll()` can spawn Claude in every project without a confirmation
gate.

Impact: cost, token burn, process fanout, accidental account/tool activity.

### DANGEROUS: Autopilot sends prompts automatically after toggle
`AgentsView` Autopilot auto-broadcasts self-repair prompts into live Claude
terminals after the user toggles it on.

Impact: operationally useful, but it is still automated action against active
agents. It needs stronger visible risk state, audit log persistence, and probably
per-agent or per-run confirmation.

### PARTIAL: Phone communication is a stub
`PhoneConnect.tsx` marks Discord/WhatsApp communication as "connect later".

Impact: advertised communicate flow is not implemented. Code/QR part exists.

### PARTIAL: Browser/UI automation not certified
The app launches and renderer logs appear, but CDP target listing returns no page
targets after startup under the temp-profile local Electron run.

Impact: I could not truthfully certify all buttons via automation.

## Architecture Assessment

### REAL: Strong PTY isolation
`src/pty-host/host.ts` keeps `node-pty` in a utilityProcess. Renderer talks over
MessagePort. Main process does not relay terminal bytes.

Good:
- ack-based flow control.
- reload deadlock reset.
- hidden panes detach from streaming.
- terminal host errors do not kill all sessions.
- `exec claude` avoids fallback-to-shell confusion.

### REAL: Main window security is better than average
`src/main/index.ts` uses:
- `contextIsolation: true`.
- navigation pinning.
- denied child windows.
- denied webview attach.
- external http(s) opened outside app.

Concern:
- `sandbox: false` remains required by design. That makes preload/API surface
  quality critical.

### REAL: Filesystem guard exists
`src/main/fs.ts` confines fs access to HOME, blocks symlink escapes, and deny-lists
common secret stores and secret filenames.

Concern:
- `fsWrite()` overwrites files directly. No confirmation, no backup, no atomic
  write. Code editor save is expected behavior, but data loss risk exists.

### REAL/PARTIAL: Metrics are transcript-grounded
Sessions and agent health parse Claude JSONL transcripts and avoid fake statuses
where possible.

Concern:
- These are heuristics. UI should label them as heuristic where status can affect
  automation.

## UI/Button Audit

REAL handlers:
- Top nav buttons switch views.
- Command palette opens and maps commands.
- Phone modal opens.
- Ecosystem buttons are disabled unless action exists.
- Code save has visible toast.
- Mission prompt send has confirmation.

Risk gaps:
- Terminal worker close kills PTY without confirm.
- Terminals broadcast has no confirm.
- Channel/sync toggles can fan keystrokes across terminals; visible, but no
  high-risk warning before first enable.
- Model switch sends `/model ...` to Claude terminal with no confirmation.
- Radar refresh spawns external scanner without confirmation.

## Recommended Fix Order

1. Fix typecheck.
   - Add Vite worker module declaration.
   - Include `mirror_scope` in `ServerTerm` mapping.

2. Add risk gates.
   - Confirm Terminals quick broadcast.
   - Confirm launch-all Claude.
   - Confirm first enable of sync/channel/autopilot per session.
   - Confirm terminal kill when process is alive.

3. Upgrade Electron.
   - Move from `33.4.11` to a non-vulnerable supported version.
   - Retest utilityProcess, MessagePort, node-pty, packaging.

4. Add test harness.
   - Unit test `safePath`.
   - Unit test session parsing goal/error logic.
   - Renderer smoke test for buttons.
   - Electron smoke test for app launch and `window.dai`.

5. Finish or de-scope Phone communication.
   - Implement Discord/WhatsApp bridge, or label it clearly as not connected.

## Stop Condition
Audit complete when build, typecheck, security audit, launch, and button smoke tests
all pass, and risky actions have confirmation gates plus visible results.
