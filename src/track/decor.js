// Decoración de la pista: props repetidos en InstancedMesh por trozos de pista (con culling), más detalles
// temáticos sueltos (banderines, carteles de curva, faroles, ruinas, géiseres, muñecos de nieve...). PRNG con semilla fija.
import * as THREE from 'three';
import { createProp, getPropGeometries, getPropVariantCount, getMat } from '../art/index.js';
import { PART } from './path.js';
import { createRng } from './rng.js';
import { placeOnFrame, isLedgeWallSide } from './road.js';

const K = 7;              // puntos por lado del perfil (ver terrain.js)
const CHUNK = 150;        // metros de pista por grupo instanciado
const T = { open: 0, narrow: 1, cave: 2, jump: 3, boost: 4, slalom: 5 };
// Variantes usadas por tipo (menos variantes = menos draw calls)
const VARIANT_CAP = { tree: 2, rock: 2, bigRock: 1, bush: 1, crystal: 1, flower: 1, mushroom: 1, cactus: 1 };
const NO_JITTER = new Set(['glow', 'ice', 'jet', 'cloth']);
const MAX_LIGHTS = 4;     // PointLights reales por pista (las demás luces de cueva van horneadas)

// Radio de ocupación aproximado (m) por tipo, para que no se solapen
const RADIUS = { snowman: 1.2, ruin: 1.5, tree: 1.6, rock: 1.3, bigRock: 4.2, bush: 1.2, flower: 0.5, crystal: 1.1, mushroom: 1.0, cactus: 0.9 };
// Tabla por tema y banda: [kind, peso, escalaMin, escalaMax]
const TABLE = {
  snow: {
    near: [['rock', 3, 0.7, 1.3], ['bush', 2, 0.8, 1.2], ['crystal', 1, 0.6, 1.1], ['tree', 2, 0.7, 1.0]],
    mid: [['tree', 8, 0.9, 1.5], ['rock', 2, 0.8, 1.6], ['bush', 1, 1, 1.5], ['crystal', 0.6, 1, 1.8]],
    far: [['tree', 5, 1.3, 2.0], ['bigRock', 2, 1, 1.8], ['rock', 2, 1.5, 2.4]],
  },
  jungle: {
    near: [['bush', 3, 0.8, 1.3], ['flower', 5, 0.8, 1.4], ['mushroom', 1.5, 0.7, 1.2], ['rock', 1.5, 0.7, 1.2], ['tree', 1.5, 0.7, 0.95]],
    mid: [['tree', 8, 0.9, 1.5], ['bush', 2, 1, 1.6], ['mushroom', 1, 1, 1.6], ['rock', 1, 0.9, 1.5]],
    far: [['tree', 6, 1.3, 2.0], ['bigRock', 1.5, 1, 1.8], ['bush', 1, 1.5, 2.2]],
  },
  volcano: {
    near: [['rock', 4, 0.7, 1.4], ['cactus', 2, 0.8, 1.2], ['crystal', 1.2, 0.6, 1.1], ['bush', 1, 0.7, 1.1]],
    mid: [['rock', 4, 1, 2.0], ['tree', 3, 0.9, 1.4], ['cactus', 2, 1, 1.6], ['bigRock', 1.2, 0.8, 1.3], ['crystal', 0.8, 1, 1.8]],
    far: [['bigRock', 4, 1.1, 2.2], ['rock', 3, 1.5, 2.6], ['tree', 2, 1.2, 1.8]],
  },
};

/** Altura (relativa al frame) del perfil lateral del lado `P` en el frame i, a distancia lateral absoluta `lat`. */
function profileHeight(P, i, lat) {
  const b = i * K;
  for (let k = 0; k < K - 1; k++) {
    const l0 = P.lat[b + k], l1 = P.lat[b + k + 1];
    if (lat <= l1 || k === K - 2) {
      const u = l1 > l0 ? Math.min(1, Math.max(0, (lat - l0) / (l1 - l0))) : 0;
      return P.h[b + k] + (P.h[b + k + 1] - P.h[b + k]) * u;
    }
  }
  return P.h[b];
}

export function buildDecor(f, ctx) {
  const { theme, group, def, light } = ctx;
  const prof = ctx.profiles;
  const rng = createRng(def.seed * 7 + 31);
  const table = TABLE[theme];
  const update = [];
  const instMeshes = [];

  // --- Rejilla espacial de la pista (para no poner nada encima de otro tramo) y de props ya colocados ---
  const CELL = 6;
  const key = (x, z) => Math.floor(x / CELL) * 73856093 ^ Math.floor(z / CELL) * 19349663;
  const roadGrid = new Map();
  for (let i = 0; i < f.N; i += 2) {
    const k = key(f.px[i], f.pz[i]);
    (roadGrid.get(k) ?? roadGrid.set(k, []).get(k)).push(i);
  }
  const onRoad = (x, z, y) => {
    const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
    for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) {
      const list = roadGrid.get((cx + a) * 73856093 ^ (cz + b) * 19349663);
      if (!list) continue;
      for (const i of list) {
        const d = Math.hypot(f.px[i] - x, f.pz[i] - z);
        if (d < f.hw[i] + 4.2 && y > f.py[i] - 8) return true;
      }
    }
    return false;
  };
  const placed = new Map();
  const free = (x, z, r) => {
    const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const list = placed.get((cx + a) * 73856093 ^ (cz + b) * 19349663);
      if (!list) continue;
      for (const q of list) if (Math.hypot(q[0] - x, q[1] - z) < q[2] + r) return false;
    }
    return true;
  };
  const claim = (x, z, r) => {
    const k = key(x, z);
    (placed.get(k) ?? placed.set(k, []).get(k)).push([x, z, r]);
  };

  // --- Props instanciados por trozo ---
  const chunks = new Map(); // "chunk|kind|variante" -> matrices
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pv = new THREE.Vector3(), sv = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  const pickKind = (list) => {
    let total = 0;
    for (const e of list) total += e[1];
    let r = rng.next() * total;
    for (const e of list) { r -= e[1]; if (r <= 0) return e; }
    return list[0];
  };
  const addInstance = (chunk, kind, variant, x, y, z, scale, yaw = null) => {
    const k = `${chunk}|${kind}|${variant}`;
    let arr = chunks.get(k);
    if (!arr) chunks.set(k, arr = { kind, variant, chunk, mats: [] });
    q.setFromAxisAngle(UP, yaw ?? rng.range(0, Math.PI * 2));
    pv.set(x, y - 0.15 * scale, z);
    sv.set(scale * rng.range(0.9, 1.1), scale * rng.range(0.9, 1.15), scale * rng.range(0.9, 1.1));
    arr.mats.push(m4.compose(pv, q, sv).clone());
  };

  for (let i = 0; i < f.N; i++) {
    if (!f.ground[i] || f.type[i] === T.cave || f.part[i] === PART.ramp) continue;
    const narrow = f.type[i] === T.narrow;
    const chunk = Math.floor(f.s[i] / CHUNK);
    for (const side of [-1, 1]) {
      const P = side < 0 ? prof.L : prof.R;
      const b = i * K;
      const hw = f.hw[i];
      if (ctx.waterfalls?.some((w) => w.side === side && i >= w.i0 && i <= w.i1)) continue; // no tapar las cascadas
      const ledgeWall = narrow && isLedgeWallSide(f, def, i, side);
      // Bandas laterales según el tipo de tramo
      let bands;
      if (narrow) bands = [['mid', P.lat[b + 4], P.lat[b + 5] - 3, 0.22], ['far', P.lat[b + 5] - 3, P.lat[b + 5] + 6, 0.2]];
      else bands = [
        ['near', hw + 3.6, P.lat[b + 2] + 3, 0.2],
        ['mid', P.lat[b + 2] + 3, P.lat[b + 4], 0.34],
        ['far', P.lat[b + 4], P.lat[b + 5] + 2, 0.18],
      ];
      for (const [band, lo, hi, p] of bands) {
        if (hi <= lo || ledgeWall && band !== 'far') continue;
        if (rng.next() > p) continue;
        const lat = rng.range(lo, hi);
        const [kind, , s0, s1] = pickKind(table[band]);
        const scale = rng.range(s0, s1);
        const r = RADIUS[kind] * scale;
        const jx = rng.range(-1.2, 1.2);
        const x = f.px[i] + f.rx[i] * side * lat + f.tx[i] * jx, z = f.pz[i] + f.rz[i] * side * lat + f.tz[i] * jx;
        const y = f.py[i] + profileHeight(P, i, lat);
        if (y < f.py[i] - 22 || !free(x, z, r) || onRoad(x, z, y)) continue;
        claim(x, z, r);
        addInstance(chunk, kind, rng.int(0, Math.min(VARIANT_CAP[kind] ?? 1, getPropVariantCount(kind)) - 1), x, y, z, scale);
      }
    }
  }

  // --- Detalles sueltos (createProp) ---
  const put = (obj, i, side, d, extra = {}) => {
    const P = side < 0 ? prof.L : prof.R;
    const lat = f.hw[i] + d;
    placeOnFrame(obj, f, i, side * lat, profileHeight(P, i, lat));
    if (extra.face) obj.rotation.y += side > 0 ? -Math.PI / 2 : Math.PI / 2; // mira hacia la pista
    group.add(obj);
    return obj;
  };
  const isOpen = (i) => f.ground[i] && f.part[i] !== PART.ramp && (f.type[i] === T.open || f.type[i] === T.boost || f.type[i] === T.slalom);

  // Banderines en la salida y en la meta
  for (const [c, a, b] of [[ctx.startLineIndex, -34, 12], [f.finishIndex, -14, 14]]) {
    for (let d = a; d <= b; d += 12) {
      for (const side of [-1, 1]) {
        const i = Math.max(0, Math.min(f.N - 1, c + d));
        put(createProp('flag', theme), i, side, 2.4);
      }
    }
  }

  // Carteles de curva antes de las curvas cerradas (flecha hacia +X; se invierte con scale.x = -1)
  for (const sg of f.segments) {
    const turn = sg.def?.turn ?? 0;
    if (Math.abs(turn) < 30 || sg.type === 'jump') continue;
    let i = sg.i0 - 6;
    while (i > sg.i0 - 80 && !isOpen(i)) i--;
    if (!isOpen(i)) continue;
    for (const back of [0, 22]) {
      const j = Math.max(0, i - back);
      if (!isOpen(j)) continue;
      const outside = turn > 0 ? -1 : 1; // lado exterior de la curva (turn > 0 = derecha)
      const sign = createProp('sign', theme);
      put(sign, j, outside, 2.6);
      if (turn < 0) sign.scale.x = -1;
      if (turn > 0) sign.scale.x = 1;
    }
  }

  // Faroles de cueva (alineados con la luz horneada); pocas luces reales
  const lanterns = light.lanterns;
  const lightEvery = Math.max(1, Math.ceil(lanterns.length / MAX_LIGHTS));
  let nLights = 0;
  lanterns.forEach((l, n) => {
    const withLight = n % lightEvery === Math.floor(lightEvery / 2) && nLights < MAX_LIGHTS;
    if (withLight) nLights++;
    const prop = createProp('lantern', theme, { light: withLight });
    placeOnFrame(prop, f, l.i, l.side * (f.hw[l.i] + 0.3), 0);
    if (l.side > 0) prop.rotation.y += Math.PI; // el brazo apunta al centro de la pista
    group.add(prop);
  });

  // Detalles por tema en tramos abiertos, a intervalos
  const spots = [];
  for (let i = 60; i < f.finishIndex - 30; i += 3) if (isOpen(i) && isOpen(i - 15) && isOpen(i + 15)) spots.push(i);
  const take = (every) => spots.filter((_, n) => n % Math.max(1, Math.round(every / 3)) === 0);
  // Detalle estático como instancia (faces = mirar hacia la pista)
  const tryInst = (kind, i, side, d, scale, faces) => {
    const P = side < 0 ? prof.L : prof.R;
    const lat = f.hw[i] + d;
    const x = f.px[i] + f.rx[i] * side * lat, z = f.pz[i] + f.rz[i] * side * lat, y = f.py[i] + profileHeight(P, i, lat);
    const r = (RADIUS[kind] ?? 1.2) * scale;
    if (!free(x, z, r) || onRoad(x, z, y)) return;
    claim(x, z, r);
    const yaw = faces ? Math.atan2(-side * f.rx[i], -side * f.rz[i]) + rng.range(-0.4, 0.4) : null;
    addInstance(Math.floor(f.s[i] / CHUNK), kind, 0, x, y, z, scale, yaw);
  };
  const tryPut = (kind, i, side, d, opts, face) => {
    const obj = createProp(kind, theme, opts);
    const radius = (obj.userData.radius ?? 1) + 0.5;
    const P = side < 0 ? prof.L : prof.R;
    const lat = f.hw[i] + d;
    const x = f.px[i] + f.rx[i] * side * lat, z = f.pz[i] + f.rz[i] * side * lat, y = f.py[i] + profileHeight(P, i, lat);
    if (!free(x, z, radius) || onRoad(x, z, y)) return null;
    claim(x, z, radius);
    put(obj, i, side, d, { face });
    return obj;
  };

  if (theme === 'snow') {
    // Muñecos de nieve en pareja y cristales de hielo grandes
    take(130).forEach((i, n) => {
      const side = n % 2 ? 1 : -1;
      tryInst('snowman', i, side, rng.range(5, 8), rng.range(1, 1.3), true);
      tryInst('snowman', i + 4, side, rng.range(6, 9), rng.range(0.8, 1.1), true);
    });
    take(75).forEach((i, n) => {
      tryInst('crystal', i + 9, n % 2 ? -1 : 1, rng.range(7, 16), rng.range(1.4, 2), false);
    });
  } else if (theme === 'jungle') {
    // Ruinas de piedra en grupos
    take(150).forEach((i, n) => {
      const side = n % 2 ? 1 : -1;
      const d = rng.range(7, 12);
      for (let k = 0; k < 3; k++) {
        tryInst('ruin', i + k * 5, side, d + rng.range(-1.5, 3), rng.range(0.8, 1.25), false);
      }
    });
  } else {
    // Géiseres y cristales rojos
    take(110).forEach((i, n) => {
      const g = tryPut('geyser', i, n % 2 ? 1 : -1, rng.range(7, 15), {}, false);
      if (g) g.scale.setScalar(rng.range(1.0, 1.5));
    });
    take(80).forEach((i, n) => tryInst('crystal', i + 7, n % 2 ? -1 : 1, rng.range(8, 18), rng.range(1.3, 1.9), false));
  }

  // Convierte las listas de matrices en InstancedMesh (al final, cuando ya están todos los detalles)
  const buildInstanced = () => {
    const color = new THREE.Color();
    for (const { kind, variant, mats } of chunks.values()) {
      const geos = getPropGeometries(kind, theme, variant);
      for (const [matKey, geo] of Object.entries(geos)) {
        const inst = new THREE.InstancedMesh(geo, getMat(matKey), mats.length);
        mats.forEach((m, n) => {
          inst.setMatrixAt(n, m);
          if (!NO_JITTER.has(matKey)) { const v = 0.85 + ((n * 37) % 100) / 100 * 0.25; inst.setColorAt(n, color.setRGB(v, v, v)); }
        });
        inst.castShadow = (kind === 'tree' || kind === 'bigRock') && matKey !== 'glow' && matKey !== 'ice';
        inst.receiveShadow = false;
        inst.computeBoundingSphere();
        inst.name = `decor-${kind}`;
        group.add(inst);
        instMeshes.push(inst);
      }
    }
  };

  buildInstanced();

  // Arcos de salida y meta
  for (const i of [ctx.startLineIndex, f.finishIndex]) {
    const a = createProp('arch', theme);
    placeOnFrame(a, f, i);
    group.add(a);
  }

  return {
    update(dt, time) { for (const u of update) u(dt, time); },
    dispose() { for (const m of instMeshes) m.dispose(); },
    stats: { instances: [...chunks.values()].reduce((s, c) => s + c.mats.length, 0), lights: nLights },
  };
}
