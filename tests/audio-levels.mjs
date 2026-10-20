// Mide RMS y pico de cada SFX, tema musical y motor renderizándolos en un OfflineAudioContext
// dentro de tests/audio-test.html. Falla si algo satura (pico >= 1) o es silencio.
// Uso: node tests/audio-levels.mjs
import { createServer } from 'vite';
import { chromium } from 'playwright';

const server = await createServer({ server: { port: 5198, strictPort: false }, logLevel: 'error' });
await server.listen();
const port = server.config.server.port;
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e.stack ?? e)));

let code = 0;
try {
  await page.goto(`http://localhost:${port}/tests/audio-test.html`);
  await page.waitForFunction(() => window.__audioTest, null, { timeout: 15000 });
  const rows = await page.evaluate(() => window.__audioTest.analyzeAll());
  const pad = (s, n) => String(s).padEnd(n);
  const padl = (s, n) => String(s).padStart(n);
  console.log(`${pad('sonido', 32)}${padl('dur', 6)}${padl('RMS', 8)}${padl('RMS dB', 8)}${padl('pico', 8)}${padl('pico dB', 9)}`);
  for (const r of rows) {
    console.log(`${pad(r.name, 32)}${padl(r.dur.toFixed(2), 6)}${padl(r.rms.toFixed(3), 8)}${padl(r.rmsDb, 8)}${padl(r.peak.toFixed(3), 8)}${padl(r.peakDb, 9)}${r.ok ? '' : '  <-- REVISAR'}`);
  }
  const bad = rows.filter((r) => !r.ok);
  if (bad.length) { console.log(`\nFALLA: ${bad.map((r) => r.name).join(', ')}`); code = 1; }
  if (errors.length) { console.log('Errores de consola:\n' + errors.join('\n')); code = 1; }
  if (!code) console.log('\nOK: nada satura ni está en silencio');
} catch (e) {
  console.error(e);
  code = 1;
} finally {
  await browser.close();
  await server.close();
}
process.exit(code);
