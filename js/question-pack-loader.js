// Loads the large contextual-question pack after the playable shell is ready.
(function () {
  const PACK_SRC = 'data/packs/question-supplement.pack.js';
  let challenges = [];
  let loading = null;

  const publish = (rows) => {
    challenges = Array.isArray(rows) ? rows : [];
    if (window.KANJI_DB) window.KANJI_DB.CHALLENGES = challenges;
    return challenges;
  };

  const load = () => {
    if (challenges.length) return Promise.resolve(challenges);
    if (loading) return loading;
    if (!window.document || !document.createElement || !document.head) return Promise.resolve(challenges);
    loading = new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = PACK_SRC;
      script.async = true;
      script.onload = () => resolve(challenges);
      script.onerror = () => {
        console.warn(`[KanjiGO] Không tải được question pack: ${PACK_SRC}`);
        resolve(challenges);
      };
      document.head.appendChild(script);
    });
    return loading;
  };

  window.KanjiGOQuestionPack = {
    load,
    register: publish,
    current: () => challenges,
    ready: () => challenges.length > 0,
  };

  // Leave the critical startup path first; parse the pack in the first idle slot.
  if (window.document && document.head) {
    const queueLoad = () => load();
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(queueLoad, { timeout: 1200 });
    else window.setTimeout(queueLoad, 250);
  }
})();
