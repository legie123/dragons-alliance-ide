// Dragons Alliance IDE — Electron main process (entry).
// PTY bytes live in a dedicated utilityProcess (pty-host); the renderer talks to
// it over a transferred MessagePort, so the main process never relays terminal IO.
import { app, BrowserWindow, Menu, shell, utilityProcess, MessageChannelMain, type UtilityProcess } from "electron";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { registerIpc } from "./ipc";
import { PORT_CHANNEL } from "../shared/port";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---- Apple-Silicon / macOS native tuning (single-machine: go aggressive) ----
app.commandLine.appendSwitch("use-angle", "metal");          // Metal ANGLE backend (best WebGL on M-series)
app.commandLine.appendSwitch("enable-gpu-rasterization");
app.commandLine.appendSwitch("enable-zero-copy");
app.commandLine.appendSwitch("ignore-gpu-blocklist");
app.commandLine.appendSwitch("js-flags", "--max-semi-space-size=128"); // fewer GC pauses → smoother frames

app.setName("Dragons Alliance IDE");

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let ptyHost: UtilityProcess | null = null;
let isQuitting = false;
// live terminal descriptors, pushed by the pty-host so project enrichment (in main,
// which needs fs) can attribute terminals to projects without owning the PTYs.
let liveTerms: { id: string; cwd: string; is_master: boolean }[] = [];

function startPtyHost(): void {
  ptyHost = utilityProcess.fork(join(__dirname, "host.js"), [], { stdio: "inherit" });
  ptyHost.on("message", (m: any) => {
    if (m && m.t === "terms") liveTerms = m.list ?? [];
  });
  // Supervise: if the host dies, don't leave a stale non-null ref (wirePort would
  // post to a dead process). Clear state and respawn + rewire unless we're quitting.
  ptyHost.on("exit", () => {
    ptyHost = null;
    liveTerms = [];
    if (!isQuitting) {
      startPtyHost();
      const w = BrowserWindow.getAllWindows()[0];
      if (w && !w.isDestroyed()) wirePort(w);
    }
  });
}

/** Establish a fresh renderer↔pty-host MessagePort (new channel per renderer load). */
function wirePort(win: BrowserWindow): void {
  if (!ptyHost) return;
  const { port1, port2 } = new MessageChannelMain();
  ptyHost.postMessage({ t: "port" }, [port1]);            // host side
  win.webContents.postMessage(PORT_CHANNEL, null, [port2]); // renderer side (via preload)
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 1040,
    minHeight: 680,
    backgroundColor: "#05060a",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 18, y: 18 },
    show: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      // sandbox stays false: the MessagePort-based pty-host transport + bundled
      // preload need the non-sandbox preload context. contextIsolation:true still
      // blocks the main renderer→Node RCE path (audit-confirmed).
      sandbox: false,
      contextIsolation: true,
      backgroundThrottling: false, // never throttle a live dev tool when unfocused
    },
  });

  win.once("ready-to-show", () => win.show());
  // (re)establish the pty-host port on every load (covers reloads)
  win.webContents.on("did-finish-load", () => wirePort(win));

  // SECURITY: window.dai (home-tree fs + login-shell spawn) must never reach a
  // remote page. Open external http(s) links (clickable terminal URLs) in the
  // real browser, deny any in-app child window, and pin navigation to our origin.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => {
    const rendererUrl = process.env["ELECTRON_RENDERER_URL"];
    const ok = rendererUrl ? url.startsWith(rendererUrl) : url.startsWith("file://");
    if (!ok) e.preventDefault();
  });
  win.webContents.on("will-attach-webview", (e) => e.preventDefault());

  if (process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"));
  }

  registerIpc(win, () => liveTerms); // fs / projects / sessions / host / window controls (no terminal IO)
}

function buildMenu(): void {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      { role: "appMenu" },
      { role: "editMenu" },
      { role: "viewMenu" },
      { role: "windowMenu" },
    ]),
  );
}

app.whenReady().then(() => {
  startPtyHost();
  createWindow();
  buildMenu();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  isQuitting = true;
  ptyHost?.kill();
});
