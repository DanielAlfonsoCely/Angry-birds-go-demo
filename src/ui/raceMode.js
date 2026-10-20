// Modo carrera: crea la carrera, el HUD, la pausa (la UI es la dueña) y los resultados.
import { createRace } from '../gameplay/index.js';
import { EVENTS } from '../core/contracts.js';
import { h, button, formatTime } from './dom.js';
import { ICONS } from './icons.js';
import { createHud } from './hud.js';
import { applyRaceEnd, resultsScreen } from './results.js';
import { trackName, getCharacter } from './meta.js';
import { isTouchDevice } from './dom.js';
import { audio } from '../audio/index.js';

export function createRaceMode(ctx, trackId, characterId, { autopilot = false } = {}) {
  const { game, root } = ctx;
  const race = createRace(game, { trackId, characterId, autopilot });
  const hud = createHud(game, race, { characterId, touch: isTouchDevice() });
  root.appendChild(hud.el);
  let pauseEl = null;
  let ended = false;
  let resultsEl = null;
  let resultsView = null;
  const timers = [];
  const unsubs = [];

  function setPaused(v) {
    if (ended || game.paused === v) return;
    game.paused = v;
    race.pause?.(v);
    game.events.emit(EVENTS.PAUSE, { paused: v });
    if (v) {
      pauseEl = h('div', { class: 'cr-screen cr-pause cr-dim cr-blur' },
        h('div', { class: 'cr-panel' },
          h('h2', { class: 'cr-title' }, 'Pausa'),
          h('div', { class: 'cr-pause__info' }, `${trackName(trackId)}  ·  ${getCharacter(characterId).name}  ·  ${formatTime(race.getPlayerState?.()?.time ?? race.raceTime ?? 0)}`),
          button('Reanudar', () => setPaused(false), { variant: 'green', icon: ICONS.play }),
          button('Reiniciar', () => ctx.startRace(trackId, characterId), { variant: 'secondary', icon: ICONS.retry }),
          button('Salir', () => ctx.exitRace('tracks'), { variant: 'danger', icon: ICONS.home, sound: 'uiBack' })));
      pauseEl.querySelector('.cr-btn').id = 'btn-resume';
      pauseEl.querySelectorAll('.cr-btn')[1].id = 'btn-restart';
      pauseEl.querySelectorAll('.cr-btn')[2].id = 'btn-exit';
      root.appendChild(pauseEl);
    } else {
      pauseEl?.remove();
      pauseEl = null;
    }
  }
  hud.onPause = () => setPaused(!game.paused);

  unsubs.push(game.events.on(EVENTS.RACE_END, (payload) => {
    if (ended) return;
    if (game.paused) setPaused(false);
    ended = true;
    const sum = applyRaceEnd(game, race, trackId, payload);
    ctx.lastCharacter = characterId;
    timers.push(setTimeout(() => {
      hud.setHidden(true);
      resultsView = resultsScreen(ctx, sum);
      resultsEl = resultsView.el;
      root.appendChild(resultsEl);
    }, 2300));
  }));

  const onVis = () => { if (document.hidden) setPaused(true); };
  document.addEventListener('visibilitychange', onVis);

  const mode = {
    scene: race.scene,
    race, // expuesto para pruebas (tests/smoke.mjs)
    setPaused,
    update(dt, time) {
      if (game.input.edges.pause) setPaused(!game.paused);
      if (!game.paused) race.update(dt, time);
      hud.update(dt);
    },
    dispose() {
      timers.forEach(clearTimeout);
      unsubs.forEach((u) => u());
      document.removeEventListener('visibilitychange', onVis);
      resultsView?.dispose?.();
      resultsEl?.remove();
      pauseEl?.remove();
      hud.dispose();
      if (game.paused) { game.paused = false; game.events.emit(EVENTS.PAUSE, { paused: false }); }
      audio.setEngine(-1);
      race.dispose();
    },
  };
  return mode;
}
