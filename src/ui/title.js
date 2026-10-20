// Pantalla de título: logo animado, Jugar / Tienda / Ajustes.
import { h, button, isTouchDevice } from './dom.js';
import { ICONS } from './icons.js';
import { coinsBadge } from './common.js';

function logoRow(text, cls, offset) {
  return h('span', { class: `cr-logo__row ${cls}` },
    [...text].map((c, i) => h('span', { class: 'cr-logo__ch', style: { '--i': String(i + offset) } }, c)));
}

export function titleScreen(ctx) {
  const { game, router } = ctx;
  const coins = coinsBadge(game, 'cr-title-coins');
  const el = h('div', { class: 'cr-screen cr-enter cr-title-screen' },
    h('div', { class: 'cr-logo' },
      logoRow('CUMBRE', 'cr-logo__row--a', 0),
      logoRow('RUSH', 'cr-logo__row--b', 6),
      h('span', { class: 'cr-logo__tag' }, 'Karts cuesta abajo')),
    coins.el,
    h('div', { class: 'cr-menu' },
      button('Jugar', () => router.go('characters'), { icon: ICONS.play, cls: 'cr-btn--big' }),
      h('div', { class: 'cr-menu__row' },
        button('Tienda', () => router.go('shop', { from: 'title' }), { variant: 'secondary', icon: ICONS.wrench }),
        button('Ajustes', () => router.go('settings'), { variant: 'ghost', icon: ICONS.gear }))),
    isTouchDevice() ? null : h('div', { class: 'cr-hint' }, 'Flechas girar  ·  Espacio derrapar / catapulta  ·  E objeto  ·  Q poder  ·  Esc pausa'));
  el.querySelector('.cr-btn--big').id = 'btn-play';
  return { el, view: 'title' };
}
