import { Game } from './core/game.js';
import { createUI } from './ui/index.js';
import { audio } from './audio/index.js';

const game = new Game(document.getElementById('app'));
audio.attach(game.events, game.save);
createUI(game, document.getElementById('ui'));
game.start();

// Gancho de depuración para pruebas automáticas (Playwright) y consola.
window.__game = game;

// ?fps=1 muestra FPS, draw calls y triángulos
if (new URLSearchParams(location.search).has('fps')) {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;bottom:8px;left:50%;transform:translateX(-50%);z-index:99;color:#0f0;background:#000a;font:12px monospace;padding:2px 6px;border-radius:4px;pointer-events:none';
  document.body.appendChild(el);
  setInterval(() => {
    const r = game.renderer.info.render;
    el.textContent = `${window.__fps} FPS · ${r.calls} calls · ${(r.triangles / 1000).toFixed(0)}k tris`;
  }, 500);
}
