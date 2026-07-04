// Command Palette registry + fuzzy matcher.
// Any view registers a *provider* (a function evaluated at open time — read from a
// ref so it returns current state). The palette flattens all providers + files.

export type Cmd = {
  id: string;
  title: string;
  subtitle?: string;
  category: "Action" | "View" | "Project" | "Terminal" | "File" | "Superpower" | "Admin";
  icon?: import("react").ReactNode;
  run: () => void;
};

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
