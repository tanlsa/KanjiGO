(function () {
  const unique = (values) => [...new Set((values || []).filter(Boolean))];
  const MODE_FIELDS = Object.freeze({ m5: 'word', m6: 'wordReading', m7: 'mean', m9: 'char', m10: 'mean', m11: 'wordReading', m12: 'word', m13: 'word', m14: 'word', m15: 'word' });

  function createDistractorPools(questions = [], kanjiInfos = []) {
    const all = { word: [], wordReading: [], mean: [], char: kanjiInfos.map((info) => info.char) };
    const tiers = new Map(), wordsByOtherTarget = new Map();
    const tierOf = new Map(kanjiInfos.map((info) => [info.char, String(info.jlpt || '').toUpperCase()]));
    for (const question of questions) {
      all.word.push(question.word); all.wordReading.push(question.wordReading); all.mean.push(question.mean);
      const tier = tierOf.get(question.target) || '';
      if (!tiers.has(tier)) tiers.set(tier, { word: [], wordReading: [], mean: [], char: [] });
      const pool = tiers.get(tier);
      pool.word.push(question.word); pool.wordReading.push(question.wordReading); pool.mean.push(question.mean);
    }
    for (const info of kanjiInfos) {
      const tier = tierOf.get(info.char) || '';
      if (!tiers.has(tier)) tiers.set(tier, { word: [], wordReading: [], mean: [], char: [] });
      tiers.get(tier).char.push(info.char);
      wordsByOtherTarget.set(info.char, unique(questions.filter((question) => question.target !== info.char).map((question) => question.word)));
    }
    for (const key of Object.keys(all)) all[key] = unique(all[key]);
    for (const pool of tiers.values()) for (const key of Object.keys(pool)) pool[key] = unique(pool[key]);
    return Object.freeze({ all: Object.freeze(all), tiers, wordsByOtherTarget, tierOf });
  }

  function valuesFor(pools, tier, field, minimum = 4) {
    const tierValues = pools.tiers.get(String(tier || '').toUpperCase())?.[field] || [];
    return tierValues.length >= minimum ? tierValues : (pools.all[field] || []);
  }

  function valuesForMode(pools, mode, tier, target = '') {
    if (mode === 'm5') return pools.wordsByOtherTarget.get(target) || [];
    return valuesFor(pools, tier, MODE_FIELDS[mode] || 'word');
  }

  function questionModesForLevel(config, maxLevel, level) {
    const weights = config?.weights || { m1: 1 }, unlockAt = config?.unlockAt || {};
    const current = Math.max(1, Math.min(maxLevel, Math.floor(Number(level) || 1)));
    return Object.keys(weights).filter((mode) => Number(weights[mode]) > 0 && current >= (Number(unlockAt[mode]) || 1));
  }

  window.KanjiGOBattle = Object.freeze({ createDistractorPools, valuesFor, valuesForMode, questionModesForLevel });
})();
