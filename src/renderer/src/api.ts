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
  Transcript as IpcTranscript,
  TranscriptEvent as IpcTranscriptEvent,
} from "@shared/ipc";

export type Session = IpcSession;
export type Payload = SessionsPayload;

export async function fetchSessions(active: number): Promise<Payload> {
  return window.dai.sessions.list(active);
}

// ---- agent transcript (Mission-Control live view) ----
export type Transcript = IpcTranscript;
export type TranscriptEvent = IpcTranscriptEvent;
export async function fetchTranscript(file: string, limit?: number): Promise<Transcript> {
  return window.dai.sessions.transcript(file, limit);
}

export type Host = HostInfo;
export async function fetchHost(): Promise<Host> {
  return window.dai.host.info();
}

// ---- github radar ----
export type { RadarStatus, RadarSection, RepoItem } from "@shared/ipc";
export async function fetchRadar() { return window.dai.radar.status(); }
export function refreshRadar() { window.dai.radar.refresh(); }

// ---- agent health (self-repair) ----
export type { AgentHealth, AgentProblem } from "@shared/ipc";
export async function fetchAgentHealth(file: string) { return window.dai.sessions.health(file); }

// ---- per-terminal session join (info bar) ----
export type { TermSession } from "@shared/ipc";
export async function fetchTermSession(cwd: string) { return window.dai.sessions.session(cwd); }
// good/great/max from the model tier (deterministic, honest).
export function modelGrade(model: string): "good" | "great" | "max" | null {
  const m = (model || "").toLowerCase();
  if (m.includes("opus")) return "max";
  if (m.includes("sonnet")) return "great";
  if (m.includes("haiku") || m.includes("fable")) return "good";
  return null;
}
export const MODEL_KEYS = ["opus", "sonnet", "haiku", "fable"] as const;

// ---- neuromap (Obsidian knowledge graph) ----
export type { NeuroGraph, NeuroNode, NeuroEdge, NeuroGraphOpts, NeuroLayer, NeuroMode, NeuroLens, NeuroNodeDetail } from "@shared/ipc";
export async function fetchNeuroGraph(opts: import("@shared/ipc").NeuroGraphOpts) { return window.dai.neuromap.graph(opts); }
export async function fetchNeuroNode(id: string) { return window.dai.neuromap.node(id); }

// ---- google drive + workspace ----
export type { GDriveStatus, GDriveFile, GTreeResult, GSheetData, GFormInfo, GFormResponse, GMailMsg, DriveMeta, ProtonStatus } from "@shared/ipc";
export async function fetchGDriveStatus() { return window.dai.gdrive.status(); }
export async function fetchMeta(filter?: any) { return window.dai.meta.list(filter); }
export async function fetchProtonStatus() { return window.dai.proton.status(); }

// ---- ecosystem tools (live indicators) ----
export type { ToolStatus } from "@shared/ipc";
export async function fetchTools() {
  return window.dai.tools.status();
}
export function toolAction(id: string) {
  window.dai.tools.action(id);
}

// ---- superpower engine health (real probes, honest feedback) ----
export type { SpHealth, SpResult } from "@shared/ipc";
export async function fetchSpHealth(id: string) {
  return window.dai.superpowers.health(id);
}
export async function spOpenDigest() {
  return window.dai.superpowers.openDigest();
}

export async function broadcast(data: string, enter: boolean, ids?: string[]) {
  return window.dai.term.broadcast(data, enter, ids);
}

export type Term = { id: string; cmd: string; cwd: string };
export type ServerTerm = Term & { is_master: boolean; mirror: boolean; mirror_scope: string; alive: boolean };

export async function fetchTerms(): Promise<ServerTerm[]> {
  try {
    const terms: TermInfo[] = await window.dai.term.list();
    return terms.map((t) => ({
      id: t.id, cmd: t.cmd, cwd: t.cwd,
      is_master: t.is_master, mirror: t.mirror, mirror_scope: t.mirror_scope, alive: t.alive,
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
