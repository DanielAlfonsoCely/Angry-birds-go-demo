// Motor continuo del kart del jugador: sierras/cuadrada desafinadas + filtro, con
// "petardeo" por trémolo, rugido de ruido al usar boost y chirrido opcional al derrapar.
import { getNoise } from './synth.js';

const TC = 0.06; // constante de suavizado (s)

export class Engine {
  constructor(ctx, dest) {
    this.ctx = ctx;
    this.dest = dest;
    this.nodes = null;
    this.stopTimer = null;
    this.muted = false;
  }

  build() {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(this.dest);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 3;
    filter.frequency.value = 500;

    // trémolo de "pistones"
    const am = ctx.createGain();
    am.gain.value = 0.7;
    const amLfo = ctx.createOscillator();
    amLfo.type = 'sine';
    amLfo.frequency.value = 12;
    const amDepth = ctx.createGain();
    amDepth.gain.value = 0.3;
    amLfo.connect(amDepth).connect(am.gain);

    const oscs = [
      { type: 'sawtooth', mul: 1, det: 0, g: 0.45 },
      { type: 'sawtooth', mul: 1, det: 9, g: 0.35 },
      { type: 'square', mul: 0.5, det: -5, g: 0.35 },
    ].map((o) => {
      const osc = ctx.createOscillator();
      osc.type = o.type;
      osc.frequency.value = 55 * o.mul;
      osc.detune.value = o.det;
      const g = ctx.createGain();
      g.gain.value = o.g;
      osc.connect(g).connect(filter);
      return { osc, mul: o.mul };
    });
    filter.connect(am).connect(out);

    // rugido de boost
    const roarSrc = ctx.createBufferSource();
    roarSrc.buffer = getNoise(ctx);
    roarSrc.loop = true;
    const roarF = ctx.createBiquadFilter();
    roarF.type = 'bandpass';
    roarF.frequency.value = 900;
    roarF.Q.value = 0.8;
    const roar = ctx.createGain();
    roar.gain.value = 0;
    roarSrc.connect(roarF).connect(roar).connect(out);

    // chirrido de derrape
    const skidSrc = ctx.createBufferSource();
    skidSrc.buffer = getNoise(ctx);
    skidSrc.loop = true;
    const skidF = ctx.createBiquadFilter();
    skidF.type = 'bandpass';
    skidF.frequency.value = 1900;
    skidF.Q.value = 8;
    const skidLfo = ctx.createOscillator();
    skidLfo.frequency.value = 7;
    const skidLfoG = ctx.createGain();
    skidLfoG.gain.value = 180;
    skidLfo.connect(skidLfoG).connect(skidF.frequency);
    const skid = ctx.createGain();
    skid.gain.value = 0;
    skidSrc.connect(skidF).connect(skid).connect(out);

    const sources = [amLfo, roarSrc, skidSrc, skidLfo, ...oscs.map((o) => o.osc)];
    for (const s of sources) s.start(t);
    this.nodes = { out, filter, amLfo, amDepth, oscs, roar, roarF, skid, sources };
  }

  /**
   * ratio 0..1 (null o <0 apaga), boosting y drifting booleanos.
   * `time` permite agendar en un OfflineAudioContext (por defecto: ahora).
   */
  set(ratio, boosting = false, drifting = false, time) {
    const t = time ?? this.ctx.currentTime;
    if (ratio == null || ratio < 0 || Number.isNaN(ratio)) {
      this.off(t);
      return;
    }
    if (this.stopTimer) {
      clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
    if (!this.nodes) this.build();
    const n = this.nodes;
    const r = Math.min(1, Math.max(0, ratio));
    const boostMul = boosting ? 1.12 : 1;
    const f = (52 + 120 * r) * boostMul;
    for (const o of n.oscs) o.osc.frequency.setTargetAtTime(f * o.mul, t, TC);
    n.filter.frequency.setTargetAtTime(350 + 2200 * r + (boosting ? 1200 : 0), t, TC);
    n.amLfo.frequency.setTargetAtTime(10 + 28 * r, t, TC);
    n.amDepth.gain.setTargetAtTime(0.3 - 0.18 * r, t, TC);
    n.roar.gain.setTargetAtTime(boosting ? 0.35 : 0, t, boosting ? 0.04 : 0.2);
    n.roarF.frequency.setTargetAtTime(boosting ? 700 + 900 * r : 600, t, 0.1);
    n.skid.gain.setTargetAtTime(drifting && r > 0.15 ? 0.5 : 0, t, 0.05);
    n.out.gain.setTargetAtTime(this.muted ? 0 : 0.14 + 0.1 * r, t, 0.1);
  }

  /** Silencia temporalmente (pausa) sin destruir los nodos. */
  setMuted(m) {
    this.muted = m;
    if (this.nodes && m) this.nodes.out.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
  }

  off(time) {
    if (!this.nodes) return;
    const t = time ?? this.ctx.currentTime;
    this.nodes.out.gain.setTargetAtTime(0, t, 0.12);
    if (this.stopTimer || time !== undefined) return;
    // libera los nodos tras el fade (solo en vivo)
    this.stopTimer = setTimeout(() => {
      this.stopTimer = null;
      const n = this.nodes;
      if (!n) return;
      this.nodes = null;
      for (const s of n.sources) { try { s.stop(); } catch { /* ya detenido */ } }
      try { n.out.disconnect(); } catch { /* ignorar */ }
    }, 900);
  }
}
