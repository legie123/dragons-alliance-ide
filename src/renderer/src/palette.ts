// Command Palette registry + fuzzy matcher.
// Any view registers a *provider* (a function evaluated at open time — read from a
// ref so it returns current state). The palette flattens all providers + files.

export type Cmd = {
  id: string;
  title: string;
  subtitle?: string;
  category:
    | "Action" | "View" | "Project" | "Terminal" | "File" | "Superpower" | "Admin" | "Help"
    | "Sector" | "Recommended" | "Recent" | "Diagnostics" | "Settings" | "Guide";
  icon?: import("react").ReactNode;
  run: () => void;
  /** display-only shortcut hint (⌘1, ⌘S…) */
  shortcut?: string;
  /** live status chip (rendered via OpStatusBadge) */
  status?: import("./registry").OpStatus;
  /** honest reason — command renders muted + non-interactive */
  disabledReason?: string;
  /** extra fuzzy-match terms */
  keywords?: string[];
};

/** display order for the empty-query grouped view */
export const CATEGORY_ORDER: Cmd["category"][] = [
  "Recent", "Recommended", "Sector", "Superpower", "Action", "Terminal",
  "View", "Project", "Diagnostics", "Settings", "Guide", "Admin", "Help", "File",
];

/** rank: empty query → Recents first, then Recommended, then category order;
 *  with query → fuzzy over title+subtitle+keywords with recency boost. */
export function rankCommands(query: string, all: Cmd[], recents: string[]): Cmd[] {
  if (!query.trim()) {
    const recentCmds = recents
      .map((id) => all.find((c) => c.id === id))
      .filter((c): c is Cmd => !!c && !c.disabledReason)
      .slice(0, 6)
      .map((c) => ({ ...c, category: "Recent" as const }));
    const recentIds = new Set(recentCmds.map((c) => c.id));
    const rest = all
      .filter((c) => c.category !== "File" && !recentIds.has(c.id))
      .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));
    return [...recentCmds, ...rest];
  }
  const rIdx = new Map(recents.map((id, i) => [id, i]));
  return all
    .map((c) => {
      const kw = c.keywords?.length ? Math.max(...c.keywords.map((k) => fuzzyScore(query, k))) : 0;
      let s = Math.max(fuzzyScore(query, c.title) * 1.2, fuzzyScore(query, c.subtitle || ""), kw);
      if (s > 0 && rIdx.has(c.id)) s += 3 - Math.min(3, rIdx.get(c.id)! * 0.5);
      if (s > 0 && c.category === "Recommended") s += 2;
      return { c, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.c);
}

const providers = new Map<string, () => Cmd[]>();
const listeners = new Set<() => void>();

export function registerProvider(key: string, fn: () => Cmd[]): () => void {
  providers.set(key, fn);
  emit();
  return () => { providers.delete(key); emit(); };
}
export function paletteCommands(): Cmd[] {
  const out: Cmd[] = [];
  for (const fn of providers.values()) {
    try { out.push(...fn()); } catch { /* provider transient */ }
  }
  return out;
}
export function onPaletteChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function emit() { for (const l of listeners) l(); }

/** Subsequence fuzzy score. 0 = no match; higher = better. Rewards matches at
 *  word boundaries and consecutive runs, penalizes long strings. */
export function fuzzyScore(query: string, text: string): number {
  if (!query) return 1;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let ti = 0;
  let score = 0;
  let streak = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const idx = t.indexOf(q[qi], ti);
    if (idx === -1) return 0;
    let bonus = 1;
    if (idx === 0 || /[\/\s\-_.]/.test(t[idx - 1])) bonus += 4; // boundary
    if (idx === ti) { streak += 1; bonus += streak; } else streak = 0; // consecutive
    score += bonus;
    ti = idx + 1;
  }
  return score - t.length * 0.02;
}
