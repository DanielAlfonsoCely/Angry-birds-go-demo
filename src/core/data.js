// Datos de diseño compartidos (ver docs/DISENO.md). Fuente única de verdad para personajes,
// objetos, mejoras y recompensas.

export const CHARACTERS = [
  { id: 'tuko',   name: 'Tuko',   animal: 'geco',    furColor: 0x9be33a, kartColor: 0xffd23f, power: 'turbo',   cost: 0 },
  { id: 'mora',   name: 'Mora',   animal: 'topo',    furColor: 0x8e5cc4, kartColor: 0x2ec4b6, power: 'sismo',   cost: 0 },
  { id: 'chispa', name: 'Chispa', animal: 'zorro',   furColor: 0xff8c2b, kartColor: 0xe63946, power: 'burbuja', cost: 0 },
  { id: 'bruno',  name: 'Bruno',  animal: 'oso',     furColor: 0x8b5a2b, kartColor: 0x2d6a4f, power: 'embestida', cost: 600 },
  { id: 'nilo',   name: 'Nilo',   animal: 'rana',    furColor: 0x3a86ff, kartColor: 0xff9f1c, power: 'brinco',  cost: 900 },
  { id: 'kiko',   name: 'Kiko',   animal: 'mapache', furColor: 0x8d99ae, kartColor: 0x7b2cbf, power: 'humo',    cost: 1200 },
];

export const POWERS = {
  turbo:     { name: 'Lengüetazo Turbo', description: 'Dash fuerte de 1.2 s' },
  sismo:     { name: 'Sismo',            description: 'Onda que hace girar a los rivales cercanos' },
  burbuja:   { name: 'Burbuja',          description: 'Escudo de 5 s con boost suave' },
  embestida: { name: 'Embestida',        description: 'Empuja rivales y no frena en paredes por 4 s' },
  brinco:    { name: 'Superbrinco',      description: 'Salto enorme hacia adelante' },
  humo:      { name: 'Bomba de humo',    description: 'Nube que frena a quien la cruce' },
};

export const POWER_CHARGE_TIME = 14;      // s para cargar al 100 %
export const POWER_CHARGE_PER_COIN = 0.04;

export const ITEMS = {
  cohete:    { name: 'Cohete',          icon: '🚀' },
  bolaNieve: { name: 'Bola de nieve',   icon: '❄️' },
  miel:      { name: 'Charco de miel',  icon: '🍯' },
  iman:      { name: 'Imán',            icon: '🧲' },
};

export const UPGRADES = {
  engine:   { name: 'Motor',       perLevel: 0.04 },
  accel:    { name: 'Aceleración', perLevel: 0.07 },
  handling: { name: 'Manejo',      perLevel: 0.06 },
  boost:    { name: 'Turbo',       perLevel: 0.06 },
};
export const UPGRADE_COSTS = [100, 200, 400, 700, 1100];
export const MAX_UPGRADE_LEVEL = UPGRADE_COSTS.length;

export const PLACE_REWARDS = [150, 100, 70, 40, 20, 20];
export const RACERS_PER_RACE = 6;

// Nivel de mejoras de la IA por pista [min, max]
export const AI_UPGRADE_RANGE = { pico: [0, 1], selva: [1, 3], canon: [3, 5] };
export const TRACK_ORDER = ['pico', 'selva', 'canon'];
