import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence } from "motion/react";
import { fetchSessions, human } from "../api";
import { SessionCard } from "../components/SessionCard";
import { ReasoningStream } from "../components/ReasoningStream";

const WINDOWS = [60, 240, 1440];

export function MetricsView() {
  const [active, setActive] = useState(240);
  const [selected, setSelected] = useState<string | null>(null);
  const { data, isError } = useQuery({
    queryKey: ["sessions", active],
    queryFn: () => fetchSessions(active),
    refetchInterval: 2000,
  });
  const sessions = data?.sessions ?? [];
  const totalCtx = sessions.reduce((a, s) => a + s.ctx, 0);
  const totalOut = sessions.reduce((a, s) => a + s.out, 0);
  const liveCount = sessions.filter((s) => s.idle_min < 3).length;
  const avgScore = sessions.length
    ? sessions.reduce((a, s) => a + s.score, 0) / sessions.length
    : 0;

  // Default the reasoning panel to the highest-score agent; let a click override it.
  const top = useMemo(
    () => sessions.slice().sort((a, b) => b.score - a.score)[0],
    [sessions]
  );
  const selId = selected ?? top?.id ?? null;
  const selSession = sessions.find((s) => s.id === selId) ?? top;
  const selFile = selSession?.file ?? null;

  return (
    <div className="metrics-view">
      <div className="mv-bar">
        <div className="stats">
          <div className="mv-stat"><div className="v">{sessions.length}</div><div className="l">agents</div></div>
          <div className="mv-stat"><div className="v"><span className="livedot" />{liveCount}</div><div className="l">live</div></div>
          <div className="mv-stat"><div className="v">{avgScore.toFixed(0)}</div><div className="l">avg score</div></div>
          <div className="mv-stat"><div className="v">{human(totalCtx)}</div><div className="l">context</div></div>
          <div className="mv-stat"><div className="v">{human(totalOut)}</div><div className="l">output</div></div>
        </div>
        <div className="controls">
          {WINDOWS.map((w) => (
            <button key={w} className={w === active ? "active" : ""} onClick={() => setActive(w)}>
              {w < 1440 ? `${w}m` : "24h"}
            </button>
          ))}
        </div>
      </div>

      {isError ? (
        <div className="empty">api offline</div>
      ) : sessions.length === 0 ? (
        <div className="empty">no active sessions in the last {active < 1440 ? `${active} min` : "24h"}</div>
      ) : (
        <div className="mv-split">
          <div className="mv-grid">
            <AnimatePresence mode="popLayout">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className={s.id === selId ? "mv-pick sel" : "mv-pick"}
                  onClick={() => setSelected(s.id)}
                >
                  <SessionCard s={s} />
                </div>
              ))}
            </AnimatePresence>
          </div>
          <div className="mv-reason">
            <ReasoningStream file={selFile} title={selSession?.title} />
          </div>
        </div>
      )}
    </div>
  );
}
