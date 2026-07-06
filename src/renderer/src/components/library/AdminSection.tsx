// Admin section of Library — the full agent catalog plus a smart-tricks CRUD
// editor. The caller (LibraryView) already checked the "adm:library" grant
// before rendering this at all; every write still goes through the real IPC,
// which the main process independently re-checks via teamCan("adm:library")
// (defense in depth).
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { TipEntry } from "@shared/ipc";
import { AgentCatalog } from "./AgentCatalog";

type TipDraft = { id?: string; title: string; body: string; category: string };

export function AdminSection({ activeProject }: { activeProject?: string | null }) {
  const qc = useQueryClient();
  const { data: tips = [] } = useQuery({ queryKey: ["tips"], queryFn: () => window.dai.tips.list() });
  const [draft, setDraft] = useState<TipDraft | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const startNew = () => { setDraft({ title: "", body: "", category: "" }); setErr(null); };
  const startEdit = (t: TipEntry) => { setDraft({ id: t.id, title: t.title, body: t.body, category: t.category ?? "" }); setErr(null); };
  const cancel = () => { setDraft(null); setErr(null); };

  const save = async () => {
    if (!draft) return;
    const title = draft.title.trim();
    const body = draft.body.trim();
    if (!title || !body) return;
    const res = await window.dai.tips.upsert({ id: draft.id, title, body, category: draft.category.trim() || undefined });
    if ("error" in res) { setErr(res.error); return; }
    setDraft(null);
    setErr(null);
    qc.invalidateQueries({ queryKey: ["tips"] });
  };

  const remove = async (id: string) => {
    const ok = await window.dai.tips.delete(id);
    if (!ok) { setErr("delete failed — you may lack Library admin access"); return; }
    qc.invalidateQueries({ queryKey: ["tips"] });
  };

  return (
    <>
      <AgentCatalog activeProject={activeProject} />

      <section className="vault-card">
        <div className="vault-card-h">Smart tricks (admin) <span className="vault-badge on">{tips.length}</span></div>
        <div className="vault-steps">
          Curated tips shown to the whole team in Library → Team. Writes are re-checked server-side
          against <code>adm:library</code> — a rejected save shows the real reason below.
        </div>

        {tips.map((t) => (
          <div key={t.id} className="audit-row">
            <span className="audit-detail"><b>{t.title}</b>{t.category ? ` · ${t.category}` : ""}</span>
            <button className="drv-btn ghost" onClick={() => startEdit(t)}>Edit</button>
            <button className="drv-btn ghost" onClick={() => remove(t.id)}>Delete</button>
          </div>
        ))}
        {tips.length === 0 && <div className="empty">no tips yet</div>}

        {draft ? (
          <div className="vault-row" style={{ flexDirection: "column", alignItems: "stretch" }}>
            <input className="vault-in" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="title" />
            <textarea className="vault-in" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} placeholder="body" rows={4} />
            <input className="vault-in" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="category (optional)" />
            <div className="vault-row">
              <button className="drv-btn accent" onClick={save} disabled={!draft.title.trim() || !draft.body.trim()}>Save tip</button>
              <button className="drv-btn ghost" onClick={cancel}>Cancel</button>
            </div>
            {err && <div className="vault-steps" style={{ color: "var(--st-error)" }}>{err}</div>}
          </div>
        ) : (
          <div className="vault-row"><button className="drv-btn" onClick={startNew}>Add tip</button></div>
        )}
      </section>
    </>
  );
}
