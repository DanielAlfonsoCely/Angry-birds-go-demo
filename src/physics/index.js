// API pública de físicas (ver contrato Kart en src/core/contracts.js).
import { UPGRADES } from '../core/data.js';
import { BASE_TOP_SPEED, BASE_ACCEL } from './constants.js';

export { createKart, findRespawnT, headingFromDir } from './kart.js';
export { createChaseCamera } from './camera.js';

export const BASE_STATS = { topSpeed: BASE_TOP_SPEED, accel: BASE_ACCEL, handling: 1, boostPower: 1 };

/** @returns {import('../core/contracts.js').KartStats} */
export function statsWithUpgrades(upgrades = {}) {
  return {
    topSpeed: BASE_STATS.topSpeed * (1 + (upgrades.engine ?? 0) * UPGRADES.engine.perLevel),
    accel: BASE_STATS.accel * (1 + (upgrades.accel ?? 0) * UPGRADES.accel.perLevel),
    handling: BASE_STATS.handling * (1 + (upgrades.handling ?? 0) * UPGRADES.handling.perLevel),
    boostPower: BASE_STATS.boostPower * (1 + (upgrades.boost ?? 0) * UPGRADES.boost.perLevel),
  };
}
