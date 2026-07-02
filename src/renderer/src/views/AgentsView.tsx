// Agent Mission-Control cockpit — a live roster of running agents (with health +
// goal% + problems), the selected agent's streaming transcript, and an opt-in
// Autopilot that auto-watches for stuck agents and nudges them to self-repair.
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchSessions, fetchAgentHealth, gradeColor, human, idleLabel } from "../api";
import type { Session, AgentHealth } from "../api";
import { AgentTranscript } from "../components/AgentTranscript";

const STATUS_COLOR: Record<AgentHealth["status"], string> = {
  working: "#34d399", done: "#7c8cff", error: "#f43f5e", stalled: "#fbbf24", idle: "#59617a",
};

/** Per-agent health badge — goal% + status dot + problem count. */
function HealthBadge({ file }: { file?: string }) {
  const { data: h } = useQuery({
    queryKey: ["health", file],
    queryFn: () => fetchAgentHealth(file!),
    enabled: !!file,
    refetchInterval: 4000,
  });
  if (!h) return null;
  return (
    <span className="mc-health" title={`${h.status} · goal ${h.goalPct}% · ${h.problems.length} problem(s)`}>
      <span className="mc-health-status" style={{ background: STATUS_COLOR[h.status] }} />
      <span className="mc-health-ring" style={{ color: gradeColor(h.goalPct) }}>{h.goalPct}%</span>
      {h.problems.length > 0 && <span className="mc-problem">⚠{h.problems.length}</span>}
    </span>
  );
}

type LogRow = { ts: number; agent: string; problem: string };

export function AgentsView({ onOpenFile }: { onOpenFile?: (p: string) => void }) {
  const { data } = useQuery({
    queryKey: ["sessions", 240],
    queryFn: () => fetchSessions(240),
    refetchInterval: 2000,
  });
  const sessions = data?.sessions ?? [];

  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [autopilot, setAutopilot] = useState(false);
  const [log, setLog] = useState<LogRow[]>([]);
  const cooldown = useRef<Map<string, number>>(new Map()); // file → lastNudgeTs
  const sessRef = useRef(sessions);
  sessRef.current = sessions;

  // Auto-select the highest-score agent once, on first load.
  useEffect(() => {
    if (selectedFile) return;
    const first = sessions.find((s) => s.file);
    if (first?.file) setSelectedFile(first.file);
  }, [sessions, selectedFile]);

  // AUTOPILOT: watch every agent's health; nudge stuck/errored ones to self-repair.
  // Heuristic (auto-watch + auto-nudge), opt-in, with a 90s per-agent cooldown.
  useEffect(() => {
    if (!autopilot) return;
    let alive = true;
    const tick = async () => {
      const now = Date.now();
      for (const s of sessRef.current) {
        if (!s.file) continue;
        let h: AgentHealth;
        try { h = await fetchAgentHealth(s.file); } catch { continue; }
        if (!alive) return;
        const bad = h.status === "error" || h.status === "stalled";
        const fresh = h.problems[0] && now - h.problems[0].ts < 3 * 60_000;
        const last = cooldown.current.get(s.file) ?? 0;
        if (!bad || !fresh || now - last < 90_000) continue;
        // resolve the agent's live claude terminal by EXACT cwd. Never use
        // startsWith (would match sibling/child dirs → nudge the wrong agent),
        // and if more than one claude terminal shares the cwd the target is
        // ambiguous — skip rather than blindly typing into someone else's agent.
        let terms: { id: string; cmd: string; cwd: string }[] = [];
        try { terms = await window.dai.term.list(); } catch { /* host busy */ }
        const cwd = h.cwd_full || s.cwd_full || "";
        if (!cwd) continue;
        const matches = terms.filter((x) => x.cmd === "claude" && x.cwd === cwd);
        if (matches.length !== 1) continue; // 0 = no terminal, >1 = ambiguous → don't nudge
        const t = matches[0];
        const p = h.problems[0];
        const prompt = `Autopilot: am detectat o problemă (${p.kind}: ${p.detail}). Analizează ultima eroare, repar-o, apoi continuă.`;
        try {
          await window.dai.term.broadcast(prompt, true, [t.id]);
          cooldown.current.set(s.file, now);
          setLog((l) => [{ ts: now, agent: s.title, problem: `${p.kind}: ${p.detail}`.slice(0, 60) }, ...l].slice(0, 10));
        } catch { /* broadcast failed — retry next tick */ }
      }
    };
    const iv = setInterval(tick, 5000);
    tick();
    return () => { alive = false; clearInterval(iv); };
  }, [autopilot]);

  const selected = sessions.find((s) => s.file === selectedFile) || null;

  return (
    <div className="mc-view" style={{ display: "grid", gridTemplateColumns: "320px 1fr" }}>
      <div className="mc-list">
        <div className="mc-list-head">
          <span className="mc-list-title">LIVE AGENTS</span>
          <span className="mc-list-count">{sessions.length}</span>
        </div>

        {/* Autopilot control */}
        <button className={`mc-autopilot${autopilot ? " on" : ""}`} onClick={() => setAutopilot((a) => !a)}
          title="auto-watch + auto-nudge · heuristic self-repair">
          🛠️ Autopilot {autopilot ? "ON" : "OFF"}
          <span className="mc-autopilot-sub">auto-watch + nudge · heuristic</span>
        </button>
        {autopilot && log.length > 0 && (
          <div className="mc-autopilot-log">
            {log.map((r, i) => (
              <div key={i} className="mc-log-row">
                {new Date(r.ts).toTimeString().slice(0, 5)} · <b>{r.agent}</b> · {r.problem} → nudged
              </div>
            ))}
          </div>
        )}

        {sessions.map((s: Session) => {
          const live = s.idle_min < 3;
          const sel = s.file === selectedFile;
          return (
            <button key={s.id} className={`mc-agent${sel ? " sel" : ""}`}
              onClick={() => s.file && setSelectedFile(s.file)} disabled={!s.file}>
              <div className="mc-agent-row1">
                <span className="mc-agent-dot" style={{ background: live ? "#34d399" : "#59617a" }} />
                <span className="mc-agent-name">{s.title}</span>
                <HealthBadge file={s.file} />
              </div>
              <div className="mc-agent-row2">
                <span className="mc-agent-model">{s.model}</span>
                <span className="mc-agent-score" style={{ color: gradeColor(s.score) }}>{s.score.toFixed(0)}</span>
                <span className="mc-agent-ctx">· {human(s.ctx)}</span>
                <span className="mc-agent-idle">· {idleLabel(s.idle_min)}</span>
              </div>
            </button>
          );
        })}
      </div>

      <AgentTranscript file={selectedFile} title={selected?.title} onOpenFile={onOpenFile} />
    </div>
  );
}
