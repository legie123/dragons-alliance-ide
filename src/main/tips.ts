// Library tips — local smart-tricks notes, admin-editable. Plain JSON at
// ~/.config/dai/tips.json (0600, outside the repo). Same idiom as driveMeta.ts
// and permissions.ts.
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as crypto from "node:crypto";
import type { TipEntry } from "../shared/ipc.js";

const FILE = path.join(os.homedir(), ".config", "dai", "tips.json");

function load(): TipEntry[] {
  try { return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch { return []; }
}
function save(list: TipEntry[]): void {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(list, null, 2), { mode: 0o600 });
  } catch { /* fs error — next list() reflects reality */ }
}

export function tipsList(): TipEntry[] {
  return load().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function tipsUpsert(entry: Partial<TipEntry> & { title: string; body: string }): TipEntry {
  const list = load();
  const now = Date.now();
  const existing = entry.id ? list.find((t) => t.id === entry.id) : undefined;
  if (existing) {
    existing.title = entry.title;
    existing.body = entry.body;
    existing.category = entry.category;
    existing.updatedAt = now;
    save(list);
    return existing;
  }
  const fresh: TipEntry = {
    id: entry.id || crypto.randomUUID().slice(0, 12),
    title: entry.title,
    body: entry.body,
    category: entry.category,
    createdAt: now,
    updatedAt: now,
  };
  list.push(fresh);
  save(list);
  return fresh;
}

export function tipsDelete(id: string): boolean {
  const list = load();
  const next = list.filter((t) => t.id !== id);
  const changed = next.length !== list.length;
  if (changed) save(next);
  return changed;
}
