import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence } from "motion/react";
import { fetchSessions, human } from "../api";
import { SessionCard } from "../components/SessionCard";

const WINDOWS = [60, 240, 1440];

export function MetricsView() {
  const [active, setActive] = useState(240);
  const { data, isError } = useQuery({
    queryKey: ["sessions", active],
    queryFn: () => fetchSessions(active),
  });
  const sessions = data?.sessions ?? [];
  const totalCtx = sessions.reduce((a, s) => a + s.ctx, 0);
  const totalOut = sessions.reduce((a, s) => a + s.out, 0);

  return (
    <div className="metrics-view">
      <div className="mv-bar">
        <div className="stats">
          <div className="stat"><div className="v"><span className="livedot" />{data?.live ?? 0}</div><div className="l">live</div></div>
          <div className="stat"><div className="v">{sessions.length}</div><div className="l">sessions</div></div>
          <div className="stat"><div className="v">{human(totalCtx)}</div><div className="l">context</div></div>
          <div className="stat"><div className="v">{human(totalOut)}</div><div className="l">output</div></div>
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
        <div className="grid">
          <AnimatePresence mode="popLayout">
            {sessions.map((s) => <SessionCard key={s.id} s={s} />)}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
