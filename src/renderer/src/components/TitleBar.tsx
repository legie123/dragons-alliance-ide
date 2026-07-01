// Frameless custom titlebar. The whole bar is the macOS drag region; padding-left
// leaves room for the traffic-light buttons. No window buttons — drag only.
export function TitleBar() {
  return (
    <div className="titlebar">
      <span className="titlebar-mark">🜲</span>
      <span className="titlebar-word">Dragons Alliance IDE</span>
    </div>
  );
}
