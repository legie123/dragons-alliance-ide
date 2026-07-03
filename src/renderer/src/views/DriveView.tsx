// Drive — direct Google Drive API: browse / search / read files + one-tap vault
// backup. HONEST: OAuth + tokens live entirely in the main process; this view only
// sees typed results. The user creates their own Desktop OAuth client in Google
// Cloud and pastes id/secret into the local (0600) config — Claude never handles it.
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchGDriveStatus } from "../api";
import type { GDriveFile } from "../api";

const CONSOLE = "https://console.cloud.google.com/apis/credentials";

function fmtTime(ts?: number | null) {
  if (!ts) return "never";
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
}

export function DriveView() {
  const qc = useQueryClient();
  const { data: status } = useQuery({ queryKey: ["gdrive"], queryFn: fetchGDriveStatus, refetchInterval: 4000 });
  const [clientId, setClientId] = useState("");
  const [secret, setSecret] = useState("");
  const [files, setFiles] = useState<GDriveFile[]>([]);
  const [trail, setTrail] = useState<{ id: string; name: string }[]>([{ id: "root", name: "My Drive" }]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");
  const [open, setOpen] = useState<{ name: string; text: string; truncated: boolean } | null>(null);
  const [backup, setBackup] = useState<string>("");

  const refreshStatus = () => qc.invalidateQueries({ queryKey: ["gdrive"] });

  async function saveClient() {
    if (!clientId.trim() || !secret.trim()) return;
    setBusy("saving…");
    await window.dai.gdrive.setClient(clientId.trim(), secret.trim());
    setSecret(""); // don't keep the secret in component state
    setBusy(""); refreshStatus();
  }
  async function signIn() {
    setBusy("opening Google consent in your browser…");
    await window.dai.gdrive.auth();
    setBusy(""); refreshStatus();
    loadFolder("root", "My Drive", true);
  }
  async function signOut() { await window.dai.gdrive.signout(); setFiles([]); refreshStatus(); }

  async function loadFolder(id: string, name: string, reset = false) {
    setBusy("loading…"); setOpen(null);
    const list = await window.dai.gdrive.list(id === "root" ? undefined : id);
    setFiles(list);
    setTrail((t) => reset ? [{ id: "root", name: "My Drive" }] : [...t, { id, name }]);
    setBusy("");
  }
  async function crumb(i: number) {
    const target = trail[i];
    setTrail(trail.slice(0, i + 1));
    setBusy("loading…"); setOpen(null);
    setFiles(await window.dai.gdrive.list(target.id === "root" ? undefined : target.id));
    setBusy("");
  }
  async function runSearch() {
    if (!query.trim()) return;
    setBusy("searching…"); setOpen(null);
    setFiles(await window.dai.gdrive.search(query.trim()));
    setTrail([{ id: "root", name: `search: ${query.trim()}` }]);
    setBusy("");
  }
  async function openFile(f: GDriveFile) {
    if (f.isFolder) return loadFolder(f.id, f.name);
    setBusy("reading…");
    const r = await window.dai.gdrive.read(f.id);
    setOpen({ name: r.name || f.name, text: r.text, truncated: r.truncated });
    setBusy("");
  }
  async function runBackup() {
    setBackup("backing up vault → Drive…");
    const r = await window.dai.gdrive.backup();
    setBackup(r.ok ? "✓ vault backed up to Drive" : "✗ " + (r.error || "backup failed"));
    refreshStatus();
    setTimeout(() => setBackup(""), 6000);
  }

  // ---- not configured: client setup ----
  if (!status?.configured) {
    return (
      <div className="drv-view">
        <div className="drv-bar"><span className="drv-title">☁️ GOOGLE DRIVE</span><span className="drv-status needs">● needs setup</span></div>
        <div className="drv-setup">
          <h3>Connect your own Google Drive</h3>
          <ol className="drv-steps">
            <li>Open <button className="drv-link" onClick={() => window.dai.shell.open(CONSOLE)}>Google Cloud Console → Credentials ↗</button></li>
            <li>Create an <b>OAuth client ID</b> → application type <b>Desktop app</b>.</li>
            <li>Enable the <b>Google Drive API</b> for the project.</li>
            <li>Paste the client ID + secret below. Stored locally (0600), never sent anywhere but Google.</li>
          </ol>
          <div className="drv-form">
            <input className="drv-in" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="Client ID (…apps.googleusercontent.com)" spellCheck={false} />
            <input className="drv-in" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Client secret" spellCheck={false} />
            <button className="drv-btn accent" onClick={saveClient} disabled={!clientId.trim() || !secret.trim()}>Save credentials</button>
          </div>
          <div className="drv-note">🔒 The secret goes straight to a local <code>~/.config/dai/google.json</code> (chmod 600). OAuth runs entirely in the app's main process — the UI never sees a token.</div>
          {busy && <div className="drv-busy">{busy}</div>}
        </div>
      </div>
    );
  }

  // ---- configured but signed out ----
  if (!status.signedIn) {
    return (
      <div className="drv-view">
        <div className="drv-bar"><span className="drv-title">☁️ GOOGLE DRIVE</span><span className="drv-status ready">● configured</span></div>
        <div className="drv-setup">
          <h3>Sign in to Google Drive</h3>
          <p className="drv-note">Credentials saved. Click below — a Google consent page opens in your browser. After you approve, come back here.</p>
          <button className="drv-btn accent" onClick={signIn}>Sign in with Google ↗</button>
          <button className="drv-btn ghost" onClick={() => window.dai.gdrive.setClient("", "").then(refreshStatus)}>Reset credentials</button>
          {busy && <div className="drv-busy">{busy}</div>}
        </div>
      </div>
    );
  }

  // ---- signed in: browse / search / read / backup ----
  return (
    <div className="drv-view">
      <div className="drv-bar">
        <span className="drv-title">☁️ GOOGLE DRIVE</span>
        <span className="drv-status live">● {status.email || "signed in"}</span>
        <input className="drv-search" value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch()} placeholder="search Drive…" spellCheck={false} />
        <button className="drv-btn" onClick={runSearch}>Search</button>
        <span className="drv-spacer" />
        <button className="drv-btn accent" onClick={runBackup} title="tar the vault → upload to Drive backup folder">⬆ Backup vault</button>
        <button className="drv-btn ghost" onClick={signOut}>Sign out</button>
      </div>
      {backup && <div className="drv-backup-bar">{backup} · last: {fmtTime(status.lastBackup)}</div>}

      <div className="drv-crumbs">
        {trail.map((c, i) => (
          <span key={c.id + i}>
            {i > 0 && <span className="drv-sep">/</span>}
            <button className="drv-crumb" onClick={() => crumb(i)}>{c.name}</button>
          </span>
        ))}
        {busy && <span className="drv-busy inline">{busy}</span>}
      </div>

      <div className="drv-body">
        <div className="drv-list">
          {files.length === 0 && !busy && <div className="drv-empty">empty folder</div>}
          {files.map((f) => (
            <button key={f.id} className={`drv-row${f.isFolder ? " folder" : ""}`} onClick={() => openFile(f)}>
              <span className="drv-ic">{f.isFolder ? "📁" : f.mimeType.includes("image") ? "🖼" : f.mimeType.includes("pdf") ? "📕" : "📄"}</span>
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
    </div>
  );
}
