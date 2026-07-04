// SUPERPOWER DOCK — the seven real powers of the empire, nothing else.
// Left: system health (live count from real probes). Center: superpower chips —
// every click opens a quick panel whose actions are REAL or honestly disabled.
// Right: Tools (the categorized More launcher). Support/experimental tools live
// there, not here. No fake status: everything derives from live probe data.
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchTools, fetchSessions, fetchGDriveStatus } from "../api";
import { SUPERPOWERS, STATUS_META, type SuperpowerDef, type OpStatus } from "../registry";
import { IcNodes } from "./icons";
import { DragonEmblem } from "./DragonEmblem";

function QuickPanel({ sp, status, onClose }: { sp: SuperpowerDef; status: OpStatus; onClose: () => void }) {
  const meta = STATUS_META[status];
  return (
    <div className="sp-panel" role="menu" aria-label={`${sp.label} quick actions`}>
      <div className="sp-panel-head">
        <span className="sp-panel-ic">{sp.icon({ size: 16 })}</span>
        <div>
          <div className="sp-panel-title">{sp.label}</div>
          <div className="sp-panel-role">{sp.role}</div>
        </div>
        <span className="sp-status" style={{ color: meta.color, borderColor: meta.color }}>{meta.label}</span>
      </div>
      <div className="sp-panel-actions">
        {sp.actions.map((a) => a.run ? (
          <button key={a.id} className={`sp-act${a.danger ? " danger" : ""}`}
            onClick={() => { a.run!(); onClose(); }}>{a.label}</button>
        ) : (
          <button key={a.id} className="sp-act disabled" disabled title={a.disabledReason}>
            <span>{a.label}</span>
            <i>{a.disabledReason}</i>
          </button>
        ))}
      </div>
    </div>
  );
}

export function EcosystemBar() {
  const { data: tools = [] } = useQuery({ queryKey: ["tools"], queryFn: fetchTools, refetchInterval: 3000 });
  const { data: sess } = useQuery({ queryKey: ["dock-sessions"], queryFn: () => fetchSessions(240), refetchInterval: 5000 });
  const { data: google } = useQuery({ queryKey: ["gdrive"], queryFn: fetchGDriveStatus, refetchInterval: 6000 });
  const [open, setOpen] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const env = {
    tool: (id: string) => tools.find((t) => t.id === id)?.status,
    liveAgents: sess?.live ?? 0,
    google: { configured: !!google?.configured, signedIn: !!google?.signedIn },
  };

  // close the quick panel on outside click / escape
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(null); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    window.addEventListener("mousedown", down);
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("mousedown", down); window.removeEventListener("keydown", key); };
  }, [open]);

  const liveCount = SUPERPOWERS.filter((sp) => sp.statusOf(env) === "live").length;

  return (
    <div className="sp-dock" ref={wrapRef}>
      <span className="sp-dock-label">
        SUPERPOWERS
        <span className="eco-live" title="powers with live signal right now">{liveCount}/{SUPERPOWERS.length} live</span>
      </span>
      <div className="sp-chips">
        {SUPERPOWERS.map((sp) => {
          const st = sp.statusOf(env);
          const meta = STATUS_META[st];
          const isOpen = open === sp.id;
          return (
            <div key={sp.id} className="sp-wrap">
              <button
                className={`sp-chip st-${st}${isOpen ? " open" : ""}${sp.id === "godmode" ? " god" : ""}`}
                title={`${sp.label} — ${sp.role} · ${meta.label}`}
                aria-expanded={isOpen}
                onClick={() => {
                  if (sp.id === "godmode") { sp.actions[0].run?.(); setOpen(null); return; }
                  setOpen(isOpen ? null : sp.id);
                }}
              >
                <span className="sp-dot" style={{ background: meta.color, boxShadow: st === "live" ? `0 0 8px ${meta.color}` : "none" }} />
                {/* GODMODE poarta sigiliul-dragon de brand, nu icon generic */}
                {sp.id === "godmode" ? <DragonEmblem size={15} glow={false} /> : <span className="sp-ic">{sp.icon({ size: 14 })}</span>}
                <span className="sp-name">{sp.label}</span>
                <span className="sp-st">{meta.label}</span>
              </button>
              {isOpen && <QuickPanel sp={sp} status={st} onClose={() => setOpen(null)} />}
            </div>
          );
        })}
      </div>
      <button className="sp-tools" title="support tools · admin · experimental"
        onClick={() => window.dispatchEvent(new CustomEvent("dai:more"))}>
        <IcNodes size={13} /> Tools
      </button>
    </div>
  );
}
