// Ecosystem status strip — live indicator lights for every super-tool the IDE
// collaborates with (Obsidian, Graphify, Ruflo, Claude agents, GODMODE, …).
// Every light reflects a real signal probed in the main process (no fake lights).
import { useQuery } from "@tanstack/react-query";
import { fetchTools, toolAction, ToolStatus } from "../api";

const DOT: Record<ToolStatus["status"], string> = {
  live: "#34d399",   // pulsing green — actively collaborating
  ready: "#fbbf24",  // amber — installed, idle
  off: "#59617a",    // grey — not present
};

export function EcosystemBar() {
  const { data: tools = [] } = useQuery({
    queryKey: ["tools"],
    queryFn: fetchTools,
    refetchInterval: 3000,
  });

  const liveN = tools.filter((t) => t.status === "live").length;

  return (
    <div className="eco-bar">
      <span className="eco-label">ECOSYSTEM <span className="eco-live">{liveN} live</span></span>
      <div className="eco-pills">
        {tools.map((t) => (
          <button
            key={t.id}
            className={`eco-pill ${t.status}${t.action ? " clickable" : ""}`}
            title={`${t.name} — ${t.detail}${t.action ? " · click to open" : ""}`}
            onClick={() => t.action && toolAction(t.action)}
            disabled={!t.action}
          >
            <span
              className={`eco-dot ${t.status === "live" ? "pulse" : ""}`}
              style={{ background: DOT[t.status], boxShadow: t.status !== "off" ? `0 0 8px ${DOT[t.status]}` : "none" }}
            />
            <span className="eco-ic">{t.icon}</span>
            <span className="eco-name">{t.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
