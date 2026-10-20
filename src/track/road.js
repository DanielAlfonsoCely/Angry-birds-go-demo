// Malla del suelo de la pista (con UVs y textura procedural), bordillos, rampas, puentes con barandas y pilares.
import * as THREE from 'three';
import { PART } from './path.js';
import { sweepGeometry, chunkRun, runsBy } from './geom.js';
import { roadTexture, deckTexture, curbTexture, rampTexture, checkerTexture } from './textures.js';
import { THEMES } from './themes.js';

const T_NARROW = 1, T_CAVE = 2;
export const ROAD_MARGIN = 1.2; // el suelo se extiende 1.2 m más allá de halfWidth (debajo del bordillo/baranda)
const ROAD_COLS = [-1, -0.93, -0.6, -0.2, 0.2, 0.6, 0.93, 1];

/**
 * @param {object} f frames
 * @param {object} ctx {theme, def, group, res (recursos para dispose), ground (índice de suelo), light}
 */
export function buildRoad(f, ctx) {
  const { theme, group, res, ground, light } = ctx;
  const pal = THEMES[theme];
  const mats = {
    road: new THREE.MeshStandardMaterial({ map: res.tex(roadTexture(theme, ctx.def.seed)), roughness: theme === 'snow' ? 0.55 : 0.9, metalness: 0, vertexColors: true }),
    deck: new THREE.MeshStandardMaterial({ map: res.tex(deckTexture(theme)), roughness: 0.75, vertexColors: true }),
    ramp: new THREE.MeshStandardMaterial({ map: res.tex(rampTexture(pal.ramp)), roughness: 0.6, vertexColors: true }),
  };
  for (const m of Object.values(mats)) res.mat(m);
  const isDeck = (i) => f.type[i] === T_NARROW;
  const groundMeshes = [];

  // Suelo: corridas por material, en trozos de 60 m (culling y raycast)
  const runs = runsBy(f, (i) => (f.ground[i] ? (f.part[i] === PART.ramp ? 'ramp' : isDeck(i) ? 'deck' : 'road') : null));
  for (const run of runs) {
    for (const frames of chunkRun(run.frames, 60)) {
      const geo = sweepGeometry(f, frames, ROAD_COLS.length, (i, c, o) => {
        const w = f.hw[i] + ROAD_MARGIN;
        o[0] = ROAD_COLS[c] * w;
        o[1] = 0;
        o[2] = (ROAD_COLS[c] + 1) / 2;
      }, {
        vScale: run.key === 'ramp' ? 6 : run.key === 'deck' ? 4 : 12,
        color: (i, c, x, y, z, out) => light.shade(i, x, y, z, out),
      });
      const mesh = new THREE.Mesh(res.geo(geo), mats[run.key]);
      mesh.receiveShadow = true;
      mesh.name = `ground-${run.key}`;
      mesh.userData.surface = run.key;
      group.add(mesh);
      groundMeshes.push(mesh);
      ground.addMesh(mesh);
    }
  }

  // Bordillos en tramos con suelo que no son puentes, rampas ni cuevas
  const curbMat = res.mat(new THREE.MeshStandardMaterial({ map: res.tex(curbTexture(pal.curb)), roughness: 0.6, vertexColors: true }));
  const curbRuns = runsBy(f, (i) => (f.ground[i] && !isDeck(i) && f.type[i] !== T_CAVE && f.part[i] !== PART.ramp ? 'c' : null));
  const CURB = [[0, 0.02], [0.12, 0.24], [0.95, 0.24], [1.15, 0.02]];
  for (const run of curbRuns) {
    for (const frames of chunkRun(run.frames, 80)) {
      for (const side of [-1, 1]) {
        const geo = sweepGeometry(f, frames, 4, (i, c, o) => {
          const p = side < 0 ? CURB[3 - c] : CURB[c];
          o[0] = side * (f.hw[i] + p[0]);
          o[1] = p[1];
          o[2] = c / 3;
        }, { vScale: 3, color: (i, c, x, y, z, out) => light.shade(i, x, y, z, out) });
        const m = new THREE.Mesh(res.geo(geo), curbMat);
        m.receiveShadow = true;
        group.add(m);
      }
    }
  }

  // Faldones: canto del tablero de los puentes y laterales de las rampas
  const skirtMat = res.mat(new THREE.MeshStandardMaterial({ color: pal.skirt, roughness: 0.85, side: THREE.DoubleSide }));
  const rampBase = new Map();
  for (const j of f.jumps) {
    const y0 = f.py[j.iRamp];
    const slope = (f.py[Math.max(0, j.iRamp - 10)] - y0) / (10 * f.ds);
    for (let i = j.iRamp; i <= j.iLip; i++) rampBase.set(i, y0 - slope * (i - j.iRamp) * f.ds);
  }
  const skirtRuns = runsBy(f, (i) => (f.ground[i] && (isDeck(i) || f.part[i] === PART.ramp) ? 's' : null));
  for (const run of skirtRuns) {
    for (const frames of chunkRun(run.frames, 60)) {
      const geo = sweepGeometry(f, frames, 4, (i, c, o) => {
        const w = f.hw[i] + ROAD_MARGIN;
        const depth = rampBase.has(i) ? Math.max(1.2, f.py[i] - rampBase.get(i) + 1.5) : 1.4;
        const pts = [[-w, -0.02], [-w, -depth], [w, -depth], [w, -0.02]];
        o[0] = pts[c][0]; o[1] = pts[c][1]; o[2] = c / 3;
      }, { vScale: 4 });
      const m = new THREE.Mesh(res.geo(geo), skirtMat);
      m.castShadow = true;
      group.add(m);
    }
  }
  // Tapa frontal de cada rampa (cara bajo el labio)
  for (const j of f.jumps) {
    const i = j.iLip;
    const w = f.hw[i] + ROAD_MARGIN;
    const depth = f.py[i] - (rampBase.get(i) ?? f.py[i] - 3) + 1.5;
    const cap = new THREE.Mesh(res.geo(new THREE.PlaneGeometry(2 * w, depth)), skirtMat);
    placeOnFrame(cap, f, i, 0, -depth / 2);
    group.add(cap);
  }

  buildRails(f, ctx, (i) => (f.ground[i] && (isDeck(i) || f.part[i] === PART.ramp)));
  buildLines(f, ctx);
  return { groundMeshes, rampBase };
}

/** Orienta un objeto en el frame i: X = right, Y = arriba de mundo, -Z = adelante (horizontal). */
export function placeOnFrame(obj, f, i, lateral = 0, dy = 0) {
  obj.position.set(f.px[i] + f.rx[i] * lateral, f.py[i] + dy, f.pz[i] + f.rz[i] * lateral);
  obj.rotation.set(0, Math.atan2(-f.tx[i], -f.tz[i]), 0);
  return obj;
}

// Barandas: postes instanciados y pasamanos barrido
function buildRails(f, ctx, onRail) {
  const { theme, group, res } = ctx;
  const pal = THEMES[theme];
  const postMat = res.mat(new THREE.MeshStandardMaterial({ color: pal.rail, roughness: 0.8 }));
  const topMat = res.mat(new THREE.MeshStandardMaterial({ color: pal.railTop, roughness: 0.5, emissive: theme === 'volcano' ? pal.railTop : 0x000000, emissiveIntensity: theme === 'volcano' ? 0.6 : 0 }));
  const posts = [];
  for (let i = 0; i < f.N; i += 3) {
    if (!onRail(i)) continue;
    for (const side of [-1, 1]) {
      if (isLedgeWallSide(f, ctx.def, i, side)) continue;
      posts.push([i, side]);
    }
  }
  const postGeo = res.geo(new THREE.BoxGeometry(0.22, 1.25, 0.22).translate(0, 0.62, 0));
  const inst = new THREE.InstancedMesh(postGeo, postMat, posts.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
  posts.forEach(([i, side], k) => {
    p.set(f.px[i] + f.rx[i] * side * (f.hw[i] + 0.55), f.py[i], f.pz[i] + f.rz[i] * side * (f.hw[i] + 0.55));
    q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, Math.atan2(-f.tx[i], -f.tz[i]));
    inst.setMatrixAt(k, m4.compose(p, q, sc));
  });
  inst.castShadow = true;
  inst.computeBoundingSphere();
  group.add(inst);
  res.disposables.push(inst);

  const RAIL = [[0.45, 1.05], [0.65, 1.05], [0.65, 1.3], [0.45, 1.3], [0.45, 1.05]];
  for (const side of [-1, 1]) {
    const runs = runsBy(f, (i) => (onRail(i) && !isLedgeWallSide(f, ctx.def, i, side) ? 'r' : null));
    for (const run of runs) {
      for (const frames of chunkRun(run.frames, 80)) {
        const geo = sweepGeometry(f, frames, RAIL.length, (i, c, o) => {
          o[0] = side * (f.hw[i] + RAIL[c][0]);
          o[1] = RAIL[c][1];
          o[2] = c / 4;
        }, { vScale: 4 });
        const m = new THREE.Mesh(res.geo(geo), topMat);
        m.material.side = THREE.DoubleSide;
        m.castShadow = true;
        group.add(m);
      }
    }
  }
}

/** En cornisas, el lado de la pared de roca no lleva baranda. */
export function isLedgeWallSide(f, def, i, side) {
  if (f.type[i] !== T_NARROW) return false;
  const style = def.segments[f.seg[i]].style;
  return (style === 'ledgeL' && side < 0) || (style === 'ledgeR' && side > 0);
}

// Línea de salida y de meta (tablero de ajedrez sobre el suelo)
function buildLines(f, ctx) {
  const { group, res } = ctx;
  const mat = res.mat(new THREE.MeshStandardMaterial({ map: res.tex(checkerTexture()), roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 }));
  for (const i of [ctx.startLineIndex, f.finishIndex]) {
    const w = 2 * (f.hw[i] + ROAD_MARGIN);
    const plane = new THREE.Mesh(res.geo(new THREE.PlaneGeometry(w, 2.4).rotateX(-Math.PI / 2)), mat);
    placeOnFrame(plane, f, i, 0, 0.03);
    // Inclinar con la pendiente del frame
    plane.rotateX(Math.asin(Math.max(-1, Math.min(1, f.ty[i]))));
    plane.receiveShadow = true;
    group.add(plane);
  }
}
