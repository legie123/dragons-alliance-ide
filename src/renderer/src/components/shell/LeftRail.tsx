// LEFT RAIL — the eight core sectors (registry truth) + More / Guide launcher.
// Status dots appear ONLY where a real signal exists (sessions, google).
import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CORE_SECTORS, MORE_CATEGORIES, STATUS_META, type SectorId } from "../../registry";
import { fetchSessions, fetchGDriveStatus } from "../../api";
import type { View } from "../../views";
import { IcBook, IcSettings } from "../icons";
import { useMe } from "../../hooks/useMe";

const SHORTCUT: Record<SectorId, string> = {
  ide: "⌘1", agents: "⌘2", code: "⌘3", neuromap: "⌘4",
  drive: "⌘5", metrics: "⌘6", preview: "⌘7", creative: "⌘8",
};

type Props = {
  view: View;
  onView: (v: View) => void;
  moreOpen: boolean;
  onMoreToggle: (open: boolean) => void;
  onGuide: () => void;
  onSettings: () => void;
};

export const LeftRail = memo(function LeftRail({ view, onView, moreOpen, onMoreToggle, onGuide, onSettings }: Props) {
  // same query keys as the dock — React Query dedupes, zero extra polling
  const { data: sess } = useQuery({ queryKey: ["dock-sessions"], queryFn: () => fetchSessions(240), refetchInterval: 5000 });
  const { data: google } = useQuery({ queryKey: ["gdrive"], queryFn: fetchGDriveStatus, refetchInterval: 6000 });
  // cooperative gating — a member only sees the sectors they're granted
  const { can } = useMe();

  const dot = (id: SectorId): { color: string; label: string } | null => {
    if (id === "agents" || id === "ide") {
      const live = sess?.live ?? 0;
      return live > 0 ? { color: "var(--state-live)", label: `${live} live` } : null;
    }
    if (id === "drive") {
      if (google?.signedIn) return { color: "var(--state-live)", label: "signed in" };
      if (google && !google.configured) return { color: "var(--state-setup)", label: "setup required" };
    }
    return null;
  };

  return (
    <nav className="lrail" aria-label="Core sectors">
      <div className="lrail-head">SECTORS</div>
      {CORE_SECTORS.filter((s) => can("sector:" + s.id)).map((s) => {
        const d = dot(s.id);
        return (
          <button
            key={s.id}
            className={`lrail-item${view === s.id ? " active" : ""}`}
            data-sector-item={s.id}
            aria-current={view === s.id ? "page" : undefined}
            aria-label={`${s.label}${d ? ` — ${d.label}` : ""}`}
            onClick={() => onView(s.id)}
          >
            <span className="lrail-ic">{s.icon()}</span>
            <span className="lrail-label">{s.label}</span>
            {d && <span className="lrail-dot" style={{ background: d.color }} title={d.label} />}
            <kbd className="lrail-kbd">{SHORTCUT[s.id]}</kbd>
          </button>
        );
      })}

      <div className="lrail-spacer" />
      <div className="lrail-head">SUPPORT</div>
      <div className="more-wrap lrail-more">
        <button
          className={`lrail-item${view === "radar" || view === "research" ? " active" : ""}`}
          aria-expanded={moreOpen}
          aria-label="More — support tools, admin, experimental"
          onClick={() => onMoreToggle(!moreOpen)}
        >
          <span className="lrail-ic">▾</span>
          <span className="lrail-label">More</span>
        </button>
        {moreOpen && (
          <>
            <div className="more-backdrop" onClick={() => onMoreToggle(false)} />
            <div className="more-menu wide lrail-menu">
              {MORE_CATEGORIES.map((cat) => {
                // cooperative gating — hide items whose capability the member lacks,
                // and drop a category entirely once nothing in it is visible
                const items = cat.items.filter((it) => !it.cap || can(it.cap));
                if (items.length === 0) return null;
                return (
                <div key={cat.title} className="more-cat">
                  <div className="more-head">{cat.title}</div>
                  {items.map((it) => it.run ? (
                    <button key={it.id} className="more-item"
                      onClick={() => { it.run!(); onMoreToggle(false); }}>
                      <span className="more-item-label">{it.icon()} {it.label}
                        {it.status && <em className="more-item-st" style={{ color: STATUS_META[it.status].color }}>{STATUS_META[it.status].label}</em>}
                      </span>
                      <span className="more-item-desc">{it.sub}</span>
                    </button>
                  ) : (
                    <button key={it.id} className="more-item disabled" disabled title={it.disabledReason}>
                      <span className="more-item-label">{it.icon()} {it.label}
                        {it.status && <em className="more-item-st" style={{ color: STATUS_META[it.status].color }}>{STATUS_META[it.status].label}</em>}
                      </span>
                      <span className="more-item-desc">{it.disabledReason || it.sub}</span>
                    </button>
                  ))}
                </div>
                );
              })}
            </div>
          </>
        )}
      </div>
      <button className="lrail-item" onClick={onGuide} aria-label="Open Dragon Guide">
        <span className="lrail-ic"><IcBook /></span>
        <span className="lrail-label">Guide</span>
      </button>
      <button className="lrail-item" onClick={onSettings} aria-label="Open settings">
        <span className="lrail-ic"><IcSettings /></span>
        <span className="lrail-label">Settings</span>
      </button>
    </nav>
  );
});
