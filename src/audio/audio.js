// Sistema de audio del juego: contexto perezoso, buses, SFX con límite de voces,
// motor del jugador, música con crossfade y escucha de EVENTS.
import { EVENTS } from '../core/contracts.js';
import { SFX_DEFS, MAX_VOICES, PITCH_VARIATION, DEFAULT_VARIATION } from './sfx.js';
import { createBuses, setBusVolume, MUSIC_LEVEL } from './mixer.js';
import { Engine } from './engine.js';
import { Music } from './music.js';

const PLAYER = 'player';
const MIN_GAP = 0.03; // s mínimos entre dos disparos del mismo sonido
const COIN_STEPS = [0, 2, 4, 7, 9, 12, 14]; // combo de monedas sube por pentatónica

const ITEM_SFX = {
  cohete: 'boost', rocket: 'boost', boost: 'boost',
  bolaNieve: 'snowball', snowball: 'snowball',
  miel: 'honey', honey: 'honey',
  iman: 'magnet', magnet: 'magnet',
};
const POWER_SFX = {
  turbo: 'boost', sismo: 'shockwave', burbuja: 'shield',
  humo: 'smoke', brinco: 'jump', embestida: 'boost',
};

const S = {
  ctx: null,
  buses: null,
  engine: null,
  music: null,
  volumes: { music: 0.6, sfx: 0.8 },
  save: null,
  desiredMusic: null,
  voices: new Map(),   // name -> [{gain, end}]
  lastPlay: new Map(), // name -> tiempo
  coin: { last: -1, step: 0 },
  paused: false,
  engineArgs: null,
  stretchHolding: false,
  playerFinished: false,
  menuTimer: null,
  failed: false,
};

function getCtx() {
  if (S.ctx || S.failed) return S.ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { S.failed = true; return null; }
    S.ctx = new AC({ latencyHint: 'interactive' });
    S.buses = createBuses(S.ctx);
    S.engine = new Engine(S.ctx, S.buses.sfx);
    S.music = new Music(S.ctx, S.buses.music);
    applyVolumes(false);
  } catch {
    S.failed = true;
    S.ctx = null;
  }
  return S.ctx;
}

const running = () => S.ctx && S.ctx.state === 'running';

function applyVolumes(smooth = true) {
  if (!S.ctx) return;
  setBusVolume(S.ctx, S.buses.music.gain, S.volumes.music * MUSIC_LEVEL, smooth);
  setBusVolume(S.ctx, S.buses.sfx.gain, S.volumes.sfx, smooth);
}

/** Relee volúmenes guardados si cambiaron (barato; se llama en cada play). */
function syncSettings() {
  const st = S.save?.data?.settings;
  if (!st) return;
  if (st.music !== S.volumes.music || st.sfx !== S.volumes.sfx) {
    setVolumes({ music: st.music, sfx: st.sfx });
  }
}

function duck(level, time = 0.15) {
  if (!S.ctx) return;
  S.buses.duck.gain.setTargetAtTime(level, S.ctx.currentTime, time);
}

// ------------------------------------------------------------------ API

function unlock() {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state !== 'running') {
    ctx.resume().then(() => {
      if (S.desiredMusic && !S.music.playingId) S.music.play(S.desiredMusic);
    }).catch(() => {});
  } else if (S.desiredMusic && !S.music.playingId) {
    S.music.play(S.desiredMusic);
  }
}

function play(name, opts = {}) {
  syncSettings();
  if (!running()) return;
  const def = SFX_DEFS[name];
  if (!def) return;
  const ctx = S.ctx;
  const now = ctx.currentTime;
  const last = S.lastPlay.get(name) ?? -1;
  if (now - last < MIN_GAP) return;
  S.lastPlay.set(name, now);

  let pitch = opts.pitch ?? 1;
  const vari = PITCH_VARIATION[name] ?? DEFAULT_VARIATION;
  pitch *= 1 + (Math.random() * 2 - 1) * vari;
  if (name === 'coin') {
    S.coin.step = now - S.coin.last < 0.5 ? Math.min(S.coin.step + 1, COIN_STEPS.length - 1) : 0;
    S.coin.last = now;
    pitch *= Math.pow(2, COIN_STEPS[S.coin.step] / 12);
  }

  // límite de voces: corta la más vieja con un fade rápido
  const list = (S.voices.get(name) ?? []).filter((v) => v.end > now);
  const max = MAX_VOICES[name] ?? 3;
  while (list.length >= max) {
    const old = list.shift();
    old.gain.gain.cancelScheduledValues(now);
    old.gain.gain.setTargetAtTime(0, now, 0.015);
  }

  const vg = ctx.createGain();
  vg.gain.value = Math.max(0, Math.min(1.5, opts.volume ?? 1));
  vg.connect(S.buses.sfx);
  let dur = 0.5;
  try {
    dur = def(ctx, vg, now + 0.005, pitch, opts) ?? 0.5;
  } catch (e) {
    console.warn('[audio] fallo en sfx', name, e);
  }
  list.push({ gain: vg, end: now + dur });
  S.voices.set(name, list);
  setTimeout(() => { try { vg.disconnect(); } catch { /* ignorar */ } }, (dur + 0.3) * 1000);
}

function playMusic(id) {
  syncSettings();
  S.desiredMusic = id;
  clearTimeout(S.menuTimer);
  if (running()) S.music.play(id);
}

function stopMusic() {
  S.desiredMusic = null;
  clearTimeout(S.menuTimer);
  if (S.music) S.music.stop();
}

/** speedRatio 0..1 (null/-1 apaga). `drifting` (extra opcional) agrega chirrido de llantas. */
function setEngine(speedRatio, boosting = false, drifting = false) {
  if (!S.engine || !running()) return;
  const off = speedRatio == null || speedRatio < 0;
  if (off) {
    S.engineArgs = null;
    S.engine.set(null);
    return;
  }
  // derrape: chirrido corto al empezar
  if (drifting && !S.engineArgs?.drifting && speedRatio > 0.15) play('driftStart', { volume: 0.6 });
  S.engineArgs = { boosting, drifting };
  if (S.paused) return;
  S.engine.set(speedRatio, boosting, drifting);
}

function setVolumes({ music, sfx } = {}) {
  if (music != null) S.volumes.music = Math.max(0, Math.min(1, Number(music) || 0));
  if (sfx != null) S.volumes.sfx = Math.max(0, Math.min(1, Number(sfx) || 0));
  applyVolumes();
}

// ------------------------------------------------------------------ eventos

function attach(events, save) {
  S.save = save ?? null;
  const st = save?.data?.settings;
  if (st) S.volumes = { music: st.music ?? 0.6, sfx: st.sfx ?? 0.8 };
  if (S.desiredMusic == null) S.desiredMusic = 'menu';

  // desbloqueo en el primer gesto del usuario
  if (typeof window !== 'undefined') {
    const opts = { capture: true, passive: true };
    const kinds = ['pointerdown', 'keydown', 'touchstart'];
    const onGesture = () => {
      unlock();
      if (running()) kinds.forEach((k) => window.removeEventListener(k, onGesture, opts));
    };
    kinds.forEach((k) => window.addEventListener(k, onGesture, opts));
    document.addEventListener('visibilitychange', () => {
      if (!S.ctx) return;
      if (document.hidden) {
        S.hiddenWhileRunning = S.ctx.state === 'running';
        S.ctx.suspend().catch(() => {});
      } else if (S.hiddenWhileRunning) {
        S.ctx.resume().catch(() => {});
      }
    });
  }
  if (!events) return;

  const isPlayer = (p) => p?.kartId === PLAYER;
  const on = (name, fn) => events.on(name, (p) => {
    try { fn(p ?? {}); } catch (e) { console.warn('[audio]', name, e); }
  });

  on(EVENTS.RACE_START, (p) => {
    S.playerFinished = false;
    S.stretchHolding = false;
    duck(1, 0.05);
    if (p.trackId) playMusic(p.trackId);
  });
  on(EVENTS.COUNTDOWN, (p) => play(p.n > 0 ? 'countdown' : 'go'));
  on(EVENTS.LAUNCH_METER, (p) => {
    if (p.holding && !S.stretchHolding) play('catapultStretch', { pitch: 0.9 + 0.3 * (p.value ?? 0) });
    S.stretchHolding = !!p.holding;
  });
  on(EVENTS.LAUNCH, (p) => {
    if (!isPlayer(p)) return;
    play('catapultRelease', { power: p.power ?? 1, volume: 0.7 + 0.3 * (p.power ?? 1) });
    if (p.rating === 'perfect') play('miniTurbo', { level: 2 });
  });
  on(EVENTS.COIN, (p) => { if (isPlayer(p)) play('coin'); });
  on(EVENTS.ITEM_PICKUP, (p) => { if (isPlayer(p)) play('itemBox'); });
  on(EVENTS.ITEM_USE, (p) => {
    const name = ITEM_SFX[p.itemId] ?? 'itemUse';
    if (isPlayer(p)) play(name);
    else play(name, { volume: 0.3 });
  });
  on(EVENTS.POWER_USE, (p) => {
    const name = POWER_SFX[p.powerId] ?? 'itemUse';
    if (isPlayer(p)) play(name);
    else play(name, { volume: name === 'shockwave' ? 0.55 : 0.3 });
  });
  on(EVENTS.HIT, (p) => {
    if (isPlayer(p)) {
      play(p.by === 'wall' ? 'wallHit' : 'kartHit', { volume: 0.7 });
      if (p.by !== 'wall') play('spinOut');
    } else {
      play('spinOut', { volume: 0.25 });
    }
  });
  on(EVENTS.DRIFT_BOOST, (p) => { if (isPlayer(p)) play('miniTurbo', { level: p.level ?? 1 }); });
  on(EVENTS.TRICK, (p) => { if (isPlayer(p)) play('trick', { success: p.success }); });
  on(EVENTS.LAND, (p) => {
    if (!isPlayer(p)) return;
    let v = Number(p.impact) || 0.5;
    if (v > 1.5) v /= 15; // por si llega en m/s
    v = Math.min(1, v);
    if (v < 0.08) return;
    play('land', { volume: 0.3 + 0.7 * v, pitch: 1.15 - 0.3 * v });
  });
  on(EVENTS.FINISH, (p) => {
    if (!isPlayer(p) || S.playerFinished) return;
    finishFanfare();
  });
  on(EVENTS.RACE_END, () => {
    if (!S.playerFinished) finishFanfare();
  });
  on(EVENTS.PAUSE, (p) => {
    S.paused = !!p.paused;
    S.engine?.setMuted(S.paused);
    duck(S.paused ? 0.35 : 1, 0.1);
  });
}

function finishFanfare() {
  S.playerFinished = true;
  setEngine(-1);
  play('finish');
  duck(0.25, 0.08);
  clearTimeout(S.menuTimer);
  S.menuTimer = setTimeout(() => {
    duck(1, 0.3);
    playMusic('menu');
  }, 2600);
}

export const audio = {
  attach,
  unlock,
  play,
  playMusic,
  stopMusic,
  setEngine,
  setVolumes,
  /** Extra para depurar: estado interno. */
  get context() { return S.ctx; },
};
