// Sistema de pistas: definición por datos (defs/*.js) → línea central + tabla de frames → geometría, objetos y decoración.
// API pública: TRACKS y buildTrack(trackId) (contrato Track en src/core/contracts.js).
import * as THREE from 'three';
import { TRACK_DEFS } from './defs/index.js';
import { buildPath } from './path.js';
import { createQueries } from './query.js';
import { createGroundIndex } from './ground.js';
import { createLighting } from './lighting.js';
import { buildRoad } from './road.js';
import { layoutPickups, buildPickups } from './pickups.js';
import { buildTerrain } from './terrain.js';
import { buildDecor } from './decor.js';

export const TRACKS = [
  { id: 'pico',  name: 'Pico Escarcha', theme: 'snow' },
  { id: 'selva', name: 'Selva Eco',     theme: 'jungle' },
  { id: 'canon', name: 'Cañón Brasa',   theme: 'volcano' },
];

export { TRACK_DEFS } from './defs/index.js';
export { designJump, JUMP_PHYS } from './ballistics.js';

const START_LINE_S = 52;  // línea de salida (m); la parrilla queda detrás
const GRID_FRONT_S = 46;  // primera fila de la parrilla
const GRID_ROW_GAP = 7;
const GRID_LATERAL = 3.4;

// Registro de recursos creados para liberarlos en dispose()
function createResources() {
  const geos = new Set(), mats = new Set(), texs = new Set();
  return {
    disposables: [],
    geo: (g) => (geos.add(g), g),
    mat: (m) => (mats.add(m), m),
    tex: (t) => (texs.add(t), t),
    dispose() {
      for (const g of geos) g.dispose();
      for (const m of mats) m.dispose();
      for (const t of texs) t.dispose();
      for (const d of this.disposables) d.dispose?.();
      geos.clear(); mats.clear(); texs.clear();
    },
  };
}

// Distancia a partir de la cual las mallas de la pista se ocultan (la niebla de cada tema ya las cubre por completo)
const CULL_DIST = { snow: 580, jungle: 460, volcano: 440 };

/**
 * Oculta las mallas lejanas del grupo. Una malla ayudante (sin color) recibe la cámara en onBeforeRender
 * y actualiza `visible` para el siguiente fotograma. No crea objetos en el loop.
 */
function createDistanceCuller(group, far) {
  const items = [];
  group.traverse((o) => {
    if ((!o.isMesh && !o.isInstancedMesh) || !o.geometry) return;
    if (o.isInstancedMesh) { if (!o.boundingSphere) o.computeBoundingSphere(); }
    else if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    const bs = o.isInstancedMesh ? o.boundingSphere : o.geometry.boundingSphere;
    // solo mallas con transformación propia identidad o con centro calculable en mundo
    o.updateWorldMatrix(true, false);
    const c = bs.center.clone().applyMatrix4(o.matrixWorld);
    const r = bs.radius * o.matrixWorld.getMaxScaleOnAxis();
    if (o.name === 'terrain-far' || r > 400) return; // el terreno lejano siempre se dibuja
    items.push({ o, c, r });
  });
  const helper = new THREE.Mesh(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0, 0], 3)),
    new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }),
  );
  helper.frustumCulled = false;
  helper.name = 'distance-culler';
  helper.onBeforeRender = (renderer, scene, camera) => {
    const p = camera.position;
    for (let k = 0; k < items.length; k++) {
      const it = items[k];
      const d = Math.hypot(it.c.x - p.x, it.c.y - p.y, it.c.z - p.z) - it.r;
      it.o.visible = d < far;
    }
  };
  group.add(helper);
  return { helper, items };
}

/** @returns {import('../core/contracts.js').Track} */
export function buildTrack(trackId) {
  const meta = TRACKS.find((t) => t.id === trackId) ?? TRACKS[0];
  const def = TRACK_DEFS[meta.id];
  const f = buildPath(def);
  const { sample, closestT } = createQueries(f);
  const group = new THREE.Group();
  group.name = `track-${meta.id}`;
  const res = createResources();
  const ground = createGroundIndex();
  const light = createLighting(f, meta.theme);
  const startLineIndex = Math.round(START_LINE_S / f.ds);
  const ctx = { theme: meta.theme, def, group, res, ground, light, startLineIndex, frames: f };

  const { groundMeshes, rampBase } = buildRoad(f, ctx);
  ctx.rampBase = rampBase;
  ground.build();
  const layout = layoutPickups(f, def);
  const pickups = buildPickups(f, ctx, layout);
  const terrain = buildTerrain(f, ctx);
  const decor = buildDecor(f, ctx, layout);
  const culler = createDistanceCuller(group, CULL_DIST[meta.theme] ?? 500);

  const _q = new THREE.Quaternion();
  const _m = new THREE.Matrix4();
  const _o = new THREE.Vector3();

  return {
    id: meta.id,
    name: meta.name,
    theme: meta.theme,
    group,
    groundMeshes,
    length: f.length,
    sample,
    closestT,
    getGroundAt: ground.getGroundAt,
    spawnGrid(count) {
      const out = [];
      for (let k = 0; k < count; k++) {
        const s = sample((GRID_FRONT_S - Math.floor(k / 2) * GRID_ROW_GAP) / f.length);
        const position = s.position.clone().addScaledVector(s.right, (k % 2 ? 1 : -1) * GRID_LATERAL);
        const g = ground.getGroundAt(position);
        if (g) position.y = g.height;
        _m.lookAt(_o, s.tangent, s.up);
        out.push({ position, quaternion: _q.setFromRotationMatrix(_m).clone() });
      }
      return out;
    },
    coins: pickups.coins,
    itemBoxes: pickups.itemBoxes,
    boostPads: pickups.boostPads,
    update(dt, time) {
      pickups.update(dt, time);
      terrain.update(dt, time);
      decor.update(dt, time);
    },
    dispose() {
      decor.dispose?.();
      res.dispose();
      group.clear();
    },
    // Extras (fuera del contrato) útiles para depurar / herramientas
    frames: f,
    jumps: f.jumps,
    startLineT: startLineIndex / f.finishIndex,
  };
}
