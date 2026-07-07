# Button Operability Matrix — Dragons Alliance IDE (2026-07-07, HEAD 47b1929)

Authoritative source: `docs/superpowers/button-truth-table-current.md` (CDP-verified 27/27 + 18/18).
This matrix restates it in the operability format + adds the NEW zones planned this wave (marked PLANNED).

Legend: REAL · PARTIAL · DISABLED_WITH_REASON · SETUP_REQUIRED · BROKEN · FAKE · DUPLICATE · REMOVE · MOVE

## Verified current state (delta-free summary)
| Sector | Buttons | Status breakdown |
|---|---|---|
| Superpowers dock (7 chips + Admin) | 8 | 8 REAL (restricted chips honest-disabled per grant) |
| GODMODE panel | 12 | 12 REAL (incl. Full System Check, Emergency Stop w/ confirm, Admin CC, Health, Quick Guide) |
| Agent Rooflow panel | 9 | 8 REAL · 1 DISABLED_WITH_REASON (Reflow — no CLI op) |
| Claude Agents panel | 8 | 7 REAL · 1 DISABLED_WITH_REASON (Assign Sector — pending backend) |
| Cloud panel | 8 | 7 REAL · 1 DISABLED_WITH_REASON (Continue Session) |
| Graphify panel | 7 | 7 REAL (Open Map→Neuromap verified; Inspect→diag verified) |
| Obsidian panel | 8 | 8 REAL (Sync = real git; Open Drive verified) |
| Google APIs panel | 7 | 7 REAL · panel status SETUP_REQUIRED until user sign-in (honest) |
| Admin Command Center (4 tabs) | 4 tabs + 14 tools + guide actions | ALL REAL |
| Tools tab (in Admin) | 14 | 14 REAL |
| Quick Guide | 6 sections + 6 live buttons + 4 copy prompts | REAL |
| Command Palette | ~40 commands | REAL (disabled show reason, never run) |
| TopBar | 4 controls | REAL (SYSTEMS = live button → GODMODE) |
| StatusBar | telemetry | REAL (info) |
| Terminal sector | ~20 | REAL (CLI rows toast honestly when engine absent) |
| Agents sector | ~10 | REAL (per-agent Stop exact-match; disabled title when ambiguous) |
| Code sector | ~10 | REAL (Build/Tests gated on real package.json scripts) |
| Neuromap | ~15 | REAL (Team/Tasks modes honest-pending) |
| Drive | ~12 | REAL, Google tabs gated honest until sign-in |
| Metrics | ~8 | REAL |
| Preview | ~12 | REAL (Neo CDP; Micro-Terminal Run fixed) |
| Creative | ~10 | REAL UI · Generate DISABLED_WITH_REASON (needs key) |
| More menu | 18 items | REAL (OPERATIONS + Quick Guide added) |
| **Totals** | **≈95 audited + 79 formally tabled** | **0 FAKE · 0 BROKEN · 0 dead click** |

## PLANNED this wave (will be appended with verified status after build)
| Zone | Buttons planned | Target status |
|---|---|---|
| LLM Hub panel (8th superpower) | Detect Providers · Test Connection ×N · Open API Power Center · Open Logs · Guide | REAL probes; providers w/o keys = SETUP_REQUIRED |
| Settings ▸ API Power Center | per-provider Save/Test/Clear/Reveal-temp ×(LLM/Google/Creative/Browser/Obsidian/Agents) | REAL storage (0600, masked); Test = real HTTP/CLI |
| Sector Agent (global) | Ask Sector Agent (StatusBar) + per-sector quick actions + prompt→real claude arm | REAL (arms actual claude CLI with sector context) |
| Preview browsers | Detect Browsers · Open in Chrome/Brave/Firefox/Safari/Default · login-safe note | REAL (`open -a`, real detection) |
| Dragon Metrics | 5 primary + secondary cells + Reason panel | REAL-computed or explicit "needs instrumentation" |
| Creative framework | 5 image + 5 video slots + workflow | SETUP_REQUIRED honest, links to API Power Center |
| Guide | Start Tour · chat→guide-agent · 8 quick actions | REAL (tour = real navigation; chat = real claude arm) |
| Support panel | Report Issue (copy diagnostics) · Open Logs · Contact Admin · Troubleshoot · About | REAL |

Rule: zero FAKE, zero dead click, zero false success. Anything not wirable now ships DISABLED_WITH_REASON or SETUP_REQUIRED.
