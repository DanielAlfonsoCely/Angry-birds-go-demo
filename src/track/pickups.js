// Monedas, cajas de objeto y boost pads: posiciones (con PRNG), modelos compartidos (InstancedMesh) y animación.
import * as THREE from 'three';
import { PART } from './path.js';
import { createRng } from './rng.js';
import { JUMP_PHYS } from './ballistics.js';
import { itemBoxTexture, boostArrowTexture, boostBaseTexture } from './textures.js';
import { THEMES } from './themes.js';

const T = { open: 0, narrow: 1, cave: 2, jump: 3, boost: 4, slalom: 5 };
const COIN_H = 1.1, BOX_H = 1.4;
const DEG = Math.PI / 180;

function framePoint(f, i, lateral, dy, out = new THREE.Vector3()) {
  return out.set(f.px[i] + f.rx[i] * lateral, f.py[i] + dy, f.pz[i] + f.rz[i] * lateral);
}

/** Calcula dónde van monedas, cajas y pads. Devuelve listas de {i, lateral, dy} / posiciones. */
export function layoutPickups(f, def) {
  const rng = createRng(def.seed * 7 + 3);
  const lenIdx = (m) => Math.round(m / f.ds);
  const busy = new Uint8Array(f.N); // frames reservados (saltos, cajas, pads)
  const reserve = (i0, i1) => { for (let i = Math.max(0, i0); i <= Math.min(f.N - 1, i1); i++) busy[i] = 1; };

  // Boost pads: uno antes de cada rampa y varios en los tramos 'boost'
  const pads = [];
  for (const j of f.jumps) {
    const i = lenIdx(j.padS);
    pads.push({ i, lateral: 0 });
    reserve(i - 10, j.iLandEnd);
  }
  for (const sg of f.segments) {
    if (sg.type !== 'boost') continue;
    const pattern = [-0.45, 0.45, 0, -0.4, 0.4];
    const n = Math.max(3, Math.min(5, Math.floor((sg.i1 - sg.i0) / 18)));
    for (let k = 0; k < n; k++) {
      const i = Math.round(sg.i0 + ((k + 0.7) / (n + 0.4)) * (sg.i1 - sg.i0));
      pads.push({ i, lateral: pattern[k % pattern.length] * f.hw[i] });
      reserve(i - 6, i + 6);
    }
  }

  // Cajas de objeto: 4 filas a lo ancho
  const boxes = [];
  for (const frac of [0.17, 0.4, 0.63, 0.85]) {
    let i = Math.round(frac * f.finishIndex);
    // buscar el frame válido más cercano (suelo, no cueva/puente, sin reservas, ancho)
    for (let d = 0; d < 200; d++) {
      const ok = (k) => k > 0 && k < f.finishIndex - 40 && f.ground[k] && !busy[k] && f.hw[k] >= 7 && f.part[k] === PART.normal &&
        (f.type[k] === T.open || f.type[k] === T.slalom || f.type[k] === T.boost);
      if (ok(i + d)) { i += d; break; }
      if (ok(i - d)) { i -= d; break; }
    }
    const n = f.hw[i] >= 8 ? 5 : 4;
    for (let k = 0; k < n; k++) {
      const lat = (k / (n - 1) - 0.5) * 2 * (f.hw[i] - 1.8);
      boxes.push({ i, lateral: lat });
    }
    reserve(i - 12, i + 12);
  }

  // Monedas
  const coins = [];
  // Arcos en el aire sobre cada salto (trayectoria a ~38 m/s)
  for (const j of f.jumps) {
    const d = j.design;
    const v = 38;
    const xEnd = d.landX(v) - 8;
    const n = Math.max(8, Math.min(13, Math.round(xEnd / 8)));
    for (let k = 0; k < n; k++) {
      const x = 6 + (k / (n - 1)) * (xEnd - 6);
      coins.push({ world: [j.lip.x + j.fwd.x * x, j.lip.y + d.y(v, x) + COIN_H, j.lip.z + j.fwd.z * x] });
    }
  }
  // Filas sobre la pista
  let i = lenIdx(85);
  let pattern = 0;
  while (i < f.finishIndex - 30) {
    const ok = f.ground[i] && !busy[i] && f.part[i] !== PART.ramp;
    if (!ok) { i += 5; continue; }
    const n = f.type[i] === T.cave || f.type[i] === T.narrow ? 7 : 6;
    const spacing = 4;
    const hw = f.hw[i];
    const base = f.type[i] === T.narrow ? 0 : rng.range(-0.55, 0.55) * hw;
    const kind = pattern++ % 3;
    for (let k = 0; k < n; k++) {
      const ii = i + Math.round((k * spacing) / f.ds);
      if (ii >= f.N || !f.ground[ii] || busy[ii]) break;
      const h = f.hw[ii] - 1.5;
      let lat = base;
      if (kind === 1 && f.type[ii] !== T.narrow) lat = base + (k / (n - 1) - 0.5) * hw * 0.8; // diagonal
      if (kind === 2 && f.type[ii] !== T.narrow) lat = base + Math.sin(k * 0.9) * hw * 0.35; // ondulada
      coins.push({ i: ii, lateral: Math.max(-h, Math.min(h, lat)) });
    }
    i += Math.round(rng.range(38, 52) / f.ds);
  }
  return { pads, boxes, coins };
}

// Estrella de 5 puntas para el relieve de la moneda
function starShape(r1, r0) {
  const s = new THREE.Shape();
  for (let k = 0; k < 10; k++) {
    const r = k % 2 ? r0 : r1, a = (k / 10) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (k === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  s.closePath();
  return s;
}

/** Crea los modelos y las entradas del contrato (coins, itemBoxes, boostPads) + update(). */
export function buildPickups(f, ctx, layout) {
  const { group, res, theme } = ctx;
  const pal = THEMES[theme];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), eul = new THREE.Euler();

  // --- Monedas ---
  const coinBody = res.geo(new THREE.CylinderGeometry(0.72, 0.72, 0.16, 28).rotateX(Math.PI / 2));
  const coinStar = res.geo(new THREE.ExtrudeGeometry(starShape(0.42, 0.18), { depth: 0.22, bevelEnabled: false }).translate(0, 0, -0.11));
  const coinMat = res.mat(new THREE.MeshStandardMaterial({ color: 0xffc928, metalness: 0.85, roughness: 0.25, emissive: 0xb37400, emissiveIntensity: 0.45 }));
  const starMat = res.mat(new THREE.MeshStandardMaterial({ color: 0xfff1a0, metalness: 0.6, roughness: 0.2, emissive: 0xffd040, emissiveIntensity: 0.6 }));
  const coins = layout.coins.map((c, k) => {
    const object = new THREE.Object3D();
    if (c.world) object.position.fromArray(c.world);
    else framePoint(f, c.i, c.lateral, COIN_H, object.position);
    object.name = `coin-${k}`;
    return { position: object.position, collected: false, object, phase: k * 0.37 };
  });
  const coinBodies = new THREE.InstancedMesh(coinBody, coinMat, Math.max(1, coins.length));
  const coinStars = new THREE.InstancedMesh(coinStar, starMat, Math.max(1, coins.length));
  coinBodies.count = coinStars.count = coins.length;
  for (const im of [coinBodies, coinStars]) {
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    im.castShadow = true;
    im.frustumCulled = false; // cubren toda la pista; se dibujan siempre (son pocas)
    group.add(im);
    res.disposables.push(im);
  }

  // --- Cajas de objeto ---
  const boxGeo = res.geo(new THREE.BoxGeometry(1.5, 1.5, 1.5));
  const boxTex = res.tex(itemBoxTexture());
  const boxMat = res.mat(new THREE.MeshStandardMaterial({ map: boxTex, transparent: true, opacity: 0.9, emissive: 0xffffff, emissiveMap: boxTex, emissiveIntensity: 0.45, roughness: 0.2, depthWrite: false, side: THREE.DoubleSide }));
  const coreGeo = res.geo(new THREE.OctahedronGeometry(0.42, 0));
  const coreMat = res.mat(new THREE.MeshBasicMaterial({ color: 0xffffff }));
  const boxes = layout.boxes.map((b, k) => {
    const object = new THREE.Object3D();
    framePoint(f, b.i, b.lateral, BOX_H, object.position);
    object.name = `itemBox-${k}`;
    return { position: object.position, active: true, respawnTimer: 0, object, phase: k * 0.9, vis: 1 };
  });
  const boxMesh = new THREE.InstancedMesh(boxGeo, boxMat, Math.max(1, boxes.length));
  const coreMesh = new THREE.InstancedMesh(coreGeo, coreMat, Math.max(1, boxes.length));
  boxMesh.count = coreMesh.count = boxes.length;
  for (const im of [boxMesh, coreMesh]) {
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    im.frustumCulled = false;
    group.add(im);
    res.disposables.push(im);
  }
  boxMesh.renderOrder = 2;

  // --- Boost pads ---
  const padW = 3.6, padL = 5.6;
  const arrowTex = res.tex(boostArrowTexture(pal.padColor));
  arrowTex.repeat.set(1, 2);
  const baseMat = res.mat(new THREE.MeshStandardMaterial({ map: res.tex(boostBaseTexture(pal.padColor)), roughness: 0.4, metalness: 0.3, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  const arrowMat = res.mat(new THREE.MeshBasicMaterial({ map: arrowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, toneMapped: false }));
  const baseGeo = res.geo(new THREE.PlaneGeometry(padW, padL).rotateX(-Math.PI / 2));
  const arrowGeo = res.geo(new THREE.PlaneGeometry(padW * 0.92, padL * 0.92).rotateX(-Math.PI / 2));
  const boostPads = layout.pads.map((p) => {
    const object = new THREE.Group();
    object.name = 'boostPad';
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.receiveShadow = true;
    const arrows = new THREE.Mesh(arrowGeo, arrowMat);
    arrows.position.y = 0.02;
    object.add(base, arrows);
    framePoint(f, p.i, p.lateral, 0.04, object.position);
    object.rotation.set(0, Math.atan2(-f.tx[p.i], -f.tz[p.i]), 0, 'YXZ');
    object.rotation.x = Math.asin(Math.max(-1, Math.min(1, f.ty[p.i])));
    group.add(object);
    return { t: Math.min(1, p.i / f.finishIndex), position: object.position.clone(), radius: 2.6, object };
  });

  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  function update(dt, time) {
    // Monedas: giran y flotan; las recogidas (o con object.visible = false) se ocultan
    for (let k = 0; k < coins.length; k++) {
      const c = coins[k];
      if (c.collected || !c.object.visible) {
        coinBodies.setMatrixAt(k, hidden);
        coinStars.setMatrixAt(k, hidden);
        continue;
      }
      q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, time * 3.2 + c.phase);
      sc.set(1, 1, 1);
      const y = c.position.y;
      c.position.y = y + Math.sin(time * 2.5 + c.phase) * 0.15;
      m4.compose(c.position, q, sc);
      c.position.y = y;
      coinBodies.setMatrixAt(k, m4);
      coinStars.setMatrixAt(k, m4);
    }
    coinBodies.instanceMatrix.needsUpdate = coinStars.instanceMatrix.needsUpdate = true;
    // Cajas: giran en dos ejes, aparecen/desaparecen escalando
    for (let k = 0; k < boxes.length; k++) {
      const b = boxes[k];
      const target = b.active && b.object.visible ? 1 : 0;
      b.vis += (target - b.vis) * Math.min(1, dt * (target ? 6 : 14));
      if (b.vis < 0.02) {
        boxMesh.setMatrixAt(k, hidden);
        coreMesh.setMatrixAt(k, hidden);
        continue;
      }
      const s = b.vis * (1 + Math.sin(time * 4 + b.phase) * 0.04);
      eul.set(time * 0.9 + b.phase, time * 1.3 + b.phase, 0);
      q.setFromEuler(eul);
      sc.set(s, s, s);
      const y = b.position.y;
      b.position.y = y + Math.sin(time * 2 + b.phase) * 0.18;
      boxMesh.setMatrixAt(k, m4.compose(b.position, q, sc));
      eul.set(-time * 2, time * 2.4, 0);
      q.setFromEuler(eul);
      coreMesh.setMatrixAt(k, m4.compose(b.position, q, sc));
      b.position.y = y;
    }
    boxMesh.instanceMatrix.needsUpdate = coreMesh.instanceMatrix.needsUpdate = true;
    coreMat.color.setHSL((time * 0.15) % 1, 0.9, 0.65);
    boxMat.emissiveIntensity = 0.4 + Math.sin(time * 3) * 0.12;
    // Flechas de los pads avanzan
    arrowTex.offset.y = -(time * 1.6) % 1;
  }
  update(0, 0);
  return { coins, itemBoxes: boxes, boostPads, update };
}

export { COIN_H, DEG, JUMP_PHYS };
