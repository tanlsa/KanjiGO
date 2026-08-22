​// ============================================================
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
  const TILE = C.TILE, ZOOM = C.ZOOM || 1;
  const MAP_H = TILES.length, MAP_W = TILES[0].length;
  const K = C.TILE_KEYS;
  const BLOCKED = new Set(C.BLOCKED_TILES);

  const cv = document.getElementById('game');
  cv.width = C.CANVAS_W; cv.height = C.CANVAS_H;
  const cx = cv.getContext('2d');
  let VIEW_PX_W = cv.width / ZOOM, VIEW_PX_H = cv.height / ZOOM;
  function resizeCanvas() {
    cv.width = Math.max(320, window.innerWidth);
    cv.height = Math.max(240, window.innerHeight);
    VIEW_PX_W = cv.width / ZOOM;
    VIEW_PX_H = cv.height / ZOOM;
    cx.imageSmoothingEnabled = false;
  }
  resizeCanvas();
  addEventListener('resize', resizeCanvas);
  const JPFONT = '"Yu Gothic","Hiragino Kaku Gothic Pro","Noto Sans JP","MS Gothic",sans-serif';

  // ---------- LOAD ẢNH ----------
  const imgs = {}; let loadError = null;
  function loadImg(name, src) {
    return new Promise((res) => { const im = new Image(); im.onload = () => { imgs[name] = im; res(); }; im.onerror = () => { loadError = src; res(); }; im.src = src; });
  }

  // ---------- TRẠNG THÁI ----------
  let state = 'overworld';   // overworld | battle | dex | lecture | capture | pve
  const player = {
    gx: C.PLAYER.startGx, gy: C.PLAYER.startGy,
    px: C.PLAYER.startGx * TILE, py: C.PLAYER.startGy * TILE,
    facing: 'down', moving: false, animT: 0, frame: 0,
    fromX: 0, fromY: 0, toX: 0, toY: 0, moveT: 0,
    hp: C.PLAYER.maxHp, maxHp: C.PLAYER.maxHp, onBoat: false,
  };
  let dialog = { active: false, idx: 0, npc: null };
  let toast = { text: '', t: 0 };
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
  const learning = { total: 0, correct: 0, wrong: 0, streak: 0, best: 0, mastery: {}, captureAttempts: {} };
  const legacyMasteryKeys = new Set();
  const legacyPetProgress = {};
  const GAME_KEY = 'KANJIGO_GAME_V1';
  let stamina = C.CAPTURE.stamina;
  let pveResult = null;

  function kanjiInfo(char) {
    return Object.values(KDB.KANJI).find((k) => k.char === char) || null;
  }
  function resolveKanji(value) {
    if (!value) return null;
    const direct = kanjiInfo(value);
    if (direct) return direct.char;
    const byKey = KDB.KANJI[value];
    return byKey ? byKey.char : value;
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
  const trail = [];
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
    const quiz = state === 'battle' ? battle : state === 'capture' ? capture : state === 'pve' ? pve : null;
    if (!quiz || quiz.phase !== 'fight') return;
    const r = cv.getBoundingClientRect();
    const x = (e.clientX - r.left) * cv.width / r.width;
    const y = (e.clientY - r.top) * cv.height / r.height;
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
    if (dialog.active) { dialog.idx++; if (dialog.idx >= dialog.npc.lines.length) { dialog.active = false; dialog.npc = null; } return; }
    const npc = npcInFront();
    if (npc && npc.type === 'lecture') { enterLecture(); return; }
    if (npc && npc.type === 'pve') { startPve(); return; }
    if (npc) { dialog.active = true; dialog.idx = 0; dialog.npc = npc; return; }
    if (player.moving) return;
    const f = frontTile();
    if (!player.onBoat && f.t === K.ACADEMY_DOOR) { enterLecture(); return; }
    if (!player.onBoat && f.t === K.BOAT) { board(f); return; }
    if (player.onBoat && f.t >= 0 && f.t !== K.WATER && f.t !== K.BOAT && !BLOCKED.has(f.t)) { disembark(f); return; }
    if (!player.onBoat && f.t === K.WATER) { fish(); return; }
  }
  function board(f) { player.onBoat = true; player.gx = f.gx; player.gy = f.gy; player.px = f.gx * TILE; player.py = f.gy * TILE; showToast('🚤 Đã lên thuyền!'); }
  function disembark(f) { player.onBoat = false; player.gx = f.gx; player.gy = f.gy; player.px = f.gx * TILE; player.py = f.gy * TILE; showToast('🚶 Đã lên bờ.'); }
  function showNoCapturedEncounter() { showToast(C.ENCOUNTER.noCapturedMessage); }
  function fish() {
    if (!availableSpawn('water').length) { showNoCapturedEncounter(); return; }
    if (Math.random() < C.ENCOUNTER.FISH) { showToast('🎣 Có gì cắn câu!'); setTimeout(() => startBattle('water'), 500); }
    else showToast('🎣 ...không có gì cắn câu.');
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
  function capturedKanji() {
    return Object.values(KDB.KANJI).map((k) => k.char).filter((char) => ensureMastery(char).captured && C.MONSTERS[kanjiInfo(char).monId]);
  }
  function availableSpawn(kind) {
    const ids = C.SPAWN[kind] || Object.keys(C.MONSTERS);
    return ids.filter((id) => C.MONSTERS[id] && ensureMastery(C.MONSTERS[id].kanji).captured);
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
    if (mode === 'm1') { answer = q.answer; options = optionSet(answer, KDB.DISTRACTORS.slice()); }
    const result = { word, mean, target: q.target, answer, romaji: q.romaji, type, mode, options, correctIndex: options.indexOf(answer) };
    result.key = `${mode}|${questionKey(q)}`;
    return result;
  }

  function startBattle(kind) {
    const monId = pickMonster(kind);
    if (!monId) { showNoCapturedEncounter(); return false; }
    const m = C.MONSTERS[monId];
    const kanjiLevel = ensureMastery(m.kanji).level;
    syncPlayerScale(m.kanji, true);
    state = 'battle';
    battle = {
      kind, monId, mon: m, monHp: m.maxHp, monMaxHp: m.maxHp,
      grassKanji: kind === 'grass' ? m.kanji : null,
      kanjiLevel,
      q: makeQuestion(m.kanji),
      feedback: null, fbT: 0, qCooldown: 0, stun: 0, combo: 0,
      botNextIn: rnd([C.COMBAT.botMinMs, C.COMBAT.botMaxMs]),
      shake: 0, flash: 0, botFlash: 0,
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
      battle.combo++;
      const dmg = C.COMBAT.baseDamage + C.KLEVEL.dmgPerLevel * (battle.kanjiLevel - 1) + battle.combo * C.COMBAT.comboBonus;
      battle.monHp = Math.max(0, battle.monHp - dmg);
      battle.feedback = { good: true, text: `✓ Đúng! ${q.target} — ${q.answer}  (-${dmg} HP)` };
      battle.fbT = 900; battle.qCooldown = 850; battle.shake = 200;
      if (battle.monHp <= 0) { win(); return; }
    } else {
      recordAnswer(q, false);
      // ❗ SAI: choáng đủ wrongStun (3s). Khoá phím 1–4 và GIỮ NGUYÊN câu hỏi
      //   trong suốt thời gian choáng để người chơi kịp học đáp án đúng.
      battle.combo = 0;
      battle.stun = C.COMBAT.wrongStun;
      battle.qCooldown = C.COMBAT.wrongStun;   // không đổi câu khi đang choáng
      battle.fbT = C.COMBAT.wrongStun;          // feedback hiển thị suốt lúc choáng
      battle.feedback = { good: false, text: `✗ Sai! ${q.target} ở đây đọc「${q.answer}」(${q.romaji}) — âm ${q.type.toUpperCase()}` };
    }
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
  function nextLectureKanji() {
    const info = Object.values(KDB.KANJI).find((item) => !ensureMastery(item.char).lectured);
    return info ? info.char : Object.values(KDB.KANJI)[0].char;
  }
  function enterLecture(char = '') {
    const target = resolveKanji(char || nextLectureKanji()), info = kanjiInfo(target);
    if (!info) return false;
    const examples = KDB.QUESTIONS.filter((q) => q.target === target).slice(0, 2);
    lecture = { char: target, info, examples, phase: 'read', q: null, feedback: '' };
    state = 'lecture';
    return true;
  }
  function finishLecture() {
    ensureMastery(lecture.char).lectured = true;
    saveLearning();
    lecture.phase = 'done';
    lecture.feedback = `Đã học ${lecture.char}. Space để bắt đầu nghi thức thu phục.`;
  }
  function onLectureKey(k) {
    if (!lecture) return;
    if (k === 'escape') { state = 'overworld'; lecture = null; return; }
    if (lecture.phase === 'read' && (k === ' ' || k === 'enter')) {
      lecture.phase = 'check'; lecture.q = makeQuestion(lecture.char, '', 'm1'); return;
    }
    if (lecture.phase === 'check' && ['1', '2', '3', '4'].includes(k)) {
      const correct = parseInt(k, 10) - 1 === lecture.q.correctIndex;
      lecture.feedback = correct ? '✓ Chính xác!' : `Đáp án là ${lecture.q.answer} — cứ đọc lại và tiếp tục nhé.`;
      finishLecture();
      return;
    }
    if (lecture.phase === 'done' && (k === ' ' || k === 'enter')) {
      if (!startCapture(lecture.char)) { state = 'overworld'; lecture = null; }
    }
  }
  function startCapture(char = '') {
    const target = resolveKanji(char || (lecture && lecture.char) || nextLectureKanji()), info = kanjiInfo(target);
    if (!info) return false;
    const s = ensureMastery(target);
    if (!s.lectured) { showToast('Hãy học chữ này ở giảng đường trước.'); return false; }
    if (s.captured) { showToast('Chữ này đã được thu phục rồi.'); return false; }
    if (stamina <= 0) { showToast('Hết thể lực — ra bụi cỏ luyện chữ cũ để hồi.'); return false; }
    const attempt = (Number(learning.captureAttempts[target]) || 0) + 1;
    learning.captureAttempts[target] = attempt;
    stamina--;
    capture = { char: target, info, attempt, needed: attempt >= C.CAPTURE.relaxFromAttempt ? 3 : 4,
      q: makeQuestion(target, '', 'm1'), index: 0, correct: 0, phase: 'fight', qCooldown: 0,
      feedback: null, fbT: 0, hint: attempt >= C.CAPTURE.relaxFromAttempt + 1 };
    state = 'capture';
    saveGame(); saveLearning();
    return true;
  }
  function finishCapture() {
    const passed = capture.correct >= capture.needed, s = ensureMastery(capture.char);
    if (passed) {
      s.captured = true; s.nextReview = Date.now() + (C.SRS.newlyCapturedDueMs || 0);
      collect(capture.info.monId); saveLearning(); saveGame();
      capture.feedback = `🎉 Thu phục thành công ${capture.char}!`;
    } else {
      capture.feedback = `Chưa đủ điểm (${capture.correct}/5). Hãy luyện chữ cũ để hồi thể lực.`;
    }
    capture.endMsg = capture.feedback;
    capture.phase = 'end';
  }
  function answerCapture(idx) {
    if (!capture || capture.phase !== 'fight' || capture.qCooldown > 0) return;
    const q = capture.q, correct = idx === q.correctIndex;
    recordAnswer(q, correct);
    if (correct) capture.correct++;
    capture.feedback = correct ? { good: true, text: '✓ Đúng!' } : { good: false, text: `✗ ${q.answer}` };
    capture.fbT = 500; capture.qCooldown = 500; capture.index++;
    if (capture.index >= 5) capture.pendingEnd = true;
  }
  function onCaptureKey(k) {
    if (!capture) return;
    if (capture.phase === 'end') { if (k === ' ' || k === 'enter') { state = 'overworld'; capture = null; } return; }
    if (k === 'escape') { state = 'overworld'; capture = null; return; }
    if (['1', '2', '3', '4'].includes(k)) answerCapture(parseInt(k, 10) - 1);
  }

  // ---------- ⛩ PVE MINI TEST ----------
  let pve = null;
  function randomCapturedKanji() {
    const pool = capturedKanji();
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  }
  function startPve() {
    const target = randomCapturedKanji();
    if (!target) { showToast('Chưa có chữ nào được thu phục.'); return false; }
    pve = { index: 0, total: C.PVE.questions, correct: 0, combo: 0, bestCombo: 0, phase: 'fight', qCooldown: 0,
      q: makeQuestion(target, '', '', true), seen: {}, feedback: null, pendingEnd: false };
    state = 'pve'; pveResult = null;
    return true;
  }
  function finishPve() {
    const ratio = pve.correct / pve.total;
    const rank = C.PVE.ranks.find((item) => ratio >= item.min) || C.PVE.ranks[C.PVE.ranks.length - 1];
    const rewards = [];
    for (const char of Object.keys(pve.seen)) {
      const info = kanjiInfo(char);
      if (info) rewards.push({ kanji: char, monId: info.monId });
    }
    pveResult = { grade: rank.grade, ratio, correct: pve.correct, total: pve.total, bestCombo: pve.bestCombo, rewards };
    pve.endMsg = `KẾT QUẢ: Hạng ${rank.grade} • ${pve.correct}/${pve.total} (${Math.round(ratio * 100)}%) • Combo cao nhất x${pve.bestCombo}`;
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
  let dex = { sel: 0, list: [] };
  function collectedList() { return Object.values(KDB.KANJI).map((info) => info.char); }
  function openDex() {
    if (dialog.active || player.moving) return;
    dex.list = collectedList();
    const currentChar = C.MONSTERS[currentPetId] && C.MONSTERS[currentPetId].kanji;
    dex.sel = Math.max(0, dex.list.indexOf(currentChar));
    state = 'dex';
  }
  function dexLayout(total) {
    const W = cv.width, H = cv.height, ox = Math.max(18, Math.round(W * 0.024));
    const gapX = Math.max(10, Math.round(W * 0.014)), gapY = Math.max(10, Math.round(H * 0.014));
    const minCardW = 180;
    const widthCols = Math.floor((W - ox * 2 + gapX) / (minCardW + gapX));
    const balancedCols = Math.ceil(Math.sqrt(Math.max(1, total)));
    const cols = Math.max(1, Math.min(5, widthCols, balancedCols));
    const panelH = Math.max(100, Math.min(150, Math.round(H * 0.16)));
    const oy = 90, gridBottom = H - panelH - 16;
    const availableH = Math.max(40, gridBottom - oy), rows = Math.max(1, Math.min(3, Math.floor((availableH + gapY) / (54 + gapY))));
    const pageSize = cols * rows;
    const cardW = (W - ox * 2 - gapX * (cols - 1)) / cols;
    const cardH = Math.max(40, (availableH - gapY * (rows - 1)) / rows);
    return { ox, oy, gapX, gapY, cols, rows, pageSize, cardW, cardH, panelH };
  }
  function onDexKey(k) {
    if (k === 'escape' || k === 'd') { state = 'overworld'; return; }
    const n = dex.list.length; if (!n) return;
    const cols = dexLayout(n).cols;
    if (k === 'arrowleft' || k === 'a') dex.sel = (dex.sel - 1 + n) % n;
    else if (k === 'arrowright') dex.sel = (dex.sel + 1) % n;
    else if (k === 'arrowup' || k === 'w') dex.sel = (dex.sel - cols + n) % n;
    else if (k === 'arrowdown' || k === 's') dex.sel = (dex.sel + cols) % n;
    else if (k === 'enter' || k === ' ') {
      const info = kanjiInfo(dex.list[dex.sel]);
      if (!info || !C.MONSTERS[info.monId] || !ensureMastery(info.char).captured) { showToast('Chưa thu phục — tới 🏛️ Giảng đường trước nhé!'); return; }
      currentPetId = info.monId; trail.length = 0; saveGame();
      showToast(`🐾 ${C.MONSTERS[currentPetId].name} đang đi cùng bạn!`);
      state = 'overworld';
    }
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
    if (player.moving) {
      player.moveT += dt; const k = Math.min(1, player.moveT / C.MOVE_MS);
      player.px = player.fromX + (player.toX - player.fromX) * k;
      player.py = player.fromY + (player.toY - player.fromY) * k;
      player.animT += dt; if (player.animT >= C.ANIM_MS) { player.animT = 0; player.frame = (player.frame + 1) % C.FRAMES; }
      if (k >= 1) { player.moving = false; player.frame = 0; onStepComplete(); }
    } else {
      if (pressed('left')) tryMove('left');
      else if (pressedRight()) tryMove('right');
      else if (pressed('up')) tryMove('up');
      else if (pressed('down')) tryMove('down');
      else player.frame = 0;
    }
    if (player.moving) { trail.push({ px: player.px, py: player.py }); while (trail.length > C.PET.gap + 4) trail.shift(); }
  }
  function updateBattle(dt) {
    const b = battle; if (!b) return;
    if (b.shake > 0) b.shake -= dt; if (b.flash > 0) b.flash -= dt; if (b.botFlash > 0) b.botFlash -= dt;
    if (b.phase !== 'fight') return;
    if (b.stun > 0) b.stun -= dt;
    if (b.fbT > 0) b.fbT -= dt;
    if (b.qCooldown > 0) { b.qCooldown -= dt; if (b.qCooldown <= 0 && b.monHp > 0) b.q = makeQuestion(b.mon.kanji, b.q.key); }
    b.botNextIn -= dt;
    if (b.botNextIn <= 0) {
      const dmg = rnd(b.mon.atk); player.hp = Math.max(0, player.hp - dmg);
      b.flash = 150; b.botFlash = 300; b.playerHitMsg = `${b.mon.name} tấn công! -${dmg} HP`;
      b.botNextIn = rnd([C.COMBAT.botMinMs, C.COMBAT.botMaxMs]);
      if (player.hp <= 0) { lose(); return; }
    }
  }
  function updateCapture(dt) {
    if (!capture || capture.phase !== 'fight') return;
    if (capture.fbT > 0) capture.fbT -= dt;
    if (capture.qCooldown > 0) {
      capture.qCooldown -= dt;
      if (capture.qCooldown <= 0) {
        if (capture.pendingEnd) finishCapture();
        else capture.q = makeQuestion(capture.char, capture.q.key, 'm1');
      }
    }
  }
  function updatePve(dt) {
    if (!pve || pve.phase !== 'fight') return;
    if (pve.qCooldown > 0) {
      pve.qCooldown -= dt;
      if (pve.qCooldown <= 0) {
        if (pve.pendingEnd) finishPve();
        else { const target = randomCapturedKanji(); pve.q = makeQuestion(target, pve.q.key, '', true); }
      }
    }
  }

  // ---------- VẼ ----------
  function drawTile(idx, sx, sy) { cx.drawImage(imgs.tileset, idx * TILE, 0, TILE, TILE, sx, sy, TILE, TILE); }
  function drawSprite(img, dir, frame, sx, sy) { cx.drawImage(img, frame * TILE, C.DIR_ROW[dir] * TILE, TILE, TILE, sx, sy, TILE, TILE); }
  function syncTouchUi() {
    const hidden = state !== 'overworld';
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
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
      const idx = TILES[y][x], sx = x * TILE - camX, sy = y * TILE - camY;
      if (sx < -TILE || sx > VIEW_PX_W || sy < -TILE || sy > VIEW_PX_H) continue;
      const isAcademy = [K.ACADEMY_DOOR, K.ACADEMY_WALL, K.ACADEMY_ROOF].includes(idx);
      drawTile(isAcademy || idx === K.TREE ? K.GRASS : idx, sx, sy);
    }
    drawAcademy(camX, camY);
    for (const n of NPCS) {
      drawSprite(imgs.npc, 'down', 0, n.gx * TILE - camX, n.gy * TILE - camY);
      if (n.icon) { cx.font = '14px sans-serif'; cx.fillText(n.icon, n.gx * TILE - camX + 7, n.gy * TILE - camY - 3); }
    }
    drawPet(camX, camY);
    if (player.onBoat) drawTile(K.BOAT, Math.round(player.px - camX), Math.round(player.py - camY));
    drawSprite(imgs.player, player.facing, player.frame, Math.round(player.px - camX), Math.round(player.py - camY));
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
      if (TILES[y][x] !== K.TREE) continue; const sx = x * TILE - camX, sy = y * TILE - camY;
      if (sx < -TILE || sx > VIEW_PX_W || sy < -TILE || sy > VIEW_PX_H) continue; drawTile(K.TREE, sx, sy);
    }
  }
  function drawPet(camX, camY) {
    const img = imgs['mon_' + currentPetId]; if (!img) return;
    let pos;
    if (trail.length > C.PET.gap) pos = trail[trail.length - 1 - C.PET.gap];
    else { const b = { down: [0, -1], up: [0, 1], left: [1, 0], right: [-1, 0] }[player.facing]; pos = { px: player.px + b[0] * TILE, py: player.py + b[1] * TILE }; }
    const ratio = img.height / img.width, w = petSizeFor(petLevel()), h = petSizeFor(petLevel()) * ratio;
    const bob = C.PET.bob ? Math.sin(Date.now() / 220) * 1.5 : 0;
    const dx = pos.px - camX + (TILE - w) / 2, dy = pos.py - camY + (TILE - h) + bob;
    cx.fillStyle = 'rgba(0,0,0,.18)'; cx.beginPath(); cx.ellipse(dx + w / 2, pos.py - camY + TILE - 2, w * 0.38, 4, 0, 0, Math.PI * 2); cx.fill();
    cx.drawImage(img, dx, dy, w, h);
  }
  function drawAcademy(camX, camY) {
    const a = C.ACADEMY, x = a.gx * TILE - camX, y = a.gy * TILE - camY;
    const w = a.width * TILE, h = a.height * TILE;
    const academy = imgs.academy;
    if (academy) cx.drawImage(academy, x, y, w, h);
    cx.fillStyle = '#fff1c1'; cx.font = 'bold 10px monospace'; cx.fillText('GIẢNG ĐƯỜNG', x - 2, y - 5);
  }
  function drawHudHint() {
    const academy = frontTile().t === K.ACADEMY_DOOR;
    const compact = cv.width < 620;
    const message = academy ? 'Space: Vào Giảng đường' : (compact ? 'D: Dex · Space: Tương tác' : '↑↓←→ Di chuyển · D: Dex · Space: Tương tác');
    const hintW = Math.min(cv.width - 16, compact ? 230 : 370);
    cx.fillStyle = 'rgba(11,16,48,.82)'; cx.fillRect(8, 8, hintW, 28);
    cx.fillStyle = '#9fd8f5'; fitText(message, 16, 27, hintW - 16, 13);
    const total = Object.keys(KDB.KANJI).length;
    const captured = Object.values(KDB.KANJI).filter((k) => ensureMastery(k.char).captured).length;
    const status = `Kanji ${captured}/${total} · Pet 「${C.MONSTERS[currentPetId]?.kanji || '?'}」`;
    const statusW = Math.min(cv.width - 16, compact ? 190 : 230);
    const statusX = compact ? 8 : cv.width - statusW - 8, statusY = compact ? 42 : 8;
    cx.fillStyle = 'rgba(11,16,48,.72)'; cx.fillRect(statusX, statusY, statusW, 28);
    cx.fillStyle = '#ffd54a'; fitText(status, statusX + 8, statusY + 19, statusW - 16, 12);
  }

  // ----- BATTLE render -----
  const PANEL_H = (C.UI && C.UI.panelH) || 200;
  function renderBattle() {
    const b = battle, W = cv.width, H = cv.height, FIELD_H = H - PANEL_H;
    drawBattleBackground(b.kind, W, FIELD_H);
    if (b.flash > 0) { cx.fillStyle = `rgba(255,80,80,${b.flash / 500})`; cx.fillRect(0, 0, W, FIELD_H); }
    // monster
    const monCX = W - 150, monBaseY = FIELD_H * 0.66;
    cx.fillStyle = 'rgba(0,0,0,.22)'; cx.beginPath(); cx.ellipse(monCX, monBaseY + 2, 95, 20, 0, 0, Math.PI * 2); cx.fill();
    const sh = b.shake > 0 ? Math.sin(b.shake / 20) * 6 : 0;
    const m = b.mon, img = imgs['mon_' + b.monId];
    if (b.botFlash > 0) { cx.save(); cx.globalAlpha = 0.5 + 0.5 * Math.sin(Date.now() / 40); }
    cx.drawImage(img, monCX - m.drawW / 2 + sh, monBaseY - m.drawH, m.drawW, m.drawH);
    if (b.botFlash > 0) cx.restore();
    // player + pet nhỏ
    const plCX = 120, plBaseY = FIELD_H - 12, ps = 3.4;
    cx.fillStyle = 'rgba(0,0,0,.22)'; cx.beginPath(); cx.ellipse(plCX, plBaseY + 2, 70, 16, 0, 0, Math.PI * 2); cx.fill();
    cx.drawImage(imgs.player, 0, C.DIR_ROW.up * TILE, TILE, TILE, plCX - (TILE * ps) / 2, plBaseY - TILE * ps, TILE * ps, TILE * ps);
    const petImg = imgs['mon_' + currentPetId];
    if (petImg) { const pw = petSizeFor(petLevel(), 46), ph = pw * petImg.height / petImg.width; cx.drawImage(petImg, plCX + 30, plBaseY - ph, pw, ph); }

    // HP bars
    const hpW = Math.min(260, Math.max(150, (W - 70) / 2)), hpX = Math.max(28, W - 28 - hpW);
    drawHpBar(28, 24, `${m.name} 「${m.kanji}」 · Lv.${b.kanjiLevel}`, b.monHp, b.monMaxHp, '#e04a4a', hpW);
    drawHpBar(hpX, FIELD_H - 92, `${C.PLAYER.name}`, player.hp, player.maxHp, '#43d17a', hpW);
    // tiến độ của Kanji đang gặp (không phải pet đang dắt)
    drawEncounterMastery(b, hpX, FIELD_H - 42, hpW);

    // cảnh báo bot sắp đánh
    if (b.phase === 'fight' && b.botNextIn <= C.COMBAT.botTelegraph) {
      cx.fillStyle = `rgba(230,80,80,${0.4 + 0.4 * Math.sin(Date.now() / 90)})`;
      cx.font = 'bold 16px monospace'; cx.fillText('⚠ Bot sắp tấn công!', monCX - 90, 30);
    }
    // combo
    if (b.combo > 1) { cx.fillStyle = '#ffd54a'; cx.font = 'bold 18px monospace'; cx.fillText(`COMBO x${b.combo}`, 30, FIELD_H - 110); }

    // 🩹 FEEDBACK nổi ngay TRÊN khung câu hỏi (không đè lên đáp án)
    if (b.phase === 'fight' && b.feedback && b.fbT > 0) drawFeedbackBanner(b, W, FIELD_H);
    // 😵 Overlay CHOÁNG có đếm ngược (chống spam đáp án)
    if (b.phase === 'fight' && b.stun > 0) drawStunOverlay(b, W, FIELD_H);

    drawQuizPanel(b, W, H);
  }

  function renderLecture() {
    const W = cv.width, H = cv.height, info = lecture.info;
    cx.fillStyle = '#111b3d'; cx.fillRect(0, 0, W, H);
    cx.fillStyle = '#6cc0ff'; cx.font = `bold 24px ${JPFONT}`; cx.fillText('📖 GIẢNG ĐƯỜNG', 28, 42);
    cx.fillStyle = '#ffd54a'; cx.font = `bold 92px ${JPFONT}`; cx.fillText(info.char, 44, 154);
    cx.fillStyle = '#fff'; cx.font = `bold 24px ${JPFONT}`; cx.fillText(info.meaning, 170, 105);
    cx.fillStyle = '#ffd54a'; cx.font = `18px ${JPFONT}`; cx.fillText(`ON: ${info.on.join(', ')}`, 170, 140);
    cx.fillStyle = '#6effa1'; cx.fillText(`KUN: ${info.kun.join(', ')}`, 170, 172);
    if (lecture.phase === 'read') {
      cx.fillStyle = '#b9c8e8'; cx.font = `16px ${JPFONT}`; cx.fillText('Ví dụ:', 44, 214);
      lecture.examples.forEach((q, i) => cx.fillText(`• ${q.word} — ${q.mean} — ${q.answer}`, 64, 244 + i * 28));
      cx.fillStyle = '#9fd8f5'; cx.font = '15px monospace'; cx.fillText('Space: làm mini-check   Esc: quay lại', 44, H - 28);
    } else if (lecture.phase === 'check') {
      cx.fillStyle = '#fff'; cx.font = `18px ${JPFONT}`; cx.fillText('Mini-check: chọn cách đọc đúng (sai vẫn được qua)', 34, H - 120);
      drawLectureAnswers(lecture.q, 34, H - 88);
    } else {
      cx.fillStyle = '#6effa1'; cx.font = `bold 20px ${JPFONT}`; cx.fillText(lecture.feedback, 34, H - 92);
      cx.fillStyle = '#9fd8f5'; cx.font = '15px monospace'; cx.fillText('Space: bắt đầu nghi thức   Esc: quay lại', 34, H - 42);
    }
  }
  function drawLectureAnswers(q, x, y) {
    const columns = cv.width < 620 ? 2 : Math.min(4, q.options.length), gap = 10;
    const bw = columns === 4 ? 128 : Math.max(110, (cv.width - x * 2 - gap) / columns - gap / 2);
    q.options.forEach((option, i) => {
      const col = i % columns, row = Math.floor(i / columns), bx = x + col * (bw + gap), by = y + row * 46;
      cx.fillStyle = 'rgba(22,85,143,.8)'; cx.fillRect(bx, by, bw, 38);
      cx.fillStyle = '#fff'; fitText(`${i + 1}) ${option}`, bx + 12, by + 25, bw - 24, 16);
    });
  }
  function renderCapture() {
    const W = cv.width, H = cv.height, fieldH = H - PANEL_H;
    drawBattleBackground('grass', W, fieldH);
    cx.fillStyle = '#fff'; cx.font = `bold 20px ${JPFONT}`; cx.fillText(`NGHI THỨC THU PHỤC 「${capture.char}」`, 24, 34);
    cx.fillStyle = '#ffd54a'; cx.font = '15px monospace'; cx.fillText(`Lần thử ${capture.attempt} • Đúng ${capture.correct}/5 • Cần ${capture.needed}/5 • Thể lực còn ${stamina}`, 24, 60);
    drawQuizPanel(capture, W, H);
  }
  function renderPve() {
    const W = cv.width, H = cv.height, fieldH = H - PANEL_H;
    drawBattleBackground('grass', W, fieldH);
    cx.fillStyle = '#fff'; cx.font = `bold 20px ${JPFONT}`; cx.fillText('⛩ KỲ THI JLPT MINI', 24, 34);
    if (pve.phase === 'fight') cx.fillStyle = '#ffd54a';
    cx.font = '15px monospace'; cx.fillText(`Câu ${Math.min(pve.index + 1, pve.total)}/${pve.total} • Đúng ${pve.correct}`, 24, 60);
    if (pve.phase === 'end' && pveResult) {
      cx.fillStyle = '#ffd54a'; cx.font = `bold 46px ${JPFONT}`; cx.fillText(pveResult.grade, 50, 150);
      cx.fillStyle = '#fff'; cx.font = `16px ${JPFONT}`; cx.fillText('Kanji đã xuất hiện trong bài:', 130, 118);
      pveResult.rewards.slice(0, 6).forEach((reward, i) => cx.fillText(`「${reward.kanji}」 đã ôn`, 130, 146 + i * 23));
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
  function drawEncounterMastery(b, x, y, w = 260) {
    const kanji = b.mon.kanji, s = ensureMastery(kanji);
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
      q.mode === 'm4' ? 'Chữ này trong từ đọc theo âm ON hay KUN?' : q.mode === 'm5' ? `Từ nào chứa chữ 「${q.target}」?` : 'Chọn đúng cách đọc (phím 1–4 hoặc chạm nút):';
    cx.fillText(instruction, x + P, y + 24);
    cx.fillStyle = '#6effa1'; cx.font = '12px monospace'; cx.textAlign = 'right';
    cx.fillText(compact ? `${learning.correct}/${learning.total} đúng · ${learningAccuracy()}%` : `Học: ${learning.correct}/${learning.total} đúng  •  ${learningAccuracy()}%  •  🔥${learning.streak}`, W - P, y + 24);
    cx.textAlign = 'left';
    cx.fillStyle = '#fff'; cx.font = `bold 30px ${JPFONT}`;
    fitText(q.mode === 'm3' ? q.target : q.mode === 'm2' ? q.mean : q.word, x + P, y + 58, W - P * 2, 30, true);
    cx.fillStyle = '#ffd54a'; cx.font = `15px ${JPFONT}`;
    fitText(q.mode === 'm3' ? `Chọn nghĩa của 「${q.target}」` : q.mode === 'm4' ? `「${q.word}」 — ${q.mean}` : q.mode === 'm5' ? `Chữ cần tìm: 「${q.target}」` : `（${q.mean}）   ·   chữ cần đọc: 「${q.target}」`, x + P, y + 82, W - P * 2, 15);

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
      cx.fillStyle = '#fff'; cx.font = `20px ${JPFONT}`; cx.fillText(ans[i] || '', ox + 42, oy + bh / 2 + 7);
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
    const img = imgs['mon_' + monId];
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
      const img = unlocked ? imgs['mon_' + id] : getSilhouette(id);
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
  for (const id in C.MONSTERS) toLoad.push(loadImg('mon_' + id, C.MONSTERS[id].img));
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
    pickGrassKanji, availableSpawn, getSilhouette, openDex, onDexKey, setPet: (id) => { if (petData[id]) { currentPetId = id; ensureMastery(C.MONSTERS[id].kanji).captured = true; } saveGame(); },
    collect, isCollected, expNeed, isDue, rustMultiplier, srsPromote, srsDemote,
    levelFromMp, mpFloorOfLevel, levelLabel, expInLevel, expToNext, awardWin, awardLoss, reappearWeight,
    getKanjiStat: (kanji) => ({ ...ensureMastery(kanji) }), getStreak: (kanji) => { const s = ensureMastery(kanji); return { winStreak: s.winStreak, lossStreak: s.lossStreak, bestWinStreak: s.bestWinStreak }; },
    recordAnswer, enterLecture, startCapture, answerCapture, getCapture: () => capture,
    getStamina: () => stamina, startPve, answerPve, getPve: () => pve,
    getPveResult: () => pveResult,
  };
  if (typeof window !== 'undefined') window.__KANJIGO_DEBUG = debugApi;
  if (typeof module !== 'undefined') module.exports = { _debug: debugApi };
})();
