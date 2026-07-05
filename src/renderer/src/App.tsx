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
import { MissionBar } from "./components/MissionBar";
import { CommandPalette } from "./components/CommandPalette";
import { PhoneConnect } from "./components/PhoneConnect";
import { CredentialsVault } from "./components/CredentialsVault";
import { EcosystemBar } from "./components/EcosystemBar";
import { GodModePanel } from "./components/GodModePanel";
import { AdminPanel, type AdminTab } from "./components/AdminPanel";
import { InteractiveGuide } from "./components/InteractiveGuide";
import { DragonEmblem } from "./components/DragonEmblem";
import dragonMark from "./assets/dragon-mark.png";
import { registerProvider, Cmd } from "./palette";
import { fetchHost, fetchProjects, fetchGDriveStatus, broadcast } from "./api";
import { IcCommand, IcCrown, IcGem, IcSearch, IcTerminal } from "./components/icons";
import { CORE_SECTORS, MORE_CATEGORIES, STATUS_META } from "./registry";

// Monaco is ~5MB — keep it out of the initial bundle, load only when Code opens.
const CodeView = lazy(() => import("./views/CodeView").then((m) => ({ default: m.CodeView })));

type View = "ide" | "agents" | "radar" | "code" | "metrics" | "neuromap" | "preview" | "research" | "creative" | "drive";
export type OpenFileSignal = { path: string; n: number } | null;

export default function App() {
  const [view, setView] = useState<View>("ide");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [godOpen, setGodOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<AdminTab>("settings");

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
    const goto = (e: Event) => setView((e as CustomEvent).detail as View);
    const vault = () => setVaultOpen(true);
    const phone = () => setPhoneOpen(true);
    const god = () => setGodOpen(true);
    const more = () => setMoreOpen(true);
    const admin = (e: Event) => {
      const t = (e as CustomEvent).detail as AdminTab | undefined;
      if (t) setAdminTab(t);
      setAdminOpen(true);
    };
    window.addEventListener("dai:admin", admin);
    window.addEventListener("dai:goto", goto);
    window.addEventListener("dai:vault", vault);
    window.addEventListener("dai:phone", phone);
    window.addEventListener("dai:godmode", god);
    window.addEventListener("dai:more", more);
    return () => {
      window.removeEventListener("dai:admin", admin);
      window.removeEventListener("dai:goto", goto);
      window.removeEventListener("dai:vault", vault);
      window.removeEventListener("dai:phone", phone);
      window.removeEventListener("dai:godmode", god);
      window.removeEventListener("dai:more", more);
    };
  }, []);

  // ⌘K palette + ⌘J phone-connect — global toggles.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      if (k === "k") { e.preventDefault(); setPaletteOpen((o) => !o); }
      else if (k === "j") { e.preventDefault(); setPhoneOpen((o) => !o); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const goOpenFile = (path: string) => {
    nonce.current += 1;
    setOpenFile({ path, n: nonce.current });
    setView("code");
  };

  // App-level palette: core sectors, superpowers, terminal commands, admin.
  // Every command runs for real; disabled ones state their reason in the subtitle.
  useEffect(() => {
    return registerProvider("app", (): Cmd[] => [
      // core sectors (from the registry — one truth)
      ...CORE_SECTORS.map((s): Cmd => ({
        id: "view:" + s.id, title: "Open " + s.label, category: "View", icon: s.icon(), run: () => setView(s.id as View),
      })),
      // superpowers
      { id: "sp:godmode", title: "Open GODMODE", subtitle: "supreme command center", category: "Superpower", icon: <IcCrown />, run: () => setGodOpen(true) },
      { id: "sp:obsidian", title: "Activate Obsidian (open vault)", category: "Superpower", icon: <IcGem />, run: () => window.dai.tools.action("open-obsidian") },
      { id: "sp:grapevine", title: "Open Grapevine Map", subtitle: "Neuromap", category: "Superpower", run: () => setView("neuromap") },
      { id: "sp:cloud", title: "Launch Cloud (Claude) Session", category: "Superpower", run: () => { window.dai.term.create({ id: `pk${Date.now().toString(36)}`, cmd: "claude", cwd: "~" }); setView("agents"); } },
      // terminal commands — broadcast to the visible workers (real keystrokes)
      { id: "t:git-status", title: "Terminal: run git status on workers", category: "Terminal", icon: <IcTerminal />, run: () => { setView("ide"); broadcast("git status", true); } },
      { id: "t:npm-dev", title: "Terminal: run npm run dev on workers", category: "Terminal", icon: <IcTerminal />, run: () => { setView("ide"); broadcast("npm run dev", true); } },
      // support + admin
      { id: "view:research", title: "Open Research (intelligence desk)", category: "View", run: () => setView("research") },
      { id: "view:radar", title: "Open GitHub Radar + rescan", category: "View", run: () => { setView("radar"); window.dai.radar.refresh(); } },
      { id: "action:phone", title: "Phone — code from your phone", subtitle: "⌘J", category: "Admin", run: () => setPhoneOpen(true) },
      { id: "action:keys", title: "Keys — credentials vault", category: "Admin", run: () => setVaultOpen(true) },
      { id: "action:audit", title: "Audit trail", subtitle: "local action log", category: "Admin", run: () => { setAdminTab("audit"); setAdminOpen(true); } },
      { id: "action:settings", title: "Settings — IDE configuration", category: "Admin", run: () => { setAdminTab("settings"); setAdminOpen(true); } },
      { id: "action:perms", title: "Permissions — team & roles", category: "Admin", run: () => { setAdminTab("perms"); setAdminOpen(true); } },
      { id: "action:vaultsync", title: "Sync Obsidian vault", subtitle: "git snapshot + push/pull", category: "Admin", run: () => { setAdminTab("team"); setAdminOpen(true); } },
      { id: "guide:sectors", title: "Open interactive sector guide", subtitle: "explain every sector + hints", category: "Help", icon: <IcSearch />, run: () => setGuideOpen(true) },
    ]);
  }, []);

  // Mission-Control palette commands: launch agents into projects.
  useEffect(() => {
    return registerProvider("mission", (): Cmd[] => {
      let seq = 0;
      const launch = (cwd: string, id: string) => window.dai.term.create({ id: `mck${Date.now().toString(36)}${seq++}`, cmd: "claude", cwd });
      return [
        { id: "mc:agents", title: "Mission-Control: open Agents cockpit", category: "Action", icon: "🤖", run: () => setView("agents") },
        ...projects.map((p): Cmd => ({ id: "mc:launch:" + p.path, title: "Launch claude in " + p.name, subtitle: p.path.replace(/^\/Users\/[^/]+/, "~"), category: "Action", icon: "🜲", run: () => { launch(p.path, p.path); setView("agents"); } })),
      ];
    });
  }, [projects]);

  const roots = useMemo(() => {
    if (!host) return [];
    // walk the concrete projects (not all of ~) so the file index stays fast
    return host.projects.filter((p) => p !== host.home);
  }, [host]);

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
      <div className="shell">
        <div className="topbar">
          <div className="brand">
            <span className="glyph"><DragonEmblem size={34} /></span>
            <div>
              <h1>Dragons Alliance IDE</h1>
              <div className="sub">Command Center · AI Operations</div>
            </div>
          </div>
          <div className="viewswitch">
            {/* Layer 1 — CORE SECTORS: the eight permanent decks, one truth (registry) */}
            {CORE_SECTORS.map((s) => (
              <button key={s.id} className={view === s.id ? "active" : ""}
                onClick={() => setView(s.id as View)} title={s.label}>
                {s.icon()} {s.label}
              </button>
            ))}
            <div className="more-wrap">
              <button className={view === "radar" || view === "research" ? "active" : ""}
                onClick={() => setMoreOpen((o) => !o)} title="support tools · admin · experimental">
                More ▾
              </button>
              {moreOpen && (
                <>
                  <div className="more-backdrop" onClick={() => setMoreOpen(false)} />
                  <div className="more-menu wide">
                    {MORE_CATEGORIES.map((cat) => (
                      <div key={cat.title} className="more-cat">
                        <div className="more-head">{cat.title}</div>
                        {cat.items.map((it) => it.run ? (
                          <button key={it.id} className="more-item"
                            onClick={() => { it.run!(); setMoreOpen(false); }}>
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
                    ))}
                  </div>
                </>
              )}
            </div>
            <button className="cmdk-btn" onClick={() => setPaletteOpen(true)} title="Command palette (⌘K)"><IcCommand /> K</button>
            <button className="guide-btn" onClick={() => setGuideOpen(true)} title="Interactive sector guide"><IcSearch /> Guide</button>
          </div>
        </div>

        <EcosystemBar />

        <div style={{ display: view === "ide" ? "flex" : "none", flex: 1, minHeight: 0, flexDirection: "column" }}>
          <TerminalsView />
        </div>
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

        <div className="footer">
          native pty-host · agent mission-control · ⌘K command palette
        </div>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} roots={roots} onOpenFile={goOpenFile} />
      <PhoneConnect open={phoneOpen} onClose={() => setPhoneOpen(false)} projects={projects} />
      <CredentialsVault open={vaultOpen} onClose={() => setVaultOpen(false)} />
      <GodModePanel open={godOpen} onClose={() => setGodOpen(false)} onCommand={() => setPaletteOpen(true)} />
      <AdminPanel open={adminOpen} tab={adminTab} onClose={() => setAdminOpen(false)} onTab={setAdminTab} />
      <InteractiveGuide
        open={guideOpen}
        current={view}
        onClose={() => setGuideOpen(false)}
        onOpenSector={(id) => { setView(id); setGuideOpen(false); }}
      />
    </>
  );
}
