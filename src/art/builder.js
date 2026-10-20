// Utilidades de construcción procedural: cada pieza se hornea con su color en un atributo de
// vértice y todas las piezas que comparten material se fusionan en una sola geometría.
// Así un personaje completo cuesta pocos draw calls y todos comparten unos pocos materiales.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ---------- Materiales compartidos (vertexColors) ----------
const MATS = {};
/**
 * Materiales globales compartidos por todo el arte.
 * smooth: personajes · flat: props low-poly · gloss: pintura del kart · glow: emisivo sin luz
 * ice: translúcido brillante · metal: cromados
 */
export function getMat(kind = 'smooth') {
  if (MATS[kind]) return MATS[kind];
  let m;
  switch (kind) {
    case 'flat':
      m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, flatShading: true });
      break;
    case 'gloss':
      m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.05 });
      break;
    case 'metal':
      m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.75 });
      break;
    case 'glow':
      m = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
      break;
    case 'ice':
      m = new THREE.MeshStandardMaterial({
        vertexColors: true, roughness: 0.1, metalness: 0.1, flatShading: true,
        transparent: true, opacity: 0.82, emissive: 0x1b4a6b, emissiveIntensity: 0.35,
      });
      break;
    case 'glowFlat':
      // cristales: se iluminan pero también brillan por sí mismos
      m = new THREE.MeshStandardMaterial({
        vertexColors: true, roughness: 0.25, flatShading: true, emissive: 0xffffff, emissiveIntensity: 0.0,
      });
      m.onBeforeCompile = (s) => {
        // la emisión toma el color del vértice (multiplicado) para que cada cristal brille con su tono
        s.fragmentShader = s.fragmentShader.replace(
          '#include <emissivemap_fragment>',
          '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * 0.55;',
        );
      };
      break;
    default:
      m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0 });
  }
  m.name = `art-${kind}`;
  MATS[kind] = m;
  return m;
}

// ---------- Colores ----------
const _c = new THREE.Color();
export function shade(hex, amount) {
  // amount > 0 aclara hacia blanco, < 0 oscurece
  _c.setHex(hex);
  const hsl = {};
  _c.getHSL(hsl);
  hsl.l = THREE.MathUtils.clamp(hsl.l + amount, 0, 1);
  return _c.setHSL(hsl.h, hsl.s, hsl.l).getHex();
}
export function mix(a, b, t) {
  return new THREE.Color(a).lerp(new THREE.Color(b), t).getHex();
}

// ---------- Aleatorio con semilla ----------
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

// ---------- Deformación low-poly ----------
/** Desplaza vértices de forma consistente por posición (no rompe las caras compartidas). */
export function jitter(geo, amount, seed = 7) {
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const h = hash3(Math.round(v.x * 1000), Math.round(v.y * 1000), Math.round(v.z * 1000), seed);
    pos.setXYZ(i, v.x + (h[0] - 0.5) * amount, v.y + (h[1] - 0.5) * amount, v.z + (h[2] - 0.5) * amount);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}
function hash3(x, y, z, s) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647 + s * 1442695041) | 0;
  const out = [];
  for (let k = 0; k < 3; k++) {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    out.push(((h >>> 0) % 10007) / 10007);
  }
  return out;
}

// ---------- Builder ----------
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

/**
 * Acumula piezas (geometría + color + transformación) agrupadas por material.
 * add(geo, color, {p:[x,y,z], r:[x,y,z], s:number|[x,y,z], q:Quaternion, mat:'smooth'})
 * color puede ser un número o una función (x,y,z) => hex evaluada por vértice (ya transformado).
 */
export class Builder {
  constructor() {
    this.parts = {};
  }

  add(geo, color, o = {}) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (o.q) _q.copy(o.q);
    else _q.setFromEuler(_e.set(...(o.r ?? [0, 0, 0])));
    _p.set(...(o.p ?? [0, 0, 0]));
    if (typeof o.s === 'number') _s.setScalar(o.s);
    else _s.set(...(o.s ?? [1, 1, 1]));
    _m.compose(_p, _q, _s);
    g.applyMatrix4(_m);
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    const c = new THREE.Color();
    const pos = g.attributes.position;
    for (let i = 0; i < n; i++) {
      if (typeof color === 'function') c.setHex(color(pos.getX(i), pos.getY(i), pos.getZ(i)));
      else c.setHex(color);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const key = o.mat ?? 'smooth';
    (this.parts[key] ??= []).push(g);
    return this;
  }

  /** Cilindro/cápsula entre dos puntos. */
  limb(a, b, radius, color, o = {}) {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const dir = vb.clone().sub(va);
    const len = dir.length();
    const geo = o.cyl
      ? new THREE.CylinderGeometry(o.r2 ?? radius, radius, len, o.seg ?? 8)
      : new THREE.CapsuleGeometry(radius, Math.max(0.001, len), 4, o.seg ?? 8);
    const q = new THREE.Quaternion().setFromUnitVectors(_up, dir.normalize());
    const mid = va.add(vb).multiplyScalar(0.5);
    return this.add(geo, color, { ...o, p: [mid.x, mid.y, mid.z], q });
  }

  isEmpty() {
    return Object.keys(this.parts).length === 0;
  }

  /** Geometrías fusionadas por material: {matKey: BufferGeometry} */
  geometries() {
    const out = {};
    for (const [k, list] of Object.entries(this.parts)) {
      const merged = mergeGeometries(list, false);
      merged.computeBoundingSphere();
      merged.computeBoundingBox();
      out[k] = merged;
      for (const g of list) g.dispose();
    }
    this.parts = {};
    return out;
  }
}

/** Crea un Group con una malla por material a partir de geometrías ya fusionadas. */
export function meshesFrom(geos, { cast = true, receive = false } = {}) {
  const g = new THREE.Group();
  for (const [k, geo] of Object.entries(geos)) {
    const m = new THREE.Mesh(geo, getMat(k));
    const shadowless = k === 'glow' || k === 'ice';
    m.castShadow = cast && !shadowless;
    m.receiveShadow = receive && k !== 'glow';
    g.add(m);
  }
  return g;
}

/** Atajo: construye y devuelve el Group directamente. */
export function buildGroup(builder, opts) {
  return meshesFrom(builder.geometries(), opts);
}

// ---------- Texturas pequeñas compartidas ----------
let _dotTex = null;
/** Textura radial suave (para halos y sprites). */
export function getGlowTexture() {
  if (_dotTex) return _dotTex;
  const s = 64;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d');
  const grd = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,255,255,0.6)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, s, s);
  _dotTex = new THREE.CanvasTexture(cv);
  _dotTex.colorSpace = THREE.SRGBColorSpace;
  return _dotTex;
}
