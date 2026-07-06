# Dragons Alliance IDE — Serious Settings + Team Access Control

Date: 2026-07-06
Status: approved design, pending spec review → implementation plan

## Goal

Two linked upgrades:

1. **Consolidate configuration under a single, serious Settings surface.** Today the
   `AdminPanel` exposes 5 sibling tabs (Settings, Audit, Permissions, Team Sync, API
   Health). Collapse them into ONE Settings panel with a left-nav of categories, so
   there is one authoritative place to configure the IDE.
2. **Real team access control.** The owner decides, per member, what each teammate can
   access (sectors, superpowers, sensitive actions, admin areas) and what they cannot.
   Those decisions must actually reach the other members' installs — not stay local.

Target team size: 5–7 people, each on their own Apple-Silicon Mac, each running their
own install of the app. No server exists.

## Honesty contract (load-bearing — do not violate)

DAI is a single-user-per-install desktop app with **no server and no real auth backend**.
A permission enforced purely client-side can be bypassed by anyone technical who owns the
machine (edit the JSON, open devtools). Therefore this system is **cooperative,
role-based access control for a trusted team** — it shapes what each person sees and can
do *by default*, logs every change and every denied attempt to the audit trail, and rides
git history (commits are attributed) — but it is **not a hard security boundary**. The UI
must say so plainly. Building this while implying real security would be exactly the kind
of "fake" the whole app rejects. For a trusted 5–7 person team this cooperative model is
the correct and honest design.

## Current state (audited 2026-07-06)

- `src/main/permissions.ts` — a local role model at `~/.config/dai/permissions.json`
  (0600). Types `PermRole` (owner|editor|viewer), `PermCapability`
  (terminals|broadcast|credentials|drive-write|vault-sync|emergency-stop),
  `PermissionsState { members, matrix }`. Has a `can(capability)` gate and a
  last-owner invariant. **`can()` is never called anywhere** — permissions are currently
  decorative, and `permissions.json` is local per-machine, never synced.
- `src/main/vaultSync.ts` — a real git engine over the Obsidian vault
  (`~/Documents/Obsidian/Antigravity-Brain`): snapshot-commit + pull --rebase + push when
  a remote exists. This is the existing, working sync channel.
- `src/renderer/src/components/AdminPanel.tsx` — 5-tab dialog (Settings/Audit/Perms/Team/
  Health), all live IPC.
- `src/renderer/src/components/settings/SettingsSections.tsx` — the Settings tab already
  uses a category left-nav (`SETTINGS_CATS`: appearance/ide/superpowers/integrations/
  shortcuts/developer) with per-section components. This is the pattern to extend.
- Team status today: **nobody else has installed yet** (preparation phase) — full design
  freedom, no migration of foreign data.

## Architecture

### Data model

**Shared team config — `<vault>/_team/team.json`** (git-synced via existing Team Sync):

```jsonc
{
  "version": 1,
  "updatedAt": 1730000000000,     // ms epoch, stamped on write
  "updatedBy": "op-andrei",        // member id of the owner who last saved
  "members": [
    {
      "id": "op-andrei",
      "name": "Andrei",
      "role": "owner",             // last-applied preset — informational
      "grants": ["*"]              // owner = all; others = explicit resolved capability ids
    }
  ]
}
```

- `grants` stores the **resolved, explicit** capability-id list for each member (not a
  role indirection). "What does X have" is therefore always unambiguous. `"*"` means all
  (owner only).
- Owner grants are always `["*"]` and cannot be reduced. At least one owner must always
  exist — a save dropping the last owner is rejected (reuse the invariant already in
  `permissions.ts`).
- Living in the vault means the owner's edits reach everyone through the sync channel that
  already works. No new remote, no new infra.

**Local identity — `~/.config/dai/identity.json`** (per machine, 0600):

```json
{ "memberId": "op-andrei" }
```

Resolved on boot against the synced `team.json` to determine the current member, their
role, and their grants. Missing identity → first-run modal (see below).

### Capability catalog — `src/shared/teamCaps.ts` (pure, single source)

Static declaration read by BOTH the UI (matrix editor) and enforcement, so they can never
drift:

- **Sectors (8):** `sector:ide`, `sector:agents`, `sector:code`, `sector:neuromap`,
  `sector:drive`, `sector:metrics`, `sector:preview`, `sector:creative`
- **Superpowers (7):** `sp:obsidian`, `sp:graphify`, `sp:ruflo`, `sp:cloud`, `sp:agents`,
  `sp:godmode`, `sp:google`
- **Sensitive actions:** `act:terminals`, `act:broadcast`, `act:credentials`,
  `act:drive-write`, `act:vault-sync`, `act:emergency-stop`
  (Editing the permission matrix is governed by owner status, not a capability — so
  there is no `act:edit-permissions`; a non-owner never gets an edit surface.)
- **Admin areas:** `adm:permissions`, `adm:teamsync`, `adm:audit`, `adm:apihealth`,
  `adm:developer`

Each capability declares `{ id, group, label, description }`. The file also exports the
three **role presets** (as capability-id subsets) used by the one-click "apply role"
action:

- `owner` → `["*"]`
- `editor` → all sectors; `sp:obsidian|graphify|ruflo|cloud|agents`; `act:terminals|
  broadcast|vault-sync`; `adm:audit`
- `viewer` → `sector:ide|code|neuromap|metrics|preview`; no actions; no admin

Presets are **templates applied at edit time** (they write resolved grants), not a live
runtime indirection.

### Backend — `src/main/team.ts`

- `teamGet(): TeamConfig` — read `<vault>/_team/team.json`; if absent, return a seed with
  the local operator as sole owner (migrated from `permissions.json` if present).
- `teamSet(next): TeamConfig` — validate (sanitize members, enforce owner invariant,
  filter grants against the catalog), stamp `updatedAt`/`updatedBy`, write to the vault
  path, `auditLog("team-permissions-change", ...)`. Does NOT push — the existing Team Sync
  action commits+pushes (surfaced in the Team Sync UI). Owner-authored only (enforced in
  UI; cooperative — see honesty contract).
- `identityGet()` / `identitySet(memberId)` — read/write `identity.json`.
- `me(): { member, grants, isOwner }` — resolve identity against team config.
- `can(capId): boolean` — `grants` includes `"*"` or the exact id. Reused by any main-
  process gate and exposed to the renderer.

New IPC channels: `TEAM_GET`, `TEAM_SET`, `TEAM_ME`, `IDENTITY_GET`, `IDENTITY_SET`
(→ `window.dai.team.*` via preload, matching existing bridge patterns). Shared types
(`TeamConfig`, `TeamMember`, `TeamCapId`, `TeamRole`, `Me`) in `src/shared/ipc.ts`.

### Enforcement points (where `can()` finally has teeth)

All renderer-side (shapes the UI); honest cooperative gating, never claimed as security.
Current member's grants come from `useMe()` (new hook, React Query over `window.dai.team.me()`).

- **LeftRail** — render only sectors the member has `sector:x` for. Sectors without access
  are hidden.
- **App view guard** — if a `dai:goto`/⌘-number targets a gated sector, refuse and show a
  small "access restricted" panel in the main area instead of the view.
- **EcosystemBar (dock)** — a superpower without `sp:x` renders in a `restricted` state
  (visually like disabled) with the honest reason "not granted to <you> by an owner".
- **Action registry / sectorActions** — an action tied to a capability renders disabled
  with its honest reason when `!can(...)`. (Extends the existing disabled-reason pattern;
  the doctor still forbids disabled entries in the SUPERPOWERS registry, so gated
  superpower *actions* express restriction via the dock's restricted state, not by adding
  disabled entries to that registry.)
- **Settings categories** — an admin category whose `adm:*` grant the member lacks is
  **hidden** from the Settings nav. The **Team** category is always visible (it shows the
  member their own resolved access; the matrix editor is owner-only, read-only otherwise).
- Every denied attempt and every `team.json` change → `auditLog(...)`.

### Settings consolidation

`AdminPanel` stops being a 5-tab dialog and becomes the single **Settings** panel whose
existing category left-nav is extended. New `SETTINGS_CATS` order:

```
Appearance · IDE Config · Team · Team Sync · Superpowers · Integrations ·
Shortcuts · Audit · API Health · Developer
```

- The old top-level tabs (Audit, Permissions, Team Sync, API Health) become categories.
- "Permissions" is absorbed into **Team**.
- Existing section components (Appearance/IDEConfig/Superpowers/Integrations/Shortcuts/
  Developer) are reused unchanged; Audit/API-Health tab bodies move into section
  components; Team Sync's body moves into a section. Admin categories gate on `adm:*`.

### Team section (`src/renderer/src/components/settings/TeamSection.tsx`)

- **Identity banner** — "You are: <name> (<role>)".
- **Roster** — member list; add (name → new member, default `viewer` preset) / remove
  (owner-only; cannot remove the last owner).
- **Permission matrix** — rows = members, columns grouped by the four catalog groups, cell
  = toggle. Per-member "apply role preset" dropdown (owner/editor/viewer) writes that
  preset's resolved grants, then individual toggles refine. Owner rows are locked to all.
- **Owner vs non-owner** — non-owner sees only their own resolved access, read-only, with
  the note "only an owner can change this; changes arrive via Team Sync".
- **Save** — `window.dai.team.set(...)` (writes vault `team.json`); a hint points to the
  Team Sync category to commit+push. Draft/Discard pattern like the existing sections.

### First-run identity modal

On boot, if `identity.json` is absent:

- If `team.json` has a roster (synced) → "Who are you?" with a dropdown of roster names +
  "I'm not listed" (creates a pending `viewer`; an owner promotes/edits later).
- If no team config yet (no vault or empty) → "Set up your team" → creates the current
  user as the sole `owner`.
- Selection writes `identity.json`; never asked again. Built from existing modal/vault
  styles — no new dependency, no emoji.

## Migration

Preparation phase (no foreign installs), so migration is trivial: on first owner setup,
seed `team.json` from the local `permissions.json` members if present (else a single owner
= the current operator). `permissions.json` is superseded by `team.json`; the old
`perms:get/set` IPC and `PermsTab` are removed once Team ships.

## Testing / verification

- `npm run build` (main + preload + renderer, tsc-strict) and `npx tsc --noEmit` pass.
- `node scripts/superpowers-doctor.mjs --check` still green (no disabled entries added to
  the SUPERPOWERS registry).
- CDP smoke against the built bundle: (a) as owner — matrix edits persist to vault
  `team.json`, denied sectors hidden in LeftRail, gated dock chips show restricted; (b)
  simulate a non-owner identity — Team section read-only, admin categories gated; (c)
  first-run modal appears with no `identity.json` and writes it on selection.
- Audit trail shows `team-permissions-change` and denied-attempt entries.

## Out of scope (YAGNI)

- No passwords / encryption / real auth — cooperative model only (see honesty contract).
- No server, no live presence/awareness.
- No rebindable keyboard shortcuts (already marked a future pass).
- No custom roles beyond owner/editor/viewer — per-member toggles cover the flexibility.
- No automatic background team-config sync — reuses the existing manual/auto vault sync.

## New/changed files (each focused, < 500 lines)

New: `src/shared/teamCaps.ts`, `src/main/team.ts`,
`src/renderer/src/hooks/useMe.ts`, `src/renderer/src/components/settings/TeamSection.tsx`,
`src/renderer/src/components/FirstRunIdentity.tsx`.
Changed: `src/shared/ipc.ts` (types + channels), `src/main/ipc.ts` (handlers),
`src/preload/index.ts` (bridge), `AdminPanel.tsx` + `SettingsSections.tsx`
(consolidation), `LeftRail.tsx`/`App.tsx`/`EcosystemBar.tsx`/`sectorActions.tsx`
(enforcement), `App.tsx` (first-run modal mount).
Removed after cutover: `src/main/permissions.ts`, its IPC, and the `PermsTab`.
