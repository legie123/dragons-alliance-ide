import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TitleBar } from "./components/TitleBar";
import { TerminalsView } from "./views/TerminalsView";
import { MetricsView } from "./views/MetricsView";
import { AgentsView } from "./views/AgentsView";
import { RadarView } from "./views/RadarView";
import { NeuromapView } from "./views/NeuromapView";
import { PreviewView } from "./views/PreviewView";
import { ResearchView } from "./views/ResearchView";
import { CreativeView } from "./views/CreativeView";
import { DriveView } from "./views/DriveView";
import { LibraryView } from "./views/LibraryView";
import { MissionBar } from "./components/MissionBar";
import { CommandPalette } from "./components/CommandPalette";
import { PhoneConnect } from "./components/PhoneConnect";
import { CredentialsVault } from "./components/CredentialsVault";
import { EcosystemBar } from "./components/EcosystemBar";
import { GodModePanel } from "./components/GodModePanel";
import { SuperpowerPanel } from "./components/SuperpowerPanel";
import { AdminPanel } from "./components/AdminPanel";
import { FirstRunIdentity } from "./components/FirstRunIdentity";
import type { SettingsCat } from "./components/settings/SettingsSections";
import { GuidePanel } from "./components/GuidePanel";
import { SectorAgentDock } from "./components/SectorAgentDock";
import { ToastHost } from "./components/ToastHost";
import { DragonEmblem } from "./components/DragonEmblem";
import dragonMark from "./assets/dragon-mark.png";
import { LeftRail } from "./components/shell/LeftRail";
import { TopBar } from "./components/shell/TopBar";
import { StatusBar } from "./components/shell/StatusBar";
import { registerProvider, Cmd } from "./palette";
import { fetchHost, fetchProjects, fetchGDriveStatus, broadcast } from "./api";
import { IcCrown, IcGem, IcSearch, IcTerminal, IcBot, IcSigil } from "./components/icons";
import { CORE_SECTORS, operationalTruth, openSuperpower, openLibraryAdmin, openLibraryTools, openLibraryGuide, openObsidian, graphifyOpenDigest, SUPERPOWERS } from "./registry";
import { pushToast, updateToast } from "./toast";
import { SECTOR_ACTIONS } from "./sectorActions";
import { queryClient } from "./queryClient";
import { useMe } from "./hooks/useMe";
import { isView, SECTOR_FOR_VIEW, type View } from "./views";

// Monaco is ~5MB — keep it out of the initial bundle, load only when Code opens.
const CodeView = lazy(() => import("./views/CodeView").then((m) => ({ default: m.CodeView })));

export type OpenFileSignal = { path: string; n: number } | null;

// The `dai:admin` event carries a category id. Legacy tab ids (from the old
// 5-tab AdminPanel, still dispatched by registry/guide/sector actions) are
// remapped to the consolidated Settings categories; new ids pass through.
const ADMIN_CAT_MAP: Record<string, SettingsCat> = {
  settings: "appearance", perms: "team", team: "teamsync", audit: "audit", health: "apihealth",
  appearance: "appearance", ide: "ide", teamsync: "teamsync", superpowers: "superpowers",
  integrations: "integrations", shortcuts: "shortcuts", apihealth: "apihealth", developer: "developer",
  powercenter: "powercenter",
};

export default function App() {
  const [view, setView] = useState<View>("ide");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [godOpen, setGodOpen] = useState(false);
  const [spOpen, setSpOpen] = useState<string | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminCat, setAdminCat] = useState<SettingsCat>("appearance");

  // cooperative access control — resolved grants for the current member. Kept in
  // a ref so the mount-time keyboard/palette closures always read fresh grants.
  const { can, me } = useMe();
  const canRef = useRef(can);
  canRef.current = can;
  // fresh view for mount-time closures (Sector Agent derives its sector from it)
  const viewRef = useRef(view);
  viewRef.current = view;

  // Auto-open the secure credentials pop-up on first run when Google isn't set up.
  useEffect(() => {
    let done = false;
    fetchGDriveStatus().then((s) => { if (!done && !s?.configured) setVaultOpen(true); }).catch(() => {});
    return () => { done = true; };
  }, []);
  const [openFile, setOpenFile] = useState<OpenFileSignal>(null);
  const nonce = useRef(0);
  const { data: host } = useQuery({ queryKey: ["host"], queryFn: fetchHost, refetchInterval: false });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: fetchProjects, refetchInterval: 4000 });

  // Warm-load Monaco during idle so the first Code-view open is instant.
  useEffect(() => {
    const warm = () => { import("./views/CodeView"); };
    if ("requestIdleCallback" in window) (window as any).requestIdleCallback(warm);
    else setTimeout(warm, 2000);
  }, []);

  // command bus — dock/panels jump decks, open vault/phone/godmode/more from anywhere
  useEffect(() => {
    const goto = (e: Event) => { const v = (e as CustomEvent).detail; if (isView(v)) setView(v); };
    const vault = () => setVaultOpen(true);
    const phone = () => setPhoneOpen(true);
    const god = () => setGodOpen(true);
    const superpower = (e: Event) => { const id = (e as CustomEvent).detail as string; if (id) setSpOpen(id); };
    const more = () => setMoreOpen(true);
    const admin = (e: Event) => {
      const raw = (e as CustomEvent).detail as string | undefined;
      if (raw) setAdminCat(ADMIN_CAT_MAP[raw] ?? "appearance");
      setAdminOpen(true);
    };
    // superpower actions ask the dock to re-probe after they change state
    const refreshTools = () => { queryClient.invalidateQueries({ queryKey: ["tools"] }); };
    // Tools menu items: open the ⌘K palette / run the real health sweep
    const palette = () => setPaletteOpen(true);
    const health = () => { runHealthCheck(); };
    // dai:sector-agent is handled by the NATIVE per-sector dock (SectorAgentDock)
    window.addEventListener("dai:admin", admin);
    window.addEventListener("dai:goto", goto);
    window.addEventListener("dai:vault", vault);
    window.addEventListener("dai:phone", phone);
    window.addEventListener("dai:godmode", god);
    window.addEventListener("dai:superpower", superpower);
    window.addEventListener("dai:more", more);
    window.addEventListener("dai:refresh-tools", refreshTools);
    window.addEventListener("dai:palette", palette);
    window.addEventListener("dai:healthcheck", health);
    return () => {
      window.removeEventListener("dai:admin", admin);
      window.removeEventListener("dai:goto", goto);
      window.removeEventListener("dai:vault", vault);
      window.removeEventListener("dai:phone", phone);
      window.removeEventListener("dai:godmode", god);
      window.removeEventListener("dai:superpower", superpower);
      window.removeEventListener("dai:more", more);
      window.removeEventListener("dai:refresh-tools", refreshTools);
      window.removeEventListener("dai:palette", palette);
      window.removeEventListener("dai:healthcheck", health);
    };
  }, []);

  // ⌘K palette + ⌘J phone-connect + ⌘1-8 sector jumps — global toggles.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      if (k === "k") { e.preventDefault(); setPaletteOpen((o) => !o); }
      else if (k === "j") { e.preventDefault(); setPhoneOpen((o) => !o); }
      else if (k >= "1" && k <= "8" && !e.shiftKey && !e.altKey) {
        const s = CORE_SECTORS[Number(k) - 1];
        if (s) {
          e.preventDefault();
          // cooperative gate — a member can't jump to a sector they lack
          if (canRef.current("sector:" + s.id)) setView(s.id);
          else window.dai.audit.log("access-denied", `⌘${k} → sector:${s.id} (not granted)`);
        }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const goOpenFile = (path: string) => {
    nonce.current += 1;
    setOpenFile({ path, n: nonce.current });
    setView("code");
  };

  // Real deep health probe across the superpowers that expose one (ruflo, graphify).
  const runHealthCheck = async () => {
    const id = pushToast({ kind: "checking", title: "Running superpowers health check…", detail: "ruflo · graphify" });
    try {
      const [rf, gf] = await Promise.all([
        window.dai.superpowers.health("ruflo"),
        window.dai.superpowers.health("graphify"),
      ]);
      updateToast(id, { kind: "info", title: "Health check", detail: `Ruflo ${rf.status} · Graphify ${gf.status}`, ttl: 6000 });
      window.dai.audit.log("health-check", `ruflo ${rf.status} · graphify ${gf.status}`);
    } catch (e) {
      updateToast(id, { kind: "error", title: "Health check failed", detail: String(e), ttl: 6000 });
    }
  };

  // App-level palette: core sectors, superpowers, terminal commands, admin.
  // Every command runs for real; disabled ones state their reason in the subtitle.
  useEffect(() => {
    return registerProvider("app", (): Cmd[] => [
      // core sectors (from the registry — one truth)
      ...CORE_SECTORS.map((s, i): Cmd => ({
        id: "view:" + s.id, title: "Open " + s.label, category: "Sector", icon: s.icon(),
        shortcut: `⌘${i + 1}`, run: () => setView(s.id as View),
      })),
      // superpowers — every one opens its full GODMODE-style operational panel
      ...SUPERPOWERS.map((sp): Cmd => ({
        id: "sp:" + sp.id, title: `Open ${sp.label} Panel`, subtitle: sp.role, category: "Superpower",
        icon: sp.id === "godmode" ? <IcCrown /> : undefined, run: () => openSuperpower(sp.id),
      })),
      ...(canRef.current("adm:library")
        ? [
            { id: "sp:control-room", title: "Open Superpowers Control Room", subtitle: "Admin Command Center", category: "Superpower" as const, icon: <IcGem />, run: () => openLibraryAdmin() },
            { id: "adm:tools", title: "Open Tools (Admin)", subtitle: "health · palette · workers · logs · settings", category: "Admin" as const, icon: <IcGem />, run: () => openLibraryTools() },
            { id: "adm:guide", title: "Open Quick Guide (Claude & Superpowers)", subtitle: "operator guide · tips · troubleshooting", category: "Guide" as const, icon: <IcGem />, run: () => openLibraryGuide() },
          ]
        : []),
      { id: "diag:health", title: "Run Superpowers Health Check", subtitle: "ruflo + graphify real probes", category: "Diagnostics", run: () => runHealthCheck() },
      { id: "action:digest", title: "Open Graph Digest", subtitle: "the real Graphify artifact", category: "Action", run: () => { graphifyOpenDigest()(); } },
      { id: "action:vault-open", title: "Open Vault (Obsidian)", subtitle: "Antigravity-Brain", category: "Action", run: () => openObsidian() },
      { id: "action:sector-agent", title: "Ask Sector Agent", subtitle: "native per-sector window — LOCAL Hermes chat", category: "Action", icon: <IcBot />, run: () => window.dispatchEvent(new CustomEvent("dai:sector-agent")) },
      { id: "action:guide-agent", title: "Chat with the Guide Agent", subtitle: "embedded in the Dragon Guide (local)", category: "Guide", icon: <IcBot />, run: () => setGuideOpen(true) },
      // terminal commands — broadcast to the visible workers (real keystrokes)
      { id: "t:git-status", title: "Terminal: run git status on workers", category: "Terminal", icon: <IcTerminal />, run: () => { setView("ide"); broadcast("git status", true); } },
      { id: "t:npm-dev", title: "Terminal: run npm run dev on workers", category: "Terminal", icon: <IcTerminal />, run: () => { setView("ide"); broadcast("npm run dev", true); } },
      // support + admin
      { id: "view:research", title: "Open Research (intelligence desk)", category: "View", run: () => setView("research") },
      { id: "view:radar", title: "Open GitHub Radar + rescan", category: "View", run: () => { setView("radar"); window.dai.radar.refresh(); } },
      // Library is ADMIN ONLY — only surface the command when the member holds the grant
      ...(canRef.current("adm:library")
        ? [{ id: "view:library", title: "Open Admin Library", subtitle: "agents · tools · superpowers", category: "View" as const, icon: <IcGem />, run: () => setView("library") }]
        : []),
      { id: "action:phone", title: "Phone — code from your phone", subtitle: "⌘J", category: "Admin", run: () => setPhoneOpen(true) },
      { id: "action:keys", title: "Keys — credentials vault", category: "Admin", run: () => setVaultOpen(true) },
      { id: "action:audit", title: "Audit trail", subtitle: "local action log", category: "Admin", run: () => { setAdminCat("audit"); setAdminOpen(true); } },
      { id: "action:settings", title: "Settings — IDE configuration", category: "Settings", run: () => { setAdminCat("ide"); setAdminOpen(true); } },
      { id: "action:perms", title: "Team & permissions", subtitle: "roster · per-member access", category: "Admin", run: () => { setAdminCat("team"); setAdminOpen(true); } },
      { id: "action:vaultsync", title: "Sync Obsidian vault", subtitle: "git snapshot + push/pull", category: "Admin", run: () => { setAdminCat("teamsync"); setAdminOpen(true); } },
      // diagnostics — computed, never invented
      { id: "diag:truth", title: "Operational truth", subtitle: (() => { const t = operationalTruth(); return `${t.real} real actions · ${t.pending} pending`; })(), category: "Diagnostics", run: () => setGodOpen(true) },
      { id: "diag:check", title: "Check superpowers now", subtitle: "re-probe all health signals", category: "Diagnostics", run: () => { queryClient.invalidateQueries({ queryKey: ["tools"] }); } },
      { id: "guide:sectors", title: "Open Dragon Guide", subtitle: "sectors · superpowers · workflows · statuses", category: "Guide", icon: <IcSearch />, run: () => setGuideOpen(true) },
    ]);
  }, []);

  // Contextual provider — the active sector's actions surface in the palette as
  // Recommended (disabled ones stay visible with their honest reason).
  useEffect(() => {
    const s = SECTOR_FOR_VIEW[view];
    if (s === "support") return registerProvider("contextual", () => []);
    return registerProvider("contextual", (): Cmd[] =>
      SECTOR_ACTIONS[s].map((a): Cmd => {
        const denied = !!a.cap && !canRef.current(a.cap); // cooperative gate
        return {
          id: `rec:${s}:${a.id}`,
          title: a.label,
          category: "Recommended",
          icon: a.icon(),
          disabledReason: denied ? "restricted — ask an owner" : a.disabledReason,
          run: denied ? () => {} : (a.run ?? (() => {})),
        };
      }));
  }, [view]);

  // Mission-Control palette commands: launch agents into projects.
  useEffect(() => {
    return registerProvider("mission", (): Cmd[] => {
      let seq = 0;
      const launch = (cwd: string, id: string) => window.dai.term.create({ id: `mck${Date.now().toString(36)}${seq++}`, cmd: "claude", cwd });
      return [
        { id: "mc:agents", title: "Mission-Control: open Agents cockpit", category: "Action", icon: <IcBot size={13} />, run: () => setView("agents") },
        ...projects.map((p): Cmd => ({ id: "mc:launch:" + p.path, title: "Launch claude in " + p.name, subtitle: p.path.replace(/^\/Users\/[^/]+/, "~"), category: "Action", icon: <IcSigil size={13} />, run: () => { launch(p.path, p.path); setView("agents"); } })),
      ];
    });
  }, [projects]);

  const roots = useMemo(() => {
    if (!host) return [];
    // walk the concrete projects (not all of ~) so the file index stays fast
    return host.projects.filter((p) => p !== host.home);
  }, [host]);

  const sector = SECTOR_FOR_VIEW[view];
  // cooperative gate — a core sector the member lacks renders a restricted panel
  // instead of the view. LeftRail hides it and ⌘1-8 blocks it; this render check
  // also catches dai:goto and any indirect navigation. Logged to the audit trail.
  const sectorBlocked = CORE_SECTORS.some((s) => s.id === view) && !can("sector:" + view);
  useEffect(() => {
    if (sectorBlocked) window.dai.audit.log("access-denied", `viewed restricted sector:${view}`);
  }, [sectorBlocked, view]);

  return (
    <>
      <TitleBar />
      <div className="bg-vignette" />
      {/* forge layer — VISIBLE atmosphere: royal dragon watermark, two aurora
          smoke bands, rising embers. Pure CSS motion, killed by reduced-motion. */}
      <div className="fx" aria-hidden>
        {/* imperial watermark — the dragon itself (transparent cutout), not a medallion circle */}
        <div className="fx-dragon"><img className="fx-dragon-mark" src={dragonMark} alt="" draggable={false} /></div>
        {Array.from({ length: 11 }, (_, i) => <span key={i} className="fx-ember" style={{ ["--i" as any]: i }} />)}
      </div>
      <div className="shell" data-sector={sector}>
        <TopBar
          onPalette={() => setPaletteOpen(true)}
          onSettings={() => { setAdminCat("appearance"); setAdminOpen(true); }}
        />

        <EcosystemBar />

        <div className="shell-main">
          <LeftRail
            view={view}
            onView={setView}
            moreOpen={moreOpen}
            onMoreToggle={setMoreOpen}
            onGuide={() => setGuideOpen(true)}
            onSettings={() => { setAdminCat("appearance"); setAdminOpen(true); }}
          />

          <main className="shell-view">
            {/* ide stays mounted (terminals survive view switches); hidden when
                inactive or when the member lacks sector:ide */}
            <div style={{ display: view === "ide" && !sectorBlocked ? "flex" : "none", flex: 1, minHeight: 0, flexDirection: "column" }}>
              <TerminalsView />
            </div>
            {sectorBlocked ? (
              <div className="empty restricted-panel">
                <div className="restricted-title">Access restricted</div>
                <div className="restricted-sub">The <b>{CORE_SECTORS.find((s) => s.id === view)?.label ?? view}</b> sector isn't granted to you. Ask an owner to enable it — changes arrive through Team Sync.</div>
              </div>
            ) : (
              <>
                {view === "agents" && (
                  <div className="mc-shell">
                    <AgentsView onOpenFile={goOpenFile} />
                    <MissionBar projects={projects} />
                  </div>
                )}
                {view === "radar" && <RadarView />}
                {view === "code" && (
                  <Suspense fallback={
                    <div className="empty brand-loading">
                      <DragonEmblem size={44} />
                      <span>loading editor…</span>
                    </div>
                  }>
                    <CodeView openFile={openFile} />
                  </Suspense>
                )}
                {view === "metrics" && <MetricsView />}
                {view === "neuromap" && <NeuromapView />}
                {view === "preview" && <PreviewView />}
                {view === "research" && <ResearchView />}
                {view === "creative" && <CreativeView />}
                {view === "drive" && <DriveView />}
                {view === "library" && <LibraryView />}
              </>
            )}
          </main>
        </div>

        <StatusBar view={view} />
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} roots={roots} onOpenFile={goOpenFile} />
      <PhoneConnect open={phoneOpen} onClose={() => setPhoneOpen(false)} projects={projects} />
      <CredentialsVault open={vaultOpen} onClose={() => setVaultOpen(false)} />
      <GodModePanel open={godOpen} onClose={() => setGodOpen(false)} onCommand={() => setPaletteOpen(true)} />
      <SectorAgentDock view={view} />
      <SuperpowerPanel id={spOpen} onClose={() => setSpOpen(null)} />
      <AdminPanel open={adminOpen} cat={adminCat} onClose={() => setAdminOpen(false)} onCat={setAdminCat} />
      <GuidePanel
        open={guideOpen}
        current={view}
        onClose={() => setGuideOpen(false)}
        onOpenSector={(id) => { setView(id); setGuideOpen(false); }}
      />
      <ToastHost />
      {/* first-run identity — resolves WHO this install is before gating applies;
          mounted last so it layers above every other panel */}
      <FirstRunIdentity open={!!me?.needsIdentity} onDone={() => queryClient.invalidateQueries({ queryKey: ["me"] })} />
    </>
  );
}
