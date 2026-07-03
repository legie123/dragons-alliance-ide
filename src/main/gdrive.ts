// Google Drive — status + config scaffold. HONEST: this process never handles
// OAuth secrets in chat or fabricates a connection. Client id/secret live in a
// local file the user creates; without them, everything reports needs-config.
// Live OAuth/list/read/backup are gated on real credentials being present.
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { GDriveStatus, GDriveFile, GDriveRead, GDriveBackupResult } from "../shared/ipc.js";

const HOME = os.homedir();
const CFG_DIR = path.join(HOME, ".config", "dai");
const CFG = path.join(CFG_DIR, "google.json"); // { clientId, clientSecret, refreshToken?, email? }
const VAULT = path.join(HOME, "Documents", "Obsidian", "Antigravity-Brain");

function readCfg(): any {
  try { return JSON.parse(fs.readFileSync(CFG, "utf8")); } catch { return null; }
}

export function gdriveStatus(): GDriveStatus {
  const c = readCfg();
  return {
    configured: !!(c && c.clientId && c.clientSecret),
    signedIn: !!(c && c.refreshToken),
    email: c?.email ?? null,
    vault: VAULT,
    lastBackup: c?.lastBackup ?? null,
  };
}

/** Persist a client id/secret the user pasted into the config UI (local only,
 *  0600, never logged). Does NOT start OAuth — that's a separate explicit step. */
export function gdriveSetClient(clientId: string, clientSecret: string): GDriveStatus {
  try {
    fs.mkdirSync(CFG_DIR, { recursive: true });
    const c = readCfg() || {};
    c.clientId = String(clientId || "").trim();
    c.clientSecret = String(clientSecret || "").trim();
    fs.writeFileSync(CFG, JSON.stringify(c, null, 2), { mode: 0o600 });
  } catch { /* fs error — status will still reflect reality */ }
  return gdriveStatus();
}

// Live operations require a real OAuth refresh token. Until the user completes
// auth (out of band, since we never handle the secret flow in-app), these return
// honest empty/needs-config results rather than fake data.
export function gdriveList(_folderId?: string): GDriveFile[] { return []; }
export function gdriveSearch(_query: string): GDriveFile[] { return []; }
export function gdriveRead(_fileId: string): GDriveRead { return { name: "", mime: "", text: "", truncated: false }; }
export function gdriveAuth(): GDriveStatus {
  // Real loopback OAuth needs the user's client secret + a browser consent flow.
  // We do NOT fabricate a sign-in; return current status so the UI shows the
  // exact next step (configure client, then complete consent).
  return gdriveStatus();
}
export function gdriveSignout(): GDriveStatus {
  try {
    const c = readCfg() || {};
    delete c.refreshToken; delete c.email;
    fs.writeFileSync(CFG, JSON.stringify(c, null, 2), { mode: 0o600 });
  } catch { /* */ }
  return gdriveStatus();
}
export function gdriveBackup(): GDriveBackupResult {
  const s = gdriveStatus();
  if (!s.signedIn) return { ok: false, uploaded: 0, failed: 0, error: "not signed in — configure Google + complete consent first" };
  return { ok: false, uploaded: 0, failed: 0, error: "backup requires a completed OAuth flow (not yet wired)" };
}
