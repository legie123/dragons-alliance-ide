// Google Drive — REAL OAuth (loopback + PKCE) + REST, all in the main process.
// HONEST posture kept from the scaffold: we NEVER handle the secret in chat and
// never fabricate a connection. The user creates a Desktop OAuth client in Google
// Cloud and pastes id/secret into the config UI; we store it locally (0600, outside
// the repo) and run the standard installed-app loopback consent flow. Tokens never
// reach the renderer (CSP + contextIsolation) — only typed results do. No googleapis
// dep: raw REST over the Node global fetch keeps the bundle lean.
import { shell } from "electron";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as http from "node:http";
import * as crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { GDriveStatus, GDriveFile, GDriveRead, GDriveBackupResult } from "../shared/ipc.js";

const execFileP = promisify(execFile);
const HOME = os.homedir();
const CFG_DIR = path.join(HOME, ".config", "dai");
const CFG = path.join(CFG_DIR, "google.json"); // { clientId, clientSecret, refreshToken?, email?, lastBackup? }
const VAULT = path.join(HOME, "Documents", "Obsidian", "Antigravity-Brain");
const SCOPES = "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file";
const BACKUP_FOLDER = "Dragons Alliance Vault Backup";

type Cfg = { clientId?: string; clientSecret?: string; refreshToken?: string; email?: string | null; lastBackup?: number | null };

function readCfg(): Cfg { try { return JSON.parse(fs.readFileSync(CFG, "utf8")); } catch { return {}; } }
function writeCfg(c: Cfg): void {
  try { fs.mkdirSync(CFG_DIR, { recursive: true }); fs.writeFileSync(CFG, JSON.stringify(c, null, 2), { mode: 0o600 }); }
  catch { /* fs error — status still reflects reality */ }
}

export function gdriveStatus(): GDriveStatus {
  const c = readCfg();
  return {
    configured: !!(c.clientId && c.clientSecret),
    signedIn: !!c.refreshToken,
    email: c.email ?? null,
    vault: VAULT,
    lastBackup: c.lastBackup ?? null,
  };
}

export function gdriveSetClient(clientId: string, clientSecret: string): GDriveStatus {
  const c = readCfg();
  c.clientId = String(clientId || "").trim();
  c.clientSecret = String(clientSecret || "").trim();
  writeCfg(c);
  return gdriveStatus();
}

export function gdriveSignout(): GDriveStatus {
  _access = null;
  const c = readCfg();
  delete c.refreshToken; delete c.email;
  writeCfg(c);
  return gdriveStatus();
}

// ---- access token (in-memory, refreshed on demand) ----
let _access: { token: string; exp: number } | null = null;

async function accessToken(): Promise<string | null> {
  const c = readCfg();
  if (!c.clientId || !c.clientSecret || !c.refreshToken) return null;
  if (_access && Date.now() < _access.exp - 60_000) return _access.token;
  try {
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: c.clientId, client_secret: c.clientSecret, refresh_token: c.refreshToken, grant_type: "refresh_token" }),
    });
    if (!r.ok) return null;
    const j: any = await r.json();
    _access = { token: j.access_token, exp: Date.now() + (j.expires_in ?? 3600) * 1000 };
    return _access.token;
  } catch { return null; }
}

async function api(url: string, init?: RequestInit): Promise<Response | null> {
  const tok = await accessToken();
  if (!tok) return null;
  try { return await fetch(url, { ...init, headers: { ...(init?.headers || {}), authorization: `Bearer ${tok}` } }); }
  catch { return null; }
}

// ---- loopback OAuth (installed-app + PKCE) ----
const b64url = (b: Buffer) => b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function gdriveAuth(): Promise<GDriveStatus> {
  const c = readCfg();
  if (!c.clientId || !c.clientSecret) return gdriveStatus(); // UI shows "configure client first"

  const verifier = b64url(crypto.randomBytes(48));
  const challenge = b64url(crypto.createHash("sha256").update(verifier).digest());

  // capture code + the exact redirect_uri (port) we advertised
  const got = await new Promise<{ code: string; redirect: string }>((resolve) => {
    const server = http.createServer((req, res) => {
      const u = new URL(req.url || "/", "http://127.0.0.1");
      const code = u.searchParams.get("code") || "";
      res.writeHead(200, { "content-type": "text/html" });
      res.end("<html><body style='font-family:sans-serif;background:#0a0608;color:#f0e6e6;text-align:center;padding-top:20vh'><h2>🜲 Connected to Google Drive</h2><p>You can close this tab and return to Dragons Alliance IDE.</p></body></html>");
      const redirect = (server as any)._redirect as string;
      server.close();
      resolve({ code, redirect });
    });
    server.listen(0, "127.0.0.1", () => {
      const port = (server.address() as any).port;
      const redirect = `http://127.0.0.1:${port}`;
      (server as any)._redirect = redirect;
      const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      auth.searchParams.set("client_id", c.clientId!);
      auth.searchParams.set("redirect_uri", redirect);
      auth.searchParams.set("response_type", "code");
      auth.searchParams.set("scope", SCOPES);
      auth.searchParams.set("code_challenge", challenge);
      auth.searchParams.set("code_challenge_method", "S256");
      auth.searchParams.set("access_type", "offline");
      auth.searchParams.set("prompt", "consent");
      shell.openExternal(auth.href);
    });
    setTimeout(() => { try { server.close(); } catch { /* closed */ } resolve({ code: "", redirect: "" }); }, 180_000);
  });

  if (!got.code) return gdriveStatus();
  try {
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: c.clientId, client_secret: c.clientSecret, code: got.code,
        code_verifier: verifier, grant_type: "authorization_code", redirect_uri: got.redirect,
      }),
    });
    if (r.ok) {
      const j: any = await r.json();
      if (j.refresh_token) {
        c.refreshToken = j.refresh_token;
        _access = { token: j.access_token, exp: Date.now() + (j.expires_in ?? 3600) * 1000 };
        // fetch the account email (any drive scope grants about.user)
        try {
          const who = await api("https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)");
          if (who && who.ok) { const w: any = await who.json(); c.email = w.user?.emailAddress ?? null; }
        } catch { /* email is optional */ }
        writeCfg(c);
      }
    }
  } catch { /* exchange failed — stay signed out */ }
  return gdriveStatus();
}

// ---- list / search / read ----
function toFile(f: any): GDriveFile {
  return {
    id: f.id, name: f.name, mimeType: f.mimeType, modifiedTime: f.modifiedTime,
    size: f.size ? Number(f.size) : undefined, iconLink: f.iconLink,
    isFolder: f.mimeType === "application/vnd.google-apps.folder",
  };
}
const FIELDS = "files(id,name,mimeType,modifiedTime,size,iconLink)";

export async function gdriveList(folderId?: string): Promise<GDriveFile[]> {
  const q = encodeURIComponent(`'${folderId || "root"}' in parents and trashed=false`);
  const r = await api(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=${encodeURIComponent(FIELDS)}&pageSize=200&orderBy=folder,name`);
  if (!r || !r.ok) return [];
  const j: any = await r.json();
  return (j.files || []).map(toFile);
}

export async function gdriveSearch(query: string): Promise<GDriveFile[]> {
  const q = encodeURIComponent(`name contains '${String(query).replace(/'/g, "\\'")}' and trashed=false`);
  const r = await api(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=${encodeURIComponent(FIELDS)}&pageSize=100`);
  if (!r || !r.ok) return [];
  const j: any = await r.json();
  return (j.files || []).map(toFile);
}

export async function gdriveRead(fileId: string): Promise<GDriveRead> {
  const meta = await api(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType`);
  if (!meta || !meta.ok) return { name: "", mime: "", text: "(sign in to Google Drive to read files)", truncated: false };
  const m: any = await meta.json();
  const url = String(m.mimeType).startsWith("application/vnd.google-apps")
    ? `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`
    : `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const r = await api(url);
  if (!r || !r.ok) return { name: m.name, mime: m.mimeType, text: "(binary or unreadable)", truncated: false };
  const full = await r.text();
  const cap = 200_000;
  return { name: m.name, mime: m.mimeType, text: full.slice(0, cap), truncated: full.length > cap };
}

// ---- backup: tar the vault → upload one snapshot to the backup folder ----
async function ensureBackupFolder(): Promise<string | null> {
  const q = encodeURIComponent(`name='${BACKUP_FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const found = await api(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`);
  if (found && found.ok) { const j: any = await found.json(); if (j.files?.[0]) return j.files[0].id; }
  const r = await api("https://www.googleapis.com/drive/v3/files", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: BACKUP_FOLDER, mimeType: "application/vnd.google-apps.folder" }),
  });
  if (!r || !r.ok) return null;
  const j: any = await r.json();
  return j.id ?? null;
}

export async function gdriveBackup(): Promise<GDriveBackupResult> {
  if (!(await accessToken())) return { ok: false, uploaded: 0, failed: 0, error: "not signed in — configure Google + complete consent first" };
  if (!fs.existsSync(VAULT)) return { ok: false, uploaded: 0, failed: 0, error: "vault not found" };

  const folderId = await ensureBackupFolder();
  if (!folderId) return { ok: false, uploaded: 0, failed: 0, error: "could not create backup folder" };

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const tgz = path.join(os.tmpdir(), `da-vault-${stamp}.tgz`);
  try {
    await execFileP("tar", [
      "--exclude=.git", "--exclude=.obsidian", "--exclude=.trash", "--exclude=_tools",
      "-czf", tgz, "-C", path.dirname(VAULT), path.basename(VAULT),
    ], { timeout: 120_000, maxBuffer: 1 << 20 });
  } catch (e: any) {
    return { ok: false, uploaded: 0, failed: 1, error: "tar failed: " + (e?.message || e) };
  }

  try {
    const data = fs.readFileSync(tgz);
    const boundary = "dai" + crypto.randomBytes(8).toString("hex");
    const meta = JSON.stringify({ name: `vault-${stamp}.tgz`, parents: [folderId] });
    const pre = `--${boundary}\r\ncontent-type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\ncontent-type: application/gzip\r\n\r\n`;
    const post = `\r\n--${boundary}--`;
    const payload = Buffer.concat([Buffer.from(pre, "utf-8"), data, Buffer.from(post, "utf-8")]);
    const r = await api("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST", headers: { "content-type": `multipart/related; boundary=${boundary}` }, body: payload,
    });
    try { fs.unlinkSync(tgz); } catch { /* already gone */ }
    if (!r || !r.ok) return { ok: false, uploaded: 0, failed: 1, error: "upload failed (" + (r?.status ?? "no token") + ")" };
    const c = readCfg(); c.lastBackup = Date.now(); writeCfg(c);
    return { ok: true, folderId, uploaded: 1, failed: 0 };
  } catch (e: any) {
    try { fs.unlinkSync(tgz); } catch { /* already gone */ }
    return { ok: false, uploaded: 0, failed: 1, error: e?.message || String(e) };
  }
}
