// ============================================================
//  CONFIG.JS — CẤU HÌNH GAME "KanjiGO". Chỉnh ở đây, không đụng engine.
// ============================================================
window.CONFIG = {
  GAME_NAME: 'KanjiGO',

  // --- 🖥️ UI / LAYOUT khu học (chống đè chữ) ---
  UI: {
    panelH: 200,      // chiều cao khung câu hỏi (px). Tăng nếu chữ vẫn chật.
    answerH: 36,      // chiều cao mỗi nút đáp án
    answerGapY: 8,    // khoảng cách dọc giữa 2 hàng đáp án
  },

  ASSETS: {
    player:  'assets/characters/player.png',
    npc:     'assets/characters/npc.png',
    tileset: 'assets/world/tileset.png',
    academy: 'assets/world/academy.png',
  },

  TILE: 32, ZOOM: 2, CANVAS_W: 640, CANVAS_H: 480,
  MOVE_MS: 180, ANIM_MS: 120, FRAMES: 4,
  DIR_ROW: { down: 0, left: 1, right: 2, up: 3 },

  TILE_KEYS: {
    GRASS: 0, TREE: 1, WATER: 2, PATH: 3, FLOWER: 4, TALLGRASS: 5, BOAT: 6,
    ACADEMY_DOOR: 7, ACADEMY_WALL: 8, ACADEMY_ROOF: 9,
  },
  BLOCKED_TILES: [1, 2, 6, 8, 9],
  ACADEMY: { gx: 4, gy: 1, width: 3, height: 3, doorGx: 5, doorGy: 3 },

  ENCOUNTER: {
    TALLGRASS: 0.22, SURF: 0.15, FISH: 0.55,
    noCapturedMessage: 'Chưa có Kanji nào để gặp ở đây — hãy tới 🏛️ Giảng đường thu phục chữ mới trước!',
  },

  // --- PLAYER (là người chiến đấu, có HP) ---
  PLAYER: { name: 'Bạn', maxHp: 30, startGx: 3, startGy: 5 },

  // --- ⚔️ COMBAT REALTIME (quiz kanji) ---
  COMBAT: {
    baseDamage: 8,        // damage khi trả lời ĐÚNG (cộng theo level pet)
    dmgPerPetLevel: 2,    // mỗi cấp pet +damage
    comboBonus: 2,        // đúng liên tiếp: mỗi combo +damage
    wrongStun: 3000,      // ❗ SAI: choáng 3s, khoá phím 1–4 (chống spam đáp án)
    botMinMs: 3500,       // bot đánh: khoảng cách tối thiểu (ms)
    botMaxMs: 5000,       // bot đánh: khoảng cách tối đa (ms)
    botTelegraph: 1000,    // thời gian "báo trước" bot sắp đánh (ms)
    runChance: 0.6,       // xác suất chạy thoát (Esc)
    loseExpPenalty: 10,   // THUA: trừ EXP của pet đang theo
  },

  // --- 🐾 PET đi theo + EXP/Level ---
  PET: { monId: 'kuni', size: 30, gap: 16, bob: true },
  LEVEL: {
    expPerLevel: 20,      // EXP cần mỗi cấp = level * expPerLevel
    hpPerLevel: 5,        // lên cấp: +maxHp (áp cho PLAYER khi pet lên cấp)
    maxLevel: 20,
    expPerCorrect: 2,     // mỗi câu đúng +EXP nhỏ
  },
  // --- 🧠 MASTERY / LEVEL / RECALL theo từng Kanji ---
  KLEVEL: {
    maxLevel: 10,
    thresholds: [null, 0, 12, 30, 55, 90, 140, 205, 290, 400, 540],
    labels: { 1: 'Beginner', 4: 'Elementary', 7: 'Advanced', 10: 'Mastery' },
    mpBasePerWin: 10,
    winStreakMultMax: 2.5,
    winStreakStep: 0.15,
    recallWinRecover: 20,
    recallLossPenalty: 15,
    lossStreakTrigger: 3,
    recallStreakExtra: 15,
    mpStreakPenalty: 20,
    hpPerLevel: 4,
    dmgPerLevel: 2,
    petSizePerLevel: 3,
    petSizeMax: 60,
    hpAppliesTo: 'player',
  },

  // --- 📚 HỌC THÔNG MINH ---
  LEARNING: {
    persist: true,        // giữ thống kê học sau khi tải lại trang
    avoidRepeat: true,    // ưu tiên câu đang yếu và tránh lặp ngay câu vừa làm
  },

  // --- 🧠 SRS Leitner + vòng lặp học ---
  SRS: {
    boxIntervals: [0, 60e3, 5 * 60e3, 30 * 60e3, 3 * 3600e3, 24 * 3600e3],
    rustBonusMax: 2.5,
    newlyCapturedDueMs: 0,
  },
  CAPTURE: {
    stamina: 3,
    staminaRegenPerGrassWin: 1,
    relaxFromAttempt: 3,
  },
  QUESTION_MODES: { weights: { m1: 3, m2: 2, m3: 2, m4: 2, m5: 1 } },
  PVE: {
    questions: 10,
    baseExpPerKanji: 6,
    ranks: [
      { grade: 'A', min: 0.90, expMult: 2.0 },
      { grade: 'B', min: 0.70, expMult: 1.5 },
      { grade: 'C', min: 0.50, expMult: 1.0 },
      { grade: 'D', min: 0.00, expMult: 0.5 },
    ],
  },

  // --- 📖 THƯ VIỆN MONSTER (id khớp KANJI_DB.KANJI[*].monId) ---
  MONSTERS: {
    yin:  { name: 'Âm Thư Yêu', kanji: '音', img: 'assets/monsters/yin/sprite.png',  maxHp: 24, atk: [3, 6], exp: 15, drawW: 200, drawH: 205 },
    ri:   { name: 'Nhật Quang',  kanji: '日', img: 'assets/monsters/ri/sprite.png',   maxHp: 22, atk: [3, 6], exp: 16, drawW: 205, drawH: 190 },
    kuni: { name: 'Quốc Vương',  kanji: '国', img: 'assets/monsters/kuni/sprite.png', maxHp: 28, atk: [4, 7], exp: 20, drawW: 200, drawH: 200 },
    nen:  { name: 'Niên Thú',    kanji: '年', img: 'assets/monsters/nen/sprite.png',  maxHp: 26, atk: [4, 7], exp: 19, drawW: 210, drawH: 210 },
    dai:  { name: 'Đại Vương',   kanji: '大', img: 'assets/monsters/dai/sprite.png',  maxHp: 32, atk: [5, 8], exp: 25, drawW: 215, drawH: 205 },
    fish: { name: 'Ngư Âm Tinh', kanji: '魚', img: 'assets/monsters/fish/sprite.png', maxHp: 20, atk: [3, 6], exp: 18, drawW: 200, drawH: 200 },
    bar:  { name: 'Nhất Bản',    kanji: '一', img: 'assets/monsters/bar/sprite.png',  maxHp: 18, atk: [3, 5], exp: 14, drawW: 220, drawH: 130 },
  },

  // 🐾 pet id -> monster id (pet dùng chỉ số nào để chiến đấu)
  //   (dùng chung MONSTERS; pet có level+exp riêng lưu ở engine)
  SPAWN: { grass: ['yin', 'ri', 'kuni', 'nen', 'dai'], water: ['fish', 'bar'] },
};
 
