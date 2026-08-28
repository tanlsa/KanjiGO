const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

function createGame({ learningSave = null, gameSave = null, disableTestUnlocks = false, enableSkillQaSeed = false,
  characterSlotsSave = null, sandboxCharacter = false, viewportWidth = 1280, viewportHeight = 720, devicePixelRatio = 1,
  canvasRect = null, mockFonts = false, encounterAnimation = true } = {}) {
  const storage = new Map();
  const windowListeners = new Map();
  const canvasListeners = new Map();
  const touchBackListeners = new Map();
  const dexSearchListeners = new Map();
  let activeElement = null;
  let paintCalls = 0;
  const drawCalls = [];
  const effectiveCharacterSlots = characterSlotsSave || {
    version: 2, activeSlot: 1,
    slots: [{ id: 1, name: sandboxCharacter ? 'Tester KanjiGO' : 'Test Player', gender: 'neutral', appearance: 'orange',
      sandbox: sandboxCharacter, onboardingComplete: true }],
  };
  storage.set('KANJIGO_CHARACTER_SLOTS_V1', JSON.stringify(effectiveCharacterSlots));
  const activeSlot = Math.max(1, Math.min(3, Math.floor(Number(effectiveCharacterSlots.activeSlot)) || 1));
  const characterKey = (base) => activeSlot === 1 ? base : `${base}__CHARACTER_${activeSlot}`;
  if (learningSave) storage.set(characterKey('KANJIGO_LEARNING_V1'), JSON.stringify(learningSave));
  if (gameSave) storage.set(characterKey('KANJIGO_GAME_V1'), JSON.stringify(gameSave));
  const noop = () => {};
  const imageRequests = [];
  const textCalls = [];
  const audioCalls = [];
  const canvasContext = new Proxy({
    measureText: (text) => ({ width: String(text).length * 8 }),
    drawImage(image, ...args) {
      if (!image) throw new TypeError('drawImage received an unloaded image');
      drawCalls.push({ type: 'drawImage', src: image.src || '', args,
        filter: typeof this.filter === 'string' ? this.filter : 'none',
        globalAlpha: Number.isFinite(this.globalAlpha) ? this.globalAlpha : 1 });
    },
    fillRect(x, y, width, height) {
      paintCalls++;
      drawCalls.push({ type: 'fillRect', x, y, width, height, fillStyle: this.fillStyle || '' });
    },
    fillText(text, x, y) {
      const call = { text: String(text), x, y, font: this.font || '', fillStyle: this.fillStyle || '',
        filter: typeof this.filter === 'string' ? this.filter : 'none', globalAlpha: Number.isFinite(this.globalAlpha) ? this.globalAlpha : 1 };
      textCalls.push(call); drawCalls.push({ type: 'fillText', ...call });
    },
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
  }, {
    get(target, key) { return key in target ? target[key] : noop; },
    set(target, key, value) { target[key] = value; return true; },
  });
  const canvas = {
    width: 640, height: 480, style: {},
    getContext: () => canvasContext,
    addEventListener: (type, listener) => {
      if (!canvasListeners.has(type)) canvasListeners.set(type, []);
      canvasListeners.get(type).push(listener);
    },
    getBoundingClientRect: () => canvasRect || ({ left: 0, top: 0, width: viewportWidth, height: viewportHeight }),
  };
  const touchBackClasses = new Set(['touch-hidden']);
  const touchBackAttributes = new Map([['aria-label', 'Quay lại']]);
  const touchBack = {
    dataset: { action: 'back' }, textContent: 'QUAY LẠI', title: 'Quay lại',
    classList: {
      add: (...names) => names.forEach((name) => touchBackClasses.add(name)),
      remove: (...names) => names.forEach((name) => touchBackClasses.delete(name)),
      toggle: (name, force) => {
        const enabled = force === undefined ? !touchBackClasses.has(name) : Boolean(force);
        if (enabled) touchBackClasses.add(name); else touchBackClasses.delete(name);
        return enabled;
      },
      contains: (name) => touchBackClasses.has(name),
    },
    setAttribute: (name, value) => touchBackAttributes.set(name, String(value)),
    getAttribute: (name) => touchBackAttributes.get(name) || null,
    addEventListener: (type, listener) => {
      if (!touchBackListeners.has(type)) touchBackListeners.set(type, []);
      touchBackListeners.get(type).push(listener);
    },
  };
  const dexSearch = {
    value: '', hidden: true,
    addEventListener: (type, listener) => {
      if (!dexSearchListeners.has(type)) dexSearchListeners.set(type, []);
      dexSearchListeners.get(type).push(listener);
    },
    focus() { activeElement = dexSearch; },
    blur() { if (activeElement === dexSearch) activeElement = null; },
  };
  const settingsOpenClasses = new Set();
  const settingsOpenAttributes = new Map();
  const settingsOpen = {
    tabIndex: 0,
    classList: {
      toggle: (name, force) => {
        const enabled = force === undefined ? !settingsOpenClasses.has(name) : Boolean(force);
        if (enabled) settingsOpenClasses.add(name); else settingsOpenClasses.delete(name);
        return enabled;
      },
      contains: (name) => settingsOpenClasses.has(name),
    },
    setAttribute: (name, value) => settingsOpenAttributes.set(name, String(value)),
    getAttribute: (name) => settingsOpenAttributes.get(name) || null,
  };
  const createCanvas = () => ({ width: 0, height: 0, getContext: () => canvasContext });
  class MockImage {
    set src(value) { this._src = value; imageRequests.push(value); if (this.onload) queueMicrotask(() => this.onload()); }
    get src() { return this._src; }
  }
  const context = {
    console, module: { exports: {} }, Image: MockImage,
    innerWidth: viewportWidth, innerHeight: viewportHeight, devicePixelRatio,
    performance: { now: () => 0 }, requestAnimationFrame: noop,
    addEventListener: (type, listener) => {
      if (!windowListeners.has(type)) windowListeners.set(type, []);
      windowListeners.get(type).push(listener);
    },
    document: {
      get activeElement() { return activeElement; },
      getElementById: (id) => id === 'game' ? canvas
        : id === 'touch-back' ? touchBack
          : id === 'settings-open' ? settingsOpen
            : id === 'dex-search' ? dexSearch : null,
      querySelectorAll: () => [],
      createElement: (tag) => tag === 'canvas' ? createCanvas() : {},
      ...(mockFonts ? { fonts: { load: () => Promise.resolve([]), check: () => true } } : {}),
    },
    localStorage: {
      getItem: (key) => storage.has(key) ? storage.get(key) : null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key),
    },
    setTimeout, clearTimeout, queueMicrotask,
    SettingsUI: { encounterAnimationEnabled: () => encounterAnimation },
    AudioManager: {
      preloadAll: () => Promise.resolve([]),
      playSFX: (id) => { audioCalls.push({ kind: 'sfx', id }); return true; },
      playKanjiOnYomi: (char) => { audioCalls.push({ kind: 'on', char }); return true; },
      playKanjiKunYomi: (char) => { audioCalls.push({ kind: 'kun', char }); return true; },
    },
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(read('js/character-slots.js'), context, { filename: 'js/character-slots.js' });
  for (const file of ['js/content-catalog.js', 'js/config.js', 'js/kanji.js', 'js/question-supplement.js', 'js/data-loader.js', 'js/map.js']) {
    vm.runInContext(read(file), context, { filename: file });
  }
  context.CONFIG.SKILL_TREE.qaSeed.enabled = enableSkillQaSeed;
  context.CONFIG.SKILL_TREE.qaSeed.allowStandardQa = enableSkillQaSeed;
  context.CONFIG.PROGRESSION.allowStandardQa = !disableTestUnlocks;
  vm.runInContext(read('js/game.js'), context, { filename: 'js/game.js' });
  const dispatchWindowEvent = (type, event) => {
    for (const listener of windowListeners.get(type) || []) listener(event);
  };
  const dispatchTouchBack = () => {
    for (const listener of touchBackListeners.get('click') || []) listener({ preventDefault: noop });
  };
  const dispatchCanvasEvent = (type, event) => {
    for (const listener of canvasListeners.get(type) || []) listener({ preventDefault: noop, pointerId: 1, ...event });
  };
  const dispatchDexSearch = (value) => {
    dexSearch.value = value;
    for (const listener of dexSearchListeners.get('input') || []) listener({ target: dexSearch });
  };
  const dispatchDexSearchKey = (key, extra = {}) => {
    const event = { key, keyCode: 0, isComposing: false, preventDefault: noop, stopPropagation: noop, ...extra };
    for (const listener of dexSearchListeners.get('keydown') || []) listener(event);
  };
  return { context, debug: context.__KANJIGO_DEBUG, storage, imageRequests, dispatchWindowEvent, dispatchTouchBack,
    dispatchCanvasEvent, dispatchDexSearch, dispatchDexSearchKey, textCalls, drawCalls, audioCalls, getPaintCalls: () => paintCalls,
    getDexSearch: () => ({ value: dexSearch.value, hidden: dexSearch.hidden, focused: activeElement === dexSearch }),
    getTouchBack: () => ({ text: touchBack.textContent, title: touchBack.title,
      ariaLabel: touchBack.getAttribute('aria-label'), classes: [...touchBackClasses] }),
    getSettingsOpen: () => ({ tabIndex: settingsOpen.tabIndex,
      ariaHidden: settingsOpen.getAttribute('aria-hidden'), classes: [...settingsOpenClasses] }) };
}

test('game boots and exposes a usable QA API', () => {
  const { debug } = createGame();
  assert.equal(debug.state(), 'overworld');
  assert.equal(debug.getPet().id, 'kuni');
  assert.equal(debug.getKanjiStat('魚').level, 1);
  assert.ok(debug.availableSpawn('grass').includes('kuni'));
  assert.equal(debug.availableSpawn('water').includes('fish'), false);
});

test('default sandbox account unlocks test content while a new journey starts clean', () => {
  const sandbox = createGame({ sandboxCharacter: true });
  assert.equal(sandbox.debug.getKanjiStat('魚').level, 10);
  assert.equal(sandbox.debug.availableSpawn('water').includes('fish'), true);
  assert.equal(sandbox.debug.isTierUnlocked('N4'), true);
  assert.equal(sandbox.debug.hasBadge('N5'), true);
  assert.ok(sandbox.debug.tierProgress('N5').captured >= 40);
  assert.ok(sandbox.debug.tierProgress('N4').captured >= 40);
  const sandboxLevels = new Set(Object.entries(sandbox.debug.mastery())
    .filter(([, stat]) => stat.captured)
    .map(([char]) => sandbox.debug.getKanjiStat(char).level));
  assert.deepEqual([...sandboxLevels].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    'SANDBOX needs captured Kanji at every level for question-mode QA');
  const n4Levels = new Set(Object.entries(sandbox.debug.mastery())
    .filter(([char, stat]) => stat.captured && sandbox.debug.tierOfKanji(char) === 'N4')
    .map(([char]) => sandbox.debug.getKanjiStat(char).level));
  assert.deepEqual([...n4Levels].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    'SANDBOX N4 mascots must also cover every level');
  for (const definition of sandbox.debug.skillDefinitions().filter((item) => item.released !== false)) {
    assert.equal(sandbox.debug.hasSkill(definition.id), true, `${definition.id} should be active in the sandbox profile`);
  }

  const fresh = createGame({ disableTestUnlocks: true });
  assert.equal(fresh.debug.getKanjiStat('魚').level, 1);
  assert.equal(fresh.debug.hasSkill('bicycle'), false);
  assert.equal(fresh.debug.isTierUnlocked('N4'), false);
});

test('selected character gender and appearance choose the matching overworld animation sheet', () => {
  const blue = createGame({ characterSlotsSave: {
    version: 2, activeSlot: 1,
    slots: [{ id: 1, name: 'Aoi', gender: 'female', appearance: 'blue', sandbox: false, onboardingComplete: true }],
  } });
  assert.equal(blue.imageRequests.includes('assets/characters/player-v4.png'), false);
  assert.equal(blue.imageRequests.includes('assets/characters/player-female-blue-v4.png'), true);
  assert.equal(blue.imageRequests.filter((asset) => asset === 'assets/characters/npc-v4.png').length, 1,
    'the NPC sheet should no longer double as the female player sheet');

  const orange = createGame({ characterSlotsSave: {
    version: 2, activeSlot: 1,
    slots: [{ id: 1, name: 'Hana', gender: 'female', appearance: 'orange', sandbox: false, onboardingComplete: true }],
  } });
  assert.equal(orange.imageRequests.includes('assets/characters/player-female-orange-v4.png'), true);
});

test('successful bootstrap paints synchronously and resize repaints the cleared canvas', async () => {
  const game = createGame();
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(game.getPaintCalls() > 0, 'first frame must not depend only on requestAnimationFrame visibility');
  const beforeResize = game.getPaintCalls();
  game.dispatchWindowEvent('resize', {});
  assert.ok(game.getPaintCalls() > beforeResize, 'resize must repaint after resetting the backing buffer');
});

test('render buffer stays CSS-sharp and caps only extra HiDPI samples', () => {
  const { debug } = createGame({ viewportWidth: 3840, viewportHeight: 2160, devicePixelRatio: 2 });
  const size = debug.getCanvasSize(), metrics = debug.getRenderMetrics();
  assert.deepEqual({ ...size }, { width: 1280, height: 720 });
  assert.equal(metrics.logicalWidth, 1280);
  assert.equal(metrics.logicalHeight, 720);
  assert.equal(metrics.backingWidth, 3840);
  assert.equal(metrics.backingHeight, 2160);
  assert.equal(metrics.presentationScale, 3);
  assert.equal(metrics.pixelRatio, 3, '8.3 MP budget should keep one backing pixel per 4K CSS pixel');
});

test('DPR changes backing resolution without changing layout or camera coordinates', () => {
  const standard = createGame({ viewportWidth: 1440, viewportHeight: 900, devicePixelRatio: 1 }).debug;
  const retina = createGame({ viewportWidth: 1440, viewportHeight: 900, devicePixelRatio: 2 }).debug;
  assert.deepEqual({ ...standard.getCanvasSize() }, { ...retina.getCanvasSize() });
  assert.deepEqual({ ...standard.getCanvasSize() }, { width: 1152, height: 720 });
  assert.equal(standard.getRenderMetrics().backingWidth, 1440);
  assert.equal(retina.getRenderMetrics().backingWidth, 2880);
  assert.equal(retina.getRenderMetrics().backingHeight, 1800);
  assert.deepEqual({ ...standard.getQuizLayout() }, { ...retina.getQuizLayout() });
  assert.deepEqual({ ...standard.getOverworldCamera() }, { ...retina.getOverworldCamera() });
});

test('pointer mapping uses logical coordinates instead of the HiDPI backing buffer', () => {
  const rect = { left: 73, top: 41, width: 960, height: 540 };
  const { debug, dispatchCanvasEvent } = createGame({
    viewportWidth: 1920, viewportHeight: 1080, devicePixelRatio: 2, canvasRect: rect,
  });
  const size = debug.getCanvasSize();
  assert.deepEqual({ ...debug.clientToLogical(rect.left + rect.width * .75, rect.top + rect.height * .25, rect) }, { x: 960, y: 180 });

  assert.equal(debug.startBattle('grass'), true);
  debug.updateBattle(1500);
  debug.renderOnce();
  const battle = debug.getBattle(), beforeHp = battle.monHp, layout = debug.getQuizLayout();
  const index = battle.q.correctIndex, col = index % 2, row = Math.floor(index / 2);
  const logicalX = layout.pad + col * (layout.answerW + layout.answerGapX) + layout.answerW / 2;
  const logicalY = layout.answerStartY + row * (layout.answerH + layout.answerGapY) + layout.answerH / 2;
  dispatchCanvasEvent('pointerdown', {
    clientX: rect.left + logicalX / size.width * rect.width,
    clientY: rect.top + logicalY / size.height * rect.height,
  });
  assert.ok(battle.monHp < beforeHp, 'the visual answer center must hit the same answer at DPR 2');
});

test('bundled multilingual font loads without blocking the first frame and triggers a clean repaint', async () => {
  const game = createGame({ mockFonts: true });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(game.debug.getFontState().ready, true);
  game.debug.enterLecture(); game.debug.renderOnce();
  assert.ok(game.textCalls.some((call) => /Giảng|KANJI|Kanji/.test(call.text) && call.font.includes('KanjiGo UI')));
  assert.equal(game.textCalls.some((call) => /[À-ỹぁ-んァ-ヶ一-龯]/u.test(call.text) && /\bmonospace\b/.test(call.font)), false);
});

test('mobile overworld zooms out enough to frame the grand academy', () => {
  const { debug } = createGame({ viewportWidth: 390, viewportHeight: 844 });
  const zoom = debug.getWorldZoom();
  assert.ok(zoom >= 1 && zoom < 2);
  assert.ok(11 * 32 * zoom <= 390, 'academy footprint should fit the mobile viewport');
});

test('campus camera stays centered on the player instead of jumping to frame the academy', () => {
  const { debug } = createGame({ viewportWidth: 1280, viewportHeight: 720 });
  const player = debug.getPlayer();
  player.gx = 7; player.gy = 9; player.px = 7 * 32; player.py = 9 * 32;
  const camera = debug.getOverworldCamera();
  const viewHeight = debug.getCanvasSize().height / debug.getWorldZoom();
  assert.equal(player.py + 16 - camera.camY, viewHeight / 2);
});

test('FTown approach softly reveals the full facade above the player', () => {
  const { debug } = createGame({ viewportWidth: 1280, viewportHeight: 720 });
  const player = debug.getPlayer();
  player.gx = 53; player.gy = 12; player.px = 53 * 32; player.py = 12 * 32;
  const camera = debug.getOverworldCamera();
  const viewHeight = debug.getCanvasSize().height / debug.getWorldZoom();
  assert.ok(player.py + 16 - camera.camY >= viewHeight / 2 + 140,
    'camera should place the player lower while framing the tall FTown landmark');
});

test('desktop HUD reserves a dedicated right-side gutter for the Settings control', () => {
  for (const viewport of [
    { viewportWidth: 744, viewportHeight: 480, devicePixelRatio: 1 },
    { viewportWidth: 3840, viewportHeight: 2160, devicePixelRatio: 2 },
  ]) {
    const { debug } = createGame(viewport);
    const layout = debug.getOverworldHudLayout();
    const metrics = debug.getRenderMetrics();
    assert.equal(layout.compact, false);
    assert.ok(layout.settingsGutter * metrics.presentationScale >= 66,
      'the logical gutter must reserve at least 66 CSS pixels at every presentation scale');
    assert.ok(layout.statusX + layout.statusW <= debug.getCanvasSize().width - layout.settingsGutter - 8,
      'status panel must end before the Settings gutter');
  }
});

test('I opens a responsive character profile with live learning stats and badge progress', async () => {
  const game = createGame({
    learningSave: {
      total: 10, correct: 8, wrong: 2, best: 4,
      mastery: { 日: { captured: true, lectured: true, mp: 90, recall: 80 } },
      vocabulary: {
        'test-seen': { stage: 'seen', seenAt: 1 },
        'test-mastered': { stage: 'mastered', seenAt: 1, masteredAt: 2 },
      },
      badges: { N5: true },
      gymHistory: { N5: { attempts: 2, bestCorrect: 25, bestTotal: 25, bestRatio: 1, bestGrade: 'S', bestAt: 10,
        bestDurationMs: 125000, lastCorrect: 18, lastTotal: 22, lastRatio: 18 / 22, lastGrade: 'A', lastAt: 20, lastDurationMs: 140000 } },
    },
  });
  await new Promise((resolve) => setImmediate(resolve));
  game.dispatchWindowEvent('keydown', { key: 'i', repeat: false, preventDefault() {} });
  assert.equal(game.debug.state(), 'profile');
  assert.doesNotThrow(() => game.debug.renderOnce());
  assert.ok(game.getSettingsOpen().classes.includes('game-ui-hidden'));
  assert.equal(game.getSettingsOpen().ariaHidden, 'true');
  assert.equal(game.getSettingsOpen().tabIndex, -1);

  const stats = game.debug.getProfileStats();
  assert.equal(stats.accuracy, 80);
  assert.ok(stats.captured >= 1);
  assert.ok(stats.levelsGained >= 4);
  assert.equal(stats.vocabularySeen, 2);
  assert.equal(stats.vocabularyMastered, 1);
  assert.equal(stats.tiers.find((tier) => tier.id === 'N5').earned, true);
  assert.ok(game.textCalls.some((call) => call.text === 'HỒ SƠ NHÂN VẬT'));
  assert.ok(game.textCalls.some((call) => call.text === 'HUY HIỆU N5'));
  assert.ok(game.textCalls.some((call) => call.text === 'ĐÃ NHẬN · PASS ✓'));
  assert.ok(game.textCalls.some((call) => call.text.startsWith('S · 25/25')),
    'best score remains visible even when the responsive card shortens the percentage');
  assert.ok(game.textCalls.some((call) => call.text.startsWith('THỜI LƯỢNG')));
  assert.ok(game.textCalls.some((call) => call.text === '2:05'));
  assert.ok(game.textCalls.filter((call) => call.text.startsWith('THÀNH TÍCH')).length >= 2,
    'both N5 and N4 badge cards need useful result information');
  assert.ok(game.textCalls.some((call) => call.text === 'THU PHỤC N4'));
  assert.ok(game.drawCalls.some((call) => call.type === 'fillRect' && call.fillStyle === 'rgba(17,67,58,.9)'),
    'earned badges should use the updated emerald crest card');
  const close = game.debug.getProfileUi().hitboxes.find((box) => box.action === 'close');
  assert.ok(close && close.x >= 0 && close.y >= 0 && close.x + close.w <= game.debug.getCanvasSize().width);

  game.dispatchWindowEvent('keydown', { key: 'I', repeat: false, preventDefault() {} });
  assert.equal(game.debug.state(), 'overworld');
  game.debug.renderOnce();
  assert.ok(!game.getSettingsOpen().classes.includes('game-ui-hidden'));
  assert.equal(game.getSettingsOpen().ariaHidden, 'false');
  assert.equal(game.getSettingsOpen().tabIndex, 0);
});

test('active character slot scopes both saves and supplies the Profile display name', async () => {
  const characterSlotsSave = {
    version: 1, activeSlot: 2,
    slots: [
      { id: 1, name: 'Nhân vật 1', createdAt: 1, lastPlayedAt: 1 },
      { id: 2, name: 'Akari', createdAt: 2, lastPlayedAt: 2 },
    ],
  };
  const game = createGame({
    characterSlotsSave,
    learningSave: { mastery: { 日: { captured: true, lectured: true, mp: 30 } } },
    gameSave: { petData: { kuni: { evolveStage: 0 } }, currentPetId: 'kuni', stamina: 2 },
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(game.debug.getKanjiStat('日').captured, true);
  assert.ok(game.storage.has('KANJIGO_LEARNING_V1__CHARACTER_2'));
  assert.ok(game.storage.has('KANJIGO_GAME_V1__CHARACTER_2'));
  assert.equal(game.storage.has('KANJIGO_LEARNING_V1'), false, 'Slot 2 must not write into the legacy Slot 1 save');
  game.debug.openProfile(); game.debug.renderOnce();
  assert.ok(game.textCalls.some((call) => call.text === 'Akari'));
});

test('mobile profile renders in portrait and closes through the shared Back control', async () => {
  const game = createGame({ viewportWidth: 390, viewportHeight: 844 });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(game.debug.openProfile(), true);
  assert.doesNotThrow(() => game.debug.renderOnce());
  assert.equal(game.getTouchBack().text, 'ĐÓNG');
  assert.equal(game.debug.getProfileUi().hitboxes.some((box) => box.action === 'close'), false,
    'mobile should not draw a second canvas close button beneath the shared Back control');
  game.dispatchTouchBack();
  assert.equal(game.debug.state(), 'overworld');
});

test('mobile NPC dialog wraps inside its panel and exposes a dedicated Continue action', async () => {
  const game = createGame({ viewportWidth: 390, viewportHeight: 844 });
  await new Promise((resolve) => setImmediate(resolve));
  const player = game.debug.getPlayer();
  Object.assign(player, { gx: 17, gy: 12, px: 17 * 32, py: 12 * 32, facing: 'up', moving: false });
  game.debug.onSpace();
  assert.equal(game.debug.getDialog().active, true);
  game.debug.renderOnce();
  const layout = game.debug.getDialogLayout(), canvas = game.debug.getCanvasSize();
  assert.ok(layout.x >= 0 && layout.x + layout.w <= canvas.width);
  assert.ok(layout.y >= 0 && layout.y + layout.h <= canvas.height);
  assert.ok(layout.textY + Math.max(0, layout.lineCount - 1) * layout.lineH <= layout.footerY,
    'wrapped NPC copy must stop before the dialog footer');
  assert.equal(game.getTouchBack().text, 'TIẾP');
  assert.ok(game.getTouchBack().classes.includes('continue-action'));
  game.dispatchTouchBack();
  assert.equal(game.debug.getDialog().idx, 1, 'mobile Continue should advance to the next NPC line');
});

test('academy interaction works from the approach tile and while standing in the doorway', () => {
  for (const position of [
    { gx: 7, gy: 9, facing: 'up', label: 'approach tile', input: 'space' },
    { gx: 7, gy: 8, facing: 'up', label: 'doorway tile', input: 'enter' },
  ]) {
    const { debug, dispatchWindowEvent } = createGame();
    const player = debug.getPlayer();
    player.gx = position.gx; player.gy = position.gy;
    player.px = position.gx * 32; player.py = position.gy * 32;
    player.facing = position.facing; player.moving = false;
    assert.equal(debug.academyEntranceInReach(), true, `${position.label} should reach the academy`);
    dispatchWindowEvent('keydown', { key: position.input === 'enter' ? 'Enter' : ' ', preventDefault() {} });
    assert.equal(debug.state(), 'lecture', `${position.label} should enter the academy`);
    debug.renderOnce();
  }
});

test('new character learns the selected starter while Aoi guides every onboarding location', () => {
  const characterSlotsSave = {
    version: 2, activeSlot: 1,
    slots: [{ id: 1, name: 'Hana', gender: 'female', appearance: 'orange', sandbox: false,
      starterKanji: '日', onboardingComplete: false, onboardingIntroComplete: true, onboardingStep: 3, onboardingTourStep: 0 }],
  };
  const game = createGame({ characterSlotsSave, disableTestUnlocks: true });
  const player = game.debug.getPlayer();
  const placePlayer = (gx, gy, facing) => Object.assign(player, {
    gx, gy, px: gx * 32, py: gy * 32, facing, moving: false,
  });
  const finishTwoLineGuideDialog = () => { game.debug.onSpace(); game.debug.onSpace(); };

  let tour = game.debug.getOnboardingTour();
  assert.equal(tour.stop.id, 'academy');
  assert.equal(tour.profile.starterKanji, '日');
  assert.equal(game.debug.getPet(), null, 'a new character must not receive the legacy default pet');
  assert.equal(game.debug.hasFollower(), false);
  assert.deepEqual(Object.keys(game.debug.petData()), []);
  assert.equal(game.debug.getKanjiStat('国').captured, false);
  assert.equal(game.debug.canWalk(tour.stop.gx, tour.stop.gy), false, 'active guide occupies her map tile');
  placePlayer(8, 10, 'up');
  game.debug.onSpace();
  assert.equal(game.debug.getDialog().npc.name, 'Aoi');
  finishTwoLineGuideDialog();
  assert.equal(game.debug.state(), 'lecture');
  assert.equal(game.debug.getLecture().char, '日', 'Academy opens the chosen starter instead of a random curriculum item');

  assert.equal(game.debug.getOnboardingTour().stop.id, 'academy', 'opening the lesson alone must not advance onboarding');
  game.debug.onLectureKey('enter');
  game.debug.onLectureKey('enter');
  revealAllAcademyCards(game.debug);
  for (let index = 0; index < 3; index++) {
    game.debug.answerLecture(game.debug.getLecture().q.correctIndex);
    game.debug.onLectureKey('enter');
  }
  assert.equal(game.debug.getLecture().phase, 'ready');
  game.debug.onLectureKey('enter');
  assert.equal(game.debug.state(), 'capture');
  for (let index = 0; index < 5; index++) {
    game.debug.answerCapture(game.debug.getCapture().q.correctIndex);
    game.debug.updateCapture(700);
  }
  assert.equal(game.debug.getCapture().passed, true);
  assert.equal(game.debug.getCapture().catchEffectTotal, 1500, 'successful capture should start its semantic victory effect');
  assert.equal(game.debug.resolveKanjiAnimation('ri').attack, 'solar-burst');
  assert.doesNotThrow(() => game.debug.renderOnce(), 'semantic capture effect crashed the capture result screen');
  game.debug.updateCapture(500);
  assert.equal(game.debug.getCapture().catchEffectT, 1000, 'capture victory effect should animate over time');
  assert.equal(game.debug.getKanjiStat('日').captured, true);
  assert.equal(game.debug.getOnboardingTour().stop.id, 'wilderness', 'only capturing the selected starter advances the tour');
  assert.equal(game.debug.getPet(), null, 'captured starter stays hidden until the mandatory tour is complete');
  assert.equal(game.debug.hasFollower(), false);

  game.debug.onCaptureKey('enter');
  game.debug.onLectureKey('escape'); game.debug.onLectureKey('escape');
  assert.equal(game.debug.state(), 'overworld');
  tour = game.debug.getOnboardingTour();
  assert.equal(tour.stop.id, 'wilderness');
  placePlayer(31, 9, 'down');
  game.debug.onSpace(); finishTwoLineGuideDialog();
  assert.equal(game.debug.getOnboardingTour().stop.id, 'arena');

  placePlayer(20, 15, 'down');
  game.debug.onSpace(); finishTwoLineGuideDialog();
  assert.equal(game.context.KanjiGOCharacters.active().onboardingComplete, true);
  assert.equal(game.debug.getOnboardingTour(), null);
  assert.equal(game.debug.hasFollower(), true);
  assert.equal(game.context.CONFIG.MONSTERS[game.debug.getPet().id].kanji, '日');
});

test('onboarding renders a player-side arrow pointing toward guide Aoi', async () => {
  const characterSlotsSave = {
    version: 2, activeSlot: 1,
    slots: [{ id: 1, name: 'Hana', gender: 'female', appearance: 'orange', sandbox: false,
      starterKanji: '日', onboardingComplete: false, onboardingIntroComplete: true, onboardingStep: 3, onboardingTourStep: 0 }],
  };
  const game = createGame({ characterSlotsSave, disableTestUnlocks: true, viewportWidth: 390, viewportHeight: 844 });
  await new Promise((resolve) => setImmediate(resolve));
  const player = game.debug.getPlayer();
  Object.assign(player, { gx: 4, gy: 13, px: 4 * 32, py: 13 * 32, moving: false });
  game.debug.renderOnce();
  const waypoint = game.debug.getOnboardingWaypoint();
  assert.equal(waypoint.targetId, 'academy');
  assert.equal(waypoint.name, 'Aoi');
  assert.ok(waypoint.angle < 0, 'Aoi is above the player, so the arrow should point upward');
  assert.ok(waypoint.distanceTiles > 1);
  assert.ok(game.textCalls.some((call) => call.text === 'AOI'));

  Object.assign(player, { gx: 8, gy: 10, px: 8 * 32, py: 10 * 32, facing: 'up' });
  game.debug.onSpace(); game.debug.renderOnce();
  assert.equal(game.debug.getOnboardingWaypoint(), null, 'the waypoint should hide while talking to Aoi');
});

test('Settings corner control stays out of the Academy canvas UI', () => {
  const game = createGame();
  game.debug.enterLecture();
  game.debug.renderOnce();
  const settings = game.getSettingsOpen();
  assert.ok(settings.classes.includes('game-ui-hidden'));
  assert.equal(settings.ariaHidden, 'true');
  assert.equal(settings.tabIndex, -1);
});

function enterAcademyCards(debug, char = '日') {
  assert.equal(debug.startAcademyLesson(char), true);
  assert.equal(debug.getLecture().phase, 'intro');
  debug.onLectureKey('enter');
  assert.equal(debug.getLecture().phase, 'readings');
  debug.onLectureKey('enter');
  assert.equal(debug.getLecture().phase, 'cards');
}

function revealAllAcademyCards(debug) {
  const total = debug.getLecture().examples.length;
  for (let index = 0; index < total; index++) {
    assert.equal(debug.getLecture().cardIndex, index);
    debug.onLectureKey('enter'); // reveal
    assert.equal(debug.getLecture().cardRevealed, true);
    if (index < total - 1) debug.onLectureKey('enter'); // next card
  }
  debug.onLectureKey('enter'); // begin check after the final revealed card
  assert.equal(debug.getLecture().phase, 'check');
}

test('Academy Learning Cards cover every vocabulary item before the mini-check', () => {
  const { debug } = createGame();
  enterAcademyCards(debug, '日');
  assert.equal(debug.getLecture().examples.length, 3, '日 should expose its complete vocabulary set');
  revealAllAcademyCards(debug);

  const taughtIds = new Set(debug.getLecture().examples.map((question) => question.id));
  assert.deepEqual(new Set(debug.getLecture().seenVocabIds), taughtIds);
  for (const id of taughtIds) assert.equal(debug.getVocabularyProgress(id).stage, 'seen');
  for (let index = 0; index < 3; index++) {
    assert.ok(taughtIds.has(debug.getLecture().q.vocabId), 'mini-check selected vocabulary that was not shown');
    debug.answerLecture(debug.getLecture().q.correctIndex);
    debug.onLectureKey('enter');
  }
  assert.equal(debug.getLecture().phase, 'ready');
  assert.equal(debug.getKanjiStat('日').lectured, true);
});

test('Academy cards require reveal and always open the next vocabulary on its front face', () => {
  const { debug } = createGame();
  enterAcademyCards(debug, '日');
  const first = debug.getLecture().examples[0], second = debug.getLecture().examples[1];
  assert.equal(debug.getVocabularyProgress(first.id), null, 'merely displaying a card must not mark it seen');
  debug.renderOnce();
  assert.equal(debug.getLecture().hitboxes.some((box) => box.action === 'card_next'), false, 'Next must stay hidden before reveal');

  debug.onLectureKey('enter');
  assert.equal(debug.getVocabularyProgress(first.id).stage, 'seen');
  debug.renderOnce();
  assert.equal(debug.getLecture().hitboxes.some((box) => box.action === 'card_reveal'), false);
  assert.equal(debug.getLecture().hitboxes.some((box) => box.action === 'card_next'), true);

  debug.onLectureKey('arrowright');
  assert.equal(debug.getLecture().cardIndex, 1);
  assert.equal(debug.getLecture().cardRevealed, false, 'the next card must begin on its retrieval face');
  assert.equal(debug.getVocabularyProgress(second.id), null, 'an unrevealed next card must not be counted as seen');
});

test('Academy flashcards can navigate back through previous cards, readings, and intro', () => {
  const { debug } = createGame();
  enterAcademyCards(debug, '日');
  debug.renderOnce();
  assert.ok(debug.getLecture().hitboxes.some((box) => box.action === 'lesson_back'), 'the first flashcard needs a visible Back action');

  debug.onLectureKey('arrowleft');
  assert.equal(debug.getLecture().phase, 'readings', 'Back on the first card should return to step 2');
  debug.renderOnce();
  assert.ok(debug.getLecture().hitboxes.some((box) => box.action === 'lesson_back'), 'step 2 needs a visible Back action');
  debug.onLectureKey('arrowleft');
  assert.equal(debug.getLecture().phase, 'intro', 'Back on readings should return to step 1');

  debug.onLectureKey('enter');
  debug.onLectureKey('enter');
  debug.onLectureKey('enter');
  debug.onLectureKey('arrowright');
  assert.equal(debug.getLecture().cardIndex, 1);
  debug.onLectureKey('arrowleft');
  assert.equal(debug.getLecture().phase, 'cards');
  assert.equal(debug.getLecture().cardIndex, 0, 'Back should revisit the previous card');
  assert.equal(debug.getLecture().cardRevealed, true, 'a previously learned card should reopen on its revealed face');
});

test('Academy reading step plays the selected Kanji ON and KUN audio from inline speakers', () => {
  const game = createGame();
  assert.equal(game.debug.startAcademyLesson('日'), true);
  game.debug.onLectureKey('enter');
  assert.equal(game.debug.getLecture().phase, 'readings');
  game.debug.renderOnce();
  const speakers = game.debug.getLecture().hitboxes.filter((box) => box.action === 'reading_audio');
  assert.equal(Array.from(speakers, (box) => box.value.type).sort().join(','), 'kun,on');
  assert.ok(speakers.every((box) => box.w >= 44 && box.h >= 44), 'Academy speakers need mobile-sized touch targets');
  for (const speaker of speakers) {
    game.dispatchCanvasEvent('pointerdown', { clientX: speaker.x + speaker.w / 2, clientY: speaker.y + speaker.h / 2 });
  }
  assert.ok(game.audioCalls.some((call) => call.kind === 'on' && call.char === '日'));
  assert.ok(game.audioCalls.some((call) => call.kind === 'kun' && call.char === '日'));
});

test('tall mobile Academy keeps lesson actions above embedded-browser toolbars', () => {
  const game = createGame({ viewportWidth: 390, viewportHeight: 844 });
  assert.equal(game.debug.startAcademyLesson('日'), true);
  game.debug.renderOnce();
  const { height } = game.debug.getCanvasSize();
  const action = game.debug.getLecture().hitboxes.find((box) => box.action === 'continue');
  assert.ok(action, 'the primary lesson action should remain visible');
  assert.ok(action.y + action.h <= height - 70,
    'a tall portrait viewport needs spare space below the action for browser chrome');
});

test('Academy action keys ignore browser repeat and mobile Back remains usable', () => {
  const { debug, dispatchWindowEvent, dispatchTouchBack } = createGame();
  assert.equal(debug.startAcademyLesson('日'), true);
  dispatchWindowEvent('keydown', { key: 'Enter', repeat: true, preventDefault() {} });
  assert.equal(debug.getLecture().phase, 'intro', 'held Enter must not skip Academy phases');
  dispatchTouchBack();
  assert.equal(debug.getLecture().phase, 'lobby');
  dispatchTouchBack();
  assert.equal(debug.state(), 'overworld');
});

test('Academy and KanjiDex highlight the Hán Việt part of mascot names', () => {
  const academy = createGame();
  assert.equal(academy.debug.startAcademyLesson('日'), true);
  academy.debug.renderOnce();
  assert.ok(academy.textCalls.some((call) => call.text.includes('HÁN VIỆT')));
  assert.ok(academy.textCalls.some((call) => call.text === 'Nhật' && call.fillStyle === '#ffd54a'));

  const dex = createGame();
  dex.debug.openDex(); dex.debug.renderOnce();
  assert.ok(dex.textCalls.some((call) => call.text === 'Quốc' && call.fillStyle === '#ffd54a'));
  assert.ok(dex.textCalls.some((call) => call.text.includes('Vương') && call.fillStyle === '#fff'));
});

test('KanjiDex pronunciation speakers sit directly beside their ON and KUN readings', () => {
  const game = createGame({ sandboxCharacter: true });
  game.debug.openDex(); game.debug.renderOnce();
  const audioBoxes = game.debug.getDex().hitboxes.filter((box) => box.action === 'kanji-audio');
  const onBox = audioBoxes.find((box) => box.value.type === 'on');
  const kunBox = audioBoxes.find((box) => box.value.type === 'kun');
  const onText = game.textCalls.findLast((call) => call.text.startsWith('Âm ON:'));
  const kunText = game.textCalls.findLast((call) => call.text.startsWith('Âm KUN:'));
  assert.ok(onBox && kunBox && onText && kunText, 'both readable pronunciations need a speaker action');
  assert.equal(onBox.x + onBox.w / 2, onText.x + onText.text.length * 8 + 17, 'ON speaker drifted away from its rendered reading');
  assert.equal(kunBox.x + kunBox.w / 2, kunText.x + kunText.text.length * 8 + 17, 'KUN speaker drifted away from its rendered reading');
  assert.ok(onBox.w >= 44 && onBox.h >= 44 && kunBox.w >= 44 && kunBox.h >= 44,
    'pronunciation actions need a reliable mobile touch target');
});

test('mobile KanjiDex exposes a touch action to change the active follower', () => {
  const game = createGame({ sandboxCharacter: true, viewportWidth: 390, viewportHeight: 844 });
  game.debug.openDex();
  game.debug.onDexKey('arrowright');
  game.debug.renderOnce();
  const equip = game.debug.getDex().hitboxes.find((box) => box.action === 'equip-pet');
  assert.ok(equip, 'a captured non-active Kanji needs a visible mobile equip action');
  assert.ok(equip.h >= 44, 'the follower action needs a reliable touch target');
  const canvas = game.debug.getCanvasSize();
  game.dispatchCanvasEvent('pointerdown', {
    clientX: (equip.x + equip.w / 2) * 390 / canvas.width,
    clientY: (equip.y + equip.h / 2) * 844 / canvas.height,
  });
  assert.equal(game.context.CONFIG.MONSTERS[game.debug.getPet().id].kanji, equip.value);
  assert.equal(game.debug.state(), 'overworld', 'equipping from mobile should return to the map like Enter does');
});

test('mobile KanjiDex search opens a native input and filters by Kanji, reading, or accentless meaning', () => {
  const game = createGame({ sandboxCharacter: true, viewportWidth: 390, viewportHeight: 844 });
  game.debug.openDex(); game.debug.renderOnce();
  assert.equal(game.getDexSearch().hidden, false, 'the native search input must be available to the mobile keyboard');

  game.dispatchDexSearch('水');
  assert.deepEqual(Array.from(game.debug.getDex().list), ['水']);
  game.dispatchDexSearch('みず');
  assert.ok(Array.from(game.debug.getDex().list).includes('水'), 'KUN reading should find 水 even when another reading shares the prefix');
  game.dispatchDexSearch('nuoc');
  assert.deepEqual(Array.from(game.debug.getDex().list), ['水'], 'Vietnamese search should work without accents');

  game.dispatchDexSearchKey('Enter');
  assert.equal(game.context.CONFIG.MONSTERS[game.debug.getPet().id].kanji, '水', 'Enter in search should equip the filtered Kanji');
  assert.equal(game.debug.state(), 'overworld');

  assert.equal(game.getDexSearch().hidden, true, 'leaving KanjiDex must hide the search input');
});

test('touching KanjiDex content dismisses mobile search focus without clearing its query', () => {
  const game = createGame({ sandboxCharacter: true, viewportWidth: 390, viewportHeight: 844 });
  game.debug.openDex(); game.debug.renderOnce();
  game.debug.onDexKey('/');
  game.dispatchDexSearch('nuoc'); game.debug.renderOnce();
  assert.equal(game.getDexSearch().focused, true);

  const card = game.debug.getDex().hitboxes.find((box) => box.action === 'card');
  assert.ok(card, 'the filtered result needs a tappable card');
  const canvas = game.debug.getCanvasSize();
  game.dispatchCanvasEvent('pointerdown', {
    clientX: (card.x + card.w / 2) * 390 / canvas.width,
    clientY: (card.y + Math.min(20, card.h / 2)) * 844 / canvas.height,
  });

  assert.equal(game.getDexSearch().focused, false, 'tapping below search should dismiss the mobile keyboard');
  assert.equal(game.debug.getDex().query, 'nuoc');
  assert.deepEqual(Array.from(game.debug.getDex().list), ['水']);
});

test('small mobile KanjiDex reserves enough room for every selected detail row', () => {
  const game = createGame({ sandboxCharacter: true, viewportWidth: 360, viewportHeight: 640 });
  game.debug.openDex(); game.debug.renderOnce();
  const layout = game.debug.getDexLayout();
  const recall = game.textCalls.findLast((call) => call.text.startsWith('Recall '));
  assert.ok(layout.panelH >= 128, 'the narrow detail panel must not collapse below its five rows');
  assert.ok(recall && recall.y <= 640 - 8, 'Recall must stay visibly inside the small viewport');
});

test('every vocabulary row supports sentence reading, kana-to-Kanji, and furigana meaning questions', () => {
  const { context, debug } = createGame();
  for (const sourceQuestion of context.KANJI_DB.QUESTIONS) {
    for (const mode of ['m8', 'm9', 'm10']) {
      const generated = debug.makeQuestion(sourceQuestion.target, '', mode, true, [sourceQuestion]);
      assert.equal(generated.mode, mode, `${sourceQuestion.id} must support ${mode}`);
      assert.equal(generated.options.length, 4, `${sourceQuestion.id}/${mode} must have four options`);
      assert.ok(generated.correctIndex >= 0, `${sourceQuestion.id}/${mode} lost its correct answer`);
    }
  }
  const source = context.KANJI_DB.QUESTIONS.find((q) => q.word === '水' && q.target === '水' && q.answer === 'みず');
  assert.ok(source);

  const reading = debug.makeQuestion('水', '', 'm8', true, [source]);
  assert.equal(reading.mode, 'm8');
  assert.equal(reading.sentence, 'まいにち 水を のみます。');
  assert.equal(reading.answer, 'みず');
  assert.equal(reading.options.length, 4);

  const kanji = debug.makeQuestion('水', '', 'm9', true, [source]);
  assert.equal(kanji.mode, 'm9');
  assert.equal(kanji.sentenceReading, 'まいにち みずを のみます。');
  assert.equal(kanji.targetReading, 'みず');
  assert.equal(kanji.answer, '水');
  assert.ok(kanji.options.includes('水'));

  const meaning = debug.makeQuestion('水', '', 'm10', true, [source]);
  assert.equal(meaning.mode, 'm10');
  assert.equal(meaning.wordReading, 'みず');
  assert.equal(meaning.answer, 'nước');
  assert.ok(meaning.options.includes('nước'));
});

test('question formats unlock monotonically and workbook context modes use curated choices', () => {
  const { context, debug } = createGame();
  const levels = Array.from({ length: 10 }, (_, index) => new Set(debug.questionModesForLevel(index + 1)));
  assert.deepEqual([...levels[0]].sort(), ['m1', 'm6']);
  for (let index = 1; index < levels.length; index++) {
    for (const mode of levels[index - 1]) assert.ok(levels[index].has(mode), `${mode} was re-locked at level ${index + 1}`);
  }
  assert.equal(levels[4].has('m11'), false);
  assert.equal(levels[5].has('m11'), true);
  assert.equal(levels[2].has('m14'), false);
  assert.equal(levels[3].has('m14'), true);
  assert.equal(levels[3].has('m15'), false);
  assert.equal(levels[4].has('m15'), true);
  assert.equal(levels[5].has('m13'), false);
  assert.equal(levels[6].has('m13'), true);
  assert.equal(levels[6].has('m12'), false);
  assert.equal(levels[7].has('m12'), true);
  assert.equal(levels[8].has('m10'), true);

  const source = context.KANJI_DB.CHALLENGES[0];
  const reading = debug.makeQuestion(source.target, '', 'm11', true, [source]);
  assert.equal(reading.mode, 'm11');
  assert.equal(reading.answer, source.wordReading);
  assert.equal(reading.options.length, 4);
  assert.ok(reading.options.includes(source.wordReading));
  const spelling = debug.makeQuestion(source.target, '', 'm12', true, [source]);
  assert.equal(spelling.mode, 'm12');
  assert.equal(spelling.answer, source.word);
  assert.equal(spelling.options.length, 4);
  assert.ok(spelling.options.includes(source.word));

  const cloze = debug.makeQuestion(source.target, '', 'm13', true, [source]);
  assert.equal(cloze.mode, 'm13');
  assert.equal(cloze.answer, source.word);
  assert.ok(cloze.clozeSentence.includes('＿＿') && !cloze.clozeSentence.includes(source.word));
  assert.equal(cloze.options.length, 4);
  assert.ok(cloze.options.includes(source.word));

  const vocabulary = context.KANJI_DB.QUESTIONS.find((question) => question.wordReading && question.mean);
  const reverseReading = debug.makeQuestion(vocabulary.target, '', 'm14', true, [vocabulary]);
  assert.equal(reverseReading.mode, 'm14');
  assert.equal(reverseReading.answer, vocabulary.word);
  assert.equal(reverseReading.options.length, 4);
  const reverseMeaning = debug.makeQuestion(vocabulary.target, '', 'm15', true, [vocabulary]);
  assert.equal(reverseMeaning.mode, 'm15');
  assert.equal(reverseMeaning.answer, vocabulary.word);
  assert.equal(reverseMeaning.options.length, 4);

  const stat = debug.mastery()[source.target];
  stat.mp = debug.mpFloorOfLevel(10);
  const nonRepeating = debug.makeQuestion(source.target, 'm1|previous-question');
  assert.notEqual(nonRepeating.mode, 'm1', 'the same question format must not repeat back-to-back when alternatives exist');
});

test('mobile Back presents the correct action and exits completed battle states', () => {
  const { debug, dispatchTouchBack, getTouchBack } = createGame();
  debug.openDex(); debug.renderOnce();
  assert.equal(getTouchBack().text, 'ĐÓNG');
  dispatchTouchBack();
  assert.equal(debug.state(), 'overworld');

  assert.equal(debug.startBattle('grass'), true);
  debug.renderOnce();
  assert.match(getTouchBack().text, /^CHẠY \d+%$/);
  assert.match(getTouchBack().ariaLabel, /tỉ lệ/i);

  debug.getBattle().phase = 'end';
  debug.renderOnce();
  assert.equal(getTouchBack().text, 'TIẾP');
  assert.ok(getTouchBack().classes.includes('continue-action'));
  dispatchTouchBack();
  assert.equal(debug.state(), 'overworld', 'Back must continue from a completed battle instead of trying to run again');
});

test('mobile Back continues from Capture and PvE result screens', () => {
  const captureGame = createGame();
  captureGame.debug.mastery()['日'].lectured = true;
  assert.equal(captureGame.debug.startCapture('日'), true);
  captureGame.debug.getCapture().phase = 'end';
  captureGame.debug.getCapture().passed = false;
  captureGame.debug.renderOnce();
  assert.equal(captureGame.getTouchBack().text, 'TIẾP');
  captureGame.dispatchTouchBack();
  assert.equal(captureGame.debug.state(), 'lecture');

  const pveGame = createGame();
  pveGame.debug.mastery()['日'].captured = true;
  assert.equal(pveGame.debug.startPve({ pool: ['日'], questions: 1 }), true);
  pveGame.debug.getPve().phase = 'end';
  pveGame.debug.renderOnce();
  assert.equal(pveGame.getTouchBack().text, 'TIẾP');
  pveGame.dispatchTouchBack();
  assert.equal(pveGame.debug.state(), 'overworld');
});

test('legacy Academy checks resume at Learning Cards so unseen vocabulary cannot be tested', () => {
  const legacy = { academyDraft: { char: '日', phase: 'check', checkIndex: 2, lessonScore: 0 } };
  const { debug } = createGame({ learningSave: legacy });
  assert.equal(debug.startAcademyLesson('日', true), true);
  assert.equal(debug.getLecture().phase, 'cards');
  assert.equal(debug.getLecture().seenVocabIds.length, 0);
  assert.equal(debug.getLecture().cardRevealed, false);
});

test('Academy uses targeted recap for partial and low first-pass scores', () => {
  const partial = createGame().debug;
  enterAcademyCards(partial); revealAllAcademyCards(partial);
  let missedId = '';
  for (let index = 0; index < 3; index++) {
    const q = partial.getLecture().q;
    const answer = index === 2 ? (q.correctIndex + 1) % q.options.length : q.correctIndex;
    if (index === 2) missedId = q.vocabId;
    partial.answerLecture(answer); partial.onLectureKey('enter');
  }
  assert.equal(partial.getLecture().phase, 'recap');
  assert.equal(partial.getLecture().lessonScore, 2);
  assert.ok(partial.getLecture().recapIds.includes(missedId));
  assert.equal(partial.getKanjiStat('日').lectured, false, 'recap must happen before lesson completion');
  partial.onLectureKey('enter');
  assert.equal(partial.getLecture().phase, 'confirm');
  partial.answerLecture(partial.getLecture().q.correctIndex); partial.onLectureKey('enter');
  assert.equal(partial.getLecture().phase, 'ready');

  const low = createGame().debug;
  enterAcademyCards(low); revealAllAcademyCards(low);
  for (let index = 0; index < 3; index++) {
    const q = low.getLecture().q;
    low.answerLecture((q.correctIndex + 1) % q.options.length); low.onLectureKey('enter');
  }
  assert.equal(low.getLecture().phase, 'recap');
  assert.ok(low.getLecture().recapIds.length >= 2);
  while (low.getLecture().phase === 'recap') low.onLectureKey('enter');
  assert.equal(low.getLecture().confirmTotal, 2);
  while (low.getLecture().phase === 'confirm') {
    low.answerLecture(low.getLecture().q.correctIndex); low.onLectureKey('enter');
  }
  assert.equal(low.getLecture().phase, 'ready');
  assert.equal(low.getKanjiStat('日').lectured, true);
});

test('Capture tests taught vocabulary and changes the SRS box at most once per session', () => {
  const { debug } = createGame();
  enterAcademyCards(debug); revealAllAcademyCards(debug);
  for (let index = 0; index < 3; index++) {
    debug.answerLecture(debug.getLecture().q.correctIndex); debug.onLectureKey('enter');
  }
  const taughtIds = new Set(debug.getLecture().seenVocabIds);
  const stat = debug.mastery()['日']; stat.box = 0; stat.nextReview = 0;
  assert.equal(debug.startCapture('日'), true);
  for (let index = 0; index < 5; index++) {
    const capture = debug.getCapture();
    assert.ok(taughtIds.has(capture.q.vocabId), 'Capture selected vocabulary outside the lesson cards');
    assert.ok(['m1', 'm6'].includes(capture.q.mode), 'Level 1 Capture must not jump to a locked question format');
    debug.answerCapture(capture.q.correctIndex); debug.updateCapture(700);
  }
  assert.equal(debug.getCapture().phase, 'end');
  assert.equal(stat.box, 1, 'five correct answers in one Capture must only promote one box');
  debug.updateCapture(700);
  assert.equal(stat.box, 1, 'session finalization must be idempotent');
});

test('mobile Academy renders the card, recap, and confirmation flow without overflow crashes', () => {
  const { debug } = createGame({ viewportWidth: 390, viewportHeight: 844 });
  enterAcademyCards(debug);
  assert.doesNotThrow(() => debug.renderOnce());
  revealAllAcademyCards(debug);
  for (let index = 0; index < 3; index++) {
    const q = debug.getLecture().q;
    debug.answerLecture((q.correctIndex + 1) % q.options.length); debug.onLectureKey('enter');
  }
  assert.equal(debug.getLecture().phase, 'recap');
  assert.doesNotThrow(() => debug.renderOnce());
  while (debug.getLecture().phase === 'recap') debug.onLectureKey('enter');
  assert.equal(debug.getLecture().phase, 'confirm');
  assert.doesNotThrow(() => debug.renderOnce());
});

test('startup only preloads core assets and the active pet', () => {
  const { imageRequests } = createGame();
  assert.equal(imageRequests.length, 24);
  assert.ok(imageRequests.includes('assets/characters/bicycle-overlay-v4.png'));
  assert.ok(imageRequests.includes('assets/world/terrain-tiles.png'));
  assert.ok(imageRequests.includes('assets/world/tulip-tiles.png'));
  assert.ok(imageRequests.includes('assets/world/arena-wall-tiles.png'));
  assert.ok(imageRequests.includes('assets/world/trainer-theme-icons.png'));
  assert.ok(imageRequests.includes('assets/world/ftown-campus-v3.png'));
  assert.ok(imageRequests.includes('assets/world/innovation-hub.png'));
  assert.ok(imageRequests.includes('assets/world/heritage-garden-pavilion-v2.png'));
  assert.ok(imageRequests.includes('assets/world/hoa-lac-campus-v2.png'));
  assert.ok(imageRequests.includes('assets/world/cuder-statue.png'));
  assert.ok(imageRequests.includes('assets/world/fpt-software-sign-v2.png'));
  assert.ok(imageRequests.includes('assets/world/campus-shrub-cluster.png'));
  assert.ok(imageRequests.includes('assets/world/fpt-campus-garden.png'));
  assert.ok(imageRequests.includes('assets/world/campus-lawn-tile.png'));
  assert.ok(imageRequests.includes('assets/world/campus-plaza-tile.png'));
  assert.ok(imageRequests.includes('assets/world/campus-tech-tile.png'));
  assert.ok(imageRequests.includes('assets/world/campus-courtyard-tile.png'));
  assert.ok(imageRequests.includes('assets/backgrounds/battle-forest.png'));
  assert.ok(imageRequests.includes('assets/backgrounds/battle-stand.png'));
  assert.ok(imageRequests.includes('assets/monsters/kuni/sprite.png'));
});

test('world render builds and reuses one static ground layer', async () => {
  const { debug } = createGame();
  await new Promise((resolve) => setImmediate(resolve));
  assert.doesNotThrow(() => debug.renderOnce());
  const first = debug.ensureWorldGroundCache();
  assert.ok(first);
  debug.renderOnce();
  assert.equal(debug.ensureWorldGroundCache(), first);
});

test('overworld renders FTown, Hoa Lac, and discoverable 404 Garden easter eggs', async () => {
  const { debug, textCalls, drawCalls } = createGame();
  await new Promise((resolve) => setImmediate(resolve));
  const player = debug.getPlayer();
  const visit = (gx, gy) => {
    player.gx = gx; player.gy = gy; player.px = gx * 32; player.py = gy * 32; player.moving = false;
    textCalls.length = 0; drawCalls.length = 0; debug.renderOnce();
    return { texts: textCalls.map((call) => call.text), draws: [...drawCalls] };
  };
  const ftown = visit(53, 12);
  assert.ok(ftown.texts.includes('FTOWN'));
  assert.ok(ftown.draws.some((call) => call.type === 'drawImage' && call.src === 'assets/world/ftown-campus-v3.png'));
  const innovation = visit(51, 22);
  assert.ok(innovation.draws.some((call) => call.type === 'drawImage' && call.src === 'assets/world/innovation-hub.png'));
  const hoaLac = visit(46, 41);
  assert.ok(hoaLac.draws.some((call) => call.type === 'drawImage' && call.src === 'assets/world/hoa-lac-campus-v2.png'));
  assert.ok(hoaLac.draws.some((call) => call.type === 'drawImage' && call.src === 'assets/world/cuder-statue.png'));
  const campusPark = visit(22, 36);
  assert.ok(campusPark.draws.some((call) => call.type === 'drawImage' && call.src === 'assets/world/fpt-campus-garden.png'));
  const northMonument = visit(21, 4);
  assert.ok(northMonument.draws.some((call) => call.type === 'drawImage' && call.src === 'assets/world/fpt-software-sign-v2.png'));
  const garden = visit(5, 21);
  assert.ok(garden.texts.includes('01'), 'the binary portal easter egg should render inside 404 Garden');
  assert.ok(garden.texts.some((text) => text.includes('404 GARDEN')));
  const heritageGarden = visit(5, 34);
  assert.ok(heritageGarden.draws.some((call) => call.type === 'drawImage'
    && call.src === 'assets/world/heritage-garden-pavilion-v2.png'));
});

test('generated FPT props block only their authored footprints', () => {
  const { debug } = createGame();
  assert.equal(debug.canWalk(57, 36), false, 'Cuder pedestal should block movement');
  assert.equal(debug.canWalk(56, 36), true, 'Cuder must not block the F-Ville main road');
  assert.equal(debug.canWalk(25, 32), false, 'campus garden fountain should block its opaque top');
  assert.equal(debug.canWalk(23, 32), true, 'transparent campus garden corners must remain walkable');
  assert.equal(debug.canWalk(16, 3), false, 'campus shrub core should block movement');
  assert.equal(debug.canWalk(15, 3), true, 'transparent campus shrub edge should remain walkable');
  assert.equal(debug.canWalk(22, 36), false, 'campus guide NPC should block its own tile');
  assert.equal(debug.canWalk(21, 4), true, 'FPT monument approach should remain walkable');
});

test('frame budget uses 60 FPS for action and 30 FPS for idle UI', () => {
  const { debug } = createGame();
  assert.ok(Math.abs(debug.targetFrameMs() - 1000 / 30) < 0.01);
  debug.startBattle('grass');
  assert.ok(Math.abs(debug.targetFrameMs() - 1000 / 60) < 0.01);
});

test('walking animation preserves its phase across connected tile steps', () => {
  const { debug } = createGame();
  const player = debug.getPlayer();
  debug.tryMove('down');
  debug.updateOverworld(130);
  assert.equal(player.frame, 1);
  debug.updateOverworld(50);
  assert.equal(player.moving, false);
  assert.equal(player.frame, 1, 'tile boundary must not snap the walk cycle to frame zero');
  debug.updateOverworld(1);
  assert.equal(player.frame, 0, 'idle pose should still reset to frame zero');
});

test('walking cadence preserves elapsed remainder and resets cleanly when turning', () => {
  const { debug } = createGame();
  const player = debug.getPlayer();

  debug.tryMove('down');
  debug.updateOverworld(250);
  assert.equal(player.frame, 2, 'a delayed update must advance every elapsed animation frame');
  assert.equal(player.animT, 10, 'animation timing must retain the unconsumed remainder');

  player.moving = false;
  player.frame = 3;
  player.animT = 47;
  debug.tryMove('left');
  assert.equal(player.frame, 0, 'changing direction must begin on the contact pose');
  assert.equal(player.animT, 0, 'changing direction must not inherit timing from another sprite row');

  player.moving = false;
  player.frame = 2;
  player.animT = 31;
  debug.updateOverworld(1);
  assert.equal(player.frame, 0);
  assert.equal(player.animT, 0, 'idle must fully reset the next walking cycle');
});

test('battle renders its HUD and quiz while a lazy enemy sprite is still loading', async () => {
  const { debug } = createGame();
  await new Promise((resolve) => setImmediate(resolve)); // core assets + active pet loaded
  debug.mastery()['年'].captured = true;
  debug.mastery()['年'].lectured = true;
  assert.equal(debug.startBattle('grass', 'nen'), true);
  assert.equal(debug.getBattle().monId, 'nen');
  assert.doesNotThrow(() => debug.renderOnce());
  assert.equal(debug.state(), 'battle');
  assert.ok(debug.getBattle().q.options.length >= 2);
});

test('wild grass encounters use the Kanji semantic attack during the locked cutscene', () => {
  const { debug, textCalls, drawCalls } = createGame({ viewportWidth: 390, viewportHeight: 844 });
  assert.equal(debug.startBattle('grass'), true);
  const battle = debug.getBattle(), initialGauge = battle.botNextIn;
  assert.equal(battle.entranceT, 1450);
  debug.updateBattle(220);
  debug.renderOnce();
  assert.ok(textCalls.some((call) => call.text === 'BỤI CỎ BỖNG RUNG LÊN…'));
  const quizLayout = debug.getQuizLayout();
  assert.ok(drawCalls.some((call) => call.type === 'fillRect' && call.x === 0 && call.y === quizLayout.y
    && call.width === quizLayout.W && call.height === quizLayout.panelH && call.fillStyle === 'rgba(11,16,48,.96)'),
  'the question panel must remain rendered below the encounter cutscene instead of becoming a black block');
  assert.ok(textCalls.some((call) => battle.q.options.includes(call.text)),
    'cutscene should stop at the battlefield boundary and leave question answers visible');
  assert.equal(battle.questionElapsed, 0);
  assert.equal(battle.botNextIn, initialGauge, 'the attack gauge must pause during the encounter cutscene');
  debug.updateBattle(760);
  debug.renderOnce();
  assert.ok(textCalls.some((call) => call.text.includes(`KANJI HOANG DÃ「${battle.mon.kanji}」TUNG TUYỆT KỸ!`)));
  const actors = debug.getBattleActorLayout();
  const cutsceneBarH = Math.max(30, Math.min(62, actors.stageH * .12));
  assert.ok(actors.plBaseY < actors.fieldH - cutsceneBarH,
    'the mobile pet baseline must stay above the cutscene letterbox');
  assert.ok(actors.monBaseY < actors.fieldH - cutsceneBarH,
    'the wild Kanji baseline must stay above the cutscene letterbox');
  assert.ok(actors.mobilePetLift >= 38, 'portrait battles should visibly lift the active Kanji');
  assert.equal(battle.entranceSfxPlayed, true);
  assert.ok(battle.encounterImpactT > 0);
  debug.updateBattle(600);
  assert.equal(battle.entranceT, 0);
});

test('wild water encounters use the lake reveal before combat', () => {
  const { debug, textCalls } = createGame();
  debug.mastery()['魚'].captured = true;
  assert.equal(debug.startBattle('water', 'fish'), true);
  assert.equal(debug.getBattle().kind, 'water');
  debug.updateBattle(220);
  debug.renderOnce();
  assert.ok(textCalls.some((call) => call.text === 'MẶT NƯỚC BỖNG CHUYỂN ĐỘNG…'));
  assert.doesNotThrow(() => debug.updateBattle(1300));
  assert.equal(debug.getBattle().entranceT, 0);
});

test('Animation setting skips wild encounter cutscenes for both grass and water', () => {
  const grassGame = createGame({ encounterAnimation: false });
  assert.equal(grassGame.debug.startBattle('grass'), true);
  assert.equal(grassGame.debug.getBattle().entranceT, 0);

  const waterGame = createGame({ encounterAnimation: false });
  waterGame.debug.mastery()['魚'].captured = true;
  assert.equal(waterGame.debug.startBattle('water', 'fish'), true);
  assert.equal(waterGame.debug.getBattle().entranceT, 0);
});

test('battle scales and computes each side from its own Kanji level', () => {
  const { context, debug } = createGame();
  const enemyStat = debug.mastery()['年'];
  enemyStat.captured = true; enemyStat.lectured = true; enemyStat.mp = debug.mpFloorOfLevel(10);
  assert.equal(debug.startBattle('grass', 'nen'), true);
  const battle = debug.getBattle();
  assert.equal(battle.petLevel, 1);
  assert.equal(battle.kanjiLevel, 10);
  assert.equal(debug.getPlayer().maxHp, context.CONFIG.PLAYER.maxHp, 'enemy level must not inflate the active pet HP');
  assert.ok(debug.battleLevelScale(battle.kanjiLevel) > debug.battleLevelScale(battle.petLevel),
    'Lv.10 enemy must render larger than a Lv.1 actor before viewport scaling');

  const hpBefore = battle.monHp;
  debug.answer(battle.q.correctIndex);
  assert.equal(hpBefore - battle.monHp, context.CONFIG.COMBAT.baseDamage + context.CONFIG.COMBAT.comboBonus,
    'pet damage must use the Lv.1 pet rather than the Lv.10 enemy');
});

test('Trainer image icons stay crisp above the Arena tint and skip off-screen work', async () => {
  const { debug, drawCalls } = createGame();
  await new Promise((resolve) => setImmediate(resolve));
  drawCalls.length = 0;
  debug.renderOnce();
  assert.equal(drawCalls.some((call) => call.type === 'drawImage' && call.src === 'assets/world/trainer-theme-icons.png'), false,
    'off-screen Trainer icons should not be rendered');

  const player = debug.getPlayer();
  player.gx = 20; player.gy = 23; player.px = 20 * 32; player.py = 23 * 32; player.moving = false;
  drawCalls.length = 0;
  debug.renderOnce();

  const tintIndex = drawCalls.findIndex((call) => call.type === 'fillRect' && call.fillStyle === 'rgba(17,25,48,.12)');
  const iconIndex = drawCalls.findIndex((call) => call.type === 'drawImage'
    && call.src === 'assets/world/trainer-theme-icons.png' && call.args[0] === 0 && call.args[1] === 0);
  assert.ok(tintIndex >= 0, 'Arena tint should render');
  assert.ok(iconIndex > tintIndex, 'Trainer icon must render after the translucent Arena floor');
  assert.equal(drawCalls[iconIndex].filter, 'none', 'Trainer markers should avoid expensive per-frame filters');
  assert.equal(drawCalls[iconIndex].globalAlpha, 1, 'Trainer icons must never inherit a translucent canvas state');
  assert.equal(drawCalls.slice(iconIndex + 1).some((call) => call.type === 'fillRect' && call.fillStyle === 'rgba(17,25,48,.12)'), false,
    'Arena tint must never wash out an already-rendered Trainer icon');
  assert.ok(drawCalls.some((call) => call.type === 'drawImage' && call.src === 'assets/world/trainer-theme-icons.png'
    && call.args[0] === 64 && call.args[1] === 192),
    'the Librarian should use the bright open-book image from the atlas');
});

test('mobile battle quiz keeps touch answers and footer inside separate safe areas', () => {
  const { debug } = createGame({ viewportWidth: 390, viewportHeight: 844 });
  debug.startBattle('grass');
  const layout = debug.getQuizLayout();
  const answersBottom = layout.answerStartY + layout.answerH * 2 + layout.answerGapY;
  const footerY = layout.y + layout.panelH - 14;
  assert.equal(layout.narrow, true);
  assert.ok(layout.answerH >= 42, 'answer touch target is too short');
  assert.ok(layout.answerW >= 140, 'answer touch target is too narrow');
  assert.ok(answersBottom + 20 <= footerY, 'footer overlaps the second answer row');
  assert.ok(layout.panelH < layout.H, 'quiz panel covers the whole battlefield');
});

test('mobile landscape battle uses one compact answer row and preserves the battlefield', () => {
  const { debug } = createGame({ viewportWidth: 844, viewportHeight: 390 });
  debug.startBattle('grass');
  const layout = debug.getQuizLayout();
  const answersBottom = layout.answerStartY + layout.answerH;
  const footerY = layout.y + layout.panelH - 14;
  assert.equal(layout.shortLandscape, true);
  assert.equal(layout.answerCols, 4);
  assert.equal(layout.answerH, 44);
  assert.ok(layout.H - layout.panelH >= 210, 'landscape battlefield is too short');
  assert.ok(answersBottom + 20 <= footerY, 'landscape footer overlaps the answer row');
});

test('pet follow distance stays stable regardless of trail sample density', () => {
  const { debug } = createGame();
  const player = debug.getPlayer();
  const originX = player.px, originY = player.py;
  const run = (step) => {
    player.px = originX; player.py = originY; player.facing = 'right'; debug.resetPetTrail();
    for (let x = step; x <= 256; x += step) { player.px = originX + x; debug.recordPlayerTrail(true); }
    const pet = debug.petFollowPosition();
    return Math.hypot(player.px - pet.px, player.py - pet.py);
  };
  assert.ok(Math.abs(run(2) - 44) < 0.01, 'dense samples changed follow distance');
  assert.ok(Math.abs(run(16) - 44) < 0.01, 'sparse samples changed follow distance');
  assert.ok(debug.getPetTrail().length < 12, 'old trail points were not pruned');
});

test('KanjiDex repairs a captured mascot missing from petData before equipping it', () => {
  const game = createGame();
  game.debug.mastery()['水'].captured = true;
  assert.equal(game.debug.isCollected('mizu'), false, 'fixture must reproduce the split captured/petData state');

  game.debug.openDex();
  game.debug.onDexKey('home');
  const targetIndex = game.debug.getDex().list.indexOf('水');
  assert.ok(targetIndex >= 0, 'captured mascot must be present in KanjiDex');
  for (let index = 0; index < targetIndex; index++) game.debug.onDexKey('arrowright');
  game.debug.onDexKey('enter');

  assert.equal(game.debug.isCollected('mizu'), true, 'equipping must reconcile the pet collection');
  assert.equal(game.debug.getPet().id, 'mizu');
  assert.equal(game.debug.hasFollower(), true);
  assert.ok(game.imageRequests.includes('assets/monsters/mizu/sprite.png'), 'equipping must lazy-load the selected mascot');
});

test('legacy save restores a selected captured mascot even when its petData entry is missing', () => {
  const game = createGame({
    learningSave: { mastery: { 水: { captured: true, lectured: true, mp: 30 } } },
    gameSave: { petData: { kuni: { evolveStage: 0 } }, currentPetId: 'mizu', stamina: 3 },
  });
  assert.equal(game.debug.isCollected('mizu'), true);
  assert.equal(game.debug.getPet().id, 'mizu');
  assert.equal(game.debug.hasFollower(), true);
});

test('every configured captured Kanji mascot can be equipped as the active follower', () => {
  const game = createGame();
  for (const [id, monster] of Object.entries(game.context.CONFIG.MONSTERS)) {
    game.debug.mastery()[monster.kanji].captured = true;
    assert.equal(game.debug.setPet(id), true, `${monster.kanji}/${id} could not be equipped`);
    assert.equal(game.debug.getPet().id, id, `${monster.kanji}/${id} did not become the active follower`);
  }
});

test('all 220 Kanji expose official meaning-driven follower and attack animations', async () => {
  const { debug, context } = createGame();
  const expected = {
    '火': ['hi_fire', 'ember-hop', 'flame-dash'],
    '水': ['mizu', 'water-float', 'tidal-wave'],
    '木': ['moku', 'tree-sway', 'vine-whip'],
    '電': ['den', 'static-jitter', 'thunder-strike'],
    '気': ['ki', 'wind-glide', 'wind-cutter'],
    '日': ['ri', 'sun-orbit', 'solar-burst'],
    '月': ['getsu', 'moon-drift', 'moon-blade'],
    '山': ['yama', 'peak-stomp', 'mountain-crash'],
    '川': ['kawa', 'river-flow', 'river-rush'],
    '金': ['kin', 'gold-shine', 'golden-comet'],
    '雨': ['ame', 'rain-bounce', 'rain-storm'],
    '土': ['tsuchi', 'earth-stomp', 'earth-spike'],
    '魚': ['fish', 'bubble-swim', 'bubble-torpedo'],
    '音': ['yin', 'sound-pulse', 'sonic-wave'],
    '生': ['sei', 'life-bloom', 'life-bloom'],
    '一': ['bar', 'single-orbit', 'single-slash'],
    '人': ['hito', 'people-step', 'twin-strike'],
    '学': ['gaku', 'study-flutter', 'book-burst'],
    '車': ['kuruma', 'wheel-roll', 'wheel-charge'],
    '食': ['shoku', 'steam-hop', 'steam-bite'],
    '話': ['hanashi', 'speech-bob', 'word-cannon'],
    '書': ['sho', 'ink-brush', 'ink-slash'],
    '時': ['ji', 'clock-tick', 'clock-stop'],
    '上': ['ue', 'rise-float', 'rising-uppercut'],
    '下': ['shita', 'sink-step', 'meteor-drop'],
    '大': ['dai', 'giant-stomp', 'giant-smash'],
    '小': ['shou', 'tiny-dart', 'needle-barrage'],
    '国': ['kuni', 'barrier-guard', 'barrier-crush'],
    '友': ['tomo', 'friend-sync', 'dual-heart'],
    '休': ['yasumi', 'rest-doze', 'dream-leaf'],
    '年': ['nen', 'life-bloom', 'season-wheel'],
    '本': ['hon', 'study-flutter', 'book-burst'],
    '中': ['chuu', 'barrier-guard', 'center-beam'],
    '長': ['chou', 'rise-float', 'long-lance'],
    '出': ['shutsu', 'wind-glide', 'outward-blast'],
    '三': ['san', 'single-orbit', 'orbit-barrage'],
    '行': ['gyou', 'people-step', 'step-rush'],
    '見': ['ken', 'static-jitter', 'eye-beam'],
    '今': ['ima', 'sound-pulse', 'now-burst'],
    '分': ['bun', 'friend-sync', 'split-blade'],
    '後': ['ato', 'wind-glide', 'backstab'],
    '前': ['mae', 'wheel-roll', 'forward-charge'],
    '五': ['go', 'single-orbit', 'orbit-barrage'],
    '間': ['kan', 'moon-drift', 'portal-crush'],
    '東': ['higashi', 'sun-orbit', 'sunrise-lance'],
    '四': ['yon', 'single-orbit', 'orbit-barrage'],
    '九': ['kyuu', 'single-orbit', 'orbit-barrage'],
    '入': ['nyuu', 'wind-glide', 'inward-collapse'],
    '高': ['kou', 'rise-float', 'sky-drop'],
    '円': ['en', 'wheel-roll', 'coin-ring'],
    '十': ['juu', 'cross-pulse', 'cross-flare'],
    '二': ['ni', 'single-orbit', 'orbit-barrage'],
    '子': ['ko', 'child-bounce', 'child-spring'],
    '外': ['gai', 'wind-glide', 'outward-blast'],
    '八': ['hachi', 'single-orbit', 'orbit-barrage'],
    '六': ['roku', 'single-orbit', 'orbit-barrage'],
    '来': ['rai', 'lead-step', 'forward-charge'],
    '七': ['nana', 'single-orbit', 'orbit-barrage'],
    '女': ['onna', 'grace-step', 'petal-dance'],
    '北': ['kita', 'compass-hover', 'compass-star'],
    '午': ['gozen', 'sun-orbit', 'noon-beam'],
    '百': ['hyaku', 'grid-flicker', 'hundred-grid'],
    '先': ['saki', 'lead-step', 'lead-arrow'],
    '名': ['na', 'name-bob', 'name-seal'],
    '千': ['sen', 'star-drift', 'star-barrage'],
    '西': ['nishi', 'moon-drift', 'sunset-blade'],
    '語': ['go_lang', 'speech-bob', 'word-cannon'],
    '南': ['minami', 'compass-hover', 'compass-star'],
    '何': ['nani', 'question-hover', 'question-burst'],
    '万': ['man', 'star-drift', 'star-barrage'],
    '半': ['han', 'friend-sync', 'split-blade'],
    '男': ['otoko', 'giant-stomp', 'giant-smash'],
    '校': ['kou_school', 'study-flutter', 'sonic-wave'],
    '毎': ['mai', 'clock-tick', 'clock-stop'],
    '白': ['shiro', 'sun-orbit', 'solar-burst'],
    '天': ['ten', 'rise-float', 'sky-drop'],
    '母': ['haha', 'friend-sync', 'dual-heart'],
    '右': ['migi', 'lead-step', 'side-arrow'],
    '読': ['yomu', 'study-flutter', 'book-burst'],
    '左': ['hidari', 'lead-step', 'side-arrow'],
    '父': ['chichi', 'barrier-guard', 'barrier-crush'],
    '悪': ['aku', 'static-jitter', 'dark-rift'],
    '暗': ['an', 'moon-drift', 'shadow-lantern'],
    '医': ['i_med', 'life-bloom', 'healing-cross'],
    '意': ['i_intent', 'question-hover', 'focus-burst'],
    '以': ['i_by', 'lead-step', 'forward-charge'],
    '引': ['hiku', 'wind-glide', 'inward-collapse'],
    '院': ['institute', 'barrier-guard', 'healing-cross'],
    '員': ['member', 'friend-sync', 'dual-heart'],
    '運': ['un', 'wheel-roll', 'wheel-charge'],
    '英': ['ei', 'gold-shine', 'golden-comet'],
    '映': ['utsu', 'static-jitter', 'eye-beam'],
    '遠': ['tooi', 'wind-glide', 'long-lance'],
    '屋': ['ya', 'barrier-guard', 'house-crash'],
    '歌': ['uta', 'sound-pulse', 'sonic-wave'],
    '夏': ['natsu', 'sun-orbit', 'solar-burst'],
    '家': ['ie', 'friend-sync', 'house-crash'],
    '画': ['ga_art', 'ink-brush', 'ink-slash'],
    '海': ['umi', 'water-float', 'tidal-wave'],
    '回': ['kai_turn', 'single-orbit', 'orbit-barrage'],
    '開': ['hiraku', 'portal-hover', 'portal-open'],
    '界': ['kai_world', 'single-orbit', 'world-sphere'],
    '楽': ['tanoshi', 'sound-pulse', 'sonic-wave'],
    '館': ['kan_building', 'barrier-guard', 'house-crash'],
    '漢': ['kan_han', 'ink-brush', 'ink-slash'],
    '寒': ['samui', 'frost-shiver', 'frost-spikes'],
    '顔': ['kao', 'question-hover', 'face-mask'],
    '帰': ['kaeru', 'return-sway', 'return-boomerang'],
    '起': ['okiru', 'rise-float', 'rising-uppercut'],
    '究': ['kyuu_research', 'study-flutter', 'focus-burst'],
    '急': ['isogu', 'static-jitter', 'thunder-strike'],
    '牛': ['ushi', 'bull-stomp', 'bull-charge'],
    '去': ['saru', 'wind-glide', 'outward-blast'],
    '強': ['tsuyoi', 'giant-stomp', 'giant-smash'],
    '教': ['oshieru', 'study-flutter', 'book-burst'],
    '京': ['kyou_capital', 'rise-float', 'capital-tower'],
    '業': ['gyou_business', 'wheel-roll', 'wheel-charge'],
    '近': ['chikai', 'lead-step', 'forward-charge'],
    '銀': ['gin', 'gold-shine', 'coin-ring'],
    '区': ['ku_district', 'grid-flicker', 'district-grid'],
  };
  const animations = debug.kanjiAnimations();
  assert.equal(Object.keys(animations).length, 220, 'every configured Kanji needs an authored choreography entry');
  for (const kanji of Object.keys(expected)) assert.ok(animations[kanji], `${kanji} disappeared from the authored registry`);
  for (const [kanji, [id, follow, attack]] of Object.entries(expected)) {
    assert.equal(animations[kanji].follow, follow);
    assert.equal(animations[kanji].attack, attack);
    assert.equal(debug.hasMeaningAttackAnimation(id), true);
    const idle = debug.followerMeaningMotion(id, false, 1000);
    const moving = debug.followerMeaningMotion(id, true, 1000);
    assert.ok(Object.values(idle).every(Number.isFinite));
    assert.ok(Object.values(moving).every(Number.isFinite));
    debug.mastery()[kanji].captured = true;
    assert.equal(debug.setPet(id), true);
    await new Promise((resolve) => setImmediate(resolve));
    assert.doesNotThrow(() => debug.renderOnce(), `${kanji} follower animation crashed overworld render`);
    assert.equal(debug.startPve({ pool: ['日'], allowUncaptured: true, questions: 2 }), true);
    debug.answerPve(debug.getPve().q.correctIndex);
    assert.ok(debug.getPve().petAttackT >= 680, `${kanji} attack should keep its stronger impact timing`);
    assert.doesNotThrow(() => debug.renderOnce(), `${kanji} attack animation crashed battle render`);
  }
  assert.equal(debug.startPve({ pool: ['日'], allowUncaptured: true, questions: 2 }), true);
  debug.answerPve((debug.getPve().q.correctIndex + 1) % debug.getPve().q.options.length);
  assert.ok(debug.getPve().enemyAttackT >= 700, 'meaning-driven enemy counterattack should retain its impact timing');
  assert.ok(debug.getPve().arenaShakeT >= 360, 'meaning-driven counterattack should shake the arena');
  assert.equal(debug.hasMeaningAttackAnimation('missing_monster'), false);
  for (const [id, monster] of Object.entries(context.CONFIG.MONSTERS)) {
    const animation = debug.resolveKanjiAnimation(id);
    assert.ok(animation && animation.attack, `${monster.kanji}/${id} has no official attack animation`);
    assert.notEqual(animation.inherited, true, `${monster.kanji}/${id} still relies on semantic fallback`);
    assert.ok(Object.values(debug.followerMeaningMotion(id, true, 1250)).every(Number.isFinite), `${monster.kanji}/${id} follower motion is invalid`);
  }
});

test('automated animation audit renders every Kanji across follower and attack timelines', () => {
  const { debug, context } = createGame();
  const animations = debug.kanjiAnimations();
  const monsters = Object.entries(context.CONFIG.MONSTERS);
  const gameSource = read('js/game.js');
  const supportedFollowers = new Set([...gameSource.matchAll(/animation\.follow === '([^']+)'/g)].map((match) => match[1]));
  const supportedAttacks = new Set([...gameSource.matchAll(/animation\.attack === '([^']+)'/g)].map((match) => match[1]));
  const followerTimes = [0, 125, 500, 1250, 5000, 30000];
  const attackFrames = [0, .08, .2, .33, .5, .66, .82, .94, 1];

  assert.equal(monsters.length, 220);
  assert.equal(Object.keys(animations).length, monsters.length);
  assert.deepEqual(new Set(Object.keys(animations)), new Set(monsters.map(([, monster]) => monster.kanji)));

  for (const [id, monster] of monsters) {
    const animation = animations[monster.kanji];
    assert.ok(animation, `${monster.kanji}/${id} is absent from the animation registry`);
    assert.equal(typeof animation.meaning, 'string');
    assert.ok(animation.meaning.trim(), `${monster.kanji}/${id} has no semantic meaning label`);
    assert.ok(supportedFollowers.has(animation.follow), `${monster.kanji}/${id} uses an unrendered follower motion: ${animation.follow}`);
    assert.ok(supportedAttacks.has(animation.attack), `${monster.kanji}/${id} uses an unrendered attack: ${animation.attack}`);
    assert.equal(animation.effect, monster.effect, `${monster.kanji}/${id} effect drifted from monster config`);
    assert.ok(Array.isArray(animation.colors) && animation.colors.length === 2
      && animation.colors.every((color) => typeof color === 'string' && color.trim()), `${monster.kanji}/${id} has an invalid palette`);
    if (animation.count !== undefined) assert.ok(Number.isInteger(animation.count) && animation.count > 0, `${monster.kanji}/${id} has an invalid particle count`);

    for (const now of followerTimes) for (const moving of [false, true]) {
      const motion = debug.followerMeaningMotion(id, moving, now);
      assert.deepEqual(Object.keys(motion).sort(), ['rotation', 'scaleX', 'scaleY', 'x', 'y']);
      assert.ok(Object.values(motion).every(Number.isFinite), `${monster.kanji}/${id} generated a non-finite follower frame`);
      assert.ok(motion.scaleX > 0 && motion.scaleY > 0, `${monster.kanji}/${id} generated an inverted follower frame`);
    }
    for (const progress of attackFrames) for (const reverse of [false, true]) {
      assert.doesNotThrow(() => {
        assert.equal(debug.renderMeaningAttackFrame(id, progress, reverse), true);
      }, `${monster.kanji}/${id} attack crashed at progress ${progress} (${reverse ? 'reverse' : 'forward'})`);
    }
  }
  assert.equal(debug.renderMeaningAttackFrame('ri', -.01), false);
  assert.equal(debug.renderMeaningAttackFrame('ri', 1.01), false);
  assert.equal(debug.renderMeaningAttackFrame('missing_monster', .5), false);
});

test('Sandbox profiles always receive all authored meaning-animation Kanji', () => {
  const { debug } = createGame({ sandboxCharacter: true });
  for (const char of [
    '火', '水', '木', '電', '気', '日', '月', '山', '川', '金', '雨', '土', '魚', '音', '生',
    '一', '人', '学', '車', '食', '話', '書', '時', '上', '下', '大', '小', '国', '友', '休',
    '年', '本', '中', '長', '出', '三', '行', '見', '今', '分', '後', '前', '五', '間', '東', '四', '九', '入', '高', '円',
    '十', '二', '子', '外', '八', '六', '来', '七', '女', '北', '午', '百', '先', '名', '千', '西', '語', '南', '何', '万',
    '半', '男', '校', '毎', '白', '天', '母', '右', '読', '左', '父', '悪', '暗', '医', '意', '以', '引', '院', '員', '運', '英', '映', '遠', '屋', '歌', '夏', '家', '画', '海', '回',
    '開', '界', '楽', '館', '漢', '寒', '顔', '帰', '起', '究', '急', '牛', '去', '強', '教', '京', '業', '近', '銀', '区',
  ]) {
    assert.equal(debug.getKanjiStat(char).captured, true, `${char} is missing from the Sandbox authored-animation roster`);
  }
});

test('Sandbox unlocks exactly 200 Kanji and leaves the final 20 curriculum entries locked', () => {
  const { debug, context } = createGame({ sandboxCharacter: true });
  const all = Object.values(context.KANJI_DB.KANJI).map((info) => info.char);
  const captured = all.filter((char) => debug.getKanjiStat(char).captured);
  assert.equal(all.length, 220);
  assert.equal(captured.length, 200);
  assert.equal(debug.getKanjiStat('魚').captured, true, 'the initial Sandbox pet must count inside the 200 total');
  const finalN4 = context.KANJI_CATALOG.tiers.N4.kanji.slice(-20);
  assert.equal(finalN4.length, 20);
  for (const char of finalN4) assert.equal(debug.getKanjiStat(char).captured, false, `${char} should remain locked in Sandbox`);
});

test('N4 is badge-gated when the temporary QA override is disabled', () => {
  const { debug } = createGame({ disableTestUnlocks: true });
  assert.equal(debug.isTierUnlocked('N5'), true);
  assert.equal(debug.isTierUnlocked('N4'), false);
  assert.equal(debug.tierProgress('N5').total, 79);
  assert.equal(debug.tierProgress('N4').total, 140);
});

test('themed Trainer unlocks at its collection threshold and uses an animated duel', () => {
  const { debug, storage, textCalls } = createGame();
  assert.equal(debug.trainerStatus('gardener').state, 'locked');
  for (const char of ['木', '山', '川']) debug.mastery()[char].captured = true;
  const ready = debug.trainerStatus('gardener');
  assert.equal(ready.state, 'ready');
  assert.deepEqual([...ready.team].sort(), ['山', '川', '木'].sort());
  assert.equal(debug.startTrainer('gardener'), true);
  assert.equal(debug.getPve().mode, 'trainer');
  assert.ok(debug.getPve().pool.length <= 5);
  assert.ok(debug.getPve().trainerIntroT > 0);
  debug.renderOnce();
  assert.ok(textCalls.some((call) => call.text === 'VS'));
  assert.ok(textCalls.some((call) => call.text.startsWith('ĐỐI THỦ')),
    'Trainer battles should render the current Kanji as an active opponent instead of a static lineup');
  debug.answerPve(debug.getPve().q.correctIndex);
  assert.ok(debug.getPve().petAttackT > 0);
  assert.equal(debug.getPve().impactSide, 'enemy');
  assert.ok(debug.getPve().arenaShakeT > 0);
  debug.updatePve(600);
  while (debug.getPve().phase === 'fight') {
    debug.answerPve(debug.getPve().q.correctIndex);
    debug.updatePve(600);
  }
  assert.equal(debug.trainerStatus('gardener').state, 'defeated');
  assert.equal(debug.trainerWinsCount(), 1);
  assert.equal(JSON.parse(storage.get('KANJIGO_LEARNING_V1')).trainerWins.gardener, true);
});

test('wrong Trainer answers animate the opponent counterattack', () => {
  const { debug } = createGame();
  for (const char of ['木', '山', '川']) debug.mastery()[char].captured = true;
  assert.equal(debug.startTrainer('gardener'), true);
  const current = debug.getPve();
  const wrong = current.q.options.findIndex((_, index) => index !== current.q.correctIndex);
  debug.answerPve(wrong);
  assert.ok(debug.getPve().enemyAttackT > 0);
  assert.ok(debug.getPve().playerHitT > 0);
  assert.equal(debug.getPve().impactSide, 'player');
  assert.doesNotThrow(() => debug.renderOnce());
});

test('N5 Gym requires 50 captures and 20 Kanji at Lv5, without Trainer wins', () => {
  const { debug } = createGame();
  const n5 = Object.keys(debug.mastery()).filter((char) => debug.tierOfKanji(char) === 'N5');
  assert.ok(n5.length >= 50);
  for (const char of n5) { debug.mastery()[char].captured = false; debug.mastery()[char].level = 1; }
  for (const char of n5.slice(0, 49)) debug.mastery()[char].captured = true;
  assert.equal(debug.gymEligibility('N5').captured, 49);
  assert.equal(debug.startGym('N5'), false);

  debug.mastery()[n5[49]].captured = true;
  for (const char of n5.slice(0, 19)) debug.mastery()[char].mp = debug.mpFloorOfLevel(5);
  assert.equal(debug.gymEligibility('N5').atLevel, 19);
  assert.equal(debug.startGym('N5'), false);

  debug.mastery()[n5[19]].mp = debug.mpFloorOfLevel(5);
  assert.equal(debug.trainerWinsCount(), 0);
  assert.equal(debug.gymEligibility('N5').ready, true);
  assert.equal(debug.startGym('N5'), true);
  const gym = debug.getPve();
  assert.equal(gym.mode, 'gym');
  assert.equal(gym.pool.length, debug.tierProgress('N5').available);
  assert.ok(gym.pool.includes(n5[50]), 'the exam must include uncaptured N5 Kanji');
  assert.equal(gym.useQuestionQueue, true);
});

test('N5 Gym gives one attempt per question and animates the winning side', () => {
  const { debug, textCalls, drawCalls } = createGame();
  const n5 = Object.keys(debug.mastery()).filter((char) => debug.tierOfKanji(char) === 'N5');
  for (const char of n5.slice(0, 50)) debug.mastery()[char].captured = true;
  for (const char of n5.slice(0, 20)) debug.mastery()[char].mp = debug.mpFloorOfLevel(5);
  assert.equal(debug.startGym('N5'), true);
  assert.doesNotThrow(() => debug.renderOnce());
  assert.ok(textCalls.some((call) => call.text === '70% PASS'), 'the pass threshold needs an explicit 70% marker');
  assert.ok(textCalls.some((call) => call.text === 'N5'), 'the 70% marker needs the N5 badge medallion');
  assert.ok(drawCalls.some((call) => call.type === 'fillRect' && call.fillStyle === 'rgba(6,18,42,.82)'),
    'the bright battle background needs a high-contrast title panel');

  let gym = debug.getPve(), firstTarget = gym.q.target;
  assert.ok(gym.total >= 20 && gym.total <= 25, 'Gym question count must be randomized within 20–25');
  assert.equal(gym.examMaxHp, gym.total - gym.requiredCorrect + 1,
    'HP must reach zero on the first miss that makes PASS impossible');
  const wrongIndex = (gym.q.correctIndex + 1) % gym.q.options.length;
  debug.answerPve(wrongIndex);
  assert.equal(gym.index, 1, 'a wrong answer must consume the question immediately');
  assert.ok(gym.enemyAttackT > 0);
  assert.ok(gym.playerHitT > 0);
  assert.equal(gym.examHp, gym.examMaxHp - 1);
  assert.ok(gym.rankShockT > 0);
  assert.equal(gym.qCooldown, 1000);
  debug.updatePve(1001);
  gym = debug.getPve();
  assert.notEqual(gym.q.target, firstTarget, 'the failed question must not be retried');
  assert.equal(gym.selectedIndex, -1);
  assert.ok(gym.entranceT > 0, 'the next Kanjimon should jump into the arena');

  debug.answerPve(gym.q.correctIndex);
  assert.ok(gym.petAttackT > 0);
  assert.ok(gym.enemyHitT > 0);
  assert.equal(gym.enemyHp, 0);
  assert.equal(gym.rankTarget, gym.correct / gym.total, 'progress must remain correct / total questions');
  while (gym.phase === 'fight') {
    debug.updatePve(751);
    if (gym.phase === 'fight' && gym.qCooldown <= 0) debug.answerPve(gym.q.correctIndex);
  }
  assert.equal(debug.getPveResult().passed, true);
  assert.equal(debug.getPveResult().badgeAwarded, 'N5');
  assert.equal(debug.hasBadge('N5'), true);
  assert.doesNotThrow(() => debug.renderOnce());
  assert.equal(debug.startGym('N5'), true, 'a passed N5 test must remain replayable for revision');
  assert.equal(debug.getPve().tier, 'N5');
});

test('N5 Gym passes at the 70% marker in rank B, awards S at 100%, and KOs beyond 30% wrong', () => {
  const gradeProbe = createGame().debug;
  assert.equal(gradeProbe.gymGrade(.24), 'D');
  assert.equal(gradeProbe.gymGrade(.25), 'C');
  assert.equal(gradeProbe.gymGrade(.5), 'B');
  assert.equal(gradeProbe.gymGrade(.7), 'B');
  assert.equal(gradeProbe.gymGrade(.8), 'A');
  assert.equal(gradeProbe.gymGrade(1), 'S');
  const qualify = (debug) => {
    const n5 = Object.keys(debug.mastery()).filter((char) => debug.tierOfKanji(char) === 'N5');
    for (const char of n5.slice(0, 50)) debug.mastery()[char].captured = true;
    for (const char of n5.slice(0, 20)) debug.mastery()[char].mp = debug.mpFloorOfLevel(5);
  };

  const passing = createGame(); qualify(passing.debug);
  assert.equal(passing.debug.startGym('N5'), true);
  let exam = passing.debug.getPve();
  const allowedWrong = exam.total - exam.requiredCorrect;
  for (let index = 0; index < exam.total; index++) {
    const gym = passing.debug.getPve(), wrong = index < allowedWrong;
    const answer = wrong ? (gym.q.correctIndex + 1) % gym.q.options.length : gym.q.correctIndex;
    passing.debug.answerPve(answer);
    passing.debug.updatePve(wrong ? 1001 : 751);
  }
  assert.equal(passing.debug.getPveResult().correct, exam.requiredCorrect);
  assert.equal(passing.debug.getPveResult().grade, 'B');
  assert.equal(passing.debug.getPveResult().passed, true);
  assert.equal(passing.debug.getPveResult().ko, false);
  assert.equal(passing.debug.getGymHistory('N5').attempts, 1);

  assert.equal(passing.debug.startGym('N5'), true);
  exam = passing.debug.getPve();
  assert.ok(exam.total >= 20 && exam.total <= 25);
  while (exam.phase === 'fight') {
    passing.debug.answerPve(exam.q.correctIndex);
    passing.debug.updatePve(751);
  }
  assert.equal(passing.debug.getPveResult().grade, 'S');
  assert.equal(passing.debug.getPveResult().ratio, 1);
  const best = passing.debug.getGymHistory('N5');
  assert.equal(best.attempts, 2);
  assert.equal(best.bestGrade, 'S');
  assert.equal(best.bestCorrect, best.bestTotal);
  assert.equal(best.bestRatio, 1);
  assert.equal(JSON.parse(passing.storage.get('KANJIGO_LEARNING_V1')).gymHistory.N5.bestGrade, 'S',
    'best Gym result must persist in the character learning save');
  assert.ok(Number.isFinite(JSON.parse(passing.storage.get('KANJIGO_LEARNING_V1')).gymHistory.N5.lastDurationMs),
    'Gym attempt duration must persist with the result history');

  const failing = createGame(); qualify(failing.debug);
  assert.equal(failing.debug.startGym('N5'), true);
  const lethalWrong = failing.debug.getPve().examMaxHp;
  for (let index = 0; index < lethalWrong; index++) {
    const gym = failing.debug.getPve();
    failing.debug.answerPve((gym.q.correctIndex + 1) % gym.q.options.length);
    if (index < lethalWrong - 1) failing.debug.updatePve(1001);
  }
  assert.equal(failing.debug.getPve().examHp, 0);
  assert.equal(failing.debug.getPve().ko, true);
  assert.equal(failing.debug.getPve().pendingEnd, true);
  failing.debug.updatePve(1001);
  assert.equal(failing.debug.getPveResult().ko, true);
  assert.equal(failing.debug.getPveResult().passed, false);
  assert.equal(failing.debug.getPveResult().grade, 'D');
  assert.equal(failing.debug.hasBadge('N5'), false);
});

test('PASS N5 reveals N4 Gym, which also needs full N5 plus 50 captures and 20 Lv5', () => {
  const locked = createGame();
  assert.equal(locked.debug.openGymMenu(), true);
  assert.deepEqual([...locked.debug.getGymMenu().options], ['N5']);
  assert.equal(locked.debug.startGym('N4'), false, 'N4 must require the N5 badge even when QA unlocks its content');

  const { debug } = createGame({ learningSave: { badges: { N5: true } } });
  assert.equal(debug.openGymMenu(), true);
  assert.deepEqual([...debug.getGymMenu().options], ['N5', 'N4']);
  assert.doesNotThrow(() => debug.renderOnce());
  assert.equal(debug.startGym('N4'), false, 'N4 must stay locked until every N5 Kanji is captured');

  const n5 = Object.keys(debug.mastery()).filter((char) => debug.tierOfKanji(char) === 'N5');
  const n4 = Object.keys(debug.mastery()).filter((char) => debug.tierOfKanji(char) === 'N4');
  for (const char of n5) debug.mastery()[char].captured = true;
  for (const char of n4) { debug.mastery()[char].captured = false; debug.mastery()[char].mp = 0; }
  for (const char of n4.slice(0, 50)) debug.mastery()[char].captured = true;
  for (const char of n4.slice(0, 20)) debug.mastery()[char].mp = debug.mpFloorOfLevel(5);
  const eligibility = debug.gymEligibility('N4');
  assert.equal(eligibility.prerequisiteReady, true);
  assert.equal(eligibility.captured, 50);
  assert.equal(eligibility.atLevel, 20);
  assert.equal(eligibility.ready, true);
  assert.equal(debug.startGym('N4'), true);
  assert.equal(debug.getPve().tier, 'N4');
  assert.equal(debug.getPve().pool.length, debug.tierProgress('N4').available);
  assert.ok(debug.getPve().pool.includes(n4[50]), 'N4 questions must include uncaptured N4 Kanji');
});

test('a selected answer lights up while wrong feedback holds, fades, and retries the same question', () => {
  const { debug, drawCalls } = createGame();
  assert.equal(debug.startBattle('grass'), true);
  debug.updateBattle(1500);
  const battle = debug.getBattle();
  const originalKey = battle.q.key;
  const wrongIndex = (battle.q.correctIndex + 1) % battle.q.options.length;
  const hpBefore = debug.getPlayer().hp;
  debug.answer(wrongIndex);
  assert.ok(debug.getPlayer().hp < hpBefore);
  assert.equal(battle.retryQuestion, true);
  assert.equal(battle.selectedIndex, wrongIndex);
  assert.equal(battle.revealAnswer, true);
  assert.equal(battle.qCooldown, 1000, 'answers should unlock as soon as the stun ends');
  assert.ok(battle.fbT >= 2000, 'wrong correction disappears too quickly');
  drawCalls.length = 0; debug.renderOnce();
  assert.ok(drawCalls.some((call) => call.type === 'fillRect' && call.fillStyle === 'rgba(194,52,62,.96)'), 'selected wrong answer must light red');
  assert.equal(drawCalls.some((call) => call.type === 'fillRect' && call.fillStyle === 'rgba(31,132,79,.88)'), false,
    'an unselected correct answer must not highlight itself');

  debug.updateBattle(1050);
  assert.equal(battle.q.key, originalKey);
  assert.equal(battle.retryQuestion, false);
  assert.equal(battle.selectedIndex, -1, 'selected highlight must clear when the stun ends');
  assert.equal(battle.qCooldown <= 0, true, 'the retried question must be answerable after stun');
  assert.ok(battle.feedback && battle.fbT > 0, 'correction should remain visible after answers unlock');

  debug.updateBattle(800);
  assert.ok(battle.feedback && battle.fbT > 0 && battle.fbT < battle.feedback.fadeMs, 'wrong correction did not enter its fade phase');
  drawCalls.length = 0; debug.renderOnce();
  const fadingText = drawCalls.find((call) => call.type === 'fillText' && call.text.startsWith('✗ Sai!'));
  assert.ok(fadingText && fadingText.globalAlpha > 0 && fadingText.globalAlpha < 1, 'wrong correction must fade instead of disappearing abruptly');

  debug.updateBattle(400);
  assert.equal(battle.q.key, originalKey);
  assert.equal(battle.retryQuestion, false);
  assert.equal(battle.selectedIndex, -1);
  assert.equal(battle.feedback, null);
});

test('legacy and malformed learning saves migrate without crashing', () => {
  const learningSave = {
    total: 3, correct: 2, wrong: 1,
    mastery: {
      '日本|日|にち|on': { correct: 2, wrong: 1, box: 99, nextReview: 'bad' },
      unknown: null,
    },
    badges: { N5: true },
  };
  const { debug } = createGame({ learningSave, disableTestUnlocks: true });
  const stat = debug.getKanjiStat('日');
  assert.equal(stat.correct, 2);
  assert.equal(stat.wrong, 1);
  assert.equal(stat.box, 5);
  assert.equal(debug.hasBadge('N5'), true);
  assert.equal(debug.isTierUnlocked('N4'), true);
});

test('fresh progression save records each eligible KP milestone once', () => {
  const { debug, storage } = createGame();
  const progression = debug.getProgression();

  assert.equal(progression.version, 1);
  assert.equal(progression.earnedKP, 1);
  assert.equal(debug.availableKP(), 1);
  assert.deepEqual(
    Object.keys(progression.claimedMilestones).sort(),
    ['capture:国'],
  );

  const saved = JSON.parse(storage.get('KANJIGO_LEARNING_V1'));
  assert.equal(saved.progression.earnedKP, 1);
  assert.equal(Object.keys(saved.progression.claimedMilestones).length, 1);
});

test('legacy progress receives retroactive KP exactly once', () => {
  const legacySave = {
    mastery: {
      日: { captured: true, lectured: true, mp: 90, level: 5 },
    },
  };
  const first = createGame({ learningSave: legacySave });
  const firstProgression = first.debug.getProgression();

  assert.equal(firstProgression.earnedKP, 4);
  assert.equal(firstProgression.claimedMilestones['capture:日'].migrated, true);
  assert.equal(firstProgression.claimedMilestones['level3:日'].migrated, true);
  assert.equal(firstProgression.claimedMilestones['level5:日'].migrated, true);
  const notice = first.debug.getProgressionNotice();
  assert.equal(notice.kp, 4);
  assert.equal(notice.milestones, 4);
  assert.equal(notice.migrated, true);

  const persisted = JSON.parse(first.storage.get('KANJIGO_LEARNING_V1'));
  const second = createGame({ learningSave: persisted });
  assert.equal(second.debug.getProgression().earnedKP, 4);
  assert.equal(Object.keys(second.debug.getProgression().claimedMilestones).length, 4);
  assert.equal(second.debug.getProgressionNotice(), null);
});

test('a level jump claims every crossed KP milestone without duplication', () => {
  const { debug } = createGame();
  const stat = debug.mastery()['日'];
  stat.captured = true;
  stat.mp = debug.mpFloorOfLevel(10);

  const first = debug.evaluateKanjiMilestones('日');
  assert.equal(first.kp, 5);
  assert.deepEqual(Array.from(first.milestones).sort(), ['capture:日', 'level3:日', 'level5:日', 'level7:日', 'level10:日'].sort());
  assert.equal(debug.availableKP(), 6);

  const second = debug.evaluateKanjiMilestones('日');
  assert.equal(second.kp, 0);
  assert.equal(second.milestones.length, 0);
  assert.equal(debug.availableKP(), 6);
});

test('malformed progression data is sanitized without losing the learning save', () => {
  const learningSave = {
    total: 4,
    mastery: { 日: { captured: true, mp: 30 } },
    progression: {
      version: 'bad',
      earnedKP: -50,
      claimedMilestones: [],
      skillPurchases: {
        broken: { type: 'unknown', cost: -10 },
        future_perk: { type: 'perk', cost: 2, purchasedAt: 123 },
      },
    },
  };
  const { debug } = createGame({ learningSave });
  const progression = debug.getProgression();

  assert.equal(debug.getLearningStats().total, 4);
  assert.equal(progression.version, 1);
  assert.equal(progression.earnedKP, 3);
  assert.equal(progression.skillPurchases.broken, undefined);
  assert.equal(progression.skillPurchases.future_perk.type, 'perk');
  assert.equal(progression.skillPurchases.future_perk.cost, 2);
  assert.equal(progression.skillPurchases.future_perk.purchasedAt, 123);
  assert.equal(debug.availableKP(), 1);
});

function prepareSkillProfile(debug, count = 12, level = 5) {
  const chars = Object.keys(debug.mastery()).slice(0, count);
  for (const char of chars) {
    const stat = debug.mastery()[char];
    stat.captured = true;
    stat.lectured = true;
    stat.mp = debug.mpFloorOfLevel(level);
  }
  debug.evaluateAllKpMilestones();
  return chars;
}

test('skill definitions validate and the preview screen is renderable', () => {
  const { debug } = createGame();
  assert.equal(debug.validateSkillDefinitions().length, 0);
  const definitions = Array.from(debug.skillDefinitions());
  assert.equal(new Set(definitions.map((definition) => `${definition.position.x},${definition.position.y}`)).size, definitions.length);
  assert.equal(debug.openSkillTree(), true);
  assert.equal(debug.state(), 'skills');
  assert.doesNotThrow(() => debug.renderOnce());
  const ui = debug.getSkillUi();
  assert.equal(ui.hitboxes.filter((hitbox) => hitbox.action === 'node').length, definitions.length);
  assert.equal(ui.hitboxes.filter((hitbox) => hitbox.action === 'buy').length, 1);
  assert.equal(ui.hitboxes.filter((hitbox) => hitbox.action === 'reset').length, 1);
  const selectedBefore = ui.sel;
  debug.onSkillKey('arrowright');
  assert.notEqual(debug.getSkillUi().sel, selectedBefore);
  assert.ok(Number.isFinite(debug.getSkillUi().panX));
  assert.ok(Number.isFinite(debug.getSkillUi().panY));
  debug.onSkillKey('escape');
  assert.equal(debug.state(), 'overworld');
});

test('skill tree requires a second confirmation before spending KP', () => {
  const { debug } = createGame();
  prepareSkillProfile(debug, 12, 5);
  assert.equal(debug.openSkillTree(), true);
  assert.equal(debug.skillDefinitions()[debug.getSkillUi().sel].id, 'radar_1');
  const before = debug.availableKP();

  debug.onSkillKey('enter');
  assert.equal(debug.hasSkill('radar_1'), false);
  assert.equal(debug.getSkillUi().purchaseConfirmId, 'radar_1');
  assert.equal(debug.availableKP(), before);

  debug.onSkillKey('enter');
  assert.equal(debug.hasSkill('radar_1'), true);
  assert.equal(debug.getSkillUi().purchaseConfirmId, null);
  assert.equal(debug.availableKP(), before - 4);
});

test('skill tree controls stay inside a compact mobile viewport', () => {
  const { debug } = createGame({ viewportWidth: 390, viewportHeight: 844 });
  assert.equal(debug.openSkillTree(), true);
  assert.doesNotThrow(() => debug.renderOnce());
  const { width, height } = debug.getCanvasSize();
  const layout = debug.getSkillTreeLayout();
  assert.ok(layout.worldW * layout.zoom <= width - layout.pad * 2 + 1,
    'portrait should initially fit the complete skill graph width');
  for (const box of debug.getSkillUi().hitboxes.filter((item) => item.action === 'buy' || item.action === 'reset')) {
    assert.ok(box.x >= 0 && box.y >= 0);
    assert.ok(box.x + box.w <= width);
    assert.ok(box.y + box.h <= height);
  }
});

test('skill tree graph adapts to short mobile landscape instead of using desktop zoom', () => {
  const { debug } = createGame({ viewportWidth: 844, viewportHeight: 390 });
  assert.equal(debug.openSkillTree(), true);
  assert.doesNotThrow(() => debug.renderOnce());
  const layout = debug.getSkillTreeLayout();
  assert.equal(layout.short, true);
  assert.ok(layout.zoom < 0.5, `short landscape zoom should fit the graph, received ${layout.zoom}`);
  assert.ok(layout.viewportH >= layout.worldH * layout.zoom - 1,
    'the authored graph height should fit in the short landscape viewport');
  for (const box of debug.getSkillUi().hitboxes.filter((item) => item.action === 'buy' || item.action === 'reset')) {
    assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.w <= 844 && box.y + box.h <= 390);
  }
});

test('temporary Skill Tree QA seed unlocks requirements across all released branches', () => {
  const { debug } = createGame({ enableSkillQaSeed: true });
  const released = debug.skillDefinitions().filter((definition) => definition.released !== false);
  const totalCost = released.reduce((total, definition) => total + definition.costKP, 0);
  assert.ok(debug.capturedKanjiCount() >= 45);
  assert.ok(debug.kanjiAtLevelCount(5) >= 45);
  assert.ok(debug.availableKP() >= totalCost);

  for (const id of ['radar_1', 'meaning_lens', 'review_focus', 'focus_1', 'vitality_1']) {
    assert.equal(debug.skillStatus(id).state, 'ready');
  }
  assert.equal(debug.purchaseSkill('focus_1').ok, true);
  assert.equal(debug.skillStatus('combo_guard').state, 'ready');
  assert.equal(debug.skillStatus('focus_2').state, 'ready');
  assert.deepEqual(new Set(released.map((definition) => definition.branch)), new Set(['exploration', 'learning', 'combat']));
});

test('Radar II cycles safe targeting policies and boosts rather than filters encounters', () => {
  const { debug } = createGame({ enableSkillQaSeed: true });
  assert.equal(debug.purchaseSkill('radar_1').ok, true);
  assert.equal(debug.purchaseSkill('radar_2').ok, true);
  const chars = Object.keys(debug.mastery()).slice(0, 2), due = debug.mastery()[chars[0]], healthy = debug.mastery()[chars[1]];
  due.nextReview = 0; due.recall = 30;
  healthy.nextReview = Date.now() + 60_000; healthy.recall = 100;

  assert.equal(debug.getRadarTarget(), 'balanced');
  assert.equal(debug.radarEncounterMultiplier(chars[0], Date.now()), 1);
  assert.equal(debug.cycleRadarTarget(), 'due');
  assert.ok(debug.radarEncounterMultiplier(chars[0], Date.now()) > 1);
  assert.equal(debug.radarEncounterMultiplier(chars[1], Date.now()), 1);
  assert.equal(debug.cycleRadarTarget(), 'weak');
  assert.ok(debug.radarEncounterMultiplier(chars[0], Date.now()) > 1);
  assert.equal(debug.radarEncounterMultiplier(chars[1], Date.now()), 1);
});

test('Bicycle toggles only after unlock and reuses normal collision movement', () => {
  const locked = createGame();
  assert.equal(locked.debug.toggleBicycle(), false);
  assert.equal(locked.debug.isBicycleActive(), false);

  const { debug } = createGame({ enableSkillQaSeed: true });
  assert.equal(debug.purchaseSkill('bicycle').ok, true);
  assert.equal(debug.toggleBicycle(), true);
  assert.equal(debug.isBicycleActive(), true);
  assert.ok(debug.bicycleMoveDuration() < 200);

  const player = debug.getPlayer(), directions = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
  const direction = Object.entries(directions).find(([, [dx, dy]]) => debug.canWalk(player.gx + dx, player.gy + dy));
  assert.ok(direction);
  debug.tryMove(direction[0]);
  assert.equal(player.moving, true);
  assert.equal(player.moveDuration, debug.bicycleMoveDuration());
});

test('Bicycle swaps its left/right artwork to match travel direction', async () => {
  const { debug, drawCalls } = createGame({ enableSkillQaSeed: true });
  assert.equal(debug.purchaseSkill('bicycle').ok, true);
  assert.equal(debug.toggleBicycle(), true);
  await new Promise((resolve) => setImmediate(resolve));

  const player = debug.getPlayer();
  for (const [facing, expectedSourceY] of [['left', 256], ['right', 128]]) {
    player.facing = facing; player.moving = false; player.frame = 0;
    drawCalls.length = 0; debug.renderOnce();
    const bicycle = drawCalls.find((call) => call.type === 'drawImage'
      && call.src === 'assets/characters/bicycle-overlay-v4.png');
    assert.ok(bicycle, `missing bicycle draw for ${facing}`);
    assert.equal(bicycle.args[1], expectedSourceY,
      `${facing} should use the opposite source row from the current sheet`);
  }
});

test('Auto Ride paths to tall grass, pauses for battle, resumes, and persists', () => {
  const first = createGame({ enableSkillQaSeed: true });
  const { debug, storage } = first;
  assert.equal(debug.toggleAutoRide(), false);
  for (const id of ['radar_1', 'bicycle', 'bicycle_gear']) assert.equal(debug.purchaseSkill(id).ok, true);
  assert.equal(debug.skillStatus('auto_ride').state, 'ready');
  assert.equal(debug.purchaseSkill('auto_ride').ok, true);

  const route = debug.findAutoRidePath();
  assert.ok(route.length > 0, 'Auto Ride could not find reachable tall grass');
  assert.equal(debug.toggleAutoRide(), true);
  assert.equal(debug.isAutoRideActive(), true);
  assert.equal(debug.isBicycleActive(), true);
  const answeredBeforePatrol = debug.getLearningStats().total;
  debug.updateOverworld(1);
  assert.equal(debug.getPlayer().moving, true);
  debug.updateOverworld(1000);

  if (debug.state() === 'overworld') assert.equal(debug.startBattle('grass'), true);
  assert.equal(debug.state(), 'battle');
  assert.equal(debug.getLearningStats().total, answeredBeforePatrol, 'Auto Ride must not answer questions');
  assert.equal(debug.isAutoRideActive(), true, 'battle should pause rather than disable Auto Ride');
  debug.updateBattle(1500);
  debug.getBattle().pendingWin = 1;
  debug.updateBattle(2);
  assert.equal(debug.getBattle().result, 'win');
  debug.updateBattle(1500);
  assert.equal(debug.state(), 'overworld');
  assert.equal(debug.isAutoRideActive(), true);
  debug.updateOverworld(1);
  assert.equal(debug.getPlayer().moving, true, 'Auto Ride did not resume after battle');

  assert.equal(debug.startBattle('grass'), true);
  debug.updateBattle(1500);
  debug.getBattle().pendingLose = 1;
  debug.updateBattle(2);
  assert.equal(debug.getBattle().result, 'lose');
  debug.updateBattle(1500);
  assert.equal(debug.state(), 'overworld');
  assert.equal(debug.isAutoRideActive(), true, 'Auto Ride did not resume after a loss');

  const learningSave = JSON.parse(storage.get('KANJIGO_LEARNING_V1'));
  const gameSave = JSON.parse(storage.get('KANJIGO_GAME_V1'));
  const second = createGame({ learningSave, gameSave });
  assert.equal(second.debug.isAutoRideActive(), true);
  assert.equal(second.debug.isBicycleActive(), true);
  assert.equal(second.debug.startBattle('grass'), true);
  second.debug.tryRun();
  assert.equal(second.debug.isAutoRideActive(), false, 'run attempt must cancel Auto Ride even when escape fails');
  assert.equal(JSON.parse(second.storage.get('KANJIGO_GAME_V1')).autoRideActive, false);
});

test('Radar target and Bicycle active state persist with the existing game save', () => {
  const first = createGame({ enableSkillQaSeed: true });
  assert.equal(first.debug.purchaseSkill('radar_1').ok, true);
  assert.equal(first.debug.purchaseSkill('radar_2').ok, true);
  assert.equal(first.debug.purchaseSkill('bicycle').ok, true);
  assert.equal(first.debug.cycleRadarTarget(), 'due');
  assert.equal(first.debug.toggleBicycle(), true);

  const learningSave = JSON.parse(first.storage.get('KANJIGO_LEARNING_V1'));
  const gameSave = JSON.parse(first.storage.get('KANJIGO_GAME_V1'));
  const second = createGame({ learningSave, gameSave });
  assert.equal(second.debug.getRadarTarget(), 'due');
  assert.equal(second.debug.isBicycleActive(), true);
});

test('skill purchase engine enforces requirements, costs, and persistence', () => {
  const first = createGame();
  assert.equal(first.debug.purchaseSkill('radar_1', { allowUnreleased: true }).reason, 'requirements');
  prepareSkillProfile(first.debug, 12, 5);
  const before = first.debug.availableKP();
  const purchase = first.debug.purchaseSkill('radar_1', { allowUnreleased: true });
  assert.equal(purchase.ok, true);
  assert.equal(first.debug.hasSkill('radar_1'), true);
  assert.equal(first.debug.availableKP(), before - 4);
  assert.equal(first.debug.purchaseSkill('radar_1', { allowUnreleased: true }).reason, 'owned');

  const persisted = JSON.parse(first.storage.get('KANJIGO_LEARNING_V1'));
  const second = createGame({ learningSave: persisted });
  assert.equal(second.debug.hasSkill('radar_1'), true);
  assert.equal(second.debug.getProgression().skillPurchases.radar_1.cost, 4);
});

test('perk reset refunds only perks and is blocked during combat', () => {
  const { debug } = createGame();
  prepareSkillProfile(debug, 12, 5);
  assert.equal(debug.purchaseSkill('radar_1', { allowUnreleased: true }).ok, true);
  assert.equal(debug.purchaseSkill('meaning_lens', { allowUnreleased: true }).ok, true);
  const beforeReset = debug.availableKP();
  const reset = debug.resetPerks();
  assert.equal(reset.ok, true);
  assert.equal(reset.refundedKP, 5);
  assert.equal(debug.availableKP(), beforeReset + 5);
  assert.equal(debug.hasSkill('radar_1'), true);
  assert.equal(debug.hasSkill('meaning_lens'), false);

  assert.equal(debug.purchaseSkill('meaning_lens', { allowUnreleased: true }).ok, true);
  assert.equal(debug.startBattle('grass'), true);
  assert.equal(debug.resetPerks().reason, 'in_combat');
  assert.equal(debug.hasSkill('meaning_lens'), true);
});

test('skill validation rejects duplicate IDs, cycles, and unknown effects', () => {
  const { debug } = createGame();
  const invalid = [
    { id: 'a', type: 'perk', costKP: 1, prerequisites: ['b'], effect: { id: 'unknown' } },
    { id: 'a', type: 'perk', costKP: 1, prerequisites: ['a'], effect: { id: 'unknown' } },
    { id: 'b', type: 'permanent', costKP: 1, prerequisites: ['a'], effect: { id: 'radarMode' } },
  ];
  const errors = Array.from(debug.validateSkillDefinitions(invalid));
  assert.ok(errors.some((error) => error.includes('duplicate')));
  assert.ok(errors.some((error) => error.includes('unknown effect')));
  assert.ok(errors.some((error) => error.includes('cycle')));
});

test('released skill effects resolve through the registry and change gameplay', () => {
  const { debug } = createGame();
  prepareSkillProfile(debug, 20, 5);

  const weakStat = debug.mastery()['日'];
  weakStat.recall = 20;
  weakStat.nextReview = 0;
  const weightBefore = debug.reappearWeight('日', 1000);

  for (const id of ['radar_1', 'meaning_lens', 'review_focus', 'focus_1', 'combo_guard', 'vitality_1']) {
    assert.equal(debug.purchaseSkill(id).ok, true, `${id} should be purchasable`);
  }

  const effects = debug.resolveSkillEffects();
  assert.equal(effects.radarMode, 'summary');
  assert.equal(effects.meaningHintCharges, 1);
  assert.equal(effects.comboGuardCharges, 1);
  assert.equal(effects.attackGaugeMultiplier, 0.95);
  assert.equal(effects.playerHpMultiplier, 1.08);
  assert.ok(debug.reappearWeight('日', 1000) > weightBefore);
  assert.equal(debug.radarSummary(1000).mode, 'summary');

  assert.equal(debug.startBattle('grass'), true);
  const battle = debug.getBattle();
  assert.ok(battle.botCycleMs >= Math.round(4000 / 0.95));
  assert.equal(battle.meaningLensRemaining, 1);
  assert.equal(battle.comboGuardRemaining, 1);
  battle.q.mode = 'm1';
  assert.equal(debug.useMeaningLens().ok, true);
  assert.equal(battle.meaningLensRemaining, 0);

  battle.combo = 4;
  const wrongIndex = (battle.q.correctIndex + 1) % battle.q.options.length;
  debug.answer(wrongIndex);
  assert.equal(battle.combo, 2);
  assert.equal(battle.comboGuardRemaining, 0);
  assert.ok(debug.getPlayer().maxHp > 46);
});

test('tier II skills stack safely and expose their gameplay effects', () => {
  const { debug } = createGame({ enableSkillQaSeed: true });
  const baseBicycleDuration = debug.bicycleMoveDuration();
  const purchases = [
    'bicycle', 'bicycle_gear',
    'meaning_lens', 'meaning_lens_2',
    'review_focus', 'review_focus_2',
    'focus_1', 'focus_2',
    'combo_guard', 'combo_guard_2',
    'vitality_1', 'vitality_2',
  ];
  for (const id of purchases) assert.equal(debug.purchaseSkill(id).ok, true, `${id} should be purchasable`);

  const effects = debug.resolveSkillEffects();
  assert.equal(effects.meaningHintCharges, 2);
  assert.equal(effects.comboGuardCharges, 2);
  assert.ok(Math.abs(effects.attackGaugeMultiplier - 0.9025) < 0.0001);
  assert.ok(Math.abs(effects.playerHpMultiplier - 1.1664) < 0.0001);
  assert.ok(Math.abs(effects.reviewWeightMultiplier - 1.5525) < 0.0001);
  assert.equal(effects.reviewWeightCap, 2);
  assert.equal(effects.bicycleSpeedMultiplier, 0.85);
  assert.ok(debug.bicycleMoveDuration() < baseBicycleDuration);

  assert.equal(debug.startBattle('grass'), true);
  const battle = debug.getBattle();
  assert.equal(battle.meaningLensRemaining, 2);
  assert.equal(battle.comboGuardRemaining, 2);
  assert.ok(debug.getPlayer().maxHp >= 53);
});

test('Meaning Lens never reveals a meaning-answer question', () => {
  const { debug } = createGame();
  prepareSkillProfile(debug, 12, 5);
  assert.equal(debug.purchaseSkill('meaning_lens').ok, true);
  assert.equal(debug.startBattle('grass'), true);
  const battle = debug.getBattle();
  for (const mode of ['m3', 'm7', 'm10']) {
    battle.q.mode = mode;
    const result = debug.useMeaningLens();
    assert.equal(result.reason, 'would_reveal_answer');
    assert.equal(battle.meaningLensRemaining, 1);
  }
});
