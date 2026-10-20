// Los 6 poderes de personaje y su carga.
import * as THREE from 'three';
import { EVENTS } from '../core/contracts.js';
import { CHARACTERS, POWER_CHARGE_TIME } from '../core/data.js';

const SISMO_R = 18, SMOKE_R = 6, SMOKE_LIFE = 4;
const _p = new THREE.Vector3();

export function createPowers(ctx) {
  const { game, track, particles, racers } = ctx;
  const smokes = [];
  const self = { smokes };

  self.powerOf = (r) => CHARACTERS.find((c) => c.id === r.kart.characterId)?.power;

  /** Carga por tiempo. */
  self.charge = (r, h) => {
    if (r.kart.frozen || r.kart.finished) return;
    r.charge = Math.min(1, r.charge + h / POWER_CHARGE_TIME);
  };

  /** Usa el poder si está cargado. @returns {boolean} */
  self.use = function use(r) {
    const k = r.kart;
    if (r.charge < 1 || k.frozen || k.finished || k.respawnTimer > 0) return false;
    const id = self.powerOf(r);
    if (id === 'brinco' && !k.grounded) return false;
    r.charge = 0;
    game.events.emit(EVENTS.POWER_USE, { kartId: r.id, powerId: id });
    if (id === 'turbo') {
      k.applyBoost(1.2, 1.5);
    } else if (id === 'sismo') {
      particles.emit('shockwave', k.position, { scale: 1 });
      for (const o of racers) {
        if (o === r || o.kart.finished) continue;
        const dx = o.kart.position.x - k.position.x, dz = o.kart.position.z - k.position.z;
        if (dx * dx + dz * dz > SISMO_R * SISMO_R || Math.abs(o.kart.position.y - k.position.y) > 8) continue;
        if (o.kart.spinOut(1.2)) game.events.emit(EVENTS.HIT, { kartId: o.id, by: r.id });
        if (o.isPlayer) ctx.cam.shake(0.5);
      }
      if (r.isPlayer) ctx.cam.shake(0.4);
    } else if (id === 'burbuja') {
      k.effects.shield = 5;
      k.applyBoost(5, 0.375);
    } else if (id === 'embestida') {
      k.effects.ram = 4;
    } else if (id === 'brinco') {
      k.jump(22.4, 8);
    } else if (id === 'humo') {
      const t = Math.max(0, k.t - 4 / L());
      const s = track.sample(t);
      _p.copy(s.position).addScaledVector(s.right, k.lateral);
      smokes.push({ pos: _p.clone(), life: SMOKE_LIFE, owner: r, puff: 0 });
    }
    return true;
  };
  const L = () => track.length;

  self.update = function update(h) {
    for (let i = smokes.length - 1; i >= 0; i--) {
      const s = smokes[i];
      s.life -= h;
      if (s.life <= 0) { smokes.splice(i, 1); continue; }
      if ((s.puff -= h) <= 0) {
        s.puff = 0.9;
        particles.emit('smoke', s.pos, { scale: 1.2 });
      }
      for (const o of racers) {
        const k = o.kart;
        if (o === s.owner || k.finished || k.frozen) continue;
        const dx = k.position.x - s.pos.x, dz = k.position.z - s.pos.z;
        if (dx * dx + dz * dz < SMOKE_R * SMOKE_R && Math.abs(k.position.y - s.pos.y) < 6) k.slowDown(0.6, 1.5);
      }
    }
    for (const r of racers) {
      const e = r.kart.effects;
      if (e.shield > 0) e.shield = Math.max(0, e.shield - h);
      if (e.ram > 0) e.ram = Math.max(0, e.ram - h);
    }
  };
  self.dispose = () => { smokes.length = 0; };
  return self;
}
