// Web Audio: synthesized sound effects and short original looping tunes.
const Audio = {
  ctx: null,
  master: null,
  musicGain: null,
  volume: 0.5,
  muted: false,
  track: null,
  fast: false,
  nextNoteTime: 0,
  step: 0,
  timer: null,

  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.35;
      this.musicGain.connect(this.master);
      this.applyVolume();
      this.timer = setInterval(() => this.schedule(), 50);
      return true;
    } catch (e) { return false; }
  },
  applyVolume() {
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume * 0.6;
  },
  setVolume(v) { this.volume = v; this.applyVolume(); },
  toggleMute() { this.muted = !this.muted; this.applyVolume(); return this.muted; },

  tone(freq, dur, type = 'square', vol = 0.25, slideTo = null, when = 0, dest = null) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest || this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol = 0.2) {
    if (!this.ctx) return;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = this.ctx.createBufferSource();
    const g = this.ctx.createGain();
    g.gain.value = vol;
    s.buffer = buf; s.connect(g); g.connect(this.master); s.start();
  },
  sfx(name) {
    if (!this.ctx || this.muted) return;
    const T = (f, d, ty, v, s, w) => this.tone(f, d, ty, v, s, w);
    switch (name) {
      case 'jump': T(260, 0.16, 'square', 0.18, 620); break;
      case 'jumpBig': T(200, 0.18, 'square', 0.18, 520); break;
      case 'stomp': T(420, 0.08, 'square', 0.2, 180); break;
      case 'coin': T(988, 0.06, 'square', 0.18); T(1319, 0.25, 'square', 0.18, null, 0.06); break;
      case 'bump': T(140, 0.08, 'triangle', 0.35, 90); break;
      case 'break': this.noise(0.18, 0.3); T(180, 0.12, 'triangle', 0.3, 60); break;
      case 'appear': [392, 494, 587, 784].forEach((f, i) => T(f, 0.07, 'square', 0.15, null, i * 0.05)); break;
      case 'powerup': [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => T(f, 0.06, 'square', 0.16, null, i * 0.045)); break;
      case 'oneup': [659, 784, 1319, 1047, 1175, 1568].forEach((f, i) => T(f, 0.09, 'square', 0.16, null, i * 0.08)); break;
      case 'fireball': T(800, 0.06, 'square', 0.12, 300); break;
      case 'kick': T(600, 0.06, 'square', 0.18, 900); break;
      case 'hurt': [740, 554, 440, 370].forEach((f, i) => T(f, 0.08, 'square', 0.16, null, i * 0.07)); break;
      case 'pipe': [200, 150, 110, 200, 150, 110].forEach((f, i) => T(f, 0.06, 'square', 0.15, null, i * 0.08)); break;
      case 'die': [494, 698, 698, 698, 659, 587, 523, 330].forEach((f, i) => T(f, 0.12, 'square', 0.18, null, 0.2 + i * 0.13)); break;
      case 'flag': T(200, 0.9, 'square', 0.15, 1200); break;
      case 'clear': [523, 659, 784, 1047, 880, 1047, 1319].forEach((f, i) => T(f, 0.14, 'square', 0.16, null, i * 0.14)); break;
      case 'tally': T(1760, 0.03, 'square', 0.08); break;
      case 'bossHit': T(300, 0.12, 'sawtooth', 0.2, 120); break;
      case 'bossFire': T(180, 0.3, 'sawtooth', 0.14, 90); break;
      case 'bridge': this.noise(0.12, 0.2); break;
      case 'vine': [262, 330, 392, 523, 659, 784].forEach((f, i) => T(f, 0.06, 'triangle', 0.25, null, i * 0.06)); break;
      case 'pause': T(660, 0.08, 'square', 0.15); T(880, 0.12, 'square', 0.15, null, 0.09); break;
      case 'hurry': [880, 932, 988].forEach((f, i) => T(f, 0.1, 'square', 0.16, null, i * 0.12)); break;
      case 'warp': [1047, 784, 523, 392].forEach((f, i) => T(f, 0.1, 'triangle', 0.25, null, i * 0.09)); break;
    }
  },

  // ---- Music: original melodies on a 16th-note grid; 0 = rest. Lead + bass. ----
  tunes: {
    overworld: {
      tempo: 150,
      lead: [72, 0, 76, 79, 0, 76, 74, 0, 72, 74, 76, 0, 67, 0, 0, 0, 69, 0, 72, 76, 0, 74, 72, 0, 71, 72, 74, 0, 79, 0, 0, 0,
             72, 0, 76, 79, 0, 81, 79, 0, 76, 77, 79, 0, 84, 0, 83, 0, 81, 0, 79, 77, 0, 76, 74, 0, 72, 0, 74, 0, 72, 0, 0, 0],
      bass: [48, 0, 55, 0, 48, 0, 55, 0, 53, 0, 60, 0, 53, 0, 60, 0, 45, 0, 52, 0, 45, 0, 52, 0, 43, 0, 50, 0, 43, 0, 50, 0,
             48, 0, 55, 0, 48, 0, 55, 0, 53, 0, 60, 0, 53, 0, 60, 0, 50, 0, 57, 0, 43, 0, 50, 0, 48, 0, 43, 0, 48, 0, 0, 0],
    },
    underground: {
      tempo: 120,
      lead: [60, 0, 0, 63, 0, 0, 67, 0, 66, 0, 0, 0, 63, 0, 0, 0, 58, 0, 0, 62, 0, 0, 65, 0, 63, 0, 0, 0, 0, 0, 0, 0],
      bass: [36, 0, 36, 0, 0, 0, 43, 0, 36, 0, 36, 0, 0, 0, 42, 0, 34, 0, 34, 0, 0, 0, 41, 0, 34, 0, 34, 0, 39, 0, 41, 0],
    },
    underwater: {
      tempo: 110,
      lead: [67, 0, 0, 71, 0, 0, 74, 0, 0, 0, 72, 0, 71, 0, 0, 0, 69, 0, 0, 72, 0, 0, 76, 0, 0, 0, 74, 0, 72, 0, 0, 0,
             67, 0, 0, 71, 0, 0, 74, 0, 0, 0, 79, 0, 78, 0, 0, 0, 76, 0, 74, 0, 72, 0, 71, 0, 69, 0, 0, 0, 67, 0, 0, 0],
      bass: [43, 0, 0, 0, 50, 0, 0, 0, 43, 0, 0, 0, 50, 0, 0, 0, 45, 0, 0, 0, 52, 0, 0, 0, 45, 0, 0, 0, 52, 0, 0, 0,
             43, 0, 0, 0, 50, 0, 0, 0, 40, 0, 0, 0, 47, 0, 0, 0, 38, 0, 0, 0, 45, 0, 0, 0, 43, 0, 0, 0, 50, 0, 0, 0],
    },
    castle: {
      tempo: 140,
      lead: [62, 65, 68, 65, 62, 65, 68, 71, 61, 64, 67, 64, 61, 64, 67, 70, 62, 65, 68, 65, 62, 65, 68, 71, 63, 66, 69, 66, 63, 66, 69, 72],
      bass: [38, 0, 38, 0, 38, 0, 38, 0, 37, 0, 37, 0, 37, 0, 37, 0, 38, 0, 38, 0, 38, 0, 38, 0, 39, 0, 39, 0, 39, 0, 39, 0],
    },
    star: {
      tempo: 190,
      lead: [72, 72, 0, 76, 0, 79, 0, 76, 74, 74, 0, 77, 0, 81, 0, 77, 72, 72, 0, 76, 0, 79, 0, 84, 83, 0, 79, 0, 76, 0, 74, 0],
      bass: [48, 0, 60, 0, 48, 0, 60, 0, 50, 0, 62, 0, 50, 0, 62, 0, 48, 0, 60, 0, 48, 0, 60, 0, 43, 0, 55, 0, 43, 0, 55, 0],
    },
  },
  play(name) {
    if (this.track === name) return;
    this.track = name;
    this.step = 0;
    if (this.ctx) this.nextNoteTime = this.ctx.currentTime + 0.05;
  },
  stop() { this.track = null; },
  setFast(f) { this.fast = f; },
  midi(n) { return 440 * Math.pow(2, (n - 69) / 12); },
  schedule() {
    if (!this.ctx || !this.track) return;
    const tune = this.tunes[this.track];
    if (!tune) return;
    const spb = 60 / (tune.tempo * (this.fast ? 1.35 : 1)) / 4;
    while (this.nextNoteTime < this.ctx.currentTime + 0.15) {
      const when = this.nextNoteTime - this.ctx.currentTime;
      const i = this.step % tune.lead.length;
      const l = tune.lead[i];
      const b = tune.bass[this.step % tune.bass.length];
      if (l) this.tone(this.midi(l), spb * 1.6, 'square', 0.09, null, Math.max(0, when), this.musicGain);
      if (b) this.tone(this.midi(b), spb * 1.8, 'triangle', 0.22, null, Math.max(0, when), this.musicGain);
      this.step++;
      this.nextNoteTime += spb;
    }
  },
};
