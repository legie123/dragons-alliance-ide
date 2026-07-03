// Dragons Alliance IDE — Neo browser bridge (Preview view).
// Drives the real Neo browser (ai.browser.Neo) via the tested ~/code/neo-agent CDP
// tooling. We shell out to `neo-ctl.mjs` in system Node 22 (Electron's bundled Node
// lacks a stable global WebSocket) — no CDP client duplicated here. `neo-debug`
// (re)launches Neo with the remote-debugging port when it's down.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { NeoStatus, NeoTab, NeoSnap } from "../shared/ipc";

const execFileP = promisify(execFile);
const NEO_DIR = path.join(os.homedir(), "code", "neo-agent");
const CTL = path.join(NEO_DIR, "neo-ctl.mjs");
const DEBUG = path.join(NEO_DIR, "neo-debug");

// GUI apps inherit a minimal PATH, so resolve a real node binary explicitly.
function resolveNode(): string {
  const cands = [
    process.env.NEO_NODE,
    "/opt/homebrew/opt/node@22/bin/node",
    "/opt/homebrew/bin/node",
    "/usr/local/bin/node",
    "/usr/bin/node",
  ].filter(Boolean) as string[];
  for (const c of cands) if (existsSync(c)) return c;
  return "node";
}
const NODE = resolveNode();

let current: string | undefined; // targetId of the Neo tab the Preview drives

async function ctl(args: string[], timeout = 15000): Promise<string> {
  const { stdout } = await execFileP(NODE, [CTL, ...args], { timeout, maxBuffer: 16 * 1024 * 1024 });
  return stdout.trim();
}
async function ctlJson<T>(args: string[], timeout?: number): Promise<T> {
  return JSON.parse(await ctl(args, timeout)) as T;
}

export async function neoStatus(): Promise<NeoStatus> {
  try {
    const v = await ctlJson<{ Browser?: string }>(["status"], 4000);
    return { connected: true, browser: v.Browser };
  } catch (e: unknown) {
    return { connected: false, error: String((e as Error)?.message || e).slice(0, 200) };
  }
}

export async function neoEnsure(): Promise<NeoStatus> {
  try {
    await execFileP("/bin/bash", [DEBUG], { timeout: 30000 });
  } catch { /* neo-debug WARNs on failure; the status check below is the source of truth */ }
  return neoStatus();
}

export async function neoTabs(): Promise<NeoTab[]> {
  try { return await ctlJson<NeoTab[]>(["tabs"], 5000); } catch { return []; }
}

export async function neoOpen(url: string): Promise<{ targetId: string }> {
  const r = await ctlJson<{ targetId: string }>(["open", url], 15000);
  current = r.targetId;
  return { targetId: r.targetId };
}

export async function neoNavigate(url: string, tab?: string): Promise<void> {
  const t = tab || current || "";
  await ctl(["nav", url, t]);
  if (t) current = t;
}

export async function neoReload(tab?: string): Promise<void> { await ctl(["reload", tab || current || ""]); }
export async function neoBack(tab?: string): Promise<void> { await ctl(["back", tab || current || ""]); }
export async function neoForward(tab?: string): Promise<void> { await ctl(["forward", tab || current || ""]); }

export async function neoAsk(prompt: string, submit = true): Promise<{ tab: string; composer: string; submitted: boolean }> {
  return ctlJson(["ask", prompt, submit ? "true" : "false"], 20000);
}

export async function neoClick(x: number, y: number, tab?: string): Promise<void> {
  await ctl(["clickxy", String(Math.round(x)), String(Math.round(y)), tab || current || ""]);
}

export async function neoScroll(dy: number, tab?: string): Promise<void> {
  await ctl(["scroll", String(Math.round(dy)), tab || current || ""]);
}

export async function neoSnap(tab?: string): Promise<NeoSnap | null> {
  const t = tab || current || "";
  const j = await ctlJson<{ path: string; vw: number; vh: number; url: string; title: string }>(["snap", t], 15000);
  const buf = await readFile(j.path);
  return {
    dataUrl: "data:image/png;base64," + buf.toString("base64"),
    vw: j.vw, vh: j.vh, url: j.url, title: j.title, targetId: t,
  };
}
