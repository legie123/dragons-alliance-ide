// Royal golden dragon emblem — the Dragons Alliance IDE mark.
// Pure SVG, gold gradient, ember eye. Sized via the `size` prop (default 30).
export function DragonEmblem({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Dragons Alliance" role="img">
      <defs>
        <linearGradient id="de-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f8e39a" />
          <stop offset="45%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#8b6a1a" />
        </linearGradient>
        <linearGradient id="de-ember" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#e0603d" />
          <stop offset="100%" stopColor="#d4af37" />
        </linearGradient>
        <radialGradient id="de-glow" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#d4af37" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#d4af37" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#de-glow)" />
      <circle cx="32" cy="32" r="29" fill="none" stroke="url(#de-gold)" strokeWidth="1.4" opacity="0.5" />
      <circle cx="32" cy="32" r="23.5" fill="none" stroke="url(#de-gold)" strokeWidth="0.7" opacity="0.3" />
      {/* royal dragon: crested head, serpentine body, wing, curled tail */}
      <path
        d="M14 46
           C 18 40 16 33 22 30
           C 20 26 24 22 29 23
           C 27 19 31 16 35 18
           C 34 14 39 13 41 17
           C 44 15 48 18 46 22
           C 51 22 53 27 49 30
           C 53 32 52 38 47 38
           C 49 42 45 47 40 45
           C 42 40 38 37 34 39
           C 37 42 36 47 31 47
           C 33 43 29 40 26 43
           C 28 46 24 49 20 47
           C 22 45 19 43 16 45 Z"
        fill="url(#de-gold)"
        stroke="url(#de-ember)"
        strokeWidth="0.7"
        strokeLinejoin="round"
      />
      {/* wing membrane */}
      <path d="M44 22 C 50 20 55 24 54 31 C 50 27 46 27 43 30 Z"
        fill="url(#de-gold)" opacity="0.85" stroke="url(#de-ember)" strokeWidth="0.5" />
      {/* ember eye */}
      <circle cx="39.5" cy="20.5" r="1.5" fill="#e0603d" />
      <circle cx="39.5" cy="20.5" r="0.6" fill="#fff3d0" />
      {/* breath sparks */}
      <path d="M12 50 L18 47 M50 51 L45 47" stroke="url(#de-ember)" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
