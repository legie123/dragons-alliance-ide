// Palette recents — localStorage-backed, capped. Real usage only (pushed when
// a command actually runs).
const KEY = "dai.palette.recents.v1";
const CAP = 10;

export function getRecents(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]") as string[]; } catch { return []; }
}
export function pushRecent(id: string) {
  if (id.startsWith("file:")) return; // file index is huge + session-specific
  try {
    const cur = getRecents().filter((x) => x !== id);
    cur.unshift(id);
    localStorage.setItem(KEY, JSON.stringify(cur.slice(0, CAP)));
  } catch { /* private mode */ }
}
