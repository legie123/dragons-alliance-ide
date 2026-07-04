// Google Workspace layer — folders / upload / Sheets / Forms / Gmail, all raw
// REST on the SAME OAuth token gdrive.ts mints (no googleapis dep). Every call
// returns an honest empty/null when not signed in or the API isn't enabled —
// the UI gates on that, never fakes. Forms→Sheet destination CANNOT be set via
// the REST API (UI/Apps-Script only) — we expose the honest manual step instead.
import * as fs from "node:fs";
import * as path from "node:path";
import { api, gdriveStatus } from "./gdrive.js";
import type {
  GDriveFile, GTreeResult, GSheetData, GFormInfo, GFormResponse, GMailMsg, GServiceHealth,
} from "../shared/ipc.js";

const FOLDER_MIME = "application/vnd.google-apps.folder";
const SHEET_MIME = "application/vnd.google-apps.spreadsheet";

function toFile(f: any): GDriveFile {
  return {
    id: f.id, name: f.name, mimeType: f.mimeType, modifiedTime: f.modifiedTime,
    size: f.size ? Number(f.size) : undefined, iconLink: f.iconLink,
    isFolder: f.mimeType === FOLDER_MIME,
  };
}

// ---- folders ----
async function findChildFolder(name: string, parentId: string): Promise<string | null> {
  const q = encodeURIComponent(`name='${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType='${FOLDER_MIME}' and trashed=false`);
  const r = await api(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)&pageSize=1`);
  if (!r || !r.ok) return null;
  const j: any = await r.json();
  return j.files?.[0]?.id ?? null;
}

export async function gCreateFolder(name: string, parentId = "root"): Promise<GDriveFile | null> {
  const r = await api("https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,modifiedTime", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [parentId] }),
  });
  if (!r || !r.ok) return null;
  return toFile(await r.json());
}

// The Dragons Alliance operational tree (§7 of the spec).
const TREE = [
  "Companies", "Candidates", "Contracts", "Paper Forms", "Excel", "Sheets",
  "Forms", "Mail", "Proton Mail", "Projects", "Legal", "Immigration", "Recruitment",
];

/** Idempotently create "Dragons Alliance/<each subfolder>" (find-or-create). */
export async function gEnsureTree(): Promise<GTreeResult> {
  const created: string[] = [];
  const existing: string[] = [];
  // root: Dragons Alliance
  let rootId = await findChildFolder("Dragons Alliance", "root");
  if (rootId) existing.push("Dragons Alliance");
  else {
    const f = await gCreateFolder("Dragons Alliance", "root");
    if (!f) return { ok: false, created, existing, error: "not signed in or Drive API not enabled" };
    rootId = f.id; created.push("Dragons Alliance");
  }
  for (const name of TREE) {
    const found = await findChildFolder(name, rootId);
    if (found) { existing.push(name); continue; }
    const f = await gCreateFolder(name, rootId);
    if (f) created.push(name); // per-folder failure tolerated; report what happened
  }
  return { ok: true, created, existing, rootId };
}

/** Locate a subfolder of the Dragons Alliance tree by name (e.g. "Candidates"). */
export async function gTreeFolder(name: string): Promise<string | null> {
  const rootId = await findChildFolder("Dragons Alliance", "root");
  if (!rootId) return null;
  return findChildFolder(name, rootId);
}

// ---- upload (multipart; optional convert xlsx → Google Sheets) ----
export async function gUpload(localPath: string, folderId: string, convert = false): Promise<GDriveFile | null> {
  let data: Buffer;
  try { data = fs.readFileSync(localPath); } catch { return null; }
  if (data.length > 50 * 1024 * 1024) return null; // keep simple multipart sane
  const name = path.basename(localPath);
  const meta: any = { name, parents: [folderId] };
  if (convert) meta.mimeType = SHEET_MIME; // Drive converts xlsx/csv on upload
  const boundary = "daiBoundary" + Date.now().toString(36);
  const head = Buffer.from(
    `--${boundary}\r\ncontent-type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n` +
    `--${boundary}\r\ncontent-type: application/octet-stream\r\n\r\n`, "utf8");
  const tail = Buffer.from(`\r\n--${boundary}--`, "utf8");
  const body = Buffer.concat([head, data, tail]);
  const r = await api(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime,size",
    { method: "POST", headers: { "content-type": `multipart/related; boundary=${boundary}` }, body: body as any },
  );
  if (!r || !r.ok) return null;
  return toFile(await r.json());
}

// ---- sheets ----
export async function gSheetCreate(title: string, folderId?: string): Promise<GDriveFile | null> {
  const meta: any = { name: title, mimeType: SHEET_MIME };
  if (folderId) meta.parents = [folderId];
  const r = await api("https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,modifiedTime", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(meta),
  });
  if (!r || !r.ok) return null;
  return toFile(await r.json());
}

export async function gSheetRead(id: string, range = "A1:H20"): Promise<GSheetData> {
  const r = await api(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(range)}`);
  if (!r) return { id, range, values: [], error: "not signed in" };
  if (!r.ok) return { id, range, values: [], error: `Sheets API ${r.status} (enable the API in Cloud Console?)` };
  const j: any = await r.json();
  return { id, range, values: j.values ?? [] };
}

export async function gSheetUpdate(id: string, range: string, values: string[][]): Promise<{ ok: boolean }> {
  const r = await api(
    `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ values }) },
  );
  return { ok: !!r && r.ok };
}

// ---- forms ----
export async function gFormCreate(title: string): Promise<GFormInfo | null> {
  const r = await api("https://forms.googleapis.com/v1/forms", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ info: { title } }),
  });
  // honest error shape, consistent with every other google fn (never bare null)
  if (!r) return { formId: "", title, error: "not signed in or Forms API not enabled" };
  if (!r.ok) return { formId: "", title, error: `Forms API ${r.status} (enable the API in Cloud Console?)` };
  const j: any = await r.json();
  return { formId: j.formId, title: j.info?.title ?? title, responderUri: j.responderUri };
}

export async function gFormResponses(formId: string): Promise<GFormResponse[]> {
  const r = await api(`https://forms.googleapis.com/v1/forms/${formId}/responses`);
  if (!r || !r.ok) return [];
  const j: any = await r.json();
  return (j.responses ?? []).map((resp: any) => {
    const answers: Record<string, string> = {};
    for (const [qid, a] of Object.entries<any>(resp.answers ?? {})) {
      answers[qid] = (a.textAnswers?.answers ?? []).map((t: any) => t.value).join(", ");
    }
    return { responseId: resp.responseId, submittedAt: resp.lastSubmittedTime ?? "", answers };
  });
}

// ---- per-service health probe ----
// Cheap authenticated calls per API. Drive/Gmail have real "about me" endpoints;
// Sheets/Forms have no list endpoint, so we probe a known-missing id: a 404
// proves the API is enabled + the token works, a 403 means SERVICE_DISABLED.
const HEALTH_SERVICES = ["Drive", "Sheets", "Forms", "Gmail"];

export async function gHealth(): Promise<GServiceHealth[]> {
  // Skip network probes entirely when we already know why they'd fail — gives
  // a specific, actionable reason instead of a blanket "not signed in" for
  // both "never configured" and "configured but no token yet".
  const status = gdriveStatus();
  if (!status.configured) {
    return HEALTH_SERVICES.map((service) => ({
      service, ok: false, status: null,
      detail: "not configured — paste OAuth client id/secret in Credentials",
    }));
  }
  if (!status.signedIn) {
    return HEALTH_SERVICES.map((service) => ({
      service, ok: false, status: null,
      detail: "configured, not signed in — click Sign in with Google",
    }));
  }
  const probe = async (service: string, url: string, okStatuses: number[]): Promise<GServiceHealth> => {
    const r = await api(url);
    if (!r) return { service, ok: false, status: null, detail: "token refresh failed — sign in again" };
    if (okStatuses.includes(r.status)) return { service, ok: true, status: r.status, detail: "reachable · token accepted" };
    if (r.status === 403) return { service, ok: false, status: 403, detail: "API disabled or missing scope (enable in Cloud Console)" };
    if (r.status === 401) return { service, ok: false, status: 401, detail: "token rejected — sign in again" };
    return { service, ok: false, status: r.status, detail: `unexpected HTTP ${r.status}` };
  };
  return Promise.all([
    probe("Drive", "https://www.googleapis.com/drive/v3/about?fields=user", [200]),
    probe("Sheets", "https://sheets.googleapis.com/v4/spreadsheets/dai-health-probe-000", [404]),
    probe("Forms", "https://forms.googleapis.com/v1/forms/dai-health-probe-000", [404]),
    probe("Gmail", "https://gmail.googleapis.com/gmail/v1/users/me/profile", [200]),
  ]);
}

// Honest, because the REST API cannot do it:
export const FORM_TO_SHEET_NOTE =
  "Linking a Form's responses to a Sheet is not possible via the API — open the form in " +
  "Google Forms → Responses → 'Link to Sheets'. Responses are still readable here either way.";

// ---- gmail (readonly) ----
function header(payload: any, name: string): string {
  return (payload?.headers ?? []).find((h: any) => h.name?.toLowerCase() === name)?.value ?? "";
}
function collectAttachments(part: any, out: GMailMsg["attachments"]): void {
  if (!part) return;
  if (part.filename && part.body?.attachmentId) {
    out.push({ attId: part.body.attachmentId, filename: part.filename, mime: part.mimeType ?? "", size: part.body.size ?? 0 });
  }
  for (const p of part.parts ?? []) collectAttachments(p, out);
}

export async function gMailSearch(q: string): Promise<GMailMsg[]> {
  const r = await api(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(q)}&maxResults=20`);
  if (!r || !r.ok) return [];
  const j: any = await r.json();
  const out: GMailMsg[] = [];
  for (const m of (j.messages ?? []).slice(0, 20)) {
    const msg = await gMailGet(m.id);
    if (msg) out.push(msg);
  }
  return out;
}

export async function gMailGet(id: string): Promise<GMailMsg | null> {
  const r = await api(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`);
  if (!r || !r.ok) return null;
  const j: any = await r.json();
  const attachments: GMailMsg["attachments"] = [];
  collectAttachments(j.payload, attachments);
  return {
    id: j.id, threadId: j.threadId,
    from: header(j.payload, "from"), subject: header(j.payload, "subject"), date: header(j.payload, "date"),
    snippet: j.snippet ?? "", attachments,
  };
}

/** Download a Gmail attachment and re-upload it into a Drive folder. */
export async function gMailAttachmentToDrive(msgId: string, attId: string, filename: string, folderId: string): Promise<GDriveFile | null> {
  const r = await api(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}/attachments/${attId}`);
  if (!r || !r.ok) return null;
  const j: any = await r.json();
  const data = Buffer.from(String(j.data || ""), "base64url");
  if (!data.length) return null;
  const boundary = "daiAtt" + Date.now().toString(36);
  const head = Buffer.from(
    `--${boundary}\r\ncontent-type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name: filename, parents: [folderId] })}\r\n` +
    `--${boundary}\r\ncontent-type: application/octet-stream\r\n\r\n`, "utf8");
  const tail = Buffer.from(`\r\n--${boundary}--`, "utf8");
  const up = await api(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime,size",
    { method: "POST", headers: { "content-type": `multipart/related; boundary=${boundary}` }, body: Buffer.concat([head, data, tail]) as any },
  );
  if (!up || !up.ok) return null;
  return toFile(await up.json());
}
