// Elemental identity for terminals — each worker slot is one element with its own
// crystal colour. Slots 1–4 are the classical elements (Water/Air/Fire/Earth),
// 5–8 are mystic crystals so up to 8 terminals each stay distinct.
export type Element = {
  key: string;
  name: string;        // Romanian element name
  glyph: string;       // emoji fallback
  color: string;       // crystal core colour
  glow: string;        // rgba glow when lit (synced to master)
};

export const ELEMENTS: Element[] = [
  { key: "apa",    name: "Apă",    glyph: "💧", color: "#38bdf8", glow: "rgba(56,189,248,0.85)" },
  { key: "aer",    name: "Aer",    glyph: "🌬", color: "#a5f3fc", glow: "rgba(165,243,252,0.85)" },
  { key: "foc",    name: "Foc",    glyph: "🔥", color: "#f97316", glow: "rgba(249,115,22,0.9)" },
  { key: "pamant", name: "Pământ", glyph: "🌿", color: "#4ade80", glow: "rgba(74,222,128,0.85)" },
  { key: "eter",   name: "Eter",   glyph: "✦",  color: "#a78bfa", glow: "rgba(167,139,250,0.9)" },
  { key: "fulger", name: "Fulger", glyph: "⚡", color: "#fbbf24", glow: "rgba(251,191,36,0.9)" },
  { key: "gheata", name: "Gheață", glyph: "❄",  color: "#67e8f9", glow: "rgba(103,232,249,0.85)" },
  { key: "umbra",  name: "Umbră",  glyph: "☾",  color: "#e879f9", glow: "rgba(232,121,249,0.9)" },
];

/** Element for a terminal at 0-based index (wraps past 8). */
export function elementFor(index: number): Element {
  return ELEMENTS[((index % ELEMENTS.length) + ELEMENTS.length) % ELEMENTS.length];
}
