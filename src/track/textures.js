// Texturas procedurales (CanvasTexture): suelo de pista, bordes, terreno, túnel, agua/lava, boost pads, cajas.
import * as THREE from 'three';
import { createRng, fbm2D } from './rng.js';

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function toTexture(c, { repeat = true, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

const hex = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];

/** Rellena un canvas con ruido fractal periódico entre dos colores. */
function noiseFill(ctx, size, c0, c1, scale, seed, octaves = 4) {
  const img = ctx.createImageData(size, size);
  const a = hex(c0), b = hex(c1);
  const period = scale;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm2D((x / size) * scale, (y / size) * scale, seed, octaves, period);
      const k = Math.min(1, Math.max(0, (n - 0.25) * 2));
      const o = (y * size + x) * 4;
      img.data[o] = a[0] + (b[0] - a[0]) * k;
      img.data[o + 1] = a[1] + (b[1] - a[1]) * k;
      img.data[o + 2] = a[2] + (b[2] - a[2]) * k;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

// Dibuja una figura repetida en las 9 posiciones envolventes (para que la textura sea continua)
function wrapDraw(size, x, y, fn) {
  for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) fn(x + dx, y + dy);
}

/** Suelo de la pista. u = ancho (0..1, bordes en 0 y 1), v = a lo largo. */
export function roadTexture(theme, seed = 1) {
  const S = 512;
  const c = canvas(S);
  const ctx = c.getContext('2d');
  const rng = createRng(seed);
  if (theme === 'snow') {
    noiseFill(ctx, S, 0xcfdcec, 0xf7fbff, 8, seed);
    // Huellas de esquí/neumático compactadas
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#7f9bc0';
    for (const u of [0.28, 0.36, 0.64, 0.72]) ctx.fillRect(u * S - 7, 0, 14, S);
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = rng.chance(0.5) ? '#ffffff' : '#b8cbe2';
      wrapDraw(S, rng.range(0, S), rng.range(0, S), (x, y) => ctx.fillRect(x, y, 2, 2));
    }
  } else if (theme === 'jungle') {
    noiseFill(ctx, S, 0x6a4a2c, 0xa57d4f, 8, seed);
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#4a321c';
    for (const u of [0.3, 0.7]) ctx.fillRect(u * S - 14, 0, 28, S);
    // Hojas caídas
    for (let i = 0; i < 260; i++) {
      ctx.globalAlpha = rng.range(0.55, 0.95);
      ctx.fillStyle = rng.pick(['#3f7a2a', '#6aa23a', '#c7832a', '#9a5a22', '#d9b23a']);
      const r = rng.range(4, 10), ang = rng.range(0, Math.PI);
      wrapDraw(S, rng.range(0, S), rng.range(0, S), (x, y) => {
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * 0.45, ang, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = rng.chance(0.5) ? '#3d2a16' : '#c9a06a';
      wrapDraw(S, rng.range(0, S), rng.range(0, S), (x, y) => ctx.fillRect(x, y, 3, 3));
    }
  } else {
    noiseFill(ctx, S, 0x231a18, 0x4e3c36, 10, seed);
    // Grietas con brillo de lava
    ctx.lineCap = 'round';
    for (let i = 0; i < 26; i++) {
      let x = rng.range(0.08, 0.92) * S, y = rng.range(0, S);
      ctx.strokeStyle = rng.chance(0.4) ? '#ff6a1a' : '#120c0b';
      ctx.lineWidth = rng.range(1.5, 3.5);
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 6; k++) {
        x += rng.range(-18, 18);
        y += rng.range(8, 26);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  // Bordes más oscuros (u = 0 y 1)
  ctx.globalAlpha = 1;
  const g = ctx.createLinearGradient(0, 0, S, 0);
  g.addColorStop(0, 'rgba(0,0,0,0.35)');
  g.addColorStop(0.07, 'rgba(0,0,0,0)');
  g.addColorStop(0.93, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return toTexture(c);
}

/** Tablero de puente/cornisa (tablones de hielo, madera o losas). */
export function deckTexture(theme, seed = 2) {
  const S = 256;
  const c = canvas(S);
  const ctx = c.getContext('2d');
  const rng = createRng(seed);
  const pal = theme === 'snow' ? ['#bfe3f7', '#a6d3ee', '#d6f0ff', '#7fb3d6']
    : theme === 'jungle' ? ['#8a5a2e', '#9c6a38', '#7a4c26', '#3e2612'] : ['#4a3a36', '#3a2e2a', '#5a4640', '#140e0c'];
  const planks = 8;
  for (let i = 0; i < planks; i++) {
    ctx.fillStyle = pal[i % 3];
    ctx.fillRect(0, (i * S) / planks, S, S / planks);
    ctx.globalAlpha = 0.25;
    for (let k = 0; k < 20; k++) {
      ctx.fillStyle = rng.chance(0.5) ? '#ffffff' : '#000000';
      ctx.fillRect(rng.range(0, S), (i * S) / planks + rng.range(2, S / planks - 2), rng.range(10, 60), 1.5);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = pal[3];
    ctx.fillRect(0, (i * S) / planks, S, 3);
  }
  return toTexture(c);
}

/** Franjas del bordillo (v a lo largo). */
export function curbTexture(colors) {
  const c = canvas(64, 128);
  const ctx = c.getContext('2d');
  ctx.fillStyle = colors[0];
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = colors[1];
  ctx.fillRect(0, 64, 64, 64);
  return toTexture(c);
}

/** Rampa con chevrones apuntando hacia adelante (v). */
export function rampTexture(colors) {
  const S = 256;
  const c = canvas(S);
  const ctx = c.getContext('2d');
  ctx.fillStyle = colors[0];
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = colors[1];
  for (const y0 of [0, S / 2]) {
    ctx.beginPath();
    ctx.moveTo(0.1 * S, y0 + S * 0.42);
    ctx.lineTo(0.5 * S, y0 + S * 0.12);
    ctx.lineTo(0.9 * S, y0 + S * 0.42);
    ctx.lineTo(0.9 * S, y0 + S * 0.3);
    ctx.lineTo(0.5 * S, y0 + S * 0.0);
    ctx.lineTo(0.1 * S, y0 + S * 0.3);
    ctx.closePath();
    ctx.fill();
  }
  return toTexture(c);
}

/** Detalle de terreno en gris claro (el color sale de los vertex colors). */
export function detailTexture(seed = 3, kind = 'rock') {
  const S = 256;
  const c = canvas(S);
  const ctx = c.getContext('2d');
  noiseFill(ctx, S, kind === 'snow' ? 0xd4dbe4 : 0x9a9a9a, 0xffffff, 6, seed, 5);
  const rng = createRng(seed);
  ctx.globalAlpha = 0.25;
  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = rng.chance(0.5) ? '#ffffff' : '#707070';
    wrapDraw(S, rng.range(0, S), rng.range(0, S), (x, y) => ctx.fillRect(x, y, rng.range(1, 4), rng.range(1, 3)));
  }
  return toTexture(c);
}

/** Agua o lava animable (v a lo largo del flujo). */
export function fluidTexture(kind, seed = 4) {
  const S = 256;
  const c = canvas(S);
  const ctx = c.getContext('2d');
  if (kind === 'lava') {
    noiseFill(ctx, S, 0xff3a00, 0xffd23a, 5, seed, 4);
    const rng = createRng(seed);
    ctx.globalAlpha = 0.75;
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = rng.chance(0.5) ? '#3a120a' : '#5a1a0a';
      const r = rng.range(6, 22);
      wrapDraw(S, rng.range(0, S), rng.range(0, S), (x, y) => {
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * rng.range(0.4, 0.9), rng.range(0, 3), 0, Math.PI * 2);
        ctx.fill();
      });
    }
  } else {
    noiseFill(ctx, S, 0x1f5f8a, 0x4fb0d0, 5, seed, 4);
    const rng = createRng(seed);
    ctx.strokeStyle = '#d8f4ff';
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 2;
    for (let i = 0; i < 70; i++) {
      const x = rng.range(0, S), y = rng.range(0, S), w = rng.range(10, 30);
      wrapDraw(S, x, y, (xx, yy) => {
        ctx.beginPath();
        ctx.moveTo(xx - w, yy);
        ctx.quadraticCurveTo(xx, yy - 4, xx + w, yy);
        ctx.stroke();
      });
    }
  }
  return toTexture(c);
}

/** Cascada: franjas verticales claras con transparencia. */
export function waterfallTexture() {
  const c = canvas(128, 256);
  const ctx = c.getContext('2d');
  const rng = createRng(77);
  ctx.fillStyle = 'rgba(120,200,235,0.75)';
  ctx.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = `rgba(255,255,255,${rng.range(0.2, 0.7)})`;
    const x = rng.range(0, 128), y = rng.range(0, 256), h = rng.range(20, 80);
    wrapDraw(128, x, y, (xx, yy) => ctx.fillRect(xx, yy, rng.range(1, 4), h));
  }
  const t = toTexture(c);
  return t;
}

/** Flechas del boost pad (transparente). */
export function boostArrowTexture(color) {
  const S = 128;
  const c = canvas(S);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, S, S);
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0.14 * S, 0.62 * S);
  ctx.lineTo(0.5 * S, 0.22 * S);
  ctx.lineTo(0.86 * S, 0.62 * S);
  ctx.lineTo(0.86 * S, 0.84 * S);
  ctx.lineTo(0.5 * S, 0.46 * S);
  ctx.lineTo(0.14 * S, 0.84 * S);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.moveTo(0.3 * S, 0.6 * S);
  ctx.lineTo(0.5 * S, 0.38 * S);
  ctx.lineTo(0.7 * S, 0.6 * S);
  ctx.lineTo(0.7 * S, 0.66 * S);
  ctx.lineTo(0.5 * S, 0.46 * S);
  ctx.lineTo(0.3 * S, 0.66 * S);
  ctx.closePath();
  ctx.fill();
  return toTexture(c);
}

/** Base del boost pad: placa oscura con borde brillante. */
export function boostBaseTexture(color) {
  const S = 128;
  const c = canvas(S, S * 1.5);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#15181f';
  ctx.fillRect(0, 0, S, S * 1.5);
  ctx.strokeStyle = color;
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, S - 12, S * 1.5 - 12);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(12, 12, S - 24, S * 1.5 - 24);
  return toTexture(c, { repeat: false });
}

/** Cara de la caja de objeto con "?". */
export function itemBoxTexture() {
  const S = 128;
  const c = canvas(S);
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, S, S);
  g.addColorStop(0, 'rgba(255,120,220,0.55)');
  g.addColorStop(0.5, 'rgba(120,220,255,0.45)');
  g.addColorStop(1, 'rgba(255,230,90,0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = 9;
  ctx.strokeRect(5, 5, S - 10, S - 10);
  ctx.font = 'bold 92px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(60,30,110,0.9)';
  ctx.strokeText('?', S / 2, S / 2 + 6);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('?', S / 2, S / 2 + 6);
  return toTexture(c, { repeat: false });
}

/** Tablero de ajedrez para la línea de salida/meta. */
export function checkerTexture() {
  const c = canvas(128, 32);
  const ctx = c.getContext('2d');
  for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) {
    ctx.fillStyle = (i + j) % 2 ? '#111111' : '#ffffff';
    ctx.fillRect(i * 8, j * 8, 8, 8);
  }
  const t = toTexture(c, { repeat: false });
  t.magFilter = THREE.NearestFilter;
  return t;
}

/** Brillo radial (faroles, monedas). */
export function glowTexture() {
  const c = canvas(64);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return toTexture(c, { repeat: false });
}
