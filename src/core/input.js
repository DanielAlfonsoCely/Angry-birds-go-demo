// Input del jugador: teclado + controles virtuales (botones táctiles que dibuja src/ui).
// Uso: input.update() al inicio del frame y input.getControls() para obtener Controls.

const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  Space: 'drift', ShiftLeft: 'drift', ShiftRight: 'drift',
  ArrowUp: 'trick', KeyW: 'trick',
  KeyE: 'item', KeyX: 'item',
  KeyQ: 'power', KeyZ: 'power',
  Escape: 'pause', KeyP: 'pause',
};

const EDGE_ACTIONS = ['trick', 'item', 'power', 'pause'];

export class Input {
  constructor(target = window) {
    this.held = new Set();     // acciones mantenidas por teclado
    this.virtual = {};         // acciones de botones táctiles: {left, right, drift, ...}
    this.virtualSteer = 0;     // -1..1 si la UI usa un control analógico
    this.pressedQueue = new Set();
    this.edges = {};

    target.addEventListener('keydown', (e) => {
      const action = KEYMAP[e.code];
      if (!action) return;
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      if (!this.held.has(action)) this.pressedQueue.add(action);
      this.held.add(action);
    });
    target.addEventListener('keyup', (e) => {
      const action = KEYMAP[e.code];
      if (action) this.held.delete(action);
    });
    target.addEventListener('blur', () => this.held.clear());
  }

  /** Para botones táctiles: setVirtual('drift', true) al tocar, false al soltar. */
  setVirtual(action, pressed) {
    if (pressed && !this.virtual[action]) this.pressedQueue.add(action);
    this.virtual[action] = pressed;
  }

  isHeld(action) {
    return this.held.has(action) || !!this.virtual[action];
  }

  /** Llamar una vez al inicio de cada frame. */
  update() {
    this.edges = {};
    for (const a of EDGE_ACTIONS) this.edges[a] = this.pressedQueue.has(a);
    this.pressedQueue.clear();
  }

  /** @returns {import('./contracts.js').Controls} */
  getControls() {
    let steer = (this.isHeld('right') ? 1 : 0) - (this.isHeld('left') ? 1 : 0);
    if (steer === 0 && this.virtualSteer) steer = this.virtualSteer;
    const drift = this.isHeld('drift');
    return {
      steer,
      drift,
      launchHold: drift,
      trick: !!this.edges.trick,
      useItem: !!this.edges.item,
      usePower: !!this.edges.power,
      pause: !!this.edges.pause,
    };
  }
}
