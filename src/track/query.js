// sample(t) y closestT(pos, hintT) sobre la tabla de frames precalculada (sin getPointAt en caliente).
import * as THREE from 'three';
import { SEGMENT_TYPES } from './path.js';

export function createQueries(f) {
  const last = f.finishIndex; // t = 1 en la meta

  /**
   * @param {number} t
   * @param {object} [out] TrackSample a rellenar (evita crear objetos en el loop caliente)
   */
  function sample(t, out) {
    const ft = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0)) * last;
    const i = Math.min(last - 1, Math.floor(ft));
    const a = ft - i, j = i + 1;
    const o = out ?? {
      position: new THREE.Vector3(), tangent: new THREE.Vector3(),
      right: new THREE.Vector3(), up: new THREE.Vector3(),
    };
    o.position.set(
      f.px[i] + (f.px[j] - f.px[i]) * a,
      f.py[i] + (f.py[j] - f.py[i]) * a,
      f.pz[i] + (f.pz[j] - f.pz[i]) * a,
    );
    o.tangent.set(
      f.tx[i] + (f.tx[j] - f.tx[i]) * a,
      f.ty[i] + (f.ty[j] - f.ty[i]) * a,
      f.tz[i] + (f.tz[j] - f.tz[i]) * a,
    ).normalize();
    o.right.set(f.rx[i] + (f.rx[j] - f.rx[i]) * a, 0, f.rz[i] + (f.rz[j] - f.rz[i]) * a).normalize();
    o.up.crossVectors(o.right, o.tangent).normalize();
    o.halfWidth = f.hw[i] + (f.hw[j] - f.hw[i]) * a;
    const n = a < 0.5 ? i : j;
    o.segmentType = SEGMENT_TYPES[f.type[n]];
    o.hasGround = !!f.ground[n];
    const ci = f.ceil[i], cj = f.ceil[j];
    o.ceilingHeight = Number.isNaN(ci) && Number.isNaN(cj) ? null
      : Number.isNaN(ci) ? cj : Number.isNaN(cj) ? ci : ci + (cj - ci) * a;
    return o;
  }

  const d2 = (i, x, y, z) => {
    const dx = f.px[i] - x, dy = f.py[i] - y, dz = f.pz[i] - z;
    return dx * dx + dy * dy + dz * dz;
  };

  // Proyección sobre los segmentos vecinos del mejor frame → t continuo
  function refine(best, x, y, z) {
    let bestT = best, bestD = d2(best, x, y, z);
    for (const k of [best - 1, best]) {
      if (k < 0 || k + 1 >= f.N) continue;
      const ax = f.px[k], ay = f.py[k], az = f.pz[k];
      const bx = f.px[k + 1] - ax, by = f.py[k + 1] - ay, bz = f.pz[k + 1] - az;
      const len2 = bx * bx + by * by + bz * bz || 1;
      const u = Math.min(1, Math.max(0, ((x - ax) * bx + (y - ay) * by + (z - az) * bz) / len2));
      const px = ax + bx * u - x, py = ay + by * u - y, pz = az + bz * u - z;
      const dd = px * px + py * py + pz * pz;
      if (dd < bestD) { bestD = dd; bestT = k + u; }
    }
    return Math.min(1, Math.max(0, bestT / last));
  }

  function globalSearch(x, y, z) {
    let best = 0, bestD = Infinity;
    for (let i = 0; i < f.N; i += 4) {
      const d = d2(i, x, y, z);
      if (d < bestD) { bestD = d; best = i; }
    }
    for (let i = Math.max(0, best - 5); i <= Math.min(f.N - 1, best + 5); i++) {
      const d = d2(i, x, y, z);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  /** t más cercano a pos; busca en ±60 m alrededor de hintT y cae a búsqueda global si está lejos. */
  function closestT(pos, hintT) {
    const x = pos.x, y = pos.y, z = pos.z;
    let best;
    if (hintT != null && Number.isFinite(hintT)) {
      const h = Math.round(Math.min(1, Math.max(0, hintT)) * last);
      const lo = Math.max(0, h - 60), hi = Math.min(f.N - 1, h + 60);
      let bestD = Infinity;
      best = h;
      for (let i = lo; i <= hi; i++) {
        const d = d2(i, x, y, z);
        if (d < bestD) { bestD = d; best = i; }
      }
      // Si quedó en el borde de la ventana o muy lejos, se perdió: búsqueda global
      if (((best === lo && lo > 0) || (best === hi && hi < f.N - 1)) || bestD > 45 * 45) best = globalSearch(x, y, z);
    } else {
      best = globalSearch(x, y, z);
    }
    return refine(best, x, y, z);
  }

  return { sample, closestT };
}
