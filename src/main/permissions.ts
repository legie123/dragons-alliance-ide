// Permissions — local team/role model at ~/.config/dai/permissions.json (0600).
// Single-operator today (Andrei = owner), but the model is enforcement-ready:
// roles map to capability lists and `can()` gates consequential IPC actions.
// Invariant: at least one owner always exists — a save that would drop the
// last owner is rejected back to the previous state.
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as crypto from "node:crypto";
import type { PermissionsState, PermRole, PermCapability, PermMember } from "../shared/ipc.js";

const FILE = path.join(os.homedir(), ".config", "dai", "permissions.json");

const ALL_CAPS: PermCapability[] = ["terminals", "broadcast", "credentials", "drive-write", "vault-sync", "emergency-stop"];
const ROLES: PermRole[] = ["owner", "editor", "viewer"];

export const DEFAULT_STATE: PermissionsState = {
  members: [{ id: "op-andrei", name: "Andrei", role: "owner" }],
  matrix: {
    owner: [...ALL_CAPS],
    editor: ["terminals", "broadcast", "vault-sync"],
    viewer: [],
  },
};

function sanitize(raw: any): PermissionsState {
  const members: PermMember[] = Array.isArray(raw?.members)
    ? raw.members
        .filter((m: any) => m && typeof m.name === "string" && m.name.trim() && ROLES.includes(m.role))
        .slice(0, 32)
        .map((m: any) => ({
          id: typeof m.id === "string" && m.id ? m.id : "op-" + crypto.randomUUID().slice(0, 8),
          name: String(m.name).trim().slice(0, 60),
          role: m.role as PermRole,
        }))
    : [];
  const matrix = {} as PermissionsState["matrix"];
  for (const role of ROLES) {
    const caps = Array.isArray(raw?.matrix?.[role]) ? raw.matrix[role] : DEFAULT_STATE.matrix[role];
    matrix[role] = ALL_CAPS.filter((c) => caps.includes(c));
  }
  matrix.owner = [...ALL_CAPS]; // owners are never lockable-out
  if (!members.some((m) => m.role === "owner")) return { ...DEFAULT_STATE };
  return { members, matrix };
}

export function permsGet(): PermissionsState {
  try { return sanitize(JSON.parse(fs.readFileSync(FILE, "utf8"))); } catch { return structuredClone(DEFAULT_STATE); }
}

export function permsSet(next: PermissionsState): PermissionsState {
  const incoming = sanitize(next);
  // reject a save that drops the last owner (sanitize already fell back — persist the safe state)
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(incoming, null, 2), { mode: 0o600 });
  } catch { /* fs error — next get() reflects reality */ }
  return incoming;
}

/** Capability gate for the local operator (first owner). */
export function can(capability: PermCapability): boolean {
  const st = permsGet();
  const me = st.members.find((m) => m.role === "owner") ?? st.members[0];
  return me ? st.matrix[me.role].includes(capability) : false;
}
