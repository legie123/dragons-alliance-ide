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
import { DragonEmblem } from "./components/DragonEmblem";
import { registerProvider, Cmd } from "./palette";
import { fetchHost, fetchProjects, fetchGDriveStatus } from "./api";

// Monaco is ~5MB — keep it out of the initial bundle, load only when Code opens.
const CodeView = lazy(() => import("./views/CodeView").then((m) => ({ default: m.CodeView })));

type View = "ide" | "agents" | "radar" | "code" | "metrics" | "neuromap" | "preview" | "research" | "creative" | "drive";
export type OpenFileSignal = { path: string; n: number } | null;

// Secondary views live in the "More ▾" dropdown so the topbar stays readable.
const MORE_VIEWS: { id: View; label: string }[] = [
  { id: "metrics", label: "📊 Metrics" },
  { id: "radar", label: "📡 Radar" },
  { id: "preview", label: "🖥 Preview" },
  { id: "research", label: "🔎 Research" },
  { id: "creative", label: "🎨 Creative" },
];

export default function App() {
  const [view, setView] = useState<View>("ide");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

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

  // App-level palette commands: view switching + a couple of globals.
  useEffect(() => {
    return registerProvider("app", (): Cmd[] => [
      { id: "view:ide", title: "Go to Terminals", category: "View", icon: "⌘", run: () => setView("ide") },
      { id: "view:agents", title: "Go to Agents (Mission-Control)", category: "View", icon: "🤖", run: () => setView("agents") },
      { id: "view:radar", title: "Go to GitHub Radar", category: "View", icon: "📡", run: () => setView("radar") },
      { id: "view:code", title: "Go to Code", category: "View", icon: "⌗", run: () => setView("code") },
      { id: "view:metrics", title: "Go to Metrics", category: "View", icon: "📊", run: () => setView("metrics") },
      { id: "view:neuromap", title: "Go to Neuromap", category: "View", icon: "🧠", run: () => setView("neuromap") },
      { id: "view:preview", title: "Go to Preview", category: "View", icon: "🖥", run: () => setView("preview") },
      { id: "view:research", title: "Go to Research", category: "View", icon: "🔎", run: () => setView("research") },
      { id: "view:creative", title: "Go to Creative", category: "View", icon: "🎨", run: () => setView("creative") },
      { id: "view:drive", title: "Go to Google Drive", category: "View", icon: "☁️", run: () => setView("drive") },
      { id: "radar:refresh", title: "Radar: refresh scan (github-radar)", category: "Action", icon: "📡", run: () => { setView("radar"); window.dai.radar.refresh(); } },
      { id: "action:phone", title: "Connect from phone (code + communicate)", subtitle: "⌘J", category: "Action", icon: "📱", run: () => setPhoneOpen(true) },
      { id: "action:keys", title: "API keys & credentials (secure vault)", category: "Action", icon: "🔐", run: () => setVaultOpen(true) },
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
      <div className="shell">
        <div className="topbar">
          <div className="brand">
            <span className="glyph"><DragonEmblem size={34} /></span>
            <div>
              <h1>Dragons Alliance IDE</h1>
              <div className="sub">native · agent IDE · live intelligence</div>
            </div>
          </div>
          <div className="viewswitch">
            <button className={view === "ide" ? "active" : ""} onClick={() => setView("ide")}>⌘ Terminals</button>
            <button className={view === "agents" ? "active" : ""} onClick={() => setView("agents")}>🤖 Agents</button>
            <button className={view === "code" ? "active" : ""} onClick={() => setView("code")}>⌗ Code</button>
            <button className={view === "neuromap" ? "active" : ""} onClick={() => setView("neuromap")}>🧠 Neuromap</button>
            <button className={view === "drive" ? "active" : ""} onClick={() => setView("drive")}>☁️ Drive</button>
            <div className="more-wrap">
              <button
                className={MORE_VIEWS.some((v) => v.id === view) ? "active" : ""}
                onClick={() => setMoreOpen((o) => !o)}
                title="More views"
              >
                {MORE_VIEWS.find((v) => v.id === view)?.label ?? "More"} ▾
              </button>
              {moreOpen && (
                <>
                  <div className="more-backdrop" onClick={() => setMoreOpen(false)} />
                  <div className="more-menu">
                    {MORE_VIEWS.map((v) => (
                      <button key={v.id} className={view === v.id ? "active" : ""}
                        onClick={() => { setView(v.id); setMoreOpen(false); }}>
                        {v.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button className="phone-btn-top" onClick={() => setVaultOpen(true)} title="API keys &amp; credentials (secure, local)">🔐 Keys</button>
            <button className="phone-btn-top" onClick={() => setPhoneOpen(true)} title="Connect from phone — code &amp; communicate (⌘J)">📱 Phone</button>
            <button className="cmdk-btn" onClick={() => setPaletteOpen(true)} title="Command palette (⌘K)">⌘K</button>
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
          <Suspense fallback={<div className="empty">loading editor…</div>}>
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
    </>
  );
}
