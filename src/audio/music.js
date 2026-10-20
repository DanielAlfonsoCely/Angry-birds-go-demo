// Secuenciador de música con "lookahead scheduling": un temporizador agenda las notas
// un poco antes de tiempo sobre el reloj de WebAudio, así el ritmo no depende del framerate.
import { THEMES, SCALES } from './themes.js';
import { MELODIC, DRUMS } from './instruments.js';
import { mtof } from './synth.js';

const LOOKAHEAD = 0.15; // s agendados por adelantado
const TICK_MS = 25;
const VEL = { X: 1, x: 0.75, g: 0.4 };

/** Semitonos de un grado (1 = tónica; admite >7, <=0 y sufijos #/b). */
function degreeSemis(scale, n) {
  const i = n - 1;
  const oct = Math.floor(i / 7);
  const deg = ((i % 7) + 7) % 7;
  return scale[deg] + 12 * oct;
}

function parseMelody(scale, str) {
  const toks = str.trim().split(/\s+/);
  const res = 16 / toks.length;
  const notes = [];
  toks.forEach((tok, i) => {
    if (tok === '-' || tok === '.') return;
    const m = tok.match(/^(-?\d+)([#b]?)$/);
    if (!m) return;
    let len = 1;
    while (toks[i + len] === '-') len++;
    const semis = degreeSemis(scale, Number(m[1])) + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    notes.push({ step: i * res, semis, steps: len * res });
  });
  return notes;
}

/** Eventos de un patrón de 16 chars con sostenidos: [{step, ch, steps}] */
function parseRhythm(str) {
  const ev = [];
  if (!str) return ev;
  for (let i = 0; i < 16; i++) {
    const ch = str[i];
    if (!ch || ch === '-' || ch === '.') continue;
    let len = 1;
    while (str[i + len] === '-') len++;
    ev.push({ step: i, ch, steps: len });
  }
  return ev;
}

function triad(scale, degree) {
  return [0, 2, 4].map((k) => {
    let s = degreeSemis(scale, degree + k);
    while (s > 14) s -= 12;
    return s;
  });
}

/** Precompila un tema a una lista de compases con eventos por paso. */
function compile(theme) {
  if (theme._bars) return theme._bars;
  const scale = SCALES[theme.scale];
  const bars = [];
  for (const secId of theme.order) {
    const sec = theme.sections[secId];
    const n = sec.chords.length;
    for (let b = 0; b < n; b++) {
      const chord = triad(scale, sec.chords[b]);
      const steps = Array.from({ length: 16 }, () => []);
      const last = b === n - 1;
      // melodía
      for (const nt of parseMelody(scale, sec.melody[b] ?? '')) {
        steps[nt.step].push({ kind: 'lead', semis: nt.semis + theme.leadOct, steps: nt.steps });
      }
      // bajo
      for (const ev of parseRhythm(sec.bass)) {
        const off = { R: 0, '3': chord[1] - chord[0], '5': chord[2] - chord[0], O: 12 }[ev.ch];
        if (off === undefined) continue;
        const rootSemis = chord[0] > 7 ? chord[0] - 12 : chord[0];
        steps[ev.step].push({ kind: 'bass', semis: rootSemis + off + theme.bassOct, steps: ev.steps });
      }
      // acordes
      for (const ev of parseRhythm(sec.chordRhythm)) steps[ev.step].push({ kind: 'chord', chord, steps: ev.steps });
      for (const ev of parseRhythm(sec.padRhythm)) steps[ev.step].push({ kind: 'pad', chord, steps: ev.steps });
      // batería
      const drums = last && sec.fill ? sec.fill : sec.drums;
      for (const [inst, pat] of Object.entries(drums)) {
        for (let i = 0; i < 16; i++) {
          const v = VEL[pat[i]];
          if (v) steps[i].push({ kind: 'drum', inst, vel: v });
        }
      }
      if (theme.crash && b === 0) steps[0].push({ kind: 'drum', inst: 'x', vel: 0.8 });
      bars.push(steps);
    }
  }
  theme._bars = bars;
  return bars;
}

export function stepDuration(theme) {
  return 60 / theme.bpm / 4;
}

/** Agenda los eventos de un paso global. Sirve para tiempo real y para render offline. */
export function scheduleStep(ctx, dest, theme, globalStep, time) {
  const bars = compile(theme);
  const sd = stepDuration(theme);
  const bar = bars[Math.floor(globalStep / 16) % bars.length];
  const s = globalStep % 16;
  // swing: retrasa las corcheas a contratiempo (fracción de corchea)
  const t = time + (s % 4 === 2 ? theme.swing * sd * 2 : 0);
  const lead = MELODIC[theme.lead];
  for (const ev of bar[s]) {
    const dur = ev.steps * sd;
    switch (ev.kind) {
      case 'lead':
        lead(ctx, dest, t, mtof(theme.root + ev.semis), dur, 0.9 + Math.random() * 0.1);
        break;
      case 'bass':
        MELODIC[theme.bassInst](ctx, dest, t, mtof(theme.root + ev.semis), dur, 1);
        break;
      case 'chord':
        for (const n of ev.chord) MELODIC[theme.chordInst](ctx, dest, t, mtof(theme.root + n), dur, 1);
        break;
      case 'pad':
        for (const n of ev.chord) MELODIC[theme.padInst](ctx, dest, t, mtof(theme.root + n), dur, 1);
        break;
      case 'drum':
        DRUMS[ev.inst]?.(ctx, dest, t, ev.vel);
        break;
    }
  }
}

export function themeBars(id) {
  return compile(THEMES[id]).length;
}

/** Renderiza `bars` compases de un tema desde t0 (para OfflineAudioContext). */
export function renderTheme(ctx, dest, id, bars, t0 = 0) {
  const theme = THEMES[id];
  const out = ctx.createGain();
  out.gain.value = theme.gain;
  out.connect(dest);
  const sd = stepDuration(theme);
  for (let i = 0; i < bars * 16; i++) scheduleStep(ctx, out, theme, i, t0 + i * sd);
  return bars * 16 * sd;
}

/** Reproductor de un tema en bucle sobre un contexto en vivo. */
class ThemePlayer {
  constructor(ctx, dest, id) {
    this.ctx = ctx;
    this.id = id;
    this.theme = THEMES[id];
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(dest);
    this.step = 0;
    this.nextTime = ctx.currentTime + 0.08;
    this.stopAt = Infinity;
  }

  fadeIn(time) {
    const g = this.out.gain;
    const now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(this.theme.gain, now + time);
  }

  fadeOut(time) {
    const g = this.out.gain;
    const now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + time);
    this.stopAt = now + time;
  }

  schedule() {
    const until = Math.min(this.ctx.currentTime + LOOKAHEAD, this.stopAt);
    // si el contexto estuvo suspendido, no intentes "ponerte al día"
    if (this.nextTime < this.ctx.currentTime - 0.2) this.nextTime = this.ctx.currentTime + 0.05;
    const sd = stepDuration(this.theme);
    while (this.nextTime < until) {
      scheduleStep(this.ctx, this.out, this.theme, this.step, this.nextTime);
      this.step++;
      this.nextTime += sd;
    }
  }

  get done() {
    return this.ctx.currentTime > this.stopAt + 0.5;
  }

  dispose() {
    try { this.out.disconnect(); } catch { /* ya desconectado */ }
  }
}

/** Controlador de música con crossfade. */
export class Music {
  constructor(ctx, dest) {
    this.ctx = ctx;
    this.dest = dest;
    this.current = null;
    this.fading = [];
    this.timer = null;
  }

  play(id) {
    if (!THEMES[id]) return;
    if (this.current?.id === id) return;
    if (this.current) {
      this.current.fadeOut(1.2);
      this.fading.push(this.current);
    }
    this.current = new ThemePlayer(this.ctx, this.dest, id);
    this.current.fadeIn(this.fading.length ? 0.8 : 0.3);
    this.ensureTimer();
  }

  stop(fade = 0.8) {
    if (!this.current) return;
    this.current.fadeOut(fade);
    this.fading.push(this.current);
    this.current = null;
  }

  get playingId() {
    return this.current?.id ?? null;
  }

  ensureTimer() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  tick() {
    if (this.ctx.state !== 'running') return;
    this.current?.schedule();
    for (const p of this.fading) p.schedule();
    this.fading = this.fading.filter((p) => {
      if (!p.done) return true;
      p.dispose();
      return false;
    });
    if (!this.current && !this.fading.length) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
