// Progreso guardado en localStorage. Todo acceso va en try/catch (modo privado, storage bloqueado).
import { MAX_UPGRADE_LEVEL } from './data.js';

const KEY = 'cumbre-rush-save-v1';

function defaults() {
  return {
    coins: 0,
    upgrades: { engine: 0, accel: 0, handling: 0, boost: 0 },
    unlockedCharacters: ['tuko', 'mora', 'chispa'],
    unlockedTracks: ['pico'],
    bestTimes: {},          // { trackId: seconds }
    bestPositions: {},      // { trackId: position }
    selectedCharacter: 'tuko',
    settings: { music: 0.6, sfx: 0.8 },
  };
}

export class SaveData {
  constructor() {
    this.data = defaults();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.data = { ...defaults(), ...JSON.parse(raw) };
    } catch { /* sin storage: se juega sin guardar */ }
  }

  persist() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* ignorar */ }
  }

  addCoins(n) { this.data.coins += n; this.persist(); }

  spend(n) {
    if (this.data.coins < n) return false;
    this.data.coins -= n;
    this.persist();
    return true;
  }

  setUpgrade(stat, level) {
    this.data.upgrades[stat] = Math.min(MAX_UPGRADE_LEVEL, level);
    this.persist();
  }

  unlock(listName, id) {
    const list = this.data[listName];
    if (!list.includes(id)) { list.push(id); this.persist(); }
  }

  reset() { this.data = defaults(); this.persist(); }
}
