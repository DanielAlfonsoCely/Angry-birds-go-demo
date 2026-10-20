// HUD de carrera: posición, tiempo, progreso, monedas, velocímetro, objeto, poder, cuenta regresiva,
// medidor de catapulta, banners y popups. Lee race.getPlayerState() cada frame; los eventos solo disparan popups.
import { h, button, formatTime, replayAnim } from './dom.js';
import { ICONS } from './icons.js';
import { EVENTS } from '../core/contracts.js';
import { itemInfo, characterInfo, POWER_ICONS } from './meta.js';
import { getPortrait } from './portraits.js';
import { CHARACTERS } from '../core/data.js';
import { createTouchControls } from './touch.js';
import { createTutorial } from './tutorial.js';

const ARC = Math.PI * 80;
const RING = 2 * Math.PI * 44;
const svgNS = 'http://www.w3.org/2000/svg';

function speedo() {
  const el = h('div', { class: 'cr-speedo' });
  el.innerHTML = `<svg viewBox="0 0 190 130" aria-hidden="true"><defs><linearGradient id="cr-spd" x1="0" x2="1"><stop offset="0" stop-color="#4cc9f0"/><stop offset=".6" stop-color="#b8ff5a"/><stop offset="1" stop-color="#ffd23f"/></linearGradient></defs>
    <path d="M15 105 A80 80 0 0 1 175 105" fill="none" stroke="rgba(14,20,52,.6)" stroke-width="18" stroke-linecap="round"/>
    <path d="M15 105 A80 80 0 0 1 175 105" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="22" stroke-linecap="round" opacity=".35"/>
    <path class="fg" d="M15 105 A80 80 0 0 1 175 105" fill="none" stroke="url(#cr-spd)" stroke-width="12" stroke-linecap="round" stroke-dasharray="0 ${ARC}"/></svg>
    <div class="cr-speedo__v">0</div><div class="cr-speedo__u">KM/H</div>`;
  return { el, fg: el.querySelector('.fg'), v: el.querySelector('.cr-speedo__v') };
}

export function createHud(game, race, { characterId, touch }) {
  const unsubs = [];
  const on = (name, fn) => unsubs.push(game.events.on(name, fn));
  const timers = [];
  const playerId = race.player?.id ?? 'player';
  const info = characterInfo(characterId);
  const total = race.karts?.length ?? 6;

  // ---- elementos
  const posN = h('div', { class: 'cr-pos__n' });
  const pos = h('div', { class: 'cr-pos' }, posN, h('div', { class: 'cr-pos__t' }, `/${total}`));
  const timerTxt = h('span', {}, '0:00.00');
  const timer = h('div', { class: 'cr-timer' }, h('span', { html: ICONS.clock, style: { display: 'inline-flex' } }), timerTxt);
  const coinsNum = h('span', {}, '0');
  const coinsEl = h('div', { class: 'cr-coins cr-hud-coins' }, h('span', { html: ICONS.coin, style: { display: 'inline-flex' } }), coinsNum);
  const pauseBtn = button(null, () => hud.onPause?.(), { variant: 'ghost', icon: ICONS.pause, cls: 'cr-btn--round cr-hud-pause', title: 'Pausa', sound: 'uiBack' });
  pauseBtn.id = 'btn-pause';

  // progreso
  const fill = h('div', { class: 'cr-progress__fill' });
  const prog = h('div', { class: 'cr-progress' },
    h('div', { class: 'cr-progress__track' }, fill),
    h('div', { class: 'cr-progress__flag', html: ICONS.flag }));
  const dots = (race.karts ?? []).map((k) => {
    const p = k.id === playerId;
    const d = h('div', { class: `cr-progress__dot${p ? ' is-player' : ''}` });
    const ch = CHARACTERS.find((c) => c.id === k.characterId);
    if (p) d.style.backgroundImage = `url(${getPortrait(game, k.characterId)})`;
    else d.style.background = `#${(ch?.kartColor ?? 0xffffff).toString(16).padStart(6, '0')}`;
    prog.appendChild(d);
    return { k, d, last: -1 };
  });
  dots.sort((a, b) => (a.k.id === playerId) - (b.k.id === playerId));

  const sp = speedo();

  // objeto y poder (teclado)
  const itemIco = h('div', { class: 'cr-item__ico' });
  const itemBox = h('div', { class: 'cr-item' }, h('div', { class: 'cr-item__empty' }), h('span', { class: 'cr-key' }, 'E'));
  const ringEl = document.createElementNS(svgNS, 'svg');
  ringEl.setAttribute('class', 'ring');
  ringEl.setAttribute('viewBox', '0 0 96 96');
  ringEl.innerHTML = `<circle class="ring-bg" cx="48" cy="48" r="44" stroke-width="6"/><circle class="ring-fg" cx="48" cy="48" r="44" stroke-width="8" stroke-dasharray="0 ${RING}"/>`;
  const ringFg = ringEl.querySelector('.ring-fg');
  const powerLbl = h('div', { class: 'cr-power-slot__lbl' }, 'Q');
  const powerSlot = h('div', { class: 'cr-power-slot' }, ringEl, h('div', { class: 'cr-power-slot__ico' }, info.powerIcon), powerLbl);
  const slots = h('div', { class: 'cr-slots' }, itemBox, powerSlot);

  // centro: cuenta y banners; medidor de catapulta; popups
  const center = h('div', { class: 'cr-center' });
  const needle = h('div', { class: 'cr-launch__needle' });
  const meterLbl = h('div', { class: 'cr-launch__lbl cr-outline' }, touch ? 'Mantén DERRAPAR y suelta' : 'Mantén ESPACIO y suelta en la zona verde');
  const launch = h('div', { class: 'cr-launch', style: { display: 'none', animation: 'none' } },
    h('div', { class: 'cr-launch__bar' }, needle, h('div', { class: 'cr-launch__zone' }, 'PERFECTO')), meterLbl);
  const popups = h('div', { class: 'cr-popups' });
  const coinPop = h('div', { class: 'cr-coin-pop', style: { display: 'none' } }, '+1');

  const tc = touch ? createTouchControls(game, { info }) : null;
  const tuto = createTutorial(game, { touch });
  const el = h('div', { class: `cr-hud${touch ? ' touch' : ''}` }, tc?.el, tuto?.el, pos, timer, prog, coinsEl, coinPop, pauseBtn, sp.el, slots, launch, center, popups);

  // ---- utilidades
  function say(text, cls = '') {
    const b = h('div', { class: `cr-banner cr-outline ${cls}` }, text);
    center.replaceChildren(b);
    timers.push(setTimeout(() => b.remove(), cls === 'finish' ? 2500 : 1700));
  }
  function popup(text, color = 'blue', small = false) {
    const p = h('div', { class: `cr-popup cr-outline ${color}${small ? ' small' : ''}`, style: { marginLeft: `${(Math.random() - 0.5) * 120}px`, top: `${-(popups.childElementCount % 3) * 46}px` } }, text);
    popups.appendChild(p);
    timers.push(setTimeout(() => p.remove(), 1150));
  }
  const mine = (p) => p?.kartId === playerId;

  // ---- eventos
  on(EVENTS.COUNTDOWN, ({ n }) => {
    const c = h('div', { class: `cr-count cr-outline anim${n > 0 ? '' : ' go'}` }, n > 0 ? String(n) : '¡YA!');
    center.replaceChildren(c);
    timers.push(setTimeout(() => c.remove(), 1150));
  });
  on(EVENTS.LAUNCH, (p) => {
    if (!mine(p)) return;
    launch.style.display = 'none';
    if (p.rating === 'perfect') say('¡PERFECTO!', 'perfect');
    else if (p.rating === 'good') say('¡Bien!', 'good');
  });
  on(EVENTS.POWER_USE, (p) => { if (mine(p)) { popup(info.powerName.toUpperCase(), 'gold'); } });
  on(EVENTS.DRIFT_BOOST, (p) => { if (mine(p)) popup(p.level >= 2 ? '¡Turbo naranja!' : '¡Mini turbo!', p.level >= 2 ? 'orange' : 'blue', true); });
  on(EVENTS.TRICK, (p) => { if (mine(p)) popup(p.success ? '¡Truco!' : 'Truco fallido', p.success ? 'gold' : 'red', true); });
  on(EVENTS.HIT, (p) => { if (mine(p) && p.by !== 'wall') popup('¡Golpe!', 'red'); });
  on(EVENTS.FINISH, (p) => { if (mine(p)) say('¡META!', 'finish'); });

  // ---- actualización por frame
  let lastPos = 0, lastCoins = -1, lastItem = '', lastTime = '', lastKmh = -1;
  let lastReady = null, lastCharge = -1;
  function update() {
    const s = race.getPlayerState();
    const p = race.player;

    // posición
    const position = s.position ?? (lastPos || total);
    if (position !== lastPos) {
      pos.classList.remove('up', 'down');
      if (lastPos) pos.classList.add(position < lastPos ? 'up' : 'down');
      posN.innerHTML = `${position}<sup>º</sup>`;
      replayAnim(pos, 'bump');
      lastPos = position;
    }

    // tiempo
    const t = s.time ?? 0;
    const tt = formatTime(t);
    if (tt !== lastTime) { lastTime = tt; timerTxt.textContent = tt; }

    // monedas
    const coins = s.coins ?? 0;
    if (coins !== lastCoins) {
      coinsNum.textContent = String(coins);
      if (lastCoins >= 0 && coins > lastCoins) {
        replayAnim(coinsEl, 'bump');
        coinPop.style.display = '';
        coinPop.textContent = `+${coins - lastCoins}`;
        replayAnim(coinPop, 'anim');
        coinPop.style.animation = 'none'; void coinPop.offsetWidth; coinPop.style.animation = '';
      }
      lastCoins = coins;
    }

    // velocidad
    const kmh = Math.round(s.speedKmh ?? 0);
    if (kmh !== lastKmh) {
      lastKmh = kmh;
      sp.v.textContent = String(kmh);
      sp.fg.setAttribute('stroke-dasharray', `${ARC * Math.min(1, kmh / 220)} ${ARC}`);
    }
    sp.el.classList.toggle('boost', (p?.boostTimer ?? 0) > 0);

    // progreso
    const prog01 = Math.min(1, Math.max(0, s.progress ?? 0));
    fill.style.width = `${prog01 * 100}%`;
    for (const d of dots) {
      const tv = Math.min(1, d.k.t ?? 0);
      if (Math.abs(tv - d.last) > 0.0015) { d.last = tv; d.d.style.left = `calc((100% - 24px) * ${tv})`; }
    }

    // objeto
    const itemId = s.item;
    const key = itemId ?? '';
    if (key !== lastItem) {
      lastItem = key;
      const it = itemInfo(itemId);
      itemBox.replaceChildren(it ? itemIco : h('div', { class: 'cr-item__empty' }), h('span', { class: 'cr-key' }, 'E'));
      if (it) { itemIco.textContent = it.icon; replayAnim(itemIco, 'roll'); itemIco.style.animation = 'none'; void itemIco.offsetWidth; itemIco.style.animation = ''; }
      tc?.setItem(it);
    }

    // poder
    const charge = Math.min(1, s.powerCharge ?? 0);
    const ready = s.powerReady ?? charge >= 1;
    if (charge !== lastCharge) { lastCharge = charge; ringFg.setAttribute('stroke-dasharray', `${RING * charge} ${RING}`); tc?.setCharge(charge); }
    if (ready !== lastReady) {
      lastReady = ready;
      powerSlot.classList.toggle('ready', ready);
      powerLbl.textContent = ready ? '¡LISTO! Q' : 'Q';
      tc?.setReady(ready);
    }

    // catapulta: visible mientras el jugador no se ha lanzado (cuenta regresiva y ventana de suelta)
    const lm = s.launchMeter;
    const showMeter = !s.launched && s.phase === 'countdown' && !race.autopilot;
    launch.style.display = showMeter ? '' : 'none';
    if (showMeter) {
      needle.style.left = `${Math.min(1, Math.max(0, lm ?? 0)) * 100}%`;
      launch.classList.toggle('holding', !!s.launchHolding);
    }
  }

  const hud = {
    el, update, onPause: null,
    setHidden(v) { el.classList.toggle('is-hidden', v); },
    dispose() {
      unsubs.forEach((u) => u());
      timers.forEach(clearTimeout);
      tc?.dispose();
      tuto?.dispose();
      el.remove();
    },
  };
  return hud;
}
