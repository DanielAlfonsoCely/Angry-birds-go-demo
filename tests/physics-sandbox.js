// Sandbox visual de físicas sobre la pista de pruebas. Teclado igual que el juego, o ?auto=1.
import * as THREE from 'three';
import { createKart, statsWithUpgrades, createChaseCamera } from '../src/physics/index.js';
import { createTestTrack } from '../src/physics/testTrack.js';
import { Input } from '../src/core/input.js';

const params = new URLSearchParams(location.search);
const auto = params.has('auto');
const startM = Number(params.get('start') ?? 6);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbfd9f2);
scene.fog = new THREE.Fog(0xdfeaf5, 80, 500);
scene.add(new THREE.HemisphereLight(0xffffff, 0x556677, 1.4));
const sun = new THREE.DirectionalLight(0xffffff, 1.8);
sun.position.set(40, 100, 20);
scene.add(sun);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 1500);
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

const track = createTestTrack();
scene.add(track.group);

// Modelo simple: chasis, morro rojo (−Z) y ruedas
function makeModel(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 2.4), new THREE.MeshStandardMaterial({ color }));
  body.position.y = 0.55;
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.3, 0.5), new THREE.MeshStandardMaterial({ color: 0xe63946 }));
  nose.position.set(0, 0.55, -1.4);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.6), new THREE.MeshStandardMaterial({ color: 0x333333 }));
  seat.position.set(0, 1.0, 0.5);
  g.add(body, nose, seat);
  const wg = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 12);
  const wm = new THREE.MeshStandardMaterial({ color: 0x111111 });
  for (const [x, z] of [[-0.85, -0.8], [0.85, -0.8], [-0.85, 0.8], [0.85, 0.8]]) {
    const w = new THREE.Mesh(wg, wm);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.35, z);
    g.add(w);
  }
  return g;
}

const s0 = track.sample(startM / track.length);
const m = new THREE.Matrix4().lookAt(new THREE.Vector3(), s0.tangent, s0.up);
const kart = createKart({ id: 'player', characterId: 'tuko', stats: statsWithUpgrades({}), position: s0.position.clone(), quaternion: new THREE.Quaternion().setFromRotationMatrix(m) });
kart.object3D.add(makeModel(0xffd23f));
scene.add(kart.object3D);
const log = [];
kart.onEvent = (type, d) => log.push({ type, at: +time.toFixed(2), impact: d.impact, success: d.success, level: d.level, force: d.force });

const input = new Input();
const cam = createChaseCamera(camera);
kart.update(0.016, { steer: 0 }, track);
cam.snap(kart);

let time = 0;
let countdown = 1.0;
let trickArmed = true;

function autoControls() {
  const ahead = track.sample(Math.min(1, kart.t + 25 / track.length));
  const to = ahead.position.clone().sub(kart.position);
  const f = kart.forward;
  const steer = THREE.MathUtils.clamp((f.x * to.z - f.z * to.x) * 0.15, -1, 1);
  const meters = kart.t * track.length;
  const c = { steer, drift: false, trick: false, useItem: false, usePower: false, launchHold: false, pause: false };
  if (kart.grounded) trickArmed = true;
  if (!kart.grounded && kart.airTime > 0.12 && trickArmed) { c.trick = true; trickArmed = false; }
  if (meters > 905 && meters < 1000) { c.drift = true; if (!kart.drifting) c.steer = -1; }
  return c;
}

const hud = document.getElementById('hud');
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 1 / 20);
  time += dt;
  input.update();
  const c = auto ? autoControls() : input.getControls();
  if (countdown > 0) {
    countdown -= dt;
    if (countdown <= 0) kart.launch(0.6);
  }
  kart.update(dt, c, track);
  cam.follow(kart, dt);
  renderer.render(scene, camera);
  const sm = track.sample(kart.t);
  hud.textContent =
    `m=${(kart.t * track.length).toFixed(0)} (${sm.segmentType})  v=${kart.speed.toFixed(1)} m/s  ${(kart.speed * 3.6).toFixed(0)} km/h\n` +
    `grounded=${kart.grounded} air=${kart.airTime.toFixed(2)} y=${kart.position.y.toFixed(1)} lat=${kart.lateral.toFixed(1)}\n` +
    `drift=${kart.drifting} lvl=${kart.driftLevel} boost=${kart.boostTimer.toFixed(2)} trick=${kart.doingTrick} fov=${camera.fov.toFixed(1)}\n` +
    log.slice(-4).map((e) => JSON.stringify(e)).join('\n');
});

window.__sb = { kart, track, log, camera };
