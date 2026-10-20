// Ajustes: volúmenes, controles y borrar progreso.
import { h, button } from './dom.js';
import { ICONS } from './icons.js';
import { topbar, confirmDialog } from './common.js';
import { audio } from '../audio/index.js';

function slider(label, icon, key, save) {
  const val = h('div', { class: 'cr-slider__val' });
  const input = h('input', { class: 'cr-range', type: 'range', min: '0', max: '100', step: '1', 'aria-label': label });
  const sync = () => {
    input.style.setProperty('--p', `${input.value}%`);
    val.textContent = `${input.value}`;
  };
  input.value = String(Math.round((save.data.settings[key] ?? 0.6) * 100));
  sync();
  input.addEventListener('input', () => {
    sync();
    save.data.settings[key] = Number(input.value) / 100;
    audio.setVolumes({ [key]: save.data.settings[key] });
  });
  input.addEventListener('change', () => { save.persist(); if (key === 'sfx') audio.play('coin'); });
  return h('div', {},
    h('div', { class: 'cr-slider__lbl' }, label),
    h('div', { class: 'cr-slider' }, h('div', { class: 'cr-slider__ico', html: icon }), input, val));
}

export function settingsScreen(ctx) {
  const { game, router, root } = ctx;
  const save = game.save;
  const back = () => router.go('title');
  const bar = topbar(game, 'Ajustes', back);
  const controls = [
    ['Girar', '← → / A D'], ['Derrapar / catapulta', 'Espacio / Shift'], ['Truco aéreo', '↑ / W'],
    ['Usar objeto', 'E / X'], ['Poder', 'Q / Z'], ['Pausa', 'Esc / P'],
  ];
  const panel = h('div', { class: 'cr-panel' },
    slider('Música', ICONS.music, 'music', save),
    h('div', { style: { height: '10px' } }),
    slider('Efectos', ICONS.sound, 'sfx', save),
    h('div', { class: 'cr-sep', style: { margin: '18px 0 12px' } }),
    h('h3', { class: 'cr-h3' }, 'Controles'),
    h('div', { class: 'cr-controls' }, controls.map(([a, k]) => [h('span', {}, a), h('span', { class: 'cr-muted' }, k)])),
    h('div', { class: 'cr-sep', style: { margin: '14px 0' } }),
    button('Borrar progreso', () => confirmDialog(root, {
      title: 'Borrar progreso', text: 'Se perderán monedas, personajes, pistas y mejoras. No se puede deshacer.', yes: 'Borrar', danger: true,
    }, () => { save.reset(); audio.setVolumes(save.data.settings); router.go('settings'); }), { variant: 'danger', icon: ICONS.trash }));
  panel.classList.add('cr-swap');
  const el = h('div', { class: 'cr-screen cr-enter' }, bar.el, h('div', { class: 'cr-settings', style: { animation: 'none' } }, panel));
  return { el, view: 'title', dim: true, onBack: back };
}
