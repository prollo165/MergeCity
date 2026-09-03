# Prallwerk 9:16

Ein Physiktisch für die viralen „bouncing ball"-Kurzvideos: Ein Ball fällt in
eine Form, prallt an Wänden und Barrieren ab, **teilt sich** dabei und
**wechselt die Farbe** – bis das Bild voll ist. Das Ergebnis lässt sich direkt
als Video aufnehmen (9:16, mit Ton).

Das Studio ist bewusst vom Spiel getrennt: eigenständiges HTML mit Canvas 2D,
keine Abhängigkeiten, kein Build-Schritt, nichts aus `src/`.

## Benutzen

```bash
open tools/bounce-studio/index.html      # macOS
xdg-open tools/bounce-studio/index.html  # Linux
```

Die Datei läuft per Doppelklick offline im Browser. Nur die beiden
Schriftarten kommen aus dem Netz; ohne Verbindung greifen Systemschriften.

## Bedienung

| Bereich | Was passiert |
| --- | --- |
| **Form** | Kreis, Stern, Herz, Kapsel … samt Größe und Eigendrehung. Eine drehende Wand überträgt ihren Schwung auf den Ball. |
| **Barrieren** | Ringe mit Lücke, Plinko-Pins, rotierende Balken, Kreuz-Spinner, Zickzack, kreisende Kugeln. |
| **Physik** | Schwerkraft, Sprungkraft (über 1,00 gewinnt der Ball Energie), Anstoß, Ballgröße, Zeitlupe. |
| **Multiplikation** | Auslöser (jeder Treffer / Zufall / nur Barrieren), Wahrscheinlichkeit, Obergrenze, Streuwinkel. |
| **Optik** | Palette, Farbwechsel-Modus, Leuchtspur, Funken, Bildwackeln, Hintergrund. |
| **Einblendung** | Ballzähler, Titelzeile und Zielmarke – alles wird ins Video gerendert. |
| **Ton** | Jeder Treffer spielt die nächste Note einer Tonleiter. Startet nach dem ersten Klick (Browser-Regel). |
| **Export** | Auflösung, Bitrate, Länge. `Aufnahme` startet den Lauf neu und stoppt automatisch. |

Tasten: `Leertaste` Start/Pause, `R` Neustart, `N` neuer Seed.

## Aufbau

- `app.html` – die eigentliche Anwendung (Stil, Markup, Engine). Bewusst **ohne**
  `<!doctype>`/`<html>`/`<head>`/`<body>`, damit die Datei unverändert als
  Artifact veröffentlicht werden kann; dort liefert die Plattform den Rahmen.
- `build.mjs` – legt genau diesen Rahmen darum und schreibt `index.html`.
- `index.html` – erzeugt, eingecheckt, für den Doppelklick-Betrieb.

Nach jeder Änderung an `app.html`:

```bash
npm run bounce:build
```

## Technik in Kürze

- Weltkoordinaten sind fest 1080 × 1920; die Leinwand wird nur skaliert. Die
  Auflösung im Export ändert daher nichts an der Physik.
- Fester Zeitschritt (1/60 s in vier Substeps) mit Akkumulator, damit 120-Hz-
  Bildschirme nicht doppelt so schnell simulieren.
- Kollisionen laufen gegen drei Primitive: Polygonkante mit Außennormale (bzw.
  exakter Kreis für die Kreisform), Kapsel (Balken) und Bogen mit Endkappen.
  Rotierende Flächen geben ihre Oberflächengeschwindigkeit an den Ball weiter.
- Bälle werden als vorgerenderte Sprites additiv gezeichnet – bei 300 Bällen
  wäre `shadowBlur` pro Bild zu teuer.
- Bälle kollidieren **nicht** untereinander. Das ist Absicht: Im Original
  durchdringen sie sich, und alles andere kostet bei 300 Bällen zu viel.
- Aufgenommen wird mit `MediaRecorder` über `canvas.captureStream()`, der Ton
  über einen `MediaStreamDestination` – Bild und Klang landen in einer Datei.
