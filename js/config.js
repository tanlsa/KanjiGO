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
  MOVE_MS: 180, RUN_MOVE_MS: 105,
  ANIM_MS: 120, RUN_ANIM_MS: 72, FRAMES: 4,
  DIR_ROW: { down: 0, left: 1, right: 2, up: 3 },

  TILE_KEYS: {
    GRASS: 0, TREE: 1, WATER: 2, PATH: 3, FLOWER: 4, TALLGRASS: 5, BOAT: 6,
    ACADEMY_DOOR: 7, ACADEMY_WALL: 8, ACADEMY_ROOF: 9,
  },
  BLOCKED_TILES: [1, 2, 6, 8, 9],
  ACADEMY: { gx: 3, gy: 1, width: 5, height: 4, doorGx: 5, doorGy: 4 },

  ENCOUNTER: {
    TALLGRASS: 0.22, SURF: 0.15, FISH: 0.55,
    noCapturedMessage: 'Chưa có Kanji nào để gặp ở đây — hãy tới 🏛️ Giảng đường thu phục chữ mới trước!',
  },
  FISHING: { castMs: 320, waitMs: 900, reelMs: 420 },

  // --- PLAYER (là người chiến đấu, có HP) ---
  PLAYER: { name: 'Bạn', maxHp: 30, startGx: 3, startGy: 5 },

  // --- ⚔️ COMBAT REALTIME (quiz kanji) ---
  COMBAT: {
    baseDamage: 8,        // damage khi trả lời ĐÚNG (cộng theo level pet)
    dmgPerPetLevel: 2,    // mỗi cấp pet +damage
    comboBonus: 2,        // đúng liên tiếp: mỗi combo +damage
    wrongStun: 1000,      // sai: hiện đáp án + animation phản công ngắn
    botMinMs: 4000,       // Attack Gauge: khoảng chuẩn bị tối thiểu (ms)
    botMaxMs: 5000,       // Attack Gauge: khoảng chuẩn bị tối đa (ms)
    botTelegraph: 1000,   // vùng nguy hiểm cuối thanh (ms)
    perfectMs: 2000,      // trả lời trong thời gian này được PERFECT
    gaugePush: 0.20,      // đúng thường đẩy lùi Attack Gauge 20%
    perfectGaugePush: 0.35,
    energyMax: 3,         // đủ 3 năng lượng tự động tung tuyệt kỹ
    specialMultiplier: 1.5,
    enemyHpPerDamage: 3.5,// bảo đảm mini quái sống đủ lâu để tích được tuyệt kỹ
    hitStopMs: 70,
    runChance: 0.6,       // xác suất chạy thoát (Esc)
    loseExpPenalty: 10,   // THUA: trừ EXP của pet đang theo
  },

  // --- 🐾 PET đi theo + EXP/Level ---
  PET: { monId: 'kuni', size: 30, gap: 16, bob: true },
  // Pet cấp sẵn khi khởi tạo. Level là mức tối thiểu, không làm giảm tiến độ save cũ.
  INITIAL_PETS: [
    { monId: 'fish', level: 10 },
  ],
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
  QUESTION_MODES: { weights: { m1: 3, m2: 2, m3: 2, m4: 2, m5: 1, m6: 2, m7: 2 } },
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
  PROGRESSION: {
    order: ['N5', 'N4'],
    gym: {
      N5: { questions: 10, passRatio: 0.8, badge: 'N5', unlocks: 'N4' },
    },
  },

  // --- 📖 THƯ VIỆN MONSTER (id khớp KANJI_DB.KANJI[*].monId) ---
  MONSTERS: {
    yin:  { name: 'Âm Thư Yêu', kanji: '音', img: 'assets/monsters/yin/sprite.png',  maxHp: 24, atk: [3, 6], exp: 15, drawW: 200, drawH: 205, effect: 'sound-wave' },
    ri:   { name: 'Nhật Quang',  kanji: '日', img: 'assets/monsters/ri/sprite.png',   maxHp: 22, atk: [3, 6], exp: 16, drawW: 205, drawH: 190, effect: 'sun-glow' },
    kuni: { name: 'Quốc Vương',  kanji: '国', img: 'assets/monsters/kuni/sprite.png', maxHp: 28, atk: [4, 7], exp: 20, drawW: 200, drawH: 200, effect: 'boundary' },
    nen:  { name: 'Niên Thú',    kanji: '年', img: 'assets/monsters/nen/sprite.png',  maxHp: 26, atk: [4, 7], exp: 19, drawW: 210, drawH: 210, effect: 'seasons' },
    dai:  { name: 'Đại Vương',   kanji: '大', img: 'assets/monsters/dai/sprite.png',  maxHp: 32, atk: [5, 8], exp: 25, drawW: 215, drawH: 205, effect: 'grow' },
    fish: { name: 'Ngư Âm Tinh', kanji: '魚', img: 'assets/monsters/fish/sprite.png', maxHp: 20, atk: [3, 6], exp: 18, drawW: 200, drawH: 200, effect: 'bubbles' },
    bar:  { name: 'Nhất Bản',    kanji: '一', img: 'assets/monsters/bar/sprite.png',  maxHp: 18, atk: [3, 5], exp: 14, drawW: 220, drawH: 130, effect: 'orbit-1' },
    hito: { name: 'Nhân Bộ Khách', kanji: '人', img: 'assets/monsters/hito/sprite.png', maxHp: 22, atk: [3, 6], exp: 16, drawW: 200, drawH: 200, effect: 'people-pair' },
    juu:  { name: 'Thập Lực Sĩ', kanji: '十', img: 'assets/monsters/juu/sprite.png', maxHp: 24, atk: [4, 7], exp: 18, drawW: 200, drawH: 200, effect: 'cross-flare' },
    ni:   { name: 'Nhị Tuyến Tinh', kanji: '二', img: 'assets/monsters/ni/sprite.png', maxHp: 20, atk: [3, 6], exp: 15, drawW: 210, drawH: 200, effect: 'orbit-2' },
    hon:  { name: 'Bản Nguyên Linh', kanji: '本', img: 'assets/monsters/hon/sprite.png', maxHp: 24, atk: [4, 7], exp: 18, drawW: 205, drawH: 205, effect: 'page-flip' },
    chuu: { name: 'Trung Tâm Vệ', kanji: '中', img: 'assets/monsters/chuu/sprite.png', maxHp: 23, atk: [4, 7], exp: 17, drawW: 200, drawH: 205, effect: 'center-pulse' },
    chou: { name: 'Trường Lão', kanji: '長', img: 'assets/monsters/chou/sprite.png', maxHp: 28, atk: [5, 8], exp: 21, drawW: 210, drawH: 210, effect: 'lengthen' },
    shutsu: { name: 'Xuất Môn Tinh', kanji: '出', img: 'assets/monsters/shutsu/sprite.png', maxHp: 24, atk: [4, 7], exp: 18, drawW: 205, drawH: 205, effect: 'outward' },
    san: { name: 'Tam Tầng Võ Sĩ', kanji: '三', img: 'assets/monsters/san/sprite.png', maxHp: 22, atk: [3, 7], exp: 17, drawW: 215, drawH: 195, effect: 'orbit-3' },
    ji: { name: 'Thời Khắc Linh', kanji: '時', img: 'assets/monsters/ji/sprite.png', maxHp: 29, atk: [5, 8], exp: 22, drawW: 210, drawH: 210, effect: 'clock' },
    gyou: { name: 'Hành Lộ Tinh', kanji: '行', img: 'assets/monsters/gyou/sprite.png', maxHp: 27, atk: [4, 8], exp: 20, drawW: 210, drawH: 210, effect: 'steps' },
    ken: { name: 'Kiến Nhãn Linh', kanji: '見', img: 'assets/monsters/ken/sprite.png', maxHp: 26, atk: [4, 8], exp: 20, drawW: 205, drawH: 210, effect: 'scan' },
    ima: { name: 'Hiện Thời Tinh', kanji: '今', img: 'assets/monsters/ima/sprite.png', maxHp: 25, atk: [4, 7], exp: 19, drawW: 210, drawH: 205, effect: 'now-pulse' },
    getsu: { name: 'Nguyệt Quang Linh', kanji: '月', img: 'assets/monsters/getsu/sprite.png', maxHp: 28, atk: [5, 8], exp: 21, drawW: 205, drawH: 215, effect: 'moon-glow' },
    bun: { name: 'Phân Đoạn Nhân', kanji: '分', img: 'assets/monsters/bun/sprite.png', maxHp: 27, atk: [5, 8], exp: 21, drawW: 210, drawH: 210, effect: 'split' },
    ato: { name: 'Hậu Hành Giả', kanji: '後', img: 'assets/monsters/ato/sprite.png', maxHp: 30, atk: [5, 9], exp: 23, drawW: 215, drawH: 215, effect: 'backtrail' },
    mae: { name: 'Tiền Phong Linh', kanji: '前', img: 'assets/monsters/mae/sprite.png', maxHp: 29, atk: [5, 8], exp: 22, drawW: 210, drawH: 215, effect: 'forward' },
    sei: { name: 'Sinh Mệnh Tinh', kanji: '生', img: 'assets/monsters/sei/sprite.png', maxHp: 31, atk: [5, 9], exp: 24, drawW: 210, drawH: 210, effect: 'life' },
    go: { name: 'Ngũ Lực Sĩ', kanji: '五', img: 'assets/monsters/go/sprite.png', maxHp: 27, atk: [4, 8], exp: 21, drawW: 215, drawH: 205, effect: 'orbit-5' },
    kan: { name: 'Khoảng Giới Linh', kanji: '間', img: 'assets/monsters/kan/sprite.png', maxHp: 32, atk: [5, 9], exp: 25, drawW: 210, drawH: 220, effect: 'portal' },
    ue: { name: 'Thượng Thăng Linh', kanji: '上', img: 'assets/monsters/ue/sprite.png', maxHp: 28, atk: [5, 8], exp: 22, drawW: 215, drawH: 205, effect: 'rise' },
    higashi: { name: 'Đông Dương Tinh', kanji: '東', img: 'assets/monsters/higashi/sprite.png', maxHp: 33, atk: [5, 9], exp: 25, drawW: 215, drawH: 220, effect: 'sunrise' },
    yon: { name: 'Tứ Phương Linh', kanji: '四', img: 'assets/monsters/yon/sprite.png', maxHp: 29, atk: [5, 8], exp: 22, drawW: 215, drawH: 205, effect: 'orbit-4' },
    kin: { name: 'Kim Quang Tinh', kanji: '金', img: 'assets/monsters/kin/sprite.png', maxHp: 34, atk: [6, 9], exp: 26, drawW: 215, drawH: 220, effect: 'gold-sparkle' },
    kyuu: { name: 'Cửu Hoàn Linh', kanji: '九', img: 'assets/monsters/kyuu/sprite.png', maxHp: 30, atk: [5, 9], exp: 23, drawW: 215, drawH: 210, effect: 'orbit-9' },
    nyuu: { name: 'Nhập Môn Linh', kanji: '入', img: 'assets/monsters/nyuu/sprite.png', maxHp: 31, atk: [5, 9], exp: 24, drawW: 215, drawH: 215, effect: 'inward' },
    gaku: { name: 'Học Trí Tinh', kanji: '学', img: 'assets/monsters/gaku/sprite.png', maxHp: 33, atk: [5, 9], exp: 25, drawW: 215, drawH: 215, effect: 'study' },
    kou: { name: 'Cao Phong Linh', kanji: '高', img: 'assets/monsters/kou/sprite.png', maxHp: 35, atk: [6, 10], exp: 27, drawW: 215, drawH: 225, effect: 'height' },
    en: { name: 'Viên Hoàn Tinh', kanji: '円', img: 'assets/monsters/en/sprite.png', maxHp: 32, atk: [5, 9], exp: 25, drawW: 215, drawH: 215, effect: 'coin-ring' },
    ko: { name: 'Đồng Tử Linh', kanji: '子', img: 'assets/monsters/ko/sprite.png', maxHp: 30, atk: [5, 9], exp: 24, drawW: 210, drawH: 215, effect: 'child-bounce' },
    gai: { name: 'Ngoại Giới Linh', kanji: '外', img: 'assets/monsters/gai/sprite.png', maxHp: 34, atk: [6, 10], exp: 26, drawW: 215, drawH: 220, effect: 'outside-drift' },
    hachi: { name: 'Bát Phương Tinh', kanji: '八', img: 'assets/monsters/hachi/sprite.png', maxHp: 31, atk: [5, 9], exp: 24, drawW: 215, drawH: 210, effect: 'orbit-8' },
    roku: { name: 'Lục Giác Linh', kanji: '六', img: 'assets/monsters/roku/sprite.png', maxHp: 31, atk: [5, 9], exp: 24, drawW: 215, drawH: 215, effect: 'orbit-6' },
    shita: { name: 'Hạ Giáng Linh', kanji: '下', img: 'assets/monsters/shita/sprite.png', maxHp: 33, atk: [6, 10], exp: 26, drawW: 215, drawH: 220, effect: 'sink' },
    rai: { name: 'Lai Phong Linh', kanji: '来', img: 'assets/monsters/rai/sprite.png', maxHp: 35, atk: [6, 10], exp: 27, drawW: 220, drawH: 220, effect: 'approach' },
    ki: { name: 'Khí Lưu Tinh', kanji: '気', img: 'assets/monsters/ki/sprite.png', maxHp: 34, atk: [6, 10], exp: 27, drawW: 220, drawH: 220, effect: 'breeze' },
    shou: { name: 'Tiểu Quang Linh', kanji: '小', img: 'assets/monsters/shou/sprite.png', maxHp: 29, atk: [5, 9], exp: 23, drawW: 205, drawH: 210, effect: 'tiny' },
    nana: { name: 'Thất Tinh Linh', kanji: '七', img: 'assets/monsters/nana/sprite.png', maxHp: 32, atk: [5, 10], exp: 25, drawW: 215, drawH: 215, effect: 'orbit-7' },
    yama: { name: 'Sơn Mạch Linh', kanji: '山', img: 'assets/monsters/yama/sprite.png', maxHp: 37, atk: [6, 11], exp: 29, drawW: 225, drawH: 220, effect: 'peaks' },
    hanashi: { name: 'Thoại Âm Linh', kanji: '話', img: 'assets/monsters/hanashi/sprite.png', maxHp: 36, atk: [6, 11], exp: 28, drawW: 225, drawH: 220, effect: 'speech-bubbles' },
    onna: { name: 'Nữ Hoa Linh', kanji: '女', img: 'assets/monsters/onna/sprite.png', maxHp: 33, atk: [6, 10], exp: 26, drawW: 220, drawH: 215, effect: 'grace-step' },
    kita: { name: 'Bắc Cực Linh', kanji: '北', img: 'assets/monsters/kita/sprite.png', maxHp: 35, atk: [6, 10], exp: 27, drawW: 220, drawH: 220, effect: 'north-star' },
    gozen: { name: 'Ngọ Quang Linh', kanji: '午', img: 'assets/monsters/gozen/sprite.png', maxHp: 34, atk: [6, 10], exp: 27, drawW: 215, drawH: 220, effect: 'noon-ray' },
    hyaku: { name: 'Bách Điểm Linh', kanji: '百', img: 'assets/monsters/hyaku/sprite.png', maxHp: 38, atk: [7, 11], exp: 30, drawW: 220, drawH: 220, effect: 'hundred-grid' },
    sho: { name: 'Thư Bút Linh', kanji: '書', img: 'assets/monsters/sho/sprite.png', maxHp: 37, atk: [7, 11], exp: 29, drawW: 220, drawH: 225, effect: 'ink-strokes' },
    saki: { name: 'Tiên Phong Linh', kanji: '先', img: 'assets/monsters/saki/sprite.png', maxHp: 36, atk: [6, 11], exp: 28, drawW: 220, drawH: 220, effect: 'lead-arrow' },
    na: { name: 'Danh Ấn Linh', kanji: '名', img: 'assets/monsters/na/sprite.png', maxHp: 35, atk: [6, 10], exp: 27, drawW: 220, drawH: 220, effect: 'name-tag' },
    kawa: { name: 'Xuyên Lưu Linh', kanji: '川', img: 'assets/monsters/kawa/sprite.png', maxHp: 36, atk: [6, 11], exp: 28, drawW: 225, drawH: 220, effect: 'river-flow' },
    sen: { name: 'Thiên Tinh Linh', kanji: '千', img: 'assets/monsters/sen/sprite.png', maxHp: 39, atk: [7, 12], exp: 31, drawW: 220, drawH: 225, effect: 'many-sparkles' },
    mizu: { name: 'Thủy Ba Linh', kanji: '水', img: 'assets/monsters/mizu/sprite.png', maxHp: 38, atk: [7, 11], exp: 30, drawW: 225, drawH: 220, effect: 'water-ripple' },
    han: { name: 'Bán Phân Linh', kanji: '半', img: 'assets/monsters/han/sprite.png', maxHp: 37, atk: [7, 11], exp: 29, drawW: 220, drawH: 220, effect: 'half-split' },
    otoko: { name: 'Nam Lực Linh', kanji: '男', img: 'assets/monsters/otoko/sprite.png', maxHp: 41, atk: [7, 12], exp: 32, drawW: 225, drawH: 225, effect: 'strength-pulse' },
    nishi: { name: 'Tây Dương Linh', kanji: '西', img: 'assets/monsters/nishi/sprite.png', maxHp: 39, atk: [7, 11], exp: 31, drawW: 225, drawH: 220, effect: 'sunset-drift' },
    den: { name: 'Điện Quang Linh', kanji: '電', img: 'assets/monsters/den/sprite.png', maxHp: 43, atk: [8, 13], exp: 34, drawW: 225, drawH: 225, effect: 'lightning' },
    go_lang: { name: 'Ngữ Âm Linh', kanji: '語', img: 'assets/monsters/go_lang/sprite.png', maxHp: 42, atk: [7, 12], exp: 33, drawW: 225, drawH: 225, effect: 'word-sparks' },
    tsuchi: { name: 'Thổ Địa Linh', kanji: '土', img: 'assets/monsters/tsuchi/sprite.png', maxHp: 42, atk: [7, 12], exp: 33, drawW: 225, drawH: 220, effect: 'earth-crumble' },
    moku: { name: 'Mộc Diệp Linh', kanji: '木', img: 'assets/monsters/moku/sprite.png', maxHp: 40, atk: [7, 12], exp: 32, drawW: 225, drawH: 225, effect: 'leaf-fall' },
    shoku: { name: 'Thực Vị Linh', kanji: '食', img: 'assets/monsters/shoku/sprite.png', maxHp: 44, atk: [8, 13], exp: 35, drawW: 225, drawH: 225, effect: 'steam-aroma' },
    kuruma: { name: 'Xa Luân Linh', kanji: '車', img: 'assets/monsters/kuruma/sprite.png', maxHp: 43, atk: [8, 13], exp: 34, drawW: 225, drawH: 225, effect: 'wheel-tracks' },
    minami: { name: 'Nam Phong Linh', kanji: '南', img: 'assets/monsters/minami/sprite.png', maxHp: 41, atk: [7, 12], exp: 33, drawW: 225, drawH: 225, effect: 'south-compass' },
    nani: { name: 'Hà Vấn Linh', kanji: '何', img: 'assets/monsters/nani/sprite.png', maxHp: 42, atk: [7, 12], exp: 34, drawW: 225, drawH: 225, effect: 'question-orbit' },
    man: { name: 'Vạn Tinh Linh', kanji: '万', img: 'assets/monsters/man/sprite.png', maxHp: 43, atk: [8, 12], exp: 34, drawW: 225, drawH: 225, effect: 'myriad-stars' },
    kou_school: { name: 'Hiệu Học Linh', kanji: '校', img: 'assets/monsters/kou_school/sprite.png', maxHp: 44, atk: [8, 12], exp: 35, drawW: 225, drawH: 225, effect: 'school-bell' },
    mai: { name: 'Mỗi Nhật Linh', kanji: '毎', img: 'assets/monsters/mai/sprite.png', maxHp: 44, atk: [8, 13], exp: 35, drawW: 225, drawH: 225, effect: 'repeat-loop' },
    shiro: { name: 'Bạch Quang Linh', kanji: '白', img: 'assets/monsters/shiro/sprite.png', maxHp: 45, atk: [8, 13], exp: 36, drawW: 225, drawH: 225, effect: 'white-shimmer' },
    ten: { name: 'Thiên Không Linh', kanji: '天', img: 'assets/monsters/ten/sprite.png', maxHp: 45, atk: [8, 13], exp: 36, drawW: 225, drawH: 225, effect: 'sky-rays' },
    haha: { name: 'Mẫu Tâm Linh', kanji: '母', img: 'assets/monsters/haha/sprite.png', maxHp: 46, atk: [8, 13], exp: 37, drawW: 225, drawH: 225, effect: 'heart-embrace' },
    hi_fire: { name: 'Hỏa Diệm Linh', kanji: '火', img: 'assets/monsters/hi_fire/sprite.png', maxHp: 46, atk: [9, 14], exp: 37, drawW: 225, drawH: 225, effect: 'fire-embers' },
    migi: { name: 'Hữu Hướng Linh', kanji: '右', img: 'assets/monsters/migi/sprite.png', maxHp: 47, atk: [9, 14], exp: 38, drawW: 225, drawH: 225, effect: 'right-arrow' },
    yomu: { name: 'Độc Thư Linh', kanji: '読', img: 'assets/monsters/yomu/sprite.png', maxHp: 48, atk: [9, 14], exp: 39, drawW: 225, drawH: 225, effect: 'reading-pages' },
    tomo: { name: 'Hữu Nghị Linh', kanji: '友', img: 'assets/monsters/tomo/sprite.png', maxHp: 49, atk: [9, 14], exp: 40, drawW: 225, drawH: 225, effect: 'friendship-link' },
    hidari: { name: 'Tả Hướng Linh', kanji: '左', img: 'assets/monsters/hidari/sprite.png', maxHp: 49, atk: [9, 14], exp: 40, drawW: 225, drawH: 225, effect: 'left-arrow' },
    yasumi: { name: 'Hưu Mộc Linh', kanji: '休', img: 'assets/monsters/yasumi/sprite.png', maxHp: 50, atk: [9, 15], exp: 41, drawW: 230, drawH: 225, effect: 'rest-leaves' },
    chichi: { name: 'Phụ Hộ Linh', kanji: '父', img: 'assets/monsters/chichi/sprite.png', maxHp: 51, atk: [10, 15], exp: 42, drawW: 225, drawH: 225, effect: 'guardian-shield' },
    ame: { name: 'Vũ Vân Linh', kanji: '雨', img: 'assets/monsters/ame/sprite.png', maxHp: 52, atk: [10, 15], exp: 43, drawW: 225, drawH: 225, effect: 'rain-drops' },
    aku: { name: 'Ác Tâm Linh', kanji: '悪', img: 'assets/monsters/aku/sprite.png', maxHp: 55, atk: [10, 16], exp: 45, drawW: 225, drawH: 225, effect: 'dark-cracks' },
    an: { name: 'Ám Dạ Linh', kanji: '暗', img: 'assets/monsters/an/sprite.png', maxHp: 56, atk: [10, 16], exp: 46, drawW: 225, drawH: 225, effect: 'dim-lantern' },
    i_med: { name: 'Y Thuật Linh', kanji: '医', img: 'assets/monsters/i_med/sprite.png', maxHp: 57, atk: [11, 16], exp: 47, drawW: 225, drawH: 225, effect: 'healing-cross' },
    i_intent: { name: 'Ý Niệm Linh', kanji: '意', img: 'assets/monsters/i_intent/sprite.png', maxHp: 58, atk: [11, 17], exp: 48, drawW: 225, drawH: 225, effect: 'thought-focus' },
  },

  // 🐾 pet id -> monster id (pet dùng chỉ số nào để chiến đấu)
  //   (dùng chung MONSTERS; pet có level+exp riêng lưu ở engine)
  SPAWN: { grass: ['yin', 'ri', 'kuni', 'nen', 'dai', 'hito', 'juu', 'ni', 'hon', 'chuu', 'chou', 'shutsu', 'san', 'ji', 'gyou', 'ken', 'ima', 'getsu', 'bun', 'ato', 'mae', 'sei', 'go', 'kan', 'ue', 'higashi', 'yon', 'kin', 'kyuu', 'nyuu', 'gaku', 'kou', 'en', 'ko', 'gai', 'hachi', 'roku', 'shita', 'rai', 'ki', 'shou', 'nana', 'yama', 'hanashi', 'onna', 'kita', 'gozen', 'hyaku', 'sho', 'saki', 'na', 'kawa', 'sen', 'mizu', 'han', 'otoko', 'nishi', 'den', 'go_lang', 'tsuchi', 'moku', 'shoku', 'kuruma', 'minami', 'nani', 'man', 'kou_school', 'mai', 'shiro', 'ten', 'haha', 'hi_fire', 'migi', 'yomu', 'tomo', 'hidari', 'yasumi', 'chichi', 'ame', 'aku', 'an', 'i_med', 'i_intent'], water: ['fish', 'bar'] },
};
 
