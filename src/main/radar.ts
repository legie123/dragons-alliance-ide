// GitHub Radar — reads the standalone radar tool's last-run.json and exposes it
// to the renderer. The scanner itself lives at ~/code/github-radar/radar.mjs and
// writes last-run.json next to it; we only read that file + trigger a rescan.
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { RadarStatus, RadarSection, RepoItem } from "../shared/ipc";

const RADAR_DIR = path.join(os.homedir(), "code", "github-radar");
const LAST_RUN = path.join(RADAR_DIR, "last-run.json");
const RADAR_SCRIPT = path.join(RADAR_DIR, "radar.mjs");
const NODE_BIN = "/opt/homebrew/opt/node@22/bin/node";

const EMPTY: RadarStatus = { available: false, sections: [], scannedAt: "", mode: "", total: 0, fresh: 0 };

function toRepo(r: any): RepoItem {
  return {
    full_name: r.full_name,
    url: r.url,
    stars: r.stars,
    lang: r.lang ?? null,
    desc: r.desc ?? "",
    topics: Array.isArray(r.topics) ? r.topics : [],
    pushed: r.pushed,
  };
}

export function radarStatus(): RadarStatus {
  try {
    const json = JSON.parse(fs.readFileSync(LAST_RUN, "utf-8"));
    const byLens = json.byLens ?? {};
    const sections: RadarSection[] = Object.keys(byLens).map((lens) => ({
      lens,
      repos: (byLens[lens] as any[]).map(toRepo),
    }));
    return {
      scannedAt: json.today ?? "",
      mode: json.mode ?? "",
      total: json.total ?? 0,
      fresh: json.fresh ?? 0,
      sections,
      available: true,
    };
  } catch {
    return EMPTY;
  }
}

export function refreshRadar(): void {
  if (!fs.existsSync(RADAR_SCRIPT)) return; // no scanner → nothing to run
  const hasNode = fs.existsSync(NODE_BIN);
  const bin = hasNode ? NODE_BIN : process.execPath;
  // When falling back to process.execPath in a packaged app, that's the Electron
  // binary — force it to behave as node, else it would try to open a 2nd app
  // instance instead of running radar.mjs.
  const env = hasNode ? process.env : { ...process.env, ELECTRON_RUN_AS_NODE: "1" };
  try {
    spawn(bin, [RADAR_SCRIPT], { cwd: RADAR_DIR, detached: true, stdio: "ignore", env }).unref();
  } catch {
    /* spawn failed — ignore, next status() stays available with cached json */
  }
}
