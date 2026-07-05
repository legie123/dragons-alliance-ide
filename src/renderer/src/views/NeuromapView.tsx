// Neuromap — the LIVING knowledge graph of the Obsidian vault (Antigravity-Brain),
// reframed for team operations. Real nodes + [[wikilink]] edges from local notes,
// a stable radial-by-folder layout, a SMART screen-space label engine (legible at
// every zoom, no soup), real time filtering (mtime), team-ops view modes that
// reshape the real graph + honest empty-states where a backend is still pending,
// and a diagnostics panel of real counts. No fake people, no fake tasks, no emoji.
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchNeuroGraph, fetchNeuroNode } from "../api";
import type { NeuroLayer, NeuroLens, NeuroNode, NeuroNodeDetail } from "../api";
import { SectionHeader, EmptyState } from "../components/da";
import { IcBrain, IcUsers, IcX, IcExternal, IcNodes, IcClip, IcChart } from "../components/icons";
import { openGraphify, openObsidian } from "../registry";
import { useT } from "../hooks/useAppearance";
import {
  labelPriority, truncateLabel, labelCap, placeLabels,
  type LabelMode, type LabelCandidate,
} from "./neuromap/labels";
import {
  VIEW_MODES, backendMode, passesTime, isTaskNode,
  TIME_KEYS, type ViewMode, type TimeKey,
} from "./neuromap/modes";

// Executive intelligence palette — token-sourced (SVG attrs need literals, so
// these mirror tokens.css values; keep in sync with --sector-*/--accent-*).
const LAYER_COLOR: Record<NeuroLayer, string> = {
  core: "var(--accent)", projects: "var(--blue)", "agents-notes": "var(--accent-violet)", all: "var(--faint)",
};
const FOLDER_COLOR = (folder: string): string => {
  const f = folder.toLowerCase();
  if (f.includes("research")) return "#43e0c0";  /* --teal */
  if (f.includes("memory")) return "#f0c75e";    /* --gold-soft */
  if (f.includes("meta") || f.includes("map")) return "#d4af37"; /* --accent */
  if (f.includes("project")) return "#5ea2ef";   /* --blue */
  if (f.includes("agent") || f.includes("claude")) return "#8d5cff"; /* --accent-violet */
  if (f.includes("decision")) return "#d24a36";  /* --accent-ember */
  if (f.includes("architect")) return "#b8860b"; /* --gold-deep */
  if (f.includes("task")) return "#e0a020";      /* task amber */
  return "#746a70";                              /* --faint */
};

type Pos = { x: number; y: number };

export function NeuromapView() {
  const [layer, setLayer] = useState<NeuroLayer>("core");
  const [viewMode, setViewMode] = useState<ViewMode>("knowledge");
  const [timeKey, setTimeKey] = useState<TimeKey>("all");
  const [labelMode, setLabelMode] = useState<LabelMode>("smart");
  const [lens, setLens] = useState<NeuroLens>("none");
  const [sel, setSel] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [detail, setDetail] = useState<NeuroNodeDetail | null>(null);
  const [q, setQ] = useState("");
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [scale, setScale] = useState(1);
  const [pulse, setPulse] = useState(0);
  const [focusMode, setFocusMode] = useState(false); // dim everything but the selected node's neighborhood
  const [showDiag, setShowDiag] = useState(false);
  const [copied, setCopied] = useState(false);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [reduceMotion] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

  const bmode = backendMode(viewMode);
  const opts = useMemo(() => ({ layers: [layer], mode: bmode, lens }), [layer, bmode, lens]);
  const { data: graph } = useQuery({
    queryKey: ["neuro", layer, bmode, lens, pulse],
    queryFn: () => fetchNeuroGraph(opts),
    refetchInterval: 8000,
  });

  // mode-entry side effects: Activity implies a 24h window, Files implies important labels
  useEffect(() => {
    if (viewMode === "activity") setTimeKey("24h");
    if (viewMode === "files") setLabelMode("important");
  }, [viewMode]);

  // live growth: fs.watch → pulse (re-query) when vault notes change
  useEffect(() => {
    window.dai.neuromap.watch([layer]);
    const off = window.dai.neuromap.onChanged?.(() => setPulse((p) => p + 1));
    return () => { off?.(); };
  }, [layer]);

  // node detail on selection
  useEffect(() => {
    if (!sel) { setDetail(null); return; }
    let alive = true;
    fetchNeuroNode(sel).then((d) => { if (alive) setDetail(d); });
    return () => { alive = false; };
  }, [sel]);

  // deterministic radial-by-folder layout (stable across polls, cheap)
  const positions = useMemo(() => {
    const pos = new Map<string, Pos>();
    if (!graph) return pos;
    const W = 1200, H = 760, cx = W / 2, cy = H / 2;
    const folders = Array.from(new Set(graph.nodes.map((n) => n.folder)));
    const perFolder = new Map<string, NeuroNode[]>();
    graph.nodes.forEach((n) => { (perFolder.get(n.folder) || perFolder.set(n.folder, []).get(n.folder)!).push(n); });
    folders.forEach((f, fi) => {
      const fang = (fi / folders.length) * Math.PI * 2;
      const fx = cx + Math.cos(fang) * 260, fy = cy + Math.sin(fang) * 200;
      const list = (perFolder.get(f) || []).sort((a, b) => b.deg - a.deg);
      list.forEach((n, i) => {
        if (i === 0) { pos.set(n.id, { x: fx, y: fy }); return; }
        const a = (i / list.length) * Math.PI * 2;
        const r = 40 + Math.min(90, list.length * 4);
        pos.set(n.id, { x: fx + Math.cos(a) * r, y: fy + Math.sin(a) * r });
      });
    });
    return pos;
  }, [graph]);

  const nodes = graph?.nodes ?? [];
  const edges = graph?.edges ?? [];
  const posOf = (id: string): Pos => positions.get(id) || { x: 600, y: 380 };
  const searchVisible = (n: NeuroNode) => !q || n.title.toLowerCase().includes(q.toLowerCase()) || n.tags.some((t) => t.toLowerCase().includes(q.toLowerCase()));

  // node radius — degree drives size; Activity mode nudges by recency
  const radiusOf = (n: NeuroNode): number => {
    let r = 4 + Math.min(10, n.deg * 1.2);
    if (viewMode === "activity") r += passesTime(n.mtime, "24h") ? 2.5 : -1;
    return Math.max(2.5, r);
  };

  // focus mode: the selected node + its direct links stay lit, the rest recede
  const hood = useMemo(() => {
    if (!sel) return null;
    const s = new Set<string>([sel]);
    for (const e of edges) { if (e.source === sel) s.add(e.target); if (e.target === sel) s.add(e.source); }
    return s;
  }, [sel, edges]);

  // top-degree spine — powers Clean mode + the "important" label tier threshold
  const byDeg = useMemo(() => [...nodes].sort((a, b) => b.deg - a.deg), [nodes]);
  const impThreshold = byDeg.length ? byDeg[Math.min(39, byDeg.length - 1)].deg : 0;

  // team-ops reshaping: which real nodes each mode hides (never adds fake ones)
  const taskNodes = useMemo(() => nodes.filter((n) => isTaskNode(n.folder)), [nodes]);
  const hiddenByMode = useMemo(() => {
    const hide = new Set<string>();
    if (viewMode === "clean") {
      const keep = new Set(byDeg.slice(0, 40).map((n) => n.id));
      if (sel) { keep.add(sel); for (const e of edges) { if (e.source === sel) keep.add(e.target); if (e.target === sel) keep.add(e.source); } }
      for (const n of nodes) if (!keep.has(n.id)) hide.add(n.id);
    } else if (viewMode === "tasks") {
      for (const n of nodes) if (!isTaskNode(n.folder)) hide.add(n.id);
    }
    return hide;
  }, [viewMode, byDeg, nodes, edges, sel]);
  const taskEmpty = viewMode === "tasks" && taskNodes.length === 0;

  const shown = useMemo(() => nodes.filter((n) => searchVisible(n) && !hiddenByMode.has(n.id)), [nodes, q, hiddenByMode]);
  const shownIds = useMemo(() => new Set(shown.map((n) => n.id)), [shown]);

  // edges: only between visible nodes; at low zoom drop all but the ones touching
  // the selected/hovered node (keeps the frame readable + cheap when zoomed out)
  const shownEdges = useMemo(() => {
    const lowZoom = scale < 0.6;
    return edges.filter((e) => {
      if (!shownIds.has(e.source) || !shownIds.has(e.target)) return false;
      const touch = e.source === sel || e.target === sel || e.source === hovered || e.target === hovered;
      return !(lowZoom && !touch);
    });
  }, [edges, shownIds, scale, sel, hovered]);

  // SMART LABELS — computed in screen space, priority-ranked, collision-culled
  const { placed: labels, considered } = useMemo(() => {
    const cands: LabelCandidate[] = [];
    for (const n of shown) {
      const isSel = n.id === sel, isHov = n.id === hovered;
      const force = isSel || isHov;
      if (labelMode === "off" && !force) continue;
      if (labelMode === "important" && !(force || n.fresh || n.deg >= impThreshold)) continue;
      const p = posOf(n.id);
      cands.push({
        id: n.id, text: truncateLabel(n.title),
        sx: p.x * scale + tx, sy: p.y * scale + ty + radiusOf(n) * scale + 11,
        priority: labelPriority(n, { selected: isSel, hovered: isHov }), force,
      });
    }
    const cap = labelMode === "smart" ? labelCap(scale) : labelMode === "off" ? 0 : 999;
    return { placed: placeLabels(cands, cap), considered: cands.length };
  }, [shown, labelMode, scale, tx, ty, sel, hovered, impThreshold, viewMode, positions]);
  const labelsHidden = considered - labels.length;

  const timeDim = (n: NeuroNode) => timeKey !== "all" && !passesTime(n.mtime, timeKey);
  const dimmed = (n: NeuroNode) => (focusMode && hood ? !hood.has(n.id) : false) || timeDim(n);

  const onWheel = (e: React.WheelEvent) => { e.preventDefault(); setScale((s) => Math.min(3, Math.max(0.3, s - e.deltaY * 0.001))); };
  const onDown = (e: React.MouseEvent) => { drag.current = { x: e.clientX - tx, y: e.clientY - ty }; };
  const onMove = (e: React.MouseEvent) => { if (drag.current) { setTx(e.clientX - drag.current.x); setTy(e.clientY - drag.current.y); } };
  useEffect(() => { const up = () => (drag.current = null); window.addEventListener("mouseup", up); return () => window.removeEventListener("mouseup", up); }, []);

  const resetView = () => { setTx(0); setTy(0); setScale(1); setFocusMode(false); };

  // right-rail actions: nm:focus (dim to selected hood), nm:reset (recenter)
  useEffect(() => {
    const h = (e: Event) => {
      const a = (e as CustomEvent).detail;
      if (a === "nm:focus") setFocusMode((f) => !f);
      else if (a === "nm:reset") resetView();
    };
    window.addEventListener("dai:sector-action", h);
    return () => window.removeEventListener("dai:sector-action", h);
  }, []);

  // keyboard a11y: Escape clears diagnostics → selection/focus; "/" focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showDiag) { setShowDiag(false); return; }
        setSel(null); setFocusMode(false);
      } else if (e.key === "/" && document.activeElement !== searchRef.current) {
        e.preventDefault(); searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showDiag]);

  const copyPath = () => {
    if (!detail) return;
    navigator.clipboard?.writeText(detail.id);
    setCopied(true); setTimeout(() => setCopied(false), 1200);
  };

  const t = useT();

  if (graph && nodes.length === 0) {
    return (
      <div className="nm-view">
        <SectionHeader icon={<IcBrain />} title="NEUROMAP"
          sub={t({ en: "Neural intelligence map", ro: "Harta inteligentei neuronale" })}
          status="idle" />
        <EmptyState icon={<IcNodes size={34} />}
          title={t({ en: "No graph data", ro: "Niciun graf" })}
          hint={t({
            en: "The vault layer returned no notes. Regenerate the Graphify digest or open the vault to add notes.",
            ro: "Layer-ul din vault nu are note. Regenereaza digestul Graphify sau deschide vault-ul si adauga note.",
          })}
          actions={[
            { label: t({ en: "Open Graph Digest", ro: "Deschide digestul" }), onClick: openGraphify, primary: true },
            { label: t({ en: "Open Vault", ro: "Deschide vault" }), onClick: openObsidian },
            { label: t({ en: "Show All Layers", ro: "Toate layerele" }), onClick: () => setLayer("all") },
          ]} />
      </div>
    );
  }

  const recommendation = labelMode === "all" && labelsHidden > 0
    ? "Overlaps culled — switch to Smart or zoom in."
    : labelsHidden > labels.length && labelsHidden > 10
      ? "Many labels hidden — try Important only, or zoom in."
      : "Label density looks healthy.";

  return (
    <div className="nm-view">
      <div className="nm-toolbar">
        <span className="nm-title"><IcBrain size={14} /> NEUROMAP</span>
        <span className="nm-stat">{nodes.length} notes · {edges.length} links · {shown.length} shown{graph?.mode === "live" ? " · live" : ""}</span>

        <div className="nm-segs" role="group" aria-label="View mode">
          {VIEW_MODES.map((m) => (
            <button key={m.id} className={`nm-seg${viewMode === m.id ? " on" : ""}${m.real ? "" : " pending"}`}
              onClick={() => setViewMode(m.id)} title={m.desc} aria-pressed={viewMode === m.id}>{m.label}</button>
          ))}
        </div>

        <div className="nm-segs" role="group" aria-label="Layer">
          {(["core", "projects", "agents-notes", "all"] as NeuroLayer[]).map((l) => (
            <button key={l} className={`nm-seg${layer === l ? " on" : ""}`} onClick={() => setLayer(l)} aria-pressed={layer === l}>{l}</button>
          ))}
        </div>

        <div className="nm-segs" role="group" aria-label="Time filter">
          {TIME_KEYS.map((tk) => (
            <button key={tk.id} className={`nm-seg${timeKey === tk.id ? " on" : ""}`} onClick={() => setTimeKey(tk.id)} aria-pressed={timeKey === tk.id}>{tk.label}</button>
          ))}
        </div>

        <div className="nm-segs" role="group" aria-label="Labels">
          {(["smart", "important", "all", "off"] as LabelMode[]).map((lm) => (
            <button key={lm} className={`nm-seg${labelMode === lm ? " on" : ""}`} onClick={() => setLabelMode(lm)} aria-pressed={labelMode === lm}
              title={`Labels: ${lm}`}>{lm === "important" ? "important" : lm}</button>
          ))}
        </div>

        <select className="nm-lens" value={lens} onChange={(e) => setLens(e.target.value as NeuroLens)} aria-label="Semantic lens">
          <option value="none">lens: none</option>
          <option value="research">lens: research</option>
          <option value="creative">lens: creative</option>
        </select>
        <input ref={searchRef} className="nm-search" placeholder="search notes/tags… (/)" value={q}
          onChange={(e) => setQ(e.target.value)} aria-label="Search notes and tags" />
        <button className={`nm-btn${focusMode ? " on" : ""}`} onClick={() => setFocusMode((f) => !f)}
          disabled={!sel} aria-label="Focus selected neighbourhood"
          title={sel ? "dim everything but the selected node's neighborhood" : "select a node first"}>◎ Focus</button>
        <button className={`nm-btn${showDiag ? " on" : ""}`} onClick={() => setShowDiag((d) => !d)} aria-label="Toggle diagnostics"
          aria-pressed={showDiag} title="Diagnostics — real graph counts"><IcChart size={12} /> Diag</button>
        <button className="nm-btn" onClick={resetView} aria-label="Reset view">reset</button>
      </div>

      <div className="nm-body">
        <svg className="nm-canvas" onWheel={onWheel} onMouseDown={onDown} onMouseMove={onMove} role="img" aria-label="Vault knowledge graph">
          <defs>
            <radialGradient id="nmSheen" cx="0.32" cy="0.28" r="0.85">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.55" />
              <stop offset="35%" stopColor="#fff" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.25" />
            </radialGradient>
          </defs>
          <g transform={`translate(${tx},${ty}) scale(${scale})`}>
            {shownEdges.map((e, i) => {
              const a = posOf(e.source), b = posOf(e.target);
              const hot = focusMode && hood && (e.source === sel || e.target === sel);
              const cold = focusMode && hood && !hot;
              return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={hot ? "rgba(212,175,55,0.45)" : "rgba(212,175,55,0.1)"}
                strokeWidth={hot ? 1.1 : 0.7} opacity={cold ? 0.12 : 1} />;
            })}
            {/* crystal-sphere nodes: radial highlight = subtle 3D volume; selected =
                double royal-gold ring, fresh = slow neural pulse (unless reduced-motion) */}
            {shown.map((n) => {
              const p = posOf(n.id);
              const r = radiusOf(n);
              const on = n.id === sel;
              const color = viewMode === "agents" && n.agent ? "#8d5cff" : FOLDER_COLOR(n.folder);
              return (
                <g key={n.id} transform={`translate(${p.x},${p.y})`} onClick={() => setSel(n.id)}
                  onMouseEnter={() => setHovered(n.id)} onMouseLeave={() => setHovered((h) => (h === n.id ? null : h))}
                  role="button" aria-label={n.title} style={{ cursor: "pointer" }} opacity={dimmed(n) ? 0.18 : 1}>
                  <title>{n.title}</title>
                  {on && <circle r={r + 6.5} fill="none" stroke="#d4af37" strokeWidth={1} opacity={0.55} />}
                  <circle r={r + (on ? 3 : 0)} fill={color} opacity={on ? 1 : 0.9}
                    stroke={on ? "#d4af37" : "rgba(0,0,0,0.45)"} strokeWidth={on ? 1.6 : 0.8}
                    style={{ filter: n.fresh ? `drop-shadow(0 0 7px ${color})` : on ? "drop-shadow(0 0 8px rgba(212,175,55,0.5))" : "none" }}>
                    {n.fresh && !reduceMotion && <animate attributeName="r" values={`${r};${r + 3};${r}`} dur="3s" repeatCount="indefinite" />}
                  </circle>
                  <circle r={r + (on ? 3 : 0)} fill="url(#nmSheen)" style={{ pointerEvents: "none" }} />
                </g>
              );
            })}
          </g>
          {/* SCREEN-SPACE label overlay — constant font-size, always legible */}
          <g className="nm-labels" aria-hidden>
            {labels.map((l) => (
              <text key={l.id} x={l.sx} y={l.sy} textAnchor="middle"
                className={`nm-label${l.id === sel ? " sel" : l.id === hovered ? " hov" : ""}`}>{l.text}</text>
            ))}
          </g>
        </svg>

        {viewMode === "team" && (
          <div className="nm-banner" role="status">
            <IcUsers size={13} /> {graph?.teamHint || "Team map not connected — local mode active"}
          </div>
        )}
        {taskEmpty && (
          <div className="nm-overlay">
            <EmptyState icon={<IcNodes size={30} />}
              title="No team tasks yet"
              hint="Task backend pending — team tasks will surface here once an 08_TASKS note or a task sync exists."
              actions={[{ label: "Open Vault", onClick: openObsidian, primary: true }]} />
          </div>
        )}

        <div className="nm-legend">
          <div className="nm-legend-head">LAYERS</div>
          {(graph?.layers ?? []).map((l) => (
            <div key={l.id} className="nm-leg-row"><span className="nm-leg-dot" style={{ background: LAYER_COLOR[l.id] }} /> {l.label} · {l.count}</div>
          ))}
          {graph?.teamHint && <div className="nm-team"><IcUsers size={11} /> {graph.teamHint}</div>}
        </div>

        {showDiag && (
          <div className="nm-diag" role="region" aria-label="Diagnostics">
            <div className="nm-diag-head"><IcChart size={12} /> DIAGNOSTICS</div>
            <div className="nm-diag-row"><span>nodes</span><b>{nodes.length}</b></div>
            <div className="nm-diag-row"><span>edges</span><b>{edges.length}</b></div>
            <div className="nm-diag-row"><span>visible nodes</span><b>{shown.length}</b></div>
            <div className="nm-diag-row"><span>edges drawn</span><b>{shownEdges.length}</b></div>
            <div className="nm-diag-row"><span>labels shown</span><b>{labels.length}</b></div>
            <div className="nm-diag-row"><span>labels hidden</span><b>{Math.max(0, labelsHidden)}</b></div>
            <div className="nm-diag-row"><span>fresh</span><b>{nodes.filter((n) => n.fresh).length}</b></div>
            <div className="nm-diag-row"><span>zoom</span><b>{scale.toFixed(2)}×</b></div>
            <div className="nm-diag-row"><span>drive-meta</span><b>{nodes.some((n) => n.folder === "Drive") ? "present" : "none"}</b></div>
            <div className="nm-diag-row"><span>team sync</span><b>{graph?.teamHint ? "local" : "n/a"}</b></div>
            <div className="nm-diag-row"><span>last scan</span><b>{graph?.scannedAt ? new Date(graph.scannedAt).toLocaleTimeString() : "—"}</b></div>
            {graph?.vault && <div className="nm-diag-vault">{graph.vault.replace(/^\/Users\/[^/]+/, "~")}</div>}
            <div className="nm-diag-rec">{recommendation}</div>
          </div>
        )}

        {detail && (
          <div className="nm-meta">
            <div className="nm-meta-head">
              <span className="nm-leg-dot" style={{ background: FOLDER_COLOR(detail.folder) }} />
              <b>{detail.title}</b>
              <button className="nm-meta-x" onClick={() => setSel(null)} aria-label="Close node detail"><IcX size={11} /></button>
            </div>
            <div className="nm-meta-type">{detail.folder}{detail.agent ? " · " + detail.agent : ""}</div>
            {/* quick actions — all real: Focus dims to this node's hood, Related jumps
                to the first linked note, Copy path yanks the vault id, Open raises Obsidian */}
            <div className="nm-meta-actions">
              <button className={`nm-act${focusMode ? " on" : ""}`} onClick={() => setFocusMode((f) => !f)}>Focus</button>
              <button className="nm-act" disabled={!detail.outlinks.length && !detail.backlinks.length}
                onClick={() => { const l = detail.outlinks[0] || detail.backlinks[0]; if (l) setSel(l.id); }}>Related</button>
              <button className="nm-act" title="copy the vault path" onClick={copyPath}><IcClip size={10} /> {copied ? "Copied" : "Path"}</button>
              <button className="nm-act" title="opens the vault in Obsidian" onClick={() => window.dai.tools.action("open-obsidian")}><IcExternal size={10} /> Open</button>
            </div>
            <div className="nm-meta-counts">
              <span><b>{detail.backlinks.length}</b> in</span>
              <span><b>{detail.outlinks.length}</b> out</span>
              <span><b>{Object.keys(detail.frontmatter).length}</b> meta</span>
            </div>
            {Object.entries(detail.frontmatter).slice(0, 6).map(([k, v]) => (
              <div className="nm-meta-row" key={k}><span>{k}</span><b>{String(v).slice(0, 40)}</b></div>
            ))}
            {detail.body && <div className="nm-meta-body">{detail.body.slice(0, 400)}</div>}
            {detail.backlinks.length > 0 && (
              <div className="nm-meta-links">
                <div className="nm-meta-links-h">← backlinks ({detail.backlinks.length})</div>
                {detail.backlinks.slice(0, 6).map((b) => (
                  <button key={b.id} className="nm-link" onClick={() => setSel(b.id)}>{b.title}</button>
                ))}
              </div>
            )}
            {detail.outlinks.length > 0 && (
              <div className="nm-meta-links">
                <div className="nm-meta-links-h">→ links ({detail.outlinks.length})</div>
                {detail.outlinks.slice(0, 6).map((b) => (
                  <button key={b.id} className="nm-link" onClick={() => setSel(b.id)}>{b.title}</button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="nm-foot">
        Live from the Obsidian vault{graph?.vault ? " · " + graph.vault.replace(/^\/Users\/[^/]+/, "~") : ""} · {VIEW_MODES.find((m) => m.id === viewMode)?.desc}
      </div>
    </div>
  );
}
