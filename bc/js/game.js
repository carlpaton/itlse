// Game shell: state machine, fixed-timestep loop, level flow and saving.
const Game = {
  canvas: null, ctx: null, scale: 3,
  state: 'menu',
  world: null, level: null,
  slot: 0,
  progress: null,
  introT: 0,
  settings: { volume: 0.5, muted: false, forgiving: true },

  init() {
    this.canvas = document.getElementById('screen');
    this.ctx = this.canvas.getContext('2d');
    Render.init();
    Input.init();
    Menus.init();
    const s = Save.loadSettings();
    if (s) {
      this.settings = { ...this.settings, ...s };
      if (s.bindings) Input.bindings = { ...JSON.parse(JSON.stringify(DEFAULT_BINDINGS)), ...s.bindings };
    }
    Audio.volume = this.settings.volume; Audio.muted = this.settings.muted;
    window.addEventListener('resize', () => this.resize());
    this.resize();
    const unlock = () => Audio.ensure();
    window.addEventListener('keydown', unlock); window.addEventListener('pointerdown', unlock);
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.state === 'play') this.pause(); });
    window.addEventListener('blur', () => { if (this.state === 'play') this.pause(); });
    this.progress = this.freshProgress();
    this.toTitle();
    let last = performance.now(); let acc = 0;
    const step = 1000 / FPS;
    const frame = (now) => {
      acc += Math.min(250, now - last); last = now;
      let n = 0;
      while (acc >= step && n < 5) { this.tick(); acc -= step; n++; }
      if (n === 5) acc = 0;
      this.render();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  },
  // Fill the browser window: height sets the scale, and the view widens (256-480 px) to match the window's shape.
  resize() {
    const stage = document.getElementById('stage');
    const cs = getComputedStyle(stage);
    const w = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const h = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    let s = h / VIEW_H;
    let vw = Math.round(w / s);
    if (vw < VIEW_W_MIN) { s = w / VIEW_W_MIN; vw = VIEW_W_MIN; }
    if (vw > VIEW_W_MAX) vw = VIEW_W_MAX;
    VIEW_W = vw;
    this.scale = s;
    this.canvas.width = Math.round(VIEW_W * s); this.canvas.height = Math.round(VIEW_H * s);
    Render.resize();
  },
  saveSettings() {
    const ok = Save.saveSettings({ ...this.settings, bindings: Input.bindings });
    if (!ok) Menus.toast("Couldn't save settings — storage unavailable");
  },
  freshProgress() {
    return { levelId: '1-1', lives: 3, score: 0, coins: 0, form: 'small', checkpoint: false, random: null, worldStartScore: 0 };
  },

  // ---------------------------------------------------------------- flow
  toTitle() {
    Audio.stop(); Audio.setFast(false);
    this.state = 'menu'; this.world = null;
    Menus.title(this);
  },
  newGame(slot) {
    this.slot = slot;
    this.progress = this.freshProgress();
    this.beginLevel();
  },
  newRandom(slot, type, difficulty, seed) {
    this.slot = slot;
    this.progress = this.freshProgress();
    this.progress.levelId = 'R';
    this.progress.random = { type, difficulty, seed };
    this.beginLevel();
  },
  anotherRandom() {
    const r = this.progress.random;
    r.seed = Math.floor(Math.random() * 1e9);
    this.progress.checkpoint = false;
    this.beginLevel();
  },
  currentSpec() {
    const p = this.progress;
    if (!p.random) return findLevel(p.levelId);
    // Retry seeds until the generated level is reachable end to end.
    let seed = p.random.seed;
    for (let i = 0; i < 25; i++) {
      const spec = randomSpec(p.random.type, p.random.difficulty, seed);
      const level = generateLevel(spec);
      if (levelReachable(level.areas.main)) { p.random.seed = seed; return spec; }
      seed = (seed + 1) % 2147483647;
    }
    return randomSpec(p.random.type, p.random.difficulty, p.random.seed);
  },
  // Show the world intro card, auto-save, then start.
  beginLevel() {
    Menus.hide();
    Audio.stop(); Audio.setFast(false);
    this.state = 'intro'; this.introT = 150;
    this.world = null;
    if (this.slot > 0) {
      const r = Save.write(this.slot, 'auto', { progress: { ...this.progress } });
      if (!r.ok) Menus.toast(r.error);
    }
  },
  startLevel() {
    const spec = this.currentSpec();
    this.level = generateLevel(spec);
    this.world = new World(this, this.level, { checkpoint: this.progress.checkpoint });
    this.state = 'play';
  },
  onHeroDied() {
    const p = this.progress;
    p.lives--; p.form = 'small';
    if (p.lives <= 0) { this.state = 'gameover'; Audio.stop(); Menus.gameOver(this); return; }
    this.beginLevel();
  },
  continueGame() {
    const p = this.progress;
    p.lives = 3; p.coins = 0; p.form = 'small'; p.checkpoint = false;
    if (!p.random) p.levelId = p.levelId[0] + '-1';
    this.beginLevel();
  },
  levelComplete() {
    const p = this.progress;
    p.form = this.world.hero.form; p.checkpoint = false;
    if (p.random) { this.state = 'menu'; Audio.stop(); Menus.randomClear(this); return; }
    const i = levelIndex(p.levelId);
    p.levelId = LEVELS[Math.min(i + 1, LEVELS.length - 1)].id;
    this.beginLevel();
  },
  castleComplete(final) {
    const p = this.progress;
    p.form = this.world.hero.form; p.checkpoint = false;
    if (p.random) { this.state = 'menu'; Audio.stop(); Menus.randomClear(this); return; }
    if (final) {
      this.state = 'menu';
      if (this.slot > 0) Save.remove(this.slot);
      Menus.ending(this);
      return;
    }
    const i = levelIndex(p.levelId);
    p.levelId = LEVELS[i + 1].id;
    this.beginLevel();
  },
  warpTo(worldNo) {
    const p = this.progress;
    p.form = this.world.hero.form; p.checkpoint = false;
    p.levelId = worldNo + '-1';
    Audio.sfx('warp');
    this.beginLevel();
  },

  // ---------------------------------------------------------------- pause & save
  pause() {
    if (this.state !== 'play') return;
    this.state = 'paused';
    Audio.sfx('pause');
    Input.clear();
    Menus.pause(this);
  },
  resume() {
    Menus.hide();
    Input.clear();
    this.state = 'play';
  },
  saveNow() {
    if (!this.slot || !this.world) return;
    if (this.world.state !== 'play') { Menus.toast("Can't save during a cutscene"); return; }
    const r = Save.write(this.slot, 'manual', { progress: { ...this.progress, form: this.world.hero.form }, world: this.world.serialize() });
    Menus.toast(r.ok ? 'Saved' : r.error);
  },
  loadSlot(slot, kind) {
    const r = Save.read(slot, kind);
    if (r.status !== 'ok') {
      // Fall back to the slot's level-start save if the manual one is damaged.
      if (kind === 'manual') { const a = Save.read(slot, 'auto'); if (a.status === 'ok') { Menus.toast('Save damaged — restarting the level instead'); return this.loadSlot(slot, 'auto'); } }
      Menus.toast(r.status === 'damaged' ? 'That save is damaged' : 'Nothing saved there');
      Menus.files(this);
      return;
    }
    this.slot = slot;
    this.progress = { ...this.freshProgress(), ...r.snap.progress };
    if (kind === 'auto' || !r.snap.world) { this.beginLevel(); return; }
    Audio.ensure();
    const spec = this.currentSpec();
    this.level = generateLevel(spec);
    this.world = new World(this, this.level, {});
    try {
      this.world.restore(r.snap.world);
    } catch (e) {
      Menus.toast('Save damaged — restarting the level instead');
      this.beginLevel();
      return;
    }
    Menus.hide();
    Input.clear();
    this.state = 'play';
  },

  // ---------------------------------------------------------------- loop
  tick() {
    Input.sample();
    if (Input.pressed.mute && !Menus.open()) {
      const m = Audio.toggleMute(); this.settings.muted = m; this.saveSettings(); Menus.toast(m ? 'Muted' : 'Sound on');
    }
    if (this.state === 'intro') {
      if (--this.introT <= 0) this.startLevel();
      return;
    }
    if (this.state === 'play' && this.world) {
      if (Input.pressed.pause) { this.pause(); return; }
      this.world.update();
    }
  },
  render() {
    const ctx = this.ctx; const S = this.scale;
    ctx.imageSmoothingEnabled = false;
    if (this.state === 'intro') { Render.intro(ctx, S, this); Render.hud(ctx, S, this); return; }
    if (this.world && (this.state === 'play' || this.state === 'paused' || this.state === 'gameover')) {
      Render.drawWorld(this.world);
      ctx.drawImage(Render.buf, 0, 0, this.canvas.width, this.canvas.height);
      Render.overlayText(ctx, S, this.world);
      Render.hud(ctx, S, this);
      return;
    }
    // Title backdrop: a calm sky.
    ctx.fillStyle = '#6fb7ff'; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = '#c86b2e'; ctx.fillRect(0, 208 * S, this.canvas.width, 32 * S);
    ctx.fillStyle = '#2f8f3a';
    for (let i = 0; i < 40; i++) { const w = 120 * (i / 40); ctx.fillRect((40 + (120 - w) / 2) * S, (168 + i) * S, w * S, S); }
    const hero = Sprites.get('hero:small:stand:normal');
    ctx.drawImage(hero, (VIEW_W - 76) * S, 192 * S, 16 * S, 16 * S);
  },
};

window.addEventListener('load', () => Game.init());
