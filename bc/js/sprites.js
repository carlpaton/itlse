// Original pixel art, built at startup from text maps into small canvases.
// Each map is bottom-aligned into its frame; '.' is transparent.

const PAL = {
  k: '#1a1a24', w: '#ffffff', s: '#f2c89b', S: '#c98e5f',
  H: '#1fa39a', h: '#127066', Y: '#f5b82e', y: '#c47f12', p: '#3a3a5c', b: '#6b3b1f',
  P: '#8e5bd6', q: '#5b3496', G: '#3fa34d', g: '#24702f', R: '#e8513a', r: '#a8301f',
  O: '#ff9a2e', o: '#ffd166', B: '#2b5fd9', n: '#1b3a8a', C: '#9ad8ff', D: '#4a4a5a', d: '#2a2a33',
  L: '#ff6b2e', l: '#ffd23f', E: '#5a3a2a', e: '#3a2418', T: '#7be36a', t: '#2f8f3a', u: '#d8d8e8',
};

const HERO_HEAD_SMALL = [
  '.....hHHHHh.....',
  '....HHHHHHHH....',
  '...HHHHHHHHHH...',
  '...HHssssssH....',
  '...Hsskssks.....',
  '...Hssssssss....',
  '....sssssss.....',
];
const HERO_BODY_SMALL = [
  '....yYYYYYy.....',
  '...YYYwYYYYY....',
  '..sYYYYYYYYYs...',
  '..s.YYYYYYY.s...',
  '....ppppppp.....',
];
const HERO_BODY_SMALL_JUMP = [
  '..s.yYYYYYy..s..',
  '..sYYYwYYYYYs...',
  '...YYYYYYYYY....',
  '....YYYYYYY.....',
  '....ppppppp.....',
];
const SMALL_LEGS = {
  stand: ['....bbb.bbb.....', '...bbbb.bbbb....'],
  walk1: ['...bbb...bbb....', '..bbbb....bbbb..'],
  walk2: ['.....bbbbb......', '.....bbbb.......'],
  walk3: ['....bbb.bbb.....', '....bbbb.bbbb...'],
  jump: ['...bbb..bbbb....', '..bbb.....bb....'],
  skid: ['..bbbb..bbb.....', '..bbb....bbb....'],
};

const HERO_HEAD_BIG = [
  '.....hHHHHh.....',
  '....HHHHHHHH....',
  '...HHHHHHHHHH...',
  '...HHHHHHHHHH...',
  '...HHssssssHH...',
  '...Hssssssss....',
  '...Hsskssskss...',
  '...Hsskssskss...',
  '...Hssssssss....',
  '....ssssssss....',
  '.....ssssss.....',
];
const HERO_BODY_BIG = [
  '....yYYYYYYy....',
  '...YYYYwYYYYY...',
  '..YYYYYwYYYYYY..',
  '..YYYYYYYYYYYY..',
  '.sYYYYYYYYYYYYs.',
  '.ssYYYYYYYYYYss.',
  '.ss.YYYYYYYY.ss.',
  '....YYYYYYYY....',
  '....yyyyyyyy....',
  '....pppppppp....',
  '....pppppppp....',
];
const HERO_BODY_BIG_JUMP = [
  '.ss.yYYYYYYy.ss.',
  '.ssYYYYwYYYYYss.',
  '..YYYYYwYYYYYY..',
  '..YYYYYYYYYYYY..',
  '...YYYYYYYYYY...',
  '...YYYYYYYYYY...',
  '....YYYYYYYY....',
  '....YYYYYYYY....',
  '....yyyyyyyy....',
  '....pppppppp....',
  '....pppppppp....',
];
const BIG_LEGS = {
  stand: ['....ppp..ppp....', '....ppp..ppp....', '....ppp..ppp....', '....ppp..ppp....', '...bbbb..bbbb...', '..bbbbb..bbbbb..'],
  walk1: ['...ppp....ppp...', '..ppp......ppp..', '..ppp......ppp..', '.ppp........ppp.', 'bbbb........bbbb', 'bbbb.........bbb'],
  walk2: ['.....pppppp.....', '.....pppppp.....', '.....ppppp......', '.....ppppp......', '....bbbbbb......', '....bbbbbb......'],
  walk3: ['....ppp..ppp....', '...ppp....ppp...', '...ppp....ppp...', '..ppp......ppp..', '.bbbb......bbbb.', '.bbbb.......bbb.'],
  jump: ['...ppp...ppp....', '..ppp.....ppp...', '..ppp......ppp..', '.ppp........bb..', 'bbbb........bb..', 'bbb.............'],
  skid: ['..pppp..ppp.....', '..ppp...ppp.....', '.ppp....ppp.....', '.ppp.....ppp....', 'bbbb.....bbbb...', 'bbb......bbbb...'],
};
const HERO_CROUCH = [
  '.....hHHHHh.....',
  '....HHHHHHHH....',
  '...HHHHHHHHHH...',
  '...HHssssssHH...',
  '...Hsskssskss...',
  '...Hssssssss....',
  '....ssssssss....',
  '..sYYYYwYYYYYs..',
  '.ssYYYYYYYYYYss.',
  '..YYYYYYYYYYYY..',
  '..pppppppppppp..',
  '.bbbbb....bbbbb.',
  'bbbbbb....bbbbbb',
];
const HERO_DIE = [
  '..s..hHHHHh..s..',
  '..s.HHHHHHHH.s..',
  '..sHHHHHHHHHHs..',
  '..sHsksssksHHs..',
  '...Hssssssss....',
  '....ssskkss.....',
  '...yYYYwYYYy....',
  '...YYYYYYYYY....',
  '....ppppppp.....',
  '....bbb.bbb.....',
  '...bbbb.bbbb....',
];

const SPRITE_MAPS = {
  walker1: [
    '......kkkk......', '....kPPPPPPk....', '...kPPPPPPPPk...', '..kPPwwPPwwPPk..', '..kPPwkPPwkPPk..',
    '..kPPPPPPPPPPk..', '..kPqPPPPPPqPk..', '...kPPkkkkPPk...', '....kPPPPPPk....', '.....kkkkkk.....',
    '....kk....kk....', '...kkk.....kk...',
  ],
  walker2: [
    '......kkkk......', '....kPPPPPPk....', '...kPPPPPPPPk...', '..kPPwwPPwwPPk..', '..kPPwkPPwkPPk..',
    '..kPPPPPPPPPPk..', '..kPqPPPPPPqPk..', '...kPPkkkkPPk...', '....kPPPPPPk....', '.....kkkkkk.....',
    '.....kk..kk.....', '....kk....kkk...',
  ],
  walkerFlat: ['...kkkkkkkkkk...', '..kPPwkPPwkPPk..', '..kkkkkkkkkkkk..', '..kk........kk..'],
  snail1: [
    '......kkkk......', '....kkGGGGkk....', '...kGGgggGGGk...', '..kGgGGGGGgGGk..', '..kGgGGggGGgGk.k',
    '..kGgGgGGgGgGksk', '..kGGgGGGGgGGkss', '...kGGgggggGksss', '..ksssssssssssk.', '.kssssssssssssk.',
    '..kkk.kkk.kkk...',
  ],
  snail2: [
    '......kkkk......', '....kkGGGGkk....', '...kGGgggGGGk...', '..kGgGGGGGgGGk..', '..kGgGGggGGgGk.k',
    '..kGgGgGGgGgGksk', '..kGGgGGGGgGGkss', '...kGGgggggGksss', '..ksssssssssssk.', '.kssssssssssssk.',
    '...kkk.kkk.kkk..',
  ],
  shell: [
    '.....kkkkkk.....', '...kkGGGGGGkk...', '..kGGgggggGGGk..', '.kGgGGGGGGGgGGk.', '.kGgGGggggGGgGk.',
    '.kGgGgGGGGgGgGk.', '.kGGgGGGGGGgGGk.', '..kGGgggggGGGk..', '..kuuuuuuuuuuk..', '...kkkkkkkkkk...',
  ],
  wings: ['.ww.', 'wwww', 'wwwu', '.wuu', '..u.'],
  plant1: [
    '...kkk....kkk...', '..kRRRk..kRRRk..', '.kRwRRRkkRRRwRk.', '.kRRRwRRRRwRRRk.', '..kRRRRRRRRRRk..',
    '..kkwkwkwkwkwk..', '...kRRRRRRRRk...', '....kkkkkkkk....', '.......tt.......', '..ttt..tt..ttt..',
    '.tTTTt.tt.tTTTt.', '..tTTTttttTTTt..', '....tttTTttt....', '.......tt.......', '.......tt.......',
    '.......tt.......', '.......tt.......', '.......tt.......', '.......tt.......', '.......tt.......',
    '.......tt.......', '.......tt.......', '.......tt.......', '.......tt.......',
  ],
  plant2: [
    '....kkkkkkkk....', '...kRRwRRwRRk...', '..kRRRRRRRRRRk..', '..kwkwkwkwkwkk..', '..k..........k..',
    '..kwkwkwkwkwkk..', '...kRRRRRRRRk...', '....kkkkkkkk....', '.......tt.......', '..ttt..tt..ttt..',
    '.tTTTt.tt.tTTTt.', '..tTTTttttTTTt..', '....tttTTttt....', '.......tt.......', '.......tt.......',
    '.......tt.......', '.......tt.......', '.......tt.......', '.......tt.......', '.......tt.......',
    '.......tt.......', '.......tt.......', '.......tt.......', '.......tt.......',
  ],
  thrower1: [
    '.....kkkkkk.....', '....kDDDDDDk....', '...kDuDDDDDDk...', '...kDDDDDDDDk...', '...kkkkkkkkkk...',
    '....kTwkTwkT....', '....kTTTTTTk....', '.....kTkkTk.....', '....kGGGGGGk....', '...kGGgGGgGGk...',
    '..kTkGGGGGGkTk..', '..kTkGGGGGGkTk..', '...k.GGGGGG.k...', '....kggggggk....', '....kGGkkGGk....',
    '...kkkk..kkkk...',
  ],
  thrower2: [
    '..kk.kkkkkk.....', '..kTkDDDDDDk....', '..kTkuDDDDDDk...', '...kkDDDDDDDk...', '....kkkkkkkkk...',
    '....kTwkTwkT....', '....kTTTTTTk....', '.....kTkkTk.....', '....kGGGGGGk....', '...kGGgGGgGGk...',
    '....kGGGGGGkTk..', '....kGGGGGGkTk..', '.....GGGGGG.k...', '....kggggggk....', '....kGGkkGGk....',
    '...kkkk..kkkk...',
  ],
  wrench: ['..kk....', '.kDk....', '.kDDk...', '..kDDk..', '...kDDk.', '....kDDk', '.....kDk', '......kk'],
  rider: [
    '.....kkkkkk.....', '....kOOOOOOk....', '...kOwkOOwkOk...', '...kOOOOOOOOk...', '....kOkkkkOk....',
    '.....kOOOOk.....', '...kk.kkkk.kk...', '..kuuukkuukuuk..', '.kuwwuuuuuuwwuk.', 'kuwwwuuuuuuwwwuk',
    'kuuuuuuuuuuuuuuk', '.kuuuuuuuuuuuuk.', '..kkkkkkkkkkkk..',
  ],
  spiky1: [
    '...k...k...k....', '...kk.kRk.kk....', '..kRRkRRRkRRk...', '.kRRRRRRRRRRRk..', 'kkRwkRRRRRRRRkk.',
    '.kRRRRRRRRRRRRk.', 'kkRRRRRRRRRRRkk.', '..kRRRRRRRRRk...', '...koookoook....', '...kkk...kkk....',
  ],
  spiky2: [
    '...k...k...k....', '...kk.kRk.kk....', '..kRRkRRRkRRk...', '.kRRRRRRRRRRRk..', 'kkRwkRRRRRRRRkk.',
    '.kRRRRRRRRRRRRk.', 'kkRRRRRRRRRRRkk.', '..kRRRRRRRRRk...', '...koookoook....', '....kkk..kkk....',
  ],
  egg: ['.k..k..k', 'kRkRRkRk', '.kRRRRk.', 'kRRRRRRk', '.kRRRRk.', 'kRkRRkRk', '.k..k..k'],
  bullet: [
    '...kkkkkkkkk....', '..kdddddddddkk..', '.kddwwddddddddk.', 'kddwkkdddddddddk', 'kdddkkddddddddk.',
    'kdddddddddddddk.', '.kdddddddddddk..', '..kkkkkkkkkkk...',
  ],
  fish1: [
    '....kkkkk.......', '..kkOOOOOkk..kk.', '.kOwkOOOOOOk.kOk', 'kOOkkOOoOOOOkOOk', 'kOOOOOOoOOOOOOk.',
    '.kOOOOOOOOOk.kOk', '..kkOOOOOkk..kk.', '....kkkkk.......',
  ],
  fish2: [
    '....kkkkk.......', '..kkOOOOOkk.....', '.kOwkOOOOOOk.kk.', 'kOOkkOOoOOOOkOOk', 'kOOOOOOoOOOOOOOk',
    '.kOOOOOOOOOk.kk.', '..kkOOOOOkk.....', '....kkkkk.......',
  ],
  squid1: [
    '.....kkkkkk.....', '....kuuuuuuk....', '...kuuuuuuuuk...', '...kuwkuuwkuk...', '...kuuuuuuuuk...',
    '...kuuuuuuuuk...', '....kuuuuuuk....', '...kukukukuk....', '...kuk.kuk.kuk..', '..kuk..kuk..kuk.',
    '..kk...kk....kk.',
  ],
  squid2: [
    '.....kkkkkk.....', '....kuuuuuuk....', '...kuwkuuwkuk...', '...kuuuuuuuuk...', '..kuuuuuuuuuuk..',
    '..kukukukukukuk.', '...kk.kk.kk.kk..',
  ],
  bubble: [
    '.....kkkkk......', '...kkLLLLLkk....', '..kLLlllllLLk...', '.kLlllwwlllLLk..', '.kLllwwlllllLk..',
    '.kLlllllllllLk..', '.kLLlllllllLLk..', '..kLLLLLLLLLk...', '...kkLLLLLkk....', '.....kkkkk......',
  ],
  fireball1: ['..kk..', '.kLlk.', 'kLllLk', 'kLlwlk', '.kLLk.', '..kk..'],
  fireball2: ['.kk...', 'kLLkk.', 'kLlllk', '.klwlk', '..kLLk', '...kk.'],
  breath: [
    '......LLLL..............', '...LLLlllLLLL..LLL......', 'LLLllllwwlllLLLLllLLLL..', 'LlllwwwwwwllllllllllllLL',
    'LLLllllwwlllLLLLllLLLL..', '...LLLlllLLLL..LLL......', '......LLLL..............',
  ],
  growth: [
    '.......kk.......', '......kTtk......', '....kkkTkkkk....', '...kOOOkOOOOk...', '..kOooOOOOOOOk..',
    '..kOowOOOOOOOk..', '..kOOOOOOOOOOk..', '..kOOOOOOOOOrk..', '...kOOOOOOOrk...', '....kOOOOOrk....',
    '.....kkkkkk.....',
  ],
  oneup: [
    '.......kk.......', '......kTtk......', '....kkkTkkkk....', '...kTTTkTTTTk...', '..kTwwTTTTTTTk..',
    '..kTwTTTTTTTTk..', '..kTTTTTTTTTTk..', '..kTTTTTTTTTtk..', '...kTTTTTTTtk...', '....kTTTTTtk....',
    '.....kkkkkk.....',
  ],
  bloom: [
    '...k...kk...k...', '..kLk.kLLk.kLk..', '..kLlkLllLklLk..', '...kLlllllLlk...', '....kLlwwlLk....',
    '.....kLllLk.....', '......kkkk......', '..kk...tt...kk..', '.kTTk..tt..kTTk.', '..kTTk.tt.kTTk..',
    '...kTTttttTTk...', '.....kkttkk.....', '.......tt.......', '......kttk......',
  ],
  star: [
    '.......kk.......', '......koOk......', '......kooOk.....', '.....koooOk.....', 'kkkkkkoooooOkkkk',
    '.koooooooooooOk.', '..kooookookoOk..', '...koookookOk...', '...kooooooOk....', '..kooooOoooOk...',
    '..kooOkkkkooOk..', '.kooOk....kooOk.', '.kkk........kkk.',
  ],
  coin1: ['....kkkk....', '...koooOk...', '..kooOooOk..', '..kooOooOk..', '..kooOooOk..', '..kooOooOk..', '..kooOooOk..', '...koooOk...', '....kkkk....'],
  coin2: ['.....kk.....', '....koOk....', '....koOk....', '....koOk....', '....koOk....', '....koOk....', '....koOk....', '....koOk....', '.....kk.....'],
  coin3: ['......k.....', '.....kOk....', '.....kOk....', '.....kOk....', '.....kOk....', '.....kOk....', '.....kOk....', '.....kOk....', '......k.....'],
  debris: ['.kkk.', 'kYyyk', 'kyyyk', '.kkk.'],
  boss1: [
    '.....k...k...k..........', '....kok.kok.kok.........', '....kooookooooook.......', '...kkkkkkkkkkkkkkk......',
    '..kEEEEEEEEEEEEEEEk.....', '.kEEeEEEEEEEEeEEEEEk....', '.kEElwkEEEEElwkEEEEk....', '.kEEllkEEEEEllkEEEEk....',
    '.kEEEEEEEEEEEEEEEEEk....', '.kEEELLLLLLLLLLEEEEk....', '.kEEEkwkwkwkwkwEEEEk....', '..kEEEEEEEEEEEEEEEk.....',
    '...kEEEEEEEEEEEEEk......', '..kEEeEELLLEEEeEEEEk....', '.kEEEEELllLEEEEEEEEEk...', 'kEEkEELllllLEEkEEEEEEk..',
    'kEEkEEELllLEEEkEEEEEEEk.', 'kEEkEEEELLEEEEkEEEEeEEEk', '.kkkEEeEEEEEEEkEEEEEEEk.', '...kEEEEEEEEEEEkEEEEEk..',
    '...kEEEELLEEEEEEkkkkk...', '...kEEELllLEEEEEk.......', '...kEEEELLEEEEEEk.......', '...kEEEEEEEEEEEEk.......',
    '...kEEEEkkkkEEEEk.......', '..kEEEEEk..kEEEEEk......', '.kEEEEEEk..kEEEEEEk.....', '.kkkkkkkk..kkkkkkkk.....',
  ],
  boss2: [
    '.....k...k...k..........', '....kok.kok.kok.........', '....kooookooooook.......', '...kkkkkkkkkkkkkkk......',
    '..kEEEEEEEEEEEEEEEk.....', '.kEEeEEEEEEEEeEEEEEk....', '.kEElwkEEEEElwkEEEEk....', '.kEEllkEEEEEllkEEEEk....',
    '.kEEEEEEEEEEEEEEEEEk....', '.kEELLLLLLLLLLLLEEEk....', '.kEEkwkwkwkwkwkwEEEk....', '.kEELLLLLLLLLLLLEEEk....',
    '..kEEEEEEEEEEEEEEEk.....', '..kEEeEELLLEEEeEEEEk....', '.kEEEEELllLEEEEEEEEEk...', 'kEEkEELllllLEEkEEEEEEk..',
    'kEEkEEELllLEEEkEEEEEEEk.', 'kEEkEEEELLEEEEkEEEEeEEEk', '.kkkEEeEEEEEEEkEEEEEEEk.', '...kEEEEEEEEEEEkEEEEEk..',
    '...kEEEELLEEEEEEkkkkk...', '...kEEELllLEEEEEk.......', '...kEEEELLEEEEEEk.......', '...kEEEEEEEEEEEEk.......',
    '...kEEEEkkkkEEEEk.......', '...kEEEEk..kEEEEk.......', '..kEEEEEEk.kEEEEEEk.....', '..kkkkkkkk.kkkkkkkk.....',
  ],
  spring1: [
    'kkkkkkkkkkkkkkkk', 'kRRRRRRRRRRRRRRk', 'kkkkkkkkkkkkkkkk', '...kDDDDDDDDk...', '....kuuuuuuk....', '...kDDDDDDDDk...',
    '....kuuuuuuk....', '...kDDDDDDDDk...', '....kuuuuuuk....', '...kDDDDDDDDk...', '....kuuuuuuk....', '...kDDDDDDDDk...',
    'kkkkkkkkkkkkkkkk', 'kRRRRRRRRRRRRRRk', 'kkkkkkkkkkkkkkkk',
  ],
  spring2: [
    'kkkkkkkkkkkkkkkk', 'kRRRRRRRRRRRRRRk', 'kkkkkkkkkkkkkkkk', '...kDDDDDDDDk...', '....kuuuuuuk....', '...kDDDDDDDDk...',
    'kkkkkkkkkkkkkkkk', 'kRRRRRRRRRRRRRRk', 'kkkkkkkkkkkkkkkk',
  ],
  captive: [
    '......kkkk......', '.....kooook.....', '....kkkkkkkk....', '....kssssssk....', '....kskssksk....',
    '....kssssssk....', '.....kssssk.....', '....kPPPPPPk....', '...kPPPwPPPPk...', '..kPPPPPPPPPPk..',
    '..kPPPPPPPPPPk..', '..kPPPPPPPPPPk..', '...kkkkkkkkkk...',
  ],
};

const Sprites = {
  cache: {},
  build(rows, palette, height) {
    const w = Math.max(...rows.map((r) => r.length));
    const h = height || rows.length;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    const off = h - rows.length;
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.' || ch === ' ') continue;
        g.fillStyle = (palette && palette[ch]) || PAL[ch] || '#f0f';
        g.fillRect(x, y + off, 1, 1);
      }
    });
    return c;
  },
  heroRows(big, pose) {
    if (big) {
      if (pose === 'crouch') return HERO_CROUCH;
      const legs = BIG_LEGS[pose] || BIG_LEGS.stand;
      const body = pose === 'jump' ? HERO_BODY_BIG_JUMP : HERO_BODY_BIG;
      return [...HERO_HEAD_BIG, ...body, ...legs];
    }
    if (pose === 'die') return HERO_DIE;
    const legs = SMALL_LEGS[pose] || SMALL_LEGS.stand;
    const body = pose === 'jump' ? HERO_BODY_SMALL_JUMP : HERO_BODY_SMALL;
    return [...HERO_HEAD_SMALL, ...body, ...legs];
  },
  heroPalettes: {
    normal: {},
    fire: { H: '#f4f1e8', h: '#b9b5c9', Y: '#e8513a', y: '#9e2a1a', p: '#f5b82e' },
    star1: { H: '#ff5fa2', h: '#b02a6a', Y: '#7be36a', y: '#2f8f3a' },
    star2: { H: '#ffd23f', h: '#c49a12', Y: '#2b5fd9', y: '#1b3a8a' },
    star3: { H: '#ffffff', h: '#9a9aa8', Y: '#ff6b2e', y: '#a8301f' },
  },
  // Palette overrides for enemy variants and level themes.
  variants: {
    red: { G: '#e8513a', g: '#a8301f' },
    beetle: { G: '#2b5fd9', g: '#1b3a8a', s: '#2a2a33' },
    night: { P: '#5a8ad6', q: '#2b5fd9' },
    under: { P: '#4fa0c8', q: '#2b6a8a', G: '#4fa0c8', g: '#2b6a8a' },
    castle: { P: '#a0a0b0', q: '#6a6a7a' },
    sea: { O: '#e8513a', o: '#ff9a2e' },
    biter: { R: '#8e5bd6', r: '#5b3496', w: '#ffd166' },
  },
  get(name, variant) {
    const key = name + '|' + (variant || '');
    if (this.cache[key]) return this.cache[key];
    let rows; let pal = variant ? this.variants[variant] : null; let height;
    if (name.startsWith('hero')) {
      const [, size, pose, palName] = name.split(':');
      rows = this.heroRows(size === 'big', pose);
      pal = this.heroPalettes[palName] || {};
      height = size === 'big' ? (pose === 'crouch' ? 22 : 32) : 16;
    } else {
      rows = SPRITE_MAPS[name];
      if (!rows) return null;
    }
    const c = this.build(rows, pal, height);
    this.cache[key] = c;
    return c;
  },
};
