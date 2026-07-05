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

  // IGNITE grammar — every chip fires its superpower (executed by EcosystemBar):
  //   view:<name>            → jump to that command deck
  //   term:<cmd>@<abs cwd>   → deploy a terminal (shell|claude) in cwd
  //   arm:<typed cmd>@<cwd>  → deploy a shell + pre-type the command (user presses ⏎)
  //   shell:<id>             → main-process action (open-obsidian / open-graphify)
  //   vault:                 → open the Keys credentials vault
  const codeDir = (p: string) => path.join(HOME, "code", p);
  const tools: ToolStatus[] = [
    {
      id: "obsidian", name: "Obsidian", icon: "🧠",
      status: (() => {
        const lockPath = path.join(vault, ".lock");
        const lockExists = exists(lockPath);
        if (lockExists) return "live"; // vault is open
        if (obsRunning) return "ready"; // Obsidian running but vault not open? we can't tell, assume ready
        if (exists(vault)) return "ready";
        return "off";
      })(),
      detail: (() => {
        const lockPath = path.join(vault, ".lock");
        if (exists(lockPath)) {
          return "vault open in Obsidian" + (vaultFresh ? " · synced recently" : "");
        }
        if (obsRunning) {
          return "Obsidian running" + (exists(vault) ? " · vault closed" : " · no vault");
        }
        if (exists(vault)) {
          return "vault present" + (vaultFresh ? " · synced recently" : "") + " (app closed)";
        }
        return "no vault";
      })(),
      action: exists(vault) ? "shell:open-obsidian" : undefined,
    },
    {
      id: "graphify", name: "Graphify", icon: "🕸️",
      status: (() => {
        const digestPath = path.join(graphifyOut, "_GRAPHIFY_DIGEST.md");
        const digestExists = exists(digestPath);
        const digestRecent = digestExists && (minsAgo(fs.statSync(digestPath).mtimeMs) < 30);
        let agentRunning = false;
        if (graphPid !== null && graphPid !== "-") {
          agentRunning = true;
        }
        if (agentRunning) {
          return digestRecent ? "live" : "ready";
        }
        if (digestExists) return "ready";
        return "off";
      })(),
      detail: (() => {
        let parts = [];
        if (graphPid === "-") {
          parts.push("loaded, idle");
        } else if (graphPid !== null && graphPid !== "-") {
          parts.push(`live (pid ${graphPid})`);
        } else {
          parts.push("not loaded");
        }
        const digestPath = path.join(graphifyOut, "_GRAPHIFY_DIGEST.md");
        if (exists(digestPath)) {
          const mtime = fs.statSync(digestPath).mtimeMs;
          const mins = minsAgo(mtime);
          parts.push(`digest updated ${mins.toFixed(1)} min ago`);
        } else {
          parts.push("no digest");
        }
        return parts.join(" · ");
      })(),
      action: exists(graphifyOut) ? "shell:open-graphify" : undefined,
    },
    {
      id: "ruflo", name: "Ruflo", icon: "🤖",
      status: (() => {
        if (ruvFresh) return "live";
        if (exists(ruvectorDbs[0]) || exists(ruvectorDbs[1])) return "ready";
        return "off";
      })(),
      detail: (() => {
        if (ruvFresh) {
          return `Ruflo active (DB updated ${minsAgo(newestMtime(ruvectorDbs)).toFixed(1)} min ago)`;
        }
        if (exists(ruvectorDbs[0]) || exists(ruvectorDbs[1])) {
          return "Ruflo DB present — click to ignite";
        }
        return "Ruflo not installed";
      })(),
      action: `arm:ruflo status@${HOME}`,
    },
    {
      id: "agents", name: "Claude Agents", icon: "🜲",
      status: liveAgents > 0 ? "live" : sessions.length > 0 ? "ready" : "off",
      detail: liveAgents > 0 ? `${liveAgents} live · ${sessions.length} total — open mission control` : `${sessions.length} sessions — open mission control`,
      action: "view:agents",
    },
    {
      id: "godmode", name: "GODMODE", icon: "🜲",
      status: (() => {
        const godmodeLab = path.join(HOME, "code", "godmode-lab");
        if (!exists(godmodeLab)) return "off";
        const activeInGodmode = sessions.some(s => s.idle_min < 3 && s.cwd && s.cwd.startsWith(godmodeLab));
        if (activeInGodmode) return "live";
        return "ready";
      })(),
      detail: (() => {
        const godmodeLab = path.join(HOME, "code", "godmode-lab");
        if (!exists(godmodeLab)) return "no godmode-lab";
        const activeInGodmode = sessions.some(s => s.idle_min < 3 && s.cwd && s.cwd.startsWith(godmodeLab));
        if (activeInGodmode) {
          const count = sessions.filter(s => s.idle_min < 3 && s.cwd && s.cwd.startsWith(godmodeLab)).length;
          return `${count} active session(s) in godmode-lab`;
        }
        return "3D / web3 / perf stack — click: claude in godmode-lab";
      })(),
      action: exists(path.join(HOME, "code", "godmode-lab")) ? `term:claude@${path.join(HOME, "code", "godmode-lab")}` : undefined,
    },
    {
      id: "radar", name: "GitHub Radar", icon: "📡",
      status: exists(codeDir("github-radar")) ? "ready" : "off",
      detail: "hot repo hunter — click: scan + open",
      action: exists(codeDir("github-radar")) ? "view:radar" : undefined,
    },
    {
      id: "omnigent", name: "Omnigent", icon: "🐍",
      status: exists(path.join(HOME, ".local", "bin", "omnigent")) ? "ready" : "off",
      detail: "meta-orchestrator — click to ignite",
      action: exists(path.join(HOME, ".local", "bin", "omnigent")) ? `arm:omnigent@${HOME}` : undefined,
    },
    {
      id: "leanctx", name: "lean-ctx", icon: "⚡",
      status: exists(path.join(HOME, ".lean-ctx")) ? "ready" : "off",
      detail: "context engineering — click to ignite",
      action: exists(path.join(HOME, ".lean-ctx")) ? `arm:lean-ctx stats@${HOME}` : undefined,
    },
    // ---- expansion sectors ----
    {
      id: "neuromap", name: "Neuromap", icon: "🧠",
      status: "live",
      detail: "living graph of the ecosystem — open the map",
      action: "view:neuromap",
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
      detail: "Drive · Sheets · Forms · Gmail — click: credentials",
      action: "vault:",
    },
    {
      id: "obsidian-team", name: "Obsidian Team", icon: "👥",
      status: "needs",
      detail: "team-mode sync — open Neuromap shared lens",
      action: "view:neuromap",
    },
    {
      id: "preview", name: "Preview Engine", icon: "🖥️",
      status: "ready",
      detail: "in-IDE live preview — open",
      action: "view:preview",
    },
    {
      id: "obscura", name: "Obscura", icon: "🔎",
      status: exists(codeDir("obscura")) ? "ready" : "needs",
      detail: "research desk — open",
      action: "view:research",
    },
    {
      id: "creative", name: "Creative APIs", icon: "🎨",
      status: exists(path.join(HOME, ".config", "dai", "creative.json")) ? "ready" : "needs",
      detail: "generation studio — open",
      action: "view:creative",
    },
  ];

  _cache = { ts: Date.now(), tools };
  return tools;
}
