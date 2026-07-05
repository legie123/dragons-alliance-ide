// Corner toast container — subscribes to the vanilla toast bus. Subtle, brand
// tokens, no emoji. Click a toast to dismiss it early.
import { useSyncExternalStore } from "react";
import { getToasts, subscribeToasts, dismissToast } from "../toast";

export function ToastHost() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts);
  if (!toasts.length) return null;
  return (
    <div className="toast-host" role="status" aria-live="polite">
      {toasts.map((t) => (
        <button key={t.id} className={`toast toast-${t.kind}`} onClick={() => dismissToast(t.id)}
          title="dismiss">
          <span className={`toast-dot${t.kind === "checking" ? " spin" : ""}`} aria-hidden />
          <span className="toast-body">
            <span className="toast-title">{t.title}</span>
            {t.detail && <span className="toast-detail">{t.detail}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}
