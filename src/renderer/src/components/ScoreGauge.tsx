import { motion } from "motion/react";
import { gradeColor } from "../api";

export function ScoreGauge({ score, size = 86 }: { score: number; size?: number }) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const color = gradeColor(pct);
  const dash = (pct / 100) * circ;

  return (
    <div className="gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
        <motion.circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={false}
          animate={{ strokeDashoffset: circ - dash }}
          transition={{ type: "spring", stiffness: 90, damping: 18 }}
          style={{ filter: `drop-shadow(0 0 6px ${color}aa)` }}
        />
      </svg>
      <div className="num">
        <b style={{ color }}>{score.toFixed(1)}</b>
        <span>score</span>
      </div>
    </div>
  );
}
