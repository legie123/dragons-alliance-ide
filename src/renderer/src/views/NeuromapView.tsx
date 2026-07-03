// Neuromap — a living graph of the Dragons Alliance ecosystem built from REAL
// local data we already have (projects, terminals, agents/sessions, repos).
// Interactive: zoom, pan, click a node for its metadata. External sources
// (Google folders, Obsidian Team notes) are marked "needs config" until wired.
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchProjects, fetchSessions, fetchTools, human } from "../api";

type NType =
  | "project" | "person" | "document" | "folder" | "task" | "metadata"
  | "agent" | "worker" | "terminal" | "repository" | "google" | "obsidian"
  | "creative" | "research";

const COLORS: Record<NType, string> = {
  project: "#d4af37", person: "#4ade80", document: "#60a5fa", folder: "#a78bfa",
  task: "#f97316", metadata: "#22d3ee", agent: "#ec4899", worker: "#ef4444",
  terminal: "#9aa0b0", repository: "#f0f0f0", google: "#fbbf24", obsidian: "#a855f7",
  creative: "#e879f9", research: "#2dd4bf",
};
const LABELS: Record<NType, string> = {
  project: "Project", person: "Person", document: "Document", folder: "Folder",
  task: "Task", metadata: "Metadata", agent: "Agent", worker: "Worker",
  terminal: "Terminal", repository: "Repository", google: "Google Folder",
  obsidian: "Obsidian Note", creative: "Creative Asset", research: "Research Item",
};

type Node = {
  id: string; type: NType; name: string; source: string; path?: string;
  status?: string; meta: Record<string, any>; x: number; y: number;
};
type Edge = { a: string; b: string };

// deterministic hash → angle, so layout is stable across polls
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function NeuromapView() {
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: fetchProjects, refetchInterval: 5000 });
  const { data: sessData } = useQuery({ queryKey: ["sessions", 240], queryFn: () => fetchSessions(240), refetchInterval: 5000 });
  const { data: tools = [] } = useQuery({ queryKey: ["tools"], queryFn: fetchTools, refetchInterval: 8000 });
  const sessions = sessData?.sessions ?? [];

  const [sel, setSel] = useState<string | null>(null);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [scale, setScale] = useState(1);
  const [filter, setFilter] = useState<Set<NType>>(new Set());
  const [q, setQ] = useState("");
  const drag = useRef<{ x: number; y: number } | null>(null);

  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const W = 1200, H = 760, cx = W / 2, cy = H / 2;

    // ecosystem hub in the middle
    nodes.push({ id: "hub", type: "metadata", name: "Dragons Alliance", source: "IDE", meta: { role: "ecosystem hub" }, x: cx, y: cy });

    // projects on a ring around the hub
    const projs = projects.slice(0, 24);
    projs.forEach((p, i) => {
      const ang = (i / Math.max(1, projs.length)) * Math.PI * 2;
      const px = cx + Math.cos(ang) * 300, py = cy + Math.sin(ang) * 230;
      const pid = "p:" + p.path;
      nodes.push({
        id: pid, type: "project", name: p.name, source: "workspace", path: p.path,
        status: p.session ? "active" : "idle",
        meta: { type: p.type, branch: p.branch || "—", dirty: p.dirty, terminals: p.terminals.length, score: p.session?.score?.toFixed(0) ?? "—" },
        x: px, y: py,
      });
      edges.push({ a: "hub", b: pid });
      // repository satellite (if git remote)
      if ((p as any).remote) {
        const rid = "r:" + p.path;
        nodes.push({ id: rid, type: "repository", name: p.name, source: "git", path: (p as any).remote, meta: { remote: (p as any).remote, branch: p.branch }, x: px + Math.cos(ang) * 70, y: py + Math.sin(ang) * 70 });
        edges.push({ a: pid, b: rid });
      }
    });

    // agents (claude sessions) hung off their project
    sessions.slice(0, 40).forEach((s) => {
      const owner = projs.find((p) => s.cwd_full && (s.cwd_full === p.path || s.cwd_full.startsWith(p.path + "/")));
      const base = owner ? nodes.find((n) => n.id === "p:" + owner.path) : nodes.find((n) => n.id === "hub");
      if (!base) return;
      const a = (hash(s.id) % 360) * Math.PI / 180;
      const aid = "a:" + s.id;
      nodes.push({
        id: aid, type: "agent", name: s.title.slice(0, 28) || s.model, source: "claude session",
        status: s.idle_min < 3 ? "live" : "idle",
        meta: { model: s.model, tokens: human(s.ctx), score: s.score.toFixed(0), grounding: s.understanding.toFixed(0) + "%", goal: (s as any).goalPct?.toFixed?.(0) + "%" },
        x: base.x + Math.cos(a) * 95, y: base.y + Math.sin(a) * 80,
      });
      edges.push({ a: base.id, b: aid });
    });

    // ecosystem tools as satellites of the hub
    tools.forEach((t, i) => {
      const ang = (i / Math.max(1, tools.length)) * Math.PI * 2 + 0.4;
      const tid = "t:" + t.id;
      const type: NType = t.id === "obsidian" ? "obsidian" : t.id === "graphify" ? "metadata" : "person";
      nodes.push({ id: tid, type, name: t.name, source: "ecosystem", status: t.status, meta: { status: t.status, detail: t.detail }, x: cx + Math.cos(ang) * 150, y: cy + Math.sin(ang) * 120 });
      edges.push({ a: "hub", b: tid });
    });

    return { nodes, edges };
  }, [projects, sessions, tools]);

  const visible = (n: Node) => (filter.size === 0 || filter.has(n.type)) && (!q || n.name.toLowerCase().includes(q.toLowerCase()));
  const selNode = nodes.find((n) => n.id === sel) || null;
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  // pan + zoom
  const onWheel = (e: React.WheelEvent) => { e.preventDefault(); setScale((s) => Math.min(3, Math.max(0.3, s - e.deltaY * 0.001))); };
  const onDown = (e: React.MouseEvent) => { drag.current = { x: e.clientX - tx, y: e.clientY - ty }; };
  const onMove = (e: React.MouseEvent) => { if (drag.current) { setTx(e.clientX - drag.current.x); setTy(e.clientY - drag.current.y); } };
  const onUp = () => { drag.current = null; };
  useEffect(() => { const up = () => (drag.current = null); window.addEventListener("mouseup", up); return () => window.removeEventListener("mouseup", up); }, []);

  const usedTypes = useMemo(() => Array.from(new Set(nodes.map((n) => n.type))), [nodes]);

  return (
    <div className="nm-view">
      <div className="nm-toolbar">
        <span className="nm-title">🧠 NEUROMAP</span>
        <span className="nm-stat">{nodes.length} nodes · {edges.length} links · live</span>
        <input className="nm-search" placeholder="search nodes…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="nm-btn" onClick={() => { setTx(0); setTy(0); setScale(1); }}>reset view</button>
        <span className="nm-hint">drag to pan · scroll to zoom · click a node</span>
      </div>

      <div className="nm-body">
        <svg className="nm-canvas" onWheel={onWheel} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp}>
          <g transform={`translate(${tx},${ty}) scale(${scale})`}>
            {edges.map((e, i) => {
              const a = nodeById.get(e.a), b = nodeById.get(e.b);
              if (!a || !b || !visible(a) || !visible(b)) return null;
              return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(212,175,55,0.14)" strokeWidth={1} />;
            })}
            {nodes.filter(visible).map((n) => {
              const r = n.id === "hub" ? 16 : n.type === "project" ? 11 : 7;
              const on = n.id === sel;
              return (
                <g key={n.id} transform={`translate(${n.x},${n.y})`} onClick={() => setSel(n.id)} style={{ cursor: "pointer" }}>
                  <circle r={r + (on ? 4 : 0)} fill={COLORS[n.type]} opacity={on ? 1 : 0.9}
                    stroke={on ? "#fff" : "rgba(0,0,0,0.4)"} strokeWidth={on ? 2 : 1}
                    style={{ filter: n.status === "live" || n.status === "active" ? `drop-shadow(0 0 6px ${COLORS[n.type]})` : "none" }} />
                  <text y={r + 12} textAnchor="middle" fontSize={10} fill="#c9c2c8" style={{ pointerEvents: "none" }}>{n.name.slice(0, 18)}</text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* legend */}
        <div className="nm-legend">
          <div className="nm-legend-head">LEGEND · click to filter</div>
          {usedTypes.map((t) => (
            <button key={t} className={`nm-leg-row${filter.has(t) ? " on" : ""}`}
              onClick={() => setFilter((f) => { const n = new Set(f); n.has(t) ? n.delete(t) : n.add(t); return n; })}>
              <span className="nm-leg-dot" style={{ background: COLORS[t] }} /> {LABELS[t]}
            </button>
          ))}
          {filter.size > 0 && <button className="nm-leg-clear" onClick={() => setFilter(new Set())}>clear filter</button>}
        </div>

        {/* metadata panel */}
        {selNode && (
          <div className="nm-meta">
            <div className="nm-meta-head">
              <span className="nm-leg-dot" style={{ background: COLORS[selNode.type] }} />
              <b>{selNode.name}</b>
              <button className="nm-meta-x" onClick={() => setSel(null)}>✕</button>
            </div>
            <div className="nm-meta-type">{LABELS[selNode.type]} · {selNode.source}</div>
            {selNode.path && <div className="nm-meta-row"><span>path</span><code>{selNode.path.replace(/^\/Users\/[^/]+/, "~")}</code></div>}
            {selNode.status && <div className="nm-meta-row"><span>status</span><b>{selNode.status}</b></div>}
            {Object.entries(selNode.meta).map(([k, v]) => (
              <div className="nm-meta-row" key={k}><span>{k}</span><b>{String(v)}</b></div>
            ))}
          </div>
        )}
      </div>

      <div className="nm-foot">
        Real-time from local IDE data (projects · terminals · agents · repos · ecosystem).
        <span className="nm-needs"> Google folders & Obsidian Team notes — needs config.</span>
      </div>
    </div>
  );
}
