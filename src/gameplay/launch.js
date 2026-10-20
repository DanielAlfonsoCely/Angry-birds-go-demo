// Catapulta de salida: espera, cuenta 3-2-1-0, medidor triangular y ventana tras el ¡YA!.
import * as THREE from 'three';
import { EVENTS } from '../core/contracts.js';

const WAIT = 0.6;          // s antes del "3"
const METER_PERIOD = 1.2;  // s del medidor triangular
const WINDOW = 0.6;        // s tras el ¡YA! para soltar
const H = 3.5;             // altura de la plataforma (m)
const MAX_YAW = 0.26;      // ±15° de apuntado
const UP_VY = 5;           // impulso hacia arriba al salir
const G = 28;
const DOTS = 16;

const _dir = new THREE.Vector3();
const _p = new THREE.Vector3();
const _d = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3(1, 1, 1);
const _up = new THREE.Vector3(0, 1, 0);

export function ratingFor(v) {
  if (v >= 0.8 && v <= 0.95) return 'perfect';
  if ((v >= 0.5 && v < 0.8) || v > 0.95) return 'good';
  return 'normal';
}

/** @returns {{update:Function, meter:number, started:boolean, dispose:Function}} */
export function createLaunch(ctx) {
  const { game, scene, models, racers, track } = ctx;
  const platGeo = new THREE.BoxGeometry(4.2, H + 2, 6.5);
  const platMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 0.9 });
  // línea punteada de la trayectoria
  const dotGeo = new THREE.SphereGeometry(0.16, 8, 6);
  const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
  const dots = new THREE.InstancedMesh(dotGeo, dotMat, DOTS);
  dots.frustumCulled = false;
  dots.renderOrder = 10;
  scene.add(dots);
  let aim = 0;
  const cats = racers.map((r) => {
    const cat = models.createCatapult();
    // contenedor aplastado en Y: la catapulta no tapa al kart desde la cámara
    const holder = new THREE.Group();
    holder.position.copy(r.base).y += H;
    holder.quaternion.copy(r.kart.quaternion);
    holder.scale.set(1, 0.4, 1);
    holder.add(cat.group);
    scene.add(holder);
    const plat = new THREE.Mesh(platGeo, platMat);
    plat.position.copy(r.base);
    plat.position.y += H - 0.1 - (H + 2) / 2;
    plat.quaternion.copy(r.kart.quaternion);
    plat.translateZ(1.4);
    plat.receiveShadow = true;
    scene.add(plat);
    return { cat, holder, plat, sink: 0, alive: true };
  });
  let clock = 0;
  let lastN = 4;
  let goTime = -1;      // clock del ¡YA!
  let hold = 0;         // s mantenido por el jugador
  let heldAtGo = null;  // ¿mantenía el botón al llegar el ¡YA!?
  let prevHold = false;
  const self = { meter: 0, go: false, holding: false, locked: false };

  function doLaunch(r, power, rating) {
    const k = r.kart;
    k.position.copy(r.base).y += H;
    r.launched = true;
    k.launch(power);
    const yaw = r === racers[0] ? aim : r.aim;
    if (yaw) k.velocity.applyAxisAngle(_up, yaw);
    k.speed = k.velocity.length();
    k.jump(UP_VY, 0);
    cats[r.index].cat.release();
    cats[r.index].sink = 0.001;
    dots.visible = dots.visible && r !== racers[0];
    if (rating === 'perfect') k.applyBoost(1.6, 1);
    else if (rating === 'good') k.applyBoost(0.8, 1);
    game.events.emit(EVENTS.LAUNCH, { kartId: r.id, power, rating });
  }

  // arco balístico estimado según apuntado y medidor
  function updateDots(power) {
    const k = racers[0].kart;
    const sp = 14 + Math.max(0, Math.min(1, power)) * 10;
    _d.set(-Math.sin(k.heading + aim), 0, -Math.cos(k.heading + aim));
    let landed = false;
    for (let i = 0; i < DOTS; i++) {
      const t = (i + 1) * 0.08;
      _p.copy(racers[0].base);
      _p.y += H + 0.4;
      _p.addScaledVector(_d, sp * t);
      _p.y += UP_VY * t - 0.5 * G * t * t;
      // el arco termina donde toca el suelo
      const g = track.getGroundAt(_p);
      if (landed || (g && _p.y < g.height + 0.2)) {
        landed = true;
        _m.makeScale(0, 0, 0);
      } else {
        _m.compose(_p, _q.identity(), _s);
      }
      dots.setMatrixAt(i, _m);
    }
    dots.instanceMatrix.needsUpdate = true;
  }

  /** @param {boolean} playerHuman si el jugador lo maneja una persona */
  self.update = function update(dt, holdKey, playerHuman, steer = 0) {
    clock += dt;
    // cuenta regresiva
    if (lastN > 0) {
      const n = clock < WAIT ? 4 : Math.max(0, 3 - Math.floor(clock - WAIT));
      if (n !== lastN && n <= 3) {
        lastN = n;
        game.events.emit(EVENTS.COUNTDOWN, { n });
        if (n === 0) { goTime = clock; self.go = true; }
      }
    }
    const player = racers[0];
    // karts en la plataforma elevada
    for (const r of racers) {
      if (!r.launched && r !== player) r.kart.position.copy(r.base).y += H;
    }
    if (!player.launched) {
      aim += (-steer * MAX_YAW - aim) * Math.min(1, dt * 8);
      if (!playerHuman) aim = 0;
    }
    // medidor del jugador (solo persona): oscila mientras se mantiene; al soltar queda fijado
    if (playerHuman && !player.launched) {
      if (holdKey) {
        if (self.locked) { self.locked = false; hold = 0; } // re-tensar para reintentar
        hold += dt;
        const ph = (hold % METER_PERIOD) / METER_PERIOD;
        self.meter = ph < 0.5 ? ph * 2 : 2 - ph * 2;
      } else if (prevHold && hold > 0) {
        self.locked = true; // soltó: el valor se queda
      }
      prevHold = holdKey;
      self.holding = holdKey;
      game.events.emit(EVENTS.LAUNCH_METER, { value: self.meter, holding: holdKey, locked: self.locked });
      cats[0].cat.setTension(self.meter);
      // retroceso visual del kart sobre su eje
      _dir.set(0, 0, -1).applyQuaternion(player.kart.quaternion);
      player.kart.position.copy(player.base).addScaledVector(_dir, -cats[0].cat.pullback(self.meter)).y += H;
      updateDots(self.meter);
      if (self.go) {
        if (heldAtGo === null) heldAtGo = holdKey || self.locked;
        if (!heldAtGo) doLaunch(player, 0.3, 'normal');
        else if (self.locked || !holdKey || clock - goTime >= WINDOW) doLaunch(player, self.meter, ratingFor(self.meter));
      }
    } else if (!playerHuman && !player.launched) {
      self.meter = 0;
      player.kart.position.copy(player.base).y += H;
      dots.visible = false;
    }
    // IA (y jugador en autopiloto)
    if (self.go) {
      for (const r of racers) {
        if (r.launched || (r === player && playerHuman)) continue;
        if (clock - goTime >= r.launchAt) doLaunch(r, r.launchPower, ratingFor(r.launchPower));
      }
    }
    for (const c of cats) {
      if (c.sink > 0) {
        c.sink += dt;
        c.plat.position.y -= dt * 9 * c.sink;
        if (c.sink > 1.2) { scene.remove(c.plat); c.sink = -1; }
      }
      if (c.alive && !c.cat.update(dt)) { scene.remove(c.holder); c.alive = false; }
    }
  };

  self.dispose = () => {
    for (const c of cats) { if (c.alive) scene.remove(c.holder); if (c.sink >= 0) scene.remove(c.plat); }
    scene.remove(dots);
    dots.dispose(); dotGeo.dispose(); dotMat.dispose(); platGeo.dispose(); platMat.dispose();
  };
  return self;
}
