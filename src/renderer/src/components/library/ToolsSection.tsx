// Admin Command Center ▸ Tools — the operational utilities, in ONE place.
// Every card runs a REAL route/action (the same factories the dock/palette use);
// nothing here navigates into a dead zone or fakes success. Tools lives INSIDE
// Admin now — the separate dock "Tools" button was retired as a duplicate.
import {
  goto, godmode, admin, openObsidian, openPalette, runHealthSweep,
  graphifyOpenDigest, armTermToast, armTerm,
} from "../../registry";
import {
  IcZap, IcSearch, IcTerminal, IcCrown, IcChart, IcSend, IcPlug, IcGem,
  IcBrain, IcNodes, IcBot, IcSigil, IcKey,
} from "../icons";
import type { ReactNode } from "react";

type Tool = { id: string; icon: ReactNode; label: string; sub: string; run: () => void };

const TOOLS: Tool[] = [
  { id: "health", icon: <IcZap size={15} />, label: "Run Health Check", sub: "ruflo + graphify real probes", run: runHealthSweep },
  { id: "palette", icon: <IcSearch size={15} />, label: "Command Palette", sub: "⌘K · every action, one search", run: openPalette },
  { id: "workers", icon: <IcTerminal size={15} />, label: "Terminal Workers", sub: "master + workers · broadcast", run: goto("ide") },
  { id: "diag", icon: <IcCrown size={15} />, label: "Diagnostics (GODMODE)", sub: "system health · full check", run: godmode },
  { id: "mission", icon: <IcSigil size={15} />, label: "Mission Control", sub: "agents cockpit · stop/broadcast", run: goto("agents") },
  { id: "queue", icon: <IcBot size={15} />, label: "RuFlo Queue", sub: "real `ruflo task list`", run: armTermToast("ruflo task list", "~", "Ruflo task queue") },
  { id: "map", icon: <IcBrain size={15} />, label: "Open NeuroMap", sub: "knowledge graph + diagnostics", run: goto("neuromap") },
  { id: "digest", icon: <IcNodes size={15} />, label: "Open Graph Digest", sub: "real Graphify artifact", run: graphifyOpenDigest() },
  { id: "vault", icon: <IcGem size={15} />, label: "Open Vault", sub: "Antigravity-Brain in Obsidian", run: openObsidian },
  { id: "truth", icon: <IcChart size={15} />, label: "Button Truth Table", sub: "opens the audited buttons doc", run: armTerm("open docs/superpowers/button-truth-table-current.md", "~/code/dragons-alliance-ide") },
  { id: "logs", icon: <IcChart size={15} />, label: "Logs (Audit)", sub: "action trail · JSONL 0600", run: admin("audit") },
  { id: "integrations", icon: <IcPlug size={15} />, label: "Integrations", sub: "probe truth + configure links", run: admin("integrations") },
  { id: "apihealth", icon: <IcKey size={15} />, label: "API Health", sub: "Google per-service probes", run: admin("health") },
  { id: "settings", icon: <IcSend size={15} />, label: "Settings", sub: "IDE configuration", run: admin("settings") },
];

export function ToolsSection() {
  return (
    <div className="lib-tools-wrap">
      <div className="lib-tools-head">
        <h3>Tools &amp; Diagnostics</h3>
        <p>Operational utilities — each opens a real panel, sector or probe. No junk drawer: anything without a real backend lives as an honest disabled action in its own panel, not here.</p>
      </div>
      <div className="lib-tools">
        {TOOLS.map((t) => (
          <button key={t.id} className="lib-tool" onClick={t.run} title={t.sub}>
            <span className="lib-tool-ic">{t.icon}</span>
            <span className="lib-tool-tx">
              <b>{t.label}</b>
              <i>{t.sub}</i>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
