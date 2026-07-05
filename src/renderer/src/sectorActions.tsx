// SECTOR ACTION REGISTRY — contextual actions for the Right Rail + palette
// recommendations. Same honesty contract as the superpowers registry: every
// entry either has a REAL handler or a visible disabledReason. NEVER add
// disabled actions to SUPERPOWERS (doctor guards that file) — they live here.
import type { ReactNode } from "react";
import type { SectorId } from "./registry";
import { admin, armTerm, deployTerm, goto, openObsidian, openGraphify } from "./registry";
import { queryClient } from "./queryClient";
import {
  IcPlay, IcBroadcast, IcTerminal, IcEraser, IcFile, IcBot, IcSend, IcSave,
  IcBranch, IcCode, IcBrain, IcRefresh, IcNodes, IcGem, IcSearch, IcUsers,
  IcChart, IcCamera, IcExternal, IcMonitor, IcPalette, IcImage, IcCube,
} from "./components/icons";

export type SectorAction = {
  id: string;
  label: string;
  icon: () => ReactNode;
  /** real handler — omit when the capability doesn't exist yet */
  run?: () => void;
  /** honest reason shown when there is no real handler */
  disabledReason?: string;
  /** rendered as the sector-accented primary CTA */
  primary?: boolean;
};

/** In-view actions travel over a renderer-local event; the owning view
 *  (always mounted for "ide", mounted-when-active for the rest — and the rail
 *  only shows the ACTIVE sector) subscribes while mounted. */
export const sectorEvent = (action: string) => () =>
  window.dispatchEvent(new CustomEvent("dai:sector-action", { detail: action }));

const refreshAll = () => { queryClient.invalidateQueries(); };
const healthCheck = () => { queryClient.invalidateQueries({ queryKey: ["tools"] }); };

export const SECTOR_ACTIONS: Record<SectorId, SectorAction[]> = {
  ide: [
    { id: "t-run", label: "Run Command", icon: () => <IcPlay />, primary: true, run: sectorEvent("term:focus-master") },
    { id: "t-runall", label: "Mirror to Workers", icon: () => <IcBroadcast />, run: sectorEvent("term:toggle-sync") },
    { id: "t-worker", label: "Start Worker", icon: () => <IcTerminal />, run: deployTerm("shell", "~") },
    { id: "t-clear", label: "Clear Terminal", icon: () => <IcEraser />, run: sectorEvent("term:clear") },
    { id: "t-logs", label: "Open Logs (Audit)", icon: () => <IcFile />, run: admin("audit") },
  ],
  agents: [
    { id: "a-launch", label: "Launch Agent", icon: () => <IcBot />, primary: true, run: deployTerm("claude", "~") },
    { id: "a-broadcast", label: "Broadcast Mission", icon: () => <IcSend />, run: sectorEvent("agents:focus-broadcast") },
    { id: "a-continue", label: "Continue Mission", icon: () => <IcPlay />, run: armTerm("claude --continue", "~") },
    { id: "a-inspect", label: "Inspect Transcripts", icon: () => <IcFile />, run: sectorEvent("agents:select-first") },
    { id: "a-stop", label: "Stop Failed", icon: () => <IcEraser />, disabledReason: "per-session kill not exposed — use Terminal stop controls" },
  ],
  code: [
    { id: "c-save", label: "Save File", icon: () => <IcSave />, primary: true, run: sectorEvent("code:save") },
    { id: "c-build", label: "Arm Build Terminal", icon: () => <IcCode />, run: armTerm("npm run build", "~") },
    { id: "c-typecheck", label: "Typecheck", icon: () => <IcCode />, disabledReason: "no typecheck script in package.json" },
    { id: "c-tests", label: "Run Tests", icon: () => <IcCode />, disabledReason: "no test script in package.json" },
    { id: "c-diff", label: "Arm Git Diff", icon: () => <IcBranch />, run: armTerm("git diff", "~") },
  ],
  neuromap: [
    { id: "n-focus", label: "Focus Core", icon: () => <IcBrain />, primary: true, run: sectorEvent("nm:focus") },
    { id: "n-reset", label: "Reset View", icon: () => <IcRefresh />, run: sectorEvent("nm:reset") },
    { id: "n-digest", label: "Open Graph Digest", icon: () => <IcNodes />, run: openGraphify },
    { id: "n-live", label: "Live Mode", icon: () => <IcPlay />, disabledReason: "graph refreshes when the digest regenerates" },
    { id: "n-inspect", label: "Node Inspector", icon: () => <IcSearch />, disabledReason: "select a node in the map" },
  ],
  drive: [
    { id: "d-sync", label: "Sync Vault", icon: () => <IcRefresh />, primary: true, run: admin("team") },
    { id: "d-vault", label: "Open Vault (Obsidian)", icon: () => <IcGem />, run: openObsidian },
    { id: "d-search", label: "Search Notes", icon: () => <IcSearch />, run: goto("research") },
    { id: "d-structure", label: "Create Structure", icon: () => <IcCube />, disabledReason: "pending backend" },
  ],
  metrics: [
    { id: "m-refresh", label: "Refresh Metrics", icon: () => <IcRefresh />, primary: true, run: refreshAll },
    { id: "m-check", label: "Run Health Check", icon: () => <IcChart />, run: healthCheck },
    { id: "m-audit", label: "Open Audit", icon: () => <IcFile />, run: admin("audit") },
    { id: "m-export", label: "Export Report", icon: () => <IcExternal />, disabledReason: "no export IPC yet" },
  ],
  preview: [
    { id: "p-refresh", label: "Refresh Preview", icon: () => <IcRefresh />, primary: true, run: sectorEvent("pv:refresh") },
    { id: "p-shot", label: "Capture Screenshot", icon: () => <IcCamera />, run: () => { window.dai.shot.capture(); } },
    { id: "p-external", label: "Open External", icon: () => <IcExternal />, run: sectorEvent("pv:external") },
    { id: "p-qa", label: "Visual QA", icon: () => <IcMonitor />, disabledReason: "pending backend" },
  ],
  creative: [
    { id: "cr-new", label: "New Generation", icon: () => <IcPalette />, disabledReason: "generation connectors require API keys" },
    { id: "cr-brand", label: "Brand Kit", icon: () => <IcGem />, disabledReason: "pending backend" },
    { id: "cr-assets", label: "Open Assets", icon: () => <IcImage />, disabledReason: "no assets folder IPC yet" },
    { id: "cr-export", label: "Export", icon: () => <IcExternal />, disabledReason: "pending backend" },
  ],
};

/** sector meta for rail headers (kept beside the actions so they can't drift) */
export const SECTOR_INFO: Record<SectorId, { title: string; desc: { en: string; ro: string } }> = {
  ide: { title: "Terminal", desc: { en: "Direct execution & worker control", ro: "Executie directa si control workeri" } },
  agents: { title: "Agents", desc: { en: "AI mission control", ro: "Centru de comanda AI" } },
  code: { title: "Code", desc: { en: "Engineering deck", ro: "Puntea de inginerie" } },
  neuromap: { title: "Neuromap", desc: { en: "Neural intelligence map", ro: "Harta inteligentei neuronale" } },
  drive: { title: "Drive", desc: { en: "Vault & cloud files", ro: "Vault si fisiere cloud" } },
  metrics: { title: "Metrics", desc: { en: "Observability", ro: "Observabilitate" } },
  preview: { title: "Preview", desc: { en: "Visual QA", ro: "QA vizual" } },
  creative: { title: "Creative", desc: { en: "Output studio", ro: "Studio de productie" } },
};

// re-export for consumers that need the users icon (settings integrations)
export { IcUsers };
