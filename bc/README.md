# Brick Kingdom

A keyboard-played, 8-world side-scrolling platformer in plain HTML, CSS and JavaScript, built from the plan doc "Super Mario Bros. Browser Game Plan". It copies the original's mechanics and level structure, with original art, sound, names and layouts.

## Run it

Double-click `index.html`. No server, build step or install is needed (classic `<script>` tags work from `file://`).

`dist/brick-kingdom.html` is the same game in one self-contained file. Rebuild it with `python3 tools/bundle.py`.

## Controls

| Action | Keys |
| --- | --- |
| Move | Arrows or A / D |
| Jump / swim | Z, Space or K |
| Run (hold) / fireball (tap) | X, Shift or J |
| Crouch / enter pipe | Down or S |
| Climb vine | Up or W |
| Pause and menu (save, load, settings) | Enter, Esc or P |
| Mute | M |

Keys can be rebound in Settings.

## What's in it

- 32 levels (1-1 to 8-4) following the original's sequence of overworld, underground, underwater, athletic, bridge and castle levels, with night worlds 3 and 6, warp zones in 1-2 and 4-2, vines to sky areas, bonus pipes, maze castles (4-4, 7-4, 8-4) and remixed levels.
- Random levels: pick a type and difficulty, or enter a seed to replay a layout.
- Saving: 3 files in `localStorage`. Pause → Save stores the exact moment; a level-start save is kept too.

## Files

| File | What it does |
| --- | --- |
| `js/util.js` | Constants, physics tuning, seeded RNG |
| `js/input.js` | Keyboard state and bindings |
| `js/audio.js` | Web Audio sound effects and original tunes |
| `js/sprites.js` | Pixel art maps turned into canvases |
| `js/levels.js` | The 32 level specs and random-level specs |
| `js/levelgen.js` | Generator from spec to tiles and spawns; reachability check |
| `js/entities.js` | Hero, enemies, items, platforms |
| `js/world.js` | Collision, camera, spawning, pipes, flag and boss sequences, snapshots |
| `js/render.js` | Tiles, sprites, HUD |
| `js/save.js` | Save slots, validation, migration |
| `js/menus.js` | Title, file select, random setup, pause, settings |
| `js/game.js` | Game loop and level flow |
