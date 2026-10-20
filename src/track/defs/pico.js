// Pico Escarcha: montaña nevada. Muchos saltos y aire, puentes de hielo estrechos.
// Tramos: length (m), turn (grados de giro total, + = derecha), slope (grados de bajada).
export default {
  id: 'pico',
  seed: 7341,
  segments: [
    { type: 'open', length: 75, slope: 3, halfWidth: 9.5, start: true },
    { type: 'open', length: 110, turn: -30, slope: 8 },
    { type: 'jump', gap: 30, slope: 8 },
    { type: 'open', length: 100, turn: 45, slope: 8 },
    { type: 'narrow', length: 100, slope: 5, style: 'bridge' },
    { type: 'slalom', length: 150, slope: 8, wiggles: 2, amp: 14 },
    { type: 'boost', length: 80, turn: -25, slope: 7 },
    { type: 'jump', gap: 42, slope: 9 },
    { type: 'cave', length: 150, turn: 35, slope: 7 },
    { type: 'open', length: 110, turn: -55, slope: 9 },
    { type: 'narrow', length: 100, turn: -15, slope: 7, style: 'ledgeL' },
    { type: 'jump', gap: 55, slope: 8 },
    { type: 'slalom', length: 120, slope: 7, wiggles: 2, amp: 12 },
    { type: 'boost', length: 70, slope: 7 },
    { type: 'open', length: 100, turn: 30, slope: 6 },
    { type: 'open', length: 70, slope: 3, halfWidth: 9, finish: true },
  ],
};
