// One premium catalog card — category-colored, status-honest. Pure presentational;
// selection + launch are handled by the parent (CategoryLibrary).
import { CATEGORY_META, LIB_STATUS_META, type LibEntry } from "./libraryMeta";

export function LibraryCard({ e, selected, onSelect }: { e: LibEntry; selected: boolean; onSelect: () => void }) {
  const m = CATEGORY_META[e.category];
  const st = LIB_STATUS_META[e.status];
  return (
    <button
      className={`lib-card${selected ? " sel" : ""}`}
      data-cat={e.category}
      onClick={onSelect}
      title={`${e.name} — ${m.label}`}
      aria-pressed={selected}
    >
      <div className="lib-card-top">
        <span className="lib-card-name">{e.name}</span>
        <span className="lib-power" aria-label={`power ${e.power} of 5`}>
          {[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= e.power ? "on" : ""} />)}
        </span>
      </div>
      <span className="lib-card-cat">{m.icon({ size: 12 })} {m.label}</span>
      <div className="lib-card-role">{e.role}</div>
      <div className="lib-card-foot">
        <span className="lib-status" data-status={e.status}>{st.label}</span>
        <span className="lib-kind">{e.kind === "agent" ? "AGENT" : "TOOL"}</span>
      </div>
    </button>
  );
}
