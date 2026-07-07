// Preview — live-view a project inside the IDE. For Chrome/Brave/Safari it embeds
// the dev-server URL in an <iframe>. For **Neo** it drives the *real* Neo browser
// over CDP (via window.dai.neo): a live screenshot frame you can click/scroll into,
// reload/back/forward controls, and a chat-agent wired to Neo's Magic Page.
import { useEffect, useRef, useState } from "react";
import { IcMonitor, IcPlay, IcRefresh, IcExternal, IcZap, IcBot, IcTerminal } from "../components/icons";
import { useQuery } from "@tanstack/react-query";
import { fetchProjects } from "../api";
import { pushToast } from "../toast";
import type { NeoStatus, NeoSnap, BrowserInfo } from "@shared/ipc";

const BROWSERS = ["Neo", "Chrome", "Brave", "Safari"];

type ChatLine = { role: "user" | "neo" | "err"; text: string };

export function PreviewView() {
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: fetchProjects, refetchInterval: 5000 });
  const [browser, setBrowser] = useState("Neo");
  const [proj, setProj] = useState<string>("");
  const [url, setUrl] = useState("http://localhost:3000");
  const [live, setLive] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [cmd, setCmd] = useState("");
  const [chat, setChat] = useState("");
  const activeProj = projects.find((p) => p.path === proj);
  const isNeo = browser === "Neo";
  const urlOk = /^https?:\/\//.test(url);

  // Real installed-browser scan (main does the /Applications check — cheap, cached long).
  const { data: detected, refetch: redetect, isFetching: detecting } = useQuery({
    queryKey: ["browsers"],
    queryFn: () => window.dai.browsers.detect(),
    staleTime: 10 * 60 * 1000,
  });
  // detect() always appends "System default"; keep that button real even pre-scan/on failure.
  const browserBtns: BrowserInfo[] = detected?.browsers?.length
    ? detected.browsers
    : [{ id: "default", label: "System default", app: "", path: "" }];

  // ---- Neo state ----
  const [neoConn, setNeoConn] = useState<NeoStatus | null>(null);
  const [snap, setSnap] = useState<NeoSnap | null>(null);
  const [neoBusy, setNeoBusy] = useState(false);
  const [neoErr, setNeoErr] = useState("");
  const [chatLog, setChatLog] = useState<ChatLine[]>([]);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Live screenshot polling while a Neo preview is running.
  useEffect(() => {
    if (!(live && isNeo && neoConn?.connected)) return;
    let stop = false;
    const tick = async () => {
      if (stop) return;
      try { const s = await window.dai.neo.snap(); if (!stop && s) setSnap(s); } catch { /* transient */ }
    };
    tick();
    const iv = setInterval(tick, 1600);
    return () => { stop = true; clearInterval(iv); };
  }, [live, isNeo, neoConn?.connected, nonce]);

  async function refreshSnap() {
    try { const s = await window.dai.neo.snap(); if (s) setSnap(s); } catch { /* ignore */ }
  }

  async function start() {
    if (isNeo) {
      setLive(true); setNeoErr(""); setNeoBusy(true);
      try {
        let st = await window.dai.neo.status();
        if (!st.connected) st = await window.dai.neo.ensure();
        setNeoConn(st);
        if (st.connected) {
          if (/^https?:\/\//.test(url)) await window.dai.neo.open(url);
          setNonce((n) => n + 1);
        } else {
          setNeoErr(st.error || "Neo not reachable on the debug port.");
        }
      } catch (e) {
        setNeoErr(String((e as Error)?.message || e));
      } finally { setNeoBusy(false); }
    } else {
      setLive(true); setNonce((n) => n + 1);
    }
  }

  async function reload() {
    if (isNeo && neoConn?.connected) { await window.dai.neo.reload().catch(() => {}); await refreshSnap(); }
    else setNonce((n) => n + 1);
  }

  function onFrameClick(e: React.MouseEvent<HTMLImageElement>) {
    if (!isNeo || !snap) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * snap.vw;
    const y = ((e.clientY - r.top) / r.height) * snap.vh;
    window.dai.neo.click(x, y).then(() => setTimeout(refreshSnap, 400)).catch(() => {});
  }
  function onFrameWheel(e: React.WheelEvent<HTMLImageElement>) {
    if (!isNeo || !snap) return;
    window.dai.neo.scroll(e.deltaY).then(() => setTimeout(refreshSnap, 250)).catch(() => {});
  }

  async function sendChat() {
    const q = chat.trim();
    if (!q || !isNeo) return;
    setChat("");
    setChatLog((l) => [...l, { role: "user", text: q }]);
    try {
      await window.dai.neo.ask(q, true);
      setChatLog((l) => [...l, { role: "neo", text: "→ sent to Neo Magic Page" }]);
    } catch (e) {
      setChatLog((l) => [...l, { role: "err", text: String((e as Error)?.message || e) }]);
    }
  }

  // Micro Terminal: run the quick command for REAL — spawn a shell worker in the
  // selected project's cwd via the terminal host, type the command, jump to the
  // Terminal deck to watch it. (Was a dead click that only cleared the input.)
  function runMicro() {
    const c = cmd.trim();
    if (!c || !activeProj) return;
    const id = `pv${Date.now().toString(36)}`;
    window.dai.term.create({ id, cmd: "shell", cwd: activeProj.path });
    setTimeout(() => window.dai.term.write(id, c + "\n"), 1200); // let the shell settle
    window.dai.audit.log("preview-run", `${c} @ ${activeProj.name}`);
    pushToast({ kind: "info", title: `Ran in ${activeProj.name}`, detail: c, ttl: 3500 });
    setCmd("");
    window.dispatchEvent(new CustomEvent("dai:goto", { detail: "ide" }));
  }

  // Browsers row: re-scan on demand, toast the honest count.
  async function detectBrowsers() {
    const res = await redetect();
    if (!res.data) {
      pushToast({ kind: "error", title: "Browser detection failed", detail: String((res.error as Error)?.message || res.error || "unknown error"), ttl: 4000 });
      return;
    }
    const real = res.data.browsers.filter((b) => b.id !== "default");
    pushToast({
      kind: "info",
      title: `Detected ${real.length} browser${real.length === 1 ? "" : "s"}`,
      detail: real.length ? real.map((b) => b.label).join(", ") : "none found — System default still works",
      ttl: 3500,
    });
  }

  // Login-safe open: launches the user's OWN browser/profile via main's whitelist-only
  // `open -a`. They sign in themselves — the IDE never touches credentials or sessions.
  async function openIn(b: BrowserInfo) {
    if (!urlOk) return;
    try {
      const res = await window.dai.browsers.open(b.id, url);
      window.dai.audit.log("preview-browser-open", `${b.label}: ${url.slice(0, 120)} — ${res.ok ? "ok" : res.message}`);
      pushToast({
        kind: res.ok ? "success" : "error",
        title: res.ok ? `Opened in ${b.label}` : `Could not open ${b.label}`,
        detail: res.message, ttl: 4000,
      });
    } catch (e) {
      pushToast({ kind: "error", title: `Could not open ${b.label}`, detail: String((e as Error)?.message || e), ttl: 4000 });
    }
  }

  // right-rail actions: pv:refresh → reload, pv:external → open in system browser
  useEffect(() => {
    const h = (e: Event) => {
      const a = (e as CustomEvent).detail;
      if (a === "pv:refresh") reload();
      else if (a === "pv:external" && /^https?:\/\//.test(url)) window.dai.shell?.open?.(url);
    };
    window.addEventListener("dai:sector-action", h);
    return () => window.removeEventListener("dai:sector-action", h);
  });

  const showNeoFrame = isNeo && live;
  const showIframe = !isNeo && live && /^https?:\/\//.test(url);

  return (
    <div className="pv-view">
      <div className="pv-bar">
        <span className="pv-title"><IcMonitor /> PREVIEW</span>
        <select className="pv-sel" value={proj} onChange={(e) => setProj(e.target.value)}>
          <option value="">select project…</option>
          {projects.map((p) => <option key={p.path} value={p.path}>{p.name}</option>)}
        </select>
        <select className="pv-sel" value={browser} onChange={(e) => { setBrowser(e.target.value); setLive(false); setSnap(null); }}>
          {BROWSERS.map((b) => <option key={b} value={b}>{b}{b === "Neo" ? " · CDP" : ""}</option>)}
        </select>
        <input className="pv-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="dev server url (e.g. http://localhost:3000)" />
        <button className="pv-go" onClick={start} disabled={neoBusy}>{neoBusy ? "…" : <><IcPlay size={11} /> Start</>}</button>
        <button className="pv-btn" onClick={reload} disabled={!live}><IcRefresh size={11} /> Reload</button>
        {isNeo && (
          <>
            <button className="pv-btn" onClick={() => window.dai.neo.back().then(() => setTimeout(refreshSnap, 500))} disabled={!live || !neoConn?.connected} title="Neo back" aria-label="Neo back">←</button>
            <button className="pv-btn" onClick={() => window.dai.neo.forward().then(() => setTimeout(refreshSnap, 500))} disabled={!live || !neoConn?.connected} title="Neo forward" aria-label="Neo forward">→</button>
          </>
        )}
        <button className="pv-btn" onClick={() => window.dai.shell?.open?.(url)} disabled={!urlOk}><IcExternal size={11} /> Open external</button>
      </div>

      <div className="pv-bar">
        <span className="pv-title" style={{ fontSize: 11 }}><IcExternal size={11} /> BROWSERS</span>
        <button className="pv-btn" onClick={detectBrowsers} disabled={detecting}
          title="Rescan /Applications for installed browsers">{detecting ? "detecting…" : "Detect Browsers"}</button>
        {browserBtns.map((b) => (
          <button key={b.id} className="pv-btn" onClick={() => openIn(b)} disabled={!urlOk}
            title={!urlOk ? "enter a valid http(s) URL first" : `Open ${url} in ${b.label} (your own profile)`}>
            Open in {b.label}
          </button>
        ))}
        <span className="pv-empty-hint" style={{ marginLeft: "auto" }}>
          Opens YOUR browser/profile — sign in manually; the IDE never touches credentials or sessions.
        </span>
      </div>

      <div className="pv-body">
        <div className="pv-frame-wrap">
          <div className="pv-frame-head">
            <span className={`pv-dot ${live && (!isNeo || neoConn?.connected) ? "on" : ""}`} />
            <span className="pv-frame-url">{showNeoFrame ? (snap?.url || url) : (live ? url : "no server started")}</span>
            <span className="pv-frame-meta">{browser}{isNeo && neoConn?.connected ? " · live" : ""}{activeProj ? " · " + activeProj.name : ""}</span>
          </div>

          {showNeoFrame ? (
            neoConn?.connected ? (
              snap ? (
                <img ref={imgRef} className="pv-neo-img" src={snap.dataUrl} alt="Neo live"
                  title="Click / scroll here to drive Neo"
                  onClick={onFrameClick} onWheel={onFrameWheel} draggable={false} />
              ) : (
                <div className="pv-empty"><div>Opening in Neo…</div>
                  <div className="pv-empty-hint">Capturing live view of the real Neo browser.</div></div>
              )
            ) : (
              <div className="pv-empty">
                <div>Neo isn’t on its debug port yet.</div>
                <div className="pv-empty-hint">{neoErr || "Click Start to (re)launch Neo with debugging."}</div>
                <button className="pv-go" style={{ marginTop: 10 }} disabled={neoBusy}
                  onClick={async () => { setNeoBusy(true); const st = await window.dai.neo.ensure(); setNeoConn(st); setNeoErr(st.error || ""); if (st.connected && /^https?:\/\//.test(url)) { await window.dai.neo.open(url); setNonce((n) => n + 1); } setNeoBusy(false); }}>
                  {neoBusy ? "connecting…" : <><IcZap size={11} /> Connect Neo</>}
                </button>
              </div>
            )
          ) : showIframe ? (
            <iframe key={nonce} className="pv-iframe" src={url} title="preview" sandbox="allow-scripts allow-same-origin allow-forms" />
          ) : (
            <div className="pv-empty">
              <div>Start a dev server for the selected project, enter its URL, then press Start.</div>
              <div className="pv-empty-hint">
                {isNeo
                  ? "Neo mode drives the real Neo browser — you can click & scroll right in this frame."
                  : <>The IDE does not auto-launch servers yet — run <code>npm run dev</code> in a terminal and paste the URL.</>}
              </div>
            </div>
          )}
        </div>

        <aside className="pv-side">
          <div className="pv-panel">
            <div className="pv-panel-head"><IcBot size={12} /> {isNeo ? "Neo Magic Page" : "Preview Chat-Agent"}</div>
            <div className="pv-chat-log">
              {isNeo ? (
                chatLog.length === 0 ? (
                  <div className="pv-chat-hint">Send a prompt straight into Neo’s Magic Page AI.
                    {activeProj ? ` Context: ${activeProj.name}.` : ""}</div>
                ) : chatLog.map((m, i) => (
                  <div key={i} className={`pv-chat-line pv-chat-${m.role}`}>{m.text}</div>
                ))
              ) : (
                <div className="pv-chat-hint">Discuss the previewed project with an agent in context.
                  {activeProj ? ` Context: ${activeProj.name}.` : " Select a project first."}
                  <br />Wiring to a live agent — needs config (API key / route).</div>
              )}
            </div>
            <div className="pv-chat-in">
              <input value={chat} onChange={(e) => setChat(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendChat(); }}
                placeholder={isNeo ? "ask Neo’s Magic Page…" : "ask about this project…"} disabled={!isNeo} />
              <button disabled={!isNeo || !chat.trim()} onClick={sendChat}
                title={isNeo ? "Send to Neo Magic Page" : "needs agent route config"}>Send</button>
            </div>
          </div>

          <div className="pv-panel">
            <div className="pv-panel-head"><IcTerminal size={12} /> Micro Terminal <span className="pv-cwd">{activeProj ? activeProj.name : "no project"}</span></div>
            <div className="pv-micro-out">Project-scoped quick commands. Runs in the selected project's cwd.
              <br />Executes via the terminal host — pick a project to enable.</div>
            <div className="pv-micro-in">
              <input value={cmd} onChange={(e) => setCmd(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") runMicro(); }}
                placeholder="quick command (e.g. npm run build)" disabled={!activeProj} />
              <button disabled={!activeProj || !cmd.trim()}
                title={!activeProj ? "select a project first" : "runs in the project's terminal"}
                onClick={runMicro}>Run</button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
