// Vistas de revisión de las pistas: coloca __game.camera en puntos clave y toma capturas + mide el presupuesto de render.
// Uso: node tests/track-views.mjs [--track=pico,selva,canon] [--only=salida,cueva]
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? 'true']; }));
const tracks = (args.track ?? 'pico,selva,canon').split(',');
const only = args.only ? args.only.split(',') : null;
mkdirSync('tests/screenshots', { recursive: true });
const server = await createServer({ server: { port: 5198, strictPort: false }, logLevel: 'error' });
await server.listen();
const port = server.config.server.port;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
const budget = {};

for (const id of tracks) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.setDefaultTimeout(180000);
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${id}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[${id}] ${e.stack ?? e}`));
  const load = async () => {
  for (let k = 0; k < 4; k++) { try { await page.goto(`http://localhost:${port}/?track=${id}&char=tuko`, { timeout: 120000 }); break; } catch { await page.waitForTimeout(2000); } }
  // Vite puede recargar la página una vez al optimizar dependencias: esperar a que se estabilice
  for (let k = 0; k < 3; k++) {
    try { await page.waitForFunction(() => window.__game?.mode?.track || window.__game?.mode?.race?.track, null, { timeout: 60000 }); await page.waitForTimeout(2500); await page.evaluate(() => 1); break; } catch { await page.waitForTimeout(1500); }
  }
  // Congela la carrera: solo se actualiza la pista; la cámara la mueve el script
  return await page.evaluate(() => {
    const g = window.__game, race = g.mode.race ?? g.mode;
    const track = race.track, f = track.frames;
    race.update = (dt, time) => track.update(dt, time);
    const ui = document.getElementById('ui'); if (ui) ui.style.display = 'none';
    race.scene.traverse((o) => { if (o.name === 'kart' || o.userData?.isKart) o.visible = false; });
    for (const k of race.karts ?? []) k.object3D.visible = false;
    const seg = (type, n = 0) => f.segments.filter((s) => s.type === type)[n];
    const cave = seg('cave'), narrow = seg('narrow'), jump = f.jumps[0], jump2 = f.jumps[f.jumps.length - 1];
    const sl = Math.round(52 / f.ds);
    // [nombre, frame, atrás, altura, adelante, lateral]
    const v = [
      ['salida', sl - 6, 14, 5, 40, 0],
      ['salida-lado', sl, 22, 4, 0, 14],
      ['cueva-boca', cave.i0 - 18, 10, 4, 30, 0],
      ['cueva-dentro', Math.round((cave.i0 + cave.i1) / 2), 6, 2.5, 30, 0],
      ['cueva-salida', cave.i1 - 12, 6, 3, 30, 0],
      ['puente', Math.round((narrow.i0 + narrow.i1) / 2), 14, 6, 40, 0],
      ['puente-alto', narrow.i0 + 30, 30, 55, 40, 0],
      ['rampa', jump.iRamp - 16, 12, 4, 40, 0],
      ['salto-lado', Math.round((jump.iLip + jump.iGapEnd) / 2), 40, 12, 0, 40],
      ['aterrizaje', jump.iGapEnd + 4, 12, 5, 40, 0],
      ['salto2-lado', Math.round((jump2.iLip + jump2.iGapEnd) / 2), 40, 12, 0, 40],
      ['curva', f.segments.find((s) => Math.abs(s.def.turn ?? 0) >= 45)?.i0 + 30 || 300, 14, 5, 40, 0],
      ['slalom', seg('slalom').i0 + 40, 14, 5, 40, 0],
      ['cascada', 0, 0, 0, 0, 0],
      ['meta', f.finishIndex - 30, 14, 5, 40, 0],
      ['meta-atras', f.finishIndex + 14, 14, 5, -30, 0],
    ];
    window.__views = v;
    return v.map((x) => x[0]);
  });
  };
  let views = await load();
  budget[id] = {};
  for (let n = 0; n < views.length; n++) {
    if (only && !only.includes(views[n])) continue;
    for (let attempt = 0; attempt < 3; attempt++) try {
    await page.evaluate((n) => {
      const g = window.__game, track = (g.mode.race ?? g.mode).track, f = track.frames;
      const [name, i, back, h, ahead, lat] = window.__views[n];
      if (name === 'cascada') {
        // cámara frente a la primera cascada (selva) o a la mitad del primer puente en el resto
        const sc = (g.mode.race ?? g.mode).scene;
        let w = null; sc.traverse((o) => { if (!w && o.name === 'waterfall') w = o; });
        const cam = g.camera;
        if (w) { w.geometry.computeBoundingSphere(); w.position.copy(w.geometry.boundingSphere.center); w.geometry.translate(-w.position.x, -w.position.y, -w.position.z); }
        if (!w) { cam.position.set(0, 400, 0); cam.lookAt(0, 0, -100); cam.updateMatrixWorld(); return; }
        let best = 0, bd = Infinity;
        for (let k = 0; k < f.N; k++) { const d = Math.hypot(f.px[k] - w.position.x, f.pz[k] - w.position.z); if (d < bd) { bd = d; best = k; } }
        const dx = f.px[best] - w.position.x, dz = f.pz[best] - w.position.z, l = Math.hypot(dx, dz) || 1;
        cam.position.set(w.position.x + dx / l * 45, f.py[best] + 8, w.position.z + dz / l * 45);
        cam.lookAt(w.position.x, w.position.y, w.position.z);
        cam.updateMatrixWorld();
        return;
      }
      const ix = Math.max(0, Math.min(f.N - 1, i));
      const s = track.sample(ix / f.finishIndex);
      const p = s.position, T = s.tangent, R = s.right;
      const cam = g.camera;
      cam.position.set(p.x - T.x * back + R.x * lat, p.y + h - T.y * back, p.z - T.z * back + R.z * lat);
      const tx = lat ? p.x : p.x + T.x * ahead, ty = lat ? p.y : p.y + T.y * ahead * 0.6, tz = lat ? p.z : p.z + T.z * ahead;
      cam.lookAt(tx, ty, tz);
      cam.updateMatrixWorld();
    }, n);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `tests/screenshots/view-${id}-${views[n]}.png` });
    const info = await page.evaluate(() => { const r = window.__game.renderer.info.render; return { calls: r.calls, tris: r.triangles }; });
    budget[id][views[n]] = info;
    if (args.debug) {
      // desglose: llamadas sin sombras y mallas dentro del frustum agrupadas por nombre
      const d = await page.evaluate(() => new Promise((res) => {
        const g = window.__game, r = g.renderer;
        r.shadowMap.enabled = false; g.scene.traverse?.(() => {});
        requestAnimationFrame(() => requestAnimationFrame(() => {
          const noShadow = r.info.render.calls;
          const scene = (g.mode.race ?? g.mode).scene;
          const fr = new (g.camera.constructor.prototype.constructor === Object ? Object : Object)();
          const by = {};
          scene.traverse((o) => { if (o.isMesh && o.visible) { const k = o.name || o.geometry.type; by[k] = (by[k] ?? 0) + 1; } });
          r.shadowMap.enabled = true;
          res({ noShadow, by });
        }));
      }));
      console.log(id, views[n], JSON.stringify(d));
    }
    break;
    } catch (e) { if (attempt === 2) throw e; views = await load(); }
  }
  await page.close();
}
console.log('\nPresupuesto por vista (draw calls / triángulos):');
for (const [id, vs] of Object.entries(budget)) {
  const arr = Object.values(vs);
  const maxC = Math.max(...arr.map((x) => x.calls)), maxT = Math.max(...arr.map((x) => x.tris));
  console.log(`${id}: máx ${maxC} calls, ${(maxT / 1e3).toFixed(0)}k tris | ` + Object.entries(vs).map(([k, x]) => `${k} ${x.calls}/${(x.tris / 1e3).toFixed(0)}k`).join(', '));
}
await browser.close();
await server.close();
if (errors.length) { console.error('ERRORES:\n' + errors.slice(0, 10).join('\n')); process.exit(1); }
