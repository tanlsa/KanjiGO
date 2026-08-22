// ============================================================
//  DATA-LOADER.JS — Cầu nối dữ liệu ADMIN.
//  Nếu admin đã "Áp dụng vào game" từ admin.html (lưu ở trình duyệt),
//  thì dùng dữ liệu đó; nếu không, dùng KANJI_DB mặc định (js/kanji.js).
//  => Admin không cần đụng code: chỉ mở admin.html, dán từ Excel là xong.
// ============================================================
(function () {
  const KEY = 'KANJIGO_DATA_V1';
  const DEFAULT = window.KANJI_DB || { KANJI: {}, QUESTIONS: [], DISTRACTORS: [] };
  window.__KANJIGO_SOURCE = 'default';
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && data.KANJI && Array.isArray(data.QUESTIONS) && data.QUESTIONS.length) {
        // Nếu import thiếu distractor -> mượn kho mặc định để câu hỏi vẫn đủ 4 lựa chọn
        if (!Array.isArray(data.DISTRACTORS) || !data.DISTRACTORS.length) {
          data.DISTRACTORS = DEFAULT.DISTRACTORS;
        }
        window.KANJI_DB = data;
        window.__KANJIGO_SOURCE = 'imported';
        console.log(`[KanjiGO] Dùng dữ liệu IMPORT: ${Object.keys(data.KANJI).length} kanji, ${data.QUESTIONS.length} câu hỏi.`);
      }
    }
  } catch (e) {
    console.warn('[KanjiGO] Lỗi đọc dữ liệu import -> quay về mặc định.', e);
    window.KANJI_DB = DEFAULT;
  }
})();
 