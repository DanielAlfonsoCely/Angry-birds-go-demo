// Retratos de personaje: se renderizan una vez a un WebGLRenderTarget con el renderer del juego
// y se guardan como dataURL (se usan en puntos de selección, HUD, podio y tabla).
import * as THREE from 'three';
import { createKartModel } from '../art/index.js';
import { CHARACTERS } from '../core/data.js';

const SIZE = 160;
const cache = new Map();
let rig = null;

function makeRig() {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8899bb, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(2, 3, 4);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  const target = new THREE.WebGLRenderTarget(SIZE, SIZE, { colorSpace: THREE.SRGBColorSpace, samples: 4 });
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  return { scene, camera, target, canvas, buf: new Uint8Array(SIZE * SIZE * 4) };
}

function render(game, id) {
  rig ??= makeRig();
  const { scene, camera, target, canvas, buf } = rig;
  const ch = CHARACTERS.find((c) => c.id === id);
  const model = createKartModel(id);
  model.setIdle?.(true);
  model.update(0.016, null);
  scene.add(model.group);
  scene.background = new THREE.Color(ch?.furColor ?? 0x9fb4d8).lerp(new THREE.Color(0xffffff), 0.55);
  model.group.updateMatrixWorld(true);
  const head = model.parts?.head ?? model.group;
  const c = new THREE.Vector3();
  head.getWorldPosition(c);
  // el kart mira hacia -Z o +Z según el modelo; se prueba el lado con la cara (+Z del modelo)
  camera.position.set(c.x + 1.25, c.y + 0.35, c.z + 2.6);
  camera.lookAt(c.x, c.y - 0.05, c.z);
  const r = game.renderer;
  const prevTarget = r.getRenderTarget();
  r.setRenderTarget(target);
  r.clear();
  r.render(scene, camera);
  r.readRenderTargetPixels(target, 0, 0, SIZE, SIZE, buf);
  r.setRenderTarget(prevTarget);
  scene.remove(model.group);
  // voltear filas (WebGL va de abajo hacia arriba)
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(SIZE, SIZE);
  for (let y = 0; y < SIZE; y++) {
    img.data.set(buf.subarray((SIZE - 1 - y) * SIZE * 4, (SIZE - y) * SIZE * 4), y * SIZE * 4);
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL('image/png');
}

/** dataURL del retrato (cacheado). Si falla devuelve ''. */
export function getPortrait(game, id) {
  if (!cache.has(id)) {
    try { cache.set(id, render(game, id)); } catch (e) { console.warn('[ui] retrato', id, e); cache.set(id, ''); }
  }
  return cache.get(id);
}
