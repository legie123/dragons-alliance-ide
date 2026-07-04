import { useState } from "react";
import { IcRadar } from "../components/icons";
import { useQuery } from "@tanstack/react-query";
import { fetchRadar, refreshRadar, human } from "../api";
import type { RepoItem } from "../api";

// Collapsible lens section with star-sorted repo cards.
function LensSection({ lens, repos }: { lens: string; repos: RepoItem[] }) {
  const [open, setOpen] = useState(true);
  const sorted = [...repos].sort((a, b) => b.stars - a.stars);
  return (
    <div className="radar-section">
      <button className="radar-lens" onClick={() => setOpen((o) => !o)}>
        <span>{open ? "▾" : "▸"} {lens}</span>
        <span>{repos.length}</span>
      </button>
      {open && sorted.map((r) => (
        <div key={r.full_name} className="radar-card" onClick={() => window.open(r.url, "_blank")}>
          <div className="radar-stars">★ {human(r.stars)}</div>
          {r.lang && <span className="radar-lang">{r.lang}</span>}
          <div className="radar-name">{r.full_name}</div>
          <div className="radar-desc">{r.desc}</div>
          <div className="radar-topics">
            {r.topics.slice(0, 4).map((t) => (
              <span key={t} className="radar-topic">{t}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function RadarView() {
  const { data } = useQuery({ queryKey: ["radar"], queryFn: fetchRadar, refetchInterval: 15000 });
  const [scanning, setScanning] = useState(false);

  const onRefresh = () => {
    refreshRadar();
    setScanning(true);
    setTimeout(() => setScanning(false), 30000);
  };

  return (
    <div className="radar-view">
      <div className="radar-head">
        <span className="radar-title"><IcRadar /> GITHUB RADAR</span>
        {data?.available && (
          <>
            <span>{data.scannedAt}</span>
            <span>{data.mode}</span>
            <span>{data.fresh} fresh / {data.total} scanned</span>
          </>
        )}
        <button className="radar-refresh" onClick={onRefresh} disabled={scanning}>
          {scanning ? "scanning…" : "Refresh"}
        </button>
      </div>

      {!data?.available ? (
        <div className="empty">run the radar once: node ~/code/github-radar/radar.mjs</div>
      ) : (
        data.sections.map((s) => <LensSection key={s.lens} lens={s.lens} repos={s.repos} />)
      )}
    </div>
  );
}
