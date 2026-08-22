// ============================================================
//  DATA-LOADER.JS — Cầu nối dữ liệu ADMIN.
//  Nếu admin đã "Áp dụng vào game" từ admin.html (lưu ở trình duyệt),
//  thì merge lên dữ liệu mặc định. Content mới đóng gói cùng game không bị
//  biến mất vì một bản import cũ; entry import vẫn được ưu tiên khi trùng key.
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
        const questionKey = (q) => `${q.word}|${q.target}|${q.answer}|${q.type}`;
        const questions = new Map();
        for (const question of DEFAULT.QUESTIONS || []) questions.set(questionKey(question), question);
        for (const question of data.QUESTIONS) questions.set(questionKey(question), question);
        const merged = {
          KANJI: { ...(DEFAULT.KANJI || {}), ...data.KANJI },
          QUESTIONS: Array.from(questions.values()),
          DISTRACTORS: Array.from(new Set([...(DEFAULT.DISTRACTORS || []), ...(data.DISTRACTORS || [])])),
        };
        window.KANJI_DB = merged;
        window.__KANJIGO_SOURCE = 'imported';
        console.log(`[KanjiGO] Đã merge dữ liệu IMPORT: ${Object.keys(merged.KANJI).length} kanji, ${merged.QUESTIONS.length} câu hỏi.`);
      }
    }
  } catch (e) {
    console.warn('[KanjiGO] Lỗi đọc dữ liệu import -> quay về mặc định.', e);
    window.KANJI_DB = DEFAULT;
  }
})();
