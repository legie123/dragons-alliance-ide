// Settings sections — categorized, honest. Appearance is renderer-local
// (localStorage, per-window); IDE Config persists via window.dai.settings
// (DaiSettings — backend type untouched); everything else is read-only truth
// or a real action. No fake settings are ever saved.
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { DaiSettings, VaultSyncResult } from "@shared/ipc";
import { useAppearance, setAppearance, type Appearance } from "../../hooks/useAppearance";
import { useOps } from "../../hooks/useOps";
import { KEYMAP } from "../../keymap";
import { ShortcutList } from "../ShortcutList";
import { SUPERPOWERS, operationalTruth, admin, vault, goto } from "../../registry";
import { queryClient } from "../../queryClient";
import { OpStatusBadge } from "../da";

export { TeamSection } from "./TeamSection";

// Categories for the single Settings surface. `cap` (an adm:* capability id)
// gates an admin category — the nav hides it when the current member lacks the
// grant. Non-admin categories have no cap. The Team category is intentionally
// always visible: a non-owner sees their own resolved access there, read-only.
export type SettingsCat =
  | "appearance" | "ide" | "team" | "teamsync" | "superpowers"
  | "integrations" | "shortcuts" | "audit" | "apihealth" | "developer";
export const SETTINGS_CATS: { id: SettingsCat; label: string; cap?: string }[] = [
  { id: "appearance", label: "Appearance" },
  { id: "ide", label: "IDE Config" },
  { id: "team", label: "Team" },
  { id: "teamsync", label: "Team Sync", cap: "adm:teamsync" },
  { id: "superpowers", label: "Superpowers" },
  { id: "integrations", label: "Integrations" },
  { id: "shortcuts", label: "Shortcuts" },
  { id: "audit", label: "Audit", cap: "adm:audit" },
  { id: "apihealth", label: "API Health", cap: "adm:apihealth" },
  { id: "developer", label: "Developer", cap: "adm:developer" },
];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="set-row"><span className="set-label">{label}</span>{children}</label>;
}

export function AppearanceSection() {
  const a = useAppearance();
  const sel = <K extends keyof Appearance>(k: K, opts: [Appearance[K], string][]) => (
    <select className="vault-in slim" value={a[k]} onChange={(e) => setAppearance({ [k]: e.target.value } as Partial<Appearance>)}>
      {opts.map(([v, l]) => <option key={String(v)} value={String(v)}>{l}</option>)}
    </select>
  );
  return (
    <section className="vault-card">
      <div className="vault-card-h">Appearance <span className="vault-badge mid">local to this window</span></div>
      <div className="vault-steps">Presentation preferences — stored in this window's localStorage, applied instantly. Not part of the backend config.</div>
      <div className="admin-grid">
        <Row label="Motion">{sel("motion", [["full", "full"], ["reduced", "reduced"]])}</Row>
        <Row label="Density">{sel("density", [["comfortable", "comfortable"], ["compact", "compact"]])}</Row>
        <Row label="Glow effects">{sel("glow", [["on", "on"], ["off", "off"]])}</Row>
        <Row label="Guide language">{sel("lang", [["en", "English"], ["ro", "Română"]])}</Row>
      </div>
    </section>
  );
}

export function IdeConfigSection() {
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

export function SuperpowersSection() {
  const { statuses, checking, liveCount, total } = useOps();
  return (
    <section className="vault-card">
      <div className="vault-card-h">Superpowers <span className="vault-badge on">{checking ? "checking…" : `${liveCount}/${total} live`}</span></div>
      <div className="vault-steps">
        Probe refresh: <b>3s — fixed</b> (tools) · 5s (sessions) · 6s (google). Statuses come from real probes only.
      </div>
      {SUPERPOWERS.map((sp) => (
        <div key={sp.id} className="audit-row">
          <span className="audit-detail" style={{ flex: "0 0 140px" }}><b>{sp.label}</b></span>
          <OpStatusBadge status={statuses[sp.id] ?? "unknown"} checking={checking} size="sm" />
          <span className="audit-detail">{sp.role}</span>
        </div>
      ))}
      <div className="vault-row">
        <button className="drv-btn accent" onClick={() => queryClient.invalidateQueries({ queryKey: ["tools"] })}>Check now</button>
      </div>
    </section>
  );
}

export function IntegrationsSection() {
  const { env, google } = useOps();
  const probe = (id: string) => env.tool(id) ?? "no data";
  const rows: [string, string, () => void, string][] = [
    ["Google APIs", google.signedIn ? "signed in" : google.configured ? "configured — sign in" : "setup required", vault, "Open Keys"],
    ["Obsidian vault", probe("obsidian"), admin("team"), "Team Sync"],
    ["Graphify digest", probe("graphify"), goto("neuromap"), "Open Neuromap"],
    ["Ruflo orchestrator", probe("ruflo"), goto("agents"), "Open Agents"],
    ["GODMODE lab", probe("godmode"), () => window.dispatchEvent(new CustomEvent("dai:godmode")), "Open GODMODE"],
  ];
  return (
    <section className="vault-card">
      <div className="vault-card-h">Integrations <span className="vault-badge mid">read-only truth</span></div>
      <div className="vault-steps">Backend probe values, verbatim. Configure via the linked panels — nothing is edited here directly.</div>
      {rows.map(([name, state, run, label]) => (
        <div key={name} className="audit-row">
          <span className="audit-detail" style={{ flex: "0 0 160px" }}><b>{name}</b></span>
          <span className="audit-detail">{state}</span>
          <button className="drv-btn ghost" onClick={run}>{label}</button>
        </div>
      ))}
    </section>
  );
}

export function ShortcutsSection() {
  return (
    <section className="vault-card">
      <div className="vault-card-h">Keyboard shortcuts <span className="vault-badge mid">fixed bindings</span></div>
      <div className="vault-steps">One keymap drives the app handler, the rail hints and the guide. Rebinding lands in a future pass.</div>
      <ShortcutList items={KEYMAP} />
    </section>
  );
}

export function DeveloperSection() {
  const [copied, setCopied] = useState(false);
  const truth = operationalTruth();
  const copyDoctor = () => {
    navigator.clipboard.writeText("node scripts/superpowers-doctor.mjs --verbose").catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  };
  return (
    <section className="vault-card">
      <div className="vault-card-h">Developer <span className="vault-badge on">{truth.real} real · {truth.pending} pending actions</span></div>
      <div className="vault-steps">
        Verification gate: <code>npm run build</code> (main + preload + renderer, tsc-strict).
        Doctor validates the superpowers registry, IPC paths and external probes.
      </div>
      <div className="vault-row">
        <button className="drv-btn accent" onClick={copyDoctor}>{copied ? "Copied ✓" : "Copy doctor command"}</button>
        <button className="drv-btn ghost" onClick={admin("audit")}>Open Audit</button>
        <button className="drv-btn ghost" onClick={() => queryClient.invalidateQueries()}>Invalidate all caches</button>
      </div>
      <div className="vault-steps">Logs: audit JSONL at <code>~/.config/dai/audit.jsonl</code> · settings at <code>~/.config/dai/settings.json</code>.</div>
    </section>
  );
}

// ---- Audit (lifted from the old AdminPanel tab) ----
export function AuditSection() {
  const { data: events = [] } = useQuery({ queryKey: ["audit"], queryFn: () => window.dai.audit.list(200), refetchInterval: 5000 });
  return (
    <section className="vault-card">
      <div className="vault-card-h">Action trail <span className="vault-badge on">{events.length} events</span></div>
      <div className="vault-steps">Append-only JSONL at <code>~/.config/dai/audit.jsonl</code> — terminal launches, credential changes, drive writes, vault syncs, settings and team-permission edits.</div>
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

// ---- Team Sync — vault git engine (lifted from the old AdminPanel tab) ----
export function TeamSyncSection() {
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
      <div className="vault-steps">This is how a saved Team roster reaches teammates: it commits and pushes the vault (including <code>_team/team.json</code>) over the existing git channel.</div>
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

// ---- API Health (lifted from the old AdminPanel tab) ----
export function ApiHealthSection() {
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
