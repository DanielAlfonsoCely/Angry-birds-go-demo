// Generador de la línea central: integra rumbo y pendiente tramo a tramo (curvatura continua) y
// remuestrea a una tabla uniforme de frames cada ~1 m. Sin Three ni DOM (lo usa también tests/track-check.mjs).
import { designJump } from './ballistics.js';

export const SEGMENT_TYPES = ['open', 'narrow', 'cave', 'jump', 'boost', 'slalom'];
export const PART = { normal: 0, approach: 1, ramp: 2, gap: 3, land: 4, runout: 5 };

const DEG = Math.PI / 180;
const STEP = 0.5;
const RUNOUT = 110; // metros de pista después de la meta (para frenar), fuera del rango t
const DEFAULT_HW = { open: 8, boost: 8, slalom: 8, jump: 8, narrow: 3.5, cave: 5.5 };
const smoothstep = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/**
 * @param {{segments:object[]}} def
 */
export function buildPath(def) {
  const raw = []; // {x,y,z,s,seg,part}
  let x = 0, y = 0, z = 0, s = 0;
  let heading = 0; // 0 = hacia -Z; turn positivo = derecha (heading baja)
  let pitch = (def.segments[0].slope ?? 8) * DEG; // positivo = bajada
  let segIdx = 0, part = PART.normal;
  const push = () => raw.push({ x, y, z, s, seg: segIdx, part });
  const advance = (ds) => {
    const ch = Math.cos(pitch);
    x += -Math.sin(heading) * ch * ds;
    z += -Math.cos(heading) * ch * ds;
    y -= Math.sin(pitch) * ds;
    s += ds;
    push();
  };
  push();

  const segments = [];
  const jumps = [];
  def.segments.forEach((seg, idx) => {
    segIdx = idx;
    const s0 = s;
    const p0 = pitch;
    const h0 = heading;
    if (seg.type !== 'jump') {
      const L = seg.length;
      const target = (seg.slope ?? 8) * DEG;
      const blend = Math.min(30, L * 0.5);
      const turn = (seg.turn ?? 0) * DEG;
      const amp = (seg.amp ?? 0) * DEG;
      const wig = seg.wiggles ?? 0;
      const n = Math.round(L / STEP);
      part = PART.normal;
      for (let j = 1; j <= n; j++) {
        const u = j / n;
        pitch = p0 + (target - p0) * smoothstep((j * STEP) / blend);
        heading = h0 - turn * (1 - Math.cos(Math.PI * u)) / 2 - amp * Math.sin(2 * Math.PI * wig * u) * Math.sin(Math.PI * u);
        advance(STEP);
      }
    } else {
      // Salto: aproximación recta (con boost pad), rampa hacia arriba, hueco balístico y aterrizaje en bajada.
      const design = designJump({ gap: seg.gap, rampAngle: seg.rampAngle ?? 12 });
      const approach = seg.approach ?? 36;
      const rampLen = seg.ramp ?? 22;
      const appTarget = (seg.slope ?? 8) * DEG;
      part = PART.approach;
      for (let d = STEP; d <= approach + 1e-6; d += STEP) {
        pitch = p0 + (appTarget - p0) * smoothstep(d / 20);
        advance(STEP);
      }
      const sRamp = s;
      const pr = pitch;
      const th = -design.rampAngle * DEG;
      part = PART.ramp;
      for (let d = STEP; d <= rampLen + 1e-6; d += STEP) {
        pitch = pr + (th - pr) * smoothstep(d / (rampLen - 6));
        advance(STEP);
      }
      const sLip = s;
      const lip = { x, y, z };
      const fx = -Math.sin(heading), fz = -Math.cos(heading);
      // Línea central del hueco: parábola que sale con el ángulo de la rampa y llega al borde del aterrizaje
      const tanT = Math.tan(design.rampAngle * DEG);
      const kk = (seg.gap * tanT + design.drop) / (seg.gap * seg.gap);
      part = PART.gap;
      const nG = Math.ceil(seg.gap / STEP);
      for (let j = 1; j <= nG; j++) {
        const hx = (j / nG) * seg.gap;
        const nx = lip.x + fx * hx, nz = lip.z + fz * hx, ny = lip.y + hx * tanT - kk * hx * hx;
        const d = Math.hypot(nx - x, ny - y, nz - z);
        x = nx; y = ny; z = nz; s += d;
        push();
      }
      const sGapEnd = s;
      // Aterrizaje: perfil curvo calculado por designJump (un pitch por paso de 0.5 m)
      part = PART.land;
      for (const ph of design.landPitches) {
        pitch = ph * DEG;
        advance(design.landStep);
      }
      jumps.push({
        seg: idx, design, sApproach: s0, sRamp, sLip, sGapEnd, sLandEnd: s,
        padS: sRamp - 14, lip, fwd: { x: fx, z: fz },
      });
    }
    segments.push({ type: seg.type, s0, s1: s, def: seg, index: idx });
  });
  const sFinish = s;
  // Recta de frenado después de la meta
  segIdx = def.segments.length - 1;
  part = PART.runout;
  const pr = pitch;
  for (let d = STEP; d <= RUNOUT; d += STEP) {
    pitch = pr + (1 * DEG - pr) * smoothstep(d / 20);
    advance(STEP);
  }

  return resample(def, raw, segments, jumps, sFinish);
}

function resample(def, raw, segments, jumps, sFinish) {
  const nFinish = Math.round(sFinish) + 1; // índice del frame de meta = nFinish-1
  const ds = sFinish / (nFinish - 1);
  const sTotal = raw[raw.length - 1].s;
  const N = Math.floor(sTotal / ds) + 1;
  const f = {
    N, finishIndex: nFinish - 1, ds, length: sFinish,
    px: new Float32Array(N), py: new Float32Array(N), pz: new Float32Array(N),
    tx: new Float32Array(N), ty: new Float32Array(N), tz: new Float32Array(N),
    rx: new Float32Array(N), rz: new Float32Array(N),
    ux: new Float32Array(N), uy: new Float32Array(N), uz: new Float32Array(N),
    hw: new Float32Array(N), type: new Uint8Array(N), ground: new Uint8Array(N),
    ceil: new Float32Array(N), part: new Uint8Array(N), seg: new Int16Array(N),
    curv: new Float32Array(N), s: new Float32Array(N),
    segments, jumps,
  };
  let k = 0;
  for (let i = 0; i < N; i++) {
    const si = i * ds;
    while (k < raw.length - 2 && raw[k + 1].s < si) k++;
    const a = raw[k], b = raw[k + 1];
    const u = b.s > a.s ? Math.min(1, Math.max(0, (si - a.s) / (b.s - a.s))) : 0;
    f.px[i] = a.x + (b.x - a.x) * u;
    f.py[i] = a.y + (b.y - a.y) * u;
    f.pz[i] = a.z + (b.z - a.z) * u;
    f.s[i] = si;
    const src = u < 0.5 ? a : b;
    f.seg[i] = src.seg;
    f.part[i] = src.part;
  }
  // Tipo, suelo y techo según el tramo
  for (let i = 0; i < N; i++) {
    const seg = def.segments[f.seg[i]];
    f.type[i] = SEGMENT_TYPES.indexOf(seg.type);
    f.ground[i] = 1;
    f.ceil[i] = seg.type === 'cave' ? (seg.ceiling ?? 8.5) : NaN;
  }
  // Sin suelo estrictamente dentro del hueco (el labio y el borde del aterrizaje sí tienen)
  for (const j of jumps) {
    for (let i = 0; i < N; i++) {
      if (f.s[i] > j.sLip + 0.01 && f.s[i] < j.sGapEnd - 0.01) f.ground[i] = 0;
    }
  }
  // Ancho: erosión (mínimo en ±9 m) y luego suavizado para que el estrechamiento empiece antes
  const target = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const seg = def.segments[f.seg[i]];
    target[i] = seg.halfWidth ?? DEFAULT_HW[seg.type];
  }
  const eroded = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let m = Infinity;
    for (let j = Math.max(0, i - 9); j <= Math.min(N - 1, i + 9); j++) m = Math.min(m, target[j]);
    eroded[i] = m;
  }
  for (let i = 0; i < N; i++) {
    let sum = 0, c = 0;
    for (let j = Math.max(0, i - 7); j <= Math.min(N - 1, i + 7); j++) { sum += eroded[j]; c++; }
    f.hw[i] = sum / c;
  }
  // Tangente, derecha (horizontal) y normal de la superficie
  for (let i = 0; i < N; i++) {
    const a = Math.max(0, i - 1), b = Math.min(N - 1, i + 1);
    let tx = f.px[b] - f.px[a], ty = f.py[b] - f.py[a], tz = f.pz[b] - f.pz[a];
    const l = Math.hypot(tx, ty, tz) || 1;
    tx /= l; ty /= l; tz /= l;
    f.tx[i] = tx; f.ty[i] = ty; f.tz[i] = tz;
    // right = tangent × (0,1,0) = (-tz, 0, tx)
    const rl = Math.hypot(tz, tx) || 1;
    const rx = -tz / rl, rz = tx / rl;
    f.rx[i] = rx; f.rz[i] = rz;
    // up = right × tangent
    f.ux[i] = 0 * tz - rz * ty;
    f.uy[i] = rz * tx - rx * tz;
    f.uz[i] = rx * ty - 0 * tx;
  }
  // Curvatura horizontal con signo (+ = curva a la derecha), suavizada
  const raw2 = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const a = Math.max(0, i - 2), b = Math.min(N - 1, i + 2);
    const ha = Math.atan2(-f.tx[a], -f.tz[a]), hb = Math.atan2(-f.tx[b], -f.tz[b]);
    let d = hb - ha;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    raw2[i] = -d / ((b - a) * ds || 1);
  }
  for (let i = 0; i < N; i++) {
    let sum = 0, c = 0;
    for (let j = Math.max(0, i - 4); j <= Math.min(N - 1, i + 4); j++) { sum += raw2[j]; c++; }
    f.curv[i] = sum / c;
  }
  // Índices de frame de cada tramo y salto
  const idx = (sv) => Math.min(N - 1, Math.max(0, Math.round(sv / ds)));
  for (const sg of segments) { sg.i0 = idx(sg.s0); sg.i1 = idx(sg.s1); }
  for (const j of jumps) {
    j.iApproach = idx(j.sApproach); j.iRamp = idx(j.sRamp); j.iLip = Math.floor(j.sLip / ds);
    j.iGapEnd = Math.ceil(j.sGapEnd / ds); j.iLandEnd = idx(j.sLandEnd);
  }
  return f;
}
