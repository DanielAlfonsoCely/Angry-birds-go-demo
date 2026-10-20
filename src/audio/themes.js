// Temas musicales originales. Notación compacta:
//  - chords: grado del acorde por compás (tríada diatónica de la escala).
//  - melody: un string por compás con tokens separados por espacio (8 = corcheas, 16 = semicorcheas).
//    Número = grado de la escala (1 = tónica, 8 = tónica una octava arriba, 0 = séptimo grado abajo),
//    sufijo '#'/'b' altera medio tono, '-' sostiene la nota anterior, '.' silencio.
//  - bass: 16 caracteres por compás: R raíz, 3 tercera, 5 quinta, O octava, '-' sostener, '.' silencio.
//  - chordRhythm / padRhythm: 'x' ataca el acorde, '-' sostiene, '.' silencio.
//  - drums: {instrumento: 16 chars}, 'X' acento, 'x' normal, 'g' fantasma, '.' nada.
//    Instrumentos: k bombo, s caja, c aplauso, r aro, h hat, o hat abierto, z shaker, p/l congas, t tom, x platillo.
//  - fill: batería que reemplaza a la de la sección en su último compás.
//  - root: nota MIDI base de los acordes; leadOct/bassOct: desplazamiento en semitonos.

export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
};

// ---------------- MENÚ: relajado y pegadizo (Fa mayor, shuffle) ----------------
const menuA = {
  chords: [1, 6, 4, 5, 1, 6, 2, 5],
  melody: [
    '5 . 3 5 6 5 3 .',
    '6 . 5 6 8 - . .',
    '8 . 7 6 4 - 6 .',
    '5 - - . 7 6 5 4',
    '3 . 5 8 7 8 5 .',
    '6 . 8 6 5 3 . .',
    '4 . 2 4 6 5 4 2',
    '7 - 5 - 2 - . .',
  ],
  bass: 'R--R--5-R--5-.O-',
  padRhythm: 'x---------------',
  drums: { k: 'x.......x.....x.', r: '....x.......x...', z: 'g.x.g.x.g.x.g.x.' },
  fill: { k: 'x.......x.......', r: '....x.......x.x.', t: '..........x.x.x.', z: 'g.x.g.x.g.x.g.x.' },
};
const menuB = {
  chords: [4, 5, 3, 6, 4, 5, 1, 1],
  melody: [
    '6 - - 8 - - 6 .',
    '5 - - 7 - - 9 .',
    '7 - 5 - 3 - 5 .',
    '6 - - - 5 - 6 .',
    '4 - 6 - 8 - 10 -',
    '9 - 8 - 7 - 5 .',
    '8 - - - - - 5 .',
    '3 - 2 - 1 - . .',
  ],
  bass: 'R-.R-.5-R-.5-.O-',
  padRhythm: 'x-------x-------',
  drums: { k: 'x.....x.x.......', c: '....x.......x...', z: 'g.x.g.x.g.x.g.x.', o: '..............x.' },
  fill: { k: 'x.....x.x.......', c: '....x.......x...', t: '........x.x.x...', z: 'g.x.g.x.g.x.g.x.' },
};

// ---------------- PICO: alegre y aventurero (Re mayor) ----------------
const picoA = {
  chords: [1, 5, 6, 4, 1, 5, 4, 5],
  melody: [
    '1 3 5 8 7 5 3 5',
    '7 - 5 - 2 3 5 .',
    '6 - 8 - 10 - 8 6',
    '4 - 6 - 8 - - .',
    '8 7 8 10 9 8 7 8',
    '9 - 7 5 9 - 12 .',
    '11 - 10 - 9 - 8 -',
    '9 - - - 7 - 5 .',
  ],
  bass: 'R.O.R.O.5.O.R.O.',
  chordRhythm: '..x...x...x...x.',
  drums: { k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...x.' },
  fill: { k: 'x...x...x.......', s: '....x.....x.xxXX', t: '........x.x.....', h: '..x...x.........' },
};
const picoB = {
  chords: [6, 4, 1, 5, 6, 4, 5, 5],
  melody: [
    '10 - - 8 - - 6 .',
    '8 - - 6 - - 4 .',
    '5 - 8 - 10 - 12 -',
    '11 - 10 - 9 - - .',
    '10 - - 12 - - 10 .',
    '11 - - 10 - - 8 .',
    '9 - 10 - 11 - 12 -',
    '12 - - - 9 - 7 -',
  ],
  bass: 'R.R.O.R.5.R.O.5.',
  chordRhythm: '..x...x...x...x.',
  padRhythm: 'x---------------',
  drums: { k: 'x...x...x...x.x.', c: '....x.......x...', h: 'xgxgxgxgxgxgxgxg', o: '..............x.' },
  fill: { k: 'x...x...x...x...', s: '....x...x.x.xxXX', h: 'xgxgxgxg........' },
};

// ---------------- SELVA: percusivo y tropical (La dórico) ----------------
const selvaA = {
  chords: [1, 4, 1, 4, 7, 4, 1, 1],
  melody: [
    '5 . 5 3 . 1 3 .',
    '4 . 6 . 8 - 6 .',
    '5 . 5 3 . 1 3 5',
    '6 - 4 - 2 - . .',
    '7 . 9 . 11 . 9 7',
    '6 . 8 . 10 - 8 .',
    '8 - 5 - 3 - 5 -',
    '1 - - . . . . .',
  ],
  bass: 'R..R..5.O..5..R.',
  chordRhythm: '..x..x....x..x..',
  padRhythm: 'x---------------',
  drums: { k: 'x.....x.x.......', l: 'x.......x..x....', p: '..x..x....x..x.x', z: 'g.x.g.x.g.x.g.x.', r: '....x.......x...' },
  fill: { k: 'x.....x.x.......', p: '..x..x..x.x.x.x.', l: '........x.x.xxxx', z: 'g.x.g.x.g.x.g.x.' },
};
const selvaB = {
  chords: [3, 7, 4, 1, 3, 7, 4, 5],
  melody: [
    '3 5 8 . 8 7 5 .',
    '7 - 5 . 2 - . .',
    '4 6 8 . 8 9 8 6',
    '5 - - . 3 - 1 .',
    '10 - 8 . 7 - 8 .',
    '9 - 7 . 5 - 7 .',
    '8 - 6 - 4 - 6 -',
    '5 - - - 2 - - .',
  ],
  bass: 'R..R..R.5..5..O.',
  chordRhythm: '..x..x....x..x..',
  padRhythm: 'x-------x-------',
  drums: { k: 'x.....x.x.....x.', c: '....x.......x...', p: '..x..x.x..x..x.x', l: 'x.......x.......', z: 'gxgxgxgxgxgxgxgx', o: '......x.......x.' },
  fill: { k: 'x.....x.x.......', p: 'x.x.x.x.xxxx....', l: '............xxxx', c: '....x...........' },
};

// ---------------- CAÑÓN: intenso y rápido (Mi menor) ----------------
const canonA = {
  chords: [1, 6, 7, 1, 1, 6, 7, 5],
  melody: [
    '1 . 1 3 5 . 3 1',
    '6 . 6 8 10 . 8 6',
    '7 . 7 9 11 . 9 7',
    '8 - - - 5 - 8 -',
    '12 - 10 - 8 - 10 12',
    '13 - 12 - 10 - 8 -',
    '11 - 9 - 11 - 14 -',
    '12 - - - 9 - 7 -',
  ],
  bass: 'R.RRR.RRR.RRO.5.',
  padRhythm: 'x---------------',
  drums: { k: 'x...x...x...x...', s: '....x.......x...', h: 'xgxgxgxgxgxgxgxg' },
  fill: { k: 'x.......x.......', s: 'x.x.x.x.xxxxXXXX', t: '........x.x.x.x.' },
};
const canonB = {
  chords: [4, 1, 4, 5, 6, 7, 1, 1],
  melody: [
    '11 - - 10 - - 8 -',
    '8 - - 10 - - 12 -',
    '13 - - 12 - - 11 -',
    '12 - - - 9 - - -',
    '13 - 12 13 15 - 13 -',
    '14 - 13 14 16 - 14 -',
    '15 - - - 12 - - -',
    '8 - 12 - 15 - - .',
  ],
  bass: 'R.RRR.RRR.RRO.5.',
  chordRhythm: 'x..x..x...x..x..',
  padRhythm: 'x-------x-------',
  drums: { k: 'x...x..xx...x...', s: '....x.......x...', o: '..x...x...x...x.', h: 'x...x...x...x...' },
  fill: { k: 'x.......x.......', s: 'x.x.x.x.xxxxXXXX', t: '........x.x.x.x.', x: '..............x.' },
};

export const THEMES = {
  menu: {
    bpm: 100, swing: 0.28, root: 53, scale: 'major',
    lead: 'pluck', chordInst: 'stab', padInst: 'softPad', bassInst: 'bassRound',
    leadOct: 12, bassOct: -12, gain: 0.45, crash: false,
    sections: { A: menuA, B: menuB },
    order: ['A', 'A', 'B', 'A'],
  },
  pico: {
    bpm: 138, swing: 0, root: 50, scale: 'major',
    lead: 'squareLead', chordInst: 'stab', padInst: 'pad', bassInst: 'bassPluck',
    leadOct: 12, bassOct: -12, gain: 0.5, crash: true,
    sections: { A: picoA, B: picoB },
    order: ['A', 'B', 'A', 'B'],
  },
  selva: {
    bpm: 112, swing: 0.14, root: 57, scale: 'dorian',
    lead: 'marimba', chordInst: 'stab', padInst: 'softPad', bassInst: 'bassPluck',
    leadOct: 12, bassOct: -12, gain: 0.45, crash: false,
    sections: { A: selvaA, B: selvaB },
    order: ['A', 'B', 'A', 'B'],
  },
  canon: {
    bpm: 162, swing: 0, root: 52, scale: 'minor',
    lead: 'sawLead', chordInst: 'stab', padInst: 'pad', bassInst: 'bassSaw',
    leadOct: 12, bassOct: -12, gain: 0.45, crash: true,
    sections: { A: canonA, B: canonB },
    order: ['A', 'B', 'A', 'B'],
  },
};
