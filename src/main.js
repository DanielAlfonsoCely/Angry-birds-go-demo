import { Game } from './core/game.js';
import { createUI } from './ui/index.js';
import { audio } from './audio/index.js';

const game = new Game(document.getElementById('app'));
audio.attach(game.events, game.save);
createUI(game, document.getElementById('ui'));
game.start();

// Gancho de depuración para pruebas automáticas (Playwright) y consola.
window.__game = game;
