# Estado: Gameplay (src/gameplay) — PAUSADO

## Hecho
- Leí toda la API real: physics (`kart.js`, `camera.js`, `constants.js`), track (`index.js`, `query.js`, `pickups.js`, `path.js`), art (`particles.js`, `kartModel.js`) y audio (`audio.js`).
- `src/gameplay/models.js` (nuevo; todavía no se importa): geometrías propias para la catapulta de resorte
  (`createCatapult()` con `setTension`/`release`/`update` y `pullback`), la bola de nieve, el charco de miel,
  el halo del imán y el aura de embestida. `dispose()` libera geometrías y materiales.
- `src/gameplay/index.js` sigue siendo el STUB del orquestador. El build pasa.

## Falta (tarea original completa)
- `race.js`: fases countdown/racing/finished, subpasos de 1/30 s (para timeScale 3), choques por par, `onEvent` de cada kart
  → LAND/DRIFT_BOOST/TRICK/HIT(wall, solo del jugador). Llamar `audio.setEngine` en cada frame y `setEngine(null)` en pausa/dispose.
  API: `getStandings()`, `getPlayerState()`, `phase`, `pause(bool)`, `raceTime`, `autopilot` (y `?autopilot=1`).
- `launch.js`: espera previa de 0.6 s, después 3-2-1-0 (COUNTDOWN). Medidor triangular de 1.2 s mientras `launchHold`; se reinicia al soltar.
  Ventana de 0.6 s tras el ¡YA!. Rating: perfect 0.80–0.95 (boost de 1.6 s), good 0.5–0.8 o >0.95 (0.8 s) y normal. Retroceso visual del kart
  sobre la tangente: se restaura la posición antes de `kart.launch`. La IA saca un rating al azar.
- `items.js`: monedas a 2.2 m (12 m con imán; reaparecen a los 6 s y se restaura su posición original) y cajas (3 s). Reparto por posición
  (al 1.º le toca más miel/imán y al último más cohete). Cohete `applyBoost(2,1.1)`. La bola de nieve avanza por t/lateral hacia el kart de
  adelante, a ≥55 m/s, y hace `spinOut(1)`. La miel es una trampa detrás que aplica `slowDown(0.5,1.2)` y tiene 1.5 s de gracia para el dueño. Imán: 6 s.
- `powers.js`: carga dt/14 + 0.04 por moneda y POWER_CHARGE del jugador. Poderes: turbo `applyBoost(1.2,1.5)`, sismo de 18 m con `spinOut(1.2)` y
  shockwave, burbuja `effects.shield=5` + `applyBoost(5,0.375)`, embestida `effects.ram=4` (HIT a la víctima en kartHit),
  brinco `jump(22.4, 8)` (solo en el suelo) y humo (nube de 6 m de radio y 4 s que aplica `slowDown(0.6,1.5)`). Gameplay descuenta `effects.*`.
- `ai.js`: persecución pura con lookahead de 10+0.55·v sobre `kart.forward`, steer = atan2(to·right, to·fwd)·2.2. Línea por el
  interior de la curva (`dot(tangente lejana, right)`) + ruido senoidal; derrape si la curva es >0.35 y v>20; trucos si vy>5 en el aire;
  busca pads y cajas y esquiva la miel. Rubber-band de ±7 % sobre `stats.topSpeed/accel` según la distancia al jugador.
  Mejoras con `AI_UPGRADE_RANGE`. Si se atasca (v<4 durante 2.5 s), `respawn`.
- `standings.js` + meta: posición por (terminado, orden) y luego t. Emite POSITION al cambiar y FINISH. Tras la meta del jugador, 5 s de
  gracia y luego tiempos estimados (monótonos). Al final RACE_END {results, coinsCollected, reward}. Los karts que terminan frenan con
  `slowDown` en la recta de 110 m que sigue a la meta (t se queda en 1: usar `track.frames` para dirigir ahí) y no chocan.
- Feedback: polvo y chispas al derrapar, ráfaga al soltar el mini-turbo, polvo al aterrizar (color según el tema), `cam.shake` con
  golpes, y órbita de cámara si el jugador gana.
- `tests/gameplay-race.mjs`: con Playwright, `import('/src/gameplay/index.js')` en la página, envolver `__game.events.emit` para registrar
  eventos, crear la carrera con `autopilot`, `timeScale=3`, esperar RACE_END con 6 resultados y comprobar ITEM_USE/POWER_USE de la IA.

## Notas para otros
- La audio toca spinOut en cualquier HIT que no sea de pared: para roces kart-kart propongo no emitir HIT (o agregar `by:'bump'` en audio).

## Próximo paso concreto
Escribir race.js + launch.js usando models.js, cambiar index.js para reexportar `createRace` y después seguir con items/powers/ai/standings.
