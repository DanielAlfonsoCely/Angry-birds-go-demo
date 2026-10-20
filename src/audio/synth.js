// Utilidades de síntesis. Todas reciben (ctx, dest, t) para funcionar igual con un
// AudioContext en vivo que con un OfflineAudioContext (pruebas de nivel).

const noiseCache = new WeakMap();

/** Buffer de ruido blanco de 2 s, uno por contexto. */
export function getNoise(ctx) {
  let buf = noiseCache.get(ctx);
  if (!buf) {
    const len = Math.floor(ctx.sampleRate * 2);
    buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    noiseCache.set(ctx, buf);
  }
  return buf;
}

export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
export const rand = (a, b) => a + Math.random() * (b - a);

const EPS = 0.0001;

/** Ataque lineal y caída exponencial hasta ~0 en t+dur. */
export function perc(param, t, peak, attack, dur) {
  param.setValueAtTime(EPS, t);
  param.linearRampToValueAtTime(peak, t + attack);
  param.exponentialRampToValueAtTime(EPS, t + Math.max(dur, attack + 0.01));
}

/** ADSR clásico: gate de `dur` segundos y release `r`. Devuelve el fin del sonido. */
export function adsr(param, t, peak, a, d, s, dur, r) {
  const gate = Math.max(dur, a + 0.005);
  param.setValueAtTime(0, t);
  param.linearRampToValueAtTime(peak, t + a);
  param.setTargetAtTime(peak * s, t + a, Math.max(d, 0.001) / 3);
  param.setTargetAtTime(0, t + gate, Math.max(r, 0.005) / 4);
  return t + gate + r;
}

/** Envolvente por puntos [[dt, valor], ...] con rampas lineales (empieza en 0). */
function points(param, t, peak, pts) {
  param.setValueAtTime(0, t);
  for (const [dt, v] of pts) param.linearRampToValueAtTime(Math.max(0, v * peak), t + dt);
}

/** LFO conectado a un AudioParam. */
export function lfo(ctx, param, t, end, rate, depth, type = 'sine') {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = rate;
  const g = ctx.createGain();
  g.gain.value = depth;
  o.connect(g).connect(param);
  o.start(t);
  o.stop(end);
  return o;
}

function makeFilter(ctx, t, dur, f) {
  const flt = ctx.createBiquadFilter();
  flt.type = f.type ?? 'lowpass';
  flt.frequency.setValueAtTime(f.f, t);
  if (f.f2) flt.frequency.exponentialRampToValueAtTime(f.f2, t + (f.sweep ?? dur));
  flt.Q.value = f.q ?? 0.7;
  return flt;
}

/** Inserta trémolo (modulación de amplitud) y devuelve el nodo de entrada. */
function tremolo(ctx, dest, t, end, tr) {
  const g = ctx.createGain();
  g.gain.value = 1 - tr.depth;
  lfo(ctx, g.gain, t, end, tr.rate, tr.depth, tr.type ?? 'sine');
  g.connect(dest);
  return g;
}

/**
 * Oscilador con envolvente. Opciones:
 *  type, f, f2 (barrido exponencial), sweep (duración del barrido), fpts [[dt,f],...],
 *  dur, attack, gain, env [[dt,v],...], detune (cents), filter {type,f,f2,q,sweep},
 *  vibrato {rate, depth (cents)}, trem {rate, depth, type}
 */
export function tone(ctx, dest, t, o) {
  const dur = o.dur ?? 0.2;
  const end = t + dur + 0.05;
  const osc = ctx.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.f, t);
  if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + (o.sweep ?? dur));
  if (o.fpts) for (const [dt, f] of o.fpts) osc.frequency.exponentialRampToValueAtTime(f, t + dt);
  if (o.detune) osc.detune.value = o.detune;
  if (o.vibrato) lfo(ctx, osc.detune, t, end, o.vibrato.rate, o.vibrato.depth);

  const g = ctx.createGain();
  if (o.env) points(g.gain, t, o.gain ?? 0.3, o.env);
  else perc(g.gain, t, o.gain ?? 0.3, o.attack ?? 0.004, dur);

  let node = osc;
  if (o.filter) node = node.connect(makeFilter(ctx, t, dur, o.filter));
  node.connect(g);
  g.connect(o.trem ? tremolo(ctx, dest, t, end, o.trem) : dest);
  osc.start(t);
  osc.stop(end);
  return { osc, gain: g };
}

/**
 * Ruido filtrado con envolvente. Opciones:
 *  dur, attack, gain, env, type (filtro), f, f2, sweep, q, flfo {rate, depth (Hz)}, trem
 */
export function noise(ctx, dest, t, o) {
  const dur = o.dur ?? 0.2;
  const end = t + dur + 0.05;
  const src = ctx.createBufferSource();
  src.buffer = getNoise(ctx);
  src.loop = true;
  const flt = makeFilter(ctx, t, dur, { type: o.type ?? 'bandpass', f: o.f ?? 1000, f2: o.f2, q: o.q ?? 1, sweep: o.sweep });
  if (o.flfo) lfo(ctx, flt.frequency, t, end, o.flfo.rate, o.flfo.depth);
  const g = ctx.createGain();
  if (o.env) points(g.gain, t, o.gain ?? 0.3, o.env);
  else perc(g.gain, t, o.gain ?? 0.3, o.attack ?? 0.004, dur);
  src.connect(flt).connect(g);
  g.connect(o.trem ? tremolo(ctx, dest, t, end, o.trem) : dest);
  src.start(t, Math.random() * 1.5);
  src.stop(end);
  return { src, gain: g, filter: flt };
}
