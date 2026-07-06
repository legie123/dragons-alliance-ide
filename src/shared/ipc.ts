// Dragons Alliance IDE — IPC contract (single source of truth).
// Shared by main (handlers), preload (contextBridge), renderer (window.dai).

// ---- channels ----
export const CH = {
  // terminal (invoke)
  TERM_CREATE: "term:create",
  TERM_ATTACH: "term:attach",
  TERM_WRITE: "term:write",
  TERM_RESIZE: "term:resize",
  TERM_KILL: "term:kill",
  TERM_MIRROR: "term:mirror",
  TERM_LIST: "term:list",
  TERM_BROADCAST: "term:broadcast",
  // terminal (events main→renderer)
  TERM_DATA: "term:data",   // { id, data }
  TERM_EXIT: "term:exit",   // { id }
  // fs
  FS_LIST: "fs:list",
  FS_READ: "fs:read",
  FS_WRITE: "fs:write",
  FS_WALK: "fs:walk",
  // data
  PROJECTS_LIST: "projects:list",
  SESSIONS_LIST: "sessions:list",
  SESSIONS_TRANSCRIPT: "sessions:transcript",
  TERM_SESSION: "term:session",
  TOOLS_STATUS: "tools:status",
  TOOLS_ACTION: "tools:action",
  RADAR_STATUS: "radar:status",
  RADAR_REFRESH: "radar:refresh",
  AGENT_HEALTH: "agent:health",
  HOST_INFO: "host:info",
  // window controls (frameless titlebar)
  WIN_MIN: "win:minimize",
  WIN_MAXTOGGLE: "win:maxtoggle",
  WIN_CLOSE: "win:close",
  // shell
  SHELL_OPEN: "shell:open",   // open an external URL in the default browser
  // neuromap (Obsidian vault knowledge graph)
  NEUROMAP_GRAPH: "neuromap:graph",     // invoke(opts) → NeuroGraph
  NEUROMAP_NODE: "neuromap:node",       // invoke(id) → NeuroNodeDetail
  NEUROMAP_WATCH: "neuromap:watch",     // send(layers[]) → (re)arm fs.watch
  NEUROMAP_CHANGED: "neuromap:changed", // event main→renderer { changed: string[] }
  // google drive
  GDRIVE_STATUS: "gdrive:status",       // invoke() → GDriveStatus
  GDRIVE_AUTH: "gdrive:auth",           // invoke() → GDriveStatus (starts loopback OAuth)
  GDRIVE_SIGNOUT: "gdrive:signout",     // invoke() → GDriveStatus
  GDRIVE_SET_CLIENT: "gdrive:setclient",// invoke({clientId,clientSecret}) → GDriveStatus
  GDRIVE_LIST: "gdrive:list",           // invoke(folderId?) → GDriveFile[]
  GDRIVE_SEARCH: "gdrive:search",       // invoke(query) → GDriveFile[]
  GDRIVE_READ: "gdrive:read",           // invoke(fileId) → GDriveRead
  GDRIVE_BACKUP: "gdrive:backup",       // invoke() → GDriveBackupResult (vault → Drive)
  // neo browser (Preview view — drives the real Neo browser over CDP)
  NEO_STATUS: "neo:status",     // invoke() → NeoStatus
  NEO_ENSURE: "neo:ensure",     // invoke() → NeoStatus (runs neo-debug if port down)
  NEO_TABS: "neo:tabs",         // invoke() → NeoTab[]
  NEO_OPEN: "neo:open",         // invoke(url) → { targetId }
  NEO_NAVIGATE: "neo:navigate", // invoke({url,tab?})
  NEO_RELOAD: "neo:reload",     // invoke(tab?)
  NEO_BACK: "neo:back",         // invoke(tab?)
  NEO_FORWARD: "neo:forward",   // invoke(tab?)
  NEO_ASK: "neo:ask",           // invoke({prompt,submit?}) → sends prompt into Magic Page
  NEO_CLICK: "neo:click",       // invoke({x,y,tab?}) → real click at CSS coords
  NEO_SCROLL: "neo:scroll",     // invoke({dy,tab?})
  NEO_SNAP: "neo:snap",         // invoke(tab?) → NeoSnap (live screenshot + viewport)
  // google workspace (folders / sheets / forms / gmail — same OAuth token)
  GOOGLE_ENSURE_TREE: "google:ensuretree",     // invoke() → GTreeResult (Dragons Alliance structure)
  GOOGLE_FOLDER_CREATE: "google:foldercreate", // invoke({name,parentId?}) → GDriveFile|null
  GOOGLE_UPLOAD: "google:upload",              // invoke({localPath,folderId,convert?}) → GDriveFile|null
  SHEET_CREATE: "google:sheetcreate",          // invoke({title,folderId?}) → GDriveFile|null
  SHEET_READ: "google:sheetread",              // invoke({id,range?}) → GSheetData
  SHEET_UPDATE: "google:sheetupdate",          // invoke({id,range,values}) → {ok:boolean}
  FORM_CREATE: "google:formcreate",            // invoke(title) → GFormInfo|null
  FORM_RESPONSES: "google:formresponses",      // invoke(formId) → GFormResponse[]
  MAIL_SEARCH: "google:mailsearch",            // invoke(q) → GMailMsg[]
  MAIL_GET: "google:mailget",                  // invoke(id) → GMailMsg|null
  MAIL_SAVE_ATTACHMENT: "google:mailsaveatt",  // invoke({msgId,attId,filename,folderId}) → GDriveFile|null
  // metadata registry + candidates (local drive-meta.json)
  META_LIST: "meta:list",                      // invoke(filter?) → DriveMeta[]
  META_UPSERT: "meta:upsert",                  // invoke(entry) → DriveMeta
  CANDIDATE_CREATE: "candidate:create",        // invoke(name) → DriveMeta
  // proton mail (bridge probe)
  PROTON_STATUS: "proton:status",              // invoke() → ProtonStatus
  PROTON_SET_CONFIG: "proton:setconfig",       // invoke({host,port,user}) → ProtonStatus
  // settings (local IDE configuration — ~/.config/dai/settings.json, 0600)
  SETTINGS_GET: "settings:get",                // invoke() → DaiSettings
  SETTINGS_SET: "settings:set",                // invoke(patch) → DaiSettings
  // audit trail (append-only JSONL — ~/.config/dai/audit.jsonl, 0600)
  AUDIT_LIST: "audit:list",                    // invoke(limit?) → AuditEvent[]
  AUDIT_LOG: "audit:log",                      // send({kind,detail}) — renderer-side events
  // permissions (local team/role model — ~/.config/dai/permissions.json)
  PERMS_GET: "perms:get",                      // invoke() → PermissionsState
  PERMS_SET: "perms:set",                      // invoke(state) → PermissionsState
  // vault sync (git engine over the Obsidian vault)
  VAULT_STATUS: "vaultsync:status",            // invoke() → VaultSyncStatus
  VAULT_SYNC: "vaultsync:sync",                // invoke(message?) → VaultSyncResult
  VAULT_SET_REMOTE: "vaultsync:setremote",     // invoke(url) → VaultSyncStatus
  // google per-service health probe
  GOOGLE_HEALTH: "google:health",              // invoke() → GServiceHealth[]
  // generic PATH command existence check (renderer status probes — Ollama/Codex/etc.)
  SYSTEM_CHECK_COMMAND: "system:check-command", // invoke(cmd) → boolean
  // screenshot (main captures the window → ~/Desktop)
  SHOT_CAPTURE: "shot:capture",                // invoke() → ShotResult
  // superpowers — real engine health probes + digest open (honest, timeout-guarded)
  SP_HEALTH: "sp:health",                      // invoke(id) → SpHealth (ruflo | graphify)
  SP_OPEN_DIGEST: "sp:opendigest",             // invoke() → SpResult (opens real graph digest)
} as const;

// ---- types ----
export type TermOpts = { id: string; cmd: "shell" | "claude" | string; cwd: string; master?: boolean };
export type TermInfo = { id: string; cmd: string; cwd: string; is_master: boolean; mirror: boolean; mirror_scope: string; alive: boolean };
export type AttachResult = { buffer: ArrayBuffer | string };  // scrollback replay (binary or utf-8)

export type FsEntry = { name: string; path: string; type: "dir" | "file"; hidden: boolean; size: number };
export type FsList = { path: string; parent: string | null; entries: FsEntry[] };

export type ProjectSession = { score: number; title: string; ctx: number; model: string; idle_min: number; understanding: number; goalPct: number };
export type Project = {
  path: string; name: string; type: string;
  branch: string | null; dirty: number;
  remote: string | null;   // GitHub web URL (https://github.com/<owner>/<repo>) or null if no origin
  terminals: string[]; session: ProjectSession | null;
};

export type Session = {
  id: string; model: string; title: string; cwd: string; cwd_full?: string; branch: string;
  file?: string;   // absolute path to the source .jsonl transcript (for live streaming)
  ctx: number; out: number; win: number;
  capacity: number; meaningful: number; understanding: number; freshness: number;
  score: number; goalPct: number; idle_min: number; assistants: number; users: number; tools: number; mtime: number;
};

// Per-terminal session join (info bar): the claude session owning a terminal's cwd.
export type TermSession = {
  model: string; ctx: number; out: number; capacity: number; score: number;
  goalPct: number; understanding: number; ambiguous: boolean;
} | null;
export type SessionsPayload = { now: number; active_min: number; live: number; sessions: Session[] };

// One rendered event in an agent's live transcript (Mission-Control).
export type TranscriptEvent = {
  role: "user" | "assistant";
  ts: number;                 // epoch ms (0 if unknown)
  kind: "prompt" | "text" | "tool" | "thinking";
  text?: string;              // prompt / assistant text / thinking summary
  tool?: string;              // tool name (Read/Edit/Bash/…)
  target?: string;            // tool's primary target (file path / command / query)
  tokens?: number;            // output tokens for this assistant turn (if known)
};
export type Transcript = { file: string; events: TranscriptEvent[] };

export type HostInfo = { shell: string; home: string; cwd: string; projects: string[] };

// GitHub Radar — hot repos by lens (from ~/code/github-radar/last-run.json).
export type RepoItem = {
  full_name: string; url: string; stars: number; lang: string | null;
  desc: string; topics: string[]; pushed?: string; velocity?: number; // stars/day if derivable
};
export type RadarSection = { lens: string; repos: RepoItem[] };
export type RadarStatus = {
  scannedAt: string; mode: string; total: number; fresh: number;
  sections: RadarSection[]; available: boolean;
};

// Agent health — goal attainment + detected problems from the live transcript.
export type AgentProblem = { kind: "tool-error" | "bash-fail" | "stall" | "repeat-error"; detail: string; ts: number };
export type AgentHealth = {
  goalPct: number;                                    // 0..100
  status: "working" | "stalled" | "error" | "done" | "idle";
  problems: AgentProblem[];
  lastActivityMs: number;
  cwd_full?: string;                                  // for terminal targeting (autopilot)
};

// Ecosystem super-tool live status (real signals — running proc / launchd / recent write).
export type ToolStatus = {
  id: string; name: string; icon: string;
  status: "live" | "ready" | "needs" | "off";  // needs = installed structure, needs config
  detail: string;
  action?: string;   // optional click action id (e.g. "open-obsidian")
};

// ---- NeuroMap (Obsidian vault knowledge graph, live) ----
export type NeuroMode = "agents" | "shared" | "live";
export type NeuroLayer = "core" | "projects" | "agents-notes" | "all";
export type NeuroLens = "none" | "research" | "creative";

export type NeuroNode = {
  id: string;              // vault-relative path — stable node id
  title: string;           // frontmatter title or filename
  folder: string;          // top-level vault folder (07_RESEARCH, 09_MEMORY, …)
  layer: NeuroLayer;       // which layer this node belongs to
  type: string | null;     // frontmatter `type`
  tags: string[];
  deg: number;             // total degree (in+out) — drives node size
  mtime: number;
  agent?: string | null;   // team-mode(agents): attributed author, heuristic
  fresh?: boolean;         // changed very recently — growth pulse
};
export type NeuroEdge = { source: string; target: string };
export type NeuroGraphOpts = { layers: NeuroLayer[]; mode: NeuroMode; lens: NeuroLens };
export type NeuroGraph = {
  nodes: NeuroNode[];
  edges: NeuroEdge[];
  layers: { id: NeuroLayer; label: string; count: number }[];
  scannedAt: number;
  vault: string;
  mode: NeuroMode;
  teamHint?: string;       // e.g. "vault not shared (no git remote)" for mode=shared
};
export type NeuroNodeDetail = {
  id: string; title: string; folder: string; mtime: number;
  frontmatter: Record<string, unknown>;
  body: string;                                   // markdown body (preview)
  backlinks: { id: string; title: string }[];
  outlinks: { id: string; title: string }[];
  agent?: string | null;
};

// ---- Google Drive ----
export type GDriveStatus = {
  configured: boolean;     // client id/secret present
  signedIn: boolean;
  email?: string | null;
  vault?: string;          // local vault path (for backup UI)
  lastBackup?: number | null;
};
export type GDriveFile = {
  id: string; name: string; mimeType: string;
  modifiedTime?: string; size?: number; iconLink?: string; isFolder: boolean;
};
export type GDriveRead = { name: string; mime: string; text: string; truncated: boolean };
export type GDriveBackupResult = { ok: boolean; folderId?: string; uploaded: number; failed: number; error?: string };

// ---- Google Workspace (folders / sheets / forms / gmail) ----
export type GTreeResult = { ok: boolean; created: string[]; existing: string[]; rootId?: string; error?: string };
export type GSheetData = { id: string; range: string; values: string[][]; error?: string };
export type GFormInfo = { formId: string; title: string; responderUri?: string; error?: string };
export type GFormResponse = { responseId: string; submittedAt: string; answers: Record<string, string> };
export type GMailMsg = {
  id: string; threadId: string; from: string; subject: string; date: string; snippet: string;
  attachments: { attId: string; filename: string; mime: string; size: number }[];
};

// ---- Drive metadata registry (local, links everything to Neuromap) ----
export type DriveMeta = {
  id: string;
  type: "candidate" | "company" | "project" | "contract" | "paperform" | "excel" | "sheet" | "form" | "email" | "folder" | "document";
  name: string;
  source: string;                 // "drive" | "local" | "gmail" | "proton" | "ide"
  path?: string;
  googleDriveId?: string; sheetId?: string; formId?: string; emailId?: string;
  candidateId?: string; companyId?: string; projectId?: string;
  status: string;                 // "active" | "pending" | "complete" | "missing" | …
  tags: string[];
  createdAt: number; updatedAt: number;
  owner?: string;
  linkedNodes: string[];          // ids of related meta entries / neuromap nodes
};

// ---- Proton Mail (Bridge) ----
export type ProtonStatus = {
  configured: boolean;            // host/port/user saved
  bridgeUp: boolean;              // TCP probe of the local Bridge IMAP port succeeded
  host: string; port: number; user?: string | null;
  hint: string;                   // honest next step ("install Proton Mail Bridge", …)
};

// ---- Settings (local IDE configuration) ----
export type DaiSettings = {
  terminalFontSize: number;      // xterm font px
  sessionsActiveMin: number;     // metrics "active" window (minutes)
  radarAutoRefresh: boolean;     // rescan radar when the view opens
  auditRetentionDays: number;    // prune audit events older than this
  vaultAutoSyncMin: number;      // 0 = manual sync only
  defaultCwd: string;            // cwd for new terminals ("~" ok)
};

// ---- Audit trail (append-only local action log) ----
export type AuditEvent = { ts: number; kind: string; detail: string; actor: string };

// ---- Permissions (local team/role model — enforcement-ready) ----
export type PermRole = "owner" | "editor" | "viewer";
export type PermCapability =
  | "terminals" | "broadcast" | "credentials" | "drive-write" | "vault-sync" | "emergency-stop";
export type PermMember = { id: string; name: string; role: PermRole };
export type PermissionsState = {
  members: PermMember[];
  matrix: Record<PermRole, PermCapability[]>;
};

// ---- Vault sync (git engine over the Obsidian vault) ----
export type VaultSyncStatus = {
  isRepo: boolean; branch: string | null; remote: string | null;
  dirty: number; ahead: number; behind: number;
  lastCommit: string | null; lastSyncTs: number | null;
};
export type VaultSyncResult = {
  ok: boolean; committed: number; pushed: boolean; pulled: boolean;
  detail: string; error?: string;
};

// ---- Google per-service health ----
export type GServiceHealth = { service: string; ok: boolean; status: number | null; detail: string };

// ---- Screenshot ----
export type ShotResult = { ok: boolean; path?: string; error?: string };

// ---- Superpowers health (real CLI/file probes; never throws to UI) ----
export type SpHealthStatus = "live" | "ready" | "missing" | "error";
export type SpHealth = {
  id: string;                 // superpower id ("ruflo" | "graphify")
  ok: boolean;                // engine reachable / digest present
  status: SpHealthStatus;
  message: string;            // one-line honest headline for the toast
  details: string[];          // extra honest lines (version, counts, mtime, error head)
  lastCheckedAt: number;
};
export type SpResult = { ok: boolean; message: string; path?: string };

// ---- Neo browser (Preview) ----
export type NeoStatus = { connected: boolean; browser?: string; error?: string };
export type NeoTab = { index: number; targetId: string; title: string; url: string };
export type NeoSnap = { dataUrl: string; vw: number; vh: number; url: string; title: string; targetId: string };

// The API surface exposed on window.dai (preload contextBridge).
export interface DaiApi {
  term: {
    create(opts: TermOpts): Promise<{ id: string }>;
    attach(id: string): Promise<AttachResult>;
    detach(id: string): void;
    write(id: string, data: string): void;
    resize(id: string, cols: number, rows: number): void;
    kill(id: string): void;
    setMirror(id: string, on: boolean, scope?: string, ids?: string[]): void;
    setChannel(id: string, channel: string | null): void;
    list(): Promise<TermInfo[]>;
    broadcast(data: string, enter: boolean, ids?: string[]): Promise<{ sent: number }>;
    ack(id: string, bytes: number): void;                        // flow control: renderer flushed N bytes
    onData(cb: (id: string, data: Uint8Array) => void): () => void;  // returns unsubscribe
    onExit(cb: (id: string) => void): () => void;
  };
  fs: {
    list(path: string): Promise<FsList>;
    read(path: string): Promise<string>;
    write(path: string, content: string): Promise<void>;
    walk(root: string, limit?: number): Promise<{ root: string; files: string[] }>;
  };
  projects: { list(): Promise<Project[]> };
  sessions: {
    list(activeMin: number): Promise<SessionsPayload>;
    transcript(file: string, limit?: number): Promise<Transcript>;
    health(file: string): Promise<AgentHealth>;
    session(cwd: string): Promise<TermSession>;
  };
  radar: { status(): Promise<RadarStatus>; refresh(): void };
  host: { info(): Promise<HostInfo> };
  tools: { status(): Promise<ToolStatus[]>; action(id: string): void };
  system: { checkCommand(cmd: string): Promise<boolean> };
  win: { minimize(): void; maxToggle(): void; close(): void };
  shell: { open(url: string): void };
  neuromap: {
    graph(opts: NeuroGraphOpts): Promise<NeuroGraph>;
    node(id: string): Promise<NeuroNodeDetail>;
    watch(layers: NeuroLayer[]): void;
    onChanged(cb: (changed: string[]) => void): () => void;  // returns unsubscribe
  };
  gdrive: {
    status(): Promise<GDriveStatus>;
    auth(): Promise<GDriveStatus>;
    signout(): Promise<GDriveStatus>;
    setClient(clientId: string, clientSecret: string): Promise<GDriveStatus>;
    list(folderId?: string): Promise<GDriveFile[]>;
    search(query: string): Promise<GDriveFile[]>;
    read(fileId: string): Promise<GDriveRead>;
    backup(): Promise<GDriveBackupResult>;
  };
  neo: {
    status(): Promise<NeoStatus>;
    ensure(): Promise<NeoStatus>;
    tabs(): Promise<NeoTab[]>;
    open(url: string): Promise<{ targetId: string }>;
    navigate(url: string, tab?: string): Promise<void>;
    reload(tab?: string): Promise<void>;
    back(tab?: string): Promise<void>;
    forward(tab?: string): Promise<void>;
    ask(prompt: string, submit?: boolean): Promise<{ tab: string; composer: string; submitted: boolean }>;
    click(x: number, y: number, tab?: string): Promise<void>;
    scroll(dy: number, tab?: string): Promise<void>;
    snap(tab?: string): Promise<NeoSnap | null>;
  };
  google: {
    ensureTree(): Promise<GTreeResult>;
    folderCreate(name: string, parentId?: string): Promise<GDriveFile | null>;
    upload(localPath: string, folderId: string, convert?: boolean): Promise<GDriveFile | null>;
    sheetCreate(title: string, folderId?: string): Promise<GDriveFile | null>;
    sheetRead(id: string, range?: string): Promise<GSheetData>;
    sheetUpdate(id: string, range: string, values: string[][]): Promise<{ ok: boolean }>;
    formCreate(title: string): Promise<GFormInfo | null>;
    formResponses(formId: string): Promise<GFormResponse[]>;
    mailSearch(q: string): Promise<GMailMsg[]>;
    mailGet(id: string): Promise<GMailMsg | null>;
    mailSaveAttachment(msgId: string, attId: string, filename: string, folderId: string): Promise<GDriveFile | null>;
    health(): Promise<GServiceHealth[]>;
  };
  meta: {
    list(filter?: Partial<DriveMeta>): Promise<DriveMeta[]>;
    upsert(entry: Partial<DriveMeta> & { name: string; type: DriveMeta["type"] }): Promise<DriveMeta>;
    candidateCreate(name: string): Promise<DriveMeta>;
  };
  proton: {
    status(): Promise<ProtonStatus>;
    setConfig(host: string, port: number, user: string): Promise<ProtonStatus>;
  };
  settings: {
    get(): Promise<DaiSettings>;
    set(patch: Partial<DaiSettings>): Promise<DaiSettings>;
  };
  audit: {
    list(limit?: number): Promise<AuditEvent[]>;
    log(kind: string, detail: string): void;
  };
  perms: {
    get(): Promise<PermissionsState>;
    set(state: PermissionsState): Promise<PermissionsState>;
  };
  vaultSync: {
    status(): Promise<VaultSyncStatus>;
    sync(message?: string): Promise<VaultSyncResult>;
    setRemote(url: string): Promise<VaultSyncStatus>;
  };
  shot: { capture(): Promise<ShotResult> };
  superpowers: {
    health(id: string): Promise<SpHealth>;
    openDigest(): Promise<SpResult>;
  };
}

declare global {
  interface Window { dai: DaiApi }
}
