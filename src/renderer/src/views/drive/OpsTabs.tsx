// Drive — operations tabs: Mail (Gmail), Proton, Candidates, Activity.
// Extracted from DriveView.tsx (mechanical split, <500-line rule). Logic intact.
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IcClip, IcUser, IcX, IcExternal } from "../../components/icons";
import { fetchMeta, fetchProtonStatus } from "../../api";
import type { GMailMsg, DriveMeta } from "../../api";

const DOC_CHECKLIST = ["pasaport", "contract", "paper form", "TRC", "immigration"];

export function fmtTime(ts?: number | null) {
  if (!ts) return "never";
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
}

// ---------- Mail (Gmail) ----------
export function MailTab() {
  const [q, setQ] = useState("has:attachment");
  const [msgs, setMsgs] = useState<GMailMsg[]>([]);
  const [busy, setBusy] = useState("");
  const [saveMsg, setSaveMsg] = useState("");

  async function search() {
    setBusy("searching Gmail…");
    const r = await window.dai.google.mailSearch(q.trim() || "in:inbox");
    setMsgs(r);
    setBusy(r.length === 0 ? "no results (Gmail API enabled + re-consented?)" : "");
  }
  async function saveAtt(m: GMailMsg, att: GMailMsg["attachments"][0]) {
    setSaveMsg("saving attachment → Drive/Mail…");
    const tree = await window.dai.google.ensureTree();
    const mailFolder = tree.ok ? await window.dai.gdrive.search("name='Mail' and mimeType='application/vnd.google-apps.folder'").then((f) => f[0]?.id) : undefined;
    const saved = await window.dai.google.mailSaveAttachment(m.id, att.attId, att.filename, mailFolder || "root");
    if (saved) {
      await window.dai.meta.upsert({ name: att.filename, type: "email", source: "gmail", emailId: m.id, googleDriveId: saved.id, tags: ["attachment"] });
      setSaveMsg(`✓ ${att.filename} → Drive`);
    } else setSaveMsg("✗ save failed");
    setTimeout(() => setSaveMsg(""), 5000);
  }

  return (
    <>
      <div className="drv-toolrow">
        <input className="drv-search wide" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder='Gmail query — e.g. from:candidate@x.com has:attachment' spellCheck={false} />
        <button className="drv-btn accent" onClick={search}>Search Gmail</button>
        {busy && <span className="drv-busy inline">{busy}</span>}
      </div>
      {saveMsg && <div className="drv-backup-bar">{saveMsg}</div>}
      <div className="drv-list">
        {msgs.map((m) => (
          <div key={m.id} className="drv-mail">
            <div className="drv-mail-h"><b>{m.from}</b><span className="drv-mail-d">{m.date}</span></div>
            <div className="drv-mail-s">{m.subject}</div>
            <div className="drv-mail-snip">{m.snippet}</div>
            {m.attachments.length > 0 && (
              <div className="drv-mail-atts">
                {m.attachments.map((a) => (
                  <button key={a.attId} className="drv-att" onClick={() => saveAtt(m, a)} title="save to Drive/Mail">
                    <IcClip size={11} /> {a.filename} <span className="drv-att-save">→ Drive</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {msgs.length === 0 && !busy && <div className="drv-empty">search your Gmail — messages, candidates, attachments</div>}
      </div>
    </>
  );
}

// ---------- Proton ----------
export function ProtonTab() {
  const { data: st, refetch } = useQuery({ queryKey: ["proton"], queryFn: fetchProtonStatus, refetchInterval: 6000 });
  const [host, setHost] = useState("127.0.0.1");
  const [port, setPort] = useState("1143");
  const [user, setUser] = useState("");

  return (
    <div className="drv-setup">
      <h3>Proton Mail (via Proton Mail Bridge)</h3>
      <div className={`drv-status ${st?.bridgeUp ? "live" : "needs"}`} style={{ marginBottom: 10 }}>
        ● {st?.bridgeUp ? "Bridge reachable" : "Bridge not detected"} · {st?.host}:{st?.port}{st?.user ? " · " + st.user : ""}
      </div>
      <p className="drv-note">{st?.hint}</p>
      <ol className="drv-steps">
        <li>Proton has no public API — the official path is <b>Proton Mail Bridge</b> (paid Proton plan).</li>
        <li>Install + run Bridge → it exposes local IMAP (default <code>127.0.0.1:1143</code>).</li>
        <li>Save your Bridge username below. The password stays in the Bridge app — we never store it.</li>
        <li>Once the Bridge probe is green, email import lands in a future pass (structure is ready).</li>
      </ol>
      <div className="drv-form">
        <input className="drv-in slim" value={host} onChange={(e) => setHost(e.target.value)} placeholder="host" />
        <input className="drv-in slim" value={port} onChange={(e) => setPort(e.target.value)} placeholder="port" />
        <input className="drv-in" value={user} onChange={(e) => setUser(e.target.value)} placeholder="Bridge username (email)" />
        <button className="drv-btn accent" onClick={() => window.dai.proton.setConfig(host, Number(port) || 1143, user).then(() => refetch())}>Save + probe</button>
      </div>
    </div>
  );
}

// ---------- Candidates ----------
export function CandidatesTab({ signedIn }: { signedIn: boolean }) {
  const qc = useQueryClient();
  const { data: all = [] } = useQuery({ queryKey: ["meta"], queryFn: () => fetchMeta(), refetchInterval: 6000 });
  const candidates = all.filter((m: DriveMeta) => m.type === "candidate");
  const [name, setName] = useState("");
  const [sel, setSel] = useState<DriveMeta | null>(null);
  const docs = sel ? all.filter((m: DriveMeta) => m.candidateId === sel.id) : [];

  async function create() {
    if (!name.trim()) return;
    await window.dai.meta.candidateCreate(name.trim());
    setName("");
    qc.invalidateQueries({ queryKey: ["meta"] });
  }
  async function addDoc(kind: string) {
    if (!sel) return;
    await window.dai.meta.upsert({ name: `${sel.name} — ${kind}`, type: kind === "contract" ? "contract" : kind === "paper form" ? "paperform" : "document", source: "ide", candidateId: sel.id, status: "missing", tags: [kind] });
    qc.invalidateQueries({ queryKey: ["meta"] });
  }
  async function toggleDoc(d: DriveMeta) {
    await window.dai.meta.upsert({ ...d, status: d.status === "complete" ? "missing" : "complete" });
    qc.invalidateQueries({ queryKey: ["meta"] });
  }

  return (
    <div className="drv-body">
      <div className="drv-list">
        <div className="drv-toolrow">
          <input className="drv-in slim" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} placeholder="new candidate name" />
          <button className="drv-btn accent" onClick={create} disabled={!name.trim()}>+ Candidate</button>
        </div>
        {!signedIn && <div className="drv-note">signed out — candidates are created locally; Drive folders attach after sign-in</div>}
        {candidates.length === 0 && <div className="drv-empty">no candidates yet</div>}
        {candidates.map((c: DriveMeta) => (
          <button key={c.id} className={`drv-row${sel?.id === c.id ? " folder" : ""}`} onClick={() => setSel(c)}>
            <span className="drv-ic"><IcUser /></span><span className="drv-name">{c.name}</span>
            <span className="drv-size">{c.googleDriveId ? "drive" : "local"}</span>
          </button>
        ))}
      </div>
      {sel && (
        <aside className="drv-reader">
          <div className="drv-reader-head"><IcUser size={12} /> {sel.name}
            {sel.googleDriveId && <button className="drv-open" onClick={() => window.dai.shell.open(`https://drive.google.com/drive/folders/${sel.googleDriveId}`)}><IcExternal size={10} /> folder</button>}
            <button className="drv-x" onClick={() => setSel(null)} aria-label="Close candidate"><IcX size={10} /></button>
          </div>
          <div className="drv-reader-body">
            <div className="drv-check-h">Document checklist</div>
            {DOC_CHECKLIST.map((kind) => {
              const doc = docs.find((d: DriveMeta) => d.tags.includes(kind));
              return doc ? (
                <button key={kind} className={`drv-doc ${doc.status}`} onClick={() => toggleDoc(doc)}>
                  {doc.status === "complete" ? "✓" : "○"} {kind}
                </button>
              ) : (
                <button key={kind} className="drv-doc add" onClick={() => addDoc(kind)}>+ {kind}</button>
              );
            })}
            <div className="drv-check-h" style={{ marginTop: 12 }}>Linked items ({docs.length})</div>
            {docs.map((d: DriveMeta) => (
              <div key={d.id} className="drv-linked">{d.type} · {d.name} · <b>{d.status}</b></div>
            ))}
            <div className="drv-note" style={{ marginTop: 10 }}>Every item here is a node in Neuromap, linked to this candidate.</div>
          </div>
        </aside>
      )}
    </div>
  );
}

// ---------- Activity ----------
export function ActivityTab() {
  const { data: all = [] } = useQuery({ queryKey: ["meta"], queryFn: () => fetchMeta(), refetchInterval: 6000 });
  return (
    <div className="drv-list">
      {all.length === 0 && <div className="drv-empty">no activity yet — everything you create/upload lands here with metadata</div>}
      {all.slice(0, 60).map((m: DriveMeta) => (
        <div key={m.id} className="drv-act">
          <span className="drv-act-t">{fmtTime(m.updatedAt)}</span>
          <span className="drv-act-k">{m.type}</span>
          <span className="drv-name">{m.name}</span>
          <span className="drv-act-s">{m.status}</span>
          <span className="drv-act-src">{m.source}</span>
        </div>
      ))}
    </div>
  );
}
