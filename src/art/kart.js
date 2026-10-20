// Chasis caricaturesco del kart: carrocería, ruedas gordas, volante y escape.
// Ejes: el kart mira hacia -Z, X a la derecha, Y arriba; origen en el suelo.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Builder, shade } from './builder.js';

export const KART = {
  frontWheel: { r: 0.36, w: 0.3, x: 0.71, z: -0.86 },
  rearWheel: { r: 0.43, w: 0.38, x: 0.72, z: 0.84 },
  seatZ: 0.3,
  steer: { y: 1.02, z: -0.42 },        // centro del volante
  exhaust: [[-0.26, 0.74, 1.42], [0.26, 0.74, 1.42]],
};

const TIRE = 0x2b2d3a;
const TRIM = 0x3a3f4f;
const CHROME = 0xd9dde6;

const rbox = (w, h, d, r = 0.1, seg = 1) => r <= 0.04 ? new THREE.BoxGeometry(w, h, d) : new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));

/** Carrocería del kart (estática respecto al nodo "body"). */
export function buildChassis(b, kartColor, accent) {
  const K = kartColor;
  const Kd = shade(K, -0.14);
  const Kl = shade(K, 0.12);
  // bandeja inferior
  b.add(rbox(1.2, 0.2, 2.45, 0.08), TRIM, { p: [0, 0.34, 0.02] });
  // tina principal
  b.add(rbox(1.12, 0.46, 1.55, 0.2), K, { p: [0, 0.62, 0.15], mat: 'gloss' });
  // borde de la cabina (aro) para que el piloto parezca sentado dentro
  b.add(new THREE.TorusGeometry(0.42, 0.075, 5, 14), Kd, { p: [0, 0.86, KART.seatZ - 0.02], r: [Math.PI / 2, 0, 0], s: [1.25, 1.45, 1], mat: 'gloss' });
  // nariz inclinada hacia abajo al frente
  const NT = -0.16;
  const nose = (y, z) => [0.56 + y * Math.cos(NT) - z * Math.sin(NT), -0.86 + y * Math.sin(NT) + z * Math.cos(NT)];
  b.add(rbox(0.98, 0.36, 1.0, 0.16), K, { p: [0, 0.56, -0.86], r: [NT, 0, 0], mat: 'gloss' });
  // franjas de carreras
  for (const sx of [-1, 1]) {
    const [y, z] = nose(0.18, 0.02);
    b.add(rbox(0.12, 0.04, 0.96, 0.02), accent, { p: [sx * 0.24, y, z], r: [NT, 0, 0], mat: 'gloss' });
  }
  // insignia redonda con número
  {
    const [y, z] = nose(0.185, -0.2);
    b.add(new THREE.CylinderGeometry(0.17, 0.17, 0.04, 12), 0xffffff, { p: [0, y, z], r: [NT, 0, 0], mat: 'gloss' });
    const [y2, z2] = nose(0.2, -0.2);
    b.add(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 10), accent, { p: [0, y2, z2], r: [NT, 0, 0], mat: 'gloss' });
  }
  // parachoques delantero
  b.add(new THREE.CapsuleGeometry(0.1, 1.05, 2, 6), TRIM, { p: [0, 0.36, -1.36], r: [0, 0, Math.PI / 2] });
  // faros
  for (const sx of [-1, 1]) b.add(new THREE.SphereGeometry(0.075, 7, 5), 0xfff4b0, { p: [sx * 0.33, 0.58, -1.36], mat: 'glow' });
  // pontones laterales entre ruedas
  for (const sx of [-1, 1]) {
    b.add(rbox(0.28, 0.3, 0.95, 0.12), Kd, { p: [sx * 0.66, 0.5, 0.0], mat: 'gloss' });
    b.add(rbox(0.06, 0.08, 0.7, 0.03), Kl, { p: [sx * 0.8, 0.6, 0.0], mat: 'gloss' });
  }
  // guardabarros delanteros (arcos)
  for (const sx of [-1, 1]) {
    b.add(new THREE.TorusGeometry(0.44, 0.06, 4, 8, Math.PI * 0.9), Kd, {
      p: [sx * KART.frontWheel.x, KART.frontWheel.r, KART.frontWheel.z], r: [0, Math.PI / 2, 0.15], mat: 'gloss',
    });
  }
  // respaldo del asiento
  b.add(rbox(0.82, 0.62, 0.16, 0.07), TRIM, { p: [0, 1.02, KART.seatZ + 0.42], r: [-0.18, 0, 0] });
  b.add(rbox(0.6, 0.38, 0.06, 0.03), accent, { p: [0, 1.08, KART.seatZ + 0.33], r: [-0.18, 0, 0] });
  // motor trasero
  b.add(rbox(0.86, 0.36, 0.5, 0.08), 0x4a4f5e, { p: [0, 0.72, 1.08], mat: 'metal' });
  for (let i = 0; i < 3; i++) b.add(rbox(0.9, 0.04, 0.05, 0.015), CHROME, { p: [0, 0.82 - i * 0.08, 1.34], mat: 'metal' });
  // tubos de escape
  for (const [x, y, z] of KART.exhaust) {
    b.add(new THREE.CylinderGeometry(0.085, 0.07, 0.42, 7), CHROME, { p: [x, y, z - 0.18], r: [Math.PI / 2, 0, 0], mat: 'metal' });
    b.add(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 7), 0x15161c, { p: [x, y, z + 0.035], r: [Math.PI / 2, 0, 0] });
  }
  // columna de dirección
  b.limb([0, 0.7, -0.78], [0, KART.steer.y - 0.04, KART.steer.z + 0.04], 0.045, TRIM, { cyl: true });
}

/** Volante (nodo propio para girarlo). Centrado en el origen, mirando al piloto. */
export function buildSteeringWheel(b) {
  b.add(new THREE.TorusGeometry(0.19, 0.04, 5, 12), 0x22242e);
  b.add(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 7), 0xe9ecef, { r: [Math.PI / 2, 0, 0] });
  b.add(new THREE.BoxGeometry(0.36, 0.035, 0.03), 0x22242e);
  b.add(new THREE.BoxGeometry(0.035, 0.18, 0.03), 0x22242e, { p: [0, -0.09, 0] });
}

/** Rueda centrada en el origen con eje en X. */
export function buildWheel(b, r, w, hubColor) {
  // neumático con bandas de rodadura (facetado para que se note el giro)
  b.add(new THREE.CylinderGeometry(r, r, w, 10, 1), TIRE, { r: [0, 0, Math.PI / 2], mat: 'flat' });
  b.add(new THREE.TorusGeometry(r - 0.02, 0.05, 4, 10), shade(TIRE, 0.05), { p: [w / 2 - 0.02, 0, 0], r: [0, Math.PI / 2, 0], mat: 'flat' });
  b.add(new THREE.TorusGeometry(r - 0.02, 0.05, 4, 10), shade(TIRE, 0.05), { p: [-w / 2 + 0.02, 0, 0], r: [0, Math.PI / 2, 0], mat: 'flat' });
  // tacos
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    b.add(new THREE.BoxGeometry(w * 0.7, 0.07, 0.12), TIRE, {
      p: [0, Math.cos(a) * r, Math.sin(a) * r], r: [a, 0, 0], mat: 'flat',
    });
  }
  // rines a ambos lados con cruz para ver el giro
  for (const sx of [-1, 1]) {
    b.add(new THREE.CylinderGeometry(r * 0.55, r * 0.55, 0.04, 10), hubColor, { p: [sx * (w / 2 + 0.005), 0, 0], r: [0, 0, Math.PI / 2], mat: 'gloss' });
    b.add(new THREE.CylinderGeometry(r * 0.16, r * 0.16, 0.06, 6), CHROME, { p: [sx * (w / 2 + 0.02), 0, 0], r: [0, 0, Math.PI / 2], mat: 'metal' });
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      b.add(new THREE.BoxGeometry(0.03, r * 0.95, 0.07), shade(hubColor, -0.25), {
        p: [sx * (w / 2 + 0.02), 0, 0], r: [a, 0, 0], mat: 'gloss',
      });
    }
  }
}

/** Geometrías de rueda cacheadas por (radio, ancho, color de rin). */
const wheelCache = new Map();
export function wheelGeometries(r, w, hubColor) {
  const key = `${r}|${w}|${hubColor}`;
  if (!wheelCache.has(key)) {
    const b = new Builder();
    buildWheel(b, r, w, hubColor);
    wheelCache.set(key, b.geometries());
  }
  return wheelCache.get(key);
}
