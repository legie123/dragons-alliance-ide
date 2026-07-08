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
  /** provider id whose setup unlocks this action — renders as SETUP_REQUIRED
   *  and clicking opens Settings ▸ API Power Center (a real route, not a dead click) */
  setupRequired?: string;
  danger?: boolean;
};

export const goto = (v: string) => () => window.dispatchEvent(new CustomEvent("dai:goto", { detail: v }));
export const vault = () => window.dispatchEvent(new CustomEvent("dai:vault"));
export const phone = () => window.dispatchEvent(new CustomEvent("dai:phone"));
export const godmode = () => window.dispatchEvent(new CustomEvent("dai:godmode"));

// LibraryView reads this once on mount (lazy useState initializer) — avoids a
// dai:goto / dai:library-tab race where the target view hasn't mounted yet.
let pendingLibraryTab: "team" | "admin" | "tools" | "guide" | "kit" | null = null;
export function consumeLibraryTab(): "team" | "admin" | "tools" | "guide" | "kit" | null {
  const t = pendingLibraryTab;
  pendingLibraryTab = null;
  return t;
}
// The dock "Admin" button opens the Admin Command Center on its main Catalog
// (leads with the Superpowers Control Room) — NOT the Reference tab.
export const openLibraryAdmin = () => {
  pendingLibraryTab = null;
  goto("library")();
};
/** Admin Command Center ▸ Tools — the operational utilities tab. */
export const openLibraryTools = () => {
  pendingLibraryTab = "tools";
  goto("library")();
};
/** Admin Command Center ▸ Quick Guide — Claude & Superpowers operator guide. */
export const openLibraryGuide = () => {
  pendingLibraryTab = "guide";
  goto("library")();
};
/** Admin Command Center ▸ Kit — the team-member onboarding setup checklist. */
export const openLibraryKit = () => {
  pendingLibraryTab = "kit";
  goto("library")();
};
// Open a superpower's full GODMODE-style operational panel (godmode has its own).
export const openSuperpower = (id: string) =>
  id === "godmode"
    ? window.dispatchEvent(new CustomEvent("dai:godmode"))
    : window.dispatchEvent(new CustomEvent("dai:superpower", { detail: id }));
/** Open the ⌘K palette from a menu item (App listens for dai:palette). */
export const openPalette = () => window.dispatchEvent(new CustomEvent("dai:palette"));
/** Run the real superpowers health sweep (App listens; probes ruflo + graphify). */
export const runHealthSweep = () => window.dispatchEvent(new CustomEvent("dai:healthcheck"));
/** Inspect Graph — open Neuromap WITH its real diagnostics panel (true graph counts). */
export const inspectGraph = () => {
  goto("neuromap")();
  setTimeout(() => window.dispatchEvent(new CustomEvent("dai:sector-action", { detail: "nm:diag" })), 650);
  window.dai.audit.log("graphify-inspect", "opened Neuromap diagnostics");
};
/** Broadcast — open the Agents cockpit and focus the mission-broadcast input. */
export const agentsBroadcast = () => {
  goto("agents")();
  setTimeout(() => window.dispatchEvent(new CustomEvent("dai:sector-action", { detail: "agents:focus-broadcast" })), 500);
};

/** LLM Hub: run the REAL provider detection and toast the honest summary. */
export const llmDetect = () => async () => {
  const id = pushToast({ kind: "checking", title: "Detecting model providers…", detail: "Ollama · CLI · saved keys" });
  try {
    const h = await window.dai.llm.status();
    const act = h.providers.filter((p) => p.state === "active").map((p) => p.label).join(", ");
    updateToast(id, {
      kind: h.active > 0 ? "success" : "info",
      title: `${h.active} active · ${h.configured} configured · ${h.providers.length - h.active - h.configured} need setup`,
      detail: act || "no live provider — start Ollama or add a key in the Power Center",
      ttl: 6500,
    });
  } catch (e) {
    updateToast(id, { kind: "error", title: "Detection failed", detail: String(e), ttl: 6000 });
  }
};
/** LLM Hub: REAL on-demand connection test for one provider, honest toast. */
export const llmTestToast = (provider: string) => async () => {
  const id = pushToast({ kind: "checking", title: `Testing ${provider}…` });
  try {
    const r = await window.dai.llm.test(provider);
    updateToast(id, { kind: r.ok ? "success" : "error", title: `${provider}: ${r.message}`, ttl: 6000 });
  } catch (e) {
    updateToast(id, { kind: "error", title: `${provider} test failed`, detail: String(e), ttl: 6000 });
  }
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

/**
 * Sign in with Google — runs the REAL OAuth loopback flow (main process, user's
 * own client). Honest toasts: checking → signed-in-as / true failure. Never a
 * fake LIVE; status flips only when a refresh token actually lands.
 */
export const googleSignIn = () => async () => {
  const id = pushToast({ kind: "checking", title: "Signing in with Google…", detail: "browser consent → loopback" });
  try {
    const s = await window.dai.gdrive.auth();
    updateToast(id, {
      kind: s.signedIn ? "success" : "error",
      title: s.signedIn ? `Signed in${s.email ? " as " + s.email : ""}` : "Sign-in did not complete",
      detail: s.signedIn ? "Drive · Sheets · Forms are live" : "finish the consent in the browser, then retry",
      ttl: 6500,
    });
    window.dai.audit.log("google-signin", s.signedIn ? `ok ${s.email ?? ""}` : "incomplete");
  } catch (e) {
    updateToast(id, { kind: "error", title: "Google sign-in failed", detail: String(e), ttl: 6500 });
  }
  refreshTools();
};

/** Sync the Obsidian vault via the REAL git engine — honest toast on result. */
export const syncVaultToast = () => {
  const id = pushToast({ kind: "checking", title: "Syncing vault…", detail: "git add · commit · push" });
  window.dai.vaultSync.sync().then(
    (r) => {
      updateToast(id, { kind: r.ok ? "success" : "error", title: r.ok ? "Vault synced" : "Vault sync failed", detail: r.ok ? r.detail : (r.error ?? "sync failed"), ttl: 6000 });
      window.dai.audit.log("vault-sync", r.ok ? r.detail : `error: ${r.error ?? "?"}`);
    },
    (e) => updateToast(id, { kind: "error", title: "Vault sync failed", detail: String(e), ttl: 6000 }),
  );
};
const vaultChatPrompt =
  "You are inside Dragons Alliance IDE. Build a local-only vault chat/RAG plan for ~/Documents/Obsidian/Antigravity-Brain. First inspect files, existing IPC, neuromap graph, security boundaries, and config. Do not invent credentials. Return a safe phased implementation with tests.";
const superpowersRepairPrompt =
  "Audit Dragons Alliance IDE SUPERPOWERS end to end: Obsidian, Graphify, RuFlo, Claude, Agents, GODMODE, Google APIs. Find dead clicks, missing handlers, auth gates, feature flags, and backend gaps. Patch only safe local code, keep every click actionable, log actions, and report verified vs blocked.";

// ---- superpowers (B) — the seven real powers, with quick panels ----
// status is resolved LIVE by the dock from real probes; `statusOf` maps probe
// data → honest OpStatus. Inputs: tools statuses by id, live agent count, google cfg.
export type SuperpowerDef = {
  id: string;
  label: string;
  icon: (p?: { size?: number }) => ReactNode;
  role: string; // one-line truth of what it is
  statusOf: (env: { tool: (id: string) => string | undefined; liveAgents: number; google: { configured: boolean; signedIn: boolean }; llm: { active: number; configured: number } }) => OpStatus;
  actions: QuickAction[];
  // ---- operational panel metadata (GODMODE-style panel, one template for all) ----
  tone: string;              // primary accent (css var)
  tone2: string;             // secondary accent (css var)
  what: string;              // what this superpower IS
  feeds: string;             // what it powers inside the IDE
  connected: string[];       // connected services / data (display chips)
  sector?: string;           // related view id → "Open sector" action (must satisfy isView)
  healthId?: "ruflo" | "graphify"; // real superpowers.health() probe, when one exists
  diag?: "vault" | "google" | "agents" | "llm"; // real deep-probe kind for the diagnostics button
  logKinds: string[];        // audit-kind substrings that belong to this superpower (real logs)
  source: string;            // footer: where its truth comes from
  risk?: string;             // footer: honest risk note
};

export const SUPERPOWERS: SuperpowerDef[] = [
  {
    id: "godmode", label: "GODMODE", icon: (p) => <IcCrown {...p} />, role: "supreme command center",
    statusOf: ({ tool }) => (tool("godmode") === "live" ? "live" : tool("godmode") === "ready" ? "idle" : "setup-required"),
    tone: "var(--sp-godmode)", tone2: "var(--sp-godmode-2)",
    what: "The master control center — system health, active mission, global command and emergency stop over the whole IDE.",
    feeds: "Aggregates every other superpower's health and drives cross-cutting operations.",
    connected: ["Agents", "Terminals", "Vault", "Google", "Audit"], sector: "agents",
    logKinds: ["access-denied", "term-launch", "claude-prompt-arm"], source: "live probes · godmode-lab",
    actions: [{ id: "gm-open", label: "Open GODMODE", run: godmode }],
  },
  {
    id: "ruflo", label: "RuFlo", icon: (p) => <IcBot {...p} />, role: "RuFlo workflow engine · orchestrator",
    statusOf: ({ tool }) => (tool("ruflo") === "live" ? "live" : tool("ruflo") === "ready" ? "idle" : "setup-required"),
    tone: "var(--sp-ruflo)", tone2: "var(--sp-ruflo-2)",
    what: "The RuFlo workflow engine — orchestrates agent swarms, task queues and flows behind this IDE's agents.",
    feeds: "Powers multi-agent coordination, memory routing and the swarm the Agents sector controls.",
    connected: ["RuFlo CLI", "ruvector.db", "Agents", "MCP"], sector: "agents", healthId: "ruflo",
    logKinds: ["ruflo"], source: "ruflo status (real CLI probe) · ruvector.db mtime", risk: "Ignite runs the real ruflo CLI in a terminal.",
    actions: [
      { id: "rf-ignite", label: "Ignite (health check)", run: rufloIgnite() },
      { id: "rf-reflow", label: "Reflow", disabledReason: "pending backend — no reflow op in the RuFlo CLI yet" },
      { id: "rf-flows", label: "Continue Flow", run: armTermToast("ruflo session list", "~", "Ruflo sessions") },
      { id: "rf-queue", label: "View Task Queue", run: armTermToast("ruflo task list", "~", "Ruflo task queue") },
      { id: "rf-logs", label: "Open Logs", run: admin("audit") },
      { id: "rf-mission", label: "Broadcast Mission (Agents)", run: goto("agents") },
    ],
  },
  {
    id: "agents", label: "Agents", icon: (p) => <IcSigil {...p} />, role: "swarm activation & control",
    statusOf: ({ liveAgents }) => (liveAgents > 0 ? "live" : "idle"),
    tone: "var(--sp-agents)", tone2: "var(--sp-agents-2)",
    what: "AI mission control — launch Claude agents, broadcast prompts to the swarm, inspect live transcripts.",
    feeds: "Drives every running Claude session and the Agents mission-control sector.",
    connected: ["Claude Code", "Terminals", "Transcripts"], sector: "agents",
    diag: "agents", logKinds: ["term-launch", "claude-prompt-arm", "agent"], source: "live transcript parse (~/.claude/projects)",
    actions: [
      { id: "ag-view", label: "Open Mission Control", run: goto("agents") },
      { id: "ag-launch", label: "Launch Claude Agent", run: deployTerm("claude", "~") },
      { id: "ag-broadcast", label: "Broadcast", run: agentsBroadcast },
      { id: "ag-logs", label: "Inspect Live Transcripts", run: goto("agents") },
      { id: "ag-swarm", label: "Open Swarm Map (Neuromap)", run: goto("neuromap") },
      { id: "ag-assign", label: "Assign Sector", disabledReason: "pending backend — sector tagging not built yet" },
    ],
  },
  {
    id: "cloud", label: "Claude", icon: (p) => <IcCloud {...p} />, role: "heavy AI execution · sessions & cost",
    statusOf: ({ liveAgents }) => (liveAgents > 0 ? "live" : "idle"),
    tone: "var(--sp-cloud)", tone2: "var(--sp-cloud-2)",
    what: "Claude reasoning — launch and manage heavy Claude sessions; watch model, context and token cost.",
    feeds: "The Claude runtime the terminals and agents execute against; metrics track its cost.",
    connected: ["Claude Code", "Terminals", "Metrics"], sector: "metrics",
    diag: "agents", logKinds: ["term-launch", "claude-prompt-arm", "term-arm"], source: "live session count + terminal state",
    actions: [
      { id: "cl-launch", label: "Launch Claude Session", run: deployTerm("claude", "~") },
      { id: "cl-term", label: "Open Terminal", run: goto("ide") },
      { id: "cl-continue", label: "Continue Session", disabledReason: "pending backend — session resume not wired yet" },
      { id: "cl-stop", label: "Stop Session (Agents)", run: goto("agents") },
      { id: "cl-metrics", label: "View Tokens (Metrics)", run: goto("metrics") },
      { id: "cl-tips", label: "Claude Tips", run: openLibraryGuide },
      { id: "cl-logs", label: "Open Logs", run: admin("audit") },
    ],
  },
  {
    id: "graphify", label: "Graphify", icon: (p) => <IcNodes {...p} />, role: "graph intelligence · Neuromap engine",
    statusOf: ({ tool }) => (tool("graphify") === "live" ? "live" : tool("graphify") === "ready" ? "idle" : "setup-required"),
    tone: "var(--sp-graphify)", tone2: "var(--sp-graphify-2)",
    what: "Graphify turns the codebase, docs and vault into a queryable knowledge graph — the engine behind Neuromap.",
    feeds: "Powers the Neuromap sector and the digest that maps files, projects and agents.",
    connected: ["Neuromap", "Graph digest", "Obsidian vault"], sector: "neuromap", healthId: "graphify",
    logKinds: ["graphify"], source: "graphify digest mtime + launchd job", risk: "Regenerate arms the real `graphify update .` command.",
    actions: [
      { id: "gv-map", label: "Open Map (Neuromap)", run: goto("neuromap") },
      { id: "gv-digest", label: "Open Graph Digest", run: graphifyOpenDigest() },
      { id: "gv-regen", label: "Generate Digest", run: graphifyRegen() },
      { id: "gv-inspect", label: "Inspect Graph", run: inspectGraph },
      { id: "gv-library", label: "Open Admin Library", run: openLibraryAdmin },
    ],
  },
  {
    id: "obsidian", label: "Obsidian", icon: (p) => <IcGem {...p} />, role: "knowledge vault · business brain",
    statusOf: ({ tool }) => (tool("obsidian") === "live" ? "live" : tool("obsidian") === "ready" ? "local-only" : "setup-required"),
    tone: "var(--sp-obsidian)", tone2: "var(--sp-obsidian-2)",
    what: "The Antigravity-Brain vault — notes, knowledge and the business brain, synced with git and Drive.",
    feeds: "Feeds Neuromap, the Research desk and long-term memory; syncable to Google Drive.",
    connected: ["Vault (git)", "Neuromap", "Drive"], sector: "neuromap",
    diag: "vault", logKinds: ["obsidian", "vault", "team-permissions"], source: "vault .lock + pgrep + git status", risk: "Sync commits & pushes the vault when a remote is set.",
    actions: [
      { id: "obs-open", label: "Open Vault (Obsidian)", run: openObsidian },
      { id: "obs-map", label: "Open Neuromap", run: goto("neuromap") },
      { id: "obs-search", label: "Search Notes (Research)", run: goto("research") },
      { id: "obs-sync", label: "Sync Vault", run: syncVaultToast },
      { id: "obs-drive", label: "Open Drive", run: goto("drive") },
      { id: "obs-chat", label: "Plan Vault Chat", run: deployClaudeWithPrompt(vaultChatPrompt, "~/Documents/Obsidian/Antigravity-Brain") },
    ],
  },
  {
    id: "google", label: "Google APIs", icon: (p) => <IcPlug {...p} />, role: "Drive · Sheets · Forms · Gmail",
    statusOf: ({ google }) => (google.signedIn ? "live" : google.configured ? "partial" : "setup-required"),
    tone: "var(--sp-google)", tone2: "var(--sp-google-2)",
    what: "External Google integration — Drive, Sheets, Forms and Gmail via a local OAuth client.",
    feeds: "Backs the Drive Ops sector; needs a Google Cloud OAuth client + consent to go live.",
    connected: ["Drive", "Sheets", "Forms", "Gmail"], sector: "drive",
    diag: "google", logKinds: ["google", "drive", "gdrive"], source: "~/.config/dai/google.json + real API health", risk: "Sign in runs a real OAuth loopback flow.",
    actions: [
      { id: "gg-signin", label: "Sign in with Google", run: googleSignIn() },
      { id: "gg-drive", label: "Open Drive Ops", run: goto("drive") },
      { id: "gg-keys", label: "Open Setup (Keys)", run: vault },
      { id: "gg-health", label: "API Health", run: admin("health") },
      { id: "gg-integrations", label: "Open Integrations", run: admin("integrations") },
      { id: "gg-repair", label: "Arm Repair Agent", run: deployClaudeWithPrompt(superpowersRepairPrompt, "~/code/dragons-alliance-ide") },
    ],
  },
  {
    id: "llmhub", label: "LLM Hub", icon: (p) => <IcZap {...p} />, role: "model connections · local & API",
    statusOf: ({ llm }) => (llm.active > 0 ? "live" : llm.configured > 0 ? "partial" : "setup-required"),
    tone: "var(--sp-llmhub)", tone2: "var(--sp-llmhub-2)",
    what: "Every model the platform can talk to — local Ollama/Hermes, the Claude CLI, and keyed APIs — detected for REAL, never assumed.",
    feeds: "Powers the Sector Agent chat (local, no keys needed) and any model-backed feature; keys live in Settings ▸ API Power Center.",
    connected: ["Ollama 11434", "Hermes (local)", "Claude CLI", "API Power Center"], sector: "ide",
    diag: "llm", logKinds: ["llm"], source: "127.0.0.1:11434 real probe · CLI on disk · saved keys (masked, 0600)",
    risk: "Chat runs on the LOCAL Ollama server; keyed APIs are only touched by an explicit Test Connection.",
    actions: [
      { id: "llm-detect", label: "Detect Providers", run: llmDetect() },
      { id: "llm-test", label: "Test Ollama Connection", run: llmTestToast("ollama") },
      { id: "llm-power", label: "Open API Power Center", run: admin("powercenter") },
      { id: "llm-logs", label: "Open Logs", run: admin("audit") },
    ],
  },
];

// ---- More launcher (C/D/E) — categorized, honest ----
export type MoreItem = {
  id: string; label: string; sub: string; icon: () => ReactNode;
  status?: OpStatus; run?: () => void; disabledReason?: string;
  cap?: string; // team capability required to even SEE this item (LeftRail hides it otherwise)
};
export const MORE_CATEGORIES: { title: string; items: MoreItem[] }[] = [
  {
    // Tools = the OPERATIONS menu — every item is a real route/panel, no junk drawer.
    title: "OPERATIONS",
    items: [
      { id: "controlroom", label: "Superpowers Control Room", sub: "live status + panels · admin", icon: () => <IcCrown />, status: "live", run: openLibraryAdmin, cap: "adm:library" },
      { id: "library", label: "Admin Library", sub: "agents · superpowers · tools · integrations", icon: () => <IcGem />, status: "live", run: goto("library"), cap: "adm:library" },
      { id: "palette", label: "Command Palette", sub: "⌘K · every action, one search", icon: () => <IcSearch />, status: "live", run: openPalette },
      { id: "termworkers", label: "Terminal Workers", sub: "master + workers · broadcast", icon: () => <IcTerminal />, status: "live", run: goto("ide") },
      { id: "diagnostics", label: "Diagnostics (GODMODE)", sub: "system health · full check", icon: () => <IcCrown />, status: "live", run: godmode },
      { id: "healthcheck", label: "Health Check", sub: "ruflo + graphify real probes", icon: () => <IcZap />, status: "live", run: runHealthSweep },
      { id: "logs", label: "Logs (Audit)", sub: "action trail · JSONL 0600", icon: () => <IcChart />, status: "local-only", run: admin("audit") },
      { id: "quickguide", label: "Quick Guide", sub: "Claude & Superpowers operator guide", icon: () => <IcFlask />, status: "live", run: openLibraryGuide, cap: "adm:library" },
      { id: "opsettings", label: "Settings", sub: "IDE configuration", icon: () => <IcSend />, status: "local-only", run: admin("settings") },
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
      { id: "perms", label: "Permissions", sub: "team & roles · synced via vault", icon: () => <IcUsers />, status: "local-only", run: admin("perms") },
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
