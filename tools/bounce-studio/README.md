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
| **Kampf** | Zwei bis sechs Bälle treten gegeneinander an: Lebensbalken, Fähigkeiten, Schaden, eigenes Bild je Kämpfer. |
| **Editor** | Eigene Balken, Kreise und **Bilder (PNG/GIF/JPG)** direkt ins Bild setzen, verschieben, drehen, drehen lassen, Startpunkt legen, am Raster fangen. Level als Datei sichern und laden. |
| **Physik** | Schwerkraft, Sprungkraft (über 1,00 gewinnt der Ball Energie), Anstoß, **Anzahl der Startbälle**, Ballgröße, Zeitlupe – und ob die Bälle **voneinander abprallen**. |
| **Multiplikation** | Auslöser (jeder Treffer / Zufall / nur Barrieren / **nur bei Ballkontakt**), Wahrscheinlichkeit, Obergrenze, Streuwinkel. |
| **Optik** | Palette, Farbwechsel-Modus, **eigene Ballbilder**, Leuchtspur, Funken, Bildwackeln, Hintergrund. |
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

   - **Anspielen bis Ziel, dann ganz** (Voreinstellung): Jeder Treffer wirft
     den Song zurück auf den Anfang – er kommt also nie über die ersten
     Sekunden hinaus. Erst wenn genug Bälle da sind (Regler *Song frei ab*),
     läuft er ein einziges Mal durch. Solange die Sperre gilt, zeigt der
     Fortschrittsbalken im Bild „SONG BEI n" statt der Zielmarke – das Video
     erklärt sich damit von selbst.
   - **Schnipsel bei Treffer**: Der Song läuft *nicht* im
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

## Kampfmodus

Zwei bis sechs Bälle treten gegeneinander an. Jeder Kämpfer hat Leben, eine
Farbe, ein eigenes Bild und **eine Fähigkeit** – und nur ein Treffer durch
diese Fähigkeit kostet Leben. Ein normaler Zusammenstoß schubst bloß.

| Fähigkeit | Wirkung |
| --- | --- |
| **Klinge** | Eine kreisende Klinge am Ball trifft, wen sie streift. |
| **Stachel** | Lädt sich im eingestellten Takt auf; die nächste Berührung verletzt und verbraucht die Ladung. |
| **Geschoss** | Feuert im Takt auf den nächsten Gegner; das Geschoss vergeht an der Wand. |
| **Aura** | Pulst im Takt Schaden im Umkreis. |
| **Schild** | Blockt eine Weile jeden Schaden und wirft die Hälfte an den Angreifer zurück. |

Je Kämpfer einstellbar: Name, Fähigkeit, Leben, Schaden je Treffer, Takt der
Fähigkeit, Farbe und ein eigenes Bild. Nach einem Treffer ist ein Ball kurz
unverwundbar (0,3 s), damit eine kreisende Klinge nicht in einem Bild alles
abräumt. Oben im Bild steht je Kämpfer ein Lebensbalken mit Name und
Fähigkeit, über jedem Ball ein kleiner. Wer keine Leben mehr hat, verschwindet;
bleibt einer übrig, steht sein Name im Bild und die Simulation hält nach zwei
Sekunden an – der Schluss bleibt also im Video stehen.

Im Kampf teilen sich Bälle nicht, und die Ball-Ball-Stöße werden mit
eingeschaltet: Ohne sie könnten sich die Kämpfer nicht berühren.

## Eigene Ballbilder

Im Modul *Optik* lassen sich beliebig viele Bilder als Ballaussehen laden.
Jedes wird einmal kreisrund vorgerendert (formatfüllend zugeschnitten). Ein
Ball bekommt sein Bild beim Start zugeteilt und **behält es** – auch wenn er
die Farbe wechselt; teilt er sich, erbt das Kind dasselbe Bild.
Animierte GIFs bekommen je Einzelbild eine eigene Scheibe. Mit *Ballbilder
rollen mit* dreht sich das Bild passend zur Bewegung; oberhalb von 220 Bällen
wird die Drehung ausgelassen. Der farbige Schein bleibt unter dem Bild
erhalten, solange *Leuchten* an ist.

## Editor

Der Knopf **Bearbeiten** unter der Bühne hält die Simulation an und legt das
Bild frei: Werkzeug wählen, ins Bild tippen. Es gibt Balken (Strich ziehen),
Kreise (tippen), Bilder und den **Startpunkt**, an dem die Bälle beginnen.
Ausgewählte Hindernisse lassen sich verschieben, in Größe und Drehung ändern,
mit einer Eigendrehung versehen, kopieren, nach hinten legen und auf reine
**Deko ohne Kollision** stellen. Alles bleibt beim Neustart erhalten – es ist
Level, keine Spielsituation – und wird von derselben Kollisionsroutine
behandelt wie die erzeugten Barrieren.

Für eine **von Grund auf eigene Szene**: Form auf *Rahmen (ganzes Bild)*
stellen, *Rahmen zeigen* ausschalten, Barrieren auf *Keine* – dann ist das
Bild leer und hält die Bälle trotzdem drin. *Am Raster fangen* setzt auf 20 px
genau.

**Bilder kollidieren entlang ihrer Alphakante.** Beim Laden entsteht aus dem
Alphakanal ein vorzeichenbehaftetes Abstandsfeld: 96 Rasterzellen in der
längeren Kante, zweimal Chamfer-Distanztransformation (einmal von den festen,
einmal von den leeren Pixeln aus), Ergebnis innen negativ, außen positiv. Die
Kollision liest daraus bilinear den Abstand und aus dem Gefälle die Normale.
Damit stimmt der Abprall auch an schrägen und ausgefransten Rändern, und ein
Ball kann in eine Aussparung hineinfallen. Ein randvolles Bild ohne
Alphakanal wirkt wie ein Rechteck.

**Animierte GIFs bleiben animiert.** Das ist weniger selbstverständlich, als
es klingt: Ein `<img>`, das nicht im Dokument hängt, animiert in den meisten
Browsern nicht – `drawImage` zeigt dann ewig das erste Bild. Wo es den
`ImageDecoder` gibt (Chrome, Edge, neuere Firefox), zerlegt das Studio das GIF
darum selbst in Einzelbilder und schaltet sie nach ihren eigenen Zeiten weiter;
sonst hängt es das Bild unsichtbar ins Dokument, damit der Browser es
weiterlaufen lässt. Beides landet unverändert in der Aufnahme.

Die Kollision benutzt **eine Maske über alle Einzelbilder**: Was in irgendeinem
Bild fest ist, ist fest. Damit fliegt kein Ball durch etwas hindurch, das gerade
zu sehen ist; dafür ist die Kante bei stark wandernden Motiven etwas großzügig.
Ein Abstandsfeld je Einzelbild wäre genauer, kostet aber Speicher ohne
sichtbaren Gewinn.

**Level sichern** schreibt eine JSON-Datei mit allen Hindernissen; Bilder
stecken als Data-URL darin, die Datei ist also für sich vollständig.
Aufnahmen verlassen den Bearbeiten-Modus automatisch, damit die Hilfsringe
nicht im Video landen.

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
  vorrückt. Für die Ball-Ball-Stöße: dass sie zurückprallen, dass ohne die
  Option nichts abgelenkt wird, dass auch im Gedränge kein Ball tief im
  anderen steckt und dass der Auslöser „Nur bei Ballkontakt" greift. Für den
  Editor: dass das Abstandsfeld eines Kreisbildes mit der Geometrie
  übereinstimmt, dass Bälle daran abprallen, dass eigene Hindernisse den
  Neustart überstehen, dass mehrere Startbälle nebeneinander liegen und dass
  GIF-Einzelbilder nach ihren eigenen Zeiten weiterlaufen. Dazu: dass der Song
  erst ab der Zielzahl freigegeben wird, dass der Rahmen die Bälle im ganzen
  Bild hält, dass ein selbst gesetzter Startpunkt gilt und dass Deko ohne
  Kollision nichts ablenkt. Für den Kampf: dass ein Ball sein Bild behält und
  vererbt, dass zwei Kämpfer ohne angreifende Fähigkeit kein Leben verlieren,
  dass Klinge, Geschoss und Aura treffen und dass der Sieger richtig bestimmt
  wird.

  Alle Tests laufen mit festem Seed (4711) und setzen jeden Regler zurück –
  sonst hinge ihr Ergebnis am Test davor.

Das GIF-Zerlegen selbst braucht einen echten Browser (`ImageDecoder`) und
steckt deshalb nicht im Node-Test; es wurde über das DevTools-Protokoll in
Chromium geprüft: drei Einzelbilder, 80 ms je Bild, alle drei werden gezeigt.
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
- Bälle durchdringen sich standardmäßig, wie im Original. Mit **Bälle prallen
  voneinander ab** stoßen sie sich stattdessen: Masse nach Fläche, Impuls nur
  bei Annäherung, Entwirren gedämpft und gedeckelt. Statt jeder gegen jeden
  läuft das über ein Raster – jeder Ball landet in einer Zelle, geprüft werden
  nur die eigene und die acht angrenzenden, die Listen liegen in
  wiederverwendeten `Int32Array`s. Gemessen ohne Zeichnen: 300 Bälle kosten
  1,33 ms je Bild ohne und 1,46 ms mit Stößen, 500 Bälle 2,43 ms – bei
  16,7 ms Budget.
- Zwischen Bällen bleibt die Sprungkraft bei höchstens 1,00, auch wenn der
  Regler höher steht: Über 1 schaukelt sich die Energie über hunderte Stöße
  auf. An Wänden und Barrieren gilt weiter der eingestellte Wert.
- Ein Ballkontakt ist ein vollwertiger Treffer: Beide Bälle wechseln die
  Farbe, es funkt, und der Auslöser **Nur bei Ballkontakt** teilt genau dann.
  Diesen Auslöser zu wählen schaltet die Stöße gleich mit an – ohne sie gäbe
  es ihn nie.
- Die Vorhersage für die Zeitdehnung rechnet nur den Taktgeber-Ball voraus,
  kennt also keine künftigen Ballkontakte. Mit eingeschalteten Stößen und
  vielen Bällen wird der Takt darum etwas ungenauer.
- Aufgenommen wird mit `MediaRecorder` über `canvas.captureStream()`, der Ton
  über einen `MediaStreamDestination` – Bild und Klang landen in einer Datei.
