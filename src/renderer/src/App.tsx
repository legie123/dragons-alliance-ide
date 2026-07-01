import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TitleBar } from "./components/TitleBar";
import { TerminalsView } from "./views/TerminalsView";
import { MetricsView } from "./views/MetricsView";
import { CommandPalette } from "./components/CommandPalette";
import { registerProvider, Cmd } from "./palette";
import { fetchHost } from "./api";

// Monaco is ~5MB — keep it out of the initial bundle, load only when Code opens.
const CodeView = lazy(() => import("./views/CodeView").then((m) => ({ default: m.CodeView })));

type View = "ide" | "code" | "metrics";
export type OpenFileSignal = { path: string; n: number } | null;

export default function App() {
  const [view, setView] = useState<View>("ide");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [openFile, setOpenFile] = useState<OpenFileSignal>(null);
  const nonce = useRef(0);
  const { data: host } = useQuery({ queryKey: ["host"], queryFn: fetchHost, refetchInterval: false });

  // Warm-load Monaco during idle so the first Code-view open is instant.
  useEffect(() => {
    const warm = () => { import("./views/CodeView"); };
    if ("requestIdleCallback" in window) (window as any).requestIdleCallback(warm);
    else setTimeout(warm, 2000);
  }, []);

  // ⌘K / Ctrl-K toggles the command palette globally.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
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

  // App-level palette commands: view switching + a couple of globals.
  useEffect(() => {
    return registerProvider("app", (): Cmd[] => [
      { id: "view:ide", title: "Go to Terminals", category: "View", icon: "⌘", run: () => setView("ide") },
      { id: "view:code", title: "Go to Code", category: "View", icon: "⌗", run: () => setView("code") },
      { id: "view:metrics", title: "Go to Metrics", category: "View", icon: "📊", run: () => setView("metrics") },
    ]);
  }, []);

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
            <span className="glyph">🜲</span>
            <div>
              <h1>Dragons Alliance IDE</h1>
              <div className="sub">native · agent IDE · live intelligence</div>
            </div>
          </div>
          <div className="viewswitch">
            <button className={view === "ide" ? "active" : ""} onClick={() => setView("ide")}>⌘ Terminals</button>
            <button className={view === "code" ? "active" : ""} onClick={() => setView("code")}>⌗ Code</button>
            <button className={view === "metrics" ? "active" : ""} onClick={() => setView("metrics")}>📊 Metrics</button>
            <button className="cmdk-btn" onClick={() => setPaletteOpen(true)} title="Command palette (⌘K)">⌘K</button>
          </div>
        </div>

        <div style={{ display: view === "ide" ? "flex" : "none", flex: 1, minHeight: 0, flexDirection: "column" }}>
          <TerminalsView />
        </div>
        {view === "code" && (
          <Suspense fallback={<div className="empty">loading editor…</div>}>
            <CodeView openFile={openFile} />
          </Suspense>
        )}
        {view === "metrics" && <MetricsView />}

        <div className="footer">
          native pty-host · MessagePort + flow control · ⌘K command palette
        </div>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} roots={roots} onOpenFile={goOpenFile} />
    </>
  );
}
