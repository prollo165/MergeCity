/**
 * Prüft Physik und Zeitdehnung der Engine – ohne Browser, über `harness.mjs`.
 *
 *   node --test tools/bounce-studio/physics-test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { laden, laufen, abstaende, median, clock } from './harness.mjs';

const engine = await laden();
const { world, P, mel } = engine;

/** Setzt alle Regler auf einen bekannten Stand. Jeder Test startet gleich –
 *  sonst hängt sein Ergebnis am Test davor. */
function stelle(werte = {}) {
  Object.assign(P, {
    shape: 'circle', size: 0.86, spin: 0, wall: 14, wallShow: true,
    barrier: 'rings', bCount: 3, bSpeed: 55,
    gravity: 2400, bounce: 1, startSpeed: 850, ballSize: 26, tempo: 1,
    slide: 1, ballHit: false, startBalls: 1,
    split: 'chance', splitChance: 18, maxBalls: 180, spread: 30, shrink: true,
    colorMode: 'hit', palette: 'neon',
    melSrc: 'builtin', melPick: 'korobeiniki', warp: false, noteLen: 0.5, bpm: 120,
    melTrigger: 'all', melRate: 7, rhythm: 'off',
    songMode: 'unlock', unlockAt: 60, songTrigger: 'all', songStart: 0, burstLen: 0.28,
    snap: false, editSize: 70,
  }, werte);
  world.custom.length = 0;
  world.spawn = null;
  engine.song.buffer = null;
  engine.setSeed(4711);          // fester Seed: sonst wäre kein Lauf wiederholbar
  engine.refreshMelody();
  engine.reset();
}

test('Bälle prallen ab und vermehren sich', () => {
  stelle();
  laufen(engine, 240);                       // vier Sekunden
  assert.ok(world.hits > 20, 'zu wenige Treffer: ' + world.hits);
  assert.ok(world.balls.length > 1, 'kein Ball hat sich geteilt');
  assert.ok(world.balls.length <= P.maxBalls, 'Obergrenze überschritten');
});

test('kein Ball verlässt die Form', () => {
  stelle({ shape: 'star5', size: 0.95, splitChance: 40, maxBalls: 60 });
  laufen(engine, 600);
  const grenze = world.Rbase + 40;
  for (const b of world.balls) {
    const d = Math.hypot(b.x - 540, b.y - 1000);
    assert.ok(d <= grenze, 'Ball außerhalb der Form: ' + d.toFixed(0));
  }
});

test('die Vorhersage stellt die Welt vollständig zurück', () => {
  stelle({ barrier: 'orbit', bCount: 4, spin: 30, maxBalls: 1 });
  laufen(engine, 60);
  const b = world.balls[0];
  const vorher = {
    ball: [b.x, b.y, b.vx, b.vy, b.r],
    welt: [world.angle, world.R, world.pulse],
    barrieren: world.barriers.map((o) => [o.a, o.phase, o.x, o.y]),
    ecken: world.verts.map((v) => [v.x, v.y]),
  };
  engine.predictImpacts(b, 2, 12);
  assert.deepEqual([b.x, b.y, b.vx, b.vy, b.r], vorher.ball, 'Ball verändert');
  assert.deepEqual([world.angle, world.R, world.pulse], vorher.welt, 'Weltzustand verändert');
  assert.deepEqual(world.barriers.map((o) => [o.a, o.phase, o.x, o.y]), vorher.barrieren, 'Barrieren verändert');
  assert.deepEqual(world.verts.map((v) => [v.x, v.y]), vorher.ecken, 'Form verändert');
});

test('Zeitdehnung setzt die Noten aufs Raster', () => {
  for (const [wert, soll] of [[0.5, 250], [1, 500], [2, 1000]]) {
    stelle({ warp: true, noteLen: wert, maxBalls: 1 });
    const zeiten = laufen(engine, 1200);
    const g = abstaende(zeiten);
    assert.ok(g.length > 8, 'zu wenige Noten bei Notenwert ' + wert);
    assert.ok(Math.abs(median(g) - soll) <= 25,
      'Median ' + median(g).toFixed(0) + 'ms statt ' + soll + 'ms');
    const schlimm = g.filter((x) => Math.abs(x - soll) > 34).length;   // > zwei Bilder
    assert.ok(schlimm / g.length < 0.15,
      (100 * schlimm / g.length).toFixed(0) + '% der Noten liegen daneben');
  }
});

test('Zeitdehnung übernimmt den Rhythmus aus der Notenliste', () => {
  stelle({ warp: true, maxBalls: 1 });
  // Viertel, Achtel, Viertel, Achtel … wie es aus einer MIDI-Datei käme
  mel.notes = [60, 62, 64, 65, 67, 65, 64, 62, 60, 62, 64, 65, 67, 65, 64, 62];
  const times = [0];
  for (let i = 1; i < mel.notes.length; i++) times.push(times[i - 1] + (i % 2 ? 0.5 : 0.25));
  mel.times = times;
  mel.pos = -1;

  const g = abstaende(laufen(engine, 1500));
  const lang = g.filter((x) => x > 375), kurz = g.filter((x) => x < 375);
  assert.ok(lang.length > 3 && kurz.length > 3, 'kein Wechsel zwischen langen und kurzen Noten');
  assert.ok(Math.abs(median(lang) - 500) <= 40, 'Viertel bei ' + median(lang).toFixed(0) + 'ms');
  assert.ok(Math.abs(median(kurz) - 250) <= 40, 'Achtel bei ' + median(kurz).toFixed(0) + 'ms');
});

test('die Bewegung bleibt dabei nah am Original', () => {
  stelle({ warp: true, maxBalls: 1 });
  laufen(engine, 900);
  assert.ok(engine.warp >= 0.4 && engine.warp <= 2.5, 'Dehnung außerhalb der Grenzen: ' + engine.warp);
});

test('ohne Dehnung folgt die Melodie einfach den Aufschlägen', () => {
  stelle({ warp: false, maxBalls: 1, melRate: 20 });
  const g = abstaende(laufen(engine, 1200));
  assert.ok(g.length > 8, 'keine Noten');
  const aufRaster = g.filter((x) => Math.abs(x - 250) <= 34).length / g.length;
  assert.ok(aufRaster < 0.6, 'ohne Dehnung sollte nichts aufs Raster fallen (' + (aufRaster * 100).toFixed(0) + '%)');
});

test('der Song rückt nur bei Treffern schnipselweise vor', () => {
  stelle({ maxBalls: 1 });
  Object.assign(P, {
    rhythm: 'song', songMode: 'burst', burstLen: 0.25,
    songTrigger: 'all', songStart: 0, songVol: 80,
  });
  engine.song.buffer = { duration: 60 };          // Attrappe statt echter Datei
  engine.reset();

  const start = engine.songPos;
  laufen(engine, 300);                            // fünf Sekunden
  const gerueckt = engine.songPos - start;
  assert.ok(gerueckt > 0.5, 'der Song bewegt sich gar nicht: ' + gerueckt.toFixed(2));
  assert.ok(gerueckt <= 5.3, 'Schnipsel überlappen sich: ' + gerueckt.toFixed(2) + 's in 5s');

  // Steht das Spiel, gibt es keine Treffer – und der Song bleibt stehen.
  const stand = engine.songPos;
  world.running = false;
  laufen(engine, 120);
  assert.equal(engine.songPos, stand, 'der Song läuft ohne Treffer weiter');
  world.running = true;

  // Auch reine Wandtreffer lösen aus (ohne Barrieren trifft er nur die Wand).
  Object.assign(P, { songTrigger: 'wall', barrier: 'none' });
  engine.reset();
  const nurWand = engine.songPos;
  laufen(engine, 300);
  assert.ok(engine.songPos - nurWand > 0.5, 'Wandtreffer lösen keinen Schnipsel aus');

  // Barrierentreffer allein dürfen dann nichts auslösen.
  Object.assign(P, { songTrigger: 'wall', barrier: 'pegs', bCount: 5 });
  engine.reset();
  const vorher = { pos: engine.songPos, treffer: world.hits };
  laufen(engine, 300);
  const schnipsel = (engine.songPos - vorher.pos) / P.burstLen;
  assert.ok(schnipsel <= world.hits - vorher.treffer, 'mehr Schnipsel als Treffer');
});

/** Ball von Hand setzen – so wie spawn() ihn baut. */
const ball = (x, y, vx, vy, r = 26) => ({ x, y, vx, vy, r, ci: 0, hue: 0, hits: 0, cool: 0 });

test('Bälle prallen voneinander ab', () => {
  stelle({ barrier: 'none', gravity: 0, split: 'off', ballHit: true, bounce: 1 });
  world.balls.length = 0;
  world.balls.push(ball(400, 1000, 300, 0), ball(700, 1000, -300, 0));
  laufen(engine, 40);

  const [a, b] = world.balls;
  assert.equal(world.balls.length, 2, 'Teilung war aus');
  assert.ok(a.vx < 0, 'linker Ball fliegt nicht zurück: ' + a.vx.toFixed(0));
  assert.ok(b.vx > 0, 'rechter Ball fliegt nicht zurück: ' + b.vx.toFixed(0));
  assert.ok(Math.hypot(b.x - a.x, b.y - a.y) > a.r + b.r - 1, 'Bälle stecken ineinander');
  assert.ok(world.hits > 0, 'der Stoß zählte nicht als Treffer');
});

test('ohne die Option gehen Bälle weiter durcheinander hindurch', () => {
  stelle({ barrier: 'none', gravity: 0, split: 'off', ballHit: false });
  world.balls.length = 0;
  world.balls.push(ball(400, 1000, 300, 0), ball(700, 1000, -300, 0));
  laufen(engine, 40);
  assert.ok(world.balls[0].vx > 0, 'der Ball wurde abgelenkt, obwohl die Option aus ist');
});

test('auch im Gedränge steckt kein Ball tief im anderen', () => {
  stelle({ ballHit: true, split: 'chance', splitChance: 30, maxBalls: 120, ballSize: 24 });
  laufen(engine, 700);
  const bs = world.balls;
  assert.ok(bs.length > 20, 'zu wenige Bälle für die Probe: ' + bs.length);
  let schlimmste = 0;
  for (let i = 0; i < bs.length; i++) {
    for (let j = i + 1; j < bs.length; j++) {
      const d = Math.hypot(bs[j].x - bs[i].x, bs[j].y - bs[i].y);
      const u = bs[i].r + bs[j].r - d;
      if (u > schlimmste) schlimmste = u;
    }
  }
  const kleinster = Math.min(...bs.map((b) => b.r));
  assert.ok(schlimmste < kleinster, 'Überlappung von ' + schlimmste.toFixed(1) + 'px bei Radius ' + kleinster.toFixed(1));
});

test('Teilung bei Ballkontakt', () => {
  stelle({ barrier: 'none', gravity: 0, split: 'ball', splitChance: 100, ballHit: true, maxBalls: 40 });
  world.balls.length = 0;
  world.balls.push(ball(400, 1000, 300, 0), ball(700, 1000, -300, 0));
  laufen(engine, 200);
  assert.ok(world.balls.length > 2, 'Ballkontakt hat nichts geteilt');

  // Ohne Ball-Ball-Stöße gibt es diesen Auslöser nicht – dann teilt sich nichts.
  stelle({ barrier: 'none', split: 'ball', splitChance: 100, ballHit: false, maxBalls: 40 });
  laufen(engine, 300);
  assert.equal(world.balls.length, 1, 'ohne Ballkontakt wurde trotzdem geteilt');
});

/** Alphakanal einer gefüllten Kreisscheibe – Vorlage für die Bildkollision. */
function kreisAlpha(gw, gh, r) {
  const a = new Uint8Array(gw * gh);
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      a[y * gw + x] = Math.hypot(x - (gw - 1) / 2, y - (gh - 1) / 2) <= r ? 255 : 0;
    }
  }
  return a;
}

test('das Abstandsfeld eines Bildes stimmt mit der Geometrie überein', () => {
  const gw = 64, gh = 64, r = 20;
  const mask = engine.maskFromAlpha(kreisAlpha(gw, gh, r), gw, gh);
  const o = { t: 'img', x: 500, y: 500, w: gw, h: gh, a: 0, om: 0, mask };
  for (const weg of [0, 6, 12, 20, 26, 31]) {
    const soll = weg - r;                       // innen negativ, außen positiv
    for (const winkel of [0, 0.7, 1.9, 3.4, 5.1]) {
      const ist = engine.sampleSdf(o, 500 + Math.cos(winkel) * weg, 500 + Math.sin(winkel) * weg);
      assert.ok(Math.abs(ist - soll) < 2.5,
        'Abstand ' + ist.toFixed(2) + ' statt ' + soll + ' bei Weg ' + weg);
    }
  }
});

test('Bälle prallen an einem Bildhindernis ab', () => {
  stelle({ barrier: 'none', gravity: 0, split: 'off', ballHit: false, bounce: 1 });
  const gw = 64, gh = 64, r = 20;
  const mask = engine.maskFromAlpha(kreisAlpha(gw, gh, r), gw, gh);
  world.custom.length = 0;
  world.custom.push({ t: 'img', x: 540, y: 1000, w: 200, h: 200, a: 0, om: 0, mask, img: null });
  world.balls.length = 0;
  world.balls.push(ball(350, 1000, 900, 0, 20));

  laufen(engine, 30);
  const b = world.balls[0];
  assert.ok(b.vx < 0, 'der Ball ist durch das Bild geflogen: vx=' + b.vx.toFixed(0));
  const weltR = r * (200 / gw);                 // Bildradius in Weltpixeln
  assert.ok(Math.hypot(b.x - 540, b.y - 1000) > weltR + b.r - 3, 'der Ball steckt im Bild');
  world.custom.length = 0;
});

test('eigene Hindernisse überstehen den Neustart und lenken Bälle ab', () => {
  stelle({ barrier: 'none', gravity: 2400, split: 'off', startBalls: 1 });
  world.custom.length = 0;
  world.custom.push({ t: 'bar', cx: 540, cy: 1250, len: 500, h: 12, a: 0, om: 0 });
  engine.reset();
  assert.equal(world.custom.length, 1, 'der Neustart hat das Level gelöscht');

  world.balls.length = 0;
  world.balls.push(ball(540, 1050, 0, 400, 20));
  laufen(engine, 25);        // kurz nach dem Aufschlag, noch im Steigen
  assert.ok(world.balls[0].vy < 0, 'der Balken hat den Ball nicht zurückgeworfen');
  assert.ok(world.hits > 0, 'der Balken zählte nicht als Treffer');
  world.custom.length = 0;
});

test('mehrere Startbälle stehen nebeneinander im Bild', () => {
  stelle({ startBalls: 8, split: 'off' });
  assert.equal(world.balls.length, 8);
  const xs = world.balls.map((b) => b.x);
  assert.ok(Math.max(...xs) - Math.min(...xs) > 60, 'alle Bälle liegen aufeinander');
  for (const b of world.balls) {
    assert.ok(Math.hypot(b.x - 540, b.y - 1000) < world.Rbase, 'Startball außerhalb der Form');
  }
});

test('GIF-Einzelbilder laufen nach ihren eigenen Zeiten weiter', () => {
  const o = { t: 'img', x: 0, y: 0, w: 10, h: 10, a: 0, om: 0 };
  engine.setFrames(o, [{ c: 'a', dt: 0.1 }, { c: 'b', dt: 0.2 }, { c: 'c', dt: 0.1 }]);
  assert.ok(Math.abs(o.gifLen - 0.4) < 1e-9, 'Gesamtdauer ' + o.gifLen);

  const merker = clock.t;
  for (const [t, soll] of [[0, 'a'], [0.05, 'a'], [0.12, 'b'], [0.29, 'b'],
                           [0.35, 'c'], [0.45, 'a'], [0.75, 'c'], [0.8, 'a']]) {
    clock.t = t;
    assert.equal(engine.gifBild(o), soll, 'bei ' + t + 's');
  }
  clock.t = merker;

  // Ein einzelnes Bild bleibt ein einzelnes Bild.
  const still = { t: 'img', img: 'nur eins' };
  engine.setFrames(still, null);
  assert.equal(engine.gifBild(still), 'nur eins');
});

test('der Song wird erst ab der Zielzahl freigegeben', () => {
  stelle({ split: 'always', splitChance: 100, maxBalls: 40, barrier: 'rings' });
  Object.assign(P, {
    rhythm: 'song', songMode: 'unlock', unlockAt: 8,
    songTrigger: 'all', songStart: 0, songVol: 80,
  });
  engine.song.buffer = { duration: 90 };
  engine.reset();
  assert.equal(engine.unlocked, false, 'schon zu Beginn frei');

  // Solange zu wenige Bälle da sind, springt der Song immer wieder auf Anfang.
  laufen(engine, 12);
  if (world.balls.length < 8) {
    assert.equal(engine.unlocked, false, 'zu früh freigegeben bei ' + world.balls.length + ' Bällen');
    assert.equal(engine.songPos, P.songStart, 'der Song ist weitergelaufen statt neu zu starten');
  }

  laufen(engine, 400);
  assert.ok(world.balls.length >= 8, 'nicht genug Bälle: ' + world.balls.length);
  assert.equal(engine.unlocked, true, 'der Song wurde nie freigegeben');

  // Mit unerreichbarer Zielzahl bleibt er gesperrt.
  stelle({ split: 'off', maxBalls: 1 });
  Object.assign(P, { rhythm: 'song', songMode: 'unlock', unlockAt: 500, songTrigger: 'all' });
  engine.song.buffer = { duration: 90 };
  engine.reset();
  laufen(engine, 300);
  assert.equal(engine.unlocked, false, 'ohne genug Bälle trotzdem freigegeben');
  engine.song.buffer = null;
  P.rhythm = 'off';
});

test('der Rahmen als Form hält die Bälle im ganzen Bild', () => {
  stelle({ shape: 'frame', size: 1, barrier: 'none', split: 'chance', splitChance: 30, maxBalls: 40 });
  assert.ok(world.inR > 500, 'der Rahmen ist zu klein geraten: ' + world.inR.toFixed(0));
  laufen(engine, 600);
  for (const b of world.balls) {
    assert.ok(b.x > -1 && b.x < 1081 && b.y > -1 && b.y < 1921,
      'Ball außerhalb des Bildes: ' + b.x.toFixed(0) + '/' + b.y.toFixed(0));
  }
  // Die Ecken müssen erreichbar sein – ein Kreis würde das nie zulassen.
  assert.ok(world.balls.some((b) => b.y > 1500 || b.y < 400), 'die Bälle bleiben in der Mitte');
});

test('ein selbst gesetzter Startpunkt gilt', () => {
  stelle({ shape: 'frame', size: 1, split: 'off', startBalls: 3, startSpeed: 100 });
  world.spawn = { x: 300, y: 500 };
  engine.reset();
  for (const b of world.balls) {
    assert.ok(Math.hypot(b.x - 300, b.y - 500) < 220, 'Ball startet woanders: ' + b.x.toFixed(0));
  }
  world.spawn = null;
});

test('Deko ohne Kollision lenkt nichts ab', () => {
  stelle({ shape: 'frame', size: 1, barrier: 'none', gravity: 2400, split: 'off' });
  world.custom.length = 0;
  world.custom.push({ t: 'bar', cx: 540, cy: 1250, len: 600, h: 14, a: 0, om: 0, solid: false });
  world.balls.length = 0;
  world.balls.push(ball(540, 1050, 0, 400, 20));
  laufen(engine, 25);
  assert.ok(world.balls[0].vy > 0, 'die Deko hat den Ball gestoppt');
  assert.ok(world.balls[0].y > 1250, 'der Ball ist nicht hindurchgefallen');

  // Dasselbe Hindernis mit Kollision hält ihn auf.
  world.custom[0].solid = true;
  engine.reset();
  world.balls.length = 0;
  world.balls.push(ball(540, 1050, 0, 400, 20));
  laufen(engine, 25);
  assert.ok(world.balls[0].vy < 0, 'mit Kollision hätte er zurückkommen müssen');
  world.custom.length = 0;
});
