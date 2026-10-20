// HUD con una carrera real (autopiloto, timeScale 3): capturas en momentos clave, comprobación de valores y resultados.
// Uso: node tests/ui-hud.mjs [--track=pico] [--char=tuko] [--timeout=300] [--mobile]
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? 'true']; }));
const track = args.track ?? 'pico';
const char = args.char ?? 'tuko';
const mobile = !!args.mobile;
const timeout = Number(args.timeout ?? 300) * 1000;
const tag = mobile ? 'm' : 'd';
mkdirSync('tests/screenshots', { recursive: true });
const server = await createServer({ server: { port: 5197, strictPort: false, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const base = `http://localhost:${server.config.server.port}`;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 } : { viewport: { width: 960, height: 540 } });
const page = await ctx.newPage();
page.setDefaultTimeout(120000);
const errors = [];
let failed = false;
const check = (c, m) => { if (!c) { failed = true; console.error('FALLA:', m); } else console.log('ok:', m); };
page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)|ERR_(INTERNET|NAME|FAILED|CONNECTION)/.test(m.text())) errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e.stack ?? e)));
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());

// Detector en la página: al cumplirse una condición congela la carrera (game.paused directo) y avisa.
await page.addInitScript(() => {
  window.__seen = {}; window.__texts = new Set(); window.__hold = null; window.__want = new Set();
  const hook = () => {
    const g = window.__game;
    if (!g || !g.mode?.race) return requestAnimationFrame(hook);
    g.timeScale = 3;
    if (!window.__render) { window.__render = g.renderer.render.bind(g.renderer); g.renderer.render = () => {}; }
    const r = g.mode.race;
    const fire = (k) => { if (!window.__seen[k] && window.__want.has(k)) { window.__seen[k] = true; window.__hold = k; g.paused = true; } };
    g.events.on('race:end', () => { g.renderer.render = window.__render; }); // retratos de resultados necesitan render
    g.events.on('race:launch', (p) => { if (p.kartId === 'player') window.__texts.add('launch:' + p.rating); });
    g.events.on('race:trick', (p) => { if (p.kartId === 'player') setTimeout(() => fire('trick'), 80); });
    g.events.on('race:driftBoost', (p) => { if (p.kartId === 'player') setTimeout(() => fire('drift'), 80); });
    g.events.on('race:finish', (p) => { if (p.kartId === 'player') setTimeout(() => fire('finish'), 150); });
    new MutationObserver(() => { document.querySelectorAll('.cr-popup,.cr-banner').forEach((e) => window.__texts.add(e.textContent)); })
      .observe(document.body, { childList: true, subtree: true });
    const tick = () => {
      const s = r.getPlayerState();
      if (!window.__hold) {
        if (s.phase === 'countdown' && s.launchMeter > 0.2) fire('catapult');
        else if (s.phase === 'racing') {
          if (s.item) fire('item');
          if (s.powerReady) fire('power');
          if (!r.player.grounded && s.speedKmh > 60) fire('air');
          if (s.coins >= 5) fire('coins');
        }
      }
      requestAnimationFrame(tick);
    };
    tick();
  };
  hook();
});

const state = () => page.evaluate(() => {
  const g = window.__game; const s = g.mode.race.getPlayerState();
  const t = (sel) => document.querySelector(sel)?.textContent ?? null;
  return {
    s, pos: t('.cr-pos__n'), coins: t('.cr-hud-coins'), speed: t('.cr-speedo__v'), timer: t('.cr-timer'),
    itemIco: document.querySelector('.cr-item__ico')?.isConnected ? t('.cr-item__ico') : '',
    powerReady: document.querySelector('.cr-power-slot')?.classList.contains('ready'),
    ring: document.querySelector('.ring-fg')?.getAttribute('stroke-dasharray'),
    meterShown: document.querySelector('.cr-launch')?.style.display !== 'none',
    dots: [...document.querySelectorAll('.cr-progress__dot')].map((d) => d.style.left),
  };
});
const snap = async (name) => {
  await page.evaluate(() => { window.__game.renderer.render = window.__render; });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `tests/screenshots/ui-hud-${tag}-${name}.png`, timeout: 120000 });
  await page.evaluate(() => { window.__game.renderer.render = () => {}; });
};
// Fase A: lanzamiento manual (sin autopiloto) para ver el medidor y el banner
await page.goto(`${base}/?track=${track}&char=${char}`);
await page.waitForSelector('.cr-hud');
await page.waitForFunction(() => window.__game.mode?.race?.getPlayerState().phase === 'countdown');
await page.evaluate(() => { window.__game.timeScale = 1; });
check(await page.locator('.cr-tuto').count() === 1, 'guía de controles visible en la primera carrera');
check(await page.evaluate(() => window.__game.save.data.seenTutorial === true), 'seenTutorial guardado');
await snap('tutorial');
await page.keyboard.down('Space');
await page.waitForFunction(() => window.__game.mode.race.getPlayerState().launchMeter > 0.3);
await page.evaluate(() => { window.__game.paused = true; });
await page.waitForTimeout(200);
const cat = await state();
await snap('catapult');
check(cat.meterShown && cat.s.launchMeter > 0.3, `medidor de catapulta visible (${cat.s.launchMeter.toFixed(2)})`);
await page.evaluate(() => { window.__game.paused = false; });
await page.keyboard.up('Space');
await page.waitForFunction(() => window.__game.mode.race.getPlayerState().launched);
await page.waitForTimeout(300);
await page.evaluate(() => { window.__game.paused = true; });
await snap('launch');
const launchTexts = await page.evaluate(() => [...window.__texts]);
console.log('Lanzamiento:', JSON.stringify(launchTexts));
check(launchTexts.some((t) => /PERFECTO|Bien/.test(t)) || launchTexts.some((t) => /launch:normal/.test(t)), 'lanzamiento con rating');

await page.waitForFunction(() => !document.querySelector('.cr-tuto'), null, { timeout: 60000 }).then(() => check(true, 'la guía se oculta sola'), () => check(false, 'la guía se oculta sola'));

// Fase B: carrera completa con autopiloto
await page.goto(`${base}/?track=${track}&char=${char}&autopilot=1`);
await page.waitForSelector('.cr-hud');
check(await page.locator('.cr-tuto').count() === 0, 'la guía no se repite en la segunda carrera');
const want = ['item', 'coins', 'power', 'air', 'trick', 'drift', 'finish'];
await page.evaluate((w) => w.forEach((k) => window.__want.add(k)), want);
const got = {};
const start = Date.now();
while (Date.now() - start < timeout) {
  await page.waitForTimeout(300);
  const hold = await page.evaluate(() => window.__hold);
  if (hold) {
    await page.waitForTimeout(150); // el HUD ya se actualizó con la carrera congelada
    const st = await state();
    got[hold] = st; console.log("captura", hold, Math.round((Date.now() - start) / 1000) + "s");
    await snap(`${hold}`);
    await page.evaluate(() => { window.__hold = null; if (!window.__game.mode.ended) window.__game.paused = false; });
    if (hold === 'finish') break;
  }
  if (await page.evaluate(() => !!window.__game.save && document.querySelector('#btn-retry'))) break;
}
console.log('estado final', JSON.stringify(await page.evaluate(() => ({ p: window.__game.paused, ph: window.__game.mode.race?.phase, t: window.__game.mode.race?.raceTime }))));
await page.waitForSelector('#btn-retry', { timeout: 120000 });
await page.waitForTimeout(2500);
await snap('results');
const texts = await page.evaluate(() => [...window.__texts]);
console.log('Textos vistos:', JSON.stringify(texts));

const it = got.item; if (it) { check(!!it.itemIco, `slot de objeto muestra icono (${it.s.item} -> ${it.itemIco})`); } else check(false, 'se vio un objeto en el slot');
const co = got.coins; if (co) check(Number(co.coins) === co.s.coins, `monedas HUD (${co.coins}) = estado (${co.s.coins})`);
const pw = got.power; if (pw) check(pw.powerReady, 'poder listo resalta el slot'); else check(false, 'se vio el poder listo');
const ai = got.air; if (ai) check(Number(ai.speed) === ai.s.speedKmh, `velocímetro (${ai.speed}) = estado (${ai.s.speedKmh})`);
if (texts.some((t) => /Truco|truco/.test(t))) console.log('ok: popup de truco'); else console.log('aviso: el autopiloto no hizo trucos en esta carrera');
check(texts.some((t) => /Mini turbo|Turbo naranja/.test(t)), 'popup de mini turbo');
check(texts.some((t) => /META/.test(t)), 'banner de meta');
if (got.finish) check(got.finish.dots.every((d) => d), 'puntos de progreso posicionados');

// resultados y guardado
const res = await page.evaluate(() => {
  const d = window.__game.save.data;
  return { coins: d.coins, best: d.bestTimes, bestPos: d.bestPositions, podium: document.querySelectorAll('.cr-podium > *').length, rows: document.querySelectorAll('.cr-results tr, .cr-results__row, .cr-row').length };
});
console.log('Guardado:', JSON.stringify(res));
const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('cumbre-rush-save-v1') || '{}'));
check(stored.bestTimes && stored.bestTimes[track] > 0, 'mejor tiempo persistido en localStorage');
check(stored.coins > 0, 'monedas persistidas');

await browser.close();
await server.close();
if (errors.length) { console.error(`ERRORES DE CONSOLA (${errors.length}):\n` + errors.slice(0, 10).join('\n')); process.exit(1); }
if (failed) process.exit(1);
console.log('OK: HUD con carrera real');
