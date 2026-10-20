// Cañón Brasa: cañón volcánico. Grandes tramos aéreos, túneles de lava y pendientes fuertes.
export default {
  id: 'canon',
  seed: 9907,
  segments: [
    { type: 'open', length: 75, slope: 3, halfWidth: 9.5, start: true },
    { type: 'open', length: 140, turn: 30, slope: 5 },
    { type: 'jump', gap: 26, slope: 5 },
    { type: 'cave', length: 190, turn: -30, slope: 5 },
    { type: 'boost', length: 90, slope: 5 },
    { type: 'narrow', length: 120, turn: 15, slope: 4, style: 'bridge' },
    { type: 'jump', gap: 32, slope: 5 },
    { type: 'slalom', length: 190, slope: 5, wiggles: 2, amp: 13 },
    { type: 'open', length: 130, turn: -50, slope: 5 },
    { type: 'cave', length: 170, turn: 25, slope: 5 },
    { type: 'boost', length: 90, slope: 5 },
    { type: 'jump', gap: 38, slope: 5 },
    { type: 'narrow', length: 110, turn: 20, slope: 5, style: 'ledgeL' },
    { type: 'open', length: 150, turn: 25, slope: 5 },
    { type: 'open', length: 70, slope: 3, halfWidth: 9, finish: true },
  ],
};
