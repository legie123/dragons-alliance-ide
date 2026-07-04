// Dragons Alliance design system — small, real, reusable presentational parts.
// No state, no data fetching: views pass real data in; these render it premium.
import type { ReactNode } from "react";

// ---- PremiumButton — gold CTA / ghost / danger, with loading + disabled ----
export function PremiumButton({
  children, onClick, variant = "gold", disabled, loading, title,
}: {
  children: ReactNode; onClick?: () => void;
  variant?: "gold" | "ghost" | "danger";
  disabled?: boolean; loading?: boolean; title?: string;
}) {
  return (
    <button
      className={`da-btn ${variant}${loading ? " loading" : ""}`}
      onClick={onClick} disabled={disabled || loading} title={title}
    >
      {loading && <span className="da-spin" aria-hidden />}
      {children}
    </button>
  );
}

// ---- StatusPill — status is icon+word+color, never color alone ----
export type PillState = "live" | "idle" | "running" | "error" | "sync" | "off" | "needs" | "ok";
const PILL_ICON: Record<PillState, string> = {
  live: "●", running: "▶", sync: "⇄", ok: "✓", idle: "◌", off: "○", needs: "⚠", error: "✕",
};
export function StatusPill({ state, children }: { state: PillState; children?: ReactNode }) {
  return (
    <span className={`da-pill ${state}`} role="status">
      <span className="da-pill-ic" aria-hidden>{PILL_ICON[state]}</span>
      {children ?? state}
    </span>
  );
}

// ---- SectionHeader — sector identity strip: icon, title, live right side ----
export function SectionHeader({ icon, title, sub, right }: {
  icon: ReactNode; title: string; sub?: string; right?: ReactNode;
}) {
  return (
    <div className="da-sechead">
      <span className="da-sechead-ic">{icon}</span>
      <span className="da-sechead-title">{title}</span>
      {sub && <span className="da-sechead-sub">{sub}</span>}
      {right && <span className="da-sechead-right">{right}</span>}
    </div>
  );
}

// ---- MiniMetric — tiny labeled figure ----
export function MiniMetric({ label, value, tone }: { label: string; value: ReactNode; tone?: "gold" | "teal" | "violet" }) {
  return (
    <span className={`da-metric${tone ? " " + tone : ""}`}>
      <b>{value}</b>
      <i>{label}</i>
    </span>
  );
}

// ---- EmptyState — premium "nothing here yet", with REAL actions ----
export function EmptyState({ icon, title, hint, actions }: {
  icon: ReactNode; title: string; hint?: string;
  actions?: { label: string; onClick: () => void; primary?: boolean }[];
}) {
  return (
    <div className="da-empty">
      <div className="da-empty-ic" aria-hidden>{icon}</div>
      <div className="da-empty-title">{title}</div>
      {hint && <div className="da-empty-hint">{hint}</div>}
      {actions && actions.length > 0 && (
        <div className="da-empty-actions">
          {actions.map((a) => (
            <button key={a.label} className={`da-btn ${a.primary ? "gold" : "ghost"} sm`} onClick={a.onClick}>
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
