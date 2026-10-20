// Carrera completa: orquesta karts, catapulta, objetos, poderes, IA, posiciones y meta.
import * as THREE from 'three';
import { buildTrack } from '../track/index.js';
import { createKart, statsWithUpgrades, createChaseCamera } from '../physics/index.js';
import { createKartModel, createEnvironment, createParticles } from '../art/index.js';
import { audio } from '../audio/index.js';
import { CHARACTERS, RACERS_PER_RACE, PLACE_REWARDS, AI_UPGRADE_RANGE } from '../core/data.js';
import { EVENTS } from '../core/contracts.js';
import { createModels } from './models.js';
import { makeRacer, upgradesAtLevel } from './state.js';
import { createLaunch } from './launch.js';
import { createItems } from './items.js';
import { createPowers } from './powers.js';
import { createAI } from './ai.js';
import { createFx } from './fx.js';
import { sortRacers, estimateTimes } from './standings.js';

const STEP = 1 / 30;           // sub-paso máximo de simulación
const FINISH_T = 0.9999;
const GRACE = 5;               // s tras la meta del jugador antes de cerrar la carrera
const RUBBER = 0.07;           // ±7 % de velocidad/aceleración de la IA
const THEME_DUST = { snow: 0xeaf6ff, jungle: 0xa58f5e, volcano: 0x6a5750 };
const THEME_NAME = { pico: 'snow', selva: 'jungle', canon: 'volcano' };

/**
 * @param {import('../core/game.js').Game} game
 * @param {{trackId:string, characterId:string}} opts
 */
export function createRace(game, { trackId, characterId }) {
  const scene = new THREE.Scene();
  const env = createEnvironment(THEME_NAME[trackId] ?? 'snow');
  env.apply(scene);
  scene.add(env.group);
  const track = buildTrack(trackId);
  scene.add(track.group);
  const particles = createParticles(scene, track.theme);
  const models = createModels();
  const fx = createFx(models);
  const dustColor = THEME_DUST[track.theme] ?? 0xd9c8a9;
  const L = track.length;

  // --- karts y corredores ---
  const rivals = CHARACTERS.filter((c) => c.id !== characterId).slice(0, RACERS_PER_RACE - 1);
  const grid = track.spawnGrid(RACERS_PER_RACE);
  const range = AI_UPGRADE_RANGE[trackId] ?? [0, 1];
  const idle = { steer: 0, drift: false, trick: false, useItem: false, usePower: false, launchHold: false, pause: false };
  const racers = [characterId, ...rivals.map((r) => r.id)].map((cid, i) => {
    const spawn = grid[RACERS_PER_RACE - 1 - i]; // el jugador sale atrás
    const level = range[0] + Math.floor(Math.random() * (range[1] - range[0] + 1));
    const kart = createKart({
      id: i === 0 ? 'player' : `ai${i}`,
      characterId: cid,
      stats: statsWithUpgrades(i === 0 ? game.save.data.upgrades : upgradesAtLevel(level)),
      position: spawn.position,
      quaternion: spawn.quaternion,
    });
    const model = createKartModel(cid);
    kart.object3D.add(model.group);
    kart.model = model;
    scene.add(kart.object3D);
    kart.update(1e-4, idle, track); // apoya el kart en el suelo antes de crear la catapulta
    const r = makeRacer(kart, i, i === 0);
    r.base.copy(kart.position);
    r.launchAt = Math.random() * 0.25;
    r.launchPower = 0.3 + Math.random() * 0.65;
    return r;
  });
  const player = racers[0];
  const karts = racers.map((r) => r.kart);
  const byId = new Map(racers.map((r) => [r.id, r]));
  const order = racers.slice();
  const cam = createChaseCamera(game.camera);
  cam.snap(player.kart);

  const ctx = { game, track, scene, models, particles, racers, cam };
  const launch = createLaunch(ctx);
  const items = createItems(ctx);
  const powers = createPowers(ctx);
  ctx.items = items;
  ctx.powers = powers;
  const ai = createAI(ctx);
  racers.forEach((r) => fx.attach(r));

  // --- estado de la carrera ---
  let phase = 'countdown';       // 'countdown' | 'racing' | 'finished'
  let raceTime = 0;
  let finishedCount = 0;
  let graceT = 0;
  let ended = false;
  let paused = false;
  let lastPlayerPos = 0;
  let lastCharge = -1;
  let orbit = 0;
  let engineOff = false;
  const api = {
    scene, track, karts, player: player.kart,
    autopilot: new URLSearchParams(globalThis.location?.search ?? '').get('autopilot') === '1',
    get phase() { return phase; },
    get raceTime() { return raceTime; },
    pause(p) {
      paused = !!p;
      if (paused) { audio.setEngine(null); engineOff = true; }
    },
  };

  // --- eventos de físicas -> eventos de juego y partículas ---
  for (const r of racers) {
    r.kart.onEvent = (type, ev) => {
      const k = r.kart;
      if (type === 'land') {
        particles.emit('landing', k.position, { color: dustColor, scale: Math.min(1.5, 0.6 + ev.impact * 0.08) });
        game.events.emit(EVENTS.LAND, { kartId: r.id, impact: Math.min(1, ev.impact / 15) });
      } else if (type === 'driftBoost') {
        particles.emit('boostFlame', k.position, { count: 10, direction: k.forward });
        game.events.emit(EVENTS.DRIFT_BOOST, { kartId: r.id, level: ev.level });
      } else if (type === 'trick') {
        game.events.emit(EVENTS.TRICK, { kartId: r.id, success: ev.success });
      } else if (type === 'wallHit') {
        if (r.isPlayer) game.events.emit(EVENTS.HIT, { kartId: r.id, by: 'wall' });
        particles.emit('hit', k.position, { count: 6 });
      } else if (type === 'kartHit') {
        const other = byId.get(ev.by);
        if (other && other.kart.effects.ram > 0 && !(k.effects.shield > 0)) {
          game.events.emit(EVENTS.HIT, { kartId: r.id, by: ev.by });
          particles.emit('hit', k.position, { count: 10 });
          if (r.isPlayer) cam.shake(0.4);
        }
      } else if (type === 'spinOut') {
        particles.emit('hit', k.position, { count: 8 });
        if (r.isPlayer) cam.shake(0.35);
      } else if (type === 'boostPad') {
        particles.emit('boostFlame', k.position, { count: 6, direction: k.forward });
      }
    };
  }

  function finishKart(r) {
    const k = r.kart;
    k.finished = true;
    r.finishOrder = ++finishedCount;
    r.finishTime = raceTime;
    r.item = null;
    k.slowDown(0.3, 99);
    game.events.emit(EVENTS.FINISH, { kartId: r.id, position: r.finishOrder, time: raceTime });
    if (r === player) { phase = 'finished'; graceT = 0; }
  }

  function endRace() {
    if (ended) return;
    ended = true;
    sortRacers(order);
    const times = estimateTimes(order, raceTime, L);
    const results = order.map((r, i) => ({
      kartId: r.id, characterId: r.kart.characterId, position: i + 1, time: times[i], isPlayer: r === player,
    }));
    const pos = player.position;
    game.events.emit(EVENTS.RACE_END, {
      results, coinsCollected: player.coins,
      reward: (PLACE_REWARDS[pos - 1] ?? 0) + player.coins,
    });
  }

  const pc = { steer: 0, drift: false, trick: false, useItem: false, usePower: false, launchHold: false, pause: false };

  /** Un sub-paso de simulación. `first` indica si es el primero del frame (aristas de input). */
  function step(h, first, human) {
    if (phase === 'countdown' || phase === 'racing') {
      // jugador humano
      if (human) {
        const c = game.input.getControls();
        pc.steer = c.steer; pc.drift = c.drift; pc.launchHold = c.launchHold;
        pc.trick = first && c.trick; pc.useItem = first && c.useItem; pc.usePower = first && c.usePower;
        player.controls = pc;
      }
    }
    const holdKey = human ? pc.launchHold : false;
    launch.update(h, holdKey, human);
    if (phase === 'countdown' && launch.go) phase = 'racing';
    if (phase !== 'countdown') raceTime += h;

    // controles
    for (const r of racers) {
      if (r === player && human && !r.kart.finished) continue;
      ai.control(r, h, raceTime, r.controls);
    }
    // rubber-banding de la IA respecto al jugador
    for (const r of racers) {
      if (r === player) continue;
      const d = (r.kart.t - player.kart.t) * L; // + = va por delante del jugador
      const target = player.kart.finished ? 0 : clampN(-d / 150, -1, 1) * RUBBER;
      r.rubber += (target - r.rubber) * Math.min(1, h * 0.8);
      r.kart.stats.topSpeed = r.baseTop * (1 + r.rubber);
      r.kart.stats.accel = r.baseAccel * (1 + r.rubber);
    }
    // objetos y poderes por input
    for (const r of racers) {
      if (r.kart.finished) continue;
      const c = r.controls;
      if (c.useItem) items.use(r);
      if (c.usePower) powers.use(r);
      powers.charge(r, h);
    }
    for (const r of racers) r.kart.update(h, r.controls, track);
    // choques kart-kart (una vez por par)
    for (let i = 0; i < racers.length; i++) {
      const a = racers[i].kart;
      if (a.finished) continue;
      for (let j = i + 1; j < racers.length; j++) {
        const b = racers[j].kart;
        if (!b.finished) a.collideWith(b);
      }
    }
    for (const r of racers) items.collect(r, h);
    items.update(h);
    powers.update(h);

    // meta
    if (phase === 'racing' || phase === 'finished') {
      for (const r of racers) if (!r.kart.finished && !r.kart.frozen && r.kart.t >= FINISH_T) finishKart(r);
    }
    if (phase === 'finished' && !ended) {
      graceT += h;
      if (graceT >= GRACE || finishedCount >= racers.length) endRace();
    }
    if (raceTime > 600) endRace();
  }
  const clampN = (x, a, b) => (x < a ? a : x > b ? b : x);

  api.update = function update(dt, time) {
    if (paused || dt <= 0) return;
    if (engineOff) engineOff = false;
    const human = !api.autopilot;
    const n = Math.max(1, Math.ceil(dt / STEP));
    const h = dt / n;
    for (let i = 0; i < n; i++) step(h, i === 0, human);

    sortRacers(order);

    for (const r of racers) {
      const k = r.kart;
      k.model.update(dt, k);
      if (k.drifting && k.grounded) {
        const col = k.driftLevel === 2 ? 0xff9a2a : 0x2fb4ff;
        if (k.driftLevel > 0) particles.emit('driftSpark', k.position, { count: 1, color: col });
        particles.emit('dust', k.position, { count: 1, color: dustColor });
      }
    }
    fx.update(dt, time);
    track.update(dt, time);
    env.update(dt, game.camera.position);
    particles.update(dt);

    // cámara: órbita si el jugador ganó
    if (player.kart.finished && player.finishOrder === 1) {
      orbit += dt * 0.6;
      const p = player.kart.position;
      game.camera.position.set(p.x + Math.cos(orbit) * 9, p.y + 3.6, p.z + Math.sin(orbit) * 9);
      game.camera.lookAt(p.x, p.y + 1, p.z);
    } else {
      cam.follow(player.kart, dt);
    }

    // posición y carga del jugador
    if (phase !== 'countdown' && player.position !== lastPlayerPos) {
      lastPlayerPos = player.position;
      game.events.emit(EVENTS.POSITION, { position: player.position, total: racers.length });
    }
    if (Math.abs(player.charge - lastCharge) > 0.004) {
      lastCharge = player.charge;
      game.events.emit(EVENTS.POWER_CHARGE, { value: player.charge });
    }

    // motor
    if (phase === 'finished' || ended) {
      if (!engineOff) { audio.setEngine(null); engineOff = true; }
    } else {
      const k = player.kart;
      audio.setEngine(Math.min(1, k.speed / k.stats.topSpeed), k.boostTimer > 0, k.drifting);
    }
  };

  api.getStandings = () => order.map((r) => ({
    kartId: r.id, characterId: r.kart.characterId, position: r.position, t: r.kart.t,
    finished: r.kart.finished, time: r.finishOrder ? r.finishTime : null, isPlayer: r === player,
  }));

  api.getPlayerState = () => ({
    position: player.position,
    total: racers.length,
    time: raceTime,
    coins: player.coins,
    item: player.item,
    powerCharge: player.charge,
    powerReady: player.charge >= 1,
    phase,
    launchMeter: player.launched ? 0 : launch.meter,
    speedKmh: Math.round(player.kart.speed * 3.6),
    progress: player.kart.t,
  });

  api.dispose = () => {
    audio.setEngine(null);
    launch.dispose();
    items.dispose();
    powers.dispose();
    fx.dispose();
    models.dispose();
    particles.dispose();
    env.dispose?.();
    track.dispose();
  };

  game.events.emit(EVENTS.RACE_START, { trackId, characterId });
  return api;
}
