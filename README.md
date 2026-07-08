# Dragons Alliance IDE

A native **macOS** desktop IDE for driving and monitoring Claude Code agents —
persistent terminals, a Mission-Control agent view, a Monaco code editor, live
session metrics, and a ⌘K command palette. Built on Electron + React 19 + node-pty.

> **Platform:** macOS on **Apple Silicon** (M-series). The app ships a prebuilt
> arm64 `node-pty` and packages a `.dmg` via `electron-builder --mac`. It is **not**
> built for Windows/Linux. "Run it on another PC" = run it on another **Mac**.

---

## Quick start (run from source on any Mac)

```bash
git clone https://github.com/legie123/dragons-alliance-ide.git
cd dragons-alliance-ide
npm install        # postinstall auto-chmods the node-pty spawn-helper
npm run start      # builds, then launches the app
```

That's it — `npm run start` builds main + preload + renderer and opens the window.
First launch runs the **Kit Setup wizard** (below), which detects what's on your
machine and tells you exactly what to install to unlock full power.

### Requirements
- **macOS** (Apple Silicon) + **Xcode Command Line Tools** (`xcode-select --install`)
- **Node.js 22** and npm (`node -v` → v22.x). [nvm](https://github.com/nvm-sh/nvm): `nvm install 22`
- **git**

---

## The Kit — first-run onboarding

The IDE runs on its own, but its **superpowers** (Cloud / Agents / GODMODE, plus
RuFlo, Graphify, Obsidian and Google integrations) rely on tools that live on *your*
machine, not in this repo. The **Kit Setup** honestly detects what's installed and
guides you through the rest:

- Auto-opens a **wizard once** on first run, and shows a **persistent banner** under
  the dock until the kit is complete.
- Reopen anytime: **⌘K → "Open Kit Setup"**, the banner's button, or (admins)
  **Library → Kit Setup** tab.
- It **only copies install commands to your clipboard** — it never runs anything for you.

| Kit item | What it powers | Install |
|----------|----------------|---------|
| **Claude Code** CLI | Cloud / Agents / GODMODE | `npm i -g @anthropic-ai/claude-code` |
| **RuFlo** | multi-agent swarms | `npm i -g @ruvnet/ruflo` |
| **Graphify** | live code-graph analysis | `pip install graphifyy==0.4.23` |
| **Obsidian** + vault | knowledge / memory | [obsidian.md/download](https://obsidian.md/download) |
| **Google APIs** *(optional)* | Drive / Calendar sync | in-app: sign in via the vault action |

Detection uses your **login shell PATH** (`zsh -lc`), so a CLI installed in
`~/.local/bin` or `/opt/homebrew/bin` reads **ready**, not falsely "missing".

---

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run start` | Build + launch the app (`electron-vite preview`) |
| `npm run dev` | Dev mode with hot reload |
| `npm run build` | Type-check + build main/preload/renderer to `out/` |
| `npm run dist` | Package a distributable `.dmg` + `.app` into `release/` |
| `npm run doctor` | Diagnose the superpowers/tools setup |

### Build a shareable app (.dmg)
```bash
npm run dist        # → release/Dragons Alliance IDE-<version>.dmg
```
Open the `.dmg`, drag the app to **Applications**, launch. (Unsigned build — on first
open, right-click → **Open** to bypass Gatekeeper, or
`xattr -dr com.apple.quarantine "/Applications/Dragons Alliance IDE.app"`.)

---

## Troubleshooting

- **`posix_spawnp failed` / terminals won't open** — the node-pty `spawn-helper`
  lost its exec bit. Re-run: `npm run postinstall` (or
  `chmod +x node_modules/node-pty/prebuilds/darwin-*/spawn-helper`).
- **Electron binary missing** (e.g. after `npm install --ignore-scripts`):
  `node node_modules/electron/install.js`.
- **Powers show as dead/partial** — install the Kit tools above, then hit **Recheck**
  in the Kit Setup.

---

## Architecture (for contributors)

- **PTY isolation:** node-pty runs in a dedicated Electron `utilityProcess`
  (`src/pty-host/host.ts`), not the main process; renderer ↔ host over a MessagePort.
- **Main** (`src/main/`): fs (confined to HOME + secret denylist), projects, sessions
  (parses `~/.claude/projects/*.jsonl`), IPC handlers.
- **Renderer** (`src/renderer/src/`): React 19 — `views/`, `components/`, `App.tsx`,
  `palette.ts` (⌘K), `api.ts` (`window.dai.*`).
- Deeper notes for AI/dev sessions live in [`CLAUDE.md`](./CLAUDE.md).

## Security

No secrets are committed. Filesystem access is confined to your home directory with a
secret denylist. The Kit never auto-runs commands — install steps are copied to your
clipboard for you to review and run yourself.
