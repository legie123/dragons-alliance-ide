// Superpower operational panel — ONE GODMODE-style template for every superpower
// (GODMODE keeps its own bespoke panel). Opened via the `dai:superpower` event
// with the superpower id. Everything is honest: live status from useOps, deep
// diagnostics from the REAL probes (superpowers.health / vaultSync.status /
// google.health / sessions.list), logs from the real audit trail, and quick
// actions from the registry (each either runs a real handler or is disabled with
// a reason). No fake LIVE, no dead click.
import { useEffect, useState } from "react";
import { SUPERPOWERS, goto, openLibraryGuide, type SuperpowerDef } from "../registry";
import { useOps } from "../hooks/useOps";
import { useMe } from "../hooks/useMe";
import { OpStatusBadge } from "./da";
import { IcLock } from "./icons";
import type { AuditEvent } from "@shared/ipc";

const byId = (id: string): SuperpowerDef | undefined => SUPERPOWERS.find((s) => s.id === id);

type DiagState = { loading: boolean; ok?: boolean; lines: string[]; ts?: number } | null;

export function SuperpowerPanel({ id, onClose }: { id: string | null; onClose: () => void }) {
  const sp = id ? byId(id) : undefined;
  const { env, statuses, checking, lastChecked } = useOps();
  const { can } = useMe();
  const [diag, setDiag] = useState<DiagState>(null);
  const [logs, setLogs] = useState<AuditEvent[] | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);

  // reset transient state whenever the panel target changes
  useEffect(() => { setDiag(null); setLogs(null); }, [id]);

  // Escape to close (only while open)
  useEffect(() => {
    if (!sp) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [sp, onClose]);

  if (!sp) return null;

  const allowed = can("sp:" + sp.id);
  const st = statuses[sp.id] ?? sp.statusOf(env);
  const nav = (v: string) => () => { goto(v)(); onClose(); };
  const runAction = (fn?: () => void) => () => { fn?.(); onClose(); };

  async function runDiag() {
    if (!sp) return;
    setDiag({ loading: true, lines: [] });
    try {
      if (sp.healthId) {
        const h = await window.dai.superpowers.health(sp.healthId);
        const lines = [h.message, ...h.details];
        if (sp.healthId === "ruflo") {
          // Queue depth from the REAL `ruflo task list` — honest message either way
          const q = await window.dai.superpowers.rufloQueue();
          lines.push(`task queue: ${q.message}`);
        }
        setDiag({ loading: false, ok: h.ok, lines, ts: h.lastCheckedAt });
      } else if (sp.diag === "vault") {
        const v = await window.dai.vaultSync.status();
        const lines = v.isRepo
          ? [
              `branch ${v.branch ?? "?"}${v.dirty ? ` · ${v.dirty} uncommitted` : " · clean"}`,
              v.remote ? `remote ${v.remote} · ahead ${v.ahead} / behind ${v.behind}` : "no remote configured — local snapshots only",
              v.lastCommit ? `last commit ${v.lastCommit}` : "no commits yet",
            ]
          : ["vault is not a git repository"];
        setDiag({ loading: false, ok: v.isRepo, lines });
      } else if (sp.diag === "google") {
        const h = await window.dai.google.health();
        const lines = Array.isArray(h) && h.length
          ? h.map((s: any) => `${s.service ?? s.name ?? "service"}: ${s.ok ? "ok" : (s.status ?? s.error ?? "unavailable")}`)
          : ["not signed in — add a Google OAuth client in Keys, then Sign In"];
        setDiag({ loading: false, ok: Array.isArray(h) && h.every((s: any) => s.ok), lines });
      } else if (sp.diag === "agents") {
        const s = await window.dai.sessions.list(240);
        setDiag({ loading: false, ok: s.live > 0, lines: [`${s.live} live · ${s.sessions.length} sessions tracked`, s.live > 0 ? "runtime active" : "runtime ready — 0 active"] });
      } else {
        setDiag({ loading: false, ok: st === "live", lines: [`status: ${st}`, "no deeper probe for this superpower"] });
      }
    } catch (e) {
      setDiag({ loading: false, ok: false, lines: [`diagnostics failed: ${String(e)}`] });
    }
  }

  async function loadLogs() {
    if (!sp) return;
    setLogsLoading(true);
    try {
      const all = await window.dai.audit.list(120);
      const hit = all.filter((e) => sp.logKinds.some((k) => e.kind.toLowerCase().includes(k)));
      setLogs(hit.slice(0, 12));
    } catch { setLogs([]); }
    setLogsLoading(false);
  }

  const last = logs && logs[0];

  return (
    <div className="cmdk-backdrop" onClick={onClose}>
      <div className="spx" role="dialog" aria-label={`${sp.label} control panel`}
        style={{ ["--spx-tone" as any]: sp.tone, ["--spx-tone2" as any]: sp.tone2 }}
        onClick={(e) => e.stopPropagation()}>
        <div className="spx-head">
          <span className="spx-emblem">{sp.icon({ size: 26 })}</span>
          <div className="spx-title-wrap">
            <div className="spx-title">{sp.label}</div>
            <div className="spx-sub">{sp.role}</div>
          </div>
          <span className="spx-status">
            <OpStatusBadge status={st} checking={checking} size="sm" />
            <em className="spx-checked">{lastChecked ? "checked " + new Date(lastChecked).toLocaleTimeString() : "—"}</em>
          </span>
          <button className="spx-x" onClick={onClose} title="close (esc)">esc</button>
        </div>

        {!allowed ? (
          <div className="spx-denied"><IcLock size={22} /><p>Not granted to you by an owner. Ask an owner for the <code>sp:{sp.id}</code> capability.</p></div>
        ) : (
          <>
            <div className="spx-body">
              <div className="spx-sec">what it is</div>
              <p className="spx-p">{sp.what}</p>
              <div className="spx-sec">what it powers</div>
              <p className="spx-p">{sp.feeds}</p>

              <div className="spx-sec">connected to</div>
              <div className="spx-chips">
                {sp.connected.map((c) => <span key={c} className="spx-chip">{c}</span>)}
              </div>

              <div className="spx-sec">diagnostics</div>
              <div className="spx-diag">
                <button className="da-btn ghost sm" onClick={runDiag} disabled={diag?.loading}>
                  {diag?.loading ? "probing…" : sp.healthId ? "Run health check" : "Run diagnostics"}
                </button>
                {diag && !diag.loading && (
                  <div className={`spx-diag-out ${diag.ok ? "ok" : "warn"}`}>
                    {diag.lines.map((l, i) => <div key={i}>{l}</div>)}
                  </div>
                )}
              </div>

              <div className="spx-sec">logs</div>
              <div className="spx-logs">
                <button className="da-btn ghost sm" onClick={loadLogs} disabled={logsLoading}>
                  {logsLoading ? "loading…" : "Load recent logs"}
                </button>
                {logs && (logs.length ? (
                  <div className="spx-log-list">
                    {logs.map((e, i) => (
                      <div key={i} className="spx-log-row">
                        <span className="spx-log-kind">{e.kind}</span>
                        <span className="spx-log-detail">{e.detail}</span>
                        <span className="spx-log-ts">{new Date(e.ts).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                ) : <div className="spx-diag-out">no recent events for this superpower</div>)}
              </div>
            </div>

            <div className="spx-actions">
              {sp.actions.map((a, i) =>
                a.run ? (
                  <button key={a.id} className={`da-btn ${i === 0 ? "gold" : "ghost"} sm${a.danger ? " danger" : ""}`}
                    onClick={runAction(a.run)}>{a.label}</button>
                ) : (
                  <button key={a.id} className="da-btn ghost sm" disabled title={a.disabledReason}>{a.label}</button>
                ),
              )}
              {sp.sector && <button className="da-btn ghost sm" onClick={nav(sp.sector)}>Open sector</button>}
              <button className="da-btn ghost sm" title="Cloud & Superpowers Quick Guide — how to operate this power"
                onClick={() => { openLibraryGuide(); onClose(); }}>Guide</button>
            </div>

            <div className="spx-foot">
              <span>source · {sp.source}</span>
              {sp.risk && <span className="spx-risk">risk · {sp.risk}</span>}
              {last && <span>last · {last.kind} {new Date(last.ts).toLocaleTimeString()}</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
