// Proton Mail — honest Bridge integration scaffold. Proton has NO public API;
// the official path is Proton Mail Bridge (paid plan) which exposes local IMAP
// on 127.0.0.1. We store host/port/user locally (never the password — that
// lives in the Bridge app) and report a REAL TCP probe of the Bridge port.
import * as fs from "node:fs";
import * as os from "node:os";
import * as net from "node:net";
import * as path from "node:path";
import type { ProtonStatus } from "../shared/ipc.js";

const CFG = path.join(os.homedir(), ".config", "dai", "proton.json");
const DEFAULTS = { host: "127.0.0.1", port: 1143 };

type Cfg = { host?: string; port?: number; user?: string };
function readCfg(): Cfg { try { return JSON.parse(fs.readFileSync(CFG, "utf8")); } catch { return {}; } }

function probe(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const s = net.connect({ host, port, timeout: 1200 });
    s.once("connect", () => { s.destroy(); resolve(true); });
    s.once("error", () => resolve(false));
    s.once("timeout", () => { s.destroy(); resolve(false); });
  });
}

export async function protonStatus(): Promise<ProtonStatus> {
  const c = readCfg();
  const host = c.host || DEFAULTS.host;
  const port = c.port || DEFAULTS.port;
  const configured = !!c.user;
  const bridgeUp = await probe(host, port);
  return {
    configured, bridgeUp, host, port, user: c.user ?? null,
    hint: bridgeUp
      ? (configured ? "Bridge reachable — IMAP import lands in a future pass" : "Bridge is running — save your Bridge username to finish config")
      : "Proton Mail Bridge not detected. Install + run Proton Mail Bridge (paid Proton plan), then retry.",
  };
}

export async function protonSetConfig(host: string, port: number, user: string): Promise<ProtonStatus> {
  try {
    fs.mkdirSync(path.dirname(CFG), { recursive: true });
    fs.writeFileSync(CFG, JSON.stringify({ host: host || DEFAULTS.host, port: port || DEFAULTS.port, user: user.trim() }, null, 2), { mode: 0o600 });
  } catch { /* status reflects reality */ }
  return protonStatus();
}
