// Iluminación horneada en vertex colors: interior oscuro de las cuevas con charcos de luz de los faroles.
// Evita poner decenas de PointLights (caras para todos los materiales de la escena).
import * as THREE from 'three';
import { THEMES } from './themes.js';

const T_CAVE = 2;

export function createLighting(f, theme) {
  const pal = THEMES[theme];
  const dark = pal.tunnelDark;
  // Factor de cueva por frame (0 fuera, 1 dentro) con transición de ~10 m en las bocas
  const cave = new Float32Array(f.N);
  for (let i = 0; i < f.N; i++) cave[i] = f.type[i] === T_CAVE ? 1 : 0;
  const cf = new Float32Array(f.N);
  for (let i = 0; i < f.N; i++) {
    let s = 0, c = 0;
    for (let j = Math.max(0, i - 6); j <= Math.min(f.N - 1, i + 6); j++) { s += cave[j]; c++; }
    cf[i] = s / c;
  }
  // Faroles: cada ~16 m alternando lado, en las paredes de cada cueva
  const lanterns = [];
  const col = new THREE.Color(pal.lanternColor);
  for (const sg of f.segments) {
    if (sg.type !== 'cave') continue;
    let side = 1;
    for (let i = sg.i0 + 6; i < sg.i1 - 4; i += Math.round(16 / f.ds)) {
      const lat = side * (f.hw[i] + 0.25);
      lanterns.push({ i, side, x: f.px[i] + f.rx[i] * lat, y: f.py[i] + 3.2, z: f.pz[i] + f.rz[i] * lat });
      side = -side;
    }
  }
  const byFrame = lanterns.map((l) => l.i);

  /** Color de vértice para el frame i en (x,y,z). out = [r,g,b] */
  function shade(i, x, y, z, out) {
    const k = cf[i];
    if (k <= 0) { out[0] = out[1] = out[2] = 1; return out; }
    let r = 0, g = 0, b = 0;
    // faroles cercanos (búsqueda lineal acotada: son pocos)
    for (let n = 0; n < lanterns.length; n++) {
      if (Math.abs(byFrame[n] - i) > 16) continue;
      const L = lanterns[n];
      const d = Math.hypot(L.x - x, L.y - y, L.z - z);
      const a = Math.max(0, 1 - d / 11);
      const w = a * a * 1.6;
      r += col.r * w; g += col.g * w; b += col.b * w;
    }
    const base = 1 - k * (1 - dark);
    out[0] = Math.min(1.3, base + k * r);
    out[1] = Math.min(1.3, base + k * g);
    out[2] = Math.min(1.3, base + k * b);
    return out;
  }
  return { caveFactor: cf, lanterns, shade };
}
