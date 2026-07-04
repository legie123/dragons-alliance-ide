import { useState } from "react";
import { IcSigil, IcZap, IcFolder, IcSend } from "./icons";
import { broadcast, Project } from "../api";

const CHIPS = ["status?", "ce faci acum?", "continua", "commit + push", "ruleaza testele"];

/** Mission command bar: broadcast a prompt to every running `claude` agent, and
 *  launch new claude agents into projects. Targets ONLY cmd==="claude" terminals. */
export function MissionBar({ projects }: { projects: Project[] }) {
  const [msg, setMsg] = useState("");
  const [flash, setFlash] = useState("");
  const [launchOpen, setLaunchOpen] = useState(false);

  async function claudeIds(): Promise<string[]> {
    const terms = await window.dai.term.list();
    return terms.filter((t) => t.cmd === "claude").map((t) => t.id);
  }

  async function send(text: string) {
    const t = text.trim();
    if (!t) return;
    const ids = await claudeIds();
    if (ids.length === 0) { toast("no live claude agents — launch one first"); return; }
    // Broadcast sends real keystrokes (+Enter) into every live agent — confirm first.
    if (!window.confirm(`Send this prompt to ${ids.length} live agent${ids.length === 1 ? "" : "s"}?\n\n${t}`)) return;
    const r = await broadcast(t, true, ids);
    toast(`📡 sent to ${r.sent} agent${r.sent === 1 ? "" : "s"}`);
    setMsg("");
  }

  function toast(m: string) { setFlash(m); setTimeout(() => setFlash(""), 2200); }

  // Skip projects that already have a live claude agent (dedup by cwd).
  async function liveClaudeCwds(): Promise<Set<string>> {
    const terms = await window.dai.term.list();
    return new Set(terms.filter((t) => t.cmd === "claude").map((t) => t.cwd));
  }
  let SEQ = Date.now();
  function spawn(cwd: string) {
    window.dai.term.create({ id: `mc${(SEQ++).toString(36)}`, cmd: "claude", cwd });
  }
  async function launch(cwd: string, name: string) {
    if ((await liveClaudeCwds()).has(cwd)) { toast(`already running in ${name}`); setLaunchOpen(false); return; }
    spawn(cwd);
    toast(`🜲 launched claude in ${name}`);
    setLaunchOpen(false);
  }
  async function launchAll() {
    const live = await liveClaudeCwds();
    const fresh = projects.filter((p) => !live.has(p.path));
    for (const p of fresh) spawn(p.path);
    toast(fresh.length ? `🜲 launched claude in ${fresh.length} project${fresh.length === 1 ? "" : "s"}` : "all projects already running");
    setLaunchOpen(false);
  }

  return (
    <div className="mc-mission">
      <div className="mc-launch">
        <button className="mc-launch-btn" onClick={() => setLaunchOpen((o) => !o)}><IcSigil /> Launch claude ▾</button>
        {launchOpen && (
          <div className="mc-launch-menu">
            <div className="mc-launch-all" onClick={launchAll}><IcZap /> in ALL projects ({projects.length})</div>
            <div className="mc-launch-sep">into project</div>
            {projects.map((p) => (
              <div key={p.path} className="mc-launch-row" onClick={() => launch(p.path, p.name)}><IcFolder /> {p.name}</div>
            ))}
          </div>
        )}
      </div>

      <span className="mc-mission-label"><IcSend /> mission → all agents</span>
      <div className="mc-chips">
        {CHIPS.map((c) => <button key={c} className="mc-chip" onClick={() => send(c)}>{c}</button>)}
      </div>
      <input
        className="mc-mission-input"
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") send(msg); }}
        placeholder="broadcast a prompt to every running claude agent…"
      />
      <button className="mc-send" onClick={() => send(msg)}>Send</button>
      {flash && <span className="mc-flash">{flash}</span>}
    </div>
  );
}
