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

## Paso 1: ✅ completado (commit a6c70f0)

## Paso 2: ✅ completado — en pausa esperando la prueba del usuario

### Paso 2: Sensación de juego y pulido
**Objetivo común**: que se sienta rápido, fluido, justo y divertido.
- Pistas (Sonnet): pendientes medias de 8–14° sin romper saltos, puertas de slalom y portal del cañón.
- Físicas (Sonnet): ajuste fino con telemetría sobre las pistas reales (derrape, aire, aterrizajes, cámara, que el kart nunca se atasque).
- Gameplay (Sonnet): balance (el jugador sin mejoras queda a mitad de tabla), monedas y catapulta más compacta.
- UI (Sonnet): HUD verificado con el estado real de gameplay, guía de controles en la primera carrera y pulido.
- Arte y Audio: sin tareas (cumplieron); se retoman si la revisión del usuario lo pide.
- **Al terminar el Paso 2 todo se pausa hasta que el usuario lo pruebe.**

## Paso 3: Correcciones de la prueba del usuario (20-oct, hasta 17:55)
- Físicas: derrape sin contra-giro y cámara trasera.
- Gameplay: la catapulta fija el valor al soltar, mejoras por personaje, IA adaptativa y mirar atrás.
- UI: tienda por personaje, botón de mirar atrás y medidor fijado.
- Orquestador: input `lookBack`, mejoras por personaje en el guardado (con migración), diseño actualizado y `docs/IDEAS.md`.

## Paso 4: QA y cierre
**Objetivo común**: sin bugs conocidos y documentación final.
- QA (Haiku/Sonnet): jugar las 3 pistas con los 6 personajes de forma automática y reportar bugs.
- Correcciones puntuales por módulo (Sonnet).
- Orquestador: `docs/PROCESO.md` final.
