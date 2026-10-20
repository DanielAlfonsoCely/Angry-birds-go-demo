// UI: router de pantallas (título → personaje → pista → carrera → resultados, tienda y ajustes).
// Atajo de URL: ?track=pico|selva|canon&char=tuko[&autopilot=1] salta los menús y entra a la carrera.
import { h } from './dom.js';
import { injectStyles } from './styles.js';
import { createMenuStage } from './menuStage.js';
import { createRaceMode } from './raceMode.js';
import { titleScreen } from './title.js';
import { characterScreen } from './characters.js';
import { trackScreen } from './tracks.js';
import { shopScreen } from './shop.js';
import { settingsScreen } from './settings.js';
import { audio } from '../audio/index.js';
import { trackName } from './meta.js';

const SCREENS = { title: titleScreen, characters: characterScreen, tracks: trackScreen, shop: shopScreen, settings: settingsScreen };

export function createUI(game, root) {
  injectStyles();
  const params = new URLSearchParams(location.search);
  const fader = h('div', { class: 'cr-fader' });
  root.appendChild(fader);

  let stage = null;
  let menuMode = null;
  let current = null;
  let dim = null;

  const ctx = { game, root, router: null, stage: null, lastCharacter: null };

  function ensureStage() {
    if (!stage) {
      stage = createMenuStage(game);
      ctx.stage = stage;
      menuMode = { scene: stage.scene, update: (dt, time) => stage.update(dt, time), dispose() {} };
    }
    if (game.mode !== menuMode) {
      game.setMode(menuMode);
      stage.enter();
      audio.playMusic('menu');
    }
  }

  const router = {
    go(name, p) {
      ensureStage();
      current?.dispose?.();
      current?.el.remove();
      dim?.remove();
      const screen = SCREENS[name](ctx, p);
      current = screen;
      if (screen.dim) { dim = h('div', { class: 'cr-screen cr-dim cr-blur', style: { opacity: '.85' } }); root.insertBefore(dim, fader); } else dim = null;
      root.insertBefore(screen.el, fader);
      stage.setView(screen.view ?? 'title', screen.offset);
      if (screen.dim && dim) dim.style.pointerEvents = 'none';
    },
  };
  ctx.router = router;

  // transición con fundido (la construcción de la pista bloquea unos ms)
  // `deferred`: fn termina el trabajo en frames posteriores y el fundido se retira cuando acaba
  function fadeThen(fn) {
    fader.classList.add('on');
    setTimeout(() => {
      try { fn(); } finally { requestAnimationFrame(() => requestAnimationFrame(() => fader.classList.remove('on'))); }
    }, 300);
  }

  function clearScreen() {
    current?.dispose?.();
    current?.el.remove();
    dim?.remove();
    current = null; dim = null;
  }

  // pantalla de carga: se pinta antes de construir la pista (la construcción bloquea el hilo unos cientos de ms)
  ctx.startRace = (trackId, characterId, opts) => fadeThen(() => {
    clearScreen();
    const loading = h('div', { class: 'cr-loading' },
      h('div', { class: 'cr-loading__t cr-outline' }, trackName(trackId)),
      h('div', { class: 'cr-loading__bar' }, h('i')),
      h('div', { class: 'cr-loading__s' }, 'Preparando la pista…'));
    root.appendChild(loading);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      try {
        ctx.lastCharacter = characterId;
        stage?.leave();
        game.paused = false;
        game.setMode(createRaceMode(ctx, trackId, characterId, opts));
      } finally {
        loading.remove();
      }
    }));
  });

  ctx.exitRace = (screen = 'title', p) => fadeThen(() => {
    game.paused = false;
    audio.setEngine(-1);
    router.go(screen, p);
  });

  // Esc en menús = atrás
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && current?.onBack && game.mode === menuMode && !root.querySelector('.cr-dialog')) {
      e.preventDefault();
      audio.play('uiBack');
      current.onBack();
    }
  });

  if (params.get('track')) {
    const trackId = params.get('track');
    const char = params.get('char') ?? game.save.data.selectedCharacter ?? 'tuko';
    ctx.lastCharacter = char;
    game.setMode(createRaceMode(ctx, trackId, char, { autopilot: params.get('autopilot') === '1' }));
  } else {
    router.go('title');
  }
  window.__ui = { router, ctx };
}
