// Audit trail — append-only JSONL at ~/.config/dai/audit.jsonl (0600). Every
// consequential action (terminal launches, broadcasts, credential changes,
// drive writes, vault syncs, settings/permissions edits) leaves one line.
// Reads tail the file; retention pruning runs lazily on write.
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { settingsGet } from "./settings.js";
import type { AuditEvent } from "../shared/ipc.js";

const FILE = path.join(os.homedir(), ".config", "dai", "audit.jsonl");
const MAX_READ = 512 * 1024; // tail at most 512KB — plenty for any UI view
let writesSincePrune = 0;

export function auditLog(kind: string, detail: string, actor = "operator"): void {
  const ev: AuditEvent = {
    ts: Date.now(),
    kind: String(kind).slice(0, 64),
    detail: String(detail).slice(0, 500),
    actor: String(actor).slice(0, 64),
  };
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.appendFileSync(FILE, JSON.stringify(ev) + "\n", { mode: 0o600 });
    if (++writesSincePrune >= 200) { writesSincePrune = 0; prune(); }
  } catch { /* fs error — the trail simply misses this event */ }
}

export function auditList(limit = 200): AuditEvent[] {
  let text: string;
  try {
    const size = fs.statSync(FILE).size;
    const fd = fs.openSync(FILE, "r");
    const start = Math.max(0, size - MAX_READ);
    const buf = Buffer.alloc(size - start);
    fs.readSync(fd, buf, 0, buf.length, start);
    fs.closeSync(fd);
    text = buf.toString("utf8");
  } catch { return []; }
  const out: AuditEvent[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line);
      if (typeof e.ts === "number" && typeof e.kind === "string") out.push(e);
    } catch { /* torn first line from the tail window — skip */ }
  }
  return out.slice(-Math.min(Math.max(1, limit), 1000)).reverse(); // newest first
}

/** Drop events older than the configured retention. Rewrites the file once. */
function prune(): void {
  const cutoff = Date.now() - settingsGet().auditRetentionDays * 86_400_000;
  try {
    const keep = fs.readFileSync(FILE, "utf8").split("\n").filter((line) => {
      if (!line.trim()) return false;
      try { return JSON.parse(line).ts >= cutoff; } catch { return false; }
    });
    fs.writeFileSync(FILE, keep.join("\n") + (keep.length ? "\n" : ""), { mode: 0o600 });
  } catch { /* prune is best-effort */ }
}
