// ============================================================
//  GAME.JS — ENGINE. Overworld + combat + lecture/capture + PvE.
//  Schema learning mới: mastery theo ký tự kanji (không còn theo câu hỏi).
//  Save cũ được migrate mềm: cộng correct/wrong theo target, thêm field SRS.
//  Vanilla Canvas 2D, <script> thường -> chạy trên file://
// ============================================================
(function () {
  const C = window.CONFIG;
  const TILES = window.MAP_DATA.TILES;
  const NPCS = window.MAP_DATA.NPCS;
  const ARENA = window.MAP_DATA.ARENA || null;
  const ONBOARDING_GUIDE = window.MAP_DATA.ONBOARDING_GUIDE || null;
  const MAP_SIGNS = window.MAP_DATA.SIGNS || [];
  const MAP_LANDMARKS = window.MAP_DATA.LANDMARKS || [];
  const MAP_PROPS = window.MAP_DATA.PROPS || [];
  const PROP_COLLISIONS = window.MAP_DATA.PROP_COLLISIONS || [];
  const TULIP_GARDENS = (((window.MAP_DATA || {}).DECORATIONS || {}).tulipGardens || []);
  const TECH_PARK = (((window.MAP_DATA || {}).DECORATIONS || {}).techPark || null);
  const KDB = window.KANJI_DB;
  const AcademyCore = window.KanjiGOAcademy, BattleCore = window.KanjiGOBattle, DexCore = window.KanjiGODex;
  const ProgressionCore = window.KanjiGOProgression, RendererCore = window.KanjiGORenderer;
  let challengeSource = null, challengesByKanji = new Map();
  function challengesForKanji(char) {
    const current = Array.isArray(KDB.CHALLENGES) ? KDB.CHALLENGES : [];
    if (current !== challengeSource) {
      challengeSource = current; challengesByKanji = new Map();
      for (const question of current) {
        const list = challengesByKanji.get(question.target) || [];
        list.push(question); challengesByKanji.set(question.target, list);
      }
    }
    return challengesByKanji.get(char) || [];
  }
const playSFX = (id) => { try { return window.AudioManager?.playSFX(id) || false; } catch (error) { return false; } };
  const playKanjiOnYomi = (char) => { try { return window.AudioManager?.playKanjiOnYomi(char) || false; } catch (error) { return false; } };
  const playKanjiKunYomi = (char) => { try { return window.AudioManager?.playKanjiKunYomi(char) || false; } catch (error) { return false; } };
  // Plays the On/Kun pronunciation audio for the exact Kanji a question is
  // asking about. Only runs for single-Kanji pronunciation questions (the
  // reading of a specific Kanji is tested and its type is known), so we never
  // play a generic sound or trigger per-frame.
  function playQuestionPronunciation(q) {
    if (!q) return false;
    const type = String(q.type || '').toLowerCase();
    if (type !== 'on' && type !== 'kun') return false;
    if (!['m1', 'm8'].includes(String(q.mode))) return false;
    const char = String(q.target || '').trim();
    if (!char) return false;
    return type === 'on' ? playKanjiOnYomi(char) : playKanjiKunYomi(char);
  }
  const CATALOG = window.KANJI_CATALOG || { tiers: {}, bonus: [] };
  const KANJI_BY_CHAR = new Map(Object.values(KDB.KANJI).map((info) => [info.char, info]));
  const vocabularyId = AcademyCore.vocabularyId;
  const questionIndex = AcademyCore.createQuestionIndex(KDB.QUESTIONS);
  const VOCABULARY_BY_ID = questionIndex.byId, QUESTIONS_BY_KANJI = questionIndex.byKanji;
  const DISTRACTOR_POOLS = BattleCore.createDistractorPools(KDB.QUESTIONS, [...KANJI_BY_CHAR.values()]);
  const TILE = C.TILE, ZOOM = C.ZOOM || 1;
  const MAP_H = TILES.length, MAP_W = TILES[0].length;
  const K = C.TILE_KEYS;
  const BLOCKED = new Set(C.BLOCKED_TILES);
  const PROP_BLOCKED = new Set();
  for (const collision of PROP_COLLISIONS) {
    for (let gy = collision.y; gy < collision.y + collision.height; gy++) {
      for (let gx = collision.x; gx < collision.x + collision.width; gx++) PROP_BLOCKED.add(`${gx},${gy}`);
    }
  }
  const ACADEMY_TILES = new Set([K.ACADEMY_DOOR, K.ACADEMY_WALL, K.ACADEMY_ROOF]);
  const TREE_CELLS = [];
  for (let gy = 0; gy < MAP_H; gy++) for (let gx = 0; gx < MAP_W; gx++) if (TILES[gy][gx] === K.TREE) TREE_CELLS.push({ gx, gy });

  const cv = document.getElementById('game');
  cv.width = C.CANVAS_W; cv.height = C.CANVAS_H;
  const cx = cv.getContext('2d');
  let gameReady = false;
  let fontReady = !(document.fonts && typeof document.fonts.load === 'function');
  let VIEWPORT_W = C.CANVAS_W, VIEWPORT_H = C.CANVAS_H;
  let SCREEN_W = C.CANVAS_W, SCREEN_H = C.CANVAS_H;
  let presentationScale = 1, renderPixelRatio = 1;
  let worldZoom = ZOOM;
  let VIEW_PX_W = SCREEN_W / worldZoom, VIEW_PX_H = SCREEN_H / worldZoom;
  function resolveWorldZoom(canvasWidth) {
    return RendererCore.resolveWorldZoom(canvasWidth, ZOOM, C.ACADEMY.width, TILE);
  }
  function resolveRenderPixelRatio(width, height, cssScale) {
    return RendererCore.resolveRenderPixelRatio({ width, height, cssScale,
      devicePixelRatio: window.devicePixelRatio, render: C.RENDER || {} });
  }
  function resizeCanvas() {
    const render = C.RENDER || {};
    const visualViewport = window.visualViewport;
    VIEWPORT_W = Math.max(320, Math.round(visualViewport?.width || window.innerWidth));
    VIEWPORT_H = Math.max(240, Math.round(visualViewport?.height || window.innerHeight));
    const maxLogicalW = Math.max(320, Number(render.maxLogicalWidth) || VIEWPORT_W);
    const maxLogicalH = Math.max(240, Number(render.maxLogicalHeight) || VIEWPORT_H);
    const logicalScale = Math.min(1, maxLogicalW / VIEWPORT_W, maxLogicalH / VIEWPORT_H);
    SCREEN_W = Math.max(320, Math.round(VIEWPORT_W * logicalScale));
    SCREEN_H = Math.max(240, Math.round(VIEWPORT_H * logicalScale));
    presentationScale = Math.min(VIEWPORT_W / SCREEN_W, VIEWPORT_H / SCREEN_H);
    renderPixelRatio = resolveRenderPixelRatio(SCREEN_W, SCREEN_H, presentationScale);
    cv.width = Math.max(320, Math.round(SCREEN_W * renderPixelRatio));
    cv.height = Math.max(240, Math.round(SCREEN_H * renderPixelRatio));
    worldZoom = resolveWorldZoom(SCREEN_W);
    VIEW_PX_W = SCREEN_W / worldZoom;
    VIEW_PX_H = SCREEN_H / worldZoom;
    cx.imageSmoothingEnabled = false;
  }
  function setScreenTransform(multiplier = 1) {
    const scale = renderPixelRatio * multiplier;
    cx.setTransform(scale, 0, 0, scale, 0, 0);
    cx.imageSmoothingEnabled = false;
  }
  resizeCanvas();
  function handleResize() {
    resizeCanvas();
    // Resize reset toàn bộ backing buffer. Vẽ lại ngay cả khi tab đang ẩn
    // để canvas không còn nền đen khi mở app/mobile emulator lần đầu.
    if (gameReady) render();
  }
  addEventListener('resize', handleResize);
  // Safari và các in-app browser thay đổi visual viewport khi thanh địa chỉ/
  // toolbar xuất hiện mà không phải lúc nào cũng phát window.resize.
  window.visualViewport?.addEventListener?.('resize', handleResize);
  const JPFONT = '"KanjiGo UI","Hiragino Sans","Yu Gothic UI",Meiryo,sans-serif';
  if (!fontReady) {
    Promise.all([
      document.fonts.load('400 16px "KanjiGo UI"', '漢字かなカナ Tiếng Việt'),
      document.fonts.load('700 16px "KanjiGo UI"', '漢字かなカナ Tiếng Việt'),
    ]).then(() => true, () => false).then((ready) => {
      fontReady = ready;
      // Font metrics can change after the fallback frame. Repaint every layout
      // once the bundled JP/VI faces become available.
      if (gameReady) render();
    });
  }

  // ---------- LOAD ẢNH ----------
  const imgs = {}, imageLoads = {}, failedImages = new Set(); let loadError = null;
  const deferredAssets = {
    landmark_ftown: C.ASSETS.ftownCampus,
    landmark_innovation_hub: C.ASSETS.innovationHub,
    landmark_heritage_pavilion: C.ASSETS.heritageGardenPavilion,
    landmark_hoa_lac: C.ASSETS.hoaLacCampus,
    prop_cuder: C.ASSETS.cuderStatue,
    prop_fpt_sign: C.ASSETS.fptSoftwareSign,
    prop_campus_shrub: C.ASSETS.campusShrubCluster,
    prop_campus_garden: C.ASSETS.fptCampusGarden,
    battle_forest: C.ASSETS.battleForest,
    battle_stand: C.ASSETS.battleStand,
  };
  function loadImg(name, src, required = true) {
    if (imgs[name]) return Promise.resolve(imgs[name]);
    if (failedImages.has(name)) return Promise.resolve(null);
    if (imageLoads[name]) return imageLoads[name];
    imageLoads[name] = new Promise((res) => {
      const im = new Image();
      im.onload = () => {
        imgs[name] = im; delete imageLoads[name];
        // Mascot được nạp lazy khi đổi pet trong KanjiDex. Repaint ngay khi
        // ảnh sẵn sàng để pet không trông như đã biến mất ở frame đầu tiên.
        if (gameReady) render();
        res(im);
      };
      im.onerror = () => { failedImages.add(name); if (required) loadError = src; delete imageLoads[name]; res(null); };
      im.src = src;
    });
    return imageLoads[name];
  }
  function deferredImg(name) {
    if (!imgs[name] && deferredAssets[name]) loadImg(name, deferredAssets[name], false);
    return imgs[name] || null;
  }
  function monsterImg(id) {
    const name = 'mon_' + id, monster = C.MONSTERS[id];
    if (!imgs[name] && !failedImages.has(name) && monster) loadImg(name, monster.img, false);
    return imgs[name] || null;
  }

  // ---------- TRẠNG THÁI ----------
  let state = 'overworld';   // overworld | battle | dex | skills | profile | lecture | capture | gym_select | pve
  // Single choke point for state changes so BGM can follow the game state.
  // Audio hooks must never live inside render/draw/loop/update functions.
  function setState(next) {
    state = next;
    window.AudioManager?.syncMusic?.(next);
  }
  const player = {
    gx: C.PLAYER.startGx, gy: C.PLAYER.startGy,
    px: C.PLAYER.startGx * TILE, py: C.PLAYER.startGy * TILE,
    facing: 'down', moving: false, running: false, animT: 0, frame: 0,
    fromX: 0, fromY: 0, toX: 0, toY: 0, moveT: 0, moveDuration: C.MOVE_MS,
    hp: C.PLAYER.maxHp, maxHp: C.PLAYER.maxHp, onBoat: false,
  };
  let dialog = { active: false, idx: 0, npc: null };
  let toast = { text: '', t: 0 };
  let fishing = null;
  const keys = {};
  let overworldHitboxes = [];
  function bindTouchControls() {
    document.querySelectorAll('#touch-controls [data-key]').forEach((button) => {
      const key = button.dataset.key;
      const release = () => { keys[key] = false; button.classList.remove('pressed'); };
      const suppressNativeHold = (e) => e.preventDefault();
      const press = () => { keys[key] = true; button.classList.add('pressed'); };
      button.addEventListener('pointerdown', (e) => {
        e.preventDefault(); press();
        if (button.setPointerCapture) button.setPointerCapture(e.pointerId);
      });
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('lostpointercapture', release);
      // Messenger/iOS WebView vẫn có thể mở menu Copy/Translate khi giữ nút
      // nếu chỉ chặn pointerdown. Chặn ngay touchstart (non-passive) và vẫn
      // cập nhật phím để các WebView cũ không hỗ trợ Pointer Events hoạt động.
      button.addEventListener('touchstart', (e) => { e.preventDefault(); press(); }, { passive: false });
      button.addEventListener('touchend', (e) => { e.preventDefault(); release(); }, { passive: false });
      button.addEventListener('touchcancel', release, { passive: false });
      // Mobile browsers may still open selection/copy UI after a long press,
      // even with touch-action:none. Suppress those native gestures explicitly.
      ['contextmenu', 'selectstart', 'dragstart'].forEach((eventName) => {
        button.addEventListener(eventName, suppressNativeHold);
      });
    });
    const bindAction = (button) => {
      const eventName = button.dataset.action === 'back' ? 'click' : 'pointerdown';
      button.addEventListener(eventName, (e) => {
        e.preventDefault();
        if (button.dataset.action === 'back') { playSFX('UI_BUTTON_CLICK'); onBack(); return; }
        if (state !== 'overworld') return;
if (button.dataset.action === 'interact') { playSFX('UI_BUTTON_CLICK'); onSpace(); }
        if (button.dataset.action === 'dex') { playSFX('UI_BUTTON_CLICK'); openDex(); }
        if (button.dataset.action === 'skills') { playSFX('UI_BUTTON_CLICK'); openSkillTree(); }
        if (button.dataset.action === 'profile') { playSFX('UI_BUTTON_CLICK'); openProfile(); }
        if (button.dataset.action === 'bicycle') { playSFX('UI_BUTTON_CLICK'); toggleBicycle(); }
        if (button.dataset.action === 'auto-ride') { playSFX('UI_BUTTON_CLICK'); toggleAutoRide(); }
      });
    };
    document.querySelectorAll('#touch-actions [data-action]').forEach(bindAction);
    // Nút Back nằm ngoài #touch-actions để giữ đúng safe-area trên mobile.
    // Vì vậy cần bind riêng thay vì trông chờ selector ở trên.
    const touchBack = document.getElementById('touch-back');
    if (touchBack) bindAction(touchBack);
    document.querySelectorAll('#touch-actions button, #touch-back').forEach((button) => {
      ['contextmenu', 'selectstart', 'dragstart'].forEach((eventName) => {
        button.addEventListener(eventName, (e) => e.preventDefault());
      });
      if (button.id !== 'touch-back') {
        button.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
      }
    });
  }
  bindTouchControls();

  // ---------- 📚 TIẾN ĐỘ HỌC ----------
  const characterStorageKey = (baseKey) => window.KanjiGOCharacters?.storageKey?.(baseKey) || baseKey;
  const LEARNING_KEY = characterStorageKey('KANJIGO_LEARNING_V1');
  const learning = { total: 0, correct: 0, wrong: 0, streak: 0, best: 0, mastery: {}, vocabulary: {}, captureAttempts: {}, academyDraft: null, badges: {}, trainerWins: {}, gymHistory: {}, progression: null };
  const legacyMasteryKeys = new Set();
  const legacyPetProgress = {};
  const GAME_KEY = characterStorageKey('KANJIGO_GAME_V1');
  const learningSaveQueue = ProgressionCore.createSaveQueue({
    snapshot: () => learning,
    write: (payload) => localStorage.setItem(LEARNING_KEY, payload),
    setTimer: window.setTimeout ? window.setTimeout.bind(window) : setTimeout,
    clearTimer: window.clearTimeout ? window.clearTimeout.bind(window) : clearTimeout,
    delayMs: 120,
  });
  let pveResult = null;
  let loadedLearningSave = false;
  let progressionNotice = null;

  function activeCharacterProfile() { return window.KanjiGOCharacters?.active?.() || null; }
  function isSandboxCharacter() { return activeCharacterProfile()?.sandbox === true; }
  function shouldSeedLegacyStarter() {
    const profile = activeCharacterProfile();
    return !profile || profile.sandbox === true || profile.onboardingComplete === true;
  }

  function kanjiInfo(char) {
    return KANJI_BY_CHAR.get(char) || null;
  }
  function resolveKanji(value) {
    if (!value) return null;
    const direct = kanjiInfo(value);
    if (direct) return direct.char;
    const byKey = KDB.KANJI[value];
    return byKey ? byKey.char : value;
  }
  function tierOfKanji(value) {
    const char = resolveKanji(value), info = kanjiInfo(char);
    if (info && info.jlpt) return String(info.jlpt).toUpperCase();
    for (const [tierId, tier] of Object.entries(CATALOG.tiers || {})) {
      if ((tier.kanji || []).includes(char)) return tierId;
    }
    return 'BONUS';
  }
  function hasBadge(tier) { return learning.badges[String(tier || '').toUpperCase()] === true; }
  function isTierUnlocked(tier) {
    const id = String(tier || 'BONUS').toUpperCase();
    if (id === 'BONUS') return true;
    const testUnlockedTiers = (C.PROGRESSION && C.PROGRESSION.testUnlockedTiers) || [];
    if ((isSandboxCharacter() || C.PROGRESSION?.allowStandardQa === true)
      && testUnlockedTiers.map((value) => String(value).toUpperCase()).includes(id)) return true;
    const definition = (CATALOG.tiers || {})[id];
    return !definition || !definition.requiresBadge || hasBadge(definition.requiresBadge);
  }
  function tierProgress(tier) {
    const id = String(tier || '').toUpperCase(), definition = (CATALOG.tiers || {})[id];
    const chars = definition ? definition.kanji : [];
    let available = 0, captured = 0;
    for (const char of chars) {
      if (kanjiInfo(char)) available++;
      if (kanjiInfo(char) && learning.mastery[char] && learning.mastery[char].captured === true) captured++;
    }
    return { tier: id, total: chars.length, available, captured, missing: Math.max(0, chars.length - available) };
  }
  function isTierStudyComplete(tier) {
    const progress = tierProgress(tier);
    return progress.total > 0 && progress.available === progress.total && progress.captured === progress.total;
  }
  function levelFromMp(mp) {
    return ProgressionCore.levelFromMp(C.KLEVEL.thresholds, C.KLEVEL.maxLevel, mp);
  }
  function mpFloorOfLevel(level) {
    return ProgressionCore.mpFloorOfLevel(C.KLEVEL.thresholds, C.KLEVEL.maxLevel, level);
  }
  function levelLabel(level) {
    const labels = C.KLEVEL.labels || {}, lv = Math.max(1, Math.min(C.KLEVEL.maxLevel, Number(level) || 1));
    const eligible = Object.keys(labels).map(Number).filter((key) => key <= lv).sort((a, b) => a - b);
    return eligible.length ? labels[eligible[eligible.length - 1]] : '';
  }
  function kpConfig() {
    const config = (C.PROGRESSION && C.PROGRESSION.kp) || {};
    return {
      version: Math.max(1, Math.floor(Number(config.version) || 1)),
      milestones: Array.isArray(config.milestones) ? config.milestones.filter((milestone) => milestone && typeof milestone.id === 'string') : [],
    };
  }
  function newProgression() {
    return { version: kpConfig().version, earnedKP: 0, claimedMilestones: {}, skillPurchases: {} };
  }
  function sanitizeProgression(raw) {
    const clean = newProgression();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return clean;
    const knownMilestones = new Map(kpConfig().milestones.map((milestone) => [milestone.id, milestone]));
    const claims = raw.claimedMilestones;
    let ledgerReward = 0;
    if (claims && typeof claims === 'object' && !Array.isArray(claims)) {
      for (const [key, value] of Object.entries(claims)) {
        if (!key || typeof key !== 'string') continue;
        const record = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
        const separator = key.indexOf(':'), milestoneId = separator > 0 ? key.slice(0, separator) : '';
        const fallbackReward = Math.max(0, Math.floor(Number(knownMilestones.get(milestoneId)?.reward) || 0));
        const reward = Number.isFinite(Number(record.reward)) ? Math.max(0, Math.floor(Number(record.reward))) : fallbackReward;
        clean.claimedMilestones[key] = {
          claimedAt: Math.max(0, Math.floor(Number(record.claimedAt) || 0)),
          migrated: record.migrated === true,
          reward,
        };
        ledgerReward += reward;
      }
    }
    const purchases = raw.skillPurchases;
    if (purchases && typeof purchases === 'object' && !Array.isArray(purchases)) {
      for (const [id, value] of Object.entries(purchases)) {
        if (!id || !value || typeof value !== 'object' || !['permanent', 'perk'].includes(value.type)) continue;
        const cost = Math.floor(Number(value.cost));
        if (!Number.isFinite(cost) || cost < 0) continue;
        clean.skillPurchases[id] = {
          type: value.type,
          cost,
          purchasedAt: Math.max(0, Math.floor(Number(value.purchasedAt) || 0)),
        };
      }
    }
    clean.earnedKP = Math.max(ledgerReward, Math.max(0, Math.floor(Number(raw.earnedKP) || 0)));
    return clean;
  }
  learning.progression = newProgression();
  function spentKP() {
    return Object.values(learning.progression.skillPurchases || {}).reduce((total, purchase) => {
      const cost = purchase && Number(purchase.cost);
      return total + (Number.isFinite(cost) && cost > 0 ? Math.floor(cost) : 0);
    }, 0);
  }
  function availableKP() { return Math.max(0, learning.progression.earnedKP - spentKP()); }
  const SKILL_EFFECT_IDS = new Set([
    'attackGaugeMultiplier', 'playerHpMultiplier', 'comboGuardCharges', 'meaningHintCharges',
    'reviewWeightMultiplier', 'radarMode', 'bicycleAccess', 'bicycleSpeedMultiplier', 'autoRideAccess', 'compoundEncounterMultiplier',
  ]);
  const SKILL_DEFINITIONS = Array.isArray(C.SKILL_TREE && C.SKILL_TREE.nodes) ? C.SKILL_TREE.nodes : [];
  const SKILL_BY_ID = new Map(SKILL_DEFINITIONS.map((definition) => [definition.id, definition]));
  function validateSkillDefinitions(definitions = SKILL_DEFINITIONS) {
    const errors = [], ids = new Set(), graph = new Map();
    for (const definition of definitions || []) {
      if (!definition || typeof definition !== 'object' || !definition.id) { errors.push('skill definition has no id'); continue; }
      if (ids.has(definition.id)) errors.push(`duplicate skill id: ${definition.id}`);
      ids.add(definition.id);
      if (!['permanent', 'perk'].includes(definition.type)) errors.push(`invalid skill type: ${definition.id}`);
      if (!Number.isFinite(Number(definition.costKP)) || Number(definition.costKP) < 0) errors.push(`invalid skill cost: ${definition.id}`);
      if (!definition.effect || !SKILL_EFFECT_IDS.has(definition.effect.id)) errors.push(`unknown effect: ${definition.id}`);
      if (!definition.position || !Number.isFinite(Number(definition.position.x)) || !Number.isFinite(Number(definition.position.y))) errors.push(`invalid graph position: ${definition.id}`);
      graph.set(definition.id, Array.isArray(definition.prerequisites) ? definition.prerequisites : []);
    }
    for (const [id, prerequisites] of graph) {
      for (const prerequisite of prerequisites) if (!ids.has(prerequisite)) errors.push(`unknown prerequisite ${prerequisite}: ${id}`);
    }
    const visiting = new Set(), visited = new Set();
    const visit = (id) => {
      if (visiting.has(id)) { errors.push(`skill prerequisite cycle: ${id}`); return; }
      if (visited.has(id)) return;
      visiting.add(id);
      for (const prerequisite of graph.get(id) || []) if (graph.has(prerequisite)) visit(prerequisite);
      visiting.delete(id); visited.add(id);
    };
    for (const id of graph.keys()) visit(id);
    return [...new Set(errors)];
  }
  const SKILL_DEFINITION_ERRORS = validateSkillDefinitions();
  if (SKILL_DEFINITION_ERRORS.length) console.error('[KanjiGO] Skill Tree config không hợp lệ:', SKILL_DEFINITION_ERRORS);
  function hasSkill(id) {
    const definition = SKILL_BY_ID.get(id);
    if (isSandboxCharacter() && definition && definition.released !== false) return true;
    return !!learning.progression.skillPurchases[id];
  }
  const SKILL_EFFECT_HANDLERS = {
    attackGaugeMultiplier: (resolved, effect) => {
      resolved.attackGaugeMultiplier = Math.max(.85, resolved.attackGaugeMultiplier * Math.max(.5, Math.min(1, Number(effect.value) || 1)));
    },
    playerHpMultiplier: (resolved, effect) => {
      resolved.playerHpMultiplier = Math.min(1.25, resolved.playerHpMultiplier * Math.max(1, Number(effect.value) || 1));
    },
    comboGuardCharges: (resolved, effect) => { resolved.comboGuardCharges += Math.max(0, Math.floor(Number(effect.value) || 0)); },
    meaningHintCharges: (resolved, effect) => { resolved.meaningHintCharges += Math.max(0, Math.floor(Number(effect.value) || 0)); },
    reviewWeightMultiplier: (resolved, effect) => {
      resolved.reviewWeightMultiplier *= Math.max(1, Number(effect.value) || 1);
      resolved.reviewWeightCap = Math.max(resolved.reviewWeightCap, Number(effect.cap) || 1);
    },
    radarMode: (resolved, effect) => { resolved.radarMode = effect.value || resolved.radarMode; },
    bicycleAccess: (resolved, effect) => { resolved.bicycleAccess = effect.value === true; },
    bicycleSpeedMultiplier: (resolved, effect) => {
      resolved.bicycleSpeedMultiplier *= Math.max(.6, Math.min(1, Number(effect.value) || 1));
    },
    autoRideAccess: (resolved, effect) => { resolved.autoRideAccess = effect.value === true; },
    compoundEncounterMultiplier: (resolved, effect) => { resolved.compoundEncounterMultiplier *= Math.max(1, Number(effect.value) || 1); },
  };
  let resolvedSkillEffectsCache = null;
  function resolveSkillEffects() {
    if (resolvedSkillEffectsCache) return resolvedSkillEffectsCache;
    const resolved = {
      attackGaugeMultiplier: 1, playerHpMultiplier: 1, comboGuardCharges: 0, meaningHintCharges: 0,
      reviewWeightMultiplier: 1, reviewWeightCap: 1, radarMode: 'off', bicycleAccess: false,
      bicycleSpeedMultiplier: 1, autoRideAccess: false, compoundEncounterMultiplier: 1,
    };
    const activeSkillIds = isSandboxCharacter()
      ? SKILL_DEFINITIONS.filter((definition) => definition && definition.released !== false).map((definition) => definition.id)
      : Object.keys(learning.progression.skillPurchases);
    for (const id of activeSkillIds) {
      const definition = SKILL_BY_ID.get(id);
      if (!definition || definition.released === false || !definition.effect) continue;
      const handler = SKILL_EFFECT_HANDLERS[definition.effect.id];
      if (handler) handler(resolved, definition.effect);
    }
    resolvedSkillEffectsCache = Object.freeze(resolved);
    return resolvedSkillEffectsCache;
  }
  function refreshSkillDerivedState() {
    resolvedSkillEffectsCache = null;
    if (C.MONSTERS[currentPetId]) syncPlayerScale(C.MONSTERS[currentPetId].kanji, false);
  }
  function capturedKanjiCount() {
    return Object.values(KDB.KANJI).reduce((count, info) => count + (ensureMastery(info.char).captured ? 1 : 0), 0);
  }
  function kanjiAtLevelCount(level) {
    const minimum = Math.max(1, Math.floor(Number(level) || 1));
    return Object.values(KDB.KANJI).reduce((count, info) => {
      const stat = ensureMastery(info.char);
      return count + (stat.captured && stat.level >= minimum ? 1 : 0);
    }, 0);
  }
  function skillRequirementDetails(definition) {
    const requirements = (definition && definition.requirements) || {}, details = [];
    if (Number.isFinite(Number(requirements.capturedKanji))) {
      const current = capturedKanjiCount(), needed = Math.max(0, Math.floor(Number(requirements.capturedKanji)));
      details.push({ id: 'capturedKanji', current, needed, met: current >= needed, label: `${current}/${needed} Kanji đã thu phục` });
    }
    if (requirements.kanjiAtLevel && typeof requirements.kanjiAtLevel === 'object') {
      const level = Math.max(1, Math.floor(Number(requirements.kanjiAtLevel.level) || 1));
      const needed = Math.max(0, Math.floor(Number(requirements.kanjiAtLevel.count) || 0));
      const current = kanjiAtLevelCount(level);
      details.push({ id: 'kanjiAtLevel', current, needed, met: current >= needed, label: `${current}/${needed} Kanji đạt Lv.${level}` });
    }
    if (requirements.feature) details.push({ id: 'feature', current: 0, needed: 1, met: false, label: 'Chờ Vocabulary Foundation' });
    return details;
  }
  function skillStatus(id, options = {}) {
    const definition = SKILL_BY_ID.get(id);
    if (!definition) return { id, state: 'missing', reason: 'missing', definition: null, requirements: [] };
    const requirements = skillRequirementDetails(definition);
    if (hasSkill(id)) return { id, state: 'owned', reason: 'owned', definition, requirements };
    if (definition.released === false && !options.allowUnreleased) return { id, state: 'preview', reason: 'unreleased', definition, requirements };
    const missingPrerequisites = (definition.prerequisites || []).filter((prerequisite) => !hasSkill(prerequisite));
    if (missingPrerequisites.length) return { id, state: 'locked', reason: 'prerequisites', definition, requirements, missingPrerequisites };
    if (requirements.some((requirement) => !requirement.met)) return { id, state: 'locked', reason: 'requirements', definition, requirements, missingPrerequisites: [] };
    if (availableKP() < Number(definition.costKP)) return { id, state: 'locked', reason: 'kp', definition, requirements, missingPrerequisites: [] };
    return { id, state: 'ready', reason: 'ready', definition, requirements, missingPrerequisites: [] };
  }
  function purchaseSkill(id, options = {}) {
    const status = skillStatus(id, options);
    if (status.state !== 'ready') return { ok: false, id, reason: status.reason, status };
    const definition = status.definition, cost = Math.max(0, Math.floor(Number(definition.costKP) || 0));
    learning.progression.skillPurchases[id] = {
      type: definition.type,
      cost,
      purchasedAt: Math.max(0, Math.floor(Number(options.now) || Date.now())),
    };
    refreshSkillDerivedState();
    saveLearning({ immediate: true });
    if (options.toast !== false) {
      const guide = definition.id === 'bicycle' ? ' • Nhấn B để lên xe'
        : definition.id === 'auto_ride' ? ' • Nhấn P để tự tìm bụi cỏ'
          : definition.id === 'radar_2' ? ' • Nhấn R để chọn mục tiêu' : '';
      showToast(`🌟 Đã mở ${definition.name} • -${cost} KP${guide}`);
    }
    return { ok: true, id, cost, availableKP: availableKP(), definition };
  }
  function resetPerks(options = {}) {
    if (['battle', 'capture', 'pve'].includes(state)) return { ok: false, reason: 'in_combat', refundedKP: 0, removed: [] };
    const removed = []; let refundedKP = 0;
    for (const [id, purchase] of Object.entries(learning.progression.skillPurchases)) {
      if (!purchase || purchase.type !== 'perk') continue;
      refundedKP += Math.max(0, Math.floor(Number(purchase.cost) || 0));
      removed.push(id); delete learning.progression.skillPurchases[id];
    }
    if (!removed.length) return { ok: false, reason: 'no_perks', refundedKP: 0, removed };
    refreshSkillDerivedState();
    saveLearning({ immediate: true });
    if (options.toast !== false) showToast(`↩ Đã hoàn ${refundedKP} KP từ ${removed.length} perk`);
    return { ok: true, reason: 'reset', refundedKP, removed, availableKP: availableKP() };
  }
  function newMastery(char) {
    const starter = C.MONSTERS[C.PET.monId] && C.MONSTERS[C.PET.monId].kanji;
    const starterUnlocked = shouldSeedLegacyStarter() && char === starter;
    return { correct: 0, wrong: 0, box: 0, nextReview: 0,
      mp: 0, level: 1, recall: 100, winStreak: 0, lossStreak: 0, bestWinStreak: 0,
      captured: starterUnlocked, lectured: starterUnlocked };
  }
  function ensureMastery(char) {
    const key = resolveKanji(char), current = learning.mastery[key];
    if (!current || typeof current !== 'object') learning.mastery[key] = newMastery(key);
    const s = learning.mastery[key];
    for (const [name, value] of Object.entries(newMastery(key))) {
      if (typeof s[name] !== typeof value || s[name] === undefined) s[name] = value;
    }
    s.correct = Math.max(0, Number(s.correct) || 0);
    s.wrong = Math.max(0, Number(s.wrong) || 0);
    s.box = Math.max(0, Math.min(5, Number(s.box) || 0));
    s.nextReview = Number.isFinite(s.nextReview) ? s.nextReview : 0;
    s.mp = Math.max(0, Math.min(mpFloorOfLevel(C.KLEVEL.maxLevel), Number(s.mp) || 0));
    s.level = levelFromMp(s.mp);
    s.recall = Math.max(0, Math.min(100, Number.isFinite(Number(s.recall)) ? Number(s.recall) : 100));
    for (const name of ['winStreak', 'lossStreak', 'bestWinStreak']) s[name] = Math.max(0, Math.floor(Number(s[name]) || 0));
    s.bestWinStreak = Math.max(s.bestWinStreak, s.winStreak);
    return s;
  }
  const VOCABULARY_STAGES = ['seen', 'practiced', 'recalled', 'mastered'];
  function vocabularyStageRank(stage) { return Math.max(0, VOCABULARY_STAGES.indexOf(stage)); }
  function newVocabularyProgress() {
    return { stage: 'seen', seenAt: 0, practicedAt: 0, recalledAt: 0, masteredAt: 0,
      correct: 0, wrong: 0, unassistedCorrect: 0, lastSeen: 0, nextReview: 0, lastContext: '' };
  }
  function sanitizeVocabularyProgress(value) {
    const source = value && typeof value === 'object' ? value : {}, result = newVocabularyProgress();
    result.stage = VOCABULARY_STAGES.includes(source.stage) ? source.stage : 'seen';
    for (const key of ['seenAt', 'practicedAt', 'recalledAt', 'masteredAt', 'lastSeen', 'nextReview']) {
      result[key] = Math.max(0, Number(source[key]) || 0);
    }
    for (const key of ['correct', 'wrong', 'unassistedCorrect']) result[key] = Math.max(0, Math.floor(Number(source[key]) || 0));
    result.lastContext = typeof source.lastContext === 'string' ? source.lastContext.slice(0, 32) : '';
    return result;
  }
  function migrateVocabulary(savedVocabulary) {
    const migrated = {};
    for (const [id, value] of Object.entries(savedVocabulary || {})) migrated[id] = sanitizeVocabularyProgress(value);
    return migrated;
  }
  function ensureVocabulary(value) {
    const id = typeof value === 'string' ? value : vocabularyId(value);
    if (!id) return null;
    if (!learning.vocabulary[id] || typeof learning.vocabulary[id] !== 'object') learning.vocabulary[id] = newVocabularyProgress();
    else learning.vocabulary[id] = sanitizeVocabularyProgress(learning.vocabulary[id]);
    return learning.vocabulary[id];
  }
  function vocabularyProgress(value) {
    const id = typeof value === 'string' ? value : vocabularyId(value);
    const progress = id && learning.vocabulary[id];
    return progress && typeof progress === 'object' ? progress : null;
  }
  function setVocabularyStage(progress, stage) {
    if (!progress || !VOCABULARY_STAGES.includes(stage)) return;
    if (vocabularyStageRank(stage) > vocabularyStageRank(progress.stage)) progress.stage = stage;
  }
  function markVocabularySeen(value, now = Date.now(), persist = true) {
    const id = typeof value === 'string' ? value : vocabularyId(value), progress = ensureVocabulary(id);
    if (!progress) return null;
    if (!progress.seenAt) progress.seenAt = now;
    progress.lastSeen = now;
    setVocabularyStage(progress, 'seen');
    if (persist) saveLearning();
    return progress;
  }
  function recordVocabularyEvidence(question, isCorrect, options = {}) {
    const id = question && (question.vocabId || question.id || vocabularyId(question));
    if (!id) return null;
    const now = Math.max(0, Number(options.now) || Date.now()), progress = markVocabularySeen(id, now, false);
    const intervals = C.SRS.boxIntervals || [0, 10 * 60e3, 24 * 3600e3, 3 * 24 * 3600e3, 7 * 24 * 3600e3];
    progress.practicedAt = now; progress.lastContext = String(options.context || 'practice').slice(0, 32);
    setVocabularyStage(progress, 'practiced');
    if (isCorrect) {
      const dueRecall = progress.recalledAt > 0 && progress.nextReview > 0 && progress.nextReview <= now;
      progress.correct++;
      if (options.assisted !== true) progress.unassistedCorrect++;
      // Academy là giai đoạn tiếp nhận + luyện ngay sau khi xem thẻ. Nó chỉ
      // được tính "practiced"; recalled/mastered phải đến từ một lượt ôn sau.
      if (options.allowRecall === false) return progress;
      if (dueRecall && options.allowMastery !== false) {
        progress.stage = 'mastered'; progress.masteredAt = now; progress.nextReview = now + (intervals[4] || 7 * 24 * 3600e3);
      } else {
        setVocabularyStage(progress, 'recalled');
        if (!progress.recalledAt) progress.recalledAt = now;
        progress.nextReview = Math.max(progress.nextReview, now + (intervals[2] || 24 * 3600e3));
      }
    } else {
      progress.wrong++;
      if (progress.stage === 'mastered') progress.stage = 'recalled';
      progress.nextReview = now + (intervals[1] || 10 * 60e3);
    }
    return progress;
  }
  function vocabularyQuestionsForKanji(char, seenOnly = false) {
    const questions = QUESTIONS_BY_KANJI.get(resolveKanji(char)) || [];
    if (!seenOnly) return questions;
    const seen = questions.filter((question) => !!learning.vocabulary[question.id] && learning.vocabulary[question.id].seenAt > 0);
    return seen.length ? seen : questions;
  }
  function recordProgressionGain(result, { migrated = false, toast: displayToast = false } = {}) {
    if (!result || result.kp <= 0) return result;
    progressionNotice = { kp: result.kp, milestones: result.milestones.length, migrated: migrated === true };
    if (displayToast) {
      const message = migrated
        ? `🎁 Tiến độ cũ: +${result.kp} KP (${result.milestones.length} mốc)`
        : `⭐ +${result.kp} KP • ${result.milestones.length} mốc tiến độ`;
      showToast(message);
    }
    return result;
  }
  function evaluateKanjiMilestones(value, options = {}) {
    const char = resolveKanji(value), result = { char, kp: 0, milestones: [] };
    if (!char || !kanjiInfo(char)) return result;
    const stat = ensureMastery(char), now = Math.max(0, Math.floor(Number(options.now) || Date.now()));
    for (const milestone of kpConfig().milestones) {
      const reward = Math.max(0, Math.floor(Number(milestone.reward) || 0));
      const eligible = milestone.requiresCaptured === true ? stat.captured === true
        : Number.isFinite(Number(milestone.level)) && stat.level >= Number(milestone.level);
      const key = `${milestone.id}:${char}`;
      if (!eligible || learning.progression.claimedMilestones[key]) continue;
      learning.progression.claimedMilestones[key] = { claimedAt: now, migrated: options.migrated === true, reward };
      learning.progression.earnedKP += reward;
      result.kp += reward;
      result.milestones.push(key);
    }
    if (result.kp > 0) {
      if (options.notify !== false) recordProgressionGain(result, { migrated: options.migrated, toast: options.toast });
      if (options.save !== false) saveLearning();
    }
    return result;
  }
  function evaluateAllKpMilestones(options = {}) {
    const result = { char: null, kp: 0, milestones: [] };
    for (const info of Object.values(KDB.KANJI)) {
      const gain = evaluateKanjiMilestones(info.char, { ...options, save: false, notify: false });
      result.kp += gain.kp;
      result.milestones.push(...gain.milestones);
    }
    if (result.kp > 0) {
      if (options.notify !== false) recordProgressionGain(result, { migrated: options.migrated, toast: options.toast });
      if (options.save !== false) saveLearning();
    }
    return result;
  }
  function migrateMastery(savedMastery) {
    const migrated = {};
    const merge = (char, old) => {
      if (!char || !old || typeof old !== 'object') return;
      const s = migrated[char] || newMastery(char);
      if (!Object.prototype.hasOwnProperty.call(old, 'mp')) legacyMasteryKeys.add(char);
      s.correct += Math.max(0, Number(old.correct) || 0);
      s.wrong += Math.max(0, Number(old.wrong) || 0);
      if (Number.isFinite(old.box)) s.box = Math.max(s.box, Math.min(5, old.box));
      if (Number.isFinite(old.nextReview) && (!s.nextReview || old.nextReview < s.nextReview)) s.nextReview = old.nextReview;
      if (Number.isFinite(old.mp)) s.mp = Math.max(s.mp, old.mp);
      if (Number.isFinite(old.recall)) s.recall = old.recall;
      if (Number.isFinite(old.winStreak)) s.winStreak = old.winStreak;
      if (Number.isFinite(old.lossStreak)) s.lossStreak = old.lossStreak;
      if (Number.isFinite(old.bestWinStreak)) s.bestWinStreak = old.bestWinStreak;
      s.captured = s.captured || old.captured === true;
      s.lectured = s.lectured || old.lectured === true;
      migrated[char] = s;
    };
    for (const [key, old] of Object.entries(savedMastery || {})) {
      let char = kanjiInfo(key)?.char || (KDB.KANJI[key] && KDB.KANJI[key].char);
      if (!char) {
        const q = KDB.QUESTIONS.find((item) => key === questionKey(item) || key.includes(`|${item.target}|`));
        char = q && q.target;
      }
      merge(char, old);
    }
    for (const info of Object.values(KDB.KANJI)) {
      const s = migrated[info.char] || newMastery(info.char);
      migrated[info.char] = s;
    }
    return migrated;
  }
  function loadLearning() {
    if (!C.LEARNING || C.LEARNING.persist === false) return;
    try {
      const saved = JSON.parse(localStorage.getItem(LEARNING_KEY) || 'null');
      if (!saved || typeof saved !== 'object') return;
      loadedLearningSave = true;
      for (const key of ['total', 'correct', 'wrong', 'streak', 'best']) {
        if (Number.isFinite(saved[key]) && saved[key] >= 0) learning[key] = saved[key];
      }
      learning.mastery = migrateMastery(saved.mastery);
      learning.vocabulary = migrateVocabulary(saved.vocabulary);
      if (saved.captureAttempts && typeof saved.captureAttempts === 'object') learning.captureAttempts = saved.captureAttempts;
      if (saved.academyDraft && typeof saved.academyDraft === 'object') learning.academyDraft = saved.academyDraft;
      if (saved.badges && typeof saved.badges === 'object') learning.badges = { ...saved.badges };
      if (saved.trainerWins && typeof saved.trainerWins === 'object') learning.trainerWins = { ...saved.trainerWins };
      if (saved.gymHistory && typeof saved.gymHistory === 'object') {
        for (const [tier, raw] of Object.entries(saved.gymHistory)) {
          if (!raw || typeof raw !== 'object') continue;
          const id = String(tier).toUpperCase(), attempts = Math.max(0, Math.floor(Number(raw.attempts) || 0));
          learning.gymHistory[id] = {
            attempts,
            bestCorrect: Math.max(0, Math.floor(Number(raw.bestCorrect) || 0)),
            bestTotal: Math.max(0, Math.floor(Number(raw.bestTotal) || 0)),
            bestRatio: Math.max(0, Math.min(1, Number(raw.bestRatio) || 0)),
            bestGrade: ['S', 'A', 'B', 'C', 'D'].includes(raw.bestGrade) ? raw.bestGrade : 'D',
            bestAt: Math.max(0, Number(raw.bestAt) || 0),
            bestDurationMs: Math.max(0, Number(raw.bestDurationMs) || 0),
            lastCorrect: Math.max(0, Math.floor(Number(raw.lastCorrect) || 0)),
            lastTotal: Math.max(0, Math.floor(Number(raw.lastTotal) || 0)),
            lastRatio: Math.max(0, Math.min(1, Number(raw.lastRatio) || 0)),
            lastGrade: ['S', 'A', 'B', 'C', 'D'].includes(raw.lastGrade) ? raw.lastGrade : 'D',
            lastAt: Math.max(0, Number(raw.lastAt) || 0),
            lastDurationMs: Math.max(0, Number(raw.lastDurationMs) || 0),
          };
        }
      }
      learning.progression = sanitizeProgression(saved.progression);
      saveLearning({ immediate: true });
    } catch (e) { console.warn('[KanjiGO] Không đọc được tiến độ học.', e); }
  }
  function saveLearning(options = {}) {
    if (!C.LEARNING || C.LEARNING.persist === false) return;
    try {
      learningSaveQueue.schedule();
      if (options.immediate === true) learningSaveQueue.flush();
    } catch (e) { /* storage có thể bị chặn khi chạy file:// */ }
  }
  function flushLearningSave() { try { return learningSaveQueue.flush(); } catch (e) { return false; } }
  function questionKey(q) { return `${q.word}|${q.target}|${q.answer}|${q.type}`; }
  function questionScore(q) {
    const progress = learning.vocabulary[vocabularyId(q)];
    if (progress) return progress.correct - progress.wrong * 2;
    const s = ensureMastery(q.target);
    return s ? s.correct - s.wrong * 2 : 0;
  }
  function expInLevel(kanji) {
    const s = ensureMastery(kanji), floor = mpFloorOfLevel(s.level);
    return Math.max(0, s.mp - floor);
  }
  function expToNext(kanji) {
    const s = ensureMastery(kanji);
    return s.level >= C.KLEVEL.maxLevel ? 0 : Math.max(1, mpFloorOfLevel(s.level + 1) - mpFloorOfLevel(s.level));
  }
  function isDue(kanji, now = Date.now()) { return ensureMastery(kanji).nextReview <= now; }
  function rustMultiplier(kanji, now = Date.now()) {
    const s = ensureMastery(kanji);
    if (s.nextReview > now) return 1;
    const intervals = C.SRS.boxIntervals || [0, 1];
    const interval = intervals[Math.max(0, Math.min(5, s.box))] || 1;
    const overdue = s.nextReview <= 0 ? 1 : Math.max(0, (now - s.nextReview) / interval);
    const weakness = (5 - s.box) / 5;
    const factor = Math.min(1, weakness * 0.65 + Math.min(1, overdue) * 0.35);
    return 1 + (C.SRS.rustBonusMax - 1) * factor;
  }
  function srsPromote(kanji, now = Date.now(), persist = true) {
    const s = ensureMastery(kanji);
    s.box = Math.min(5, s.box + 1);
    s.nextReview = now + (C.SRS.boxIntervals[s.box] || 0);
    if (persist) saveLearning();
    return s;
  }
  function srsDemote(kanji, now = Date.now(), persist = true) {
    const s = ensureMastery(kanji);
    s.box = Math.max(0, s.box - 1);
    s.nextReview = now + (C.SRS.boxIntervals[s.box] || 0);
    if (persist) saveLearning();
    return s;
  }
  function createLearningSession(kind = 'practice', now = Date.now()) {
    return { kind, startedAt: Math.max(0, Number(now) || Date.now()), answers: {}, graded: false, result: null };
  }
  function addSessionEvidence(session, q, isCorrect) {
    if (!session || session.graded || !q || !q.target) return;
    const target = resolveKanji(q.target), evidence = session.answers[target] || { correct: 0, wrong: 0, total: 0 };
    evidence.total++;
    if (isCorrect) evidence.correct++; else evidence.wrong++;
    session.answers[target] = evidence;
  }
  function finalizeLearningSession(session, now = Date.now()) {
    if (!session || session.graded) return session && session.result;
    const finishedAt = Math.max(session.startedAt, Number(now) || Date.now()), changes = [];
    const passRatio = Math.max(0, Math.min(1, Number(C.SRS.sessionPassRatio) || .8));
    for (const [char, evidence] of Object.entries(session.answers || {})) {
      const stat = ensureMastery(char), before = stat.box, ratio = evidence.total ? evidence.correct / evidence.total : 0;
      // Correct evidence only advances a due item. This prevents a Capture or
      // battle grind from climbing several boxes in one sitting.
      if (evidence.correct > 0 && ratio >= passRatio && stat.nextReview <= session.startedAt) srsPromote(char, finishedAt, false);
      else if (evidence.wrong > 0 && ratio < passRatio) srsDemote(char, finishedAt, false);
      changes.push({ char, before, after: stat.box, ratio, ...evidence });
    }
    session.graded = true;
    session.result = { kind: session.kind, startedAt: session.startedAt, finishedAt, changes };
    saveLearning({ immediate: true });
    return session.result;
  }
  function recordAnswer(q, isCorrect, session = null, context = '') {
    const s = ensureMastery(q.target);
    learning.total++;
    if (isCorrect) { learning.correct++; learning.streak++; s.correct++; learning.best = Math.max(learning.best, learning.streak); }
    else { learning.wrong++; learning.streak = 0; s.wrong++; }
    recordVocabularyEvidence(q, isCorrect, { context: context || (session && session.kind) || 'practice' });
    if (session) addSessionEvidence(session, q, isCorrect);
    else if (isCorrect) srsPromote(q.target, Date.now(), false);
    else srsDemote(q.target, Date.now(), false);
    saveLearning();
  }
  function awardWin(kanji, encounterCtx = {}) {
    const s = ensureMastery(kanji), K = C.KLEVEL;
    const beforeStreak = s.winStreak;
    const streakMult = Math.min(K.winStreakMultMax, 1 + beforeStreak * K.winStreakStep);
    const rustMult = 1 + (100 - s.recall) / 100;
    const mpGain = Math.round(K.mpBasePerWin * streakMult * rustMult);
    const beforeLevel = s.level;
    s.mp = Math.min(mpFloorOfLevel(K.maxLevel), s.mp + Math.max(0, mpGain));
    s.level = levelFromMp(s.mp);
    s.recall = Math.min(100, s.recall + K.recallWinRecover);
    s.winStreak = beforeStreak + 1;
    s.bestWinStreak = Math.max(s.bestWinStreak, s.winStreak);
    s.lossStreak = 0;
    const kpResult = evaluateKanjiMilestones(kanji, { save: false, toast: true });
    saveLearning({ immediate: true });
    return { kanji: resolveKanji(kanji), mpGain, beforeLevel, level: s.level, leveledUp: s.level > beforeLevel,
      streakMult, rustMult, winStreak: s.winStreak, kpGain: kpResult.kp, encounter: encounterCtx };
  }
  function awardLoss(kanji) {
    const s = ensureMastery(kanji), K = C.KLEVEL;
    s.recall = Math.max(0, s.recall - K.recallLossPenalty);
    s.lossStreak++;
    s.winStreak = 0;
    let chained = false;
    if (s.lossStreak >= K.lossStreakTrigger) {
      chained = true;
      s.recall = Math.max(0, s.recall - K.recallStreakExtra);
      s.mp = Math.max(mpFloorOfLevel(s.level), s.mp - K.mpStreakPenalty);
      s.level = levelFromMp(s.mp);
      s.lossStreak = 0; // reset sau mỗi lần phạt chuỗi, tránh phạt dồn từng trận
      showToast('Chuỗi thua — hạ đánh giá tạm thời, chữ này sẽ xuất hiện nhiều hơn để ôn lại.');
    }
    saveLearning({ immediate: true });
    return { kanji: resolveKanji(kanji), chained, recall: s.recall, mp: s.mp, level: s.level, lossStreak: s.lossStreak };
  }
  function reappearWeight(kanji, now = Date.now()) {
    const s = ensureMastery(kanji);
    let weight = 1 + (100 - s.recall) / 50;
    if (isDue(kanji, now)) weight *= 1.5;
    if (C.MONSTERS[currentPetId] && C.MONSTERS[currentPetId].kanji === resolveKanji(kanji)) weight *= 2;
    const effects = resolveSkillEffects();
    if (effects.reviewWeightMultiplier > 1 && (s.recall < 70 || isDue(kanji, now))) {
      weight *= Math.min(effects.reviewWeightCap || effects.reviewWeightMultiplier, effects.reviewWeightMultiplier);
    }
    return weight;
  }
  function learningAccuracy() { return learning.total ? Math.round(learning.correct / learning.total * 100) : 0; }
  loadLearning();
  for (const info of Object.values(KDB.KANJI)) ensureMastery(info.char);
  saveLearning({ immediate: true });

  // 🐾 PET + tiến trình
  // Registry animation chính thức. Kanji có choreography riêng được khai báo
  // tại đây; các chữ còn lại tự kế thừa đòn theo semantic `effect` bên dưới.
  const KANJI_ANIMATIONS = Object.freeze({
    '火': Object.freeze({ meaning: 'Lửa', follow: 'ember-hop', attack: 'flame-dash', effect: 'fire-embers', colors: ['#fff08a', '#ff3b1f'] }),
    '水': Object.freeze({ meaning: 'Nước', follow: 'water-float', attack: 'tidal-wave', effect: 'water-ripple', colors: ['#d8fbff', '#2aa9ff'] }),
    '木': Object.freeze({ meaning: 'Cây', follow: 'tree-sway', attack: 'vine-whip', effect: 'leaf-fall', colors: ['#d8ff91', '#48b84d'] }),
    '電': Object.freeze({ meaning: 'Điện', follow: 'static-jitter', attack: 'thunder-strike', effect: 'lightning', colors: ['#fffbd0', '#ffd91f'] }),
    '気': Object.freeze({ meaning: 'Khí', follow: 'wind-glide', attack: 'wind-cutter', effect: 'breeze', colors: ['#e4fff5', '#55d6ae'] }),
    '日': Object.freeze({ meaning: 'Mặt trời', follow: 'sun-orbit', attack: 'solar-burst', effect: 'sun-glow', colors: ['#fff6a0', '#ff9d32'] }),
    '月': Object.freeze({ meaning: 'Mặt trăng', follow: 'moon-drift', attack: 'moon-blade', effect: 'moon-glow', colors: ['#edf5ff', '#729dff'] }),
    '山': Object.freeze({ meaning: 'Núi', follow: 'peak-stomp', attack: 'mountain-crash', effect: 'peaks', colors: ['#ffe0a8', '#9a633e'] }),
    '川': Object.freeze({ meaning: 'Sông', follow: 'river-flow', attack: 'river-rush', effect: 'river-flow', colors: ['#c8f8ff', '#238bd2'] }),
    '金': Object.freeze({ meaning: 'Vàng', follow: 'gold-shine', attack: 'golden-comet', effect: 'gold-sparkle', colors: ['#fff4ae', '#e9a51d'] }),
    '雨': Object.freeze({ meaning: 'Mưa', follow: 'rain-bounce', attack: 'rain-storm', effect: 'rain-drops', colors: ['#d8f5ff', '#4b8ee8'] }),
    '土': Object.freeze({ meaning: 'Đất', follow: 'earth-stomp', attack: 'earth-spike', effect: 'earth-crumble', colors: ['#ffe0ad', '#9c5d32'] }),
    '魚': Object.freeze({ meaning: 'Cá', follow: 'bubble-swim', attack: 'bubble-torpedo', effect: 'bubbles', colors: ['#dcfbff', '#28b7d9'] }),
    '音': Object.freeze({ meaning: 'Âm thanh', follow: 'sound-pulse', attack: 'sonic-wave', effect: 'sound-wave', colors: ['#f3ddff', '#b05fe5'] }),
    '生': Object.freeze({ meaning: 'Sinh mệnh', follow: 'life-bloom', attack: 'life-bloom', effect: 'life', colors: ['#e5ff9e', '#45c86b'] }),
    '一': Object.freeze({ meaning: 'Một', follow: 'single-orbit', attack: 'single-slash', effect: 'orbit-1', colors: ['#fff7c2', '#ffb340'] }),
    '人': Object.freeze({ meaning: 'Người', follow: 'people-step', attack: 'twin-strike', effect: 'people-pair', colors: ['#ffe2c2', '#ef855b'] }),
    '学': Object.freeze({ meaning: 'Học', follow: 'study-flutter', attack: 'book-burst', effect: 'study', colors: ['#d9f4ff', '#4a9bd8'] }),
    '車': Object.freeze({ meaning: 'Xe', follow: 'wheel-roll', attack: 'wheel-charge', effect: 'wheel-tracks', colors: ['#ffd8d3', '#d74a45'] }),
    '食': Object.freeze({ meaning: 'Ăn', follow: 'steam-hop', attack: 'steam-bite', effect: 'steam-aroma', colors: ['#fff1c9', '#e38c3d'] }),
    '話': Object.freeze({ meaning: 'Nói chuyện', follow: 'speech-bob', attack: 'word-cannon', effect: 'speech-bubbles', colors: ['#fff2a5', '#e8a936'] }),
    '書': Object.freeze({ meaning: 'Viết', follow: 'ink-brush', attack: 'ink-slash', effect: 'ink-strokes', colors: ['#d7ffe5', '#278a62'] }),
    '時': Object.freeze({ meaning: 'Thời gian', follow: 'clock-tick', attack: 'clock-stop', effect: 'clock', colors: ['#e5f6ff', '#5188c7'] }),
    '上': Object.freeze({ meaning: 'Lên', follow: 'rise-float', attack: 'rising-uppercut', effect: 'rise', colors: ['#d8fbff', '#4dc7db'] }),
    '下': Object.freeze({ meaning: 'Xuống', follow: 'sink-step', attack: 'meteor-drop', effect: 'sink', colors: ['#d8fff7', '#369e91'] }),
    '大': Object.freeze({ meaning: 'Lớn', follow: 'giant-stomp', attack: 'giant-smash', effect: 'grow', colors: ['#ffe2bd', '#de7643'] }),
    '小': Object.freeze({ meaning: 'Nhỏ', follow: 'tiny-dart', attack: 'needle-barrage', effect: 'tiny', colors: ['#ffe4c7', '#e9984c'] }),
    '国': Object.freeze({ meaning: 'Quốc gia', follow: 'barrier-guard', attack: 'barrier-crush', effect: 'boundary', colors: ['#d7e8ff', '#4d77bd'] }),
    '友': Object.freeze({ meaning: 'Bạn bè', follow: 'friend-sync', attack: 'dual-heart', effect: 'friendship-link', colors: ['#ffdce4', '#ec6f8c'] }),
    '休': Object.freeze({ meaning: 'Nghỉ ngơi', follow: 'rest-doze', attack: 'dream-leaf', effect: 'rest-leaves', colors: ['#e9ffc0', '#72ae44'] }),
    '年': Object.freeze({ meaning: 'Năm', follow: 'life-bloom', attack: 'season-wheel', effect: 'seasons', colors: ['#fff0a8', '#df795b'] }),
    '本': Object.freeze({ meaning: 'Sách / gốc', follow: 'study-flutter', attack: 'book-burst', effect: 'page-flip', colors: ['#fff4d2', '#b67b4b'] }),
    '中': Object.freeze({ meaning: 'Trung tâm', follow: 'barrier-guard', attack: 'center-beam', effect: 'center-pulse', colors: ['#d9f8ff', '#3aa7c8'] }),
    '長': Object.freeze({ meaning: 'Dài / trưởng', follow: 'rise-float', attack: 'long-lance', effect: 'lengthen', colors: ['#ffd9ef', '#cb5f9d'] }),
    '出': Object.freeze({ meaning: 'Ra ngoài', follow: 'wind-glide', attack: 'outward-blast', effect: 'outward', colors: ['#d8fff3', '#43b591'] }),
    '三': Object.freeze({ meaning: 'Ba', follow: 'single-orbit', attack: 'orbit-barrage', effect: 'orbit-3', count: 3, colors: ['#ffd9f3', '#d75fa8'] }),
    '行': Object.freeze({ meaning: 'Đi / hành động', follow: 'people-step', attack: 'step-rush', effect: 'steps', colors: ['#d7ffe3', '#4ab267'] }),
    '見': Object.freeze({ meaning: 'Nhìn', follow: 'static-jitter', attack: 'eye-beam', effect: 'scan', colors: ['#e9ddff', '#765dcc'] }),
    '今': Object.freeze({ meaning: 'Bây giờ', follow: 'sound-pulse', attack: 'now-burst', effect: 'now-pulse', colors: ['#dbfbff', '#3ba9c6'] }),
    '分': Object.freeze({ meaning: 'Chia', follow: 'friend-sync', attack: 'split-blade', effect: 'split', colors: ['#ffe0cd', '#d36c48'] }),
    '後': Object.freeze({ meaning: 'Phía sau', follow: 'wind-glide', attack: 'backstab', effect: 'backtrail', colors: ['#dce5ff', '#667fc8'] }),
    '前': Object.freeze({ meaning: 'Phía trước', follow: 'wheel-roll', attack: 'forward-charge', effect: 'forward', colors: ['#d8fff5', '#3db18f'] }),
    '五': Object.freeze({ meaning: 'Năm', follow: 'single-orbit', attack: 'orbit-barrage', effect: 'orbit-5', count: 5, colors: ['#ffe0bd', '#df7740'] }),
    '間': Object.freeze({ meaning: 'Khoảng / gian', follow: 'moon-drift', attack: 'portal-crush', effect: 'portal', colors: ['#dcf7ff', '#4c7ed1'] }),
    '東': Object.freeze({ meaning: 'Phía đông', follow: 'sun-orbit', attack: 'sunrise-lance', effect: 'sunrise', colors: ['#fff1a5', '#ef743d'] }),
    '四': Object.freeze({ meaning: 'Bốn', follow: 'single-orbit', attack: 'orbit-barrage', effect: 'orbit-4', count: 4, colors: ['#eadcff', '#8d62cc'] }),
    '九': Object.freeze({ meaning: 'Chín', follow: 'single-orbit', attack: 'orbit-barrage', effect: 'orbit-9', count: 9, colors: ['#d9fffa', '#36b7ae'] }),
    '入': Object.freeze({ meaning: 'Đi vào', follow: 'wind-glide', attack: 'inward-collapse', effect: 'inward', colors: ['#ffe0d5', '#cf6854'] }),
    '高': Object.freeze({ meaning: 'Cao', follow: 'rise-float', attack: 'sky-drop', effect: 'height', colors: ['#d8fff0', '#47b98b'] }),
    '円': Object.freeze({ meaning: 'Tròn / Yên', follow: 'wheel-roll', attack: 'coin-ring', effect: 'coin-ring', colors: ['#fff0b5', '#d79b28'] }),
    '十': Object.freeze({ meaning: 'Mười', follow: 'cross-pulse', attack: 'cross-flare', effect: 'cross-flare', colors: ['#fff3c4', '#e85f43'] }),
    '二': Object.freeze({ meaning: 'Hai', follow: 'single-orbit', attack: 'orbit-barrage', effect: 'orbit-2', count: 2, colors: ['#dff6ff', '#438fc9'] }),
    '子': Object.freeze({ meaning: 'Trẻ em', follow: 'child-bounce', attack: 'child-spring', effect: 'child-bounce', colors: ['#fff0c9', '#f08d62'] }),
    '外': Object.freeze({ meaning: 'Bên ngoài', follow: 'wind-glide', attack: 'outward-blast', effect: 'outside-drift', colors: ['#dffcff', '#479dbd'] }),
    '八': Object.freeze({ meaning: 'Tám', follow: 'single-orbit', attack: 'orbit-barrage', effect: 'orbit-8', count: 8, colors: ['#f2e0ff', '#955cc4'] }),
    '六': Object.freeze({ meaning: 'Sáu', follow: 'single-orbit', attack: 'orbit-barrage', effect: 'orbit-6', count: 6, colors: ['#e0fff1', '#42aa78'] }),
    '来': Object.freeze({ meaning: 'Đến', follow: 'lead-step', attack: 'forward-charge', effect: 'approach', colors: ['#e1fff4', '#3cad78'] }),
    '七': Object.freeze({ meaning: 'Bảy', follow: 'single-orbit', attack: 'orbit-barrage', effect: 'orbit-7', count: 7, colors: ['#ffe1ef', '#d25d8e'] }),
    '女': Object.freeze({ meaning: 'Nữ', follow: 'grace-step', attack: 'petal-dance', effect: 'grace-step', colors: ['#ffe2f0', '#e45e95'] }),
    '北': Object.freeze({ meaning: 'Phía bắc', follow: 'compass-hover', attack: 'compass-star', effect: 'north-star', axis: -1, colors: ['#e2f5ff', '#4c7fd0'] }),
    '午': Object.freeze({ meaning: 'Buổi trưa', follow: 'sun-orbit', attack: 'noon-beam', effect: 'noon-ray', colors: ['#fff5a8', '#ef7c31'] }),
    '百': Object.freeze({ meaning: 'Trăm', follow: 'grid-flicker', attack: 'hundred-grid', effect: 'hundred-grid', count: 10, colors: ['#e5f0ff', '#5577c8'] }),
    '先': Object.freeze({ meaning: 'Trước / tiên phong', follow: 'lead-step', attack: 'lead-arrow', effect: 'lead-arrow', colors: ['#e1fff1', '#36a66b'] }),
    '名': Object.freeze({ meaning: 'Tên', follow: 'name-bob', attack: 'name-seal', effect: 'name-tag', glyph: '名', colors: ['#fff0b8', '#c98136'] }),
    '千': Object.freeze({ meaning: 'Nghìn', follow: 'star-drift', attack: 'star-barrage', effect: 'many-sparkles', count: 12, colors: ['#fff6c0', '#e4a32c'] }),
    '西': Object.freeze({ meaning: 'Phía tây', follow: 'moon-drift', attack: 'sunset-blade', effect: 'sunset-drift', colors: ['#ffe0c5', '#d75c65'] }),
    '語': Object.freeze({ meaning: 'Ngôn ngữ', follow: 'speech-bob', attack: 'word-cannon', effect: 'word-sparks', colors: ['#e6ddff', '#7b5bc7'] }),
    '南': Object.freeze({ meaning: 'Phía nam', follow: 'compass-hover', attack: 'compass-star', effect: 'south-compass', axis: 1, colors: ['#fff0c9', '#dd7541'] }),
    '何': Object.freeze({ meaning: 'Cái gì', follow: 'question-hover', attack: 'question-burst', effect: 'question-orbit', colors: ['#eee0ff', '#8959c7'] }),
    '万': Object.freeze({ meaning: 'Mười nghìn', follow: 'star-drift', attack: 'star-barrage', effect: 'myriad-stars', count: 16, colors: ['#e2f7ff', '#507dcc'] }),
    '半': Object.freeze({ meaning: 'Một nửa', follow: 'friend-sync', attack: 'split-blade', effect: 'half-split', colors: ['#fff0cf', '#d47848'] }),
    '男': Object.freeze({ meaning: 'Nam', follow: 'giant-stomp', attack: 'giant-smash', effect: 'strength-pulse', colors: ['#ffe0b8', '#c96d3f'] }),
    '校': Object.freeze({ meaning: 'Trường học', follow: 'study-flutter', attack: 'sonic-wave', effect: 'school-bell', colors: ['#dff3ff', '#4d83c4'] }),
    '毎': Object.freeze({ meaning: 'Mỗi', follow: 'clock-tick', attack: 'clock-stop', effect: 'repeat-loop', colors: ['#e8e1ff', '#765fc4'] }),
    '白': Object.freeze({ meaning: 'Trắng', follow: 'sun-orbit', attack: 'solar-burst', effect: 'white-shimmer', colors: ['#ffffff', '#a9d8ef'] }),
    '天': Object.freeze({ meaning: 'Bầu trời', follow: 'rise-float', attack: 'sky-drop', effect: 'sky-rays', colors: ['#e0f7ff', '#4d9bd2'] }),
    '母': Object.freeze({ meaning: 'Mẹ', follow: 'friend-sync', attack: 'dual-heart', effect: 'heart-embrace', colors: ['#ffe0e8', '#e15f7e'] }),
    '右': Object.freeze({ meaning: 'Bên phải', follow: 'lead-step', attack: 'side-arrow', effect: 'right-arrow', axis: 1, colors: ['#e0fff5', '#3eb590'] }),
    '読': Object.freeze({ meaning: 'Đọc', follow: 'study-flutter', attack: 'book-burst', effect: 'reading-pages', colors: ['#fff1ca', '#a97245'] }),
    '左': Object.freeze({ meaning: 'Bên trái', follow: 'lead-step', attack: 'side-arrow', effect: 'left-arrow', axis: -1, colors: ['#e5e2ff', '#6f69c8'] }),
    '父': Object.freeze({ meaning: 'Cha', follow: 'barrier-guard', attack: 'barrier-crush', effect: 'guardian-shield', colors: ['#fff0c2', '#b77c3f'] }),
    '悪': Object.freeze({ meaning: 'Ác / xấu', follow: 'static-jitter', attack: 'dark-rift', effect: 'dark-cracks', colors: ['#f0d8ff', '#7d35aa'] }),
    '暗': Object.freeze({ meaning: 'Tối', follow: 'moon-drift', attack: 'shadow-lantern', effect: 'dim-lantern', colors: ['#ded9ff', '#53448f'] }),
    '医': Object.freeze({ meaning: 'Y học', follow: 'life-bloom', attack: 'healing-cross', effect: 'healing-cross', colors: ['#d9fff1', '#3eb78b'] }),
    '意': Object.freeze({ meaning: 'Ý / ý niệm', follow: 'question-hover', attack: 'focus-burst', effect: 'thought-focus', colors: ['#fff2b8', '#d19b39'] }),
    '以': Object.freeze({ meaning: 'Bằng / từ', follow: 'lead-step', attack: 'forward-charge', effect: 'forward', colors: ['#e1fff1', '#4cab75'] }),
    '引': Object.freeze({ meaning: 'Kéo / dẫn', follow: 'wind-glide', attack: 'inward-collapse', effect: 'backtrail', colors: ['#e0e8ff', '#6178bb'] }),
    '院': Object.freeze({ meaning: 'Viện', follow: 'barrier-guard', attack: 'healing-cross', effect: 'healing-cross', colors: ['#e0fff2', '#4ba986'] }),
    '員': Object.freeze({ meaning: 'Thành viên', follow: 'friend-sync', attack: 'dual-heart', effect: 'friendship-link', colors: ['#ffe2ea', '#d75f82'] }),
    '運': Object.freeze({ meaning: 'Vận chuyển / may mắn', follow: 'wheel-roll', attack: 'wheel-charge', effect: 'wheel-tracks', colors: ['#dff5ff', '#497fc1'] }),
    '英': Object.freeze({ meaning: 'Anh / tinh hoa', follow: 'gold-shine', attack: 'golden-comet', effect: 'gold-sparkle', colors: ['#fff3ac', '#df9b26'] }),
    '映': Object.freeze({ meaning: 'Chiếu / phản chiếu', follow: 'static-jitter', attack: 'eye-beam', effect: 'scan', colors: ['#e3f7ff', '#4b8fca'] }),
    '遠': Object.freeze({ meaning: 'Xa', follow: 'wind-glide', attack: 'long-lance', effect: 'approach', colors: ['#e3ebff', '#607cc4'] }),
    '屋': Object.freeze({ meaning: 'Nhà / cửa hàng', follow: 'barrier-guard', attack: 'house-crash', effect: 'guardian-shield', colors: ['#ffe5c4', '#a96842'] }),
    '歌': Object.freeze({ meaning: 'Bài hát', follow: 'sound-pulse', attack: 'sonic-wave', effect: 'sound-wave', colors: ['#f1ddff', '#a957cf'] }),
    '夏': Object.freeze({ meaning: 'Mùa hè', follow: 'sun-orbit', attack: 'solar-burst', effect: 'sky-rays', colors: ['#fff2a5', '#ef7735'] }),
    '家': Object.freeze({ meaning: 'Nhà / gia đình', follow: 'friend-sync', attack: 'house-crash', effect: 'heart-embrace', colors: ['#ffe3d0', '#d06b50'] }),
    '画': Object.freeze({ meaning: 'Tranh / họa', follow: 'ink-brush', attack: 'ink-slash', effect: 'ink-strokes', colors: ['#e4f0ff', '#4d658f'] }),
    '海': Object.freeze({ meaning: 'Biển', follow: 'water-float', attack: 'tidal-wave', effect: 'water-ripple', colors: ['#d9fbff', '#258dcf'] }),
    '回': Object.freeze({ meaning: 'Xoay / lần', follow: 'single-orbit', attack: 'orbit-barrage', effect: 'repeat-loop', count: 4, colors: ['#e6e0ff', '#7761c8'] }),
    '開': Object.freeze({ meaning: 'Mở', follow: 'portal-hover', attack: 'portal-open', effect: 'portal', colors: ['#ddf7ff', '#4b74c9'] }),
    '界': Object.freeze({ meaning: 'Thế giới / ranh giới', follow: 'single-orbit', attack: 'world-sphere', effect: 'boundary', colors: ['#dff4ff', '#4779bd'] }),
    '楽': Object.freeze({ meaning: 'Vui / âm nhạc', follow: 'sound-pulse', attack: 'sonic-wave', effect: 'sound-wave', colors: ['#f3dcff', '#b15bd2'] }),
    '館': Object.freeze({ meaning: 'Tòa nhà / quán', follow: 'barrier-guard', attack: 'house-crash', effect: 'guardian-shield', colors: ['#ffe7c7', '#a96e48'] }),
    '漢': Object.freeze({ meaning: 'Hán / Trung Hoa', follow: 'ink-brush', attack: 'ink-slash', effect: 'ink-strokes', colors: ['#e7edf7', '#52617c'] }),
    '寒': Object.freeze({ meaning: 'Lạnh', follow: 'frost-shiver', attack: 'frost-spikes', effect: 'white-shimmer', colors: ['#effcff', '#69b7dc'] }),
    '顔': Object.freeze({ meaning: 'Khuôn mặt', follow: 'question-hover', attack: 'face-mask', effect: 'scan', colors: ['#ffe4ce', '#cd7551'] }),
    '帰': Object.freeze({ meaning: 'Trở về', follow: 'return-sway', attack: 'return-boomerang', effect: 'backtrail', colors: ['#e3e9ff', '#6878bd'] }),
    '起': Object.freeze({ meaning: 'Thức dậy / khởi', follow: 'rise-float', attack: 'rising-uppercut', effect: 'rise', colors: ['#e0fff0', '#48b178'] }),
    '究': Object.freeze({ meaning: 'Nghiên cứu', follow: 'study-flutter', attack: 'focus-burst', effect: 'study', colors: ['#e4efff', '#5979bf'] }),
    '急': Object.freeze({ meaning: 'Gấp', follow: 'static-jitter', attack: 'thunder-strike', effect: 'lightning', colors: ['#fff8bd', '#eb9f2e'] }),
    '牛': Object.freeze({ meaning: 'Bò', follow: 'bull-stomp', attack: 'bull-charge', effect: 'strength-pulse', colors: ['#ffe0bd', '#a85f3f'] }),
    '去': Object.freeze({ meaning: 'Rời đi', follow: 'wind-glide', attack: 'outward-blast', effect: 'outward', colors: ['#ddfff2', '#3ba77e'] }),
    '強': Object.freeze({ meaning: 'Mạnh', follow: 'giant-stomp', attack: 'giant-smash', effect: 'strength-pulse', colors: ['#ffe0b5', '#ce673c'] }),
    '教': Object.freeze({ meaning: 'Dạy', follow: 'study-flutter', attack: 'book-burst', effect: 'study', colors: ['#fff0ca', '#a46f42'] }),
    '京': Object.freeze({ meaning: 'Kinh đô', follow: 'rise-float', attack: 'capital-tower', effect: 'sky-rays', colors: ['#e2f5ff', '#527bb6'] }),
    '業': Object.freeze({ meaning: 'Nghề nghiệp', follow: 'wheel-roll', attack: 'wheel-charge', effect: 'wheel-tracks', colors: ['#e4edff', '#5a70ad'] }),
    '近': Object.freeze({ meaning: 'Gần', follow: 'lead-step', attack: 'forward-charge', effect: 'approach', colors: ['#e1fff1', '#43ae75'] }),
    '銀': Object.freeze({ meaning: 'Bạc', follow: 'gold-shine', attack: 'coin-ring', effect: 'coin-ring', colors: ['#f4fbff', '#91aabd'] }),
    '区': Object.freeze({ meaning: 'Khu vực', follow: 'grid-flicker', attack: 'district-grid', effect: 'boundary', colors: ['#e2efff', '#567bc0'] }),
    '計': Object.freeze({ meaning: 'Tính / đo lường', follow: 'clock-tick', attack: 'clock-stop', effect: 'clock', colors: ['#e3f1ff', '#5579ba'] }),
    '兄': Object.freeze({ meaning: 'Anh trai', follow: 'barrier-guard', attack: 'barrier-crush', effect: 'guardian-shield', colors: ['#ffe6c7', '#b36d45'] }),
    '軽': Object.freeze({ meaning: 'Nhẹ', follow: 'wind-glide', attack: 'wind-cutter', effect: 'breeze', colors: ['#e3fff8', '#4bb99d'] }),
    '犬': Object.freeze({ meaning: 'Chó', follow: 'people-step', attack: 'step-rush', effect: 'steps', colors: ['#ffe5c5', '#b9744d'] }),
    '研': Object.freeze({ meaning: 'Nghiên cứu / mài', follow: 'study-flutter', attack: 'focus-burst', effect: 'study', colors: ['#e3efff', '#5879b9'] }),
    '県': Object.freeze({ meaning: 'Tỉnh / huyện', follow: 'grid-flicker', attack: 'district-grid', effect: 'boundary', colors: ['#e4efff', '#5d78b4'] }),
    '建': Object.freeze({ meaning: 'Xây dựng', follow: 'giant-stomp', attack: 'house-crash', effect: 'grow', colors: ['#ffe4bd', '#ad6841'] }),
    '験': Object.freeze({ meaning: 'Kiểm tra / trải nghiệm', follow: 'static-jitter', attack: 'eye-beam', effect: 'scan', colors: ['#e7f4ff', '#5283bd'] }),
    '元': Object.freeze({ meaning: 'Gốc / nguyên', follow: 'life-bloom', attack: 'life-bloom', effect: 'life', colors: ['#e8ffbd', '#58ad61'] }),
    '工': Object.freeze({ meaning: 'Công / chế tác', follow: 'wheel-roll', attack: 'wheel-charge', effect: 'wheel-tracks', colors: ['#e5edff', '#6175a8'] }),
    '広': Object.freeze({ meaning: 'Rộng', follow: 'wind-glide', attack: 'outward-blast', effect: 'outward', colors: ['#e0fff3', '#43ad82'] }),
    '考': Object.freeze({ meaning: 'Suy nghĩ', follow: 'question-hover', attack: 'focus-burst', effect: 'thought-focus', colors: ['#fff0b8', '#c58d36'] }),
    '光': Object.freeze({ meaning: 'Ánh sáng', follow: 'sun-orbit', attack: 'solar-burst', effect: 'sun-glow', colors: ['#fff8b5', '#efa03c'] }),
    '好': Object.freeze({ meaning: 'Thích', follow: 'friend-sync', attack: 'dual-heart', effect: 'heart-embrace', colors: ['#ffe1e9', '#df6382'] }),
    '合': Object.freeze({ meaning: 'Hợp / ghép', follow: 'friend-sync', attack: 'inward-collapse', effect: 'inward', colors: ['#e1fff2', '#48a97a'] }),
    '黒': Object.freeze({ meaning: 'Đen', follow: 'static-jitter', attack: 'dark-rift', effect: 'dark-cracks', colors: ['#ddd6f4', '#514071'] }),
    '菜': Object.freeze({ meaning: 'Rau', follow: 'life-bloom', attack: 'vine-whip', effect: 'life', colors: ['#e9ffb9', '#55ad55'] }),
    '作': Object.freeze({ meaning: 'Làm / tạo', follow: 'giant-stomp', attack: 'giant-smash', effect: 'strength-pulse', colors: ['#ffe0ba', '#c66b3f'] }),
    '産': Object.freeze({ meaning: 'Sinh / sản xuất', follow: 'life-bloom', attack: 'life-bloom', effect: 'life', colors: ['#e5ffb8', '#4bad61'] }),
    '紙': Object.freeze({ meaning: 'Giấy', follow: 'study-flutter', attack: 'book-burst', effect: 'page-flip', colors: ['#fff1d2', '#ac7b53'] }),
    '思': Object.freeze({ meaning: 'Nghĩ', follow: 'question-hover', attack: 'focus-burst', effect: 'thought-focus', colors: ['#fff0b5', '#c38b35'] }),
    '姉': Object.freeze({ meaning: 'Chị gái', follow: 'friend-sync', attack: 'dual-heart', effect: 'guardian-shield', colors: ['#ffe1eb', '#d76488'] }),
    '止': Object.freeze({ meaning: 'Dừng', follow: 'barrier-guard', attack: 'center-beam', effect: 'center-pulse', colors: ['#ffe3d5', '#c05f50'] }),
    '市': Object.freeze({ meaning: 'Thành phố / chợ', follow: 'rise-float', attack: 'capital-tower', effect: 'sky-rays', colors: ['#e4f2ff', '#597bb3'] }),
    '仕': Object.freeze({ meaning: 'Làm việc', follow: 'wheel-roll', attack: 'wheel-charge', effect: 'wheel-tracks', colors: ['#e4ecff', '#5d73aa'] }),
    '死': Object.freeze({ meaning: 'Chết', follow: 'frost-shiver', attack: 'dark-rift', effect: 'dark-cracks', colors: ['#dfd6ed', '#554064'] }),
    '使': Object.freeze({ meaning: 'Dùng', follow: 'lead-step', attack: 'forward-charge', effect: 'forward', colors: ['#e3fff2', '#49a976'] }),
    '始': Object.freeze({ meaning: 'Bắt đầu', follow: 'sun-orbit', attack: 'sunrise-lance', effect: 'sun-glow', colors: ['#fff3aa', '#e67c3c'] }),
    '試': Object.freeze({ meaning: 'Thử / thi', follow: 'static-jitter', attack: 'eye-beam', effect: 'scan', colors: ['#e3f1ff', '#547eb7'] }),
    '私': Object.freeze({ meaning: 'Tôi / riêng tư', follow: 'question-hover', attack: 'inward-collapse', effect: 'inward', colors: ['#eee1ff', '#7d5eb8'] }),
    '字': Object.freeze({ meaning: 'Chữ', follow: 'ink-brush', attack: 'name-seal', effect: 'ink-strokes', glyph: '字', colors: ['#e6edfa', '#566783'] }),
    '自': Object.freeze({ meaning: 'Tự mình', follow: 'question-hover', attack: 'face-mask', effect: 'scan', colors: ['#e7f4ff', '#4e83bd'] }),
    '事': Object.freeze({ meaning: 'Việc / sự', follow: 'clock-tick', attack: 'clock-stop', effect: 'clock', colors: ['#e5edff', '#6172aa'] }),
    '持': Object.freeze({ meaning: 'Cầm / giữ', follow: 'giant-stomp', attack: 'giant-smash', effect: 'strength-pulse', colors: ['#ffe0b7', '#bd663e'] }),
    '室': Object.freeze({ meaning: 'Phòng', follow: 'barrier-guard', attack: 'house-crash', effect: 'guardian-shield', colors: ['#ffe5c8', '#a86b46'] }),
    '質': Object.freeze({ meaning: 'Chất / chất lượng', follow: 'static-jitter', attack: 'eye-beam', effect: 'scan', colors: ['#e4f1ff', '#577fb5'] }),
    '写': Object.freeze({ meaning: 'Chụp / sao chép', follow: 'sun-orbit', attack: 'eye-beam', effect: 'white-shimmer', colors: ['#f8fdff', '#8abbd2'] }),
    '者': Object.freeze({ meaning: 'Người', follow: 'people-step', attack: 'twin-strike', effect: 'steps', colors: ['#ffe4cc', '#bd7451'] }),
    '借': Object.freeze({ meaning: 'Mượn', follow: 'return-sway', attack: 'return-boomerang', effect: 'repeat-loop', colors: ['#e9e1ff', '#7662b7'] }),
    '弱': Object.freeze({ meaning: 'Yếu', follow: 'frost-shiver', attack: 'shadow-lantern', effect: 'dark-cracks', colors: ['#e6daf2', '#765486'] }),
    '首': Object.freeze({ meaning: 'Cổ / đầu', follow: 'barrier-guard', attack: 'face-mask', effect: 'center-pulse', colors: ['#ffe2ca', '#bb704d'] }),
    '主': Object.freeze({ meaning: 'Chính / chủ', follow: 'gold-shine', attack: 'golden-comet', effect: 'gold-sparkle', colors: ['#fff2ad', '#d99a2e'] }),
    '秋': Object.freeze({ meaning: 'Mùa thu', follow: 'tree-sway', attack: 'dream-leaf', effect: 'leaf-fall', colors: ['#ffe3a9', '#c76d38'] }),
    '集': Object.freeze({ meaning: 'Tập hợp', follow: 'friend-sync', attack: 'inward-collapse', effect: 'inward', colors: ['#e2fff2', '#4aaa78'] }),
    '習': Object.freeze({ meaning: 'Học / luyện tập', follow: 'study-flutter', attack: 'book-burst', effect: 'study', colors: ['#e5f0ff', '#5779b7'] }),
    '終': Object.freeze({ meaning: 'Kết thúc', follow: 'moon-drift', attack: 'sunset-blade', effect: 'sunset-drift', colors: ['#ffe0c7', '#bf5e69'] }),
    '住': Object.freeze({ meaning: 'Sống / cư trú', follow: 'barrier-guard', attack: 'house-crash', effect: 'guardian-shield', colors: ['#ffe5c5', '#a96845'] }),
    '重': Object.freeze({ meaning: 'Nặng / quan trọng', follow: 'sink-step', attack: 'meteor-drop', effect: 'sink', colors: ['#e1e6ee', '#606877'] }),
    '春': Object.freeze({ meaning: 'Mùa xuân', follow: 'life-bloom', attack: 'season-wheel', effect: 'seasons', colors: ['#ffe0e9', '#e66e8b'] }),
    '所': Object.freeze({ meaning: 'Nơi / chỗ', follow: 'grid-flicker', attack: 'district-grid', effect: 'boundary', colors: ['#e4efff', '#5978af'] }),
    '暑': Object.freeze({ meaning: 'Nóng', follow: 'sun-orbit', attack: 'noon-beam', effect: 'sun-glow', colors: ['#fff2a6', '#ed6f34'] }),
    '場': Object.freeze({ meaning: 'Sân / nơi', follow: 'grid-flicker', attack: 'district-grid', effect: 'boundary', colors: ['#e5efff', '#5d79ae'] }),
    '乗': Object.freeze({ meaning: 'Lên / đi xe', follow: 'wheel-roll', attack: 'forward-charge', effect: 'forward', colors: ['#e1fff2', '#47a979'] }),
    '色': Object.freeze({ meaning: 'Màu sắc', follow: 'star-drift', attack: 'star-barrage', effect: 'many-sparkles', count: 12, colors: ['#ffd8ea', '#647de0'] }),
    '森': Object.freeze({ meaning: 'Rừng', follow: 'tree-sway', attack: 'vine-whip', effect: 'rest-leaves', colors: ['#e1ffb5', '#3f9d4c'] }),
    '心': Object.freeze({ meaning: 'Tim / tâm trí', follow: 'friend-sync', attack: 'dual-heart', effect: 'heart-embrace', colors: ['#ffe0e8', '#df5d7a'] }),
    '親': Object.freeze({ meaning: 'Cha mẹ / thân thiết', follow: 'friend-sync', attack: 'dual-heart', effect: 'guardian-shield', colors: ['#ffe3d8', '#d27359'] }),
    '真': Object.freeze({ meaning: 'Thật / chân', follow: 'sun-orbit', attack: 'focus-burst', effect: 'white-shimmer', colors: ['#f8fdff', '#7eb2cb'] }),
    '進': Object.freeze({ meaning: 'Tiến tới', follow: 'lead-step', attack: 'forward-charge', effect: 'forward', colors: ['#e0fff1', '#40ae73'] }),
    '図': Object.freeze({ meaning: 'Sơ đồ / bản đồ', follow: 'grid-flicker', attack: 'district-grid', effect: 'scan', colors: ['#e4f1ff', '#527db7'] }),
    '青': Object.freeze({ meaning: 'Xanh', follow: 'water-float', attack: 'tidal-wave', effect: 'water-ripple', colors: ['#d9faff', '#2d91cb'] }),
    '正': Object.freeze({ meaning: 'Đúng / chính', follow: 'cross-pulse', attack: 'cross-flare', effect: 'scan', colors: ['#f1fbff', '#5a98bd'] }),
    '声': Object.freeze({ meaning: 'Giọng / tiếng', follow: 'sound-pulse', attack: 'sonic-wave', effect: 'sound-wave', colors: ['#f0ddff', '#a958cc'] }),
    '世': Object.freeze({ meaning: 'Thế giới / đời', follow: 'star-drift', attack: 'world-sphere', effect: 'myriad-stars', count: 12, colors: ['#e2edff', '#5b6ec0'] }),
    '赤': Object.freeze({ meaning: 'Đỏ', follow: 'ember-hop', attack: 'flame-dash', effect: 'fire-embers', colors: ['#ffd8bd', '#df3e32'] }),
    '夕': Object.freeze({ meaning: 'Buổi tối', follow: 'moon-drift', attack: 'sunset-blade', effect: 'sunset-drift', colors: ['#ffe0cf', '#b75d79'] }),
    '切': Object.freeze({ meaning: 'Cắt', follow: 'friend-sync', attack: 'split-blade', effect: 'split', colors: ['#ffe2da', '#ca6250'] }),
    '説': Object.freeze({ meaning: 'Giải thích', follow: 'speech-bob', attack: 'word-cannon', effect: 'speech-bubbles', colors: ['#fff0b4', '#d89535'] }),
    '洗': Object.freeze({ meaning: 'Rửa', follow: 'water-float', attack: 'tidal-wave', effect: 'water-ripple', colors: ['#dafbff', '#3296cb'] }),
    '早': Object.freeze({ meaning: 'Sớm / nhanh', follow: 'sun-orbit', attack: 'sunrise-lance', effect: 'sunrise', colors: ['#fff2a4', '#e87838'] }),
    '走': Object.freeze({ meaning: 'Chạy', follow: 'people-step', attack: 'step-rush', effect: 'steps', colors: ['#e0fff0', '#46aa69'] }),
    '送': Object.freeze({ meaning: 'Gửi / tiễn', follow: 'lead-step', attack: 'forward-charge', effect: 'forward', colors: ['#e1fff3', '#48a97b'] }),
    '族': Object.freeze({ meaning: 'Gia tộc / nhóm', follow: 'friend-sync', attack: 'twin-strike', effect: 'people-pair', colors: ['#ffe3d2', '#c87354'] }),
    '村': Object.freeze({ meaning: 'Làng', follow: 'life-bloom', attack: 'house-crash', effect: 'life', colors: ['#e5ffbd', '#5ba454'] }),
    '体': Object.freeze({ meaning: 'Cơ thể', follow: 'giant-stomp', attack: 'giant-smash', effect: 'strength-pulse', colors: ['#ffe1bd', '#c36b44'] }),
    '太': Object.freeze({ meaning: 'To / dày', follow: 'giant-stomp', attack: 'outward-blast', effect: 'outward', colors: ['#ffe1b8', '#c5683d'] }),
    '待': Object.freeze({ meaning: 'Chờ / đợi', follow: 'clock-tick', attack: 'clock-stop', effect: 'clock', colors: ['#e6ecff', '#6572ab'] }),
    '貸': Object.freeze({ meaning: 'Cho mượn', follow: 'return-sway', attack: 'outward-blast', effect: 'outward', colors: ['#e2fff1', '#48a777'] }),
    '台': Object.freeze({ meaning: 'Bệ / đài', follow: 'rise-float', attack: 'rising-uppercut', effect: 'rise', colors: ['#e4f5ff', '#5681ba'] }),
    '代': Object.freeze({ meaning: 'Thay thế / đời', follow: 'return-sway', attack: 'return-boomerang', effect: 'repeat-loop', colors: ['#e8e0ff', '#7761b8'] }),
    '題': Object.freeze({ meaning: 'Đề tài / câu hỏi', follow: 'question-hover', attack: 'question-burst', effect: 'question-orbit', colors: ['#eee0ff', '#8659bf'] }),
    '短': Object.freeze({ meaning: 'Ngắn', follow: 'tiny-dart', attack: 'needle-barrage', effect: 'tiny', colors: ['#ffe5c8', '#d1874c'] }),
    '知': Object.freeze({ meaning: 'Biết', follow: 'question-hover', attack: 'focus-burst', effect: 'thought-focus', colors: ['#fff0b5', '#c68e36'] }),
    '地': Object.freeze({ meaning: 'Đất', follow: 'earth-stomp', attack: 'earth-spike', effect: 'earth-crumble', colors: ['#ffe0ad', '#95603b'] }),
    '池': Object.freeze({ meaning: 'Ao / hồ', follow: 'water-float', attack: 'tidal-wave', effect: 'water-ripple', colors: ['#d9fbff', '#3191c6'] }),
    '茶': Object.freeze({ meaning: 'Trà', follow: 'steam-hop', attack: 'steam-bite', effect: 'steam-aroma', colors: ['#edffc2', '#759d45'] }),
    '着': Object.freeze({ meaning: 'Mặc / đến nơi', follow: 'barrier-guard', attack: 'barrier-crush', effect: 'guardian-shield', colors: ['#ffe4ce', '#af714e'] }),
    '昼': Object.freeze({ meaning: 'Ban trưa', follow: 'sun-orbit', attack: 'noon-beam', effect: 'noon-ray', colors: ['#fff3a4', '#ed7934'] }),
    '注': Object.freeze({ meaning: 'Chú ý / rót', follow: 'water-float', attack: 'focus-burst', effect: 'water-ripple', colors: ['#dcfbff', '#318ec3'] }),
    '町': Object.freeze({ meaning: 'Phố / thị trấn', follow: 'grid-flicker', attack: 'district-grid', effect: 'boundary', colors: ['#e5efff', '#5b78ad'] }),
    '鳥': Object.freeze({ meaning: 'Chim', follow: 'wind-glide', attack: 'wind-cutter', effect: 'breeze', colors: ['#e2fff8', '#49af98'] }),
    '朝': Object.freeze({ meaning: 'Buổi sáng', follow: 'sun-orbit', attack: 'sunrise-lance', effect: 'sunrise', colors: ['#fff2a6', '#e77b38'] }),
    '通': Object.freeze({ meaning: 'Đi qua / thông', follow: 'lead-step', attack: 'portal-open', effect: 'forward', colors: ['#e0fff1', '#43aa73'] }),
    '弟': Object.freeze({ meaning: 'Em trai', follow: 'child-bounce', attack: 'child-spring', effect: 'child-bounce', colors: ['#ffe7c8', '#cf7a50'] }),
    '低': Object.freeze({ meaning: 'Thấp', follow: 'sink-step', attack: 'meteor-drop', effect: 'sink', colors: ['#e2e8f0', '#687182'] }),
    '転': Object.freeze({ meaning: 'Chuyển / ngã', follow: 'wheel-roll', attack: 'wheel-charge', effect: 'wheel-tracks', colors: ['#e4ebff', '#5f72aa'] }),
    '田': Object.freeze({ meaning: 'Ruộng', follow: 'life-bloom', attack: 'hundred-grid', effect: 'life', colors: ['#e8ffb9', '#65a84d'] }),
    '都': Object.freeze({ meaning: 'Thủ đô', follow: 'rise-float', attack: 'capital-tower', effect: 'sky-rays', colors: ['#e3f3ff', '#587bb2'] }),
    '度': Object.freeze({ meaning: 'Mức độ / lần', follow: 'clock-tick', attack: 'focus-burst', effect: 'scan', colors: ['#e5f1ff', '#577eb5'] }),
    '答': Object.freeze({ meaning: 'Trả lời', follow: 'gold-shine', attack: 'word-cannon', effect: 'gold-sparkle', colors: ['#fff2ad', '#d8992d'] }),
  });
  const EFFECT_ATTACK_FALLBACKS = Object.freeze({
    'fire-embers': 'flame-dash', 'water-ripple': 'tidal-wave', 'river-flow': 'river-rush', bubbles: 'bubble-torpedo',
    lightning: 'thunder-strike', breeze: 'wind-cutter', 'leaf-fall': 'vine-whip', life: 'life-bloom',
    'sun-glow': 'solar-burst', sunrise: 'solar-burst', 'noon-ray': 'solar-burst', 'moon-glow': 'moon-blade',
    peaks: 'mountain-crash', 'earth-crumble': 'earth-spike', 'gold-sparkle': 'golden-comet', 'coin-ring': 'golden-comet',
    'rain-drops': 'rain-storm', 'sound-wave': 'sonic-wave', 'speech-bubbles': 'word-cannon', 'word-sparks': 'word-cannon',
    'ink-strokes': 'ink-slash', 'page-flip': 'book-burst', 'reading-pages': 'book-burst', study: 'book-burst',
    'wheel-tracks': 'wheel-charge', clock: 'clock-stop', rise: 'rising-uppercut', height: 'rising-uppercut',
    sink: 'meteor-drop', grow: 'giant-smash', tiny: 'needle-barrage', boundary: 'barrier-crush',
    'guardian-shield': 'barrier-crush', 'friendship-link': 'dual-heart', 'heart-embrace': 'dual-heart',
    'rest-leaves': 'dream-leaf', 'people-pair': 'twin-strike', 'steam-aroma': 'steam-bite',
    forward: 'forward-charge', approach: 'forward-charge', backtrail: 'backstab', inward: 'inward-collapse', outward: 'outward-blast',
    split: 'split-blade', 'half-split': 'split-blade', steps: 'step-rush', 'strength-pulse': 'giant-smash',
  });
  function semanticEffectColors(effect = '') {
    if (/fire|sun|gold|noon|sunrise/.test(effect)) return ['#fff3a0', '#f08a32'];
    if (/water|river|bubble|rain/.test(effect)) return ['#dcfbff', '#288fd4'];
    if (/life|leaf|rest|steam/.test(effect)) return ['#e6ffad', '#4eaf5b'];
    if (/dark|dim|moon|thought|question/.test(effect)) return ['#eadfff', '#795ac7'];
    if (/earth|peak|strength|grow/.test(effect)) return ['#ffe0ad', '#9b6038'];
    return ['#e3f7ff', '#5b91cf'];
  }
  function kanjiAnimation(monster) {
    if (!monster) return null;
    const authored = KANJI_ANIMATIONS[monster.kanji];
    if (authored) return authored;
    const effect = monster.effect || 'spirit';
    const orbit = /^orbit-(\d+)$/.exec(effect);
    return { meaning: monster.name || monster.kanji, follow: 'aura-drift',
      attack: orbit ? 'orbit-barrage' : (EFFECT_ATTACK_FALLBACKS[effect] || 'spirit-burst'),
      effect, count: orbit ? Number(orbit[1]) : 0, colors: semanticEffectColors(effect), inherited: true };
  }
  function followerMeaningMotion(monster, moving = false, now = performance.now()) {
    const animation = kanjiAnimation(monster), t = now / 1000;
    const motion = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
    if (!animation) return motion;
    if (animation.follow === 'ember-hop') {
      const flame = Math.abs(Math.sin(t * (moving ? 8.8 : 5.4)));
      motion.y = -flame * (moving ? 3.2 : 1.8); motion.rotation = Math.sin(t * 7.2) * .035;
      motion.scaleX = 1 + flame * .035; motion.scaleY = 1 - flame * .025;
    } else if (animation.follow === 'water-float') {
      motion.y = Math.sin(t * 2.7) * 2.4; motion.x = Math.sin(t * 1.35) * 1.2;
      motion.rotation = Math.sin(t * 2.1) * .025; motion.scaleX = 1 + Math.sin(t * 2.7) * .025;
      motion.scaleY = 1 - Math.sin(t * 2.7) * .018;
    } else if (animation.follow === 'tree-sway') {
      motion.rotation = Math.sin(t * (moving ? 5.2 : 2.25)) * (moving ? .045 : .026);
      motion.y = moving ? -Math.abs(Math.sin(t * 5.2)) * 1.2 : 0;
    } else if (animation.follow === 'static-jitter') {
      const spark = Math.sin(t * 25);
      motion.x = spark > .45 ? 1.4 : spark < -.45 ? -1.4 : 0;
      motion.y = Math.cos(t * 19) > .72 ? -1 : 0; motion.rotation = spark * .018;
    } else if (animation.follow === 'wind-glide') {
      motion.x = Math.sin(t * 2.4) * (moving ? 2.8 : 1.8); motion.y = Math.cos(t * 3.1) * 1.6;
      motion.rotation = Math.sin(t * 2.4) * .04;
    } else if (animation.follow === 'sun-orbit') {
      motion.y = -1.2 - Math.abs(Math.sin(t * 3.2)) * 1.8; motion.rotation = Math.sin(t * 2.4) * .025;
      motion.scaleX = motion.scaleY = 1 + Math.max(0, Math.sin(t * 3.2)) * .045;
    } else if (animation.follow === 'moon-drift') {
      motion.x = Math.sin(t * 1.55) * 2.1; motion.y = Math.cos(t * 1.8) * 2.5; motion.rotation = Math.sin(t * 1.4) * .055;
    } else if (animation.follow === 'peak-stomp' || animation.follow === 'earth-stomp') {
      const stomp = Math.abs(Math.sin(t * (moving ? 6.5 : 3.4)));
      motion.y = -stomp * (moving ? 2.6 : .8); motion.scaleX = 1 + stomp * .05; motion.scaleY = 1 - stomp * .04;
    } else if (animation.follow === 'river-flow') {
      motion.x = Math.sin(t * 2.8) * 2.4; motion.y = Math.sin(t * 5.6) * .9; motion.rotation = Math.sin(t * 2.8) * .035;
    } else if (animation.follow === 'gold-shine') {
      const shine = Math.max(0, Math.sin(t * 4.6)); motion.y = -shine * 1.7; motion.scaleX = motion.scaleY = 1 + shine * .06;
    } else if (animation.follow === 'rain-bounce') {
      motion.y = -Math.abs(Math.sin(t * 4.2)) * 2.4; motion.rotation = Math.sin(t * 3.1) * .032;
    } else if (animation.follow === 'bubble-swim') {
      motion.x = Math.sin(t * 3.4) * 2.6; motion.y = Math.cos(t * 2.5) * 2.1; motion.rotation = Math.sin(t * 3.4) * .065;
    } else if (animation.follow === 'sound-pulse') {
      const beat = Math.max(0, Math.sin(t * 6.4)); motion.y = -beat * 2; motion.scaleX = 1 + beat * .07; motion.scaleY = 1 - beat * .045;
    } else if (animation.follow === 'life-bloom') {
      motion.y = Math.sin(t * 2.15) * 1.5; motion.rotation = Math.sin(t * 1.75) * .025;
      motion.scaleX = motion.scaleY = 1 + Math.max(0, Math.sin(t * 2.15)) * .035;
    } else if (animation.follow === 'single-orbit') {
      motion.x = Math.sin(t * 3.2) * 1.5; motion.y = Math.cos(t * 3.2) * 1.2; motion.rotation = Math.sin(t * 2.4) * .025;
    } else if (animation.follow === 'people-step') {
      motion.x = Math.sin(t * 5.5) * (moving ? 1.8 : .7); motion.y = -Math.abs(Math.sin(t * 5.5)) * (moving ? 2.3 : .8);
    } else if (animation.follow === 'study-flutter' || animation.follow === 'speech-bob') {
      motion.y = Math.sin(t * 2.8) * 1.8; motion.rotation = Math.sin(t * 3.6) * .035;
    } else if (animation.follow === 'wheel-roll') {
      motion.x = Math.sin(t * 6.4) * (moving ? 2.5 : .8); motion.y = -Math.abs(Math.sin(t * 6.4)) * 1.2;
      motion.rotation = Math.sin(t * 6.4) * .065;
    } else if (animation.follow === 'steam-hop') {
      motion.y = -Math.abs(Math.sin(t * 3.8)) * 2.2; motion.scaleY = 1 + Math.max(0, Math.sin(t * 3.8)) * .045;
    } else if (animation.follow === 'ink-brush') {
      motion.x = Math.sin(t * 2.7) * 1.7; motion.rotation = Math.sin(t * 2.7) * .07;
    } else if (animation.follow === 'clock-tick') {
      motion.rotation = Math.sin(t * 4.8) > 0 ? .028 : -.028; motion.y = Math.sin(t * 2.4) * .8;
    } else if (animation.follow === 'rise-float') {
      motion.y = -2 - Math.abs(Math.sin(t * 2.7)) * 2.3; motion.scaleY = 1 + Math.max(0, Math.sin(t * 2.7)) * .04;
    } else if (animation.follow === 'sink-step') {
      motion.y = Math.abs(Math.sin(t * 3.2)) * 1.7; motion.scaleY = 1 - Math.max(0, Math.sin(t * 3.2)) * .035;
    } else if (animation.follow === 'giant-stomp') {
      const stomp = Math.abs(Math.sin(t * (moving ? 5.8 : 3.1))); motion.y = -stomp * 2.2;
      motion.scaleX = 1 + stomp * .08; motion.scaleY = 1 - stomp * .055;
    } else if (animation.follow === 'tiny-dart') {
      motion.x = Math.sin(t * 8.2) * (moving ? 2.8 : 1.2); motion.y = Math.cos(t * 6.7) * 1.1;
    } else if (animation.follow === 'barrier-guard') {
      motion.y = Math.sin(t * 2.1) * .8; motion.scaleX = 1 + Math.max(0, Math.sin(t * 2.1)) * .025;
    } else if (animation.follow === 'friend-sync') {
      motion.x = Math.sin(t * 2.9) * 1.8; motion.y = -Math.abs(Math.sin(t * 2.9)) * 1.6; motion.rotation = Math.sin(t * 2.9) * .03;
    } else if (animation.follow === 'rest-doze') {
      motion.y = Math.sin(t * 1.35) * .7; motion.rotation = Math.sin(t * 1.1) * .018;
      motion.scaleY = 1 - Math.max(0, Math.sin(t * 1.35)) * .025;
    } else if (animation.follow === 'cross-pulse' || animation.follow === 'grid-flicker') {
      const pulse = Math.max(0, Math.sin(t * (animation.follow === 'cross-pulse' ? 4.8 : 7.2)));
      motion.y = -pulse * 1.4; motion.scaleX = 1 + pulse * .055; motion.scaleY = 1 + pulse * .055;
    } else if (animation.follow === 'child-bounce') {
      const bounce = Math.abs(Math.sin(t * (moving ? 7.4 : 4.2)));
      motion.y = -bounce * (moving ? 3.5 : 2.2); motion.rotation = Math.sin(t * 4.2) * .045;
      motion.scaleX = 1 + bounce * .05; motion.scaleY = 1 - bounce * .04;
    } else if (animation.follow === 'lead-step') {
      motion.x = Math.max(0, Math.sin(t * 4.8)) * (moving ? 2.7 : 1.3); motion.y = -Math.abs(Math.sin(t * 4.8)) * 1.7;
    } else if (animation.follow === 'grace-step') {
      motion.x = Math.sin(t * 2.7) * 2; motion.y = -Math.abs(Math.sin(t * 2.7)) * 1.5; motion.rotation = Math.sin(t * 2.7) * .055;
    } else if (animation.follow === 'compass-hover') {
      motion.y = Math.sin(t * 2.1) * 1.4; motion.rotation = Math.sin(t * 3.4) * .022;
    } else if (animation.follow === 'name-bob') {
      motion.y = Math.sin(t * 3) * 1.6; motion.rotation = Math.sin(t * 6) * .025;
    } else if (animation.follow === 'star-drift') {
      motion.x = Math.sin(t * 2.2) * 1.8; motion.y = Math.cos(t * 2.8) * 2; motion.scaleX = motion.scaleY = 1 + Math.max(0, Math.sin(t * 4.4)) * .04;
    } else if (animation.follow === 'question-hover') {
      motion.y = Math.sin(t * 2.5) * 2.2; motion.rotation = Math.sin(t * 1.8) * .075;
    } else if (animation.follow === 'portal-hover') {
      motion.x = Math.sin(t * 2.3) * 1.5; motion.y = Math.cos(t * 2.3) * 1.5; motion.scaleX = 1 + Math.sin(t * 4.6) * .04;
    } else if (animation.follow === 'frost-shiver') {
      motion.x = Math.sin(t * 18) * (moving ? 1.5 : .9); motion.y = -Math.abs(Math.sin(t * 4)) * .9; motion.rotation = Math.sin(t * 18) * .012;
    } else if (animation.follow === 'return-sway') {
      motion.x = Math.sin(t * 3.2) * 2.4; motion.y = -Math.abs(Math.sin(t * 3.2)) * 1.3; motion.rotation = -Math.sin(t * 3.2) * .05;
    } else if (animation.follow === 'bull-stomp') {
      const stomp = Math.abs(Math.sin(t * (moving ? 7 : 3.8))); motion.x = Math.sin(t * 3.5) * .7; motion.y = -stomp * 2;
      motion.scaleX = 1 + stomp * .065; motion.scaleY = 1 - stomp * .045;
    } else if (animation.follow === 'aura-drift') {
      motion.x = Math.sin(t * 2.15) * (moving ? 1.6 : .8); motion.y = Math.cos(t * 2.45) * 1.1;
      motion.rotation = Math.sin(t * 1.9) * .018;
    }
    return motion;
  }
  // Trail lưu theo quãng đường, không theo số frame. Nhờ vậy khoảng cách pet
  // không đổi khi FPS thấp hoặc khi người chơi chạy nhanh bằng Shift.
  const trail = [];
  function behindPlayerPosition() {
    const offset = { down: [0, -1], up: [0, 1], left: [1, 0], right: [-1, 0] }[player.facing] || [0, -1];
    return { px: player.px + offset[0] * TILE, py: player.py + offset[1] * TILE };
  }
  function resetPetTrail() {
    const behind = behindPlayerPosition();
    trail.length = 0;
    trail.push(behind, { px: player.px, py: player.py });
  }
  function recordPlayerTrail(force = false) {
    const point = { px: player.px, py: player.py }, lastPoint = trail[trail.length - 1];
    if (!lastPoint) { resetPetTrail(); return; }
    const distance = Math.hypot(point.px - lastPoint.px, point.py - lastPoint.py);
    if (distance < 0.001) return;
    if (!force && distance < (C.PET.trailStep || 2)) return;
    if (distance > TILE * 2.5) { resetPetTrail(); return; } // teleport / lên xuống thuyền
    trail.push(point);
    const keepDistance = (C.PET.followDistance || TILE * 1.35) + TILE * 2;
    let accumulated = 0;
    for (let i = trail.length - 1; i > 0; i--) {
      accumulated += Math.hypot(trail[i].px - trail[i - 1].px, trail[i].py - trail[i - 1].py);
      if (accumulated > keepDistance) { trail.splice(0, Math.max(0, i - 1)); break; }
    }
  }
  function petFollowPosition(distance = C.PET.followDistance || TILE * 1.35) {
    if (trail.length < 2) return behindPlayerPosition();
    let remaining = Math.max(TILE, distance);
    for (let i = trail.length - 1; i > 0; i--) {
      const newer = trail[i], older = trail[i - 1];
      const segment = Math.hypot(newer.px - older.px, newer.py - older.py);
      if (segment <= 0) continue;
      if (remaining <= segment) {
        const ratio = remaining / segment;
        return { px: newer.px + (older.px - newer.px) * ratio, py: newer.py + (older.py - newer.py) * ratio };
      }
      remaining -= segment;
    }
    return { ...trail[0] };
  }
  resetPetTrail();
  let currentPetId = C.PET.monId;
  let bicycleActive = false;
  let autoRideActive = false;
  let autoRidePath = [];
  let radarTarget = 'balanced';
  // petData[monId] = {evolveStage}. Có mặt = đã thu thập; level/MP nằm ở mastery[kanji].
  const petData = {};
  function followerUnlocked() {
    const profile = activeCharacterProfile();
    return (!profile || profile.onboardingComplete === true) && !!petData[currentPetId] && !!C.MONSTERS[currentPetId];
  }
  function saveGame() {
    try { localStorage.setItem(GAME_KEY, JSON.stringify({ petData, currentPetId, bicycleActive, autoRideActive, radarTarget })); } catch (e) { /* file:// có thể khóa storage */ }
  }
  function loadGame() {
    try {
      const saved = JSON.parse(localStorage.getItem(GAME_KEY) || 'null');
      if (saved && saved.petData && typeof saved.petData === 'object') {
        for (const [id, raw] of Object.entries(saved.petData)) if (C.MONSTERS[id]) {
          const data = raw && typeof raw === 'object' ? raw : {};
          if (Number.isFinite(Number(data.level)) || Number.isFinite(Number(data.exp))) {
            legacyPetProgress[id] = { level: Math.max(1, Number(data.level) || 1), exp: Math.max(0, Number(data.exp) || 0) };
          }
          petData[id] = { evolveStage: Math.max(0, Number(data.evolveStage) || 0) };
        }
        if (C.MONSTERS[saved.currentPetId]) {
          const savedMonster = C.MONSTERS[saved.currentPetId];
          // Một số save cũ lưu currentPetId sau khi chọn trong Dex nhưng thiếu
          // petData. Nếu mastery xác nhận đã thu phục thì khôi phục kho pet luôn.
          if (!petData[saved.currentPetId] && ensureMastery(savedMonster.kanji).captured) {
            petData[saved.currentPetId] = { evolveStage: 0 };
          }
          if (petData[saved.currentPetId]) currentPetId = saved.currentPetId;
        }
        bicycleActive = saved.bicycleActive === true;
        autoRideActive = saved.autoRideActive === true;
        const radarTargets = (C.RADAR && C.RADAR.targets) || ['balanced', 'due', 'weak', 'pet'];
        if (radarTargets.includes(saved.radarTarget)) radarTarget = saved.radarTarget;
      }
    } catch (e) { /* fallback giữ state mặc định */ }
  }
  window.KanjiGOCharacters?.setBeforeSwitch?.(() => {
    if (state === 'battle' || state === 'capture' || state === 'pve') return false;
    flushLearningSave(); saveGame(); return true;
  });
  addEventListener('pagehide', flushLearningSave);
  // Save cũ và SANDBOX giữ mascot mặc định. Một nhân vật mới phải tự học và
  // thu phục Kanji đầu tiên; tuyệt đối không seed pet trước onboarding.
  if (shouldSeedLegacyStarter()) petData[currentPetId] = { evolveStage: 0 };
  loadGame();
  if (!bicycleAvailable()) bicycleActive = false;
  if (!autoRideAvailable()) autoRideActive = false;
  if (autoRideActive) bicycleActive = true;
  function migrateLegacyPetProgress() {
    for (const [id, old] of Object.entries(legacyPetProgress)) {
      const info = C.MONSTERS[id]; if (!info) continue;
      const s = ensureMastery(info.kanji);
      if (!legacyMasteryKeys.has(info.kanji) && s.mp > 0) continue;
      const oldLevel = Math.max(1, Math.min(C.LEGACY_LEVEL.maxLevel, old.level));
      const floor = mpFloorOfLevel(Math.min(C.KLEVEL.maxLevel, oldLevel));
      const next = oldLevel >= C.KLEVEL.maxLevel ? floor : mpFloorOfLevel(Math.min(C.KLEVEL.maxLevel, oldLevel + 1));
      const oldNeed = Math.max(1, oldLevel * C.LEGACY_LEVEL.expPerLevel);
      const progress = Math.max(0, Math.min(1, old.exp / oldNeed));
      s.mp = Math.max(s.mp, Math.round(floor + (next - floor) * progress));
      s.level = levelFromMp(s.mp);
    }
  }
  migrateLegacyPetProgress();
  // Pet/level thử nghiệm chỉ thuộc profile SANDBOX; hành trình mới bắt đầu sạch.
  for (const seed of isSandboxCharacter() ? (C.INITIAL_PETS || []) : []) {
    const id = seed && seed.monId, info = C.MONSTERS[id];
    if (!info) continue;
    if (!petData[id]) petData[id] = { evolveStage: 0 };
    const s = ensureMastery(info.kanji);
    const level = Math.max(1, Math.min(C.KLEVEL.maxLevel, Number(seed.level) || 1));
    s.mp = Math.max(s.mp, mpFloorOfLevel(level));
    s.level = levelFromMp(s.mp);
    s.captured = true;
    s.lectured = true;
  }
  // TEMP QA Skill Tree: dùng chính mastery và KP milestone thật thay vì bơm
  // currency giả, nhờ vậy toàn bộ luồng unlock vẫn được test đúng như gameplay.
  function applySkillTreeQaSeed() {
    const sandbox = isSandboxCharacter();
    const seed = sandbox ? C.SANDBOX_QA : (C.SKILL_TREE && C.SKILL_TREE.qaSeed);
    if (!seed || seed.enabled !== true || (!sandbox && seed.allowStandardQa !== true)) return 0;
    const targetCount = Math.max(0, Math.floor(Number(seed.capturedKanji) || 0));
    const targetLevel = Math.max(1, Math.min(C.KLEVEL.maxLevel, Math.floor(Number(seed.level) || 1)));
    const levelBands = Array.isArray(seed.levelBands) && seed.levelBands.length
      ? seed.levelBands.map((level) => Math.max(1, Math.min(C.KLEVEL.maxLevel, Math.floor(Number(level) || 1)))) : [targetLevel];
    const ordered = [], seen = new Set();
    for (const tierId of (C.PROGRESSION && C.PROGRESSION.order) || []) {
      const tier = (CATALOG.tiers || {})[tierId];
      for (const char of (tier && tier.kanji) || []) if (kanjiInfo(char) && !seen.has(char)) { seen.add(char); ordered.push(char); }
    }
    for (const info of Object.values(KDB.KANJI)) if (!seen.has(info.char)) { seen.add(info.char); ordered.push(info.char); }
    const tierCounts = sandbox && seed.tierCounts && typeof seed.tierCounts === 'object' ? seed.tierCounts : null;
    const selected = [];
    if (tierCounts) {
      const selectedSet = new Set();
      for (const [tierId, rawCount] of Object.entries(tierCounts)) {
        const count = Math.max(0, Math.floor(Number(rawCount) || 0));
        const tierChars = ordered.filter((char) => tierOfKanji(char) === String(tierId).toUpperCase()).slice(0, count);
        for (const char of tierChars) if (!selectedSet.has(char)) { selectedSet.add(char); selected.push(char); }
      }
      for (const char of ordered) {
        if (selected.length >= targetCount) break;
        if (!selectedSet.has(char)) { selectedSet.add(char); selected.push(char); }
      }
    } else selected.push(...ordered.slice(0, targetCount));
    // SANDBOX đã có thể sở hữu pet khởi tạo (hiện là 魚). Tính các chữ đó
    // vào target thay vì cộng thêm sau seed để `capturedKanji: 200` luôn là
    // đúng 200, đồng thời 20 chữ cuối curriculum vẫn còn khóa để test unlock.
    const existingCaptured = sandbox
      ? Object.values(KDB.KANJI).map((info) => info.char).filter((char) => ensureMastery(char).captured)
      : [];
    const seededKanji = [...new Set([...existingCaptured, ...selected.slice(0, targetCount)])].slice(0, targetCount);
    for (const [index, char] of seededKanji.entries()) {
      const mastery = ensureMastery(char);
      const seededLevel = levelBands[index % levelBands.length];
      mastery.mp = Math.max(mastery.mp, mpFloorOfLevel(seededLevel));
      mastery.level = levelFromMp(mastery.mp);
      mastery.captured = true;
      mastery.lectured = true;
    }
    if (sandbox) for (const badge of seed.badges || []) learning.badges[String(badge).toUpperCase()] = true;
    return seededKanji.length;
  }
  applySkillTreeQaSeed();
  // Save cũ có pet thì xem như chữ tương ứng đã thu phục.
  for (const id of Object.keys(petData)) {
    if (C.MONSTERS[id]) ensureMastery(C.MONSTERS[id].kanji).captured = true;
  }
  // Chiều ngược lại cũng phải đúng: `captured` là nguồn dữ liệu học tập cũ,
  // còn follower kiểm tra petData. Đồng bộ hai phía để mascot từ save migrate
  // hoặc QA seed đều có thể được chọn và đi theo bình thường.
  for (const info of Object.values(KDB.KANJI)) {
    if (info && C.MONSTERS[info.monId] && ensureMastery(info.char).captured && !petData[info.monId]) {
      petData[info.monId] = { evolveStage: 0 };
    }
  }
  evaluateAllKpMilestones({ migrated: loadedLearningSave, toast: loadedLearningSave, save: false });
  saveLearning({ immediate: true }); saveGame();
  const petLevel = () => ensureMastery(C.MONSTERS[currentPetId].kanji).level;
  const petMastery = () => ensureMastery(C.MONSTERS[currentPetId].kanji);

  // ---------- INPUT ----------
  addEventListener('keydown', (e) => {
    if (window.KanjiGOCharacters?.isOnboardingBlocking?.()) return;
    const k = e.key.toLowerCase();
    keys[k] = true;
    if ([' ', 'enter', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    if (state === 'lecture' && ['backspace', 'tab'].includes(k)) e.preventDefault();
    // Giữ key-repeat cho di chuyển, nhưng các action phải edge-triggered để
    // giữ Enter/Space không vô tình lật rồi bỏ qua nhiều bước liên tiếp.
    const repeatableMovement = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's'];
    if (e.repeat && !repeatableMovement.includes(k)) return;
    if (state === 'overworld') {
if (k === ' ' || k === 'enter') { playSFX('UI_BUTTON_CLICK'); onSpace(); }
      if (k === 'd') { playSFX('UI_BUTTON_CLICK'); openDex(); }
      if (k === 'k') openSkillTree();
      if (k === 'i') { playSFX('UI_BUTTON_CLICK'); openProfile(); }
      if (k === 'r') cycleRadarTarget();
      if (k === 'b') toggleBicycle();
      if (k === 'p') toggleAutoRide();
    } else if (state === 'battle') { if (['escape', ' ', 'enter', '1', '2', '3', '4'].includes(k)) playSFX('UI_BUTTON_CLICK'); onBattleKey(k); }
    else if (state === 'dex') { if (['escape', 'd', 'enter', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) playSFX('UI_BUTTON_CLICK'); onDexKey(k); }
    else if (state === 'skills') onSkillKey(k);
    else if (state === 'profile') { if (k === 'escape' || k === 'i') playSFX('UI_BUTTON_CLICK'); onProfileKey(k); }
    else if (state === 'lecture') { if (['escape', 'enter', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) playSFX('UI_BUTTON_CLICK'); onLectureKey(k); }
    else if (state === 'capture') { if (['escape', ' ', 'enter', '1', '2', '3', '4'].includes(k)) playSFX('UI_BUTTON_CLICK'); onCaptureKey(k); }
    else if (state === 'gym_select') { if (['escape', ' ', 'enter', '1', '2', 'arrowup', 'arrowdown', 'w', 's'].includes(k)) playSFX('UI_BUTTON_CLICK'); onGymMenuKey(k); }
    else if (state === 'pve') { if (['escape', ' ', 'enter', '1', '2', '3', '4'].includes(k)) playSFX('UI_BUTTON_CLICK'); onPveKey(k); }
  });
  addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
  function onBack() {
    if (state === 'overworld' && dialog.active) onSpace();
    else if (state === 'battle') {
      if (battle && battle.phase === 'end') endBattle();
      else tryRun();
    }
    else if (state === 'dex') onDexKey('escape');
    else if (state === 'skills') onSkillKey('escape');
    else if (state === 'profile') onProfileKey('escape');
    else if (state === 'lecture') onLectureKey('escape');
    else if (state === 'capture') onCaptureKey(capture && capture.phase === 'end' ? 'enter' : 'escape');
    else if (state === 'gym_select') closeGymMenu();
    else if (state === 'pve') onPveKey(pve && pve.phase === 'end' ? 'enter' : 'escape');
  }
  function clientToLogical(clientX, clientY, rect = cv.getBoundingClientRect()) {
    const width = Math.max(1, rect.width || SCREEN_W), height = Math.max(1, rect.height || SCREEN_H);
    return {
      x: (clientX - rect.left) * SCREEN_W / width,
      y: (clientY - rect.top) * SCREEN_H / height,
    };
  }
  cv.addEventListener('pointerdown', (e) => {
    const { x, y } = clientToLogical(e.clientX, e.clientY);
    if (state === 'overworld' && dialog.active) {
      e.preventDefault(); playSFX('UI_BUTTON_CLICK'); onSpace(); return;
    }
    if (state === 'dex') {
      e.preventDefault();
      // Sau khi tìm kiếm trên mobile, chạm vào danh sách phải đóng bàn phím
      // nhưng vẫn giữ nguyên query và kết quả đang lọc.
      if (dexSearchInput && document.activeElement === dexSearchInput) dexSearchInput.blur();
      onDexPointerDown(x, y, e.pointerId); return;
    }
    if (state === 'skills') { e.preventDefault(); onSkillPointerDown(x, y, e.pointerId); return; }
    if (state === 'profile') { e.preventDefault(); onProfilePointerDown(x, y); return; }
    if (state === 'gym_select') { e.preventDefault(); onGymMenuPointerDown(x, y); return; }
    if (state === 'lecture') { onLecturePointerDown(x, y, e.pointerId); return; }
    if (state === 'overworld') {
      const hit = overworldHitboxes.find((box) => x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h);
      if (hit && hit.action === 'radar') { e.preventDefault(); cycleRadarTarget(); return; }
    }
    const quiz = state === 'battle' ? battle : state === 'capture' ? capture : state === 'pve' ? pve : null;
    if (!quiz) return;
    if (quiz.phase === 'end') {
      playSFX('UI_BUTTON_CLICK');
      if (state === 'battle') onBattleKey('enter');
      else if (state === 'capture') onCaptureKey('enter');
      else onPveKey('enter');
      return;
    }
    if (quiz.phase !== 'fight') return;
    if (state === 'battle' && battle.entranceT > 0) return;
    const layout = quizPanelLayout(SCREEN_W, SCREEN_H);
    const { answerH: bh, answerGapY: gap, answerStartY: startY, pad: P, answerW: bw, answerGapX } = layout;
    const cols = layout.answerCols || 2, rows = Math.ceil(quiz.q.options.length / cols);
    if (y < startY || y > startY + rows * bh + Math.max(0, rows - 1) * gap) return;
    const col = Math.floor((x - P) / (bw + answerGapX));
    const row = Math.floor((y - startY) / (bh + gap));
    const idx = row * cols + col;
    if (col < 0 || col >= cols || row < 0 || row >= rows) return;
    if (x >= P + col * (bw + answerGapX) && x <= P + col * (bw + answerGapX) + bw && idx < quiz.q.options.length) {
      playSFX('UI_BUTTON_CLICK');
      if (state === 'battle') answer(idx);
      else if (state === 'capture') answerCapture(idx);
      else answerPve(idx);
    }
  });
  cv.addEventListener('pointermove', (e) => {
    if (state === 'dex' && dex.drag && dex.drag.pointerId === e.pointerId) {
      e.preventDefault();
      const { y } = clientToLogical(e.clientX, e.clientY);
      const delta = dex.drag.lastY - y;
      if (Math.abs(y - dex.drag.startY) > 5) dex.drag.moved = true;
      dex.scrollY += delta; dex.drag.lastY = y; clampDexScroll(); return;
    }
    if (state === 'skills' && skillUi.drag && skillUi.drag.pointerId === e.pointerId) {
      e.preventDefault();
      const { x, y } = clientToLogical(e.clientX, e.clientY);
      const layout = skillTreeLayout(), drag = skillUi.drag;
      if (Math.hypot(x - drag.startX, y - drag.startY) > 5) drag.moved = true;
      skillUi.panX += (drag.lastX - x) / layout.zoom; skillUi.panY += (drag.lastY - y) / layout.zoom;
      drag.lastX = x; drag.lastY = y; clampSkillPan(); return;
    }
    if (state === 'lecture' && lecture && lecture.phase === 'picker' && lecture.pickerDrag && lecture.pickerDrag.pointerId === e.pointerId) {
      e.preventDefault();
      const scale = lecture.uiScale || 1;
      const y = clientToLogical(e.clientX, e.clientY).y / scale, drag = lecture.pickerDrag;
      if (Math.abs(y - drag.startY) > 5) drag.moved = true;
      lecture.pickerScrollY += drag.lastY - y; drag.lastY = y; clampAcademyPickerScroll();
    }
  });
  function endCanvasDrag(e, cancelled = false) {
    if (dex.drag && (!e || dex.drag.pointerId === e.pointerId)) dex.drag = null;
    if (skillUi.drag && (!e || skillUi.drag.pointerId === e.pointerId)) skillUi.drag = null;
    if (!lecture || !lecture.pickerDrag || (e && lecture.pickerDrag.pointerId !== e.pointerId)) return;
    const drag = lecture.pickerDrag; lecture.pickerDrag = null;
    if (!cancelled && !drag.moved && drag.hit && drag.hit.action === 'pick') startAcademyLesson(drag.hit.value);
  }
  cv.addEventListener('pointerup', (e) => endCanvasDrag(e));
  cv.addEventListener('pointercancel', (e) => endCanvasDrag(e, true));
  cv.addEventListener('wheel', (e) => {
    if (state === 'dex') { e.preventDefault(); dex.scrollY += e.deltaY; clampDexScroll(); return; }
    if (state === 'skills') {
      e.preventDefault(); const layout = skillTreeLayout();
      skillUi.panX += (e.deltaX + (e.shiftKey ? e.deltaY : 0)) / layout.zoom;
      if (!e.shiftKey) skillUi.panY += e.deltaY / layout.zoom;
      clampSkillPan(); return;
    }
    if (state === 'lecture' && lecture && lecture.phase === 'picker') {
      e.preventDefault(); lecture.pickerScrollY += e.deltaY / (lecture.uiScale || 1); clampAcademyPickerScroll();
    }
  }, { passive: false });
  function onLecturePointerDown(x, y, pointerId) {
    if (!lecture || lecture.phase !== 'picker') { onLecturePointer(x, y); return; }
    const scale = lecture.uiScale || 1, lx = x / scale, ly = y / scale;
    const hit = (lecture.hitboxes || []).find((box) => lx >= box.x && lx <= box.x + box.w && ly >= box.y && ly <= box.y + box.h);
    if (hit && hit.action !== 'pick') { onLecturePointer(x, y); return; }
    const viewport = lecture.pickerViewport;
    if (viewport && ly >= viewport.top && ly <= viewport.bottom) {
      lecture.pickerDrag = { pointerId, startY: ly, lastY: ly, moved: false, hit: hit && hit.action === 'pick' ? hit : null };
      if (cv.setPointerCapture) cv.setPointerCapture(pointerId);
    }
  }
  function onLecturePointer(x, y) {
    if (!lecture) return;
    const scale = lecture.uiScale || 1;
    x /= scale; y /= scale;
    const hit = (lecture.hitboxes || []).find((box) => x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h);
    if (!hit) return;
    if (hit.action === 'reading_audio') {
      if (hit.value && hit.value.type === 'kun') playKanjiKunYomi(hit.value.char);
      else if (hit.value && hit.value.char) playKanjiOnYomi(hit.value.char);
      return;
    }
    playSFX('UI_BUTTON_CLICK');
    if (hit.action === 'menu') selectAcademyMenu(hit.value.action, hit.value.char);
    else if (hit.action === 'pick') startAcademyLesson(hit.value);
    else if (hit.action === 'picker_group') { lecture.group = hit.value; lecture.pickerSel = 0; lecture.pickerScrollY = 0; }
    else if (hit.action === 'picker_sort') cycleAcademySort();
    else if (hit.action === 'answer') answerLecture(hit.value);
    else if (hit.action === 'continue') academyNextStep();
    else if (hit.action === 'lesson_back') academyPreviousStep();
    else if (hit.action === 'card_prev') {
      if (lecture.phase === 'cards') academyPreviousStep();
      else { lecture.recapIndex = Math.max(0, lecture.recapIndex - 1); saveAcademyDraft(); }
    }
    else if (hit.action === 'card_next') {
      if (lecture.phase === 'cards') {
        if (lecture.cardRevealed) showAcademyCard(lecture.cardIndex + 1, false);
      } else { lecture.recapIndex = Math.min(lecture.recapIds.length - 1, lecture.recapIndex + 1); saveAcademyDraft(); }
    }
    else if (hit.action === 'card_reveal') revealAcademyCard();
    else if (hit.action === 'back') openAcademyLobby();
  }
  function pressed(dir) {
    if (dir === 'left') return keys['arrowleft'] || keys['a'];
    if (dir === 'right') return keys['arrowright'] || keys['d'] && false; // 'd' dành cho Dex
    if (dir === 'up') return keys['arrowup'] || keys['w'];
    if (dir === 'down') return keys['arrowdown'] || keys['s'];
    return false;
  }
  // di chuyển phải: chỉ mũi tên phải (vì D mở Dex). Thêm hàm riêng cho rõ:
  function pressedRight() { return keys['arrowright']; }
  function showToast(text) { toast = { text, t: 1500 }; }
  function onboardingTour() {
    const profile = activeCharacterProfile(), stops = ONBOARDING_GUIDE && ONBOARDING_GUIDE.stops;
    if (!profile || profile.onboardingComplete || !profile.onboardingIntroComplete || !Array.isArray(stops) || !stops.length) return null;
    const index = Math.max(0, Math.min(stops.length - 1, Math.floor(Number(profile.onboardingTourStep)) || 0));
    return { profile, index, stop: stops[index], total: stops.length, name: ONBOARDING_GUIDE.name || 'Aoi' };
  }
  function onboardingGuideInReach() {
    const tour = onboardingTour();
    if (!tour) return null;
    const distance = Math.abs(player.gx - tour.stop.gx) + Math.abs(player.gy - tour.stop.gy);
    return distance <= 1 ? tour : null;
  }
  function onboardingGuideDirection(tour = onboardingTour()) {
    if (!tour) return '';
    const dx = tour.stop.gx - player.gx, dy = tour.stop.gy - player.gy, parts = [];
    if (dy < 0) parts.push(`↑${Math.abs(dy)}`); else if (dy > 0) parts.push(`↓${dy}`);
    if (dx < 0) parts.push(`←${Math.abs(dx)}`); else if (dx > 0) parts.push(`→${dx}`);
    return parts.join(' ');
  }
  function onboardingWaypoint() {
    const tour = onboardingTour();
    if (!tour || dialog.active) return null;
    const playerCenterX = player.px + TILE / 2, playerCenterY = player.py + TILE / 2;
    const targetX = tour.stop.gx * TILE + TILE / 2, targetY = tour.stop.gy * TILE + TILE / 2;
    const dx = targetX - playerCenterX, dy = targetY - playerCenterY;
    return {
      targetId: tour.stop.id, name: tour.name,
      angle: Math.atan2(dy, dx), distanceTiles: Math.hypot(dx, dy) / TILE,
    };
  }
  function finishOnboardingGuideStop(tour) {
    const latest = onboardingTour();
    if (!latest || latest.index !== tour.index) return;
    const nextIndex = tour.index + 1;
    if (tour.stop.action === 'complete' || nextIndex >= tour.total) {
      const starter = resolveKanji(tour.profile.starterKanji || '一'), info = kanjiInfo(starter);
      if (!info || !ensureMastery(starter).captured) {
        window.KanjiGOCharacters?.setOnboardingTourStep?.(0);
        showToast('🔒 Hãy học và thu phục Kanji đầu tiên tại Giảng đường trước.');
        return;
      }
      currentPetId = info.monId;
      collect(info.monId); resetPetTrail();
      window.KanjiGOCharacters?.completeOnboarding?.();
      saveGame();
      showToast(`🎓 Hoàn tất tour! ${C.MONSTERS[currentPetId].name} chính thức đi cùng bạn.`);
      return;
    }
    if (tour.stop.action === 'academy') {
      const starter = resolveKanji(tour.profile.starterKanji || '一'), info = kanjiInfo(starter);
      if (info && ensureMastery(starter).captured) {
        currentPetId = info.monId; collect(info.monId); resetPetTrail();
        window.KanjiGOCharacters?.setOnboardingTourStep?.(nextIndex);
        const next = onboardingTour();
        if (next) showToast(`Đã thu phục 「${starter}」! Theo cô ${next.name} tới ${next.stop.label} • ${onboardingGuideDirection(next)}`);
        return;
      }
      if (!enterLecture(starter)) enterLecture();
      return;
    }
    window.KanjiGOCharacters?.setOnboardingTourStep?.(nextIndex);
    const next = onboardingTour();
    if (next) showToast(`Theo cô ${next.name} tới ${next.stop.label} • ${onboardingGuideDirection(next)}`);
  }
  function interactOnboardingGuide() {
    const tour = onboardingGuideInReach();
    if (!tour || player.moving) return false;
    if (isBicycleActive()) {
      bicycleActive = false; stopAutoRide({ silent: true, save: false }); player.frame = 0; saveGame();
    }
    dialog = {
      active: true, idx: 0,
      npc: { type: 'onboarding-guide', name: tour.name, lines: tour.stop.lines || [`Đây là ${tour.stop.label}.`] },
      onClose: () => finishOnboardingGuideStop(tour),
    };
    return true;
  }
  window.KanjiGOCharacters?.setOnboardingFinished?.((slot) => {
    showToast(`Cô Aoi đang chờ bạn tại Giảng đường • Kanji đầu tiên: 「${slot.starterKanji || '一'}」`);
  });

  // ---------- OVERWORLD ----------
  const delta = (d) => ({ down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[d]);
  function tileAt(gx, gy) { return (gx < 0 || gy < 0 || gx >= MAP_W || gy >= MAP_H) ? -1 : TILES[gy][gx]; }
  function canWalk(gx, gy) {
    const t = tileAt(gx, gy);
    if (t < 0) return false;
    if (PROP_BLOCKED.has(`${gx},${gy}`)) return false;
    if (NPCS.some((n) => n.gx === gx && n.gy === gy)) return false;
    const guide = onboardingTour();
    if (guide && guide.stop.gx === gx && guide.stop.gy === gy) return false;
    if (player.onBoat) return t === K.WATER || t === K.BOAT;
    return !BLOCKED.has(t);
  }
  function bicycleAvailable() { return resolveSkillEffects().bicycleAccess === true; }
  function autoRideAvailable() { return resolveSkillEffects().autoRideAccess === true; }
  function isBicycleActive() { return bicycleActive && bicycleAvailable() && !player.onBoat; }
  function stopAutoRide({ silent = false, save = true } = {}) {
    const wasActive = autoRideActive;
    autoRideActive = false; autoRidePath = [];
    if (save && wasActive) saveGame();
    if (!silent && wasActive) showToast('⏸ Auto Ride đã dừng.');
    return wasActive;
  }
  function toggleAutoRide() {
    if (state !== 'overworld' || dialog.active || fishing || player.moving || player.onBoat) return false;
    if (autoRideActive) { stopAutoRide(); return false; }
    if (!autoRideAvailable()) { showToast('🔒 Mở skill Auto Ride trong Skill Tree trước.'); return false; }
    if (!availableSpawn('grass').length) { showNoCapturedEncounter(); return false; }
    bicycleActive = true; autoRideActive = true; autoRidePath = []; player.running = false; player.frame = 0;
    saveGame(); showToast('🧭 Auto Ride: đang tìm bụi cỏ • P để dừng');
    return true;
  }
  function toggleBicycle() {
    if (state !== 'overworld' || dialog.active || fishing || player.moving || player.onBoat) return false;
    if (!bicycleAvailable()) { showToast('🔒 Mở skill Xe đạp trong Skill Tree trước.'); return false; }
    bicycleActive = !bicycleActive; player.running = false; player.frame = 0; saveGame();
    if (!bicycleActive) stopAutoRide({ silent: true });
    showToast(bicycleActive ? '🚲 Đã lên xe — di chuyển nhanh hơn!' : '🚶 Đã xuống xe.');
    return bicycleActive;
  }
  function bicycleMoveDuration() {
    const base = Number(C.BICYCLE && C.BICYCLE.moveMultiplier) || .42;
    const multiplier = Math.max(.2, Math.min(1, base * resolveSkillEffects().bicycleSpeedMultiplier));
    return Math.max(45, C.MOVE_MS * multiplier);
  }
  const AUTO_RIDE_DIRECTIONS = [
    { dir: 'up', dx: 0, dy: -1 }, { dir: 'right', dx: 1, dy: 0 },
    { dir: 'down', dx: 0, dy: 1 }, { dir: 'left', dx: -1, dy: 0 },
  ];
  function findAutoRidePath() {
    const startKey = `${player.gx},${player.gy}`, queue = [{ gx: player.gx, gy: player.gy, path: [] }];
    const visited = new Set([startKey]);
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const current = queue[cursor];
      if (current.path.length > 0 && tileAt(current.gx, current.gy) === K.TALLGRASS) return current.path;
      const rotation = Math.abs(current.gx * 7 + current.gy * 11) % AUTO_RIDE_DIRECTIONS.length;
      for (let i = 0; i < AUTO_RIDE_DIRECTIONS.length; i++) {
        const step = AUTO_RIDE_DIRECTIONS[(i + rotation) % AUTO_RIDE_DIRECTIONS.length];
        const gx = current.gx + step.dx, gy = current.gy + step.dy, key = `${gx},${gy}`;
        if (visited.has(key) || !canWalk(gx, gy)) continue;
        visited.add(key); queue.push({ gx, gy, path: [...current.path, step.dir] });
      }
    }
    return [];
  }
  function nextAutoRideDirection() {
    if (!autoRideActive || state !== 'overworld') return null;
    if (!autoRidePath.length) autoRidePath = findAutoRidePath();
    let direction = autoRidePath.shift() || null;
    if (direction) {
      const [dx, dy] = delta(direction);
      if (!canWalk(player.gx + dx, player.gy + dy)) { autoRidePath = []; direction = null; }
    }
    if (!direction) { stopAutoRide({ silent: true }); showToast('⚠ Auto Ride không tìm thấy đường tới bụi cỏ.'); }
    return direction;
  }
  function tryMove(dir) {
    const changedDirection = player.facing !== dir;
    player.facing = dir;
    // A turn starts from the authored contact pose. Keeping the previous row's
    // phase made the torso appear to jump when the source row changed while a
    // stride frame was active.
    if (changedDirection) { player.frame = 0; player.animT = 0; }
    const [dx, dy] = delta(dir);
    const nx = player.gx + dx, ny = player.gy + dy;
    if (!canWalk(nx, ny)) return;
    const cycling = isBicycleActive();
    player.running = !cycling && !player.onBoat && !!keys.shift;
    player.moveDuration = cycling ? bicycleMoveDuration() : player.running ? (C.RUN_MOVE_MS || C.MOVE_MS * 0.62) : C.MOVE_MS;
    player.moving = true; player.moveT = 0;
    player.fromX = player.px; player.fromY = player.py;
    player.toX = nx * TILE; player.toY = ny * TILE;
    player.gx = nx; player.gy = ny;
  }
  function onStepComplete() {
    const t = tileAt(player.gx, player.gy);
    // Onboarding là một tuyến bắt buộc. Trước khi tour kết thúc, người chơi
    // không thể vô tình rơi vào encounter bên ngoài luồng học starter.
    if (window.KanjiGOCharacters?.isOnboarding?.()) return;
    if (player.onBoat) {
      if (t === K.WATER) playSFX('WORLD_WATER_WADE');
      if (t === K.WATER) {
        if (!availableSpawn('water').length) showNoCapturedEncounter();
        else if (Math.random() < C.ENCOUNTER.SURF) startBattle('water');
      }
    } else if (t === K.TALLGRASS) {
      playSFX('WORLD_GRASS_RUSTLE');
      if (!availableSpawn('grass').length) showNoCapturedEncounter();
      else if (Math.random() < C.ENCOUNTER.TALLGRASS) startBattle('grass');
    }
  }
  function frontTile() { const [dx, dy] = delta(player.facing); return { gx: player.gx + dx, gy: player.gy + dy, t: tileAt(player.gx + dx, player.gy + dy) }; }
  function academyEntranceInReach() {
    return tileAt(player.gx, player.gy) === K.ACADEMY_DOOR || frontTile().t === K.ACADEMY_DOOR;
  }
  function npcInFront() { const f = frontTile(); return NPCS.find((n) => n.gx === f.gx && n.gy === f.gy) || null; }
  function onSpace() {
    if (fishing) return;
    if (dialog.active) {
      dialog.idx++;
      if (dialog.idx >= dialog.npc.lines.length) {
        const onClose = dialog.onClose;
        dialog = { active: false, idx: 0, npc: null };
        if (typeof onClose === 'function') onClose();
      }
      return;
    }
    if (player.moving) return;
    if (interactOnboardingGuide()) return;
    const npc = npcInFront();
    if (npc && isBicycleActive()) { bicycleActive = false; stopAutoRide({ silent: true, save: false }); player.frame = 0; saveGame(); }
    if (npc && npc.type === 'lecture') { enterLecture(); return; }
    if (npc && npc.type === 'pve') { startPve(); return; }
    if (npc && npc.type === 'trainer') { interactTrainer(npc.trainerId, npc); return; }
    if (npc && npc.type === 'gym') { openGymMenu(npc.tier || 'N5'); return; }
    if (npc) { dialog.active = true; dialog.idx = 0; dialog.npc = npc; return; }
    const f = frontTile();
    const academyEntrance = !player.onBoat && academyEntranceInReach();
    if (isBicycleActive() && (academyEntrance || f.t === K.BOAT || f.t === K.WATER)) {
      bicycleActive = false; stopAutoRide({ silent: true, save: false }); player.frame = 0; saveGame();
    }
    if (academyEntrance) { enterLecture(); return; }
    if (!player.onBoat && f.t === K.BOAT) { board(f); return; }
    if (player.onBoat && f.t >= 0 && f.t !== K.WATER && f.t !== K.BOAT
      && !BLOCKED.has(f.t) && !PROP_BLOCKED.has(`${f.gx},${f.gy}`)) { disembark(f); return; }
    if (!player.onBoat && f.t === K.WATER) { fish(); return; }
  }
function board(f) { bicycleActive = false; stopAutoRide({ silent: true, save: false }); player.onBoat = true; player.gx = f.gx; player.gy = f.gy; player.px = f.gx * TILE; player.py = f.gy * TILE; resetPetTrail(); saveGame(); playSFX('WORLD_TRANSIT'); showToast('🚤 Đã lên thuyền!'); }
  function disembark(f) { player.onBoat = false; player.gx = f.gx; player.gy = f.gy; player.px = f.gx * TILE; player.py = f.gy * TILE; resetPetTrail(); playSFX('WORLD_TRANSIT'); showToast('🚶 Đã lên bờ.'); }
  function showNoCapturedEncounter() { showToast(C.ENCOUNTER.noCapturedMessage); }
  function fish() {
    if (!availableSpawn('water').length) { showNoCapturedEncounter(); return; }
    const f = frontTile();
    fishing = { t: 0, phase: 'cast', caught: Math.random() < C.ENCOUNTER.FISH, gx: f.gx, gy: f.gy };
    // Giữ nguyên pose đứng trong suốt lượt câu; animation bước chân làm điểm cầm cần bị trượt.
    player.frame = 0; player.animT = 0; player.running = false;
    playSFX('WORLD_FISH_CAST');
    showToast('🎣 Vung cần...');
  }

  function updateFishing(dt) {
    if (!fishing) return;
    player.frame = 0;
    const F = C.FISHING || { castMs: 320, waitMs: 900, reelMs: 420 };
    const before = fishing.t; fishing.t += dt;
    if (before < F.castMs && fishing.t >= F.castMs) {
      fishing.phase = 'wait'; playSFX('WORLD_FISH_BITE'); showToast('🎣 Phao đang rung...');
    }
    if (before < F.castMs + F.waitMs && fishing.t >= F.castMs + F.waitMs) {
      fishing.phase = 'reel';
      showToast(fishing.caught ? '🎣 Có gì cắn câu!' : '🎣 Kéo cần lên...');
    }
    if (fishing.t < F.castMs + F.waitMs + F.reelMs) return;
    const caught = fishing.caught; fishing = null; player.frame = 0;
    if (caught) { playSFX('WORLD_FISH_SUCCESS'); startBattle('water'); }
    else { playSFX('WORLD_FISH_FAILURE'); showToast('🎣 Chưa câu được gì, thử lại nhé.'); }
  }

  // ---------- 🐾 SCALE THEO MASTERY ----------
  function petSizeFor(level, base = C.PET.size) {
    const K = C.KLEVEL;
    return Math.min(K.petSizeMax, base + K.petSizePerLevel * (Math.max(1, level) - 1));
  }
  function battleLevelScale(level) {
    const K = C.KLEVEL, lv = Math.max(1, Math.min(K.maxLevel, Math.floor(Number(level) || 1)));
    return Math.min(Number(K.battleScaleMax) || 1.3, (Number(K.battleScaleBase) || .82) + (lv - 1) * (Number(K.battleScalePerLevel) || .05));
  }
  function playerMaxHpFor(level) {
    const base = C.PLAYER.maxHp + (C.KLEVEL.hpAppliesTo === 'player' ? C.KLEVEL.hpPerLevel * (Math.max(1, level) - 1) : 0);
    return Math.max(1, Math.round(base * resolveSkillEffects().playerHpMultiplier));
  }
  function syncPlayerScale(kanji, heal = false) {
    const level = typeof kanji === 'number' ? kanji : ensureMastery(kanji).level;
    player.maxHp = playerMaxHpFor(level);
    player.hp = heal ? player.maxHp : Math.min(player.hp, player.maxHp);
  }

  // ---------- ⚔️ COMBAT REALTIME (quiz kanji) ----------
  let battle = null;
  let lastBattleActorLayout = null;
  const rnd = (r) => Math.floor(Math.random() * (r[1] - r[0] + 1)) + r[0];
  function capturedKanji(tier = '') {
    return Object.values(KDB.KANJI).map((k) => k.char).filter((char) =>
      ensureMastery(char).captured && C.MONSTERS[kanjiInfo(char).monId] &&
      isTierUnlocked(tierOfKanji(char)) && (!tier || tierOfKanji(char) === String(tier).toUpperCase()));
  }
  function availableSpawn(kind) {
    const ids = C.SPAWN[kind] || Object.keys(C.MONSTERS);
    return ids.filter((id) => C.MONSTERS[id] && isTierUnlocked(tierOfKanji(C.MONSTERS[id].kanji)) && ensureMastery(C.MONSTERS[id].kanji).captured);
  }
  function radarTargets() {
    const configured = (C.RADAR && C.RADAR.targets) || ['balanced', 'due', 'weak', 'pet'];
    return configured.filter((target) => ['balanced', 'due', 'weak', 'pet'].includes(target));
  }
  function radarTargetLabel(target = radarTarget) {
    return ((C.RADAR && C.RADAR.labels) || {})[target] || target;
  }
  function cycleRadarTarget() {
    if (resolveSkillEffects().radarMode !== 'targeting') { showToast('🔒 Radar II cần được mở để chọn mục tiêu.'); return false; }
    const targets = radarTargets(); if (!targets.length) return false;
    const index = Math.max(0, targets.indexOf(radarTarget)); radarTarget = targets[(index + 1) % targets.length];
    saveGame(); showToast(`🎯 Radar ưu tiên: ${radarTargetLabel()}`); return radarTarget;
  }
  function radarEncounterMultiplier(char, now = Date.now()) {
    if (resolveSkillEffects().radarMode !== 'targeting' || radarTarget === 'balanced') return 1;
    const stat = ensureMastery(char), multiplier = Math.max(1, Number(C.RADAR && C.RADAR.targetMultiplier) || 4);
    if (radarTarget === 'due' && isDue(char, now)) return multiplier;
    if (radarTarget === 'weak' && stat.recall < 70) return multiplier;
    if (radarTarget === 'pet' && C.MONSTERS[currentPetId] && C.MONSTERS[currentPetId].kanji === char) return multiplier;
    return 1;
  }
  function grassWeight(char, now = Date.now()) {
    return reappearWeight(char, now) * radarEncounterMultiplier(char, now);
  }
  function pickGrassKanji() {
    const pool = availableSpawn('grass').map((id) => C.MONSTERS[id].kanji);
    if (!pool.length) return null;
    const weights = pool.map((char) => grassWeight(char)), total = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < pool.length; i++) { roll -= weights[i]; if (roll <= 0) return pool[i]; }
    return pool[pool.length - 1];
  }
  function pickMonster(kind) {
    const pool = availableSpawn(kind);
    if (!pool.length) return null;
    const weights = pool.map((id) => reappearWeight(C.MONSTERS[id].kanji) * radarEncounterMultiplier(C.MONSTERS[id].kanji));
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < pool.length; i++) { roll -= weights[i]; if (roll <= 0) return pool[i]; }
    return pool[pool.length - 1];
  }
  function shuffle(options) { for (let i = options.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [options[i], options[j]] = [options[j], options[i]]; } return options; }
  function questionModesForLevel(level) {
    return BattleCore.questionModesForLevel(C.QUESTION_MODES, C.KLEVEL.maxLevel, level);
  }
  function chooseMode(level = 1, availableModes = null) {
    const weights = (C.QUESTION_MODES && C.QUESTION_MODES.weights) || { m1: 1 };
    const allowed = new Set(Array.isArray(availableModes) ? availableModes : questionModesForLevel(level));
    const entries = Object.entries(weights).filter(([mode, weight]) => allowed.has(mode) && Number(weight) > 0);
    if (!entries.length) return 'm1';
    const total = entries.reduce((sum, [, weight]) => sum + Number(weight), 0);
    let roll = Math.random() * total;
    for (const [mode, weight] of entries) { roll -= Number(weight); if (roll <= 0) return mode; }
    return 'm1';
  }
  function optionSet(correct, values, count = 4) {
    const opts = new Set([correct]);
    for (const value of shuffle([...values])) { if (value && value !== correct) opts.add(value); if (opts.size >= count) break; }
    return shuffle([...opts]);
  }
  function variedOptionSet(correct, curated, dynamicValues, count = 4) {
    const opts = new Set([correct]);
    const curatedDistractors = shuffle([...new Set(curated || [])].filter((value) => value && value !== correct));
    const curatedLimit = Math.min(2, curatedDistractors.length, count - 1);
    for (const value of curatedDistractors.slice(0, curatedLimit)) opts.add(value);
    for (const value of shuffle([...dynamicValues])) { if (value && value !== correct) opts.add(value); if (opts.size >= count) break; }
    for (const value of curatedDistractors) { if (opts.size >= count) break; opts.add(value); }
    return shuffle([...opts]);
  }
  function questionValuesForTier(question, mode) {
    const tier = (kanjiInfo(question.target) || {}).jlpt;
    return BattleCore.valuesForMode(DISTRACTOR_POOLS, mode, tier, question.target);
  }
  // Sinh câu hỏi đa hướng; SRS vẫn chỉ ghi nhận theo q.target.
  function makeQuestion(monKanji, previousKey = '', modeOverride = '', fair = false, sourcePool = null) {
    if (typeof previousKey === 'number') { modeOverride = `m${previousKey}`; previousKey = ''; }
    if (typeof previousKey === 'string' && /^m(?:[1-9]|1[0-5])$/.test(previousKey)) { modeOverride = previousKey; previousKey = ''; }
    const level = ensureMastery(monKanji).level;
    const targetChallenges = challengesForKanji(monKanji);
    const contextualModes = ['m11', 'm12'];
    const capturedOtherCount = Object.values(KDB.KANJI)
      .filter((info) => info.char !== monKanji && ensureMastery(info.char).captured).length;
    const availableModes = questionModesForLevel(level).filter((mode) => {
      if (contextualModes.includes(mode) && !targetChallenges.length) return false;
      // m2/m3 cần ba Kanji khác làm distractor. Loại từ trước thay vì chọn rồi
      // fallback về m1, vì fallback đó có thể lặp đúng mode của câu vừa hỏi.
      if ((mode === 'm2' || mode === 'm3') && capturedOtherCount < 3) return false;
      return true;
    });
    const previousMode = String(previousKey || '').match(/(?:^|\|)(m(?:[1-9]|1[0-5]))(?:\||$)/)?.[1] || '';
    const nonRepeatingModes = availableModes.length > 1 ? availableModes.filter((mode) => mode !== previousMode) : availableModes;
    let mode = modeOverride || chooseMode(level, nonRepeatingModes);
    const explicitPool = Array.isArray(sourcePool) && sourcePool.length ? sourcePool : null;
    let candidates;
    if (explicitPool) candidates = explicitPool;
    else if (contextualModes.includes(mode)) candidates = targetChallenges;
    else if (mode === 'm13' && targetChallenges.length) candidates = targetChallenges;
    else if (mode === 'm6' && level >= (Number(C.QUESTION_MODES && C.QUESTION_MODES.workbookReadingLevel) || 6)) {
      candidates = [...KDB.QUESTIONS, ...targetChallenges];
    } else candidates = KDB.QUESTIONS;
    let pool = candidates.filter((q) => q.target === monKanji
      && (!contextualModes.includes(mode) || (q.options && Array.isArray(q.options[mode === 'm13' ? 'm12' : mode]))));
    if (!pool.length && contextualModes.includes(mode)) {
      mode = 'm1'; candidates = explicitPool || KDB.QUESTIONS; pool = candidates.filter((q) => q.target === monKanji);
    }
    if (pool.length === 0) pool = candidates.length ? candidates : KDB.QUESTIONS;
    if (C.LEARNING && C.LEARNING.avoidRepeat && pool.length > 1) {
      const withoutPrevious = pool.filter((q) => questionKey(q) !== previousKey
        && !String(previousKey).includes(questionKey(q)) && !String(previousKey).includes(vocabularyId(q)));
      if (withoutPrevious.length) pool = withoutPrevious;
    }
    // Câu có điểm thấp là câu người học đang yếu; random trong nhóm yếu nhất
    // để vừa ôn trọng tâm vừa tránh một thứ tự hoàn toàn cố định.
    const scores = pool.map(questionScore), minScore = Math.min(...scores);
    const weakPool = pool.filter((q) => questionScore(q) <= minScore + 1);
    const q = (fair ? pool : weakPool)[Math.floor(Math.random() * (fair ? pool : weakPool).length)];
    const infos = Object.values(KDB.KANJI);
    const otherInfos = infos.filter((info) => info.char !== q.target && ensureMastery(info.char).captured);
    const targetReading = q.answer;
    let answer = q.answer, options, word = q.word, mean = q.mean, type = q.type;
    if (mode === 'm2') {
      if (otherInfos.length < 3) mode = 'm1';
      else { answer = q.target; options = optionSet(answer, otherInfos.map((info) => info.char)); }
    }
    if (mode === 'm3') {
      if (otherInfos.length < 3) mode = 'm1';
      else { answer = (kanjiInfo(q.target) || {}).meaning || q.target; options = optionSet(answer, otherInfos.map((info) => info.meaning)); }
    }
    if (mode === 'm4') { answer = q.type.toUpperCase(); options = shuffle(['ON', 'KUN']); }
    if (mode === 'm5') {
      const words = questionValuesForTier(q, 'm5');
      if (new Set(words).size < 3) mode = 'm1';
      else { answer = q.word; options = optionSet(answer, words); }
    }
    if (mode === 'm6') {
      const readings = questionValuesForTier(q, 'm6');
      if (!q.wordReading || new Set(readings).size < 3) mode = 'm1';
      else { answer = q.wordReading; options = q.challengeOnly ? variedOptionSet(answer, q.options.m6, readings) : optionSet(answer, readings); }
    }
    if (mode === 'm7') {
      const meanings = questionValuesForTier(q, 'm7');
      if (!q.mean || new Set(meanings).size < 3) mode = 'm1';
      else { answer = q.mean; options = optionSet(answer, meanings); }
    }
    if (mode === 'm8') {
      answer = q.answer;
      options = optionSet(answer, KDB.DISTRACTORS.slice());
    }
    if (mode === 'm9') {
      const tier = (kanjiInfo(q.target) || {}).jlpt;
      const chars = BattleCore.valuesForMode(DISTRACTOR_POOLS, 'm9', tier, q.target);
      answer = q.target; options = optionSet(answer, chars);
    }
    if (mode === 'm10') {
      const tier = (kanjiInfo(q.target) || {}).jlpt;
      const meanings = BattleCore.valuesForMode(DISTRACTOR_POOLS, 'm10', tier, q.target);
      answer = q.mean; options = optionSet(answer, meanings);
    }
    if (mode === 'm11') {
      answer = q.wordReading;
      options = variedOptionSet(answer, q.options.m11, questionValuesForTier(q, 'm11'));
    }
    if (mode === 'm12') {
      answer = q.word;
      options = variedOptionSet(answer, q.options.m12, questionValuesForTier(q, 'm12'));
    }
    if (mode === 'm13') {
      const tier = (kanjiInfo(q.target) || {}).jlpt;
      const words = BattleCore.valuesForMode(DISTRACTOR_POOLS, 'm13', tier, q.target);
      answer = q.word; options = q.challengeOnly ? variedOptionSet(answer, q.options.m12, words) : optionSet(answer, words);
    }
    if (mode === 'm14') {
      const tier = (kanjiInfo(q.target) || {}).jlpt;
      const words = BattleCore.valuesForMode(DISTRACTOR_POOLS, 'm14', tier, q.target);
      if (!q.wordReading || new Set(words).size < 3) { mode = 'm1'; answer = q.answer; options = optionSet(answer, KDB.DISTRACTORS.slice()); }
      else { answer = q.word; options = optionSet(answer, words); }
    }
    if (mode === 'm15') {
      const tier = (kanjiInfo(q.target) || {}).jlpt;
      const words = BattleCore.valuesForMode(DISTRACTOR_POOLS, 'm15', tier, q.target);
      if (!q.mean || new Set(words).size < 3) { mode = 'm1'; answer = q.answer; options = optionSet(answer, KDB.DISTRACTORS.slice()); }
      else { answer = q.word; options = optionSet(answer, words); }
    }
    if (mode === 'm1') { answer = q.answer; options = optionSet(answer, KDB.DISTRACTORS.slice()); }
    const result = { word, mean, target: q.target, answer, romaji: q.romaji, type, mode, options, correctIndex: options.indexOf(answer), vocabId: q.id,
      targetReading, wordReading: q.wordReading || '', wordRomaji: q.wordRomaji || '',
      sentence: q.sentence || '', sentenceReading: q.sentenceReading || '', sentenceMeaning: q.sentenceMeaning || '',
      clozeSentence: q.word && q.sentence ? q.sentence.replace(q.word, '＿＿') : '', challengeOnly: q.challengeOnly === true,
      parts: Array.isArray(q.parts) ? q.parts.map((part) => ({ ...part })) : [] };
    result.key = `${mode}|${q.id}`;
    return result;
  }
  function questionCorrection(q) {
    if (q.mode === 'm13') return `Chỗ trống trong câu là「${q.answer}」`;
    if (q.mode === 'm14') return `「${q.wordReading}」 được viết là「${q.answer}」`;
    if (q.mode === 'm15') return `“${q.mean}” ứng với từ「${q.answer}」`;
    if (q.mode === 'm11') return `Trong câu này, 「${q.word}」 đọc là「${q.answer}」`;
    if (q.mode === 'm12') return `Trong câu này, 「${q.targetReading}」 được viết là「${q.answer}」`;
    if (q.mode === 'm6') return `「${q.word}」 đọc là「${q.answer}」${q.wordRomaji ? ` (${q.wordRomaji})` : ''}`;
    if (q.mode === 'm7' || q.mode === 'm10') return `「${q.word}」 nghĩa là “${q.answer}”`;
    if (q.mode === 'm9') return `Trong câu này, 「${q.targetReading}」 được viết là「${q.answer}」`;
    if (q.mode === 'm8') return `Trong câu này, 「${q.target}」 đọc là「${q.answer}」${q.romaji ? ` (${q.romaji})` : ''}`;
    return `${q.target} ở đây đọc「${q.answer}」${q.romaji ? ` (${q.romaji})` : ''} — âm ${q.type.toUpperCase()}`;
  }
  function nextAttackCycleMs() {
    const multiplier = resolveSkillEffects().attackGaugeMultiplier || 1;
    return Math.round(rnd([C.COMBAT.botMinMs, C.COMBAT.botMaxMs]) / Math.max(.5, multiplier));
  }

  function startBattle(kind, forcedMonId = '') {
    window.KanjiGOQuestionPack?.load?.();
    const eligible = availableSpawn(kind);
    const monId = forcedMonId && eligible.includes(forcedMonId) ? forcedMonId : pickMonster(kind);
    if (!monId) { showNoCapturedEncounter(); return false; }
    monsterImg(monId); // bắt đầu decode trước frame battle đầu tiên
    const m = C.MONSTERS[monId];
    const kanjiLevel = ensureMastery(m.kanji).level;
    const activePet = C.MONSTERS[currentPetId];
    const activePetKanji = activePet ? activePet.kanji : m.kanji;
    const petLevel = ensureMastery(activePetKanji).level;
    const levelDamage = C.COMBAT.baseDamage + C.KLEVEL.dmgPerLevel * (kanjiLevel - 1);
    const battleMaxHp = Math.max(m.maxHp, Math.ceil(levelDamage * (C.COMBAT.enemyHpPerDamage || 1)));
    syncPlayerScale(activePetKanji, true);
setState('battle'); autoRidePath = []; playSFX('BATTLE_ENCOUNTER'); const attackCycleMs = nextAttackCycleMs(), effects = resolveSkillEffects();
    const encounterEntranceMs = window.SettingsUI?.encounterAnimationEnabled?.() === false ? 0 : 1450;
    battle = {
      kind, monId, mon: m, monHp: battleMaxHp, monMaxHp: battleMaxHp,
      grassKanji: kind === 'grass' ? m.kanji : null,
      kanjiLevel, petLevel,
      q: makeQuestion(m.kanji),
      feedback: null, fbT: 0, qCooldown: 0, retryQuestion: false, selectedIndex: -1, revealAnswer: false, stun: 0, combo: 0, energy: 0,
      comboGuardRemaining: effects.comboGuardCharges, meaningLensRemaining: effects.meaningHintCharges,
      botNextIn: attackCycleMs, botCycleMs: attackCycleMs, questionElapsed: 0,
      shake: 0, flash: 0, botFlash: 0, hitStop: 0,
      entranceT: encounterEntranceMs, entranceTotal: encounterEntranceMs, entranceSfxPlayed: false, encounterImpactT: 0,
      petAttackT: 0, enemyAttackT: 0, enemyHitT: 0, playerHitT: 0,
      perfectT: 0, skillT: 0, skillName: '', particles: [], damageNumbers: [],
      pendingWin: 0, pendingLose: 0,
      phase: 'fight', result: null, endMsg: '', counted: false,
      learningSession: createLearningSession('battle'),
    };
    playQuestionPronunciation(battle.q);
    return true;
  }

  function onBattleKey(k) {
    if (!battle) return;
    if (battle.phase === 'end') { if (k === ' ' || k === 'enter') endBattle(); return; }
    if (k === 'p' && autoRideActive) { stopAutoRide(); return; }
    if (k === 'escape') { tryRun(); return; }
    if (battle.entranceT > 0) return;
    if (k === 'h') { useMeaningLens(); return; }
    if (['1', '2', '3', '4'].includes(k)) answer(parseInt(k, 10) - 1);
  }

  function useMeaningLens() {
    if (!battle || battle.phase !== 'fight' || battle.stun > 0 || battle.qCooldown > 0) return { ok: false, reason: 'unavailable' };
    if (battle.meaningLensRemaining <= 0) return { ok: false, reason: 'no_charges' };
    if (['m3', 'm7', 'm10'].includes(battle.q.mode)) {
      battle.feedback = { good: false, text: '🔍 Meaning Lens tạm khóa vì nghĩa chính là đáp án.' }; battle.fbT = 1200;
      return { ok: false, reason: 'would_reveal_answer' };
    }
    const info = kanjiInfo(battle.q.target);
    battle.meaningLensRemaining--;
    battle.feedback = { good: true, text: `🔍 「${battle.q.target}」 gợi nhớ: ${info ? info.meaning : battle.q.mean}` };
    battle.fbT = 1500;
    return { ok: true, remaining: battle.meaningLensRemaining, meaning: info ? info.meaning : battle.q.mean };
  }

  function applyComboGuard(b) {
    if (!b || b.combo <= 0 || b.comboGuardRemaining <= 0) { if (b) b.combo = 0; return false; }
    b.comboGuardRemaining--;
    b.combo = Math.max(1, Math.floor(b.combo / 2));
    return true;
  }

  function wrongFeedbackDuration() {
    const feedback = C.QUESTION_FEEDBACK || {};
    return Math.max(900, (Number(feedback.wrongHoldMs) || 1500) + (Number(feedback.wrongFadeMs) || 700));
  }
  function quizFeedback(good, text, fadeMs = 0) {
    const fallback = good ? (Number(C.QUESTION_FEEDBACK && C.QUESTION_FEEDBACK.correctFadeMs) || 180)
      : (Number(C.QUESTION_FEEDBACK && C.QUESTION_FEEDBACK.wrongFadeMs) || 700);
    return { good, text, fadeMs: Math.max(0, Number(fadeMs) || fallback) };
  }

  function answer(idx) {
    if (battle.phase !== 'fight' || battle.stun > 0 || battle.qCooldown > 0) return;
    const q = battle.q;
    battle.selectedIndex = idx;
    battle.revealAnswer = true;
    if (idx === q.correctIndex) {
      recordAnswer(q, true, battle.learningSession, 'battle');
      playSFX('KANJI_CORRECT'); playSFX('BATTLE_ATTACK');
      battle.retryQuestion = false;
      battle.combo++;
      battle.energy = Math.min(C.COMBAT.energyMax || 3, battle.energy + 1);
      const perfect = battle.questionElapsed <= (C.COMBAT.perfectMs || 2000);
      const special = battle.energy >= (C.COMBAT.energyMax || 3);
      const baseDmg = C.COMBAT.baseDamage + C.KLEVEL.dmgPerLevel * (battle.petLevel - 1) + battle.combo * C.COMBAT.comboBonus;
      const dmg = special ? Math.round(baseDmg * (C.COMBAT.specialMultiplier || 1.5)) : baseDmg;
      battle.monHp = Math.max(0, battle.monHp - dmg);
      playSFX('BATTLE_CUT');
      if (perfect) playSFX('PROGRESSION_BONUS');
      const push = perfect ? (C.COMBAT.perfectGaugePush || .35) : (C.COMBAT.gaugePush || .2);
      battle.botNextIn = Math.min(battle.botCycleMs, battle.botNextIn + battle.botCycleMs * push);
      battle.feedback = quizFeedback(true, `${perfect ? '⚡ PERFECT! ' : '✓ Đúng! '}${q.target} — ${q.answer}  (-${dmg} HP)`);
      const meaningAttack = !!kanjiAnimation(C.MONSTERS[currentPetId]);
      battle.fbT = 900; battle.qCooldown = special ? 1050 : 700;
      battle.shake = meaningAttack ? 380 : 220; battle.enemyHitT = meaningAttack ? 420 : 300;
      battle.petAttackT = special ? 760 : meaningAttack ? 680 : 460;
      battle.petAttackTotal = battle.petAttackT;
      battle.hitStop = C.COMBAT.hitStopMs || 70;
      battle.perfectT = perfect ? 800 : 0;
      battle.damageNumbers.push({ text: `-${dmg}`, side: 'enemy', t: 900, total: 900, color: special ? '#7ff7ff' : '#ffd54a' });
      if (special) {
        playSFX('BATTLE_LIGHTNING_STRIKE');
        battle.energy = 0;
        battle.skillKanji = (C.MONSTERS[currentPetId] || {}).kanji || q.target;
        battle.skillName = `${battle.skillKanji}・${currentPetId === 'fish' ? '水流撃' : '連続撃'}`;
        battle.skillT = 1000;
        battle.particles = makeBattleParticles(currentPetId === 'fish' ? 'water' : battle.kind, 26);
      }
      if (battle.monHp <= 0) { battle.pendingWin = special ? 850 : 520; return; }
    } else {
      recordAnswer(q, false, battle.learningSession, 'battle');
      const guarded = applyComboGuard(battle);
      playSFX('KANJI_INCORRECT'); playSFX('BATTLE_STUN');
      battle.stun = C.COMBAT.wrongStun;
      battle.qCooldown = C.COMBAT.wrongStun;
      battle.retryQuestion = true;
      battle.fbT = wrongFeedbackDuration();
      battle.feedback = quizFeedback(false, `✗ Sai! ${questionCorrection(q)}${guarded ? ` • 🛡 Combo Guard giữ x${battle.combo}` : ''}`);
      enemyAttack(battle, 'Sai đáp án');
    }
  }

  function resetAttackGauge(b) {
    b.botCycleMs = nextAttackCycleMs();
    b.botNextIn = b.botCycleMs;
  }
  function enemyAttack(b, reason = '') {
    if (!b || b.phase !== 'fight' || b.pendingLose > 0) return;
    playSFX('BATTLE_ENEMY_ATTACK');
    const dmg = rnd(b.mon.atk);
    player.hp = Math.max(0, player.hp - dmg);
    playSFX('BATTLE_PLAYER_DAMAGE');
    const meaningAttack = !!kanjiAnimation(b.mon);
    b.flash = meaningAttack ? 260 : 180; b.shake = meaningAttack ? 340 : b.shake;
    b.botFlash = 320; b.enemyAttackT = meaningAttack ? 680 : 520; b.enemyAttackTotal = b.enemyAttackT; b.playerHitT = meaningAttack ? 440 : 360;
    b.damageNumbers.push({ text: `-${dmg}`, side: 'player', t: 900, total: 900, color: '#ff8585' });
    b.playerHitMsg = `${b.mon.name} tấn công! -${dmg} HP`;
    if (reason && !b.feedback) { b.feedback = { good: false, text: `⚠ ${reason} — ${b.playerHitMsg}` }; b.fbT = 1000; }
    resetAttackGauge(b);
    if (player.hp <= 0) b.pendingLose = 520;
  }
  function timeoutQuestion(b) {
    if (!b || b.qCooldown > 0 || b.stun > 0) return;
    recordAnswer(b.q, false, b.learningSession, 'battle');
    const guarded = applyComboGuard(b);
    playSFX('KANJI_INCORRECT'); playSFX('BATTLE_STUN');
    b.stun = C.COMBAT.wrongStun;
    b.qCooldown = C.COMBAT.wrongStun;
    b.retryQuestion = true;
    b.selectedIndex = -1; b.revealAnswer = true;
    b.fbT = wrongFeedbackDuration();
    b.feedback = quizFeedback(false, `⌛ Hết giờ! ${questionCorrection(b.q)} — quái phản công!${guarded ? ` • 🛡 giữ x${b.combo}` : ''}`);
    enemyAttack(b);
  }
  function makeBattleParticles(kind, count) {
    const colors = kind === 'water' ? ['#bdf7ff', '#58d9ef', '#208fe0'] : ['#d9ff9e', '#7dda58', '#2d9848'];
    return Array.from({ length: count }, (_, i) => ({
      x: .48 + Math.random() * .18, y: .48 + Math.random() * .16,
      vx: (Math.random() - .35) * .00032, vy: (-.00018 - Math.random() * .00025),
      size: 3 + Math.random() * 7, t: 650 + Math.random() * 350,
      color: colors[i % colors.length],
    }));
  }

  function win() {
    if (battle.counted) return;
    battle.counted = true;
    battle.phase = 'end'; battle.result = 'win';
    finalizeLearningSession(battle.learningSession);
    playSFX('BATTLE_DEFEATED');
    const masteryResult = awardWin(battle.mon.kanji, { kind: battle.kind, monId: battle.monId });
    // thu thập monster vào Dex (nếu chưa có)
    const newlyCollected = !isCollected(battle.monId);
    if (newlyCollected) { collect(battle.monId); playSFX('PROGRESSION_ACHIEVEMENT'); }
    if (masteryResult.leveledUp) playSFX('PROGRESSION_LEVELUP');
    const levelText = masteryResult.leveledUp ? ` — LV UP! Lv.${masteryResult.beforeLevel} → Lv.${masteryResult.level} (${levelLabel(masteryResult.level)})` : '';
    battle.endMsg = `🎉 Thắng ${battle.mon.name}! 「${battle.mon.kanji}」 +${masteryResult.mpGain} MP${levelText}${masteryResult.level >= C.KLEVEL.maxLevel ? ' • MASTERED ✦' : ''}  •  📚 Chính xác: ${learningAccuracy()}%`;
    if (autoRideActive) battle.autoResumeT = 1400;
  }
  function lose() {
    if (battle.counted) return;
    battle.counted = true;
    battle.phase = 'end'; battle.result = 'lose';
    finalizeLearningSession(battle.learningSession);
    playSFX('BATTLE_GAME_OVER');
    const masteryResult = awardLoss(battle.mon.kanji);
    player.hp = player.maxHp;
    battle.endMsg = `💀 Bạn gục ngã... 「${battle.mon.kanji}」 Recall ${masteryResult.recall}% — MP/Level được bảo toàn${masteryResult.chained ? ' (đã phạt chuỗi thua)' : ''}. Hồi máu.  •  📚 Chính xác: ${learningAccuracy()}%`;
    if (autoRideActive) battle.autoResumeT = 1400;
  }
  function tryRun() {
// Bỏ chạy là quyết định rời vòng patrol: tắt Auto Ride ngay cả khi lần
    // escape thất bại để trận hiện tại hoặc trận kế tiếp không tự resume.
    if (autoRideActive) stopAutoRide();
    if (Math.random() < C.COMBAT.runChance) { playSFX('BATTLE_ESCAPE_SUCCESS'); battle.phase = 'end'; battle.result = 'run'; battle.endMsg = '💨 Chạy thoát thành công!'; }
    else { playSFX('BATTLE_ESCAPE_FAIL'); battle.feedback = { good: false, text: '💨 Không thoát được!' }; battle.fbT = 900; }
  }
  function endBattle() { setState('overworld'); battle = null; }

  function isCollected(id) { return !!petData[id]; }
  function collect(id) {
    if (!C.MONSTERS[id]) return false;
    if (!petData[id]) petData[id] = { evolveStage: 0 };
    saveGame();
    return true;
  }
  function equipPet(id) {
    const monster = C.MONSTERS[id];
    if (!monster || !ensureMastery(monster.kanji).captured || !collect(id)) return false;
    currentPetId = id;
    resetPetTrail();
    monsterImg(id);
    saveGame();
    return true;
  }

  // ---------- 📖 GIẢNG ĐƯỜNG + NGHI THỨC THU PHỤC ----------
  let lecture = null, capture = null;
  function academyDexList() {
    const ordered = [], seen = new Set();
    for (const [tierId, tier] of Object.entries(CATALOG.tiers || {})) {
      if (!isTierUnlocked(tierId)) continue;
      for (const char of tier.kanji || []) {
        const info = kanjiInfo(char);
        if (info && !seen.has(char)) { ordered.push(info); seen.add(char); }
      }
    }
    for (const char of CATALOG.bonus || []) {
      const info = kanjiInfo(char);
      if (info && !seen.has(char)) { ordered.push(info); seen.add(char); }
    }
    for (const info of Object.values(KDB.KANJI)) {
      if (!seen.has(info.char) && isTierUnlocked(tierOfKanji(info.char))) ordered.push(info);
    }
    return ordered;
  }
  function academyLockedList() { return academyDexList().filter((info) => !ensureMastery(info.char).captured); }
  function academyEligibility(info) {
    if (!isTierUnlocked(tierOfKanji(info && info.char))) return `Cần huy hiệu ${((CATALOG.tiers || {})[tierOfKanji(info && info.char)] || {}).requiresBadge || 'trước'}`;
    if (!info || !C.MONSTERS[info.monId]) return 'Thiếu monster asset/config';
    if (!(QUESTIONS_BY_KANJI.get(info.char) || []).length) return 'Thiếu câu hỏi';
    return '';
  }
  function nextLectureKanji() {
    const info = academyLockedList()[0];
    return info ? info.char : null;
  }
  function pendingAcademyKanji() {
    const draftChar = learning.academyDraft && resolveKanji(learning.academyDraft.char);
    if (draftChar && kanjiInfo(draftChar) && !ensureMastery(draftChar).captured) return draftChar;
    const pending = academyDexList().find((info) => ensureMastery(info.char).lectured && !ensureMastery(info.char).captured);
    return pending ? pending.char : null;
  }
  function academyMenuItems() {
    const items = [
      { action: 'guided', title: 'HỌC THEO LỘ TRÌNH', desc: 'Kanji chưa unlock đầu tiên theo thứ tự KanjiDex' },
      { action: 'picker', title: 'CHỌN KANJI MỚI', desc: 'Tự chọn một chữ chưa unlock trong danh sách' },
    ];
    const pending = pendingAcademyKanji();
    if (pending) items.push({ action: 'resume', title: `TIẾP TỤC 「${pending}」`, desc: 'Quay lại bài học hoặc nghi thức đang dang dở', char: pending });
    return items;
  }
  function openAcademyLobby(message = '') {
    lecture = { phase: 'lobby', menuSel: 0, message, hitboxes: [] };
    setState('lecture');
    return true;
  }
  function enterLecture(char = '') {
    window.KanjiGOQuestionPack?.load?.();
    const entered = char ? startAcademyLesson(resolveKanji(char), true) : openAcademyLobby();
    if (entered) playSFX('WORLD_KNOWLEDGE_HALL');
    return entered;
  }
  function openAcademyPicker() {
    lecture = { phase: 'picker', pickerSel: 0, pickerScrollY: 0, pickerMaxScroll: 0, pickerDrag: null,
      search: '', group: 'ALL', sort: 'curriculum', message: '', hitboxes: [] };
    setState('lecture');
  }
  const ACADEMY_SORTS = [
    { id: 'curriculum', label: 'LỘ TRÌNH' },
    { id: 'kanji', label: 'KANJI' },
    { id: 'meaning', label: 'NGHĨA' },
  ];
  function academyPickerGroups() {
    const present = new Set(academyLockedList().map((info) => tierOfKanji(info.char)));
    const ordered = [...((C.PROGRESSION && C.PROGRESSION.order) || []), 'BONUS'];
    return ['ALL', ...ordered.filter((tier, index) => present.has(tier) && ordered.indexOf(tier) === index)];
  }
  function cycleAcademyGroup() {
    const groups = academyPickerGroups(), current = Math.max(0, groups.indexOf(lecture.group || 'ALL'));
    lecture.group = groups[(current + 1) % groups.length]; lecture.pickerSel = 0; lecture.pickerScrollY = 0;
  }
  function cycleAcademySort() {
    const current = Math.max(0, ACADEMY_SORTS.findIndex((mode) => mode.id === lecture.sort));
    lecture.sort = ACADEMY_SORTS[(current + 1) % ACADEMY_SORTS.length].id; lecture.pickerSel = 0; lecture.pickerScrollY = 0;
  }
  function academyFilteredList() {
    const group = (lecture && lecture.group) || 'ALL';
    const query = String((lecture && lecture.search) || '').trim().toLowerCase();
    let list = academyLockedList().filter((info) => group === 'ALL' || tierOfKanji(info.char) === group);
    if (query) list = list.filter((info) => [info.char, info.meaning, ...(info.on || []), ...(info.kun || [])].join(' ').toLowerCase().includes(query));
    const sort = (lecture && lecture.sort) || 'curriculum';
    if (sort === 'kanji') list.sort((a, b) => a.char.localeCompare(b.char, 'ja'));
    else if (sort === 'meaning') list.sort((a, b) => a.meaning.localeCompare(b.meaning, 'vi') || a.char.localeCompare(b.char, 'ja'));
    return list;
  }
  function academyPickerLayout(W = SCREEN_W / ((lecture && lecture.uiScale) || 1), H = SCREEN_H / ((lecture && lecture.uiScale) || 1)) {
    const area = academyContent(W), cols = academyPickerCols(), gap = 12, cardH = 132;
    const gridY = 218, gridBottom = H - 38, availableH = Math.max(cardH, gridBottom - gridY);
    const cardW = (area.w - gap * (cols - 1)) / cols;
    return { area, cols, gap, cardW, cardH, gridY, gridBottom, availableH };
  }
  function clampAcademyPickerScroll() {
    if (!lecture) return;
    lecture.pickerScrollY = Math.max(0, Math.min(lecture.pickerMaxScroll || 0, Number(lecture.pickerScrollY) || 0));
  }
  function ensureAcademySelectionVisible() {
    if (!lecture || lecture.phase !== 'picker') return;
    const list = academyFilteredList(); if (!list.length) return;
    const layout = academyPickerLayout(), row = Math.floor((lecture.pickerSel || 0) / layout.cols);
    const top = row * (layout.cardH + layout.gap), bottom = top + layout.cardH;
    if (top < lecture.pickerScrollY) lecture.pickerScrollY = top;
    else if (bottom > lecture.pickerScrollY + layout.availableH) lecture.pickerScrollY = bottom - layout.availableH;
    clampAcademyPickerScroll();
  }
  function selectAcademyMenu(action, char = '') {
    if (action === 'picker') { openAcademyPicker(); return; }
    const target = action === 'resume' ? resolveKanji(char || pendingAcademyKanji()) : nextLectureKanji();
    if (!target) {
      const n5 = tierProgress('N5');
      const message = !hasBadge('N5')
        ? `📚 Tiến độ N5: ${n5.captured}/${n5.total}. Content còn thiếu ${n5.missing} chữ.`
        : '🎓 Bạn đã unlock toàn bộ Kanji hiện có trong KanjiDex!';
      openAcademyLobby(message); return;
    }
    startAcademyLesson(target, action === 'resume');
  }
  function academyQuestion(index, previousKey = '', sourcePool = null) {
    const modes = ['m1', 'm6', 'm7'];
    const shown = (sourcePool || lecture.examples).filter((question) => lecture.seenVocabIds.includes(question.id));
    return makeQuestion(lecture.char, previousKey, modes[index % modes.length], true, shown.length ? shown : lecture.examples);
  }
  function saveAcademyDraft() {
    if (!lecture || !lecture.char || ensureMastery(lecture.char).captured || lecture.phase === 'summary') return;
    learning.academyDraft = {
      version: 2, char: lecture.char, phase: lecture.phase, cardIndex: lecture.cardIndex || 0,
      cardRevealed: lecture.cardRevealed === true, seenVocabIds: [...lecture.seenVocabIds],
      checkIndex: lecture.checkIndex || 0, lessonScore: lecture.lessonScore || 0,
      checkResults: [...lecture.checkResults], missedVocabIds: [...lecture.missedVocabIds],
      recapIds: [...lecture.recapIds], recapIndex: lecture.recapIndex || 0,
      confirmTotal: lecture.confirmTotal || 0, confirmIndex: lecture.confirmIndex || 0,
      confirmScore: lecture.confirmScore || 0, answerLocked: lecture.answerLocked === true,
      selectedIndex: Number.isInteger(lecture.selectedIndex) ? lecture.selectedIndex : -1,
      feedback: lecture.feedback || '', q: lecture.q ? { ...lecture.q, options: [...lecture.q.options] } : null,
    };
    saveLearning({ immediate: true });
  }
  function markCurrentAcademyCardSeen() {
    if (!lecture || lecture.phase !== 'cards') return;
    const question = lecture.examples[lecture.cardIndex]; if (!question) return;
    if (!lecture.seenVocabIds.includes(question.id)) lecture.seenVocabIds.push(question.id);
    markVocabularySeen(question, Date.now(), false);
  }
  function revealAcademyCard() {
    if (!lecture || lecture.phase !== 'cards' || lecture.cardRevealed) return;
    lecture.cardRevealed = true;
    markCurrentAcademyCardSeen();
    saveAcademyDraft();
  }
  function showAcademyCard(index, reveal = false) {
    if (!lecture || !lecture.examples.length) return;
    lecture.cardIndex = Math.max(0, Math.min(lecture.examples.length - 1, Number(index) || 0));
    lecture.cardRevealed = reveal === true;
    if (lecture.cardRevealed) markCurrentAcademyCardSeen();
    saveAcademyDraft();
  }
  function beginAcademyCheck() {
    lecture.phase = 'check'; lecture.checkIndex = 0; lecture.lessonScore = 0;
    lecture.checkResults = []; lecture.missedVocabIds = [];
    lecture.q = academyQuestion(0); lecture.feedback = ''; lecture.answerLocked = false; lecture.selectedIndex = -1;
    playQuestionPronunciation(lecture.q);
  }
  function prepareAcademyRecap() {
    const missed = [...new Set(lecture.missedVocabIds)].filter((id) => VOCABULARY_BY_ID.has(id));
    // A low score gets at least two cards, even when random selection happened
    // to repeat the same weak word.
    if (lecture.lessonScore <= 1) {
      const weakest = [...lecture.examples].sort((a, b) => questionScore(a) - questionScore(b));
      for (const question of weakest) if (!missed.includes(question.id)) missed.push(question.id);
      if (missed.length > 2) missed.length = Math.max(2, Math.min(3, missed.length));
    }
    lecture.recapIds = missed.length ? missed : lecture.examples.slice(0, 1).map((question) => question.id);
    lecture.recapIndex = 0; lecture.confirmTotal = lecture.lessonScore === 2 ? 1 : 2;
    lecture.confirmIndex = 0; lecture.confirmScore = 0; lecture.phase = 'recap';
    lecture.q = null; lecture.answerLocked = false; lecture.selectedIndex = -1;
    lecture.feedback = lecture.lessonScore === 2
      ? 'Ôn nhanh đúng thẻ vừa nhầm, rồi xác nhận lại một câu.'
      : 'Mình cùng xem lại các từ còn yếu trước khi xác nhận nhé.';
  }
  function beginAcademyConfirmation() {
    const pool = lecture.recapIds.map((id) => VOCABULARY_BY_ID.get(id)).filter(Boolean);
    lecture.phase = 'confirm'; lecture.confirmIndex = 0; lecture.answerLocked = false; lecture.selectedIndex = -1;
    lecture.feedback = ''; lecture.q = academyQuestion(lecture.checkIndex + 1, '', pool);
    playQuestionPronunciation(lecture.q);
  }
  function finishLecture() {
    ensureMastery(lecture.char).lectured = true;
    lecture.phase = 'ready'; lecture.q = null; lecture.answerLocked = false;
    lecture.feedback = lecture.lessonScore === 3
      ? 'Xuất sắc 3/3 — bạn có thể vào nghi thức ngay.'
      : `Đã ôn thích ứng ${lecture.recapIds.length} thẻ • xác nhận ${lecture.confirmScore}/${lecture.confirmTotal}.`;
    saveAcademyDraft(); saveLearning({ immediate: true });
  }
  function academyPreviousStep() {
    if (!lecture) return false;
    if (lecture.phase === 'cards') {
      if (lecture.cardIndex > 0) showAcademyCard(lecture.cardIndex - 1, true);
      else { lecture.phase = 'readings'; lecture.cardRevealed = false; saveAcademyDraft(); }
      return true;
    }
    if (lecture.phase === 'readings') {
      lecture.phase = 'intro'; saveAcademyDraft(); return true;
    }
    if (lecture.phase === 'recap' && lecture.recapIndex > 0) {
      lecture.recapIndex--; saveAcademyDraft(); return true;
    }
    return false;
  }
  function academyNextStep() {
    if (!lecture) return;
    if (lecture.phase === 'intro') lecture.phase = 'readings';
    else if (lecture.phase === 'readings') { lecture.phase = 'cards'; showAcademyCard(0, false); return; }
    else if (lecture.phase === 'cards') {
      if (!lecture.cardRevealed) { revealAcademyCard(); return; }
      else if (lecture.cardIndex < lecture.examples.length - 1) showAcademyCard(lecture.cardIndex + 1, false);
      else beginAcademyCheck();
    } else if (lecture.phase === 'check' && lecture.answerLocked) {
      lecture.checkIndex++;
      if (lecture.checkIndex >= 3) {
        if (lecture.lessonScore === 3) finishLecture(); else prepareAcademyRecap();
      } else {
        const previous = lecture.q && lecture.q.key;
        lecture.q = academyQuestion(lecture.checkIndex, previous);
        lecture.feedback = ''; lecture.answerLocked = false; lecture.selectedIndex = -1;
        playQuestionPronunciation(lecture.q);
      }
    } else if (lecture.phase === 'recap') {
      if (lecture.recapIndex < lecture.recapIds.length - 1) lecture.recapIndex++;
      else beginAcademyConfirmation();
    } else if (lecture.phase === 'confirm' && lecture.answerLocked) {
      lecture.confirmIndex++;
      if (lecture.confirmIndex >= lecture.confirmTotal) finishLecture();
      else {
        const pool = lecture.recapIds.map((id) => VOCABULARY_BY_ID.get(id)).filter(Boolean);
        lecture.q = academyQuestion(lecture.checkIndex + lecture.confirmIndex + 1, lecture.q && lecture.q.key, pool);
        lecture.feedback = ''; lecture.answerLocked = false; lecture.selectedIndex = -1;
        playQuestionPronunciation(lecture.q);
      }
    } else if (lecture.phase === 'ready') startCapture(lecture.char);
    else if (lecture.phase === 'summary') openAcademyLobby();
    saveAcademyDraft();
  }
  function answerLecture(idx) {
    if (!lecture || !['check', 'confirm'].includes(lecture.phase) || lecture.answerLocked || !lecture.q) return;
    const correct = idx === lecture.q.correctIndex;
    recordVocabularyEvidence(lecture.q, correct, { context: 'academy', allowRecall: false, allowMastery: false });
    playSFX(correct ? 'KANJI_CORRECT' : 'KANJI_INCORRECT');
    if (lecture.phase === 'check') {
      if (correct) lecture.lessonScore++;
      lecture.checkResults.push({ vocabId: lecture.q.vocabId, mode: lecture.q.mode, correct });
      if (!correct && !lecture.missedVocabIds.includes(lecture.q.vocabId)) lecture.missedVocabIds.push(lecture.q.vocabId);
    } else if (correct) lecture.confirmScore++;
    lecture.selectedIndex = idx; lecture.answerLocked = true;
    lecture.feedback = correct ? '✓ Chính xác! Bạn đã tự nhớ lại được.' : `✗ ${questionCorrection(lecture.q)} — xem lại liên kết trong thẻ nhé.`;
    saveAcademyDraft();
  }
  function startAcademyLesson(char, resume = false) {
    const target = resolveKanji(char), info = kanjiInfo(target);
    if (!info || ensureMastery(target).captured) { openAcademyLobby('Kanji này đã được unlock hoặc không còn trong dữ liệu.'); return false; }
    const problem = academyEligibility(info);
    if (problem) { openAcademyLobby(`⚠ 「${target}」 chưa thể học: ${problem}.`); return false; }
    const examples = vocabularyQuestionsForKanji(target);
    const s = ensureMastery(target), draft = learning.academyDraft;
    const resumable = ['intro', 'readings', 'examples', 'cards', 'check', 'recap', 'confirm'];
    const fromDraft = resume && draft && resolveKanji(draft.char) === target;
    let phase = s.lectured ? 'ready' : 'intro';
    if (fromDraft && resumable.includes(draft.phase)) {
      phase = draft.phase === 'examples' || ((Number(draft.version) || 0) < 2 && draft.phase === 'check') ? 'cards' : draft.phase;
    }
    const validIds = new Set(examples.map((question) => question.id));
    lecture = {
      char: target, info, examples, phase,
      cardIndex: fromDraft ? Math.max(0, Math.min(examples.length - 1, Number(draft.cardIndex) || 0)) : 0,
      cardRevealed: fromDraft && draft.cardRevealed === true,
      seenVocabIds: fromDraft && Array.isArray(draft.seenVocabIds) ? draft.seenVocabIds.filter((id) => validIds.has(id)) : [],
      checkIndex: fromDraft ? Math.max(0, Math.min(2, Number(draft.checkIndex) || 0)) : 0,
      lessonScore: fromDraft ? Math.max(0, Math.min(3, Number(draft.lessonScore) || 0)) : 0,
      checkResults: fromDraft && Array.isArray(draft.checkResults) ? draft.checkResults.filter((result) => validIds.has(result.vocabId)) : [],
      missedVocabIds: fromDraft && Array.isArray(draft.missedVocabIds) ? draft.missedVocabIds.filter((id) => validIds.has(id)) : [],
      recapIds: fromDraft && Array.isArray(draft.recapIds) ? draft.recapIds.filter((id) => validIds.has(id)) : [],
      recapIndex: fromDraft ? Math.max(0, Number(draft.recapIndex) || 0) : 0,
      confirmTotal: fromDraft ? Math.max(0, Math.min(2, Number(draft.confirmTotal) || 0)) : 0,
      confirmIndex: fromDraft ? Math.max(0, Math.min(1, Number(draft.confirmIndex) || 0)) : 0,
      confirmScore: fromDraft ? Math.max(0, Math.min(2, Number(draft.confirmScore) || 0)) : 0,
      q: null, answerLocked: fromDraft && draft.answerLocked === true, selectedIndex: fromDraft ? Number(draft.selectedIndex) : -1,
      feedback: fromDraft && typeof draft.feedback === 'string' ? draft.feedback : '', message: '', hitboxes: [],
    };
    const restoredQ = fromDraft && draft.q && draft.q.target === target && validIds.has(draft.q.vocabId) ? draft.q : null;
    if (['check', 'confirm'].includes(phase)) lecture.q = restoredQ || (phase === 'check' ? academyQuestion(lecture.checkIndex) : academyQuestion(lecture.checkIndex + lecture.confirmIndex + 1, '', lecture.recapIds.map((id) => VOCABULARY_BY_ID.get(id)).filter(Boolean)));
    playQuestionPronunciation(lecture.q);
    if (phase === 'cards' && lecture.cardRevealed) markCurrentAcademyCardSeen();
    setState('lecture'); saveAcademyDraft();
    return true;
  }
  function onLectureKey(k) {
    if (!lecture) return;
    if (k === 'escape') {
      if (lecture.phase === 'lobby') { setState('overworld'); lecture = null; }
      else openAcademyLobby();
      return;
    }
    if (lecture.phase === 'lobby') {
      const items = academyMenuItems();
      if (k === 'arrowup' || k === 'w') lecture.menuSel = (lecture.menuSel - 1 + items.length) % items.length;
      else if (k === 'arrowdown' || k === 's') lecture.menuSel = (lecture.menuSel + 1) % items.length;
      else if (['1', '2', '3'].includes(k) && Number(k) <= items.length) { const item = items[Number(k) - 1]; selectAcademyMenu(item.action, item.char); }
      else if (k === ' ' || k === 'enter') { const item = items[lecture.menuSel || 0]; selectAcademyMenu(item.action, item.char); }
      return;
    }
    if (lecture.phase === 'picker') {
      const list = academyFilteredList();
      if (k === 'tab') cycleAcademyGroup();
      else if (k === 'f2') cycleAcademySort();
      else if (k === 'arrowleft') lecture.pickerSel = Math.max(0, lecture.pickerSel - 1);
      else if (k === 'arrowright') lecture.pickerSel = Math.min(Math.max(0, list.length - 1), lecture.pickerSel + 1);
      else if (k === 'arrowup') lecture.pickerSel = Math.max(0, lecture.pickerSel - academyPickerCols());
      else if (k === 'arrowdown') lecture.pickerSel = Math.min(Math.max(0, list.length - 1), lecture.pickerSel + academyPickerCols());
      else if ((k === ' ' || k === 'enter') && list.length && !academyEligibility(list[lecture.pickerSel])) startAcademyLesson(list[lecture.pickerSel].char);
      else if (k === 'backspace') { lecture.search = lecture.search.slice(0, -1); lecture.pickerSel = 0; lecture.pickerScrollY = 0; }
      else if (k.length === 1 && /^[\p{L}\p{N}]$/u.test(k)) { lecture.search += k; lecture.pickerSel = 0; lecture.pickerScrollY = 0; }
      if (k.startsWith('arrow')) ensureAcademySelectionVisible();
      return;
    }
    if (['readings', 'cards', 'recap'].includes(lecture.phase) && k === 'arrowleft') {
      academyPreviousStep();
      return;
    }
    if (['cards', 'recap'].includes(lecture.phase) && k === 'arrowright') {
      if (lecture.phase === 'cards' && lecture.cardRevealed && lecture.cardIndex < lecture.examples.length - 1) showAcademyCard(lecture.cardIndex + 1, false);
      else if (lecture.phase === 'recap') { lecture.recapIndex = Math.min(lecture.recapIds.length - 1, lecture.recapIndex + 1); saveAcademyDraft(); }
      return;
    }
    if (['check', 'confirm'].includes(lecture.phase) && ['1', '2', '3', '4'].includes(k)) { answerLecture(parseInt(k, 10) - 1); return; }
    if (k === ' ' || k === 'enter') academyNextStep();
  }
  function startCapture(char = '') {
    const target = resolveKanji(char || (lecture && lecture.char) || nextLectureKanji()), info = kanjiInfo(target);
    if (!info) return false;
    monsterImg(info.monId);
    const s = ensureMastery(target);
    if (!s.lectured) { showToast('Hãy học chữ này ở giảng đường trước.'); return false; }
    if (s.captured) { showToast('Chữ này đã được thu phục rồi.'); return false; }
    const attempt = (Number(learning.captureAttempts[target]) || 0) + 1;
    learning.captureAttempts[target] = attempt;
    const learnedQuestions = vocabularyQuestionsForKanji(target, true);
    capture = { char: target, info, attempt, needed: attempt >= C.CAPTURE.relaxFromAttempt ? 3 : 4,
      vocabIds: learnedQuestions.map((question) => question.id), q: captureQuestion(target, 0, '', learnedQuestions),
      index: 0, correct: 0, phase: 'fight', qCooldown: 0,
      feedback: null, fbT: 0, selectedIndex: -1, revealAnswer: false, burstT: 0, hint: attempt >= C.CAPTURE.relaxFromAttempt + 1,
      catchEffectT: 0, catchEffectTotal: 0,
      learningSession: createLearningSession('capture') };
    playQuestionPronunciation(capture.q);
    setState('capture');
    playSFX('CAPTURE_START');
    saveGame(); saveLearning();
    return true;
  }
  function captureQuestion(target, index, previousKey = '', sourcePool = null) {
    const captureModes = new Set(['m1', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11', 'm12']);
    const modes = questionModesForLevel(ensureMastery(target).level).filter((mode) => captureModes.has(mode));
    return makeQuestion(target, previousKey, modes[index % modes.length], false, sourcePool);
  }
  function finishCapture() {
    const passed = capture.correct >= capture.needed, s = ensureMastery(capture.char);
    finalizeLearningSession(capture.learningSession);
    if (passed) {
      s.captured = true;
      const kpResult = evaluateKanjiMilestones(capture.char, { save: false, toast: true });
      collect(capture.info.monId);
      const tour = onboardingTour(), starter = tour && resolveKanji(tour.profile.starterKanji || '一');
      const starterCaptured = tour && tour.stop.action === 'academy' && starter === resolveKanji(capture.char);
      if (starterCaptured) {
        currentPetId = capture.info.monId; resetPetTrail();
        window.KanjiGOCharacters?.setOnboardingTourStep?.(tour.index + 1);
      }
      saveLearning({ immediate: true }); saveGame();
      capture.feedback = `🎉 Thu phục thành công ${capture.char}!${kpResult.kp ? `  +${kpResult.kp} KP` : ''}${starterCaptured ? '  •  Hoàn tất tour để mascot đi cùng!' : ''}`;
      // Nghi thức thành công phát lại chính tuyệt kỹ semantic của
      // Kanji vừa bắt, thay cho vòng sáng xanh dùng chung.
      capture.catchEffectTotal = 1500;
      capture.catchEffectT = capture.catchEffectTotal;
      playSFX('PROGRESSION_ACHIEVEMENT');
      if (learning.academyDraft && resolveKanji(learning.academyDraft.char) === capture.char) learning.academyDraft = null;
    } else {
      capture.feedback = `Chưa đủ điểm (${capture.correct}/5). Không sao, hãy xem lại đáp án rồi thử lại nhé!`;
      playSFX('CAPTURE_FAILURE');
    }
    capture.passed = passed;
    capture.endMsg = capture.feedback;
    capture.phase = 'end';
    saveLearning({ immediate: true });
  }
  function answerCapture(idx) {
    if (!capture || capture.phase !== 'fight' || capture.qCooldown > 0) return;
    const q = capture.q, correct = idx === q.correctIndex;
    capture.selectedIndex = idx; capture.revealAnswer = true;
    recordAnswer(q, correct, capture.learningSession, 'capture');
    playSFX(correct ? 'KANJI_CORRECT' : 'KANJI_INCORRECT');
    if (correct) capture.correct++;
    capture.feedback = correct ? quizFeedback(true, '✓ Đúng!') : quizFeedback(false, `✗ ${questionCorrection(q)}`);
    capture.fbT = correct ? 650 : wrongFeedbackDuration(); capture.burstT = correct ? 520 : 0; capture.qCooldown = capture.fbT; capture.index++;
    if (capture.index >= 5) capture.pendingEnd = true;
  }
  function onCaptureKey(k) {
    if (!capture) return;
    if (capture.phase === 'end') {
      if (k === ' ' || k === 'enter') {
        const result = capture;
        capture = null;
        if (result.passed) {
          lecture = { phase: 'summary', char: result.char, info: result.info, score: result.correct, hitboxes: [] };
          setState('lecture');
        } else startAcademyLesson(result.char, true);
      }
      return;
    }
    if (k === 'escape') { setState('overworld'); capture = null; return; }
    if (['1', '2', '3', '4'].includes(k)) answerCapture(parseInt(k, 10) - 1);
  }

  // ---------- ⛩ PVE MINI TEST ----------
  let pve = null;
  let gymMenu = { options: [], selected: 0, hitboxes: [] };
  const TRAINER_DEFINITIONS = ((C.TRAINER_ARENA && C.TRAINER_ARENA.trainers) || []);
  const TRAINER_BY_ID = new Map(TRAINER_DEFINITIONS.map((trainer) => [trainer.id, trainer]));
  // 4x4 atlas order mirrors the semantic Trainer list. A single atlas keeps
  // these map markers consistent across platforms and avoids expensive emoji
  // font fallback during every overworld frame.
  const TRAINER_THEME_ICON_INDEX = {
    gardener: 0, parent: 1, student: 2, timekeeper: 3,
    traveler: 4, chef: 5, conductor: 6, neighbor: 7,
    explorer: 8, weather_kid: 9, doctor: 10, citizen: 11,
    merchant: 12, librarian: 13, artist: 14, gym: 15,
  };
  // The authored atlas has transparent gutters rather than a strict 64px
  // grid. These 56px windows follow those gutters, keeping every icon centred
  // and preventing the next/previous icon from leaking into the crop.
  const TRAINER_THEME_ATLAS_COLUMNS = [16, 70, 124, 181];
  const TRAINER_THEME_ATLAS_ROWS = [17, 73, 127, 181];
  const TRAINER_THEME_ATLAS_CELL = 56;
  function trainerTeam(id) {
    const trainer = TRAINER_BY_ID.get(id); if (!trainer) return [];
    const order = new Map(trainer.kanji.map((char, index) => [char, index]));
    return trainer.kanji.filter((char) => kanjiInfo(char) && ensureMastery(char).captured && tierOfKanji(char) === String((C.TRAINER_ARENA && C.TRAINER_ARENA.tier) || 'N5').toUpperCase())
      .sort((a, b) => ensureMastery(a).recall - ensureMastery(b).recall || order.get(a) - order.get(b))
      .slice(0, Math.max(1, Number(C.TRAINER_ARENA && C.TRAINER_ARENA.teamSize) || 5));
  }
  function trainerStatus(id) {
    const trainer = TRAINER_BY_ID.get(id);
    if (!trainer) return { id, state: 'missing', trainer: null, team: [], collected: 0, required: 0 };
    const eligible = trainer.kanji.filter((char) => kanjiInfo(char) && tierOfKanji(char) === String(C.TRAINER_ARENA.tier || 'N5').toUpperCase());
    const collected = eligible.filter((char) => ensureMastery(char).captured).length;
    const required = Math.min(eligible.length, Math.max(1, Number(trainer.minCollected || C.TRAINER_ARENA.minCollected) || 3));
    const defeated = learning.trainerWins[id] === true;
    return { id, trainer, team: trainerTeam(id), collected, total: eligible.length, required, defeated, state: collected < required ? 'locked' : defeated ? 'defeated' : 'ready' };
  }
  function trainerWinsCount() { return TRAINER_DEFINITIONS.reduce((count, trainer) => count + (learning.trainerWins[trainer.id] === true ? 1 : 0), 0); }
  function interactTrainer(id, npc = null) {
    const status = trainerStatus(id);
    if (!status.trainer) { showToast('Trainer chưa được cấu hình.'); return false; }
    if (status.state === 'locked') {
      dialog = { active: true, idx: 0, npc: { ...(npc || {}), lines: [
        `${status.trainer.icon} ${status.trainer.name} — Chủ đề ${status.trainer.theme}`,
        `🔒 Cần thu phục ít nhất ${status.required} chữ trong nhóm: ${status.trainer.kanji.join(' ・ ')}`,
        `Tiến độ hiện tại: ${status.collected}/${status.required}. Hãy học thêm tại Giảng đường rồi quay lại.`,
      ] } };
      return false;
    }
    return startTrainer(id);
  }
  function startTrainer(id) {
    const status = trainerStatus(id);
    if (!status.trainer || status.state === 'locked' || !status.team.length) return false;
    return startPve({ mode: 'trainer', tier: C.TRAINER_ARENA.tier || 'N5', trainerId: id, pool: status.team,
      questions: C.TRAINER_ARENA.questions, passRatio: C.TRAINER_ARENA.passRatio });
  }
  function randomCapturedKanji(tier = '') {
    const pool = capturedKanji(tier);
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  }
  function tierKanjiPool(tier = '') {
    const definition = (CATALOG.tiers || {})[String(tier).toUpperCase()];
    return [...new Set((definition && definition.kanji) || [])].filter((char) => {
      const info = kanjiInfo(char);
      return info && C.MONSTERS[info.monId];
    });
  }
  function gymEligibility(tier = 'N5') {
    const id = String(tier).toUpperCase(), gym = C.PROGRESSION && C.PROGRESSION.gym && C.PROGRESSION.gym[id];
    const pool = tierKanjiPool(id), captured = pool.filter((char) => ensureMastery(char).captured).length;
    const requiredLevel = Math.max(1, Number(gym && gym.requiredLevel) || 5);
    const atLevel = pool.filter((char) => ensureMastery(char).captured && ensureMastery(char).level >= requiredLevel).length;
    const requiredCaptured = Math.min(pool.length, Math.max(1, Number(gym && gym.requiredCaptured) || pool.length));
    const requiredAtLevel = Math.min(requiredCaptured, Math.max(0, Number(gym && gym.requiredAtLevel) || 0));
    const requiredBadge = String((gym && gym.requiresBadge) || '').toUpperCase();
    const prerequisiteTier = String((gym && gym.requiresTierComplete) || '').toUpperCase();
    const prerequisite = prerequisiteTier ? tierProgress(prerequisiteTier) : null;
    const badgeReady = !requiredBadge || hasBadge(requiredBadge);
    const prerequisiteReady = !prerequisiteTier || isTierStudyComplete(prerequisiteTier);
    return { tier: id, pool, captured, atLevel, requiredCaptured, requiredAtLevel, requiredLevel,
      requiredBadge, badgeReady, prerequisiteTier, prerequisite, prerequisiteReady,
      ready: !!gym && badgeReady && prerequisiteReady && captured >= requiredCaptured && atLevel >= requiredAtLevel,
      earned: !!gym && hasBadge(gym.badge || id) };
  }
  function gymMenuOptions() {
    const gyms = (C.PROGRESSION && C.PROGRESSION.gym) || {};
    return ((C.PROGRESSION && C.PROGRESSION.order) || Object.keys(gyms)).map((tier) => String(tier).toUpperCase())
      .filter((tier) => gyms[tier] && (tier === 'N5' || !gyms[tier].requiresBadge || hasBadge(gyms[tier].requiresBadge)));
  }
  function openGymMenu(preferredTier = 'N5') {
    const options = gymMenuOptions(); if (!options.length) return false;
    const preferred = String(preferredTier).toUpperCase();
    const nextTier = options.find((tier) => !hasBadge(tier)) || preferred;
    gymMenu = { options, selected: Math.max(0, options.indexOf(nextTier)), hitboxes: [] };
    setState('gym_select'); return true;
  }
  function closeGymMenu() { setState('overworld'); gymMenu.hitboxes = []; return true; }
  function selectGymTier(tier = gymMenu.options[gymMenu.selected]) {
    if (!tier) return false;
    return startGym(tier);
  }
  function onGymMenuKey(k) {
    if (k === 'escape') { closeGymMenu(); return; }
    const count = gymMenu.options.length; if (!count) return;
    if (k === 'arrowup' || k === 'w') gymMenu.selected = (gymMenu.selected - 1 + count) % count;
    else if (k === 'arrowdown' || k === 's') gymMenu.selected = (gymMenu.selected + 1) % count;
    else if (k === '1' || k === '2') {
      const index = Number(k) - 1; if (index < count) { gymMenu.selected = index; selectGymTier(gymMenu.options[index]); }
    } else if (k === 'enter' || k === ' ') selectGymTier();
  }
  function onGymMenuPointerDown(x, y) {
    const hit = gymMenu.hitboxes.find((box) => x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h);
    if (!hit) return;
    if (hit.action === 'close') closeGymMenu();
    else if (hit.action === 'tier') { gymMenu.selected = hit.index; selectGymTier(hit.tier); }
  }
  function refillPveQueue(previous = '') {
    if (!pve) return [];
    const pool = Array.isArray(pve.pool) ? pve.pool : [];
    pve.questionQueue = shuffle(pool.filter((char) => char !== previous));
    if (!pve.questionQueue.length && pool.length) pve.questionQueue = shuffle([...pool]);
    return pve.questionQueue;
  }
  function randomPveKanji(previous = '') {
    const pool = pve && Array.isArray(pve.pool) && pve.pool.length ? pve.pool : capturedKanji(pve ? pve.tier : '');
    if (pve && pve.useQuestionQueue) {
      if (!Array.isArray(pve.questionQueue) || !pve.questionQueue.length) refillPveQueue(previous);
      return pve.questionQueue.shift() || null;
    }
    const alternatives = pool.filter((char) => char !== previous);
    const source = alternatives.length ? alternatives : pool;
    return source.length ? source[Math.floor(Math.random() * source.length)] : null;
  }
  function makePveQuestion(target, previousKey = '') {
    if (!target) return null;
    const modes = pve && Array.isArray(pve.examModes) ? pve.examModes : [];
    const mode = modes.length ? modes[pve.index % modes.length] : '';
    return makeQuestion(target, previousKey, mode, true);
  }
  function gymGrade(ratio) { return ProgressionCore.gymGrade(ratio); }
  function gymQuestionCount(gym) {
    const range = Array.isArray(gym && gym.questionRange) ? gym.questionRange : [];
    const min = Math.max(1, Math.floor(Number(range[0]) || Number(gym && gym.questions) || C.PVE.questions));
    const max = Math.max(min, Math.floor(Number(range[1]) || min));
    return rnd([min, max]);
  }
  function recordGymAttempt(tier, result) {
    const id = String(tier).toUpperCase(), now = Date.now();
    const previous = learning.gymHistory[id] || { attempts: 0, bestRatio: -1, bestTotal: 0 };
    const ratio = Math.max(0, Math.min(1, Number(result.ratio) || 0));
    const correct = Math.max(0, Math.floor(Number(result.correct) || 0)), total = Math.max(1, Math.floor(Number(result.total) || 1));
    const grade = gymGrade(ratio, Number(result.passRatio) || .8), durationMs = Math.max(0, Number(result.durationMs) || 0);
    const history = { ...previous, attempts: Math.max(0, Number(previous.attempts) || 0) + 1,
      lastCorrect: correct, lastTotal: total, lastRatio: ratio, lastGrade: grade, lastAt: now, lastDurationMs: durationMs };
    const sameScore = ratio === Number(previous.bestRatio) && total === Number(previous.bestTotal);
    if (ratio > Number(previous.bestRatio) || (ratio === Number(previous.bestRatio) && total > Number(previous.bestTotal))
      || (sameScore && durationMs > 0 && (!Number(previous.bestDurationMs) || durationMs < Number(previous.bestDurationMs)))) {
      history.bestCorrect = correct; history.bestTotal = total; history.bestRatio = ratio; history.bestGrade = grade; history.bestAt = now;
      history.bestDurationMs = durationMs;
    }
    learning.gymHistory[id] = history; saveLearning({ immediate: true }); return history;
  }
  function startPve(options = {}) {
    if (typeof options === 'string') options = { tier: options };
    const tier = String(options.tier || '').toUpperCase();
    const configuredPool = Array.isArray(options.pool) ? [...new Set(options.pool)].filter((char) => kanjiInfo(char)) : [];
    const pool = options.allowUncaptured ? configuredPool : configuredPool.filter((char) => ensureMastery(char).captured);
    const questionQueue = options.useQuestionQueue ? shuffle([...pool]) : [];
    const target = questionQueue.length ? questionQueue.shift() : pool.length ? pool[Math.floor(Math.random() * pool.length)] : randomCapturedKanji(tier);
    if (!target) { showToast('Chưa có chữ nào được thu phục.'); return false; }
    const total = options.questions || C.PVE.questions, passRatio = Number(options.passRatio) || 0;
    const requiredCorrect = Math.ceil(total * passRatio), examMaxHp = Math.max(1, total - requiredCorrect + 1);
    const trainerBattle = (options.mode || 'practice') === 'trainer';
    pve = { index: 0, total, correct: 0, combo: 0, bestCombo: 0, phase: 'fight', qCooldown: 0,
      mode: options.mode || 'practice', tier, trainerId: options.trainerId || '', pool, passRatio: Number(options.passRatio) || 0,
      questionQueue, useQuestionQueue: options.useQuestionQueue === true, examModes: shuffle([...(options.examModes || [])]),
      correctTransitionMs: Math.max(300, Number(options.correctTransitionMs) || 550), wrongTransitionMs: Math.max(500, Number(options.wrongTransitionMs) || wrongFeedbackDuration()),
      q: null, seen: {}, feedback: null, fbT: 0, selectedIndex: -1, revealAnswer: false, pendingEnd: false,
      entranceT: 520, entranceTotal: 520, petAttackT: 0, petAttackTotal: 0, enemyAttackT: 0, enemyAttackTotal: 0, enemyHitT: 0, playerHitT: 0,
      trainerIntroT: trainerBattle ? 1200 : 0, trainerIntroTotal: trainerBattle ? 1200 : 0,
      arenaShakeT: 0, impactT: 0, impactTotal: 0, impactSide: '',
      requiredCorrect, examHp: examMaxHp, examMaxHp, ko: false, enemyHp: 1,
      rankDisplay: 0, rankTarget: 0, rankShockT: 0, rankGainT: 0,
      learningSession: createLearningSession(options.mode || 'pve') };
    pve.q = makePveQuestion(target);
    playQuestionPronunciation(pve.q);
    const info = kanjiInfo(target); if (info) monsterImg(info.monId);
    playSFX('WORLD_OPEN_ARENA');
    setState('pve'); pveResult = null;
    return true;
  }
  function startGym(tier = 'N5') {
    const id = String(tier).toUpperCase(), gym = C.PROGRESSION && C.PROGRESSION.gym && C.PROGRESSION.gym[id];
    if (!gym) { showToast(`Chưa cấu hình Gym ${id}.`); return false; }
    const eligibility = gymEligibility(id);
    if (!eligibility.ready) {
      if (!eligibility.badgeReady) { showToast(`🔒 Gym ${id}: cần PASS ${eligibility.requiredBadge} trước.`); return false; }
      if (!eligibility.prerequisiteReady) {
        const progress = eligibility.prerequisite;
        showToast(`🔒 Gym ${id}: cần thu phục đủ ${eligibility.prerequisiteTier} (${progress.captured}/${progress.total}).`); return false;
      }
      showToast(`🔒 Gym ${id}: bắt ${eligibility.captured}/${eligibility.requiredCaptured} · Lv.${eligibility.requiredLevel}+ ${eligibility.atLevel}/${eligibility.requiredAtLevel}.`);
      return false;
    }
    return startPve({ mode: 'gym', tier: id, pool: eligibility.pool, allowUncaptured: true, useQuestionQueue: true,
      questions: gymQuestionCount(gym), passRatio: gym.passRatio, examModes: gym.examModes,
      correctTransitionMs: gym.correctTransitionMs, wrongTransitionMs: gym.wrongTransitionMs });
  }
  function finishPve() {
    const sessionResult = finalizeLearningSession(pve.learningSession);
    const durationMs = sessionResult ? Math.max(0, sessionResult.finishedAt - sessionResult.startedAt) : 0;
    const ratio = pve.correct / pve.total;
    const configuredRank = C.PVE.ranks.find((item) => ratio >= item.min) || C.PVE.ranks[C.PVE.ranks.length - 1];
    const grade = pve.mode === 'gym' ? gymGrade(ratio, pve.passRatio) : configuredRank.grade;
    const gymHistory = pve.mode === 'gym' ? recordGymAttempt(pve.tier, {
      ratio, correct: pve.correct, total: pve.total, passRatio: pve.passRatio, durationMs,
    }) : null;
    const rewards = [];
    for (const char of Object.keys(pve.seen)) {
      const info = kanjiInfo(char);
      if (info) rewards.push({ kanji: char, monId: info.monId });
    }
    let badgeAwarded = '';
    let trainerDefeated = '';
    if (pve.mode === 'trainer' && ratio >= pve.passRatio && TRAINER_BY_ID.has(pve.trainerId)) {
      learning.trainerWins[pve.trainerId] = true; trainerDefeated = pve.trainerId; saveLearning({ immediate: true });
    }
    if (pve.mode === 'gym' && ratio >= pve.passRatio && !hasBadge(pve.tier)) {
      const gym = C.PROGRESSION.gym[pve.tier], badge = gym.badge || pve.tier;
      learning.badges[badge] = true; badgeAwarded = badge; saveLearning({ immediate: true });
    }
    const passed = pve.mode === 'gym' || pve.mode === 'trainer' ? ratio >= pve.passRatio : ratio >= .6;
    pveResult = { grade, ratio, correct: pve.correct, total: pve.total, bestCombo: pve.bestCombo, rewards, badgeAwarded, trainerDefeated,
      ko: pve.ko === true, gymHistory, passed };
    const gymPassed = pve.mode === 'gym' && ratio >= pve.passRatio;
    const unlockTier = badgeAwarded && C.PROGRESSION.gym[pve.tier] && C.PROGRESSION.gym[pve.tier].unlocks;
    const badgeText = badgeAwarded ? ` • 🏅 Huy hiệu ${badgeAwarded}${unlockTier ? ` — đã mở ${unlockTier}!` : ''}`
      : gymPassed ? ' • PASS — hoàn thành lượt ôn' : (pve.mode === 'gym' ? ' • Chưa đạt Gym' : '');
    const trainerText = trainerDefeated ? ` • ✅ Đã thắng ${TRAINER_BY_ID.get(trainerDefeated).name}` : (pve.mode === 'trainer' ? ' • Chưa vượt Trainer' : '');
    pve.endMsg = `KẾT QUẢ: Hạng ${grade} • ${pve.correct}/${pve.total} (${Math.round(ratio * 100)}%)${pve.ko ? ' • PET ĐÃ KIỆT SỨC' : ''} • Combo cao nhất x${pve.bestCombo}${trainerText}${badgeText}`;
    pve.phase = 'end';
  }
  function answerPve(idx) {
    if (!pve || pve.phase !== 'fight' || pve.qCooldown > 0) return;
    const q = pve.q, correct = idx === q.correctIndex;
    pve.selectedIndex = idx; pve.revealAnswer = true;
    recordAnswer(q, correct, pve.learningSession, pve.mode || 'pve'); pve.seen[q.target] = (pve.seen[q.target] || 0) + 1;
    playSFX(correct ? 'KANJI_CORRECT' : 'KANJI_INCORRECT');
    if (correct) { pve.correct++; pve.combo++; pve.bestCombo = Math.max(pve.bestCombo, pve.combo); }
    else {
      pve.combo = 0;
      if (pve.mode === 'gym') {
        pve.examHp = Math.max(0, pve.examHp - 1);
        pve.ko = pve.examHp <= 0;
      }
    }
    if (pve.mode === 'gym') {
      pve.rankTarget = pve.correct / pve.total;
      if (correct) { pve.rankGainT = 420; pve.enemyHp = 0; }
      else { pve.rankShockT = 520; pve.rankDisplay = Math.max(0, pve.rankDisplay - 1 / pve.total); }
    }
    const trainer = pve.mode === 'trainer' ? TRAINER_BY_ID.get(pve.trainerId) : null;
    pve.feedback = correct ? quizFeedback(true, `✓ Đúng! ${trainer ? 'Pet lao lên tấn công!' : 'Pet của bạn phản công!'}`)
      : quizFeedback(false, `✗ ${questionCorrection(q)}${trainer ? ` • ${trainer.name} phản công!` : ''}`);
    const petMeaningAttack = !!kanjiAnimation(C.MONSTERS[currentPetId]);
    const enemyInfo = kanjiInfo(q.target), enemyMeaningAttack = !!kanjiAnimation(enemyInfo && C.MONSTERS[enemyInfo.monId]);
    pve.fbT = correct ? pve.correctTransitionMs : pve.wrongTransitionMs;
    if (correct && petMeaningAttack) pve.fbT = Math.max(pve.fbT, 700);
    else if (!correct && enemyMeaningAttack) pve.fbT = Math.max(pve.fbT, 760);
    pve.qCooldown = pve.fbT; pve.index++;
    if (correct) {
      pve.petAttackT = petMeaningAttack ? 680 : 520; pve.petAttackTotal = pve.petAttackT; pve.enemyHitT = petMeaningAttack ? 430 : 330;
      if (petMeaningAttack) pve.arenaShakeT = 340;
      if (pve.mode === 'trainer') {
        pve.arenaShakeT = petMeaningAttack ? 340 : 240; pve.impactT = 380; pve.impactTotal = pve.impactT; pve.impactSide = 'enemy';
      }
      playSFX('BATTLE_ATTACK'); playSFX('BATTLE_CUT');
    } else {
      pve.enemyAttackT = enemyMeaningAttack ? 700 : 600; pve.enemyAttackTotal = pve.enemyAttackT; pve.playerHitT = enemyMeaningAttack ? 460 : 380;
      if (enemyMeaningAttack) pve.arenaShakeT = 360;
      if (pve.mode === 'trainer') {
        pve.arenaShakeT = enemyMeaningAttack ? 360 : 300; pve.impactT = 420; pve.impactTotal = pve.impactT; pve.impactSide = 'player';
      }
      playSFX('BATTLE_STUN');
    }
    if (pve.index >= pve.total || pve.ko) pve.pendingEnd = true;
  }
  function onPveKey(k) {
    if (!pve) return;
    if (pve.phase === 'end') { if (k === ' ' || k === 'enter') { setState('overworld'); pve = null; } return; }
    if (k === 'escape') { setState('overworld'); pve = null; return; }
    if (['1', '2', '3', '4'].includes(k)) answerPve(parseInt(k, 10) - 1);
  }

  // ---------- 📖 KANJI DEX ----------
  const DEX_SORTS = [
    { id: 'catalog', label: 'LỘ TRÌNH' },
    { id: 'kanji', label: 'KANJI A–Z' },
    { id: 'level', label: 'LEVEL CAO' },
    { id: 'recall', label: 'RECALL CAO' },
  ];
  let dex = { sel: 0, list: [], source: [], query: '', sort: 'catalog', group: true, scrollY: 0, maxScroll: 0, hitboxes: [], drag: null,
    indexByChar: new Map(), contentCache: null };
  // Dex dùng cùng catalog với Giảng đường: đúng thứ tự JLPT và không lộ tier chưa mở.
  function collectedList() { return academyDexList().map((info) => info.char); }
  function normalizeDexSearch(value) {
    return DexCore.normalizeSearch(value);
  }
  function dexMatchesSearch(char, query) {
    if (!query) return true;
    const info = kanjiInfo(char), monster = info && C.MONSTERS[info.monId];
    if (!info) return false;
    return DexCore.matchesSearch([
      info.char, info.meaning, ...(info.on || []), ...(info.kun || []),
      monster && monster.name, monster && monster.hanViet,
    ], query);
  }
  function refreshDexList(preserveChar = '') {
    const previous = preserveChar || dex.list[dex.sel] || '';
    const catalogIndex = new Map(dex.source.map((char, index) => [char, index]));
    const query = normalizeDexSearch(dex.query);
    dex.list = dex.source.filter((char) => dexMatchesSearch(char, query)).sort((a, b) => {
      if (dex.sort === 'kanji') return a.localeCompare(b, 'ja');
      if (dex.sort === 'level') return ensureMastery(b).level - ensureMastery(a).level || catalogIndex.get(a) - catalogIndex.get(b);
      if (dex.sort === 'recall') return ensureMastery(b).recall - ensureMastery(a).recall || catalogIndex.get(a) - catalogIndex.get(b);
      return catalogIndex.get(a) - catalogIndex.get(b);
    });
    dex.indexByChar = new Map(dex.list.map((char, index) => [char, index]));
    dex.contentCache = null;
    dex.sel = Math.max(0, previous ? dex.list.indexOf(previous) : 0);
    if (dex.sel < 0) dex.sel = 0;
  }
  function setDexSearch(value) {
    dex.query = String(value || '').slice(0, 40);
    refreshDexList();
    dex.scrollY = 0; dex.drag = null;
    ensureDexSelectionVisible();
  }
  function equipDexKanji(char) {
    const info = kanjiInfo(char);
    if (!info || !C.MONSTERS[info.monId] || !ensureMastery(info.char).captured) {
      showToast('Chưa thu phục — tới 🏛️ Giảng đường trước nhé!'); return false;
    }
    if (!equipPet(info.monId)) {
      showToast('Không thể chọn mascot này. Hãy thử thu phục lại trong Giảng đường.'); return false;
    }
    showToast(`🐾 ${C.MONSTERS[currentPetId].name} đang đi cùng bạn!`);
    setState('overworld'); syncDexSearchInput(); return true;
  }
  const dexSearchInput = document.getElementById('dex-search');
  const dexToolbar = document.getElementById('dex-toolbar');
  const dexSortButton = document.getElementById('dex-sort');
  const dexGroupButton = document.getElementById('dex-group');
  if (dexSearchInput) {
    dexSearchInput.addEventListener('input', () => setDexSearch(dexSearchInput.value));
    dexSearchInput.addEventListener('search', () => setDexSearch(dexSearchInput.value));
    dexSearchInput.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if (event.isComposing || event.keyCode === 229) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        if (dex.list.length) equipDexKanji(dex.list[dex.sel]);
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault(); onDexKey(event.key.toLowerCase());
      } else if (event.key === 'Escape') {
        event.preventDefault();
        if (dex.query) { dexSearchInput.value = ''; setDexSearch(''); }
        else dexSearchInput.blur();
      }
    });
  }
  dexSortButton?.addEventListener('click', () => { if (state === 'dex') cycleDexSort(); });
  dexGroupButton?.addEventListener('click', () => {
    if (state !== 'dex') return;
    dex.group = !dex.group; dex.contentCache = null; dex.scrollY = 0; ensureDexSelectionVisible();
  });
  function syncDexSearchInput() {
    if (!dexSearchInput) return;
    const visible = state === 'dex';
    if (dexToolbar) dexToolbar.hidden = !visible;
    else dexSearchInput.hidden = !visible;
    if (dexToolbar && visible) {
      // Header nằm trên canvas và được phóng theo presentationScale, trong khi
      // toolbar là DOM CSS. Neo toolbar theo cùng tỉ lệ để desktop ultrawide
      // không đè lên tiêu đề.
      dexToolbar.style.top = VIEWPORT_W < 620 ? '' : `${Math.ceil(44 * presentationScale)}px`;
    }
    if (visible && dexSearchInput.value !== dex.query) dexSearchInput.value = dex.query;
    const currentSort = DEX_SORTS.find((item) => item.id === dex.sort) || DEX_SORTS[0];
    if (dexSortButton) dexSortButton.textContent = `SẮP XẾP: ${currentSort.label} ↻`;
    if (dexGroupButton) dexGroupButton.textContent = `NHÓM: ${dex.group ? 'JLPT ✓' : 'TẮT'}`;
    if (!visible && document.activeElement === dexSearchInput) dexSearchInput.blur();
  }
  function openDex() {
    if (dialog.active || player.moving || fishing) return;
    dex.source = collectedList();
    dex.query = '';
    const currentChar = C.MONSTERS[currentPetId] && C.MONSTERS[currentPetId].kanji;
    refreshDexList(currentChar);
    dex.scrollY = 0; dex.drag = null;
    setState('dex');
    ensureDexSelectionVisible();
  }
  function dexLayout(total) {
    const W = SCREEN_W, H = SCREEN_H, ox = Math.max(18, Math.round(W * 0.024));
    const gapX = Math.max(9, Math.round(W * 0.012)), gapY = 10;
    const minCardW = W < 620 ? 142 : 184;
    const widthCols = Math.floor((W - ox * 2 + gapX) / (minCardW + gapX));
    const cols = Math.max(1, Math.min(5, widthCols));
    // Màn hình hẹp cần năm dòng thông tin (tên, Hán Việt, ON, KUN, Recall).
    // Dành đủ chiều cao cho panel thay vì để dòng cuối rơi khỏi viewport 360x640.
    const narrow = W < 620;
    const panelH = narrow
      ? Math.max(128, Math.min(142, Math.round(H * 0.2)))
      : Math.max(108, Math.min(142, Math.round(H * 0.18)));
    let oy = W < 620 ? 136 : 96;
    if (dexToolbar && state === 'dex' && !dexToolbar.hidden && dexToolbar.getBoundingClientRect) {
      const toolbarRect = dexToolbar.getBoundingClientRect(), canvasRect = cv.getBoundingClientRect();
      const scaleY = Math.max(.01, canvasRect.height / H);
      if (toolbarRect.height > 0) oy = Math.ceil((toolbarRect.bottom - canvasRect.top + 8) / scaleY);
    }
    const gridBottom = H - panelH - 10;
    const availableH = Math.max(80, gridBottom - oy);
    const cardW = (W - ox * 2 - gapX * (cols - 1)) / cols;
    const cardH = H < 620 ? 124 : 146;
    const rows = Math.max(1, Math.floor((availableH + gapY) / (cardH + gapY))), pageSize = cols * rows;
    return { ox, oy, gapX, gapY, cols, rows, pageSize, cardW, cardH, panelH, availableH, gridBottom };
  }
  function dexSections() {
    if (!dex.group) return [{ tier: 'ALL', label: 'TẤT CẢ KANJI', list: dex.list }];
    const order = ['N5', 'N4', 'BONUS'];
    return order.map((tier) => {
      const list = dex.list.filter((char) => tierOfKanji(char) === tier);
      const locked = tier !== 'BONUS' && !isTierUnlocked(tier) && ((CATALOG.tiers || {})[tier]?.kanji || []).some((char) => !!kanjiInfo(char));
      return { tier, label: tier === 'BONUS' ? 'BONUS' : `JLPT ${tier}`, list, locked };
    }).filter((section) => section.list.length || section.locked);
  }
  function dexContent(layout) {
    const cacheKey = `${dex.group}|${layout.cols}|${layout.cardH}|${layout.gapY}|${dex.list.join('')}`;
    if (dex.contentCache && dex.contentCache.key === cacheKey) return dex.contentCache.value;
    const rows = []; let y = 0;
    for (const section of dexSections()) {
      if (dex.group) { rows.push({ type: 'header', section, y, h: 30 }); y += 30; }
      for (let start = 0; start < section.list.length; start += layout.cols) {
        rows.push({ type: 'cards', list: section.list.slice(start, start + layout.cols), y, h: layout.cardH });
        y += layout.cardH + layout.gapY;
      }
      y += 8;
    }
    const value = { rows, height: Math.max(0, y - 8) };
    dex.contentCache = { key: cacheKey, value };
    return value;
  }
  function clampDexScroll() { dex.scrollY = Math.max(0, Math.min(dex.maxScroll || 0, Number(dex.scrollY) || 0)); }
  function ensureDexSelectionVisible() {
    if (state !== 'dex' || !dex.list.length) return;
    const layout = dexLayout(dex.list.length), content = dexContent(layout), selected = dex.list[dex.sel];
    const row = content.rows.find((item) => item.type === 'cards' && item.list.includes(selected));
    dex.maxScroll = Math.max(0, content.height - layout.availableH); clampDexScroll();
    if (!row) return;
    if (row.y < dex.scrollY) dex.scrollY = Math.max(0, row.y - (dex.group ? 30 : 0));
    else if (row.y + row.h > dex.scrollY + layout.availableH) dex.scrollY = row.y + row.h - layout.availableH;
    clampDexScroll();
  }
  function cycleDexSort() {
    const current = DEX_SORTS.findIndex((item) => item.id === dex.sort);
    dex.sort = DEX_SORTS[(current + 1) % DEX_SORTS.length].id;
    refreshDexList(); ensureDexSelectionVisible();
  }
  function onDexPointerDown(x, y, pointerId) {
    const hit = (dex.hitboxes || []).find((box) => x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h);
    if (hit && hit.action === 'sort') {
      if (hit.value === 'cycle') cycleDexSort();
      else { const selected = dex.list[dex.sel]; dex.sort = hit.value; refreshDexList(selected); ensureDexSelectionVisible(); }
      return;
    }
    if (hit && hit.action === 'group') { dex.group = !dex.group; dex.contentCache = null; dex.scrollY = 0; ensureDexSelectionVisible(); return; }
    if (hit && hit.action === 'kanji-audio') {
      if (hit.value && hit.value.char) {
        if (hit.value.type === 'kun') playKanjiKunYomi(hit.value.char);
        else playKanjiOnYomi(hit.value.char);
      }
      return;
    }
    if (hit && hit.action === 'equip-pet') {
      equipDexKanji(hit.value);
      return;
    }
    if (hit && hit.action === 'card') { dex.sel = hit.value; ensureDexSelectionVisible(); }
    const layout = dexLayout(dex.list.length);
    if (y >= layout.oy && y <= layout.gridBottom) dex.drag = { pointerId, startY: y, lastY: y, moved: false };
  }
  function onDexKey(k) {
    if (k === 'escape' || k === 'd') { setState('overworld'); syncDexSearchInput(); return; }
    if (k === '/' && dexSearchInput) { dexSearchInput.focus(); return; }
    const n = dex.list.length; if (!n) return;
    const cols = dexLayout(n).cols;
    if (k === 'arrowleft' || k === 'a') dex.sel = (dex.sel - 1 + n) % n;
    else if (k === 'arrowright') dex.sel = (dex.sel + 1) % n;
    else if (k === 'arrowup' || k === 'w') dex.sel = (dex.sel - cols + n) % n;
    else if (k === 'arrowdown' || k === 's') dex.sel = (dex.sel + cols) % n;
    else if (k === 'pageup') dex.sel = Math.max(0, dex.sel - cols * 3);
    else if (k === 'pagedown') dex.sel = Math.min(n - 1, dex.sel + cols * 3);
    else if (k === 'home') dex.sel = 0;
    else if (k === 'end') dex.sel = n - 1;
    else if (k === 'r') cycleDexSort();
    else if (k === 'g') { dex.group = !dex.group; dex.contentCache = null; dex.scrollY = 0; ensureDexSelectionVisible(); }
    else if (k === 'enter' || k === ' ') {
      equipDexKanji(dex.list[dex.sel]);
    }
    ensureDexSelectionVisible();
  }

  // ---------- 👤 HỒ SƠ NHÂN VẬT ----------
  let profileUi = { hitboxes: [], stats: null };
  function openProfile() {
    if (state !== 'overworld' || dialog.active || player.moving || fishing) return false;
    profileUi.stats = profileStats(); profileUi.hitboxes = [];
    setState('profile');
    return true;
  }
  function closeProfile() { setState('overworld'); profileUi.hitboxes = []; return true; }
  function onProfileKey(k) { if (k === 'escape' || k === 'i') closeProfile(); }
  function onProfilePointerDown(x, y) {
    const hit = profileUi.hitboxes.find((box) => x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h);
    if (hit && hit.action === 'close') { playSFX('UI_BUTTON_CLICK'); closeProfile(); }
  }
  function profileStats() {
    const infos = [...KANJI_BY_CHAR.values()];
    const captured = infos.map((info) => ({ info, stat: ensureMastery(info.char) })).filter((entry) => entry.stat.captured);
    const totalLevels = captured.reduce((total, entry) => total + entry.stat.level, 0);
    const levelsGained = captured.reduce((total, entry) => total + Math.max(0, entry.stat.level - 1), 0);
    const maxedKanji = captured.filter((entry) => entry.stat.level >= C.KLEVEL.maxLevel).length;
    const averageRecall = captured.length
      ? Math.round(captured.reduce((total, entry) => total + entry.stat.recall, 0) / captured.length) : 0;
    const vocabulary = Object.values(learning.vocabulary || {}).filter((entry) => entry && typeof entry === 'object');
    const vocabularySeen = vocabulary.filter((entry) => Number(entry.seenAt) > 0).length;
    const vocabularyMastered = vocabulary.filter((entry) => entry.stage === 'mastered' || Number(entry.masteredAt) > 0).length;
    const attempts = Math.max(Number(learning.total) || 0, (Number(learning.correct) || 0) + (Number(learning.wrong) || 0));
    const tiers = ((C.PROGRESSION && C.PROGRESSION.order) || []).map((tier) => {
      const id = String(tier).toUpperCase(), gym = C.PROGRESSION && C.PROGRESSION.gym && C.PROGRESSION.gym[id];
      const badgeId = String((gym && gym.badge) || id).toUpperCase();
      return { ...tierProgress(id), id, badgeId, earned: hasBadge(badgeId), unlocked: isTierUnlocked(id), hasExam: !!gym,
        exam: gym ? gymEligibility(id) : null, gymHistory: learning.gymHistory[id] ? { ...learning.gymHistory[id] } : null };
    });
    return {
      captured: captured.length, total: infos.length, totalLevels, levelsGained, maxedKanji, averageRecall,
      dueReviews: captured.filter((entry) => isDue(entry.info.char)).length,
      vocabularySeen, vocabularyMastered, vocabularyTotal: VOCABULARY_BY_ID.size,
      accuracy: attempts ? Math.round((Number(learning.correct) || 0) / attempts * 100) : 0,
      correct: Number(learning.correct) || 0, attempts, bestStreak: Number(learning.best) || 0,
      trainerWins: trainerWinsCount(), trainerTotal: TRAINER_DEFINITIONS.length,
      skillsUnlocked: isSandboxCharacter()
        ? SKILL_DEFINITIONS.filter((definition) => definition && definition.released !== false).length
        : Object.keys((learning.progression && learning.progression.skillPurchases) || {}).length,
      earnedKP: learning.progression ? learning.progression.earnedKP : 0, availableKP: availableKP(),
      currentPet: followerUnlocked() ? C.MONSTERS[currentPetId] : null,
      currentPetLevel: followerUnlocked() ? petLevel() : 0, tiers,
    };
  }
  function playerDisplayName() { return window.KanjiGOCharacters?.active?.()?.name || C.PLAYER.name || 'Bạn'; }
  function profileNextGoal(stats) {
    const n5 = stats.tiers.find((tier) => tier.id === 'N5');
    if (n5 && !n5.earned) {
      const exam = n5.exam;
      if (exam && exam.captured < exam.requiredCaptured) return `Mục tiêu tiếp theo: thu phục thêm ${exam.requiredCaptured - exam.captured} Kanji N5 để mở Gym.`;
      if (exam && exam.atLevel < exam.requiredAtLevel) return `Mục tiêu tiếp theo: nâng thêm ${exam.requiredAtLevel - exam.atLevel} Kanji lên Lv.${exam.requiredLevel}+ để mở Gym.`;
      return 'Boss Gym N5 đã sẵn sàng — vượt bài kiểm tra để nhận huy hiệu và mở N4!';
    }
    const n4 = stats.tiers.find((tier) => tier.id === 'N4');
    if (n4 && !n4.earned && n4.exam) {
      if (!n4.exam.prerequisiteReady) return `Để thi N4, hãy thu phục đủ N5 — còn ${n4.exam.prerequisite.total - n4.exam.prerequisite.captured} Kanji.`;
      if (n4.exam.captured < n4.exam.requiredCaptured) return `Mục tiêu N4: thu phục thêm ${n4.exam.requiredCaptured - n4.exam.captured} Kanji để mở bài test.`;
      if (n4.exam.atLevel < n4.exam.requiredAtLevel) return `Mục tiêu N4: nâng thêm ${n4.exam.requiredAtLevel - n4.exam.atLevel} Kanji lên Lv.${n4.exam.requiredLevel}+.`;
      return 'Gym N4 đã sẵn sàng — làm mini-test để nhận huy hiệu N4!';
    }
    if (stats.dueReviews > 0) return `Có ${stats.dueReviews} Kanji tới hạn ôn — quay lại luyện để giữ Recall ổn định.`;
    return 'Tiến độ rất tốt! Hãy tiếp tục nâng Kanji lên Lv.10 và làm chủ thêm từ vựng.';
  }

  // ---------- 🌳 SKILL TREE ----------
  const SKILL_BRANCH_COLORS = { exploration: '#ef4bd8', learning: '#38d7f2', combat: '#ffb52e' };
  let skillUi = { sel: 0, panX: 0, panY: 0, hitboxes: [], drag: null, resetConfirm: false, purchaseConfirmId: null, initialized: false };
  function openSkillTree() {
    if (state !== 'overworld' || dialog.active || player.moving || fishing) return false;
    setState('skills'); skillUi.drag = null; skillUi.resetConfirm = false; skillUi.purchaseConfirmId = null;
    skillUi.sel = Math.max(0, Math.min(SKILL_DEFINITIONS.length - 1, skillUi.sel));
    if (!skillUi.initialized) { centerSkillGraph((C.SKILL_TREE.layout || {}).root); skillUi.initialized = true; }
    else clampSkillPan();
    return true;
  }
  function skillTreeLayout() {
    const W = SCREEN_W, H = SCREEN_H, short = H < 520, compact = W < 620 || short, pad = compact ? 12 : 22;
    const preferredDetailH = short ? 126 : compact ? 178 : 150;
    const detailH = Math.min(preferredDetailH, Math.max(short ? 112 : 124, Math.round(H * (short ? .33 : .42))));
    const top = short ? 74 : compact ? 108 : 96, detailY = H - detailH;
    const bottom = Math.max(top + 20, detailY - 8), viewportH = Math.max(20, bottom - top);
    const graph = (C.SKILL_TREE && C.SKILL_TREE.layout) || {};
    // Một vài node authored nằm ngoài 0..layout.width. Tính bounds thật có
    // gutter cho icon/label để camera không coi chúng là nội dung ngoài map.
    const points = [graph.root, ...Object.values(graph.hubs || {}), ...SKILL_DEFINITIONS.map((definition) => definition.position)].filter(Boolean);
    const authoredW = Math.max(640, Number(graph.width) || 1100), authoredH = Math.max(420, Number(graph.height) || 500);
    const worldMinX = Math.min(0, ...points.map((point) => Number(point.x) - 70));
    const worldMaxX = Math.max(authoredW, ...points.map((point) => Number(point.x) + 70));
    const worldMinY = Math.min(0, ...points.map((point) => Number(point.y) - 62));
    const worldMaxY = Math.max(authoredH, ...points.map((point) => Number(point.y) + 62));
    const worldW = worldMaxX - worldMinX, worldH = worldMaxY - worldMinY;
    const fitZoom = Math.min((W - pad * 2) / worldW, viewportH / worldH, 1);
    // Portrait có thể fit toàn bộ chiều ngang; landscape thấp cần zoom nhỏ hơn
    // thay vì giữ mức desktop rồi cắt gần hết graph.
    const minimumZoom = short ? .32 : compact ? .2 : .52;
    const zoom = Math.max(minimumZoom, fitZoom);
    return { W, H, short, compact, pad, top, bottom, detailY, detailH, viewportH, worldMinX, worldMaxX, worldMinY, worldMaxY, worldW, worldH, zoom, graph };
  }
  function skillPanBounds(layout = skillTreeLayout()) {
    const visibleW = (layout.W - layout.pad * 2) / layout.zoom, visibleH = layout.viewportH / layout.zoom;
    const centerX = (layout.worldMinX + layout.worldMaxX - visibleW) / 2;
    const centerY = (layout.worldMinY + layout.worldMaxY - visibleH) / 2;
    return {
      minX: layout.worldW > visibleW ? layout.worldMinX : centerX,
      maxX: layout.worldW > visibleW ? layout.worldMaxX - visibleW : centerX,
      minY: layout.worldH > visibleH ? layout.worldMinY : centerY,
      maxY: layout.worldH > visibleH ? layout.worldMaxY - visibleH : centerY,
      visibleW, visibleH,
    };
  }
  function clampSkillPan() {
    const bounds = skillPanBounds();
    skillUi.panX = Math.max(bounds.minX, Math.min(bounds.maxX, Number(skillUi.panX) || 0));
    skillUi.panY = Math.max(bounds.minY, Math.min(bounds.maxY, Number(skillUi.panY) || 0));
  }
  function centerSkillGraph(point) {
    const layout = skillTreeLayout(), bounds = skillPanBounds(layout), target = point || { x: (layout.worldMinX + layout.worldMaxX) / 2, y: (layout.worldMinY + layout.worldMaxY) / 2 };
    skillUi.panX = Number(target.x) - bounds.visibleW / 2;
    skillUi.panY = Number(target.y) - bounds.visibleH / 2;
    clampSkillPan();
  }
  function skillWorldToScreen(point, layout = skillTreeLayout()) {
    return {
      x: layout.pad + (Number(point.x) - skillUi.panX) * layout.zoom,
      y: layout.top + (Number(point.y) - skillUi.panY) * layout.zoom,
    };
  }
  function ensureSkillSelectionVisible(center = false) {
    const definition = SKILL_DEFINITIONS[skillUi.sel]; if (!definition || !definition.position) return;
    if (center) { centerSkillGraph(definition.position); return; }
    const layout = skillTreeLayout(), bounds = skillPanBounds(layout), margin = 58 / layout.zoom;
    if (definition.position.x < skillUi.panX + margin) skillUi.panX = definition.position.x - margin;
    if (definition.position.x > skillUi.panX + bounds.visibleW - margin) skillUi.panX = definition.position.x - bounds.visibleW + margin;
    if (definition.position.y < skillUi.panY + margin) skillUi.panY = definition.position.y - margin;
    if (definition.position.y > skillUi.panY + bounds.visibleH - margin) skillUi.panY = definition.position.y - bounds.visibleH + margin;
    clampSkillPan();
  }
  function skillFailureMessage(reason) {
    return ({
      unreleased: 'Node đang ở chế độ preview — effect gameplay chưa được release.',
      prerequisites: 'Bạn cần mở node prerequisite trước.',
      requirements: 'Chưa đủ tiến độ Kanji yêu cầu.',
      kp: 'Chưa đủ KP.', owned: 'Node này đã được mở.', missing: 'Không tìm thấy node.',
    })[reason] || 'Chưa thể mở node này.';
  }
  function tryPurchaseSelectedSkill() {
    const definition = SKILL_DEFINITIONS[skillUi.sel]; if (!definition) return false;
    const status = skillStatus(definition.id);
    if (status.state !== 'ready') {
      skillUi.purchaseConfirmId = null;
      showToast(skillFailureMessage(status.reason)); return false;
    }
    if (skillUi.purchaseConfirmId !== definition.id) {
      skillUi.purchaseConfirmId = definition.id;
      showToast(`Nhấn Enter hoặc chạm MỞ lần nữa để dùng ${definition.costKP} KP.`); return false;
    }
    skillUi.purchaseConfirmId = null;
    const result = purchaseSkill(definition.id);
    if (!result.ok) showToast(skillFailureMessage(result.reason));
    return result.ok;
  }
  function confirmPerkReset() {
    skillUi.purchaseConfirmId = null;
    const perkCount = Object.values(learning.progression.skillPurchases).filter((purchase) => purchase && purchase.type === 'perk').length;
    if (!perkCount) { showToast('Chưa có perk nào để reset.'); skillUi.resetConfirm = false; return false; }
    if (!skillUi.resetConfirm) { skillUi.resetConfirm = true; showToast('Nhấn R hoặc chạm RESET lần nữa để xác nhận.'); return false; }
    skillUi.resetConfirm = false; return resetPerks().ok;
  }
  function onSkillKey(k) {
    if (k === 'escape' || k === 'k') {
      if (skillUi.purchaseConfirmId) { skillUi.purchaseConfirmId = null; return; }
      if (skillUi.resetConfirm) { skillUi.resetConfirm = false; return; }
      setState('overworld'); return;
    }
    const n = SKILL_DEFINITIONS.length; if (!n) return;
    if (k === 'arrowleft' || k === 'a') moveSkillSelection(-1, 0);
    else if (k === 'arrowright' || k === 'd') moveSkillSelection(1, 0);
    else if (k === 'arrowup' || k === 'w') moveSkillSelection(0, -1);
    else if (k === 'arrowdown' || k === 's') moveSkillSelection(0, 1);
    else if (k === 'pageup') { skillUi.panY -= 180; clampSkillPan(); }
    else if (k === 'pagedown') { skillUi.panY += 180; clampSkillPan(); }
    else if (k === 'home') centerSkillGraph((C.SKILL_TREE.layout || {}).root);
    else if (k === 'end') ensureSkillSelectionVisible(true);
    else if (k === 'enter' || k === ' ') tryPurchaseSelectedSkill();
    else if (k === 'r') confirmPerkReset();
    ensureSkillSelectionVisible();
  }
  function moveSkillSelection(dx, dy) {
    const current = SKILL_DEFINITIONS[skillUi.sel]; if (!current || !current.position) return;
    let best = null;
    for (let index = 0; index < SKILL_DEFINITIONS.length; index++) {
      if (index === skillUi.sel) continue;
      const candidate = SKILL_DEFINITIONS[index], px = candidate.position.x - current.position.x, py = candidate.position.y - current.position.y;
      const forward = px * dx + py * dy; if (forward <= 0) continue;
      const distance = Math.hypot(px, py), alignment = forward / Math.max(1, distance);
      const score = distance / Math.max(.12, alignment * alignment);
      if (!best || score < best.score) best = { index, score };
    }
    if (best) { skillUi.sel = best.index; skillUi.purchaseConfirmId = null; }
  }
  function onSkillPointerDown(x, y, pointerId) {
    const hit = skillUi.hitboxes.find((box) => x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h);
    if (hit && hit.action === 'reset') { confirmPerkReset(); return; }
    if (hit && hit.action === 'buy') { skillUi.sel = hit.value; tryPurchaseSelectedSkill(); return; }
    if (hit && hit.action === 'node') {
      if (skillUi.sel !== hit.value) skillUi.purchaseConfirmId = null;
      skillUi.sel = hit.value; ensureSkillSelectionVisible();
    }
    const layout = skillTreeLayout();
    if (y >= layout.top && y <= layout.bottom) {
      skillUi.drag = { pointerId, startX: x, startY: y, lastX: x, lastY: y, moved: false };
      if (cv.setPointerCapture) cv.setPointerCapture(pointerId);
    }
  }

  function drawSkillConnection(from, to, color, active, preview, layout) {
    const a = skillWorldToScreen(from, layout), b = skillWorldToScreen(to, layout);
    const midX = (a.x + b.x) / 2;
    cx.save(); cx.beginPath(); cx.moveTo(a.x, a.y); cx.quadraticCurveTo(midX, a.y, b.x, b.y);
    if (preview && cx.setLineDash) cx.setLineDash([5, 7]);
    cx.strokeStyle = active ? color : preview ? 'rgba(117,127,151,.3)' : `${color}55`; cx.lineWidth = active ? 4 : 2.5;
    if (active) { cx.shadowColor = color; cx.shadowBlur = 9; }
    cx.stroke(); cx.restore();
    cx.save(); cx.fillStyle = active ? color : 'rgba(115,132,164,.55)';
    cx.beginPath(); cx.arc(b.x, b.y, active ? 4 : 3, 0, Math.PI * 2); cx.fill(); cx.restore();
  }
  function drawSkillNode(definition, index, layout) {
    const status = skillStatus(definition.id), point = skillWorldToScreen(definition.position, layout);
    const branchColor = SKILL_BRANCH_COLORS[definition.branch] || '#9fd8f5';
    const selected = index === skillUi.sel, radius = Math.max(layout.short || layout.zoom < .4 ? 20 : 24, 37 * layout.zoom);
    const ring = status.state === 'owned' ? branchColor : status.state === 'ready' ? '#ffd54a' : status.state === 'preview' ? '#68728a' : '#4a5368';
    cx.save();
    if (selected) {
      const pulse = 6 + 2 * Math.sin(performance.now() / 150);
      cx.strokeStyle = '#fff'; cx.globalAlpha = .88; cx.lineWidth = 2.5;
      cx.beginPath(); cx.arc(point.x, point.y, radius + pulse, 0, Math.PI * 2); cx.stroke(); cx.globalAlpha = 1;
    }
    if (status.state === 'owned' || status.state === 'ready') { cx.shadowColor = ring; cx.shadowBlur = status.state === 'owned' ? 18 : 13; }
    cx.fillStyle = status.state === 'owned' ? `${branchColor}32` : status.state === 'ready' ? 'rgba(70,55,13,.98)' : status.state === 'preview' ? 'rgba(31,35,47,.96)' : `${branchColor}16`;
    cx.strokeStyle = ring; cx.lineWidth = status.state === 'owned' ? 5 : 3;
    cx.beginPath(); cx.arc(point.x, point.y, radius, 0, Math.PI * 2); cx.fill(); cx.stroke();
    cx.shadowBlur = 0; cx.globalAlpha = status.state === 'preview' ? .48 : status.state === 'locked' ? .68 : 1;
    cx.fillStyle = '#fff'; cx.font = `${Math.max(17, radius * .78)}px ${JPFONT}`; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillText(definition.icon || '✦', point.x, point.y + 1);
    cx.globalAlpha = 1; cx.textBaseline = 'alphabetic';
    // Ở landscape thấp chỉ giữ label/cost của node đang chọn; các node còn lại
    // vẫn nhận diện bằng icon và trạng thái mà không đè chữ lên nhau.
    if ((!layout.short && layout.zoom >= .42) || selected) {
      cx.fillStyle = selected ? '#fff' : '#c8d7ef'; cx.font = `bold ${layout.compact ? 10 : 12}px ${JPFONT}`;
      fitText(definition.name, point.x, point.y + radius + 18, layout.short ? 104 : 132, layout.compact ? 10 : 12, true);
      cx.fillStyle = status.state === 'ready' ? '#ffe56e' : '#aebbd2'; cx.font = 'bold 9px "KanjiGo UI",sans-serif'; cx.fillText(`${definition.costKP} KP`, point.x, point.y - radius - 9);
    }
    const badgeX = point.x + radius * .7, badgeY = point.y - radius * .7;
    cx.globalAlpha = 1; cx.fillStyle = status.state === 'owned' ? '#42d786' : status.state === 'ready' ? '#ffd54a' : '#303b55';
    cx.beginPath(); cx.arc(badgeX, badgeY, 10, 0, Math.PI * 2); cx.fill();
    cx.strokeStyle = '#0c1730'; cx.lineWidth = 2; cx.stroke();
    cx.fillStyle = status.state === 'owned' || status.state === 'ready' ? '#102038' : '#9caac3'; cx.font = 'bold 11px "KanjiGo UI",sans-serif';
    cx.textBaseline = 'middle'; cx.fillText(status.state === 'owned' ? '✓' : status.state === 'ready' ? '!' : status.state === 'preview' ? '…' : '×', badgeX, badgeY + 1);
    cx.restore(); cx.textAlign = 'left';
    skillUi.hitboxes.push({ action: 'node', value: index, x: point.x - radius - 8, y: point.y - radius - 8, w: radius * 2 + 16, h: radius * 2 + 24 });
  }
  function drawSkillDetail(layout) {
    const definition = SKILL_DEFINITIONS[skillUi.sel], status = definition ? skillStatus(definition.id) : null;
    const y = layout.detailY, panelH = layout.detailH, pad = layout.pad;
    cx.fillStyle = 'rgba(8,15,34,.98)'; cx.fillRect(0, y, layout.W, panelH);
    cx.strokeStyle = '#264c7a'; cx.lineWidth = 2; cx.strokeRect(1, y + 1, layout.W - 2, panelH - 2);
    if (!definition || !status) return;
    const branchColor = SKILL_BRANCH_COLORS[definition.branch] || '#9fd8f5';
    const branchLabel = (C.SKILL_TREE.branches || {})[definition.branch] || definition.branch.toUpperCase();
    const stateMeta = status.state === 'owned' ? { label: 'ĐÃ SỞ HỮU', color: '#6effa1' }
      : status.state === 'ready' ? { label: 'CÓ THỂ MỞ', color: '#ffd54a' }
        : status.state === 'preview' ? { label: 'SẮP RA MẮT', color: '#9caac3' }
          : { label: status.reason === 'kp' ? 'THIẾU KP' : 'CHƯA ĐỦ ĐIỀU KIỆN', color: '#ffac79' };
    cx.fillStyle = branchColor; cx.font = 'bold 10px "KanjiGo UI",sans-serif'; cx.fillText(`${branchLabel} • ${definition.type === 'permanent' ? 'MỞ VĨNH VIỄN' : 'PERK CÓ THỂ RESET'}`, pad, y + 18);
    const statusW = Math.min(layout.compact ? 116 : 150, layout.W * .32), statusX = layout.W - pad - statusW;
    cx.fillStyle = `${stateMeta.color}24`; cx.fillRect(statusX, y + 8, statusW, 23); cx.strokeStyle = stateMeta.color; cx.strokeRect(statusX, y + 8, statusW, 23);
    cx.fillStyle = stateMeta.color; cx.font = 'bold 9px "KanjiGo UI",sans-serif'; cx.textAlign = 'center'; cx.fillText(stateMeta.label, statusX + statusW / 2, y + 23); cx.textAlign = 'left';
    cx.fillStyle = '#fff'; cx.font = `bold ${layout.compact ? 18 : 22}px ${JPFONT}`;
    fitText(`${definition.icon || '✦'}  ${definition.name}`, pad, y + 47, layout.W - pad * 2 - (layout.compact ? 116 : 180), layout.compact ? 18 : 22, true);
    const buttonW = layout.compact ? 116 : 164, buttonH = 42, buttonX = layout.W - pad - buttonW, buttonY = y + 39;
    const confirming = status.state === 'ready' && skillUi.purchaseConfirmId === definition.id;
    const label = status.state === 'owned' ? 'ĐÃ MỞ ✓' : confirming ? `XÁC NHẬN • ${definition.costKP}` : status.state === 'ready' ? `MỞ • ${definition.costKP} KP` : status.state === 'preview' ? 'PREVIEW' : 'ĐANG KHÓA';
    cx.fillStyle = confirming ? '#b34a30' : status.state === 'ready' ? '#8a6810' : status.state === 'owned' ? '#176644' : '#303b55'; cx.fillRect(buttonX, buttonY, buttonW, buttonH);
    cx.strokeStyle = status.state === 'ready' ? '#ffd54a' : status.state === 'owned' ? '#6effa1' : '#68728a'; cx.lineWidth = 2; cx.strokeRect(buttonX, buttonY, buttonW, buttonH);
    cx.fillStyle = '#fff'; cx.font = `bold ${layout.compact ? 9 : 11}px "KanjiGo UI",sans-serif`; cx.textAlign = 'center'; cx.fillText(label, buttonX + buttonW / 2, buttonY + 26); cx.textAlign = 'left';
    skillUi.hitboxes.push({ action: 'buy', value: skillUi.sel, x: buttonX, y: buttonY, w: buttonW, h: buttonH });
    cx.fillStyle = '#b9c8e8'; cx.font = `${layout.compact ? 11 : 12}px ${JPFONT}`;
    fitText(definition.description, pad, y + 70, Math.max(120, buttonX - pad - 14), layout.compact ? 11 : 12);
    const requirements = status.requirements.map((requirement) => ({ met: requirement.met, label: requirement.label }));
    if (status.missingPrerequisites && status.missingPrerequisites.length) requirements.unshift({ met: false, label: `Cần ${status.missingPrerequisites.join(', ')}` });
    if (!requirements.length) requirements.push({ met: true, label: 'Không có yêu cầu tiến độ' });
    let chipX = pad, chipY = y + (layout.short ? 82 : layout.compact ? 91 : 94);
    for (const requirement of requirements) {
      const chipW = Math.min(layout.W - pad * 2, Math.max(130, requirement.label.length * 6.2 + 29));
      if (chipX + chipW > layout.W - pad) { chipX = pad; chipY += 29; }
      cx.fillStyle = requirement.met ? 'rgba(38,128,91,.28)' : 'rgba(159,83,48,.3)'; cx.fillRect(chipX, chipY, chipW, 23);
      cx.strokeStyle = requirement.met ? '#4bc98c' : '#d9895c'; cx.strokeRect(chipX, chipY, chipW, 23);
      cx.fillStyle = requirement.met ? '#91e8b9' : '#ffc096'; cx.font = '10px "KanjiGo UI",sans-serif';
      fitText(`${requirement.met ? '✓' : '○'} ${requirement.label}`, chipX + 8, chipY + 16, chipW - 16, 10);
      chipX += chipW + 8;
    }
    cx.fillStyle = '#8094ba'; cx.font = '10px "KanjiGo UI",sans-serif';
    fitText(layout.compact ? 'Kéo để khám phá • chạm 2 lần để mở • ← đóng' : 'Kéo/scroll để pan • mũi tên chọn • Enter ×2 mở • R reset • K/Esc đóng', pad, y + panelH - 12, layout.W - pad * 2, 10);
  }

  function renderSkillTree() {
    const layout = skillTreeLayout(), { W, H } = layout;
    clampSkillPan(); skillUi.hitboxes = [];
    const gradient = cx.createLinearGradient ? cx.createLinearGradient(0, 0, W, H) : null;
    if (gradient && gradient.addColorStop) { gradient.addColorStop(0, '#08172d'); gradient.addColorStop(1, '#10264a'); }
    cx.fillStyle = gradient || '#0e1930'; cx.fillRect(0, 0, W, H);
    const titleY = layout.short ? 28 : 38;
    cx.fillStyle = '#fff'; cx.font = `bold ${layout.short ? 20 : W < 620 ? 23 : 30}px ${JPFONT}`; cx.fillText('🌳 SKILL TREE', layout.pad, titleY);
    if (!layout.short) {
      cx.fillStyle = '#9fd8f5'; cx.font = `${W < 620 ? 11 : 13}px ${JPFONT}`;
      fitText('Đầu tư tiến độ học vào tính năng mới. Permanent không mất khi reset.', layout.pad, 62, W - layout.pad * 2, W < 620 ? 11 : 13);
    }
    const touchBackReserve = usesTouchUi() ? (layout.short ? 150 : 110) : 0;
    const resetW = layout.short ? 118 : W < 620 ? 98 : 150, resetX = W - layout.pad - resetW - touchBackReserve, resetY = layout.short ? 38 : 68, resetH = 30;
    cx.fillStyle = '#ffd54a'; cx.font = `bold ${layout.short ? 16 : W < 620 ? 18 : 22}px "KanjiGo UI",sans-serif`; cx.fillText(`⭐ ${availableKP()} KP`, layout.pad, layout.short ? 61 : 91);
    cx.fillStyle = '#8094ba'; cx.font = '11px "KanjiGo UI",sans-serif';
    const statsX = layout.pad + (layout.short ? 112 : W < 620 ? 100 : 130);
    fitText(`Đã kiếm ${learning.progression.earnedKP} • Đã dùng ${spentKP()}`, statsX, layout.short ? 60 : 90, Math.max(50, resetX - statsX - 8), layout.short ? 10 : 11);
    cx.fillStyle = skillUi.resetConfirm ? '#8d3546' : '#253659'; cx.fillRect(resetX, resetY, resetW, resetH);
    cx.strokeStyle = skillUi.resetConfirm ? '#ff8c9e' : '#5571a4'; cx.strokeRect(resetX, resetY, resetW, resetH);
    cx.fillStyle = '#fff'; cx.font = `bold ${W < 620 ? 10 : 11}px "KanjiGo UI",sans-serif`; cx.textAlign = 'center';
    cx.fillText(skillUi.resetConfirm ? 'XÁC NHẬN RESET' : 'RESET PERK [R]', resetX + resetW / 2, resetY + 20); cx.textAlign = 'left';
    skillUi.hitboxes.push({ action: 'reset', x: resetX, y: resetY, w: resetW, h: resetH });

    cx.save(); cx.beginPath(); cx.rect(0, layout.top, W, layout.viewportH); cx.clip();
    const gridStep = 64 * layout.zoom;
    cx.fillStyle = 'rgba(120,155,205,.09)';
    for (let gx = layout.pad - ((skillUi.panX * layout.zoom) % gridStep); gx < W; gx += gridStep) {
      for (let gy = layout.top - ((skillUi.panY * layout.zoom) % gridStep); gy < layout.bottom; gy += gridStep) {
        cx.beginPath(); cx.arc(gx, gy, 1.2, 0, Math.PI * 2); cx.fill();
      }
    }
    const root = layout.graph.root || { x: layout.worldW / 2, y: layout.worldH / 2 }, hubs = layout.graph.hubs || {};
    for (const [branch, hub] of Object.entries(hubs)) drawSkillConnection(root, hub, SKILL_BRANCH_COLORS[branch] || '#64799f', true, false, layout);
    for (const definition of SKILL_DEFINITIONS) {
      const color = SKILL_BRANCH_COLORS[definition.branch] || '#64799f', status = skillStatus(definition.id);
      if ((definition.prerequisites || []).length) {
        for (const prerequisite of definition.prerequisites) {
          const source = SKILL_BY_ID.get(prerequisite); if (source && source.position) drawSkillConnection(source.position, definition.position, color, status.state === 'owned' || status.state === 'ready', status.state === 'preview', layout);
        }
      } else if (hubs[definition.branch]) drawSkillConnection(hubs[definition.branch], definition.position, color, status.state === 'owned' || status.state === 'ready', status.state === 'preview', layout);
    }
    const rootPoint = skillWorldToScreen(root, layout), rootRadius = Math.max(27, 42 * layout.zoom);
    cx.save(); cx.shadowColor = '#ffd54a'; cx.shadowBlur = 18; cx.fillStyle = '#35280d'; cx.strokeStyle = '#ffd54a'; cx.lineWidth = 5;
    cx.beginPath(); cx.arc(rootPoint.x, rootPoint.y, rootRadius, 0, Math.PI * 2); cx.fill(); cx.stroke(); cx.shadowBlur = 0;
    cx.fillStyle = '#fff'; cx.font = `bold ${Math.max(13, rootRadius * .48)}px "KanjiGo UI",sans-serif`; cx.textAlign = 'center'; cx.fillText('KP', rootPoint.x, rootPoint.y + 5);
    cx.fillStyle = '#ffd54a'; cx.font = 'bold 9px "KanjiGo UI",sans-serif'; cx.fillText(`${availableKP()} CÒN LẠI`, rootPoint.x, rootPoint.y + rootRadius + 15); cx.restore();
    for (const [branch, hub] of Object.entries(hubs)) {
      const point = skillWorldToScreen(hub, layout), color = SKILL_BRANCH_COLORS[branch] || '#64799f';
      cx.fillStyle = '#13213c'; cx.strokeStyle = color; cx.lineWidth = 3; cx.beginPath(); cx.arc(point.x, point.y, 16, 0, Math.PI * 2); cx.fill(); cx.stroke();
      const hubLabel = (C.SKILL_TREE.branches || {})[branch] || branch.toUpperCase(), labelW = Math.max(82, hubLabel.length * 7 + 18);
      if (!layout.short && layout.zoom >= .42) {
        cx.fillStyle = 'rgba(9,20,40,.9)'; cx.fillRect(point.x - labelW / 2, point.y + 22, labelW, 21);
        cx.strokeStyle = `${color}99`; cx.strokeRect(point.x - labelW / 2, point.y + 22, labelW, 21);
        cx.fillStyle = color; cx.font = 'bold 10px "KanjiGo UI",sans-serif'; cx.textAlign = 'center'; cx.fillText(hubLabel, point.x, point.y + 36);
      }
    }
    cx.textAlign = 'left'; SKILL_DEFINITIONS.forEach((definition, index) => drawSkillNode(definition, index, layout));
    if (!layout.compact) {
      const legend = [
        { icon: '✓', label: 'Đã mở', color: '#42d786' }, { icon: '!', label: 'Có thể mở', color: '#ffd54a' },
        { icon: '×', label: 'Đang khóa', color: '#65718a' }, { icon: '…', label: 'Preview', color: '#65718a' },
      ];
      let lx = layout.pad + 6, ly = layout.top + 15;
      cx.fillStyle = 'rgba(7,16,34,.78)'; cx.fillRect(lx - 6, ly - 11, 350, 25);
      for (const item of legend) {
        cx.fillStyle = item.color; cx.font = 'bold 10px "KanjiGo UI",sans-serif'; cx.fillText(item.icon, lx, ly + 5);
        cx.fillStyle = '#aebbd2'; cx.font = '10px "KanjiGo UI",sans-serif'; cx.fillText(item.label, lx + 14, ly + 5); lx += item.label.length * 6 + 37;
      }
    }
    cx.restore();
    drawSkillDetail(layout);
  }

  function drawProfilePanel(x, y, w, h, accent = '#2f7fc0') {
    cx.fillStyle = 'rgba(12,25,51,.94)'; cx.fillRect(x, y, w, h);
    cx.strokeStyle = accent; cx.lineWidth = 2; cx.strokeRect(x, y, w, h);
    cx.fillStyle = `${accent}33`; cx.fillRect(x + 2, y + 2, w - 4, 4);
  }
  function drawProfileMetric(entry, x, y, w, h) {
    cx.fillStyle = 'rgba(20,43,78,.9)'; cx.fillRect(x, y, w, h);
    cx.strokeStyle = `${entry.color}88`; cx.lineWidth = 1; cx.strokeRect(x, y, w, h);
    cx.fillStyle = entry.color; cx.textAlign = 'center';
    fitText(entry.value, x + w / 2, y + Math.max(24, h * .48), w - 12, Math.max(16, Math.min(25, h * .3)), true);
    cx.fillStyle = '#b9cae4';
    fitText(entry.label, x + w / 2, y + h - (entry.sub && h >= 64 ? 24 : 10), w - 10, Math.max(8, Math.min(11, h * .17)), true);
    if (entry.sub && h >= 64) {
      cx.fillStyle = '#7188a9'; fitText(entry.sub, x + w / 2, y + h - 8, w - 10, 9);
    }
    cx.textAlign = 'left';
  }
  function profileMetricEntries(stats) {
    return [
      { label: 'KANJI THU PHỤC', value: `${stats.captured}/${stats.total}`, color: '#6effa1' },
      { label: 'CẤP ĐÃ NÂNG', value: `+${stats.levelsGained}`, sub: `Tổng cấp ${stats.totalLevels}`, color: '#ffd54a' },
      { label: `KANJI LV.${C.KLEVEL.maxLevel}`, value: String(stats.maxedKanji), color: '#ffae62' },
      { label: 'RECALL TRUNG BÌNH', value: `${stats.averageRecall}%`, sub: `${stats.dueReviews} tới hạn`, color: '#7ff7ff' },
      { label: 'TỪ VỰNG ĐÃ GẶP', value: `${stats.vocabularySeen}/${stats.vocabularyTotal}`, color: '#d7b4ff' },
      { label: 'TỪ VỰNG NHỚ VỮNG', value: String(stats.vocabularyMastered), color: '#ff9fd8' },
      { label: 'ĐỘ CHÍNH XÁC', value: `${stats.accuracy}%`, sub: `${stats.correct}/${stats.attempts} đúng`, color: '#83ddff' },
      { label: 'TRAINER ĐÃ THẮNG', value: `${stats.trainerWins}/${stats.trainerTotal}`, color: '#ff8b8b' },
    ];
  }
  function drawProfileMetricGrid(stats, x, y, w, h, columns) {
    const entries = profileMetricEntries(stats), gap = 7, rows = Math.ceil(entries.length / columns);
    const cardW = (w - gap * (columns - 1)) / columns, cardH = (h - gap * (rows - 1)) / rows;
    entries.forEach((entry, index) => {
      const col = index % columns, row = Math.floor(index / columns);
      drawProfileMetric(entry, x + col * (cardW + gap), y + row * (cardH + gap), cardW, cardH);
    });
  }
  function drawProfileHero(stats, x, y, w, h, compact = false) {
    drawProfilePanel(x, y, w, h, '#a65fd5');
    cx.fillStyle = '#ffb5e8'; cx.textAlign = 'center'; cx.font = `bold ${compact ? 12 : 15}px "KanjiGo UI",sans-serif`;
    cx.fillText('HỌC GIẢ KANJI', x + w / 2, y + 23);
    const spriteSize = compact ? Math.min(56, h - 48) : Math.min(82, w * .38, h * .3);
    const spriteY = compact ? y + 34 : y + 40;
    const characterFrame = activePlayerFrameSize;
    if (imgs.player) cx.drawImage(imgs.player, 0, 0, characterFrame, characterFrame, x + 13, spriteY, spriteSize, spriteSize);
    const petImage = followerUnlocked() ? monsterImg(currentPetId) : null;
    if (petImage) {
      const sourceW = petImage.naturalWidth || petImage.width || 1, sourceH = petImage.naturalHeight || petImage.height || sourceW;
      const ratio = sourceH / sourceW, petW = spriteSize, petH = Math.min(spriteSize, spriteSize * ratio);
      cx.drawImage(petImage, x + w - petW - 13, spriteY + spriteSize - petH, petW, petH);
    }
    if (compact) {
      cx.fillStyle = '#fff'; fitText(playerDisplayName(), x + w / 2, y + 58, Math.max(60, w - spriteSize * 2 - 40), 17, true);
      cx.fillStyle = '#9fd8f5'; fitText(stats.currentPet ? `Pet「${stats.currentPet.kanji}」Lv.${stats.currentPetLevel}` : 'Chưa có mascot đồng hành', x + w / 2, y + 80, Math.max(64, w - spriteSize * 2 - 26), 10, true);
      cx.fillStyle = '#ffd54a'; fitText(`⭐ ${stats.availableKP} KP`, x + w / 2, y + 99, Math.max(64, w - spriteSize * 2 - 26), 11, true);
    } else {
      const infoY = spriteY + spriteSize + 25;
      cx.fillStyle = '#fff'; fitText(playerDisplayName(), x + w / 2, infoY, w - 24, 22, true);
      cx.fillStyle = '#9fd8f5'; fitText(stats.currentPet ? `Đồng hành: ${stats.currentPet.name}「${stats.currentPet.kanji}」` : 'Đồng hành: hoàn tất onboarding để mở', x + w / 2, infoY + 25, w - 24, 11, true);
      const chipY = infoY + 43;
      cx.fillStyle = 'rgba(255,213,74,.12)'; cx.fillRect(x + 14, chipY, w - 28, 34);
      cx.strokeStyle = '#8d7228'; cx.strokeRect(x + 14, chipY, w - 28, 34);
      cx.fillStyle = '#ffd54a'; fitText(`⭐ ${stats.availableKP} KP còn lại`, x + w / 2, chipY + 22, w - 42, 13, true);
      cx.fillStyle = '#8094ba'; fitText(`${stats.skillsUnlocked} kỹ năng đã mở · Best combo ${stats.bestStreak}`, x + w / 2, chipY + 55, w - 24, 10);
    }
    cx.textAlign = 'left';
  }
  function drawProfileTierRows(stats, x, y, w, h) {
    const tiers = stats.tiers.slice(0, 2), gap = 8, rowH = Math.max(28, (h - gap * Math.max(0, tiers.length - 1)) / Math.max(1, tiers.length));
    tiers.forEach((tier, index) => {
      const rowY = y + index * (rowH + gap), ratio = tier.total ? Math.max(0, Math.min(1, tier.captured / tier.total)) : 0;
      cx.fillStyle = '#dce8ff'; cx.font = 'bold 11px "KanjiGo UI",sans-serif'; cx.fillText(`JLPT ${tier.id}`, x, rowY + 12);
      cx.fillStyle = tier.earned ? '#6effa1' : tier.unlocked ? '#9fd8f5' : '#71809b'; cx.textAlign = 'right';
      const examStatus = tier.gymHistory ? gymBestLabel(tier.gymHistory, true)
        : tier.exam && !tier.earned ? gymProgressLabel(tier.exam, true) : `${tier.captured}/${tier.total}`;
      cx.fillText(examStatus, x + w, rowY + 12); cx.textAlign = 'left';
      const barY = rowY + 19;
      cx.fillStyle = '#26344f'; cx.fillRect(x, barY, w, 7);
      cx.fillStyle = tier.earned ? '#ffd54a' : tier.id === 'N4' ? '#b782eb' : '#4fd595'; cx.fillRect(x, barY, w * ratio, 7);
    });
  }
  function gymProgressLabel(exam, compact = false) {
    if (!exam) return '';
    if (exam.earned) return 'PASS ✓';
    if (!exam.badgeReady) return `CẦN PASS ${exam.requiredBadge}`;
    if (!exam.prerequisiteReady) return `${exam.prerequisiteTier} ${exam.prerequisite.captured}/${exam.prerequisite.total}`;
    if (exam.ready) return compact ? 'READY' : 'READY · VÀO GYM';
    return `${exam.captured}/${exam.requiredCaptured} · Lv${exam.requiredLevel} ${exam.atLevel}/${exam.requiredAtLevel}`;
  }
  function gymBestLabel(history, compact = false) {
    if (!history || !history.attempts) return '';
    const score = `BEST ${history.bestGrade} · ${history.bestCorrect}/${history.bestTotal} · ${Math.round(history.bestRatio * 100)}%`;
    return compact ? score : `${score} · ${history.attempts} lượt`;
  }
  function formatGymDuration(ms) {
    const value = Math.max(0, Number(ms) || 0); if (!value) return 'Chưa ghi nhận';
    const seconds = Math.max(1, Math.round(value / 1000)), minutes = Math.floor(seconds / 60), remainder = seconds % 60;
    return minutes ? `${minutes}:${String(remainder).padStart(2, '0')}` : `${seconds} giây`;
  }
  function formatGymDate(timestamp) {
    const date = new Date(Number(timestamp) || 0); if (!Number(timestamp) || Number.isNaN(date.getTime())) return 'Chưa thi';
    const pad = (value) => String(value).padStart(2, '0');
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} · ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  function gymBadgeStatus(badge) {
    const exam = badge.exam;
    if (badge.earned) return 'ĐÃ NHẬN · PASS ✓';
    if (!exam) return 'SẮP RA MẮT';
    if (!exam.badgeReady) return `KHÓA · CẦN PASS ${exam.requiredBadge}`;
    if (!exam.prerequisiteReady) return `KHÓA · CẦN ĐỦ ${exam.prerequisiteTier}`;
    if (exam.ready) return 'SẴN SÀNG THI';
    return 'CHƯA ĐỦ ĐIỀU KIỆN';
  }
  function gymBadgeInfoRows(badge) {
    const exam = badge.exam, history = badge.gymHistory, rows = [];
    if (history && history.attempts) {
      rows.push({ label: 'THÀNH TÍCH TỐT NHẤT', value: `${history.bestGrade} · ${history.bestCorrect}/${history.bestTotal} · ${Math.round(history.bestRatio * 100)}%`, color: history.bestGrade === 'S' ? '#fff09a' : '#79f2b3' });
      rows.push({ label: 'LƯỢT GẦN NHẤT', value: `${history.lastGrade} · ${history.lastCorrect}/${history.lastTotal} · ${Math.round(history.lastRatio * 100)}%` });
      rows.push({ label: 'THỜI LƯỢNG TỐT NHẤT', value: formatGymDuration(history.bestDurationMs) });
      rows.push({ label: 'THỰC HIỆN GẦN NHẤT', value: formatGymDate(history.lastAt) });
      rows.push({ label: 'TỔNG SỐ LƯỢT THI', value: String(history.attempts) });
    } else {
      rows.push({ label: 'THÀNH TÍCH TỐT NHẤT', value: 'Chưa có kết quả' });
      rows.push({ label: 'LƯỢT GẦN NHẤT', value: 'Chưa thi' });
      rows.push({ label: 'THỜI LƯỢNG', value: 'Chưa ghi nhận' });
      rows.push({ label: 'TỔNG SỐ LƯỢT THI', value: '0' });
    }
    if (exam) {
      rows.push({ label: `THU PHỤC ${badge.id}`, value: `${exam.captured}/${exam.requiredCaptured}` });
      rows.push({ label: `KANJI LV.${exam.requiredLevel}+`, value: `${exam.atLevel}/${exam.requiredAtLevel}` });
      if (exam.prerequisiteTier && exam.prerequisite) rows.push({ label: `HOÀN TẤT ${exam.prerequisiteTier}`, value: `${exam.prerequisite.captured}/${exam.prerequisite.total}` });
    }
    return rows;
  }
  function drawBadgeMedallion(id, centerX, centerY, size, earned = false, ready = false) {
    const radius = size / 2;
    cx.save();
    cx.globalAlpha = earned ? 1 : ready ? .9 : .42;
    const shield = (scale) => {
      const r = radius * scale;
      cx.beginPath(); cx.moveTo(centerX, centerY - r); cx.lineTo(centerX + r * .78, centerY - r * .55);
      cx.lineTo(centerX + r * .72, centerY + r * .35); cx.lineTo(centerX, centerY + r);
      cx.lineTo(centerX - r * .72, centerY + r * .35); cx.lineTo(centerX - r * .78, centerY - r * .55); cx.closePath();
    };
    shield(1); cx.fillStyle = earned || ready ? '#e8b936' : '#53627a'; cx.fill();
    cx.strokeStyle = earned ? '#fff0a0' : ready ? '#ffe080' : '#71809a'; cx.lineWidth = Math.max(1.5, size * .045); cx.stroke();
    shield(.82); cx.fillStyle = earned || ready ? '#073f42' : '#16263e'; cx.fill();
    cx.strokeStyle = earned || ready ? '#36b99a' : '#41516c'; cx.lineWidth = Math.max(1, size * .025); cx.stroke();
    cx.fillStyle = earned || ready ? '#087454' : '#263752'; cx.beginPath(); cx.arc(centerX, centerY - radius * .03, radius * .55, 0, Math.PI * 2); cx.fill();
    cx.strokeStyle = earned || ready ? '#ffd45f' : '#5c6d88'; cx.lineWidth = Math.max(1.5, size * .035); cx.stroke();
    cx.fillStyle = earned ? '#fff2ba' : ready ? '#fff0b0' : '#a6b2c6'; cx.textAlign = 'center';
    cx.font = `bold ${Math.max(8, Math.round(size * .27))}px ${JPFONT}`; cx.fillText(id, centerX, centerY + size * .075);
    if (earned) {
      cx.fillStyle = '#176331'; cx.beginPath(); cx.arc(centerX + radius * .62, centerY - radius * .58, radius * .32, 0, Math.PI * 2); cx.fill();
      cx.fillStyle = '#fff'; cx.font = `bold ${Math.max(10, Math.round(size * .22))}px ${JPFONT}`; cx.fillText('✓', centerX + radius * .62, centerY - radius * .50);
    }
    cx.restore(); cx.textAlign = 'left';
  }
  function drawProfileBadgeSlots(stats, x, y, w, h) {
    const badges = stats.tiers.slice(0, 2), gap = 8, slotW = (w - gap * Math.max(0, badges.length - 1)) / Math.max(1, badges.length);
    badges.forEach((badge, index) => {
      const bx = x + index * (slotW + gap);
      const ready = badge.exam && badge.exam.ready;
      cx.fillStyle = badge.earned ? 'rgba(17,67,58,.9)' : ready ? 'rgba(20,58,62,.9)' : 'rgba(22,34,57,.92)'; cx.fillRect(bx, y, slotW, h);
      cx.strokeStyle = badge.earned ? '#ffd54a' : ready ? '#5fe0b4' : '#42516a'; cx.lineWidth = badge.earned || ready ? 2 : 1; cx.strokeRect(bx, y, slotW, h);
      const rich = h >= 150 && slotW >= 145;
      const iconSize = rich ? Math.max(58, Math.min(104, h * .24, slotW * .3)) : Math.max(28, Math.min(56, h - 47, slotW * .42));
      const iconY = y + (rich ? 14 : 8);
      drawBadgeMedallion(badge.badgeId, bx + slotW / 2, iconY + iconSize / 2, iconSize, badge.earned, ready);
      cx.fillStyle = badge.earned ? '#fff1a8' : ready ? '#d7fff0' : '#9aa8bf'; cx.textAlign = 'center';
      const titleY = iconY + iconSize + (rich ? 22 : h - iconSize - 32);
      fitText(`HUY HIỆU ${badge.badgeId}`, bx + slotW / 2, titleY, slotW - 18, rich ? 15 : 11, true);
      cx.fillStyle = badge.earned ? '#6effa1' : ready ? '#72f0c4' : '#8d9bb2';
      fitText(gymBadgeStatus(badge), bx + slotW / 2, titleY + (rich ? 21 : 16), slotW - 18, rich ? 11 : 9, true);
      if (rich) {
        const rows = gymBadgeInfoRows(badge), infoX = bx + 12, infoY = titleY + 34, infoW = slotW - 24;
        const infoH = Math.max(0, y + h - infoY - 12), rowH = Math.max(20, infoH / Math.max(1, rows.length));
        rows.forEach((row, rowIndex) => {
          const rowY = infoY + rowIndex * rowH;
          cx.fillStyle = rowIndex % 2 ? 'rgba(255,255,255,.025)' : 'rgba(4,14,31,.26)'; cx.fillRect(infoX, rowY, infoW, rowH - 2);
          cx.fillStyle = '#8193af'; cx.textAlign = 'left'; fitText(row.label, infoX + 8, rowY + Math.min(13, rowH * .42), infoW * .46, 9, true);
          cx.fillStyle = row.color || (badge.earned ? '#e4f8ee' : '#bdc9dc'); cx.textAlign = 'right';
          fitText(row.value, infoX + infoW - 8, rowY + Math.min(14, rowH * .56), infoW * .5, 10, true);
        });
      }
      cx.textAlign = 'left';
    });
  }
  function drawProfileHeader(W, compact) {
    const pad = compact ? 12 : 22, closeW = compact ? 78 : 112, closeH = 32, closeX = W - pad - closeW, closeY = 12;
    cx.fillStyle = '#fff'; fitText('HỒ SƠ NHÂN VẬT', pad, compact ? 34 : 38, Math.max(120, closeX - pad - 12), compact ? 21 : 29, true);
    // Mobile already exposes the shared DOM Back button in this exact corner.
    // Drawing a second canvas button beneath it makes the action look broken
    // and creates two competing hit targets, so desktop keeps the canvas close
    // affordance while touch/narrow layouts rely on the accessible DOM control.
    if (!usesTouchUi()) {
      cx.fillStyle = '#263a5d'; cx.fillRect(closeX, closeY, closeW, closeH); cx.strokeStyle = '#5f82b2'; cx.strokeRect(closeX, closeY, closeW, closeH);
      cx.fillStyle = '#dce8ff'; cx.textAlign = 'center'; fitText(compact ? 'ĐÓNG [I]' : 'ĐÓNG · I / ESC', closeX + closeW / 2, closeY + 21, closeW - 10, compact ? 10 : 11, true); cx.textAlign = 'left';
      profileUi.hitboxes.push({ action: 'close', x: closeX, y: closeY, w: closeW, h: closeH });
    }
  }
  function renderProfilePortrait(stats, W, H) {
    const pad = 12, top = 53, gap = 8, heroH = Math.min(118, Math.max(96, H * .17));
    drawProfileHero(stats, pad, top, W - pad * 2, heroH, true);
    const statsY = top + heroH + gap, statsH = Math.min(228, Math.max(184, H * .31));
    cx.fillStyle = '#9fd8f5'; cx.font = 'bold 11px "KanjiGo UI",sans-serif'; cx.fillText('THỐNG KÊ HỌC TẬP', pad, statsY + 12);
    drawProfileMetricGrid(stats, pad, statsY + 20, W - pad * 2, statsH - 20, 2);
    const tierY = statsY + statsH + gap, tierH = Math.min(92, Math.max(68, H * .12));
    drawProfilePanel(pad, tierY, W - pad * 2, tierH, '#4fd595');
    cx.fillStyle = '#9fd8f5'; cx.font = 'bold 10px "KanjiGo UI",sans-serif'; cx.fillText('TIẾN ĐỘ JLPT', pad + 10, tierY + 16);
    drawProfileTierRows(stats, pad + 10, tierY + 23, W - pad * 2 - 20, tierH - 29);
    const badgeY = tierY + tierH + gap, badgeH = Math.max(70, H - badgeY - 12);
    drawProfilePanel(pad, badgeY, W - pad * 2, badgeH, '#d9ad42');
    cx.fillStyle = '#ffd970'; cx.font = 'bold 10px "KanjiGo UI",sans-serif'; cx.fillText('BỘ SƯU TẬP HUY HIỆU', pad + 10, badgeY + 17);
    const goalH = badgeH >= 150 ? 39 : 0;
    drawProfileBadgeSlots(stats, pad + 10, badgeY + 24, W - pad * 2 - 20, badgeH - 31 - goalH);
    if (goalH) {
      cx.fillStyle = '#9fd8f5'; cx.font = '10px "KanjiGo UI",sans-serif';
      wrap(profileNextGoal(stats), pad + 11, badgeY + badgeH - 24, W - pad * 2 - 22, 13);
    }
  }
  function renderProfileLandscape(stats, W, H) {
    const pad = 20, top = 58, gap = 12, contentH = H - top - 18, leftW = Math.min(250, Math.max(190, W * .25));
    drawProfileHero(stats, pad, top, leftW, contentH, false);
    const rightX = pad + leftW + gap, rightW = W - rightX - pad;
    const statsH = Math.min(280, Math.max(168, contentH * .46));
    drawProfilePanel(rightX, top, rightW, statsH, '#4a9ad1');
    cx.fillStyle = '#9fd8f5'; cx.font = 'bold 12px "KanjiGo UI",sans-serif'; cx.fillText('THỐNG KÊ HỌC TẬP', rightX + 12, top + 21);
    drawProfileMetricGrid(stats, rightX + 12, top + 31, rightW - 24, statsH - 43, 4);
    const achievementY = top + statsH + gap, achievementH = H - achievementY - 18;
    drawProfilePanel(rightX, achievementY, rightW, achievementH, '#d9ad42');
    const split = Math.max(165, rightW * .43);
    cx.fillStyle = '#9fd8f5'; cx.font = 'bold 11px "KanjiGo UI",sans-serif'; cx.fillText('TIẾN ĐỘ JLPT', rightX + 12, achievementY + 21);
    drawProfileTierRows(stats, rightX + 12, achievementY + 32, split - 24, Math.min(82, achievementH - 67));
    cx.fillStyle = '#8fb0cf'; cx.font = '10px "KanjiGo UI",sans-serif';
    fitText(profileNextGoal(stats), rightX + 12, achievementY + achievementH - 14, split - 24, 10);
    cx.fillStyle = '#ffd970'; cx.font = 'bold 11px "KanjiGo UI",sans-serif'; cx.fillText('HUY HIỆU', rightX + split + 4, achievementY + 21);
    drawProfileBadgeSlots(stats, rightX + split + 4, achievementY + 31, rightW - split - 16, achievementH - 43);
  }
  function renderProfile() {
    const W = SCREEN_W, H = SCREEN_H, compact = W < 620;
    profileUi.hitboxes = [];
    const gradient = cx.createLinearGradient ? cx.createLinearGradient(0, 0, W, H) : null;
    if (gradient && gradient.addColorStop) { gradient.addColorStop(0, '#07152c'); gradient.addColorStop(1, '#17264a'); }
    cx.fillStyle = gradient || '#0b1831'; cx.fillRect(0, 0, W, H);
    cx.fillStyle = 'rgba(94,142,204,.08)';
    for (let x = 0; x < W; x += 48) for (let y = 0; y < H; y += 48) cx.fillRect(x, y, 1, 1);
    drawProfileHeader(W, compact);
    const stats = profileUi.stats || profileStats();
    if (compact) renderProfilePortrait(stats, W, H); else renderProfileLandscape(stats, W, H);
  }

  // ---------- VÒNG LẶP ----------
  let last = 0;
  function targetFrameMs() {
    const render = C.RENDER || {};
    const active = state === 'battle' || state === 'capture' || (state === 'pve' && pve && pve.phase === 'fight')
      || (state === 'overworld' && (player.moving || fishing));
    const fps = active ? (render.activeFps || 60) : state === 'overworld' ? (render.idleFps || 30) : (render.uiFps || 30);
    return 1000 / Math.max(1, fps);
  }
  function loop(t) {
    if (document.hidden) { last = t; requestAnimationFrame(loop); return; }
    if (!last) last = t - targetFrameMs();
    const elapsed = t - last;
    if (elapsed + 0.5 < targetFrameMs()) { requestAnimationFrame(loop); return; }
    const dt = Math.min(50, elapsed); last = t;
    if (state === 'overworld') updateOverworld(dt);
    else if (state === 'battle') updateBattle(dt);
    else if (state === 'capture') updateCapture(dt);
    else if (state === 'pve') updatePve(dt);
    if (toast.t > 0) toast.t -= dt;
    render();
    requestAnimationFrame(loop);
  }
  document.addEventListener?.('visibilitychange', () => {
    last = 0;
    if (!document.hidden && gameReady) render();
  });
  function updateOverworld(dt) {
    if (dialog.active) return;
    if (fishing) { updateFishing(dt); return; }
    if (player.moving) {
      player.moveT += dt; const k = Math.min(1, player.moveT / player.moveDuration);
      player.px = player.fromX + (player.toX - player.fromX) * k;
      player.py = player.fromY + (player.toY - player.fromY) * k;
      const animMs = isBicycleActive() ? C.ANIM_MS * Math.max(.3, Number(C.BICYCLE && C.BICYCLE.animMultiplier) || .55)
        : player.running ? (C.RUN_ANIM_MS || C.ANIM_MS * 0.6) : C.ANIM_MS;
      player.animT += dt;
      // Preserve elapsed-time remainder and catch up after a slow render frame.
      // Resetting to zero here accumulated visual drift and produced irregular
      // contact/stride durations on lower-end devices.
      while (player.animT >= animMs) {
        player.animT -= animMs;
        player.frame = (player.frame + 1) % C.FRAMES;
      }
      // Preserve the animation phase at tile boundaries. Holding a direction
      // therefore continues the same four-frame cycle instead of snapping to
      // frame zero after every 32 px step. The idle branch resets it naturally.
      if (k >= 1) {
        const carryMs = Math.max(0, player.moveT - player.moveDuration);
        const cycling = isBicycleActive();
        player.moving = false; player.running = false; onStepComplete();
        // A bicycle crosses a tile in only a few render frames. Start the next
        // held/auto-ridden step immediately and carry fractional elapsed time
        // forward so tile boundaries do not introduce a visible stop-start.
        if (cycling && state === 'overworld' && !dialog.active && !fishing) {
          const nextDirection = nextAutoRideDirection()
            || (pressed('left') ? 'left' : pressedRight() ? 'right'
              : pressed('up') ? 'up' : pressed('down') ? 'down' : null);
          if (nextDirection) {
            tryMove(nextDirection);
            if (player.moving && carryMs > 0) {
              player.moveT = Math.min(carryMs, player.moveDuration);
              const carriedK = player.moveT / player.moveDuration;
              player.px = player.fromX + (player.toX - player.fromX) * carriedK;
              player.py = player.fromY + (player.toY - player.fromY) * carriedK;
            }
          }
        }
      }
    } else {
      const autoDirection = nextAutoRideDirection();
      if (autoDirection) tryMove(autoDirection);
      else if (pressed('left')) tryMove('left');
      else if (pressedRight()) tryMove('right');
      else if (pressed('up')) tryMove('up');
      else if (pressed('down')) tryMove('down');
      else { player.frame = 0; player.animT = 0; }
    }
    if (player.moving) recordPlayerTrail();
    else recordPlayerTrail(true);
  }
  function updateBattle(dt) {
    const b = battle; if (!b) return;
    if (b.hitStop > 0) {
      const frozen = Math.min(dt, b.hitStop); b.hitStop -= frozen; dt -= frozen;
      if (dt <= 0) return;
    }
    if (b.shake > 0) b.shake -= dt; if (b.flash > 0) b.flash -= dt; if (b.botFlash > 0) b.botFlash -= dt;
    if (b.petAttackT > 0) b.petAttackT -= dt; if (b.enemyAttackT > 0) b.enemyAttackT -= dt;
    if (b.enemyHitT > 0) b.enemyHitT -= dt; if (b.playerHitT > 0) b.playerHitT -= dt;
    if (b.perfectT > 0) b.perfectT -= dt; if (b.skillT > 0) b.skillT -= dt;
    if (b.encounterImpactT > 0) b.encounterImpactT -= dt;
    b.damageNumbers = (b.damageNumbers || []).filter((n) => { n.t -= dt; return n.t > 0; });
    b.particles = (b.particles || []).filter((p) => {
      p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += .00000055 * dt;
      return p.t > 0;
    });
    if (b.entranceT > 0) {
      const before = 1 - b.entranceT / Math.max(1, b.entranceTotal || 1450);
      b.entranceT = Math.max(0, b.entranceT - dt);
      const after = 1 - b.entranceT / Math.max(1, b.entranceTotal || 1450);
      if (!b.entranceSfxPlayed && before < .62 && after >= .62) {
        b.entranceSfxPlayed = true; b.encounterImpactT = 430; b.shake = 280;
        playSFX('BATTLE_ATTACK'); playSFX(b.kind === 'water' ? 'WORLD_FISH_SUCCESS' : 'BATTLE_STUN');
      }
      if (b.entranceT <= 0) { b.questionElapsed = 0; resetAttackGauge(b); }
      return;
    }
    if (b.pendingWin > 0) { b.pendingWin -= dt; if (b.pendingWin <= 0) win(); }
    if (b.pendingLose > 0) { b.pendingLose -= dt; if (b.pendingLose <= 0) lose(); }
    if (b.phase !== 'fight') {
      if (autoRideActive && Number.isFinite(b.autoResumeT)) {
        b.autoResumeT -= dt;
        if (b.autoResumeT <= 0) endBattle();
      }
      return;
    }
    if (b.stun > 0) b.stun -= dt;
    if (b.fbT > 0) {
      b.fbT -= dt;
      if (b.fbT <= 0) b.feedback = null;
    }
    if (b.qCooldown > 0) {
      b.qCooldown -= dt;
      if (b.qCooldown <= 0 && b.monHp > 0 && !b.pendingLose) {
        // Sau khi bị quái phản công, cho người học làm lại đúng câu vừa sai.
        // Chỉ câu trả lời đúng mới chuyển sang kiến thức tiếp theo.
        if (!b.retryQuestion) { b.q = makeQuestion(b.mon.kanji, b.q.key); playQuestionPronunciation(b.q); }
        b.retryQuestion = false;
        b.questionElapsed = 0;
        b.selectedIndex = -1; b.revealAnswer = false;
        if (b.fbT <= 0) b.feedback = null;
      }
    } else if (!b.pendingWin && !b.pendingLose) {
      b.questionElapsed += dt;
      b.botNextIn -= dt;
      if (b.botNextIn <= 0) timeoutQuestion(b);
    }
  }
  function updateCapture(dt) {
    if (!capture) return;
    if (capture.phase === 'end') {
      if (capture.catchEffectT > 0) capture.catchEffectT = Math.max(0, capture.catchEffectT - dt);
      return;
    }
    if (capture.phase !== 'fight') return;
    if (capture.fbT > 0) capture.fbT -= dt;
    if (capture.burstT > 0) capture.burstT -= dt;
    if (capture.qCooldown > 0) {
      capture.qCooldown -= dt;
      if (capture.qCooldown <= 0) {
        if (capture.pendingEnd) finishCapture();
        else {
          const sourcePool = capture.vocabIds.map((id) => VOCABULARY_BY_ID.get(id)).filter(Boolean);
          capture.q = captureQuestion(capture.char, capture.index, capture.q.key, sourcePool);
          playQuestionPronunciation(capture.q);
          capture.selectedIndex = -1; capture.revealAnswer = false; capture.feedback = null;
        }
      }
    }
  }
  function updatePve(dt) {
    if (!pve || pve.phase !== 'fight') return;
    if (pve.fbT > 0) pve.fbT -= dt;
    if (pve.entranceT > 0) pve.entranceT -= dt;
    if (pve.trainerIntroT > 0) pve.trainerIntroT -= dt;
    if (pve.arenaShakeT > 0) pve.arenaShakeT -= dt;
    if (pve.impactT > 0) pve.impactT -= dt;
    if (pve.petAttackT > 0) pve.petAttackT -= dt;
    if (pve.enemyAttackT > 0) pve.enemyAttackT -= dt;
    if (pve.enemyHitT > 0) pve.enemyHitT -= dt;
    if (pve.playerHitT > 0) pve.playerHitT -= dt;
    if (pve.rankGainT > 0) pve.rankGainT -= dt;
    if (pve.rankShockT > 0) pve.rankShockT -= dt;
    else if (pve.rankDisplay !== pve.rankTarget) {
      const step = Math.min(1, dt / 180);
      pve.rankDisplay += (pve.rankTarget - pve.rankDisplay) * step;
      if (Math.abs(pve.rankDisplay - pve.rankTarget) < .001) pve.rankDisplay = pve.rankTarget;
    }
    if (pve.qCooldown > 0) {
      pve.qCooldown -= dt;
      if (pve.qCooldown <= 0) {
        if (pve.pendingEnd) finishPve();
        else {
          const target = randomPveKanji(pve.q && pve.q.target); pve.q = makePveQuestion(target, pve.q.key);
          playQuestionPronunciation(pve.q);
          pve.selectedIndex = -1; pve.revealAnswer = false; pve.feedback = null;
          pve.entranceT = 520; pve.entranceTotal = pve.entranceT;
          pve.petAttackT = 0; pve.enemyAttackT = 0; pve.enemyHitT = 0; pve.playerHitT = 0;
          pve.enemyHp = 1;
          const info = kanjiInfo(target); if (info) monsterImg(info.monId);
        }
      }
    }
  }

  // ---------- VẼ ----------
  let worldGroundCache = null;
  const campusTileAssets = new Map([
    [K.CAMPUS_LAWN, 'campus_lawn_tile'],
    [K.CAMPUS_PLAZA, 'campus_plaza_tile'],
    [K.TECH_PROMENADE, 'campus_tech_tile'],
    [K.CAMPUS_COURTYARD, 'campus_courtyard_tile'],
  ]);
  const CAMPUS_HARD_SURFACES = new Set([K.CAMPUS_PLAZA, K.TECH_PROMENADE, K.CAMPUS_COURTYARD]);
  const FTOWN_LANDMARK = MAP_LANDMARKS.find((landmark) => landmark.asset === 'landmark_ftown');
  const FVILLE_LANDMARK = MAP_LANDMARKS.find((landmark) => landmark.asset === 'landmark_hoa_lac');
  const HERITAGE_LANDMARK = MAP_LANDMARKS.find((landmark) => landmark.asset === 'landmark_heritage_pavilion');
  function worldGroundTileAt(gx, gy) {
    if (gx < 0 || gy < 0 || gx >= MAP_W || gy >= MAP_H) return -1;
    const source = TILES[gy][gx];
    const atAcademyEntrance = gy === C.ACADEMY.doorGy
      && Math.abs(gx - C.ACADEMY.doorGx) <= 1;
    const ftownCenter = FTOWN_LANDMARK ? FTOWN_LANDMARK.gx + FTOWN_LANDMARK.width / 2 : -1;
    const atFtownEntrance = FTOWN_LANDMARK
      && gy === FTOWN_LANDMARK.gy + FTOWN_LANDMARK.height - 1
      && gx >= ftownCenter - 2 && gx < ftownCenter + 2;
    const fvilleCenter = FVILLE_LANDMARK ? FVILLE_LANDMARK.gx + FVILLE_LANDMARK.width / 2 : -1;
    const atFvilleEntrance = FVILLE_LANDMARK
      && gy === FVILLE_LANDMARK.gy + FVILLE_LANDMARK.height - 1
      && gx >= fvilleCenter - 1 && gx < fvilleCenter + 1;
    const heritageCenter = HERITAGE_LANDMARK ? HERITAGE_LANDMARK.gx + HERITAGE_LANDMARK.width / 2 : -1;
    const atHeritageEntrance = HERITAGE_LANDMARK
      && gy === Math.ceil(HERITAGE_LANDMARK.gy + HERITAGE_LANDMARK.height) - 1
      && gx >= heritageCenter - 1 && gx < heritageCenter + 1;
    if (atFvilleEntrance) return K.CAMPUS_COURTYARD;
    if (atAcademyEntrance || atFtownEntrance || atHeritageEntrance) return K.CAMPUS_PLAZA;
    return ACADEMY_TILES.has(source) || source === K.TREE ? K.GRASS : source;
  }
  function wornPathOrientation(gx, gy) {
    const isWornPath = (x, y) => x >= 0 && y >= 0 && x < MAP_W && y < MAP_H
      && TILES[y][x] === K.WORN_PATH;
    const vertical = Number(isWornPath(gx, gy - 1)) + Number(isWornPath(gx, gy + 1));
    const horizontal = Number(isWornPath(gx - 1, gy)) + Number(isWornPath(gx + 1, gy));
    return vertical > horizontal ? 'vertical' : 'horizontal';
  }
  function drawTileOn(context, idx, sx, sy, gx = 0, gy = 0) {
    const campusAsset = campusTileAssets.get(idx);
    if (campusAsset && imgs[campusAsset]) {
      context.drawImage(imgs[campusAsset], 0, 0, TILE, TILE, sx, sy, TILE, TILE);
      return;
    }
    if (idx === K.GARDEN && imgs.tulip_tiles) {
      const variant = (Math.abs(gx) % 2) + (Math.abs(gy) % 2) * 2;
      context.drawImage(imgs.tulip_tiles, variant * TILE, 0, TILE, TILE, sx, sy, TILE, TILE);
      return;
    }
    const isTerrain = idx >= K.PLAZA && idx <= K.WORN_PATH && imgs.terrain_tiles;
    const atlas = isTerrain ? imgs.terrain_tiles : imgs.tileset;
    const atlasIndex = isTerrain ? idx - K.PLAZA : idx;
    if (idx === K.WORN_PATH && wornPathOrientation(gx, gy) === 'vertical') {
      context.save(); context.translate(sx + TILE, sy); context.rotate(Math.PI / 2);
      context.drawImage(atlas, atlasIndex * TILE, 0, TILE, TILE, 0, 0, TILE, TILE);
      context.restore();
      return;
    }
    if (idx === K.FLOWER && ((gx * 7 + gy * 11) & 1)) {
      // Mirror có seed giúp các flower patch dùng cùng atlas nhưng không lặp
      // đúng một silhouette theo ma trận.
      context.save(); context.translate(sx + TILE, sy); context.scale(-1, 1);
      context.drawImage(atlas, atlasIndex * TILE, 0, TILE, TILE, 0, 0, TILE, TILE);
      context.restore();
      return;
    }
    context.drawImage(atlas, atlasIndex * TILE, 0, TILE, TILE, sx, sy, TILE, TILE);
  }
  function drawTile(idx, sx, sy) { drawTileOn(cx, idx, sx, sy); }
  function drawSprite(img, dir, frame, sx, sy,
    size = Math.max(TILE, Number(C.CHARACTER && C.CHARACTER.drawSize) || TILE),
    frameSize = Math.max(TILE, Number(C.CHARACTER && C.CHARACTER.frameSize) || TILE)) {
    const drawSize = Math.max(TILE, Math.round(size));
    const offsetX = (drawSize - TILE) / 2, offsetY = drawSize - TILE;
    cx.drawImage(img, frame * frameSize, C.DIR_ROW[dir] * frameSize, frameSize, frameSize,
      Math.round(sx - offsetX), Math.round(sy - offsetY), drawSize, drawSize);
  }
  function drawCharacterShadow(sx, sy, width = 18) {
    cx.fillStyle = 'rgba(16,24,28,.22)';
    cx.beginPath(); cx.ellipse(sx + TILE / 2, sy + TILE - 2, width / 2, 3, 0, 0, Math.PI * 2); cx.fill();
  }
  function drawStaticGroundDetail(context, idx, sx, sy, gx, gy) {
    if (idx === K.PATH && ((gx * 13 + gy * 7) % 5 === 0)) {
      context.fillStyle = 'rgba(120,92,52,.22)'; context.fillRect(sx + 7, sy + 21, 2, 1); context.fillRect(sx + 23, sy + 8, 1, 2);
    } else if (idx === K.GRASS && ((gx * 17 + gy * 19) % 11 === 0)) {
      context.fillStyle = 'rgba(28,112,50,.24)'; context.fillRect(sx + 8, sy + 12, 1, 3); context.fillRect(sx + 10, sy + 13, 1, 2);
    } else if (idx === K.CAMPUS_LAWN && ((gx * 29 + gy * 17) % 13 === 0)) {
      // Biến thể nhỏ có seed theo ô để các mảng lawn lớn không lặp như giấy dán.
      context.fillStyle = 'rgba(238,255,181,.42)'; context.fillRect(sx + 7, sy + 10, 1, 2);
      context.fillStyle = 'rgba(24,112,47,.28)'; context.fillRect(sx + 22, sy + 20, 2, 1);
    }

    const north = worldGroundTileAt(gx, gy - 1), south = worldGroundTileAt(gx, gy + 1);
    const west = worldGroundTileAt(gx - 1, gy), east = worldGroundTileAt(gx + 1, gy);
    if (idx === K.WATER) {
      // Viền nước được suy ra từ hàng xóm nên hồ có shoreline đủ bốn cạnh,
      // kể cả khi shape được cắt góc mà không cần thêm atlas riêng.
      context.fillStyle = 'rgba(196,243,255,.72)';
      if (north !== K.WATER) context.fillRect(sx, sy, TILE, 2);
      if (south !== K.WATER) context.fillRect(sx, sy + TILE - 2, TILE, 2);
      if (west !== K.WATER) context.fillRect(sx, sy, 2, TILE);
      if (east !== K.WATER) context.fillRect(sx + TILE - 2, sy, 2, TILE);
      context.fillStyle = 'rgba(20,95,145,.42)';
      if (north !== K.WATER) context.fillRect(sx, sy + 2, TILE, 1);
      if (south !== K.WATER) context.fillRect(sx, sy + TILE - 3, TILE, 1);
      if (west !== K.WATER) context.fillRect(sx + 2, sy, 1, TILE);
      if (east !== K.WATER) context.fillRect(sx + TILE - 3, sy, 1, TILE);
      return;
    }

    if (!CAMPUS_HARD_SURFACES.has(idx)) return;
    const border = idx === K.CAMPUS_PLAZA ? 'rgba(255,249,220,.78)'
      : idx === K.TECH_PROMENADE ? 'rgba(121,144,169,.62)' : 'rgba(255,205,169,.68)';
    context.fillStyle = border;
    if (north !== idx) context.fillRect(sx, sy, TILE, CAMPUS_HARD_SURFACES.has(north) ? 1 : 2);
    if (south !== idx) context.fillRect(sx, sy + TILE - (CAMPUS_HARD_SURFACES.has(south) ? 1 : 2), TILE, CAMPUS_HARD_SURFACES.has(south) ? 1 : 2);
    if (west !== idx) context.fillRect(sx, sy, CAMPUS_HARD_SURFACES.has(west) ? 1 : 2, TILE);
    if (east !== idx) context.fillRect(sx + TILE - (CAMPUS_HARD_SURFACES.has(east) ? 1 : 2), sy, CAMPUS_HARD_SURFACES.has(east) ? 1 : 2, TILE);
  }
  function ensureWorldGroundCache() {
    if (worldGroundCache || !imgs.tileset || typeof document.createElement !== 'function') return worldGroundCache;
    const canvas = document.createElement('canvas'); canvas.width = MAP_W * TILE; canvas.height = MAP_H * TILE;
    const context = canvas.getContext('2d'); context.imageSmoothingEnabled = false;
    for (let gy = 0; gy < MAP_H; gy++) for (let gx = 0; gx < MAP_W; gx++) {
      const idx = worldGroundTileAt(gx, gy);
      const sx = gx * TILE, sy = gy * TILE;
      drawTileOn(context, idx, sx, sy, gx, gy);
      drawStaticGroundDetail(context, idx, sx, sy, gx, gy);
    }
    worldGroundCache = canvas;
    return worldGroundCache;
  }
  function visibleTileBounds(camX, camY) {
    return {
      startX: Math.max(0, Math.floor(camX / TILE) - 1), startY: Math.max(0, Math.floor(camY / TILE) - 1),
      endX: Math.min(MAP_W - 1, Math.ceil((camX + VIEW_PX_W) / TILE) + 1),
      endY: Math.min(MAP_H - 1, Math.ceil((camY + VIEW_PX_H) / TILE) + 1),
    };
  }
  function drawGroundDetail(idx, sx, sy, gx, gy, now) {
    if (idx === K.WATER) {
      const wave = (now / 180 + gx * 7 + gy * 11) % 18;
      cx.strokeStyle = 'rgba(180,235,255,.38)'; cx.lineWidth = 1;
      cx.beginPath(); cx.moveTo(sx + 3 + wave, sy + 9); cx.lineTo(sx + 10 + wave, sy + 9); cx.stroke();
      cx.beginPath(); cx.moveTo(sx + 18 - wave / 2, sy + 24); cx.lineTo(sx + 25 - wave / 2, sy + 24); cx.stroke();
    }
  }
  function treeRenderJitter(gx, gy) {
    let x = gx > 0 && gx < MAP_W - 1 ? ((gx * 13 + gy * 7) % 5) - 2 : 0;
    let y = gy > 0 && gy < MAP_H - 1 ? ((gx * 5 + gy * 11) % 3) - 1 : 0;
    // A shifted 32px tree sprite otherwise spills into the neighbouring tile.
    // Keep the organic offset inside groves, but pin every exposed forest edge
    // so paths, brick and the other authored terrain remain fully visible.
    if ((x < 0 && TILES[gy][gx - 1] !== K.TREE)
      || (x > 0 && TILES[gy][gx + 1] !== K.TREE)) x = 0;
    if ((y < 0 && TILES[gy - 1][gx] !== K.TREE)
      || (y > 0 && TILES[gy + 1][gx] !== K.TREE)) y = 0;
    return { x, y };
  }
  function drawRunDust(camX, camY) {
    if (!player.moving || (!player.running && !isBicycleActive()) || player.onBoat) return;
    const [dx, dy] = delta(player.facing), x = player.px - camX + 16 - dx * 11, y = player.py - camY + 27 - dy * 8;
    const pulse = (performance.now() / 70) % 1;
    cx.fillStyle = `rgba(235,225,190,${0.42 * (1 - pulse)})`;
    cx.beginPath(); cx.arc(x - 5, y, 2 + pulse * 3, 0, Math.PI * 2); cx.arc(x + 4, y + 1, 1.5 + pulse * 2, 0, Math.PI * 2); cx.fill();
  }
  function fishingRodGeometry(facing = player.facing, camX = 0, camY = 0) {
    const handOffsets = (C.FISHING && C.FISHING.handOffsets) || {
      down: [21, 21], left: [17, 22], right: [15, 22], up: [21, 21],
    };
    const handOffset = handOffsets[facing] || [16, 21];
    const tipOffset = {
      down: [7, 13], left: [-13, -7], right: [13, -7], up: [7, -14],
    }[facing] || [0, -12];
    const startX = player.px - camX + handOffset[0], startY = player.py - camY + handOffset[1];
    const rodX = startX + tipOffset[0], rodY = startY + tipOffset[1];
    return { startX, startY, rodX, rodY };
  }

  function drawFishing(camX, camY) {
    if (!fishing) return;
    const F = C.FISHING || { castMs: 320, waitMs: 900, reelMs: 420 };
    const { startX, startY, rodX, rodY } = fishingRodGeometry(player.facing, camX, camY);
    const targetX = fishing.gx * TILE - camX + TILE / 2, targetY = fishing.gy * TILE - camY + TILE / 2;
    let progress = Math.min(1, fishing.t / F.castMs);
    if (fishing.phase === 'reel') progress = 1 - Math.min(1, (fishing.t - F.castMs - F.waitMs) / F.reelMs);
    const bobX = rodX + (targetX - rodX) * progress;
    const bobY = rodY + (targetY - rodY) * progress - Math.sin(progress * Math.PI) * 8;
    cx.strokeStyle = '#704326'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(startX, startY); cx.lineTo(rodX, rodY); cx.stroke();
    cx.strokeStyle = 'rgba(225,245,255,.9)'; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(rodX, rodY); cx.lineTo(bobX, bobY); cx.stroke();
    if (fishing.phase === 'wait') {
      const ripple = 5 + Math.sin(performance.now() / 90) * 2;
      cx.strokeStyle = 'rgba(210,245,255,.62)'; cx.beginPath(); cx.ellipse(bobX, bobY + 3, ripple, ripple * .35, 0, 0, Math.PI * 2); cx.stroke();
    }
    cx.fillStyle = '#fff'; cx.fillRect(Math.round(bobX) - 1, Math.round(bobY) - 2, 3, 2);
    cx.fillStyle = '#e84b3c'; cx.fillRect(Math.round(bobX) - 1, Math.round(bobY), 3, 3);
  }
  let touchUiState = '';
  function usesTouchUi() {
    if (VIEWPORT_W <= 700) return true;
    return Boolean(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  }
  function touchBackPresentation() {
    if (state === 'overworld' && dialog.active) return { label: 'TIẾP', title: 'Tiếp tục hội thoại', continues: true };
    if (state === 'battle') {
      if (battle && battle.phase === 'end') return { label: 'TIẾP', title: 'Tiếp tục sau trận đấu', continues: true };
      const chance = Math.round(Math.max(0, Math.min(1, Number(C.COMBAT.runChance) || 0)) * 100);
      return { label: `CHẠY ${chance}%`, title: `Thử bỏ chạy khỏi trận đấu (tỉ lệ ${chance}%)` };
    }
    if (state === 'capture') {
      if (capture && capture.phase === 'end') return { label: 'TIẾP', title: 'Tiếp tục sau kết quả thu phục', continues: true };
      return { label: 'HỦY', title: 'Hủy lượt thu phục và quay lại bản đồ' };
    }
    if (state === 'gym_select') return { label: 'ĐÓNG', title: 'Đóng danh sách bài test Gym' };
    if (state === 'pve') {
      if (pve && pve.phase === 'end') return { label: 'TIẾP', title: 'Tiếp tục sau kết quả thử thách', continues: true };
      return { label: 'RỜI', title: 'Rời thử thách và quay lại bản đồ' };
    }
    if (state === 'dex') return { label: 'ĐÓNG', title: 'Đóng KanjiDex' };
    if (state === 'profile') return { label: 'ĐÓNG', title: 'Đóng Hồ sơ nhân vật' };
    if (state === 'skills') {
      const confirming = skillUi.purchaseConfirmId || skillUi.resetConfirm;
      return confirming ? { label: 'HỦY', title: 'Hủy xác nhận hiện tại' } : { label: 'ĐÓNG', title: 'Đóng Skill Tree' };
    }
    if (state === 'lecture') {
      return lecture && lecture.phase === 'lobby'
        ? { label: 'THOÁT', title: 'Rời Giảng đường' }
        : { label: 'QUAY LẠI', title: 'Quay lại sảnh Giảng đường' };
    }
    return { label: 'QUAY LẠI', title: 'Quay lại' };
  }
  function syncTouchUi() {
    const hidden = state !== 'overworld' || dialog.active;
    syncDexSearchInput();
    const nextState = hidden ? 'hidden' : 'visible';
    const settingsButton = document.getElementById('settings-open');
    if (settingsButton) {
      settingsButton.classList.toggle('game-ui-hidden', hidden);
      settingsButton.setAttribute('aria-hidden', hidden ? 'true' : 'false');
      settingsButton.tabIndex = hidden ? -1 : 0;
    }
    const backButton = document.getElementById('touch-back');
    backButton?.classList.toggle('combat-back', state === 'battle' || state === 'capture' || state === 'pve');
    if (backButton) {
      const presentation = touchBackPresentation();
      backButton.textContent = presentation.label;
      backButton.title = presentation.title;
      backButton.setAttribute('aria-label', presentation.title);
      backButton.classList.toggle('continue-action', Boolean(presentation.continues));
    }
    const bikeButton = document.querySelector?.('#touch-actions [data-action="bicycle"]');
    if (bikeButton) {
      bikeButton.classList.toggle('touch-hidden', hidden || !bicycleAvailable());
      bikeButton.classList.toggle('pressed', isBicycleActive());
      bikeButton.textContent = isBicycleActive() ? 'BIKE ✓' : 'BIKE';
    }
    const autoButton = document.querySelector?.('#touch-actions [data-action="auto-ride"]');
    if (autoButton) {
      autoButton.classList.toggle('touch-hidden', hidden || !autoRideAvailable());
      autoButton.classList.toggle('pressed', autoRideActive);
      autoButton.textContent = autoRideActive ? 'AUTO ✓' : 'AUTO';
    }
    if (touchUiState === nextState) return;
    touchUiState = nextState;
    document.getElementById('touch-controls')?.classList.toggle('touch-hidden', hidden);
    document.getElementById('touch-actions')?.classList.toggle('touch-hidden', hidden);
    backButton?.classList.toggle('touch-hidden', !hidden);
  }
  function render() {
    syncTouchUi();
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, cv.width, cv.height);
    setScreenTransform();
    if (state === 'battle') { renderBattle(); return; }
    if (state === 'dex') { renderDex(); return; }
    if (state === 'skills') { renderSkillTree(); if (toast.t > 0) drawToast(); return; }
    if (state === 'profile') { renderProfile(); return; }
    if (state === 'lecture') { renderLecture(); return; }
    if (state === 'capture') { renderCapture(); return; }
    if (state === 'gym_select') { renderGymMenu(); if (toast.t > 0) drawToast(); return; }
    if (state === 'pve') { renderPve(); return; }
    setScreenTransform(worldZoom); renderOverworld(); setScreenTransform();
    drawHudHint();
    if (dialog.active) drawDialog(); else if (toast.t > 0) drawToast();
  }
  function renderOverworld() {
    const camera = overworldCamera();
    let camX = camera.camX, camY = camera.camY;
    const frameNow = performance.now(), bounds = visibleTileBounds(camX, camY), ground = ensureWorldGroundCache();
    if (ground) cx.drawImage(ground, camX, camY, VIEW_PX_W, VIEW_PX_H, 0, 0, VIEW_PX_W, VIEW_PX_H);
    for (let y = bounds.startY; y <= bounds.endY; y++) for (let x = bounds.startX; x <= bounds.endX; x++) {
      const idx = worldGroundTileAt(x, y);
      const sx = x * TILE - camX, sy = y * TILE - camY;
      if (!ground) { drawTileOn(cx, idx, sx, sy, x, y); drawStaticGroundDetail(cx, idx, sx, sy, x, y); }
      if (idx === K.WATER) drawGroundDetail(idx, sx, sy, x, y, frameNow);
    }
    // Arena floor effects belong below actors. Drawing this translucent layer
    // after NPCs made their theme icons and sprites look washed out.
    drawTrainerArenaBackground(camX, camY);
    for (const { gx: x, gy: y } of TREE_CELLS) {
      if (x < bounds.startX || x > bounds.endX || y < bounds.startY || y > bounds.endY) continue;
      const sx = x * TILE - camX, sy = y * TILE - camY;
      if (sx < -TILE || sx > VIEW_PX_W || sy < -TILE || sy > VIEW_PX_H) continue;
      const { x: jitterX, y: jitterY } = treeRenderJitter(x, y);
      cx.fillStyle = 'rgba(8,45,24,.22)'; cx.beginPath(); cx.ellipse(sx + 17 + jitterX, sy + 27 + jitterY, 13, 5, 0, 0, Math.PI * 2); cx.fill();
      drawTile(K.TREE, sx + jitterX, sy + jitterY);
    }
    drawAcademy(camX, camY);
    drawTulipGardens(camX, camY, frameNow);
    drawCampusLandmarks(camX, camY);
    drawWorldProps(camX, camY);
    drawTechParkDecorations(camX, camY, frameNow);
    // Biển thuộc lớp cảnh quan: actor đi ngang phải luôn nổi phía trước thay
    // vì bị tấm biển che mất toàn bộ thân người/Kanji đi theo.
    drawMapSigns(camX, camY);
    // Tường Arena là kiến trúc nền khi actor đã bước vào sân. Vẽ trước toàn
    // bộ NPC/Kanjimon/người chơi để sprite lớn không bị tile tường cắt ngang.
    drawTrainerArenaForeground(camX, camY);
    for (const n of NPCS) {
      const npcX = n.gx * TILE - camX, npcY = n.gy * TILE - camY;
      if (npcX < -TILE * 2 || npcX > VIEW_PX_W + TILE || npcY < -TILE * 2 || npcY > VIEW_PX_H + TILE) continue;
      drawCharacterShadow(npcX, npcY);
      drawSprite(imgs.npc, n.facing || 'down', 0, npcX, npcY,
        C.CHARACTER.npcV4DrawSize, C.CHARACTER.npcV4FrameSize);
      if (n.icon) drawNpcThemeIcon(n, npcX, npcY);
      if (n.type === 'trainer') {
        const status = trainerStatus(n.trainerId), marker = status.state === 'defeated' ? '✓' : status.state === 'locked' ? '×' : '!';
        cx.fillStyle = status.state === 'defeated' ? '#6effa1' : status.state === 'locked' ? '#ffd54a' : '#ff8b8b';
        cx.font = 'bold 11px "KanjiGo UI",sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
        cx.strokeStyle = 'rgba(6,14,28,.95)'; cx.lineWidth = 3;
        cx.strokeText(marker, Math.round(npcX + 27), Math.round(npcY - 7));
        cx.fillText(marker, Math.round(npcX + 27), Math.round(npcY - 7));
        cx.textAlign = 'left'; cx.textBaseline = 'alphabetic';
      }
    }
    drawOnboardingGuide(camX, camY, frameNow);
    drawPet(camX, camY);
    drawRunDust(camX, camY);
    if (player.onBoat) drawTile(K.BOAT, Math.round(player.px - camX), Math.round(player.py - camY));
    const playerX = Math.round(player.px - camX), playerY = Math.round(player.py - camY);
    const riding = isBicycleActive();
    const unifiedBicycleRider = riding && activePlayerBicycleAsset && imgs.player_bicycle;
    if (!player.onBoat && !unifiedBicycleRider) drawCharacterShadow(playerX, playerY, riding ? 27 : 18);
    if (unifiedBicycleRider) {
      // A seated side silhouette is wider and visually shorter than its
      // front/back counterpart, so it needs its own scale and ground offset.
      const unifiedSideFacing = player.facing === 'left' || player.facing === 'right';
      const unifiedDrawSize = unifiedSideFacing
        ? Number(C.CHARACTER && C.CHARACTER.bicycleRiderSideDrawSize) || 48
        : Number(C.CHARACTER && C.CHARACTER.bicycleRiderDrawSize) || 42;
      drawSprite(imgs.player_bicycle, player.facing, player.frame, playerX, playerY,
        unifiedDrawSize,
        Number(C.CHARACTER && C.CHARACTER.bicycleRiderFrameSize) || 128);
      drawFishing(camX, camY);
      drawOnboardingWaypoint(camX, camY, frameNow);
      return;
    }
    // Lift the canonical player into a riding pose without swapping face,
    // uniform or animation source. Layering is direction-aware below.
    const sideFacing = player.facing === 'left' || player.facing === 'right';
    const riderLift = sideFacing && C.BICYCLE.sideRiderLift != null
      ? C.BICYCLE.sideRiderLift : C.BICYCLE.riderLift;
    const riderY = playerY - (riding
      ? Math.round(Math.max(0, Number(riderLift) || 0) * activePlayerDrawScale) : 0);
    const bicycleOverlayDrop = player.facing === 'down' || player.facing === 'up'
      ? C.BICYCLE.verticalOverlayDrop : C.BICYCLE.sideOverlayDrop;
    const bicycleY = playerY + (riding
      ? Math.round(Math.max(0, Number(bicycleOverlayDrop) || 0) * activePlayerDrawScale) : 0);
    const drawBicycle = (lowerSliceOnly = false) => {
      const bicycleDrawSize = Math.max(TILE, Math.round(
        (Number(C.CHARACTER && C.CHARACTER.bicycleDrawSize) || TILE) * activePlayerDrawScale));
      const bicycleFrameSize = Math.max(TILE, Number(C.CHARACTER && C.CHARACTER.bicycleFrameSize) || TILE);
      const bicycleFacing = player.facing === 'left' ? 'right'
        : player.facing === 'right' ? 'left' : player.facing;
      if (lowerSliceOnly && sideFacing) {
        const split = Math.max(0, Math.min(bicycleFrameSize,
          Number(C.BICYCLE && C.BICYCLE.sideForegroundSplit) || bicycleFrameSize / 2));
        const sourceHeight = bicycleFrameSize - split;
        const drawHeight = sourceHeight / bicycleFrameSize * bicycleDrawSize;
        const offsetX = (bicycleDrawSize - TILE) / 2, offsetY = bicycleDrawSize - TILE;
        cx.drawImage(imgs.bicycle_overlay,
          player.frame * bicycleFrameSize, C.DIR_ROW[bicycleFacing] * bicycleFrameSize + split,
          bicycleFrameSize, sourceHeight,
          Math.round(playerX - offsetX), Math.round(bicycleY - offsetY + split / bicycleFrameSize * bicycleDrawSize),
          bicycleDrawSize, drawHeight);
        return;
      }
      drawSprite(imgs.bicycle_overlay, bicycleFacing, player.frame, playerX, bicycleY,
        bicycleDrawSize, bicycleFrameSize);
    };
    const configuredRiderFrames = C.BICYCLE && C.BICYCLE.sideRiderFrames;
    const riderFrame = riding && sideFacing && Array.isArray(configuredRiderFrames)
      ? Number(configuredRiderFrames[player.frame]) || 0 : player.frame;
    // Side views use a three-layer riding rig: bicycle base, synchronized
    // rider, then only the wheels/lower frame. This gives the body natural
    // depth without letting the handlebar/frame cut across the torso.
    if (riding && player.facing !== 'down') drawBicycle();
    drawSprite(imgs.player, player.facing, riderFrame, playerX, riderY,
      activePlayerDrawSize, activePlayerFrameSize);
    if (riding && sideFacing) drawBicycle(true);
    else if (riding && player.facing === 'down') drawBicycle();
    drawFishing(camX, camY);
    drawOnboardingWaypoint(camX, camY, frameNow);
  }
  function overworldCamera() {
    let camX = player.px + TILE / 2 - VIEW_PX_W / 2;
    let camY = player.py + TILE / 2 - VIEW_PX_H / 2;
    // Khi tiến vào FTown, dịch camera lên theo một bell curve liên tục để toàn
    // bộ facade/logo xuất hiện mà không tạo cú jump tại ranh giới khu vực.
    const gx = player.px / TILE, gy = player.py / TILE;
    const ftownHorizontal = Math.max(0, 1 - Math.abs(gx - 53.5) / 9);
    const ftownVertical = gy < 9 || gy > 15 ? 0 : gy <= 12 ? (gy - 9) / 3 : (15 - gy) / 3;
    camY -= TILE * 4.75 * ftownHorizontal * Math.max(0, ftownVertical);
    camX = Math.max(0, Math.min(camX, MAP_W * TILE - VIEW_PX_W)); camY = Math.max(0, Math.min(camY, MAP_H * TILE - VIEW_PX_H));
    return { camX, camY };
  }
  function trainerArenaFrame(camX, camY) {
    if (!ARENA) return null;
    const left = ARENA.x * TILE - camX, top = ARENA.y * TILE - camY;
    const width = ARENA.width * TILE, height = ARENA.height * TILE;
    if (left + width < -TILE || left > VIEW_PX_W + TILE || top + height < -TILE || top > VIEW_PX_H + TILE) return null;
    return { left, top, width, height,
      centerX: ARENA.centerGx * TILE - camX + TILE / 2, centerY: ARENA.centerGy * TILE - camY + TILE / 2 };
  }
  function drawTrainerArenaBackground(camX, camY) {
    const frame = trainerArenaFrame(camX, camY);
    if (!frame) return;
    const { left, top, width, height, centerX, centerY } = frame;
    cx.fillStyle = 'rgba(17,25,48,.12)'; cx.fillRect(left + 5, top + 7, width - 10, height - 8);
    // Vòng đấu nằm dưới Boss, Trainer và badge chủ đề để các chi tiết luôn rõ.
    cx.fillStyle = 'rgba(16,38,67,.18)'; cx.beginPath(); cx.ellipse(centerX, centerY + 7, TILE * 2.2, TILE * 1.4, 0, 0, Math.PI * 2); cx.fill();
    cx.strokeStyle = '#f0ca58'; cx.lineWidth = 2; cx.beginPath(); cx.ellipse(centerX, centerY + 7, TILE * 2, TILE * 1.22, 0, 0, Math.PI * 2); cx.stroke();
    cx.strokeStyle = 'rgba(255,241,164,.58)'; cx.lineWidth = 1; cx.beginPath(); cx.ellipse(centerX, centerY + 7, TILE * 1.25, TILE * .72, 0, 0, Math.PI * 2); cx.stroke();
  }
  function drawTrainerArenaForeground(camX, camY) {
    const frame = trainerArenaFrame(camX, camY);
    if (!frame) return;
    const { left, top, width, centerX } = frame;
    // Atlas runtime: ngang, dọc, bo trên-trái, trên-phải, dưới-trái, dưới-phải.
    const wallVariant = (gx, gy) => {
      const leftEdge = gx === ARENA.x, rightEdge = gx === ARENA.x + ARENA.width - 1;
      const topEdge = gy === ARENA.y, bottomEdge = gy === ARENA.y + ARENA.height - 1;
      if (topEdge && leftEdge) return 2;
      if (topEdge && rightEdge) return 3;
      if (bottomEdge && leftEdge) return 4;
      if (bottomEdge && rightEdge) return 5;
      return topEdge || bottomEdge ? 0 : 1;
    };
    // Tường đá pixel-art, chừa bốn cổng đúng theo collision map.
    for (let gy = ARENA.y; gy < ARENA.y + ARENA.height; gy++) for (let gx = ARENA.x; gx < ARENA.x + ARENA.width; gx++) {
      if (tileAt(gx, gy) !== K.ACADEMY_WALL) continue;
      const x = gx * TILE - camX, y = gy * TILE - camY;
      if (imgs.arena_wall_tiles) {
        cx.drawImage(imgs.arena_wall_tiles, wallVariant(gx, gy) * TILE, 0, TILE, TILE, x, y, TILE, TILE);
      }
    }
    // Cổng phía bắc tạo silhouette kiến trúc rõ ràng khi đi từ Giảng đường xuống.
    const gateX = centerX - TILE * 1.8, gateY = top + 5;
    cx.fillStyle = '#172640'; cx.fillRect(gateX, gateY, TILE * 3.6, 16);
    cx.fillStyle = '#d7b85b'; cx.fillRect(gateX + 4, gateY + 3, TILE * 3.6 - 8, 3);
    cx.fillStyle = '#eef6ff'; cx.font = 'bold 8px "KanjiGo UI",sans-serif'; cx.textAlign = 'center'; cx.fillText('KANJI TRAINER ARENA', centerX, gateY + 12); cx.textAlign = 'left';
    // Cờ góc làm Arena dễ nhận diện nhưng không che Trainer hoặc lối đi.
    [[left + 6, top + 3, '#e45252'], [left + width - 10, top + 3, '#4b8ee8']].forEach(([x, y, color]) => {
      cx.fillStyle = '#172640'; cx.fillRect(x, y - 13, 2, 18);
      cx.fillStyle = color; cx.fillRect(x + 2, y - 12, 10, 7);
      cx.fillStyle = 'rgba(255,255,255,.55)'; cx.fillRect(x + 3, y - 11, 7, 1);
    });
  }
  function drawThemeAtlasIcon(key, x, y, iconSize = 24, alpha = 1) {
    const atlas = imgs.trainer_theme_icons;
    if (!atlas) return false;
    const previousAlpha = Number.isFinite(cx.globalAlpha) ? cx.globalAlpha : 1;
    const iconIndex = TRAINER_THEME_ICON_INDEX[key];
    if (!Number.isInteger(iconIndex)) return false;
    const atlasWidth = atlas.naturalWidth || atlas.width || 256;
    const atlasHeight = atlas.naturalHeight || atlas.height || 256;
    const column = iconIndex % 4, row = Math.floor(iconIndex / 4);
    const scaleX = atlasWidth / 256, scaleY = atlasHeight / 256;
    const sourceX = TRAINER_THEME_ATLAS_COLUMNS[column] * scaleX;
    const sourceY = TRAINER_THEME_ATLAS_ROWS[row] * scaleY;
    const sourceW = TRAINER_THEME_ATLAS_CELL * scaleX, sourceH = TRAINER_THEME_ATLAS_CELL * scaleY;
    cx.save();
    cx.globalAlpha = Math.max(0, Math.min(1, Number(alpha) || 0));
    cx.imageSmoothingEnabled = false;
    cx.drawImage(atlas,
      sourceX, sourceY, sourceW, sourceH,
      Math.round(x), Math.round(y), Math.round(iconSize), Math.round(iconSize));
    cx.restore();
    // Test/minimal canvas implementations may not preserve state through save/restore.
    cx.globalAlpha = previousAlpha;
    return true;
  }
  function drawNpcThemeIcon(npc, npcX, npcY) {
    const iconSize = 24, key = npc.type === 'gym' ? 'gym' : npc.trainerId;
    drawThemeAtlasIcon(key, npcX + (TILE - iconSize) / 2, npcY - iconSize + 1, iconSize);
  }
  function drawOnboardingGuide(camX, camY, now) {
    const tour = onboardingTour();
    if (!tour || !imgs.npc) return;
    const x = Math.round(tour.stop.gx * TILE - camX), y = Math.round(tour.stop.gy * TILE - camY);
    if (x < -TILE * 2 || x > VIEW_PX_W + TILE || y < -TILE * 2 || y > VIEW_PX_H + TILE) return;
    const pulse = .5 + Math.sin(now / 240) * .5;
    cx.fillStyle = `rgba(255,214,93,${.10 + pulse * .12})`; cx.beginPath(); cx.arc(x + 16, y + 19, 18 + pulse * 3, 0, Math.PI * 2); cx.fill();
    cx.strokeStyle = `rgba(255,222,100,${.58 + pulse * .34})`; cx.lineWidth = 2; cx.beginPath(); cx.ellipse(x + 16, y + 29, 15 + pulse * 2, 5 + pulse, 0, 0, Math.PI * 2); cx.stroke();
    drawCharacterShadow(x, y);
    drawSprite(imgs.npc, tour.stop.facing || 'down', Math.floor(now / 360) % 2, x, y,
      C.CHARACTER.npcV4DrawSize, C.CHARACTER.npcV4FrameSize);
    const label = `✦ ${tour.name}`;
    cx.font = 'bold 8px "KanjiGo UI",sans-serif';
    const labelW = Math.max(42, cx.measureText(label).width + 10), labelX = x + 16 - labelW / 2;
    cx.fillStyle = 'rgba(8,18,42,.92)'; cx.fillRect(labelX, y - 15, labelW, 12);
    cx.strokeStyle = '#ffd65d'; cx.lineWidth = 1; cx.strokeRect(labelX, y - 15, labelW, 12);
    cx.fillStyle = '#fff3b0'; cx.textAlign = 'center'; cx.fillText(label, x + 16, y - 6); cx.textAlign = 'left';
    if (onboardingGuideInReach()) {
      cx.fillStyle = '#fff'; cx.font = 'bold 11px "KanjiGo UI",sans-serif'; cx.textAlign = 'center';
      cx.strokeStyle = 'rgba(4,10,24,.95)'; cx.lineWidth = 3; cx.strokeText('SPACE', x + 16, y - 21); cx.fillText('SPACE', x + 16, y - 21); cx.textAlign = 'left';
    }
  }
  let lastOnboardingWaypoint = null;
  function drawOnboardingWaypoint(camX, camY, now) {
    const waypoint = onboardingWaypoint();
    if (!waypoint) { lastOnboardingWaypoint = null; return; }
    const playerX = player.px - camX + TILE / 2, playerY = player.py - camY;
    const bob = Math.sin(now / 170) * 2, markerX = playerX, markerY = playerY - 25 + bob;
    const pulse = .5 + Math.sin(now / 210) * .5;
    cx.save(); cx.translate(markerX, markerY); cx.rotate(waypoint.angle);
    cx.fillStyle = `rgba(255,214,74,${.16 + pulse * .12})`; cx.beginPath(); cx.arc(0, 0, 16 + pulse * 2, 0, Math.PI * 2); cx.fill();
    cx.strokeStyle = 'rgba(7,17,38,.92)'; cx.lineWidth = 5; cx.lineJoin = 'round';
    cx.beginPath(); cx.moveTo(13, 0); cx.lineTo(-7, -9); cx.lineTo(-3, 0); cx.lineTo(-7, 9); cx.closePath(); cx.stroke();
    cx.fillStyle = '#ffd64a'; cx.fill();
    cx.strokeStyle = '#fff2a6'; cx.lineWidth = 1.5; cx.stroke(); cx.restore();
    cx.fillStyle = 'rgba(7,17,38,.9)'; cx.fillRect(markerX - 17, markerY - 23, 34, 11);
    cx.strokeStyle = '#ffd64a'; cx.lineWidth = 1; cx.strokeRect(markerX - 17, markerY - 23, 34, 11);
    cx.fillStyle = '#fff4b0'; cx.font = 'bold 8px "KanjiGo UI",sans-serif'; cx.textAlign = 'center';
    cx.fillText(String(waypoint.name || 'Aoi').toUpperCase(), markerX, markerY - 15); cx.textAlign = 'left';
    lastOnboardingWaypoint = { ...waypoint, x: markerX, y: markerY };
  }
  function drawMapSigns(camX, camY) {
    for (const sign of MAP_SIGNS) {
      const x = sign.gx * TILE - camX, y = sign.gy * TILE - camY;
      if (x < -TILE * 3 || x > VIEW_PX_W || y < -TILE || y > VIEW_PX_H) continue;
      const width = Math.max(58, String(sign.label).length * 6 + 14);
      cx.fillStyle = '#5b3a24'; cx.fillRect(x + 5, y + 8, 3, 23); cx.fillRect(x + width - 2, y + 8, 3, 23);
      cx.fillStyle = sign.color || '#3f7652'; cx.fillRect(x, y + 2, width + 6, 18);
      cx.fillStyle = 'rgba(255,255,255,.28)'; cx.fillRect(x + 2, y + 4, width + 2, 2);
      cx.strokeStyle = '#243824'; cx.strokeRect(x, y + 2, width + 6, 18);
      cx.fillStyle = '#fff8d4'; cx.font = 'bold 8px "KanjiGo UI",sans-serif'; cx.textAlign = 'center';
      cx.fillText(sign.label, x + (width + 6) / 2, y + 15); cx.textAlign = 'left';
    }
  }
  function drawPet(camX, camY) {
    if (!followerUnlocked()) return;
    const img = monsterImg(currentPetId); if (!img) return;
    const mon = C.MONSTERS[currentPetId], pos = petFollowPosition(), level = petLevel(), size = petSizeFor(level);
    const ratio = img.height / img.width, w = size, h = size * ratio;
    const bob = C.PET.bob ? Math.sin(Date.now() / 220) * 1.5 : 0;
    const motion = followerMeaningMotion(mon, player.moving);
    const dx = pos.px - camX + (TILE - w) / 2 + motion.x, dy = pos.py - camY + (TILE - h) + bob + motion.y;
    cx.fillStyle = 'rgba(0,0,0,.18)'; cx.beginPath(); cx.ellipse(dx + w / 2, pos.py - camY + TILE - 2, w * 0.38, 4, 0, 0, Math.PI * 2); cx.fill();
    // Aura được vẽ sau bóng nhưng trước sprite để pet không bị che mặt.
    if (kanjiAnimation(mon)) drawMonsterMeaningEffect(mon, dx + w / 2, pos.py - camY + TILE + motion.y, w * 1.18, player.moving ? .9 : .64);
    cx.save(); cx.imageSmoothingEnabled = false;
    cx.translate(dx + w / 2, dy + h); cx.rotate(motion.rotation); cx.scale(motion.scaleX, motion.scaleY);
    cx.drawImage(img, -w / 2, -h, w, h); cx.restore();
  }
  function drawAcademy(camX, camY) {
    const a = C.ACADEMY, x = a.gx * TILE - camX, y = a.gy * TILE - camY;
    const w = a.width * TILE, h = a.height * TILE;
    const academy = imgs.academy;
    if (academy) cx.drawImage(academy, x, y, w, h);
    const plaqueW = 92, plaqueX = x + w / 2 - plaqueW / 2, plaqueY = y - 17;
    cx.fillStyle = 'rgba(25,32,48,.88)'; cx.fillRect(plaqueX, plaqueY, plaqueW, 14);
    cx.fillStyle = '#d7b85b'; cx.fillRect(plaqueX + 2, plaqueY + 2, plaqueW - 4, 2);
    cx.strokeStyle = '#4b321f'; cx.strokeRect(plaqueX, plaqueY, plaqueW, 14);
    cx.fillStyle = '#fff1c1'; cx.font = 'bold 8px "KanjiGo UI",sans-serif'; cx.textAlign = 'center';
    cx.fillText('GIẢNG ĐƯỜNG KANJI', x + w / 2, plaqueY + 11); cx.textAlign = 'left';
  }
  function landmarkVisible(landmark, camX, camY) {
    const x = landmark.gx * TILE - camX, y = landmark.gy * TILE - camY;
    return x + landmark.width * TILE >= -TILE && x <= VIEW_PX_W + TILE
      && y + landmark.height * TILE >= -TILE && y <= VIEW_PX_H + TILE;
  }
  function landmarkCastsShadow(landmark) {
    return landmark && landmark.asset === 'landmark_heritage_pavilion';
  }
  function drawCampusLandmarks(camX, camY) {
    for (const landmark of MAP_LANDMARKS) {
      if (!landmarkVisible(landmark, camX, camY)) continue;
      const image = deferredImg(landmark.asset);
      if (!image) continue;
      const x = Math.round(landmark.gx * TILE - camX), y = Math.round(landmark.gy * TILE - camY);
      const w = landmark.width * TILE, h = landmark.height * TILE;
      if (landmarkCastsShadow(landmark)) {
        cx.fillStyle = 'rgba(8,22,25,.25)'; cx.beginPath(); cx.ellipse(x + w / 2, y + h - 5, w * .47, 10, 0, 0, Math.PI * 2); cx.fill();
      }
      cx.save(); cx.imageSmoothingEnabled = false; cx.drawImage(image, x, y, w, h); cx.restore();
    }
  }
  function drawWorldProps(camX, camY) {
    for (const prop of MAP_PROPS) {
      const x = Math.round(prop.gx * TILE - camX), y = Math.round(prop.gy * TILE - camY);
      const w = prop.width * TILE, h = prop.height * TILE;
      if (x + w < -TILE || x > VIEW_PX_W + TILE || y + h < -TILE || y > VIEW_PX_H + TILE) continue;
      const image = deferredImg(prop.asset);
      if (!image) continue;
      cx.save(); cx.imageSmoothingEnabled = false; cx.drawImage(image, x, y, w, h); cx.restore();
    }
  }
  function drawTechParkDecorations(camX, camY, now) {
    if (!TECH_PARK) return;
    const point = (entry) => ({ x: entry.gx * TILE - camX, y: entry.gy * TILE - camY });
    const server = point(TECH_PARK.server);
    if (server.x > -TILE && server.x < VIEW_PX_W && server.y > -TILE && server.y < VIEW_PX_H) {
      cx.fillStyle = 'rgba(0,0,0,.2)'; cx.beginPath(); cx.ellipse(server.x + 16, server.y + 29, 13, 4, 0, 0, Math.PI * 2); cx.fill();
      cx.fillStyle = '#1b2638'; cx.fillRect(server.x + 5, server.y + 2, 22, 27); cx.strokeStyle = '#6a7890'; cx.strokeRect(server.x + 5, server.y + 2, 22, 27);
      for (let row = 0; row < 4; row++) {
        cx.fillStyle = '#34445b'; cx.fillRect(server.x + 8, server.y + 6 + row * 5, 16, 3);
        cx.fillStyle = Math.sin(now / 180 + row) > 0 ? '#68ffc0' : '#31a3da'; cx.fillRect(server.x + 20, server.y + 7 + row * 5, 2, 1);
      }
    }
    const portal = point(TECH_PARK.portal), pulse = 1 + Math.sin(now / 260) * .12;
    if (portal.x > -TILE && portal.x < VIEW_PX_W && portal.y > -TILE && portal.y < VIEW_PX_H) {
      cx.fillStyle = 'rgba(27,15,73,.28)'; cx.beginPath(); cx.ellipse(portal.x + 16, portal.y + 28, 14, 4, 0, 0, Math.PI * 2); cx.fill();
      cx.strokeStyle = '#a78bff'; cx.lineWidth = 3; cx.beginPath(); cx.arc(portal.x + 16, portal.y + 16, 11 * pulse, 0, Math.PI * 2); cx.stroke();
      cx.strokeStyle = '#56eaff'; cx.lineWidth = 1; cx.beginPath(); cx.arc(portal.x + 16, portal.y + 16, 6 / pulse, 0, Math.PI * 2); cx.stroke();
      cx.fillStyle = '#d7cbff'; cx.font = 'bold 6px "KanjiGo UI",sans-serif'; cx.textAlign = 'center'; cx.fillText('01', portal.x + 16, portal.y + 18); cx.textAlign = 'left';
    }
    const duck = point(TECH_PARK.duck);
    if (duck.x > -TILE && duck.x < VIEW_PX_W && duck.y > -TILE && duck.y < VIEW_PX_H) {
      const bob = Math.round(Math.sin(now / 310)); cx.fillStyle = '#f6cf35'; cx.fillRect(duck.x + 9, duck.y + 14 + bob, 14, 9); cx.fillRect(duck.x + 16, duck.y + 9 + bob, 8, 8);
      cx.fillStyle = '#f08a27'; cx.fillRect(duck.x + 23, duck.y + 14 + bob, 6, 3); cx.fillStyle = '#1a2634'; cx.fillRect(duck.x + 21, duck.y + 11 + bob, 2, 2);
      cx.strokeStyle = 'rgba(116,210,243,.62)'; cx.beginPath(); cx.ellipse(duck.x + 16, duck.y + 25, 13, 4, 0, 0, Math.PI * 2); cx.stroke();
    }
    for (const [gx, gy, bit] of TECH_PARK.binaryFlowers || []) {
      const x = gx * TILE - camX, y = gy * TILE - camY; if (x < -TILE || x > VIEW_PX_W || y < -TILE || y > VIEW_PX_H) continue;
      cx.fillStyle = '#3c893f'; cx.fillRect(x + 15, y + 18, 2, 10); cx.fillStyle = bit ? '#ff9fc7' : '#73d9ff'; cx.fillRect(x + 12, y + 14, 8, 6);
      cx.fillStyle = '#10223b'; cx.font = 'bold 6px "KanjiGo UI",sans-serif'; cx.textAlign = 'center'; cx.fillText(String(bit), x + 16, y + 20); cx.textAlign = 'left';
    }
  }
  function drawTulipGardens(camX, camY, now) {
    if (!TULIP_GARDENS.length) return;
    for (const garden of TULIP_GARDENS) {
      const phase = Number(garden.phase) || 0;
      for (let row = 0; row < garden.height; row++) for (let column = 0; column < garden.width; column++) {
        const gx = garden.x + column, gy = garden.y + row;
        const x = Math.round(gx * TILE - camX), y = Math.round(gy * TILE - camY);
        const tilePhase = phase + column * 1.37 + row * 1.91;
        const sway = Math.round(Math.sin(now / 680 + tilePhase));

        // Mỗi tile có một cặp cánh hoa nhỏ đung đưa và một sparkle lệch pha.
        // Lớp động này nằm ngoài ground cache nên cả luống hoa chuyển động nhẹ,
        // trong khi bitmap nền liền mạch chỉ được dựng một lần.
        cx.globalAlpha = .55;
        cx.fillStyle = (column + row) % 2 ? '#ff8db4' : '#ffd63c';
        cx.fillRect(x + 9 + sway, y + 12, 2, 2);
        cx.fillStyle = '#fff4ee'; cx.fillRect(x + 22 - sway, y + 23, 2, 2);

        const pulse = Math.max(0, Math.sin(now / 390 + tilePhase * 1.4));
        if (pulse > .72) {
          const sparkleX = x + 6 + ((gx * 11 + gy * 7) % 20), sparkleY = y + 6 + ((gx * 5 + gy * 13) % 18);
          cx.globalAlpha = Math.min(.85, (pulse - .72) * 3.2);
          cx.fillStyle = '#fff8b8';
          cx.fillRect(sparkleX - 2, sparkleY, 5, 1); cx.fillRect(sparkleX, sparkleY - 2, 1, 5);
        }
        cx.globalAlpha = 1;
      }
    }
  }
  function radarSummary(now = Date.now()) {
    const entries = Object.values(KDB.KANJI).map((info) => ({ info, stat: ensureMastery(info.char) }))
      .filter(({ info, stat }) => stat.captured && isTierUnlocked(tierOfKanji(info.char)));
    const due = entries.filter(({ info }) => isDue(info.char, now)).length;
    const weak = entries.filter(({ stat }) => stat.recall < 70).length;
    return { due, weak, total: entries.length, mode: resolveSkillEffects().radarMode, target: radarTarget, targetLabel: radarTargetLabel() };
  }
  function overworldHudLayout() {
    const compact = SCREEN_W < 620;
    const statusW = Math.min(SCREEN_W - 16, compact ? 230 : 270);
    // Settings là DOM overlay theo CSS pixels, còn HUD dùng logical canvas
    // pixels. Quy đổi gutter để hai lớp luôn có vùng riêng ở mọi DPI/scale.
    const settingsGutter = compact ? 0 : Math.ceil(66 / Math.max(.01, presentationScale));
    const statusX = compact ? 8 : SCREEN_W - statusW - 8 - settingsGutter;
    const statusY = compact ? 42 : 8;
    const hintW = Math.min(SCREEN_W - 16, compact ? 340 : Math.max(300, Math.min(680, statusX - 16)));
    return { compact, statusW, statusX, statusY, hintW, settingsGutter };
  }
  function drawHudHint() {
    overworldHitboxes = [];
    const academy = academyEntranceInReach();
    const { compact, statusW, statusX, statusY, hintW } = overworldHudLayout();
    const radar = radarSummary(), total = KANJI_BY_CHAR.size, captured = capturedKanjiCount();
    const touchUi = usesTouchUi();
    const explorationGuide = bicycleAvailable() ? ' · B Bike' : '';
    const autoRideGuide = autoRideAvailable() ? ' · P Auto' : '';
    const radarGuide = radar.mode === 'targeting' ? ' · R Radar' : '';
    const tour = onboardingTour(), tourNearby = onboardingGuideInReach();
    const message = tour
      ? `🎓 ${tourNearby ? `SPACE: nói chuyện với cô ${tour.name}` : `${tour.stop.objective} • ${onboardingGuideDirection(tour)}`} · ${tour.index + 1}/${tour.total}`
      : fishing ? '🎣 Đang câu cá...'
        : academy ? `${touchUi ? 'SPACE' : 'Space/Enter'}: Vào Giảng đường`
          : compact && touchUi ? 'Dùng nút bên dưới để di chuyển, tương tác và mở menu'
            : compact ? `I: Hồ sơ · D: Dex · K: Skill${explorationGuide}${autoRideGuide}${radarGuide}`
              : `↑↓←→ Đi · Shift Chạy · Space Tương tác · D Dex · K Skill · I Hồ sơ${explorationGuide}${autoRideGuide}${radarGuide}`;
    cx.fillStyle = 'rgba(11,16,48,.68)'; cx.fillRect(8, 8, hintW, 28);
    cx.fillStyle = '#9fd8f5'; fitText(message, 16, 27, hintW - 16, 13);
    const petStatus = followerUnlocked() ? `Pet「${C.MONSTERS[currentPetId]?.kanji || '?'}」` : 'Chưa có Pet';
    const status = `⭐${availableKP()} KP · ${captured}/${total} · ${petStatus}${isBicycleActive() ? ' · 🚲 ON' : ''}${autoRideActive ? ' · 🧭 AUTO' : ''}`;
    cx.fillStyle = 'rgba(11,16,48,.72)'; cx.fillRect(statusX, statusY, statusW, 28);
    cx.fillStyle = '#ffd54a'; fitText(status, statusX + 8, statusY + 19, statusW - 16, 12);
    if (radar.mode !== 'off') {
      const radarY = statusY + 34;
      cx.fillStyle = 'rgba(7,38,55,.78)'; cx.fillRect(statusX, radarY, statusW, 25);
      cx.strokeStyle = '#4ac6d6'; cx.strokeRect(statusX, radarY, statusW, 25);
      const radarText = radar.mode === 'targeting' ? `🎯 ${radar.targetLabel} · R/chạm để đổi` : `📡 ${radar.due} tới hạn · ${radar.weak} yếu`;
      cx.fillStyle = '#7ff7ff'; fitText(radarText, statusX + 8, radarY + 17, statusW - 16, 11, true);
      if (radar.mode === 'targeting') overworldHitboxes.push({ action: 'radar', x: statusX, y: radarY, w: statusW, h: 25 });
    }
  }

  // ----- BATTLE render -----
  function quizPanelLayout(W, H) { return RendererCore.quizPanelLayout(C, W, H); }
  function drawMonsterMeaningEffect(mon, centerX, baseY, width, alpha = 1) {
    if (!mon || !mon.effect || alpha <= 0) return;
    const now = performance.now(), t = now / 1000, unit = Math.max(.45, width / 210), effect = mon.effect;
    const centerY = baseY - width * .47;
    cx.save(); cx.globalAlpha = alpha; cx.lineCap = 'round'; cx.lineJoin = 'round';
    const orbit = /^orbit-(\d+)$/.exec(effect);
    if (orbit) {
      const count = Number(orbit[1]), colors = { 1: '#fff4ad', 2: '#a8efff', 3: '#ffb2e9', 4: '#d7b4ff', 5: '#ffb86b', 9: '#85fff4' };
      for (let i = 0; i < count; i++) {
        const a = t * (count > 5 ? .55 : .82) + i * Math.PI * 2 / count;
        const x = centerX + Math.cos(a) * width * .56, y = centerY + Math.sin(a) * width * .34;
        cx.globalAlpha = alpha * (.35 + .4 * ((Math.sin(a * 2 + t * 2) + 1) / 2)); cx.fillStyle = colors[count] || '#d7efff';
        cx.beginPath(); cx.arc(x, y, (count > 5 ? 2.1 : 3.2) * unit, 0, Math.PI * 2); cx.fill();
      }
    } else if (effect === 'rise') {
      for (let i = 0; i < 3; i++) {
        const phase = (t * .46 + i / 3) % 1, y = baseY - width * (.44 + phase * .44);
        cx.globalAlpha = alpha * Math.sin(phase * Math.PI) * .72;
        cx.strokeStyle = '#a8efff'; cx.lineWidth = 3 * unit; cx.beginPath();
        cx.moveTo(centerX - 8 * unit, y + 7 * unit); cx.lineTo(centerX, y); cx.lineTo(centerX + 8 * unit, y + 7 * unit); cx.stroke();
      }
    } else if (effect === 'sunrise') {
      const cy = baseY - width * .48, radius = width * (.48 + Math.sin(t * 2) * .015);
      cx.globalAlpha = alpha * (.28 + Math.sin(t * 2) * .06); cx.strokeStyle = '#ffe27a'; cx.lineWidth = 3 * unit;
      cx.beginPath(); cx.arc(centerX, cy, radius * .66, Math.PI * 1.08, Math.PI * 1.92); cx.stroke();
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * (1.08 + i * .14), r1 = radius * .76, r2 = radius * (.88 + .04 * Math.sin(t * 3 + i));
        cx.beginPath(); cx.moveTo(centerX + Math.cos(a) * r1, cy + Math.sin(a) * r1); cx.lineTo(centerX + Math.cos(a) * r2, cy + Math.sin(a) * r2); cx.stroke();
      }
    } else if (effect === 'gold-sparkle') {
      const points = [[-.52, -.72], [.50, -.58], [-.46, -.22], [.48, -.12]];
      points.forEach(([px, py], i) => {
        const pulse = .35 + .65 * Math.max(0, Math.sin(t * 3.2 + i * 1.7)), x = centerX + px * width, y = baseY + py * width, r = (3 + pulse * 4) * unit;
        cx.globalAlpha = alpha * pulse; cx.strokeStyle = i % 2 ? '#fff4ad' : '#ffd54a'; cx.lineWidth = 2 * unit;
        cx.beginPath(); cx.moveTo(x - r, y); cx.lineTo(x + r, y); cx.moveTo(x, y - r); cx.lineTo(x, y + r); cx.stroke();
      });
    } else if (effect === 'sound-wave') {
      cx.strokeStyle = '#b8f3ff'; cx.lineWidth = 2.5 * unit;
      for (let i = 0; i < 3; i++) {
        const phase = (t * .7 + i / 3) % 1, r = width * (.34 + phase * .25);
        cx.globalAlpha = alpha * (1 - phase) * .62;
        cx.beginPath(); cx.arc(centerX, centerY, r, -.42 * Math.PI, .42 * Math.PI); cx.stroke();
        cx.beginPath(); cx.arc(centerX, centerY, r, .58 * Math.PI, 1.42 * Math.PI); cx.stroke();
      }
    } else if (effect === 'sun-glow') {
      const pulse = .42 + .12 * Math.sin(t * 2.4), r = width * .53;
      cx.globalAlpha = alpha * pulse; cx.strokeStyle = '#fff29b'; cx.lineWidth = 2.5 * unit;
      cx.beginPath(); cx.arc(centerX, centerY, r * .76, 0, Math.PI * 2); cx.stroke();
      for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5, r1 = r * .86, r2 = r * (1 + .05 * Math.sin(t * 3 + i)); cx.beginPath(); cx.moveTo(centerX + Math.cos(a) * r1, centerY + Math.sin(a) * r1); cx.lineTo(centerX + Math.cos(a) * r2, centerY + Math.sin(a) * r2); cx.stroke(); }
    } else if (effect === 'moon-glow') {
      const r = width * .54; cx.globalAlpha = alpha * (.32 + .1 * Math.sin(t * 2)); cx.strokeStyle = '#b9dcff'; cx.lineWidth = 4 * unit;
      cx.beginPath(); cx.arc(centerX, centerY, r, -.42 * Math.PI, .42 * Math.PI); cx.stroke();
      cx.globalAlpha *= .65; cx.beginPath(); cx.arc(centerX + r * .18, centerY, r * .78, -.48 * Math.PI, .48 * Math.PI); cx.stroke();
    } else if (effect === 'boundary') {
      const pulse = (Math.sin(t * 2.2) + 1) / 2, pad = width * (.46 + pulse * .035);
      cx.globalAlpha = alpha * (.24 + pulse * .16); cx.strokeStyle = '#78b6ff'; cx.lineWidth = 2.5 * unit;
      cx.strokeRect(centerX - pad, centerY - width * .43, pad * 2, width * .86);
    } else if (effect === 'grow' || effect === 'center-pulse' || effect === 'now-pulse' || effect === 'portal') {
      const speed = effect === 'now-pulse' ? 1.45 : .7, phase = (t * speed) % 1, baseR = effect === 'portal' ? .28 : .18;
      cx.globalAlpha = alpha * (1 - phase) * (effect === 'now-pulse' ? .65 : .42);
      cx.strokeStyle = effect === 'portal' ? '#9be9ff' : effect === 'grow' ? '#ffc985' : '#a7f5ff'; cx.lineWidth = (effect === 'portal' ? 3 : 2.4) * unit;
      cx.beginPath(); cx.ellipse(centerX, centerY, width * (baseR + phase * .42), width * (baseR * .65 + phase * .27), 0, 0, Math.PI * 2); cx.stroke();
      if (effect === 'center-pulse') { cx.globalAlpha = alpha * .55; cx.beginPath(); cx.moveTo(centerX - 8 * unit, centerY); cx.lineTo(centerX + 8 * unit, centerY); cx.moveTo(centerX, centerY - 8 * unit); cx.lineTo(centerX, centerY + 8 * unit); cx.stroke(); }
    } else if (effect === 'bubbles') {
      cx.strokeStyle = '#b9f3ff'; cx.lineWidth = 2 * unit;
      for (let i = 0; i < 5; i++) { const phase = (t * .34 + i * .19) % 1, side = i % 2 ? 1 : -1, x = centerX + side * width * (.34 + .08 * Math.sin(i)), y = baseY - width * (.12 + phase * .78); cx.globalAlpha = alpha * Math.sin(phase * Math.PI) * .65; cx.beginPath(); cx.arc(x, y, (2.5 + i % 3) * unit, 0, Math.PI * 2); cx.stroke(); }
    } else if (effect === 'seasons' || effect === 'life') {
      const colors = effect === 'seasons' ? ['#ff9fb5', '#72dfa0', '#ffd65c', '#a9d8ff'] : ['#7bff9d', '#c8ff78', '#63e89a', '#e7ffad'];
      for (let i = 0; i < 4; i++) { const phase = (t * .24 + i * .23) % 1, x = centerX + Math.sin(t * 1.2 + i * 2) * width * .48, y = baseY - width * (.08 + phase * .82), r = (3 + i % 2) * unit; cx.globalAlpha = alpha * Math.sin(phase * Math.PI) * .62; cx.fillStyle = colors[i]; cx.save(); cx.translate(x, y); cx.rotate(t + i); cx.fillRect(-r, -r * .55, r * 2, r * 1.1); cx.restore(); }
      if (effect === 'life') { cx.globalAlpha = alpha * .48; cx.strokeStyle = '#9dff9f'; cx.lineWidth = 2 * unit; cx.beginPath(); cx.moveTo(centerX, baseY - width * .05); cx.quadraticCurveTo(centerX - 3 * unit, baseY - width * .17, centerX - 13 * unit, baseY - width * .2); cx.moveTo(centerX, baseY - width * .13); cx.quadraticCurveTo(centerX + 4 * unit, baseY - width * .24, centerX + 14 * unit, baseY - width * .27); cx.stroke(); }
    } else if (effect === 'people-pair') {
      const sway = Math.sin(t * 1.8) * width * .04, y = centerY - width * .02;
      cx.globalAlpha = alpha * .48; cx.strokeStyle = '#ffd7b0'; cx.lineWidth = 2 * unit; cx.beginPath(); cx.moveTo(centerX - width * .46 + sway, y); cx.lineTo(centerX + width * .46 - sway, y); cx.stroke();
      cx.fillStyle = '#ffe0bd'; for (const side of [-1, 1]) { cx.beginPath(); cx.arc(centerX + side * width * .48 - side * sway, y, 5 * unit, 0, Math.PI * 2); cx.fill(); }
    } else if (effect === 'cross-flare') {
      const pulse = .35 + .3 * ((Math.sin(t * 2.8) + 1) / 2), r = width * (.42 + pulse * .12);
      cx.globalAlpha = alpha * pulse; cx.strokeStyle = '#ff8b8b'; cx.lineWidth = 3 * unit; cx.beginPath(); cx.moveTo(centerX - r, centerY); cx.lineTo(centerX + r, centerY); cx.moveTo(centerX, centerY - r); cx.lineTo(centerX, centerY + r); cx.stroke();
    } else if (effect === 'page-flip') {
      cx.globalAlpha = alpha * .48; cx.strokeStyle = '#fff2c4'; cx.lineWidth = 2 * unit;
      for (const side of [-1, 1]) { const wave = Math.sin(t * 2.4 + side) * 5 * unit, x = centerX + side * width * .5; cx.beginPath(); cx.moveTo(x, centerY - 18 * unit); cx.quadraticCurveTo(x + side * wave, centerY, x, centerY + 18 * unit); cx.stroke(); }
    } else if (effect === 'lengthen') {
      const pulse = (.5 + .5 * Math.sin(t * 2)) * width * .08, top = centerY - width * .5 - pulse, bottom = centerY + width * .5 + pulse;
      cx.globalAlpha = alpha * .42; cx.strokeStyle = '#ffc0e8'; cx.lineWidth = 2.5 * unit; cx.beginPath(); cx.moveTo(centerX, top); cx.lineTo(centerX, bottom); cx.moveTo(centerX - 6 * unit, top + 7 * unit); cx.lineTo(centerX, top); cx.lineTo(centerX + 6 * unit, top + 7 * unit); cx.moveTo(centerX - 6 * unit, bottom - 7 * unit); cx.lineTo(centerX, bottom); cx.lineTo(centerX + 6 * unit, bottom - 7 * unit); cx.stroke();
    } else if (effect === 'outward' || effect === 'backtrail' || effect === 'forward') {
      const dirs = effect === 'outward' ? [-1, 1] : effect === 'backtrail' ? [-1] : [1]; cx.strokeStyle = effect === 'backtrail' ? '#a8c7ff' : '#b8fff1'; cx.lineWidth = 2.5 * unit;
      for (const dir of dirs) for (let i = 0; i < 3; i++) { const phase = (t * .55 + i / 3) % 1, x = centerX + dir * width * (.38 + phase * .27), y = centerY + (i - 1) * 12 * unit; cx.globalAlpha = alpha * Math.sin(phase * Math.PI) * .55; cx.beginPath(); cx.moveTo(x - dir * 7 * unit, y - 6 * unit); cx.lineTo(x, y); cx.lineTo(x - dir * 7 * unit, y + 6 * unit); cx.stroke(); }
    } else if (effect === 'split') {
      const phase = (.5 + .5 * Math.sin(t * 1.8)), gap = width * (.33 + phase * .18); cx.globalAlpha = alpha * .5; cx.fillStyle = '#ffc0a8';
      for (const side of [-1, 1]) { cx.beginPath(); cx.arc(centerX + side * gap, centerY, 5 * unit, 0, Math.PI * 2); cx.fill(); }
    } else if (effect === 'clock') {
      const r = width * .13, x = centerX + width * .46, y = centerY - width * .35, a = t * 1.5;
      cx.globalAlpha = alpha * .6; cx.strokeStyle = '#d9f2ff'; cx.lineWidth = 2 * unit; cx.beginPath(); cx.arc(x, y, r, 0, Math.PI * 2); cx.moveTo(x, y); cx.lineTo(x + Math.cos(a) * r * .72, y + Math.sin(a) * r * .72); cx.moveTo(x, y); cx.lineTo(x + Math.cos(a * .2) * r * .48, y + Math.sin(a * .2) * r * .48); cx.stroke();
    } else if (effect === 'steps') {
      cx.fillStyle = '#baffcf'; for (let i = 0; i < 4; i++) { const phase = (t * .45 + i * .23) % 1, x = centerX - width * .5 + phase * width, y = baseY + ((i % 2) ? -8 : -2) * unit; cx.globalAlpha = alpha * Math.sin(phase * Math.PI) * .4; cx.beginPath(); cx.ellipse(x, y, 5 * unit, 2.5 * unit, i % 2 ? -.35 : .35, 0, Math.PI * 2); cx.fill(); }
    } else if (effect === 'scan') {
      const phase = (.5 + .5 * Math.sin(t * 1.7)), y = centerY - width * .36 + phase * width * .72;
      cx.globalAlpha = alpha * .45; cx.strokeStyle = '#d2c3ff'; cx.lineWidth = 2 * unit; cx.beginPath(); cx.moveTo(centerX - width * .5, y); cx.lineTo(centerX + width * .5, y); cx.stroke();
    } else if (effect === 'inward') {
      cx.strokeStyle = '#ffb09d'; cx.lineWidth = 2.5 * unit;
      for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
        const phase = (t * .58 + i / 3) % 1, x = centerX + side * width * (.68 - phase * .3), y = centerY + (i - 1) * 13 * unit;
        cx.globalAlpha = alpha * Math.sin(phase * Math.PI) * .58; cx.beginPath();
        cx.moveTo(x + side * 7 * unit, y - 6 * unit); cx.lineTo(x, y); cx.lineTo(x + side * 7 * unit, y + 6 * unit); cx.stroke();
      }
    } else if (effect === 'study') {
      cx.strokeStyle = '#bcecff'; cx.lineWidth = 2 * unit;
      for (let i = 0; i < 4; i++) {
        const phase = (t * .28 + i * .24) % 1, side = i % 2 ? 1 : -1;
        const x = centerX + side * width * (.43 + .06 * Math.sin(t * 1.8 + i)), y = baseY - width * (.08 + phase * .74), flap = Math.sin(t * 4 + i) * 3 * unit;
        cx.globalAlpha = alpha * Math.sin(phase * Math.PI) * .55; cx.beginPath();
        cx.moveTo(x - 7 * unit, y + flap); cx.lineTo(x, y - 3 * unit); cx.lineTo(x + 7 * unit, y + flap); cx.moveTo(x, y - 3 * unit); cx.lineTo(x, y + 7 * unit); cx.stroke();
      }
    } else if (effect === 'height') {
      const phase = (t * .45) % 1, x = centerX + width * .55, top = centerY - width * .5, bottom = centerY + width * .48;
      cx.globalAlpha = alpha * .5; cx.strokeStyle = '#9dffd0'; cx.lineWidth = 2.5 * unit; cx.beginPath();
      cx.moveTo(x, bottom); cx.lineTo(x, top); cx.moveTo(x - 6 * unit, top + 7 * unit); cx.lineTo(x, top); cx.lineTo(x + 6 * unit, top + 7 * unit); cx.stroke();
      cx.globalAlpha = alpha * Math.sin(phase * Math.PI) * .6; cx.fillStyle = '#d1ffe6'; cx.beginPath(); cx.arc(x, bottom - phase * (bottom - top), 3.5 * unit, 0, Math.PI * 2); cx.fill();
    } else if (effect === 'coin-ring') {
      cx.strokeStyle = '#ffd08a'; cx.lineWidth = 2.5 * unit;
      for (let i = 0; i < 2; i++) {
        const phase = (t * .34 + i * .5) % 1, r = width * (.34 + phase * .22);
        cx.globalAlpha = alpha * (1 - phase) * .52; cx.beginPath(); cx.ellipse(centerX, centerY, r, r * (.58 + .08 * Math.sin(t * 2 + i)), t * .25 + i, 0, Math.PI * 2); cx.stroke();
      }
      for (let i = 0; i < 3; i++) { const a = t * 1.2 + i * Math.PI * 2 / 3, x = centerX + Math.cos(a) * width * .52, y = centerY + Math.sin(a) * width * .3; cx.globalAlpha = alpha * .5; cx.fillStyle = '#fff0b8'; cx.fillRect(x - 2 * unit, y - 2 * unit, 4 * unit, 4 * unit); }
    } else if (effect === 'child-bounce') {
      const colors = ['#ffafd2', '#fff0a8', '#aeeeff'];
      for (let i = 0; i < 3; i++) {
        const bounce = Math.abs(Math.sin(t * 2.7 + i * .85)), x = centerX + (i - 1) * width * .28, y = baseY - 5 * unit - bounce * width * .18;
        cx.globalAlpha = alpha * (.35 + bounce * .3); cx.fillStyle = colors[i]; cx.beginPath(); cx.arc(x, y, (3.5 + bounce * 1.5) * unit, 0, Math.PI * 2); cx.fill();
      }
    } else if (effect === 'outside-drift') {
      cx.strokeStyle = '#d8b8ff'; cx.lineWidth = 2.3 * unit;
      for (const side of [-1, 1]) for (let i = 0; i < 2; i++) {
        const phase = (t * .35 + i * .42) % 1, x = centerX + side * width * (.5 + phase * .22), y = centerY + (i ? 18 : -18) * unit;
        cx.globalAlpha = alpha * Math.sin(phase * Math.PI) * .5; cx.beginPath(); cx.arc(x, y, (4 + phase * 4) * unit, 0, Math.PI * 2); cx.stroke();
      }
    } else if (effect === 'sink') {
      cx.strokeStyle = '#8bfff2'; cx.lineWidth = 2.5 * unit;
      for (let i = 0; i < 3; i++) {
        const phase = (t * .48 + i / 3) % 1, y = centerY - width * .42 + phase * width * .78;
        cx.globalAlpha = alpha * Math.sin(phase * Math.PI) * .58; cx.beginPath(); cx.moveTo(centerX - 7 * unit, y - 7 * unit); cx.lineTo(centerX, y); cx.lineTo(centerX + 7 * unit, y - 7 * unit); cx.stroke();
      }
    } else if (effect === 'approach') {
      cx.strokeStyle = '#ffb09a'; cx.lineWidth = 2.5 * unit;
      for (const side of [-1, 1]) for (let i = 0; i < 2; i++) {
        const phase = (t * .5 + i * .46) % 1, x = centerX + side * width * (.72 - phase * .28), y = centerY + (i ? 17 : -17) * unit;
        cx.globalAlpha = alpha * Math.sin(phase * Math.PI) * .56; cx.beginPath(); cx.moveTo(x + side * 8 * unit, y - 6 * unit); cx.lineTo(x, y); cx.lineTo(x + side * 8 * unit, y + 6 * unit); cx.stroke();
      }
    } else if (effect === 'breeze') {
      cx.strokeStyle = '#a9ffe0'; cx.lineWidth = 2.2 * unit;
      for (let i = 0; i < 3; i++) {
        const phase = (t * .3 + i * .29) % 1, x = centerX - width * .62 + phase * width * 1.24, y = centerY + (i - 1) * 22 * unit;
        cx.globalAlpha = alpha * Math.sin(phase * Math.PI) * .48; cx.beginPath(); cx.moveTo(x - 16 * unit, y); cx.quadraticCurveTo(x, y - 8 * unit, x + 15 * unit, y); cx.quadraticCurveTo(x + 22 * unit, y + 6 * unit, x + 9 * unit, y + 9 * unit); cx.stroke();
      }
    } else if (effect === 'tiny') {
      const pulse = .5 + .5 * Math.sin(t * 2.6); cx.fillStyle = '#ffd5a8';
      for (let i = 0; i < 5; i++) { const a = t * .55 + i * Math.PI * 2 / 5, r = width * (.25 + pulse * .04), x = centerX + Math.cos(a) * r, y = centerY + Math.sin(a) * r * .65; cx.globalAlpha = alpha * (.3 + pulse * .25); cx.beginPath(); cx.arc(x, y, (1.8 + i % 2) * unit, 0, Math.PI * 2); cx.fill(); }
    } else if (effect === 'peaks') {
      cx.globalAlpha = alpha * .42; cx.strokeStyle = '#e6c28c'; cx.lineWidth = 2.5 * unit; cx.beginPath();
      cx.moveTo(centerX - width * .62, baseY - width * .08); cx.lineTo(centerX - width * .32, centerY - width * .12); cx.lineTo(centerX - width * .08, baseY - width * .08); cx.lineTo(centerX + width * .18, centerY - width * .28); cx.lineTo(centerX + width * .6, baseY - width * .08); cx.stroke();
    } else if (effect === 'grace-step') {
      cx.strokeStyle = '#ffb8d1'; cx.lineWidth = 2.2 * unit;
      for (const side of [-1, 1]) { const phase = (t * .42 + (side > 0 ? .5 : 0)) % 1, x = centerX + side * width * (.28 + phase * .2), y = baseY - width * (.05 + phase * .15); cx.globalAlpha = alpha * Math.sin(phase * Math.PI) * .55; cx.beginPath(); cx.ellipse(x, y, 8 * unit, 3.5 * unit, side * .3, 0, Math.PI * 2); cx.stroke(); }
    } else if (effect === 'north-star') {
      const x = centerX, y = centerY - width * .62, r = (8 + 2 * Math.sin(t * 2.4)) * unit; cx.globalAlpha = alpha * .62; cx.strokeStyle = '#c8f4ff'; cx.lineWidth = 2 * unit; cx.beginPath(); cx.moveTo(x - r, y); cx.lineTo(x + r, y); cx.moveTo(x, y - r); cx.lineTo(x, y + r); cx.stroke(); cx.beginPath(); cx.moveTo(x, y + r * 1.5); cx.lineTo(x, centerY - width * .43); cx.stroke();
    } else if (effect === 'noon-ray') {
      const y = centerY - width * .62, r = width * .1; cx.globalAlpha = alpha * .55; cx.strokeStyle = '#ffe27d'; cx.lineWidth = 2.3 * unit; cx.beginPath(); cx.arc(centerX, y, r, 0, Math.PI * 2); cx.stroke(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r2 = r * (1.55 + .12 * Math.sin(t * 3 + i)); cx.beginPath(); cx.moveTo(centerX + Math.cos(a) * r * 1.15, y + Math.sin(a) * r * 1.15); cx.lineTo(centerX + Math.cos(a) * r2, y + Math.sin(a) * r2); cx.stroke(); }
    } else if (effect === 'hundred-grid') {
      cx.fillStyle = '#e1c3ff'; const gap = width * .042, ox = centerX - gap * 4.5, oy = centerY - width * .55; for (let row = 0; row < 10; row++) for (let col = 0; col < 10; col++) { const pulse = .25 + .2 * Math.sin(t * 2 + (row + col) * .28); cx.globalAlpha = alpha * pulse; cx.fillRect(ox + col * gap, oy + row * gap, 1.5 * unit, 1.5 * unit); }
    } else if (effect === 'ink-strokes') {
      cx.strokeStyle = '#b9ffd0'; cx.lineWidth = 2.8 * unit; for (let i = 0; i < 4; i++) { const phase = (t * .3 + i * .24) % 1, side = i % 2 ? 1 : -1, x = centerX + side * width * (.42 + phase * .14), y = centerY + (i - 1.5) * 18 * unit; cx.globalAlpha = alpha * Math.sin(phase * Math.PI) * .48; cx.beginPath(); cx.moveTo(x - side * 13 * unit, y - 4 * unit); cx.quadraticCurveTo(x, y + 5 * unit, x + side * 8 * unit, y); cx.stroke(); }
    } else if (effect === 'lead-arrow') {
      const phase = (t * .52) % 1, x = centerX + width * (.34 + phase * .32), y = centerY - width * .08; cx.globalAlpha = alpha * Math.sin(phase * Math.PI) * .6; cx.strokeStyle = '#8fffea'; cx.lineWidth = 2.5 * unit; cx.beginPath(); cx.moveTo(x - 16 * unit, y); cx.lineTo(x, y); cx.lineTo(x - 7 * unit, y - 7 * unit); cx.moveTo(x, y); cx.lineTo(x - 7 * unit, y + 7 * unit); cx.stroke();
    } else if (effect === 'name-tag') {
      const bob = Math.sin(t * 2.2) * 3 * unit, w = width * .3, h = width * .12, x = centerX - w / 2, y = centerY - width * .62 + bob; cx.globalAlpha = alpha * .5; cx.strokeStyle = '#ffd0bd'; cx.lineWidth = 2 * unit; cx.strokeRect(x, y, w, h); cx.beginPath(); cx.moveTo(x + w * .18, y + h * .52); cx.lineTo(x + w * .82, y + h * .52); cx.stroke();
    } else if (effect === 'river-flow') {
      cx.strokeStyle = '#8df1ff'; cx.lineWidth = 2.2 * unit; for (let i = 0; i < 3; i++) { const x = centerX + (i - 1) * width * .22, drift = Math.sin(t * 2 + i) * 5 * unit; cx.globalAlpha = alpha * .42; cx.beginPath(); cx.moveTo(x, centerY - width * .55); cx.bezierCurveTo(x + drift, centerY - width * .2, x - drift, centerY + width * .18, x, baseY - width * .02); cx.stroke(); }
    } else if (effect === 'many-sparkles') {
      for (let i = 0; i < 12; i++) { const a = i * Math.PI * 2 / 12 + t * .18, r = width * (.43 + .08 * Math.sin(t * 1.8 + i)), x = centerX + Math.cos(a) * r, y = centerY + Math.sin(a) * r * .76, s = (2 + i % 3) * unit; cx.globalAlpha = alpha * (.28 + .28 * Math.max(0, Math.sin(t * 3 + i))); cx.strokeStyle = '#ffd1f4'; cx.lineWidth = 1.8 * unit; cx.beginPath(); cx.moveTo(x - s, y); cx.lineTo(x + s, y); cx.moveTo(x, y - s); cx.lineTo(x, y + s); cx.stroke(); }
    } else if (effect === 'water-ripple') {
      cx.strokeStyle = '#9beeff'; cx.lineWidth = 2.3 * unit; for (let i = 0; i < 3; i++) { const phase = (t * .4 + i / 3) % 1, r = width * (.2 + phase * .36); cx.globalAlpha = alpha * (1 - phase) * .55; cx.beginPath(); cx.ellipse(centerX, baseY - width * .04, r, r * .25, 0, 0, Math.PI * 2); cx.stroke(); }
    } else if (effect === 'half-split') {
      const gap = width * (.08 + .03 * Math.sin(t * 2.2)), r = width * .18; cx.globalAlpha = alpha * .5; cx.strokeStyle = '#ffd39a'; cx.lineWidth = 2.4 * unit; cx.beginPath(); cx.arc(centerX - gap, centerY, r, Math.PI / 2, Math.PI * 1.5); cx.arc(centerX + gap, centerY, r, -Math.PI / 2, Math.PI / 2); cx.stroke();
    } else if (effect === 'strength-pulse') {
      const phase = (t * .7) % 1, r = width * (.3 + phase * .28); cx.globalAlpha = alpha * (1 - phase) * .55; cx.strokeStyle = '#90adff'; cx.lineWidth = 3 * unit; cx.beginPath(); cx.arc(centerX, centerY, r, 0, Math.PI * 2); cx.stroke(); for (const side of [-1, 1]) { cx.beginPath(); cx.moveTo(centerX + side * width * .45, centerY); cx.lineTo(centerX + side * width * (.57 + phase * .08), centerY); cx.stroke(); }
    } else if (effect === 'sunset-drift') {
      const phase = (t * .18) % 1, x = centerX - width * .48 + phase * width * .96, y = centerY - width * .46 + Math.sin(phase * Math.PI) * width * .1, r = 7 * unit; cx.globalAlpha = alpha * .55; cx.fillStyle = '#ff9b5f'; cx.beginPath(); cx.arc(x, y, r, Math.PI, 0); cx.fill(); cx.strokeStyle = '#ffd1a8'; cx.lineWidth = 2 * unit; cx.beginPath(); cx.moveTo(x - r * 1.5, y); cx.lineTo(x + r * 1.5, y); cx.stroke();
    } else if (effect === 'lightning') {
      cx.strokeStyle = '#fff27a'; cx.lineWidth = 2.6 * unit; for (const side of [-1, 1]) { const flicker = Math.sin(t * 12 + side) > 0 ? 1 : .35, x = centerX + side * width * .5; cx.globalAlpha = alpha * .58 * flicker; cx.beginPath(); cx.moveTo(x, centerY - width * .32); cx.lineTo(x - side * 7 * unit, centerY - 7 * unit); cx.lineTo(x + side * 4 * unit, centerY - 5 * unit); cx.lineTo(x - side * 8 * unit, centerY + width * .28); cx.stroke(); }
    } else if (effect === 'word-sparks') {
      const colors = ['#dfc2ff', '#ffd9f3', '#bcecff']; for (let i = 0; i < 5; i++) { const phase = (t * .28 + i * .19) % 1, side = i % 2 ? 1 : -1, x = centerX + side * width * (.4 + .08 * Math.sin(i + t)), y = baseY - width * (.16 + phase * .66), s = (2.5 + i % 2) * unit; cx.globalAlpha = alpha * Math.sin(phase * Math.PI) * .55; cx.fillStyle = colors[i % colors.length]; cx.fillRect(x - s, y - s, s * 2, s * 2); }
    } else if (effect === 'earth-crumble') {
      cx.fillStyle = '#c88a5a'; for (let i = 0; i < 7; i++) { const phase = (t * .34 + i * .13) % 1, x = centerX + Math.sin(i * 2.1) * width * .48, y = centerY + phase * width * .5, s = (2 + i % 3) * unit; cx.globalAlpha = alpha * (1 - phase) * .48; cx.fillRect(x - s, y - s, s * 2, s * 2); }
    } else if (effect === 'leaf-fall') {
      const colors = ['#a8ef73', '#63cf68', '#d2f58a']; for (let i = 0; i < 6; i++) { const phase = (t * .22 + i * .16) % 1, x = centerX + Math.sin(t * 1.8 + i * 1.7) * width * .53, y = centerY - width * .54 + phase * width * 1.05, r = (3 + i % 2) * unit; cx.globalAlpha = alpha * Math.sin(phase * Math.PI) * .58; cx.fillStyle = colors[i % colors.length]; cx.save(); cx.translate(x, y); cx.rotate(t + i); cx.beginPath(); cx.ellipse(0, 0, r * 1.7, r, .4, 0, Math.PI * 2); cx.fill(); cx.restore(); }
    } else if (effect === 'steam-aroma') {
      cx.strokeStyle = '#fff0bc'; cx.lineWidth = 2.2 * unit; for (let i = 0; i < 3; i++) { const phase = (t * .3 + i / 3) % 1, x = centerX + (i - 1) * width * .17, y = centerY - width * (.32 + phase * .32); cx.globalAlpha = alpha * Math.sin(phase * Math.PI) * .5; cx.beginPath(); cx.moveTo(x, y + 14 * unit); cx.bezierCurveTo(x - 7 * unit, y + 8 * unit, x + 7 * unit, y + 3 * unit, x, y - 5 * unit); cx.stroke(); }
    } else if (effect === 'wheel-tracks') {
      cx.strokeStyle = '#ff9b9b'; cx.lineWidth = 2.2 * unit; for (const side of [-1, 1]) { const x = centerX + side * width * .43, phase = (t * .45) % 1; cx.globalAlpha = alpha * .48; cx.beginPath(); cx.arc(x, baseY - width * .08, width * .1, 0, Math.PI * 2); cx.stroke(); for (let i = 0; i < 3; i++) { const y = baseY + ((phase + i / 3) % 1) * 18 * unit; cx.fillStyle = '#ffb0a8'; cx.fillRect(x - 4 * unit, y, 8 * unit, 2 * unit); } }
    } else if (effect === 'south-compass') {
      const x = centerX, y = baseY + width * .08, pulse = 3 * unit * Math.sin(t * 2.4); cx.globalAlpha = alpha * .55; cx.strokeStyle = '#8fffe0'; cx.lineWidth = 2.6 * unit; cx.beginPath(); cx.moveTo(x, centerY + width * .34); cx.lineTo(x, y + pulse); cx.lineTo(x - 7 * unit, y - 8 * unit + pulse); cx.moveTo(x, y + pulse); cx.lineTo(x + 7 * unit, y - 8 * unit + pulse); cx.stroke();
    } else if (effect === 'question-orbit') {
      cx.fillStyle = '#b9a4ff'; cx.font = `bold ${16 * unit}px ${JPFONT}`; cx.textAlign = 'center'; for (let i = 0; i < 3; i++) { const a = t * .8 + i * Math.PI * 2 / 3, r = width * .52; cx.globalAlpha = alpha * (.34 + .2 * Math.sin(t * 2 + i)); cx.fillText('?', centerX + Math.cos(a) * r, centerY + Math.sin(a) * r * .65); }
    } else if (effect === 'myriad-stars') {
      cx.fillStyle = '#ffe276'; for (let i = 0; i < 14; i++) { const a = i * 2.4 + t * .18, r = width * (.38 + (i % 4) * .06), s = (1.5 + i % 3) * unit; cx.globalAlpha = alpha * (.22 + .35 * Math.max(0, Math.sin(t * 3 + i))); cx.fillRect(centerX + Math.cos(a) * r - s, centerY + Math.sin(a) * r * .72 - s, s * 2, s * 2); }
    } else if (effect === 'school-bell') {
      const y = centerY - width * .57, swing = Math.sin(t * 3) * .18; cx.save(); cx.translate(centerX, y); cx.rotate(swing); cx.globalAlpha = alpha * .55; cx.strokeStyle = '#87f3e6'; cx.lineWidth = 2.5 * unit; cx.beginPath(); cx.arc(0, 0, 12 * unit, Math.PI, 0); cx.lineTo(15 * unit, 11 * unit); cx.lineTo(-15 * unit, 11 * unit); cx.closePath(); cx.stroke(); cx.beginPath(); cx.arc(0, 14 * unit, 3 * unit, 0, Math.PI * 2); cx.stroke(); cx.restore();
    } else if (effect === 'repeat-loop') {
      const pulse = 3 * unit * Math.sin(t * 2); cx.globalAlpha = alpha * .5; cx.strokeStyle = '#ff9f9f'; cx.lineWidth = 2.5 * unit; cx.beginPath(); cx.arc(centerX, centerY, width * .5 + pulse, .3, Math.PI * 1.65); cx.stroke(); const x = centerX + width * .49, y = centerY - width * .12; cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x - 9 * unit, y - 2 * unit); cx.lineTo(x - 4 * unit, y + 7 * unit); cx.stroke();
    } else if (effect === 'white-shimmer') {
      cx.strokeStyle = '#ffffff'; cx.lineWidth = 2 * unit; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3, r = width * (.42 + .05 * Math.sin(t * 2 + i)), x = centerX + Math.cos(a) * r, y = centerY + Math.sin(a) * r * .7, s = (3 + i % 2) * unit; cx.globalAlpha = alpha * (.25 + .35 * Math.max(0, Math.sin(t * 3 + i))); cx.beginPath(); cx.moveTo(x - s, y); cx.lineTo(x + s, y); cx.moveTo(x, y - s); cx.lineTo(x, y + s); cx.stroke(); }
    } else if (effect === 'sky-rays') {
      cx.strokeStyle = '#8fd8ff'; cx.lineWidth = 2.3 * unit; for (let i = 0; i < 7; i++) { const x = centerX + (i - 3) * width * .16, phase = (t * .24 + i * .12) % 1; cx.globalAlpha = alpha * Math.sin(phase * Math.PI) * .42; cx.beginPath(); cx.moveTo(x - 10 * unit, centerY - width * .62); cx.lineTo(x + 10 * unit, centerY - width * .28); cx.stroke(); }
    } else if (effect === 'heart-embrace') {
      cx.fillStyle = '#ff9aad'; cx.font = `bold ${13 * unit}px ${JPFONT}`; cx.textAlign = 'center'; for (const side of [-1, 1]) { const bob = Math.sin(t * 2.3 + side) * 6 * unit; cx.globalAlpha = alpha * .52; cx.fillText('♥', centerX + side * width * .5, centerY - width * .08 + bob); }
    } else if (effect === 'fire-embers') {
      const colors = ['#ffdb57', '#ff7a30', '#ff3c1f']; for (let i = 0; i < 9; i++) { const phase = (t * .3 + i * .11) % 1, x = centerX + Math.sin(i * 2.2) * width * .5, y = baseY - width * (.08 + phase * .75), s = (2 + i % 3) * unit; cx.globalAlpha = alpha * (1 - phase) * .62; cx.fillStyle = colors[i % colors.length]; cx.fillRect(x - s, y - s, s * 2, s * 2); }
    } else if (effect === 'right-arrow') {
      const phase = (t * .5) % 1, x = centerX + width * (.34 + phase * .28), y = centerY; cx.globalAlpha = alpha * Math.sin(phase * Math.PI) * .58; cx.strokeStyle = '#83fff1'; cx.lineWidth = 3 * unit; cx.beginPath(); cx.moveTo(x - 20 * unit, y); cx.lineTo(x, y); cx.lineTo(x - 8 * unit, y - 8 * unit); cx.moveTo(x, y); cx.lineTo(x - 8 * unit, y + 8 * unit); cx.stroke();
    } else if (effect === 'reading-pages') {
      cx.strokeStyle = '#d7b4ff'; cx.lineWidth = 2 * unit; for (let i = 0; i < 4; i++) { const phase = (t * .28 + i * .22) % 1, side = i % 2 ? 1 : -1, x = centerX + side * width * (.42 + phase * .12), y = baseY - width * (.18 + phase * .62), w = 10 * unit, h = 7 * unit; cx.globalAlpha = alpha * Math.sin(phase * Math.PI) * .5; cx.strokeRect(x - w / 2, y - h / 2, w, h); cx.beginPath(); cx.moveTo(x, y - h / 2); cx.lineTo(x, y + h / 2); cx.stroke(); }
    } else if (effect === 'friendship-link') {
      const pulse = 2 * unit * Math.sin(t * 2.5), y = centerY - width * .05; cx.globalAlpha = alpha * .55; cx.strokeStyle = '#ff9eab'; cx.lineWidth = 2.5 * unit; cx.beginPath(); cx.arc(centerX - width * .44, y, 9 * unit + pulse, 0, Math.PI * 2); cx.arc(centerX + width * .44, y, 9 * unit + pulse, 0, Math.PI * 2); cx.moveTo(centerX - width * .35, y); cx.lineTo(centerX + width * .35, y); cx.stroke();
    } else if (effect === 'left-arrow') {
      const phase = (t * .5) % 1, x = centerX - width * (.34 + phase * .28), y = centerY; cx.globalAlpha = alpha * Math.sin(phase * Math.PI) * .58; cx.strokeStyle = '#83fff1'; cx.lineWidth = 3 * unit; cx.beginPath(); cx.moveTo(x + 20 * unit, y); cx.lineTo(x, y); cx.lineTo(x + 8 * unit, y - 8 * unit); cx.moveTo(x, y); cx.lineTo(x + 8 * unit, y + 8 * unit); cx.stroke();
    } else if (effect === 'rest-leaves') {
      const colors = ['#c4ef6a', '#7ecb53']; for (let i = 0; i < 5; i++) { const phase = (t * .17 + i * .2) % 1, x = centerX + Math.sin(t + i * 1.8) * width * .5, y = centerY - width * .5 + phase * width * .85, r = (3 + i % 2) * unit; cx.globalAlpha = alpha * Math.sin(phase * Math.PI) * .5; cx.fillStyle = colors[i % 2]; cx.save(); cx.translate(x, y); cx.rotate(t * .5 + i); cx.beginPath(); cx.ellipse(0, 0, r * 1.7, r, .45, 0, Math.PI * 2); cx.fill(); cx.restore(); }
    } else if (effect === 'guardian-shield') {
      const pulse = width * (.5 + .025 * Math.sin(t * 2)); cx.globalAlpha = alpha * .34; cx.strokeStyle = '#ffd86c'; cx.lineWidth = 2.8 * unit; cx.beginPath(); cx.moveTo(centerX, centerY - pulse * .75); cx.lineTo(centerX + pulse * .62, centerY - pulse * .4); cx.lineTo(centerX + pulse * .5, centerY + pulse * .35); cx.quadraticCurveTo(centerX, centerY + pulse * .75, centerX - pulse * .5, centerY + pulse * .35); cx.lineTo(centerX - pulse * .62, centerY - pulse * .4); cx.closePath(); cx.stroke();
    } else if (effect === 'rain-drops') {
      cx.strokeStyle = '#89d9ff'; cx.lineWidth = 2.2 * unit; for (let i = 0; i < 8; i++) { const phase = (t * .36 + i * .13) % 1, x = centerX + Math.sin(i * 2.3) * width * .55, y = centerY - width * .55 + phase * width * 1.02, r = (2.5 + i % 3) * unit; cx.globalAlpha = alpha * Math.sin(phase * Math.PI) * .55; cx.beginPath(); cx.moveTo(x, y - r * 1.6); cx.quadraticCurveTo(x + r, y, x, y + r); cx.quadraticCurveTo(x - r, y, x, y - r * 1.6); cx.stroke(); }
    } else if (effect === 'dark-cracks') {
      cx.strokeStyle = '#c55aff'; cx.lineWidth = 2.2 * unit; for (const side of [-1, 1]) { const flicker = .35 + .35 * Math.max(0, Math.sin(t * 8 + side)); cx.globalAlpha = alpha * flicker; const x = centerX + side * width * .5; cx.beginPath(); cx.moveTo(x, centerY - width * .35); cx.lineTo(x - side * 8 * unit, centerY - width * .12); cx.lineTo(x + side * 4 * unit, centerY); cx.lineTo(x - side * 9 * unit, centerY + width * .28); cx.stroke(); }
    } else if (effect === 'dim-lantern') {
      const glow = .5 + .25 * Math.sin(t * 2.2), x = centerX - width * .5, y = centerY + width * .18; cx.globalAlpha = alpha * glow; cx.fillStyle = '#b57aff'; cx.beginPath(); cx.arc(x, y, 13 * unit, 0, Math.PI * 2); cx.fill(); cx.globalAlpha = alpha * .7; cx.strokeStyle = '#ead8ff'; cx.lineWidth = 2 * unit; cx.strokeRect(x - 7 * unit, y - 10 * unit, 14 * unit, 20 * unit); cx.beginPath(); cx.arc(x, y - 10 * unit, 7 * unit, Math.PI, 0); cx.stroke();
    } else if (effect === 'healing-cross') {
      cx.fillStyle = '#8fffd8'; for (let i = 0; i < 4; i++) { const a = t * .45 + i * Math.PI / 2, r = width * (.46 + .04 * Math.sin(t * 2 + i)), x = centerX + Math.cos(a) * r, y = centerY + Math.sin(a) * r * .72, s = (4 + i % 2) * unit; cx.globalAlpha = alpha * (.3 + .25 * Math.max(0, Math.sin(t * 3 + i))); cx.fillRect(x - s * .3, y - s, s * .6, s * 2); cx.fillRect(x - s, y - s * .3, s * 2, s * .6); }
    } else if (effect === 'thought-focus') {
      const y = centerY - width * .62, pulse = 1 + .18 * Math.sin(t * 2.8); cx.globalAlpha = alpha * .58; cx.strokeStyle = '#ffd75e'; cx.lineWidth = 2.4 * unit; cx.beginPath(); cx.arc(centerX, y, 7 * unit * pulse, 0, Math.PI * 2); cx.stroke(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3, r1 = 11 * unit, r2 = (17 + 2 * Math.sin(t * 2 + i)) * unit; cx.beginPath(); cx.moveTo(centerX + Math.cos(a) * r1, y + Math.sin(a) * r1); cx.lineTo(centerX + Math.cos(a) * r2, y + Math.sin(a) * r2); cx.stroke(); }
    } else if (effect === 'speech-bubbles') {
      cx.strokeStyle = '#ffe47d'; cx.lineWidth = 2.2 * unit;
      for (let i = 0; i < 3; i++) {
        const phase = (t * .26 + i * .31) % 1, side = i % 2 ? 1 : -1, x = centerX + side * width * (.43 + .05 * Math.sin(t + i)), y = baseY - width * (.15 + phase * .7), r = (5 + i) * unit;
        cx.globalAlpha = alpha * Math.sin(phase * Math.PI) * .52; cx.beginPath(); cx.ellipse(x, y, r * 1.35, r, 0, 0, Math.PI * 2); cx.moveTo(x - side * r * .35, y + r * .82); cx.lineTo(x - side * r * .7, y + r * 1.35); cx.stroke();
      }
    }
    cx.restore();
  }
  function drawMeaningAttackAnimation(monster, progress, originX, targetX, baseY, size = 120) {
    const animation = kanjiAnimation(monster);
    if (!animation || !Number.isFinite(progress) || progress < 0 || progress > 1) return false;
    const p = Math.max(0, Math.min(1, progress)), direction = targetX >= originX ? 1 : -1;
    const eased = p * p * (3 - 2 * p), travelX = originX + (targetX - originX) * eased;
    const flightY = baseY - size * .56 - Math.sin(p * Math.PI) * size * .24;
    const fade = Math.min(1, p * 7, (1 - p) * 7), unit = Math.max(.55, size / 150);
    cx.save(); cx.lineCap = 'round'; cx.lineJoin = 'round'; cx.globalAlpha = Math.max(0, fade);
    const [coreColor, edgeColor] = animation.colors || ['#fff', '#7ff7ff'];
    // Mọi tuyệt kỹ đều có một nhịp tụ lực rõ và một tâm va chạm chung. Hai
    // lớp này làm đòn đánh có trọng lượng mà vẫn giữ silhouette riêng bên dưới.
    if (p < .3) {
      const charge = p / .3, radius = size * (.08 + charge * .2);
      cx.globalAlpha = Math.sin(charge * Math.PI) * .78; cx.strokeStyle = coreColor; cx.lineWidth = 3.5 * unit;
      cx.beginPath(); cx.arc(originX, baseY - size * .48, radius, 0, Math.PI * 2); cx.stroke();
      cx.beginPath(); cx.arc(originX, baseY - size * .48, radius * .58, 0, Math.PI * 2); cx.stroke();
    }

    if (animation.attack === 'flame-dash') {
      const radius = (9 + Math.sin(p * Math.PI) * 7) * unit;
      for (let i = 5; i >= 1; i--) {
        const tx = travelX - direction * i * 13 * unit, ty = flightY + Math.sin(i * 1.9 + p * 12) * 5 * unit;
        cx.globalAlpha = fade * (1 - i / 7) * .72; cx.fillStyle = i % 2 ? '#ff7a30' : '#ffd84d';
        cx.beginPath(); cx.arc(tx, ty, radius * (1 - i * .1), 0, Math.PI * 2); cx.fill();
      }
      cx.globalAlpha = fade; cx.fillStyle = '#fff08a'; cx.beginPath(); cx.arc(travelX, flightY, radius * .72, 0, Math.PI * 2); cx.fill();
      cx.strokeStyle = '#ff3b1f'; cx.lineWidth = 4 * unit; cx.beginPath(); cx.arc(travelX, flightY, radius, 0, Math.PI * 2); cx.stroke();
      if (p > .7) {
        const impact = (p - .7) / .3, burst = size * (.1 + impact * .38);
        cx.globalAlpha = (1 - impact) * .85; cx.strokeStyle = '#ffd84d'; cx.lineWidth = 5 * unit;
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; cx.beginPath(); cx.moveTo(targetX + Math.cos(a) * burst * .25, flightY + Math.sin(a) * burst * .25); cx.lineTo(targetX + Math.cos(a) * burst, flightY + Math.sin(a) * burst); cx.stroke(); }
      }
    } else if (animation.attack === 'tidal-wave') {
      const waveY = baseY - size * .34;
      cx.strokeStyle = '#78e8ff'; cx.lineWidth = 7 * unit;
      for (let i = 0; i < 3; i++) {
        const offset = (i - 1) * 13 * unit, lead = travelX - direction * offset;
        cx.globalAlpha = fade * (.45 + i * .18); cx.beginPath(); cx.moveTo(originX, waveY + offset * .25);
        cx.quadraticCurveTo((originX + lead) / 2, waveY - size * (.18 + i * .045), lead, waveY + Math.sin(p * Math.PI * 3 + i) * 7 * unit); cx.stroke();
      }
      cx.fillStyle = '#d8fbff';
      for (let i = 0; i < 5; i++) { const a = i * 2.3 + p * 9, r = (7 + i * 3) * unit; cx.globalAlpha = fade * .7; cx.beginPath(); cx.arc(travelX + Math.cos(a) * r, flightY + Math.sin(a) * r, (2 + i % 2) * unit, 0, Math.PI * 2); cx.fill(); }
    } else if (animation.attack === 'vine-whip') {
      const reachX = originX + (targetX - originX) * Math.min(1, p * 1.35), curl = Math.sin(p * Math.PI * 2) * size * .14;
      cx.strokeStyle = '#6ed45f'; cx.lineWidth = 8 * unit; cx.beginPath(); cx.moveTo(originX, baseY - size * .2);
      cx.bezierCurveTo(originX + direction * size * .35, baseY - size * .72, reachX - direction * size * .3, flightY + curl, reachX, flightY); cx.stroke();
      cx.strokeStyle = '#c8f58a'; cx.lineWidth = 2 * unit; cx.stroke();
      for (let i = 1; i <= 5; i++) {
        const q = i / 6, x = originX + (reachX - originX) * q, y = baseY - size * (.2 + Math.sin(q * Math.PI) * .37);
        cx.save(); cx.translate(x, y); cx.rotate((i % 2 ? .7 : -.7) + p); cx.fillStyle = i % 2 ? '#a8ef73' : '#63cf68';
        cx.beginPath(); cx.ellipse(0, 0, 8 * unit, 4 * unit, 0, 0, Math.PI * 2); cx.fill(); cx.restore();
      }
    } else if (animation.attack === 'thunder-strike') {
      const charge = Math.min(1, p / .34), strike = p >= .28;
      cx.globalAlpha = fade * (.45 + charge * .45); cx.strokeStyle = '#fff37a'; cx.lineWidth = 3 * unit;
      cx.beginPath(); cx.arc(targetX, baseY - size * .18, size * (.12 + charge * .18), 0, Math.PI * 2); cx.stroke();
      if (strike) {
        const topY = baseY - size * 1.25, hitY = baseY - size * .38;
        cx.globalAlpha = Math.min(1, fade * 1.25); cx.strokeStyle = '#fffbd0'; cx.lineWidth = 8 * unit; cx.beginPath(); cx.moveTo(targetX - 10 * unit, topY);
        cx.lineTo(targetX + 17 * unit, topY + size * .25); cx.lineTo(targetX - 14 * unit, topY + size * .52); cx.lineTo(targetX + 7 * unit, topY + size * .72); cx.lineTo(targetX, hitY); cx.stroke();
        cx.strokeStyle = '#ffe13d'; cx.lineWidth = 3 * unit; cx.stroke();
      }
    } else if (animation.attack === 'wind-cutter') {
      cx.strokeStyle = '#a9ffe0'; cx.lineWidth = 5 * unit;
      for (let i = 0; i < 3; i++) {
        const phase = Math.max(0, Math.min(1, p * 1.35 - i * .14));
        const x = originX + (targetX - originX) * phase, y = flightY + (i - 1) * 24 * unit;
        cx.globalAlpha = Math.sin(phase * Math.PI) * .75; cx.beginPath();
        cx.arc(x, y, size * (.14 + i * .025), direction > 0 ? -.65 : Math.PI - .65, direction > 0 ? .65 : Math.PI + .65); cx.stroke();
        cx.strokeStyle = i === 1 ? '#e4fff5' : '#79e7c4';
      }
    } else if (animation.attack === 'solar-burst') {
      const radius = size * (.12 + Math.sin(p * Math.PI) * .1);
      cx.globalAlpha = fade * .38; cx.fillStyle = edgeColor; cx.beginPath(); cx.arc(travelX, flightY, radius * 1.75, 0, Math.PI * 2); cx.fill();
      cx.globalAlpha = fade; cx.fillStyle = coreColor; cx.beginPath(); cx.arc(travelX, flightY, radius, 0, Math.PI * 2); cx.fill();
      cx.strokeStyle = '#fff9c9'; cx.lineWidth = 4 * unit;
      for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 + p * 2; cx.beginPath(); cx.moveTo(travelX + Math.cos(a) * radius * 1.2, flightY + Math.sin(a) * radius * 1.2); cx.lineTo(travelX + Math.cos(a) * radius * 1.8, flightY + Math.sin(a) * radius * 1.8); cx.stroke(); }
    } else if (animation.attack === 'moon-blade') {
      cx.globalAlpha = fade; cx.strokeStyle = coreColor; cx.lineWidth = 13 * unit; cx.beginPath();
      cx.arc(travelX, flightY, size * .27, direction > 0 ? -.9 : Math.PI - .9, direction > 0 ? .9 : Math.PI + .9); cx.stroke();
      cx.strokeStyle = edgeColor; cx.lineWidth = 4 * unit; cx.stroke();
    } else if (animation.attack === 'mountain-crash') {
      const drop = Math.min(1, p * 1.3), rockY = baseY - size * (1.35 - drop * .85), r = size * .28;
      cx.fillStyle = edgeColor; cx.strokeStyle = coreColor; cx.lineWidth = 4 * unit; cx.beginPath();
      cx.moveTo(targetX - r, rockY + r * .65); cx.lineTo(targetX - r * .38, rockY - r); cx.lineTo(targetX + r * .08, rockY - r * .42);
      cx.lineTo(targetX + r * .48, rockY - r * .86); cx.lineTo(targetX + r, rockY + r * .65); cx.closePath(); cx.fill(); cx.stroke();
    } else if (animation.attack === 'river-rush') {
      cx.strokeStyle = edgeColor; cx.lineWidth = 18 * unit; cx.globalAlpha = fade * .72; cx.beginPath(); cx.moveTo(originX, baseY - size * .28);
      cx.bezierCurveTo((originX + travelX) / 2, baseY - size * .68, (originX + travelX) / 2, baseY - size * .08, travelX, baseY - size * .42); cx.stroke();
      cx.strokeStyle = coreColor; cx.lineWidth = 5 * unit; cx.stroke();
    } else if (animation.attack === 'golden-comet') {
      cx.strokeStyle = edgeColor; cx.lineWidth = 12 * unit; cx.globalAlpha = fade * .6; cx.beginPath(); cx.moveTo(originX, flightY + size * .12); cx.lineTo(travelX, flightY); cx.stroke();
      cx.fillStyle = coreColor; cx.globalAlpha = fade; cx.beginPath(); cx.arc(travelX, flightY, size * .13, 0, Math.PI * 2); cx.fill();
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + p * 5, r = size * .21; cx.fillRect(travelX + Math.cos(a) * r - 3 * unit, flightY + Math.sin(a) * r - 3 * unit, 6 * unit, 6 * unit); }
    } else if (animation.attack === 'rain-storm') {
      const stormX = originX + (targetX - originX) * Math.min(1, p * 1.7);
      cx.fillStyle = edgeColor; cx.globalAlpha = fade * .55; cx.beginPath(); cx.ellipse(stormX, baseY - size * .92, size * .34, size * .12, 0, 0, Math.PI * 2); cx.fill();
      cx.strokeStyle = coreColor; cx.lineWidth = 5 * unit;
      for (let i = 0; i < 9; i++) { const x = stormX + (i - 4) * size * .07, drop = ((p * 2.4 + i * .13) % 1) * size * .52; cx.globalAlpha = fade * (.45 + i % 2 * .3); cx.beginPath(); cx.moveTo(x, baseY - size * .78 + drop); cx.lineTo(x - direction * 7 * unit, baseY - size * .62 + drop); cx.stroke(); }
    } else if (animation.attack === 'earth-spike') {
      const reached = Math.min(1, p * 1.45); cx.fillStyle = edgeColor; cx.strokeStyle = coreColor; cx.lineWidth = 3 * unit;
      for (let i = 0; i < 6; i++) { const q = (i + 1) / 6; if (q > reached) continue; const x = originX + (targetX - originX) * q, h = size * (.18 + (i % 3) * .08) * Math.min(1, (reached - q) * 8); cx.beginPath(); cx.moveTo(x - size * .08, baseY); cx.lineTo(x, baseY - h); cx.lineTo(x + size * .08, baseY); cx.closePath(); cx.fill(); cx.stroke(); }
    } else if (animation.attack === 'bubble-torpedo') {
      const radius = size * (.17 + Math.sin(p * Math.PI) * .05); cx.fillStyle = edgeColor; cx.globalAlpha = fade * .35; cx.beginPath(); cx.arc(travelX, flightY, radius, 0, Math.PI * 2); cx.fill();
      cx.strokeStyle = coreColor; cx.globalAlpha = fade; cx.lineWidth = 5 * unit; cx.stroke();
      for (let i = 1; i <= 5; i++) { cx.globalAlpha = fade * (1 - i / 7); cx.beginPath(); cx.arc(travelX - direction * i * 16 * unit, flightY + Math.sin(i * 2) * 11 * unit, (3 + i) * unit, 0, Math.PI * 2); cx.stroke(); }
    } else if (animation.attack === 'sonic-wave') {
      cx.strokeStyle = edgeColor; cx.lineWidth = 6 * unit;
      for (let i = 0; i < 4; i++) { const phase = Math.max(0, Math.min(1, p * 1.5 - i * .14)), x = originX + (targetX - originX) * phase; cx.globalAlpha = Math.sin(phase * Math.PI) * .8; cx.beginPath(); cx.arc(x, baseY - size * .48, size * (.16 + i * .055), -.62 * Math.PI, .62 * Math.PI); cx.stroke(); cx.strokeStyle = i % 2 ? coreColor : edgeColor; }
    } else if (animation.attack === 'life-bloom') {
      const seedY = flightY, radius = size * (.07 + p * .13); cx.strokeStyle = edgeColor; cx.lineWidth = 7 * unit; cx.beginPath(); cx.moveTo(originX, baseY - size * .15); cx.quadraticCurveTo(travelX, seedY + size * .3, travelX, seedY); cx.stroke();
      cx.fillStyle = coreColor;
      for (let i = 0; i < 7; i++) { const a = i * Math.PI * 2 / 7 + p * 2, x = travelX + Math.cos(a) * radius, y = seedY + Math.sin(a) * radius; cx.save(); cx.translate(x, y); cx.rotate(a); cx.beginPath(); cx.ellipse(0, 0, radius * .48, radius * .2, 0, 0, Math.PI * 2); cx.fill(); cx.restore(); }
    } else if (animation.attack === 'single-slash') {
      const length = size * (.42 + Math.sin(p * Math.PI) * .3); cx.strokeStyle = edgeColor; cx.lineWidth = 13 * unit; cx.globalAlpha = fade * .45;
      cx.beginPath(); cx.moveTo(travelX - direction * length, flightY + length * .25); cx.lineTo(travelX + direction * length, flightY - length * .25); cx.stroke();
      cx.strokeStyle = coreColor; cx.lineWidth = 4 * unit; cx.globalAlpha = fade; cx.stroke();
    } else if (animation.attack === 'twin-strike') {
      for (const side of [-1, 1]) { const x = originX + (targetX - originX) * Math.min(1, p * (side > 0 ? 1.15 : 1.35)), y = flightY + side * size * (.24 - p * .18); cx.fillStyle = side > 0 ? coreColor : edgeColor; cx.globalAlpha = fade; cx.beginPath(); cx.arc(x, y, size * .1, 0, Math.PI * 2); cx.fill(); cx.strokeStyle = coreColor; cx.lineWidth = 5 * unit; cx.beginPath(); cx.moveTo(x - direction * size * .22, y + side * size * .1); cx.lineTo(x, y); cx.stroke(); }
    } else if (animation.attack === 'book-burst') {
      for (let i = 0; i < 7; i++) { const phase = Math.max(0, Math.min(1, p * 1.45 - i * .075)), x = originX + (targetX - originX) * phase, y = flightY + Math.sin(i * 1.8 + p * 8) * size * .22; cx.save(); cx.translate(x, y); cx.rotate(p * 4 + i); cx.globalAlpha = Math.sin(phase * Math.PI) * .85; cx.strokeStyle = i % 2 ? coreColor : edgeColor; cx.lineWidth = 3 * unit; cx.strokeRect(-size * .09, -size * .065, size * .18, size * .13); cx.beginPath(); cx.moveTo(0, -size * .06); cx.lineTo(0, size * .06); cx.stroke(); cx.restore(); }
    } else if (animation.attack === 'wheel-charge') {
      const r = size * .22; cx.save(); cx.translate(travelX, flightY); cx.rotate(p * Math.PI * 8 * direction); cx.globalAlpha = fade; cx.strokeStyle = edgeColor; cx.lineWidth = 9 * unit; cx.beginPath(); cx.arc(0, 0, r, 0, Math.PI * 2); cx.stroke(); cx.strokeStyle = coreColor; cx.lineWidth = 4 * unit;
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; cx.beginPath(); cx.moveTo(0, 0); cx.lineTo(Math.cos(a) * r, Math.sin(a) * r); cx.stroke(); } cx.restore();
      cx.strokeStyle = edgeColor; cx.lineWidth = 5 * unit; for (let i = 1; i < 5; i++) { cx.globalAlpha = fade * (1 - i / 5); cx.beginPath(); cx.moveTo(travelX - direction * i * size * .13, flightY - size * .12); cx.lineTo(travelX - direction * i * size * .13, flightY + size * .12); cx.stroke(); }
    } else if (animation.attack === 'steam-bite') {
      cx.strokeStyle = coreColor; cx.lineWidth = 5 * unit;
      for (let i = 0; i < 4; i++) { const phase = Math.max(0, Math.min(1, p * 1.45 - i * .11)), x = originX + (targetX - originX) * phase, y = flightY - Math.sin(phase * Math.PI * 2 + i) * size * .13; cx.globalAlpha = Math.sin(phase * Math.PI) * .72; cx.beginPath(); cx.arc(x, y, size * (.08 + i * .025), -.65 * Math.PI, .65 * Math.PI); cx.stroke(); }
      const jaw = size * (.18 + Math.sin(p * Math.PI) * .08); cx.globalAlpha = fade; cx.strokeStyle = edgeColor; cx.lineWidth = 8 * unit; cx.beginPath(); cx.arc(travelX, flightY, jaw, .1, Math.PI - .1); cx.stroke(); cx.beginPath(); cx.arc(travelX, flightY, jaw, Math.PI + .1, Math.PI * 2 - .1); cx.stroke();
    } else if (animation.attack === 'word-cannon') {
      for (let i = 0; i < 5; i++) { const phase = Math.max(0, Math.min(1, p * 1.5 - i * .1)), x = originX + (targetX - originX) * phase, y = flightY + (i - 2) * size * .11, r = size * (.08 + i % 2 * .025); cx.globalAlpha = Math.sin(phase * Math.PI) * .8; cx.fillStyle = i % 2 ? coreColor : edgeColor; cx.beginPath(); cx.ellipse(x, y, r * 1.4, r, 0, 0, Math.PI * 2); cx.fill(); cx.beginPath(); cx.moveTo(x - direction * r * .5, y + r * .6); cx.lineTo(x - direction * r, y + r * 1.15); cx.lineTo(x, y + r * .82); cx.fill(); }
    } else if (animation.attack === 'ink-slash') {
      const reach = originX + (targetX - originX) * Math.min(1, p * 1.35); cx.globalAlpha = fade * .4; cx.strokeStyle = edgeColor; cx.lineWidth = 18 * unit; cx.beginPath(); cx.moveTo(originX, baseY - size * .18); cx.bezierCurveTo(originX + direction * size * .4, baseY - size * .9, reach - direction * size * .35, baseY - size * .05, reach, flightY); cx.stroke();
      cx.globalAlpha = fade; cx.strokeStyle = coreColor; cx.lineWidth = 5 * unit; cx.stroke();
    } else if (animation.attack === 'clock-stop') {
      const r = size * .23; cx.globalAlpha = fade; cx.fillStyle = 'rgba(15,34,66,.72)'; cx.strokeStyle = coreColor; cx.lineWidth = 6 * unit; cx.beginPath(); cx.arc(travelX, flightY, r, 0, Math.PI * 2); cx.fill(); cx.stroke();
      cx.strokeStyle = edgeColor; cx.lineWidth = 4 * unit; cx.beginPath(); cx.moveTo(travelX, flightY); cx.lineTo(travelX + Math.cos(p * 9) * r * .72, flightY + Math.sin(p * 9) * r * .72); cx.moveTo(travelX, flightY); cx.lineTo(travelX + Math.cos(-p * 3) * r * .48, flightY + Math.sin(-p * 3) * r * .48); cx.stroke();
    } else if (animation.attack === 'rising-uppercut') {
      cx.strokeStyle = coreColor; cx.lineWidth = 7 * unit;
      for (let i = 0; i < 5; i++) { const phase = Math.max(0, Math.min(1, p * 1.5 - i * .1)), y = baseY - phase * size * 1.05, x = targetX + (i - 2) * size * .08; cx.globalAlpha = Math.sin(phase * Math.PI) * .85; cx.beginPath(); cx.moveTo(x - size * .09, y + size * .09); cx.lineTo(x, y); cx.lineTo(x + size * .09, y + size * .09); cx.stroke(); }
    } else if (animation.attack === 'meteor-drop') {
      const drop = Math.min(1, p * 1.25), y = baseY - size * (1.35 - drop * .9), r = size * .2; cx.globalAlpha = fade * .45; cx.fillStyle = edgeColor; cx.beginPath(); cx.arc(targetX, y, r * 1.5, 0, Math.PI * 2); cx.fill(); cx.globalAlpha = fade; cx.fillStyle = coreColor; cx.beginPath(); cx.arc(targetX, y, r, 0, Math.PI * 2); cx.fill();
      cx.strokeStyle = edgeColor; cx.lineWidth = 7 * unit; cx.beginPath(); cx.moveTo(targetX, y - r * 2.8); cx.lineTo(targetX, y - r * 1.2); cx.stroke();
    } else if (animation.attack === 'giant-smash') {
      const grow = Math.sin(p * Math.PI), r = size * (.15 + grow * .3); cx.globalAlpha = fade * .34; cx.fillStyle = edgeColor; cx.beginPath(); cx.arc(travelX, flightY, r * 1.35, 0, Math.PI * 2); cx.fill(); cx.globalAlpha = fade; cx.fillStyle = coreColor; cx.strokeStyle = edgeColor; cx.lineWidth = 7 * unit; cx.fillRect(travelX - r, flightY - r * .7, r * 2, r * 1.4); cx.strokeRect(travelX - r, flightY - r * .7, r * 2, r * 1.4);
      for (let i = 1; i < 4; i++) { cx.beginPath(); cx.moveTo(travelX - r + i * r * .5, flightY - r * .7); cx.lineTo(travelX - r + i * r * .5, flightY - r * .15); cx.stroke(); }
    } else if (animation.attack === 'needle-barrage') {
      cx.strokeStyle = edgeColor; cx.lineWidth = 4 * unit;
      for (let i = 0; i < 11; i++) { const phase = Math.max(0, Math.min(1, p * 1.55 - i * .045)), x = originX + (targetX - originX) * phase, y = flightY + (i - 5) * size * .055; cx.globalAlpha = Math.sin(phase * Math.PI) * .86; cx.beginPath(); cx.moveTo(x - direction * size * .13, y + size * .04); cx.lineTo(x + direction * size * .13, y - size * .04); cx.stroke(); }
    } else if (animation.attack === 'barrier-crush') {
      const half = size * (.34 - Math.sin(p * Math.PI) * .13); cx.globalAlpha = fade * .28; cx.fillStyle = edgeColor; cx.fillRect(travelX - half, flightY - half, half * 2, half * 2); cx.globalAlpha = fade; cx.strokeStyle = coreColor; cx.lineWidth = 8 * unit; cx.strokeRect(travelX - half, flightY - half, half * 2, half * 2); cx.strokeStyle = edgeColor; cx.lineWidth = 3 * unit; cx.strokeRect(travelX - half * .68, flightY - half * .68, half * 1.36, half * 1.36);
    } else if (animation.attack === 'dual-heart') {
      const separation = size * (.23 - p * .12); cx.strokeStyle = edgeColor; cx.lineWidth = 6 * unit; cx.beginPath(); cx.moveTo(travelX - separation, flightY); cx.lineTo(travelX + separation, flightY); cx.stroke();
      for (const side of [-1, 1]) { const x = travelX + side * separation; cx.globalAlpha = fade; cx.fillStyle = side > 0 ? coreColor : edgeColor; cx.beginPath(); cx.arc(x - size * .045, flightY - size * .035, size * .065, 0, Math.PI * 2); cx.arc(x + size * .045, flightY - size * .035, size * .065, 0, Math.PI * 2); cx.lineTo(x, flightY + size * .13); cx.closePath(); cx.fill(); }
    } else if (animation.attack === 'dream-leaf') {
      for (let i = 0; i < 8; i++) { const phase = Math.max(0, Math.min(1, p * 1.4 - i * .065)), x = originX + (targetX - originX) * phase, y = flightY + Math.sin(i * 1.9 + p * 5) * size * .22; cx.save(); cx.translate(x, y); cx.rotate(i + p * 3); cx.globalAlpha = Math.sin(phase * Math.PI) * .82; cx.fillStyle = i % 2 ? coreColor : edgeColor; cx.beginPath(); cx.ellipse(0, 0, size * .09, size * .038, .35, 0, Math.PI * 2); cx.fill(); cx.restore(); }
      cx.globalAlpha = fade; cx.fillStyle = coreColor; cx.font = `bold ${Math.round(size * .22)}px ${JPFONT}`; cx.textAlign = 'center'; cx.fillText('Z', travelX, flightY - size * .2); cx.textAlign = 'left';
    } else if (animation.attack === 'orbit-barrage') {
      const count = Math.max(1, Number(animation.count) || 3);
      for (let i = 0; i < count; i++) { const a = i * Math.PI * 2 / count + p * 8, radius = size * (.12 + (1 - p) * .25), x = travelX + Math.cos(a) * radius, y = flightY + Math.sin(a) * radius * .65; cx.globalAlpha = fade; cx.fillStyle = i % 2 ? coreColor : edgeColor; cx.beginPath(); cx.arc(x, y, Math.max(3, size * .045), 0, Math.PI * 2); cx.fill(); }
    } else if (animation.attack === 'forward-charge' || animation.attack === 'backstab') {
      const reverse = animation.attack === 'backstab' ? -1 : 1, lead = travelX + direction * reverse * size * .12;
      cx.globalAlpha = fade * .42; cx.strokeStyle = edgeColor; cx.lineWidth = 18 * unit; cx.beginPath(); cx.moveTo(originX - direction * reverse * size * .2, flightY); cx.lineTo(lead, flightY); cx.stroke();
      cx.globalAlpha = fade; cx.strokeStyle = coreColor; cx.lineWidth = 5 * unit; cx.stroke();
      cx.beginPath(); cx.moveTo(lead - direction * reverse * size * .16, flightY - size * .13); cx.lineTo(lead, flightY); cx.lineTo(lead - direction * reverse * size * .16, flightY + size * .13); cx.stroke();
    } else if (animation.attack === 'inward-collapse' || animation.attack === 'outward-blast') {
      const inward = animation.attack === 'inward-collapse'; cx.strokeStyle = coreColor; cx.lineWidth = 5 * unit;
      for (const side of [-1, 1]) for (let i = 0; i < 3; i++) { const spread = size * (.18 + i * .12) * (inward ? 1 - p * .78 : .25 + p * .9), x = targetX + side * spread, y = flightY + (i - 1) * size * .12; cx.globalAlpha = fade * (.55 + i * .12); cx.beginPath(); cx.moveTo(x + side * (inward ? 1 : -1) * size * .1, y - size * .07); cx.lineTo(x, y); cx.lineTo(x + side * (inward ? 1 : -1) * size * .1, y + size * .07); cx.stroke(); }
    } else if (animation.attack === 'split-blade') {
      cx.strokeStyle = edgeColor; cx.lineWidth = 9 * unit;
      for (const side of [-1, 1]) { const y = flightY + side * size * (.08 + p * .14); cx.globalAlpha = fade; cx.beginPath(); cx.moveTo(originX, flightY); cx.quadraticCurveTo((originX + travelX) / 2, y + side * size * .2, travelX, y); cx.stroke(); }
      cx.strokeStyle = coreColor; cx.lineWidth = 3 * unit; cx.stroke();
    } else if (animation.attack === 'step-rush') {
      for (let i = 0; i < 8; i++) { const phase = Math.max(0, Math.min(1, p * 1.45 - i * .07)), x = originX + (targetX - originX) * phase, y = baseY - size * (.1 + (i % 2) * .14); cx.globalAlpha = Math.sin(phase * Math.PI) * .82; cx.fillStyle = i % 2 ? coreColor : edgeColor; cx.save(); cx.translate(x, y); cx.rotate(direction * (i % 2 ? .25 : -.25)); cx.beginPath(); cx.ellipse(0, 0, size * .09, size * .04, 0, 0, Math.PI * 2); cx.fill(); cx.restore(); }
    } else if (animation.attack === 'season-wheel') {
      const colors = ['#ff9db6', '#72dfa0', '#ffd65c', '#8fcfff'], r = size * (.2 + Math.sin(p * Math.PI) * .12);
      for (let i = 0; i < 4; i++) { const a = p * 7 + i * Math.PI / 2, x = travelX + Math.cos(a) * r, y = flightY + Math.sin(a) * r; cx.globalAlpha = fade; cx.fillStyle = colors[i]; cx.beginPath(); cx.arc(x, y, size * .075, 0, Math.PI * 2); cx.fill(); }
      cx.strokeStyle = coreColor; cx.lineWidth = 4 * unit; cx.beginPath(); cx.arc(travelX, flightY, r, 0, Math.PI * 2); cx.stroke();
    } else if (animation.attack === 'center-beam') {
      cx.globalAlpha = fade * .35; cx.strokeStyle = edgeColor; cx.lineWidth = 19 * unit; cx.beginPath(); cx.moveTo(originX, flightY); cx.lineTo(travelX, flightY); cx.stroke();
      cx.globalAlpha = fade; cx.strokeStyle = coreColor; cx.lineWidth = 5 * unit; cx.stroke();
      const cross = size * .2; cx.beginPath(); cx.moveTo(travelX - cross, flightY); cx.lineTo(travelX + cross, flightY); cx.moveTo(travelX, flightY - cross); cx.lineTo(travelX, flightY + cross); cx.stroke();
    } else if (animation.attack === 'long-lance') {
      const length = size * (.48 + p * .35), tip = travelX + direction * length * .35; cx.globalAlpha = fade; cx.strokeStyle = edgeColor; cx.lineWidth = 12 * unit; cx.beginPath(); cx.moveTo(travelX - direction * length, flightY); cx.lineTo(tip, flightY); cx.stroke();
      cx.strokeStyle = coreColor; cx.lineWidth = 4 * unit; cx.stroke(); cx.beginPath(); cx.moveTo(tip, flightY); cx.lineTo(tip - direction * size * .2, flightY - size * .12); cx.lineTo(tip - direction * size * .2, flightY + size * .12); cx.closePath(); cx.fillStyle = coreColor; cx.fill();
    } else if (animation.attack === 'eye-beam') {
      const eyeX = originX + (targetX - originX) * Math.min(1, p * .55), eyeY = flightY; cx.globalAlpha = fade; cx.fillStyle = 'rgba(15,25,58,.76)'; cx.strokeStyle = coreColor; cx.lineWidth = 5 * unit; cx.beginPath(); cx.ellipse(eyeX, eyeY, size * .2, size * .11, 0, 0, Math.PI * 2); cx.fill(); cx.stroke(); cx.fillStyle = edgeColor; cx.beginPath(); cx.arc(eyeX, eyeY, size * .055, 0, Math.PI * 2); cx.fill();
      if (p > .28) { cx.globalAlpha = fade * .38; cx.strokeStyle = edgeColor; cx.lineWidth = 16 * unit; cx.beginPath(); cx.moveTo(eyeX, eyeY); cx.lineTo(targetX, eyeY); cx.stroke(); cx.globalAlpha = fade; cx.strokeStyle = coreColor; cx.lineWidth = 4 * unit; cx.stroke(); }
    } else if (animation.attack === 'now-burst') {
      const pulse = (p * 4) % 1, r = size * (.08 + pulse * .42); cx.globalAlpha = (1 - pulse) * fade; cx.strokeStyle = coreColor; cx.lineWidth = 8 * unit; cx.beginPath(); cx.arc(targetX, flightY, r, 0, Math.PI * 2); cx.stroke(); cx.strokeStyle = edgeColor; cx.lineWidth = 3 * unit; cx.beginPath(); cx.arc(targetX, flightY, r * .62, 0, Math.PI * 2); cx.stroke();
    } else if (animation.attack === 'portal-crush') {
      const close = Math.sin(p * Math.PI), portalW = size * (.08 + close * .22); cx.globalAlpha = fade * .3; cx.fillStyle = edgeColor; cx.beginPath(); cx.ellipse(originX, flightY, portalW, size * .35, 0, 0, Math.PI * 2); cx.fill(); cx.beginPath(); cx.ellipse(targetX, flightY, portalW, size * .35, 0, 0, Math.PI * 2); cx.fill();
      cx.globalAlpha = fade; cx.strokeStyle = coreColor; cx.lineWidth = 7 * unit; cx.beginPath(); cx.ellipse(originX, flightY, portalW, size * .35, 0, 0, Math.PI * 2); cx.stroke(); cx.beginPath(); cx.ellipse(targetX, flightY, portalW, size * .35, 0, 0, Math.PI * 2); cx.stroke(); cx.fillStyle = coreColor; cx.beginPath(); cx.arc(travelX, flightY, size * .09, 0, Math.PI * 2); cx.fill();
    } else if (animation.attack === 'sunrise-lance') {
      const horizonY = baseY - size * .16, sunX = travelX, sunY = horizonY - Math.sin(p * Math.PI) * size * .5; cx.globalAlpha = fade * .45; cx.fillStyle = edgeColor; cx.beginPath(); cx.arc(sunX, sunY, size * .21, Math.PI, 0); cx.fill(); cx.globalAlpha = fade; cx.strokeStyle = coreColor; cx.lineWidth = 6 * unit; cx.beginPath(); cx.moveTo(originX, horizonY); cx.lineTo(targetX, horizonY); cx.stroke(); cx.beginPath(); cx.moveTo(sunX, sunY); cx.lineTo(targetX, flightY); cx.stroke();
    } else if (animation.attack === 'sky-drop') {
      cx.strokeStyle = edgeColor; cx.lineWidth = 9 * unit;
      for (let i = 0; i < 6; i++) { const delay = i * .07, phase = Math.max(0, Math.min(1, (p - delay) * 1.5)), x = targetX + (i - 2.5) * size * .1, y = baseY - size * (1.25 - phase * .82); cx.globalAlpha = Math.sin(phase * Math.PI) * .82; cx.beginPath(); cx.moveTo(x, y - size * .25); cx.lineTo(x, y); cx.lineTo(x - size * .07, y - size * .1); cx.moveTo(x, y); cx.lineTo(x + size * .07, y - size * .1); cx.stroke(); }
    } else if (animation.attack === 'coin-ring') {
      cx.globalAlpha = fade; cx.strokeStyle = edgeColor; cx.lineWidth = 8 * unit; cx.beginPath(); cx.ellipse(travelX, flightY, size * .24, size * (.08 + Math.abs(Math.sin(p * 10)) * .16), p * 5, 0, Math.PI * 2); cx.stroke(); cx.strokeStyle = coreColor; cx.lineWidth = 3 * unit; cx.stroke();
      for (let i = 0; i < 4; i++) { const a = p * 7 + i * Math.PI / 2; cx.fillStyle = i % 2 ? coreColor : edgeColor; cx.beginPath(); cx.arc(travelX + Math.cos(a) * size * .28, flightY + Math.sin(a) * size * .18, size * .045, 0, Math.PI * 2); cx.fill(); }
    } else if (animation.attack === 'cross-flare') {
      const arm = size * (.12 + Math.sin(p * Math.PI) * .18); cx.globalAlpha = fade * .28; cx.strokeStyle = edgeColor; cx.lineWidth = 18 * unit;
      cx.beginPath(); cx.moveTo(travelX - arm, flightY); cx.lineTo(travelX + arm, flightY); cx.moveTo(travelX, flightY - arm); cx.lineTo(travelX, flightY + arm); cx.stroke();
      cx.globalAlpha = fade; cx.strokeStyle = coreColor; cx.lineWidth = 5 * unit; cx.stroke();
    } else if (animation.attack === 'child-spring') {
      const bounceY = flightY - Math.abs(Math.sin(p * Math.PI * 3)) * size * .22, r = size * .13; cx.globalAlpha = fade;
      cx.fillStyle = coreColor; cx.strokeStyle = edgeColor; cx.lineWidth = 6 * unit; cx.beginPath(); cx.arc(travelX, bounceY, r, 0, Math.PI * 2); cx.fill(); cx.stroke();
      cx.beginPath(); cx.moveTo(travelX - r * .5, bounceY + r); cx.quadraticCurveTo(travelX, bounceY + r * 1.8, travelX + r * .5, bounceY + r); cx.stroke();
    } else if (animation.attack === 'petal-dance') {
      for (let i = 0; i < 10; i++) { const phase = Math.max(0, Math.min(1, p * 1.45 - i * .045)), a = phase * 10 + i * 1.7, x = originX + (targetX - originX) * phase + Math.cos(a) * size * .18, y = flightY + Math.sin(a) * size * .24; cx.save(); cx.translate(x, y); cx.rotate(a); cx.globalAlpha = Math.sin(phase * Math.PI) * .86; cx.fillStyle = i % 2 ? coreColor : edgeColor; cx.beginPath(); cx.ellipse(0, 0, size * .075, size * .035, .35, 0, Math.PI * 2); cx.fill(); cx.restore(); }
    } else if (animation.attack === 'compass-star') {
      const axis = animation.axis || 1, r = size * (.16 + Math.sin(p * Math.PI) * .13); cx.save(); cx.translate(travelX, flightY); cx.rotate(p * axis * 4); cx.globalAlpha = fade; cx.fillStyle = coreColor; cx.strokeStyle = edgeColor; cx.lineWidth = 5 * unit; cx.beginPath();
      for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + i * Math.PI / 4, radius = i % 2 ? r * .42 : r; const x = Math.cos(a) * radius, y = Math.sin(a) * radius; if (!i) cx.moveTo(x, y); else cx.lineTo(x, y); } cx.closePath(); cx.fill(); cx.stroke(); cx.restore();
    } else if (animation.attack === 'noon-beam') {
      const y = baseY - size * (1.25 - p * .72); cx.globalAlpha = fade * .35; cx.strokeStyle = edgeColor; cx.lineWidth = 22 * unit; cx.beginPath(); cx.moveTo(targetX, y - size * .48); cx.lineTo(targetX, baseY - size * .18); cx.stroke(); cx.globalAlpha = fade; cx.strokeStyle = coreColor; cx.lineWidth = 7 * unit; cx.stroke();
      cx.fillStyle = coreColor; cx.beginPath(); cx.arc(targetX, y, size * .16, 0, Math.PI * 2); cx.fill();
    } else if (animation.attack === 'hundred-grid') {
      const cell = size * .075, cols = 5; cx.globalAlpha = fade; cx.strokeStyle = edgeColor; cx.lineWidth = 3 * unit;
      for (let i = 0; i < 10; i++) { const row = Math.floor(i / cols), col = i % cols, x = travelX + (col - 2) * cell * 1.25, y = flightY + (row - .5) * cell * 1.25; cx.fillStyle = i % 2 ? coreColor : edgeColor; cx.globalAlpha = fade * (.55 + (i % 3) * .18); cx.fillRect(x - cell / 2, y - cell / 2, cell, cell); cx.strokeRect(x - cell / 2, y - cell / 2, cell, cell); }
    } else if (animation.attack === 'lead-arrow') {
      const tip = travelX + direction * size * .18; cx.globalAlpha = fade * .3; cx.strokeStyle = edgeColor; cx.lineWidth = 18 * unit; cx.beginPath(); cx.moveTo(originX, flightY); cx.lineTo(tip, flightY); cx.stroke(); cx.globalAlpha = fade; cx.strokeStyle = coreColor; cx.lineWidth = 5 * unit; cx.stroke(); cx.fillStyle = edgeColor; cx.beginPath(); cx.moveTo(tip, flightY); cx.lineTo(tip - direction * size * .2, flightY - size * .14); cx.lineTo(tip - direction * size * .2, flightY + size * .14); cx.closePath(); cx.fill();
    } else if (animation.attack === 'name-seal') {
      const w = size * .32, h = size * .26; cx.globalAlpha = fade * .3; cx.fillStyle = edgeColor; cx.fillRect(travelX - w * .58, flightY - h * .65, w * 1.16, h * 1.3); cx.globalAlpha = fade; cx.fillStyle = '#10223d'; cx.strokeStyle = coreColor; cx.lineWidth = 5 * unit; cx.fillRect(travelX - w / 2, flightY - h / 2, w, h); cx.strokeRect(travelX - w / 2, flightY - h / 2, w, h); cx.fillStyle = coreColor; cx.font = `bold ${Math.round(size * .2)}px ${JPFONT}`; cx.textAlign = 'center'; cx.fillText(animation.glyph || '名', travelX, flightY + size * .07); cx.textAlign = 'left';
    } else if (animation.attack === 'star-barrage') {
      const count = Math.max(8, Number(animation.count) || 10); for (let i = 0; i < count; i++) { const phase = Math.max(0, Math.min(1, p * 1.5 - i * .025)), a = i * 2.4 + p * 7, x = originX + (targetX - originX) * phase, y = flightY + Math.sin(a) * size * .28, r = size * (.025 + (i % 3) * .012); cx.globalAlpha = Math.sin(phase * Math.PI) * .88; cx.fillStyle = i % 2 ? coreColor : edgeColor; cx.beginPath(); cx.arc(x, y, r, 0, Math.PI * 2); cx.fill(); }
    } else if (animation.attack === 'sunset-blade') {
      const r = size * (.2 + Math.sin(p * Math.PI) * .08); cx.globalAlpha = fade * .32; cx.fillStyle = edgeColor; cx.beginPath(); cx.arc(travelX, flightY, r * 1.35, 0, Math.PI * 2); cx.fill(); cx.globalAlpha = fade; cx.fillStyle = coreColor; cx.beginPath(); cx.arc(travelX, flightY, r, -.65 * Math.PI, .65 * Math.PI); cx.arc(travelX - direction * r * .38, flightY, r * .78, .65 * Math.PI, -.65 * Math.PI, true); cx.fill();
    } else if (animation.attack === 'question-burst') {
      cx.globalAlpha = fade; cx.fillStyle = coreColor; cx.strokeStyle = edgeColor; cx.lineWidth = 4 * unit; cx.font = `bold ${Math.round(size * .34)}px ${JPFONT}`; cx.textAlign = 'center';
      for (let i = 0; i < 3; i++) { const a = p * 7 + i * Math.PI * 2 / 3, x = travelX + Math.cos(a) * size * .2, y = flightY + Math.sin(a) * size * .15; cx.strokeText('?', x, y); cx.fillText('?', x, y); } cx.textAlign = 'left';
    } else if (animation.attack === 'side-arrow') {
      const axis = animation.axis || 1, y = flightY + axis * size * .12, tip = travelX + direction * size * .18; cx.globalAlpha = fade * .3; cx.strokeStyle = edgeColor; cx.lineWidth = 17 * unit; cx.beginPath(); cx.moveTo(originX, y); cx.lineTo(tip, y); cx.stroke(); cx.globalAlpha = fade; cx.strokeStyle = coreColor; cx.lineWidth = 5 * unit; cx.stroke(); cx.beginPath(); cx.moveTo(tip - direction * size * .18, y - axis * size * .13); cx.lineTo(tip, y); cx.lineTo(tip - direction * size * .18, y + axis * size * .13); cx.stroke();
    } else if (animation.attack === 'dark-rift') {
      cx.strokeStyle = edgeColor; cx.lineWidth = 8 * unit; for (let i = 0; i < 5; i++) { const phase = Math.max(0, Math.min(1, p * 1.35 - i * .08)), x = originX + (targetX - originX) * phase, y = flightY + (i - 2) * size * .1; cx.globalAlpha = Math.sin(phase * Math.PI) * .9; cx.beginPath(); cx.moveTo(x - direction * size * .13, y - size * .12); cx.lineTo(x, y); cx.lineTo(x - direction * size * .08, y + size * .13); cx.stroke(); }
    } else if (animation.attack === 'shadow-lantern') {
      const r = size * (.12 + Math.sin(p * Math.PI) * .09); cx.globalAlpha = fade * .35; cx.fillStyle = edgeColor; cx.beginPath(); cx.arc(travelX, flightY, r * 1.7, 0, Math.PI * 2); cx.fill(); cx.globalAlpha = fade; cx.fillStyle = '#17142d'; cx.strokeStyle = coreColor; cx.lineWidth = 5 * unit; cx.fillRect(travelX - r * .7, flightY - r, r * 1.4, r * 2); cx.strokeRect(travelX - r * .7, flightY - r, r * 1.4, r * 2); cx.beginPath(); cx.arc(travelX, flightY - r, r * .55, Math.PI, 0); cx.stroke();
    } else if (animation.attack === 'healing-cross') {
      const arm = size * (.1 + Math.sin(p * Math.PI) * .14); cx.globalAlpha = fade * .32; cx.fillStyle = edgeColor; cx.fillRect(travelX - arm * .32, flightY - arm, arm * .64, arm * 2); cx.fillRect(travelX - arm, flightY - arm * .32, arm * 2, arm * .64); cx.globalAlpha = fade; cx.fillStyle = coreColor; cx.fillRect(travelX - arm * .18, flightY - arm * .75, arm * .36, arm * 1.5); cx.fillRect(travelX - arm * .75, flightY - arm * .18, arm * 1.5, arm * .36);
    } else if (animation.attack === 'focus-burst') {
      const pulse = (p * 4) % 1, r = size * (.06 + pulse * .32); cx.globalAlpha = (1 - pulse) * fade; cx.strokeStyle = coreColor; cx.lineWidth = 7 * unit; cx.beginPath(); cx.arc(targetX, flightY, r, 0, Math.PI * 2); cx.stroke(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + p; cx.beginPath(); cx.moveTo(targetX + Math.cos(a) * r * .55, flightY + Math.sin(a) * r * .55); cx.lineTo(targetX + Math.cos(a) * r * 1.3, flightY + Math.sin(a) * r * 1.3); cx.stroke(); }
    } else if (animation.attack === 'house-crash') {
      const w = size * (.24 + Math.sin(p * Math.PI) * .1), h = w * .72; cx.globalAlpha = fade * .3; cx.fillStyle = edgeColor; cx.fillRect(travelX - w * .62, flightY - h * .25, w * 1.24, h * 1.08); cx.globalAlpha = fade; cx.fillStyle = coreColor; cx.strokeStyle = edgeColor; cx.lineWidth = 6 * unit; cx.beginPath(); cx.moveTo(travelX - w / 2, flightY - h * .25); cx.lineTo(travelX, flightY - h); cx.lineTo(travelX + w / 2, flightY - h * .25); cx.closePath(); cx.fill(); cx.stroke(); cx.strokeRect(travelX - w * .42, flightY - h * .25, w * .84, h * .72);
    } else if (animation.attack === 'portal-open') {
      const open = Math.sin(p * Math.PI), portalW = size * (.04 + open * .28); cx.globalAlpha = fade * .28; cx.fillStyle = edgeColor; cx.beginPath(); cx.ellipse(travelX, flightY, portalW * 1.35, size * .38, 0, 0, Math.PI * 2); cx.fill(); cx.globalAlpha = fade; cx.strokeStyle = coreColor; cx.lineWidth = 7 * unit; cx.beginPath(); cx.ellipse(travelX, flightY, portalW, size * .34, 0, 0, Math.PI * 2); cx.stroke();
      cx.beginPath(); cx.moveTo(travelX - portalW * .5, flightY); cx.lineTo(travelX + direction * size * .35, flightY); cx.stroke();
    } else if (animation.attack === 'world-sphere') {
      const r = size * (.14 + Math.sin(p * Math.PI) * .12); cx.globalAlpha = fade * .3; cx.fillStyle = edgeColor; cx.beginPath(); cx.arc(travelX, flightY, r * 1.35, 0, Math.PI * 2); cx.fill(); cx.globalAlpha = fade; cx.strokeStyle = coreColor; cx.lineWidth = 5 * unit; cx.beginPath(); cx.arc(travelX, flightY, r, 0, Math.PI * 2); cx.stroke(); cx.beginPath(); cx.ellipse(travelX, flightY, r * .45, r, p * 4, 0, Math.PI * 2); cx.stroke(); cx.beginPath(); cx.ellipse(travelX, flightY, r, r * .4, 0, 0, Math.PI * 2); cx.stroke();
    } else if (animation.attack === 'frost-spikes') {
      cx.fillStyle = coreColor; cx.strokeStyle = edgeColor; cx.lineWidth = 4 * unit; for (let i = 0; i < 7; i++) { const phase = Math.max(0, Math.min(1, p * 1.5 - i * .06)), x = originX + (targetX - originX) * phase, h = size * (.13 + (i % 3) * .06), y = baseY - size * .12; cx.globalAlpha = Math.sin(phase * Math.PI) * .88; cx.beginPath(); cx.moveTo(x - size * .07, y); cx.lineTo(x, y - h); cx.lineTo(x + size * .07, y); cx.closePath(); cx.fill(); cx.stroke(); }
    } else if (animation.attack === 'face-mask') {
      const r = size * (.15 + Math.sin(p * Math.PI) * .1); cx.globalAlpha = fade; cx.fillStyle = coreColor; cx.strokeStyle = edgeColor; cx.lineWidth = 6 * unit; cx.beginPath(); cx.ellipse(travelX, flightY, r * .82, r, 0, 0, Math.PI * 2); cx.fill(); cx.stroke(); cx.fillStyle = edgeColor;
      for (const side of [-1, 1]) { cx.beginPath(); cx.ellipse(travelX + side * r * .3, flightY - r * .18, r * .12, r * .19, 0, 0, Math.PI * 2); cx.fill(); } cx.beginPath(); cx.arc(travelX, flightY + r * .2, r * .3, .15, Math.PI - .15); cx.stroke();
    } else if (animation.attack === 'return-boomerang') {
      const a = p * Math.PI * 4 * direction, r = size * .22; cx.save(); cx.translate(travelX, flightY); cx.rotate(a); cx.globalAlpha = fade * .3; cx.strokeStyle = edgeColor; cx.lineWidth = 15 * unit; cx.beginPath(); cx.moveTo(-r, -r * .45); cx.quadraticCurveTo(0, r * .2, r, -r * .45); cx.stroke(); cx.globalAlpha = fade; cx.strokeStyle = coreColor; cx.lineWidth = 5 * unit; cx.stroke(); cx.restore();
    } else if (animation.attack === 'bull-charge') {
      const head = size * .17; cx.globalAlpha = fade * .32; cx.strokeStyle = edgeColor; cx.lineWidth = 18 * unit; cx.beginPath(); cx.moveTo(originX, flightY); cx.lineTo(travelX, flightY); cx.stroke(); cx.globalAlpha = fade; cx.fillStyle = coreColor; cx.strokeStyle = edgeColor; cx.lineWidth = 6 * unit; cx.beginPath(); cx.arc(travelX, flightY, head, 0, Math.PI * 2); cx.fill(); cx.stroke();
      for (const side of [-1, 1]) { cx.beginPath(); cx.moveTo(travelX + side * head * .55, flightY - head * .55); cx.quadraticCurveTo(travelX + side * head * 1.45, flightY - head * 1.2, travelX + side * head * 1.3, flightY); cx.stroke(); }
    } else if (animation.attack === 'capital-tower') {
      const w = size * .3, h = size * (.25 + p * .38), y = baseY - h; cx.globalAlpha = fade * .3; cx.fillStyle = edgeColor; cx.fillRect(targetX - w * .62, y, w * 1.24, h); cx.globalAlpha = fade; cx.fillStyle = coreColor; cx.strokeStyle = edgeColor; cx.lineWidth = 6 * unit; cx.fillRect(targetX - w / 2, y, w, h); cx.strokeRect(targetX - w / 2, y, w, h); for (let i = 0; i < 3; i++) { cx.fillStyle = edgeColor; cx.fillRect(targetX - w * .32 + i * w * .3, y + h * .18, w * .11, h * .48); }
    } else if (animation.attack === 'district-grid') {
      const cell = size * .11; cx.globalAlpha = fade; cx.strokeStyle = coreColor; cx.lineWidth = 5 * unit; for (let row = -1; row <= 1; row++) for (let col = -1; col <= 1; col++) { const spread = .6 + Math.sin(p * Math.PI) * .55, x = travelX + col * cell * spread, y = flightY + row * cell * spread; cx.globalAlpha = fade * (row === 0 && col === 0 ? 1 : .62); cx.strokeRect(x - cell * .42, y - cell * .42, cell * .84, cell * .84); }
    } else if (animation.attack === 'spirit-burst') {
      const r = size * (.12 + Math.sin(p * Math.PI) * .11); cx.globalAlpha = fade * .35; cx.fillStyle = edgeColor; cx.beginPath(); cx.arc(travelX, flightY, r * 1.7, 0, Math.PI * 2); cx.fill(); cx.globalAlpha = fade; cx.fillStyle = coreColor; cx.beginPath(); cx.arc(travelX, flightY, r, 0, Math.PI * 2); cx.fill();
      cx.strokeStyle = edgeColor; cx.lineWidth = 4 * unit; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + p * 5; cx.beginPath(); cx.moveTo(travelX + Math.cos(a) * r * 1.15, flightY + Math.sin(a) * r * 1.15); cx.lineTo(travelX + Math.cos(a) * r * 1.75, flightY + Math.sin(a) * r * 1.75); cx.stroke(); }
    }
    if (p > .66) {
      const impact = (p - .66) / .34, impactY = baseY - size * .44, radius = size * (.12 + impact * .5);
      cx.globalAlpha = (1 - impact) * .9; cx.strokeStyle = coreColor; cx.lineWidth = 6 * unit;
      cx.beginPath(); cx.arc(targetX, impactY, radius, 0, Math.PI * 2); cx.stroke();
      cx.strokeStyle = edgeColor; cx.lineWidth = 3 * unit; cx.beginPath(); cx.arc(targetX, impactY, radius * .68, 0, Math.PI * 2); cx.stroke();
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, inner = radius * .78, outer = radius * 1.18; cx.beginPath(); cx.moveTo(targetX + Math.cos(a) * inner, impactY + Math.sin(a) * inner); cx.lineTo(targetX + Math.cos(a) * outer, impactY + Math.sin(a) * outer); cx.stroke(); }
    }
    cx.restore(); return true;
  }
  function renderBattle() {
    const b = battle, W = SCREEN_W, H = SCREEN_H, FIELD_H = H - quizPanelLayout(W, H).panelH;
    drawBattleBackground(b.kind, W, FIELD_H);
    if (b.flash > 0) { cx.fillStyle = `rgba(255,80,80,${b.flash / 500})`; cx.fillRect(0, 0, W, FIELD_H); }
    // Sân đấu logic tối đa 1280×720, nằm giữa cả trên màn hình siêu rộng.
    const stageW = Math.min(W, 1280);
    // Ở màn hình dọc, dùng toàn bộ chiều cao battlefield để mascot đứng dưới HUD
    // thay vì ép sân thành một dải 16:9 khiến đầu nhân vật chui vào thanh thông tin.
    const stageH = W < 520 ? FIELD_H : Math.min(FIELD_H, stageW * 9 / 16);
    const shakePower = b.shake > 0 ? Math.min(8, b.shake / 32) : 0;
    const stageX = (W - stageW) / 2 + (shakePower ? Math.sin(b.shake * .23) * shakePower : 0);
    const stageY = (W < 520 ? 0 : Math.max(0, (FIELD_H - stageH) / 2))
      + (shakePower ? Math.cos(b.shake * .19) * shakePower * .45 : 0);
    const shallowLandscape = stageW >= 620 && stageH < 280;
    const baseActorScale = Math.min(1, stageW / 900, stageH / 430);
    const actorScale = shallowLandscape ? Math.max(.34, baseActorScale * .72) : Math.max(.48, baseActorScale);
    // Character anchors are independent from the background artwork.
    const plCX = stageX + stageW * .18, monCX = stageX + stageW * .82;
    // Trên màn hình dọc, hai baseline cũ nằm sát mép battlefield nên chân
    // mascot bị letterbox/câu hỏi che. Nâng cả hai lên theo chiều cao sân và
    // giữ nguyên vị trí sau cutscene để không tạo cú "rơi" khi vào trận.
    const mobilePetLift = stageW < 520 ? Math.max(38, Math.min(54, stageH * .12)) : 0;
    const mobileEnemyLift = stageW < 520 ? Math.max(16, Math.min(28, stageH * .05)) : 0;
    const plBaseY = Math.min(FIELD_H - 10, stageY + stageH * .9 + 25) - mobilePetLift;
    const monBaseY = stageY + stageH * .90 - mobileEnemyLift;
    lastBattleActorLayout = { fieldH: FIELD_H, stageH, plBaseY, monBaseY, mobilePetLift, mobileEnemyLift };
    const idle = Math.sin(performance.now() / 260) * 3 * actorScale;
    const entranceActive = b.entranceT > 0;
    const entranceProgress = entranceActive ? 1 - b.entranceT / Math.max(1, b.entranceTotal || 1450) : 1;
    const entranceReveal = Math.max(0, Math.min(1, entranceProgress / .42));
    const entranceAttack = Math.max(0, Math.min(1, (entranceProgress - .42) / .42));
    const encounterPetRecoil = entranceActive && entranceAttack > .45
      ? -Math.sin(Math.min(1, (entranceAttack - .45) / .55) * Math.PI) * 24 * actorScale : 0;
    const petP = b.petAttackT > 0 ? 1 - b.petAttackT / (b.petAttackTotal || 460) : 0;
    const enemyP = b.enemyAttackT > 0 ? 1 - b.enemyAttackT / (b.enemyAttackTotal || 520) : 0;
    const petLunge = Math.sin(Math.max(0, Math.min(1, petP)) * Math.PI) * Math.min(120, stageW * .14);
    const enemyLunge = Math.sin(Math.max(0, Math.min(1, enemyP)) * Math.PI) * Math.min(120, stageW * .14);
    const enemyRecoil = b.enemyHitT > 0 ? Math.sin(b.enemyHitT / 16) * 9 * actorScale : 0;
    const petRecoil = b.playerHitT > 0 ? -Math.abs(Math.sin(b.playerHitT / 20)) * 18 * actorScale : 0;

    if (b.kind !== 'water') {
      drawBattleStand(plCX, plBaseY, 210 * actorScale, 1);
      // drawBattleStand(monCX, monBaseY, 170 * actorScale, .82);
    }

    // Mini PvE chỉ hiển thị pet chiến đấu; player không xuất hiện trong sân đấu.
    const petW = 150 * actorScale * battleLevelScale(b.petLevel);
    cx.fillStyle = 'rgba(0,0,0,.24)'; cx.beginPath(); cx.ellipse(plCX, plBaseY + 3, petW * .48, petW * .12, 0, 0, Math.PI * 2); cx.fill();
    const petImg = monsterImg(currentPetId);
    if (petImg) {
      const ph = petW * petImg.height / petImg.width, petX = plCX + petLunge + petRecoil + encounterPetRecoil;
      cx.drawImage(petImg, petX - petW / 2, plBaseY - ph + idle, petW, ph);
      drawMonsterMeaningEffect(C.MONSTERS[currentPetId], petX, plBaseY + idle, petW);
    }

    // Wild Kanjimon are 1.25x normal size and sit low enough to clear the HUD.
    const m = b.mon, img = monsterImg(b.monId);
    const enemyW = Math.min(240, m.drawW * 1.12) * actorScale * battleLevelScale(b.kanjiLevel);
    const enemyH = enemyW * (m.drawH / m.drawW);
    const enemyX = monCX + (1 - entranceReveal) * Math.min(260, stageW * .34) - enemyLunge + enemyRecoil;
    const encounterJump = entranceActive
      ? (b.kind === 'water' ? (1 - entranceReveal) * enemyH * .82 : 0) - Math.sin(entranceReveal * Math.PI) * Math.min(72, stageH * .2)
      : 0;
    cx.fillStyle = `rgba(0,0,0,${.08 + .12 * entranceReveal})`; cx.beginPath();
    cx.ellipse(enemyX, monBaseY + 3, enemyW * .46 * (.55 + .45 * entranceReveal), enemyW * .09, 0, 0, Math.PI * 2); cx.fill();
    if (img) {
      cx.save();
      if (b.enemyHitT > 0) cx.filter = `brightness(${1.5 + 1.5 * Math.abs(Math.sin(b.enemyHitT / 25))}) saturate(.35)`;
      else if (b.botFlash > 0) cx.filter = `brightness(${1.1 + .35 * Math.abs(Math.sin(Date.now() / 50))})`;
      cx.drawImage(img, enemyX - enemyW / 2, monBaseY - enemyH - idle + encounterJump, enemyW, enemyH);
      cx.restore();
    } else {
      // Enemy sprites are lazy-loaded. Keep the battle frame and quiz usable
      // while decode is pending instead of throwing drawImage(null), which
      // would abort render before the HUD/panel and stop requestAnimationFrame.
      const placeholderSize = Math.max(54, enemyW * .52);
      cx.fillStyle = 'rgba(11,16,48,.78)'; cx.beginPath(); cx.arc(enemyX, monBaseY - enemyH * .46, placeholderSize * .58, 0, Math.PI * 2); cx.fill();
      cx.strokeStyle = '#6cc0ff'; cx.lineWidth = 3; cx.stroke();
      cx.fillStyle = '#ffd54a'; cx.font = `bold ${placeholderSize}px ${JPFONT}`; cx.textAlign = 'center';
      cx.fillText(m.kanji || '？', enemyX, monBaseY - enemyH * .46 + placeholderSize * .34); cx.textAlign = 'left';
    }
    drawMonsterMeaningEffect(m, enemyX, monBaseY - idle + encounterJump, enemyW);

    // Cutscene dùng đúng tuyệt kỹ semantic của Kanji vừa xuất hiện. Pet vẫn
    // giật lùi tại nhịp impact, nhưng quái không còn lao/cắn bằng pose chung.
    if (entranceActive && entranceAttack > 0) {
      drawMeaningAttackAnimation(m, entranceAttack, monCX, plCX, Math.min(plBaseY, monBaseY), 210 * actorScale);
    }
    if (b.petAttackT > 0) drawMeaningAttackAnimation(C.MONSTERS[currentPetId], petP, plCX, monCX, Math.min(plBaseY, monBaseY), 180 * actorScale);
    if (b.enemyAttackT > 0) drawMeaningAttackAnimation(m, enemyP, monCX, plCX, Math.min(plBaseY, monBaseY), 200 * actorScale);
    drawBattleEffects(b, { stageX, stageY, stageW, stageH, plCX, monCX, plBaseY, monBaseY, actorScale });
    if (entranceActive) {
      drawWildEncounterCutscene(b, { stageX, stageY, stageW, stageH, plCX, monCX, plBaseY, monBaseY, actorScale, enemyX, enemyW, enemyH, progress: entranceProgress });
      // Cutscene chỉ phủ battlefield. Panel câu hỏi vẫn được vẽ ở phần dưới
      // để mobile không xuất hiện một mảng đen lớn; input vẫn bị khóa bởi entranceT.
      drawQuizPanel(b, W, H);
      return;
    }

    // HUD đối xứng ở hai góc trên của sân đấu.
    const hpW = Math.max(140, Math.min(320, (stageW - 54) / 2));
    const hudY = stageY + 18, petHudX = stageX + 18, enemyHudX = stageX + stageW - hpW - 18;
    const pet = C.MONSTERS[currentPetId], petKanji = pet ? pet.kanji : '?';
    const mobileHud = stageW < 520;
    drawHpBar(petHudX, hudY, mobileHud ? `${pet ? monsterHanViet(pet) : 'Pet'}「${petKanji}」 Lv.${b.petLevel}` : `Pet của bạn · ${pet ? pet.name : ''} 「${petKanji}」 · Lv.${b.petLevel}`, player.hp, player.maxHp, '#43d17a', hpW, pet);
    drawHpBar(enemyHudX, hudY, mobileHud ? `${m.name}「${m.kanji}」 Lv.${b.kanjiLevel}` : `${m.name} 「${m.kanji}」 · Lv.${b.kanjiLevel}`, b.monHp, b.monMaxHp, '#e04a4a', hpW, m);
    drawEnergyGauge(b, petHudX, hudY + 53, hpW);
    drawAttackGauge(b, enemyHudX, hudY + 53, hpW);
    if (stageW >= 620 && stageH >= 300) drawPetMastery(petKanji, petHudX, hudY + 87, hpW, true);

    if (b.combo > 1) {
      cx.fillStyle = '#ffd54a'; cx.font = 'bold 18px "KanjiGo UI",sans-serif'; cx.textAlign = 'center';
      cx.fillText(`COMBO x${b.combo}`, stageX + stageW / 2, hudY + 22); cx.textAlign = 'left';
    }

    // 🩹 FEEDBACK nổi ngay TRÊN khung câu hỏi (không đè lên đáp án)
    if (b.phase === 'fight' && b.feedback && b.fbT > 0) drawFeedbackBanner(b, W, FIELD_H);
    // 😵 Overlay CHOÁNG có đếm ngược (chống spam đáp án)
    if (b.phase === 'fight' && b.stun > 0) drawStunOverlay(b, W, FIELD_H);

    drawQuizPanel(b, W, H);
  }

  function drawAttackGauge(b, x, y, w) {
    const progress = Math.max(0, Math.min(1, 1 - b.botNextIn / Math.max(1, b.botCycleMs)));
    const danger = b.botNextIn <= C.COMBAT.botTelegraph;
    cx.fillStyle = 'rgba(11,16,32,.88)'; cx.fillRect(x, y, w, 28);
    cx.fillStyle = '#b9c8e8'; cx.font = 'bold 11px "KanjiGo UI",sans-serif'; cx.fillText('⚔ ATTACK GAUGE', x + 8, y + 11);
    cx.fillStyle = '#26334b'; cx.fillRect(x + 8, y + 16, w - 16, 7);
    cx.fillStyle = danger ? '#ff5454' : '#f1a83b'; cx.fillRect(x + 8, y + 16, (w - 16) * progress, 7);
    if (danger) { cx.strokeStyle = `rgba(255,90,90,${.5 + .5 * Math.sin(Date.now() / 80)})`; cx.lineWidth = 2; cx.strokeRect(x, y, w, 28); }
  }

  function drawEnergyGauge(b, x, y, w) {
    const max = C.COMBAT.energyMax || 3, gap = 5, innerW = w - 16;
    cx.fillStyle = 'rgba(11,16,32,.88)'; cx.fillRect(x, y, w, 28);
    cx.fillStyle = '#b9c8e8'; cx.font = 'bold 11px "KanjiGo UI",sans-serif'; cx.fillText('✦ TUYỆT KỸ', x + 8, y + 11);
    const pipW = (innerW - gap * (max - 1)) / max;
    for (let i = 0; i < max; i++) {
      cx.fillStyle = i < b.energy ? '#56eaff' : '#26334b';
      cx.fillRect(x + 8 + i * (pipW + gap), y + 16, pipW, 7);
    }
  }

  function drawWildEncounterCutscene(b, s) {
    const progress = Math.max(0, Math.min(1, s.progress || 0)), water = b.kind === 'water';
    const barH = Math.max(30, Math.min(62, s.stageH * .12)), now = performance.now();
    cx.save();
    // Letterbox bars keep the short reveal readable on both desktop and mobile.
    cx.fillStyle = 'rgba(3,8,20,.92)';
    cx.fillRect(s.stageX, s.stageY, s.stageW, barH); cx.fillRect(s.stageX, s.stageY + s.stageH - barH, s.stageW, barH);
    // Grass encounters scatter leaves; water encounters throw droplets/ripples.
    for (let i = 0; i < 12; i++) {
      const phase = (progress * 1.45 + i * .087) % 1;
      const x = s.enemyX + Math.sin(i * 2.17 + now / 180) * s.enemyW * (.38 + phase * .45);
      const y = s.monBaseY - s.enemyH * .12 - phase * s.enemyH * .9;
      cx.globalAlpha = Math.sin(phase * Math.PI) * .72;
      if (water) {
        cx.strokeStyle = i % 2 ? '#b9f4ff' : '#58cbe9'; cx.lineWidth = 2;
        cx.beginPath(); cx.moveTo(x, y - 7); cx.quadraticCurveTo(x + 5, y, x, y + 5); cx.quadraticCurveTo(x - 5, y, x, y - 7); cx.stroke();
      } else {
        cx.fillStyle = i % 2 ? '#a8dc55' : '#5cae46'; cx.save(); cx.translate(x, y); cx.rotate(phase * 5 + i);
        cx.beginPath(); cx.ellipse(0, 0, 7, 3.5, .35, 0, Math.PI * 2); cx.fill(); cx.restore();
      }
    }
    cx.globalAlpha = 1;
    if (water) {
      const ripple = 28 + progress * 115;
      cx.strokeStyle = `rgba(164,238,255,${Math.max(0, .75 - progress * .55)})`; cx.lineWidth = 3;
      cx.beginPath(); cx.ellipse(s.monCX, s.monBaseY + 2, ripple, ripple * .18, 0, 0, Math.PI * 2); cx.stroke();
    }
    if (b.encounterImpactT > 0) {
      const life = b.encounterImpactT / 430, impactX = s.plCX + s.stageW * .12, impactY = s.plBaseY - 82 * s.actorScale;
      cx.globalAlpha = Math.min(1, life * 1.8); cx.strokeStyle = water ? '#c9f8ff' : '#fff3a0'; cx.lineWidth = 5;
      cx.beginPath(); cx.arc(impactX, impactY, 22 + (1 - life) * 58, 0, Math.PI * 2); cx.stroke();
      for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4, inner = 19 + (1 - life) * 25, outer = inner + 30;
        cx.beginPath(); cx.moveTo(impactX + Math.cos(angle) * inner, impactY + Math.sin(angle) * inner);
        cx.lineTo(impactX + Math.cos(angle) * outer, impactY + Math.sin(angle) * outer); cx.stroke();
      }
      cx.globalAlpha = 1;
    }
    const textAlpha = Math.min(1, progress / .16, (1 - progress) / .1);
    cx.globalAlpha = Math.max(0, textAlpha); cx.textAlign = 'center'; cx.shadowColor = 'rgba(0,0,0,.95)'; cx.shadowBlur = 9;
    cx.fillStyle = water ? '#c8f6ff' : '#f0ffb5'; cx.font = `bold ${Math.max(17, Math.min(30, s.stageW * .032))}px ${JPFONT}`;
    const message = progress < .4 ? (water ? 'MẶT NƯỚC BỖNG CHUYỂN ĐỘNG…' : 'BỤI CỎ BỖNG RUNG LÊN…')
      : `KANJI HOANG DÃ「${b.mon.kanji}」TUNG TUYỆT KỸ!`;
    cx.fillText(message, s.stageX + s.stageW / 2, s.stageY + barH * .68);
    cx.restore(); cx.textAlign = 'left';
  }

  function drawBattleEffects(b, s) {
    for (const p of b.particles || []) {
      cx.globalAlpha = Math.min(1, p.t / 240); cx.fillStyle = p.color;
      cx.beginPath(); cx.arc(s.stageX + p.x * s.stageW, s.stageY + p.y * s.stageH, p.size, 0, Math.PI * 2); cx.fill();
    }
    cx.globalAlpha = 1;
    for (const n of b.damageNumbers || []) {
      const enemySide = n.side === 'enemy', life = 1 - n.t / n.total, x = enemySide ? s.monCX : s.plCX;
      const baseY = enemySide ? s.monBaseY : s.plBaseY;
      cx.globalAlpha = Math.min(1, n.t / 180); cx.fillStyle = n.color; cx.textAlign = 'center';
      cx.font = 'bold 25px "KanjiGo UI",sans-serif'; cx.fillText(n.text, x, baseY - 150 * s.actorScale - life * 50);
    }
    cx.globalAlpha = 1; cx.textAlign = 'left';
    if (b.skillT > 0) {
      const alpha = Math.min(1, b.skillT / 220);
      cx.textAlign = 'center'; cx.fillStyle = `rgba(130,245,255,${alpha})`; cx.font = `bold 34px ${JPFONT}`;
      cx.fillText(b.skillName, s.stageX + s.stageW / 2, s.stageY + s.stageH * .42);
      cx.fillStyle = `rgba(210,255,255,${alpha * .18})`; cx.font = `bold ${Math.round(150 * Math.min(1, s.stageW / 900))}px ${JPFONT}`;
      cx.fillText(b.skillKanji || b.mon.kanji, s.stageX + s.stageW / 2, s.stageY + s.stageH * .68); cx.textAlign = 'left';
    } else if (b.perfectT > 0) {
      cx.globalAlpha = Math.min(1, b.perfectT / 180); cx.fillStyle = '#7ff7ff'; cx.textAlign = 'center';
      cx.font = 'bold 28px "KanjiGo UI",sans-serif'; cx.fillText('PERFECT!', s.stageX + s.stageW / 2, s.stageY + s.stageH * .42);
      cx.globalAlpha = 1; cx.textAlign = 'left';
    }
  }

  function renderLecture() {
    const physicalW = SCREEN_W, physicalH = SCREEN_H;
    // Giữ đủ không gian theo chiều dọc ở điện thoại xoay ngang. Toàn bộ UI
    // được thu đồng nhất nên card, chữ và hitbox không tràn/chệch nhau.
    const uiScale = Math.min(1, physicalH / 560);
    const W = physicalW / uiScale, H = physicalH / uiScale;
    lecture.uiScale = uiScale;
    lecture.hitboxes = [];
    cx.save(); cx.scale(uiScale, uiScale);
    drawAcademyBackdrop(W, H);
    drawAcademyHeader(W);
    if (lecture.phase === 'lobby') renderAcademyLobby(W, H);
    else if (lecture.phase === 'picker') renderAcademyPicker(W, H);
    else if (lecture.phase === 'summary') renderAcademySummary(W, H);
    else renderAcademyLesson(W, H);
    cx.restore();
  }
  function drawAcademyBackdrop(W, H) {
    const wall = cx.createLinearGradient(0, 0, 0, H); wall.addColorStop(0, '#17274a'); wall.addColorStop(.7, '#101a36'); wall.addColorStop(1, '#0b1026');
    cx.fillStyle = wall; cx.fillRect(0, 0, W, H);
    cx.fillStyle = 'rgba(242,177,72,.08)'; cx.fillRect(0, 68, W, 3);
    const side = Math.max(18, (W - Math.min(1040, W - 24)) / 2 - 28);
    cx.fillStyle = 'rgba(8,13,31,.72)'; cx.fillRect(0, 72, side, H - 72); cx.fillRect(W - side, 72, side, H - 72);
    cx.strokeStyle = 'rgba(108,192,255,.08)'; cx.lineWidth = 1;
    for (let y = 105; y < H; y += 52) { cx.beginPath(); cx.moveTo(0, y); cx.lineTo(W, y); cx.stroke(); }
  }
  function drawAcademyHeader(W) {
    const lessonTier = lecture && lecture.char ? tierOfKanji(lecture.char) : '';
    const selectedTier = lecture && ['N5', 'N4'].includes(lecture.group) ? lecture.group : '';
    const pendingChar = nextLectureKanji(), pendingTier = pendingChar ? tierOfKanji(pendingChar) : '';
    const activeTier = lessonTier || selectedTier || pendingTier || (isTierUnlocked('N4') ? 'N4' : 'N5');
    const progress = tierProgress(activeTier);
    const total = progress.total, unlocked = progress.captured, compact = W < 620;
    const touchBackVisible = (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) || SCREEN_W <= 700;
    const backReserve = touchBackVisible ? 110 / (lecture.uiScale || 1) : 0;
    cx.fillStyle = 'rgba(8,13,31,.94)'; cx.fillRect(0, 0, W, 72);
    cx.strokeStyle = '#244f80'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(0, 71); cx.lineTo(W, 71); cx.stroke();
    cx.fillStyle = '#6cc0ff'; cx.font = `bold ${compact ? 17 : 24}px ${JPFONT}`; cx.fillText(compact ? '📖 GIẢNG ĐƯỜNG' : '📖 GIẢNG ĐƯỜNG KANJI', compact ? 14 : 24, compact ? 27 : 34);
    if (!compact) { cx.fillStyle = '#b9c8e8'; cx.font = '12px "KanjiGo UI",sans-serif'; cx.fillText('Nơi tiếp nhận kiến thức mới và unlock mascot', 25, 55); }
    const barW = compact ? W - 28 - backReserve : Math.min(250, Math.max(120, W * .22));
    const bx = compact ? 14 : W - barW - 24 - backReserve, by = compact ? 45 : 25;
    cx.fillStyle = '#26334b'; cx.fillRect(bx, by, barW, 9);
    cx.fillStyle = '#56eaff'; cx.fillRect(bx, by, total ? barW * unlocked / total : barW, 9);
    cx.fillStyle = '#dce8ff'; cx.font = `${compact ? 10 : 12}px "KanjiGo UI",sans-serif`; cx.textAlign = 'right';
    cx.fillText(`${compact ? '' : `${activeTier} ĐÃ UNLOCK `}${unlocked}/${total}`, W - (compact ? 10 : 24) - backReserve, compact ? 27 : 54); cx.textAlign = 'left';
  }
  function academyContent(W) {
    const w = Math.min(960, W - 36); return { x: (W - w) / 2, w };
  }
  function drawAcademyCard(x, y, w, h, selected = false, disabled = false) {
    cx.fillStyle = disabled ? 'rgba(30,36,54,.78)' : selected ? 'rgba(28,89,137,.96)' : 'rgba(18,31,61,.94)'; cx.fillRect(x, y, w, h);
    cx.strokeStyle = disabled ? '#3f475d' : selected ? '#72ddff' : '#275b8f'; cx.lineWidth = selected ? 3 : 2; cx.strokeRect(x, y, w, h);
  }
  function renderAcademyLobby(W, H) {
    const area = academyContent(W), items = academyMenuItems(), compact = W < 620;
    const titleY = 112;
    cx.fillStyle = '#fff'; fitText(compact ? 'Chọn cách học Kanji mới' : 'Bạn muốn khám phá Kanji mới theo cách nào?', area.x, titleY, area.w, compact ? 23 : 28, true);
    cx.fillStyle = '#9fd8f5'; cx.font = `${compact ? 12 : 14}px ${JPFONT}`; fitText('Giảng đường chỉ hiển thị những chữ chưa unlock.', area.x, titleY + 26, area.w, compact ? 12 : 14);
    if (lecture.message) { cx.fillStyle = lecture.message.startsWith('⚠') ? '#ffadad' : '#6effa1'; fitText(lecture.message, area.x, titleY + 53, area.w, 15, true); }
    const cardH = Math.max(62, Math.min(compact && H > 700 ? 96 : 82, (H - 210) / Math.max(3, items.length)));
    const cardsH = items.length * cardH + Math.max(0, items.length - 1) * 12;
    // Cân bằng khoảng trống ở portrait dài nhưng vẫn giữ tiêu đề và footer riêng.
    const startY = Math.max(titleY + 76, Math.min(titleY + 150, (H - cardsH) / 2));
    items.forEach((item, i) => {
      const y = startY + i * (cardH + 12), selected = i === (lecture.menuSel || 0);
      drawAcademyCard(area.x, y, area.w, cardH, selected);
      cx.fillStyle = selected ? '#7ff7ff' : '#ffd54a'; cx.font = `bold 19px ${JPFONT}`; cx.fillText(`${i + 1}. ${item.title}`, area.x + 22, y + 29);
      cx.fillStyle = '#c5d2eb'; cx.font = `14px ${JPFONT}`; fitText(item.desc, area.x + 22, y + 55, area.w - 44, 14);
      lecture.hitboxes.push({ x: area.x, y, w: area.w, h: cardH, action: 'menu', value: item });
    });
    cx.fillStyle = '#8395b5'; cx.font = '12px "KanjiGo UI",sans-serif';
    cx.fillText(compact ? 'Chạm một lựa chọn · ← quay lại' : '↑↓ chọn · Enter xác nhận · Esc rời Giảng đường', area.x, H - 20);
  }
  function academyPickerCols() {
    const width = SCREEN_W / ((lecture && lecture.uiScale) || 1);
    return width < 560 ? 2 : width < 860 ? 3 : width < 1180 ? 4 : 5;
  }
  function renderAcademyPicker(W, H) {
    const area = academyContent(W), groups = academyPickerGroups(), compact = W < 620;
    if (!groups.includes(lecture.group)) { lecture.group = 'ALL'; lecture.pickerScrollY = 0; }
    const list = academyFilteredList();
    lecture.pickerSel = Math.max(0, Math.min(Math.max(0, list.length - 1), lecture.pickerSel || 0));
    cx.fillStyle = '#fff'; cx.font = `bold 25px ${JPFONT}`; cx.fillText('Chọn một Kanji chưa unlock', area.x, 108);
    cx.fillStyle = 'rgba(7,13,30,.9)'; cx.fillRect(area.x, 124, area.w, 38); cx.strokeStyle = '#275b8f'; cx.strokeRect(area.x, 124, area.w, 38);
    cx.fillStyle = lecture.search ? '#fff' : '#7183a4'; cx.font = `14px ${JPFONT}`;
    fitText(lecture.search ? `⌕ ${lecture.search}` : compact ? 'Chạm một thẻ để bắt đầu học' : '⌕ Gõ Kanji, nghĩa, ON hoặc KUN để tìm...', area.x + 14, 149, area.w - 28, 14);
    const toolbarY = 170, toolbarH = 32, toolbarGap = 10;
    const sortW = Math.min(compact ? 128 : 190, area.w * .42), groupsW = area.w - sortW - toolbarGap;
    const groupGap = 6, groupW = (groupsW - groupGap * (groups.length - 1)) / groups.length;
    groups.forEach((group, index) => {
      const x = area.x + index * (groupW + groupGap), selected = group === lecture.group;
      drawAcademyCard(x, toolbarY, groupW, toolbarH, selected);
      cx.fillStyle = selected ? '#7ff7ff' : '#b9c8e8'; cx.font = `bold ${compact ? 10 : 11}px "KanjiGo UI",sans-serif`; cx.textAlign = 'center';
      cx.fillText(group === 'ALL' ? (compact ? 'TẤT' : 'TẤT CẢ') : group, x + groupW / 2, toolbarY + 21); cx.textAlign = 'left';
      lecture.hitboxes.push({ x, y: toolbarY, w: groupW, h: toolbarH, action: 'picker_group', value: group });
    });
    const sortX = area.x + groupsW + toolbarGap;
    drawAcademyCard(sortX, toolbarY, sortW, toolbarH, false);
    const sortMode = ACADEMY_SORTS.find((mode) => mode.id === lecture.sort) || ACADEMY_SORTS[0];
    cx.fillStyle = '#ffd54a'; cx.font = `bold ${compact ? 9 : 11}px "KanjiGo UI",sans-serif`; cx.textAlign = 'center';
    cx.fillText(`↕ ${sortMode.label}`, sortX + sortW / 2, toolbarY + 21); cx.textAlign = 'left';
    lecture.hitboxes.push({ x: sortX, y: toolbarY, w: sortW, h: toolbarH, action: 'picker_sort' });
    const layout = academyPickerLayout(W, H), { cols, gap, cardW, cardH, gridY, gridBottom, availableH } = layout;
    const contentRows = Math.ceil(list.length / cols);
    const contentH = contentRows ? contentRows * cardH + (contentRows - 1) * gap : 0;
    lecture.pickerMaxScroll = Math.max(0, contentH - availableH); clampAcademyPickerScroll();
    lecture.pickerViewport = { top: gridY, bottom: gridBottom };
    cx.save(); cx.beginPath(); cx.rect(area.x, gridY, area.w, availableH); cx.clip();
    list.forEach((info, index) => {
      const col = index % cols, row = Math.floor(index / cols);
      const x = area.x + col * (cardW + gap), y = gridY + row * (cardH + gap) - lecture.pickerScrollY;
      if (y + cardH < gridY || y > gridBottom) return;
      const problem = academyEligibility(info), selected = index === lecture.pickerSel;
      drawAcademyCard(x, y, cardW, cardH, selected, !!problem);
      const mon = monsterImg(info.monId), iw = Math.min(66, cardW * .38);
      if (mon) { const ih = iw * mon.height / mon.width; cx.globalAlpha = problem ? .35 : 1; cx.drawImage(mon, x + 10, y + 20, iw, ih); cx.globalAlpha = 1; }
      const tier = tierOfKanji(info.char);
      cx.fillStyle = tier === 'N4' ? '#d7b4ff' : tier === 'BONUS' ? '#ffd98a' : '#77ddff';
      cx.font = 'bold 9px "KanjiGo UI",sans-serif'; cx.fillText(tier, x + 10, y + 13);
      cx.fillStyle = problem ? '#737b90' : '#ffd54a'; cx.font = `bold 35px ${JPFONT}`; cx.fillText(info.char, x + cardW - 48, y + 48);
      cx.fillStyle = problem ? '#737b90' : '#fff'; fitText(info.meaning, x + 12, y + 91, cardW - 24, 14, true);
      const status = problem || (ensureMastery(info.char).lectured ? 'TIẾP TỤC THU PHỤC' : 'CHƯA HỌC');
      cx.fillStyle = problem ? '#ff9d9d' : ensureMastery(info.char).lectured ? '#6effa1' : '#9fd8f5'; fitText(status, x + 12, y + 116, cardW - 24, 10, true);
      if (!problem) lecture.hitboxes.push({ x, y, w: cardW, h: cardH, action: 'pick', value: info.char });
    });
    if (!list.length) { cx.fillStyle = '#9fd8f5'; cx.font = `18px ${JPFONT}`; cx.textAlign = 'center'; cx.fillText('Không tìm thấy Kanji mới phù hợp.', W / 2, gridY + availableH / 2); cx.textAlign = 'left'; }
    cx.restore();
    if (lecture.pickerMaxScroll > 0) {
      const trackX = area.x + area.w - 6, thumbH = Math.max(30, availableH * availableH / contentH);
      const thumbY = gridY + (availableH - thumbH) * lecture.pickerScrollY / lecture.pickerMaxScroll;
      cx.fillStyle = 'rgba(18,31,61,.9)'; cx.fillRect(trackX, gridY, 5, availableH);
      cx.fillStyle = '#56eaff'; cx.fillRect(trackX, thumbY, 5, thumbH);
    }
    cx.fillStyle = '#8395b5'; cx.font = '12px "KanjiGo UI",sans-serif';
    fitText(compact ? `Vuốt để cuộn · ${list.length} chữ` : `Cuộn/kéo · ←↑↓→ chọn · Enter học · Tab nhóm · F2 sort · ${list.length} chữ`, area.x, H - 14, area.w, 12);
    lecture.hitboxes.push({ x: area.x + area.w - 90, y: 80, w: 90, h: 30, action: 'back' });
    cx.fillStyle = '#9fd8f5'; cx.textAlign = 'right'; cx.fillText('Esc: quay lại', area.x + area.w, 105); cx.textAlign = 'left';
  }
  function lessonStep() { return ({ intro: 1, readings: 2, examples: 3, cards: 3, check: 4, recap: 4, confirm: 4, ready: 5 }[lecture.phase] || 1); }
  function drawLessonProgress(W) {
    const area = academyContent(W), step = lessonStep(), y = 91, gap = 8, sw = (area.w - gap * 4) / 5;
    for (let i = 0; i < 5; i++) { cx.fillStyle = i < step ? '#56eaff' : '#26334b'; cx.fillRect(area.x + i * (sw + gap), y, sw, 7); }
    cx.fillStyle = '#9fd8f5'; cx.font = '11px "KanjiGo UI",sans-serif'; cx.fillText(`BƯỚC ${step}/5`, area.x, y + 23);
  }
  function drawLessonMascot(info, x, y, maxW, maxH) {
    const img = monsterImg(info.monId); if (!img) return;
    const scale = Math.min(maxW / img.width, maxH / img.height), w = img.width * scale, h = img.height * scale;
    const bob = Math.sin(performance.now() / 260) * 4;
    cx.fillStyle = 'rgba(0,0,0,.24)'; cx.beginPath(); cx.ellipse(x + maxW / 2, y + maxH - 5, w * .38, 13, 0, 0, Math.PI * 2); cx.fill();
    cx.drawImage(img, x + (maxW - w) / 2, y + (maxH - h) / 2 + bob, w, h);
    drawMonsterMeaningEffect(C.MONSTERS[info.monId], x + maxW / 2, y + (maxH + h) / 2 + bob, w, .9);
  }
  function renderAcademyLesson(W, H) {
    const area = academyContent(W), info = lecture.info, compact = W < 620, narrow = W < 460;
    drawLessonProgress(W);
    // Giữ lesson card và CTA trong một khung gọn trên điện thoại dọc cao.
    // Việc ghim CTA theo toàn bộ H làm card có khoảng trống lớn và nút dễ bị
    // thanh công cụ của Chrome/Messenger che khuất.
    const layoutH = compact ? Math.min(H, 640) : H;
    const bodyY = 126, bodyH = layoutH - bodyY - 76;
    drawAcademyCard(area.x, bodyY, area.w, bodyH);
    if (lecture.phase === 'intro') {
      const split = compact ? area.w * .55 : area.w * .58;
      cx.fillStyle = '#9fd8f5'; cx.font = '13px "KanjiGo UI",sans-serif'; cx.fillText('KANJI MỚI', area.x + 28, bodyY + 34);
      cx.fillStyle = '#ffd54a'; cx.font = `bold ${compact ? 82 : 126}px ${JPFONT}`; cx.fillText(info.char, area.x + 28, bodyY + (compact ? 118 : 162));
      const headingW = compact ? area.w - 60 : split - 46;
      cx.fillStyle = '#fff'; fitText(info.meaning, area.x + 30, bodyY + (compact ? 153 : 205), headingW, compact ? 21 : 28, true);
      drawMonsterName(C.MONSTERS[info.monId], area.x + 30, bodyY + (compact ? 177 : 235), headingW, compact ? 15 : 18, { label: true });
      cx.fillStyle = '#a9bad8'; cx.font = `14px ${JPFONT}`; wrap('Quan sát hình dáng, đọc nghĩa và làm quen với mascot trước khi học cách đọc.', area.x + 30, bodyY + (compact ? 205 : 266), split - 48, 22);
      drawLessonMascot(info, area.x + split, bodyY + 20, area.w - split - 18, bodyH - 35);
    } else if (lecture.phase === 'readings') {
      cx.fillStyle = '#fff'; cx.font = `bold ${compact ? 23 : 27}px ${JPFONT}`; fitText(`Cách đọc của 「${info.char}」`, area.x + 28, bodyY + 42, area.w - 56, compact ? 23 : 27, true);
      const gap = narrow ? 10 : 18;
      const cardW = narrow ? area.w - 56 : (area.w - 74) / 2;
      const cardH = narrow ? Math.min(104, (bodyH - 102) / 2) : Math.min(150, bodyH - 92);
      const readingGroupH = narrow ? cardH * 2 + gap : cardH;
      const cardY = Math.max(bodyY + 72, bodyY + Math.min(150, (bodyH - readingGroupH) / 2));
      const onX = area.x + 28, onY = cardY, kunX = narrow ? onX : area.x + 46 + cardW, kunY = narrow ? cardY + cardH + gap : cardY;
      drawAcademyCard(onX, onY, cardW, cardH, true); drawAcademyCard(kunX, kunY, cardW, cardH, true);
      const drawReadingAudio = (label, labelX, labelY, char, type, active) => {
        const iconW = 28, iconH = 28, hitSize = 44, iconX = labelX + cx.measureText(label).width + 7, iconY = labelY - 22;
        cx.fillStyle = active ? '#dff8ff' : '#667087'; cx.font = `${narrow ? 15 : 17}px "KanjiGo UI",sans-serif`; cx.textAlign = 'center';
        cx.fillText(active ? '🔊' : '🔇', iconX + iconW / 2, iconY + 20); cx.textAlign = 'left';
        if (active) lecture.hitboxes.push({ x: iconX - (hitSize - iconW) / 2, y: iconY - (hitSize - iconH) / 2, w: hitSize, h: hitSize, action: 'reading_audio', value: { char, type } });
      };
      const onLabelX = onX + 20, onLabelY = onY + 30, onAudio = Array.isArray(info.on) && info.on.length > 0;
      cx.fillStyle = '#ffd54a'; cx.font = `bold ${narrow ? 14 : 17}px "KanjiGo UI",sans-serif`; cx.fillText('ÂM ON', onLabelX, onLabelY);
      drawReadingAudio('ÂM ON', onLabelX, onLabelY, info.char, 'on', onAudio);
      cx.fillStyle = '#fff'; cx.font = `${compact ? 16 : 22}px ${JPFONT}`; wrap((info.on || []).join('  ·  ') || '—', onX + 20, onY + (narrow ? 61 : 72), cardW - 40, narrow ? 24 : 30);
      const kunLabelX = kunX + 20, kunLabelY = kunY + 30, kunAudio = Array.isArray(info.kun) && info.kun.length > 0;
      cx.fillStyle = '#6effa1'; cx.font = `bold ${narrow ? 14 : 17}px "KanjiGo UI",sans-serif`; cx.fillText('ÂM KUN', kunLabelX, kunLabelY);
      drawReadingAudio('ÂM KUN', kunLabelX, kunLabelY, info.char, 'kun', kunAudio);
      cx.fillStyle = '#fff'; cx.font = `${compact ? 16 : 22}px ${JPFONT}`; wrap((info.kun || []).join('  ·  ') || '—', kunX + 20, kunY + (narrow ? 61 : 72), cardW - 40, narrow ? 24 : 30);
    } else if (lecture.phase === 'cards') {
      renderAcademyLearningCard(area, bodyY, bodyH, lecture.examples[lecture.cardIndex], false);
    } else if (lecture.phase === 'recap') {
      renderAcademyLearningCard(area, bodyY, bodyH, VOCABULARY_BY_ID.get(lecture.recapIds[lecture.recapIndex]), true);
    } else if (['check', 'confirm'].includes(lecture.phase)) renderAcademyCheck(area, bodyY, bodyH);
    else if (lecture.phase === 'ready') {
      drawLessonMascot(info, area.x + area.w * .57, bodyY + 22, area.w * .4, bodyH - 38);
      cx.fillStyle = '#6effa1'; cx.font = `bold 25px ${JPFONT}`; cx.fillText('KIẾN THỨC ĐÃ ĐƯỢC NẠP!', area.x + 30, bodyY + 58);
      cx.fillStyle = '#ffd54a'; cx.font = `bold 78px ${JPFONT}`; cx.fillText(info.char, area.x + 30, bodyY + 146);
      cx.fillStyle = '#fff'; fitText(info.meaning, area.x + 120, bodyY + 118, area.w * .4, 24, true);
      cx.fillStyle = '#b9c8e8'; cx.font = `15px ${JPFONT}`; wrap('Hoàn thành nghi thức để unlock mascot và đưa Kanji này vào KanjiDex.', area.x + 30, bodyY + 178, area.w * .5, 24);
      cx.fillStyle = '#9fd8f5'; cx.font = 'bold 13px "KanjiGo UI",sans-serif'; cx.fillText(`MINI-CHECK ${lecture.lessonScore}/3`, area.x + 30, bodyY + 235);
      if (lecture.feedback) { cx.fillStyle = '#6effa1'; fitText(lecture.feedback, area.x + 30, bodyY + 262, area.w * .52, 13, true); }
    }
    const canContinue = !['check', 'confirm'].includes(lecture.phase) || lecture.answerLocked;
    if (canContinue) {
      let label = 'TIẾP TỤC';
      if (lecture.phase === 'cards') label = !lecture.cardRevealed ? 'LẬT THẺ' : lecture.cardIndex < lecture.examples.length - 1 ? 'THẺ TIẾP THEO' : 'BẮT ĐẦU MINI-CHECK';
      else if (lecture.phase === 'recap') label = lecture.recapIndex < lecture.recapIds.length - 1 ? 'THẺ ÔN TIẾP' : 'XÁC NHẬN LẠI';
      else if (['check', 'confirm'].includes(lecture.phase)) label = 'CÂU TIẾP THEO';
      else if (lecture.phase === 'ready') label = 'BẮT ĐẦU NGHI THỨC';
      const backLabel = lecture.phase === 'readings' ? 'BƯỚC 1'
        : lecture.phase === 'cards' ? (lecture.cardIndex > 0 ? 'THẺ TRƯỚC' : 'BƯỚC 2') : '';
      if (backLabel) drawAcademyLessonActions(W, layoutH, label, backLabel);
      else drawAcademyContinue(W, layoutH, label);
    }
    if (!compact || !canContinue) {
      cx.fillStyle = '#8395b5'; cx.font = '11px "KanjiGo UI",sans-serif';
      fitText(compact ? 'Chạm đáp án để tiếp tục · ← quay lại' : 'Esc: quay lại sảnh (tiến độ được lưu)', area.x, layoutH - 14, area.w, 11);
    }
  }
  function drawVocabularyWordFace(question, target, x, y, maxW, size) {
    const parts = vocabularyParts(question, target), gap = Math.max(3, Math.round(size * .08));
    let fontSize = size, widths = [], total = Infinity;
    while (fontSize >= 22) {
      widths = parts.map((part) => {
        cx.font = `bold ${part.role === 'target' ? fontSize + 4 : fontSize}px ${JPFONT}`;
        return cx.measureText(part.text || '').width;
      });
      total = widths.reduce((sum, width) => sum + width, 0) + gap * Math.max(0, parts.length - 1);
      if (total <= maxW) break;
      fontSize--;
    }
    let cursor = x + Math.max(0, (maxW - total) / 2);
    parts.forEach((part, index) => {
      const targetPart = part.role === 'target', width = widths[index];
      if (targetPart) {
        cx.save(); cx.shadowColor = 'rgba(255,213,74,.8)'; cx.shadowBlur = 12;
        cx.fillStyle = 'rgba(255,213,74,.17)'; cx.fillRect(cursor - 5, y - fontSize - 6, width + 10, fontSize + 15); cx.restore();
      }
      cx.fillStyle = targetPart ? '#ffe066' : part.role === 'support' ? '#56eaff' : '#eef5ff';
      cx.font = `bold ${targetPart ? fontSize + 4 : fontSize}px ${JPFONT}`;
      cx.fillText(part.text || '', cursor, y); cursor += width + gap;
    });
  }
  function renderAcademyLearningCard(area, bodyY, bodyH, question, recap = false) {
    if (!question) return;
    const compact = area.w < 620, revealed = recap || lecture.cardRevealed;
    const index = recap ? lecture.recapIndex : lecture.cardIndex;
    const total = recap ? lecture.recapIds.length : lecture.examples.length;
    const progress = vocabularyProgress(question), stageLabel = String(progress ? progress.stage : 'new').toUpperCase();
    cx.fillStyle = recap ? '#ffcb70' : '#9fd8f5'; cx.font = 'bold 12px "KanjiGo UI",sans-serif';
    cx.fillText(recap ? `ÔN THẺ YẾU  ${index + 1}/${total}` : `LEARNING CARD  ${index + 1}/${total}`, area.x + 28, bodyY + 31);
    cx.fillStyle = '#7183a4'; cx.textAlign = 'right'; cx.fillText(stageLabel, area.x + area.w - 28, bodyY + 31); cx.textAlign = 'left';

    const cardX = area.x + 28, cardY = bodyY + 48, cardW = area.w - 56, cardH = Math.max(190, bodyH - 70);
    drawAcademyCard(cardX, cardY, cardW, cardH, true);
    const portraitCard = cardW < 250;
    const navH = (lecture.uiScale || 1) < 1 ? 64 : 44;
    const navY = cardY + cardH - navH - 8, navW = compact ? 76 : 94;
    const drawCardNavigation = () => {
      if (index > 0) {
        drawAcademyCard(cardX + 8, navY, navW, navH, false); cx.fillStyle = '#9fd8f5'; cx.font = 'bold 10px "KanjiGo UI",sans-serif';
        cx.fillText('◀ TRƯỚC', cardX + 17, navY + navH / 2 + 4); lecture.hitboxes.push({ x: cardX + 8, y: navY, w: navW, h: navH, action: 'card_prev' });
      }
      // Không cho bỏ qua retrieval face: thẻ hiện tại phải được lật trước
      // khi nút Next xuất hiện.
      if (revealed && index < total - 1) {
        const x = cardX + cardW - navW - 8; drawAcademyCard(x, navY, navW, navH, false); cx.fillStyle = '#9fd8f5'; cx.font = 'bold 10px "KanjiGo UI",sans-serif';
        cx.fillText('SAU ▶', x + 21, navY + navH / 2 + 4); lecture.hitboxes.push({ x, y: navY, w: navW, h: navH, action: 'card_next' });
      }
    };

    // Portrait phones need a vertical flash-card. A desktop-style sidebar
    // leaves barely 120px for vocabulary and truncates both the meaning and
    // furigana, despite having plenty of vertical room.
    if (portraitCard) {
      const summaryH = 126, contentX = cardX + 14, contentW = cardW - 28, summaryRightX = cardX + 106;
      cx.fillStyle = '#ffd54a'; cx.font = `bold 62px ${JPFONT}`; cx.textAlign = 'center';
      cx.fillText(lecture.info.char, cardX + 55, cardY + 82); cx.textAlign = 'left';
      cx.fillStyle = '#fff'; fitText(lecture.info.meaning, summaryRightX, cardY + 37, cardW - 120, 16, true);
      if (revealed) {
        cx.fillStyle = '#9fd8f5'; cx.font = `10px ${JPFONT}`;
        fitText(`ON  ${(lecture.info.on || []).join(' · ') || '—'}`, summaryRightX, cardY + 68, cardW - 120, 10, true);
        cx.fillStyle = '#8debb3'; fitText(`KUN ${(lecture.info.kun || []).join(' · ') || '—'}`, summaryRightX, cardY + 92, cardW - 120, 10, true);
      } else {
        cx.fillStyle = '#7183a4'; cx.font = 'bold 10px "KanjiGo UI",sans-serif';
        cx.fillText('ON / KUN', summaryRightX, cardY + 69); cx.fillText('LẬT ĐỂ XEM', summaryRightX, cardY + 91);
      }
      cx.strokeStyle = '#2a527e'; cx.beginPath(); cx.moveTo(cardX + 12, cardY + summaryH); cx.lineTo(cardX + cardW - 12, cardY + summaryH); cx.stroke();

      if (!revealed) {
        cx.fillStyle = '#9fd8f5'; fitText('NHÌN CỤM TỪ', contentX, cardY + 153, contentW, 11, true);
        drawVocabularyWordFace(question, lecture.char, contentX, cardY + 211, contentW, 39);
        cx.fillStyle = '#fff'; fitText(question.mean, contentX, cardY + 247, contentW, 18, true);
        cx.fillStyle = '#a9bad8'; cx.font = `12px ${JPFONT}`;
        wrap('Tự nhớ cách đọc của cả cụm, sau đó lật thẻ để kiểm tra furigana và liên kết từng chữ.', contentX, cardY + 278, contentW, 19);
        lecture.hitboxes.push({ x: contentX, y: cardY + summaryH, w: contentW, h: navY - cardY - summaryH, action: 'card_reveal' });
      } else {
        cx.fillStyle = recap ? '#ffcb70' : '#6effa1'; cx.font = 'bold 11px "KanjiGo UI",sans-serif';
        fitText(recap ? 'RECAP · THẺ YẾU' : 'FURIGANA + CẢ CỤM', contentX, cardY + 151, contentW, 11, true);
        drawBridgeVocabulary(question, lecture.char, contentX, cardY + 164, contentW, true);
        cx.fillStyle = '#a9bad8'; cx.font = `11px ${JPFONT}`;
        wrap(recap ? 'Đọc thành tiếng một lần, chú ý chữ vàng, rồi xác nhận bằng câu hỏi ngắn.' : 'Đọc từng phần từ trái sang phải, sau đó nối lại thành cả cụm.', contentX, cardY + 271, contentW, 18);
      }
      drawCardNavigation();
      return;
    }

    const leftW = compact ? Math.min(118, cardW * .31) : Math.min(190, cardW * .28);
    cx.fillStyle = '#ffd54a'; cx.font = `bold ${compact ? 64 : 92}px ${JPFONT}`; cx.textAlign = 'center';
    cx.fillText(lecture.info.char, cardX + leftW / 2 + 8, cardY + (compact ? 88 : 118)); cx.textAlign = 'left';
    cx.fillStyle = '#fff'; cx.font = `bold ${compact ? 13 : 17}px ${JPFONT}`;
    fitText(lecture.info.meaning, cardX + 12, cardY + (compact ? 116 : 148), leftW - 8, compact ? 13 : 17, true);
    if (revealed) {
      cx.fillStyle = '#9fd8f5'; cx.font = `${compact ? 9 : 11}px ${JPFONT}`;
      wrap(`ON  ${(lecture.info.on || []).join(' · ') || '—'}`, cardX + 12, cardY + (compact ? 141 : 177), leftW - 8, compact ? 15 : 18);
      cx.fillStyle = '#8debb3';
      wrap(`KUN ${(lecture.info.kun || []).join(' · ') || '—'}`, cardX + 12, cardY + (compact ? 171 : 217), leftW - 8, compact ? 15 : 18);
    } else {
      cx.fillStyle = '#7183a4'; cx.font = `bold ${compact ? 9 : 11}px "KanjiGo UI",sans-serif`;
      cx.fillText('ON / KUN', cardX + 12, cardY + (compact ? 141 : 177));
      cx.fillText('LẬT ĐỂ XEM', cardX + 12, cardY + (compact ? 157 : 197));
    }
    cx.strokeStyle = '#2a527e'; cx.beginPath(); cx.moveTo(cardX + leftW + 10, cardY + 16); cx.lineTo(cardX + leftW + 10, cardY + cardH - 16); cx.stroke();

    const contentX = cardX + leftW + 26, contentW = cardW - leftW - 42;
    if (!revealed) {
      cx.fillStyle = '#9fd8f5'; fitText(compact ? 'NHÌN CỤM TỪ' : 'MẶT TRƯỚC · NHÌN CỤM TỪ', contentX, cardY + 34, contentW, 11, true);
      drawVocabularyWordFace(question, lecture.char, contentX, cardY + (compact ? 96 : 112), contentW, compact ? 38 : 50);
      cx.fillStyle = '#fff'; cx.font = `bold ${compact ? 16 : 21}px ${JPFONT}`; fitText(question.mean, contentX, cardY + (compact ? 135 : 158), contentW, compact ? 16 : 21, true);
      cx.fillStyle = '#a9bad8'; cx.font = `${compact ? 11 : 14}px ${JPFONT}`;
      wrap('Thử tự nhớ cách đọc của cả cụm, sau đó lật thẻ để kiểm tra furigana và liên kết từng chữ.', contentX, cardY + (compact ? 163 : 195), contentW, compact ? 18 : 22);
      cx.fillStyle = 'rgba(86,234,255,.13)'; cx.fillRect(contentX, cardY + cardH - 53, contentW, 36);
      cx.strokeStyle = '#3d9dc5'; cx.strokeRect(contentX, cardY + cardH - 53, contentW, 36);
      const revealLabel = compact ? 'CHẠM ĐỂ LẬT' : 'CHẠM / ENTER ĐỂ LẬT THẺ';
      cx.fillStyle = '#7ff7ff'; cx.textAlign = 'center'; fitText(revealLabel, contentX + contentW / 2, cardY + cardH - 30, contentW, 12, true); cx.textAlign = 'left';
      lecture.hitboxes.push({ x: contentX, y: cardY + 12, w: contentW, h: cardH - 24, action: 'card_reveal' });
    } else {
      cx.fillStyle = recap ? '#ffcb70' : '#6effa1'; cx.font = 'bold 11px "KanjiGo UI",sans-serif';
      const backLabel = recap ? (compact ? 'RECAP · THẺ YẾU' : 'RECAP · ĐỌC LẠI LIÊN KẾT')
        : (compact ? 'FURIGANA + CẢ CỤM' : 'MẶT SAU · FURIGANA + CẢ CỤM');
      fitText(backLabel, contentX, cardY + 30, contentW, 11, true);
      drawBridgeVocabulary(question, lecture.char, contentX, cardY + 43, contentW, compact);
      cx.fillStyle = '#a9bad8'; cx.font = `${compact ? 10 : 12}px ${JPFONT}`;
      wrap(recap ? 'Đọc thành tiếng một lần, chú ý chữ vàng, rồi xác nhận lại bằng câu hỏi ngắn.' : 'Mẹo: đọc từng phần từ trái sang phải, sau đó nối lại thành cả cụm.', contentX, cardY + Math.min(cardH - 35, 148), contentW, compact ? 17 : 20);
    }

    drawCardNavigation();
  }
  function vocabularyParts(q, target) {
    if (Array.isArray(q.parts) && q.parts.length) return q.parts;
    const word = String(q.word || '').replace(/\s*\([^)]*\)\s*$/, ''), index = word.indexOf(target);
    if (index < 0) return [{ text: word, reading: q.wordReading || '', meaning: q.mean || '', role: 'support' }];
    const parts = [];
    if (index > 0) parts.push({ text: word.slice(0, index), reading: '', meaning: '', role: 'support' });
    parts.push({ text: target, reading: q.answer || '', romaji: q.romaji || '', meaning: kanjiInfo(target)?.meaning || '', role: 'target' });
    if (index + target.length < word.length) parts.push({ text: word.slice(index + target.length), reading: '', meaning: '', role: 'support' });
    return parts;
  }
  function drawBridgeVocabulary(q, target, x, y, maxW, compact) {
    const parts = vocabularyParts(q, target), gap = compact ? 12 : 17;
    let size = compact ? 21 : 25, widths = [], total = Infinity;
    while (size >= 14) {
      widths = parts.map((part) => {
        cx.font = `bold ${part.role === 'target' ? size + 2 : size}px ${JPFONT}`;
        const textW = cx.measureText(part.text || '').width;
        cx.font = `${Math.max(9, size - 11)}px ${JPFONT}`;
        return Math.max(textW, cx.measureText(part.reading || '').width) + 10;
      });
      total = widths.reduce((sum, width) => sum + width, 0) + gap * Math.max(0, parts.length - 1);
      if (total <= maxW) break;
      size--;
    }
    let cursor = x;
    parts.forEach((part, i) => {
      const width = widths[i], center = cursor + width / 2, targetPart = part.role === 'target', support = part.role === 'support';
      if (i > 0) { cx.fillStyle = '#657b9e'; cx.font = 'bold 13px "KanjiGo UI",sans-serif'; cx.textAlign = 'center'; cx.fillText('+', cursor - gap / 2, y + 36); }
      if (part.role !== 'kana' && part.reading) {
        cx.fillStyle = targetPart ? '#ffe899' : '#9eeeff'; cx.font = `${Math.max(9, size - 11)}px ${JPFONT}`; cx.textAlign = 'center'; cx.fillText(part.reading, center, y + 13);
      }
      if (targetPart) {
        cx.save(); cx.shadowColor = 'rgba(255,213,74,.85)'; cx.shadowBlur = 12;
        cx.fillStyle = 'rgba(255,213,74,.18)'; cx.fillRect(cursor + 2, y + 17, width - 4, size + 9); cx.restore();
      }
      cx.fillStyle = targetPart ? '#ffe066' : support ? '#56eaff' : '#eef5ff';
      cx.font = `bold ${targetPart ? size + 2 : size}px ${JPFONT}`; cx.textAlign = 'center'; cx.fillText(part.text, center, y + 42);
      if (targetPart) { cx.fillStyle = '#ffe066'; cx.fillRect(cursor + 4, y + 46, width - 8, 2); }
      if (part.meaning) { cx.textAlign = 'left'; cx.fillStyle = targetPart ? '#e9d9a0' : '#91aac9'; cx.font = `${Math.max(8, size - 13)}px ${JPFONT}`; fitText(part.meaning, cursor + 2, y + 60, width - 4, Math.max(8, size - 13)); }
      cursor += width + gap;
    });
    cx.textAlign = 'left'; cx.fillStyle = '#fff'; cx.font = `bold ${compact ? 11 : 13}px ${JPFONT}`;
    const fullReading = q.wordReading || q.answer || '—', romaji = q.wordRomaji ? ` (${q.wordRomaji})` : '';
    const prefix = compact ? 'CẢ CỤM  ' : 'ĐỌC CẢ CỤM  ';
    cx.fillStyle = '#6effa1'; cx.font = `bold ${compact ? 9 : 10}px "KanjiGo UI",sans-serif`; cx.fillText(prefix, x, y + 80);
    const prefixW = cx.measureText(prefix).width;
    cx.fillStyle = '#fff'; cx.font = `bold ${compact ? 11 : 13}px ${JPFONT}`;
    fitText(`${fullReading}${romaji} · ${q.mean}`, x + prefixW, y + 80, maxW - prefixW, compact ? 11 : 13, true);
  }
  function renderAcademyCheck(area, bodyY, bodyH) {
    const q = lecture.q;
    if (!q) return;
    const confirming = lecture.phase === 'confirm', index = confirming ? lecture.confirmIndex : lecture.checkIndex;
    const total = confirming ? lecture.confirmTotal : 3;
    cx.fillStyle = confirming ? '#ffcb70' : '#9fd8f5'; cx.font = 'bold 13px "KanjiGo UI",sans-serif';
    cx.fillText(`${confirming ? 'XÁC NHẬN SAU RECAP' : 'MINI-CHECK'} ${index + 1}/${total}`, area.x + 28, bodyY + 32);
    const prompt = q.mode === 'm6' ? `Chọn cách đọc TOÀN TỪ 「${q.word}」` : q.mode === 'm7' ? `Chọn nghĩa TOÀN TỪ 「${q.word}」` :
      q.mode === 'm3' ? `Chọn nghĩa đúng của 「${q.target}」` : q.mode === 'm4' ? `「${q.word}」 dùng âm ON hay KUN?` : `Chọn cách đọc của 「${q.target}」 trong ${q.word}`;
    cx.fillStyle = '#fff'; fitText(prompt, area.x + 28, bodyY + 67, area.w - 56, 22, true);
    cx.fillStyle = '#ffd54a'; cx.font = `bold 34px ${JPFONT}`; fitText(q.word, area.x + 28, bodyY + 111, area.w - 56, 34, true);
    const options = q.options, gap = 12, cols = 2, bw = (area.w - 68) / cols;
    const bh = (lecture.uiScale || 1) < 1 ? 64 : 48;
    const narrow = area.w < 380;
    const optionsHeight = bh * 2 + 10, feedbackReserve = narrow ? 64 : 38;
    const maxStartY = bodyY + bodyH - optionsHeight - feedbackReserve;
    const startY = Math.max(bodyY + 116, Math.min(bodyY + 145, maxStartY));
    options.forEach((option, i) => {
      const col = i % 2, row = Math.floor(i / 2), x = area.x + 28 + col * (bw + gap), y = startY + row * (bh + 10);
      let selected = false, disabled = false;
      if (lecture.answerLocked) { selected = i === q.correctIndex; disabled = i !== q.correctIndex; }
      drawAcademyCard(x, y, bw, bh, selected, disabled);
      if (lecture.answerLocked && i === lecture.selectedIndex && i !== q.correctIndex) {
        cx.fillStyle = 'rgba(176,45,58,.38)'; cx.fillRect(x + 2, y + 2, bw - 4, bh - 4);
        cx.strokeStyle = '#ff808d'; cx.strokeRect(x + 1, y + 1, bw - 2, bh - 2);
      }
      cx.fillStyle = disabled ? '#727b91' : '#fff'; fitText(`${i + 1}) ${option}`, x + 14, y + 31, bw - 28, 18, true);
      if (!lecture.answerLocked) lecture.hitboxes.push({ x, y, w: bw, h: bh, action: 'answer', value: i });
    });
    if (lecture.feedback) {
      cx.fillStyle = lecture.feedback.startsWith('✓') ? '#6effa1' : '#ffadad';
      const feedbackY = Math.min(bodyY + bodyH - 10, startY + optionsHeight + 22);
      if (narrow) {
        cx.font = `bold 12px ${JPFONT}`;
        wrap(lecture.feedback, area.x + 28, feedbackY, area.w - 56, 18);
      } else fitText(lecture.feedback, area.x + 28, feedbackY, area.w - 56, 14, true);
    }
  }
  function drawAcademyContinue(W, H, label) {
    const w = Math.min(310, W - 48), h = (lecture.uiScale || 1) < 1 ? 64 : 44, x = (W - w) / 2, y = H - h - 22;
    cx.fillStyle = '#1d72aa'; cx.fillRect(x, y, w, h); cx.strokeStyle = '#72ddff'; cx.lineWidth = 2; cx.strokeRect(x, y, w, h);
    cx.fillStyle = '#fff'; cx.font = 'bold 14px "KanjiGo UI",sans-serif'; cx.textAlign = 'center'; cx.fillText(`${label}  ▶`, W / 2, y + h / 2 + 5); cx.textAlign = 'left';
    lecture.hitboxes.push({ x, y, w, h, action: 'continue' });
  }
  function drawAcademyLessonActions(W, H, nextLabel, backLabel) {
    const h = (lecture.uiScale || 1) < 1 ? 64 : 44, gap = 10, available = W - 48;
    const backW = Math.min(156, Math.max(104, available * .3));
    const nextW = Math.min(310, Math.max(150, available - backW - gap));
    const totalW = backW + gap + nextW, x = (W - totalW) / 2, y = H - h - 22;
    cx.fillStyle = '#213555'; cx.fillRect(x, y, backW, h); cx.strokeStyle = '#58739a'; cx.lineWidth = 2; cx.strokeRect(x, y, backW, h);
    cx.fillStyle = '#d3e1f4'; cx.font = 'bold 12px "KanjiGo UI",sans-serif'; cx.textAlign = 'center'; cx.fillText(`◀ ${backLabel}`, x + backW / 2, y + h / 2 + 5);
    const nextX = x + backW + gap; cx.fillStyle = '#1d72aa'; cx.fillRect(nextX, y, nextW, h); cx.strokeStyle = '#72ddff'; cx.strokeRect(nextX, y, nextW, h);
    cx.fillStyle = '#fff'; cx.font = 'bold 13px "KanjiGo UI",sans-serif'; cx.fillText(`${nextLabel}  ▶`, nextX + nextW / 2, y + h / 2 + 5); cx.textAlign = 'left';
    lecture.hitboxes.push({ x, y, w: backW, h, action: 'lesson_back' });
    lecture.hitboxes.push({ x: nextX, y, w: nextW, h, action: 'continue' });
  }
  function renderAcademySummary(W, H) {
    const area = academyContent(W), info = lecture.info, narrow = W < 460;
    const layoutH = W < 620 ? Math.min(H, 640) : H;
    drawAcademyCard(area.x, 104, area.w, layoutH - 145, true);
    cx.fillStyle = '#6effa1'; fitText('🎉 UNLOCK THÀNH CÔNG!', area.x + 30, 148, area.w - 60, narrow ? 21 : 27, true);
    cx.fillStyle = '#ffd54a'; cx.font = `bold ${narrow ? 76 : 92}px ${JPFONT}`; cx.fillText(info.char, area.x + 34, narrow ? 242 : 248);
    const textX = narrow ? area.x + 28 : area.x + 142, textY = narrow ? 326 : 205, textW = narrow ? area.w - 56 : area.w * .42;
    drawMonsterName(C.MONSTERS[info.monId], textX, textY, textW, narrow ? 18 : 21, { label: true });
    cx.fillStyle = '#b9c8e8'; cx.font = `${narrow ? 14 : 15}px ${JPFONT}`; wrap(`${info.meaning} đã được thêm vào KanjiDex và từ giờ có thể xuất hiện ngoài thế giới.`, textX, textY + 31, narrow ? area.w - 56 : area.w * .48, narrow ? 22 : 25);
    drawLessonMascot(info, narrow ? area.x + area.w * .52 : area.x + area.w * .62, narrow ? 160 : 126, narrow ? area.w * .42 : area.w * .34, narrow ? 130 : layoutH - 210);
    cx.fillStyle = '#9fd8f5'; cx.font = '13px "KanjiGo UI",sans-serif'; cx.fillText(`Nghi thức: ${lecture.score}/5 câu đúng`, area.x + 34, layoutH - 105);
    drawAcademyContinue(W, layoutH, 'VỀ SẢNH GIẢNG ĐƯỜNG');
  }
  function renderCapture() {
    const W = SCREEN_W, H = SCREEN_H, fieldH = H - quizPanelLayout(W, H).panelH;
    const g = cx.createRadialGradient(W / 2, fieldH * .58, 20, W / 2, fieldH * .55, Math.max(W, fieldH) * .62);
    g.addColorStop(0, '#234f70'); g.addColorStop(.48, '#162b4f'); g.addColorStop(1, '#090f25');
    cx.fillStyle = g; cx.fillRect(0, 0, W, fieldH);
    const pulse = .55 + .15 * Math.sin(performance.now() / 180), ringY = fieldH * .67;
    cx.strokeStyle = `rgba(86,234,255,${pulse})`; cx.lineWidth = 3;
    cx.beginPath(); cx.ellipse(W / 2, ringY, 155, 34, 0, 0, Math.PI * 2); cx.stroke();
    cx.strokeStyle = `rgba(255,213,74,${pulse * .65})`; cx.lineWidth = 2;
    cx.beginPath(); cx.ellipse(W / 2, ringY, 112, 23, 0, 0, Math.PI * 2); cx.stroke();
    const img = monsterImg(capture.info.monId);
    if (img) {
      const mw = Math.min(230, W * .28, fieldH * .42), mh = mw * img.height / img.width;
      const bob = Math.sin(performance.now() / 230) * 5;
      cx.save();
      if (capture.burstT > 0) cx.filter = `brightness(${1.2 + capture.burstT / 240})`;
      cx.drawImage(img, W / 2 - mw / 2, ringY - mh + bob, mw, mh); cx.restore();
      drawMonsterMeaningEffect(C.MONSTERS[capture.info.monId], W / 2, ringY + bob, mw, .9);
    }
    if (capture.burstT > 0) {
      const radius = 45 + (520 - capture.burstT) * .45;
      cx.strokeStyle = `rgba(125,247,255,${capture.burstT / 520})`; cx.lineWidth = 5;
      cx.beginPath(); cx.arc(W / 2, ringY - 80, radius, 0, Math.PI * 2); cx.stroke();
    }
    if (capture.passed && capture.catchEffectT > 0) {
      const total = Math.max(1, capture.catchEffectTotal || 1500);
      const progress = Math.max(0, Math.min(1, 1 - capture.catchEffectT / total));
      const monster = C.MONSTERS[capture.info.monId], animation = kanjiAnimation(monster);
      const [coreColor, edgeColor] = (animation && animation.colors) || ['#d7fbff', '#56eaff'];
      const ringProgress = Math.min(1, progress * 1.35), radius = 52 + ringProgress * Math.min(190, W * .25);
      cx.globalAlpha = Math.max(0, 1 - ringProgress) * .85; cx.strokeStyle = edgeColor; cx.lineWidth = 8;
      cx.beginPath(); cx.arc(W / 2, ringY - 80, radius, 0, Math.PI * 2); cx.stroke();
      cx.strokeStyle = coreColor; cx.lineWidth = 3; cx.beginPath(); cx.arc(W / 2, ringY - 80, radius * .72, 0, Math.PI * 2); cx.stroke();
      cx.globalAlpha = 1;
      drawMeaningAttackAnimation(monster, progress, W * .2, W * .8, ringY + 18, Math.min(190, fieldH * .4));
    }
    const captureCompact = W < 600, captureHudW = Math.min(W - 36, 520), captureHudH = captureCompact ? 92 : 76;
    cx.fillStyle = 'rgba(8,13,31,.9)'; cx.fillRect(18, 16, captureHudW, captureHudH);
    cx.strokeStyle = '#275b8f'; cx.lineWidth = 2; cx.strokeRect(18, 16, captureHudW, captureHudH);
    cx.fillStyle = '#fff'; cx.font = `bold 20px ${JPFONT}`; cx.fillText(`NGHI THỨC THU PHỤC 「${capture.char}」`, 32, 45);
    cx.fillStyle = '#9fd8f5'; cx.font = '12px "KanjiGo UI",sans-serif'; cx.fillText(`Lần ${capture.attempt} · Cần ${capture.needed}/5 · Sai không giới hạn`, 32, 68);
    const orbX = captureCompact ? 42 : 290, orbY = captureCompact ? 88 : 66, orbGap = captureCompact ? 27 : 30;
    for (let i = 0; i < 5; i++) {
      cx.fillStyle = i < capture.correct ? '#56eaff' : '#26334b'; cx.beginPath(); cx.arc(orbX + i * orbGap, orbY, 9, 0, Math.PI * 2); cx.fill();
      cx.strokeStyle = i < capture.correct ? '#d5fbff' : '#52617b'; cx.lineWidth = 2; cx.stroke();
    }
    cx.fillStyle = `rgba(255,213,74,.12)`; cx.font = `bold ${Math.min(180, fieldH * .34)}px ${JPFONT}`; cx.textAlign = 'center'; cx.fillText(capture.char, W / 2, fieldH * .48); cx.textAlign = 'left';
    if (capture.phase === 'fight' && capture.feedback && capture.fbT > 0) drawFeedbackBanner(capture, W, fieldH);
    drawQuizPanel(capture, W, H);
  }
  function renderPve() {
    const W = SCREEN_W, H = SCREEN_H, fieldH = H - quizPanelLayout(W, H).panelH;
    drawBattleBackground('grass', W, fieldH);
    const trainer = pve.mode === 'trainer' ? TRAINER_BY_ID.get(pve.trainerId) : null;
    const examTitle = pve.mode === 'gym' ? `👑 BOSS GYM ${pve.tier}` : trainer ? `${trainer.icon} ${trainer.name} · ${trainer.theme}` : '⛩ KỲ THI JLPT MINI';
    const headerW = Math.min(W - 28, 350);
    cx.fillStyle = 'rgba(6,18,42,.82)'; cx.fillRect(14, 9, headerW, 56);
    cx.strokeStyle = 'rgba(118,204,255,.72)'; cx.lineWidth = 1; cx.strokeRect(14, 9, headerW, 56);
    cx.save(); cx.shadowColor = 'rgba(0,0,0,.95)'; cx.shadowBlur = 6;
    cx.fillStyle = '#f7fbff'; cx.strokeStyle = 'rgba(5,17,38,.96)'; cx.lineWidth = 4; cx.font = `bold 20px ${JPFONT}`;
    if (pve.mode === 'gym') cx.strokeText(examTitle, 24, 34);
    fitText(examTitle, 24, 34, headerW - 20, 20, true);
    cx.fillStyle = pve.phase === 'fight' ? '#ffe879' : '#e5eefc'; cx.strokeStyle = 'rgba(5,17,38,.96)'; cx.lineWidth = 3;
    cx.font = 'bold 15px "KanjiGo UI",sans-serif';
    const questionStatus = `Câu ${Math.min(pve.index + 1, pve.total)}/${pve.total} • Đúng ${pve.correct}`;
    cx.strokeText(questionStatus, 24, 58); cx.fillText(questionStatus, 24, 58); cx.restore();
    if (pve.phase === 'fight' && pve.mode === 'gym') {
      drawPveExamHud(W);
      const shakePower = pve.arenaShakeT > 0 ? Math.min(9, pve.arenaShakeT / 30) : 0;
      cx.save();
      if (shakePower) cx.translate(Math.sin(pve.arenaShakeT * .21) * shakePower, Math.cos(pve.arenaShakeT * .17) * shakePower * .45);
      drawPveDuel(W, fieldH);
      cx.restore();
    } else if (trainer && (pve.phase === 'fight' || pve.phase === 'end')) {
      drawPveTrainerTeam(pve.pool, W, fieldH);
      const shakePower = pve.arenaShakeT > 0 ? Math.min(9, pve.arenaShakeT / 30) : 0;
      cx.save();
      if (shakePower) cx.translate(Math.sin(pve.arenaShakeT * .21) * shakePower, Math.cos(pve.arenaShakeT * .17) * shakePower * .45);
      drawPveDuel(W, fieldH);
      drawPveTrainerEffects(trainer, W, fieldH);
      cx.restore();
      if (pve.phase === 'fight' && pve.trainerIntroT > 0) drawPveTrainerIntro(trainer, W, fieldH);
    }
    if (pve.phase === 'end' && pveResult) {
      const passColor = pveResult.passed ? '#6effa1' : '#ff8a8a';
      cx.fillStyle = passColor; cx.font = `bold ${Math.min(54, Math.max(34, W * .065))}px ${JPFONT}`;
      cx.fillText(pveResult.passed ? 'PASS ✓' : pveResult.ko ? 'KO · CHƯA ĐẠT' : 'CHƯA ĐẠT', 34, 132);
      cx.fillStyle = '#fff'; cx.font = `bold 18px ${JPFONT}`; cx.fillText(`${pveResult.correct}/${pveResult.total} · ${Math.round(pveResult.ratio * 100)}% · Hạng ${pveResult.grade}`, 36, 164);
      if (pveResult.badgeAwarded) {
        const badgeSize = Math.max(58, Math.min(100, fieldH * .28));
        drawBadgeMedallion(pveResult.badgeAwarded, W - badgeSize, 125, badgeSize, true, true);
        cx.fillStyle = '#fff1a8'; cx.font = `bold 15px ${JPFONT}`; cx.textAlign = 'right';
        const unlockTier = C.PROGRESSION.gym[pve.tier] && C.PROGRESSION.gym[pve.tier].unlocks;
        cx.fillText(`HUY HIỆU ${pveResult.badgeAwarded}${unlockTier ? ` · ${unlockTier} ĐÃ MỞ` : ''}`, W - 30, 196); cx.textAlign = 'left';
      } else if (pve.mode === 'gym') {
        cx.fillStyle = '#cbd8ed'; cx.font = `14px ${JPFONT}`; cx.fillText(`Cần ${Math.ceil(pve.passRatio * 100)}% để nhận huy hiệu.`, 36, 194);
      }
    }
    if (pve.phase === 'fight' && pve.feedback && pve.fbT > 0) drawFeedbackBanner(pve, W, fieldH);
    drawQuizPanel(pve, W, H);
  }
  function drawPveExamHud(W) {
    const compact = W < 600, pad = 24, meterY = compact ? 72 : 70;
    const meterW = compact ? W - pad * 2 : Math.min(520, W * .58), hpW = compact ? meterW : Math.min(250, W - meterW - pad * 3);
    const hpX = compact ? pad : W - pad - hpW, hpY = compact ? meterY + 76 : meterY;
    const shake = pve.rankShockT > 0 ? Math.sin(pve.rankShockT / 24) * Math.min(10, pve.rankShockT / 45) : 0;
    const meterX = pad + shake, barY = meterY + 16, barH = 18;
    cx.fillStyle = 'rgba(6,18,42,.86)'; cx.fillRect(meterX - 8, meterY - 7, meterW + 16, 70);
    cx.strokeStyle = 'rgba(118,204,255,.68)'; cx.lineWidth = 1; cx.strokeRect(meterX - 8, meterY - 7, meterW + 16, 70);
    const bands = [
      { grade: 'D', start: 0, end: .25, color: '#8a94a7' },
      { grade: 'C', start: .25, end: .5, color: '#63b8ef' },
      { grade: 'B', start: .5, end: .8, color: '#a986ed' },
      { grade: 'A', start: .8, end: 1, color: '#ffd54a' },
    ];
    cx.fillStyle = '#f4f8ff'; cx.font = 'bold 10px "KanjiGo UI",sans-serif';
    cx.fillText(`TIẾN ĐỘ ${gymGrade(pve.rankTarget, pve.passRatio)} · ${pve.correct}/${pve.total} · PASS ${Math.round(pve.passRatio * 100)}%`, meterX, meterY + 9);
    for (const band of bands) {
      const x = meterX + meterW * band.start, width = meterW * (band.end - band.start);
      cx.fillStyle = 'rgba(13,23,43,.92)'; cx.fillRect(x, barY, width, barH);
      const filled = Math.max(0, Math.min(1, (pve.rankDisplay - band.start) / Math.max(.001, band.end - band.start)));
      if (filled > 0) { cx.fillStyle = band.color; cx.fillRect(x, barY, width * filled, barH); }
      cx.strokeStyle = '#63738d'; cx.lineWidth = 1; cx.strokeRect(x, barY, width, barH);
      cx.fillStyle = filled >= .58 && band.grade !== 'D' ? '#172039' : '#fff'; cx.font = 'bold 10px "KanjiGo UI",sans-serif'; cx.textAlign = 'center';
      cx.fillText(band.grade, x + width / 2, barY + 13); cx.textAlign = 'left';
    }
    const passX = meterX + meterW * pve.passRatio, passedLine = pve.rankDisplay >= pve.passRatio;
    cx.save(); cx.shadowColor = passedLine ? '#67ffad' : 'rgba(201,255,223,.7)'; cx.shadowBlur = passedLine ? 10 : 5;
    cx.strokeStyle = passedLine ? '#67ffad' : '#d8ffe8'; cx.lineWidth = 3;
    cx.beginPath(); cx.moveTo(passX, barY - 5); cx.lineTo(passX, barY + barH + 28); cx.stroke();
    cx.fillStyle = passedLine ? '#8affbd' : '#e2ffed'; cx.font = 'bold 9px "KanjiGo UI",sans-serif'; cx.textAlign = 'center';
    cx.fillText(`${Math.round(pve.passRatio * 100)}% PASS`, passX, barY - 7); cx.restore();
    drawBadgeMedallion(pve.tier, passX, barY + barH + 18, 27, passedLine, true);
    cx.fillStyle = pve.rankDisplay >= 1 ? '#fff3a3' : '#8290a8'; cx.font = 'bold 11px "KanjiGo UI",sans-serif'; cx.textAlign = 'right';
    cx.fillText('S', meterX + meterW, barY - 3); cx.textAlign = 'left';
    cx.strokeStyle = pve.rankDisplay >= 1 ? '#fff3a3' : '#8290a8'; cx.lineWidth = 2;
    cx.beginPath(); cx.moveTo(meterX + meterW, barY - 1); cx.lineTo(meterX + meterW, barY + barH + 2); cx.stroke();
    if (pve.rankGainT > 0) {
      cx.save(); cx.globalAlpha = Math.min(1, pve.rankGainT / 220); cx.strokeStyle = '#fff5a8'; cx.lineWidth = 3; cx.strokeRect(meterX - 2, barY - 2, meterW + 4, barH + 4); cx.restore();
    }
    const hpRatio = pve.examHp / Math.max(1, pve.examMaxHp), hpColor = hpRatio > .66 ? '#56df8b' : hpRatio > .33 ? '#ffd54a' : '#ff6969';
    cx.fillStyle = 'rgba(6,18,42,.86)'; cx.fillRect(hpX - 8, hpY - 7, hpW + 16, 48);
    cx.strokeStyle = 'rgba(118,204,255,.68)'; cx.lineWidth = 1; cx.strokeRect(hpX - 8, hpY - 7, hpW + 16, 48);
    cx.fillStyle = '#dce8ff'; cx.font = 'bold 10px "KanjiGo UI",sans-serif'; cx.fillText(`HP PET · ${pve.examHp}/${pve.examMaxHp}`, hpX, hpY + 9);
    cx.fillStyle = 'rgba(13,23,43,.92)'; cx.fillRect(hpX, hpY + 16, hpW, barH);
    cx.fillStyle = hpColor; cx.fillRect(hpX, hpY + 16, hpW * hpRatio, barH);
    cx.strokeStyle = pve.playerHitT > 0 ? '#fff' : '#63738d'; cx.lineWidth = pve.playerHitT > 0 ? 3 : 1; cx.strokeRect(hpX, hpY + 16, hpW, barH);
    for (let i = 1; i < pve.examMaxHp; i++) { const x = hpX + hpW * i / pve.examMaxHp; cx.strokeStyle = 'rgba(255,255,255,.5)'; cx.beginPath(); cx.moveTo(x, hpY + 16); cx.lineTo(x, hpY + 16 + barH); cx.stroke(); }
  }
  function renderGymMenu() {
    const W = SCREEN_W, H = SCREEN_H, compact = W < 620, pad = compact ? 18 : 34;
    drawBattleBackground('grass', W, H);
    cx.fillStyle = 'rgba(7,14,35,.78)'; cx.fillRect(0, 0, W, H);
    cx.fillStyle = '#fff'; cx.font = `bold ${compact ? 25 : 34}px ${JPFONT}`; cx.textAlign = 'center';
    cx.fillText('JLPT GYM', W / 2, compact ? 52 : 66);
    cx.fillStyle = '#bcd0ec'; cx.font = `${compact ? 12 : 15}px "KanjiGo UI",sans-serif`;
    cx.fillText('Chọn bài test hoặc vào lại bài đã PASS để tự ôn', W / 2, compact ? 76 : 94);
    const options = gymMenu.options, gap = compact ? 12 : 18;
    const cardW = compact ? W - pad * 2 : Math.min(360, (W - pad * 2 - gap * Math.max(0, options.length - 1)) / Math.max(1, options.length));
    const cardH = compact ? Math.min(150, (H - 150 - gap * Math.max(0, options.length - 1)) / Math.max(1, options.length)) : Math.min(250, H - 190);
    const totalW = compact ? cardW : cardW * options.length + gap * Math.max(0, options.length - 1);
    const startX = compact ? pad : (W - totalW) / 2, startY = compact ? 100 : 126;
    gymMenu.hitboxes = [];
    options.forEach((tier, index) => {
      const exam = gymEligibility(tier), x = compact ? startX : startX + index * (cardW + gap), y = compact ? startY + index * (cardH + gap) : startY;
      const selected = index === gymMenu.selected;
      cx.fillStyle = selected ? 'rgba(27,64,91,.96)' : 'rgba(14,27,52,.94)'; cx.fillRect(x, y, cardW, cardH);
      cx.strokeStyle = exam.earned ? '#ffd54a' : exam.ready ? '#65efb9' : selected ? '#6cc0ff' : '#435674'; cx.lineWidth = selected ? 3 : 2; cx.strokeRect(x, y, cardW, cardH);
      const badgeSize = Math.max(48, Math.min(compact ? 66 : 90, cardH * .43));
      drawBadgeMedallion(tier, x + cardW / 2, y + 18 + badgeSize / 2, badgeSize, exam.earned, exam.ready);
      cx.textAlign = 'center'; cx.fillStyle = '#fff'; cx.font = `bold ${compact ? 17 : 22}px ${JPFONT}`; cx.fillText(`TEST ${tier}`, x + cardW / 2, y + badgeSize + 39);
      let status;
      if (exam.earned) status = 'PASS ✓ · ÔN LẠI';
      else if (!exam.badgeReady) status = `CẦN PASS ${exam.requiredBadge}`;
      else if (!exam.prerequisiteReady) status = `N5 ${exam.prerequisite.captured}/${exam.prerequisite.total} · CẦN ĐỦ`;
      else if (exam.ready) status = 'SẴN SÀNG THI';
      else status = `Bắt ${exam.captured}/${exam.requiredCaptured} · Lv${exam.requiredLevel}+ ${exam.atLevel}/${exam.requiredAtLevel}`;
      cx.fillStyle = exam.earned ? '#ffe58a' : exam.ready ? '#7ff0c5' : '#aebbd0'; cx.font = `bold ${compact ? 11 : 13}px "KanjiGo UI",sans-serif`;
      fitText(`${index + 1}. ${status}`, x + cardW / 2, y + cardH - 10, cardW - 20, compact ? 11 : 13, true);
      const history = learning.gymHistory[tier];
      if (history && history.attempts) {
        cx.fillStyle = '#d9e6fa';
        fitText(gymBestLabel(history), x + cardW / 2, y + cardH - 29, cardW - 20, compact ? 9 : 11, true);
      }
      cx.textAlign = 'left'; gymMenu.hitboxes.push({ action: 'tier', tier, index, x, y, w: cardW, h: cardH });
    });
    cx.fillStyle = '#aabbd4'; cx.font = '12px "KanjiGo UI",sans-serif'; cx.textAlign = 'center';
    cx.fillText('↑↓ để chọn · Enter để bắt đầu · Esc để đóng', W / 2, H - 28); cx.textAlign = 'left';
  }
  function drawPveDuel(W, fieldH) {
    const target = pve.q && pve.q.target, info = kanjiInfo(target), enemy = info && C.MONSTERS[info.monId];
    const pet = C.MONSTERS[currentPetId]; if (!target || !enemy || !pet) return;
    const stageW = Math.min(W, 980), stageX = (W - stageW) / 2, baseY = fieldH - Math.max(24, fieldH * .08);
    const actorScale = Math.max(.45, Math.min(1, stageW / 900, fieldH / 410));
    const petLevel = ensureMastery(pet.kanji).level, enemyLevel = ensureMastery(target).level;
    const petW = 142 * actorScale * battleLevelScale(petLevel);
    const enemyW = Math.min(205, enemy.drawW * 1.05) * actorScale * battleLevelScale(enemyLevel);
    const petCenter = stageX + stageW * .24, enemyCenter = stageX + stageW * .76;
    const petP = pve.petAttackT > 0 ? 1 - pve.petAttackT / (pve.petAttackTotal || 520) : 0;
    const enemyP = pve.enemyAttackT > 0 ? 1 - pve.enemyAttackT / (pve.enemyAttackTotal || 600) : 0;
    const entranceP = 1 - Math.max(0, pve.entranceT) / (pve.entranceTotal || 520);
    const petLunge = Math.sin(Math.max(0, Math.min(1, petP)) * Math.PI) * Math.min(115, stageW * .14);
    const enemyLunge = Math.sin(Math.max(0, Math.min(1, enemyP)) * Math.PI) * Math.min(115, stageW * .14);
    const petRecoil = pve.playerHitT > 0 ? -Math.abs(Math.sin(pve.playerHitT / 22)) * 16 : 0;
    const enemyRecoil = pve.enemyHitT > 0 ? Math.sin(pve.enemyHitT / 17) * 9 : 0;
    const enemyX = enemyCenter + (1 - entranceP) * Math.min(180, stageW * .2) - enemyLunge + enemyRecoil;
    const jumpY = Math.sin(Math.max(0, Math.min(1, entranceP)) * Math.PI) * Math.min(58, fieldH * .18);
    const clock = performance.now(), idle = Math.sin(clock / 260) * 3;
    const trainerFight = pve.mode === 'trainer', resultWin = pve.phase === 'end' && pveResult && pveResult.passed;
    const resultLose = pve.phase === 'end' && pveResult && !pveResult.passed;
    const petHop = Math.sin(Math.max(0, Math.min(1, petP)) * Math.PI) * 18 + (resultWin ? Math.abs(Math.sin(clock / 170)) * 13 : 0);
    const enemyHop = Math.sin(Math.max(0, Math.min(1, enemyP)) * Math.PI) * 16 + (resultLose ? Math.abs(Math.sin(clock / 190)) * 10 : 0);
    const petSink = resultLose ? petW * .14 : 0, enemySink = resultWin ? enemyW * .16 : 0;
    cx.fillStyle = 'rgba(0,0,0,.22)'; cx.beginPath(); cx.ellipse(petCenter, baseY + 3, petW * .45, petW * .1, 0, 0, Math.PI * 2); cx.fill();
    cx.beginPath(); cx.ellipse(enemyCenter, baseY + 3, enemyW * .45, enemyW * .1, 0, 0, Math.PI * 2); cx.fill();
    const petImage = monsterImg(currentPetId), petX = petCenter + petLunge + petRecoil;
    if (petImage) {
      const petH = petW * petImage.height / petImage.width;
      cx.save(); if (pve.playerHitT > 0) cx.filter = 'brightness(2) saturate(.25)';
      if (resultLose) cx.globalAlpha = .7;
      cx.drawImage(petImage, petX - petW / 2, baseY - petH + idle - petHop + petSink, petW, petH); cx.restore();
      drawMonsterMeaningEffect(pet, petX, baseY + idle - petHop + petSink, petW, resultLose ? .45 : .85);
    } else drawPveMascotPlaceholder(pet.kanji, petX, baseY, petW);
    const enemyImage = monsterImg(info.monId), enemyH = enemyW * enemy.drawH / enemy.drawW;
    if (enemyImage) {
      cx.save(); if (pve.enemyHitT > 0) cx.filter = 'brightness(2) saturate(.25)';
      if (resultWin) cx.globalAlpha = .65;
      cx.drawImage(enemyImage, enemyX - enemyW / 2, baseY - enemyH - jumpY - idle - enemyHop + enemySink, enemyW, enemyH); cx.restore();
    } else drawPveMascotPlaceholder(target, enemyX, baseY - jumpY, enemyW);
    drawMonsterMeaningEffect(enemy, enemyX, baseY - jumpY - idle - enemyHop + enemySink, enemyW, resultWin ? .4 : .85);
    if (pve.petAttackT > 0) drawMeaningAttackAnimation(pet, petP, petCenter, enemyCenter, baseY, Math.max(135, petW * 1.15));
    if (pve.enemyAttackT > 0) drawMeaningAttackAnimation(enemy, enemyP, enemyCenter, petCenter, baseY, Math.max(135, enemyW * 1.15));
    cx.textAlign = 'center'; cx.font = 'bold 12px "KanjiGo UI",sans-serif';
    cx.fillStyle = '#bafbd0'; cx.fillText(`PET「${pet.kanji}」Lv.${petLevel}`, petCenter, baseY + 20);
    cx.fillStyle = '#ffd98a'; cx.fillText(`${trainerFight ? 'ĐỐI THỦ' : 'CÂU HỎI'}「${target}」Lv.${enemyLevel}`, enemyCenter, baseY + 20); cx.textAlign = 'left';
    const enemyBarW = Math.min(120, stageW * .18), enemyBarX = enemyCenter - enemyBarW / 2, enemyBarY = baseY + 27;
    cx.fillStyle = '#301d27'; cx.fillRect(enemyBarX, enemyBarY, enemyBarW, 5);
    cx.fillStyle = '#ef5b67'; cx.fillRect(enemyBarX, enemyBarY, enemyBarW * pve.enemyHp, 5);
  }
  function drawPveMascotPlaceholder(char, centerX, baseY, size) {
    const radius = Math.max(28, size * .32);
    cx.fillStyle = 'rgba(11,16,48,.82)'; cx.beginPath(); cx.arc(centerX, baseY - radius, radius, 0, Math.PI * 2); cx.fill();
    cx.strokeStyle = '#6cc0ff'; cx.lineWidth = 2; cx.stroke();
    cx.fillStyle = '#ffd54a'; cx.font = `bold ${Math.round(radius)}px ${JPFONT}`; cx.textAlign = 'center'; cx.fillText(char, centerX, baseY - radius * .68); cx.textAlign = 'left';
  }
  function drawPveTrainerTeam(team, W, fieldH) {
    const members = Array.isArray(team) ? team : [];
    if (!members.length) return;
    const compact = W < 720, slot = compact ? 27 : 44, gap = compact ? 5 : 7;
    const totalW = members.length * slot + (members.length - 1) * gap;
    const startX = compact ? W - totalW - 16 : W - totalW - 22, y = compact ? 72 : 14;
    cx.fillStyle = 'rgba(6,18,42,.84)'; cx.fillRect(startX - 9, y - 6, totalW + 18, slot + (compact ? 12 : 23));
    cx.strokeStyle = 'rgba(255,190,91,.62)'; cx.lineWidth = 1; cx.strokeRect(startX - 9, y - 6, totalW + 18, slot + (compact ? 12 : 23));
    members.forEach((char, index) => {
      const info = kanjiInfo(char), img = info && monsterImg(info.monId), x = startX + index * (slot + gap);
      const active = pve.q && pve.q.target === char;
      cx.fillStyle = active ? 'rgba(120,72,20,.92)' : 'rgba(17,31,55,.94)'; cx.fillRect(x, y, slot, slot);
      cx.strokeStyle = active ? '#ffd769' : '#4c607e'; cx.lineWidth = active ? 3 : 1; cx.strokeRect(x, y, slot, slot);
      if (!compact && img) {
        const ratio = img.height / img.width, drawH = Math.min(slot - 5, (slot - 5) * ratio);
        cx.drawImage(img, x + 3, y + slot - drawH - 2, slot - 6, drawH);
      } else {
        cx.fillStyle = active ? '#fff0a5' : '#b8c6dc'; cx.font = `bold ${compact ? 14 : 19}px ${JPFONT}`; cx.textAlign = 'center';
        cx.fillText(char, x + slot / 2, y + slot * .67); cx.textAlign = 'left';
      }
      if (active) { cx.fillStyle = '#ffe17b'; cx.fillRect(x + 4, y + slot - 4, slot - 8, 2); }
    });
    if (!compact) {
      cx.fillStyle = '#ffd98a'; cx.font = 'bold 9px "KanjiGo UI",sans-serif'; cx.textAlign = 'right';
      cx.fillText(`ĐỘI TRAINER · COMBO x${pve.combo}`, startX + totalW, y + slot + 15); cx.textAlign = 'left';
    }
  }
  function drawPveTrainerIntro(trainer, W, fieldH) {
    const remaining = Math.max(0, pve.trainerIntroT), total = Math.max(1, pve.trainerIntroTotal || 1200);
    const progress = 1 - remaining / total, fade = Math.min(1, remaining / 220, progress / .16);
    cx.save(); cx.globalAlpha = Math.max(0, fade);
    cx.fillStyle = 'rgba(5,12,29,.54)'; cx.fillRect(0, fieldH * .28, W, fieldH * .34);
    const centerY = fieldH * .47, slide = Math.max(0, 1 - progress * 3) * Math.min(170, W * .18);
    cx.textAlign = 'center'; cx.shadowColor = '#ffb84d'; cx.shadowBlur = 18;
    cx.fillStyle = '#fff0a5'; cx.font = `bold ${Math.max(34, Math.min(72, W * .075))}px ${JPFONT}`;
    cx.fillText('VS', W / 2, centerY + 12);
    cx.shadowBlur = 0; cx.font = `bold ${Math.max(14, Math.min(23, W * .026))}px ${JPFONT}`;
    cx.fillStyle = '#bafbd0'; cx.fillText('PET CỦA BẠN', W * .27 - slide, centerY + 52);
    cx.fillStyle = '#ffd98a'; cx.fillText(`${trainer.icon} ${trainer.name}`, W * .73 + slide, centerY + 52);
    cx.restore(); cx.textAlign = 'left';
  }
  function drawPveTrainerEffects(trainer, W, fieldH) {
    const stageW = Math.min(W, 980), stageX = (W - stageW) / 2, baseY = fieldH - Math.max(24, fieldH * .08);
    const petCenter = stageX + stageW * .24, enemyCenter = stageX + stageW * .76;
    const attackingRight = pve.petAttackT > 0, attackingLeft = pve.enemyAttackT > 0;
    if (attackingRight || attackingLeft) {
      const progress = attackingRight ? 1 - pve.petAttackT / Math.max(1, pve.petAttackTotal) : 1 - pve.enemyAttackT / Math.max(1, pve.enemyAttackTotal);
      const direction = attackingRight ? 1 : -1, origin = attackingRight ? petCenter : enemyCenter;
      cx.save(); cx.globalAlpha = Math.sin(Math.max(0, Math.min(1, progress)) * Math.PI) * .55;
      cx.strokeStyle = attackingRight ? '#8fffe0' : '#ffb06b'; cx.lineWidth = 3;
      for (let i = 0; i < 7; i++) {
        const y = baseY - 35 - i * 14, length = 28 + (i % 3) * 16;
        cx.beginPath(); cx.moveTo(origin - direction * (30 + i * 7), y); cx.lineTo(origin + direction * length, y - direction * 5); cx.stroke();
      }
      cx.restore();
    }
    if (pve.impactT > 0 && pve.impactSide) {
      const life = pve.impactT / Math.max(1, pve.impactTotal || 400), x = pve.impactSide === 'enemy' ? enemyCenter : petCenter;
      const y = baseY - Math.min(100, fieldH * .26), radius = 20 + (1 - life) * 58;
      cx.save(); cx.globalAlpha = Math.min(1, life * 1.8); cx.translate(x, y); cx.rotate((1 - life) * .7);
      cx.strokeStyle = pve.impactSide === 'enemy' ? '#fff09a' : '#ff9b91'; cx.lineWidth = 5;
      cx.beginPath();
      for (let i = 0; i < 12; i++) {
        const angle = i * Math.PI / 6, inner = i % 2 ? radius * .28 : radius * .68;
        const px = Math.cos(angle) * inner, py = Math.sin(angle) * inner;
        i ? cx.lineTo(px, py) : cx.moveTo(px, py);
      }
      cx.closePath(); cx.stroke();
      cx.lineWidth = 3;
      for (const angle of [-.72, -.18, .34]) { cx.beginPath(); cx.moveTo(-radius * .7, angle * radius); cx.lineTo(radius * .72, angle * radius - 18); cx.stroke(); }
      cx.restore();
    }
    const motion = Math.max(pve.petAttackT / Math.max(1, pve.petAttackTotal || 1), pve.enemyAttackT / Math.max(1, pve.enemyAttackTotal || 1));
    if (motion > 0) {
      cx.save(); cx.globalAlpha = Math.min(.55, motion);
      cx.fillStyle = '#e8d5a6';
      for (let i = 0; i < 6; i++) {
        const sideX = pve.petAttackT > 0 ? petCenter : enemyCenter, phase = (i + 1) / 7;
        cx.beginPath(); cx.arc(sideX + (i - 2.5) * 11, baseY - 2 - Math.sin(phase * Math.PI) * 12, 3 + (i % 2) * 2, 0, Math.PI * 2); cx.fill();
      }
      cx.restore();
    }
  }

  // Banner feedback: hộp nền, canh giữa, nằm sát mép trên panel -> không chồng chữ.
  function drawFeedbackBanner(b, W, fieldH) {
    const txt = b.feedback.text;
    const fadeMs = Math.max(1, Number(b.feedback.fadeMs) || 1);
    const alpha = Math.max(0, Math.min(1, Number(b.fbT) / fadeMs));
    cx.save(); cx.globalAlpha = alpha;
    cx.font = `15px ${JPFONT}`;
    const tw = Math.min(W - 40, cx.measureText(txt).width + 32);
    const bx = (W - tw) / 2, by = fieldH - 40, bh = 30;
    cx.fillStyle = b.feedback.good ? 'rgba(18,70,40,.92)' : 'rgba(80,20,24,.92)';
    cx.fillRect(bx, by, tw, bh);
    cx.strokeStyle = b.feedback.good ? '#6effa1' : '#ff8a8a'; cx.lineWidth = 2; cx.strokeRect(bx, by, tw, bh);
    cx.fillStyle = b.feedback.good ? '#b6ffcf' : '#ffc9c9';
    cx.textAlign = 'center'; cx.fillText(txt, W / 2, by + 20); cx.textAlign = 'left';
    cx.restore();
  }

  // Overlay choáng: dấu 😵 + đồng hồ đếm ngược ở giữa sân đấu.
  function drawStunOverlay(b, W, fieldH) {
    const s = (b.stun / 1000).toFixed(1);
    const pulse = 0.55 + 0.35 * Math.sin(Date.now() / 120);
    cx.fillStyle = `rgba(120,20,24,${0.18 * pulse})`; cx.fillRect(0, 0, W, fieldH);
    cx.textAlign = 'center';
    cx.fillStyle = `rgba(255,120,120,${0.85})`; cx.font = `bold 30px ${JPFONT}`;
    cx.fillText(`😵 CHOÁNG ${s}s`, W / 2, fieldH / 2);
    cx.fillStyle = '#ffd7d7'; cx.font = '13px "KanjiGo UI",sans-serif';
    cx.fillText('Chờ hết choáng mới trả lời tiếp — đọc kỹ đáp án đúng!', W / 2, fieldH / 2 + 24);
    cx.textAlign = 'left';
  }
  function drawPetMastery(kanji, x, y, w = 260, card = false) {
    const s = ensureMastery(kanji);
    const isNarrow = (card ? w - 16 : w) < 220;
    let titleY = y - 2;
    let barY = y + 4;
    let statsY1 = y + 20;
    let statsY2 = y + 34;
    if (card) {
      const cardH = isNarrow ? 60 : 50;
      cx.fillStyle = 'rgba(11,16,32,.88)'; cx.fillRect(x, y, w, cardH);
      cx.strokeStyle = '#16558f'; cx.lineWidth = 1; cx.strokeRect(x, y, w, cardH);
      x += 8; w -= 16;

      titleY = y + 16;
      barY = y + 20;
      statsY1 = isNarrow ? y + 39 : y + 41;
      statsY2 = y + 51;
    }
    cx.fillStyle = '#cde'; cx.font = '12px "KanjiGo UI",sans-serif';
    fitText(`📚 「${kanji}」  Lv.${s.level}/${C.KLEVEL.maxLevel} ${levelLabel(s.level)}`, x, titleY, w, 12);
    const bx = x, by = barY;
    cx.fillStyle = '#333'; cx.fillRect(bx, by, w, 7);
    const need = expToNext(kanji), progress = s.level >= C.KLEVEL.maxLevel ? 1 : expInLevel(kanji) / need;
    const r = Math.max(0, Math.min(1, progress));
    cx.fillStyle = '#6cc0ff'; cx.fillRect(bx, by, w * r, 7);
    const mpText = s.level >= C.KLEVEL.maxLevel ? 'MP MASTERED' : `MP ${expInLevel(kanji)}/${need}`;
    cx.fillStyle = '#9ab'; cx.font = '10px "KanjiGo UI",sans-serif';
    if (isNarrow) fitText(mpText, bx, statsY1, w, 10);
    else cx.fillText(mpText, bx + Math.max(0, w - 110), statsY1);
    cx.fillStyle = s.recall > 70 ? '#6effa1' : s.recall >= 30 ? '#ffd54a' : '#ff7777';
    fitText(`Recall ${s.recall}% · 🔥${s.winStreak}`, bx, isNarrow ? statsY2 : statsY1, Math.min(140, w), 10);
  }
  function quizPresentation(q, compact = false) {
    if (q.mode === 'm13') return {
      instruction: compact ? 'Điền TỪ GHÉP vào câu:' : 'Chọn từ ghép Kanji phù hợp với chỗ trống:',
      prompt: q.clozeSentence || q.sentence || q.word,
      support: `(${q.sentenceMeaning || q.mean})`,
    };
    if (q.mode === 'm14') return {
      instruction: compact ? 'Chọn mặt chữ Kanji:' : 'Cách đọc này thuộc từ Kanji nào?',
      prompt: `「${q.wordReading || q.answer}」`,
      support: 'Nhớ lại mặt chữ thay vì vị trí của đáp án.',
    };
    if (q.mode === 'm15') return {
      instruction: compact ? 'Chọn từ Kanji theo nghĩa:' : 'Chọn từ Kanji tương ứng với nghĩa:',
      prompt: `“${q.mean}”`,
      support: q.wordReading ? `Gợi ý sau khi chọn: cách đọc ${q.wordReading}` : 'Nhớ lại mặt chữ của từ.',
    };
    if (q.mode === 'm11') return {
      instruction: compact ? 'Đọc TỪ GHÉP trong câu:' : 'Chọn cách đọc của TOÀN BỘ từ ghép trong câu:',
      prompt: q.sentence || q.word,
      support: `(${q.sentenceMeaning || q.mean}) · từ cần đọc: 「${q.word}」`,
    };
    if (q.mode === 'm12') return {
      instruction: compact ? 'Chọn TỪ GHÉP Kanji:' : 'Chọn từ ghép Kanji đúng cho phần kana trong câu:',
      prompt: q.sentenceReading || q.wordReading || q.word,
      support: `(${q.sentenceMeaning || q.mean}) · cách đọc cần đổi: 「${q.targetReading || ''}」`,
    };
    if (q.mode === 'm8') return {
      instruction: compact ? 'Đọc KANJI trong câu:' : 'Chọn cách đọc của KANJI được nhấn trong câu:',
      prompt: q.sentence || q.word,
      support: `(${q.sentenceMeaning || q.mean}) · chữ cần đọc: 「${q.target}」`,
    };
    if (q.mode === 'm9') return {
      instruction: compact ? 'Chọn KANJI trong câu:' : 'Chọn KANJI đúng cho phần cách đọc trong câu:',
      prompt: q.sentenceReading || q.wordReading || q.word,
      support: `(${q.sentenceMeaning || q.mean}) · cách đọc cần đổi: 「${q.targetReading || ''}」`,
    };
    if (q.mode === 'm10') return {
      instruction: compact ? 'Chọn nghĩa của từ:' : 'Chọn nghĩa đúng của từ/cụm có furigana:',
      prompt: `${q.word}（${q.wordReading || '—'}）`,
      support: 'Dựa vào mặt chữ và cách đọc để chọn nghĩa phù hợp.',
    };
    const instruction = q.mode === 'm2' ? (compact ? 'Chọn KANJI:' : 'Chọn KANJI đúng theo nghĩa:') : q.mode === 'm3' ? (compact ? 'Chọn nghĩa:' : 'Chọn nghĩa đúng của KANJI:') :
      q.mode === 'm4' ? 'Chữ này trong từ đọc theo âm ON hay KUN?' : q.mode === 'm5' ? `Từ nào chứa chữ 「${q.target}」?` :
      q.mode === 'm6' ? 'Chọn cách đọc của TOÀN BỘ từ:' : q.mode === 'm7' ? 'Chọn nghĩa của TOÀN BỘ từ:' : 'Chọn đúng cách đọc (phím 1–4 hoặc chạm nút):';
    const prompt = q.mode === 'm3' ? q.target : q.mode === 'm2' ? q.mean : q.word;
    const support = q.mode === 'm3' ? `Chọn nghĩa của 「${q.target}」` : q.mode === 'm4' ? `「${q.word}」 — ${q.mean}` : q.mode === 'm5' ? `Chữ cần tìm: 「${q.target}」` :
      q.mode === 'm6' ? `Gợi ý nghĩa: ${q.mean}` : q.mode === 'm7' ? `Đọc là: ${q.wordReading || '—'}` : `（${q.mean}）   ·   chữ cần đọc: 「${q.target}」`;
    return { instruction, prompt, support };
  }
  function drawQuizPanel(b, W, H) {
    const layout = quizPanelLayout(W, H);
    const h = layout.panelH, x = 0, y = layout.y;
    cx.fillStyle = 'rgba(11,16,48,.96)'; cx.fillRect(x, y, W, h);
    cx.strokeStyle = '#16558f'; cx.lineWidth = 3; cx.strokeRect(x + 2, y + 2, W - 4, h - 4);
    const P = layout.pad; // padding trái

    if (b.phase === 'end') {
      cx.fillStyle = '#fff'; cx.font = `19px ${JPFONT}`;
      wrap(b.endMsg || b.feedback || 'Hoàn thành!', x + P, y + 50, W - P * 2, 28);
      cx.fillStyle = '#9fd8f5'; cx.font = '14px "KanjiGo UI",sans-serif'; cx.fillText('▶ Space để tiếp tục', W - 220, y + h - 20);
      return;
    }

    const q = b.q;
    const disabled = (b.stun > 0) || (b.qCooldown > 0); // khoá phím lúc choáng / chờ câu mới

    // ── VÙNG 1: HƯỚNG DẪN + TỪ + NGHĨA (mỗi phần 1 dòng riêng, không đè) ──
    cx.textAlign = 'left';
    cx.fillStyle = '#9fd8f5'; cx.font = '13px "KanjiGo UI",sans-serif';
    const compact = W < 620, narrow = layout.narrow;
    const presentation = quizPresentation(q, compact);
    fitText(presentation.instruction, x + P, y + 24, narrow ? W - P * 2 : W * .62, 13, true);
    cx.fillStyle = '#6effa1'; cx.font = '12px "KanjiGo UI",sans-serif'; cx.textAlign = 'right';
    cx.fillText(compact ? `${learning.correct}/${learning.total} đúng · ${learningAccuracy()}%` : `Học: ${learning.correct}/${learning.total} đúng  •  ${learningAccuracy()}%  •  🔥${learning.streak}`, W - P, y + (narrow ? 45 : 24));
    cx.textAlign = 'left';
    cx.fillStyle = '#fff'; cx.font = `bold ${narrow ? 27 : 30}px ${JPFONT}`;
    const promptY = y + (narrow ? 76 : 58), promptW = W - P * 2, promptSize = narrow ? 27 : 30;
    if (q.mode === 'm8') drawHighlightedText(presentation.prompt, q.target, x + P, promptY, promptW, promptSize);
    else if (q.mode === 'm9') drawHighlightedText(presentation.prompt, q.targetReading, x + P, promptY, promptW, promptSize);
    else fitText(presentation.prompt, x + P, promptY, promptW, promptSize, true);
    cx.fillStyle = '#ffd54a'; cx.font = `15px ${JPFONT}`;
    fitText(presentation.support, x + P, y + (narrow ? 103 : 82), W - P * 2, narrow ? 13 : 15);

    // Portrait/desktop dùng 2×2. Mobile landscape dùng một hàng bốn nút để
    // trả lại chiều cao cho battlefield mà vẫn giữ target chạm cao 44px.
    const ans = q.options;
    const bh = layout.answerH;
    const gY = layout.answerGapY;
    const bx = x + P, bw = layout.answerW;
    const startY = layout.answerStartY;
    const cols = layout.answerCols || 2;
    for (let i = 0; i < ans.length; i++) {
      const col = i % cols, row = (i / cols) | 0;
      const ox = bx + col * (bw + layout.answerGapX), oy = startY + row * (bh + gY);
      const selected = b.selectedIndex === i;
      const correct = i === q.correctIndex;
      cx.globalAlpha = selected ? 1 : disabled ? 0.4 : 1;
      const hinted = b.hint && i !== q.correctIndex && i === 0;
      cx.fillStyle = selected ? (correct ? 'rgba(31,164,91,.96)' : 'rgba(194,52,62,.96)')
        : hinted ? 'rgba(90,100,120,.38)' : 'rgba(22,85,143,.55)';
      cx.fillRect(ox, oy, bw, bh);
      cx.strokeStyle = selected ? (correct ? '#a6ffc8' : '#ffd0d3') : disabled ? '#3a4a6a' : '#2f7fc0';
      cx.lineWidth = selected ? 3 : 1; cx.strokeRect(ox, oy, bw, bh);
      cx.fillStyle = selected ? '#fff' : '#9fd8f5'; cx.font = `bold ${narrow ? 14 : 16}px "KanjiGo UI",sans-serif`; cx.fillText(`${i + 1})`, ox + (narrow ? 8 : 12), oy + bh / 2 + 6);
      cx.fillStyle = '#fff'; fitText(ans[i] || '', ox + (narrow ? 34 : 42), oy + bh / 2 + 7, bw - (narrow ? 42 : 54), narrow ? 18 : 20);
      cx.globalAlpha = 1;
    }

    // ── VÙNG 3: DÒNG TRẠNG THÁI (đếm ngược choáng / gợi ý) ──
    const statusY = y + h - 14;
    if (b.stun > 0) {
      cx.fillStyle = '#ff9a9a'; cx.font = 'bold 13px "KanjiGo UI",sans-serif';
      cx.fillText(`😵 Choáng ${(b.stun / 1000).toFixed(1)}s — đã khoá phím trả lời`, x + P, statusY);
    } else if (b.qCooldown > 0) {
      cx.fillStyle = '#9ab'; cx.font = '12px "KanjiGo UI",sans-serif';
      cx.fillText(b.feedback && !b.feedback.good ? '… xem lại đáp án trước khi tiếp tục' : '… đang ra câu tiếp theo', x + P, statusY);
    } else {
      cx.fillStyle = '#8aa'; cx.font = '12px "KanjiGo UI",sans-serif';
      const lens = state === 'battle' && Number.isFinite(b.meaningLensRemaining) ? `  •  H: Lens (${b.meaningLensRemaining})` : '';
      const comboGuard = state === 'battle' && b.comboGuardRemaining > 0 ? `  •  🛡 ${b.comboGuardRemaining}` : '';
      fitText(`${narrow ? 'Chạm đáp án' : `1–${ans.length}: chọn đáp án`}${b.hint ? '  •  gợi ý đã loại 1 đáp án sai' : ''}${lens}${comboGuard}`, x + P, statusY, W - P - (narrow ? 82 : 126), narrow ? 10 : 12);
    }
    cx.fillStyle = '#8aa'; cx.font = `${narrow ? 10 : 12}px "KanjiGo UI",sans-serif`; cx.textAlign = 'right'; cx.fillText(narrow ? '← Chạy' : 'Esc: bỏ chạy', W - P, statusY); cx.textAlign = 'left';
  }
  function drawBattleStand(x, baseY, width, depth = 1) {
    const stand = deferredImg('battle_stand');
    if (!stand) return;
    const imageW = stand.naturalWidth || stand.width, imageH = stand.naturalHeight || stand.height;
    const sourceX = imageW * .07, sourceY = imageH * .3;
    const sourceW = imageW * .86, sourceH = imageH * .38;
    const height = width * (sourceH / sourceW) * depth;
    const drawY = baseY - height * .4;
    cx.save();
    cx.beginPath(); cx.ellipse(x, drawY + height * .5, width * .5, height * .5, 0, 0, Math.PI * 2); cx.clip();
    cx.globalCompositeOperation = 'multiply'; cx.imageSmoothingEnabled = false;
    cx.drawImage(stand, sourceX, sourceY, sourceW, sourceH, x - width * .5, drawY, width, height);
    cx.restore();
  }
  function drawBattleBackground(kind, W, fieldH) {
    if (kind === 'water') {
      const g = cx.createLinearGradient(0, 0, 0, fieldH); g.addColorStop(0, '#1e6f8f'); g.addColorStop(.6, '#0e4763'); g.addColorStop(1, '#07293a');
      cx.fillStyle = g; cx.fillRect(0, 0, W, fieldH);
      cx.strokeStyle = 'rgba(160,220,240,.22)'; cx.lineWidth = 2;
      for (let yy = 46; yy < fieldH; yy += 40) { cx.beginPath(); for (let xx = 0; xx <= W; xx += 16) { const y = yy + Math.sin((xx + yy) / 24) * 4; xx === 0 ? cx.moveTo(xx, y) : cx.lineTo(xx, y); } cx.stroke(); }
    } else {
      const bg = deferredImg('battle_forest');
      if (!bg) { cx.fillStyle = '#55a83e'; cx.fillRect(0, 0, W, fieldH); return; }
      const imageW = bg.naturalWidth || bg.width, imageH = bg.naturalHeight || bg.height;
      // Preserve the source ratio, then bias the crop downward so ultrawide
      // battlefields retain a useful strip of meadow beneath the forest line.
      const scale = Math.max(W / imageW, fieldH / imageH);
      const sourceW = W / scale, sourceH = fieldH / scale;
      const sourceX = (imageW - sourceW) / 2;
      const sourceY = Math.min(imageH - sourceH, imageH * .15);
      cx.save();
      // Keep the same crisp sampling used by Kanjimon sprites and the stand art.
      cx.imageSmoothingEnabled = false;
      cx.drawImage(bg, sourceX, sourceY, sourceW, sourceH, 0, 0, W, fieldH);
      cx.restore();
    }
  }
  function drawHpBar(x, y, name, hp, max, col, w = 260, monster = null) {
    cx.fillStyle = 'rgba(11,16,32,.85)'; cx.fillRect(x, y, w, 46);
    cx.strokeStyle = '#16558f'; cx.lineWidth = 2; cx.strokeRect(x, y, w, 46);
    if (monster) drawHighlightedText(name, monsterHanViet(monster), x + 10, y + 18, w - 20, 15, { bold: true });
    else { cx.fillStyle = '#fff'; fitText(name, x + 10, y + 18, w - 20, 15, true); }
    const bw = w - 64, bx = x + 10, by = y + 27; cx.fillStyle = '#333'; cx.fillRect(bx, by, bw, 9);
    const r = Math.max(0, hp / max); cx.fillStyle = r > .5 ? col : r > .2 ? '#e6c34a' : '#e04a4a'; cx.fillRect(bx, by, bw * r, 9);
    cx.fillStyle = '#cde'; cx.font = '12px "KanjiGo UI",sans-serif'; cx.fillText(`${hp}/${max}`, x + w - 52, y + 37);
  }

  // ----- DEX render -----
  const silhouetteCache = {};
  function getSilhouette(monId) {
    if (silhouetteCache[monId]) return silhouetteCache[monId];
    const img = monsterImg(monId);
    if (!img || typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width; canvas.height = img.naturalHeight || img.height;
    const sc = canvas.getContext('2d');
    sc.drawImage(img, 0, 0);
    sc.globalCompositeOperation = 'source-in'; sc.fillStyle = '#101018'; sc.fillRect(0, 0, canvas.width, canvas.height);
    silhouetteCache[monId] = canvas;
    return canvas;
  }
  function renderDex() {
    const W = SCREEN_W, H = SCREEN_H, list = dex.list;
    const total = list.length, captured = list.filter((char) => ensureMastery(char).captured).length;
    const layout = dexLayout(total), content = dexContent(layout);
    dex.maxScroll = Math.max(0, content.height - layout.availableH); clampDexScroll(); dex.hitboxes = [];
    cx.fillStyle = '#0e1430'; cx.fillRect(0, 0, W, H);
    cx.fillStyle = '#fff'; fitText('📖 KANJI DEX', layout.ox, 32, W < 620 ? 160 : 205, Math.max(20, Math.min(28, W * .03)), true);
    cx.fillStyle = '#6effa1'; cx.font = '14px "KanjiGo UI",sans-serif';
    const resultLabel = dex.query ? `Kết quả: ${total}/${dex.source.length}` : `Đã thu phục: ${captured}/${total}`;
    fitText(resultLabel, W < 620 ? layout.ox : layout.ox + 220, W < 620 ? 53 : 31, 170, 14);

    if (!list.length) {
      cx.fillStyle = '#9fb0cc'; cx.font = `bold 16px ${JPFONT}`; cx.textAlign = 'center';
      cx.fillText('Không tìm thấy Kanji phù hợp', W / 2, layout.oy + 58); cx.textAlign = 'left';
    }

    cx.save(); cx.beginPath(); cx.rect(0, layout.oy, W, layout.availableH); cx.clip();
    for (const row of content.rows) {
      const y = layout.oy + row.y - dex.scrollY;
      if (y + row.h < layout.oy || y > layout.gridBottom) continue;
      if (row.type === 'header') {
        const sectionCaptured = row.section.list.filter((char) => ensureMastery(char).captured).length;
        cx.fillStyle = 'rgba(15,40,75,.96)'; cx.fillRect(layout.ox, y, W - layout.ox * 2, 24);
        cx.fillStyle = row.section.tier === 'N4' ? '#d7b4ff' : row.section.tier === 'BONUS' ? '#ffd98a' : '#77ddff'; cx.font = 'bold 13px "KanjiGo UI",sans-serif';
        cx.fillText(row.section.locked ? `${row.section.label}  🔒 CẦN HUY HIỆU N5` : `${row.section.label}  ${sectionCaptured}/${row.section.list.length}`, layout.ox + 10, y + 17); continue;
      }
      row.list.forEach((char, col) => {
        const index = dex.indexByChar.get(char) ?? -1, info = kanjiInfo(char); if (!info) return;
        const id = info.monId, monster = C.MONSTERS[id]; if (!monster) return;
        const stat = ensureMastery(char), unlocked = stat.captured, selected = index === dex.sel, following = unlocked && id === currentPetId && followerUnlocked();
        const x = layout.ox + col * (layout.cardW + layout.gapX);
        cx.fillStyle = selected ? (unlocked ? 'rgba(22,85,143,.92)' : 'rgba(40,45,65,.94)') : (unlocked ? 'rgba(20,28,60,.94)' : 'rgba(12,14,24,.97)'); cx.fillRect(x, y, layout.cardW, layout.cardH);
        cx.strokeStyle = selected ? '#6cc0ff' : unlocked ? '#2a3a66' : '#242638'; cx.lineWidth = selected ? 3 : 1; cx.strokeRect(x, y, layout.cardW, layout.cardH);
        const image = unlocked ? monsterImg(id) : getSilhouette(id), iw = Math.max(30, Math.min(68, layout.cardW * .34, layout.cardH * .4));
        if (image) { const ih = iw * image.height / image.width; cx.drawImage(image, x + 11, y + 9, iw, ih); }
        const kanjiSize = Math.max(29, Math.min(44, layout.cardH * .3)); cx.fillStyle = unlocked ? '#ffd54a' : '#55586c'; cx.font = `bold ${kanjiSize}px ${JPFONT}`; cx.textAlign = 'right'; cx.fillText(unlocked ? info.char : '？', x + layout.cardW - 11, y + kanjiSize + 8); cx.textAlign = 'left';
        if (unlocked) drawMonsterName(monster, x + 11, y + layout.cardH - 54, layout.cardW - 22, 14);
        else { cx.fillStyle = '#77798a'; fitText('？？？', x + 11, y + layout.cardH - 54, layout.cardW - 22, 14, true); }
        if (unlocked) {
          cx.fillStyle = '#9fd8f5'; fitText(`Lv.${stat.level}/${C.KLEVEL.maxLevel} ${levelLabel(stat.level)}`, x + 11, y + layout.cardH - 36, layout.cardW - 22, 11);
          cx.fillStyle = stat.recall > 70 ? '#6effa1' : stat.recall >= 30 ? '#ffd54a' : '#ff7777'; cx.font = '11px "KanjiGo UI",sans-serif'; cx.fillText(`Recall ${stat.recall}%`, x + 11, y + layout.cardH - 19);
          if (following) { cx.fillStyle = '#6effa1'; cx.font = 'bold 9px "KanjiGo UI",sans-serif'; cx.textAlign = 'right'; cx.fillText('● ĐANG THEO', x + layout.cardW - 10, y + layout.cardH - 19); cx.textAlign = 'left'; }
          const progress = stat.level >= C.KLEVEL.maxLevel ? 1 : expInLevel(char) / expToNext(char); cx.fillStyle = '#333'; cx.fillRect(x + 10, y + layout.cardH - 8, layout.cardW - 20, 5); cx.fillStyle = stat.level >= C.KLEVEL.maxLevel ? '#ffd54a' : '#6cc0ff'; cx.fillRect(x + 10, y + layout.cardH - 8, (layout.cardW - 20) * Math.max(0, Math.min(1, progress)), 5);
        }
        const hitY = Math.max(y, layout.oy), hitBottom = Math.min(y + layout.cardH, layout.gridBottom);
        if (hitBottom > hitY) dex.hitboxes.push({ x, y: hitY, w: layout.cardW, h: hitBottom - hitY, action: 'card', value: index });
      });
    }
    cx.restore();
    if (dex.maxScroll > 0) {
      const trackX = W - 8, trackH = layout.availableH, thumbH = Math.max(28, trackH * layout.availableH / content.height), thumbY = layout.oy + (trackH - thumbH) * dex.scrollY / dex.maxScroll;
      cx.fillStyle = 'rgba(255,255,255,.1)'; cx.fillRect(trackX, layout.oy, 4, trackH); cx.fillStyle = '#6cc0ff'; cx.fillRect(trackX, thumbY, 4, thumbH);
    }

    const selected = kanjiInfo(list[dex.sel]), selectedUnlocked = selected && ensureMastery(selected.char).captured, panelY = H - layout.panelH;
    cx.fillStyle = 'rgba(11,16,48,.97)'; cx.fillRect(0, panelY, W, layout.panelH); cx.strokeStyle = '#16558f'; cx.lineWidth = 2; cx.strokeRect(2, panelY + 2, W - 4, layout.panelH - 4);
    if (selected && selectedUnlocked) {
      const stat = ensureMastery(selected.char), narrow = W < 620, recallColor = stat.recall > 70 ? '#6effa1' : stat.recall >= 30 ? '#ffd54a' : '#ff7777';
      const following = selected.monId === currentPetId && followerUnlocked();
      const petButtonW = narrow ? 104 : 128, petButtonH = 34, petButtonX = W - 20 - petButtonW, petButtonY = panelY + 10, petHitH = 44;
      cx.fillStyle = following ? 'rgba(24,101,71,.9)' : 'rgba(22,103,165,.94)'; cx.fillRect(petButtonX, petButtonY, petButtonW, petButtonH);
      cx.strokeStyle = following ? '#6effa1' : '#69d8ff'; cx.lineWidth = 2; cx.strokeRect(petButtonX, petButtonY, petButtonW, petButtonH);
      cx.fillStyle = following ? '#9affc2' : '#fff'; cx.font = `bold ${narrow ? 10 : 11}px "KanjiGo UI",sans-serif`; cx.textAlign = 'center';
      cx.fillText(following ? 'ĐANG THEO ✓' : 'ĐI CÙNG', petButtonX + petButtonW / 2, petButtonY + 22); cx.textAlign = 'left';
      if (!following) dex.hitboxes.push({ x: petButtonX, y: petButtonY - (petHitH - petButtonH) / 2, w: petButtonW, h: petHitH, action: 'equip-pet', value: selected.char });
      cx.fillStyle = '#fff'; fitText(`${selected.char}  ${selected.meaning}`, 20, panelY + 31, Math.max(90, petButtonX - 30), 20, true);
      drawMonsterName(C.MONSTERS[selected.monId], 20, panelY + 52, W - 40, 13, { label: true });
      const btnW = 24, btnH = 22, hitSize = 44, onX = 20, kunX = narrow ? 20 : 320;
      const onMaxW = narrow ? Math.max(60, W - 40 - hitSize - 8) : 250;
      const kunMaxW = narrow ? Math.max(60, W - 40 - hitSize - 8) : Math.max(80, W - 40 - kunX - hitSize - 8);
      const onY = panelY + 76, kunY = panelY + (narrow ? 97 : 76);
      const onText = `Âm ON: ${selected.on.join(', ')}`, kunText = `Âm KUN: ${selected.kun.join(', ') || '—'}`;
      cx.fillStyle = '#ffd54a'; const onTextW = fitText(onText, onX, onY, onMaxW, 14);
      cx.fillStyle = '#6effa1'; const kunTextW = fitText(kunText, kunX, kunY, kunMaxW, 14);
      // Neo icon vào chiều rộng chữ đã render, thay vì cuối chiều rộng tối đa
      // của cột. Hitbox vẫn rộng để loa nhỏ dễ bấm trên màn hình cảm ứng.
      const onBtnX = onX + onTextW + 5, onBtnY = onY - btnH + 4;
      const kunBtnX = kunX + kunTextW + 5, kunBtnY = kunY - btnH + 4;
      const drawAudioBtn = (bx, by, active) => {
        cx.fillStyle = active ? '#dff8ff' : '#667087'; cx.font = '15px "KanjiGo UI",sans-serif'; cx.textAlign = 'center';
        cx.fillText('🔊', bx + btnW / 2, by + btnH - 5); cx.textAlign = 'left';
      };
      const onAudio = true, kunAudio = Array.isArray(selected.kun) && selected.kun.length > 0;
      drawAudioBtn(onBtnX, onBtnY, onAudio);
      dex.hitboxes.push({ x: onBtnX - (hitSize - btnW) / 2, y: onBtnY - (hitSize - btnH) / 2, w: hitSize, h: hitSize, action: 'kanji-audio', value: { char: selected.char, type: 'on' } });
      drawAudioBtn(kunBtnX, kunBtnY, kunAudio);
      if (kunAudio) dex.hitboxes.push({ x: kunBtnX - (hitSize - btnW) / 2, y: kunBtnY - (hitSize - btnH) / 2, w: hitSize, h: hitSize, action: 'kanji-audio', value: { char: selected.char, type: 'kun' } });
      cx.fillStyle = recallColor; cx.font = '12px "KanjiGo UI",sans-serif'; fitText(`Recall ${stat.recall}% · 🔥 ${stat.winStreak} (best ${stat.bestWinStreak})`, 20, narrow ? panelY + 119 : panelY + 100, W - 40, 12);
    } else {
      cx.fillStyle = '#9ab'; cx.font = `18px ${JPFONT}`; cx.fillText('？？？', 20, panelY + 34); cx.font = '14px "KanjiGo UI",sans-serif'; cx.fillText('Tới 🏛️ Giảng đường để thu phục chữ này.', 20, panelY + 65);
    }
  }

  let lastDialogLayout = null;
  function dialogTextLines(text, maxW) {
    const words = String(text || '').trim().split(/\s+/).filter(Boolean), lines = [];
    let line = '';
    const pushLongWord = (word) => {
      let chunk = '';
      for (const char of word) {
        if (chunk && cx.measureText(chunk + char).width > maxW) { lines.push(chunk); chunk = char; }
        else chunk += char;
      }
      return chunk;
    };
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (cx.measureText(candidate).width <= maxW) { line = candidate; continue; }
      if (line) { lines.push(line); line = ''; }
      line = cx.measureText(word).width <= maxW ? word : pushLongWord(word);
    }
    if (line || !lines.length) lines.push(line);
    return lines;
  }
  function drawDialog() {
    const W = SCREEN_W, H = SCREEN_H, mobile = W < 520;
    const margin = mobile ? 12 : 22, w = W - margin * 2, x = margin, pad = mobile ? 16 : 18;
    const fontSize = mobile ? 15 : 18, lineH = mobile ? 22 : 26, footerH = mobile ? 38 : 32;
    cx.font = `${fontSize}px ${JPFONT}`;
    const textW = w - pad * 2, lines = dialogTextLines(dialog.npc.lines[dialog.idx], textW);
    const titleH = mobile ? 28 : 0;
    const wantedH = pad + titleH + lines.length * lineH + footerH;
    const h = Math.min(H - (mobile ? 92 : 32), Math.max(mobile ? 142 : 110, wantedH));
    const y = Math.max(mobile ? 76 : 16, H - h - (mobile ? 12 : 16));
    cx.fillStyle = 'rgba(11,16,48,.93)'; cx.fillRect(x, y, w, h);
    cx.strokeStyle = '#16558f'; cx.lineWidth = 3; cx.strokeRect(x, y, w, h);
    let textY = y + pad + fontSize;
    if (mobile) {
      cx.fillStyle = '#6effa1'; cx.font = 'bold 11px "KanjiGo UI",sans-serif';
      fitText(dialog.npc.name ? `💬 ${dialog.npc.name}` : '💬 HỘI THOẠI', x + pad, textY, textW, 11, true);
      textY += titleH; cx.font = `${fontSize}px ${JPFONT}`;
    }
    cx.fillStyle = '#fff';
    const maxLines = Math.max(1, Math.floor((y + h - footerH - textY) / lineH) + 1);
    const visibleLines = lines.slice(0, maxLines);
    visibleLines.forEach((line, index) => cx.fillText(line, x + pad, textY + index * lineH));
    cx.fillStyle = '#9fd8f5'; cx.font = `${mobile ? 11 : 13}px "KanjiGo UI",sans-serif`; cx.textAlign = 'right';
    cx.fillText(mobile ? 'Chạm hộp thoại hoặc TIẾP  ▶' : '▶ Space để tiếp', x + w - pad, y + h - 14); cx.textAlign = 'left';
    lastDialogLayout = { x, y, w, h, textY, lineH, lineCount: visibleLines.length, footerY: y + h - footerH, textW };
  }
  function drawToast() {
    const W = SCREEN_W, H = SCREEN_H, w = W - 44, h = 46, x = 22, y = H - h - 16;
    cx.globalAlpha = Math.min(1, toast.t / 400);
    cx.fillStyle = 'rgba(11,16,48,.92)'; cx.fillRect(x, y, w, h);
    cx.strokeStyle = '#16558f'; cx.lineWidth = 2; cx.strokeRect(x, y, w, h);
    cx.fillStyle = '#fff'; cx.font = `17px ${JPFONT}`; cx.fillText(toast.text, x + 16, y + 29); cx.globalAlpha = 1;
  }
  function wrap(text, x, y, maxW, lh) {
    const words = String(text).split(' '); let line = '', yy = y;
    for (const wd of words) { const test = line + wd + ' '; if (cx.measureText(test).width > maxW && line) { cx.fillText(line, x, yy); line = wd + ' '; yy += lh; } else line = test; }
    cx.fillText(line, x, yy);
  }
  function fitText(text, x, y, maxW, maxSize, bold = false) {
    let size = maxSize;
    do { cx.font = `${bold ? 'bold ' : ''}${size}px ${JPFONT}`; size--; } while (size >= 10 && cx.measureText(text).width > maxW);
    let output = String(text);
    if (cx.measureText(output).width > maxW) {
      while (output.length > 1 && cx.measureText(`${output}…`).width > maxW) output = output.slice(0, -1);
      output += '…';
    }
    cx.fillText(output, x, y);
    return cx.measureText(output).width;
  }
  function monsterHanViet(monster) {
    if (!monster) return '';
    const explicit = typeof monster.hanViet === 'string' ? monster.hanViet.trim() : '';
    if (explicit) return explicit;
    return String(monster.name || '').trim().split(/\s+/)[0] || '';
  }
  function drawHighlightedText(text, highlight, x, y, maxW, maxSize, options = {}) {
    const value = String(text || ''), token = String(highlight || '').trim();
    const index = token ? value.toLocaleLowerCase('vi').indexOf(token.toLocaleLowerCase('vi')) : -1;
    if (index < 0) { cx.fillStyle = options.color || '#fff'; fitText(value, x, y, maxW, maxSize, options.bold !== false); return; }
    const prefix = value.slice(0, index), marked = value.slice(index, index + token.length), rawSuffix = value.slice(index + token.length);
    let size = maxSize, suffix = rawSuffix;
    const setFont = () => { cx.font = `${options.bold === false ? '' : 'bold '}${size}px ${JPFONT}`; };
    setFont();
    while (size > 10 && cx.measureText(value).width > maxW) { size--; setFont(); }
    if (cx.measureText(value).width > maxW) {
      while (suffix.length > 1 && cx.measureText(`${prefix}${marked}${suffix}…`).width > maxW) suffix = suffix.slice(0, -1);
      if (suffix !== rawSuffix) suffix += '…';
    }
    const totalW = cx.measureText(`${prefix}${marked}${suffix}`).width;
    let cursor = options.align === 'center' ? x - totalW / 2 : options.align === 'right' ? x - totalW : x;
    cx.save(); cx.textAlign = 'left';
    if (prefix) { cx.fillStyle = options.color || '#dce8ff'; cx.fillText(prefix, cursor, y); cursor += cx.measureText(prefix).width; }
    const markedW = cx.measureText(marked).width;
    cx.fillStyle = options.highlightColor || '#ffd54a'; cx.fillText(marked, cursor, y);
    cursor += markedW;
    if (suffix) { cx.fillStyle = options.color || '#fff'; cx.fillText(suffix, cursor, y); }
    cx.restore();
  }
  function drawMonsterName(monster, x, y, maxW, maxSize, options = {}) {
    if (!monster) return;
    const name = `${options.label ? 'HÁN VIỆT · ' : ''}${monster.name || ''}`;
    drawHighlightedText(name, monsterHanViet(monster), x, y, maxW, maxSize, options);
  }

  // ---------- KHỞI ĐỘNG ----------
  const activeProfile = activeCharacterProfile();
  const activeAppearance = activeProfile?.appearance;
  const activePlayerAsset = activeProfile?.gender === 'female'
    ? (activeAppearance === 'blue' && C.ASSETS.playerFemaleBlue
      ? C.ASSETS.playerFemaleBlue : (C.ASSETS.playerFemale || C.ASSETS.player))
    : (activeAppearance === 'blue' && C.ASSETS.playerBlue ? C.ASSETS.playerBlue : C.ASSETS.player);
  const activePlayerBicycleAsset = activeProfile?.gender !== 'female' && activeAppearance !== 'blue'
    ? C.ASSETS.playerBicycleOrange : null;
  const activePlayerUsesV4 = [C.ASSETS.player, C.ASSETS.playerBlue,
    C.ASSETS.playerFemale, C.ASSETS.playerFemaleBlue].includes(activePlayerAsset);
  const activePlayerFrameSize = Math.max(TILE, Number(C.CHARACTER && C.CHARACTER[
    activePlayerUsesV4 ? 'playerV4FrameSize' : 'frameSize']) || TILE);
  const activePlayerDrawSize = Math.max(TILE, Number(C.CHARACTER && C.CHARACTER[
    activePlayerUsesV4 ? 'playerV4DrawSize' : 'drawSize']) || TILE);
  const defaultCharacterDrawSize = Math.max(TILE, Number(C.CHARACTER && C.CHARACTER.drawSize) || TILE);
  const activePlayerDrawScale = activePlayerDrawSize / defaultCharacterDrawSize;
  const toLoad = [loadImg('player', activePlayerAsset), loadImg('npc', C.ASSETS.npc), loadImg('tileset', C.ASSETS.tileset), loadImg('terrain_tiles', C.ASSETS.terrainTiles), loadImg('academy', C.ASSETS.academy), loadImg('tulip_tiles', C.ASSETS.tulipTiles), loadImg('arena_wall_tiles', C.ASSETS.arenaWallTiles), loadImg('trainer_theme_icons', C.ASSETS.trainerThemeIcons), loadImg('campus_lawn_tile', C.ASSETS.campusLawnTile), loadImg('campus_plaza_tile', C.ASSETS.campusPlazaTile), loadImg('campus_tech_tile', C.ASSETS.campusTechTile), loadImg('campus_courtyard_tile', C.ASSETS.campusCourtyardTile)];
  if (activePlayerBicycleAsset) toLoad.push(loadImg('player_bicycle', activePlayerBicycleAsset));
  else toLoad.push(loadImg('bicycle_overlay', C.ASSETS.bicycleOverlay));
  // Chỉ preload pet đang theo. 219+ sprite còn lại được tải khi thực sự xuất
  // hiện, tránh decode hàng chục MB ảnh trước khi người chơi vào được game.
  if (petData[currentPetId] && C.MONSTERS[currentPetId]) toLoad.push(loadImg('mon_' + currentPetId, C.MONSTERS[currentPetId].img));
  Promise.all(toLoad).then(() => {
    if (loadError) {
      cx.setTransform(1, 0, 0, 1, 0, 0); cx.fillStyle = '#111'; cx.fillRect(0, 0, cv.width, cv.height);
      setScreenTransform();
      cx.fillStyle = '#ff6b6b'; cx.font = '16px "KanjiGo UI",sans-serif'; cx.fillText('Không tải được ảnh:', 20, 40);
      cx.fillStyle = '#fff'; cx.fillText(loadError, 20, 66);
      cx.fillStyle = '#9fd8f5'; cx.fillText('Kiểm tra thư mục assets/ cạnh index.html', 20, 98); return;
    }
    gameReady = true;
    render();
    window.AudioManager?.preloadAll()?.catch(() => {});
    window.AudioManager?.syncMusic?.('overworld');
    requestAnimationFrame(loop);
  });

  // ---------- Export nội bộ cho QA test (không ảnh hưởng khi chạy web) ----------
  const debugApi = {
    state: () => state, startBattle, answer, tryRun, endBattle,
    getBattle: () => battle, getPlayer: () => player,
    getPet: () => {
      if (!followerUnlocked()) return null;
      const s = petMastery(); return { id: currentPetId, level: s.level, mp: s.mp, recall: s.recall, ...petData[currentPetId] };
    },
    hasFollower: followerUnlocked,
    petData: () => petData, mastery: () => learning.mastery, makeQuestion, questionModesForLevel, updateBattle,
    pickGrassKanji, availableSpawn, getSilhouette, openDex, onDexKey, getDex: () => ({ ...dex, list: [...dex.list] }), getDexLayout: () => ({ ...dexLayout(dex.list.length) }), setPet: equipPet,
    collect, isCollected, isDue, rustMultiplier, srsPromote, srsDemote,
    levelFromMp, mpFloorOfLevel, levelLabel, expInLevel, expToNext, awardWin, awardLoss, reappearWeight, battleLevelScale,
    getKanjiStat: (kanji) => ({ ...ensureMastery(kanji) }), getStreak: (kanji) => { const s = ensureMastery(kanji); return { winStreak: s.winStreak, lossStreak: s.lossStreak, bestWinStreak: s.bestWinStreak }; },
    recordAnswer, createLearningSession, finalizeLearningSession,
    vocabularyId, getVocabularyProgress: (value) => { const progress = vocabularyProgress(value); return progress ? { ...progress } : null; }, vocabularyQuestionsForKanji,
    enterLecture, startAcademyLesson, onLectureKey, answerLecture, getLecture: () => lecture,
    nextLectureKanji, academyLockedList, academyFilteredList, startCapture, answerCapture, onCaptureKey, updateCapture, getCapture: () => capture,
    startPve, startTrainer, interactTrainer, trainerStatus, trainerTeam, trainerWinsCount,
    openGymMenu, closeGymMenu, selectGymTier, onGymMenuKey, startGym, answerPve, updatePve, getPve: () => pve,
    getGymMenu: () => ({ ...gymMenu, options: [...gymMenu.options], hitboxes: [...gymMenu.hitboxes] }),
    getGymHistory: (tier = '') => tier ? (learning.gymHistory[String(tier).toUpperCase()] ? { ...learning.gymHistory[String(tier).toUpperCase()] } : null)
      : Object.fromEntries(Object.entries(learning.gymHistory).map(([id, value]) => [id, { ...value }])),
    tierOfKanji, isTierUnlocked, tierProgress, isTierStudyComplete, gymEligibility, gymGrade, hasBadge,
    getLearningStats: () => ({ total: learning.total, correct: learning.correct, wrong: learning.wrong, streak: learning.streak, best: learning.best }),
    getLearningSaveStatus: () => ({ pending: learningSaveQueue.pending(), writes: learningSaveQueue.writeCount() }),
    flushLearningSave,
    getProgression: () => ({
      version: learning.progression.version,
      earnedKP: learning.progression.earnedKP,
      claimedMilestones: { ...learning.progression.claimedMilestones },
      skillPurchases: { ...learning.progression.skillPurchases },
    }),
    availableKP, spentKP, evaluateKanjiMilestones, evaluateAllKpMilestones,
    getProgressionNotice: () => progressionNotice ? { ...progressionNotice } : null,
    validateSkillDefinitions, skillDefinitions: () => SKILL_DEFINITIONS.map((definition) => ({ ...definition })),
    skillStatus, purchaseSkill, resetPerks, hasSkill, capturedKanjiCount, kanjiAtLevelCount, resolveSkillEffects,
    openSkillTree, onSkillKey, getSkillUi: () => ({ ...skillUi, hitboxes: [...skillUi.hitboxes] }), getSkillTreeLayout: () => ({ ...skillTreeLayout() }),
    openProfile, onProfileKey, getProfileStats: profileStats, getProfileUi: () => ({ ...profileUi, hitboxes: [...profileUi.hitboxes] }),
    useMeaningLens, radarSummary, cycleRadarTarget, radarEncounterMultiplier, getRadarTarget: () => radarTarget,
    getOverworldHudLayout: () => ({ ...overworldHudLayout() }),
    toggleBicycle, isBicycleActive, bicycleMoveDuration, tryMove, canWalk, onSpace, academyEntranceInReach,
    getOnboardingTour: () => { const tour = onboardingTour(); return tour ? { ...tour, profile: { ...tour.profile }, stop: { ...tour.stop } } : null; },
    getOnboardingWaypoint: () => lastOnboardingWaypoint ? { ...lastOnboardingWaypoint } : null,
    getDialog: () => dialog.active ? { active: true, idx: dialog.idx, npc: { ...dialog.npc, lines: [...dialog.npc.lines] } } : { active: false },
    getDialogLayout: () => lastDialogLayout ? { ...lastDialogLayout } : null,
    toggleAutoRide, stopAutoRide, isAutoRideActive: () => autoRideActive, findAutoRidePath, nextAutoRideDirection,
    getPveResult: () => pveResult, getCanvasSize: () => ({ width: SCREEN_W, height: SCREEN_H }), getWorldZoom: () => worldZoom,
    getRenderMetrics: () => ({
      viewportWidth: VIEWPORT_W, viewportHeight: VIEWPORT_H,
      logicalWidth: SCREEN_W, logicalHeight: SCREEN_H,
      backingWidth: cv.width, backingHeight: cv.height,
      presentationScale, pixelRatio: renderPixelRatio,
      devicePixelRatio: Math.max(1, Number(window.devicePixelRatio) || 1),
    }),
    getFontState: () => ({ ready: fontReady, family: 'KanjiGo UI' }),
    clientToLogical,
    getOverworldCamera: () => ({ ...overworldCamera() }), getQuizLayout: () => ({ ...quizPanelLayout(SCREEN_W, SCREEN_H) }),
    getBattleActorLayout: () => lastBattleActorLayout ? { ...lastBattleActorLayout } : null,
    resetPetTrail, recordPlayerTrail, petFollowPosition, getPetTrail: () => trail.map((point) => ({ ...point })),
    kanjiAnimations: () => Object.fromEntries(Object.entries(KANJI_ANIMATIONS).map(([char, value]) => [char, { ...value }])),
    followerMeaningMotion: (id, moving = false, now = 0) => followerMeaningMotion(C.MONSTERS[id], moving, now),
    hasMeaningAttackAnimation: (id) => !!kanjiAnimation(C.MONSTERS[id]),
    resolveKanjiAnimation: (id) => { const animation = kanjiAnimation(C.MONSTERS[id]); return animation ? { ...animation } : null; },
    renderMeaningAttackFrame: (id, progress, reverse = false) => drawMeaningAttackAnimation(
      C.MONSTERS[id], progress, reverse ? 520 : 120, reverse ? 120 : 520, 360, 180),
    setDexSearch, renderOnce: render, targetFrameMs, ensureWorldGroundCache,
    worldGroundTileAt, wornPathOrientation, fishingRodGeometry,
    treeRenderJitter, landmarkCastsShadow, updateOverworld,
  };
  if (typeof window !== 'undefined') window.__KANJIGO_DEBUG = debugApi;
  if (typeof module !== 'undefined') module.exports = { _debug: debugApi };
})();
