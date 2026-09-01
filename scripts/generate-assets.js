#!/usr/bin/env node
/**
 * Erzeugt App-Icon, Splash-Grafik und Android-Icons aus derselben
 * isometrischen Formensprache wie das Spiel – ohne externe Bildwerkzeuge.
 *
 *   node scripts/generate-assets.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '..', 'assets');
const SS = 3; // Supersampling für weiche Kanten

// --- Farben (identisch zu src/ui/theme.ts und src/game/tiers.ts) --------------
const MINT = [220, 233, 226];
const PALETTES = [
  { top: [217, 194, 149], left: [185, 143, 102], right: [156, 117, 80] }, // Hütte
  { top: [199, 100, 60], left: [237, 226, 206], right: [208, 195, 172] }, // Haus
  { top: [169, 207, 194], left: [110, 156, 136], right: [78, 122, 105] }, // Turm
];

// --- Mini-Rasterizer ---------------------------------------------------------
function createCanvas(width, height, fill) {
  const data = new Uint8Array(width * height * 4);
  if (fill) {
    for (let i = 0; i < width * height; i += 1) {
      data[i * 4] = fill[0];
      data[i * 4 + 1] = fill[1];
      data[i * 4 + 2] = fill[2];
      data[i * 4 + 3] = 255;
    }
  }
  return { width, height, data };
}

function blend(canvas, x, y, color, alpha) {
  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;
  const i = (y * canvas.width + x) * 4;
  const a = canvas.data[i + 3] / 255;
  const out = alpha + a * (1 - alpha);
  for (let c = 0; c < 3; c += 1) {
    canvas.data[i + c] = Math.round((color[c] * alpha + canvas.data[i + c] * a * (1 - alpha)) / (out || 1));
  }
  canvas.data[i + 3] = Math.round(out * 255);
}

function fillPolygon(canvas, points, color, alpha = 1) {
  const ys = points.map((p) => p[1]);
  const yMin = Math.max(0, Math.floor(Math.min(...ys)));
  const yMax = Math.min(canvas.height - 1, Math.ceil(Math.max(...ys)));

  for (let y = yMin; y <= yMax; y += 1) {
    const sample = y + 0.5;
    const crossings = [];
    for (let i = 0; i < points.length; i += 1) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      if (y1 === y2) continue;
      if (sample >= Math.min(y1, y2) && sample < Math.max(y1, y2)) {
        crossings.push(x1 + ((sample - y1) / (y2 - y1)) * (x2 - x1));
      }
    }
    crossings.sort((a, b) => a - b);
    for (let i = 0; i + 1 < crossings.length; i += 2) {
      const from = Math.max(0, Math.round(crossings[i]));
      const to = Math.min(canvas.width - 1, Math.round(crossings[i + 1]) - 1);
      for (let x = from; x <= to; x += 1) blend(canvas, x, y, color, alpha);
    }
  }
}

function fillEllipse(canvas, cx, cy, rx, ry, color, alpha = 1) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    const dy = (y + 0.5 - cy) / ry;
    if (Math.abs(dy) > 1) continue;
    const half = rx * Math.sqrt(1 - dy * dy);
    for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x += 1) {
      blend(canvas, x, y, color, alpha);
    }
  }
}

function downsample(canvas, factor) {
  const width = canvas.width / factor;
  const height = canvas.height / factor;
  const out = createCanvas(width, height);
  const area = factor * factor;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < factor; sy += 1) {
        for (let sx = 0; sx < factor; sx += 1) {
          const i = ((y * factor + sy) * canvas.width + (x * factor + sx)) * 4;
          const alpha = canvas.data[i + 3] / 255;
          r += canvas.data[i] * alpha;
          g += canvas.data[i + 1] * alpha;
          b += canvas.data[i + 2] * alpha;
          a += alpha;
        }
      }
      const i = (y * width + x) * 4;
      out.data[i] = a ? Math.round(r / a) : 0;
      out.data[i + 1] = a ? Math.round(g / a) : 0;
      out.data[i + 2] = a ? Math.round(b / a) : 0;
      out.data[i + 3] = Math.round((a / area) * 255);
    }
  }
  return out;
}

// --- PNG ---------------------------------------------------------------------
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function writePng(file, canvas, { alpha = true } = {}) {
  const channels = alpha ? 4 : 3;
  const raw = Buffer.alloc(canvas.height * (1 + canvas.width * channels));
  let offset = 0;
  for (let y = 0; y < canvas.height; y += 1) {
    raw[offset] = 0;
    offset += 1;
    for (let x = 0; x < canvas.width; x += 1) {
      const i = (y * canvas.width + x) * 4;
      const a = canvas.data[i + 3] / 255;
      for (let c = 0; c < 3; c += 1) {
        raw[offset + c] = alpha ? canvas.data[i + c] : Math.round(canvas.data[i + c] * a + 255 * (1 - a));
      }
      if (alpha) raw[offset + 3] = canvas.data[i + 3];
      offset += channels;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(canvas.width, 0);
  ihdr.writeUInt32BE(canvas.height, 4);
  ihdr[8] = 8;
  ihdr[9] = alpha ? 6 : 2;

  fs.writeFileSync(
    file,
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  );
  console.log('geschrieben:', path.relative(process.cwd(), file), `${canvas.width}×${canvas.height}`);
}

// --- Motiv: drei isometrische Bauten, von der Hütte zum Turm ------------------
const BUILDINGS = [
  { dx: -1.15, dy: 0.3, w: 0.54, h: 0.8 },
  { dx: 0, dy: 0, w: 0.64, h: 1.8 },
  { dx: 1.15, dy: -0.3, w: 0.58, h: 3.0 },
];

/** Alle Flächen des Motivs bei Einheitsgröße – Grundlage fürs Zentrieren. */
function motifFaces(unit, cx, cy) {
  const hw = unit;
  const hh = unit * 0.5;
  const p = (x, y, z) => [cx + (x - y) * hw, cy + (x + y) * hh - z * unit];

  return BUILDINGS.map((b) => {
    const x0 = b.dx - b.w / 2;
    const x1 = b.dx + b.w / 2;
    const y0 = b.dy - b.w / 2;
    const y1 = b.dy + b.w / 2;
    return {
      ground: p(b.dx, b.dy, 0),
      radius: [hw * b.w * 1.15, hh * b.w * 1.15],
      top: [p(x0, y0, b.h), p(x1, y0, b.h), p(x1, y1, b.h), p(x0, y1, b.h)],
      left: [p(x0, y1, b.h), p(x1, y1, b.h), p(x1, y1, 0), p(x0, y1, 0)],
      right: [p(x1, y0, b.h), p(x1, y1, b.h), p(x1, y1, 0), p(x1, y0, 0)],
    };
  });
}

function motifBounds() {
  const faces = motifFaces(1, 0, 0);
  const xs = [];
  const ys = [];
  for (const face of faces) {
    for (const key of ['top', 'left', 'right']) {
      for (const [x, y] of face[key]) {
        xs.push(x);
        ys.push(y);
      }
    }
  }
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}

/** Zeichnet das Motiv formatfüllend und mittig in eine Fläche. */
function render({ size, background, padding = 0.14, flat, alpha }) {
  const canvas = createCanvas(size * SS, size * SS, background);
  const bounds = motifBounds();
  const target = size * SS * (1 - 2 * padding);
  const unit = Math.min(target / bounds.width, target / bounds.height);
  const cx = (size * SS) / 2 - (bounds.minX + bounds.width / 2) * unit;
  const cy = (size * SS) / 2 - (bounds.minY + bounds.height / 2) * unit;

  motifFaces(unit, cx, cy).forEach((face, i) => {
    const palette = flat ? { top: flat, left: flat, right: flat } : PALETTES[i];
    if (!flat) {
      fillEllipse(canvas, face.ground[0], face.ground[1], face.radius[0], face.radius[1], [47, 64, 56], 0.1);
    }
    fillPolygon(canvas, face.top, palette.top);
    fillPolygon(canvas, face.left, palette.left);
    fillPolygon(canvas, face.right, palette.right);
  });

  return { canvas: downsample(canvas, SS), alpha };
}

fs.mkdirSync(OUT, { recursive: true });

const icon = render({ size: 1024, background: MINT, padding: 0.1 });
writePng(path.join(OUT, 'icon.png'), icon.canvas, { alpha: false });

const favicon = render({ size: 64, background: MINT, padding: 0.08 });
writePng(path.join(OUT, 'favicon.png'), favicon.canvas, { alpha: false });

const splash = render({ size: 1024, background: null, padding: 0.16 });
writePng(path.join(OUT, 'splash-icon.png'), splash.canvas, { alpha: true });

// Android schneidet adaptive Icons rund zu – daher mehr Rand.
const adaptiveForeground = render({ size: 1024, background: null, padding: 0.3 });
writePng(path.join(OUT, 'android-icon-foreground.png'), adaptiveForeground.canvas, { alpha: true });

const adaptiveBackground = createCanvas(1024, 1024, MINT);
writePng(path.join(OUT, 'android-icon-background.png'), adaptiveBackground, { alpha: false });

const monochrome = render({ size: 1024, background: null, padding: 0.3, flat: [255, 255, 255] });
writePng(path.join(OUT, 'android-icon-monochrome.png'), monochrome.canvas, { alpha: true });
