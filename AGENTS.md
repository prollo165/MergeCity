# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

# MergeCity

- Die Gebäude sind prozedurales SVG (`src/ui/Building.tsx`), keine Bilddateien.
  Eine neue Epoche ist ein Eintrag in `src/game/tiers.ts`.
- `src/game/` ist frei von React-Native-Importen und wird von
  `npm test` (Node-Testrunner) geprüft. Regeländerungen gehören dorthin.
- Vor dem Commit: `npm run typecheck && npm test`.
