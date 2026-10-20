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

## Paso 3: derrape y cámara hacia atrás
**Derrape.** La lógica ya mapeaba bien el signo (giro hacia el lado del derrape cierra); el problema era de sensación: sin contra-giro el derrape giraba poco (0.75) y la carga no dependía bien del giro. Ahora:
- Al pulsar derrape con `steer` ≠ 0 (umbral 0.3) queda fijo `driftDir`. Giro por frame = `turn * max(DRIFT_TURN_MIN, DRIFT_TURN_BASE + DRIFT_TURN_STEER * steer * dir)`: mismo lado cierra (hasta 1.17), sin giro mantiene 0.72, lado contrario abre (mín. 0.27) pero nunca cancela.
- El mini-turbo carga siempre: `dt * (DRIFT_CHARGE_BASE 1.1 + DRIFT_CHARGE_STEER 0.25 * steer*dir)` (0.85x contra, 1.35x a favor). Nivel 1 / 2 a 0.7 / 1.5 de carga. Termina solo al soltar Espacio (ahí se aplica el boost).
- Constantes nuevas en `constants.js`: `DRIFT_TURN_MIN`, `DRIFT_CHARGE_BASE`, `DRIFT_CHARGE_STEER`; cambiadas `DRIFT_TURN_BASE` 0.75→0.72, `DRIFT_TURN_STEER` 0.6→0.45.
- Test nuevo `driftSameSide` en `physics-sim.mjs` (21/21 OK): solo giro suave hacia el lado, nivel 2, soltar giro mantiene y carga, giro contrario no cancela. Nota: en la curva de prueba (R=50) mantener el giro la cierra de más y roza la pared interior; los jugadores lo modulan.

**Cámara hacia atrás** (`src/physics/camera.js`), dos formas equivalentes:
- `cam.setLookBack(bool)` (idempotente; llamarlo cada frame con `controls.lookBack` está bien) y getter `cam.lookBack`.
- `cam.follow(kart, dt, { lookBack })` (3.er parámetro opcional).
El cambio de lado es instantáneo (yaw sin interpolar); la altura y el FOV conservan su suavizado.

Pendiente (no mío): en pico, jugador e IA reaparecen en t≈0.75 (también antes de mis cambios, a 0.13): revisar pista/respawn.

## Paso 3b: "el carro desacelera mucho"
`node tests/physics-telemetry.mjs --drops=1` ahora cuenta, para el jugador, caídas de velocidad >20 % en <1 s y su causa (aterrizaje, pared, golpe/trampa, derrape, fin de boost, subida, otro).
Resultado con autopiloto (sin mejoras), por carrera: 8-13 caídas. Causas: aterrizaje 2-3 (p. ej. 76→57 m/s, la caída proyectada al plano del suelo), fin de boost 1-3 (decaimiento exponencial del exceso, 47→30), subida 1-5 (casi siempre exceso de boost + pendiente; la pérdida propia de la subida es ~0.3 m/s²), pared 2-4 (autopiloto choca; −10 %), golpe/trampa 1-3 (diseño), derrape 0-2 (−3 % de vmáx, no es significativo). No hay arrastre excesivo en tramos de 4-6°.
Cambios: `OVERSPEED_RATE` 1.1→0.7 (el exceso tras un boost decae más suave) y `LANDING_KEEP = 0.5` (aterrizaje limpio conserva la mitad de la energía de la caída como avance; el aterrizaje duro sigue perdiendo 15 %).
Efecto medido: caídas 11/10/13 → 11/8/12 (poco; la mayoría son boosts que terminan, que son inevitables) y duración total de las 3 pistas 184.4 s → 184.9 s (±0.3 %). La telemetría entre corridas varía ±5 s por pista, así que las duraciones por pista no son comparables finamente. `physics-sim` 21/21.
Conclusión: la sensación viene sobre todo de caer desde velocidades de boost/salto (60-90 m/s) a la base de 29 m/s, más paredes y trampas; sin mejoras la base es 29 m/s (+ bono en bajada). Si aún se siente lento, la palanca es subir `BASE_TOP_SPEED` o mantener el boost más tiempo, no el arrastre.
