// Cálculo balístico de los saltos (sin dependencias de Three ni del DOM: lo usa también tests/track-check.mjs).
// Un kart sale del labio de la rampa con ángulo θ hacia arriba; la zona de aterrizaje empieza `drop` metros
// más abajo, `gap` metros más adelante, y baja con pendiente φ.

export const JUMP_PHYS = {
  gravity: 28,   // m/s² (docs/DISENO.md)
  vMin: 22,      // un kart a esta rapidez debe cruzar el hueco
  vMax: 45,      // a esta rapidez no se debe pasar de la zona de aterrizaje (32 × 1.4 ≈ 44.8)
  clearance: 2,  // margen vertical sobre el borde del aterrizaje para vMin (m)
  landMargin: 22, // metros de aterrizaje extra después del punto de caída de vMax
};

const DEG = Math.PI / 180;

/**
 * @param {{gap:number, rampAngle?:number, landSlope?:number}} spec
 */
export function designJump({ gap, rampAngle = 12, landSlope = 22 }) {
  const { gravity: g, vMin, vMax, clearance, landMargin } = JUMP_PHYS;
  const th = rampAngle * DEG;
  const tanT = Math.tan(th);
  const cos2 = Math.cos(th) ** 2;
  const tanP = Math.tan(landSlope * DEG);
  const k = (v) => g / (2 * v * v * cos2);
  // Altura del vuelo relativa al labio en x metros horizontales
  const y = (v, x) => x * tanT - k(v) * x * x;
  // Desnivel para que vMin llegue al borde del aterrizaje con `clearance` de margen
  const drop = Math.max(4, k(vMin) * gap * gap - gap * tanT + clearance);
  // x horizontal donde un kart a v toca la pendiente de aterrizaje (si cruza el hueco)
  const landX = (v) => {
    const a = k(v), b = tanT + tanP, c = drop - gap * tanP;
    return (b + Math.sqrt(b * b + 4 * a * c)) / (2 * a);
  };
  const xMax = landX(vMax);
  const landLength = (xMax - gap) / Math.cos(landSlope * DEG) + landMargin;
  return {
    gap, rampAngle, landSlope, drop, landLength,
    y, landX,
    /** y del vuelo a vMin justo en el borde del hueco (debe ser > -drop) */
    clearAtEdge: y(vMin, gap) + drop,
    /** ángulo (grados) entre la trayectoria y la pendiente al aterrizar */
    impactAngle(v) {
      const x = landX(v);
      const slope = tanT - 2 * k(v) * x;
      return Math.atan(-slope) / DEG - landSlope;
    },
  };
}
