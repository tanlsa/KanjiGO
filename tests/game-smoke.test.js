const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

function createGame({ learningSave = null, disableTestUnlocks = false, viewportWidth = 1280, viewportHeight = 720 } = {}) {
  const storage = new Map();
  if (learningSave) storage.set('KANJIGO_LEARNING_V1', JSON.stringify(learningSave));
  const noop = () => {};
  const imageRequests = [];
  const canvasContext = new Proxy({ measureText: (text) => ({ width: String(text).length * 8 }) }, {
    get(target, key) { return key in target ? target[key] : noop; },
    set(target, key, value) { target[key] = value; return true; },
  });
  const canvas = {
    width: 640, height: 480, style: {},
    getContext: () => canvasContext,
    addEventListener: noop,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 640, height: 480 }),
  };
  class MockImage {
    set src(value) { this._src = value; imageRequests.push(value); if (this.onload) queueMicrotask(() => this.onload()); }
    get src() { return this._src; }
  }
  const context = {
    console, module: { exports: {} }, Image: MockImage,
    innerWidth: viewportWidth, innerHeight: viewportHeight,
    performance: { now: () => 0 }, requestAnimationFrame: noop, addEventListener: noop,
    document: {
      getElementById: (id) => id === 'game' ? canvas : null,
      querySelectorAll: () => [],
    },
    localStorage: {
      getItem: (key) => storage.has(key) ? storage.get(key) : null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key),
    },
    setTimeout, clearTimeout, queueMicrotask,
  };
  context.window = context;
  vm.createContext(context);
  for (const file of ['js/content-catalog.js', 'js/config.js', 'js/kanji.js', 'js/data-loader.js', 'js/map.js']) {
    vm.runInContext(read(file), context, { filename: file });
  }
  if (disableTestUnlocks) context.CONFIG.PROGRESSION.testUnlockedTiers = [];
  vm.runInContext(read('js/game.js'), context, { filename: 'js/game.js' });
  return { context, debug: context.__KANJIGO_DEBUG, storage, imageRequests };
}

test('game boots and exposes a usable QA API', () => {
  const { debug } = createGame();
  assert.equal(debug.state(), 'overworld');
  assert.equal(debug.getPet().id, 'kuni');
  assert.equal(debug.getKanjiStat('魚').level, 10);
  assert.ok(debug.availableSpawn('grass').includes('kuni'));
  assert.ok(debug.availableSpawn('water').includes('fish'));
});

test('render buffer is capped while preserving the viewport aspect ratio', () => {
  const { debug } = createGame({ viewportWidth: 3840, viewportHeight: 2160 });
  const size = debug.getCanvasSize();
  assert.equal(size.width, 1280);
  assert.equal(size.height, 720);
});

test('startup only preloads core assets and the active pet', () => {
  const { imageRequests } = createGame();
  assert.equal(imageRequests.length, 5);
  assert.ok(imageRequests.includes('assets/monsters/kuni/sprite.png'));
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

test('N4 is badge-gated when the temporary QA override is disabled', () => {
  const { debug } = createGame({ disableTestUnlocks: true });
  assert.equal(debug.isTierUnlocked('N5'), true);
  assert.equal(debug.isTierUnlocked('N4'), false);
  assert.equal(debug.tierProgress('N5').total, 79);
  assert.equal(debug.tierProgress('N4').total, 140);
});

test('a wrong battle answer damages the player and keeps the same question', () => {
  const { debug } = createGame();
  assert.equal(debug.startBattle('grass'), true);
  const battle = debug.getBattle();
  const originalKey = battle.q.key;
  const wrongIndex = (battle.q.correctIndex + 1) % battle.q.options.length;
  const hpBefore = debug.getPlayer().hp;
  debug.answer(wrongIndex);
  assert.ok(debug.getPlayer().hp < hpBefore);
  assert.equal(battle.retryQuestion, true);
  debug.updateBattle(1100);
  assert.equal(battle.q.key, originalKey);
  assert.equal(battle.retryQuestion, false);
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
