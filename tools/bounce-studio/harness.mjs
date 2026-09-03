/**
 * Lädt die Engine aus `app.html` in Node, mit einer knappen Attrappe für
 * DOM, Canvas und WebAudio. So lässt sich die Physik deterministisch und
 * ohne Browser prüfen – ein Bildtakt ist hier einfach eine Zahl.
 *
 * Die Engine selbst wird nicht verändert: Für den Test wird lediglich der
 * Startaufruf um einen Griff auf die inneren Funktionen ergänzt.
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

const noop = () => {};
const gradient = { addColorStop: noop };

/** Nimmt jeden Methodenaufruf und jede Zuweisung entgegen. */
function stub(extra = {}) {
  const t = { ...extra };
  return new Proxy(t, {
    get(o, k) {
      if (k in o) return o[k];
      return (...a) => {
        if (k === 'createRadialGradient' || k === 'createLinearGradient') return gradient;
        if (k === 'measureText') return { width: 10 };
        if (k === 'getContext') return ctx();
        return undefined;
      };
    },
    set(o, k, v) { o[k] = v; return true; },
    has() { return true; },
  });
}

const ctx = () => stub({ canvas: { width: 720, height: 1280 } });

function element(id = '') {
  const el = stub({
    id, textContent: '', value: '', checked: false, hidden: false, disabled: false,
    style: {}, dataset: {}, children: [], files: null,
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    appendChild: (c) => c,
    addEventListener: noop,
    removeEventListener: noop,
    setAttribute: noop,
    getContext: () => ctx(),
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 400, height: 700 }),
    querySelectorAll: () => [],
    querySelector: () => element(),
    closest: () => element(),
    remove: noop,
  });
  el.firstElementChild = el;
  return el;
}

const clock = { t: 0 };                       // Sekunden, vom Test gestellt
const param = () => ({
  value: 0, setValueAtTime: noop, exponentialRampToValueAtTime: noop,
  linearRampToValueAtTime: noop, cancelScheduledValues: noop,
});
const audioNode = (extra) => ({ connect: noop, disconnect: noop, start: noop, stop: noop, ...extra });

class FakeAudioContext {
  constructor() { this.state = 'running'; this.destination = {}; this.sampleRate = 44100; }
  get currentTime() { return clock.t; }
  createGain() { return audioNode({ gain: param() }); }
  createOscillator() { return audioNode({ frequency: param(), type: 'sine' }); }
  createBiquadFilter() { return audioNode({ frequency: param(), type: 'lowpass' }); }
  createBufferSource() { return audioNode({ buffer: null }); }
  createMediaStreamDestination() { return { stream: { getAudioTracks: () => [] } }; }
  decodeAudioData() { return Promise.reject(new Error('im Test nicht nötig')); }
  resume() { this.state = 'running'; }
}

/** Baut die Engine auf und gibt den Griff auf ihre Innereien zurück. */
export async function laden() {
  const html = await readFile(join(here, 'app.html'), 'utf8');
  const code = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
  // Anker mit Ende der Funktion, sonst trifft der Ersatz den Aufruf in frame().
  const anker = '\n  requestAnimationFrame(frame);\n})();';
  const griff = '\n  globalThis.__engine = { world, P, mel, frame, reset, refreshMelody, '
    + 'predictImpacts, audioResume, noteGap, parseMidi, song, maskFromAlpha, sampleSdf, setFrames, gifBild, ballLooks, fighters, '
    + 'get unlocked() { return unlocked; }, setSeed: (v) => { seed = v; }, '
    + 'get warp() { return warp; }, get songPos() { return songPos; } };\n})();';
  const patched = code.replace(anker, griff);
  if (patched === code) throw new Error('Startaufruf in app.html nicht gefunden');

  const ids = new Map();
  const doc = stub({
    getElementById: (id) => { if (!ids.has(id)) ids.set(id, element(id)); return ids.get(id); },
    createElement: () => element(),
    addEventListener: noop,
    body: element('body'),
  });

  globalThis.document = doc;
  globalThis.performance = { now: () => clock.t * 1000 };
  globalThis.requestAnimationFrame = () => 0;
  globalThis.AudioContext = FakeAudioContext;
  globalThis.window = globalThis;
  globalThis.innerWidth = 1300;
  globalThis.innerHeight = 940;
  globalThis.addEventListener = noop;
  globalThis.MediaRecorder = undefined;

  new Function(patched)();
  const e = globalThis.__engine;
  e.audioResume();
  return e;
}

/** Treibt die Bildschleife mit festem Takt und meldet, wann Noten wechseln. */
export function laufen(engine, bilder, msJeBild = 1000 / 60) {
  const notenZeiten = [];
  let letzte = engine.mel.pos;
  for (let i = 0; i < bilder; i++) {
    clock.t += msJeBild / 1000;
    engine.frame(clock.t * 1000);
    if (engine.mel.pos !== letzte) { letzte = engine.mel.pos; notenZeiten.push(clock.t * 1000); }
  }
  return notenZeiten;
}

export function abstaende(zeiten, ueberspringen = 2) {
  const out = [];
  for (let i = ueberspringen + 1; i < zeiten.length; i++) out.push(zeiten[i] - zeiten[i - 1]);
  return out;
}

export const median = (xs) => {
  if (!xs.length) return NaN;
  const s = xs.slice().sort((a, b) => a - b);
  return s[s.length >> 1];
};

export { clock };
