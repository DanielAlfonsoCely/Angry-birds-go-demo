// Cámara de persecución: detrás y arriba del kart, sigue el rumbo (no el roll del truco ni el spin),
// FOV según velocidad/boost, sacudida con "trauma" y límites de suelo y techo de cueva.
import * as THREE from 'three';
import * as C from './constants.js';

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const wrapAngle = (a) => {
  a = (a + Math.PI) % (Math.PI * 2);
  return (a < 0 ? a + Math.PI * 2 : a) - Math.PI;
};

/** @param {THREE.PerspectiveCamera} camera */
export function createChaseCamera(camera) {
  const desired = new THREE.Vector3();
  const look = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  const lastKartPos = new THREE.Vector3();
  const probe = new THREE.Vector3();
  let yaw = 0;
  let camY = 0;
  let dist = C.CAM_DISTANCE;
  let trauma = 0;
  let time = 0;
  let ready = false;
  let landingN = 0;
  let wallN = 0;
  let lookBack = false;
  let flip = false;      // cambio de lado pendiente: se aplica sin interpolar

  function slopeLift(kart) {
    // en bajada, el terreno detrás del kart está más alto: subimos la cámara en proporción
    if (!kart.grounded || !kart.groundNormal) return 0;
    const n = kart.groundNormal;
    const fy = -(fwd.x * n.x + fwd.z * n.z) / Math.max(0.3, n.y); // pendiente de subida hacia adelante
    return Math.max(0, -fy) * dist * 0.85;
  }

  function place(kart, dt, instant) {
    const top = kart.stats?.topSpeed ?? 32;
    const speed = kart.speed ?? 0;
    let heading = kart.heading ?? new THREE.Euler().setFromQuaternion(kart.quaternion, 'YXZ').y;
    if (lookBack) heading += Math.PI;
    const yawNow = instant || flip; // el cambio de lado es instantáneo; la altura conserva su suavizado
    flip = false;
    yaw = yawNow ? heading : yaw + wrapAngle(heading - yaw) * (1 - Math.exp(-C.CAM_YAW_RATE * dt));
    fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw));

    const distTarget = C.CAM_DISTANCE + C.CAM_DISTANCE_SPEED * clamp((speed - top * 0.5) / (top * 0.9), 0, 1);
    dist = instant ? distTarget : dist + (distTarget - dist) * (1 - Math.exp(-3 * dt));

    desired.copy(kart.position).addScaledVector(fwd, -dist);
    const yTarget = kart.position.y + C.CAM_HEIGHT + slopeLift(kart);
    const rate = kart.grounded ? C.CAM_HEIGHT_RATE : C.CAM_AIR_HEIGHT_RATE;
    camY = instant ? yTarget : camY + (yTarget - camY) * (1 - Math.exp(-rate * dt));
    camY = clamp(camY, yTarget - 2.5, yTarget + 4); // no se queda muy atrás en caídas grandes

    // Suelo y techo bajo la cámara
    const track = kart.track;
    if (track) {
      probe.set(desired.x, Math.max(camY, kart.position.y + 1), desired.z);
      const hit = track.getGroundAt(probe);
      if (hit) {
        camY = Math.max(camY, hit.height + C.CAM_MIN_GROUND_CLEARANCE);
        const s = track.sample(kart.t);
        if (s.ceilingHeight != null) camY = Math.min(camY, hit.height + s.ceilingHeight - C.CAM_CEILING_MARGIN);
      }
    }
    desired.y = camY;

    // Sacudida
    let rx = 0, ry = 0, rz = 0, roll = 0;
    if (trauma > 0) {
      const k = trauma * trauma;
      rx = k * C.CAM_SHAKE_AMPLITUDE * (Math.sin(time * 47.3) * 0.6 + Math.sin(time * 23.1 + 1.3) * 0.4);
      ry = k * C.CAM_SHAKE_AMPLITUDE * (Math.sin(time * 39.7 + 2.1) * 0.6 + Math.sin(time * 19.3) * 0.4);
      rz = k * C.CAM_SHAKE_AMPLITUDE * Math.sin(time * 31.9 + 0.7) * 0.5;
      roll = k * C.CAM_SHAKE_ROT * Math.sin(time * 27.7 + 3.1);
    }
    camera.position.set(desired.x + rx, desired.y + ry, desired.z + rz);

    look.copy(kart.position).addScaledVector(fwd, C.CAM_LOOK_AHEAD + speed * 0.08);
    look.y = kart.position.y + C.CAM_LOOK_HEIGHT;
    camera.up.set(0, 1, 0);
    camera.lookAt(look);
    if (roll) camera.rotateZ(roll);

    // FOV
    let fovTarget = C.CAM_FOV_MIN + (C.CAM_FOV_MAX - C.CAM_FOV_MIN) * clamp(speed / top, 0, 1);
    if (kart.boostTimer > 0) {
      fovTarget = Math.max(fovTarget, C.CAM_FOV_MIN + (C.CAM_FOV_BOOST - C.CAM_FOV_MIN) * clamp(speed / (top * 1.4), 0, 1));
    }
    const fov = instant ? fovTarget : camera.fov + (fovTarget - camera.fov) * (1 - Math.exp(-C.CAM_FOV_RATE * dt));
    if (Math.abs(fov - camera.fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    lastKartPos.copy(kart.position);
  }

  return {
    /** Coloca la cámara de golpe detrás del kart. */
    snap(kart) {
      ready = true;
      trauma = 0;
      landingN = kart.lastLanding?.n ?? 0;
      wallN = kart.lastWallHit?.n ?? 0;
      place(kart, 0, true);
    },
    /** Llamar cada frame. Sacude sola al aterrizar o chocar con paredes. */
    follow(kart, dt, opts) {
      if (opts && opts.lookBack !== undefined) this.setLookBack(opts.lookBack);
      if (!ready || lastKartPos.distanceTo(kart.position) > C.CAM_SNAP_DISTANCE) {
        this.snap(kart);
        return;
      }
      time += dt;
      if (kart.lastLanding && kart.lastLanding.n !== landingN) {
        landingN = kart.lastLanding.n;
        this.shake(Math.min(0.8, kart.lastLanding.impact * C.CAM_LANDING_SHAKE));
      }
      if (kart.lastWallHit && kart.lastWallHit.n !== wallN) {
        wallN = kart.lastWallHit.n;
        this.shake(C.CAM_WALL_SHAKE * Math.min(1, kart.lastWallHit.force / 8));
      }
      trauma = Math.max(0, trauma - C.CAM_SHAKE_DECAY * dt);
      place(kart, dt, false);
    },
    /** Mirar atrás: cámara delante del kart apuntando hacia atrás. También: follow(kart, dt, { lookBack }). */
    setLookBack(v) {
      v = !!v;
      if (v !== lookBack) { lookBack = v; flip = true; }
    },
    get lookBack() { return lookBack; },
    /** Agrega sacudida (0..1, se acumula hasta 1). */
    shake(intensity = 0.3) {
      trauma = Math.min(1, trauma + intensity);
    },
  };
}
