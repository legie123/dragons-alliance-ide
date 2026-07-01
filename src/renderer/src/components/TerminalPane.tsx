import { useEffect, useImperativeHandle, useRef, forwardRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { WebglAddon } from "@xterm/addon-webgl";
import "@xterm/xterm/css/xterm.css";
import { Term } from "../api";

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
  setMirror: (on: boolean, scope?: string) => void;
  focus: () => void;
  fit: () => void;
  clear: () => void;
};

export const TerminalPane = forwardRef<PaneHandle, {
  term: Term;
  isMaster?: boolean;
  active: boolean;
  onClose: () => void;
  onStatus?: (s: "open" | "closed") => void;
}>(function TerminalPane({ term, isMaster, active, onClose, onStatus }, ref) {
  const hostRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);

  useImperativeHandle(ref, () => ({
    setMirror(on: boolean, scope: string = "all") {
      window.dai.term.setMirror(term.id, on, scope);
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
        if (tid === term.id) xt.write(data, () => window.dai.term.ack(term.id, data.byteLength));
      });
      offExit = window.dai.term.onExit((tid) => {
        if (tid === term.id) {
          xt.writeln("\r\n\x1b[2m[ closed ]\x1b[0m");
          onStatus?.("closed");
        }
      });

      safeFit();
      onStatus?.("open");

      xt.onData((d) => window.dai.term.write(term.id, d));
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
      const t = setTimeout(() => { safeFit(); xtermRef.current?.focus(); }, 70);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div className={`term-pane${isMaster ? " master" : ""}`}>
      <div className="term-head">
        <span className={`tdot tdot-${term.cmd}`} />
        <span className="tname">
          {isMaster ? "MASTER" : term.cmd === "claude" ? "claude" : "zsh"}
        </span>
        <span className="tcwd">{term.cwd.replace(/^\/Users\/[^/]+/, "~")}</span>
        {!isMaster && <button className="tx" onClick={onClose} title="kill terminal">✕</button>}
      </div>
      <div className="term-body" ref={hostRef} />
    </div>
  );
});
