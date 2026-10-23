// Hero, enemies, items and projectiles. Every entity serializes as its plain fields.
const STOMP_SCORES = [100, 200, 400, 500, 800, 1000, 2000, 4000, 5000, 8000];

class Entity {
  constructor(x, y, w, h) {
    this.type = this.constructor.name;
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.vx = 0; this.vy = 0; this.facing = -1;
    this.dead = false; this.onGround = false; this.t = 0;
  }
  get cx() { return this.x + this.w / 2; }
  get bottom() { return this.y + this.h; }
  serialize() {
    const o = {};
    for (const k of Object.keys(this)) {
      const v = this[k];
      if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean' || v === null) o[k] = v;
    }
    return o;
  }
  // Defaults; enemies override.
  get harmful() { return false; }
  get stompable() { return false; }
  get fireproof() { return false; }
  update() {}
}

// ------------------------------------------------------------------ hero
class Hero extends Entity {
  constructor(x, y) {
    super(x, y, 12, 14);
    this.form = 'small';
    this.facing = 1;
    this.coyote = 0; this.jumpBuf = 0; this.jumping = false;
    this.crouch = false; this.invuln = 0; this.star = 0;
    this.climbing = false; this.pose = 'stand'; this.anim = 0;
    this.chain = 0; this.dyingT = 0; this.skid = false; this.fireCool = 0;
  }
  get big() { return this.form !== 'small'; }
  setForm(form) {
    const wasBig = this.big;
    this.form = form;
    const h = this.big ? 28 : 14;
    if (this.big && !wasBig) this.y -= 14;
    if (!this.big && wasBig) this.y += 14;
    this.h = h;
  }
  update(world) {
    const I = Input.now;
    const P = Input.pressed;
    const water = world.area.water;
    const forgiving = world.settings.forgiving;
    if (this.invuln > 0) this.invuln--;
    if (this.star > 0) { this.star--; if (this.star === 0) world.restoreMusic(); }
    if (this.fireCool > 0) this.fireCool--;

    if (this.climbing) return this.updateClimb(world);

    const dir = (I.right ? 1 : 0) - (I.left ? 1 : 0);
    // Crouch (big form only, on the ground).
    const wantCrouch = this.big && I.down && this.onGround && !water;
    if (wantCrouch !== this.crouch) {
      if (wantCrouch) { this.crouch = true; this.y += 10; this.h = 18; }
      else if (world.canStand(this)) { this.crouch = false; this.y -= 10; this.h = 28; }
    }
    // Horizontal
    let max = I.run ? PHYS.runMax : PHYS.walkMax;
    if (water) max = this.onGround ? PHYS.seabedMax : PHYS.swimMax;
    let accel = I.run ? PHYS.runAccel : PHYS.walkAccel;
    this.skid = false;
    if (dir && !this.crouch) {
      if (sign(this.vx) === -dir && this.vx !== 0) { accel *= 2; if (this.onGround) this.skid = true; }
      this.vx += dir * accel;
      if (Math.abs(this.vx) > max) {
        if (sign(this.vx) === dir) this.vx = sign(this.vx) * Math.max(max, Math.abs(this.vx) - PHYS.friction);
      }
      if (this.onGround) this.facing = dir;
      else if (water) this.facing = dir;
    } else if (this.onGround) {
      const f = PHYS.friction;
      if (Math.abs(this.vx) <= f) this.vx = 0; else this.vx -= sign(this.vx) * f;
    }
    // Vertical
    if (water) {
      if (P.jump) { this.vy = -PHYS.swimStroke; Audio.sfx('stomp'); }
      this.vy = Math.min(this.vy + PHYS.swimGravity, PHYS.swimMaxFall);
      if (this.y < 20) { this.y = 20; if (this.vy < 0) this.vy = 0; }
    } else {
      if (this.onGround) { this.coyote = forgiving ? PHYS.coyote : 1; this.chain = 0; }
      else if (this.coyote > 0) this.coyote--;
      if (P.jump) this.jumpBuf = forgiving ? PHYS.buffer : 1;
      else if (this.jumpBuf > 0) this.jumpBuf--;
      if (this.jumpBuf > 0 && this.coyote > 0) {
        const speedFrac = Math.min(1, Math.abs(this.vx) / PHYS.runMax);
        this.vy = -(PHYS.jumpMin + (PHYS.jumpMax - PHYS.jumpMin) * speedFrac);
        this.jumping = true; this.coyote = 0; this.jumpBuf = 0; this.onGround = false;
        Audio.sfx(this.big ? 'jumpBig' : 'jump');
      }
      const g = this.jumping && I.jump && this.vy < 0 ? PHYS.gravityHold : PHYS.gravity;
      if (this.vy >= 0) this.jumping = false;
      this.vy = Math.min(this.vy + g, PHYS.maxFall);
    }
    // Fireballs
    if (P.run && this.form === 'fire' && !this.crouch && world.countType('Fireball') < 2 && this.fireCool === 0) {
      world.add(new Fireball(this.facing > 0 ? this.x + this.w : this.x - 6, this.y + 4, this.facing));
      this.fireCool = 8;
      Audio.sfx('fireball');
    }
    const prevVy = this.vy;
    world.moveEntity(this, true);
    if (this.hitCeil && prevVy < 0) world.headBump(this);
    // Animation pose
    if (!this.onGround && !water) this.pose = 'jump';
    else if (this.crouch) this.pose = 'crouch';
    else if (this.skid) this.pose = 'skid';
    else if (Math.abs(this.vx) > 0.05 || (water && !this.onGround)) {
      this.anim += Math.max(0.12, Math.abs(this.vx) * 0.13) + (water && !this.onGround ? 0.08 : 0);
      this.pose = ['walk1', 'walk2', 'walk3'][Math.floor(this.anim) % 3];
    } else this.pose = 'stand';
    // Vines
    if ((I.up || (!this.onGround && I.up)) && world.vineAt(this)) {
      this.climbing = true; this.vx = 0; this.vy = 0;
      const v = world.vineAt(this);
      this.x = v.x + (this.facing > 0 ? -this.w + 6 : 2);
    }
  }
  updateClimb(world) {
    const I = Input.now;
    const v = world.vineAt(this);
    if (!v) { this.climbing = false; return; }
    this.vy = I.up ? -1 : I.down ? 1 : 0;
    this.y += this.vy;
    this.anim += Math.abs(this.vy) * 0.1;
    this.pose = Math.floor(this.anim) % 2 ? 'walk1' : 'walk2';
    if (this.y < -this.h && world.area.hasHeaven) { world.enterHeaven(); return; }
    if (this.y < 0 && !world.area.hasHeaven) this.y = 0;
    if (Input.pressed.jump || (I.left && this.facing > 0) || (I.right && this.facing < 0)) {
      this.climbing = false; this.vx = (I.left ? -1 : I.right ? 1 : -this.facing); this.vy = -2;
    }
    if (I.down && world.solidBelow(this)) this.climbing = false;
  }
  hurt(world) {
    if (this.invuln > 0 || this.star > 0 || world.state !== 'play') return;
    if (this.big) {
      if (this.crouch) { this.crouch = false; this.y -= 10; this.h = 28; }
      this.setForm('small');
      this.invuln = 120;
      Audio.sfx('hurt');
    } else {
      world.killHero();
    }
  }
  spriteName() {
    const size = this.big ? 'big' : 'small';
    let pose = this.pose;
    if (this.dyingT > 0) pose = 'die';
    if (!this.big && pose === 'crouch') pose = 'stand';
    let pal = this.form === 'fire' ? 'fire' : 'normal';
    if (this.star > 0) pal = ['star1', 'star2', 'star3', this.form === 'fire' ? 'fire' : 'normal'][Math.floor(this.star / 3) % 4];
    return `hero:${size}:${pose}:${pal}`;
  }
}

// ------------------------------------------------------------------ enemies
class Enemy extends Entity {
  constructor(x, y, w, h) { super(x, y, w, h); this.speed = 0.5; this.vx = -0.5; this.squash = 0; this.falling = false; this.red = false; }
  get harmful() { return !this.falling && this.squash === 0; }
  get stompable() { return true; }
  patrol(world) {
    if (this.falling) { this.vy += 0.3; this.y += this.vy; this.x += this.vx; if (this.y > VIEW_H + 32) this.dead = true; return; }
    this.vy = Math.min(this.vy + 0.3, 4);
    const before = this.vx;
    world.moveEntity(this, false);
    if (this.hitWall) this.vx = -before;
    if (this.red && this.onGround && world.ledgeAhead(this)) this.vx = -this.vx;
    if (this.vx) this.facing = sign(this.vx);
    if (this.y > VIEW_H + 16) this.dead = true;
  }
  knockOff(dirX = 1) { this.falling = true; this.vy = -3.5; this.vx = dirX * 0.8; }
  stomp(world) { this.dead = true; }
  hitByFire(world) { this.knockOff(1); world.addScore(200, this); Audio.sfx('kick'); }
  sprite() { return null; }
}

class Walker extends Enemy {
  constructor(x, y) { super(x, y, 14, 12); }
  update(world) {
    this.t++;
    if (this.squash > 0) { if (--this.squash === 0) this.dead = true; return; }
    this.patrol(world);
  }
  stomp(world) { this.squash = 30; this.vx = 0; Audio.sfx('stomp'); }
  sprite() { return this.squash ? 'walkerFlat' : (Math.floor(this.t / 10) % 2 ? 'walker1' : 'walker2'); }
}

class Snail extends Enemy {
  constructor(x, y, red) { super(x, y, 14, 11); this.red = !!red; this.state = 'walk'; this.shellT = 0; this.wings = false; this.flyBase = y; this.kickGrace = 0; this.beetle = false; }
  get fireproof() { return this.beetle; }
  get harmful() { return !this.falling && !(this.state === 'shell' && this.vx === 0) && this.kickGrace === 0; }
  update(world) {
    this.t++;
    if (this.kickGrace > 0) this.kickGrace--;
    if (this.falling) return this.patrol(world);
    if (this.wings && !this.red) {
      // Hopping flyer
      this.vy = Math.min(this.vy + 0.2, 4);
      world.moveEntity(this, false);
      if (this.hitWall) this.vx = -this.vx;
      if (this.onGround) this.vy = -4;
      if (this.vx) this.facing = sign(this.vx);
      if (this.y > VIEW_H + 16) this.dead = true;
      return;
    }
    if (this.wings && this.red) {
      // Vertical patrol in the air
      this.y = this.flyBase + Math.sin(this.t / 50) * 40;
      this.facing = world.hero.cx < this.cx ? -1 : 1;
      return;
    }
    if (this.state === 'shell') {
      if (this.vx === 0) { this.shellT++; if (this.shellT > 420) { this.state = 'walk'; this.vx = -this.speed; this.h = 11; } }
      this.vy = Math.min(this.vy + 0.3, 4);
      const before = this.vx;
      world.moveEntity(this, false);
      if (this.hitWall) { this.vx = -before; if (world.onScreen(this)) Audio.sfx('bump'); }
      if (this.y > VIEW_H + 16) this.dead = true;
      return;
    }
    this.patrol(world);
  }
  stomp(world) {
    Audio.sfx('stomp');
    if (this.wings) { this.wings = false; this.vx = -this.speed; this.vy = 0; return; }
    if (this.state === 'walk') { this.state = 'shell'; this.vx = 0; this.shellT = 0; this.h = 10; this.y += 1; return; }
    if (this.state === 'shell' && this.vx !== 0) { this.vx = 0; this.shellT = 0; return; }
    this.kick(world, world.hero.cx < this.cx ? 1 : -1);
  }
  kick(world, dir) { this.vx = dir * 3.2; this.kickGrace = 10; this.shellT = 0; Audio.sfx('kick'); world.addScore(400, this); }
  sprite() {
    if (this.state === 'shell' || this.falling) return 'shell';
    return Math.floor(this.t / 12) % 2 ? 'snail1' : 'snail2';
  }
  variant() { return this.beetle ? 'beetle' : this.red ? 'red' : null; }
}

class Plant extends Enemy {
  constructor(x, y) { super(x, y, 12, 20); this.baseY = y; this.phase = 'hidden'; this.timer = 60; this.vx = 0; this.offset = 24; }
  get harmful() { return this.offset < 20 && !this.falling; }
  get stompable() { return false; }
  update(world) {
    this.t++;
    if (this.falling) { this.dead = true; return; }
    const near = Math.abs(world.hero.cx - this.cx) < 26;
    if (this.phase === 'hidden') { if (--this.timer <= 0 && !near) this.phase = 'rising'; }
    else if (this.phase === 'rising') { this.offset -= 0.5; if (this.offset <= 0) { this.offset = 0; this.phase = 'up'; this.timer = 60; } }
    else if (this.phase === 'up') { if (--this.timer <= 0) this.phase = 'lowering'; }
    else if (this.phase === 'lowering') { this.offset += 0.5; if (this.offset >= 24) { this.offset = 24; this.phase = 'hidden'; this.timer = 70; } }
    this.y = this.baseY - 20 + this.offset;
  }
  hitByFire(world) { this.dead = true; world.addScore(200, this); Audio.sfx('kick'); }
  sprite() { return Math.floor(this.t / 8) % 2 ? 'plant1' : 'plant2'; }
  variant() { return 'biter'; }
}

class Thrower extends Enemy {
  constructor(x, y) { super(x, y, 14, 16); this.homeX = x; this.vx = 0.4; this.throwT = 60; this.jumpT = 120; this.throwing = 0; }
  update(world) {
    this.t++;
    if (this.falling) return this.patrol(world);
    this.facing = world.hero.cx < this.cx ? -1 : 1;
    if (this.x < this.homeX - 16) this.vx = 0.4;
    if (this.x > this.homeX + 16) this.vx = -0.4;
    this.vy = Math.min(this.vy + 0.25, 4);
    world.moveEntity(this, false);
    if (this.hitWall) this.vx = -this.vx;
    if (this.onGround && --this.jumpT <= 0) { this.vy = -4.5; this.jumpT = 100 + Math.floor(Math.random() * 120); }
    if (world.onScreen(this) && --this.throwT <= 0) {
      this.throwing = 12;
      world.add(new Wrench(this.cx - 4, this.y - 4, this.facing));
      this.throwT = 40 + Math.floor(Math.random() * 60);
    }
    if (this.throwing > 0) this.throwing--;
    if (this.y > VIEW_H + 16) this.dead = true;
  }
  stomp(world) { this.knockOff(world.hero.cx < this.cx ? 1 : -1); Audio.sfx('stomp'); }
  hitByFire(world) { this.knockOff(1); world.addScore(1000, this); Audio.sfx('kick'); }
  sprite() { return this.throwing ? 'thrower2' : (Math.floor(this.t / 15) % 2 ? 'thrower1' : 'thrower1'); }
}

class Wrench extends Enemy {
  constructor(x, y, dir) { super(x, y, 8, 8); this.vx = dir * 1.3; this.vy = -3.8; this.spin = 0; }
  get stompable() { return false; }
  get fireproof() { return true; }
  update() { this.vy += 0.16; this.x += this.vx; this.y += this.vy; this.spin++; if (this.y > VIEW_H + 16) this.dead = true; }
  sprite() { return 'wrench'; }
}

class Rider extends Enemy {
  constructor(x, y) { super(x, y, 16, 13); this.vx = 0; this.throwT = 120; this.leaveCol = 9999; this.leaving = false; }
  update(world) {
    this.t++;
    if (this.falling) return this.patrol(world);
    const hero = world.hero;
    if (hero.x > this.leaveCol * TILE) this.leaving = true;
    if (this.leaving) { this.x += 2.5; if (this.x > world.camX + VIEW_W + 40) this.dead = true; return; }
    const target = hero.cx + Math.sin(this.t / 90) * 70 + hero.vx * 30;
    const dx = target - this.cx;
    this.vx = clamp(this.vx + sign(dx) * 0.06, -2.6, 2.6);
    if (Math.abs(dx) < 8) this.vx *= 0.9;
    this.x += this.vx;
    this.x = Math.max(this.x, world.camX - 8);
    this.y = 38 + Math.sin(this.t / 30) * 3;
    this.facing = hero.cx < this.cx ? -1 : 1;
    if (--this.throwT <= 0) {
      this.throwT = 150;
      if (world.countType('Spiky') + world.countType('Egg') < 3) world.add(new Egg(this.cx - 4, this.y - 6));
    }
  }
  stomp(world) { this.knockOff(1); world.riderGone(this); Audio.sfx('stomp'); }
  hitByFire(world) { this.knockOff(1); world.addScore(200, this); world.riderGone(this); }
  sprite() { return 'rider'; }
}

class Egg extends Enemy {
  constructor(x, y) { super(x, y, 8, 7); this.vx = 0; this.vy = -2.5; }
  get stompable() { return false; }
  update(world) {
    this.vy = Math.min(this.vy + 0.15, 3);
    world.moveEntity(this, false);
    if (this.onGround) {
      const s = new Spiky(this.x - 3, this.y - 3);
      s.vx = world.hero.cx < this.cx ? -0.5 : 0.5;
      world.add(s); this.dead = true;
    }
    if (this.y > VIEW_H + 16) this.dead = true;
  }
  sprite() { return 'egg'; }
}

class Spiky extends Enemy {
  constructor(x, y) { super(x, y, 14, 10); }
  get stompable() { return false; }
  update(world) { this.t++; this.patrol(world); }
  sprite() { return Math.floor(this.t / 10) % 2 ? 'spiky1' : 'spiky2'; }
}

class Bullet extends Enemy {
  constructor(x, y, dir) { super(x, y, 16, 8); this.vx = dir * 1.6; this.facing = dir; }
  get fireproof() { return true; }
  update(world) {
    if (this.falling) { this.vy += 0.3; this.y += this.vy; if (this.y > VIEW_H + 16) this.dead = true; return; }
    this.x += this.vx;
    if (this.x < world.camX - 64 || this.x > world.camX + VIEW_W + 64) this.dead = true;
  }
  stomp(world) { this.falling = true; this.vy = 0; this.vx = 0; Audio.sfx('stomp'); }
  sprite() { return 'bullet'; }
}

class Fish extends Enemy {
  constructor(x, y) { super(x, y, 14, 8); this.baseY = y; this.vx = -(0.35 + Math.random() * 0.4); this.leaper = false; }
  get stompable() { return this.leaper; }
  update(world) {
    this.t++;
    if (this.falling) return this.patrol(world);
    if (this.leaper) {
      this.vy += 0.09; this.x += this.vx; this.y += this.vy;
      if (this.y > VIEW_H + 24 && this.vy > 0) this.dead = true;
    } else {
      this.x += this.vx;
      this.y = this.baseY + Math.sin(this.t / 40) * 10;
    }
    this.facing = sign(this.vx) || -1;
    if (this.x < world.camX - 48) this.dead = true;
  }
  stomp(world) { this.knockOff(sign(this.vx)); Audio.sfx('stomp'); }
  sprite() { return Math.floor(this.t / 8) % 2 ? 'fish1' : 'fish2'; }
  variant() { return 'sea'; }
}

class Squid extends Enemy {
  constructor(x, y) { super(x, y, 12, 11); this.vx = 0; this.mode = 'sink'; this.modeT = 30; }
  get stompable() { return false; }
  update(world) {
    this.t++;
    if (this.falling) return this.patrol(world);
    const h = world.hero;
    if (--this.modeT <= 0) {
      if (this.mode === 'sink' && (h.y < this.y + 8)) { this.mode = 'jet'; this.modeT = 28; this.vy = -1.4; this.vx = sign(h.cx - this.cx) * 1.2; }
      else { this.mode = 'sink'; this.modeT = 30; }
    }
    if (this.mode === 'sink') { this.vx *= 0.92; this.vy = 0.45; }
    else { this.vx *= 0.97; this.vy *= 0.97; }
    this.x += this.vx; this.y += this.vy;
    this.y = clamp(this.y, 24, 13 * TILE - this.h);
    if (this.x < world.camX - 48) this.dead = true;
  }
  sprite() { return this.mode === 'jet' ? 'squid2' : 'squid1'; }
}

class Bubble extends Enemy {
  constructor(x, y) { super(x, y + 32, 12, 10); this.homeY = VIEW_H + 16; this.wait = 60 + Math.floor(Math.random() * 60); this.y = this.homeY; this.vx = 0; }
  get stompable() { return false; }
  get fireproof() { return true; }
  update() {
    if (this.wait > 0) { this.wait--; this.y = this.homeY; if (this.wait === 0) this.vy = -6.4; return; }
    this.vy += 0.15; this.y += this.vy;
    if (this.y >= this.homeY && this.vy > 0) { this.y = this.homeY; this.wait = 90; }
  }
  hitByFire() {}
  sprite() { return 'bubble'; }
}

class Firebar extends Enemy {
  constructor(x, y) { super(x, y, 8, 8); this.angle = 0; this.len = 5; this.dir = 1; this.speed = 0.02; }
  get harmful() { return false; }
  get stompable() { return false; }
  get fireproof() { return true; }
  update(world) {
    this.angle += this.speed * this.dir;
    const h = world.hero;
    const cx = this.x + 4; const cy = this.y + 4;
    for (let i = 0; i < this.len; i++) {
      const px = cx + Math.cos(this.angle) * i * 8;
      const py = cy + Math.sin(this.angle) * i * 8;
      if (px > h.x - 3 && px < h.x + h.w + 3 && py > h.y - 3 && py < h.y + h.h + 3) { h.hurt(world); break; }
    }
  }
  points() {
    const pts = [];
    for (let i = 0; i < this.len; i++) pts.push([this.x + 4 + Math.cos(this.angle) * i * 8, this.y + 4 + Math.sin(this.angle) * i * 8]);
    return pts;
  }
}

class BossFire extends Enemy {
  constructor(x, y, dir, targetY) { super(x, y, 22, 6); this.vx = dir * 1.2; this.targetY = targetY; this.facing = dir; }
  get stompable() { return false; }
  get fireproof() { return true; }
  update(world) {
    this.x += this.vx;
    this.y += clamp(this.targetY - this.y, -0.5, 0.5);
    if (this.x < world.camX - 40 || this.x > world.camX + VIEW_W + 40) this.dead = true;
  }
  sprite() { return 'breath'; }
}

class Boss extends Enemy {
  constructor(x, y) {
    super(x, y, 26, 28); this.hp = 5; this.minCol = 0; this.maxCol = 0; this.hammers = false; this.worldNo = 1;
    this.vx = -0.4; this.fireT = 90; this.jumpT = 140; this.hammerT = 60; this.flash = 0; this.dropping = false;
  }
  get stompable() { return false; }
  get harmful() { return !this.falling && !this.dropping; }
  update(world) {
    this.t++;
    if (this.flash > 0) this.flash--;
    if (this.falling || this.dropping) {
      this.vy += 0.2; this.y += this.vy;
      if (this.y > VIEW_H + 40) this.dead = true;
      return;
    }
    const h = world.hero;
    this.facing = h.cx < this.cx ? -1 : 1;
    if (this.x < this.minCol * TILE) this.vx = 0.4;
    if (this.x > this.maxCol * TILE) this.vx = -0.4;
    if (Math.random() < 0.005) this.vx = -this.vx;
    this.vy = Math.min(this.vy + 0.2, 4);
    world.moveEntity(this, false);
    if (!this.onGround && this.y > 14 * TILE) { this.dropping = true; }
    if (this.onGround && --this.jumpT <= 0) { this.vy = -3.6; this.jumpT = 120 + Math.floor(Math.random() * 100); }
    if (world.onScreen(this) && --this.fireT <= 0) {
      this.fireT = 110 + Math.floor(Math.random() * 90);
      const ty = h.y + (h.big ? 8 : 2);
      world.add(new BossFire(this.facing < 0 ? this.x - 22 : this.x + this.w, this.y + 6, this.facing, ty));
      Audio.sfx('bossFire');
    }
    if (this.hammers && world.onScreen(this) && --this.hammerT <= 0) {
      this.hammerT = this.t % 300 < 120 ? 14 : 60;
      world.add(new Wrench(this.cx - 4, this.y - 6, this.facing));
    }
  }
  hitByFire(world) {
    this.hp--; this.flash = 10; Audio.sfx('bossHit');
    if (this.hp <= 0) { this.knockOff(0); world.addScore(5000, this); }
  }
  sprite() { return Math.floor(this.t / 20) % 2 ? 'boss1' : 'boss2'; }
}

class Captive extends Entity {
  constructor(x, y) { super(x, y, 16, 13); this.final = false; }
  sprite() { return 'captive'; }
}

// ------------------------------------------------------------------ platforms
class Platform extends Entity {
  constructor(x, y) {
    super(x, y, 48, 8); this.mode = 'vertical'; this.range = 64; this.speed = 0.6; this.width = 3;
    this.homeX = x; this.homeY = y; this.dx = 0; this.dy = 0; this.drop = false;
  }
  init() { this.w = this.width * TILE; this.homeX = this.x; this.homeY = this.y; }
  update(world) {
    this.t++;
    const ox = this.x; const oy = this.y;
    if (this.mode === 'vertical') this.y = this.homeY + (Math.sin(this.t * this.speed / 40) * 0.5 + 0.5) * this.range - this.range / 2;
    else if (this.mode === 'horizontal') this.x = this.homeX + (Math.sin(this.t * this.speed / 40) * 0.5 + 0.5) * this.range;
    else if (this.mode === 'falling') { if (this.drop) { this.vy = Math.min(this.vy + 0.12, 3); this.y += this.vy; } }
    this.dx = this.x - ox; this.dy = this.y - oy;
    if (this.y > VIEW_H + 40) this.dead = true;
  }
}

// ------------------------------------------------------------------ items & projectiles
class Item extends Entity {
  constructor(x, y, kind) { super(x, y, 14, 14); this.kind = kind; this.emerge = 16; this.vx = 0; }
  update(world) {
    this.t++;
    if (this.emerge > 0) { this.emerge -= 0.5; this.y -= 0.5; if (this.emerge <= 0 && this.kind !== 'bloom') this.vx = this.kind === 'star' ? 1 : 1; return; }
    if (this.kind === 'bloom') return;
    this.vy = Math.min(this.vy + (this.kind === 'star' ? 0.18 : 0.3), 4);
    const before = this.vx;
    world.moveEntity(this, false);
    if (this.hitWall) this.vx = -before;
    if (this.kind === 'star' && this.onGround) this.vy = -4;
    if (this.y > VIEW_H + 16) this.dead = true;
  }
  sprite() { return this.kind; }
}

class CoinPop extends Entity {
  constructor(x, y) { super(x, y, 12, 9); this.vy = -5; }
  update(world) { this.t++; this.vy += 0.32; this.y += this.vy; if (this.t > 30) { this.dead = true; world.popup(this.x, this.y, '200'); } }
  sprite() { return ['coin1', 'coin2', 'coin3', 'coin2'][Math.floor(this.t / 3) % 4]; }
}

class Fireball extends Entity {
  constructor(x, y, dir) { super(x, y, 6, 6); this.vx = dir * 3.6; this.vy = 1.5; this.facing = dir; }
  update(world) {
    this.t++;
    this.vy = Math.min(this.vy + 0.35, 4);
    world.moveEntity(this, false);
    if (this.onGround) this.vy = -3;
    if (this.hitWall || this.y > VIEW_H || this.x < world.camX - 16 || this.x > world.camX + VIEW_W + 16) this.dead = true;
  }
  sprite() { return Math.floor(this.t / 4) % 2 ? 'fireball1' : 'fireball2'; }
}

class Debris extends Entity {
  constructor(x, y, vx, vy) { super(x, y, 5, 4); this.vx = vx; this.vy = vy; }
  update() { this.vy += 0.3; this.x += this.vx; this.y += this.vy; if (this.y > VIEW_H + 8) this.dead = true; }
  sprite() { return 'debris'; }
}

class Spring extends Entity {
  constructor(x, y) { super(x, y, 16, 16); this.squash = 0; }
  update(world) {
    if (this.squash > 0) this.squash--;
    const h = world.hero;
    if (h.vy > 0 && h.x + h.w > this.x + 2 && h.x < this.x + this.w - 2 && h.y + h.h >= this.y + 4 && h.y + h.h <= this.y + 14) {
      h.y = this.y + 4 - h.h;
      h.vy = Input.now.jump ? -8.2 : -5.5;
      h.jumping = Input.now.jump; h.onGround = false;
      this.squash = 10;
      Audio.sfx('kick');
    }
  }
  sprite() { return this.squash ? 'spring2' : 'spring1'; }
}

class Vine extends Entity {
  constructor(x, y) { super(x, y, 8, 0); this.baseY = y; this.grow = true; }
  update() { if (this.grow) { this.y -= 1; this.h += 1; if (this.y <= -24) this.grow = false; } }
}

const ENTITY_TYPES = { Hero, Spring, Walker, Snail, Plant, Thrower, Wrench, Rider, Egg, Spiky, Bullet, Fish, Squid, Bubble, Firebar, BossFire, Boss, Captive, Platform, Item, CoinPop, Fireball, Debris, Vine };

function deserializeEntity(o) {
  const C = ENTITY_TYPES[o.type];
  if (!C) return null;
  const e = new C(o.x, o.y);
  Object.assign(e, o);
  return e;
}

// Build an entity from a level spawn record.
function spawnEntity(s) {
  const x = s.col * TILE; const y = s.row * TILE;
  let e;
  switch (s.type) {
    case 'walker': e = new Walker(x + 1, y + 4); break;
    case 'snail': case 'redsnail': e = new Snail(x + 1, y + 5, s.red); break;
    case 'flyer': case 'redflyer': e = new Snail(x + 1, y, s.type === 'redflyer'); e.wings = true; e.flyBase = y; e.vx = -0.5; break;
    case 'beetle': e = new Snail(x + 1, y + 5, false); e.beetle = true; break;
    case 'plant': e = new Plant(x + 10, y); break;
    case 'thrower': e = new Thrower(x + 1, y); break;
    case 'rider': e = new Rider(x, y); e.leaveCol = s.leaveCol || 9999; break;
    case 'fish': e = new Fish(x, y); break;
    case 'squid': e = new Squid(x, y); break;
    case 'bubble': e = new Bubble(x + 2, y); break;
    case 'firebar': e = new Firebar(x + 4, y + 4); e.len = s.len; e.dir = s.dir; e.speed = s.speed; e.angle = (s.col * 1.7) % 6.28; break;
    case 'platform': e = new Platform(x, y); e.mode = s.mode; e.range = s.range || 64; e.speed = s.speed || 0.6; e.width = s.width || 3; e.init(); break;
    case 'boss': e = new Boss(x, y - 12); e.hp = s.hp; e.minCol = s.minCol; e.maxCol = s.maxCol; e.hammers = s.hammers; e.worldNo = s.worldNo; break;
    case 'spring': e = new Spring(x, y); break;
    case 'captive': e = new Captive(x, y + 3); e.final = s.final; break;
    default: return null;
  }
  e.spawnId = s.id;
  return e;
}
