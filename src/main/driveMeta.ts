// Drive metadata registry — the local spine that links candidates/companies/
// documents/sheets/forms/emails to Drive ids and to Neuromap nodes. Plain JSON
// at ~/.config/dai/drive-meta.json (0600, outside the repo). Best-effort Drive
// side-effects (candidate folder) happen only when signed in — honest otherwise.
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { gTreeFolder, gCreateFolder } from "./google.js";
import type { DriveMeta } from "../shared/ipc.js";

const FILE = path.join(os.homedir(), ".config", "dai", "drive-meta.json");

function load(): DriveMeta[] {
  try { return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch { return []; }
}
function save(list: DriveMeta[]): void {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(list, null, 2), { mode: 0o600 });
  } catch { /* fs error — next list() reflects reality */ }
}

export function metaList(filter?: Partial<DriveMeta>): DriveMeta[] {
  let list = load();
  if (filter) {
    list = list.filter((e) => Object.entries(filter).every(([k, v]) => v == null || (e as any)[k] === v));
  }
  return list.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 500);
}

export function metaUpsert(entry: Partial<DriveMeta> & { name: string; type: DriveMeta["type"] }): DriveMeta {
  const list = load();
  const now = Date.now();
  const existing = entry.id ? list.find((e) => e.id === entry.id) : undefined;
  if (existing) {
    Object.assign(existing, entry, { updatedAt: now });
    save(list);
    return existing;
  }
  const fresh: DriveMeta = {
    id: entry.id || crypto.randomUUID().slice(0, 12),
    type: entry.type, name: entry.name,
    source: entry.source || "ide",
    path: entry.path, googleDriveId: entry.googleDriveId, sheetId: entry.sheetId,
    formId: entry.formId, emailId: entry.emailId,
    candidateId: entry.candidateId, companyId: entry.companyId, projectId: entry.projectId,
    status: entry.status || "active",
    tags: entry.tags || [],
    createdAt: now, updatedAt: now,
    owner: entry.owner, linkedNodes: entry.linkedNodes || [],
  };
  list.push(fresh);
  save(list);
  return fresh;
}

/** Create a candidate: meta entry + (when signed in) a Drive folder under
 *  Dragons Alliance/Candidates. Folder failure is honest (no googleDriveId). */
export async function candidateCreate(name: string): Promise<DriveMeta> {
  let driveId: string | undefined;
  try {
    const parent = await gTreeFolder("Candidates");
    if (parent) {
      const folder = await gCreateFolder(name, parent);
      if (folder) driveId = folder.id;
    }
  } catch { /* signed out / API off — meta still created locally */ }
  return metaUpsert({
    type: "candidate", name, source: driveId ? "drive" : "local",
    googleDriveId: driveId, status: driveId ? "active" : "pending-drive",
    tags: ["candidate"],
  });
}
