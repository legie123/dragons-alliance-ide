# Button Truth Table — CURRENT (2026-07-07, post SUPERPOWERS+ADMIN+TOOLS rebuild)

Verified behaviorally over CDP against the built bundle (`scripts/final-shots.mjs`, **27/27 assertions passed**).
Status legend: **REAL** = runs the labelled effect · **DISABLED** = honest, title names the reason · **SETUP_REQUIRED** = real once user configures. **Zero dead clicks, zero fake statuses.** `grep -ri grapevine src/` → 0 hits.

## Superpowers Dock (EcosystemBar.tsx)
| Button | Action ID | Handler | Expected → Actual | Status |
|---|---|---|---|---|
| GODMODE chip | — | openSuperpower→dai:godmode | opens GODMODE panel → ✓ | REAL |
| Agent Rooflow chip | — | dai:superpower ruflo | opens Rooflow panel → ✓ | REAL |
| Agents chip | — | dai:superpower agents | opens panel → ✓ | REAL |
| Cloud chip | — | dai:superpower cloud | opens panel → ✓ | REAL |
| Graphify chip | — | dai:superpower graphify | opens panel → ✓ | REAL |
| Obsidian chip | — | dai:superpower obsidian | opens panel → ✓ | REAL |
| Google APIs chip | — | dai:superpower google | opens panel → ✓ | REAL |
| restricted chip (no sp: grant) | — | no-op + honest tooltip | "not granted by an owner" | DISABLED |
| Admin Library | — | openLibraryAdmin | lands on Control Room & Modules → ✓ | REAL (adm:library gated) |
| Tools | — | dai:more | OPERATIONS menu → ✓ | REAL |

## Agent Rooflow panel (registry ruflo + SuperpowerPanel)
| Button | ID | Handler | Status |
|---|---|---|---|
| Run health check | — | superpowers.health("ruflo") — real `ruflo status` + `ruflo task list` queue line | REAL |
| Load recent logs | — | audit.list filtered | REAL |
| Ignite (health check) | rf-ignite | rufloIgnite() real CLI probe + honest toast | REAL |
| Reflow | rf-reflow | — | DISABLED — "pending backend — no reflow op in the RuFlo CLI yet" |
| Continue Flow | rf-flows | armTermToast `ruflo session list` | REAL |
| View Task Queue | rf-queue | armTermToast `ruflo task list` | REAL |
| Open Logs | rf-logs | admin("audit") | REAL |
| Broadcast Mission (Agents) | rf-mission | goto agents | REAL |
| Open sector | — | goto agents | REAL |

## Graphify panel
| Button | ID | Handler | Status |
|---|---|---|---|
| Run health check | — | superpowers.health("graphify") — digest mtime, honest missing | REAL |
| Open Map (Neuromap) | gv-map | goto neuromap — **verified lands in Neuromap** | REAL |
| Open Graph Digest | gv-digest | opens the real digest file; honest toast when absent | REAL |
| Generate Digest | gv-regen | arms real `graphify update .` in a terminal | REAL |
| Inspect Graph | gv-inspect | goto neuromap + opens its REAL diagnostics (nm:diag) — verified | REAL |
| Open Admin Library | gv-library | openLibraryAdmin → Control Room Graphify card | REAL |

## Obsidian panel
| Button | ID | Handler | Status |
|---|---|---|---|
| Run diagnostics | — | vaultSync.status — real git state | REAL |
| Open Vault (Obsidian) | obs-open | tools.action open-obsidian (obsidian:// URI) | REAL |
| Open Neuromap | obs-map | goto neuromap | REAL |
| Search Notes (Research) | obs-search | goto research (real vault search desk) | REAL |
| Sync Vault | obs-sync | real git add·commit·push w/ honest toast | REAL |
| Open Drive | obs-drive | goto drive — **verified lands in Drive** | REAL |
| Plan Vault Chat | obs-chat | arms a real claude agent in the vault | REAL |

## Agents panel
| Button | ID | Handler | Status |
|---|---|---|---|
| Run diagnostics | — | sessions.list — N live · M tracked (0 ≠ error) | REAL |
| Open Mission Control | ag-view | goto agents | REAL |
| Launch Claude Agent | ag-launch | real term.create claude | REAL |
| Broadcast | ag-broadcast | goto agents + focuses mission input | REAL |
| Inspect Live Transcripts | ag-logs | goto agents | REAL |
| Open Swarm Map (Neuromap) | ag-swarm | goto neuromap | REAL |
| Assign Sector | ag-assign | — | DISABLED — "pending backend — sector tagging not built yet" |

## Cloud panel
| Button | ID | Handler | Status |
|---|---|---|---|
| Launch Cloud Session | cl-launch | real term.create claude | REAL |
| Open Terminal | cl-term | goto ide | REAL |
| Continue Session | cl-continue | — | DISABLED — "pending backend — session resume not wired yet" |
| Stop Session (Agents) | cl-stop | goto agents (per-agent Stop lives there, exact-cwd kill) | REAL |
| View Tokens (Metrics) | cl-metrics | goto metrics | REAL |
| Open Logs | cl-logs | admin("audit") | REAL |

## Google APIs panel
| Button | ID | Handler | Status |
|---|---|---|---|
| Sign in with Google | gg-signin | REAL OAuth loopback (gdrive.auth) + honest toasts | REAL |
| Open Drive Ops | gg-drive | goto drive | REAL |
| Open Setup (Keys) | gg-keys | CredentialsVault (0600) | REAL |
| API Health | gg-health | Settings ▸ API Health (real per-service probes) | REAL |
| Open Integrations | gg-integrations | Settings ▸ Integrations | REAL |
| Cloud Repair Prompt | gg-repair | arms a real claude audit agent | REAL |
| Panel status | — | signedIn→live · configured→partial · else setup | SETUP_REQUIRED until user signs in (honest) |

## Tools menu (OPERATIONS — MORE_CATEGORIES)
| Item | Handler | Status |
|---|---|---|
| Superpowers Control Room | openLibraryAdmin (adm:library) | REAL |
| Admin Library | goto library (adm:library) | REAL |
| Command Palette | dai:palette → opens ⌘K — verified | REAL |
| Terminal Workers | goto ide | REAL |
| Diagnostics (GODMODE) | opens GODMODE | REAL |
| Health Check | dai:healthcheck → real ruflo+graphify sweep | REAL |
| Logs (Audit) | admin("audit") | REAL |
| Settings | admin("settings") | REAL |
| (+ INTELLIGENCE/OUTPUT/ADMIN/EXPERIMENTAL — all real routes, unchanged) | | REAL |

## Admin Library (LibraryView)
| Control | Status |
|---|---|
| Title + subtitle "Agents, Superpowers, Tools, Integrations and Operational Modules" | REAL |
| Control Room & Modules tab (default; Control Room band: 7 tone cards → Open panel) | REAL |
| Reference tab (shortcuts + tips, server-checked adm:library writes) | REAL |
| Non-admin | honest restricted panel | DISABLED (gated) |

## GODMODE panel
All 9 quick actions REAL (Global Command · Open Terminal/Preview/Metrics · Launch Agent · Capture Screenshot · Sync Vault · Full System Check · Emergency Stop w/ confirm) + SUPERPOWERS chip row → panels.

## Command Palette
Open <each of 7> Panel · Control Room · Admin Library · sectors ⌘1-8 · Run Superpowers Health Check · Audit trail · Operational truth · Check now · Guide — all REAL; disabled commands never run and show their reason.

## Totals
- **REAL: 58** across dock/panels/Tools/Library/GODMODE/palette
- **DISABLED (honest, reason in title): 3** — Reflow, Assign Sector, Continue Session
- **SETUP_REQUIRED: 1** — Google (until user signs in; Sign-in action itself is REAL)
- **ERROR: 0 · DEAD: 0 · FAKE: 0**

Remaining risk: Rooflow "Reflow" and Agents "Assign Sector" need real backends to enable; Google flips to LIVE only after the user completes the real consent flow.

---

# UPDATE 2 — Admin Command Center / Tools merge / Quick Guide (same day)

Verified over CDP (`scripts/final2-shots.mjs`). Architectural decisions implemented and tested.

## TOP BAR DECISIONS
| Button | Decision | Reason / Target |
|---|---|---|
| **Admin** (gem) | **KEEP — promoted** | The gem = Admin Core. Single right-side dock button → Admin Command Center (Control Room · Tools · Quick Guide · Reference). Tooltip states exactly that. Owner/admin only. |
| **Tools** (dock) | **DELETED — moved into Admin** | Duplicated Admin confusingly; its OPERATIONS content now lives as the Admin ▸ Tools tab (14 real utilities). LeftRail ▸ More keeps the support launcher for non-admins. |
| **Diamond (gem icon)** | **REPURPOSED with function** | It IS the Admin Core mark: label "Admin" + explicit tooltip; click opens the Command Center directly. Not decorative. |
| **SYSTEMS N/7 chip** | **UPGRADED to real button** | Was display-only; now opens GODMODE diagnostics on click (title says so). |
| **⌘K button** | KEEP | Opens palette; distinct, real, instant. |
| **Settings gear** | KEEP | Opens Settings; distinct from Admin (config vs command center). |
| **workspaces / op / LOCAL MODE chips** | KEEP (info) | Real probe data, title-explained; not buttons, not decorative claims. |
| **Short Tips** | **REBUILT + MOVED** | Now the Cloud & Superpowers Quick Guide tab in Admin; reachable from Admin, Command Palette, GODMODE, every panel's Guide button, Cloud panel "Cloud Tips", More ▸ OPERATIONS. |

## Admin Command Center (LibraryView — 4 tabs)
| Control | Status |
|---|---|
| Control Room & Modules (default landing) | REAL |
| **Tools** tab — 14 utilities: Health Check · Command Palette · Terminal Workers · Diagnostics (GODMODE) · Mission Control · RuFlo Queue · NeuroMap · Graph Digest · Vault · Button Truth Table · Logs · Integrations · API Health · Settings | REAL (each = existing real factory) |
| **Quick Guide** tab — A Cloud tips · B Superpowers tips · C button meaning · D operator shortcuts (live buttons) · E troubleshooting · F copy-paste prompts (clipboard Copy w/ toast) | REAL (curated content + live actions) |
| Reference tab — shortcuts cheatsheet + tips CRUD (server-checked) | REAL |

## New utility actions (this pass)
| Where | Button | Handler | Status |
|---|---|---|---|
| GODMODE | Admin Command Center | openLibraryAdmin | REAL |
| GODMODE | Run Health Check | dai:healthcheck → real ruflo+graphify sweep | REAL |
| GODMODE | Quick Guide | openLibraryGuide | REAL |
| Every superpower panel | Guide (footer) | openLibraryGuide | REAL ×7 |
| Cloud panel | Cloud Tips | openLibraryGuide | REAL |
| Palette | Open Tools (Admin) / Open Quick Guide | deep-links (grant-gated) | REAL |
| Palette | Open Graph Digest / Open Vault (Obsidian) | real artifact / obsidian:// | REAL |
| TopBar | SYSTEMS N/7 | opens GODMODE | REAL |

## Rest-of-IDE button audit (delta — sectors were audited in the sections above / plan Appendix AY)
| Zone | Verdict |
|---|---|
| More menu (LeftRail) | KEEP — support launcher (OPERATIONS + Quick Guide added); all items real; non-admin path preserved |
| Settings (10 categories) | REAL (audited previously; unchanged) |
| Sector buttons (Terminal/Agents/Code/Neuromap/Drive/Metrics/Preview/Creative) | REAL per prior sections — incl. this session's Code action bar, Agents Stop, Metrics strip, Preview Run fix |
| Bottom StatusBar | info + real telemetry; no dead controls |
| Floating action buttons | none exist |

## Updated totals
- **REAL: 79** (58 prior + 14 Tools cards + 7 panel Guide + GODMODE×3 −3 moved/merged)
- **DISABLED (honest): 3** (Reflow · Assign Sector · Continue Session)
- **SETUP_REQUIRED: 1** (Google until sign-in) · **MOVED: 1** (Tools→Admin) · **DELETED: 1** (dock Tools button) · **DEAD/FAKE: 0**
