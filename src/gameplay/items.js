// Monedas, cajas de objeto y los 4 objetos (cohete, bola de nieve, miel, imán).
import * as THREE from 'three';
import { EVENTS } from '../core/contracts.js';
import { POWER_CHARGE_PER_COIN } from '../core/data.js';

const COIN_R = 3.0, MAGNET_R = 12, COIN_RESPAWN = 6;
const BOX_R = 2.2, BOX_RESPAWN = 3;
const MAGNET_TIME = 6;
const HONEY_R = 2.3, HONEY_LIFE = 22, HONEY_GRACE = 1.5, HONEY_MAX = 12;

const _s = {
  position: new THREE.Vector3(), tangent: new THREE.Vector3(), right: new THREE.Vector3(), up: new THREE.Vector3(),
};
const _m = new THREE.Matrix4();
const _back = new THREE.Vector3();

/** Reparto de objetos según la posición (0 = 1.º, 1 = último). */
function rollItem(frac) {
  const w = [
    ['cohete', 0.12 + 0.33 * frac],
    ['bolaNieve', 0.22 + 0.1 * frac],
    ['miel', 0.38 - 0.28 * frac],
    ['iman', 0.28 - 0.15 * frac],
  ];
  let sum = 0;
  for (const x of w) sum += x[1];
  let r = Math.random() * sum;
  for (const x of w) { r -= x[1]; if (r <= 0) return x[0]; }
  return 'cohete';
}

export function createItems(ctx) {
  const { game, track, scene, models, particles, racers } = ctx;
  const L = track.length;
  const coins = track.coins;
  const boxes = track.itemBoxes;
  const coinT = new Float32Array(coins.length);
  const coinTimer = new Float32Array(coins.length);
  coins.forEach((c, i) => { coinT[i] = track.closestT(c.position); });
  // lateral de las monedas de suelo, ordenadas por t (la IA apunta a las filas); las de aire quedan fuera
  const coinLat = new Float32Array(coins.length);
  const coinGround = new Uint8Array(coins.length);
  coins.forEach((c, i) => {
    track.sample(coinT[i], _s);
    const dx = c.position.x - _s.position.x, dy = c.position.y - _s.position.y, dz = c.position.z - _s.position.z;
    coinLat[i] = dx * _s.right.x + dy * _s.right.y + dz * _s.right.z;
    coinGround[i] = dy < 2.2 && dy > -1 ? 1 : 0;
  });
  const coinOrder = Array.from(coins.keys()).sort((a, b) => coinT[a] - coinT[b]);
  /** Primer índice de coinOrder con t >= t0. */
  function coinFrom(t0) {
    let lo = 0, hi = coinOrder.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (coinT[coinOrder[m]] < t0) lo = m + 1; else hi = m; }
    return lo;
  }
  // t y lateral de cajas y pads (la IA los usa para buscarlos)
  const boxT = new Float32Array(boxes.length);
  const boxLat = new Float32Array(boxes.length);
  boxes.forEach((b, i) => {
    boxT[i] = track.closestT(b.position);
    track.sample(boxT[i], _s);
    boxLat[i] = _s.position.distanceTo(b.position) > 0 ? b.position.clone().sub(_s.position).dot(_s.right) : 0;
  });
  const pads = track.boostPads;
  const padT = new Float32Array(pads.length);
  const padLat = new Float32Array(pads.length);
  pads.forEach((p, i) => {
    padT[i] = p.t ?? track.closestT(p.position);
    track.sample(padT[i], _s);
    padLat[i] = p.position.clone().sub(_s.position).dot(_s.right);
  });

  const balls = [];   // bolas de nieve en vuelo
  const traps = [];   // charcos de miel {group,t,lat,owner,grace,life}
  const self = { coins, traps, boxT, boxLat, padT, padLat, coinT, coinLat, coinGround, coinOrder, coinFrom, coinCount: coins.length };

  function addCharge(r, v) {
    r.charge = Math.min(1, r.charge + v);
  }

  /** Monedas y cajas para un corredor. */
  self.collect = function collect(r, h) {
    const k = r.kart;
    if (k.finished || k.frozen) return;
    const magnet = k.effects.magnet > 0;
    const rad = magnet ? MAGNET_R : COIN_R;
    const tw = (rad + 4) / L;
    for (let i = 0; i < coins.length; i++) {
      const c = coins[i];
      if (c.collected || Math.abs(coinT[i] - k.t) > tw) continue;
      const dx = c.position.x - k.position.x, dy = c.position.y - k.position.y - 0.6, dz = c.position.z - k.position.z;
      if (dx * dx + dy * dy + dz * dz > rad * rad) continue;
      c.collected = true;
      coinTimer[i] = COIN_RESPAWN;
      r.coins++;
      addCharge(r, POWER_CHARGE_PER_COIN);
      if (r.isPlayer) particles.emit('coin', c.position, { count: 5 });
      game.events.emit(EVENTS.COIN, { kartId: r.id, total: r.coins });
    }
    if (r.item) return;
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (!b.active || Math.abs(boxT[i] - k.t) > 6 / L) continue;
      const dx = b.position.x - k.position.x, dz = b.position.z - k.position.z;
      if (dx * dx + dz * dz > BOX_R * BOX_R || Math.abs(b.position.y - k.position.y) > 3.5) continue;
      b.active = false;
      b.respawnTimer = BOX_RESPAWN;
      r.item = rollItem((r.position - 1) / Math.max(1, racers.length - 1));
      particles.emit('itemBox', b.position, { count: r.isPlayer ? 22 : 8 });
      game.events.emit(EVENTS.ITEM_PICKUP, { kartId: r.id, itemId: r.item });
      break;
    }
  };

  /** Usa el objeto del corredor. @returns {boolean} */
  self.use = function use(r) {
    const item = r.item;
    if (!item) return false;
    const k = r.kart;
    if (k.frozen || k.finished) return false;
    r.item = null;
    game.events.emit(EVENTS.ITEM_USE, { kartId: r.id, itemId: item });
    if (item === 'cohete') {
      k.applyBoost(2, 1.1);
    } else if (item === 'iman') {
      k.effects.magnet = MAGNET_TIME;
    } else if (item === 'bolaNieve') {
      // objetivo: el kart inmediatamente por delante
      let target = null;
      for (const o of racers) {
        if (o === r || o.kart.finished || o.kart.t <= k.t) continue;
        if (!target || o.kart.t < target.kart.t) target = o;
      }
      const mesh = models.createSnowball();
      scene.add(mesh);
      balls.push({ mesh, owner: r, target, t: Math.min(1, k.t + 3 / L), lat: k.lateral, life: 4 });
    } else if (item === 'miel') {
      if (traps.length >= HONEY_MAX) removeTrap(0);
      const t = Math.max(0, k.t - 5 / L);
      track.sample(t, _s);
      const group = models.createHoney(Math.floor(Math.random() * 3));
      _back.copy(_s.position).addScaledVector(_s.right, k.lateral);
      const hit = track.getGroundAt(_back);
      if (hit && Math.abs(hit.height - _back.y) < 4) _back.y = hit.height;
      group.position.copy(_back);
      _m.makeBasis(_s.right, _s.up, _s.tangent.clone().negate());
      group.quaternion.setFromRotationMatrix(_m);
      group.rotateY(Math.random() * 6.28);
      scene.add(group);
      traps.push({ group, t, lat: k.lateral, owner: r, grace: HONEY_GRACE, life: HONEY_LIFE });
    }
    return true;
  };

  function removeTrap(i) {
    scene.remove(traps[i].group);
    traps.splice(i, 1);
  }

  function hitBall(b, v) {
    const ok = v.kart.spinOut(1);
    if (ok) game.events.emit(EVENTS.HIT, { kartId: v.id, by: b.owner.id });
    particles.emit('hit', v.kart.position, { count: 14 });
    if (v.isPlayer && ok) ctx.cam.shake(0.45);
  }

  self.update = function update(h) {
    // reaparición de monedas y cajas
    for (let i = 0; i < coins.length; i++) {
      if (coins[i].collected && (coinTimer[i] -= h) <= 0) coins[i].collected = false;
    }
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (!b.active && (b.respawnTimer -= h) <= 0) b.active = true;
    }
    // bolas de nieve
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i];
      const tgt = b.target && !b.target.kart.finished ? b.target.kart : null;
      b.t += (Math.max(55, b.owner.kart.speed + 25) * h) / L;
      if (tgt) b.lat += Math.max(-20 * h, Math.min(20 * h, tgt.lateral - b.lat));
      b.life -= h;
      track.sample(b.t, _s);
      b.mesh.position.copy(_s.position).addScaledVector(_s.right, b.lat).addScaledVector(_s.up, 0.9);
      b.mesh.rotation.x += h * 12;
      let done = b.life <= 0 || b.t >= 1;
      if (!done) {
        for (const v of racers) {
          if (v === b.owner || v.kart.finished) continue;
          if (Math.abs(v.kart.t - b.t) * L < 2.4 && Math.abs(v.kart.lateral - b.lat) < 2.1) {
            hitBall(b, v);
            done = true;
            break;
          }
        }
      }
      if (done) { scene.remove(b.mesh); balls.splice(i, 1); }
    }
    // miel
    for (let i = traps.length - 1; i >= 0; i--) {
      const tr = traps[i];
      tr.life -= h;
      tr.grace -= h;
      if (tr.life <= 0) { removeTrap(i); continue; }
      for (const v of racers) {
        const k = v.kart;
        if (v === tr.owner && tr.grace > 0) continue;
        if (k.finished || k.frozen || Math.abs(k.t - tr.t) * L > 4) continue;
        const dx = k.position.x - tr.group.position.x, dz = k.position.z - tr.group.position.z;
        if (dx * dx + dz * dz < HONEY_R * HONEY_R && Math.abs(k.position.y - tr.group.position.y) < 2.5 && k.grounded) {
          if (k.slowTimer <= 0.2 && v.isPlayer) ctx.cam.shake(0.15);
          k.slowDown(0.5, 1.2);
        }
      }
    }
    // temporizadores de efectos del kart
    for (const r of racers) {
      const e = r.kart.effects;
      if (e.magnet > 0) e.magnet = Math.max(0, e.magnet - h);
    }
  };

  self.dispose = () => {
    for (const b of balls) scene.remove(b.mesh);
    for (const t of traps) scene.remove(t.group);
    balls.length = 0;
    traps.length = 0;
  };
  return self;
}
