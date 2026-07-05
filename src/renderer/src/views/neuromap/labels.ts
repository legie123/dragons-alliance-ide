// Smart label engine for NeuroMap — pure, unit-testable helpers.
//
// The whole point: labels are computed in SCREEN space (constant font-size,
// legible at every zoom) instead of living inside the scaled <g> where they
// shrink to dust and pile up. Priority decides who wins scarce space; a greedy
// screen-space collision pass kills the "label soup" at zoom-out.
import type { NeuroNode } from "../../api";

export type LabelMode = "smart" | "important" | "all" | "off";

export type LabelCtx = { selected: boolean; hovered: boolean };

// A node in the running for a label, already resolved to screen coords + text.
export type LabelCandidate = {
  id: string;
  text: string;    // already truncated for display
  sx: number;      // screen x (label anchor, centered)
  sy: number;      // screen y (label baseline, below the node)
  priority: number;
  force: boolean;  // selected/hovered — always placed, ignores cap
};

export type PlacedLabel = { id: string; text: string; sx: number; sy: number };

type Box = { x: number; y: number; w: number; h: number };

// selected +1000, hovered +900, fresh +200, then degree*10. People/active-project
// tiers are reserved for later (team backend not wired).
export function labelPriority(n: NeuroNode, ctx: LabelCtx): number {
  let p = n.deg * 10;
  if (n.fresh) p += 200;
  if (ctx.hovered) p += 900;
  if (ctx.selected) p += 1000;
  return p;
}

// More zoom → more room → more labels. Clamped so we never flood or starve.
export function labelCap(scale: number): number {
  return Math.max(8, Math.min(90, Math.round(8 + scale * 22)));
}

const EXT_RE = /\.(tsx|ts|jsx|js|mdx|md|css|scss|sass|less|json|ya?ml|toml|py|rs|go|rb|java|c|h|cpp|txt|html|svg|sh)$/i;

// Filename+ext → first10…+ext. Path-like → …/lastTwoSegments. Else long → slice(0,17)…
export function truncateLabel(title: string): string {
  const t = title.trim();
  const ext = t.match(EXT_RE);
  if (ext && t.length > 14) {
    const base = t.slice(0, t.length - ext[0].length);
    return base.slice(0, 10) + "…" + ext[0];
  }
  if (t.includes("/")) {
    const segs = t.split("/").filter(Boolean);
    if (segs.length > 2) return "…/" + segs.slice(-2).join("/");
    return t.length > 24 ? t.slice(0, 23) + "…" : t;
  }
  if (t.length > 17) return t.slice(0, 17) + "…";
  return t;
}

// Rough screen-space bbox centered on (sx, sy). Font ~13px → ~5.5px/char.
export function estimateLabelBox(text: string, sx: number, sy: number): Box {
  const w = text.length * 5.5 + 8;
  const h = 13;
  return { x: sx - w / 2, y: sy - h / 2, w, h };
}

function overlaps(a: Box, b: Box): boolean {
  return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
}

// Greedy screen-space placement. Forced labels (selected/hovered) always land and
// seed the occupancy map; the rest take the highest-priority slot that still fits,
// up to `cap`. Anything that collides is skipped (recoverable via the <title> tooltip).
export function placeLabels(candidates: LabelCandidate[], cap: number): PlacedLabel[] {
  const sorted = [...candidates].sort((a, b) => {
    if (a.force !== b.force) return a.force ? -1 : 1;
    return b.priority - a.priority;
  });
  const placed: PlacedLabel[] = [];
  const boxes: Box[] = [];
  let count = 0;
  for (const c of sorted) {
    const box = estimateLabelBox(c.text, c.sx, c.sy);
    if (c.force) {
      boxes.push(box);
      placed.push({ id: c.id, text: c.text, sx: c.sx, sy: c.sy });
      continue;
    }
    if (count >= cap) continue;
    if (boxes.some((b) => overlaps(b, box))) continue;
    boxes.push(box);
    placed.push({ id: c.id, text: c.text, sx: c.sx, sy: c.sy });
    count++;
  }
  return placed;
}
