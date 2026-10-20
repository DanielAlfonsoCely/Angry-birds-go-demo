// Test de humo: levanta Vite, abre el juego en Chromium headless, deja correr la carrera,
// toma capturas y falla si hay errores de consola.
// Uso: npm run smoke -- [--track=pico] [--char=tuko] [--seconds=8] [--keys=ArrowLeft:1-2,Space:3-4] [--out=nombre] [--url=/?...]
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? 'true'];
}));
const track = args.track ?? 'pico';
const char = args.char ?? 'tuko';
const seconds = Number(args.seconds ?? 8);
const out = args.out ?? `${track}-${char}`;
// keys: "Tecla:inicio-fin" en segundos desde que carga, separados por coma
const keyPlan = (args.keys ?? '').split(',').filter(Boolean).map((s) => {
  const [key, range] = s.split(':');
  const [a, b] = range.split('-').map(Number);
  return { key, a, b };
});

mkdirSync('tests/screenshots', { recursive: true });
const server = await createServer({ server: { port: 5199, strictPort: false, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const port = server.config.server.port;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e.stack ?? e)));

const url = args.url ?? `/?track=${track}&char=${char}`;
await page.goto(`http://localhost:${port}${url}`);
await page.waitForTimeout(500);

const start = Date.now();
const held = new Set();
const shots = Math.max(1, Math.floor(seconds / 2));
let nextShot = 1;
while ((Date.now() - start) / 1000 < seconds) {
  const el = (Date.now() - start) / 1000;
  for (const k of keyPlan) {
    const want = el >= k.a && el < k.b;
    if (want && !held.has(k.key)) { await page.keyboard.down(k.key); held.add(k.key); }
    if (!want && held.has(k.key)) { await page.keyboard.up(k.key); held.delete(k.key); }
  }
  if (el >= (nextShot * seconds) / shots - 0.05 && nextShot <= shots) {
    await page.screenshot({ path: `tests/screenshots/${out}-${nextShot}.png` });
    nextShot++;
  }
  await page.waitForTimeout(50);
}

const state = await page.evaluate(() => {
  const m = window.__game?.mode;
  const race = m?.race ?? m;
  const p = race?.player;
  if (!p) return { note: 'sin jugador en el modo actual' };
  return {
    t: +p.t.toFixed(4), speedKmh: Math.round(p.speed * 3.6), grounded: p.grounded,
    pos: [p.position.x, p.position.y, p.position.z].map((v) => +v.toFixed(1)),
    fps: window.__fps ?? null, gameTime: +(window.__game?.time ?? 0).toFixed(1),
  };
});
console.log('Estado del jugador:', JSON.stringify(state));
console.log(`Capturas en tests/screenshots/${out}-*.png`);
await browser.close();
await server.close();
if (errors.length) {
  console.error(`ERRORES DE CONSOLA (${errors.length}):\n` + errors.slice(0, 15).join('\n'));
  process.exit(1);
}
console.log('OK: sin errores de consola');
