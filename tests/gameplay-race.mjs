// Carrera completa con autopiloto a timeScale alto; verifica RACE_END, uso de objetos/poderes y consola limpia.
// Uso: node tests/gameplay-race.mjs [--track=pico] [--char=tuko] [--scale=3] [--timeout=240] [--runs=N] [--verbose] [--shots]
// Con --runs=N repite la carrera N veces e imprime puesto medio del jugador, ventana de tiempos y adelantamientos.
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? 'true'];
}));
const track = args.track ?? 'pico';
const char = args.char ?? 'tuko';
const scale = Number(args.scale ?? 3);
const runs = Math.max(1, Number(args.runs ?? 1));
const timeout = Number(args.timeout ?? 240) * 1000;

mkdirSync('tests/screenshots', { recursive: true });
const server = await createServer({ server: { port: 5198, strictPort: false, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const port = server.config.server.port;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const allErrors = [];
const summaries = [];
let last = null;

async function runOnce(n) {
  const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e.stack ?? e)));

  // registrar eventos antes de que cargue el juego
  await page.addInitScript((s) => {
    window.__scale = s.scale;
    if (s.tune) window.__tune = JSON.parse(s.tune);
    window.__log = [];
    window.__overtakes = 0;
    const hook = () => {
      const g = window.__game;
      if (!g) return requestAnimationFrame(hook);
      const emit = g.events.emit.bind(g.events);
      g.events.emit = (name, p) => { window.__log.push({ name, p, gt: g.time }); emit(name, p); };
      g.timeScale = window.__scale ?? 3;
      // sin render durante la carrera (el GL por software es lento); se reactiva para las capturas
      window.__render = g.renderer.render.bind(g.renderer);
      g.renderer.render = () => {};
      // adelantamientos: cambios de orden entre pares de karts en carrera (muestreo periodico)
      let prev = null;
      setInterval(() => {
        const r = g.mode?.race;
        if (!r || r.phase === 'countdown') return;
        const ks = r.karts.filter((k) => !k.finished);
        const key = (a, b) => (a.t > b.t ? 1 : -1);
        const cur = new Map();
        for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) cur.set(ks[i].id + '|' + ks[j].id, key(ks[i], ks[j]));
        if (prev) for (const [k, v] of cur) if (prev.has(k) && prev.get(k) !== v) window.__overtakes++;
        prev = cur;
      }, 100);
    };
    hook();
  }, { scale, tune: args.tune });
  await page.goto(`http://localhost:${port}/?track=${track}&char=${char}&autopilot=1`);

  async function shot(name) {
    await page.evaluate(() => { window.__game.renderer.render = window.__render; });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `tests/screenshots/${name}.png` });
    await page.evaluate(() => { window.__game.renderer.render = () => {}; });
  }
  const start = Date.now();
  let shots = 0;
  let done = false;
  while (Date.now() - start < timeout) {
    await page.waitForTimeout(1000);
    done = await page.evaluate(() => window.__log.some((e) => e.name === 'race:end'));
    if (args.verbose) console.log(await page.evaluate(() => { const r = window.__game.mode?.race ?? window.__game.mode; return JSON.stringify({ gt: +window.__game.time.toFixed(1), fps: window.__fps, ev: window.__log.length, st: r?.karts?.map((k) => `${k.id}:${(k.t * 100).toFixed(0)}%/${Math.round(k.speed * 3.6)}${k.spinTimer > 0 ? 's' : ''}${k.slowTimer > 0 ? 'w' : ''}`).join(' ') }); }));
    const el = (Date.now() - start) / 1000;
    if (args.shots && el > 25 * (shots + 1) && shots < 3 && !done) {
      await shot(`race-${track}-${shots + 1}`);
      shots++;
    }
    if (done) break;
  }
  if (done && args.shots) await shot(`race-${track}-end`);

  const res = await page.evaluate(() => {
    const counts = {};
    for (const e of window.__log) counts[e.name] = (counts[e.name] ?? 0) + 1;
    const aiItem = window.__log.filter((e) => e.name === 'race:itemUse' && e.p.kartId !== 'player').length;
    const aiPower = window.__log.filter((e) => e.name === 'race:powerUse' && e.p.kartId !== 'player').length;
    const end = window.__log.find((e) => e.name === 'race:end');
    const launches = window.__log.filter((e) => e.name === 'race:launch').map((e) => `${e.p.kartId}:${e.p.rating}`);
    const items = {};
    for (const e of window.__log) if (e.name === 'race:itemUse') items[e.p.itemId] = (items[e.p.itemId] ?? 0) + 1;
    const powers = {};
    for (const e of window.__log) if (e.name === 'race:powerUse') powers[e.p.powerId] = (powers[e.p.powerId] ?? 0) + 1;
    const hits = {};
    for (const e of window.__log) if (e.name === 'race:hit') hits[e.p.kartId + '<' + e.p.by] = (hits[e.p.kartId + '<' + e.p.by] ?? 0) + 1;
    const st = window.__game.mode?.race?.getPlayerState?.();
    return { hits, counts, aiItem, aiPower, end: end?.p, launches, items, powers, gameTime: window.__game.time, fps: window.__fps, overtakes: window.__overtakes, st };
  });
  await page.close();
  allErrors.push(...errors);
  return { res, errors };
}

for (let n = 0; n < runs; n++) {
  const { res, errors } = await runOnce(n);
  last = { res, errors };
  const e = res.end;
  if (e) {
    const t = e.results.map((r) => r.time);
    const me = e.results.find((r) => r.isPlayer);
    summaries.push({
      place: me.position, window: t[t.length - 1] - t[0], overtakes: res.overtakes, coins: e.coinsCollected, reward: e.reward,
      winner: e.results[0].characterId, byChar: Object.fromEntries(e.results.map((r) => [r.characterId, +r.time.toFixed(1)])),
    });
    if (runs > 1) console.log(`run ${n + 1}: puesto ${me.position}, ganador ${e.results[0].characterId} ${t[0].toFixed(1)} s, ventana ${(t[t.length - 1] - t[0]).toFixed(1)} s, adelantamientos ${res.overtakes}, monedas ${e.coinsCollected}`);
  }
}
await browser.close();
await server.close();

const { res } = last;
console.log(`Pista ${track}: tiempo de juego ${res.gameTime?.toFixed(1)} s, fps ${res.fps}`);
if (runs === 1) {
  console.log('Eventos:', JSON.stringify(res.counts));
  console.log('Lanzamientos:', res.launches.join(' '));
  console.log('Objetos usados:', JSON.stringify(res.items), 'Poderes:', JSON.stringify(res.powers));
  console.log('Golpes:', JSON.stringify(res.hits));
  console.log('Resultados:', JSON.stringify(res.end));
}
console.log('Estado final del jugador:', JSON.stringify(res.st));
if (summaries.length) {
  const avg = (f) => summaries.reduce((a, s) => a + f(s), 0) / summaries.length;
  const wins = {};
  const sumT = {};
  for (const s of summaries) { wins[s.winner] = (wins[s.winner] ?? 0) + 1; for (const [c, t] of Object.entries(s.byChar)) sumT[c] = (sumT[c] ?? 0) + t / summaries.length; }
  console.log(`RESUMEN (${summaries.length} carreras, ${track}): puesto medio ${avg((s) => s.place).toFixed(2)}, ventana media ${avg((s) => s.window).toFixed(1)} s, adelantamientos medios ${avg((s) => s.overtakes).toFixed(1)}, monedas medias ${avg((s) => s.coins).toFixed(0)}`);
  console.log('Victorias:', JSON.stringify(wins), 'Tiempo medio por personaje:', JSON.stringify(Object.fromEntries(Object.entries(sumT).map(([c, t]) => [c, +t.toFixed(1)]))));
}

const fails = [];
if (summaries.length !== runs) fails.push(`${runs - summaries.length} carreras sin RACE_END`);
for (const s of summaries) { void s; }
const end = res.end;
if (!end) fails.push('no llegó RACE_END');
else if (end.results.length !== 6) fails.push(`resultados: ${end.results.length} (esperaba 6)`);
else {
  const times = end.results.map((r) => r.time);
  if (times.some((t, i) => i && t < times[i - 1])) fails.push('tiempos no monótonos');
}
if (runs === 1) {
  if (res.aiItem < 1) fails.push('la IA no usó objetos');
  if (res.aiPower < 1) fails.push('la IA no usó poderes');
}
if (allErrors.length) fails.push(`errores de consola (${allErrors.length}):\n` + allErrors.slice(0, 10).join('\n'));
if (fails.length) { console.error('FALLO:\n' + fails.join('\n')); process.exit(1); }
console.log('OK: carrera completa, sin errores de consola');
