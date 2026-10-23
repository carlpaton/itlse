// DOM menus layered over the canvas: title, file select, random setup, pause, settings.
const Menus = {
  el: null,
  backAction: null,
  init() {
    this.el = document.getElementById('overlay');
    Input.onKey = (e) => this.handleKey(e);
  },
  open() { return !this.el.classList.contains('hidden'); },
  show(html, back) {
    this.el.innerHTML = `<div class="panel">${html}</div>`;
    this.el.classList.remove('hidden');
    this.backAction = back || null;
    const first = this.el.querySelector('button:not([disabled]), input, select');
    if (first) first.focus();
  },
  hide() { this.el.classList.add('hidden'); this.el.innerHTML = ''; this.backAction = null; },
  bind(id, fn) { const b = this.el.querySelector('#' + id); if (b) b.addEventListener('click', (ev) => { Audio.ensure(); fn(ev); }); },
  handleKey(e) {
    if (!this.open()) return false;
    if (this.listening) return this.listening(e);
    const focusables = [...this.el.querySelectorAll('button:not([disabled]), input, select')];
    const i = focusables.indexOf(document.activeElement);
    if (e.code === 'ArrowDown' || e.code === 'ArrowUp') {
      if (document.activeElement && document.activeElement.tagName === 'SELECT') return false;
      const n = focusables.length; if (!n) return true;
      const next = e.code === 'ArrowDown' ? (i + 1) % n : (i - 1 + n) % n;
      focusables[next].focus();
      return true;
    }
    if (e.code === 'Escape' && this.backAction) { this.backAction(); return true; }
    if ((e.code === 'KeyZ' || e.code === 'Enter') && document.activeElement && document.activeElement.tagName === 'BUTTON') {
      Audio.ensure();
      document.activeElement.click();
      return true;
    }
    return false;
  },
  toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(this.toastT);
    this.toastT = setTimeout(() => t.classList.add('hidden'), 1800);
  },

  title(game) {
    this.show(`
      <h1>BRICK KINGDOM</h1>
      <p>Run, jump and stomp through 8 worlds to free the Queen from the Ember King.</p>
      <div class="menu">
        <button id="m-play">Play</button>
        <button id="m-random">Random level</button>
        <button id="m-settings">Settings &amp; keys</button>
      </div>
      <div class="hint">Arrows/WASD move · Z/Space jump · X/Shift run &amp; fire · Enter pause · M mute<br>Menus: arrows + Enter</div>`);
    this.bind('m-play', () => this.files(game));
    this.bind('m-random', () => this.randomSetup(game));
    this.bind('m-settings', () => this.settings(game, () => this.title(game)));
  },

  slotSummary(snap) {
    const p = snap.progress;
    const when = new Date(snap.savedAt);
    const date = isNaN(when) ? '' : when.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    const where = p.random ? `Random ${p.random.type} (seed ${p.random.seed})` : `World ${p.levelId}`;
    return `${where} · Lives ${p.lives} · Score ${p.score} · Coins ${p.coins}<br>Saved ${date}`;
  },
  files(game) {
    if (!Save.available()) {
      this.show(`<h2>SAVE FILES</h2><p>Browser storage is unavailable (private mode or blocked site data), so progress can't be saved. You can still play.</p>
        <div class="menu"><button id="f-play">Play without saving</button><button id="f-back">Back</button></div>`, () => this.title(game));
      this.bind('f-play', () => { this.hide(); game.newGame(0); });
      this.bind('f-back', () => this.title(game));
      return;
    }
    let html = '<h2>SELECT FILE</h2>';
    for (let s = 1; s <= 3; s++) {
      const man = Save.read(s, 'manual'); const auto = Save.read(s, 'auto');
      html += `<div class="slot"><div class="title">File ${s}</div>`;
      if (man.status === 'empty' && auto.status === 'empty') {
        html += `<div class="meta">Empty</div><div class="row"><button id="new-${s}">New game</button></div>`;
      } else {
        const best = man.status === 'ok' ? man : auto.status === 'ok' ? auto : null;
        html += `<div class="meta">${best ? this.slotSummary(best.snap) : 'Damaged save'}</div><div class="row">`;
        if (man.status === 'ok') html += `<button id="res-${s}">Resume save</button>`;
        if (auto.status === 'ok') html += `<button id="lvl-${s}">Restart ${auto.snap.progress.random ? 'random level' : 'level ' + auto.snap.progress.levelId}</button>`;
        if (man.status === 'damaged' && auto.status !== 'ok') html += '<span class="meta">Damaged save</span>';
        html += `<button id="new-${s}">New game</button><button id="del-${s}" class="danger">Delete</button></div>`;
      }
      html += '</div>';
    }
    html += '<div class="menu"><button id="f-back">Back</button></div>';
    this.show(html, () => this.title(game));
    for (let s = 1; s <= 3; s++) {
      this.bind('new-' + s, () => {
        const exists = Save.read(s, 'manual').status !== 'empty' || Save.read(s, 'auto').status !== 'empty';
        if (exists) this.confirm(`Start a new game in File ${s}? The old save will be replaced.`, () => { this.hide(); game.newGame(s); }, () => this.files(game));
        else { this.hide(); game.newGame(s); }
      });
      this.bind('res-' + s, () => { this.hide(); game.loadSlot(s, 'manual'); });
      this.bind('lvl-' + s, () => { this.hide(); game.loadSlot(s, 'auto'); });
      this.bind('del-' + s, () => this.confirm(`Delete File ${s}? This can't be undone.`, () => { Save.remove(s); this.files(game); }, () => this.files(game)));
    }
    this.bind('f-back', () => this.title(game));
  },
  confirm(msg, yes, no) {
    this.show(`<h2>ARE YOU SURE?</h2><p>${msg}</p><div class="menu"><button id="c-no">No</button><button id="c-yes" class="danger">Yes</button></div>`, no);
    this.bind('c-yes', yes); this.bind('c-no', no);
  },

  randomSetup(game) {
    const types = ['surprise', ...RANDOM_TYPES];
    const opts = types.map((t) => `<option value="${t}">${t === 'surprise' ? 'Surprise me' : t[0].toUpperCase() + t.slice(1)}</option>`).join('');
    const slotOpts = [0, 1, 2, 3].map((s) => `<option value="${s}">${s ? 'File ' + s : "Don't save"}</option>`).join('');
    this.show(`
      <h2>RANDOM LEVEL</h2>
      <p>A fresh level every time. Enter a seed to replay a layout.</p>
      <div class="menu">
        <label class="line">Type <select id="r-type">${opts}</select></label>
        <label class="line">Difficulty <select id="r-diff"><option value="easy">Easy</option><option value="medium" selected>Medium</option><option value="hard">Hard</option></select></label>
        <label class="line">Seed <input id="r-seed" inputmode="numeric" placeholder="random" size="10"></label>
        <label class="line">Save to <select id="r-slot">${slotOpts}</select></label>
        <button id="r-go">Start</button>
        <button id="r-back">Back</button>
      </div>`, () => this.title(game));
    this.bind('r-go', () => {
      const type = this.el.querySelector('#r-type').value;
      const diff = this.el.querySelector('#r-diff').value;
      const seedText = this.el.querySelector('#r-seed').value.trim();
      const slot = +this.el.querySelector('#r-slot').value;
      const seed = /^\d+$/.test(seedText) ? (+seedText % 2147483647) : Math.floor(Math.random() * 1e9);
      this.hide();
      game.newRandom(slot, type, diff, seed);
    });
    this.bind('r-back', () => this.title(game));
  },

  pause(game) {
    const p = game.progress;
    const seedLine = p.random ? `<p>Random ${p.random.type} · ${p.random.difficulty} · seed <b>${p.random.seed}</b></p>` : `<p>World ${p.levelId} · Lives ${p.lives}</p>`;
    const canSave = game.slot > 0 && game.world && game.world.state === 'play';
    this.show(`
      <h2>PAUSED</h2>${seedLine}
      <div class="menu">
        <button id="p-resume">Resume</button>
        <button id="p-save" ${canSave ? '' : 'disabled'}>Save${game.slot ? ' to File ' + game.slot : ' (no file selected)'}</button>
        <button id="p-load" ${game.slot ? '' : 'disabled'}>Load last save</button>
        <button id="p-settings">Settings &amp; keys</button>
        <button id="p-quit" class="danger">Quit to title</button>
      </div>`, () => game.resume());
    this.bind('p-resume', () => game.resume());
    this.bind('p-save', () => game.saveNow());
    this.bind('p-load', () => {
      const r = Save.read(game.slot, 'manual');
      if (r.status !== 'ok') { this.toast(r.status === 'damaged' ? 'That save is damaged' : 'No save in this file yet'); return; }
      this.hide(); game.loadSlot(game.slot, 'manual');
    });
    this.bind('p-settings', () => this.settings(game, () => this.pause(game)));
    this.bind('p-quit', () => this.confirm('Quit to the title screen? Unsaved progress since your last save will be lost.', () => game.toTitle(), () => this.pause(game)));
  },

  settings(game, back) {
    const s = game.settings;
    let rows = '';
    for (const a of Object.keys(DEFAULT_BINDINGS)) {
      const keys = Input.bindings[a].map((c) => Input.keyName(c)).join(' / ');
      rows += `<tr><td>${ACTION_LABELS[a]}</td><td><button data-act="${a}">${keys}</button></td></tr>`;
    }
    this.show(`
      <h2>SETTINGS</h2>
      <div class="menu">
        <label class="line">Volume <input id="s-vol" type="range" min="0" max="100" value="${Math.round(s.volume * 100)}"></label>
        <label class="line">Mute <input id="s-mute" type="checkbox" ${s.muted ? 'checked' : ''}></label>
        <label class="line">Ledge forgiveness (late jumps, early presses) <input id="s-forgive" type="checkbox" ${s.forgiving ? 'checked' : ''}></label>
      </div>
      <h2 style="margin-top:14px">KEYS</h2>
      <table class="keys">${rows}</table>
      <div class="hint">Click a key to rebind it: press the new key (it replaces the first binding). Esc cancels.</div>
      <div class="menu" style="margin-top:12px"><button id="s-reset">Reset keys</button><button id="s-back">Back</button></div>`, back);
    const apply = () => {
      s.volume = this.el.querySelector('#s-vol').value / 100;
      s.muted = this.el.querySelector('#s-mute').checked;
      s.forgiving = this.el.querySelector('#s-forgive').checked;
      Audio.setVolume(s.volume); Audio.muted = s.muted; Audio.applyVolume();
      game.saveSettings();
    };
    ['s-vol', 's-mute', 's-forgive'].forEach((id) => this.el.querySelector('#' + id).addEventListener('input', apply));
    this.el.querySelectorAll('button[data-act]').forEach((b) => b.addEventListener('click', () => {
      b.classList.add('listening'); b.textContent = 'Press a key…';
      this.listening = (e) => {
        this.listening = null;
        if (e.code !== 'Escape') {
          const act = b.dataset.act;
          for (const k in Input.bindings) Input.bindings[k] = Input.bindings[k].filter((c) => c !== e.code);
          Input.bindings[act] = [e.code, ...Input.bindings[act].filter((c) => c !== e.code)].slice(0, 3);
          game.saveSettings();
        }
        setTimeout(() => this.settings(game, back), 0);
        return true;
      };
    }));
    this.bind('s-reset', () => { Input.bindings = JSON.parse(JSON.stringify(DEFAULT_BINDINGS)); game.saveSettings(); this.settings(game, back); });
    this.bind('s-back', back);
  },

  gameOver(game) {
    this.show(`<h2>GAME OVER</h2><p>Score ${game.progress.score}</p>
      <div class="menu"><button id="g-cont">${game.progress.random ? 'Try again' : 'Continue from World ' + game.progress.levelId[0] + '-1'}</button><button id="g-title">Back to title</button></div>`);
    this.bind('g-cont', () => { this.hide(); game.continueGame(); });
    this.bind('g-title', () => game.toTitle());
  },
  randomClear(game) {
    this.show(`<h2>LEVEL CLEAR!</h2><p>Score ${game.progress.score} · seed ${game.progress.random.seed}</p>
      <div class="menu"><button id="rc-again">Another random level</button><button id="rc-title">Back to title</button></div>`);
    this.bind('rc-again', () => { this.hide(); game.anotherRandom(); });
    this.bind('rc-title', () => game.toTitle());
  },
  ending(game) {
    this.show(`<h1>THE END</h1><p>Pip freed the Queen and the Brick Kingdom is safe. Final score ${game.progress.score}.</p>
      <div class="menu"><button id="e-title">Back to title</button></div>`);
    this.bind('e-title', () => game.toTitle());
  },
};
