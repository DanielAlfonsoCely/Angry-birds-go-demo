// STUB del orquestador: carrera mínima (cuenta regresiva, IA básica, meta).
// El Agente de Gameplay lo reemplaza (catapulta, poderes, objetos, IA con rubber-banding,
// posiciones). Debe mantener la firma de createRace y emitir los EVENTS de src/core/contracts.js.
import * as THREE from 'three';
import { buildTrack } from '../track/index.js';
import { createKart, statsWithUpgrades, createChaseCamera } from '../physics/index.js';
import { createKartModel, createEnvironment, createParticles } from '../art/index.js';
import { CHARACTERS, RACERS_PER_RACE } from '../core/data.js';
import { EVENTS } from '../core/contracts.js';

/**
 * Crea una carrera. Devuelve un "modo" para game.setMode().
 * @param {import('../core/game.js').Game} game
 * @param {{trackId:string, characterId:string}} opts
 */
export function createRace(game, { trackId, characterId }) {
  const scene = new THREE.Scene();
  const env = createEnvironment(trackId === 'selva' ? 'jungle' : trackId === 'canon' ? 'volcano' : 'snow');
  env.apply(scene);
  scene.add(env.group);
  const track = buildTrack(trackId);
  scene.add(track.group);
  const particles = createParticles(scene);

  const rivals = CHARACTERS.filter((c) => c.id !== characterId).slice(0, RACERS_PER_RACE - 1);
  const grid = track.spawnGrid(RACERS_PER_RACE);
  const karts = [characterId, ...rivals.map((r) => r.id)].map((cid, i) => {
    const spawn = grid[RACERS_PER_RACE - 1 - i]; // el jugador sale atrás
    const kart = createKart({
      id: i === 0 ? 'player' : `ai${i}`,
      characterId: cid,
      stats: statsWithUpgrades(i === 0 ? game.save.data.upgrades : {}),
      position: spawn.position,
      quaternion: spawn.quaternion,
    });
    const model = createKartModel(cid);
    kart.object3D.add(model.group);
    kart.model = model;
    scene.add(kart.object3D);
    return kart;
  });
  const player = karts[0];
  const cam = createChaseCamera(game.camera);
  cam.snap(player);

  let countdown = 3.999;
  let lastN = 4;
  let raceTime = 0;
  let finishedCount = 0;
  let ended = false;

  function aiControls(kart) {
    const ahead = track.sample(Math.min(1, kart.t + 25 / track.length));
    const toTarget = ahead.position.clone().sub(kart.position);
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(kart.quaternion);
    const cross = fwd.x * toTarget.z - fwd.z * toTarget.x;
    return { steer: THREE.MathUtils.clamp(cross * 0.1, -1, 1), drift: false, trick: false, useItem: false, usePower: false, launchHold: false, pause: false };
  }

  game.events.emit(EVENTS.RACE_START, { trackId, characterId });

  return {
    scene,
    track,
    karts,
    player,
    update(dt, time) {
      if (countdown > 0) {
        countdown -= dt;
        const n = Math.max(0, Math.ceil(countdown));
        if (n !== lastN) { lastN = n; game.events.emit(EVENTS.COUNTDOWN, { n }); }
        if (countdown <= 0) for (const k of karts) k.launch(0.5);
      } else if (!ended) {
        raceTime += dt;
      }
      const controls = game.input.getControls();
      for (const k of karts) {
        if (k.finished) continue;
        k.update(dt, k === player ? controls : aiControls(k), track);
        if (k.t >= 0.999) {
          k.finished = true;
          finishedCount++;
          game.events.emit(EVENTS.FINISH, { kartId: k.id, position: finishedCount, time: raceTime });
          if (k === player && !ended) {
            ended = true;
            game.events.emit(EVENTS.RACE_END, {
              results: [{ kartId: k.id, characterId, position: finishedCount, time: raceTime, isPlayer: true }],
              coinsCollected: 0,
              reward: 0,
            });
          }
        }
        k.model.update(dt, k);
      }
      track.update(dt, time);
      env.update(dt, game.camera.position);
      particles.update(dt);
      cam.follow(player, dt);
    },
    dispose() {
      track.dispose();
      particles.dispose();
    },
  };
}
