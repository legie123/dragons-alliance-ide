# Dragons Alliance IDE SUPERPOWERS Audit

Date: 2026-07-05

Scope: Obsidian, Grapevine, Ruflo, Cloud, Agents, GODMODE, Google APIs.

## Per-Button Status

| Superpower | Current signal source | Root cause found | Fix applied / next fix |
|---|---|---|---|
| Obsidian | `probeTools()` checks Obsidian process and `~/Documents/Obsidian/Antigravity-Brain` | Main chip worked, but `Chat with Vault` was a dead disabled action because no RAG backend exists yet. | Replaced dead action with `Plan Vault Chat`, which launches Claude in the vault with a safe local RAG implementation prompt. |
| Grapevine | `launchctl list` for `com.user.graphify-obsidian`, plus `graphify-out` digest path | `Show Agents Layer` was disabled even though Neuromap already owns that layer UI. `Open Graph Digest` depends on `_GRAPHIFY_DIGEST.md` existing. | `Show Agents Layer` now opens Neuromap instead of being dead. Digest remains honest: it opens the real generated file when present. |
| Ruflo | freshness of `ruvector.db` in known local paths | Ruflo can only be "live" when the vector DB was written recently; otherwise it is ready/idle. | Existing actions already arm real terminal commands: `ruflo status`, `ruflo task list`, `ruflo session list`. No credential fabrication. |
| Cloud | live Claude session count from `collect(240)` | Launch and metrics worked; `Stop Session` was disabled and created a dead-looking menu item. | `Stop Session` now opens the Terminal deck where per-terminal stop controls exist. |
| Agents | live Claude sessions from `collect(240)` | Actions were routed to Mission Control / Claude launch and were already actionable. | No code change needed. Keep Agent cockpit as control plane. |
| GODMODE | registry forced `live`; tools probe separately checks `~/code/godmode-lab` | UI chip opens GODMODE panel, but backend probe may say off if `godmode-lab` is missing. This is a status semantics mismatch, not a click-handler failure. | Leave panel live because it is an IDE command center. Future improvement: expose a separate "external lab" health row. |
| Google APIs | `gdrive.status()` from `~/.config/dai/google.json`; service health via Drive/Sheets/Forms/Gmail probes | Shows setup required when `clientId` / `clientSecret` are missing; signed-in state requires refresh token. External credentials cannot be invented. | Credentials vault already auto-opens and stores config with mode `0600`. Added `Cloud Repair Prompt` action to launch a scoped remediation agent. |

## Remediation Plan

1. Keep `src/renderer/src/registry.tsx` as the single source of truth for visible actions.
2. Every menu item must have either a `run` handler or a short, honest reason; user-facing SUPERPOWERS should prefer actionable setup/fallback routes over disabled dead ends.
3. Keep Google gated by real OAuth state:
   - configured means local OAuth client id and secret exist;
   - signed in means refresh token exists;
   - live per-service health means the API endpoint accepts the token.
4. Keep external credentials outside the repo in `~/.config/dai/google.json` with `0600`.
5. Add a scripted validator that checks local paths, IPC handlers, renderer registry actions, Google config state, and service-health availability without printing secrets.

## Verified Locally

- `src/renderer/src/registry.tsx` declares all seven SUPERPOWERS.
- The quick-panel disabled actions for Obsidian chat, Grapevine agents layer, and Cloud stop flow were replaced with real fallback actions.
- Google APIs already have setup UI through the credentials vault and Drive view.
- Google live validation remains blocked until OAuth client credentials and user consent exist on this Mac.

## Still Blocked By External Setup

- Google Drive/Sheets/Forms/Gmail live calls need a Google Cloud Desktop OAuth client and consent.
- Graphify digest depends on a local graphify output file.
- Ruflo "live" depends on the local Ruflo/vector process writing recent state.
- True vault chat needs a local RAG backend or a Claude workflow that indexes the Obsidian vault safely.
