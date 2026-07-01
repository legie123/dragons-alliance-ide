// Dragons Alliance IDE — PTY host (Electron utilityProcess).
//
// Owns node-pty and keeps ALL terminal IO off the main + renderer threads
// (VS Code's pty-host architecture). Talks to the renderer over a transferred
// MessagePort with ack-based flow control, and to the main process over
// process.parentPort for terminal-list changes.
//
// Ported 1:1 from main/pty.ts's Session model — persistent sessions, rolling
// scrollback for reload-replay, master stdin mirroring scoped to a project —
// but re-expressed against the port protocol with binary, transferable output
// and high/low-water flow control instead of setImmediate coalescing.
//
// utilityProcess = Node environment: node builtins + node-pty only. The
// renderer port arrives via process.parentPort ({ t:"port" } + e.ports[0]); a
// renderer reload sends a fresh port that replaces the old one.

import nodePty from "node-pty";
import { existsSync, readdirSync, realpathSync, statSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  HIGH_WATER,
  LOW_WATER,
  type FromHost,
  type ToHost,
  type TermOpts,
} from "../shared/port.js";
import type { TermInfo } from "../shared/ipc.js";

const MAXBUF = 256 * 1024; // scrollback chars kept per terminal for replay

type Session = {
  id: string;
  proc: nodePty.IPty;
  cmd: string;
  cwd: string;
  is_master: boolean;
  mirror: boolean;
  mirror_scope: string; // "all" or a project key (as returned by projectOf)
  buffer: string; // rolling scrollback, replayed on attach
  unacked: number; // bytes of output the renderer hasn't confirmed flushed
  paused: boolean; // node-pty paused because unacked crossed HIGH_WATER
  lastAck: number; // Date.now() of the last ack (progress signal for the watchdog)
  viewing: boolean; // a pane is currently mounted for this session (streams live)
};

const registry = new Map<string, Session>();
const enc = new TextEncoder();

// ── renderer port (replaced on every renderer reload) ─────────────────────────
let rport: Electron.MessagePortMain | null = null;

process.parentPort.on("message", (e) => {
  // Main forwards the renderer-side MessagePort as a transferable. A reload
  // produces a brand-new port; swap it in and rewire the message handler.
  if (e.ports && e.ports[0]) {
    // tear down the previous port (avoid listener/port leak across reloads)
    if (rport) {
      try { rport.removeListener("message", onRendererMsg); rport.close(); } catch { /* ignore */ }
    }
    rport = e.ports[0];
    rport.on("message", onRendererMsg);
    rport.start();
    // CRITICAL: the new renderer starts from a fresh scrollback replay (which it
    // does NOT ack), so any bytes the old renderer left unacked can never be
    // acked. Reset flow-control state per session or a session paused at reload
    // time stays paused forever (deadlock / frozen terminal).
    for (const s of registry.values()) {
      s.unacked = 0;
      s.lastAck = Date.now();
      if (s.paused) {
        s.paused = false;
        try { s.proc.resume(); } catch { /* PTY may be mid-exit */ }
      }
    }
  }
});

/** Push a message to the renderer. NOTE: Electron's MessagePortMain only accepts
 *  MessagePorts in its transfer list — ArrayBuffers must be structured-cloned
 *  (copied), NOT transferred, or postMessage throws. So we never pass a transfer
 *  list here; the ArrayBuffer in `data` is copied to the renderer. */
function toRenderer(msg: FromHost, _transfer?: Transferable[]): void {
  rport?.postMessage(msg);
}

/** Notify main that the terminal roster changed (create/exit/kill). */
function postTerms(): void {
  process.parentPort.postMessage({ t: "terms", list: termList() });
}

function termList(): TermInfo[] {
  return [...registry.values()].map((s) => ({
    id: s.id,
    cmd: s.cmd,
    cwd: s.cwd,
    is_master: s.is_master,
    mirror: s.mirror,
    mirror_scope: s.mirror_scope,
    alive: true,
  }));
}

// ── session lifecycle ─────────────────────────────────────────────────────────

/** Spawn (or return the existing live) session for opts.id. Idempotent. */
function create(opts: TermOpts): void {
  if (registry.get(opts.id)) return; // idempotent

  const shellEnv = process.env.SHELL || "/bin/zsh";
  const shell = existsSync(shellEnv) ? shellEnv : "/bin/zsh"; // fall back if $SHELL is bogus
  const args =
    // `exec claude` (no `|| zsh` fallback): a login shell sets up PATH then is
    // REPLACED by claude, so when claude exits the PTY exits and the session is
    // reaped. The old `|| exec zsh` degraded a crashed claude into a live login
    // shell that still matched the "claude" broadcast filter → mission prompts
    // would run as shell commands. This closes that path.
    opts.cmd === "claude" ? ["-l", "-c", "exec claude"] : ["-l"];

  let proc: nodePty.IPty;
  try {
    proc = nodePty.spawn(shell, args, {
      name: "xterm-256color",
      cwd: existsSync(opts.cwd) ? opts.cwd : os.homedir(),
      env: { ...process.env, TERM: "xterm-256color", COLORTERM: "truecolor" },
      cols: 80,
      rows: 24,
    });
  } catch (err) {
    // pty allocation failure (EMFILE/ENOMEM) etc — report instead of crashing.
    const msg = `\r\n\x1b[31m[ failed to start terminal: ${String((err as Error)?.message || err)} ]\x1b[0m\r\n`;
    if (rport) toRenderer({ t: "data", id: opts.id, data: enc.encode(msg).buffer });
    toRenderer({ t: "exit", id: opts.id });
    return;
  }

  const session: Session = {
    id: opts.id,
    proc,
    cmd: opts.cmd,
    cwd: opts.cwd,
    is_master: !!opts.master,
    mirror: false,
    mirror_scope: "all",
    buffer: "",
    unacked: 0,
    paused: false,
    lastAck: Date.now(),
    viewing: true,
  };
  registry.set(opts.id, session);

  proc.onData((d) => {
    session.buffer += d;
    if (session.buffer.length > MAXBUF) {
      session.buffer = session.buffer.slice(session.buffer.length - MAXBUF);
    }
    // Binary transferable output. Only stream (and count as unacked) when a
    // renderer is connected AND this specific pane is being viewed. A pane
    // filtered out by project selection unmounts and sends {t:"detach"}; its
    // output keeps filling `buffer` (replayed on re-view) but is neither sent
    // nor counted — otherwise a hidden chatty worker would inflate unacked with
    // nobody to ack it and stall the PTY via the flow-control watchdog.
    if (!rport || !session.viewing) return;
    const u = enc.encode(d);
    session.unacked += u.byteLength;
    toRenderer({ t: "data", id: session.id, data: u.buffer }, [u.buffer]);
    if (session.unacked > HIGH_WATER && !session.paused) {
      session.paused = true;
      proc.pause();
    }
  });

  proc.onExit(() => {
    toRenderer({ t: "exit", id: session.id });
    registry.delete(session.id);
    postTerms();
  });

  postTerms();
}

/** Write to a PTY, swallowing the EIO/"socket closed" throw of a mid-exit child. */
function safeWrite(s: Session, data: string | Buffer): boolean {
  try {
    // node-pty accepts a Buffer at runtime though its type says string.
    s.proc.write(data as any);
    return true;
  } catch {
    return false; // child exited but onExit hasn't reaped it yet
  }
}

/** Fan stdin out to every OTHER live session, filtered by mirror scope.
 *  Writes go straight to the target PTY (never back through the input path),
 *  so a mirror-enabled target never re-fans — no feedback loop. We mirror only
 *  STDIN, never OUTPUT, which would form an infinite echo. */
function fanOut(source: Session, data: Buffer): void {
  for (const s of registry.values()) {
    if (s.id === source.id) continue;
    if (source.mirror_scope !== "all" && projectOf(s.cwd) !== source.mirror_scope) {
      continue;
    }
    safeWrite(s, data); // per-target guard: one dead PTY won't abort the rest
  }
}

// ── renderer message loop ─────────────────────────────────────────────────────

function onRendererMsg(ev: { data: ToHost; ports?: Electron.MessagePortMain[] }): void {
  const m = ev.data;
  // A throwing handler must never tear down the utilityProcess (which would kill
  // EVERY terminal). Isolate each message.
  try {
  switch (m.t) {
    case "create": {
      create(m.opts);
      break;
    }

    case "attach": {
      // Scrollback replay for a (re)attaching viewer. Null-safe: unknown id
      // replays an empty buffer. Attaching marks the pane as viewed and clears
      // any stale unacked (the fresh replay is not itself acked).
      const s = registry.get(m.id);
      if (s) {
        s.viewing = true;
        s.unacked = 0;
        s.lastAck = Date.now();
        if (s.paused) { s.paused = false; try { s.proc.resume(); } catch { /* mid-exit */ } }
      }
      const u = enc.encode(s ? s.buffer : "");
      toRenderer({ t: "res", rid: m.rid, value: { buffer: u.buffer } }, [u.buffer]);
      break;
    }

    case "detach": {
      // Pane unmounted (e.g. filtered out by project selection): stop streaming
      // + counting for this session so a hidden worker can't stall on unacked.
      const s = registry.get(m.id);
      if (s) {
        s.viewing = false;
        s.unacked = 0;
        if (s.paused) { s.paused = false; try { s.proc.resume(); } catch { /* mid-exit */ } }
      }
      break;
    }

    case "input": {
      const s = registry.get(m.id);
      if (!s) break;
      const data = Buffer.from(new Uint8Array(m.data));
      safeWrite(s, data);
      if (s.mirror) fanOut(s, data); // master stdin mirroring
      break;
    }

    case "resize": {
      const s = registry.get(m.id);
      if (!s) break;
      try {
        s.proc.resize(m.cols, m.rows);
      } catch {
        // ignore: PTY may be mid-exit
      }
      break;
    }

    case "kill": {
      const s = registry.get(m.id);
      if (!s) break;
      s.proc.kill();
      registry.delete(m.id);
      postTerms();
      break;
    }

    case "mirror": {
      const s = registry.get(m.id);
      if (!s) break;
      s.mirror = m.on;
      s.mirror_scope = m.scope;
      break;
    }

    case "ack": {
      // Renderer flushed N bytes — release flow-control backpressure.
      const s = registry.get(m.id);
      if (!s) break;
      s.unacked = Math.max(0, s.unacked - m.bytes);
      s.lastAck = Date.now();
      if (s.paused && s.unacked < LOW_WATER) {
        s.paused = false;
        try { s.proc.resume(); } catch { /* PTY may be mid-exit */ }
      }
      break;
    }

    case "list": {
      toRenderer({ t: "res", rid: m.rid, value: termList() });
      break;
    }

    case "broadcast": {
      // Send `data` (+ optional Enter) to all live sessions, or just `ids`.
      const payload = m.data + (m.enter ? "\r" : "");
      let sent = 0;
      for (const s of registry.values()) {
        if (m.ids && !m.ids.includes(s.id)) continue;
        if (safeWrite(s, payload)) sent++; // per-target guard, accurate count
      }
      toRenderer({ t: "res", rid: m.rid, value: { sent } });
      break;
    }
  }
  } catch (err) {
    // one bad message must not kill the host (and all terminals)
    console.error("[pty-host] message handler error:", err);
  }
}

// ── flow-control watchdog ─────────────────────────────────────────────────────
// Safety net against a lost/dropped ack (or any stale-unacked state) stranding a
// session paused forever. It must NOT re-test `unacked < LOW_WATER` — a lost ack
// leaves unacked stuck ABOVE LOW_WATER, the exact case it exists to recover. So
// it triggers on lack of PROGRESS: a paused session with no ack for 3s has, by
// definition, a drained PTY backlog — force-resume and clear the stale counter.
setInterval(() => {
  const now = Date.now();
  for (const s of registry.values()) {
    if (s.paused && now - s.lastAck > 3000) {
      // Resume WITHOUT zeroing unacked: if the renderer is genuinely stalled
      // (GC/jank) rather than drained, the very next chunk re-crosses HIGH_WATER
      // and re-pauses immediately — a controlled trickle, never a flood. The
      // reload/gone-renderer case is handled by the port-swap reset separately.
      s.paused = false;
      s.lastAck = now;
      try { s.proc.resume(); } catch { /* PTY may be mid-exit */ }
    }
  }
}, 1000);

// ── process safety net + child cleanup ────────────────────────────────────────
// Kill every child shell when the host exits (main kills the utilityProcess on
// quit; without this the shells would be orphaned). And never let a stray throw
// take the whole host down with all its terminals.
function shutdownAll(): void {
  for (const s of registry.values()) {
    try { s.proc.kill(); } catch { /* already gone */ }
  }
}
process.on("exit", shutdownAll);
process.on("SIGTERM", () => { shutdownAll(); process.exit(0); });
process.on("uncaughtException", (e) => console.error("[pty-host] uncaughtException:", e));
process.on("unhandledRejection", (e) => console.error("[pty-host] unhandledRejection:", e));

// ── project resolution (self-contained — no main import) ──────────────────────
// Maps a session cwd to a project key for scoped mirroring. The project set is
// [home, ~/code/* non-dot dirs, decoded ~/.claude/projects/* dirs]; we return
// the deepest project root whose realpath is a prefix of cwd, else home.

let projectCache: string[] = [];
let projectCacheAt = 0;
const PROJECT_TTL = 5000;

function listProjects(): string[] {
  const now = Date.now();
  if (now - projectCacheAt < PROJECT_TTL && projectCache.length) {
    return projectCache;
  }
  const home = os.homedir();
  const roots = new Set<string>([home]);

  // ~/code/* — real, non-dot directories
  const codeDir = path.join(home, "code");
  try {
    for (const name of readdirSync(codeDir)) {
      if (name.startsWith(".")) continue;
      const p = path.join(codeDir, name);
      try {
        if (statSync(p).isDirectory()) roots.add(p);
      } catch {
        // unreadable entry — skip
      }
    }
  } catch {
    // no ~/code — skip
  }

  // ~/.claude/projects/* — dir names are slash-encoded paths ("-Users-user-foo")
  const projDir = path.join(home, ".claude", "projects");
  try {
    for (const name of readdirSync(projDir)) {
      if (name.startsWith(".")) continue;
      const decoded = name.replace(/-/g, "/");
      if (existsSync(decoded)) roots.add(decoded);
    }
  } catch {
    // no ~/.claude/projects — skip
  }

  projectCache = [...roots];
  projectCacheAt = now;
  return projectCache;
}

function realpathSafe(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    return p;
  }
}

function projectOf(cwd: string): string {
  const home = os.homedir();
  const target = realpathSafe(cwd);
  let best: string | null = null;
  for (const root of listProjects()) {
    if (root === home) continue; // home is the fallback, never the "deepest" match
    const r = realpathSafe(root);
    if (target === r || target.startsWith(r + path.sep)) {
      if (!best || r.length > best.length) best = r; // deepest (longest) prefix wins
    }
  }
  return best ?? home;
}
