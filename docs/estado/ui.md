# Estado del Agente de UI/Flujo (pausa)

## Hecho
- `src/ui/styles.js`: hoja de estilos completa (fuente Baloo 2 + fallback, botones arcade, panel, logo animado,
  selección de personaje y pista, tienda, ajustes, diálogo, HUD, cuenta regresiva, medidor de catapulta,
  popups, controles táctiles, pausa, resultados, animaciones y media queries para móvil). Exporta `injectStyles()`.
- `src/ui/dom.js`: `h()`, `button()` con sonido (`uiClick`/`uiBack`), `formatTime`, `ordinal`, `countUp`,
  `replayAnim`, `hexCss`, `isTouchDevice`.
- `src/ui/icons.js`: iconos SVG originales (moneda, candado, engrane, pausa, flechas, trofeo, mejoras...).
- `src/ui/meta.js`: metadatos de UI (nombres y colores de pistas, `nextTrack`, `characterInfo`, `itemInfo`, `UPGRADE_INFO`).

## Dónde quedé
- Esos 4 módulos **aún no están conectados**: `src/ui/index.js` sigue siendo el stub del orquestador
  (carrera directa + HUD mínimo). El build pasa y la ruta `?track=&char=` funciona igual que antes.

## Falta (tarea original)
1. `menuStage.js`: modo 3D de menús en una sola escena: entorno snow + suelo + props y 3 karts girando (título),
   y un "garaje" en z≈+200 con plataforma giratoria y `createCharacterPreview`; la cámara interpola entre vistas
   y el encuadre se ajusta según el aspecto. Guardar el modo en caché (sin `dispose`) para reutilizarlo.
2. `portraits.js`: retratos de personaje renderizados a un WebGLRenderTarget, convertidos a sRGB en JS → dataURL.
3. Pantallas: `title`, `characterSelect` (carrusel, compra con `save.spend` + `unlock('unlockedCharacters')`),
   `trackSelect` (candado según `unlockedTracks`), `shop` (`UPGRADE_COSTS`, `setUpgrade`, `purchase`/`error`),
   `settings` (`audio.setVolumes` + `save.data.settings` + `persist`; reset con confirmación).
4. `raceMode.js` + `hud.js` + `touch.js`: `createRace`, `mode.race = race`, pausa leyendo `game.input.edges.pause`
   (llamar `race.pause?.(bool)`, emitir PAUSE, no actualizar la carrera mientras está en pausa), HUD con datos de
   `race.getPlayerState?.()` y fallbacks a EVENTS/`player`, y `audio.setEngine(-1)` + `playMusic('menu')` al salir.
5. `results.js`: aplicar el save en RACE_END (monedas, mejor tiempo/posición, desbloqueo top 3 por `TRACK_ORDER`).
   Asumido: `reward` = premio por puesto + monedas recogidas; si falta, se calcula con `PLACE_REWARDS`.
6. Nuevo `index.js` (router + atajo de URL) y `tests/ui-flow.mjs` (Playwright, 1280×720 y 390×844 con hasTouch).

## Roto
- Nada; el build pasa (`npm run build`).

## Riesgo a coordinar
- Si gameplay también reacciona a `controls.pause`, la pausa se alternaría dos veces. Propuesta: la UI es dueña
  de la pausa y gameplay solo expone `race.pause(bool)`.
