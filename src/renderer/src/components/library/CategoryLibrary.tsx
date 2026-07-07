// Admin Library — the category catalog. Summary cards, a colored category rail,
// search + status/source/use-case filters + sort, a card grid, and a right-side
// inspector. Data is the static LIBRARY_CATALOG (agents + tools + business).
import { useMemo, useState } from "react";
import {
  CATEGORY_META, CATEGORY_ORDER, LIB_STATUS_META, SOURCE_LABEL, USECASE_LABEL,
  type LibEntry, type LibCategory, type LibStatus, type LibSource, type LibUseCase,
} from "./libraryMeta";
import { LIBRARY_CATALOG } from "../../data/libraryCatalog";
import { LibraryCard } from "./LibraryCard";
import { LibraryInspector, agentPrompt } from "./LibraryInspector";
import { SuperpowersControlRoom } from "./SuperpowersControlRoom";
import { deployClaudeWithPrompt } from "../../registry";

type CatFilter = LibCategory | "all";
type Sort = "power" | "name" | "category" | "status";

const STATUS_ORDER: LibStatus[] = ["live", "local-only", "setup-required", "experimental", "planned", "disabled"];

export function CategoryLibrary({ activeProject }: { activeProject?: string | null }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<CatFilter>("all");
  const [status, setStatus] = useState<LibStatus | "all">("all");
  const [source, setSource] = useState<LibSource | "all">("all");
  const [useCase, setUseCase] = useState<LibUseCase | "all">("all");
  const [sort, setSort] = useState<Sort>("power");
  const [sel, setSel] = useState<string | null>(null);

  // category counts for the rail (whole catalog, independent of the active filter)
  const catCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of LIBRARY_CATALOG) c[e.category] = (c[e.category] ?? 0) + 1;
    return c;
  }, []);

  // summary tiles (honest totals over the whole catalog)
  const summary = useMemo(() => {
    let live = 0, setup = 0, internal = 0, gh = 0, exp = 0, agents = 0, tools = 0;
    for (const e of LIBRARY_CATALOG) {
      if (e.status === "live") live++;
      if (e.status === "setup-required") setup++;
      if (e.source === "internal") internal++;
      if (e.github) gh++;
      if (e.status === "experimental" || e.status === "planned") exp++;
      if (e.kind === "agent") agents++; else tools++;
    }
    return { total: LIBRARY_CATALOG.length, live, setup, internal, gh, exp, agents, tools };
  }, []);

  const hits = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = LIBRARY_CATALOG.filter((e) => {
      if (cat !== "all" && e.category !== cat) return false;
      if (status !== "all" && e.status !== status) return false;
      if (source !== "all" && e.source !== source) return false;
      if (useCase !== "all" && !e.useCases.includes(useCase)) return false;
      if (!needle) return true;
      return (
        e.name.toLowerCase().includes(needle) ||
        e.role.toLowerCase().includes(needle) ||
        e.does.toLowerCase().includes(needle) ||
        e.category.includes(needle) ||
        (e.githubNote ?? "").toLowerCase().includes(needle)
      );
    });
    out.sort((a, b) => {
      if (sort === "power") return b.power - a.power || a.name.localeCompare(b.name);
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "category") return a.category.localeCompare(b.category) || b.power - a.power;
      // status: live first
      return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.name.localeCompare(b.name);
    });
    return out;
  }, [q, cat, status, source, useCase, sort]);

  const selected = useMemo(() => hits.find((e) => e.id === sel) ?? LIBRARY_CATALOG.find((e) => e.id === sel) ?? null, [sel, hits]);

  const launch = (e: LibEntry) => {
    deployClaudeWithPrompt(agentPrompt(e), activeProject || "~")();
  };

  const sumTiles: Array<{ n: number; l: string; cat?: LibCategory }> = [
    { n: summary.total, l: `total · ${summary.agents} agents / ${summary.tools} tools` },
    { n: summary.live, l: "LIVE" },
    { n: summary.setup, l: "SETUP REQUIRED" },
    { n: summary.internal, l: "INTERNAL" },
    { n: summary.gh, l: "GITHUB VERIFIED" },
    { n: summary.exp, l: "EXPERIMENTAL / PLANNED" },
  ];

  return (
    <div className="lib-catalog">
      <SuperpowersControlRoom />
      <div className="lib-summary">
        {sumTiles.map((t, i) => (
          <div key={i} className={`lib-sum${i === 0 ? " total" : ""}`} data-cat={t.cat}>
            <div className="lib-sum-n">{t.n}</div>
            <div className="lib-sum-l">{t.l}</div>
          </div>
        ))}
      </div>

      <div className="lib-filters">
        <input className="vault-in" value={q} onChange={(e) => setQ(e.target.value)} placeholder="search name, role, description…" spellCheck={false} />
        <select className="vault-in slim" value={status} onChange={(e) => setStatus(e.target.value as any)} title="Filter by status">
          <option value="all">Any status</option>
          {STATUS_ORDER.map((s) => <option key={s} value={s}>{LIB_STATUS_META[s].label}</option>)}
        </select>
        <select className="vault-in slim" value={source} onChange={(e) => setSource(e.target.value as any)} title="Filter by source">
          <option value="all">Any source</option>
          {(Object.keys(SOURCE_LABEL) as LibSource[]).map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
        </select>
        <select className="vault-in slim" value={useCase} onChange={(e) => setUseCase(e.target.value as any)} title="Filter by use case">
          <option value="all">Any use case</option>
          {(Object.keys(USECASE_LABEL) as LibUseCase[]).map((u) => <option key={u} value={u}>{USECASE_LABEL[u]}</option>)}
        </select>
        <select className="vault-in slim" value={sort} onChange={(e) => setSort(e.target.value as Sort)} title="Sort">
          <option value="power">Most powerful</option>
          <option value="status">Status (live first)</option>
          <option value="category">Category</option>
          <option value="name">Name (A–Z)</option>
        </select>
      </div>

      <div className="lib-body">
        <nav className="lib-rail" aria-label="Categories">
          <button className={`lib-rail-item${cat === "all" ? " on" : ""}`} onClick={() => setCat("all")}>
            <span className="lib-rail-lbl">All</span>
            <span className="lib-rail-count">{summary.total}</span>
          </button>
          {CATEGORY_ORDER.map((c) => {
            const m = CATEGORY_META[c];
            return (
              <button key={c} className={`lib-rail-item${cat === c ? " on" : ""}`} data-cat={c} onClick={() => setCat(c)} title={m.blurb}>
                <span className="lib-rail-ic">{m.icon({ size: 15 })}</span>
                <span className="lib-rail-lbl">{m.label}</span>
                <span className="lib-rail-count">{catCounts[c] ?? 0}</span>
              </button>
            );
          })}
        </nav>

        <main className="lib-main">
          <div className="lib-count">showing {hits.length} of {summary.total}{cat !== "all" ? ` · ${CATEGORY_META[cat].label}` : ""}</div>
          <div className="lib-grid">
            {hits.map((e) => <LibraryCard key={e.id} e={e} selected={sel === e.id} onSelect={() => setSel(e.id)} />)}
            {hits.length === 0 && <div className="empty">no agents or tools match these filters</div>}
          </div>
        </main>

        <LibraryInspector e={selected} activeProject={activeProject} onLaunch={launch} />
      </div>
    </div>
  );
}
