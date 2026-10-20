# Estado: Agente de Pistas (src/track) — pausa

## Hecho (build OK, smoke sin errores en pico/selva/canon)
- Pistas por datos en `src/track/defs/{pico,selva,canon}.js` (2.23–2.33 km, los 6 tipos de tramo).
- `path.js`: línea central integrando rumbo/pendiente (curvatura continua) y tabla de frames cada ~1 m
  (pos, tangent, right, up, halfWidth, tipo, hasGround, ceil, part, curvatura). Sin Three/DOM.
- `ballistics.js`: saltos con g=28. Hueco sin suelo calculado para que 22 m/s cruce (+2 m de margen).
  Aterrizaje curvo tipo colina de salto de esquí: impacto 16–27° a 28–35 m/s y 31° a 40–45 m/s; sobran ~40 m tras la caída a 45 m/s.
- `query.js`: sample(t, out?) interpolando la tabla y closestT local (±60 m) con respaldo global.
- `ground.js`: getGroundAt(pos, out?) con rejilla espacial XZ de triángulos (sin Raycaster).
- `road.js`: suelo por partes con textura procedural, bordillos, rampas con chevrones, faldones,
  puentes con barandas (postes instanciados), líneas de salida/meta. `lighting.js`: cuevas oscuras con luz de faroles horneada.
- `pickups.js`: ~150 monedas (filas + arcos sobre saltos), 4 filas de cajas "?", boost pads animados (InstancedMesh).
- `terrain.js` (recién escrito; la pista carga pero AÚN NO REVISÉ CAPTURAS): laderas por perfiles, cañón bajo
  puentes/huecos, túneles con techo y portales, terreno lejano con montañas, agua/lava animada, cascadas (selva) y ríos de lava (cañón).
- `tests/track-check.mjs`: largo, tipos, saltos (alcance e impacto por velocidad), autocruce y radio mínimo.

## En qué quedé
- Acababa de arreglar un NaN en el techo de las cuevas (terrain.js). Smoke OK, pero no revisé las capturas visualmente.

## Pendiente (próximos pasos)
1. `decor.js` todavía es un stub (solo arcos de salida/meta): falta colocar props con createProp(kind, theme, {random})
   instanciados por trozos, con PRNG: árboles/rocas por bandas de distancia, faroles en cuevas (posiciones en
   `light.lanterns`), banderines en la salida, carteles antes de curvas cerradas, puertas de slalom en las orillas,
   géiseres (cañón), cristales y muñecos de nieve (pico).
2. Script `tests/track-views.mjs`: reemplazar `__game.mode.update` por `track.update` y mover `__game.camera` a la salida, la cueva,
   el puente, el salto y la meta de cada pista; revisar las capturas y corregir terrain.js (cascadas, portales, compresión en curvas).
3. Las pendientes medias quedaron altas (pico 17°, canon 19°) por los aterrizajes largos: bajar `slope` de los tramos normales.
4. Propuesta de contrato: documentar los parámetros opcionales `sample(t, out)` y `getGroundAt(pos, out)`.
