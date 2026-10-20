// Selección de pista: tarjetas con ilustración, candados, mejor tiempo y mejor puesto.
import { h, formatTime, ordinal } from './dom.js';
import { ICONS } from './icons.js';
import { topbar, playError, shake } from './common.js';
import { TRACKS, trackName, getCharacter } from './meta.js';
import { TRACK_ORDER } from '../core/data.js';
import { getPortrait } from './portraits.js';
import { audio } from '../audio/index.js';

/** Ilustración vectorial por tema a partir de los colores de meta. */
function trackArt(id) {
  const t = TRACKS[id];
  const [c0, c1, c2] = t.colors;
  const g = `cr-art-${id}`;
  let extra = '';
  if (t.theme === 'snow') {
    extra = `<path d="M0 150 L60 70 L95 110 L150 40 L215 120 L260 80 L360 150 V190 H0Z" fill="#cfe4f7"/><path d="M150 40 L132 68 L146 62 L152 72 L162 60 L172 70Z" fill="#fff"/><path d="M60 70 L48 88 L58 84 L66 92 L74 82Z" fill="#fff"/>
      <path d="M-10 190 Q120 120 200 150 T380 120 V190Z" fill="#fff"/><g fill="#2d6a4f"><path d="M40 170 l12 -34 l12 34z M68 175 l10 -28 l10 28z M300 160 l10 -30 l10 30z"/></g>`;
  } else if (t.theme === 'jungle') {
    extra = `<path d="M0 140 Q80 80 170 120 T360 100 V190 H0Z" fill="#2f9e68"/><g fill="#176b44"><circle cx="50" cy="118" r="30"/><circle cx="110" cy="130" r="26"/><circle cx="290" cy="112" r="34"/><circle cx="330" cy="135" r="24"/></g>
      <rect x="45" y="140" width="10" height="50" fill="#5b3a1e"/><rect x="286" y="140" width="10" height="50" fill="#5b3a1e"/><path d="M0 190 Q140 130 360 175 V190Z" fill="#6bd16a"/>`;
  } else {
    extra = `<path d="M0 150 L70 60 L110 100 L170 30 L230 110 L290 70 L360 150 V190 H0Z" fill="#3b1c2c"/><path d="M170 30 L152 62 L164 56 L170 72 L180 56 L190 64Z" fill="#ff7b2e"/>
      <path d="M-10 190 Q120 130 220 160 T380 140 V190Z" fill="#5a2a22"/><path d="M0 182 Q150 150 360 178 V190H0Z" fill="#ff7b2e"/>`;
  }
  return `<svg viewBox="0 0 360 190" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
    <rect width="360" height="190" fill="url(#${g})"/><circle cx="${t.theme === 'volcano' ? 90 : 290}" cy="46" r="${t.theme === 'volcano' ? 30 : 22}" fill="${t.theme === 'volcano' ? '#ffb347' : '#fff6c9'}" opacity=".9"/>${extra}
    <path d="M150 190 Q175 150 200 120 Q215 100 205 80" stroke="${c0}" stroke-width="14" fill="none" stroke-linecap="round" opacity=".75"/></svg>`;
}

export function trackScreen(ctx) {
  const { game, router } = ctx;
  const save = game.save.data;
  const charId = save.selectedCharacter;
  const bar = topbar(game, window.innerWidth < 760 ? 'Pistas' : 'Elige la pista', () => router.go('characters'));
  bar.el.insertBefore(h('div', { class: 'cr-racer-chip' }, h('img', { src: getPortrait(game, charId), alt: '' }), h('span', { class: 'cr-racer-chip__n' }, getCharacter(charId).name)), bar.coins.el);

  const cards = TRACK_ORDER.map((id, i) => {
    const t = TRACKS[id];
    const open = save.unlockedTracks.includes(id);
    const bt = save.bestTimes[id];
    const bp = save.bestPositions[id];
    const prev = TRACK_ORDER[i - 1];
    const card = h('button', { class: `cr-track${open ? '' : ' is-locked'}`, type: 'button', 'data-track': id, style: { '--i': String(i) } },
      h('span', { class: 'cr-track__art', html: trackArt(id) }),
      h('span', { class: 'cr-track__num' }, String(i + 1)),
      h('span', { class: 'cr-track__body' },
        h('span', { class: 'cr-track__name' }, t.name),
        h('span', { class: 'cr-track__theme', style: { background: t.accent } }, t.themeName),
        h('span', { class: 'cr-track__blurb' }, t.blurb),
        h('span', { class: 'cr-track__stats' },
          h('span', { class: 'cr-stat' }, h('span', { class: 'cr-stat__k', html: `${ICONS.clock}Mejor tiempo` }), h('span', { class: 'cr-stat__v' }, formatTime(bt))),
          h('span', { class: 'cr-stat' }, h('span', { class: 'cr-stat__k', html: `${ICONS.trophy}Mejor puesto` }), h('span', { class: 'cr-stat__v' }, bp ? ordinal(bp) : '--')))),
      open ? null : h('span', { class: 'cr-track__lock' }, h('span', { html: ICONS.lock, style: { display: 'contents' } }), h('b', {}, 'Bloqueada'), h('span', {}, `Termina en el top 3 de ${trackName(prev)}`)));
    card.addEventListener('click', () => {
      if (!open) {
        playError();
        shake(card);
        return;
      }
      audio.play('uiClick');
      ctx.startRace(id, charId);
    });
    return card;
  });
  const el = h('div', { class: 'cr-screen cr-enter' }, bar.el, h('div', { class: 'cr-tracks' }, cards));
  return { el, view: 'title', dim: true, onBack: () => router.go('characters') };
}
