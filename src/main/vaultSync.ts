// Vault sync — a real git engine over the Obsidian vault (Antigravity-Brain).
// Local-first: snapshot commits always work; push/pull engage only when a
// remote is configured. Absolute /usr/bin/git (the _lc shell wrapper breaks
// bare command names). Every result is honest — no fake success.
import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { VaultSyncStatus, VaultSyncResult } from "../shared/ipc.js";

const VAULT = path.join(os.homedir(), "Documents", "Obsidian", "Antigravity-Brain");
const GIT = "/usr/bin/git";
const STAMP = path.join(os.homedir(), ".config", "dai", "vault-sync.json");

function git(args: string[], timeoutMs = 60_000): Promise<{ ok: boolean; out: string; err: string }> {
  return new Promise((resolve) => {
    execFile(GIT, ["-C", VAULT, ...args], { timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024 },
      (error, stdout, stderr) => resolve({ ok: !error, out: String(stdout).trim(), err: String(stderr).trim() }));
  });
}

function lastSyncTs(): number | null {
  try { return JSON.parse(fs.readFileSync(STAMP, "utf8")).ts ?? null; } catch { return null; }
}
function stampSync(): void {
  try {
    fs.mkdirSync(path.dirname(STAMP), { recursive: true });
    fs.writeFileSync(STAMP, JSON.stringify({ ts: Date.now() }), { mode: 0o600 });
  } catch { /* best-effort */ }
}

export async function vaultStatus(): Promise<VaultSyncStatus> {
  const none: VaultSyncStatus = { isRepo: false, branch: null, remote: null, dirty: 0, ahead: 0, behind: 0, lastCommit: null, lastSyncTs: lastSyncTs() };
  if (!fs.existsSync(path.join(VAULT, ".git"))) return none;
  const [branch, remote, porcelain, last] = await Promise.all([
    git(["branch", "--show-current"]),
    git(["remote", "get-url", "origin"]),
    git(["status", "--porcelain"]),
    git(["log", "-1", "--format=%h %s"]),
  ]);
  let ahead = 0, behind = 0;
  if (remote.ok) {
    const ab = await git(["rev-list", "--left-right", "--count", "HEAD...@{upstream}"]);
    if (ab.ok) {
      const [a, b] = ab.out.split(/\s+/).map(Number);
      ahead = a || 0; behind = b || 0;
    }
  }
  return {
    isRepo: true,
    branch: branch.ok && branch.out ? branch.out : null,
    remote: remote.ok ? remote.out : null,
    dirty: porcelain.ok && porcelain.out ? porcelain.out.split("\n").length : 0,
    ahead, behind,
    lastCommit: last.ok ? last.out : null,
    lastSyncTs: lastSyncTs(),
  };
}

/** Snapshot-commit everything, then pull --rebase + push when origin exists. */
export async function vaultSync(message?: string): Promise<VaultSyncResult> {
  const st = await vaultStatus();
  if (!st.isRepo) return { ok: false, committed: 0, pushed: false, pulled: false, detail: "", error: "vault is not a git repository" };

  let committed = 0;
  if (st.dirty > 0) {
    const add = await git(["add", "-A"]);
    if (!add.ok) return { ok: false, committed: 0, pushed: false, pulled: false, detail: "", error: "git add failed: " + add.err.slice(0, 200) };
    const msg = (message?.trim() || "vault sync") + " · " + new Date().toISOString().slice(0, 16).replace("T", " ");
    const commit = await git(["commit", "-m", msg, "--no-gpg-sign"]);
    if (!commit.ok && !/nothing to commit/.test(commit.out + commit.err)) {
      return { ok: false, committed: 0, pushed: false, pulled: false, detail: "", error: "git commit failed: " + (commit.err || commit.out).slice(0, 200) };
    }
    committed = st.dirty;
  }

  let pushed = false, pulled = false;
  if (st.remote) {
    const pull = await git(["pull", "--rebase", "--autostash"], 120_000);
    if (!pull.ok) {
      return { ok: false, committed, pushed, pulled, detail: `committed ${committed}`, error: "git pull failed: " + pull.err.slice(0, 200) };
    }
    pulled = true;
    const push = await git(["push", "-u", "origin", "HEAD"], 120_000);
    if (!push.ok) {
      return { ok: false, committed, pushed, pulled, detail: `committed ${committed} · pulled`, error: "git push failed: " + push.err.slice(0, 200) };
    }
    pushed = true;
  }

  stampSync();
  const detail = st.remote
    ? `committed ${committed} · pulled · pushed to origin`
    : `committed ${committed} · local snapshot only (no remote configured)`;
  return { ok: true, committed, pushed, pulled, detail };
}

export async function vaultSetRemote(url: string): Promise<VaultSyncStatus> {
  const clean = String(url).trim();
  if (/^(https:\/\/|git@)[\w.@:/~-]+$/.test(clean)) {
    const has = await git(["remote", "get-url", "origin"]);
    await git(has.ok ? ["remote", "set-url", "origin", clean] : ["remote", "add", "origin", clean]);
  }
  return vaultStatus();
}
