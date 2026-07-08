// Kit Setup — static catalog of the "kit" tools we detect on first run and guide
// the team member to install. Data only: detection specs + copy. No UI here.
import type { ReactNode } from "react";
import { IcBrain, IcBot, IcNodes, IcGem, IcPlug } from "../components/icons";

export type KitDetect =
  | { kind: "command"; command: string } // system.checkCommand
  | { kind: "tool"; toolId: string } // tools.status find(id).status: off→missing else ready
  | { kind: "gdrive" }; // gdrive.status: signedIn→ready, configured→partial, else missing

export type KitItem = {
  id: string;
  label: string;
  powers: string; // which superpowers it unlocks, e.g. "Cloud · Agents · GODMODE"
  tone: string; // css var, e.g. "var(--sp-ruflo)"
  icon: (p?: { size?: number }) => ReactNode;
  detect: KitDetect;
  install?: string; // copy-paste install command (never auto-run)
  docs?: string; // https URL opened via window.dai.shell.open
  actionLabel?: string; // e.g. "Open Keys"
  actionEvent?: string; // dai:* event dispatched by the action button, e.g. "dai:vault"
  note: string; // one-line guidance
  optional?: boolean; // optional items don't block "kit complete"
};

export const KIT_ITEMS: KitItem[] = [
  {
    id: "claude",
    label: "Claude Code",
    powers: "Cloud · Agents · GODMODE",
    tone: "var(--sp-cloud)",
    icon: (p) => <IcBrain {...p} />,
    detect: { kind: "command", command: "claude" },
    install: "npm i -g @anthropic-ai/claude-code",
    docs: "https://github.com/anthropics/claude-code",
    note: "The Claude Code CLI every terminal and agent runs on.",
  },
  {
    id: "ruflo",
    label: "RuFlo",
    powers: "RuFlo workflow engine",
    tone: "var(--sp-ruflo)",
    icon: (p) => <IcBot {...p} />,
    detect: { kind: "command", command: "ruflo" },
    install: "npm i -g @ruvnet/ruflo",
    docs: "https://github.com/ruvnet/ruflo",
    note: "Agent swarm orchestrator — powers multi-agent flows.",
  },
  {
    id: "graphify",
    label: "Graphify",
    powers: "Neuromap · graph intelligence",
    tone: "var(--sp-graphify)",
    icon: (p) => <IcNodes {...p} />,
    detect: { kind: "command", command: "graphify" },
    install: "pip install graphifyy==0.4.23",
    docs: "https://github.com/safishamsi/graphify",
    note: "Turns your code and vault into the Neuromap knowledge graph.",
  },
  {
    id: "obsidian",
    label: "Obsidian + vault",
    powers: "Neuromap · Research · memory",
    tone: "var(--sp-obsidian)",
    icon: (p) => <IcGem {...p} />,
    detect: { kind: "tool", toolId: "obsidian" },
    docs: "https://obsidian.md/download",
    note: "The Antigravity-Brain knowledge vault — install the app, then sync the team vault.",
  },
  {
    id: "google",
    label: "Google APIs",
    powers: "Drive · Sheets · Forms · Gmail",
    tone: "var(--sp-google)",
    icon: (p) => <IcPlug {...p} />,
    detect: { kind: "gdrive" },
    actionLabel: "Open Keys",
    actionEvent: "dai:vault",
    note: "Optional — add a Google OAuth client in Keys, then Sign in.",
    optional: true,
  },
];
