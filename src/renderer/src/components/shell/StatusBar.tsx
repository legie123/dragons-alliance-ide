// BOTTOM STATUS BAR — live telemetry, all real: probe health, live agents,
// last executed action, last probe time. Replaces the static footer.
import { memo, useSyncExternalStore } from "react";
import { useOps } from "../../hooks/useOps";
import { getLastAction, subscribeLastAction } from "../../lastAction";
import type { View } from "../../views";
import { SECTOR_FOR_VIEW } from "../../views";
import { SECTOR_INFO } from "../../sectorActions";

function clock(ts: number): string {
  if (!ts) return "—";
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export const StatusBar = memo(function StatusBar({ view }: { view: View }) {
  const { liveCount, total, attention, liveAgents, checking, lastChecked } = useOps();
  const last = useSyncExternalStore(subscribeLastAction, getLastAction);
  const sector = SECTOR_FOR_VIEW[view];
  const sectorLabel = sector === "support" ? view.toUpperCase() : SECTOR_INFO[sector].title.toUpperCase();

  return (
    <footer className="sbar" role="status" aria-label="System telemetry">
      <span className="sbar-item sbar-sector">{sectorLabel}</span>
      <span className={`sbar-item${attention > 0 ? " warn" : " ok"}`}
        title={`superpowers with live signal · ${attention} need attention`}>
        {checking ? "checking…" : `systems ${liveCount}/${total}`}
      </span>
      <span className="sbar-item" title="Claude sessions active in the last 4h window">
        agents <b>{liveAgents}</b>
      </span>
      {attention > 0 && (
        <span className="sbar-item warn" title="superpowers in error or setup-required state">
          attention <b>{attention}</b>
        </span>
      )}
      <span className="sbar-flex" />
      {last && (
        <span className="sbar-item" title="last action executed from rail or palette">
          last · {last.label}
        </span>
      )}
      <span className="sbar-item faint" title="last superpowers probe">
        checked {clock(lastChecked)}
      </span>
      <span className="sbar-item faint">⌘K palette</span>
    </footer>
  );
});
