# Ideas para próximas sesiones

## Pedidas por el usuario
- **Carreras de varias vueltas (decidido: "lanzamiento de regreso")**. Al llegar a la meta de una vuelta intermedia, un cañón o telescopio de regreso (cinemática de ~2 s con la cámara siguiendo el vuelo) sube a cada kart a la cima y sigue la siguiente vuelta, conservando las posiciones relativas. En la selección de pista: 1 / 2 / 3 vueltas. Hay que tocar gameplay (vueltas, posiciones por vuelta + t), UI (selector y "Vuelta 2/3" en el HUD), track (punto de reinicio de vuelta) y arte (cañón de regreso).
- **Más mapas.** El sistema de pistas funciona por datos (`src/track/defs/`), así que una pista nueva es un archivo de tramos más un tema. Ideas: Playa Coral (tropical, de día), Bosque Lunar (de noche, con hongos luminosos), Fábrica de Juguetes (interior, cintas transportadoras).
- **Multijugador local (LAN / hotspot).** Arquitectura propuesta:
  - El PC anfitrión corre un servidor Node pequeño (`server/`, con WebSocket `ws` y el build estático de Vite) en la red local. Los amigos abren `http://<ip-del-anfitrión>:PUERTO` en su navegador.
  - Modelo **cliente-autoritativo con reconciliación simple**: cada cliente simula su kart con las físicas actuales y envía posición, velocidad, rumbo y eventos unas 20 veces por segundo. El servidor reenvía el estado. Los rivales remotos se interpolan con un buffer de ~100 ms. Los objetos y poderes van como eventos ("ai3 lanzó una bola de nieve a X") que el servidor valida y difunde.
  - Lobby: crear o unirse a una sala, elegir personaje y pista, y marcar "listo". La cuenta regresiva la sincroniza el servidor.
  - Los huecos de la carrera los llena la IA actual.
  - Por qué este enfoque: la red local tiene poca latencia, y es mucho más simple que un servidor autoritativo con predicción completa.

## Propuestas del orquestador
- **Fantasma del mejor tiempo**: grabar la trayectoria del mejor tiempo y correr contra ella.
- **Copas**: torneo de 3 pistas con puntos por puesto.
- **Atajos** en las pistas (bifurcaciones): requieren soportar dos splines en el contrato Track.
- **Retos diarios**, por ejemplo "termina Selva Eco sin chocar paredes".
- **Desafíos por personaje** que desbloqueen colores alternativos del kart.
- **Repetición de la carrera** al terminar, con cámaras de TV.
- **Rendimiento**: medir en la laptop del usuario con `?fps=1` y, si hace falta, agregar una calidad gráfica baja/media/alta en Ajustes (sombras, densidad de decoración, pixel ratio).
