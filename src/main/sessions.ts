// Dragons Alliance IDE — live session metrics (Electron main process).
//
// Ported 1:1 from claude_dash.py: reads ~/.claude/projects/<proj>/<id>.jsonl
// transcripts and derives, per session, live tokens, context capacity,
// meaningful level, understanding, freshness and an overall purpose-score (the
// headline number). Pure main-process module — node builtins only.
//
// METRIC DEFINITIONS (all grounded in real transcript signals):
//   ctx           input + cache_read + cache_creation of the LAST assistant turn
//                 (= what currently sits in the model's window).
//   out           total output tokens generated across the whole session.
//   capacity      ctx / model_window  -> how full the window is (%).
//   meaningful    total_output / ctx  -> producing real work vs merely accumulating.
//   understanding cache_read / total_input -> share of work on grounded context.
//   score         0.30*understanding + 0.30*meaningful + 0.20*freshness
//                 + 0.20*capacity_health (penalty when window >85% full).

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import type { Session } from "../shared/ipc.js";

const HOME = os.homedir();
const ROOT = path.join(HOME, ".claude", "projects");

// context window per model (tokens)
const WINDOWS: Record<string, number> = {
  "claude-opus-4-8": 1_000_000,
  "claude-opus-4-7": 1_000_000,
  "claude-opus-4-6": 200_000,
  "claude-sonnet-4-6": 1_000_000,
  "claude-sonnet-4-5": 200_000,
  "claude-haiku-4-5": 200_000,
  "claude-fable-5": 200_000,
};

function windowFor(model: string | null): number {
  if (!model) return 200_000;
  // a 1M-context beta id is base+suffix (e.g. "claude-sonnet-4-5[1m]"), which
  // would otherwise prefix-match its 200k base key — test the marker FIRST.
  if (model.includes("1m")) return 1_000_000;
  for (const [k, v] of Object.entries(WINDOWS)) {
    if (model.startsWith(k)) return v;
  }
  return 200_000;
}

/** Enumerate every projects/<proj>/<id>.jsonl transcript (two-level scan). */
function jsonlFiles(): string[] {
  const out: string[] = [];
  let projDirs: fs.Dirent[];
  try {
    projDirs = fs.readdirSync(ROOT, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const d of projDirs) {
    if (!d.isDirectory()) continue;
    const full = path.join(ROOT, d.name);
    let files: string[];
    try {
      files = fs.readdirSync(full);
    } catch {
      continue;
    }
    for (const f of files) {
      if (f.endsWith(".jsonl")) out.push(path.join(full, f));
    }
  }
  return out;
}

function parseSession(file: string, mtimeMs: number, raw: string): Session | null {
  let model: string | null = null;
  let title: string | null = null;
  let lastPrompt: string | null = null;
  let cwd: string | null = null;
  let branch: string | null = null;
  let totalOut = 0;
  let totalInAll = 0;
  let totalCacheRead = 0;
  let lastCtx = 0;
  let assistants = 0;
  let users = 0;
  let tools = 0;

  for (const rawLine of raw.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    let d: any;
    try {
      d = JSON.parse(line);
    } catch {
      continue;
    }
    const t = d.type;
    if (t === "ai-title") {
      title = d.aiTitle || title;
    } else if (t === "last-prompt") {
      lastPrompt = d.lastPrompt || lastPrompt;
    } else if (t === "user") {
      users += 1;
    } else if (t === "assistant") {
      assistants += 1;
      cwd = d.cwd || cwd;
      branch = d.gitBranch || branch;
      const msg = d.message || {};
      model = msg.model || model;
      const cont = msg.content;
      if (Array.isArray(cont)) {
        tools += cont.filter(
          (b: any) => b && typeof b === "object" && b.type === "tool_use",
        ).length;
      }
      const u = msg.usage;
      if (u) {
        const out = u.output_tokens || 0;
        const inp = u.input_tokens || 0;
        const cr = u.cache_read_input_tokens || 0;
        const cc = u.cache_creation_input_tokens || 0;
        totalOut += out;
        totalInAll += inp + cr + cc;
        totalCacheRead += cr;
        lastCtx = inp + cr + cc;
      }
    }
  }

  const win = windowFor(model);
  const capacity = win ? (lastCtx / win) * 100 : 0;
  const meaningful = Math.min(100, lastCtx ? (totalOut / lastCtx) * 100 : 0);
  const understanding = totalInAll ? (totalCacheRead / totalInAll) * 100 : 0;

  const idleMin = mtimeMs ? (Date.now() - mtimeMs) / 60000 : 9999;
  const freshness = Math.max(0, Math.min(100, (1 - idleMin / 30) * 100));
  const capHealth = capacity <= 85 ? 100 : Math.max(0, ((100 - capacity) / 15) * 100);

  const score =
    0.3 * understanding + 0.3 * meaningful + 0.2 * freshness + 0.2 * capHealth;

  return {
    id: path.basename(file).slice(0, 8),
    model: (model || "?").replaceAll("claude-", ""),
    title: title || (lastPrompt ? lastPrompt.slice(0, 48) : "") || "(untitled)",
    cwd: cwd ? path.basename(cwd) : "?",
    cwd_full: cwd || "",
    branch: branch || "",
    ctx: lastCtx,
    out: totalOut,
    win,
    capacity,
    meaningful,
    understanding,
    freshness,
    score,
    idle_min: idleMin,
    assistants,
    users,
    tools,
    mtime: mtimeMs,
  };
}

// Per-file parse cache keyed by mtime: an unchanged transcript is never re-read
// or re-parsed, so a poll over 5 active files (4 unchanged) costs ~4 async stats
// instead of reading 30MB+. Reads run async (libuv pool) — the main thread (which
// also services PTY I/O) is never blocked. This replaces the old sync collect()
// that blocked ~78ms per poll re-reading every active transcript.
const _fileCache = new Map<string, { mtimeMs: number; session: Session | null }>();

/** Parse every transcript touched within `activeMin` minutes, best score first.
 *  Async + incremental: only files whose mtime changed are re-read. */
export async function collect(activeMin: number): Promise<Session[]> {
  const files = jsonlFiles();
  const seen = new Set<string>();
  const tasks: Promise<Session | null>[] = [];

  for (const file of files) {
    seen.add(file);
    tasks.push(
      (async () => {
        let mtimeMs: number, size: number;
        try {
          const st = await fs.promises.stat(file);
          mtimeMs = st.mtimeMs;
          size = st.size;
        } catch {
          return null;
        }
        if ((Date.now() - mtimeMs) / 60000 > activeMin) return null;
        const cached = _fileCache.get(file);
        if (cached && cached.mtimeMs === mtimeMs) return cached.session;
        if (size > 32 * 1024 * 1024) return null; // don't load a pathological transcript into a JS string
        let raw: string;
        try {
          raw = await fs.promises.readFile(file, "utf8");
        } catch {
          return null;
        }
        const s = parseSession(file, mtimeMs, raw);
        _fileCache.set(file, { mtimeMs, session: s });
        return s;
      })(),
    );
  }

  const rows = (await Promise.all(tasks)).filter(
    (r): r is Session => !!r && r.assistants > 0,
  );
  // evict cache entries for transcripts that vanished
  for (const k of _fileCache.keys()) if (!seen.has(k)) _fileCache.delete(k);
  // Recompute TIME-DERIVED fields NOW (not at cache time). idle_min/freshness/
  // score depend on wall-clock; a cached idle transcript would otherwise keep
  // reporting idle_min~0 for hours, over-counting "live" and mis-sorting.
  const now = Date.now();
  for (const s of rows) {
    s.idle_min = s.mtime ? (now - s.mtime) / 60000 : 9999;
    s.freshness = Math.max(0, Math.min(100, (1 - s.idle_min / 30) * 100));
    const capHealth = s.capacity <= 85 ? 100 : Math.max(0, ((100 - s.capacity) / 15) * 100);
    s.score = 0.3 * s.understanding + 0.3 * s.meaningful + 0.2 * s.freshness + 0.2 * capHealth;
  }
  rows.sort((a, b) => b.score - a.score || a.idle_min - b.idle_min);
  return rows;
}
