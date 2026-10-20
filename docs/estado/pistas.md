# Estado: Agente de Pistas (src/track) — Pasos 1 y 2 hechos

## Hecho (build OK, track-check OK, smoke sin errores en pico/selva/canon)
- Pistas por datos en `src/track/defs/{pico,selva,canon}.js` (2.23–2.33 km, los 6 tipos de tramo).
- `path.js` (frames cada ~1 m), `ballistics.js` (saltos g=28, aterrizajes curvos), `query.js` (sample/closestT),
  `ground.js` (getGroundAt con rejilla XZ), `road.js`, `lighting.js` (luz de cueva horneada), `pickups.js`.
- `terrain.js` revisado con capturas: laderas, cañón con agua/lava, portales, cuevas, ríos de lava. Cambios del paso:
  portales/laderas del cañón con algo de emisivo (estaban casi negros) y cascadas de la selva rehechas como cinta que
  sigue el perfil de la pared del cañón (antes quedaban enterradas); `ctx.waterfalls` evita poner árboles encima.
- `decor.js` completo (PRNG con semilla fija, todo determinista):
  - Árboles/rocas/arbustos/flores/hongos/cactus/cristales en InstancedMesh por trozos de 150 m (culling por trozo),
    en 3 bandas (cerca/medio/lejos) según el perfil lateral del terreno; sin solaparse ni caer sobre otro tramo de pista.
  - Muñecos de nieve y cristales grandes (pico), ruinas (selva), géiseres y cristales rojos (cañón), faroles de cueva
    alineados con la luz horneada (máx. 4 PointLight por pista), banderines en salida/meta, carteles de curva
    antes de curvas de ≥30° (en el lado exterior, `scale.x=-1` si gira a la izquierda).
- Culling por distancia (`createDistanceCuller` en `index.js`): oculta mallas más allá de la niebla de cada tema
  (580/460/440 m). Bajó los draw calls de ~670 a ~200.
- `tests/track-views.mjs`: congela la carrera, mueve `__game.camera` a 16 vistas por pista (salida, cueva boca/dentro/salida,
  puente, rampa, salto, aterrizaje, curva, slalom, cascada, meta) y guarda `tests/screenshots/view-<pista>-<vista>.png`;
  imprime draw calls y triángulos. Opciones: `--track=pico,selva`, `--only=salida,cueva-boca`, `--debug`.
  Es lento con SwiftShader (~40 s por vista); no correr varias instancias a la vez.

## Paso 2 (hecho)
- Pendientes (solo geometría; Físicas es dueño de las pendientes): media antes -> después: pico 17.4° -> 13.6°,
  selva 12.7° (sin cambio), canon 19.3° -> 14.0°. El aterrizaje de cada salto cae ~120 m a 31-45°, así que se achicaron
  los huecos (pico 24/30/36, canon 26/32/38 m; antes 30/42/55 y 38/50/60), se bajó el `slope` de los tramos normales a
  4-6° y se alargaron los tramos. Largos: pico 2460 m, selva 2232 m, canon 2422 m. `track-check` ahora admite hasta 2.5 km.
  Los saltos siguen OK (impacto <30° a 28-35 m/s, cruzables a 22 m/s). `ballistics.js` no cambió.
- Puertas de slalom (`decor.js`): postes con bandera cada 16 frames a hw+2 m, 2 InstancedMesh por pista, colores por tema.
- Portal del cañón (`terrain.js`, `textures.js: lavaRockTextures`): roca roja con vetas de lava emisivas, borde superior
  dentado, peñascos laterales y estalactitas (una malla fusionada por portal).
- Revisadas con track-views: cueva-salida, slalom, meta, curva (selva y canon), aterrizaje y meta (canon): sin problemas.

## Presupuesto medido (peor vista de las revisadas, 1280x720)
- pico 140 calls/203k tris | selva 182/436k | canon 185/265k (antes ~200-216 calls).

## Pendiente / ideas
1. Con pendientes de 4-6° el kart tarda más en coger velocidad en los tramos normales: Físicas/Gameplay deben validar el ritmo (60-90 s).
2. Banderines y géiseres son objetos sueltos (animan con onBeforeRender del arte); son pocos.
3. Decor depende de `ctx.profiles` y `ctx.waterfalls` creados por terrain.js (orden en `index.js`: terrain antes que decor).

## Fix respawn en pico (t≈0.13 / 0.46 / 0.75)
- Causa: los saltos de pico estaban diseñados para cruzar desde vMin=22 m/s, pero la rampa sube y el kart despega a 11-20 m/s
  (fin de boost que decae hacia `top` cuesta arriba, choques de pared/derrape en el pad, trampas). Cae en el hueco (-25 m) y reaparece.
  Los tramos eran los saltos 2 y 3 (t≈0.415-0.53 y 0.70-0.83); la geometría y `getGroundAt` estaban bien.
- Corrección: `designJump` acepta `vMin` por salto (`seg.vMin` en la definición; `path.js` lo pasa). Pico usa `vMin: 14` y huecos 14/18/22 m
  (antes 24/30/36 a vMin 22). Desniveles 14/22/34 m. Se acortaron 3 tramos `open` (150->130, 120->100, 120->100) para quedar en 2484 m.
  Selva y canon no cambian (0 respawns). `track-check` muestra el vMin real de cada salto.
- Verificado: `physics-telemetry` 3 corridas, 3 pistas, 0 respawns (jugador e IA); `track-check` y `npm run build` OK.
