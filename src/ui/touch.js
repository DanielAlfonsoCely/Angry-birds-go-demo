// Controles táctiles: mitades de pantalla para girar (deslizar arriba = truco), botón Derrapar, objeto y poder.
import { h } from './dom.js';
import { ICONS } from './icons.js';

export function createTouchControls(game, { info }) {
  const input = game.input;
  const cleanup = [];

  function steerZone(side) {
    const action = side === 'l' ? 'left' : 'right';
    const zone = h('div', { class: `cr-steer cr-steer--${side}` },
      h('div', { class: 'cr-steer__hint', html: side === 'l' ? ICONS.back : ICONS.next }));
    const active = new Map(); // pointerId -> y inicial
    const set = (on) => { input.setVirtual(action, on); zone.classList.toggle('on', on); };
    zone.addEventListener('pointerdown', (e) => {
      zone.setPointerCapture?.(e.pointerId);
      active.set(e.pointerId, e.clientY);
      set(true);
    });
    zone.addEventListener('pointermove', (e) => {
      const y0 = active.get(e.pointerId);
      if (y0 != null && y0 - e.clientY > 70) {
        active.set(e.pointerId, e.clientY);
        input.setVirtual('trick', true);
        setTimeout(() => input.setVirtual('trick', false), 80);
      }
    });
    const end = (e) => { active.delete(e.pointerId); if (!active.size) set(false); };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
    zone.addEventListener('lostpointercapture', end);
    zone.addEventListener('contextmenu', (e) => e.preventDefault());
    return zone;
  }

  function holdButton(cls, action, content, { tap = false } = {}) {
    const b = h('div', { class: `cr-tbtn ${cls}`, role: 'button' }, content);
    const down = (e) => {
      e.preventDefault();
      b.setPointerCapture?.(e.pointerId);
      b.classList.add('on');
      input.setVirtual(action, true);
      if (tap) setTimeout(() => input.setVirtual(action, false), 80);
    };
    const up = () => { b.classList.remove('on'); if (!tap) input.setVirtual(action, false); };
    b.addEventListener('pointerdown', down);
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('lostpointercapture', up);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    return b;
  }

  const meterFill = h('i');
  const itemIco = h('span', {});
  const itemBtn = holdButton('cr-tbtn--item', 'item', itemIco, { tap: true });
  itemBtn.style.opacity = '.45';
  const powerBtn = holdButton('cr-tbtn--power', 'power', [h('span', {}, info.powerIcon), h('div', { class: 'cr-tbtn__meter' }, meterFill)], { tap: true });
  const drift = holdButton('cr-tbtn--drift', 'drift', 'DERRAPAR');
  const el = h('div', { class: 'cr-touch' },
    steerZone('l'), steerZone('r'), itemBtn, powerBtn, drift,
    h('div', { class: 'cr-swipe-hint' }, 'Desliza arriba para truco'));

  cleanup.push(() => { for (const a of ['left', 'right', 'drift', 'item', 'power', 'trick']) input.setVirtual(a, false); });
  return {
    el,
    setItem(it) { itemIco.textContent = it ? it.icon : ''; itemBtn.style.opacity = it ? '1' : '.45'; },
    setCharge(c) { meterFill.style.width = `${c * 100}%`; },
    setReady(r) { powerBtn.classList.toggle('ready', r); },
    dispose() { cleanup.forEach((f) => f()); },
  };
}
