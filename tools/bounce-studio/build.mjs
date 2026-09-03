/**
 * Baut aus dem Artifact-Fragment `app.html` eine eigenständige HTML-Datei.
 *
 * `app.html` enthält absichtlich kein <!doctype>/<html>/<head>/<body>: In der
 * Artifact-Veröffentlichung liefert die Plattform diesen Rahmen selbst. Für
 * den Doppelklick-Betrieb (file://) legt dieses Skript den gleichen Rahmen
 * darum und schreibt `index.html`.
 *
 *   node tools/bounce-studio/build.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const fragment = await readFile(join(here, 'app.html'), 'utf8');

const page = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- Entspricht dem Rahmen, den die Artifact-Plattform beim Veröffentlichen ergänzt. -->
<style>
  :root { color-scheme: dark; }
  body { margin: 0; font: 14px system-ui, -apple-system, sans-serif; }
  img { max-width: 100%; }
  [hidden] { display: none !important; }
</style>
</head>
<body>
${fragment}</body>
</html>
`;

const target = join(here, 'index.html');
await writeFile(target, page, 'utf8');
console.log(`index.html geschrieben – ${(page.length / 1024).toFixed(1)} KB`);
