// Metadatos de presentación (solo UI): nombres de pistas, temas, colores y textos.
// Los datos de juego viven en src/core/data.js; aquí solo lo necesario para mostrarlos.
import { CHARACTERS, POWERS, ITEMS, TRACK_ORDER } from '../core/data.js';
import { hexCss } from './dom.js';

export const TRACKS = {
  pico: {
    name: 'Pico Escarcha', theme: 'snow', themeName: 'Montaña nevada',
    blurb: 'Saltos enormes y puentes de hielo',
    colors: ['#3d7fd6', '#9fd3ff', '#eef6ff'], accent: '#4cc9f0', music: 'pico',
  },
  selva: {
    name: 'Selva Eco', theme: 'jungle', themeName: 'Selva',
    blurb: 'Cuevas largas, lianas y puentes de madera',
    colors: ['#1f8a5b', '#7ed36b', '#d7f5c4'], accent: '#ff5d8f', music: 'selva',
  },
  canon: {
    name: 'Cañón Brasa', theme: 'volcano', themeName: 'Cañón volcánico',
    blurb: 'Tramos aéreos y túneles de lava',
    colors: ['#2b1538', '#c4442a', '#ff9f4a'], accent: '#ff7b2e', music: 'canon',
  },
};

export const trackName = (id) => TRACKS[id]?.name ?? id;

/** Pista siguiente en TRACK_ORDER o null. */
export const nextTrack = (id) => TRACK_ORDER[TRACK_ORDER.indexOf(id) + 1] ?? null;

export const ANIMAL_NAMES = {
  geco: 'Geco', topo: 'Topo', zorro: 'Zorro', oso: 'Oso', rana: 'Rana', mapache: 'Mapache',
};

export const POWER_ICONS = {
  turbo: '⚡', sismo: '💥', burbuja: '🛡️', embestida: '🐗', brinco: '⏫', humo: '💨',
};

export const ITEM_DESC = {
  cohete: 'Boost de 2 s', bolaNieve: 'Golpea al rival de adelante', miel: 'Trampa pegajosa', iman: 'Atrae monedas',
};

export const getCharacter = (id) => CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];

export function characterInfo(id) {
  const c = getCharacter(id);
  const p = POWERS[c.power] ?? { name: c.power, description: '' };
  return {
    ...c,
    animalName: ANIMAL_NAMES[c.animal] ?? c.animal,
    powerName: p.name,
    powerDesc: p.description,
    powerIcon: POWER_ICONS[c.power] ?? '★',
    fur: hexCss(c.furColor),
    kart: hexCss(c.kartColor),
  };
}

export const itemInfo = (id) => (id && ITEMS[id] ? { id, ...ITEMS[id], desc: ITEM_DESC[id] ?? '' } : null);

export const UPGRADE_INFO = {
  engine: { icon: 'engine', color: '#ff5d5d', desc: '+4 % de velocidad máxima' },
  accel: { icon: 'accel', color: '#ffb703', desc: '+7 % de aceleración' },
  handling: { icon: 'handling', color: '#2ec4b6', desc: '+6 % de giro y agarre' },
  boost: { icon: 'boost', color: '#8e5cff', desc: '+6 % de potencia de turbo' },
};
