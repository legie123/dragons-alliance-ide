import { memo } from "react";
import { motion } from "motion/react";
import { Session, human, gradeColor, idleLabel } from "../api";
import { ScoreGauge } from "./ScoreGauge";

function Bar({ label, value, inverse = false, flag }: {
  label: string;
  value: number;
  inverse?: boolean;
  /** honest overflow flag — shown next to the label; title carries the true number */
  flag?: { text: string; title: string };
}) {
  const color = gradeColor(inverse ? 100 - value : value);
  return (
    <div className="metric">
      <div className="ml">
        {label}
        {flag && (
          <span
            title={flag.title}
            style={{ color: "var(--state-error)", marginLeft: 4, fontSize: "0.85em", cursor: "help" }}
          >
            {flag.text}
          </span>
        )}
      </div>
      <div className="track">
        <motion.div
          className="fill"
          style={{ background: color, boxShadow: `0 0 8px ${color}88` }}
          initial={false}
          animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>
      <div className="mv" style={{ color }}>{value.toFixed(1)}%</div>
    </div>
  );
}

export const SessionCard = memo(function SessionCard({ s }: { s: Session }) {
  const glow = gradeColor(s.score);
  const live = s.idle_min < 3;
  const dotColor = live ? "#34d399" : s.idle_min < 15 ? "#fbbf24" : "#59617a";

  return (
    <motion.div
      layout
      className="card"
      style={{ ["--glow" as any]: glow }}
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 200, damping: 26 }}
    >
      <div className="card-top">
        <ScoreGauge score={s.score} />
        <div className="headinfo">
          <p className="title">{s.title}</p>
          <div className="metarow">
            <span className="dot" style={{ background: dotColor, boxShadow: `0 0 8px ${dotColor}` }} />
            <span>{idleLabel(s.idle_min)}</span>
            <span className="chip model">{s.model}</span>
            <span className="chip proj">
              {s.cwd}
              {s.branch ? `/${s.branch}` : ""}
            </span>
            <span className="chip">{s.users}↳ {s.assistants}⊙ {s.tools}⚒</span>
          </div>
        </div>
      </div>

      <div className="metrics">
        {/* capacity = ctx/window*100 — the only bar that can exceed 100 (context past
            the model window). Displayed value is clamped; the flag carries the truth.
            meaningful is clamped at the source (Math.min 100) and understanding is a
            subset ratio (cache_read/total_input ≤ 100) — neither can overflow. */}
        <Bar
          label="capacity"
          value={Math.min(100, s.capacity)}
          inverse
          flag={s.capacity > 100 ? {
            text: "context overflow",
            title: `context exceeds the window — real value ${s.capacity.toFixed(0)}%`,
          } : undefined}
        />
        <Bar label="meaning" value={s.meaningful} />
        <Bar label="undrstd" value={s.understanding} />
      </div>

      <div className="tokens">
        <span>
          context <span className="big">{human(s.ctx)}</span> / {human(s.win)}
        </span>
        <span>
          output <span className="big">{human(s.out)}</span>
        </span>
      </div>
    </motion.div>
  );
});
