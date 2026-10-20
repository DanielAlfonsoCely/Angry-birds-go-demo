# Estado general (pausa del 19-oct-2026)

| Agente | Estado | Detalle |
|---|---|---|
| Físicas | ✅ Terminado | `src/physics`, 17/17 pruebas (`node tests/physics-sim.mjs`) |
| Audio | ✅ Terminado | `src/audio`, prueba a oído en `/tests/audio-test.html` |
| Arte | ⏸️ Parte 1 lista | Ver su reporte abajo |
| Pistas | ⏸️ Pausado | Ver `docs/estado/pistas.md` |
| Gameplay | ⏸️ Pausado (Ola 2) | Ver `docs/estado/gameplay.md` |
| UI | ⏸️ Pausado (Ola 2) | Ver `docs/estado/ui.md` |

## Arte: pendientes
Revisar el arte dentro de la carrera cuando la pista cargue, pulir partículas, agregar una variante más de árbol, animar banderín y géiser, y bajar triángulos (~25k por kart).

## Pistas: correcciones pedidas por el orquestador
Los aterrizajes a 32 m/s llegaban con 37–47° (la física penaliza >35°): hay que dejarlos por debajo de ~30°.

## Para retomar (orquestador)
1. Leer los `docs/estado/*.md` y verificar que `npm run build` y `npm run smoke` pasen.
2. Retomar Pistas → Gameplay y UI → reanudar Arte (arte en carrera).
3. Ola 3: integración, ajuste fino de físicas sobre la pista real (pedirle a Físicas) y un agente QA.
4. Integración pendiente: documentar en `contracts.js` `createCharacterPreview`, `opts` de `createProp`, `Environment.dispose()` y el tercer argumento `drifting` de `audio.setEngine`.
5. Completar "Decisiones y lecciones" en `docs/PROCESO.md`.
