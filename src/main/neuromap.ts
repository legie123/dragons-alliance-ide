// NeuroMap backend — turns the local Obsidian vault (Antigravity-Brain) into a
// live knowledge graph: NeuroNode[] + NeuroEdge[] from [[wikilinks]]. Pure local
// file reads (no API, no network, 98_RAW/secrets excluded), capped + cached, with
// an fs.watch that pushes NEUROMAP_CHANGED when notes change (the "growing network").
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execFile } from "node:child_process";
import type {
  NeuroGraph, NeuroNode, NeuroEdge, NeuroGraphOpts, NeuroLayer, NeuroNodeDetail,
} from "../shared/ipc.js";

const HOME = os.homedir();
const VAULT = path.join(HOME, "Documents", "Obsidian", "Antigravity-Brain");
const SKIP = /(^|\/)(98_RAW|\.obsidian|\.git|_tools|node_modules)(\/|$)/;
const MAX_NOTES = 320;
const FRESH_MS = 5 * 60_000;

// top-level folder → layer
const LAYER_OF: Record<string, NeuroLayer> = {
  _meta: "core", "09_MEMORY": "core", "13_ARCHITECTURE": "core", "06_DECISIONS": "core",
  "07_RESEARCH": "core", "10_MAPS": "core",   // clean knowledge layer — research + MOC hubs ARE core
  "01_PROJECTS": "projects",
  "02_AGENTS": "agents-notes", "03_CLAUDE": "agents-notes",
};
function layerOf(folder: string): NeuroLayer {
  return LAYER_OF[folder] ?? "all";
}
// layer → the top-level folders to scan (so a small budget isn't eaten by
// unrelated folders before reaching the ones this layer needs)
const FOLDERS_FOR: Record<NeuroLayer, string[]> = {
  core: ["_meta", "07_RESEARCH", "09_MEMORY", "13_ARCHITECTURE", "06_DECISIONS", "10_MAPS"],
  projects: ["01_PROJECTS"],
  "agents-notes": ["02_AGENTS", "03_CLAUDE"],
  all: ["_meta", "01_PROJECTS", "07_RESEARCH", "09_MEMORY", "13_ARCHITECTURE", "06_DECISIONS", "10_MAPS", "02_AGENTS", "08_TASKS"],
};

let _cache: { ts: number; opts: string; graph: NeuroGraph } | null = null;

function walk(dir: string, out: string[], budget: { n: number }) {
  if (budget.n <= 0) return;
  let ents: fs.Dirent[];
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    if (budget.n <= 0) return;
    const full = path.join(dir, e.name);
    if (SKIP.test(full)) continue;
    if (e.isDirectory()) walk(full, out, budget);
    else if (e.name.endsWith(".md")) { out.push(full); budget.n -= 1; }
  }
}

type Parsed = { title: string; type: string | null; tags: string[]; links: string[]; frontmatter: Record<string, unknown>; body: string };
function parseNote(file: string, full = false): Parsed {
  let raw = "";
  try { raw = fs.readFileSync(file, "utf8").slice(0, full ? 60000 : 16000); } catch { /* skip */ }
  let type: string | null = null;
  let title = path.basename(file, ".md");
  const tags: string[] = [];
  const frontmatter: Record<string, unknown> = {};
  const fm = raw.match(/^---\n([\s\S]*?)\n---/);
  let body = raw;
  if (fm) {
    body = raw.slice(fm[0].length);
    for (const line of fm[1].split("\n")) {
      const m = line.match(/^([\w-]+):\s*(.*)$/);
      if (!m) continue;
      const [, k, v] = m;
      frontmatter[k] = v.trim();
      if (k === "type") type = v.trim();
      if (k === "title") title = v.trim().replace(/^["']|["']$/g, "") || title;
      if (k === "tags") {
        const arr = v.match(/\[([^\]]*)\]/);
        if (arr) tags.push(...arr[1].split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean));
      }
    }
  }
  const links: string[] = [];
  for (const m of raw.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)) {
    const target = m[1].split("/").pop()!.trim();
    if (target) links.push(target);
  }
  return { title, type, tags, links, frontmatter, body: body.trim().slice(0, full ? 6000 : 0) };
}

/** Build the NeuroMap graph for the requested layers/mode/lens (cached ~20s). */
export function buildGraph(opts: NeuroGraphOpts): NeuroGraph {
  const key = JSON.stringify(opts);
  if (_cache && _cache.opts === key && Date.now() - _cache.ts < 20000) return _cache.graph;

  const scannedAt = Date.now();
  if (!fs.existsSync(VAULT)) {
    const empty: NeuroGraph = { nodes: [], edges: [], layers: [], scannedAt, vault: VAULT, mode: opts.mode };
    _cache = { ts: scannedAt, opts: key, graph: empty };
    return empty;
  }

  // scan only the folders the requested layers need (budget-fair)
  const wantAll = opts.layers.includes("all");
  const scanFolders = new Set<string>();
  for (const l of opts.layers) for (const f of FOLDERS_FOR[l] || []) scanFolders.add(f);
  const files: string[] = [];
  const budget = { n: MAX_NOTES };
  for (const f of scanFolders) walk(path.join(VAULT, f), files, budget);

  const byBase = new Map<string, string>();
  const raw: { node: NeuroNode; links: string[] }[] = [];

  for (const file of files) {
    const rel = path.relative(VAULT, file);
    const folder = rel.split(path.sep)[0] || "root";
    const layer = layerOf(folder);
    if (!wantAll && !opts.layers.includes(layer)) continue;

    const p = parseNote(file);
    // lens filter: research → 07_RESEARCH or research tag; creative → creative tag/folder
    if (opts.lens === "research" && !(folder === "07_RESEARCH" || p.tags.some((t) => /research/i.test(t)))) continue;
    if (opts.lens === "creative" && !p.tags.some((t) => /(creative|design|art|asset)/i.test(t))) continue;

    let mtime = 0;
    try { mtime = fs.statSync(file).mtimeMs; } catch { /* skip */ }
    const id = rel;
    byBase.set(path.basename(file, ".md"), id);
    raw.push({
      node: {
        id, title: p.title, folder, layer, type: p.type, tags: p.tags,
        deg: 0, mtime, fresh: scannedAt - mtime < FRESH_MS,
        agent: opts.mode === "agents" ? guessAgent(folder, p.tags) : null,
      },
      links: p.links,
    });
  }

  const nodeIds = new Set(raw.map((r) => r.node.id));
  const edges: NeuroEdge[] = [];
  const degOf = new Map<string, number>();
  for (const r of raw) {
    for (const l of r.links) {
      const target = byBase.get(l);
      if (target && nodeIds.has(target) && target !== r.node.id) {
        edges.push({ source: r.node.id, target });
        degOf.set(r.node.id, (degOf.get(r.node.id) || 0) + 1);
        degOf.set(target, (degOf.get(target) || 0) + 1);
      }
    }
  }
  const nodes = raw.map((r) => ({ ...r.node, deg: degOf.get(r.node.id) || 0 }));

  // layer summary
  const layerCount = new Map<NeuroLayer, number>();
  for (const n of nodes) layerCount.set(n.layer, (layerCount.get(n.layer) || 0) + 1);
  const LABELS: Record<NeuroLayer, string> = { core: "Core", projects: "Projects", "agents-notes": "Agent notes", all: "Other" };
  const layers = (["core", "projects", "agents-notes", "all"] as NeuroLayer[])
    .filter((l) => layerCount.has(l))
    .map((l) => ({ id: l, label: LABELS[l], count: layerCount.get(l) || 0 }));

  const graph: NeuroGraph = {
    nodes, edges: edges.slice(0, 600), layers, scannedAt, vault: VAULT, mode: opts.mode,
    teamHint: opts.mode === "shared" ? teamHint() : undefined,
  };
  _cache = { ts: scannedAt, opts: key, graph };
  return graph;
}

// heuristic author attribution for team mode (folder/tag based — honest guess)
function guessAgent(folder: string, tags: string[]): string | null {
  if (folder === "03_CLAUDE") return "Claude";
  if (tags.some((t) => /gemini/i.test(t))) return "Gemini";
  if (tags.some((t) => /hermes/i.test(t))) return "Hermes";
  return null;
}
let _teamHint = "";
function teamHint(): string {
  if (_teamHint) return _teamHint;
  try {
    execFile("git", ["-C", VAULT, "remote", "get-url", "origin"], { timeout: 1000 }, (err, out) => {
      _teamHint = err || !out.trim() ? "vault not shared (no git remote) — team mode is local-only" : "shared via git remote";
    });
  } catch { _teamHint = "team status unknown"; }
  return _teamHint || "checking team status…";
}

/** Full detail for one node (frontmatter + body preview + back/out links). */
export function nodeDetail(id: string): NeuroNodeDetail | null {
  const file = path.join(VAULT, id);
  if (SKIP.test(file) || !file.startsWith(VAULT) || !fs.existsSync(file)) return null;
  const p = parseNote(file, true);
  let mtime = 0;
  try { mtime = fs.statSync(file).mtimeMs; } catch { /* */ }

  // resolve out/back links against the cached graph (best-effort)
  const g = _cache?.graph;
  const titleOf = (nid: string) => g?.nodes.find((n) => n.id === nid)?.title || path.basename(nid, ".md");
  const base = path.basename(id, ".md");
  const outlinks = (g?.edges || []).filter((e) => e.source === id).map((e) => ({ id: e.target, title: titleOf(e.target) }));
  const backlinks = (g?.edges || []).filter((e) => e.target === id).map((e) => ({ id: e.source, title: titleOf(e.source) }));

  return {
    id, title: p.title, folder: id.split(path.sep)[0] || "root", mtime,
    frontmatter: p.frontmatter, body: p.body,
    outlinks, backlinks,
    agent: guessAgent(id.split(path.sep)[0] || "", p.tags),
  };
}

// ---- fs.watch: emit changed relative paths so the renderer can pulse growth ----
let _watcher: fs.FSWatcher | null = null;
export function armWatch(layers: import("../shared/ipc.js").NeuroLayer[], onChanged: (changed: string[]) => void): void {
  if (_watcher || !fs.existsSync(VAULT)) return;
  let pending = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    _watcher = fs.watch(VAULT, { recursive: true }, (_ev, fname) => {
      if (!fname || !fname.endsWith(".md") || SKIP.test(fname)) return;
      pending.add(fname);
      _cache = null; // invalidate so next graph re-reads
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { onChanged(Array.from(pending)); pending = new Set(); }, 800);
    });
  } catch { /* recursive watch unsupported — silently skip */ }
}
