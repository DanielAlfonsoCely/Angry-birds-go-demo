// Test de flujo de UI con clics reales (Playwright): título → personaje → pista → carrera → pausa → salir
// → resultados (RACE_END simulado) → tienda → ajustes. Corre en escritorio 1280x720 y móvil 390x844 (táctil).
// Uso: node tests/ui-flow.mjs [--only=desktop|mobile]
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? 'true']; }));
mkdirSync('tests/screenshots', { recursive: true });
const server = await createServer({ server: { port: 5198, strictPort: false, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const base = `http://localhost:${server.config.server.port}`;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
let failed = false;
const check = (cond, msg) => { if (!cond) { failed = true; console.error('FALLA:', msg); } else console.log('ok:', msg); };

async function run(name, ctxOpts, touch) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  page.setDefaultTimeout(120000); // el render por software es lento
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)|ERR_(INTERNET|NAME|FAILED|CONNECTION)/.test(m.text())) errors.push(`[${name}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[${name}] ${e.stack ?? e}`));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  // save inicial con monedas para probar compras
  await page.addInitScript(() => {
    if (!localStorage.getItem('cumbre-rush-save-v1')) {
      localStorage.setItem('cumbre-rush-save-v1', JSON.stringify({ coins: 2500, unlockedTracks: ['pico'], bestTimes: { pico: 83.45 }, bestPositions: { pico: 2 } }));
    }
  });
  const shot = (n) => page.screenshot({ path: `tests/screenshots/ui-${name}-${n}.png`, timeout: 120000 });
  const click = (sel) => (touch ? page.locator(sel).first().tap() : page.locator(sel).first().click());
  const coins = () => page.evaluate(() => window.__game.save.data.coins);

  await page.goto(`${base}/`);
  await page.waitForSelector('#btn-play');
  await page.waitForTimeout(2500);
  await shot('01-title');

  await click('#btn-play');
  await page.waitForSelector('#btn-choose');
  await page.waitForTimeout(5000);
  await shot('02-char-tuko');
  // ir al primer personaje bloqueado (Bruno): tres pasos adelante
  for (let i = 0; i < 3; i++) { await click('.cr-char-nav--r button'); await page.waitForTimeout(250); }
  await page.waitForSelector('#btn-buy');
  await page.waitForTimeout(1500);
  await shot('03-char-locked');
  const before = await coins();
  await click('#btn-buy');
  await page.waitForSelector('#btn-choose');
  check((await coins()) < before, 'comprar personaje descuenta monedas');
  check(await page.evaluate(() => window.__game.save.data.unlockedCharacters.includes('bruno')), 'Bruno desbloqueado');
  await page.waitForTimeout(700);
  await shot('04-char-bought');
  await click('#btn-choose');
  await page.waitForSelector('.cr-track');
  await page.waitForTimeout(900);
  await shot('05-tracks');
  check(await page.locator('.cr-track.is-locked').count() === 2, 'dos pistas bloqueadas al inicio');

  await click('.cr-track[data-track="pico"]');
  await page.waitForSelector('.cr-hud', { timeout: 30000 });
  await page.waitForTimeout(touch ? 4000 : 6000);
  await shot('06-race');
  await click('#btn-pause');
  await page.waitForSelector('#btn-resume');
  check(await page.evaluate(() => window.__game.paused), 'pausa activa game.paused');
  await page.waitForTimeout(500);
  await shot('07-pause');
  await click('#btn-resume');
  check(await page.waitForFunction(() => !window.__game.paused, null, { timeout: 30000 }).then(() => true, () => false), 'reanudar libera la pausa');
  if (!touch) {
    await page.keyboard.press('Escape');
    await page.waitForSelector('#btn-resume');
    await page.keyboard.press('Escape');
    const ok = await page.waitForFunction(() => !window.__game.paused, null, { timeout: 30000 }).then(() => true, () => false);
    check(ok, 'Esc alterna la pausa');
  }

  // resultados: se simula el fin de carrera con el contrato de EVENTS
  const coinsBefore = await coins();
  await page.evaluate(() => {
    const g = window.__game;
    const ids = ['bruno', 'mora', 'chispa', 'tuko', 'nilo', 'kiko'];
    g.events.emit('race:end', {
      results: ids.map((c, i) => ({ kartId: i === 0 ? 'player' : `ai${i}`, characterId: c, position: i + 1, time: 80 + i * 2.3, isPlayer: i === 0 })),
      coinsCollected: 17, reward: 167,
    });
  });
  await page.waitForSelector('#btn-retry');
  await page.waitForTimeout(2200);
  await shot('08-results');
  check((await coins()) === coinsBefore + 167, 'resultados suman la recompensa (167)');
  check(await page.evaluate(() => window.__game.save.data.bestTimes.pico === 80), 'mejor tiempo guardado');
  check(await page.evaluate(() => window.__game.save.data.bestPositions.pico === 1), 'mejor puesto guardado');
  check(await page.evaluate(() => window.__game.save.data.unlockedTracks.includes('selva')), 'top 3 desbloquea la siguiente pista');

  await click('.cr-results__btns .cr-btn--secondary'); // Tienda
  await page.waitForSelector('.cr-shop');
  await page.waitForTimeout(1200);
  const c0 = await coins();
  await click('.cr-upg .cr-btn--green, .cr-upg .cr-btn--primary');
  await page.waitForTimeout(900);
  check((await coins()) < c0, 'comprar mejora descuenta monedas');
  await shot('09-shop');
  await click('.cr-topbar .cr-btn--round'); // atrás → pistas
  await page.waitForSelector('.cr-track');
  await page.waitForTimeout(800);
  await shot('10-tracks-unlocked');
  await click('.cr-topbar .cr-btn--round'); // atrás → personajes
  await page.waitForSelector('#btn-choose');
  await click('.cr-topbar .cr-btn--round'); // → título
  await page.waitForSelector('#btn-play');
  await page.waitForTimeout(500);
  await click('.cr-menu__row .cr-btn--ghost'); // Ajustes
  await page.waitForSelector('.cr-settings');
  await page.waitForTimeout(800);
  await shot('11-settings');
  await click('.cr-topbar .cr-btn--round');
  await page.waitForSelector('#btn-play');

  // carrera por URL + salir desde la pausa
  await page.goto(`${base}/?track=selva&char=mora`);
  await page.waitForSelector('.cr-hud');
  await page.waitForTimeout(2500);
  await page.keyboard.press('KeyP');
  await page.waitForSelector('#btn-exit');
  await click('#btn-exit');
  await page.waitForSelector('.cr-track');
  check(true, 'salir de la pausa vuelve a la selección de pista');
  await ctx.close();
}

if (args.only !== 'mobile') await run('desktop', { viewport: { width: 1280, height: 720 } }, false);
if (args.only !== 'desktop') await run('mobile', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }, true);

await browser.close();
await server.close();
if (errors.length) { console.error(`ERRORES DE CONSOLA (${errors.length}):\n` + errors.slice(0, 15).join('\n')); process.exit(1); }
if (failed) process.exit(1);
console.log('OK: flujo completo sin errores de consola');
