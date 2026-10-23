// Level generator: turns a level spec (js/levels.js) into tile grids and spawn lists.
// The same spec + seed always produces the same level.
//
// Tile legend (solid unless noted):
//  ' ' empty   '#' ground    'B' brick     '?' question  'U' used block  'H' hidden (solid from below only)
//  'S' hard block  '[' ']' pipe top  '{' '}' pipe body  '<' ',' side-pipe mouth  '-' '_' side-pipe body
//  'T' treetop   't' trunk (decor)  '=' bridge  'c' cloud  'G' castle stone  'N' 'n' cannon
//  'L' lava (hazard)  '~' water (decor)  'X' axe (trigger)  '|' 'o' flagpole (decor)  'C' coin  'V' vine
const SOLID = new Set(['#', 'B', '?', 'U', 'S', '[', ']', '{', '}', '<', ',', '-', '_', 'T', '=', 'c', 'G', 'N', 'n']);
const GROUND_ROW = 13;

function newArea(id, theme, w) {
  const grid = [];
  for (let r = 0; r < ROWS; r++) grid.push(new Array(w).fill(' '));
  return {
    id, theme, w, grid, contents: {}, spawns: [], pipes: [], deco: [], loops: [],
    start: { col: 2, row: 12 }, checkpoint: null, end: null, leaperZone: null, water: false,
    ceilingLimit: false, heaven: false, returnTo: null,
  };
}

class Builder {
  constructor(area, rng) { this.a = area; this.rng = rng; this.nextId = 1; }
  inside(c, r) { return c >= 0 && c < this.a.w && r >= 0 && r < ROWS; }
  set(c, r, ch) { if (this.inside(c, r)) this.a.grid[r][c] = ch; }
  get(c, r) { return this.inside(c, r) ? this.a.grid[r][c] : ' '; }
  fill(c0, c1, r0, r1, ch) { for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) this.set(c, r, ch); }
  ground(c0, c1, top = GROUND_ROW, ch = '#') { this.fill(c0, c1, top, ROWS - 1, ch); }
  block(c, r, ch, content) {
    this.set(c, r, ch);
    if (content) this.a.contents[r * this.a.w + c] = content;
  }
  pipe(c, h, groundTop = GROUND_ROW) {
    const top = groundTop - h;
    this.set(c, top, '['); this.set(c + 1, top, ']');
    for (let r = top + 1; r < groundTop; r++) { this.set(c, r, '{'); this.set(c + 1, r, '}'); }
    return { col: c, row: top };
  }
  sidePipe(c, floorTop) {
    // Mouth faces left at column c, two rows tall, resting on the floor.
    this.set(c, floorTop - 2, '<'); this.set(c, floorTop - 1, ',');
    this.set(c + 1, floorTop - 2, '-'); this.set(c + 1, floorTop - 1, '_');
    return { col: c, row: floorTop - 2 };
  }
  stairsUp(c, h, groundTop = GROUND_ROW) {
    for (let i = 0; i < h; i++) for (let r = groundTop - 1 - i; r < groundTop; r++) this.set(c + i, r, 'S');
  }
  stairsDown(c, h, groundTop = GROUND_ROW) {
    for (let i = 0; i < h; i++) for (let r = groundTop - h + i; r < groundTop; r++) this.set(c + i, r, 'S');
  }
  spawn(type, col, row, extra = {}) {
    const s = { id: this.nextId++, type, col, row, ...extra };
    this.a.spawns.push(s);
    return s;
  }
  coins(c0, c1, r) { for (let c = c0; c <= c1; c++) if (this.get(c, r) === ' ') this.set(c, r, 'C'); }
  surface(c, fromRow = 1) {
    for (let r = fromRow; r < ROWS - 1; r++) {
      if (SOLID.has(this.get(c, r)) && !SOLID.has(this.get(c, r - 1))) return r;
    }
    return -1;
  }
  flagEnd(c, groundTop = GROUND_ROW) {
    // Final staircase, flagpole and castle.
    this.stairsUp(c, 8, groundTop);
    this.fill(c + 8, c + 8, groundTop - 8, groundTop - 1, 'S');
    const pole = c + 11;
    this.set(pole, groundTop - 1, 'S');
    this.set(pole, groundTop - 11, 'o');
    for (let r = groundTop - 10; r < groundTop - 1; r++) this.set(pole, r, '|');
    this.a.end = { kind: 'flag', col: pole, top: groundTop - 10, base: groundTop - 1 };
    this.a.deco.push({ kind: 'castle', col: pole + 4, row: groundTop });
    return pole;
  }
}

// Bag of enemy types from counts, shuffled with the level RNG.
function enemyBag(counts, rng) {
  const bag = [];
  for (const k in counts) for (let i = 0; i < counts[k]; i++) bag.push(k);
  for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
  return bag;
}

function placeEnemies(b, spec, c0, c1, rng) {
  const bag = enemyBag(spec.enemies || {}, rng);
  if (!bag.length) return;
  const span = c1 - c0;
  bag.forEach((type, i) => {
    let col = Math.floor(c0 + (span * (i + 0.5 + (rng.next() - 0.5) * 0.6)) / bag.length);
    for (let tries = 0; tries < 12; tries++) {
      const r = b.surface(col, 3);
      const t = b.get(col, r);
      const okTile = r > 0 && ['#', 'S', 'B', 'T', '=', 'G', 'U', '?'].includes(t);
      if (okTile && b.get(col, r - 1) === ' ' && b.get(col, r - 2) !== 'X') {
        if (type === 'squid' || type === 'fish') {
          b.spawn(type, col, rng.int(5, Math.max(5, r - 2)));
        } else if (type === 'flyer' || type === 'redflyer') {
          b.spawn(type, col, Math.max(4, r - rng.int(3, 5)), { red: type === 'redflyer' });
        } else if (type === 'thrower') {
          b.spawn(type, col, r - 2);
        } else {
          b.spawn(type, col, r - 1, { red: type === 'redsnail' });
          if (type === 'walker' && rng.chance(0.4) && b.get(col + 2, r) !== ' ') b.spawn('walker', col + 2, r - 1);
        }
        return;
      }
      col += rng.int(-6, 6);
      col = clamp(col, c0, c1);
    }
  });
}

function decorate(b, rng, theme) {
  const a = b.a;
  if (theme !== 'overworld' && theme !== 'night' && theme !== 'athletic' && theme !== 'bridge') return;
  for (let c = 0; c < a.w; c += rng.int(8, 16)) a.deco.push({ kind: 'cloud', col: c, row: rng.int(1, 4), size: rng.int(1, 3) });
  if (theme === 'overworld' || theme === 'night') {
    for (let c = 0; c < a.w; c += rng.int(10, 22)) {
      if (b.get(c, GROUND_ROW) === '#' && b.get(c, GROUND_ROW - 1) === ' ') a.deco.push({ kind: 'hill', col: c, size: rng.int(1, 2) });
    }
    for (let c = 4; c < a.w; c += rng.int(7, 14)) {
      if (b.get(c, GROUND_ROW) === '#' && b.get(c + 1, GROUND_ROW) === '#' && b.get(c, GROUND_ROW - 1) === ' ' && b.get(c + 1, GROUND_ROW - 1) === ' ') {
        a.deco.push({ kind: 'bush', col: c, size: rng.int(1, 3) });
      }
    }
  }
}

// ---------------------------------------------------------------- overworld
function genOverworld(spec, rng, erng, d) {
  const W = spec.len;
  const a = newArea('main', spec.night ? 'night' : 'overworld', W);
  const b = new Builder(a, rng);
  b.ground(0, 15);
  if (spec.tutorial) {
    b.block(11, 9, '?', 'coin');
    b.block(15, 9, 'B'); b.block(16, 9, '?', 'power'); b.block(17, 9, 'B'); b.block(18, 9, '?', 'coin'); b.block(19, 9, 'B');
    b.block(17, 5, '?', 'coin');
    b.ground(16, 30);
  }
  let x = spec.tutorial ? 31 : 16;
  const pipes = [];
  let lastSeg = '';
  const maxPit = spec.widePits ? 5 : 3 + Math.round(d);
  while (x < W - 52) {
    const options = ['flat', 'blocks', 'pit', 'pipes', 'stairs', 'pyramid', 'floating', 'coins'];
    let seg = rng.pick(options);
    if (seg === lastSeg && seg !== 'flat') seg = 'flat';
    lastSeg = seg;
    if (seg === 'flat') {
      const len = rng.int(5, 10); b.ground(x, x + len - 1); x += len;
    } else if (seg === 'blocks') {
      const len = rng.int(10, 14); b.ground(x, x + len - 1);
      const s = x + rng.int(2, 4); const n = rng.int(3, 6);
      for (let i = 0; i < n; i++) {
        const content = rng.chance(0.35) ? (rng.chance(0.4) ? 'power' : 'coin') : null;
        if (content) b.block(s + i, 9, '?', content); else b.block(s + i, 9, 'B', rng.chance(0.08) ? 'coins10' : (rng.chance(0.05) ? 'star' : null));
      }
      if (rng.chance(0.5)) for (let i = 1; i < n - 1; i++) b.block(s + i, 5, rng.chance(0.5) ? 'B' : '?', rng.chance(0.3) ? 'coin' : null);
      if (rng.chance(0.25)) b.block(s + n + 1, 9, 'H', rng.chance(0.5) ? 'oneup' : 'coin');
      x += len;
    } else if (seg === 'pit') {
      const w = rng.int(2, maxPit);
      b.ground(x, x + 1); x += 2; x += w; b.ground(x, x + 2); x += 3;
    } else if (seg === 'pipes') {
      const len = rng.int(14, 20); b.ground(x, x + len - 1);
      let px = x + 2;
      while (px < x + len - 3) {
        const h = rng.int(2, d > 0.3 ? 4 : 3);
        pipes.push(b.pipe(px, h));
        px += rng.int(5, 8);
      }
      x += len;
    } else if (seg === 'stairs') {
      const h = rng.int(3, 4 + Math.round(d));
      b.ground(x, x + h * 2 + 3);
      b.stairsUp(x + 1, h);
      if (rng.chance(0.5)) { b.stairsDown(x + h + 1, h); x += h * 2 + 4; } else {
        x += h + 1; const gap = rng.int(2, 3); x += gap; b.ground(x, x + h + 2); b.stairsDown(x, h); x += h + 3;
      }
    } else if (seg === 'pyramid') {
      const h = rng.int(3, 4);
      b.ground(x, x + h);
      b.stairsUp(x, h);
      x += h; const gap = rng.int(2, maxPit - 1); x += gap;
      b.ground(x, x + h + 1); b.stairsDown(x, h); x += h + 2;
    } else if (seg === 'floating') {
      b.ground(x, x + 2);
      const gap = rng.int(5, 8);
      const pr = rng.int(9, 10);
      b.fill(x + 3, x + 3 + gap - 1, pr, pr, 'B');
      if (rng.chance(0.5)) b.block(x + 3 + Math.floor(gap / 2), pr - 4, '?', 'power');
      b.coins(x + 4, x + 2 + gap - 1, pr - 2);
      x += 3 + gap; b.ground(x, x + 3); x += 4;
    } else if (seg === 'coins') {
      const len = rng.int(8, 12); b.ground(x, x + len - 1);
      b.coins(x + 2, x + len - 3, rng.int(9, 10));
      x += len;
    }
  }
  b.ground(x, W - 1);
  // Cannons on flat ground.
  const cannonCount = spec.cannons || 0;
  for (let i = 0; i < cannonCount; i++) {
    for (let t = 0; t < 20; t++) {
      const c = rng.int(30, W - 45);
      if (b.get(c, GROUND_ROW) === '#' && b.get(c, GROUND_ROW - 1) === ' ' && b.get(c, GROUND_ROW - 2) === ' ' && b.get(c, GROUND_ROW - 3) === ' ') {
        const h = rng.int(1, 2);
        b.set(c, GROUND_ROW - h, 'N'); if (h === 2) b.set(c, GROUND_ROW - 1, 'n');
        break;
      }
    }
  }
  const pole = b.flagEnd(W - 26);
  a.checkpoint = Math.floor(W / 2);
  ensurePipes(b, pipes, (spec.tutorial ? 3 : 1) + (spec.bonusPipes || 0) * 2 + (spec.waterArea ? 2 : 0), 20, W - 40, rng);
  pipeFeatures(b, spec, pipes, rng);
  if (spec.vine) vineFeature(b, rng, W);
  for (let i = 0; i < (spec.springs || 0); i++) {
    for (let t = 0; t < 30; t++) {
      const c = rng.int(40, W - 50);
      const clear = [c - 1, c, c + 1].every((k) => b.get(k, GROUND_ROW) === '#' && [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].every((r) => b.get(k, GROUND_ROW - r) === ' '));
      if (clear) { b.spawn('spring', c, GROUND_ROW - 1); b.coins(c - 1, c + 3, 3); break; }
    }
  }
  if (spec.waterArea) waterSideArea(b, pipes, rng);
  placeEnemies(b, spec, 22, pole - 6, erng);
  if (spec.rider) b.spawn('rider', 22, 3, { leaveCol: pole - 14 });
  decorate(b, rng, a.theme);
  return a;
}

// Make sure there are at least n pipes, planting them on clear flat ground if needed.
function ensurePipes(b, pipes, n, c0, c1, rng) {
  const clear = (c) => b.get(c, GROUND_ROW) === '#' && b.get(c, GROUND_ROW + 1) === '#' && [1, 2, 3, 4, 5, 6].every((k) => b.get(c, GROUND_ROW - k) === ' ');
  for (let c = c0; c < c1 && pipes.length < n; c += 3) {
    if (pipes.some((p) => Math.abs(p.col - c) < 8)) continue;
    if (clear(c - 1) && clear(c) && clear(c + 1) && clear(c + 2)) {
      pipes.push(b.pipe(c, rng.int(2, 3)));
      c += 10;
    }
  }
  pipes.sort((p, q) => p.col - q.col);
}

function pipeFeatures(b, spec, pipes, rng) {
  const a = b.a;
  pipes.forEach((p, i) => {
    if (spec.plants && !(spec.tutorial && i < 2) && rng.chance(0.55)) b.spawn('plant', p.col, p.row, {});
  });
  let wanted = spec.bonusPipes || 0;
  for (let i = 0; i < pipes.length && wanted > 0; i++) {
    const p = pipes[i];
    const exit = pipes.find((q) => q.col > p.col + 14);
    const exitCol = exit ? exit.col : Math.min(p.col + 24, a.w - 40);
    a.pipes.push({ col: p.col, row: p.row, dir: 'down', to: 'bonus' + i, exitCol, exitPipe: !!exit, exitRow: exit ? exit.row : null });
    a.sub = a.sub || [];
    a.sub.push({ id: 'bonus' + i, kind: 'bonus' });
    wanted--;
  }
}

function vineFeature(b, rng, W) {
  for (let t = 0; t < 40; t++) {
    const c = rng.int(25, Math.floor(W * 0.6));
    if (b.get(c, 9) === 'B' && b.get(c, 8) === ' ' && b.get(c, 7) === ' ') {
      b.a.contents[9 * b.a.w + c] = 'vine';
      b.a.sub = b.a.sub || [];
      b.a.sub.push({ id: 'heaven', kind: 'heaven' });
      b.a.heavenReturn = Math.min(c + 45, W - 40);
      return;
    }
  }
  // No brick found: make one.
  const c = Math.floor(W * 0.35);
  b.ground(c - 2, c + 2);
  b.block(c, 9, 'B', 'vine');
  b.a.sub = b.a.sub || [];
  b.a.sub.push({ id: 'heaven', kind: 'heaven' });
  b.a.heavenReturn = Math.min(c + 45, W - 40);
}

function waterSideArea(b, pipes, rng) {
  const a = b.a;
  const p = pipes.find((q) => q.col > 40 && !a.pipes.some((e) => e.col === q.col));
  if (!p) return;
  a.pipes.push({ col: p.col, row: p.row, dir: 'down', to: 'water', exitCol: Math.min(p.col + 30, a.w - 40), exitPipe: false });
  a.sub = a.sub || [];
  a.sub.push({ id: 'water', kind: 'water' });
}

// ---------------------------------------------------------------- underground
function genUnderground(spec, rng, erng, d) {
  const W = spec.len;
  const a = newArea('main', 'underground', W);
  const b = new Builder(a, rng);
  b.ground(0, W - 1);
  b.fill(0, 0, 3, 12, 'B');
  b.fill(6, W - 1, 2, 2, 'B');
  a.start = { col: 2, row: 3, drop: true };
  let x = 12;
  const pipes = [];
  const endStart = W - 46;
  while (x < endStart) {
    const seg = rng.pick(['pillars', 'blocks', 'pit', 'pipes', 'bumps', 'flat', 'lift']);
    if (seg === 'flat') { x += rng.int(4, 8); }
    else if (seg === 'pillars') {
      const n = rng.int(2, 4);
      for (let i = 0; i < n; i++) { const h = rng.int(2, 4); b.fill(x + i * 3, x + i * 3, GROUND_ROW - h, GROUND_ROW - 1, 'B'); }
      x += n * 3 + 2;
    } else if (seg === 'blocks') {
      const len = rng.int(6, 10);
      for (let i = 0; i < len; i++) b.block(x + i, 9, rng.chance(0.2) ? '?' : 'B', rng.chance(0.15) ? 'coin' : (rng.chance(0.06) ? 'power' : null));
      b.coins(x + 1, x + len - 2, 8 - 1);
      if (rng.chance(0.4)) b.fill(x + 2, x + len - 3, 5, 5, 'B');
      x += len + 2;
    } else if (seg === 'pit') {
      const w = rng.int(2, 3); b.fill(x, x + w - 1, GROUND_ROW, ROWS - 1, ' '); x += w + 3;
    } else if (seg === 'pipes') {
      for (let i = 0; i < 3; i++) { pipes.push(b.pipe(x, rng.int(2, 3))); x += rng.int(4, 6); }
    } else if (seg === 'bumps') {
      b.stairsUp(x, 3); b.stairsDown(x + 3, 3); x += 8;
    } else if (seg === 'lift' && (spec.lifts || 0) > 0) {
      const w = rng.int(4, 6);
      b.fill(x, x + w - 1, GROUND_ROW, ROWS - 1, ' ');
      b.spawn('platform', x + 1, 10, { mode: 'vertical', range: 5 * TILE, speed: 0.6, width: 3 });
      x += w + 2;
    } else x += 4;
  }
  // Ending: raised staircase, gap in ceiling (secret route), wall with side pipe.
  const S = endStart + 4;
  b.stairsUp(S, 5);
  b.fill(S + 5, S + 9, GROUND_ROW - 5, GROUND_ROW - 1, 'S');
  b.coins(S + 5, S + 7, GROUND_ROW - 7);
  const E = S + 18;
  b.fill(E, E + 3, 3, 12, 'S');
  const sp = b.sidePipe(E - 2, GROUND_ROW);
  a.pipes.push({ col: sp.col, row: sp.row, dir: 'right', to: 'outro' });
  a.sub = [{ id: 'outro', kind: 'outro' }];
  if (spec.warp) {
    // Gap in the ceiling above the staircase lets players climb onto the ceiling and run over the wall.
    b.fill(S + 8, S + 9, 2, 2, ' ');
    b.fill(S + 8, S + 8, 5, 5, 'B');
    const R = E + 4;
    b.fill(R, W - 1, 2, 2, ' ');
    b.fill(R + 22, W - 1, 0, 12, 'S');
    spec.warp.forEach((wTo, i) => {
      const pc = R + 4 + i * 6;
      const p = b.pipe(pc, 3);
      a.pipes.push({ col: p.col, row: p.row, dir: 'down', warp: wTo });
      a.deco.push({ kind: 'label', col: pc + 1, row: p.row - 2, text: String(wTo) });
    });
    a.deco.push({ kind: 'label', col: R + 10, row: 5, text: 'WARP ZONE' });
  } else {
    b.fill(E + 4, W - 1, 2, 12, 'S');
  }
  pipeFeatures(b, spec, pipes, rng);
  a.checkpoint = Math.floor(W / 2);
  placeEnemies(b, spec, 18, endStart, erng);
  return a;
}

// ---------------------------------------------------------------- underwater
function genUnderwater(spec, rng, erng, d) {
  const W = spec.len;
  const a = newArea('main', 'underwater', W);
  a.water = true;
  const b = new Builder(a, rng);
  b.ground(0, W - 1);
  a.start = { col: 3, row: 5, drop: true };
  let x = 14;
  const pipes = [];
  while (x < W - 30) {
    const seg = rng.pick(['coral', 'coral', 'ceilingCoral', 'gap', 'pipe', 'shelf', 'open']);
    if (seg === 'coral') { const h = rng.int(2, 6); const w = rng.int(1, 2); b.fill(x, x + w - 1, GROUND_ROW - h, GROUND_ROW - 1, '#'); x += w + rng.int(3, 6); }
    else if (seg === 'ceilingCoral') { const h = rng.int(2, 4); b.fill(x, x + 1, 3, 3 + h, '#'); x += rng.int(5, 7); }
    else if (seg === 'gap') { const w = rng.int(2, 3); b.fill(x, x + w - 1, GROUND_ROW, ROWS - 1, ' '); x += w + 3; }
    else if (seg === 'pipe') { pipes.push(b.pipe(x, rng.int(2, 3))); x += 6; }
    else if (seg === 'shelf') { const w = rng.int(4, 7); const r = rng.int(6, 9); b.fill(x, x + w - 1, r, r, '#'); b.coins(x, x + w - 1, r - 1); x += w + 4; }
    else x += rng.int(4, 7);
  }
  const E = W - 14;
  b.fill(E, W - 1, 0, 12, '#');
  b.fill(E - 6, E - 1, 11, 12, '#');
  const sp = b.sidePipe(E - 2, 11);
  a.pipes.push({ col: sp.col, row: sp.row, dir: 'right', to: 'outro' });
  a.sub = [{ id: 'outro', kind: 'outro' }];
  pipeFeatures(b, spec, pipes, rng);
  a.checkpoint = Math.floor(W / 2);
  placeEnemies(b, spec, 18, W - 24, erng);
  return a;
}

// ---------------------------------------------------------------- athletic / bridge
function genAthletic(spec, rng, erng, d, bridge) {
  const W = spec.len;
  const theme = bridge ? 'bridge' : 'athletic';
  const a = newArea('main', theme, W);
  if (spec.night) a.night = true;
  if (spec.grey) a.grey = true;
  const b = new Builder(a, rng);
  b.ground(0, 13);
  let x = 14;
  let r = 13;
  let lifts = spec.lifts || 0;
  let falling = spec.falling || 0;
  if (bridge) { a.leaperZone = [16, W - 34]; for (let c = 0; c < W; c++) { b.set(c, 14, b.get(c, 14) === ' ' ? '~' : b.get(c, 14)); } }
  while (x < W - 34) {
    if (bridge) {
      const len = rng.int(6, 16);
      const br = clamp(r + rng.int(-2, 1), 8, 10);
      b.fill(x, x + len - 1, br, br, '=');
      if (rng.chance(0.3)) b.coins(x + 2, x + len - 3, br - 3);
      if (rng.chance(0.25)) { b.fill(x + len, x + len + 1, br, ROWS - 2, 'S'); x += 2; }
      r = br; x += len + rng.int(1, 3);
      continue;
    }
    if (lifts > 0 && rng.chance(0.3)) {
      lifts--;
      const gap = rng.int(6, 8);
      const vertical = rng.chance(0.5);
      if (vertical) b.spawn('platform', x + 1, r, { mode: 'vertical', range: 4 * TILE, speed: 0.6, width: 3 });
      else b.spawn('platform', x, r, { mode: 'horizontal', range: (gap - 3) * TILE, speed: 0.6, width: 3 });
      x += gap;
    } else if (falling > 0 && rng.chance(0.3)) {
      falling--;
      b.spawn('platform', x, r, { mode: 'falling', width: 3 });
      x += 5;
    }
    const w = rng.int(3, 7);
    const nr = clamp(r + rng.int(-3, 2), 7, 12);
    b.fill(x, x + w - 1, nr, nr, 'T');
    for (let rr = nr + 1; rr < ROWS; rr++) for (let c = x + 1; c < x + w - 1; c++) b.set(c, rr, 't');
    if (rng.chance(0.35)) b.coins(x + 1, x + w - 2, nr - 2);
    if (rng.chance(0.15)) b.block(x + Math.floor(w / 2), nr - 4, '?', 'power');
    r = nr;
    x += w + rng.int(2, 3);
  }
  const endC = Math.min(x + 1, W - 33);
  b.fill(endC, W - 1, 0, ROWS - 1, ' ');
  b.ground(endC, W - 1);
  const pole = b.flagEnd(endC + 3);
  if (spec.cannons) {
    for (let i = 0; i < spec.cannons; i++) {
      const c = rng.int(20, endC - 6);
      const s = b.surface(c, 4);
      if (s > 0 && b.get(c, s) === 'T' && b.get(c, s - 1) === ' ' && b.get(c, s - 2) === ' ') b.set(c, s - 1, 'N');
    }
  }
  a.checkpoint = Math.floor(W / 2);
  placeEnemies(b, spec, 18, endC, erng);
  decorate(b, rng, theme);
  return a;
}

// ---------------------------------------------------------------- castle
function genCastle(spec, rng, erng, d) {
  const W = spec.len;
  const a = newArea('main', 'castle', W);
  const b = new Builder(a, rng);
  b.fill(0, W - 1, 0, 2, 'G');
  b.fill(0, 7, 8, 14, 'G');
  b.fill(8, 12, 11, 14, 'G');
  a.start = { col: 2, row: 7 };
  let x = 13;
  let firebars = spec.firebars || 0;
  let bubbles = spec.bubbles || 0;
  let mazes = spec.maze || 0;
  let lifts = spec.lifts || 0;
  const bossStart = W - 34;
  const segCount = Math.max(1, Math.floor((bossStart - 13) / 16));
  let segI = 0;
  while (x < bossStart - 4) {
    segI++;
    const remaining = bossStart - 4 - x;
    if (mazes > 0 && segI % 3 === 0 && remaining > 40) {
      mazes--;
      // Split corridor: upper path (on divider at row 7) or lower path (floor row 11).
      b.fill(x, x + 3, 11, 14, 'G');
      b.set(x + 2, 9, 'G'); b.set(x + 3, 9, 'G');
      const c0 = x + 5;
      b.fill(c0 - 1, c0 + 26, 11, 14, 'G');
      b.fill(c0, c0 + 22, 7, 7, 'G');
      const upper = rng.chance(0.5);
      if (upper) b.coins(c0 + 2, c0 + 20, 5); else b.coins(c0 + 2, c0 + 20, 9);
      // A firebar on the wrong path for flavour.
      b.set(c0 + 11, upper ? 10 : 6, 'U');
      b.spawn('firebar', c0 + 11, upper ? 10 : 6, { len: 4, dir: rng.chance(0.5) ? 1 : -1, speed: 0.025 });
      a.loops.push({ col: c0 + 20, upperRow: 7, correct: upper ? 'upper' : 'lower', backCol: x - 4 });
      x = c0 + 27;
      continue;
    }
    const seg = rng.pick(['corridor', 'lava', 'low', 'firebar', 'steps']);
    if (seg === 'corridor' || seg === 'firebar') {
      const len = rng.int(8, 14);
      b.fill(x, x + len - 1, 11, 14, 'G');
      if (firebars > 0) {
        firebars--;
        const fr = rng.chance(0.5) ? 7 : 10;
        const fc = x + Math.floor(len / 2);
        if (fr === 10) b.set(fc, 10, 'U'); else b.set(fc, 7, 'U');
        b.spawn('firebar', fc, fr, { len: d > 0.5 && rng.chance(0.3) ? 6 : 5, dir: rng.chance(0.5) ? 1 : -1, speed: 0.02 + d * 0.015 });
      } else if (rng.chance(0.4)) {
        b.block(x + 3, 7, '?', 'power');
      }
      x += len;
    } else if (seg === 'lava') {
      b.fill(x, x + 1, 11, 14, 'G');
      const useLift = lifts > 0 && rng.chance(0.6);
      const w = useLift ? rng.int(6, 8) : rng.int(2, 3);
      b.fill(x + 2, x + 1 + w, 13, 14, 'L');
      if (useLift) { lifts--; b.spawn('platform', x + 2, 10, { mode: 'horizontal', range: (w - 3) * TILE, speed: 0.7, width: 3 }); }
      if (bubbles > 0) { bubbles--; b.spawn('bubble', x + 2 + Math.floor(w / 2), 14, {}); }
      x += 2 + w;
    } else if (seg === 'low') {
      const len = rng.int(8, 12);
      b.fill(x, x + len - 1, 11, 14, 'G');
      b.fill(x, x + len - 1, 3, 6, 'G');
      x += len;
    } else if (seg === 'steps') {
      b.fill(x, x + 9, 11, 14, 'G');
      b.fill(x + 2, x + 3, 9, 10, 'G'); b.fill(x + 4, x + 5, 7, 10, 'G'); b.fill(x + 6, x + 7, 9, 10, 'G');
      if (firebars > 0) { firebars--; b.set(x + 5, 6, 'G'); b.spawn('firebar', x + 5, 6, { len: 5, dir: 1, speed: 0.02 + d * 0.01 }); }
      x += 10;
    }
    void segCount;
  }
  if (spec.waterSection) {
    // Pipe down into an underwater passage that comes back beyond a wall.
    b.fill(x, x + 8, 11, 14, 'G');
    const p = b.pipe(x + 3, 2, 11);
    b.fill(x + 7, x + 8, 3, 10, 'G');
    a.pipes.push({ col: p.col, row: p.row, dir: 'down', to: 'water', exitCol: x + 11, exitPipe: false });
    a.sub = a.sub || [];
    a.sub.push({ id: 'water', kind: 'water' });
    x += 9;
  }
  b.fill(x, bossStart - 1, 11, 14, 'G');
  // Boss bridge over lava, axe, captive room.
  const B0 = bossStart;
  b.fill(B0, B0 + 12, 11, 11, '=');
  b.fill(B0, B0 + 12, 13, 14, 'L');
  b.fill(B0 - 3, B0 - 1, 7, 7, 'G');
  b.fill(B0 + 13, B0 + 15, 10, 14, 'G');
  b.set(B0 + 13, 9, 'X');
  b.fill(B0 + 16, W - 1, 11, 14, 'G');
  b.fill(W - 1, W - 1, 3, 10, 'G');
  b.spawn('boss', B0 + 9, 9, { hp: 5, minCol: B0 + 2, maxCol: B0 + 11, hammers: !!spec.bossHammers, worldNo: spec.boss || 1 });
  b.spawn('captive', B0 + 22, 10, { final: !!spec.final });
  a.end = { kind: 'axe', col: B0 + 13, row: 9, bridge: [B0, B0 + 12], bridgeRow: 11 };
  a.checkpoint = Math.floor(W / 2);
  const en = spec.enemies || {};
  if (Object.keys(en).length) placeEnemies(b, spec, 20, B0 - 8, erng);
  return a;
}

// ---------------------------------------------------------------- sub-areas
function genSubArea(kind, level, rng) {
  const spec = level.spec;
  if (kind === 'outro') {
    const a = newArea('outro', spec.night ? 'night' : 'overworld', 40);
    const b = new Builder(a, rng);
    b.ground(0, 39);
    b.pipe(1, 2);
    a.start = { col: 1.5, row: 10, fromPipe: true };
    b.flagEnd(8);
    decorate(b, rng, a.theme);
    return a;
  }
  if (kind.startsWith('bonus')) {
    const a = newArea(kind, 'underground', 16);
    const b = new Builder(a, rng);
    b.ground(0, 15);
    b.fill(0, 0, 0, 12, 'B');
    b.fill(1, 15, 2, 2, 'B');
    b.fill(14, 15, 3, 12, 'B');
    for (let r = 6; r <= 12; r += 2) b.coins(3, 11, r);
    b.fill(1, 2, 3, 12, ' ');
    const sp = b.sidePipe(12, GROUND_ROW);
    a.pipes.push({ col: sp.col, row: sp.row, dir: 'right', to: 'main' });
    a.start = { col: 1.5, row: 3, drop: true };
    return a;
  }
  if (kind === 'heaven') {
    const a = newArea('heaven', 'overworld', 64);
    a.heaven = true;
    const b = new Builder(a, rng);
    b.fill(0, 44, 11, 11, 'c');
    b.coins(8, 42, 8);
    b.coins(12, 38, 5);
    a.start = { col: 1, row: 13, climb: true };
    decorate(b, rng, 'athletic');
    return a;
  }
  if (kind === 'water') {
    const a = newArea('water', 'underwater', 64);
    a.water = true;
    const b = new Builder(a, rng);
    b.ground(0, 63);
    b.fill(0, 63, 0, 1, '#');
    for (let c = 8; c < 52; c += 7) { b.fill(c, c + 1, GROUND_ROW - rng.int(2, 4), GROUND_ROW - 1, '#'); b.coins(c - 2, c + 3, 6); }
    b.fill(56, 63, 0, 12, '#');
    b.fill(50, 55, 11, 12, '#');
    const sp = b.sidePipe(54, 11);
    a.pipes.push({ col: sp.col, row: sp.row, dir: 'right', to: 'main' });
    a.start = { col: 2, row: 4, drop: true };
    for (let i = 0; i < 3; i++) b.spawn('fish', 15 + i * 12, rng.int(5, 9));
    return a;
  }
  return null;
}

// ---------------------------------------------------------------- entry point
function generateLevel(spec) {
  const terrainKey = spec.random ? 'R' + spec.seed : (spec.remixOf || spec.id);
  const seed = spec.random ? spec.seed : hashString('brick-kingdom:' + terrainKey);
  const rng = makeRng(seed);
  const erng = makeRng(spec.random ? spec.seed * 7 + 3 : hashString('enemies:' + spec.id));
  const world = spec.world || parseInt(spec.id, 10) || 1;
  const d = clamp((world - 1) / 7, 0, 1);
  let main;
  // Remixes reuse the base level's terrain but this level's enemies and features.
  const terrainSpec = spec.remixOf ? { ...findLevel(spec.remixOf), ...spec, len: findLevel(spec.remixOf).len } : spec;
  switch (spec.type) {
    case 'overworld': main = genOverworld(terrainSpec, rng, erng, d); break;
    case 'underground': main = genUnderground(terrainSpec, rng, erng, d); break;
    case 'underwater': main = genUnderwater(terrainSpec, rng, erng, d); break;
    case 'athletic': main = genAthletic(terrainSpec, rng, erng, d, false); break;
    case 'bridge': main = genAthletic(terrainSpec, rng, erng, d, true); break;
    case 'castle': main = genCastle(terrainSpec, rng, erng, d); break;
    default: main = genOverworld(terrainSpec, rng, erng, d);
  }
  if (spec.cannonsRandom) {
    for (let i = 0; i < 4; i++) {
      const c = rng.int(20, main.w - 30);
      const s = new Builder(main, rng).surface(c, 4);
      if (s > 0 && main.grid[s - 1][c] === ' ' && main.grid[s - 2][c] === ' ') main.grid[s - 1][c] = 'N';
    }
  }
  const level = { spec, world, d, areas: { main } };
  (main.sub || []).forEach((s) => {
    level.areas[s.id] = genSubArea(s.id.startsWith('bonus') ? s.id : s.kind, level, makeRng(seed + s.id.length * 101));
  });
  return level;
}

// Rough reachability check: can a running hero get from the start to the goal?
// Ignores enemies and head clearance; treats moving platforms as standable along their path.
function levelReachable(area) {
  if (area.water) return true;
  const W = area.w;
  const solid = (c, r) => c < 0 || c >= W ? true : r < 0 || r >= ROWS ? false : SOLID.has(area.grid[r][c]);
  const extra = new Set();
  for (const s of area.spawns) {
    if (s.type !== 'platform') continue;
    const w = s.width || 3;
    if (s.mode === 'horizontal') { for (let c = s.col; c < s.col + w + Math.ceil((s.range || 0) / TILE); c++) extra.add((s.row - 1) * W + c); }
    else if (s.mode === 'vertical') { const k = Math.ceil((s.range || 0) / 32); for (let r = s.row - k; r <= s.row + k; r++) for (let c = s.col; c < s.col + w; c++) extra.add((r - 1) * W + c); }
    else for (let c = s.col; c < s.col + w; c++) extra.add((s.row - 1) * W + c);
  }
  const stand = (c, r) => c >= 0 && c < W && r >= 0 && r < ROWS && !solid(c, r) && area.grid[r][c] !== 'L' && (solid(c, r + 1) || extra.has(r * W + c));
  let goal = W - 2;
  if (area.end && area.end.kind === 'flag') goal = area.end.col - 2;
  else if (area.end && area.end.kind === 'axe') goal = area.end.col - 1;
  else { const p = area.pipes.find((q) => q.dir === 'right'); if (p) goal = p.col - 1; }
  let sc = Math.floor(area.start.col); let sr = area.start.row;
  while (sr < ROWS - 1 && !stand(sc, sr)) sr++;
  const seen = new Uint8Array(W * ROWS);
  const queue = [[sc, sr]];
  seen[sr * W + sc] = 1;
  while (queue.length) {
    const [c, r] = queue.shift();
    if (c >= goal) return true;
    for (let dc = -8; dc <= 8; dc++) {
      for (let r2 = Math.max(0, r - 4); r2 < ROWS; r2++) {
        const c2 = c + dc;
        if (c2 < 0 || c2 >= W || seen[r2 * W + c2]) continue;
        const rise = r - r2;
        const reach = rise >= 0 ? 7 - rise : 7 + Math.floor(-rise / 2);
        if (Math.abs(dc) > reach) continue;
        if (!stand(c2, r2)) continue;
        seen[r2 * W + c2] = 1;
        queue.push([c2, r2]);
      }
    }
  }
  return false;
}

// Area grids as plain strings (used by tests and the level viewer).
function areaToText(area) { return area.grid.map((row) => row.join('')).join('\n'); }

if (typeof module !== 'undefined') module.exports = { generateLevel, areaToText, levelReachable, SOLID };
