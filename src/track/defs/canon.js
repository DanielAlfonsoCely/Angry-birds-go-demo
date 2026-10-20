// Cañón Brasa: cañón volcánico. Grandes tramos aéreos, túneles de lava y pendientes fuertes.
export default {
  id: 'canon',
  seed: 9907,
  segments: [
    { type: 'open', length: 75, slope: 3, halfWidth: 9.5, start: true },
    { type: 'open', length: 110, turn: 30, slope: 9 },
    { type: 'jump', gap: 38, slope: 10 },
    { type: 'cave', length: 150, turn: -30, slope: 8 },
    { type: 'boost', length: 70, slope: 8 },
    { type: 'narrow', length: 100, turn: 15, slope: 6, style: 'bridge' },
    { type: 'jump', gap: 50, slope: 9 },
    { type: 'slalom', length: 150, slope: 9, wiggles: 2, amp: 13 },
    { type: 'open', length: 100, turn: -50, slope: 10 },
    { type: 'cave', length: 130, turn: 25, slope: 8 },
    { type: 'boost', length: 70, slope: 8 },
    { type: 'jump', gap: 60, slope: 9 },
    { type: 'narrow', length: 90, turn: 20, slope: 7, style: 'ledgeL' },
    { type: 'open', length: 100, turn: 25, slope: 7 },
    { type: 'open', length: 70, slope: 3, halfWidth: 9, finish: true },
  ],
};
