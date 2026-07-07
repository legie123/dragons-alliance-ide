# Design Tools Task Summary

Date: 2026-07-05

## What was installed

- Storybook for React/Vite
  - Packages: `storybook` `^10.4.6`, `@storybook/react-vite` `^10.4.6`
  - Why: component workbench for the Dragons Alliance IDE UI and future design-system work.
  - Added commands: `npm run storybook`, `npm run build:storybook`
  - Added files: `.storybook/main.ts`, `.storybook/preview.ts`, `src/renderer/src/components/MissionBar.stories.tsx`

- tldraw
  - Package: `tldraw` `^5.2.2`
  - Why: fast visual canvas/whiteboard for product flows, UI maps, and early design exploration.
  - Integration: lazy-loaded demo component behind `VITE_DAI_DESIGN_DEMOS=1`
  - Added file: `src/renderer/src/components/design-tools/TldrawDemo.tsx`

- Excalidraw
  - Package: `@excalidraw/excalidraw` `^0.18.1`
  - Why: sketch-style wireframes, rough layouts, and communication diagrams.
  - Integration: lazy-loaded demo component behind `VITE_DAI_DESIGN_DEMOS=1`
  - Added file: `src/renderer/src/components/design-tools/ExcalidrawDemo.tsx`

## What was configured

- A minimal Storybook setup for the existing Electron + Vite + React renderer.
- A sample story for an existing component: `MissionBar`.
- A Creative panel design-lab demo wrapper: `DesignToolDemos`.
- Feature-flagged access through `VITE_DAI_DESIGN_DEMOS=1 npm run dev`, so normal IDE flows stay untouched.
- Documentation: `docs/design-tools.md`
- Generated Storybook output is ignored through `.gitignore` as `storybook-static/`.

## What was not installed

- Penpot
  - Reason: not safe or useful as a local npm dependency inside the Electron app.
  - Recommended use: external/self-hosted design tool for brand, product design, and team review.
  - Documented in: `docs/design-tools.md`

- Figma
  - Reason: external SaaS/design platform, not a repo dependency.
  - If needed later: add links/docs or token export workflow, not an app install.

- Canva
  - Reason: already represented as a Creative API concept, but needs API credentials and product integration.
  - Not installed because this task was local design tooling, not provider-backed generation.

- Runway, Higgsfield, Ideogram, ElevenLabs, Nanobanan
  - Reason: creative provider integrations need API keys and backend workflows.
  - Not installed because they are not local design-system tools and would create fake/unusable buttons without credentials.

- Penpot server stack
  - Reason: would require Docker/server setup and operational decisions.
  - Not installed because the safe scope was repo-local tooling only.

## Verification run

- `npm run build`: passed.
- `npm run build:storybook`: passed.
- `npx tsc --noEmit`: passed.
- `npm run doctor`: passed with the same two external blockers:
  - Google OAuth config missing.
  - Graphify digest missing.

## Final scenario

The task started with a check that Dragons Alliance IDE had no Storybook, tldraw, Excalidraw, or Penpot setup. The repo was detected as Electron + Vite + React + TypeScript. I installed the relevant local design stack, added minimal config and demo components, kept the demos behind a feature flag, documented Penpot as external instead of installing it locally, and verified the result with build, Storybook build, TypeScript, and doctor checks.

No commit was created.
