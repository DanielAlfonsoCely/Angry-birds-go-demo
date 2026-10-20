import * as THREE from 'three';
import { EventBus } from './events.js';
import { Input } from './input.js';
import { SaveData } from './save.js';

/**
 * Un "modo" es lo que corre en pantalla (menú, carrera...). Interfaz:
 * { scene?: THREE.Scene, update(dt:number, time:number):void, dispose?():void }
 * Si el modo no trae escena, se renderiza game.scene (vacía).
 */
export class Game {
  constructor(container) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87b8e8);
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2500);

    this.events = new EventBus();
    this.input = new Input();
    this.save = new SaveData();
    this.mode = null;
    this.paused = false;
    this.time = 0;
    this.timeScale = 1;
    this.clock = new THREE.Clock();

    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setMode(mode) {
    this.mode?.dispose?.();
    this.mode = mode;
  }

  start() {
    this.renderer.setAnimationLoop(() => this.frame());
  }

  frame() {
    const dt = Math.min(this.clock.getDelta(), 1 / 20) * this.timeScale;
    this.input.update();
    if (!this.paused) this.time += dt;
    this.mode?.update(this.paused ? 0 : dt, this.time);
    this.renderer.render(this.mode?.scene ?? this.scene, this.camera);
  }
}
