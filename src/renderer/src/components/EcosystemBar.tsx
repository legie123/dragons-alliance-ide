// SUPERPOWER DOCK — the seven real powers of the empire, nothing else.
// Premium dock cards: icon + label + status dot AND word, hover micro-panel
// with a plain-language explanation, click → the power's full GODMODE-style
// operational panel. No fake status: everything derives from live probe data.
import { SUPERPOWERS, STATUS_META, openLibraryAdmin, openSuperpower, type OpStatus } from "../registry";
import { useOps } from "../hooks/useOps";
import { useMe } from "../hooks/useMe";
import { IcGem } from "./icons";
import { DragonEmblem } from "./DragonEmblem";

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

export function EcosystemBar() {
  const { env, statuses, liveCount, total, checking } = useOps();
  const { can } = useMe();
  const canLibraryAdmin = can("adm:library");

  return (
    <div className="sp-dock">
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
          // cooperative gating — a power an owner hasn't granted renders restricted
          // (visually disabled) with an honest reason; no panel, no action.
          const allowed = can("sp:" + sp.id);
          return (
            <div key={sp.id} className="sp-wrap">
              <button
                className={`sp-chip sp-card st-${st}${checking ? " checking" : ""}${sp.id === "godmode" ? " god" : ""}${allowed ? "" : " restricted"}`}
                style={{ ["--chip-tone" as never]: sp.tone }}
                aria-disabled={!allowed}
                aria-label={allowed ? `${sp.label} — ${sp.role} · ${checking ? "checking" : meta.label} · click to open panel` : `${sp.label} — not granted to you by an owner`}
                onClick={() => { if (allowed) openSuperpower(sp.id); }}
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
              <div className="sp-hover" role="tooltip">
                <b>{sp.label}</b>
                <span className="sp-hover-role">{sp.role}</span>
                <em className="sp-hover-explain" style={{ color: !allowed ? "var(--faint)" : checking ? "var(--state-checking)" : meta.color }}>
                  {!allowed ? "Not granted to you by an owner" : checking ? "Probing…" : STATUS_EXPLAIN[st]}
                </em>
                <i className="sp-hover-hint">{!allowed ? "cooperative access — ask an owner" : sp.id === "godmode" ? "click to open GODMODE" : "click to open panel"}</i>
              </div>
            </div>
          );
        })}
      </div>
      {/* ONE admin entry — the Admin Command Center (Tools moved INSIDE it; the
          separate dock Tools button was retired as a confusing duplicate). */}
      {canLibraryAdmin && (
        <button className="sp-tools" title="Admin Command Center — Control Room · Tools · Quick Guide · Reference"
          aria-label="Open Admin Command Center"
          onClick={openLibraryAdmin}>
          <IcGem size={13} /> Admin
        </button>
      )}
    </div>
  );
}
