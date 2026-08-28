(function () {
  function normalizeSearch(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .toLocaleLowerCase('vi').trim();
  }

  function matchesSearch(values, query) {
    if (!query) return true;
    return normalizeSearch((values || []).filter(Boolean).join(' ')).includes(query);
  }

  window.KanjiGODex = Object.freeze({ normalizeSearch, matchesSearch });
})();
