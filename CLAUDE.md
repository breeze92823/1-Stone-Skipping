# Stone Skipping

3D stone-skipping lobby game. Vite + React 18 + @react-three/fiber 8 + three 0.171 + zustand. Plain JS/JSX, no TypeScript, no tests, no linter.

## Commands
- `npm run dev` — dev server
- `npm run build` — production build to `dist/` (generated; never read or edit it)
- `.env.example` documents `VITE_DEV_MODE` (skips the Bloxity SDK/CDN)

## Layout (`src/`)
- `main.jsx`, `App.jsx` — entry; Canvas + HUD composition
- `components/` — R3F scene pieces and DOM HUD (`Hud.jsx`, `Leaderboards.jsx`). One landmark/feature per file.
- `systems/` — framework-free logic. **No React imports here.** Player movement, camera, stones, Bloxity SDK facade, settings/session singletons.
- `data/` — constants and config. World layout/positions live in `data/world.js`; SDK settings in `data/bloxity.js`.
- `store/useGameStore.js` — zustand store for slow HUD state (skill, level, skips, etc.)
- `materials/`, `utils/` — shared materials, canvas label and RNG helpers
- `index.css` — all styling (HUD/DOM)

## Architecture rules
- One simulation tick: `components/GameLoop.jsx` runs player, camera, stones each frame.
- Per-frame state (player, stones) is a mutated singleton in `systems/` (e.g. `playerState.js`, `stoneActions.js`), not zustand. Only infrequent HUD state goes in the store.
- All Bloxity SDK calls go through `systems/bloxity.js`; it must never throw if the SDK is blocked.
- World units are metres. +X east, +Z south, Y up; default camera faces north.

## Working on landmarks / world placement
Read `LANDMARKS.md` (names, coordinates, owning constant and component for each lobby feature). Don't read it for other tasks.

## Working on character animation / pool throwing pads
Read `ANIMATIONS.md` (rig axes, throw-loop keyframes, pad lock flow). Don't read it for other tasks.

## Working on "Press E" / hold-to-confirm interactions
Read `INTERACTION.md` (`registerInteractZone` API, hold flow, files). Don't read it for other tasks.

## Token hygiene
- Read only the files named in the task; grep before opening big ones (`Leaderboards.jsx`, `bloxity.js`, `Hud.jsx`, `index.css`).
- Skip `dist/` and `node_modules/`.
