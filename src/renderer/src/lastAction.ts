// Renderer-truth "last action" store for the status bar. Written by the right
// rail and the command palette when a REAL action executes. No polling.
export type LastAction = { label: string; at: number } | null;

let last: LastAction = null;
const subs = new Set<() => void>();

export function setLastAction(label: string) {
  last = { label, at: Date.now() };
  subs.forEach((f) => f());
}
export function getLastAction(): LastAction {
  return last;
}
export function subscribeLastAction(f: () => void): () => void {
  subs.add(f);
  return () => { subs.delete(f); };
}
