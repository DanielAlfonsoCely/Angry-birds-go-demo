// Cálculo balístico de los saltos (sin dependencias de Three ni del DOM: lo usa también tests/track-check.mjs).
// Un kart sale del labio de la rampa con ángulo θ hacia arriba; la zona de aterrizaje empieza `drop` metros
// más abajo y `gap` metros más adelante. La pendiente del aterrizaje es una curva tipo "colina de saltos de esquí":
// en cada punto vale el ángulo de llegada del kart que cae ahí menos `ease` grados, así el impacto es suave
// a cualquier rapidez entre vMin y vMax.

export const JUMP_PHYS = {
  gravity: 28,    // m/s² (docs/DISENO.md)
  vMin: 22,       // un kart a esta rapidez debe cruzar el hueco
  vMax: 45,       // a esta rapidez no se debe pasar de la zona de aterrizaje (32 × 1.4 ≈ 44.8)
  clearance: 2,   // margen vertical sobre el borde del aterrizaje para vMin (m)
  landMargin: 24, // metros de aterrizaje extra después del punto de caída de vMax
  ease: 12,       // grados que la pendiente es más suave que la trayectoria que aterriza ahí (v <= easeV)
  easeV: 35,      // por encima de esta rapidez se tolera más diferencia (hasta easeMax) para acortar el aterrizaje
  easeMax: 31,
  minLand: 16,    // grados mínimos/máximos de la pendiente de aterrizaje
  maxLand: 45,
};

const DEG = Math.PI / 180;
const STEP = 0.5;

/**
 * @param {{gap:number, rampAngle?:number}} spec
 */
export function designJump({ gap, rampAngle = 12, vMin: vMinOpt }) {
  const { gravity: g, vMax, clearance, landMargin, ease, easeV, easeMax, minLand, maxLand } = JUMP_PHYS;
  const vMin = vMinOpt ?? JUMP_PHYS.vMin; // por salto: pistas con rampa cuesta arriba llegan más lentas
  const th = rampAngle * DEG;
  const tanT = Math.tan(th);
  const cos2 = Math.cos(th) ** 2;
  const k = (v) => g / (2 * v * v * cos2);
  // Altura del vuelo relativa al labio en x metros horizontales
  const y = (v, x) => x * tanT - k(v) * x * x;
  const flightAngle = (v, x) => Math.atan(-(tanT - 2 * k(v) * x)) / DEG; // grados hacia abajo
  // Desnivel para que vMin llegue al borde del aterrizaje con `clearance` de margen
  const drop = Math.max(4, k(vMin) * gap * gap - gap * tanT + clearance);

  // Perfil del aterrizaje: se avanza por la superficie; en cada punto se busca el kart que aterriza ahí
  const pitches = [];            // grados hacia abajo, uno por paso de 0.5 m sobre la superficie
  const px = [gap], py = [-drop]; // puntos de la superficie (x horizontal, y relativa al labio)
  let x = gap, ys = -drop, guard = 0;
  for (;;) {
    const den = x * tanT - ys;
    const v = Math.sqrt((g * x * x) / (2 * cos2 * den));
    if (v >= vMax + 2 || guard++ > 1200) break;
    const e = v <= easeV ? ease : Math.min(easeMax, ease + (v - easeV) * 5);
    const phi = Math.min(maxLand, Math.max(minLand, flightAngle(v, x) - e));
    pitches.push(phi);
    x += Math.cos(phi * DEG) * STEP;
    ys -= Math.sin(phi * DEG) * STEP;
    px.push(x); py.push(ys);
  }
  const lastPitch = pitches.length ? pitches[pitches.length - 1] : minLand;
  const nMargin = Math.round(landMargin / STEP);
  for (let n = 0; n < nMargin; n++) {
    pitches.push(lastPitch);
    x += Math.cos(lastPitch * DEG) * STEP;
    ys -= Math.sin(lastPitch * DEG) * STEP;
    px.push(x); py.push(ys);
  }
  const landLength = pitches.length * STEP;

  /** Punto de aterrizaje de un kart a rapidez v: {x, y, slope (grados), impact (grados de diferencia)} */
  function landing(v) {
    for (let n = 0; n < pitches.length; n++) {
      const yb = y(v, px[n + 1]);
      if (yb <= py[n + 1]) {
        // interpolar dentro del tramo n
        const ya = y(v, px[n]);
        const da = ya - py[n], db = yb - py[n + 1];
        const u = da > 0 ? da / (da - db) : 0;
        const lx = px[n] + (px[n + 1] - px[n]) * u;
        return { x: lx, y: y(v, lx), slope: pitches[n], impact: flightAngle(v, lx) - pitches[n], along: (n + u) * STEP };
      }
    }
    return { x: Infinity, y: -Infinity, slope: lastPitch, impact: NaN, along: Infinity };
  }

  return {
    gap, rampAngle, drop, landLength, landPitches: pitches, landStep: STEP,
    landSlope: pitches[0], landEndSlope: lastPitch,
    y, landing, vMin,
    landX: (v) => landing(v).x,
    impactAngle: (v) => landing(v).impact,
    /** y del vuelo a vMin justo en el borde del hueco por encima del borde del aterrizaje (debe ser > 0) */
    clearAtEdge: y(vMin, gap) + drop,
    /** metros de aterrizaje que sobran después del punto de caída de vMax */
    spareAfterVMax: landLength - landing(vMax).along,
  };
}
