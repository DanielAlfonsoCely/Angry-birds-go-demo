// Guía breve de controles para la primera carrera de la partida guardada (se oculta sola).
import { h } from './dom.js';
import { EVENTS } from '../core/contracts.js';

const keys = (...k) => h('span', { class: 'cr-tuto__keys' }, k.map((x) => h('span', { class: 'cr-key' }, x)));
const item = (lead, text) => h('div', { class: 'cr-tuto__it' }, lead, h('span', {}, text));

/** Devuelve null si ya se vio. Marca `save.data.seenTutorial` al mostrarse. */
export function createTutorial(game, { touch }) {
  const save = game.save;
  if (!save || save.data.seenTutorial) return null;
  save.data.seenTutorial = true;
  save.persist?.();
  const el = h('div', { class: 'cr-tuto' }, touch
    ? [item('👆', 'Toca los lados: girar'), item('☝️', 'Desliza arriba: truco'), item('🕹️', 'Mantén DERRAPAR en la catapulta y suelta'), item('👀', 'Mantén "atrás" para mirar atrás')]
    : [item(keys('←', '→'), 'Girar'), item(keys('Espacio'), 'Catapulta y derrape'), item(keys('↑'), 'Truco en el aire'), item(keys('E', 'Q'), 'Objeto y poder'), item(keys('C'), 'Mirar atrás')]);
  let timer = 0, gone = false;
  const hide = () => {
    if (gone) return;
    gone = true;
    el.classList.add('out');
    timer = setTimeout(() => el.remove(), 600);
  };
  const off = game.events.on(EVENTS.LAUNCH, (p) => { if (p.kartId === 'player' || p.kartId === game.mode?.race?.player?.id) { clearTimeout(timer); timer = setTimeout(hide, 3500); } });
  timer = setTimeout(hide, 20000); // respaldo si nunca se lanza
  return { el, dispose() { off(); clearTimeout(timer); el.remove(); } };
}
