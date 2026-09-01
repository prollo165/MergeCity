# MergeCity

Ein Puzzlespiel im Geist von *High Rise – A Puzzle Cityscape*: Du setzt Gebäude
auf ein 5×5-Raster, zwei gleiche verschmelzen zum nächstgrößeren – und mit jeder
Verschmelzung rückt die Stadt eine Epoche weiter. Gebaut wird in einer echten
3D-Szene, die sich frei drehen und kippen lässt. Von der
Steinzeit-Rundhütte bis zur Arkologie der Zukunft liegen fünfzehn Stufen.

Die Oberfläche bleibt bewusst zurückhaltend: dünne Typografie, viel Weißraum,
keine Verzierungen. Die Farbigkeit steckt allein in der Stadt.

## Spielprinzip

- Tippe auf ein freies Grundstück, um das aktuelle Gebäude zu setzen.
- Ein **Viertel** ist alles, was über bebaute Nachbarfelder zusammenhängt.
  Kommen darin **zwei** gleiche Gebäude zusammen, verschmelzen sie zum Bau der
  nächsten Epoche. Jedes weitere Haus in der Gruppe überspringt eine Epoche
  zusätzlich: aus drei Rundhütten wird unmittelbar eine Steinkate, aus vier ein
  Tempel.
- Der Neubau entsteht **auf dem Grundstück, das am längsten bebaut ist** – nicht
  dort, wo du gerade gesetzt hast. Gewachsene Ecken bleiben so an ihrem Platz.
- Weil im ganzen Viertel gesucht wird, zählt auch, was sich nicht berührt: Zwei
  Rundhütten links und rechts eines Lehmhauses werden erst zum zweiten Lehmhaus
  und dann zur Steinkate.
- Da jeder Neubau sofort weitergeprüft wird, hat jedes Viertel am Ende von jeder
  Epoche höchstens ein Haus – eine Kette aus Hütte, Lehmhaus und Steinkate wird
  von einer einzigen weiteren Hütte bis zum Tempel durchgezündet.
- Die **Abrissbirne** entfernt ein Gebäude. Sie füllt sich alle zehn
  Verschmelzungen wieder auf (maximal fünf Ladungen).
- Vorbei ist es, wenn kein Grundstück mehr frei ist *und* keine Abrissbirne mehr
  übrig ist.

## Blickwinkel

Die Kamera umkreist die Stadt stufenlos:

- **Drehen:** quer über das Spielfeld ziehen – oder die beiden runden
  Schaltflächen für Vierteldrehungen.
- **Kippen:** senkrecht ziehen, zwischen flachem Seitenblick und Draufsicht.

Die Kamera zieht weich nach, statt zu springen. Getippt wird weiterhin direkt
auf den Bauplatz: Bleibt der Finger unter der Bewegungsschwelle, wird gebaut,
sonst bewegt sich die Kamera.

## Die 3D-Szene

Gerendert wird mit **three.js** über **react-three-fiber**; auf dem Gerät liefert
`expo-gl` den GL-Kontext, im Web die Canvas-API. Eine orthografische Kamera hält
den isometrischen Charakter, ohne perspektivische Verzerrung.

Die Gebäude sind bis auf Weiteres **Platzhalter**: `src/three/buildingModel.ts`
baut sie aus denselben Epochen-Daten (`src/game/tiers.ts`) wie die 2D-Ansicht –
gestapelte Quader plus Dachform, Geometrien und Materialien werden je Epoche
zwischengespeichert.

### Modelle aus Blender einsetzen

Der Austausch ist bewusst auf eine Funktion begrenzt:

1. Modelle als **glTF/GLB** exportieren (ein Blender-Objekt je Epoche, Ursprung
   auf der Grundfläche, Y nach oben, Kantenlänge einer Rasterzelle = 1).
2. Dateien unter `assets/models/` ablegen.
3. In `src/three/buildingModel.ts` `buildPlaceholder(tier)` durch das geladene
   Modell ersetzen (`GLTFLoader` aus three plus `expo-asset`); der Rest der
   Szene bleibt unverändert, weil `City` nur ein `Object3D` je Feld erwartet.

Kommt auf einem Gerät kein GL-Kontext zustande, fällt `src/ui/BoardView.tsx`
automatisch auf die gezeichnete SVG-Stadt zurück – das Spiel bleibt spielbar.
Die kleinen Vorschaubilder in Leiste und Chronik sind weiterhin SVG.

Der Spielstand (inklusive Rekord) wird lokal gesichert und beim Start wieder
geladen.

## Schnellstart mit Expo Go

```bash
npm install
npx expo start
```

Danach den QR-Code mit **Expo Go** (iOS/Android) scannen – Telefon und Rechner
müssen im selben WLAN sein. Alternativ `npx expo start --tunnel`, wenn das Netz
keine direkte Verbindung erlaubt.

Das Projekt liegt bewusst auf **Expo SDK 54** (React Native 0.81): Das ist die
SDK, die die Store-Fassung von Expo Go unterstützt. Neuere SDKs lassen sich mit
der Expo Go aus App Store und Play Store nicht öffnen – dafür bräuchte es einen
Development Build. Vor einem SDK-Wechsel also prüfen, was Expo Go aktuell
mitbringt:

```bash
curl https://api.expo.dev/v2/versions   # Feld "expoGoSdkVersion"
```

Weitere Ziele: `npm run android`, `npm run ios`, `npm run web`.

## Projektstruktur

```
App.tsx                      Bildschirmaufbau, Spielzustand, Modals
src/game/
  tiers.ts                   Die 15 Epochen: Geometrie, Farben, Dachformen
  logic.ts                   Raster, Verschmelzung, Nachschub, Spielende (rein)
  state.ts                   Reducer für Setzen, Abreißen, Neustart
  storage.ts                 Spielstand in AsyncStorage
  __tests__/logic.test.ts    Tests der Spielregeln
src/ui/
  iso.ts, layout.ts          Projektion, Drehung, Kippwinkel (2D-Rückfallebene)
  Building.tsx               Prozedurale Gebäude als SVG (Vorschau + Rückfall)
  Plate.tsx, Board.tsx       Gezeichneter Bauplatz als Rückfallebene
  Board3D.tsx, BoardView.tsx 3D-Spielfeld, Gesten, Trefferprüfung, Rückfall
  Hud.tsx, Dock.tsx          Punkte, Epoche, Vorschau, Schaltflächen
  Modals.tsx, theme.ts       Anleitung, Chronik, Spielende, Design-Tokens
src/three/
  world.ts                   Maße und Umrechnung Raster ↔ Welt
  buildingModel.ts           Platzhalter-Modelle (später: Blender-Import)
  Scene.tsx                  Kamera, Licht, Bauplatz, Stadt
  canvas.ts / canvas.native  Plattformweiche für react-three-fiber
scripts/generate-assets.js   Erzeugt Icon, Splash und Android-Icons
```

Eine neue Epoche ist ein Eintrag in `src/game/tiers.ts`; daraus entstehen sowohl
das 3D-Platzhaltermodell als auch die gezeichnete Vorschau.

## Prüfen

```bash
npm run typecheck   # TypeScript
npm test            # Spielregeln (Node-Testrunner, keine weiteren Abhängigkeiten)
```

## Grafiken neu erzeugen

```bash
node scripts/generate-assets.js
```

Schreibt `assets/icon.png`, `splash-icon.png`, `favicon.png` sowie die drei
Android-Icons aus derselben Formensprache wie das Spiel.

## Weg in den App Store

1. `npx eas login` und `npx eas init` (legt die Projekt-ID in `app.json` an).
2. In `app.json` `ios.bundleIdentifier` und `android.package` auf die eigene
   Domain umstellen – aktuell steht dort `com.prollo165.mergecity`.
3. `npx eas build --platform ios --profile production`
4. `npx eas submit --platform ios --latest`

Ein Store-Build ist nicht an Expo Go gebunden: Wer eine neuere SDK möchte,
hebt die Abhängigkeiten an und baut einen Development Build – Expo Go bleibt
dann nur noch für schnelle Tests auf SDK 54.

Für den Store-Eintrag fehlen noch Screenshots, Beschreibungstexte und die
Datenschutzangabe. Das Spiel sammelt keine Daten und benötigt keine
Berechtigungen; es speichert ausschließlich lokal.
