# Estado del Agente de UI (Paso 1 completo)

## Hecho
- Flujo conectado en `src/ui/index.js` (router): título → personaje → pista → carrera → resultados; tienda y ajustes.
  Esc en menús = atrás. Fundido (`.cr-fader`) al entrar/salir de la carrera.
- Atajo `?track=&char=[&autopilot=1]` entra directo a la carrera (`autopilot` se pasa a `createRace`); `mode.race = race`.
- `menuStage.js`: una escena 3D cacheada (entorno snow, props, 3 karts en el título y garaje con plataforma
  giratoria + `createCharacterPreview`); cámara interpolada y `setViewOffset` para descentrar el preview.
- `portraits.js`: retratos a WebGLRenderTarget → dataURL (puntos de selección, HUD, podio, tabla).
- `characters.js` (compra con `save.spend` + `unlock`), `tracks.js` (candados, mejor tiempo/puesto), `shop.js`, `settings.js`
  (volúmenes en vivo con `audio.setVolumes`, controles, borrar progreso con confirmación).
- `raceMode.js`: la UI es dueña de la pausa (Esc/P/botón/pestaña oculta → `game.paused`, `race.pause?.(bool)`, evento PAUSE);
  Reanudar/Reiniciar/Salir. Al salir: `audio.setEngine(-1)` y vuelve a menús (música menu).
- `hud.js` + `touch.js`: posición, tiempo, progreso con retratos, monedas, velocímetro, objeto, poder, cuenta, medidor
  de catapulta, banners/popups y controles táctiles (mitades para girar, deslizar arriba = truco, Derrapar/objeto/poder).
  Lee `race.getPlayerState?.()` y cae a EVENTS/`race.player`/`race.karts` si falta algo.
- `results.js`: `applyRaceEnd` guarda al instante en RACE_END (monedas, mejor tiempo/puesto, desbloqueo top 3 por TRACK_ORDER);
  pantalla con podio, tabla, recompensa animada, insignias y Reintentar/Siguiente/Tienda/Menú.
- `tests/ui-flow.mjs` (`--only=desktop|mobile`): clics/taps reales, 1280×720 y 390×844; capturas `tests/screenshots/ui-*`.

## Supuestos / coordinar
- `reward` de RACE_END = premio por puesto + monedas recogidas; si llega solo el premio por puesto se suman las monedas;
  si es 0/falta se calcula con `PLACE_REWARDS`. Si `results` trae solo al jugador, el resto se rellena con `race.karts` por progreso.
- Se asume `getPlayerState().launchMeter` número o `{value,holding}` y `phase` 'countdown'|'catapult' mientras se ve la barra.
- Gameplay NO debe reaccionar a `controls.pause` (si no, alterna doble).
- Pausa: `race.update` no se llama mientras `game.paused`.

## Notas de prueba
- El render por software es muy lento: los tests usan timeouts largos y el servidor sin HMR (otros agentes editan `src/` en paralelo
  y un HMR recargaba la página). Un fallo de import en otra carpeta rompe toda la UI (pasó con `track/decor.js`).

## Roto / pendiente
- Nada conocido. Falta ver el HUD con `getPlayerState` real (objetos, poder, monedas) cuando gameplay lo entregue.
