// Dragons Alliance icon set — one coherent hand-drawn stroke family (1.5px, 24 grid).
// Replaces scattered emoji: this is what separates an instrument from a toy.
import type { ReactNode } from "react";

function I({ children, size = 15, className }: { children: ReactNode; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true" style={{ flex: "0 0 auto", verticalAlign: "-2px" }}>
      {children}
    </svg>
  );
}

export const IcTerminal = (p: { size?: number }) => (
  <I {...p}><rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="M7 9l3.5 3L7 15M12.5 15H17" /></I>
);
export const IcBot = (p: { size?: number }) => (
  <I {...p}><rect x="5" y="8" width="14" height="11" rx="3" /><path d="M12 8V4.5M9.5 4.5h5" /><circle cx="9.3" cy="13" r="0.9" fill="currentColor" /><circle cx="14.7" cy="13" r="0.9" fill="currentColor" /><path d="M9.5 16.2h5" /></I>
);
export const IcCode = (p: { size?: number }) => (
  <I {...p}><path d="M8.5 6L3.5 12l5 6M15.5 6l5 6-5 6M13 4l-2.5 16" /></I>
);
export const IcBrain = (p: { size?: number }) => (
  <I {...p}><circle cx="12" cy="12" r="2.2" /><circle cx="5" cy="7" r="1.6" /><circle cx="19" cy="7" r="1.6" /><circle cx="5" cy="17" r="1.6" /><circle cx="19" cy="17" r="1.6" /><path d="M10.2 10.8L6.3 8M13.8 10.8L17.7 8M10.2 13.2L6.3 16M13.8 13.2L17.7 16" /></I>
);
export const IcCloud = (p: { size?: number }) => (
  <I {...p}><path d="M7 18a4.2 4.2 0 01-.6-8.4A5.4 5.4 0 0117 8a4.4 4.4 0 011 8.7Q12.5 18 7 18z" /></I>
);
export const IcKey = (p: { size?: number }) => (
  <I {...p}><circle cx="8" cy="14.5" r="3.6" /><path d="M11 12L19.5 3.5M15.5 7.5l2.6 2.6M13 10l2 2" /></I>
);
export const IcPhone = (p: { size?: number }) => (
  <I {...p}><rect x="7.5" y="3" width="9" height="18" rx="2.4" /><path d="M11 18.4h2" /></I>
);
export const IcRadar = (p: { size?: number }) => (
  <I {...p}><circle cx="12" cy="12" r="8.6" /><circle cx="12" cy="12" r="4.6" /><path d="M12 12l5.8-5.8" /><circle cx="14.6" cy="14.4" r="0.9" fill="currentColor" /></I>
);
export const IcGem = (p: { size?: number }) => (
  <I {...p}><path d="M7 4h10l4 5.2L12 20.5 3 9.2 7 4z" /><path d="M3 9.2h18M12 20.5L8.4 9.2 12 4l3.6 5.2L12 20.5z" /></I>
);
export const IcNodes = (p: { size?: number }) => (
  <I {...p}><circle cx="6" cy="6" r="2.1" /><circle cx="18" cy="8" r="2.1" /><circle cx="9" cy="18" r="2.1" /><path d="M7.8 7.2l8.2 0.6M7 8l1.4 8M16.5 9.6l-6 7" /></I>
);
export const IcCrown = (p: { size?: number }) => (
  <I {...p}><path d="M4 17.5L3 7.5l5 3.6L12 5l4 6.1 5-3.6-1 10H4z" /><path d="M4 17.5h16" /></I>
);
export const IcFlask = (p: { size?: number }) => (
  <I {...p}><path d="M10 3.5h4M11 3.5v5.2L5.4 18a2 2 0 001.8 3h9.6a2 2 0 001.8-3L13 8.7V3.5" /><path d="M8 15.5h8" /></I>
);
export const IcPalette = (p: { size?: number }) => (
  <I {...p}><path d="M12 3.5a8.5 8.5 0 100 17c1.6 0 2-1 1.5-2-0.7-1.4 0-2.9 2-2.9h2A2.8 2.8 0 0020.5 12 8.5 8.5 0 0012 3.5z" /><circle cx="8" cy="9" r="1" fill="currentColor" /><circle cx="13" cy="7.4" r="1" fill="currentColor" /><circle cx="7.4" cy="13.6" r="1" fill="currentColor" /></I>
);
export const IcMonitor = (p: { size?: number }) => (
  <I {...p}><rect x="3" y="4.5" width="18" height="12.5" rx="2" /><path d="M9.5 21h5M12 17v4" /></I>
);
export const IcSearch = (p: { size?: number }) => (
  <I {...p}><circle cx="10.5" cy="10.5" r="6.2" /><path d="M15.3 15.3L20.5 20.5" /></I>
);
export const IcChart = (p: { size?: number }) => (
  <I {...p}><path d="M4 4v16h16" /><path d="M8 15.5V11M12.5 15.5V7.5M17 15.5v-3" /></I>
);
export const IcZap = (p: { size?: number }) => (
  <I {...p}><path d="M13 3L5.5 13.5H11L10 21l7.8-11H12.5L13 3z" /></I>
);
export const IcUsers = (p: { size?: number }) => (
  <I {...p}><circle cx="9" cy="8.5" r="3.2" /><path d="M3.5 19.5a5.6 5.6 0 0111 0" /><circle cx="16.8" cy="9.5" r="2.4" /><path d="M15.5 14.7a4.6 4.6 0 015 4.8" /></I>
);
export const IcPlug = (p: { size?: number }) => (
  <I {...p}><path d="M9 3.5V8M15 3.5V8M7 8h10v3.5a5 5 0 01-10 0V8zM12 16.5V21" /></I>
);
export const IcSnake = (p: { size?: number }) => (
  <I {...p}><path d="M19 6.5a3 3 0 00-3-3H9a3 3 0 000 6h6a3 3 0 010 6H8a3 3 0 01-3-3" /><circle cx="5.5" cy="17.5" r="1" fill="currentColor" /></I>
);
export const IcCommand = (p: { size?: number }) => (
  <I {...p}><path d="M9 9V6a2.6 2.6 0 10-2.6 2.6H15V6A2.6 2.6 0 1117.6 8.6H6.4M9 9v6m6-6v6m0 0v3a2.6 2.6 0 102.6-2.6H6.4A2.6 2.6 0 109 18v-3" /></I>
);
export const IcSigil = (p: { size?: number }) => (
  <I {...p}><path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9L12 3z" /><path d="M12 7.2l4 2.3v4.9l-4 2.3-4-2.3V9.5l4-2.3z" /></I>
);

export const IcFolder = (p: { size?: number }) => (
  <I {...p}><path d="M3 7a2 2 0 012-2h4.2l2 2.4H19a2 2 0 012 2V17a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></I>
);
export const IcFile = (p: { size?: number }) => (
  <I {...p}><path d="M7 3.5h7l4 4V20.5H7V3.5z" /><path d="M14 3.5V8h4M10 12.5h5M10 16h5" /></I>
);
export const IcImage = (p: { size?: number }) => (
  <I {...p}><rect x="3.5" y="5" width="17" height="14" rx="2" /><circle cx="9" cy="10" r="1.4" /><path d="M4.5 17l4.5-4.5 3 3 3.5-3.5 4 4" /></I>
);
export const IcSheet = (p: { size?: number }) => (
  <I {...p}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M4 10h16M4 15h16M10 4v16" /></I>
);
export const IcBranch = (p: { size?: number }) => (
  <I {...p}><circle cx="6.5" cy="6" r="2.2" /><circle cx="6.5" cy="18" r="2.2" /><circle cx="17.5" cy="8" r="2.2" /><path d="M6.5 8.2v7.6M17.5 10.2c0 3.5-4 3.4-7 4.2" /></I>
);
export const IcSend = (p: { size?: number }) => (
  <I {...p}><path d="M20.5 3.5L10 14M20.5 3.5L14 20.5l-4-6.5-6.5-4 17-6.5z" /></I>
);
export const IcCube = (p: { size?: number }) => (
  <I {...p}><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" /><path d="M12 12l8-4.5M12 12L4 7.5M12 12v9" /></I>
);

/* ---- action / status glyphs (UX evolution batch — same stroke family) ---- */
export const IcPlay = (p: { size?: number }) => (
  <I {...p}><path d="M8 5.5l10 6.5-10 6.5v-13z" /></I>
);
export const IcStop = (p: { size?: number }) => (
  <I {...p}><rect x="6.5" y="6.5" width="11" height="11" rx="1.5" /></I>
);
export const IcRefresh = (p: { size?: number }) => (
  <I {...p}><path d="M19.5 12a7.5 7.5 0 11-2.2-5.3M19.5 3.5v3.6h-3.6" /></I>
);
export const IcSave = (p: { size?: number }) => (
  <I {...p}><path d="M5 4h11l3 3v13H5V4z" /><path d="M8 4v5h7V4M8 20v-6h8v6" /></I>
);
export const IcCamera = (p: { size?: number }) => (
  <I {...p}><path d="M4 8h3.5l1.8-2.5h5.4L16.5 8H20v11H4V8z" /><circle cx="12" cy="13" r="3.2" /></I>
);
export const IcExternal = (p: { size?: number }) => (
  <I {...p}><path d="M10 5H5v14h14v-5M14 4h6v6M20 4l-9 9" /></I>
);
export const IcLock = (p: { size?: number }) => (
  <I {...p}><rect x="5.5" y="10.5" width="13" height="9.5" rx="2" /><path d="M8.5 10.5V7.8a3.5 3.5 0 017 0v2.7" /></I>
);
export const IcClip = (p: { size?: number }) => (
  <I {...p}><path d="M8.5 11.5l7-7a3.2 3.2 0 014.5 4.5l-9 9a5 5 0 01-7-7l8.5-8.5" /></I>
);
export const IcUser = (p: { size?: number }) => (
  <I {...p}><circle cx="12" cy="8.5" r="3.4" /><path d="M5.5 20a6.5 6.5 0 0113 0" /></I>
);
export const IcCheck = (p: { size?: number }) => (
  <I {...p}><path d="M4.5 12.5l5 5 10-11" /></I>
);
export const IcAlert = (p: { size?: number }) => (
  <I {...p}><path d="M12 4L2.8 19.5h18.4L12 4z" /><path d="M12 10v4.2" /><circle cx="12" cy="16.8" r="0.5" fill="currentColor" /></I>
);
export const IcX = (p: { size?: number }) => (
  <I {...p}><path d="M6 6l12 12M18 6L6 18" /></I>
);
export const IcBook = (p: { size?: number }) => (
  <I {...p}><path d="M4 5.5A2.5 2.5 0 016.5 3H20v16H6.5A2.5 2.5 0 004 21.5v-16z" /><path d="M20 16H6.5A2.5 2.5 0 004 18.5M8 7.5h8" /></I>
);
export const IcSettings = (p: { size?: number }) => (
  <I {...p}><circle cx="12" cy="12" r="3" /><path d="M12 2.8v3M12 18.2v3M21.2 12h-3M5.8 12h-3M18.5 5.5l-2.1 2.1M7.6 16.4l-2.1 2.1M18.5 18.5l-2.1-2.1M7.6 7.6L5.5 5.5" /></I>
);
export const IcBroadcast = (p: { size?: number }) => (
  <I {...p}><circle cx="12" cy="12" r="2" fill="currentColor" /><path d="M7.8 16.2a6 6 0 010-8.4M16.2 7.8a6 6 0 010 8.4M5 19a10 10 0 010-14M19 5a10 10 0 010 14" /></I>
);
export const IcEraser = (p: { size?: number }) => (
  <I {...p}><path d="M9 19l-4.5-4.5a2 2 0 010-2.8l7.2-7.2a2 2 0 012.8 0l5 5a2 2 0 010 2.8L13 19H9z" /><path d="M6 19h14" /></I>
);

/** project type → icon (language cube / folder) */
export const ProjIcon = ({ type, size = 14 }: { type: string; size?: number }) =>
  type === "dir" ? <IcFolder size={size} /> : type === "python" ? <IcSnake size={size} /> : <IcCube size={size} />;

/** ecosystem tool id → icon (fallback handled by caller) */
export const TOOL_ICON: Record<string, (p: { size?: number }) => ReactNode> = {
  obsidian: IcGem, graphify: IcNodes, ruflo: IcBot, agents: IcSigil, godmode: IcCrown,
  radar: IcRadar, omnigent: IcSnake, leanctx: IcZap, neuromap: IcBrain, google: IcPlug,
  "obsidian-team": IcUsers, preview: IcMonitor, obscura: IcSearch, creative: IcPalette,
};
