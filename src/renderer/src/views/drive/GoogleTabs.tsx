// Drive — Google-backed tabs: Config, Folders, Sheets, Forms.
// Extracted from DriveView.tsx (mechanical split, <500-line rule). Logic intact.
import { useEffect, useState } from "react";
import { IcFolder, IcFile, IcImage, IcSheet, IcZap, IcX, IcExternal, IcLock, IcRefresh } from "../../components/icons";
import type { GDriveFile, GSheetData } from "../../api";

const CONSOLE = "https://console.cloud.google.com/apis/credentials";
const API_LINKS = [
  { name: "Drive API", url: "https://console.cloud.google.com/apis/library/drive.googleapis.com" },
  { name: "Sheets API", url: "https://console.cloud.google.com/apis/library/sheets.googleapis.com" },
  { name: "Forms API", url: "https://console.cloud.google.com/apis/library/forms.googleapis.com" },
  { name: "Gmail API", url: "https://console.cloud.google.com/apis/library/gmail.googleapis.com" },
];

// ---------- Config ----------
export function ConfigTab({ status, refresh }: { status: any; refresh: () => void }) {
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
        <li>Open <button className="drv-link" onClick={() => window.dai.shell.open(CONSOLE)}>Credentials <IcExternal size={10} /></button> → create an <b>OAuth client ID</b> (type <b>Desktop app</b>).</li>
        <li>Enable the APIs: {API_LINKS.map((a, i) => (
          <span key={a.name}>{i > 0 && " · "}<button className="drv-link" onClick={() => window.dai.shell.open(a.url)}>{a.name} <IcExternal size={10} /></button></span>
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
          ? <button className="drv-btn accent" onClick={signIn}>{status?.signedIn ? "Re-connect (grant new scopes)" : "Sign in with Google"}</button>
          : <span className="drv-note">save credentials first</span>}
        {status?.signedIn && <button className="drv-btn ghost" onClick={() => window.dai.gdrive.signout().then(refresh)}>Sign out</button>}
        {status?.configured && <button className="drv-btn ghost" onClick={() => window.dai.gdrive.setClient("", "").then(refresh)}>Reset credentials</button>}
      </div>
      <div className="drv-note"><IcLock size={10} /> OAuth + tokens live only in the app's main process (<code>~/.config/dai/google.json</code>, 0600). Status: {status?.signedIn ? "connected" : status?.configured ? "configured, signed out" : "needs config"}.</div>
      {busy && <div className="drv-busy">{busy}</div>}
    </div>
  );
}

// ---------- Folders (browser + structure + upload) ----------
export function FoldersTab() {
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
        <button className="drv-btn" onClick={doUpload} disabled={!upPath.trim()}>Upload</button>
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
            <div className="drv-reader-head">{open.name}{open.truncated ? " · truncated" : ""}<button className="drv-x" onClick={() => setOpen(null)} aria-label="Close reader"><IcX size={10} /></button></div>
            <pre className="drv-reader-body">{open.text || "(empty / binary)"}</pre>
          </aside>
        )}
      </div>
    </>
  );
}

// ---------- Sheets ----------
export function SheetsTab() {
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
        <button className="drv-btn" onClick={refresh} aria-label="Refresh sheets"><IcRefresh size={11} /></button>
        {busy && <span className="drv-busy inline">{busy}</span>}
      </div>
      <div className="drv-body">
        <div className="drv-list">
          {sheets.length === 0 && !busy && <div className="drv-empty">no Sheets yet — create one, or upload an Excel with convert→Sheets in Folders</div>}
          {sheets.map((f) => (
            <button key={f.id} className="drv-row" onClick={() => preview(f)}>
              <span className="drv-ic"><IcSheet /></span><span className="drv-name">{f.name}</span>
              <span className="drv-open" role="button" aria-label={`Open ${f.name} in browser`} onClick={(e) => { e.stopPropagation(); window.dai.shell.open(`https://docs.google.com/spreadsheets/d/${f.id}`); }}><IcExternal size={10} /></span>
            </button>
          ))}
        </div>
        {data && (
          <aside className="drv-reader">
            <div className="drv-reader-head">{data.range}{data.error ? " · " + data.error : ""}<button className="drv-x" onClick={() => setData(null)} aria-label="Close preview"><IcX size={10} /></button></div>
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
export function FormsTab() {
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
        <button className="drv-btn" onClick={refresh} aria-label="Refresh forms"><IcRefresh size={11} /></button>
        {busy && <span className="drv-busy inline">{busy}</span>}
      </div>
      {note && <div className="drv-backup-bar">✗ {note}</div>}
      <div className="drv-note">Linking responses to a Sheet is API-impossible — open the form → Responses → “Link to Sheets”. Responses are readable here regardless.</div>
      <div className="drv-body">
        <div className="drv-list">
          {forms.length === 0 && !busy && <div className="drv-empty">no Forms yet</div>}
          {forms.map((f) => (
            <button key={f.id} className="drv-row" onClick={() => responses(f)}>
              <span className="drv-ic"><IcFile /></span><span className="drv-name">{f.name}</span>
              <span className="drv-open" role="button" aria-label={`Open ${f.name} in browser`} onClick={(e) => { e.stopPropagation(); window.dai.shell.open(`https://docs.google.com/forms/d/${f.id}/edit`); }}><IcExternal size={10} /></span>
            </button>
          ))}
        </div>
        {resp && (
          <aside className="drv-reader">
            <div className="drv-reader-head">{resp.rows.length} responses<button className="drv-x" onClick={() => setResp(null)} aria-label="Close responses"><IcX size={10} /></button></div>
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
