import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TerminalPane, PaneHandle } from "../components/TerminalPane";
import { ProjectRail } from "../components/ProjectRail";
import { broadcast, fetchHost, fetchTerms, fetchProjects, Term } from "../api";
import { registerProvider, Cmd } from "../palette";
import { pushToast } from "../toast";
import { elementFor } from "../elements";
import { Crystal } from "../components/Crystal";
import { EmptyState, StatusPill } from "../components/da";
import { IcTerminal, IcSigil, IcSend, IcCrown, IcNodes, IcBroadcast, IcSheet, IcMonitor, IcCube, IcCommand, IcFolder } from "../components/icons";

let SEQ = 1;
const newId = () => `t${Date.now().toString(36)}${SEQ++}`;

/** Column count for the tiles layout so 1..8 terminals stay balanced + fit. */
function tileCols(n: number): number {
  if (n <= 1) return 1;
  if (n <= 4) return 2;   // 2, 3-4 → 2 columns
  if (n <= 6) return 3;   // 5-6   → 3 columns
  return 4;               // 7-8   → 4 columns
}

export function TerminalsView() {
  const { data: host } = useQuery({ queryKey: ["host"], queryFn: fetchHost, refetchInterval: false });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: fetchProjects, refetchInterval: 4000 });

  const [master, setMaster] = useState<Term | null>(null);
  const [workers, setWorkers] = useState<Term[]>([]);
  const [activeWorker, setActiveWorker] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<string | null>(null); // null = All
  const [layout, setLayout] = useState<"grid" | "focus" | "quad">("grid");
  const [sync, setSync] = useState(false);
  const [linkedIds, setLinkedIds] = useState<string[]>([]); // terminals linked to master (empty = whole scope)
  const [channelOn, setChannelOn] = useState(false);        // open peer-mesh channel between terminals
  const [channelIds, setChannelIds] = useState<string[]>([]); // terminals in the open channel (empty = all visible)
  const [menuOpen, setMenuOpen] = useState(false);
  const [bmsg, setBmsg] = useState("");
  const [flash, setFlash] = useState("");
  const [ollamaStatus, setOllamaStatus] = useState<{ available: boolean; models: string[]; error?: string }>({ available: false, models: [] });
  const [hermesStatus, setHermesStatus] = useState<{ available: boolean; model?: string }>({ available: false });
  const [codexStatus, setCodexStatus] = useState<{ available: boolean }>({ available: false });
  const [ollamaModelPickerOpen, setOllamaModelPickerOpen] = useState(false);
  const [selectedOllamaModel, setSelectedOllamaModel] = useState<string>('');

  // --- Status checking for Ollama, Hermes, Codex ---
  const checkOllamaStatus = async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000); // 5-second timeout
      const response = await fetch('http://127.0.0.1:11434/api/tags', { signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      const models = data.models?.map((m: { name: string }) => m.name) || [];
      const hermesModel = models.find((m: string) => m.toLowerCase().includes('hermes'));
      setOllamaStatus({ available: models.length > 0, models, error: undefined });
      setHermesStatus({ available: !!hermesModel, model: hermesModel });
    } catch (err) {
      setOllamaStatus({ available: false, models: [], error: err instanceof Error ? err.message : String(err) });
      setHermesStatus({ available: false, model: undefined });
    }
  };

  const checkCodexStatus = async () => {
    try {
      // Renderer has no direct Node/Electron access (contextIsolation) — go
      // through the preload bridge, same pattern as every other window.dai.* call.
      const result = await window.dai.system.checkCommand("codex");
      setCodexStatus({ available: !!result });
    } catch (err) {
      setCodexStatus({ available: false });
    }
  };

  useEffect(() => {
    // Initial check
    (async () => {
      await checkOllamaStatus();
      await checkCodexStatus();
    })();

    // Set up interval to poll every 5 seconds
    const interval = setInterval(() => {
      (async () => {
        await checkOllamaStatus();
        await checkCodexStatus();
      })();
    }, 5000);

    return () => clearInterval(interval);
  }, []); // empty deps to run once on mount
  const [status, setStatus] = useState<Record<string, "open" | "closed">>({});

  const masterRef = useRef<PaneHandle>(null);
  const home = host?.home || "";

  // map a cwd to its deepest project path (for workspace filtering)
  const projOf = useMemo(() => {
    const paths = projects.map((p) => p.path).filter((p) => p !== home);
    return (cwd: string): string | null => {
      let best: string | null = null, bl = -1;
      for (const p of paths) {
        if ((cwd === p || cwd.startsWith(p + "/")) && p.length > bl) { best = p; bl = p.length; }
      }
      return best;
    };
  }, [projects, home]);

  const scope = activeProject ?? "all";

  useEffect(() => {
    if (!host || master) return;
    (async () => {
      const live = await fetchTerms();
      const m = live.find((t) => t.is_master);
      const ws = live.filter((t) => !t.is_master);
      if (m) {
        setMaster({ id: m.id, cmd: m.cmd, cwd: m.cwd });
        setWorkers(ws.map((t) => ({ id: t.id, cmd: t.cmd, cwd: t.cwd })));
        if (m.mirror) {
          setSync(true);
          // restore the SCOPE too, else a project-scoped master silently widens
          // to broadcast-to-ALL after a reload (the resync effect would push "all")
          if (m.mirror_scope && m.mirror_scope !== "all") setActiveProject(m.mirror_scope);
        }
      } else {
        setMaster({ id: newId(), cmd: "shell", cwd: host.home });
        setWorkers(ws.length ? ws.map((t) => ({ id: t.id, cmd: t.cmd, cwd: t.cwd }))
                             : [{ id: newId(), cmd: "shell", cwd: host.home }]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host]);

  // keep the master mirror in sync with the toggle + scope + explicit link picks.
  // linkedIds non-empty → master drives ONLY those terminals; empty → whole scope.
  useEffect(() => {
    if (master) {
      const ids = linkedIds.length ? linkedIds : undefined;
      const t = setTimeout(() => masterRef.current?.setMirror(sync, scope, ids), 250);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [master, sync, scope, linkedIds]);

  function toggleLink(id: string) {
    setLinkedIds((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  }
  function toggleChannel(id: string) {
    setChannelIds((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  }

  // Push the open-channel membership to the host. When the channel is on, every
  // member shares channel "mesh" → typing in any one co-types into all of them.
  useEffect(() => {
    const vis = activeProject ? workers.filter((w) => projOf(w.cwd) === activeProject) : workers;
    const members = channelOn ? (channelIds.length ? channelIds : vis.map((w) => w.id)) : [];
    const set = new Set(members);
    for (const w of workers) {
      try { window.dai.term.setChannel(w.id, set.has(w.id) ? "mesh" : null); } catch { /* host busy */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelOn, channelIds, workers, activeProject]);

  function add(cmd: string) {
    const cwd = activeProject || host?.home || "~";
    const t = { id: newId(), cmd, cwd };
    setWorkers((p) => [...p, t]);
    setActiveWorker(t.id);
    setMenuOpen(false);
  }
  // open (at least) N terminals in the active project and show them as tiles
  function openN(n: number) {
    const need = n - visibleWorkers.length;
    for (let i = 0; i < need; i++) add("shell");
    setLayout("quad");
  }
  function closeWorker(id: string) {
    window.dai.term.kill(id);
    setWorkers((p) => p.filter((t) => t.id !== id));
    setActiveWorker((a) => (a === id ? null : a));
    // prune the dead id from every membership set + status so we never mirror/
    // channel/label a terminal that no longer exists (audit: dead-id leak)
    setLinkedIds((cur) => cur.filter((x) => x !== id));
    setChannelIds((cur) => cur.filter((x) => x !== id));
    setStatus((p) => { const n = { ...p }; delete n[id]; return n; });
  }

  // right-rail actions: focus master input / mirror toggle / clear master
  useEffect(() => {
    const h = (e: Event) => {
      const a = (e as CustomEvent).detail;
      if (a === "term:focus-master") masterRef.current?.focus();
      else if (a === "term:toggle-sync") setSync((s) => !s);
      else if (a === "term:clear") masterRef.current?.clear();
    };
    window.addEventListener("dai:sector-action", h);
    return () => window.removeEventListener("dai:sector-action", h);
  }, []);

  async function quickSend() {
    if (!bmsg.trim()) return;
    const ids = visibleWorkers.map((w) => w.id);
    const r = await broadcast(bmsg, true, ids);
    setFlash(`sent → ${r.sent}`);
    setBmsg("");
    setTimeout(() => setFlash(""), 1600);
  }

  // Expose terminal/project/sync actions to the ⌘K command palette. The provider
  // reads a ref so it always reflects current state at open time.
  const pref = useRef<any>({});
  pref.current = { add, sync, setSync, setLayout, setActiveProject, setActiveWorker, projects, workers, home: host?.home };
  useEffect(() => registerProvider("terminals", (): Cmd[] => {
    const s = pref.current;
    const tilde = (p: string) => p.replace(/^\/Users\/[^/]+/, "~");
    return [
      { id: "t:new-shell", title: "New terminal: zsh shell", category: "Terminal", icon: <IcTerminal size={13} />, run: () => s.add("shell") },
      { id: "t:new-claude", title: "New terminal: claude session", category: "Terminal", icon: <IcSigil size={13} />, run: () => s.add("claude") },
      { id: "t:sync", title: s.sync ? "Master sync — turn OFF" : "Master sync — turn ON", category: "Action", icon: <IcBroadcast size={13} />, run: () => s.setSync(!s.sync) },
      { id: "t:grid", title: "Layout: grid", category: "Action", icon: <IcSheet size={13} />, run: () => s.setLayout("grid") },
      { id: "t:focus", title: "Layout: focus", category: "Action", icon: <IcMonitor size={13} />, run: () => s.setLayout("focus") },
      { id: "t:quad", title: "Layout: tiles (adaptive up to 8)", category: "Action", icon: <IcCube size={13} />, run: () => s.setLayout("quad") },
      { id: "t:all", title: "Workspace: All projects", category: "Project", icon: <IcCommand size={13} />, run: () => s.setActiveProject(null) },
      ...s.projects.map((p: any): Cmd => ({ id: "t:proj:" + p.path, title: "Workspace: " + p.name, subtitle: tilde(p.path), category: "Project", icon: <IcFolder size={13} />, run: () => s.setActiveProject(p.path) })),
      ...s.workers.map((w: Term): Cmd => ({ id: "t:foc:" + w.id, title: "Focus terminal: " + (w.cmd === "claude" ? "claude" : "zsh"), subtitle: tilde(w.cwd), category: "Terminal", icon: <IcTerminal size={13} />, run: () => { s.setActiveWorker(w.id); s.setLayout("focus"); } })),
    ];
  }), []);

  const visibleWorkers = activeProject
    ? workers.filter((w) => projOf(w.cwd) === activeProject)
    : workers;
  const liveCount = visibleWorkers.filter((w) => status[w.id] !== "closed").length;
  const showId = activeWorker && visibleWorkers.some((w) => w.id === activeWorker)
    ? activeWorker : visibleWorkers[0]?.id ?? null;
  const activeName = activeProject ? projects.find((p) => p.path === activeProject)?.name : "all";
  const inChannel = (id: string) =>
    channelOn && (channelIds.length === 0 ? visibleWorkers.some((w) => w.id === id) : channelIds.includes(id));

  return (
    <div className="ide-pro">
      <ProjectRail projects={projects} activePath={activeProject} onSelect={setActiveProject} />

      <div className={`ide${layout === "quad" ? " ide-quad" : ""}`}>
        {/* MASTER — collapses to just its bar in quad mode so 4 workers get the full 2×2 */}
        <div className={`master-zone${layout === "quad" ? " collapsed" : ""}`}>
          <div className="master-bar">
            <div className="mb-left">
              <span className="crown"><IcCrown size={14} /></span>
              <span className="mb-title">MASTER TERMINAL</span>
              <StatusPill state="idle">zsh</StatusPill>
              <StatusPill state={sync ? "sync" : "off"}>{sync ? `synced · ${liveCount}` : "solo"}</StatusPill>
              <span className="mb-sub">{layout === "quad" ? "master hidden in tiles · use grid to drive" : `drives ${scope === "all" ? "every terminal" : `· ${activeName}`} live when synced`}</span>
            </div>
            <div className="mb-right">
              <button className={`syncbtn${sync ? " on" : ""}`} onClick={() => setSync((s) => !s)}>
                <span className="syncdot" />
                {sync ? `SYNC · ${scope === "all" ? "ALL" : activeName} · ${liveCount} linked` : "SYNC OFF"}
              </button>
            </div>
          </div>
          {sync && visibleWorkers.length > 0 && (
            <div className="link-picker">
              <span className="lp-label">link to master:</span>
              {visibleWorkers.map((w, i) => {
                const on = linkedIds.length === 0 || linkedIds.includes(w.id);
                const el = elementFor(i);
                return (
                  <button key={w.id} className={`lp-chip${on ? " on" : ""}`} onClick={() => toggleLink(w.id)}
                    style={on ? { ["--el" as any]: el.color } : undefined}
                    title={`${el.name} · ${w.cwd.replace(/^\/Users\/[^/]+/, "~")} — ${on ? "linked" : "not linked"}`}>
                    <Crystal el={el} lit={on} size={14} /> {el.name}
                  </button>
                );
              })}
              <span className="lp-sep" />
              <button className="lp-quick" onClick={() => setLinkedIds([])}>all</button>
              <button className="lp-quick" onClick={() => setLinkedIds(visibleWorkers.slice(0, 1).map((w) => w.id))}>1</button>
              <button className="lp-quick" onClick={() => setLinkedIds(visibleWorkers.slice(0, 2).map((w) => w.id))}>2</button>
              <span className="lp-count">{linkedIds.length === 0 ? visibleWorkers.length : linkedIds.length} linked</span>
            </div>
          )}
          {channelOn && visibleWorkers.length > 0 && (
            <div className="link-picker chan-picker">
              <span className="lp-label"><IcNodes size={11} /> open channel:</span>
              {visibleWorkers.map((w, i) => {
                const on = inChannel(w.id);
                const el = elementFor(i);
                return (
                  <button key={w.id} className={`lp-chip${on ? " on" : ""}`} onClick={() => toggleChannel(w.id)}
                    style={on ? { ["--el" as any]: el.color } : undefined}
                    title={`${el.name} — ${on ? "in channel" : "not in channel"}`}>
                    <Crystal el={el} lit={on} size={14} /> {el.name}
                  </button>
                );
              })}
              <span className="lp-sep" />
              <button className="lp-quick" onClick={() => setChannelIds([])}>all</button>
              <span className="lp-count">{(channelIds.length === 0 ? visibleWorkers.length : channelIds.length)} interconnected · type in any → all</span>
            </div>
          )}
          <div className={`master-pane-host${sync ? " linked" : ""}`}>
            {master && (
              <TerminalPane ref={masterRef} term={master} isMaster active
                onClose={() => {}} onStatus={(s) => setStatus((p) => ({ ...p, [master.id]: s }))} />
            )}
          </div>
        </div>

        {/* TOOLBAR */}
        <div className="ide-toolbar">
          <div className="tb-left">
            <div className="newterm">
              <button className="primary" onClick={() => setMenuOpen((o) => !o)}>+ Worker ▾</button>
              {menuOpen && (
                <div className="menu">
                  <div className="menu-sep">into {activeProject ? activeName : "~ home"}</div>
                  {/* Existing items */}
                  <div className="menu-row" onClick={() => add("shell")}><IcTerminal /><b>zsh shell</b></div>
                  <div className="menu-row" onClick={() => add("claude")}><IcSigil /><b>claude session</b></div>
                  {/* New items */}
                  {/* Ollama session */}
                  <div className="menu-row" onClick={() => {
                    if (!ollamaStatus.available || ollamaStatus.models.length === 0) {
                      pushToast({ kind: "info", title: "ollama not running", detail: "start it, then retry", ttl: 3800 });
                      return;
                    }
                    setOllamaModelPickerOpen(true);
                  }}>
                    <IcTerminal />
                    <b>ollama session</b>
                    {ollamaStatus.available ? (
                      <span className="status-dot" style={{ backgroundColor: '#4ade80', display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', marginLeft: '8px' }} />
                    ) : (
                      <span className="status-dot" style={{ backgroundColor: '#6b7280', display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', marginLeft: '8px' }} />
                    )}
                    {ollamaStatus.available && ollamaStatus.models.length > 0 && (
                      <span className="model-list" style={{ fontSize: '0.75em', color: '#6b7280', marginLeft: '8px' }}>
                        {ollamaStatus.models.slice(0, 3).join(', ')}{ollamaStatus.models.length > 3 ? '...' : ''}
                      </span>
                    )}
                  </div>
                  {/* Hermes session */}
                  <div className="menu-row" onClick={() => {
                    if (!hermesStatus.available) {
                      pushToast({ kind: "info", title: "hermes not running", detail: "start it, then retry", ttl: 3800 });
                      return;
                    }
                    const command = `ollama run ${hermesStatus.model}`;
                    add(command);
                  }}>
                    <IcTerminal />
                    <b>hermes session</b>
                    {hermesStatus.available ? (
                      <span className="status-dot" style={{ backgroundColor: '#4ade80', display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', marginLeft: '8px' }} />
                    ) : (
                      <span className="status-dot" style={{ backgroundColor: '#6b7280', display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', marginLeft: '8px' }} />
                    )}
                    {hermesStatus.available && hermesStatus.model && (
                      <span className="model-list" style={{ fontSize: '0.75em', color: '#6b7280', marginLeft: '8px' }}>
                        {hermesStatus.model}
                      </span>
                    )}
                  </div>
                  {/* Codex session */}
                  <div className="menu-row" onClick={() => {
                    if (!codexStatus.available) {
                      pushToast({ kind: "info", title: "codex not running", detail: "start it, then retry", ttl: 3800 });
                      return;
                    }
                    add('codex');
                  }}>
                    <IcTerminal />
                    <b>codex session</b>
                    {codexStatus.available ? (
                      <span className="status-dot" style={{ backgroundColor: '#4ade80', display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', marginLeft: '8px' }} />
                    ) : (
                      <span className="status-dot" style={{ backgroundColor: '#6b7280', display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', marginLeft: '8px' }} />
                    )}
                  </div>
                  {/* Ollama model picker (shown when ollama model picker is open) */}
                  {ollamaModelPickerOpen && (
                    <>
                      <div className="menu-sep">Select Ollama Model</div>
                      {ollamaStatus.models.map((model) => (
                        <div
                          key={model}
                          className="menu-row"
                          onClick={() => {
                            const command = `ollama run ${model}`;
                            add(command);
                            setOllamaModelPickerOpen(false);
                          }}
                        >
                          <IcTerminal />
                          <b>{model}</b>
                        </div>
                      ))}
                      <div className="menu-row" onClick={() => setOllamaModelPickerOpen(false)}>
                        <i>Cancel</i>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="seg">
              <button className={layout === "grid" ? "active" : ""} onClick={() => setLayout("grid")} aria-label="Grid layout"><IcSheet size={11} /> grid</button>
              <button className={layout === "focus" ? "active" : ""} onClick={() => setLayout("focus")} aria-label="Focus layout"><IcMonitor size={11} /> focus</button>
              <button className={layout === "quad" ? "active" : ""} onClick={() => setLayout("quad")} aria-label="Tiles layout"><IcCube size={11} /> tiles</button>
            </div>
            <button className="addterm" onClick={() => add("shell")} disabled={visibleWorkers.length >= 8}
              title={visibleWorkers.length >= 8 ? "max 8 terminals" : "add a terminal"}>+ Add</button>
            <div className="quickopen">
              <span className="qo-label">DEPLOY</span>
              {[2, 4, 6, 8].map((n) => (
                <button key={n} className={`qo-btn${visibleWorkers.length >= n ? " armed" : ""}`}
                  onClick={() => openN(n)} title={`open ${n} worker terminals as tiles`}>{n}</button>
              ))}
            </div>
            <button className={`chanbtn${channelOn ? " on" : ""}`} onClick={() => setChannelOn((c) => !c)}
              title="open a live channel between terminals — type in any, it co-types into all">
              <IcNodes size={11} /> Channel {channelOn ? "ON" : "OFF"}
            </button>
            {layout === "focus" && (
              <div className="tabs">
                {visibleWorkers.map((t) => (
                  <button key={t.id} className={t.id === showId ? "tab active" : "tab"} onClick={() => setActiveWorker(t.id)}>
                    <span className={`tdot tdot-${t.cmd}`} />{t.cmd === "claude" ? "claude" : "zsh"}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="tb-right">
            <span className="tcount">{activeProject ? activeName + " · " : ""}{liveCount}/{visibleWorkers.length} workers</span>
          </div>
        </div>

        {/* WORKERS — tiles adapt 1..8 (columns from count) and always fit the viewport */}
        <div
          className={layout === "grid" ? "term-grid" : layout === "quad" ? "term-tiles" : "term-focus"}
          style={layout === "quad" ? { gridTemplateColumns: `repeat(${tileCols(visibleWorkers.length)}, minmax(0, 1fr))` } : undefined}
        >
          {visibleWorkers.length === 0 && (
            <EmptyState
              icon={<IcSigil size={34} />}
              title="Ready for command"
              hint={`No workers in ${activeProject ? activeName : "any project"}. Deploy one, or arm a one-shot below.`}
              actions={[
                { label: "+ Deploy worker", onClick: () => add("shell"), primary: true },
                { label: "git status", onClick: () => setBmsg("git status") },
                { label: "npm run dev", onClick: () => setBmsg("npm run dev") },
                { label: "npm test", onClick: () => setBmsg("npm test") },
              ]}
            />
          )}
          {(layout === "quad" ? visibleWorkers.slice(0, 8) : visibleWorkers).map((t, i) => (
            <div key={t.id} className="pane-wrap" style={{ display: layout === "grid" || layout === "quad" || t.id === showId ? "flex" : "none" }}>
              <TerminalPane term={t} active={layout === "grid" || layout === "quad" || t.id === showId}
                element={elementFor(i)} lit={sync && (linkedIds.length === 0 || linkedIds.includes(t.id))}
                inChannel={inChannel(t.id)}
                onClose={() => closeWorker(t.id)} onStatus={(s) => setStatus((p) => ({ ...p, [t.id]: s }))} />
            </div>
          ))}
        </div>

        {/* QUICK BROADCAST */}
        <div className="broadcast">
          <span className="bc-label"><IcSend /> send → {activeProject ? activeName : "all"} workers</span>
          <input value={bmsg} onChange={(e) => setBmsg(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") quickSend(); }}
            placeholder="one-shot command to the visible workers (e.g.  git status )" />
          <button className="primary" onClick={quickSend}>Run on all</button>
          {flash && <span className="bc-flash">{flash}</span>}
        </div>
      </div>
    </div>
  );
}
