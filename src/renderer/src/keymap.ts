// Single keymap list — consumed by the App keydown handler docs, LeftRail
// hints, the Guide shortcuts section and Settings > Shortcuts. Kills drift.
import type { Copy } from "./hooks/useAppearance";

export type KeyBinding = { keys: string; label: Copy; scope: string };

export const KEYMAP: KeyBinding[] = [
  { keys: "⌘K", label: { en: "Toggle command palette", ro: "Comuta paleta de comenzi" }, scope: "global" },
  { keys: "⌘J", label: { en: "Toggle phone connect", ro: "Comuta conexiunea de pe telefon" }, scope: "global" },
  { keys: "⌘1–⌘8", label: { en: "Jump to core sector (Terminal…Creative)", ro: "Sari la sectorul principal (Terminal…Creative)" }, scope: "global" },
  { keys: "⌘S", label: { en: "Save the active file", ro: "Salveaza fisierul activ" }, scope: "Code" },
  { keys: "esc", label: { en: "Close panel / palette / guide", ro: "Inchide panoul / paleta / ghidul" }, scope: "overlays" },
  { keys: "↑ ↓ ⏎", label: { en: "Navigate + run in the palette", ro: "Navigheaza + ruleaza in paleta" }, scope: "palette" },
  { keys: "← →", label: { en: "Previous / next guide step", ro: "Pasul anterior / urmator in ghid" }, scope: "guide" },
];
