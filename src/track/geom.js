// Utilidades para construir mallas "barridas" a lo largo de los frames de la pista.
import * as THREE from 'three';

/**
 * Construye una tira barrida: para cada frame de `frames` se calcula una sección transversal.
 * @param {object} f tabla de frames (path.js)
 * @param {number[]} frames índices de frame consecutivos
 * @param {number} cols número de puntos de la sección
 * @param {(i:number, c:number, out:number[]) => void} section escribe [lateral, altura, u] del punto c del frame i
 *   (lateral sobre right, altura en y de mundo relativa al centro del frame, u coordenada de textura)
 * @param {{vScale?:number, color?:(i:number,c:number,x:number,y:number,z:number,out:number[])=>void, vFromY?:number}} [opts]
 */
export function sweepGeometry(f, frames, cols, section, opts = {}) {
  const vScale = opts.vScale ?? 10;
  const n = frames.length;
  const pos = new Float32Array(n * cols * 3);
  const uv = new Float32Array(n * cols * 2);
  const col = opts.color ? new Float32Array(n * cols * 3) : null;
  const tmp = [0, 0, 0];
  const ctmp = [1, 1, 1];
  for (let r = 0; r < n; r++) {
    const i = frames[r];
    for (let c = 0; c < cols; c++) {
      section(i, c, tmp);
      const k = r * cols + c;
      const x = f.px[i] + f.rx[i] * tmp[0];
      const y = f.py[i] + tmp[1];
      const z = f.pz[i] + f.rz[i] * tmp[0];
      pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z;
      uv[k * 2] = tmp[2];
      uv[k * 2 + 1] = (f.s[i] - (opts.vFromY ? y * opts.vFromY : 0)) / vScale;
      if (col) {
        opts.color(i, c, x, y, z, ctmp);
        col[k * 3] = ctmp[0]; col[k * 3 + 1] = ctmp[1]; col[k * 3 + 2] = ctmp[2];
      }
    }
  }
  const idx = [];
  for (let r = 0; r < n - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const a = r * cols + c, b = a + 1, cc = a + cols, d = cc + 1;
      idx.push(a, b, cc, b, d, cc);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (col) g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

/** Parte una lista de índices de frame en trozos de hasta `max` frames que comparten el frame del borde. */
export function chunkRun(run, max = 60) {
  const out = [];
  for (let a = 0; a < run.length - 1; a += max) out.push(run.slice(a, Math.min(run.length, a + max + 1)));
  return out;
}

/**
 * Agrupa frames consecutivos según una clave (null = excluir). Tramos contiguos comparten el frame del borde.
 * @returns {{key:string, frames:number[]}[]}
 */
export function runsBy(f, keyFn, i0 = 0, i1 = f.N - 1) {
  const runs = [];
  let cur = null;
  for (let i = i0; i <= i1; i++) {
    const k = keyFn(i);
    if (k == null) { cur = null; continue; }
    if (!cur || cur.key !== k) {
      const prevKey = i > i0 ? keyFn(i - 1) : null;
      cur = { key: k, frames: prevKey != null && cur ? [i - 1] : [] };
      runs.push(cur);
    }
    cur.frames.push(i);
  }
  return runs.filter((r) => r.frames.length > 1);
}
