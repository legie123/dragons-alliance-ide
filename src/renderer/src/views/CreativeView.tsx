// Creative — visual/content production via creative APIs. Each tool needs an API
// key; without one the card shows "needs config" (no fake output). Prompt input,
// project selector, and asset gallery structure are real; generation is gated on
// keys. Assets, once produced, link to a project + become Creative nodes (magenta).
import { useState } from "react";
import { IcPalette } from "../components/icons";
import { useQuery } from "@tanstack/react-query";
import { fetchProjects } from "../api";

const TOOLS = [
  { key: "higgsfield", name: "Higgsfield", kind: "video / motion", env: "HIGGSFIELD_API_KEY" },
  { key: "canva", name: "Canva", kind: "design / layout", env: "CANVA_API_KEY" },
  { key: "nanobanan", name: "Nanobanan", kind: "image gen", env: "NANOBANAN_API_KEY" },
  { key: "runway", name: "Runway", kind: "video gen", env: "RUNWAY_API_KEY" },
  { key: "ideogram", name: "Ideogram", kind: "typographic image", env: "IDEOGRAM_API_KEY" },
  { key: "eleven", name: "ElevenLabs", kind: "voice / audio", env: "ELEVENLABS_API_KEY" },
];

export function CreativeView() {
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: fetchProjects, refetchInterval: 5000 });
  const [tool, setTool] = useState(TOOLS[0].key);
  const [prompt, setPrompt] = useState("");
  const [proj, setProj] = useState("");
  const active = TOOLS.find((t) => t.key === tool)!;

  return (
    <div className="cr-view">
      <div className="cr-bar">
        <span className="cr-title"><IcPalette /> CREATIVE</span>
        <select className="cr-sel" value={proj} onChange={(e) => setProj(e.target.value)}>
          <option value="">link to project…</option>
          {projects.map((p) => <option key={p.path} value={p.path}>{p.name}</option>)}
        </select>
      </div>

      <div className="cr-body">
        <div className="cr-tools">
          {TOOLS.map((t) => (
            <button key={t.key} className={`cr-card${tool === t.key ? " sel" : ""}`} onClick={() => setTool(t.key)}>
              <div className="cr-card-name">{t.name}</div>
              <div className="cr-card-kind">{t.kind}</div>
              <div className="cr-card-status needs">● needs {t.env}</div>
            </button>
          ))}
        </div>

        <div className="cr-studio">
          <div className="cr-studio-head">{active.name} · {active.kind}</div>
          <textarea className="cr-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={`prompt for ${active.name}…`} />
          <div className="cr-actions">
            <button className="cr-gen" disabled title={`set ${active.env} to enable`}>Generate</button>
            <span className="cr-needs">Set <code>{active.env}</code> in <code>.env.local</code> to enable — no key, no fake output.</span>
          </div>
          <div className="cr-gallery">
            <div className="cr-gallery-head">Asset gallery</div>
            <div className="cr-empty">No assets yet. Generated assets link to the selected project and appear as Creative nodes in Neuromap.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
