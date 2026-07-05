// NeuroMap team-ops view modes + time filtering — client-side reshaping of the
// already-fetched graph. A UI-level `ViewMode` sits ABOVE the backend `NeuroMode`
// so we can offer team-ops framings without changing the shared IPC contract.
// Honest by design: modes that need a team/task backend show empty-states, never
// invented people or tasks.
import type { NeuroMode } from "../../api";

export type ViewMode = "knowledge" | "activity" | "files" | "clean" | "agents" | "team" | "tasks";

export type ModeMeta = {
  id: ViewMode;
  label: string;
  desc: string;
  real: boolean;   // false = honest pending (needs a backend not yet wired)
};

export const VIEW_MODES: ModeMeta[] = [
  { id: "knowledge", label: "Knowledge", desc: "Full vault graph — notes + [[wikilink]] edges.", real: true },
  { id: "activity", label: "Activity", desc: "Last 24h by file mtime — recent lit, stale dimmed.", real: true },
  { id: "files", label: "Files", desc: "File-discovery emphasis — important labels + copy path.", real: true },
  { id: "clean", label: "Clean", desc: "Only the highest-degree hubs + your selection's neighbours.", real: true },
  { id: "agents", label: "Agents", desc: "Heuristic author attribution from folder/tags.", real: true },
  { id: "team", label: "Team", desc: "Team map — needs a shared/synced vault backend.", real: false },
  { id: "tasks", label: "Tasks", desc: "Team tasks from 08_TASKS — task backend pending.", real: false },
];

// A team-ops view maps down onto one of the three backend fetch modes.
export function backendMode(vm: ViewMode): NeuroMode {
  if (vm === "agents") return "agents";
  if (vm === "team") return "shared";
  return "live";
}

// ---- time filter (real, from mtime) ----
export type TimeKey = "today" | "24h" | "7d" | "all";

export const TIME_KEYS: { id: TimeKey; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "24h", label: "24h" },
  { id: "7d", label: "7d" },
  { id: "all", label: "All" },
];

const DAY = 86_400_000;

export function passesTime(mtime: number, key: TimeKey, now: number = Date.now()): boolean {
  if (key === "all") return true;
  if (key === "today") {
    const midnight = new Date(now);
    midnight.setHours(0, 0, 0, 0);
    return mtime >= midnight.getTime();
  }
  return now - mtime <= (key === "24h" ? DAY : 7 * DAY);
}

// Vault folder that holds team task notes (top-level `NeuroNode.folder`).
export const TASKS_FOLDER = "08_TASKS";
export function isTaskNode(folder: string): boolean {
  return folder.toUpperCase().includes("TASK");
}
