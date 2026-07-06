// Dragons Alliance IDE — OPERATIONAL REGISTRY (single source of truth).
// Everything visible in the chrome is declared here with its REAL capability:
// a working handler, a navigation target, or an honest disabled reason.
// RULE: no dead clicks, no fake status. If we can't prove it, we say so.
import type { ReactNode } from "react";
import {
  IcTerminal, IcBot, IcCode, IcBrain, IcCloud, IcChart, IcMonitor, IcPalette,
  IcSearch, IcRadar, IcGem, IcNodes, IcCrown, IcPlug, IcKey, IcPhone, IcZap,
  IcSnake, IcSigil, IcFlask, IcUsers, IcSend, IcFolder,
} from "./components/icons";
import { pushToast, updateToast } from "./toast";

// ---- status model (49) ----
export type OpStatus =
  | "live" | "idle" | "running" | "offline" | "error" | "partial"
  | "setup-required" | "pending-backend" | "local-only" | "unknown" | "disabled";
export const STATUS_META: Record<OpStatus, { label: string; color: string }> = {
  live: { label: "live", color: "var(--teal)" },
  running: { label: "running", color: "var(--gold-soft)" },
  idle: { label: "idle", color: "var(--muted)" },
  partial: { label: "partial", color: "var(--orange)" },
  offline: { label: "offline", color: "var(--faint)" },
  error: { label: "error", color: "var(--st-error)" },
  "setup-required": { label: "setup required", color: "var(--accent-ember)" },
  "pending-backend": { label: "pending backend", color: "var(--accent-violet)" },
  "local-only": { label: "local only", color: "var(--blue)" },
  unknown: { label: "unknown", color: "var(--faint)" },
  disabled: { label: "disabled", color: "var(--faint)" },
};

// ---- core sectors (A) ----
export type SectorId = "ide" | "agents" | "code" | "neuromap" | "drive" | "metrics" | "preview" | "creative";
export const CORE_SECTORS: { id: SectorId; label: string; icon: () => ReactNode }[] = [
  { id: "ide", label: "Terminal", icon: () => <IcTerminal /> },
  { id: "agents", label: "Agents", icon: () => <IcBot /> },
  { id: "code", label: "Code", icon: () => <IcCode /> },
  { id: "neuromap", label: "Neuromap", icon: () => <IcBrain /> },
  { id: "drive", label: "Drive", icon: () => <IcCloud /> },
  { id: "metrics", label: "Metrics", icon: () => <IcChart /> },
  { id: "preview", label: "Preview", icon: () => <IcMonitor /> },
  { id: "creative", label: "Creative", icon: () => <IcPalette /> },
];

// ---- actions: every click resolves to ONE of these shapes ----
export type QuickAction = {
  id: string;
  label: string;
  /** real handler — omit when disabled */
  run?: () => void;
  /** honest reason shown when there is no real handler */
  disabledReason?: string;
  danger?: boolean;
};

export const goto = (v: string) => () => window.dispatchEvent(new CustomEvent("dai:goto", { detail: v }));
export const vault = () => window.dispatchEvent(new CustomEvent("dai:vault"));
export const phone = () => window.dispatchEvent(new CustomEvent("dai:phone"));
export const godmode = () => window.dispatchEvent(new CustomEvent("dai:godmode"));

// LibraryView reads this once on mount (lazy useState initializer) — avoids a
// dai:goto / dai:library-tab race where the target view hasn't mounted yet.
let pendingLibraryTab: "team" | "admin" | null = null;
export function consumeLibraryTab(): "team" | "admin" | null {
  const t = pendingLibraryTab;
  pendingLibraryTab = null;
  return t;
}
export const openLibraryAdmin = () => {
  pendingLibraryTab = "admin";
  goto("library")();
};
let SEQ = 1;
export const deployTerm = (cmd: string, cwd: string) => () => {
  window.dai.term.create({ id: `ign${Date.now().toString(36)}${SEQ++}`, cmd, cwd });
  window.dai.audit.log("term-launch", `${cmd} @ ${cwd}`);
  goto("ide")();
};
export const deployClaudeWithPrompt = (prompt: string, cwd: string) => () => {
  const id = `ign${Date.now().toString(36)}${SEQ++}`;
  window.dai.term.create({ id, cmd: "claude", cwd });
  setTimeout(() => window.dai.term.write(id, prompt), 1800);
  window.dai.audit.log("claude-prompt-arm", `${prompt.slice(0, 80)} @ ${cwd}`);
  goto("ide")();
};
export const armTerm = (typed: string, cwd: string) => () => {
  const id = `ign${Date.now().toString(36)}${SEQ++}`;
  window.dai.term.create({ id, cmd: "shell", cwd });
  setTimeout(() => window.dai.term.write(id, typed), 1400);
  window.dai.audit.log("term-arm", `${typed} @ ${cwd}`);
  goto("ide")();
};
export const openObsidian = () => window.dai.tools.action("open-obsidian");
export const openGraphify = () => window.dai.tools.action("open-graphify");

/** Nudge the dock's live probes to re-run right after an action changed state. */
export const refreshTools = () => window.dispatchEvent(new CustomEvent("dai:refresh-tools"));

/**
 * Ignite Ruflo — real IPC health probe (`ruflo status` in HOME, timeout-guarded).
 * Shows CHECKING, then an HONEST result toast (engine ready / running / error),
 * then refreshes the dock. No fake LIVE, no command that errors by construction.
 */
export const rufloIgnite = () => async () => {
  const id = pushToast({ kind: "checking", title: "Igniting Ruflo…", detail: "checking engine" });
  try {
    const h = await window.dai.superpowers.health("ruflo");
    updateToast(id, {
      kind: h.ok ? "success" : "error",
      title: h.message,
      detail: h.details.join(" · ") || undefined,
      ttl: 6000,
    });
    window.dai.audit.log("ruflo-ignite", `${h.status}: ${h.message}`);
  } catch (e) {
    updateToast(id, { kind: "error", title: "Ruflo check failed", detail: String(e), ttl: 6000 });
  }
  refreshTools();
};

/** Arm a REAL command in a terminal AND toast what was launched (never silent). */
export const armTermToast = (typed: string, cwd: string, title: string) => () => {
  armTerm(typed, cwd)();
  pushToast({ kind: "info", title, detail: `running: ${typed}`, ttl: 3800 });
};

/** Open the real graph digest via IPC — honest toast when it isn't generated yet. */
export const graphifyOpenDigest = () => async () => {
  const id = pushToast({ kind: "checking", title: "Opening graph digest…" });
  try {
    const r = await window.dai.superpowers.openDigest();
    updateToast(id, { kind: r.ok ? "success" : "error", title: r.message, ttl: r.ok ? 3500 : 6500 });
    window.dai.audit.log("graphify-open-digest", r.message);
  } catch (e) {
    updateToast(id, { kind: "error", title: "Could not open digest", detail: String(e), ttl: 6000 });
  }
};

/** Regenerate the digest by running the REAL graphify pipeline in the repo, visibly. */
export const graphifyRegen = () => () => {
  armTerm("graphify update .", "~/code/dragons-alliance-ide")();
  pushToast({ kind: "info", title: "Regenerating graph digest", detail: "graphify update . — watch the terminal", ttl: 4500 });
  window.dai.audit.log("graphify-regen", "armed graphify update . in repo");
  setTimeout(refreshTools, 8000);
};
export const admin = (tab: string) => () => window.dispatchEvent(new CustomEvent("dai:admin", { detail: tab }));
const vaultChatPrompt =
  "You are inside Dragons Alliance IDE. Build a local-only vault chat/RAG plan for ~/Documents/Obsidian/Antigravity-Brain. First inspect files, existing IPC, neuromap graph, security boundaries, and config. Do not invent credentials. Return a safe phased implementation with tests.";
const superpowersRepairPrompt =
  "Audit Dragons Alliance IDE SUPERPOWERS end to end: Obsidian, Grapevine, Ruflo, Cloud, Agents, GODMODE, Google APIs. Find dead clicks, missing handlers, auth gates, feature flags, and backend gaps. Patch only safe local code, keep every click actionable, log actions, and report verified vs blocked.";

// ---- superpowers (B) — the seven real powers, with quick panels ----
// status is resolved LIVE by the dock from real probes; `statusOf` maps probe
// data → honest OpStatus. Inputs: tools statuses by id, live agent count, google cfg.
export type SuperpowerDef = {
  id: string;
  label: string;
  icon: (p?: { size?: number }) => ReactNode;
  role: string; // one-line truth of what it is
  statusOf: (env: { tool: (id: string) => string | undefined; liveAgents: number; google: { configured: boolean; signedIn: boolean } }) => OpStatus;
  actions: QuickAction[];
};

export const SUPERPOWERS: SuperpowerDef[] = [
  {
    id: "obsidian", label: "Obsidian", icon: (p) => <IcGem {...p} />, role: "knowledge vault · business brain",
    statusOf: ({ tool }) => (tool("obsidian") === "live" ? "live" : tool("obsidian") === "ready" ? "local-only" : "setup-required"),
    actions: [
      { id: "obs-open", label: "Open Vault (Obsidian)", run: openObsidian },
      { id: "obs-map", label: "Open Neuromap", run: goto("neuromap") },
      { id: "obs-search", label: "Search Notes (Research)", run: goto("research") },
      { id: "obs-sync", label: "Sync Vault", run: admin("team") },
      { id: "obs-chat", label: "Plan Vault Chat", run: deployClaudeWithPrompt(vaultChatPrompt, "~/Documents/Obsidian/Antigravity-Brain") },
    ],
  },
  {
    id: "graphify", label: "Grapevine", icon: (p) => <IcNodes {...p} />, role: "neural relationship engine",
    statusOf: ({ tool }) => (tool("graphify") === "live" ? "live" : tool("graphify") === "ready" ? "idle" : "setup-required"),
    actions: [
      { id: "gv-map", label: "Open Map (Neuromap)", run: goto("neuromap") },
      { id: "gv-digest", label: "Open Graph Digest", run: graphifyOpenDigest() },
      { id: "gv-regen", label: "Regenerate Digest", run: graphifyRegen() },
      { id: "gv-research", label: "Show Research Lens", run: goto("research") },
      { id: "gv-agents", label: "Show Agents Layer", run: goto("neuromap") },
    ],
  },
  {
    id: "ruflo", label: "Ruflo", icon: (p) => <IcBot {...p} />, role: "workflow orchestrator",
    statusOf: ({ tool }) => (tool("ruflo") === "live" ? "live" : tool("ruflo") === "ready" ? "idle" : "setup-required"),
    actions: [
      { id: "rf-ignite", label: "Ignite (health check)", run: rufloIgnite() },
      { id: "rf-mission", label: "Broadcast Mission (Agents)", run: goto("agents") },
      { id: "rf-queue", label: "View Task Queue", run: armTermToast("ruflo task list", "~", "Ruflo task queue") },
      { id: "rf-flows", label: "Continue Flow", run: armTermToast("ruflo session list", "~", "Ruflo sessions") },
    ],
  },
  {
    id: "cloud", label: "Cloud", icon: (p) => <IcCloud {...p} />, role: "heavy AI execution · Claude sessions",
    statusOf: ({ liveAgents }) => (liveAgents > 0 ? "live" : "idle"),
    actions: [
      { id: "cl-launch", label: "Launch Claude Session", run: deployTerm("claude", "~") },
      { id: "cl-mc", label: "Open Mission Control", run: goto("agents") },
      { id: "cl-metrics", label: "View Tokens (Metrics)", run: goto("metrics") },
      { id: "cl-stop", label: "Open Terminal Stop Controls", run: goto("ide") },
    ],
  },
  {
    id: "agents", label: "Agents", icon: (p) => <IcSigil {...p} />, role: "swarm activation & control",
    statusOf: ({ liveAgents }) => (liveAgents > 0 ? "live" : "idle"),
    actions: [
      { id: "ag-view", label: "Open Mission Control", run: goto("agents") },
      { id: "ag-launch", label: "Launch Claude Agent", run: deployTerm("claude", "~") },
      { id: "ag-logs", label: "Inspect Live Transcripts", run: goto("agents") },
      { id: "ag-assign", label: "Assign Sector", run: goto("agents") },
    ],
  },
  {
    id: "godmode", label: "GODMODE", icon: (p) => <IcCrown {...p} />, role: "supreme command center",
    statusOf: ({ tool }) => (tool("godmode") === "live" ? "live" : tool("godmode") === "ready" ? "idle" : "setup-required"),
    actions: [{ id: "gm-open", label: "Open GODMODE", run: godmode }],
  },
  {
    id: "google", label: "Google APIs", icon: (p) => <IcPlug {...p} />, role: "Drive · Sheets · Forms · Gmail",
    statusOf: ({ google }) => (google.signedIn ? "live" : google.configured ? "partial" : "setup-required"),
    actions: [
      { id: "gg-drive", label: "Open Drive Ops", run: goto("drive") },
      { id: "gg-keys", label: "Credentials (Keys)", run: vault },
      { id: "gg-health", label: "API Health", run: admin("health") },
      { id: "gg-repair", label: "Cloud Repair Prompt", run: deployClaudeWithPrompt(superpowersRepairPrompt, "~/code/dragons-alliance-ide") },
    ],
  },
];

// ---- More launcher (C/D/E) — categorized, honest ----
export type MoreItem = {
  id: string; label: string; sub: string; icon: () => ReactNode;
  status?: OpStatus; run?: () => void; disabledReason?: string;
};
export const MORE_CATEGORIES: { title: string; items: MoreItem[] }[] = [
  {
    title: "LIBRARY",
    items: [
      { id: "library", label: "Library", sub: "agents · superpowers · shortcuts · tips", icon: () => <IcGem />, status: "live", run: goto("library") },
    ],
  },
  {
    title: "INTELLIGENCE",
    items: [
      { id: "research", label: "Research", sub: "vault intelligence desk", icon: () => <IcSearch />, status: "live", run: goto("research") },
      { id: "radar", label: "GitHub Radar", sub: "hot repo scanner", icon: () => <IcRadar />, status: "idle", run: () => { goto("radar")(); window.dai.radar.refresh(); } },
      { id: "obscura", label: "Obscura", sub: "external research module", icon: () => <IcFlask />, status: "setup-required", run: goto("research") },
    ],
  },
  {
    title: "OUTPUT",
    items: [
      { id: "previewx", label: "Preview Engine", sub: "live app + Neo browser", icon: () => <IcMonitor />, status: "idle", run: goto("preview") },
      { id: "creativex", label: "Creative APIs", sub: "generation connectors", icon: () => <IcPalette />, status: "setup-required", run: goto("creative") },
    ],
  },
  {
    title: "ADMIN",
    items: [
      { id: "keys", label: "Keys", sub: "secrets · local 0600", icon: () => <IcKey />, status: "local-only", run: vault },
      { id: "phone", label: "Phone", sub: "code from your phone", icon: () => <IcPhone />, status: "live", run: phone },
      { id: "googlex", label: "Google APIs", sub: "OAuth + services", icon: () => <IcPlug />, run: goto("drive") },
      { id: "audit", label: "Audit", sub: "action trail · JSONL 0600", icon: () => <IcChart />, status: "local-only", run: admin("audit") },
      { id: "settings", label: "Settings", sub: "IDE configuration", icon: () => <IcSend />, status: "local-only", run: admin("settings") },
      { id: "perms", label: "Permissions", sub: "team & roles · local", icon: () => <IcUsers />, status: "local-only", run: admin("perms") },
    ],
  },
  {
    title: "EXPERIMENTAL",
    items: [
      { id: "omnigent", label: "Omnigent", sub: "meta-orchestrator", icon: () => <IcSnake />, status: "local-only", run: armTerm("omnigent", "~") },
      { id: "leanctx", label: "lean-ctx", sub: "context engineering", icon: () => <IcZap />, status: "local-only", run: armTerm("lean-ctx stats", "~") },
      { id: "team", label: "Obsidian Team", sub: "vault git sync · remote optional", icon: () => <IcUsers />, status: "local-only", run: admin("team") },
    ],
  },
];

// ---- Operational Truth (50): computed, never invented ----
export function operationalTruth() {
  let real = 0, pending = 0;
  for (const sp of SUPERPOWERS) for (const a of sp.actions) (a.run ? real++ : pending++);
  for (const c of MORE_CATEGORIES) for (const i of c.items) (i.run ? real++ : pending++);
  return { real, pending };
}
