// Instrumentos de la música. Firma: (ctx, dest, t, freq, dur, vel) para los melódicos
// y (ctx, dest, t, vel) para la batería.
import { tone, noise, adsr, lfo } from './synth.js';

function osc(ctx, type, f, t, end, detune = 0) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  o.detune.value = detune;
  o.start(t);
  o.stop(end);
  return o;
}

// ---------- melódicos ----------

export const MELODIC = {
  // Pluck tipo campanita suave (menú)
  pluck(ctx, dest, t, f, dur, vel) {
    const d = Math.min(0.9, 0.25 + dur);
    tone(ctx, dest, t, { type: 'triangle', f, dur: d, gain: 0.22 * vel });
    tone(ctx, dest, t, { type: 'sine', f: f * 2, dur: d * 0.5, gain: 0.08 * vel });
    tone(ctx, dest, t, { type: 'sine', f: f * 4, dur: 0.06, gain: 0.03 * vel });
  },

  // Marimba: fundamental + parcial agudo que muere rápido (selva)
  marimba(ctx, dest, t, f, dur, vel) {
    tone(ctx, dest, t, { type: 'sine', f, dur: Math.min(0.6, 0.2 + dur), gain: 0.28 * vel, attack: 0.002 });
    tone(ctx, dest, t, { type: 'sine', f: f * 4, dur: 0.07, gain: 0.08 * vel, attack: 0.001 });
    tone(ctx, dest, t, { type: 'triangle', f: f * 2.01, dur: 0.15, gain: 0.05 * vel, attack: 0.002 });
  },

  // Lead cuadrado con vibrato (pico)
  squareLead(ctx, dest, t, f, dur, vel) {
    const end = t + dur + 0.2;
    const g = ctx.createGain();
    const stop = adsr(g.gain, t, 0.09 * vel, 0.01, 0.12, 0.7, dur * 0.92, 0.08);
    const flt = ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = 3800;
    const a = osc(ctx, 'square', f, t, end);
    const b = osc(ctx, 'triangle', f / 2, t, end);
    const bg = ctx.createGain();
    bg.gain.value = 0.8;
    if (dur > 0.25) {
      for (const o of [a, b]) lfo(ctx, o.detune, t + 0.15, end, 5.5, 12);
    }
    a.connect(flt);
    b.connect(bg).connect(flt);
    flt.connect(g).connect(dest);
    return stop;
  },

  // Lead de sierras desafinadas (cañón)
  sawLead(ctx, dest, t, f, dur, vel) {
    const end = t + dur + 0.2;
    const g = ctx.createGain();
    adsr(g.gain, t, 0.06 * vel, 0.008, 0.1, 0.75, dur * 0.95, 0.07);
    const flt = ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.Q.value = 2;
    flt.frequency.setValueAtTime(1200, t);
    flt.frequency.linearRampToValueAtTime(3600, t + 0.03);
    flt.frequency.setTargetAtTime(2200, t + 0.03, 0.1);
    for (const det of [-10, 10]) osc(ctx, 'sawtooth', f, t, end, det).connect(flt);
    if (dur > 0.2) lfo(ctx, flt.frequency, t + 0.1, end, 6, 300);
    flt.connect(g).connect(dest);
  },

  // Pad cálido (notas de acorde sostenidas)
  pad(ctx, dest, t, f, dur, vel) {
    const end = t + dur + 0.5;
    const g = ctx.createGain();
    adsr(g.gain, t, 0.035 * vel, 0.08, 0.3, 0.8, dur, 0.4);
    const flt = ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = 1300;
    for (const det of [-7, 7]) osc(ctx, 'sawtooth', f, t, end, det).connect(flt);
    flt.connect(g).connect(dest);
  },

  // Pad más suave de triángulos (menú/selva)
  softPad(ctx, dest, t, f, dur, vel) {
    const end = t + dur + 0.5;
    const g = ctx.createGain();
    adsr(g.gain, t, 0.05 * vel, 0.12, 0.3, 0.8, dur, 0.45);
    for (const det of [-6, 6]) osc(ctx, 'triangle', f, t, end, det).connect(g);
    g.connect(dest);
  },

  // Acorde corto (stab) de cuadradas
  stab(ctx, dest, t, f, dur, vel) {
    tone(ctx, dest, t, { type: 'square', f, dur: Math.min(0.16, dur), gain: 0.035 * vel, filter: { f: 2200, f2: 800 } });
  },

  // Bajo redondo (seno + triángulo)
  bassRound(ctx, dest, t, f, dur, vel) {
    const end = t + dur + 0.15;
    const g = ctx.createGain();
    adsr(g.gain, t, 0.3 * vel, 0.006, 0.15, 0.6, dur * 0.9, 0.06);
    osc(ctx, 'sine', f, t, end).connect(g);
    const tg = ctx.createGain();
    tg.gain.value = 0.35;
    osc(ctx, 'triangle', f * 2, t, end).connect(tg).connect(g);
    g.connect(dest);
  },

  // Bajo pulsado con filtro (pico/selva)
  bassPluck(ctx, dest, t, f, dur, vel) {
    const end = t + dur + 0.15;
    const g = ctx.createGain();
    adsr(g.gain, t, 0.16 * vel, 0.005, 0.12, 0.5, dur * 0.85, 0.05);
    const flt = ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.Q.value = 3;
    flt.frequency.setValueAtTime(1400, t);
    flt.frequency.setTargetAtTime(350, t, 0.06);
    osc(ctx, 'square', f, t, end).connect(flt);
    const sub = ctx.createGain();
    sub.gain.value = 1.2;
    osc(ctx, 'sine', f, t, end).connect(sub).connect(g);
    flt.connect(g).connect(dest);
  },

  // Bajo de sierra agresivo (cañón)
  bassSaw(ctx, dest, t, f, dur, vel) {
    const end = t + dur + 0.1;
    const g = ctx.createGain();
    adsr(g.gain, t, 0.13 * vel, 0.004, 0.08, 0.6, dur * 0.85, 0.04);
    const flt = ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.Q.value = 6;
    flt.frequency.setValueAtTime(1800, t);
    flt.frequency.setTargetAtTime(420, t, 0.05);
    osc(ctx, 'sawtooth', f, t, end).connect(flt);
    osc(ctx, 'sawtooth', f, t, end, 12).connect(flt);
    const sub = ctx.createGain();
    sub.gain.value = 1.4;
    osc(ctx, 'sine', f, t, end).connect(sub).connect(g);
    flt.connect(g).connect(dest);
  },
};

// ---------- batería ----------

export const DRUMS = {
  // bombo
  k(ctx, dest, t, vel) {
    tone(ctx, dest, t, { type: 'sine', f: 150, f2: 45, sweep: 0.12, dur: 0.32, gain: 0.55 * vel, attack: 0.002 });
    noise(ctx, dest, t, { type: 'lowpass', f: 2500, dur: 0.02, gain: 0.12 * vel, attack: 0.001 });
  },
  // caja
  s(ctx, dest, t, vel) {
    tone(ctx, dest, t, { type: 'triangle', f: 210, f2: 160, dur: 0.1, gain: 0.25 * vel, attack: 0.001 });
    noise(ctx, dest, t, { type: 'bandpass', f: 2200, q: 0.7, dur: 0.18, gain: 0.35 * vel, attack: 0.001 });
  },
  // aplauso: tres ráfagas cortas
  c(ctx, dest, t, vel) {
    for (let i = 0; i < 3; i++) noise(ctx, dest, t + i * 0.011, { type: 'bandpass', f: 1500, q: 1.5, dur: i === 2 ? 0.15 : 0.02, gain: 0.3 * vel, attack: 0.001 });
  },
  // aro (rimshot suave)
  r(ctx, dest, t, vel) {
    tone(ctx, dest, t, { type: 'triangle', f: 1700, dur: 0.035, gain: 0.18 * vel, attack: 0.001 });
    noise(ctx, dest, t, { type: 'bandpass', f: 3500, q: 3, dur: 0.03, gain: 0.15 * vel, attack: 0.001 });
  },
  // hi-hat cerrado
  h(ctx, dest, t, vel) {
    noise(ctx, dest, t, { type: 'highpass', f: 7500, dur: 0.045, gain: 0.13 * vel, attack: 0.001 });
  },
  // hi-hat abierto
  o(ctx, dest, t, vel) {
    noise(ctx, dest, t, { type: 'highpass', f: 6500, dur: 0.22, gain: 0.1 * vel, attack: 0.002 });
  },
  // shaker
  z(ctx, dest, t, vel) {
    noise(ctx, dest, t, { type: 'bandpass', f: 6500, q: 1.2, dur: 0.06, gain: 0.12 * vel, attack: 0.015 });
  },
  // conga aguda
  p(ctx, dest, t, vel) {
    tone(ctx, dest, t, { type: 'sine', f: 340, f2: 300, dur: 0.18, gain: 0.3 * vel, attack: 0.001 });
    noise(ctx, dest, t, { type: 'bandpass', f: 1800, q: 2, dur: 0.02, gain: 0.08 * vel, attack: 0.001 });
  },
  // conga grave
  l(ctx, dest, t, vel) {
    tone(ctx, dest, t, { type: 'sine', f: 220, f2: 190, dur: 0.24, gain: 0.32 * vel, attack: 0.001 });
    noise(ctx, dest, t, { type: 'bandpass', f: 1200, q: 2, dur: 0.02, gain: 0.07 * vel, attack: 0.001 });
  },
  // tom de relleno
  t(ctx, dest, t, vel) {
    tone(ctx, dest, t, { type: 'sine', f: 180, f2: 110, dur: 0.25, gain: 0.35 * vel, attack: 0.001 });
  },
  // platillo
  x(ctx, dest, t, vel) {
    noise(ctx, dest, t, { type: 'highpass', f: 5000, dur: 1.1, gain: 0.12 * vel, attack: 0.002 });
    noise(ctx, dest, t, { type: 'bandpass', f: 8000, q: 0.8, dur: 0.6, gain: 0.06 * vel, attack: 0.002 });
  },
};
