# Settings + Team Access Control — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate the 5-tab AdminPanel into one serious Settings surface, and add cooperative role-based team access control (owner/editor/viewer presets + per-member capability toggles) whose decisions sync to teammates via the existing git vault.

**Architecture:** A shared team config (`<vault>/_team/team.json`, git-synced) holds members and their resolved capability grants; local `identity.json` says who this machine is. A pure capability catalog (`teamCaps.ts`) is the single source both the matrix UI and the renderer-side enforcement read. Enforcement is cooperative (shapes the UI, logs to audit) — honest, not hard security.

**Tech Stack:** Electron (main + preload + renderer), React 19, TypeScript (tsc-strict), @tanstack/react-query, node:fs, node's `execFile` git engine (already present in `vaultSync.ts`).

## Global Constraints

- Node 22. Build/typecheck via absolute binaries: `/opt/homebrew/opt/node@22/bin/npm run build` and `/opt/homebrew/opt/node@22/bin/npx tsc --noEmit`. git = `/usr/bin/git`. There is NO `npm run typecheck` script — use `npx tsc --noEmit`.
- No unit-test runner exists. Per-task gate = `npm run build` + `npx tsc --noEmit` pass; pure logic gets a throwaway `node` assertion script under `scripts/_check-*.mjs` (deleted before that task's commit); UI tasks add a CDP smoke against the built bundle.
- MULTI-AGENT HAZARD: other Claude sessions edit this repo. Read each file fresh immediately before editing; commit each task as soon as it's green.
- Renderer is contextIsolation:true / no Node globals — the renderer NEVER imports `electron` or node modules; it only calls `window.dai.*` (preload bridge). Follow the existing `window.dai.tools.*` / `window.dai.perms.*` patterns.
- No emoji anywhere. Keep brand tokens. Honesty contract: never imply hard security; never fake LIVE/success; owner-only editing enforced in UI (cooperative).
- Files stay focused and < 500 lines.
- The `superpowers-doctor.mjs` forbids disabled entries in the SUPERPOWERS registry — do NOT add disabled entries there; superpower restriction is expressed via the dock's `restricted` state.
- Vault path: `~/Documents/Obsidian/Antigravity-Brain`; team config at `<vault>/_team/team.json`. Config dir `~/.config/dai/` (0600 files).

---

### Task 1: Capability catalog + role presets

**Files:**
- Create: `src/shared/teamCaps.ts`
- Check (throwaway): `scripts/_check-teamcaps.mjs`

**Interfaces:**
- Produces:
  - `type TeamCapGroup = "sector" | "superpower" | "action" | "admin"`
  - `type TeamCapId = string` (e.g. `"sector:code"`)
  - `interface TeamCap { id: TeamCapId; group: TeamCapGroup; label: string; description: string }`
  - `const TEAM_CAPS: TeamCap[]`
  - `const ALL_CAP_IDS: TeamCapId[]`
  - `type TeamRole = "owner" | "editor" | "viewer"`
  - `const ROLE_PRESET: Record<TeamRole, TeamCapId[]>` (owner = `["*"]`)
  - `function resolvePreset(role: TeamRole): TeamCapId[]` — returns `ALL_CAP_IDS` for owner, else the preset list filtered to the catalog
  - `function grantsHave(grants: TeamCapId[], cap: TeamCapId): boolean` — true if grants includes `"*"` or `cap`

- [ ] **Step 1: Write `src/shared/teamCaps.ts`**

```ts
// Team capability catalog — the SINGLE source read by both the permission
// matrix UI and the renderer-side enforcement, so they can never drift.
// Cooperative access control for a trusted team (see the design spec): it
// shapes the default UI per member; it is not a hard security boundary.
export type TeamCapGroup = "sector" | "superpower" | "action" | "admin";
export type TeamCapId = string;

export interface TeamCap { id: TeamCapId; group: TeamCapGroup; label: string; description: string }

export const TEAM_CAPS: TeamCap[] = [
  // --- sectors (Left Rail) ---
  { id: "sector:ide", group: "sector", label: "Terminal", description: "Terminal deck & workers" },
  { id: "sector:agents", group: "sector", label: "Agents", description: "AI mission control" },
  { id: "sector:code", group: "sector", label: "Code", description: "Monaco editor + files" },
  { id: "sector:neuromap", group: "sector", label: "Neuromap", description: "Vault knowledge graph" },
  { id: "sector:drive", group: "sector", label: "Drive", description: "Vault & cloud files" },
  { id: "sector:metrics", group: "sector", label: "Metrics", description: "Session observability" },
  { id: "sector:preview", group: "sector", label: "Preview", description: "Visual QA" },
  { id: "sector:creative", group: "sector", label: "Creative", description: "Generation studio" },
  // --- superpowers ---
  { id: "sp:obsidian", group: "superpower", label: "Obsidian", description: "Knowledge vault" },
  { id: "sp:graphify", group: "superpower", label: "Grapevine", description: "Relationship engine" },
  { id: "sp:ruflo", group: "superpower", label: "Ruflo", description: "Workflow orchestrator" },
  { id: "sp:cloud", group: "superpower", label: "Cloud", description: "Claude sessions" },
  { id: "sp:agents", group: "superpower", label: "Agents", description: "Swarm control" },
  { id: "sp:godmode", group: "superpower", label: "GODMODE", description: "Supreme command" },
  { id: "sp:google", group: "superpower", label: "Google APIs", description: "Drive/Sheets/Forms" },
  // --- sensitive actions ---
  { id: "act:terminals", group: "action", label: "Run terminals", description: "Spawn/drive terminals" },
  { id: "act:broadcast", group: "action", label: "Broadcast", description: "Send to all agents" },
  { id: "act:credentials", group: "action", label: "Credentials", description: "Open the Keys vault" },
  { id: "act:drive-write", group: "action", label: "Drive write", description: "Create/modify Drive files" },
  { id: "act:vault-sync", group: "action", label: "Vault sync", description: "Commit/push the vault" },
  { id: "act:emergency-stop", group: "action", label: "Emergency stop", description: "GODMODE emergency stop" },
  // --- admin areas (Settings categories) ---
  { id: "adm:permissions", group: "admin", label: "Team & permissions", description: "View the Team category" },
  { id: "adm:teamsync", group: "admin", label: "Team Sync", description: "Vault git sync controls" },
  { id: "adm:audit", group: "admin", label: "Audit", description: "Action trail" },
  { id: "adm:apihealth", group: "admin", label: "API Health", description: "Google service probes" },
  { id: "adm:developer", group: "admin", label: "Developer", description: "Diagnostics & doctor" },
];

export const ALL_CAP_IDS: TeamCapId[] = TEAM_CAPS.map((c) => c.id);

export type TeamRole = "owner" | "editor" | "viewer";

export const ROLE_PRESET: Record<TeamRole, TeamCapId[]> = {
  owner: ["*"],
  editor: [
    "sector:ide", "sector:agents", "sector:code", "sector:neuromap", "sector:drive", "sector:metrics", "sector:preview", "sector:creative",
    "sp:obsidian", "sp:graphify", "sp:ruflo", "sp:cloud", "sp:agents",
    "act:terminals", "act:broadcast", "act:vault-sync",
    "adm:audit",
  ],
  viewer: ["sector:ide", "sector:code", "sector:neuromap", "sector:metrics", "sector:preview"],
};

export function resolvePreset(role: TeamRole): TeamCapId[] {
  if (role === "owner") return [...ALL_CAP_IDS];
  const set = new Set(ALL_CAP_IDS);
  return ROLE_PRESET[role].filter((c) => set.has(c));
}

export function grantsHave(grants: TeamCapId[], cap: TeamCapId): boolean {
  return grants.includes("*") || grants.includes(cap);
}
```

- [ ] **Step 2: Write and run `scripts/_check-teamcaps.mjs`**

```js
import assert from "node:assert";
import { TEAM_CAPS, ALL_CAP_IDS, ROLE_PRESET, resolvePreset, grantsHave } from "../out/shared/teamCaps.js";
assert.equal(new Set(ALL_CAP_IDS).size, ALL_CAP_IDS.length, "cap ids unique");
assert.ok(ALL_CAP_IDS.includes("sector:code"));
assert.deepEqual(resolvePreset("owner"), ALL_CAP_IDS, "owner resolves to all");
assert.ok(resolvePreset("editor").every((c) => ALL_CAP_IDS.includes(c)), "editor subset of catalog");
assert.ok(!resolvePreset("viewer").includes("sp:godmode"), "viewer has no godmode");
assert.ok(grantsHave(["*"], "adm:developer"), "wildcard grants everything");
assert.ok(grantsHave(["sector:code"], "sector:code"));
assert.ok(!grantsHave(["sector:code"], "sector:drive"));
console.log("teamCaps OK");
```

Note: `teamCaps.ts` has no runtime imports, so `tsc` emits it under `out/shared/`. If `out/shared/teamCaps.js` doesn't exist yet, run `npx tsc --noEmit` won't emit; instead compile ad-hoc: `npx esbuild src/shared/teamCaps.ts --format=esm --outfile=/tmp/teamCaps.mjs` and import from there. Either way the assertions must print `teamCaps OK`.

Run: `/opt/homebrew/opt/node@22/bin/npx tsc --noEmit` → PASS. Then the assertion script prints `teamCaps OK`.

- [ ] **Step 3: Delete the throwaway check, commit**

```bash
rm -f scripts/_check-teamcaps.mjs
/usr/bin/git add src/shared/teamCaps.ts
/usr/bin/git commit -m "feat(team): capability catalog + role presets (pure)

Co-Authored-By: RuFlo <ruv@ruv.net>"
```

---

### Task 2: Shared types + IPC channel constants

**Files:**
- Modify: `src/shared/ipc.ts` (add types near the existing `PermRole` block ~line 284; add channel constants near `PERMS_GET` ~line 93; add `window.dai.team` to the `dai` interface near `perms:` ~line 425)

**Interfaces:**
- Consumes: `TeamCapId`, `TeamRole` from `src/shared/teamCaps` (import type).
- Produces:
  - `interface TeamMember { id: string; name: string; role: TeamRole; grants: TeamCapId[] }`
  - `interface TeamConfig { version: number; updatedAt: number; updatedBy: string; members: TeamMember[] }`
  - `interface Me { member: TeamMember | null; grants: TeamCapId[]; isOwner: boolean; needsIdentity: boolean }`
  - `CH.TEAM_GET = "team:get"`, `CH.TEAM_SET = "team:set"`, `CH.TEAM_ME = "team:me"`, `CH.IDENTITY_SET = "identity:set"`
  - `window.dai.team: { get(): Promise<TeamConfig>; set(c: TeamConfig): Promise<TeamConfig>; me(): Promise<Me>; setIdentity(memberId: string): Promise<Me> }`

- [ ] **Step 1: Read `src/shared/ipc.ts` fresh; add the channel constants**

In the `CH` object, after `PERMS_SET: "perms:set",` add:

```ts
  // team access control (roster + per-member capability grants, synced via vault)
  TEAM_GET: "team:get",                        // invoke() → TeamConfig
  TEAM_SET: "team:set",                        // invoke(config) → TeamConfig (owner-authored)
  TEAM_ME: "team:me",                          // invoke() → Me (current identity resolved)
  IDENTITY_SET: "identity:set",                // invoke(memberId) → Me
```

- [ ] **Step 2: Add the types** (after the `PermissionsState` block)

```ts
// ---- Team access control ----
import type { TeamCapId, TeamRole } from "./teamCaps";
export type { TeamCapId, TeamRole };
export interface TeamMember { id: string; name: string; role: TeamRole; grants: TeamCapId[] }
export interface TeamConfig { version: number; updatedAt: number; updatedBy: string; members: TeamMember[] }
export interface Me { member: TeamMember | null; grants: TeamCapId[]; isOwner: boolean; needsIdentity: boolean }
```

(If `import type` at that position is awkward, move it to the top import block — either compiles.)

- [ ] **Step 3: Add the bridge type** to the `dai` interface, after the `perms:` entry:

```ts
    team: {
      get(): Promise<TeamConfig>;
      set(config: TeamConfig): Promise<TeamConfig>;
      me(): Promise<Me>;
      setIdentity(memberId: string): Promise<Me>;
    };
```

- [ ] **Step 4: Typecheck + commit**

Run: `/opt/homebrew/opt/node@22/bin/npx tsc --noEmit` → PASS (unused types are fine).

```bash
/usr/bin/git add src/shared/ipc.ts
/usr/bin/git commit -m "feat(team): shared TeamConfig/Me types + IPC channels

Co-Authored-By: RuFlo <ruv@ruv.net>"
```

---

### Task 3: Backend team module

**Files:**
- Create: `src/main/team.ts`
- Check (throwaway): `scripts/_check-team.mjs`

**Interfaces:**
- Consumes: `resolvePreset`, `grantsHave`, `ALL_CAP_IDS` from `../shared/teamCaps.js`; `TeamConfig`, `TeamMember`, `Me` from `../shared/ipc.js`; `auditLog` from `./audit.js`.
- Produces (exported): `teamGet(): TeamConfig`, `teamSet(next: TeamConfig): TeamConfig`, `identitySet(memberId: string): Me`, `me(): Me`, `teamCan(capId: string): boolean`.

- [ ] **Step 1: Write `src/main/team.ts`**

```ts
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
```

- [ ] **Step 2: Verify with `scripts/_check-team.mjs`** (compile main first: `npm run build` emits `out/main/team.js`)

```js
import assert from "node:assert";
import { teamGet, teamSet, me, teamCan } from "../out/main/team.js";
const cfg = teamGet();
assert.ok(cfg.members.some((m) => m.role === "owner"), "always has an owner");
// dropping the last owner must fall back to a seeded owner (invariant)
const noOwner = teamSet({ version: 1, updatedAt: 0, updatedBy: "x", members: [{ id: "v", name: "V", role: "viewer", grants: [] }] });
assert.ok(noOwner.members.some((m) => m.role === "owner"), "owner invariant holds");
// no identity yet on a fresh machine
assert.equal(me().needsIdentity, true, "needs identity before setIdentity");
console.log("team OK");
```

Run: `/opt/homebrew/opt/node@22/bin/npm run build` → PASS, then the script prints `team OK`. (This writes a real `team.json` in the vault — acceptable; it seeds the owner.)

- [ ] **Step 3: Delete throwaway, commit**

```bash
rm -f scripts/_check-team.mjs
/usr/bin/git add src/main/team.ts
/usr/bin/git commit -m "feat(team): backend — vault team.json, identity, resolve, can()

Co-Authored-By: RuFlo <ruv@ruv.net>"
```

---

### Task 4: IPC handlers + preload bridge

**Files:**
- Modify: `src/main/ipc.ts` (import from `./team`; register 4 handlers near the `PERMS_GET`/`PERMS_SET` handlers)
- Modify: `src/preload/index.ts` (add `team:` bridge near `perms:` ~line 95)

**Interfaces:**
- Consumes: `teamGet`, `teamSet`, `me`, `identitySet` from `./team`; `CH.TEAM_*`, `CH.IDENTITY_SET`.
- Produces: `window.dai.team.{get,set,me,setIdentity}` fully wired.

- [ ] **Step 1: Read `src/main/ipc.ts` fresh; add import + handlers**

Add to the import block: `import { teamGet, teamSet, me as teamMe, identitySet } from "./team";`

Near the perms handlers, add:

```ts
  ipcMain.handle(CH.TEAM_GET, () => teamGet());
  ipcMain.handle(CH.TEAM_SET, (_e, cfg) => teamSet(cfg));
  ipcMain.handle(CH.TEAM_ME, () => teamMe());
  ipcMain.handle(CH.IDENTITY_SET, (_e, memberId: string) => identitySet(String(memberId)));
```

- [ ] **Step 2: Read `src/preload/index.ts` fresh; add the bridge** after the `perms:` block:

```ts
  team: {
    get: () => ipcRenderer.invoke(CH.TEAM_GET),
    set: (config) => ipcRenderer.invoke(CH.TEAM_SET, config),
    me: () => ipcRenderer.invoke(CH.TEAM_ME),
    setIdentity: (memberId) => ipcRenderer.invoke(CH.IDENTITY_SET, memberId),
  },
```

- [ ] **Step 3: Build + typecheck + commit**

Run: `/opt/homebrew/opt/node@22/bin/npm run build` and `npx tsc --noEmit` → PASS.

```bash
/usr/bin/git add src/main/ipc.ts src/preload/index.ts
/usr/bin/git commit -m "feat(team): IPC handlers + preload bridge for window.dai.team

Co-Authored-By: RuFlo <ruv@ruv.net>"
```

---

### Task 5: `useMe` hook

**Files:**
- Create: `src/renderer/src/hooks/useMe.ts`

**Interfaces:**
- Consumes: `window.dai.team.me()`, `Me`, `grantsHave` (re-export via a local `can`).
- Produces: `useMe(): { me: Me | undefined; can: (cap: string) => boolean; isOwner: boolean }`.

- [ ] **Step 1: Write the hook**

```ts
// Current identity + capability gate for the renderer. React Query keeps it in
// one cache ("me") so every enforcement point reads the same resolved grants.
import { useQuery } from "@tanstack/react-query";
import type { Me } from "@shared/ipc";
import { grantsHave } from "@shared/teamCaps";

export function useMe() {
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => window.dai.team.me(), refetchInterval: 10000 });
  return {
    me: me as Me | undefined,
    isOwner: !!me?.isOwner,
    // default-allow while loading so the UI doesn't flicker into "restricted";
    // enforcement is cooperative, not a security gate.
    can: (cap: string) => (me ? grantsHave(me.grants, cap) : true),
  };
}
```

(Confirm the `@shared` path alias resolves in the renderer — `AdminPanel.tsx` already imports from `@shared/ipc`. If `@shared/teamCaps` doesn't resolve, use a relative import.)

- [ ] **Step 2: Typecheck + commit**

Run: `npx tsc --noEmit` → PASS.

```bash
/usr/bin/git add src/renderer/src/hooks/useMe.ts
/usr/bin/git commit -m "feat(team): useMe hook — resolved identity + can() gate

Co-Authored-By: RuFlo <ruv@ruv.net>"
```

---

### Task 6: Team section (roster + matrix + identity)

**Files:**
- Create: `src/renderer/src/components/settings/TeamSection.tsx`
- Modify: `src/renderer/src/styles.css` (append `.team-*` styles; reuse existing `.vault-*`/`.admin-*` where possible)

**Interfaces:**
- Consumes: `window.dai.team.{get,set}`, `useMe`, `TEAM_CAPS`, `resolvePreset`, `TeamConfig`, `TeamMember`, `TeamRole`.
- Produces: `export function TeamSection()`.

- [ ] **Step 1: Write `TeamSection.tsx`** — identity banner, roster add/remove (owner-only), and a matrix grouped by the four `TeamCapGroup`s. Owner rows locked to all-granted. Per-member role-preset `<select>` applies `resolvePreset(role)` into that member's grants; individual checkboxes toggle a single `capId`. Non-owner: render read-only "your access" (their grants as read-only checks) with the note "only an owner can change this; changes arrive via Team Sync". Draft/Save/Discard pattern identical to `IdeConfigSection`. Save calls `window.dai.team.set(draft)` then invalidates `["me"]` and `["team"]`, and shows a hint linking to the Team Sync category.

Key data-flow (include verbatim in the component):

```tsx
const grouped = { sector: [], superpower: [], action: [], admin: [] } as Record<string, typeof TEAM_CAPS>;
for (const c of TEAM_CAPS) grouped[c.group].push(c);

function toggleCap(memberId: string, capId: string) {
  setDraft((d) => {
    const cfg = structuredClone(d ?? base);
    const m = cfg.members.find((x) => x.id === memberId)!;
    if (m.role === "owner") return cfg; // owners keep all
    const has = m.grants.includes(capId);
    m.grants = has ? m.grants.filter((c) => c !== capId) : [...m.grants.filter((c) => c !== "*"), capId];
    return cfg;
  });
}
function applyPreset(memberId: string, role: TeamRole) {
  setDraft((d) => {
    const cfg = structuredClone(d ?? base);
    const m = cfg.members.find((x) => x.id === memberId)!;
    m.role = role; m.grants = resolvePreset(role);
    return cfg;
  });
}
```

- [ ] **Step 2: Build + typecheck**

Run: `npm run build` + `npx tsc --noEmit` → PASS.

- [ ] **Step 3: Commit**

```bash
/usr/bin/git add src/renderer/src/components/settings/TeamSection.tsx src/renderer/src/styles.css
/usr/bin/git commit -m "feat(team): Team settings section — roster + permission matrix + identity

Co-Authored-By: RuFlo <ruv@ruv.net>"
```

---

### Task 7: Settings consolidation (AdminPanel → one Settings surface)

**Files:**
- Modify: `src/renderer/src/components/AdminPanel.tsx` (drop the 5 top tabs; render the Settings category nav as the only surface; move `AuditTab`/`HealthTab`/`TeamTab` bodies into section components or import them as sections)
- Modify: `src/renderer/src/components/settings/SettingsSections.tsx` (extend `SETTINGS_CATS`; add `AuditSection`, `ApiHealthSection`, `TeamSyncSection` by lifting the bodies from `AdminPanel`; export `TeamSection` re-export)

**Interfaces:**
- Consumes: `useMe` (to gate admin categories), `TeamSection`, the lifted section components.
- Produces: `SETTINGS_CATS` = `appearance, ide, team, teamsync, superpowers, integrations, shortcuts, audit, apihealth, developer`; `AdminPanel` renders only the category nav + body, admin categories filtered by `can("adm:*")`.

- [ ] **Step 1: Lift `AuditTab`, `HealthTab`, `TeamTab` bodies** from `AdminPanel.tsx` into `SettingsSections.tsx` as `AuditSection`, `ApiHealthSection`, `TeamSyncSection` (same JSX, exported). Add `import { TeamSection } from "./TeamSection"` and re-export it.

- [ ] **Step 2: Extend `SETTINGS_CATS`** with `{ id: "team", label: "Team" }`, `{ id: "teamsync", label: "Team Sync" }`, `{ id: "audit", label: "Audit" }`, `{ id: "apihealth", label: "API Health" }`, plus a `cap?: string` field per admin category (`team`/`teamsync`/`audit`/`apihealth`/`developer` → their `adm:*` id; non-admin categories have no `cap`).

- [ ] **Step 3: Rewrite `AdminPanel`** to render one panel: the category nav (filtered — hide a category whose `cap` the member lacks via `useMe().can`) + the matching section body. Remove `TABS`/`AdminTab` tab bar and the `PermsTab`. Keep the `dai:admin` event → it now selects a category id (map old tab ids: `settings`→`appearance`, `perms`→`team`, `team`→`teamsync`, `audit`→`audit`, `health`→`apihealth`). Keep `useEscape`.

- [ ] **Step 4: Build + typecheck + CDP smoke**

Run: `npm run build` + `npx tsc --noEmit` → PASS. Then launch built bundle with `--remote-debugging-port=9333 --user-data-dir=/tmp/dai-team-qa` and confirm via CDP: opening Settings shows the category nav with Team/Team Sync/Audit/API Health present; the Team category renders the matrix.

- [ ] **Step 5: Commit**

```bash
/usr/bin/git add src/renderer/src/components/AdminPanel.tsx src/renderer/src/components/settings/SettingsSections.tsx
/usr/bin/git commit -m "feat(settings): consolidate admin tabs into one Settings surface with gated categories

Co-Authored-By: RuFlo <ruv@ruv.net>"
```

---

### Task 8: Enforcement — Left Rail, view guard, dock, actions

**Files:**
- Modify: `src/renderer/src/components/shell/LeftRail.tsx` (filter `CORE_SECTORS` by `can("sector:"+id)`)
- Modify: `src/renderer/src/App.tsx` (guard `setView`/goto for gated sectors → show a restricted panel; block ⌘1-8 to gated sectors)
- Modify: `src/renderer/src/components/EcosystemBar.tsx` (a superpower without `can("sp:"+id)` → `restricted` visual state + honest reason)
- Modify: `src/renderer/src/sectorActions.tsx` (map actions to caps; gated → disabled with reason) — only where an action maps cleanly to `act:*`

**Interfaces:**
- Consumes: `useMe().can`.
- Produces: sectors/superpowers/actions the current member lacks are hidden or shown restricted; denied navigation logs `auditLog` via a new `window.dai` call OR a renderer console + audit event (reuse `window.dai.audit.log` if present).

- [ ] **Step 1: LeftRail** — `const { can } = useMe();` then `CORE_SECTORS.filter((s) => can("sector:" + s.id))` before mapping. Keep Support/Guide/Settings always visible.

- [ ] **Step 2: App view guard** — wrap `setView` in a `guardedSetView(v)` that checks `can("sector:"+v)` for core sectors; if denied, set a `restricted` flag rendered as a small centered "Access restricted — ask an owner" panel in `.shell-view` instead of the view. Gate the ⌘1-8 handler the same way.

- [ ] **Step 3: EcosystemBar** — for each superpower, `const allowed = can("sp:"+sp.id);` if not allowed, render the chip in a `restricted` class (visually disabled), suppress the quick panel, and set the hover explain to "not granted to you by an owner". Do NOT add disabled entries to the SUPERPOWERS registry (doctor guard).

- [ ] **Step 4: sectorActions** — add an optional `cap?: string` to `SectorAction`; where an action maps to a sensitive capability (e.g. broadcast → `act:broadcast`, credentials/Keys → `act:credentials`), set it. In `RightRail`'s consumer... (Right Rail was removed) — instead gate in the command palette's `contextual` provider in `App.tsx`: a recommended action whose `cap` is denied renders with `disabledReason: "restricted — ask an owner"`.

- [ ] **Step 5: Build + typecheck + CDP smoke** (owner sees everything; then temporarily point `identity.json` at a viewer member and confirm sectors/superpowers gate). Run doctor: `node scripts/superpowers-doctor.mjs --check` → green.

- [ ] **Step 6: Commit**

```bash
/usr/bin/git add src/renderer/src/components/shell/LeftRail.tsx src/renderer/src/App.tsx src/renderer/src/components/EcosystemBar.tsx src/renderer/src/sectorActions.tsx
/usr/bin/git commit -m "feat(team): cooperative enforcement — sector/superpower/action gating

Co-Authored-By: RuFlo <ruv@ruv.net>"
```

---

### Task 9: First-run identity modal

**Files:**
- Create: `src/renderer/src/components/FirstRunIdentity.tsx`
- Modify: `src/renderer/src/App.tsx` (mount it; open when `useMe().me?.needsIdentity`)

**Interfaces:**
- Consumes: `window.dai.team.{get,setIdentity}`, `useMe`.
- Produces: `export function FirstRunIdentity({ open, onDone }: { open: boolean; onDone: () => void })`.

- [ ] **Step 1: Write the modal** — on open, `team.get()`. If roster has members → a "Who are you?" `<select>` of member names + a "Set up my team as owner" fallback. If no roster (fresh) → a name input that creates the owner (call `team.set` adding an owner member, then `setIdentity(newId)`). Selecting an existing member → `setIdentity(member.id)`. On success invalidate `["me"]` and call `onDone`. Styled with existing `.vault`/modal classes; no emoji.

- [ ] **Step 2: Mount in App** — `const { me } = useMe();` render `<FirstRunIdentity open={!!me?.needsIdentity} onDone={() => queryClient.invalidateQueries({ queryKey: ["me"] })} />`. Ensure it renders above other panels.

- [ ] **Step 3: Build + typecheck + CDP smoke** — remove `~/.config/dai/identity.json`, launch built bundle, confirm the modal appears and writing identity resolves `me`.

- [ ] **Step 4: Commit**

```bash
/usr/bin/git add src/renderer/src/components/FirstRunIdentity.tsx src/renderer/src/App.tsx
/usr/bin/git commit -m "feat(team): first-run identity modal

Co-Authored-By: RuFlo <ruv@ruv.net>"
```

---

### Task 10: Cutover + final verification

**Files:**
- Delete: `src/main/permissions.ts`
- Modify: `src/main/ipc.ts` (remove `permsGet/permsSet` import + `PERMS_GET/PERMS_SET` handlers), `src/preload/index.ts` (remove `perms:` bridge), `src/shared/ipc.ts` (remove `perms:` bridge type + `PermsTab`-only types if now unused; keep `PermRole` only if still referenced), `src/renderer/src/components/AdminPanel.tsx` (ensure no `PermsTab` remains)

**Interfaces:**
- Consumes: nothing new.
- Produces: a clean tree with team.* as the only permission surface.

- [ ] **Step 1: Grep for remaining references** — `grep -rn "perms\.\|PermsTab\|permsGet\|PERMS_GET\|permissions.ts" src`. Remove each dead reference. Keep `PermRole`/`PermCapability` types only if something still imports them; otherwise delete.

- [ ] **Step 2: Full verification** — `npm run build` + `npx tsc --noEmit` + `node scripts/superpowers-doctor.mjs --check` all green. CDP smoke: owner flow end-to-end (edit matrix → save → confirm `team.json` written in vault; deny a sector → hidden).

- [ ] **Step 3: Commit**

```bash
/usr/bin/git add -A
/usr/bin/git commit -m "refactor(team): retire local permissions.ts in favor of synced team config

Co-Authored-By: RuFlo <ruv@ruv.net>"
```

---

## Notes for the executor

- After all tasks: the deploy is separate (package + swap /Applications) and is handled by the main session, not this plan.
- If `@shared/teamCaps` alias fails to resolve in the renderer, use a relative import (`../../shared/teamCaps` from hooks, adjust depth per file). The `@shared/ipc` alias already works, so `@shared/teamCaps` should too.
- Team Sync (committing/pushing `team.json`) reuses the existing vault sync — no new push code. The Team section just writes the file; the Team Sync category commits+pushes it.
