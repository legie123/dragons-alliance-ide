import { Element } from "../elements";

// A faceted elemental crystal. `lit` = synced to master → it glows & pulses;
// otherwise it's dim. Pure SVG, sized via `size`.
export function Crystal({ el, lit = false, size = 16 }: { el: Element; lit?: boolean; size?: number }) {
  const id = `cr-${el.key}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={`crystal${lit ? " lit" : ""}`}
      style={{ ["--cr-glow" as any]: el.glow }}
      aria-label={el.name}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="35%" stopColor={el.color} />
          <stop offset="100%" stopColor={el.color} stopOpacity="0.55" />
        </linearGradient>
      </defs>
      {/* faceted gem: top point, shoulders, body, bottom point */}
      <polygon
        points="12,1.5 20,8 12,22.5 4,8"
        fill={`url(#${id})`}
        stroke={el.color}
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      {/* facet lines */}
      <path d="M4 8 H20 M12 1.5 V22.5 M8 8 L12 14 L16 8" fill="none" stroke="#fff" strokeWidth="0.5" opacity="0.35" />
    </svg>
  );
}
