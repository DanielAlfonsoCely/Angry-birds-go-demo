// Ensambla piloto + kart y lo anima según el estado del Kart de físicas.
import * as THREE from 'three';
import { CHARACTERS } from '../core/data.js';
import { Builder, meshesFrom, getGlowTexture } from './builder.js';
import { KART, buildChassis, buildSteeringWheel, wheelGeometries } from './kart.js';
import { CHARACTER_DEFS, DRIVER_ORIGIN } from './characters.js';

const HEAD_POS = [0, 0.98, -0.02];

// ---------- geometrías cacheadas por personaje ----------
const geoCache = new Map();
function characterGeometries(ch) {
  if (geoCache.has(ch.id)) return geoCache.get(ch.id);
  const def = CHARACTER_DEFS[ch.id] ?? CHARACTER_DEFS.tuko;
  const make = (fn) => {
    const b = new Builder();
    fn(b);
    return b.isEmpty() ? null : b.geometries();
  };
  const g = {
    def,
    body: make((b) => { buildChassis(b, ch.kartColor, def.accent); def.kart(b, ch); }),
    steer: make((b) => buildSteeringWheel(b)),
    torso: make((b) => def.torso(b, ch.furColor)),
    head: make((b) => { def.head(b, ch.furColor); def.browsFn?.(b); }),
    eyes: make((b) => def.eyes(b)),
    tail: make((b) => def.tail(b, ch.furColor)),
    wheelF: wheelGeometries(KART.frontWheel.r, KART.frontWheel.w, def.hub),
    wheelR: wheelGeometries(KART.rearWheel.r, KART.rearWheel.w, def.hub),
  };
  geoCache.set(ch.id, g);
  return g;
}

// ---------- efectos compartidos ----------
let FX = null;
function fx() {
  if (FX) return FX;
  // mezcla normal con colores saturados: lo aditivo desaparece sobre la nieve
  const add = { transparent: true, depthWrite: false, toneMapped: false };
  // llama: cono que se extiende hacia +Z desde la boca del escape
  const flameOuter = new THREE.ConeGeometry(0.13, 0.9, 10, 1, true);
  flameOuter.rotateX(Math.PI / 2);
  flameOuter.translate(0, 0, 0.45);
  const flameInner = new THREE.ConeGeometry(0.07, 0.55, 8, 1, true);
  flameInner.rotateX(Math.PI / 2);
  flameInner.translate(0, 0, 0.27);
  // estrellitas de mareo
  const star = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const r = i % 2 ? 0.06 : 0.14;
    if (i === 0) star.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else star.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const starGeo = new THREE.ExtrudeGeometry(star, { depth: 0.04, bevelEnabled: false });
  starGeo.center();
  FX = {
    flameOuter, flameInner, starGeo,
    flameOuterMat: new THREE.MeshBasicMaterial({ ...add, color: 0xff6a1a, side: THREE.DoubleSide, opacity: 0.85 }),
    flameInnerMat: new THREE.MeshBasicMaterial({ ...add, color: 0xffe066, side: THREE.DoubleSide, opacity: 0.95 }),
    starMat: new THREE.MeshBasicMaterial({ color: 0xffe14d, toneMapped: false }),
    sparkMats: [0x2fb4ff, 0x2fb4ff, 0xff8a1c].map((c) => new THREE.PointsMaterial({
      ...add, color: c, size: 0.32, map: getGlowTexture(), sizeAttenuation: true,
    })),
    shieldGeo: new THREE.IcosahedronGeometry(1.9, 3),
    shieldMat: makeShieldMaterial(),
  };
  return FX;
}

function makeShieldMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uColor: { value: new THREE.Color(0x7fe7ff) }, uOpacity: { value: 1 } }]),
    vertexShader: /* glsl */`
      varying vec3 vN; varying vec3 vV; varying vec3 vP;
      #include <fog_pars_vertex>
      void main(){
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mvPosition.xyz); vP = position;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime; uniform vec3 uColor; uniform float uOpacity;
      varying vec3 vN; varying vec3 vV; varying vec3 vP;
      #include <fog_pars_fragment>
      void main(){
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
        float bands = 0.5 + 0.5 * sin(vP.y * 9.0 - uTime * 4.0);
        float a = (0.08 + f * 0.85 + bands * 0.06) * uOpacity;
        vec3 col = mix(uColor, vec3(1.0), f * 0.6);
        // reflejo tipo pompa
        col += vec3(0.25, 0.1, 0.35) * smoothstep(0.6, 1.0, sin(vP.x * 3.0 + vP.y * 2.0 + uTime));
        gl_FragColor = vec4(col, a);
        #include <fog_fragment>
      }`,
    transparent: true, depthWrite: false, fog: true,
  });
}

const _v = new THREE.Vector3();
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

/**
 * @param {string} characterId
 * @returns {import('../core/contracts.js').KartModel & {setIdle:(on:boolean)=>void, parts:Object}}
 */
export function createKartModel(characterId) {
  const ch = CHARACTERS.find((c) => c.id === characterId) ?? CHARACTERS[0];
  const G = characterGeometries(ch);
  const F = fx();
  const group = new THREE.Group();
  group.name = `kart-${ch.id}`;

  // carrocería (rebota y se inclina sobre las ruedas)
  const body = new THREE.Group();
  group.add(body);
  body.add(meshesFrom(G.body));

  const steerPivot = new THREE.Group();
  steerPivot.position.set(0, KART.steer.y, KART.steer.z);
  steerPivot.rotation.x = -0.95;
  const steerWheel = meshesFrom(G.steer);
  steerPivot.add(steerWheel);
  body.add(steerPivot);

  // piloto
  const driver = new THREE.Group();
  driver.position.set(...DRIVER_ORIGIN);
  body.add(driver);
  driver.add(meshesFrom(G.torso));
  const head = new THREE.Group();
  head.position.set(...HEAD_POS);
  head.add(meshesFrom(G.head));
  driver.add(head);
  const eyes = new THREE.Group();
  eyes.position.set(...G.def.eyesPos);
  if (G.eyes) eyes.add(meshesFrom(G.eyes, { cast: false }));
  head.add(eyes);
  const tail = new THREE.Group();
  tail.position.set(...G.def.tailPos);
  if (G.tail) tail.add(meshesFrom(G.tail));
  driver.add(tail);

  // ruedas
  const wheels = [];
  const frontPivots = [];
  for (const [cfg, geos, front] of [[KART.frontWheel, G.wheelF, true], [KART.rearWheel, G.wheelR, false]]) {
    for (const sx of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(sx * cfg.x, cfg.r, cfg.z);
      const w = meshesFrom(geos);
      pivot.add(w);
      group.add(pivot);
      wheels.push({ mesh: w, r: cfg.r, pivot, baseY: cfg.r });
      if (front) frontPivots.push(pivot);
    }
  }

  // llamas de boost
  const flames = new THREE.Group();
  for (const [x, y, z] of KART.exhaust) {
    const f = new THREE.Group();
    f.position.set(x, y, z + 0.04);
    const o = new THREE.Mesh(F.flameOuter, F.flameOuterMat);
    const i = new THREE.Mesh(F.flameInner, F.flameInnerMat);
    o.renderOrder = 5;
    i.renderOrder = 6;
    f.add(o, i);
    flames.add(f);
  }
  flames.visible = false;
  body.add(flames);

  // chispas de mini-turbo (pocas partículas propias del modelo)
  const SPARKS = 24;
  const sparkGeo = new THREE.BufferGeometry();
  const sparkPos = new Float32Array(SPARKS * 3);
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  sparkGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0.8), 3);
  const sparks = new THREE.Points(sparkGeo, F.sparkMats[0]);
  sparks.visible = false;
  sparks.frustumCulled = false;
  group.add(sparks);
  const sparkLife = new Float32Array(SPARKS);
  const sparkVel = new Float32Array(SPARKS * 3);

  // burbuja de escudo
  const shield = new THREE.Mesh(F.shieldGeo, F.shieldMat);
  shield.position.set(0, 1.0, 0.05);
  shield.scale.set(1.05, 0.85, 1.25);
  shield.visible = false;
  shield.renderOrder = 6;
  group.add(shield);

  // estrellas de mareo
  const stars = new THREE.Group();
  stars.position.set(0, 0.5, 0);
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Mesh(F.starGeo, F.starMat);
    const a = (i / 4) * Math.PI * 2;
    s.position.set(Math.cos(a) * 0.5, Math.sin(i * 2) * 0.06, Math.sin(a) * 0.5);
    stars.add(s);
  }
  stars.visible = false;
  head.add(stars);

  // ---------- estado de animación ----------
  let time = Math.random() * 10;
  let prevYaw = null;
  let steerVis = 0;
  let driftYaw = 0;
  let roll = 0;
  let bounce = 0;
  let bounceV = 0;
  let lastVy = 0;
  let wasGrounded = true;
  let blinkT = 1 + Math.random() * 3;
  let shieldAmt = 0;
  let sparkCursor = 0;
  let idle = false;

  function blink(dt) {
    blinkT -= dt;
    let s = 1;
    if (blinkT < 0.13) s = Math.max(0.08, Math.abs(blinkT - 0.065) / 0.065);
    if (blinkT <= 0) blinkT = 1.8 + Math.random() * 3.5;
    eyes.scale.y = s;
  }

  function updateSparks(dt, kart, active) {
    const level = kart.driftLevel ?? 0;
    sparks.material = F.sparkMats[level >= 2 ? 2 : 0];
    const spawnRate = active ? (level >= 2 ? 60 : 40) : 0;
    let toSpawn = spawnRate * dt + (active ? Math.random() : 0);
    let alive = 0;
    for (let i = 0; i < SPARKS; i++) {
      if (sparkLife[i] <= 0 && toSpawn >= 1) {
        toSpawn -= 1;
        const sx = sparkCursor++ % 2 ? 1 : -1;
        sparkLife[i] = 0.18 + Math.random() * 0.2;
        sparkPos[i * 3] = sx * (KART.rearWheel.x + 0.1);
        sparkPos[i * 3 + 1] = 0.08;
        sparkPos[i * 3 + 2] = KART.rearWheel.z + 0.35;
        sparkVel[i * 3] = sx * (0.5 + Math.random() * 2);
        sparkVel[i * 3 + 1] = 1.5 + Math.random() * 2.5;
        sparkVel[i * 3 + 2] = 1 + Math.random() * 3;
      }
      if (sparkLife[i] > 0) {
        sparkLife[i] -= dt;
        sparkVel[i * 3 + 1] -= 14 * dt;
        sparkPos[i * 3] += sparkVel[i * 3] * dt;
        sparkPos[i * 3 + 1] = Math.max(0.03, sparkPos[i * 3 + 1] + sparkVel[i * 3 + 1] * dt);
        sparkPos[i * 3 + 2] += sparkVel[i * 3 + 2] * dt;
        alive++;
      } else {
        sparkPos[i * 3 + 1] = -100;
      }
    }
    sparks.visible = alive > 0;
    sparkGeo.attributes.position.needsUpdate = true;
  }

  /** @param {number} dt @param {import('../core/contracts.js').Kart} kart */
  function update(dt, kart) {
    time += dt;
    if (idle || !kart) return idleUpdate(dt);
    const speed = kart.speed ?? 0;

    // giro estimado a partir del cambio de yaw
    _v.set(0, 0, -1).applyQuaternion(kart.quaternion);
    const yaw = Math.atan2(-_v.x, -_v.z);
    let yawRate = 0;
    if (prevYaw !== null && dt > 0) {
      let d = yaw - prevYaw;
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      yawRate = d / dt;
    }
    prevYaw = yaw;
    const drifting = kart.drifting && kart.driftDir !== 0;
    let target = THREE.MathUtils.clamp(yawRate / 1.4, -1, 1);
    if (drifting) target = THREE.MathUtils.clamp(target * 0.6 - kart.driftDir * 0.6, -1, 1);
    if (!kart.grounded) target *= 0.4;
    steerVis = damp(steerVis, target, 10, dt);
    driftYaw = damp(driftYaw, drifting ? -kart.driftDir * 0.28 : 0, 6, dt);
    roll = damp(roll, -steerVis * 0.05 + (drifting ? kart.driftDir * 0.06 : 0), 8, dt);

    // ruedas
    const spinDelta = (speed * dt);
    for (const w of wheels) w.mesh.rotation.x -= spinDelta / w.r;
    for (const p of frontPivots) p.rotation.y = steerVis * 0.42;
    steerWheel.rotation.z = steerVis * 1.3;

    // suspensión
    if (!kart.grounded) lastVy = kart.velocity?.y ?? 0;
    if (kart.grounded && !wasGrounded) bounceV -= THREE.MathUtils.clamp(-lastVy * 0.12, 0.6, 3.2);
    wasGrounded = kart.grounded;
    bounceV += (-220 * bounce - 14 * bounceV) * dt;
    bounce += bounceV * dt;
    bounce = THREE.MathUtils.clamp(bounce, -0.16, 0.12);
    const rumble = kart.grounded ? Math.sin(time * 37) * 0.006 * Math.min(1, speed / 25) : 0;
    body.position.y = bounce + rumble;
    body.rotation.set(Math.sin(time * 23) * 0.004 * Math.min(1, speed / 25) - bounce * 0.4, driftYaw, roll);
    const droop = kart.grounded ? 0 : -0.07;
    for (const w of wheels) w.pivot.position.y = damp(w.pivot.position.y, w.baseY + droop, 10, dt);

    // piloto
    driver.rotation.z = steerVis * 0.2;
    driver.rotation.x = -bounce * 1.2;
    const spinning = (kart.spinTimer ?? 0) > 0;
    stars.visible = spinning;
    if (spinning) {
      stars.rotation.y += dt * 7;
      head.rotation.set(Math.sin(time * 9) * 0.15, Math.sin(time * 6) * 0.35, Math.sin(time * 11) * 0.25);
      eyes.scale.y = 0.55 + Math.sin(time * 20) * 0.1;
    } else {
      head.rotation.set(-bounce * 0.8, steerVis * 0.32, steerVis * 0.08);
      blink(dt);
    }
    tail.rotation.y = Math.sin(time * 7) * 0.12 - steerVis * 0.3;
    tail.rotation.x = -Math.min(0.35, speed * 0.008);

    // boost
    const boosting = (kart.boostTimer ?? 0) > 0;
    flames.visible = boosting;
    if (boosting) {
      for (const f of flames.children) {
        const s = 1.1 + Math.random() * 0.45;
        f.scale.set(s, s, 1.0 + Math.random() * 0.9);
      }
    }

    // chispas de mini-turbo
    updateSparks(dt, kart, drifting && kart.grounded && (kart.driftLevel ?? 0) > 0);

    // escudo
    const sh = (kart.effects?.shield ?? 0) > 0;
    shieldAmt = damp(shieldAmt, sh ? 1 : 0, 8, dt);
    shield.visible = shieldAmt > 0.02;
    if (shield.visible) {
      const pulse = 1 + Math.sin(time * 5) * 0.03;
      shield.scale.set(1.05 * pulse * shieldAmt, 0.85 * pulse * shieldAmt, 1.25 * pulse * shieldAmt);
      F.shieldMat.uniforms.uTime.value = time;
    }
  }

  function idleUpdate(dt) {
    body.position.y = Math.sin(time * 2.2) * 0.02;
    body.rotation.set(0, 0, Math.sin(time * 1.3) * 0.015);
    head.rotation.set(Math.sin(time * 1.1) * 0.06, Math.sin(time * 0.7) * 0.35, Math.sin(time * 0.9) * 0.08);
    driver.rotation.z = Math.sin(time * 0.8) * 0.05;
    tail.rotation.y = Math.sin(time * 3) * 0.25;
    for (const p of frontPivots) p.rotation.y = Math.sin(time * 0.6) * 0.15;
    steerWheel.rotation.z = Math.sin(time * 0.6) * 0.45;
    blink(dt);
  }

  return {
    group,
    update,
    setIdle(on) { idle = on; },
    parts: { body, driver, head, eyes, tail, wheels, flames, sparks, shield, stars },
  };
}

/**
 * Mismo modelo con animación idle (para el menú de selección).
 * @returns {{group:THREE.Group, update:(dt:number)=>void}}
 */
export function createCharacterPreview(characterId) {
  const m = createKartModel(characterId);
  m.setIdle(true);
  return { group: m.group, update: (dt) => m.update(dt, null), model: m };
}
