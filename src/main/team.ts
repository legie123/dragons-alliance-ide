// Team access control — the shared roster + per-member capability grants live in
// the git-synced Obsidian vault (<vault>/_team/team.json) so an owner's decisions
// reach every teammate through the sync channel that already works. Local identity
// (who this machine is) lives in ~/.config/dai/identity.json. Cooperative model:
// this shapes the default UI per member and logs every change — it is NOT hard
// security (single-user desktop app, no server; see the design spec).
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { resolvePreset, ALL_CAP_IDS, grantsHave } from "../shared/teamCaps.js";
import type { TeamConfig, TeamMember, Me } from "../shared/ipc.js";
import { auditLog } from "./audit.js";

const HOME = os.homedir();
const VAULT = path.join(HOME, "Documents", "Obsidian", "Antigravity-Brain");
const TEAM_FILE = path.join(VAULT, "_team", "team.json");
const IDENTITY_FILE = path.join(HOME, ".config", "dai", "identity.json");
const PERMS_FILE = path.join(HOME, ".config", "dai", "permissions.json"); // migration source

const CAP_SET = new Set(ALL_CAP_IDS);
const genId = () => "op-" + crypto.randomUUID().slice(0, 8);

function seedConfig(): TeamConfig {
  // migrate legacy permissions.json members if present, else a lone owner
  let members: TeamMember[] = [];
  try {
    const legacy = JSON.parse(fs.readFileSync(PERMS_FILE, "utf8"));
    if (Array.isArray(legacy?.members)) {
      members = legacy.members.map((m: any) => ({
        id: typeof m.id === "string" && m.id ? m.id : genId(),
        name: String(m.name || "Member").slice(0, 60),
        role: m.role === "owner" || m.role === "editor" || m.role === "viewer" ? m.role : "viewer",
        grants: resolvePreset(m.role === "owner" || m.role === "editor" || m.role === "viewer" ? m.role : "viewer"),
      }));
    }
  } catch { /* no legacy file */ }
  if (!members.some((m) => m.role === "owner")) {
    members.unshift({ id: "op-andrei", name: "Andrei", role: "owner", grants: ["*"] });
  }
  return { version: 1, updatedAt: Date.now(), updatedBy: members[0].id, members };
}

function sanitize(raw: any): TeamConfig {
  const members: TeamMember[] = Array.isArray(raw?.members)
    ? raw.members
        .filter((m: any) => m && typeof m.name === "string" && m.name.trim())
        .slice(0, 32)
        .map((m: any): TeamMember => {
          const role = m.role === "owner" || m.role === "editor" || m.role === "viewer" ? m.role : "viewer";
          const grants = role === "owner"
            ? ["*"]
            : (Array.isArray(m.grants) ? m.grants.filter((c: any) => c === "*" || CAP_SET.has(c)) : resolvePreset(role));
          return { id: typeof m.id === "string" && m.id ? m.id : genId(), name: String(m.name).trim().slice(0, 60), role, grants };
        })
    : [];
  if (!members.some((m) => m.role === "owner")) return seedConfig(); // owner invariant
  return {
    version: 1,
    updatedAt: typeof raw?.updatedAt === "number" ? raw.updatedAt : Date.now(),
    updatedBy: typeof raw?.updatedBy === "string" ? raw.updatedBy : members[0].id,
    members,
  };
}

export function teamGet(): TeamConfig {
  try { return sanitize(JSON.parse(fs.readFileSync(TEAM_FILE, "utf8"))); }
  catch { return seedConfig(); }
}

export function teamSet(next: TeamConfig): TeamConfig {
  const clean = sanitize(next);
  clean.updatedAt = Date.now();
  try {
    fs.mkdirSync(path.dirname(TEAM_FILE), { recursive: true });
    fs.writeFileSync(TEAM_FILE, JSON.stringify(clean, null, 2));
    auditLog("team-permissions-change", `${clean.members.length} member(s) · by ${clean.updatedBy}`);
  } catch (e) { auditLog("team-permissions-error", String(e).slice(0, 160)); }
  return clean;
}

function readIdentity(): string | null {
  try { return JSON.parse(fs.readFileSync(IDENTITY_FILE, "utf8")).memberId ?? null; } catch { return null; }
}

export function identitySet(memberId: string): Me {
  try {
    fs.mkdirSync(path.dirname(IDENTITY_FILE), { recursive: true });
    fs.writeFileSync(IDENTITY_FILE, JSON.stringify({ memberId }), { mode: 0o600 });
  } catch { /* best-effort */ }
  return me();
}

export function me(): Me {
  const cfg = teamGet();
  const id = readIdentity();
  const member = id ? cfg.members.find((m) => m.id === id) ?? null : null;
  return {
    member,
    grants: member ? member.grants : [],
    isOwner: member?.role === "owner",
    needsIdentity: !member,
  };
}

export function teamCan(capId: string): boolean {
  const m = me();
  return grantsHave(m.grants, capId);
}
