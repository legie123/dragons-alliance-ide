// Dragons Alliance IDE — preload. Exposes window.dai.
//  - term.*  : backed by a MessagePort straight to the pty-host (no main hop)
//  - fs/projects/sessions/host/win : ordinary ipcRenderer to the main process
import { contextBridge, ipcRenderer } from "electron";
import { CH } from "../shared/ipc";
import { PORT_CHANNEL } from "../shared/port";
import type { DaiApi } from "../shared/ipc";

// ---- pty-host MessagePort plumbing ----
let port: MessagePort | null = null;
const sendQueue: Array<[unknown, Transferable[]]> = [];
const dataCbs = new Set<(id: string, data: Uint8Array) => void>();
const exitCbs = new Set<(id: string) => void>();
const pending = new Map<number, (v: any) => void>();
let ridSeq = 1;

function post(msg: unknown, transfer: Transferable[] = []): void {
  if (port) port.postMessage(msg, transfer);
  else sendQueue.push([msg, transfer]); // buffer until the port is transferred in
}
function request<T>(make: (rid: number) => unknown): Promise<T> {
  const rid = ridSeq++;
  const p = new Promise<T>((res, rej) => {
    pending.set(rid, res);
    // never hang forever if the host dies / the port never arrives
    setTimeout(() => {
      if (pending.delete(rid)) rej(new Error("pty-host timeout"));
    }, 8000);
  });
  post(make(rid));
  return p;
}

ipcRenderer.on(PORT_CHANNEL, (e) => {
  port = e.ports[0];
  port.onmessage = (ev: MessageEvent) => {
    const m = ev.data;
    if (m.t === "data") {
      const u = new Uint8Array(m.data as ArrayBuffer);
      for (const cb of dataCbs) cb(m.id, u);
    } else if (m.t === "exit") {
      for (const cb of exitCbs) cb(m.id);
    } else if (m.t === "res") {
      const r = pending.get(m.rid);
      if (r) { pending.delete(m.rid); r(m.value); }
    }
  };
  port.start();
  for (const [msg, transfer] of sendQueue) port.postMessage(msg, transfer);
  sendQueue.length = 0;
});

const enc = new TextEncoder();

const dai: DaiApi = {
  term: {
    create(opts) { post({ t: "create", opts }); return Promise.resolve({ id: opts.id }); },
    attach(id) { return request<{ buffer: ArrayBuffer }>((rid) => ({ t: "attach", rid, id })) as any; },
    detach(id) { post({ t: "detach", id }); },
    write(id, data) {
      // NOTE: do NOT transfer the ArrayBuffer — Electron's MessagePortMain (host
      // side) nulls a message that carries a transfer list, so `ev.data` arrives
      // null and the keystroke never reaches the PTY (you'd "type into the void").
      // Keystrokes are tiny, so send the bytes by structured-clone copy instead.
      post({ t: "input", id, data: enc.encode(data).buffer });
    },
    resize(id, cols, rows) { post({ t: "resize", id, cols, rows }); },
    kill(id) { post({ t: "kill", id }); },
    setMirror(id, on, scope = "all", ids) { post({ t: "mirror", id, on, scope, ids }); },
    list() { return request((rid) => ({ t: "list", rid })); },
    broadcast(data, enter, ids) { return request((rid) => ({ t: "broadcast", rid, data, enter, ids })); },
    ack(id, bytes) { post({ t: "ack", id, bytes }); },
    onData(cb) { dataCbs.add(cb); return () => dataCbs.delete(cb); },
    onExit(cb) { exitCbs.add(cb); return () => exitCbs.delete(cb); },
  },
  fs: {
    list: (path) => ipcRenderer.invoke(CH.FS_LIST, path),
    read: (path) => ipcRenderer.invoke(CH.FS_READ, path),
    write: (path, content) => ipcRenderer.invoke(CH.FS_WRITE, { path, content }),
    walk: (root, limit) => ipcRenderer.invoke(CH.FS_WALK, { root, limit }),
  },
  projects: { list: () => ipcRenderer.invoke(CH.PROJECTS_LIST) },
  sessions: {
    list: (activeMin) => ipcRenderer.invoke(CH.SESSIONS_LIST, activeMin),
    transcript: (file, limit) => ipcRenderer.invoke(CH.SESSIONS_TRANSCRIPT, { file, limit }),
    health: (file) => ipcRenderer.invoke(CH.AGENT_HEALTH, file),
  },
  radar: {
    status: () => ipcRenderer.invoke(CH.RADAR_STATUS),
    refresh: () => ipcRenderer.send(CH.RADAR_REFRESH),
  },
  host: { info: () => ipcRenderer.invoke(CH.HOST_INFO) },
  tools: {
    status: () => ipcRenderer.invoke(CH.TOOLS_STATUS),
    action: (id) => ipcRenderer.send(CH.TOOLS_ACTION, id),
  },
  win: {
    minimize: () => ipcRenderer.send(CH.WIN_MIN),
    maxToggle: () => ipcRenderer.send(CH.WIN_MAXTOGGLE),
    close: () => ipcRenderer.send(CH.WIN_CLOSE),
  },
  shell: {
    open: (url) => ipcRenderer.send(CH.SHELL_OPEN, url),
  },
};

contextBridge.exposeInMainWorld("dai", dai);
