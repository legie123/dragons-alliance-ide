// TOP BAR — brand + system context. Everything shown is REAL: workspace count
// from the projects probe, operator from the host home dir, health from live
// probes. No branch/build chips — there is no real source for them yet.
import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchHost, fetchProjects } from "../../api";
import { useOps } from "../../hooks/useOps";
import { DragonEmblem } from "../DragonEmblem";
import { IcCommand, IcSettings } from "../icons";

type Props = { onPalette: () => void; onSettings: () => void };

export const TopBar = memo(function TopBar({ onPalette, onSettings }: Props) {
  const { data: host } = useQuery({ queryKey: ["host"], queryFn: fetchHost, refetchInterval: false });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: fetchProjects, refetchInterval: 4000 });
  const { liveCount, total, attention, checking } = useOps();

  const operator = host?.home?.split("/").filter(Boolean).pop() ?? "local";

  return (
    <header className="tbx">
      <div className="brand">
        <span className="glyph"><DragonEmblem size={34} /></span>
        <div>
          <h1>Dragons Alliance IDE</h1>
          <div className="sub">Command Center · AI Operations</div>
        </div>
      </div>

      <div className="tbx-ctx" role="status" aria-label="System context">
        <span className="tbx-chip" title="workspaces discovered under ~/code">
          <b>{projects.length}</b> workspaces
        </span>
        <span className="tbx-chip" title="active operator (host account)">
          op · <b>{operator}</b>
        </span>
        <span className="tbx-chip tbx-mode" title="all data stays on this machine — team backend pending">
          LOCAL MODE
        </span>
        <span
          className={`tbx-chip tbx-health${attention > 0 ? " warn" : ""}`}
          title={checking ? "probing superpowers…" : `${liveCount}/${total} superpowers live · ${attention} need attention`}
        >
          {checking ? "CHECKING…" : `SYSTEMS ${liveCount}/${total}`}
        </span>
      </div>

      <div className="tbx-actions">
        <button className="cmdk-btn" onClick={onPalette} title="Command palette (⌘K)" aria-label="Open command palette">
          <IcCommand /> K
        </button>
        <button className="tbx-gear" onClick={onSettings} title="Settings" aria-label="Open settings">
          <IcSettings />
        </button>
      </div>
    </header>
  );
});
