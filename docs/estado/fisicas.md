# Estado: Físicas (Paso 2)

Herramientas nuevas: `node tests/physics-telemetry.mjs` (3 pistas, jugador + 5 IA, sin render, `--scale`, `--tracks`, `--json`),
`node tests/physics-camera.mjs --track=X` (capturas de salto, aterrizaje, cueva y curva en `tests/screenshots/cam-*`).
Métricas por kart: vel. media/máx., % aire, aterrizajes (duros), golpes de pared/km, respawns, atasco, derrape, boost%.
Además mide la cámara del jugador: frames bajo el suelo o tapada por el terreno (0 en las 3 pistas).

## Telemetría del jugador (autopilot, tuko)
| Pista | Antes: dur / vprom / vmáx | Después: dur / vprom / vmáx | Aire % | Aterr. duros | Pared/km | Respawns | Atasco |
|---|---|---|---|---|---|---|---|
| pico  | 62.6 s / 36.4 / 80 | 69.6 s / 33.0 / 79 | 13.5 | 0 | 0.4 | 0 | 0 s |
| selva | 59.7 s / 35.3 / 79 | 63.7 s / 33.3 / 75 | 9.3  | 0 | 0.5 | 0 | 0 s |
| canon | 57.9 s / 39.2 / 86 | 59.6 s / 37.9 / 86 | 16.0 | 0 | 1.3 | 0 | 0 s |
"Antes" = constantes viejas sobre pendientes intermedias de Pistas; "después" = geometría final de Pistas.
IA media (después): vprom 33.1 / 35.3 / 38.9, duración 69.6 / 59.2 / 57.3 s, 0 atascos, 0 respawns, 0 duros salvo algún caso aislado.

## Constantes cambiadas (`src/physics/constants.js`)
- `BASE_TOP_SPEED` 32 → 29 y `BASE_ACCEL` 13.3 → 12.1 (mantiene 0→vmáx en ~3.5 s). Con 32 las carreras duraban 52–60 s (corto) y la vprom pasaba de 36.
- `SLOPE_FLAT_MAX` 0.21 → 0.07 (bono de bajada desde ~4°, antes desde 12°): los tramos de 4–6° dan +3–5 %, los de 9–14° (escenario probado) +10–20 %.
- `SLOPE_TOP_MAX_BONUS` 0.28 → 0.22.
- `tests/physics-sim.mjs`: el test de aceleración ahora usa la vmáx base del kart (29) en vez de 32 fijo. Sigue 17/17.

## Cámara
Sin cambios en el código: salto, aterrizaje, cueva y curva se ven bien (kart visible, FOV 70–85). Medición geométrica: 0 frames bajo el suelo o tapados.
Pendiente: una captura (`cam-canon-cueva90.png`, t≈44 s) sale casi cubierta por una neblina rosada con el kart oculto; ocurre justo tras un `sismo` de la IA,
así que parece un efecto de Gameplay/Arte y no la cámara (no verificado con raycast contra la escena).

## Pendientes / notas para otros
- Pistas: canon es la más rápida (boost ~31 % del tiempo por almohadillas y turbos); si se quiere ≥60 s para todos, quitar un pad o alargar un tramo.
- Pico: IA lentas (~70 s) vs canon ~57 s; equilibrar con Gameplay.
- El autopiloto casi no derrapa (1–2 s por carrera): el derrape se validó solo con `physics-sim` (mini-turbo nivel 2 a 1.5 s, vel. mantenida en curva). Gameplay podría hacer que la IA derrape en curvas cerradas.
- Aterrizajes duros: ~0 con el autopiloto; las velocidades de 80+ m/s son de caídas de saltos, no de la base.
