// Agent Mission-Control cockpit — a live roster of running agents on the left,
// the selected agent's streaming transcript on the right.
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchSessions, gradeColor, human, idleLabel } from "../api";
import type { Session } from "../api";
import { AgentTranscript } from "../components/AgentTranscript";

export function AgentsView() {
  const { data } = useQuery({
    queryKey: ["sessions", 240],
    queryFn: () => fetchSessions(240),
    refetchInterval: 2000,
  });
  const sessions = data?.sessions ?? [];

  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  // Auto-select the highest-score agent once, on first load.
  useEffect(() => {
    if (selectedFile) return;
    const first = sessions.find((s) => s.file);
    if (first?.file) setSelectedFile(first.file);
  }, [sessions, selectedFile]);

  const selected = sessions.find((s) => s.file === selectedFile) || null;

  return (
    <div className="mc-view" style={{ display: "grid", gridTemplateColumns: "300px 1fr" }}>
      <div className="mc-list">
        <div className="mc-list-head">
          <span className="mc-list-title">LIVE AGENTS</span>
          <span className="mc-list-count">{sessions.length}</span>
        </div>

        {sessions.map((s: Session) => {
          const live = s.idle_min < 3;
          const sel = s.file === selectedFile;
          return (
            <button
              key={s.id}
              className={`mc-agent${sel ? " sel" : ""}`}
              onClick={() => s.file && setSelectedFile(s.file)}
              disabled={!s.file}
            >
              <div className="mc-agent-row1">
                <span
                  className="mc-agent-dot"
                  style={{ background: live ? "#34d399" : "#59617a" }}
                />
                <span className="mc-agent-name">{s.title}</span>
                <span className="mc-agent-model">{s.model}</span>
              </div>
              <div className="mc-agent-row2">
                <span className="mc-agent-score" style={{ color: gradeColor(s.score) }}>
                  {s.score.toFixed(0)}
                </span>
                <span className="mc-agent-ctx">· {human(s.ctx)}</span>
                <span className="mc-agent-idle">· {idleLabel(s.idle_min)}</span>
              </div>
            </button>
          );
        })}
      </div>

      <AgentTranscript file={selectedFile} title={selected?.title} />

      <div className="mc-mission-slot" />
    </div>
  );
}
