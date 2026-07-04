// Sigiliul imperial Dragons Alliance — dragonul auriu real (asset de brand),
// montat ca medalion circular cu inel de aur si glow controlat.
// API neschimbat (size prop) — toate punctele de folosinta raman valide.
import dragonLogo from "../assets/dragon-logo.png";

export function DragonEmblem({ size = 30, glow = true }: { size?: number; glow?: boolean }) {
  return (
    <span
      className={`dragon-emblem${glow ? " dragon-emblem-glow" : ""}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label="Dragons Alliance"
    >
      <img src={dragonLogo} alt="" draggable={false} />
    </span>
  );
}
