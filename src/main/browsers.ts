// Browser detection + login-safe open (Electron main, macOS).
//
// Detection = real /Applications scan; nothing is reported installed unless the
// .app bundle exists. Opening uses the system `open -a` with an app name taken
// ONLY from the detected whitelist (no arbitrary app execution) and an http(s)
// URL. Login-safe by construction: we launch the user's own browser/profile and
// they sign in themselves — no credential access, no session hijacking.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "node:fs";
import { auditLog } from "./audit.js";
import type { BrowserInfo, BrowsersDetect, SpResult } from "../shared/ipc.js";

const execFileP = promisify(execFile);

const KNOWN: { id: string; label: string; app: string }[] = [
  { id: "chrome", label: "Google Chrome", app: "Google Chrome" },
  { id: "brave", label: "Brave", app: "Brave Browser" },
  { id: "arc", label: "Arc", app: "Arc" },
  { id: "edge", label: "Microsoft Edge", app: "Microsoft Edge" },
  { id: "firefox", label: "Firefox", app: "Firefox" },
  { id: "neo", label: "Neo", app: "Neo" },
  { id: "safari", label: "Safari", app: "Safari" },
];

const appPath = (app: string) =>
  [`/Applications/${app}.app`, `${process.env.HOME}/Applications/${app}.app`, `/System/Applications/${app}.app`]
    .find((p) => { try { return fs.existsSync(p); } catch { return false; } });

/** Real scan — installed browsers only (plus the system default, always openable). */
export async function browsersDetect(): Promise<BrowsersDetect> {
  const found: BrowserInfo[] = [];
  for (const k of KNOWN) {
    const real = appPath(k.app); // covers /Applications, ~/Applications and /System/Applications (Safari)
    if (real) found.push({ id: k.id, label: k.label, app: k.app, path: real });
  }
  found.push({ id: "default", label: "System default", app: "", path: "" }); // always real via shell open
  return { browsers: found, checkedAt: Date.now() };
}

/** Open a URL in a DETECTED browser (whitelist-only) or the system default. */
export async function browserOpen(id: string, url: string): Promise<SpResult> {
  if (!/^https?:\/\//i.test(url)) return { ok: false, message: "only http(s) URLs can be opened" };
  const det = await browsersDetect();
  const b = det.browsers.find((x) => x.id === id);
  if (!b) return { ok: false, message: `browser "${id}" not detected on this machine` };
  try {
    if (b.id === "default" || !b.app) await execFileP("open", [url]);
    else await execFileP("open", ["-a", b.app, url]);
    auditLog("browser-open", `${b.label}: ${url.slice(0, 120)}`);
    return { ok: true, message: `opened in ${b.label}` };
  } catch (e) {
    return { ok: false, message: `open failed: ${String(e).slice(0, 120)}` };
  }
}
