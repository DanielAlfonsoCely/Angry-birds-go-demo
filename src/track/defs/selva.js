// Selva Eco: jungla. Cuevas largas, puentes de madera estrechos, slalom y cascadas.
export default {
  id: 'selva',
  seed: 2214,
  segments: [
    { type: 'open', length: 75, slope: 3, halfWidth: 9.5, start: true },
    { type: 'open', length: 120, turn: 35, slope: 7 },
    { type: 'slalom', length: 190, slope: 8, wiggles: 3, amp: 13 },
    { type: 'cave', length: 220, turn: -40, slope: 6 },
    { type: 'narrow', length: 120, slope: 5, style: 'bridge' },
    { type: 'jump', gap: 28, slope: 7 },
    { type: 'open', length: 110, turn: -45, slope: 7 },
    { type: 'boost', length: 80, slope: 8 },
    { type: 'narrow', length: 100, turn: 25, slope: 6, style: 'ledgeR' },
    { type: 'cave', length: 200, turn: 30, slope: 7 },
    { type: 'slalom', length: 160, slope: 7, wiggles: 2.5, amp: 14 },
    { type: 'jump', gap: 36, slope: 8 },
    { type: 'open', length: 130, turn: -30, slope: 8 },
    { type: 'boost', length: 60, slope: 6 },
    { type: 'open', length: 70, slope: 3, halfWidth: 9, finish: true },
  ],
};
