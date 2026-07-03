// Neuromap — the LIVING knowledge graph of the Obsidian vault (Antigravity-Brain).
// Real nodes + [[wikilink]] edges from local notes, force-ish layout, layer/mode/
// lens controls, click a node for its frontmatter + body + backlinks, and a live
// fs.watch pulse when notes change (the network "growing" in real time).
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchNeuroGraph, fetchNeuroNode } from "../api";
import type { NeuroLayer, NeuroMode, NeuroLens, NeuroNode, NeuroNodeDetail } from "../api";

const LAYER_COLOR: Record<NeuroLayer, string> = {
  core: "#22d3ee", projects: "#d4af37", "agents-notes": "#ec4899", all: "#a78bfa",
};
const FOLDER_COLOR = (folder: string): string => {
  const f = folder.toLowerCase();
  if (f.includes("research")) return "#2dd4bf";
  if (f.includes("memory")) return "#22d3ee";
  if (f.includes("project")) return "#d4af37";
  if (f.includes("agent") || f.includes("claude")) return "#ec4899";
  if (f.includes("decision")) return "#f97316";
  if (f.includes("map")) return "#a78bfa";
  if (f.includes("meta")) return "#60a5fa";
  return "#9aa0b0";
};

type Pos = { x: number; y: number };

export function NeuromapView() {
  const [layer, setLayer] = useState<NeuroLayer>("core");
  const [mode, setMode] = useState<NeuroMode>("live");
  const [lens, setLens] = useState<NeuroLens>("none");
  const [sel, setSel] = useState<string | null>(null);
  const [detail, setDetail] = useState<NeuroNodeDetail | null>(null);
  const [q, setQ] = useState("");
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [scale, setScale] = useState(1);
  const [pulse, setPulse] = useState(0);
  const drag = useRef<{ x: number; y: number } | null>(null);

  const opts = useMemo(() => ({ layers: [layer], mode, lens }), [layer, mode, lens]);
  const { data: graph } = useQuery({
    queryKey: ["neuro", layer, mode, lens, pulse],
    queryFn: () => fetchNeuroGraph(opts),
    refetchInterval: 8000,
  });

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
  const visible = (n: NeuroNode) => !q || n.title.toLowerCase().includes(q.toLowerCase()) || n.tags.some((t) => t.toLowerCase().includes(q.toLowerCase()));

  const onWheel = (e: React.WheelEvent) => { e.preventDefault(); setScale((s) => Math.min(3, Math.max(0.3, s - e.deltaY * 0.001))); };
  const onDown = (e: React.MouseEvent) => { drag.current = { x: e.clientX - tx, y: e.clientY - ty }; };
  const onMove = (e: React.MouseEvent) => { if (drag.current) { setTx(e.clientX - drag.current.x); setTy(e.clientY - drag.current.y); } };
  useEffect(() => { const up = () => (drag.current = null); window.addEventListener("mouseup", up); return () => window.removeEventListener("mouseup", up); }, []);

  const posOf = (id: string) => positions.get(id) || { x: 600, y: 380 };

  return (
    <div className="nm-view">
      <div className="nm-toolbar">
        <span className="nm-title">🧠 NEUROMAP</span>
        <span className="nm-stat">{nodes.length} notes · {edges.length} links {graph?.mode === "live" ? "· live" : ""}</span>
        <div className="nm-segs">
          {(["core", "projects", "agents-notes", "all"] as NeuroLayer[]).map((l) => (
            <button key={l} className={`nm-seg${layer === l ? " on" : ""}`} onClick={() => setLayer(l)}>{l}</button>
          ))}
        </div>
        <div className="nm-segs">
          {(["live", "agents", "shared"] as NeuroMode[]).map((m) => (
            <button key={m} className={`nm-seg${mode === m ? " on" : ""}`} onClick={() => setMode(m)}>{m}</button>
          ))}
        </div>
        <select className="nm-lens" value={lens} onChange={(e) => setLens(e.target.value as NeuroLens)}>
          <option value="none">lens: none</option>
          <option value="research">lens: research</option>
          <option value="creative">lens: creative</option>
        </select>
        <input className="nm-search" placeholder="search notes/tags…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="nm-btn" onClick={() => { setTx(0); setTy(0); setScale(1); }}>reset</button>
      </div>

      <div className="nm-body">
        <svg className="nm-canvas" onWheel={onWheel} onMouseDown={onDown} onMouseMove={onMove}>
          <g transform={`translate(${tx},${ty}) scale(${scale})`}>
            {edges.map((e, i) => {
              const a = posOf(e.source), b = posOf(e.target);
              return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(212,175,55,0.1)" strokeWidth={0.7} />;
            })}
            {nodes.filter(visible).map((n) => {
              const p = posOf(n.id);
              const r = 4 + Math.min(10, n.deg * 1.2);
              const on = n.id === sel;
              const color = mode === "agents" && n.agent ? "#ec4899" : FOLDER_COLOR(n.folder);
              return (
                <g key={n.id} transform={`translate(${p.x},${p.y})`} onClick={() => setSel(n.id)} style={{ cursor: "pointer" }}>
                  <circle r={r + (on ? 4 : 0)} fill={color} opacity={on ? 1 : 0.88}
                    stroke={on ? "#fff" : "rgba(0,0,0,0.4)"} strokeWidth={on ? 2 : 0.8}
                    style={{ filter: n.fresh ? `drop-shadow(0 0 7px ${color})` : "none" }}>
                    {n.fresh && <animate attributeName="r" values={`${r};${r + 3};${r}`} dur="1.6s" repeatCount="indefinite" />}
                  </circle>
                  {(r > 7 || on) && <text y={r + 11} textAnchor="middle" fontSize={9} fill="#c9c2c8" style={{ pointerEvents: "none" }}>{n.title.slice(0, 20)}</text>}
                </g>
              );
            })}
          </g>
        </svg>

        <div className="nm-legend">
          <div className="nm-legend-head">LAYERS</div>
          {(graph?.layers ?? []).map((l) => (
            <div key={l.id} className="nm-leg-row"><span className="nm-leg-dot" style={{ background: LAYER_COLOR[l.id] }} /> {l.label} · {l.count}</div>
          ))}
          {graph?.teamHint && <div className="nm-team">👥 {graph.teamHint}</div>}
        </div>

        {detail && (
          <div className="nm-meta">
            <div className="nm-meta-head">
              <span className="nm-leg-dot" style={{ background: FOLDER_COLOR(detail.folder) }} />
              <b>{detail.title}</b>
              <button className="nm-meta-x" onClick={() => setSel(null)}>✕</button>
            </div>
            <div className="nm-meta-type">{detail.folder}{detail.agent ? " · " + detail.agent : ""}</div>
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
        Live from the Obsidian vault{graph?.vault ? " · " + graph.vault.replace(/^\/Users\/[^/]+/, "~") : ""} · notes + backlinks, growth pulses on change.
        <span className="nm-needs"> Google folders — configure in Ecosystem.</span>
      </div>
    </div>
  );
}
