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
  HOST_INFO: "host:info",
  // window controls (frameless titlebar)
  WIN_MIN: "win:minimize",
  WIN_MAXTOGGLE: "win:maxtoggle",
  WIN_CLOSE: "win:close",
} as const;

// ---- types ----
export type TermOpts = { id: string; cmd: "shell" | "claude" | string; cwd: string; master?: boolean };
export type TermInfo = { id: string; cmd: string; cwd: string; is_master: boolean; mirror: boolean; mirror_scope: string; alive: boolean };
export type AttachResult = { buffer: ArrayBuffer | string };  // scrollback replay (binary or utf-8)

export type FsEntry = { name: string; path: string; type: "dir" | "file"; hidden: boolean; size: number };
export type FsList = { path: string; parent: string | null; entries: FsEntry[] };

export type ProjectSession = { score: number; title: string; ctx: number; model: string; idle_min: number };
export type Project = {
  path: string; name: string; type: string;
  branch: string | null; dirty: number;
  terminals: string[]; session: ProjectSession | null;
};

export type Session = {
  id: string; model: string; title: string; cwd: string; cwd_full?: string; branch: string;
  ctx: number; out: number; win: number;
  capacity: number; meaningful: number; understanding: number; freshness: number;
  score: number; idle_min: number; assistants: number; users: number; tools: number; mtime: number;
};
export type SessionsPayload = { now: number; active_min: number; live: number; sessions: Session[] };

export type HostInfo = { shell: string; home: string; cwd: string; projects: string[] };

// The API surface exposed on window.dai (preload contextBridge).
export interface DaiApi {
  term: {
    create(opts: TermOpts): Promise<{ id: string }>;
    attach(id: string): Promise<AttachResult>;
    detach(id: string): void;
    write(id: string, data: string): void;
    resize(id: string, cols: number, rows: number): void;
    kill(id: string): void;
    setMirror(id: string, on: boolean, scope?: string): void;
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
  sessions: { list(activeMin: number): Promise<SessionsPayload> };
  host: { info(): Promise<HostInfo> };
  win: { minimize(): void; maxToggle(): void; close(): void };
}

declare global {
  interface Window { dai: DaiApi }
}
