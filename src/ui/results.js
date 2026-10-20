// Resultados: aplica el guardado al terminar la carrera y muestra podio, tabla y recompensa animada.
import { h, button, formatTime, ordinal, countUp, fmtNum } from './dom.js';
import { ICONS } from './icons.js';
import { getCharacter, nextTrack, trackName } from './meta.js';
import { PLACE_REWARDS, TRACK_ORDER } from '../core/data.js';
import { getPortrait } from './portraits.js';

/**
 * Normaliza el payload de RACE_END y aplica el guardado (monedas, mejores marcas, desbloqueo).
 * Se llama una sola vez por carrera, apenas termina, para no perder el progreso si el jugador sale.
 */
export function applyRaceEnd(game, race, trackId, payload = {}) {
  const save = game.save;
  const playerId = race.player?.id ?? 'player';
  let list = (payload.results ?? []).map((r) => ({ ...r }));
  // completa con los karts que faltan (por progreso) si gameplay solo informó al jugador
  const known = new Set(list.map((r) => r.kartId));
  const rest = (race.karts ?? []).filter((k) => !known.has(k.id)).sort((a, b) => b.t - a.t);
  for (const k of rest) list.push({ kartId: k.id, characterId: k.characterId, position: list.length + 1, time: null, isPlayer: k.id === playerId });
  list.sort((a, b) => a.position - b.position);
  list.forEach((r, i) => { r.position = r.position ?? i + 1; r.isPlayer = r.isPlayer || r.kartId === playerId; });
  const me = list.find((r) => r.isPlayer) ?? list[0];
  const position = me?.position ?? list.length;
  const time = me?.time ?? race.raceTime ?? null;
  const placeReward = PLACE_REWARDS[position - 1] ?? 0;
  const coins = payload.coinsCollected ?? 0;
  // reward = premio por puesto + monedas recogidas; si gameplay manda solo el premio por puesto, se suman
  let total = payload.reward > 0 ? payload.reward : placeReward + coins;
  if (payload.reward === placeReward && coins > 0) total = placeReward + coins;

  const prevTime = save.data.bestTimes[trackId];
  const prevPos = save.data.bestPositions[trackId];
  const newBestTime = time != null && (prevTime == null || time < prevTime);
  const newBestPos = prevPos == null || position < prevPos;
  const before = save.data.coins;
  save.addCoins(total);
  if (newBestTime) save.data.bestTimes[trackId] = time;
  if (newBestPos) save.data.bestPositions[trackId] = position;
  let unlockedTrack = null;
  const nxt = nextTrack(trackId);
  if (position <= 3 && nxt && !save.data.unlockedTracks.includes(nxt)) {
    save.unlock('unlockedTracks', nxt);
    unlockedTrack = nxt;
  }
  save.persist();
  return { trackId, list, position, time, placeReward, coins, total, before, newBestTime, newBestPos, unlockedTrack };
}

export function resultsScreen(ctx, sum) {
  const { game, router } = ctx;
  const heads = ['¡Victoria!', '¡Segundo lugar!', '¡Tercer lugar!', 'Buena carrera', 'Sigue practicando', 'A la próxima'];
  const faces = (r) => ({ backgroundImage: `url(${getPortrait(game, r.characterId)})` });
  const pod = [sum.list[0], sum.list[1], sum.list[2]].filter(Boolean);
  const podOrder = [pod[1], pod[0], pod[2]].filter(Boolean); // 2º, 1º, 3º
  const podium = h('div', { class: 'cr-podium' }, podOrder.map((r) => h('div', { class: `cr-podium__col p${r.position}${r.isPlayer ? ' is-player' : ''}` },
    h('div', { class: 'cr-podium__face', style: faces(r) }),
    h('div', { class: 'cr-podium__name cr-outline' }, getCharacter(r.characterId).name),
    h('div', { class: 'cr-podium__block' }, String(r.position)))));

  const rows = sum.list.map((r, i) => h('tr', { class: r.isPlayer ? 'is-player' : '', style: { '--i': String(i) } },
    h('td', {}, String(r.position)),
    h('td', {}, h('img', { src: getPortrait(game, r.characterId), alt: '' }), getCharacter(r.characterId).name),
    h('td', {}, formatTime(r.time))));

  const totalEl = h('span', {}, '0');
  const totalBox = h('div', { class: 'cr-reward__total', 'data-total': String(sum.total) }, h('span', { html: ICONS.coin, style: { display: 'inline-flex' } }), totalEl);
  const badges = h('div', { class: 'cr-badges' },
    sum.newBestTime ? h('span', { class: 'cr-badge gold', html: `${ICONS.clock}Nuevo récord de tiempo` }) : null,
    sum.newBestPos && sum.position <= 3 ? h('span', { class: 'cr-badge gold', html: `${ICONS.trophy}Mejor puesto` }) : null,
    sum.unlockedTrack ? h('span', { class: 'cr-badge', html: `${ICONS.lock}Pista desbloqueada: ${trackName(sum.unlockedTrack)}` }) : null);

  const nxt = nextTrack(sum.trackId);
  const nxtOpen = nxt && game.save.data.unlockedTracks.includes(nxt);
  const charId = game.save.data.selectedCharacter;
  const btns = h('div', { class: 'cr-results__btns' },
    button('Reintentar', () => ctx.startRace(sum.trackId, ctx.lastCharacter ?? charId), { variant: 'primary', icon: ICONS.retry }),
    nxtOpen ? button('Siguiente', () => ctx.startRace(nxt, ctx.lastCharacter ?? charId), { variant: 'green', icon: ICONS.next })
      : button('Pistas', () => ctx.exitRace('tracks'), { variant: 'green', icon: ICONS.flag }),
    button('Tienda', () => ctx.exitRace('shop', { from: 'results' }), { variant: 'secondary', icon: ICONS.wrench }),
    button('Menú', () => ctx.exitRace('title'), { variant: 'ghost', icon: ICONS.home }));
  btns.children[0].id = 'btn-retry';

  const el = h('div', { class: 'cr-screen cr-results cr-enter cr-dim' },
    h('div', { class: 'cr-results__left' },
      h('h1', { class: 'cr-title cr-results__head' }, heads[sum.position - 1] ?? 'Meta'),
      h('div', { class: 'cr-results__sub' }, `${ordinal(sum.position)} de ${sum.list.length}  ·  ${trackName(sum.trackId)}  ·  ${formatTime(sum.time)}`),
      podium),
    h('div', { class: 'cr-results__right' },
      h('div', { class: 'cr-panel', style: { padding: '14px' } }, h('table', { class: 'cr-table' }, h('tbody', {}, rows))),
      h('div', { class: 'cr-reward' },
        h('div', { class: 'cr-reward__lines' }, h('div', {}, `Puesto ${ordinal(sum.position)}: +${fmtNum(sum.placeReward)}`), h('div', {}, `Monedas recogidas: +${fmtNum(sum.coins)}`)),
        totalBox),
      badges, btns));
  btns.querySelector('button').id = 'btn-retry';

  const stop = countUp(totalEl, 0, sum.total, 1400, () => {});
  const t = setTimeout(() => { totalBox.classList.add('pop'); totalEl.textContent = fmtNum(sum.total); }, 1500);
  return { el, dispose() { stop(); clearTimeout(t); } };
}
