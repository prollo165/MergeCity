/**
 * Prüft Physik und Zeitdehnung der Engine – ohne Browser, über `harness.mjs`.
 *
 *   node --test tools/bounce-studio/physics-test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { laden, laufen, abstaende, median } from './harness.mjs';

const engine = await laden();
const { world, P, mel } = engine;

/** Setzt alle Regler auf einen bekannten Stand. */
function stelle(werte = {}) {
  Object.assign(P, {
    shape: 'circle', size: 0.86, spin: 0, barrier: 'rings', bCount: 3, bSpeed: 55,
    gravity: 2400, bounce: 1, startSpeed: 850, ballSize: 26, tempo: 1,
    split: 'chance', splitChance: 18, maxBalls: 180,
    melSrc: 'builtin', melPick: 'korobeiniki', warp: false, noteLen: 0.5, bpm: 120,
    melTrigger: 'all', melRate: 7, rhythm: 'off',
  }, werte);
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
