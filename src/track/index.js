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

  const { groundMeshes } = buildRoad(f, ctx);
  ground.build();
  const layout = layoutPickups(f, def);
  const pickups = buildPickups(f, ctx, layout);
  const terrain = buildTerrain(f, ctx);
  const decor = buildDecor(f, ctx, layout);

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
