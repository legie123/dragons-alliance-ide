// AGENT TOOLS — the capability layer that makes the Sector Agent an AGENT, not a
// chatbot. Every tool executes a REAL window.dai.* call and returns real data;
// the local tool-calling model (hermes2-tools) picks tools, we run them, feed
// results back, it answers with the truth. PLUS permanent grounding in the
// Obsidian vault + Graphify knowledge graph: groundingContext() is injected on
// EVERY turn, and search_vault / graph_links let the model dig deeper.
import type { AgentSector } from "./components/SectorAgent";
import { fetchSessions } from "./api";

type ToolDef = {
  name: string;
  description: string;
  parameters: { type: "object"; properties: Record<string, unknown>; required?: string[] };
};
type ToolSpec = ToolDef & { run: (a: Record<string, unknown>) => Promise<unknown> };

const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);
const HOME_HINT = "~/Documents/Obsidian/Antigravity-Brain";

// ---- Obsidian vault + Graphify graph (the mandated permanent knowledge source) ----

/** Rank vault nodes against a query by keyword overlap in title/folder/tags/type. */
async function vaultMatches(query: string, limit = 4) {
  const g = await window.dai.neuromap.graph({ layers: ["all"], mode: "shared", lens: "none" });
  const terms = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const scored = g.nodes.map((n) => {
    const hay = `${n.title} ${n.folder} ${n.type ?? ""} ${(n.tags ?? []).join(" ")}`.toLowerCase();
    const score = terms.reduce((s, w) => s + (hay.includes(w) ? 1 : 0), 0);
    return { n, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
  return { graph: g, hits: scored.map((x) => x.n) };
}

/** Compact grounding block injected into EVERY turn — real vault + graph context. */
export async function groundingContext(query: string): Promise<string> {
  try {
    const { graph, hits } = await vaultMatches(query, 3);
    const head = `Antigravity-Brain vault: ${graph.nodes.length} notes, ${graph.edges.length} links (Graphify graph, scanned ${new Date(graph.scannedAt).toLocaleTimeString()}).`;
    if (!hits.length) return `${head} No note directly matches the question — say so honestly, or use search_vault with different terms.`;
    const parts: string[] = [];
    for (const n of hits) {
      try {
        const d = await window.dai.neuromap.node(n.id);
        const body = (d.body || "").replace(/\s+/g, " ").slice(0, 260);
        const links = [...d.outlinks, ...d.backlinks].slice(0, 4).map((l) => l.title).join(", ");
        parts.push(`• [${n.title}] (${n.folder}) — ${body}${links ? ` · linked: ${links}` : ""}`);
      } catch { parts.push(`• [${n.title}] (${n.folder})`); }
    }
    return `${head}\nRelevant notes from the user's real Obsidian vault (ground your answer in these):\n${parts.join("\n")}`;
  } catch (e) {
    return `Obsidian/Graphify grounding unavailable (${String(e).slice(0, 80)}). Answer from what you know and say the vault couldn't be read.`;
  }
}

// ---- tool registry ----

const GLOBAL: ToolSpec[] = [
  {
    name: "search_vault",
    description: "Search the user's Obsidian vault (Antigravity-Brain) for notes matching a query. Returns real note titles, folders and body excerpts. Use this whenever the question could relate to the user's own knowledge, projects, research or memory.",
    parameters: { type: "object", properties: { query: { type: "string", description: "keywords to search notes for" } }, required: ["query"] },
    run: async (a) => {
      const { hits } = await vaultMatches(str(a.query), 5);
      if (!hits.length) return { found: 0, note: `no vault note matches "${str(a.query)}"` };
      const out = [];
      for (const n of hits) {
        try { const d = await window.dai.neuromap.node(n.id); out.push({ title: n.title, folder: n.folder, excerpt: (d.body || "").replace(/\s+/g, " ").slice(0, 320), outlinks: d.outlinks.slice(0, 5).map((l) => l.title) }); }
        catch { out.push({ title: n.title, folder: n.folder }); }
      }
      return { found: out.length, notes: out };
    },
  },
  {
    name: "graph_links",
    description: "Given a topic, find the matching note in the Graphify knowledge graph and return its relationships (which notes link to/from it). Use to explain how the user's knowledge connects.",
    parameters: { type: "object", properties: { topic: { type: "string" } }, required: ["topic"] },
    run: async (a) => {
      const { hits } = await vaultMatches(str(a.topic), 1);
      if (!hits.length) return { note: `no node matches "${str(a.topic)}"` };
      const d = await window.dai.neuromap.node(hits[0].id);
      return { node: d.title, folder: d.folder, links_to: d.outlinks.map((l) => l.title), linked_from: d.backlinks.map((l) => l.title) };
    },
  },
  {
    name: "get_system_status",
    description: "Get the platform's real live status: active Claude agents, model providers, superpower engines.",
    parameters: { type: "object", properties: {} },
    run: async () => {
      const [s, hub] = await Promise.all([fetchSessions(240), window.dai.llm.status()]);
      return { live_agents: s.live, total_sessions: s.sessions.length, llm_active: hub.active, providers: hub.providers.filter((p) => p.state === "active").map((p) => p.label) };
    },
  },
  {
    name: "navigate",
    description: "Switch the IDE to a sector deck.",
    parameters: { type: "object", properties: { sector: { type: "string", description: "ide|agents|code|neuromap|drive|metrics|preview|creative" } }, required: ["sector"] },
    run: async (a) => { const v = str(a.sector); window.dispatchEvent(new CustomEvent("dai:goto", { detail: v })); return { navigated_to: v }; },
  },
];

const SECTOR: Partial<Record<AgentSector, ToolSpec[]>> = {
  ide: [
    { name: "list_terminals", description: "List the currently open terminals (id, command, cwd, alive).", parameters: { type: "object", properties: {} },
      run: async () => ({ terminals: (await window.dai.term.list()).map((t) => ({ id: t.id, cmd: t.cmd, cwd: t.cwd, alive: t.alive })) }) },
    { name: "run_command", description: "Run a shell command in a NEW visible terminal worker (the user sees it). Returns the terminal id.", parameters: { type: "object", properties: { command: { type: "string" } }, required: ["command"] },
      run: async (a) => { const cmd = str(a.command); if (!cmd) return { error: "no command" }; const id = `ag${Date.now().toString(36)}`; window.dai.term.create({ id, cmd: "shell", cwd: "~" }); setTimeout(() => window.dai.term.write(id, cmd + "\n"), 1000); window.dai.audit.log("agent-run", cmd); window.dispatchEvent(new CustomEvent("dai:goto", { detail: "ide" })); return { started: true, terminal: id, command: cmd, note: "running visibly in the Terminal deck" }; } },
  ],
  agents: [
    { name: "list_agents", description: "List Claude agent sessions with live status, model and score.", parameters: { type: "object", properties: {} },
      run: async () => { const s = await fetchSessions(240); return { live: s.live, total: s.sessions.length, agents: s.sessions.slice(0, 8).map((x) => ({ title: x.title, model: x.model, score: Math.round(x.score), idle_min: Math.round(x.idle_min) })) }; } },
    { name: "launch_agent", description: "Launch a new Claude agent in a directory (defaults to home).", parameters: { type: "object", properties: { cwd: { type: "string" } } },
      run: async (a) => { const id = `ag${Date.now().toString(36)}`; window.dai.term.create({ id, cmd: "claude", cwd: str(a.cwd, "~") }); window.dai.audit.log("agent-launch", str(a.cwd, "~")); window.dispatchEvent(new CustomEvent("dai:goto", { detail: "ide" })); return { launched: true, terminal: id }; } },
  ],
  code: [
    { name: "list_files", description: "List files/folders in a directory (defaults to home).", parameters: { type: "object", properties: { dir: { type: "string" } } },
      run: async (a) => { try { const l = await window.dai.fs.list(str(a.dir, "")); return { path: l.path, entries: l.entries.slice(0, 40).map((e) => `${e.type === "dir" ? "📁" : ""}${e.name}`) }; } catch (e) { return { error: String(e).slice(0, 120) }; } } },
    { name: "read_file", description: "Read a text file (HOME-confined, secrets denied). Returns the first part.", parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
      run: async (a) => { try { const c = await window.dai.fs.read(str(a.path)); return { path: str(a.path), content: c.slice(0, 2500), truncated: c.length > 2500 }; } catch (e) { return { error: String(e).slice(0, 120) }; } } },
  ],
  neuromap: [
    { name: "graph_stats", description: "Real counts of the Obsidian/Graphify knowledge graph.", parameters: { type: "object", properties: {} },
      run: async () => { const g = await window.dai.neuromap.graph({ layers: ["all"], mode: "shared", lens: "none" }); return { notes: g.nodes.length, links: g.edges.length, folders: g.layers.map((l) => `${l.label}:${l.count}`), vault: g.vault }; } },
  ],
  drive: [
    { name: "google_status", description: "Google APIs real status (configured / signed in / email).", parameters: { type: "object", properties: {} },
      run: async () => { const s = await window.dai.gdrive.status(); return { configured: s.configured, signedIn: s.signedIn, email: s.email ?? null }; } },
  ],
  metrics: [
    { name: "get_metrics", description: "Real session metrics summary: counts, live, avg score, total context/output tokens.", parameters: { type: "object", properties: {} },
      run: async () => { const s = await fetchSessions(240); const n = s.sessions.length || 1; return { sessions: s.sessions.length, live: s.live, avg_score: Math.round(s.sessions.reduce((x, y) => x + y.score, 0) / n), total_output: s.sessions.reduce((x, y) => x + (y.out ?? 0), 0), total_context: s.sessions.reduce((x, y) => x + (y.ctx ?? 0), 0) }; } },
  ],
  preview: [
    { name: "detect_browsers", description: "Detect installed browsers on this machine (real scan).", parameters: { type: "object", properties: {} },
      run: async () => ({ browsers: (await window.dai.browsers.detect()).browsers.map((b) => b.label) }) },
    { name: "open_url", description: "Open a URL in a detected browser (login-safe — the user signs in manually).", parameters: { type: "object", properties: { url: { type: "string" }, browser: { type: "string" } }, required: ["url"] },
      run: async (a) => window.dai.browsers.open(str(a.browser, "default"), str(a.url)) },
  ],
};

export function toolSpecsForSector(sector: AgentSector): ToolSpec[] {
  return [...GLOBAL, ...(SECTOR[sector] ?? [])];
}

/** Ollama tool-schema array for a sector (what the model sees). */
export function toolsForSector(sector: AgentSector): unknown[] {
  return toolSpecsForSector(sector).map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.parameters } }));
}

/** Execute a tool call by name — real window.dai.* work; honest error on failure. */
export async function execTool(sector: AgentSector, name: string, args: Record<string, unknown>): Promise<unknown> {
  const spec = toolSpecsForSector(sector).find((t) => t.name === name);
  if (!spec) return { error: `unknown tool "${name}"` };
  try { return await spec.run(args || {}); }
  catch (e) { return { error: String(e).slice(0, 160) }; }
}

/** One-line human summary of a tool call for the chat activity log. */
export function toolLogLine(name: string, args: Record<string, unknown>, result: unknown): string {
  const a = Object.entries(args || {}).map(([k, v]) => `${k}=${String(v).slice(0, 30)}`).join(", ");
  let r = "";
  const R = result as Record<string, unknown>;
  if (R && typeof R === "object") {
    if ("error" in R) r = `✗ ${R.error}`;
    else if ("found" in R) r = `${R.found} note(s)`;
    else if ("live" in R) r = `${R.live} live / ${(R as any).total ?? (R as any).total_sessions ?? "?"} total`;
    else if ("notes" in R) r = "matched vault notes";
    else if ("terminal" in R) r = `→ ${R.terminal}`;
    else if ("navigated_to" in R) r = `→ ${R.navigated_to}`;
    else if ("browsers" in R) r = (R.browsers as string[]).join(", ");
    else if ("notes" in R === false) r = "ok";
  }
  return `⚙ ${name}(${a}) ${r}`;
}
