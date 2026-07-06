import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { WebglAddon } from "@xterm/addon-webgl";
import "@xterm/xterm/css/xterm.css";
import { useQuery } from "@tanstack/react-query";
import { Term, fetchTermSession, modelGrade, MODEL_KEYS, human, broadcast, gradeColor } from "../api";
import { Crystal } from "./Crystal";
import { IcNodes } from "./icons";
import { useIdleRecap } from "../idleRecap";

const THEME = {
  background: "#0a0c12",
  foreground: "#dbe2f0",
  cursor: "#7c8cff",
  cursorAccent: "#0a0c12",
  selectionBackground: "#2a3350",
  black: "#10141f", red: "#f43f5e", green: "#34d399", yellow: "#fbbf24",
  blue: "#60a5fa", magenta: "#a78bfa", cyan: "#22d3ee", white: "#dbe2f0",
  brightBlack: "#59617a", brightRed: "#fb7185", brightGreen: "#6ee7b7",
  brightYellow: "#fcd34d", brightBlue: "#93c5fd", brightMagenta: "#c4b5fd",
  brightCyan: "#67e8f9", brightWhite: "#ffffff",
};

export type PaneHandle = {
  setMirror: (on: boolean, scope?: string, ids?: string[]) => void;
  focus: () => void;
  fit: () => void;
  clear: () => void;
};

export const TerminalPane = forwardRef<PaneHandle, {
  term: Term;
  isMaster?: boolean;
  active: boolean;
  element?: import("../elements").Element; // elemental crystal identity
  lit?: boolean;                            // synced to master → neon glow (crystal + pane)
  inChannel?: boolean;                      // part of an open peer-mesh channel
  onClose: () => void;
  onStatus?: (s: "open" | "closed") => void;
}>(function TerminalPane({ term, isMaster, active, element, lit, inChannel, onClose, onStatus }, ref) {
  const hostRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const [focused, setFocused] = useState(false);
  const lastActivityRef = useRef(Date.now());
  const exitedRef = useRef(false);

  // per-terminal live session (only claude terminals own a claude session)
  const { data: sess } = useQuery({
    queryKey: ["termsess", term.id, term.cwd],
    queryFn: () => fetchTermSession(term.cwd),
    enabled: term.cmd === "claude",
    refetchInterval: 3000,
  });

  // model switch: label as "switching…" until the next poll re-reads the transcript.
  const [menuOpen, setMenuOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const switchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (switchTimer.current) clearTimeout(switchTimer.current); }, []);
  const pickModel = (name: string) => {
    broadcast("/model " + name, true, [term.id]);
    setMenuOpen(false);
    setSwitching(name);
    if (switchTimer.current) clearTimeout(switchTimer.current);
    switchTimer.current = setTimeout(() => setSwitching(null), 4000);
  };
  const grade = sess ? modelGrade(sess.model) : null;
  const recap = useIdleRecap({ cmd: term.cmd, focused, sess: sess ?? null, exitedRef, xtermRef, lastActivityRef });

  useImperativeHandle(ref, () => ({
    setMirror(on: boolean, scope: string = "all", ids?: string[]) {
      window.dai.term.setMirror(term.id, on, scope, ids);
    },
    focus() { xtermRef.current?.focus(); },
    fit() { safeFit(); },
    clear() { xtermRef.current?.clear(); },
  }));

  function safeFit() {
    const host = hostRef.current;
    const fit = fitRef.current;
    const xt = xtermRef.current;
    if (!host || !fit || !xt) return;
    if (host.clientWidth < 40 || host.clientHeight < 40) return; // not laid out yet
    try {
      fit.fit();
      window.dai.term.resize(term.id, xt.cols, xt.rows);
    } catch {}
  }

  useEffect(() => {
    let disposed = false;
    let ro: ResizeObserver | null = null;
    let offData: (() => void) | null = null;
    let offExit: (() => void) | null = null;

    (async () => {
      // wait for fonts so char measurement is correct (root cause of giant cursor)
      try { await (document as any).fonts?.ready; } catch {}
      if (disposed || !hostRef.current) return;

      // wait until the container actually has a size
      await new Promise<void>((res) => {
        const tick = () => {
          if (disposed) return res();
          const h = hostRef.current;
          if (h && h.clientWidth > 40 && h.clientHeight > 40) return res();
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      if (disposed || !hostRef.current) return;

      const xt = new Terminal({
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 13,
        lineHeight: 1.2,
        letterSpacing: 0,
        cursorBlink: true,
        cursorStyle: "bar",
        theme: THEME,
        allowProposedApi: true,
        smoothScrollDuration: 0,
        scrollback: 5000,
      });
      const fit = new FitAddon();
      xt.loadAddon(fit);
      xt.loadAddon(new WebLinksAddon());
      xt.open(hostRef.current);
      // GPU-accelerated rendering (perf); silently fall back to DOM if unavailable
      try {
        const webgl = new WebglAddon();
        webgl.onContextLoss(() => webgl.dispose());
        xt.loadAddon(webgl);
      } catch {}
      xtermRef.current = xt;
      fitRef.current = fit;

      // reflect real terminal focus in the UI (focus ring) so you always know
      // which pane your keystrokes go to.
      const tarea = hostRef.current.querySelector(".xterm-helper-textarea");
      if (tarea) {
        tarea.addEventListener("focus", () => setFocused(true));
        tarea.addEventListener("blur", () => setFocused(false));
      }

      // double rAF then fit (layout settled)
      requestAnimationFrame(() => requestAnimationFrame(() => safeFit()));

      // spawn (idempotent on the main side) then replay scrollback before live data
      window.dai.term.create({ id: term.id, cmd: term.cmd, cwd: term.cwd, master: !!isMaster });
      let buffer: ArrayBuffer | string | undefined;
      try {
        ({ buffer } = await window.dai.term.attach(term.id));
      } catch {
        // pty-host unavailable / timed out — don't hang the pane forever
        if (!disposed) xt.writeln("\r\n\x1b[31m[ terminal host unavailable — reload the window ]\x1b[0m");
        return;
      }
      if (disposed) return;
      if (buffer) xt.write(typeof buffer === "string" ? buffer : new Uint8Array(buffer));

      offData = window.dai.term.onData((tid, data) => {
        if (tid !== term.id) return;
        lastActivityRef.current = Date.now();
        xt.write(data, () => window.dai.term.ack(term.id, data.byteLength));
      });
      offExit = window.dai.term.onExit((tid) => {
        if (tid === term.id) {
          exitedRef.current = true;
          xt.writeln("\r\n\x1b[2m[ closed ]\x1b[0m");
          onStatus?.("closed");
        }
      });

      safeFit();
      onStatus?.("open");

      xt.onData((d) => {
        lastActivityRef.current = Date.now();
        window.dai.term.write(term.id, d);
      });
      xt.onResize(({ cols, rows }) => window.dai.term.resize(term.id, cols, rows));

      ro = new ResizeObserver(() => safeFit());
      ro.observe(hostRef.current);
    })();

    return () => {
      disposed = true;
      ro?.disconnect();
      offData?.();
      offExit?.();
      // tell the host this pane is gone so it stops streaming + counting for this
      // session (a hidden/filtered worker must not inflate unacked with no viewer).
      // The PTY itself stays alive — only the explicit close button kills it.
      try { window.dai.term.detach(term.id); } catch { /* host may be gone */ }
      xtermRef.current?.dispose();
      xtermRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (active) {
      // Re-fit on activation. Auto-focus ONLY workers (not the master) so a
      // freshly-launched claude grabs focus and the master never silently steals
      // keystrokes out from under a worker in grid mode. Click-to-focus (below)
      // is the authoritative way to move focus to any pane, including master.
      const t = setTimeout(() => { safeFit(); if (!isMaster) xtermRef.current?.focus(); }, 70);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Clicking anywhere in the pane focuses ITS terminal, so keystrokes always go
  // where you clicked (the padding around xterm previously ate the click and
  // focus stayed on the wrong terminal — you'd "type into the void").
  const focusMe = () => xtermRef.current?.focus();

  const paneStyle = element
    ? { ["--el" as any]: element.color, ["--el-glow" as any]: element.glow }
    : undefined;
  return (
    <div
      className={`term-pane${isMaster ? " master" : ""}${focused ? " focused" : ""}${lit ? " lit" : ""}${inChannel ? " channel" : ""}`}
      style={paneStyle}
      onMouseDown={focusMe}
    >
      <div className="term-head">
        {element ? (
          <Crystal el={element} lit={!!lit} size={16} />
        ) : (
          <span className={`tdot tdot-${term.cmd}`} />
        )}
        <span className="tname">
          {isMaster ? "MASTER" : element ? element.name : term.cmd === "claude" ? "claude" : "zsh"}
        </span>
        {inChannel && <span className="tchan" title="interconnected — co-typing channel"><IcNodes size={11} /></span>}
        <span className="tcwd">{term.cwd.replace(/^\/Users\/[^/]+/, "~")}</span>
        {!isMaster && <button className="tx" onClick={onClose} title="kill terminal" aria-label="Kill terminal">✕</button>}
      </div>
      {term.cmd === "claude" ? (
        <div className="term-infobar">
          <span className="ti-agent claude">⬖ claude</span>
          {sess ? (
            <>
              <span className="ti-model">{sess.model}</span>
              <span className="ti-tok">{human(sess.ctx)}</span>
              <span className="ti-cap">{sess.capacity.toFixed(0) + "%"}</span>
              {grade && <span className={`ti-grade ti-grade-${grade}`}>{grade}</span>}
              {sess.ambiguous && (
                <span className="ti-ambiguous" title="2+ claude sessions share this cwd — can't be sure which">· ambiguous</span>
              )}
            </>
          ) : (
            <span className="ti-none">no live session</span>
          )}
          {switching && <span className="ti-switching">switching → {switching}…</span>}
          <span className="ti-modelbtn-wrap">
            <button className="ti-modelbtn" onClick={() => setMenuOpen((o) => !o)} title="switch model for this terminal">model ▾</button>
            {menuOpen && (
              <div className="ti-modelmenu">
                {MODEL_KEYS.map((name) => (
                  <button key={name} className="ti-modelrow" onClick={() => pickModel(name)}>{name}</button>
                ))}
              </div>
            )}
          </span>
        </div>
      ) : (
        <div className="term-infobar">
          <span className="ti-agent">⌘ shell</span>
        </div>
      )}
      {recap && (
        <div className="term-recap">
          <span className="tr-tag">auto recap · idle 2m</span>
          {recap.unavailable ? (
            <span className="tr-line tr-muted">Recap unavailable — not enough activity yet.</span>
          ) : (
            <>
              <span className="tr-line"><b>Session:</b> {recap.session}</span>
              <span className="tr-line"><b>Status:</b> {recap.status}</span>
              {recap.context && <span className="tr-line">{recap.context}</span>}
              {recap.reason && <span className="tr-line"><b>Reason:</b> {recap.reason}</span>}
              {typeof recap.understanding === "number" && (
                <span className="pr-bar-row">
                  <span className="pr-bar-label">UNDR</span>
                  <span className="pr-bar">
                    <span className="pr-bar-fill" style={{ width: `${recap.understanding}%`, background: gradeColor(recap.understanding) }} />
                  </span>
                  <span className="pr-bar-val">{recap.understanding.toFixed(0)}%</span>
                </span>
              )}
              {recap.lastAction && <span className="tr-line"><b>Last action:</b> {recap.lastAction}</span>}
              {recap.next && <span className="tr-line"><b>Next:</b> {recap.next}</span>}
            </>
          )}
        </div>
      )}
      <div className="term-body" ref={hostRef} onMouseDown={focusMe} />
    </div>
  );
});
