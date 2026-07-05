// Dragon Guide content — bilingual (EN/RO), structured as sections of steps.
// Static copy lives here; live data (superpower status, STATUS_META colors)
// is joined at render time in GuidePanel so the guide can never drift from
// the registry truth.
import type { Copy } from "./hooks/useAppearance";
import type { SectorId } from "./registry";
import type { View } from "./views";

export type GuideStep = {
  id: string;
  title: Copy;
  body: Copy;
  /** navigation target — renders an "Open this sector" button */
  target?: View;
  /** real action id resolved by GuidePanel (openGraphify, doctor-copy, keys…) */
  action?: { id: "open-graphify" | "open-obsidian" | "open-keys" | "open-audit" | "copy-doctor" | "launch-claude"; label: Copy };
  /** honest pending marker */
  disabledReason?: Copy;
};
export type GuideSectionDef = {
  id: string;
  title: Copy;
  kind: "static" | "sectors" | "superpowers" | "status" | "shortcuts";
  steps?: GuideStep[];
};

export const SECTOR_GUIDE: Record<SectorId, { what: Copy; first: Copy }> = {
  ide: {
    what: { en: "Direct execution: a master terminal that can drive up to 8 worker terminals (mirror, channels, broadcast).", ro: "Executie directa: un terminal master care poate conduce pana la 8 workeri (mirror, canale, broadcast)." },
    first: { en: "Deploy a worker, then try DEPLOY 4 for a tile wall.", ro: "Deployeaza un worker, apoi incearca DEPLOY 4 pentru perete de tile-uri." },
  },
  agents: {
    what: { en: "Mission control for live Claude agents: roster with health + score, streaming transcript, broadcast, opt-in Autopilot self-repair.", ro: "Mission control pentru agentii Claude live: roster cu health + scor, transcript live, broadcast, Autopilot opt-in." },
    first: { en: "Launch an agent from the right rail, watch its transcript stream.", ro: "Lanseaza un agent din bara din dreapta si urmareste-i transcriptul." },
  },
  code: {
    what: { en: "Engineering deck: Monaco editor, file tree, git branch/diff badge, ⌘S save.", ro: "Puntea de inginerie: editor Monaco, arbore de fisiere, badge git branch/diff, salvare ⌘S." },
    first: { en: "Open a file from the tree or via ⌘K file search.", ro: "Deschide un fisier din arbore sau prin cautarea ⌘K." },
  },
  neuromap: {
    what: { en: "The living knowledge graph of your Obsidian vault — real notes and wikilinks, layers, lenses, focus mode, live growth pulses.", ro: "Graful viu al vault-ului Obsidian — note si wikilink-uri reale, layere, lentile, focus mode, pulsuri live." },
    first: { en: "Click a node, then Focus to dim everything but its neighborhood.", ro: "Click pe un nod, apoi Focus ca sa estompezi tot in afara vecinatatii lui." },
  },
  drive: {
    what: { en: "Document ops: Google Drive/Sheets/Forms/Gmail on your own OAuth client, plus Proton, candidates and activity. Everything gates honestly on sign-in.", ro: "Operatiuni documente: Google Drive/Sheets/Forms/Gmail pe OAuth-ul tau, plus Proton, candidati si activitate. Totul e conditionat onest de sign-in." },
    first: { en: "Config tab → save OAuth client → sign in.", ro: "Tab Config → salveaza clientul OAuth → sign in." },
  },
  metrics: {
    what: { en: "Observability: live session scores, context/output totals, reasoning stream of the top agent.", ro: "Observabilitate: scoruri live pe sesiuni, totaluri context/output, fluxul de reasoning al agentului de top." },
    first: { en: "Launch a Claude session and watch its score land here.", ro: "Lanseaza o sesiune Claude si urmareste-i scorul aici." },
  },
  preview: {
    what: { en: "Visual QA: iframe preview of dev servers, or drive the real Neo browser over CDP — click and scroll inside the live frame.", ro: "QA vizual: preview iframe pentru dev servere sau controleaza browserul Neo real prin CDP — click si scroll direct in frame." },
    first: { en: "Run npm run dev in a terminal, paste the URL, press Start.", ro: "Ruleaza npm run dev intr-un terminal, lipeste URL-ul, apasa Start." },
  },
  creative: {
    what: { en: "Output studio: creative API connectors (Higgsfield, Canva, Runway…). Honest gating — no key, no fake output.", ro: "Studio de productie: conectori API creativi (Higgsfield, Canva, Runway…). Gating onest — fara cheie, fara output fals." },
    first: { en: "Add an API key in .env.local to enable a generator.", ro: "Adauga o cheie API in .env.local ca sa activezi un generator." },
  },
};

export const GUIDE_SECTIONS: GuideSectionDef[] = [
  {
    id: "welcome",
    title: { en: "Welcome", ro: "Bun venit" },
    kind: "static",
    steps: [
      {
        id: "w1",
        title: { en: "What is Dragons Alliance IDE", ro: "Ce este Dragons Alliance IDE" },
        body: {
          en: "A native command center for AI operations: persistent terminals over a real PTY host, live Claude agent mission control, code, knowledge graph, documents and metrics — in one premium cockpit. Nothing here fakes status: every light comes from a real probe.",
          ro: "Un centru de comanda nativ pentru operatiuni AI: terminale persistente pe un PTY host real, mission control pentru agentii Claude, cod, graf de cunoastere, documente si metrici — intr-un singur cockpit premium. Nimic nu simuleaza status: fiecare indicator vine dintr-o proba reala.",
        },
      },
      {
        id: "w2",
        title: { en: "Core Sectors (left rail)", ro: "Sectoarele principale (bara stanga)" },
        body: {
          en: "The left rail holds the eight permanent decks: Terminal, Agents, Code, Neuromap, Drive, Metrics, Preview, Creative. Jump with ⌘1–⌘8. The active sector tints the frame with its signature color.",
          ro: "Bara din stanga tine cele opt punti permanente: Terminal, Agents, Code, Neuromap, Drive, Metrics, Preview, Creative. Sari cu ⌘1–⌘8. Sectorul activ coloreaza rama cu accentul lui.",
        },
      },
      {
        id: "w3",
        title: { en: "Superpowers (dock) & Right Rail", ro: "Superputerile (dock) si bara dreapta" },
        body: {
          en: "The dock under the top bar shows the seven superpowers with LIVE probe status — hover for a plain-language explanation, click for quick actions. The right rail always offers the actions that make sense for the active sector.",
          ro: "Dock-ul de sub bara de sus arata cele sapte superputeri cu status LIVE din probe — hover pentru explicatie simpla, click pentru actiuni rapide. Bara din dreapta ofera mereu actiunile potrivite sectorului activ.",
        },
      },
    ],
  },
  { id: "sectors", title: { en: "Core Sectors", ro: "Sectoare" }, kind: "sectors" },
  { id: "superpowers", title: { en: "Superpowers", ro: "Superputeri" }, kind: "superpowers" },
  {
    id: "workflows",
    title: { en: "Workflows", ro: "Workflow-uri" },
    kind: "static",
    steps: [
      {
        id: "wf1",
        title: { en: "Build / Code", ro: "Build / Cod" },
        body: { en: "Code (edit, ⌘S) → Agents (delegate the heavy lifting) → Terminal (build, git) → Preview (see it run) → Metrics (verify the session).", ro: "Code (editezi, ⌘S) → Agents (delegi munca grea) → Terminal (build, git) → Preview (o vezi ruland) → Metrics (verifici sesiunea)." },
        target: "code",
      },
      {
        id: "wf2",
        title: { en: "Knowledge", ro: "Cunoastere" },
        body: { en: "Drive/Obsidian (capture) → Grapevine digest → Neuromap (see the connections) → Agents (act on them).", ro: "Drive/Obsidian (capturezi) → digest Grapevine → Neuromap (vezi conexiunile) → Agents (actionezi pe ele)." },
        target: "neuromap",
      },
      {
        id: "wf3",
        title: { en: "Operations", ro: "Operatiuni" },
        body: { en: "GODMODE (system truth) → Metrics (what's running) → Ruflo (orchestrate) → Agents → Terminal (execute).", ro: "GODMODE (adevarul sistemului) → Metrics (ce ruleaza) → Ruflo (orchestrezi) → Agents → Terminal (executi)." },
        target: "metrics",
      },
      {
        id: "wf4",
        title: { en: "Creative", ro: "Creativ" },
        body: { en: "Creative (generate) → Preview (visual QA) → Drive (file it) → Agents (iterate).", ro: "Creative (generezi) → Preview (QA vizual) → Drive (arhivezi) → Agents (iterezi)." },
        target: "creative",
      },
    ],
  },
  { id: "status", title: { en: "Status Explained", ro: "Statusuri explicate" }, kind: "status" },
  { id: "shortcuts", title: { en: "Shortcuts", ro: "Scurtaturi" }, kind: "shortcuts" },
  {
    id: "team",
    title: { en: "Team Mode", ro: "Mod echipa" },
    kind: "static",
    steps: [
      {
        id: "tm1",
        title: { en: "Local mode today", ro: "Mod local azi" },
        body: { en: "Everything runs on this Mac: audit trail, permissions, vault sync. The operator chip in the top bar shows who's driving.", ro: "Totul ruleaza pe acest Mac: audit trail, permisiuni, sync vault. Chip-ul operator din bara de sus arata cine conduce." },
      },
      {
        id: "tm2",
        title: { en: "Shared missions", ro: "Misiuni partajate" },
        body: { en: "Remote team features (shared missions, assigned tasks, multi-operator audit) need a backend that doesn't exist yet — the UI will light up when it lands.", ro: "Functiile de echipa remote (misiuni partajate, taskuri asignate, audit multi-operator) au nevoie de un backend care nu exista inca — UI-ul se aprinde cand apare." },
        disabledReason: { en: "pending backend", ro: "backend in asteptare" },
      },
    ],
  },
  {
    id: "troubleshooting",
    title: { en: "Troubleshooting", ro: "Depanare" },
    kind: "static",
    steps: [
      {
        id: "ts1",
        title: { en: "Google APIs — setup required", ro: "Google APIs — necesita setup" },
        body: { en: "OAuth credentials or the refresh token are missing. Open Keys, save your Desktop-app OAuth client, sign in.", ro: "Lipsesc credentialele OAuth sau refresh token-ul. Deschide Keys, salveaza clientul OAuth (Desktop app), fa sign in." },
        action: { id: "open-keys", label: { en: "Open Keys", ro: "Deschide Keys" } },
      },
      {
        id: "ts2",
        title: { en: "Grapevine digest missing / stale", ro: "Digest Grapevine lipsa / vechi" },
        body: { en: "Neuromap and Grapevine feed on the Graphify digest. If it's stale, regenerate it — the launchd job syncs ~/code automatically.", ro: "Neuromap si Grapevine se hranesc din digestul Graphify. Daca e vechi, regenereaza-l — job-ul launchd sincronizeaza ~/code automat." },
        action: { id: "open-graphify", label: { en: "Open Graph Digest", ro: "Deschide digestul" } },
      },
      {
        id: "ts3",
        title: { en: "Ruflo idle or unreachable", ro: "Ruflo idle sau inaccesibil" },
        body: { en: "Ruflo status comes from the freshness of its vector DB. Idle just means no active flow. If it looks wrong, run the doctor.", ro: "Statusul Ruflo vine din prospetimea bazei vectoriale. Idle inseamna doar ca nu e niciun flow activ. Daca pare gresit, ruleaza doctorul." },
        action: { id: "copy-doctor", label: { en: "Copy doctor command", ro: "Copiaza comanda doctor" } },
      },
      {
        id: "ts4",
        title: { en: "No agents / empty swarm", ro: "Fara agenti / swarm gol" },
        body: { en: "Agents appear when Claude sessions run. Launch one and the roster, health and metrics light up.", ro: "Agentii apar cand ruleaza sesiuni Claude. Lanseaza una si rosterul, health-ul si metricile se aprind." },
        action: { id: "launch-claude", label: { en: "Launch Claude", ro: "Lanseaza Claude" } },
      },
      {
        id: "ts5",
        title: { en: "Build or typecheck errors", ro: "Erori de build sau typecheck" },
        body: { en: "npm run build is the gate (main + preload + renderer). Check the audit log for the actions that preceded a failure.", ro: "npm run build e poarta (main + preload + renderer). Verifica audit log-ul pentru actiunile dinaintea unei erori." },
        action: { id: "open-audit", label: { en: "Open Audit", ro: "Deschide Audit" } },
      },
    ],
  },
];
