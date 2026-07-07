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
  { id: "sp:graphify", group: "superpower", label: "Graphify", description: "Graph intelligence engine" },
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
  { id: "adm:library", group: "admin", label: "Library admin", description: "Manage agent catalog & smart tips" },
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
