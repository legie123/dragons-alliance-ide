// Admin Command Center ▸ Quick Guide — the Cloud & Superpowers operator guide.
// This replaced the old decorative "Short Tips": every entry below is REAL,
// current operating knowledge for THIS app (statuses, buttons, troubleshooting,
// copy-paste prompts). Content is curated by hand — update it when behavior
// changes, never let it drift into fiction.
import { pushToast } from "../../toast";
import { openSuperpower, godmode, goto, runHealthSweep, openLibraryTools } from "../../registry";
import { IcCloud, IcCrown, IcZap, IcTerminal, IcAlert, IcSend } from "../icons";

function Prompt({ title, text }: { title: string; text: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      pushToast({ kind: "success", title: "Copied", detail: title, ttl: 2500 });
    } catch {
      pushToast({ kind: "error", title: "Copy failed", detail: "select the text manually", ttl: 3500 });
    }
  };
  return (
    <div className="qg-prompt">
      <div className="qg-prompt-head">
        <b>{title}</b>
        <button className="da-btn ghost sm" onClick={copy}>Copy</button>
      </div>
      <pre>{text}</pre>
    </div>
  );
}

export function QuickGuide() {
  return (
    <div className="qg">
      <div className="qg-head">
        <h3>Cloud &amp; Superpowers — Quick Guide</h3>
        <p>The operator's working guide: how to run sessions, what every button and status really means, and what to do when something looks wrong. Everything here reflects the app's real behavior.</p>
      </div>

      <div className="qg-sec"><IcCloud size={14} /> A · CLOUD TIPS</div>
      <ul className="qg-list">
        <li><b>Continue a session</b> — open <b>Terminal</b> (⌘1): live claude terminals persist across app restarts (scrollback replays). Type into the session, or use Agents ▸ card ▸ transcript to see where it left off first.</li>
        <li><b>Is Cloud running?</b> — the Cloud chip is <b>LIVE</b> only when ≥1 Claude session was active in the last 3 minutes (real transcript parse, never faked). Also: bottom bar "agents N".</li>
        <li><b>Context / cost</b> — Metrics (⌘6): per-session context + output tokens, plus the system-health strip (superpowers N/7, ruflo/graphify state).</li>
        <li><b>Recap</b> — when an agent goes idle, the terminal shows a recap overlay built from its REAL transcript (last thinking/action). Click the terminal or new output dismisses it.</li>
        <li><b>Work without interrupting a task</b> — open a NEW worker (+ Worker ▸ zsh) instead of typing into a running claude terminal; broadcast only when you MEAN to steer every live agent (it asks for confirm).</li>
        <li><b>Status words</b> — RUNNING/live = active now · IDLE = ready, nothing active (NOT an error) · DONE = finished · ERROR = a probe/action truly failed and says why.</li>
      </ul>

      <div className="qg-sec"><IcCrown size={14} /> B · SUPERPOWERS TIPS</div>
      <ul className="qg-list">
        <li><b>GODMODE</b> — the system truth center. Use it to see everything at once, run <i>Full System Check</i>, capture a screenshot, sync the vault, or <i>Emergency Stop</i> all workers (master survives).</li>
        <li><b>Agent Rooflow</b> — the RuFlo engine. <i>Ignite</i> runs the real <code>ruflo status</code>; the health check also shows the real task queue. <i>Reflow</i> is disabled until the CLI grows that op — the button tells you.</li>
        <li><b>Agents</b> — launch agents into projects, broadcast a mission (confirmed, real keystrokes), stop an agent from its card (exact-terminal match only), watch health + transcripts live.</li>
        <li><b>Cloud</b> — session runtime: launch, watch tokens in Metrics, stop from Agents. LIVE follows real sessions.</li>
        <li><b>Graphify</b> — the graph engine behind NeuroMap. <i>Open Map</i> → the living graph; <i>Inspect Graph</i> → NeuroMap with real counts open; <i>Generate Digest</i> arms the real pipeline in a terminal.</li>
        <li><b>Obsidian</b> — the vault. <i>Open Vault</i> launches Obsidian; <i>Sync Vault</i> runs the real git add·commit·push; <i>Search Notes</i> is the Research desk.</li>
        <li><b>Google APIs</b> — stays <b>partial</b> until you press <i>Sign in with Google</i> and finish the real consent. Then Drive/Sheets/Forms go live — nothing is simulated before that.</li>
      </ul>

      <div className="qg-sec"><IcZap size={14} /> C · BUTTON MEANING</div>
      <ul className="qg-list">
        <li><b>Enabled button</b> = runs a real handler with feedback (toast and/or audit entry). This app has a rule: <i>no dead clicks</i>.</li>
        <li><b>Disabled + tooltip</b> = honest: the tooltip names the exact reason (e.g. "pending backend — no reflow op in the RuFlo CLI yet").</li>
        <li><b>setup required</b> = a credential/config/path is missing — the panel's setup action fixes it (e.g. Google Keys).</li>
        <li><b>local only</b> = fully working on this machine, no remote sync (e.g. vault before a remote is set).</li>
        <li><b>0 active agents</b> = a count, not a failure — launch one and the same probes flip to live.</li>
      </ul>

      <div className="qg-sec"><IcTerminal size={14} /> D · OPERATOR SHORTCUTS</div>
      <ul className="qg-list qg-shortcuts">
        <li><button className="da-btn ghost sm" onClick={() => window.dispatchEvent(new CustomEvent("dai:palette"))}>Open Command Palette</button> ⌘K — every action, searchable</li>
        <li><button className="da-btn ghost sm" onClick={godmode}>Open GODMODE</button> full diagnostics + emergency controls</li>
        <li><button className="da-btn ghost sm" onClick={() => openSuperpower("ruflo")}>Open Agent Rooflow panel</button> engine + queue truth</li>
        <li><button className="da-btn ghost sm" onClick={runHealthSweep}>Run Health Check</button> real ruflo + graphify probes</li>
        <li><button className="da-btn ghost sm" onClick={goto("ide")}>Open Terminal Workers</button> ⌘1</li>
        <li><button className="da-btn ghost sm" onClick={openLibraryTools}>Open Tools</button> all utilities in one grid</li>
      </ul>

      <div className="qg-sec"><IcAlert size={14} /> E · TROUBLESHOOTING</div>
      <ul className="qg-list">
        <li><b>A button "doesn't work"</b> — hover it: if disabled, the tooltip names the reason. If enabled and silent, check Logs (Audit) — every real action writes an entry. No entry = report it as a bug.</li>
        <li><b>A status looks wrong</b> — statuses come from real probes on an interval; press "Check now" (Settings ▸ Superpowers) or GODMODE ▸ Full System Check to re-probe instantly.</li>
        <li><b>Graphify has no digest</b> — honest state. Panel ▸ <i>Generate Digest</i> arms the real <code>graphify update .</code>; watch it in the terminal, then re-check.</li>
        <li><b>Obsidian setup required</b> — the vault path is missing. Install Obsidian / restore <code>~/Documents/Obsidian/Antigravity-Brain</code>.</li>
        <li><b>Google APIs setup required / partial</b> — Keys saved but not signed in: press <i>Sign in with Google</i> and finish the browser consent.</li>
        <li><b>Agents 0 live</b> — nothing is running; launch from Agents ▸ Launch or MissionBar. Zero is truth, not error.</li>
        <li><b>RuFlo idle</b> — the engine is a CLI; idle means "ready, no active swarm". Ignite shows the true state; it never fakes a start.</li>
      </ul>

      <div className="qg-sec"><IcSend size={14} /> F · COPY-PASTE PROMPTS</div>
      <Prompt title="Audit prompt (paste into a claude terminal)"
        text={"Audit Dragons Alliance IDE end to end: every button must be REAL or honestly disabled with a reason. Check the Superpowers dock, all 7 panels, Admin Command Center (Control Room / Tools / Quick Guide / Reference), Command Palette and every sector. Report file:line for anything dead, fake or mislabeled. Do not modify code."} />
      <Prompt title="Build & typecheck prompt"
        text={"In ~/code/dragons-alliance-ide run: npx tsc --noEmit && npm run build && node scripts/superpowers-doctor.mjs --check. Report each exit code. If red, show the first 10 errors and stop — do not fix without approval."} />
      <Prompt title="Button check prompt"
        text={"Launch the built bundle with --remote-debugging-port=9334 --user-data-dir=/tmp/dai-qa and run node scripts/final-shots.mjs. Report the assertion results verbatim and the screenshot paths."} />
      <Prompt title="Deploy check prompt"
        text={"Compare the installed app build (/Applications/Dragons Alliance IDE.app) against git HEAD in ~/code/dragons-alliance-ide. Report: HEAD sha, installed build sha/date, what the user currently sees vs what is fixed at HEAD, and whether a rebuild + swap (with backup) is needed. Do NOT deploy without explicit confirmation."} />
    </div>
  );
}
