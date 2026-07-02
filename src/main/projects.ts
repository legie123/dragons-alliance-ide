// Dragons Alliance IDE — project discovery & enrichment (Electron main process).
//
// Ported 1:1 from claude-dash's ide_server.py project layer: enumerate sensible
// cwd candidates (~ + ~/code subdirs + decoded claude-session dirs), detect each
// project's type, read its git state (4s-cached), resolve a cwd to its deepest
// owning project, and fuse live terminals + live claude sessions onto each
// project. Pure main-process module — node builtins only.

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const execFileP = promisify(execFile);

import type { Project, Session } from "../shared/ipc.js";
import { collect } from "./sessions.js";

const HOME = os.homedir();
const HOME_REAL = fs.realpathSync(HOME);

function isDir(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function realpathSafe(p: string): string {
  try {
    return fs.realpathSync(p);
  } catch {
    return path.resolve(p);
  }
}

// listProjects is hit by projectOf on every mirrored keystroke; cache the dir
// scan (the project set rarely changes) so it costs a Map lookup, not readdirs.
let _projCache: { ts: number; list: string[] } | null = null;

/** Reasonable cwd candidates: ~ + ~/code subdirs + recent claude-session dirs. */
export function listProjects(): string[] {
  if (_projCache && Date.now() - _projCache.ts < 5000) return _projCache.list;
  const cands = new Set<string>([HOME, path.join(HOME, "code")]);
  const code = path.join(HOME, "code");
  if (isDir(code)) {
    try {
      for (const name of fs.readdirSync(code)) {
        const p = path.join(code, name);
        if (!name.startsWith(".") && isDir(p)) cands.add(p);
      }
    } catch { /* unreadable dir (EACCES/TOCTOU) — skip */ }
  }
  const projRoot = path.join(HOME, ".claude", "projects");
  if (isDir(projRoot)) {
    try {
      for (const name of fs.readdirSync(projRoot)) {
        if (name.startsWith("-")) {
          const p = "/" + name.slice(1).replaceAll("-", "/");
          if (isDir(p)) cands.add(p);
        }
      }
    } catch { /* skip */ }
  }
  const list = [...cands].filter(isDir).sort();
  _projCache = { ts: Date.now(), list };
  return list;
}

// ---- project enrichment (cached) ----
const _PROJ_MARKERS: [string, string][] = [
  ["package.json", "node"], ["Cargo.toml", "rust"], ["go.mod", "go"],
  ["pyproject.toml", "python"], ["requirements.txt", "python"],
  ["pubspec.yaml", "flutter"], ["Gemfile", "ruby"], ["composer.json", "php"],
];

export function detectType(p: string): string {
  for (const [marker, kind] of _PROJ_MARKERS) {
    try {
      if (fs.statSync(path.join(p, marker)).isFile()) return kind;
    } catch {
      // marker missing — keep scanning
    }
  }
  return "dir";
}

type GitInfo = { branch: string | null; dirty: number; remote: string | null };
const _GIT_CACHE = new Map<string, { ts: number; info: GitInfo }>(); // path -> (ts, info)
const NO_GIT: GitInfo = { branch: null, dirty: 0, remote: null };

/** Normalize a git origin URL to its https web form, or null if not a recognizable
 *  GitHub/host URL. Handles scp-style (git@host:owner/repo.git) and https/ssh URLs. */
function toWebUrl(raw: string): string | null {
  const u = raw.trim();
  if (!u) return null;
  // scp-style: git@github.com:owner/repo(.git)
  const scp = u.match(/^[^@]+@([^:]+):(.+?)(?:\.git)?$/);
  if (scp) return `https://${scp[1]}/${scp[2]}`;
  // ssh://git@host/owner/repo(.git) or https://host/owner/repo(.git)
  const url = u.match(/^(?:ssh|git|https?):\/\/(?:[^@/]+@)?([^/]+)\/(.+?)(?:\.git)?$/);
  if (url) return `https://${url[1]}/${url[2]}`;
  return null;
}

/** Async git state (8s-cached). Skips non-repos via a cheap `.git` stat so the
 *  bulk of projects never spawn git at all (measured: 9 sync calls = 553ms; this
 *  drops it to 2 async calls that don't block the main thread). */
export async function gitInfo(p: string): Promise<GitInfo> {
  const now = Date.now();
  const hit = _GIT_CACHE.get(p);
  if (hit && now - hit.ts < 8000) return hit.info;
  // fast skip: no .git → not a repo, never spawn git
  if (!fs.existsSync(path.join(p, ".git"))) {
    _GIT_CACHE.set(p, { ts: now, info: NO_GIT });
    return NO_GIT;
  }
  const info: GitInfo = { branch: null, dirty: 0, remote: null };
  try {
    const b = await execFileP("git", ["-C", p, "rev-parse", "--abbrev-ref", "HEAD"], { timeout: 1500 });
    info.branch = b.stdout.trim();
    const s = await execFileP("git", ["-C", p, "status", "--porcelain"], { timeout: 1500 });
    info.dirty = s.stdout.split("\n").filter((l) => l.trim()).length;
    // origin remote → web URL (null if no origin configured). Own try so a
    // missing remote doesn't wipe branch/dirty already resolved above.
    try {
      const r = await execFileP("git", ["-C", p, "remote", "get-url", "origin"], { timeout: 1500 });
      info.remote = toWebUrl(r.stdout);
    } catch { /* no origin remote */ }
  } catch {
    // git unavailable / detached / timeout — leave defaults
  }
  _GIT_CACHE.set(p, { ts: now, info });
  if (_GIT_CACHE.size > 128) {
    const oldest = [..._GIT_CACHE.entries()].sort((a, b) => a[1].ts - b[1].ts).slice(0, 64);
    for (const [k] of oldest) _GIT_CACHE.delete(k);
  }
  return info;
}

/** Deepest known project root that contains cwd (else home).
 *  Pass `projects` to avoid rescanning the filesystem per call. */
export function projectOf(cwd: string, projects?: string[]): string {
  const rp = realpathSafe(cwd || HOME);
  let best = HOME_REAL;
  for (const p of projects ?? listProjects()) {
    const rpp = realpathSafe(p);
    if (rpp === HOME_REAL) continue;
    if ((rp === rpp || rp.startsWith(rpp + path.sep)) && rpp.length > best.length) {
      best = rpp;
    }
  }
  return best;
}

/** Fuse live terminals + live claude sessions onto every candidate project.
 *  Async: session collection + all git probes run off the main thread in parallel. */
export async function enrichProjects(
  terms: { id: string; cwd: string; is_master: boolean }[],
): Promise<Project[]> {
  const projs = listProjects();   // computed ONCE (cached), reused by every projectOf call
  // live terminals per project (matched by deepest owning project root)
  const termProj = new Map<string, string>();
  for (const t of terms) termProj.set(t.id, projectOf(t.cwd, projs));
  // live claude sessions per project — matched by FULL cwd containment (not
  // basename, which mis-attributes same-leaf-named projects like two "web" dirs)
  let sessions: Session[];
  try {
    sessions = await collect(240);
  } catch {
    sessions = [];
  }
  const sessProj = new Map<Session, string>();
  for (const s of sessions) {
    if (s.cwd_full) sessProj.set(s, projectOf(s.cwd_full, projs));
  }
  // git probes for every project, in parallel (each is async + .git-gated)
  const gitInfos = await Promise.all(projs.map((p) => (p !== HOME ? gitInfo(p) : Promise.resolve(NO_GIT))));

  const out: Project[] = [];
  for (let i = 0; i < projs.length; i++) {
    const p = projs[i];
    const rp = realpathSafe(p);
    const tids = terms.filter((t) => termProj.get(t.id) === rp).map((t) => t.id);
    let sess: Session | null = null;
    for (const s of sessions) {
      if (sessProj.get(s) === rp) {
        if (!sess || s.score > sess.score) sess = s;
      }
    }
    const gi = gitInfos[i];
    out.push({
      path: rp,
      name: path.basename(rp) || "~",
      type: detectType(p),
      branch: gi.branch,
      dirty: gi.dirty,
      remote: gi.remote,
      terminals: tids,
      session: sess
        ? { score: sess.score, title: sess.title, ctx: sess.ctx, model: sess.model, idle_min: sess.idle_min,
            understanding: sess.understanding, goalPct: sess.goalPct }
        : null,
    });
  }
  // sort: projects with terminals or a live session first, then by name
  out.sort((a, b) => {
    const at = a.terminals.length > 0 ? 1 : 0;
    const bt = b.terminals.length > 0 ? 1 : 0;
    if (at !== bt) return bt - at;
    const as = a.session ? 1 : 0;
    const bs = b.session ? 1 : 0;
    if (as !== bs) return bs - as;
    const an = a.name.toLowerCase();
    const bn = b.name.toLowerCase();
    return an < bn ? -1 : an > bn ? 1 : 0;
  });
  return out;
}
