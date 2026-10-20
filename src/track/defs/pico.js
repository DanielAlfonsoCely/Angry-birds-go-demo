// Pico Escarcha: montaña nevada. Muchos saltos y aire, puentes de hielo estrechos.
// Tramos: length (m), turn (grados de giro total, + = derecha), slope (grados de bajada).
export default {
  id: 'pico',
  seed: 7341,
  segments: [
    { type: 'open', length: 75, slope: 3, halfWidth: 9.5, start: true },
    { type: 'open', length: 150, turn: -30, slope: 6 },
    { type: 'jump', gap: 24, slope: 5 },
    { type: 'open', length: 120, turn: 45, slope: 5 },
    { type: 'narrow', length: 130, slope: 4, style: 'bridge' },
    { type: 'slalom', length: 160, slope: 5, wiggles: 2, amp: 14 },
    { type: 'boost', length: 100, turn: -25, slope: 5 },
    { type: 'jump', gap: 30, slope: 5 },
    { type: 'cave', length: 170, turn: 35, slope: 5 },
    { type: 'open', length: 120, turn: -55, slope: 5 },
    { type: 'narrow', length: 120, turn: -15, slope: 5, style: 'ledgeL' },
    { type: 'jump', gap: 36, slope: 5 },
    { type: 'slalom', length: 150, slope: 5, wiggles: 2, amp: 12 },
    { type: 'boost', length: 90, slope: 5 },
    { type: 'open', length: 120, turn: 30, slope: 4 },
    { type: 'open', length: 70, slope: 3, halfWidth: 9, finish: true },
  ],
};
