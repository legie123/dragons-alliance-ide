// Library — agents catalog, superpowers, shortcuts and smart tricks in one
// place. Team tab is always visible; Admin tab (tips CRUD + full catalog) only
// renders when the real "adm:library" grant resolves true, via the same
// useMe()/teamCaps system every other admin area in this app already gates
// on (App.tsx sectorBlocked, AdminPanel tabs, EcosystemBar, LeftRail) — this
// is cooperative access control, not a hard security boundary (see team.ts).
// Actual write enforcement still lives server-side in main/ipc.ts
// (tips:upsert / tips:delete both re-check teamCan("adm:library") there).
//
// Support view like Research/Radar: no sector accent (SECTOR_FOR_VIEW maps it
// to "support"), so the header reuses the same accent-free layout classes.
import { useEffect, useState } from "react";
import { useMe } from "../hooks/useMe";
import { IcGem } from "../components/icons";
import { consumeLibraryTab } from "../registry";
import { TeamSection } from "../components/library/TeamSection";
import { AdminSection } from "../components/library/AdminSection";

type Tab = "team" | "admin";

export function LibraryView() {
  const { can } = useMe();
  const isAdmin = can("adm:library");
  const canTerminals = can("act:terminals");
  // consumed once — set by the persistent Admin-dock shortcut (EcosystemBar)
  // so it can jump straight to the Admin tab instead of always landing on Team.
  const [tab, setTab] = useState<Tab>(() => consumeLibraryTab() ?? "team");

  // if the grant disappears while Admin was open, fall back to Team
  useEffect(() => { if (!isAdmin && tab === "admin") setTab("team"); }, [isAdmin, tab]);

  // No app-wide "active project" concept is threaded into support views today
  // (TerminalsView tracks its own project selection locally) — agent deploys
  // fall back to "~" like every other registry action without a concrete cwd.
  const activeProject: string | null = null;

  return (
    <div className="radar-view">
      <div className="radar-head">
        <span className="radar-title"><IcGem /> LIBRARY</span>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>agents · superpowers · shortcuts · tips</span>
        <div className="drv-tabs">
          <button className={`drv-tab${tab === "team" ? " on" : ""}`} onClick={() => setTab("team")}>Team</button>
          {isAdmin && <button className={`drv-tab${tab === "admin" ? " on" : ""}`} onClick={() => setTab("admin")}>Admin</button>}
        </div>
      </div>

      {tab === "team"
        ? <TeamSection activeProject={activeProject} canTerminals={canTerminals} />
        : <AdminSection activeProject={activeProject} />}
    </div>
  );
}
