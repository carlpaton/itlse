// Shared constants and helpers. Classic scripts share one global scope.
const TILE = 16;
// The view is 240 px tall; its width follows the browser window's shape (256 to 480 px).
let VIEW_W = 256;
const VIEW_W_MIN = 256;
const VIEW_W_MAX = 480;
function camLead() { return Math.round(VIEW_W * 0.44); }
function viewCols() { return Math.ceil(VIEW_W / TILE) + 1; }
const VIEW_H = 240;
const ROWS = 15;
const FPS = 60;

// Movement tuning, in pixels per frame at 60 updates per second.
const PHYS = {
  walkMax: 1.5,
  runMax: 2.5,
  swimMax: 1.5,
  seabedMax: 1.0,
  walkAccel: 0.06,
  runAccel: 0.09,
  friction: 0.05,
  jumpMin: 3.9,
  jumpMax: 4.6,
  gravityHold: 0.13,
  gravity: 0.45,
  maxFall: 4.5,
  stompBounce: 3.6,
  stompBounceHeld: 4.6,
  swimGravity: 0.05,
  swimMaxFall: 1.4,
  swimStroke: 1.9,
  coyote: 4,
  buffer: 4,
};

// Seeded random number generator (mulberry32) so a seed always builds the same level.
function makeRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    chance: (p) => next() < p,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
  };
}

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function sign(v) { return v < 0 ? -1 : v > 0 ? 1 : 0; }
function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
