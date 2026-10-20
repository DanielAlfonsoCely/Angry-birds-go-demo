// Cañón Brasa: cañón volcánico. Grandes tramos aéreos, túneles de lava y pendientes fuertes.
export default {
  id: 'canon',
  seed: 9907,
  segments: [
    { type: 'open', length: 75, slope: 3, halfWidth: 9.5, start: true },
    { type: 'open', length: 140, turn: 30, slope: 11 },
    { type: 'jump', gap: 38, slope: 10 },
    { type: 'cave', length: 170, turn: -30, slope: 10 },
    { type: 'boost', length: 80, slope: 9 },
    { type: 'narrow', length: 110, turn: 15, slope: 7, style: 'bridge' },
    { type: 'jump', gap: 50, slope: 9 },
    { type: 'slalom', length: 170, slope: 11, wiggles: 2.5, amp: 13 },
    { type: 'open', length: 120, turn: -50, slope: 12 },
    { type: 'cave', length: 150, turn: 25, slope: 10 },
    { type: 'boost', length: 70, slope: 8 },
    { type: 'jump', gap: 60, slope: 9 },
    { type: 'narrow', length: 90, turn: -20, slope: 7, style: 'ledgeL' },
    { type: 'open', length: 120, turn: 25, slope: 9 },
    { type: 'open', length: 70, slope: 3, halfWidth: 9, finish: true },
  ],
};
