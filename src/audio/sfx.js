// Definiciones de efectos de sonido. Cada función es (ctx, out, t, pitch, opts) => duración (s).
// `out` es el nodo destino (ganancia de la voz); `pitch` es un multiplicador de frecuencia.
import { tone, noise, mtof, rand } from './synth.js';

/** Voz tipo "metal" de fanfarria: dos sierras desafinadas con filtro que se abre. */
function brass(ctx, out, t, f, dur, gain) {
  for (const det of [-9, 9]) {
    tone(ctx, out, t, {
      type: 'sawtooth', f, detune: det, dur: dur + 0.15, gain,
      env: [[0.02, 1], [0.08, 0.75], [dur, 0.6], [dur + 0.15, 0]],
      filter: { type: 'lowpass', f: 3200, f2: 1400, sweep: dur + 0.1, q: 1.2 },
    });
  }
}

export const SFX_DEFS = {
  // Bip de cuenta regresiva (igual los tres)
  countdown(ctx, out, t) {
    tone(ctx, out, t, { type: 'square', f: 784, dur: 0.24, gain: 0.13, filter: { f: 3000 } });
    tone(ctx, out, t, { type: 'sine', f: 392, dur: 0.24, gain: 0.18 });
    tone(ctx, out, t, { type: 'triangle', f: 1568, dur: 0.1, gain: 0.07 });
    return 0.3;
  },

  // "¡YA!": una octava más arriba, larga, con brillo
  go(ctx, out, t) {
    tone(ctx, out, t, { type: 'square', f: 1568, dur: 0.65, gain: 0.12, filter: { f: 4500 }, vibrato: { rate: 7, depth: 14 } });
    tone(ctx, out, t, { type: 'sine', f: 784, dur: 0.65, gain: 0.2 });
    [1976, 2349, 3136].forEach((f, i) => tone(ctx, out, t + 0.04 * (i + 1), { type: 'triangle', f, dur: 0.45, gain: 0.06 }));
    noise(ctx, out, t, { type: 'highpass', f: 6000, dur: 0.35, gain: 0.05 });
    return 0.75;
  },

  // Goma tensándose: sierra filtrada que sube con un crujido rítmico
  catapultStretch(ctx, out, t, p) {
    const dur = 1.25;
    tone(ctx, out, t, {
      type: 'sawtooth', f: 65 * p, f2: 200 * p, dur, gain: 0.22,
      env: [[0.15, 1], [1.05, 0.9], [dur, 0]],
      filter: { type: 'bandpass', f: 400, f2: 1500, q: 3 },
      trem: { rate: 16, depth: 0.35 },
    });
    noise(ctx, out, t, {
      type: 'bandpass', f: 1800, f2: 3200, q: 8, dur, gain: 0.35,
      env: [[0.2, 0.6], [1.0, 1], [dur, 0]],
      trem: { rate: 22, depth: 0.5, type: 'square' },
    });
    return dur;
  },

  // Disparo: "zuing" elástico + golpe sordo + soplido
  catapultRelease(ctx, out, t, p, o) {
    const power = o.power ?? 1;
    tone(ctx, out, t, {
      type: 'sawtooth', f: 170 * p, f2: 55 * p, sweep: 0.35, dur: 0.4, gain: 0.2,
      filter: { type: 'lowpass', f: 1600, f2: 300, q: 4 }, vibrato: { rate: 28, depth: 60 },
    });
    tone(ctx, out, t, { type: 'sine', f: 120, f2: 42, dur: 0.22, gain: 0.45 });
    noise(ctx, out, t, { type: 'bandpass', f: 450, f2: 3600, q: 1.2, dur: 0.55, attack: 0.03, gain: 0.22 + 0.2 * power });
    return 0.6;
  },

  // Moneda: dos notas brillantes ascendentes
  coin(ctx, out, t, p) {
    tone(ctx, out, t, { type: 'square', f: 988 * p, dur: 0.08, gain: 0.1, filter: { f: 5000 } });
    tone(ctx, out, t + 0.07, { type: 'square', f: 1319 * p, dur: 0.38, gain: 0.1, filter: { f: 6000 } });
    tone(ctx, out, t + 0.07, { type: 'sine', f: 2637 * p, dur: 0.25, gain: 0.06 });
    return 0.48;
  },

  // Caja de objeto: ruleta ascendente rápida + destello
  itemBox(ctx, out, t, p) {
    tone(ctx, out, t, { type: 'sine', f: 280 * p, f2: 620 * p, dur: 0.08, gain: 0.25 });
    [72, 74, 76, 79, 81, 84, 86, 88].forEach((m, i) => {
      tone(ctx, out, t + 0.04 + i * 0.045, { type: 'triangle', f: mtof(m) * p, dur: 0.14, gain: 0.13 });
      tone(ctx, out, t + 0.04 + i * 0.045, { type: 'square', f: mtof(m + 12) * p, dur: 0.06, gain: 0.025 });
    });
    noise(ctx, out, t + 0.1, { type: 'highpass', f: 7000, dur: 0.45, attack: 0.1, gain: 0.05 });
    return 0.6;
  },

  // Uso genérico de objeto: "fuip"
  itemUse(ctx, out, t, p) {
    noise(ctx, out, t, { type: 'bandpass', f: 600, f2: 2800, q: 2, dur: 0.24, attack: 0.02, gain: 0.35 });
    tone(ctx, out, t, { type: 'sine', f: 500 * p, f2: 1100 * p, dur: 0.12, gain: 0.15 });
    return 0.3;
  },

  // Boost: whoosh de ruido + barrido de sierra + empujón grave
  boost(ctx, out, t, p) {
    noise(ctx, out, t, { type: 'bandpass', f: 250, f2: 2400, q: 0.9, dur: 0.8, attack: 0.08, gain: 0.4 });
    tone(ctx, out, t, { type: 'sawtooth', f: 90 * p, f2: 360 * p, dur: 0.6, attack: 0.03, gain: 0.13, filter: { f: 600, f2: 3200 } });
    tone(ctx, out, t, { type: 'sine', f: 85, f2: 40, dur: 0.3, gain: 0.35 });
    tone(ctx, out, t + 0.05, { type: 'triangle', f: 1200 * p, f2: 2400 * p, dur: 0.25, gain: 0.05 });
    return 0.85;
  },

  // Inicio de derrape: chirrido corto de llanta
  driftStart(ctx, out, t, p) {
    noise(ctx, out, t, { type: 'bandpass', f: 1900 * p, f2: 1500 * p, q: 9, dur: 0.3, attack: 0.02, gain: 0.7 });
    tone(ctx, out, t, { type: 'sine', f: 950 * p, f2: 1150 * p, dur: 0.2, gain: 0.05 });
    return 0.33;
  },

  // Mini-turbo: chispa ascendente; nivel 2 más brillante y doble
  miniTurbo(ctx, out, t, p, o) {
    const lv2 = (o.level ?? 1) >= 2;
    const f0 = lv2 ? 1000 : 700;
    const f1 = lv2 ? 2600 : 1700;
    tone(ctx, out, t, { type: 'square', f: f0 * p, f2: f1 * p, dur: 0.16, gain: 0.09, filter: { f: lv2 ? 7000 : 3500 } });
    noise(ctx, out, t, { type: 'highpass', f: lv2 ? 5000 : 3500, dur: 0.22, gain: 0.14, trem: { rate: 45, depth: 0.5, type: 'square' } });
    if (lv2) {
      tone(ctx, out, t + 0.08, { type: 'square', f: 1400 * p, f2: 3200 * p, dur: 0.16, gain: 0.07, filter: { f: 8000 } });
      tone(ctx, out, t + 0.12, { type: 'triangle', f: 3136 * p, dur: 0.3, gain: 0.06 });
    }
    noise(ctx, out, t + 0.05, { type: 'bandpass', f: 400, f2: 1800, q: 1, dur: 0.42, attack: 0.05, gain: lv2 ? 0.3 : 0.22 });
    return 0.5;
  },

  // Salto: "boing"
  jump(ctx, out, t, p) {
    tone(ctx, out, t, { type: 'triangle', f: 220 * p, f2: 660 * p, sweep: 0.18, dur: 0.24, gain: 0.3, vibrato: { rate: 18, depth: 25 } });
    tone(ctx, out, t, { type: 'sine', f: 110 * p, f2: 330 * p, sweep: 0.18, dur: 0.2, gain: 0.15 });
    return 0.3;
  },

  // Aterrizaje: golpe grave
  land(ctx, out, t, p) {
    tone(ctx, out, t, { type: 'sine', f: 130 * p, f2: 42, dur: 0.3, gain: 0.55 });
    noise(ctx, out, t, { type: 'lowpass', f: 600, f2: 150, dur: 0.18, gain: 0.45 });
    noise(ctx, out, t, { type: 'bandpass', f: 1500, q: 2, dur: 0.06, gain: 0.12 });
    return 0.35;
  },

  // Truco: giro con viento + campanita si sale bien
  trick(ctx, out, t, p, o) {
    noise(ctx, out, t, { type: 'bandpass', f: 900, q: 3, dur: 0.42, attack: 0.06, gain: 0.35, flfo: { rate: 14, depth: 600 } });
    if (o.success !== false) {
      [84, 88, 91, 96].forEach((m, i) => {
        tone(ctx, out, t + 0.15 + i * 0.06, { type: 'triangle', f: mtof(m) * p, dur: 0.28, gain: 0.09 });
        tone(ctx, out, t + 0.15 + i * 0.06, { type: 'sine', f: mtof(m + 12) * p, dur: 0.15, gain: 0.03 });
      });
    }
    return 0.65;
  },

  // Choque contra pared: "tonk"
  wallHit(ctx, out, t, p) {
    noise(ctx, out, t, { type: 'lowpass', f: 1000, f2: 300, dur: 0.16, gain: 0.5 });
    tone(ctx, out, t, { type: 'square', f: 85 * p, f2: 55 * p, dur: 0.12, gain: 0.15, filter: { f: 600 } });
    noise(ctx, out, t, { type: 'bandpass', f: 3000, q: 3, dur: 0.05, gain: 0.12 });
    return 0.2;
  },

  // Choque entre karts: crash con resonancia metálica
  kartHit(ctx, out, t, p) {
    noise(ctx, out, t, { type: 'bandpass', f: 1400, f2: 600, q: 0.8, dur: 0.25, gain: 0.4 });
    tone(ctx, out, t, { type: 'triangle', f: 320 * p, f2: 110 * p, dur: 0.2, gain: 0.25 });
    for (const f of [523, 1247, 1873]) tone(ctx, out, t, { type: 'sine', f: f * p, dur: 0.35, gain: 0.05 });
    return 0.4;
  },

  // Trompo: "bonk" + glissando descendente con vibrato + estrellitas
  spinOut(ctx, out, t, p) {
    tone(ctx, out, t, { type: 'sine', f: 400 * p, f2: 150 * p, dur: 0.1, gain: 0.3 });
    tone(ctx, out, t + 0.04, { type: 'triangle', f: 950 * p, f2: 180 * p, sweep: 0.75, dur: 0.8, gain: 0.2, vibrato: { rate: 11, depth: 250 } });
    for (let i = 0; i < 4; i++) {
      tone(ctx, out, t + 0.25 + i * 0.12, { type: 'triangle', f: (i % 2 ? 2637 : 2093) * p, dur: 0.1, gain: 0.04 });
    }
    return 0.9;
  },

  // Escudo/burbuja: "blup" + brillo con trémolo
  shield(ctx, out, t, p) {
    tone(ctx, out, t, { type: 'sine', f: 250 * p, f2: 900 * p, sweep: 0.2, dur: 0.35, gain: 0.3 });
    for (const [f, det] of [[660, 0], [664, 0], [990, 4]]) {
      tone(ctx, out, t + 0.05, { type: 'triangle', f: f * p, detune: det, dur: 0.7, gain: 0.07, env: [[0.15, 1], [0.5, 0.6], [0.7, 0]], trem: { rate: 18, depth: 0.4 } });
    }
    noise(ctx, out, t, { type: 'highpass', f: 5000, dur: 0.5, attack: 0.1, gain: 0.04 });
    return 0.8;
  },

  // Sismo: explosión grave con rumor
  shockwave(ctx, out, t, p) {
    tone(ctx, out, t, { type: 'sine', f: 90 * p, f2: 28, dur: 0.9, gain: 0.45 });
    noise(ctx, out, t, { type: 'lowpass', f: 2500, f2: 150, dur: 1.0, gain: 0.4 });
    tone(ctx, out, t, { type: 'square', f: 55 * p, f2: 35, dur: 0.6, gain: 0.12, filter: { f: 300 } });
    return 1.0;
  },

  // Bomba de humo: "pfff" + "puf"
  smoke(ctx, out, t, p) {
    noise(ctx, out, t, { type: 'lowpass', f: 3500, f2: 400, dur: 1.0, attack: 0.06, gain: 0.35 });
    tone(ctx, out, t, { type: 'sine', f: 160 * p, f2: 70 * p, dur: 0.25, gain: 0.3 });
    noise(ctx, out, t, { type: 'bandpass', f: 900, q: 0.7, dur: 0.6, attack: 0.2, gain: 0.12 });
    return 1.0;
  },

  // Bola de nieve: lanzamiento con soplido y crujido
  snowball(ctx, out, t, p) {
    noise(ctx, out, t, { type: 'bandpass', f: 1800, f2: 700, q: 1.5, dur: 0.3, attack: 0.03, gain: 0.4 });
    tone(ctx, out, t, { type: 'triangle', f: 520 * p, f2: 260 * p, dur: 0.12, gain: 0.14 });
    noise(ctx, out, t, { type: 'highpass', f: 2500, dur: 0.08, gain: 0.14, trem: { rate: 60, depth: 0.5, type: 'square' } });
    return 0.33;
  },

  // Charco de miel: "blorp" pegajoso + burbujitas
  honey(ctx, out, t, p) {
    tone(ctx, out, t, { type: 'sine', f: 160 * p, fpts: [[0.12, 420 * p], [0.35, 140 * p]], dur: 0.38, gain: 0.4, filter: { f: 900 } });
    tone(ctx, out, t, { type: 'triangle', f: 80 * p, fpts: [[0.12, 210 * p], [0.35, 70 * p]], dur: 0.35, gain: 0.15 });
    for (const dt of [0.15, 0.26, 0.34]) {
      const f = rand(300, 650) * p;
      tone(ctx, out, t + dt, { type: 'sine', f, f2: f * 2, dur: 0.05, gain: 0.13 });
    }
    return 0.5;
  },

  // Imán: zumbido magnético que sube
  magnet(ctx, out, t, p) {
    for (const det of [0, 12]) {
      tone(ctx, out, t, {
        type: 'sawtooth', f: 110 * p, f2: 220 * p, detune: det, dur: 0.8, gain: 0.1,
        env: [[0.05, 1], [0.6, 0.8], [0.8, 0]],
        filter: { f: 300, f2: 2500, q: 6 }, vibrato: { rate: 9, depth: 30 },
      });
    }
    tone(ctx, out, t, { type: 'sine', f: 440 * p, f2: 880 * p, dur: 0.6, gain: 0.1, trem: { rate: 12, depth: 0.4 } });
    return 0.85;
  },

  // Meta: fanfarria corta
  finish(ctx, out, t) {
    const seq = [[67, 0, 0.1], [72, 0.11, 0.1], [76, 0.22, 0.1], [79, 0.33, 0.18], [76, 0.52, 0.1], [79, 0.63, 0.1]];
    for (const [m, dt, d] of seq) brass(ctx, out, t + dt, mtof(m), d, 0.06);
    const tc = t + 0.75;
    for (const m of [72, 76, 79, 84]) brass(ctx, out, tc, mtof(m), 1.0, 0.045);
    tone(ctx, out, tc, { type: 'sine', f: 98, f2: 90, dur: 0.5, gain: 0.35 });
    noise(ctx, out, tc, { type: 'highpass', f: 5000, dur: 1.2, gain: 0.08 });
    for (let i = 0; i < 5; i++) tone(ctx, out, tc + 0.1 + i * 0.07, { type: 'triangle', f: mtof(96 + [0, 4, 7, 12, 16][i]), dur: 0.25, gain: 0.03 });
    return 2.0;
  },

  uiClick(ctx, out, t, p) {
    tone(ctx, out, t, { type: 'sine', f: 1500 * p, dur: 0.05, gain: 0.25 });
    tone(ctx, out, t, { type: 'triangle', f: 3000 * p, dur: 0.03, gain: 0.06 });
    return 0.07;
  },

  uiBack(ctx, out, t, p) {
    tone(ctx, out, t, { type: 'triangle', f: 700 * p, dur: 0.06, gain: 0.25 });
    tone(ctx, out, t + 0.06, { type: 'triangle', f: 480 * p, dur: 0.1, gain: 0.25 });
    return 0.17;
  },

  // Compra: "ka-ching" con tres notas y destello
  purchase(ctx, out, t, p) {
    noise(ctx, out, t, { type: 'bandpass', f: 4000, q: 1.5, dur: 0.1, gain: 0.15 });
    tone(ctx, out, t, { type: 'square', f: 1319 * p, dur: 0.07, gain: 0.08, filter: { f: 6000 } });
    tone(ctx, out, t + 0.06, { type: 'square', f: 1760 * p, dur: 0.07, gain: 0.08, filter: { f: 6000 } });
    tone(ctx, out, t + 0.12, { type: 'square', f: 2637 * p, dur: 0.45, gain: 0.07, filter: { f: 7000 } });
    tone(ctx, out, t + 0.12, { type: 'sine', f: 1319 * p, dur: 0.45, gain: 0.1 });
    noise(ctx, out, t + 0.12, { type: 'highpass', f: 8000, dur: 0.4, gain: 0.05 });
    return 0.6;
  },

  error(ctx, out, t, p) {
    tone(ctx, out, t, { type: 'square', f: 196 * p, dur: 0.1, gain: 0.14, filter: { f: 1200 } });
    tone(ctx, out, t + 0.13, { type: 'square', f: 155 * p, dur: 0.18, gain: 0.14, filter: { f: 1200 } });
    return 0.33;
  },
};

/** Voces simultáneas máximas por sonido (por defecto 3). */
export const MAX_VOICES = {
  countdown: 1, go: 1, finish: 1, catapultStretch: 1, catapultRelease: 1,
  coin: 4, uiClick: 2, uiBack: 2, purchase: 2, error: 1, shockwave: 2, smoke: 2, shield: 1,
};

/** Variación aleatoria de pitch (±). Los sonidos "musicales" no varían. */
export const PITCH_VARIATION = {
  countdown: 0, go: 0, finish: 0, uiClick: 0.01, uiBack: 0, purchase: 0, error: 0, coin: 0.01,
};
export const DEFAULT_VARIATION = 0.05;
