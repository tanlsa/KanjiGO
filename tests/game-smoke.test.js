const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

function createGame({ learningSave = null, gameSave = null, disableTestUnlocks = false, enableSkillQaSeed = false, viewportWidth = 1280, viewportHeight = 720 } = {}) {
  const storage = new Map();
  if (learningSave) storage.set('KANJIGO_LEARNING_V1', JSON.stringify(learningSave));
  if (gameSave) storage.set('KANJIGO_GAME_V1', JSON.stringify(gameSave));
  const noop = () => {};
  const imageRequests = [];
  const canvasContext = new Proxy({
    measureText: (text) => ({ width: String(text).length * 8 }),
    drawImage: (image) => { if (!image) throw new TypeError('drawImage received an unloaded image'); },
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
  }, {
    get(target, key) { return key in target ? target[key] : noop; },
    set(target, key, value) { target[key] = value; return true; },
  });
  const canvas = {
    width: 640, height: 480, style: {},
    getContext: () => canvasContext,
    addEventListener: noop,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 640, height: 480 }),
  };
  const createCanvas = () => ({ width: 0, height: 0, getContext: () => canvasContext });
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
      createElement: (tag) => tag === 'canvas' ? createCanvas() : {},
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
  context.CONFIG.SKILL_TREE.qaSeed.enabled = enableSkillQaSeed;
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

test('mobile overworld zooms out enough to frame the grand academy', () => {
  const { debug } = createGame({ viewportWidth: 390, viewportHeight: 844 });
  const zoom = debug.getWorldZoom();
  assert.ok(zoom >= 1 && zoom < 2);
  assert.ok(11 * 32 * zoom <= 390, 'academy footprint should fit the mobile viewport');
});

test('startup only preloads core assets and the active pet', () => {
  const { imageRequests } = createGame();
  assert.equal(imageRequests.length, 7);
  assert.ok(imageRequests.includes('assets/characters/player-bicycle.png'));
  assert.ok(imageRequests.includes('assets/world/terrain-tiles.png'));
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

test('frame budget uses 60 FPS for action and 30 FPS for idle UI', () => {
  const { debug } = createGame();
  assert.ok(Math.abs(debug.targetFrameMs() - 1000 / 30) < 0.01);
  debug.startBattle('grass');
  assert.ok(Math.abs(debug.targetFrameMs() - 1000 / 60) < 0.01);
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

test('themed Trainer unlocks at its collection threshold and uses at most five captured Kanji', () => {
  const { debug, storage } = createGame();
  assert.equal(debug.trainerStatus('gardener').state, 'locked');
  for (const char of ['木', '山', '川']) debug.mastery()[char].captured = true;
  const ready = debug.trainerStatus('gardener');
  assert.equal(ready.state, 'ready');
  assert.deepEqual([...ready.team].sort(), ['山', '川', '木'].sort());
  assert.equal(debug.startTrainer('gardener'), true);
  assert.equal(debug.getPve().mode, 'trainer');
  assert.ok(debug.getPve().pool.length <= 5);
  while (debug.getPve().phase === 'fight') {
    debug.answerPve(debug.getPve().q.correctIndex);
    debug.updatePve(600);
  }
  assert.equal(debug.trainerStatus('gardener').state, 'defeated');
  assert.equal(debug.trainerWinsCount(), 1);
  assert.equal(JSON.parse(storage.get('KANJIGO_LEARNING_V1')).trainerWins.gardener, true);
});

test('N5 Boss requires full N5 study and the configured Trainer win count', () => {
  const trainerWins = Object.fromEntries(['gardener', 'parent', 'student', 'timekeeper', 'traveler', 'chef', 'conductor', 'neighbor', 'explorer', 'weather_kid'].map((id) => [id, true]));
  const withoutWins = createGame();
  for (const stat of Object.values(withoutWins.debug.mastery())) if (stat && typeof stat === 'object') stat.captured = true;
  assert.equal(withoutWins.debug.startGym('N5'), false);

  const qualified = createGame({ learningSave: { trainerWins } });
  for (const stat of Object.values(qualified.debug.mastery())) if (stat && typeof stat === 'object') stat.captured = true;
  assert.equal(qualified.debug.trainerWinsCount(), 10);
  assert.equal(qualified.debug.startGym('N5'), true);
  assert.equal(qualified.debug.getPve().mode, 'gym');
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

test('fresh progression save records each eligible KP milestone once', () => {
  const { debug, storage } = createGame();
  const progression = debug.getProgression();

  assert.equal(progression.version, 1);
  assert.equal(progression.earnedKP, 6);
  assert.equal(debug.availableKP(), 6);
  assert.deepEqual(
    Object.keys(progression.claimedMilestones).sort(),
    ['capture:国', 'capture:魚', 'level10:魚', 'level3:魚', 'level5:魚', 'level7:魚'].sort(),
  );

  const saved = JSON.parse(storage.get('KANJIGO_LEARNING_V1'));
  assert.equal(saved.progression.earnedKP, 6);
  assert.equal(Object.keys(saved.progression.claimedMilestones).length, 6);
});

test('legacy progress receives retroactive KP exactly once', () => {
  const legacySave = {
    mastery: {
      日: { captured: true, lectured: true, mp: 90, level: 5 },
    },
  };
  const first = createGame({ learningSave: legacySave });
  const firstProgression = first.debug.getProgression();

  assert.equal(firstProgression.earnedKP, 9);
  assert.equal(firstProgression.claimedMilestones['capture:日'].migrated, true);
  assert.equal(firstProgression.claimedMilestones['level3:日'].migrated, true);
  assert.equal(firstProgression.claimedMilestones['level5:日'].migrated, true);
  const notice = first.debug.getProgressionNotice();
  assert.equal(notice.kp, 9);
  assert.equal(notice.milestones, 9);
  assert.equal(notice.migrated, true);

  const persisted = JSON.parse(first.storage.get('KANJIGO_LEARNING_V1'));
  const second = createGame({ learningSave: persisted });
  assert.equal(second.debug.getProgression().earnedKP, 9);
  assert.equal(Object.keys(second.debug.getProgression().claimedMilestones).length, 9);
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
  assert.equal(debug.availableKP(), 11);

  const second = debug.evaluateKanjiMilestones('日');
  assert.equal(second.kp, 0);
  assert.equal(second.milestones.length, 0);
  assert.equal(debug.availableKP(), 11);
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
  assert.equal(progression.earnedKP, 8);
  assert.equal(progression.skillPurchases.broken, undefined);
  assert.equal(progression.skillPurchases.future_perk.type, 'perk');
  assert.equal(progression.skillPurchases.future_perk.cost, 2);
  assert.equal(progression.skillPurchases.future_perk.purchasedAt, 123);
  assert.equal(debug.availableKP(), 6);
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
  for (const box of debug.getSkillUi().hitboxes.filter((item) => item.action === 'buy' || item.action === 'reset')) {
    assert.ok(box.x >= 0 && box.y >= 0);
    assert.ok(box.x + box.w <= width);
    assert.ok(box.y + box.h <= height);
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
  debug.getBattle().pendingWin = 1;
  debug.updateBattle(2);
  assert.equal(debug.getBattle().result, 'win');
  debug.updateBattle(1500);
  assert.equal(debug.state(), 'overworld');
  assert.equal(debug.isAutoRideActive(), true);
  debug.updateOverworld(1);
  assert.equal(debug.getPlayer().moving, true, 'Auto Ride did not resume after battle');

  assert.equal(debug.startBattle('grass'), true);
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
  prepareSkillProfile(debug, 12, 5);

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
  battle.q.mode = 'm3';
  const result = debug.useMeaningLens();
  assert.equal(result.reason, 'would_reveal_answer');
  assert.equal(battle.meaningLensRemaining, 1);
});
