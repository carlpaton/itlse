// Drawing: tiles and sprites to a 256x240 buffer, then scaled up; HUD and text at display scale.
const THEMES = {
  overworld: { sky: '#6fb7ff', ground: ['#c86b2e', '#8a3f17', '#f0a060'], brick: ['#b5562a', '#3b1c0e'], stair: ['#b8652e', '#6a3214', '#e89a5a'], pipe: ['#3fbf5a', '#1f7a35', '#9be89f'], deco: '#3fa34d', cloud: '#ffffff' },
  night: { sky: '#05050c', ground: ['#c86b2e', '#8a3f17', '#f0a060'], brick: ['#b5562a', '#3b1c0e'], stair: ['#b8652e', '#6a3214', '#e89a5a'], pipe: ['#3fbf5a', '#1f7a35', '#9be89f'], deco: '#2a6a35', cloud: '#8a8aa0' },
  underground: { sky: '#000000', ground: ['#2f6fb0', '#16365e', '#6aa8e8'], brick: ['#2f6fb0', '#0f2440'], stair: ['#4a7aa0', '#1f3a52', '#8ab8d8'], pipe: ['#3fbf5a', '#1f7a35', '#9be89f'], deco: '#16365e', cloud: '#333' },
  underwater: { sky: '#1e3fa0', ground: ['#4fc07a', '#1f7a45', '#a8f0c0'], brick: ['#4fc07a', '#1f7a45'], stair: ['#4fc07a', '#1f7a45', '#a8f0c0'], pipe: ['#3fbf5a', '#1f7a35', '#9be89f'], deco: '#16307a', cloud: '#3a5ac0' },
  castle: { sky: '#000000', ground: ['#8a8a9a', '#4a4a5a', '#c8c8d8'], brick: ['#8a8a9a', '#3a3a48'], stair: ['#8a8a9a', '#4a4a5a', '#c8c8d8'], pipe: ['#3fbf5a', '#1f7a35', '#9be89f'], deco: '#222', cloud: '#222' },
};
THEMES.athletic = THEMES.overworld;
THEMES.bridge = THEMES.overworld;

const Render = {
  buf: null, g: null, tileCache: {},
  init() {
    this.buf = document.createElement('canvas');
    this.buf.width = VIEW_W; this.buf.height = VIEW_H;
    this.g = this.buf.getContext('2d');
    this.g.imageSmoothingEnabled = false;
  },
  resize() {
    if (this.buf.width !== VIEW_W) { this.buf.width = VIEW_W; this.g.imageSmoothingEnabled = false; }
  },
  themeOf(area) {
    let name = area.theme;
    if ((name === 'athletic' || name === 'bridge') && area.night) name = 'night';
    return { name, t: THEMES[name] || THEMES.overworld, grey: !!area.grey };
  },
  tileCanvas(ch, themeName, frame) {
    const key = ch + themeName + (ch === '?' ? frame : '') + (ch === 'L' || ch === '~' ? frame : '');
    if (this.tileCache[key]) return this.tileCache[key];
    const t = THEMES[themeName] || THEMES.overworld;
    const c = document.createElement('canvas'); c.width = 16; c.height = 16;
    const g = c.getContext('2d');
    const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    switch (ch) {
      case '#':
        if (themeName === 'underwater') { R(0, 0, 16, 16, t.ground[0]); R(0, 0, 16, 3, t.ground[2]); for (let i = 0; i < 4; i++) R(i * 4 + 1, 5 + (i % 2) * 4, 2, 3, t.ground[1]); break; }
        R(0, 0, 16, 16, t.ground[0]); R(0, 0, 16, 1, t.ground[2]); R(0, 0, 1, 16, t.ground[2]);
        R(15, 0, 1, 16, t.ground[1]); R(0, 15, 16, 1, t.ground[1]); R(7, 1, 1, 7, t.ground[1]); R(1, 8, 14, 1, t.ground[1]); R(11, 9, 1, 6, t.ground[1]);
        break;
      case 'B':
        R(0, 0, 16, 16, t.brick[0]);
        R(0, 0, 16, 1, t.brick[1]); R(0, 7, 16, 1, t.brick[1]); R(0, 15, 16, 1, t.brick[1]);
        R(7, 0, 1, 7, t.brick[1]); R(3, 8, 1, 7, t.brick[1]); R(11, 8, 1, 7, t.brick[1]);
        break;
      case '?': {
        const shades = ['#f5b82e', '#e09a18', '#c47f12'];
        R(0, 0, 16, 16, '#3b1c0e'); R(1, 1, 14, 14, shades[frame % 3]);
        R(1, 1, 14, 1, '#ffe08a'); R(1, 1, 1, 14, '#ffe08a');
        // Gem symbol (original), not a question mark.
        R(7, 3, 2, 1, '#3b1c0e'); R(6, 4, 4, 1, '#3b1c0e'); R(5, 5, 6, 4, '#3b1c0e'); R(6, 9, 4, 1, '#3b1c0e'); R(7, 10, 2, 2, '#3b1c0e');
        R(6, 5, 2, 2, '#fff6d0');
        R(2, 2, 1, 1, '#3b1c0e'); R(13, 2, 1, 1, '#3b1c0e'); R(2, 13, 1, 1, '#3b1c0e'); R(13, 13, 1, 1, '#3b1c0e');
        break;
      }
      case 'U':
        R(0, 0, 16, 16, '#3b1c0e'); R(1, 1, 14, 14, themeName === 'castle' ? '#6a6a7a' : '#8a5a3a');
        R(2, 2, 1, 1, '#3b1c0e'); R(13, 2, 1, 1, '#3b1c0e'); R(2, 13, 1, 1, '#3b1c0e'); R(13, 13, 1, 1, '#3b1c0e');
        break;
      case 'S': case 'G':
        R(0, 0, 16, 16, t.stair[0]); R(0, 0, 16, 2, t.stair[2]); R(0, 0, 2, 16, t.stair[2]);
        R(14, 0, 2, 16, t.stair[1]); R(0, 14, 16, 2, t.stair[1]);
        if (ch === 'G') { R(0, 7, 16, 1, t.stair[1]); R(7, 0, 1, 7, t.stair[1]); }
        break;
      case '[': case ']': case '{': case '}': {
        const [m, d, l] = t.pipe;
        const top = ch === '[' || ch === ']';
        const left = ch === '[' || ch === '{';
        if (top) {
          R(0, 0, 16, 16, '#0d2a12'); R(left ? 1 : 0, 1, 15, 14, m);
          if (left) { R(3, 1, 3, 14, l); R(1, 1, 1, 14, d); } else { R(10, 1, 4, 14, d); R(15, 0, 1, 16, '#0d2a12'); }
        } else {
          R(left ? 2 : 0, 0, 14, 16, m); R(left ? 2 : 14, 0, 1, 16, '#0d2a12');
          if (left) { R(5, 0, 3, 16, l); R(3, 0, 1, 16, d); } else { R(8, 0, 4, 16, d); R(13, 0, 1, 16, '#0d2a12'); }
        }
        break;
      }
      case '<': case ',': case '-': case '_': {
        const [m, d, l] = t.pipe;
        const mouth = ch === '<' || ch === ',';
        const upper = ch === '<' || ch === '-';
        if (mouth) { R(0, 0, 16, 16, '#0d2a12'); R(1, upper ? 1 : 0, 15, upper ? 15 : 15, m); R(1, upper ? 3 : 0, 15, 3, l); R(1, upper ? 12 : 10, 15, 3, d); }
        else { R(0, upper ? 2 : 0, 16, upper ? 14 : 14, m); R(0, upper ? 2 : 13, 16, 1, '#0d2a12'); R(0, upper ? 5 : 0, 16, 3, l); }
        break;
      }
      case 'T':
        R(0, 0, 16, 16, '#3fbf5a'); R(0, 0, 16, 2, '#9be89f'); R(0, 12, 16, 4, '#1f7a35');
        R(3, 5, 2, 2, '#1f7a35'); R(10, 7, 2, 2, '#1f7a35');
        break;
      case 't': R(3, 0, 10, 16, '#a0682a'); R(5, 0, 1, 16, '#6a3a14'); R(10, 0, 1, 16, '#6a3a14'); break;
      case '=':
        R(0, 2, 16, 2, '#6a3a14'); R(0, 6, 16, 6, '#c86b2e'); R(0, 6, 16, 1, '#f0a060'); R(0, 11, 16, 1, '#6a3a14');
        R(3, 3, 1, 3, '#6a3a14'); R(11, 3, 1, 3, '#6a3a14');
        break;
      case 'c':
        R(0, 4, 16, 10, '#ffffff'); R(2, 2, 12, 2, '#ffffff'); R(0, 13, 16, 2, '#c8d8f0'); R(4, 6, 2, 3, '#1a1a24'); R(10, 6, 2, 3, '#1a1a24');
        break;
      case 'N': R(1, 0, 14, 16, '#2a2a33'); R(3, 3, 10, 8, '#1a1a24'); R(5, 5, 6, 4, '#d8d8e8'); R(1, 0, 14, 2, '#5a5a6a'); break;
      case 'n': R(3, 0, 10, 16, '#2a2a33'); R(5, 0, 2, 16, '#5a5a6a'); break;
      case 'L': {
        const o = frame % 4;
        R(0, 0, 16, 16, '#ff6b2e'); R(0, 0, 16, 3, '#ffd23f');
        for (let i = 0; i < 4; i++) R(((i * 4 + o) % 16), 1, 2, 2, '#ff9a2e');
        break;
      }
      case '~': R(0, 4, 16, 12, '#2b6fd9'); R(((frame * 2) % 16), 4, 6, 2, '#9ad8ff'); break;
      case 'X':
        R(7, 4, 2, 12, '#6a3a14'); R(2, 1, 8, 7, '#d8d8e8'); R(2, 1, 8, 1, '#ffffff'); R(1, 2, 1, 5, '#9a9aa8'); R(9, 3, 2, 3, '#d8d8e8');
        break;
      case '|': R(7, 0, 2, 16, '#3fbf5a'); R(7, 0, 1, 16, '#9be89f'); break;
      case 'o': R(4, 4, 8, 8, '#1f7a35'); R(5, 5, 6, 6, '#3fbf5a'); R(6, 6, 2, 2, '#9be89f'); R(7, 12, 2, 4, '#3fbf5a'); break;
      case 'C': {
        const s = Sprites.get('coin1');
        g.drawImage(s, 2, 3);
        break;
      }
      default: break;
    }
    this.tileCache[key] = c;
    return c;
  },
  spriteFacesRight: { Hero: true, Snail: true, Thrower: false, Fish: false, Bullet: false, Boss: false, Rider: true, BossFire: false },
  drawSprite(g, e, name, variant, camX) {
    const s = Sprites.get(name, variant);
    if (!s) return;
    const x = Math.round(e.cx - s.width / 2 - camX);
    const y = Math.round(e.y + e.h - s.height);
    const faceRight = this.spriteFacesRight[e.type];
    const flip = faceRight === undefined ? false : (faceRight ? e.facing < 0 : e.facing > 0);
    const upside = e.falling && !(e instanceof Bullet);
    if (!flip && !upside) { g.drawImage(s, x, y); return; }
    g.save();
    g.translate(x + (flip ? s.width : 0), y + (upside ? s.height : 0));
    g.scale(flip ? -1 : 1, upside ? -1 : 1);
    g.drawImage(s, 0, 0);
    g.restore();
  },
  drawEntity(g, e, world) {
    const camX = world.camX;
    if (e instanceof Hero) {
      if (e.hidden) return;
      if (e.invuln > 0 && Math.floor(e.invuln / 3) % 2 === 0) return;
      this.drawSprite(g, e, e.spriteName(), null, camX);
      return;
    }
    if (e instanceof Platform) {
      const x = Math.round(e.x - camX); const y = Math.round(e.y);
      g.fillStyle = '#f0a060'; g.fillRect(x, y, e.w, 8);
      g.fillStyle = '#8a3f17'; for (let i = 0; i < e.w; i += 8) g.fillRect(x + i, y + 2, 4, 4);
      g.fillStyle = '#ffffff'; g.fillRect(x, y, e.w, 1);
      return;
    }
    if (e instanceof Firebar) {
      const s = Sprites.get(world.frame % 8 < 4 ? 'fireball1' : 'fireball2');
      for (const [px, py] of e.points()) g.drawImage(s, Math.round(px - 3 - camX), Math.round(py - 3));
      return;
    }
    if (e instanceof Vine) {
      const x = Math.round(e.x - camX);
      g.fillStyle = '#2f8f3a'; g.fillRect(x + 3, Math.round(e.y), 2, Math.round(e.h));
      g.fillStyle = '#7be36a';
      for (let yy = e.y + 4; yy < e.y + e.h; yy += 12) { g.fillRect(x - 1, Math.round(yy), 4, 3); g.fillRect(x + 5, Math.round(yy + 6), 4, 3); }
      return;
    }
    if (e instanceof Boss && e.flash > 0 && e.flash % 2) return;
    const name = e.sprite ? e.sprite() : null;
    if (!name) return;
    let variant = e.variant ? e.variant() : null;
    if (!variant && (e instanceof Walker)) {
      const th = world.area.theme;
      variant = th === 'underground' ? 'under' : th === 'castle' ? 'castle' : null;
    }
    this.drawSprite(g, e, name, variant, camX);
    if (e instanceof Snail && e.wings && !e.falling) {
      const w = Sprites.get('wings');
      const flip = e.facing < 0;
      const wx = Math.round((flip ? e.x + e.w - 3 : e.x - 1) - camX);
      const wy = Math.round(e.y - 3 + (Math.floor(e.t / 6) % 2 ? -1 : 1));
      g.drawImage(w, wx, wy);
    }
  },
  drawDeco(g, world, th) {
    const camX = world.camX;
    for (const d of world.area.deco) {
      const x = d.col * TILE - camX;
      if (x > VIEW_W + 80 || x < -120) continue;
      if (d.kind === 'cloud') {
        const w = 24 + d.size * 16; const y = d.row * TILE + 8;
        g.fillStyle = th.t.cloud; g.beginPath();
        g.fillRect(x + 4, y + 4, w - 8, 10); g.fillRect(x + 8, y, w - 16, 16); g.fillRect(x, y + 8, w, 6);
        if (th.name === 'overworld') { g.fillStyle = '#c8e4ff'; g.fillRect(x, y + 13, w, 1); }
      } else if (d.kind === 'hill') {
        const h = 24 + d.size * 16; const w = h * 2.2; const base = GROUND_ROW * TILE;
        g.fillStyle = th.name === 'night' ? '#1f4a28' : '#2f8f3a';
        for (let i = 0; i < h; i++) { const ww = w * (i / h); g.fillRect(Math.round(x + (w - ww) / 2), base - h + i, Math.round(ww), 1); }
        g.fillStyle = th.name === 'night' ? '#163a1f' : '#24702f';
        g.fillRect(Math.round(x + w / 2 - 6), base - h + 14, 2, 6); g.fillRect(Math.round(x + w / 2 + 4), base - h + 18, 2, 6);
      } else if (d.kind === 'bush') {
        const w = 16 + d.size * 12; const base = GROUND_ROW * TILE;
        g.fillStyle = th.name === 'night' ? '#2a6a35' : '#4fcf5f';
        g.fillRect(x + 4, base - 10, w - 8, 10); g.fillRect(x, base - 6, w, 6); g.fillRect(x + 8, base - 13, w - 16, 3);
      } else if (d.kind === 'castle') {
        const base = d.row * TILE; const R = (xx, yy, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x + xx), yy, w, h); };
        R(0, base - 48, 80, 48, '#b5562a');
        for (let i = 0; i < 80; i += 8) R(i, base - 48, 1, 48, '#8a3f17');
        for (let j = 0; j < 48; j += 8) R(0, base - 48 + j, 80, 1, '#8a3f17');
        R(16, base - 80, 48, 32, '#b5562a');
        for (let i = 0; i < 80; i += 16) R(i, base - 56, 8, 8, '#b5562a');
        for (let i = 16; i < 64; i += 16) R(i, base - 88, 8, 8, '#b5562a');
        R(32, base - 32, 16, 32, '#1a1a24'); R(36, base - 36, 8, 4, '#1a1a24');
        R(24, base - 72, 6, 10, '#1a1a24'); R(50, base - 72, 6, 10, '#1a1a24');
      }
    }
  },
  drawWorld(world) {
    const g = this.g; const area = world.area; const th = this.themeOf(area);
    g.fillStyle = th.grey ? '#202028' : th.t.sky;
    g.fillRect(0, 0, VIEW_W, VIEW_H);
    this.drawDeco(g, world, th);
    const camX = world.camX;
    const behind = (e) => e instanceof Plant || (e instanceof Item && e.emerge > 0) || (e instanceof Vine);
    for (const e of world.entities) if (behind(e)) this.drawEntity(g, e, world);
    const heroBehind = world.state === 'pipeIn' || world.state === 'pipeOut';
    if (heroBehind) this.drawEntity(g, world.hero, world);
    // Tiles
    const c0 = Math.floor(camX / TILE); const c1 = c0 + viewCols();
    const qf = [0, 0, 1, 2][Math.floor(world.frame / 10) % 4]; const lf = Math.floor(world.frame / 8);
    const themeName = th.name === 'athletic' || th.name === 'bridge' ? 'overworld' : th.name;
    for (let c = c0; c <= c1; c++) {
      for (let r = 0; r < ROWS; r++) {
        const ch = world.tile(c, r);
        if (ch === ' ' || ch === 'H') continue;
        let x = c * TILE - camX; let y = r * TILE;
        const bump = world.bumps.find((b) => b.c === c && b.r === r);
        if (bump) y -= Math.round(Math.sin((bump.t / 10) * Math.PI) * 5);
        g.drawImage(this.tileCanvas(ch, themeName, ch === '?' ? qf : lf), Math.round(x), y);
      }
    }
    // Flag cloth
    if (area.end && area.end.kind === 'flag') {
      const fx = area.end.col * TILE - camX;
      const fy = world.state === 'flag' ? world.flagY : area.end.top * TILE + 8;
      if (fx > -24 && fx < VIEW_W + 8) {
        g.fillStyle = '#ffffff';
        for (let i = 0; i < 14; i++) g.fillRect(Math.round(fx + 7 - i), Math.round(fy + i / 2), 1, 14 - i);
        g.fillStyle = '#1fa39a'; g.fillRect(Math.round(fx), Math.round(fy + 3), 4, 4);
      }
    }
    for (const e of world.entities) if (!behind(e)) this.drawEntity(g, e, world);
    if (!heroBehind) this.drawEntity(g, world.hero, world);
  },
  // Text in display space, so it stays crisp at any scale.
  text(ctx, s, x, y, size, color = '#ffffff', align = 'left') {
    ctx.font = `${Math.round(size * 0.85)}px "Press Start 2P", "Courier New", ui-monospace, monospace`;
    ctx.textAlign = align; ctx.textBaseline = 'top';
    ctx.fillStyle = '#000000'; ctx.fillText(s, x + Math.max(1, size / 10), y + Math.max(1, size / 10));
    ctx.fillStyle = color; ctx.fillText(s, x, y);
  },
  hud(ctx, scale, game) {
    const p = game.progress; const w = game.world;
    const S = scale; const size = Math.round(8 * S);
    const col = (i) => Math.round((16 + i * (VIEW_W - 76) / 3) * S);
    const y1 = Math.round(6 * S); const y2 = Math.round(15 * S);
    this.text(ctx, 'PIP', col(0), y1, size);
    this.text(ctx, String(p.score).padStart(6, '0'), col(0), y2, size);
    const coin = Sprites.get('coin1');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(coin, col(1) - 2 * S, y2 - 1 * S, coin.width * S * 0.8, coin.height * S * 0.8);
    this.text(ctx, 'x' + String(p.coins).padStart(2, '0'), col(1) + 9 * S, y2, size);
    this.text(ctx, p.random ? 'RANDOM' : 'WORLD', col(2), y1, size);
    this.text(ctx, p.random ? p.random.type.slice(0, 6).toUpperCase() : p.levelId, col(2) + (p.random ? 0 : 8 * S), y2, size);
    this.text(ctx, 'TIME', col(3), y1, size);
    if (w) this.text(ctx, String(Math.max(0, w.timeLeft)).padStart(3, ' '), col(3) + 4 * S, y2, size, w.timeLeft <= 100 ? '#ffd166' : '#ffffff');
  },
  overlayText(ctx, scale, world) {
    const S = scale;
    for (const p of world.popups) this.text(ctx, p.text, Math.round((p.x - world.camX) * S), Math.round(p.y * S), Math.round(6 * S), '#ffffff');
    for (const d of world.area.deco) {
      if (d.kind !== 'label') continue;
      const x = (d.col * TILE - world.camX) * S;
      if (x < -200 * S || x > (VIEW_W + 50) * S) continue;
      this.text(ctx, d.text, Math.round(x), Math.round(d.row * TILE * S), Math.round(8 * S), '#ffffff', 'center');
    }
    if (world.state === 'axe' && world.axeStage >= 2) {
      const msg = world.captiveMsg === 'final'
        ? ['THE KINGDOM IS SAVED!', 'THANK YOU, PIP.', 'THE END']
        : ['THANK YOU, PIP!', 'BUT THE QUEEN IS HELD', 'IN A CASTLE FURTHER ON.'];
      msg.forEach((m, i) => this.text(ctx, m, Math.round(VIEW_W / 2 * S), Math.round((64 + i * 16) * S), Math.round(8 * S), '#ffffff', 'center'));
    }
  },
  intro(ctx, scale, game) {
    const S = scale; const p = game.progress;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const label = p.random ? `RANDOM ${p.random.type.toUpperCase()}` : `WORLD ${p.levelId}`;
    this.text(ctx, label, Math.round(VIEW_W / 2 * S), Math.round(84 * S), Math.round(10 * S), '#ffffff', 'center');
    if (p.random) this.text(ctx, `SEED ${p.random.seed}`, Math.round(VIEW_W / 2 * S), Math.round(100 * S), Math.round(7 * S), '#a7a3b8', 'center');
    const hero = Sprites.get('hero:small:stand:' + (p.form === 'fire' ? 'fire' : 'normal'));
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(hero, Math.round((VIEW_W / 2 - 28) * S), Math.round(118 * S), 16 * S, 16 * S);
    this.text(ctx, `x  ${p.lives}`, Math.round((VIEW_W / 2 - 4) * S), Math.round(122 * S), Math.round(9 * S));
  },
  bigMessage(ctx, scale, lines) {
    const S = scale;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    lines.forEach((l, i) => this.text(ctx, l, Math.round(VIEW_W / 2 * S), Math.round((96 + i * 18) * S), Math.round(10 * S), i ? '#a7a3b8' : '#ffffff', 'center'));
  },
};
