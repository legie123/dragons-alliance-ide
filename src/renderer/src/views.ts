// Renderer view model — ONE union for navigation. Ends the historical drift
// between App's View, registry's SectorId and the guide's target type.
import type { SectorId } from "./registry";

/** Support views live under "More"; core sectors come from the registry. */
export type SupportView = "research" | "radar" | "library";
export type View = SectorId | SupportView;

const CORE: readonly SectorId[] = ["ide", "agents", "code", "neuromap", "drive", "metrics", "preview", "creative"];
const SUPPORT: readonly SupportView[] = ["research", "radar", "library"];
const ALL: readonly string[] = [...CORE, ...SUPPORT];

export function isView(v: unknown): v is View {
  return typeof v === "string" && ALL.includes(v);
}

/** Sector owning a view — support views carry no sector accent. */
export const SECTOR_FOR_VIEW: Record<View, SectorId | "support"> = {
  ide: "ide", agents: "agents", code: "code", neuromap: "neuromap",
  drive: "drive", metrics: "metrics", preview: "preview", creative: "creative",
  research: "support", radar: "support", library: "support",
};

/** CSS accent slug per sector (matches --sector-* tokens). */
export const SECTOR_ACCENT: Record<SectorId, string> = {
  ide: "terminal", agents: "agents", code: "code", neuromap: "neuromap",
  drive: "drive", metrics: "metrics", preview: "preview", creative: "creative",
};
