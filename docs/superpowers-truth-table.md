# Superpowers Dock — Button Truth Table

Factual map of every Superpower dock action after the surgical repair. Status is
resolved LIVE by real probes (`src/main/tools.ts` → `useOps` → `registry.statusOf`);
it is never hardcoded. `live` is reserved for a real active signal — the dock shows
whatever the machine truly reports (e.g. "2/7 live" is a real idle-ish snapshot, not
a bug). Verdicts: **REAL** = genuine backend/side-effect; **PARTIAL** = real but
gated on external setup; **DISABLED** = honest disabled reason (none currently in the
dock — the doctor guards this).

## Status source per power

| Power | Probe (src/main/tools.ts) | Live signal |
|---|---|---|
| Obsidian | vault `.lock` / `pgrep Obsidian` / vault mtime | vault open in Obsidian |
| Grapevine (graphify) | launchd `com.user.graphify-obsidian` pid + digest/report mtime | agent running + digest fresh <30 min |
| Ruflo | `ruvector.db` mtime (<10 min) | DB written recently |
| Cloud / Agents | live Claude sessions (`idle_min < 3`) | ≥1 active session |
| GODMODE | `~/code/godmode-lab` + active session in it | active session in godmode-lab |
| Google APIs | `~/.config/dai/google.json` (clientId/secret/refreshToken) | refresh token present |

## Ruflo

| Action | Handler | Backend / IPC | Verdict | Change |
|---|---|---|---|---|
| Ignite (health check) | `rufloIgnite()` | `sp:health` → `rufloHealth()` runs `ruflo status` in HOME, 6s timeout | **REAL** | Was `armTerm("ruflo status","~")` — silent, no feedback. Now: CHECKING toast → real result toast, then dock refresh. |
| Broadcast Mission (Agents) | `goto("agents")` | renderer nav | REAL | unchanged |
| View Task Queue | `armTermToast("ruflo task list","~", …)` | pty terminal in HOME + info toast | **REAL** | Was silent `armTerm`. Now confirms what was armed via toast. |
| Continue Flow | `armTermToast("ruflo session list","~", …)` | pty terminal in HOME + info toast | **REAL** | Was silent `armTerm`. Now confirms via toast. |

**Ignite messages (verified live):**
- Success (engine reachable, swarm stopped): `Ruflo engine ready — swarm stopped, safe to ignite` · detail `engine V3 · 0 active agent(s) · MCP server idle`
- Success (swarm running): `Ruflo engine running — swarm active`
- Not initialized in dir: `Ruflo not initialized in this directory`
- CLI missing on PATH: `Ruflo CLI not found on PATH`

**Ground-truth correction:** the audit said `ruflo status` errors from HOME and works in
the repo. Reality is the reverse — `ruflo status` runs cleanly from HOME (global state),
and the *repo* dir errors with "not initialized". The health IPC therefore runs in HOME.
The pty-host also now expands `~/…` cwds (they previously fell back to HOME silently).

## Grapevine (graphify)

| Action | Handler | Backend / IPC | Verdict | Change |
|---|---|---|---|---|
| Open Map (Neuromap) | `goto("neuromap")` | renderer nav | REAL | unchanged |
| Open Graph Digest | `graphifyOpenDigest()` | `sp:opendigest` → opens vault digest, else repo `GRAPH_REPORT.md` | **REAL** | Was `toolAction("open-graphify")` pointing at a repo path that never exists → opened nothing / showed a folder. Now opens the REAL digest (vault) and toasts the result; honest "run Regenerate" when truly absent. |
| Regenerate Digest | `graphifyRegen()` | `armTerm("graphify update .", repo)` + toast | **REAL** (new) | New action. Runs the real pipeline command in the repo, visibly, then refreshes the dock. |
| Show Research Lens | `goto("research")` | renderer nav | REAL | unchanged |
| Show Agents Layer | `goto("neuromap")` | renderer nav | REAL | unchanged |

**Digest reality:** the live sync agent writes `_GRAPHIFY_DIGEST.md` into the VAULT
(`01_PROJECTS/dragons-alliance-ide/graphify/`), and `GRAPH_REPORT.md` into the repo's
`graphify-out/`. The old probe/action looked for the digest inside `graphify-out/`, where
it never lands. Open Digest now prefers the vault digest, falls back to the repo report,
and the probe's `detail` no longer claims "no digest" when a report exists.

## Cloud / Agents / GODMODE / Obsidian / Google

| Power · Action | Handler | Verdict | Note |
|---|---|---|---|
| Obsidian · Open Vault | `tools.action("open-obsidian")` → `obsidian://` | REAL | unchanged |
| Obsidian · Neuromap/Search/Sync/Plan | nav / `admin("team")` / claude prompt | REAL | unchanged |
| Cloud · Launch Claude Session | `deployTerm("claude","~")` | REAL | unchanged |
| Cloud · Mission Control / Tokens / Stop | nav | REAL | unchanged |
| Agents · all four | nav / `deployTerm("claude")` | REAL | unchanged |
| GODMODE · Open GODMODE | `godmode` event → panel | REAL | unchanged (dock chip opens panel directly) |
| Google APIs · Drive/Keys/Health/Repair | nav / vault / `admin("health")` / claude prompt | PARTIAL | Status stays **setup-required** — `~/.config/dai/google.json` is absent (no creds). This is the true state; not inflated. |

## Feedback layer

- `src/renderer/src/toast.ts` — vanilla external store (no deps) so module-scope registry
  handlers can push toasts. `src/renderer/src/components/ToastHost.tsx` renders via
  `useSyncExternalStore`; `src/renderer/src/styles/toast.css` uses brand tokens only, no emoji.
- Kinds: `checking` (persists, spinner), `success` (teal), `error` (rose), `info` (gold).
- Every superpower quick action now surfaces CHECKING/RUNNING → success/error. Errors are
  never swallowed; each action also logs to the audit trail (`window.dai.audit.log`).
- After a state-changing action the handler dispatches `dai:refresh-tools`; App invalidates
  the React Query `["tools"]` key so the dock re-probes.

## Live count / honesty

`liveCount` in `useOps.ts` = count of powers whose `statusOf(env)` returns `live`, computed
from real probe data. No power is forced live; Google stays setup-required until creds exist;
the digest is never fabricated. Verified snapshot at QA time: **2/7 live** (Cloud + Agents,
from real active sessions).
