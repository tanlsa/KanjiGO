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
  // Vocabulary progress is persisted by this id, so edits to labels/meaning do
  // not erase a learner's history. Imported rows may provide their own id;
  // legacy rows receive a deterministic id from their content identity.
  const vocabularyId = (question) => {
    if (question && typeof question.id === 'string' && question.id.trim()) return question.id.trim();
    const parts = [question && question.target, question && question.word, question && question.type, question && question.answer]
      .map((value) => encodeURIComponent(String(value || '').trim()));
    return `v1:${parts.join(':')}`;
  };
  const withVocabularyIds = (questions) => (questions || []).map((question) => ({ ...question, id: vocabularyId(question) }));
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
          QUESTIONS: withVocabularyIds(Array.from(questions.values())),
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
  // The default bundle also goes through normalization when no ADMIN import
  // exists. This keeps the runtime schema identical in both launch paths.
  window.KANJI_DB.QUESTIONS = withVocabularyIds(window.KANJI_DB.QUESTIONS);
})();
