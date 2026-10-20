// Verificación numérica de las pistas: largo, pendiente, saltos alcanzables y que la pista no se cruce.
// Uso: node tests/track-check.mjs
import { TRACK_DEFS } from '../src/track/defs/index.js';
import { buildPath, SEGMENT_TYPES } from '../src/track/path.js';
import { JUMP_PHYS } from '../src/track/ballistics.js';

let fail = false;
for (const def of Object.values(TRACK_DEFS)) {
  const f = buildPath(def);
  const drop = f.py[0] - f.py[f.finishIndex];
  const types = new Set(def.segments.map((s) => s.type));
  console.log(`\n== ${def.id}: largo ${f.length.toFixed(0)} m, frames ${f.N}, desnivel ${drop.toFixed(0)} m ` +
    `(pendiente media ${(Math.atan(drop / f.length) * 180 / Math.PI).toFixed(1)}°), tipos: ${[...types].join(',')}`);
  if (f.length < 1800 || f.length > 2500) { console.log('  !! largo fuera de 1.8–2.5 km'); fail = true; }
  for (const t of SEGMENT_TYPES) if (!types.has(t)) { console.log(`  !! falta tipo ${t}`); fail = true; }
  for (const j of f.jumps) {
    const d = j.design;
    console.log(`  salto hueco ${d.gap} m (rampa ${d.rampAngle}°): desnivel ${d.drop.toFixed(1)} m, aterrizaje ${d.landLength.toFixed(0)} m ` +
      `de ${d.landSlope.toFixed(0)}° a ${d.landEndSlope.toFixed(0)}°; margen de vMin=${d.vMin} sobre el borde ${d.clearAtEdge.toFixed(1)} m; ` +
      `sobran ${d.spareAfterVMax.toFixed(0)} m tras la caída de vMax=${JUMP_PHYS.vMax}`);
    if (!(d.clearAtEdge > 0) || !(d.spareAfterVMax > 10)) { console.log('  !! salto no alcanzable o aterrizaje corto'); fail = true; }
    const row = [];
    for (const v of [22, 25, 28, 32, 35, 40, 45]) {
      const L = d.landing(v);
      row.push(`v${v}: vuelo ${L.x.toFixed(0)} m, impacto ${L.impact.toFixed(0)}°`);
      if (v >= 28 && v <= 35 && !(L.impact < 30)) { console.log(`  !! impacto ${L.impact.toFixed(0)}° a ${v} m/s (>30°)`); fail = true; }
      if (!Number.isFinite(L.x)) { console.log(`  !! a ${v} m/s se pasa del aterrizaje`); fail = true; }
    }
    console.log('    ' + row.join(' | '));
  }
  // Auto-cruce: distancia horizontal mínima entre frames separados > 450 m de recorrido
  let minD = Infinity, at = null;
  for (let i = 0; i < f.N; i += 3) {
    for (let k = i + Math.round(450 / f.ds); k < f.N; k += 3) {
      const d = Math.hypot(f.px[i] - f.px[k], f.pz[i] - f.pz[k]);
      if (d < minD) { minD = d; at = [i, k]; }
    }
  }
  console.log(`  distancia mínima entre partes lejanas de la pista: ${minD.toFixed(0)} m (frames ${at})`);
  if (minD < 170) { console.log('  !! la pista pasa demasiado cerca de sí misma'); fail = true; }
  let minR = Infinity;
  for (let i = 0; i < f.N; i++) if (f.ground[i]) minR = Math.min(minR, 1 / Math.max(1e-6, Math.abs(f.curv[i])));
  console.log(`  radio de curva mínimo: ${minR.toFixed(0)} m`);
}
process.exit(fail ? 1 : 0);
