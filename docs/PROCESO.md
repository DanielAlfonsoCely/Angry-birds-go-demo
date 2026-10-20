# Cómo se construyó Cumbre Rush: orquestación de agentes de IA

## Idea general
Un agente **orquestador** (Claude Code) planifica el proyecto, define la arquitectura y los contratos entre módulos y reparte el trabajo entre **subagentes especializados** que trabajan en paralelo. Cuando un subagente termina, entrega un reporte. El orquestador revisa su código, lo prueba, pide correcciones si hace falta e integra el resultado con un commit.

```
                 ┌──────────────── Orquestador ────────────────┐
                 │ diseño · contratos · revisión · integración │
                 └──────┬──────────┬──────────┬──────────┬─────┘
          Ola 1         │          │          │          │
                    Físicas     Pistas      Arte       Audio
          Ola 2                Gameplay        UI/Flujo
          Ola 3                QA (pruebas automáticas) + ajustes
```

## Fase 0: lo que hizo el orquestador antes de delegar
1. **Documento de diseño** (`docs/DISENO.md`): la fuente única de verdad, con números concretos (velocidades, gravedad, anchos de pista, duraciones de boosts, costos). Los agentes no tienen que adivinar.
2. **Contratos** (`src/core/contracts.js`): interfaces JSDoc entre módulos (`Track`, `Kart`, `KartModel`, `Controls`, eventos, sonidos y tipos de props). Así, por ejemplo, el agente de físicas sabe qué le va a entregar el de pistas sin esperarlo.
3. **Stubs funcionales**: cada módulo arrancó con una versión mínima que ya funciona. El juego corre de punta a punta desde el día 1, y cada agente reemplaza su stub sin romper a los demás.
4. **Propiedad de carpetas**: cada agente solo edita su carpeta (`src/physics`, `src/track`…). Esto evita conflictos al trabajar en paralelo. El núcleo (`src/core`) es del orquestador.
5. **Verificación automática** (`tests/smoke.mjs`): abre el juego en un navegador headless (Playwright), simula teclas, toma capturas y falla si hay errores. Los agentes la usan para verificarse a sí mismos, y el orquestador para revisarlos.
6. **Reglas para agentes** (`CLAUDE.md`): las convenciones que todos leen al empezar.

## Olas de trabajo
Las tareas se agruparon según sus dependencias:
- **Ola 1 (paralelo)**: Físicas, Pistas, Arte y Audio. Solo dependen de los contratos.
- **Ola 2 (paralelo)**: Gameplay (catapulta, poderes, objetos, IA rival) y UI (menús, HUD, tienda). Dependen de que la Ola 1 exista de verdad.
- **Ola 3**: integración, ajuste fino de la "sensación" y un agente de QA.

## Ciclo de revisión del orquestador
Para cada entrega:
1. Leer el reporte del agente (qué hizo, cómo lo verificó, qué propone).
2. Revisar el código contra el contrato.
3. Ejecutar `npm run build` y las pruebas de humo, y mirar las capturas.
4. Si algo falla, devolver la tarea al mismo agente con feedback concreto (conserva su contexto) o corregir directamente si es pequeño.
5. Hacer un commit por entrega aprobada (el historial de git documenta la evolución).

## Decisiones y lecciones
_(se completa al final)_
