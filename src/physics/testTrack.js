// Pista de pruebas de físicas (NO se importa desde el juego). Cumple el contrato Track con:
// bajada, curva, rampa + hueco + aterrizaje, tramo estrecho, cueva con techo, boost pads,
// una loma con cresta (despegue sin hueco) y una curva cerrada.
// Uso: createTestTrack() o createTestTrack({ layout: 'flat' }) para medir aceleración en plano.
import * as THREE from 'three';

const DS = 1; // metros entre muestras

const LAYOUTS = {
  // tramos: len (m), grade (dy/ds), curv (rad/m, + = izquierda), type, halfWidth, ceiling, gap
  full: [
    { len: 150, grade: -0.14, curv: 0, type: 'open' },
    { len: 110, grade: -0.18, curv: 0.006, type: 'open' },
    { len: 30, grade: -0.18, curv: 0, type: 'open' },
    { len: 22, grade: 0.27, curv: 0, type: 'jump' },              // rampa (~15° hacia arriba)
    { len: 34, grade: -0.55, curv: 0, type: 'jump', gap: true },  // hueco
    { len: 30, grade: -0.5, curv: 0, type: 'jump' },              // aterrizaje en bajada (~27°)
    { len: 30, grade: -0.16, curv: 0, type: 'open' },
    { len: 120, grade: -0.12, curv: 0, type: 'narrow', halfWidth: 3.5, zigzag: true },
    { len: 20, grade: -0.12, curv: 0, type: 'open' },
    { len: 120, grade: -0.14, curv: -0.004, type: 'cave', halfWidth: 5.5, ceiling: 6 },
    { len: 20, grade: -0.14, curv: 0, type: 'open' },
    { len: 100, grade: -0.15, curv: 0, type: 'boost', pads: [0.2, 0.5, 0.8] },
    { len: 40, grade: -0.12, curv: 0, type: 'open' },
    { len: 16, grade: 0.2, curv: 0, type: 'open' },               // loma: sube...
    { len: 30, grade: -0.4, curv: 0, type: 'open' },              // ...y cae (cresta)
    { len: 40, grade: -0.15, curv: 0, type: 'open' },
    { len: 120, grade: -0.15, curv: 0.02, type: 'slalom' },       // curva cerrada (R = 50 m)
    { len: 120, grade: -0.12, curv: 0, type: 'open' },
  ],
  flat: [{ len: 700, grade: 0, curv: 0, type: 'open' }],
};

/** @returns {import('../core/contracts.js').Track} */
export function createTestTrack({ layout = 'full' } = {}) {
  const segs = LAYOUTS[layout] ?? LAYOUTS.full;
  // Integración de la línea central
  const pts = [], halfW = [], hasG = [], types = [], ceil = [];
  const padS = [];
  let x = 0, y = 0, z = 0, yaw = 0, s = 0;
  for (const seg of segs) {
    if (seg.pads) for (const p of seg.pads) padS.push(s + p * seg.len);
    const n = Math.round(seg.len / DS);
    for (let i = 0; i < n; i++) {
      let curv = seg.curv;
      if (seg.zigzag) curv = Math.sin((i / n) * Math.PI * 4) * 0.025;
      pts.push(new THREE.Vector3(x, y, z));
      halfW.push(seg.halfWidth ?? 8);
      hasG.push(!seg.gap);
      types.push(seg.type);
      ceil.push(seg.ceiling ?? null);
      yaw += curv * DS;
      x += -Math.sin(yaw) * DS;
      z += -Math.cos(yaw) * DS;
      y += seg.grade * DS;
      s += DS;
    }
  }
  pts.push(new THREE.Vector3(x, y, z));
  halfW.push(8); hasG.push(true); types.push('open'); ceil.push(null);
  const N = pts.length;
  const length = (N - 1) * DS;

  // Suavizado del ancho para transiciones
  const hw = halfW.map((_, i) => {
    let acc = 0, c = 0;
    for (let k = -6; k <= 6; k++) { const j = Math.min(N - 1, Math.max(0, i + k)); acc += halfW[j]; c++; }
    return acc / c;
  });

  // Marcos
  const tangents = [], rights = [], ups = [];
  const worldUp = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < N; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N - 1, i + 1)];
    const tg = b.clone().sub(a).normalize();
    const r = tg.clone().cross(worldUp).normalize();
    tangents.push(tg); rights.push(r); ups.push(r.clone().cross(tg).normalize());
  }

  // Geometría: suelo (solo donde hay suelo), paredes bajas y techo de cueva
  const group = new THREE.Group();
  const gPos = [], gCol = [], gIdx = [];
  const colors = { open: [0.85, 0.82, 0.75], narrow: [0.6, 0.75, 0.9], cave: [0.5, 0.45, 0.4], jump: [0.95, 0.7, 0.4], boost: [0.7, 0.9, 0.7], slalom: [0.85, 0.75, 0.85] };
  for (let i = 0; i < N; i++) {
    const p = pts[i], r = rights[i], w = hw[i] + 1.5;
    const c = colors[types[i]] ?? colors.open;
    const stripe = (Math.floor(i / 5) % 2) ? 1 : 0.9;
    gPos.push(p.x - r.x * w, p.y - r.y * w, p.z - r.z * w, p.x + r.x * w, p.y + r.y * w, p.z + r.z * w);
    gCol.push(c[0] * stripe, c[1] * stripe, c[2] * stripe, c[0] * stripe, c[1] * stripe, c[2] * stripe);
    if (i < N - 1 && hasG[i] && hasG[i + 1]) {
      const a = i * 2;
      gIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const groundGeo = new THREE.BufferGeometry();
  groundGeo.setAttribute('position', new THREE.Float32BufferAttribute(gPos, 3));
  groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(gCol, 3));
  groundGeo.setIndex(gIdx);
  groundGeo.computeVertexNormals();
  const groundMat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.9 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.receiveShadow = true;
  group.add(ground);

  // Paredes (visuales) en los bordes jugables y techo de cueva
  const wPos = [], wIdx = [];
  const cPos = [], cIdx = [];
  for (let i = 0; i < N; i++) {
    const p = pts[i], r = rights[i];
    const h = ceil[i] ?? 0.8;
    for (const side of [-1, 1]) {
      const bx = p.x + r.x * hw[i] * side, by = p.y + r.y * hw[i] * side, bz = p.z + r.z * hw[i] * side;
      wPos.push(bx, by, bz, bx, by + h, bz);
    }
    const ch = ceil[i] ?? 0;
    cPos.push(p.x - r.x * hw[i], p.y + ch, p.z - r.z * hw[i], p.x + r.x * hw[i], p.y + ch, p.z + r.z * hw[i]);
    if (i < N - 1) {
      const a = i * 4;
      if (hasG[i]) {
        wIdx.push(a, a + 4, a + 1, a + 1, a + 4, a + 5);           // izquierda
        wIdx.push(a + 2, a + 3, a + 6, a + 3, a + 7, a + 6);       // derecha
      }
      if (ceil[i] != null && ceil[i + 1] != null) { const c = i * 2; cIdx.push(c, c + 2, c + 1, c + 1, c + 2, c + 3); }
    }
  }
  const wallGeo = new THREE.BufferGeometry();
  wallGeo.setAttribute('position', new THREE.Float32BufferAttribute(wPos, 3));
  wallGeo.setIndex(wIdx);
  wallGeo.computeVertexNormals();
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xc0504d, side: THREE.DoubleSide });
  group.add(new THREE.Mesh(wallGeo, wallMat));
  const ceilGeo = new THREE.BufferGeometry();
  ceilGeo.setAttribute('position', new THREE.Float32BufferAttribute(cPos, 3));
  ceilGeo.setIndex(cIdx);
  ceilGeo.computeVertexNormals();
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0x5a4a3a, side: THREE.DoubleSide, transparent: true, opacity: 0.55 });
  group.add(new THREE.Mesh(ceilGeo, ceilMat));

  // Boost pads
  const padGeo = new THREE.CircleGeometry(2.5, 20);
  const padMat = new THREE.MeshBasicMaterial({ color: 0x33e0ff, side: THREE.DoubleSide });
  const boostPads = [];
  padS.forEach((ps, k) => {
    const i = Math.round(ps / DS);
    const lat = [0, -4, 4][k % 3];
    const position = pts[i].clone().addScaledVector(rights[i], lat).addScaledVector(ups[i], 0.05);
    const object = new THREE.Mesh(padGeo, padMat);
    object.position.copy(position);
    object.lookAt(position.clone().add(ups[i]));
    group.add(object);
    boostPads.push({ t: (i * DS) / length, position, radius: 2.5, object });
  });

  group.updateMatrixWorld(true);

  const sample = (t) => {
    t = Math.min(1, Math.max(0, t));
    const f = (t * length) / DS;
    const i = Math.min(N - 2, Math.floor(f));
    const k = f - i;
    const j = k < 0.5 ? i : i + 1;
    return {
      position: pts[i].clone().lerp(pts[i + 1], k),
      tangent: tangents[i].clone().lerp(tangents[i + 1], k).normalize(),
      right: rights[i].clone().lerp(rights[i + 1], k).normalize(),
      up: ups[i].clone().lerp(ups[i + 1], k).normalize(),
      halfWidth: hw[i] + (hw[i + 1] - hw[i]) * k,
      segmentType: types[j],
      hasGround: hasG[j],
      ceilingHeight: ceil[j],
    };
  };

  const _d = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);
  const origin = new THREE.Vector3();
  const hits = [];

  return {
    id: 'physics-test', name: 'Banco de pruebas', theme: 'snow', group,
    groundMeshes: [ground], length, sample, boostPads,
    centerline: pts,
    closestT(pos, hintT) {
      let lo = 0, hi = N - 1;
      if (hintT != null) {
        const c = Math.round((hintT * length) / DS);
        lo = Math.max(0, c - 80); hi = Math.min(N - 1, c + 80);
      }
      let best = lo, bestD = Infinity;
      for (let i = lo; i <= hi; i++) {
        const d = pts[i].distanceToSquared(pos);
        if (d < bestD) { bestD = d; best = i; }
      }
      // refinar proyectando sobre el segmento vecino
      const i = Math.min(N - 2, best);
      _d.subVectors(pos, pts[i]);
      const seg = DS;
      const k = Math.min(1, Math.max(-1, _d.dot(tangents[i]) / seg));
      return Math.min(1, Math.max(0, (i + k) * DS / length));
    },
    getGroundAt(pos) {
      origin.set(pos.x, pos.y + 3, pos.z);
      raycaster.set(origin, down);
      hits.length = 0;
      raycaster.intersectObject(ground, false, hits);
      const hit = hits[0];
      if (!hit) return null;
      const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
      if (normal.y < 0) normal.negate();
      return { height: hit.point.y, normal, object: hit.object };
    },
    spawnGrid(count) {
      const out = [];
      for (let i = 0; i < count; i++) {
        const s = sample((6 + Math.floor(i / 2) * 5) / length);
        const position = s.position.clone().addScaledVector(s.right, (i % 2 ? 1 : -1) * 3.5);
        const m = new THREE.Matrix4().lookAt(new THREE.Vector3(), s.tangent, s.up);
        out.push({ position, quaternion: new THREE.Quaternion().setFromRotationMatrix(m) });
      }
      return out;
    },
    coins: [],
    itemBoxes: [],
    update() {},
    dispose() {
      groundGeo.dispose(); wallGeo.dispose(); ceilGeo.dispose(); padGeo.dispose();
      groundMat.dispose(); wallMat.dispose(); ceilMat.dispose(); padMat.dispose();
    },
  };
}
