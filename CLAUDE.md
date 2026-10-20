# Cumbre Rush — reglas para agentes

Juego original de karts cuesta abajo en Three.js + Vite. Diseño completo en `docs/DISENO.md`; contratos entre módulos en `src/core/contracts.js`.

## Reglas
- **Propiedad de carpetas**: cada agente edita solo su carpeta (`src/physics`, `src/track`, `src/art`, `src/audio`, `src/gameplay`, `src/ui`). `src/core/` es del orquestador: si necesitas un cambio ahí o en un contrato, descríbelo en tu reporte final en vez de editarlo.
- **Contratos**: respeta exactamente las firmas de `src/core/contracts.js`. Puedes agregar propiedades extra, pero no quitar ni renombrar.
- **Todo original**: no uses nombres, personajes, sonidos ni mapas de juegos existentes. No hay assets externos: modelos procedurales con Three.js y audio sintetizado con WebAudio.
- **Sin dependencias nuevas** de npm salvo que el orquestador lo apruebe.
- **No hagas commits**: el orquestador revisa e integra.
- Código: ES modules, JavaScript plano, comentarios en español, breves y solo donde aporten. Divide en varios archivos dentro de tu carpeta; `index.js` reexporta la API pública.
- Rendimiento: el objetivo son 60 FPS en una laptop normal. Reutiliza geometrías y materiales, usa InstancedMesh para props repetidos y no crees objetos en el loop caliente.

## Verificar
- `npm run build` debe pasar.
- `npm run smoke -- --track=pico --char=tuko --seconds=12` levanta el juego en Chromium headless, guarda capturas en `tests/screenshots/` (revísalas con Read) y falla si hay errores de consola. Opciones: `--keys=ArrowLeft:5-6,Space:7-8` mantiene teclas en ese rango de segundos, `--out=nombre` y `--url=/?...`.
- `?track=…&char=…` en la URL salta los menús y entra directo a la carrera.
- `window.__game` expone el juego (`__game.mode.race.player`, etc.) para depurar.
