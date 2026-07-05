// RIGHT RAIL — contextual actions for the ACTIVE sector, from SECTOR_ACTIONS.
// Primary CTA carries the sector accent; disabled actions state their reason.
import { memo } from "react";
import type { SectorId } from "../../registry";
import { SECTOR_ACTIONS, SECTOR_INFO } from "../../sectorActions";
import { setLastAction } from "../../lastAction";
import { useAppearanceLang } from "../../hooks/useAppearance";

type Props = { sector: SectorId; onHelp: (sector: SectorId) => void };

export const RightRail = memo(function RightRail({ sector, onHelp }: Props) {
  const lang = useAppearanceLang();
  const info = SECTOR_INFO[sector];
  const actions = SECTOR_ACTIONS[sector];

  return (
    <aside className="rrail" aria-label={`${info.title} actions`}>
      <div className="rrail-head">
        <div className="rrail-title">{info.title}</div>
        <button className="rrail-help" onClick={() => onHelp(sector)}
          title="Open guide for this sector" aria-label={`Open guide for ${info.title}`}>?</button>
      </div>
      <div className="rrail-desc">{info.desc[lang]}</div>
      <div className="rrail-actions">
        {actions.map((a) => a.run ? (
          <button
            key={a.id}
            className={`rrail-act${a.primary ? " primary" : ""}`}
            onClick={() => { a.run!(); setLastAction(a.label); }}
          >
            <span className="rrail-act-ic">{a.icon()}</span>
            <span>{a.label}</span>
          </button>
        ) : (
          <button key={a.id} className="rrail-act disabled" disabled aria-disabled="true" title={a.disabledReason}>
            <span className="rrail-act-ic">{a.icon()}</span>
            <span>{a.label}</span>
            <i className="rrail-reason">{a.disabledReason}</i>
          </button>
        ))}
      </div>
    </aside>
  );
});
