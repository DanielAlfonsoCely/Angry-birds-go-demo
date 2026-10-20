// Terreno: laderas a los lados de la pista (perfiles por frame), cañones bajo puentes y saltos, túneles con
// portales, terreno lejano con montañas, ríos de agua/lava y cascadas.
import * as THREE from 'three';
import { PART } from './path.js';
import { sweepGeometry, chunkRun, runsBy } from './geom.js';
import { detailTexture, fluidTexture, waterfallTexture } from './textures.js';
import { noise1D, fbm2D, createRng } from './rng.js';
import { THEMES } from './themes.js';
import { isLedgeWallSide } from './road.js';

const T = { open: 0, narrow: 1, cave: 2, jump: 3, boost: 4, slalom: 5 };
const K = 7;                // puntos por lado del perfil
export const FLOOR = -26;   // profundidad del cañón bajo puentes (relativa al frame)
const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Calcula los perfiles laterales [lateral, altura] de cada frame (lado izquierdo y derecho). */
export function computeProfiles(f, def, rampBase) {
  const seed = def.seed;
  const prof = { L: { lat: new Float32Array(f.N * K), h: new Float32Array(f.N * K) }, R: { lat: new Float32Array(f.N * K), h: new Float32Array(f.N * K) }, center: new Float32Array(f.N), zone: new Uint8Array(f.N) };
  const jumpOf = new Int16Array(f.N).fill(-1);
  f.jumps.forEach((j, n) => {
    let lo = Infinity;
    for (let i = j.iRamp; i <= j.iLandEnd; i++) lo = Math.min(lo, f.py[i]);
    j.floorY = lo + FLOOR;
    for (let i = j.iRamp; i <= j.iGapEnd; i++) jumpOf[i] = n;
  });
  const tmp = new Array(K);
  for (let i = 0; i < f.N; i++) {
    const hw = f.hw[i];
    const type = f.type[i];
    const s = f.s[i];
    // zona para el suavizado (no se mezclan perfiles entre zonas distintas: bordes nítidos)
    prof.zone[i] = !f.ground[i] ? 1 : type === T.cave ? 2 : 0;
    let center = -0.45;
    for (const side of [-1, 1]) {
      const n1 = noise1D(s / 45, seed + (side > 0 ? 11 : 0));
      const n2 = noise1D(s / 70 + 9, seed + (side > 0 ? 23 : 5));
      const n3 = noise1D(s / 30 + 3, seed + (side > 0 ? 41 : 17));
      let P;
      if (!f.ground[i]) {
        const fl = f.jumps[jumpOf[i]].floorY - f.py[i];
        P = [[hw + 1, fl], [hw + 10, fl + 0.5], [hw + 22, fl + 1 + n1], [hw + 36, fl + 2 + n2 * 2], [hw + 50, fl + 3], [hw + 64, fl + 4], [hw + 82, fl]];
        center = fl;
      } else if (type === T.narrow && !isLedgeWallSide(f, def, i, side)) {
        P = [[hw + 1.2, FLOOR], [hw + 6, FLOOR], [hw + 18, FLOOR - 0.5], [hw + 32, FLOOR + n1], [hw + 46, FLOOR + 3 + n2 * 2], [hw + 58, 6 + n3 * 5], [hw + 80, 24 + n2 * 8]];
        center = FLOOR;
      } else if (type === T.narrow) {
        // pared de roca de la cornisa
        P = [[hw + 0.9, -0.3], [hw + 1.5, 5], [hw + 3, 13 + n1 * 2], [hw + 9, 24 + n2 * 4], [hw + 22, 34 + n3 * 5], [hw + 42, 42 + n1 * 6], [hw + 80, 20]];
        center = FLOOR;
      } else if (type === T.cave) {
        const C = f.ceil[i];
        P = [[hw + 0.8, -0.3], [hw + 1.6, C + 3], [hw + 8, C + 9 + n1 * 2], [hw + 20, C + 14 + n2 * 3], [hw + 36, C + 16 + n3 * 4], [hw + 55, C + 12 + n1 * 4], [hw + 80, -20]];
      } else if (f.part[i] === PART.ramp && rampBase.has(i)) {
        const b = rampBase.get(i) - f.py[i];
        P = [[hw + 1.1, b - 0.3], [hw + 3, b + 0.2], [hw + 8, b + 1.2 + n1 * 0.5], [hw + 18, b + 4 + n1 * 2], [hw + 32, b + 9 + n2 * 4], [hw + 50, b + 15 + n3 * 6], [hw + 80, -28]];
        center = b - 0.3;
      } else {
        // abierto: laderas que suben a los lados y una cresta que tapa el fondo
        const near = type === T.slalom || type === T.boost ? 0.6 : 1;
        P = [[hw + 1.0, -0.3], [hw + 2.6, 0.25], [hw + 8, 1.4 + n1 * 0.6 * near], [hw + 18, 4.5 + n1 * 2.5], [hw + 32, 10 + n2 * 5], [hw + 50, 17 + n3 * 7], [hw + 80, -28]];
      }
      const dst = side < 0 ? prof.L : prof.R;
      for (let k = 0; k < K; k++) { dst.lat[i * K + k] = P[k][0]; dst.h[i * K + k] = P[k][1]; }
      tmp[0] = P;
    }
    prof.center[i] = center;
  }
  // Suavizado a lo largo de la pista dentro de cada zona
  const R = 5;
  for (const side of [prof.L, prof.R]) {
    for (const arr of [side.lat, side.h]) {
      const src = arr.slice();
      for (let i = 0; i < f.N; i++) {
        for (let k = 0; k < K; k++) {
          let sum = 0, w = 0;
          for (let j = Math.max(0, i - R); j <= Math.min(f.N - 1, i + R); j++) {
            if (prof.zone[j] !== prof.zone[i]) continue;
            const ww = R + 1 - Math.abs(j - i);
            sum += src[j * K + k] * ww; w += ww;
          }
          arr[i * K + k] = sum / w;
        }
      }
    }
  }
  {
    const src = prof.center.slice();
    for (let i = 0; i < f.N; i++) {
      let sum = 0, w = 0;
      for (let j = Math.max(0, i - R); j <= Math.min(f.N - 1, i + R); j++) {
        if (prof.zone[j] !== prof.zone[i]) continue;
        sum += src[j]; w++;
      }
      prof.center[i] = sum / w;
    }
  }
  // Curvas cerradas: comprimir el perfil del lado interior para que no se doble sobre sí mismo
  for (let i = 0; i < f.N; i++) {
    let maxC = 0, sgn = 0;
    for (let j = Math.max(0, i - 30); j <= Math.min(f.N - 1, i + 30); j++) {
      if (Math.abs(f.curv[j]) > maxC) { maxC = Math.abs(f.curv[j]); sgn = Math.sign(f.curv[j]); }
    }
    if (maxC < 1e-4) continue;
    const side = sgn > 0 ? prof.R : prof.L;
    const limit = 0.85 / maxC;
    const a = side.lat[i * K + 1];
    const far = side.lat[i * K + K - 1];
    if (limit >= far) continue;
    const scale = Math.max(0.05, (Math.max(a + 4, limit) - a) / (far - a));
    for (let k = 2; k < K; k++) side.lat[i * K + k] = a + (side.lat[i * K + k] - a) * scale;
  }
  return prof;
}

/**
 * @param {object} f frames
 * @param {object} ctx
 */
export function buildTerrain(f, ctx) {
  const { theme, group, res, def } = ctx;
  const pal = THEMES[theme];
  const prof = computeProfiles(f, def, ctx.rampBase);
  ctx.profiles = prof;
  const animated = [];

  // --- Laderas (una tira de 15 columnas: lado izq lejano → centro → lado der lejano) ---
  const detail = res.tex(detailTexture(def.seed, theme === 'snow' ? 'snow' : 'rock'));
  const terrainMat = res.mat(new THREE.MeshStandardMaterial({ map: detail, vertexColors: true, roughness: 0.95, metalness: 0, emissive: theme === 'volcano' ? 0x3a1a12 : 0x000000 }));
  ctx.terrainMat = terrainMat;
  const cFlat = new THREE.Color(pal.terrainFlat), cSteep = new THREE.Color(pal.terrainSteep);
  const COLS = K * 2 + 1;
  const sec = (i, c, o) => {
    if (c === K) { o[0] = 0; o[1] = prof.center[i]; o[2] = 0; return; }
    const left = c < K;
    const k = left ? K - 1 - c : c - K - 1;
    const side = left ? prof.L : prof.R;
    o[0] = (left ? -1 : 1) * side.lat[i * K + k];
    o[1] = side.h[i * K + k];
    o[2] = o[0] / 9 + o[1] / 9;
  };
  const tmpC = new THREE.Color();
  for (const frames of chunkRun(Array.from({ length: f.N }, (_, i) => i), 70)) {
    const geo = sweepGeometry(f, frames, COLS, sec, { vScale: 9, vFromY: 1 });
    // Color por pendiente + variación con ruido
    const nrm = geo.attributes.normal.array, pos = geo.attributes.position.array;
    const col = new Float32Array(pos.length);
    for (let v = 0; v < pos.length / 3; v++) {
      const steep = smoothstep(0.55, 0.85, 1 - Math.abs(nrm[v * 3 + 1]));
      const n = fbm2D(pos[v * 3] / 25, pos[v * 3 + 2] / 25, def.seed, 3);
      tmpC.copy(cFlat).lerp(cSteep, steep).multiplyScalar(0.82 + n * 0.3);
      col[v * 3] = tmpC.r; col[v * 3 + 1] = tmpC.g; col[v * 3 + 2] = tmpC.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(res.geo(geo), terrainMat);
    m.receiveShadow = true;
    m.name = 'terrain-side';
    group.add(m);
  }

  buildCaves(f, ctx, prof);
  buildFarTerrain(f, ctx);
  buildFluids(f, ctx, animated);
  if (theme === 'jungle') buildWaterfalls(f, ctx, prof, animated);
  if (theme === 'volcano') buildLavaStreams(f, ctx, prof, animated);

  return {
    update(dt, time) {
      for (const a of animated) a(dt, time);
    },
  };
}

// --- Cuevas: interior oscuro (iluminación horneada), techo exterior y portales ---
function buildCaves(f, ctx, prof) {
  const { theme, group, res, light } = ctx;
  const pal = THEMES[theme];
  const tunnelTex = res.tex(detailTexture(ctx.def.seed + 5, 'rock'));
  tunnelTex.repeat.set(1, 1);
  const tunnelMat = res.mat(new THREE.MeshBasicMaterial({ map: tunnelTex, color: pal.tunnel, vertexColors: true, side: THREE.DoubleSide }));
  const portalMat = res.mat(new THREE.MeshStandardMaterial({ color: new THREE.Color(pal.terrainSteep).multiplyScalar(1.15), map: tunnelTex, roughness: 0.9, flatShading: true, emissive: new THREE.Color(pal.terrainSteep), emissiveIntensity: theme === 'volcano' ? 0.45 : 0.22 }));
  const trimMat = res.mat(new THREE.MeshStandardMaterial({ color: pal.railTop, emissive: pal.lanternColor, emissiveIntensity: theme === 'volcano' ? 1.2 : 0.5, roughness: 0.5 }));
  const M = 13;
  // los frames de borde pueden pertenecer al tramo vecino (sin techo): usar el techo por defecto
  const ceilAt = (i) => (Number.isNaN(f.ceil[i]) ? 8.5 : f.ceil[i]);
  const arch = (hw, C, c) => {
    const W = hw + 0.7, wallH = C * 0.55;
    if (c === 0) return [-W, -0.3];
    if (c === M - 1) return [W, -0.3];
    const a = Math.PI - ((c - 1) / (M - 3)) * Math.PI;
    return [Math.cos(a) * W, wallH + Math.sin(a) * (C - wallH)];
  };
  for (const sg of f.segments) {
    if (sg.type !== 'cave') continue;
    const frames = [];
    for (let i = sg.i0; i <= sg.i1; i++) frames.push(i);
    for (const ch of chunkRun(frames, 60)) {
      const geo = sweepGeometry(f, ch, M, (i, c, o) => {
        const p = arch(f.hw[i], ceilAt(i), c);
        o[0] = p[0]; o[1] = p[1]; o[2] = c / 3;
      }, { vScale: 6, color: (i, c, x, y, z, out) => light.shade(i, x, y, z, out) });
      group.add(new THREE.Mesh(res.geo(geo), tunnelMat));
      // techo exterior (tapa el túnel por arriba)
      const cap = sweepGeometry(f, ch, 5, (i, c, o) => {
        const C = ceilAt(i), w = f.hw[i] + 1.7;
        const pts = [[-w - 0.5, C + 2.5], [-w * 0.5, C + 4.5], [0, C + 5.2], [w * 0.5, C + 4.5], [w + 0.5, C + 2.5]];
        o[0] = pts[c][0]; o[1] = pts[c][1]; o[2] = c / 2;
      }, { vScale: 8, color: (i, c, x, y, z, out) => { out[0] = out[1] = out[2] = 0.75; return out; } });
      const capMesh = new THREE.Mesh(res.geo(cap), ctx.terrainMat);
      capMesh.castShadow = true;
      group.add(capMesh);
    }
    // Portales en la entrada y la salida
    for (const [i, dir] of [[sg.i0, 1], [sg.i1, -1]]) {
      const hw = f.hw[i], C = ceilAt(i);
      const W2 = hw + 10, top = C + 9;
      const shape = new THREE.Shape();
      shape.moveTo(-W2, -1.5);
      shape.lineTo(W2, -1.5);
      const rng = createRng(i * 13 + 7);
      for (let k = 0; k <= 8; k++) {
        const x = W2 - (k / 8) * 2 * W2;
        shape.lineTo(x, top + rng.range(-2.5, 2.5) - (Math.abs(x) / W2) * 3);
      }
      shape.lineTo(-W2, -1.5);
      const hole = new THREE.Path();
      for (let c = 0; c < M; c++) {
        const p = arch(hw, C, c);
        if (c === 0) hole.moveTo(p[0], Math.max(-1.4, p[1])); else hole.lineTo(p[0], Math.max(-1.4, p[1]));
      }
      hole.closePath();
      shape.holes.push(hole);
      const g = new THREE.ExtrudeGeometry(shape, { depth: 3, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.6, bevelSegments: 1, curveSegments: 4 });
      g.translate(0, 0, dir > 0 ? 0 : -3);
      const portal = new THREE.Mesh(res.geo(g), portalMat);
      portal.position.set(f.px[i], f.py[i], f.pz[i]);
      portal.rotation.set(0, Math.atan2(-f.tx[i], -f.tz[i]), 0);
      portal.castShadow = portal.receiveShadow = true;
      group.add(portal);
      // Moldura brillante alrededor de la boca
      const pts = [];
      for (let c = 1; c < M - 1; c++) { const p = arch(hw, C, c); pts.push(new THREE.Vector3(p[0] * 1.04, p[1] * 1.03, 0)); }
      pts.unshift(new THREE.Vector3(pts[0].x, -0.2, 0));
      pts.push(new THREE.Vector3(pts[pts.length - 1].x, -0.2, 0));
      const trim = new THREE.Mesh(res.geo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.35, 6)), trimMat);
      trim.position.copy(portal.position);
      trim.rotation.copy(portal.rotation);
      trim.translateZ(dir > 0 ? 0.7 : -0.7);
      group.add(trim);
    }
  }
}

// --- Terreno lejano: envolvente por debajo de la pista + montañas que crecen con la distancia ---
function buildFarTerrain(f, ctx) {
  const { theme, group, res, def } = ctx;
  const pal = THEMES[theme];
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < f.N; i++) {
    minX = Math.min(minX, f.px[i]); maxX = Math.max(maxX, f.px[i]);
    minZ = Math.min(minZ, f.pz[i]); maxZ = Math.max(maxZ, f.pz[i]);
  }
  const M = 900;
  minX -= M; maxX += M; minZ -= M; maxZ += M;
  const cell = 26;
  const nx = Math.ceil((maxX - minX) / cell) + 1, nz = Math.ceil((maxZ - minZ) / cell) + 1;
  // frames muestreados cada 4 m
  const sx = [], sy = [], sz = [];
  for (let i = 0; i < f.N; i += 4) { sx.push(f.px[i]); sy.push(f.py[i]); sz.push(f.pz[i]); }
  const pos = new Float32Array(nx * nz * 3);
  const col = new Float32Array(nx * nz * 3);
  const cLow = new THREE.Color(pal.farLow), cHigh = new THREE.Color(pal.farHigh), cMid = new THREE.Color(pal.terrainFar);
  const tmp = new THREE.Color();
  const yTop = f.py[0], yBot = f.py[f.N - 1];
  for (let gz = 0; gz < nz; gz++) {
    for (let gx = 0; gx < nx; gx++) {
      const x = minX + gx * cell, z = minZ + gz * cell;
      let env = Infinity, dMin = Infinity;
      for (let k = 0; k < sx.length; k++) {
        const d = Math.hypot(sx[k] - x, sz[k] - z);
        const rise = d < 90 ? 0 : (d - 90) * 0.45;
        const e = sy[k] - 30 + rise;
        if (e < env) env = e;
        if (d < dMin) dMin = d;
      }
      const far = smoothstep(90, 500, dMin);
      const n = fbm2D(x / 380, z / 380, def.seed + 99, 5);
      const ridge = 1 - Math.abs(fbm2D(x / 220, z / 220, def.seed + 7, 4) * 2 - 1);
      const y = env + far * (n * 260 + ridge * 120 - 40) + fbm2D(x / 60, z / 60, def.seed, 2) * 6;
      const v = gz * nx + gx;
      pos[v * 3] = x; pos[v * 3 + 1] = y; pos[v * 3 + 2] = z;
      const hRel = (y - yBot) / Math.max(1, yTop - yBot + 200);
      if (theme === 'snow') tmp.copy(cLow).lerp(cHigh, smoothstep(0.05, 0.6, hRel + far * 0.3));
      else if (theme === 'jungle') tmp.copy(cLow).lerp(cMid, smoothstep(0, 0.5, hRel)).lerp(cHigh, smoothstep(0.7, 1.2, hRel));
      else tmp.copy(cLow).lerp(cMid, smoothstep(-0.1, 0.6, hRel)).lerp(cHigh, smoothstep(0.8, 1.4, hRel));
      tmp.multiplyScalar(0.85 + fbm2D(x / 40, z / 40, def.seed + 3, 2) * 0.3);
      col[v * 3] = tmp.r; col[v * 3 + 1] = tmp.g; col[v * 3 + 2] = tmp.b;
    }
  }
  const idx = [];
  for (let gz = 0; gz < nz - 1; gz++) for (let gx = 0; gx < nx - 1; gx++) {
    const a = gz * nx + gx, b = a + 1, c = a + nx, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  let geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo = geo.toNonIndexed(); // caras planas low-poly
  geo.computeVertexNormals();
  const mat = res.mat(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  const mesh = new THREE.Mesh(res.geo(geo), mat);
  mesh.receiveShadow = true;
  mesh.name = 'terrain-far';
  group.add(mesh);
  ctx.farTerrain = { minX, minZ, nx, nz, cell, pos };
}

/** Altura del terreno lejano en (x,z) (interpolación bilineal de la rejilla). */
export function farHeight(ctx, x, z) {
  const t = ctx.farTerrain;
  const fx = (x - t.minX) / t.cell, fz = (z - t.minZ) / t.cell;
  const gx = Math.max(0, Math.min(t.nx - 2, Math.floor(fx))), gz = Math.max(0, Math.min(t.nz - 2, Math.floor(fz)));
  const ax = fx - gx, az = fz - gz;
  const h = (i, j) => t.pos[((gz + j) * t.nx + gx + i) * 3 + 1];
  return (h(0, 0) * (1 - ax) + h(1, 0) * ax) * (1 - az) + (h(0, 1) * (1 - ax) + h(1, 1) * ax) * az;
}

// --- Ríos de agua o lava en el fondo de los cañones (bajo puentes y saltos) ---
function buildFluids(f, ctx, animated) {
  const { theme, group, res } = ctx;
  const pal = THEMES[theme];
  const lava = pal.floor === 'lava';
  const tex = res.tex(fluidTexture(lava ? 'lava' : 'water', ctx.def.seed));
  tex.repeat.set(4, 1);
  const mat = res.mat(lava
    ? new THREE.MeshBasicMaterial({ map: tex, color: 0xffffff })
    : new THREE.MeshStandardMaterial({ map: tex, color: theme === 'snow' ? 0x9fd0f0 : 0xb0f0e8, roughness: 0.15, metalness: 0.2 }));
  const zones = [];
  for (const sg of f.segments) {
    if (sg.type !== 'narrow') continue;
    zones.push({ i0: Math.max(0, sg.i0 - 25), i1: Math.min(f.N - 1, sg.i1 + 25), y: (i) => f.py[i] + FLOOR + 0.6 });
  }
  for (const j of f.jumps) {
    zones.push({ i0: Math.max(0, j.iLip - 30), i1: Math.min(f.N - 1, j.iGapEnd + 30), y: () => j.floorY + 0.6 });
  }
  for (const z of zones) {
    const frames = [];
    for (let i = z.i0; i <= z.i1; i++) frames.push(i);
    const geo = sweepGeometry(f, frames, 3, (i, c, o) => {
      o[0] = (c - 1) * (f.hw[i] + 75);
      o[1] = z.y(i) - f.py[i];
      o[2] = c * 2;
    }, { vScale: 30 });
    const m = new THREE.Mesh(res.geo(geo), mat);
    m.name = lava ? 'lava' : 'water';
    group.add(m);
  }
  animated.push((dt, time) => {
    tex.offset.y = (time * (lava ? 0.03 : 0.08)) % 1;
    tex.offset.x = Math.sin(time * 0.3) * 0.02;
  });
  ctx.fluidMat = mat;
}

// --- Cascadas (selva): caen por las paredes del cañón junto a los puentes ---
function buildWaterfalls(f, ctx, prof, animated) {
  const { group, res } = ctx;
  const tex = res.tex(waterfallTexture());
  tex.repeat.set(2, 1.5);
  const mat = res.mat(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, color: 0xe8fbff }));
  const foamMat = res.mat(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }));
  const rng = createRng(ctx.def.seed + 404);
  for (const sg of f.segments) {
    if (sg.type !== 'narrow') continue;
    for (const side of [-1, 1]) {
      if (isLedgeWallSide(f, ctx.def, Math.round((sg.i0 + sg.i1) / 2), side)) continue;
      const ic = Math.round(sg.i0 + (sg.i1 - sg.i0) * rng.range(0.3, 0.7));
      const P = side < 0 ? prof.L : prof.R;
      const NW = 14, rows = [3, 4, 5, 6]; // ancho en frames y puntos del perfil que recorre la cascada (de abajo a arriba)
      const pos = new Float32Array(NW * rows.length * 3), uv = new Float32Array(NW * rows.length * 2);
      const idx = [];
      for (let j = 0; j < NW; j++) {
        const i = ic - NW / 2 + j;
        for (let r = 0; r < rows.length; r++) {
          const k = rows[r], lat = side * (P.lat[i * K + k] - 0.5);
          const v = (j * rows.length + r);
          pos[v * 3] = f.px[i] + f.rx[i] * lat;
          pos[v * 3 + 1] = f.py[i] + P.h[i * K + k] + 0.45;
          pos[v * 3 + 2] = f.pz[i] + f.rz[i] * lat;
          uv[v * 2] = j / (NW - 1);
          uv[v * 2 + 1] = r * 1.4;
          if (j < NW - 1 && r < rows.length - 1) { const a = v, b = v + rows.length; idx.push(a, b, a + 1, b, b + 1, a + 1); }
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      const m = new THREE.Mesh(res.geo(geo), mat);
      m.name = 'waterfall';
      group.add(m);
      (ctx.waterfalls ??= []).push({ i0: ic - NW / 2 - 3, i1: ic + NW / 2 + 3, side });
      const i = ic, latBot = P.lat[i * K + 3], width = NW;
      const foam = new THREE.Mesh(res.geo(new THREE.CircleGeometry(width * 0.55, 16).rotateX(-Math.PI / 2)), foamMat);
      const fl = side * (latBot + 1);
      foam.position.set(f.px[i] + f.rx[i] * fl, f.py[i] + FLOOR + 0.8, f.pz[i] + f.rz[i] * fl);
      group.add(foam);
    }
  }
  animated.push((dt, time) => { tex.offset.y = (time * 1.4) % 1; });
}

// --- Ríos de lava (cañón): canales brillantes en las laderas paralelos a la pista ---
function buildLavaStreams(f, ctx, prof, animated) {
  const { group, res } = ctx;
  const tex = res.tex(fluidTexture('lava', ctx.def.seed + 1));
  tex.repeat.set(1, 1);
  const mat = res.mat(new THREE.MeshBasicMaterial({ map: tex, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  const rng = createRng(ctx.def.seed + 505);
  const runs = runsBy(f, (i) => (f.ground[i] && (f.type[i] === T.open || f.type[i] === T.slalom || f.type[i] === T.boost) && f.part[i] === PART.normal ? 'o' : null));
  for (const run of runs) {
    if (run.frames.length < 70) continue;
    const side = rng.sign();
    const P = side < 0 ? prof.L : prof.R;
    const a = run.frames[10], b = run.frames[run.frames.length - 10];
    const frames = [];
    for (let i = a; i <= b; i++) frames.push(i);
    // canal entre los puntos 2 y 3 del perfil (sobre la ladera)
    const geo = sweepGeometry(f, frames, 4, (i, c, o) => {
      const t = 0.35 + 0.1 * Math.sin(f.s[i] / 25);
      const l2 = P.lat[i * K + 2], l3 = P.lat[i * K + 3], h2 = P.h[i * K + 2], h3 = P.h[i * K + 3];
      const mid = l2 + (l3 - l2) * t, hm = h2 + (h3 - h2) * t;
      const w = 1.8 + (c === 0 || c === 3 ? 0.4 : 0);
      const off = [-w, -w * 0.4, w * 0.4, w][c];
      const k = (mid + off - l2) / (l3 - l2);
      o[0] = side * (mid + off);
      o[1] = h2 + (h3 - h2) * k + (c === 0 || c === 3 ? 0.12 : -0.05) + 0.05;
      o[2] = c / 3;
      void hm;
    }, { vScale: 14 });
    group.add(new THREE.Mesh(res.geo(geo), mat));
  }
  animated.push((dt, time) => { tex.offset.y = (time * 0.12) % 1; });
}
