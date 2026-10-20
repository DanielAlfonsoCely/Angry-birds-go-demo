# Plan por pasos generales

Cada paso tiene un **objetivo común**. Los agentes de un paso trabajan en paralelo, cada uno con su objetivo propio. Al terminar entregan su reporte y se detienen. Cuando **todos** terminan, el orquestador revisa el resultado en conjunto (build, pruebas, capturas y juego integrado), hace commit y push, y recién entonces arranca el paso siguiente.

Modelos: el orquestador usa Opus (planear, revisar, integrar); los agentes usan Sonnet; las tareas simples o de QA usan Haiku.

Ya hecho (Ola 1 / Fase 0): Físicas ✅, Audio ✅, Arte parte 1, Pistas parte 1, base de Gameplay y UI (ver `docs/estado/`).

## Paso 1: Carrera completa jugable
**Objetivo común**: desde el menú se elige personaje y pista, se corre una carrera completa con catapulta, objetos, poderes e IA, y se ven los resultados y la tienda.

| Agente | Modelo | Objetivo del paso |
|---|---|---|
| Gameplay | Sonnet | La lógica de carrera completa (catapulta, monedas/cajas, objetos, poderes, IA, posiciones, meta) y el test de autopiloto con carrera completa |
| UI | Sonnet | Todas las pantallas, el HUD, los controles táctiles, la pausa (la UI es la dueña), resultados con guardado, tienda y ajustes, y el test de flujo |
| Pistas | Sonnet | Decoración con `createProp`, revisión visual con recorrido de cámara en las 3 pistas |
| Arte | Sonnet | El arte dentro de la carrera real: rendimiento (menos triángulos), partículas por tema, animación de banderín y géiser |

## Paso 2: Sensación de juego y pulido
**Objetivo común**: que se sienta rápido, fluido y divertido a 60 FPS.
- Físicas (Sonnet): ajuste fino sobre las pistas reales (pendientes, saltos, derrape).
- Gameplay (Sonnet): balance de la IA y de los objetos, y ritmo de la carrera.
- Arte + Pistas (Sonnet): pulido visual y presupuesto de rendimiento.
- Audio (Haiku): mezcla en juego y sonidos de UI conectados.

## Paso 3: QA y cierre
**Objetivo común**: sin bugs conocidos y documentación final.
- QA (Haiku/Sonnet): jugar las 3 pistas con los 6 personajes de forma automática y reportar bugs.
- Correcciones puntuales por módulo (Sonnet).
- Orquestador: `docs/PROCESO.md` final.
