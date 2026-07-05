// SUPERPOWER DOCK — the seven real powers of the empire, nothing else.
// Premium dock cards: icon + label + status dot AND word, hover micro-panel
// with a plain-language explanation, click → quick panel of REAL actions.
// No fake status: everything derives from live probe data (useOps).
import { useEffect, useRef, useState } from "react";
import { SUPERPOWERS, STATUS_META, type SuperpowerDef, type OpStatus } from "../registry";
import { useOps } from "../hooks/useOps";
import { IcNodes } from "./icons";
import { DragonEmblem } from "./DragonEmblem";
import { OpStatusBadge } from "./da";

/** plain-language meaning of each state — shown in hover cards + quick panels */
export const STATUS_EXPLAIN: Record<OpStatus, string> = {
  live: "Operational — live signal detected",
  running: "Working right now",
  idle: "Ready — no active flow",
  partial: "Configured — sign-in incomplete",
  offline: "No signal from this power",
  error: "Probe returned an error",
  "setup-required": "Needs setup — open quick actions to fix",
  "pending-backend": "UI ready — backend pending",
  "local-only": "Working locally, no remote sync",
  unknown: "No probe data yet",
  disabled: "Disabled",
};

function QuickPanel({ sp, status, checking, onClose }: { sp: SuperpowerDef; status: OpStatus; checking: boolean; onClose: () => void }) {
  return (
    <div className="sp-panel" role="menu" aria-label={`${sp.label} quick actions`}>
      <div className="sp-panel-head">
        <span className="sp-panel-ic">{sp.icon({ size: 16 })}</span>
        <div>
          <div className="sp-panel-title">{sp.label}</div>
          <div className="sp-panel-role">{sp.role}</div>
        </div>
        <span className="sp-panel-badge"><OpStatusBadge status={status} checking={checking} size="sm" /></span>
      </div>
      <div className="sp-panel-explain">{checking ? "Probing…" : STATUS_EXPLAIN[status]}</div>
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
  const { env, statuses, liveCount, total, checking } = useOps();
  const [open, setOpen] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // close the quick panel on outside click / escape
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(null); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    window.addEventListener("mousedown", down);
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("mousedown", down); window.removeEventListener("keydown", key); };
  }, [open]);

  return (
    <div className="sp-dock" ref={wrapRef}>
      <span className="sp-dock-label">
        <DragonEmblem size={15} glow={false} />
        SUPERPOWERS
        <span className="eco-live" title="powers with live signal right now">
          {checking ? "…" : `${liveCount}/${total} live`}
        </span>
      </span>
      <div className="sp-chips">
        {SUPERPOWERS.map((sp) => {
          const st = statuses[sp.id] ?? sp.statusOf(env);
          const meta = STATUS_META[st];
          const isOpen = open === sp.id;
          return (
            <div key={sp.id} className={`sp-wrap${isOpen ? " panel-open" : ""}`}>
              <button
                className={`sp-chip sp-card st-${st}${checking ? " checking" : ""}${isOpen ? " open" : ""}${sp.id === "godmode" ? " god" : ""}`}
                aria-expanded={isOpen}
                aria-label={`${sp.label} — ${sp.role} · ${checking ? "checking" : meta.label}`}
                onClick={() => {
                  if (sp.id === "godmode") { sp.actions[0].run?.(); setOpen(null); return; }
                  setOpen(isOpen ? null : sp.id);
                }}
              >
                {/* GODMODE poarta sigiliul-dragon de brand, nu icon generic */}
                {sp.id === "godmode" ? <DragonEmblem size={16} glow={false} /> : <span className="sp-ic">{sp.icon({ size: 16 })}</span>}
                <span className="sp-card-tx">
                  <span className="sp-name">{sp.label}</span>
                  <span className="sp-st">
                    <span className="sp-dot" aria-hidden
                      style={{ background: checking ? "var(--state-checking)" : meta.color, boxShadow: !checking && st === "live" ? `0 0 8px ${meta.color}` : "none" }} />
                    {checking ? "checking…" : meta.label}
                  </span>
                </span>
              </button>
              {!isOpen && (
                <div className="sp-hover" role="tooltip">
                  <b>{sp.label}</b>
                  <span className="sp-hover-role">{sp.role}</span>
                  <em className="sp-hover-explain" style={{ color: checking ? "var(--state-checking)" : meta.color }}>
                    {checking ? "Probing…" : STATUS_EXPLAIN[st]}
                  </em>
                  <i className="sp-hover-hint">{sp.id === "godmode" ? "click to open GODMODE" : "click for quick actions"}</i>
                </div>
              )}
              {isOpen && <QuickPanel sp={sp} status={st} checking={checking} onClose={() => setOpen(null)} />}
            </div>
          );
        })}
      </div>
      <button className="sp-tools" title="support tools · admin · experimental"
        aria-label="Open support tools"
        onClick={() => window.dispatchEvent(new CustomEvent("dai:more"))}>
        <IcNodes size={13} /> Tools
      </button>
    </div>
  );
}
