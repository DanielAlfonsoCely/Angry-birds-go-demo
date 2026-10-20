// Posiciones: terminados primero (por orden de llegada), luego por progreso.
export function sortRacers(arr) {
  arr.sort((a, b) => {
    if (a.finishOrder && b.finishOrder) return a.finishOrder - b.finishOrder;
    if (a.finishOrder) return -1;
    if (b.finishOrder) return 1;
    return b.kart.t - a.kart.t;
  });
  for (let i = 0; i < arr.length; i++) arr[i].position = i + 1;
}

/** Tiempos de los que no terminaron: estimados y siempre crecientes en el orden de llegada. */
export function estimateTimes(sorted, raceTime, length) {
  const out = [];
  let prev = 0;
  for (const r of sorted) {
    let time = r.finishOrder ? r.finishTime : raceTime + ((1 - r.kart.t) * length) / Math.max(r.kart.speed, 20);
    time = Math.max(time, prev + 0.01);
    prev = time;
    out.push(time);
  }
  return out;
}
