// Telemetría de físicas en las pistas reales: autopiloto, timeScale alto y sin render.
// Uso: node tests/physics-telemetry.mjs [--tracks=pico,...] [--char=tuko] [--scale=4] [--timeout=200] [--json]
import { createServer } from 'vite';
import { chromium } from 'playwright';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? 'true'];
}));
const char = args.char ?? 'tuko';
const scale = Number(args.scale ?? 4);
const timeout = Number(args.timeout ?? 200) * 1000;

const server = await createServer({ server: { port: 5197, strictPort: false, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const port = server.config.server.port;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

// Se ejecuta en la página: muestrea cada frame y cuenta eventos por kart.
function installProbe() {
  window.__tel = { karts: {}, end: null, lastT: null };
  const hook = () => {
    const g = window.__game;
    if (!g) return requestAnimationFrame(hook);
    g.timeScale = window.__scale;
    const emit = g.events.emit.bind(g.events);
    g.events.emit = (n, p) => { if (n === 'race:end') window.__tel.end = p; emit(n, p); };
    g.renderer.render = () => {
      const race = g.mode?.race ?? g.mode;
      if (!race?.karts) return;
      const T = window.__tel;
      const dt = T.lastT == null ? 0 : g.time - T.lastT;
      T.lastT = g.time;
      for (const k of race.karts) {
        let s = T.karts[k.id];
        if (!s) {
          s = T.karts[k.id] = { id: k.id, time: 0, dist: 0, vmax: 0, air: 0, land: 0, hard: 0, wall: 0, resp: 0, stuck: 0, spin: 0, boost: 0, gdist: 0, gtime: 0, drift: 0, driftBoost: 0, fin: null, wrapped: false };
        }
        if (!s.wrapped) {
          s.wrapped = true;
          const prev = k.onEvent;
          k.onEvent = (type, ev) => {
            if (type === 'land') { s.land++; if (ev.hard) s.hard++; }
            else if (type === 'wallHit') s.wall++;
            else if (type === 'respawn' && !k.finished && k.t < 0.99) { s.resp++; (s.respAt ??= []).push(+k.t.toFixed(3) + '@' + Math.round(k.speed)); }
            else if (type === 'driftBoost') s.driftBoost++;
            prev?.(type, ev);
          };
        }
        if (k.id === 'player' && race.track && !k.finished && !k.frozen && k.t > 0 && k.respawnTimer <= 0) {
          // cámara: bajo el suelo / tapada por el terreno entre la cámara y el kart
          const c = g.camera.position, P = (T.cam ??= { n: 0, under: 0, occl: 0, minD: 99, p: new g.camera.position.constructor() });
          P.n++;
          const h = race.track.getGroundAt(c);
          if (h && c.y < h.height + 0.3) P.under++;
          let blocked = false;
          for (let i = 1; i <= 5 && !blocked; i++) {
            const f = i / 6;
            P.p.set(c.x + (k.position.x - c.x) * f, c.y + (k.position.y + 0.8 - c.y) * f, c.z + (k.position.z - c.z) * f);
            const hh = race.track.getGroundAt(P.p);
            if (hh && hh.height > P.p.y + 0.15 && hh.height < P.p.y + 3) blocked = true;
          }
          if (blocked) P.occl++;
          P.minD = Math.min(P.minD, c.distanceTo(k.position));
        }
        if (k.finished || k.frozen || dt <= 0 || k.t <= 0) { if (k.finished && s.fin == null) s.fin = s.time; continue; }
        s.time += dt;
        s.dist += k.speed * dt;
        if (k.speed > s.vmax) s.vmax = k.speed;
        if (!k.grounded) s.air += dt;
        if (k.drifting) s.drift += dt;
        if (k.spinTimer > 0) s.spin += dt;
        if (k.boostTimer > 0) s.boost += dt;
        else if (k.grounded) { s.gdist += k.speed * dt; s.gtime += dt; }
        if (k.speed < 5 && s.time > 8 && k.respawnTimer <= 0 && k.spinTimer <= 0 && k.grounded) s.stuck += dt;
      }
    };
  };
  hook();
}

const rows = [];
for (const track of (args.tracks ?? 'pico,selva,canon').split(',')) {
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.addInitScript((s) => { window.__scale = s; }, scale);
  await page.addInitScript(installProbe);
  await page.goto(`http://localhost:${port}/?track=${track}&char=${char}&autopilot=1`);
  const start = Date.now();
  let done = false;
  while (Date.now() - start < timeout && !done) {
    await page.waitForTimeout(1000);
    done = await page.evaluate(() => !!window.__tel.end);
  }
  const T = await page.evaluate(() => window.__tel);
  await page.close();
  if (T.cam) console.log(`[${track}] cámara: frames=${T.cam.n} bajo-suelo=${T.cam.under} tapada=${T.cam.occl} distMin=${T.cam.minD.toFixed(1)}`);
  if (errors.length) console.error(`[${track}] errores de consola:`, errors.slice(0, 3));
  for (const s of Object.values(T.karts)) {
    const t = s.fin ?? s.time;
    rows.push({
      track, kart: s.id === 'player' ? 'JUGADOR' : s.id, dur: +t.toFixed(1), vavg: +(s.dist / Math.max(s.time, 1e-6)).toFixed(1),
      vmax: +s.vmax.toFixed(1), air: +(100 * s.air / Math.max(s.time, 1e-6)).toFixed(1), land: s.land, hard: s.hard,
      wallKm: +(s.wall / Math.max(s.dist / 1000, 1e-6)).toFixed(1), resp: s.resp, stuck: +s.stuck.toFixed(1),
      boost: +(100 * s.boost / Math.max(s.time, 1e-6)).toFixed(0), vsin: +(s.gdist / Math.max(s.gtime, 1e-6)).toFixed(1), driftS: +s.drift.toFixed(1), dBoost: s.driftBoost, fin: s.fin != null, respAt: s.respAt ?? [],
    });
  }
  if (!done) console.error(`[${track}] la carrera no terminó en ${timeout / 1000} s`);
}
await browser.close();
await server.close();

if (args.json) console.log(JSON.stringify(rows));
else {
  console.log('pista     kart     dur(s) vprom vmax  aire%  aterr duros  pared/km resp atasco(s) derrape(s) miniturbos boost% vsinBoost');
  for (const r of rows) {
    console.log(`${r.track.padEnd(9)} ${r.kart.padEnd(8)} ${String(r.dur).padStart(6)} ${String(r.vavg).padStart(5)} ${String(r.vmax).padStart(5)} ${String(r.air).padStart(5)} ${String(r.land).padStart(5)} ${String(r.hard).padStart(5)} ${String(r.wallKm).padStart(8)} ${String(r.resp).padStart(4)} ${String(r.stuck).padStart(8)} ${String(r.driftS).padStart(10)} ${String(r.dBoost).padStart(8)} ${String(r.boost).padStart(6)} ${String(r.vsin).padStart(9)}`);
  }
  for (const r of rows) if (r.respAt.length) console.log(`  respawn ${r.track} ${r.kart}: ${r.respAt.join(' ')}`);
  for (const tr of new Set(rows.map((r) => r.track))) {
    const p = rows.find((r) => r.track === tr && r.kart === 'JUGADOR');
    const ais = rows.filter((r) => r.track === tr && r.kart !== 'JUGADOR');
    const avg = (f) => ais.reduce((a, r) => a + f(r), 0) / Math.max(ais.length, 1);
    console.log(`> ${tr}: IA media vprom ${avg((r) => r.vavg).toFixed(1)}, dur ${avg((r) => r.dur).toFixed(1)}, aire ${avg((r) => r.air).toFixed(1)}%, duros ${avg((r) => r.hard).toFixed(1)}, resp ${avg((r) => r.resp).toFixed(1)}, atasco ${avg((r) => r.stuck).toFixed(1)}${p ? '' : ''}`);
  }
}
