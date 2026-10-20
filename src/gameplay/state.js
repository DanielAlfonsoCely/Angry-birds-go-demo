// Estado por corredor y utilidades compartidas entre los módulos de gameplay.
import { statsWithUpgrades } from '../physics/index.js';

/** Controles vacíos reutilizables. */
export function makeControls() {
  return { steer: 0, drift: false, trick: false, useItem: false, usePower: false, launchHold: false, pause: false };
}

/** Crea el estado de un corredor alrededor de su kart. */
export function makeRacer(kart, index, isPlayer) {
  return {
    kart, index, isPlayer,
    id: kart.id,
    item: null,            // itemId | null
    coins: 0,
    charge: 0,             // poder 0..1
    position: index + 1,
    finishOrder: 0,        // 0 = no ha terminado
    finishTime: 0,
    controls: makeControls(),
    base: kart.position.clone(), // posición real en la catapulta (el kart se dibuja retrocedido)
    launched: false,
    launchAt: 0,           // IA: segundo (tras el ¡YA!) en que sale
    launchPower: 0.5,
    rubber: 0,
    baseTop: kart.stats.topSpeed,
    baseAccel: kart.stats.accel,
    ai: {
      seed: Math.random() * 100,
      lane: Math.random() * 2 - 1,
      padLove: Math.random(),
      itemWait: 1, itemAge: 0, lastItem: null,
      powerWait: 1, powerAge: 0, wasReady: false,
      takeoffN: -1, willTrick: false, trickDone: false,
      stuck: 0, driftHold: false,
    },
  };
}

export function upgradesAtLevel(level) {
  return { engine: level, accel: level, handling: level, boost: level };
}

export { statsWithUpgrades };
