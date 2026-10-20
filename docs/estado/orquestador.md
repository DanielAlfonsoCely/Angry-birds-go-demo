# Estado general (20-oct-2026, 17:15)

Pasos 1, 2 y 3 completados y revisados (ver `docs/PLAN-PASOS.md`). **En pausa hasta la próxima sesión.**

## Paso 3 (feedback de la prueba del usuario): hecho
- Derrape sin contra-giro; cámara trasera (C/B o botón táctil).
- La catapulta fija el valor al soltar; plataformas elevadas de 3.5 m con línea punteada de apuntado.
- Mejoras por personaje (con migración del guardado); tienda con selector de personaje.
- IA adaptativa al nivel de mejoras del jugador (`AI_CATCHUP` = 0.8 en `src/gameplay/race.js`).
- Bug: en pico todos caían en los saltos 2 y 3; corregido (0 respawns en las 3 pistas).
- Desaceleración: medida con telemetría; es la caída desde el boost hasta la velocidad base (29 m/s sin mejoras). Si el usuario aún la siente lenta, subir `BASE_TOP_SPEED`.

## Próxima sesión (en orden)
1. **Varias vueltas con "lanzamiento de regreso"** (decidido por el usuario, ver `docs/IDEAS.md`).
2. Que el usuario pruebe el Paso 3 y dé feedback (derrape, catapulta, velocidad).
3. Pendiente técnico: exponer `kart.setHeading(rad)` en físicas para que el apuntado de la catapulta mantenga el rumbo al aterrizar.
4. Más mapas y, después, multijugador por LAN/hotspot (arquitectura en `docs/IDEAS.md`).
5. Paso de QA y cierre, y completar "Decisiones y lecciones" en `docs/PROCESO.md`.
