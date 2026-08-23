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
  const KDB = window.KANJI_DB;
  const CATALOG = window.KANJI_CATALOG || { tiers: {}, bonus: [] };
  const KANJI_BY_CHAR = new Map(Object.values(KDB.KANJI).map((info) => [info.char, info]));
  const TILE = C.TILE, ZOOM = C.ZOOM || 1;
  const MAP_H = TILES.length, MAP_W = TILES[0].length;
  const K = C.TILE_KEYS;
  const BLOCKED = new Set(C.BLOCKED_TILES);

  const cv = document.getElementById('game');
  cv.width = C.CANVAS_W; cv.height = C.CANVAS_H;
  const cx = cv.getContext('2d');
  let VIEW_PX_W = cv.width / ZOOM, VIEW_PX_H = cv.height / ZOOM;
  function resizeCanvas() {
    const viewportW = Math.max(320, window.innerWidth), viewportH = Math.max(240, window.innerHeight);
    const render = C.RENDER || {}, maxW = Math.max(320, render.maxWidth || viewportW), maxH = Math.max(240, render.maxHeight || viewportH);
    const renderScale = Math.min(1, maxW / viewportW, maxH / viewportH);
    cv.width = Math.max(320, Math.round(viewportW * renderScale));
    cv.height = Math.max(240, Math.round(viewportH * renderScale));
    VIEW_PX_W = cv.width / ZOOM;
    VIEW_PX_H = cv.height / ZOOM;
    cx.imageSmoothingEnabled = false;
  }
  resizeCanvas();
  addEventListener('resize', resizeCanvas);
  const JPFONT = '"Yu Gothic","Hiragino Kaku Gothic Pro","Noto Sans JP","MS Gothic",sans-serif';

  // ---------- LOAD ẢNH ----------
  const imgs = {}, imageLoads = {}, failedImages = new Set(); let loadError = null;
  function loadImg(name, src, required = true) {
    if (imgs[name]) return Promise.resolve(imgs[name]);
    if (failedImages.has(name)) return Promise.resolve(null);
    if (imageLoads[name]) return imageLoads[name];
    imageLoads[name] = new Promise((res) => {
      const im = new Image();
      im.onload = () => { imgs[name] = im; delete imageLoads[name]; res(im); };
      im.onerror = () => { failedImages.add(name); if (required) loadError = src; delete imageLoads[name]; res(null); };
      im.src = src;
    });
    return imageLoads[name];
  }
  function monsterImg(id) {
    const name = 'mon_' + id, monster = C.MONSTERS[id];
    if (!imgs[name] && !failedImages.has(name) && monster) loadImg(name, monster.img, false);
    return imgs[name] || null;
  }

  // ---------- TRẠNG THÁI ----------
  let state = 'overworld';   // overworld | battle | dex | lecture | capture | pve
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
  function bindTouchControls() {
    document.querySelectorAll('#touch-controls [data-key]').forEach((button) => {
      const key = button.dataset.key;
      const release = () => { keys[key] = false; button.classList.remove('pressed'); };
      button.addEventListener('pointerdown', (e) => {
        e.preventDefault(); keys[key] = true; button.classList.add('pressed');
        if (button.setPointerCapture) button.setPointerCapture(e.pointerId);
      });
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('lostpointercapture', release);
    });
    document.querySelectorAll('#touch-actions [data-action]').forEach((button) => {
      button.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (button.dataset.action === 'back') { onBack(); return; }
        if (state !== 'overworld') return;
        if (button.dataset.action === 'interact') onSpace();
        if (button.dataset.action === 'dex') openDex();
      });
    });
  }
  bindTouchControls();

  // ---------- 📚 TIẾN ĐỘ HỌC ----------
  const LEARNING_KEY = 'KANJIGO_LEARNING_V1';
  const learning = { total: 0, correct: 0, wrong: 0, streak: 0, best: 0, mastery: {}, captureAttempts: {}, academyDraft: null, badges: {} };
  const legacyMasteryKeys = new Set();
  const legacyPetProgress = {};
  const GAME_KEY = 'KANJIGO_GAME_V1';
  let stamina = C.CAPTURE.stamina;
  let pveResult = null;

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
    if (testUnlockedTiers.map((value) => String(value).toUpperCase()).includes(id)) return true;
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
    const K = C.KLEVEL, thresholds = K.thresholds || [null, 0], value = Math.max(0, Number(mp) || 0);
    let level = 1;
    for (let i = 1; i <= K.maxLevel; i++) if (value >= Number(thresholds[i] || 0)) level = i;
    return Math.max(1, Math.min(K.maxLevel, level));
  }
  function mpFloorOfLevel(level) {
    const lv = Math.max(1, Math.min(C.KLEVEL.maxLevel, Number(level) || 1));
    return Number(C.KLEVEL.thresholds[lv] || 0);
  }
  function levelLabel(level) {
    const labels = C.KLEVEL.labels || {}, lv = Math.max(1, Math.min(C.KLEVEL.maxLevel, Number(level) || 1));
    const eligible = Object.keys(labels).map(Number).filter((key) => key <= lv).sort((a, b) => a - b);
    return eligible.length ? labels[eligible[eligible.length - 1]] : '';
  }
  function newMastery(char) {
    const starter = C.MONSTERS[C.PET.monId] && C.MONSTERS[C.PET.monId].kanji;
    return { correct: 0, wrong: 0, box: 0, nextReview: 0,
      mp: 0, level: 1, recall: 100, winStreak: 0, lossStreak: 0, bestWinStreak: 0,
      captured: char === starter, lectured: char === starter };
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
      for (const key of ['total', 'correct', 'wrong', 'streak', 'best']) {
        if (Number.isFinite(saved[key]) && saved[key] >= 0) learning[key] = saved[key];
      }
      learning.mastery = migrateMastery(saved.mastery);
      if (saved.captureAttempts && typeof saved.captureAttempts === 'object') learning.captureAttempts = saved.captureAttempts;
      if (saved.academyDraft && typeof saved.academyDraft === 'object') learning.academyDraft = saved.academyDraft;
      if (saved.badges && typeof saved.badges === 'object') learning.badges = { ...saved.badges };
      saveLearning();
    } catch (e) { console.warn('[KanjiGO] Không đọc được tiến độ học.', e); }
  }
  function saveLearning() {
    if (!C.LEARNING || C.LEARNING.persist === false) return;
    try { localStorage.setItem(LEARNING_KEY, JSON.stringify(learning)); } catch (e) { /* storage có thể bị chặn khi chạy file:// */ }
  }
  function questionKey(q) { return `${q.word}|${q.target}|${q.answer}|${q.type}`; }
  function questionScore(q) {
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
  function srsPromote(kanji, now = Date.now()) {
    const s = ensureMastery(kanji);
    s.box = Math.min(5, s.box + 1);
    s.nextReview = now + (C.SRS.boxIntervals[s.box] || 0);
    saveLearning();
    return s;
  }
  function srsDemote(kanji, now = Date.now()) {
    const s = ensureMastery(kanji);
    s.box = Math.max(0, s.box - 1);
    s.nextReview = now + (C.SRS.boxIntervals[s.box] || 0);
    saveLearning();
    return s;
  }
  function recordAnswer(q, isCorrect) {
    const s = ensureMastery(q.target);
    learning.total++;
    if (isCorrect) { learning.correct++; learning.streak++; s.correct++; learning.best = Math.max(learning.best, learning.streak); }
    else { learning.wrong++; learning.streak = 0; s.wrong++; }
    if (isCorrect) srsPromote(q.target); else srsDemote(q.target);
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
    saveLearning();
    return { kanji: resolveKanji(kanji), mpGain, beforeLevel, level: s.level, leveledUp: s.level > beforeLevel,
      streakMult, rustMult, winStreak: s.winStreak, encounter: encounterCtx };
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
    saveLearning();
    return { kanji: resolveKanji(kanji), chained, recall: s.recall, mp: s.mp, level: s.level, lossStreak: s.lossStreak };
  }
  function reappearWeight(kanji, now = Date.now()) {
    const s = ensureMastery(kanji);
    let weight = 1 + (100 - s.recall) / 50;
    if (isDue(kanji, now)) weight *= 1.5;
    if (C.MONSTERS[currentPetId] && C.MONSTERS[currentPetId].kanji === resolveKanji(kanji)) weight *= 2;
    return weight;
  }
  function learningAccuracy() { return learning.total ? Math.round(learning.correct / learning.total * 100) : 0; }
  loadLearning();
  for (const info of Object.values(KDB.KANJI)) ensureMastery(info.char);
  saveLearning();

  // 🐾 PET + tiến trình
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
  // petData[monId] = {evolveStage}. Có mặt = đã thu thập; level/MP nằm ở mastery[kanji].
  const petData = {};
  function saveGame() {
    try { localStorage.setItem(GAME_KEY, JSON.stringify({ petData, currentPetId, stamina })); } catch (e) { /* file:// có thể khóa storage */ }
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
        if (C.MONSTERS[saved.currentPetId] && petData[saved.currentPetId]) currentPetId = saved.currentPetId;
        if (Number.isFinite(saved.stamina)) stamina = Math.max(0, Math.min(C.CAPTURE.stamina, saved.stamina));
      }
    } catch (e) { /* fallback giữ state mặc định */ }
  }
  petData[currentPetId] = { evolveStage: 0 };
  loadGame();
  function migrateLegacyPetProgress() {
    for (const [id, old] of Object.entries(legacyPetProgress)) {
      const info = C.MONSTERS[id]; if (!info) continue;
      const s = ensureMastery(info.kanji);
      if (!legacyMasteryKeys.has(info.kanji) && s.mp > 0) continue;
      const oldLevel = Math.max(1, Math.min(C.LEVEL.maxLevel, old.level));
      const floor = mpFloorOfLevel(Math.min(C.KLEVEL.maxLevel, oldLevel));
      const next = oldLevel >= C.KLEVEL.maxLevel ? floor : mpFloorOfLevel(Math.min(C.KLEVEL.maxLevel, oldLevel + 1));
      const oldNeed = Math.max(1, oldLevel * C.LEVEL.expPerLevel);
      const progress = Math.max(0, Math.min(1, old.exp / oldNeed));
      s.mp = Math.max(s.mp, Math.round(floor + (next - floor) * progress));
      s.level = levelFromMp(s.mp);
    }
  }
  migrateLegacyPetProgress();
  // Seed pet từ config cho cả profile mới và save cũ; chỉ nâng tới mức tối thiểu đã cấu hình.
  for (const seed of C.INITIAL_PETS || []) {
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
  // Save cũ có pet thì xem như chữ tương ứng đã thu phục.
  for (const id of Object.keys(petData)) {
    if (C.MONSTERS[id]) ensureMastery(C.MONSTERS[id].kanji).captured = true;
  }
  // Starter luôn mở để người chơi có thể vào bụi cỏ và hồi thể lực.
  ensureMastery(C.MONSTERS[currentPetId].kanji).captured = true;
  saveLearning(); saveGame();
  const petLevel = () => ensureMastery(C.MONSTERS[currentPetId].kanji).level;
  const petMastery = () => ensureMastery(C.MONSTERS[currentPetId].kanji);

  // ---------- INPUT ----------
  addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    keys[k] = true;
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    if (state === 'lecture' && ['backspace', 'tab'].includes(k)) e.preventDefault();
    if (state === 'overworld') {
      if (e.key === ' ') onSpace();
      if (k === 'd') openDex();
    } else if (state === 'battle') onBattleKey(k);
    else if (state === 'dex') onDexKey(k);
    else if (state === 'lecture') onLectureKey(k);
    else if (state === 'capture') onCaptureKey(k);
    else if (state === 'pve') onPveKey(k);
  });
  addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
  function onBack() {
    if (state === 'battle') tryRun();
    else if (state === 'dex') onDexKey('escape');
    else if (state === 'lecture') onLectureKey('escape');
    else if (state === 'capture') onCaptureKey('escape');
    else if (state === 'pve') onPveKey('escape');
  }
  cv.addEventListener('pointerdown', (e) => {
    const r = cv.getBoundingClientRect();
    const x = (e.clientX - r.left) * cv.width / r.width;
    const y = (e.clientY - r.top) * cv.height / r.height;
    if (state === 'dex') { e.preventDefault(); onDexPointerDown(x, y, e.pointerId); return; }
    if (state === 'lecture') { onLecturePointerDown(x, y, e.pointerId); return; }
    const quiz = state === 'battle' ? battle : state === 'capture' ? capture : state === 'pve' ? pve : null;
    if (!quiz) return;
    if (quiz.phase === 'end') {
      if (state === 'battle') onBattleKey('enter');
      else if (state === 'capture') onCaptureKey('enter');
      else onPveKey('enter');
      return;
    }
    if (quiz.phase !== 'fight') return;
    const panelY = cv.height - ((C.UI && C.UI.panelH) || 200);
    const bh = (C.UI && C.UI.answerH) || 36, gap = (C.UI && C.UI.answerGapY) || 8;
    const startY = panelY + 96, P = 22, bw = (cv.width - P * 2) / 2 - 10;
    if (y < startY || y > startY + 2 * bh + gap) return;
    const col = x >= P + bw + 20 ? 1 : 0;
    const row = y >= startY + bh + gap ? 1 : 0;
    const idx = row * 2 + col;
    if (x >= P + col * (bw + 20) && x <= P + col * (bw + 20) + bw && idx < quiz.q.options.length) {
      if (state === 'battle') answer(idx);
      else if (state === 'capture') answerCapture(idx);
      else answerPve(idx);
    }
  });
  cv.addEventListener('pointermove', (e) => {
    if (state === 'dex' && dex.drag && dex.drag.pointerId === e.pointerId) {
      e.preventDefault();
      const r = cv.getBoundingClientRect(), y = (e.clientY - r.top) * cv.height / r.height;
      const delta = dex.drag.lastY - y;
      if (Math.abs(y - dex.drag.startY) > 5) dex.drag.moved = true;
      dex.scrollY += delta; dex.drag.lastY = y; clampDexScroll(); return;
    }
    if (state === 'lecture' && lecture && lecture.phase === 'picker' && lecture.pickerDrag && lecture.pickerDrag.pointerId === e.pointerId) {
      e.preventDefault();
      const r = cv.getBoundingClientRect(), scale = lecture.uiScale || 1;
      const y = (e.clientY - r.top) * cv.height / r.height / scale, drag = lecture.pickerDrag;
      if (Math.abs(y - drag.startY) > 5) drag.moved = true;
      lecture.pickerScrollY += drag.lastY - y; drag.lastY = y; clampAcademyPickerScroll();
    }
  });
  function endCanvasDrag(e, cancelled = false) {
    if (dex.drag && (!e || dex.drag.pointerId === e.pointerId)) dex.drag = null;
    if (!lecture || !lecture.pickerDrag || (e && lecture.pickerDrag.pointerId !== e.pointerId)) return;
    const drag = lecture.pickerDrag; lecture.pickerDrag = null;
    if (!cancelled && !drag.moved && drag.hit && drag.hit.action === 'pick') startAcademyLesson(drag.hit.value);
  }
  cv.addEventListener('pointerup', (e) => endCanvasDrag(e));
  cv.addEventListener('pointercancel', (e) => endCanvasDrag(e, true));
  cv.addEventListener('wheel', (e) => {
    if (state === 'dex') { e.preventDefault(); dex.scrollY += e.deltaY; clampDexScroll(); return; }
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
    if (hit.action === 'menu') selectAcademyMenu(hit.value.action, hit.value.char);
    else if (hit.action === 'pick') startAcademyLesson(hit.value);
    else if (hit.action === 'picker_group') { lecture.group = hit.value; lecture.pickerSel = 0; lecture.pickerScrollY = 0; }
    else if (hit.action === 'picker_sort') cycleAcademySort();
    else if (hit.action === 'answer') answerLecture(hit.value);
    else if (hit.action === 'continue') academyNextStep();
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

  // ---------- OVERWORLD ----------
  const delta = (d) => ({ down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[d]);
  function tileAt(gx, gy) { return (gx < 0 || gy < 0 || gx >= MAP_W || gy >= MAP_H) ? -1 : TILES[gy][gx]; }
  function canWalk(gx, gy) {
    const t = tileAt(gx, gy);
    if (t < 0) return false;
    if (NPCS.some((n) => n.gx === gx && n.gy === gy)) return false;
    if (player.onBoat) return t === K.WATER || t === K.BOAT;
    return !BLOCKED.has(t);
  }
  function tryMove(dir) {
    player.facing = dir;
    const [dx, dy] = delta(dir);
    const nx = player.gx + dx, ny = player.gy + dy;
    if (!canWalk(nx, ny)) return;
    player.running = !player.onBoat && !!keys.shift;
    player.moveDuration = player.running ? (C.RUN_MOVE_MS || C.MOVE_MS * 0.62) : C.MOVE_MS;
    player.moving = true; player.moveT = 0;
    player.fromX = player.px; player.fromY = player.py;
    player.toX = nx * TILE; player.toY = ny * TILE;
    player.gx = nx; player.gy = ny;
  }
  function onStepComplete() {
    const t = tileAt(player.gx, player.gy);
    if (player.onBoat) {
      if (t === K.WATER) {
        if (!availableSpawn('water').length) showNoCapturedEncounter();
        else if (Math.random() < C.ENCOUNTER.SURF) startBattle('water');
      }
    } else if (t === K.TALLGRASS) {
      if (!availableSpawn('grass').length) showNoCapturedEncounter();
      else if (Math.random() < C.ENCOUNTER.TALLGRASS) startBattle('grass');
    }
  }
  function frontTile() { const [dx, dy] = delta(player.facing); return { gx: player.gx + dx, gy: player.gy + dy, t: tileAt(player.gx + dx, player.gy + dy) }; }
  function npcInFront() { const f = frontTile(); return NPCS.find((n) => n.gx === f.gx && n.gy === f.gy) || null; }
  function onSpace() {
    if (fishing) return;
    if (dialog.active) { dialog.idx++; if (dialog.idx >= dialog.npc.lines.length) { dialog.active = false; dialog.npc = null; } return; }
    const npc = npcInFront();
    if (npc && npc.type === 'lecture') { enterLecture(); return; }
    if (npc && npc.type === 'pve') { startPve(); return; }
    if (npc && npc.type === 'gym') { startGym(npc.tier || 'N5'); return; }
    if (npc) { dialog.active = true; dialog.idx = 0; dialog.npc = npc; return; }
    if (player.moving) return;
    const f = frontTile();
    if (!player.onBoat && f.t === K.ACADEMY_DOOR) { enterLecture(); return; }
    if (!player.onBoat && f.t === K.BOAT) { board(f); return; }
    if (player.onBoat && f.t >= 0 && f.t !== K.WATER && f.t !== K.BOAT && !BLOCKED.has(f.t)) { disembark(f); return; }
    if (!player.onBoat && f.t === K.WATER) { fish(); return; }
  }
  function board(f) { player.onBoat = true; player.gx = f.gx; player.gy = f.gy; player.px = f.gx * TILE; player.py = f.gy * TILE; resetPetTrail(); showToast('🚤 Đã lên thuyền!'); }
  function disembark(f) { player.onBoat = false; player.gx = f.gx; player.gy = f.gy; player.px = f.gx * TILE; player.py = f.gy * TILE; resetPetTrail(); showToast('🚶 Đã lên bờ.'); }
  function showNoCapturedEncounter() { showToast(C.ENCOUNTER.noCapturedMessage); }
  function fish() {
    if (!availableSpawn('water').length) { showNoCapturedEncounter(); return; }
    const f = frontTile();
    fishing = { t: 0, phase: 'cast', caught: Math.random() < C.ENCOUNTER.FISH, gx: f.gx, gy: f.gy };
    // Giữ nguyên pose đứng trong suốt lượt câu; animation bước chân làm điểm cầm cần bị trượt.
    player.frame = 0; player.animT = 0; player.running = false;
    showToast('🎣 Vung cần...');
  }

  function updateFishing(dt) {
    if (!fishing) return;
    player.frame = 0;
    const F = C.FISHING || { castMs: 320, waitMs: 900, reelMs: 420 };
    const before = fishing.t; fishing.t += dt;
    if (before < F.castMs && fishing.t >= F.castMs) {
      fishing.phase = 'wait'; showToast('🎣 Phao đang rung...');
    }
    if (before < F.castMs + F.waitMs && fishing.t >= F.castMs + F.waitMs) {
      fishing.phase = 'reel';
      showToast(fishing.caught ? '🎣 Có gì cắn câu!' : '🎣 Kéo cần lên...');
    }
    if (fishing.t < F.castMs + F.waitMs + F.reelMs) return;
    const caught = fishing.caught; fishing = null; player.frame = 0;
    if (caught) startBattle('water'); else showToast('🎣 Chưa câu được gì, thử lại nhé.');
  }

  // ---------- 🐾 SCALE THEO MASTERY ----------
  function expNeed(lv) { return lv * C.LEVEL.expPerLevel; } // giữ API tương thích save/debug cũ
  function petSizeFor(level, base = C.PET.size) {
    const K = C.KLEVEL;
    return Math.min(K.petSizeMax, base + K.petSizePerLevel * (Math.max(1, level) - 1));
  }
  function playerMaxHpFor(level) {
    return C.PLAYER.maxHp + (C.KLEVEL.hpAppliesTo === 'player' ? C.KLEVEL.hpPerLevel * (Math.max(1, level) - 1) : 0);
  }
  function syncPlayerScale(kanji, heal = false) {
    const level = typeof kanji === 'number' ? kanji : ensureMastery(kanji).level;
    player.maxHp = playerMaxHpFor(level);
    player.hp = heal ? player.maxHp : Math.min(player.hp, player.maxHp);
  }

  // ---------- ⚔️ COMBAT REALTIME (quiz kanji) ----------
  let battle = null;
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
  function grassWeight(char, now = Date.now()) {
    return reappearWeight(char, now);
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
    const weights = pool.map((id) => reappearWeight(C.MONSTERS[id].kanji));
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < pool.length; i++) { roll -= weights[i]; if (roll <= 0) return pool[i]; }
    return pool[pool.length - 1];
  }
  function shuffle(options) { for (let i = options.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [options[i], options[j]] = [options[j], options[i]]; } return options; }
  function chooseMode() {
    const weights = (C.QUESTION_MODES && C.QUESTION_MODES.weights) || { m1: 1 };
    const entries = Object.entries(weights).filter(([, weight]) => Number(weight) > 0);
    const total = entries.reduce((sum, [, weight]) => sum + Number(weight), 0);
    let roll = Math.random() * total;
    for (const [mode, weight] of entries) { roll -= Number(weight); if (roll <= 0) return mode; }
    return 'm1';
  }
  function optionSet(correct, values, count = 4) {
    const opts = new Set([correct]);
    for (const value of values.sort(() => Math.random() - 0.5)) { if (value && value !== correct) opts.add(value); if (opts.size >= count) break; }
    return shuffle([...opts]);
  }
  // Sinh câu hỏi đa hướng; SRS vẫn chỉ ghi nhận theo q.target.
  function makeQuestion(monKanji, previousKey = '', modeOverride = '', fair = false) {
    if (typeof previousKey === 'number') { modeOverride = `m${previousKey}`; previousKey = ''; }
    if (typeof previousKey === 'string' && /^m[1-5]$/.test(previousKey)) { modeOverride = previousKey; previousKey = ''; }
    let pool = KDB.QUESTIONS.filter((q) => q.target === monKanji);
    if (pool.length === 0) pool = KDB.QUESTIONS;
    if (C.LEARNING && C.LEARNING.avoidRepeat && pool.length > 1) {
      const withoutPrevious = pool.filter((q) => questionKey(q) !== previousKey && `${previousKey}`.indexOf(`|${questionKey(q)}`) < 0);
      if (withoutPrevious.length) pool = withoutPrevious;
    }
    // Câu có điểm thấp là câu người học đang yếu; random trong nhóm yếu nhất
    // để vừa ôn trọng tâm vừa tránh một thứ tự hoàn toàn cố định.
    const scores = pool.map(questionScore), minScore = Math.min(...scores);
    const weakPool = pool.filter((q) => questionScore(q) <= minScore + 1);
    const q = (fair ? pool : weakPool)[Math.floor(Math.random() * (fair ? pool : weakPool).length)];
    let mode = modeOverride || chooseMode();
    const infos = Object.values(KDB.KANJI);
    const otherInfos = infos.filter((info) => info.char !== q.target && ensureMastery(info.char).captured);
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
      const words = KDB.QUESTIONS.filter((item) => item.target !== q.target).map((item) => item.word);
      if (new Set(words).size < 3) mode = 'm1';
      else { answer = q.word; options = optionSet(answer, words); }
    }
    if (mode === 'm6') {
      const readings = KDB.QUESTIONS.filter((item) => item !== q && item.wordReading).map((item) => item.wordReading);
      if (!q.wordReading || new Set(readings).size < 3) mode = 'm1';
      else { answer = q.wordReading; options = optionSet(answer, readings); }
    }
    if (mode === 'm7') {
      const meanings = KDB.QUESTIONS.filter((item) => item !== q && item.mean).map((item) => item.mean);
      if (!q.mean || new Set(meanings).size < 3) mode = 'm1';
      else { answer = q.mean; options = optionSet(answer, meanings); }
    }
    if (mode === 'm1') { answer = q.answer; options = optionSet(answer, KDB.DISTRACTORS.slice()); }
    const result = { word, mean, target: q.target, answer, romaji: q.romaji, type, mode, options, correctIndex: options.indexOf(answer),
      wordReading: q.wordReading || '', wordRomaji: q.wordRomaji || '', parts: Array.isArray(q.parts) ? q.parts.map((part) => ({ ...part })) : [] };
    result.key = `${mode}|${questionKey(q)}`;
    return result;
  }
  function questionCorrection(q) {
    if (q.mode === 'm6') return `「${q.word}」 đọc là「${q.answer}」${q.wordRomaji ? ` (${q.wordRomaji})` : ''}`;
    if (q.mode === 'm7') return `「${q.word}」 nghĩa là “${q.answer}”`;
    return `${q.target} ở đây đọc「${q.answer}」${q.romaji ? ` (${q.romaji})` : ''} — âm ${q.type.toUpperCase()}`;
  }

  function startBattle(kind) {
    const monId = pickMonster(kind);
    if (!monId) { showNoCapturedEncounter(); return false; }
    monsterImg(monId); // bắt đầu decode trước frame battle đầu tiên
    const m = C.MONSTERS[monId];
    const kanjiLevel = ensureMastery(m.kanji).level;
    const levelDamage = C.COMBAT.baseDamage + C.KLEVEL.dmgPerLevel * (kanjiLevel - 1);
    const battleMaxHp = Math.max(m.maxHp, Math.ceil(levelDamage * (C.COMBAT.enemyHpPerDamage || 1)));
    syncPlayerScale(m.kanji, true);
    state = 'battle';
    const attackCycleMs = rnd([C.COMBAT.botMinMs, C.COMBAT.botMaxMs]);
    battle = {
      kind, monId, mon: m, monHp: battleMaxHp, monMaxHp: battleMaxHp,
      grassKanji: kind === 'grass' ? m.kanji : null,
      kanjiLevel,
      q: makeQuestion(m.kanji),
      feedback: null, fbT: 0, qCooldown: 0, retryQuestion: false, stun: 0, combo: 0, energy: 0,
      botNextIn: attackCycleMs, botCycleMs: attackCycleMs, questionElapsed: 0,
      shake: 0, flash: 0, botFlash: 0, hitStop: 0,
      petAttackT: 0, enemyAttackT: 0, enemyHitT: 0, playerHitT: 0,
      perfectT: 0, skillT: 0, skillName: '', particles: [], damageNumbers: [],
      pendingWin: 0, pendingLose: 0,
      phase: 'fight', result: null, endMsg: '', counted: false,
    };
    return true;
  }

  function onBattleKey(k) {
    if (!battle) return;
    if (battle.phase === 'end') { if (k === ' ' || k === 'enter') endBattle(); return; }
    if (k === 'escape') { tryRun(); return; }
    if (['1', '2', '3', '4'].includes(k)) answer(parseInt(k, 10) - 1);
  }

  function answer(idx) {
    if (battle.phase !== 'fight' || battle.stun > 0 || battle.qCooldown > 0) return;
    const q = battle.q;
    if (idx === q.correctIndex) {
      recordAnswer(q, true);
      battle.retryQuestion = false;
      battle.combo++;
      battle.energy = Math.min(C.COMBAT.energyMax || 3, battle.energy + 1);
      const perfect = battle.questionElapsed <= (C.COMBAT.perfectMs || 2000);
      const special = battle.energy >= (C.COMBAT.energyMax || 3);
      const baseDmg = C.COMBAT.baseDamage + C.KLEVEL.dmgPerLevel * (battle.kanjiLevel - 1) + battle.combo * C.COMBAT.comboBonus;
      const dmg = special ? Math.round(baseDmg * (C.COMBAT.specialMultiplier || 1.5)) : baseDmg;
      battle.monHp = Math.max(0, battle.monHp - dmg);
      const push = perfect ? (C.COMBAT.perfectGaugePush || .35) : (C.COMBAT.gaugePush || .2);
      battle.botNextIn = Math.min(battle.botCycleMs, battle.botNextIn + battle.botCycleMs * push);
      battle.feedback = { good: true, text: `${perfect ? '⚡ PERFECT! ' : '✓ Đúng! '}${q.target} — ${q.answer}  (-${dmg} HP)` };
      battle.fbT = 900; battle.qCooldown = special ? 1050 : 700;
      battle.shake = 220; battle.enemyHitT = 300; battle.petAttackT = special ? 650 : 460;
      battle.petAttackTotal = battle.petAttackT;
      battle.hitStop = C.COMBAT.hitStopMs || 70;
      battle.perfectT = perfect ? 800 : 0;
      battle.damageNumbers.push({ text: `-${dmg}`, side: 'enemy', t: 900, total: 900, color: special ? '#7ff7ff' : '#ffd54a' });
      if (special) {
        battle.energy = 0;
        battle.skillKanji = (C.MONSTERS[currentPetId] || {}).kanji || q.target;
        battle.skillName = `${battle.skillKanji}・${currentPetId === 'fish' ? '水流撃' : '連続撃'}`;
        battle.skillT = 1000;
        battle.particles = makeBattleParticles(currentPetId === 'fish' ? 'water' : battle.kind, 26);
      }
      if (battle.monHp <= 0) { battle.pendingWin = special ? 850 : 520; return; }
    } else {
      recordAnswer(q, false);
      battle.combo = 0;
      battle.stun = C.COMBAT.wrongStun;
      battle.qCooldown = C.COMBAT.wrongStun;
      battle.retryQuestion = true;
      battle.fbT = C.COMBAT.wrongStun;
      battle.feedback = { good: false, text: `✗ Sai! ${questionCorrection(q)}` };
      enemyAttack(battle, 'Sai đáp án');
    }
  }

  function resetAttackGauge(b) {
    b.botCycleMs = rnd([C.COMBAT.botMinMs, C.COMBAT.botMaxMs]);
    b.botNextIn = b.botCycleMs;
  }
  function enemyAttack(b, reason = '') {
    if (!b || b.phase !== 'fight' || b.pendingLose > 0) return;
    const dmg = rnd(b.mon.atk);
    player.hp = Math.max(0, player.hp - dmg);
    b.flash = 180; b.botFlash = 320; b.enemyAttackT = 520; b.enemyAttackTotal = 520; b.playerHitT = 360;
    b.damageNumbers.push({ text: `-${dmg}`, side: 'player', t: 900, total: 900, color: '#ff8585' });
    b.playerHitMsg = `${b.mon.name} tấn công! -${dmg} HP`;
    if (reason && !b.feedback) { b.feedback = { good: false, text: `⚠ ${reason} — ${b.playerHitMsg}` }; b.fbT = 1000; }
    resetAttackGauge(b);
    if (player.hp <= 0) b.pendingLose = 520;
  }
  function timeoutQuestion(b) {
    if (!b || b.qCooldown > 0 || b.stun > 0) return;
    recordAnswer(b.q, false);
    b.combo = 0;
    b.stun = C.COMBAT.wrongStun;
    b.qCooldown = C.COMBAT.wrongStun;
    b.retryQuestion = true;
    b.fbT = C.COMBAT.wrongStun;
    b.feedback = { good: false, text: `⌛ Hết giờ! ${questionCorrection(b.q)} — quái phản công!` };
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
    const masteryResult = awardWin(battle.mon.kanji, { kind: battle.kind, monId: battle.monId });
    // thu thập monster vào Dex (nếu chưa có)
    if (!isCollected(battle.monId)) collect(battle.monId);
    if (battle.kind === 'grass') {
      stamina = Math.min(C.CAPTURE.stamina, stamina + C.CAPTURE.staminaRegenPerGrassWin);
      saveGame();
      showToast(`+${masteryResult.mpGain} MP • Thể lực +${C.CAPTURE.staminaRegenPerGrassWin}`);
    }
    const levelText = masteryResult.leveledUp ? ` — LV UP! Lv.${masteryResult.beforeLevel} → Lv.${masteryResult.level} (${levelLabel(masteryResult.level)})` : '';
    battle.endMsg = `🎉 Thắng ${battle.mon.name}! 「${battle.mon.kanji}」 +${masteryResult.mpGain} MP${levelText}${masteryResult.level >= C.KLEVEL.maxLevel ? ' • MASTERED ✦' : ''}  •  📚 Chính xác: ${learningAccuracy()}%`;
  }
  function lose() {
    if (battle.counted) return;
    battle.counted = true;
    battle.phase = 'end'; battle.result = 'lose';
    const masteryResult = awardLoss(battle.mon.kanji);
    player.hp = player.maxHp;
    battle.endMsg = `💀 Bạn gục ngã... 「${battle.mon.kanji}」 Recall ${masteryResult.recall}% — MP/Level được bảo toàn${masteryResult.chained ? ' (đã phạt chuỗi thua)' : ''}. Hồi máu.  •  📚 Chính xác: ${learningAccuracy()}%`;
  }
  function tryRun() {
    if (Math.random() < C.COMBAT.runChance) { battle.phase = 'end'; battle.result = 'run'; battle.endMsg = '💨 Chạy thoát thành công!'; }
    else { battle.feedback = { good: false, text: '💨 Không thoát được!' }; battle.fbT = 900; }
  }
  function endBattle() { state = 'overworld'; battle = null; }

  function isCollected(id) { return !!petData[id]; }
  function collect(id) { if (!petData[id]) petData[id] = { evolveStage: 0 }; saveGame(); }

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
  function academyUnlockedCount() { return academyDexList().filter((info) => ensureMastery(info.char).captured).length; }
  function academyEligibility(info) {
    if (!isTierUnlocked(tierOfKanji(info && info.char))) return `Cần huy hiệu ${((CATALOG.tiers || {})[tierOfKanji(info && info.char)] || {}).requiresBadge || 'trước'}`;
    if (!info || !C.MONSTERS[info.monId]) return 'Thiếu monster asset/config';
    if (!KDB.QUESTIONS.some((q) => q.target === info.char)) return 'Thiếu câu hỏi';
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
    state = 'lecture';
    return true;
  }
  function enterLecture(char = '') {
    if (!char) return openAcademyLobby();
    return startAcademyLesson(resolveKanji(char), true);
  }
  function openAcademyPicker() {
    lecture = { phase: 'picker', pickerSel: 0, pickerScrollY: 0, pickerMaxScroll: 0, pickerDrag: null,
      search: '', group: 'ALL', sort: 'curriculum', message: '', hitboxes: [] };
    state = 'lecture';
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
  function academyPickerLayout(W = cv.width / ((lecture && lecture.uiScale) || 1), H = cv.height / ((lecture && lecture.uiScale) || 1)) {
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
  function academyQuestion(index, previousKey = '') {
    const modes = ['m1', 'm6', 'm7'];
    return makeQuestion(lecture.char, previousKey, modes[index % modes.length]);
  }
  function saveAcademyDraft() {
    if (!lecture || !lecture.char || ensureMastery(lecture.char).captured || lecture.phase === 'summary') return;
    learning.academyDraft = { char: lecture.char, phase: lecture.phase, checkIndex: lecture.checkIndex || 0, lessonScore: lecture.lessonScore || 0 };
    saveLearning();
  }
  function startAcademyLesson(char, resume = false) {
    const target = resolveKanji(char), info = kanjiInfo(target);
    if (!info || ensureMastery(target).captured) { openAcademyLobby('Kanji này đã được unlock hoặc không còn trong dữ liệu.'); return false; }
    const problem = academyEligibility(info);
    if (problem) { openAcademyLobby(`⚠ 「${target}」 chưa thể học: ${problem}.`); return false; }
    const examples = KDB.QUESTIONS.filter((q) => q.target === target).slice(0, 2);
    const s = ensureMastery(target), draft = learning.academyDraft;
    const resumable = ['intro', 'readings', 'examples', 'check'];
    let phase = s.lectured ? 'ready' : 'intro', checkIndex = 0;
    if (resume && draft && resolveKanji(draft.char) === target && resumable.includes(draft.phase)) {
      phase = draft.phase; checkIndex = Math.max(0, Math.min(2, Number(draft.checkIndex) || 0));
    }
    lecture = { char: target, info, examples, phase, checkIndex, lessonScore: resume && draft ? Math.max(0, Number(draft.lessonScore) || 0) : 0,
      q: null, answerLocked: false, feedback: '', message: '', hitboxes: [] };
    if (phase === 'check') lecture.q = academyQuestion(checkIndex);
    state = 'lecture';
    saveAcademyDraft();
    return true;
  }
  function academyNextStep() {
    if (!lecture) return;
    if (lecture.phase === 'intro') lecture.phase = 'readings';
    else if (lecture.phase === 'readings') lecture.phase = 'examples';
    else if (lecture.phase === 'examples') {
      lecture.phase = 'check'; lecture.checkIndex = 0; lecture.q = academyQuestion(0);
      lecture.feedback = ''; lecture.answerLocked = false;
    } else if (lecture.phase === 'check' && lecture.answerLocked) {
      lecture.checkIndex++;
      if (lecture.checkIndex >= 3) finishLecture();
      else {
        const previous = lecture.q && lecture.q.key;
        lecture.q = academyQuestion(lecture.checkIndex, previous);
        lecture.feedback = ''; lecture.answerLocked = false;
      }
    } else if (lecture.phase === 'ready') startCapture(lecture.char);
    else if (lecture.phase === 'summary') openAcademyLobby();
    saveAcademyDraft();
  }
  function answerLecture(idx) {
    if (!lecture || lecture.phase !== 'check' || lecture.answerLocked || !lecture.q) return;
    const correct = idx === lecture.q.correctIndex;
    if (correct) lecture.lessonScore++;
    lecture.answerLocked = true;
    lecture.feedback = correct ? '✓ Chính xác! Kiến thức đã được nạp.' : `✗ Đáp án đúng: ${lecture.q.answer} — đọc lại một lần rồi tiếp tục nhé.`;
  }
  function finishLecture() {
    ensureMastery(lecture.char).lectured = true;
    lecture.phase = 'ready';
    lecture.feedback = `Đã hoàn thành bài học 「${lecture.char}」.`;
    saveAcademyDraft(); saveLearning();
  }
  function onLectureKey(k) {
    if (!lecture) return;
    if (k === 'escape') {
      if (lecture.phase === 'lobby') { state = 'overworld'; lecture = null; }
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
    if (lecture.phase === 'check' && ['1', '2', '3', '4'].includes(k)) { answerLecture(parseInt(k, 10) - 1); return; }
    if (k === ' ' || k === 'enter') academyNextStep();
  }
  function startCapture(char = '') {
    const target = resolveKanji(char || (lecture && lecture.char) || nextLectureKanji()), info = kanjiInfo(target);
    if (!info) return false;
    monsterImg(info.monId);
    const s = ensureMastery(target);
    if (!s.lectured) { showToast('Hãy học chữ này ở giảng đường trước.'); return false; }
    if (s.captured) { showToast('Chữ này đã được thu phục rồi.'); return false; }
    if (stamina <= 0) { showToast('Hết thể lực — ra bụi cỏ luyện chữ cũ để hồi.'); return false; }
    const attempt = (Number(learning.captureAttempts[target]) || 0) + 1;
    learning.captureAttempts[target] = attempt;
    stamina--;
    capture = { char: target, info, attempt, needed: attempt >= C.CAPTURE.relaxFromAttempt ? 3 : 4,
      q: captureQuestion(target, 0), index: 0, correct: 0, phase: 'fight', qCooldown: 0,
      feedback: null, fbT: 0, burstT: 0, hint: attempt >= C.CAPTURE.relaxFromAttempt + 1 };
    state = 'capture';
    saveGame(); saveLearning();
    return true;
  }
  function captureQuestion(target, index, previousKey = '') {
    const modes = ['m1', 'm6', 'm7', 'm6', 'm1'];
    return makeQuestion(target, previousKey, modes[index % modes.length]);
  }
  function finishCapture() {
    const passed = capture.correct >= capture.needed, s = ensureMastery(capture.char);
    if (passed) {
      s.captured = true; s.nextReview = Date.now() + (C.SRS.newlyCapturedDueMs || 0);
      collect(capture.info.monId); saveLearning(); saveGame();
      capture.feedback = `🎉 Thu phục thành công ${capture.char}!`;
      if (learning.academyDraft && resolveKanji(learning.academyDraft.char) === capture.char) learning.academyDraft = null;
    } else {
      capture.feedback = `Chưa đủ điểm (${capture.correct}/5). Hãy luyện chữ cũ để hồi thể lực.`;
    }
    capture.passed = passed;
    capture.endMsg = capture.feedback;
    capture.phase = 'end';
    saveLearning();
  }
  function answerCapture(idx) {
    if (!capture || capture.phase !== 'fight' || capture.qCooldown > 0) return;
    const q = capture.q, correct = idx === q.correctIndex;
    recordAnswer(q, correct);
    if (correct) capture.correct++;
    capture.feedback = correct ? { good: true, text: '✓ Đúng!' } : { good: false, text: `✗ ${q.answer}` };
    capture.fbT = 650; capture.burstT = correct ? 520 : 0; capture.qCooldown = 650; capture.index++;
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
          state = 'lecture';
        } else startAcademyLesson(result.char, true);
      }
      return;
    }
    if (k === 'escape') { state = 'overworld'; capture = null; return; }
    if (['1', '2', '3', '4'].includes(k)) answerCapture(parseInt(k, 10) - 1);
  }

  // ---------- ⛩ PVE MINI TEST ----------
  let pve = null;
  function randomCapturedKanji(tier = '') {
    const pool = capturedKanji(tier);
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  }
  function startPve(options = {}) {
    if (typeof options === 'string') options = { tier: options };
    const tier = String(options.tier || '').toUpperCase(), target = randomCapturedKanji(tier);
    if (!target) { showToast('Chưa có chữ nào được thu phục.'); return false; }
    pve = { index: 0, total: options.questions || C.PVE.questions, correct: 0, combo: 0, bestCombo: 0, phase: 'fight', qCooldown: 0,
      mode: options.mode || 'practice', tier, passRatio: Number(options.passRatio) || 0,
      q: makeQuestion(target, '', '', true), seen: {}, feedback: null, pendingEnd: false };
    state = 'pve'; pveResult = null;
    return true;
  }
  function startGym(tier = 'N5') {
    const id = String(tier).toUpperCase(), gym = C.PROGRESSION && C.PROGRESSION.gym && C.PROGRESSION.gym[id];
    if (!gym) { showToast(`Chưa cấu hình Gym ${id}.`); return false; }
    if (hasBadge(gym.badge || id)) { showToast(`🏅 Bạn đã có huy hiệu ${gym.badge || id}.`); return false; }
    const progress = tierProgress(id);
    if (!isTierStudyComplete(id)) {
      showToast(`🔒 Gym ${id}: cần đủ ${progress.total} chữ (${progress.captured}/${progress.total}, thiếu content ${progress.missing}).`);
      return false;
    }
    return startPve({ mode: 'gym', tier: id, questions: gym.questions, passRatio: gym.passRatio });
  }
  function finishPve() {
    const ratio = pve.correct / pve.total;
    const rank = C.PVE.ranks.find((item) => ratio >= item.min) || C.PVE.ranks[C.PVE.ranks.length - 1];
    const rewards = [];
    for (const char of Object.keys(pve.seen)) {
      const info = kanjiInfo(char);
      if (info) rewards.push({ kanji: char, monId: info.monId });
    }
    let badgeAwarded = '';
    if (pve.mode === 'gym' && ratio >= pve.passRatio) {
      const gym = C.PROGRESSION.gym[pve.tier], badge = gym.badge || pve.tier;
      learning.badges[badge] = true; badgeAwarded = badge; saveLearning();
    }
    pveResult = { grade: rank.grade, ratio, correct: pve.correct, total: pve.total, bestCombo: pve.bestCombo, rewards, badgeAwarded };
    const badgeText = badgeAwarded ? ` • 🏅 Huy hiệu ${badgeAwarded} — đã mở N4!` : (pve.mode === 'gym' ? ' • Chưa đạt Gym' : '');
    pve.endMsg = `KẾT QUẢ: Hạng ${rank.grade} • ${pve.correct}/${pve.total} (${Math.round(ratio * 100)}%) • Combo cao nhất x${pve.bestCombo}${badgeText}`;
    pve.phase = 'end';
  }
  function answerPve(idx) {
    if (!pve || pve.phase !== 'fight' || pve.qCooldown > 0) return;
    const q = pve.q, correct = idx === q.correctIndex;
    recordAnswer(q, correct); pve.seen[q.target] = (pve.seen[q.target] || 0) + 1;
    if (correct) { pve.correct++; pve.combo++; pve.bestCombo = Math.max(pve.bestCombo, pve.combo); }
    else pve.combo = 0;
    pve.feedback = { good: correct, text: correct ? '✓ Đúng!' : `✗ Đáp án: ${q.answer}` };
    pve.qCooldown = 550; pve.index++;
    if (pve.index >= pve.total) pve.pendingEnd = true;
  }
  function onPveKey(k) {
    if (!pve) return;
    if (pve.phase === 'end') { if (k === ' ' || k === 'enter') { state = 'overworld'; pve = null; } return; }
    if (k === 'escape') { state = 'overworld'; pve = null; return; }
    if (['1', '2', '3', '4'].includes(k)) answerPve(parseInt(k, 10) - 1);
  }

  // ---------- 📖 KANJI DEX ----------
  const DEX_SORTS = [
    { id: 'catalog', label: 'LỘ TRÌNH' },
    { id: 'kanji', label: 'KANJI A–Z' },
    { id: 'level', label: 'LEVEL CAO' },
    { id: 'recall', label: 'RECALL CAO' },
  ];
  let dex = { sel: 0, list: [], source: [], sort: 'catalog', group: true, scrollY: 0, maxScroll: 0, hitboxes: [], drag: null };
  // Dex dùng cùng catalog với Giảng đường: đúng thứ tự JLPT và không lộ tier chưa mở.
  function collectedList() { return academyDexList().map((info) => info.char); }
  function refreshDexList(preserveChar = '') {
    const previous = preserveChar || dex.list[dex.sel] || '';
    const catalogIndex = new Map(dex.source.map((char, index) => [char, index]));
    dex.list = [...dex.source].sort((a, b) => {
      if (dex.sort === 'kanji') return a.localeCompare(b, 'ja');
      if (dex.sort === 'level') return ensureMastery(b).level - ensureMastery(a).level || catalogIndex.get(a) - catalogIndex.get(b);
      if (dex.sort === 'recall') return ensureMastery(b).recall - ensureMastery(a).recall || catalogIndex.get(a) - catalogIndex.get(b);
      return catalogIndex.get(a) - catalogIndex.get(b);
    });
    dex.sel = Math.max(0, previous ? dex.list.indexOf(previous) : 0);
    if (dex.sel < 0) dex.sel = 0;
  }
  function openDex() {
    if (dialog.active || player.moving || fishing) return;
    dex.source = collectedList();
    const currentChar = C.MONSTERS[currentPetId] && C.MONSTERS[currentPetId].kanji;
    refreshDexList(currentChar);
    dex.scrollY = 0; dex.drag = null;
    state = 'dex';
    ensureDexSelectionVisible();
  }
  function dexLayout(total) {
    const W = cv.width, H = cv.height, ox = Math.max(18, Math.round(W * 0.024));
    const gapX = Math.max(9, Math.round(W * 0.012)), gapY = 10;
    const minCardW = W < 620 ? 142 : 184;
    const widthCols = Math.floor((W - ox * 2 + gapX) / (minCardW + gapX));
    const cols = Math.max(1, Math.min(5, widthCols));
    const panelH = Math.max(108, Math.min(142, Math.round(H * 0.18)));
    const oy = W < 620 ? 126 : 112, gridBottom = H - panelH - 10;
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
    const rows = []; let y = 0;
    for (const section of dexSections()) {
      if (dex.group) { rows.push({ type: 'header', section, y, h: 30 }); y += 30; }
      for (let start = 0; start < section.list.length; start += layout.cols) {
        rows.push({ type: 'cards', list: section.list.slice(start, start + layout.cols), y, h: layout.cardH });
        y += layout.cardH + layout.gapY;
      }
      y += 8;
    }
    return { rows, height: Math.max(0, y - 8) };
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
    if (hit && hit.action === 'group') { dex.group = !dex.group; dex.scrollY = 0; ensureDexSelectionVisible(); return; }
    if (hit && hit.action === 'card') { dex.sel = hit.value; ensureDexSelectionVisible(); }
    const layout = dexLayout(dex.list.length);
    if (y >= layout.oy && y <= layout.gridBottom) dex.drag = { pointerId, startY: y, lastY: y, moved: false };
  }
  function onDexKey(k) {
    if (k === 'escape' || k === 'd') { state = 'overworld'; return; }
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
    else if (k === 'g') { dex.group = !dex.group; dex.scrollY = 0; ensureDexSelectionVisible(); }
    else if (k === 'enter' || k === ' ') {
      const info = kanjiInfo(dex.list[dex.sel]);
      if (!info || !C.MONSTERS[info.monId] || !ensureMastery(info.char).captured) { showToast('Chưa thu phục — tới 🏛️ Giảng đường trước nhé!'); return; }
      currentPetId = info.monId; resetPetTrail(); saveGame();
      showToast(`🐾 ${C.MONSTERS[currentPetId].name} đang đi cùng bạn!`);
      state = 'overworld';
    }
    ensureDexSelectionVisible();
  }

  // ---------- VÒNG LẶP ----------
  let last = 0;
  function loop(t) {
    const dt = Math.min(50, t - last); last = t;
    if (state === 'overworld') updateOverworld(dt);
    else if (state === 'battle') updateBattle(dt);
    else if (state === 'capture') updateCapture(dt);
    else if (state === 'pve') updatePve(dt);
    if (toast.t > 0) toast.t -= dt;
    render();
    requestAnimationFrame(loop);
  }
  function updateOverworld(dt) {
    if (dialog.active) return;
    if (fishing) { updateFishing(dt); return; }
    if (player.moving) {
      player.moveT += dt; const k = Math.min(1, player.moveT / player.moveDuration);
      player.px = player.fromX + (player.toX - player.fromX) * k;
      player.py = player.fromY + (player.toY - player.fromY) * k;
      const animMs = player.running ? (C.RUN_ANIM_MS || C.ANIM_MS * 0.6) : C.ANIM_MS;
      player.animT += dt; if (player.animT >= animMs) { player.animT = 0; player.frame = (player.frame + 1) % C.FRAMES; }
      if (k >= 1) { player.moving = false; player.running = false; player.frame = 0; onStepComplete(); }
    } else {
      if (pressed('left')) tryMove('left');
      else if (pressedRight()) tryMove('right');
      else if (pressed('up')) tryMove('up');
      else if (pressed('down')) tryMove('down');
      else player.frame = 0;
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
    b.damageNumbers = (b.damageNumbers || []).filter((n) => { n.t -= dt; return n.t > 0; });
    b.particles = (b.particles || []).filter((p) => {
      p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += .00000055 * dt;
      return p.t > 0;
    });
    if (b.pendingWin > 0) { b.pendingWin -= dt; if (b.pendingWin <= 0) win(); }
    if (b.pendingLose > 0) { b.pendingLose -= dt; if (b.pendingLose <= 0) lose(); }
    if (b.phase !== 'fight') return;
    if (b.stun > 0) b.stun -= dt;
    if (b.fbT > 0) b.fbT -= dt;
    if (b.qCooldown > 0) {
      b.qCooldown -= dt;
      if (b.qCooldown <= 0 && b.monHp > 0 && !b.pendingLose) {
        // Sau khi bị quái phản công, cho người học làm lại đúng câu vừa sai.
        // Chỉ câu trả lời đúng mới chuyển sang kiến thức tiếp theo.
        if (!b.retryQuestion) b.q = makeQuestion(b.mon.kanji, b.q.key);
        b.retryQuestion = false;
        b.questionElapsed = 0;
        b.feedback = null;
      }
    } else if (!b.pendingWin && !b.pendingLose) {
      b.questionElapsed += dt;
      b.botNextIn -= dt;
      if (b.botNextIn <= 0) timeoutQuestion(b);
    }
  }
  function updateCapture(dt) {
    if (!capture || capture.phase !== 'fight') return;
    if (capture.fbT > 0) capture.fbT -= dt;
    if (capture.burstT > 0) capture.burstT -= dt;
    if (capture.qCooldown > 0) {
      capture.qCooldown -= dt;
      if (capture.qCooldown <= 0) {
        if (capture.pendingEnd) finishCapture();
        else capture.q = captureQuestion(capture.char, capture.index, capture.q.key);
      }
    }
  }
  function updatePve(dt) {
    if (!pve || pve.phase !== 'fight') return;
    if (pve.qCooldown > 0) {
      pve.qCooldown -= dt;
      if (pve.qCooldown <= 0) {
        if (pve.pendingEnd) finishPve();
        else { const target = randomCapturedKanji(pve.tier); pve.q = makeQuestion(target, pve.q.key, '', true); }
      }
    }
  }

  // ---------- VẼ ----------
  function drawTile(idx, sx, sy) { cx.drawImage(imgs.tileset, idx * TILE, 0, TILE, TILE, sx, sy, TILE, TILE); }
  function drawSprite(img, dir, frame, sx, sy) { cx.drawImage(img, frame * TILE, C.DIR_ROW[dir] * TILE, TILE, TILE, sx, sy, TILE, TILE); }
  function drawGroundDetail(idx, sx, sy, gx, gy, now) {
    if (idx === K.WATER) {
      const wave = (now / 180 + gx * 7 + gy * 11) % 18;
      cx.strokeStyle = 'rgba(180,235,255,.38)'; cx.lineWidth = 1;
      cx.beginPath(); cx.moveTo(sx + 3 + wave, sy + 9); cx.lineTo(sx + 10 + wave, sy + 9); cx.stroke();
      cx.beginPath(); cx.moveTo(sx + 18 - wave / 2, sy + 24); cx.lineTo(sx + 25 - wave / 2, sy + 24); cx.stroke();
    } else if (idx === K.PATH && ((gx * 13 + gy * 7) % 5 === 0)) {
      cx.fillStyle = 'rgba(120,92,52,.22)'; cx.fillRect(sx + 7, sy + 21, 2, 1); cx.fillRect(sx + 23, sy + 8, 1, 2);
    } else if (idx === K.GRASS && ((gx * 17 + gy * 19) % 11 === 0)) {
      cx.fillStyle = 'rgba(28,112,50,.24)'; cx.fillRect(sx + 8, sy + 12, 1, 3); cx.fillRect(sx + 10, sy + 13, 1, 2);
    }
  }
  function drawRunDust(camX, camY) {
    if (!player.moving || !player.running || player.onBoat) return;
    const [dx, dy] = delta(player.facing), x = player.px - camX + 16 - dx * 11, y = player.py - camY + 27 - dy * 8;
    const pulse = (performance.now() / 70) % 1;
    cx.fillStyle = `rgba(235,225,190,${0.42 * (1 - pulse)})`;
    cx.beginPath(); cx.arc(x - 5, y, 2 + pulse * 3, 0, Math.PI * 2); cx.arc(x + 4, y + 1, 1.5 + pulse * 2, 0, Math.PI * 2); cx.fill();
  }
  function drawFishing(camX, camY) {
    if (!fishing) return;
    const F = C.FISHING || { castMs: 320, waitMs: 900, reelMs: 420 };
    const handOffset = {
      down: [22, 17], left: [14, 16], right: [17, 16], up: [20, 16],
    }[player.facing] || [16, 16];
    const tipOffset = {
      down: [7, 13], left: [-13, -7], right: [13, -7], up: [7, -14],
    }[player.facing] || [0, -12];
    const startX = player.px - camX + handOffset[0], startY = player.py - camY + handOffset[1];
    const rodX = startX + tipOffset[0], rodY = startY + tipOffset[1];
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
  function syncTouchUi() {
    const hidden = state !== 'overworld';
    const nextState = hidden ? 'hidden' : 'visible';
    if (touchUiState === nextState) return;
    touchUiState = nextState;
    document.getElementById('touch-controls')?.classList.toggle('touch-hidden', hidden);
    document.getElementById('touch-actions')?.classList.toggle('touch-hidden', hidden);
    document.getElementById('touch-back')?.classList.toggle('touch-hidden', !hidden);
  }
  function render() {
    syncTouchUi();
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, cv.width, cv.height);
    if (state === 'battle') { renderBattle(); return; }
    if (state === 'dex') { renderDex(); return; }
    if (state === 'lecture') { renderLecture(); return; }
    if (state === 'capture') { renderCapture(); return; }
    if (state === 'pve') { renderPve(); return; }
    cx.setTransform(ZOOM, 0, 0, ZOOM, 0, 0); renderOverworld(); cx.setTransform(1, 0, 0, 1, 0, 0);
    drawHudHint();
    if (dialog.active) drawDialog(); else if (toast.t > 0) drawToast();
  }
  function renderOverworld() {
    let camX = player.px + TILE / 2 - VIEW_PX_W / 2, camY = player.py + TILE / 2 - VIEW_PX_H / 2;
    camX = Math.max(0, Math.min(camX, MAP_W * TILE - VIEW_PX_W)); camY = Math.max(0, Math.min(camY, MAP_H * TILE - VIEW_PX_H));
    const frameNow = performance.now();
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
      const idx = TILES[y][x], sx = x * TILE - camX, sy = y * TILE - camY;
      if (sx < -TILE || sx > VIEW_PX_W || sy < -TILE || sy > VIEW_PX_H) continue;
      const isAcademy = [K.ACADEMY_DOOR, K.ACADEMY_WALL, K.ACADEMY_ROOF].includes(idx);
      drawTile(isAcademy || idx === K.TREE ? K.GRASS : idx, sx, sy);
      drawGroundDetail(isAcademy || idx === K.TREE ? K.GRASS : idx, sx, sy, x, y, frameNow);
    }
    drawAcademy(camX, camY);
    for (const n of NPCS) {
      drawSprite(imgs.npc, 'down', 0, n.gx * TILE - camX, n.gy * TILE - camY);
      if (n.icon) { cx.font = '14px sans-serif'; cx.fillText(n.icon, n.gx * TILE - camX + 7, n.gy * TILE - camY - 3); }
    }
    drawPet(camX, camY);
    drawRunDust(camX, camY);
    if (player.onBoat) drawTile(K.BOAT, Math.round(player.px - camX), Math.round(player.py - camY));
    drawSprite(imgs.player, player.facing, player.frame, Math.round(player.px - camX), Math.round(player.py - camY));
    drawFishing(camX, camY);
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
      if (TILES[y][x] !== K.TREE) continue; const sx = x * TILE - camX, sy = y * TILE - camY;
      if (sx < -TILE || sx > VIEW_PX_W || sy < -TILE || sy > VIEW_PX_H) continue;
      cx.fillStyle = 'rgba(8,45,24,.22)'; cx.beginPath(); cx.ellipse(sx + 17, sy + 27, 13, 5, 0, 0, Math.PI * 2); cx.fill();
      drawTile(K.TREE, sx, sy);
    }
  }
  function drawPet(camX, camY) {
    const img = monsterImg(currentPetId); if (!img) return;
    const pos = petFollowPosition(), level = petLevel(), size = petSizeFor(level);
    const ratio = img.height / img.width, w = size, h = size * ratio;
    const bob = C.PET.bob ? Math.sin(Date.now() / 220) * 1.5 : 0;
    const dx = pos.px - camX + (TILE - w) / 2, dy = pos.py - camY + (TILE - h) + bob;
    cx.fillStyle = 'rgba(0,0,0,.18)'; cx.beginPath(); cx.ellipse(dx + w / 2, pos.py - camY + TILE - 2, w * 0.38, 4, 0, 0, Math.PI * 2); cx.fill();
    cx.drawImage(img, dx, dy, w, h);
  }
  function drawAcademy(camX, camY) {
    const a = C.ACADEMY, x = a.gx * TILE - camX, y = a.gy * TILE - camY;
    const w = a.width * TILE, h = a.height * TILE;
    const academy = imgs.academy;
    cx.fillStyle = 'rgba(20,35,30,.22)'; cx.beginPath(); cx.ellipse(x + w / 2, y + h - 3, w * .46, 8, 0, 0, Math.PI * 2); cx.fill();
    if (academy) cx.drawImage(academy, x, y, w, h);
    cx.fillStyle = '#fff1c1'; cx.font = 'bold 10px monospace'; cx.fillText('GIẢNG ĐƯỜNG', x - 2, y - 5);
  }
  function drawHudHint() {
    const academy = frontTile().t === K.ACADEMY_DOOR;
    const compact = cv.width < 620;
    const message = fishing ? '🎣 Đang câu cá...' : academy ? 'Space: Vào Giảng đường' : (compact ? 'D: Dex · Space: Tương tác' : '↑↓←→ Di chuyển · Shift: Chạy · D: Dex · Space: Tương tác');
    const hintW = Math.min(cv.width - 16, compact ? 230 : 370);
    cx.fillStyle = 'rgba(11,16,48,.82)'; cx.fillRect(8, 8, hintW, 28);
    cx.fillStyle = '#9fd8f5'; fitText(message, 16, 27, hintW - 16, 13);
    const total = KANJI_BY_CHAR.size;
    const captured = Object.keys(petData).length;
    const status = `Kanji ${captured}/${total} · Pet 「${C.MONSTERS[currentPetId]?.kanji || '?'}」`;
    const statusW = Math.min(cv.width - 16, compact ? 190 : 230);
    const statusX = compact ? 8 : cv.width - statusW - 8, statusY = compact ? 42 : 8;
    cx.fillStyle = 'rgba(11,16,48,.72)'; cx.fillRect(statusX, statusY, statusW, 28);
    cx.fillStyle = '#ffd54a'; fitText(status, statusX + 8, statusY + 19, statusW - 16, 12);
  }

  // ----- BATTLE render -----
  const PANEL_H = (C.UI && C.UI.panelH) || 200;
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
  function renderBattle() {
    const b = battle, W = cv.width, H = cv.height, FIELD_H = H - PANEL_H;
    drawBattleBackground(b.kind, W, FIELD_H);
    if (b.flash > 0) { cx.fillStyle = `rgba(255,80,80,${b.flash / 500})`; cx.fillRect(0, 0, W, FIELD_H); }
    // Sân đấu logic tối đa 1280×720, nằm giữa cả trên màn hình siêu rộng.
    const stageW = Math.min(W, 1280), stageH = Math.min(FIELD_H, stageW * 9 / 16);
    const stageX = (W - stageW) / 2, stageY = Math.max(0, (FIELD_H - stageH) / 2);
    const actorScale = Math.max(.48, Math.min(1, stageW / 900, stageH / 430));
    const plCX = stageX + stageW * .25, monCX = stageX + stageW * .75;
    const baseY = stageY + stageH * .82;
    const idle = Math.sin(performance.now() / 260) * 3 * actorScale;
    const petP = b.petAttackT > 0 ? 1 - b.petAttackT / (b.petAttackTotal || 460) : 0;
    const enemyP = b.enemyAttackT > 0 ? 1 - b.enemyAttackT / (b.enemyAttackTotal || 520) : 0;
    const petLunge = Math.sin(Math.max(0, Math.min(1, petP)) * Math.PI) * Math.min(120, stageW * .14);
    const enemyLunge = Math.sin(Math.max(0, Math.min(1, enemyP)) * Math.PI) * Math.min(120, stageW * .14);
    const enemyRecoil = b.enemyHitT > 0 ? Math.sin(b.enemyHitT / 16) * 9 * actorScale : 0;
    const petRecoil = b.playerHitT > 0 ? -Math.abs(Math.sin(b.playerHitT / 20)) * 18 * actorScale : 0;

    // Mini PvE chỉ hiển thị pet chiến đấu; player không xuất hiện trong sân đấu.
    const petW = 150 * actorScale;
    cx.fillStyle = 'rgba(0,0,0,.24)'; cx.beginPath(); cx.ellipse(plCX, baseY + 3, 78 * actorScale, 19 * actorScale, 0, 0, Math.PI * 2); cx.fill();
    const petImg = monsterImg(currentPetId);
    if (petImg) {
      const ph = petW * petImg.height / petImg.width, petX = plCX + petLunge + petRecoil;
      cx.drawImage(petImg, petX - petW / 2, baseY - ph + idle, petW, ph);
      drawMonsterMeaningEffect(C.MONSTERS[currentPetId], petX, baseY + idle, petW);
    }

    // Enemy cùng baseline để hai phía thực sự lao vào nhau.
    const m = b.mon, img = monsterImg(b.monId);
    const enemyW = Math.min(240, m.drawW * 1.12) * actorScale;
    const enemyH = enemyW * (m.drawH / m.drawW);
    const enemyX = monCX - enemyLunge + enemyRecoil;
    cx.fillStyle = 'rgba(0,0,0,.24)'; cx.beginPath(); cx.ellipse(monCX, baseY + 3, enemyW * .46, 20 * actorScale, 0, 0, Math.PI * 2); cx.fill();
    cx.save();
    if (b.enemyHitT > 0) cx.filter = `brightness(${1.5 + 1.5 * Math.abs(Math.sin(b.enemyHitT / 25))}) saturate(.35)`;
    else if (b.botFlash > 0) cx.filter = `brightness(${1.1 + .35 * Math.abs(Math.sin(Date.now() / 50))})`;
    cx.drawImage(img, enemyX - enemyW / 2, baseY - enemyH - idle, enemyW, enemyH);
    cx.restore();
    drawMonsterMeaningEffect(m, enemyX, baseY - idle, enemyW);

    drawBattleEffects(b, { stageX, stageY, stageW, stageH, plCX, monCX, baseY });

    // HUD đối xứng ở hai góc trên của sân đấu.
    const hpW = Math.max(140, Math.min(320, (stageW - 54) / 2));
    const hudY = stageY + 18, petHudX = stageX + 18, enemyHudX = stageX + stageW - hpW - 18;
    const pet = C.MONSTERS[currentPetId], petKanji = pet ? pet.kanji : '?';
    drawHpBar(petHudX, hudY, `Pet của bạn · ${pet ? pet.name : ''} 「${petKanji}」`, player.hp, player.maxHp, '#43d17a', hpW);
    drawHpBar(enemyHudX, hudY, `${m.name} 「${m.kanji}」 · Lv.${b.kanjiLevel}`, b.monHp, b.monMaxHp, '#e04a4a', hpW);
    drawEnergyGauge(b, petHudX, hudY + 53, hpW);
    drawAttackGauge(b, enemyHudX, hudY + 53, hpW);
    if (stageW >= 620) drawPetMastery(petKanji, petHudX, hudY + 91, hpW);

    if (b.combo > 1) {
      cx.fillStyle = '#ffd54a'; cx.font = 'bold 18px monospace'; cx.textAlign = 'center';
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
    cx.fillStyle = '#b9c8e8'; cx.font = 'bold 11px monospace'; cx.fillText('⚔ ATTACK GAUGE', x + 8, y + 11);
    cx.fillStyle = '#26334b'; cx.fillRect(x + 8, y + 16, w - 16, 7);
    cx.fillStyle = danger ? '#ff5454' : '#f1a83b'; cx.fillRect(x + 8, y + 16, (w - 16) * progress, 7);
    if (danger) { cx.strokeStyle = `rgba(255,90,90,${.5 + .5 * Math.sin(Date.now() / 80)})`; cx.lineWidth = 2; cx.strokeRect(x, y, w, 28); }
  }

  function drawEnergyGauge(b, x, y, w) {
    const max = C.COMBAT.energyMax || 3, gap = 5, innerW = w - 16;
    cx.fillStyle = 'rgba(11,16,32,.88)'; cx.fillRect(x, y, w, 28);
    cx.fillStyle = '#b9c8e8'; cx.font = 'bold 11px monospace'; cx.fillText('✦ TUYỆT KỸ', x + 8, y + 11);
    const pipW = (innerW - gap * (max - 1)) / max;
    for (let i = 0; i < max; i++) {
      cx.fillStyle = i < b.energy ? '#56eaff' : '#26334b';
      cx.fillRect(x + 8 + i * (pipW + gap), y + 16, pipW, 7);
    }
  }

  function drawBattleEffects(b, s) {
    for (const p of b.particles || []) {
      cx.globalAlpha = Math.min(1, p.t / 240); cx.fillStyle = p.color;
      cx.beginPath(); cx.arc(s.stageX + p.x * s.stageW, s.stageY + p.y * s.stageH, p.size, 0, Math.PI * 2); cx.fill();
    }
    cx.globalAlpha = 1;
    for (const n of b.damageNumbers || []) {
      const life = 1 - n.t / n.total, x = n.side === 'enemy' ? s.monCX : s.plCX;
      cx.globalAlpha = Math.min(1, n.t / 180); cx.fillStyle = n.color; cx.textAlign = 'center';
      cx.font = 'bold 25px monospace'; cx.fillText(n.text, x, s.baseY - 170 - life * 50);
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
      cx.font = 'bold 28px monospace'; cx.fillText('PERFECT!', s.stageX + s.stageW / 2, s.stageY + s.stageH * .42);
      cx.globalAlpha = 1; cx.textAlign = 'left';
    }
  }

  function renderLecture() {
    const physicalW = cv.width, physicalH = cv.height;
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
    const activeTier = isTierUnlocked('N4') ? 'N4' : 'N5', progress = tierProgress(activeTier);
    const total = progress.total, unlocked = progress.captured, compact = W < 620;
    const touchBackVisible = (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) || cv.width <= 700;
    const backReserve = touchBackVisible ? 58 / (lecture.uiScale || 1) : 0;
    cx.fillStyle = 'rgba(8,13,31,.94)'; cx.fillRect(0, 0, W, 72);
    cx.strokeStyle = '#244f80'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(0, 71); cx.lineTo(W, 71); cx.stroke();
    cx.fillStyle = '#6cc0ff'; cx.font = `bold ${compact ? 17 : 24}px ${JPFONT}`; cx.fillText(compact ? '📖 GIẢNG ĐƯỜNG' : '📖 GIẢNG ĐƯỜNG KANJI', compact ? 14 : 24, compact ? 27 : 34);
    if (!compact) { cx.fillStyle = '#b9c8e8'; cx.font = '12px monospace'; cx.fillText('Nơi tiếp nhận kiến thức mới và unlock mascot', 25, 55); }
    const barW = compact ? W - 28 - backReserve : Math.min(250, Math.max(120, W * .22));
    const bx = compact ? 14 : W - barW - 24 - backReserve, by = compact ? 45 : 25;
    cx.fillStyle = '#26334b'; cx.fillRect(bx, by, barW, 9);
    cx.fillStyle = '#56eaff'; cx.fillRect(bx, by, total ? barW * unlocked / total : barW, 9);
    cx.fillStyle = '#dce8ff'; cx.font = `${compact ? 10 : 12}px monospace`; cx.textAlign = 'right';
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
    const cardH = Math.max(62, Math.min(82, (H - 210) / Math.max(3, items.length))), startY = titleY + 76;
    items.forEach((item, i) => {
      const y = startY + i * (cardH + 12), selected = i === (lecture.menuSel || 0);
      drawAcademyCard(area.x, y, area.w, cardH, selected);
      cx.fillStyle = selected ? '#7ff7ff' : '#ffd54a'; cx.font = `bold 19px ${JPFONT}`; cx.fillText(`${i + 1}. ${item.title}`, area.x + 22, y + 29);
      cx.fillStyle = '#c5d2eb'; cx.font = `14px ${JPFONT}`; fitText(item.desc, area.x + 22, y + 55, area.w - 44, 14);
      lecture.hitboxes.push({ x: area.x, y, w: area.w, h: cardH, action: 'menu', value: item });
    });
    cx.fillStyle = '#8395b5'; cx.font = '12px monospace';
    cx.fillText(compact ? 'Chạm một lựa chọn · ← quay lại' : '↑↓ chọn · Enter xác nhận · Esc rời Giảng đường', area.x, H - 20);
  }
  function academyPickerCols() {
    const width = cv.width / ((lecture && lecture.uiScale) || 1);
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
      cx.fillStyle = selected ? '#7ff7ff' : '#b9c8e8'; cx.font = `bold ${compact ? 10 : 11}px monospace`; cx.textAlign = 'center';
      cx.fillText(group === 'ALL' ? (compact ? 'TẤT' : 'TẤT CẢ') : group, x + groupW / 2, toolbarY + 21); cx.textAlign = 'left';
      lecture.hitboxes.push({ x, y: toolbarY, w: groupW, h: toolbarH, action: 'picker_group', value: group });
    });
    const sortX = area.x + groupsW + toolbarGap;
    drawAcademyCard(sortX, toolbarY, sortW, toolbarH, false);
    const sortMode = ACADEMY_SORTS.find((mode) => mode.id === lecture.sort) || ACADEMY_SORTS[0];
    cx.fillStyle = '#ffd54a'; cx.font = `bold ${compact ? 9 : 11}px monospace`; cx.textAlign = 'center';
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
      cx.font = 'bold 9px monospace'; cx.fillText(tier, x + 10, y + 13);
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
    cx.fillStyle = '#8395b5'; cx.font = '12px monospace';
    fitText(compact ? `Vuốt để cuộn · ${list.length} chữ` : `Cuộn/kéo · ←↑↓→ chọn · Enter học · Tab nhóm · F2 sort · ${list.length} chữ`, area.x, H - 14, area.w, 12);
    lecture.hitboxes.push({ x: area.x + area.w - 90, y: 80, w: 90, h: 30, action: 'back' });
    cx.fillStyle = '#9fd8f5'; cx.textAlign = 'right'; cx.fillText('Esc: quay lại', area.x + area.w, 105); cx.textAlign = 'left';
  }
  function lessonStep() { return ({ intro: 1, readings: 2, examples: 3, check: 4, ready: 5 }[lecture.phase] || 1); }
  function drawLessonProgress(W) {
    const area = academyContent(W), step = lessonStep(), y = 91, gap = 8, sw = (area.w - gap * 4) / 5;
    for (let i = 0; i < 5; i++) { cx.fillStyle = i < step ? '#56eaff' : '#26334b'; cx.fillRect(area.x + i * (sw + gap), y, sw, 7); }
    cx.fillStyle = '#9fd8f5'; cx.font = '11px monospace'; cx.fillText(`BƯỚC ${step}/5`, area.x, y + 23);
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
    const bodyY = 126, bodyH = H - bodyY - 76;
    drawAcademyCard(area.x, bodyY, area.w, bodyH);
    if (lecture.phase === 'intro') {
      const split = compact ? area.w * .55 : area.w * .58;
      cx.fillStyle = '#9fd8f5'; cx.font = '13px monospace'; cx.fillText('KANJI MỚI', area.x + 28, bodyY + 34);
      cx.fillStyle = '#ffd54a'; cx.font = `bold ${compact ? 82 : 126}px ${JPFONT}`; cx.fillText(info.char, area.x + 28, bodyY + (compact ? 118 : 162));
      cx.fillStyle = '#fff'; fitText(info.meaning, area.x + 30, bodyY + (compact ? 153 : 205), split - 46, compact ? 21 : 28, true);
      cx.fillStyle = '#a9bad8'; cx.font = `14px ${JPFONT}`; wrap('Quan sát hình dáng, đọc nghĩa và làm quen với mascot trước khi học cách đọc.', area.x + 30, bodyY + (compact ? 181 : 238), split - 48, 22);
      drawLessonMascot(info, area.x + split, bodyY + 20, area.w - split - 18, bodyH - 35);
    } else if (lecture.phase === 'readings') {
      cx.fillStyle = '#fff'; cx.font = `bold ${compact ? 23 : 27}px ${JPFONT}`; fitText(`Cách đọc của 「${info.char}」`, area.x + 28, bodyY + 42, area.w - 56, compact ? 23 : 27, true);
      const gap = narrow ? 10 : 18, cardY = bodyY + 72;
      const cardW = narrow ? area.w - 56 : (area.w - 74) / 2;
      const cardH = narrow ? Math.min(104, (bodyH - 102) / 2) : Math.min(150, bodyH - 92);
      const onX = area.x + 28, onY = cardY, kunX = narrow ? onX : area.x + 46 + cardW, kunY = narrow ? cardY + cardH + gap : cardY;
      drawAcademyCard(onX, onY, cardW, cardH, true); drawAcademyCard(kunX, kunY, cardW, cardH, true);
      cx.fillStyle = '#ffd54a'; cx.font = `bold ${narrow ? 14 : 17}px monospace`; cx.fillText('ÂM ON', onX + 20, onY + 30);
      cx.fillStyle = '#fff'; cx.font = `${compact ? 16 : 22}px ${JPFONT}`; wrap((info.on || []).join('  ·  ') || '—', onX + 20, onY + (narrow ? 61 : 72), cardW - 40, narrow ? 24 : 30);
      cx.fillStyle = '#6effa1'; cx.font = `bold ${narrow ? 14 : 17}px monospace`; cx.fillText('ÂM KUN', kunX + 20, kunY + 30);
      cx.fillStyle = '#fff'; cx.font = `${compact ? 16 : 22}px ${JPFONT}`; wrap((info.kun || []).join('  ·  ') || '—', kunX + 20, kunY + (narrow ? 61 : 72), cardW - 40, narrow ? 24 : 30);
    } else if (lecture.phase === 'examples') {
      cx.fillStyle = '#fff'; cx.font = `bold ${compact ? 23 : 27}px ${JPFONT}`; cx.fillText('Từ vựng ví dụ', area.x + 28, bodyY + 42);
      cx.fillStyle = '#9fd8f5'; cx.font = `${narrow ? 10 : 11}px monospace`;
      cx.fillText(narrow ? 'VÀNG: đang học · XANH: hỗ trợ · chữ nhỏ: furigana' : 'VÀNG: chữ đang học  ·  XANH: chữ hỗ trợ  ·  Furigana nằm phía trên', area.x + 28, bodyY + 62);
      const examples = lecture.examples || [], available = bodyH - 82 - Math.max(0, examples.length - 1) * 8;
      const cardH = Math.min(90, Math.max(82, available / Math.max(1, examples.length)));
      lecture.examples.forEach((q, i) => {
        const y = bodyY + 72 + i * (cardH + 8); drawAcademyCard(area.x + 28, y, area.w - 56, cardH, i === 0);
        drawBridgeVocabulary(q, info.char, area.x + 44, y + 5, area.w - 88, compact);
      });
    } else if (lecture.phase === 'check') renderAcademyCheck(area, bodyY, bodyH);
    else if (lecture.phase === 'ready') {
      drawLessonMascot(info, area.x + area.w * .57, bodyY + 22, area.w * .4, bodyH - 38);
      cx.fillStyle = '#6effa1'; cx.font = `bold 25px ${JPFONT}`; cx.fillText('KIẾN THỨC ĐÃ ĐƯỢC NẠP!', area.x + 30, bodyY + 58);
      cx.fillStyle = '#ffd54a'; cx.font = `bold 78px ${JPFONT}`; cx.fillText(info.char, area.x + 30, bodyY + 146);
      cx.fillStyle = '#fff'; fitText(info.meaning, area.x + 120, bodyY + 118, area.w * .4, 24, true);
      cx.fillStyle = '#b9c8e8'; cx.font = `15px ${JPFONT}`; wrap('Hoàn thành nghi thức để unlock mascot và đưa Kanji này vào KanjiDex.', area.x + 30, bodyY + 178, area.w * .5, 24);
      cx.fillStyle = '#9fd8f5'; cx.font = 'bold 13px monospace'; cx.fillText(`MINI-CHECK ${lecture.lessonScore}/3`, area.x + 30, bodyY + 235);
    }
    if (lecture.phase !== 'check' || lecture.answerLocked) drawAcademyContinue(W, H, lecture.phase === 'ready' ? 'BẮT ĐẦU NGHI THỨC' : lecture.phase === 'check' ? 'CÂU TIẾP THEO' : 'TIẾP TỤC');
    cx.fillStyle = '#8395b5'; cx.font = '11px monospace';
    fitText(compact ? 'Chạm nút để tiếp tục · ← quay lại (đã lưu)' : 'Esc: quay lại sảnh (tiến độ được lưu)', area.x, H - 14, area.w, 11);
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
      if (i > 0) { cx.fillStyle = '#657b9e'; cx.font = 'bold 13px monospace'; cx.textAlign = 'center'; cx.fillText('+', cursor - gap / 2, y + 36); }
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
    cx.fillStyle = '#6effa1'; cx.font = `bold ${compact ? 9 : 10}px monospace`; cx.fillText(prefix, x, y + 80);
    const prefixW = cx.measureText(prefix).width;
    cx.fillStyle = '#fff'; cx.font = `bold ${compact ? 11 : 13}px ${JPFONT}`;
    fitText(`${fullReading}${romaji} · ${q.mean}`, x + prefixW, y + 80, maxW - prefixW, compact ? 11 : 13, true);
  }
  function renderAcademyCheck(area, bodyY, bodyH) {
    const q = lecture.q;
    cx.fillStyle = '#9fd8f5'; cx.font = 'bold 13px monospace'; cx.fillText(`MINI-CHECK ${lecture.checkIndex + 1}/3`, area.x + 28, bodyY + 32);
    const prompt = q.mode === 'm6' ? `Chọn cách đọc TOÀN TỪ 「${q.word}」` : q.mode === 'm7' ? `Chọn nghĩa TOÀN TỪ 「${q.word}」` :
      q.mode === 'm3' ? `Chọn nghĩa đúng của 「${q.target}」` : q.mode === 'm4' ? `「${q.word}」 dùng âm ON hay KUN?` : `Chọn cách đọc của 「${q.target}」 trong ${q.word}`;
    cx.fillStyle = '#fff'; fitText(prompt, area.x + 28, bodyY + 67, area.w - 56, 22, true);
    cx.fillStyle = '#ffd54a'; cx.font = `bold 34px ${JPFONT}`; fitText(q.word, area.x + 28, bodyY + 111, area.w - 56, 34, true);
    const options = q.options, gap = 12, cols = 2, bw = (area.w - 68) / cols;
    const bh = (lecture.uiScale || 1) < 1 ? 64 : 48;
    const startY = bodyY + Math.min(145, Math.max(120, bodyH - 132));
    options.forEach((option, i) => {
      const col = i % 2, row = Math.floor(i / 2), x = area.x + 28 + col * (bw + gap), y = startY + row * (bh + 10);
      let selected = false, disabled = false;
      if (lecture.answerLocked) { selected = i === q.correctIndex; disabled = i !== q.correctIndex; }
      drawAcademyCard(x, y, bw, bh, selected, disabled);
      cx.fillStyle = disabled ? '#727b91' : '#fff'; fitText(`${i + 1}) ${option}`, x + 14, y + 31, bw - 28, 18, true);
      if (!lecture.answerLocked) lecture.hitboxes.push({ x, y, w: bw, h: bh, action: 'answer', value: i });
    });
    if (lecture.feedback) {
      cx.fillStyle = lecture.feedback.startsWith('✓') ? '#6effa1' : '#ffadad';
      fitText(lecture.feedback, area.x + 28, Math.min(bodyY + bodyH - 10, startY + 116), area.w - 56, 14, true);
    }
  }
  function drawAcademyContinue(W, H, label) {
    const w = Math.min(310, W - 48), h = (lecture.uiScale || 1) < 1 ? 64 : 44, x = (W - w) / 2, y = H - h - 22;
    cx.fillStyle = '#1d72aa'; cx.fillRect(x, y, w, h); cx.strokeStyle = '#72ddff'; cx.lineWidth = 2; cx.strokeRect(x, y, w, h);
    cx.fillStyle = '#fff'; cx.font = 'bold 14px monospace'; cx.textAlign = 'center'; cx.fillText(`${label}  ▶`, W / 2, y + h / 2 + 5); cx.textAlign = 'left';
    lecture.hitboxes.push({ x, y, w, h, action: 'continue' });
  }
  function renderAcademySummary(W, H) {
    const area = academyContent(W), info = lecture.info, narrow = W < 460;
    drawAcademyCard(area.x, 104, area.w, H - 145, true);
    cx.fillStyle = '#6effa1'; fitText('🎉 UNLOCK THÀNH CÔNG!', area.x + 30, 148, area.w - 60, narrow ? 21 : 27, true);
    cx.fillStyle = '#ffd54a'; cx.font = `bold ${narrow ? 76 : 92}px ${JPFONT}`; cx.fillText(info.char, area.x + 34, narrow ? 242 : 248);
    const textX = narrow ? area.x + 28 : area.x + 142, textY = narrow ? 326 : 205, textW = narrow ? area.w - 56 : area.w * .42;
    cx.fillStyle = '#fff'; cx.font = `bold ${narrow ? 21 : 24}px ${JPFONT}`; fitText(C.MONSTERS[info.monId].name, textX, textY, textW, narrow ? 21 : 24, true);
    cx.fillStyle = '#b9c8e8'; cx.font = `${narrow ? 14 : 15}px ${JPFONT}`; wrap(`${info.meaning} đã được thêm vào KanjiDex và từ giờ có thể xuất hiện ngoài thế giới.`, textX, textY + 31, narrow ? area.w - 56 : area.w * .48, narrow ? 22 : 25);
    drawLessonMascot(info, narrow ? area.x + area.w * .52 : area.x + area.w * .62, narrow ? 160 : 126, narrow ? area.w * .42 : area.w * .34, narrow ? 130 : H - 210);
    cx.fillStyle = '#9fd8f5'; cx.font = '13px monospace'; cx.fillText(`Nghi thức: ${lecture.score}/5 câu đúng`, area.x + 34, H - 105);
    drawAcademyContinue(W, H, 'VỀ SẢNH GIẢNG ĐƯỜNG');
  }
  function renderCapture() {
    const W = cv.width, H = cv.height, fieldH = H - PANEL_H;
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
    const captureCompact = W < 600, captureHudW = Math.min(W - 36, 520), captureHudH = captureCompact ? 92 : 76;
    cx.fillStyle = 'rgba(8,13,31,.9)'; cx.fillRect(18, 16, captureHudW, captureHudH);
    cx.strokeStyle = '#275b8f'; cx.lineWidth = 2; cx.strokeRect(18, 16, captureHudW, captureHudH);
    cx.fillStyle = '#fff'; cx.font = `bold 20px ${JPFONT}`; cx.fillText(`NGHI THỨC THU PHỤC 「${capture.char}」`, 32, 45);
    cx.fillStyle = '#9fd8f5'; cx.font = '12px monospace'; cx.fillText(`Lần ${capture.attempt} · Cần ${capture.needed}/5 · Thể lực ${stamina}`, 32, 68);
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
    const W = cv.width, H = cv.height, fieldH = H - PANEL_H;
    drawBattleBackground('grass', W, fieldH);
    const examTitle = pve.mode === 'gym' ? `🏅 GYM ${pve.tier}` : '⛩ KỲ THI JLPT MINI';
    cx.fillStyle = '#fff'; cx.font = `bold 20px ${JPFONT}`; cx.fillText(examTitle, 24, 34);
    if (pve.phase === 'fight') cx.fillStyle = '#ffd54a';
    cx.font = '15px monospace'; cx.fillText(`Câu ${Math.min(pve.index + 1, pve.total)}/${pve.total} • Đúng ${pve.correct}`, 24, 60);
    if (pve.phase === 'end' && pveResult) {
      cx.fillStyle = '#ffd54a'; cx.font = `bold 46px ${JPFONT}`; cx.fillText(pveResult.grade, 50, 150);
      cx.fillStyle = '#fff'; cx.font = `16px ${JPFONT}`; cx.fillText('Kanji đã xuất hiện trong bài:', 130, 118);
      pveResult.rewards.slice(0, 6).forEach((reward, i) => cx.fillText(`「${reward.kanji}」 đã ôn`, 130, 146 + i * 23));
      if (pveResult.badgeAwarded) { cx.fillStyle = '#6effa1'; cx.font = `bold 20px ${JPFONT}`; cx.fillText(`🏅 Nhận huy hiệu ${pveResult.badgeAwarded} — N4 đã mở!`, 50, fieldH - 36); }
    }
    drawQuizPanel(pve, W, H);
  }

  // Banner feedback: hộp nền, canh giữa, nằm sát mép trên panel -> không chồng chữ.
  function drawFeedbackBanner(b, W, fieldH) {
    const txt = b.feedback.text;
    cx.font = `15px ${JPFONT}`;
    const tw = Math.min(W - 40, cx.measureText(txt).width + 32);
    const bx = (W - tw) / 2, by = fieldH - 40, bh = 30;
    cx.fillStyle = b.feedback.good ? 'rgba(18,70,40,.92)' : 'rgba(80,20,24,.92)';
    cx.fillRect(bx, by, tw, bh);
    cx.strokeStyle = b.feedback.good ? '#6effa1' : '#ff8a8a'; cx.lineWidth = 2; cx.strokeRect(bx, by, tw, bh);
    cx.fillStyle = b.feedback.good ? '#b6ffcf' : '#ffc9c9';
    cx.textAlign = 'center'; cx.fillText(txt, W / 2, by + 20); cx.textAlign = 'left';
  }

  // Overlay choáng: dấu 😵 + đồng hồ đếm ngược ở giữa sân đấu.
  function drawStunOverlay(b, W, fieldH) {
    const s = (b.stun / 1000).toFixed(1);
    const pulse = 0.55 + 0.35 * Math.sin(Date.now() / 120);
    cx.fillStyle = `rgba(120,20,24,${0.18 * pulse})`; cx.fillRect(0, 0, W, fieldH);
    cx.textAlign = 'center';
    cx.fillStyle = `rgba(255,120,120,${0.85})`; cx.font = `bold 30px ${JPFONT}`;
    cx.fillText(`😵 CHOÁNG ${s}s`, W / 2, fieldH / 2);
    cx.fillStyle = '#ffd7d7'; cx.font = '13px monospace';
    cx.fillText('Chờ hết choáng mới trả lời tiếp — đọc kỹ đáp án đúng!', W / 2, fieldH / 2 + 24);
    cx.textAlign = 'left';
  }
  function drawPetMastery(kanji, x, y, w = 260) {
    const s = ensureMastery(kanji);
    cx.fillStyle = '#cde'; cx.font = '12px monospace';
    fitText(`📚 「${kanji}」  Lv.${s.level}/${C.KLEVEL.maxLevel} ${levelLabel(s.level)}`, x, y - 2, w, 12);
    const bx = x, by = y + 4;
    cx.fillStyle = '#333'; cx.fillRect(bx, by, w, 7);
    const need = expToNext(kanji), progress = s.level >= C.KLEVEL.maxLevel ? 1 : expInLevel(kanji) / need;
    const r = Math.max(0, Math.min(1, progress));
    cx.fillStyle = '#6cc0ff'; cx.fillRect(bx, by, w * r, 7);
    const mpText = s.level >= C.KLEVEL.maxLevel ? 'MP MASTERED' : `MP ${expInLevel(kanji)}/${need}`;
    cx.fillStyle = '#9ab'; cx.font = '10px monospace';
    if (w < 220) fitText(mpText, bx, by + 16, w, 10);
    else cx.fillText(mpText, bx + Math.max(0, w - 110), by + 16);
    cx.fillStyle = s.recall > 70 ? '#6effa1' : s.recall >= 30 ? '#ffd54a' : '#ff7777';
    fitText(`Recall ${s.recall}% · 🔥${s.winStreak}`, bx, by + (w < 220 ? 30 : 16), Math.min(140, w), 10);
  }
  function drawQuizPanel(b, W, H) {
    const h = PANEL_H, x = 0, y = H - h;
    cx.fillStyle = 'rgba(11,16,48,.96)'; cx.fillRect(x, y, W, h);
    cx.strokeStyle = '#16558f'; cx.lineWidth = 3; cx.strokeRect(x + 2, y + 2, W - 4, h - 4);
    const P = 22; // padding trái

    if (b.phase === 'end') {
      cx.fillStyle = '#fff'; cx.font = `19px ${JPFONT}`;
      wrap(b.endMsg || b.feedback || 'Hoàn thành!', x + P, y + 50, W - P * 2, 28);
      cx.fillStyle = '#9fd8f5'; cx.font = '14px monospace'; cx.fillText('▶ Space để tiếp tục', W - 220, y + h - 20);
      return;
    }

    const q = b.q;
    const disabled = (b.stun > 0) || (b.qCooldown > 0); // khoá phím lúc choáng / chờ câu mới

    // ── VÙNG 1: HƯỚNG DẪN + TỪ + NGHĨA (mỗi phần 1 dòng riêng, không đè) ──
    cx.textAlign = 'left';
    cx.fillStyle = '#9fd8f5'; cx.font = '13px monospace';
    const compact = W < 620;
    const instruction = q.mode === 'm2' ? (compact ? 'Chọn KANJI:' : 'Chọn KANJI đúng theo nghĩa:') : q.mode === 'm3' ? (compact ? 'Chọn nghĩa:' : 'Chọn nghĩa đúng của KANJI:') :
      q.mode === 'm4' ? 'Chữ này trong từ đọc theo âm ON hay KUN?' : q.mode === 'm5' ? `Từ nào chứa chữ 「${q.target}」?` :
      q.mode === 'm6' ? 'Chọn cách đọc của TOÀN BỘ từ:' : q.mode === 'm7' ? 'Chọn nghĩa của TOÀN BỘ từ:' : 'Chọn đúng cách đọc (phím 1–4 hoặc chạm nút):';
    cx.fillText(instruction, x + P, y + 24);
    cx.fillStyle = '#6effa1'; cx.font = '12px monospace'; cx.textAlign = 'right';
    cx.fillText(compact ? `${learning.correct}/${learning.total} đúng · ${learningAccuracy()}%` : `Học: ${learning.correct}/${learning.total} đúng  •  ${learningAccuracy()}%  •  🔥${learning.streak}`, W - P, y + 24);
    cx.textAlign = 'left';
    cx.fillStyle = '#fff'; cx.font = `bold 30px ${JPFONT}`;
    fitText(q.mode === 'm3' ? q.target : q.mode === 'm2' ? q.mean : q.word, x + P, y + 58, W - P * 2, 30, true);
    cx.fillStyle = '#ffd54a'; cx.font = `15px ${JPFONT}`;
    fitText(q.mode === 'm3' ? `Chọn nghĩa của 「${q.target}」` : q.mode === 'm4' ? `「${q.word}」 — ${q.mean}` : q.mode === 'm5' ? `Chữ cần tìm: 「${q.target}」` :
      q.mode === 'm6' ? `Gợi ý nghĩa: ${q.mean}` : q.mode === 'm7' ? `Đọc là: ${q.wordReading || '—'}` : `（${q.mean}）   ·   chữ cần đọc: 「${q.target}」`, x + P, y + 82, W - P * 2, 15);

    // ── VÙNG 2: 4 ĐÁP ÁN (2×2) — giãn cách rộng, mờ đi khi bị khoá ──
    const ans = q.options;
    const bh = (C.UI && C.UI.answerH) || 36;
    const gY = (C.UI && C.UI.answerGapY) || 8;
    const bx = x + P, bw = (W - P * 2) / 2 - 10;
    const startY = y + 96;
    for (let i = 0; i < ans.length; i++) {
      const col = i % 2, row = (i / 2) | 0;
      const ox = bx + col * (bw + 20), oy = startY + row * (bh + gY);
      cx.globalAlpha = disabled ? 0.4 : 1;
      const hinted = b.hint && i !== q.correctIndex && i === 0;
      cx.fillStyle = hinted ? 'rgba(90,100,120,.38)' : 'rgba(22,85,143,.55)'; cx.fillRect(ox, oy, bw, bh);
      cx.strokeStyle = disabled ? '#3a4a6a' : '#2f7fc0'; cx.lineWidth = 1; cx.strokeRect(ox, oy, bw, bh);
      cx.fillStyle = '#9fd8f5'; cx.font = 'bold 16px monospace'; cx.fillText(`${i + 1})`, ox + 12, oy + bh / 2 + 6);
      cx.fillStyle = '#fff'; fitText(ans[i] || '', ox + 42, oy + bh / 2 + 7, bw - 54, 20);
      cx.globalAlpha = 1;
    }

    // ── VÙNG 3: DÒNG TRẠNG THÁI (đếm ngược choáng / gợi ý) ──
    const statusY = y + h - 14;
    if (b.stun > 0) {
      cx.fillStyle = '#ff9a9a'; cx.font = 'bold 13px monospace';
      cx.fillText(`😵 Choáng ${(b.stun / 1000).toFixed(1)}s — đã khoá phím trả lời`, x + P, statusY);
    } else if (b.qCooldown > 0) {
      cx.fillStyle = '#9ab'; cx.font = '12px monospace';
      cx.fillText('… đang ra câu tiếp theo', x + P, statusY);
    } else {
      cx.fillStyle = '#8aa'; cx.font = '12px monospace';
      cx.fillText(`1–${ans.length}: chọn đáp án${b.hint ? '  •  gợi ý đã loại 1 đáp án sai' : ''}`, x + P, statusY);
    }
    cx.fillStyle = '#8aa'; cx.font = '12px monospace'; cx.fillText('Esc: bỏ chạy', W - 118, statusY);
  }
  function drawBattleBackground(kind, W, fieldH) {
    if (kind === 'water') {
      const g = cx.createLinearGradient(0, 0, 0, fieldH); g.addColorStop(0, '#1e6f8f'); g.addColorStop(.6, '#0e4763'); g.addColorStop(1, '#07293a');
      cx.fillStyle = g; cx.fillRect(0, 0, W, fieldH);
      cx.strokeStyle = 'rgba(160,220,240,.22)'; cx.lineWidth = 2;
      for (let yy = 46; yy < fieldH; yy += 40) { cx.beginPath(); for (let xx = 0; xx <= W; xx += 16) { const y = yy + Math.sin((xx + yy) / 24) * 4; xx === 0 ? cx.moveTo(xx, y) : cx.lineTo(xx, y); } cx.stroke(); }
    } else {
      const sky = cx.createLinearGradient(0, 0, 0, fieldH * .62); sky.addColorStop(0, '#a7e08a'); sky.addColorStop(1, '#cdeeae');
      cx.fillStyle = sky; cx.fillRect(0, 0, W, fieldH * .62);
      const gr = cx.createLinearGradient(0, fieldH * .62, 0, fieldH); gr.addColorStop(0, '#6ab04c'); gr.addColorStop(1, '#3f7d32');
      cx.fillStyle = gr; cx.fillRect(0, fieldH * .62, W, fieldH * .38);
      cx.fillStyle = 'rgba(255,255,255,.15)'; cx.fillRect(0, fieldH * .62 - 2, W, 3);
    }
  }
  function drawHpBar(x, y, name, hp, max, col, w = 260) {
    cx.fillStyle = 'rgba(11,16,32,.85)'; cx.fillRect(x, y, w, 46);
    cx.strokeStyle = '#16558f'; cx.lineWidth = 2; cx.strokeRect(x, y, w, 46);
    cx.fillStyle = '#fff'; fitText(name, x + 10, y + 18, w - 20, 15, true);
    const bw = w - 64, bx = x + 10, by = y + 27; cx.fillStyle = '#333'; cx.fillRect(bx, by, bw, 9);
    const r = Math.max(0, hp / max); cx.fillStyle = r > .5 ? col : r > .2 ? '#e6c34a' : '#e04a4a'; cx.fillRect(bx, by, bw * r, 9);
    cx.fillStyle = '#cde'; cx.font = '12px monospace'; cx.fillText(`${hp}/${max}`, x + w - 52, y + 37);
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
  function renderDexLegacy() {
    const W = cv.width, H = cv.height, list = dex.list;
    const total = list.length, captured = list.filter((char) => ensureMastery(char).captured).length;
    const layout = dexLayout(total);
    cx.fillStyle = '#0e1430'; cx.fillRect(0, 0, W, H);
    cx.fillStyle = '#fff'; fitText('📖 KANJI DEX', layout.ox, 34, Math.min(190, W - layout.ox * 2), Math.max(20, Math.min(30, W * 0.03)), true);
    cx.fillStyle = '#6effa1'; cx.font = '14px monospace';
    fitText(`Đã thu phục: ${captured}/${total}`, W < 620 ? layout.ox : layout.ox + 225, W < 620 ? 57 : 33, Math.min(190, W - layout.ox * 2), 14);
    cx.fillStyle = '#9fd8f5'; cx.font = '13px monospace';
    const page = Math.floor(dex.sel / layout.pageSize) + 1, pages = Math.ceil(list.length / layout.pageSize);
    fitText(list.length > layout.pageSize ? `Trang ${page}/${pages} · ← → chọn · Enter: đi cùng` : (W < 620 ? '← → chọn · Enter: đi cùng · Esc: đóng' : '← → ↑ ↓ chọn  •  Enter: cho đi cùng  •  Esc/D: đóng'), layout.ox, W < 620 ? 78 : 59, W - layout.ox * 2, 13);

    const pageStart = Math.floor(dex.sel / layout.pageSize) * layout.pageSize;
    const pageList = list.slice(pageStart, pageStart + layout.pageSize);
    for (let i = 0; i < pageList.length; i++) {
      const actualIndex = pageStart + i, kinfo = kanjiInfo(pageList[i]);
      if (!kinfo) continue;
      const id = kinfo.monId, m = C.MONSTERS[id];
      if (!m) continue;
      const s = ensureMastery(kinfo.char), unlocked = s.captured;
      const col = i % layout.cols, row = (i / layout.cols) | 0;
      const x = layout.ox + col * (layout.cardW + layout.gapX), y = layout.oy + row * (layout.cardH + layout.gapY);
      const sel = actualIndex === dex.sel, isCur = unlocked && id === currentPetId;
      cx.fillStyle = sel ? (unlocked ? 'rgba(22,85,143,.85)' : 'rgba(40,45,65,.9)') : (unlocked ? 'rgba(20,28,60,.9)' : 'rgba(12,14,24,.95)');
      cx.fillRect(x, y, layout.cardW, layout.cardH);
      cx.strokeStyle = sel ? '#6cc0ff' : (unlocked ? '#2a3a66' : '#242638'); cx.lineWidth = sel ? 3 : 1; cx.strokeRect(x, y, layout.cardW, layout.cardH);
      const img = unlocked ? monsterImg(id) : getSilhouette(id);
      const iw = Math.max(28, Math.min(96, layout.cardW * 0.32, layout.cardH * 0.42));
      if (img) { const ih = iw * img.height / img.width; cx.drawImage(img, x + 14, y + 14, iw, ih); }
      const kanjiSize = Math.max(28, Math.min(50, layout.cardH * 0.32));
      cx.fillStyle = unlocked ? '#ffd54a' : '#55586c'; cx.font = `bold ${kanjiSize}px ${JPFONT}`; cx.fillText(unlocked ? kinfo.char : '？', x + layout.cardW - kanjiSize - 18, y + kanjiSize + 8);
      cx.fillStyle = unlocked ? '#fff' : '#77798a'; cx.font = `${Math.max(12, Math.min(18, layout.cardH * 0.12))}px ${JPFONT}`; cx.fillText(unlocked ? m.name : '？？？', x + 14, y + layout.cardH - 80);
      if (unlocked) {
        cx.fillStyle = '#9fd8f5'; cx.font = '12px monospace';
        cx.fillText(`Lv.${s.level}/${C.KLEVEL.maxLevel} (${levelLabel(s.level)})`, x + 14, y + layout.cardH - 60);
        if (isCur) { cx.fillStyle = '#6effa1'; cx.font = 'bold 11px monospace'; cx.fillText('● ĐANG THEO', x + layout.cardW - 108, y + layout.cardH - 60); }
        const recallColor = s.recall > 70 ? '#6effa1' : s.recall >= 30 ? '#ffd54a' : '#ff7777';
        cx.fillStyle = recallColor; cx.font = '12px monospace'; cx.fillText(`Recall: ${s.recall}%`, x + 14, y + layout.cardH - 42);
        cx.fillStyle = '#ffd0e0'; cx.fillText(`🔥 ${s.winStreak} (best ${s.bestWinStreak})`, x + 122, y + layout.cardH - 42);
        if (s.level < C.KLEVEL.maxLevel) {
          const bw = layout.cardW - 28, bx = x + 14, by = y + layout.cardH - 26, progress = expInLevel(kinfo.char) / expToNext(kinfo.char);
          cx.fillStyle = '#333'; cx.fillRect(bx, by, bw, 7); cx.fillStyle = '#6cc0ff'; cx.fillRect(bx, by, bw * Math.max(0, Math.min(1, progress)), 7);
          cx.fillStyle = '#9ab'; cx.font = '10px monospace'; cx.fillText(`MP ${expInLevel(kinfo.char)}/${expToNext(kinfo.char)}`, bx + bw - 90, by - 3);
        } else {
          cx.fillStyle = '#ffd54a'; cx.font = 'bold 12px monospace'; cx.fillText('MASTERED ✦', x + 14, y + layout.cardH - 24);
        }
      }
    }

    const selected = kanjiInfo(list[dex.sel]), selectedUnlocked = selected && ensureMastery(selected.char).captured;
    const panelY = H - layout.panelH;
    cx.fillStyle = 'rgba(11,16,48,.96)'; cx.fillRect(0, panelY, W, layout.panelH);
    cx.strokeStyle = '#16558f'; cx.lineWidth = 2; cx.strokeRect(2, panelY + 2, W - 4, layout.panelH - 4);
    if (selected && selectedUnlocked) {
      const selectedStat = ensureMastery(selected.char);
      const recallColor = selectedStat.recall > 70 ? '#6effa1' : selectedStat.recall >= 30 ? '#ffd54a' : '#ff7777';
      const narrow = W < 620;
      cx.fillStyle = '#fff'; fitText(`${selected.char}  ${selected.meaning}`, 20, panelY + 34, W - 40, 20, true);
      cx.fillStyle = '#ffd54a'; fitText(`Âm ON: ${selected.on.join(', ')}`, 20, panelY + 62, narrow ? W - 40 : 280, 16);
      cx.fillStyle = '#6effa1'; fitText(`Âm KUN: ${selected.kun.join(', ')}`, narrow ? 20 : 320, narrow ? panelY + 82 : panelY + 62, narrow ? W - 40 : W - 340, 16);
      cx.fillStyle = recallColor; cx.font = '14px monospace';
      if (narrow) fitText(`Recall ${selectedStat.recall}% · 🔥 ${selectedStat.winStreak} (best ${selectedStat.bestWinStreak})`, 20, panelY + 102, W - 40, 14);
      else {
        cx.fillText(`Recall ${selectedStat.recall}%`, 20, panelY + 84);
        cx.fillStyle = '#ffd0e0'; cx.fillText(`🔥 Win-streak ${selectedStat.winStreak} (best ${selectedStat.bestWinStreak})`, 190, panelY + 84);
      }
    } else {
      cx.fillStyle = '#9ab'; cx.font = `18px ${JPFONT}`; cx.fillText('？？？', 20, panelY + 34);
      cx.font = '14px monospace'; cx.fillText('Tới 🏛️ Giảng đường để thu phục chữ này.', 20, panelY + 65);
    }
  }

  function renderDex() {
    const W = cv.width, H = cv.height, list = dex.list;
    const total = list.length, captured = list.filter((char) => ensureMastery(char).captured).length;
    const layout = dexLayout(total), content = dexContent(layout);
    dex.maxScroll = Math.max(0, content.height - layout.availableH); clampDexScroll(); dex.hitboxes = [];
    cx.fillStyle = '#0e1430'; cx.fillRect(0, 0, W, H);
    cx.fillStyle = '#fff'; fitText('📖 KANJI DEX', layout.ox, 32, W < 620 ? 160 : 205, Math.max(20, Math.min(28, W * .03)), true);
    cx.fillStyle = '#6effa1'; cx.font = '14px monospace'; fitText(`Đã thu phục: ${captured}/${total}`, W < 620 ? layout.ox : layout.ox + 220, W < 620 ? 53 : 31, 150, 14);

    const currentSort = DEX_SORTS.find((item) => item.id === dex.sort) || DEX_SORTS[0];
    const controlY = W < 620 ? 64 : 44, controlH = 32, sortW = Math.min(210, Math.max(150, W * .45));
    const groupW = Math.max(86, Math.min(170, W - layout.ox * 2 - sortW - 8)), groupX = layout.ox + sortW + 8;
    const control = (x, w, active, text) => {
      cx.fillStyle = active ? 'rgba(24,102,151,.9)' : 'rgba(18,31,61,.94)'; cx.fillRect(x, controlY, w, controlH);
      cx.strokeStyle = active ? '#72ddff' : '#275b8f'; cx.lineWidth = active ? 2 : 1; cx.strokeRect(x, controlY, w, controlH);
      cx.fillStyle = '#dce8ff'; cx.textAlign = 'left'; fitText(text, x + 7, controlY + 21, w - 14, 11, true);
    };
    control(layout.ox, sortW, true, `SORT: ${currentSort.label} ↻`);
    control(groupX, groupW, dex.group, `NHÓM: ${dex.group ? 'JLPT ✓' : 'TẮT'}`);
    dex.hitboxes.push({ x: layout.ox, y: controlY, w: sortW, h: controlH, action: 'sort', value: 'cycle' });
    dex.hitboxes.push({ x: groupX, y: controlY, w: groupW, h: controlH, action: 'group' });
    cx.fillStyle = '#8395b5'; cx.font = '11px monospace';
    fitText(W < 620 ? 'Vuốt để cuộn · chạm chọn · Enter: đi cùng' : 'Cuộn/kéo · ↑↓←→ chọn · R sort · G nhóm · Enter đi cùng · Esc đóng', layout.ox, controlY + 48, W - layout.ox * 2, 11);

    cx.save(); cx.beginPath(); cx.rect(0, layout.oy, W, layout.availableH); cx.clip();
    for (const row of content.rows) {
      const y = layout.oy + row.y - dex.scrollY;
      if (y + row.h < layout.oy || y > layout.gridBottom) continue;
      if (row.type === 'header') {
        const sectionCaptured = row.section.list.filter((char) => ensureMastery(char).captured).length;
        cx.fillStyle = 'rgba(15,40,75,.96)'; cx.fillRect(layout.ox, y, W - layout.ox * 2, 24);
        cx.fillStyle = row.section.tier === 'N4' ? '#d7b4ff' : row.section.tier === 'BONUS' ? '#ffd98a' : '#77ddff'; cx.font = 'bold 13px monospace';
        cx.fillText(row.section.locked ? `${row.section.label}  🔒 CẦN HUY HIỆU N5` : `${row.section.label}  ${sectionCaptured}/${row.section.list.length}`, layout.ox + 10, y + 17); continue;
      }
      row.list.forEach((char, col) => {
        const index = list.indexOf(char), info = kanjiInfo(char); if (!info) return;
        const id = info.monId, monster = C.MONSTERS[id]; if (!monster) return;
        const stat = ensureMastery(char), unlocked = stat.captured, selected = index === dex.sel, following = unlocked && id === currentPetId;
        const x = layout.ox + col * (layout.cardW + layout.gapX);
        cx.fillStyle = selected ? (unlocked ? 'rgba(22,85,143,.92)' : 'rgba(40,45,65,.94)') : (unlocked ? 'rgba(20,28,60,.94)' : 'rgba(12,14,24,.97)'); cx.fillRect(x, y, layout.cardW, layout.cardH);
        cx.strokeStyle = selected ? '#6cc0ff' : unlocked ? '#2a3a66' : '#242638'; cx.lineWidth = selected ? 3 : 1; cx.strokeRect(x, y, layout.cardW, layout.cardH);
        const image = unlocked ? monsterImg(id) : getSilhouette(id), iw = Math.max(30, Math.min(68, layout.cardW * .34, layout.cardH * .4));
        if (image) { const ih = iw * image.height / image.width; cx.drawImage(image, x + 11, y + 9, iw, ih); }
        const kanjiSize = Math.max(29, Math.min(44, layout.cardH * .3)); cx.fillStyle = unlocked ? '#ffd54a' : '#55586c'; cx.font = `bold ${kanjiSize}px ${JPFONT}`; cx.textAlign = 'right'; cx.fillText(unlocked ? info.char : '？', x + layout.cardW - 11, y + kanjiSize + 8); cx.textAlign = 'left';
        cx.fillStyle = unlocked ? '#fff' : '#77798a'; fitText(unlocked ? monster.name : '？？？', x + 11, y + layout.cardH - 54, layout.cardW - 22, 14, true);
        if (unlocked) {
          cx.fillStyle = '#9fd8f5'; fitText(`Lv.${stat.level}/${C.KLEVEL.maxLevel} ${levelLabel(stat.level)}`, x + 11, y + layout.cardH - 36, layout.cardW - 22, 11);
          cx.fillStyle = stat.recall > 70 ? '#6effa1' : stat.recall >= 30 ? '#ffd54a' : '#ff7777'; cx.font = '11px monospace'; cx.fillText(`Recall ${stat.recall}%`, x + 11, y + layout.cardH - 19);
          if (following) { cx.fillStyle = '#6effa1'; cx.font = 'bold 9px monospace'; cx.textAlign = 'right'; cx.fillText('● ĐANG THEO', x + layout.cardW - 10, y + layout.cardH - 19); cx.textAlign = 'left'; }
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
      cx.fillStyle = '#fff'; fitText(`${selected.char}  ${selected.meaning}`, 20, panelY + 31, W - 40, 20, true);
      cx.fillStyle = '#ffd54a'; fitText(`Âm ON: ${selected.on.join(', ') || '—'}`, 20, panelY + 57, narrow ? W - 40 : 280, 15);
      cx.fillStyle = '#6effa1'; fitText(`Âm KUN: ${selected.kun.join(', ') || '—'}`, narrow ? 20 : 320, narrow ? panelY + 78 : panelY + 57, narrow ? W - 40 : W - 340, 15);
      cx.fillStyle = recallColor; cx.font = '13px monospace'; fitText(`Recall ${stat.recall}% · 🔥 ${stat.winStreak} (best ${stat.bestWinStreak})`, 20, narrow ? panelY + 100 : panelY + 82, W - 40, 13);
    } else {
      cx.fillStyle = '#9ab'; cx.font = `18px ${JPFONT}`; cx.fillText('？？？', 20, panelY + 34); cx.font = '14px monospace'; cx.fillText('Tới 🏛️ Giảng đường để thu phục chữ này.', 20, panelY + 65);
    }
  }

  function drawDialog() {
    const W = cv.width, H = cv.height, w = W - 44, h = 110, x = 22, y = H - h - 16;
    cx.fillStyle = 'rgba(11,16,48,.93)'; cx.fillRect(x, y, w, h);
    cx.strokeStyle = '#16558f'; cx.lineWidth = 3; cx.strokeRect(x, y, w, h);
    cx.fillStyle = '#fff'; cx.font = `18px ${JPFONT}`; wrap(dialog.npc.lines[dialog.idx], x + 18, y + 34, w - 36, 26);
    cx.fillStyle = '#9fd8f5'; cx.font = '13px monospace'; cx.fillText('▶ Space để tiếp', x + w - 160, y + h - 14);
  }
  function drawToast() {
    const W = cv.width, H = cv.height, w = W - 44, h = 46, x = 22, y = H - h - 16;
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
  }

  // ---------- KHỞI ĐỘNG ----------
  const toLoad = [loadImg('player', C.ASSETS.player), loadImg('npc', C.ASSETS.npc), loadImg('tileset', C.ASSETS.tileset), loadImg('academy', C.ASSETS.academy)];
  // Chỉ preload pet đang theo. 219+ sprite còn lại được tải khi thực sự xuất
  // hiện, tránh decode hàng chục MB ảnh trước khi người chơi vào được game.
  if (C.MONSTERS[currentPetId]) toLoad.push(loadImg('mon_' + currentPetId, C.MONSTERS[currentPetId].img));
  Promise.all(toLoad).then(() => {
    if (loadError) {
      cx.setTransform(1, 0, 0, 1, 0, 0); cx.fillStyle = '#111'; cx.fillRect(0, 0, cv.width, cv.height);
      cx.fillStyle = '#ff6b6b'; cx.font = '16px monospace'; cx.fillText('Không tải được ảnh:', 20, 40);
      cx.fillStyle = '#fff'; cx.fillText(loadError, 20, 66);
      cx.fillStyle = '#9fd8f5'; cx.fillText('Kiểm tra thư mục assets/ cạnh index.html', 20, 98); return;
    }
    requestAnimationFrame(loop);
  });

  // ---------- Export nội bộ cho QA test (không ảnh hưởng khi chạy web) ----------
  const debugApi = {
    state: () => state, startBattle, answer, tryRun, endBattle,
    getBattle: () => battle, getPlayer: () => player,
    getPet: () => { const s = petMastery(); return { id: currentPetId, level: s.level, mp: s.mp, recall: s.recall, ...petData[currentPetId] }; },
    petData: () => petData, mastery: () => learning.mastery, makeQuestion, updateBattle,
    pickGrassKanji, availableSpawn, getSilhouette, openDex, onDexKey, getDex: () => ({ ...dex, list: [...dex.list] }), setPet: (id) => { if (petData[id]) { currentPetId = id; ensureMastery(C.MONSTERS[id].kanji).captured = true; } saveGame(); },
    collect, isCollected, expNeed, isDue, rustMultiplier, srsPromote, srsDemote,
    levelFromMp, mpFloorOfLevel, levelLabel, expInLevel, expToNext, awardWin, awardLoss, reappearWeight,
    getKanjiStat: (kanji) => ({ ...ensureMastery(kanji) }), getStreak: (kanji) => { const s = ensureMastery(kanji); return { winStreak: s.winStreak, lossStreak: s.lossStreak, bestWinStreak: s.bestWinStreak }; },
    recordAnswer, enterLecture, onLectureKey, answerLecture, getLecture: () => lecture,
    nextLectureKanji, academyLockedList, academyFilteredList, startCapture, answerCapture, onCaptureKey, updateCapture, getCapture: () => capture,
    getStamina: () => stamina, startPve, startGym, answerPve, getPve: () => pve,
    tierOfKanji, isTierUnlocked, tierProgress, isTierStudyComplete, hasBadge,
    getPveResult: () => pveResult, getCanvasSize: () => ({ width: cv.width, height: cv.height }),
    resetPetTrail, recordPlayerTrail, petFollowPosition, getPetTrail: () => trail.map((point) => ({ ...point })),
  };
  if (typeof window !== 'undefined') window.__KANJIGO_DEBUG = debugApi;
  if (typeof module !== 'undefined') module.exports = { _debug: debugApi };
})();
