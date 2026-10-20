// Todos los números ajustables de las físicas del kart y de la cámara.
// Unidades: metros, segundos, radianes. Ver docs/DISENO.md §1.

// --- Estadísticas base (calibradas: 0 → 32 m/s en ~3.5 s en plano) ---
export const BASE_TOP_SPEED = 32;
export const BASE_ACCEL = 13.3;           // aceleración pico (a velocidad 0)
export const ACCEL_FALLOFF = 0.55;        // a(v) = accel·(1 − FALLOFF·v/top): empuje fuerte al inicio

// --- Integración ---
export const MAX_SUBSTEP = 1 / 60;        // dt máximo por sub-paso
export const MAX_SUBSTEPS = 4;

// --- Gravedad y contacto con el suelo ---
export const GRAVITY = 28;
export const GROUND_STICK = 14;           // aceleración extra hacia el suelo mientras hay contacto ("pegajoso")
export const GROUND_CONTACT_DIST = 0.3;   // hueco máximo con el suelo para seguir "en el suelo"
export const MAX_STEP_UP = 1.6;           // el kart sube escalones de hasta esta altura
export const MIN_GROUND_NORMAL_Y = 0.45;  // superficies más empinadas (~63°) no cuentan como suelo
export const NO_GROUND_BELOW_TRACK = 1.5; // en tramos sin suelo se ignoran golpes más abajo que esto respecto a la pista

// --- Pendiente ---
export const SLOPE_FLAT_MAX = 0.21;       // sin(~12°): hasta aquí la velocidad máx. es la base
export const SLOPE_TOP_GAIN = 1.5;        // velocidad máx. extra por unidad de sin(pendiente) por encima de SLOPE_FLAT_MAX
export const SLOPE_TOP_MAX_BONUS = 0.28;  // tope de la bonificación en bajadas (×1.28)
export const SLOPE_UP_TOP_LOSS = 1.0;     // en subidas: top ×(1 + sin·este)
export const SLOPE_UP_TOP_MIN = 0.78;
export const SLOPE_ACCEL_DOWN = 0.35;     // fracción de g·sin usada para acelerar cuesta abajo (si va bajo la máx.)
export const SLOPE_ACCEL_UP = 0.55;       // fracción de g·sin que frena cuesta arriba

// --- Velocidad por encima de la máxima ---
export const OVERSPEED_RATE = 1.1;        // 1/s: decaimiento hacia la máxima tras un boost
export const OVERSPEED_MIN_DECEL = 1.5;   // m/s²

// --- Giro ---
export const TURN_RATE = 2.5;             // rad/s de referencia
export const TURN_FULL_SPEED = 6;         // por debajo de esta velocidad el giro escala hacia 0
export const TURN_SPEED_FALLOFF = 40;     // rate = TURN_RATE / (1 + v / FALLOFF): más estable a alta velocidad
export const STEER_RESPONSE = 11;         // suavizado del input de giro (1/s)
export const GRIP = 14;                   // amortiguación de la velocidad lateral (1/s)

// --- Derrape y mini-turbo ---
export const DRIFT_MIN_SPEED = 10;
export const DRIFT_CANCEL_SPEED = 7;
export const DRIFT_STEER_THRESHOLD = 0.3;
export const DRIFT_TURN_BASE = 0.75;      // ×turnRate en la dirección del derrape sin input
export const DRIFT_TURN_STEER = 0.6;      // rango extra según el giro (cerrar/abrir)
export const DRIFT_GRIP = 3.2;
export const DRIFT_VEL_FOLLOW = 0.82;     // fracción del giro que sigue la velocidad (resto = deslizamiento)
export const DRIFT_VISUAL_ANGLE = 0.42;   // ángulo del morro hacia dentro (rad)
export const DRIFT_SPEED_FACTOR = 0.97;   // la velocidad máx. baja un poco al derrapar
export const DRIFT_LEVEL1_TIME = 0.7;
export const DRIFT_LEVEL2_TIME = 1.5;
export const DRIFT_BOOST1 = 0.6;
export const DRIFT_BOOST2 = 1.1;

// --- Boost ---
export const BOOST_TOP_MULT = 0.4;        // strength 1 → ×1.4 de la velocidad máx.
export const BOOST_ACCEL = 30;            // m/s² mientras va por debajo de la máx. con boost
export const BOOST_KICK = 3;              // m/s instantáneos al activar un boost nuevo
export const BOOST_PAD_DURATION = 1.0;
export const BOOST_PAD_COOLDOWN = 1.0;
export const BOOST_PAD_HEIGHT = 3;        // tolerancia vertical para pisar un pad

// --- Aire ---
export const AIR_YAW_RATE = 1.1;
export const AIR_VEL_FOLLOW = 0.55;       // fracción del giro aéreo que rota la velocidad
export const AIR_PITCH_MAX = 0.6;         // inclinación máx. del morro siguiendo la trayectoria
export const AIR_ORIENT_RATE = 2.5;
export const GROUND_ORIENT_RATE = 14;
export const LANDING_MIN_AIR = 0.2;       // aire mínimo para contar como aterrizaje (evento/penalización)
export const LANDING_BAD_ANGLE = 35 * Math.PI / 180;
export const LANDING_BAD_LOSS = 0.15;
export const JUMP_NO_SNAP_TIME = 0.15;    // tras jump()/launch no se pega al suelo durante este tiempo

// --- Truco aéreo ---
export const TRICK_DURATION = 0.45;
export const TRICK_MIN_AIR = 0.06;
export const TRICK_BOOST = 0.7;
export const TRICK_FAIL_LOSS = 0.25;

// --- Paredes y techo ---
export const KART_RADIUS = 1.0;
export const KART_HEIGHT = 1.4;
export const WALL_SPEED_LOSS = 0.10;
export const WALL_HIT_MIN_SPEED = 1.5;    // velocidad hacia la pared para contar como golpe
export const WALL_HIT_COOLDOWN = 0.3;
export const WALL_BOUNCE = 0.35;          // fracción de la velocidad de impacto devuelta hacia adentro
export const WALL_BOUNCE_MIN = 1.5;
export const WALL_DEFLECT = 0.5;          // fracción del ángulo contra la pared que se corrige en el rumbo
export const WALL_SCRAPE_FRICTION = 0.04; // pérdida por segundo al rozar

// --- Golpes y efectos ---
export const SPIN_TURNS = 2;              // vueltas completas durante un spinOut
export const SPIN_DECEL = 16;
export const SPIN_MIN_SPEED_FRAC = 0.35;
export const SPIN_SPEED_KEEP = 0.7;       // pérdida inmediata al empezar el spin

// --- Choques entre karts ---
export const KART_COLLIDE_RADIUS = 1.3;
export const KART_RESTITUTION = 0.4;
export const KART_PUSH = 2.5;             // empuje lateral mínimo (m/s) al chocar
export const RAM_PUSH = 11;               // empuje con Embestida
export const RAM_SPEED_LOSS = 0.2;

// --- Respawn ---
export const RESPAWN_SPEED = 12;
export const FALL_RESPAWN_DEPTH = 25;
export const FALL_RESPAWN_HOLD = 1.2;     // penalización al caer al vacío
export const RESPAWN_AFTER_GAP = 6;       // metros después del hueco donde reaparece

// --- Catapulta ---
export const LAUNCH_BASE_SPEED = 14;
export const LAUNCH_POWER_SPEED = 10;

// --- Cámara ---
export const CAM_DISTANCE = 6.8;
export const CAM_DISTANCE_SPEED = 1.4;    // distancia extra a velocidad máxima+boost
export const CAM_HEIGHT = 2.7;
export const CAM_LOOK_HEIGHT = 1.1;
export const CAM_LOOK_AHEAD = 5;
export const CAM_YAW_RATE = 6;            // suavizado del rumbo
export const CAM_HEIGHT_RATE = 7;         // suavizado de la altura
export const CAM_AIR_HEIGHT_RATE = 3;
export const CAM_MIN_GROUND_CLEARANCE = 0.8;
export const CAM_CEILING_MARGIN = 0.6;
export const CAM_FOV_MIN = 70;
export const CAM_FOV_MAX = 85;
export const CAM_FOV_BOOST = 92;
export const CAM_FOV_RATE = 4;
export const CAM_SHAKE_DECAY = 1.6;       // trauma por segundo
export const CAM_SHAKE_AMPLITUDE = 0.45;  // metros a trauma 1
export const CAM_SHAKE_ROT = 0.05;        // radianes a trauma 1
export const CAM_SNAP_DISTANCE = 20;      // si el kart salta más que esto en un frame, la cámara corta
export const CAM_LANDING_SHAKE = 0.03;    // trauma por m/s de impacto al aterrizar
export const CAM_WALL_SHAKE = 0.25;
