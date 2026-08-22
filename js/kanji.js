// ============================================================
//  KANJI.JS — DỮ LIỆU HỌC KANJI MẶC ĐỊNH (ngân hàng câu hỏi On/Kun).
//  Mỗi câu lưu cả cách đọc Kanji mục tiêu và cách đọc/nghĩa của toàn bộ từ.
//
//  ┌─ CÁCH ADMIN THÊM CHỮ / CÂU (2 cách) ────────────────────┐
//  │ • DỄ NHẤT: mở admin.html -> dán bảng từ Excel -> "Áp dụng │
//  │   vào game". KHÔNG cần sửa file này.                      │
//  │ • Thủ công: thêm entry vào KANJI + QUESTIONS bên dưới.    │
//  └──────────────────────────────────────────────────────────┘
//
//  SCHEMA (khớp cột trong admin.html / data/*.csv):
//   KANJI[key] = { char, meaning, on:[...], kun:[...], monId }
//   QUESTIONS  = { word, mean, target, answer, romaji, type, wordReading, wordRomaji, parts[] }
//   parts[]     = { text, reading, romaji, meaning, role('target'|'support'|'kana') }
//   monId phải khớp 1 id trong CONFIG.MONSTERS (yin/ri/kuni/nen/dai/fish/bar).
// ============================================================
window.KANJI_DB = {
  // Thông tin từng kanji (dùng cho Kanji Dex)
  KANJI: {
    on:  { char: '音', meaning: 'Âm thanh', on: ['オン (on)'], kun: ['おと (oto)'], monId: 'yin' },
    ri:  { char: '日', meaning: 'Ngày / Mặt trời', on: ['ニチ (nichi)', 'ジツ (jitsu)'], kun: ['ひ (hi)', 'か (ka)'], monId: 'ri' },
    koku:{ char: '国', meaning: 'Quốc gia', on: ['コク (koku)'], kun: ['くに (kuni)'], monId: 'kuni' },
    nen: { char: '年', meaning: 'Năm', on: ['ネン (nen)'], kun: ['とし (toshi)'], monId: 'nen' },
    dai: { char: '大', meaning: 'To / Lớn', on: ['ダイ (dai)', 'タイ (tai)'], kun: ['おお (oo)'], monId: 'dai' },
    fish:{ char: '魚', meaning: 'Cá', on: ['ギョ (gyo)'], kun: ['さかな (sakana)', 'うお (uo)'], monId: 'fish' },
  },

  // Ngân hàng câu hỏi. Mỗi câu:
  //  word: từ hiển thị (có chứa kanji) | mean: nghĩa của từ
  //  target: chữ kanji đang hỏi | answer: cách đọc đúng CỦA CHỮ ĐÓ trong từ
  //  type: 'on' | 'kun' (để hiện nhãn sau khi trả lời)
  //  options: 4 lựa chọn (đã gồm answer). Nếu để trống engine tự random distractor.
  QUESTIONS: [
    // 音
    { word: '音楽', mean: 'âm nhạc', target: '音', answer: 'おん', romaji: 'on', type: 'on', wordReading: 'おんがく', wordRomaji: 'ongaku', parts: [
      { text: '音', reading: 'おん', romaji: 'on', meaning: 'âm thanh', role: 'target' }, { text: '楽', reading: 'がく', romaji: 'gaku', meaning: 'nhạc', role: 'support' }] },
    { word: '足音', mean: 'tiếng bước chân', target: '音', answer: 'おと', romaji: 'oto', type: 'kun', wordReading: 'あしおと', wordRomaji: 'ashioto', parts: [
      { text: '足', reading: 'あし', romaji: 'ashi', meaning: 'chân', role: 'support' }, { text: '音', reading: 'おと', romaji: 'oto', meaning: 'âm thanh', role: 'target' }] },
    // 日
    { word: '毎日', mean: 'mỗi ngày', target: '日', answer: 'にち', romaji: 'nichi', type: 'on', wordReading: 'まいにち', wordRomaji: 'mainichi', parts: [
      { text: '毎', reading: 'まい', romaji: 'mai', meaning: 'mỗi', role: 'support' }, { text: '日', reading: 'にち', romaji: 'nichi', meaning: 'ngày', role: 'target' }] },
    { word: '日曜日', mean: 'Chủ Nhật', target: '日', answer: 'にち', romaji: 'nichi', type: 'on', wordReading: 'にちようび', wordRomaji: 'nichiyoubi', parts: [
      { text: '日', reading: 'にち', romaji: 'nichi', meaning: 'ngày', role: 'target' }, { text: '曜', reading: 'よう', romaji: 'you', meaning: 'thứ', role: 'support' }, { text: '日', reading: 'び', romaji: 'bi', meaning: 'ngày', role: 'support' }] },
    { word: '日', mean: 'ngày / mặt trời', target: '日', answer: 'ひ', romaji: 'hi', type: 'kun', wordReading: 'ひ', wordRomaji: 'hi', parts: [
      { text: '日', reading: 'ひ', romaji: 'hi', meaning: 'ngày / mặt trời', role: 'target' }] },
    // 国
    { word: '国語', mean: 'quốc ngữ (môn Văn)', target: '国', answer: 'こく', romaji: 'koku', type: 'on', wordReading: 'こくご', wordRomaji: 'kokugo', parts: [
      { text: '国', reading: 'こく', romaji: 'koku', meaning: 'quốc gia', role: 'target' }, { text: '語', reading: 'ご', romaji: 'go', meaning: 'ngôn ngữ', role: 'support' }] },
    { word: '外国', mean: 'nước ngoài', target: '国', answer: 'こく', romaji: 'koku', type: 'on', wordReading: 'がいこく', wordRomaji: 'gaikoku', parts: [
      { text: '外', reading: 'がい', romaji: 'gai', meaning: 'ngoài', role: 'support' }, { text: '国', reading: 'こく', romaji: 'koku', meaning: 'quốc gia', role: 'target' }] },
    { word: '国', mean: 'đất nước', target: '国', answer: 'くに', romaji: 'kuni', type: 'kun', wordReading: 'くに', wordRomaji: 'kuni', parts: [
      { text: '国', reading: 'くに', romaji: 'kuni', meaning: 'đất nước', role: 'target' }] },
    // 年
    { word: '去年', mean: 'năm ngoái', target: '年', answer: 'ねん', romaji: 'nen', type: 'on', wordReading: 'きょねん', wordRomaji: 'kyonen', parts: [
      { text: '去', reading: 'きょ', romaji: 'kyo', meaning: 'đã qua', role: 'support' }, { text: '年', reading: 'ねん', romaji: 'nen', meaning: 'năm', role: 'target' }] },
    { word: '毎年', mean: 'mỗi năm', target: '年', answer: 'ねん', romaji: 'nen', type: 'on', wordReading: 'まいねん', wordRomaji: 'mainen', parts: [
      { text: '毎', reading: 'まい', romaji: 'mai', meaning: 'mỗi', role: 'support' }, { text: '年', reading: 'ねん', romaji: 'nen', meaning: 'năm', role: 'target' }] },
    { word: '年', mean: 'tuổi / năm', target: '年', answer: 'とし', romaji: 'toshi', type: 'kun', wordReading: 'とし', wordRomaji: 'toshi', parts: [
      { text: '年', reading: 'とし', romaji: 'toshi', meaning: 'tuổi / năm', role: 'target' }] },
    // 大
    { word: '大学', mean: 'đại học', target: '大', answer: 'だい', romaji: 'dai', type: 'on', wordReading: 'だいがく', wordRomaji: 'daigaku', parts: [
      { text: '大', reading: 'だい', romaji: 'dai', meaning: 'lớn', role: 'target' }, { text: '学', reading: 'がく', romaji: 'gaku', meaning: 'học', role: 'support' }] },
    { word: '大切', mean: 'quan trọng', target: '大', answer: 'たい', romaji: 'tai', type: 'on', wordReading: 'たいせつ', wordRomaji: 'taisetsu', parts: [
      { text: '大', reading: 'たい', romaji: 'tai', meaning: 'lớn', role: 'target' }, { text: '切', reading: 'せつ', romaji: 'setsu', meaning: 'thiết yếu', role: 'support' }] },
    { word: '大きい', mean: 'to, lớn', target: '大', answer: 'おお', romaji: 'oo', type: 'kun', wordReading: 'おおきい', wordRomaji: 'ookii', parts: [
      { text: '大', reading: 'おお', romaji: 'oo', meaning: 'lớn', role: 'target' }, { text: 'きい', reading: 'きい', romaji: 'kii', meaning: '', role: 'kana' }] },
    // 魚
    { word: '金魚', mean: 'cá vàng', target: '魚', answer: 'ぎょ', romaji: 'gyo', type: 'on', wordReading: 'きんぎょ', wordRomaji: 'kingyo', parts: [
      { text: '金', reading: 'きん', romaji: 'kin', meaning: 'vàng', role: 'support' }, { text: '魚', reading: 'ぎょ', romaji: 'gyo', meaning: 'cá', role: 'target' }] },
    { word: '魚', mean: 'cá', target: '魚', answer: 'さかな', romaji: 'sakana', type: 'kun', wordReading: 'さかな', wordRomaji: 'sakana', parts: [
      { text: '魚', reading: 'さかな', romaji: 'sakana', meaning: 'cá', role: 'target' }] },
    { word: '魚市場', mean: 'chợ cá', target: '魚', answer: 'うお', romaji: 'uo', type: 'kun', wordReading: 'うおいちば', wordRomaji: 'uoichiba', parts: [
      { text: '魚', reading: 'うお', romaji: 'uo', meaning: 'cá', role: 'target' }, { text: '市場', reading: 'いちば', romaji: 'ichiba', meaning: 'chợ', role: 'support' }] },
  ],

  // Kho đáp án nhiễu (distractor) — cách đọc kana thường gặp
  DISTRACTORS: ['おん', 'おと', 'にち', 'ひ', 'か', 'こく', 'くに', 'ねん', 'とし',
    'だい', 'たい', 'おお', 'ぎょ', 'さかな', 'うお', 'げつ', 'すい', 'もく', 'きん', 'ど', 'よう', 'せい', 'がく'],
};
