// Selección de personaje: preview 3D en el garaje, panel con poder, compra de bloqueados.
import { h, button, fmtNum } from './dom.js';
import { ICONS } from './icons.js';
import { topbar, playError, shake } from './common.js';
import { characterInfo } from './meta.js';
import { CHARACTERS } from '../core/data.js';
import { getPortrait } from './portraits.js';
import { audio } from '../audio/index.js';

export function characterScreen(ctx) {
  const { game, router, stage } = ctx;
  const save = game.save;
  let idx = Math.max(0, CHARACTERS.findIndex((c) => c.id === save.data.selectedCharacter));
  const bar = topbar(game, 'Elige tu piloto', () => router.go('title'));
  const panelHost = h('div', { class: 'cr-char-panel' });
  const dots = h('div', { class: 'cr-dots' });
  const unlocked = (id) => save.data.unlockedCharacters.includes(id);

  const dotEls = CHARACTERS.map((c, i) => {
    const d = h('button', { class: 'cr-dot', type: 'button', title: c.name, 'aria-label': c.name,
      style: { backgroundImage: `url(${getPortrait(game, c.id)})` }, onClick: () => { audio.play('uiClick'); select(i); } });
    dots.appendChild(d);
    return d;
  });

  function renderPanel() {
    const c = CHARACTERS[idx];
    const info = characterInfo(c.id);
    const owned = unlocked(c.id);
    const card = h('div', { class: 'cr-panel cr-char-card cr-swap' },
      h('h2', { class: 'cr-char-name' }, c.name),
      h('span', { class: 'cr-char-animal' }, info.animalName),
      h('div', { class: 'cr-power' },
        h('div', { class: 'cr-power__icon' }, info.powerIcon),
        h('div', {}, h('div', { class: 'cr-power__label' }, 'Poder'), h('div', { class: 'cr-power__name' }, info.powerName), h('div', { class: 'cr-power__desc' }, info.powerDesc))),
      owned ? null : h('div', { class: 'cr-char-lock' }, h('span', { html: ICONS.lock }), 'Bloqueado'));
    card.style.setProperty('--kart', info.kart);
    card.querySelector('.cr-char-animal').style.setProperty('--fur', info.fur);
    const actions = h('div', { class: 'cr-char-actions' },
      owned
        ? button('Elegir', () => { save.data.selectedCharacter = c.id; save.persist(); router.go('tracks'); }, { variant: 'green', icon: ICONS.next, cls: 'cr-btn--big' })
        : button(`${fmtNum(c.cost)}`, () => buy(c), { variant: 'primary', icon: ICONS.coin, cls: 'cr-btn--big' }));
    const lbl = actions.querySelector('.cr-btn__label');
    if (!owned && lbl) lbl.textContent = `Comprar ${fmtNum(c.cost)}`;
    actions.querySelector('.cr-btn').id = owned ? 'btn-choose' : 'btn-buy';
    panelHost.replaceChildren(card, actions);
    dotEls.forEach((d, i) => {
      d.classList.toggle('is-active', i === idx);
      const lk = !unlocked(CHARACTERS[i].id);
      d.classList.toggle('is-locked', lk);
      d.querySelector('.cr-dot__lock')?.remove();
      if (lk) d.appendChild(h('span', { class: 'cr-dot__lock', html: ICONS.lock }));
    });
  }

  function buy(c) {
    if (!save.spend(c.cost)) {
      playError();
      shake(panelHost);
      return;
    }
    save.unlock('unlockedCharacters', c.id);
    audio.play('purchase');
    bar.coins.set(save.data.coins, 'spend');
    renderPanel();
  }

  function select(i) {
    idx = (i + CHARACTERS.length) % CHARACTERS.length;
    stage.showCharacter(CHARACTERS[idx].id);
    renderPanel();
  }

  const el = h('div', { class: 'cr-screen cr-enter' }, bar.el,
    h('div', { class: 'cr-char-nav cr-char-nav--l' }, button(null, () => select(idx - 1), { variant: 'ghost', icon: ICONS.back, cls: 'cr-btn--round', title: 'Anterior' })),
    h('div', { class: 'cr-char-nav cr-char-nav--r' }, button(null, () => select(idx + 1), { variant: 'ghost', icon: ICONS.next, cls: 'cr-btn--round', title: 'Siguiente' })),
    dots, panelHost);
  select(idx);

  const onKey = (e) => {
    if (e.code === 'ArrowLeft') select(idx - 1);
    else if (e.code === 'ArrowRight') select(idx + 1);
    else if (e.code === 'Enter') el.querySelector('#btn-choose, #btn-buy')?.click();
  };
  window.addEventListener('keydown', onKey);
  const portrait = window.innerWidth / window.innerHeight < 0.9;
  return {
    el, view: 'garage', offset: portrait ? { x: 0, y: 0.17 } : { x: 0.2, y: 0 },
    onBack: () => router.go('title'),
    dispose: () => window.removeEventListener('keydown', onKey),
  };
}
