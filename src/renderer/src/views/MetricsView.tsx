import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence } from "motion/react";
import { fetchSessions, human } from "../api";
import { SessionCard } from "../components/SessionCard";
import { ReasoningStream } from "../components/ReasoningStream";
import { SectionHeader, EmptyState } from "../components/da";
import { IcChart, IcAlert } from "../components/icons";
import { deployTerm, STATUS_META } from "../registry";
import { queryClient } from "../queryClient";
import { useT } from "../hooks/useAppearance";
import { useOps } from "../hooks/useOps";

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

  const t = useT();
  const ops = useOps();

  return (
    <div className="metrics-view">
      <SectionHeader icon={<IcChart />} title="METRICS"
        sub={t({ en: "Live session observability", ro: "Observabilitate sesiuni live" })}
        status={isError ? "error" : liveCount > 0 ? "live" : "idle"} />
      <div className="mv-bar">
        <div className="stats">
          <div className="mv-stat">
            <div className="v">{ops.checking ? "…" : `${ops.liveCount}/${ops.total}`}</div>
            <div className="l">{t({ en: "superpowers live", ro: "superputeri live" })}</div>
          </div>
          {(["ruflo", "graphify"] as const).map((id) => {
            const s = ops.statuses[id];
            if (!s) return null; // no probe result for this id — omit rather than invent
            return (
              <div className="mv-stat" key={id}>
                <div className="v" style={{ color: ops.checking ? "var(--muted)" : STATUS_META[s].color }}>
                  {ops.checking ? t({ en: "checking", ro: "verificare" }) : STATUS_META[s].label}
                </div>
                <div className="l">{id}</div>
              </div>
            );
          })}
          <div className="mv-stat">
            <div className="v">{ops.liveAgents}</div>
            <div className="l">{t({ en: "live agents", ro: "agenti live" })}</div>
          </div>
        </div>
      </div>
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
        <EmptyState icon={<IcAlert size={34} />}
          title={t({ en: "Metrics API offline", ro: "API metrics offline" })}
          hint={t({
            en: "The session probe did not answer. Retry, or check the audit log for errors.",
            ro: "Sonda de sesiuni nu a raspuns. Reincearca sau verifica audit log pentru erori.",
          })}
          actions={[
            { label: t({ en: "Retry", ro: "Reincearca" }), onClick: () => { queryClient.invalidateQueries({ queryKey: ["sessions"] }); }, primary: true },
          ]} />
      ) : sessions.length === 0 ? (
        <EmptyState icon={<IcChart size={34} />}
          title={t({ en: "No active sessions", ro: "Nicio sesiune activa" })}
          hint={t({
            en: `No Claude sessions in the last ${active < 1440 ? `${active} minutes` : "24 hours"}. Launch one and its score, context and output land here live.`,
            ro: `Nicio sesiune Claude in ultimele ${active < 1440 ? `${active} minute` : "24 de ore"}. Lanseaza una si scorul, contextul si output-ul apar aici live.`,
          })}
          actions={[
            { label: t({ en: "Launch Claude Session", ro: "Lanseaza sesiune Claude" }), onClick: deployTerm("claude", "~"), primary: true },
            { label: "24h", onClick: () => setActive(1440) },
          ]} />
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
