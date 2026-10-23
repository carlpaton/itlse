// Level runtime: tiles, collisions, spawning, camera, sequences and snapshots.
class World {
  constructor(game, level, opts = {}) {
    this.game = game;
    this.level = level;
    this.settings = game.settings;
    this.areaStates = {};
    this.timeLeft = level.spec.time;
    this.timeFrames = 0;
    this.frame = 0;
    this.hurried = false;
    this.popups = [];
    this.bumps = [];
    this.state = 'play';
    this.returnInfo = null;
    this.loadArea('main', opts.entry || { checkpoint: !!opts.checkpoint });
  }

  // ---------------------------------------------------------------- areas
  areaState(id) {
    if (!this.areaStates[id]) this.areaStates[id] = { tiles: {}, contents: {}, coinsLeft: {}, consumed: [] };
    return this.areaStates[id];
  }
  loadArea(id, entry = {}) {
    const tpl = this.level.areas[id];
    this.areaId = id;
    this.area = tpl;
    this.area.hasHeaven = !!this.level.areas.heaven && id === 'main';
    this.grid = tpl.grid.map((r) => r.slice());
    this.contents = { ...tpl.contents };
    const st = this.areaState(id);
    for (const k in st.tiles) { const i = +k; this.grid[Math.floor(i / tpl.w)][i % tpl.w] = st.tiles[k]; }
    for (const k in st.contents) { if (st.contents[k] === null) delete this.contents[k]; else this.contents[k] = st.contents[k]; }
    this.consumed = new Set(st.consumed);
    this.spawns = tpl.spawns.slice().sort((a, b) => a.col - b.col);
    this.entities = [];
    this.bumps = [];
    this.cannonT = {};
    this.leaperT = 60;
    this.riderRespawn = 0;
    this.bridgeLeft = null;
    const hero = this.hero || new Hero(0, 0);
    if (this.hero) { hero.vx = 0; hero.vy = 0; hero.climbing = false; }
    else hero.setForm(this.game.progress.form || 'small');
    this.hero = hero;
    if (hero.crouch) { hero.crouch = false; hero.h = 28; }
    let col = tpl.start.col; let row = tpl.start.row;
    if (entry.checkpoint && tpl.checkpoint) { col = this.safeCol(tpl.checkpoint); row = this.surfaceRow(col) - 1; }
    if (entry.col !== undefined) {
      col = entry.col; row = entry.row !== undefined ? entry.row : -1;
      if (row < 0) col = this.safeCol(Math.floor(col));
    }
    hero.x = col * TILE + 2;
    if (row < 0) hero.y = -hero.h;
    else hero.y = (row + 1) * TILE - hero.h;
    this.camX = clamp(hero.x - 80, 0, Math.max(0, tpl.w * TILE - VIEW_W));
    if (entry.fromPipe || tpl.start.fromPipe) {
      this.state = 'pipeOut'; this.pipeT = 0;
      this.pipeEndY = hero.y; hero.y += hero.h + 2; hero.vx = 0;
      Audio.sfx('pipe');
    } else if (tpl.start.climb) {
      hero.x = TILE * 2 + 2; hero.y = VIEW_H - 8; hero.climbing = true;
      this.entities.push(Object.assign(new Vine(TILE * 2 + 4 + 8, VIEW_H), { y: 11 * TILE, h: VIEW_H, grow: false }));
      this.state = 'climbIn';
    } else this.state = 'play';
    this.restoreMusic();
    this.spawnAhead(true);
  }
  saveAreaState() {
    const st = this.areaState(this.areaId);
    st.consumed = [...this.consumed];
  }
  safeCol(c) {
    for (let d = 0; d < 20; d++) for (const cc of [c + d, c - d]) {
      const r = this.surfaceRow(cc);
      if (r > 3 && r < ROWS && !this.isSolidTile(this.tile(cc, r - 1)) && !this.isSolidTile(this.tile(cc, r - 2))) return cc;
    }
    return c;
  }
  surfaceRow(c) {
    for (let r = 3; r < ROWS; r++) if (this.isSolidTile(this.tile(c, r)) && !this.isSolidTile(this.tile(c, r - 1))) return r;
    return ROWS;
  }

  // ---------------------------------------------------------------- tiles
  tile(c, r) {
    if (c < 0 || c >= this.area.w) return 'S';
    if (r < 0 || r >= ROWS) return ' ';
    return this.grid[r][c];
  }
  setTile(c, r, ch) {
    this.grid[r][c] = ch;
    this.areaState(this.areaId).tiles[r * this.area.w + c] = ch;
  }
  isSolidTile(ch) { return SOLID.has(ch); }

  // Axis-separated movement against the tile grid.
  moveEntity(e, isHero) {
    e.hitWall = false; e.hitCeil = false;
    const wasGround = e.onGround;
    e.onGround = false;
    // X
    e.x += e.vx;
    if (isHero && e.x < this.camX) { e.x = this.camX; if (e.vx < 0) e.vx = 0; }
    const r0 = Math.floor(e.y / TILE); const r1 = Math.floor((e.y + e.h - 1) / TILE);
    if (e.vx > 0) {
      const c = Math.floor((e.x + e.w) / TILE);
      for (let r = r0; r <= r1; r++) if (this.isSolidTile(this.tile(c, r))) { e.x = c * TILE - e.w; e.hitWall = true; break; }
    } else if (e.vx < 0) {
      const c = Math.floor(e.x / TILE);
      for (let r = r0; r <= r1; r++) if (this.isSolidTile(this.tile(c, r))) { e.x = (c + 1) * TILE; e.hitWall = true; break; }
    }
    if (e.hitWall && isHero) e.vx = 0;
    // Y
    const prevTop = e.y;
    e.y += e.vy;
    const c0 = Math.floor((e.x + 1) / TILE); const c1 = Math.floor((e.x + e.w - 2) / TILE);
    if (e.vy >= 0) {
      const r = Math.floor((e.y + e.h) / TILE);
      for (let c = c0; c <= c1; c++) {
        if (this.isSolidTile(this.tile(c, r)) && (e.y + e.h - e.vy) <= r * TILE + 4) { e.y = r * TILE - e.h; e.vy = 0; e.onGround = true; break; }
      }
    } else {
      const r = Math.floor(e.y / TILE);
      for (let c = c0; c <= c1; c++) {
        const t = this.tile(c, r);
        const hiddenHit = isHero && t === 'H' && prevTop >= (r + 1) * TILE - 1;
        if (this.isSolidTile(t) || hiddenHit) { e.y = (r + 1) * TILE; e.vy = 0; e.hitCeil = true; break; }
      }
    }
    // Moving platforms (one-way, from above)
    if (isHero && !e.onGround && e.vy >= 0) {
      for (const p of this.entities) {
        if (!(p instanceof Platform) || p.dead) continue;
        const feet = e.y + e.h;
        if (e.x + e.w > p.x && e.x < p.x + p.w && feet >= p.y && feet - e.vy - p.dy <= p.y + 3) {
          e.y = p.y - e.h; e.vy = 0; e.onGround = true; e.platform = p;
          if (p.mode === 'falling') p.drop = true;
          break;
        }
      }
    }
    void wasGround;
  }
  canStand(hero) {
    const c0 = Math.floor((hero.x + 1) / TILE); const c1 = Math.floor((hero.x + hero.w - 2) / TILE);
    const r = Math.floor((hero.y - 10) / TILE);
    for (let c = c0; c <= c1; c++) if (this.isSolidTile(this.tile(c, r))) return false;
    return true;
  }
  ledgeAhead(e) {
    const c = Math.floor((e.vx > 0 ? e.x + e.w + 1 : e.x - 1) / TILE);
    const r = Math.floor((e.y + e.h + 2) / TILE);
    return !this.isSolidTile(this.tile(c, r));
  }
  solidBelow(e) { return this.isSolidTile(this.tile(Math.floor(e.cx / TILE), Math.floor((e.y + e.h + 1) / TILE))); }
  vineAt(hero) {
    for (const v of this.entities) {
      if (v instanceof Vine && hero.x + hero.w > v.x - 8 && hero.x < v.x + v.w + 8 && hero.y + hero.h > v.y && hero.y < v.y + v.h) return v;
    }
    return null;
  }

  headBump(hero) {
    const r = Math.floor((hero.y - 1) / TILE);
    const ca = Math.floor(hero.cx / TILE);
    let c = ca;
    const t = this.tile(ca, r);
    if (!this.isSolidTile(t) && t !== 'H') {
      const cl = Math.floor((hero.x + 1) / TILE); const cr = Math.floor((hero.x + hero.w - 2) / TILE);
      c = this.isSolidTile(this.tile(cl, r)) || this.tile(cl, r) === 'H' ? cl : cr;
    }
    this.bumpTile(c, r, hero);
  }
  bumpTile(c, r, hero) {
    const ch = this.tile(c, r);
    const idx = r * this.area.w + c;
    const content = this.contents[idx];
    const setContent = (v) => { if (v === null) delete this.contents[idx]; else this.contents[idx] = v; this.areaState(this.areaId).contents[idx] = v; };
    if (ch === '?' || ch === 'H' || (ch === 'B' && content)) {
      const kind = content || 'coin';
      if (kind === 'coins10') {
        const st = this.areaState(this.areaId);
        const left = (st.coinsLeft[idx] === undefined ? 10 : st.coinsLeft[idx]) - 1;
        st.coinsLeft[idx] = left;
        this.spawnContent('coin', c, r);
        if (left <= 0) { this.setTile(c, r, 'U'); setContent(null); }
      } else {
        this.spawnContent(kind, c, r);
        this.setTile(c, r, 'U');
        setContent(null);
      }
      this.bumps.push({ c, r, t: 0 });
    } else if (ch === 'B') {
      if (hero.big) {
        this.setTile(c, r, ' ');
        const x = c * TILE; const y = r * TILE;
        this.add(new Debris(x, y, -1, -5)); this.add(new Debris(x + 8, y, 1, -5));
        this.add(new Debris(x, y + 8, -1, -3)); this.add(new Debris(x + 8, y + 8, 1, -3));
        this.addScore(50);
        Audio.sfx('break');
      } else { this.bumps.push({ c, r, t: 0 }); Audio.sfx('bump'); }
    } else { Audio.sfx('bump'); }
    // Knock out anything standing on the bumped block; collect coins on top.
    if (this.tile(c, r - 1) === 'C') { this.setTile(c, r - 1, ' '); this.spawnContent('coin', c, r - 1); }
    const box = { x: c * TILE, y: r * TILE - 6, w: TILE, h: 6 };
    for (const e of this.entities) {
      if (e.dead) continue;
      if (e instanceof Enemy && !e.falling && overlap(box, e) && e.stompable !== undefined && !(e instanceof Plant) && !(e instanceof Firebar)) {
        e.knockOff(e.cx < box.x + 8 ? -1 : 1); this.addScore(100, e);
      }
      if (e instanceof Item && overlap(box, e)) { e.vy = -3.5; e.vx = e.cx < box.x + 8 ? -1 : 1; }
    }
  }
  spawnContent(kind, c, r) {
    const x = c * TILE; const y = r * TILE;
    if (kind === 'coin') { this.add(new CoinPop(x + 2, y - 10)); this.addCoin(false); Audio.sfx('coin'); return; }
    if (kind === 'vine') { this.add(new Vine(x + 4, y)); Audio.sfx('vine'); return; }
    let k = kind;
    if (kind === 'power') k = this.hero.big ? 'bloom' : 'growth';
    this.add(new Item(x + 1, y + 2, k));
    Audio.sfx('appear');
  }

  // ---------------------------------------------------------------- entities
  add(e) { this.entities.push(e); return e; }
  countType(name) { let n = 0; for (const e of this.entities) if (!e.dead && e.type === name) n++; return n; }
  onScreen(e) { return e.x + e.w > this.camX - 8 && e.x < this.camX + VIEW_W + 8; }
  spawnAhead(initial) {
    const limit = this.camX + VIEW_W + 32;
    for (const s of this.spawns) {
      if (s.col * TILE > limit) break;
      if (this.consumed.has(s.id)) continue;
      if (!initial && s.col * TILE < this.camX - 32 && s.type !== 'rider') { this.consumed.add(s.id); continue; }
      this.consumed.add(s.id);
      const e = spawnEntity(s);
      if (e) this.add(e);
    }
  }
  riderGone() { this.riderRespawn = 600; }

  addScore(n, at) {
    this.game.progress.score += n;
    if (at) this.popup(at.x, at.y - 8, String(n));
  }
  addCoin(withScore = true) {
    const p = this.game.progress;
    p.coins++;
    p.score += 200;
    if (p.coins >= 100) { p.coins -= 100; this.oneUp(this.hero); }
    void withScore;
  }
  oneUp(at) { this.game.progress.lives++; Audio.sfx('oneup'); if (at) this.popup(at.x, at.y - 10, '1UP'); }
  popup(x, y, text) { this.popups.push({ x, y, text, t: 0 }); }
  restoreMusic() {
    const th = this.area.theme;
    if (this.hero && this.hero.star > 0) { Audio.play('star'); return; }
    Audio.play(th === 'underground' ? 'underground' : th === 'underwater' ? 'underwater' : th === 'castle' ? 'castle' : 'overworld');
  }

  // ---------------------------------------------------------------- update
  update() {
    this.frame++;
    this.bumps = this.bumps.filter((b) => ++b.t < 10);
    this.popups = this.popups.filter((p) => { p.t++; p.y -= 0.6; return p.t < 45; });
    switch (this.state) {
      case 'play': this.updatePlay(); break;
      case 'dying': this.updateDying(); break;
      case 'pipeIn': this.updatePipeIn(); break;
      case 'pipeOut': this.updatePipeOut(); break;
      case 'climbIn': this.updateClimbIn(); break;
      case 'flag': this.updateFlag(); break;
      case 'axe': this.updateAxe(); break;
      default: break;
    }
  }
  updatePlay() {
    const hero = this.hero;
    // Timer: one unit every 24 frames (about 0.4 s).
    if (!this.level.spec.noTimer && ++this.timeFrames >= 24) {
      this.timeFrames = 0;
      this.timeLeft--;
      if (this.timeLeft === 100 && !this.hurried) { this.hurried = true; Audio.sfx('hurry'); Audio.setFast(true); }
      if (this.timeLeft <= 0) { this.timeLeft = 0; this.killHero(); return; }
    }
    // Ride platforms
    if (hero.platform && !hero.platform.dead && hero.onGround) {
      hero.x += hero.platform.dx; hero.y += hero.platform.dy;
    }
    hero.platform = null;
    const prevCx = hero.cx;
    hero.update(this);
    // Camera: follow right only.
    const maxCam = Math.max(0, this.area.w * TILE - VIEW_W);
    if (hero.x - this.camX > camLead()) this.camX = Math.min(maxCam, hero.x - camLead());
    if (this.area.end && this.area.end.kind === 'axe') this.camX = Math.max(0, Math.min(this.camX, Math.min(maxCam, (this.area.end.col + 12) * TILE - VIEW_W)));
    this.spawnAhead(false);
    // Entities
    for (const e of this.entities) if (!e.dead) e.update(this);
    this.interactions();
    this.tileInteractions(prevCx);
    this.specials();
    // Despawn
    for (const e of this.entities) {
      if (!(e instanceof Hero) && e.x + e.w < this.camX - 96 && !(e instanceof Vine) && !(e instanceof Rider)) e.dead = true;
    }
    this.entities = this.entities.filter((e) => !e.dead);
    // Falling out of the world
    if (hero.y > VIEW_H + 8) {
      if (this.area.heaven) { this.returnToMain(); return; }
      this.killHero();
    }
  }
  interactions() {
    const hero = this.hero;
    for (const e of this.entities) {
      if (e.dead || e === hero) continue;
      // Hero fireballs
      if (e instanceof Fireball) {
        for (const t of this.entities) {
          if (t.dead || !(t instanceof Enemy) || t.falling || t instanceof Firebar) continue;
          if (t instanceof Plant && t.offset > 18) continue;
          if (overlap(e, t)) {
            e.dead = true;
            if (!t.fireproof) t.hitByFire(this); else Audio.sfx('bump');
            break;
          }
        }
        continue;
      }
      // Sliding shells knock out other enemies
      if (e instanceof Snail && e.state === 'shell' && e.vx !== 0 && !e.falling) {
        for (const t of this.entities) {
          if (t === e || t.dead || !(t instanceof Enemy) || t.falling || t instanceof Firebar || t instanceof Bubble || t instanceof BossFire || t instanceof Boss) continue;
          if (overlap(e, t)) { t.knockOff(sign(e.vx)); e.chain = (e.chain || 0) + 1; this.addScore(STOMP_SCORES[Math.min(e.chain - 1, 9)], t); Audio.sfx('kick'); }
        }
      }
      if (e instanceof Item && overlap(hero, e) && e.emerge <= 0) { this.collectItem(e); continue; }
      if (!(e instanceof Enemy) || e.falling) continue;
      if (!overlap(hero, e)) continue;
      if (hero.star > 0 && !(e instanceof Firebar) && !(e instanceof Bubble) && !(e instanceof BossFire)) {
        if (e instanceof Boss) continue;
        e.knockOff(sign(e.cx - hero.cx) || 1); this.addScore(200, e); Audio.sfx('kick'); continue;
      }
      if (e instanceof Snail && e.state === 'shell' && e.vx === 0 && !e.wings) {
        if (hero.vy > 0.5 && hero.bottom - e.y < 10) { e.stomp(this); hero.vy = -PHYS.stompBounce; }
        else e.kick(this, hero.cx < e.cx ? 1 : -1);
        continue;
      }
      const stompable = e.stompable && !(e.type === 'Fish' && this.area.water);
      if (stompable && hero.vy > 0 && hero.bottom - e.y < 12) {
        e.stomp(this);
        hero.vy = -(Input.now.jump ? PHYS.stompBounceHeld : PHYS.stompBounce);
        hero.jumping = Input.now.jump;
        hero.chain++;
        if (hero.chain > STOMP_SCORES.length) this.oneUp(e);
        else this.addScore(STOMP_SCORES[hero.chain - 1], e);
        continue;
      }
      if (e.harmful) hero.hurt(this);
    }
  }
  collectItem(it) {
    const h = this.hero;
    it.dead = true;
    if (it.kind === 'oneup') { this.oneUp(it); return; }
    this.addScore(1000, it);
    if (it.kind === 'growth') { if (!h.big) h.setForm('big'); Audio.sfx('powerup'); }
    else if (it.kind === 'bloom') { h.setForm(h.big ? 'fire' : 'big'); Audio.sfx('powerup'); }
    else if (it.kind === 'star') { h.star = 600; Audio.play('star'); Audio.sfx('powerup'); }
  }
  tileInteractions(prevCx) {
    const h = this.hero;
    // Coins
    const c0 = Math.floor(h.x / TILE); const c1 = Math.floor((h.x + h.w - 1) / TILE);
    const r0 = Math.floor(h.y / TILE); const r1 = Math.floor((h.y + h.h - 1) / TILE);
    for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) {
      const t = this.tile(c, r);
      if (t === 'C') { this.setTile(c, r, ' '); this.addCoin(); Audio.sfx('coin'); }
      if (t === 'L' && h.y + h.h > r * TILE + 6) { this.killHero(); return; }
    }
    if (this.area.end && this.area.end.kind === 'axe' && h.x + h.w >= this.area.end.col * TILE - 1) { this.startAxe(); return; }
    // Checkpoint
    if (this.areaId === 'main' && this.area.checkpoint && h.cx > this.area.checkpoint * TILE) this.game.progress.checkpoint = true;
    // Maze loops
    for (const lp of this.area.loops || []) {
      const lx = lp.col * TILE;
      if (prevCx < lx && h.cx >= lx) {
        const onUpper = h.y + h.h <= lp.upperRow * TILE + 2;
        const ok = lp.correct === 'upper' ? onUpper : !onUpper;
        if (!ok) this.mazeLoop(lp);
      }
    }
    // Flagpole
    const end = this.area.end;
    if (end && end.kind === 'flag' && h.x + h.w >= end.col * TILE + 6) this.startFlag();
    // Pipes
    for (const p of this.area.pipes) {
      if (p.dir === 'down' && Input.now.down && h.onGround) {
        const px = p.col * TILE + TILE;
        if (Math.abs(h.cx - px) <= 6 && Math.abs(h.y + h.h - p.row * TILE) < 2) { this.startPipe(p); return; }
      }
      if (p.dir === 'right' && Input.now.right && (h.onGround || this.area.water)) {
        if (h.x + h.w >= p.col * TILE - 1 && h.x + h.w <= p.col * TILE + 2 && Math.abs(h.y + h.h - (p.row + 2) * TILE) < 2) { this.startPipe(p); return; }
      }
    }
  }
  specials() {
    const h = this.hero;
    // Cannons on screen fire bullets
    const cs = Math.floor(this.camX / TILE); const ce = cs + viewCols();
    for (let c = cs; c <= ce; c++) for (let r = 0; r < ROWS; r++) {
      if (this.tile(c, r) !== 'N') continue;
      const key = r * this.area.w + c;
      if (this.cannonT[key] === undefined) this.cannonT[key] = 60 + ((c * 37) % 90);
      if (--this.cannonT[key] <= 0) {
        this.cannonT[key] = 140 + Math.floor(Math.random() * 120);
        const cx = c * TILE + 8;
        if (Math.abs(h.cx - cx) > 40 && this.countType('Bullet') < 3) {
          const dir = h.cx < cx ? -1 : 1;
          this.add(new Bullet(dir < 0 ? c * TILE - 16 : c * TILE + 16, r * TILE + 4, dir));
          Audio.sfx('bump');
        }
      }
    }
    // Leaping fish on bridge levels
    const z = this.area.leaperZone;
    if (z && h.cx > z[0] * TILE && h.cx < z[1] * TILE && --this.leaperT <= 0) {
      this.leaperT = 45 + Math.floor(Math.random() * 50);
      const f = new Fish(this.camX + 24 + Math.random() * 200, VIEW_H + 8);
      f.leaper = true; f.vy = -(5.2 + Math.random() * 1.2); f.vx = (Math.random() < 0.75 ? 1 : -1) * (0.6 + Math.random() * 0.9);
      this.add(f);
    }
    // Cloud rider comes back after a while
    if (this.riderRespawn > 0 && --this.riderRespawn === 0 && this.level.spec.rider && this.countType('Rider') === 0) {
      const sp = this.area.spawns.find((s) => s.type === 'rider');
      if (sp && h.x < sp.leaveCol * TILE - 200) { const r = new Rider(this.camX - 16, 30); r.leaveCol = sp.leaveCol; this.add(r); }
    }
  }
  mazeLoop(lp) {
    const h = this.hero;
    Audio.sfx('warp');
    h.x = lp.backCol * TILE; h.vx = 0;
    h.y = (this.surfaceRow(lp.backCol)) * TILE - h.h;
    this.camX = clamp(h.x - 80, 0, Math.max(0, this.area.w * TILE - VIEW_W));
    this.entities = this.entities.filter((e) => e === h);
    this.consumed = new Set([...this.consumed].filter((id) => {
      const s = this.area.spawns.find((q) => q.id === id);
      return s && s.col < lp.backCol;
    }));
    this.spawnAhead(true);
  }

  // ---------------------------------------------------------------- death
  killHero() {
    if (this.state === 'dying') return;
    this.state = 'dying';
    this.dyingT = 0;
    this.hero.dyingT = 1;
    this.hero.vx = 0; this.hero.vy = 0;
    Audio.stop(); Audio.setFast(false);
    Audio.sfx('die');
  }
  updateDying() {
    const h = this.hero;
    this.dyingT++;
    if (this.dyingT === 30) h.vy = -4.5;
    if (this.dyingT > 30) { h.vy += 0.2; h.y += h.vy; }
    if (this.dyingT > 200) this.game.onHeroDied();
  }

  // ---------------------------------------------------------------- pipes & areas
  startPipe(p) {
    this.state = 'pipeIn'; this.pipeT = 0; this.pipe = p;
    const h = this.hero;
    h.vx = 0; h.vy = 0; h.pose = p.dir === 'down' ? (h.big ? 'crouch' : 'stand') : 'walk1';
    if (p.dir === 'down') h.x = p.col * TILE + TILE - h.w / 2;
    Audio.sfx('pipe');
  }
  updatePipeIn() {
    const h = this.hero; const p = this.pipe;
    this.pipeT++;
    if (p.dir === 'down') h.y += 0.6; else { h.x += 0.5; h.anim += 0.15; h.pose = ['walk1', 'walk2', 'walk3'][Math.floor(h.anim) % 3]; }
    if (this.pipeT < 50) return;
    if (p.warp) { this.game.warpTo(p.warp); return; }
    this.saveAreaState();
    if (p.to === 'main') { this.returnToMain(); return; }
    if (p.exitCol !== undefined) this.returnInfo = { col: p.exitCol, fromPipe: p.exitPipe, row: p.exitRow };
    this.loadArea(p.to, {});
  }
  updatePipeOut() {
    const h = this.hero;
    h.y -= 0.6; h.pose = 'stand';
    if (h.y <= this.pipeEndY) { h.y = this.pipeEndY; this.state = 'play'; }
  }
  updateClimbIn() {
    const h = this.hero;
    h.y -= 1; h.anim += 0.1; h.pose = Math.floor(h.anim) % 2 ? 'walk1' : 'walk2';
    for (const e of this.entities) e.update(this);
    if (h.y + h.h <= 11 * TILE - 2) { h.climbing = false; h.y = 11 * TILE - h.h; h.x = TILE * 3; this.state = 'play'; }
  }
  enterHeaven() {
    this.saveAreaState();
    this.returnInfo = { col: this.area.heavenReturn || this.level.areas.main.heavenReturn, fromPipe: false };
    this.loadArea('heaven', {});
  }
  returnToMain() {
    this.saveAreaState();
    const ri = this.returnInfo || { col: 10 };
    this.returnInfo = null;
    if (ri.fromPipe && ri.row !== null && ri.row !== undefined) {
      this.loadArea('main', { col: ri.col + 0.4, row: ri.row - 1, fromPipe: true });
    } else {
      this.loadArea('main', { col: ri.col, row: -1 });
    }
  }

  // ---------------------------------------------------------------- level end
  startFlag() {
    const h = this.hero; const end = this.area.end;
    this.state = 'flag'; this.flagStage = 0; this.flagT = 0;
    h.vx = 0; h.vy = 0; h.climbing = false;
    h.x = end.col * TILE + 8 - h.w;
    const topY = end.top * TILE;
    const rel = h.y - topY;
    const pts = rel < 16 ? 5000 : rel < 40 ? 2000 : rel < 72 ? 800 : rel < 104 ? 400 : 100;
    this.addScore(pts, h);
    this.flagY = topY + 8;
    Audio.stop(); Audio.setFast(false);
    Audio.sfx('flag');
  }
  updateFlag() {
    const h = this.hero; const end = this.area.end;
    this.flagT++;
    if (this.flagStage === 0) {
      const baseY = end.base * TILE;
      if (h.y + h.h < baseY) h.y = Math.min(baseY - h.h, h.y + 2);
      if (this.flagY < baseY - 16) this.flagY += 2;
      h.pose = 'walk2';
      if (h.y + h.h >= baseY && this.flagY >= baseY - 16) { this.flagStage = 1; this.flagT = 0; h.x += h.w; h.facing = -1; }
    } else if (this.flagStage === 1) {
      if (this.flagT > 20) { this.flagStage = 2; this.flagT = 0; h.facing = 1; Audio.sfx('clear'); }
    } else if (this.flagStage === 2) {
      h.vx = 1; h.vy = Math.min(h.vy + 0.3, 4);
      this.moveEntity(h, true);
      h.anim += 0.12; h.pose = h.onGround ? ['walk1', 'walk2', 'walk3'][Math.floor(h.anim) % 3] : 'jump';
      const castle = this.area.deco.find((d) => d.kind === 'castle');
      const doorX = castle ? (castle.col + 2) * TILE : (end.col + 6) * TILE;
      if (h.x > doorX || (h.hitWall && this.flagT > 30)) { h.hidden = true; this.flagStage = 3; this.flagT = 0; }
    } else if (this.flagStage === 3) {
      if (this.timeLeft > 0) {
        const step = Math.min(this.timeLeft, 2);
        this.timeLeft -= step; this.game.progress.score += 50 * step;
        if (this.flagT % 2 === 0) Audio.sfx('tally');
      } else if (this.flagT > 60) { this.flagStage = 4; this.flagT = 0; }
    } else if (this.flagStage === 4) {
      if (this.flagT > 70) this.game.levelComplete();
    }
  }
  startAxe() {
    this.state = 'axe'; this.axeT = 0; this.axeStage = 0;
    const h = this.hero; h.vx = 0; h.vy = 0;
    Audio.stop(); Audio.setFast(false);
    const end = this.area.end;
    h.x = end.col * TILE + 2; h.y = (end.row + 1) * TILE - h.h; h.pose = 'stand';
    this.bridgeLeft = end.bridge[1];
    this.setTile(end.col, end.row, ' ');
    this.entities = this.entities.filter((e) => e instanceof Boss || e instanceof Captive || e instanceof Platform || e instanceof Firebar || e instanceof Bubble);
  }
  updateAxe() {
    const end = this.area.end; const h = this.hero;
    this.axeT++;
    const boss = this.entities.find((e) => e instanceof Boss);
    if (this.axeStage === 0) {
      if (this.axeT % 4 === 0 && this.bridgeLeft >= end.bridge[0]) {
        this.setTile(this.bridgeLeft, end.bridgeRow, ' ');
        this.bridgeLeft--;
        Audio.sfx('bridge');
      }
      if (boss && !boss.falling && !boss.dropping && this.bridgeLeft < Math.floor(boss.cx / TILE)) { boss.dropping = true; boss.vy = 0; }
      if (boss) boss.update(this);
      if (this.bridgeLeft < end.bridge[0] && (!boss || boss.y > VIEW_H)) { this.axeStage = 1; this.axeT = 0; this.entities = this.entities.filter((e) => !(e instanceof Boss)); Audio.sfx('clear'); }
    } else if (this.axeStage === 1) {
      const cap = this.entities.find((e) => e instanceof Captive);
      const stopX = cap ? cap.x - 22 : h.x;
      h.vy = Math.min(h.vy + 0.3, 4);
      h.vx = h.x < stopX ? 1 : 0;
      this.moveEntity(h, true);
      const maxCam = Math.max(0, this.area.w * TILE - VIEW_W);
      if (h.x - this.camX > camLead()) this.camX = Math.min(maxCam, h.x - camLead());
      h.anim += 0.12; h.pose = h.vx ? ['walk1', 'walk2', 'walk3'][Math.floor(h.anim) % 3] : 'stand';
      if (h.vx === 0 && this.axeT > 30) { this.axeStage = 2; this.axeT = 0; this.captiveMsg = cap && cap.final ? 'final' : 'more'; }
    } else if (this.axeStage === 2) {
      if (this.timeLeft > 0) {
        const step = Math.min(this.timeLeft, 2);
        this.timeLeft -= step; this.game.progress.score += 50 * step;
        if (this.axeT % 2 === 0) Audio.sfx('tally');
      } else if (this.axeT > 240) {
        this.axeStage = 3;
        this.game.castleComplete(this.captiveMsg === 'final');
      }
    }
  }

  // ---------------------------------------------------------------- snapshots
  serialize() {
    this.saveAreaState();
    return {
      areaId: this.areaId,
      areaStates: JSON.parse(JSON.stringify(this.areaStates)),
      hero: this.hero.serialize(),
      entities: this.entities.filter((e) => !(e instanceof Hero)).map((e) => e.serialize()),
      camX: this.camX, timeLeft: this.timeLeft, timeFrames: this.timeFrames, hurried: this.hurried,
      returnInfo: this.returnInfo, riderRespawn: this.riderRespawn,
    };
  }
  restore(s) {
    this.areaStates = s.areaStates || {};
    this.hero = deserializeEntity(s.hero);
    this.hero.platform = null;
    this.loadArea(s.areaId, {});
    Object.assign(this.hero, s.hero);
    this.hero.platform = null;
    this.state = 'play';
    this.entities = [];
    for (const o of s.entities) { const e = deserializeEntity(o); if (e) this.entities.push(e); }
    this.camX = s.camX; this.timeLeft = s.timeLeft; this.timeFrames = s.timeFrames || 0; this.hurried = !!s.hurried;
    this.returnInfo = s.returnInfo || null; this.riderRespawn = s.riderRespawn || 0;
    Audio.setFast(this.hurried);
    this.restoreMusic();
  }
}
