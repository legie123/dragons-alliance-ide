// Library — shared contract (single source of truth for the Admin Library).
// Types + category identity (label / colour tokens / icon) live here so the
// data catalog, the CSS, and the React components can never drift apart.
// Colours are CSS custom properties defined in styles.css (:root .--agent-*).
import type { ReactNode } from "react";
import {
  IcCrown, IcCode, IcPalette, IcNodes, IcCube, IcTerminal, IcBrain, IcUsers,
  IcBot, IcPlug, IcGem, IcBook,
} from "../icons";

// ---- taxonomy ----
export type LibCategory =
  | "super" | "core" | "design" | "architecture"
  | "backend" | "devops" | "research" | "business";

export type LibStatus =
  | "live" | "local-only" | "setup-required" | "disabled" | "experimental" | "planned";

export type LibSource = "official-github" | "internal" | "mcp" | "cli" | "local" | "cloud";

export type ConnSystem = "claude-code" | "ruflo" | "mcp" | "terminal" | "dai" | "obsidian" | "graphify";

export type LibUseCase = "design" | "backend" | "architecture" | "terminal" | "fleet" | "research" | "business";

export type PowerLevel = 1 | 2 | 3 | 4 | 5;

// One catalog entry — an agent persona OR a standalone tool.
export type LibEntry = {
  id: string;
  name: string;
  category: LibCategory;
  kind: "agent" | "tool";
  power: PowerLevel;           // drives the "most powerful" sort + power dots
  role: string;                // one-line subtitle
  does: string;                // "what it does" — the fuller description
  status: LibStatus;
  source: LibSource;
  github: string | null;       // verified official URL, or null
  githubNote?: string;         // "part of Ruflo", "not applicable", "not verified", "internal"
  install?: string;            // shell command — COPY only, never auto-run
  test?: string;               // shell command — COPY only
  connected: ConnSystem[];
  useCases: LibUseCase[];
  risks?: string;
  notes?: string;
  launch?: boolean;            // agent → can arm a Claude session seeded with `role`
};

// ---- category identity ----
export type CategoryMeta = {
  slug: LibCategory;           // === id, also the data-cat attribute + CSS token suffix
  label: string;
  icon: (p?: { size?: number }) => ReactNode;
  tone: string;                // primary accent  (var(--agent-<slug>))
  tone2: string;               // secondary accent (var(--agent-<slug>-2))
  blurb: string;               // short description shown in the rail / header
};

export const CATEGORY_ORDER: LibCategory[] = [
  "super", "core", "design", "architecture", "backend", "devops", "research", "business",
];

export const CATEGORY_META: Record<LibCategory, CategoryMeta> = {
  super: {
    slug: "super", label: "Super Agents", icon: (p) => <IcCrown {...p} />,
    tone: "var(--agent-super)", tone2: "var(--agent-super-2)",
    blurb: "Orchestrators & master agents that lead complex, multi-step missions.",
  },
  core: {
    slug: "core", label: "Core Agents", icon: (p) => <IcCode {...p} />,
    tone: "var(--agent-core)", tone2: "var(--agent-core-2)",
    blurb: "Everyday execution — coder, reviewer, tester, researcher, operator.",
  },
  design: {
    slug: "design", label: "Design Agents", icon: (p) => <IcPalette {...p} />,
    tone: "var(--agent-design)", tone2: "var(--agent-design-2)",
    blurb: "UI/UX, visual QA, branding, screenshots, interface optimisation.",
  },
  architecture: {
    slug: "architecture", label: "Architecture Agents", icon: (p) => <IcNodes {...p} />,
    tone: "var(--agent-architecture)", tone2: "var(--agent-architecture-2)",
    blurb: "System design, codebase structure, refactor plans, graph intelligence.",
  },
  backend: {
    slug: "backend", label: "Backend Agents", icon: (p) => <IcCube {...p} />,
    tone: "var(--agent-backend)", tone2: "var(--agent-backend-2)",
    blurb: "APIs, services, database, health, IPC, integrations, auth, queues.",
  },
  devops: {
    slug: "devops", label: "DevOps / Terminal", icon: (p) => <IcTerminal {...p} />,
    tone: "var(--agent-devops)", tone2: "var(--agent-devops-2)",
    blurb: "Terminal workers, Claude / Codex / Ollama / RuFlo, build & deploy.",
  },
  research: {
    slug: "research", label: "Research / Intelligence", icon: (p) => <IcBrain {...p} />,
    tone: "var(--agent-research)", tone2: "var(--agent-research-2)",
    blurb: "Search, lead intelligence, context, docs, Obsidian / Graphify / lean-ctx.",
  },
  business: {
    slug: "business", label: "Business / Operations", icon: (p) => <IcUsers {...p} />,
    tone: "var(--agent-business)", tone2: "var(--agent-business-2)",
    blurb: "Fleet activation, leads, payments, XFlote, Bolt Food, WhatsApp, Discord.",
  },
};

// ---- status identity (colour tokens already exist in styles.css) ----
export const LIB_STATUS_META: Record<LibStatus, { label: string; tone: string }> = {
  live: { label: "LIVE", tone: "var(--st-live, var(--teal))" },
  "local-only": { label: "LOCAL ONLY", tone: "var(--st-local, var(--muted))" },
  "setup-required": { label: "SETUP REQUIRED", tone: "var(--st-setup, var(--gold-soft, #d4af37))" },
  disabled: { label: "DISABLED", tone: "var(--faint, #6b7280)" },
  experimental: { label: "EXPERIMENTAL", tone: "var(--agent-design, #e0489e)" },
  planned: { label: "PLANNED", tone: "var(--accent-violet, #8d5cff)" },
};

// ---- connected-system chips ----
export const CONN_META: Record<ConnSystem, { label: string; icon: (p?: { size?: number }) => ReactNode }> = {
  "claude-code": { label: "Claude Code", icon: (p) => <IcBrain {...p} /> },
  ruflo: { label: "RuFlo", icon: (p) => <IcBot {...p} /> },
  mcp: { label: "MCP", icon: (p) => <IcPlug {...p} /> },
  terminal: { label: "Terminal", icon: (p) => <IcTerminal {...p} /> },
  dai: { label: "Dragons Alliance IDE", icon: (p) => <IcGem {...p} /> },
  obsidian: { label: "Obsidian", icon: (p) => <IcBook {...p} /> },
  graphify: { label: "Graphify", icon: (p) => <IcNodes {...p} /> },
};

export const USECASE_LABEL: Record<LibUseCase, string> = {
  design: "Design", backend: "Backend", architecture: "Architecture",
  terminal: "Terminal", fleet: "Fleet", research: "Research", business: "Business",
};

export const SOURCE_LABEL: Record<LibSource, string> = {
  "official-github": "Official GitHub", internal: "Internal", mcp: "MCP",
  cli: "CLI", local: "Local", cloud: "Cloud",
};
