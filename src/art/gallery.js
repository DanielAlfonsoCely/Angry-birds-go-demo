// Galería de arte para revisar modelos (NO la importa el juego). Abrir /tests/art-gallery.html
// Parámetros: ?view=chars|char|states|props|particles|env &theme=snow|jungle|volcano &angle=front|34|side|back|top &id=tuko
import * as THREE from 'three';
import { CHARACTERS } from '../core/data.js';
import { PROP_KINDS } from '../core/contracts.js';
import { createKartModel, createCharacterPreview, createEnvironment, createProp, createParticles } from './index.js';

const qs = new URLSearchParams(location.search);
const view = qs.get('view') ?? 'chars';
const theme = qs.get('theme') ?? 'snow';
const angle = qs.get('angle') ?? '34';
const charId = qs.get('id') ?? 'tuko';

// navegación rápida
const nav = document.getElementById('nav');
for (const [label, url] of [
  ['personajes 3/4', '?view=chars&angle=34'], ['personajes frente', '?view=chars&angle=front'], ['atrás', '?view=chars&angle=back'],
  ['estados', '?view=states'], ['props nieve', '?view=props&theme=snow'], ['props selva', '?view=props&theme=jungle'],
  ['props volcán', '?view=props&theme=volcano'], ['partículas', `?view=particles&theme=${theme}`],
  ['entorno nieve', '?view=env&theme=snow'], ['entorno selva', '?view=env&theme=jungle'], ['entorno volcán', '?view=env&theme=volcano'],
]) {
  const a = document.createElement('a');
  a.href = url; a.textContent = label;
  nav.appendChild(a);
}
if (qs.has('nonav')) nav.style.display = 'none';

// renderer igual al del juego
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('app').appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 2500);
const scene = new THREE.Scene();

const env = createEnvironment(theme);
env.apply(scene);
scene.add(env.group);

const GROUND = { snow: 0xeef4fb, jungle: 0x6fa84a, volcano: 0x5a3328 };
const ground = new THREE.Mesh(new THREE.CircleGeometry(400, 48), new THREE.MeshStandardMaterial({ color: GROUND[theme] ?? GROUND.snow, roughness: 0.95 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const labels = [];
function label(text, obj, y = 0) {
  const el = document.createElement('div');
  el.className = 'lbl';
  el.textContent = text;
  document.getElementById('labels').appendChild(el);
  labels.push({ el, obj, y });
}

const updaters = [];
let target = new THREE.Vector3(0, 1, 0);

function placeCamera(dist, height, lookY = 1) {
  const a = { front: 0, 34: -0.7, side: -Math.PI / 2, back: Math.PI, top: -0.5 }[angle] ?? -0.7;
  // el kart mira a -Z: la cámara de frente va en -Z
  camera.position.set(Math.sin(a) * dist, angle === 'top' ? height * 3 : height, -Math.cos(a) * dist);
  target.set(0, lookY, 0);
}

// Kart falso con el contrato mínimo para animar estados
function fakeKart(state = {}) {
  return {
    speed: 0, quaternion: new THREE.Quaternion(), velocity: new THREE.Vector3(), grounded: true,
    drifting: false, driftDir: 0, driftLevel: 0, boostTimer: 0, spinTimer: 0, airTime: 0, effects: { shield: 0, ram: 0 },
    ...state,
  };
}

if (view === 'chars') {
  CHARACTERS.forEach((ch, i) => {
    const p = createCharacterPreview(ch.id);
    p.group.position.set((i - 2.5) * 3.1, 0, 0);
    scene.add(p.group);
    updaters.push((dt) => p.update(dt));
    label(`${ch.name} (${ch.animal})`, p.group, 2.6);
  });
  placeCamera(15, 3.6, 1.0);
  camera.fov = 45;
} else if (view === 'char') {
  const p = createCharacterPreview(charId);
  scene.add(p.group);
  updaters.push((dt) => p.update(dt));
  placeCamera(7, 2.6, 1.15);
} else if (view === 'states') {
  const states = [
    ['quieto', {}],
    ['gira izq.', { speed: 20, turn: 1.2 }],
    ['derrape azul', { speed: 22, drifting: true, driftDir: -1, driftLevel: 1, turn: 1.2 }],
    ['derrape naranja', { speed: 22, drifting: true, driftDir: 1, driftLevel: 2, turn: -1.2 }],
    ['boost', { speed: 30, boostTimer: 99 }],
    ['escudo', { speed: 15, effects: { shield: 99, ram: 0 } }],
    ['mareado', { speed: 5, spinTimer: 99 }],
    ['aterrizaje', { speed: 20, land: true }],
  ];
  states.forEach(([name, st], i) => {
    const ch = CHARACTERS[i % CHARACTERS.length];
    const m = createKartModel(qs.get('id') ?? ch.id);
    const k = fakeKart(st);
    const holder = new THREE.Group();
    holder.position.set(((i % 4) - 1.5) * 4.2, 0, Math.floor(i / 4) * 5 - 2.5);
    holder.add(m.group);
    scene.add(holder);
    let yaw = 0;
    let t = 0;
    updaters.push((dt) => {
      t += dt;
      if (st.turn) { yaw += st.turn * dt; k.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw); }
      if (st.land) {
        const ph = t % 1.6;
        k.grounded = ph > 0.6;
        k.velocity.y = -12;
        holder.position.y = k.grounded ? 0 : Math.sin(((ph) / 0.6) * Math.PI) * 1.2;
      }
      m.update(dt, k);
    });
    label(name, holder, 2.7);
  });
  placeCamera(20, 7, 0.8);
} else if (view === 'props') {
  // los pequeños adelante, los grandes atrás
  const order = ['rock', 'bush', 'flower', 'crystal', 'snowman', 'sign', 'lantern', 'mushroom', 'cactus', 'flag', 'geyser', 'ruin', 'tree', 'bigRock'];
  const kinds = [...order, ...PROP_KINDS.filter((k) => k !== 'arch' && !order.includes(k))];
  const cols = 7;
  kinds.forEach((kind, i) => {
    const p = createProp(kind, theme, { light: kind === 'lantern', random: false });
    const col = i % cols;
    const row = Math.floor(i / cols);
    p.position.set((col - (cols - 1) / 2) * 9, 0, row * 13 - 4);
    if (kind === 'sign') p.rotation.y = Math.PI; // el cartel mira a +Z (hacia los karts que bajan)
    scene.add(p);
    label(kind, p, -0.6);
  });
  const arch = createProp('arch', theme);
  arch.position.set(0, 0, 32);
  scene.add(arch);
  label('arch', arch, 11);
  const kart = createKartModel('tuko');
  kart.group.position.set(5, 0, -10);
  scene.add(kart.group);
  label('kart (escala)', kart.group, 2.6);
  camera.fov = 45;
  camera.position.set(0, 18, -42);
  target.set(0, 3, 6);
} else if (view === 'particles') {
  const parts = createParticles(scene, new URLSearchParams(location.search).get("theme") ?? undefined);
  const kinds = ['dust', 'driftSpark', 'boostFlame', 'landing', 'coin', 'itemBox', 'smoke', 'shockwave', 'hit', 'snow', 'ember', 'leaf'];
  const pos = kinds.map((k, i) => new THREE.Vector3(((i % 6) - 2.5) * 6, 0.5, Math.floor(i / 6) * 10 - 4));
  kinds.forEach((k, i) => {
    const o = new THREE.Object3D();
    o.position.copy(pos[i]);
    scene.add(o);
    label(k, o, -0.8);
  });
  const timers = kinds.map(() => 0);
  const rate = { dust: 0.05, driftSpark: 0.04, boostFlame: 0.03, snow: 0.05, ember: 0.08, leaf: 0.1 };
  const once = { landing: 0.9, coin: 0.6, itemBox: 0.7, smoke: 4, shockwave: 1.2, hit: 0.5 };
  const dir = new THREE.Vector3(0, 0, 1);
  updaters.push((dt) => {
    kinds.forEach((k, i) => {
      timers[i] -= dt;
      if (timers[i] <= 0) {
        timers[i] = rate[k] ?? once[k];
        const opts = { direction: dir, color: k === 'driftSpark' ? (Math.floor(performance.now() / 1500) % 2 ? 0xff9a2e : 0x4cc9ff) : undefined };
        parts.emit(k, pos[i], k === 'smoke' ? { ...opts, scale: 0.5 } : k === 'shockwave' ? { ...opts, scale: 0.3 } : opts);
      }
    });
    parts.update(dt);
  });
  camera.fov = 50;
  camera.position.set(0, 9, -17);
  target.set(0, 1, 1.5);
} else if (view === 'env') {
  // pequeño escenario: suelo, props dispersos y un kart en primer plano con cámara de persecución
  const rnd = mulberry(3);
  const kinds = ['tree', 'tree', 'tree', 'rock', 'bigRock', 'bush', 'crystal', 'flower', 'mushroom', 'ruin', 'cactus', 'snowman', 'geyser'];
  for (let i = 0; i < 90; i++) {
    const side = rnd() < 0.5 ? -1 : 1;
    const x = side * (10 + rnd() * 40);
    const z = -rnd() * 160 + 20;
    const p = createProp(kinds[Math.floor(rnd() * kinds.length)], theme);
    p.position.set(x, 0, z);
    scene.add(p);
  }
  const sign = createProp('sign', theme);
  sign.position.set(-9, 0, -18);
  scene.add(sign);
  const arch = createProp('arch', theme);
  arch.position.set(0, 0, -45);
  scene.add(arch);
  for (const [x, z] of [[9, -30], [-9, -60]]) {
    const l = createProp('lantern', theme, { light: true });
    l.position.set(x, 0, z);
    scene.add(l);
  }
  const ids = ['tuko', 'chispa', 'mora'];
  const karts = ids.map((id, i) => {
    const m = createKartModel(id);
    m.group.position.set((i - 1) * 4, 0, -8 - i * 5);
    scene.add(m.group);
    return { m, k: fakeKart({ speed: 25, boostTimer: i === 1 ? 9 : 0, drifting: i === 2, driftDir: -1, driftLevel: i === 2 ? 2 : 0 }) };
  });
  updaters.push((dt) => karts.forEach(({ m, k }) => m.update(dt, k)));
  camera.fov = 70;
  camera.position.set(0, 3.2, 0);
  target.set(0, 1.5, -20);
}

camera.aspect = innerWidth / innerHeight;
camera.updateProjectionMatrix();
camera.lookAt(target);

function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clock = new THREE.Clock();
let frames = 0;
const _p = new THREE.Vector3();
function frame() {
  const dt = Math.min(clock.getDelta(), 1 / 20);
  for (const u of updaters) u(dt);
  env.update(dt, camera.position);
  renderer.render(scene, camera);
  for (const l of labels) {
    l.obj.getWorldPosition(_p);
    _p.y += l.y;
    _p.project(camera);
    l.el.style.left = `${(_p.x * 0.5 + 0.5) * innerWidth}px`;
    l.el.style.top = `${(-_p.y * 0.5 + 0.5) * innerHeight}px`;
    l.el.style.display = _p.z < 1 ? '' : 'none';
  }
  frames++;
  if (frames === 30) {
    window.__ready = true;
    window.__info = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries };
  }
  requestAnimationFrame(frame);
}
frame();
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});
