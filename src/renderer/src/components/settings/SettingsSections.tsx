// Settings sections — categorized, honest. Appearance is renderer-local
// (localStorage, per-window); IDE Config persists via window.dai.settings
// (DaiSettings — backend type untouched); everything else is read-only truth
// or a real action. No fake settings are ever saved.
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { DaiSettings } from "@shared/ipc";
import { useAppearance, setAppearance, type Appearance } from "../../hooks/useAppearance";
import { useOps } from "../../hooks/useOps";
import { KEYMAP } from "../../keymap";
import { SUPERPOWERS, operationalTruth, admin, vault, goto } from "../../registry";
import { queryClient } from "../../queryClient";
import { OpStatusBadge } from "../da";

export type SettingsCat = "appearance" | "ide" | "superpowers" | "integrations" | "shortcuts" | "developer";
export const SETTINGS_CATS: { id: SettingsCat; label: string }[] = [
  { id: "appearance", label: "Appearance" },
  { id: "ide", label: "IDE Config" },
  { id: "superpowers", label: "Superpowers" },
  { id: "integrations", label: "Integrations" },
  { id: "shortcuts", label: "Shortcuts" },
  { id: "developer", label: "Developer" },
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
      {KEYMAP.map((k) => (
        <div key={k.keys} className="audit-row">
          <span className="audit-kind" style={{ fontFamily: "ui-monospace, monospace" }}>{k.keys}</span>
          <span className="audit-detail">{k.label.en}</span>
          <span className="audit-ts">{k.scope}</span>
        </div>
      ))}
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
