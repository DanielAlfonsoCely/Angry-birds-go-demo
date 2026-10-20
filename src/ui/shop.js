// Tienda de mejoras del kart: 4 estadísticas, 5 niveles cada una.
import { h, button, fmtNum } from './dom.js';
import { ICONS } from './icons.js';
import { topbar, playError } from './common.js';
import { UPGRADE_INFO } from './meta.js';
import { CHARACTERS, UPGRADES, UPGRADE_COSTS, MAX_UPGRADE_LEVEL } from '../core/data.js';
import { audio } from '../audio/index.js';
import { getPortrait } from './portraits.js';

export function shopScreen(ctx, params = {}) {
  const { game, router } = ctx;
  const save = game.save;
  const back = () => router.go(params.from === 'results' ? 'tracks' : 'title');
  const bar = topbar(game, 'Tienda de mejoras', back);
  const grid = h('div', { class: 'cr-shop' });
  const cards = {};
  const owned = () => CHARACTERS.filter((c) => save.data.unlockedCharacters.includes(c.id));
  let charId = owned().some((c) => c.id === save.data.selectedCharacter) ? save.data.selectedCharacter : owned()[0].id;
  const picker = h('div', { class: 'cr-shop-pick' });
  function renderPicker() {
    picker.replaceChildren(...owned().map((c) => h('button', {
      class: `cr-shop-char${c.id === charId ? ' is-active' : ''}`, type: 'button', title: c.name,
      onClick: () => { if (c.id === charId) return; audio.play('uiClick'); charId = c.id; renderPicker(); for (const k of Object.keys(cards)) fill(k); },
    }, h('span', { class: 'cr-shop-char__img', style: { backgroundImage: `url(${getPortrait(game, c.id)})` } }), h('span', {}, c.name))));
  }

  function fill(key, fresh = false) {
    const card = cards[key];
    const u = UPGRADES[key];
    const info = UPGRADE_INFO[key];
    const lvl = save.getUpgrades(charId)[key];
    const maxed = lvl >= MAX_UPGRADE_LEVEL;
    const cost = UPGRADE_COSTS[lvl];
    const buyBtn = maxed
      ? button('Máximo', null, { variant: 'ghost', sound: null })
      : button(fmtNum(cost), () => buy(key), { variant: save.data.coins >= cost ? 'green' : 'primary', icon: ICONS.coin });
    if (maxed) buyBtn.disabled = true;
    else if (buyBtn.querySelector('.cr-btn__label')) buyBtn.querySelector('.cr-btn__label').textContent = `Mejorar ${fmtNum(cost)}`;
    buyBtn.dataset.key = key;
    card.replaceChildren(
      h('div', { class: 'cr-upg__icon', html: ICONS[info.icon] }),
      h('div', { class: 'cr-upg__name' }, u.name),
      h('div', { class: 'cr-upg__desc' }, info.desc),
      h('div', { class: 'cr-pips' }, Array.from({ length: MAX_UPGRADE_LEVEL }, (_, i) =>
        h('i', { class: `cr-pip${i < lvl ? ' on' : ''}${fresh && i === lvl - 1 ? ' fresh' : ''}` }))),
      h('div', { class: 'cr-upg__level' }, `Nivel ${lvl} / ${MAX_UPGRADE_LEVEL}`),
      buyBtn);
  }

  function anim(key, cls) {
    const c = cards[key];
    c.classList.remove(cls);
    void c.offsetWidth;
    c.classList.add(cls);
  }

  function buy(key) {
    const lvl = save.getUpgrades(charId)[key];
    const cost = UPGRADE_COSTS[lvl];
    if (lvl >= MAX_UPGRADE_LEVEL) return;
    if (!save.spend(cost)) { playError(); anim(key, 'shake'); return; }
    save.setUpgrade(charId, key, lvl + 1);
    audio.play('purchase');
    bar.coins.set(save.data.coins, 'spend');
    fill(key, true);
    anim(key, 'flash');
    const b = h('div', { class: 'cr-burst', style: { left: '50%', top: '30%' } }, '+1 nivel');
    cards[key].appendChild(b);
    setTimeout(() => b.remove(), 950);
    for (const k of Object.keys(cards)) if (k !== key) fill(k); // refresca los colores del botón
  }

  Object.keys(UPGRADES).forEach((key, i) => {
    cards[key] = h('div', { class: 'cr-panel cr-upg', style: { '--i': String(i), '--c': UPGRADE_INFO[key].color } });
    fill(key);
    grid.appendChild(cards[key]);
  });
  renderPicker();
  const el = h('div', { class: 'cr-screen cr-enter' }, bar.el, picker, grid);
  return { el, view: 'title', dim: true, onBack: back };
}
