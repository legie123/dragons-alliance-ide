# Dragons Alliance IDE — project guide (for Claude)

Native macOS **Electron** desktop IDE for driving & monitoring Claude Code agents.
Single-user, Apple-Silicon. This file orients any Claude session (incl. phone/cloud
dispatch) — read it first.

## What it is
Four views: **Terminals** (persistent xterm terminals over a native PTY host),
**Agents** (Mission-Control: live transcript per Claude agent + broadcast a prompt to
all agents + launch claude across projects), **Code** (Monaco editor + file tree),
**Metrics** (live session scores). Plus a **⌘K** command palette.

## Run / build
```bash
npm install            # postinstall auto-runs: chmod +x node-pty spawn-helper
npm run start          # build + launch (electron-vite preview)
npm run dev            # dev with HMR
npm run dist           # package release/*.dmg + .app  (npmRebuild:false — prebuilt node-pty)
```
Node 22. If Electron binary missing after `--ignore-scripts`: `node node_modules/electron/install.js`.

## Architecture (important)
- **PTY isolation (VS Code-style):** node-pty lives in a dedicated **utilityProcess**
  `src/pty-host/host.ts` (built to `out/main/host.js`), NOT the main process. Renderer
  talks to it over a **MessagePort** (`src/preload/index.ts` ↔ host), main only wires
  the port + does fs/projects/sessions. Protocol: `src/shared/port.ts`.
- **Flow control:** ack-based (pause node-pty >256KB unacked, resume <64KB; progress
  watchdog). Persistent terminals survive renderer reload (scrollback replay on attach).
- **Data:** `src/main/{sessions,projects,fs}.ts` parse `~/.claude/projects/*.jsonl`
  transcripts for metrics + Agent transcripts; fs confined to HOME + secret denylist.
- **Renderer:** React 19, `src/renderer/src/` — views/, components/, `App.tsx`,
  `palette.ts` (⌘K), `api.ts` (window.dai wrappers).

## Gotchas (do not re-break)
- **Never pass a transfer list for ArrayBuffers to/from `MessagePortMain`** — it nulls
  the message. Copy them (structured clone). This broke keystroke input once.
- node-pty prebuild `spawn-helper` must be `chmod +x` (postinstall + electron-builder
  `afterPack` = `build/after-pack.cjs`), else `posix_spawnp failed`.
- `sandbox:false` is required (MessagePort preload transport); `contextIsolation:true`
  stays. electron-vite emits preload as `index.mjs` (main references `.mjs`).
- claude terminals spawn as `zsh -l -c "exec claude"` (no `|| zsh` fallback, so a
  crashed claude reaps the PTY instead of degrading to a live shell).
- `_lc` shell wrapper aliases `bun/gh/curl/git` → use absolute paths in scripts.

## Verify a change
`npm run build` (main+preload+renderer must all pass), then `npm run start` and confirm
the affected view works. For terminal-input debugging, drive the renderer via CDP
(`electron . --remote-debugging-port=9333`, then `window.dai.term.write` + `attach`).
