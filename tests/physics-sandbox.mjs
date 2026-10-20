// Abre el sandbox de físicas (tests/physics-sandbox.html?auto=1) en Chromium headless, imprime telemetría
// y toma capturas en momentos clave (aire/truco, aterrizaje, estrecho, cueva, derrape).
// Uso: node tests/physics-sandbox.mjs [--seconds=45] [--start=6]
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? 'true']; }));
const seconds = Number(args.seconds ?? 45);
mkdirSync('tests/screenshots', { recursive: true });
const server = await createServer({ server: { port: 5198, strictPort: false }, logLevel: 'error' });
await server.listen();
const port = server.config.server.port;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 600 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e.stack ?? e)));
await page.goto(`http://localhost:${port}/tests/physics-sandbox.html?auto=1&start=${args.start ?? 6}`);
await page.waitForFunction(() => window.__sb);

const shots = new Set();
const start = Date.now();
let lastPrint = 0;
while ((Date.now() - start) / 1000 < seconds) {
  const st = await page.evaluate(() => {
    const { kart: k, track, log, camera } = window.__sb;
    const s = track.sample(k.t);
    return { m: +(k.t * track.length).toFixed(1), v: +k.speed.toFixed(1), g: k.grounded, air: +k.airTime.toFixed(2), y: +k.position.y.toFixed(1),
      trick: k.doingTrick, drift: k.driftLevel, seg: s.segmentType, fov: +camera.fov.toFixed(1), camY: +(camera.position.y - k.position.y).toFixed(2), events: log.length };
  });
  const el = (Date.now() - start) / 1000;
  if (el - lastPrint > 1) { lastPrint = el; console.log(JSON.stringify(st)); }
  const want = (name, cond) => { if (cond && !shots.has(name)) { shots.add(name); return page.screenshot({ path: `tests/screenshots/physics-sb-${name}.png` }); } };
  await want('trick', st.trick);
  await want('air', !st.g && st.air > 0.7 && st.m < 400);
  await want('narrow', st.seg === 'narrow' && st.m > 420);
  await want('cave', st.seg === 'cave' && st.m > 560);
  await want('boost', st.seg === 'boost' && st.m > 700);
  await want('drift', st.drift >= 1 && st.m > 900);
  if (st.m > 1140) break; // fin de la pista de pruebas
  await page.waitForTimeout(40);
}
const events = await page.evaluate(() => window.__sb.log);
console.log('Eventos:', JSON.stringify(events.filter((e) => e.type !== 'boost')));
console.log('Capturas:', [...shots].map((s) => `tests/screenshots/physics-sb-${s}.png`).join(' '));
await browser.close();
await server.close();
if (errors.length) { console.error('ERRORES:\n' + errors.join('\n')); process.exit(1); }
