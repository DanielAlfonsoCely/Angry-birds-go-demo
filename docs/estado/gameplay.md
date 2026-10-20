# Estado: Gameplay (src/gameplay) — Paso 2 terminado

## Hecho (Paso 1)
- `createRace(game,{trackId,characterId})` → `{scene, track, karts, player, update, dispose, getStandings(), getPlayerState(), phase, pause(bool), raceTime, autopilot}`.
  `?autopilot=1` hace que la IA maneje al jugador. Archivos: `race.js`, `launch.js`, `items.js`, `powers.js`, `ai.js`, `standings.js`, `fx.js`, `state.js`, `models.js`.
- Eventos: COUNTDOWN, LAUNCH(_METER), COIN, ITEM_*, POWER_*, HIT, DRIFT_BOOST, TRICK, LAND, POSITION, FINISH, RACE_END (reward = premio por puesto + monedas).

## Paso 2: balance
Causa real del dominio de Nilo/Chispa: (1) el poder Superbrinco (salto 22 m/s) de la IA era un atajo gratis (~6 s por carrera);
(2) poderes de contacto (turbo corto, embestida, sismo) rendían menos que los de ventaja gratis; (3) las mejoras de la IA (nivel 1-5)
pesaban demasiado frente al jugador en 0; (4) rubber-band de ±7 % demasiado suave. La burbuja x1.15 no era el problema.
Cambios: brinco 9/6 y la IA solo lo usa si hay rival delante (<70 m); turbo 1.9 s; embestida y sismo dan un pequeño impulso (sismo radio 22);
mejoras de la IA escaladas (pico 0.8, selva 0.55, canon 0.7); rubber-band asimétrico (-8 % al que va delante, +6 % al rezagado, 80 m);
la IA y el autopiloto derrapan en curvas más suaves (21 mini-turbos por carrera, antes 1-2 s de derrape).

Autopiloto del jugador sin mejoras (Tuko), `--runs=6`, mismas condiciones de pistas del 20/10:
| Pista | Puesto medio antes -> después | Ventana de llegada | Adelantamientos | Monedas medias |
|---|---|---|---|---|
| pico | 4.6 (n=5) -> 3.2 | ~12 s -> 6.6 s | ~10 -> 19.7 | 20 -> 30 |
| selva | 5.2 -> 4.0 | 8.5 -> 5.7 s | 14 -> 18 | 10 -> 13 |
| canon | 5.8 -> 5.3 (brecha 4.6 s con el 1.º) | 11.8 -> 7.7 s | 9 -> 19.5 | 44 -> 26 |
Ojo: Pistas y Físicas cambiaron tiempos de vuelta durante el paso (carreras de ~57-66 s); la varianza entre corridas es alta (n=6).

## Otros cambios
- Monedas: radio de recogida 2.2 -> 3.0 m; la IA/autopiloto apuntan a la fila de monedas más cercana (sin caja que buscar), `coinLove` por IA.
- Catapulta más baja y compacta (sin losa grande bajo la cámara); se hunde y desaparece 0.5-1.2 s tras el lanzamiento.
- `getPlayerState()`: position,total,time,coins,item,powerCharge,powerReady,phase('countdown'|'racing'|'finished'),launchMeter (número),
  launchHolding,launched,speedKmh,progress y reward provisional. RACE_END.reward = premio + monedas (verificado).
- Humo y onda de sismo ya no se emiten cerca de la cámara (neblina rosada en canon).

## Verificación
`npm run build` OK. `node tests/gameplay-race.mjs --track=pico|selva|canon --runs=N [--tune={"rubber":0,"aiScale":0}]` imprime puesto
medio, ventana, adelantamientos, victorias y tiempo medio por personaje; sin errores de consola. Captura de la catapulta nueva sin revisar.

## Pendiente
- Revisar visualmente la catapulta (`--shots`). Tecla de pausa: la UI emite PAUSE y llama `race.pause()`.

## Paso 3 (feedback de jugador)
- Catapulta: el medidor oscila mientras se mantiene; al soltar queda fijado (`launchLocked:true`, `launchMeter` = valor fijado) y se aplica en el ¡YA!. Se puede re-tensar antes del ¡YA! (reinicia la oscilación). Si se mantiene en el ¡YA!, se usa el valor del instante de soltar (ventana 0.6 s). LAUNCH_METER ahora incluye `locked`.
- Mejoras por personaje: el jugador usa `statsWithUpgrades(game.save.getUpgrades(characterId))`.
- IA adaptativa: nivel de mejoras de la IA = min(nivel de pista × escala, nivel medio de mejoras del jugador + AI_CATCHUP). Constante `AI_CATCHUP` en `race.js` (`__tune.catchup` para pruebas).
- Mirar atrás: `controls.lookBack` -> `cam.setLookBack(bool)` si existe (comprobación defensiva con `typeof`; hoy Físicas aún no la define en el momento de escribir esto).
