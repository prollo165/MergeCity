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
| **Melodie** | Jeder Aufschlag rückt eine Note weiter – die Bälle spielen das Lied. Quelle: eingebaute Melodie, MIDI-Datei oder Tonleiter. Startet nach dem ersten Klick (Browser-Regel). |
| **Rhythmus** | Taktquelle wählen (BPM-Taktgeber oder Audiodatei), dann pulsiert die Form, wechselt die Farbe, teilen sich Bälle oder springen im Takt. |
| **Export** | Auflösung, Bitrate, Länge. `Aufnahme` startet den Lauf neu und stoppt automatisch. |

Tasten: `Leertaste` Start/Pause, `R` Neustart, `N` neuer Seed.

## Die Bälle spielen das Lied

Das ist der Kern: Jeder Aufschlag rückt die Melodie **um eine Note weiter** und
spielt sie. Der Rhythmus kommt also aus der Physik, die Tonhöhen aus der Vorlage
– genau so entstehen die bekannten Clips.

Drei Notenquellen:

- **Eingebaute Melodie** – sechs gemeinfreie Stücke (Korobeiniki, Für Elise,
  Ode an die Freude, In der Halle des Bergkönigs, Carol of the Bells, Alle meine
  Entchen). Kein Download nötig.
- **MIDI-Datei** – lädt jedes `.mid`. Aus allen Spuren außer dem Schlagzeugkanal
  werden die Note-Ons gesammelt, nach Zeit sortiert und je Zeitpunkt der höchste
  Ton genommen: In fast jedem Satz liegt die Melodie in der Oberstimme. Ergebnis
  ist eine einstimmige Notenfolge. Der Parser sitzt in `app.html` (`parseMidi`)
  und kommt ohne Bibliothek aus.
- **Tonleiter** – die alte Variante: aufsteigende Pentatonik, Dur, Moll.

Dazu fünf synthetisierte Klänge (Marimba, Klavier, Glocke, Zupf, Blip), eine
Auslösewahl (jeder Treffer / nur Wandtreffer / nur der erste Ball) und eine
**Notenrate**: Bei zweihundert Bällen prasseln die Treffer schneller, als eine
Melodie verträgt – die Rate deckelt das, ohne die Physik anzufassen. Für einen
sauber erkennbaren Song sind wenige Bälle oder „nur der erste Ball" die richtige
Wahl; für Krawall dreht man die Rate hoch.

### Aus einer MP3 geht das nicht

Eine Melodie aus einer fertigen Aufnahme zurückzurechnen (Polyphonic Music
Transcription) ist ein offenes Forschungsproblem – im Browser erst recht. Eine
MIDI-Datei dagegen *ist* die Notenschrift, deshalb dieser Weg. MIDI-Dateien zu
bekannten Liedern findet man über „<Titel> midi".

## Rhythmus: Takt fürs Bild, warum kein Spotify-Link

Streaming-Dienste geben ihren Ton nicht heraus. Spotify, Apple Music und
YouTube liefern ihn DRM-geschützt über Encrypted Media Extensions aus – der
Seitencode bekommt nie Samples zu sehen, kann also weder den Takt messen noch
die Musik in die Aufnahme mischen. Spotifys frühere Analyse-Schnittstelle
(`audio-analysis` mit Tempo und Beat-Raster) ist für neue Anwendungen seit Ende
2024 dicht. Ein eingefügter Link könnte also bestenfalls einen Titel anzeigen,
nicht den Takt liefern.

Deshalb zwei Wege, die wirklich funktionieren:

1. **Audiodatei laden.** Die Datei wird im Browser decodiert und bleibt dort –
   nichts wird hochgeladen. Aus dem Bassband wird eine Energiekurve gebildet,
   deren Anstiege (Onsets) per Autokorrelation die Periode und per Phasensuche
   die Eins ergeben. Klare Bassdrum, sicheres Ergebnis; bei Rubato-Klavier
   nicht. Das erkannte Tempo steht im Statusfeld und lässt sich mit dem
   BPM-Regler nachziehen. Die Musik läuft über denselben Knoten wie die
   Trefferklänge und landet damit auch in der Aufnahme.
2. **Tempo antippen oder BPM eintragen.** Reicht völlig, wenn die Musik erst in
   CapCut oder InShot unter das fertige Video gelegt wird – dann muss nur das
   Tempo stimmen. BPM-Werte findest du z. B. bei songbpm.com.

`Bälle springen im Takt` regelt die Ballgeschwindigkeit nach jedem Wandtreffer
um höchstens ein Viertel nach, bis die Aufschläge aufs Taktraster wandern. Das
greift nur bei bis zu zwölf Bällen und nur an der Wand – an rotierenden
Barrieren ist die Flugzeit zu unberechenbar. Es ist eine Regelung, keine
Garantie: Aufschläge exakt auf ein Raster zu zwingen ginge nur, indem man die
Physik fälscht oder die Wände passend zur Musik konstruiert. Der musikalische
Eindruck entsteht darum über die Melodie, nicht über erzwungene Sprungzeiten.

## Aufbau

- `app.html` – die eigentliche Anwendung (Stil, Markup, Engine). Bewusst **ohne**
  `<!doctype>`/`<html>`/`<head>`/`<body>`, damit die Datei unverändert als
  Artifact veröffentlicht werden kann; dort liefert die Plattform den Rahmen.
- `build.mjs` – legt genau diesen Rahmen darum und schreibt `index.html`.
- `index.html` – erzeugt, eingecheckt, für den Doppelklick-Betrieb.

- `midi-test.mjs` – schneidet `parseMidi` aus `app.html` heraus und prüft es
  gegen selbst gebaute MIDI-Dateien (Oberstimme, Schlagzeugkanal, Running
  Status, abgeschnittene Dateien).

Nach jeder Änderung an `app.html`:

```bash
npm run bounce:build     # index.html neu schreiben
npm run bounce:test      # MIDI-Leser prüfen
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
