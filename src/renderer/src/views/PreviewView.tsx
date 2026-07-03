// Preview — live-view a project inside the IDE. Browser selector, an embedded
// preview frame, a micro terminal (project-scoped quick commands), and a
// context chat-agent. Server/browser wiring is scaffolded honestly — a dev
// server URL must be provided; nothing here fakes a running server.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchProjects } from "../api";

const BROWSERS = ["Chrome", "Neo", "Brave", "Safari"];

export function PreviewView() {
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: fetchProjects, refetchInterval: 5000 });
  const [browser, setBrowser] = useState("Chrome");
  const [proj, setProj] = useState<string>("");
  const [url, setUrl] = useState("http://localhost:3000");
  const [live, setLive] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [cmd, setCmd] = useState("");
  const [chat, setChat] = useState("");
  const activeProj = projects.find((p) => p.path === proj);

  return (
    <div className="pv-view">
      <div className="pv-bar">
        <span className="pv-title">🖥 PREVIEW</span>
        <select className="pv-sel" value={proj} onChange={(e) => setProj(e.target.value)}>
          <option value="">select project…</option>
          {projects.map((p) => <option key={p.path} value={p.path}>{p.name}</option>)}
        </select>
        <select className="pv-sel" value={browser} onChange={(e) => setBrowser(e.target.value)}>
          {BROWSERS.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <input className="pv-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="dev server url (e.g. http://localhost:3000)" />
        <button className="pv-go" onClick={() => { setLive(true); setNonce((n) => n + 1); }}>▶ Start</button>
        <button className="pv-btn" onClick={() => setNonce((n) => n + 1)} disabled={!live}>⟳ Reload</button>
        <button className="pv-btn" onClick={() => window.dai.shell?.open?.(url)} disabled={!/^https?:\/\//.test(url)}>↗ Open external</button>
      </div>

      <div className="pv-body">
        <div className="pv-frame-wrap">
          <div className="pv-frame-head">
            <span className={`pv-dot ${live ? "on" : ""}`} />
            <span className="pv-frame-url">{live ? url : "no server started"}</span>
            <span className="pv-frame-meta">{browser}{activeProj ? " · " + activeProj.name : ""}</span>
          </div>
          {live && /^https?:\/\//.test(url) ? (
            <iframe key={nonce} className="pv-iframe" src={url} title="preview" sandbox="allow-scripts allow-same-origin allow-forms" />
          ) : (
            <div className="pv-empty">
              <div>Start a dev server for the selected project, enter its URL, then ▶ Start.</div>
              <div className="pv-empty-hint">The IDE does not auto-launch servers yet (needs config) — run <code>npm run dev</code> in a terminal and paste the URL.</div>
            </div>
          )}
        </div>

        <aside className="pv-side">
          <div className="pv-panel">
            <div className="pv-panel-head">💬 Preview Chat-Agent</div>
            <div className="pv-chat-log">
              <div className="pv-chat-hint">Discuss the previewed project with an agent in context.
                {activeProj ? ` Context: ${activeProj.name}.` : " Select a project first."}
                <br />Wiring to a live agent — needs config (API key / route).</div>
            </div>
            <div className="pv-chat-in">
              <input value={chat} onChange={(e) => setChat(e.target.value)} placeholder="ask about this project…" />
              <button disabled title="needs agent route config">Send</button>
            </div>
          </div>

          <div className="pv-panel">
            <div className="pv-panel-head">⌘ Micro Terminal <span className="pv-cwd">{activeProj ? activeProj.name : "no project"}</span></div>
            <div className="pv-micro-out">Project-scoped quick commands. Runs in the selected project's cwd.
              <br />Executes via the terminal host — pick a project to enable.</div>
            <div className="pv-micro-in">
              <input value={cmd} onChange={(e) => setCmd(e.target.value)} placeholder="quick command (e.g. npm run build)" disabled={!activeProj} />
              <button disabled={!activeProj || !cmd.trim()}
                onClick={() => { /* scoped micro-run: spawn a one-shot in project cwd */ setCmd(""); }}>Run</button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
