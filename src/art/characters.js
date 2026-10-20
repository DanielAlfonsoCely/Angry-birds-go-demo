// Los 6 pilotos originales. Cada uno se describe con funciones que llenan Builders:
// torso (con brazos), cabeza, ojos (nodo propio para parpadear), cola (nodo propio) y extras del kart.
// Espacios: torso en coordenadas del nodo "driver" (origen en el asiento), cabeza centrada en su origen,
// ojos relativos a `eyesPos` dentro de la cabeza, cola relativa a `tailPos` dentro del driver.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { shade } from './builder.js';
import { KART } from './kart.js';

export const DRIVER_ORIGIN = [0, 0.7, KART.seatZ];
const HEAD_POS = [0, 0.98, -0.02];
const SHOULDER = [0.3, 0.46, 0.0];
const HAND = [0.17, KART.steer.y - DRIVER_ORIGIN[1] + 0.02, KART.steer.z - KART.seatZ + 0.03];

const WHITE = 0xffffff;
const INK = 0x1d1b26;
const PINK = 0xff8fab;
const CREAM = 0xfff1d6;

const sph = (r, w = 18, h = 14) => new THREE.SphereGeometry(r, w, h);
const cone = (r, h, s = 10) => new THREE.ConeGeometry(r, h, s);
const rbox = (w, h, d, r) => new RoundedBoxGeometry(w, h, d, 3, r);

// ---------- piezas comunes ----------
/** Ojos grandes: esclerótica + pupila + brillo (+ párpado superior opcional). */
function eyes(b, { spread, r, y = 0, z = 0, lid = null, out = 0.12, pupil = 0.52 }) {
  for (const sx of [-1, 1]) {
    const ex = sx * spread;
    const dir = new THREE.Vector3(sx * Math.sin(out) * 0.6, 0.02, -1).normalize();
    b.add(sph(r, 20, 16), WHITE, { p: [ex, y, z] });
    const pc = new THREE.Vector3(ex, y, z).addScaledVector(dir, r * 0.8);
    pc.x -= sx * r * 0.08; // pupilas un poco hacia el centro: mirada concentrada
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);
    b.add(sph(r * pupil, 16, 12), INK, { p: pc.toArray(), q, s: [1, 1.08, 0.5] });
    // brillo (mismo lado para ambos ojos, como una luz arriba a la derecha)
    b.add(sph(r * 0.17, 10, 8), WHITE, { p: [pc.x + r * 0.2, pc.y + r * 0.24, pc.z - r * 0.24], mat: 'glow' });
    b.add(sph(r * 0.08, 8, 6), WHITE, { p: [pc.x - r * 0.16, pc.y - r * 0.2, pc.z - r * 0.22], mat: 'glow' });
    if (lid != null) {
      // párpado superior del color de la piel (da expresión de "concentrado")
      const lidGeo = new THREE.SphereGeometry(r * 1.06, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.36);
      b.add(lidGeo, lid, { p: [ex, y, z], r: [-0.55, 0, sx * -0.18] });
    }
  }
}

/** Ceja inclinada (decidida). */
function brows(b, { spread, y, z, len = 0.16, thick = 0.035, color = INK, tilt = 0.3 }) {
  for (const sx of [-1, 1]) {
    b.add(new THREE.CapsuleGeometry(thick, len, 4, 8), color, { p: [sx * spread, y, z], r: [0.25, 0, Math.PI / 2 + sx * tilt] });
  }
}

/** Sonrisa: arco de toro mirando al frente (-Z). */
function smile(b, { r, tube = 0.025, y, z, color = 0x5a1f2b, arc = Math.PI * 0.8, sx = 1 }) {
  const g = new THREE.TorusGeometry(r, tube, 6, 16, arc);
  b.add(g, color, { p: [0, y, z], r: [0.15, 0, Math.PI + (Math.PI - arc) / 2], s: [sx, 1, 1] });
}

function blush(b, { spread, y, z, r = 0.07, yaw = 0.5 }) {
  for (const sx of [-1, 1]) b.add(sph(r, 12, 8), PINK, { p: [sx * spread, y, z], r: [0, sx * yaw, 0], s: [1, 0.6, 0.35] });
}

/** Torso + brazos + manos agarrando el volante. */
function torso(b, fur, belly, { scale = 1, hand = fur, handFn = null, armR = 0.085 } = {}) {
  b.add(sph(0.34, 18, 14), fur, { p: [0, 0.28, 0.02], s: [1.08 * scale, 1.12, 0.95 * scale] });
  b.add(sph(0.27, 16, 12), belly, { p: [0, 0.27, -0.1], s: [0.95 * scale, 1.05, 0.7] });
  for (const sx of [-1, 1]) {
    const sh = [sx * SHOULDER[0] * scale, SHOULDER[1], SHOULDER[2]];
    const el = [sx * 0.34 * scale, 0.36, -0.36];
    const hd = [sx * HAND[0], HAND[1], HAND[2]];
    b.limb(sh, el, armR, fur);
    b.limb(el, hd, armR * 0.92, fur);
    if (handFn) handFn(b, hd, sx);
    else b.add(sph(0.105, 14, 10), hand, { p: hd });
  }
}

/** Cola como cadena de esferas a lo largo de una curva suave. */
function tailChain(b, pts, r0, r1, colorFn, n = 14) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const p = curve.getPoint(t);
    // radio con panza en el medio (colas esponjosas)
    const r = typeof r0 === 'function' ? r0(t) : THREE.MathUtils.lerp(r0, r1, t);
    b.add(sph(r, 12, 10), colorFn(t, i), { p: p.toArray() });
  }
}

function pawFingers(color, n = 3, tipColor = color, size = 0.045) {
  return (b, hd, sx) => {
    b.add(sph(0.1, 14, 10), color, { p: hd, s: [1.05, 0.9, 1] });
    for (let k = 0; k < n; k++) {
      const a = (k - (n - 1) / 2) * 0.45;
      b.add(sph(size, 8, 6), tipColor, { p: [hd[0] + Math.sin(a) * 0.09, hd[1] + 0.06, hd[2] - Math.cos(a) * 0.07] });
    }
    void sx;
  };
}

// ---------- extras del kart ----------
function wingSpoiler(b, wingColor, plateColor, { y = 1.32, z = 1.22, w = 1.32 } = {}) {
  for (const sx of [-1, 1]) b.limb([sx * 0.3, 0.86, z - 0.08], [sx * 0.3, y - 0.02, z], 0.04, 0x3a3f4f, { cyl: true });
  b.add(rbox(w, 0.07, 0.4, 0.03), wingColor, { p: [0, y, z], r: [-0.12, 0, 0], mat: 'gloss' });
  for (const sx of [-1, 1]) b.add(rbox(0.05, 0.3, 0.46, 0.02), plateColor, { p: [sx * w / 2, y + 0.04, z], mat: 'gloss' });
}

// =================================================================================
export const CHARACTER_DEFS = {
  // ------------------------------------------------------------- Tuko, geco crestado
  tuko: {
    accent: 0x6bbf1f,
    hub: 0x6bbf1f,
    eyesPos: [0, 0.1, -0.24],
    tailPos: [0, 0.18, 0.3],
    head(b, fur) {
      const dark = shade(fur, -0.18);
      b.add(sph(0.44, 22, 16), fur, { s: [1.22, 0.84, 1.08] });
      // mandíbula/hocico ancho y claro
      b.add(sph(0.36, 20, 12), 0xe9f7a8, { p: [0, -0.13, -0.12], s: [1.25, 0.55, 1.08] });
      smile(b, { r: 0.24, tube: 0.026, y: -0.06, z: -0.46, arc: Math.PI * 0.75 });
      // lengua juguetona (el poder es un lengüetazo)
      b.limb([0.1, -0.2, -0.46], [0.2, -0.33, -0.5], 0.05, 0xff5d8f);
      b.add(sph(0.065, 10, 8), 0xff5d8f, { p: [0.21, -0.35, -0.5], s: [1.2, 0.8, 1] });
      // fosas nasales
      for (const sx of [-1, 1]) b.add(sph(0.022, 6, 6), dark, { p: [sx * 0.07, 0.02, -0.46] });
      // cresta de púas suaves naranjas
      for (let i = 0; i < 5; i++) {
        const z = -0.22 + i * 0.13;
        const h = 0.2 - i * 0.025;
        b.add(cone(0.06, h, 6), 0xffa62b, { p: [0, 0.34 - i * 0.025 + h / 2 - 0.02, z], r: [0.35, 0, 0] });
      }
      // manchas
      for (const [x, y, z, r] of [[0.33, 0.16, 0.05, 0.06], [-0.36, 0.12, 0.12, 0.05], [0.2, 0.26, 0.25, 0.045], [-0.18, 0.28, 0.2, 0.05]]) {
        b.add(sph(r, 10, 8), dark, { p: [x, y, z], s: [1, 0.5, 1] });
      }
      blush(b, { spread: 0.36, y: -0.06, z: -0.3, r: 0.07 });
    },
    eyes(b) {
      eyes(b, { spread: 0.25, r: 0.17, out: 0.35, pupil: 0.55 });
    },
    browsFn(b) { brows(b, { spread: 0.25, y: 0.27, z: -0.33, len: 0.14, thick: 0.03, color: shade(0x9be33a, -0.3), tilt: 0.25 }); },
    torso(b, fur) {
      torso(b, fur, 0xe9f7a8, { handFn: pawFingers(fur, 3, 0xd4f27a, 0.05) });
      for (const [x, y, z] of [[0.2, 0.42, 0.25], [-0.18, 0.3, 0.3], [0.05, 0.5, 0.3]]) b.add(sph(0.05, 8, 6), shade(fur, -0.18), { p: [x, y, z], s: [1, 1, 0.5] });
      for (let i = 0; i < 3; i++) b.add(cone(0.05, 0.14, 6), 0xffa62b, { p: [0, 0.58 - i * 0.12, 0.26 + i * 0.06], r: [0.9 + i * 0.25, 0, 0] });
    },
    tail(b, fur) {
      const dark = shade(fur, -0.15);
      tailChain(b, [[0, 0, 0], [0.05, 0.25, 0.28], [0.15, 0.3, 0.62], [0.3, 0.12, 0.85], [0.42, 0.18, 1.0], [0.38, 0.32, 0.95]],
        (t) => 0.13 * (1 - t) + 0.035, 0, (t, i) => (i % 3 === 1 ? dark : fur), 18);
    },
    kart(b, ch) {
      wingSpoiler(b, 0x6bbf1f, ch.kartColor);
    },
  },

  // ------------------------------------------------------------- Mora, topo minera
  mora: {
    accent: 0x8e5cc4,
    hub: 0x8e5cc4,
    eyesPos: [0, 0.04, -0.3],
    tailPos: [0, 0.1, 0.32],
    head(b, fur) {
      b.add(sph(0.43, 22, 16), fur, { s: [1.05, 0.96, 1.02] });
      // hocico alargado lila
      b.add(sph(0.22, 16, 12), 0xc9a9ec, { p: [0, -0.13, -0.38], s: [1.05, 0.82, 1.15] });
      // nariz-estrella rosa
      b.add(sph(0.1, 14, 10), 0xff7aa8, { p: [0, -0.09, -0.62] });
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        b.add(sph(0.04, 8, 6), 0xff9cc0, { p: [Math.cos(a) * 0.115, -0.09 + Math.sin(a) * 0.1, -0.6] });
      }
      // dientes de conejo
      for (const sx of [-1, 1]) b.add(rbox(0.06, 0.08, 0.04, 0.015), WHITE, { p: [sx * 0.035, -0.29, -0.5] });
      smile(b, { r: 0.1, tube: 0.02, y: -0.22, z: -0.5, arc: Math.PI * 0.7 });
      blush(b, { spread: 0.3, y: -0.12, z: -0.32, r: 0.065 });
      // casco de minera
      b.add(new THREE.SphereGeometry(0.47, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0xffc93c, { p: [0, 0.12, 0.02], s: [1.02, 0.85, 1.02], mat: 'gloss' });
      b.add(new THREE.CylinderGeometry(0.55, 0.56, 0.05, 24), 0xf2b21b, { p: [0, 0.13, 0.0], mat: 'gloss' });
      b.add(rbox(0.06, 0.08, 0.7, 0.02), 0xf2b21b, { p: [0, 0.52, 0.04], mat: 'gloss' });
      // linterna del casco
      b.add(new THREE.CylinderGeometry(0.1, 0.12, 0.12, 14), 0x4a4f5e, { p: [0, 0.32, -0.42], r: [Math.PI / 2 - 0.4, 0, 0], mat: 'metal' });
      b.add(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 14), 0xfff3a6, { p: [0, 0.3, -0.48], r: [Math.PI / 2 - 0.4, 0, 0], mat: 'glow' });
      // gafas redondas
      for (const sx of [-1, 1]) {
        b.add(new THREE.TorusGeometry(0.15, 0.022, 8, 22), 0x9c6b1e, { p: [sx * 0.17, 0.04, -0.47], r: [0, sx * 0.25, 0], mat: 'metal' });
      }
      b.add(new THREE.TorusGeometry(0.05, 0.015, 6, 10, Math.PI), 0x9c6b1e, { p: [0, 0.07, -0.5], mat: 'metal' });
    },
    eyes(b) {
      eyes(b, { spread: 0.17, r: 0.135, out: 0.2 });
    },
    browsFn() {},
    torso(b, fur) {
      torso(b, fur, 0xc9a9ec, { handFn: (bb, hd) => {
        bb.add(sph(0.12, 14, 10), 0xff9cc0, { p: hd, s: [1.15, 0.85, 1] });
        for (let k = -1; k <= 1; k++) bb.add(cone(0.03, 0.12, 6), CREAM, { p: [hd[0] + k * 0.06, hd[1] + 0.04, hd[2] - 0.12], r: [-Math.PI / 2 + 0.3, 0, 0] });
      } });
      // tirantes de overol
      for (const sx of [-1, 1]) b.add(rbox(0.07, 0.42, 0.04, 0.015), 0x3d5a80, { p: [sx * 0.15, 0.36, -0.29], r: [0.3, 0, 0] });
    },
    tail(b) {
      b.add(sph(0.06, 8, 6), 0xff9cc0, { p: [0, 0, 0.05] });
    },
    kart(b) {
      // taladro delantero
      b.add(new THREE.CylinderGeometry(0.16, 0.2, 0.18, 12), 0x4a4f5e, { p: [0, 0.48, -1.5], r: [Math.PI / 2, 0, 0], mat: 'metal' });
      b.add(cone(0.18, 0.62, 12), 0xd9dde6, { p: [0, 0.48, -1.88], r: [-Math.PI / 2, 0, 0], mat: 'metal' });
      for (let i = 0; i < 4; i++) {
        const r = 0.17 - i * 0.04;
        b.add(new THREE.TorusGeometry(r, 0.022, 6, 14), 0xffc93c, { p: [0, 0.48, -1.66 - i * 0.12], r: [0.2, 0, 0], mat: 'metal' });
      }
      // linterna sobre el motor
      b.add(new THREE.CylinderGeometry(0.035, 0.035, 0.45, 8), 0x3a3f4f, { p: [0.3, 1.05, 1.15] });
      b.add(rbox(0.16, 0.2, 0.16, 0.04), 0xffc93c, { p: [0.3, 1.32, 1.15], mat: 'gloss' });
      b.add(sph(0.06, 10, 8), 0xfff3a6, { p: [0.3, 1.32, 1.06], mat: 'glow' });
    },
  },

  // ------------------------------------------------------------- Chispa, zorra veloz
  chispa: {
    accent: WHITE,
    hub: 0xffd166,
    eyesPos: [0, 0.07, -0.3],
    tailPos: [0, 0.16, 0.32],
    head(b, fur) {
      b.add(sph(0.42, 22, 16), fur, { s: [1.06, 0.96, 1.0] });
      // hocico puntiagudo
      b.add(cone(0.21, 0.44, 12), fur, { p: [0, -0.09, -0.5], r: [-Math.PI / 2, 0, 0], s: [1.15, 1, 0.85] });
      b.add(cone(0.17, 0.36, 12), CREAM, { p: [0, -0.15, -0.47], r: [-Math.PI / 2, 0, 0], s: [1.15, 1, 0.75] });
      b.add(sph(0.07, 12, 10), INK, { p: [0, -0.07, -0.72], s: [1.2, 0.9, 1] });
      smile(b, { r: 0.09, tube: 0.018, y: -0.22, z: -0.52, arc: Math.PI * 0.8 });
      // mejillas esponjosas
      for (const sx of [-1, 1]) {
        b.add(sph(0.18, 14, 10), CREAM, { p: [sx * 0.26, -0.16, -0.2], s: [1, 0.7, 0.85] });
        b.add(cone(0.1, 0.22, 6), CREAM, { p: [sx * 0.42, -0.2, -0.1], r: [0, 0, sx * 1.9] });
      }
      // orejas altas
      for (const sx of [-1, 1]) {
        const p = [sx * 0.22, 0.46, 0.02];
        b.add(cone(0.16, 0.44, 5), fur, { p, r: [0, 0, -sx * 0.32], s: [1, 1, 0.6] });
        b.add(cone(0.1, 0.3, 5), CREAM, { p: [p[0] - sx * 0.01, p[1] - 0.04, p[2] - 0.05], r: [0, 0, -sx * 0.32], s: [1, 1, 0.4] });
        b.add(cone(0.08, 0.16, 5), 0x2b1d14, { p: [sx * 0.29, 0.62, 0.02], r: [0, 0, -sx * 0.32], s: [1, 1, 0.65] });
      }
      // gafas de carreras en la frente
      b.add(new THREE.TorusGeometry(0.4, 0.035, 6, 28), 0x3a3f4f, { p: [0, 0.22, 0.02], r: [Math.PI / 2 + 0.35, 0, 0], s: [1.08, 1, 1] });
      for (const sx of [-1, 1]) {
        b.add(new THREE.TorusGeometry(0.1, 0.03, 8, 16), 0x3a3f4f, { p: [sx * 0.14, 0.32, -0.33], r: [-0.55, sx * 0.2, 0], mat: 'metal' });
        b.add(new THREE.CircleGeometry(0.09, 16), 0x7fd8ff, { p: [sx * 0.14, 0.32, -0.335], r: [-0.55 + Math.PI, sx * 0.2, 0], mat: 'gloss' });
      }
    },
    eyes(b) {
      eyes(b, { spread: 0.16, r: 0.14, out: 0.2 });
    },
    browsFn(b) { brows(b, { spread: 0.17, y: 0.2, z: -0.4, len: 0.11, thick: 0.03, color: 0x6b3510, tilt: 0.35 }); },
    torso(b, fur) {
      torso(b, fur, CREAM, { hand: 0x3a2618 });
      // pañuelo
      b.add(new THREE.TorusGeometry(0.2, 0.06, 8, 18), 0xffd166, { p: [0, 0.58, -0.02], r: [Math.PI / 2, 0, 0] });
    },
    tail(b, fur) {
      // cola esponjosa con punta blanca, se curva hacia arriba
      tailChain(b, [[0, 0, 0], [0.02, 0.18, 0.3], [0.1, 0.45, 0.55], [0.18, 0.78, 0.6], [0.2, 0.98, 0.45]],
        (t) => 0.12 + Math.sin(t * Math.PI) * 0.16 + (t > 0.85 ? -0.06 : 0), 0, (t) => (t > 0.78 ? CREAM : fur), 16);
    },
    kart(b, ch) {
      // aleta trasera y llamitas pintadas
      const fin = new THREE.Shape();
      fin.moveTo(0, 0); fin.lineTo(0.55, 0); fin.quadraticCurveTo(0.6, 0.45, 0.15, 0.7); fin.lineTo(0, 0);
      const finGeo = new THREE.ExtrudeGeometry(fin, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1 });
      b.add(finGeo, shade(ch.kartColor, -0.12), { p: [-0.04, 0.88, 0.9], r: [0, Math.PI / 2, 0], mat: 'gloss' });
      for (const sx of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          b.add(cone(0.07, 0.32 - i * 0.06, 3), i % 2 ? 0xffd166 : 0xff8c2b, {
            p: [sx * 0.81, 0.52 + (i - 1) * 0.07, -0.1 + i * 0.05], r: [Math.PI / 2 + 0.1, 0, sx * Math.PI / 2], s: [1, 1, 0.3], mat: 'gloss',
          });
        }
      }
    },
  },

  // ------------------------------------------------------------- Bruno, oso grandote
  bruno: {
    accent: 0xffd166,
    hub: 0xffd166,
    eyesPos: [0, 0.08, -0.31],
    tailPos: [0, 0.1, 0.36],
    head(b, fur) {
      b.add(sph(0.46, 22, 16), fur, { s: [1.08, 0.98, 1.0] });
      // hocico claro + nariz
      b.add(sph(0.22, 16, 12), 0xe0b98c, { p: [0, -0.15, -0.37], s: [1.2, 0.85, 0.95] });
      b.add(sph(0.085, 12, 10), INK, { p: [0, -0.06, -0.57], s: [1.35, 0.9, 1] });
      b.add(sph(0.02, 6, 6), WHITE, { p: [0.04, -0.03, -0.64], mat: 'glow' });
      smile(b, { r: 0.1, tube: 0.022, y: -0.2, z: -0.56, arc: Math.PI * 0.8 });
      // orejas redondas
      for (const sx of [-1, 1]) {
        b.add(sph(0.15, 14, 10), fur, { p: [sx * 0.34, 0.36, 0.02], s: [1, 1, 0.65] });
        b.add(sph(0.09, 12, 8), 0xe0b98c, { p: [sx * 0.34, 0.35, -0.05], s: [1, 1, 0.4] });
      }
      // mechón
      for (let i = -1; i <= 1; i++) b.add(sph(0.07, 10, 8), shade(fur, -0.05), { p: [i * 0.07, 0.45, -0.12 + Math.abs(i) * 0.03] });
      blush(b, { spread: 0.3, y: -0.1, z: -0.36, r: 0.06 });
    },
    eyes(b) {
      eyes(b, { spread: 0.17, r: 0.125, out: 0.18 });
    },
    browsFn(b) { brows(b, { spread: 0.18, y: 0.24, z: -0.41, len: 0.13, thick: 0.045, color: 0x4a2c12, tilt: 0.35 }); },
    torso(b, fur) {
      torso(b, fur, 0xe0b98c, { scale: 1.22, armR: 0.11, handFn: pawFingers(shade(fur, -0.05), 3, 0x4a2c12, 0.035) });
      // pañoleta roja
      b.add(new THREE.TorusGeometry(0.23, 0.07, 8, 18), 0xe63946, { p: [0, 0.6, -0.02], r: [Math.PI / 2, 0, 0] });
      b.add(cone(0.14, 0.22, 3), 0xe63946, { p: [0, 0.5, -0.27], r: [Math.PI + 0.4, 0, 0], s: [1, 1, 0.4] });
    },
    tail(b, fur) {
      b.add(sph(0.11, 10, 8), fur, { p: [0, -0.05, 0.02] });
    },
    kart(b) {
      // defensa de embestida con franjas de peligro
      b.add(rbox(1.5, 0.3, 0.22, 0.08), 0x3a3f4f, { p: [0, 0.5, -1.5], mat: 'metal' });
      for (let i = 0; i < 6; i++) {
        b.add(rbox(0.13, 0.31, 0.05, 0.02), i % 2 ? INK : 0xffd166, { p: [-0.62 + i * 0.25, 0.5, -1.615], r: [0, 0, 0.5], mat: 'gloss' });
      }
      for (const sx of [-1, 1]) b.limb([sx * 0.4, 0.45, -1.4], [sx * 0.35, 0.5, -1.15], 0.05, 0x3a3f4f, { cyl: true });
      // tronquito de troncos atrás (detalle de leñador)
      for (const sx of [-1, 1]) {
        b.add(new THREE.CylinderGeometry(0.13, 0.13, 0.6, 10), 0x8b5a2b, { p: [sx * 0.2, 1.05, 1.15], r: [0, 0, Math.PI / 2] });
        b.add(new THREE.CylinderGeometry(0.11, 0.11, 0.61, 10), 0xe0b98c, { p: [sx * 0.2, 1.05, 1.15], r: [0, 0, Math.PI / 2] });
      }
      b.add(new THREE.CylinderGeometry(0.13, 0.13, 0.6, 10), 0x8b5a2b, { p: [0, 1.25, 1.15], r: [0, 0, Math.PI / 2] });
      b.add(new THREE.CylinderGeometry(0.11, 0.11, 0.61, 10), 0xe0b98c, { p: [0, 1.25, 1.15], r: [0, 0, Math.PI / 2] });
    },
  },

  // ------------------------------------------------------------- Nilo, rana saltarina
  nilo: {
    accent: 0x3a86ff,
    hub: 0x3a86ff,
    eyesPos: [0, 0.27, -0.16],
    tailPos: [0, 0, 0.3],
    head(b, fur) {
      const belly = 0xfff1a8;
      b.add(sph(0.42, 22, 16), fur, { s: [1.32, 0.74, 1.08] });
      // mandíbula clara
      b.add(sph(0.4, 20, 12), belly, { p: [0, -0.1, -0.06], s: [1.22, 0.5, 1.05] });
      // bultos de los ojos encima de la cabeza
      for (const sx of [-1, 1]) b.add(sph(0.18, 16, 12), fur, { p: [sx * 0.24, 0.2, -0.12] });
      // sonrisota
      smile(b, { r: 0.36, tube: 0.026, y: 0.02, z: -0.38, arc: Math.PI * 0.62 });
      blush(b, { spread: 0.42, y: -0.04, z: -0.24, r: 0.08, yaw: 0.8 });
      // manchas
      for (const [x, y, z, r] of [[0.3, 0.18, 0.18, 0.06], [-0.28, 0.2, 0.22, 0.05], [0.0, 0.29, 0.1, 0.055], [-0.42, 0.06, 0.05, 0.045]]) {
        b.add(sph(r, 10, 8), 0x1f4fbf, { p: [x, y, z], s: [1, 0.45, 1] });
      }
      for (const sx of [-1, 1]) b.add(sph(0.02, 6, 6), 0x1f4fbf, { p: [sx * 0.06, 0.06, -0.44] });
    },
    eyes(b) {
      eyes(b, { spread: 0.24, r: 0.15, out: 0.3, lid: 0x3a86ff });
    },
    browsFn() {},
    torso(b, fur) {
      torso(b, fur, 0xfff1a8, { handFn: (bb, hd) => {
        bb.add(sph(0.09, 12, 8), fur, { p: hd });
        for (let k = -1; k <= 1; k++) bb.add(sph(0.05, 8, 6), 0xffb703, { p: [hd[0] + k * 0.08, hd[1] + 0.05, hd[2] - 0.08] });
      } });
      for (const [x, y, z] of [[0.18, 0.45, 0.25], [-0.2, 0.3, 0.27]]) b.add(sph(0.06, 8, 6), 0x1f4fbf, { p: [x, y, z], s: [1, 1, 0.4] });
    },
    tail() {},
    kart(b) {
      // resorte gigante con nenúfar de alerón
      const pts = [];
      for (let i = 0; i <= 60; i++) {
        const a = (i / 60) * Math.PI * 2 * 4;
        pts.push(new THREE.Vector3(Math.cos(a) * 0.17, 0.92 + (i / 60) * 0.55, 1.15 + Math.sin(a) * 0.17));
      }
      b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.035, 6), 0xd9dde6, { mat: 'metal' });
      const pad = new THREE.CylinderGeometry(0.62, 0.62, 0.06, 24, 1, false, 0.35, Math.PI * 2 - 0.7);
      b.add(pad, 0x52b788, { p: [0, 1.5, 1.15], r: [0.08, Math.PI / 2, 0], mat: 'gloss' });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.5;
        b.add(new THREE.BoxGeometry(0.5, 0.02, 0.025), 0x40916c, { p: [Math.cos(a) * 0.28, 1.535, 1.15 + Math.sin(a) * 0.28], r: [0, -a, 0] });
      }
      b.add(sph(0.11, 12, 8), 0xff70a6, { p: [0.3, 1.6, 1.3], s: [1, 0.7, 1] });
    },
  },

  // ------------------------------------------------------------- Kiko, mapache travieso
  kiko: {
    accent: 0xe9ecef,
    hub: 0xe9ecef,
    eyesPos: [0, 0.06, -0.33],
    tailPos: [0, 0.14, 0.32],
    head(b, fur) {
      b.add(sph(0.43, 22, 16), fur, { s: [1.1, 0.95, 1.0] });
      // mejillas peludas laterales
      for (const sx of [-1, 1]) b.add(cone(0.16, 0.3, 6), 0xe9ecef, { p: [sx * 0.43, -0.1, -0.05], r: [0, 0, sx * 1.75], s: [1, 1, 0.7] });
      // antifaz
      b.add(sph(0.3, 20, 12), 0x2b2d42, { p: [0, 0.06, -0.22], s: [1.45, 0.5, 0.75] });
      // cejas blancas
      for (const sx of [-1, 1]) b.add(sph(0.09, 12, 8), 0xf8f9fa, { p: [sx * 0.15, 0.25, -0.34], s: [1.3, 0.5, 0.6] });
      // hocico blanco con nariz
      b.add(cone(0.18, 0.3, 12), 0xf8f9fa, { p: [0, -0.14, -0.46], r: [-Math.PI / 2, 0, 0], s: [1.2, 1, 0.85] });
      b.add(sph(0.065, 12, 10), INK, { p: [0, -0.12, -0.62], s: [1.25, 0.9, 1] });
      smile(b, { r: 0.08, tube: 0.018, y: -0.24, z: -0.52, arc: Math.PI * 0.85 });
      // colmillito
      b.add(cone(0.025, 0.05, 4), WHITE, { p: [0.04, -0.29, -0.53], r: [Math.PI, 0, 0] });
      // orejas
      for (const sx of [-1, 1]) {
        b.add(cone(0.16, 0.26, 6), fur, { p: [sx * 0.27, 0.4, 0.02], r: [0, 0, -sx * 0.45], s: [1, 1, 0.6] });
        b.add(cone(0.1, 0.17, 6), 0x2b2d42, { p: [sx * 0.265, 0.39, -0.03], r: [0, 0, -sx * 0.45], s: [1, 1, 0.4] });
        b.add(sph(0.05, 8, 6), 0xf8f9fa, { p: [sx * 0.34, 0.52, 0.02] });
      }
    },
    eyes(b) {
      eyes(b, { spread: 0.16, r: 0.135, out: 0.2 });
    },
    browsFn() {},
    torso(b, fur) {
      torso(b, fur, 0xd9dee6, { hand: 0x2b2d42 });
      // bufanda morada
      b.add(new THREE.TorusGeometry(0.21, 0.07, 8, 18), 0xc77dff, { p: [0, 0.59, -0.02], r: [Math.PI / 2, 0, 0] });
      b.add(rbox(0.13, 0.3, 0.06, 0.03), 0xc77dff, { p: [0.15, 0.42, 0.24], r: [0.3, 0, -0.2] });
    },
    tail(b) {
      // cola anillada esponjosa
      tailChain(b, [[0, 0, 0], [-0.05, 0.25, 0.3], [-0.2, 0.45, 0.62], [-0.38, 0.6, 0.78], [-0.5, 0.8, 0.75]],
        (t) => 0.1 + Math.sin(t * Math.PI * 0.9) * 0.12, 0, (t) => (Math.floor(t * 6.99) % 2 ? 0x3d4352 : 0xb8c1cf), 18);
    },
    kart(b) {
      // botes de humo
      for (const sx of [-1, 1]) {
        b.add(new THREE.CylinderGeometry(0.15, 0.15, 0.5, 12), 0x5a189a, { p: [sx * 0.5, 0.98, 1.05], r: [0.35, 0, 0], mat: 'gloss' });
        b.add(new THREE.CylinderGeometry(0.155, 0.155, 0.08, 12), 0xd9dde6, { p: [sx * 0.5, 1.2, 0.97], r: [0.35, 0, 0], mat: 'metal' });
        b.add(new THREE.CylinderGeometry(0.05, 0.06, 0.12, 8), 0x3a3f4f, { p: [sx * 0.5, 1.28, 0.94], r: [0.35, 0, 0] });
      }
      // antena con banderín
      b.limb([0.38, 0.9, 1.3], [0.42, 2.0, 1.4], 0.015, 0x3a3f4f, { cyl: true });
      b.add(cone(0.15, 0.4, 3), 0xc77dff, { p: [0.62, 1.88, 1.4], r: [0, 0, -Math.PI / 2], s: [1, 1, 0.15] });
    },
  },
};
