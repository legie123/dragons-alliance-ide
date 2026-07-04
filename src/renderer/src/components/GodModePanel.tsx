// GODMODE — the supreme command center. Every figure on this panel is a REAL
// probe (sessions, terminals, tools, google config); every action either runs
// or states exactly why it can't. The Operational Truth section is computed
// from the registry — the system tells you what is wired vs. what is waiting.
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchTools, fetchSessions, fetchGDriveStatus, fetchTerms } from "../api";
import { SUPERPOWERS, MORE_CATEGORIES, STATUS_META, operationalTruth, type OpStatus } from "../registry";
import { IcCrown, IcUsers } from "./icons";

const goto = (v: string) => window.dispatchEvent(new CustomEvent("dai:goto", { detail: v }));
let SEQ = 1;

function Health({ label, status, detail }: { label: string; status: OpStatus; detail: string }) {
  const m = STATUS_META[status];
  return (
    <div className="gm-card">
      <div className="gm-card-label">{label}</div>
      <div className="gm-card-status" style={{ color: m.color }}>● {m.label}</div>
      <div className="gm-card-detail">{detail}</div>
    </div>
  );
}

export function GodModePanel({ open, onClose, onCommand }: { open: boolean; onClose: () => void; onCommand: () => void }) {
  const { data: sess } = useQuery({ queryKey: ["gm-sessions"], queryFn: () => fetchSessions(240), refetchInterval: 5000, enabled: open });
  const { data: terms = [] } = useQuery({ queryKey: ["gm-terms"], queryFn: fetchTerms, refetchInterval: 5000, enabled: open });
  const { data: tools = [] } = useQuery({ queryKey: ["tools"], queryFn: fetchTools, refetchInterval: 5000, enabled: open });
  const { data: google } = useQuery({ queryKey: ["gdrive"], queryFn: fetchGDriveStatus, enabled: open });
  const { data: audit = [] } = useQuery({ queryKey: ["audit"], queryFn: () => window.dai.audit.list(200), refetchInterval: 8000, enabled: open });
  const { data: perms } = useQuery({ queryKey: ["perms"], queryFn: () => window.dai.perms.get(), enabled: open });
  const [gmMsg, setGmMsg] = useState("");

  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open, onClose]);

  if (!open) return null;

  const live = sess?.live ?? 0;
  const total = sess?.sessions.length ?? 0;
  const top = sess?.sessions.slice().sort((a, b) => a.idle_min - b.idle_min)[0];
  const aliveTerms = terms.filter((t) => t.alive).length;
  const obsidian = tools.find((t) => t.id === "obsidian")?.status;
  const truth = operationalTruth();

  const stopAll = () => {
    const workers = terms.filter((t) => !t.is_master);
    if (workers.length === 0) return;
    if (!window.confirm(`EMERGENCY STOP — kill ${workers.length} worker terminal${workers.length === 1 ? "" : "s"}? The master survives.`)) return;
    for (const w of workers) window.dai.term.kill(w.id);
    onClose();
  };
  const launchAgent = () => { window.dai.term.create({ id: `gm${Date.now().toString(36)}${SEQ++}`, cmd: "claude", cwd: "~" }); goto("agents"); onClose(); };
  const act = (v: string) => () => { goto(v); onClose(); };
  const capture = async () => {
    setGmMsg("capturing…");
    const r = await window.dai.shot.capture();
    setGmMsg(r.ok ? "✓ saved " + (r.path ?? "") : "✗ " + (r.error ?? "capture failed"));
  };
  const syncVault = async () => {
    setGmMsg("syncing vault…");
    const r = await window.dai.vaultSync.sync();
    setGmMsg(r.ok ? "✓ " + r.detail : "✗ " + (r.error ?? "sync failed"));
  };

  return (
    <div className="cmdk-backdrop" onClick={onClose}>
      <div className="gm" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="GODMODE command center">
        <div className="gm-head">
          <span className="gm-crown"><IcCrown size={22} /></span>
          <div>
            <div className="gm-title">GODMODE</div>
            <div className="gm-sub">supreme command · operational truth</div>
          </div>
          <span className="gm-operator"><IcUsers size={12} /> Andrei · local operator</span>
          <span className="gm-team">{perms ? `${perms.members.length} member(s) · local roles` : "…"}</span>
          <button className="gm-x" onClick={onClose} title="close (esc)">esc</button>
        </div>

        <div className="gm-body">
          <div className="gm-sec">SYSTEM HEALTH</div>
          <div className="gm-grid">
            <Health label="Agents" status={live > 0 ? "live" : total > 0 ? "idle" : "offline"} detail={`${live} live · ${total} sessions`} />
            <Health label="Terminals" status={aliveTerms > 0 ? "live" : "idle"} detail={`${aliveTerms} alive`} />
            <Health label="Vault" status={obsidian === "live" ? "live" : obsidian === "ready" ? "local-only" : "setup-required"} detail="Antigravity-Brain" />
            <Health label="Google" status={google?.signedIn ? "live" : google?.configured ? "partial" : "setup-required"} detail={google?.email || "OAuth"} />
            <Health label="Audit" status="local-only" detail={`${audit.length} event(s)${audit[0] ? " · last: " + audit[0].kind : ""}`} />
          </div>

          <div className="gm-sec">ACTIVE MISSION</div>
          {top ? (
            <div className="gm-mission">
              <b>{top.title || "(untitled)"}</b>
              <span>{top.model} · {top.cwd} · {top.idle_min < 1 ? "now" : `${Math.floor(top.idle_min)}m idle`} · goal {top.goalPct}%</span>
            </div>
          ) : (
            <div className="gm-mission empty">no active mission — launch an agent below</div>
          )}

          <div className="gm-sec">QUICK ACTIONS</div>
          <div className="gm-actions">
            <button className="da-btn gold sm" onClick={() => { onCommand(); onClose(); }}>Global Command (⌘K)</button>
            <button className="da-btn ghost sm" onClick={act("ide")}>Open Terminal</button>
            <button className="da-btn ghost sm" onClick={launchAgent}>Launch Agent</button>
            <button className="da-btn ghost sm" onClick={act("preview")}>Open Preview</button>
            <button className="da-btn ghost sm" onClick={act("metrics")}>Open Metrics</button>
            <button className="da-btn ghost sm" onClick={capture}>Capture Screenshot</button>
            <button className="da-btn ghost sm" onClick={syncVault}>Sync Vault</button>
            <button className="da-btn danger sm" onClick={stopAll}>Emergency Stop</button>
          </div>
          {gmMsg && <div className="gm-mission">{gmMsg}</div>}

          <div className="gm-sec">OPERATIONAL TRUTH</div>
          <div className="gm-truth">
            <span className="gm-truth-real">● {truth.real} actions wired &amp; real</span>
            <span className="gm-truth-pending">◌ {truth.pending} honestly disabled (setup / pending backend)</span>
            <span className="gm-truth-note">every disabled control names its reason — the UI does not lie</span>
          </div>
          <div className="gm-pending">
            {SUPERPOWERS.flatMap((sp) => sp.actions.filter((a) => !a.run).map((a) => (
              <span key={sp.id + a.id} className="gm-pending-item">{sp.label}: {a.label}</span>
            )))}
            {MORE_CATEGORIES.flatMap((c) => c.items.filter((i) => !i.run).map((i) => (
              <span key={i.id} className="gm-pending-item">{i.label}</span>
            )))}
          </div>
        </div>
      </div>
    </div>
  );
}
