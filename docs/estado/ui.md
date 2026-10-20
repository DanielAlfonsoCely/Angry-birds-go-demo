# Estado del Agente de UI (Paso 2 completo)

## Hecho (Paso 1, vigente)
- Router en `src/ui/index.js`: título → personaje → pista → carrera → resultados; tienda y ajustes. Esc = atrás. Atajo `?track=&char=[&autopilot=1]`.
- `menuStage.js` (escena 3D cacheada), `portraits.js` (retratos a dataURL; necesitan que `renderer.render` funcione), `characters/tracks/shop/settings.js`.
- `raceMode.js`: la UI es dueña de la pausa (Esc/P/botón/pestaña oculta). `results.js`: `applyRaceEnd` guarda al instante; podio, tabla, recompensa.
- `touch.js`: controles táctiles (mitades para girar, deslizar arriba = truco, Derrapar/objeto/poder).

## Paso 2
- HUD verificado con carrera real (`tests/ui-hud.mjs`, autopiloto a timeScale 3): slot de objeto, carga/listo del poder, monedas,
  velocímetro, posición, progreso con rivales, medidor de catapulta, popups (Perfecto/Bien, mini turbo, truco, golpe, META) y resultados.
- `hud.js` ya no tiene fallbacks por eventos: lee `race.getPlayerState()` (usa `launched`, `launchHolding`, `phase`); los eventos solo
  disparan popups. El medidor de catapulta se muestra solo si no hay autopiloto.
- Guía de controles (`tutorial.js`): se muestra en la primera carrera de la partida (flag `save.data.seenTutorial`, se marca al mostrarse),
  teclado o táctil según el dispositivo; se oculta 3,5 s tras el lanzamiento (respaldo 20 s).
- Pantalla de carga (`.cr-loading`) mientras se construye la pista, entre el fundido de salida y la carrera.
- Puntos de progreso: el del jugador sube sobre la barra y los rivales quedan visibles debajo. Resultados compactos en pantallas bajas
  (`max-height: 680px`). Revisado en móvil 390×844 (HUD, guía, resultados).

## Paso 2b (feedback)
- Tienda por personaje: selector con retratos (desbloqueados), abre en `selectedCharacter`; usa `save.getUpgrades(id)` / `setUpgrade(id, stat, lvl)`.
- Selección de personaje: 4 mini barras de mejoras (solo si está desbloqueado).
- Mirar atrás: botón táctil "👀 atrás" (`setVirtual('lookBack')`), "C Mirar atrás" en la guía y lista de controles en la pausa.
- Catapulta: si `getPlayerState().launchLocked` es true, la aguja se queda quieta, brillo dorado, candado y texto "¡Fijado!" (defensivo si no existe).

## Verificación
- `npm run build` OK; `node tests/ui-flow.mjs` OK; `node tests/ui-hud.mjs [--mobile]` OK (capturas `tests/screenshots/ui-hud-{d,m}-*.png`).
- `ui-hud.mjs` congela la carrera (`game.paused = true`) al cumplirse cada condición y apaga el render salvo para capturar.

## Notas / coordinar
- El autopiloto no siempre hace trucos: el test solo avisa si no aparece el popup de truco.
- Gameplay debe seguir exponiendo en `getPlayerState`: position, time, coins, item, powerCharge, powerReady, phase, launchMeter, launched,
  launchHolding, speedKmh, progress. Rivales: `race.karts[i].t` y `characterId`.
- El render por software es muy lento; los tests usan timeouts largos y vite sin HMR.

## Pendiente
- Nada conocido. Ruta directa por URL no muestra pantalla de carga (solo menús → carrera).
