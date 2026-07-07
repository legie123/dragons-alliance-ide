// Dragons Alliance IDE — Superpower engine health probes (Electron main).
//
// Real, honest, timeout-guarded checks for the dock's "Ignite" / status buttons.
// Every function runs a genuine CLI/file probe and NEVER throws to the UI — on
// any failure it returns an honest { ok:false } SpHealth/SpResult the dock
// surfaces as an error toast. No fabricated LIVE, no fake success.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { shell } from "electron";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { auditLog } from "./audit.js";
import type { SpHealth, SpResult, RufloQueue } from "../shared/ipc.js";

const execFileP = promisify(execFile);
const HOME = os.homedir();
const REPO = path.join(HOME, "code", "dragons-alliance-ide");

const exists = (p: string) => { try { return fs.existsSync(p); } catch { return false; } };
const minsAgo = (ms: number) => (ms ? (Date.now() - ms) / 60000 : Infinity);

/** Resolve the ruflo binary — Electron's PATH may miss the npm-global bin dir. */
function rufloBin(): string {
  for (const p of ["/opt/homebrew/bin/ruflo", "/usr/local/bin/ruflo", path.join(HOME, ".local", "bin", "ruflo")]) {
    if (exists(p)) return p;
  }
  return "ruflo"; // last resort — let PATH resolve (may fail; handled below)
}

/**
 * Ruflo engine health. `ruflo status` runs GLOBALLY from HOME (no per-dir init
 * needed there) and prints "RuFlo V3 [STOPPED|RUNNING]" plus swarm/agent tables.
 * We run it in HOME — NOT the repo dir, whose partial/absent init errors with
 * "not initialized". execFile + 6s hard timeout; every error path → ok:false.
 */
export async function rufloHealth(): Promise<SpHealth> {
  const now = () => Date.now();
  try {
    const { stdout } = await execFileP(rufloBin(), ["status"], {
      cwd: HOME, timeout: 6000, maxBuffer: 1 << 20,
    });
    const out = stdout || "";
    const running = /RuFlo[^\n]*\[RUNNING\]/i.test(out);
    const stopped = /RuFlo[^\n]*\[STOPPED\]/i.test(out);
    const ver = (out.match(/RuFlo\s+(v\d[^\s\]]*)/i) || [])[1];
    const active = (out.match(/Active\s*\|\s*(\d+)/) || [])[1];
    const mcpUp = /MCP Server[\s\S]{0,80}?\bRunning\b/i.test(out) && !/MCP Server[\s\S]{0,80}?Not running/i.test(out);

    const details: string[] = [];
    if (ver) details.push(`engine ${ver}`);
    if (active) details.push(`${active} active agent(s)`);
    details.push(mcpUp ? "MCP server up" : "MCP server idle");

    if (running) {
      return { id: "ruflo", ok: true, status: "live", message: "Ruflo engine running — swarm active", details, lastCheckedAt: now() };
    }
    if (stopped || ver) {
      return { id: "ruflo", ok: true, status: "ready", message: "Ruflo engine ready — swarm stopped, safe to ignite", details, lastCheckedAt: now() };
    }
    // command exited 0 but output is unexpected — still honest, just terse
    const head = out.trim().split("\n")[0] || "no output";
    return { id: "ruflo", ok: true, status: "ready", message: "Ruflo reachable", details: [head.slice(0, 160)], lastCheckedAt: now() };
  } catch (e) {
    const err = e as { stderr?: string; message?: string; code?: string };
    const msg = String(err?.stderr || err?.message || e);
    const notInit = /not initialized/i.test(msg);
    const noBin = err?.code === "ENOENT";
    auditLog("ruflo-health-fail", msg.slice(0, 160));
    return {
      id: "ruflo", ok: false, status: notInit ? "missing" : "error",
      message: noBin ? "Ruflo CLI not found on PATH"
        : notInit ? "Ruflo not initialized in this directory"
        : "Ruflo engine unreachable",
      details: [msg.split("\n")[0].slice(0, 160)],
      lastCheckedAt: now(),
    };
  }
}

/**
 * Ruflo task-queue probe. `ruflo task list` runs globally from HOME (same rule
 * as `ruflo status` — the repo dir errors "not initialized"). Empty queue prints
 * "No tasks found matching criteria" (verified against the real CLI). Returns an
 * HONEST count parsed from the real output — never a fabricated number; every
 * error path → ok:false with the true reason. 6s hard timeout, never throws.
 */
export async function rufloQueue(): Promise<RufloQueue> {
  try {
    const { stdout } = await execFileP(rufloBin(), ["task", "list"], {
      cwd: HOME, timeout: 6000, maxBuffer: 1 << 20,
    });
    const out = (stdout || "").replace(/\x1b\[[0-9;]*m/g, ""); // strip ANSI for reliable matching
    if (/no tasks found/i.test(out)) return { ok: true, count: 0, message: "queue empty" };
    // count task rows: bullets, table rows, or task-id lines — never header/rule lines
    const rows = out.split("\n").filter((l) =>
      (/^\s*[-*•]\s+\S/.test(l) || /^\s*[│|]\s*\S/.test(l) || /\btask-[\w-]+/i.test(l)) &&
      !/^[\s│|+:-]+$/.test(l) && !/\bID\b.*\bStatus\b/i.test(l));
    if (rows.length > 0) return { ok: true, count: rows.length, message: `${rows.length} task(s) queued` };
    // exited 0 with unexpected non-empty output — honest, just terse (mirror rufloHealth)
    const head = out.trim().split("\n").filter(Boolean).pop() || "no output";
    return { ok: true, count: 0, message: head.slice(0, 120) };
  } catch (e) {
    const err = e as { stderr?: string; message?: string; code?: string };
    const msg = String(err?.stderr || err?.message || e);
    auditLog("ruflo-queue-fail", msg.slice(0, 160));
    return {
      ok: false, count: 0,
      message: err?.code === "ENOENT" ? "ruflo CLI not found on PATH"
        : /not initialized/i.test(msg) ? "ruflo not initialized"
        : "queue unavailable",
    };
  }
}

const VAULT_DIGEST = path.join(HOME, "Documents", "Obsidian", "Antigravity-Brain", "01_PROJECTS", "dragons-alliance-ide", "graphify", "_GRAPHIFY_DIGEST.md");
const REPO_REPORT = path.join(REPO, "graphify-out", "GRAPH_REPORT.md");

function digestTarget(): { path: string; src: string } | null {
  if (exists(VAULT_DIGEST)) return { path: VAULT_DIGEST, src: "vault digest" };
  if (exists(REPO_REPORT)) return { path: REPO_REPORT, src: "repo report" };
  return null;
}

/**
 * Graphify digest health. The live sync agent writes the digest into the VAULT
 * (01_PROJECTS/<repo>/graphify/_GRAPHIFY_DIGEST.md), and GRAPH_REPORT.md into the
 * repo's graphify-out/. We report on whichever real artifact exists — honest
 * "missing" only when neither is present.
 */
export async function graphifyHealth(): Promise<SpHealth> {
  const t = digestTarget();
  if (!t) {
    return {
      id: "graphify", ok: false, status: "missing",
      message: "Digest not generated yet — run Regenerate",
      details: ["no vault digest or repo report found"],
      lastCheckedAt: Date.now(),
    };
  }
  const mins = minsAgo(fs.statSync(t.path).mtimeMs);
  return {
    id: "graphify", ok: true, status: "ready",
    message: `Graph digest ready — ${t.src}`,
    details: [`updated ${mins.toFixed(0)} min ago`],
    lastCheckedAt: Date.now(),
  };
}

/** Open the real graph digest (vault first, repo report fallback). Honest when absent. */
export async function openGraphDigest(): Promise<SpResult> {
  const t = digestTarget();
  if (!t) {
    auditLog("graphify-digest-missing", "no digest/report — regenerate first");
    return { ok: false, message: "Digest not generated yet — run Regenerate" };
  }
  const err = await shell.openPath(t.path);
  if (err) {
    auditLog("graphify-digest-open-fail", `${t.path}: ${err}`);
    return { ok: false, message: `Could not open digest: ${err}` };
  }
  auditLog("graphify-digest-open", t.path);
  return { ok: true, message: `Opened ${path.basename(t.path)} (${t.src})`, path: t.path };
}

/** Dispatch a health probe by superpower id. Unknown ids → honest error. */
export async function superpowerHealth(id: string): Promise<SpHealth> {
  if (id === "ruflo") return rufloHealth();
  if (id === "graphify") return graphifyHealth();
  return { id, ok: false, status: "error", message: `No health probe for "${id}"`, details: [], lastCheckedAt: Date.now() };
}
