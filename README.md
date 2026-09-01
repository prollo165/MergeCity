# MergeCity

Ein Puzzlespiel im Geist von *High Rise – A Puzzle Cityscape*: Du setzt Gebäude
auf ein isometrisches 6×6-Raster, zwei gleiche verschmelzen zum nächstgrößeren –
und mit jeder Verschmelzung rückt die Stadt eine Epoche weiter. Von der
Steinzeit-Rundhütte bis zur Arkologie der Zukunft liegen fünfzehn Stufen.

Die Oberfläche bleibt bewusst zurückhaltend: dünne Typografie, viel Weißraum,
keine Verzierungen. Die Farbigkeit steckt allein in der Stadt.

## Spielprinzip

- Tippe auf ein freies Grundstück, um das aktuelle Gebäude zu setzen.
- **Zwei** waagerecht/senkrecht zusammenhängende gleiche Gebäude verschmelzen zum
  Bau der nächsten Epoche – genau dort, wo du gebaut hast. Jedes weitere Haus in
  der Gruppe überspringt eine Epoche zusätzlich: aus drei Rundhütten wird
  unmittelbar eine Steinkate, aus vier ein Tempel.
- Weil der Neubau sofort weiterverschmilzt, ergibt auch ein Lehmhaus neben zwei
  Rundhütten eine Steinkate: Die Hütten werden erst zum Lehmhaus, die beiden
  Lehmhäuser dann zur Steinkate.
- Die **Abrissbirne** entfernt ein Gebäude. Sie füllt sich alle zehn
  Verschmelzungen wieder auf (maximal fünf Ladungen).
- Vorbei ist es, wenn kein Grundstück mehr frei ist *und* keine Abrissbirne mehr
  übrig ist.

## Blickwinkel

Die Stadt lässt sich von allen vier Seiten und aus drei Höhen betrachten:

- **Drehen:** quer über das Spielfeld ziehen oder die beiden runden Schaltflächen
  unter dem Bauplatz benutzen. Vier Vierteldrehungen, die Häuser wandern
  animiert an ihren neuen Platz und drehen ihre Dachfirste mit.
- **Kippen:** senkrecht über das Spielfeld ziehen. Drei Stufen zwischen flachem
  Seitenblick und steiler Draufsicht; je steiler, desto kürzer erscheinen die
  Türme – wie beim Kippen eines echten Modells.

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
  iso.ts, layout.ts          Projektion, Drehung, Kippwinkel, Feldmaße
  Building.tsx               Prozedurale Gebäude als SVG (keine Bilddateien)
  Plate.tsx, Board.tsx       Bauplatz, Kacheln, Kamera-Gesten, Trefferprüfung
  Hud.tsx, Dock.tsx          Punkte, Epoche, Vorschau, Schaltflächen
  Modals.tsx, theme.ts       Anleitung, Chronik, Spielende, Design-Tokens
scripts/generate-assets.js   Erzeugt Icon, Splash und Android-Icons
```

Alle Gebäude werden zur Laufzeit als isometrisches SVG gezeichnet. Eine neue
Epoche ist deshalb ein Eintrag in `src/game/tiers.ts` – kein neues Bildmaterial.

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
