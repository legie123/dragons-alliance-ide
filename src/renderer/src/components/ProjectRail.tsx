import { memo, useState, useEffect } from "react";
import { motion } from "motion/react";
import { Project, TYPE_ICON, gradeColor, human } from "../api";

// Custom display names ("aliases") for projects — persisted locally, never touches
// the real folder. Double-click a project name to rename it.
const ALIAS_KEY = "dai:project-aliases";
function loadAliases(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(ALIAS_KEY) || "{}"); } catch { return {}; }
}
function saveAliases(a: Record<string, string>) {
  try { localStorage.setItem(ALIAS_KEY, JSON.stringify(a)); } catch { /* quota */ }
}

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
  const [aliases, setAliases] = useState<Record<string, string>>(loadAliases);
  const [editing, setEditing] = useState<string | null>(null); // project path being renamed
  const [draft, setDraft] = useState("");

  useEffect(() => { saveAliases(aliases); }, [aliases]);

  function displayName(p: Project) { return aliases[p.path] || p.name; }
  function startEdit(p: Project, e: React.MouseEvent) {
    e.stopPropagation();
    setEditing(p.path);
    setDraft(displayName(p));
  }
  function commit(path: string) {
    const v = draft.trim();
    setAliases((a) => {
      const next = { ...a };
      if (!v || v === projects.find((p) => p.path === path)?.name) delete next[path]; // empty/same → reset to real name
      else next[path] = v;
      return next;
    });
    setEditing(null);
  }

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
          const isEditing = editing === p.path;
          return (
            <motion.button
              layout
              key={p.path}
              className={`pr-item${active ? " active" : ""}`}
              onClick={() => !isEditing && onSelect(p.path)}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="pr-row1">
                <span className="pr-ic">{TYPE_ICON[p.type] || "📁"}</span>
                {isEditing ? (
                  <input
                    className="pr-rename"
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter") commit(p.path);
                      else if (e.key === "Escape") setEditing(null);
                    }}
                    onBlur={() => commit(p.path)}
                  />
                ) : (
                  <span className="pr-name" onDoubleClick={(e) => startEdit(p, e)} title="double-click to rename">
                    {displayName(p)}
                  </span>
                )}
                {!isEditing && (
                  <span className="pr-edit" onClick={(e) => startEdit(p, e)} title="rename">✎</span>
                )}
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
