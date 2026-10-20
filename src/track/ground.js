// Consulta de suelo rápida: rejilla uniforme en XZ con los triángulos de las mallas de suelo.
// Equivale a un raycast hacia abajo desde pos.y + 3 contra groundMeshes, pero sin recorrer todas las mallas.
import * as THREE from 'three';

const CELL = 6;

export function createGroundIndex() {
  const tris = [];    // [ax,ay,az,bx,by,bz,cx,cy,cz] por triángulo
  const owners = [];  // malla dueña de cada triángulo
  let grid = null;

  /** Agrega todos los triángulos de una malla (geometría en coordenadas de mundo; la malla no se transforma). */
  function addMesh(mesh) {
    const g = mesh.geometry;
    const p = g.attributes.position.array;
    const idx = g.index ? g.index.array : null;
    const n = idx ? idx.length : p.length / 3;
    for (let k = 0; k < n; k += 3) {
      const a = (idx ? idx[k] : k) * 3, b = (idx ? idx[k + 1] : k + 1) * 3, c = (idx ? idx[k + 2] : k + 2) * 3;
      tris.push(p[a], p[a + 1], p[a + 2], p[b], p[b + 1], p[b + 2], p[c], p[c + 1], p[c + 2]);
      owners.push(mesh);
    }
  }

  function build() {
    const T = new Float32Array(tris);
    const count = T.length / 9;
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    for (let t = 0; t < count; t++) {
      for (let v = 0; v < 3; v++) {
        const x = T[t * 9 + v * 3], z = T[t * 9 + v * 3 + 2];
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
      }
    }
    const nx = Math.ceil((maxX - minX) / CELL) + 1, nz = Math.ceil((maxZ - minZ) / CELL) + 1;
    const buckets = new Map();
    const normals = new Float32Array(count * 3);
    for (let t = 0; t < count; t++) {
      const o = t * 9;
      const x0 = Math.min(T[o], T[o + 3], T[o + 6]), x1 = Math.max(T[o], T[o + 3], T[o + 6]);
      const z0 = Math.min(T[o + 2], T[o + 5], T[o + 8]), z1 = Math.max(T[o + 2], T[o + 5], T[o + 8]);
      for (let cx = Math.floor((x0 - minX) / CELL); cx <= Math.floor((x1 - minX) / CELL); cx++) {
        for (let cz = Math.floor((z0 - minZ) / CELL); cz <= Math.floor((z1 - minZ) / CELL); cz++) {
          const key = cz * nx + cx;
          let b = buckets.get(key);
          if (!b) buckets.set(key, (b = []));
          b.push(t);
        }
      }
      // Normal de cara hacia arriba
      const ux = T[o + 3] - T[o], uy = T[o + 4] - T[o + 1], uz = T[o + 5] - T[o + 2];
      const vx = T[o + 6] - T[o], vy = T[o + 7] - T[o + 1], vz = T[o + 8] - T[o + 2];
      let nx_ = uy * vz - uz * vy, ny_ = uz * vx - ux * vz, nz_ = ux * vy - uy * vx;
      const l = Math.hypot(nx_, ny_, nz_) || 1;
      if (ny_ < 0) { nx_ = -nx_; ny_ = -ny_; nz_ = -nz_; }
      normals[t * 3] = nx_ / l; normals[t * 3 + 1] = ny_ / l; normals[t * 3 + 2] = nz_ / l;
    }
    const cells = new Array(nx * nz);
    for (const [k, v] of buckets) cells[k] = Int32Array.from(v);
    grid = { T, normals, cells, minX, minZ, nx, nz };
  }

  /**
   * Suelo bajo pos: el triángulo más alto con y <= pos.y + 3.
   * @param {THREE.Vector3} pos
   * @param {object} [out] GroundHit a rellenar (opcional, para no crear objetos)
   */
  function getGroundAt(pos, out) {
    if (!grid) return null;
    const { T, normals, cells, minX, minZ, nx, nz } = grid;
    const cx = Math.floor((pos.x - minX) / CELL), cz = Math.floor((pos.z - minZ) / CELL);
    if (cx < 0 || cz < 0 || cx >= nx || cz >= nz) return null;
    const list = cells[cz * nx + cx];
    if (!list) return null;
    const px = pos.x, pz = pos.z, top = pos.y + 3;
    let bestY = -Infinity, bestT = -1;
    for (let q = 0; q < list.length; q++) {
      const t = list[q], o = t * 9;
      const ax = T[o], az = T[o + 2], bx = T[o + 3], bz = T[o + 5], cx2 = T[o + 6], cz2 = T[o + 8];
      const det = (bz - cz2) * (ax - cx2) + (cx2 - bx) * (az - cz2);
      if (Math.abs(det) < 1e-9) continue;
      const l1 = ((bz - cz2) * (px - cx2) + (cx2 - bx) * (pz - cz2)) / det;
      const l2 = ((cz2 - az) * (px - cx2) + (ax - cx2) * (pz - cz2)) / det;
      const l3 = 1 - l1 - l2;
      if (l1 < -1e-5 || l2 < -1e-5 || l3 < -1e-5) continue;
      const y = l1 * T[o + 1] + l2 * T[o + 4] + l3 * T[o + 7];
      if (y <= top && y > bestY) { bestY = y; bestT = t; }
    }
    if (bestT < 0) return null;
    const hit = out ?? { normal: new THREE.Vector3() };
    hit.height = bestY;
    hit.normal.set(normals[bestT * 3], normals[bestT * 3 + 1], normals[bestT * 3 + 2]);
    hit.object = owners[bestT];
    return hit;
  }

  return { addMesh, build, getGroundAt };
}
