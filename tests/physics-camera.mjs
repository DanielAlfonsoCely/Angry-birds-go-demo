// Capturas de la cámara en situaciones clave (salto, aterrizaje, cueva, curva cerrada) con el autopiloto.
// Uso: node tests/physics-camera.mjs [--track=pico] [--char=tuko] [--scale=3]  → tests/screenshots/cam-<pista>-<situación>.png
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? 'true'];
}));
const track = args.track ?? 'pico';
mkdirSync('tests/screenshots', { recursive: true });
const server = await createServer({ server: { port: 5196, strictPort: false, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
const errors = [];
page.on('console', (m) => { if (m.text().startsWith('shot')) console.log(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
await page.addInitScript((s) => {
  window.__shots = {}; window.__end = false;
  const hook = () => {
    const g = window.__game;
    if (!g) return requestAnimationFrame(hook);
    g.timeScale = s;
    const emit = g.events.emit.bind(g.events);
    window.__pw = [];
    g.events.emit = (n, p) => { if (n === 'race:end') window.__end = true; if (n === 'race:powerUse') window.__pw.push(p.powerId + '@' + g.time.toFixed(1)); emit(n, p); };
    const real = g.renderer.render.bind(g.renderer);
    let lastLand = -1, prevHead = null, tTurn = 0;
    const cnt = {};
    g.renderer.render = (scene, cam) => {
      const race = g.mode?.race ?? g.mode;
      const k = race?.player;
      if (!k || k.finished || k.frozen) return;
      let name = null;
      const smp = race.track.sample(k.t);
      if (!k.grounded && k.airTime > 0.45) name = 'salto';
      else if (k.lastLanding?.n !== lastLand && k.lastLanding?.n > 0 && g.time - k.lastLanding.time < 0.2) { lastLand = k.lastLanding.n; name = 'aterrizaje'; }
      else if (smp.ceilingHeight != null && k.grounded) name = 'cueva';
      else if (k.drifting || (k.grounded && Math.abs(k.steerInput ?? 0) > 0.7)) name = 'curva';
      if (name) {
        cnt[name] = (cnt[name] ?? 0) + 1;
        const want = { salto: [1, 4], aterrizaje: [1], cueva: [20, 90], curva: [1, 25] }[name];
        if (want.includes(cnt[name])) {
          real(scene, cam);
          console.log('shot', name, cnt[name], 't=' + g.time.toFixed(1), 'pw=' + window.__pw.slice(-3));
          window.__shots[`${name}${cnt[name]}`] = g.renderer.domElement.toDataURL('image/png');
        }
      }
    };
  };
  hook();
}, Number(args.scale ?? 3));
await page.goto(`http://localhost:${server.config.server.port}/?track=${track}&char=${args.char ?? 'tuko'}&autopilot=1`);
const t0 = Date.now();
while (Date.now() - t0 < 200000 && !(await page.evaluate(() => window.__end))) await page.waitForTimeout(1000);
const shots = await page.evaluate(() => window.__shots);
for (const [n, d] of Object.entries(shots)) {
  writeFileSync(`tests/screenshots/cam-${track}-${n}.png`, Buffer.from(d.split(',')[1], 'base64'));
  console.log('guardada', `tests/screenshots/cam-${track}-${n}.png`);
}
if (errors.length) console.error(errors.slice(0, 3));
await browser.close();
await server.close();
