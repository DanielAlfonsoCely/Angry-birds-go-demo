// Piezas compartidas por las pantallas: contador de monedas, barra superior y diálogo de confirmación.
import { h, button, fmtNum, replayAnim } from './dom.js';
import { ICONS } from './icons.js';
import { audio } from '../audio/index.js';

/** Contador de monedas. set(n, 'bump'|'spend') actualiza y anima. */
export function coinsBadge(game, cls = '') {
  const num = h('span', {}, fmtNum(game.save.data.coins));
  const el = h('div', { class: `cr-coins ${cls}`, 'data-coins': '' }, h('span', { html: ICONS.coin, style: { display: 'inline-flex' } }), num);
  return {
    el,
    set(n, anim) {
      num.textContent = fmtNum(n);
      if (anim) replayAnim(el, anim);
    },
  };
}

/** Barra superior de menús: botón atrás + título + monedas. */
export function topbar(game, title, onBack) {
  const coins = coinsBadge(game);
  const el = h('div', { class: 'cr-topbar' },
    onBack ? button(null, onBack, { variant: 'ghost', icon: ICONS.back, cls: 'cr-btn--round', sound: 'uiBack', title: 'Atrás' }) : null,
    h('h1', { class: 'cr-title cr-topbar__title' }, title),
    coins.el);
  return { el, coins };
}

/** Diálogo de confirmación sobre `root`. Devuelve una función para cerrarlo. */
export function confirmDialog(root, { title, text, yes = 'Aceptar', no = 'Cancelar', danger = false }, onYes) {
  const close = () => dlg.remove();
  const dlg = h('div', { class: 'cr-dialog cr-dim' },
    h('div', { class: 'cr-panel' },
      h('h2', {}, title), h('p', {}, text),
      h('div', { class: 'cr-dialog__btns' },
        button(no, close, { variant: 'ghost', sound: 'uiBack' }),
        button(yes, () => { close(); onYes?.(); }, { variant: danger ? 'danger' : 'green' }))));
  root.appendChild(dlg);
  return close;
}

export const playError = () => audio.play('error');

/** Sacude un elemento (error de compra, pista bloqueada). */
export function shake(el) {
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = 'cr-shake .4s ease both';
}
