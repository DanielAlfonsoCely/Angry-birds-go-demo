// Props decorativos por tema. `flag` (tela) y `geyser` (chorro) se animan solos con materiales de shader (no hay que llamar a ningún update;
// con InstancedMesh vía getPropGeometries habría que asignar mesh.onBeforeRender de getMat('cloth'|'jet'); mejor usar createProp para flag y geyser). Geometrías fusionadas por material y cacheadas por (kind, theme, variante);
// cada llamada devuelve un Group nuevo que reutiliza geometrías y materiales compartidos.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Builder, meshesFrom, jitter, rng, shade, getGlowTexture } from './builder.js';

const THEME_KEYS = ['snow', 'jungle', 'volcano'];

// Paletas por tema
const PAL = {
  snow: { rock: 0x8d9bb0, rockDark: 0x66758c, top: 0xf4f8ff, leaf: 0x2f6b4f, leaf2: 0x3f8a63, trunk: 0x6b4a32, stone: 0xa7b2c2, accent: 0x4cc9f0, crystal: 0x9be7ff, ground: 0xe8f0fa },
  jungle: { rock: 0x7d8a72, rockDark: 0x5b6652, top: 0x6bbf59, leaf: 0x2e8b3e, leaf2: 0x55b13f, trunk: 0x7a5232, stone: 0xb5a98a, accent: 0xff5d8f, crystal: 0xd16bff, ground: 0x6fa84a },
  volcano: { rock: 0x7a4a3c, rockDark: 0x4a2c26, top: 0x2b1a17, leaf: 0x7a5a2a, leaf2: 0xa8763a, trunk: 0x3a2a24, stone: 0x86584a, accent: 0xff7b2e, crystal: 0xff4d2e, ground: 0x5a3328 },
};

// Cuántas variantes se generan por kind (las orgánicas tienen varias formas)
const VARIANTS = { tree: 3, rock: 3, bigRock: 2, bush: 2, crystal: 2, flower: 2, mushroom: 2, cactus: 2 };
// Kinds que reciben rotación y escala aleatorias por defecto
const ORGANIC = new Set(['tree', 'rock', 'bigRock', 'bush', 'crystal', 'flower', 'mushroom', 'cactus', 'geyser']);
// Radio aproximado de colisión/ocupación (m) y altura, útil para pistas/físicas
const INFO = {
  tree: [1.0, 12], rock: [1.4, 1.8], bigRock: [4.5, 7], crystal: [1.2, 3.5], bush: [1.4, 1.6], flower: [0.6, 1.2],
  ruin: [1.3, 7], sign: [0.4, 3.2], flag: [0.3, 6], lantern: [0.3, 3.2], geyser: [2.2, 5], snowman: [1.0, 2.6],
  mushroom: [1.2, 3.5], cactus: [0.8, 4.5], arch: [10.5, 10],
};

const cache = new Map();
const rbox = (w, h, d, r) => (r <= 0.06 ? new THREE.BoxGeometry(w, h, d) : new RoundedBoxGeometry(w, h, d, 1, r));

/**
 * Prop decorativo. El origen está en el suelo. Para `sign`, el cartel mira hacia +Z y la flecha apunta a +X
 * (usar scale.x = -1 para invertirla). `arch` es un arco de ~20 m centrado en x = 0 que se cruza en Z.
 * @param {string} kind  uno de PROP_KINDS (desconocido => roca)
 * @param {string} theme 'snow'|'jungle'|'volcano'
 * @param {{light?:boolean, variant?:number, random?:boolean, seed?:number}} [opts]
 *   light: agrega una PointLight a `lantern` (por defecto false; úsalo con moderación)
 *   random: rotación/escala aleatoria en props orgánicos (por defecto true)
 * @returns {THREE.Group}
 */
export function createProp(kind, theme, opts = {}) {
  if (!BUILDERS[kind]) kind = 'rock';
  const th = THEME_KEYS.includes(theme) ? theme : 'snow';
  const nVar = VARIANTS[kind] ?? 1;
  const variant = opts.variant != null ? opts.variant % nVar : Math.floor(Math.random() * nVar);
  const geos = getPropGeometries(kind, th, variant);
  const big = kind === 'bigRock' || kind === 'arch' || kind === 'ruin';
  const g = meshesFrom(geos, { cast: true, receive: big });
  g.name = `prop-${kind}`;
  g.userData = { kind, theme: th, variant, radius: INFO[kind][0], height: INFO[kind][1] };
  if (opts.random !== false && ORGANIC.has(kind)) {
    g.rotation.y = Math.random() * Math.PI * 2;
    g.scale.setScalar(0.85 + Math.random() * 0.3);
  }
  if (kind === 'lantern') addLanternGlow(g, th, opts.light === true);
  if (kind === 'geyser') addGeyserGlow(g, th);
  return g;
}

/** Geometrías fusionadas por material para instanciar (InstancedMesh) desde otros módulos. */
export function getPropGeometries(kind, theme, variant = 0) {
  if (!BUILDERS[kind]) kind = 'rock';
  const th = THEME_KEYS.includes(theme) ? theme : 'snow';
  const key = `${kind}|${th}|${variant}`;
  if (!cache.has(key)) {
    const b = new Builder();
    BUILDERS[kind](b, th, PAL[th], rng(variant * 977 + kind.length * 31 + 5), variant);
    cache.set(key, b.geometries());
  }
  return cache.get(key);
}

export function getPropVariantCount(kind) {
  return VARIANTS[kind] ?? 1;
}

// ---------------------------------------------------------------------------------
// Constructores por kind: (builder, theme, palette, random, variant)
const BUILDERS = {
  tree(b, th, P, r, v) {
    if (th === 'snow') pine(b, P, r, v);
    else if (th === 'jungle') (v === 1 ? ceiba(b, P, r) : palm(b, P, r, v));
    else deadTree(b, P, r, v);
  },

  rock(b, th, P, r, v) {
    rockBlob(b, P, r, 1.0 + v * 0.35, th, 0, 0, 0, 11 + v);
    if (v === 2) rockBlob(b, P, r, 0.55, th, 1.1, 0, 0.4, 3);
  },

  bigRock(b, th, P, r, v) {
    rockBlob(b, P, r, 3.6, th, 0, 0, 0, 21 + v, 1.35);
    rockBlob(b, P, r, 2.2, th, 2.6, 0, 1.4, 5 + v);
    rockBlob(b, P, r, 1.4, th, -2.4, 0, -1.2, 9 + v);
    if (v === 1) rockBlob(b, P, r, 1.8, th, -0.8, 3.2, 0.6, 2);
  },

  crystal(b, th, P, r, v) {
    const base = P.crystal;
    const mat = th === 'snow' ? 'ice' : 'glowFlat';
    const n = 4 + v * 2;
    for (let i = 0; i < n; i++) {
      const h = (i === 0 ? 3.2 : 1.2 + r() * 1.8) * (th === 'volcano' ? 0.9 : 1);
      const a = (i / n) * Math.PI * 2 + r();
      const d = i === 0 ? 0 : 0.35 + r() * 0.5;
      const geo = new THREE.OctahedronGeometry(1, 0);
      const c = i % 2 ? shade(base, 0.12) : base;
      b.add(geo, c, {
        p: [Math.cos(a) * d, h * 0.42, Math.sin(a) * d],
        r: [Math.cos(a) * d * 0.6, r() * 3, -Math.sin(a) * d * 0.6],
        s: [0.28 + r() * 0.12, h * 0.55, 0.28 + r() * 0.12], mat,
      });
    }
    rockBlob(b, P, r, 0.8, th, 0, -0.3, 0, 4, 0.5);
  },

  bush(b, th, P, r, v) {
    const n = 5 + v * 2;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r();
      const d = i === 0 ? 0 : 0.5 + r() * 0.4;
      const s = (i === 0 ? 0.95 : 0.55 + r() * 0.3) * (th === 'volcano' ? 0.8 : 1);
      const geo = new THREE.IcosahedronGeometry(1, 0);
      jitter(geo, 0.25, i + v * 13);
      const c = i % 2 ? P.leaf2 : P.leaf;
      const y = s * 0.75 + (i === 0 ? 0.25 : 0);
      if (th === 'snow') {
        b.add(geo, (x, yy) => (yy > y + s * 0.25 ? P.top : c), { p: [Math.cos(a) * d, y, Math.sin(a) * d], s: [s, s * 0.85, s], mat: 'flat' });
      } else {
        b.add(geo, c, { p: [Math.cos(a) * d, y, Math.sin(a) * d], s: [s, s * 0.85, s], mat: 'flat' });
      }
    }
    if (th === 'jungle') {
      for (let i = 0; i < 7; i++) {
        const a = r() * Math.PI * 2;
        b.add(new THREE.SphereGeometry(0.09, 6, 4), 0xe63946, { p: [Math.cos(a) * 0.9, 0.9 + r() * 0.6, Math.sin(a) * 0.9] });
      }
    }
    if (th === 'volcano') {
      for (let i = 0; i < 6; i++) {
        const a = r() * Math.PI * 2;
        b.limb([0, 0.4, 0], [Math.cos(a) * 1.2, 1.4 + r() * 0.6, Math.sin(a) * 1.2], 0.04, 0x2e211d, { cyl: true, seg: 4 });
      }
    }
  },

  flower(b, th, P, r, v) {
    const petal = th === 'snow' ? (v ? 0x9bd0ff : 0xc8b6ff) : th === 'jungle' ? (v ? 0xff5d8f : 0xffb703) : (v ? 0xff7b2e : 0xffd166);
    const center = th === 'volcano' ? 0xff3d1f : 0xfff3b0;
    const stems = v === 0 ? 1 : 3;
    for (let s = 0; s < stems; s++) {
      const a = s * 2.1;
      const d = s === 0 ? 0 : 0.45;
      const h = s === 0 ? 1.1 : 0.7 + r() * 0.3;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      b.limb([x, 0, z], [x, h, z], 0.045, th === 'volcano' ? 0x4a3a2a : 0x3f8a3f, { cyl: true, seg: 5 });
      // hojas
      b.add(new THREE.SphereGeometry(0.22, 6, 4), th === 'volcano' ? 0x5a4a2a : 0x4caf50, { p: [x + 0.15, h * 0.35, z], r: [0, 0, -0.6], s: [1, 0.3, 0.55], mat: 'flat' });
      const petals = 6;
      for (let k = 0; k < petals; k++) {
        const pa = (k / petals) * Math.PI * 2;
        b.add(new THREE.SphereGeometry(0.2, 7, 5), petal, {
          p: [x + Math.cos(pa) * 0.2, h + 0.02, z + Math.sin(pa) * 0.2], r: [0, -pa, 0.35], s: [1, 0.35, 0.6], mat: th === 'volcano' ? 'glowFlat' : 'flat',
        });
      }
      b.add(new THREE.SphereGeometry(0.11, 8, 6), center, { p: [x, h + 0.07, z], mat: th === 'volcano' ? 'glow' : 'smooth' });
    }
  },

  ruin(b, th, P, r) {
    const stone = th === 'volcano' ? 0x4d3530 : P.stone;
    const dark = shade(stone, -0.12);
    // dos columnas, una rota, con dintel caído
    for (const [x, h, broken] of [[-1.6, 6.5, false], [1.6, 3.8, true]]) {
      b.add(rbox(1.3, 0.5, 1.3, 0.06), dark, { p: [x, 0.25, 0], mat: 'flat' });
      const segs = Math.round(h / 1.1);
      for (let i = 0; i < segs; i++) {
        const geo = new THREE.CylinderGeometry(0.48, 0.5, 1.05, 8);
        jitter(geo, 0.06, i * 7 + (broken ? 3 : 1));
        b.add(geo, i % 2 ? stone : shade(stone, 0.04), { p: [x, 0.5 + 0.53 + i * 1.07, 0], r: [0, r() * 0.3, (r() - 0.5) * 0.04], mat: 'flat' });
      }
      if (!broken) b.add(rbox(1.4, 0.45, 1.4, 0.06), dark, { p: [x, 0.5 + segs * 1.07 + 0.2, 0], mat: 'flat' });
    }
    b.add(rbox(4.6, 0.7, 1.0, 0.08), stone, { p: [1.9, 0.35, 1.5], r: [0, 0.4, 0.08], mat: 'flat' });
    for (let i = 0; i < 4; i++) {
      const geo = new THREE.DodecahedronGeometry(0.35 + r() * 0.25, 0);
      b.add(geo, dark, { p: [(r() - 0.5) * 4, 0.2, (r() - 0.5) * 3], mat: 'flat' });
    }
    // detalle del tema
    if (th === 'jungle') {
      // musgo y lianas
      b.add(new THREE.SphereGeometry(0.75, 7, 5), 0x4caf50, { p: [-1.6, 7.2, 0], s: [1.1, 0.4, 1.1], mat: 'flat' });
      for (let i = 0; i < 3; i++) b.limb([-1.6 + (i - 1) * 0.35, 7.0, 0.5], [-1.5 + (i - 1) * 0.45, 3 + i * 0.8, 0.55], 0.05, 0x3f8a3f, { cyl: true, seg: 4 });
      b.add(new THREE.SphereGeometry(0.6, 7, 5), 0x55b13f, { p: [1.6, 4.4, 0], s: [1.2, 0.45, 1.2], mat: 'flat' });
    } else if (th === 'snow') {
      b.add(new THREE.SphereGeometry(0.72, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), P.top, { p: [-1.6, 7.08, 0], s: [1.05, 0.4, 1.05], mat: 'flat' });
      b.add(new THREE.SphereGeometry(0.55, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), P.top, { p: [1.6, 4.86, 0], s: [1, 0.45, 1], mat: 'flat' });
    } else {
      // grietas brillantes
      for (let i = 0; i < 3; i++) b.add(new THREE.BoxGeometry(0.06, 0.7, 0.04), 0xff7b2e, { p: [-1.6 + (i - 1) * 0.2, 1.6 + i * 1.6, -0.5], r: [0, 0, (r() - 0.5) * 0.8], mat: 'glow' });
    }
  },

  sign(b, th, P) {
    const post = th === 'volcano' ? 0x3a2a26 : 0x7a5232;
    for (const sx of [-1, 1]) b.add(new THREE.CylinderGeometry(0.1, 0.12, 2.8, 6), post, { p: [sx * 0.9, 1.4, 0], mat: 'flat' });
    // tablero (mira a +Z)
    b.add(rbox(2.6, 1.3, 0.16, 0.06), 0xffd23f, { p: [0, 2.3, 0], mat: 'gloss' });
    b.add(rbox(2.75, 1.45, 0.12, 0.06), 0x22242e, { p: [0, 2.3, -0.03], mat: 'gloss' });
    // chevrones apuntando a +X
    for (let i = 0; i < 3; i++) {
      const x = -0.75 + i * 0.68;
      b.add(rbox(0.18, 0.62, 0.06, 0.03), 0x22242e, { p: [x, 2.47, 0.1], r: [0, 0, 0.75], mat: 'gloss' });
      b.add(rbox(0.18, 0.62, 0.06, 0.03), 0x22242e, { p: [x, 2.13, 0.1], r: [0, 0, -0.75], mat: 'gloss' });
    }
    if (th === 'snow') b.add(rbox(2.7, 0.14, 0.3, 0.06), P.top, { p: [0, 3.0, 0], mat: 'flat' });
    if (th === 'jungle') b.add(new THREE.SphereGeometry(0.3, 6, 4), 0x55b13f, { p: [-1.2, 2.95, 0], s: [1.4, 0.5, 1], mat: 'flat' });
  },

  flag(b, th, P) {
    const cloth = th === 'snow' ? [0xe63946, 0xffffff] : th === 'jungle' ? [0xffb703, 0xff5d8f] : [0xffd166, 0x22242e];
    b.add(new THREE.CylinderGeometry(0.07, 0.09, 6, 8), 0xd9dde6, { p: [0, 3, 0], mat: 'metal' });
    b.add(new THREE.SphereGeometry(0.14, 10, 8), 0xffd23f, { p: [0, 6.05, 0], mat: 'gloss' });
    // banderín triangular ondulado
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.quadraticCurveTo(0.9, 0.25, 1.9, -0.55); shape.quadraticCurveTo(0.9, -0.65, 0, -1.3); shape.lineTo(0, 0);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: false, curveSegments: 8 });
    b.add(geo, cloth[0], { p: [0.06, 5.85, -0.02], mat: 'cloth' });
    // franja
    const s2 = new THREE.Shape();
    s2.moveTo(0, -0.45); s2.quadraticCurveTo(0.6, -0.4, 1.25, -0.62); s2.quadraticCurveTo(0.6, -0.8, 0, -0.85); s2.lineTo(0, -0.45);
    b.add(new THREE.ExtrudeGeometry(s2, { depth: 0.06, bevelEnabled: false, curveSegments: 6 }), cloth[1], { p: [0.06, 5.85, -0.03], mat: 'cloth' });
    // base
    b.add(new THREE.CylinderGeometry(0.35, 0.45, 0.3, 8), th === 'volcano' ? P.rockDark : P.rock, { p: [0, 0.15, 0], mat: 'flat' });
  },

  lantern(b, th, P) {
    const metal = 0x3a3f4f;
    const glow = th === 'snow' ? 0x9be7ff : th === 'jungle' ? 0xffd27a : 0xff9a3d;
    b.add(new THREE.CylinderGeometry(0.08, 0.12, 3.0, 6), th === 'jungle' ? 0x7a5232 : metal, { p: [0, 1.5, 0], mat: 'flat' });
    b.add(new THREE.BoxGeometry(0.9, 0.08, 0.08), metal, { p: [0.4, 2.95, 0], mat: 'flat' });
    b.add(new THREE.CylinderGeometry(0.015, 0.015, 0.25, 4), metal, { p: [0.75, 2.8, 0] });
    if (th === 'jungle') {
      // farol de papel
      b.add(new THREE.SphereGeometry(0.32, 10, 8), glow, { p: [0.75, 2.42, 0], s: [1, 1.2, 1], mat: 'glow' });
      for (const y of [2.05, 2.8]) b.add(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 8), 0xb5352b, { p: [0.75, y, 0], mat: 'flat' });
    } else {
      b.add(new THREE.CylinderGeometry(0.3, 0.22, 0.1, 6), metal, { p: [0.75, 2.66, 0], mat: 'flat' });
      b.add(new THREE.CylinderGeometry(0.2, 0.2, 0.45, 6), glow, { p: [0.75, 2.38, 0], mat: 'glow' });
      b.add(new THREE.CylinderGeometry(0.22, 0.26, 0.08, 6), metal, { p: [0.75, 2.12, 0], mat: 'flat' });
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        b.add(new THREE.BoxGeometry(0.03, 0.47, 0.03), metal, { p: [0.75 + Math.cos(a) * 0.21, 2.38, Math.sin(a) * 0.21] });
      }
    }
    b.add(new THREE.CylinderGeometry(0.3, 0.38, 0.2, 6), P.rockDark, { p: [0, 0.1, 0], mat: 'flat' });
  },

  geyser(b, th, P, r) {
    const rock = th === 'snow' ? P.rock : th === 'jungle' ? 0x6b7a5f : P.rockDark;
    // anillo de rocas
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const geo = new THREE.DodecahedronGeometry(0.55 + r() * 0.25, 0);
      b.add(geo, i % 2 ? rock : shade(rock, -0.08), { p: [Math.cos(a) * 1.5, 0.3, Math.sin(a) * 1.5], s: [1, 0.7, 1], mat: 'flat' });
    }
    // charco
    const pool = th === 'volcano' ? 0xff6a1f : th === 'jungle' ? 0x4cc9c0 : 0x9be7ff;
    b.add(new THREE.CylinderGeometry(1.3, 1.3, 0.12, 14), pool, { p: [0, 0.18, 0], mat: th === 'volcano' ? 'glow' : 'gloss' });
    // columna (vapor/agua/lava) estática y estilizada
    const col = th === 'volcano' ? 0xffb347 : th === 'jungle' ? 0xc9f5ee : 0xe3f6ff;
    const mat = 'jet';
    const blobs = [[0.55, 1.0], [0.5, 2.0], [0.62, 3.0], [0.8, 3.9], [0.55, 4.6]];
    blobs.forEach(([s, y], i) => {
      const geo = new THREE.IcosahedronGeometry(1, 1);
      b.add(geo, i > 2 && th === 'volcano' ? 0xff7b2e : col, { p: [(r() - 0.5) * 0.3, y, (r() - 0.5) * 0.3], s: [s, s * 1.1, s], mat });
    });
  },

  snowman(b, th, P) {
    if (th === 'snow') {
      const white = 0xf8fbff;
      b.add(new THREE.SphereGeometry(0.75, 10, 7), white, { p: [0, 0.65, 0] });
      b.add(new THREE.SphereGeometry(0.55, 10, 7), white, { p: [0, 1.55, 0] });
      b.add(new THREE.SphereGeometry(0.4, 10, 7), white, { p: [0, 2.2, 0] });
      b.add(new THREE.ConeGeometry(0.08, 0.45, 8), 0xff8c2b, { p: [0, 2.2, -0.55], r: [-Math.PI / 2, 0, 0] });
      for (const sx of [-1, 1]) b.add(new THREE.SphereGeometry(0.055, 8, 6), 0x22242e, { p: [sx * 0.14, 2.32, -0.34] });
      for (let i = 0; i < 5; i++) {
        const a = -0.6 + i * 0.3;
        b.add(new THREE.SphereGeometry(0.035, 6, 4), 0x22242e, { p: [Math.sin(a) * 0.25, 2.08 - Math.cos(a) * 0.1 + 0.02, -0.33 + Math.abs(a) * 0.05] });
      }
      for (let i = 0; i < 3; i++) b.add(new THREE.SphereGeometry(0.06, 8, 6), 0x22242e, { p: [0, 1.4 + i * 0.2, -0.52 + Math.abs(i - 1) * 0.03] });
      b.add(new THREE.TorusGeometry(0.38, 0.09, 8, 16), 0xe63946, { p: [0, 1.95, 0], r: [Math.PI / 2, 0, 0] });
      b.add(rbox(0.18, 0.55, 0.06, 0.03), 0xe63946, { p: [0.22, 1.7, -0.33], r: [0.2, 0, 0.2] });
      b.add(new THREE.CylinderGeometry(0.28, 0.28, 0.42, 12), 0x22242e, { p: [0, 2.72, 0], r: [0, 0, 0.12], mat: 'gloss' });
      b.add(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 14), 0x22242e, { p: [0, 2.52, 0], r: [0, 0, 0.12], mat: 'gloss' });
      for (const sx of [-1, 1]) {
        b.limb([sx * 0.45, 1.6, 0], [sx * 1.15, 2.05, 0], 0.035, 0x6b4a32, { cyl: true, seg: 4 });
        b.limb([sx * 0.95, 1.92, 0], [sx * 1.1, 2.25, 0], 0.025, 0x6b4a32, { cyl: true, seg: 4 });
      }
    } else {
      // tótem de piedras apiladas (selva: musgo y hoja; volcán: roca con ojos de brasa)
      const st = th === 'jungle' ? 0x8a8f7a : 0x4a302b;
      const sizes = [[0.8, 0.6], [0.6, 1.45], [0.45, 2.1]];
      sizes.forEach(([s, y], i) => {
        const geo = new THREE.DodecahedronGeometry(s, 0);
        b.add(geo, i % 2 ? st : shade(st, 0.05), { p: [0, y, 0], s: [1, 0.8, 1], r: [0, i, 0], mat: 'flat' });
      });
      const eye = th === 'jungle' ? 0x22242e : 0xffa13d;
      for (const sx of [-1, 1]) b.add(new THREE.SphereGeometry(0.08, 8, 6), eye, { p: [sx * 0.16, 2.15, -0.4], mat: th === 'volcano' ? 'glow' : 'smooth' });
      if (th === 'jungle') {
        b.add(new THREE.SphereGeometry(0.5, 7, 4), 0x55b13f, { p: [0, 2.45, 0], s: [1.3, 0.3, 1.3], mat: 'flat' });
        b.add(new THREE.TorusGeometry(0.1, 0.03, 6, 10, Math.PI), 0x22242e, { p: [0, 1.98, -0.4], r: [0, 0, Math.PI] });
      } else {
        b.add(new THREE.BoxGeometry(0.3, 0.05, 0.05), 0xff7b2e, { p: [0, 1.95, -0.42], mat: 'glow' });
        b.add(new THREE.BoxGeometry(0.05, 0.5, 0.05), 0xff7b2e, { p: [0.2, 0.7, -0.62], r: [0, 0, 0.4], mat: 'glow' });
      }
    }
  },

  mushroom(b, th, P, r, v) {
    const cap = th === 'snow' ? 0xe63946 : th === 'jungle' ? (v ? 0x4cc9f0 : 0xb15cff) : 0x3a2a2e;
    const dots = th === 'volcano' ? 0xff7b2e : 0xffffff;
    const n = v === 0 ? 1 : 3;
    for (let i = 0; i < n; i++) {
      const s = i === 0 ? 1 : 0.45 + r() * 0.2;
      const a = i * 2.3;
      const d = i === 0 ? 0 : 1.1;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      const h = 2.2 * s;
      b.add(new THREE.CylinderGeometry(0.28 * s, 0.38 * s, h, 8), 0xfff1d6, { p: [x, h / 2, z], r: [0, 0, (r() - 0.5) * 0.15], mat: 'flat' });
      b.add(new THREE.SphereGeometry(1.1 * s, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), cap, { p: [x, h - 0.1 * s, z], s: [1, 0.75, 1], mat: th === 'jungle' ? 'glowFlat' : 'flat' });
      b.add(new THREE.CylinderGeometry(1.05 * s, 0.4 * s, 0.25 * s, 12), 0xf2e3c6, { p: [x, h - 0.15 * s, z], mat: 'flat' });
      for (let k = 0; k < 6; k++) {
        const pa = (k / 6) * Math.PI * 2 + r();
        const pr = 0.55 + r() * 0.25;
        const yy = Math.sqrt(Math.max(0, 1 - pr * pr)) * 0.75;
        b.add(new THREE.SphereGeometry(0.13 * s, 6, 4), dots, {
          p: [x + Math.cos(pa) * pr * 1.1 * s, h - 0.1 * s + yy * 1.1 * s, z + Math.sin(pa) * pr * 1.1 * s], s: [1, 0.5, 1], mat: th === 'volcano' ? 'glow' : 'smooth',
        });
      }
      if (th === 'snow') b.add(new THREE.SphereGeometry(0.75 * s, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), 0xf8fbff, { p: [x, h + 0.42 * s, z], s: [1, 0.35, 1], mat: 'flat' });
    }
  },

  cactus(b, th, P, r, v) {
    const green = th === 'snow' ? 0x5f8f86 : th === 'jungle' ? 0x3f9b4b : 0x4b5a35;
    const h = 3.6 + v * 0.8;
    const arm = (sx, y, len, up) => {
      b.add(new THREE.CapsuleGeometry(0.28, len, 2, 6), green, { p: [sx * (0.38 + len / 2), y, 0], r: [0, 0, Math.PI / 2], mat: 'flat' });
      b.add(new THREE.CapsuleGeometry(0.26, up, 2, 6), green, { p: [sx * (0.4 + len), y + up / 2, 0], mat: 'flat' });
      if (th === 'snow') b.add(new THREE.SphereGeometry(0.3, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), 0xf8fbff, { p: [sx * (0.4 + len), y + up + 0.1, 0], s: [1, 0.5, 1], mat: 'flat' });
    };
    b.add(new THREE.CapsuleGeometry(0.42, h, 2, 7), green, { p: [0, h / 2 + 0.3, 0], mat: 'flat' });
    // costillas
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      b.add(new THREE.CapsuleGeometry(0.06, h * 0.9, 2, 4), shade(green, -0.07), { p: [Math.cos(a) * 0.4, h / 2 + 0.3, Math.sin(a) * 0.4], mat: 'flat' });
    }
    arm(1, h * 0.45, 0.5, 1.0 + r() * 0.5);
    if (v === 1) arm(-1, h * 0.6, 0.4, 0.8);
    if (th === 'snow') b.add(new THREE.SphereGeometry(0.46, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), 0xf8fbff, { p: [0, h + 0.62, 0], s: [1, 0.5, 1], mat: 'flat' });
    else b.add(new THREE.SphereGeometry(0.2, 8, 6), th === 'jungle' ? 0xff5d8f : 0xff7b2e, { p: [0, h + 0.75, 0], s: [1, 0.6, 1], mat: th === 'volcano' ? 'glow' : 'smooth' });
  },

  arch(b, th, P) {
    const pillar = th === 'snow' ? 0x4f7cac : th === 'jungle' ? 0x8a6a45 : 0x4a2e28;
    const trim = th === 'snow' ? 0xe63946 : th === 'jungle' ? 0xffb703 : 0xff7b2e;
    const W = 20;
    const H = 8.5;
    for (const sx of [-1, 1]) {
      const x = sx * (W / 2);
      b.add(rbox(1.6, H, 1.6, 0.15), pillar, { p: [x, H / 2, 0], mat: 'flat' });
      b.add(rbox(2.0, 0.6, 2.0, 0.1), shade(pillar, -0.1), { p: [x, 0.3, 0], mat: 'flat' });
      for (let i = 0; i < 3; i++) b.add(rbox(1.7, 0.18, 1.7, 0.05), trim, { p: [x, 1.6 + i * 2.4, 0], mat: 'gloss' });
      // bandera a cuadros en lo alto
      b.add(new THREE.CylinderGeometry(0.06, 0.06, 3, 6), 0xd9dde6, { p: [x, H + 2.6, 0], mat: 'metal' });
      checker(b, x + 0.06, H + 3.9, 0.02, 1.8, 1.1, 6, 4, true);
      b.add(new THREE.SphereGeometry(0.16, 8, 6), 0xffd23f, { p: [x, H + 4.15, 0], mat: 'gloss' });
    }
    // viga superior y banner a cuadros por ambos lados
    b.add(rbox(W + 1.6, 1.0, 1.0, 0.12), pillar, { p: [0, H + 0.4, 0], mat: 'flat' });
    b.add(rbox(W - 1.2, 2.0, 0.3, 0.08), 0x22242e, { p: [0, H - 1.15, 0], mat: 'flat' });
    checker(b, -(W - 1.6) / 2, H - 0.25, 0.17, W - 1.6, 1.8, 24, 3, false);
    checker(b, -(W - 1.6) / 2, H - 0.25, -0.17, W - 1.6, 1.8, 24, 3, false);
    // luces de salida
    for (let i = 0; i < 5; i++) b.add(new THREE.SphereGeometry(0.22, 10, 8), i < 2 ? 0xff4d4d : i < 4 ? 0xffd23f : 0x5cff7a, { p: [-2.4 + i * 1.2, H + 1.15, -0.55], mat: 'glow' });
    if (th === 'snow') b.add(rbox(W + 1.8, 0.3, 1.2, 0.12), P.top, { p: [0, H + 1.0, 0], mat: 'flat' });
    if (th === 'jungle') for (const sx of [-1, 1]) b.add(new THREE.SphereGeometry(1.0, 7, 5), 0x55b13f, { p: [sx * 9.5, H + 1.2, 0], s: [1.4, 0.5, 1.3], mat: 'flat' });
  },
};

// ---------------------------------------------------------------------------------
/** Tablero a cuadros: (x0,y0) es la esquina superior izquierda; plano XY en z. */
function checker(b, x0, y0, z, w, h, nx, ny, wave) {
  const cw = w / nx;
  const ch = h / ny;
  const geo = new THREE.BoxGeometry(cw, ch, 0.04);
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      const off = wave ? Math.sin(i * 0.9) * 0.12 : 0;
      b.add(geo, (i + j) % 2 ? 0x1d1b26 : 0xffffff, { p: [x0 + cw * (i + 0.5), y0 - ch * (j + 0.5) + off, z + (wave ? Math.cos(i * 0.9) * 0.1 : 0)], mat: 'smooth' });
    }
  }
}

function rockBlob(b, P, r, size, th, x, y, z, seed, squash = 0.75) {
  const geo = new THREE.DodecahedronGeometry(1, 1);
  jitter(geo, 0.35, seed);
  const col = th === 'volcano' ? P.rock : P.rock;
  const top = P.top;
  const cy = y + size * squash * 0.55;
  b.add(geo, (px, py) => {
    const rel = (py - cy) / (size * squash);
    if (th === 'snow' && rel > 0.5) return top;
    if (th === 'jungle' && rel > 0.6) return 0x6b9a4a;
    if (th === 'volcano' && rel < -0.3) return P.rockDark;
    return rel < 0 ? shade(col, -0.05) : col;
  }, { p: [x, y + size * squash * 0.55, z], s: [size * (0.9 + r() * 0.3), size * squash, size * (0.9 + r() * 0.3)], r: [0, r() * 6, 0], mat: 'flat' });
}

function pine(b, P, r, v) {
  const h = 9 + v * 2 + r() * 2;           // 9–14 m
  const trunkH = h * 0.22;
  b.add(new THREE.CylinderGeometry(0.28, 0.42, trunkH + 1, 7), P.trunk, { p: [0, (trunkH + 1) / 2, 0], mat: 'flat' });
  const tiers = 4;
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers;
    const rad = (1 - t * 0.72) * h * 0.27;
    const th = h * 0.34;
    const y = trunkH + t * (h - trunkH - th * 0.6) + th / 2;
    const geo = new THREE.ConeGeometry(rad, th, 8, 1);
    jitter(geo, 0.25, i + v * 5);
    b.add(geo, i % 2 ? P.leaf : P.leaf2, { p: [0, y, 0], r: [0, i * 0.4, 0], mat: 'flat' });
    // nieve en la punta de cada nivel
    const sg = new THREE.ConeGeometry(rad * 0.62, th * 0.42, 8, 1);
    jitter(sg, 0.12, i + 40);
    b.add(sg, P.top, { p: [0, y + th * 0.3, 0], r: [0, i * 0.4 + 0.2, 0], mat: 'flat' });
  }
}

function palm(b, P, r, v) {
  const h = 9 + v * 2.5 + r() * 2;
  const pts = [];
  const lean = 1.4 + r();
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    pts.push(new THREE.Vector3(Math.sin(t * 1.4) * lean, t * h, 0));
  }
  for (let i = 0; i < 8; i++) {
    const a = pts[i], c = pts[i + 1];
    b.limb(a.toArray(), c.toArray(), 0.36 - i * 0.025, i % 2 ? P.trunk : shade(P.trunk, 0.06), { cyl: true, r2: 0.34 - i * 0.025, seg: 7, mat: 'flat' });
  }
  const top = pts[8];
  // hojas grandes y arqueadas
  // frondas: dos elipsoides aplanados por hoja (subida y caída)
  const leafGeo = new THREE.SphereGeometry(1, 8, 4);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + r() * 0.3;
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    for (const [d0, len, pitch, w] of [[0, 2.4, 0.35, 0.75], [2.1, 2.4, -0.75, 0.6]]) {
      const q = new THREE.Quaternion().setFromAxisAngle(side, -pitch)
        .multiply(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir));
      const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
      const start = top.clone().addScaledVector(dir, d0).add(new THREE.Vector3(0, d0 ? 0.65 : 0, 0));
      const mid = start.addScaledVector(fwd, len / 2);
      b.add(leafGeo, k % 2 ? P.leaf2 : P.leaf, { p: mid.toArray(), q, s: [w, 0.07, len / 2 + 0.15], mat: 'flat' });
    }
  }
  // cocos
  for (let k = 0; k < 3; k++) b.add(new THREE.SphereGeometry(0.28, 7, 5), 0x5b3a1e, { p: [top.x + Math.cos(k * 2.1) * 0.35, top.y - 0.35, top.z + Math.sin(k * 2.1) * 0.35], mat: 'flat' });
}

function ceiba(b, P, r) {
  const h = 11 + r() * 3;
  b.add(new THREE.CylinderGeometry(0.7, 1.1, h * 0.7, 8), P.trunk, { p: [0, h * 0.35, 0], mat: 'flat' });
  // raíces de contrafuerte
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    b.add(new THREE.BoxGeometry(0.25, 2.4, 2.0), shade(P.trunk, -0.05), { p: [Math.cos(a) * 1.1, 1.0, Math.sin(a) * 1.1], r: [0, -a + Math.PI / 2, 0], s: [1, 1, 1], mat: 'flat' });
  }
  // ramas y copa ancha en capas
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + 0.4;
    b.limb([0, h * 0.62, 0], [Math.cos(a) * 3.2, h * 0.8, Math.sin(a) * 3.2], 0.28, P.trunk, { cyl: true, seg: 6, mat: 'flat' });
  }
  const blobs = [[0, h * 0.86, 0, 4.2], [3, h * 0.82, 1, 2.8], [-2.8, h * 0.84, -1.2, 3.0], [1, h * 0.95, -2.6, 2.6], [-1.2, h * 0.9, 2.8, 2.7]];
  blobs.forEach(([x, y, z, s], i) => {
    const geo = new THREE.IcosahedronGeometry(1, 1);
    jitter(geo, 0.25, i * 3);
    b.add(geo, i % 2 ? P.leaf : P.leaf2, { p: [x, y, z], s: [s, s * 0.5, s], mat: 'flat' });
  });
  // lianas
  for (let k = 0; k < 4; k++) {
    const a = k * 1.7;
    b.limb([Math.cos(a) * 2.6, h * 0.8, Math.sin(a) * 2.6], [Math.cos(a) * 2.8, h * 0.35, Math.sin(a) * 2.8], 0.05, 0x3f8a3f, { cyl: true, seg: 4 });
  }
}

function deadTree(b, P, r, v) {
  const h = 7 + v * 1.5 + r() * 2;
  const trunk = P.trunk;
  b.add(new THREE.CylinderGeometry(0.22, 0.5, h, 6), trunk, { p: [0, h / 2, 0], r: [0, 0, (r() - 0.5) * 0.12], mat: 'flat' });
  const branch = (from, len, a, up, rad, depth) => {
    const to = [from[0] + Math.cos(a) * len, from[1] + up * len, from[2] + Math.sin(a) * len];
    b.limb(from, to, rad, trunk, { cyl: true, r2: rad * 0.6, seg: 5, mat: 'flat' });
    if (depth > 0) {
      branch(to, len * 0.6, a + 0.6, up + 0.1, rad * 0.6, depth - 1);
      branch(to, len * 0.55, a - 0.7, up - 0.1, rad * 0.6, depth - 1);
    }
  };
  for (let k = 0; k < 3; k++) branch([0, h * (0.5 + k * 0.15), 0], 2.4 - k * 0.4, k * 2.2 + r(), 0.6, 0.15, 1);
  // brasas en la base
  for (let k = 0; k < 4; k++) b.add(new THREE.BoxGeometry(0.05, 0.6, 0.05), 0xff7b2e, { p: [Math.cos(k * 1.6) * 0.42, 0.6 + k * 0.4, Math.sin(k * 1.6) * 0.42], r: [0, 0, (r() - 0.5)], mat: 'glow' });
}

// ---------------------------------------------------------------------------------
const spriteMats = {};
function glowSpriteMat(color) {
  spriteMats[color] ??= new THREE.SpriteMaterial({ map: getGlowTexture(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 });
  return spriteMats[color];
}

function addLanternGlow(g, th, withLight) {
  const color = th === 'snow' ? 0x7fdcff : th === 'jungle' ? 0xffc46b : 0xff8a3d;
  const halo = new THREE.Sprite(glowSpriteMat(color));
  halo.position.set(0.75, 2.4, 0);
  halo.scale.setScalar(1.8);
  g.add(halo);
  if (withLight) {
    const light = new THREE.PointLight(color, 18, 14, 1.8);
    light.position.set(0.75, 2.3, 0);
    light.castShadow = false;
    g.add(light);
  }
}

function addGeyserGlow(g, th) {
  if (th !== 'volcano') return;
  const halo = new THREE.Sprite(glowSpriteMat(0xff6a1f));
  halo.position.set(0, 1.5, 0);
  halo.scale.setScalar(6);
  g.add(halo);
}

