// Dragons Alliance IDE — minimal toast bus (no deps).
//
// A vanilla external store so module-scope action handlers (registry.tsx, which
// are plain functions, not React hooks) can surface CHECKING → success/error
// feedback. <ToastHost> subscribes via useSyncExternalStore. No emoji, brand
// tokens only. "checking" toasts persist until updated; the rest auto-dismiss.
export type ToastKind = "checking" | "info" | "success" | "error";
export type ToastItem = {
  id: string;
  kind: ToastKind;
  title: string;
  detail?: string;
  ttl?: number;        // ms until auto-dismiss (ignored while kind === "checking")
  createdAt: number;
};

const MAX = 4;
let items: ToastItem[] = [];
const listeners = new Set<() => void>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function emit() { for (const l of listeners) l(); }
function clearTimer(id: string) { const t = timers.get(id); if (t) { clearTimeout(t); timers.delete(id); } }
function arm(item: ToastItem) {
  clearTimer(item.id);
  if (item.kind !== "checking" && item.ttl && item.ttl > 0) {
    timers.set(item.id, setTimeout(() => dismissToast(item.id), item.ttl));
  }
}

export function pushToast(t: Omit<ToastItem, "id" | "createdAt"> & { id?: string }): string {
  const id = t.id ?? `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const item: ToastItem = { ttl: 4500, ...t, id, createdAt: Date.now() };
  items = [...items.filter((x) => x.id !== id), item].slice(-MAX);
  arm(item);
  emit();
  return id;
}

export function updateToast(id: string, patch: Partial<Omit<ToastItem, "id" | "createdAt">>): void {
  const it = items.find((x) => x.id === id);
  if (!it) return;
  const next: ToastItem = { ...it, ...patch };
  items = items.map((x) => (x.id === id ? next : x));
  arm(next);
  emit();
}

export function dismissToast(id: string): void {
  clearTimer(id);
  items = items.filter((x) => x.id !== id);
  emit();
}

export function getToasts(): ToastItem[] { return items; }
export function subscribeToasts(cb: () => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
