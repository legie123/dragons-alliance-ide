// Agent catalog — search + category filter over the ~100-entry roster
// (src/renderer/src/data/agentCatalog.ts). Clicking a card arms a Claude
// terminal seeded with a role prompt — deployClaudeWithPrompt returns a thunk,
// so we invoke the returned function rather than passing the outer curry.
import { useMemo, useState } from "react";
import { AGENT_CATALOG, AGENT_CATEGORIES, type AgentCatalogEntry } from "../../data/agentCatalog";
import { deployClaudeWithPrompt } from "../../registry";

function agentPrompt(entry: AgentCatalogEntry): string {
  return `You are now operating as the "${entry.label}" agent — ${entry.role} Apply this specialization to the current project and confirm your role before starting work.`;
}

export function AgentCatalog({ activeProject }: { activeProject?: string | null }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("All");

  const hits = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return AGENT_CATALOG.filter((e) => {
      if (cat !== "All" && e.category !== cat) return false;
      if (!needle) return true;
      return (
        e.label.toLowerCase().includes(needle) ||
        e.role.toLowerCase().includes(needle) ||
        e.category.toLowerCase().includes(needle)
      );
    });
  }, [q, cat]);

  const deploy = (entry: AgentCatalogEntry) => deployClaudeWithPrompt(agentPrompt(entry), activeProject || "~")();

  return (
    <section className="vault-card">
      <div className="vault-card-h">Agent catalog <span className="vault-badge on">{hits.length}/{AGENT_CATALOG.length}</span></div>
      <div className="vault-row">
        <input className="vault-in" value={q} onChange={(e) => setQ(e.target.value)} placeholder="search label, role, category…" spellCheck={false} />
        <select className="vault-in slim" style={{ width: 200 }} value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="All">All categories</option>
          {AGENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="radar-grid">
        {hits.map((e) => (
          <button key={e.id} className="radar-card" onClick={() => deploy(e)} title={`Deploy claude as ${e.label}`}>
            <div className="radar-name">{e.label}</div>
            <span className="vault-badge mid" style={{ marginLeft: 0 }}>{e.category}</span>
            <div className="radar-desc">{e.role}</div>
          </button>
        ))}
        {hits.length === 0 && <div className="empty">no agents match</div>}
      </div>
    </section>
  );
}
