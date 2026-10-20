// Catapulta de salida: espera, cuenta 3-2-1-0, medidor triangular y ventana tras el ¡YA!.
import * as THREE from 'three';
import { EVENTS } from '../core/contracts.js';

const WAIT = 0.6;          // s antes del "3"
const METER_PERIOD = 1.2;  // s del medidor triangular
const WINDOW = 0.6;        // s tras el ¡YA! para soltar

const _dir = new THREE.Vector3();

export function ratingFor(v) {
  if (v >= 0.8 && v <= 0.95) return 'perfect';
  if ((v >= 0.5 && v < 0.8) || v > 0.95) return 'good';
  return 'normal';
}

/** @returns {{update:Function, meter:number, started:boolean, dispose:Function}} */
export function createLaunch(ctx) {
  const { game, scene, models, racers } = ctx;
  const cats = racers.map((r) => {
    const cat = models.createCatapult();
    // contenedor aplastado en Y: la catapulta no tapa al kart desde la cámara
    const holder = new THREE.Group();
    holder.position.copy(r.base);
    holder.quaternion.copy(r.kart.quaternion);
    holder.scale.set(1, 0.4, 1);
    holder.add(cat.group);
    scene.add(holder);
    return { cat, holder, alive: true };
  });
  let clock = 0;
  let lastN = 4;
  let goTime = -1;      // clock del ¡YA!
  let hold = 0;         // s mantenido por el jugador
  let heldAtGo = null;  // ¿mantenía el botón al llegar el ¡YA!?
  const self = { meter: 0, go: false, holding: false };

  function doLaunch(r, power, rating) {
    const k = r.kart;
    k.position.copy(r.base);
    r.launched = true;
    k.launch(power);
    cats[r.index].cat.release();
    if (rating === 'perfect') k.applyBoost(1.6, 1);
    else if (rating === 'good') k.applyBoost(0.8, 1);
    game.events.emit(EVENTS.LAUNCH, { kartId: r.id, power, rating });
  }

  /** @param {boolean} playerHuman si el jugador lo maneja una persona */
  self.update = function update(dt, holdKey, playerHuman) {
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
    // medidor del jugador (solo persona)
    if (playerHuman && !player.launched) {
      if (holdKey) hold += dt; else hold = 0;
      const ph = (hold % METER_PERIOD) / METER_PERIOD;
      self.meter = hold > 0 ? (ph < 0.5 ? ph * 2 : 2 - ph * 2) : 0;
      self.holding = holdKey;
      game.events.emit(EVENTS.LAUNCH_METER, { value: self.meter, holding: holdKey });
      cats[0].cat.setTension(self.meter);
      // retroceso visual del kart sobre su eje
      _dir.set(0, 0, -1).applyQuaternion(player.kart.quaternion);
      player.kart.position.copy(player.base).addScaledVector(_dir, -cats[0].cat.pullback(self.meter));
      if (self.go) {
        if (heldAtGo === null) heldAtGo = holdKey;
        if (!heldAtGo) doLaunch(player, 0.3, 'normal');
        else if (!holdKey || clock - goTime >= WINDOW) doLaunch(player, self.meter, ratingFor(self.meter));
      }
    } else if (!playerHuman && !player.launched) {
      self.meter = 0;
    }
    // IA (y jugador en autopiloto)
    if (self.go) {
      for (const r of racers) {
        if (r.launched || (r === player && playerHuman)) continue;
        if (clock - goTime >= r.launchAt) doLaunch(r, r.launchPower, ratingFor(r.launchPower));
      }
    }
    for (const c of cats) {
      if (c.alive && !c.cat.update(dt)) { scene.remove(c.holder); c.alive = false; }
    }
  };

  self.dispose = () => { for (const c of cats) if (c.alive) scene.remove(c.holder); };
  return self;
}
