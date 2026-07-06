// Right-panel inspector for the selected agent/tool. Every field is honest:
// missing data reads "unknown"/"not verified"/"not applicable", never invented.
// SAFETY: install/test buttons COPY the command (never auto-run); Configure/Disable
// are honestly disabled until wired. GitHub opens in the real browser (http/https
// guarded in main). Agent personas can arm a Claude session seeded with their role.
import {
  CATEGORY_META, LIB_STATUS_META, CONN_META, USECASE_LABEL, SOURCE_LABEL,
  type LibEntry,
} from "./libraryMeta";
import { pushToast } from "../../toast";

function agentPrompt(e: LibEntry): string {
  return `You are now operating as the "${e.name}" agent — ${e.role} ${e.does} Apply this specialization to the current project and confirm your role before starting work.`;
}

function copy(cmd: string, label: string) {
  navigator.clipboard?.writeText(cmd).then(
    () => pushToast({ kind: "info", title: `${label} command copied`, detail: cmd, ttl: 3200 }),
    () => pushToast({ kind: "error", title: "Copy failed", detail: cmd, ttl: 3200 }),
  );
}

function openRepo(url: string) {
  window.dai.shell.open(url);
  window.dai.audit.log("library-open-repo", url);
}

export function LibraryInspector({ e, activeProject, onLaunch }: { e: LibEntry | null; activeProject?: string | null; onLaunch: (e: LibEntry) => void }) {
  if (!e) {
    return (
      <aside className="lib-inspector">
        <div className="lib-insp-empty">Select an agent or tool to inspect its details, GitHub, install/test and connected systems.</div>
      </aside>
    );
  }
  const m = CATEGORY_META[e.category];
  const st = LIB_STATUS_META[e.status];
  void activeProject; // launch resolves cwd inside CategoryLibrary via onLaunch

  return (
    <aside className="lib-inspector" data-cat={e.category}>
      <div className="lib-insp-head">
        <span className="lib-insp-cat">{m.icon({ size: 14 })} {m.label}</span>
        <div className="lib-insp-name">{e.name}</div>
        <div className="lib-insp-sub">
          <span className="lib-status" data-status={e.status}>{st.label}</span>
          <span className="lib-kind">{e.kind === "agent" ? "AGENT" : "TOOL"}</span>
          <span className="lib-power inline" aria-label={`power ${e.power} of 5`}>
            {[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= e.power ? "on" : ""} />)}
          </span>
        </div>
      </div>

      <div className="lib-insp-body">
        <div className="lib-insp-row"><span>What it does</span><p>{e.does}</p></div>

        <div className="lib-insp-sec-h">Official GitHub</div>
        <div className="lib-gh">
          {e.github
            ? <a onClick={() => openRepo(e.github!)} title={e.github}>{e.github.replace("https://github.com/", "")}</a>
            : <span className="muted">{e.githubNote || "not verified"}</span>}
          {e.github && e.githubNote && <span className="lib-gh-note">{e.githubNote}</span>}
        </div>

        <div className="lib-insp-sec-h">Source</div>
        <div className="lib-insp-row inline"><span>Type</span><b>{SOURCE_LABEL[e.source]}</b></div>

        {(e.install || e.test) && <div className="lib-insp-sec-h">Install &amp; test</div>}
        {e.install && e.install !== "—" && (
          <div className="lib-cmd"><code>{e.install}</code><button className="copy" onClick={() => copy(e.install!, "Install")}>copy</button></div>
        )}
        {e.test && e.test !== "—" && (
          <div className="lib-cmd"><code>{e.test}</code><button className="copy" onClick={() => copy(e.test!, "Test")}>copy</button></div>
        )}

        <div className="lib-insp-sec-h">Connected to</div>
        <div className="lib-conn">
          {e.connected.length === 0 && <span className="muted">unknown</span>}
          {e.connected.map((c) => (
            <span key={c} className="lib-chip">{CONN_META[c].icon({ size: 12 })} {CONN_META[c].label}</span>
          ))}
        </div>

        <div className="lib-insp-sec-h">Use cases</div>
        <div className="lib-conn">
          {e.useCases.length === 0 && <span className="muted">unknown</span>}
          {e.useCases.map((u) => <span key={u} className="lib-chip ghost">{USECASE_LABEL[u]}</span>)}
        </div>

        {e.risks && <><div className="lib-insp-sec-h">Risks</div><div className="lib-insp-row"><p className="warn">{e.risks}</p></div></>}
        {e.notes && <><div className="lib-insp-sec-h">Notes</div><div className="lib-insp-row"><p>{e.notes}</p></div></>}
      </div>

      <div className="lib-insp-actions">
        {e.launch
          ? <button className="drv-btn accent wide" onClick={() => onLaunch(e)} title="Arm a Claude terminal seeded with this role">Open · launch session</button>
          : e.github
            ? <button className="drv-btn accent wide" onClick={() => openRepo(e.github!)}>Open on GitHub</button>
            : <button className="drv-btn wide" disabled title="No launch target — internal/planned">Open</button>}
        <button className="drv-btn ghost" disabled={!e.install || e.install === "—"} onClick={() => e.install && copy(e.install, "Install")} title={e.install && e.install !== "—" ? "Copy install command (never auto-runs)" : "No install command"}>Install</button>
        <button className="drv-btn ghost" disabled={!e.test || e.test === "—"} onClick={() => e.test && copy(e.test, "Test")} title={e.test && e.test !== "—" ? "Copy test command" : "No test command"}>Test</button>
        <button className="drv-btn ghost" disabled={!e.github} onClick={() => e.github && openRepo(e.github)} title={e.github ? "Open the official repo / docs" : "No verified docs link"}>Docs</button>
        <button className="drv-btn ghost" disabled title="Per-agent configuration — not wired yet">Configure</button>
        <button className="drv-btn ghost" disabled title="Enable/disable toggle — not wired yet">Disable</button>
      </div>
    </aside>
  );
}

export { agentPrompt };
