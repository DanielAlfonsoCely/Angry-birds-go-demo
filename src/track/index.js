// STUB del orquestador: pista mínima (cinta en bajada) para que el juego corra.
// El Agente de Pistas reemplaza este módulo respetando el contrato Track (src/core/contracts.js).
import * as THREE from 'three';
import { createProp } from '../art/index.js';

export const TRACKS = [
  { id: 'pico',  name: 'Pico Escarcha', theme: 'snow' },
  { id: 'selva', name: 'Selva Eco',     theme: 'jungle' },
  { id: 'canon', name: 'Cañón Brasa',   theme: 'volcano' },
];

/** @returns {import('../core/contracts.js').Track} */
export function buildTrack(trackId) {
  const meta = TRACKS.find((t) => t.id === trackId) ?? TRACKS[0];
  const pts = [];
  for (let i = 0; i <= 20; i++) {
    pts.push(new THREE.Vector3(Math.sin(i * 0.6) * 40, -i * 18, -i * 90));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const length = curve.getLength();
  const halfWidth = 8;
  const group = new THREE.Group();

  const sample = (t) => {
    t = THREE.MathUtils.clamp(t, 0, 1);
    const position = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const right = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, tangent).normalize();
    return { position, tangent, right, up, halfWidth, segmentType: 'open', hasGround: true, ceilingHeight: null };
  };

  // Cinta de suelo
  const segs = 400;
  const positions = [];
  const indices = [];
  for (let i = 0; i <= segs; i++) {
    const s = sample(i / segs);
    const l = s.position.clone().addScaledVector(s.right, -halfWidth - 2);
    const r = s.position.clone().addScaledVector(s.right, halfWidth + 2);
    positions.push(l.x, l.y, l.z, r.x, r.y, r.z);
    if (i < segs) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xd9cbb0, side: THREE.DoubleSide }));
  ground.receiveShadow = true;
  group.add(ground);

  for (let i = 1; i < 40; i++) {
    const s = sample(i / 40);
    for (const side of [-1, 1]) {
      const p = createProp(i % 3 ? 'tree' : 'rock', meta.theme);
      p.position.copy(s.position).addScaledVector(s.right, side * (halfWidth + 6 + Math.random() * 10));
      group.add(p);
    }
  }

  const raycaster = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);
  const groundMeshes = [ground];

  return {
    id: meta.id, name: meta.name, theme: meta.theme, group, groundMeshes, length,
    sample,
    closestT(pos, hintT) {
      let best = 0, bestD = Infinity;
      const lo = hintT == null ? 0 : Math.max(0, hintT - 0.05);
      const hi = hintT == null ? 1 : Math.min(1, hintT + 0.05);
      for (let i = 0; i <= 200; i++) {
        const t = lo + (hi - lo) * (i / 200);
        const d = curve.getPointAt(t).distanceToSquared(pos);
        if (d < bestD) { bestD = d; best = t; }
      }
      return best;
    },
    getGroundAt(pos) {
      raycaster.set(new THREE.Vector3(pos.x, pos.y + 3, pos.z), down);
      const hit = raycaster.intersectObjects(groundMeshes, false)[0];
      if (!hit) return null;
      const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
      if (normal.y < 0) normal.negate();
      return { height: hit.point.y, normal, object: hit.object };
    },
    spawnGrid(count) {
      const out = [];
      for (let i = 0; i < count; i++) {
        const s = sample(0.004 + Math.floor(i / 2) * 0.004);
        const position = s.position.clone().addScaledVector(s.right, (i % 2 ? 1 : -1) * 3.5);
        const m = new THREE.Matrix4().lookAt(new THREE.Vector3(), s.tangent, s.up);
        out.push({ position, quaternion: new THREE.Quaternion().setFromRotationMatrix(m) });
      }
      return out;
    },
    coins: [],
    itemBoxes: [],
    boostPads: [],
    update() {},
    dispose() { geo.dispose(); },
  };
}
