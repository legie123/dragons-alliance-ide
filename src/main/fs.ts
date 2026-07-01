// Dragons Alliance IDE — filesystem service (Electron main process).
//
// Ported 1:1 from claude-dash's ide_server.py fs layer: a home-confined file
// browser/reader/writer that blocks ../ + symlink escapes and never exposes
// well-known secret stores (defense in depth). Pure main-process module — node
// builtins only, no electron imports.

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import type { FsList, FsEntry } from "../shared/ipc.js";

export const HOME = os.homedir();
export const HOME_REAL = fs.realpathSync(HOME);

// secret-bearing locations never exposed through the fs API (defense in depth)
const _FS_DENY_DIRS = [
  ".ssh", ".aws", ".gnupg", ".config/gh", ".config/gcloud", ".config/git",
  ".config/rclone", ".config/op", ".kube", ".docker", ".terraform.d", ".password-store",
].map((d) => path.join(HOME_REAL, d));
const _FS_DENY_NAMES = new Set([
  ".git-credentials", ".netrc", ".npmrc", ".pypirc", ".pgpass", ".my.cnf",
]);
// secret-bearing filename patterns (env variants, private keys)
const _FS_DENY_PATTERNS: RegExp[] = [
  /^\.env(\..+)?$/,           // .env, .env.local, .env.production, .env.*.local
  /\.(pem|key)$/i,            // private keys / certs
  /^id_(rsa|dsa|ecdsa|ed25519)$/, // ssh private keys anywhere
];

/**
 * Resolve `p` and confine it to the home subtree (blocks ../ + symlink escapes),
 * excluding well-known secret stores. Returns the real path, or null if denied.
 *
 * A path that doesn't exist yet (e.g. a write target) is resolved through its
 * real parent dir so symlink escapes are still blocked before the file is born.
 */
export function safePath(p: string): string | null {
  if (!p) return null;
  const target = path.isAbsolute(p) ? p : path.join(HOME_REAL, p);
  let rp: string;
  try {
    rp = fs.realpathSync(target);
  } catch {
    try {
      rp = path.join(fs.realpathSync(path.dirname(target)), path.basename(target));
    } catch {
      rp = path.resolve(target);
    }
  }
  if (!(rp === HOME_REAL || rp.startsWith(HOME_REAL + path.sep))) return null;
  const base = path.basename(rp);
  if (_FS_DENY_NAMES.has(base)) return null;
  if (_FS_DENY_PATTERNS.some((re) => re.test(base))) return null;
  for (const d of _FS_DENY_DIRS) {
    if (rp === d || rp.startsWith(d + path.sep)) return null;
  }
  return rp;
}

/** Directory listing: dirs first then files (case-insensitive), parent if safe.
 *  Confinement + secret denylist are enforced HERE, never trusting the caller. */
export function fsList(p: string): FsList {
  const sp = safePath(p);
  if (!sp) throw new Error("path denied");
  const entries: FsEntry[] = [];
  for (const name of fs.readdirSync(sp)) {
    const fp = path.join(sp, name);
    if (!safePath(fp)) continue;        // omit secret stores / escaped entries
    let isdir = false;
    try {
      isdir = fs.statSync(fp).isDirectory();
    } catch {
      isdir = false;
    }
    let size = 0;
    if (!isdir) {
      try {
        size = fs.statSync(fp).size;
      } catch {
        size = 0;
      }
    }
    entries.push({
      name,
      path: fp,
      type: isdir ? "dir" : "file",
      hidden: name.startsWith("."),
      size,
    });
  }
  entries.sort((a, b) => {
    if ((a.type !== "dir") !== (b.type !== "dir")) return a.type === "dir" ? -1 : 1;
    const an = a.name.toLowerCase();
    const bn = b.name.toLowerCase();
    return an < bn ? -1 : an > bn ? 1 : 0;
  });
  const parentRaw = path.dirname(sp);
  const parent = safePath(parentRaw) ? parentRaw : null;
  return { path: sp, parent, entries };
}

/** Read a text file as utf8. Throws on denied path, >4MB, or binary (NUL in first 8KB). */
export function fsRead(p: string): string {
  const sp = safePath(p);
  if (!sp) throw new Error("path denied");
  if (fs.statSync(sp).size > 4 * 1024 * 1024) throw new Error("file too large (>4MB)");
  const raw = fs.readFileSync(sp);
  if (raw.subarray(0, 8192).includes(0)) throw new Error("binary");
  return raw.toString("utf8");
}

// dirs never descended into during a project file walk (noise / huge / vcs)
const _WALK_SKIP = new Set([
  "node_modules", ".git", "dist", "build", "out", ".next", ".turbo", ".cache",
  "target", ".venv", "venv", "__pycache__", ".DS_Store", "release", ".gradle",
  "Library", ".Trash", "vendor", ".pnpm-store", "coverage",
]);

/** Flat, capped list of files under `root` (relative paths) for fuzzy open.
 *  Skips heavy/noise dirs and anything the denylist blocks. */
export function fsWalk(root: string, limit = 6000): { root: string; files: string[] } {
  const base = safePath(root);
  if (!base || !fs.existsSync(base) || !fs.statSync(base).isDirectory()) {
    return { root: base || root, files: [] };
  }
  const files: string[] = [];
  const stack: string[] = [base];
  while (stack.length && files.length < limit) {
    const dir = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (files.length >= limit) break;
      if (_WALK_SKIP.has(e.name)) continue;
      const fp = path.join(dir, e.name);
      if (e.isDirectory()) {
        stack.push(fp);
      } else if (e.isFile()) {
        if (safePath(fp)) files.push(path.relative(base, fp));
      }
    }
  }
  return { root: base, files };
}

/** Write a text file as utf8. Throws on denied path or missing parent directory. */
export function fsWrite(p: string, content: string): void {
  const sp = safePath(p);
  if (!sp) throw new Error("path denied");
  if (!fs.existsSync(path.dirname(sp))) throw new Error("parent missing");
  fs.writeFileSync(sp, content, "utf8");
}
