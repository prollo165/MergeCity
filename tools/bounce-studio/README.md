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
| **Rhythmus** | Taktquelle wählen (BPM-Taktgeber oder Audiodatei). Der geladene Song läuft entweder durchgehend im Hintergrund oder **schnipselweise bei jedem Treffer**. Auf der Zählzeit pulsiert die Form, wechselt die Farbe, teilen sich Bälle. |
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
- **MIDI-Datei** – lädt jedes `.mid`, per Dateiwahl oder durch Ablegen auf die
  Fläche. Aus allen Spuren außer dem Schlagzeugkanal werden die Note-Ons
  gesammelt, nach Zeit sortiert und je Zeitpunkt der höchste Ton genommen: In
  fast jedem Satz liegt die Melodie in der Oberstimme. Tempowechsel werden
  mitgelesen, die Noten behalten also ihre echten Zeiten. Der Parser sitzt in
  `app.html` (`parseMidi`) und kommt ohne Bibliothek aus; er verträgt
  RIFF-verpackte Dateien (`.rmi`), Müll vor dem Kopf, unbekannte Chunks,
  Running Status, Format 0/1/2 und abgeschnittene Dateien. Scheitert es doch,
  nennt die Statuszeile den Grund statt nur „ging nicht".
- **Tonleiter** – die alte Variante: aufsteigende Pentatonik, Dur, Moll.

Dazu fünf synthetisierte Klänge (Marimba, Klavier, Glocke, Zupf, Blip), eine
Auslösewahl (jeder Treffer / nur Wandtreffer / nur der erste Ball) und eine
**Notenrate**: Bei zweihundert Bällen prasseln die Treffer schneller, als eine
Melodie verträgt – die Rate deckelt das, ohne die Physik anzufassen. Für einen
sauber erkennbaren Song sind wenige Bälle oder „nur der erste Ball" die richtige
Wahl; für Krawall dreht man die Rate hoch.

### Physik der Melodie anpassen

Der Schalter **Physik der Melodie anpassen** macht aus dem Zufall ein Stück:
Die Noten fallen dann genau auf ihre Zeiten – bei einer MIDI-Datei auf deren
eigenen Rhythmus, sonst auf ein Raster aus BPM und Notenwert.

Gefälscht wird dabei nur die **Uhr**, nie die Bahn. Nach jeder Note rechnet die
Engine den Taktgeber-Ball voraus (`predictImpacts` simuliert eine Kopie der Welt
und stellt sie danach vollständig zurück) und sammelt die nächsten Aufschläge.
Aus denen wird der ausgewählt, der dem Sollabstand am nächsten kommt; die
Aufschläge davor bleiben stumm. Dann läuft die Simulationszeit so viel schneller
oder langsamer, dass dieser Aufschlag genau auf der Note liegt.

Weil die Zeit gleichmäßig gedehnt wird, bleibt die Flugbahn exakt dieselbe wie
ohne Anpassung – Physik im Sinne von *Bewegungsgesetze* stimmt weiter, nur die
Abspielgeschwindigkeit schwankt. Gemessen (siehe `physics-test.mjs`): Der
Median der Notenabstände trifft den Sollwert, über 85 % liegen innerhalb von
zwei Bildern, und die Dehnung bleibt zwischen 0,4× und 2,5× – meist um 0,9×,
also kaum sichtbar. Getaktet wird der erste Ball; alle anderen laufen mit und
bleiben stumm.

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
   Für die Wiedergabe gibt es zwei Weisen:

   - **Schnipsel bei Treffer** (Voreinstellung): Der Song läuft *nicht* im
     Hintergrund, sondern rückt bei jedem Aufschlag um einen Schnipsel vor –
     das Stück wird also erst durch die Bälle hörbar, Stück für Stück. Länge
     einstellbar (50 ms bis 1 s), auslösbar durch jeden Treffer, nur
     Wandtreffer oder nur den ersten Ball. Kurze Ein- und Ausblenden
     verhindern das Knacken an den Schnittkanten, und ein neuer Schnipsel
     beginnt erst, wenn der vorige zu Ende ist. Die Statuszeile zeigt mit,
     wo im Song man gerade steht.
   - **Durchgehend im Hintergrund**: der Song läuft normal mit, wie in einem
     Schnittprogramm.

   Beides landet über denselben Audioknoten in der Aufnahme.

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

- `harness.mjs` – lädt die Engine mit einer knappen Attrappe für DOM, Canvas
  und WebAudio in Node und treibt die Bildschleife mit festem Takt. Damit lässt
  sich die Physik ohne Browser messen.
- `physics-test.mjs` – Prallverhalten, Vermehrung, „kein Ball verlässt die
  Form", Rückstellung nach der Vorhersage, die Trefferzeiten der Zeitdehnung
  und dass der Song nur bei Treffern und nie schneller als in Echtzeit
  vorrückt.
- `midi-test.mjs` – schneidet `parseMidi` aus `app.html` heraus und prüft es
  gegen selbst gebaute MIDI-Dateien (Oberstimme, Schlagzeugkanal, Running
  Status, RIFF-Vorspann, unbekannte Chunks, Tempowechsel, Format 2,
  abgeschnittene Dateien).

Nach jeder Änderung an `app.html`:

```bash
npm run bounce:build     # index.html neu schreiben
npm run bounce:test      # Physik, Zeitdehnung und MIDI-Leser prüfen
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
