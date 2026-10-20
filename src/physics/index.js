// STUB del orquestador: kart que sigue el suelo de forma muy simple.
// El Agente de Físicas reemplaza este módulo respetando el contrato Kart (src/core/contracts.js).
import * as THREE from 'three';
import { UPGRADES } from '../core/data.js';

export const BASE_STATS = { topSpeed: 32, accel: 9, handling: 1, boostPower: 1 };

/** @returns {import('../core/contracts.js').KartStats} */
export function statsWithUpgrades(upgrades = {}) {
  return {
    topSpeed: BASE_STATS.topSpeed * (1 + (upgrades.engine ?? 0) * UPGRADES.engine.perLevel),
    accel: BASE_STATS.accel * (1 + (upgrades.accel ?? 0) * UPGRADES.accel.perLevel),
    handling: BASE_STATS.handling * (1 + (upgrades.handling ?? 0) * UPGRADES.handling.perLevel),
    boostPower: BASE_STATS.boostPower * (1 + (upgrades.boost ?? 0) * UPGRADES.boost.perLevel),
  };
}

/** @returns {import('../core/contracts.js').Kart} */
export function createKart({ id, characterId, stats, position, quaternion }) {
  const object3D = new THREE.Group();
  object3D.position.copy(position);
  object3D.quaternion.copy(quaternion);
  const forward = new THREE.Vector3();
  let heading = new THREE.Euler().setFromQuaternion(quaternion, 'YXZ').y;

  const kart = {
    id, characterId, object3D, stats,
    position: object3D.position, quaternion: object3D.quaternion,
    velocity: new THREE.Vector3(), speed: 0, t: 0, lateral: 0,
    grounded: true, drifting: false, driftDir: 0, driftCharge: 0, driftLevel: 0,
    boostTimer: 0, airTime: 0, doingTrick: false, spinTimer: 0, slowTimer: 0, slowFactor: 1,
    frozen: true, finished: false, effects: { shield: 0, ram: 0 },

    update(dt, controls, track) {
      if (kart.frozen) return;
      kart.boostTimer = Math.max(0, kart.boostTimer - dt);
      kart.spinTimer = Math.max(0, kart.spinTimer - dt);
      const max = stats.topSpeed * (kart.boostTimer > 0 ? 1.4 : 1);
      kart.speed = Math.min(max, kart.speed + stats.accel * dt);
      heading -= controls.steer * 1.6 * dt;
      forward.set(-Math.sin(heading), 0, -Math.cos(heading));
      kart.position.addScaledVector(forward, kart.speed * dt);
      kart.t = track.closestT(kart.position, kart.t);
      const s = track.sample(kart.t);
      kart.lateral = kart.position.clone().sub(s.position).dot(s.right);
      if (Math.abs(kart.lateral) > s.halfWidth) {
        kart.position.addScaledVector(s.right, (Math.sign(kart.lateral) * s.halfWidth) - kart.lateral);
      }
      const g = track.getGroundAt(kart.position);
      if (g) kart.position.y = g.height;
      kart.velocity.copy(forward).multiplyScalar(kart.speed);
      kart.quaternion.setFromEuler(new THREE.Euler(0, heading, 0, 'YXZ'));
    },
    applyBoost(duration) { kart.boostTimer = Math.max(kart.boostTimer, duration); },
    spinOut(duration) { kart.spinTimer = duration; kart.speed *= 0.5; },
    slowDown(factor, duration) { kart.slowFactor = factor; kart.slowTimer = duration; },
    launch(power) { kart.frozen = false; kart.speed = 10 + power * 15; },
    jump() {},
    respawn() {},
    collideWith() {},
  };
  return kart;
}

/** Cámara de persecución. `follow(kart, dt)` cada frame. */
export function createChaseCamera(camera) {
  const target = new THREE.Vector3();
  const desired = new THREE.Vector3();
  return {
    snap(kart) {
      desired.set(0, 3.2, 7.5).applyQuaternion(kart.quaternion).add(kart.position);
      camera.position.copy(desired);
      camera.lookAt(kart.position);
    },
    follow(kart, dt) {
      desired.set(0, 3.2, 7.5).applyQuaternion(kart.quaternion).add(kart.position);
      camera.position.lerp(desired, 1 - Math.exp(-6 * dt));
      target.copy(kart.position).add(new THREE.Vector3(0, 1.2, 0));
      camera.lookAt(target);
    },
    shake() {},
  };
}
