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
  status: "live" | "ready" | "off";
  detail: string;
  action?: string;   // optional click action id (e.g. "open-obsidian")
};

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
  win: { minimize(): void; maxToggle(): void; close(): void };
  shell: { open(url: string): void };
}

declare global {
  interface Window { dai: DaiApi }
}
