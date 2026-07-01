// Renderer data layer — talks to the Electron main process over IPC (window.dai).
// The IPC contract lives in @shared/ipc; we re-export the shared types so existing
// component imports (Session, Project, FsList, …) keep resolving from "../api".
import type {
  Session as IpcSession,
  SessionsPayload,
  HostInfo,
  TermInfo,
  Project as IpcProject,
  ProjectSession as IpcProjectSession,
  FsEntry as IpcFsEntry,
  FsList as IpcFsList,
} from "@shared/ipc";

export type Session = IpcSession;
export type Payload = SessionsPayload;

export async function fetchSessions(active: number): Promise<Payload> {
  return window.dai.sessions.list(active);
}

export type Host = HostInfo;
export async function fetchHost(): Promise<Host> {
  return window.dai.host.info();
}

export async function broadcast(data: string, enter: boolean, ids?: string[]) {
  return window.dai.term.broadcast(data, enter, ids);
}

export type Term = { id: string; cmd: string; cwd: string };
export type ServerTerm = Term & { is_master: boolean; mirror: boolean; alive: boolean };

export async function fetchTerms(): Promise<ServerTerm[]> {
  try {
    const terms: TermInfo[] = await window.dai.term.list();
    return terms.map((t) => ({
      id: t.id, cmd: t.cmd, cwd: t.cwd,
      is_master: t.is_master, mirror: t.mirror, alive: t.alive,
    }));
  } catch {
    return [];
  }
}

// ---- projects (workspaces) ----
export type ProjectSession = IpcProjectSession;
export type Project = IpcProject;
export async function fetchProjects(): Promise<Project[]> {
  try {
    return await window.dai.projects.list();
  } catch {
    return [];
  }
}

export const TYPE_ICON: Record<string, string> = {
  node: "⬢", rust: "🦀", go: "🐹", python: "🐍", flutter: "🐦",
  ruby: "💎", php: "🐘", dir: "📁",
};

// ---- filesystem ----
export type FsEntry = IpcFsEntry;
export type FsList = IpcFsList;

export async function fsList(path: string): Promise<FsList> {
  return window.dai.fs.list(path);
}
export async function fsRead(path: string): Promise<string> {
  return window.dai.fs.read(path);
}
export async function fsWalk(root: string, limit?: number): Promise<{ root: string; files: string[] }> {
  return window.dai.fs.walk(root, limit);
}
export async function fsWrite(path: string, content: string): Promise<void> {
  return window.dai.fs.write(path, content);
}

export function langFromPath(p: string): string {
  const ext = p.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    py: "python", json: "json", css: "css", scss: "scss", html: "html",
    md: "markdown", sh: "shell", bash: "shell", zsh: "shell", yml: "yaml", yaml: "yaml",
    toml: "ini", ini: "ini", rs: "rust", go: "go", c: "c", cpp: "cpp", h: "c",
    java: "java", rb: "ruby", php: "php", sql: "sql", xml: "xml", svg: "xml",
  };
  return map[ext] || "plaintext";
}

// ---- formatting + color helpers ----
export function human(n: number): string {
  if (n < 1000) return `${Math.round(n)}`;
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}K`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}

export function gradeColor(p: number): string {
  if (p >= 75) return "#34d399"; // emerald
  if (p >= 50) return "#fbbf24"; // amber
  if (p >= 30) return "#fb923c"; // orange
  return "#f43f5e"; // rose
}

export function idleLabel(m: number): string {
  if (m < 1) return "now";
  if (m < 60) return `${Math.floor(m)}m`;
  return `${Math.floor(m / 60)}h`;
}
