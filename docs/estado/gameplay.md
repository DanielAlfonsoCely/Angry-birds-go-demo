# Estado: Gameplay (src/gameplay) — Paso 1 terminado

## Hecho
- `createRace(game,{trackId,characterId})` → `{scene, track, karts, player, update, dispose, getStandings(), getPlayerState(), phase, pause(bool), raceTime, autopilot}`.
  `?autopilot=1` o `race.autopilot=true` hace que la IA maneje al jugador.
- Archivos: `race.js` (orquesta, subpasos de 1/30 s, meta, RACE_END, audio.setEngine), `launch.js` (catapulta, 3-2-1-0, medidor,
  ventana 0.6 s, rating perfect/good/normal; catapulta aplastada en Y para no tapar al kart), `items.js` (monedas, cajas, cohete,
  bola de nieve, miel, imán), `powers.js` (6 poderes + carga), `ai.js` (lookahead, línea interior, cajas/pads, miel, derrape,
  trucos, objetos/poderes, atasco), `standings.js`, `fx.js` (halo imán, aura embestida, burbuja), `state.js`, `models.js`.
- Eventos: COUNTDOWN, LAUNCH(_METER), COIN, ITEM_PICKUP/USE, POWER_CHARGE/USE, HIT (wall solo del jugador; sismo, bola, embestida),
  DRIFT_BOOST, TRICK, LAND (impact normalizado 0..1), POSITION, FINISH, RACE_END (reward = premio por puesto + monedas).
  Los roces kart-kart no emiten HIT. No toco `game.save` ni la tecla de pausa; `pause(true)` apaga el motor.
- Rubber-band de la IA ±7 % (topSpeed/accel) según distancia al jugador; mejoras de la IA por `AI_UPGRADE_RANGE`.
- `createParticles(scene, track.theme)` (nota del orquestador).

## Verificaciones
- `npm run build` OK.
- `node tests/gameplay-race.mjs --track=pico|canon [--verbose] [--shots]` (autopiloto, timeScale 3, sin render salvo `--shots`,
  vite sin HMR): pico y canon terminan con RACE_END de 6 resultados, tiempos crecientes, la IA usa 4 objetos y 6 poderes, sin errores
  de consola. pico: 63 s de juego, ganó ai2; canon: 51 s.
- Captura `tests/screenshots/gp-catapult-2.png`: kart visible con la catapulta tensada.

## Pendientes / propuestas (Paso 2)
- Balance: el autopiloto del jugador (mejoras 0) queda último; la IA de Chispa gana por ~8 s en pico. Subir el efecto del rubber-band
  o limitar el nivel de mejoras de la IA.
- Tecla de pausa: la UI debe emitir `EVENTS.PAUSE` y llamar `race.pause()`; gameplay no emite PAUSE.
- Revisar el test de humo con la UI nueva: `?track=..` ya no entra directo en `tests/smoke.mjs` (muestra el menú) — es de UI.
