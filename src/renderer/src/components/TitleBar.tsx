// Frameless custom titlebar. The whole bar is the macOS drag region; padding-left
// leaves room for the traffic-light buttons. No window buttons — drag only.
// The mark is the imperial dragon sigil (brand asset), never an emoji glyph.
import { DragonEmblem } from "./DragonEmblem";

export function TitleBar() {
  return (
    <div className="titlebar">
      <span className="titlebar-mark"><DragonEmblem size={14} glow={false} /></span>
      <span className="titlebar-word">Dragons Alliance IDE</span>
    </div>
  );
}
