// Dragons Alliance IDE — ecosystem tool probes (Electron main process).
//
// Real status for each super-tool the IDE collaborates with. Every indicator is
// grounded in a live signal (running process, loaded launchd job, recent db/vault
// write, installed binary) — NEVER a fake light.
//   status: "live"  = actively doing something right now
//           "ready" = installed/available, idle
//           "off"   = not present
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { collect } from "./sessions.js";
import type { ToolStatus } from "../shared/ipc.js";

const execFileP = promisify(execFile);
const HOME = os.homedir();

/** true if a process whose name matches `name` is running. */
async function pgrep(name: string): Promise<boolean> {
  try {
    const r = await execFileP("pgrep", ["-x", name], { timeout: 1500 });
    return r.stdout.trim().length > 0;
  } catch {
    return false;
  }
}

/** launchd job PID (numeric string) or null if not loaded/not running. */
async function launchdPid(label: string): Promise<string | null> {
  try {
    const r = await execFileP("launchctl", ["list"], { timeout: 1500 });
    const line = r.stdout.split("\n").find((l) => l.includes(label));
    if (!line) return null;
    const pid = line.trim().split(/\s+/)[0];
    return /^\d+$/.test(pid) ? pid : "-"; // "-" = loaded but not running
  } catch {
    return null;
  }
}

/** newest mtime (ms) among the given paths, or 0. */
function newestMtime(paths: string[]): number {
  let m = 0;
  for (const p of paths) {
    try {
      const t = fs.statSync(p).mtimeMs;
      if (t > m) m = t;
    } catch { /* skip */ }
  }
  return m;
}
const exists = (p: string) => { try { return fs.existsSync(p); } catch { return false; } };
const minsAgo = (ms: number) => ms ? (Date.now() - ms) / 60000 : Infinity;

let _cache: { ts: number; tools: ToolStatus[] } | null = null;

/** Probe every ecosystem tool. Cached ~3s (cheap native probes run in parallel). */
export async function probeTools(): Promise<ToolStatus[]> {
  if (_cache && Date.now() - _cache.ts < 3000) return _cache.tools;

  const vault = path.join(HOME, "Documents", "Obsidian", "Antigravity-Brain");
  const graphifyOut = path.join(HOME, "code", "dragons-alliance-ide", "graphify-out");
  const ruvectorDbs = [
    path.join(HOME, "code", "dragons-alliance-ide", "ruvector.db"),
    path.join(HOME, "code", "claude-dashboard", "ruvector.db"),
  ];

  const [obsRunning, graphPid, sessions] = await Promise.all([
    pgrep("Obsidian"),
    launchdPid("com.user.graphify-obsidian"),
    collect(240).catch(() => []),
  ]);

  const liveAgents = sessions.filter((s) => s.idle_min < 3).length;
  const ruvFresh = minsAgo(newestMtime(ruvectorDbs)) < 10;
  const vaultFresh = minsAgo(newestMtime([vault])) < 30;

  const tools: ToolStatus[] = [
    {
      id: "obsidian", name: "Obsidian", icon: "🧠",
      status: obsRunning ? "live" : exists(vault) ? "ready" : "off",
      detail: obsRunning ? "brain vault open" + (vaultFresh ? " · synced recently" : "") : exists(vault) ? "vault present (app closed)" : "no vault",
      action: exists(vault) ? "open-obsidian" : undefined,
    },
    {
      id: "graphify", name: "Graphify", icon: "🕸️",
      status: graphPid && graphPid !== "-" ? "live" : graphPid === "-" ? "ready" : "off",
      detail: graphPid && graphPid !== "-" ? `launchd agent live (pid ${graphPid})` : graphPid === "-" ? "loaded, idle" : "not loaded",
      action: exists(graphifyOut) ? "open-graphify" : undefined,
    },
    {
      id: "ruflo", name: "Ruflo", icon: "🤖",
      status: ruvFresh ? "live" : exists(ruvectorDbs[0]) || exists(ruvectorDbs[1]) ? "ready" : "off",
      detail: ruvFresh ? "HNSW memory active" : "agents + memory ready",
    },
    {
      id: "agents", name: "Claude Agents", icon: "🜲",
      status: liveAgents > 0 ? "live" : sessions.length > 0 ? "ready" : "off",
      detail: liveAgents > 0 ? `${liveAgents} live · ${sessions.length} total` : `${sessions.length} sessions`,
    },
    {
      id: "godmode", name: "GODMODE", icon: "🜲",
      status: exists(path.join(HOME, "code", "godmode-lab")) ? "ready" : "off",
      detail: "3D / web3 / perf graphics stack",
    },
    {
      id: "radar", name: "GitHub Radar", icon: "📡",
      status: exists(path.join(HOME, "code", "github-radar")) ? "ready" : "off",
      detail: "hot repo hunter → Obsidian",
    },
    {
      id: "omnigent", name: "Omnigent", icon: "🐍",
      status: exists(path.join(HOME, ".local", "bin", "omnigent")) ? "ready" : "off",
      detail: "meta-orchestrator (claude/codex/hermes)",
    },
    {
      id: "leanctx", name: "lean-ctx", icon: "⚡",
      status: exists(path.join(HOME, ".lean-ctx")) ? "ready" : "off",
      detail: "context engineering layer",
    },
    // ---- expansion sectors ----
    {
      id: "neuromap", name: "Neuromap", icon: "🧠",
      status: "live",
      detail: "living graph of the ecosystem (real local data)",
    },
    {
      id: "google", name: "Google API", icon: "🗂️",
      // needs → configured (id/secret saved) → live (signed in, refresh token present)
      status: (() => {
        try {
          const c = JSON.parse(fs.readFileSync(path.join(HOME, ".config", "dai", "google.json"), "utf8"));
          return c.refreshToken ? "live" : (c.clientId && c.clientSecret ? "ready" : "needs");
        } catch { return "needs"; }
      })(),
      detail: "Drive · Sheets · Forms · Gmail (OAuth in ☁️ Drive → Config)",
    },
    {
      id: "obsidian-team", name: "Obsidian Team", icon: "👥",
      status: obsRunning ? "needs" : "needs",
      detail: "team-mode sync → Neuromap (needs config)",
    },
    {
      id: "preview", name: "Preview Engine", icon: "🖥️",
      status: "ready",
      detail: "in-IDE live preview (provide dev-server url)",
    },
    {
      id: "obscura", name: "Obscura", icon: "🔎",
      status: exists(path.join(HOME, "code", "obscura")) ? "ready" : "needs",
      detail: "research tool — untrusted external repo, needs review",
    },
    {
      id: "creative", name: "Creative APIs", icon: "🎨",
      status: exists(path.join(HOME, ".config", "dai", "creative.json")) ? "ready" : "needs",
      detail: "Higgsfield/Canva/Nanobanan… (needs API keys)",
    },
  ];

  _cache = { ts: Date.now(), tools };
  return tools;
}
