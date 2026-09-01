# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

# MergeCity

- Gespielt wird in 3D (`src/three/`, three.js über react-three-fiber/expo-gl).
  Die Gebäude sind Platzhalter aus `src/three/buildingModel.ts`; sie sollen
  später durch glTF-Modelle ersetzt werden. `src/ui/Board.tsx` (SVG) ist die
  Rückfallebene ohne GL und liefert die Vorschaubilder.
- Eine neue Epoche ist ein Eintrag in `src/game/tiers.ts` – daraus entstehen
  beide Darstellungen.
- `src/game/` ist frei von React-Native-Importen und wird von
  `npm test` (Node-Testrunner) geprüft. Regeländerungen gehören dorthin.
- Vor dem Commit: `npm run typecheck && npm test`.
