// SECTOR AGENT DOCK — the NATIVE per-sector agent window: a small pill living
// inside every sector; click (or the StatusBar ◈ / ⌘K command via dai:sector-agent)
// expands it into a compact local-LLM chat working FOR that sector. One instance,
// mounted in App; the sector follows the live view; each sector keeps its own
// conversation (module memory in SectorAgent core). Honest: Ollama down →
// SETUP_REQUIRED with the true fix, never a fake reply.
import { useEffect, useRef, useState } from "react";
import { useSectorChat, type AgentSector } from "./SectorAgent";
import { openSuperpower } from "../registry";
import { OpStatusBadge } from "./da";
import { IcBot, IcZap, IcX } from "./icons";
import type { View } from "../views";

const SECTOR_VIEWS = ["ide", "agents", "code", "neuromap", "drive", "metrics", "preview", "creative"] as const;

export function SectorAgentDock({ view }: { view: View }) {
  const isSector = (SECTOR_VIEWS as readonly string[]).includes(view);
  const sector = (isSector ? view : "guide") as AgentSector;
  const [expanded, setExpanded] = useState(false);
  const [q, setQ] = useState("");
  const { meta, model, ready, log, busy, send } = useSectorChat(sector, expanded);
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bodyRef.current?.scrollTo({ top: 1e9 }); }, [log, busy]);

  // StatusBar ◈ / palette "Ask Sector Agent" → expand the native window here
  useEffect(() => {
    const h = () => setExpanded((e) => !e);
    window.addEventListener("dai:sector-agent", h);
    return () => window.removeEventListener("dai:sector-agent", h);
  }, []);

  // Escape collapses (only while expanded, and never fights modals: capture no)
  useEffect(() => {
    if (!expanded) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [expanded]);

  if (!isSector) return null; // support views (library/research/radar) — Guide has its own embedded chat

  if (!expanded) {
    return (
      <button className="sgd-pill" title={`${meta.title} agent — local chat working for this sector (Hermes via Ollama)`}
        aria-label={`Open the ${meta.title} sector agent`}
        onClick={() => setExpanded(true)}>
        <IcBot size={13} /> ◈ {meta.title} Agent
        <span className={`sgd-dot${ready ? " on" : ""}`} aria-hidden />
      </button>
    );
  }

  return (
    <div className="sgd-card" role="dialog" aria-label={`${meta.title} sector agent`}>
      <div className="sgd-head">
        <IcBot size={14} />
        <div className="sgd-title-wrap">
          <b>{meta.title} Agent</b>
          <i>{ready ? model : "local model offline"}</i>
        </div>
        <OpStatusBadge status={ready ? "live" : "setup-required"} size="sm" />
        <button className="sgd-x" onClick={() => setExpanded(false)} title="collapse (esc)"><IcX size={11} /></button>
      </div>

      {!ready ? (
        <div className="sgd-setup">
          <p>Ollama isn't answering on <code>127.0.0.1:11434</code>. Start it (<code>ollama serve</code>) — everything runs locally, no keys.</p>
          <button className="da-btn ghost sm" onClick={() => { openSuperpower("llmhub"); setExpanded(false); }}>
            <IcZap size={11} /> Open LLM Hub
          </button>
        </div>
      ) : (
        <>
          <div className="sgd-body" ref={bodyRef}>
            {log.map((m, i) => <div key={i} className={`sga-line sga-${m.role}`}>{m.text}</div>)}
            {busy && <div className="sga-line sga-assistant sga-busy">thinking…</div>}
          </div>
          <div className="sgd-quick">
            {meta.quick.map((a) => (
              <button key={a.label} className="da-btn ghost sm" onClick={a.run}>{a.label}</button>
            ))}
          </div>
          <div className="sga-in sgd-in">
            <input value={q} onChange={(e) => setQ(e.target.value)} disabled={busy}
              onKeyDown={(e) => { if (e.key === "Enter") { void send(q); setQ(""); } }}
              placeholder={`ask the ${meta.title} agent…`} />
            <button className="da-btn gold sm" disabled={busy || !q.trim()}
              onClick={() => { void send(q); setQ(""); }}>Send</button>
          </div>
        </>
      )}
    </div>
  );
}
