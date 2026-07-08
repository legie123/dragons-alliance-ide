// Persistent "Kit Setup" nudge — shown just under the Superpowers dock while
// the onboarding kit is incomplete. Unlike the first-run WIZARD (dismissable),
// this banner has no close button: it disappears only when useKit reports the
// kit complete, so a team member can't accidentally lose the nudge.
import { useKit } from "../hooks/useKit";

export function KitBanner() {
  const { ready, total, complete, checking, results } = useKit();
  // Render NOTHING when the kit is complete OR still on the very first probe.
  if (complete || (checking && results.length === 0)) return null;

  const missing = results.filter((r) => !r.item.optional && r.status !== "ready").map((r) => r.item.label);
  const open = () => window.dispatchEvent(new CustomEvent("dai:kit"));

  return (
    <div className="kit-banner" role="status">
      <span className="kit-banner-ic" aria-hidden>🧰</span>
      <span className="kit-banner-text">
        <b>Your kit is {ready}/{total}.</b>{" "}
        {missing.length ? `Install ${missing.join(", ")} to unlock full power.` : "Finish setup to reach full power."}
      </span>
      <button className="kit-banner-cta da-btn gold sm" onClick={open}>Complete setup</button>
    </div>
  );
}
