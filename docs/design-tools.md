# Design Tooling

This repo uses lightweight, local design tooling for the Electron/Vite renderer.

## Installed

- Storybook: component workbench for React/Vite components.
- tldraw: local whiteboard/canvas demo.
- Excalidraw: sketching/wireframe demo.

## Commands

- `npm run storybook` starts Storybook on port 6006.
- `npm run build:storybook` builds the static Storybook bundle.
- `VITE_DAI_DESIGN_DEMOS=1 npm run dev` shows the tldraw/Excalidraw demo panel inside Creative.

## Penpot

Penpot is intentionally not installed locally in this app. Treat it as an external design system tool for shared product design, brand work, and team review. Export production assets or tokens from Penpot into this repo only when they are ready to ship.
