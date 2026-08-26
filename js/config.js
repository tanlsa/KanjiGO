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
    player:  'assets/characters/player-v2.png',
    bicycleOverlay: 'assets/characters/bicycle-overlay-v2.png',
    npc:     'assets/characters/npc-v2.png',
    tileset: 'assets/world/tileset.png',
    terrainTiles: 'assets/world/terrain-tiles.png',
    academy: 'assets/world/academy-grand.png',
    tulipTiles: 'assets/world/tulip-tiles.png',
    arenaWallTiles: 'assets/world/arena-wall-tiles.png',
    battleForest: 'assets/backgrounds/battle-forest.png',
    battleStand: 'assets/backgrounds/battle-stand.png',
  },

  TILE: 32, ZOOM: 2, CANVAS_W: 640, CANVAS_H: 480,
  // Giữ khung thiết kế 16:9 để HUD không teo trên màn hình lớn. Backing
  // buffer vẫn nhân theo presentation scale + DPR nên chữ không bị kéo giãn.
  // 8.3 MP là trần 4K; Retina chỉ lấy thêm mẫu khi còn trong ngân sách này.
  RENDER: {
    maxLogicalWidth: 1280,
    maxLogicalHeight: 720,
    maxDevicePixelRatio: 2,
    maxRenderPixels: 8294400,
    activeFps: 60,
    idleFps: 30,
    uiFps: 30,
  },
  MOVE_MS: 180, RUN_MOVE_MS: 105,
  ANIM_MS: 120, RUN_ANIM_MS: 72, FRAMES: 4,
  DIR_ROW: { down: 0, left: 1, right: 2, up: 3 },

  TILE_KEYS: {
    GRASS: 0, TREE: 1, WATER: 2, PATH: 3, FLOWER: 4, TALLGRASS: 5, BOAT: 6,
    ACADEMY_DOOR: 7, ACADEMY_WALL: 8, ACADEMY_ROOF: 9,
    PLAZA: 10, COBBLE: 11, ARENA_STONE: 12, DARK_STONE: 13,
    GOLD_FLOOR: 14, BRICK: 15, SOIL: 16, GARDEN: 17,
    VIVID_GRASS: 18, DARK_GRASS: 19, MOSS_STONE: 20, SHORE_STONE: 21,
    RED_CARPET: 22, BLUE_CARPET: 23, GRAVEL: 24, WORN_PATH: 25,
  },
  BLOCKED_TILES: [1, 2, 6, 8, 9],
  ACADEMY: { gx: 2, gy: 2, width: 11, height: 7, doorGx: 7, doorGy: 8 },

  ENCOUNTER: {
    TALLGRASS: 0.22, SURF: 0.15, FISH: 0.55,
    noCapturedMessage: 'Chưa có Kanji nào để gặp ở đây — hãy tới 🏛️ Giảng đường thu phục chữ mới trước!',
  },
  FISHING: { castMs: 320, waitMs: 900, reelMs: 420 },

  // --- 🚲 / 📡 EXPLORATION SKILLS ---
  BICYCLE: { moveMultiplier: 0.42, animMultiplier: 0.55, spriteScale: 1.12, riderLift: 3, verticalOverlayDrop: 4 },
  RADAR: {
    targetMultiplier: 4,
    targets: ['balanced', 'due', 'weak', 'pet'],
    labels: { balanced: 'Cân bằng', due: 'Tới hạn', weak: 'Chữ yếu', pet: 'Pet hiện tại' },
  },

  // --- PLAYER (là người chiến đấu, có HP) ---
  PLAYER: { name: 'Bạn', maxHp: 30, startGx: 7, startGy: 11 },

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
  PET: { monId: 'kuni', size: 30, followDistance: 44, trailStep: 2, bob: true },
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
    // Một activity chỉ được chấm Leitner một lần. Khoảng cách đủ dài để
    // "mastered" phản ánh trí nhớ qua nhiều ngày, không phải grind một lượt.
    boxIntervals: [0, 10 * 60e3, 24 * 3600e3, 3 * 24 * 3600e3, 7 * 24 * 3600e3, 21 * 24 * 3600e3],
    sessionPassRatio: 0.8,
    rustBonusMax: 2.5,
    newlyCapturedDueMs: 0,
  },
  CAPTURE: {
    stamina: 3,
    staminaRegenPerGrassWin: 1,
    relaxFromAttempt: 3,
  },
  QUESTION_MODES: {
    // m8: đọc Kanji trong câu · m9: chọn Kanji từ câu kana
    // m10: chọn nghĩa của từ/cụm có kèm furigana.
    weights: { m1: 3, m2: 2, m3: 2, m4: 2, m5: 1, m6: 2, m7: 2, m8: 2, m9: 2, m10: 2 },
  },
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
  TRAINER_ARENA: {
    tier: 'N5',
    questions: 7,
    passRatio: 0.70,
    teamSize: 5,
    minCollected: 3,
    requiredTrainerWins: 10,
    // Các roster dưới đây chỉ dùng Kanji N5 để không tạo khóa cứng trước Gym N5.
    // Những chữ N4 trong bản brainstorm (森, 兄, 駅...) dành cho Trainer N4 sau này.
    trainers: [
      { id: 'gardener', icon: '🌱', name: 'Người Làm Vườn', theme: 'Thiên nhiên', kanji: ['木', '山', '川', '土', '天'] },
      { id: 'parent', icon: '👨‍👩‍👧', name: 'Phụ Huynh', theme: 'Gia đình', kanji: ['父', '母', '子', '女', '男'] },
      { id: 'student', icon: '🏫', name: 'Học Sinh', theme: 'Trường học', kanji: ['学', '校', '先', '生', '友'] },
      { id: 'timekeeper', icon: '🕐', name: 'Người Giữ Giờ', theme: 'Thời gian', kanji: ['日', '月', '年', '時', '分'] },
      { id: 'traveler', icon: '🚶', name: 'Lữ Khách', theme: 'Di chuyển', kanji: ['行', '来', '入', '出', '休'] },
      { id: 'chef', icon: '🍚', name: 'Đầu Bếp', theme: 'Ẩm thực', kanji: ['食', '水', '火', '午'] },
      { id: 'conductor', icon: '🚆', name: 'Trưởng Tàu', theme: 'Giao thông', kanji: ['車', '電', '行', '来', '出'] },
      { id: 'neighbor', icon: '🏠', name: 'Hàng Xóm', theme: 'Không gian nhà', kanji: ['外', '中', '上', '下', '入'] },
      { id: 'explorer', icon: '🗺️', name: 'Nhà Thám Hiểm', theme: 'Phương hướng', kanji: ['東', '西', '南', '北', '左', '右'] },
      { id: 'weather_kid', icon: '🌤️', name: 'Cậu Bé Thời Tiết', theme: 'Thời tiết', kanji: ['天', '気', '雨', '日', '月'] },
      { id: 'doctor', icon: '👨‍⚕️', name: 'Bác Sĩ', theme: 'Con người', kanji: ['人', '生', '女', '男', '子'] },
      { id: 'citizen', icon: '🏙️', name: 'Công Dân', theme: 'Quốc gia', kanji: ['国', '東', '西', '南', '北'] },
      { id: 'merchant', icon: '💰', name: 'Thương Nhân', theme: 'Tiền và số', kanji: ['円', '百', '千', '万', '金'] },
      { id: 'librarian', icon: '📖', name: 'Thủ Thư', theme: 'Học tập', kanji: ['本', '書', '読', '名', '学'] },
      { id: 'artist', icon: '🎨', name: 'Họa Sĩ', theme: 'Màu và cơ bản', kanji: ['白', '大', '小', '一', '二'] },
    ],
  },
  PROGRESSION: {
    order: ['N5', 'N4'],
    // Knowledge Points chỉ đến từ milestone học thật và mỗi mốc chỉ nhận một lần.
    // Giữ id ổn định vì chúng được ghi thẳng vào milestone ledger trong save.
    kp: {
      version: 1,
      milestones: [
        { id: 'capture', reward: 1, requiresCaptured: true },
        { id: 'level3', reward: 1, level: 3 },
        { id: 'level5', reward: 1, level: 5 },
        { id: 'level7', reward: 1, level: 7 },
        { id: 'level10', reward: 1, level: 10 },
      ],
    },
    // TEMP QA: mở tier để test Giảng đường/KanjiDex mà không cần huy hiệu.
    // Xóa 'N4' khỏi mảng này trước khi release để khôi phục luồng N5 -> Gym -> N4.
    testUnlockedTiers: ['N4'],
    gym: {
      N5: { questions: 10, passRatio: 0.8, badge: 'N5', unlocks: 'N4' },
    },
  },

  // --- 🌳 SKILL TREE ---
  // Phase Foundation: node được render ở chế độ preview; chỉ bật `released`
  // sau khi effect gameplay tương ứng đã có test và feedback rõ ràng.
  SKILL_TREE: {
    version: 1,
    // TEMP QA: cấp đủ breadth/depth thật qua mastery + milestone ledger để test
    // toàn bộ node đã release. Đổi `enabled` thành false trước khi phát hành.
    qaSeed: { enabled: true, capturedKanji: 45, level: 5 },
    layout: {
      width: 1100,
      height: 500,
      root: { x: 550, y: 270 },
      hubs: {
        exploration: { x: 340, y: 270 },
        learning: { x: 550, y: 145 },
        combat: { x: 720, y: 350 },
      },
    },
    branches: {
      exploration: 'KHÁM PHÁ',
      learning: 'HỌC TẬP',
      combat: 'CHIẾN ĐẤU',
    },
    nodes: [
      {
        id: 'radar_1', name: 'Radar I', icon: '📡', branch: 'exploration', type: 'permanent', costKP: 4, released: true,
        position: { x: 105, y: 175 },
        prerequisites: [], requirements: { capturedKanji: 5 },
        effect: { id: 'radarMode', value: 'summary' },
        description: 'Hiển thị tín hiệu Kanji yếu hoặc đã tới hạn ôn tập.',
      },
      {
        id: 'radar_2', name: 'Radar II', icon: '🎯', branch: 'exploration', type: 'permanent', costKP: 10, released: true,
        position: { x: -45, y: 115 },
        prerequisites: ['radar_1'], requirements: { capturedKanji: 20, kanjiAtLevel: { level: 5, count: 3 } },
        effect: { id: 'radarMode', value: 'targeting' },
        description: 'Chọn ưu tiên Cân bằng, Tới hạn, Chữ yếu hoặc Kanji của pet hiện tại.',
      },
      {
        id: 'bicycle', name: 'Xe đạp', icon: '🚲', branch: 'exploration', type: 'permanent', costKP: 18, released: true,
        position: { x: 125, y: 390 },
        prerequisites: [], requirements: { capturedKanji: 15, kanjiAtLevel: { level: 5, count: 3 } },
        effect: { id: 'bicycleAccess', value: true },
        description: 'Nhấn B hoặc nút BIKE để bật/tắt; di chuyển nhanh nhưng vẫn giữ collision và encounter.',
      },
      {
        id: 'bicycle_gear', name: 'Bộ số II', icon: '⚙️', branch: 'exploration', type: 'permanent', costKP: 9, released: true,
        position: { x: 280, y: 425 },
        prerequisites: ['bicycle'], requirements: { capturedKanji: 25, kanjiAtLevel: { level: 5, count: 5 } },
        effect: { id: 'bicycleSpeedMultiplier', value: 0.85 },
        description: 'Nâng bộ số xe đạp, giảm thêm 15% thời gian di chuyển nhưng vẫn giữ nguyên collision.',
      },
      {
        id: 'auto_ride', name: 'Auto Ride', icon: '🧭', branch: 'exploration', type: 'permanent', costKP: 14, released: true,
        position: { x: 430, y: 420 },
        prerequisites: ['bicycle_gear', 'radar_1'], requirements: { capturedKanji: 35, kanjiAtLevel: { level: 5, count: 10 } },
        effect: { id: 'autoRideAccess', value: true },
        description: 'Nhấn P/AUTO để tự tìm bụi cỏ; dừng khi gặp Kanji và tiếp tục sau khi trận kết thúc.',
      },
      {
        id: 'meaning_lens', name: 'Meaning Lens', icon: '🔍', branch: 'learning', type: 'perk', costKP: 5, released: true,
        position: { x: 420, y: 90 },
        prerequisites: [], requirements: { capturedKanji: 8 },
        effect: { id: 'meaningHintCharges', value: 1 },
        description: 'Cho một gợi ý ngữ nghĩa có giới hạn, không tự trả lời câu hỏi.',
      },
      {
        id: 'meaning_lens_2', name: 'Meaning Lens II', icon: '🔎', branch: 'learning', type: 'perk', costKP: 7, released: true,
        position: { x: 250, y: 90 },
        prerequisites: ['meaning_lens'], requirements: { capturedKanji: 18 },
        effect: { id: 'meaningHintCharges', value: 1 },
        description: 'Thêm một lượt gợi ý Meaning Lens trong mỗi trận; vẫn không lộ đáp án nghĩa.',
      },
      {
        id: 'review_focus', name: 'Review Focus', icon: '🧠', branch: 'learning', type: 'perk', costKP: 8, released: true,
        position: { x: 710, y: 98 },
        prerequisites: [], requirements: { capturedKanji: 12 },
        effect: { id: 'reviewWeightMultiplier', value: 1.35, cap: 2 },
        description: 'Tăng nhẹ tần suất Kanji yếu và tới hạn nhưng không làm rỗng pool.',
      },
      {
        id: 'review_focus_2', name: 'Review Focus II', icon: '🧭', branch: 'learning', type: 'perk', costKP: 10, released: true,
        position: { x: 880, y: 82 },
        prerequisites: ['review_focus'], requirements: { capturedKanji: 25, kanjiAtLevel: { level: 5, count: 5 } },
        effect: { id: 'reviewWeightMultiplier', value: 1.15, cap: 2 },
        description: 'Tăng thêm ưu tiên ôn chữ yếu/tới hạn; tổng trọng số luôn bị giới hạn an toàn.',
      },
      {
        id: 'compound_sense', name: 'Compound Sense', icon: '🔗', branch: 'learning', type: 'perk', costKP: 10, released: false,
        position: { x: 755, y: 230 },
        prerequisites: [], requirements: { feature: 'vocabularyFoundation' },
        effect: { id: 'compoundEncounterMultiplier', value: 1.5 },
        description: 'Tăng cơ hội gặp compound đã được mở theo level.',
      },
      {
        id: 'focus_1', name: 'Focus I', icon: '⏳', branch: 'combat', type: 'perk', costKP: 5, released: true,
        position: { x: 920, y: 235 },
        prerequisites: [], requirements: { capturedKanji: 10 },
        effect: { id: 'attackGaugeMultiplier', value: 0.95 },
        description: 'Làm Attack Gauge của quái nạp chậm hơn 5%.',
      },
      {
        id: 'focus_2', name: 'Focus II', icon: '⌛', branch: 'combat', type: 'perk', costKP: 9, released: true,
        position: { x: 1160, y: 290 },
        prerequisites: ['focus_1'], requirements: { capturedKanji: 20, kanjiAtLevel: { level: 5, count: 5 } },
        effect: { id: 'attackGaugeMultiplier', value: 0.95 },
        description: 'Làm Attack Gauge chậm thêm 5%; tổng bonus Focus vẫn nằm dưới ngưỡng 15%.',
      },
      {
        id: 'combo_guard', name: 'Combo Guard', icon: '🛡️', branch: 'combat', type: 'perk', costKP: 8, released: true,
        position: { x: 1070, y: 170 },
        prerequisites: ['focus_1'], requirements: { kanjiAtLevel: { level: 5, count: 3 } },
        effect: { id: 'comboGuardCharges', value: 1 },
        description: 'Giữ một phần combo sau một lần trả lời sai trong mỗi trận.',
      },
      {
        id: 'combo_guard_2', name: 'Combo Guard II', icon: '🛡', branch: 'combat', type: 'perk', costKP: 11, released: true,
        position: { x: 1200, y: 65 },
        prerequisites: ['combo_guard'], requirements: { capturedKanji: 30, kanjiAtLevel: { level: 5, count: 8 } },
        effect: { id: 'comboGuardCharges', value: 1 },
        description: 'Thêm một lần bảo toàn một phần combo trong mỗi trận.',
      },
      {
        id: 'vitality_1', name: 'Vitality I', icon: '❤', branch: 'combat', type: 'perk', costKP: 7, released: true,
        position: { x: 1100, y: 410 },
        prerequisites: [], requirements: { capturedKanji: 10 },
        effect: { id: 'playerHpMultiplier', value: 1.08 },
        description: 'Tăng 8% HP tối đa của người chơi.',
      },
      {
        id: 'vitality_2', name: 'Vitality II', icon: '💖', branch: 'combat', type: 'perk', costKP: 10, released: true,
        position: { x: 940, y: 435 },
        prerequisites: ['vitality_1'], requirements: { capturedKanji: 22, kanjiAtLevel: { level: 5, count: 5 } },
        effect: { id: 'playerHpMultiplier', value: 1.08 },
        description: 'Tăng thêm 8% HP tối đa; không hồi máu tức thời khi mua hoặc reset.',
      },
    ],
  },

  // --- 📖 THƯ VIỆN MONSTER (id khớp KANJI_DB.KANJI[*].monId) ---
  // Quy ước tên mascot: từ đầu tiên là âm Hán Việt của Kanji tương ứng.
  // Có thể khai báo `hanViet` để override nếu một mascot dùng tên đặc biệt.
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
    i_by: { name: 'Dĩ Dẫn Linh', kanji: '以', img: 'assets/monsters/i_by/sprite.png', maxHp: 59, atk: [11, 17], exp: 49, drawW: 225, drawH: 225, effect: 'forward' },
    hiku: { name: 'Dẫn Lực Linh', kanji: '引', img: 'assets/monsters/hiku/sprite.png', maxHp: 60, atk: [11, 17], exp: 50, drawW: 225, drawH: 225, effect: 'backtrail' },
    institute: { name: 'Viện Hộ Linh', kanji: '院', img: 'assets/monsters/institute/sprite.png', maxHp: 61, atk: [11, 18], exp: 51, drawW: 225, drawH: 225, effect: 'healing-cross' },
    member: { name: 'Viên Đội Linh', kanji: '員', img: 'assets/monsters/member/sprite.png', maxHp: 62, atk: [12, 18], exp: 52, drawW: 225, drawH: 225, effect: 'friendship-link' },
    un: { name: 'Vận Luân Linh', kanji: '運', img: 'assets/monsters/un/sprite.png', maxHp: 63, atk: [12, 18], exp: 53, drawW: 225, drawH: 225, effect: 'wheel-tracks' },
    ei: { name: 'Anh Hoa Linh', kanji: '英', img: 'assets/monsters/ei/sprite.png', maxHp: 64, atk: [12, 19], exp: 54, drawW: 225, drawH: 225, effect: 'gold-sparkle' },
    utsu: { name: 'Ánh Chiếu Linh', kanji: '映', img: 'assets/monsters/utsu/sprite.png', maxHp: 65, atk: [12, 19], exp: 55, drawW: 225, drawH: 225, effect: 'scan' },
    tooi: { name: 'Viễn Lộ Linh', kanji: '遠', img: 'assets/monsters/tooi/sprite.png', maxHp: 66, atk: [12, 19], exp: 56, drawW: 225, drawH: 225, effect: 'approach' },
    ya: { name: 'Ốc Xá Linh', kanji: '屋', img: 'assets/monsters/ya/sprite.png', maxHp: 67, atk: [13, 19], exp: 57, drawW: 225, drawH: 225, effect: 'guardian-shield' },
    uta: { name: 'Ca Âm Linh', kanji: '歌', img: 'assets/monsters/uta/sprite.png', maxHp: 68, atk: [13, 20], exp: 58, drawW: 225, drawH: 225, effect: 'sound-wave' },
    natsu: { name: 'Hạ Nhật Linh', kanji: '夏', img: 'assets/monsters/natsu/sprite.png', maxHp: 69, atk: [13, 20], exp: 59, drawW: 225, drawH: 225, effect: 'sky-rays' },
    ie: { name: 'Gia Hộ Linh', kanji: '家', img: 'assets/monsters/ie/sprite.png', maxHp: 70, atk: [13, 20], exp: 60, drawW: 225, drawH: 225, effect: 'heart-embrace' },
    ga_art: { name: 'Họa Sắc Linh', kanji: '画', img: 'assets/monsters/ga_art/sprite.png', maxHp: 71, atk: [13, 21], exp: 61, drawW: 225, drawH: 225, effect: 'ink-strokes' },
    umi: { name: 'Hải Triều Linh', kanji: '海', img: 'assets/monsters/umi/sprite.png', maxHp: 72, atk: [14, 21], exp: 62, drawW: 225, drawH: 225, effect: 'water-ripple' },
    kai_turn: { name: 'Hồi Chuyển Linh', kanji: '回', img: 'assets/monsters/kai_turn/sprite.png', maxHp: 73, atk: [14, 21], exp: 63, drawW: 225, drawH: 225, effect: 'repeat-loop' },
    hiraku: { name: 'Khai Môn Linh', kanji: '開', img: 'assets/monsters/hiraku/sprite.png', maxHp: 74, atk: [14, 22], exp: 64, drawW: 225, drawH: 225, effect: 'portal' },
    kai_world: { name: 'Giới Cầu Linh', kanji: '界', img: 'assets/monsters/kai_world/sprite.png', maxHp: 75, atk: [14, 22], exp: 65, drawW: 225, drawH: 225, effect: 'boundary' },
    tanoshi: { name: 'Lạc Âm Linh', kanji: '楽', img: 'assets/monsters/tanoshi/sprite.png', maxHp: 76, atk: [14, 22], exp: 66, drawW: 225, drawH: 225, effect: 'sound-wave' },
    kan_building: { name: 'Quán Hộ Linh', kanji: '館', img: 'assets/monsters/kan_building/sprite.png', maxHp: 77, atk: [15, 22], exp: 67, drawW: 225, drawH: 225, effect: 'guardian-shield' },
    kan_han: { name: 'Hán Mặc Linh', kanji: '漢', img: 'assets/monsters/kan_han/sprite.png', maxHp: 78, atk: [15, 23], exp: 68, drawW: 225, drawH: 225, effect: 'ink-strokes' },
    samui: { name: 'Hàn Băng Linh', kanji: '寒', img: 'assets/monsters/samui/sprite.png', maxHp: 79, atk: [15, 23], exp: 69, drawW: 225, drawH: 225, effect: 'white-shimmer' },
    kao: { name: 'Nhan Diện Linh', kanji: '顔', img: 'assets/monsters/kao/sprite.png', maxHp: 80, atk: [15, 23], exp: 70, drawW: 225, drawH: 225, effect: 'scan' },
    kaeru: { name: 'Quy Gia Linh', kanji: '帰', img: 'assets/monsters/kaeru/sprite.png', maxHp: 81, atk: [15, 24], exp: 71, drawW: 225, drawH: 225, effect: 'backtrail' },
    okiru: { name: 'Khởi Thân Linh', kanji: '起', img: 'assets/monsters/okiru/sprite.png', maxHp: 82, atk: [16, 24], exp: 72, drawW: 225, drawH: 225, effect: 'rise' },
    kyuu_research: { name: 'Cứu Nghiên Linh', kanji: '究', img: 'assets/monsters/kyuu_research/sprite.png', maxHp: 83, atk: [16, 24], exp: 73, drawW: 225, drawH: 225, effect: 'study' },
    isogu: { name: 'Cấp Tốc Linh', kanji: '急', img: 'assets/monsters/isogu/sprite.png', maxHp: 84, atk: [16, 24], exp: 74, drawW: 225, drawH: 225, effect: 'lightning' },
    ushi: { name: 'Ngưu Lực Linh', kanji: '牛', img: 'assets/monsters/ushi/sprite.png', maxHp: 85, atk: [16, 25], exp: 75, drawW: 225, drawH: 225, effect: 'strength-pulse' },
    saru: { name: 'Khứ Hành Linh', kanji: '去', img: 'assets/monsters/saru/sprite.png', maxHp: 86, atk: [16, 25], exp: 76, drawW: 225, drawH: 225, effect: 'outward' },
    tsuyoi: { name: 'Cường Lực Linh', kanji: '強', img: 'assets/monsters/tsuyoi/sprite.png', maxHp: 87, atk: [17, 25], exp: 77, drawW: 225, drawH: 225, effect: 'strength-pulse' },
    oshieru: { name: 'Giáo Đạo Linh', kanji: '教', img: 'assets/monsters/oshieru/sprite.png', maxHp: 88, atk: [17, 25], exp: 78, drawW: 225, drawH: 225, effect: 'study' },
    kyou_capital: { name: 'Kinh Đô Linh', kanji: '京', img: 'assets/monsters/kyou_capital/sprite.png', maxHp: 89, atk: [17, 26], exp: 79, drawW: 225, drawH: 225, effect: 'sky-rays' },
    gyou_business: { name: 'Nghiệp Cơ Linh', kanji: '業', img: 'assets/monsters/gyou_business/sprite.png', maxHp: 90, atk: [17, 26], exp: 80, drawW: 225, drawH: 225, effect: 'wheel-tracks' },
    chikai: { name: 'Cận Lộ Linh', kanji: '近', img: 'assets/monsters/chikai/sprite.png', maxHp: 91, atk: [17, 26], exp: 81, drawW: 225, drawH: 225, effect: 'approach' },
    gin: { name: 'Ngân Quang Linh', kanji: '銀', img: 'assets/monsters/gin/sprite.png', maxHp: 92, atk: [18, 26], exp: 82, drawW: 225, drawH: 225, effect: 'coin-ring' },
    ku_district: { name: 'Khu Giới Linh', kanji: '区', img: 'assets/monsters/ku_district/sprite.png', maxHp: 93, atk: [18, 27], exp: 83, drawW: 225, drawH: 225, effect: 'boundary' },
    hakaru: { name: 'Kế Lượng Linh', kanji: '計', img: 'assets/monsters/hakaru/sprite.png', maxHp: 94, atk: [18, 27], exp: 84, drawW: 225, drawH: 225, effect: 'clock' },
    ani: { name: 'Huynh Hộ Linh', kanji: '兄', img: 'assets/monsters/ani/sprite.png', maxHp: 95, atk: [18, 27], exp: 85, drawW: 225, drawH: 225, effect: 'guardian-shield' },
    karui: { name: 'Khinh Phong Linh', kanji: '軽', img: 'assets/monsters/karui/sprite.png', maxHp: 96, atk: [18, 28], exp: 86, drawW: 225, drawH: 225, effect: 'breeze' },
    inu: { name: 'Khuyển Túc Linh', kanji: '犬', img: 'assets/monsters/inu/sprite.png', maxHp: 97, atk: [18, 28], exp: 87, drawW: 225, drawH: 225, effect: 'steps' },
    ken_research: { name: 'Nghiên Ma Linh', kanji: '研', img: 'assets/monsters/ken_research/sprite.png', maxHp: 98, atk: [19, 28], exp: 88, drawW: 225, drawH: 225, effect: 'study' },
    ken_prefecture: { name: 'Huyện Giới Linh', kanji: '県', img: 'assets/monsters/ken_prefecture/sprite.png', maxHp: 99, atk: [19, 28], exp: 89, drawW: 225, drawH: 225, effect: 'boundary' },
    tateru: { name: 'Kiến Tạo Linh', kanji: '建', img: 'assets/monsters/tateru/sprite.png', maxHp: 100, atk: [19, 29], exp: 90, drawW: 225, drawH: 225, effect: 'grow' },
    ken_test: { name: 'Nghiệm Thức Linh', kanji: '験', img: 'assets/monsters/ken_test/sprite.png', maxHp: 101, atk: [19, 29], exp: 91, drawW: 225, drawH: 225, effect: 'scan' },
    moto: { name: 'Nguyên Căn Linh', kanji: '元', img: 'assets/monsters/moto/sprite.png', maxHp: 102, atk: [19, 29], exp: 92, drawW: 225, drawH: 225, effect: 'life' },
    kou_craft: { name: 'Công Nghệ Linh', kanji: '工', img: 'assets/monsters/kou_craft/sprite.png', maxHp: 103, atk: [19, 30], exp: 93, drawW: 225, drawH: 225, effect: 'wheel-tracks' },
    hiroi: { name: 'Quảng Vực Linh', kanji: '広', img: 'assets/monsters/hiroi/sprite.png', maxHp: 104, atk: [20, 30], exp: 94, drawW: 225, drawH: 225, effect: 'outward' },
    kangaeru: { name: 'Khảo Tư Linh', kanji: '考', img: 'assets/monsters/kangaeru/sprite.png', maxHp: 105, atk: [20, 30], exp: 95, drawW: 225, drawH: 225, effect: 'thought-focus' },
    hikari: { name: 'Quang Minh Linh', kanji: '光', img: 'assets/monsters/hikari/sprite.png', maxHp: 106, atk: [20, 30], exp: 96, drawW: 225, drawH: 225, effect: 'sun-glow' },
    suki: { name: 'Hảo Tâm Linh', kanji: '好', img: 'assets/monsters/suki/sprite.png', maxHp: 107, atk: [20, 31], exp: 97, drawW: 225, drawH: 225, effect: 'heart-embrace' },
    au: { name: 'Hợp Nhất Linh', kanji: '合', img: 'assets/monsters/au/sprite.png', maxHp: 108, atk: [20, 31], exp: 98, drawW: 225, drawH: 225, effect: 'inward' },
    kuro: { name: 'Hắc Mặc Linh', kanji: '黒', img: 'assets/monsters/kuro/sprite.png', maxHp: 109, atk: [20, 31], exp: 99, drawW: 225, drawH: 225, effect: 'dark-cracks' },
    na_vegetable: { name: 'Thái Diệp Linh', kanji: '菜', img: 'assets/monsters/na_vegetable/sprite.png', maxHp: 110, atk: [21, 31], exp: 100, drawW: 225, drawH: 225, effect: 'life' },
    tsukuru: { name: 'Tác Tạo Linh', kanji: '作', img: 'assets/monsters/tsukuru/sprite.png', maxHp: 111, atk: [21, 32], exp: 101, drawW: 225, drawH: 225, effect: 'strength-pulse' },
    umu: { name: 'Sản Sinh Linh', kanji: '産', img: 'assets/monsters/umu/sprite.png', maxHp: 112, atk: [21, 32], exp: 102, drawW: 225, drawH: 225, effect: 'life' },
    kami_paper: { name: 'Chỉ Diệp Linh', kanji: '紙', img: 'assets/monsters/kami_paper/sprite.png', maxHp: 113, atk: [21, 32], exp: 103, drawW: 225, drawH: 225, effect: 'page-flip' },
    omou: { name: 'Tư Tâm Linh', kanji: '思', img: 'assets/monsters/omou/sprite.png', maxHp: 114, atk: [21, 32], exp: 104, drawW: 225, drawH: 225, effect: 'thought-focus' },
    ane: { name: 'Tỷ Hộ Linh', kanji: '姉', img: 'assets/monsters/ane/sprite.png', maxHp: 115, atk: [21, 33], exp: 105, drawW: 225, drawH: 225, effect: 'guardian-shield' },
    tomaru: { name: 'Chỉ Bộ Linh', kanji: '止', img: 'assets/monsters/tomaru/sprite.png', maxHp: 116, atk: [22, 33], exp: 106, drawW: 225, drawH: 225, effect: 'center-pulse' },
    shi_city: { name: 'Thị Thành Linh', kanji: '市', img: 'assets/monsters/shi_city/sprite.png', maxHp: 117, atk: [22, 33], exp: 107, drawW: 225, drawH: 225, effect: 'sky-rays' },
    shi_work: { name: 'Sĩ Vụ Linh', kanji: '仕', img: 'assets/monsters/shi_work/sprite.png', maxHp: 118, atk: [22, 33], exp: 108, drawW: 225, drawH: 225, effect: 'wheel-tracks' },
    shi_death: { name: 'Tử Ảnh Linh', kanji: '死', img: 'assets/monsters/shi_death/sprite.png', maxHp: 119, atk: [22, 34], exp: 109, drawW: 225, drawH: 225, effect: 'dark-cracks' },
    tsukau: { name: 'Sử Dụng Linh', kanji: '使', img: 'assets/monsters/tsukau/sprite.png', maxHp: 120, atk: [22, 34], exp: 110, drawW: 225, drawH: 225, effect: 'forward' },
    hajimeru: { name: 'Thủy Nhật Linh', kanji: '始', img: 'assets/monsters/hajimeru/sprite.png', maxHp: 121, atk: [22, 34], exp: 111, drawW: 225, drawH: 225, effect: 'sun-glow' },
    shi_try: { name: 'Thí Luyện Linh', kanji: '試', img: 'assets/monsters/shi_try/sprite.png', maxHp: 122, atk: [23, 34], exp: 112, drawW: 225, drawH: 225, effect: 'scan' },
    watashi: { name: 'Tư Ngã Linh', kanji: '私', img: 'assets/monsters/watashi/sprite.png', maxHp: 123, atk: [23, 35], exp: 113, drawW: 225, drawH: 225, effect: 'inward' },
    ji_letter: { name: 'Tự Thư Linh', kanji: '字', img: 'assets/monsters/ji_letter/sprite.png', maxHp: 124, atk: [23, 35], exp: 114, drawW: 225, drawH: 225, effect: 'ink-strokes' },
    mizukara: { name: 'Tự Chiếu Linh', kanji: '自', img: 'assets/monsters/mizukara/sprite.png', maxHp: 125, atk: [23, 35], exp: 115, drawW: 225, drawH: 225, effect: 'scan' },
    koto: { name: 'Sự Vụ Linh', kanji: '事', img: 'assets/monsters/koto/sprite.png', maxHp: 126, atk: [23, 35], exp: 116, drawW: 225, drawH: 225, effect: 'clock' },
    motsu: { name: 'Trì Lực Linh', kanji: '持', img: 'assets/monsters/motsu/sprite.png', maxHp: 127, atk: [23, 36], exp: 117, drawW: 225, drawH: 225, effect: 'strength-pulse' },
    shitsu_room: { name: 'Thất Môn Linh', kanji: '室', img: 'assets/monsters/shitsu_room/sprite.png', maxHp: 128, atk: [24, 36], exp: 118, drawW: 225, drawH: 225, effect: 'guardian-shield' },
    shitsu_quality: { name: 'Chất Giám Linh', kanji: '質', img: 'assets/monsters/shitsu_quality/sprite.png', maxHp: 129, atk: [24, 36], exp: 119, drawW: 225, drawH: 225, effect: 'scan' },
    utsusu: { name: 'Tả Ảnh Linh', kanji: '写', img: 'assets/monsters/utsusu/sprite.png', maxHp: 130, atk: [24, 36], exp: 120, drawW: 225, drawH: 225, effect: 'white-shimmer' },
    mono_person: { name: 'Giả Nhân Linh', kanji: '者', img: 'assets/monsters/mono_person/sprite.png', maxHp: 131, atk: [24, 37], exp: 121, drawW: 225, drawH: 225, effect: 'steps' },
    kariru: { name: 'Tá Thư Linh', kanji: '借', img: 'assets/monsters/kariru/sprite.png', maxHp: 132, atk: [24, 37], exp: 122, drawW: 225, drawH: 225, effect: 'repeat-loop' },
    yowai: { name: 'Nhược Thuẫn Linh', kanji: '弱', img: 'assets/monsters/yowai/sprite.png', maxHp: 133, atk: [24, 37], exp: 123, drawW: 225, drawH: 225, effect: 'dark-cracks' },
    kubi: { name: 'Thủ Cảnh Linh', kanji: '首', img: 'assets/monsters/kubi/sprite.png', maxHp: 134, atk: [25, 37], exp: 124, drawW: 225, drawH: 225, effect: 'center-pulse' },
    shu_main: { name: 'Chủ Vương Linh', kanji: '主', img: 'assets/monsters/shu_main/sprite.png', maxHp: 135, atk: [25, 38], exp: 125, drawW: 225, drawH: 225, effect: 'gold-sparkle' },
    aki: { name: 'Thu Diệp Linh', kanji: '秋', img: 'assets/monsters/aki/sprite.png', maxHp: 136, atk: [25, 38], exp: 126, drawW: 225, drawH: 225, effect: 'leaf-fall' },
    atsumeru: { name: 'Tập Hợp Linh', kanji: '集', img: 'assets/monsters/atsumeru/sprite.png', maxHp: 137, atk: [25, 38], exp: 127, drawW: 225, drawH: 225, effect: 'inward' },
    narau: { name: 'Tập Luyện Linh', kanji: '習', img: 'assets/monsters/narau/sprite.png', maxHp: 138, atk: [25, 39], exp: 128, drawW: 225, drawH: 225, effect: 'study' },
    owaru: { name: 'Chung Kỳ Linh', kanji: '終', img: 'assets/monsters/owaru/sprite.png', maxHp: 139, atk: [26, 39], exp: 129, drawW: 225, drawH: 225, effect: 'sunset-drift' },
    sumu: { name: 'Trú Gia Linh', kanji: '住', img: 'assets/monsters/sumu/sprite.png', maxHp: 140, atk: [26, 39], exp: 130, drawW: 225, drawH: 225, effect: 'guardian-shield' },
    omoi_heavy: { name: 'Trọng Lực Linh', kanji: '重', img: 'assets/monsters/omoi_heavy/sprite.png', maxHp: 141, atk: [26, 40], exp: 131, drawW: 225, drawH: 225, effect: 'sink' },
    haru: { name: 'Xuân Hoa Linh', kanji: '春', img: 'assets/monsters/haru/sprite.png', maxHp: 142, atk: [26, 40], exp: 132, drawW: 225, drawH: 225, effect: 'seasons' },
    tokoro: { name: 'Sở Địa Linh', kanji: '所', img: 'assets/monsters/tokoro/sprite.png', maxHp: 143, atk: [26, 40], exp: 133, drawW: 225, drawH: 225, effect: 'boundary' },
    atsui: { name: 'Thử Nhật Linh', kanji: '暑', img: 'assets/monsters/atsui/sprite.png', maxHp: 144, atk: [27, 40], exp: 134, drawW: 225, drawH: 225, effect: 'sun-glow' },
    ba: { name: 'Trường Địa Linh', kanji: '場', img: 'assets/monsters/ba/sprite.png', maxHp: 145, atk: [27, 41], exp: 135, drawW: 225, drawH: 225, effect: 'boundary' },
    noru: { name: 'Thừa Phong Linh', kanji: '乗', img: 'assets/monsters/noru/sprite.png', maxHp: 146, atk: [27, 41], exp: 136, drawW: 225, drawH: 225, effect: 'forward' },
    iro: { name: 'Sắc Họa Linh', kanji: '色', img: 'assets/monsters/iro/sprite.png', maxHp: 147, atk: [27, 41], exp: 137, drawW: 225, drawH: 225, effect: 'many-sparkles' },
    mori: { name: 'Sâm Lâm Linh', kanji: '森', img: 'assets/monsters/mori/sprite.png', maxHp: 148, atk: [27, 42], exp: 138, drawW: 225, drawH: 225, effect: 'rest-leaves' },
    kokoro: { name: 'Tâm Quang Linh', kanji: '心', img: 'assets/monsters/kokoro/sprite.png', maxHp: 149, atk: [28, 42], exp: 139, drawW: 225, drawH: 225, effect: 'heart-embrace' },
    oya: { name: 'Thân Tình Linh', kanji: '親', img: 'assets/monsters/oya/sprite.png', maxHp: 150, atk: [28, 42], exp: 140, drawW: 225, drawH: 225, effect: 'guardian-shield' },
    shin_truth: { name: 'Chân Tinh Linh', kanji: '真', img: 'assets/monsters/shin_truth/sprite.png', maxHp: 151, atk: [28, 43], exp: 141, drawW: 225, drawH: 225, effect: 'white-shimmer' },
    susumu: { name: 'Tiến Phong Linh', kanji: '進', img: 'assets/monsters/susumu/sprite.png', maxHp: 152, atk: [28, 43], exp: 142, drawW: 225, drawH: 225, effect: 'forward' },
    zu: { name: 'Đồ Bản Linh', kanji: '図', img: 'assets/monsters/zu/sprite.png', maxHp: 153, atk: [28, 43], exp: 143, drawW: 225, drawH: 225, effect: 'scan' },
    ao: { name: 'Thanh Lam Linh', kanji: '青', img: 'assets/monsters/ao/sprite.png', maxHp: 154, atk: [29, 43], exp: 144, drawW: 225, drawH: 225, effect: 'water-ripple' },
    tadashii: { name: 'Chính Chuẩn Linh', kanji: '正', img: 'assets/monsters/tadashii/sprite.png', maxHp: 155, atk: [29, 44], exp: 145, drawW: 225, drawH: 225, effect: 'scan' },
    koe: { name: 'Thanh Âm Linh', kanji: '声', img: 'assets/monsters/koe/sprite.png', maxHp: 156, atk: [29, 44], exp: 146, drawW: 225, drawH: 225, effect: 'sound-wave' },
    yo: { name: 'Thế Giới Linh', kanji: '世', img: 'assets/monsters/yo/sprite.png', maxHp: 157, atk: [29, 44], exp: 147, drawW: 225, drawH: 225, effect: 'myriad-stars' },
    aka: { name: 'Xích Hỏa Linh', kanji: '赤', img: 'assets/monsters/aka/sprite.png', maxHp: 158, atk: [29, 44], exp: 148, drawW: 225, drawH: 225, effect: 'fire-embers' },
    yuu: { name: 'Tịch Dương Linh', kanji: '夕', img: 'assets/monsters/yuu/sprite.png', maxHp: 159, atk: [29, 45], exp: 149, drawW: 225, drawH: 225, effect: 'sunset-drift' },
    kiru: { name: 'Thiết Đoạn Linh', kanji: '切', img: 'assets/monsters/kiru/sprite.png', maxHp: 160, atk: [30, 45], exp: 150, drawW: 225, drawH: 225, effect: 'split' },
    toku: { name: 'Thuyết Ngôn Linh', kanji: '説', img: 'assets/monsters/toku/sprite.png', maxHp: 161, atk: [30, 45], exp: 151, drawW: 225, drawH: 225, effect: 'speech-bubbles' },
    arau: { name: 'Tẩy Thủy Linh', kanji: '洗', img: 'assets/monsters/arau/sprite.png', maxHp: 162, atk: [30, 46], exp: 152, drawW: 225, drawH: 225, effect: 'water-ripple' },
    hayai: { name: 'Tảo Nhật Linh', kanji: '早', img: 'assets/monsters/hayai/sprite.png', maxHp: 163, atk: [30, 46], exp: 153, drawW: 225, drawH: 225, effect: 'sunrise' },
    hashiru: { name: 'Tẩu Phong Linh', kanji: '走', img: 'assets/monsters/hashiru/sprite.png', maxHp: 164, atk: [30, 46], exp: 154, drawW: 225, drawH: 225, effect: 'steps' },
    okuru: { name: 'Tống Tín Linh', kanji: '送', img: 'assets/monsters/okuru/sprite.png', maxHp: 165, atk: [30, 46], exp: 155, drawW: 225, drawH: 225, effect: 'forward' },
    zoku: { name: 'Gia Tộc Linh', kanji: '族', img: 'assets/monsters/zoku/sprite.png', maxHp: 166, atk: [31, 47], exp: 156, drawW: 225, drawH: 225, effect: 'people-pair' },
    mura: { name: 'Thôn Mộc Linh', kanji: '村', img: 'assets/monsters/mura/sprite.png', maxHp: 167, atk: [31, 47], exp: 157, drawW: 225, drawH: 225, effect: 'life' },
    karada: { name: 'Thể Lực Linh', kanji: '体', img: 'assets/monsters/karada/sprite.png', maxHp: 168, atk: [31, 47], exp: 158, drawW: 225, drawH: 225, effect: 'strength-pulse' },
    futoi: { name: 'Thái Dương Linh', kanji: '太', img: 'assets/monsters/futoi/sprite.png', maxHp: 169, atk: [31, 48], exp: 159, drawW: 225, drawH: 225, effect: 'outward' },
    matsu: { name: 'Đãi Thời Linh', kanji: '待', img: 'assets/monsters/matsu/sprite.png', maxHp: 170, atk: [31, 48], exp: 160, drawW: 225, drawH: 225, effect: 'clock' },
    kasu: { name: 'Thải Dụng Linh', kanji: '貸', img: 'assets/monsters/kasu/sprite.png', maxHp: 171, atk: [31, 48], exp: 161, drawW: 225, drawH: 225, effect: 'outward' },
    dai_platform: { name: 'Đài Tọa Linh', kanji: '台', img: 'assets/monsters/dai_platform/sprite.png', maxHp: 172, atk: [32, 48], exp: 162, drawW: 225, drawH: 225, effect: 'rise' },
    dai_generation: { name: 'Đại Thế Linh', kanji: '代', img: 'assets/monsters/dai_generation/sprite.png', maxHp: 173, atk: [32, 49], exp: 163, drawW: 225, drawH: 225, effect: 'repeat-loop' },
    dai_topic: { name: 'Đề Vấn Linh', kanji: '題', img: 'assets/monsters/dai_topic/sprite.png', maxHp: 174, atk: [32, 49], exp: 164, drawW: 225, drawH: 225, effect: 'question-orbit' },
    mijikai: { name: 'Đoản Xích Linh', kanji: '短', img: 'assets/monsters/mijikai/sprite.png', maxHp: 175, atk: [32, 49], exp: 165, drawW: 225, drawH: 225, effect: 'tiny' },
    shiru: { name: 'Tri Tuệ Linh', kanji: '知', img: 'assets/monsters/shiru/sprite.png', maxHp: 176, atk: [32, 49], exp: 166, drawW: 225, drawH: 225, effect: 'thought-focus' },
    chi_ground: { name: 'Địa Mạch Linh', kanji: '地', img: 'assets/monsters/chi_ground/sprite.png', maxHp: 177, atk: [33, 50], exp: 167, drawW: 225, drawH: 225, effect: 'earth-crumble' },
    ike: { name: 'Trì Thủy Linh', kanji: '池', img: 'assets/monsters/ike/sprite.png', maxHp: 178, atk: [33, 50], exp: 168, drawW: 225, drawH: 225, effect: 'water-ripple' },
    cha: { name: 'Trà Hương Linh', kanji: '茶', img: 'assets/monsters/cha/sprite.png', maxHp: 179, atk: [33, 50], exp: 169, drawW: 225, drawH: 225, effect: 'steam-aroma' },
    kiru_wear: { name: 'Trứ Y Linh', kanji: '着', img: 'assets/monsters/kiru_wear/sprite.png', maxHp: 180, atk: [33, 51], exp: 170, drawW: 225, drawH: 225, effect: 'guardian-shield' },
    hiru: { name: 'Trú Nhật Linh', kanji: '昼', img: 'assets/monsters/hiru/sprite.png', maxHp: 181, atk: [33, 51], exp: 171, drawW: 225, drawH: 225, effect: 'noon-ray' },
    sosogu: { name: 'Chú Thủy Linh', kanji: '注', img: 'assets/monsters/sosogu/sprite.png', maxHp: 182, atk: [34, 51], exp: 172, drawW: 225, drawH: 225, effect: 'water-ripple' },
    machi: { name: 'Phố Đăng Linh', kanji: '町', img: 'assets/monsters/machi/sprite.png', maxHp: 183, atk: [34, 51], exp: 173, drawW: 225, drawH: 225, effect: 'boundary' },
    tori: { name: 'Điểu Vũ Linh', kanji: '鳥', img: 'assets/monsters/tori/sprite.png', maxHp: 184, atk: [34, 52], exp: 174, drawW: 225, drawH: 225, effect: 'breeze' },
    asa: { name: 'Triêu Dương Linh', kanji: '朝', img: 'assets/monsters/asa/sprite.png', maxHp: 185, atk: [34, 52], exp: 175, drawW: 225, drawH: 225, effect: 'sunrise' },
    tooru: { name: 'Thông Lộ Linh', kanji: '通', img: 'assets/monsters/tooru/sprite.png', maxHp: 186, atk: [34, 52], exp: 176, drawW: 225, drawH: 225, effect: 'forward' },
    otouto: { name: 'Đệ Hòa Linh', kanji: '弟', img: 'assets/monsters/otouto/sprite.png', maxHp: 187, atk: [35, 53], exp: 177, drawW: 225, drawH: 225, effect: 'child-bounce' },
    hikui: { name: 'Đê Vị Linh', kanji: '低', img: 'assets/monsters/hikui/sprite.png', maxHp: 188, atk: [35, 53], exp: 178, drawW: 225, drawH: 225, effect: 'sink' },
    korobu: { name: 'Chuyển Luân Linh', kanji: '転', img: 'assets/monsters/korobu/sprite.png', maxHp: 189, atk: [35, 53], exp: 179, drawW: 225, drawH: 225, effect: 'wheel-tracks' },
    ta_ricefield: { name: 'Điền Thủy Linh', kanji: '田', img: 'assets/monsters/ta_ricefield/sprite.png', maxHp: 190, atk: [35, 54], exp: 180, drawW: 225, drawH: 225, effect: 'life' },
    miyako: { name: 'Đô Thành Linh', kanji: '都', img: 'assets/monsters/miyako/sprite.png', maxHp: 191, atk: [35, 54], exp: 181, drawW: 225, drawH: 225, effect: 'sky-rays' },
    do_degree: { name: 'Độ Lượng Linh', kanji: '度', img: 'assets/monsters/do_degree/sprite.png', maxHp: 192, atk: [36, 54], exp: 182, drawW: 225, drawH: 225, effect: 'scan' },
    kotaeru: { name: 'Đáp Án Linh', kanji: '答', img: 'assets/monsters/kotaeru/sprite.png', maxHp: 193, atk: [36, 55], exp: 183, drawW: 225, drawH: 225, effect: 'gold-sparkle' },
  },

  // 🐾 pet id -> monster id (pet dùng chỉ số nào để chiến đấu)
  //   (dùng chung MONSTERS; pet có level+exp riêng lưu ở engine)
  SPAWN: { grass: ['yin', 'ri', 'kuni', 'nen', 'dai', 'hito', 'juu', 'ni', 'hon', 'chuu', 'chou', 'shutsu', 'san', 'ji', 'gyou', 'ken', 'ima', 'getsu', 'bun', 'ato', 'mae', 'sei', 'go', 'kan', 'ue', 'higashi', 'yon', 'kin', 'kyuu', 'nyuu', 'gaku', 'kou', 'en', 'ko', 'gai', 'hachi', 'roku', 'shita', 'rai', 'ki', 'shou', 'nana', 'yama', 'hanashi', 'onna', 'kita', 'gozen', 'hyaku', 'sho', 'saki', 'na', 'kawa', 'sen', 'mizu', 'han', 'otoko', 'nishi', 'den', 'go_lang', 'tsuchi', 'moku', 'shoku', 'kuruma', 'minami', 'nani', 'man', 'kou_school', 'mai', 'shiro', 'ten', 'haha', 'hi_fire', 'migi', 'yomu', 'tomo', 'hidari', 'yasumi', 'chichi', 'ame', 'aku', 'an', 'i_med', 'i_intent', 'i_by', 'hiku', 'institute', 'member', 'un', 'ei', 'utsu', 'tooi', 'ya', 'uta', 'natsu', 'ie', 'ga_art', 'umi', 'kai_turn', 'hiraku', 'kai_world', 'tanoshi', 'kan_building', 'kan_han', 'samui', 'kao', 'kaeru', 'okiru', 'kyuu_research', 'isogu', 'ushi', 'saru', 'tsuyoi', 'oshieru', 'kyou_capital', 'gyou_business', 'chikai', 'gin', 'ku_district', 'hakaru', 'ani', 'karui', 'inu', 'ken_research', 'ken_prefecture', 'tateru', 'ken_test', 'moto', 'kou_craft', 'hiroi', 'kangaeru', 'hikari', 'suki', 'au', 'kuro', 'na_vegetable', 'tsukuru', 'umu', 'kami_paper', 'omou', 'ane', 'tomaru', 'shi_city', 'shi_work', 'shi_death', 'tsukau', 'hajimeru', 'shi_try', 'watashi', 'ji_letter', 'mizukara', 'koto', 'motsu', 'shitsu_room', 'shitsu_quality', 'utsusu', 'mono_person', 'kariru', 'yowai', 'kubi', 'shu_main', 'aki', 'atsumeru', 'narau', 'owaru', 'sumu', 'omoi_heavy', 'haru', 'tokoro', 'atsui', 'ba', 'noru', 'iro', 'mori', 'kokoro', 'oya', 'shin_truth', 'susumu', 'zu', 'ao', 'tadashii', 'koe', 'yo', 'aka', 'yuu', 'kiru', 'toku', 'arau', 'hayai', 'hashiru', 'okuru', 'zoku', 'mura', 'karada', 'futoi', 'matsu', 'kasu', 'dai_platform', 'dai_generation', 'dai_topic', 'mijikai', 'shiru', 'chi_ground', 'ike', 'cha', 'kiru_wear', 'hiru', 'sosogu', 'machi', 'tori', 'asa', 'tooru', 'otouto', 'hikui', 'korobu', 'ta_ricefield', 'miyako', 'do_degree', 'kotaeru'], water: ['fish', 'bar'] },
};
 
