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
    setChannel(id, channel) { post({ t: "channel", id, channel }); },
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
    session: (cwd) => ipcRenderer.invoke(CH.TERM_SESSION, cwd),
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
  system: {
    checkCommand: (cmd) => ipcRenderer.invoke(CH.SYSTEM_CHECK_COMMAND, cmd),
  },
  win: {
    minimize: () => ipcRenderer.send(CH.WIN_MIN),
    maxToggle: () => ipcRenderer.send(CH.WIN_MAXTOGGLE),
    close: () => ipcRenderer.send(CH.WIN_CLOSE),
  },
  shell: {
    open: (url) => ipcRenderer.send(CH.SHELL_OPEN, url),
  },
  neuromap: {
    graph: (opts) => ipcRenderer.invoke(CH.NEUROMAP_GRAPH, opts),
    node: (id) => ipcRenderer.invoke(CH.NEUROMAP_NODE, id),
    watch: (layers) => ipcRenderer.send(CH.NEUROMAP_WATCH, layers),
    onChanged: (cb) => {
      const h = (_e: unknown, changed: string[]) => cb(changed);
      ipcRenderer.on(CH.NEUROMAP_CHANGED, h);
      return () => ipcRenderer.removeListener(CH.NEUROMAP_CHANGED, h);
    },
  },
  gdrive: {
    status: () => ipcRenderer.invoke(CH.GDRIVE_STATUS),
    auth: () => ipcRenderer.invoke(CH.GDRIVE_AUTH),
    signout: () => ipcRenderer.invoke(CH.GDRIVE_SIGNOUT),
    setClient: (clientId, clientSecret) => ipcRenderer.invoke(CH.GDRIVE_SET_CLIENT, { clientId, clientSecret }),
    list: (folderId) => ipcRenderer.invoke(CH.GDRIVE_LIST, folderId),
    search: (query) => ipcRenderer.invoke(CH.GDRIVE_SEARCH, query),
    read: (fileId) => ipcRenderer.invoke(CH.GDRIVE_READ, fileId),
    backup: () => ipcRenderer.invoke(CH.GDRIVE_BACKUP),
  },
  neo: {
    status: () => ipcRenderer.invoke(CH.NEO_STATUS),
    ensure: () => ipcRenderer.invoke(CH.NEO_ENSURE),
    tabs: () => ipcRenderer.invoke(CH.NEO_TABS),
    open: (url) => ipcRenderer.invoke(CH.NEO_OPEN, url),
    navigate: (url, tab) => ipcRenderer.invoke(CH.NEO_NAVIGATE, { url, tab }),
    reload: (tab) => ipcRenderer.invoke(CH.NEO_RELOAD, tab),
    back: (tab) => ipcRenderer.invoke(CH.NEO_BACK, tab),
    forward: (tab) => ipcRenderer.invoke(CH.NEO_FORWARD, tab),
    ask: (prompt, submit) => ipcRenderer.invoke(CH.NEO_ASK, { prompt, submit }),
    click: (x, y, tab) => ipcRenderer.invoke(CH.NEO_CLICK, { x, y, tab }),
    scroll: (dy, tab) => ipcRenderer.invoke(CH.NEO_SCROLL, { dy, tab }),
    snap: (tab) => ipcRenderer.invoke(CH.NEO_SNAP, tab),
  },
  google: {
    ensureTree: () => ipcRenderer.invoke(CH.GOOGLE_ENSURE_TREE),
    folderCreate: (name, parentId) => ipcRenderer.invoke(CH.GOOGLE_FOLDER_CREATE, { name, parentId }),
    upload: (localPath, folderId, convert) => ipcRenderer.invoke(CH.GOOGLE_UPLOAD, { localPath, folderId, convert }),
    sheetCreate: (title, folderId) => ipcRenderer.invoke(CH.SHEET_CREATE, { title, folderId }),
    sheetRead: (id, range) => ipcRenderer.invoke(CH.SHEET_READ, { id, range }),
    sheetUpdate: (id, range, values) => ipcRenderer.invoke(CH.SHEET_UPDATE, { id, range, values }),
    formCreate: (title) => ipcRenderer.invoke(CH.FORM_CREATE, title),
    formResponses: (formId) => ipcRenderer.invoke(CH.FORM_RESPONSES, formId),
    mailSearch: (q) => ipcRenderer.invoke(CH.MAIL_SEARCH, q),
    mailGet: (id) => ipcRenderer.invoke(CH.MAIL_GET, id),
    mailSaveAttachment: (msgId, attId, filename, folderId) => ipcRenderer.invoke(CH.MAIL_SAVE_ATTACHMENT, { msgId, attId, filename, folderId }),
    health: () => ipcRenderer.invoke(CH.GOOGLE_HEALTH),
  },
  meta: {
    list: (filter) => ipcRenderer.invoke(CH.META_LIST, filter),
    upsert: (entry) => ipcRenderer.invoke(CH.META_UPSERT, entry),
    candidateCreate: (name) => ipcRenderer.invoke(CH.CANDIDATE_CREATE, name),
  },
  proton: {
    status: () => ipcRenderer.invoke(CH.PROTON_STATUS),
    setConfig: (host, port, user) => ipcRenderer.invoke(CH.PROTON_SET_CONFIG, { host, port, user }),
  },
  settings: {
    get: () => ipcRenderer.invoke(CH.SETTINGS_GET),
    set: (patch) => ipcRenderer.invoke(CH.SETTINGS_SET, patch),
  },
  audit: {
    list: (limit) => ipcRenderer.invoke(CH.AUDIT_LIST, limit),
    log: (kind, detail) => ipcRenderer.send(CH.AUDIT_LOG, { kind, detail }),
  },
  tips: {
    list: () => ipcRenderer.invoke(CH.TIPS_LIST),
    upsert: (entry) => ipcRenderer.invoke(CH.TIPS_UPSERT, entry),
    delete: (id) => ipcRenderer.invoke(CH.TIPS_DELETE, id),
  },
  team: {
    get: () => ipcRenderer.invoke(CH.TEAM_GET),
    set: (config) => ipcRenderer.invoke(CH.TEAM_SET, config),
    me: () => ipcRenderer.invoke(CH.TEAM_ME),
    setIdentity: (memberId) => ipcRenderer.invoke(CH.IDENTITY_SET, memberId),
  },
  vaultSync: {
    status: () => ipcRenderer.invoke(CH.VAULT_STATUS),
    sync: (message) => ipcRenderer.invoke(CH.VAULT_SYNC, message),
    setRemote: (url) => ipcRenderer.invoke(CH.VAULT_SET_REMOTE, url),
  },
  shot: { capture: () => ipcRenderer.invoke(CH.SHOT_CAPTURE) },
  llm: {
    status: () => ipcRenderer.invoke(CH.LLM_STATUS),
    set: (provider, patch) => ipcRenderer.invoke(CH.LLM_SET, provider, patch),
    test: (provider) => ipcRenderer.invoke(CH.LLM_TEST, provider),
    chat: (model, messages, tools) => ipcRenderer.invoke(CH.LLM_CHAT, model, messages, tools),
  },
  browsers: {
    detect: () => ipcRenderer.invoke(CH.BROWSERS_DETECT),
    open: (id, url) => ipcRenderer.invoke(CH.BROWSER_OPEN, id, url),
  },
  superpowers: {
    health: (id) => ipcRenderer.invoke(CH.SP_HEALTH, id),
    openDigest: () => ipcRenderer.invoke(CH.SP_OPEN_DIGEST),
    rufloQueue: () => ipcRenderer.invoke(CH.SP_RUFLO_QUEUE),
  },
};

contextBridge.exposeInMainWorld("dai", dai);
