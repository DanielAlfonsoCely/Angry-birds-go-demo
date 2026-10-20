// Página de prueba de audio (tests/audio-test.html). No la importa el juego.
import { SFX } from '../core/contracts.js';
import { audio } from './index.js';
import { SFX_DEFS } from './sfx.js';
import { THEMES } from './themes.js';
import { renderTheme } from './music.js';
import { Engine } from './engine.js';
import { createBuses, MUSIC_LEVEL } from './mixer.js';

const SR = 44100;
const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------- UI en vivo
audio.attach(null, { data: { settings: { music: 0.6, sfx: 0.8 } } });

const VARIANTS = { miniTurbo: [{ level: 1 }, { level: 2 }], trick: [{ success: true }, { success: false }] };
for (const name of SFX) {
  for (const opts of VARIANTS[name] ?? [{}]) {
    const b = document.createElement('button');
    b.textContent = name + (opts.level ? ` ${opts.level}` : opts.success === false ? ' (falla)' : '');
    b.onclick = () => { audio.unlock(); audio.play(name, opts); };
    $('sfx').appendChild(b);
  }
}

for (const id of Object.keys(THEMES)) {
  const b = document.createElement('button');
  b.textContent = `♪ ${id}`;
  b.onclick = () => { audio.unlock(); audio.playMusic(id); };
  $('music').appendChild(b);
}
const stop = document.createElement('button');
stop.textContent = '■ detener';
stop.onclick = () => audio.stopMusic();
$('music').appendChild(stop);

let engineOn = false;
let raf = 0;
function engineLoop() {
  if (!engineOn) return;
  audio.setEngine(Number($('engine').value), $('boost').checked, $('drift').checked);
  raf = requestAnimationFrame(engineLoop);
}
$('engineOn').onclick = () => { audio.unlock(); engineOn = true; cancelAnimationFrame(raf); engineLoop(); };
$('engineOff').onclick = () => { engineOn = false; audio.setEngine(-1); };
$('volMusic').oninput = (e) => audio.setVolumes({ music: Number(e.target.value) });
$('volSfx').oninput = (e) => audio.setVolumes({ sfx: Number(e.target.value) });

// ---------------------------------------------------------------- análisis offline

function measure(buffer, from = 0, to = buffer.duration) {
  const d = buffer.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
  const a = Math.floor(from * SR);
  const b = Math.min(d.length, Math.ceil(to * SR));
  let sum = 0;
  for (let i = a; i < b; i++) sum += d[i] * d[i];
  const rms = Math.sqrt(sum / Math.max(1, b - a));
  return { peak, rms };
}

async function renderSfx(name, opts = {}) {
  const ctx = new OfflineAudioContext(1, SR * 3, SR);
  const g = ctx.createGain();
  g.connect(ctx.destination);
  const t0 = 0.02;
  const dur = SFX_DEFS[name](ctx, g, t0, 1, opts);
  const buf = await ctx.startRendering();
  return { dur, ...measure(buf, t0, t0 + dur) };
}

async function renderMusic(id, bars) {
  const theme = THEMES[id];
  const len = (bars * 16 * 60) / theme.bpm / 4 + 1.5;
  const ctx = new OfflineAudioContext(1, Math.ceil(SR * len), SR);
  const dur = renderTheme(ctx, ctx.destination, id, bars, 0.02);
  const buf = await ctx.startRendering();
  return { dur, ...measure(buf, 0.02, 0.02 + dur) };
}

async function renderEngine() {
  const ctx = new OfflineAudioContext(1, SR * 5, SR);
  const eng = new Engine(ctx, ctx.destination);
  for (let i = 0; i <= 40; i++) {
    const t = i * 0.1;
    eng.set(Math.min(1, t / 3), t > 3, t > 2 && t < 3, t);
  }
  eng.set(null, false, false, 4.2);
  const buf = await ctx.startRendering();
  return { dur: 4.2, ...measure(buf, 0.1, 4.2) };
}

/** Peor caso: música + motor + varios SFX a la vez por la cadena real (buses + compresor). */
async function renderMix() {
  const ctx = new OfflineAudioContext(1, SR * 4, SR);
  const buses = createBuses(ctx);
  buses.music.gain.value = 0.6 * MUSIC_LEVEL;
  buses.sfx.gain.value = 0.8;
  renderTheme(ctx, buses.music, 'canon', 4, 0);
  const eng = new Engine(ctx, buses.sfx);
  eng.set(1, true, true, 0);
  for (const [n, t] of [['boost', 0.5], ['shockwave', 0.5], ['kartHit', 0.55], ['coin', 0.6], ['land', 0.6], ['finish', 1.0], ['spinOut', 1.1]]) {
    const g = ctx.createGain();
    g.connect(buses.sfx);
    SFX_DEFS[n](ctx, g, t, 1, {});
  }
  const buf = await ctx.startRendering();
  return { dur: 4, ...measure(buf, 0, 4) };
}

const db = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);

async function analyzeAll() {
  const rows = [];
  for (const name of SFX) {
    for (const opts of VARIANTS[name] ?? [{}]) {
      const label = name + (opts.level ? `(${opts.level})` : opts.success === false ? '(falla)' : '');
      rows.push({ name: label, kind: 'sfx', ...(await renderSfx(name, opts)) });
    }
  }
  for (const id of Object.keys(THEMES)) rows.push({ name: `música:${id}`, kind: 'music', ...(await renderMusic(id, 16)) });
  rows.push({ name: 'motor (0→1, derrape, boost)', kind: 'engine', ...(await renderEngine()) });
  rows.push({ name: 'mezcla peor caso (cadena real)', kind: 'mix', ...(await renderMix()) });
  for (const r of rows) {
    r.rmsDb = Number(db(r.rms).toFixed(1));
    r.peakDb = Number(db(r.peak).toFixed(1));
    r.ok = r.peak < 1 && r.rms > 0.003;
  }
  return rows;
}

function showReport(rows) {
  const html = ['<table><tr><th>sonido</th><th>dur s</th><th>RMS</th><th>RMS dB</th><th>pico</th><th>pico dB</th></tr>'];
  for (const r of rows) {
    html.push(`<tr class="${r.ok ? '' : 'bad'}"><td>${r.name}</td><td>${r.dur.toFixed(2)}</td><td>${r.rms.toFixed(3)}</td><td>${r.rmsDb}</td><td>${r.peak.toFixed(3)}</td><td>${r.peakDb}</td></tr>`);
  }
  html.push('</table>');
  $('report').innerHTML = html.join('');
}

$('analyze').onclick = async () => {
  $('report').textContent = 'Renderizando…';
  showReport(await analyzeAll());
};

window.__audioTest = { analyzeAll, renderSfx, renderMusic };
