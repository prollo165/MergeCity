/**
 * Prüft den MIDI-Leser aus `app.html` gegen eine im Test gebaute Datei.
 *
 * Der Parser sitzt bewusst in der HTML-Datei (das Studio soll ohne Build
 * laufen), darum schneidet dieses Skript die Funktion heraus und wertet sie
 * aus – so bleibt genau eine Fassung des Codes.
 *
 *   node tools/bounce-studio/midi-test.mjs
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const here = dirname(fileURLToPath(import.meta.url));
const src = await readFile(join(here, 'app.html'), 'utf8');
const from = src.indexOf('  function parseMidi(bytes) {');
const to = src.indexOf('  async function loadMidi(');
assert.ok(from > 0 && to > from, 'parseMidi in app.html nicht gefunden');
const parseMidi = new Function(src.slice(from, to) + '\nreturn parseMidi;')();

/** Variable-Length Quantity, wie MIDI Delta-Zeiten schreibt. */
function varlen(n) {
  const out = [n & 0x7f];
  n >>= 7;
  while (n) { out.unshift((n & 0x7f) | 0x80); n >>= 7; }
  return out;
}

function track(events) {
  const body = [];
  for (const e of events) body.push(...varlen(e.d), ...e.b);
  body.push(0x00, 0xff, 0x2f, 0x00);            // End of Track
  const len = body.length;
  return [0x4d, 0x54, 0x72, 0x6b, (len >>> 24) & 255, (len >>> 16) & 255, (len >>> 8) & 255, len & 255, ...body];
}

function file(tracks) {
  const head = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, 0, tracks.length, 0x01, 0xe0];
  return Uint8Array.from([...head, ...tracks.flat()]).buffer;
}

test('nimmt je Zeitpunkt die Oberstimme und überspringt das Schlagzeug', () => {
  const begleitung = track([
    { d: 0, b: [0x90, 48, 80] }, { d: 240, b: [0x80, 48, 0] },
    { d: 240, b: [0x90, 50, 80] }, { d: 240, b: [0x80, 50, 0] },
    { d: 240, b: [0x90, 52, 80] }, { d: 240, b: [0x80, 52, 0] },
  ]);
  const melodie = track([
    { d: 0, b: [0x91, 72, 90] },
    { d: 10, b: [0x99, 36, 100] },              // Kanal 10 = Schlagzeug, fliegt raus
    { d: 230, b: [0x81, 72, 0] },
    { d: 250, b: [0x91, 76, 90] }, { d: 240, b: [0x81, 76, 0] },
    { d: 240, b: [0x91, 79, 90] },
    { d: 240, b: [79, 0] },                     // Running Status, Anschlag 0 = Ende
  ]);
  assert.deepEqual(parseMidi(file([begleitung, melodie])), [72, 76, 79]);
});

test('meldet einen Fehler statt zu raten, wenn der Kopf fehlt', () => {
  assert.throws(() => parseMidi(Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]).buffer));
});

test('läuft nicht über das Dateiende hinaus', () => {
  const voll = new Uint8Array(file([track([{ d: 0, b: [0x90, 60, 90] }])]));
  for (let cut = 20; cut < voll.length; cut += 3) {
    const kurz = voll.slice(0, cut).buffer;      // abgeschnittene Datei
    try { parseMidi(kurz); } catch (e) {
      assert.ok(!(e instanceof RangeError), 'RangeError bei Länge ' + cut);
    }
  }
});
