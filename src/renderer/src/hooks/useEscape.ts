// Shared Escape-to-close hook — replaces the keydown boilerplate copy-pasted
// across overlay components. Active only while `on` is true.
import { useEffect } from "react";

export function useEscape(on: boolean, close: () => void) {
  useEffect(() => {
    if (!on) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [on, close]);
}
