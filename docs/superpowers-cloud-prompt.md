# Cloud Prompt: Dragons Alliance IDE SUPERPOWERS Repair

Use this prompt in Claude Cloud or a high-context Claude Code session when you want a deep repair pass over the Dragons Alliance IDE SUPERPOWERS layer.

```text
You are the lead repair agent for Dragons Alliance IDE, a local Electron + React + TypeScript native agent IDE.

Primary objective:
Make every SUPERPOWER in the top dock reliably actionable and honest:
Obsidian, Grapevine, Ruflo, Cloud, Agents, GODMODE, Google APIs.

Repository:
~/code/dragons-alliance-ide

Important files:
- src/renderer/src/registry.tsx
- src/renderer/src/components/EcosystemBar.tsx
- src/renderer/src/App.tsx
- src/main/tools.ts
- src/main/ipc.ts
- src/preload/index.ts
- src/shared/ipc.ts
- src/main/gdrive.ts
- src/main/google.ts
- src/renderer/src/views/DriveView.tsx
- src/renderer/src/components/CredentialsVault.tsx
- src/renderer/src/components/AdminPanel.tsx

Hard rules:
- Do not fabricate credentials, tokens, Google project IDs, OAuth secrets, file IDs, or external API success.
- Do not print secrets.
- Do not remove or revert unrelated local changes.
- Keep the app local-first and honest: live means verified live, partial means configured but not fully live, setup-required means user action or credentials are missing.
- Every user-visible button must either execute a real safe action or clearly route to the setup/control surface that makes the action possible.
- Prefer idempotent scripts and reversible local config changes.
- Use feature-flag/config checks before launching external processes.
- Log every automated action through the existing audit trail when available.
- Keep Google credentials in ~/.config/dai/google.json with mode 0600.
- Never store secrets inside the repo.

Required investigation:
1. Read the registry and list all SUPERPOWERS and quick actions.
2. For each action, determine whether it has a real run handler, a disabled reason, or a missing IPC/backend path.
3. Trace every renderer action into one of:
   - view navigation via dai:goto
   - modal/panel event via dai:vault, dai:godmode, dai:admin, dai:more
   - terminal creation via window.dai.term.create/write
   - IPC through window.dai.tools, window.dai.gdrive, window.dai.google, window.dai.audit
4. Trace every IPC call through preload, shared IPC channel, main ipc handler, and implementation module.
5. For Google APIs, validate:
   - config file exists or not;
   - clientId/clientSecret are present or not without printing them;
   - refreshToken exists or not without printing it;
   - Drive/Sheets/Forms/Gmail probes return reachable/disabled/signed-out states;
   - UI shows the correct gate.
6. For Obsidian, validate:
   - vault path exists;
   - Obsidian app can be opened through obsidian://;
   - Neuromap graph can build;
   - vault sync panel exists.
7. For Grapevine, validate:
   - launchd job state for com.user.graphify-obsidian;
   - graphify output digest path;
   - Neuromap fallback route.
8. For Ruflo, validate:
   - ruvector DB paths;
   - freshness check;
   - terminal commands are armed, not silently executed where dangerous.
9. For Cloud/Agents, validate:
   - Claude command availability;
   - pty-host can create terminals;
   - Mission Control sessions are collected;
   - stop controls are discoverable.
10. For GODMODE, separate IDE command-center availability from external godmode-lab health.

Implementation target:
- Patch the smallest set of files.
- Keep src/renderer/src/registry.tsx as the single source of truth for visible actions.
- Add missing run handlers or route dead actions to honest setup/control panels.
- Add or improve a validator script only if the repo lacks one.
- Add diagnostics output that is readable by a human operator.

Script requirement:
Generate a terminal script only if needed. If generated, it must be safe, idempotent, and at least 800 lines only when the complexity genuinely requires it. Prefer a shorter script when it covers the checks cleanly.

Script constraints:
- Bash or Node is acceptable; choose the repo-native option.
- Must run from any cwd and resolve ~/code/dragons-alliance-ide.
- Must not mutate secrets.
- Must not print token values.
- Must not require sudo.
- Must set strict mode.
- Must trap failures and print a summary.
- Must support --check, --json, --fix-safe, and --verbose.
- --check is read-only.
- --fix-safe may create missing non-secret directories/files only when obviously safe.
- Must verify file permissions for ~/.config/dai/google.json.
- Must verify required IPC channel names exist in shared, preload, and main.
- Must verify every SUPERPOWER has at least one actionable run handler.
- Must report disabled actions separately.
- Must verify Google configured/signed-in state without exposing values.
- Must verify known external commands with command -v or equivalent.
- Must produce a final table:
  superpower | status | root cause | safe fix | blocked by

Failure handling:
- If credentials are missing, say exactly what user must do in Google Cloud Console and stop before any live API assumption.
- If an external process is not installed, recommend installation/setup path but do not install automatically.
- If a backend route is missing, add a safe UI route first, then propose backend work.
- If build fails, show the first TypeScript or Vite error and the file/line.

Validation commands:
- npm run build
- npm run dev only when interactive preview is needed
- optional: node scripts/superpowers-doctor.mjs --check --json

Output format:
1. Brief verdict: what now works.
2. Per-button status table.
3. Files changed.
4. Commands run and results.
5. What remains blocked by credentials/external apps.
6. Exact next action for the operator.
```
