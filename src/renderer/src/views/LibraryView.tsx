// Admin Library — the empire's catalog of agents, tools and superpowers, plus a
// shortcuts + smart-tips reference. ADMIN ONLY: the whole view is gated on the
// real "adm:library" grant (same useMe()/teamCaps system as every other admin
// area). Non-admins never reach it — the More entry, the dock Admin button and
// the ⌘K command are all hidden for them — and if one navigates here anyway this
// view renders a restricted panel. Tip writes are ALSO re-checked server-side
// in main/ipc.ts (teamCan("adm:library")), so the gate is not renderer-only.
import { useState } from "react";
import { useMe } from "../hooks/useMe";
import { IcGem, IcLock, IcCrown } from "../components/icons";
import { consumeLibraryTab } from "../registry";
import { CategoryLibrary } from "../components/library/CategoryLibrary";
import { TeamSection } from "../components/library/TeamSection";
import { AdminSection } from "../components/library/AdminSection";
import { ToolsSection } from "../components/library/ToolsSection";
import { QuickGuide } from "../components/library/QuickGuide";

type Mode = "catalog" | "tools" | "guide" | "reference";

export function LibraryView() {
  const { can, me } = useMe();
  const isAdmin = can("adm:library");
  const canTerminals = can("act:terminals");
  // deep-links from the dock/palette/panels: tools → Tools tab, guide → Quick Guide,
  // legacy "admin" → Reference (tips editor); default = Control Room & Modules.
  const [mode, setMode] = useState<Mode>(() => {
    const t = consumeLibraryTab();
    return t === "tools" ? "tools" : t === "guide" ? "guide" : t === "admin" ? "reference" : "catalog";
  });

  if (!isAdmin) {
    return (
      <div className="lib-view">
        <div className="lib-denied">
          <IcLock size={26} />
          <h2>Admin Library — restricted</h2>
          <p>This library of agents, tools and superpowers is available to owners &amp; admins only.
            Ask an owner to grant you <code>adm:library</code> in Settings → Team.</p>
        </div>
      </div>
    );
  }

  const roleLabel = me?.member ? `${me.member.name} · ${me.member.role}` : "local admin";

  return (
    <div className="lib-view">
      <div className="lib-topbar">
        <div className="lib-title-wrap">
          <span className="lib-title"><IcGem /> Admin Library</span>
          <span className="lib-subtitle">Agents, Superpowers, Tools, Integrations and Operational Modules</span>
          <span className="lib-adminbadge">ADMIN ONLY</span>
          <span className="lib-ownerbadge"><IcCrown size={11} /> {roleLabel}</span>
        </div>
        <div className="drv-tabs">
          <button className={`drv-tab${mode === "catalog" ? " on" : ""}`} onClick={() => setMode("catalog")}>Control Room &amp; Modules</button>
          <button className={`drv-tab${mode === "tools" ? " on" : ""}`} onClick={() => setMode("tools")}>Tools</button>
          <button className={`drv-tab${mode === "guide" ? " on" : ""}`} onClick={() => setMode("guide")}>Quick Guide</button>
          <button className={`drv-tab${mode === "reference" ? " on" : ""}`} onClick={() => setMode("reference")}>Reference</button>
        </div>
      </div>

      {mode === "catalog" && <CategoryLibrary activeProject={null} />}
      {mode === "tools" && <ToolsSection />}
      {mode === "guide" && <QuickGuide />}
      {mode === "reference" && (
        <>
          <TeamSection activeProject={null} canTerminals={canTerminals} />
          <AdminSection activeProject={null} />
        </>
      )}
    </div>
  );
}
