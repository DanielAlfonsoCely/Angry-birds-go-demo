// STUB del orquestador: arte con primitivas simples.
// El Agente de Arte/Audio reemplaza este módulo respetando los contratos KartModel, Environment,
// Particles y PROP_KINDS (src/core/contracts.js).
import * as THREE from 'three';
import { CHARACTERS } from '../core/data.js';

/** @returns {import('../core/contracts.js').KartModel} */
export function createKartModel(characterId) {
  const ch = CHARACTERS.find((c) => c.id === characterId) ?? CHARACTERS[0];
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 2.4), new THREE.MeshStandardMaterial({ color: ch.kartColor }));
  body.position.y = 0.5;
  body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), new THREE.MeshStandardMaterial({ color: ch.furColor }));
  head.position.set(0, 1.3, 0.2);
  head.castShadow = true;
  group.add(body, head);
  return { group, update() {} };
}

const THEME_COLORS = {
  snow: { sky: 0xbfd9f2, fog: 0xdfeaf5 },
  jungle: { sky: 0x9fd3a8, fog: 0xa9c9a0 },
  volcano: { sky: 0xd98060, fog: 0x7a3b2e },
};

/** @returns {import('../core/contracts.js').Environment} */
export function createEnvironment(theme) {
  const c = THEME_COLORS[theme] ?? THEME_COLORS.snow;
  const group = new THREE.Group();
  group.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.2));
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(50, 100, 30);
  group.add(sun);
  return {
    group,
    apply(scene) {
      scene.background = new THREE.Color(c.sky);
      scene.fog = new THREE.Fog(c.fog, 80, 600);
    },
    update() {},
  };
}

/** @returns {THREE.Object3D} */
export function createProp(kind) {
  const mat = new THREE.MeshStandardMaterial({ color: kind === 'tree' ? 0x2f6b3a : 0x7d7468 });
  const geo = kind === 'tree' ? new THREE.ConeGeometry(2, 7, 6) : new THREE.DodecahedronGeometry(1.8);
  const m = new THREE.Mesh(geo, mat);
  m.position.y = kind === 'tree' ? 3.5 : 1;
  const g = new THREE.Group();
  g.add(m);
  return g;
}

/** @returns {import('../core/contracts.js').Particles} */
export function createParticles() {
  return { emit() {}, update() {}, dispose() {} };
}
