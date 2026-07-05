// Admin Panel — the backend that was pending, now real. Five tabs, all live IPC:
// Settings (persisted config), Audit (append-only trail), Permissions (local
// team/role model), Team Sync (git engine over the vault), API Health (per-
// service Google probes). Opens via the `dai:admin` event with detail = tab id.
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { DaiSettings, PermissionsState, PermRole, VaultSyncResult } from "@shared/ipc";
import { IcSigil } from "./icons";

export type AdminTab = "settings" | "audit" | "perms" | "team" | "health";
const TABS: { id: AdminTab; label: string }[] = [
  { id: "settings", label: "Settings" },
  { id: "audit", label: "Audit" },
  { id: "perms", label: "Permissions" },
  { id: "team", label: "Team Sync" },
  { id: "health", label: "API Health" },
];
const ROLES: PermRole[] = ["owner", "editor", "viewer"];

export function AdminPanel({ open, tab, onClose, onTab }: {
  open: boolean; tab: AdminTab; onClose: () => void; onTab: (t: AdminTab) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); onClose(); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="cmdk-backdrop" onClick={onClose}>
      <div className="vault admin" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Admin panel">
        <div className="vault-head">
          <span className="vault-glyph"><IcSigil size={22} /></span>
          <div>
            <h2>Admin</h2>
            <div className="vault-sub">settings · audit · permissions · team sync · API health — all local, all real</div>
          </div>
          <button className="phone-x" onClick={onClose} title="Close (esc)">esc</button>
        </div>
        <div className="admin-tabs">
          {TABS.map((t) => (
            <button key={t.id} className={"admin-tab" + (tab === t.id ? " active" : "")} onClick={() => onTab(t.id)}>{t.label}</button>
          ))}
        </div>
        <div className="vault-body">
          {tab === "settings" && <SettingsTab />}
          {tab === "audit" && <AuditTab />}
          {tab === "perms" && <PermsTab />}
          {tab === "team" && <TeamTab />}
          {tab === "health" && <HealthTab />}
        </div>
      </div>
    </div>
  );
}

// ---- Settings ----
function SettingsTab() {
  const qc = useQueryClient();
  const { data: s } = useQuery({ queryKey: ["settings"], queryFn: () => window.dai.settings.get() });
  const [draft, setDraft] = useState<DaiSettings | null>(null);
  const v = draft ?? s;
  if (!v) return <div className="empty">loading…</div>;
  const num = (k: keyof DaiSettings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft({ ...v, [k]: Number(e.target.value) });
  const save = async () => {
    await window.dai.settings.set(v);
    setDraft(null);
    qc.invalidateQueries({ queryKey: ["settings"] });
  };
  return (
    <section className="vault-card">
      <div className="vault-card-h">IDE configuration <span className="vault-badge on">persisted · 0600</span></div>
      <div className="admin-grid">
        <label>Terminal font size (px)<input className="vault-in slim" type="number" min={9} max={24} value={v.terminalFontSize} onChange={num("terminalFontSize")} /></label>
        <label>Sessions active window (min)<input className="vault-in slim" type="number" min={15} max={1440} value={v.sessionsActiveMin} onChange={num("sessionsActiveMin")} /></label>
        <label>Audit retention (days)<input className="vault-in slim" type="number" min={1} max={365} value={v.auditRetentionDays} onChange={num("auditRetentionDays")} /></label>
        <label>Vault auto-sync (min, 0 = manual)<input className="vault-in slim" type="number" min={0} max={1440} value={v.vaultAutoSyncMin} onChange={num("vaultAutoSyncMin")} /></label>
        <label>Default terminal cwd<input className="vault-in" value={v.defaultCwd} onChange={(e) => setDraft({ ...v, defaultCwd: e.target.value })} /></label>
        <label className="admin-check"><input type="checkbox" checked={v.radarAutoRefresh} onChange={(e) => setDraft({ ...v, radarAutoRefresh: e.target.checked })} /> Radar auto-refresh on open</label>
      </div>
      <div className="vault-row">
        <button className="drv-btn accent" onClick={save} disabled={!draft}>Save settings</button>
        {draft && <button className="drv-btn ghost" onClick={() => setDraft(null)}>Discard</button>}
      </div>
      <div className="vault-steps">Stored at <code>~/.config/dai/settings.json</code>. Values apply live on next view refresh.</div>
    </section>
  );
}

// ---- Audit ----
function AuditTab() {
  const { data: events = [] } = useQuery({ queryKey: ["audit"], queryFn: () => window.dai.audit.list(200), refetchInterval: 5000 });
  return (
    <section className="vault-card">
      <div className="vault-card-h">Action trail <span className="vault-badge on">{events.length} events</span></div>
      <div className="vault-steps">Append-only JSONL at <code>~/.config/dai/audit.jsonl</code> — terminal launches, credential changes, drive writes, vault syncs, settings edits.</div>
      <div className="audit-list">
        {events.length === 0 && <div className="empty">no events yet — actions will appear here as you work</div>}
        {events.map((e, i) => (
          <div key={e.ts + "-" + i} className="audit-row">
            <span className="audit-ts">{new Date(e.ts).toLocaleString()}</span>
            <span className="audit-kind">{e.kind}</span>
            <span className="audit-detail" title={e.detail}>{e.detail}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---- Permissions ----
function PermsTab() {
  const qc = useQueryClient();
  const { data: p } = useQuery({ queryKey: ["perms"], queryFn: () => window.dai.perms.get() });
  const [draft, setDraft] = useState<PermissionsState | null>(null);
  const [name, setName] = useState("");
  const v = draft ?? p;
  if (!v) return <div className="empty">loading…</div>;
  const save = async () => {
    await window.dai.perms.set(v);
    setDraft(null);
    qc.invalidateQueries({ queryKey: ["perms"] });
  };
  const addMember = () => {
    if (!name.trim()) return;
    setDraft({ ...v, members: [...v.members, { id: "op-" + Date.now().toString(36), name: name.trim(), role: "viewer" }] });
    setName("");
  };
  return (
    <section className="vault-card">
      <div className="vault-card-h">Team &amp; roles <span className="vault-badge on">{v.members.length} member(s) · local</span></div>
      <div className="vault-steps">Local role model, enforcement-ready. Owner keeps every capability — the last owner cannot be removed.</div>
      {v.members.map((m, i) => (
        <div key={m.id} className="vault-row admin-member">
          <span className="audit-detail">{m.name}</span>
          <select className="vault-in slim" value={m.role}
            onChange={(e) => {
              const members = v.members.slice();
              members[i] = { ...m, role: e.target.value as PermRole };
              setDraft({ ...v, members });
            }}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button className="drv-btn ghost" disabled={m.role === "owner" && v.members.filter((x) => x.role === "owner").length === 1}
            onClick={() => setDraft({ ...v, members: v.members.filter((x) => x.id !== m.id) })}>remove</button>
        </div>
      ))}
      <div className="vault-row">
        <input className="vault-in" value={name} onChange={(e) => setName(e.target.value)} placeholder="new member name" />
        <button className="drv-btn" onClick={addMember} disabled={!name.trim()}>Add</button>
      </div>
      <div className="vault-steps">
        Capabilities — editor: {(v.matrix.editor.join(", ") || "none")} · viewer: {(v.matrix.viewer.join(", ") || "none")} · owner: all
      </div>
      <div className="vault-row">
        <button className="drv-btn accent" onClick={save} disabled={!draft}>Save permissions</button>
        {draft && <button className="drv-btn ghost" onClick={() => setDraft(null)}>Discard</button>}
      </div>
    </section>
  );
}

// ---- Team Sync (vault git engine) ----
function TeamTab() {
  const qc = useQueryClient();
  const { data: st } = useQuery({ queryKey: ["vaultsync"], queryFn: () => window.dai.vaultSync.status(), refetchInterval: 8000 });
  const [remote, setRemote] = useState("");
  const [result, setResult] = useState<VaultSyncResult | null>(null);
  const [busy, setBusy] = useState(false);
  const sync = async () => {
    setBusy(true); setResult(null);
    const r = await window.dai.vaultSync.sync();
    setResult(r); setBusy(false);
    qc.invalidateQueries({ queryKey: ["vaultsync"] });
  };
  const saveRemote = async () => {
    await window.dai.vaultSync.setRemote(remote.trim());
    setRemote("");
    qc.invalidateQueries({ queryKey: ["vaultsync"] });
  };
  return (
    <section className="vault-card">
      <div className="vault-card-h">Obsidian vault sync
        <span className={"vault-badge " + (st?.remote ? "on" : st?.isRepo ? "mid" : "off")}>
          {st?.remote ? "shared (remote set)" : st?.isRepo ? "local snapshots" : "not a repo"}
        </span>
      </div>
      {st?.isRepo ? (
        <div className="vault-steps">
          branch <code>{st.branch ?? "?"}</code> · {st.dirty} changed file(s)
          {st.remote ? <> · ahead {st.ahead} / behind {st.behind}</> : " · no remote"}
          {st.lastCommit && <> · last: <code>{st.lastCommit}</code></>}
          {st.lastSyncTs && <> · synced {new Date(st.lastSyncTs).toLocaleString()}</>}
        </div>
      ) : (
        <div className="vault-steps">The vault at <code>~/Documents/Obsidian/Antigravity-Brain</code> is not a git repository.</div>
      )}
      <div className="vault-row">
        <button className="drv-btn accent" onClick={sync} disabled={busy || !st?.isRepo}>{busy ? "syncing…" : "Sync now"}</button>
      </div>
      {result && (
        <div className="vault-steps">{result.ok ? "✓ " + result.detail : "✗ " + (result.error ?? "failed") + (result.detail ? " · " + result.detail : "")}</div>
      )}
      <div className="vault-steps">Team mode needs a private remote. Paste an SSH/HTTPS git URL (e.g. a private GitHub repo) — push/pull engage automatically after.</div>
      <div className="vault-row">
        <input className="vault-in" value={remote} onChange={(e) => setRemote(e.target.value)} placeholder={st?.remote ?? "git@github.com:you/antigravity-brain.git"} spellCheck={false} />
        <button className="drv-btn" onClick={saveRemote} disabled={!remote.trim()}>Set remote</button>
      </div>
    </section>
  );
}

// ---- API Health ----
function HealthTab() {
  const { data: rows, isFetching, refetch } = useQuery({ queryKey: ["ghealth"], queryFn: () => window.dai.google.health() });
  return (
    <section className="vault-card">
      <div className="vault-card-h">Google per-service probes
        <button className="drv-btn ghost" onClick={() => refetch()} disabled={isFetching}>{isFetching ? "probing…" : "Re-probe"}</button>
      </div>
      <div className="vault-steps">Cheap authenticated calls against each API — proves the token and that the API is enabled, service by service.</div>
      {(rows ?? []).map((r) => (
        <div key={r.service} className="audit-row">
          <span className="audit-kind" style={{ color: r.ok ? "var(--teal)" : "var(--st-error)" }}>{r.ok ? "● ok" : "● fail"}</span>
          <span className="audit-detail"><b>{r.service}</b> — {r.detail}{r.status != null ? ` (HTTP ${r.status})` : ""}</span>
        </div>
      ))}
      {!rows && <div className="empty">probing…</div>}
    </section>
  );
}
