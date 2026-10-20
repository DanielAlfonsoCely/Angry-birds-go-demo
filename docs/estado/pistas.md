# Estado: Agente de Pistas (src/track) — Paso 1 hecho

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

## Presupuesto medido (peor vista, 1280x720)
- pico: 200 calls, 229k tris | selva: 211 calls, 573k tris | canon: 216 calls, 269k tris (meta: <400 y <1.5 M).

## Pendiente / ideas
1. Las pendientes medias siguen altas (pico 17°, canon 19°) por los aterrizajes largos: bajar `slope` de tramos normales (Paso 2, con Físicas).
2. Portal de cueva del cañón sigue oscuro y plano; podría llevar rocas/estalactitas. Puertas de slalom en las orillas (no hechas).
3. Los banderines y géiseres son objetos sueltos (animan con onBeforeRender del arte); son pocos.
4. Propuesta de contrato: documentar los parámetros opcionales `sample(t, out)` y `getGroundAt(pos, out)`.
5. Decor depende de `ctx.profiles` y `ctx.waterfalls` creados por terrain.js (orden en `index.js`: terrain antes que decor).
