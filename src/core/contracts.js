// Contratos entre módulos. Este archivo es la "API" que cada agente debe respetar.
// Solo contiene typedefs (JSDoc) y nombres compartidos; no tiene lógica.
// Si un módulo necesita cambiar una firma, lo propone al orquestador en vez de editarla.

/**
 * Controles de un kart para un frame. Lo producen el input del jugador y la IA.
 * Los campos "edge" son true solo en el frame en que se presionó la tecla.
 * @typedef {Object} Controls
 * @property {number}  steer       -1 (izquierda) .. 1 (derecha)
 * @property {boolean} drift       mantenido
 * @property {boolean} trick       edge: truco aéreo
 * @property {boolean} useItem     edge
 * @property {boolean} usePower    edge
 * @property {boolean} launchHold  mantenido: tensar catapulta (mismo botón que drift)
 * @property {boolean} pause       edge
 */

/**
 * Muestra de la pista en un parámetro t (0 = salida, 1 = meta).
 * @typedef {Object} TrackSample
 * @property {THREE.Vector3} position  centro de la pista (sobre el suelo)
 * @property {THREE.Vector3} tangent   dirección de avance (normalizada)
 * @property {THREE.Vector3} right     derecha de la pista (normalizada, horizontal-ish)
 * @property {THREE.Vector3} up        normal de la superficie de la pista
 * @property {number}  halfWidth       mitad del ancho jugable en t
 * @property {string}  segmentType     'open'|'narrow'|'cave'|'jump'|'boost'|'slalom'
 * @property {boolean} hasGround       false en el hueco de un tramo 'jump'
 * @property {number|null} ceilingHeight altura del techo sobre el suelo (cuevas), null si no hay
 */

/**
 * @typedef {Object} GroundHit
 * @property {number} height          y del suelo bajo el punto
 * @property {THREE.Vector3} normal   normal del suelo
 * @property {THREE.Object3D} object  malla golpeada
 */

/**
 * Pista construida. La crea `buildTrack(trackId)` de src/track.
 * @typedef {Object} Track
 * @property {string} id
 * @property {string} name
 * @property {string} theme                    'snow'|'jungle'|'volcano'
 * @property {THREE.Group} group               todo lo visual de la pista (agregar a la escena)
 * @property {THREE.Object3D[]} groundMeshes   mallas de suelo para raycast (incluye rampas)
 * @property {number} length                   largo en metros
 * @property {(t:number) => TrackSample} sample
 * @property {(pos:THREE.Vector3, hintT?:number) => number} closestT   t más cercano (busca cerca de hintT si se da)
 * @property {(pos:THREE.Vector3) => GroundHit|null} getGroundAt       raycast hacia abajo desde pos.y + 3
 * @property {(count:number) => {position:THREE.Vector3, quaternion:THREE.Quaternion}[]} spawnGrid
 * @property {{position:THREE.Vector3, collected:boolean, object:THREE.Object3D}[]} coins
 * @property {{position:THREE.Vector3, active:boolean, respawnTimer:number, object:THREE.Object3D}[]} itemBoxes
 * @property {{t:number, position:THREE.Vector3, radius:number, object:THREE.Object3D}[]} boostPads
 * @property {(dt:number, time:number) => void} update   animaciones (monedas girando, cajas, agua, lava...)
 * @property {() => void} dispose
 */

/**
 * Estadísticas de manejo ya con mejoras aplicadas.
 * @typedef {Object} KartStats
 * @property {number} topSpeed   m/s
 * @property {number} accel      m/s²
 * @property {number} handling   multiplicador de giro/agarre (1 = base)
 * @property {number} boostPower multiplicador de boosts (1 = base)
 */

/**
 * Kart con físicas arcade. Lo crea `createKart(opts)` de src/physics.
 * @typedef {Object} Kart
 * @property {string} id
 * @property {string} characterId
 * @property {THREE.Group} object3D          raíz visual; el modelo de src/art se agrega como hijo
 * @property {THREE.Vector3} position
 * @property {THREE.Vector3} velocity
 * @property {THREE.Quaternion} quaternion
 * @property {number} speed                  rapidez actual (m/s)
 * @property {number} t                      progreso en la pista (0..1)
 * @property {number} lateral                desplazamiento lateral desde el centro (m)
 * @property {boolean} grounded
 * @property {boolean} drifting
 * @property {number} driftDir               -1|0|1
 * @property {number} driftCharge            segundos cargados
 * @property {0|1|2} driftLevel              0 nada, 1 azul, 2 naranja
 * @property {number} boostTimer             s restantes de boost
 * @property {number} airTime                s en el aire (actual)
 * @property {boolean} doingTrick
 * @property {number} spinTimer              s restantes girando sin control
 * @property {number} slowTimer              s restantes ralentizado
 * @property {number} slowFactor
 * @property {boolean} frozen                true mientras está en la catapulta (no se mueve)
 * @property {boolean} finished
 * @property {KartStats} stats
 * @property {{shield:number, ram:number}} effects  timers de poderes activos (los usa gameplay)
 * @property {(dt:number, controls:Controls, track:Track) => void} update
 * @property {(duration:number, strength?:number) => void} applyBoost   strength 1 = ×1.4 velocidad máx
 * @property {(duration:number) => void} spinOut
 * @property {(factor:number, duration:number) => void} slowDown
 * @property {(power:number) => void} launch      sale de la catapulta; power 0..1
 * @property {(vy:number, forward:number) => void} jump   impulso vertical (Superbrinco)
 * @property {(track:Track) => void} respawn
 * @property {(other:Kart) => void} collideWith   resolver choque kart-kart (empujar)
 */

/**
 * Modelo visual de un personaje + kart. Lo crea `createKartModel(characterId)` de src/art.
 * @typedef {Object} KartModel
 * @property {THREE.Group} group
 * @property {(dt:number, kart:Kart) => void} update   ruedas, inclinación, animación del piloto, llamas de boost
 */

/**
 * Entorno de un tema (cielo, luces, niebla, fondo lejano). `createEnvironment(theme)` de src/art.
 * @typedef {Object} Environment
 * @property {THREE.Group} group
 * @property {(scene:THREE.Scene) => void} apply           pone fondo/niebla en la escena
 * @property {(dt:number, cameraPosition:THREE.Vector3) => void} update  clima, el sol sigue a la cámara para las sombras
 * @property {() => void} dispose
 */

/*
 * Extras de src/art: createCharacterPreview(characterId) → {group, update(dt), model} (menús);
 * createProp(kind, theme, opts?) con opts {light, variant, random}.
 * Extra de src/audio: audio.setEngine(speedRatio, boosting, drifting?).
 * createParticles(scene, theme?) y particles.setTheme(theme): el polvo toma el color del tema.
 * Track: sample(t, out?) y getGroundAt(pos, out?) aceptan un objeto de salida opcional (sin asignaciones).
 * Pausa: la UI es dueña de la tecla de pausa; gameplay solo expone race.pause(bool).
 */

/**
 * Sistema de partículas. `createParticles(scene)` de src/art.
 * @typedef {Object} Particles
 * @property {(kind:ParticleKind, position:THREE.Vector3, opts?:{count?:number, color?:number, direction?:THREE.Vector3, scale?:number}) => void} emit
 * @property {(dt:number) => void} update
 * @property {() => void} dispose
 */

/** @typedef {'dust'|'driftSpark'|'boostFlame'|'landing'|'coin'|'itemBox'|'smoke'|'shockwave'|'hit'|'snow'|'ember'|'leaf'} ParticleKind */

/**
 * Tipos de prop decorativos que el módulo de pistas pide a src/art con `createProp(kind, theme)`.
 * El módulo de arte debe soportar todos; si recibe uno desconocido, devuelve una roca.
 */
export const PROP_KINDS = [
  'tree',        // pino (snow), árbol tropical (jungle), árbol seco (volcano)
  'rock',
  'bigRock',
  'crystal',     // hielo (snow), cristal mágico (jungle), cristal rojo (volcano)
  'bush',
  'flower',
  'ruin',        // columna/arco de piedra
  'sign',        // cartel de curva (flecha)
  'flag',        // banderines
  'lantern',     // luz de cueva (incluye PointLight opcional)
  'geyser',
  'snowman',
  'mushroom',
  'cactus',
  'arch',        // arco de salida / meta
];

/** Sonidos que expone src/audio con `audio.play(name)`. */
export const SFX = [
  'countdown', 'go', 'catapultStretch', 'catapultRelease',
  'coin', 'itemBox', 'itemUse', 'boost', 'driftStart', 'miniTurbo',
  'jump', 'land', 'trick', 'wallHit', 'kartHit', 'spinOut',
  'shield', 'shockwave', 'smoke', 'snowball', 'honey', 'magnet',
  'finish', 'uiClick', 'uiBack', 'purchase', 'error',
];

/**
 * Eventos que viajan por game.events (EventBus). Payloads entre paréntesis.
 * Gameplay los emite; UI, audio y arte los escuchan.
 */
export const EVENTS = {
  RACE_START: 'race:start',          // ({trackId, characterId})
  COUNTDOWN: 'race:countdown',       // ({n}) n = 3,2,1,0 (0 = ¡YA!)
  LAUNCH: 'race:launch',             // ({kartId, power, rating:'perfect'|'good'|'normal'})
  LAUNCH_METER: 'race:launchMeter',  // ({value, holding})  cada frame durante la cuenta
  COIN: 'race:coin',                 // ({kartId, total})
  ITEM_PICKUP: 'race:itemPickup',    // ({kartId, itemId})
  ITEM_USE: 'race:itemUse',          // ({kartId, itemId})
  POWER_CHARGE: 'race:powerCharge',  // ({value 0..1})  solo del jugador
  POWER_USE: 'race:powerUse',        // ({kartId, powerId})
  HIT: 'race:hit',                   // ({kartId, by})
  DRIFT_BOOST: 'race:driftBoost',    // ({kartId, level})
  TRICK: 'race:trick',               // ({kartId, success})
  LAND: 'race:land',                 // ({kartId, impact})
  POSITION: 'race:position',         // ({position, total})
  FINISH: 'race:finish',             // ({kartId, position, time})
  RACE_END: 'race:end',              // ({results:[{kartId, characterId, position, time, isPlayer}], coinsCollected, reward})
  PAUSE: 'game:pause',               // ({paused})
};
