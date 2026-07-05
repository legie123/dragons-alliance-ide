// Appearance preferences — renderer-local (localStorage), applied as data-*
// attributes on <html>. Deliberately NOT in DaiSettings: these are per-window
// presentation prefs, not backend configuration. No fake settings.
import { useSyncExternalStore } from "react";

export type Appearance = {
  motion: "full" | "reduced";
  density: "comfortable" | "compact";
  glow: "on" | "off";
  lang: "en" | "ro";
};

const KEY = "dai.appearance.v1";
const DEFAULTS: Appearance = { motion: "full", density: "comfortable", glow: "on", lang: "en" };

function load(): Appearance {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Appearance>) };
  } catch {
    return DEFAULTS;
  }
}

let state: Appearance = load();
const subs = new Set<() => void>();

function apply(a: Appearance) {
  const el = document.documentElement;
  el.dataset.motion = a.motion === "reduced" ? "reduced" : "";
  el.dataset.density = a.density === "compact" ? "compact" : "";
  el.dataset.glow = a.glow === "off" ? "off" : "";
  el.lang = a.lang;
}
apply(state);

export function setAppearance(patch: Partial<Appearance>) {
  state = { ...state, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode */ }
  apply(state);
  subs.forEach((f) => f());
}
export function getAppearance(): Appearance {
  return state;
}
function subscribe(f: () => void): () => void {
  subs.add(f);
  return () => { subs.delete(f); };
}

export function useAppearance(): Appearance {
  return useSyncExternalStore(subscribe, getAppearance);
}
export function useAppearanceLang(): "en" | "ro" {
  return useSyncExternalStore(subscribe, () => state.lang);
}

/** bilingual copy helper — one shape everywhere */
export type Copy = { en: string; ro: string };
export function useT(): (c: Copy) => string {
  const lang = useAppearanceLang();
  return (c) => c[lang];
}
