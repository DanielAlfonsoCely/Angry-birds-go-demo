// Escena 3D de los menús (un solo modo reutilizable): paisaje nevado con 3 karts para el título
// y un "garaje" con plataforma giratoria para la selección de personaje. La cámara interpola entre vistas.
import * as THREE from 'three';
import { createEnvironment, createKartModel, createProp, createCharacterPreview } from '../art/index.js';

const GARAGE_Z = 60;
const VIEWS = {
  title: { pos: [0, 2.3, 11.5], look: [0, 1.15, 0], fov: 38 },
  garage: { pos: [5.4, 2.5, GARAGE_Z + 9.4], look: [0, 0.8, GARAGE_Z], fov: 34 },
};

const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

export function createMenuStage(game) {
  const scene = new THREE.Scene();
  const env = createEnvironment('snow');
  env.apply(scene);
  scene.add(env.group);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(500, 48),
    new THREE.MeshStandardMaterial({ color: 0xeef5ff, roughness: 0.95, metalness: 0 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // decoración con semilla fija (no se crea nada en el loop)
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const kinds = ['tree', 'tree', 'tree', 'rock', 'crystal', 'snowman', 'bush', 'sign'];
  for (let i = 0; i < 70; i++) {
    const a = rnd() * Math.PI * 2;
    const d = 14 + rnd() * 80;
    const x = Math.sin(a) * d * 1.3;
    const z = GARAGE_Z / 2 - Math.cos(a) * d - 10;
    if (Math.abs(x) < 7 && z > -3 && z < GARAGE_Z + 10) continue; // zona de cámara/karts
    const p = createProp(kinds[Math.floor(rnd() * kinds.length)], 'snow', { variant: i });
    p.position.set(x, 0, z);
    scene.add(p);
  }

  // título: 3 karts
  const titleGroup = new THREE.Group();
  scene.add(titleGroup);
  const heroes = ['mora', 'tuko', 'chispa'].map((id, i) => {
    const m = createKartModel(id);
    m.setIdle?.(true);
    const g = new THREE.Group();
    g.add(m.group);
    g.position.set((i - 1) * 4.4, 0, i === 1 ? 1.8 : -0.4);
    g.scale.setScalar(i === 1 ? 1.25 : 1);
    titleGroup.add(g);
    return { g, m, base: (i - 1) * -0.55 + 0.45, phase: i * 1.7 };
  });

  // garaje: plataforma
  const garage = new THREE.Group();
  garage.position.set(0, 0, GARAGE_Z);
  scene.add(garage);
  const plat = new THREE.Mesh(
    new THREE.CylinderGeometry(3.4, 3.7, 0.35, 40),
    new THREE.MeshStandardMaterial({ color: 0x2a6fdb, roughness: 0.5 }));
  plat.position.y = 0.17;
  plat.receiveShadow = true;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.45, 0.11, 8, 56),
    new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xffa000, emissiveIntensity: 0.6 }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.36;
  garage.add(plat, ring);
  const turntable = new THREE.Group();
  turntable.position.y = 0.35;
  garage.add(turntable);
  const previews = new Map();
  let current = null;
  let popT = 1;

  // cámara
  const cur = { px: 0, py: 0, pz: 0, lx: 0, ly: 0, lz: 0, fov: 38, ox: 0, oy: 0 };
  let view = 'title';
  let off = { x: 0, y: 0 };
  let initialized = false;
  const look = new THREE.Vector3();

  function snap() {
    const v = VIEWS[view];
    [cur.px, cur.py, cur.pz] = v.pos;
    [cur.lx, cur.ly, cur.lz] = v.look;
    cur.fov = v.fov;
    cur.ox = off.x; cur.oy = off.y;
    initialized = true;
  }

  const stage = {
    scene,
    /** Activa la escena: ajusta la cámara compartida. */
    enter() { snap(); },
    /** Libera el desplazamiento de vista para que la carrera use la cámara normal. */
    leave() { game.camera.clearViewOffset(); game.camera.fov = 70; game.camera.updateProjectionMatrix(); initialized = false; },
    /** view: 'title'|'garage'; offset: fracciones del tamaño de pantalla (x,y). */
    setView(name, offset = { x: 0, y: 0 }) {
      view = name;
      off = offset;
      if (!initialized) snap();
    },
    showCharacter(id) {
      if (current?.id === id) return;
      if (current) current.p.group.visible = false;
      let p = previews.get(id);
      if (!p) {
        p = createCharacterPreview(id);
        p.group.rotation.y = 0;
        turntable.add(p.group);
        previews.set(id, p);
      }
      p.group.visible = true;
      current = { id, p };
      popT = 0;
    },
    update(dt, time) {
      env.update(dt, game.camera.position);
      for (const hero of heroes) {
        hero.m.update(dt, null);
        hero.g.rotation.y = Math.PI + hero.base + Math.sin(time * 0.7 + hero.phase) * 0.45;
      }
      if (view === 'garage' && current) {
        current.p.update(dt);
        turntable.rotation.y += dt * 0.55;
        popT = Math.min(1, popT + dt * 3);
        const s = 1 + Math.sin(popT * Math.PI) * 0.12 * (1 - popT);
        current.p.group.scale.setScalar(popT < 1 ? 0.7 + 0.3 * (1 - Math.pow(1 - popT, 3)) * s : 1);
      }
      const cam = game.camera;
      const v = VIEWS[view];
      const k = 3.2;
      const asp = cam.aspect;
      const distK = asp < 1 ? 1 + (1 - asp) * 1.05 : 1; // retrato: más lejos
      cur.px = damp(cur.px, v.pos[0] * 1, k, dt); cur.py = damp(cur.py, v.pos[1], k, dt); cur.pz = damp(cur.pz, v.pos[2], k, dt);
      cur.lx = damp(cur.lx, v.look[0], k, dt); cur.ly = damp(cur.ly, v.look[1], k, dt); cur.lz = damp(cur.lz, v.look[2], k, dt);
      cur.fov = damp(cur.fov, v.fov * distK, k, dt);
      cur.ox = damp(cur.ox, off.x, k, dt); cur.oy = damp(cur.oy, off.y, k, dt);
      // ligero balanceo de cámara en el título
      const sway = view === 'title' ? Math.sin(time * 0.35) * 0.8 : 0;
      cam.position.set(cur.px + sway, cur.py, cur.pz);
      look.set(cur.lx, cur.ly, cur.lz);
      cam.lookAt(look);
      cam.fov = cur.fov;
      const W = window.innerWidth, H = window.innerHeight;
      if (Math.abs(cur.ox) > 0.001 || Math.abs(cur.oy) > 0.001) cam.setViewOffset(W, H, cur.ox * W, cur.oy * H, W, H);
      else cam.clearViewOffset();
      cam.updateProjectionMatrix();
    },
  };
  return stage;
}
