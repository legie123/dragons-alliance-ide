// Drive — the document operations center: Google Cloud config, Drive folders,
// Sheets, Forms, Gmail, Proton Mail, Candidates, Activity. All Google calls run
// in the main process on the user's own OAuth client; every panel gates honestly
// on sign-in / API enablement — nothing here fakes a connection or data.
import { useEffect, useState } from "react";
import { IcFolder, IcFile, IcImage, IcSheet, IcZap } from "../components/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchGDriveStatus, fetchMeta, fetchProtonStatus } from "../api";
import type { GDriveFile, GSheetData, GMailMsg, DriveMeta } from "../api";

const CONSOLE = "https://console.cloud.google.com/apis/credentials";
const API_LINKS = [
  { name: "Drive API", url: "https://console.cloud.google.com/apis/library/drive.googleapis.com" },
  { name: "Sheets API", url: "https://console.cloud.google.com/apis/library/sheets.googleapis.com" },
  { name: "Forms API", url: "https://console.cloud.google.com/apis/library/forms.googleapis.com" },
  { name: "Gmail API", url: "https://console.cloud.google.com/apis/library/gmail.googleapis.com" },
];
const TABS = ["Config", "Folders", "Sheets", "Forms", "Mail", "Proton", "Candidates", "Activity"] as const;
type Tab = typeof TABS[number];

const DOC_CHECKLIST = ["pasaport", "contract", "paper form", "TRC", "immigration"];

function fmtTime(ts?: number | null) {
  if (!ts) return "never";
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
}

/** Honest gate shown by every Google-backed tab when signed out. */
function Gate({ what }: { what: string }) {
  return <div className="drv-gate">🔒 {what} needs Google — go to <b>Config</b>, save your OAuth client and sign in. Nothing is simulated.</div>;
}

export function DriveView() {
  const qc = useQueryClient();
  const { data: status } = useQuery({ queryKey: ["gdrive"], queryFn: fetchGDriveStatus, refetchInterval: 5000 });
  const [tab, setTab] = useState<Tab>("Config");
  const signedIn = !!status?.signedIn;
  const refreshStatus = () => qc.invalidateQueries({ queryKey: ["gdrive"] });

  // land on Folders once signed in (first time only)
  useEffect(() => { if (signedIn) setTab((t) => (t === "Config" ? "Folders" : t)); /* eslint-disable-line */ }, [signedIn]);

  return (
    <div className="drv-view">
      <div className="drv-bar">
        <span className="drv-title">☁️ DRIVE OPS</span>
        <span className={`drv-status ${signedIn ? "live" : status?.configured ? "ready" : "needs"}`}>
          ● {signedIn ? (status?.email || "signed in") : status?.configured ? "configured — sign in" : "needs setup"}
        </span>
        <div className="drv-tabs">
          {TABS.map((t) => (
            <button key={t} className={`drv-tab${tab === t ? " on" : ""}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
      </div>

      {tab === "Config" && <ConfigTab status={status} refresh={refreshStatus} />}
      {tab === "Folders" && (signedIn ? <FoldersTab /> : <Gate what="Drive folders" />)}
      {tab === "Sheets" && (signedIn ? <SheetsTab /> : <Gate what="Sheets" />)}
      {tab === "Forms" && (signedIn ? <FormsTab /> : <Gate what="Forms" />)}
      {tab === "Mail" && (signedIn ? <MailTab /> : <Gate what="Gmail" />)}
      {tab === "Proton" && <ProtonTab />}
      {tab === "Candidates" && <CandidatesTab signedIn={signedIn} />}
      {tab === "Activity" && <ActivityTab />}
    </div>
  );
}

// ---------- Config ----------
function ConfigTab({ status, refresh }: { status: any; refresh: () => void }) {
  const [clientId, setClientId] = useState("");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState("");

  async function saveClient() {
    if (!clientId.trim() || !secret.trim()) return;
    setBusy("saving…");
    await window.dai.gdrive.setClient(clientId.trim(), secret.trim());
    setSecret("");
    setBusy(""); refresh();
  }
  async function signIn() {
    setBusy("opening Google consent in your browser…");
    await window.dai.gdrive.auth();
    setBusy(""); refresh();
  }

  return (
    <div className="drv-setup">
      <h3>Google Cloud Console</h3>
      <ol className="drv-steps">
        <li>Open <button className="drv-link" onClick={() => window.dai.shell.open(CONSOLE)}>Credentials ↗</button> → create an <b>OAuth client ID</b> (type <b>Desktop app</b>).</li>
        <li>Enable the APIs: {API_LINKS.map((a, i) => (
          <span key={a.name}>{i > 0 && " · "}<button className="drv-link" onClick={() => window.dai.shell.open(a.url)}>{a.name} ↗</button></span>
        ))}</li>
        <li>Paste client ID + secret below (stored locally, 0600, never leaves your Mac except to Google).</li>
        <li>Sign in — consent covers Drive + Sheets + Forms + Gmail (read). Re-connect if you added scopes later.</li>
      </ol>
      <div className="drv-form">
        <input className="drv-in" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="Client ID (…apps.googleusercontent.com)" spellCheck={false} />
        <input className="drv-in" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Client secret" spellCheck={false} />
        <button className="drv-btn accent" onClick={saveClient} disabled={!clientId.trim() || !secret.trim()}>Save credentials</button>
      </div>
      <div className="drv-cfg-row">
        {status?.configured
          ? <button className="drv-btn accent" onClick={signIn}>{status?.signedIn ? "Re-connect (grant new scopes) ↗" : "Sign in with Google ↗"}</button>
          : <span className="drv-note">save credentials first</span>}
        {status?.signedIn && <button className="drv-btn ghost" onClick={() => window.dai.gdrive.signout().then(refresh)}>Sign out</button>}
        {status?.configured && <button className="drv-btn ghost" onClick={() => window.dai.gdrive.setClient("", "").then(refresh)}>Reset credentials</button>}
      </div>
      <div className="drv-note">🔒 OAuth + tokens live only in the app's main process (<code>~/.config/dai/google.json</code>, 0600). Status: {status?.signedIn ? "connected" : status?.configured ? "configured, signed out" : "needs config"}.</div>
      {busy && <div className="drv-busy">{busy}</div>}
    </div>
  );
}

// ---------- Folders (browser + structure + upload) ----------
function FoldersTab() {
  const [files, setFiles] = useState<GDriveFile[]>([]);
  const [trail, setTrail] = useState<{ id: string; name: string }[]>([{ id: "root", name: "My Drive" }]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");
  const [open, setOpen] = useState<{ name: string; text: string; truncated: boolean } | null>(null);
  const [treeMsg, setTreeMsg] = useState("");
  const [newName, setNewName] = useState("");
  const [upPath, setUpPath] = useState("");
  const [convert, setConvert] = useState(false);
  const cwd = trail[trail.length - 1];

  useEffect(() => { load("root", "My Drive", true); /* eslint-disable-line */ }, []);

  async function load(id: string, name: string, reset = false) {
    setBusy("loading…"); setOpen(null);
    setFiles(await window.dai.gdrive.list(id === "root" ? undefined : id));
    setTrail((t) => reset ? [{ id: "root", name: "My Drive" }] : [...t, { id, name }]);
    setBusy("");
  }
  async function crumb(i: number) {
    const t = trail[i];
    setTrail(trail.slice(0, i + 1)); setBusy("loading…"); setOpen(null);
    setFiles(await window.dai.gdrive.list(t.id === "root" ? undefined : t.id));
    setBusy("");
  }
  async function openFile(f: GDriveFile) {
    if (f.isFolder) return load(f.id, f.name);
    setBusy("reading…");
    const r = await window.dai.gdrive.read(f.id);
    setOpen({ name: r.name || f.name, text: r.text, truncated: r.truncated });
    setBusy("");
  }
  async function ensureTree() {
    setTreeMsg("creating Dragons Alliance structure…");
    const r = await window.dai.google.ensureTree();
    setTreeMsg(r.ok ? `✓ structure ready — created: ${r.created.length ? r.created.join(", ") : "none (all existed)"}` : "✗ " + (r.error || "failed"));
    setTimeout(() => setTreeMsg(""), 8000);
  }
  async function mkFolder() {
    if (!newName.trim()) return;
    const f = await window.dai.google.folderCreate(newName.trim(), cwd.id === "root" ? undefined : cwd.id);
    setNewName("");
    if (f) { await window.dai.meta.upsert({ name: f.name, type: "folder", source: "drive", googleDriveId: f.id }); crumb(trail.length - 1); }
  }
  async function doUpload() {
    if (!upPath.trim()) return;
    setBusy("uploading…");
    const f = await window.dai.google.upload(upPath.trim(), cwd.id === "root" ? "root" : cwd.id, convert);
    setBusy(f ? "" : "upload failed (path? size? signed in?)");
    if (f) {
      await window.dai.meta.upsert({ name: f.name, type: convert ? "sheet" : "document", source: "drive", googleDriveId: f.id, path: upPath.trim() });
      setUpPath(""); crumb(trail.length - 1);
    }
  }

  return (
    <>
      <div className="drv-toolrow">
        <button className="drv-btn accent" onClick={ensureTree} title="Create Dragons Alliance/Companies|Candidates|Contracts|… (idempotent)"><IcZap /> Create Dragons Alliance structure</button>
        <input className="drv-in slim" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={`new folder in ${cwd.name}`} />
        <button className="drv-btn" onClick={mkFolder} disabled={!newName.trim()}>+ Folder</button>
        <input className="drv-in slim wide" value={upPath} onChange={(e) => setUpPath(e.target.value)} placeholder="upload: /path/to/file (xlsx, pdf…)" spellCheck={false} />
        <label className="drv-check"><input type="checkbox" checked={convert} onChange={(e) => setConvert(e.target.checked)} /> convert→Sheets</label>
        <button className="drv-btn" onClick={doUpload} disabled={!upPath.trim()}>⬆ Upload</button>
        <span className="drv-spacer" />
        <input className="drv-search" value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={async (e) => { if (e.key === "Enter" && query.trim()) { setFiles(await window.dai.gdrive.search(query.trim())); setTrail([{ id: "root", name: `search: ${query}` }]); } }}
          placeholder="search Drive…" spellCheck={false} />
      </div>
      {treeMsg && <div className="drv-backup-bar">{treeMsg}</div>}
      <div className="drv-crumbs">
        {trail.map((c, i) => (
          <span key={c.id + i}>{i > 0 && <span className="drv-sep">/</span>}<button className="drv-crumb" onClick={() => crumb(i)}>{c.name}</button></span>
        ))}
        {busy && <span className="drv-busy inline">{busy}</span>}
      </div>
      <div className="drv-body">
        <div className="drv-list">
          {files.length === 0 && !busy && <div className="drv-empty">empty folder</div>}
          {files.map((f) => (
            <button key={f.id} className={`drv-row${f.isFolder ? " folder" : ""}`} onClick={() => openFile(f)}>
              <span className="drv-ic">{f.isFolder ? <IcFolder /> : f.mimeType.includes("spreadsheet") ? <IcSheet /> : f.mimeType.includes("image") ? <IcImage /> : <IcFile />}</span>
              <span className="drv-name">{f.name}</span>
              {f.size ? <span className="drv-size">{(f.size / 1024).toFixed(0)}K</span> : null}
            </button>
          ))}
        </div>
        {open && (
          <aside className="drv-reader">
            <div className="drv-reader-head">{open.name}{open.truncated ? " · truncated" : ""}<button className="drv-x" onClick={() => setOpen(null)}>✕</button></div>
            <pre className="drv-reader-body">{open.text || "(empty / binary)"}</pre>
          </aside>
        )}
      </div>
    </>
  );
}

// ---------- Sheets ----------
function SheetsTab() {
  const [sheets, setSheets] = useState<GDriveFile[]>([]);
  const [title, setTitle] = useState("");
  const [data, setData] = useState<GSheetData | null>(null);
  const [busy, setBusy] = useState("");

  async function refresh() {
    setBusy("loading Sheets…");
    setSheets(await window.dai.gdrive.search("mimeType='application/vnd.google-apps.spreadsheet'"));
    setBusy("");
  }
  useEffect(() => { refresh(); }, []);

  async function create() {
    if (!title.trim()) return;
    setBusy("creating…");
    const folder = await window.dai.google.ensureTree().then(() => null).catch(() => null);
    const f = await window.dai.google.sheetCreate(title.trim());
    if (f) await window.dai.meta.upsert({ name: f.name, type: "sheet", source: "drive", sheetId: f.id, googleDriveId: f.id });
    setTitle(""); setBusy(""); refresh();
    void folder;
  }
  async function preview(f: GDriveFile) {
    setBusy("reading…");
    setData(await window.dai.google.sheetRead(f.id));
    setBusy("");
  }

  return (
    <>
      <div className="drv-toolrow">
        <input className="drv-in slim" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="new Sheet title (e.g. Candidates 2026)" />
        <button className="drv-btn accent" onClick={create} disabled={!title.trim()}>+ Create Sheet</button>
        <button className="drv-btn" onClick={refresh}>⟳</button>
        {busy && <span className="drv-busy inline">{busy}</span>}
      </div>
      <div className="drv-body">
        <div className="drv-list">
          {sheets.length === 0 && !busy && <div className="drv-empty">no Sheets yet — create one, or upload an Excel with convert→Sheets in Folders</div>}
          {sheets.map((f) => (
            <button key={f.id} className="drv-row" onClick={() => preview(f)}>
              <span className="drv-ic"><IcSheet /></span><span className="drv-name">{f.name}</span>
              <span className="drv-open" onClick={(e) => { e.stopPropagation(); window.dai.shell.open(`https://docs.google.com/spreadsheets/d/${f.id}`); }}>↗</span>
            </button>
          ))}
        </div>
        {data && (
          <aside className="drv-reader">
            <div className="drv-reader-head">{data.range}{data.error ? " · " + data.error : ""}<button className="drv-x" onClick={() => setData(null)}>✕</button></div>
            <div className="drv-sheet">
              {data.values.length === 0 ? <div className="drv-empty">{data.error || "empty range"}</div> : (
                <table><tbody>{data.values.map((row, i) => <tr key={i}>{row.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table>
              )}
            </div>
          </aside>
        )}
      </div>
    </>
  );
}

// ---------- Forms ----------
function FormsTab() {
  const [forms, setForms] = useState<GDriveFile[]>([]);
  const [title, setTitle] = useState("");
  const [resp, setResp] = useState<{ id: string; rows: { responseId: string; submittedAt: string; answers: Record<string, string> }[] } | null>(null);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");

  async function refresh() {
    setBusy("loading Forms…");
    setForms(await window.dai.gdrive.search("mimeType='application/vnd.google-apps.form'"));
    setBusy("");
  }
  useEffect(() => { refresh(); }, []);

  async function create() {
    if (!title.trim()) return;
    setBusy("creating…");
    const f = await window.dai.google.formCreate(title.trim());
    if (f?.formId) {
      await window.dai.meta.upsert({ name: title.trim(), type: "form", source: "drive", formId: f.formId });
      if (f.responderUri) window.dai.shell.open(f.responderUri);
      setNote("");
    } else setNote(f?.error || "create failed (Forms API enabled?)");
    setTitle(""); setBusy(""); refresh();
  }
  async function responses(f: GDriveFile) {
    setBusy("loading responses…");
    setResp({ id: f.id, rows: await window.dai.google.formResponses(f.id) });
    setBusy("");
  }

  return (
    <>
      <div className="drv-toolrow">
        <input className="drv-in slim" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="new Form title (e.g. Candidate intake)" />
        <button className="drv-btn accent" onClick={create} disabled={!title.trim()}>+ Create Form</button>
        <button className="drv-btn" onClick={refresh}>⟳</button>
        {busy && <span className="drv-busy inline">{busy}</span>}
      </div>
      {note && <div className="drv-backup-bar">✗ {note}</div>}
      <div className="drv-note">ℹ Linking responses to a Sheet is API-impossible — open the form → Responses → “Link to Sheets”. Responses are readable here regardless.</div>
      <div className="drv-body">
        <div className="drv-list">
          {forms.length === 0 && !busy && <div className="drv-empty">no Forms yet</div>}
          {forms.map((f) => (
            <button key={f.id} className="drv-row" onClick={() => responses(f)}>
              <span className="drv-ic">📋</span><span className="drv-name">{f.name}</span>
              <span className="drv-open" onClick={(e) => { e.stopPropagation(); window.dai.shell.open(`https://docs.google.com/forms/d/${f.id}/edit`); }}>↗</span>
            </button>
          ))}
        </div>
        {resp && (
          <aside className="drv-reader">
            <div className="drv-reader-head">{resp.rows.length} responses<button className="drv-x" onClick={() => setResp(null)}>✕</button></div>
            <div className="drv-reader-body">
              {resp.rows.length === 0 ? "no responses yet" : resp.rows.map((r) => (
                <div key={r.responseId} className="drv-resp">
                  <div className="drv-resp-t">{r.submittedAt}</div>
                  {Object.entries(r.answers).map(([q, a]) => <div key={q} className="drv-resp-a">{a}</div>)}
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>
    </>
  );
}

// ---------- Mail (Gmail) ----------
function MailTab() {
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
                    📎 {a.filename} <span className="drv-att-save">→ Drive</span>
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
function ProtonTab() {
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
function CandidatesTab({ signedIn }: { signedIn: boolean }) {
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
            <span className="drv-ic">👤</span><span className="drv-name">{c.name}</span>
            <span className="drv-size">{c.googleDriveId ? "drive" : "local"}</span>
          </button>
        ))}
      </div>
      {sel && (
        <aside className="drv-reader">
          <div className="drv-reader-head">👤 {sel.name}
            {sel.googleDriveId && <button className="drv-open" onClick={() => window.dai.shell.open(`https://drive.google.com/drive/folders/${sel.googleDriveId}`)}>↗ folder</button>}
            <button className="drv-x" onClick={() => setSel(null)}>✕</button>
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
            <div className="drv-note" style={{ marginTop: 10 }}>Every item here is a node in 🧠 Neuromap, linked to this candidate.</div>
          </div>
        </aside>
      )}
    </div>
  );
}

// ---------- Activity ----------
function ActivityTab() {
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
