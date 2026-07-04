// IDE settings — plain JSON at ~/.config/dai/settings.json (0600, outside the
// repo). Unknown keys are dropped on save; missing keys fall back to defaults,
// so an old/hand-edited file can never break the app.
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { DaiSettings } from "../shared/ipc.js";

const FILE = path.join(os.homedir(), ".config", "dai", "settings.json");

export const DEFAULTS: DaiSettings = {
  terminalFontSize: 13,
  sessionsActiveMin: 240,
  radarAutoRefresh: true,
  auditRetentionDays: 30,
  vaultAutoSyncMin: 0,
  defaultCwd: "~",
};

function clamp(n: unknown, lo: number, hi: number, dflt: number): number {
  const v = Number(n);
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : dflt;
}

function sanitize(raw: Partial<DaiSettings>): DaiSettings {
  return {
    terminalFontSize: clamp(raw.terminalFontSize, 9, 24, DEFAULTS.terminalFontSize),
    sessionsActiveMin: clamp(raw.sessionsActiveMin, 15, 1440, DEFAULTS.sessionsActiveMin),
    radarAutoRefresh: typeof raw.radarAutoRefresh === "boolean" ? raw.radarAutoRefresh : DEFAULTS.radarAutoRefresh,
    auditRetentionDays: clamp(raw.auditRetentionDays, 1, 365, DEFAULTS.auditRetentionDays),
    vaultAutoSyncMin: clamp(raw.vaultAutoSyncMin, 0, 1440, DEFAULTS.vaultAutoSyncMin),
    defaultCwd: typeof raw.defaultCwd === "string" && raw.defaultCwd.trim() ? raw.defaultCwd.trim() : DEFAULTS.defaultCwd,
  };
}

export function settingsGet(): DaiSettings {
  try { return sanitize(JSON.parse(fs.readFileSync(FILE, "utf8"))); } catch { return { ...DEFAULTS }; }
}

export function settingsSet(patch: Partial<DaiSettings>): DaiSettings {
  const next = sanitize({ ...settingsGet(), ...patch });
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(next, null, 2), { mode: 0o600 });
  } catch { /* fs error — next get() reflects reality */ }
  return next;
}
