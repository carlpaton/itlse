// Save slots in localStorage: a manual "save anywhere" snapshot and a level-start
// auto-save per slot, plus settings. Every access is guarded; storage may be unavailable.
const SAVE_VERSION = 1;
const SAVE_PREFIX = 'platformer.';

const Save = {
  available() {
    try { const k = SAVE_PREFIX + 'probe'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return true; } catch (e) { return false; }
  },
  key(slot, kind) { return SAVE_PREFIX + 'slot' + slot + (kind === 'auto' ? '.auto' : ''); },
  write(slot, kind, data) {
    try {
      const snap = { version: SAVE_VERSION, savedAt: new Date().toISOString(), slot, kind, ...data };
      localStorage.setItem(this.key(slot, kind), JSON.stringify(snap));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: "Couldn't save — browser storage is unavailable or full." };
    }
  },
  read(slot, kind) {
    let raw;
    try { raw = localStorage.getItem(this.key(slot, kind)); } catch (e) { return { status: 'unavailable' }; }
    if (!raw) return { status: 'empty' };
    try {
      const snap = this.migrate(JSON.parse(raw));
      if (!this.valid(snap)) return { status: 'damaged' };
      return { status: 'ok', snap };
    } catch (e) { return { status: 'damaged' }; }
  },
  remove(slot) {
    try { localStorage.removeItem(this.key(slot, 'manual')); localStorage.removeItem(this.key(slot, 'auto')); return true; } catch (e) { return false; }
  },
  // Future versions add steps here, e.g. if (s.version === 1) { ...; s.version = 2; }
  migrate(s) {
    if (!s || typeof s !== 'object') return s;
    if (s.version === undefined) s.version = 1;
    return s;
  },
  valid(s) {
    if (!s || s.version > SAVE_VERSION || !s.progress) return false;
    const p = s.progress;
    const nums = ['lives', 'score', 'coins'];
    if (!nums.every((k) => Number.isFinite(p[k]))) return false;
    if (p.random) { if (!Number.isFinite(p.random.seed) || !RANDOM_TYPES.concat(['surprise']).includes(p.random.type)) return false; }
    else if (!findLevel(p.levelId)) return false;
    if (s.kind === 'manual') {
      const w = s.world;
      if (!w || !w.hero || !Number.isFinite(w.hero.x) || !Number.isFinite(w.hero.y) || !Array.isArray(w.entities)) return false;
    }
    return true;
  },
  loadSettings() {
    try {
      const raw = localStorage.getItem(SAVE_PREFIX + 'settings');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  },
  saveSettings(s) {
    try { localStorage.setItem(SAVE_PREFIX + 'settings', JSON.stringify(s)); return true; } catch (e) { return false; }
  },
};
