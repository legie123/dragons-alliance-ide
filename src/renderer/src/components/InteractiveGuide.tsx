import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CORE_SECTORS, MORE_CATEGORIES, STATUS_META, type OpStatus } from "../registry";

type GuideTarget =
  | "ide" | "agents" | "code" | "neuromap" | "drive" | "metrics" | "preview" | "creative"
  | "research" | "radar";

type GuideSector = {
  id: GuideTarget;
  label: string;
  group: "Core" | "Support";
  status: OpStatus;
  icon: () => ReactNode;
  purpose: string;
  firstAction: string;
  hint: string;
  risk: string;
};

const GUIDE_COPY: Record<GuideTarget, Pick<GuideSector, "purpose" | "firstAction" | "hint" | "risk">> = {
  ide: {
    purpose: "Rulezi terminale native, agenti Claude si comenzi de lucru.",
    firstAction: "Porneste sau selecteaza un terminal, apoi trimite comanda controlat.",
    hint: "Foloseste Terminal pentru lucru real pe fisiere, build, git si taskuri lungi.",
    risk: "Comenzile shell pot modifica fisiere. Verifica directorul curent inainte de executie.",
  },
  agents: {
    purpose: "Controlezi agenti, misiuni si transcripturi live.",
    firstAction: "Alege proiectul si lanseaza un agent doar cu scop clar.",
    hint: "Agents este zona buna pentru taskuri paralele si audit de activitate.",
    risk: "Un agent poate rula comenzi reale. Pastreaza misiunile scurte si verificabile.",
  },
  code: {
    purpose: "Citesti si editezi cod cu explorer si editor.",
    firstAction: "Deschide un fisier din proiect sau din cautare.",
    hint: "Code este pentru schimbari chirurgicale, nu pentru comenzi shell.",
    risk: "Editeaza local. Ruleaza build/test dupa schimbari.",
  },
  neuromap: {
    purpose: "Vezi harta de relatii intre note, proiecte si context.",
    firstAction: "Deschide mapa si filtreaza dupa nodul relevant.",
    hint: "Neuromap ajuta la orientare cand nu stii unde este informatia.",
    risk: "Relatiile depind de date locale. Trateaza rezultatul ca orientativ.",
  },
  drive: {
    purpose: "Lucrezi cu Google Drive si integrare API.",
    firstAction: "Verifica statusul OAuth si configurarea.",
    hint: "Drive cere credentiale valide. Daca lipsesc, mergi la Keys.",
    risk: "Poate atinge date externe. Nu executa sync fara sa intelegi tinta.",
  },
  metrics: {
    purpose: "Urmaresti consum, sesiuni si semnale operationale.",
    firstAction: "Verifica trendurile inainte de taskuri mari.",
    hint: "Metrics iti spune daca sistemul lucreaza sau consuma aiurea.",
    risk: "Metricile pot fi incomplete daca backendul nu raporteaza tot.",
  },
  preview: {
    purpose: "Testezi vizual aplicatii si rezultate in browser/preview.",
    firstAction: "Porneste app-ul, apoi verifica ecranul in Preview.",
    hint: "Preview este stopul obligatoriu pentru UI: vezi daca butoanele chiar fac ceva.",
    risk: "Un preview verde nu inseamna build complet. Ruleaza si testele.",
  },
  creative: {
    purpose: "Controlezi conectoare creative si output media.",
    firstAction: "Alege tool-ul si verifica dependintele.",
    hint: "Creative este util pentru assets, design si materiale generate.",
    risk: "Unele API-uri pot lipsi sau costa bani. Verifica statusul inainte.",
  },
  research: {
    purpose: "Cauti in vault, proiecte si surse de context.",
    firstAction: "Scrie o intrebare concreta, apoi deschide rezultatul relevant.",
    hint: "Research e prima oprire cand lipseste contextul.",
    risk: "Rezultatele sunt context, nu adevar final. Verifica sursa.",
  },
  radar: {
    purpose: "Scanezi GitHub si semnale externe de repo.",
    firstAction: "Ruleaza refresh doar cand vrei date noi.",
    hint: "Radar ajuta la triere rapida: repo-uri, miscari, oportunitati.",
    risk: "Date externe pot fi rate-limited sau indisponibile.",
  },
};

export function InteractiveGuide({
  open,
  current,
  onClose,
  onOpenSector,
}: {
  open: boolean;
  current: string;
  onClose: () => void;
  onOpenSector: (id: GuideTarget) => void;
}) {
  const sectors = useMemo<GuideSector[]>(() => {
    const core = CORE_SECTORS.map((s) => ({
      id: s.id as GuideTarget,
      label: s.label,
      group: "Core" as const,
      status: "live" as OpStatus,
      icon: s.icon,
      ...GUIDE_COPY[s.id as GuideTarget],
    }));
    const support = MORE_CATEGORIES.flatMap((cat) => cat.items)
      .filter((it) => it.id === "research" || it.id === "radar")
      .map((it) => ({
        id: it.id as GuideTarget,
        label: it.label,
        group: "Support" as const,
        status: it.status || "unknown" as OpStatus,
        icon: it.icon,
        ...GUIDE_COPY[it.id as GuideTarget],
      }));
    return [...core, ...support];
  }, []);

  const currentIndex = Math.max(0, sectors.findIndex((s) => s.id === current));
  const [selected, setSelected] = useState(currentIndex);
  useEffect(() => {
    if (open) setSelected(currentIndex);
  }, [currentIndex, open]);

  if (!open) return null;

  const active = sectors[selected] || sectors[0];
  const status = STATUS_META[active.status];
  const go = (delta: number) => setSelected((n) => (n + delta + sectors.length) % sectors.length);

  return (
    <div className="guide-backdrop" role="dialog" aria-modal="true" aria-label="Interactive sector guide">
      <div className="guide-panel">
        <div className="guide-head">
          <div>
            <div className="guide-kicker">INTERACTIVE GUIDE</div>
            <h2>Sector map</h2>
          </div>
          <button className="guide-close" onClick={onClose} title="Close guide">Close</button>
        </div>

        <div className="guide-body">
          <div className="guide-list">
            {sectors.map((s, i) => (
              <button
                key={s.id}
                className={i === selected ? "guide-sector active" : "guide-sector"}
                onClick={() => setSelected(i)}
                title={`Explain ${s.label}`}
              >
                <span className="guide-sector-ic">{s.icon()}</span>
                <span>
                  <strong>{s.label}</strong>
                  <em>{s.group}</em>
                </span>
              </button>
            ))}
          </div>

          <div className="guide-detail">
            <div className="guide-title-row">
              <span className="guide-big-ic">{active.icon()}</span>
              <div>
                <div className="guide-label">{active.label}</div>
                <div className="guide-status" style={{ color: status.color }}>{status.label}</div>
              </div>
            </div>

            <div className="guide-grid">
              <section>
                <h3>Ce face</h3>
                <p>{active.purpose}</p>
              </section>
              <section>
                <h3>Primul pas</h3>
                <p>{active.firstAction}</p>
              </section>
              <section>
                <h3>Hint</h3>
                <p>{active.hint}</p>
              </section>
              <section>
                <h3>Risc</h3>
                <p>{active.risk}</p>
              </section>
            </div>

            <div className="guide-actions">
              <button onClick={() => go(-1)} title="Previous sector">Prev</button>
              <button className="primary" onClick={() => onOpenSector(active.id)} title={`Open ${active.label}`}>
                Open sector
              </button>
              <button onClick={() => go(1)} title="Next sector">Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
