// Research — houses the Obscura research tool. Obscura is an UNTRUSTED external
// repo (github.com/h4ckf0r0day/obscura). Per security policy we do NOT auto-clone
// or npm-install it; the UI shows exact config steps + status and stays a real
// structure. Once vetted + configured, results become Research Items in Neuromap.
import { useState } from "react";

const OBSCURA = "https://github.com/h4ckf0r0day/obscura.git";

export function ResearchView() {
  const [query, setQuery] = useState("");
  const [history] = useState<string[]>([]);

  return (
    <div className="rs-view">
      <div className="rs-bar">
        <span className="rs-title">🔎 RESEARCH</span>
        <span className="rs-tool">Obscura</span>
        <span className="rs-status needs">● needs review + config</span>
      </div>

      <div className="rs-body">
        <div className="rs-main">
          <div className="rs-run">
            <input className="rs-q" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="research query…" disabled />
            <button className="rs-go" disabled title="configure Obscura first">Run research</button>
          </div>
          <div className="rs-output">
            <div className="rs-out-head">Output</div>
            <div className="rs-out-body rs-empty">
              No runs yet. Obscura is not installed in this environment.
            </div>
          </div>
          <div className="rs-logs">
            <div className="rs-out-head">History</div>
            {history.length === 0 ? <div className="rs-empty">no history</div> : history.map((h, i) => <div key={i} className="rs-log-row">{h}</div>)}
          </div>
        </div>

        <aside className="rs-config">
          <div className="rs-cfg-head">⚠ Untrusted external tool</div>
          <p className="rs-cfg-note">
            <code>{OBSCURA}</code> is a third-party repo. Cloning + <code>npm install</code> runs
            arbitrary code. It was <b>not</b> auto-installed. Steps to enable after you approve:
          </p>
          <ol className="rs-cfg-steps">
            <li>Review the repo source (owner, code, postinstall scripts).</li>
            <li>If trusted: <code>git clone {OBSCURA} ~/code/obscura</code></li>
            <li><code>cd ~/code/obscura &amp;&amp; npm install</code> (inspect first).</li>
            <li>Provide any required API keys in <code>.env.local</code> (never committed).</li>
            <li>Then the Run button + result → Neuromap Research Items get wired.</li>
          </ol>
          <div className="rs-cfg-foot">Results, once configured, become <b>Research Item</b> nodes (teal) in Neuromap.</div>
        </aside>
      </div>
    </div>
  );
}
