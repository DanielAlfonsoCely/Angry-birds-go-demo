// STUB del orquestador: arranca una carrera directo y muestra un HUD mínimo.
// El Agente de UI/Flujo lo reemplaza con menús, selección, HUD completo, resultados y tienda.
// Parámetros de URL útiles para pruebas: ?track=pico|selva|canon&char=tuko  (salta los menús)
import { createRace } from '../gameplay/index.js';
import { EVENTS } from '../core/contracts.js';

export function createUI(game, root) {
  const params = new URLSearchParams(location.search);
  const trackId = params.get('track') ?? 'pico';
  const characterId = params.get('char') ?? 'tuko';

  const hud = document.createElement('div');
  hud.style.cssText = 'position:absolute;top:12px;left:16px;color:#fff;font:700 20px system-ui;text-shadow:0 2px 4px #000';
  root.appendChild(hud);

  let status = '';
  game.events.on(EVENTS.COUNTDOWN, ({ n }) => { status = n > 0 ? String(n) : '¡YA!'; });
  game.events.on(EVENTS.RACE_END, ({ results }) => { status = `Meta: ${results[0].time.toFixed(2)} s`; });

  const race = createRace(game, { trackId, characterId });
  game.setMode({
    scene: race.scene,
    update(dt, time) {
      race.update(dt, time);
      hud.textContent = `${status}  ${Math.round(race.player.speed * 3.6)} km/h`;
    },
    dispose: () => race.dispose(),
  });
}
