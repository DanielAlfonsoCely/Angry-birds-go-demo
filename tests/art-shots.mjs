// Capturas de la galería de arte. Uso: node tests/art-shots.mjs [--only=chars-34,props-snow] [--wait=1500]
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const t = a.replace(/^--/, '');
  const i = t.indexOf('=');
  return i < 0 ? [t, 'true'] : [t.slice(0, i), t.slice(i + 1)];
}));
const SHOTS = {
  'chars-34': '?view=chars&angle=34',
  'chars-front': '?view=chars&angle=front',
  'chars-back': '?view=chars&angle=back',
  'char-tuko': '?view=char&id=tuko', 'char-mora': '?view=char&id=mora', 'char-chispa': '?view=char&id=chispa',
  'char-bruno': '?view=char&id=bruno', 'char-nilo': '?view=char&id=nilo', 'char-kiko': '?view=char&id=kiko',
  'states': '?view=states',
  'props-snow': '?view=props&theme=snow', 'props-jungle': '?view=props&theme=jungle', 'props-volcano': '?view=props&theme=volcano',
  'particles': '?view=particles&theme=jungle',
  'env-snow': '?view=env&theme=snow', 'env-jungle': '?view=env&theme=jungle', 'env-volcano': '?view=env&theme=volcano',
};
const only = args.only ? args.only.split(',') : Object.keys(SHOTS);
const wait = Number(args.wait ?? 1200);

mkdirSync('tests/screenshots', { recursive: true });
const server = await createServer({ server: { port: 5198, strictPort: false }, logLevel: 'error' });
await server.listen();
const port = server.config.server.port;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: Number(args.w ?? 1280), height: Number(args.h ?? 720) } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e.stack ?? e)));

for (const name of only) {
  const q = SHOTS[name] ?? name;
  await page.goto(`http://localhost:${port}/tests/art-gallery.html${q}&nonav`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 }).catch(() => errors.push(`timeout ${name}`));
  await page.waitForTimeout(wait);
  const info = await page.evaluate(() => window.__info);
  const file = name.replace(/[^a-z0-9-]+/gi, '_');
  await page.screenshot({ path: `tests/screenshots/art-${file}.png` });
  console.log(`art-${file}.png`, JSON.stringify(info));
}
await browser.close();
await server.close();
if (errors.length) {
  console.error(`ERRORES (${errors.length}):\n` + errors.slice(0, 15).join('\n'));
  process.exit(1);
}
console.log('OK');
