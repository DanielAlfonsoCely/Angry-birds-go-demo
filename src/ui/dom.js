// Utilidades DOM compartidas por las pantallas: creación de nodos, botones con sonido,
// formato de tiempos y animaciones de números.
import { audio } from '../audio/index.js';

/**
 * Crea un elemento. `props` admite class, text, html, style, data-*, on{Evento} y atributos.
 * Los hijos pueden ser nodos, strings o arrays (los null/false se ignoran).
 */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') {
      for (const [sk, sv] of Object.entries(v)) {
        if (sk.startsWith('--')) el.style.setProperty(sk, sv); else el.style[sk] = sv;
      }
    }
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children) {
    if (c == null || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
}

/**
 * Botón arcade. variant: 'primary'|'secondary'|'ghost'|'danger'|'green'.
 * sound: 'uiClick' (por defecto), 'uiBack' o null.
 */
export function button(label, onClick, { variant = 'primary', sound = 'uiClick', icon = null, cls = '', title = null } = {}) {
  const b = h('button', { class: `cr-btn cr-btn--${variant} ${cls}`, type: 'button', title, 'aria-label': title ?? undefined },
    icon ? h('span', { class: 'cr-btn__icon', html: icon }) : null,
    label != null ? h('span', { class: 'cr-btn__label' }, label) : null);
  b.addEventListener('click', (e) => {
    if (b.disabled) return;
    if (sound) audio.play(sound);
    onClick?.(e);
  });
  return b;
}

/** 83.456 -> "1:23.45" */
export function formatTime(sec) {
  if (sec == null || !Number.isFinite(sec)) return '--:--.--';
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, '0')}`;
}

/** 1 -> "1º" */
export const ordinal = (n) => `${n}º`;

export const fmtNum = (n) => Math.round(n).toLocaleString('es');

/** Anima el texto de un elemento de `from` a `to` en `ms`. onTick recibe el valor entero actual. */
export function countUp(el, from, to, ms = 1200, onTick = null) {
  const start = performance.now();
  let last = Math.round(from);
  let raf = 0;
  const step = (now) => {
    const k = Math.min(1, (now - start) / ms);
    const e = 1 - Math.pow(1 - k, 3);
    const v = Math.round(from + (to - from) * e);
    if (v !== last) { last = v; onTick?.(v); }
    el.textContent = fmtNum(v);
    if (k < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

/** Reinicia una animación CSS de clase `cls` en `el`. */
export function replayAnim(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth; // fuerza reflow para reiniciar la animación
  el.classList.add(cls);
}

export const hexCss = (hex) => `#${hex.toString(16).padStart(6, '0')}`;

export const isTouchDevice = () =>
  ('ontouchstart' in window) || (navigator.maxTouchPoints ?? 0) > 0 || matchMedia('(pointer: coarse)').matches;
