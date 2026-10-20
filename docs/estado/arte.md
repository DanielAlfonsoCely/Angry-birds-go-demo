# Estado: Arte (Paso 1)

## Hecho
- **Triángulos por kart (modelo completo visible)**: antes 22.9k–25.8k, ahora 6.5k–7.7k (tuko 7.6k, mora 7.7k, chispa 7.1k, bruno 7.5k, nilo 7.4k, kiko 6.5k). Cómo: RoundedBox con 1 segmento (caja simple si el radio <= 0.04), esferas de personaje al 50% de segmentos, ruedas de 10 lados (~400 tri cada una), toros/cilindros/cápsulas más ligeros, resorte de Nilo 120x6 -> 56x4.
- **Props** (tri por unidad, snow/jungle/volcano): arch 7.1k -> ~4.0k, sign 2.7k -> 0.15k, ruin 1.8k -> 1.0k, snowman 2.1k -> 1.4k, cactus 1.5k -> 0.9k; el resto ya era < 1.2k. Medir: `node tests/art-tris.mjs [--parts]`.
- **Partículas por tema**: `createParticles(scene, theme?)` y `particles.setTheme(theme)`. Si no se pasa `color`, `dust` y `landing` usan: snow = nieve blanco-azulada; jungle = tierra + hojas giratorias; volcano = arena roja + ceniza. Con `color` explícito todo sigue igual.
- **Animación de props, sin API para la pista**: `createProp('flag')` ondea y `createProp('geyser')` lanza un chorro cada ~5 s (fase distinta según posición). Viven en los materiales `cloth` y `jet` (`getMat`), que leen un tiempo compartido actualizado en `onBeforeRender`. La pista NO debe llamar a nada; solo usar `createProp` (con InstancedMesh vía `getPropGeometries` habría que asignar `mesh.onBeforeRender` a mano).
- `tests/art-shots.mjs` ahora acepta `--only="?view=particles&theme=snow"` (antes cortaba en el segundo `=`).

## Verificación
- `npm run build` OK. `node tests/art-shots.mjs` y capturas de galería revisadas (chars, states, props, partículas por tema).
- Smoke selva, pico y canon (con salida y ArrowUp): sin errores. Capturas `tests/screenshots/art-race2-*`: kart legible frente al fondo, escala OK, banderines y arco bien. La carrera queda en la salida (el smoke no ve `player`), no se probó el chorro del géiser en carrera.

## Pendientes / depende de otros módulos
- Gameplay: pasar el tema a `createParticles(scene, track.theme)` (hoy `src/gameplay/index.js` llama sin tema) o llamar a `particles.setTheme`.
- En la salida el kart del jugador queda tapado por la catapulta/cargador de Gameplay (la cámara ve la caja marrón); revisar encuadre.
- Arte: variante extra de árbol (jungle usa palma/ceiba), humo/vapor del géiser como partículas, LOD de karts de IA lejanos si el Paso 2 lo pide.
