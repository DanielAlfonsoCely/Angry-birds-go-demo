// Físicas arcade del kart: aceleración automática, pendiente, giro, derrape con mini-turbo,
// aire con gravedad, truco, aterrizaje, paredes suaves, boosts, golpes y respawn.
// Convención: el modelo mira hacia −Z; steer +1 = derecha (el rumbo/yaw disminuye).
import * as THREE from 'three';
import * as C from './constants.js';

const TAU = Math.PI * 2;
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const AXIS_Z = new THREE.Vector3(0, 0, 1);

// Temporales del módulo (el update es síncrono, se pueden compartir entre karts).
const _f = new THREE.Vector3();
const _r = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const wrapAngle = (a) => {
  a = (a + Math.PI) % TAU;
  return (a < 0 ? a + TAU : a) - Math.PI;
};
const smoothstep = (x) => x * x * (3 - 2 * x);

/** Dirección de avance para un rumbo, proyectada sobre el plano de normal n. */
function forwardOnPlane(heading, n, out) {
  out.set(-Math.sin(heading), 0, -Math.cos(heading));
  out.addScaledVector(n, -out.dot(n));
  return out.normalize();
}

/** Rumbo (yaw) que apunta en la dirección de un vector. */
export function headingFromDir(dir) {
  return Math.atan2(-dir.x, -dir.z);
}

/** Rapidez de giro (rad/s) según la velocidad: cerrado a baja velocidad, estable a alta. */
function turnRate(v) {
  v = Math.abs(v);
  return (C.TURN_RATE * Math.min(1, v / C.TURN_FULL_SPEED)) / (1 + v / C.TURN_SPEED_FALLOFF);
}

/** Multiplicador de la velocidad máxima según la pendiente (slope = sin del ángulo, + = bajada). */
function slopeTopMul(slope) {
  if (slope > C.SLOPE_FLAT_MAX) return 1 + Math.min(C.SLOPE_TOP_MAX_BONUS, (slope - C.SLOPE_FLAT_MAX) * C.SLOPE_TOP_GAIN);
  if (slope < 0) return Math.max(C.SLOPE_UP_TOP_MIN, 1 + slope * C.SLOPE_UP_TOP_LOSS);
  return 1;
}

/**
 * Busca un t de reaparición: si fromT está en una rampa o en un hueco, avanza hasta pasar el hueco.
 * @param {import('../core/contracts.js').Track} track
 */
export function findRespawnT(track, fromT) {
  const step = 2 / track.length;
  let s = track.sample(fromT);
  if (s.hasGround && s.segmentType !== 'jump') return fromT;
  let seenGap = !s.hasGround;
  for (let i = 1; i <= 150; i++) {
    const t = fromT + i * step;
    if (t >= 1) break;
    s = track.sample(t);
    if (!s.hasGround) seenGap = true;
    else if (seenGap) return Math.min(0.999, t + C.RESPAWN_AFTER_GAP / track.length);
    else if (s.segmentType !== 'jump') return t;
  }
  return fromT;
}

/**
 * @param {{id:string, characterId:string, stats:import('../core/contracts.js').KartStats,
 *   position:THREE.Vector3, quaternion:THREE.Quaternion}} opts
 * @returns {import('../core/contracts.js').Kart}
 */
export function createKart({ id, characterId, stats, position, quaternion }) {
  const object3D = new THREE.Group();
  object3D.position.copy(position);
  object3D.quaternion.copy(quaternion);

  // Estado interno
  let heading = new THREE.Euler().setFromQuaternion(quaternion, 'YXZ').y;
  let steerS = 0;               // giro suavizado
  let clock = 0;                // reloj propio (s) para timestamps de eventos
  let boostStrength = 1;
  let spinDuration = 1;
  let trickTime = 0;
  let trickDir = 1;
  let tricksDone = 0;
  let driftYawVis = 0;          // desfase visual del morro al derrapar
  let wallCooldown = 0;
  let kartHitCooldown = 0;
  let lastValidT = 0;
  let settled = false;
  let sample = null;            // última muestra de pista (frame anterior)
  const groundNormal = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion);
  const upVis = groundNormal.clone();
  const padTimes = new Map();   // boost pad → último uso (clock)

  /** Guarda el evento en kart.lastX (mutando, sin crear objetos) y llama kart.onEvent si existe. */
  function emit(type, field, data) {
    const ev = kart[field];
    Object.assign(ev, data);
    ev.time = clock;
    ev.n++;
    kart.onEvent?.(type, ev);
  }

  const kart = {
    id, characterId, object3D, stats,
    position: object3D.position,
    quaternion: object3D.quaternion,
    velocity: new THREE.Vector3(),
    speed: 0, t: 0, lateral: 0,
    grounded: true, drifting: false, driftDir: 0, driftCharge: 0, driftLevel: 0,
    boostTimer: 0, airTime: 0, doingTrick: false, spinTimer: 0, slowTimer: 0, slowFactor: 1,
    frozen: true, finished: false,
    effects: { shield: 0, ram: 0 },

    // --- Extras (fuera del contrato mínimo) ---
    heading: 0,                              // rumbo de avance (yaw), sin derrape/spin/truco
    forward: new THREE.Vector3(0, 0, -1),    // dirección de avance horizontal
    groundNormal,
    groundHeight: position.y,
    trickProgress: 0,                        // 0..1 durante el truco
    trickRoll: 0,                            // ángulo de barrel roll actual (rad)
    respawnTimer: 0,                         // > 0: esperando para salir tras caer al vacío
    pushVelocity: new THREE.Vector3(),       // empuje lateral de choques (decae aparte del agarre)
    track: null,                             // última pista usada en update (la usa la cámara)
    /** Callback opcional (type, data) para eventos: 'land','takeoff','trickStart','trick','driftStart',
     * 'driftBoost','boost','boostPad','wallHit','kartHit','spinOut','respawn'. */
    onEvent: null,
    lastLanding: { impact: 0, angle: 0, airTime: 0, hard: false, time: -1, n: 0 },
    lastTakeoff: { time: -1, n: 0 },
    lastWallHit: { force: 0, time: -1, n: 0 },
    lastDriftBoost: { level: 0, time: -1, n: 0 },
    lastTrick: { success: false, time: -1, n: 0 },
    lastBoostPad: { time: -1, n: 0 },
    lastKartHit: { by: null, force: 0, time: -1, n: 0 },
    lastRespawn: { time: -1, n: 0 },

    update(dt, controls, track) {
      kart.track = track;
      if (dt <= 0) return;
      clock += dt;
      if (kart.frozen) {
        if (!settled) settle(track);
        updateOrientation(dt, true);
        return;
      }
      if (kart.respawnTimer > 0) {
        kart.respawnTimer -= dt;
        kart.velocity.set(0, 0, 0);
        if (kart.respawnTimer <= 0) {
          kart.respawnTimer = 0;
          forwardOnPlane(heading, groundNormal, _f);
          kart.velocity.copy(_f).multiplyScalar(C.RESPAWN_SPEED);
        }
        updateOrientation(dt, true);
        return;
      }

      // Timers
      kart.boostTimer = Math.max(0, kart.boostTimer - dt);
      if (kart.spinTimer > 0) kart.spinTimer = Math.max(0, kart.spinTimer - dt);
      if (kart.slowTimer > 0) {
        kart.slowTimer -= dt;
        if (kart.slowTimer <= 0) { kart.slowTimer = 0; kart.slowFactor = 1; }
      }
      wallCooldown -= dt;
      kartHitCooldown -= dt;

      if (!sample) sample = track.sample(kart.t = track.closestT(kart.position));

      handleDrift(dt, controls);
      handleTrick(dt, controls);

      // Integración en sub-pasos (el frame puede llegar a 50 ms)
      const n = Math.min(C.MAX_SUBSTEPS, Math.ceil(dt / C.MAX_SUBSTEP));
      const h = dt / n;
      const steerTarget = kart.spinTimer > 0 ? 0 : clamp(controls.steer || 0, -1, 1);
      for (let i = 0; i < n; i++) {
        steerS += (steerTarget - steerS) * Math.min(1, h * C.STEER_RESPONSE);
        if (kart.grounded) groundStep(h);
        else airStep(h);
        kart.position.addScaledVector(kart.velocity, h);
        // empuje de choques
        kart.position.addScaledVector(kart.pushVelocity, h);
        kart.pushVelocity.multiplyScalar(Math.exp(-4 * h));
        resolveGround(track);
      }

      trackFrame(dt, track);
      updateOrientation(dt, false);
    },

    applyBoost(duration, strength = 1) {
      const d = duration * stats.boostPower;
      const fresh = kart.boostTimer <= 0;
      boostStrength = fresh ? strength : Math.max(boostStrength, strength);
      kart.boostTimer = Math.max(kart.boostTimer, d);
      if (fresh && !kart.frozen) {
        // empujón inmediato en la dirección de avance
        forwardOnPlane(heading, kart.grounded ? groundNormal : WORLD_UP, _f);
        kart.velocity.addScaledVector(_f, C.BOOST_KICK * strength);
      }
      emit('boost', 'lastBoost', { duration: d, strength });
    },

    spinOut(duration) {
      if (kart.effects.shield > 0 || kart.frozen) return false;
      if (kart.spinTimer <= 0) {
        kart.velocity.x *= C.SPIN_SPEED_KEEP;
        kart.velocity.z *= C.SPIN_SPEED_KEEP;
      }
      kart.spinTimer = Math.max(kart.spinTimer, duration);
      spinDuration = kart.spinTimer;
      kart.boostTimer = 0;
      cancelDrift();
      emit('spinOut', 'lastSpinOut', { duration });
      return true;
    },

    slowDown(factor, duration) {
      if (kart.effects.shield > 0) return false;
      kart.slowFactor = kart.slowTimer > 0 ? Math.min(kart.slowFactor, factor) : factor;
      kart.slowTimer = Math.max(kart.slowTimer, duration);
      return true;
    },

    launch(power) {
      kart.frozen = false;
      settled = true;
      forwardOnPlane(heading, groundNormal, _f);
      kart.velocity.copy(_f).multiplyScalar(C.LAUNCH_BASE_SPEED + clamp(power, 0, 1) * C.LAUNCH_POWER_SPEED);
      kart.speed = kart.velocity.length();
      kart.grounded = true;
    },

    jump(vy, forward = 0) {
      if (kart.frozen) return;
      _f.set(-Math.sin(heading), 0, -Math.cos(heading));
      kart.velocity.addScaledVector(_f, forward);
      kart.velocity.y = Math.max(kart.velocity.y, 0) + vy;
      if (kart.grounded) takeoff();
    },

    respawn(track) {
      respawnAt(track ?? kart.track, 0);
    },

    collideWith(other) {
      collide(kart, other);
    },
  };
  kart.lastBoost = { duration: 0, strength: 0, time: -1, n: 0 };
  kart.lastSpinOut = { duration: 0, time: -1, n: 0 };
  kart.lastTrickStart = { time: -1, n: 0 };
  kart.lastDriftStart = { dir: 0, time: -1, n: 0 };
  kart._hitCooldown = () => kartHitCooldown;
  kart._setHitCooldown = (v) => { kartHitCooldown = v; };
  kart._emit = emit;
  kart._now = () => clock;
  kart.heading = heading;
  kart.forward.set(-Math.sin(heading), 0, -Math.cos(heading));

  // ---------------------------------------------------------------- suelo
  function groundStep(h) {
    const n = groundNormal;
    const v = kart.velocity;
    forwardOnPlane(heading, n, _f);
    _r.crossVectors(_f, n);
    let vF = v.dot(_f);
    let vL = v.dot(_r);
    let vN = v.dot(n);

    // Giro
    const spinning = kart.spinTimer > 0;
    const turn = turnRate(vF) * stats.handling;
    let yaw = 0;
    let follow = 1;
    let grip = C.GRIP;
    if (spinning) {
      grip = C.DRIFT_GRIP;
    } else if (kart.drifting) {
      const d = kart.driftDir;
      yaw = -d * turn * Math.max(0.15, C.DRIFT_TURN_BASE + C.DRIFT_TURN_STEER * steerS * d);
      follow = C.DRIFT_VEL_FOLLOW;
      grip = C.DRIFT_GRIP * stats.handling;
    } else {
      yaw = -steerS * turn;
    }
    if (vF < 0) yaw = -yaw; // marcha atrás: el giro se invierte
    const dYaw = yaw * h;
    heading += dYaw;

    // La velocidad gira con el kart (o en parte, si derrapa): rotamos (vF, vL) en el marco nuevo
    const delta = -(1 - follow) * dYaw;
    if (delta !== 0) {
      const c = Math.cos(delta), s = Math.sin(delta);
      const f2 = vF * c + vL * s;
      vL = vL * c - vF * s;
      vF = f2;
    }
    forwardOnPlane(heading, n, _f);
    _r.crossVectors(_f, n);

    // Agarre lateral: parte de la velocidad lateral que se pierde pasa a avance (arcade, no frena)
    const vL0 = Math.abs(vL);
    vL *= Math.exp(-grip * h);
    if (vF > 0 && !spinning) vF += (vL0 - Math.abs(vL)) * C.GRIP_TRANSFER;

    // Velocidad longitudinal
    const slope = -_f.y; // + = bajada
    let top = stats.topSpeed * kart.slowFactor * slopeTopMul(slope);
    if (kart.drifting) top *= C.DRIFT_SPEED_FACTOR;
    const boosting = kart.boostTimer > 0;
    if (boosting) top *= 1 + C.BOOST_TOP_MULT * boostStrength * stats.boostPower;
    if (spinning) {
      const minV = stats.topSpeed * C.SPIN_MIN_SPEED_FRAC;
      if (vF > minV) vF = Math.max(minV, vF - C.SPIN_DECEL * h);
    } else if (vF < top) {
      let a = stats.accel * Math.max(0.25, 1 - C.ACCEL_FALLOFF * Math.max(0, vF) / stats.topSpeed);
      if (boosting) a = Math.max(a, C.BOOST_ACCEL);
      if (slope > 0) a += C.GRAVITY * slope * C.SLOPE_ACCEL_DOWN;
      vF = Math.min(top, vF + a * h);
    } else {
      const rate = C.OVERSPEED_RATE * (kart.slowTimer > 0 ? 3 : 1);
      vF = Math.max(top, vF - Math.max(C.OVERSPEED_MIN_DECEL, (vF - top) * rate) * h);
    }
    if (slope < 0) vF += C.GRAVITY * slope * C.SLOPE_ACCEL_UP * h;

    // Componente normal: solo la parte normal de la gravedad + adherencia (la tangencial la maneja la pendiente)
    vN += (-C.GRAVITY * n.y - C.GROUND_STICK) * h;

    v.copy(_f).multiplyScalar(vF).addScaledVector(_r, vL).addScaledVector(n, vN);
  }

  // ---------------------------------------------------------------- aire
  function airStep(h) {
    const yaw = kart.spinTimer > 0 ? 0 : -steerS * C.AIR_YAW_RATE * stats.handling;
    const dYaw = yaw * h;
    heading += dYaw;
    const d = dYaw * C.AIR_VEL_FOLLOW;
    if (d !== 0) {
      const v = kart.velocity;
      const c = Math.cos(d), s = Math.sin(d);
      const x = v.x * c + v.z * s;
      v.z = -v.x * s + v.z * c;
      v.x = x;
    }
    kart.velocity.y -= C.GRAVITY * h;
    kart.airTime += h;
  }

  /** Contacto con el suelo tras mover: aterriza, se pega o despega. */
  function resolveGround(track) {
    const hit = track.getGroundAt(kart.position);
    let valid = !!hit && hit.normal.y >= C.MIN_GROUND_NORMAL_Y && hit.height <= kart.position.y + C.MAX_STEP_UP;
    if (valid && sample && !sample.hasGround && hit.height < sample.position.y - C.NO_GROUND_BELOW_TRACK) valid = false;
    if (!valid) {
      if (kart.grounded) takeoff();
      return;
    }
    const gap = kart.position.y - hit.height;
    if (gap <= 0) {
      kart.position.y = hit.height;
      const n = hit.normal;
      const v = kart.velocity;
      const vn = v.dot(n);
      if (vn < 0) v.addScaledVector(n, -vn);
      if (!kart.grounded) land(-vn, n);
      kart.grounded = true;
      groundNormal.copy(n);
      kart.groundHeight = hit.height;
    } else if (kart.grounded && gap < C.GROUND_CONTACT_DIST) {
      // pequeño hueco (cresta suave): sigue en contacto y la adherencia lo baja
      groundNormal.copy(hit.normal);
      kart.groundHeight = hit.height;
    } else if (kart.grounded) {
      takeoff();
    }
  }

  function takeoff() {
    kart.grounded = false;
    kart.airTime = 0;
    tricksDone = 0;
    emit('takeoff', 'lastTakeoff', {});
  }

  function land(impact, n) {
    const air = kart.airTime;
    kart.airTime = 0;
    if (air < C.LANDING_MIN_AIR) {
      if (kart.doingTrick) endTrick(false);
      return;
    }
    const v = kart.velocity;
    const total = Math.hypot(v.length(), impact);
    const angle = Math.asin(clamp(impact / Math.max(total, 1e-3), 0, 1));
    let hard = false;
    if (kart.doingTrick) {
      v.multiplyScalar(1 - C.TRICK_FAIL_LOSS);
      endTrick(false);
    } else if (tricksDone > 0) {
      emit('trick', 'lastTrick', { success: true });
      kart.applyBoost(C.TRICK_BOOST + 0.15 * (tricksDone - 1), 1);
    }
    if (angle > C.LANDING_BAD_ANGLE) {
      v.multiplyScalar(1 - C.LANDING_BAD_LOSS);
      hard = true;
    }
    tricksDone = 0;
    emit('land', 'lastLanding', { impact, angle, airTime: air, hard });
  }

  // ---------------------------------------------------------------- derrape
  function handleDrift(dt, controls) {
    const steer = controls.steer || 0;
    if (!kart.drifting) {
      if (controls.drift && kart.grounded && Math.abs(steer) >= C.DRIFT_STEER_THRESHOLD &&
          kart.speed >= C.DRIFT_MIN_SPEED && kart.spinTimer <= 0) {
        kart.drifting = true;
        kart.driftDir = steer > 0 ? 1 : -1;
        kart.driftCharge = 0;
        kart.driftLevel = 0;
        emit('driftStart', 'lastDriftStart', { dir: kart.driftDir });
      }
      return;
    }
    if (!controls.drift) {
      const level = kart.driftLevel;
      cancelDrift();
      if (level > 0) {
        kart.applyBoost(level === 2 ? C.DRIFT_BOOST2 : C.DRIFT_BOOST1, 1);
        emit('driftBoost', 'lastDriftBoost', { level });
      }
      return;
    }
    if (kart.speed < C.DRIFT_CANCEL_SPEED || kart.spinTimer > 0) {
      cancelDrift();
      return;
    }
    if (kart.grounded) {
      kart.driftCharge += dt;
      kart.driftLevel = kart.driftCharge >= C.DRIFT_LEVEL2_TIME ? 2 : kart.driftCharge >= C.DRIFT_LEVEL1_TIME ? 1 : 0;
    }
  }

  function cancelDrift() {
    kart.drifting = false;
    kart.driftDir = 0;
    kart.driftCharge = 0;
    kart.driftLevel = 0;
  }

  // ---------------------------------------------------------------- truco
  function handleTrick(dt, controls) {
    if (controls.trick && !kart.grounded && !kart.doingTrick && kart.airTime >= C.TRICK_MIN_AIR && kart.spinTimer <= 0) {
      kart.doingTrick = true;
      trickTime = 0;
      trickDir = (controls.steer || 0) < 0 ? -1 : 1;
      emit('trickStart', 'lastTrickStart', {});
    }
    if (kart.doingTrick) {
      trickTime += dt;
      if (trickTime >= C.TRICK_DURATION) {
        kart.doingTrick = false;
        tricksDone++;
        trickTime = 0;
      }
    }
    kart.trickProgress = kart.doingTrick ? trickTime / C.TRICK_DURATION : 0;
    kart.trickRoll = kart.doingTrick ? -trickDir * TAU * smoothstep(kart.trickProgress) : 0;
  }

  function endTrick(success) {
    kart.doingTrick = false;
    trickTime = 0;
    kart.trickProgress = 0;
    kart.trickRoll = 0;
    emit('trick', 'lastTrick', { success });
  }

  // ---------------------------------------------------------------- pista: progreso, paredes, techo, pads
  function trackFrame(dt, track) {
    kart.t = track.closestT(kart.position, kart.t);
    const s = (sample = track.sample(kart.t));
    _a.subVectors(kart.position, s.position);
    kart.lateral = _a.dot(s.right);

    // Pared suave
    const limit = Math.max(0.5, s.halfWidth - C.KART_RADIUS);
    if (Math.abs(kart.lateral) > limit) {
      const side = Math.sign(kart.lateral);
      kart.position.addScaledVector(s.right, -side * (Math.abs(kart.lateral) - limit));
      kart.lateral = side * limit;
      const v = kart.velocity;
      const vOut = v.dot(s.right) * side;
      const pOut = kart.pushVelocity.dot(s.right) * side;
      if (pOut > 0) kart.pushVelocity.addScaledVector(s.right, -side * pOut);
      if (vOut > 0) {
        // quita la componente hacia la pared pero conserva la rapidez (se desvía a lo largo de la pared)
        const hs0 = Math.hypot(v.x, v.z);
        v.addScaledVector(s.right, -side * vOut);
        const hs1 = Math.hypot(v.x, v.z);
        if (hs1 > 1e-3) { v.x *= hs0 / hs1; v.z *= hs0 / hs1; }
        if (vOut > C.WALL_HIT_MIN_SPEED) {
          kart.pushVelocity.addScaledVector(s.right, -side * Math.max(C.WALL_BOUNCE_MIN, vOut * C.WALL_BOUNCE));
          // el rumbo gira hacia la nueva dirección de la velocidad (rebote hacia adentro)
          if (hs1 > 1) {
            const diff = wrapAngle(headingFromDir(v) - heading);
            if (Math.abs(diff) < Math.PI / 2) heading += diff * C.WALL_DEFLECT;
          }
          if (wallCooldown <= 0) {
            if (!(kart.effects.ram > 0)) {
              const loss = C.WALL_SPEED_LOSS * clamp(vOut / 6, 0.4, 1);
              v.x *= 1 - loss;
              v.z *= 1 - loss;
            }
            wallCooldown = C.WALL_HIT_COOLDOWN;
            emit('wallHit', 'lastWallHit', { force: vOut });
          }
        } else if (!(kart.effects.ram > 0)) {
          const k = 1 - C.WALL_SCRAPE_FRICTION * dt;
          v.x *= k;
          v.z *= k;
        }
      }
    }

    // Techo de cueva
    if (s.ceilingHeight != null) {
      const base = kart.grounded ? kart.groundHeight : s.position.y;
      const maxY = base + s.ceilingHeight - C.KART_HEIGHT;
      if (kart.position.y > maxY) {
        kart.position.y = maxY;
        if (kart.velocity.y > 0) kart.velocity.y = 0;
      }
    }

    // Boost pads
    const pads = track.boostPads;
    if (pads && pads.length) {
      for (let i = 0; i < pads.length; i++) {
        const pad = pads[i];
        if (pad.t != null && Math.abs(pad.t - kart.t) * track.length > 40) continue;
        const dx = kart.position.x - pad.position.x;
        const dz = kart.position.z - pad.position.z;
        const r = (pad.radius ?? 2.5) + 0.5;
        if (dx * dx + dz * dz > r * r || Math.abs(kart.position.y - pad.position.y) > C.BOOST_PAD_HEIGHT) continue;
        const last = padTimes.get(pad);
        if (last != null && clock - last < C.BOOST_PAD_COOLDOWN) continue;
        padTimes.set(pad, clock);
        kart.applyBoost(C.BOOST_PAD_DURATION, 1);
        emit('boostPad', 'lastBoostPad', {});
      }
    }

    if (kart.grounded && s.hasGround) lastValidT = kart.t;

    // Velocidad para HUD/IA
    const v = kart.velocity;
    if (kart.grounded) {
      const vn = v.dot(groundNormal);
      kart.speed = Math.sqrt(Math.max(0, v.lengthSq() - vn * vn));
    } else {
      kart.speed = Math.hypot(v.x, v.z);
    }
    kart.heading = heading = wrapAngle(heading);
    kart.forward.set(-Math.sin(heading), 0, -Math.cos(heading));

    // Caída al vacío
    if (kart.position.y < s.position.y - C.FALL_RESPAWN_DEPTH) respawnAt(track, C.FALL_RESPAWN_HOLD);
  }

  // ---------------------------------------------------------------- respawn
  function respawnAt(track, hold) {
    if (!track) return;
    const t = findRespawnT(track, Math.max(lastValidT, 0));
    const s = track.sample(t);
    kart.position.copy(s.position);
    const hit = track.getGroundAt(_a.copy(s.position).addScaledVector(s.up, 1));
    if (hit) {
      kart.position.y = hit.height;
      groundNormal.copy(hit.normal);
      kart.groundHeight = hit.height;
    } else {
      groundNormal.copy(s.up);
    }
    heading = headingFromDir(s.tangent);
    kart.heading = heading;
    kart.forward.set(-Math.sin(heading), 0, -Math.cos(heading));
    upVis.copy(groundNormal);
    kart.t = t;
    kart.lateral = 0;
    lastValidT = t;
    sample = s;
    kart.grounded = true;
    kart.airTime = 0;
    kart.boostTimer = 0;
    kart.spinTimer = 0;
    kart.slowTimer = 0;
    kart.slowFactor = 1;
    kart.pushVelocity.set(0, 0, 0);
    tricksDone = 0;
    driftYawVis = 0;
    steerS = 0;
    cancelDrift();
    if (kart.doingTrick) { kart.doingTrick = false; trickTime = 0; kart.trickProgress = 0; kart.trickRoll = 0; }
    kart.respawnTimer = hold;
    forwardOnPlane(heading, groundNormal, _f);
    if (hold > 0) kart.velocity.set(0, 0, 0);
    else kart.velocity.copy(_f).multiplyScalar(C.RESPAWN_SPEED);
    kart.speed = kart.velocity.length();
    emit('respawn', 'lastRespawn', {});
    updateOrientation(0, true);
  }

  /** Antes de la salida: apoya el kart en el suelo y lo alinea. */
  function settle(track) {
    settled = true;
    const hit = track.getGroundAt(kart.position);
    if (hit) {
      kart.position.y = hit.height;
      groundNormal.copy(hit.normal);
      kart.groundHeight = hit.height;
      upVis.copy(groundNormal);
    }
    kart.t = track.closestT(kart.position);
    sample = track.sample(kart.t);
    lastValidT = kart.t;
  }

  // ---------------------------------------------------------------- orientación visual
  function updateOrientation(dt, instant) {
    // up objetivo
    if (kart.grounded) {
      _a.copy(groundNormal);
    } else {
      _f.set(-Math.sin(heading), 0, -Math.cos(heading));
      const vh = Math.max(1, kart.velocity.dot(_f));
      const pitch = clamp(Math.atan2(kart.velocity.y, vh), -C.AIR_PITCH_MAX, C.AIR_PITCH_MAX) * 0.8;
      _a.copy(WORLD_UP).multiplyScalar(Math.cos(pitch)).addScaledVector(_f, -Math.sin(pitch));
    }
    if (instant) upVis.copy(_a);
    else upVis.lerp(_a, 1 - Math.exp(-(kart.grounded ? C.GROUND_ORIENT_RATE : C.AIR_ORIENT_RATE) * dt)).normalize();

    // desfase de derrape (morro hacia dentro de la curva)
    const driftTarget = kart.drifting
      ? -kart.driftDir * C.DRIFT_VISUAL_ANGLE * (0.75 + 0.25 * steerS * kart.driftDir)
      : 0;
    driftYawVis = instant ? driftTarget : driftYawVis + (driftTarget - driftYawVis) * (1 - Math.exp(-8 * dt));

    let spin = 0;
    if (kart.spinTimer > 0) {
      const p = 1 - kart.spinTimer / Math.max(spinDuration, 1e-3);
      spin = C.SPIN_TURNS * TAU * (1 - (1 - p) * (1 - p));
    }
    const yaw = heading + driftYawVis + spin;

    forwardOnPlane(yaw, upVis, _f);
    _r.crossVectors(_f, upVis);
    _b.copy(_f).negate();
    _m.makeBasis(_r, upVis, _b);
    kart.quaternion.setFromRotationMatrix(_m);
    if (kart.trickRoll) kart.quaternion.multiply(_q.setFromAxisAngle(AXIS_Z, kart.trickRoll));
  }

  return kart;
}

// ---------------------------------------------------------------- choques kart-kart
const _n = new THREE.Vector3();

/** Separa dos karts solapados e intercambia velocidad. Llamar una vez por par. */
function collide(a, b) {
  if (a.frozen || b.frozen || a.respawnTimer > 0 || b.respawnTimer > 0) return;
  _n.subVectors(b.position, a.position);
  const minD = C.KART_COLLIDE_RADIUS * 2;
  if (Math.abs(_n.y) > minD) return;
  _n.y = 0;
  let d = _n.length();
  if (d >= minD) return;
  if (d < 1e-4) { _n.set(-a.forward.z, 0, a.forward.x); d = 1e-4; } else _n.divideScalar(d);
  const overlap = minD - d;

  const aRam = a.effects.ram > 0, bRam = b.effects.ram > 0;
  const aHard = aRam || a.effects.shield > 0;
  const bHard = bRam || b.effects.shield > 0;
  let wa = aHard ? 0 : 1, wb = bHard ? 0 : 1;
  if (wa + wb === 0) { wa = 1; wb = 1; }
  const sum = wa + wb;
  a.position.addScaledVector(_n, -overlap * wa / sum);
  b.position.addScaledVector(_n, overlap * wb / sum);

  // Intercambio de velocidad a lo largo de la normal
  const rel = a.velocity.dot(_n) - b.velocity.dot(_n);
  if (rel > 0) {
    const j = rel * (1 + C.KART_RESTITUTION) / 2;
    a.velocity.addScaledVector(_n, -j * wa * 2 / sum);
    b.velocity.addScaledVector(_n, j * wb * 2 / sum);
  }
  // Empuje lateral
  a.pushVelocity.addScaledVector(_n, -C.KART_PUSH * wa / sum);
  b.pushVelocity.addScaledVector(_n, C.KART_PUSH * wb / sum);
  if (aRam && !(b.effects.shield > 0)) ram(b, _n, 1);
  if (bRam && !(a.effects.shield > 0)) ram(a, _n, -1);

  const force = Math.max(0, rel);
  if (a._hitCooldown() <= 0) { a._setHitCooldown(0.3); a._emit('kartHit', 'lastKartHit', { by: b.id, force }); }
  if (b._hitCooldown() <= 0) { b._setHitCooldown(0.3); b._emit('kartHit', 'lastKartHit', { by: a.id, force }); }
}

function ram(target, n, sign) {
  target.pushVelocity.addScaledVector(n, C.RAM_PUSH * sign);
  target.velocity.x *= 1 - C.RAM_SPEED_LOSS;
  target.velocity.z *= 1 - C.RAM_SPEED_LOSS;
}
