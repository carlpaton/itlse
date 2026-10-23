// The 32 main levels: type, enemy mix and special features per level.
// js/levelgen.js turns each spec (plus its seed) into tiles and spawns.
// Our names: walker, snail (shell creature), flyer (winged snail), beetle (fireproof shell),
// plant (pipe biter), thrower (wrench goblin), rider (cloud imp) + spiky, cannon + bullet,
// fish, leaper (jumping fish), squid, bubble (lava), firebar, boss (Ember King).

const LEVELS = [
  // World 1
  { id: '1-1', type: 'overworld', time: 400, len: 190, enemies: { walker: 6, snail: 1 }, bonusPipes: 1, tutorial: true },
  { id: '1-2', type: 'underground', time: 400, len: 170, enemies: { walker: 5, snail: 2 }, plants: true, warp: [2, 3, 4] },
  { id: '1-3', type: 'athletic', time: 300, len: 150, enemies: { walker: 2, snail: 2, redflyer: 2 }, lifts: 2 },
  { id: '1-4', type: 'castle', time: 300, len: 140, firebars: 4, bubbles: 0, boss: 1 },
  // World 2
  { id: '2-1', type: 'overworld', time: 400, len: 200, enemies: { walker: 5, snail: 3, flyer: 2 }, plants: true, vine: true, springs: 1 },
  { id: '2-2', type: 'underwater', time: 400, len: 170, enemies: { squid: 4, fish: 5 }, plants: true },
  { id: '2-3', type: 'bridge', time: 300, len: 200, enemies: {}, leapers: true },
  { id: '2-4', type: 'castle', time: 300, len: 160, firebars: 5, bubbles: 3, boss: 2, lifts: 2 },
  // World 3 (night)
  { id: '3-1', type: 'overworld', night: true, time: 300, len: 200, enemies: { walker: 5, snail: 3, flyer: 2, thrower: 1 }, plants: true, vine: true },
  { id: '3-2', type: 'overworld', night: true, time: 300, len: 200, enemies: { walker: 8, snail: 4, flyer: 1 }, plants: true },
  { id: '3-3', type: 'athletic', night: true, time: 300, len: 160, enemies: { walker: 2, snail: 2, redflyer: 2 }, lifts: 3, falling: 2 },
  { id: '3-4', type: 'castle', time: 300, len: 160, firebars: 7, bubbles: 3, boss: 3 },
  // World 4
  { id: '4-1', type: 'overworld', time: 400, len: 220, enemies: {}, rider: true, plants: true },
  { id: '4-2', type: 'underground', time: 400, len: 190, enemies: { walker: 4, snail: 2, beetle: 3 }, plants: true, warp: [6, 7, 8], lifts: 2 },
  { id: '4-3', type: 'athletic', time: 300, len: 160, enemies: { snail: 2, redflyer: 3 }, lifts: 3, falling: 2 },
  { id: '4-4', type: 'castle', time: 400, len: 180, firebars: 6, bubbles: 3, boss: 4, maze: 2 },
  // World 5
  { id: '5-1', type: 'overworld', time: 300, len: 210, enemies: { walker: 6, snail: 3, flyer: 2 }, plants: true, cannons: 3 },
  { id: '5-2', type: 'overworld', time: 400, len: 210, enemies: { walker: 4, snail: 3, flyer: 2, beetle: 2, thrower: 2 }, plants: true, cannons: 2, waterArea: true, springs: 1 },
  { id: '5-3', type: 'athletic', time: 300, len: 150, enemies: { walker: 2, snail: 2, redflyer: 2 }, lifts: 2, cannonsRandom: true, remixOf: '1-3' },
  { id: '5-4', type: 'castle', time: 300, len: 160, firebars: 6, bubbles: 4, boss: 5, lifts: 2, remixOf: '2-4' },
  // World 6 (night)
  { id: '6-1', type: 'overworld', night: true, time: 300, len: 220, enemies: {}, rider: true, plants: true },
  { id: '6-2', type: 'overworld', night: true, time: 400, len: 230, enemies: { walker: 5, snail: 3, flyer: 2, beetle: 3 }, plants: true, waterArea: true, vine: true, bonusPipes: 2 },
  { id: '6-3', type: 'athletic', night: true, grey: true, time: 300, len: 170, enemies: {}, cannons: 4, lifts: 3, falling: 3 },
  { id: '6-4', type: 'castle', time: 300, len: 140, firebars: 7, bubbles: 2, boss: 6, bossHammers: true, remixOf: '1-4' },
  // World 7
  { id: '7-1', type: 'overworld', time: 400, len: 210, enemies: { snail: 3, flyer: 3, beetle: 3, thrower: 2 }, plants: true, cannons: 4 },
  { id: '7-2', type: 'underwater', time: 400, len: 170, enemies: { squid: 7, fish: 5 }, plants: true, remixOf: '2-2' },
  { id: '7-3', type: 'bridge', time: 300, len: 200, enemies: { snail: 3, redflyer: 3 }, leapers: true, remixOf: '2-3' },
  { id: '7-4', type: 'castle', time: 400, len: 190, firebars: 7, bubbles: 4, boss: 7, bossHammers: true, maze: 3 },
  // World 8
  { id: '8-1', type: 'overworld', time: 300, len: 260, enemies: { walker: 8, snail: 4, flyer: 3, beetle: 3 }, plants: true, widePits: true },
  { id: '8-2', type: 'overworld', time: 400, len: 230, enemies: { walker: 3, flyer: 3, beetle: 3 }, rider: true, cannons: 3, plants: true, widePits: true },
  { id: '8-3', type: 'overworld', time: 300, len: 230, enemies: { snail: 3, flyer: 3, thrower: 5 }, cannons: 3, plants: true, castleWalls: true },
  { id: '8-4', type: 'castle', time: 400, len: 230, firebars: 9, bubbles: 4, boss: 8, bossHammers: true, maze: 3, waterSection: true, enemies: { walker: 2, beetle: 2, thrower: 1 }, final: true },
];

function findLevel(id) { return LEVELS.find((l) => l.id === id); }
function levelIndex(id) { return LEVELS.findIndex((l) => l.id === id); }

// Random levels: type + difficulty + seed -> a spec shaped like the ones above.
const RANDOM_TYPES = ['overworld', 'underground', 'underwater', 'athletic', 'bridge', 'castle'];
function randomSpec(type, difficulty, seed) {
  const rng = makeRng(seed);
  if (type === 'surprise') type = rng.pick(RANDOM_TYPES);
  const world = difficulty === 'easy' ? rng.int(1, 2) : difficulty === 'medium' ? rng.int(4, 5) : rng.int(7, 8);
  const d = (world - 1) / 7;
  const spec = { id: 'R-' + seed, random: true, seed, type, difficulty, world, time: 400, len: rng.int(170, 220), enemies: {} };
  if (type === 'overworld') {
    spec.enemies = { walker: 4 + rng.int(0, 3), snail: 2 + rng.int(0, 2), flyer: Math.round(d * 3) };
    if (d > 0.4) { spec.enemies.beetle = rng.int(1, 3); spec.enemies.thrower = rng.int(0, 2); }
    spec.plants = true;
    spec.night = rng.chance(0.3);
    if (d > 0.3 && rng.chance(0.5)) spec.cannons = rng.int(1, 3);
    if (d > 0.3 && rng.chance(0.25)) { spec.rider = true; spec.enemies = { flyer: 2 }; }
    spec.bonusPipes = 1;
    spec.widePits = d > 0.8;
  } else if (type === 'underground') {
    spec.enemies = { walker: 4, snail: 2, beetle: Math.round(d * 4) };
    spec.plants = true; spec.lifts = rng.int(0, 2);
  } else if (type === 'underwater') {
    spec.enemies = { squid: 3 + Math.round(d * 4), fish: 4 };
    spec.plants = true;
  } else if (type === 'athletic') {
    spec.enemies = { snail: 2, redflyer: 2 + Math.round(d * 2), walker: 1 };
    spec.lifts = 2 + rng.int(0, 2); spec.falling = Math.round(d * 3);
    spec.night = rng.chance(0.3);
    if (d > 0.5 && rng.chance(0.5)) spec.cannons = 2;
  } else if (type === 'bridge') {
    spec.enemies = d > 0.5 ? { snail: 2, redflyer: 2 } : {};
    spec.leapers = true;
  } else if (type === 'castle') {
    spec.firebars = 3 + Math.round(d * 6); spec.bubbles = 2 + Math.round(d * 2);
    spec.boss = world; spec.bossHammers = d > 0.6; spec.maze = d > 0.4 && rng.chance(0.5) ? 2 : 0;
    spec.time = 400;
  }
  return spec;
}
