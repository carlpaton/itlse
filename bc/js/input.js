// Keyboard input: held keys sampled once per tick, with edge detection for jump/fire.
const DEFAULT_BINDINGS = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  down: ['ArrowDown', 'KeyS'],
  up: ['ArrowUp', 'KeyW'],
  jump: ['KeyZ', 'Space', 'KeyK'],
  run: ['KeyX', 'ShiftLeft', 'ShiftRight', 'KeyJ'],
  pause: ['Enter', 'Escape', 'KeyP'],
  mute: ['KeyM'],
};
const ACTION_LABELS = {
  left: 'Move left', right: 'Move right', down: 'Crouch / enter pipe', up: 'Climb vine',
  jump: 'Jump / swim', run: 'Run / fireball', pause: 'Pause', mute: 'Mute',
};

const Input = {
  bindings: JSON.parse(JSON.stringify(DEFAULT_BINDINGS)),
  keys: new Set(),
  hits: new Set(), // keys pressed since the last tick, so quick taps are never missed
  prev: {},
  now: {},
  pressed: {},
  onKey: null, // menus can intercept raw key presses

  init() {
    window.addEventListener('keydown', (e) => {
      if (this.onKey && this.onKey(e)) { e.preventDefault(); return; }
      if (this.isGameKey(e.code)) e.preventDefault();
      this.keys.add(e.code);
      if (!e.repeat) this.hits.add(e.code);
    });
    window.addEventListener('keyup', (e) => { this.keys.delete(e.code); });
    window.addEventListener('blur', () => this.keys.clear());
  },
  isGameKey(code) {
    for (const k in this.bindings) if (this.bindings[k].includes(code)) return true;
    return false;
  },
  held(action) {
    const list = this.bindings[action] || [];
    for (const c of list) if (this.keys.has(c)) return true;
    return false;
  },
  // Called once per update tick.
  sample() {
    for (const a in this.bindings) {
      const tapped = this.bindings[a].some((c) => this.hits.has(c));
      const h = this.held(a) || tapped;
      this.pressed[a] = (h && !this.prev[a]) || tapped;
      this.now[a] = h;
      this.prev[a] = this.held(a);
    }
    this.hits.clear();
    // Left + right together cancel out.
    if (this.now.left && this.now.right) { this.now.left = false; this.now.right = false; }
  },
  clear() {
    this.keys.clear();
    this.hits.clear();
    for (const a in this.bindings) { this.prev[a] = true; this.now[a] = false; this.pressed[a] = false; }
  },
  keyName(code) {
    return code.replace(/^Key/, '').replace(/^Arrow/, '').replace(/^Digit/, '')
      .replace('ShiftLeft', 'L-Shift').replace('ShiftRight', 'R-Shift').replace('Escape', 'Esc');
  },
};
