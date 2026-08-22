// ============================================================
//  KANJI.JS — DỮ LIỆU HỌC KANJI MẶC ĐỊNH (ngân hàng câu hỏi On/Kun).
//  Mỗi câu: hiện 1 TỪ chứa kanji -> chọn CÁCH ĐỌC đúng của chữ đó.
//
//  ┌─ CÁCH ADMIN THÊM CHỮ / CÂU (2 cách) ────────────────────┐
//  │ • DỄ NHẤT: mở admin.html -> dán bảng từ Excel -> "Áp dụng │
//  │   vào game". KHÔNG cần sửa file này.                      │
//  │ • Thủ công: thêm entry vào KANJI + QUESTIONS bên dưới.    │
//  └──────────────────────────────────────────────────────────┘
//
//  SCHEMA (khớp cột trong admin.html / data/*.csv):
//   KANJI[key] = { char, meaning, on:[...], kun:[...], monId }
//   QUESTIONS  = { word, mean, target, answer, romaji, type('on'|'kun') }
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
  },

  // Ngân hàng câu hỏi. Mỗi câu:
  //  word: từ hiển thị (có chứa kanji) | mean: nghĩa của từ
  //  target: chữ kanji đang hỏi | answer: cách đọc đúng CỦA CHỮ ĐÓ trong từ
  //  type: 'on' | 'kun' (để hiện nhãn sau khi trả lời)
  //  options: 4 lựa chọn (đã gồm answer). Nếu để trống engine tự random distractor.
  QUESTIONS: [
    // 音
    { word: '音楽', mean: 'âm nhạc', target: '音', answer: 'おん', romaji: 'on', type: 'on' },
    { word: '足音', mean: 'tiếng bước chân', target: '音', answer: 'おと', romaji: 'oto', type: 'kun' },
    // 日
    { word: '毎日', mean: 'mỗi ngày', target: '日', answer: 'にち', romaji: 'nichi', type: 'on' },
    { word: '日曜日', mean: 'Chủ Nhật', target: '日', answer: 'にち', romaji: 'nichi', type: 'on' },
    { word: '日 (ひ)', mean: 'ngày / mặt trời', target: '日', answer: 'ひ', romaji: 'hi', type: 'kun' },
    // 国
    { word: '国語', mean: 'quốc ngữ (môn Văn)', target: '国', answer: 'こく', romaji: 'koku', type: 'on' },
    { word: '外国', mean: 'nước ngoài', target: '国', answer: 'こく', romaji: 'koku', type: 'on' },
    { word: '国 (くに)', mean: 'đất nước', target: '国', answer: 'くに', romaji: 'kuni', type: 'kun' },
    // 年
    { word: '去年', mean: 'năm ngoái', target: '年', answer: 'ねん', romaji: 'nen', type: 'on' },
    { word: '毎年', mean: 'mỗi năm', target: '年', answer: 'ねん', romaji: 'nen', type: 'on' },
    { word: '年 (とし)', mean: 'tuổi / năm', target: '年', answer: 'とし', romaji: 'toshi', type: 'kun' },
    // 大
    { word: '大学', mean: 'đại học', target: '大', answer: 'だい', romaji: 'dai', type: 'on' },
    { word: '大切', mean: 'quan trọng', target: '大', answer: 'たい', romaji: 'tai', type: 'on' },
    { word: '大きい', mean: 'to, lớn', target: '大', answer: 'おお', romaji: 'oo', type: 'kun' },
  ],

  // Kho đáp án nhiễu (distractor) — cách đọc kana thường gặp
  DISTRACTORS: ['おん', 'おと', 'にち', 'ひ', 'か', 'こく', 'くに', 'ねん', 'とし',
    'だい', 'たい', 'おお', 'げつ', 'すい', 'もく', 'きん', 'ど', 'よう', 'せい', 'がく'],
};
 