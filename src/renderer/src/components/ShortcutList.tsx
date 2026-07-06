// Reusable keybinding list — pure presentational, parameterized on `items` so
// Settings > Shortcuts and Library > Team can render the same markup without
// duplicating the map. No behavior change vs. the original inline map.
import type { KeyBinding } from "../keymap";

export function ShortcutList({ items }: { items: KeyBinding[] }) {
  return (
    <>
      {items.map((k) => (
        <div key={k.keys} className="audit-row">
          <span className="audit-kind" style={{ fontFamily: "ui-monospace, monospace" }}>{k.keys}</span>
          <span className="audit-detail">{k.label.en}</span>
          <span className="audit-ts">{k.scope}</span>
        </div>
      ))}
    </>
  );
}
