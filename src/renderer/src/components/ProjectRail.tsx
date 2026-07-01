import { memo } from "react";
import { motion } from "motion/react";
import { Project, TYPE_ICON, gradeColor, human } from "../api";

export const ProjectRail = memo(function ProjectRail({
  projects,
  activePath,
  onSelect,
}: {
  projects: Project[];
  activePath: string | null;
  onSelect: (path: string | null) => void;
}) {
  const totalTerms = projects.reduce((a, p) => a + p.terminals.length, 0);

  return (
    <aside className="proj-rail">
      <div className="pr-head">
        <span className="pr-title">WORKSPACES</span>
        <span className="pr-count">{projects.length}</span>
      </div>

      <button
        className={`pr-all${activePath === null ? " active" : ""}`}
        onClick={() => onSelect(null)}
      >
        <span className="pr-all-ic">⌘</span>
        <span className="pr-all-name">All projects</span>
        <span className="pr-all-n">{totalTerms} term</span>
      </button>

      <div className="pr-list">
        {projects.map((p) => {
          const live = !!p.session && p.session.idle_min < 3;
          const active = activePath === p.path;
          return (
            <motion.button
              layout
              key={p.path}
              className={`pr-item${active ? " active" : ""}`}
              onClick={() => onSelect(p.path)}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="pr-row1">
                <span className="pr-ic">{TYPE_ICON[p.type] || "📁"}</span>
                <span className="pr-name">{p.name}</span>
                {p.terminals.length > 0 && <span className="pr-term">{p.terminals.length}⊟</span>}
              </div>
              <div className="pr-row2">
                {p.branch && (
                  <span className="pr-branch">⎇ {p.branch}{p.dirty ? ` ±${p.dirty}` : ""}</span>
                )}
                {p.session ? (
                  <span className="pr-sess" style={{ color: gradeColor(p.session.score) }}>
                    <span className="pr-dot" style={{ background: live ? "#34d399" : "#59617a" }} />
                    {p.session.score.toFixed(0)} · {human(p.session.ctx)}
                  </span>
                ) : (
                  <span className="pr-idle">idle</span>
                )}
              </div>
              {active && <motion.span layoutId="pr-active" className="pr-active-bar" />}
            </motion.button>
          );
        })}
      </div>
    </aside>
  );
});
