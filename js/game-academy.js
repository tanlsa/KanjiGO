(function () {
  const vocabularyId = (question) => {
    if (question && typeof question.id === 'string' && question.id.trim()) return question.id.trim();
    const parts = [question && question.target, question && question.word, question && question.type, question && question.answer]
      .map((value) => encodeURIComponent(String(value || '').trim()));
    return `v1:${parts.join(':')}`;
  };

  function createQuestionIndex(questions = []) {
    const byId = new Map(), byKanji = new Map();
    for (const question of questions) {
      question.id = vocabularyId(question);
      byId.set(question.id, question);
      const list = byKanji.get(question.target) || [];
      list.push(question); byKanji.set(question.target, list);
    }
    return { byId, byKanji, total: byId.size };
  }

  window.KanjiGOAcademy = Object.freeze({ vocabularyId, createQuestionIndex });
})();
