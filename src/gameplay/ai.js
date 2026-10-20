// IA: persecución con lookahead, línea interior, búsqueda de cajas/pads, derrape, trucos,
// uso de objetos y poderes. Sirve también para el autopiloto del jugador.
import * as THREE from 'three';

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const mk = () => ({ position: new THREE.Vector3(), tangent: new THREE.Vector3(), right: new THREE.Vector3(), up: new THREE.Vector3() });
const sNear = mk(), sFar = mk(), sTgt = mk(), sEnd = mk();

export function createAI(ctx) {
  const { track, racers, items, powers } = ctx;
  const L = track.length;
  const boxes = track.itemBoxes;
  const dist = (a, b) => (b.kart.t - a.kart.t) * L; // + = b va adelante de a

  function nearestRivals(r) {
    let ahead = Infinity, behind = Infinity;
    for (const o of racers) {
      if (o === r || o.kart.finished) continue;
      const d = dist(r, o);
      if (d >= 0 && d < ahead) ahead = d;
      else if (d < 0 && -d < behind) behind = -d;
    }
    return { ahead, behind };
  }

  /** Controles de un corredor ya terminado: sigue recto más allá de la meta. */
  function finishControls(r, out) {
    const k = r.kart;
    track.sample(1, sEnd);
    const beyond = _dot(k.position, sEnd);
    _tmp.copy(sEnd.position).addScaledVector(sEnd.tangent, beyond + 25);
    _tmp.addScaledVector(sEnd.right, clamp(k.lateral, -6, 6) * 0.5);
    out.steer = steerTo(k, _tmp, 2.2);
    out.drift = out.trick = out.useItem = out.usePower = out.launchHold = false;
  }
  const _tmp = new THREE.Vector3();
  const _d = new THREE.Vector3();
  function _dot(p, s) { return _d.subVectors(p, s.position).dot(s.tangent); }

  function steerTo(k, target, gain) {
    const fx = k.forward.x, fz = k.forward.z;
    const dx = target.x - k.position.x, dz = target.z - k.position.z;
    const tf = dx * fx + dz * fz;
    const tr = -dx * fz + dz * fx;
    return clamp(Math.atan2(tr, tf) * gain, -1, 1);
  }

  /** Rellena `out` (Controls) para el corredor. */
  function control(r, h, raceTime, out) {
    const k = r.kart;
    const ai = r.ai;
    if (k.finished) { finishControls(r, out); return; }
    out.launchHold = false;
    out.pause = false;
    const v = k.speed;
    const look = 10 + 0.55 * v;
    track.sample(k.t, sNear);
    track.sample(Math.min(1, k.t + look / L), sTgt);
    track.sample(Math.min(1, k.t + 40 / L), sFar);
    const curv = sFar.tangent.dot(sNear.right); // + = curva a la derecha
    const hw = sTgt.halfWidth;

    // línea: interior de la curva + ruido + carril propio
    let off = clamp(curv * 2.2, -1, 1) * hw * 0.5 + Math.sin(raceTime * 0.6 + ai.seed) * hw * 0.15 + ai.lane * hw * 0.12;

    // cajas (si no tiene objeto) y pads cercanos
    if (!r.item) {
      let best = 1e9, bl = 0;
      for (let i = 0; i < boxes.length; i++) {
        if (!boxes[i].active) continue;
        const d = (items.boxT[i] - k.t) * L;
        if (d < 4 || d > 55) continue;
        const sc = d * 0.15 + Math.abs(items.boxLat[i] - k.lateral);
        if (sc < best) { best = sc; bl = items.boxLat[i]; }
      }
      if (best < 1e9) off = bl;
    } else if (ai.padLove > 0.4) {
      let bd = 1e9;
      for (let i = 0; i < items.padT.length; i++) {
        const d = (items.padT[i] - k.t) * L;
        if (d < 4 || d > 40 || d > bd) continue;
        bd = d;
        off = items.padLat[i];
      }
    }
    // evitar miel
    for (const tr of items.traps) {
      const d = (tr.t - k.t) * L;
      if (d < 0 || d > 28 || (tr.owner === r && tr.grace > 0)) continue;
      if (Math.abs(tr.lat - off) < 3.4) off = tr.lat + (off >= tr.lat ? 3.9 : -3.9);
    }
    off = clamp(off, -(hw - 2.2), hw - 2.2);
    _tmp.copy(sTgt.position).addScaledVector(sTgt.right, off);

    let steer = steerTo(k, _tmp, 2.2);
    if (!k.grounded) steer *= 0.35;
    out.steer = steer;

    // derrape
    const ac = Math.abs(curv);
    if (k.drifting) ai.driftHold = ac > 0.15;
    else ai.driftHold = ac > 0.35 && v > 20 && k.grounded && Math.abs(steer) > 0.4;
    out.drift = ai.driftHold;

    // trucos
    if (k.lastTakeoff.n !== ai.takeoffN) {
      ai.takeoffN = k.lastTakeoff.n;
      ai.willTrick = Math.random() < 0.7;
      ai.trickDone = false;
    }
    out.trick = false;
    if (!k.grounded && ai.willTrick && !ai.trickDone && !k.doingTrick && k.airTime > 0.15 && k.velocity.y > 3) {
      out.trick = true;
      ai.trickDone = true;
    }

    // objeto
    out.useItem = false;
    if (r.item !== ai.lastItem) { ai.lastItem = r.item; ai.itemAge = 0; ai.itemWait = 0.8 + Math.random() * 2.5; }
    const { ahead, behind } = nearestRivals(r);
    if (r.item) {
      ai.itemAge += h;
      if (ai.itemAge > ai.itemWait && k.grounded) {
        const forced = ai.itemAge > 7;
        if (r.item === 'bolaNieve') out.useItem = ahead < 70 || forced;
        else if (r.item === 'miel') out.useItem = behind < 45 || forced;
        else out.useItem = true;
      }
    }

    // poder
    out.usePower = false;
    if (r.charge >= 1) {
      if (!ai.wasReady) { ai.wasReady = true; ai.powerAge = 0; ai.powerWait = 0.5 + Math.random() * 3.5; }
      ai.powerAge += h;
      if (ai.powerAge > ai.powerWait) {
        const forced = ai.powerAge > 9;
        switch (powers.powerOf(r)) {
          case 'sismo': out.usePower = ahead < 14 || behind < 14 || forced; break;
          case 'embestida': out.usePower = ahead < 10 || behind < 10 || forced; break;
          case 'humo': out.usePower = behind < 14 || forced; break;
          case 'brinco': out.usePower = k.grounded && ac < 0.15 && k.t < 0.88 && sNear.ceilingHeight == null && sNear.hasGround; break;
          case 'turbo': out.usePower = k.grounded && ac < 0.25; break;
          default: out.usePower = true; // burbuja
        }
      }
    } else ai.wasReady = false;

    // atasco: si casi no avanza, reaparece
    if (!k.frozen && k.respawnTimer <= 0 && k.spinTimer <= 0 && v < 4) {
      ai.stuck += h;
      if (ai.stuck > 2.5) { ai.stuck = 0; k.respawn(track); }
    } else ai.stuck = 0;
  }

  return { control };
}
