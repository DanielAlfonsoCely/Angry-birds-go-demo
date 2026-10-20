# Cumbre Rush — Documento de diseño

Juego **original** de karts cuesta abajo en 3D para navegador (Three.js).
Carreras punto a punto (de la cima a la meta, sin vueltas): rápidas, arcade, con saltos, cuevas, pasos estrechos, potenciadores y poderes.

> Regla para todos los agentes: todo es original. No uses nombres, personajes, sonidos, mapas ni assets de ningún juego existente. Todo el arte es procedural (geometrías de Three.js) y todo el audio es sintetizado (WebAudio). No hay archivos externos.

## 1. Sensación de juego (lo más importante)
- **Rápido y "pegajoso"**: el kart acelera solo cuesta abajo y el jugador **solo dirige**. La velocidad la ganas con buenas líneas, derrapes, boosts y aterrizajes limpios.
- **Gravedad arcade fuerte**: los saltos se sienten con peso, y los aterrizajes tienen impacto (sacudida de cámara, polvo, sonido).
- **Cámara de persecución** baja y detrás del kart. El FOV sube con la velocidad (70 → 85) y con boost (hasta 92).
- Chocar con una pared no detiene el kart: lo rebota suavemente hacia adentro y quita algo de velocidad.

### Valores objetivo (metros, segundos)
| Parámetro | Valor |
|---|---|
| Velocidad máxima base (plano/pendiente media) | 32 m/s (~115 km/h) |
| Velocidad máxima con boost | ×1.4 |
| Gravedad | 28 m/s² |
| Aceleración base | 0 → 32 m/s en ~3.5 s |
| Pendiente media de pista | 6°–14° hacia abajo |
| Ancho de pista normal / estrecha / cueva | 16 m / 7 m / 11 m |
| Duración de una carrera | 60–90 s (pista de 1.8–2.4 km) |
| Corredores por carrera | 6 (jugador + 5 IA) |

### Mecánicas de conducción
- **Giro**: `steer` de -1 a 1. Es más cerrado a baja velocidad y más estable a alta.
- **Derrape** (mantener Espacio mientras se gira): el kart desliza en ángulo y carga un mini-turbo. Con 0.7 s de carga sale **azul** (boost de 0.6 s) y con 1.5 s sale **naranja** (boost de 1.1 s). Se suelta para activarlo.
- **Aire**: si no hay suelo debajo, el kart está en el aire. Ahí el giro rota el kart lentamente y la gravedad actúa.
- **Truco aéreo** (↑ / W en el aire, con al menos 0.35 s de aire restante): el kart da una vuelta en barrel roll. Si aterriza completando el truco, recibe un boost de 0.7 s. Si aterriza a mitad del truco, pierde 25 % de velocidad.
- **Aterrizaje**: si cae alineado con el suelo, conserva la velocidad. Si cae muy inclinado (más de 35°), pierde un 15 %.
- **Boost pad** (flechas brillantes en el suelo): boost de 1.0 s.
- **Caída al vacío**: si cae más de 25 m por debajo de la pista, aparece en el último punto válido después de 1.2 s de penalización.

## 2. Inicio: catapulta de lanzamiento
Durante la cuenta regresiva (3-2-1), los karts están amarrados a una catapulta de resorte.
- El jugador **mantiene Espacio** para tensar. Un medidor sube y baja continuamente (ciclo de 1.2 s).
- Al llegar a "¡YA!", el kart sale con la potencia del medidor en el momento de soltar. Puede soltar en cualquier momento hasta 0.6 s después del "¡YA!".
  - Zona verde (0.80–0.95): **"¡Perfecto!"**, boost de 1.6 s.
  - 0.50–0.80: **"¡Bien!"**, boost de 0.8 s.
  - Debajo de 0.5 o sin tensar: salida normal.
  - Soltar antes del "¡YA!": salida normal.
- La IA logra resultados variados al azar.

## 3. Personajes (originales)
6 animales con kart propio. Cada uno tiene un **poder de personaje** que se carga con el tiempo (100 % en 14 s) y con las monedas (+4 % por moneda). Se usa con Q / Z.

| id | Nombre | Animal / colores | Poder | Efecto |
|---|---|---|---|---|
| `tuko` | Tuko | Geco verde lima, kart amarillo | **Lengüetazo Turbo** | Dash fuerte de 1.2 s (×1.6 de velocidad máxima) |
| `mora` | Mora | Topo morado, kart turquesa | **Sismo** | Onda expansiva: los rivales a menos de 18 m giran sin control 1.2 s |
| `chispa` | Chispa | Zorro naranja, kart rojo | **Burbuja** | Escudo de 5 s: inmune a objetos y choques, con boost suave ×1.15 |
| `bruno` | Bruno | Oso café, kart verde bosque | **Embestida** | Durante 4 s empuja a los rivales al chocar y no pierde velocidad contra paredes |
| `nilo` | Nilo | Rana azul, kart naranja | **Superbrinco** | Salto vertical de 9 m con impulso hacia adelante (permite volar sobre huecos) |
| `kiko` | Kiko | Mapache gris, kart morado | **Bomba de humo** | Deja una nube de 10 m detrás durante 4 s; los rivales que la cruzan van ×0.6 por 1.5 s |

Al inicio están desbloqueados Tuko, Mora y Chispa. Bruno, Nilo y Kiko cuestan 600, 900 y 1200 monedas.

## 4. Objetos de las cajas (`?`)
Las cajas flotantes giran en la pista y reaparecen 3 s después de recogerlas. El jugador guarda **1 objeto** y lo usa con E / X.

| id | Nombre | Efecto |
|---|---|---|
| `cohete` | Cohete | Boost de 2 s |
| `bolaNieve` | Bola de nieve | Proyectil que sigue la pista y golpea al primer rival de adelante (lo hace girar 1.0 s) |
| `miel` | Charco de miel | Trampa que se suelta detrás; el kart que la pisa va ×0.5 por 1.2 s |
| `iman` | Imán | Atrae las monedas a 12 m durante 6 s |

Reparto de objetos según la posición: los últimos tienen más probabilidad de recibir `cohete`.

## 5. Pistas (originales)
Las pistas se generan a partir de una **spline central** y una **lista de tramos**. Cada tramo tiene un tipo:

| Tipo | Descripción |
|---|---|
| `open` | Pista ancha normal, con decoración a los lados |
| `narrow` | Paso estrecho (puente, cornisa). Bordes bajos o vacío a los lados |
| `cave` | Túnel o cueva con techo y paredes, iluminación tenue y luces de colores |
| `jump` | Rampa, después un **hueco** sin suelo (tramo aéreo de 25–60 m) y aterrizaje en bajada |
| `boost` | Tramo con varios boost pads |
| `slalom` | Curvas encadenadas con obstáculos decorativos en el medio |

Cada pista tiene filas de **monedas**, 3–4 filas de **cajas de objeto** y varios **boost pads**.

| id | Nombre | Tema | Carácter |
|---|---|---|---|
| `pico` | Pico Escarcha | Montaña nevada: pinos, rocas, cristales de hielo, nieve cayendo | Muchos saltos y aire, puentes de hielo estrechos |
| `selva` | Selva Eco | Selva: árboles gigantes, lianas, flores, cascadas, ruinas | Cuevas largas, puentes de madera estrechos, slalom |
| `canon` | Cañón Brasa | Cañón volcánico: roca roja, lava, géiseres, cristales | Grandes tramos aéreos, túneles de lava, pendientes fuertes |

Desbloqueo: Pico Escarcha está abierta. Selva Eco se abre al quedar top 3 en Pico, y Cañón Brasa al quedar top 3 en Selva.

## 6. Progresión y economía
- Recompensa por posición: 1º 150, 2º 100, 3º 70, 4º 40, 5º y 6º 20 monedas, más las monedas recogidas en la carrera.
- **Mejoras del kart** (compartidas por todos los personajes), 5 niveles cada una. Costos: 100, 200, 400, 700 y 1100.
  - `engine` (Motor): +4 % de velocidad máxima por nivel.
  - `accel` (Aceleración): +7 % por nivel.
  - `handling` (Manejo): +6 % de giro y agarre en derrape por nivel.
  - `boost` (Turbo): +6 % de potencia y duración de los boosts por nivel.
- La IA de los rivales escala con la pista: Pico usa nivel de mejoras 0–1, Selva 1–3 y Cañón 3–5.
- Guardado en `localStorage`.

## 7. Controles
| Acción | Teclado | Táctil |
|---|---|---|
| Girar | ← → / A D | Mitad izquierda / derecha de la pantalla |
| Derrapar / tensar catapulta | Espacio / Shift | Botón "Derrapar" |
| Truco aéreo | ↑ / W | Deslizar hacia arriba |
| Usar objeto | E / X | Botón de objeto |
| Poder de personaje | Q / Z | Botón de poder |
| Pausa | Esc / P | Botón de pausa |

## 8. Pantallas
Título → Selección de personaje → Selección de pista → Carrera (catapulta, carrera, meta) → Resultados (posición, tiempo, monedas) → (Tienda de mejoras disponible desde el título y desde resultados).

## 9. Estilo visual y de audio
- Low-poly colorido con sombreado suave, sombras, niebla atmosférica y cielo degradado. Personajes caricaturescos con ojos grandes.
- Partículas: polvo al derrapar, chispas de mini-turbo (azul/naranja), llamas de boost, polvo de aterrizaje, brillo de monedas, nieve, brasas.
- Audio sintetizado: motor (tono que sube con la velocidad), derrape, boost, moneda, caja, salto, aterrizaje, choque, cuenta regresiva, catapulta y música en bucle por pista (patrón simple con WebAudio).
